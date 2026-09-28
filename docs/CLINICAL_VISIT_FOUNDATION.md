# PHYSENRA CLINICAL VISIT FOUNDATION V1 SPECIFICATION & DESIGN

## 1. Domain Separation Architecture

The clinical operations domain in Physenra maintains an absolute architectural separation:

$$\text{Patient} \neq \text{Episode of Care} \neq \text{Appointment} \neq \text{Clinical Visit} \neq \text{Clinical Note}$$

- **Patient:** Represents the durable human identity and demographic record.
- **Episode of Care:** Represents a clinical course of treatment for a specific condition or health goal.
- **Appointment:** Represents a planned or scheduled encounter within an operational calendar slot.
- **Clinical Visit:** Represents an actual clinical encounter that occurred or is actively in progress.
- **Clinical Note:** Represents the formal clinical documentation (e.g., SOAP note, objective tests, clinical plan) recorded during or following an encounter.

A Clinical Visit does NOT equal an Appointment. An appointment is scheduling intent; a visit is actual execution.
A Clinical Visit does NOT equal a Clinical Note. A visit documents the occurrence, timing, and operational attributes of the encounter; future clinical notes document clinical findings and evaluation.
A Clinical Visit does NOT create billing records, invoices, payments, or deduct patient wallets/packages in V1.

---

## 2. Clinical Visit Identity & Numbering

- **Technical Primary Key:** UUID (`id`), generated securely via `gen_random_uuid()`.
- **Human-Readable Identifier:** `visit_identifier` formatted as `VIS-000001` (6-digit zero-padded, monotonic per practice).
- **Concurrency & Race Safety:** Generated via an atomic database counter stored in `public.practice_clinical_visit_counters`.
- **Immutability:** Once assigned, `id`, `practice_id`, `patient_id`, and `visit_identifier` cannot be modified.

---

## 3. Relational Tenancy & Domain Hierarchy

```text
Practice (Tenant Boundary)
  └── Patient (Durable Identity)
        └── Episode of Care (Clinical Course, optional on Appointment/Visit)
              └── Appointment (Scheduled Encounter Slot, optional on Visit)
                    └── Clinical Visit (Actual Encounter Execution)
```

### Relational Integrity Invariants
- **Multi-Tenant Composite Keys:**
  - `(patient_id, practice_id)` references `patients(id, practice_id)`
  - `(episode_id, patient_id, practice_id)` references `episodes_of_care(id, patient_id, practice_id)`
  - `(appointment_id, patient_id, practice_id)` references `appointments(id, patient_id, practice_id)`
- These composite foreign keys prevent cross-tenant assignment, mismatched patient linking, and episode/appointment cross-contamination.

---

## 4. Appointment Relationship & Duplicate Prevention

- **Cardinality:** An Appointment may have zero Clinical Visits (prior to the encounter) or exactly one Clinical Visit (upon starting or recording the encounter).
- **Duplicate Prevention:** Enforced via a unique constraint / partial index:
  ```sql
  CREATE UNIQUE INDEX uq_clinical_visits_practice_appointment
    ON public.clinical_visits (practice_id, appointment_id)
    WHERE appointment_id IS NOT NULL;
  ```
- **Standalone Visits:** A Clinical Visit may optionally occur without a pre-existing Appointment (e.g., walk-in, emergency encounter) if `appointment_id` is NULL.

---

## 5. Physiotherapist Assignment & Role Validation

- The assigned clinician (`physiotherapist_id`) must reference an active user profile.
- A database trigger validates that the assigned user holds an active membership in the same practice with an authorized clinical role (`'practice_owner'`, `'practice_manager'`, `'physiotherapist'`).

---

## 6. Encounter Timing & Duration Model

- **Fields:**
  - `actual_start`: Timestamp with time zone when the clinical encounter actually began.
  - `actual_end`: Timestamp with time zone when the clinical encounter actually concluded.
  - `duration_minutes`: Integer representing encounter duration in minutes.
- **Invariants:**
  - `actual_end` must be strictly greater than `actual_start`.
  - `duration_minutes` must be between 1 and 1440 minutes (24 hours).
  - When status is `completed`, both `actual_start` and `actual_end` are required.
- **Separation from Scheduled Times:** Scheduled start/end times on the Appointment are NEVER overwritten by actual visit times. Variance between scheduled and actual timing reflects operational reality.

---

## 7. Location & Mode Vocabulary

Canonical location modes strictly mirror scheduling foundations:
- `clinic`
- `home`
- `telehealth`
- `other`

*Note: `home_visit` is an appointment type, NOT a location mode. The location mode for home visits is `home`.*
*No telephysiotherapy video, audio, or call infrastructure is implemented in this foundation; `telehealth` is purely descriptive encounter metadata.*

---

## 8. Clinical Visit Lifecycle & State Machine

```
              ┌─────────────┐
              │  scheduled  │
              └──────┬──────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
 ┌─────────────┐           ┌─────────────┐
 │ in_progress │           │  cancelled  │ (Terminal)
 └──────┬──────┘           └─────────────┘
        │
   ┌────┴─────────────────────────┐
   ▼                              ▼
┌─────────────┐            ┌─────────────┐
│  completed  │ (Terminal) │  incomplete │
└─────────────┘            └──────┬──────┘
                                  │ (Can resume or cancel)
                                  ▼
                            in_progress / cancelled
```

### State Definitions
1. `scheduled`: Visit prepared/queued prior to clinician and patient commencing encounter.
2. `in_progress`: Clinician has actively commenced the face-to-face or telehealth clinical encounter.
3. `completed`: Encounter concluded normally with recorded actual start and end times.
4. `incomplete`: Encounter started but interrupted/aborted prior to normal conclusion.
5. `cancelled`: Visit abandoned before completion.

---

## 9. Security, RLS & Tenant Isolation

- **Row-Level Security (RLS):** Enabled and forced on `clinical_visits` and `practice_clinical_visit_counters`.
- **Tenant Scope:** Every operation verifies `practice_id = public.current_practice_id()`.
- **Role-Based Access Control (RBAC):**
  - **SELECT:** `practice_owner`, `practice_manager`, `physiotherapist`, `receptionist`, `biller`.
  - **INSERT / UPDATE:** `practice_owner`, `practice_manager`, `physiotherapist`, `receptionist`.
  - **DELETE:** Strictly DENIED across all roles (`USING (false)`). Physical records are permanently retained for clinical compliance.

---

## 10. Audit Trail Integration

All lifecycle events integrate with `public.log_audit_event()`:
- `clinical_visit.created`
- `clinical_visit.status_changed`
- `clinical_visit.cancelled`
- `clinical_visit.completed`

---

## 11. Domain Side-Effect Firewall

The Clinical Visit Foundation is strictly decoupled:
- **NO Clinical Notes:** No SOAP, subjective, objective, assessment, or plan documents.
- **NO Billing:** No invoices, line items, claims, or payment transactions.
- **NO Packages / Wallets:** No session deductions or credit consumptions.
- **NO Communications:** No automated emails, SMS, or WhatsApp triggers.
- **NO AI:** No automatic transcription or clinical summaries.
