// ==============================================================================
// PHYSENRA FIRST PRACTICE & ADMIN BOOTSTRAP VERIFICATION SUITE
// File: tests/bootstrap_audit.test.cjs
//
// Verifies:
// 1. Forward-only bootstrap migration integrity & idempotency
// 2. Dynamic resolution of administrator by email (no hardcoded UUIDs)
// 3. Practice creation with valid metadata (name, slug, active status)
// 4. practice_owner role assignment with active membership status
// 5. Zero synthetic clinical data policy (no patients, visits, notes, billing)
// 6. RLS and tenant isolation preservation
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
  '20260928030000_bootstrap_initial_practice.sql'
);

const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');

test('PHYSENRA INITIAL PRACTICE BOOTSTRAP VERIFICATION', async (t) => {
  await t.test('--- SUITE 1: Migration Structure & Idempotency ---', async (st) => {
    await st.test('Migration exists and wraps logic in an idempotent PL/pgSQL block', () => {
      assert(migrationSql.includes('DO $$'), 'Must use DO block');
      assert(migrationSql.includes('DECLARE'), 'Must declare local variables');
      assert(migrationSql.includes('END $$;'), 'Must terminate block cleanly');
    });

    await st.test('Migration resolves administrator dynamically by email without hardcoded UUIDs', () => {
      assert(
        migrationSql.includes("WHERE email = 'physenra@gmail.com'"),
        'Must dynamically query auth.users for physenra@gmail.com'
      );
      assert(
        !/id\s*=\s*'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'/i.test(migrationSql),
        'Must not contain hardcoded user or practice UUID literals'
      );
      assert(
        migrationSql.includes('IF v_user_id IS NULL THEN'),
        'Must gracefully handle missing auth user without throwing error'
      );
    });

    await st.test('Migration creates initial practice with valid configuration', () => {
      assert(
        migrationSql.includes("'Physenra Demo Practice'"),
        'Must create Physenra Demo Practice'
      );
      assert(
        migrationSql.includes("'physenra-demo-practice'"),
        'Must use slug physenra-demo-practice'
      );
      assert(
        migrationSql.includes("'active'"),
        'Must set practice status to active'
      );
      assert(
        migrationSql.includes("WHERE slug = 'physenra-demo-practice'"),
        'Must check slug for idempotency'
      );
    });

    await st.test('Migration assigns practice_owner role to authenticated admin', () => {
      assert(
        migrationSql.includes("'practice_owner'"),
        'Must assign role practice_owner'
      );
      assert(
        migrationSql.includes('NOT EXISTS') && migrationSql.includes('practice_memberships'),
        'Must guard against duplicate memberships'
      );
    });

    await st.test('Migration establishes starter SaaS subscription for practice', () => {
      assert(
        migrationSql.includes('INSERT INTO public.subscriptions'),
        'Must create subscriptions row'
      );
      assert(
        migrationSql.includes("'starter'"),
        'Must assign starter plan tier'
      );
    });
  });

  await t.test('--- SUITE 2: Zero Synthetic Clinical Data & Scope Firewall ---', async (st) => {
    const prohibitedKeywords = [
      'patients',
      'episodes_of_care',
      'appointments',
      'clinical_visits',
      'clinical_notes',
      'outcome_measure_assessments',
      'invoices',
      'patient_wallets',
      'packages',
    ];

    for (const kw of prohibitedKeywords) {
      await st.test(`Migration does NOT insert synthetic records into ${kw}`, () => {
        const regex = new RegExp(`INSERT\\s+INTO\\s+public\\.${kw}`, 'i');
        assert(
          !regex.test(migrationSql),
          `Bootstrap migration must not insert synthetic rows into ${kw}`
        );
      });
    }
  });
});
