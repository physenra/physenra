# PHYSENRA — PACKAGES & MEMBERSHIPS V1
## Architecture Discovery & Security Gate Specification

---

### 1. EXECUTIVE SUMMARY

The Physenra Physiotherapy EMR & Practice Management Platform has established and verified its complete clinical continuum (Patient → Episode → Treatment Plan → Goals → Progress Review → Discharge Summary) and primary commercial continuum (Service Catalog → Fee Schedule → Billing & Invoicing → Payments & Receipts).

This document establishes the formal **Architecture Discovery and Security Gate** for the next commercial domain: **PACKAGES & MEMBERSHIPS FOUNDATION V1**.

In outpatient rehabilitation and physiotherapy practices, patients frequently require structured, multi-week care programs (e.g., "10-Session Post-Operative ACL Rehabilitation Bundle", "6-Session Spinal Decompression Package"). To promote treatment adherence and commercial predictability, practices bundle these sessions into pre-purchased packages at agreed tariffs.

**Core Discovery Determination:**
1. **Architectural Separation of Packages vs. Memberships**: Packages (one-time purchases of discrete treatment session quotas) and Memberships (cyclic recurring subscriptions with automated re-billing) represent distinct commercial paradigms. Because Physenra's payment foundation intentionally excludes third-party payment gateways, automated card tokenization, and subscription webhooks in V1, **One-Time Treatment Packages are approved for V1**, whereas **Recurring Memberships are formally deferred** to a future gateway-enabled phase.
2. **Approved Architecture (Option C — Authoritative Commercial Invoicing + Decoupled Entitlement + Append-Only Consumption Ledger)**:
   - Package purchase is routed through the authoritative Billing & Invoicing engine (`invoices`, `invoice_lines`), preserving double-entry accounting.
   - Entitlement (`package_entitlements`) activates strictly upon full payment settlement (`invoice.status = 'paid'`).
   - Session consumption is recorded in an immutable, append-only ledger (`package_consumption_ledger`) linked directly to a completed `clinical_visit_id`.
   - Remaining session balance is derived deterministically from total purchased quota minus confirmed consumption rows, preventing silent counter manipulation.
3. **Clinical Firewall**: A physiotherapist's ability to document patient care, clinical notes, and outcome measures remains completely decoupled from package balances. Packages never gate clinical documentation.
4. **Physical Isolation**: Complete independence from external legacy platforms is strictly maintained.

---

### 2. PRE-DISCOVERY AUDIT

An exhaustive audit of the Physenra codebase, repository, and database was performed prior to establishing this architecture:

| Dimension | Verified State | Audit Evidence |
|---|---|---|
| **Repository Path** | `C:\project\physenra` | Local filesystem confirmed |
| **Active Branch** | `main` | `git branch` returned `main` |
| **HEAD Commit** | `f808631c11a61c67302e02c684204757258e10d5` | `git rev-parse HEAD` matched expected baseline |
| **Commit Message** | `feat: establish Physenra payments and receipts foundation` | Clean verified baseline |
| **Working Tree** | Clean | `git status` reports 0 unstaged / 0 untracked files |
| **Migration Sequence** | 17 applied migrations | Monotonically ordered in `supabase/migrations/` |
| **Supabase Project** | `xxknmdgneamtoahqayvl` | Connected via REST & Management API |
| **Public Database Tables** | 43 tables | 100% RLS coverage (43/43 tables active) |
| **Automated Test Suite** | 514 passing tests across 17 suites | 100% pass rate (`npm.cmd test`), 0 failures |
| **Production Build** | 0 TypeScript / Rollup errors | `npm.cmd run build` transformed 1,722 modules in 5.22s |
| **Live App Server** | `http://localhost:3000` | 20 core clinical and commercial routes returning HTTP 200 OK |
| **Product Independence** | 100% independent from legacy systems | 0 legacy references, 0 shared code, 0 shared credentials |

---

### 3. CURRENT SYSTEM BASELINE

