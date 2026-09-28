# PHYSENRA — BILLING & INVOICING FOUNDATION V1
## Corrected Architecture Specification, Hardening Record, and Verification Evidence

---

### 1. ARCHITECTURAL PURPOSE & OVERVIEW

The **Billing & Invoicing Foundation V1** establishes the primary debtor accounting and commercial billing backbone for the Physenra Physiotherapy EMR & Practice Management Platform. It implements the approved Physenra billing architecture and financial integrity controls, providing the essential bridge converting clinical encounters, episodes of care, and service catalog fees into immutable, itemized financial instruments.

In physiotherapy and outpatient rehabilitation practices, debtor billing requires strict separation between:
1. **Clinical Provenance**: Originating patient encounters, episodes of care, and specific clinical visits.
2. **Authoritative Tariff Specifications**: Time-sensitive fee schedules and service definitions.
3. **Immutable Invoicing Instruments**: Issued accounts receivable records detailing exact billable tariffs frozen at the instant of transaction.
4. **Subsequent Settlement Mechanisms**: Payments, packages, insurance claims, and receipts (strictly deferred to future domains).

Billing & Invoicing V1 achieves this by providing:
- **Standalone Top-Level Invoices**: Invoices operate as first-class financial entities with multi-tenant isolation, independent issue/due dates, debtor references, and payment terms.
- **Tenant-Scoped Atomic Sequential Numbering**: High-concurrency generation of standardized, human-readable invoice identifiers (`INV-000001`) via transactional row-level counter locking (`practice_invoice_counters`).
- **Authoritative Fee Schedule Pricing & Snapshots**: Line items capture point-in-time financial values (`service_code_snapshot`, `service_name_snapshot`, `unit_price_snapshot`, `tax_rate_percent_snapshot`, `discount_amount`, `tax_amount`, `line_total`, `currency`) authoritatively resolved from active fee schedules and service catalog items. The client cannot bypass the fee schedule or submit arbitrary unit prices.
- **State Machine with Database-Enforced Immutability**: Transition rules governing `draft`, `issued`, `partially_paid`, `paid`, and `void` states. PostgreSQL triggers prevent any post-issuance modification or deletion of invoices and line items.
- **Strict Multi-Tenant Row-Level Security (RLS) & RBAC**: Comprehensive RLS policies enforcing tenant boundaries across all billing tables with role-based write protections (Owner, Practice Manager, Accountant, Receptionist) and view-only access for Physiotherapists.
- **PostgREST Relationship Disambiguation**: Full conformance with Physenra's PostgREST explicit constraint hint standards, eliminating embedding ambiguity.

---

### 2. NON-NEGOTIABLE INDEPENDENCE & ISOLATION

Physenra is an entirely independent, standalone physiotherapy SaaS platform. It has zero architectural, structural, or operational affiliation with any external product or legacy codebase.

#### Complete Isolation Verification:
- **Zero External Source Code**: Physenra contains no imported modules, components, utilities, or assets from external repositories.
- **Zero Database Links**: Physenra operates exclusively against its dedicated Supabase project (`xxknmdgneamtoahqayvl`). No external databases, connection strings, or migration files are referenced.
- **Zero Patient Data Contamination**: All test fixtures, mock data, and test cases use synthetic clinical data created natively within Physenra.
- **Zero Legacy Brand Naming**: Automated static analysis scans verify that zero prohibited product strings or legacy identifiers exist in source code, tests, or documentation.

---

### 3. DOMAIN SCOPE BOUNDARIES & EXPLICIT NON-GOALS

To maintain strict domain firewalls and architectural clarity, Billing & Invoicing Foundation V1 adheres to rigid boundary constraints.

