/**
 * Physenra Database Foundation V1 - Automated Migration & Architecture Audit Test Suite
 * 
 * Performs comprehensive static code-level audit and architectural invariant verification
 * across both the baseline foundation migration and the security hardening migration.
 * 
 * NOTE: This is a static code-level migration audit. It does NOT claim to be a runtime
 * database test against a live PostgreSQL instance.
 */

const fs = require('fs');
const path = require('path');

const baselinePath = path.resolve(__dirname, '../supabase/migrations/20260928011500_foundation_platform_tenancy_and_auth.sql');
const hardeningPath = path.resolve(__dirname, '../supabase/migrations/20260928012000_harden_foundation_security.sql');

function runTests() {
  console.log('================================================================');
  console.log('PHYSENRA DATABASE FOUNDATION V1 STATIC AUDIT & HARDENING SUITE');
  console.log('================================================================\n');

  if (!fs.existsSync(baselinePath)) {
    console.error(`FAIL: Baseline migration not found at ${baselinePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(hardeningPath)) {
    console.error(`FAIL: Hardening migration not found at ${hardeningPath}`);
    process.exit(1);
  }

  const baselineSql = fs.readFileSync(baselinePath, 'utf8');
  const hardeningSql = fs.readFileSync(hardeningPath, 'utf8');
  const combinedSql = baselineSql + '\n' + hardeningSql;

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
    assert(!tableRegex.test(combinedSql), `Prohibited future table '${table}' is NOT created`);
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
    assert(tableRegex.test(baselineSql), `Required foundational table 'public.${table}' is created`);
  }

  // 3. ROW LEVEL SECURITY (RLS) VERIFICATION
  console.log('\n--- 3. Row Level Security (RLS) Invariants ---');
  for (const table of requiredTables) {
    const rlsRegex = new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY;`, 'i');
    assert(rlsRegex.test(baselineSql), `Row Level Security is explicitly enabled on 'public.${table}'`);
  }

  // 4. HARDENING: PROFILE ISOLATION
  console.log('\n--- 4. Profile Isolation Hardening ---');
  assert(hardeningSql.includes('DROP POLICY IF EXISTS profiles_select_self_or_colleague ON public.profiles;'),
    'Overly permissive co-membership profile policy is explicitly dropped');
  assert(hardeningSql.includes('CREATE POLICY profiles_select_self ON public.profiles'),
    'Dedicated self-only profile access policy is established');
  assert(hardeningSql.includes('CREATE POLICY profiles_select_staff_active_practice ON public.profiles'),
    'Staff profile access is strictly scoped to active practice context');
  assert(hardeningSql.includes('auth.current_practice_id()') && hardeningSql.includes('profiles_select_staff_active_practice'),
    'Staff profile policy validates active practice context');

  // 5. HARDENING: PLATFORM ADMIN PROTECTION
  console.log('\n--- 5. Platform Admin Self-Injection Protection ---');
  assert(hardeningSql.includes('CREATE OR REPLACE FUNCTION public.protect_is_platform_admin()'),
    'Trigger function protect_is_platform_admin() is defined');
  assert(/BEFORE\s+INSERT\s+OR\s+UPDATE\s+ON\s+public\.profiles/i.test(hardeningSql),
    'Trigger trg_protect_is_platform_admin attached to public.profiles');
  assert(hardeningSql.includes('is_platform_admin IS FALSE OR auth.is_platform_admin()'),
    'RLS policy enforces platform admin check on insert and update');

  // 6. HARDENING: PRACTICE MANAGER ESCALATION PREVENTION
  console.log('\n--- 6. Practice Manager Privilege Escalation Prevention ---');
  assert(hardeningSql.includes('DROP POLICY IF EXISTS memberships_insert_owner_manager'),
    'Old memberships insert policy is dropped');
  assert(hardeningSql.includes('DROP POLICY IF EXISTS memberships_update_owner_manager'),
    'Old memberships update policy is dropped');
  assert(hardeningSql.includes('CREATE POLICY memberships_insert_hierarchy ON public.practice_memberships'),
    'Hierarchical membership insert policy is established');
  assert(hardeningSql.includes('CREATE POLICY memberships_update_hierarchy ON public.practice_memberships'),
    'Hierarchical membership update policy is established');
  assert(hardeningSql.includes('CREATE OR REPLACE FUNCTION public.protect_practice_owner_membership()'),
    'Trigger function protect_practice_owner_membership() guards owner records');

  // 7. HARDENING: MEMBERSHIP UNIQUENESS FIX
  console.log('\n--- 7. Membership Uniqueness On Revocation ---');
  assert(hardeningSql.includes('DROP CONSTRAINT IF EXISTS uq_practice_user_role'),
    'Rigid UNIQUE constraint uq_practice_user_role is dropped');
  assert(/CREATE\s+UNIQUE\s+INDEX\s+uq_practice_user_role_active\s+ON\s+public\.practice_memberships\s*\(practice_id,\s*user_id,\s*role\)\s*WHERE\s+status\s*<>\s*'revoked'/i.test(hardeningSql),
    'Partial unique index uq_practice_user_role_active excludes revoked memberships');

  // 8. HARDENING: AUDIT TRAIL INTEGRITY
  console.log('\n--- 8. Audit Trail Integrity & Ingestion Hardening ---');
  assert(hardeningSql.includes('DROP POLICY IF EXISTS audit_events_insert'),
    'Direct client audit_events INSERT policy is dropped');
  assert(hardeningSql.includes('CREATE POLICY audit_events_no_direct_insert ON public.audit_events'),
    'Direct client audit_events INSERT is blocked at policy level');
  assert(hardeningSql.includes('CREATE OR REPLACE FUNCTION public.log_audit_event'),
    'Trusted SECURITY DEFINER public.log_audit_event() function is defined');
  assert(hardeningSql.includes('v_user_id := auth.uid()') && hardeningSql.includes('v_practice_id := auth.current_practice_id()'),
    'log_audit_event() automatically resolves actor identity and active practice');

  // 9. HARDENING: FUNCTION PRIVILEGE RESTRICTIONS
  console.log('\n--- 9. Explicit Function Privilege Restrictions ---');
  assert(hardeningSql.includes('REVOKE ALL ON FUNCTION public.log_audit_event') && hardeningSql.includes('FROM PUBLIC'),
    'Public execute privilege revoked from log_audit_event');
  assert(hardeningSql.includes('REVOKE ALL ON FUNCTION auth.current_practice_id') && hardeningSql.includes('FROM PUBLIC'),
    'Public execute privilege revoked from current_practice_id');
  assert(hardeningSql.includes('GRANT EXECUTE ON FUNCTION public.log_audit_event') && hardeningSql.includes('TO authenticated'),
    'Execute privilege on log_audit_event granted specifically to authenticated');

  // 10. CONTAMINATION & SECRETS CHECK
  console.log('\n--- 10. Contamination & Credential Hygiene ---');
  assert(!/kabworld|psyjbmetnpsqarbumzrb/i.test(combinedSql),
    'Migrations contain zero Kabworld references or IDs');
  assert(!/service_role|sbp_|anon_key/i.test(combinedSql),
    'Migrations contain no hardcoded secrets or API tokens');

  console.log('\n================================================================');
  if (failures === 0) {
    console.log('ALL STATIC AUDIT & HARDENING CHECKS PASSED (0 FAILURES)');
    console.log('NOTE: Runtime database execution test was NOT performed');
    console.log('      (requires active PostgreSQL/Supabase runtime daemon)');
    console.log('================================================================\n');
    process.exit(0);
  } else {
    console.error(`STATIC AUDIT FAILED WITH ${failures} FAILURE(S)`);
    console.log('================================================================\n');
    process.exit(1);
  }
}

runTests();
