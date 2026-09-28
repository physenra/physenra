# PHYSENRA TREATMENT PLAN & CLINICAL GOALS FOUNDATION V1 SPECIFICATION & DESIGN

## 1. Purpose & Clinical Definition

The **Treatment Plan & Clinical Goals Foundation** establishes the structured clinical pathway and goal management domain for the Physenra Physiotherapy EMR & Practice Management Platform.

A **Treatment Plan** is an authoritative clinical roadmap formulated by a licensed physiotherapist for a specific patient within an Episode of Care. It articulates the clinical rationale, target rehabilitation goals, intervention modalities, treatment frequency cadence, and target review dates for a patient's recovery trajectory.

A **Clinical Goal** is a discrete, quantifiable, and time-bounded objective within a Treatment Plan (e.g. "Restore active knee flexion to $\ge 120^\circ$ for normal stair descent").

---

## 2. Clinical Domain Hierarchy & Architectural Separation

Physenra enforces strict domain separation across the clinical care continuum:

$$\text{Patient} \neq \text{Episode of Care} \neq \text{Appointment} \neq \text{Clinical Visit} \neq \text{Clinical Note} \neq \text{Outcome Measure} \neq \text{HEP} \neq \text{Treatment Plan}$$

| Entity | Core Responsibility | Persistence Nature |
| :--- | :--- | :--- |
| **Patient** | Durable human demographic identity | Entity root |
| **Episode of Care** | Clinical container for a specific condition/episode | Case management container |
| **Appointment** | Scheduled calendar slot and operational intent | Administrative slot |
| **Clinical Visit** | Actual physical or telehealth encounter that occurred | Operational occurrence |
| **Clinical Note** | Narrative clinical evaluation and reasoning (SOAP) | Narrative documentation |
| **Clinical Outcome Measure** | Standardized, quantitative assessment score (e.g. NPRS, LEFS) | Quantitative measurement |
| **Home Exercise Program** | Authoritative prescription of exercises and dosages | Clinical prescription |
| **Treatment Plan** | Authoritative rehabilitation strategy, goals & review cadence | Clinical strategic pathway |

### Core Architectural Invariants
$$\text{Treatment Plan} \neq \text{Clinical Visit} \neq \text{Clinical Note}$$
$$\text{Treatment Plan} \neq \text{Outcome Measure} \neq \text{Home Exercise Program}$$
$$\text{Treatment Plan} \neq \text{Billing} \neq \text{Invoices} \neq \text{Packages} \neq \text{Wallets}$$

- A Treatment Plan represents the overall clinical rehabilitation strategy; it does not replace or duplicate encounter notes (SOAP).
- A Clinical Visit represents an encounter occurrence; creating a Treatment Plan does not create a Clinical Visit.
- A Treatment Plan references baseline Outcome Measures and target thresholds, but does not duplicate or alter Outcome Measure assessment records.
- A Treatment Plan coordinates therapeutic direction, while the Home Exercise Program (HEP) remains the independent prescription for home exercises.

---

## 3. Roles, Creation, Viewing & Editing Privileges (RBAC)

1. **Who Creates a Treatment Plan:**
   - Active physiotherapists, practice owners, and practice managers within the tenant practice (`practice_owner`, `practice_manager`, `physiotherapist`).
2. **Who Can View a Treatment Plan:**
   - Authorized practice staff (`practice_owner`, `practice_manager`, `physiotherapist`, `receptionist`, `accountant`) scoped strictly to their active practice. Receptionists and administrative staff view summary status without modifying clinical objectives.
3. **Who Can Edit a Treatment Plan:**
   - Draft Treatment Plans and goals may be modified by the authoring clinician, practice owners, and practice managers.
   - Once activated (`active`), baseline goals and plan parameters are locked into the official medical record. Status transitions (`paused`, `completed`, `discontinued`) and individual goal milestone evaluations (`achieved`, `partially_achieved`, `not_achieved`) are restricted to clinicians and practice managers.

---

## 4. Domain Relationships & Provenance

### Patient Relationship
- Every Treatment Plan belongs strictly to a single patient: `patient_id UUID NOT NULL REFERENCES public.patients(id)`.
- Enforced via composite foreign key `(patient_id, practice_id) REFERENCES patients(id, practice_id)`.

