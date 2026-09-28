# PHYSENRA DEVELOPMENT CONSTITUTION & ENGINEERING RULES

**Product:** Physenra — Physiotherapy EMR & Practice Management Platform  
**Positioning:** The complete operating platform for private physiotherapy practices.  
**Version:** 1.0.0 (Foundational Architecture)  
**Status:** Authoritative & Binding

---

## 1. PROJECT ISOLATION PRINCIPLE

Physenra is a completely new, independent SaaS application. It is NOT Kabworld.

1. **Zero Asset Contamination:** No source code, database schemas, migrations, seed scripts, patient records, or configuration files may be copied or ported from Kabworld.
2. **Zero Credential Sharing:** Physenra operates on dedicated infrastructure (`xxknmdgneamtoahqayvl` on Supabase, `physenra/physenra` on GitHub, `physenra@gmail.com` as owner). Never reuse Kabworld API keys, service-role keys, payment gateways, WhatsApp tokens, or email dispatch credentials.
3. **Conceptual Lessons Only:** Prior architectural lessons from previous projects may inform abstract design decisions, but the codebase and database must be constructed from first principles.

---

## 2. MANDATORY MULTI-TENANCY

Physenra is architected from day one as a multi-tenant SaaS. Every physiotherapy clinic/practice is an isolated tenant.

1. **Database-Enforced Isolation:** Multi-tenancy must never rely solely on client-side routing, URL query parameters, or frontend filtering. Every tenant-scoped table must include a non-nullable `practice_id` foreign key.
2. **Row Level Security (RLS) is Non-Negotiable:** Every table in the database must have Postgres Row Level Security enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
3. **Defense in Depth:** Queries must filter by `practice_id` at the application layer AND be enforced at the database level via Postgres RLS policies using authenticated session claims.
4. **Zero Cross-Tenant Leakage:** No tenant may ever read, query, update, or delete another tenant's:
   - Patients
   - Appointments & schedule blocks
   - Clinical notes & medical records
   - Treatment plans & exercise prescriptions
   - Invoices, payments, credits, & ledgers
   - Package entitlements & session consumption
   - Staff records, practitioner profiles, & payroll data
   - Clinical documents, consent forms, & media attachments
   - Practice reports, business analytics, & audit logs

---

## 3. TENANT & MEMBERSHIP ARCHITECTURE

1. **Hierarchy:**
   ```text
   Platform (Physenra SaaS)
      └── Practice (Tenant)
             ├── Memberships (User <-> Practice Association)
             │      └── Roles & Explicit Permissions
             └── Practice Data (Isolated Domain Entities)
   ```
2. **No Monolithic Single-Practice Column:** Do NOT attach a single `practice_id` column to the core user table (e.g. `users.practice_id`). Practitioners may locum across multiple clinics, and patients may receive treatment at different independent practices.
3. **Membership Model:** User associations with a practice must be mediated through an explicit `practice_memberships` entity tracking:
   - `user_id`
   - `practice_id`
   - `role`
   - `status` (`active`, `invited`, `suspended`, `terminated`)
   - `joined_at`
4. **Active Practice Context:** All tenant-scoped operations must resolve an active, validated `practice_id` from the authenticated session context.

---

## 4. ROLE-BASED ACCESS CONTROL (RBAC)

Authorization must be explicit and enforced server-side. The baseline role taxonomy comprises:

1. **Practice Owner:** Full administrative, financial, operational, and clinical control within their practice tenant. Can configure billing, add/remove staff, manage subscriptions, and view all clinical and audit data.
2. **Practice Manager:** Operational administration, staff scheduling, appointment dispatch, invoicing, and reporting. Restricted from practice transfer and critical tenant deletion.
3. **Physiotherapist (Clinician):** Full clinical authority for assigned and practice patients (assessments, SOAP notes, treatment plans, visit completion). Access to clinical scheduling and practitioner-specific earnings/performance. Restricted from general practice financial configuration and unrelated staff administration.
4. **Receptionist:** Patient intake, scheduling, check-in/arrival workflow, payment collection, and basic appointment communication. Strict read-only access to clinical documentation (cannot view detailed clinical notes/SOAP details; view only appointment status and alerts).
5. **Accountant:** Invoicing, payments, financial ledgers, package sales reconciliation, and financial reports. Zero access to patient clinical notes, medical histories, or treatment notes.
6. **Patient:** Self-service portal access restricted strictly to their personal records (own profile, scheduled appointments, shared home exercise programs, shared treatment summaries, and personal invoices/receipts).
7. **Platform Administrator:** System operators maintaining the Physenra SaaS infrastructure.

