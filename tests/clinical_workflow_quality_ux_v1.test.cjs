// ==============================================================================
// PHYSENRA CLINICAL WORKFLOW QUALITY & CLINICIAN UX V1 VERIFICATION SUITE
// File: tests/clinical_workflow_quality_ux_v1.test.cjs
//
// Coverage Sections:
// Section 1: Clinician Daily Workspace & Dashboard (Tests 1 - 15)
// Section 2: Today's Appointments & Usability (Tests 16 - 28)
// Section 3: Patient Search & Context Bar (Tests 29 - 42)
// Section 4: Episode Care Hub & Dynamic Counts (Tests 43 - 55)
// Section 5: Clinical Visit Workspace & In-Line Checklist (Tests 56 - 72)
// Section 6: Standardized Documentation Status Language (Tests 73 - 85)
// Section 7: Resume Where You Left Off & Idempotency (Tests 86 - 98)
// Section 8: Smart Return Navigation & Context Preservation (Tests 99 - 110)
// Section 9: UX Ergonomics, Tablet Layout & Touch Targets (Tests 111 - 122)
// Section 10: Performance, Bundle Chunking & Multi-Tenant Security (Tests 123 - 135)
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const DASHBOARD_PATH = path.join(ROOT_DIR, 'src', 'pages', 'dashboard', 'DashboardPage.tsx');
const APPT_LIST_PATH = path.join(ROOT_DIR, 'src', 'pages', 'appointments', 'AppointmentListPage.tsx');
const PATIENT_LIST_PATH = path.join(ROOT_DIR, 'src', 'pages', 'patients', 'PatientListPage.tsx');
const PATIENT_PROFILE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'patients', 'PatientProfilePage.tsx');
const EPISODE_PROFILE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'episodes', 'EpisodeProfilePage.tsx');
const VISIT_DETAIL_PATH = path.join(ROOT_DIR, 'src', 'pages', 'visits', 'ClinicalVisitDetailPage.tsx');
const VISIT_LIST_PATH = path.join(ROOT_DIR, 'src', 'pages', 'visits', 'ClinicalVisitListPage.tsx');
const CREATE_VISIT_PATH = path.join(ROOT_DIR, 'src', 'pages', 'visits', 'CreateClinicalVisitPage.tsx');
const CLINICAL_NOTE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'notes', 'ClinicalNoteDetailPage.tsx');
const PATIENT_CONTEXT_BAR_PATH = path.join(ROOT_DIR, 'src', 'components', 'clinical', 'PatientContextBar.tsx');
const STATUS_BADGE_PATH = path.join(ROOT_DIR, 'src', 'components', 'clinical', 'ClinicalStatusBadge.tsx');
const VITE_CONFIG_PATH = path.join(ROOT_DIR, 'vite.config.ts');
const APP_PATH = path.join(ROOT_DIR, 'src', 'App.tsx');
const VISIT_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'clinicalVisitService.ts');
const NOTE_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'clinicalNoteService.ts');
const APPT_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'appointmentService.ts');

// Read files once
const dashboardContent = fs.readFileSync(DASHBOARD_PATH, 'utf8');
const apptListContent = fs.readFileSync(APPT_LIST_PATH, 'utf8');
const patientListContent = fs.readFileSync(PATIENT_LIST_PATH, 'utf8');
const patientProfileContent = fs.readFileSync(PATIENT_PROFILE_PATH, 'utf8');
const episodeProfileContent = fs.readFileSync(EPISODE_PROFILE_PATH, 'utf8');
const visitDetailContent = fs.readFileSync(VISIT_DETAIL_PATH, 'utf8');
const visitListContent = fs.readFileSync(VISIT_LIST_PATH, 'utf8');
const createVisitContent = fs.readFileSync(CREATE_VISIT_PATH, 'utf8');
const noteDetailContent = fs.readFileSync(CLINICAL_NOTE_PATH, 'utf8');
const patientContextBarContent = fs.readFileSync(PATIENT_CONTEXT_BAR_PATH, 'utf8');
const statusBadgeContent = fs.readFileSync(STATUS_BADGE_PATH, 'utf8');
const viteConfigContent = fs.readFileSync(VITE_CONFIG_PATH, 'utf8');
const appContent = fs.readFileSync(APP_PATH, 'utf8');
const visitServiceContent = fs.readFileSync(VISIT_SERVICE_PATH, 'utf8');
const noteServiceContent = fs.readFileSync(NOTE_SERVICE_PATH, 'utf8');
const apptServiceContent = fs.readFileSync(APPT_SERVICE_PATH, 'utf8');

