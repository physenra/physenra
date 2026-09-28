# Physenra — Discharge Summary Foundation V1 Specification

## 1. What a Discharge Summary Is
A **Discharge Summary** is the formal clinical closure document for an Episode of Care in Physenra. It synthesizes the completed course of physiotherapy care, reconciles goal attainment against the formulated Treatment Plan, documents discharge functional status, references objective outcome measure deltas, and outlines long-term self-management, Home Exercise Program (HEP) transitions, and follow-up recommendations.

## 2. When It May Be Created
A Discharge Summary may be created when an Episode of Care is active, paused, or completed, in preparation for or concluding formal clinical discharge. It cannot be created for an archived episode. An Episode of Care may have at most one Discharge Summary (`UNIQUE (episode_id)`).

## 3. Who May Create It
A Discharge Summary may only be created by an authenticated clinician holding an active clinical membership in the practice (`practice_owner`, `practice_manager`, `physiotherapist`). Administrative staff, billers, and unauthenticated external entities are strictly prohibited from creating Discharge Summaries.

## 4. Who May View It
Discharge Summaries may be viewed by authenticated practice members who possess authorized practice roles (`practice_owner`, `practice_manager`, `physiotherapist`, `receptionist`, `biller`) within the same practice tenant. Cross-practice read access is denied by Row-Level Security (RLS) where `practice_id = public.current_practice_id()`.

## 5. Who May Edit It
- **Draft Summaries**: Editable exclusively by authenticated clinicians within the tenant.
- **Finalized Summaries**: Permanent and immutable. In-place edits to clinical summaries, disposition, or dates are prohibited.
- **Amended Summaries**: Permitted only through formal clinical amendment requiring a documented clinical rationale (`amendment_reason`), recording the amending clinician and timestamp, while preserving original finalization provenance.

## 6. Relationship to Episode of Care
Every Discharge Summary belongs to exactly one `Episode of Care` via a multi-tenant composite foreign key `(episode_id, patient_id, practice_id) REFERENCES episodes_of_care(id, patient_id, practice_id)`. Each Episode of Care has at most one Discharge Summary (`UNIQUE (episode_id)`).

## 7. Relationship to Patient
Every Discharge Summary belongs to exactly one `Patient` within the active `Practice` tenant via a composite foreign key `(patient_id, practice_id) REFERENCES patients(id, practice_id)`. Mismatches between patient and episode are prevented at the database constraint level.

## 8. Relationship to Treatment Plan
The Discharge Summary optionally references the primary formulated `Treatment Plan` via `(treatment_plan_id, patient_id, episode_id, practice_id) REFERENCES treatment_plans(id, patient_id, episode_id, practice_id)`. The Treatment Plan is preserved as the strategic rehabilitation baseline.

## 9. Relationship to Clinical Goals
The Discharge Summary synthesizes goal attainment from the Treatment Plan's `treatment_plan_goals`. It documents whether goals were achieved, partially achieved, plateaued, or revised. It does NOT overwrite or mutate the authoritative `treatment_plan_goals` table.

## 10. Relationship to Progress Reviews
The Discharge Summary optionally references the final relevant `Progress Review` (`final_progress_review_id`) that preceded discharge. It incorporates evidence from longitudinal evaluations without duplicating or modifying historical progress reviews.

## 11. Relationship to Outcome Measures
The Discharge Summary optionally references the baseline and discharge `outcome_measure_assessments`. It documents the objective delta (e.g., initial QuickDASH 68% $\rightarrow$ discharge QuickDASH 14%) without creating synthetic assessments or mutating raw scoring tables.

## 12. Relationship to Clinical Visits
The Discharge Summary may optionally reference the originating final clinical encounter (`originating_clinical_visit_id`) during which the discharge evaluation took place. However, the encounter itself is encapsulated in the Clinical Visit; the Discharge Summary is an episode closure document.

## 13. Relationship to Clinical Notes
Clinical Notes (daily SOAP notes) capture session-by-session interventions. The Discharge Summary provides a longitudinal synthesis of the entire episode. A SOAP note may reference that a discharge summary was completed, but the documents remain structurally decoupled.

## 14. Relationship to Home Exercise Program (HEP)
The Discharge Summary documents the patient's transition from active supervised therapy to home self-management, referencing whether the active HEP is maintained, modified, or transitioned to independent community fitness. It does NOT mutate HEP prescription items or implement patient adherence tracking.

## 15. Discharge Reason & Disposition
Controlled clinical vocabulary:
- **Discharge Reasons (`discharge_reason`)**:
  - `goals_achieved`: Primary rehabilitation objectives achieved.
  - `goals_partially_achieved`: Functional plateau reached with partial goal attainment.
  - `patient_independent`: Patient capable of independent symptom and functional self-management.
  - `plateau`: Maximum medical improvement reached without further expected gains.
  - `patient_choice`: Patient discontinued care voluntarily.
  - `transfer_of_care`: Care transitioned to another physical therapist or specialist.
  - `referred_elsewhere`: Referred to medical specialist, surgical consult, or tertiary care.
  - `lost_to_follow_up`: Patient ceased attending without formal notice.
  - `financial_administrative`: Insurance/payer limits or administrative factors.
  - `other`: Clinician-specified unique reason.
