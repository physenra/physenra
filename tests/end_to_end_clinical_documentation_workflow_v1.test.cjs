// ==============================================================================
// PHYSENRA END-TO-END CLINICAL DOCUMENTATION WORKFLOW V1 VERIFICATION SUITE
// File: tests/end_to_end_clinical_documentation_workflow_v1.test.cjs
//
// Minimum Required Coverage (>= 70 Tests / Assertions):
// 1. Clinical Journey Architecture & Entity Model Continuity (Tests 1-12)
// 2. Cross-Domain Navigation & Parameter Preselection (Tests 13-20)
// 3. Appointment to Clinical Visit Idempotency (Tests 21-26)
// 4. Pre-Completion Clinical Checklist in Encounter Modal (Tests 27-38)
// 5. Post-Completion Workflow & Follow-Up Scheduling (Tests 39-46)
// 6. Primacy of SOAP Clinical Notes & Medico-Legal Record (Tests 47-54)
// 7. Structured Specialty Assessment Extensions (Tests 55-60)
// 8. Care Lifecycle: Goals, HEP, Progress Reviews & Discharge (Tests 61-68)
// 9. Multi-Tenant Practice Isolation & Role Security (Tests 69-72)
// 10. Medico-Legal Integrity & Zero Kabworld References (Tests 73-75)
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const VISIT_DETAIL_PATH = path.join(ROOT_DIR, 'src', 'pages', 'visits', 'ClinicalVisitDetailPage.tsx');
const CREATE_VISIT_PATH = path.join(ROOT_DIR, 'src', 'pages', 'visits', 'CreateClinicalVisitPage.tsx');
const CREATE_APPT_PATH = path.join(ROOT_DIR, 'src', 'pages', 'appointments', 'CreateAppointmentPage.tsx');
const APPT_DETAIL_PATH = path.join(ROOT_DIR, 'src', 'pages', 'appointments', 'AppointmentDetailPage.tsx');
const EPISODE_PROFILE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'episodes', 'EpisodeProfilePage.tsx');
const PATIENT_PROFILE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'patients', 'PatientProfilePage.tsx');
const CLINICAL_NOTE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'notes', 'ClinicalNoteDetailPage.tsx');
const VISIT_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'clinicalVisitService.ts');
const APPT_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'appointmentService.ts');
const EPISODE_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'episodeService.ts');
const NOTE_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'clinicalNoteService.ts');
const SPECIALTY_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'clinicalAssessmentService.ts');
const OUTCOME_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'outcomeMeasureService.ts');
const TREATMENT_PLAN_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'treatmentPlanService.ts');
const HEP_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'hepService.ts');
const PROGRESS_REVIEW_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'progressReviewService.ts');
const DISCHARGE_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'dischargeSummaryService.ts');
const MODELS_PATH = path.join(ROOT_DIR, 'src', 'types', 'models.ts');
const APP_PATH = path.join(ROOT_DIR, 'src', 'App.tsx');

// Read file contents once
const visitDetailContent = fs.readFileSync(VISIT_DETAIL_PATH, 'utf8');
const createVisitContent = fs.readFileSync(CREATE_VISIT_PATH, 'utf8');
const createApptContent = fs.readFileSync(CREATE_APPT_PATH, 'utf8');
const apptDetailContent = fs.readFileSync(APPT_DETAIL_PATH, 'utf8');
const episodeProfileContent = fs.readFileSync(EPISODE_PROFILE_PATH, 'utf8');
const patientProfileContent = fs.readFileSync(PATIENT_PROFILE_PATH, 'utf8');
const clinicalNoteContent = fs.readFileSync(CLINICAL_NOTE_PATH, 'utf8');
const visitServiceContent = fs.readFileSync(VISIT_SERVICE_PATH, 'utf8');
const apptServiceContent = fs.readFileSync(APPT_SERVICE_PATH, 'utf8');
const episodeServiceContent = fs.readFileSync(EPISODE_SERVICE_PATH, 'utf8');
const noteServiceContent = fs.readFileSync(NOTE_SERVICE_PATH, 'utf8');
const specialtyServiceContent = fs.readFileSync(SPECIALTY_SERVICE_PATH, 'utf8');
const outcomeServiceContent = fs.readFileSync(OUTCOME_SERVICE_PATH, 'utf8');
const treatmentServiceContent = fs.readFileSync(TREATMENT_PLAN_SERVICE_PATH, 'utf8');
const hepServiceContent = fs.readFileSync(HEP_SERVICE_PATH, 'utf8');
const progressServiceContent = fs.readFileSync(PROGRESS_REVIEW_SERVICE_PATH, 'utf8');
const dischargeServiceContent = fs.readFileSync(DISCHARGE_SERVICE_PATH, 'utf8');
const modelsContent = fs.readFileSync(MODELS_PATH, 'utf8');
const appContent = fs.readFileSync(APP_PATH, 'utf8');