The existing cleared schema comprises:
- **Tenancy & Core Identity**: `practices`, `profiles`, `practice_memberships`, `audit_logs`.
- **Clinical Continuum**: `patients`, `episodes_of_care`, `appointments`, `clinical_visits`, `clinical_notes`, `clinical_outcome_measures`, `outcome_definitions`, `home_exercise_programs`, `exercise_library`, `treatment_plans`, `treatment_plan_goals`, `milestone_progress_reviews`, `progress_review_goals`, `discharge_summaries`.
- **Commercial Continuum**: `services`, `fee_schedules`, `fee_schedule_items`, `invoices`, `invoice_lines`, `practice_invoice_counters`, `payments`, `payment_allocations`, `receipts`, `practice_payment_counters`, `practice_receipt_counters`.

**Crucial Existing Invariants:**
- Every clinical and financial entity enforces multi-tenant composite foreign keys `(practice_id, ...)`.
- Financial immutability: Issued invoices, lines, confirmed payments, and receipts cannot be updated or hard-deleted.
- Audit logging: Handled centrally through `public.log_audit_event()`.

---

### 4. DOMAIN DEFINITION

To eliminate architectural ambiguity, domain concepts are defined with precision:

1. **Service**: An authoritative clinical modality or deliverable activity (e.g. "Musculoskeletal Physiotherapy Consultation", "Hydrotherapy Session"). Defined in `services`.
2. **Fee**: The authorized price of a Service under a specific Fee Schedule. Defined in `fee_schedule_items`.
3. **Invoice**: An issued debtor instrument demanding payment for specific line items (`invoices`, `invoice_lines`).
4. **Payment**: An authoritative monetary inflow settling invoice balance due (`payments`, `payment_allocations`).
5. **Package**: A commercial product bundle offering a predetermined volume of treatment sessions or service entitlements (e.g. "10-Session Post-Op Rehab Bundle") at a set package tariff.
6. **Package Purchase**: The commercial transaction wherein a patient contracts to buy a package, generating an issued debtor Invoice.
7. **Package Entitlement**: The active operational allowance granted to a patient to receive a quota of sessions within a defined validity window.
8. **Package Session**: A single countable treatment encounter unit entitled under the package.
9. **Package Consumption**: The formal, immutable decrement of one session entitlement triggered by a completed clinical visit.
10. **Membership**: An ongoing subscription relationship involving recurring billing periods and cycle-based quota resets.
11. **Membership Plan / Enrollment / Period**: The cyclic structure governing subscriptions (deferred from V1).
12. **Package Expiration**: The automatic lapse of unused sessions upon the arrival of `expires_at`.
13. **Package Cancellation**: The administrative termination of a package prior to full consumption or expiration.
14. **Package Transfer**: The reassignment of package ownership between patients (deferred from V1).
15. **Package Refund**: The monetary payout for unused package sessions (deferred; Physenra has no refund/credit note domain in V1).
16. **Package Renewal**: Purchasing a new package upon exhaustion or expiration of an existing one.
17. **Package Pause**: The temporary freezing of an expiration clock (deferred; handled via audited expiration extensions in V1).
18. **Package Upgrade / Downgrade**: Transitioning an active package to a higher/lower tier (deferred from V1).

---

### 5. STRICT CONCEPTUAL BOUNDARIES

To prevent ledger corruption and conceptual drift:
- **Service $\neq$ Fee**: A service is what is done; a fee is what it costs under a tariff schedule.
- **Fee $\neq$ Invoice**: A fee is a catalog rate; an invoice is a point-in-time debtor claim.
- **Invoice $\neq$ Payment**: An invoice demands money; a payment delivers money.
- **Payment $\neq$ Package**: A payment is cash inflow; a package is an operational service quota.
- **Package $\neq$ Wallet**: A package represents pre-purchased **session quantities for designated clinical modalities**, NEVER generic stored cash value. A patient cannot spend package units on retail braces or unrelated diagnostic tests.
- **Package Purchase $\neq$ Package Consumption**: Purchase is an administrative billing event; consumption is a clinical encounter event.
- **Package $\neq$ Membership**: Packages are discrete, one-time quota instruments; memberships are ongoing recurring obligations.

