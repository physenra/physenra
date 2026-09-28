# Physenra — Milestone & Progress Review Foundation V1 Specification

## 1. What a Progress Review Is
A **Progress Review** is a structured, longitudinal clinical evaluation of a patient's progress toward their formulated **Treatment Plan** and **Clinical Goals** across an active Episode of Care. It represents an authoritative periodic assessment conducted by a qualified physiotherapist to determine whether the patient is progressing as anticipated, encountering functional or physiological barriers, or requiring clinical modifications to their plan of care. It synthesizes objective findings, subjective patient feedback, goal attainment levels, and outcome measurements into a formal clinical evaluation.

## 2. What a Milestone Is
A **Milestone** in Physenra represents a clinically significant achievement checkpoint or goal attainment event within the longitudinal rehabilitation trajectory. Milestones correspond to targeted functional capabilities, timeframes, or outcome measure thresholds specified in the Treatment Plan's Clinical Goals (e.g., reaching 90 degrees of knee flexion by Week 4, ambulating 500m independently, or achieving an MCID improvement on a validated patient-reported outcome measure). Progress Reviews serve as the formal clinical evaluation vehicle where milestones and goals are systematically evaluated, documented, and verified.

## 3. Who Creates a Progress Review
A Progress Review is created exclusively by an authenticated clinician holding an active clinical role (`physiotherapist`, `practice_owner`, or `practice_manager` with clinical qualification) within the patient's practice tenant. Front desk personnel, billers, and unauthenticated external entities are strictly prohibited from creating Progress Reviews.

## 4. Who Can View It
Progress Reviews can be viewed by authenticated practice members who possess clinical, managerial, or operational roles (`practice_owner`, `practice_manager`, `physiotherapist`) within the same practice tenant. Tenant isolation is enforced at the database layer via Row-Level Security (RLS) where `practice_id = public.current_practice_id()`. Cross-practice read access is rejected.

## 5. Who Can Edit It
- **Draft Reviews**: Can be edited only by authenticated clinicians within the tenant.
- **Finalized Reviews**: Are clinically locked and immutable. Core clinical assessment, finalization timestamps, and historical goal reviews cannot be silently modified or overwritten.
- **Amended Reviews**: Permitted only through a controlled amendment process requiring an explicit clinical justification (`amendment_reason`), recording the amending clinician (`amended_by`), and setting the amendment timestamp (`amended_at`) without erasing the original finalization history.

## 6. Relationship to Patient
Every Progress Review belongs to exactly one `Patient` within the active `Practice` tenant via a composite foreign key `(patient_id, practice_id) REFERENCES patients(id, practice_id)`. Mismatches between the review tenant and patient tenant are impossible.

## 7. Relationship to Episode of Care
Every Progress Review belongs to exactly one `Episode of Care` via a multi-tenant composite foreign key `(episode_id, patient_id, practice_id) REFERENCES episodes_of_care(id, patient_id, practice_id)`. This guarantees that a Progress Review cannot reference an Episode of Care belonging to another patient or practice.

## 8. Relationship to Treatment Plan
Every Progress Review evaluates exactly one active or previously formulated `Treatment Plan`. A composite foreign key `(treatment_plan_id, patient_id, episode_id, practice_id) REFERENCES treatment_plans(id, patient_id, episode_id, practice_id)` ensures that a Progress Review cannot evaluate a Treatment Plan from a different patient, episode, or practice tenant.

## 9. Relationship to Clinical Goals
A Progress Review evaluates the specific, measurable `treatment_plan_goals` established under the associated Treatment Plan. Each evaluated goal is recorded in `progress_review_goals`, capturing the point-in-time progress status, measured value, measurement method, and clinician assessment without altering the underlying authoritative goal definition or baseline.

## 10. Relationship to Clinical Visit
A Progress Review may optionally originate from or be associated with a specific `Clinical Visit` via an optional provenance reference `(originating_clinical_visit_id, patient_id, practice_id) REFERENCES clinical_visits(id, patient_id, practice_id)`. However, a Clinical Visit is only an encounter container; a Progress Review can also be documented as a standalone longitudinal evaluation. A Progress Review does NOT replace or merge with a Clinical Visit.

## 11. Relationship to Clinical Note
A Clinical Note (such as a daily SOAP note) documents the specific interventions and observations of an individual encounter. A Progress Review represents an overarching longitudinal review across multiple visits or a defined episode period. While a Clinical Note may reference that a Progress Review occurred, the full Progress Review editor and longitudinal data structures remain completely separate from SOAP notes.

## 12. Relationship to Outcome Measures
Progress Reviews frequently incorporate objective measurements by referencing existing `outcome_measure_assessments` (e.g., comparing baseline assessment, intermediate assessments, and target scores). A Progress Review does NOT duplicate outcome measure definitions or raw scoring instruments, nor does it create synthetic outcome assessments.

## 13. Relationship to Home Exercise Program (HEP)
A Progress Review may reference the patient's prescribed Home Exercise Program and note clinical exercise tolerance or prescribed modifications. However, the Progress Review does NOT duplicate exercise prescriptions, does NOT modify HEP items automatically, and does NOT implement patient adherence tracking.