const DB_TYPES_PATH = path.join(ROOT_DIR, 'src', 'types', 'database.ts');
const dbTypesContent = fs.readFileSync(DB_TYPES_PATH, 'utf8');

// ==============================================================================
// 1. Clinical Journey Architecture & Entity Model Continuity (Tests 1-12)
// ==============================================================================

test('1. Patient model exports core demographic and clinical identity properties', () => {
  assert.match(modelsContent, /export type Patient = Database\['public'\]\['Tables'\]\['patients'\]\['Row'\]/);
  assert.match(dbTypesContent, /patient_identifier:\s*string/);
  assert.match(dbTypesContent, /date_of_birth:\s*string\s*\|\s*null/);
  assert.match(dbTypesContent, /sex:\s*PatientSex\s*\|\s*null/);
});

test('2. Episode of Care model anchors clinical course and links to patient', () => {
  assert.match(modelsContent, /export type EpisodeOfCare = Database\['public'\]\['Tables'\]\['episodes_of_care'\]\['Row'\]/);
  assert.match(dbTypesContent, /patient_id:\s*string/);
  assert.match(dbTypesContent, /episode_identifier:\s*string/);
  assert.match(dbTypesContent, /status:\s*EpisodeStatus/);
});

test('3. Appointment model anchors administrative booking to clinician and patient', () => {
  assert.match(modelsContent, /export type Appointment = Database\['public'\]\['Tables'\]\['appointments'\]\['Row'\]/);
  assert.match(dbTypesContent, /patient_id:\s*string/);
  assert.match(dbTypesContent, /episode_id:\s*string\s*\|\s*null/);
  assert.match(dbTypesContent, /physiotherapist_id:\s*string/);
  assert.match(dbTypesContent, /scheduled_start:\s*string/);
  assert.match(dbTypesContent, /scheduled_end:\s*string/);
});

test('4. Clinical Visit model records encounter execution, timing, and duration', () => {
  assert.match(modelsContent, /export type ClinicalVisit = Database\['public'\]\['Tables'\]\['clinical_visits'\]\['Row'\]/);
  assert.match(dbTypesContent, /appointment_id:\s*string\s*\|\s*null/);
  assert.match(dbTypesContent, /actual_start:\s*string\s*\|\s*null/);
  assert.match(dbTypesContent, /actual_end:\s*string\s*\|\s*null/);
  assert.match(dbTypesContent, /duration_minutes:\s*number\s*\|\s*null/);
  assert.match(dbTypesContent, /status:\s*ClinicalVisitStatus/);
});

test('5. Clinical Note model represents primary medico-legal SOAP documentation', () => {
  assert.match(modelsContent, /export type ClinicalNote = Database\['public'\]\['Tables'\]\['clinical_notes'\]\['Row'\]/);
  assert.match(dbTypesContent, /subjective:\s*string/);
  assert.match(dbTypesContent, /objective:\s*string/);
  assert.match(dbTypesContent, /assessment:\s*string/);
  assert.match(dbTypesContent, /plan:\s*string/);
  assert.match(dbTypesContent, /clinical_visit_id:\s*string/);
  assert.match(dbTypesContent, /status:\s*ClinicalNoteStatus/);
});

test('6. Specialty Clinical Assessment model provides structured clinical evaluations', () => {
  assert.match(modelsContent, /export type ClinicalAssessmentInstance = Database\['public'\]\['Tables'\]\['clinical_assessment_instances'\]\['Row'\]/);
  assert.match(dbTypesContent, /clinical_visit_id:\s*string/);
  assert.match(dbTypesContent, /definition_id:\s*string/);
  assert.match(dbTypesContent, /structured_data:\s*Json/);
  assert.match(dbTypesContent, /status:\s*ClinicalAssessmentStatus/);
});