### Episode of Care Relationship
- Every Treatment Plan belongs strictly to an Episode of Care representing the specific condition or case being rehabilitated: `episode_id UUID NOT NULL REFERENCES public.episodes_of_care(id)`.
- Enforced via composite foreign key `(episode_id, patient_id, practice_id) REFERENCES episodes_of_care(id, patient_id, practice_id)`.

### Clinical Visit Relationship (Optional Originating Encounter)
- A Treatment Plan may optionally link to the originating Clinical Visit encounter where the plan was formulated: `originating_clinical_visit_id UUID REFERENCES public.clinical_visits(id)`.
- Optional (`NULL` allowed for plans formulated during initial triage or between encounters).
- Enforced via composite foreign key `(originating_clinical_visit_id, patient_id, practice_id) REFERENCES clinical_visits(id, patient_id, practice_id)`.

### Clinical Note Relationship
- A Clinical Note (SOAP) may reference an active Treatment Plan in its `Plan` section.
- The Treatment Plan remains the authoritative record; details are not duplicated into unstructured text fields.

### Outcome Measure Integration
- Goals within a Treatment Plan can link to a baseline `outcome_measure_assessment_id` and specify target outcome thresholds.
- Treatment Plans do not automatically create, alter, or delete Outcome Measure assessment records.

### Home Exercise Program (HEP) Integration
- A Treatment Plan guides what exercises should be prescribed, but does not embed exercise items.
- HEP records remain independent; the Treatment Plan UI may display linked active HEP status for cross-domain awareness.

---

## 5. Domain Model & Entities

### 1. `public.practice_treatment_plan_counters`
- Atomic sequential counter table guaranteeing race-safe, gapless generation of human-readable identifiers formatted as `TPL-000001`.
- Governed by `SECURITY DEFINER` function `public.generate_next_treatment_plan_identifier(p_practice_id UUID)`.

### 2. `public.treatment_plans`
The primary container representing the rehabilitation strategy:
- `id`: UUID primary key.
- `practice_id`: UUID practice tenant boundary.
- `patient_id`: UUID patient recipient.
- `episode_id`: UUID mandatory episode context.
- `originating_clinical_visit_id`: UUID optional originating encounter link.
- `prescribing_clinician_id`: UUID responsible clinician (validated against `practice_memberships`).
- `plan_identifier`: Unique human-readable code (`TPL-000001`).
- `title`: Descriptive title (e.g. "Post-Op ACL Reconstruction Protocol - Phase 1").
- `diagnosis_summary`: Clinical diagnosis / problem summary.
- `clinical_rationale`: Clinical reasoning and therapeutic approach.
- `overall_goals_summary`: High-level patient outcome summary.
- `treatment_frequency`: Expected attendance cadence (e.g. "2x weekly for 6 weeks, then 1x weekly").
- `expected_duration_weeks`: Estimated duration in weeks.
- `start_date`: Start date of the plan.
- `target_review_date`: Scheduled date for progress re-evaluation.
- `status`: State machine status (`draft`, `active`, `paused`, `completed`, `discontinued`).
- `finalized_at`: Timestamp when the plan was locked and activated.
- `finalized_by`: Clinician who activated the plan.
- `discontinued_reason`: Mandatory justification if discontinued.
- `created_at`, `updated_at`, `created_by`, `updated_by`.

### 3. `public.treatment_plan_goals`
Structured clinical goals assigned to the plan:
- `id`: UUID primary key.
- `practice_id`: UUID tenant boundary.
- `treatment_plan_id`: UUID reference to `treatment_plans`.
- `order_index`: Integer ordering index (1, 2, 3...).
- `goal_statement`: Explicit measurable clinical goal statement.
- `category`: Functional domain (`range_of_motion`, `strength`, `pain_reduction`, `functional`, `balance`, `mobility`, `other`).
- `baseline_description`: Initial clinical status at plan inception.
- `target_description`: Target milestone or functional criterion.
- `measurement_method`: Method of evaluation (e.g. "Goniometer", "LEFS Questionnaire", "10m Walk Test").
- `target_timeframe_weeks`: Target duration to achieve goal.
- `priority`: Priority level (`low`, `medium`, `high`).
- `status`: Goal lifecycle state (`draft`, `active`, `achieved`, `partially_achieved`, `not_achieved`, `discontinued`).
- `review_date`: Date goal was evaluated.
- `achieved_date`: Date goal was marked achieved.
- `notes`: Evaluative notes.
- `baseline_outcome_assessment_id`: UUID optional link to `outcome_measure_assessments`.
- `target_outcome_assessment_id`: UUID optional link to `outcome_measure_assessments`.
- `created_at`, `updated_at`.

