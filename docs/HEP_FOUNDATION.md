# PHYSENRA HOME EXERCISE PROGRAM (HEP) FOUNDATION V1 SPECIFICATION & DESIGN

## 1. Purpose & Definition

The Home Exercise Program (HEP) Foundation establishes the structured therapeutic exercise prescription and home rehabilitation domain for Physenra.

A Home Exercise Program (HEP) is an authoritative, structured clinical prescription of therapeutic exercises, stretches, neuromuscular re-education activities, and self-management guidelines formulated by a licensed physiotherapist for a patient to perform independently outside clinical encounters.

---

## 2. Clinical Domain Hierarchy & Architectural Separation

Physenra enforces strict domain separation across the clinical care continuum:

$$\text{Patient} \neq \text{Episode of Care} \neq \text{Appointment} \neq \text{Clinical Visit} \neq \text{Clinical Note} \neq \text{Clinical Outcome Measure} \neq \text{Home Exercise Program (HEP)}$$

| Entity | Core Responsibility | Persistence Nature |
| :--- | :--- | :--- |
| **Patient** | Durable human identity & demographic record | Entity root |
| **Episode of Care** | Clinically meaningful course of treatment for a condition | Clinical container |
| **Appointment** | Scheduled calendar slot and operational intent | Administrative slot |
| **Clinical Visit** | Actual encounter execution, attendance, and timing | Operational occurrence |
| **Clinical Note** | Narrative clinical evaluation and reasoning (SOAP) | Narrative documentation |
| **Clinical Outcome Measure** | Standardized, structured assessment score and clinical metric | Quantitative measurement |
| **Home Exercise Program** | Authoritative structured prescription of exercises and dosage | Clinical prescription |

### Core Architectural Invariants
$$\text{Home Exercise Program} \neq \text{Clinical Visit} \neq \text{Clinical Note}$$
$$\text{Exercise Definition} \neq \text{Exercise Prescription}$$

- An HEP record is the authoritative structured container for prescribed exercises.
- A Clinical Note may summarize or document that an HEP was issued or revised, but the Clinical Note is NOT the storage engine for the exercise prescription.
- A Clinical Visit represents an encounter occurrence; creating or updating an HEP does not create a Clinical Visit.
- An outcome measure is an assessment; an outcome score does not automatically alter an HEP.

---

## 3. Roles, Creation, Viewing & Editing Privileges (RBAC)

1. **Who Creates an HEP:**
   - Active physiotherapists, practice owners, and practice managers within the tenant practice.
2. **Who Can View an HEP:**
   - Authorized practice staff (`practice_owner`, `practice_manager`, `physiotherapist`, `front_desk`) scoped strictly to their active practice.
3. **Who Can Edit an HEP:**
   - Draft HEP programs and items may be edited by the authoring clinician, practice owners, and practice managers.
   - Once activated (`active`), baseline prescription items become immutable to protect medico-legal integrity. Program review dates and status transitions are controlled by clinicians and practice managers.

---

## 4. Domain Relationships & Provenance

### Patient Relationship
- Every HEP belongs strictly to a single patient: `patient_id UUID NOT NULL REFERENCES public.patients(id)`.
- Patients may have multiple HEPs over time.
- Composite foreign key `(patient_id, practice_id) REFERENCES patients(id, practice_id)` ensures strict tenant isolation.

### Episode of Care Relationship
- An HEP normally belongs to an Episode of Care representing the clinical condition being rehabilitated: `episode_id UUID REFERENCES public.episodes_of_care(id)`.
- Optional (`NULL` allowed for standalone conditioning or maintenance care).
- Composite foreign key `(episode_id, patient_id, practice_id) REFERENCES episodes_of_care(id, patient_id, practice_id)` guarantees patient-episode coherence.

### Clinical Visit Relationship
- An HEP may originate from a specific clinical visit encounter: `clinical_visit_id UUID REFERENCES public.clinical_visits(id)`.
- Optional (`NULL` allowed, supporting HEP formulation outside or between encounters while preserving encounter provenance when linked).
- Composite foreign key `(clinical_visit_id, patient_id, practice_id) REFERENCES clinical_visits(id, patient_id, practice_id)` guarantees visit coherence.