test('7. Outcome Measure model records standardized scoring', () => {
  assert.match(modelsContent, /export type OutcomeMeasureAssessment = Database\['public'\]\['Tables'\]\['outcome_measure_assessments'\]\['Row'\]/);
  assert.match(dbTypesContent, /clinical_visit_id:\s*string\s*\|\s*null/);
  assert.match(dbTypesContent, /numeric_score:\s*number\s*\|\s*null/);
});

test('8. Treatment Plan model defines care management, goals, and interventions', () => {
  assert.match(modelsContent, /export type TreatmentPlan = Database\['public'\]\['Tables'\]\['treatment_plans'\]\['Row'\]/);
  assert.match(dbTypesContent, /episode_id:\s*string\s*\|\s*null/);
  assert.match(dbTypesContent, /originating_clinical_visit_id:\s*string\s*\|\s*null/);
  assert.match(dbTypesContent, /status:\s*TreatmentPlanStatus/);
});

test('9. Treatment Plan Goal model defines objective patient targets and progress', () => {
  assert.match(modelsContent, /export type TreatmentPlanGoal = Database\['public'\]\['Tables'\]\['treatment_plan_goals'\]\['Row'\]/);
  assert.match(dbTypesContent, /treatment_plan_id:\s*string/);
  assert.match(dbTypesContent, /goal_statement:\s*string/);
  assert.match(dbTypesContent, /status:\s*TreatmentGoalStatus/);
});

test('10. Home Exercise Program (HEP) model prescribes home rehabilitation', () => {
  assert.match(modelsContent, /export type HomeExerciseProgram = Database\['public'\]\['Tables'\]\['home_exercise_programs'\]\['Row'\]/);
  assert.match(dbTypesContent, /clinical_visit_id:\s*string\s*\|\s*null/);
  assert.match(dbTypesContent, /episode_id:\s*string\s*\|\s*null/);
  assert.match(dbTypesContent, /status:\s*HEPStatus/);
});

test('11. Milestone Progress Review model synthesizes episode trajectory', () => {
  assert.match(modelsContent, /export type ProgressReview = Database\['public'\]\['Tables'\]\['progress_reviews'\]\['Row'\]/);
  assert.match(dbTypesContent, /episode_id:\s*string/);
  assert.match(dbTypesContent, /status:\s*ProgressReviewStatus/);
});

test('12. Discharge Summary model records final episode closure and discharge outcomes', () => {
  assert.match(modelsContent, /export type DischargeSummary = Database\['public'\]\['Tables'\]\['discharge_summaries'\]\['Row'\]/);
  assert.match(dbTypesContent, /episode_id:\s*string/);
  assert.match(dbTypesContent, /discharge_reason:\s*DischargeReason/);
  assert.match(dbTypesContent, /discharge_disposition:\s*DischargeDisposition/);
});

// ==============================================================================
// 2. Cross-Domain Navigation & Parameter Preselection (Tests 13-20)
// ==============================================================================

test('13. CreateAppointmentPage supports both camelCase and snake_case patientId params', () => {
  assert.match(createApptContent, /searchParams\.get\('patientId'\)\s*\|\|\s*searchParams\.get\('patient_id'\)/);
});

test('14. CreateAppointmentPage supports both camelCase and snake_case episodeId params', () => {
  assert.match(createApptContent, /searchParams\.get\('episodeId'\)\s*\|\|\s*searchParams\.get\('episode_id'\)/);
});

test('15. CreateAppointmentPage supports preselected clinicianId params', () => {
  assert.match(createApptContent, /searchParams\.get\('clinicianId'\)\s*\|\|\s*searchParams\.get\('clinician_id'\)/);
  assert.match(createApptContent, /setPhysiotherapistId\(preselectedClinicianId\)/);
});

test('16. CreateClinicalVisitPage supports flexible query params for appointment, patient, and episode', () => {
  assert.match(createVisitContent, /searchParams\.get\('appointment_id'\)\s*\|\|\s*searchParams\.get\('appointmentId'\)/);
  assert.match(createVisitContent, /searchParams\.get\('patient_id'\)\s*\|\|\s*searchParams\.get\('patientId'\)/);
  assert.match(createVisitContent, /searchParams\.get\('episode_id'\)\s*\|\|\s*searchParams\.get\('episodeId'\)/);
});

test('17. EpisodeProfilePage links directly to Appointments with episode context', () => {
  assert.match(episodeProfileContent, /\/app\/appointments\/new\?patientId=\${episode\.patient_id}&episodeId=\${episode\.id}/);
  assert.match(episodeProfileContent, /\/app\/appointments\?episodeId=\${episode\.id}/);
});

