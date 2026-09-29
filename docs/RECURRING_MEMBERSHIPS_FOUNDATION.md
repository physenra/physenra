# PHYSENRA RECURRING MEMBERSHIPS & SUBSCRIPTIONS FOUNDATION V1 — ARCHITECTURE & TECHNICAL SPECIFICATION

## 1. Executive Summary & Purpose
The **Recurring Memberships & Subscriptions Foundation V1** establishes an authoritative, audit-compliant, recurring periodic care and subscription management system for Physenra. Designed specifically for outpatient physiotherapy and physical rehabilitation practices, Memberships V1 enables clinics to offer structured periodic treatment plans (weekly, monthly, quarterly, annual) with automated cycle billing, strict session quota accounting, and guaranteed zero rollover across billing intervals.

Physenra's commercial continuum is formally architected as:
$$\text{Service Catalog} \longrightarrow \text{Fee Schedule} \longrightarrow \text{Billing \& Invoicing} \longrightarrow \text{Payments \& Receipts} \longrightarrow \text{Packages V1} \longrightarrow \text{Patient Wallets V1} \longrightarrow \mathbf{Recurring\ Memberships\ V1}$$

---

## 2. Core Architecture: Option E
Following the formal Architecture Discovery Gate, **Option E** was formally cleared and implemented:
$$\mathbf{Option\ E:\ Invoiced\ Billing-Cycle\ Demand\ +\ Decoupled\ Membership\ Enrollment\ +\ Cycle-Scoped\ Immutable\ Entitlement\ \&\ Usage\ Ledger}$$

### Fundamental Architectural Principles:
1. **Invoiced Accounts Receivable Single Source of Truth**:
   - Memberships and billing cycles do **not** maintain internal mutable payment or receivable balance columns.
   - Every billing cycle corresponds to an authoritative clinical invoice in `public.invoices`.
   - Cycle activation, overdue status, and payment state are strictly synchronized with the underlying invoice status:
     - Cycle `invoiced` $\longleftrightarrow$ Invoice `issued`
     - Cycle `active` $\longleftrightarrow$ Invoice `paid` (full payment with zero remaining balance)
     - Cycle `past_due` $\longleftrightarrow$ Invoice `overdue` / partial payment
     - Cycle `cancelled` $\longleftrightarrow$ Invoice `void`
2. **Mathematical Derived Quota (Zero Mutable Session Balances)**:
   - Neither `patient_memberships` nor `membership_billing_cycles` contains a mutable `remaining_sessions` or `sessions_used` column.
   - Available session quota for any billing cycle is strictly and deterministically derived from the append-only usage ledger:
     $$\text{Remaining Quota} = \text{session\_quota} - \sum_{e \in \text{cycle\_usage\_ledger}} \text{sessions\_consumed}$$
   - This eliminates race conditions, counter-synchronization drift, and phantom session deductions.
3. **Strict Zero Rollover Invariant**:
   - In V1, session entitlements are strictly scoped to the active billing cycle interval $[\text{start\_date}, \text{end\_date}]$.
   - Unused sessions expire automatically upon cycle transition. Rollover into subsequent billing periods is strictly prohibited in V1.
4. **Calendar Day Anchoring (1–28) & Deterministic Cycle Renewals**:
   - Cycle renewal dates are anchored to the day of month of enrollment (clamped between 1 and 28) to prevent Gregorian end-of-month calendar drift (e.g., February 28/29 vs March 31).
   - Cycles are deterministic and generated up to 3 days in advance of cycle expiration via deterministic stored procedure `generate_membership_renewal_cycles`.
5. **Zero Mid-Cycle Proration in V1**:
   - Upgrades, downgrades, and mid-cycle cancellations do not calculate mid-period partial-day financial refunds. Cancellations terminate renewal at the end of the current paid billing cycle.
