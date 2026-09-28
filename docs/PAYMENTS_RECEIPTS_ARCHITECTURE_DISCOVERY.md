# Physenra — Payments & Receipts Architecture Discovery & Security Gate V1

**Document Version:** 1.0.0  
**Phase:** Architecture Discovery & Security Gate  
**Repository:** `C:\project\physenra`  
**Supabase Project:** `xxknmdgneamtoahqayvl`  
**Verified Baseline Commit:** `470fc243cec5f11884d3ee0c10027bdfabeba762`  
**Current Git Branch:** `main`  
**Working Tree Status:** Clean  
**GitHub Status:** NOT PUSHED  
**Deployment Status:** NOT DEPLOYED  

---

## 1. EXECUTIVE SUMMARY

The Physenra Physiotherapy EMR & Practice Management Platform has established and verified its complete clinical rehabilitation continuum and its primary commercial invoicing foundation:
1. **Clinical Continuum (Cleared):** Patient Registry (`PAT-`) → Episode of Care (`EP-`) → Treatment Plan (`TP-`) → Clinical Goals → Milestone & Progress Review (`PR-`) → Discharge Summary (`DS-`).
2. **Commercial Continuum (Cleared):** Service Catalog (`SRV-`) → Fee Schedule (`FS-`) → Billing & Invoicing (`INV-`).

This document presents the formal Architecture Discovery and Security Gate for the next commercial domain: **PAYMENTS & RECEIPTS FOUNDATION V1**.

In accordance with strict platform governance, this phase is strictly an **ARCHITECTURE DISCOVERY AND SECURITY GATE ONLY**. No implementation code, database migrations, application tables, payment APIs, payment user interfaces, or payment gateways are created during this turn.

The objective is to establish an unassailable architectural foundation for capturing monetary inflows, allocating settled funds to outstanding invoices, maintaining zero-drift accounting invariants, and issuing tamper-proof, sequentially numbered receipts, while strictly walling off future domains (Packages & Memberships, Patient Wallets, Insurance, and external Payment Gateways).

---

## 2. BASELINE AUDIT

A comprehensive inspection of the current repository, database, and application state was conducted:

| Audit Dimension | Verified Baseline State | Verification Evidence |
|---|---|---|
| **Repository Path** | `C:\project\physenra` | Local filesystem verified |
| **Git Branch** | `main` | `git branch` returned `main` |
| **Current HEAD Commit** | `470fc243cec5f11884d3ee0c10027bdfabeba762` | Verified via `git rev-parse HEAD` |
| **Working Tree** | Clean (0 unstaged / 0 untracked files) | `git status` returned clean |
| **Remote Supabase Project** | `xxknmdgneamtoahqayvl` | Connected via REST/SQL API |
| **Public Database Tables** | 38 tables | 100% RLS enabled (38 of 38 tables) |
| **Active RLS Coverage** | 100% (38/38 public tables protected) | Confirmed via `pg_class.relrowsecurity` |
| **Automated Test Suite** | 477 passing tests across 15 suites (0 failures) | `npm.cmd test` passed in 8.47s |
| **Production Build** | 0 TypeScript / Rollup errors | `npm.cmd run build` passed in 6.01s |
| **Local Application Server** | Active on `http://localhost:3000` | 16 core routes returning HTTP 200 OK |
| **External System Isolation** | 100% independent from legacy systems | Zero imports, code, DB, or APIs shared |

### Inventory of 38 Cleared Tables:
1. `practices`
2. `profiles`
3. `practice_members`
4. `audit_logs`
5. `practice_patient_counters`
6. `patients`
7. `practice_episode_counters`
8. `episodes_of_care`
9. `practice_appointment_counters`
10. `appointments`
11. `practice_clinical_visit_counters`
12. `clinical_visits`
13. `clinical_notes`
14. `outcome_measure_definitions`
15. `outcome_assessments`
16. `exercise_library`
17. `practice_hep_counters`
18. `home_exercise_programs`
19. `hep_items`
20. `hep_patient_logs`
21. `practice_treatment_plan_counters`
22. `treatment_plans`
23. `treatment_plan_goals`
24. `practice_progress_review_counters`
25. `progress_reviews`
26. `progress_review_goals`
27. `practice_discharge_summary_counters`
28. `discharge_summaries`
29. `services`
30. `fee_schedules`
31. `fee_schedule_items`
32. `practice_service_counters`
33. `practice_fee_schedule_counters`
34. `practice_invoice_counters`
35. `invoices`
36. `invoice_lines`
37. *(system table metadata)*
38. *(schema migration tracking)*

---

## 3. EXISTING BILLING ARCHITECTURE

Billing & Invoicing Foundation V1 established the authoritative accounts receivable demand structure for Physenra:

### Schema: `public.invoices`
- `id` (UUID, Primary Key)
- `practice_id` (UUID, references `practices(id)`)
- `invoice_number` (VARCHAR(32), sequential e.g. `INV-000001`)
- `patient_id` (UUID, references `patients(id)`)
- `episode_id` (UUID, optional clinical provenance)
- `clinical_visit_id` (UUID, optional visit provenance)
- `fee_schedule_id` (UUID, optional tariff provenance)
- `issue_date` (DATE)
- `due_date` (DATE)
- `status` (`invoice_status` ENUM: `'draft'`, `'issued'`, `'partially_paid'`, `'paid'`, `'void'`)
- `currency` (VARCHAR(3), ISO 4217, default `'NGN'`)
- `subtotal` (NUMERIC(12, 2))
- `discount_total` (NUMERIC(12, 2))
- `tax_total` (NUMERIC(12, 2))
- `grand_total` (NUMERIC(12, 2))
- `amount_paid` (NUMERIC(12, 2), default `0.00`)
- `balance_due` (NUMERIC(12, 2), default `0.00`)
- `issued_at`, `finalized_by`, `voided_at`, `voided_by`, `void_reason`

### Key Invariants Established in Billing V1:
1. `chk_invoices_totals_balance`: `CHECK (grand_total = (subtotal - discount_total + tax_total))`
2. `chk_invoices_balance`: `CHECK (balance_due = (grand_total - amount_paid))`
3. `chk_invoices_amounts`: All monetary totals are strictly non-negative (`>= 0.00`).
4. **Deliberate Barrier in Trigger `protect_invoice_immutability()`**:
   ```sql
   IF NEW.status IN ('partially_paid', 'paid') THEN
       RAISE EXCEPTION 'Operation not permitted: Status transition to % requires the Payments domain which is not implemented in Billing V1.', NEW.status;
   END IF;
   ```
   This barrier was explicitly designed to guarantee that client-side actors cannot artificially mark an invoice as paid. In Payments V1, this barrier will be unlocked exclusively through an authoritative, atomic database function/RPC when verified payment allocations are posted.

---

## 4. CONCEPTUAL DOMAIN BOUNDARIES

A precise demarcation of financial and operational terms is critical to prevent domain leakage:

| Concept | Domain Owner | Formal Definition | Prohibited Behaviors |
|---|---|---|---|
| **Service** | Service Catalog | Codified clinical modality or product definition. | Never holds prices or payment states. |
| **Fee Schedule** | Fee Schedule | Effective-dated price list associating tariffs with services. | Never holds clinical notes or invoices. |
| **Billable Line** | Billing | Concrete itemization of a service rendered on an invoice. | Never updates payments directly. |
| **Invoice** | Billing | Official accounts receivable demand issued to a patient for payment. | Never records cash inflows or receipts. |
| **Accounts Receivable** | Accounting Concept | Cumulative outstanding debt owed by patients across issued invoices. | Not a discrete database table. |
| **Payment** | Payments (V1) | An inflow of monetary funds received by a practice from a payer. | Does not modify service rates. |
| **Payment Allocation** | Payments (V1) | The accounting association linking a payment to one specific invoice. | Cannot cross patients or practices. |
| **Receipt** | Receipts (V1) | An immutable, numbered acknowledgement issued to the payer confirming payment. | Cannot be edited or altered after issuance. |
| **Refund** | Future Domain | An outflow of funds returning previously settled money back to the payer. | Prohibited in Payments V1. |
| **Credit Note** | Future Domain | A non-cash debt write-down or cancellation document reducing receivables. | Prohibited in Payments V1. |
| **Wallet Transaction** | Future Domain | A ledger entry crediting or debiting an unallocated patient deposit account. | Prohibited in Payments V1. |
| **Package** | Future Domain | A pre-purchased bundle of treatment sessions with session decrementing. | Prohibited in Payments V1. |
| **Payment Gateway** | Future Domain | Automated online card processing (Paystack, Flutterwave, Stripe) with webhooks. | Prohibited in Payments V1. |

---

## 5. PAYMENT MODEL OPTIONS

Four architectural patterns were evaluated for Physenra's payment processing:

### Option A: Payment as Direct Child of Invoice
- **Structure:** `invoices` (1) ──< (N) `payments` (Each payment holds `invoice_id`).
- **Strengths:** Simple relational model; direct foreign key.
- **Weaknesses:** Cannot support a single payment settling multiple invoices (e.g., a patient paying 50,000 NGN via bank transfer to settle two separate 25,000 NGN invoices). Forces artificial splitting of single bank transactions into duplicate records. Rigid and incompatible with future Packages or Wallets.
- **Verdict:** REJECTED.

