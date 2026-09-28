// ==============================================================================
// PHYSENRA HOME EXERCISE PROGRAM (HEP) FOUNDATION V1 VERIFICATION SUITE
// File: tests/home_exercise_program.test.cjs
//
// Verifies:
// 1. Schema integrity & multi-tenant composite foreign keys
// 2. Atomic sequential identifier generator (HEP-000001)
// 3. Immutability, clinician validation & state machine triggers
// 4. Strict Row-Level Security (RLS) & zero hard-delete policy
// 5. Prescription items locking on active/finalized programs
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
  '20260928031000_home_exercise_program_foundation.sql'
);
const SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'hepService.ts'
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

test('PHYSENRA HOME EXERCISE PROGRAM FOUNDATION V1 VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Database Schema & Relational Tenancy
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: HEP Database Schema & Relational Tenancy ---', async (st) => {
    await st.test('Migration creates public.exercises table with UUID primary key and practice_id', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.exercises') ||
        migrationSql.includes('CREATE TABLE public.exercises'),
        'Must create public.exercises'
      );
      assert(
        migrationSql.includes('id uuid PRIMARY KEY DEFAULT gen_random_uuid()'),
        'exercises must use UUID primary key'
      );
    });

    await st.test('Migration defines required exercise metadata fields', () => {
      assert(migrationSql.includes('name text NOT NULL'), 'Must define name');
      assert(migrationSql.includes('category public.exercise_category'), 'Must define category');
      assert(migrationSql.includes('body_region public.exercise_body_region'), 'Must define body_region');
      assert(migrationSql.includes('is_system boolean NOT NULL DEFAULT false'), 'Must define is_system');
      assert(migrationSql.includes('is_active boolean NOT NULL DEFAULT true'), 'Must define is_active');
    });

    await st.test('Migration creates public.home_exercise_programs table with UUID primary key', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.home_exercise_programs') ||
        migrationSql.includes('CREATE TABLE public.home_exercise_programs'),
        'Must create public.home_exercise_programs'
      );
      assert(
        migrationSql.includes('program_identifier text NOT NULL'),
        'Must define program_identifier'
      );
    });

    await st.test('Migration creates public.home_exercise_program_items table', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.home_exercise_program_items') ||
        migrationSql.includes('CREATE TABLE public.home_exercise_program_items'),
        'Must create public.home_exercise_program_items'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_hep_items_exercise FOREIGN KEY (exercise_id)') &&
        migrationSql.includes('REFERENCES public.exercises(id)'),
        'Items must reference exercises table via fk_hep_items_exercise constraint'
      );
    });

    await st.test('Migration enforces multi-tenant composite foreign keys', () => {
      assert(
        migrationSql.includes('CONSTRAINT fk_hep_patient_practice FOREIGN KEY (patient_id, practice_id)'),
        'Must enforce composite patient-practice foreign key'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_hep_episode_patient_practice FOREIGN KEY (episode_id, patient_id, practice_id)'),
        'Must enforce composite episode-patient-practice foreign key'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_hep_visit_patient_practice FOREIGN KEY (clinical_visit_id, patient_id, practice_id)'),
        'Must enforce composite visit-patient-practice foreign key'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_hep_items_program_practice FOREIGN KEY (program_id, practice_id)'),
        'Must enforce composite items-program-practice foreign key'
      );
    });

    await st.test('Migration defines practice_hep_counters for atomic sequential numbering', () => {
      assert(
        migrationSql.includes('public.practice_hep_counters'),
        'Must define practice_hep_counters table'
      );
    });

    await st.test('Migration seeds evidence-based starter exercise catalogue', () => {
      assert(migrationSql.includes('Quad Sets'), 'Must seed Quad Sets');
      assert(migrationSql.includes('Straight Leg Raise'), 'Must seed SLR');
      assert(migrationSql.includes('Glute Bridge'), 'Must seed Glute Bridge');
      assert(migrationSql.includes('Heel Slides'), 'Must seed Heel Slides');
      assert(migrationSql.includes('Scapular Retraction'), 'Must seed Scapular Retraction');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Identifier Generator & Trigger Invariants
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Identifier Generator & Trigger Invariants ---', async (st) => {
    await st.test('generate_next_hep_identifier is SECURITY DEFINER with fixed search_path', () => {
      assert(
        migrationSql.includes('FUNCTION public.generate_next_hep_identifier'),
        'Must declare generate_next_hep_identifier'
      );
      assert(
        migrationSql.includes('SECURITY DEFINER'),
        'Must specify SECURITY DEFINER'
      );
      assert(
        migrationSql.includes('SET search_path = public, pg_temp'),
        'Must fix search_path to public, pg_temp'
      );
    });

    await st.test('Identifier generator verifies active practice context and role privileges', () => {
      assert(
        migrationSql.includes('public.current_practice_id()'),
        'Must check public.current_practice_id()'
      );
      assert(
        migrationSql.includes("role IN ('practice_owner', 'practice_manager', 'physiotherapist')"),
        'Must restrict generator execution to authorized practice roles'
      );
    });

    await st.test('Identifier generator execution is revoked from PUBLIC and granted to authenticated', () => {
      assert(
        migrationSql.includes('REVOKE ALL ON FUNCTION public.generate_next_hep_identifier(uuid) FROM PUBLIC;'),
        'Must revoke PUBLIC execute'
      );
      assert(
        migrationSql.includes('GRANT EXECUTE ON FUNCTION public.generate_next_hep_identifier(uuid) TO authenticated;'),
        'Must grant authenticated execute'
      );
    });

    await st.test('Trigger trg_validate_hep_prescribing_clinician validates clinician role', () => {
      assert(
        migrationSql.includes('trg_validate_hep_prescribing_clinician'),
        'Must define trg_validate_hep_prescribing_clinician'
      );
      assert(
        migrationSql.includes('FUNCTION public.validate_hep_prescribing_clinician'),
        'Must define validate_hep_prescribing_clinician function'
      );
    });

    await st.test('Trigger trg_protect_hep_immutability_and_lifecycle guards immutability and transitions', () => {
      assert(
        migrationSql.includes('trg_protect_hep_immutability_and_lifecycle'),
        'Must define immutability trigger'
      );
      assert(
        migrationSql.includes("OLD.practice_id <> NEW.practice_id"),
        'Must guard practice_id immutability'
      );
      assert(
        migrationSql.includes("OLD.patient_id <> NEW.patient_id"),
        'Must guard patient_id immutability'
      );
      assert(
        migrationSql.includes("OLD.program_identifier <> NEW.program_identifier"),
        'Must guard program_identifier immutability'
      );
    });

    await st.test('Trigger trg_protect_hep_items_finalized locks items on active programs', () => {
      assert(
        migrationSql.includes('trg_protect_hep_items_finalized'),
        'Must define trg_protect_hep_items_finalized'
      );
      assert(
        migrationSql.includes("v_program_status <> 'draft'") ||
        migrationSql.includes("v_program_status IS NOT NULL AND v_program_status <> 'draft'"),
        'Must guard against modifying items on non-draft programs'
      );
    });

    await st.test('Trigger trg_deny_hep_hard_delete prevents hard deletion', () => {
      assert(
        migrationSql.includes('trg_deny_hep_hard_delete'),
        'Must define deny hard delete trigger'
      );
      assert(
        migrationSql.includes('Hard deletion of Home Exercise Programs is prohibited'),
        'Must reject hard deletion'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Tenant Isolation & Row-Level Security
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Tenant Isolation & Row-Level Security ---', async (st) => {
    await st.test('RLS is explicitly enabled on all HEP foundation tables', () => {
      assert(
        migrationSql.includes('ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on exercises'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.practice_hep_counters ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on practice_hep_counters'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.home_exercise_programs ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on home_exercise_programs'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.home_exercise_program_items ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on home_exercise_program_items'
      );
    });

    await st.test('RLS SELECT policy restricts programs and items to active practice context', () => {
      assert(
        migrationSql.includes('practice_id = public.current_practice_id()'),
        'Must enforce practice_id = public.current_practice_id()'
      );
    });

    await st.test('RLS DELETE policy strictly denies program deletion', () => {
      assert(
        migrationSql.includes('CREATE POLICY "hep_delete_policy"') &&
        migrationSql.includes('USING (false)'),
        'Must deny program deletion via policy USING (false)'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Absolute Domain Firewall
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Absolute Domain Boundary Verification ---', async (st) => {
    const prohibited = [
      'invoices',
      'payments',
      'patient_wallets',
      'wallet_transactions',
      'packages',
      'package_session_ledger',
      'insurance_claims',
      'whatsapp',
      'ai_jobs'
    ];

    for (const term of prohibited) {
      await st.test(`Migration does NOT introduce prohibited table or column '${term}'`, () => {
        const regex = new RegExp(`CREATE\\s+TABLE(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+public\\.${term}`, 'i');
        assert(!regex.test(migrationSql), `Prohibited table '${term}' must not be created`);
      });
    }
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Application Service & Domain Logic
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Application Service & Domain Logic ---', async (st) => {
    await st.test('hepService integrates with public.log_audit_event for lifecycle events', () => {
      assert(serviceCode.includes('p_action: \'hep.created\''), 'Must log hep.created');
      assert(serviceCode.includes('p_action: \'hep.activated\''), 'Must log hep.activated');
      assert(serviceCode.includes('p_action: \'hep.paused\''), 'Must log hep.paused');
      assert(serviceCode.includes('p_action: \'hep.completed\''), 'Must log hep.completed');
      assert(serviceCode.includes('p_action: \'hep.discontinued\''), 'Must log hep.discontinued');
    });

    await st.test('hepService enforces allowed lifecycle transitions', () => {
      assert(serviceCode.includes('ALLOWED_HEP_TRANSITIONS'), 'Must export ALLOWED_HEP_TRANSITIONS');
      assert(serviceCode.includes('discontinueProgram'), 'Must provide discontinueProgram');
      assert(serviceCode.includes('activateProgram'), 'Must provide activateProgram');
      assert(serviceCode.includes('pauseProgram'), 'Must provide pauseProgram');
      assert(serviceCode.includes('completeProgram'), 'Must provide completeProgram');
    });

    await st.test('hepService uses explicit PostgREST foreign key constraint hints', () => {
      assert(
        serviceCode.includes('patient:patients!fk_hep_patient_practice'),
        'Must use !fk_hep_patient_practice hint'
      );
      assert(
        serviceCode.includes('episode:episodes_of_care!fk_hep_episode_patient_practice'),
        'Must use !fk_hep_episode_patient_practice hint'
      );
      assert(
        serviceCode.includes('clinical_visit:clinical_visits!fk_hep_visit_patient_practice'),
        'Must use !fk_hep_visit_patient_practice hint'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Remote Supabase Live Query Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Remote Supabase Live Query Verification ---', async (st) => {
    const remoteQueries = [
      {
        name: 'Exercises catalogue query',
        table: 'exercises',
        select: '*'
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

    await st.test('Unhinted HEP query reproduces PGRST201 HTTP 300 to prove disambiguation is required', async () => {
      const url = `${SUPABASE_URL}/rest/v1/home_exercise_programs?select=*,patients(id)&limit=1`;
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
  });
});
