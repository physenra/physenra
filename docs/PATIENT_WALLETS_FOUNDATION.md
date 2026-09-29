# PHYSENRA PATIENT WALLETS FOUNDATION V1 — ARCHITECTURE & TECHNICAL SPECIFICATION

## 1. Executive Summary & Purpose
The **Patient Wallets Foundation V1** establishes an authoritative, audit-compliant, pre-funded patient credit account system for Physenra. Designed specifically for outpatient physiotherapy practices, Patient Wallets V1 enables clinics to receive advance deposits, retain unallocated overpayment credits, and execute frictionless invoice settlements with guaranteed mathematical integrity and immutable ledger accountability.

Physenra's commercial continuum is formally architected as:
$$\text{Service Catalog} \longrightarrow \text{Fee Schedule} \longrightarrow \text{Billing \& Invoicing} \longrightarrow \text{Payments \& Receipts} \longrightarrow \text{Packages V1} \longrightarrow \mathbf{Patient\ Wallets\ V1}$$

---

## 2. Core Architecture: Option E
Following the formal Architecture Discovery Gate, **Option E** was formally cleared and implemented:
$$\mathbf{Option\ E:\ Decoupled\ Wallet\ Account\ +\ Immutable\ Append-Only\ Ledger\ +\ Unified\ Invoice\ Settlement\ Allocation\ Bridge}$$

### Fundamental Architectural Principles:
1. **Mathematical Derived Balance (Zero Mutable Balance Column)**:
   - The account header table `patient_wallets` contains **zero mutable balance column**.
   - Balance is strictly and deterministically derived from the append-only ledger:
     $$\text{Available Credit Balance} = \sum_{e \in \text{ledger}} \text{amount}$$
   - This eliminates race conditions, ledger-column synchronization drift, and silent tampering.
2. **Strict Non-Negative Balance Invariant**:
   - At no point may any ledger debit or adjustment result in a negative wallet balance:
     $$\text{Balance} \ge 0.00$$
   - Enforced by database triggers, transaction locks, and stored procedure validations.
3. **Pessimistic Concurrency Safety**:
   - Every financial transaction holds an exclusive row lock on `patient_wallets` (`SELECT ... FOR UPDATE`) before calculating available balance or appending ledger rows, guaranteeing serialization under concurrent load.
4. **Single-Source Accounting & Unified Settlement Bridge**:
   - Settling an invoice with wallet credit routes through standard Billing & Invoicing invariants:
     - Atomically locks both `patient_wallets` and `invoices` headers `FOR UPDATE`.
     - Generates an authoritative internal payment record in `payments` (`payment_method = 'other'`, `reference_number = 'WALLET-' || wallet_number`).
     - Inserts a full `payment_allocations` entry linking the payment to the invoice.
     - Issues an official `receipts` voucher.
     - Appends a negative `invoice_settlement` ledger row to `patient_wallet_ledger`.
     - Updates invoice financial totals (`amount_paid` and `balance_due = grand_total - (amount_paid + amount)`).
5. **Advance Deposit Inflow Accounting**:
   - Receiving an advance deposit creates a confirmed `payments` record, an issued `receipts` voucher, and a positive `deposit` ledger entry. Payment inflow equals wallet credit.
6. **Overpayment Conversion**:
   - Unallocated surplus on existing confirmed payments can be converted into wallet credit via `convert_overpayment_to_wallet`, recording an `overpayment_conversion` ledger entry.

---

## 3. Database Schema & Relational Tenancy

All wallet entities enforce strict multi-tenancy with composite foreign keys anchored on `(id, practice_id)`.

### 3.1 Tables Overview
1. `public.practice_wallet_counters`:
   - Maintains atomic sequential numbering per practice.
   - Primary Key: `practice_id UUID REFERENCES public.practices(id) ON DELETE CASCADE`.
   - Columns: `last_number INTEGER NOT NULL DEFAULT 0`, `updated_at TIMESTAMPTZ`.
   - Constraints: `chk_practice_wallet_counters_last_number CHECK (last_number >= 0)`.