---

## 5. PLATFORM ADMINISTRATOR VS PRACTICE USER SEPARATION

1. **Strict Context Boundary:** Platform administrators operate the SaaS platform, NOT the tenants.
2. **No Automatic Tenant Infiltration:** A platform administrator does NOT automatically inherit access to tenant clinical or financial data.
3. **Break-Glass Auditability:** Any elevated diagnostic access into a tenant by platform support must be explicit, time-bounded, purpose-documented, and recorded in immutable platform audit logs.
4. **Separate Authorization Grants:** Platform admin privileges are evaluated on platform-level tables/functions and must never bypass tenant RLS policies by default.

---

## 6. CLINICAL DATA SECURITY & CONFIDENTIALITY

1. **Sensitive Personal Health Information (PHI):** All clinical data must be handled in compliance with international healthcare data protection standards (GDPR, HIPAA principles, NDPR).
2. **Cryptographic Transit & Rest:** All connections must require HTTPS/TLS 1.3. Database storage and backups must use AES-256 encryption at rest.
3. **Author Attribution:** Every clinical entry must record the immutable `author_id` (authenticated clinician) and cryptographic timestamp.
4. **Controlled Deletion:** Clinical documentation must never be hard-deleted from production databases. Soft-deletion or error-marking with permanent audit trails is mandatory.
5. **Secure Attachments:** Medical imaging, referral letters, and clinical uploads must reside in tenant-isolated, private storage buckets guarded by signed URLs with short expiry.

---

## 7. CLINICAL RECORD IMMUTABILITY PRINCIPLE

Clinical documentation constitutes a legal and medical record. Once finalized, clinical notes must never be silently edited or destroyed.

1. **Preserved History:** Clinical notes (Initial Assessments, SOAP notes, Progress Notes, Discharge Summaries, Outcome Measures) must preserve:
   - `author_id` (Clinician who performed and authored the note)
   - `created_at` (Immutable authoring timestamp)
   - `updated_at` (Revision timestamp)
   - `version` (Monotonically increasing version number)
   - `is_amendment` / `amendment_reason`
2. **Auditable Amendments:** Once a note is marked as `finalized` or `signed`, corrections must be recorded as an addendum or formal amendment, preserving the original text in version history.
3. **Tamper Detection:** Modifications to finalized records must produce high-priority audit events.

---

## 8. APPOINTMENT STATE MACHINE

Appointments must transition through an explicit, validated finite state machine:

```text
[Scheduled] ──> [Confirmed] ──> [Arrived] ──> [In Progress] ──> [Completed] ──> [Documentation Completed]
      │               │              │               │
      ├──[Cancelled]  ├──[Cancelled] ├──[No Show]    └──[Incomplete]
      └──[Rescheduled]└──[Rescheduled]
```

1. **Active vs Terminal States:**
   - **Active States:** `scheduled`, `confirmed`, `arrived`, `in_progress`, `completed`, `documentation_completed`.
   - **Terminal Exceptional States:** `cancelled`, `no_show`, `rescheduled`, `incomplete`.
2. **Server-Side Enforcement:** State transitions must be validated in database triggers, RPCs, or backend services. The frontend must never directly overwrite appointment status columns arbitrarily.
3. **Transition Rules:**
   - Cannot jump from `scheduled` directly to `completed` without passing through arrival or in-progress validation.
   - An appointment cannot reach `documentation_completed` unless an associated clinical visit or clinical note has been linked and authored.
   - Transitions to `cancelled` or `no_show` require an explicit reason and cancel author attribution.
   - When an appointment is `rescheduled`, the original record is archived with a foreign key pointer to the newly scheduled appointment to preserve historical scheduling audits.

---

## 9. DOMAIN SEPARATION: CLINICAL, FINANCIAL, & APPOINTMENTS

Do NOT create an overloaded monolithic table that combines appointments, clinical visits, payments, invoices, and session balances.

