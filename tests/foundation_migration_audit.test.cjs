/**
 * Physenra Database Foundation V1 - Automated Migration & Architecture Audit Test Suite
 * 
 * Verifies that the foundation migration meets all design, security, tenancy,
 * and scope boundary constraints.
 */

const fs = require('fs');
const path = require('path');

const migrationPath = path.resolve(__dirname, '../supabase/migrations/20260928011500_foundation_platform_tenancy_and_auth.sql');

function runTests() {
  console.log('================================================================');
  console.log('RUNNING PHYSENRA DATABASE FOUNDATION V1 VALIDATION SUITE');
  console.log('================================================================\n');

  if (!fs.existsSync(migrationPath)) {
    console.error(`FAIL: Migration file not found at ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  let failures = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
    } else {
      console.error(`[FAIL] ${message}`);
      failures++;
    }
  }

  // 1. SCOPE BOUNDARY CHECKS (Prohibited clinical/patient/billing tables must NOT exist)
  console.log('--- 1. Scope Boundary Verification ---');
  const prohibitedTables = [
    'patients',
    'appointments',
    'clinical_visits',
    'clinical_notes',
    'episodes_of_care',
    'treatment_plans',
    'invoices',
    'payments',
    'patient_wallets',
    'wallet_transactions',
    'packages',
    'package_session_ledger',
    'outcome_measures',
    'home_exercises'
  ];

  for (const table of prohibitedTables) {
    const tableRegex = new RegExp(`CREATE\\s+TABLE\\s+(?:public\\.)?${table}\\b`, 'i');
    assert(!tableRegex.test(sql), `Prohibited future table '${table}' is NOT created in foundation migration`);
  }

  // 2. REQUIRED FOUNDATION TABLES
  console.log('\n--- 2. Required Foundational Tables ---');
  const requiredTables = [
    'practices',
    'profiles',
    'practice_memberships',
    'subscriptions',
    'audit_events'
  ];

  for (const table of requiredTables) {
    const tableRegex = new RegExp(`CREATE\\s+TABLE\\s+public\\.${table}\\b`, 'i');
    assert(tableRegex.test(sql), `Required foundational table 'public.${table}' is created`);
  }

  // 3. ROW LEVEL SECURITY (RLS) VERIFICATION
  console.log('\n--- 3. Row Level Security (RLS) Invariants ---');
  for (const table of requiredTables) {
    const rlsRegex = new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY;`, 'i');
    assert(rlsRegex.test(sql), `Row Level Security is explicitly enabled on 'public.${table}'`);
  }

  // 4. ROLE TAXONOMY & STATUS CONSTRAINTS
  console.log('\n--- 4. Role Taxonomy & Constraints ---');
  const expectedRoles = [
    'platform_admin',
    'practice_owner',
    'practice_manager',
    'physiotherapist',
    'receptionist',
    'accountant',
    'patient'
  ];

  for (const role of expectedRoles) {
    assert(sql.includes(`'${role}'`), `Approved role '${role}' is present in role check constraint`);
  }

  assert(/status\s+text\s+NOT\s+NULL\s+DEFAULT\s+'active'\s+CHECK\s*\(\s*status\s+IN\s*\(\s*'active',\s*'invited',\s*'suspended',\s*'revoked'\s*\)\s*\)/i.test(sql),
    'Membership status constraint includes active, invited, suspended, revoked');

  assert(/CONSTRAINT\s+uq_practice_user_role\s+UNIQUE\s*\(\s*practice_id,\s*user_id,\s*role\s*\)/i.test(sql),
    'Unique constraint uq_practice_user_role exists on (practice_id, user_id, role)');

  // 5. TENANT CONTEXT HELPER & SECURITY DEFINER SAFETY
  console.log('\n--- 5. Tenant Context & Security Definer Helpers ---');
  assert(sql.includes('auth.current_practice_id()'), 'Helper auth.current_practice_id() is defined');
  assert(/status\s*=\s*'active'/i.test(sql), 'auth.current_practice_id() checks for active membership status');
  assert(/SET\s+search_path\s*=\s*public,\s*auth,\s*pg_temp/i.test(sql), 'SECURITY DEFINER functions enforce safe search_path');
  assert(sql.includes('auth.user_has_practice_role'), 'Helper auth.user_has_practice_role() is defined');
  assert(sql.includes('auth.is_platform_admin'), 'Helper auth.is_platform_admin() is defined');

  // 6. AUDIT IMMUTABILITY
  console.log('\n--- 6. Audit Immutability Protection ---');
  assert(sql.includes('prevent_audit_mutation'), 'Trigger function prevent_audit_mutation() is defined');
  assert(/BEFORE\s+UPDATE\s+OR\s+DELETE\s+ON\s+public\.audit_events/i.test(sql),
    'Trigger protects audit_events against UPDATE and DELETE');
  assert(sql.includes('audit_events_no_update'), 'RLS policy explicitly denies UPDATE on audit_events');
  assert(sql.includes('audit_events_no_delete'), 'RLS policy explicitly denies DELETE on audit_events');

  // 7. CONTAMINATION & SECRETS CHECK
  console.log('\n--- 7. Contamination & Credential Hygiene ---');
  assert(!/kabworld|psyjbmetnpsqarbumzrb/i.test(sql), 'Migration contains zero Kabworld references or IDs');
  assert(!/service_role|sbp_|anon_key/i.test(sql), 'Migration contains no hardcoded secrets or API tokens');

  console.log('\n================================================================');
  if (failures === 0) {
    console.log('ALL PHYSENRA FOUNDATION TESTS PASSED (0 FAILURES)');
    console.log('================================================================\n');
    process.exit(0);
  } else {
    console.error(`TEST SUITE FAILED WITH ${failures} FAILURE(S)`);
    console.log('================================================================\n');
    process.exit(1);
  }
}

runTests();