2. `public.patient_wallets`:
   - Account header representing the patient's store of value.
   - Primary Key: `id UUID DEFAULT gen_random_uuid()`.
   - Columns: `practice_id`, `wallet_number`, `patient_id`, `currency`, `status`, `closed_at`, `closed_by`, `closure_reason`, `created_by`, `created_at`, `updated_at`.
   - Invariant: **ZERO mutable balance column**.
   - Constraints:
     - `uq_patient_wallets_id_practice UNIQUE (id, practice_id)`
     - `uq_patient_wallets_practice_number UNIQUE (practice_id, wallet_number)`
     - `uq_patient_wallets_patient_currency UNIQUE (practice_id, patient_id, currency)` (one active wallet per patient per currency per practice)
     - `chk_patient_wallets_currency CHECK (currency ~ '^[A-Z]{3}$')`
     - `chk_patient_wallets_closure CHECK (status <> 'closed' OR (closed_at IS NOT NULL AND closed_by IS NOT NULL AND closure_reason IS NOT NULL AND length(trim(closure_reason)) >= 10))`
   - Composite Foreign Keys:
     - `fk_wallets_practice` $\rightarrow$ `practices(id)`
     - `fk_wallets_patient_practice` $\rightarrow$ `patients(id, practice_id) ON DELETE RESTRICT`
     - `fk_wallets_created_by` $\rightarrow$ `profiles(id)`
     - `fk_wallets_closed_by` $\rightarrow$ `profiles(id)`

3. `public.patient_wallet_ledger`:
   - Append-only immutable ledger recording every credit and debit event.
   - Primary Key: `id UUID DEFAULT gen_random_uuid()`.
   - Columns: `practice_id`, `wallet_id`, `patient_id`, `entry_type`, `amount`, `currency`, `source_payment_id`, `source_invoice_id`, `idempotency_key`, `notes`, `created_by`, `created_at`.
   - Constraints:
     - `uq_wallet_ledger_id_practice UNIQUE (id, practice_id)`
     - `uq_wallet_ledger_idempotency UNIQUE (practice_id, idempotency_key)`
     - `chk_wallet_ledger_amount_nonzero CHECK (amount <> 0.00)`
     - `chk_wallet_ledger_currency CHECK (currency ~ '^[A-Z]{3}$')`
     - `chk_wallet_ledger_sign CHECK ((entry_type IN ('deposit', 'overpayment_conversion', 'adjustment_credit', 'reversal_credit') AND amount > 0.00) OR (entry_type IN ('invoice_settlement', 'adjustment_debit', 'payment_void_reversal') AND amount < 0.00))`
   - Composite Foreign Keys:
     - `fk_ledger_practice` $\rightarrow$ `practices(id)`
     - `fk_ledger_wallet_practice` $\rightarrow$ `patient_wallets(id, practice_id) ON DELETE RESTRICT`
     - `fk_ledger_patient_practice` $\rightarrow$ `patients(id, practice_id) ON DELETE RESTRICT`
     - `fk_ledger_payment_practice` $\rightarrow$ `payments(id, practice_id) ON DELETE RESTRICT`
     - `fk_ledger_invoice_practice` $\rightarrow$ `invoices(id, practice_id) ON DELETE RESTRICT`
     - `fk_ledger_created_by` $\rightarrow$ `profiles(id)`

### 3.2 Controlled Lifecycle Enums
```sql
CREATE TYPE public.wallet_status AS ENUM (
    'active',
    'suspended',
    'closed'
);

CREATE TYPE public.wallet_ledger_entry_type AS ENUM (
    'deposit',
    'overpayment_conversion',
    'adjustment_credit',
    'reversal_credit',
    'invoice_settlement',
    'adjustment_debit',
    'payment_void_reversal'
);
```

---