---

## 6. Treatment Plan Lifecycle & State Machine

```text
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

### Valid Statuses & Transitions
- `draft` $\rightarrow$ `active` (sets `finalized_at`, `finalized_by`, activates goals)
- `draft` $\rightarrow$ `discontinued`
- `active` $\rightarrow$ `paused`
- `active` $\rightarrow$ `completed` (all goals resolved)
- `active` $\rightarrow$ `discontinued` (requires mandatory reason)
- `paused` $\rightarrow$ `active`
- `paused` $\rightarrow$ `discontinued`
- `completed` $\rightarrow$ [TERMINAL, no transitions]
- `discontinued` $\rightarrow$ [TERMINAL, no transitions]

### Goal Lifecycle
- Goals authored during `draft` have status `draft`.
- Activating the plan activates all draft goals to `active`.
- While the plan is `active`, clinicians evaluate goals as:
  - `achieved`: Goal fulfilled.
  - `partially_achieved`: Progress made but not fully met.
  - `not_achieved`: Unmet during timeframe.
  - `discontinued`: Discarded due to revised clinical indications.

---

## 7. Medico-Legal Immutability & Hard Delete Protection

1. **Finalized Plan Protection:**
   - Activating a Treatment Plan sets `finalized_at` and `finalized_by`.
   - Database triggers prevent mutating identity fields or deleting baseline goals once active.
2. **Zero Hard Deletes:**
   - `DELETE` on `treatment_plans` is strictly blocked by database triggers and RLS policies (`USING (false)`).
   - If a plan is no longer indicated, it is moved to `discontinued` with clinical reason metadata.
3. **Historical Goals Preservation:**
   - Historical goals belonging to finalized plans cannot be hard deleted.

---

## 8. Tenant Isolation & Multi-Tenancy

- Every database query and write enforces `practice_id = public.current_practice_id()`.
- Multi-tenant Composite Foreign Keys:
  - `fk_treatment_plans_patient_practice`: `(patient_id, practice_id) REFERENCES patients(id, practice_id)`
  - `fk_treatment_plans_episode_patient_practice`: `(episode_id, patient_id, practice_id) REFERENCES episodes_of_care(id, patient_id, practice_id)`
  - `fk_treatment_plans_visit_patient_practice`: `(originating_clinical_visit_id, patient_id, practice_id) REFERENCES clinical_visits(id, patient_id, practice_id)`
  - `fk_tp_goals_plan_practice`: `(treatment_plan_id, practice_id) REFERENCES treatment_plans(id, practice_id)`
- PostgREST Foreign Key Disambiguation:
  - All PostgREST queries explicitly specify foreign key hints to prevent `PGRST201` relationship ambiguity regressions.

---

## 9. Clinician Validation

- Responsible clinician (`prescribing_clinician_id`) must hold an active membership in the target practice with role in `['practice_owner', 'practice_manager', 'physiotherapist']`.
- Validated at both service layer and database trigger level.

---

## 10. Audit Trail Integration

All key lifecycle events are dispatched to `public.audit_events` via `public.log_audit_event()`:
- `treatment_plan.created`: Initial plan drafting
- `treatment_plan.updated`: Draft metadata modifications
- `treatment_plan.activated`: Plan activation and baseline goal lock
- `treatment_plan.paused`: Temporary clinical pause
- `treatment_plan.resumed`: Resumption of paused plan
- `treatment_plan.completed`: Rehabilitation plan completion
- `treatment_plan.discontinued`: Plan discontinuation with reason
- `treatment_goal.created`: Goal added to plan
- `treatment_goal.updated`: Goal details updated
- `treatment_goal.status_changed`: Goal evaluation status updated

---

## 11. Domain Firewall & Scope Boundaries

Physenra strictly enforces a domain firewall. Creating, updating, or finalizing a Treatment Plan will **NEVER**:
- Generate an invoice or billing line item
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
- Automatically generate or prescribe an HEP