1. **Independent Concepts:**
   - **Appointment:** A reservation of time, room/facility, and clinician resource.
   - **Clinical Visit:** An actual healthcare encounter delivered to a patient.
   - **Episode of Care:** A clinical grouping of visits, notes, and treatment plans for a specific condition/diagnosis.
   - **Invoice:** A legal bill for goods, consultations, or packages issued to a patient or third-party payer.
   - **Financial Transaction Ledger:** Controlled, immutable records of debits, credits, payments, and refunds.
   - **Package Session Ledger:** Entitlement units and consumption tracking for prepaid care.
   - **Patient Wallet:** Pre-funded monetary balances strictly separated from session units.
2. **Non-Equivalence Rules:**
   - A booked appointment is NOT automatically a completed visit.
   - A completed visit is NOT automatically paid.
   - A payment does NOT automatically equal a clinical consultation (e.g. package purchase, deposit, product sale).

---

## 10. PACKAGE SESSION LEDGER ARCHITECTURE

When a patient purchases a treatment package (e.g. "6 Post-Operative Rehabilitation Sessions"), session entitlement must be tracked through an explicit, double-entry style session ledger.

1. **Never Calculate by Division:** Do NOT infer remaining sessions dynamically via `package_payment / session_price`.
2. **Explicit Ledger Entries:** Every allocation and consumption must create an immutable row in `package_session_ledger`:
   - `package_id`
   - `practice_id`
   - `patient_id`
   - `action` (`credit_purchase`, `debit_consumption`, `reversal_cancellation`, `expiry`, `manual_adjustment`)
   - `session_delta` (+1, -1, etc.)
   - `appointment_id` (Nullable: required on consumption)
   - `practitioner_id` (Clinician who delivered the session)
   - `authorized_by`
   - `timestamp`
3. **Auditable Balance:** The current available session count is the exact sum of verified ledger transactions. Every session deduction must trace back to the specific appointment, clinician, and date.

---

## 11. FINANCIAL ARCHITECTURE (CONTROLLED TRANSACTION LEDGER)

Physenra V1 adopts a **Controlled Financial Transaction Ledger** (Option B) designed to guarantee strict accounting integrity while remaining maintainable for private practices, with forward-compatibility for full double-entry general ledgers in V2.

1. **Separation of Concerns:**
   - `invoices`: Billable consultation items, products, taxes, discounts, totals, and due dates.
   - `payments`: Immutable settlement events with payment method (`cash`, `card`, `bank_transfer`, `pos`), external transaction references, and collector attribution.
   - `refunds`: Explicit negative settlement records referencing original payment IDs.
   - `credit_notes`: Legal adjustments reducing invoice liability.
   - `patient_wallets` & `wallet_transactions`: Pre-funded patient credit deposits and applications strictly denominated in currency.
2. **Zero In-Place Balance Overwriting:** Account balances and invoice statuses are derived from the sum of settled ledger entries. Historical financial records are strictly append-only and cannot be mutated after settlement.

---

## 12. APPOINTMENT VS CLINICAL VISIT SEPARATION

1. **Operational vs Clinical:** Scheduling is an operational resource management concern; clinical documentation is a medical-legal concern.
2. **Handling Variance:**
   - If a patient attends for an appointment, a `clinical_visits` record is instantiated.
   - If an appointment is a `no-show` or `late-cancellation`, an operational record exists, but NO clinical consultation occurred.
   - If an emergency or walk-in consultation occurs without a pre-existing scheduled slot, a clinical visit can exist with immediate or retroactive scheduling linkage.

---

## 13. PATIENT PORTAL RESTRICTIONS

The patient portal interface is a restricted projection of practice data:

1. **Self-Tenant Boundary:** Patients authenticate through Supabase Auth and can only query records where `patient_id == auth.uid()` and `practice_id` matches their registered practice.
2. **Strict Redaction:** Patients must NEVER have database access to:
   - Internal clinician notes, private clinical flags, or internal SOAP impressions
   - Other patients' records or appointments
   - Clinician earnings, commission rates, or clinic operational costs
   - Practice billing configurations or system settings
   - Platform administration controls

---

## 14. SERVER-SIDE RBAC ENFORCEMENT

1. **Frontend Visibility is Not Security:** Hiding a button, tab, or route in React is an aid to user experience; it provides zero security.
2. **Database & API Gates:** Every mutation and query must pass through Supabase RLS policies and/or Postgres security definer functions that inspect JWT claims and verify tenant role permissions before returning or modifying data.
3. **Negative Authorization Testing:** Test suites must include automated tests verifying that lower-privileged roles (e.g. Receptionist, Patient) receive permission denials when attempting unauthorized actions.

---