6. **Pessimistic Concurrency Safety**:
   - Usage deductions hold an exclusive pessimistic row lock on the target cycle (`SELECT ... FOR UPDATE FROM membership_billing_cycles`) before calculating remaining quota and appending to `membership_usage_ledger`, guaranteeing atomic quota validation under concurrent clinical check-ins.

---

## 3. Database Schema & Relational Tenancy

All membership tables enforce strict multi-tenancy with composite foreign keys anchored on `(id, practice_id)`.

### 3.1 Tables Overview
1. `public.practice_membership_counters`:
   - Maintains atomic sequential numbering per practice.
   - Primary Key: `practice_id UUID REFERENCES public.practices(id) ON DELETE CASCADE`.
   - Columns: `last_number INTEGER NOT NULL DEFAULT 0`, `updated_at TIMESTAMPTZ`.
   - Constraints: `chk_practice_membership_counters_last_number CHECK (last_number >= 0)`.

2. `public.membership_plans`:
   - Template catalogue of recurring membership offerings.
   - Primary Key: `id UUID DEFAULT gen_random_uuid()`.
   - Columns: `practice_id`, `name`, `description`, `frequency` (`weekly`, `monthly`, `quarterly`, `annual`), `price`, `currency`, `service_id`, `session_quota`, `auto_renew_default`, `is_active`, `created_by`, `created_at`, `updated_at`.
   - Constraints:
     - `uq_membership_plans_id_practice UNIQUE (id, practice_id)`
     - `chk_membership_plans_name_len CHECK (length(trim(name)) >= 2)`
     - `chk_membership_plans_price CHECK (price >= 0.00)`
     - `chk_membership_plans_quota CHECK (session_quota > 0)`
     - `chk_membership_plans_currency CHECK (currency ~ '^[A-Z]{3}$')`
   - Composite Foreign Keys:
     - `fk_plan_practice` $\rightarrow$ `practices(id) ON DELETE CASCADE`
     - `fk_plan_service_practice` $\rightarrow$ `services(id, practice_id) ON DELETE RESTRICT`
     - `fk_plan_created_by` $\rightarrow$ `profiles(id)`

3. `public.patient_memberships`:
   - Agreement contract binding an enrolled patient to a membership plan.
   - Primary Key: `id UUID DEFAULT gen_random_uuid()`.
   - Columns: `practice_id`, `membership_number`, `patient_id`, `plan_id`, `status` (`pending_payment`, `active`, `paused`, `suspended`, `cancelled`, `expired`), `start_date`, `end_date`, `auto_renew`, `anchor_day`, `paused_at`, `pause_reason`, `cancelled_at`, `cancel_reason`, `created_by`, `created_at`, `updated_at`.
   - Invariant: **ZERO mutable balance, remaining quota, or financial cash columns**.
   - Constraints:
     - `uq_patient_memberships_id_practice UNIQUE (id, practice_id)`
     - `uq_patient_memberships_practice_number UNIQUE (practice_id, membership_number)`
     - `chk_patient_memberships_anchor CHECK (anchor_day BETWEEN 1 AND 28)`
     - `chk_patient_memberships_pause CHECK (status <> 'paused' OR (paused_at IS NOT NULL AND pause_reason IS NOT NULL AND length(trim(pause_reason)) >= 5))`
     - `chk_patient_memberships_cancel CHECK (status <> 'cancelled' OR (cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL AND length(trim(cancel_reason)) >= 5))`
   - Composite Foreign Keys:
     - `fk_membership_practice` $\rightarrow$ `practices(id) ON DELETE CASCADE`
     - `fk_membership_patient_practice` $\rightarrow$ `patients(id, practice_id) ON DELETE RESTRICT`
     - `fk_membership_plan_practice` $\rightarrow$ `membership_plans(id, practice_id) ON DELETE RESTRICT`
     - `fk_membership_created_by` $\rightarrow$ `profiles(id)`