---

### 6. PACKAGE ARCHITECTURE OPTIONS

#### Option A: Mutable Session Counter on Package Table
- Structure: A single `packages` table with columns `total_sessions` and `remaining_sessions`. Each visit decrements `remaining_sessions = remaining_sessions - 1`.
- Pros: Simple to query.
- Cons: Extreme vulnerability to race conditions, lost updates, and concurrent over-consumption. Provides zero audit trail of which specific visits consumed which sessions. Susceptible to silent data manipulation.
- Decision: **REJECTED**.

#### Option B: Decoupled Entitlement Bypassing Invoicing
- Structure: Packages are created directly without generating debtor invoices. Cash is accepted directly against the package.
- Pros: Faster front-desk entry.
- Cons: Destroys practice financial reconciliation. Bypasses Accounts Receivable, breaks sales reporting, causes tax/discount divergence, and circumvents the Payments & Receipts V1 ledger.
- Decision: **REJECTED**.

#### Option C: Authoritative Commercial Invoicing + Decoupled Entitlement + Append-Only Consumption Ledger (RECOMMENDED)
- Structure:
  1. Package offering defined as a billable catalog item.
  2. Purchase creates an authoritative `invoice` and `invoice_lines`.
  3. Payments V1 settles the invoice atomically via `record_payment_and_allocate`.
  4. Entitlement (`package_entitlements`) activates strictly upon invoice status = `paid`.
  5. Consumption (`package_consumption_ledger`) is strictly append-only, recording each session consumption event with direct foreign key to `clinical_visits(id)`.
  6. Remaining sessions are derived deterministically: $\text{Remaining} = \text{total\_sessions} - \text{COUNT(ledger rows)}$.
- Pros: Complete financial integrity, tamper-proof audit trails, seamless integration with Billing V1 and Payments V1, absolute concurrency protection via database row-locking, and zero risk of silent balance drift.
- Decision: **APPROVED**.

#### Option D: Unified Package & Recurring Membership System
- Structure: Treats packages as single-period memberships and recurring plans as multi-period memberships.
- Pros: Single conceptual framework.
- Cons: Requires recurring billing engines, tokenized payment card vaults, automated payment retry dunning, and webhook listeners—none of which exist in Physenra V1. Introduces immense architectural premature complexity.
- Decision: **REJECTED / DEFERRED**.

---

### 7. SELECTED ARCHITECTURE (OPTION C)

Option C is selected as the authoritative foundation for Physenra Packages V1:
```
[ Service Catalog / Fee Schedule ]
                │
                ▼
      [ Package Definition ] ── (Defines sessions, modality, validity, price)
                │
                ▼ (Purchase Action)
         [ Invoices V1 ] ──────► [ Payments & Receipts V1 ]
                │                               │
                │ (Full Payment Confirmed)       │
                ▼                               ▼
      [ Package Entitlement ] ◄─────────────────┘
                │
                ▼ (Clinical Visit Completed)
   [ Package Consumption Ledger ] (Append-only, 1 row per visit)
                │
                ▼
   [ Derived Remaining Quota ] = Total Sessions - Consumed Ledger Rows
```

---

### 8. PACKAGE LIFECYCLE STATE MACHINE

The minimal, authoritative V1 package lifecycle comprises 6 states:

```
[ pending_payment ] ──(Invoice Paid)──► [ active ] ──(All Sessions Used)──► [ completed ]
         │                                  │
         │ (Invoice Voided)                 ├────────(Time Expired)───────► [ expired ]
         ▼                                  │
      [ void ]                              ├────────(Admin Cancelled)────► [ cancelled ]
                                            │
                                            ▼ (Payment Reversal/Void)
                                       [ suspended ] ──(Payment Re-settled)──► [ active ]
```