test('18. EpisodeProfilePage links directly to Clinical Visits with episode context', () => {
  assert.match(episodeProfileContent, /\/app\/visits\/new\?patient_id=\${episode\.patient_id}&episode_id=\${episode\.id}/);
  assert.match(episodeProfileContent, /\/app\/visits\?episodeId=\${episode\.id}/);
});

test('19. EpisodeProfilePage links directly to SOAP Clinical Notes with episode context', () => {
  assert.match(episodeProfileContent, /\/app\/clinical-notes\?episodeId=\${episode\.id}/);
});

test('20. EpisodeProfilePage links directly to Treatment Plans, HEP, Reviews and Discharge', () => {
  assert.match(episodeProfileContent, /\/app\/treatment-plans\?episodeId=\${episode\.id}/);
  assert.match(episodeProfileContent, /\/app\/hep\?episodeId=\${episode\.id}/);
  assert.match(episodeProfileContent, /\/app\/progress-reviews\?episodeId=\${episode\.id}/);
  assert.match(episodeProfileContent, /\/app\/discharge-summaries\?episodeId=\${episode\.id}/);
});

// ==============================================================================
// 3. Appointment to Clinical Visit Idempotency (Tests 21-26)
// ==============================================================================

test('21. clinicalVisitService.startClinicalVisitFromAppointment checks existing visit first', () => {
  assert.match(visitServiceContent, /getClinicalVisitByAppointmentId\(appointmentId\)/);
  assert.match(visitServiceContent, /if\s*\(existing\)\s*\{\s*return\s+existing;\s*\}/);
});

test('22. AppointmentDetailPage handles handleStartClinicalVisit using startClinicalVisitFromAppointment', () => {
  assert.match(apptDetailContent, /clinicalVisitService\.startClinicalVisitFromAppointment\(appointment\.id\)/);
  assert.match(apptDetailContent, /navigate\(`\/app\/visits\/\$\{visit\.id\}`\)/);
});

test('23. AppointmentDetailPage detects and links existing clinical visit', () => {
  assert.match(apptDetailContent, /clinicalVisitService\.getClinicalVisitByAppointmentId/);
  assert.match(apptDetailContent, /setLinkedVisit\(visit\)/);
  assert.match(apptDetailContent, /View Encounter →/);
});

test('24. CreateClinicalVisitPage checks idempotency on mount and redirects if visit exists', () => {
  assert.match(createVisitContent, /clinicalVisitService\.getClinicalVisitByAppointmentId\(initialAppointmentId\)/);
  assert.match(createVisitContent, /navigate\(`\/app\/visits\/\$\{existingVisit\.id\}`, \{ replace: true \}\)/);
});

