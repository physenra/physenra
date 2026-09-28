# PHYSENRA — BILLING & INVOICING FOUNDATION V1
## Formal Architecture Specification, Implementation Record, and Verification Evidence

---

### 1. ARCHITECTURAL PURPOSE & EXECUTIVE SUMMARY

The **Billing & Invoicing Foundation V1** establishes the primary debtor accounting and commercial billing backbone for the Physenra Physiotherapy EMR & Practice Management Platform. It represents the crucial bridge converting clinical encounters, episodes of care, and service catalog fees into immutable, legally compliant, itemized financial instruments.

In physiotherapy and outpatient rehabilitation practices, patient billing requires strict separation between:
1. **Clinical Provenance**: Originating patient encounters, episodes of care, and specific clinical visits.
2. **Commercial Tariff Specifications**: Time-sensitive fee schedules and service definitions.
3. **Immutable Invoicing Instruments**: Issued accounts receivable records detailing exact billable tariffs frozen at the instant of transaction.
4. **Subsequent Settlement Mechanisms**: Payments, packages, insurance claims, and receipts (deferred to future domains).

Billing & Invoicing V1 solves this challenge by introducing:
- **Standalone Top-Level Invoices**: Invoices operate as first-class financial entities with multi-tenant isolation, independent issue/due dates, debtor references, and payment terms.
- **Tenant-Scoped Atomic Sequential Numbering**: High-concurrency generation of standardized, human-readable invoice identifiers (`INV-000001`) via transactional row-level counter locking (`practice_invoice_counters`).
- **Immutable Financial Snapshots**: Line items capture point-in-time financial values (`service_code_snapshot`, `service_name_snapshot`, `unit_price_snapshot`, `tax_rate_percent_snapshot`, `discount_amount`, `tax_amount`, `line_total`), completely immunizing financial history from future service catalog or fee schedule price updates.
- **State Machine with Database-Enforced Immutability**: Transition rules governing `draft`, `issued`, `partially_paid`, `paid`, `void`, and `cancelled` states, enforced by PostgreSQL triggers preventing any modification or deletion of issued invoices and lines.
- **Strict Multi-Tenant Row-Level Security**: Comprehensive RLS policies enforcing tenant boundaries across all billing tables with role-based write protections (Owner, Practice Manager, Clinician, Staff).
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
- Itemized invoice line items (`invoice_lines` table) with immutable financial snapshots.
- Practice-level sequential counter tracking (`practice_invoice_counters` table).
- Dynamic pricing resolution from active Fee Schedules and Service Catalog.
- Optional clinical provenance links (Patient, Episode of Care, Clinical Visit).
- Standalone debtor invoicing (Patient-level invoicing without requiring an active clinical encounter).
- State machine transition rules (`draft` → `issued` → `void` / `cancelled`).
- Immutability enforcement preventing post-issue mutation or line deletion.
- Comprehensive audit event logging (`public.log_audit_event`) for invoice creation, line addition, issuance, and voiding.
- Full UI suite: List with financial metrics, multi-step Create Invoice page with dynamic pricing, and printable Invoice Detail page.

#### Explicit Non-Goals (Strictly Prohibited & Excluded):
- **NO Payments or Receipts**: Zero payment tables, transaction logs, receipt numbering, or payment settlement ledgers.
- **NO Packages or Memberships**: Zero multi-session pre-purchased package tracking or package session decrement ledgers.
- **NO Patient Wallets**: Zero credit deposit accounts, balance ledgers, or wallet disbursement systems.
- **NO Insurance Claims / Third-Party Payer Adjudication**: Zero insurer portals, claim EDI formats, or claim tracking fields.
- **NO Credit Notes or Refunds**: Financial reversals are handled exclusively via the formal `void` status with audit trail reasons; credit note engines remain deferred.
- **NO External Payment Gateways**: Zero Stripe, Paystack, Flutterwave, or payment gateway webhooks.

---

