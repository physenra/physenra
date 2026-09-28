// ==============================================================================
// PHYSENRA MILESTONE & PROGRESS REVIEW FOUNDATION V1 VERIFICATION SUITE
// File: tests/milestone_progress_review.test.cjs
//
// Verifies:
// 1. Schema integrity & multi-tenant composite foreign keys
// 2. Atomic sequential identifier generator (PRG-000001)
// 3. Immutability, clinician validation & lifecycle triggers
// 4. Strict Row-Level Security (RLS) & zero hard-delete policy for finalized records
// 5. Goal progress evaluation integrity & cross-plan protection
// 6. Absolute domain boundary verification (Zero billing/packages/wallets/insurance/AI/WhatsApp/Discharge)
// 7. Application service domain logic & state machine rules
// 8. Remote Supabase live query verification with PostgREST constraint hints
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MIGRATION_PATH = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260928033000_milestone_progress_review_foundation.sql'
);
const SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'progressReviewService.ts'
);
const TYPES_PATH = path.join(
  __dirname,
  '..',
  'src',
  'types',
  'database.ts'
);

const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
const serviceCode = fs.readFileSync(SERVICE_PATH, 'utf8');
const typesCode = fs.readFileSync(TYPES_PATH, 'utf8');

const SUPABASE_URL = 'https://xxknmdgneamtoahqayvl.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4a25tZGduZWFtdG9haHFheXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDUzNDgsImV4cCI6MjEwNjEyMTM0OH0.2XKv_9MixK87v-_3U_fEGHBeQsoPRpqM3Rw75QcVznk';
const PRACTICE_ID = '464c128a-f7a1-4efa-9e0b-485b14ae5ff4';

