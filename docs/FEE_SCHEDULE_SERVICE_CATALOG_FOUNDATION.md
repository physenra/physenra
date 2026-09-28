# Physenra — Fee Schedule & Service Catalog Foundation V1 Specification

**Document Version:** 1.0.0  
**Domain Phase:** Commercial Foundation V1 (First Commercial Domain)  
**Repository:** `C:\project\physenra`  
**Remote Supabase Project:** `xxknmdgneamtoahqayvl`  
**Prerequisite State:** Clinical Rehabilitation Continuum Cleared (`701e7f1c298d3e56c73addabac6d598ffd2a5233`)  
**Authorized Next Domain:** Fee Schedule & Service Catalog Foundation V1  

---

## 1. PURPOSE

The purpose of this domain is to establish the authoritative practice-scoped **Service Catalog** and **Fee Schedule** infrastructure for the Physenra Physiotherapy EMR & Practice Management SaaS Platform.

In an outpatient physiotherapy practice, clinical documentation and commercial operations represent distinct concerns with strict separation:
- Clinical encounters document functional assessment, diagnosis, SOAP notes, outcome measures, exercise programs, and treatment plans.
- Commercial operations codify what professional services the practice offers (e.g. Initial Assessment, Manual Therapy, Shockwave Therapy, Home Rehabilitation Visit) and the effective tariff/fee charged for each service over specific date ranges.

Before any future billing, invoicing, payments, session packages, or patient ledgers can exist, the platform must know **what services exist** and **how much they cost** without destroying historical price accuracy.

---

## 2. DOMAIN BOUNDARY & NON-NEGOTIABLE FIREWALL

Fee Schedule & Service Catalog Foundation V1 strictly encompasses:
1. **Practice Service Catalog** (`public.services`, `public.practice_service_counters`)
2. **Practice Fee Schedules** (`public.fee_schedules`, `public.practice_fee_schedule_counters`)
3. **Fee Schedule Items** (`public.fee_schedule_items`)
4. **Historical Price Preservation** (effective dating, price immutability, zero destructive overwrites)
5. **Multi-Tenancy & RBAC** (practice isolation, owner/manager/accountant configuration, clinical read-only)

### Strictly PROHIBITED Domains (Zero Placeholders / Zero Tables):
- ❌ Invoicing & Billing (`invoices`, `invoice_items`)
- ❌ Payments & Ledgers (`payments`, `receipts`, `refunds`, `credit_notes`)
- ❌ Session Packages & Bundles (`packages`, `package_session_ledger`)
- ❌ Patient Wallets & Deposits (`patient_wallets`, `wallet_transactions`)
- ❌ Insurance Claims & Clearinghouses (`insurance_claims`, `payers`)
- ❌ External Payment Gateways (Stripe, Paystack, Flutterwave)
- ❌ WhatsApp / SMS / Email Marketing Automation
- ❌ Telehealth Video Infrastructure
- ❌ AI Assistants / Clinical Coding Bots

---

## 3. SERVICE CATALOG MODEL

The Service Catalog defines the billable and non-billable physiotherapy services offered by a practice.

### Schema: `public.services`
- `id` (UUID, Primary Key, default `gen_random_uuid()`)
- `practice_id` (UUID, Foreign Key -> `practices.id`, NOT NULL)
- `service_code` (TEXT, NOT NULL, unique within practice) — e.g., `SRV-000001` or practice-specific alphanumeric code.
- `name` (TEXT, NOT NULL) — e.g., "Initial Physiotherapy Consultation & Assessment"
- `category` (`service_category` ENUM, NOT NULL)
- `description` (TEXT, optional clinical/commercial description)
- `standard_duration_minutes` (INTEGER, NOT NULL, DEFAULT 30, CHECK > 0)
- `delivery_mode` (TEXT, NOT NULL, DEFAULT 'all', CHECK IN ('clinic', 'home', 'telehealth', 'other', 'all'))
- `is_active` (BOOLEAN, NOT NULL, DEFAULT true)
- `created_by` (UUID, references `profiles.id`, optional)
- `updated_by` (UUID, references `profiles.id`, optional)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)

### Constraints:
- `uq_services_practice_code`: UNIQUE (`practice_id`, `service_code`)
- `uq_services_id_practice`: UNIQUE (`id`, `practice_id`) for multi-tenant composite foreign keys.

---

## 4. SERVICE CATEGORIES