1. **`pending_payment`**: Package purchase invoice is issued but balance remains unpaid. Sessions **cannot** be consumed.
2. **`active`**: Invoice fully settled (`paid`), current timestamp is within validity period ($\text{now()} \le \text{expires\_at}$), and $\text{remaining\_sessions} > 0$.
3. **`suspended`**: Linked payment was voided, reverting invoice balance. Session consumption is frozen until payment is re-confirmed.
4. **`completed`**: All entitled sessions have been consumed ($\text{remaining\_sessions} = 0$). Terminal state.
5. **`expired`**: Validity period has elapsed with unused sessions remaining. Consumption blocked.
6. **`cancelled`**: Terminated administratively by practice owner/manager. Remaining sessions forfeited.

---

### 9. PACKAGE PURCHASE MODEL

- **Trigger**: Front desk or administrative staff selects a package template for a specific patient.
- **Mechanism**: The system creates a standard debtor invoice in `invoices` with an invoice line referencing the package definition.
- **Price Freezing**: The unit price, discount, tax rate, and package quota are snapshotted onto the invoice line at the moment of creation. Subsequent fee schedule modifications never alter historical purchase terms.

---

### 10. PACKAGE ENTITLEMENT MODEL

An entitlement record (`package_entitlements`) represents the patient's legal right to receive care under the package:
- `id` UUID PRIMARY KEY
- `practice_id` UUID NOT NULL REFERENCES `practices(id)`
- `package_number` VARCHAR(32) NOT NULL (Format: `PKG-000001`)
- `patient_id` UUID NOT NULL REFERENCES `patients(id)`
- `package_definition_id` UUID NOT NULL REFERENCES `package_definitions(id)`
- `invoice_id` UUID NOT NULL REFERENCES `invoices(id)`
- `total_sessions` INTEGER NOT NULL CHECK (`total_sessions > 0`)
- `validity_days` INTEGER NOT NULL CHECK (`validity_days > 0`)
- `status` public.package_status NOT NULL DEFAULT 'pending_payment'
- `activated_at` TIMESTAMPTZ NULL
- `expires_at` TIMESTAMPTZ NULL

---

### 11. SESSION CONSUMPTION MODEL

- **Authoritative Trigger**: Explicit completion of a Clinical Visit (`clinical_visits.status = 'completed'`).
- **Mechanism**: Administrative or clinical checkout records consumption via stored procedure `consume_package_session(p_practice_id, p_entitlement_id, p_clinical_visit_id)`.
- **Validation**:
  1. Entitlement is in status `active`.
  2. $\text{now()} \le \text{expires\_at}$.
  3. `clinical_visit.patient_id = entitlement.patient_id`.
  4. Derived remaining sessions $\ge 1$.
  5. The clinical visit has not already consumed a session from this entitlement (`UNIQUE (entitlement_id, clinical_visit_id)`).

---

### 12. SESSION LEDGER & BALANCE DERIVATION MODEL

To ensure permanent auditability and eliminate counter drift:
- No mutable integer column `remaining_sessions` exists as an authoritative source of truth.
- Instead, every consumption event writes an immutable row to `package_consumption_ledger`:
  ```sql
  CREATE TABLE public.package_consumption_ledger (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      practice_id UUID NOT NULL,
      entitlement_id UUID NOT NULL,
      clinical_visit_id UUID NOT NULL,
      patient_id UUID NOT NULL,
      consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      consumed_by UUID NOT NULL REFERENCES public.profiles(id),
      notes TEXT NULL,
      CONSTRAINT uq_consumption_entitlement_visit UNIQUE (entitlement_id, clinical_visit_id)
  );
  ```
- **Authoritative Calculation**:
  $$\text{Consumed Sessions} = \text{COUNT}(\text{package\_consumption\_ledger rows})$$
  $$\text{Remaining Sessions} = \text{package\_entitlements.total\_sessions} - \text{Consumed Sessions}$$

