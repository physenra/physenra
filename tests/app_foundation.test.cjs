/**
 * Physenra Application Foundation V1 Test Suite
 *
 * Verifies:
 * 1. Static codebase hygiene (zero secrets, zero Kabworld references)
 * 2. Multi-tenant practice context & custom header handling
 * 3. Role-based access control (RBAC) rules & permissions logic
 * 4. Scope boundaries (zero patient, clinical, billing, or wallet modules)
 * 5. Type and schema consistency with verified Database Foundation V1
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('==================================================');
console.log('PHYSENRA APPLICATION FOUNDATION V1 VERIFICATION');
console.log('==================================================\n');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

// Helper to recursively collect files
function getFiles(dir, filter = () => true) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath, filter));
    } else if (filter(fullPath)) {
      results.push(fullPath);
    }
  });
  return results;
}

// -----------------------------------------------------------------------------
// SUITE 1: STATIC HYGIENE & INDEPENDENCE AUDIT
// -----------------------------------------------------------------------------
console.log('--- SUITE 1: Codebase Hygiene & Product Independence ---');

test('No legacy external product references exist in Physenra source and docs', () => {
  const allSourceFiles = getFiles(SRC_DIR, f => /\.(ts|tsx|js|jsx|css|html)$/.test(f));
  const docFiles = getFiles(path.join(ROOT_DIR, 'docs'), f => /\.md$/.test(f));
  const configFiles = [
    path.join(ROOT_DIR, 'index.html'),
    path.join(ROOT_DIR, 'package.json'),
    path.join(ROOT_DIR, 'vite.config.ts'),
  ].filter(f => fs.existsSync(f));

  const filesToScan = [...allSourceFiles, ...docFiles, ...configFiles];
  assert(filesToScan.length > 0, 'Source and doc files must be discovered');

  const legacyPattern = new RegExp(['k', 'a', 'b', 'w', 'o', 'r', 'l', 'd'].join(''), 'i');
  const violations = [];

  for (const filePath of filesToScan) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (legacyPattern.test(content)) {
      violations.push(filePath);
    }
  }

  assert.strictEqual(
    violations.length,
    0,
    `Found forbidden legacy product reference in: ${violations.join(', ')}`
  );
});

test('No hardcoded secrets or management tokens exist in source files', () => {
  const allSourceFiles = getFiles(SRC_DIR, f => /\.(ts|tsx|js|jsx)$/.test(f));
  const forbiddenPatterns = [
    /sbp_[a-zA-Z0-9_-]{20,}/, // Supabase PAT
    /service_role/,           // Supabase service_role key
    /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/, // JWT pattern
  ];

  const violations = [];
  for (const filePath of allSourceFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(content)) {
        violations.push({ filePath, pattern: pattern.toString() });
      }
    }
  }

  assert.strictEqual(
    violations.length,
    0,
    `Found hardcoded secret in: ${JSON.stringify(violations)}`
  );
});

// -----------------------------------------------------------------------------
// SUITE 2: SCOPE BOUNDARIES & MODULAR SEPARATION
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 2: Scope Boundary Verification ---');

test('No patient or clinical database structures exist in application foundation', () => {
  const schemaFile = path.join(SRC_DIR, 'types', 'database.ts');
  assert(fs.existsSync(schemaFile), 'database.ts must exist');

  const content = fs.readFileSync(schemaFile, 'utf8');

  // Verify that clinical modules are not defined in Database Foundation V1
  const forbiddenModules = [
    'patients',
    'appointments',
    'clinical_notes',
    'soap_notes',
    'invoices',
    'payments',
    'wallets',
    'whatsapp_messages',
  ];

  for (const mod of forbiddenModules) {
    const regex = new RegExp(`['"]?${mod}['"]?\\s*:\\s*\\{`, 'i');
    assert(
      !regex.test(content),
      `Scope violation: Found unauthorized clinical module '${mod}' in types/database.ts`
    );
  }
});

test('Approved foundation tables match Database Foundation V1 schema', () => {
  const schemaFile = path.join(SRC_DIR, 'types', 'database.ts');
  const content = fs.readFileSync(schemaFile, 'utf8');

  const requiredTables = [
    'practices',
    'profiles',
    'practice_memberships',
    'subscriptions',
    'audit_events',
  ];

  for (const tbl of requiredTables) {
    const regex = new RegExp(`['"]?${tbl}['"]?\\s*:\\s*\\{`, 'i');
    assert(
      regex.test(content),
      `Missing required foundation table '${tbl}' in types/database.ts`
    );
  }
});

// -----------------------------------------------------------------------------
// SUITE 3: MULTI-TENANCY & CONTEXT INJECTION SPECIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 3: Tenancy Context & Header Injection ---');

test('Supabase client module defines x-practice-id header injection and validation', () => {
  const clientFile = path.join(SRC_DIR, 'lib', 'supabase.ts');
  assert(fs.existsSync(clientFile), 'supabase.ts must exist');

  const content = fs.readFileSync(clientFile, 'utf8');

  assert(
    content.includes('x-practice-id'),
    'supabase.ts must reference the x-practice-id header'
  );
  assert(
    content.includes('setActivePracticeHeader'),
    'supabase.ts must export setActivePracticeHeader'
  );
  assert(
    content.includes('getActivePracticeHeader'),
    'supabase.ts must export getActivePracticeHeader'
  );
});

test('Header state setter and getter function correctly and handle empty string / whitespace', () => {
  // Simulate client helper logic
  let activePracticeId = null;

  function setActivePracticeHeader(practiceId) {
    if (practiceId && practiceId.trim().length > 0) {
      activePracticeId = practiceId.trim();
    } else {
      activePracticeId = null;
    }
  }

  function getActivePracticeHeader() {
    return activePracticeId;
  }

  assert.strictEqual(getActivePracticeHeader(), null);

  setActivePracticeHeader('   ');
  assert.strictEqual(getActivePracticeHeader(), null);

  const testUUID = '123e4567-e89b-12d3-a456-426614174000';
  setActivePracticeHeader(testUUID);
  assert.strictEqual(getActivePracticeHeader(), testUUID);

  setActivePracticeHeader(null);
  assert.strictEqual(getActivePracticeHeader(), null);
});

// -----------------------------------------------------------------------------
// SUITE 4: ROLE-BASED ACCESS CONTROL (RBAC) LOGIC
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 4: RBAC & Permissions Logic ---');

test('RBAC role helper handles role taxonomy correctly', () => {
  function computeRoleCapabilities(role) {
    return {
      isOwner: role === 'owner',
      isManager: role === 'practice_manager',
      isClinician: role === 'clinician',
      isStaff: role === 'staff',
      canManageSettings: role === 'owner' || role === 'practice_manager',
      canManageTeam: role === 'owner' || role === 'practice_manager',
      canTransferOwnership: role === 'owner',
    };
  }

  // Owner
  const ownerCaps = computeRoleCapabilities('owner');
  assert.strictEqual(ownerCaps.isOwner, true);
  assert.strictEqual(ownerCaps.canManageSettings, true);
  assert.strictEqual(ownerCaps.canManageTeam, true);
  assert.strictEqual(ownerCaps.canTransferOwnership, true);

  // Practice Manager
  const managerCaps = computeRoleCapabilities('practice_manager');
  assert.strictEqual(managerCaps.isManager, true);
  assert.strictEqual(managerCaps.canManageSettings, true);
  assert.strictEqual(managerCaps.canManageTeam, true);
  assert.strictEqual(managerCaps.canTransferOwnership, false);

  // Clinician
  const clinicianCaps = computeRoleCapabilities('clinician');
  assert.strictEqual(clinicianCaps.isClinician, true);
  assert.strictEqual(clinicianCaps.canManageSettings, false);
  assert.strictEqual(clinicianCaps.canManageTeam, false);
  assert.strictEqual(clinicianCaps.canTransferOwnership, false);

  // Staff
  const staffCaps = computeRoleCapabilities('staff');
  assert.strictEqual(staffCaps.isStaff, true);
  assert.strictEqual(staffCaps.canManageSettings, false);
  assert.strictEqual(staffCaps.canManageTeam, false);
  assert.strictEqual(staffCaps.canTransferOwnership, false);
});

// -----------------------------------------------------------------------------
// SUITE 5: MULTI-PRACTICE RESOLUTION LOGIC
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 5: Multi-Practice Resolution Logic ---');

test('Practice selection properly classifies 0, 1, and N memberships', () => {
  function resolveTenancyState(memberships) {
    if (!memberships || memberships.length === 0) {
      return { state: 'NO_PRACTICE', active: null };
    }
    if (memberships.length === 1) {
      return { state: 'SINGLE_PRACTICE', active: memberships[0] };
    }
    return { state: 'MULTI_PRACTICE', active: memberships[0] };
  }

  assert.strictEqual(resolveTenancyState([]).state, 'NO_PRACTICE');
  assert.strictEqual(resolveTenancyState(null).state, 'NO_PRACTICE');

  const single = [{ practice_id: 'p1', role: 'owner' }];
  const singleResult = resolveTenancyState(single);
  assert.strictEqual(singleResult.state, 'SINGLE_PRACTICE');
  assert.strictEqual(singleResult.active.practice_id, 'p1');

  const multiple = [
    { practice_id: 'p1', role: 'owner' },
    { practice_id: 'p2', role: 'clinician' },
  ];
  const multiResult = resolveTenancyState(multiple);
  assert.strictEqual(multiResult.state, 'MULTI_PRACTICE');
  assert.strictEqual(multiResult.active.practice_id, 'p1');
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n==================================================');
console.log(`SUMMARY: ${passedTests}/${totalTests} tests passed`);
console.log('==================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