A controlled PostgreSQL enum `public.service_category` is used to prevent typographic errors while supporting the complete spectrum of outpatient physiotherapy modalities:
- `'consultation'` — Initial assessment, triage, second opinion.
- `'assessment'` — Comprehensive biomechanical, neurological, or functional capacity evaluation.
- `'treatment'` — Manual therapy, dry needling, spinal manipulation, electrotherapy, shockwave.
- `'rehabilitation'` — Therapeutic exercise, gait re-education, neuromuscular retraining.
- `'home_visit'` — Domiciliary care, home ergonomics, community physiotherapy.
- `'reassessment'` — Progress evaluation, milestone reassessment, discharge review.
- `'group_class'` — Clinical Pilates, balance class, back rehabilitation circuit.
- `'other'` — Auxiliary physical therapy modalities.

---

## 5. FEE SCHEDULE MODEL

A Fee Schedule groups service tariffs effective across a defined temporal validity window.

### Schema: `public.fee_schedules`
- `id` (UUID, Primary Key, default `gen_random_uuid()`)
- `practice_id` (UUID, Foreign Key -> `practices.id`, NOT NULL)
- `schedule_identifier` (TEXT, NOT NULL) — e.g. `FS-000001`
- `name` (TEXT, NOT NULL) — e.g. "Standard Clinic Tariff 2026"
- `description` (TEXT, optional)
- `effective_from` (DATE, NOT NULL, DEFAULT `CURRENT_DATE`)
- `effective_to` (DATE, optional)
- `status` (`fee_schedule_status` ENUM, NOT NULL, DEFAULT `'draft'`) — `'draft'`, `'active'`, `'archived'`
- `is_default` (BOOLEAN, NOT NULL, DEFAULT false)
- `currency` (TEXT, NOT NULL, DEFAULT 'NGN', CHECK `~ '^[A-Z]{3}$'`)
- `created_by` / `updated_by` (UUID, references `profiles.id`)
- `created_at` / `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)

### Constraints:
- `CHECK (effective_to IS NULL OR effective_to >= effective_from)`
- `uq_fee_schedules_practice_identifier`: UNIQUE (`practice_id`, `schedule_identifier`)
- `uq_fee_schedules_id_practice`: UNIQUE (`id`, `practice_id`)
- Partial unique index: at most ONE active default schedule per practice (`WHERE is_default = true AND status = 'active'`).

---

## 6. FEE SCHEDULE ITEM MODEL & PRICING

Each fee schedule contains itemized rates for cataloged services.

### Schema: `public.fee_schedule_items`
- `id` (UUID, Primary Key, default `gen_random_uuid()`)
- `practice_id` (UUID, NOT NULL)
- `fee_schedule_id` (UUID, NOT NULL)
- `service_id` (UUID, NOT NULL)
- `unit_price` (`NUMERIC(12, 2)`, NOT NULL, CHECK `>= 0`) — Strict fixed-point financial storage. Floating-point numbers (`FLOAT`, `DOUBLE PRECISION`) are prohibited.
- `currency` (TEXT, NOT NULL, DEFAULT 'NGN', CHECK `~ '^[A-Z]{3}$'`)
- `is_taxable` (BOOLEAN, NOT NULL, DEFAULT false)
- `tax_rate_percent` (`NUMERIC(5, 2)`, NOT NULL, DEFAULT 0.00, CHECK `>= 0 AND <= 100`)
- `notes` (TEXT, optional billing notes)
- `created_at` / `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)

### Composite Tenant Constraints:
- `fk_fee_schedule_items_schedule_practice`: FOREIGN KEY (`fee_schedule_id`, `practice_id`) REFERENCES `public.fee_schedules(id`, `practice_id`)
- `fk_fee_schedule_items_service_practice`: FOREIGN KEY (`service_id`, `practice_id`) REFERENCES `public.services(id`, `practice_id`)
- `uq_fee_schedule_items_schedule_service`: UNIQUE (`fee_schedule_id`, `service_id`)
- `uq_fee_schedule_items_id_practice`: UNIQUE (`id`, `practice_id`)

---

## 7. HISTORICAL PRICE PRESERVATION

### Architectural Rule:
Prices must NEVER be stored as a single mutable field on the service (e.g. `service.price = 15000`). If a clinic raises prices from ₦15,000 to ₦20,000 on June 1st, all encounters and prospective invoices from January to May must remain recoverable at exactly ₦15,000.

### Price Recovery Mechanics:
$$\text{Service} \longleftarrow \text{Fee Schedule Item} \longleftarrow \text{Fee Schedule } [\text{effective\_from} \dots \text{effective\_to}]$$