## 4. Sequential Identifier Generator
- Function: `public.generate_next_wallet_number(p_practice_id UUID)`
- Format: `WLT-` prefix followed by 6 zero-padded digits (`WLT-000001`, `WLT-000002`).
- Security: `SECURITY DEFINER`, fixed `search_path = public, pg_temp`.
- Concurrency: Atomic upsert (`ON CONFLICT (practice_id) DO UPDATE SET last_number = last_number + 1`) preventing gaps and duplicate keys.
- RBAC: Executable only by authenticated administrative roles (`practice_owner`, `practice_manager`, `accountant`, `receptionist`).

---

## 5. Immutability, Lifecycle Triggers & Zero Hard-Delete Enforcement

1. **Zero Hard-Delete**:
   - `prevent_wallet_hard_delete` trigger attached to `practice_wallet_counters`, `patient_wallets`, and `patient_wallet_ledger`.
   - Blocks any SQL `DELETE` operation with an audit exception.

2. **Strict Append-Only Ledger Immutability**:
   - `protect_wallet_ledger_immutability` trigger attached `BEFORE UPDATE` on `patient_wallet_ledger`.
   - Rejects all update statements, ensuring financial ledger rows can never be altered.

3. **Account Header Immutability**:
   - `protect_patient_wallet_immutability` trigger protects core identification fields (`practice_id`, `wallet_number`, `patient_id`, `currency`, `created_by`).
   - Strictly prevents reopening a `closed` wallet:
     ```sql
     IF OLD.status = 'closed' AND NEW.status <> 'closed' THEN
         RAISE EXCEPTION 'Operation not permitted: Closed patient wallets cannot be reopened.';
     END IF;
     ```

---

## 6. Atomic Stored Procedures & Business Logic

1. `get_or_create_patient_wallet(p_practice_id, p_patient_id, p_currency)`:
   - Provisions a new wallet or retrieves the existing wallet for a patient and currency.
   - Derives and returns current available balance.

2. `deposit_to_wallet(p_practice_id, p_patient_id, p_amount, p_payment_method, p_reference_number, p_idempotency_key, p_notes)`:
   - Idempotently deposits funds into the patient's wallet.
   - Generates authoritative payment (`payments`) and receipt voucher (`receipts`).
   - Appends positive credit to ledger (`entry_type = 'deposit'`).

3. `convert_overpayment_to_wallet(p_practice_id, p_payment_id, p_amount, p_idempotency_key, p_notes)`:
   - Calculates available surplus on confirmed payment:
     $$\text{Surplus} = \text{payment.amount} - (\sum \text{allocations} + \sum \text{converted})$$
   - Validates $p\_amount \le \text{Surplus}$.
   - Appends positive credit to ledger (`entry_type = 'overpayment_conversion'`).

4. `settle_invoice_from_wallet(p_practice_id, p_wallet_id, p_invoice_id, p_amount, p_idempotency_key, p_notes)`:
   - Locks both wallet and invoice headers `FOR UPDATE`.
   - Enforces matching patient, matching currency, active wallet status, and $p\_amount \le \text{invoice.balance\_due}$.
   - Computes derived wallet balance and validates $p\_amount \le \text{balance}$.
   - Creates internal payment with method `'other'` and reference `'WALLET-' || wallet_number`.
   - Creates payment allocation linking payment to invoice.
   - Issues receipt voucher.
   - Appends negative debit to ledger (`entry_type = 'invoice_settlement'`).
   - Updates invoice:
     $$\text{amount\_paid} = \text{amount\_paid} + p\_amount$$
     $$\text{balance\_due} = \text{grand\_total} - (\text{amount\_paid} + p\_amount)$$

5. `adjust_wallet_balance(p_practice_id, p_wallet_id, p_amount, p_reason, p_idempotency_key)`:
   - Performs authorized manual balance adjustment (credit or debit).
   - Validates mandatory audit reason ($\ge 10$ characters).
   - Guarantees post-adjustment balance $\ge 0.00$.