---

### 13. CLINICAL INTEGRATION & CLINICIAN FIREWALL

- **Absolute Rule**: Package status MUST NEVER prevent a clinician from delivering or documenting care.
- A physiotherapist can start, document, edit, sign, and complete a clinical visit, write clinical notes, prescribe exercise programs, perform outcome measures, and write discharge summaries regardless of whether a patient has an active package, an expired package, a suspended package, or zero packages.
- Package consumption is a commercial settlement layer attached to the visit, NOT a clinical prerequisite.

---

### 14. BILLING INTEGRATION

- Packages integrate directly with Billing & Invoicing V1.
- A package purchase generates an `invoices` record with `grand_total` equal to the package price.
- If a patient receives treatment covered by an active package, the individual clinical visit does NOT generate a separate billable invoice line for that session, because the session was prepaid via the package invoice.

---

### 15. PAYMENT INTEGRATION

- Payments & Receipts V1 settles the package purchase invoice via `record_payment_and_allocate`.
- Full settlement of the invoice (`invoice.status = 'paid'`) triggers automatic activation of the package entitlement, setting `activated_at = now()` and `expires_at = now() + (validity_days || ' days')::INTERVAL`.
- **Payment Voiding**: If the payment is voided via `void_payment`, the invoice status reverts to `partially_paid` or `issued`. A trigger on `invoices` automatically transitions the linked package entitlement to `suspended`, preventing any subsequent session consumption until payment is restored.

---

### 16. PARTIAL PAYMENT POLICY

- **Strict V1 Rule**: Package entitlements require full invoice payment (`amount_paid = grand_total`) to activate.
- **Rationale**: Outpatient packages are volume-discounted agreements (e.g. 10 sessions for NGN 100,000 instead of NGN 150,000). Allowing partial payments to activate fractional entitlements destroys the volume pricing rationale, creates ambiguity about which sessions are valid, and complicates revenue recognition.
- If a partial payment is recorded, the package remains `pending_payment` until the balance is settled in full.

---

### 17. PRICING & HISTORICAL SNAPSHOT POLICY

- `package_definitions` establishes template prices.
- When an invoice is created, the package price, session count, and service details are frozen into `invoice_lines`.
- If management later increases the package price in the catalog, previously purchased packages remain bound to their historical purchased price and terms.

---

### 18. CANCELLATION POLICY

- **Authorized Roles**: Only `practice_owner` and `practice_manager` can cancel an active package.
- **Effect**: Entitlement status transitions to `cancelled`. Remaining unused sessions are permanently forfeited.
- **Financial Liability / Refunds**: V1 provides **zero cash refunds**. If a patient cancels a package, any commercial accommodation must be handled administratively outside the system; credit notes and refund payouts remain deferred.

---

### 19. EXPIRATION POLICY

- Packages enforce an explicit `validity_days` parameter (e.g. 90 days from activation).
- Expiration is evaluated deterministically at query and transaction time:
  $$\text{Is Expired} \iff \text{now()} > \text{expires\_at} \land \text{Remaining} > 0$$
- **Extension Workflow**: A practice manager or owner can extend `expires_at` via an audited stored procedure `extend_package_validity`, requiring a mandatory justification reason ($\ge 5$ characters).

---

### 20. TRANSFER POLICY

- **Strict V1 Rule**: Package entitlements are strictly non-transferable.
- A package purchased for Patient A cannot be transferred to Patient B, nor transferred across practices.
- This prevents fraudulent entitlement swapping, secondary patient billing disputes, and accounting divergence.

---

### 21. MULTIPLE PACKAGE POLICY

- A patient **may hold multiple active packages simultaneously** (e.g. a 10-session Musculoskeletal Rehab Package and a 5-session Hydrotherapy Package).
- **Selection Algorithm**: When settling a clinical visit:
  1. The user explicitly selects which package to apply, filtered by matching service modality.
  2. If multiple packages cover the same modality, the UI defaults to the package with the **earliest expiration date** (FIFO consumption).

