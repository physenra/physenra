# PHYSENRA SYSTEM ARCHITECTURE SPECIFICATION

**Product:** Physenra  
**Document:** System Architecture Specification  
**Version:** 1.0.0  
**Target Environment:** Cloud-native Multi-Tenant SaaS (Supabase / PostgreSQL / React / TypeScript / Vite)

---

## 1. ARCHITECTURAL OVERVIEW

Physenra is engineered as an enterprise-grade, cloud-native Software-as-a-Service (SaaS) platform tailored exclusively for private physiotherapy clinics, rehabilitation centers, and independent physical therapy practitioners.

The system adheres to clean architecture principles, strict multi-tenant boundary isolation, domain-driven design (DDD), and healthcare-grade data security.

```
+-----------------------------------------------------------------------------------+
|                                  PHYSENRA PLATFORM                                |
+-----------------------------------------+-----------------------------------------+
|                CLINIC PORTAL            |              PATIENT PORTAL             |
|   (Practice Owner, Clinician, Staff)    |      (Self-Service Patient Experience)   |
+-----------------------------------------+-----------------------------------------+
                                     |
                                 REST / WSS
                                     v
+-----------------------------------------------------------------------------------+
|                         APPLICATION & API GATEWAY LAYER                           |
|       (Supabase Edge Functions / PostgREST / Realtime / Auth Security Layer)      |
+-----------------------------------------------------------------------------------+
                                     |
                      JWT Auth + Tenant Context Enforcement
                                     v
+-----------------------------------------------------------------------------------+
|                         DATABASE & SECURITY DEFINER LAYER                         |
|     (PostgreSQL 17+ / Strict Row Level Security (RLS) / Multi-Tenant Context)     |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +--------------------+   +--------------------+   +---------------------------+  |
|  |     PLATFORM       |   | PRACTICE MGMT      |   |       CLINICAL EMR        |  |
|  | - Tenancy Engine   |   | - Smart Scheduling |   | - Subjective/Objective    |  |
|  | - RBAC & Auth      |   | - Patient Registry |   | - SOAP & Progress Notes   |  |
|  | - Subscriptions    |   | - Staff Directory  |   | - Treatment Plans         |  |
|  | - Audit Engine     |   | - Invoicing        |   | - Outcome Measures        |  |
|  | - Platform Admin   |   | - Financial Ledger |   | - Clinical Timeline       |  |
|  |                    |   | - Package Ledgers  |   | - Discharge Summaries     |  |
|  +--------------------+   +--------------------+   +---------------------------+  |
|                                                                                   |
|  +--------------------+   +--------------------+   +---------------------------+  |
|  |   PATIENT PORTAL   |   |    INTEGRATIONS    |   |   IMMUTABLE AUDIT LOGS    |  |
|  | - My Appointments  |   | - WhatsApp Gateway |   | - Access & Mutations      |  |
|  | - Home Exercises   |   | - Email (Postmark) |   | - Authentication Events   |  |
|  | - Clinical Docs    |   | - Stripe / Paystack|   | - Financial Adjustments   |  |
|  | - Billing History  |   | - Assistive AI     |   | - Clinical Addenda        |  |
|  +--------------------+   +--------------------+   +---------------------------+  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 2. COMPONENT DECOMPOSITION

```text
Physenra
│
├── Platform Core
│   ├── Authentication (Supabase Auth, MFA, Session Management)
│   ├── Tenancy Engine (Practice Provisioning, Practice Metadata, Domain Mapping)
│   ├── RBAC Engine (Roles, Memberships, Explicit Capability Permissions)
│   ├── Subscriptions & Billing (SaaS Tier Management, Clinic Plan Enforcement)
│   ├── Central Audit Engine (Immutable Security & Operation Trail)
│   └── Platform Administration (Tenant Health, Platform Observability, System Config)
│
├── Practice Management
│   ├── Scheduling (Practitioner Shifts, Room Allocations, Slot Availability, Multi-Chair)
│   ├── Patients (Demographic Profiles, Next of Kin, Referrers, Medical Histories)
│   ├── Staff & Workforce (Clinician Credentials, Work Schedules, Commission Rates)
│   ├── Billing Engine (Fee Schedules, Invoices, Itemized Treatments, Discounts, Taxes)
│   ├── Financial Ledger (Double-Entry Payments, Refunds, Overpayments, Credit Notes)
│   ├── Package Ledgers (Prepaid Session Entitlement & Atomic Consumption)
│   └── Practice Reporting (KPI Analytics, Practitioner Occupancy, Financial Parity)
│
├── Clinical EMR
│   ├── Assessment (Intake Evaluation, Range of Motion, Pain Diagrams, Functional Tests)
│   ├── SOAP Documentation (Subjective, Objective, Assessment, Plan)
│   ├── Treatment Plans (Clinical Goals, Milestone Tracking, Frequency Cadence)
│   ├── Clinical Timeline (Unified Longitudinal Patient Encounter History)
│   ├── Outcome Measures (Standardized Scores: VAS, DASH, Oswestry, LEFS, EQ-5D)
│   └── Discharge Summaries (Rehabilitation Outcomes, Discharge Recommendations)
│
├── Patient Portal
│   ├── Appointment Management (Self-Scheduling, Rescheduling, Confirmations)
│   ├── Clinical Documents (Discharge Notes, Medical Certificates, Referral Letters)
│   ├── Treatment Plans & Goals (Patient-Facing Goal Progress)
│   ├── Home Exercise Programs (HEP) (Prescribed Exercises, Sets/Reps, Video Guides)
│   ├── Invoices & Receipts (Downloadable Bills, Online Payment Receipts)
│   └── Practice Communication (Direct Two-Way Messaging, Appointment Reminders)
│
└── Integrations Layer
    ├── Email Service (Transactional Notifications, Billing Receipts via Resend/Postmark)
    ├── WhatsApp Gateway (Automated Booking Confirmation, Arrival Alerts, HEP Delivery)
    ├── Payment Gateways (Stripe, Paystack, Bank Transfer Reconciliation)
    ├── Assistive Clinical AI (Audio Scribe, SOAP Note Structuring, Exercise Suggestions)
    └── External Healthcare APIs (Lab Integrations, Medical Aid / Insurance Invoicing)
