# Physenra — Billing & Invoicing Architecture Discovery & Security Gate V1

**Document Version:** 1.0.0  
**Phase:** Architecture Discovery & Security Gate  
**Repository:** `C:\project\physenra`  
**Supabase Project:** `xxknmdgneamtoahqayvl`  
**Verified Baseline Commit:** `feaaee16ef40ee40f66d4c333ef3e42e9d7dbeba`  
**Current Git Branch:** `main`  
**Working Tree Status:** Clean  
**GitHub Status:** NOT PUSHED  
**Deployment Status:** NOT DEPLOYED  

---

## 1. CURRENT SYSTEM STATE

The Physenra platform is an independent, multi-tenant B2B SaaS Physiotherapy EMR and Practice Management system.
- Repository: `C:\project\physenra`
- Remote Database: Supabase project `xxknmdgneamtoahqayvl`
- Public Tables: 35 tables, 100% (35/35) protected by Row-Level Security (RLS)
- Automated Test Suite: 433 tests across 15 test suites, 100% pass rate (0 failures)
- TypeScript Compilation & Production Build: Passing cleanly (`tsc && vite build` exited with code 0)
- Local Development Server: Active on `http://localhost:3000` (all 14 core routes returning HTTP 200 OK)
- Legacy External System Isolation: 100% independent. Zero external code, database, migrations, patient data, credentials, or APIs are referenced or used.

---

## 2. CLEARED DOMAIN INVENTORY

All 14 preceding platform and clinical domains have been formally verified, tested, and cleared:

| # | Cleared Domain | Scope & Responsibility | Cleared Commit |
|---|---|---|---|
| 1 | Database Foundation V1 | Multi-tenant schema, platform auth, audit logging, tenancy helpers | `db05df0` |
| 2 | Application Foundation V1 | AppShell, Sidebar, auth guard, practice switching, ErrorBoundary | `db05df0` |
| 3 | Practice Context / Bootstrap | Tenant provisioning, active practice context, membership resolution | `db05df0` |
| 4 | Patient Registry V1 | Demographic identity, patient sequential codes (`PAT-000001`) | `db05df0` |
| 5 | Episode of Care V1 | Clinical episodes, conditions, sequential codes (`EP-000001`) | `db05df0` |
| 6 | Appointment & Scheduling V1 | Booking, calendar slots, appointment codes (`APT-000001`) | `db05df0` |
| 7 | Clinical Visit V1 | Clinical encounters, attendances, visit codes (`VIS-000001`) | `0c45450` |
| 8 | Clinical Note / SOAP V1 | Subjective, Objective, Assessment, Plan documentation | `d23266d` |
| 9 | Clinical Outcome Measures V1 | Standardized outcome metrics (VAS, DASH, Oswestry, LEFS) | `d23266d` |
| 10 | Home Exercise Program (HEP) V1 | Exercise prescription, dosage, tracking (`HEP-000001`) | `6bdf447` |
| 11 | Treatment Plan & Clinical Goals V1 | Rehabilitation continuum goals (`TP-000001`) | `6bdf447` |
| 12 | Milestone & Progress Review V1 | Formal clinical reassessments (`PR-000001`) | `d64ae75` |
| 13 | Discharge Summary Foundation V1 | Episode closure, functional discharge status (`DS-000001`) | `701e7f1` |
| 14 | Fee Schedule & Service Catalog V1 | Practice service catalog, effective-dated tariffs (`SRV-`, `FS-`) | `feaaee1` |

---

## 3. FEE SCHEDULE FOUNDATION STATUS

Fee Schedule & Service Catalog Foundation V1 established the authoritative commercial foundation:
- `public.services`: Practice-scoped service catalog with unique codes (`SRV-000001`), standardized durations, delivery modes (`clinic`, `home`, `telehealth`, `other`, `all`), and category classification.
- `public.fee_schedules`: Effective-dated validity windows (`effective_from`, `effective_to`), status machine (`draft` -> `active` -> `archived`), and partial unique index guaranteeing at most one default active schedule per practice.
- `public.fee_schedule_items`: Fixed-point monetary rates (`NUMERIC(12, 2)`), currency validation (ISO 4217), tax applicability, and composite multi-tenant foreign keys (`fk_fee_schedule_items_schedule_practice`, `fk_fee_schedule_items_service_practice`).
- **Historical Price Protection**: Trigger `protect_fee_schedule_immutability()` permanently locks archived fee schedules and prohibits altering past price records.