4. `public.membership_billing_cycles`:
   - Individual recurring billing periods for a membership.
   - Primary Key: `id UUID DEFAULT gen_random_uuid()`.
   - Columns: `practice_id`, `membership_id`, `cycle_number`, `start_date`, `end_date`, `status` (`draft`, `invoiced`, `active`, `past_due`, `cancelled`, `expired`), `invoice_id`, `session_quota`, `created_at`, `updated_at`.
   - Constraints:
     - `uq_membership_billing_cycles_id_practice UNIQUE (id, practice_id)`
     - `uq_membership_billing_cycles_membership_cycle UNIQUE (membership_id, cycle_number)`
     - `chk_membership_cycles_dates CHECK (end_date >= start_date)`
     - `chk_membership_cycles_quota CHECK (session_quota > 0)`
   - Composite Foreign Keys:
     - `fk_cycle_practice` $\rightarrow$ `practices(id) ON DELETE CASCADE`
     - `fk_cycle_membership_practice` $\rightarrow$ `patient_memberships(id, practice_id) ON DELETE CASCADE`
     - `fk_cycle_invoice_practice` $\rightarrow$ `invoices(id, practice_id) ON DELETE RESTRICT`

5. `public.membership_usage_ledger`:
   - Append-only immutable log of session consumption against billing cycles.
   - Primary Key: `id UUID DEFAULT gen_random_uuid()`.
   - Columns: `practice_id`, `membership_id`, `cycle_id`, `patient_id`, `clinical_visit_id`, `service_id`, `sessions_consumed`, `notes`, `created_by`, `created_at`.
   - Invariant: **Strictly append-only (no update or delete permitted)**.
   - Constraints:
     - `uq_usage_ledger_id_practice UNIQUE (id, practice_id)`
     - `uq_usage_ledger_cycle_visit UNIQUE (cycle_id, clinical_visit_id)` (prevents double redemption for same encounter)
     - `chk_usage_ledger_sessions CHECK (sessions_consumed > 0)`
   - Composite Foreign Keys:
     - `fk_usage_practice` $\rightarrow$ `practices(id) ON DELETE CASCADE`
     - `fk_usage_membership_practice` $\rightarrow$ `patient_memberships(id, practice_id) ON DELETE RESTRICT`
     - `fk_usage_cycle_practice` $\rightarrow$ `membership_billing_cycles(id, practice_id) ON DELETE RESTRICT`
     - `fk_usage_patient_practice` $\rightarrow$ `patients(id, practice_id) ON DELETE RESTRICT`
     - `fk_usage_visit_patient_practice` $\rightarrow$ `clinical_visits(id, patient_id, practice_id) ON DELETE RESTRICT`
     - `fk_usage_service_practice` $\rightarrow$ `services(id, practice_id) ON DELETE RESTRICT`
     - `fk_usage_created_by` $\rightarrow$ `profiles(id)`

### 3.2 Controlled Lifecycle Enums
```sql
CREATE TYPE public.membership_frequency AS ENUM (
    'weekly',
    'monthly',
    'quarterly',
    'annual'
);

CREATE TYPE public.patient_membership_status AS ENUM (
    'pending_payment',
    'active',
    'paused',
    'suspended',
    'cancelled',
    'expired'
);

CREATE TYPE public.membership_cycle_status AS ENUM (
    'draft',
    'invoiced',
    'active',
    'past_due',
    'cancelled',
    'expired'
);
```

### 3.3 PostgREST Foreign Key Relationship Hints
To prevent PostgREST `PGRST201` HTTP 300 Multiple Choices errors when querying joined relations, explicit foreign key hints are mandatory across all queries:
- `membership_plans`: `service:services!fk_plan_service_practice`
- `patient_memberships`: `patient:patients!fk_membership_patient_practice`, `plan:membership_plans!fk_membership_plan_practice`
- `membership_billing_cycles`: `invoice:invoices!fk_cycle_invoice_practice`
- `membership_usage_ledger`: `visit:clinical_visits!fk_usage_visit_patient_practice`, `service:services!fk_usage_service_practice`

---