```

---

## 3. DOMAIN SUBSYSTEM SPECIFICATIONS

### 3.1 Platform Core
- **Authentication:** Powered by Supabase GoTrue. Employs asymmetric JWTs. Claims contain user identity (`sub`), email, and custom claims for tenant context.
- **Tenancy Resolution:** Every authenticated request executes within the context of a selected `practice_id`. A user can possess memberships in multiple practices; switching practices updates the active tenant context.
- **RBAC Matrix:** Fine-grained role permissions evaluated via PostgreSQL security functions. Roles: `Practice Owner`, `Practice Manager`, `Physiotherapist`, `Receptionist`, `Accountant`, `Patient`, `Platform Administrator`.
- **Subscriptions:** Handles SaaS billing for practices (e.g. Starter, Solo Practitioner, Group Practice, Enterprise Clinic). Enforces practitioner seat limits, storage quotas, and feature flags.

### 3.2 Practice Management
- **Smart Scheduling:** Handles conflict-free bookings across clinicians, treatment cubicles, and specialized rehabilitation equipment. Supports recurring appointments, appointment series, class bookings, and walk-in arrivals.
- **Stateful Appointments:** Enforces the full lifecycle: `Scheduled` -> `Confirmed` -> `Arrived` -> `In Progress` -> `Completed` -> `Documentation Completed`, with terminal paths for `Cancelled` and `No Show`.
- **Workforce Management:** Manages practitioner working hours, break schedules, leave calendars, and performance metrics without contaminating clinical notes.
- **Financial Architecture:** Invoicing and payment processing strictly decoupled from clinical records. Financial transactions post immutable ledger entries to guarantee auditability and accounting balance.

### 3.3 Clinical EMR
- **Longitudinal Record:** Unifies clinical records around the patient. Every visit, note, chart, and attachment is stamped with practitioner attribution and timestamp.
- **SOAP & Structured Forms:** Clinical notes utilize structured JSONB payloads for flexibility and specialized assessments (musculoskeletal, neurological, sports injury, pelvic health) alongside standardized narrative SOAP fields.
- **Note Finalization & Immutability:** Once signed, a note is locked against in-place edits. Subsequent corrections generate an auditable amendment with mandatory rationale.
- **Standardized Outcome Measures:** Built-in validated scoring instruments (e.g. QuickDASH, Roland-Morris, Visual Analogue Scale) with longitudinal trend graphing.

### 3.4 Package Session Ledger
- **Decoupled Entitlement:** A patient purchasing a 10-session rehabilitation package receives an entitlement of 10 units in the `package_session_ledger`.
- **Atomic Deduction:** When an appointment reaches `Completed` or `Documentation Completed`, a debit entry is posted to the ledger linked specifically to that `appointment_id` and `practitioner_id`.
- **Reversal & Auditability:** If an appointment is cancelled before delivery or reversed, a credit entry restores entitlement with full author attribution.

### 3.5 Patient Portal
- **Zero-Friction Access:** Clean, mobile-first interface accessible via magic link or secure credentials.
- **Strict Data Scope:** Restricted strictly to `auth.uid() = patient_id` across all queries. Internal clinician impressions and billing metadata are stripped server-side.
- **Home Exercise Compliance:** Interactive video demonstration of prescribed exercises with patient self-reported completion tracking.

### 3.6 Integrations
- **Resilient Dispatch:** Asynchronous job queues for external communication (WhatsApp, SMS, Email). Failures retry with exponential backoff.
- **Payment Webhooks:** Webhook handlers verify cryptographic signatures before registering settled payments to patient invoices.
- **Assistive AI Boundary:** LLM interactions occur through backend edge functions. AI suggestions are presented in the UI as drafts requiring explicit clinician review, modification, and signature.

---

## 4. MULTI-TENANCY & ROW LEVEL SECURITY (RLS) DESIGN

```sql
-- Conceptual tenant resolution helper
CREATE OR REPLACE FUNCTION auth.current_practice_id() 
RETURNS uuid AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'practice_id', '')::uuid;
$$ LANGUAGE sql STABLE;