### Clinical Note Relationship
- A Clinical Note (SOAP) may reference or summarize that an HEP was prescribed in the `Plan` section.
- The HEP remains the authoritative record; details are not duplicated into unstructured text fields.

### Clinical Outcome Measure Relationship
- Outcome Measures and HEP are separate clinical domains.
- Scores provide objective feedback on patient recovery, but V1 must not automatically mutate, activate, or discontinue HEP records based on scores.

---

## 5. Architectural Separation: Exercise Definition vs Exercise Prescription

The domain is split into two distinct conceptual layers:

```
+-------------------------------------------------------+
|                public.exercises                       |
|  (WHAT the exercise is - Catalog / Library)           |
|  - name, category, body_region, default instructions  |
+-------------------------------------------------------+
                           |
                           | referenced by (1 to N)
                           v
+-------------------------------------------------------+
|          public.home_exercise_program_items           |
|  (WHAT was prescribed to this patient - Dosage)       |
|  - sets, reps, hold, frequency, patient instructions  |
+-------------------------------------------------------+
                           ^
                           | part of (N to 1)
+-------------------------------------------------------+
|          public.home_exercise_programs                |
|  (The Program Container - Patient Assignment)         |
|  - patient, episode, visit, clinician, status, dates  |
+-------------------------------------------------------+
```

### Layer A: Exercise Definition (`public.exercises`)
- Represents an entry in the exercise library: what the movement is, target region, equipment needed, and standard biomechanical instructions.
- Scope: Practice-defined exercises (`practice_id` populated) and system starter exercises (`is_system = true`, `practice_id IS NULL`).
- Safe starter library: Common, evidence-based standard physiotherapy exercises without copyrighted proprietary material. Practices may freely create and customize their own exercises.

### Layer B: Exercise Prescription (`public.home_exercise_program_items`)
- Represents the personalized clinical dosage prescribed to a specific patient as part of an HEP container.
- Dosage parameters:
  - `sets`: Number of sets (e.g. 3)
  - `repetitions`: Repetitions per set (e.g. 10)
  - `duration_minutes`: Timed exercise duration (e.g. 15 mins)
  - `hold_seconds`: Isometric or stretch hold time (e.g. 30 secs)
  - `rest_seconds`: Rest interval between sets (e.g. 60 secs)
  - `frequency`: Frequency descriptor (e.g. "2x daily", "3x per week", "daily")
  - `intensity_load`: Intensity or external resistance (e.g. "Yellow theraband", "2kg dumbbell", "Bodyweight")
  - `laterality`: Target side (`bilateral`, `left`, `right`, `unilateral`, `na`)
  - `instructions`: Patient-tailored execution cues overriding or augmenting library defaults
  - `precautions`: Clinical warnings and symptom thresholds (e.g. "Stop if pain exceeds 3/10")
  - `notes`: Progression and regression cues

---

## 6. Program Lifecycle & State Machine

```
      +-------------+
      |    draft    |
      +-------------+
         |        \
(activate)      (discontinue draft)
         v          \
   +------------+    \
   |   active   |     |
   +------------+     |
     /    |    \      |
(pause) (done) (stop) |
   /      |      \    |
  v       |       v   v
+--------+|   +---------------+
| paused ||   | discontinued  | [TERMINAL]
+--------+|   +---------------+
  |   \   |
(res) (stop)
  |     \ |
  v       v
+------------+
| completed  | [TERMINAL]
+------------+
```

### Valid Statuses
1. `draft`: Initial composition mode. Items and parameters are fully mutable.
2. `active`: Clinically prescribed and in effect. Baseline items become locked to protect medical-record integrity.
3. `paused`: Temporarily suspended (e.g., acute inflammatory flare-up, medical leave).
4. `completed`: Successfully concluded rehabilitation goal. [Terminal]
5. `discontinued`: Ceased prior to goal completion (e.g., non-compliance, adverse reaction, intervention pivot). [Terminal]