## 14. Review Date & Period
Every Progress Review explicitly documents:
- `review_date`: The calendar date on which the clinical review was conducted.
- `period_start_date` / `period_end_date`: Optional dates defining the clinical interval evaluated (e.g., Weeks 1–4 of the episode).
- `next_review_due_date`: Recommended next milestone or formal progress review date.

## 15. Progress Status
The Progress Review lifecycle adheres to strict states:
- `draft`: In-progress clinical review; editable by clinicians.
- `finalized`: Completed, signed, and locked medical record; immutable.
- `amended`: Formally updated with documented clinical rationale, preserving original finalization metadata.

Overall clinical progress assessment ratings:
- `significant_improvement`
- `progressing`
- `slow_progress`
- `plateaued`
- `regressed`
- `goals_met`

Plan recommendations:
- `continue_current_plan`
- `modify_goals`
- `advance_interventions`
- `reduce_frequency`
- `prepare_discharge`

## 16. Goal-by-Goal Progress
A Progress Review evaluates each target goal established in the Treatment Plan. For each goal evaluated, a record in `progress_review_goals` captures:
- `treatment_plan_goal_id`: Reference to the authoritative goal.
- `status_at_review`: Point-in-time status (`in_progress`, `achieved`, `partially_achieved`, `not_achieved`, `discontinued`).
- `current_value`: Current qualitative or quantitative measurement.
- `measurement_method`: Clinical measurement method (e.g., goniometer, dynamometer, verbal rating).
- `clinician_assessment`: Structured evaluation of progress toward target.
- `progress_notes`: Qualitative commentary and clinical observations.
- `linked_outcome_assessment_id`: Optional link to an outcome measure assessment performed during or near the review.

## 17. Baseline vs Current vs Target
The Progress Review presents the clinician with the baseline and target values defined in the Treatment Plan Goal alongside the newly measured current value. The original baseline and target are read-only and preserved for historical integrity.

## 18. Clinical Interpretation
The clinician documents an overarching `clinical_summary`, identifying physiological recovery, functional gains, and overall trajectory. In addition, the clinician records `barriers_identified` (e.g., patient compliance, biomechanical compensations, pain exacerbation, psychosocial factors) and `treatment_modifications`.

## 19. Recommendations
The clinician selects a formal `plan_recommendation` (`continue_current_plan`, `modify_goals`, `advance_interventions`, `reduce_frequency`, `prepare_discharge`) to guide subsequent treatment sessions and scheduling.

## 20. Historical Integrity & Immutability
Progress Reviews form part of the permanent medical record. Once finalized:
- No database update can silently alter clinical summaries, clinician IDs, or goal reviews.
- Trigger `trg_protect_progress_review_immutability` blocks unauthorized updates.
- Trigger `trg_deny_progress_review_hard_delete` prohibits `DELETE` operations on finalized reviews.
- Corrections must follow the formal amendment path (`status = 'amended'`).

## 21. Finalization
Finalization locks the review:
- `overall_status` transitions from `draft` to `finalized`.
- `finalized_at` is stamped with the server timestamp (`now()`).
- `finalized_by` is stamped with the authenticated clinician's user ID (`auth.uid()`).
- Database triggers verify that all required clinical fields and goal reviews are present.

## 22. Audit Logging
All lifecycle transitions are recorded in `public.audit_events` via `public.log_audit_event`:
- `progress_review.created`
- `progress_review.updated`
- `progress_review.finalized`
- `progress_review.amended`
Capturing practice ID, actor ID, entity ID, review identifier, and metadata.

## 23. Tenant Isolation
Tenant isolation is enforced comprehensively:
- Every table has a `practice_id UUID NOT NULL REFERENCES practices(id)` column.
- Row-Level Security (RLS) is enabled with `practice_id = public.current_practice_id()`.
- Multi-tenant composite foreign keys prevent any cross-tenant data referencing.

## 24. Role-Based Access Control (RBAC)
- `practice_owner`, `practice_manager`: Full management, creation, review, and amendment permissions.
- `physiotherapist`: Clinical creation, drafting, finalization, and amendment permissions within their assigned practice.
- `receptionist`, `biller`: Read-only access to progress review metadata for operational scheduling coordination if permitted, zero edit/finalize permissions.
- `patient`: Zero direct administrative or write access.

## 25. Relationship to Future Discharge Summary
A Progress Review is NOT a Discharge Summary. While a Progress Review may include the recommendation `prepare_discharge` when goals are met, the formal closure of an episode, discharge rationale, follow-up instructions, and permanent episode archival belong to the future **Discharge Summary** domain. Progress Reviews provide the longitudinal evidentiary basis that will feed into the future Discharge Summary.

## 26. Domain Firewall
The Milestone & Progress Review domain has a strict firewall against:
- **Financial / Billing**: Zero creation or modification of invoices, invoice items, fee schedules, payments, refunds, wallets, packages, or insurance claims.
- **Communication & AI**: Zero automated triggers for WhatsApp messages, marketing emails, external notifications, or AI processing pipelines.
- **Clinical Domains**: Zero automatic generation of Clinical Visits, SOAP notes, Outcome Measure definitions, HEP prescriptions, or Discharge Summaries.
