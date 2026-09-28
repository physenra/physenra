# PHYSENRA CLINICAL OUTCOME MEASURES FOUNDATION V1 SPECIFICATION & DESIGN

## 1. Purpose

The Clinical Outcome Measures Foundation establishes the structured clinical assessment and measurement layer for Physenra.

The purpose is to provide standardized, objective, and longitudinal tracking of patient functional status, impairment, mobility, and symptom severity across episodes of care and clinical encounters, without compromising narrative documentation or mixing transactional billing data.

---

## 2. Clinical Domain Relationship & Architectural Separation

Physenra enforces an absolute domain separation across the clinical care continuum:

$$\text{Patient} \neq \text{Episode of Care} \neq \text{Appointment} \neq \text{Clinical Visit} \neq \text{Clinical Note} \neq \text{Clinical Outcome Measure}$$

| Entity | Core Responsibility | Persistence Nature |
| :--- | :--- | :--- |
| **Patient** | Durable human identity & demographic record | Entity root |
| **Episode of Care** | Clinically meaningful course of treatment for a condition | Clinical container |
| **Appointment** | Scheduled calendar slot and operational intent | Administrative slot |
| **Clinical Visit** | Actual encounter execution, attendance, and timing | Operational occurrence |
| **Clinical Note** | Narrative clinical evaluation and reasoning (SOAP) | Narrative documentation |
| **Clinical Outcome Measure** | Standardized, structured assessment score and clinical metric | Quantitative measurement |

### Core Architectural Invariant
$$\text{Clinical Outcome Measure} \neq \text{Clinical Note}$$

- An outcome measure is a standardized, structured clinical assessment with quantitative scores or categorized results.
- A clinical note is a clinical narrative (Subjective, Objective, Assessment, Plan).
- A Clinical Visit may exist without an outcome measure.
- A Clinical Note may exist without an outcome measure.
- An outcome measure record must NEVER be stored inside clinical notes as its authoritative storage.
- A clinical note may display or cite an outcome measure result in a future controlled integration, but the outcome measure remains its own first-class database entity.

---

## 3. Patient Relationship

- Every outcome measure assessment strictly belongs to a specific patient: `patient_id NOT NULL REFERENCES public.patients(id)`.
- Patients may have multiple outcome measure assessments over time across different measures and episodes.
- Outcome measures are strictly partitioned by practice tenancy; patients cannot have outcome measures assigned across practices.

---

## 4. Episode of Care Relationship

- An outcome measure assessment can be linked to an ongoing `episode_id` (`REFERENCES public.episodes_of_care(id)`).
- This linkage is optional (`NULL` allowed for standalone intake evaluations or general assessments).
- When linked, a composite foreign key `(episode_id, patient_id, practice_id)` ensures that the episode strictly belongs to the same patient and practice context.

---

## 5. Clinical Visit Relationship

- An outcome measure may be administered during an encounter (`clinical_visit_id REFERENCES public.clinical_visits(id)`).
- This linkage is optional (`NULL` allowed for assessments performed outside a formal visit, e.g., remote intake, baseline questionnaire, or post-discharge follow-up).
- When linked, a composite foreign key `(clinical_visit_id, patient_id, practice_id)` guarantees that the visit belongs to the identical patient and practice context.
- A Clinical Visit does not automatically create an outcome measure.

---

## 6. Measure Definition Architecture

Physenra separates **WHAT** is being measured from **WHEN** it was administered:

### `public.outcome_measure_definitions`
Represents the catalogue of standardized instruments and custom practice assessments:
- `id`: UUID primary key.
- `practice_id`: UUID nullable. When `NULL`, the definition represents a system-wide standardized measure (e.g., NPRS, LEFS, QuickDASH). When set, it represents a practice-specific custom measure.
- `code`: Monotonic string code (e.g. `NPRS`, `VAS`, `LEFS`, `ODI`, `NDI`, `QUICKDASH`, `TUG`, `PSFS`, `BBS`).
- `name`: Full descriptive title (e.g. "Lower Extremity Functional Scale").
- `description`: Clinical guidance and purpose.
- `category`: Functional domain (`pain`, `functional`, `mobility`, `quality_of_life`).
- `scoring_type`: Mode of score calculation (`numeric`, `percentage`, `timed_seconds`, `points_scale`).
- `min_score`, `max_score`: Boundary values for score validation.
- `score_unit`: Descriptive unit (e.g. `/10`, `/80`, `%`, `seconds`, `points`).
- `interpretation_guide`: Clinically validated reference points (e.g. MCID thresholds).
- `is_system`: Boolean flag indicating built-in evidence-based catalogue entries.
- `is_active`: Operational toggle for practice usage.

---

## 7. Measure Administration Architecture

### `public.outcome_measure_assessments`
Represents a discrete clinical measurement administration event:
- `id`: UUID primary key.
- `practice_id`: UUID practice tenant boundary.
- `patient_id`: UUID patient recipient.
- `episode_id`: UUID optional episode context.
- `clinical_visit_id`: UUID optional encounter context.
- `measure_definition_id`: UUID reference to `outcome_measure_definitions`.
- `assessor_id`: UUID clinician administering or recording the assessment.
- `assessment_identifier`: Monotonic sequential code (`OUT-000001`).
- `assessment_type`: Milestone designation (`baseline`, `interim`, `discharge`, `follow_up`, `routine`).
- `status`: Lifecycle state (`draft`, `finalized`, `amended`).
- `performed_at`: Precise timestamp when the assessment took place.

---

## 8. Score/Result Model

The assessment record accommodates structured, quantitative physiotherapy metrics:
1. `numeric_score`: Primary quantitative value (e.g., NPRS `7`, LEFS `64`, TUG `9.4`).
2. `percentage_score`: Standardized percentage (0–100%) for normalized disability or functional indices (e.g., ODI `28%`, QuickDASH `34.1%`).
3. `score_category`: Qualitative severity rating based on established clinical scoring bands (e.g., `mild_impairment`, `moderate_disability`, `severe_pain`).
4. `score_interpretation`: Clinician or guideline synthesis (e.g., "Normal mobility for community-dwelling adult; fall risk low").
5. `clinical_notes`: Qualitative context regarding patient execution, fatigue, or compensatory movements.

---

## 9. Measurement History & Longitudinal Tracking

- Every assessment is a discrete, timestamped historical record.
- Baseline, interim, and discharge scores are recorded as independent rows.
- Progress trajectories are derived by querying assessments for a patient or episode chronologically.
- Assessments are never collapsed into a single current state.

---

## 10. Repeat Assessments & Milestone Tracking

Assessments support repeat administrations across clinical milestones:
- `baseline`: Initial evaluation prior to intervention.
- `interim`: Periodic re-evaluation (e.g. 4–6 weeks into rehabilitation).
- `discharge`: Conclusion of episode of care.
- `follow_up`: Post-discharge retention or maintenance check.
- `routine`: Standard encounter measurement (e.g. session-by-session pain score).

Previous assessment records are **never overwritten**. Each repeat measurement creates a new row with its own identifier.

---

## 11. Versioning Strategy

- Standard measure definitions are immutable in definition structure.
- If a scoring model or question battery changes across literature versions, a new definition row is created (e.g. `DASH_V1`, `QUICKDASH_V2`).
- Existing completed assessments permanently link to the exact definition ID under which they were administered.

---

## 12. Role-Based Access Control (RBAC)

Access is strictly managed via existing practice memberships:
- **SELECT (View):** `practice_owner`, `practice_manager`, `physiotherapist`, `receptionist`, `biller`.
- **INSERT (Administer):** `practice_owner`, `practice_manager`, `physiotherapist`.
- **UPDATE (Draft Edits & Finalization):** `practice_owner`, `practice_manager`, `physiotherapist`.
- **AMEND (Correct Finalized):** `practice_owner`, `practice_manager`, `physiotherapist`.
- **DELETE:** Strictly DENIED across all roles (`USING (false)`).
- **MANAGE DEFINITIONS:** `practice_owner`, `practice_manager`.

