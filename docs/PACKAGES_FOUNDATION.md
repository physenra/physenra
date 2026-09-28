# PHYSENRA PACKAGES FOUNDATION V1 — ARCHITECTURE & TECHNICAL SPECIFICATION

## 1. Executive Summary & Purpose
The **Packages Foundation V1** establishes an authoritative, audit-compliant, multi-session treatment package system for Physenra. Designed specifically for outpatient physiotherapy practices, Packages V1 allows clinics to offer prepaid treatment bundles (e.g., "Post-Op Knee Rehab — 10 Sessions") with guaranteed financial integrity, decoupled quota management, and immutable clinical consumption tracking.

Physenra's commercial continuum is formally architected as:
$$\text{Service Catalog} \longrightarrow \text{Fee Schedule} \longrightarrow \text{Billing \& Invoicing} \longrightarrow \text{Payments \& Receipts} \longrightarrow \mathbf{Packages\ V1} \longrightarrow \text{Patient Wallets (Deferred)}$$

---

## 2. Core Architecture: Option C
Following the formal Architecture Discovery Gate, **Option C** was selected and implemented:
$$\mathbf{Option\ C:\ Invoiced\ Package\ Purchase\ +\ Decoupled\ Package\ Entitlement\ +\ Append-Only\ Consumption\ Ledger}$$

### Architecture Principles:
1. **Commercial Prepayment via Billing & Invoicing**:
   - A package is purchased strictly by issuing an authoritative debtor invoice via `invoices` and `invoice_lines`.
   - The invoice undergoes standard commercial settlement via `payments` and `payment_allocations`.
2. **Decoupled Quota Entitlement**:
   - Package quota is modeled in `package_entitlements`, decoupled from clinical visit workflow and clinical documentation.
   - Upon purchase, the entitlement is initialized in `pending_payment` status.
   - Activation occurs only when the linked invoice is fully settled (`invoice.status = 'paid'`, `balance_due = 0.00`, and `amount_paid = grand_total`).
3. **Append-Only Consumption Ledger**:
   - Clinical visit consumption is recorded in `package_consumption_ledger`.
   - The ledger is strictly append-only (no updates or deletes permitted).
   - Remaining session counts are derived deterministically:
     $$\text{Remaining Sessions} = \text{total\_sessions} - \text{COUNT}(\text{ledger entries})$$
   - No mutable counter columns exist on the entitlement table, eliminating race conditions and drift.
4. **Clinical Firewall**:
   - Clinical charting (encounters, SOAP notes, outcome measures, HEP, goals) remains completely unblocked regardless of package entitlement status.
   - Package consumption is a commercial settlement event attached to completed visits.

---

## 3. Database Schema & Relational Tenancy

All package entities enforce strict multi-tenancy with composite foreign keys anchored on `(id, practice_id)`.

### 3.1 Tables Overview
1. `public.practice_package_counters`:
   - Maintains atomic sequential numbering per practice.
   - Columns: `practice_id UUID PRIMARY KEY`, `last_number INTEGER`, `updated_at TIMESTAMPTZ`.
2. `public.package_definitions`:
   - Reusable catalog definitions of package offerings.
   - Columns: `id`, `practice_id`, `code`, `name`, `description`, `service_id`, `total_sessions`, `validity_days`, `package_price`, `currency`, `is_active`, `created_by`, `updated_by`, timestamps.
   - Constraints: `total_sessions > 0`, `validity_days > 0`, `package_price > 0.00`, `currency ~ '^[A-Z]{3}$'`.
   - Composite FK: `fk_package_definitions_service_practice` $\rightarrow$ `services(id, practice_id)`.
3. `public.package_entitlements`:
   - Patient-specific quota entitlements created upon package purchase.
   - Columns: `id`, `practice_id`, `package_number`, `patient_id`, `package_definition_id`, `invoice_id`, `total_sessions`, `validity_days`, `status`, `activated_at`, `expires_at`, `cancelled_at`, `cancelled_by`, `cancellation_reason`, `created_by`, timestamps.
   - Constraints: `uq_package_entitlements_practice_number`, `uq_package_entitlements_invoice`.
   - Composite FKs:
     - `fk_entitlements_patient_practice` $\rightarrow$ `patients(id, practice_id)`
     - `fk_entitlements_definition_practice` $\rightarrow$ `package_definitions(id, practice_id)`
     - `fk_entitlements_invoice_practice` $\rightarrow$ `invoices(id, practice_id)`
4. `public.package_consumption_ledger`:
   - Append-only ledger recording each session consumed by a clinical visit.
   - Columns: `id`, `practice_id`, `entitlement_id`, `clinical_visit_id`, `patient_id`, `consumed_at`, `consumed_by`, `notes`, `created_at`.
   - Constraints: `uq_consumption_id_practice`, `uq_consumption_entitlement_visit` (ensures a clinical visit consumes at most one session per entitlement).
   - Composite FKs:
     - `fk_consumption_entitlement_practice` $\rightarrow$ `package_entitlements(id, practice_id)`
     - `fk_consumption_patient_practice` $\rightarrow$ `patients(id, practice_id)`
     - `fk_consumption_visit_patient_practice` $\rightarrow$ `clinical_visits(id, patient_id, practice_id)`

### 3.2 Controlled Lifecycle Enum: `package_status`
```sql
CREATE TYPE public.package_status AS ENUM (
    'pending_payment',
    'active',
    'completed',
    'expired',
    'cancelled',
    'suspended',
    'void'
);
```

---

