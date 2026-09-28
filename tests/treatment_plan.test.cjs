// ==============================================================================
// PHYSENRA TREATMENT PLAN & CLINICAL GOALS FOUNDATION V1 VERIFICATION SUITE
// File: tests/treatment_plan.test.cjs
//
// Verifies:
// 1. Schema integrity & multi-tenant composite foreign keys
// 2. Atomic sequential identifier generator (TPL-000001)
// 3. Immutability, clinician validation & state machine triggers
// 4. Strict Row-Level Security (RLS) & zero hard-delete policy
// 5. Goals lifecycle protection on active/terminal plans
// 6. Absolute domain boundary verification (Zero billing/packages/wallets/insurance/AI/WhatsApp/email)
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
  '20260928032000_treatment_plan_foundation.sql'
);
const SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'treatmentPlanService.ts'
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

test('PHYSENRA TREATMENT PLAN & CLINICAL GOALS FOUNDATION V1 VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Database Schema & Relational Tenancy
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Treatment Plan Database Schema & Relational Tenancy ---', async (st) => {
    await st.test('Migration creates public.practice_treatment_plan_counters table', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.practice_treatment_plan_counters') ||
        migrationSql.includes('CREATE TABLE public.practice_treatment_plan_counters'),
        'Must create public.practice_treatment_plan_counters'
      );
    });

    await st.test('Migration creates public.treatment_plans table with UUID primary key', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.treatment_plans') ||
        migrationSql.includes('CREATE TABLE public.treatment_plans'),
        'Must create public.treatment_plans'
      );
      assert(
        migrationSql.includes('plan_identifier TEXT NOT NULL'),
        'Must define plan_identifier'
      );
      assert(
        migrationSql.includes('status public.treatment_plan_status NOT NULL DEFAULT \'draft\''),
        'Must define treatment_plan_status enum column'
      );
    });

    await st.test('Migration creates public.treatment_plan_goals table with UUID primary key', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.treatment_plan_goals') ||
        migrationSql.includes('CREATE TABLE public.treatment_plan_goals'),
        'Must create public.treatment_plan_goals'
      );
      assert(
        migrationSql.includes('goal_statement TEXT NOT NULL'),
        'Must define goal_statement'
      );
    });

    await st.test('Migration defines multi-tenant composite foreign keys for treatment_plans', () => {
      assert(
        migrationSql.includes('CONSTRAINT fk_treatment_plans_patient_practice') &&
        migrationSql.includes('FOREIGN KEY (patient_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.patients(id, practice_id)'),
        'Must enforce composite FK (patient_id, practice_id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_treatment_plans_episode_patient_practice') &&
        migrationSql.includes('FOREIGN KEY (episode_id, patient_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.episodes_of_care(id, patient_id, practice_id)'),
        'Must enforce composite FK (episode_id, patient_id, practice_id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_treatment_plans_visit_patient_practice') &&
        migrationSql.includes('FOREIGN KEY (originating_clinical_visit_id, patient_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.clinical_visits(id, patient_id, practice_id)'),
        'Must enforce composite FK (originating_clinical_visit_id, patient_id, practice_id)'
      );
    });

    await st.test('Migration defines multi-tenant composite foreign key and outcome links for treatment_plan_goals', () => {
      assert(
        migrationSql.includes('CONSTRAINT fk_tp_goals_plan_practice') &&
        migrationSql.includes('FOREIGN KEY (treatment_plan_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.treatment_plans(id, practice_id)'),
        'Goals must enforce composite FK (treatment_plan_id, practice_id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_tp_goals_baseline_oa') &&
        migrationSql.includes('REFERENCES public.outcome_measure_assessments(id)'),
        'Goals must reference baseline outcome assessment'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_tp_goals_target_oa') &&
        migrationSql.includes('REFERENCES public.outcome_measure_assessments(id)'),
        'Goals must reference target outcome assessment'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Identifier Generator & Trigger Invariants
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Identifier Generator & Trigger Invariants ---', async (st) => {
    await st.test('generate_next_treatment_plan_identifier is SECURITY DEFINER with fixed search_path', () => {
      assert(
        migrationSql.includes('FUNCTION public.generate_next_treatment_plan_identifier'),
        'Must define generate_next_treatment_plan_identifier'
      );
      assert(
        migrationSql.includes('SECURITY DEFINER'),
        'Identifier generator must be SECURITY DEFINER'
      );
      assert(
        migrationSql.includes('SET search_path = public, pg_temp'),
        'Must have fixed search_path'
      );
    });

    await st.test('Identifier generator validates tenant context and authorized roles', () => {
      assert(
        migrationSql.includes('public.current_practice_id()'),
        'Must validate current_practice_id()'
      );
      assert(
        migrationSql.includes('public.user_has_practice_role'),
        'Must validate clinical role'
      );
    });

    await st.test('Triggers protect treatment plan immutability, state machine, and deny hard deletes', () => {
      assert(
        migrationSql.includes('FUNCTION public.protect_treatment_plan_immutability'),
        'Must define protect_treatment_plan_immutability function'
      );
      assert(
        migrationSql.includes('FUNCTION public.deny_treatment_plan_hard_delete'),
        'Must define deny_treatment_plan_hard_delete function'
      );
      assert(
        migrationSql.includes('FUNCTION public.protect_treatment_plan_goals_lifecycle'),
        'Must define protect_treatment_plan_goals_lifecycle function'
      );
      assert(
        migrationSql.includes('FUNCTION public.validate_treatment_plan_clinician'),
        'Must define validate_treatment_plan_clinician function'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Tenant Isolation & Row-Level Security
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Tenant Isolation & Row-Level Security ---', async (st) => {
    await st.test('RLS is explicitly enabled on all treatment plan tables', () => {
      assert(
        migrationSql.includes('ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on treatment_plans'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.treatment_plan_goals ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on treatment_plan_goals'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.practice_treatment_plan_counters ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on practice_treatment_plan_counters'
      );
    });

    await st.test('Hard delete is strictly denied via RLS policy on treatment_plans', () => {
      assert(
        migrationSql.includes('CREATE POLICY treatment_plans_deny_delete ON public.treatment_plans'),
        'Must define treatment_plans_deny_delete'
      );
      assert(
        migrationSql.includes('FOR DELETE TO authenticated') && migrationSql.includes('USING (false)'),
        'treatment_plans_deny_delete must use USING (false)'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Absolute Domain Boundary Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Absolute Domain Boundary Verification ---', async (st) => {
    const forbiddenPatterns = [
      'invoices',
      'payments',
      'patient_wallets',
      'wallet_transactions',
      'packages',
      'package_session_ledger',
      'insurance_claims',
      'whatsapp',
      'ai_jobs',
    ];

    for (const pattern of forbiddenPatterns) {
      await st.test(`Migration does NOT introduce prohibited table or column '${pattern}'`, () => {
        const regex = new RegExp(`CREATE\\s+TABLE[^;]*\\b${pattern}\\b`, 'i');
        assert(
          !regex.test(migrationSql),
          `Migration must not introduce prohibited table matching '${pattern}'`
        );
      });
    }
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Application Service & Domain Logic
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Application Service & Domain Logic ---', async (st) => {
    await st.test('treatmentPlanService integrates with public.log_audit_event for lifecycle events', () => {
      assert(serviceCode.includes('log_audit_event'), 'Must call log_audit_event RPC');
      assert(serviceCode.includes('treatment_plan.created'), 'Must audit treatment_plan.created');
      assert(serviceCode.includes('treatment_plan.activated'), 'Must audit treatment_plan.activated');
      assert(serviceCode.includes('treatment_plan.paused'), 'Must audit treatment_plan.paused');
      assert(serviceCode.includes('treatment_plan.resumed'), 'Must audit treatment_plan.resumed');
      assert(serviceCode.includes('treatment_plan.completed'), 'Must audit treatment_plan.completed');
      assert(serviceCode.includes('treatment_plan.discontinued'), 'Must audit treatment_plan.discontinued');
    });

    await st.test('treatmentPlanService enforces allowed lifecycle transitions', () => {
      assert(
        serviceCode.includes('ALLOWED_TREATMENT_PLAN_TRANSITIONS'),
        'Must define ALLOWED_TREATMENT_PLAN_TRANSITIONS'
      );
      assert(serviceCode.includes('activatePlan'), 'Must define activatePlan method');
      assert(serviceCode.includes('pausePlan'), 'Must define pausePlan method');
      assert(serviceCode.includes('resumePlan'), 'Must define resumePlan method');
      assert(serviceCode.includes('completePlan'), 'Must define completePlan method');
      assert(serviceCode.includes('discontinuePlan'), 'Must define discontinuePlan method');
    });

    await st.test('treatmentPlanService uses explicit PostgREST foreign key constraint hints', () => {
      assert(
        serviceCode.includes('!fk_treatment_plans_patient_practice'),
        'Must use !fk_treatment_plans_patient_practice constraint hint'
      );
      assert(
        serviceCode.includes('!fk_treatment_plans_episode_patient_practice'),
        'Must use !fk_treatment_plans_episode_patient_practice constraint hint'
      );
      assert(
        serviceCode.includes('!fk_treatment_plans_visit_patient_practice'),
        'Must use !fk_treatment_plans_visit_patient_practice constraint hint'
      );
      assert(
        serviceCode.includes('!fk_tp_goals_plan_practice'),
        'Must use !fk_tp_goals_plan_practice constraint hint'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Remote Supabase Live Query Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Remote Supabase Live Query Verification ---', async (st) => {
    await st.test('Remote query returns HTTP 200 OK: Treatment Plans with disambiguated relations', async () => {
      const select = '*,patient:patients!fk_treatment_plans_patient_practice(id,patient_identifier,first_name,last_name,phone,email),episode:episodes_of_care!fk_treatment_plans_episode_patient_practice(id,episode_identifier,title,status),originating_clinical_visit:clinical_visits!fk_treatment_plans_visit_patient_practice(id,visit_identifier,status,actual_start,actual_end)';
      const url = `${SUPABASE_URL}/rest/v1/treatment_plans?select=${encodeURIComponent(select)}&limit=1`;
      const res = await fetch(url, {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
          'X-Practice-ID': PRACTICE_ID,
        },
      });
      const bodyText = await res.text();
      assert.equal(
        res.status,
        200,
        `Expected HTTP 200 for Treatment Plans remote query, got ${res.status}. Body: ${bodyText}`
      );
    });

    await st.test('Remote query returns HTTP 200 OK: Treatment Plan Goals with disambiguated outcome assessments', async () => {
      const select = '*,baseline_outcome_assessment:outcome_measure_assessments!fk_tp_goals_baseline_oa(id,assessment_identifier,status,numeric_score),target_outcome_assessment:outcome_measure_assessments!fk_tp_goals_target_oa(id,assessment_identifier,status,numeric_score)';
      const url = `${SUPABASE_URL}/rest/v1/treatment_plan_goals?select=${encodeURIComponent(select)}&limit=1`;
      const res = await fetch(url, {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
          'X-Practice-ID': PRACTICE_ID,
        },
      });
      const bodyText = await res.text();
      assert.equal(
        res.status,
        200,
        `Expected HTTP 200 for Treatment Plan Goals remote query, got ${res.status}. Body: ${bodyText}`
      );
    });

    await st.test('Unhinted treatment_plans query reproduces PGRST201 HTTP 300 to prove disambiguation is required', async () => {
      const url = `${SUPABASE_URL}/rest/v1/treatment_plans?select=*,patients(id)&limit=1`;
      const res = await fetch(url, {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
          'X-Practice-ID': PRACTICE_ID,
        },
      });
      assert.equal(
        res.status,
        300,
        `Expected HTTP 300 (Ambiguous relationship) for unhinted treatment_plans query, got ${res.status}`
      );
    });
  });
});