6. `update_wallet_status(p_practice_id, p_wallet_id, p_status, p_reason)`:
   - Transitions wallet between `active`, `suspended`, and `closed`.
   - Enforces closure metadata (`closed_at`, `closed_by`, `closure_reason`).
7. `void_payment(p_practice_id, p_payment_id, p_void_reason)` (Hardened Integration):
   - Handles reversal of payments associated with patient wallets:
     - **Deposit / Overpayment conversion**: Checks that current wallet balance $\ge$ deposit amount. If funds were consumed, safely blocks voiding with explicit administrative intervention error. If intact, appends immutable `payment_void_reversal` (-amount).
     - **Invoice settlement payment**: Automatically restores patient's wallet balance by appending immutable `reversal_credit` (+amount).

8. `sync_wallet_restoration_on_invoice_void()` (Invoice Void Trigger):
   - Attached as `AFTER UPDATE OF status ON public.invoices FOR EACH ROW WHEN (NEW.status = 'void' AND OLD.status <> 'void')`.
   - Automatically detects any wallet settlements for the voided invoice and restores the unreversed settlement balance via an immutable `reversal_credit` (+amount) entry, while voiding the linked internal settlement payment and receipt.

---

## 7. PostgREST Relationship Disambiguation

All frontend queries and service calls explicitly specify foreign key constraint hints to eliminate `PGRST201` HTTP 300 relationship ambiguity:

| Query Path | Disambiguation Hint | Target Entity |
|---|---|---|
| `patient_wallets.patient` | `patient:patients!fk_wallets_patient_practice` | Account holder patient demographics |
| `patient_wallet_ledger.wallet` | `wallet:patient_wallets!fk_ledger_wallet_practice` | Parent wallet header |
| `patient_wallet_ledger.patient` | `patient:patients!fk_ledger_patient_practice` | Account holder patient |
| `patient_wallet_ledger.payment` | `payment:payments!fk_ledger_payment_practice` | Inflow payment transaction |
| `patient_wallet_ledger.invoice` | `invoice:invoices!fk_ledger_invoice_practice` | Settled accounts receivable invoice |
| `patient_wallet_ledger.creator` | `creator:profiles!fk_ledger_created_by` | Authoring staff profile |

---

## 8. Absolute Domain Firewalls & Scope Boundary Protection

Patient Wallets Foundation V1 strictly respects the commercial roadmap and isolates from unauthorized domains:

| Excluded Domain | Architectural Enforcement |
|---|---|
| **Recurring Memberships / Subscriptions** | ZERO membership plans, recurring billing schedules, or subscription tables. |
| **External Payment Gateways** | ZERO Stripe, Paystack, or Flutterwave dependencies, SDKs, or webhooks. |
| **External Cash/Bank Refunds** | ZERO cash payout or bank refund endpoints. Balance reversals must route via manual adjustment audit. |
| **Credit Notes** | ZERO credit note tables or accounts payable vouchers. |
| **Foreign Exchange (FX)** | ZERO cross-currency conversions. Wallets and invoices must strictly share matching ISO currency. |
| **Patient-to-Patient Transfers** | ZERO peer-to-peer wallet transfer functions or APIs. |
| **Clinical Documentation** | ZERO coupling between clinical care encounters (SOAP notes, outcome measures) and wallet balance. |
| **External Legacy Systems** | Strict physical and logical firewall. ZERO imports, migrations, credentials, APIs, or source references. |

---

## 9. Verification & Gate Clearance

- **Total Test Suites**: 19 test suites
- **Total Tests**: 601 tests passing (0 failures)
- **Wallets Test Suite (`tests/wallets.test.cjs`)**: 45 / 45 tests passing
- **Live Remote Supabase Verification**: HTTP 200 OK on all disambiguated live queries against project `xxknmdgneamtoahqayvl`.
- **Production Build (`npm.cmd run build`)**: 0 TypeScript errors, 0 Rollup errors.