---

### 22. MEMBERSHIP / SUBSCRIPTION DECISION

- **Determination: DEFERRED FROM V1.**
- Recurring subscriptions require automated recurring billing, payment gateway tokenization, customer credit card vaults, payment failure webhooks, and subscription lifecycle management.
- Because Physenra V1 operates under an explicit zero-external-gateway mandate (supporting cash, bank transfer, and POS payments), true recurring memberships are architecturally inappropriate.
- V1 will implement **One-Time Treatment Packages V1**. Memberships are formally scheduled for a future gateway-enabled phase.

---

### 23. ROLE-BASED ACCESS CONTROL (RBAC)

Existing role permissions map as follows:

| Role | Define Packages | Purchase / Sell | View Packages | Consume Session | Extend Validity | Cancel Package |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `practice_owner` | Yes | Yes | Yes | Yes | Yes | Yes |
| `practice_manager` | Yes | Yes | Yes | Yes | Yes | Yes |
| `accountant` | View only | Yes | Yes | Yes | No | No |
| `receptionist` | View only | Yes | Yes | Yes | No | No |
| `physiotherapist` | View only | No | Yes | Yes | No | No |
| `patient` | No | No | View own | No | No | No |

---

### 24. TENANT ISOLATION

- Every proposed table includes `practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE`.
- Composite foreign keys enforce cross-practice isolation:
  - `(practice_id, patient_id)` references `patients(practice_id, id)`
  - `(practice_id, invoice_id)` references `invoices(practice_id, id)`
  - `(practice_id, clinical_visit_id)` references `clinical_visits(practice_id, id)`
  - `(practice_id, entitlement_id)` references `package_entitlements(practice_id, id)`

---

### 25. ROW-LEVEL SECURITY (RLS)

100% RLS coverage using `public.current_practice_id()`:
- `SELECT`: Restricted to `practice_id = current_practice_id()`.
- `INSERT`: Restricted to authorized roles per RBAC matrix.
- `UPDATE`: Restricted to managers/owners for lifecycle changes; consumption ledger updates are denied (`qual: false`).
- `DELETE`: Permanently blocked on entitlements and consumption ledger (`qual: false`).

---

### 26. AUDIT ARCHITECTURE

All lifecycle transitions and consumption events will log structured audit payloads via `public.log_audit_event()`:
- `package.definition_created`
- `package.purchased`
- `package.activated`
- `package.session_consumed`
- `package.validity_extended`
- `package.suspended`
- `package.cancelled`

---

### 27. CONCURRENCY & RACE CONDITIONS

- To prevent simultaneous double-consumption, `consume_package_session` will acquire a pessimistic row lock `FOR UPDATE` on `package_entitlements`.
- Any concurrent request attempting to consume the same remaining session will block and subsequently evaluate updated remaining counts, preventing negative balances.

---

### 28. IDEMPOTENCY

- Unique constraint `UNIQUE (entitlement_id, clinical_visit_id)` guarantees that a single clinical visit can never consume more than one session from the same package entitlement, even under rapid double-clicks, browser refreshes, or network retries.

---

### 29. POSTGREST RELATIONSHIP DISAMBIGUATION

Because `package_entitlements` and `package_consumption_ledger` connect to `patients`, `invoices`, and `clinical_visits`, all foreign keys will carry explicit constraint names:
- `!fk_entitlements_patient_practice`
- `!fk_entitlements_invoice_practice`
- `!fk_consumption_entitlement_practice`
- `!fk_consumption_visit_practice`
- `!fk_consumption_patient_practice`

---

### 30. FUTURE WALLET COMPATIBILITY

- Patient Wallets represent stored financial liquidity (e.g. NGN 50,000 credit).
- Packages represent clinical session quotas (e.g. 10 Treatment Sessions).
- In the future, a Patient Wallet can be used to **pay for a Package Purchase Invoice**, cleanly preserving the boundary without architectural conflict.