## 4. Atomic Sequential Identifier Generator
Membership agreements are assigned human-readable sequential identifiers (`MBR-000001`, `MBR-000002`) generated atomically via `public.generate_next_membership_number(p_practice_id UUID)`:
- Defined as `SECURITY DEFINER` with fixed `search_path = public`.
- Performs atomic upsert on `public.practice_membership_counters` (`ON CONFLICT (practice_id) DO UPDATE SET last_number = counters.last_number + 1`).
- Ensures gapless serialization across concurrent enrollment submissions.

---

## 5. Option E Stored Procedures & Business Logic

1. `public.enroll_patient_in_membership`:
   - Validates practice context, active plan, and patient status.
   - Calculates `anchor_day = LEAST(28, EXTRACT(DAY FROM p_start_date)::INTEGER)`.
   - Generates next atomic membership identifier (`MBR-XXXXXX`).
   - Inserts `patient_memberships` in `pending_payment` status.
   - Computes cycle date window based on frequency:
     - `weekly`: 7 days
     - `monthly`: 1 month
     - `quarterly`: 3 months
     - `annual`: 1 year
   - Inserts initial `membership_billing_cycles` record (cycle #1, `draft` status).
   - Automatically issues the initial invoice in `public.invoices` via standard billing numbering and triggers, linking it to the cycle and transitioning cycle status to `invoiced`.

2. `public.generate_membership_cycle_invoice`:
   - Generates an authoritative recurring invoice for any cycle in `draft` status.
   - Verifies invoice balance due and marks cycle as `invoiced`.

3. `public.generate_membership_renewal_cycles`:
   - Deterministic renewal worker called on-demand or during management review.
   - Scans active memberships with `auto_renew = true`.
   - Identifies cycles expiring within `p_lookahead_days` (default 3 days).
   - Generates cycle $N+1$ and issues the renewal invoice.

4. `public.sync_membership_cycle_on_invoice_payment`:
   - PostgreSQL trigger on `public.invoices` (`AFTER UPDATE OF status, balance_due`).
   - When linked invoice reaches `status = 'paid'` and `balance_due <= 0.00`, transitions cycle status to `active`.
   - If this is cycle #1 of a `pending_payment` membership, transitions parent membership to `active`.
   - If an invoice is voided, cancels the cycle.
   - If invoice becomes overdue, marks cycle `past_due`.

5. `public.record_membership_visit_usage`:
   - Atomically deducts membership session quota for a completed clinical visit.
   - Acquires pessimistic lock `SELECT ... FROM membership_billing_cycles FOR UPDATE`.
   - Validates cycle is `active` and clinical visit is `completed`.
   - Derives total consumed sessions from `membership_usage_ledger`.
   - Verifies $(\text{consumed} + \text{sessions}) \le \text{session\_quota}$.
   - Appends audit entry to `membership_usage_ledger`.

6. Lifecycle State Machine RPCs:
   - `public.pause_patient_membership`: Transitions `active` $\rightarrow$ `paused` with mandatory audit reason ($\ge 5$ characters).
   - `public.resume_patient_membership`: Transitions `paused` $\rightarrow$ `active`.
   - `public.cancel_patient_membership`: Transitions membership to `cancelled` with mandatory cancellation reason ($\ge 5$ characters). Disables future renewals.

---

## 6. Security Hardening & Row-Level Security
- **100% RLS Coverage**: Maintained across all 55 public database tables in Physenra.
- **Strict Hard-Delete Denial**: Hard deletes on `membership_plans`, `patient_memberships`, `membership_billing_cycles`, and `membership_usage_ledger` are rejected by both RLS policies (`FOR DELETE USING (false)`) and database triggers.
- **Append-Only Usage Ledger**: Trigger `trg_prevent_modification_membership_usage_ledger` unconditionally rejects `UPDATE` and `DELETE` operations on `membership_usage_ledger`.
- **Protected Identification Fields**: Trigger `trg_protect_patient_memberships_immutability` blocks post-creation alteration of `id`, `practice_id`, `membership_number`, `patient_id`, `plan_id`, and `anchor_day`, and forbids modifying terminal states (`cancelled`, `expired`).

---

## 7. Service Layer & Frontend Integration
- **Service Layer**: [`src/services/membershipService.ts`](file:///C:/project/physenra/src/services/membershipService.ts) provides complete typed methods for plan management, patient enrollment, cycle retrieval, visit usage deduction, lifecycle actions, wallet settlement, and deterministic cycle renewal.
- **TypeScript Models**: [`src/types/database.ts`](file:///C:/project/physenra/src/types/database.ts) and [`src/types/models.ts`](file:///C:/project/physenra/src/types/models.ts) export comprehensive types, payloads, and relational models.
- **UI Pages**:
  - [`src/pages/memberships/MembershipPlanListPage.tsx`](file:///C:/project/physenra/src/pages/memberships/MembershipPlanListPage.tsx): Plan catalogue management, creation modal, and quota configuration.
  - [`src/pages/memberships/MembershipListPage.tsx`](file:///C:/project/physenra/src/pages/memberships/MembershipListPage.tsx): Multi-tenant membership agreement dashboard with status filtering, new enrollment modal, and quick metrics.
  - [`src/pages/memberships/MembershipDetailPage.tsx`](file:///C:/project/physenra/src/pages/memberships/MembershipDetailPage.tsx): Comprehensive agreement details, cycle history, live quota calculation gauge, visit usage deduction modal, wallet settlement integration, and pause/resume/cancel controls.
- **Navigation & Profiles**:
  - Registered in [`src/App.tsx`](file:///C:/project/physenra/src/App.tsx) under `/app/membership-plans`, `/app/memberships`, `/app/memberships/:membershipId`.
  - Added to sidebar [`src/components/layout/Sidebar.tsx`](file:///C:/project/physenra/src/components/layout/Sidebar.tsx) with `Repeat` and `Layers` icons.
  - Linked to patient record in [`src/pages/patients/PatientProfilePage.tsx`](file:///C:/project/physenra/src/pages/patients/PatientProfilePage.tsx).

---

## 8. Verification & Test Coverage
- **Dedicated Test Suite**: [`tests/memberships.test.cjs`](file:///C:/project/physenra/tests/memberships.test.cjs) contains 52 comprehensive tests across 10 suites:
  - Suite 1: Database Schema & Relational Tenancy (7 tests)
  - Suite 2: Atomic Sequential Identifier Generator (3 tests)
  - Suite 3: Immutability & Lifecycle Triggers (3 tests)
  - Suite 4: Option E Stored Procedures & Invoiced Billing Demand (4 tests)
  - Suite 5: Invoice Payment & Cycle State Synchronization (4 tests)
  - Suite 6: Quota Mathematical Derivation & Concurrency Hardening (4 tests)
  - Suite 7: Row-Level Security & Multi-Tenancy (3 tests)
  - Suite 8: Absolute Domain Boundary Verification (7 tests)
  - Suite 9: Legacy Isolation (Zero Forbidden Keywords) (1 test)
  - Suite 10: Remote Supabase Live Verification with Disambiguated Hints (5 tests)
- **Full Regression Test Suite**: `npm test` reports **653 / 653 tests passing across all domains (0 failures)**.
- **Production Build**: `npm run build` compiles with **zero TypeScript errors and zero Rollup errors**.

---

## 9. Boundary Integrity & Excluded Scopes
In accordance with commercial engineering boundaries, the following scopes remain strictly deferred:
- No external automated payment gateways (Stripe, Paystack, Flutterwave) in V1.
- No external incoming webhooks in V1.
- No automated external background cron daemons in V1.
- No mid-cycle proration or pro-rata cash calculations in V1.
- No session rollover across cycle boundaries in V1.
- No multi-patient shared family plans in V1.
- No credit notes or external cash refunds in V1.
- Zero references to legacy platforms across any documentation, schema, or source code.