#### In-Scope Capabilities:
- Debtor invoices (`invoices` table) with tenant-scoped sequential numbers (`INV-XXXXXX`).
- Itemized invoice line items (`invoice_lines` table) with authoritative pricing and immutable financial snapshots.
- Practice-level sequential counter tracking (`practice_invoice_counters` table).
- Authoritative pricing resolution from active Fee Schedules and Service Catalog.
- Optional clinical provenance links (Patient, Episode of Care, Clinical Visit).
- Standalone debtor invoicing (Patient-level invoicing without requiring an active clinical encounter).
- State machine transition rules (`draft` → `issued` → `void`).
- Database trigger immutability enforcement preventing post-issue mutation or line deletion.
- Comprehensive audit event logging (`public.log_audit_event`) for invoice creation, line addition, update, issuance, and voiding.
- Full UI suite: List with financial metrics, Create Invoice page with authoritative pricing, and printable Invoice Detail page.

#### Explicit Non-Goals (Strictly Prohibited & Excluded):
- **NO Payments or Receipts**: Zero payment tables, transaction logs, receipt numbering, or payment settlement ledgers.
- **NO Packages or Memberships**: Zero multi-session pre-purchased package tracking or package session decrement ledgers.
- **NO Patient Wallets**: Zero credit deposit accounts, balance ledgers, or wallet disbursement systems.
- **NO Insurance Claims / Third-Party Payer Adjudication**: Zero insurer portals, claim EDI formats, or claim tracking fields.
- **NO Credit Notes or Refunds**: Financial reversals are handled exclusively via the formal `void` status with audit trail reasons; credit note engines remain deferred.
- **NO External Payment Gateways**: Zero Stripe, Paystack, Flutterwave, or payment gateway webhooks.

---

### 4. DOMAIN POSITION IN COMMERCIAL FOUNDATION

Billing & Invoicing V1 sits at the confluence of the Clinical Continuum and the Commercial Foundation:

```
CLINICAL CONTINUUM:
Patient Registry (V1)
    │
    ├──> Episode of Care (V1)
    │        │
    │        ├──> Clinical Visit / SOAP (V1)
    │        │        │
    │        │        └──> [Optional Provenance]
    │        │                    │
    │        ▼                    ▼
COMMERCIAL FOUNDATION:     ┌──────────────┐
Service Catalog (V1) ───>  │  BILLING &   │
         │                 │  INVOICING   │ (V1 - Current Domain)
Fee Schedule (V1) ──────>  │  FOUNDATION  │
                           └──────────────┘
                                  │
FUTURE SETTLEMENT DOMAINS:        ▼
                           Payments & Receipts (Future)
                           Packages & Memberships (Future)
                           Patient Wallets (Future)
```

#### Prior Domain Linkages:
1. **Patient Registry**: Mandatory debtor reference (`patient_id`) ensuring every invoice is associated with a registered patient within the active tenant.
2. **Episode of Care**: Optional relational reference (`episode_id`) providing clinical episode attribution.
3. **Clinical Visit**: Optional relational reference (`clinical_visit_id`) allowing direct billing provenance from clinical encounters.
4. **Service Catalog**: Service definitions (`service_id`) supplying clinical service codes, names, categories, and standard durations.
5. **Fee Schedule**: Practice tariff overrides (`fee_schedule_id`) providing authoritative unit pricing, currency, taxability, and tax rates via `fee_schedule_items`.

---

### 5. DATA MODEL ARCHITECTURE

The Billing & Invoicing database foundation adds 3 core tables, 1 custom PostgreSQL enum, 1 SECURITY DEFINER counter function, and 4 integrity triggers.

#### Custom PostgreSQL Enum: `public.invoice_status`
```sql
CREATE TYPE public.invoice_status AS ENUM (
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'void'
);
```
*(Note: An earlier draft version included `cancelled`, which was identified during the post-implementation audit as an unnecessary state. It was removed cleanly across all database constraints, triggers, types, service logic, and frontend components).*

