# PHYSENRA CLINICAL NOTE / SOAP FOUNDATION V1 SPECIFICATION & DESIGN

## 1. Domain Separation Architecture

The clinical operations domain in Physenra maintains an absolute architectural separation:

$$\text{Patient} \neq \text{Episode of Care} \neq \text{Appointment} \neq \text{Clinical Visit} \neq \text{Clinical Note}$$

- **Patient:** Represents the durable human identity and demographic record.
- **Episode of Care:** Represents a clinical course of treatment for a specific condition or health goal.
- **Appointment:** Represents a planned or scheduled encounter within an operational calendar slot.
- **Clinical Visit:** Represents an actual clinical encounter that occurred or was recorded.
- **Clinical Note:** Represents the formal clinical documentation (e.g., SOAP note, clinical findings, examination, clinical assessment, treatment provided, response, and clinical plan) recorded during or following an encounter.

### Architectural Invariants
1. A Clinical Visit does NOT automatically create a Clinical Note. A visit documents operational attendance and encounter timing; a note documents clinical evaluation and care.
2. A Clinical Note does NOT equal a Clinical Visit. A note is child documentation referencing a clinical visit.
3. A Clinical Note does NOT generate billing records, invoices, claims, or payment transactions in V1.
4. A Clinical Note does NOT deduct package sessions, alter patient wallets, or trigger automated external communications (SMS/WhatsApp).

---

## 2. Clinical Note Identity & Numbering

- **Technical Primary Key:** UUID (`id`), generated securely via `gen_random_uuid()`.
- **Human-Readable Identifier:** `note_identifier` formatted as `NOT-000001` (6-digit zero-padded, monotonic per practice).
- **Concurrency & Race Safety:** Generated via an atomic database counter stored in `public.practice_clinical_note_counters`.
- **Immutability:** Once assigned, `id`, `practice_id`, `patient_id`, `clinical_visit_id`, and `note_identifier` cannot be modified.

---

## 3. Relational Tenancy & Domain Hierarchy

```text
Practice (Tenant Boundary)
  └── Patient (Durable Identity)
        └── Episode of Care (Clinical Course, optional)
              └── Clinical Visit (Actual Encounter Execution)
                    └── Clinical Note (SOAP Documentation / Addendum)
```

### Relational Integrity Invariants
- **Multi-Tenant Composite Keys:**
  - `(patient_id, practice_id)` references `patients(id, practice_id)`
  - `(episode_id, patient_id, practice_id)` references `episodes_of_care(id, patient_id, practice_id)` (nullable)
  - `(clinical_visit_id, patient_id, practice_id)` references `clinical_visits(id, patient_id, practice_id)`
- These composite foreign keys prevent cross-tenant assignment, mismatched patient linking, and visit/note cross-contamination.

---

## 4. Visit Linkage, Note Types & Cardinality

- **Primary SOAP Note (`note_type = 'soap'`):**
  - Exactly one primary SOAP note is permitted per clinical visit.
  - Enforced via a unique partial index:
    ```sql
    CREATE UNIQUE INDEX uq_clinical_notes_practice_visit_primary
      ON public.clinical_notes (practice_id, clinical_visit_id)
      WHERE note_type = 'soap';
    ```
- **Addendum / Amendment (`note_type = 'addendum'`):**
  - When a finalized note requires clinical clarification or amendment, an addendum is appended.
  - An addendum references the original note via `parent_note_id`.
  - An explicit `amendment_reason` is strictly required.
  - The parent note's status transitions to `amended`.
  - Finalized notes are never silently overwritten or modified.

---

## 5. Author Assignment & Role Validation

- The authoring clinician (`author_id`) must reference an active user profile.
- A database trigger validates that the author holds an active membership in the same practice with an authorized clinical role (`'practice_owner'`, `'practice_manager'`, `'physiotherapist'`).
- Administrative staff (`receptionist`, `biller`) cannot author or modify clinical notes.

---

## 6. SOAP Content Model

Physiotherapy clinical documentation is structured across four canonical domains:

| Section | Focus | Examples / Contents |
| :--- | :--- | :--- |
| **Subjective (S)** | Patient-reported history and symptoms | Chief complaint, mechanism of injury, pain scale (0–10), symptom aggravating/easing factors, functional limitations, history since last visit. |
| **Objective (O)** | Clinician's physical examination and interventions | Observation, posture, active/passive range of motion (ROM), manual muscle testing (MMT), neurodynamic and orthopedic special tests, palpation, functional tests, manual therapy, modalities, and specific exercises performed during session. |
| **Assessment (A)** | Clinical reasoning and synthesis | Diagnostic impression, stage of healing, progress toward rehabilitation milestones, response to interventions, prognosis. |
| **Plan (P)** | Forward care and management plan | Recommended treatment frequency, goals for subsequent sessions, home exercise program (HEP) instructions and precautions discussed, referral or imaging recommendations. |

---

## 7. Clinical Note Lifecycle & State Machine

```text
               ┌─────────────┐
               │    draft    │
               └──────┬──────┘
                      │ (Finalize - Locks content)
                      ▼
               ┌─────────────┐
               │  finalized  │ (Content Immutable)
               └──────┬──────┘
                      │ (Addendum appended)
                      ▼
               ┌─────────────┐
               │   amended   │ (Parent note flagged, addendum attached)
               └─────────────┘
```

### State Definitions
1. `draft`: Editable by authorized clinical author and practice clinicians while documenting care.
2. `finalized`: Medico-legally completed and locked.
   - Automatically records `finalized_at` timestamp.
   - Automatically records `finalized_by` user ID.
   - Content fields (`subjective`, `objective`, `assessment`, `plan`) are frozen and cannot be edited.
3. `amended`: Indicates the finalized note has received an official addendum (`parent_note_id`). The original text remains preserved in full.

### Hard Deletes
Physical deletion of clinical documentation is strictly prohibited across all roles (`USING (false)` on DELETE policy).

---

## 8. Security, RLS & Tenant Isolation

- **Row-Level Security (RLS):** Enabled and forced on `clinical_notes` and `practice_clinical_note_counters`.
- **Tenant Scope:** Every operation verifies `practice_id = public.current_practice_id()`.
- **Role-Based Access Control (RBAC):**
  - **SELECT:** `practice_owner`, `practice_manager`, `physiotherapist`, `receptionist`, `biller`.
  - **INSERT / UPDATE:** `practice_owner`, `practice_manager`, `physiotherapist`.
  - **DELETE:** Strictly DENIED across all roles (`USING (false)`).

---

## 9. Audit Trail Integration

All note lifecycle actions record immutable audit records in `public.audit_events` via `public.log_audit_event()`:
- `clinical_note.created`
- `clinical_note.updated`
- `clinical_note.finalized`
- `clinical_note.amended`
- `clinical_note.addendum_created`

---

## 10. Domain Side-Effect Firewall

The Clinical Note / SOAP Foundation maintains a strict boundary:
- **NO Billing / Invoicing:** Notes do not compute fees, create invoices, or record payments.
- **NO Packages / Wallets:** Notes do not deduct package sessions or adjust prepaid balances.
- **NO Communications:** Notes do not trigger automated emails, SMS, or WhatsApp messages.
- **NO AI:** Notes do not execute automated summarization or generative drafting in V1.
- **NO Telehealth:** Notes do not handle streaming or video sessions.