**Billing & Invoicing V1 directly consumes this foundation.**

---

## 4. BILLING DOMAIN BOUNDARY

Billing & Invoicing owns the **commercial demand for payment and itemized charge presentation**:
- It owns `invoices`, `invoice_lines`, and sequential invoice numbering (`practice_invoice_counters`).
- It defines the debtor (`patient_id`), clinical context (`episode_id`, `clinical_visit_id`), billing dates (`issue_date`, `due_date`), and computed financial balances (`subtotal`, `tax_total`, `discount_total`, `total_amount`, `amount_paid`, `balance_due`).

### Strict Boundary Distinctions:
- **SERVICE**: Codified professional physical therapy modality (owned by Service Catalog).
- **FEE**: Pre-configured standard rate within an effective date range (owned by Fee Schedule).
- **BILLABLE ITEM**: An instance of a service rendered or product supplied to a patient.
- **INVOICE**: An official, numbered, immutable financial record presented to a patient/payer requesting payment.
- **PAYMENT**: An exchange of legal tender that settles all or part of an invoice (owned by future Payment domain).
- **PACKAGE**: A bundle of pre-purchased service sessions (owned by future Package domain).
- **WALLET**: A store of customer funds held on deposit (owned by future Wallet domain).

Billing must **NOT**:
- Rewrite or mutate the Service Catalog.
- Become a payment transaction ledger or cash register.
- Manage credit balances, deposit accounts, or wallets.
- Manage session decrement ledgers or package usage.

---

## 5. BILLABLE EVENT ANALYSIS

### Can Clinical Events Automatically Create Invoices?
- **Appointment ≠ Service Rendered**: An appointment is a booking slot. A patient may cancel, fail to attend (no-show), or attend for an unpaid consultation under a warranty package.
- **Clinical Visit ≠ Automatically Billable**: A clinical visit documents the clinical attendance. Some visits are complimentary progress checks, while others involve multiple billable modalities (e.g. Assessment + Dry Needling + Electrotherapy).
- **Clinical Documentation Firewall**: Clinical notes, SOAP entries, HEP assignments, and outcome assessments must NEVER trigger silent financial side-effects.

### The Authoritative Billing Trigger:
In outpatient physical therapy, billable events originate through two legitimate operational paths:
1. **Clinical Encounter Provenance**: Upon completion of a Clinical Visit (`VIS-000001`), the clinician or billing clerk selects the billable catalog services rendered during that visit to compile an invoice draft. The invoice stores foreign keys to `patient_id`, `episode_id`, and `clinical_visit_id` for provenance.
2. **Direct Practice Charges**: Physical therapy supplies (e.g. resistance bands, lumbar rolls, kinesiology tape) or direct walk-in assessments billed directly to a patient without prior appointment scheduling.

---

## 6. INVOICE MODEL

### Schema: `public.invoices`
- `id` (UUID, Primary Key DEFAULT `gen_random_uuid()`)
- `practice_id` (UUID NOT NULL references `practices(id)`)
- `invoice_number` (TEXT NOT NULL, e.g. `INV-000001`, unique per practice)
- `patient_id` (UUID NOT NULL references `patients(id)`)
- `episode_id` (UUID NULL references `episodes_of_care(id)`)
- `clinical_visit_id` (UUID NULL references `clinical_visits(id)`)
- `fee_schedule_id` (UUID NULL references `fee_schedules(id)`)
- `issue_date` (DATE NOT NULL DEFAULT CURRENT_DATE)
- `due_date` (DATE NOT NULL DEFAULT CURRENT_DATE)
- `status` (`invoice_status` ENUM: `'draft'`, `'issued'`, `'partially_paid'`, `'paid'`, `'void'`, `'cancelled'`)
- `currency` (TEXT NOT NULL DEFAULT 'NGN' CHECK `~ '^[A-Z]{3}$'`)
- `subtotal` (`NUMERIC(12, 2)` NOT NULL DEFAULT 0.00 CHECK `>= 0`)
- `discount_total` (`NUMERIC(12, 2)` NOT NULL DEFAULT 0.00 CHECK `>= 0`)
- `tax_total` (`NUMERIC(12, 2)` NOT NULL DEFAULT 0.00 CHECK `>= 0`)
- `total_amount` (`NUMERIC(12, 2)` NOT NULL DEFAULT 0.00 CHECK `>= 0`)
- `amount_paid` (`NUMERIC(12, 2)` NOT NULL DEFAULT 0.00 CHECK `>= 0`)
- `balance_due` (`NUMERIC(12, 2)` NOT NULL DEFAULT 0.00 CHECK `>= 0`)
- `notes` (TEXT NULL)
- `terms` (TEXT NULL)
- `issued_at` (TIMESTAMPTZ NULL)
- `issued_by` (UUID NULL references `profiles(id)`)
- `voided_at` (TIMESTAMPTZ NULL)
- `voided_by` (UUID NULL references `profiles(id)`)
- `void_reason` (TEXT NULL)
- `created_by` / `updated_by` (UUID NULL references `profiles(id)`)
- `created_at` / `updated_at` (TIMESTAMPTZ NOT NULL DEFAULT `now()`)