-- Example baseline RLS policy pattern
CREATE POLICY tenant_isolation_policy ON appointments
  FOR ALL
  TO authenticated
  USING (practice_id = auth.current_practice_id())
  WITH CHECK (practice_id = auth.current_practice_id());
```

1. **Automatic Context Filtering:** Postgres RLS guarantees that queries returning rows from `patients`, `appointments`, `clinical_notes`, or `invoices` automatically restrict visibility to the active `practice_id`.
2. **Preventing Tenant Injection:** Any `INSERT` or `UPDATE` with a mismatched `practice_id` is rejected at the database engine level.

---

## 5. TECHNOLOGY STACK SPECIFICATION

- **Frontend:** React 18+ / Vite / TypeScript (Strict Mode)
- **State Management & Data Fetching:** TanStack Query (React Query) for server state; Zustand for local client state
- **UI & Styling:** Tailwind CSS / Headless UI / Lucide Icons
- **Backend Services:** Supabase / PostgreSQL 17+ / Supabase Edge Functions (Deno / TypeScript)
- **Database Access:** Supabase Client (`@supabase/supabase-js`) strictly governed by database RLS and stored procedures
- **Validation:** Zod schemas shared between client forms and backend validation
- **Testing:** Vitest / React Testing Library / Database RLS Test Suite
- **Tooling:** ESLint, Prettier, TypeScript Compiler (`tsc`)