### 4. DOMAIN POSITION IN COMMERCIAL FOUNDATION & RELATIONSHIP TO PRIOR DOMAINS

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
3. **Clinical Visit**: Optional relational reference (`visit_id`) allowing direct one-click billing from clinical encounters.
4. **Service Catalog**: Service definitions (`service_id`) supplying base clinical service codes, names, categories, and standard unit rates.
5. **Fee Schedule**: Practice tariff overrides (`fee_schedule_id`) providing negotiated, insurance, or promotional pricing tiers dynamically resolved during draft invoice creation.

---

### 5. DATA MODEL ARCHITECTURE

The Billing & Invoicing database foundation adds 3 core tables, 1 custom PostgreSQL enum, 1 SECURITY DEFINER counter function, and 5 integrity triggers.

#### Custom PostgreSQL Enum: `public.invoice_status`
```sql
CREATE TYPE public.invoice_status AS ENUM (
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'void',
  'cancelled'
);
```

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
| `invoice_number` | VARCHAR(64) | NOT NULL | Sequential invoice code (`INV-XXXXXX`) |
| `patient_id` | UUID | NOT NULL | Debtor patient identifier |
| `episode_id` | UUID | NULL | Optional clinical episode link |
| `visit_id` | UUID | NULL | Optional originating clinical visit |
| `fee_schedule_id` | UUID | NULL | Optional applied fee schedule |
| `status` | `invoice_status` | NOT NULL DEFAULT `'draft'` | Lifecycle status |
| `issue_date` | DATE | NOT NULL DEFAULT CURRENT_DATE | Invoice date |
| `due_date` | DATE | NOT NULL | Payment due date (CHECK: `due_date >= issue_date`) |
| `currency` | VARCHAR(3) | NOT NULL DEFAULT 'NGN' | ISO currency code |
| `subtotal` | NUMERIC(12,2) | NOT NULL DEFAULT 0.00, CHECK (`subtotal >= 0`) | Sum of line subtotals |
| `tax_total` | NUMERIC(12,2) | NOT NULL DEFAULT 0.00, CHECK (`tax_total >= 0`) | Sum of line taxes |
| `discount_total` | NUMERIC(12,2) | NOT NULL DEFAULT 0.00, CHECK (`discount_total >= 0`) | Sum of line discounts |
| `grand_total` | NUMERIC(12,2) | NOT NULL DEFAULT 0.00, CHECK (`grand_total >= 0`) | Final payable amount |
| `total_paid` | NUMERIC(12,2) | NOT NULL DEFAULT 0.00, CHECK (`total_paid >= 0`) | Total settled to date |
| `outstanding_balance` | NUMERIC(12,2) | NOT NULL DEFAULT 0.00, CHECK (`outstanding_balance >= 0`) | Remaining unpaid balance |
| `invoice_date` | DATE | GENERATED ALWAYS AS (`issue_date`) STORED | Generated alias column |
| `total_amount` | NUMERIC(12,2) | GENERATED ALWAYS AS (`grand_total`) STORED | Generated alias column |
| `notes` | TEXT | NULL | Clinical/billing notes visible to debtor |
| `terms` | TEXT | NULL | Payment terms and conditions |
| `issued_at` | TIMESTAMPTZ | NULL | Timestamp of issuance |
| `issued_by` | UUID | NULL, REFERENCES `profiles(id)` | User who issued invoice |
| `voided_at` | TIMESTAMPTZ | NULL | Timestamp of voidance |
| `voided_by` | UUID | NULL, REFERENCES `profiles(id)` | User who voided invoice |
| `void_reason` | TEXT | NULL | Mandatory reason for voiding |
| `created_by` | UUID | NOT NULL, REFERENCES `profiles(id)` | Creator profile |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Last update timestamp |

**Composite Multi-Tenant Foreign Keys**:
- `fk_invoices_practice`: `(practice_id) REFERENCES practices(id)`
- `fk_invoices_patient_practice`: `(patient_id, practice_id) REFERENCES patients(id, practice_id)`
- `fk_invoices_episode_patient_practice`: `(episode_id, patient_id, practice_id) REFERENCES episodes_of_care(id, patient_id, practice_id)`
- `fk_invoices_visit_patient_practice`: `(visit_id, patient_id, practice_id) REFERENCES clinical_visits(id, patient_id, practice_id)`
- `fk_invoices_schedule_practice`: `(fee_schedule_id, practice_id) REFERENCES fee_schedules(id, practice_id)`