### Constraints:
- `uq_invoices_practice_number`: UNIQUE (`practice_id`, `invoice_number`)
- `uq_invoices_id_practice`: UNIQUE (`id`, `practice_id`)
- `chk_invoices_balance`: CHECK (`balance_due = total_amount - amount_paid`)
- `chk_invoices_dates`: CHECK (`due_date >= issue_date`)

---

## 7. INVOICE LINE MODEL & FINANCIAL SNAPSHOTS

Invoice lines represent the itemized charges. Because catalog names, descriptions, and fee schedules evolve over time, **all financial and descriptive attributes must be permanently snapshot onto each line**.

### Schema: `public.invoice_lines`
- `id` (UUID, Primary Key DEFAULT `gen_random_uuid()`)
- `practice_id` (UUID NOT NULL)
- `invoice_id` (UUID NOT NULL)
- `service_id` (UUID NULL references `services(id)` ON DELETE SET NULL)
- `service_code_snapshot` (TEXT NOT NULL) — e.g. `SRV-000001`
- `service_name_snapshot` (TEXT NOT NULL) — e.g. "Initial Musculoskeletal Assessment"
- `description` (TEXT NULL)
- `quantity` (`NUMERIC(8, 2)` NOT NULL DEFAULT 1.00 CHECK `quantity > 0`)
- `unit_price_snapshot` (`NUMERIC(12, 2)` NOT NULL CHECK `unit_price_snapshot >= 0`)
- `currency` (TEXT NOT NULL CHECK `~ '^[A-Z]{3}$'`)
- `is_taxable` (BOOLEAN NOT NULL DEFAULT false)
- `tax_rate_percent_snapshot` (`NUMERIC(5, 2)` NOT NULL DEFAULT 0.00 CHECK `>= 0 AND <= 100`)
- `tax_amount` (`NUMERIC(12, 2)` NOT NULL DEFAULT 0.00 CHECK `>= 0`)
- `discount_amount` (`NUMERIC(12, 2)` NOT NULL DEFAULT 0.00 CHECK `>= 0`)
- `line_total` (`NUMERIC(12, 2)` NOT NULL CHECK `>= 0`)
- `clinical_visit_id` (UUID NULL, line-level provenance if billing multiple visits)
- `created_at` / `updated_at` (TIMESTAMPTZ NOT NULL DEFAULT `now()`)

### Composite Foreign Keys:
- `fk_invoice_lines_invoice_practice`: FOREIGN KEY (`invoice_id`, `practice_id`) REFERENCES `public.invoices(id`, `practice_id`) ON DELETE CASCADE (only allowed while draft)
- `fk_invoice_lines_service_practice`: FOREIGN KEY (`service_id`, `practice_id`) REFERENCES `public.services(id`, `practice_id`) ON DELETE SET NULL

---

## 8. BILLING LIFECYCLE & STATE MACHINE

```
               +--------------------------------------+
               |                                      |
               v                                      |
[ Draft ] ----------> [ Issued ] ----------> [ Partially Paid ] ----------> [ Paid ]
    |                     |                          |
    |                     |                          |
    v                     v                          v
[ Cancelled ]          [ Void ]                   [ Void ]
```

### State Definitions & Mutation Rules:
1. `'draft'`:
   - Invoice is under preparation.
   - Lines can be inserted, edited, re-ordered, or removed.
   - Subtotal, discounts, and taxes are recalculable.
   - May be transitioned to `'issued'` or `'cancelled'`.
