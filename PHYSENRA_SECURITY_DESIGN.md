# PHYSENRA SECURITY ARCHITECTURE & ISOLATION SPECIFICATION

**Product:** Physenra  
**Document:** Security Architecture & Access Control Specification  
**Version:** 1.0.0  
**Compliance Standards:** Healthcare Data Protection (GDPR / HIPAA Security Principles / NDPR)

---

## 1. THREAT MODEL & SECURITY POSTURE

Physenra processes highly sensitive Personal Health Information (PHI) and financial transactions across multiple independent physiotherapy practices. The security architecture addresses the following threat vectors:

1. **Cross-Tenant Data Leakage (BOLA / Broken Object Level Authorization):** A compromised or malicious user from Practice A attempting to read or manipulate records belonging to Practice B.
2. **Horizontal & Vertical Privilege Escalation:** An unprivileged user (e.g. Receptionist, Patient) attempting to access clinical notes, financial configurations, or platform administrative functions.
3. **Clinical Record Tampering:** Unauthorized modification or silent deletion of medical consultation records, assessments, or treatment notes.
4. **Financial Discrepancy & Fraud:** Arbitrary mutation of patient account balances, payment records, or package session entitlements.
5. **Credential & Secret Exposure:** Inadvertent leakage of service-role keys, database connection strings, or third-party integration secrets into source code or browser bundles.

---

## 2. MULTI-TENANT ISOLATION ARCHITECTURE

Multi-tenancy isolation in Physenra is enforced at the database engine level via PostgreSQL Row Level Security (RLS). Application-layer filters alone are considered insufficient.

```
       [ Client Request + JWT ]
                  │
                  ▼
      [ Supabase API Gateway ]
                  │ (Verifies JWT Signature, Claims)
                  ▼
   [ PostgreSQL Connection Pool ]
                  │
  SET LOCAL request.jwt.claims = '{...}'
                  │
                  ▼
   [ Row Level Security (RLS) Engine ]
                  │
  Checks: `practice_id = auth.current_practice_id()`
  Checks: `auth.has_permission(practice_id, '...')`
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   [ MATCH ]           [ NO MATCH ]
  (Row Returned)      (Blocked / 0 Rows)
```

### 2.1 Tenant Context Resolution
When a user authenticates, Supabase Auth issues a JWT. Because a practitioner may belong to multiple practices (e.g. locum, multi-clinic group), active practice context is resolved dynamically without requiring token reissue on practice switching:

1. **Client Context Header:** The frontend client provides the active practice ID via the `x-practice-id` HTTP request header on all tenant-scoped queries and mutations.
2. **Database Verification:** PostgreSQL resolves the requested practice ID and verifies that the authenticated user possesses an `active` membership in `practice_memberships` for that practice.
3. **JWT Fallback:** If the header is absent, the resolver falls back to the user's default `active_practice_id` in JWT `app_metadata`.

```sql
-- Helper function to extract current authenticated practice context
CREATE OR REPLACE FUNCTION auth.current_practice_id() 
RETURNS uuid AS $$
  SELECT COALESCE(
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-practice-id', '')::uuid,
    nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'active_practice_id', '')::uuid
  );
$$ LANGUAGE sql STABLE;

-- Security Definer helper verifying active practice membership
CREATE OR REPLACE FUNCTION auth.user_has_practice_access(target_practice_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.practice_memberships pm
    WHERE pm.user_id = auth.uid()
      AND pm.practice_id = target_practice_id
      AND pm.status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### 2.2 Standard Tenant RLS Rule
Every tenant-scoped table implements baseline tenant isolation:

```sql
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_patients ON public.patients
  FOR ALL
  TO authenticated
  USING (
    practice_id = auth.current_practice_id() 
    AND auth.user_has_practice_access(practice_id)
  )
  WITH CHECK (
    practice_id = auth.current_practice_id() 
    AND auth.user_has_practice_access(practice_id)
  );