---

### 31. REPORTING MODEL

The authoritative schema directly supports practice analytics:
- Package sales volume & revenue (via linked invoices and fee schedules).
- Package utilization rate ($\frac{\text{Consumed Sessions}}{\text{Total Sessions}}$).
- Expired breakage (unutilized sessions on expired packages).
- Average session completion time (days from activation to completion).

---

### 32. PROPOSED DATABASE BLUEPRINT (DISCOVERY ONLY — NOT IMPLEMENTED)

```sql
-- 1. Package Counter
CREATE TABLE public.practice_package_counters (
    practice_id UUID PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Package Definitions (Catalog Templates)
CREATE TABLE public.package_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    service_id UUID NOT NULL,
    total_sessions INTEGER NOT NULL CHECK (total_sessions > 0),
    validity_days INTEGER NOT NULL CHECK (validity_days > 0),
    package_price NUMERIC(12, 2) NOT NULL CHECK (package_price > 0.00),
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_package_definitions_code UNIQUE (practice_id, code)
);

-- 3. Package Entitlements
CREATE TABLE public.package_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    package_number VARCHAR(32) NOT NULL,
    patient_id UUID NOT NULL,
    package_definition_id UUID NOT NULL,
    invoice_id UUID NOT NULL,
    total_sessions INTEGER NOT NULL CHECK (total_sessions > 0),
    validity_days INTEGER NOT NULL CHECK (validity_days > 0),
    status public.package_status NOT NULL DEFAULT 'pending_payment',
    activated_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ NULL,
    cancelled_at TIMESTAMPTZ NULL,
    cancelled_by UUID REFERENCES public.profiles(id),
    cancellation_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_package_entitlements_number UNIQUE (practice_id, package_number),
    CONSTRAINT uq_package_entitlements_invoice UNIQUE (invoice_id)
);

-- 4. Package Consumption Ledger (Append-Only)
CREATE TABLE public.package_consumption_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    entitlement_id UUID NOT NULL,
    clinical_visit_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    consumed_by UUID NOT NULL REFERENCES public.profiles(id),
    notes TEXT NULL,
    CONSTRAINT uq_consumption_visit UNIQUE (entitlement_id, clinical_visit_id)
);
```

---

### 33. PROPOSED STORED PROCEDURES (DISCOVERY ONLY — NOT IMPLEMENTED)

1. `purchase_package(...)`: Creates debtor invoice and links `package_entitlements` in `pending_payment`.
2. `activate_package(...)`: Triggered upon invoice payment, setting status to `active` and initializing `expires_at`.
3. `consume_package_session(...)`: Locks entitlement `FOR UPDATE`, verifies validity and remaining sessions, inserts into `package_consumption_ledger`, and updates package status to `completed` if quota reached.
4. `extend_package_validity(...)`: Extends `expires_at` with mandatory justification.
5. `cancel_package(...)`: Voids remaining sessions with mandatory audit reason.

---

### 34. PROPOSED FRONTEND ARCHITECTURE

Planned application routes for implementation phase:
- `/app/packages`: Package catalog & management for practice managers.
- `/app/packages/new`: Create package template.
- `/app/patient-packages`: Patient package directory and active entitlements.
- `/app/patient-packages/new`: Purchase and issue package invoice for a patient.
- `/app/patient-packages/:packageId`: Detailed entitlement view, remaining session balance, and consumption history table.

---

### 35. FUTURE TEST BLUEPRINT

The future verification suite (`tests/packages_memberships.test.cjs`) will cover:
1. **Schema & Multi-Tenancy**: RLS policies, composite foreign keys, unique constraints.
2. **Sequential Numbering**: Monotonic `PKG-000001` generation.
3. **Invoicing & Payments Linkage**: Entitlement activation strictly tied to full invoice settlement.
4. **Append-Only Consumption**: Single visit consumption, double-consumption rejection, cross-patient consumption rejection.
5. **Concurrency & Locking**: Parallel consumption calls preventing negative balances.
6. **Expiration & Extension**: Expiration cutoff enforcement and audited extensions.
7. **Cancellation Invariants**: Zero cash refunds; immutable historical records.
8. **Clinical Firewall**: Verification that clinical visits can be documented independently.
9. **Domain Isolation**: 0 wallet references, 0 gateway dependencies.