2. `'issued'`:
   - Invoice is officially locked and rendered to the patient/payer.
   - **PERMANENT FINANCIAL LOCK**: Lines, prices, quantities, and totals can NEVER be modified.
   - Balance due becomes an active receivable.
   - May transition to `'partially_paid'`, `'paid'`, or `'void'`.
3. `'partially_paid'`:
   - Updated exclusively by downstream Payment entries.
   - `0 < amount_paid < total_amount`.
4. `'paid'`:
   - Updated exclusively by downstream Payment entries when `amount_paid == total_amount` (`balance_due == 0`).
5. `'void'`:
   - Official cancellation of an issued invoice.
   - Requires non-empty `void_reason`, `voided_at`, and `voided_by`.
   - Reverses receivable balance to 0 without deleting history.
6. `'cancelled'`:
   - Abandonment of a draft invoice before issuance.

---

## 9. HISTORICAL IMMUTABILITY & AUDIT LOCK

### Critical Accounting Rule:
Once an invoice transitions from `'draft'` to `'issued'`:
- Triggers strictly deny `UPDATE` or `DELETE` on all fields of `invoice_lines`.
- Triggers strictly deny altering `invoices.subtotal`, `tax_total`, `discount_total`, `total_amount`, `currency`, `patient_id`, `issue_date`, or `invoice_number`.
- The only permitted updates on issued invoices are:
  - Downstream payment balance adjustment (`amount_paid`, `balance_due`, `status`) executed via controlled payment procedures.
  - State transition to `'void'` accompanied by mandatory `void_reason`.

---

## 10. SERVICE & PRICE SNAPSHOT MODEL

To prevent future changes in the Service Catalog or Fee Schedules from altering historical records:
$$\text{Live Catalog / Fee Schedule} \xrightarrow[\text{Invoice Issue}]{\text{Snapshot Copy}} \text{Invoice Line Immutable Truth}$$

When an invoice line is added:
1. System pulls current price from active default fee schedule.
2. User may adjust rate if authorized by role (e.g. clinician override or special tariff).
3. System copies `service_code`, `service_name`, `unit_price`, and `tax_rate` directly into snapshot columns on `invoice_lines`.
4. If the service is renamed, recoded, or deactivated in the future, the invoice line remains 100% historically intact.

---

## 11. DISCOUNT ANALYSIS

In outpatient physical therapy, discounts arise from:
- Promotional offers (e.g. 10% off initial assessment during community wellness month).
- Senior / Student / Hardship concessions.
- Clinician discretionary fee waivers.

### Architecture Recommendation:
- Line-level discount: `discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00`.
- Invoice-level discount: aggregate sum of line discounts or optional general concession applied across the total.
- Fixed-point representation (`NUMERIC(12, 2)`).
- Prohibit standalone promotional coupon engines in V1. Keep discounts strictly explicit, role-authorized, and recorded as fixed amounts.

---

## 12. TAX ANALYSIS

- In most jurisdictions, essential healthcare and physical therapy services are exempt or zero-rated, while retail physical goods (braces, cold packs, taping supplies) are taxable.
- Each invoice line maintains:
  - `is_taxable BOOLEAN NOT NULL DEFAULT false`
  - `tax_rate_percent_snapshot NUMERIC(5, 2) NOT NULL DEFAULT 0.00`
  - `tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00`
- Invoice header aggregates `tax_total`.
- Complex multi-state, tax-exempt certificates, and automatic tax calculation engines are explicitly excluded from V1.

---

## 13. CURRENCY ARCHITECTURE

- An invoice must be denominated in **exactly one currency**.
- Multi-currency invoices (lines with mixed currencies) are strictly prohibited.
- Default currency matches practice fee schedule currency (`NGN`).
- Foreign currency conversion (FX rates, multi-currency ledgering) is deferred to future international billing phases.

---

## 14. PATIENT ACCOUNT ANALYSIS

### Does Billing Require a Dedicated `patient_accounts` Table?
- **Analysis**: In an outpatient physiotherapy clinic, all billing is scoped to `practice_id` + `patient_id`.
- Introducing a separate `patient_accounts` table in V1 adds an unnecessary layer of indirection and synchronization friction.
- The patient's financial ledger is reliably calculated dynamically from:
  $$\text{Account Balance} = \sum \text{invoices.balance\_due}$$