#### 1. Table: `public.practice_invoice_counters`
Maintains the atomic sequential invoice number counter per tenant.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `practice_id` | UUID | PRIMARY KEY, REFERENCES `practices(id)` ON DELETE CASCADE | Tenant identifier |
| `last_number` | INTEGER | NOT NULL DEFAULT 0, CHECK (`last_number >= 0`) | Sequential counter |
| `prefix` | VARCHAR(16) | NOT NULL DEFAULT 'INV-' | Identifier prefix |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Last counter increment |

#### 2. Table: `public.invoices`
Stores top-level financial invoice headers.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY DEFAULT `gen_random_uuid()` | Immutable unique identifier |
| `practice_id` | UUID | NOT NULL, REFERENCES `practices(id)` | Tenant identifier |
| `invoice_number` | VARCHAR(32) | NOT NULL | Sequential invoice code (`INV-XXXXXX`) |
| `patient_id` | UUID | NOT NULL | Debtor patient identifier |
| `episode_id` | UUID | NULL | Optional clinical episode link |
| `clinical_visit_id`| UUID | NULL | Optional originating clinical visit |
| `fee_schedule_id` | UUID | NULL | Optional applied fee schedule |
| `status` | `invoice_status` | NOT NULL DEFAULT `'draft'` | Lifecycle status |
| `issue_date` | DATE | NOT NULL DEFAULT CURRENT_DATE | Invoice date |
| `invoice_date` | DATE | GENERATED ALWAYS AS (`issue_date`) STORED | Stored alias column |
| `due_date` | DATE | NULL | Payment due date (CHECK: `due_date >= issue_date`) |
| `currency` | VARCHAR(3) | NOT NULL DEFAULT 'NGN' | ISO currency code |
| `subtotal` | NUMERIC(12,2) | NOT NULL DEFAULT 0.00, CHECK (`subtotal >= 0`) | Sum of line subtotals |
| `discount_total` | NUMERIC(12,2) | NOT NULL DEFAULT 0.00, CHECK (`discount_total >= 0`) | Sum of line discounts |
| `tax_total` | NUMERIC(12,2) | NOT NULL DEFAULT 0.00, CHECK (`tax_total >= 0`) | Sum of line taxes |
| `grand_total` | NUMERIC(12,2) | NOT NULL DEFAULT 0.00, CHECK (`grand_total >= 0`) | Final payable amount |
| `total_amount` | NUMERIC(12,2) | GENERATED ALWAYS AS (`grand_total`) STORED | Stored alias column |
| `amount_paid` | NUMERIC(12,2) | NOT NULL DEFAULT 0.00, CHECK (`amount_paid >= 0`) | Total settled to date |
| `balance_due` | NUMERIC(12,2) | NOT NULL DEFAULT 0.00, CHECK (`balance_due >= 0`) | Remaining unpaid balance |
| `notes` | TEXT | NULL | Notes visible to debtor |
| `terms` | TEXT | NULL | Payment terms and conditions |
| `issued_at` | TIMESTAMPTZ | NULL | Timestamp of issuance |
| `finalized_by` | UUID | NULL, REFERENCES `profiles(id)` | User who issued invoice |
| `voided_at` | TIMESTAMPTZ | NULL | Timestamp of voidance |
| `voided_by` | UUID | NULL, REFERENCES `profiles(id)` | User who voided invoice |
| `void_reason` | TEXT | NULL | Mandatory reason for voiding (min 5 chars) |
| `created_by` | UUID | NULL, REFERENCES `profiles(id)` | Creator profile |
| `updated_by` | UUID | NULL, REFERENCES `profiles(id)` | Last modifier profile |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Last update timestamp |

**Composite Multi-Tenant Foreign Keys**:
- `fk_invoices_patient_practice`: `(patient_id, practice_id) REFERENCES patients(id, practice_id)`
- `fk_invoices_episode_patient_practice`: `(episode_id, patient_id, practice_id) REFERENCES episodes_of_care(id, patient_id, practice_id)`
- `fk_invoices_visit_patient_practice`: `(clinical_visit_id, patient_id, practice_id) REFERENCES clinical_visits(id, patient_id, practice_id)`
- `fk_invoices_schedule_practice`: `(fee_schedule_id, practice_id) REFERENCES fee_schedules(id, practice_id)`