---

### 36. SECURITY THREAT MODEL

| Threat ID | Threat Description | Severity | Mitigation | Verification Method |
|---|---|:---:|---|---|
| **T-01** | Cross-tenant package access | High | Practice-scoped composite foreign keys and RLS filters | Negative query with cross-tenant practice ID |
| **T-02** | Cross-patient session consumption | High | Stored procedure validates `visit.patient_id = entitlement.patient_id` | Negative RPC test passing mismatched patient |
| **T-03** | Silent session balance manipulation | Critical | Derived balance from append-only consumption ledger | Trigger preventing direct table counter updates |
| **T-04** | Double consumption by same visit | High | `UNIQUE (entitlement_id, clinical_visit_id)` database constraint | Duplicate consumption submission test |
| **T-05** | Concurrent session over-consumption | Critical | `SELECT ... FOR UPDATE` row lock on entitlement row | Parallel asynchronous RPC load test |
| **T-06** | Consumption against unpaid package | High | Status must be `active` (requires `invoice.status = 'paid'`) | Attempt consumption on `pending_payment` package |
| **T-07** | Consumption against expired package | High | Deterministic check `now() <= expires_at` in DB function | Attempt consumption with expired timestamp |
| **T-08** | Unauthorized validity extension | Medium | Restricted to `practice_owner` and `practice_manager` roles | Attempt extension from receptionist account |
| **T-09** | Clinical documentation blocking | Critical | Decouple clinical note workflows completely from packages | Verify clinical visit completion with 0 packages |
| **T-10** | Privilege escalation via SECURITY DEFINER | Critical | Explicit schema qualification and fixed `search_path = public, pg_temp` | Inspect `pg_proc.proconfig` configuration |

---

### 37. DOMAIN FIREWALL

The Packages architecture enforces strict isolation:
- ❌ No Patient Wallets, credit balances, or stored monetary values.
- ❌ No Recurring Memberships, subscription billing, or auto-renewals in V1.
- ❌ No External Payment Gateways (Stripe, Paystack, Flutterwave) or webhooks.
- ❌ No Cash Refunds or Credit Notes.
- ❌ No Patient-to-Patient Package Transfers.
- ❌ Absolute zero legacy system references.

---

### 38. IMPLEMENTATION BOUNDARY AUDIT

- **Implementation Status**: **ZERO IMPLEMENTATION PERFORMED**.
- 0 tables created.
- 0 migrations created.
- 0 RPCs created.
- 0 services created.
- 0 UI components created.
- 0 routes registered.
- Working tree remains completely clean.

---

### 39. GIT & REMOTE SAFETY

- **Repository**: `C:\project\physenra`
- **Active Branch**: `main`
- **Verified HEAD Commit**: `f808631c11a61c67302e02c684204757258e10d5`
- **Remote Push**: **NOT PUSHED**.
- **Deployment**: **NOT DEPLOYED**.

---

### 40. FINAL ARCHITECTURE GATE

```
================================================================================
                    FINAL ARCHITECTURE GATE DECISION
================================================================================
GATE:               PACKAGES & MEMBERSHIPS V1 ARCHITECTURE DISCOVERY
DECISION:           CLEARED FOR SPECIFICATION & IMPLEMENTATION
APPROVED MODEL:     OPTION C — Invoiced Package Purchase + Decoupled Entitlement
                    + Append-Only Consumption Ledger
SCOPE:              One-Time Multi-Session Treatment Packages V1
DEFERRED:           Recurring Subscriptions & Memberships (Deferred to Gateway Phase)
                    Patient Wallets (Deferred to Future Domain)
================================================================================
```