- **Discharge Disposition (`discharge_disposition`)**:
  - `discharged_to_self_management`: Independent home maintenance.
  - `discharged_with_home_program`: Discharged with prescribed independent exercise regimen.
  - `follow_up_with_referrer`: Returned to primary care physician or referring orthopaedic surgeon.
  - `transferred_to_other_provider`: Transferred to another rehabilitation clinic or provider.
  - `continued_care_elsewhere`: Relocated or continuing care at external facility.
  - `other`: Other documented disposition.

## 16. Goal Attainment Reconciliation
The clinician documents an explicit narrative reconciliation (`goal_attainment_summary`) reviewing functional, physiological, and mobility milestones established in the Treatment Plan.

## 17. Outcome Measure Discharge Status
The clinician synthesizes validated objective test improvements (`outcome_measure_summary`), comparing admission baselines against discharge assessments.

## 18. Functional Status at Discharge
A dedicated clinical field (`functional_status_at_discharge`) captures the patient's final physical capabilities, weight-bearing tolerance, range of motion, work capacity, and athletic clearance.

## 19. Clinical Summary
The overarching narrative (`clinical_summary`) provides a comprehensive overview of the condition course, interventions delivered, treatment response, and resolution of presenting impairments.

## 20. Recommendations
General recommendations (`recommendations`) regarding activity modification, biomechanical hygiene, ergonomic adjustments, and symptom recurrence protocols.

## 21. HEP Transition
The Discharge Summary details independent home exercise maintenance (`hep_transition_summary`), providing guidance for long-term functional preservation.

## 22. Follow-Up Recommendations
The clinician specifies recommended follow-up actions (`follow_up_recommendations`), such as physician review in 6 weeks, annual checkup, or re-referral triggers.

## 23. Finalization
Finalizing a Discharge Summary marks the formal clinical conclusion of the episode:
- Transitions `status` from `draft` to `finalized`.
- Sets `finalized_at = now()` and `finalized_by = auth.uid()`.
- Atomically transitions the parent `episodes_of_care.status` to `'completed'`, stamping `closed_at` and `closed_by`.
- Locks the record against subsequent in-place modifications via database triggers.

## 24. Amendment
If corrections or supplementary clinical observations are required post-finalization:
- Transitions `status` from `finalized` to `amended`.
- Requires a non-empty `amendment_reason`.
- Sets `amended_at = now()` and `amended_by = auth.uid()`.
- Preserves original finalization provenance (`finalized_at`, `finalized_by`).

## 25. Historical Integrity & Immutability
Discharge Summaries form part of the permanent medical record:
- Finalized records cannot be modified without a formal amendment.
- Hard `DELETE` operations on finalized or amended summaries are strictly denied by triggers and RLS.

## 26. Audit Logging
All lifecycle transitions are recorded in `public.audit_events` via `public.log_audit_event`:
- `discharge_summary.created`
- `discharge_summary.updated`
- `discharge_summary.finalized`
- `discharge_summary.amended`
- `discharge_summary.deleted` (drafts only)

## 27. Tenant Isolation
Enforced at the schema and database layer:
- `practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE RESTRICT`.
- Row-Level Security enabled on all tables with `practice_id = public.current_practice_id()`.
- Composite foreign keys enforce multi-tenant relationship coherence.

## 28. Role-Based Access Control (RBAC)
- `practice_owner`, `practice_manager`: Full management, creation, finalization, and amendment permissions.
- `physiotherapist`: Clinical creation, drafting, finalization, and amendment within their assigned practice.
- `receptionist`, `biller`: Read-only access for scheduling and administrative coordination.
- `patient`: Zero administrative or write access.

## 29. Episode Closure Semantics
Upon finalization of the Discharge Summary, trigger `trg_discharge_summary_close_episode`:
1. Verifies that the parent `episodes_of_care` is not `archived`.
2. Updates `episodes_of_care`:
   - `status := 'completed'`
   - `closed_at := COALESCE(closed_at, now())`
   - `closed_by := COALESCE(closed_by, auth.uid())`
   - `end_date := COALESCE(end_date, NEW.discharge_date)`
   - `updated_at := now()`
This guarantees that finalizing a discharge summary and completing the episode of care are 100% atomic and cannot drift into inconsistent states.

## 30. Domain Firewall
The Discharge Summary domain maintains an absolute firewall against:
- **Billing / Financial**: Zero creation or modification of invoices, invoice items, fee schedules, payments, refunds, wallets, packages, or insurance claims.
- **Communication & AI**: Zero triggers for WhatsApp messages, marketing emails, external notifications, or AI inference jobs.
- **Other Clinical Modules**: Zero automatic creation of Clinical Visits, SOAP notes, Outcome Measure definitions, HEP prescriptions, or Treatment Plans.