**Check Constraints**:
- `chk_invoices_totals_balance`: `CHECK (grand_total = (subtotal - discount_total + tax_total))`
- `chk_invoices_balance`: `CHECK (balance_due = grand_total - amount_paid)`
- `chk_invoices_void_reason`: `CHECK (status <> 'void' OR (void_reason IS NOT NULL AND length(trim(void_reason)) >= 5))`
- `chk_invoices_voided_at`: `CHECK (status <> 'void' OR voided_at IS NOT NULL)`
- `chk_invoices_issued_at`: `CHECK (status = 'draft' OR issued_at IS NOT NULL)`

#### 3. Table: `public.invoice_lines`
Stores itemized billable line items with authoritative snapshots.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY DEFAULT `gen_random_uuid()` | Immutable line identifier |
| `practice_id` | UUID | NOT NULL | Tenant identifier |
| `invoice_id` | UUID | NOT NULL | Parent invoice reference |
| `service_id` | UUID | NOT NULL | Mandatory reference to catalog service |
| `service_code_snapshot` | VARCHAR(64) | NOT NULL | Stamped service code from service catalog |
| `service_name_snapshot` | VARCHAR(255) | NOT NULL | Stamped service title from service catalog |
| `description` | VARCHAR(500) | NULL | Optional line description / note |
| `quantity` | NUMERIC(8,2) | NOT NULL DEFAULT 1.00, CHECK (`quantity > 0`) | Billable units |
| `unit_price_snapshot` | NUMERIC(12,2) | NOT NULL, CHECK (`unit_price_snapshot >= 0`) | Authoritative tariff price |
| `currency` | VARCHAR(3) | NOT NULL | Tariff currency matching invoice |
| `is_taxable` | BOOLEAN | NOT NULL DEFAULT false | Authoritative taxability flag |
| `tax_rate_percent_snapshot`| NUMERIC(5,2) | NOT NULL DEFAULT 0.00, CHECK (`tax_rate_percent_snapshot >= 0 AND tax_rate_percent_snapshot <= 100`) | Authoritative tax % |
| `tax_amount` | NUMERIC(12,2) | NOT NULL DEFAULT 0.00, CHECK (`tax_amount >= 0`) | Deterministic calculated tax |
| `discount_amount` | NUMERIC(12,2) | NOT NULL DEFAULT 0.00, CHECK (`discount_amount >= 0 AND discount_amount <= (quantity * unit_price_snapshot)`) | Bounded discount |
| `line_total` | NUMERIC(12,2) | NOT NULL, CHECK (`line_total >= 0`) | Deterministic calculated total |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Last update timestamp |

**Composite Multi-Tenant Foreign Keys**:
- `fk_invoice_lines_invoice_practice`: `(invoice_id, practice_id) REFERENCES invoices(id, practice_id) ON DELETE CASCADE`
- `fk_invoice_lines_service_practice`: `(service_id, practice_id) REFERENCES services(id, practice_id) ON DELETE RESTRICT`

---

### 6. AUTHORITATIVE PRICE RESOLUTION & IMMUTABLE SNAPSHOTS

In outpatient rehabilitation practices, prices change over time across fee schedule revisions. To protect financial integrity:

1. **Authoritative Resolution Path**:
   When an invoice line is inserted:
   - The invoice's `fee_schedule_id` is identified. If null, the practice's default active fee schedule (`is_default = true AND status = 'active'`) is resolved.
   - The database trigger queries `public.fee_schedule_items` for `(v_effective_fee_schedule_id, NEW.service_id)`.
   - If no active tariff exists for that service, the line insertion is rejected with a validation error. Custom manual uncatalogued lines and arbitrary client price overrides are rejected at both service and trigger levels.
   - The trigger authoritatively overwrites:
     - `NEW.service_code_snapshot := service.service_code`
     - `NEW.service_name_snapshot := service.name`
     - `NEW.unit_price_snapshot := fee_schedule_item.unit_price`
     - `NEW.currency := fee_schedule_item.currency`
     - `NEW.is_taxable := fee_schedule_item.is_taxable`
     - `NEW.tax_rate_percent_snapshot := fee_schedule_item.tax_rate_percent`