- **Verdict**: Defer `patient_accounts` table. Use direct `patient_id` foreign keys on `invoices`.

---

## 15. PAYMENT FIREWALL

$$\mathbf{Billing\ \&\ Invoicing} \quad \Big\Vert \quad \text{Payments (Future Domain)}$$

- Creating or issuing an invoice establishes **Accounts Receivable**.
- An invoice does NOT record the receipt of money.
- Future payments will reference `invoice_id` and decrement `invoices.balance_due` and increment `invoices.amount_paid`.
- Under NO circumstances will Billing V1 create cash ledger entries, receipt vouchers, or gateway charges.

---

## 16. PACKAGE DEPENDENCY

- Session Packages bundle treatments (e.g. "10-Session Spinal Rehabilitation Package").
- How packages depend on Billing:
  1. A Package is purchased **via an Invoice** (the package definition acts as a billable item on an invoice line).
  2. Once the invoice is paid (or deposit confirmed), a **Package Entitlement Ledger** is credited with sessions.
  3. Subsequent clinical visits redeem package sessions rather than generating new invoice lines.
- **Verdict**: Billing & Invoicing is a strict **prerequisite** for Packages. Packages cannot exist without Invoicing.

---

## 17. WALLET DEPENDENCY

- A Patient Wallet represents unallocated monetary credit deposited in advance.
- Wallets are downstream of Invoicing and Payments (a wallet deposit is paid into the clinic, and wallet balances may later be applied as payment against an invoice).
- **Verdict**: Wallet is NOT a prerequisite for Billing. Outpatient billing operates cleanly with direct invoice settlement without wallets.

---

## 18. CREDIT NOTES & REFUNDS

- **Post-Issuance Invoice Correction**:
  - In V1, an issued invoice with errors can be **Voided** with mandatory audit reason (`void_reason`) and re-created cleanly.
  - Partial adjustments or formal Credit Notes (`credit_notes`) belong to advanced commercial accounting and will be introduced when partial payments and refund mechanics are implemented.
- **Refunds**: Belong strictly to the Payment domain (returning received cash/transfer).

---

## 19. SECURITY THREAT MODEL

| Threat | Attack Vector | Security Control | Mitigation Layer |
|---|---|---|---|
| **Cross-Tenant Billing Access** | Altering `practice_id` in request payload to access other clinic invoices | Mandatory `practice_id = public.current_practice_id()` RLS filter | Database RLS |
| **Unauthorized Invoice Issuance** | Non-administrative staff issuing formal invoices | RLS checks `user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])` | Database RLS + API |
| **Historical Price Tampering** | Mutating prices on issued invoices to conceal fraud | DB trigger `protect_invoice_immutability()` denies line edits on issued invoices | PostgreSQL Trigger |
| **Silent Invoice Deletion** | Deleting issued or paid invoices to alter audit trail | DB trigger `prevent_invoice_hard_delete()` strictly denies DELETE on non-drafts | PostgreSQL Trigger |
| **Invoice Number Collision** | Concurrent requests generating duplicate invoice numbers | Atomic counter in `public.practice_invoice_counters` with row lock | PostgreSQL Function |
| **Floating-Point Rounding Drift** | Micro-cent theft or discrepancy via floating point math | Fixed-point `NUMERIC(12, 2)` monetary storage across all tables | Schema CHECK |
| **Client-Side Total Tampering** | Manipulating `subtotal` or `total_amount` in browser payload | DB trigger or server-side recalculation of `line_total = quantity * unit_price` | PostgreSQL Trigger |

---

## 20. ROLE-BASED ACCESS CONTROL (RBAC) REQUIREMENTS

| Role | Create Draft | Edit Draft | Issue Invoice | Void Invoice | Delete Draft | View Invoices |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `practice_owner` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `practice_manager` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `accountant` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `receptionist` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| `physiotherapist` | ✅ (draft only) | ❌ | ❌ | ❌ | ❌ | ✅ (clinical provenance) |
| `patient` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (Internal EMR) |
| `platform_admin` | ❌ | ❌ | ❌ | ❌ | ❌ | Audit view only |

---

## 21. AUDIT REQUIREMENTS