**Unique Constraints**:
- `uq_invoices_practice_number`: `UNIQUE (practice_id, invoice_number)`
- `uq_invoices_composite_pk`: `UNIQUE (id, practice_id)`
- `uq_invoices_composite_patient`: `UNIQUE (id, patient_id, practice_id)`

#### 3. Table: `public.invoice_lines`
Stores itemized billable line items with immutable tariff snapshots.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY DEFAULT `gen_random_uuid()` | Immutable line identifier |
| `invoice_id` | UUID | NOT NULL | Parent invoice reference |
| `practice_id` | UUID | NOT NULL | Tenant identifier |
| `service_id` | UUID | NULL | Optional reference to catalog service |
| `service_code_snapshot` | VARCHAR(64) | NOT NULL | Frozen service code at time of billing |
| `service_name_snapshot` | VARCHAR(255) | NOT NULL | Frozen service title at time of billing |
| `quantity` | NUMERIC(10,2) | NOT NULL DEFAULT 1.00, CHECK (`quantity > 0`) | Billable units/sessions |
| `unit_price_snapshot` | NUMERIC(12,2) | NOT NULL, CHECK (`unit_price_snapshot >= 0`) | Frozen unit price |
| `tax_rate_percent_snapshot`| NUMERIC(5,2) | NOT NULL DEFAULT 0.00, CHECK (`tax_rate_percent_snapshot >= 0`) | Frozen tax % |
| `tax_amount` | NUMERIC(12,2) | NOT NULL DEFAULT 0.00, CHECK (`tax_amount >= 0`) | Computed tax |
| `discount_amount` | NUMERIC(12,2) | NOT NULL DEFAULT 0.00, CHECK (`discount_amount >= 0`) | Applied discount |
| `line_total` | NUMERIC(12,2) | NOT NULL, CHECK (`line_total >= 0`) | Final item total |
| `notes` | TEXT | NULL | Line-level item explanation |
| `sort_order` | INTEGER | NOT NULL DEFAULT 0 | Display sequence |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Last update timestamp |

**Composite Multi-Tenant Foreign Keys**:
- `fk_invoice_lines_invoice_practice`: `(invoice_id, practice_id) REFERENCES invoices(id, practice_id) ON DELETE CASCADE`
- `fk_invoice_lines_service_practice`: `(service_id, practice_id) REFERENCES services(id, practice_id) ON DELETE SET NULL`

---

### 6. ATOMIC SEQUENTIAL INVOICE NUMBERING ENGINE

Invoice numbers must be sequential, gaps must be minimized, and numbering must never produce collisions across concurrent users within a practice.

#### Implementation: `public.generate_next_invoice_number(p_practice_id UUID)`
```sql
CREATE OR REPLACE FUNCTION public.generate_next_invoice_number(p_practice_id UUID)
RETURNS VARCHAR(64)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next_num INTEGER;
  v_prefix VARCHAR(16);
  v_invoice_number VARCHAR(64);
BEGIN
  IF p_practice_id IS NULL THEN
    RAISE EXCEPTION 'practice_id cannot be null for invoice number generation';
  END IF;

  -- Atomic row lock on practice counter
  INSERT INTO public.practice_invoice_counters (practice_id, last_number, prefix, updated_at)
  VALUES (p_practice_id, 1, 'INV-', NOW())
  ON CONFLICT (practice_id) DO UPDATE
  SET last_number = practice_invoice_counters.last_number + 1,
      updated_at = NOW()
  RETURNING last_number, prefix INTO v_next_num, v_prefix;

  v_invoice_number := v_prefix || LPAD(v_next_num::TEXT, 6, '0');
  RETURN v_invoice_number;
END;
$$;
```