2. **Catalog Drift Immunity**:
   Once an invoice is issued, triggers lock the invoice and its lines. Future edits to services or fee schedules have zero effect on historical invoice lines.

---

### 7. MATHEMATICAL INTEGRITY & BALANCE INVARIANTS

All monetary figures use fixed-point arithmetic (`NUMERIC(12,2)`). Floating point representation is strictly prohibited.

1. **Line Total Formula**:
   $$\text{subtotal} = \text{round}(\text{quantity} \times \text{unit\_price\_snapshot}, 2)$$
   $$\text{discount} = \text{round}(\text{discount\_amount}, 2) \quad (\le \text{subtotal})$$
   $$\text{taxable\_amount} = \text{subtotal} - \text{discount}$$
   $$\text{tax\_amount} = \text{round}(\text{taxable\_amount} \times (\text{tax\_rate\_percent\_snapshot} / 100), 2)$$
   $$\text{line\_total} = \text{subtotal} - \text{discount} + \text{tax\_amount}$$

2. **Invoice Totals Invariant**:
   $$\text{grand\_total} = \text{subtotal} - \text{discount\_total} + \text{tax\_total}$$
   Enforced by check constraint `chk_invoices_totals_balance`.

3. **Outstanding Balance Invariant**:
   $$\text{balance\_due} = \text{grand\_total} - \text{amount\_paid}$$
   Enforced by check constraint `chk_invoices_balance`.

4. **Synchronized Header Trigger**:
   The `sync_invoice_totals()` trigger automatically recomputes `subtotal`, `discount_total`, `tax_total`, `grand_total`, and `balance_due` on the parent invoice whenever lines are inserted, updated, or removed on a draft invoice.

---

### 8. STATE MACHINE & LIFECYCLE TRANSITIONS

```
         ┌───────────────────┐
         │       DRAFT       │
         └─────────┬─────────┘
                   │
         [Issue]   │
         ┌─────────┴─────────┐
         ▼                   
┌──────────────────┐  
│      ISSUED      │  
└────────┬─────────┘  
         │
         ├── [Void with Reason] ──────> ┌────────────┐
         │                              │    VOID    │
         ├── [Partial Payment]* ──────> └────────────┘
         │   (Future Payments Domain)
         │
         └── [Full Payment]*
             (Future Payments Domain)
```
*\*Note: Transitions to partially_paid and paid are defined in the enum for forward compatibility, but triggers strictly reject client transitions to these states in Billing V1.*

#### Rules:
- **`draft`**: Editable state. Lines can be added, updated (quantity/discount), or removed. Invoices can be deleted before issuance. Can transition to `issued`.
- **`issued`**: Immutable accounts receivable instrument. Header financial fields, dates, debtor, and line items are locked. Can transition to `void`.
- **`void`**: Immutable terminal reversal. Requires a mandatory `void_reason` of at least 5 characters. Balance due is zeroed.
- **`partially_paid` / `paid`**: Strictly locked in Billing V1. Attempted transitions raise: `Status transition to % requires the Payments domain which is not implemented in Billing V1`.

---

### 9. IMMUTABILITY ARCHITECTURE & DATABASE TRIGGERS

1. **`protect_invoice_immutability`**:
   - Forbids altering `practice_id` or `invoice_number`.
   - Forbids editing `patient_id`, `issue_date`, `currency`, `subtotal`, `discount_total`, `tax_total`, `grand_total` on issued invoices.
   - Forbids reverting `issued` to `draft`.
   - Requires role in `['practice_owner', 'practice_manager', 'accountant']` to void an invoice.
   - Requires role in `['practice_owner', 'practice_manager', 'accountant', 'receptionist']` to issue an invoice.
   - Blocks direct transitions to `partially_paid` or `paid`.