### Valid Transitions
- `draft` $\rightarrow$ `active` (sets `finalized_at`, `finalized_by`)
- `draft` $\rightarrow$ `discontinued`
- `active` $\rightarrow$ `paused`
- `active` $\rightarrow$ `completed`
- `active` $\rightarrow$ `discontinued`
- `paused` $\rightarrow$ `active`
- `paused` $\rightarrow$ `discontinued`
- `completed` $\rightarrow$ (no transitions allowed)
- `discontinued` $\rightarrow$ (no transitions allowed)

---

## 7. Clinical Record Integrity & Immutability

1. **Finalized Prescription Protection:**
   - Transitioning an HEP to `active` marks the program as clinically prescribed (`finalized_at`, `finalized_by`).
   - Database triggers prevent silent modifications or deletion of prescription items belonging to active, completed, or discontinued programs.
2. **Zero Hard Deletes:**
   - Hard deletion (`DELETE`) of `home_exercise_programs` is strictly blocked by database triggers and RLS policies.
   - If an exercise program is no longer indicated, it is moved to `discontinued` with clinical reason metadata recorded.
3. **Referential Preservation:**
   - Exercises referenced by existing HEP items cannot be hard deleted. Soft archiving (`is_active = false`) is supported.

---

## 8. Tenant Isolation & Multi-Tenancy

- Every database query and write enforces `practice_id = public.current_practice_id()`.
- Composite Foreign Keys:
  - `fk_hep_patient_practice`: `(patient_id, practice_id) REFERENCES patients(id, practice_id)`
  - `fk_hep_episode_patient_practice`: `(episode_id, patient_id, practice_id) REFERENCES episodes_of_care(id, patient_id, practice_id)`
  - `fk_hep_visit_patient_practice`: `(clinical_visit_id, patient_id, practice_id) REFERENCES clinical_visits(id, patient_id, practice_id)`
  - `fk_hep_items_program_practice`: `(program_id, practice_id) REFERENCES home_exercise_programs(id, practice_id)`
- PostgREST Foreign Key Disambiguation:
  - All PostgREST queries explicitly specify foreign key hints (e.g. `patient:patients!fk_hep_patient_practice(...)`) to prevent relationship ambiguity regressions.

---

## 9. Clinician Validation

- The prescribing clinician (`prescribing_clinician_id`) must have an active membership in the practice with role in `['practice_owner', 'practice_manager', 'physiotherapist']`.
- Enforced at both service layer and database trigger level.
- No redundant staff or clinician tables are created.

---

## 10. Audit Trail Integration

All key lifecycle events are recorded in `public.audit_events` via `public.log_audit_event()`:
- `hep.created`: Initial program drafting
- `hep.updated`: Modifications to draft metadata
- `hep.activated`: Program activation and prescription finalization
- `hep.paused`: Temporary clinical pause
- `hep.completed`: Successful program completion
- `hep.discontinued`: Program discontinuation with reason
- `exercise.created`: New custom exercise definition created
- `exercise.updated`: Updates to custom exercise definition
- `exercise.archived`: Custom exercise soft-archived

---

## 11. Domain Firewall & Scope Boundaries

Physenra strictly enforces a domain firewall. Creating, updating, or finalizing an HEP will **NEVER**:
- Generate an invoice or billing item
- Process or request a payment
- Deduct patient wallet funds
- Consume or decrement a prepaid package
- Generate an insurance claim
- Send automated WhatsApp messages
- Send automated emails
- Trigger artificial intelligence jobs
- Automatically create a Clinical Visit
- Automatically generate a Clinical Note
- Automatically administer an Outcome Measure

---

## 12. Future Extensibility (Out of Scope for V1)

The following capabilities are explicitly deferred to future controlled phases:
- Patient-facing mobile portal for HEP viewing
- Patient adherence and compliance logging
- Video playback and streaming infrastructure
- Wearable sensor data ingestion
- AI exercise form analysis and coaching