When a future invoice line item is generated for a visit that took place on `2026-03-15`:
1. The system resolves the fee schedule active and default on `2026-03-15`.
2. It fetches the item rate matching `service_id` in that historical schedule.
3. Once an active fee schedule is superseded, its status is updated to `'archived'`, freezing all rates from further mutation.

---

## 8. IDENTIFIER STRATEGY

Both Services and Fee Schedules use dedicated sequence counters for tenant-scoped sequential human-readable codes:
1. `public.practice_service_counters` -> `public.generate_next_service_code(p_practice_id UUID)` produces `SRV-000001`
2. `public.practice_fee_schedule_counters` -> `public.generate_next_fee_schedule_identifier(p_practice_id UUID)` produces `FS-000001`

### Security Hardening:
- `SECURITY DEFINER`
- Fixed `search_path = public, pg_temp`
- Tenant verification: `p_practice_id = public.current_practice_id()`
- Role authorization: `public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])`
- `REVOKE EXECUTE FROM PUBLIC`, grant explicitly to `authenticated`.

---

## 9. MULTI-TENANCY & ROW-LEVEL SECURITY (RLS)

All 4 tables have RLS enabled:
- `practice_service_counters`
- `practice_fee_schedule_counters`
- `services`
- `fee_schedules`
- `fee_schedule_items`

### Tenant Isolation:
All queries must satisfy:
`practice_id = public.current_practice_id()`

Cross-tenant reads, inserts, updates, or deletes are impossible regardless of client-supplied payloads.

---

## 10. ROLE-BASED ACCESS CONTROL (RBAC)

Physenra roles interact with the commercial catalog as follows:

| Role | Service Catalog (Read) | Service Catalog (Write) | Fee Schedule (Read) | Fee Schedule (Write) |
| :--- | :---: | :---: | :---: | :---: |
| `practice_owner` | ✅ | ✅ | ✅ | ✅ |
| `practice_manager` | ✅ | ✅ | ✅ | ✅ |
| `accountant` | ✅ | ✅ | ✅ | ✅ |
| `physiotherapist` | ✅ (Active only) | ❌ | ✅ (Active only) | ❌ |
| `receptionist` | ✅ (Active only) | ❌ | ✅ (Active only) | ❌ |
| `patient` | ❌ | ❌ | ❌ | ❌ |
| `platform_admin` | Audit view | ❌ | Audit view | ❌ |

---

## 11. AUDIT ARCHITECTURE

All commercial configuration actions emit structured immutable audit logs via:
`public.log_audit_event(action, entity_type, entity_id, metadata, source)`

Audited actions:
- `service.created`: new service catalog entry created
- `service.updated`: service name, category, or duration updated
- `service.status_changed`: service activated or deactivated
- `fee_schedule.created`: new tariff schedule created
- `fee_schedule.status_changed`: schedule transitioned between draft, active, or archived
- `fee_schedule.item_upserted`: service price configured or updated in schedule

Audit events document *who* took the action and *when*; the authoritative fee schedule records store the actual price truth.

---

## 12. IMMUTABILITY & LIFECYCLE RULES

1. **Service Codes:** Immutable once created (`service_code` cannot be updated).
2. **Archived Schedules:** Once a fee schedule is marked `'archived'`, triggers prohibit updating its name, effective dates, or fee schedule items.
3. **Hard Delete Policy:**
   - Services referenced by any fee schedule item cannot be deleted. They must be archived via `is_active = false`.
   - Fee schedules with status `'active'` or `'archived'` cannot be hard-deleted.
4. **Tenant Immutability:** `practice_id` cannot be changed on any row.

---

## 13. POSTGREST RELATIONSHIP SAFETY

Composite foreign keys introduce multiple valid foreign key paths. To guarantee zero `PGRST201` ambiguities:
- Foreign keys are explicitly named:
  - `fk_fee_schedule_items_schedule_practice`
  - `fk_fee_schedule_items_service_practice`
- Application services and UI components MUST use explicit constraint hints:
  ```ts
  .from('fee_schedules')
  .select(`
    *,
    items:fee_schedule_items!fk_fee_schedule_items_schedule_practice(
      *,
      service:services!fk_fee_schedule_items_service_practice(*)
    )
  `)
  ```
- Negative and positive PostgREST tests verify this behavior against the remote database.

---

## 14. FRONTEND ARCHITECTURE

