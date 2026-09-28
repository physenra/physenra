# PHYSENRA — PAYMENTS & RECEIPTS FOUNDATION V1
## Architecture Specification, Security Hardening Record, and Verification Evidence

---

### 1. ARCHITECTURAL PURPOSE & OVERVIEW

The **Payments & Receipts Foundation V1** establishes the authoritative monetary settlement, accounts receivable clearing, and legal receipting backbone for the Physenra Physiotherapy EMR & Practice Management Platform. It implements the approved **Option C Architecture (Standalone Payment + Payment Allocation + Receipt)**, providing the essential financial layer that settles issued debtor invoices with immutable proof of transaction.

In physiotherapy and outpatient rehabilitation practice operations, payment processing demands absolute integrity between:
1. **Monetary Inflows**: Independent payment events capturing real-world money transfers (`cash`, `bank_transfer`, `pos`, `card`, `other`).
2. **Accounts Receivable Settlement**: Precise allocation of payment sums across one or more open debtor invoices (`issued` or `partially_paid`).
3. **Legal Proof of Payment**: Immediate, atomic generation of an immutable, sequentially numbered receipt document (`REC-000001`).
4. **Reversal & Auditability**: Tamper-proof lifecycle governance enabling audited voiding without physical record deletion or ledger corruption.

Payments & Receipts Foundation V1 delivers:
- **Standalone Payment Entity (`payments`)**: First-class financial inflow entity with tenant isolation, immutable payment method, client idempotency keys, and payment dates.
- **Tenant-Scoped Atomic Sequential Numbering**: High-concurrency generation of standardized payment identifiers (`PMT-000001`) and receipt numbers (`REC-000001`) via transactional row-level counter locking (`practice_payment_counters`, `practice_receipt_counters`).
- **Granular Multi-Invoice Payment Allocation (`payment_allocations`)**: Relational junction connecting payment funds to open invoices with pessimistic database row locking (`FOR UPDATE`), multi-currency mismatch prevention, cross-patient allocation rejection, and strict over-allocation prohibition (`allocation_amount <= invoice.balance_due`).
- **Automatic Receipt Issuance (`receipts`)**: Guaranteed 1:1 relationship with payments, instantly generated upon payment confirmation as a permanent legal and clinical accounting record.
- **Atomic Settlement & Voiding Stored Procedures**: `record_payment_and_allocate` and `void_payment` encapsulate all multi-table transactions in atomic PostgreSQL routines with security definer context and strict search paths.
- **Permanent Immutability & Zero Hard-Delete Enforcement**: Database triggers (`BEFORE DELETE`, `BEFORE UPDATE`) permanently forbid row deletion or modification of financial fields on confirmed payments, receipts, and allocations.
- **Strict Multi-Tenant Row-Level Security (RLS) & RBAC**: Tenant boundaries enforced on 100% of tables with role-based write protections (Owner, Practice Manager, Accountant, Receptionist for recording; Owner, Practice Manager, Accountant only for voiding; Physiotherapists strictly view-only).
- **PostgREST Relationship Disambiguation**: Conformance with Physenra's PostgREST explicit constraint hint standards across all payment and receipt relationships.

---

### 2. NON-NEGOTIABLE INDEPENDENCE & ISOLATION

Physenra is an entirely independent, standalone commercial physiotherapy SaaS platform. It has zero architectural, structural, or operational affiliation with any external product or legacy codebase.

#### Complete Isolation Verification:
- **Zero External Source Code**: Physenra contains no imported modules, components, utilities, or assets from external repositories.
- **Zero Database Links**: Physenra operates exclusively against its dedicated Supabase project (`xxknmdgneamtoahqayvl`). No external databases or migrations are referenced.
- **Zero Patient Data Contamination**: All test fixtures and test cases use synthetic clinical and financial data created natively within Physenra.
- **Zero Legacy Brand Naming**: Automated static analysis scans verify that zero prohibited product strings or legacy identifiers exist in source code, tests, or documentation.

---

### 3. DOMAIN SCOPE BOUNDARIES & EXPLICIT NON-GOALS

To maintain strict domain firewalls and architectural clarity, Payments & Receipts Foundation V1 adheres to rigid boundary constraints.