## 15. DATABASE DESIGN PRINCIPLES

Before any database migration is authored:

1. **Explicit Schema Definition:**
   - Every table must have a primary key (`id uuid DEFAULT gen_random_uuid()`).
   - Every tenant table must have `practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE RESTRICT`.
   - Foreign keys must declare explicit `ON DELETE` behavior (`RESTRICT` or `CASCADE` intentionally chosen).
   - Auditing columns `created_at` and `updated_at` (with auto-updating trigger) must be present.
2. **Constraints Over Conventions:** Use `CHECK` constraints, `UNIQUE` indexes, and `NOT NULL` constraints to make invalid states unrepresentable in the database.
3. **Index Strategy:** Every foreign key and tenant lookup column (`practice_id`, `patient_id`, `practitioner_id`, `status`, `start_time`) must be indexed.

---

## 16. MIGRATION GOVERNANCE

1. **Migration-First Development:** All schema modifications must be committed as versioned SQL migration scripts inside `supabase/migrations/`.
2. **Never Edit Production Manually:** No manual table altering via Supabase Table Editor or direct SQL editor on staging/production environments.
3. **Determinism:** Migrations must be idempotent, sequentially numbered, descriptive, and reproducible from a clean database state.
4. **Safe Schema Evolutions:** Migrations must be backward-compatible where practical and accompanied by verification scripts.

---

## 17. COMPREHENSIVE TESTING RULE

Every critical business flow must have automated tests:

1. **Testing Hierarchy:**
   - **Unit Tests:** Pure calculation logic (pricing, tax, ledger balancing, state machine transitions).
   - **Integration Tests:** Repository and service interactions with the database.
   - **RLS & Security Tests:** Explicit verification that Tenant A cannot access Tenant B's data under any authenticated role.
   - **Workflow E2E Tests:** Complete appointment booking -> arrival -> clinical documentation -> package deduction -> billing workflow.
2. **Definition of Done:** A feature is incomplete without passing automated tests covering both valid flows and unauthorized edge cases.

---

## 18. AUDIT LOGGING SPECIFICATION

Important system actions must create an immutable entry in `audit_events`:

1. **Logged Events:**
   - Authentication (login, logout, failed login)
   - Staff invitation, role assignment, and privilege change
   - Patient creation, demographic modification, and archiving
   - Clinical note authoring, signing, and amendment
   - Appointment status updates (cancellations, no-shows, completions)
   - Invoicing, payment capture, refunds, and adjustments
   - Package purchase and session ledger consumption
   - Data exports and bulk records access
2. **Schema Requirements:** `practice_id`, `actor_id`, `actor_role`, `action`, `entity_type`, `entity_id`, `ip_address`, `user_agent`, `metadata (jsonb)`, `timestamp`.

---

## 19. ARTIFICIAL INTELLIGENCE PRINCIPLES

1. **Assistive, Never Autonomous:** AI features (transcription, SOAP draft generation, clinical exercise suggestions) are purely assistive tools.
2. **No Silent Mutations:** AI must NEVER directly sign clinical notes, prescribe medications, diagnose pathology, alter financial ledgers, or transition appointment states without explicit clinician review and confirmation.
3. **Clinician Ownership:** All AI-assisted notes must explicitly display the reviewing clinician's sign-off and attribution in the permanent record.
4. **Data Privacy:** Patient identifying data must be sanitized or processed under strict enterprise healthcare privacy agreements. Patient health data must never be used to train public LLM models.

---

## 20. ENVIRONMENT ISOLATION & PROMOTION

Physenra maintains three distinct environment tiers:

1. **Development (Local/Dev):** Local development using project-scoped Supabase (`xxknmdgneamtoahqayvl` or local Docker) and synthetic test data.
2. **Staging:** Production-parity environment for final integration testing, migration dry-runs, and user acceptance.
3. **Production:** Live healthcare operating environment.
4. **Zero Cross-Pollination:** Development environments must never connect to production databases or utilize live credentials. Production data must never be pulled into local environments.

---

## 21. SECRETS & CREDENTIAL HYGIENE

1. **Never Commit Secrets:** API keys, database passwords, service-role keys, and tokens must never enter Git history.
2. **Client-Side Exposure Limits:** Only public anon keys (`VITE_SUPABASE_ANON_KEY`) may be bundled into browser code. Service-role keys are restricted to secure edge functions and serverless backend environments.
3. **Enforced Gitignore:** Continuous verification that `.env`, `.env.local`, and sensitive credential artifacts remain untracked.

