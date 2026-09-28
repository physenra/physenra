// ==============================================================================
// PHYSENRA POSTGREST RELATIONSHIP DISAMBIGUATION & REGRESSION SUITE
// File: tests/postgrest_relationships.test.cjs
//
// Verifies:
// 1. All service embed queries across clinical visits, clinical notes, episodes of care,
//    appointments, and outcome measures use explicit foreign key constraint hints.
// 2. Composite multi-tenant foreign keys are strictly preserved (no weakened constraints).
// 3. practice_memberships decouples from profiles (no invalid direct relationship query).
// 4. Remote Supabase REST API queries return HTTP 200 OK without PGRST200/PGRST201 errors.
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');

const CLINICAL_VISIT_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'clinicalVisitService.ts');
const CLINICAL_NOTE_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'clinicalNoteService.ts');
const EPISODE_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'episodeService.ts');
const APPOINTMENT_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'appointmentService.ts');
const OUTCOME_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'outcomeMeasureService.ts');
const TREATMENT_PLAN_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'treatmentPlanService.ts');
const PROGRESS_REVIEW_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'progressReviewService.ts');
const CREATE_VISIT_PAGE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'visits', 'CreateClinicalVisitPage.tsx');

const SUPABASE_URL = 'https://xxknmdgneamtoahqayvl.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4a25tZGduZWFtdG9haHFheXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDUzNDgsImV4cCI6MjEwNjEyMTM0OH0.2XKv_9MixK87v-_3U_fEGHBeQsoPRpqM3Rw75QcVznk';
const PRACTICE_ID = '464c128a-f7a1-4efa-9e0b-485b14ae5ff4';