```

---

## 3. ROLE-BASED ACCESS CONTROL (RBAC) MATRIX

The system enforces strict principle-of-least-privilege across all functional domains:

| Domain Entity | Platform Admin | Practice Owner | Practice Manager | Physiotherapist | Receptionist | Accountant | Patient |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Practice Settings** | Read/Write* | Full Control | Read Only | No Access | No Access | No Access | No Access |
| **Staff & Roles** | No Access | Full Control | Read/Invite | Read Profiles | Read Directory | No Access | No Access |
| **Patient Demographics**| No Access | Full Control | Full Control | Full Control | Read/Write | Read Billing Info | Own Profile Only |
| **Appointments** | No Access | Full Control | Full Control | Own/Practice | Full Control | Read Scheduled | Own Bookings |
| **Clinical Visits** | No Access | Full Control | View Summary | Full Control | Status Only | No Access | No Access |
| **Clinical Notes (SOAP)**| No Access | Full Control | No Access | Full Control (Own) | No Access | No Access | No Access |
| **Treatment Plans** | No Access | Full Control | No Access | Full Control | No Access | No Access | Prescribed Own |
| **Home Exercises** | No Access | Full Control | No Access | Prescribe/Edit | No Access | No Access | Own Exercises |
| **Invoices** | No Access | Full Control | Full Control | View Service Rate| Read/Issue | Full Control | Own Invoices |
| **Payments & Refunds** | No Access | Full Control | Full Control | View Attributed | Collect/Receipt | Full Control | Own Receipts |
| **Package Session Ledger**| No Access| Full Control | Full Control | Consume/Debit | View Balance | Full Control | View Remaining |
| **Financial Reports** | No Access | Full Control | Operational | Own Earnings | No Access | Full Control | No Access |
| **Audit Logs** | Platform Only | Full Access | No Access | No Access | No Access | No Access | No Access |

*\*Platform Admin operates platform health and subscriptions; diagnostic access into tenant data requires deliberate break-glass authorization recorded in audit logs.*

---

## 4. CLINICAL RECORD IMMUTABILITY & AUDITING

1. **Write Once, Amend With History:**
   - Once a clinical note (Initial Assessment, SOAP note, Progress note) transitions to `finalized` or `signed`, direct SQL `UPDATE` on the clinical text is blocked by a database trigger.
   - Any amendment must be recorded in an associated `clinical_note_amendments` table preserving:
     - `original_note_id`
     - `amendment_reason`
     - `author_id`
     - `timestamp`
     - `diff_summary`
2. **Zero Hard Deletion of Clinical Data:**
   - Deletions are transformed into soft-deletions or marked as `entered_in_error` with mandatory clinical rationale.
3. **Cryptographic Integrity:**
   - Signed clinical notes include a SHA-256 content checksum generated at time of signature to detect any database-level tampering.

---

## 5. FINANCIAL & PACKAGE LEDGER INTEGRITY

1. **Double-Entry Principle:**
   - Account balances are never maintained as single writable integers.
   - All balance changes are derived from an immutable stream of ledger transactions.
2. **Package Session Consumption Atomicity:**
   - Consuming a package session must be an atomic transaction:
     ```sql
     -- Atomic session deduction verification
     BEGIN;
     -- Verify available balance >= requested sessions
     -- Insert ledger deduction row
     -- Link deduction row to specific appointment_id
     COMMIT;
     ```
   - If an appointment is cancelled, entitlement is restored via a compensatory `reversal_cancellation` entry, never by deleting the historical consumption row.

---

## 6. CREDENTIAL & SECRET MANAGEMENT

1. **Client vs Server Key Boundary:**
   - `VITE_SUPABASE_ANON_KEY`: Safe for public browser distribution. Governed 100% by Row Level Security.
   - `SUPABASE_SERVICE_ROLE_KEY`: Strictly prohibited from client bundles, browser code, or git repositories. Used only in secure server-side Edge Functions for administrative jobs (e.g. system webhooks, user provisioning).
2. **Git Hygiene:**
   - `.env`, `.env.local`, `.env.*` are actively ignored.
   - Continuous CI/CD scanning for secret patterns.
3. **Dual-Project Isolation:**
   - Local CLI operations use scoped access tokens without polluting other local projects (Kabworld).

---

## 7. AUDIT LOGGING SUBSYSTEM

1. **Immutable Log Table:**
   ```sql
   CREATE TABLE public.audit_events (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     practice_id uuid REFERENCES public.practices(id),
     actor_id uuid REFERENCES auth.users(id),
     actor_role text NOT NULL,
     action text NOT NULL,
     entity_type text NOT NULL,
     entity_id uuid NOT NULL,
     ip_address inet,
     user_agent text,
     metadata jsonb DEFAULT '{}'::jsonb,
     created_at timestamptz NOT NULL DEFAULT now()
   );

   -- Block updates and deletes permanently on audit logs
   CREATE RULE no_update_audit AS ON UPDATE TO public.audit_events DO INSTEAD NOTHING;
   CREATE RULE no_delete_audit AS ON DELETE TO public.audit_events DO INSTEAD NOTHING;
   ```
2. **Comprehensive Event Coverage:** All authentication, patient creation, clinical note signature, appointment status transition, invoice voiding, refund issuance, and permission changes generate immutable audit records.
