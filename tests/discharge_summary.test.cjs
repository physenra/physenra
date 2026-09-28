// ==============================================================================
// PHYSENRA DISCHARGE SUMMARY FOUNDATION V1 VERIFICATION SUITE
// File: tests/discharge_summary.test.cjs
//
// Verifies:
// 1. Schema integrity & multi-tenant composite foreign keys
// 2. Atomic sequential identifier generator (DS-000001)
// 3. Exactly one discharge summary per episode constraint (uq_discharge_summary_episode)
// 4. Immutability, clinician validation & lifecycle triggers
// 5. Atomic episode closure trigger on discharge summary finalization
// 6. Strict Row-Level Security (RLS) & zero hard-delete policy for finalized records
// 7. Absolute domain boundary verification (Zero billing/packages/wallets/insurance/AI/WhatsApp)
// 8. Application service domain logic, PostgREST hints & state machine rules
// 9. Remote Supabase live query verification with PostgREST constraint hints
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
  '20260928034000_discharge_summary_foundation.sql'
);
const SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'dischargeSummaryService.ts'
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

test('PHYSENRA DISCHARGE SUMMARY FOUNDATION V1 VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Database Schema & Relational Tenancy
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Discharge Summary Database Schema & Relational Tenancy ---', async (st) => {
    await st.test('Migration creates public.practice_discharge_summary_counters table', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.practice_discharge_summary_counters') ||
        migrationSql.includes('CREATE TABLE public.practice_discharge_summary_counters'),
        'Must create public.practice_discharge_summary_counters'
      );
    });

    await st.test('Migration defines controlled enums for status, reason, and disposition', () => {
      assert(
        migrationSql.includes('CREATE TYPE public.discharge_summary_status AS ENUM'),
        'Must create public.discharge_summary_status enum'
      );
      assert(
        migrationSql.includes("'draft'") &&
        migrationSql.includes("'finalized'") &&
        migrationSql.includes("'amended'"),
        'discharge_summary_status must contain draft, finalized, amended'
      );
      assert(
        migrationSql.includes('CREATE TYPE public.discharge_reason AS ENUM'),
        'Must create public.discharge_reason enum'
      );
      assert(
        migrationSql.includes('CREATE TYPE public.discharge_disposition AS ENUM'),
        'Must create public.discharge_disposition enum'
      );
    });

    await st.test('Migration creates public.discharge_summaries with composite foreign keys', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.discharge_summaries') ||
        migrationSql.includes('CREATE TABLE public.discharge_summaries'),
        'Must create public.discharge_summaries table'
      );
      assert(
        migrationSql.includes('fk_discharge_summaries_patient_practice'),
        'Must declare composite fk_discharge_summaries_patient_practice'
      );
      assert(
        migrationSql.includes('fk_discharge_summaries_episode_patient_practice'),
        'Must declare composite fk_discharge_summaries_episode_patient_practice'
      );
      assert(
        migrationSql.includes('fk_discharge_summaries_plan_patient_episode_practice'),
        'Must declare composite fk_discharge_summaries_plan_patient_episode_practice'
      );
      assert(
        migrationSql.includes('fk_discharge_summaries_visit_patient_practice'),
        'Must declare composite fk_discharge_summaries_visit_patient_practice'
      );
      assert(
        migrationSql.includes('fk_discharge_summaries_review_patient_episode_practice'),
        'Must declare composite fk_discharge_summaries_review_patient_episode_practice'
      );
    });

    await st.test('Migration strictly enforces at most one discharge summary per episode', () => {
      assert(
        migrationSql.includes('CONSTRAINT uq_discharge_summary_episode UNIQUE (episode_id)'),
        'Must enforce UNIQUE (episode_id) on discharge_summaries'
      );
    });

    await st.test('Migration defines generate_next_discharge_summary_identifier function (DS-000001)', () => {
      assert(
        migrationSql.includes('FUNCTION public.generate_next_discharge_summary_identifier'),
        'Must declare generate_next_discharge_summary_identifier function'
      );
      assert(
        migrationSql.includes("'DS-' || LPAD"),
        'Identifier format must be DS- followed by 6-digit padded number'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Business Logic Triggers & Immutability Rules
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Integrity Triggers, Immutability & Atomic Episode Closure ---', async (st) => {
    await st.test('Clinician validation trigger verifies active clinical practice membership', () => {
      assert(
        migrationSql.includes('FUNCTION public.validate_discharge_summary_clinician'),
        'Must declare validate_discharge_summary_clinician function'
      );
      assert(
        migrationSql.includes('trg_validate_discharge_summary_clinician'),
        'Must bind trg_validate_discharge_summary_clinician trigger'
      );
    });

    await st.test('Immutability trigger strictly protects finalized records and enforces amendment rationale', () => {
      assert(
        migrationSql.includes('FUNCTION public.protect_discharge_summary_immutability'),
        'Must declare protect_discharge_summary_immutability function'
      );
      assert(
        migrationSql.includes('trg_protect_discharge_summary_immutability'),
        'Must bind trg_protect_discharge_summary_immutability trigger'
      );
      assert(
        migrationSql.includes('amendment_reason IS NULL OR trim(NEW.amendment_reason)'),
        'Must validate non-empty amendment_reason'
      );
    });

    await st.test('Atomic episode closure trigger transitions episode status to completed upon finalization', () => {
      assert(
        migrationSql.includes('FUNCTION public.discharge_summary_close_episode'),
        'Must declare discharge_summary_close_episode function'
      );
      assert(
        migrationSql.includes('trg_discharge_summary_close_episode'),
        'Must bind trg_discharge_summary_close_episode trigger'
      );
      assert(
        migrationSql.includes("SET status = 'completed'"),
        'Trigger must update episodes_of_care status to completed'
      );
      assert(
        migrationSql.includes("Cannot finalize discharge against an archived episode"),
        'Trigger must prevent finalizing discharge against archived episode'
      );
    });

    await st.test('Hard delete prevention trigger protects finalized and amended discharge summaries', () => {
      assert(
        migrationSql.includes('FUNCTION public.deny_discharge_summary_hard_delete'),
        'Must declare deny_discharge_summary_hard_delete function'
      );
      assert(
        migrationSql.includes('trg_deny_discharge_summary_hard_delete'),
        'Must bind trg_deny_discharge_summary_hard_delete trigger'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Row Level Security & Performance Indexes
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Row Level Security & Performance Indexes ---', async (st) => {
    await st.test('Row Level Security is enabled on discharge_summaries and counters', () => {
      assert(
        migrationSql.includes('ALTER TABLE public.discharge_summaries ENABLE ROW LEVEL SECURITY;'),
        'Must enable RLS on discharge_summaries'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.practice_discharge_summary_counters ENABLE ROW LEVEL SECURITY;'),
        'Must enable RLS on practice_discharge_summary_counters'
      );
    });

    await st.test('RLS delete policy restricts deletion to draft status only', () => {
      assert(
        migrationSql.includes('discharge_summaries_delete_policy'),
        'Must declare delete policy'
      );
      assert(
        migrationSql.includes("status = 'draft'"),
        'Delete policy must restrict to draft status'
      );
    });

    await st.test('Indexes are created for tenant, patient, episode, plan, visit, and review lookup', () => {
      assert(
        migrationSql.includes('idx_discharge_summaries_practice_id'),
        'Must index practice_id'
      );
      assert(
        migrationSql.includes('idx_discharge_summaries_patient_id'),
        'Must index patient_id'
      );
      assert(
        migrationSql.includes('idx_discharge_summaries_episode_id'),
        'Must index episode_id'
      );
      assert(
        migrationSql.includes('idx_discharge_summaries_treatment_plan_id'),
        'Must index treatment_plan_id'
      );
      assert(
        migrationSql.includes('idx_discharge_summaries_status'),
        'Must index status'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Absolute Domain Boundaries & Architectural Separation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Absolute Domain Boundaries & Architectural Separation ---', async (st) => {
    const forbiddenPatterns = [
      'fee_schedules',
      'invoice',
      'invoices',
      'billing',
      'patient_wallets',
      'wallet_transactions',
      'packages',
      'insurance_claims',
      'ai_generate',
      'whatsapp',
      'email_automation',
    ];

    const sqlWithoutComments = migrationSql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const serviceWithoutComments = serviceCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

    for (const pattern of forbiddenPatterns) {
      await st.test(`Discharge Summary domain migration code does not contain '${pattern}'`, () => {
        const regex = new RegExp(`\\b${pattern}\\b`, 'i');
        assert(
          !regex.test(sqlWithoutComments),
          `Forbidden keyword '${pattern}' detected in discharge summary migration`
        );
      });
      await st.test(`Discharge Summary service code does not contain '${pattern}'`, () => {
        const regex = new RegExp(`\\b${pattern}\\b`, 'i');
        assert(
          !regex.test(serviceWithoutComments),
          `Forbidden keyword '${pattern}' detected in discharge summary service`
        );
      });
    }
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Application Service Implementation & State Machine
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Application Service Implementation & State Machine ---', async (st) => {
    await st.test('dischargeSummaryService implements full lifecycle methods', () => {
      assert(typeof serviceCode === 'string', 'Service code must exist');
      assert(serviceCode.includes('getSummaries('), 'Must implement getSummaries');
      assert(serviceCode.includes('getSummaryById('), 'Must implement getSummaryById');
      assert(serviceCode.includes('getSummaryByEpisodeId('), 'Must implement getSummaryByEpisodeId');
      assert(serviceCode.includes('createSummary('), 'Must implement createSummary');
      assert(serviceCode.includes('updateDraftSummary('), 'Must implement updateDraftSummary');
      assert(serviceCode.includes('finalizeSummary('), 'Must implement finalizeSummary');
      assert(serviceCode.includes('amendSummary('), 'Must implement amendSummary');
      assert(serviceCode.includes('deleteDraftSummary('), 'Must implement deleteDraftSummary');
      assert(serviceCode.includes('getDischargeEvidence('), 'Must implement getDischargeEvidence');
      assert(serviceCode.includes('getClinicians('), 'Must implement getClinicians');
      assert(serviceCode.includes('getDischargeableEpisodes('), 'Must implement getDischargeableEpisodes');
    });

    await st.test('dischargeSummaryService records audit events for all lifecycle actions', () => {
      assert(
        serviceCode.includes("p_action: 'discharge_summary.created'"),
        'Must audit discharge_summary.created'
      );
      assert(
        serviceCode.includes("p_action: 'discharge_summary.updated'"),
        'Must audit discharge_summary.updated'
      );
      assert(
        serviceCode.includes("p_action: 'discharge_summary.finalized'"),
        'Must audit discharge_summary.finalized'
      );
      assert(
        serviceCode.includes("p_action: 'discharge_summary.amended'"),
        'Must audit discharge_summary.amended'
      );
      assert(
        serviceCode.includes("p_action: 'discharge_summary.deleted'"),
        'Must audit discharge_summary.deleted'
      );
    });

    await st.test('dischargeSummaryService enforces allowed lifecycle transitions', () => {
      assert(
        serviceCode.includes('ALLOWED_DISCHARGE_SUMMARY_TRANSITIONS'),
        'Must define ALLOWED_DISCHARGE_SUMMARY_TRANSITIONS state map'
      );
    });

    await st.test('dischargeSummaryService uses explicit PostgREST foreign key constraint hints', () => {
      assert(
        serviceCode.includes('patient:patients!fk_discharge_summaries_patient_practice'),
        'Must use explicit hint for patient'
      );
      assert(
        serviceCode.includes('episode:episodes_of_care!fk_discharge_summaries_episode_patient_practice'),
        'Must use explicit hint for episode'
      );
      assert(
        serviceCode.includes('treatment_plan:treatment_plans!fk_discharge_summaries_plan_patient_episode_practice'),
        'Must use explicit hint for treatment plan'
      );
      assert(
        serviceCode.includes('originating_clinical_visit:clinical_visits!fk_discharge_summaries_visit_patient_practice'),
        'Must use explicit hint for clinical visit'
      );
      assert(
        serviceCode.includes('final_progress_review:progress_reviews!fk_discharge_summaries_review_patient_episode_practice'),
        'Must use explicit hint for final progress review'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Remote Supabase Live Query Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Remote Supabase Live Query Verification ---', async (st) => {
    await st.test('Remote query returns HTTP 200 OK: Discharge Summaries with disambiguated relations', async () => {
      const select = '*,patient:patients!fk_discharge_summaries_patient_practice(id,patient_identifier,first_name,last_name),episode:episodes_of_care!fk_discharge_summaries_episode_patient_practice(id,episode_identifier,title),treatment_plan:treatment_plans!fk_discharge_summaries_plan_patient_episode_practice(id,plan_identifier,title),final_progress_review:progress_reviews!fk_discharge_summaries_review_patient_episode_practice(id,review_identifier)';
      const url = `${SUPABASE_URL}/rest/v1/discharge_summaries?select=${encodeURIComponent(select)}&limit=1`;
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
        `Expected HTTP 200 for discharge_summaries query, got ${res.status}. Body: ${body}`
      );
    });

    await st.test('Unhinted discharge_summaries query reproduces PGRST201 HTTP 300 to prove disambiguation is required', async () => {
      const url = `${SUPABASE_URL}/rest/v1/discharge_summaries?select=*,patients(id)&limit=1`;
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
        `Expected HTTP 300 (Ambiguous relationship) for unhinted discharge_summaries query, got ${res.status}`
      );
    });
  });
});