All commercial invoicing events must emit structured, immutable audit entries via `public.log_audit_event`:
- `invoice.created`: Draft invoice initialized with patient reference.
- `invoice.line_added`: Billable service tariff added to invoice line.
- `invoice.line_removed`: Line item removed from draft.
- `invoice.issued`: Formal legal issuance, freezing invoice totals and lines.
- `invoice.voided`: Issued invoice voided with recorded rationale.
- `invoice.cancelled`: Draft invoice discarded prior to issue.

---

## 22. MULTI-TENANCY & COMPOSITE KEYS

To prevent cross-tenant billing leakage and maintain relational integrity across composite tenant structures:
- `invoices.practice_id` must match `current_practice_id()`.
- Composite Foreign Keys:
  - `(patient_id, practice_id) REFERENCES patients(id, practice_id)`
  - `(episode_id, patient_id, practice_id) REFERENCES episodes_of_care(id, patient_id, practice_id)` (when present)
  - `(clinical_visit_id, patient_id, practice_id) REFERENCES clinical_visits(id, patient_id, practice_id)` (when present)
  - `(invoice_id, practice_id) REFERENCES invoices(id, practice_id)` (on `invoice_lines`)
  - `(service_id, practice_id) REFERENCES services(id, practice_id)` (on `invoice_lines`)

---

## 23. POSTGREST RELATIONSHIP SAFETY

Because `invoices` references `patients`, `episodes_of_care`, and `clinical_visits` (each sharing composite foreign keys), PostgREST queries will encounter `PGRST201 Multiple Relationship Ambiguity` unless explicit constraint hints are configured.

### Explicit Constraint Naming:
- `fk_invoices_patient_practice`
- `fk_invoices_episode_patient_practice`
- `fk_invoices_visit_patient_practice`
- `fk_invoice_lines_invoice_practice`
- `fk_invoice_lines_service_practice`

### Mandatory Query Pattern in Services:
```ts
supabase
  .from('invoices')
  .select(`
    *,
    patient:patients!fk_invoices_patient_practice (id, patient_identifier, first_name, last_name, phone, email),
    episode:episodes_of_care!fk_invoices_episode_patient_practice (id, episode_identifier, title),
    clinical_visit:clinical_visits!fk_invoices_visit_patient_practice (id, visit_identifier, actual_start),
    lines:invoice_lines!fk_invoice_lines_invoice_practice (
      *,
      service:services!fk_invoice_lines_service_practice (id, service_code, name, category)
    )
  `)
```

---

## 24. DOMAIN ARCHITECTURE OPTIONS EVALUATION

### Option A: Billing Attached Primarily to Appointment
- **Mechanism**: Invoices are generated as children of `appointments`.
- **Pros**: Direct integration with front desk calendar.
- **Cons**: Severe limitation. Walk-in billing, multi-service clinical visits, auxiliary physical therapy supplies, and session package purchases do not map cleanly to single appointments.
- **Architectural Fit**: Suboptimal.

### Option B: Billing Attached Primarily to Clinical Visit
- **Mechanism**: Invoices are generated exclusively as children of `clinical_visits`.
- **Pros**: Reflects actual clinical encounters.
- **Cons**: Cannot sell retail physical therapy equipment (braces, rolls), and cannot invoice for upfront packages before visits occur.
- **Architectural Fit**: Incomplete.

### Option C: Independent Billable Event Queue
- **Mechanism**: Clinical visits and appointments publish to an intermediate `billable_events` table; invoices consume from the queue.
- **Pros**: Highly decoupled event sourcing.
- **Cons**: Excessive complexity and maintenance overhead for outpatient clinics; two-stage confirmation causes user friction.
- **Architectural Fit**: Over-engineered for V1.

### Option D: Billing Attached Strictly to Service Delivery
- **Mechanism**: Invoices exist in pure commercial isolation without clinical foreign keys.
- **Pros**: Maximum commercial decoupling.
- **Cons**: Destroys clinical provenance needed for insurance claims, medical legal audits, and referral tracking.
- **Architectural Fit**: Deficient in clinical context.

### Option E: Hybrid Commercial Invoicing with Clinical Provenance (Recommended)
- **Mechanism**:
  - `invoices` is a standalone commercial entity owned by `practice_id`.
  - Maintains optional composite foreign keys to `patient_id`, `episode_id`, and `clinical_visit_id`.
  - `invoice_lines` snapshots catalog services and tariffs, while supporting manual descriptions.
  - Supports both visit-derived billing (e.g. billing an initial consultation after completion) and standalone billing (e.g. retail equipment, direct assessments).