---

## 22. CODE QUALITY & ARCHITECTURAL DISCIPLINE

1. **TypeScript Strict Mode:** All frontend and backend code must use strict TypeScript (`strict: true`, no implicit `any`).
2. **Domain-Driven Design (DDD):** Code must be organized by domain boundaries (e.g. `modules/scheduling`, `modules/clinical`, `modules/billing`) rather than generic technical buckets.
3. **Thin Presentation Components:** UI components must focus on presentation. Domain rules and state transitions belong in typed service layers, custom hooks, and server-side RPCs.
4. **Predictable Error Handling:** Errors must be typed, centralized, and presented with clear user feedback without leaking internal database stack traces.

---

## 23. DOMAIN BOUNDARIES

Physenra's codebase is divided into explicit, decoupled modules:

```text
├── auth/           # Identity, session handling, credentials
├── tenancy/        # Practice settings, locations, memberships
├── users/          # Practitioner and staff management
├── patients/       # Demographics, medical history, contacts
├── scheduling/     # Calendar, slots, appointments, rooms
├── clinical/       # Visits, SOAP notes, charts, assessments
├── billing/        # Invoices, items, taxes, fee schedules
├── payments/       # Payment gateway, refunds, receipts
├── packages/       # Packages, sessions, entitlement ledger
├── portal/         # Patient self-service experience
├── reporting/      # Clinical outcomes, operational & financial metrics
├── subscriptions/  # SaaS practice subscription billing
├── notifications/  # Email, SMS, WhatsApp appointment alerts
└── ai/             # Clinician transcription and note assistance
```

---

## 24. OBSERVABILITY & SYSTEM HEALTH

1. **Structured Logging:** Application errors and edge function executions must produce structured JSON logs with tenant context and correlation IDs.
2. **Health Monitoring:** Critical integrations (payment gateways, WhatsApp dispatch, Supabase API connectivity) must have monitored health checks.
3. **Rapid Diagnostic Capability:** System errors must be diagnosable without exposing PHI in external logging tools.

---

## 25. DEVELOPMENT LIFECYCLE DISCIPLINE

Every engineering enhancement must follow this strict progression:

```text
1. AUDIT       (Analyze current architecture, schema, and edge cases)
2. DESIGN      (Document contracts, entity relationships, and RLS policies)
3. IMPLEMENT   (Write clean, typed TypeScript and versioned SQL migrations)
4. TEST        (Execute unit, integration, and tenant RLS isolation tests)
5. COMMIT      (Clean, conventional commit messages with focused scope)
6. DEPLOY      (Automated CI/CD promotion through environment gates)
7. VERIFY      (Post-deployment health checks and smoke testing)
```

No phase may be bypassed.

---

## 26. GIT GOVERNANCE

1. **Repository:** `https://github.com/physenra/physenra.git`
2. **Local Identity:** All commits must be authored by `Physenra <physenra@gmail.com>`.
3. **Branching Strategy:** Main branch protection; features developed on scoped feature branches (`feat/`, `fix/`, `chore/`).
4. **Clean Commits:** Every commit must represent an atomic, functional state. No debug code, scratch files, or broken builds.

---

## 27. PRODUCTION SAFETY & DATA INTEGRITY

1. **Zero Downtime Schema Migrations:** Additive migrations preferred. Destructive column removals or table renames must be staged across releases.
2. **Backup Verification:** Automated daily database backups with tested point-in-time recovery (PITR).
3. **Pre-flight Checks:** High-risk migrations must be dry-run against staging before production execution.

---

## 28. DEFINITION OF DONE (ACCEPTANCE CRITERIA)

A task or feature in Physenra is declared complete ONLY when:

- [ ] All specified functional requirements are satisfied.
- [ ] UI is responsive, accessible, and handles loading and error states.
- [ ] TypeScript types are strict with zero lint errors or build warnings.
- [ ] Database schema is backed by clean, versioned Supabase migrations.
- [ ] Row Level Security (RLS) policies are active and tested for tenant isolation.
- [ ] Server-side authorization prevents lower-privileged roles from illegal access.
- [ ] Audit events are dispatched for sensitive mutations.
- [ ] Automated tests (unit, integration, and security) pass with 100% success.
- [ ] Production safety verified; no secrets or Kabworld artifacts committed.