#### In-Scope Capabilities:
- Standalone payment ledger (`payments` table) with tenant-scoped sequential numbers (`PMT-000001`).
- Granular payment allocation junction (`payment_allocations` table) mapping payment amounts to open invoices.
- Immutable legal receipts (`receipts` table) with tenant-scoped sequential numbers (`REC-000001`).
- Practice-level sequential counter tracking (`practice_payment_counters`, `practice_receipt_counters`).
- Atomic settlement stored procedure (`record_payment_and_allocate`) enforcing idempotency, currency matching, patient matching, and balance due limits.
- Atomic voiding stored procedure (`void_payment`) reversing invoice paid amounts, restoring prior invoice status, and recording mandatory audit reasons.
- Database trigger immutability enforcement preventing post-confirmation mutation or hard deletion.
- Comprehensive audit event logging (`public.log_audit_event`) for `payment.recorded`, `payment.allocated`, `receipt.issued`, and `payment.voided`.
- Full UI suite: Payments Ledger with filter tabs and search, Record Payment page with multi-invoice allocation selector, Payment Detail page with allocations breakdown and void modal, Official Receipts Ledger, and printable Receipt Detail page with `@media print` styling.

#### Explicit Non-Goals (Strictly Prohibited & Excluded):
- **NO Packages or Memberships**: Zero multi-session pre-purchased package tracking, package credit models, or session decrement ledgers.
- **NO Patient Wallets**: Zero credit deposit accounts, customer balance ledgers, or wallet disbursement systems.
- **NO Insurance Claims / Third-Party Payer Adjudication**: Zero insurer portals, claim EDI formats, or claim tracking fields.
- **NO Credit Notes or Customer Cash Refunds**: Reversals are handled exclusively via the formal `void` status with audit trail reasons; credit note engines remain deferred.
- **NO External Payment Gateways**: Zero Stripe, Paystack, Flutterwave, or payment gateway webhooks.
- **NO Automated Clinical Billing**: Clinical encounter workflows remain decoupled from commercial settlement.

---

### 4. DATABASE ARCHITECTURE & SCHEMA SPECIFICATION

#### 4.1. Enums
- `public.payment_method`: `'cash'`, `'bank_transfer'`, `'pos'`, `'card'`, `'other'`
- `public.payment_status`: `'confirmed'`, `'voided'`
- `public.receipt_status`: `'issued'`, `'voided'`

#### 4.2. Relational Schema Summary
```
practices (id)
  │
  ├── practice_payment_counters (practice_id)
  ├── practice_receipt_counters (practice_id)
  │
  ├── payments (id, practice_id, payment_number, patient_id, ...)
  │     ├── payment_allocations (id, payment_id, invoice_id, patient_id, practice_id, amount)
  │     │     └── invoices (id, practice_id, patient_id, amount_paid, balance_due, status)
  │     │
  │     └── receipts (id, practice_id, receipt_number, payment_id, patient_id, ...)
```

#### 4.3. Primary Tables & Foreign Keys

1. **`practice_payment_counters`**:
   - `practice_id` UUID PRIMARY KEY REFERENCES `practices(id)` ON DELETE CASCADE
   - `last_number` INTEGER NOT NULL DEFAULT 0
   - Row-level locking counter ensuring gapless, atomic sequence generation.

2. **`practice_receipt_counters`**:
   - `practice_id` UUID PRIMARY KEY REFERENCES `practices(id)` ON DELETE CASCADE
   - `last_number` INTEGER NOT NULL DEFAULT 0
   - Row-level locking counter ensuring gapless, atomic sequence generation.

3. **`payments`**:
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `practice_id` UUID NOT NULL REFERENCES `practices(id)` ON DELETE CASCADE
   - `payment_number` VARCHAR(32) NOT NULL (Format: `PMT-XXXXXX`)
   - `patient_id` UUID NOT NULL REFERENCES `patients(id)` ON DELETE RESTRICT
   - `payment_date` DATE NOT NULL DEFAULT CURRENT_DATE
   - `amount` NUMERIC(12, 2) NOT NULL CHECK (`amount > 0.00`)
   - `currency` VARCHAR(3) NOT NULL DEFAULT 'NGN' CHECK (`currency ~ '^[A-Z]{3}$'`)
   - `payment_method` public.payment_method NOT NULL
   - `reference_number` VARCHAR(100) NULL
   - `idempotency_key` UUID NOT NULL
   - `status` public.payment_status NOT NULL DEFAULT 'confirmed'
   - `notes` TEXT NULL
   - `recorded_by` UUID NOT NULL REFERENCES `profiles(id)`
   - `confirmed_at` TIMESTAMPTZ NOT NULL DEFAULT now()
   - `voided_at` TIMESTAMPTZ NULL
   - `voided_by` UUID REFERENCES `profiles(id)`
   - `void_reason` TEXT NULL
   - Composite Foreign Keys:
     - `(practice_id, patient_id)` REFERENCES `patients(practice_id, id)`
   - Unique Constraints:
     - `UNIQUE (id, practice_id)`
     - `UNIQUE (practice_id, payment_number)`
     - `UNIQUE (practice_id, idempotency_key)`