New dedicated views under `/app`:
- `/app/services`: List services with search, category filtering, status toggle, and create modal.
- `/app/services/new`: Create service form.
- `/app/fee-schedules`: List fee schedules with status indicators, effective dates, and default badge.
- `/app/fee-schedules/new`: Create fee schedule modal/form.
- `/app/fee-schedules/:scheduleId`: Fee schedule detail view with itemized service tariff table and price editor.

Sidebar navigation:
- Added `Services` (`Stethoscope` or `Briefcase` or `Tag` icon)
- Added `Fee Schedules` (`ReceiptText` or `BadgePercent` or `Coins` icon)
- Restricted creation/editing to authorized roles via `useRole()`.

---

## 15. SERVICE LAYER: `serviceCatalogService.ts`

Encapsulates all domain operations:
- `getServices(params)`: lists active/all services with category and query filters.
- `createService(data)`: generates next code, validates practice context, inserts service, logs audit.
- `updateService(id, data)`: updates service details, logs audit.
- `toggleServiceStatus(id, isActive)`: activates/deactivates service, logs audit.
- `getFeeSchedules()`: lists fee schedules for current practice.
- `getFeeScheduleById(id)`: retrieves schedule with disambiguated items and services.
- `createFeeSchedule(data)`: generates schedule identifier, sets default if requested, logs audit.
- `updateFeeSchedule(id, data)`: updates draft/active schedule, logs audit.
- `archiveFeeSchedule(id)`: sets status to archived, logs audit.
- `upsertFeeScheduleItem(scheduleId, itemData)`: inserts or updates service tariff, logs audit.
- `removeFeeScheduleItem(scheduleId, itemId)`: removes service from draft schedule, logs audit.

---

## 16. TESTING SPECIFICATION

Verification suite in `tests/fee_schedule_service_catalog.test.cjs`:
1. Schema & Tenancy: tables exist, UUID PKs, composite FKs, enums.
2. Sequence Generators: `generate_next_service_code`, `generate_next_fee_schedule_identifier`, role checks.
3. Fee Immutability: locked archived schedules, numeric price storage, non-negative checks.
4. Tenant Isolation & RLS: cross-tenant access denied.
5. Domain Boundaries: zero tables for invoices, payments, packages, wallets, insurance, AI.
6. PostgREST Safety: positive disambiguation tests (HTTP 200) and negative unhinted ambiguity tests (PGRST201 HTTP 300).
7. Remote Supabase Live Verification.

---

## 17. EXPLICITLY DEFERRED DOMAINS

The following domains are explicitly deferred and must NOT be built during this phase:
- Invoicing & Billing
- Payment Processing & Gateways
- Patient Packages & Session Ledgers
- Patient Wallets
- Insurance Claims & Clearinghouses
- Discounts & Promotion Codes (owned by future Billing domain)
- Automatic FX Currency Conversion

---

## 18. FUTURE BILLING BOUNDARY

When the future Billing & Invoicing domain is authorized:
- An invoice item will link to `service_id` and reference `fee_schedule_id` (or snapshot the fee item).
- The historical price recorded in the active fee schedule will populate the unit price.
- Invoicing will be an explicit consumer of Fee Schedules, preserving clean architectural decoupling.

---

## 19. SECURITY REVIEW SUMMARY

- **Threat: Unauthorized Price Tampering** — Mitigated by RBAC (`practice_owner`, `practice_manager`, `accountant` only) and DB triggers preventing modification of archived schedules.
- **Threat: Cross-Tenant Service/Fee Leakage** — Mitigated by mandatory `practice_id = public.current_practice_id()` RLS on all queries.
- **Threat: Floating-Point Rounding Exploitation** — Mitigated by `NUMERIC(12, 2)` monetary precision.
- **Threat: Service Code Collision** — Mitigated by `uq_services_practice_code` unique constraint and atomic sequence generator.
- **Threat: Historical Price Invalidation** — Mitigated by effective-dated schedules and immutability triggers.

---

## 20. VERIFICATION GATE CHECKLIST

- [ ] Database migration created and applied to Supabase `xxknmdgneamtoahqayvl`.
- [ ] TypeScript types updated in `database.ts` and `models.ts`.
- [ ] Application service `serviceCatalogService.ts` implemented with audit logging.
- [ ] Frontend routes `/app/services` and `/app/fee-schedules` implemented and wired to Sidebar.
- [ ] Automated verification test suite passes 100%.
- [ ] Full existing regression suite (14 suites, 388 tests) passes 100%.
- [ ] Production build (`npm.cmd run build`) passes cleanly.
- [ ] Live UI & remote API verified.
- [ ] Gate cleared and committed locally.