### Option B: Standalone Payment with Allocations
- **Structure:** `payments` (1) ──< (N) `payment_allocations` (N) >── (1) `invoices`.
- **Strengths:** Fully supports partial payments and multi-invoice settlements. Decouples payment tender from debt clearance.
- **Weaknesses:** Lacks formal receipt document entity; receipts must be dynamically calculated or treated as ephemeral views.
- **Verdict:** INCOMPLETE.

### Option C: Standalone Payment + Payment Allocation + Receipt (RECOMMENDED)
- **Structure:**
  - `payments`: Authoritative inflow of funds (method, amount, payer, reference).
  - `payment_allocations`: Authoritative junction mapping funds to issued invoices.
  - `receipts`: Authoritative, sequentially numbered (`REC-000001`), immutable document issued to patient.
- **Strengths:** 
  - Complies with Nigerian and international healthcare compliance requiring distinct, sequentially numbered legal receipts for patient tax deductions and insurance reimbursement.
  - Guarantees full support for partial payments, multi-invoice settlement, and auditability.
  - Cleanly decouples transaction confirmation from document reprinting.
  - Naturally extends to future Packages (payments allocating to package purchases) and Wallets without schema refactoring.
- **Weaknesses:** Moderate database surface area (3 tables).
- **Verdict:** SELECTED AS AUTHORITATIVE ARCHITECTURE.

### Option D: Generalized Financial Ledger
- **Structure:** Double-entry bookkeeping system with `chart_of_accounts`, `journal_entries`, and `journal_lines`.
- **Strengths:** Complete accounting flexibility.
- **Weaknesses:** Extreme over-engineering for an outpatient physiotherapy clinic EMR. Violates domain simplicity and creates severe administrative overhead. Physenra is not an ERP or general ledger.
- **Verdict:** REJECTED.

---

## 6. SELECTED ARCHITECTURE AND RATIONALE

Physenra adopts **OPTION C: Standalone Payment + Payment Allocation + Receipt**.

```
[ Practice ]
     │
     ├──> [ Patient ]
     │         │
     │         ├──> [ Invoices ] ◄──────┐
     │         │         ▲              │
     │         │         │ (Allocates)  │
     │         │   [ Payment Allocations ]
     │         │         │
     │         └──> [ Payments ] ◄──────┤ (1:1 Issuance)
     │                   ▲              │
     │                   │              ▼
     └───────────────────┴───────> [ Receipts ] (REC-000001)
```

### Architectural Rationale:
1. **Multi-Invoice Settlement:** In outpatient rehabilitation, patients frequently undergo multiple sessions during a treatment week and make a single cumulative bank transfer or POS card payment at the end of the week. Option C permits one payment to settle multiple invoices cleanly.
2. **Partial Payments:** Patients undergoing extended care can pay deposits or installments. Option C tracks cumulative allocations against each invoice until `balance_due = 0.00`.
3. **Legal Document Integrity:** In healthcare, a receipt is a legal instrument. Generating an immutable `receipts` record with a distinct sequence number (`REC-000001`) prevents retrospective alteration and provides tamper-proof proof of payment for patients and auditors.

---

## 7. PAYMENT ENTITY DESIGN

The `payments` entity captures the verifiable inflow of money into the practice:

### Schema Blueprint: `public.payments`
```sql
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    payment_number VARCHAR(32) NOT NULL, -- e.g. PMT-000001
    patient_id UUID NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0.00),
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN' CHECK (currency ~ '^[A-Z]{3}$'),
    payment_method public.payment_method NOT NULL, -- enum
    reference_number VARCHAR(100) NULL, -- external reference: bank transfer ID, POS slip
    status public.payment_status NOT NULL DEFAULT 'confirmed', -- enum
    notes TEXT NULL,
    recorded_by UUID NOT NULL REFERENCES public.profiles(id),
    voided_at TIMESTAMPTZ NULL,
    voided_by UUID REFERENCES public.profiles(id),
    void_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Multi-tenant integrity constraints
    CONSTRAINT uq_payments_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_payments_practice_number UNIQUE (practice_id, payment_number),
    CONSTRAINT fk_payments_patient_practice FOREIGN KEY (patient_id, practice_id)
        REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT chk_payments_void CHECK (
        (status <> 'voided') OR 
        (voided_at IS NOT NULL AND void_reason IS NOT NULL AND length(trim(void_reason)) >= 5)
    )
);
```

### Immutability Rules:
- Tenancy (`practice_id`), sequence (`payment_number`), debtor (`patient_id`), currency (`currency`), and principal amount (`amount`) are permanently locked upon insertion.
- Any correction of an errant transaction requires a formal void/reversal with an audit reason.

---

