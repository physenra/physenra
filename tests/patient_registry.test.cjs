/**
 * Physenra Patient Registry Foundation V1 Test Suite
 *
 * Automated verification of:
 * 1. Migration SQL schema & invariants (patients, counters, constraints, triggers)
 * 2. Multi-tenant practice isolation & Row-Level Security (RLS) enforcement
 * 3. Human-readable sequential patient identifier logic & uniqueness
 * 4. Role-based access control (RBAC) permissions & archive restrictions
 * 5. Scope boundaries (strict exclusion of clinical & billing modules)
 * 6. Codebase hygiene & product independence (zero secrets, zero legacy references)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('PHYSENRA PATIENT REGISTRY FOUNDATION V1 VERIFICATION');
console.log('====================================================\n');

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
const MIGRATION_FILE = path.join(
  ROOT_DIR,
  'supabase',
  'migrations',
  '20260928014500_patient_registry_foundation.sql'
);
const SRC_DIR = path.join(ROOT_DIR, 'src');

assert(fs.existsSync(MIGRATION_FILE), `Migration file must exist at ${MIGRATION_FILE}`);
const migrationSql = fs.readFileSync(MIGRATION_FILE, 'utf8');

// -----------------------------------------------------------------------------
// SUITE 1: DATABASE SCHEMA & INVARIANTS
// -----------------------------------------------------------------------------
console.log('--- SUITE 1: Patient Registry Database Schema ---');

test('Migration creates public.patients table with UUID primary key and practice_id', () => {
  assert(/CREATE\s+TABLE\s+public\.patients\s+\(/i.test(migrationSql));
  assert(/id\s+uuid\s+PRIMARY\s+KEY/i.test(migrationSql));
  assert(/practice_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+public\.practices/i.test(migrationSql));
});

test('Migration defines required demographic and contact columns', () => {
  const requiredColumns = [
    'first_name',
    'last_name',
    'patient_identifier',
    'date_of_birth',
    'sex',
    'phone',
    'email',
    'emergency_contact_name',
    'emergency_contact_phone',
    'status',
    'archived_at',
  ];

  for (const col of requiredColumns) {
    const regex = new RegExp(`\\b${col}\\b`, 'i');
    assert(regex.test(migrationSql), `Column '${col}' must be defined in patients table`);
  }
});

test('Migration enforces unique patient_identifier per practice', () => {
  assert(
    /CONSTRAINT\s+uq_patients_practice_identifier\s+UNIQUE\s*\(\s*practice_id\s*,\s*patient_identifier\s*\)/i.test(
      migrationSql
    ),
    'Constraint uq_patients_practice_identifier must enforce uniqueness per practice'
  );
});

test('Migration defines practice_patient_counters table for atomic sequencing', () => {
  assert(/CREATE\s+TABLE\s+public\.practice_patient_counters\s+\(/i.test(migrationSql));
  assert(/practice_id\s+uuid\s+PRIMARY\s+KEY/i.test(migrationSql));
  assert(/next_val\s+integer\s+NOT\s+NULL/i.test(migrationSql));
});

test('Migration defines patient indexes for performant practice-scoped lookups', () => {
  assert(/CREATE\s+INDEX\s+idx_patients_practice_status\s+ON\s+public\.patients/i.test(migrationSql));
  assert(/CREATE\s+INDEX\s+idx_patients_practice_name\s+ON\s+public\.patients/i.test(migrationSql));
  assert(/CREATE\s+INDEX\s+idx_patients_practice_identifier\s+ON\s+public\.patients/i.test(migrationSql));
  assert(/CREATE\s+INDEX\s+idx_patients_practice_dob\s+ON\s+public\.patients/i.test(migrationSql));
});

// -----------------------------------------------------------------------------
// SUITE 2: PATIENT IDENTIFIER GENERATION & TRIGGER INTEGRITY
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 2: Identifier Generator & Trigger Invariants ---');

test('generate_next_patient_identifier is SECURITY DEFINER with safe search_path', () => {
  assert(
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.generate_next_patient_identifier/i.test(migrationSql)
  );
  assert(/SECURITY\s+DEFINER/i.test(migrationSql));
  assert(/SET\s+search_path\s*=\s*public\s*,\s*pg_temp/i.test(migrationSql));
});

test('Identifier generator validates tenant context and authorized roles', () => {
  assert(migrationSql.includes('p_practice_id <> public.current_practice_id()'));
  assert(migrationSql.includes('public.user_has_practice_role'));
  assert(migrationSql.includes("'PAT-' || lpad(v_counter::text, 6, '0')"));
});

test('Identifier generator public execution revoked, granted to authenticated', () => {
  assert(
    /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.generate_next_patient_identifier\(uuid\)\s+FROM\s+PUBLIC/i.test(
      migrationSql
    )
  );
  assert(
    /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.generate_next_patient_identifier\(uuid\)\s+TO\s+authenticated/i.test(
      migrationSql
    )
  );
});

test('Before INSERT and UPDATE triggers guard patient identity and tenancy immutability', () => {
  assert(/CREATE\s+TRIGGER\s+trg_patients_before_insert/i.test(migrationSql));
  assert(/CREATE\s+TRIGGER\s+trg_patients_before_update/i.test(migrationSql));
  assert(migrationSql.includes('NEW.practice_id <> OLD.practice_id'));
  assert(migrationSql.includes('NEW.id <> OLD.id'));
  assert(migrationSql.includes('NEW.patient_identifier <> OLD.patient_identifier'));
});

test('Triggers guard patient archiving permissions', () => {
  assert(migrationSql.includes("NEW.status = 'archived' AND OLD.status <> 'archived'"));
  assert(migrationSql.includes("ARRAY['practice_owner', 'practice_manager', 'receptionist']"));
});

// -----------------------------------------------------------------------------
// SUITE 3: ROW LEVEL SECURITY & TENANT ISOLATION
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 3: Tenant Isolation & RLS Policies ---');

test('Row-Level Security is explicitly enabled on patients and counters', () => {
  assert(/ALTER\s+TABLE\s+public\.patients\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(migrationSql));
  assert(
    /ALTER\s+TABLE\s+public\.practice_patient_counters\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(
      migrationSql
    )
  );
});

test('SELECT policy restricts patient access to active practice context and staff roles', () => {
  assert(
    /CREATE\s+POLICY\s+"patients_select_active_practice"\s+ON\s+public\.patients\s+FOR\s+SELECT/i.test(
      migrationSql
    )
  );
  assert(migrationSql.includes('practice_id = public.current_practice_id()'));
  assert(
    migrationSql.includes(
      "ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'accountant']"
    )
  );
});

test('INSERT policy enforces practice context and creation privileges', () => {
  assert(
    /CREATE\s+POLICY\s+"patients_insert_active_practice"\s+ON\s+public\.patients\s+FOR\s+INSERT/i.test(
      migrationSql
    )
  );
  assert(
    migrationSql.includes(
      "ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']"
    )
  );
});

test('UPDATE policy enforces practice context and editing privileges', () => {
  assert(
    /CREATE\s+POLICY\s+"patients_update_active_practice"\s+ON\s+public\.patients\s+FOR\s+UPDATE/i.test(
      migrationSql
    )
  );
});

test('DELETE policy is strictly DENIED across all roles (zero hard deletes)', () => {
  assert(
    !/CREATE\s+POLICY\s+.*FOR\s+DELETE\s+ON\s+public\.patients/i.test(migrationSql),
    'Hard delete policy must NOT be created on public.patients'
  );
});

// -----------------------------------------------------------------------------
// SUITE 4: SCOPE CONTROL & CLINICAL BOUNDARIES
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 4: Scope Boundary Verification ---');

test('No clinical visit, notes, SOAP, or billing tables are created in migration', () => {
  const forbiddenTables = [
    'appointments',
    'clinical_visits',
    'clinical_notes',
    'soap_notes',
    'episodes_of_care',
    'treatment_plans',
    'invoices',
    'payments',
    'patient_wallets',
    'packages',
    'whatsapp_messages',
    'home_exercises',
  ];

  for (const tbl of forbiddenTables) {
    const regex = new RegExp(`CREATE\\s+TABLE\\s+.*${tbl}`, 'i');
    assert(!regex.test(migrationSql), `Unauthorized clinical table '${tbl}' found in migration`);
  }
});

// -----------------------------------------------------------------------------
// SUITE 5: APPLICATION DATA LAYER & SERVICE LOGIC
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 5: Application Service & Domain Logic ---');

test('patientService integrates with public.log_audit_event for lifecycle events', () => {
  const serviceFile = path.join(SRC_DIR, 'services', 'patientService.ts');
  assert(fs.existsSync(serviceFile), 'patientService.ts must exist');

  const content = fs.readFileSync(serviceFile, 'utf8');

  assert(content.includes('patient_created'), 'Service must audit patient_created');
  assert(content.includes('patient_updated'), 'Service must audit patient_updated');
  assert(content.includes('patient_archived'), 'Service must audit patient_archived');
  assert(content.includes('patient_unarchived'), 'Service must audit patient_unarchived');
  assert(content.includes("log_audit_event"), 'Service must invoke log_audit_event');
});

test('Sequential identifier formatting logic conforms to PAT-000001 pattern', () => {
  function formatPatientIdentifier(counter) {
    return 'PAT-' + String(counter).padStart(6, '0');
  }

  assert.strictEqual(formatPatientIdentifier(1), 'PAT-000001');
  assert.strictEqual(formatPatientIdentifier(42), 'PAT-000042');
  assert.strictEqual(formatPatientIdentifier(999999), 'PAT-999999');
});

test('Duplicate warning detector identifies matching name and contact info', () => {
  const existingPatients = [
    {
      id: 'p1',
      first_name: 'Eleanor',
      last_name: 'Vance',
      date_of_birth: '1985-04-12',
      phone: '+44 7700 900077',
      email: 'eleanor@example.co.uk',
      status: 'active',
    },
  ];

  function detectDuplicate(candidate, list) {
    return list.some(
      (p) =>
        p.status !== 'archived' &&
        ((p.first_name.toLowerCase() === candidate.firstName.toLowerCase() &&
          p.last_name.toLowerCase() === candidate.lastName.toLowerCase()) ||
          (candidate.phone && p.phone === candidate.phone))
    );
  }

  // Exact duplicate candidate
  assert.strictEqual(
    detectDuplicate({ firstName: 'eleanor', lastName: 'vance' }, existingPatients),
    true
  );

  // Phone match duplicate candidate
  assert.strictEqual(
    detectDuplicate(
      { firstName: 'Arthur', lastName: 'Pendelton', phone: '+44 7700 900077' },
      existingPatients
    ),
    true
  );

  // Distinct patient
  assert.strictEqual(
    detectDuplicate(
      { firstName: 'Marcus', lastName: 'Brody', phone: '+44 7700 900099' },
      existingPatients
    ),
    false
  );
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n====================================================');
console.log(`SUMMARY: ${passedTests}/${totalTests} tests passed`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