4. **`receipts`**:
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `practice_id` UUID NOT NULL REFERENCES `practices(id)` ON DELETE CASCADE
   - `receipt_number` VARCHAR(32) NOT NULL (Format: `REC-XXXXXX`)
   - `payment_id` UUID NOT NULL REFERENCES `payments(id)` ON DELETE RESTRICT
   - `patient_id` UUID NOT NULL REFERENCES `patients(id)` ON DELETE RESTRICT
   - `issue_date` DATE NOT NULL DEFAULT CURRENT_DATE
   - `amount` NUMERIC(12, 2) NOT NULL CHECK (`amount > 0.00`)
   - `currency` VARCHAR(3) NOT NULL DEFAULT 'NGN' CHECK (`currency ~ '^[A-Z]{3}$'`)
   - `payment_method` public.payment_method NOT NULL
   - `reference_number` VARCHAR(100) NULL
   - `status` public.receipt_status NOT NULL DEFAULT 'issued'
   - `issued_by` UUID NOT NULL REFERENCES `profiles(id)`
   - `issued_at` TIMESTAMPTZ NOT NULL DEFAULT now()
   - `voided_at` TIMESTAMPTZ NULL
   - `voided_by` UUID REFERENCES `profiles(id)`
   - `void_reason` TEXT NULL
   - Composite Foreign Keys:
     - `(payment_id, practice_id)` REFERENCES `payments(id, practice_id)`
     - `(patient_id, practice_id)` REFERENCES `patients(id, practice_id)`
   - Unique Constraints:
     - `UNIQUE (id, practice_id)`
     - `UNIQUE (practice_id, receipt_number)`
     - `UNIQUE (payment_id)` (Strict 1:1 relation with payment)

5. **`payment_allocations`**:
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `practice_id` UUID NOT NULL REFERENCES `practices(id)` ON DELETE CASCADE
   - `payment_id` UUID NOT NULL REFERENCES `payments(id)` ON DELETE RESTRICT
   - `invoice_id` UUID NOT NULL REFERENCES `invoices(id)` ON DELETE RESTRICT
   - `patient_id` UUID NOT NULL REFERENCES `patients(id)` ON DELETE RESTRICT
   - `amount` NUMERIC(12, 2) NOT NULL CHECK (`amount > 0.00`)
   - `allocated_at` TIMESTAMPTZ NOT NULL DEFAULT now()
   - `allocated_by` UUID NOT NULL REFERENCES `profiles(id)`
   - Composite Foreign Keys:
     - `(payment_id, practice_id)` REFERENCES `payments(id, practice_id)`
     - `(invoice_id, practice_id)` REFERENCES `invoices(id, practice_id)`
     - `(patient_id, practice_id)` REFERENCES `patients(id, practice_id)`
   - Unique Constraints:
     - `UNIQUE (id, practice_id)`
     - `UNIQUE (payment_id, invoice_id)`

---

### 5. STORED PROCEDURES & ACCOUNTING INVARIANTS

#### 5.1. `record_payment_and_allocate`
```sql
public.record_payment_and_allocate(
    p_practice_id UUID,
    p_patient_id UUID,
    p_payment_date DATE,
    p_amount NUMERIC(12, 2),
    p_currency VARCHAR(3),
    p_payment_method public.payment_method,
    p_reference_number VARCHAR(100),
    p_idempotency_key UUID,
    p_notes TEXT,
    p_allocations JSONB
) RETURNS JSONB
```
**Invariants & Execution Guarantees:**
1. **Tenant Validation**: Verifies `p_practice_id = current_practice_id()`.
2. **RBAC Authorization**: Strictly checks that caller has role `practice_owner`, `practice_manager`, `accountant`, or `receptionist`. Physiotherapists are denied write access.
3. **Idempotency Check**: If `(p_practice_id, p_idempotency_key)` exists in `payments`, the function immediately short-circuits and returns existing payment and receipt data without duplicate execution.
4. **Exhaustive Allocation Matching**: The sum of `amount` in `p_allocations` must exactly equal `p_amount`. Zero unallocated funds permitted in V1.
5. **Row Locking**: Acquires pessimistic `FOR UPDATE` lock on each target invoice row in `invoices`.
6. **Integrity Checks on Target Invoices**:
   - `invoice.patient_id = p_patient_id` (Cross-patient allocation rejected).
   - `invoice.currency = p_currency` (Cross-currency allocation rejected).
   - `invoice.status IN ('issued', 'partially_paid')` (Allocations to draft or void invoices rejected).
   - `allocation_amount <= invoice.balance_due` (Over-allocation beyond remaining balance rejected).