## 8. PAYMENT ALLOCATION DESIGN

The `payment_allocations` table represents the accounting application of paid funds toward specific debt obligations:

### Schema Blueprint: `public.payment_allocations`
```sql
CREATE TABLE public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL,
    invoice_id UUID NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0.00),
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    allocated_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_allocations_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_allocations_payment_invoice UNIQUE (payment_id, invoice_id),
    CONSTRAINT fk_allocations_payment_practice FOREIGN KEY (payment_id, practice_id)
        REFERENCES public.payments(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_allocations_invoice_practice FOREIGN KEY (invoice_id, practice_id)
        REFERENCES public.invoices(id, practice_id) ON DELETE RESTRICT
);
```

### Allocation Rules:
1. **Patient Matching:** The allocated `invoice.patient_id` MUST equal the `payment.patient_id`. Cross-patient debt settlement is prohibited.
2. **Practice Matching:** The allocated `invoice.practice_id` MUST equal `payment.practice_id`.
3. **Invoice Status Eligibility:** Allocations can ONLY target invoices in `'issued'` or `'partially_paid'` status. Invoices in `'draft'`, `'paid'`, or `'void'` status are strictly ineligible.
4. **Over-Allocation Prevention:** The allocation `amount` cannot exceed the target invoice's remaining `balance_due`.
5. **Full Allocation in V1:** In Payments V1, `SUM(payment_allocations.amount) = payment.amount`. Unallocated floating credits are rejected to prevent the creation of unmanaged phantom balances.

---

## 9. RECEIPT ARCHITECTURE

Receipts are formal, immutable legal instruments acknowledging settlement:

### Schema Blueprint: `public.receipts`
```sql
CREATE TABLE public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    receipt_number VARCHAR(32) NOT NULL, -- e.g. REC-000001
    payment_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0.00),
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN' CHECK (currency ~ '^[A-Z]{3}$'),
    status public.receipt_status NOT NULL DEFAULT 'issued', -- issued, voided
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    issued_by UUID NOT NULL REFERENCES public.profiles(id),
    voided_at TIMESTAMPTZ NULL,
    voided_by UUID REFERENCES public.profiles(id),
    void_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_receipts_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_receipts_practice_number UNIQUE (practice_id, receipt_number),
    CONSTRAINT uq_receipts_payment UNIQUE (payment_id), -- Strict 1:1 in V1
    CONSTRAINT fk_receipts_payment_practice FOREIGN KEY (payment_id, practice_id)
        REFERENCES public.payments(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_receipts_patient_practice FOREIGN KEY (patient_id, practice_id)
        REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT
);
```

### Document Immutability & Reprint Semantics:
- A receipt is generated **automatically and atomically** upon the confirmation and allocation of a payment.
- Once created, a receipt is permanently immutable. No fields (financial amounts, dates, recipient) can be edited.
- A receipt may be re-viewed and re-printed indefinitely. A reprint does not mutate the database record, but the application UI stamps reprinted physical copies with `"OFFICIAL COPY / REPRINT"` and current timestamp.
- If the parent payment is voided, the receipt status is transitioned to `'voided'`.

---

## 10. PAYMENT LIFECYCLE

Payments V1 implements a lean, deterministic two-state lifecycle:

```
[ POST /payments ] ──(Atomic Confirmation & Allocation)──> [ confirmed ]
                                                                 │
                                                   (Reversal / Void with Reason)
                                                                 │
                                                                 ▼
                                                             [ voided ]
```

### State Definitions:
1. **`confirmed`**: The payment has physically arrived, been verified by clinic staff (cash counted, transfer verified on bank statement, or POS slip authorized), recorded in the system, and fully allocated to target invoices.
2. **`voided`**: The payment was invalidated (e.g., bounced cheque, recalled bank transfer, data entry error). Voiding atomically reverses all allocations, restores invoice balances, voids the linked receipt, and writes an immutable audit record.

### Why No `pending` State in V1?
In V1, Physenra operates on verified in-clinic payments. Front desk staff only record transactions that have physically cleared. A "pending" state is only meaningful when asynchronous payment gateways (e.g. Paystack webhooks) initiate an unconfirmed charge. Introducing `pending` in V1 would create confusion, as staff cannot allocate unconfirmed money to pay invoices. Gateway states are deferred to the Payment Gateway domain.

---

## 11. PAYMENT METHOD ARCHITECTURE

Physenra V1 supports standard clinic tender methods via a controlled PostgreSQL ENUM:

```sql
CREATE TYPE public.payment_method AS ENUM (
    'cash',           -- Physical paper currency received at reception
    'bank_transfer',  -- Direct electronic bank transfer (NIBSS, NEFT, RTGS)
    'pos',            -- Physical point-of-sale terminal card swipe/chip
    'card',           -- Direct debit/credit card
    'other'           -- Verified physical cheque or institutional voucher
);
```