test('PHYSENRA POSTGREST RELATIONSHIP AMBIGUITY REGRESSION SUITE', async (t) => {
  const visitServiceCode = fs.readFileSync(CLINICAL_VISIT_SERVICE_PATH, 'utf8');
  const noteServiceCode = fs.readFileSync(CLINICAL_NOTE_SERVICE_PATH, 'utf8');
  const episodeServiceCode = fs.readFileSync(EPISODE_SERVICE_PATH, 'utf8');
  const apptServiceCode = fs.readFileSync(APPOINTMENT_SERVICE_PATH, 'utf8');
  const outcomeServiceCode = fs.readFileSync(OUTCOME_SERVICE_PATH, 'utf8');
  const tpServiceCode = fs.readFileSync(TREATMENT_PLAN_SERVICE_PATH, 'utf8');
  const prServiceCode = fs.readFileSync(PROGRESS_REVIEW_SERVICE_PATH, 'utf8');
  const createVisitPageCode = fs.readFileSync(CREATE_VISIT_PAGE_PATH, 'utf8');

  // ----------------------------------------------------------------------------
  // SUITE 1: Clinical Visit Service PostgREST Disambiguation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Clinical Visit Service PostgREST Disambiguation ---', async (st) => {
    await st.test('clinicalVisitService uses fk_clinical_visits_patient_practice constraint hint', () => {
      assert(
        visitServiceCode.includes('patient:patients!fk_clinical_visits_patient_practice'),
        'clinicalVisitService must disambiguate patient relation using !fk_clinical_visits_patient_practice'
      );
    });

    await st.test('clinicalVisitService uses fk_clinical_visits_episode_patient_practice constraint hint', () => {
      assert(
        visitServiceCode.includes('episode:episodes_of_care!fk_clinical_visits_episode_patient_practice'),
        'clinicalVisitService must disambiguate episode relation using !fk_clinical_visits_episode_patient_practice'
      );
    });

    await st.test('clinicalVisitService uses fk_clinical_visits_appointment_patient_practice constraint hint', () => {
      assert(
        visitServiceCode.includes('appointment:appointments!fk_clinical_visits_appointment_patient_practice'),
        'clinicalVisitService must disambiguate appointment relation using !fk_clinical_visits_appointment_patient_practice'
      );
    });

    await st.test('clinicalVisitService contains zero unhinted embeds for patient, episode, or appointment', () => {
      assert(
        !visitServiceCode.includes('patient:patients ('),
        'clinicalVisitService must not contain unhinted patient:patients ('
      );
      assert(
        !visitServiceCode.includes('episode:episodes_of_care ('),
        'clinicalVisitService must not contain unhinted episode:episodes_of_care ('
      );
      assert(
        !visitServiceCode.includes('appointment:appointments ('),
        'clinicalVisitService must not contain unhinted appointment:appointments ('
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Clinical Note Service PostgREST Disambiguation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Clinical Note Service PostgREST Disambiguation ---', async (st) => {
    await st.test('clinicalNoteService uses fk_clinical_notes_patient_practice constraint hint', () => {
      assert(
        noteServiceCode.includes('patient:patients!fk_clinical_notes_patient_practice'),
        'clinicalNoteService must disambiguate patient relation using !fk_clinical_notes_patient_practice'
      );
    });

    await st.test('clinicalNoteService uses fk_clinical_notes_episode_patient_practice constraint hint', () => {
      assert(
        noteServiceCode.includes('episode:episodes_of_care!fk_clinical_notes_episode_patient_practice'),
        'clinicalNoteService must disambiguate episode relation using !fk_clinical_notes_episode_patient_practice'
      );
    });

    await st.test('clinicalNoteService uses fk_clinical_notes_visit_patient_practice constraint hint', () => {
      assert(
        noteServiceCode.includes('clinical_visit:clinical_visits!fk_clinical_notes_visit_patient_practice'),
        'clinicalNoteService must disambiguate clinical visit relation using !fk_clinical_notes_visit_patient_practice'
      );
    });

    await st.test('clinicalNoteService contains zero unhinted embeds', () => {
      assert(
        !noteServiceCode.includes('patient:patients ('),
        'clinicalNoteService must not contain unhinted patient:patients ('
      );
      assert(
        !noteServiceCode.includes('episode:episodes_of_care ('),
        'clinicalNoteService must not contain unhinted episode:episodes_of_care ('
      );
      assert(
        !noteServiceCode.includes('clinical_visit:clinical_visits ('),
        'clinicalNoteService must not contain unhinted clinical_visit:clinical_visits ('
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Episode of Care Service PostgREST Disambiguation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Episode of Care Service PostgREST Disambiguation ---', async (st) => {
    await st.test('episodeService uses fk_episodes_patient_practice constraint hint', () => {
      assert(
        episodeServiceCode.includes('patients!fk_episodes_patient_practice'),
        'episodeService must disambiguate patient relation using !fk_episodes_patient_practice'
      );
    });

    await st.test('episodeService contains zero unhinted patient embeds', () => {
      assert(
        !episodeServiceCode.includes('patients (\n'),
        'episodeService must not contain unhinted patients ('
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Appointment Service PostgREST Disambiguation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Appointment Service PostgREST Disambiguation ---', async (st) => {
    await st.test('appointmentService uses fk_appointments_patient_practice constraint hint', () => {
      assert(
        apptServiceCode.includes('patient:patients!fk_appointments_patient_practice') ||
        apptServiceCode.includes('patients!fk_appointments_patient_practice'),
        'appointmentService must disambiguate patient relation using !fk_appointments_patient_practice'
      );
    });

    await st.test('appointmentService uses fk_appointments_episode_patient_practice constraint hint', () => {
      assert(
        apptServiceCode.includes('episode:episodes_of_care!fk_appointments_episode_patient_practice'),
        'appointmentService must disambiguate episode relation using !fk_appointments_episode_patient_practice'
      );
    });

    await st.test('appointmentService contains zero unhinted embeds', () => {
      assert(
        !apptServiceCode.includes('patient:patients ('),
        'appointmentService must not contain unhinted patient:patients ('
      );
      assert(
        !apptServiceCode.includes('episode:episodes_of_care ('),
        'appointmentService must not contain unhinted episode:episodes_of_care ('
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Outcome Measure Service PostgREST Disambiguation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Outcome Measure Service PostgREST Disambiguation ---', async (st) => {
    await st.test('outcomeMeasureService uses fk_outcome_assessments_patient_practice hint', () => {
      assert(
        outcomeServiceCode.includes('patient:patients!fk_outcome_assessments_patient_practice'),
        'outcomeMeasureService must disambiguate patient relation using !fk_outcome_assessments_patient_practice'
      );
    });

    await st.test('outcomeMeasureService uses fk_outcome_assessments_episode_patient_practice hint', () => {
      assert(
        outcomeServiceCode.includes('episode:episodes_of_care!fk_outcome_assessments_episode_patient_practice'),
        'outcomeMeasureService must disambiguate episode relation using !fk_outcome_assessments_episode_patient_practice'
      );
    });

    await st.test('outcomeMeasureService uses fk_outcome_assessments_visit_patient_practice hint', () => {
      assert(
        outcomeServiceCode.includes('clinical_visit:clinical_visits!fk_outcome_assessments_visit_patient_practice'),
        'outcomeMeasureService must disambiguate clinical visit relation using !fk_outcome_assessments_visit_patient_practice'
      );
    });

    await st.test('outcomeMeasureService contains zero unhinted embeds for patient, episode, or visit', () => {
      assert(
        !outcomeServiceCode.includes('patient:patients ('),
        'outcomeMeasureService must not contain unhinted patient:patients ('
      );
      assert(
        !outcomeServiceCode.includes('episode:episodes_of_care ('),
        'outcomeMeasureService must not contain unhinted episode:episodes_of_care ('
      );
      assert(
        !outcomeServiceCode.includes('clinical_visit:clinical_visits ('),
        'outcomeMeasureService must not contain unhinted clinical_visit:clinical_visits ('
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: UI Component Practice Membership & Profile Decoupling
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: UI Component Practice Membership & Profile Decoupling ---', async (st) => {
    await st.test('CreateClinicalVisitPage does NOT join profiles directly from practice_memberships', () => {
      assert(
        !createVisitPageCode.includes('profiles(id, display_name'),
        'CreateClinicalVisitPage must not attempt invalid direct join from practice_memberships to profiles'
      );
    });

    await st.test('CreateClinicalVisitPage delegates clinician retrieval to appointmentService.getClinicians()', () => {
      assert(
        createVisitPageCode.includes('appointmentService.getClinicians()'),
        'CreateClinicalVisitPage must use appointmentService.getClinicians()'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 7: Treatment Plan Service PostgREST Disambiguation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 7: Treatment Plan Service PostgREST Disambiguation ---', async (st) => {
    await st.test('treatmentPlanService uses fk_treatment_plans_patient_practice constraint hint', () => {
      assert(
        tpServiceCode.includes('patient:patients!fk_treatment_plans_patient_practice'),
        'treatmentPlanService must disambiguate patient relation using !fk_treatment_plans_patient_practice'
      );
    });

    await st.test('treatmentPlanService uses fk_treatment_plans_episode_patient_practice constraint hint', () => {
      assert(
        tpServiceCode.includes('episode:episodes_of_care!fk_treatment_plans_episode_patient_practice'),
        'treatmentPlanService must disambiguate episode relation using !fk_treatment_plans_episode_patient_practice'
      );
    });

    await st.test('treatmentPlanService uses fk_treatment_plans_visit_patient_practice constraint hint', () => {
      assert(
        tpServiceCode.includes('originating_clinical_visit:clinical_visits!fk_treatment_plans_visit_patient_practice'),
        'treatmentPlanService must disambiguate visit relation using !fk_treatment_plans_visit_patient_practice'
      );
    });

    await st.test('treatmentPlanService uses fk_tp_goals_baseline_oa and target_oa constraint hints', () => {
      assert(
        tpServiceCode.includes('baseline_outcome_assessment:outcome_measure_assessments!fk_tp_goals_baseline_oa'),
        'treatmentPlanService must disambiguate baseline outcome assessment using !fk_tp_goals_baseline_oa'
      );
      assert(
        tpServiceCode.includes('target_outcome_assessment:outcome_measure_assessments!fk_tp_goals_target_oa'),
        'treatmentPlanService must disambiguate target outcome assessment using !fk_tp_goals_target_oa'
      );
    });

    await st.test('treatmentPlanService contains zero unhinted embeds for patient, episode, or visit', () => {
      assert(
        !tpServiceCode.includes('patient:patients ('),
        'treatmentPlanService must not contain unhinted patient:patients ('
      );
      assert(
        !tpServiceCode.includes('episode:episodes_of_care ('),
        'treatmentPlanService must not contain unhinted episode:episodes_of_care ('
      );
      assert(
        !tpServiceCode.includes('clinical_visit:clinical_visits ('),
        'treatmentPlanService must not contain unhinted clinical_visit:clinical_visits ('
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 8: Progress Review Service PostgREST Disambiguation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 8: Progress Review Service PostgREST Disambiguation ---', async (st) => {
    await st.test('progressReviewService uses fk_progress_reviews_patient_practice constraint hint', () => {
      assert(
        prServiceCode.includes('patient:patients!fk_progress_reviews_patient_practice'),
        'progressReviewService must disambiguate patient relation using !fk_progress_reviews_patient_practice'
      );
    });

    await st.test('progressReviewService uses fk_progress_reviews_episode_patient_practice constraint hint', () => {
      assert(
        prServiceCode.includes('episode:episodes_of_care!fk_progress_reviews_episode_patient_practice'),
        'progressReviewService must disambiguate episode relation using !fk_progress_reviews_episode_patient_practice'
      );
    });

    await st.test('progressReviewService uses fk_progress_reviews_plan_patient_episode_practice constraint hint', () => {
      assert(
        prServiceCode.includes('treatment_plan:treatment_plans!fk_progress_reviews_plan_patient_episode_practice'),
        'progressReviewService must disambiguate treatment plan relation using !fk_progress_reviews_plan_patient_episode_practice'
      );
    });

    await st.test('progressReviewService uses fk_progress_reviews_visit_patient_practice constraint hint', () => {
      assert(
        prServiceCode.includes('originating_clinical_visit:clinical_visits!fk_progress_reviews_visit_patient_practice'),
        'progressReviewService must disambiguate clinical visit relation using !fk_progress_reviews_visit_patient_practice'
      );
    });

    await st.test('progressReviewService uses fk_prg_goals_review_practice and fk_prg_goals_goal_practice hints', () => {
      assert(
        prServiceCode.includes('goals:progress_review_goals!fk_prg_goals_review_practice'),
        'progressReviewService must disambiguate review goals using !fk_prg_goals_review_practice'
      );
      assert(
        prServiceCode.includes('treatment_plan_goal:treatment_plan_goals!fk_prg_goals_goal_practice'),
        'progressReviewService must disambiguate plan goal using !fk_prg_goals_goal_practice'
      );
      assert(
        prServiceCode.includes('linked_outcome_assessment:outcome_measure_assessments!fk_prg_goals_outcome_assessment'),
        'progressReviewService must disambiguate outcome assessment using !fk_prg_goals_outcome_assessment'
      );
    });

    await st.test('progressReviewService contains zero unhinted embeds for patient, episode, or visit', () => {
      assert(
        !prServiceCode.includes('patient:patients ('),
        'progressReviewService must not contain unhinted patient:patients ('
      );
      assert(
        !prServiceCode.includes('episode:episodes_of_care ('),
        'progressReviewService must not contain unhinted episode:episodes_of_care ('
      );
      assert(
        !prServiceCode.includes('originating_clinical_visit:clinical_visits ('),
        'progressReviewService must not contain unhinted clinical_visit:clinical_visits ('
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 9: Remote PostgREST API Live Query Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 9: Remote PostgREST API Live Query Verification ---', async (st) => {
    const remoteQueries = [
      {
        name: 'Clinical Visits with disambiguated patient, episode, and appointment',
        table: 'clinical_visits',
        select: '*,patient:patients!fk_clinical_visits_patient_practice(id,patient_identifier,first_name,last_name,phone,email),episode:episodes_of_care!fk_clinical_visits_episode_patient_practice(id,episode_identifier,title,status),appointment:appointments!fk_clinical_visits_appointment_patient_practice(id,appointment_identifier,status,scheduled_start,scheduled_end,appointment_type)'
      },
      {
        name: 'Clinical Notes with disambiguated patient, episode, and clinical visit',
        table: 'clinical_notes',
        select: '*,patient:patients!fk_clinical_notes_patient_practice(id,patient_identifier,first_name,last_name,phone,email),episode:episodes_of_care!fk_clinical_notes_episode_patient_practice(id,episode_identifier,title,status),clinical_visit:clinical_visits!fk_clinical_notes_visit_patient_practice(id,visit_identifier,status,actual_start,actual_end)'
      },
      {
        name: 'Episodes of Care with disambiguated patient',
        table: 'episodes_of_care',
        select: '*,patients!fk_episodes_patient_practice(id,patient_identifier,first_name,last_name,phone,email)'
      },
      {
        name: 'Appointments with disambiguated patient and episode',
        table: 'appointments',
        select: '*,patient:patients!fk_appointments_patient_practice(id,patient_identifier,first_name,last_name,phone,email),episode:episodes_of_care!fk_appointments_episode_patient_practice(id,episode_identifier,title,status)'
      },
      {
        name: 'Outcome Assessments with disambiguated patient, episode, visit, and definition',
        table: 'outcome_measure_assessments',
        select: '*,patient:patients!fk_outcome_assessments_patient_practice(id,patient_identifier,first_name,last_name,phone,email),episode:episodes_of_care!fk_outcome_assessments_episode_patient_practice(id,episode_identifier,title,status),clinical_visit:clinical_visits!fk_outcome_assessments_visit_patient_practice(id,visit_identifier,status,actual_start,actual_end),definition:outcome_measure_definitions(*)'
      },
      {
        name: 'Home Exercise Programs with disambiguated patient, episode, and clinical visit',
        table: 'home_exercise_programs',
        select: '*,patient:patients!fk_hep_patient_practice(id,patient_identifier,first_name,last_name,phone,email),episode:episodes_of_care!fk_hep_episode_patient_practice(id,episode_identifier,title,status),clinical_visit:clinical_visits!fk_hep_visit_patient_practice(id,visit_identifier,status,actual_start,actual_end)'
      },
      {
        name: 'Home Exercise Program Items with exercise details',
        table: 'home_exercise_program_items',
        select: '*,exercise:exercises!fk_hep_items_exercise(*)'
      },
      {
        name: 'Treatment Plans with disambiguated patient, episode, and originating clinical visit',
        table: 'treatment_plans',
        select: '*,patient:patients!fk_treatment_plans_patient_practice(id,patient_identifier,first_name,last_name,phone,email),episode:episodes_of_care!fk_treatment_plans_episode_patient_practice(id,episode_identifier,title,status),originating_clinical_visit:clinical_visits!fk_treatment_plans_visit_patient_practice(id,visit_identifier,status,actual_start,actual_end)'
      },
      {
        name: 'Treatment Plan Goals with disambiguated baseline and target outcome assessments',
        table: 'treatment_plan_goals',
        select: '*,baseline_outcome_assessment:outcome_measure_assessments!fk_tp_goals_baseline_oa(id,assessment_identifier,status,numeric_score),target_outcome_assessment:outcome_measure_assessments!fk_tp_goals_target_oa(id,assessment_identifier,status,numeric_score)'
      },
      {
        name: 'Progress Reviews with disambiguated patient, episode, treatment plan, and originating visit',
        table: 'progress_reviews',
        select: '*,patient:patients!fk_progress_reviews_patient_practice(id,patient_identifier,first_name,last_name,phone,email),episode:episodes_of_care!fk_progress_reviews_episode_patient_practice(id,episode_identifier,title,status),treatment_plan:treatment_plans!fk_progress_reviews_plan_patient_episode_practice(id,plan_identifier,title,status),originating_clinical_visit:clinical_visits!fk_progress_reviews_visit_patient_practice(id,visit_identifier,status,actual_start,actual_end)'
      },
      {
        name: 'Progress Review Goals with disambiguated goal and linked outcome assessment',
        table: 'progress_review_goals',
        select: '*,treatment_plan_goal:treatment_plan_goals!fk_prg_goals_goal_practice(id,goal_statement,status),linked_outcome_assessment:outcome_measure_assessments!fk_prg_goals_outcome_assessment(id,assessment_identifier,status,numeric_score)'
      }
    ];

    for (const q of remoteQueries) {
      await st.test(`Remote query returns HTTP 200 OK: ${q.name}`, async () => {
        const url = `${SUPABASE_URL}/rest/v1/${q.table}?select=${encodeURIComponent(q.select)}&limit=1`;
        const res = await fetch(url, {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Practice-ID': PRACTICE_ID
          }
        });
        const bodyText = await res.text();
        assert.equal(
          res.status,
          200,
          `Expected HTTP 200 for ${q.name}, but got ${res.status}. Body: ${bodyText}`
        );
      });
    }

    await st.test('Unhinted query reproduces PGRST201 HTTP 300 to prove disambiguation is required', async () => {
      const url = `${SUPABASE_URL}/rest/v1/clinical_visits?select=*,patients(id)&limit=1`;
      const res = await fetch(url, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Practice-ID': PRACTICE_ID
        }
      });
      assert.equal(
        res.status,
        300,
        `Expected HTTP 300 (Ambiguous relationship) for unhinted query, got ${res.status}`
      );
    });

    await st.test('Unhinted treatment_plans query reproduces PGRST201 HTTP 300 to prove disambiguation is required', async () => {
      const url = `${SUPABASE_URL}/rest/v1/treatment_plans?select=*,patients(id)&limit=1`;
      const res = await fetch(url, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Practice-ID': PRACTICE_ID
        }
      });
      assert.equal(
        res.status,
        300,
        `Expected HTTP 300 (Ambiguous relationship) for unhinted treatment_plans query, got ${res.status}`
      );
    });

    await st.test('Unhinted progress_reviews query reproduces PGRST201 HTTP 300 to prove disambiguation is required', async () => {
      const url = `${SUPABASE_URL}/rest/v1/progress_reviews?select=*,patients(id)&limit=1`;
      const res = await fetch(url, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Practice-ID': PRACTICE_ID
        }
      });
      assert.equal(
        res.status,
        300,
        `Expected HTTP 300 (Ambiguous relationship) for unhinted progress_reviews query, got ${res.status}`
      );
    });
  });
});