---

## 13. Tenant Isolation & Composite Keys

Multi-tenant isolation is enforced at both database and application levels:
- `practice_id = public.current_practice_id()` on all RLS policies.
- Composite Foreign Keys prevent cross-practice contamination:
  - `(patient_id, practice_id)` references `patients(id, practice_id)`
  - `(episode_id, patient_id, practice_id)` references `episodes_of_care(id, patient_id, practice_id)`
  - `(clinical_visit_id, patient_id, practice_id)` references `clinical_visits(id, patient_id, practice_id)`
- Trigger verifies that custom measure definitions belong to the same practice as the assessment.

---

## 14. Assessor Validation Trigger

- Assessor (`assessor_id`) must hold an active membership in the target practice.
- Assessor must possess an authorized clinical role (`practice_owner`, `practice_manager`, `physiotherapist`).
- Administrative staff (`receptionist`, `biller`) cannot administer outcome measures.

---

## 15. Immutability & Finalized Protection

1. **Identity Immutability:** `id`, `practice_id`, `patient_id`, `assessment_identifier`, and `measure_definition_id` cannot be modified under any circumstances.
2. **Finalized Content Protection:** Once an assessment is `finalized`:
   - `numeric_score`, `percentage_score`, `score_category`, `assessor_id`, `performed_at`, `finalized_at`, and `finalized_by` are permanently locked.
   - Any correction requires an explicit transition to `amended` status with a mandatory `amendment_reason` and recording of `corrected_by`.
3. **Hard Delete Prohibition:** Hard deletes are denied at the database policy level (`USING (false)`).

---

## 16. Clinical Note Relationship

- Clinical Notes represent narrative documentation (SOAP).
- Outcome Measures represent structured assessment metrics.
- A Clinical Note page may query and display outcome measures administered during that encounter or episode.
- The authoritative score is **never duplicated** into the SOAP note text fields as a database source of truth.

---

## 17. Future Treatment Plan Relationship

- Future treatment plan modules will reference baseline outcome measures to establish quantifiable rehabilitation goals.
- Outcome measures remain independent; treatment plans will link via foreign keys.

---

## 18. Future Home Exercise Program (HEP) Relationship

- Future exercise prescription modules may suggest functional progressions based on outcome measure scores (e.g., LEFS < 40).
- Outcome measures do not trigger automated exercise assignments in V1.

---

## 19. Future Reporting & Analytics Relationship

- Aggregated outcome reporting (e.g. practice-wide improvement percentages, MCID achievement rates) will query finalized assessments directly.
- The normalized score model (`numeric_score`, `percentage_score`, `performed_at`) is designed for performant indexing and longitudinal reporting.

---

## 20. Testing Strategy

Automated verification suite `tests/clinical_outcome_measures.test.cjs` validates:
1. Schema completeness, UUID primary keys, and composite FKs.
2. Sequential identifier generator (`OUT-000001`).
3. RLS policies and tenant isolation.
4. Assessor role validation trigger.
5. Immutability trigger guarding finalized scores and identity.
6. Zero hard deletes of clinical assessments.
7. Domain firewall confirming zero billing, packages, wallets, or AI tables.
8. Regression of all prior test suites.

---

## 21. Domain Side-Effect Firewall

The Clinical Outcome Measures domain is completely decoupled from administrative and future modules:
- **NO Billing / Invoicing:** Recording an assessment does not compute fees or generate bills.
- **NO Packages / Wallets:** Recording an assessment does not deduct sessions or consume prepaid credits.
- **NO Insurance:** Does not submit claims or pre-authorizations.
- **NO Communications:** Does not send SMS, WhatsApp, or emails.
- **NO AI:** Does not execute predictive scoring, automated summaries, or generative treatment recommendations.