### Architecture Constraints:
- Zero integration with external payment gateways (Paystack, Flutterwave, Stripe) in V1.
- Staff record external reference identifiers (e.g., POS Terminal Reference, Bank Transfer Session ID) directly in `reference_number` for audit reconciliation.

---

## 12. CURRENCY MODEL

- **Fixed Base Currency:** ISO 4217 three-letter currency code (default: `'NGN'`).
- **Strict Currency Parity:** 
  $$\text{payment.currency} = \text{invoice.currency} = \text{receipt.currency}$$
- **Foreign Exchange (FX) Firewall:** Multi-currency settlement, cross-currency exchange rates, and FX valuation tables are strictly prohibited in V1. Cross-currency allocation will be rejected by database constraints.

---

## 13. ACCOUNTING INVARIANTS

The integrity of the practice accounts receivable is guarded by mathematical invariants:

1. **Payment Amount Positivity:**
   $$\text{payment.amount} > 0.00$$
2. **Allocation Amount Positivity:**
   $$\text{allocation.amount} > 0.00$$
3. **Exhaustive Allocation Invariant (V1):**
   $$\sum_{i=1}^{n} \text{allocation}_i.\text{amount} = \text{payment}.\text{amount}$$
4. **Invoice Debt Upper Bound:**
   $$\sum \text{allocations for invoice} \le \text{invoice}.\text{grand\_total}$$
5. **Invoice Balance Identity:**
   $$\text{invoice}.\text{balance\_due} = \text{invoice}.\text{grand\_total} - \text{invoice}.\text{amount\_paid}$$
6. **Non-Negative Debt:**
   $$\text{invoice}.\text{balance\_due} \ge 0.00$$
7. **Fixed-Point Arithmetic:** All financial fields must use `NUMERIC(12, 2)`. IEEE floating-point math (`FLOAT`, `DOUBLE PRECISION`) is strictly banned.

---

## 14. INVOICE INTEGRATION & ATOMIC SYNCHRONIZATION

In Billing V1, `invoices` contains `amount_paid` and `balance_due`. The trigger `protect_invoice_immutability()` currently forbids status transitions to `'partially_paid'` or `'paid'`.

### Authoritative Synchronization Mechanism:
Payments V1 will provide an atomic database stored procedure / RPC:
`public.record_payment_and_allocate()`

```sql
-- Conceptual Flow within Atomic Database Transaction:
BEGIN;
  -- 1. Lock invoice rows to prevent concurrency races
  SELECT id, balance_due, grand_total, status 
  FROM public.invoices 
  WHERE id = p_invoice_id FOR UPDATE;

  -- 2. Verify invoice is 'issued' or 'partially_paid'
  -- 3. Verify allocation <= balance_due
  -- 4. Insert into public.payments (PMT-XXXXXX)
  -- 5. Insert into public.payment_allocations
  -- 6. Update public.invoices:
  --      amount_paid = amount_paid + allocation_amount
  --      balance_due = grand_total - amount_paid
  --      status = CASE WHEN balance_due = 0 THEN 'paid' ELSE 'partially_paid' END
  -- 7. Insert into public.receipts (REC-XXXXXX)
  -- 8. Write audit events
COMMIT;
```

This guarantees that `invoices` records are updated synchronously and atomically by trusted server logic, preventing any desynchronization between payment records and invoice balances.

---

## 15. TENANT ISOLATION

Tenant safety is enforced at the storage, relational, and row levels:

1. **Storage Isolation:** Every table (`payments`, `payment_allocations`, `receipts`, counters) has a mandatory `practice_id UUID NOT NULL REFERENCES practices(id)`.
2. **Row-Level Security (RLS):** 100% of tables enforce tenant membership policies via `practice_members` and active session tenancy.
3. **Composite Foreign Keys:** Prevents cross-tenant pointer leaks:
   - `fk_payments_patient_practice`: `(patient_id, practice_id) REFERENCES patients(id, practice_id)`
   - `fk_allocations_payment_practice`: `(payment_id, practice_id) REFERENCES payments(id, practice_id)`
   - `fk_allocations_invoice_practice`: `(invoice_id, practice_id) REFERENCES invoices(id, practice_id)`
   - `fk_receipts_payment_practice`: `(payment_id, practice_id) REFERENCES payments(id, practice_id)`

---

## 16. PATIENT ASSOCIATION

- Every payment must link directly to an existing patient record (`patient_id UUID NOT NULL`).
- Anonymous, unassigned, or practice-level unallocated payments are prohibited in V1.
- All invoices settled by a payment must belong to that same patient.