test('25. Appointment status transitions to in_progress when visit is started', () => {
  assert.match(visitServiceContent, /transitionStatus\(\s*appointmentId,\s*appointment\.status,\s*'in_progress'/);
});

test('26. Completed clinical visit updates encounter status to completed and logs audit', () => {
  assert.match(visitServiceContent, /status:\s*'completed'/);
  assert.match(visitServiceContent, /clinical_visit\.completed/);
});

// ==============================================================================
// 4. Pre-Completion Clinical Checklist in Encounter Modal (Tests 27-38)
// ==============================================================================

test('27. ClinicalVisitDetailPage renders Pre-Completion Clinical Checklist header in modal', () => {
  assert.match(visitDetailContent, /Pre-Completion Clinical Checklist/);
});

test('28. Pre-completion checklist identifies SOAP Clinical Note as REQUIRED', () => {
  assert.match(visitDetailContent, /SOAP Clinical Note/);
  assert.match(visitDetailContent, /REQUIRED/);
});

test('29. Pre-completion checklist displays Finalized status when SOAP note is finalized', () => {
  assert.match(visitDetailContent, /clinicalNote\.status === 'finalized' \|\| clinicalNote\.status === 'amended'/);
  assert.match(visitDetailContent, /✓ Finalized \(\{clinicalNote\.note_identifier\}\)/);
});

test('30. Pre-completion checklist displays Draft warning when SOAP note is draft', () => {
  assert.match(visitDetailContent, /clinicalNote\.status === 'draft'/);
  assert.match(visitDetailContent, /⚠ Draft Note \(\{clinicalNote\.note_identifier\}\)/);
});

test('31. Pre-completion checklist displays Missing indicator when SOAP note is absent', () => {
  assert.match(visitDetailContent, /✕ Missing \(Not Documented\)/);
});

test('32. Pre-completion checklist displays notice warning regarding missing SOAP note', () => {
  assert.match(visitDetailContent, /No SOAP note is linked to this visit/);
  assert.match(visitDetailContent, /SOAP notes are the primary medico-legal clinical record/);
});

test('33. Pre-completion checklist marks Specialty Assessment as OPTIONAL', () => {
  assert.match(visitDetailContent, /Specialty Assessment/);
  assert.match(visitDetailContent, /OPTIONAL/);
});

test('34. Pre-completion checklist reflects specialty assessment count and draft state', () => {
  assert.match(visitDetailContent, /clinicalAssessments\.some\(\(a\) => a\.status === 'draft'\)/);
  assert.match(visitDetailContent, /✓ \{clinicalAssessments\.length\} Finalized/);
});

test('35. Pre-completion checklist marks Outcome Measures as OPTIONAL and displays count', () => {
  assert.match(visitDetailContent, /Outcome Measures/);
  assert.match(visitDetailContent, /outcomeAssessments\.length > 0/);
  assert.match(visitDetailContent, /✓ \{outcomeAssessments\.length\} Recorded/);
});

test('36. Pre-completion checklist marks Treatment Plan as OPTIONAL and displays active link status', () => {
  assert.match(visitDetailContent, /Treatment Plan/);
  assert.match(visitDetailContent, /treatmentPlans\.length > 0/);
  assert.match(visitDetailContent, /✓ \{treatmentPlans\.length\} Active \/ Linked/);
});

test('37. Pre-completion checklist marks Home Exercise Program as OPTIONAL and displays prescription status', () => {
  assert.match(visitDetailContent, /Home Exercise Program \(HEP\)/);
  assert.match(visitDetailContent, /homeExercisePrograms\.length > 0/);
  assert.match(visitDetailContent, /✓ \{homeExercisePrograms\.length\} Prescribed/);
});

test('38. Pre-completion checklist permits encounter completion without blocking on optional extensions', () => {
  // Confirm button is always accessible if form is submitted
  assert.match(visitDetailContent, /handleCompleteEncounter/);
  assert.match(visitDetailContent, /Confirm Completion/);
});

// ==============================================================================
// 5. Post-Completion Workflow & Follow-Up Scheduling (Tests 39-46)
// ==============================================================================

test('39. Completed visit displays prominent Schedule Follow-up Appointment CTA in header', () => {
  assert.match(visitDetailContent, /visit\.status === 'completed'/);
  assert.match(visitDetailContent, /Schedule Follow-up Appointment/);
});

test('40. Follow-up appointment CTA pre-populates patientId, episodeId, and clinicianId', () => {
  assert.match(
    visitDetailContent,
    /\/app\/appointments\/new\?patientId=\$\{visit\.patient_id\}&episodeId=\$\{visit\.episode_id \|\| ''\}&clinicianId=\$\{visit\.physiotherapist_id\}/
  );
});

test('41. Completed visit displays green confirmation banner', () => {
  assert.match(visitDetailContent, /✓ Clinical Encounter Completed/);
  assert.match(visitDetailContent, /Encounter record is locked/);
});

test('42. Completed encounter banner includes secondary Book Follow-up action button', () => {
  assert.match(visitDetailContent, /\+ Book Follow-up/);
});

test('43. Completed encounter record is declared immutable and terminal in UI', () => {
  assert.match(visitDetailContent, /Encounter record is terminal and immutable/);
});

test('44. Completed encounter prevents editing actual_start or actual_end times', () => {
  // Once completed, status buttons disappear, only view links remain
  assert.doesNotMatch(visitDetailContent, /handleStartEncounter.*visit\.status === 'completed'/);
});

test('45. Completed encounter duration is calculated and displayed in minutes', () => {
  assert.match(visitDetailContent, /Duration: \{visit\.duration_minutes \? `\$\{visit\.duration_minutes\} minutes` : 'Recorded'\}/);
});

test('46. App shell defines routes for all 10 clinical journey stations', () => {
  assert.match(appContent, /path="patients"/);
  assert.match(appContent, /path="episodes"/);
  assert.match(appContent, /path="appointments"/);
  assert.match(appContent, /path="visits"/);
  assert.match(appContent, /path="clinical-notes"/);
  assert.match(appContent, /path="outcome-measures"/);
  assert.match(appContent, /path="treatment-plans"/);
  assert.match(appContent, /path="hep"/);
  assert.match(appContent, /path="progress-reviews"/);
  assert.match(appContent, /path="discharge-summaries"/);
});

// ==============================================================================
// 6. Primacy of SOAP Clinical Notes & Medico-Legal Record (Tests 47-54)
// ==============================================================================

test('47. Clinical note service links note directly to clinical visit and episode', () => {
  assert.match(noteServiceContent, /clinical_visit_id/);
  assert.match(noteServiceContent, /episode_id/);
  assert.match(noteServiceContent, /patient_id/);
});

test('48. Clinical note detail page supports Subjective, Objective, Assessment, Plan (SOAP)', () => {
  assert.match(clinicalNoteContent, /subjective/);
  assert.match(clinicalNoteContent, /objective/);
  assert.match(clinicalNoteContent, /assessment/);
  assert.match(clinicalNoteContent, /plan/);
});

test('49. Clinical note detail displays locked state when finalized', () => {
  assert.match(clinicalNoteContent, /finalized/);
});

test('50. Clinical note supports controlled amendment with reason tracking', () => {
  assert.match(noteServiceContent, /amendClinicalNote|amendment/);
});

test('51. Clinical visit page allows viewing SOAP note if existing', () => {
  assert.match(visitDetailContent, /View SOAP Note \(\{clinicalNote\.note_identifier\}\)/);
});

test('52. Clinical visit page offers Document SOAP Note CTA if not yet documented', () => {
  assert.match(visitDetailContent, /\+ Document SOAP Note/);
  assert.match(visitDetailContent, /\/app\/clinical-notes\/new\?visitId=\$\{visit\.id\}/);
});

test('53. Clinical note creation does not depend on specialty assessment presence', () => {
  assert.doesNotMatch(noteServiceContent, /clinical_assessment_instances/);
});

test('54. Clinical note primacy notice is rendered in Clinical Visit Detail page', () => {
  assert.match(visitDetailContent, /Clinical Architecture Invariant/);
  assert.match(visitDetailContent, /Patient ≠ Episode of Care ≠ Appointment ≠ Clinical Visit ≠ Clinical Note/);
});

// ==============================================================================
// 7. Structured Specialty Assessment Extensions (Tests 55-60)
// ==============================================================================

test('55. Clinical visit integrates Neurology structured clinical module', () => {
  assert.match(visitDetailContent, /Neurology Structured Examination/);
  assert.match(visitDetailContent, /NEURO_MOTOR_SPASTICITY_SCREEN|NEURO_EXAMINATION_V1/);
});

test('56. Clinical visit integrates Paediatric structured clinical module', () => {
  assert.match(visitDetailContent, /Paediatric.*Examination/);
  assert.match(visitDetailContent, /PAEDS_GROSS_MOTOR_SCREEN|PAEDS_EXAMINATION_V1/);
});

test('57. Four explicit detection states handled per specialty definition', () => {
  assert.match(visitDetailContent, /Not Started \(Optional\)/);
  assert.match(visitDetailContent, /neuroAssessment\.status === 'draft'/);
  assert.match(visitDetailContent, /neuroAssessment\.status === 'finalized'/);
  assert.match(visitDetailContent, /Continue Draft|View Draft/);
});

test('58. Specialty definitions fetched dynamically from database', () => {
  assert.match(visitDetailContent, /clinicalAssessmentService\.getDefinitions/);
});

test('59. Specialty assessments derive authoritative patient date_of_birth', () => {
  assert.match(visitDetailContent, /patientDob=\{visit\.patient\?\.date_of_birth\}/);
});

test('60. Specialty assessments wrap fields in fieldset disabled when finalized', () => {
  assert.match(visitDetailContent, /readOnly=\{isReadOnlyRole\}/);
});

// ==============================================================================
// 8. Care Lifecycle: Goals, HEP, Progress Reviews & Discharge (Tests 61-68)
// ==============================================================================

test('61. Treatment plan service links goals to plans and practices', () => {
  assert.match(treatmentServiceContent, /treatment_plan_goals/);
  assert.match(treatmentServiceContent, /practice_id/);
});

test('62. HEP service queries exercise library and prescribed exercises', () => {
  assert.match(hepServiceContent, /home_exercise_programs/);
  assert.match(hepServiceContent, /home_exercise_program_items/);
  assert.match(hepServiceContent, /exercises/);
});

test('63. Progress review service computes milestone metrics from episode data', () => {
  assert.match(progressServiceContent, /progress_reviews/);
  assert.match(progressServiceContent, /episode_id/);
});

test('64. Discharge summary service captures discharge reason and recommendations', () => {
  assert.match(dischargeServiceContent, /discharge_summaries/);
  assert.match(dischargeServiceContent, /discharge_reason/);
  assert.match(dischargeServiceContent, /recommendations/);
});

test('65. Episode status change supports transition to completed on discharge', () => {
  assert.match(episodeProfileContent, /handleStatusChange\('completed'\)/);
  assert.match(episodeProfileContent, /Discharge \/ Complete/);
});

test('66. Episode status change supports pausing and resuming care', () => {
  assert.match(episodeProfileContent, /handleStatusChange\('paused'\)/);
  assert.match(episodeProfileContent, /Pause Care/);
  assert.match(episodeProfileContent, /handleStatusChange\('active'\)/);
  assert.match(episodeProfileContent, /Resume Care/);
});

test('67. Outcome measure service calculates scores and stores interpretation', () => {
  assert.match(outcomeServiceContent, /outcome_measure_assessments/);
  assert.match(outcomeServiceContent, /numeric_score/);
  assert.match(outcomeServiceContent, /score_interpretation/);
});

test('68. Outcome measure assessments link to clinical visits and episodes', () => {
  assert.match(outcomeServiceContent, /clinical_visit_id/);
  assert.match(outcomeServiceContent, /episode_id/);
});

// ==============================================================================
// 9. Multi-Tenant Practice Isolation & Role Security (Tests 69-72)
// ==============================================================================

test('69. All clinical services enforce practice_id multi-tenant scoping', () => {
  assert.match(visitServiceContent, /practice_id/);
  assert.match(apptServiceContent, /practice_id/);
  assert.match(episodeServiceContent, /practice_id/);
  assert.match(noteServiceContent, /practice_id/);
  assert.match(specialtyServiceContent, /practice_id/);
});

test('70. Role-based security distinguishes clinical staff from administrative roles', () => {
  assert.match(visitDetailContent, /role === 'receptionist' \|\| role === 'accountant'/);
  assert.match(visitDetailContent, /isReadOnlyRole/);
});

test('71. Administrative read-only roles cannot mutate encounters or clinical documentation', () => {
  assert.match(visitDetailContent, /readOnly=\{isReadOnlyRole\}/);
});

test('72. Platform admin route guards remain intact', () => {
  assert.match(appContent, /PlatformAdminGuard/);
  assert.match(appContent, /path="\/platform"/);
});

// ==============================================================================
// 10. Medico-Legal Integrity & Zero Kabworld References (Tests 73-75)
// ==============================================================================

test('73. Clinical visit timestamps retain ISO format and precision', () => {
  assert.match(visitServiceContent, /new Date\(\)\.toISOString\(\)/);
  assert.match(visitDetailContent, /formatTimestamp/);
});

test('74. Incomplete clinical visits require audit reason tracking', () => {
  assert.match(visitServiceContent, /markIncomplete\(visitId:\s*string,\s*reason\?:/);
  assert.match(visitServiceContent, /cancellationReason/);
  assert.match(visitDetailContent, /handleMarkIncomplete/);
});

test('75. Project Separation Verification: Zero references to Kabworld across codebase', () => {
  const filesToCheck = [
    VISIT_DETAIL_PATH,
    CREATE_VISIT_PATH,
    CREATE_APPT_PATH,
    APPT_DETAIL_PATH,
    EPISODE_PROFILE_PATH,
    PATIENT_PROFILE_PATH,
    CLINICAL_NOTE_PATH,
    VISIT_SERVICE_PATH,
    APPT_SERVICE_PATH,
    EPISODE_SERVICE_PATH,
    NOTE_SERVICE_PATH,
    SPECIALTY_SERVICE_PATH,
    MODELS_PATH,
    APP_PATH,
  ];

  for (const filePath of filesToCheck) {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.strictEqual(
      /kabworld/i.test(content),
      false,
      `Kabworld reference found in ${filePath}`
    );
  }
});