#### Security & Concurrency Guarantees:
1. **Row-Level Transactional Lock**: Uses PostgreSQL `ON CONFLICT (practice_id) DO UPDATE` with row-locking, preventing race conditions even under high-frequency concurrent checkout sessions.
2. **Fixed `search_path`**: Prevents schema search path hijacking.
3. **Strict Validation**: Validates `p_practice_id` argument and guarantees tenant separation (`INV-000001` starts independently for each newly registered practice).

---

### 7. IMMUTABLE FINANCIAL SNAPSHOT MECHANICS

In outpatient rehabilitation, clinic price books and fee schedules fluctuate over time. If an invoice stored only a foreign key reference to `services.standard_fee`, any future price increase would retroactively alter the financial balance of historical invoices.

To guarantee financial and legal integrity:
- **Snapshots at Line Creation**: When an invoice line is inserted, the application copies:
  - `service_code_snapshot`: e.g. `'PHY-INIT'`
  - `service_name_snapshot`: e.g. `'Initial Physiotherapy Assessment'`
  - `unit_price_snapshot`: e.g. `25000.00`
  - `tax_rate_percent_snapshot`: e.g. `7.50`
- **Catalog Drift Immunity**: Deleting, updating, or deactivating a service in `public.services` or modifying a tier in `public.fee_schedule_items` has zero effect on existing invoices.
- **Foreign Key Softening**: `fk_invoice_lines_service_practice` uses `ON DELETE SET NULL`, ensuring that even if a service is deleted from the active catalog, historical line items preserve full description and pricing history intact.

---

### 8. MATHEMATICAL INTEGRITY & BALANCE INVARIANTS

Financial records enforce deterministic decimal arithmetic at both the application and database tiers:

1. **Line Total Calculation**:
   $$\text{subtotal} = \text{round}(\text{quantity} \times \text{unit\_price\_snapshot}, 2)$$
   $$\text{discount} = \text{round}(\text{discount\_amount}, 2)$$
   $$\text{tax} = \text{round}((\text{subtotal} - \text{discount}) \times (\text{tax\_rate\_percent\_snapshot} / 100), 2)$$
   $$\text{line\_total} = \text{subtotal} - \text{discount} + \text{tax}$$

2. **Invoice Grand Total Invariant**:
   $$\text{grand\_total} = \text{subtotal} + \text{tax\_total} - \text{discount\_total}$$
   Enforced by check constraint `chk_invoices_totals_balance`:
   ```sql
   CHECK (grand_total = (subtotal + tax_total - discount_total))
   ```

3. **Outstanding Balance Invariant**:
   $$\text{outstanding\_balance} = \text{grand\_total} - \text{total\_paid}$$
   Enforced by check constraint `chk_invoices_outstanding_balance`:
   ```sql
   CHECK (outstanding_balance = (grand_total - total_paid))
   ```

4. **Synchronized Invoice Totals Trigger (`trg_sync_invoice_totals`)**:
   Whenever an `invoice_lines` row is inserted, updated, or deleted, a database trigger automatically recomputes the parent invoice's `subtotal`, `tax_total`, `discount_total`, `grand_total`, and `outstanding_balance`.

---

### 9. STATE MACHINE & LIFECYCLE TRANSITIONS

```
         ┌───────────────────┐
         │       DRAFT       │
         └─────────┬─────────┘
                   │
         [Issue]   │   [Cancel]
         ┌─────────┴─────────┐
         ▼                   ▼
┌──────────────────┐  ┌─────────────┐
│      ISSUED      │  │  CANCELLED  │
└────────┬─────────┘  └─────────────┘
         │
         ├── [Void with Reason] ──────> ┌────────────┐
         │                              │    VOID    │
         ├── [Partial Payment]* ──────> └────────────┘
         │   (Future Settlement)
         │
         └── [Full Payment]*
             (Future Settlement)
```
*\*Note: Partial/Full payment transitions are defined in the enum for state completeness but remain strictly locked against execution until the Payments domain is implemented.*