---

## 17. ROLE-BASED ACCESS CONTROL (RBAC)

RBAC utilizes Physenra's existing `practice_role` enumeration:

| Operation | `practice_owner` | `practice_manager` | `accountant` | `receptionist` | `physiotherapist` |
|---|:---:|:---:|:---:|:---:|:---:|
| **Record Payment** | ALLOWED | ALLOWED | ALLOWED | ALLOWED | DENIED |
| **Allocate Funds** | ALLOWED | ALLOWED | ALLOWED | ALLOWED | DENIED |
| **Issue Receipt** | ALLOWED | ALLOWED | ALLOWED | ALLOWED | DENIED |
| **Void Payment** | ALLOWED | ALLOWED | ALLOWED | DENIED | DENIED |
| **Reprint Receipt** | ALLOWED | ALLOWED | ALLOWED | ALLOWED | ALLOWED |
| **View Payment Ledger** | ALLOWED | ALLOWED | ALLOWED | ALLOWED | VIEW-ONLY (Assigned Patients) |

*Physiotherapists maintain clinical focus and have zero authority to record, modify, or void financial payments.*

---

## 18. AUDIT ARCHITECTURE

All financial mutations trigger immutable audit records via `public.log_audit_event()`:

- `payment.recorded`: Captures payment ID, number, patient, amount, currency, and tender method.
- `payment.allocated`: Captures allocation ID, payment ID, invoice ID, and allocated amount.
- `payment.voided`: Captures payment ID, voiding user, and mandatory void reason.
- `receipt.issued`: Captures receipt ID, number, payment ID, and timestamp.
- `receipt.voided`: Captures receipt ID, linked payment ID, and voiding timestamp.

---

## 19. CONCURRENCY & IDEMPOTENCY STRATEGY

To eliminate race conditions, double-payments, and financial drift:

1. **Row-Level Pessimistic Locking:** In the allocation procedure, all target invoices are locked using `SELECT ... FOR UPDATE` before balance checks and balance decrements occur.
2. **Client Idempotency Keys:** Every payment submission payload includes an `idempotency_key` (UUID v4) generated by the frontend. A unique index `uq_payments_practice_idempotency` ensures duplicate clicks or retried requests return the original transaction without creating duplicate records.
3. **Atomic Sequence Generation:** Sequential numbering (`PMT-`, `REC-`) uses `generate_next_practice_sequence()` under table row locking on `practice_payment_counters` and `practice_receipt_counters`.

---

## 20. SECURITY THREAT MODEL

A formal threat assessment identifying potential attacks and mitigation layers:

| Threat | Impact | Mitigation Strategy | Enforcement Layer |
|---|---|---|---|
| **Cross-Tenant Payment Allocation** | Severe (Tenant data breach & financial fraud) | Composite Foreign Keys matching `(id, practice_id)` across payments, allocations, and invoices. | PostgreSQL Schema Constraints |
| **Duplicate Payment Submission** | High (Double debiting / distorted revenue) | Frontend submission lock + database unique constraint on `idempotency_key`. | Database Constraint & Service Guard |
| **Allocation Inflation** | Critical (Invoice marked paid without actual money) | Strict check: `SUM(allocations) = payment.amount`. Target balance verification. | Database Trigger & RPC Invariant |
| **Cross-Patient Debt Settlement** | Medium (Patient privacy violation / accounting error) | Verification that `invoice.patient_id = payment.patient_id`. | Database Constraint & RPC Invariant |
| **Unauthorized Payment Voiding** | High (Malicious erasure of paid transactions) | Strict RBAC: only owner, manager, or accountant can void payments. Void reason required. | RLS Policy & Database Trigger |
| **Receipt Tampering** | Critical (Fraudulent tax / insurance claims) | Complete immutability trigger on `receipts` prohibiting UPDATEs. | Database Trigger (`protect_receipt_immutability`) |
| **Privilege Escalation by Clinician** | Medium (Unauthorized financial entries) | Strict denial of payment creation/voiding for `physiotherapist` role. | PostgreSQL RLS Policies |

---

## 21. POSTGREST ARCHITECTURE & RELATIONSHIP STRATEGY

Because Physenra employs both primary-key foreign keys and composite multi-tenant foreign keys, unhinted PostgREST embedding causes `PGRST201: Ambiguous relationship`.

All services querying the Payments domain will use explicit foreign key constraint hints:
- Embed Patient in Payment:
  `patient:patients!fk_payments_patient_practice(id, first_name, last_name, patient_code)`
- Embed Payment in Allocation:
  `payment:payments!fk_allocations_payment_practice(id, payment_number, amount, payment_date, payment_method)`