2. **`protect_invoice_line_immutability`**:
   - Blocks line insertion, modification, or deletion once the parent invoice status is not `draft`.
   - Stretches fee schedule tariff checks and snapshot resolution on lines.
3. **`prevent_invoice_hard_delete`**:
   - Rejects hard `DELETE` on any invoice whose status is not `draft`.
4. **`sync_invoice_totals`**:
   - Recomputes parent invoice financial totals from line sums.

---

### 10. ROW-LEVEL SECURITY & ROLE-BASED ACCESS CONTROL

Row-Level Security is enabled on `practice_invoice_counters`, `invoices`, and `invoice_lines`.

#### RBAC Matrix:

| Capability | Owner | Practice Manager | Accountant | Receptionist | Physiotherapist | Patient |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| View Invoices & Lines | Yes | Yes | Yes | Yes | **Yes (View-Only)** | No |
| Create Draft Invoice | Yes | Yes | Yes | Yes | **No** | No |
| Add / Edit / Remove Lines | Yes | Yes | Yes | Yes | **No** | No |
| Issue Invoice | Yes | Yes | Yes | Yes | **No** | No |
| Void Issued Invoice | Yes | Yes | Yes | **No** | **No** | No |
| Delete Draft Invoice | Yes | Yes | Yes | Yes | **No** | No |

---

### 11. AUDIT LOGGING ARCHITECTURE

All significant billing events are recorded via `public.log_audit_event`:

| Action | Event Name | Metadata Captured |
|---|---|---|
| Invoice Created | `invoice.created` | `invoice_number`, `patient_id`, `episode_id`, `clinical_visit_id`, `status` |
| Invoice Updated | `invoice.updated` | `updated_fields` |
| Line Added | `invoice.line_added` | `line_id`, `service_code`, `quantity`, `line_total` |
| Line Updated | `invoice.line_updated` | `line_id`, `quantity`, `line_total` |
| Line Removed | `invoice.line_removed`| `line_id`, `service_code` |
| Invoice Issued | `invoice.issued` | `invoice_number`, `grand_total`, `balance_due`, `issued_at` |
| Invoice Voided | `invoice.voided` | `invoice_number`, `void_reason`, `voided_at` |
| Invoice Deleted | `invoice.deleted` | `invoice_number`, `patient_id` |

---

### 12. SECURITY REVIEW & DISCREPANCY AUDIT FINDINGS

During the corrective post-implementation audit, 8 targeted findings were identified, reviewed, and remediated:

#### Finding 1: Unauthorized `cancelled` Status
- **Severity**: High
- **Root Cause**: An unapproved `cancelled` status was included in the initial enum.
- **Remediation**: Removed `cancelled` from `public.invoice_status` enum, trigger conditions, service layer, UI pages, and tests. Draft invoices can be safely deleted; issued invoices are voided.
- **Verification**: Verified remote `pg_enum` contains exactly `['draft', 'issued', 'partially_paid', 'paid', 'void']`.

#### Finding 2: Client Arbitrary Price Injection
- **Severity**: Critical
- **Root Cause**: Service layer and UI allowed client-submitted `unit_price_snapshot` values and manual custom lines.
- **Remediation**: Trigger `protect_invoice_line_immutability()` now authoritatively resolves tariffs from `fee_schedule_items` and stamps `unit_price_snapshot`, ignoring client-submitted prices. UI table fields for unit price and tax are now read-only.
- **Verification**: Tested that line insertions fail if no fee schedule tariff exists, and unit price is stamped from the fee schedule.

#### Finding 3: Tax Rate Manipulation
- **Severity**: High
- **Root Cause**: UI allowed manual editing of tax rate and taxable status.
- **Remediation**: Tax configuration is derived authoritatively from `fee_schedule_items.is_taxable` and `fee_schedule_items.tax_rate_percent`. Database trigger derives `tax_amount` deterministically.
- **Verification**: Trigger recalculates tax on every insert/update; UI displays tax configuration as read-only.