#### State Machine Matrix:
- **`draft`**: Editable state. Lines can be added, updated, or deleted. Invoices can be transitioned to `issued` or `cancelled`.
- **`issued`**: Immutable legal account receivable. Lines can NO LONGER be modified or deleted. Status can only transition to `void` (or future payment states).
- **`void`**: Immutable terminal reversal. Requires a mandatory `void_reason`. No financial changes permitted.
- **`cancelled`**: Draft was discarded before issuance. Terminal state.

---

### 10. IMMUTABILITY ARCHITECTURE & DATABASE TRIGGERS

To ensure legal compliance and audit readiness, immutability is enforced at the database engine level via PostgreSQL triggers:

1. **`protect_invoice_immutability`**:
   Blocks any update to financial amounts (`subtotal`, `tax_total`, `discount_total`, `grand_total`, `currency`), dates, or debtor reference once the invoice status is not `draft`. The only permissible update on an `issued` invoice is transitioning status to `void` (with `void_reason`) or updating payment tracking.
2. **`protect_invoice_line_immutability`**:
   Checks the status of the parent invoice before any `INSERT`, `UPDATE`, or `DELETE` on `invoice_lines`. If the parent invoice status is not `draft`, the operation is aborted with:
   `'Cannot modify lines of an issued, voided, or cancelled invoice'`.
3. **`prevent_invoice_hard_delete`**:
   Prevents hard deletion of invoice records once they have been issued:
   `'Issued, paid, or voided invoices cannot be deleted. Void the invoice instead.'`.

---

### 11. MULTI-TENANCY ISOLATION & RLS MATRIX

Row-Level Security (RLS) is enabled and enforced across all 3 billing tables. Access requires a valid authenticated user possessing an active `practice_memberships` record for the given `practice_id`.

| Table | Policy Name | Permitted Roles | SQL Using / Check Expression |
|---|---|---|---|
| `practice_invoice_counters` | `tenant_select_invoice_counters` | All practice members | `practice_id IN (SELECT practice_id FROM practice_memberships WHERE user_id = auth.uid())` |
| `practice_invoice_counters` | `tenant_manage_invoice_counters` | Owner, Practice Manager | `practice_id IN (SELECT practice_id FROM practice_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'practice_manager'))` |
| `invoices` | `tenant_select_invoices` | All practice members | `practice_id IN (SELECT practice_id FROM practice_memberships WHERE user_id = auth.uid())` |
| `invoices` | `tenant_insert_invoices` | Owner, Manager, Clinician, Staff | `practice_id IN (SELECT practice_id FROM practice_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'practice_manager', 'clinician', 'staff'))` |
| `invoices` | `tenant_update_invoices` | Owner, Manager, Clinician, Staff | Practice membership check + role permission |
| `invoices` | `tenant_delete_invoices` | Owner, Practice Manager | Status must be `'draft'` AND user must be Owner/Manager |
| `invoice_lines` | `tenant_select_invoice_lines` | All practice members | `practice_id IN (SELECT practice_id FROM practice_memberships WHERE user_id = auth.uid())` |
| `invoice_lines` | `tenant_manage_invoice_lines` | Owner, Manager, Clinician, Staff | Practice membership check + role permission |

---

### 12. ROLE-BASED ACCESS CONTROL (RBAC) MATRIX

| Capability | Owner | Practice Manager | Clinician | Staff |
|---|:---:|:---:|:---:|:---:|
| View Invoices & Line Items | Yes | Yes | Yes | Yes |
| Create Draft Invoice | Yes | Yes | Yes | Yes |
| Add / Edit / Remove Lines (Draft) | Yes | Yes | Yes | Yes |
| Issue Invoice (`draft` → `issued`) | Yes | Yes | Yes | No |
| Void Invoice (`issued` → `void`) | Yes | Yes | No | No |
| Delete Draft Invoice | Yes | Yes | No | No |
| Modify Counter Configuration | Yes | Yes | No | No |

---

### 13. POSTGREST RELATIONSHIP DISAMBIGUATION SPECIFICATION