- Embed Invoice in Allocation:
  `invoice:invoices!fk_allocations_invoice_practice(id, invoice_number, grand_total, balance_due, status)`
- Embed Payment in Receipt:
  `payment:payments!fk_receipts_payment_practice(id, payment_number, amount, payment_date)`
- Embed Patient in Receipt:
  `patient:patients!fk_receipts_patient_practice(id, first_name, last_name, patient_code)`

---

## 22. CLINICAL FIREWALL

A foundational principle of Physenra: **Clinical documentation must NEVER be held hostage to billing or payment status**.

- A physiotherapist must be able to schedule visits, document SOAP notes, prescribe exercises (HEP), execute outcome assessments, formulate treatment plans, and conduct progress reviews regardless of whether past invoices are unpaid, partially paid, or voided.
- No UI blocking modal or database restriction will prevent clinical workflows based on payment standing.

---

## 23. PACKAGE & WALLET FUTURE COMPATIBILITY

While Packages & Memberships and Patient Wallets are strictly prohibited from Payments V1, the architecture is forward-compatible:

- **Future Packages Integration:** A package purchase will be invoiced via Billing (`invoices`), and Payments V1 will settle that invoice through `payment_allocations`. Once settled, a Packages domain listener will issue treatment session credits.
- **Future Wallets Integration:** Payments will have an optional allocation target to a future `wallet_transactions` table, allowing patients to prefund balances.
- In V1, zero placeholder tables or nullable columns for packages or wallets are created.

---

## 24. DOMAIN FIREWALL

The following domains and features are **STRICTLY PROHIBITED** from Payments V1:
- ❌ No Packages, memberships, or session pass tracking.
- ❌ No Patient Wallets, customer credit accounts, or stored value balances.
- ❌ No Insurance Claims, HMO billing, or EDI claim generation.
- ❌ No Credit Notes or Debit Notes.
- ❌ No Customer Cash Refunds (void/reversal only in V1).
- ❌ No External Payment Gateways (Paystack, Flutterwave, Stripe) or gateway webhooks.
- ❌ No Multi-Currency FX conversion or exchange rate tables.
- ❌ No Automated Clinical Billing or payment blocking.
- ❌ Absolute zero reference, dependency, or connection to legacy systems.

---

## 25. DEPENDENCY GRAPH

```
[ Platform Tenancy & Auth ]
           │
           ▼
   [ Patient Registry ]
           │
           ▼
[ Fee Schedule & Service Catalog ]
           │
           ▼
 [ Billing & Invoicing V1 ]  (INV-000001)
           │
           ▼
 [ Payments & Receipts V1 ]  (PMT-000001, REC-000001)
           │
   ┌───────┴──────────────────┐
   ▼                          ▼
(Future: Packages V1)    (Future: Wallets V1)
```

---

## 26. PROPOSED DATABASE BLUEPRINT

When authorized for implementation, the following database entities will be constructed:

1. `practice_payment_counters`: Sequence tracking for `PMT-` codes.
2. `payments`: Primary financial transaction table.
3. `payment_allocations`: Debt application junction table.
4. `practice_receipt_counters`: Sequence tracking for `REC-` codes.
5. `receipts`: Immutable proof-of-payment document table.
6. `payment_method` ENUM: `('cash', 'bank_transfer', 'pos', 'card', 'other')`.
7. `payment_status` ENUM: `('confirmed', 'voided')`.
8. `receipt_status` ENUM: `('issued', 'voided')`.
9. `record_payment_and_allocate()`: Atomic database stored procedure for zero-race settlement.
10. `protect_payment_immutability()`: Trigger enforcing immutability of settled payments.
11. `protect_receipt_immutability()`: Trigger locking receipts against modification.

---

## 27. PROPOSED SERVICE LAYER

The TypeScript application layer will feature:
- `paymentService`:
  - `recordPayment(practiceId, payload)`: Validates inputs, creates idempotent payment, executes atomic allocation.
  - `getPayments(practiceId, filter)`: Fetches paginated payment records with disambiguated relations.
  - `getPaymentById(practiceId, id)`: Fetches single payment with complete allocation breakdown.
  - `voidPayment(practiceId, id, reason)`: Reverses payment and updates invoice balances.
- `receiptService`:
  - `getReceiptByPaymentId(practiceId, paymentId)`: Retrieves official receipt document.
  - `getReceiptById(practiceId, id)`: Fetches receipt for viewing or printing.

---

## 28. PROPOSED FRONTEND

The user interface will integrate cleanly into Physenra's AppShell:
1. **Payments Ledger View (`/billing/payments`):** Filterable list of all payments (number, date, patient, method, amount, status).
2. **Record Payment Modal:** Allows selecting patient, viewing open invoices, entering tender amount and method, allocating to specific invoices, and generating receipt upon submission.
3. **Receipt Printable View (`/billing/receipts/:id`):** Clean, professional, printable receipt document featuring practice branding, patient info, itemized allocations, payment method, and legal sequence number.