#### Finding 4: Fallback to Non-Existent `standard_fee`
- **Severity**: High
- **Root Cause**: Service layer contained fallback logic referencing a non-existent `services.standard_fee` column, returning `0` if not in fee schedule.
- **Remediation**: Corrected architecture to strictly require an active tariff in `fee_schedule_items`. Missing tariffs now throw an explicit validation exception.
- **Verification**: `resolveServicePrice()` throws if no tariff exists; zero silent fallback.

#### Finding 5: Premature Payment Transitions
- **Severity**: Critical
- **Root Cause**: Trigger allowed client updates to transition an invoice to `partially_paid` or `paid`.
- **Remediation**: Added explicit trigger block: `IF NEW.status IN ('partially_paid', 'paid') THEN RAISE EXCEPTION '...requires the Payments domain...';`.
- **Verification**: Automated test verifies that updating status to `paid` or `partially_paid` is blocked.

#### Finding 6: Role Boundary Leak (Physiotherapist Mutation Access)
- **Severity**: High
- **Root Cause**: RLS insert and update policies on `invoices` and `invoice_lines` included `'physiotherapist'`.
- **Remediation**: Removed `physiotherapist` from insert, update, and delete policies. Physiotherapists have strictly view-only billing access (`SELECT`).
- **Verification**: RLS policy assertion verified that `physiotherapist` is excluded from insert and update policies.

#### Finding 7: Missing Grand Total Mathematical Check
- **Severity**: Medium
- **Root Cause**: Table lacked a check constraint enforcing `grand_total = (subtotal - discount_total + tax_total)`.
- **Remediation**: Added `CONSTRAINT chk_invoices_totals_balance CHECK (grand_total = (subtotal - discount_total + tax_total))` to `public.invoices`.
- **Verification**: Verified check constraint in database schema and test suite.

#### Finding 8: Unrestricted Line Deletion on Draft Invoices
- **Severity**: Low
- **Root Cause**: Add line modal in detail page had custom charge options.
- **Remediation**: Hardened detail page modal to enforce catalog selection and authoritative pricing.
- **Verification**: Verified clean build and interactive form tests.

---

### 13. AUTOMATED TEST SUITE & VERIFICATION EVIDENCE

- **Domain Test Suite** ([`tests/billing_invoicing.test.cjs`](file:///c:/project/physenra/tests/billing_invoicing.test.cjs)):
  **36 / 36 tests passing (100%)**
- **Full Platform Regression Suite** (`npm.cmd test`):
  **477 / 477 tests passing (100%) across all 14 test files**
  - Database Foundation: PASS
  - Application Foundation: PASS
  - Multi-Tenancy & Context: PASS
  - RBAC & Permissions: PASS
  - Patient Registry: PASS
  - Episodes of Care: PASS
  - Appointment & Scheduling: PASS
  - Clinical Visits: PASS
  - Clinical Notes / SOAP: PASS
  - Clinical Outcome Measures: PASS
  - Home Exercise Program (HEP): PASS
  - Treatment Plans & Clinical Goals: PASS
  - Milestone & Progress Reviews: PASS
  - Discharge Summaries: PASS
  - Fee Schedules & Service Catalog: PASS
  - PostgREST Relationship Ambiguity Regression: PASS (77/77 tests)
  - Billing & Invoicing Foundation: PASS (36/36 tests)
- **Production Build** (`npm.cmd run build`):
  Clean production build via `tsc && vite build` in 7.31s with 0 errors.
- **Live HTTP Endpoint Verification**:
  16 / 16 routes returned HTTP 200 OK.

---

### 14. GATE CLEARANCE DECLARATION

```
==================================================
FINAL GATE CLEARANCE:
BILLING & INVOICING FOUNDATION V1 — CLEARED
==================================================
```