- **Architectural Fit**: **Optimal.** Combines clean commercial independence with rich clinical provenance.

---

## 25. COMPLETE DEPENDENCY GRAPH

```
[ Service Catalog V1 ] (CLEARED)
        |
        v
[ Fee Schedule V1 ] (CLEARED)
        |
        v
+=======================================+
|   BILLING & INVOICING FOUNDATION V1   | <--- [ Clinical Visits (Provenance Only) ]
+=======================================+
        |
        +-----------------------------------+
        |                                   |
        v                                   v
[ Payment Ledger V1 ]             [ Session Packages V1 ]
(Downstream Settlement)           (Purchased via Invoice)
        |                                   |
        +-----------------+                 |
                          |                 |
                          v                 v
                 [ Patient Wallets ]   [ Clinical Visit Redemption ]
                 (Optional Deposit)    (Session Consumption)
```

---

## 26. CLINICAL INTEGRATION FIREWALL

- Clinical encounters, SOAP notes, HEP prescriptions, and Treatment Plans must NEVER automatically generate financial invoices without human or explicit configuration approval.
- An appointment cancellation or no-show must NOT mutate or create financial liabilities automatically.
- Clinical records are medical legal documents; invoices are commercial accounting documents. Their lifecycles must remain decoupled.

---

## 27. RECOMMENDED BILLING ARCHITECTURE

1. **Entity Foundation**:
   - `public.practice_invoice_counters` (Atomic numbering: `INV-000001`)
   - `public.invoices` (Header with status, dates, totals, balances, and optional clinical provenance)
   - `public.invoice_lines` (Itemized charges with immutable service and price snapshots)
2. **Pricing Engine**:
   - Auto-populates line rates from the practice's active default fee schedule.
   - Preserves snapshot copy on line insertion/issue.
3. **State Machine**:
   - `draft` (editable) -> `issued` (locked) -> `partially_paid` / `paid` / `void`.
4. **Immutability Protection**:
   - Database triggers enforce zero mutation of lines or financial totals on issued invoices.
   - Non-empty `void_reason` required for voiding. Zero hard deletes of issued records.
5. **UI Routes**:
   - `/app/invoices`: Invoice registry with status filters, date range, search.
   - `/app/invoices/new`: Invoice creator with patient search, fee schedule auto-pricing, and line items.
   - `/app/invoices/:invoiceId`: Detail invoice view, printable layout, issue/void controls.

---

## 28. SECURITY GATE REQUIREMENTS FOR IMPLEMENTATION

Prior to implementing Billing & Invoicing V1 in a subsequent authorized phase, the following prerequisites must be verified:
- [x] Fee Schedule & Service Catalog Foundation V1 cleared (`feaaee1`).
- [x] 433/433 tests passing.
- [x] Working tree clean.
- [x] Zero legacy external product references.
- [x] Complete threat model established.
- [x] Snapshot schema defined to guarantee historical immutability.
- [x] Explicit PostgREST constraint hints pre-planned.

---

## 29. FUTURE DOMAIN IMPLEMENTATION ORDER

The verified post-clinical commercial roadmap is:
1. **FEE SCHEDULE & SERVICE CATALOG FOUNDATION V1** — **CLEARED** (`feaaee1`)
2. **BILLING & INVOICING FOUNDATION V1** — **NEXT AUTHORIZED DOMAIN**
3. **PAYMENT & SETTLEMENT LEDGER V1** — Downstream (requires Invoicing)
4. **SESSION PACKAGES & BUNDLE LEDGER V1** — Downstream (requires Invoicing & Payments)
5. **PATIENT WALLET & DEPOSIT LEDGER V1** — Optional / Deferred (downstream of Payments)

---

## 30. DOMAIN FIREWALL & IMPLEMENTATION GATE

This discovery phase strictly enforces:
- **NO migrations created.**
- **NO tables altered.**
- **NO billing code written.**
- **NO frontend modifications made.**
- **NO tests for billing written.**
- **NO commits made.**
- **NO GitHub push or deployment executed.**

---

## FINAL GATE VERDICT

> **`BILLING & INVOICING ARCHITECTURE DISCOVERY — CLEARED`**

### Authorized Next Implementation Domain:
**`BILLING & INVOICING FOUNDATION V1`**

*(Awaiting explicit user authorization before initiating implementation.)*