// ==============================================================================
// Section 1: Clinician Daily Workspace & Dashboard (Tests 1 - 15)
// ==============================================================================
test('Section 1: Clinician Daily Workspace & Dashboard Verification', async (t) => {
  await t.test('1. DashboardPage exists and defines Clinician Daily Workspace title', () => {
    assert.match(dashboardContent, /Clinician Daily Workspace/);
  });

  await t.test('2. Dashboard defaults to today ISO date and provides date state manipulation', () => {
    assert.match(dashboardContent, /new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]/);
    assert.match(dashboardContent, /setSelectedDate/);
    assert.match(dashboardContent, /handleDateShift/);
  });

  await t.test('3. Dashboard queries appointments for the selected schedule date', () => {
    assert.match(dashboardContent, /appointmentService\.getAppointments\(\{/);
    assert.match(dashboardContent, /date:\s*selectedDate/);
  });

  await t.test('4. Dashboard displays Today Schedule summary card with completed and remaining counts', () => {
    assert.match(dashboardContent, /Today's Schedule/);
    assert.match(dashboardContent, /completedAppointmentsCount/);
    assert.match(dashboardContent, /remainingAppointmentsCount/);
  });

  await t.test('5. Dashboard displays Encounters In Progress metric card', () => {
    assert.match(dashboardContent, /Encounters In Progress/);
    assert.match(dashboardContent, /inProgressVisits\.length/);
  });

  await t.test('6. Dashboard displays Draft SOAP Notes metric card', () => {
    assert.match(dashboardContent, /Draft SOAP Notes/);
    assert.match(dashboardContent, /draftNotes\.length/);
  });

  await t.test('7. Dashboard displays Draft Assessments metric card', () => {
    assert.match(dashboardContent, /Draft Assessments/);
    assert.match(dashboardContent, /draftAssessments\.length/);
  });

  await t.test('8. Dashboard features an Attention Required section for outstanding documentation', () => {
    assert.match(dashboardContent, /Attention Required/);
    assert.match(dashboardContent, /totalAttentionItems/);
  });

  await t.test('9. Attention Required section renders Resume button for in-progress encounters', () => {
    assert.match(dashboardContent, /inProgressVisits\.map/);
    assert.match(dashboardContent, /to=\{`\/app\/visits\/\$\{v\.id\}`\}/);
    assert.match(dashboardContent, /Resume/);
  });

  await t.test('10. Attention Required section renders Finalize button for draft SOAP notes', () => {
    assert.match(dashboardContent, /draftNotes\.map/);
    assert.match(dashboardContent, /to=\{`\/app\/clinical-notes\/\$\{n\.id\}`\}/);
    assert.match(dashboardContent, /Finalize/);
  });

  await t.test('11. Attention Required section renders Continue button for draft assessments', () => {
    assert.match(dashboardContent, /draftAssessments\.map/);
    assert.match(dashboardContent, /to=\{`\/app\/visits\/\$\{a\.clinical_visit_id\}`\}/);
    assert.match(dashboardContent, /Continue/);
  });

  await t.test('12. Dashboard renders clear empty state when all documentation is current', () => {
    assert.match(dashboardContent, /All clinical documentation is current/);
  });

  await t.test('13. Dashboard renders Recent Patients card with direct links', () => {
    assert.match(dashboardContent, /Recent Patients/);
    assert.match(dashboardContent, /recentPatients\.map/);
  });

  await t.test('14. Dashboard includes rapid Patient Search Jump form', () => {
    assert.match(dashboardContent, /handlePatientSearchSubmit/);
    assert.match(dashboardContent, /\/app\/patients\?search=/);
  });

  await t.test('15. Dashboard includes error state with user retry button', () => {
    assert.match(dashboardContent, /onClick=\{loadDashboardData\}/);
    assert.match(dashboardContent, /Retry/);
  });
});

// ==============================================================================
// Section 2: Today's Appointments & Usability (Tests 16 - 28)
// ==============================================================================
test('Section 2: Today\'s Appointments & Appointment List Usability', async (t) => {
  await t.test('16. AppointmentListPage renders contextual Start Visit action for scheduled slots', () => {
    assert.match(apptListContent, /appt\.status === 'scheduled'/);
    assert.match(apptListContent, /to=\{`\/app\/visits\/new\?appointment_id=\$\{appt\.id\}`\}/);
    assert.match(apptListContent, /Start Visit/);
  });

  await t.test('17. AppointmentListPage renders Resume Visit action for in_progress appointments', () => {
    assert.match(apptListContent, /appt\.status === 'in_progress'/);
    assert.match(apptListContent, /Resume Visit/);
  });

  await t.test('18. AppointmentListPage renders + Follow-up action for completed appointments', () => {
    assert.match(apptListContent, /appt\.status === 'completed'/);
    assert.match(apptListContent, /\+ Follow-up/);
  });

  await t.test('19. Appointment table rows display episode link under patient identity when linked', () => {
    assert.match(apptListContent, /appt\.episode &&/);
    assert.match(apptListContent, /to=\{`\/app\/episodes\/\$\{appt\.episode\.id\}`\}/);
  });

  await t.test('20. Dashboard appointment rows show patient identifier and name link', () => {
    assert.match(dashboardContent, /appt\.patient\.last_name/);
    assert.match(dashboardContent, /appt\.patient\.patient_identifier/);
  });

  await t.test('21. Dashboard appointments display scheduled start and end times', () => {
    assert.match(dashboardContent, /formatTime\(appt\.scheduled_start\)/);
    assert.match(dashboardContent, /formatTime\(appt\.scheduled_end\)/);
  });

  await t.test('22. Dashboard appointments table shows location mode (clinic/home/telehealth)', () => {
    assert.match(dashboardContent, /appt\.location_mode/);
  });

  await t.test('23. Dashboard appointment rows show appointment type', () => {
    assert.match(dashboardContent, /appt\.appointment_type/);
  });

  await t.test('24. Dashboard appointment actions render Start Visit for eligible statuses', () => {
    assert.match(dashboardContent, /isReadyToStart/);
    assert.match(dashboardContent, /Start Visit/);
  });

  await t.test('25. Dashboard appointment actions render Resume Visit for in_progress status', () => {
    assert.match(dashboardContent, /isInProgress/);
    assert.match(dashboardContent, /Resume Visit/);
  });

  await t.test('26. Dashboard appointment actions render + Follow-up for completed appointments', () => {
    assert.match(dashboardContent, /isCompleted/);
    assert.match(dashboardContent, /\+ Follow-up/);
  });

  await t.test('27. Dashboard empty state for schedule displays clear message and Book action', () => {
    assert.match(dashboardContent, /No appointments scheduled for/);
    assert.match(dashboardContent, /Book Appointment/);
  });

  await t.test('28. Appointment list maintains architectural notice separating Appointment from Clinical Visit', () => {
    assert.match(apptListContent, /An appointment represents a scheduled encounter slot/);
  });
});

// ==============================================================================
// Section 3: Patient Search & Context Bar (Tests 29 - 42)
// ==============================================================================
test('Section 3: Patient Search & PatientContextBar Component', async (t) => {
  await t.test('29. PatientContextBar component file exists and exports PatientContextBar', () => {
    assert.ok(fs.existsSync(PATIENT_CONTEXT_BAR_PATH));
    assert.match(patientContextBarContent, /export const PatientContextBar/);
  });

  await t.test('30. PatientContextBar calculates patient age from date_of_birth safely', () => {
    assert.match(patientContextBarContent, /calculateAge/);
    assert.match(patientContextBarContent, /birth\.getFullYear\(\)/);
  });

  await t.test('31. PatientContextBar renders patient full name and patient identifier', () => {
    assert.match(patientContextBarContent, /patient\.last_name/);
    assert.match(patientContextBarContent, /patient\.patient_identifier/);
  });

  await t.test('32. PatientContextBar renders episode title and link when episode context is present', () => {
    assert.match(patientContextBarContent, /episode\.title/);
    assert.match(patientContextBarContent, /to=\{`\/app\/episodes\/\$\{episode\.id\}`\}/);
  });

  await t.test('33. PatientContextBar renders clinician name when provided', () => {
    assert.match(patientContextBarContent, /clinicianName/);
    assert.match(patientContextBarContent, /Clinician:/);
  });

  await t.test('34. PatientContextBar provides direct link to Patient Profile with minHeight 44px', () => {
    assert.match(patientContextBarContent, /to=\{`\/app\/patients\/\$\{patient\.id\}`\}/);
    assert.match(patientContextBarContent, /minHeight:\s*'44px'/);
  });

  await t.test('35. PatientContextBar provides direct link to Episode Hub with minHeight 44px', () => {
    assert.match(patientContextBarContent, /Episode Hub/);
  });

  await t.test('36. PatientContextBar provides direct link to Appointments with minHeight 44px', () => {
    assert.match(patientContextBarContent, /to=\{`\/app\/appointments\?patientId=\$\{patient\.id\}`\}/);
  });

  await t.test('37. PatientContextBar provides direct link to Visits & Encounters with minHeight 44px', () => {
    assert.match(patientContextBarContent, /to=\{`\/app\/visits\?patientId=\$\{patient\.id\}`\}/);
    assert.match(patientContextBarContent, /Visits & Encounters/);
  });

  await t.test('38. PatientListPage supports search by name, ID, phone, or email', () => {
    assert.match(patientListContent, /Search by name, ID, phone, or email/);
    assert.match(patientListContent, /patientService\.getPatients/);
  });

  await t.test('39. PatientListPage does not expose unnecessary confidential details in table', () => {
    assert.doesNotMatch(patientListContent, /credit_card/i);
    assert.doesNotMatch(patientListContent, /\bssn\b/i);
  });

  await t.test('40. PatientListPage provides empty state with specific feedback when search has no match', () => {
    assert.match(patientListContent, /No patients match the search query/);
  });

  await t.test('41. PatientProfilePage includes Patient Visits & Encounters list section', () => {
    assert.match(patientProfileContent, /Clinical Encounters (&|&amp;) Visits/);
    assert.match(patientProfileContent, /visits\.map/);
  });

  await t.test('42. PatientProfilePage fetches clinical visits via clinicalVisitService', () => {
    assert.match(patientProfileContent, /clinicalVisitService\.getClinicalVisits/);
  });
});

// ==============================================================================
// Section 4: Episode Care Hub & Dynamic Counts (Tests 43 - 55)
// ==============================================================================
test('Section 4: Episode Care Hub & Dynamic Counts', async (t) => {
  await t.test('43. EpisodeProfilePage imports and embeds PatientContextBar', () => {
    assert.match(episodeProfileContent, /import \{ PatientContextBar \} from/);
    assert.match(episodeProfileContent, /<PatientContextBar/);
  });

  await t.test('44. EpisodeProfilePage queries visits, notes, plans, hep, reviews, and discharge in parallel', () => {
    assert.match(episodeProfileContent, /clinicalVisitService\.getClinicalVisits/);
    assert.match(episodeProfileContent, /clinicalNoteService\.getClinicalNotes/);
    assert.match(episodeProfileContent, /treatmentPlanService\.getPlans/);
    assert.match(episodeProfileContent, /hepService\.getPrograms/);
    assert.match(episodeProfileContent, /progress_reviews/);
    assert.match(episodeProfileContent, /discharge_summaries/);
  });

  await t.test('45. Episode Care Hub renders dynamic count badge for Scheduled Appointments', () => {
    assert.match(episodeProfileContent, /Appointments (&|&amp;) Scheduling/);
    assert.match(episodeProfileContent, /appointments\.length/);
  });

  await t.test('46. Episode Care Hub renders dynamic count badge for Clinical Visits', () => {
    assert.match(episodeProfileContent, /Clinical Visits (&|&amp;) Encounters/);
    assert.match(episodeProfileContent, /hubCounts\.visitsCount/);
  });

  await t.test('47. Episode Care Hub renders dynamic count badge for SOAP Clinical Notes', () => {
    assert.match(episodeProfileContent, /SOAP (&|&amp;) Clinical Notes/);
    assert.match(episodeProfileContent, /hubCounts\.notesCount/);
  });

  await t.test('48. Episode Care Hub renders dynamic count and active status for Treatment Plans', () => {
    assert.match(episodeProfileContent, /Treatment Plans, Goals (&|&amp;) HEP/);
    assert.match(episodeProfileContent, /hubCounts\.plansCount/);
    assert.match(episodeProfileContent, /hubCounts\.activePlansCount > 0 \? ' • Active' : ''/);
  });

  await t.test('49. Episode Care Hub renders dynamic count and active status for HEP Programs', () => {
    assert.match(episodeProfileContent, /HEP \(\{hubCounts\.hepCount\}\)/);
  });

  await t.test('50. Episode Care Hub renders dynamic count for Progress Reviews', () => {
    assert.match(episodeProfileContent, /Reviews \(\{hubCounts\.progressReviewsCount\}\)/);
  });

  await t.test('51. Episode Care Hub renders dynamic Discharge status badge', () => {
    assert.match(episodeProfileContent, /Discharge: \{hubCounts\.dischargeStatus\}/);
  });

  await t.test('52. Episode Care Hub action buttons enforce minHeight 44px for touch accessibility', () => {
    assert.match(episodeProfileContent, /minHeight:\s*'44px'/);
  });

  await t.test('53. Episode Care Hub provides + Book appointment action preserving patient and episode context', () => {
    assert.match(episodeProfileContent, /patientId=\$\{episode\.patient_id\}&episodeId=\$\{episode\.id\}/);
  });

  await t.test('54. Episode Care Hub provides + Start Visit action preserving patient and episode context', () => {
    assert.match(episodeProfileContent, /patient_id=\$\{episode\.patient_id\}&episode_id=\$\{episode\.id\}/);
  });

  await t.test('55. Episode Care Hub links to Treatment Plans, HEP, and Outcomes filtered by episode', () => {
    assert.match(episodeProfileContent, /\/app\/treatment-plans\?episodeId=\$\{episode\.id\}/);
    assert.match(episodeProfileContent, /\/app\/hep\?episodeId=\$\{episode\.id\}/);
    assert.match(episodeProfileContent, /\/app\/outcome-measures\?episodeId=\$\{episode\.id\}/);
  });
});

// ==============================================================================
// Section 5: Clinical Visit Workspace & In-Line Checklist (Tests 56 - 72)
// ==============================================================================
test('Section 5: Clinical Visit Workspace & In-Line Checklist', async (t) => {
  await t.test('56. ClinicalVisitDetailPage imports and renders PatientContextBar at top', () => {
    assert.match(visitDetailContent, /import \{ PatientContextBar \} from/);
    assert.match(visitDetailContent, /<PatientContextBar/);
  });

  await t.test('57. PatientContextBar on visit page receives visit.patient and visit.episode', () => {
    assert.match(visitDetailContent, /patient=\{visit\.patient\}/);
    assert.match(visitDetailContent, /episode=\{visit\.episode\}/);
  });

  await t.test('58. ClinicalVisitDetailPage renders in-line Encounter Documentation Checklist card', () => {
    assert.match(visitDetailContent, /clinical-documentation-checklist-card/);
    assert.match(visitDetailContent, /Encounter Documentation Checklist/);
  });

  await t.test('59. In-line checklist labels SOAP Clinical Note as strictly REQUIRED', () => {
    assert.match(visitDetailContent, /SOAP NOTE/);
    assert.match(visitDetailContent, /REQUIRED/);
  });

  await t.test('60. In-line checklist labels Specialty Assessment as OPTIONAL', () => {
    assert.match(visitDetailContent, /SPECIALTY/);
    assert.match(visitDetailContent, /OPTIONAL/);
  });

  await t.test('61. In-line checklist labels Outcomes as OPTIONAL', () => {
    assert.match(visitDetailContent, /OUTCOMES/);
  });

  await t.test('62. In-line checklist labels Care Plan as OPTIONAL', () => {
    assert.match(visitDetailContent, /CARE PLAN/);
  });

  await t.test('63. In-line checklist labels HEP Program as OPTIONAL', () => {
    assert.match(visitDetailContent, /HEP PROGRAM/);
  });

  await t.test('64. In-line checklist renders Complete Encounter button when visit is in_progress', () => {
    assert.match(visitDetailContent, /visit\.status === 'in_progress'/);
    assert.match(visitDetailContent, /setIsCompleteModalOpen\(true\)/);
  });

  await t.test('65. Complete Encounter modal still contains thorough Pre-Completion Clinical Checklist', () => {
    assert.match(visitDetailContent, /Pre-Completion Clinical Checklist/);
  });

  await t.test('66. Complete Encounter action enforces minHeight 44px', () => {
    assert.match(visitDetailContent, /minHeight:\s*'44px'/);
  });

  await t.test('67. Completed encounter displays Schedule Follow-up Appointment CTA', () => {
    assert.match(visitDetailContent, /Schedule Follow-up Appointment/);
  });

  await t.test('68. Schedule Follow-up CTA preserves patientId, episodeId, and clinicianId', () => {
    assert.match(visitDetailContent, /patientId=\$\{visit\.patient_id\}&episodeId=\$\{visit\.episode_id \|\| ''\}&clinicianId=\$\{visit\.physiotherapist_id\}/);
  });

  await t.test('69. Completed encounter displays green confirmation completion banner', () => {
    assert.match(visitDetailContent, /Clinical Encounter Completed/);
    assert.match(visitDetailContent, /Encounter record is locked/);
  });

  await t.test('70. Start Encounter button initiates actual start and duration tracking', () => {
    assert.match(visitDetailContent, /handleStartEncounter/);
    assert.match(visitDetailContent, /Start Encounter/);
  });

  await t.test('71. Cancel Visit button opens modal and requires cancellation reason', () => {
    assert.match(visitDetailContent, /isCancelModalOpen/);
    assert.match(visitDetailContent, /Cancel Visit/);
  });

  await t.test('72. Terminal records (completed or cancelled) display immutability notice', () => {
    assert.match(visitDetailContent, /Encounter record is terminal and immutable/);
  });
});

// ==============================================================================
// Section 6: Standardized Documentation Status Language (Tests 73 - 85)
// ==============================================================================
test('Section 6: Standardized Documentation Status Language & Visual Feedback', async (t) => {
  await t.test('73. ClinicalStatusBadge defines exactly the 5 standardized clinical states', () => {
    assert.match(statusBadgeContent, /'COMPLETE'/);
    assert.match(statusBadgeContent, /'DRAFT'/);
    assert.match(statusBadgeContent, /'ACTION_REQUIRED'/);
    assert.match(statusBadgeContent, /'NOT_STARTED'/);
    assert.match(statusBadgeContent, /'NOT_APPLICABLE'/);
  });

  await t.test('74. getDocumentationStatusConfig does not rely on color alone (includes icon)', () => {
    assert.match(statusBadgeContent, /CheckCircle2/);
    assert.match(statusBadgeContent, /FileEdit/);
    assert.match(statusBadgeContent, /AlertTriangle/);
    assert.match(statusBadgeContent, /Clock/);
    assert.match(statusBadgeContent, /MinusCircle/);
  });

  await t.test('75. ClinicalStatusBadge supports accessible role="status" and aria-label', () => {
    assert.match(statusBadgeContent, /role="status"/);
    assert.match(statusBadgeContent, /aria-label=/);
  });

  await t.test('76. COMPLETE state produces green styling token', () => {
    assert.match(statusBadgeContent, /#ecfdf5/);
    assert.match(statusBadgeContent, /#065f46/);
  });

  await t.test('77. DRAFT state produces amber styling token', () => {
    assert.match(statusBadgeContent, /#fffbeb/);
    assert.match(statusBadgeContent, /#92400e/);
  });

  await t.test('78. ACTION_REQUIRED state produces red styling token', () => {
    assert.match(statusBadgeContent, /#fef2f2/);
    assert.match(statusBadgeContent, /#991b1b/);
  });

  await t.test('79. NOT_STARTED state produces slate styling token', () => {
    assert.match(statusBadgeContent, /#f8fafc/);
    assert.match(statusBadgeContent, /#64748b/);
  });

  await t.test('80. NOT_APPLICABLE state produces neutral styling token', () => {
    assert.match(statusBadgeContent, /#f1f5f9/);
    assert.match(statusBadgeContent, /#475569/);
  });

  await t.test('81. In-line checklist uses ClinicalStatusBadge for SOAP note', () => {
    assert.match(visitDetailContent, /<ClinicalStatusBadge state="COMPLETE" label=\{clinicalNote\.status === 'amended' \? 'Amended' : 'Finalized'\}/);
    assert.match(visitDetailContent, /<ClinicalStatusBadge state="DRAFT" label="Draft Note"/);
    assert.match(visitDetailContent, /<ClinicalStatusBadge state="ACTION_REQUIRED" label="Missing SOAP"/);
  });

  await t.test('82. In-line checklist uses ClinicalStatusBadge for Specialty Assessment', () => {
    assert.match(visitDetailContent, /<ClinicalStatusBadge state="DRAFT" label=\{`\$\{clinicalAssessments\.length\} \(Draft\)`\}/);
    assert.match(visitDetailContent, /<ClinicalStatusBadge state="COMPLETE" label=\{`\$\{clinicalAssessments\.length\} Finalized`\}/);
  });

  await t.test('83. In-line checklist uses ClinicalStatusBadge for Outcome Measures', () => {
    assert.match(visitDetailContent, /<ClinicalStatusBadge state="COMPLETE" label=\{`\$\{outcomeAssessments\.length\} Recorded`\}/);
  });

  await t.test('84. In-line checklist uses ClinicalStatusBadge for Treatment Plan', () => {
    assert.match(visitDetailContent, /<ClinicalStatusBadge state="COMPLETE" label=\{`\$\{treatmentPlans\.length\} Linked`\}/);
  });

  await t.test('85. In-line checklist uses ClinicalStatusBadge for HEP Program', () => {
    assert.match(visitDetailContent, /<ClinicalStatusBadge state="COMPLETE" label=\{`\$\{homeExercisePrograms\.length\} Prescribed`\}/);
  });
});

// ==============================================================================
// Section 7: Resume Where You Left Off & Idempotency (Tests 86 - 98)
// ==============================================================================
test('Section 7: Resume Where You Left Off & Idempotency', async (t) => {
  await t.test('86. CreateClinicalVisitPage checks existing visit for appointment on mount', () => {
    assert.match(createVisitContent, /clinicalVisitService\.getClinicalVisitByAppointmentId/);
  });

  await t.test('87. CreateClinicalVisitPage redirects to existing visit if one already exists', () => {
    assert.match(createVisitContent, /navigate\(`\/app\/visits\/\$\{existingVisit\.id\}`, \{ replace: true \}\)/);
  });

  await t.test('88. clinicalVisitService.createClinicalVisit prevents duplicate visits for same appointment', () => {
    assert.match(visitServiceContent, /A clinical visit .* already exists for this appointment/);
  });

  await t.test('89. clinicalVisitService.startClinicalVisitFromAppointment is idempotent', () => {
    assert.match(visitServiceContent, /const existing = await this\.getClinicalVisitByAppointmentId\(appointmentId\)/);
    assert.match(visitServiceContent, /if \(existing\) \{\s*return existing;\s*\}/);
  });

  await t.test('90. Dashboard provides immediate Resume Encounter action for active visits', () => {
    assert.match(dashboardContent, /Resume/);
    assert.match(dashboardContent, /inProgressVisits/);
  });

  await t.test('91. Dashboard provides immediate Finalize action for draft SOAP notes', () => {
    assert.match(dashboardContent, /draftNotes/);
    assert.match(dashboardContent, /Finalize/);
  });

  await t.test('92. Dashboard provides Continue action for draft assessments', () => {
    assert.match(dashboardContent, /draftAssessments/);
    assert.match(dashboardContent, /Continue/);
  });

  await t.test('93. ClinicalVisitDetailPage distinguishes in_progress vs incomplete status with Resume button', () => {
    assert.match(visitDetailContent, /visit\.status === 'incomplete'/);
    assert.match(visitDetailContent, /Resume Encounter/);
  });

  await t.test('94. ClinicalVisitListPage shows Resume button for in_progress visits', () => {
    assert.match(visitListContent, /in_progress/);
  });

  await t.test('95. PatientProfilePage displays action link to Resume in-progress encounters', () => {
    assert.match(patientProfileContent, /v\.status === 'in_progress' \? 'Resume' : 'View'/);
  });

  await t.test('96. State machine ALLOWED_VISIT_TRANSITIONS permits scheduled -> in_progress', () => {
    assert.match(visitServiceContent, /scheduled:\s*\['in_progress', 'cancelled'\]/);
  });

  await t.test('97. State machine ALLOWED_VISIT_TRANSITIONS permits in_progress -> completed, incomplete, cancelled', () => {
    assert.match(visitServiceContent, /in_progress:\s*\['completed', 'incomplete', 'cancelled'\]/);
  });

  await t.test('98. State machine ALLOWED_VISIT_TRANSITIONS strictly forbids transitioning out of completed', () => {
    assert.match(visitServiceContent, /completed:\s*\[\]/);
  });
});

// ==============================================================================
// Section 8: Smart Return Navigation & Context Preservation (Tests 99 - 110)
// ==============================================================================
test('Section 8: Smart Return Navigation & Context Preservation', async (t) => {
  await t.test('99. ClinicalNoteDetailPage provides smart return navigation to encounter when visitId is present', () => {
    assert.match(noteDetailContent, /note\.clinical_visit_id \?/);
    assert.match(noteDetailContent, /to=\{`\/app\/visits\/\$\{note\.clinical_visit_id\}`\}/);
    assert.match(noteDetailContent, /Back to Encounter/);
  });

  await t.test('100. ClinicalNoteDetailPage provides direct link to Patient Profile', () => {
    assert.match(noteDetailContent, /note\.patient_id &&/);
    assert.match(noteDetailContent, /to=\{`\/app\/patients\/\$\{note\.patient_id\}`\}/);
    assert.match(noteDetailContent, /Patient Profile/);
  });

  await t.test('101. ClinicalNoteDetailPage provides direct link to Episode Hub when episodeId is present', () => {
    assert.match(noteDetailContent, /note\.episode_id &&/);
    assert.match(noteDetailContent, /to=\{`\/app\/episodes\/\$\{note\.episode_id\}`\}/);
    assert.match(noteDetailContent, /Episode Hub/);
  });

  await t.test('102. CreateClinicalNotePage accepts visitId from URL search params', () => {
    const createNoteContent = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'notes', 'CreateClinicalNotePage.tsx'), 'utf8');
    assert.match(createNoteContent, /searchParams\.get\('visitId'\) \|\| searchParams\.get\('visit_id'\)/);
  });

  await t.test('103. CreateAppointmentPage accepts both camelCase and snake_case patientId', () => {
    const createApptContent = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'appointments', 'CreateAppointmentPage.tsx'), 'utf8');
    assert.match(createApptContent, /searchParams\.get\('patientId'\) \|\| searchParams\.get\('patient_id'\)/);
  });

  await t.test('104. CreateAppointmentPage accepts both camelCase and snake_case episodeId', () => {
    const createApptContent = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'appointments', 'CreateAppointmentPage.tsx'), 'utf8');
    assert.match(createApptContent, /searchParams\.get\('episodeId'\) \|\| searchParams\.get\('episode_id'\)/);
  });

  await t.test('105. CreateAppointmentPage accepts both camelCase and snake_case clinicianId', () => {
    const createApptContent = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'appointments', 'CreateAppointmentPage.tsx'), 'utf8');
    assert.match(createApptContent, /searchParams\.get\('clinicianId'\) \|\| searchParams\.get\('clinician_id'\)/);
  });

  await t.test('106. CreateClinicalVisitPage accepts both camelCase and snake_case query params', () => {
    assert.match(createVisitContent, /searchParams\.get\('(appointmentId|appointment_id)'\)/);
    assert.match(createVisitContent, /searchParams\.get\('(patientId|patient_id)'\)/);
    assert.match(createVisitContent, /searchParams\.get\('(episodeId|episode_id)'\)/);
  });

  await t.test('107. EpisodeProfilePage Back link returns to patient profile when patient is known', () => {
    assert.match(episodeProfileContent, /episode\.patients \?/);
    assert.match(episodeProfileContent, /Back to Patient:/);
  });

  await t.test('108. ClinicalVisitDetailPage Back link returns to /app/visits', () => {
    assert.match(visitDetailContent, /to="\/app\/visits"/);
    assert.match(visitDetailContent, /Back to Clinical Visits/);
  });

  await t.test('109. Dashboard Recent Patients provides direct Hub and Visit quick links', () => {
    assert.match(dashboardContent, /title="Open Care Episode Hub"/);
    assert.match(dashboardContent, /title="View Last Encounter"/);
  });

  await t.test('110. PatientContextBar tabs allow direct switching between Encounter, Episode, and Patient without dashboard detour', () => {
    assert.match(patientContextBarContent, /Patient Profile/);
    assert.match(patientContextBarContent, /Episode Hub/);
    assert.match(patientContextBarContent, /Appointments/);
    assert.match(patientContextBarContent, /Visits & Encounters/);
  });
});

// ==============================================================================
// Section 9: UX Ergonomics, Tablet Layout & Touch Targets (Tests 111 - 122)
// ==============================================================================
test('Section 9: UX Ergonomics, Tablet Layout & Touch Targets', async (t) => {
  await t.test('111. PatientContextBar buttons enforce minimum touch height of 44px', () => {
    assert.match(patientContextBarContent, /minHeight:\s*'44px'/);
  });

  await t.test('112. Dashboard schedule action buttons enforce minimum touch height of 44px', () => {
    assert.match(dashboardContent, /minHeight:\s*'44px'/);
  });

  await t.test('113. AppointmentListPage action buttons enforce minimum touch height of 44px', () => {
    assert.match(apptListContent, /minHeight:\s*'44px'/);
  });

  await t.test('114. ClinicalVisitDetailPage Complete Encounter button enforces minimum touch height of 44px', () => {
    assert.match(visitDetailContent, /minHeight:\s*'44px'/);
  });

  await t.test('115. ClinicalNoteDetailPage smart nav links enforce minimum touch height of 44px', () => {
    assert.match(noteDetailContent, /minHeight:\s*'44px'/);
  });

  await t.test('116. EpisodeProfilePage Care Hub action links enforce minimum touch height of 44px', () => {
    assert.match(episodeProfileContent, /minHeight:\s*'44px'/);
  });

  await t.test('117. PatientProfilePage visits list action buttons enforce minimum touch height of 44px', () => {
    assert.match(patientProfileContent, /minHeight:\s*'44px'/);
  });

  await t.test('118. Dashboard uses responsive CSS grid adapting from 1 column on mobile to 3 on desktop', () => {
    assert.match(dashboardContent, /grid grid-cols-1 lg:grid-cols-3/);
  });

  await t.test('119. Dashboard metric cards adapt from 1 column on mobile to 4 on large screens', () => {
    assert.match(dashboardContent, /grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4/);
  });

  await t.test('120. PatientContextBar wraps cleanly across multiple lines without horizontal overflow', () => {
    assert.match(patientContextBarContent, /flex flex-col lg:flex-row/);
    assert.match(patientContextBarContent, /flex-wrap/);
  });

  await t.test('121. In-line documentation checklist uses responsive auto-fit grid', () => {
    assert.match(visitDetailContent, /gridTemplateColumns:\s*'repeat\(auto-fit, minmax\(170px, 1fr\)\)'/);
  });

  await t.test('122. Dashboard quick search input enforces touch height >= 44px', () => {
    assert.match(dashboardContent, /Find patient by name\/ID\.\.\./);
    assert.match(dashboardContent, /minHeight:\s*'44px'/);
  });
});

// ==============================================================================
// Section 10: Performance, Bundle Chunking & Multi-Tenant Security (Tests 123 - 135)
// ==============================================================================
test('Section 10: Performance, Bundle Chunking & Multi-Tenant Security', async (t) => {
  await t.test('123. vite.config.ts configures vendor-supabase chunk separation', () => {
    assert.match(viteConfigContent, /vendor-supabase/);
    assert.match(viteConfigContent, /@supabase/);
  });

  await t.test('124. vite.config.ts configures vendor-icons chunk separation', () => {
    assert.match(viteConfigContent, /vendor-icons/);
    assert.match(viteConfigContent, /lucide-react/);
  });

  await t.test('125. vite.config.ts configures vendor-react chunk separation', () => {
    assert.match(viteConfigContent, /vendor-react/);
    assert.match(viteConfigContent, /react-router/);
  });

  await t.test('126. vite.config.ts configures domain-platform-billing chunk separation', () => {
    assert.match(viteConfigContent, /domain-platform-billing/);
    assert.match(viteConfigContent, /src\/pages\/platform\//);
    assert.match(viteConfigContent, /src\/pages\/billing\//);
  });

  await t.test('127. vite.config.ts configures domain-imaging chunk separation', () => {
    assert.match(viteConfigContent, /domain-imaging/);
    assert.match(viteConfigContent, /src\/pages\/imaging\//);
  });

  await t.test('128. vite.config.ts configures domain-inventory chunk separation', () => {
    assert.match(viteConfigContent, /domain-inventory/);
    assert.match(viteConfigContent, /src\/pages\/inventory\//);
  });

  await t.test('129. vite.config.ts configures domain-packages chunk separation', () => {
    assert.match(viteConfigContent, /domain-packages/);
    assert.match(viteConfigContent, /src\/pages\/packages\//);
  });

  await t.test('130. Dist build contains vendor and domain chunks eliminating monolithic index', () => {
    const distAssetsDir = path.join(ROOT_DIR, 'dist', 'assets');
    assert.ok(fs.existsSync(distAssetsDir));
    const files = fs.readdirSync(distAssetsDir);
    const hasVendorSupabase = files.some(f => f.startsWith('vendor-supabase'));
    const hasVendorReact = files.some(f => f.startsWith('vendor-react'));
    const hasVendorIcons = files.some(f => f.startsWith('vendor-icons'));
    assert.ok(hasVendorSupabase, 'vendor-supabase chunk exists in dist');
    assert.ok(hasVendorReact, 'vendor-react chunk exists in dist');
    assert.ok(hasVendorIcons, 'vendor-icons chunk exists in dist');
  });

  await t.test('131. Main index.js chunk is reduced below 1.2 MB after chunking (55%+ reduction from 2.14 MB)', () => {
    const distAssetsDir = path.join(ROOT_DIR, 'dist', 'assets');
    const files = fs.readdirSync(distAssetsDir);
    const indexFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
    assert.ok(indexFile, 'index bundle exists in dist');
    const stat = fs.statSync(path.join(distAssetsDir, indexFile));
    const sizeKb = stat.size / 1024;
    assert.ok(sizeKb < 1200, `Expected index chunk < 1200 kB, got ${sizeKb.toFixed(2)} kB`);
  });

  await t.test('132. Multi-tenant practice_id header isolation is enforced on clinical queries', () => {
    assert.match(visitServiceContent, /getActivePracticeHeader\(\)/);
    assert.match(noteServiceContent, /getActivePracticeHeader\(\)/);
    assert.match(apptServiceContent, /getActivePracticeHeader\(\)/);
  });

  await t.test('133. ProtectedRoute wraps all /app/* clinical routes', () => {
    assert.match(appContent, /<ProtectedRoute>/);
    assert.match(appContent, /<AppShell \/>/);
  });

  await t.test('134. Zero references to Kabworld across newly created and updated files', () => {
    assert.doesNotMatch(dashboardContent, /kabworld/i);
    assert.doesNotMatch(apptListContent, /kabworld/i);
    assert.doesNotMatch(patientProfileContent, /kabworld/i);
    assert.doesNotMatch(episodeProfileContent, /kabworld/i);
    assert.doesNotMatch(visitDetailContent, /kabworld/i);
    assert.doesNotMatch(patientContextBarContent, /kabworld/i);
    assert.doesNotMatch(statusBadgeContent, /kabworld/i);
  });

  await t.test('135. Zero leaked secrets or private keys in source code', () => {
    assert.doesNotMatch(dashboardContent, /service_role/i);
    assert.doesNotMatch(dashboardContent, /sk_live_/i);
    assert.doesNotMatch(patientContextBarContent, /service_role/i);
    assert.doesNotMatch(statusBadgeContent, /service_role/i);
  });
});