## 4. Sequential Identifier Generator
- Function: `public.generate_next_package_number(p_practice_id UUID)`
- Format: `PKG-` prefix followed by 6 zero-padded digits (`PKG-000001`, `PKG-000002`).
- Security: `SECURITY DEFINER`, fixed `search_path = public, pg_temp`.
- Concurrency: Atomic upsert (`ON CONFLICT (practice_id) DO UPDATE SET last_number = last_number + 1`) preventing gaps and duplicate keys.
- RBAC: Executable only by authenticated administrative roles (`practice_owner`, `practice_manager`, `accountant`, `receptionist`).

---

## 5. Atomic Stored Procedures & Business Logic

### 5.1 `purchase_package`
- Atomically creates an authoritative debtor invoice in `invoices` with itemized `invoice_lines`, and an associated `package_entitlements` record.
- Sets initial status to `'pending_payment'`.
- Validates active definition, active service, matching practice context, and active patient.

### 5.2 `activate_package`
- Enforces strict commercial settlement preconditions:
  - `invoice.status = 'paid'`
  - `invoice.balance_due = 0.00`
  - `invoice.amount_paid = invoice.grand_total`
- Transitions entitlement status from `pending_payment` or `suspended` to `'active'`.
- Computes validity expiration:
  $$\text{expires\_at} = \text{now()} + (\text{validity\_days} \parallel \text{' days'})::\text{INTERVAL}$$

### 5.3 `consume_package_session`
- Acquires row lock on entitlement via `SELECT ... FOR UPDATE` to prevent concurrency races.
- Validates:
  1. Clinical visit status is `'completed'`.
  2. Visit patient matches package entitlement patient.
  3. Package status is `'active'`.
  4. Current timestamp $\le$ `expires_at`.
  5. Derived remaining sessions $> 0$.
- Appends consumption row into `package_consumption_ledger`.
- If newly remaining sessions reaches 0, atomically marks entitlement as `'completed'`.
- Logs structured audit event `package.session_consumed`.

### 5.4 `extend_package_validity`
- Permits practice owners/managers to extend package expiration for valid non-terminal packages.
- Requires future timestamp and mandatory justification reason ($\ge 5$ characters).
- Automatically reactivates an expired package if remaining sessions exist.
- Logs structured audit event `package.extended`.

### 5.5 `cancel_package`
- Forfeits unconsumed package balance upon administrative instruction.
- Restricted to practice owners/managers.
- Forbids cancellation of already terminal packages (`completed`, `cancelled`, `void`).
- Records mandatory cancellation reason, caller profile ID, and timestamp.
- Logs structured audit event `package.cancelled`.

---

## 6. Immutability & Lifecycle Triggers
1. **Zero Hard Delete (`prevent_package_hard_delete`)**:
   - Attached `BEFORE DELETE` to `package_definitions`, `package_entitlements`, and `package_consumption_ledger`.
   - Throws exception on any DELETE attempt.
2. **Append-Only Consumption (`protect_package_consumption_immutability`)**:
   - Attached `BEFORE UPDATE` to `package_consumption_ledger`.
   - Throws exception on any UPDATE attempt.
3. **Entitlement State Protection (`protect_package_entitlement_immutability`)**:
   - Guards core identity fields (`practice_id`, `package_number`, `patient_id`, `package_definition_id`, `invoice_id`, `total_sessions`, `validity_days`).
   - Prevents reopening of terminal states (`completed`, `cancelled`, `void`).
4. **Reactive Settlement Synchronization (`sync_package_entitlement_on_invoice_change`)**:
   - Attached `AFTER UPDATE` on `invoices`.
   - Automatically activates entitlement when linked invoice transitions to `'paid'`.
   - Automatically suspends entitlement if payment is voided and invoice reverts to `'issued'` or `'partially_paid'`.
   - Automatically voids entitlement if linked invoice is marked `'void'`.

---

## 7. Derived Balance Mechanics
No mutable `remaining_sessions` or `used_sessions` columns exist on `package_entitlements`.
Instead, balances are computed dynamically:
$$\text{Consumed Sessions} = \text{COUNT}(\text{package\_consumption\_ledger}\ \text{rows for entitlement})$$
$$\text{Remaining Sessions} = \max(0,\ \text{total\_sessions} - \text{Consumed Sessions})$$
This guarantees mathematical consistency under concurrent operations and eliminates database drift.

---

## 8. Role-Based Access Control (RBAC) Matrix

| Operation | Owner | Manager | Accountant | Receptionist | Physiotherapist |
| :--- | :---: | :---: | :---: | :---: | :---: |
| View Package Catalog | Yes | Yes | Yes | Yes | Yes |
| Manage Catalog Offerings | Yes | Yes | No | No | No |
| Purchase Package (Issue Invoice) | Yes | Yes | Yes | Yes | No |
| Activate Package | Yes | Yes | Yes | Yes | No |
| View Entitlements & Balances | Yes | Yes | Yes | Yes | Yes |
| Settle Visit via Package | Yes | Yes | Yes | Yes | Yes |
| Extend Package Validity | Yes | Yes | No | No | No |
| Cancel Package | Yes | Yes | No | No | No |

---

## 9. Non-Negotiable Scope Boundaries & Isolation
The following features are strictly deferred and prohibited in V1:
- **Zero Recurring Memberships / Subscriptions**: Deferred until recurring payment gateway integrations.
- **Zero Patient Wallets / Cash Balances**: Deferred to future wallet discovery gate.
- **Zero Payment Gateways / Webhooks**: No Stripe, Paystack, or Flutterwave dependencies in V1.
- **Zero Credit Notes / Cash Refunds**: Handled strictly via invoice voiding in V1.
- **Zero Patient-to-Patient Package Transfers**: Packages are strictly bound to a single patient.
- **Zero Legacy System Contact**: 100% physically isolated from external legacy systems.