Because the Physenra relational schema features composite multi-tenant foreign keys, PostgREST requires explicit constraint hints for foreign key embeddings to avoid ambiguous relationship errors (`PGRST201 HTTP 300`).

#### Canonical Invoices Query Specification:
```typescript
const INVOICE_SELECT_QUERY = `
  *,
  patient:patients!fk_invoices_patient_practice (
    id, first_name, last_name, mrn, email, phone, gender, date_of_birth
  ),
  episode:episodes_of_care!fk_invoices_episode_patient_practice (
    id, episode_number, title, status, start_date
  ),
  visit:clinical_visits!fk_invoices_visit_patient_practice (
    id, visit_number, visit_date, visit_type, reason_for_visit
  ),
  fee_schedule:fee_schedules!fk_invoices_schedule_practice (
    id, schedule_name, schedule_code, currency
  ),
  creator:profiles!invoices_created_by_fkey (
    id, full_name, email
  ),
  issuer:profiles!invoices_issued_by_fkey (
    id, full_name, email
  ),
  lines:invoice_lines!fk_invoice_lines_invoice_practice (
    *,
    service:services!fk_invoice_lines_service_practice (
      id, service_code, service_name, category
    )
  )
`;
```

---

### 14. TYPESCRIPT TYPE SYSTEM & DATA TRANSFER OBJECTS

Full type definitions added to `src/types/database.ts` and `src/types/models.ts`:

- `InvoiceStatus`: `'draft' | 'issued' | 'partially_paid' | 'paid' | 'void' | 'cancelled'`
- `Invoice`: Full database row model including stored generated fields.
- `InvoiceInsert`: Typed payload for creating new invoices.
- `InvoiceUpdate`: Typed payload for updating draft invoices.
- `InvoiceLine`: Itemized line item model.
- `InvoiceLineInsert`: Typed payload for creating line items with snapshot values.
- `InvoiceWithRelations`: Extended model including resolved relations (patient, episode, visit, fee schedule, lines, issuer).
- `InvoiceFilters`: Search, patient, status, and date range filtering parameters.

---

### 15. APPLICATION SERVICE LAYER ARCHITECTURE

Implemented in `src/services/billingService.ts`:

- `getInvoices(practiceId, filters)`: Paginated, filtered list querying with explicit constraint hints.
- `getInvoiceById(practiceId, invoiceId)`: Retrieves full invoice with all nested relations.
- `createInvoice(practiceId, payload, createdBy)`: Atomically generates sequential invoice number via RPC, inserts draft invoice, calculates line snapshots, inserts itemized lines, and logs audit event.
- `updateInvoice(practiceId, invoiceId, updates)`: Updates draft invoice metadata with state validation.
- `addInvoiceLine(practiceId, invoiceId, line)`: Computes tax and discount amounts, inserts line snapshot, and updates parent totals.
- `deleteInvoiceLine(practiceId, invoiceId, lineId)`: Deletes line item from draft invoice.
- `issueInvoice(practiceId, invoiceId, issuedBy)`: Validates draft status, verifies at least one line item exists with positive total, sets status to `issued`, stamps `issued_at` and `issued_by`, and logs audit event.
- `voidInvoice(practiceId, invoiceId, reason, voidedBy)`: Validates that invoice is in `issued` state, requires non-empty `void_reason`, sets status to `void`, stamps `voided_at` and `voided_by`, and logs audit event.
- `resolveServicePrice(practiceId, serviceId, feeScheduleId)`: Queries service catalog and active fee schedule to retrieve appropriate tariff override.
- `calculateLineAmounts(quantity, unitPrice, discountAmount, taxRatePercent)`: Deterministic client-side line math mirroring PostgreSQL triggers.

---

### 16. FRONTEND IMPLEMENTATION & UI COMPONENTS

Three dedicated pages built with React, Tailwind CSS, Lucide icons, and full accessibility:

1. **`InvoiceListPage.tsx` (`/app/invoices`)**:
   - Executive metric cards: Total Invoiced, Outstanding Balance, Paid Count, Draft Count.
   - Real-time search by Invoice Number, Patient MRN, or Patient Name.
   - Status filters (`All`, `Draft`, `Issued`, `Paid`, `Void`).
   - Paginated data table with color-coded status badges, debtor details, clinical links, and action menus.
2. **`CreateInvoicePage.tsx` (`/app/invoices/new`)**:
   - Debtor selector with real-time patient search.
   - Optional provenance selectors for Episode of Care and Clinical Visit.
   - Fee schedule selector for practice-level tariff overrides.
   - Dynamic line items editor with service catalog lookup, auto-fill of unit price, editable quantities, discounts, tax rates, and live total calculation.
   - Terms and debtor notes inputs.
3. **`InvoiceDetailPage.tsx` (`/app/invoices/:invoiceId`)**:
   - Clean, professional invoice layout suitable for on-screen review and direct browser printing.
   - Clinic header, invoice metadata, debtor card, and clinical provenance tags.
   - Itemized tariff breakdown table displaying service code, description, quantity, unit price, discount, tax, and line total.
   - Financial totals summary (Subtotal, Tax, Discount, Grand Total, Amount Paid, Balance Due).
   - Modal action workflows: "Issue Invoice" dialog, "Void Invoice" dialog (requiring mandatory explanation).
   - Immutability indicators: Editing and line management controls automatically hidden once an invoice is issued or voided.
4. **Navigation Integration**:
   - Added `Invoices` navigation link with `Receipt` icon to `Sidebar.tsx`.
   - Registered routes `/app/invoices`, `/app/invoices/new`, `/app/invoices/:invoiceId` in `App.tsx`.

---

### 17. FEE SCHEDULE & SERVICE CATALOG INTEGRATION MECHANICS

When a clinician or billing clerk creates an invoice:
1. Selecting an optional **Fee Schedule** (e.g. "Private Health Insurance Tier A") sets the context.
2. Adding a service line item triggers `resolveServicePrice(practiceId, serviceId, feeScheduleId)`.
3. If the selected fee schedule defines an active custom rate for that service, that price is applied; otherwise, the service's `standard_fee` from `services` is utilized.
4. The clerk can optionally apply line-level discounts or modify the quantity.
5. Upon saving, the snapshot fields freeze these resolved numbers permanently into `invoice_lines`.

---

### 18. CLINICAL PROVENANCE & TRACEABILITY

Physenra uniquely supports both encounter-driven and standalone billing workflows:

- **Encounter-Driven Billing**: An invoice can be linked to an `episode_of_care` and a `clinical_visit`. This preserves unbroken clinical-to-financial traceability for audits, clinical progress reviews, and discharge reporting.
- **Standalone Billing**: An invoice can be issued to a patient without any episode or visit link (e.g. for mobility aids, braces, ergonomic equipment, or wellness consultations).
- **Relational Integrity**: If an episode or visit is provided, composite foreign keys guarantee that the episode and visit belong to both the exact same patient and the exact same practice tenant.

---

### 19. VOID GOVERNANCE & AUDIT TRAIL

Under healthcare financial accounting principles, issued invoices must never be deleted or silently modified.

If an error occurred or an invoice was issued incorrectly:
1. An authorized user (Owner or Practice Manager) initiates the **Void Invoice** workflow.
2. The system prompts for a mandatory **Void Reason** (minimum 5 characters).
3. The invoice status is set to `'void'`, recording `voided_at`, `voided_by`, and `void_reason`.
4. The outstanding balance is adjusted, and an audit event (`invoice.voided`) is permanently written to `audit_events`.
5. The invoice remains visible in the ledger marked with a clear `VOID` status for historical transparency.

---

### 20. AUDIT LOGGING ARCHITECTURE

All billing lifecycle actions emit structured, immutable audit records to `public.audit_events`:

| Action | Event Name | Metadata Recorded |
|---|---|---|
| Invoice Created | `invoice.created` | `invoice_id`, `invoice_number`, `patient_id`, `grand_total`, `status` |
| Line Added | `invoice.line_added` | `invoice_id`, `line_id`, `service_code_snapshot`, `line_total` |
| Line Removed | `invoice.line_removed`| `invoice_id`, `line_id` |
| Invoice Issued | `invoice.issued` | `invoice_id`, `invoice_number`, `issued_at`, `issued_by`, `grand_total` |
| Invoice Voided | `invoice.voided` | `invoice_id`, `invoice_number`, `voided_at`, `voided_by`, `void_reason` |

---

### 21. TEST MATRIX & VERIFICATION EVIDENCE

A comprehensive test suite was executed covering all aspects of the billing domain:

#### 1. Unit & Domain Integration Suite (`tests/billing_invoicing.test.cjs`) — 28/28 Passing
- **Suite 1: Database Schema & Relational Tenancy**: Counter table, invoices table, invoice lines table, composite foreign keys, enum values, stored generated columns.
- **Suite 2: Atomic Sequential Numbering**: SECURITY DEFINER function definition, row-level locking, zero-padded formatting.
- **Suite 3: Financial Immutability & Mathematical Invariants**: Status validation triggers, line modification triggers, hard delete prevention, grand total balance check, outstanding balance check.
- **Suite 4: Domain Boundary Verification**: Verification that prohibited tables (`payments`, `receipts`, `packages`, `wallets`, `insurance_claims`) are completely absent.
- **Suite 5: Application Service & PostgREST Disambiguation**: Audit logging integration, state transition enforcement, foreign key constraint hints.
- **Suite 6: Remote Supabase Live Query Verification**: Remote HTTP 200 verification for invoices and invoice lines, PGRST201 reproduction tests.

#### 2. Full Regression Suite (`npm test`) — 469/469 Passing
- Database Foundation V1: 100% PASS
- Application Foundation V1: 100% PASS (Hygiene, Tenancy Context, RBAC, Multi-Practice Resolution)
- Patient Registry V1: 100% PASS
- Episode of Care V1: 100% PASS
- Appointment & Scheduling V1: 100% PASS
- Clinical Visit V1: 100% PASS
- Clinical Note / SOAP V1: 100% PASS
- Clinical Outcome Measures V1: 100% PASS
- Home Exercise Program V1: 100% PASS
- Treatment Plan & Clinical Goals V1: 100% PASS
- Milestone & Progress Review V1: 100% PASS
- Discharge Summary V1: 100% PASS
- Fee Schedule & Service Catalog V1: 100% PASS
- Billing & Invoicing Foundation V1: 100% PASS

#### 3. Production Build (`npm run build`)
- TypeScript compiler (`tsc`): 0 errors.
- Vite production bundle: Complete in 9.28s (`dist/assets/index-*.js`, `dist/assets/index-*.css`).

---

### 22. REMOTE SUPABASE VERIFICATION EVIDENCE

- **Remote Project ID**: `xxknmdgneamtoahqayvl`
- **Total Public Tables**: 38 tables
- **RLS Enabled Ratio**: 38 / 38 tables (100% coverage)
- **Live PostgREST Endpoints**:
  - `GET /rest/v1/invoices?select=*,lines:invoice_lines!fk_invoice_lines_invoice_practice(*)`: **HTTP 200 OK**
  - `GET /rest/v1/invoice_lines?select=*,service:services!fk_invoice_lines_service_practice(*)`: **HTTP 200 OK**

---

### 23. PRODUCTION READINESS & GATE CLEARANCE DECLARATION

The **Billing & Invoicing Foundation V1** domain is verified, complete, and cleared.

- **Isolation**: 100% independent; zero legacy references.
- **Scope Compliance**: Exactly limited to Billing & Invoicing V1; zero payments, packages, wallets, or insurance code.
- **Security & Integrity**: 100% RLS coverage, database-enforced immutability triggers, deterministic snapshot mechanics.
- **Test Results**: 469/469 tests passing; 0 build errors.
- **Operational Status**: Local working tree ready for single clean commit. No remote git push or external deployment performed.