test('PHYSENRA MILESTONE & PROGRESS REVIEW FOUNDATION V1 VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Database Schema & Relational Tenancy
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Progress Review Database Schema & Relational Tenancy ---', async (st) => {
    await st.test('Migration creates public.practice_progress_review_counters table', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.practice_progress_review_counters') ||
        migrationSql.includes('CREATE TABLE public.practice_progress_review_counters'),
        'Must create public.practice_progress_review_counters'
      );
    });

    await st.test('Migration creates public.progress_reviews table with UUID primary key', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.progress_reviews') ||
        migrationSql.includes('CREATE TABLE public.progress_reviews'),
        'Must create public.progress_reviews table'
      );
      assert(
        migrationSql.includes('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'),
        'Must use UUID primary key with gen_random_uuid()'
      );
    });

    await st.test('Migration creates public.progress_review_goals table with UUID primary key', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.progress_review_goals') ||
        migrationSql.includes('CREATE TABLE public.progress_review_goals'),
        'Must create public.progress_review_goals table'
      );
    });

    await st.test('Migration defines multi-tenant composite foreign keys for progress_reviews', () => {
      assert(
        migrationSql.includes('CONSTRAINT fk_progress_reviews_patient_practice') &&
        migrationSql.includes('FOREIGN KEY (patient_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.patients(id, practice_id)'),
        'Must define composite FK to patients(id, practice_id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_progress_reviews_episode_patient_practice') &&
        migrationSql.includes('FOREIGN KEY (episode_id, patient_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.episodes_of_care(id, patient_id, practice_id)'),
        'Must define composite FK to episodes_of_care(id, patient_id, practice_id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_progress_reviews_plan_patient_episode_practice') &&
        migrationSql.includes('FOREIGN KEY (treatment_plan_id, patient_id, episode_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.treatment_plans(id, patient_id, episode_id, practice_id)'),
        'Must define composite FK to treatment_plans(id, patient_id, episode_id, practice_id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_progress_reviews_visit_patient_practice') &&
        migrationSql.includes('FOREIGN KEY (originating_clinical_visit_id, patient_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.clinical_visits(id, patient_id, practice_id)'),
        'Must define composite FK to clinical_visits(id, patient_id, practice_id)'
      );
    });

    await st.test('Migration defines multi-tenant composite foreign keys for progress_review_goals', () => {
      assert(
        migrationSql.includes('CONSTRAINT fk_prg_goals_review_practice') &&
        migrationSql.includes('FOREIGN KEY (progress_review_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.progress_reviews(id, practice_id)'),
        'Must define composite FK to progress_reviews(id, practice_id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_prg_goals_goal_practice') &&
        migrationSql.includes('FOREIGN KEY (treatment_plan_goal_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.treatment_plan_goals(id, practice_id)'),
        'Must define composite FK to treatment_plan_goals(id, practice_id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_prg_goals_outcome_assessment') &&
        migrationSql.includes('REFERENCES public.outcome_measure_assessments(id)'),
        'Must link to outcome_measure_assessments'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Identifier Generator & Trigger Invariants
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Identifier Generator & Trigger Invariants ---', async (st) => {
    await st.test('generate_next_progress_review_identifier is SECURITY DEFINER with fixed search_path', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.generate_next_progress_review_identifier'),
        'Must declare generate_next_progress_review_identifier function'
      );
      assert(
        migrationSql.includes('SECURITY DEFINER'),
        'Function must be SECURITY DEFINER'
      );
      assert(
        migrationSql.includes('SET search_path = public, pg_temp'),
        'Function must set fixed search_path'
      );
    });

    await st.test('Identifier generator validates tenant context and authorized roles', () => {
      assert(
        migrationSql.includes('public.current_practice_id()'),
        'Must validate current_practice_id context'
      );
      assert(
        migrationSql.includes('public.user_has_practice_role(p_practice_id, ARRAY[\'practice_owner\', \'practice_manager\', \'physiotherapist\'])'),
        'Must restrict execution to authorized clinical roles'
      );
      assert(
        migrationSql.includes("'PRG-' || LPAD("),
        'Must generate PRG-000001 formatted identifier'
      );
    });

    await st.test('Triggers protect progress review immutability, state machine, and deny hard deletes', () => {
      assert(
        migrationSql.includes('CREATE TRIGGER trg_validate_progress_review_clinician'),
        'Must attach clinician validation trigger'
      );
      assert(
        migrationSql.includes('CREATE TRIGGER trg_validate_progress_review_goal_link'),
        'Must attach goal-plan integrity verification trigger'
      );
      assert(
        migrationSql.includes('CREATE TRIGGER trg_protect_progress_review_immutability'),
        'Must attach progress review immutability trigger'
      );
      assert(
        migrationSql.includes('CREATE TRIGGER trg_protect_progress_review_goals_lifecycle'),
        'Must attach goal review lifecycle protection trigger'
      );
      assert(
        migrationSql.includes('CREATE TRIGGER trg_deny_progress_review_hard_delete'),
        'Must attach deny hard delete trigger'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Tenant Isolation & Row-Level Security
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Tenant Isolation & Row-Level Security ---', async (st) => {
    await st.test('RLS is explicitly enabled on all progress review tables', () => {
      assert(
        migrationSql.includes('ALTER TABLE public.practice_progress_review_counters ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on counters table'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.progress_reviews ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on progress_reviews'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.progress_review_goals ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on progress_review_goals'
      );
    });

    await st.test('Hard delete is strictly denied via RLS delete policy on non-draft reviews', () => {
      assert(
        migrationSql.includes("overall_status = 'draft'"),
        'Delete policy on progress_reviews must restrict deletion strictly to draft records'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Absolute Domain Boundary Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Absolute Domain Boundary Verification ---', async (st) => {
    const prohibitedTerms = [
      'invoices',
      'payments',
      'patient_wallets',
      'wallet_transactions',
      'packages',
      'package_session_ledger',
      'insurance_claims',
      'whatsapp',
      'ai_jobs',
      'discharge_summaries'
    ];

    for (const term of prohibitedTerms) {
      await st.test(`Migration does NOT introduce prohibited domain entity '${term}'`, () => {
        const regex = new RegExp(`CREATE TABLE[\\s\\S]*?${term}`, 'i');
        assert(
          !regex.test(migrationSql),
          `Boundary violation: Found prohibited table or entity '${term}' in migration`
        );
      });
    }
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Application Service & Domain Logic
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Application Service & Domain Logic ---', async (st) => {
    await st.test('progressReviewService integrates with public.log_audit_event for lifecycle events', () => {
      assert(
        serviceCode.includes("p_action: 'progress_review.created'"),
        'Must audit progress_review.created'
      );
      assert(
        serviceCode.includes("p_action: 'progress_review.updated'"),
        'Must audit progress_review.updated'
      );
      assert(
        serviceCode.includes("p_action: 'progress_review.finalized'"),
        'Must audit progress_review.finalized'
      );
      assert(
        serviceCode.includes("p_action: 'progress_review.amended'"),
        'Must audit progress_review.amended'
      );
      assert(
        serviceCode.includes("p_action: 'progress_review.deleted'"),
        'Must audit progress_review.deleted'
      );
    });

    await st.test('progressReviewService enforces allowed lifecycle transitions', () => {
      assert(
        serviceCode.includes('ALLOWED_PROGRESS_REVIEW_TRANSITIONS'),
        'Must define ALLOWED_PROGRESS_REVIEW_TRANSITIONS state map'
      );
    });

    await st.test('progressReviewService uses explicit PostgREST foreign key constraint hints', () => {
      assert(
        serviceCode.includes('patient:patients!fk_progress_reviews_patient_practice'),
        'Must use explicit hint for patient'
      );
      assert(
        serviceCode.includes('episode:episodes_of_care!fk_progress_reviews_episode_patient_practice'),
        'Must use explicit hint for episode'
      );
      assert(
        serviceCode.includes('treatment_plan:treatment_plans!fk_progress_reviews_plan_patient_episode_practice'),
        'Must use explicit hint for treatment plan'
      );
      assert(
        serviceCode.includes('originating_clinical_visit:clinical_visits!fk_progress_reviews_visit_patient_practice'),
        'Must use explicit hint for clinical visit'
      );
      assert(
        serviceCode.includes('goals:progress_review_goals!fk_prg_goals_review_practice'),
        'Must use explicit hint for review goals'
      );
      assert(
        serviceCode.includes('treatment_plan_goal:treatment_plan_goals!fk_prg_goals_goal_practice'),
        'Must use explicit hint for plan goals'
      );
      assert(
        serviceCode.includes('linked_outcome_assessment:outcome_measure_assessments!fk_prg_goals_outcome_assessment'),
        'Must use explicit hint for outcome assessments'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Remote Supabase Live Query Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Remote Supabase Live Query Verification ---', async (st) => {
    await st.test('Remote query returns HTTP 200 OK: Progress Reviews with disambiguated relations', async () => {
      const select = '*,patient:patients!fk_progress_reviews_patient_practice(id,patient_identifier,first_name,last_name),episode:episodes_of_care!fk_progress_reviews_episode_patient_practice(id,episode_identifier,title),treatment_plan:treatment_plans!fk_progress_reviews_plan_patient_episode_practice(id,plan_identifier,title)';
      const url = `${SUPABASE_URL}/rest/v1/progress_reviews?select=${encodeURIComponent(select)}&limit=1`;
      const res = await fetch(url, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Practice-ID': PRACTICE_ID
        }
      });
      const body = await res.text();
      assert.equal(
        res.status,
        200,
        `Expected HTTP 200 for progress_reviews query, got ${res.status}. Body: ${body}`
      );
    });

    await st.test('Remote query returns HTTP 200 OK: Progress Review Goals with disambiguated plan goals', async () => {
      const select = '*,treatment_plan_goal:treatment_plan_goals!fk_prg_goals_goal_practice(id,goal_statement,status),linked_outcome_assessment:outcome_measure_assessments!fk_prg_goals_outcome_assessment(id,assessment_identifier,status)';
      const url = `${SUPABASE_URL}/rest/v1/progress_review_goals?select=${encodeURIComponent(select)}&limit=1`;
      const res = await fetch(url, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Practice-ID': PRACTICE_ID
        }
      });
      const body = await res.text();
      assert.equal(
        res.status,
        200,
        `Expected HTTP 200 for progress_review_goals query, got ${res.status}. Body: ${body}`
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