7. **Atomic Balance Updates**:
   - `invoice.amount_paid := invoice.amount_paid + allocation_amount`
   - `invoice.balance_due := invoice.grand_total - invoice.amount_paid`
   - `invoice.status := CASE WHEN balance_due = 0 THEN 'paid' ELSE 'partially_paid' END`
8. **Receipt Auto-Generation**: Generates sequential receipt number via `generate_next_receipt_number(p_practice_id)` and inserts linked receipt in status `issued`.
9. **Audit Logging**: Emits `payment.recorded`, `payment.allocated`, and `receipt.issued` audit events via `public.log_audit_event`.

#### 5.2. `void_payment`
```sql
public.void_payment(
    p_practice_id UUID,
    p_payment_id UUID,
    p_void_reason TEXT
) RETURNS JSONB
```
**Invariants & Execution Guarantees:**
1. **Tenant Validation**: Verifies `p_practice_id = current_practice_id()`.
2. **Strict RBAC Authorization**: Only `practice_owner`, `practice_manager`, or `accountant` can void payments. Receptionists and physiotherapists are strictly forbidden.
3. **Mandatory Void Reason**: Requires a detailed explanation of at least 5 non-whitespace characters.
4. **Row Locking**: Locks target payment, all allocations, and all linked invoices `FOR UPDATE`.
5. **Reversal of Invoice Balances**:
   - `invoice.amount_paid := GREATEST(0.00, invoice.amount_paid - allocation.amount)`
   - `invoice.balance_due := invoice.grand_total - invoice.amount_paid`
   - `invoice.status := CASE WHEN invoice.amount_paid = 0 THEN 'issued' ELSE 'partially_paid' END`
6. **Status Transition**: Updates `payment.status := 'voided'` and `receipt.status := 'voided'`.
7. **Audit Logging**: Emits `payment.voided` audit event via `public.log_audit_event`.

---

### 6. APPLICATION SERVICES & POSTGREST DISAMBIGUATION

All queries in `paymentService.ts` and `receiptService.ts` use explicit PostgREST constraint hints to eliminate ambiguity with composite foreign keys:

- `patient:patients!fk_payments_patient_practice(...)`
- `allocations:payment_allocations!fk_allocations_payment_practice(...)`
- `invoice:invoices!fk_allocations_invoice_practice(...)`
- `receipt:receipts!fk_receipts_payment_practice(...)`
- `patient:patients!fk_receipts_patient_practice(...)`
- `payment:payments!fk_receipts_payment_practice(...)`
- `recorder:profiles!payments_recorded_by_fkey(...)`
- `voider:profiles!payments_voided_by_fkey(...)`
- `issuer:profiles!receipts_issued_by_fkey(...)`

---

### 7. VERIFICATION & TEST SUMMARY

The implementation has been verified through automated regression suites and live remote checks:

| Verification Suite | Test Count | Result | Key Evidence |
|---|---|---|---|
| `payments_receipts.test.cjs` | 37 tests | 37/37 PASS | Database schema, composite FKs, RLS, triggers, invariants, PostgREST hints, live REST queries |
| `app_foundation.test.cjs` | 8 tests | 8/8 PASS | Hygiene, zero legacy references, tenant resolution, RBAC rules |
| `billing_invoicing.test.cjs` | 33 tests | 33/33 PASS | Debtor billing invariants, pricing resolution, transition rules |
| `postgrest_relationships.test.cjs` | 28 tests | 28/28 PASS | Full-platform relationship disambiguation, unhinted query PGRST201 reproduction |
| Complete Platform Test Suite | 514 tests | **514/514 PASS** | 100% pass across all 17 clinical and commercial domain test files |
| Production Build (`npm run build`) | 1,722 modules | **SUCCESS (0 errors)** | `tsc && vite build` bundled cleanly in 5.22s |
| Route Accessibility Check | 18 routes | **18/18 HTTP 200 OK** | All clinical and commercial routes live on `http://localhost:3000` |
| Remote Supabase Table Count | 43 public tables | **43/43 (100%) RLS** | Verified on remote Supabase project `xxknmdgneamtoahqayvl` |