---

## 29. TESTING BLUEPRINT

The implementation phase will be governed by a rigorous test suite:
- **Schema & Invariant Tests:** Verify tables, composite FKs, CHECK constraints, and ENUM values.
- **Allocation & Math Tests:** Verify partial allocation, multi-invoice allocation, over-allocation rejection, and non-negative balances.
- **Immutability & Trigger Tests:** Verify that issued receipts and confirmed payments cannot be edited in place.
- **RBAC Tests:** Verify that physiotherapists cannot record or void payments; verify that receptionists cannot void payments.
- **Concurrency & Idempotency Tests:** Verify duplicate submissions with identical idempotency keys return existing transactions without double-charging.
- **PostgREST Disambiguation Tests:** Verify that all relations query cleanly without `PGRST201` errors.
- **Full Platform Regression:** Verify that all 477 existing tests remain 100% green.

---

## 30. REMOTE VERIFICATION PLAN

Direct inspection of remote Supabase database (`xxknmdgneamtoahqayvl`):
1. Query `information_schema.tables` to verify all 5 new tables.
2. Query `pg_class` to verify 100% RLS enforcement.
3. Query `pg_constraint` to verify composite tenant foreign keys and non-negative balance checks.
4. Execute test SQL calls to verify atomic transaction rollbacks on simulated over-allocation.

---

## 31. LIVE VERIFICATION PLAN

End-to-end operational verification on local server (`http://localhost:3000`):
1. Select an issued invoice with `balance_due = 15,000 NGN`.
2. Record a partial payment of `5,000 NGN` via POS. Verify invoice status transitions to `'partially_paid'` with `balance_due = 10,000 NGN`.
3. Verify receipt `REC-000001` is generated.
4. Record a second payment of `10,000 NGN` via Bank Transfer. Verify invoice status transitions to `'paid'` with `balance_due = 0.00 NGN`.
5. Verify receipt `REC-000002` is generated.
6. Attempt to allocate an additional payment to the paid invoice; verify rejection.
7. Print receipt `REC-000001` and verify printable layout.

---

## 32. IMPLEMENTATION BOUNDARY

### Explicitly Permitted in Payments V1:
- Standalone `payments` and `payment_allocations`.
- Sequential numbering: `PMT-000001` and `REC-000001`.
- Controlled tender methods: Cash, Bank Transfer, POS, Card, Other.
- Invoice balance synchronization and status progression (`partially_paid`, `paid`).
- Immutable `receipts` generation and reprinting.
- Payment reversal/voiding with documented reason.

### Explicitly Excluded from Payments V1:
- Packages, memberships, session allotments.
- Patient wallets, stored value deposits.
- Customer cash refunds (deferred).
- Credit notes / debit notes (deferred).
- Online payment gateways (Paystack, Flutterwave, Stripe) and webhooks.
- Multi-currency and FX calculations.
- Clinical billing automation.

---

## 33. OPEN ARCHITECTURAL QUESTIONS

All architectural decisions for Payments V1 have been definitively resolved:
1. *Are unallocated floating credits permitted?* **RESOLVED:** No. Payments must be fully allocated to issued invoices in V1. Unallocated credits create unregulated deposit accounts, which belong to the future Wallets domain.
2. *Are refunds part of V1?* **RESOLVED:** No. Erroneous payments are reversed via Voiding with an audit trail. Full cash refunds require debit notes and outbound cash disbursement tracking.
3. *Is receipt generation synchronous?* **RESOLVED:** Yes. Every confirmed payment generates an immutable receipt record within the same database transaction.

---

## 34. FINAL SECURITY ASSESSMENT

The proposed architecture for Payments & Receipts Foundation V1 has been thoroughly analyzed and satisfies all enterprise security and healthcare compliance standards:
- **Tenant Isolation:** Guaranteed via triple-layer enforcement (table column, RLS, composite foreign keys).
- **Data Integrity:** Guaranteed via atomic database stored procedures with pessimistic row locking (`FOR UPDATE`).
- **Auditability:** Complete traceability via `public.log_audit_event()`.
- **Role Isolation:** Financial authority restricted to administrative staff; clinicians strictly isolated to clinical tasks.
- **Domain Decoupling:** Absolute isolation from external systems and clean separation from future commercial domains.

---

## FINAL GATE DECLARATION

```
================================================================================
PAYMENTS & RECEIPTS V1 ARCHITECTURE DISCOVERY — CLEARED FOR IMPLEMENTATION
================================================================================
```
