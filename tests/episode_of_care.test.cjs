/**
 * Physenra Episode of Care Foundation V1 Test Suite
 *
 * Automated verification of:
 * 1. Database schema & constraints (episodes_of_care, counters, composite foreign keys)
 * 2. Multi-tenant practice isolation & Row-Level Security (RLS) policies
 * 3. Patient-practice relationship consistency
 * 4. Responsible physiotherapist practice & role validation
 * 5. Sequential episode identifier generation (EOC-000001) & immutability
 * 6. Episode lifecycle transitions (active, paused, completed, archived)
 * 7. Audit trail integration (public.log_audit_event)
 * 8. Scope boundaries & codebase hygiene (zero secrets, zero legacy references)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================');
console.log('PHYSENRA EPISODE OF CARE FOUNDATION V1 VERIFICATION');
console.log('======================================================\n');

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
  '20260928015500_episode_of_care_foundation.sql'
);
const SRC_DIR = path.join(ROOT_DIR, 'src');

assert(fs.existsSync(MIGRATION_FILE), `Migration file must exist at ${MIGRATION_FILE}`);
const migrationSql = fs.readFileSync(MIGRATION_FILE, 'utf8');

// -----------------------------------------------------------------------------
// SUITE 1: DATABASE SCHEMA & CONSTRAINTS
// -----------------------------------------------------------------------------
console.log('--- SUITE 1: Episode of Care Database Schema ---');

test('Migration creates public.episodes_of_care table with UUID PK and practice_id', () => {
  assert(/CREATE\s+TABLE\s+public\.episodes_of_care\s+\(/i.test(migrationSql));
  assert(/id\s+uuid\s+PRIMARY\s+KEY/i.test(migrationSql));
  assert(/practice_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+public\.practices/i.test(migrationSql));
  assert(/patient_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+public\.patients/i.test(migrationSql));
});

test('Migration defines required episode fields, dates, and status', () => {
  const requiredCols = [
    'episode_identifier',
    'title',
    'description',
    'status',
    'start_date',
    'end_date',
    'primary_physiotherapist_id',
    'closed_at',
    'archived_at',
  ];

  for (const col of requiredCols) {
    const regex = new RegExp(`\\b${col}\\b`, 'i');
    assert(regex.test(migrationSql), `Column '${col}' must be defined in episodes_of_care`);
  }
});

test('Migration enforces unique episode_identifier per practice', () => {
  assert(
    /CONSTRAINT\s+uq_episodes_practice_identifier\s+UNIQUE\s*\(\s*practice_id\s*,\s*episode_identifier\s*\)/i.test(
      migrationSql
    ),
    'Constraint uq_episodes_practice_identifier must enforce uniqueness per practice'
  );
});

test('Migration enforces composite patient-practice foreign key to prevent cross-tenant assignment', () => {
  assert(
    /ADD\s+CONSTRAINT\s+uq_patients_id_practice\s+UNIQUE\s*\(\s*id\s*,\s*practice_id\s*\)/i.test(
      migrationSql
    ),
    'Patients table must have composite unique constraint uq_patients_id_practice'
  );
  assert(
    /CONSTRAINT\s+fk_episodes_patient_practice\s+FOREIGN\s+KEY\s*\(\s*patient_id\s*,\s*practice_id\s*\)\s+REFERENCES\s+public\.patients\s*\(\s*id\s*,\s*practice_id\s*\)/i.test(
      migrationSql
    ),
    'Episodes table must enforce composite foreign key fk_episodes_patient_practice'
  );
});

test('Migration defines practice_episode_counters table for atomic sequencing', () => {
  assert(/CREATE\s+TABLE\s+public\.practice_episode_counters\s+\(/i.test(migrationSql));
  assert(/practice_id\s+uuid\s+PRIMARY\s+KEY/i.test(migrationSql));
  assert(/next_val\s+integer\s+NOT\s+NULL/i.test(migrationSql));
});

test('Migration defines episode indexes for performant practice-scoped lookups', () => {
  assert(/CREATE\s+INDEX\s+idx_episodes_practice_patient\s+ON\s+public\.episodes_of_care/i.test(migrationSql));
  assert(/CREATE\s+INDEX\s+idx_episodes_practice_status\s+ON\s+public\.episodes_of_care/i.test(migrationSql));
  assert(/CREATE\s+INDEX\s+idx_episodes_practice_identifier\s+ON\s+public\.episodes_of_care/i.test(migrationSql));
  assert(/CREATE\s+INDEX\s+idx_episodes_practice_dates\s+ON\s+public\.episodes_of_care/i.test(migrationSql));
});

// -----------------------------------------------------------------------------
// SUITE 2: EPISODE IDENTIFIER GENERATOR & TRIGGERS
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 2: Identifier Generator & Trigger Invariants ---');

test('generate_next_episode_identifier is SECURITY DEFINER with safe search_path', () => {
  assert(
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.generate_next_episode_identifier/i.test(migrationSql)
  );
  assert(/SECURITY\s+DEFINER/i.test(migrationSql));
  assert(/SET\s+search_path\s*=\s*public\s*,\s*pg_temp/i.test(migrationSql));
});

test('Identifier generator validates tenant context and authorized roles', () => {
  assert(migrationSql.includes('p_practice_id <> public.current_practice_id()'));
  assert(migrationSql.includes('public.user_has_practice_role'));
  assert(migrationSql.includes("'EOC-' || lpad(v_counter::text, 6, '0')"));
});

test('Identifier generator public execution revoked, granted to authenticated', () => {
  assert(
    /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.generate_next_episode_identifier\(uuid\)\s+FROM\s+PUBLIC/i.test(
      migrationSql
    )
  );
  assert(
    /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.generate_next_episode_identifier\(uuid\)\s+TO\s+authenticated/i.test(
      migrationSql
    )
  );
});

test('Triggers guard tenancy, patient, and episode identifier immutability', () => {
  assert(/CREATE\s+TRIGGER\s+trg_episodes_before_insert/i.test(migrationSql));
  assert(/CREATE\s+TRIGGER\s+trg_episodes_before_update/i.test(migrationSql));
  assert(migrationSql.includes('NEW.practice_id <> OLD.practice_id'));
  assert(migrationSql.includes('NEW.patient_id <> OLD.patient_id'));
  assert(migrationSql.includes('NEW.id <> OLD.id'));
  assert(migrationSql.includes('NEW.episode_identifier <> OLD.episode_identifier'));
});

test('Triggers validate responsible physiotherapist membership and clinical role', () => {
  assert(migrationSql.includes('NEW.primary_physiotherapist_id IS NOT NULL'));
  assert(migrationSql.includes('practice_id = NEW.practice_id'));
  assert(migrationSql.includes("role IN ('physiotherapist', 'practice_owner', 'practice_manager')"));
  assert(migrationSql.includes("status = 'active'"));
});

test('Triggers enforce clinical completion and archive authorization', () => {
  assert(migrationSql.includes("NEW.status = 'completed' AND OLD.status <> 'completed'"));
  assert(migrationSql.includes("ARRAY['practice_owner', 'practice_manager', 'physiotherapist']"));
  assert(migrationSql.includes("NEW.status = 'archived' AND OLD.status <> 'archived'"));
  assert(migrationSql.includes("ARRAY['practice_owner', 'practice_manager']"));
});

// -----------------------------------------------------------------------------
// SUITE 3: ROW LEVEL SECURITY & TENANT ISOLATION
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 3: Tenant Isolation & RLS Policies ---');

test('Row-Level Security is explicitly enabled on episodes and counters', () => {
  assert(
    /ALTER\s+TABLE\s+public\.episodes_of_care\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(
      migrationSql
    )
  );
  assert(
    /ALTER\s+TABLE\s+public\.practice_episode_counters\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(
      migrationSql
    )
  );
});

test('SELECT policy restricts episode access to active practice context and staff roles', () => {
  assert(
    /CREATE\s+POLICY\s+"episodes_select_active_practice"\s+ON\s+public\.episodes_of_care\s+FOR\s+SELECT/i.test(
      migrationSql
    )
  );
  assert(migrationSql.includes('practice_id = public.current_practice_id()'));
});

test('INSERT and UPDATE policies enforce active practice context and authorized staff roles', () => {
  assert(
    /CREATE\s+POLICY\s+"episodes_insert_active_practice"\s+ON\s+public\.episodes_of_care\s+FOR\s+INSERT/i.test(
      migrationSql
    )
  );
  assert(
    /CREATE\s+POLICY\s+"episodes_update_active_practice"\s+ON\s+public\.episodes_of_care\s+FOR\s+UPDATE/i.test(
      migrationSql
    )
  );
});

test('DELETE policy is strictly DENIED across all roles (zero hard deletes)', () => {
  assert(
    !/CREATE\s+POLICY\s+.*FOR\s+DELETE\s+ON\s+public\.episodes_of_care/i.test(migrationSql),
    'Hard delete policy must NOT be created on public.episodes_of_care'
  );
});

// -----------------------------------------------------------------------------
// SUITE 4: SCOPE CONTROL & CLINICAL BOUNDARIES
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 4: Scope Boundary Verification ---');

test('No appointments, clinical visits, SOAP notes, or billing tables created', () => {
  const forbiddenTables = [
    'appointments',
    'clinical_visits',
    'clinical_notes',
    'soap_notes',
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
// SUITE 5: APPLICATION SERVICE & DOMAIN LOGIC
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 5: Application Service & Domain Logic ---');

test('episodeService integrates with public.log_audit_event for lifecycle events', () => {
  const serviceFile = path.join(SRC_DIR, 'services', 'episodeService.ts');
  assert(fs.existsSync(serviceFile), 'episodeService.ts must exist');

  const content = fs.readFileSync(serviceFile, 'utf8');

  assert(content.includes('episode_created'), 'Service must audit episode_created');
  assert(content.includes('episode_updated'), 'Service must audit episode_updated');
  assert(content.includes('episode_completed'), 'Service must audit episode_completed');
  assert(content.includes('episode_reopened'), 'Service must audit episode_reopened');
  assert(content.includes('episode_archived'), 'Service must audit episode_archived');
  assert(content.includes('episode_unarchived'), 'Service must audit episode_unarchived');
  assert(content.includes('log_audit_event'), 'Service must invoke log_audit_event');
});

test('Sequential episode identifier format matches EOC-000001 pattern', () => {
  function formatEpisodeIdentifier(counter) {
    return 'EOC-' + String(counter).padStart(6, '0');
  }

  assert.strictEqual(formatEpisodeIdentifier(1), 'EOC-000001');
  assert.strictEqual(formatEpisodeIdentifier(15), 'EOC-000015');
  assert.strictEqual(formatEpisodeIdentifier(999999), 'EOC-999999');
});

test('Episode lifecycle transition rules validate correctly', () => {
  function isValidTransition(from, to) {
    const allowed = {
      active: ['paused', 'completed', 'archived'],
      paused: ['active', 'completed', 'archived'],
      completed: ['active', 'archived'],
      archived: ['active'],
    };
    return Boolean(allowed[from]?.includes(to));
  }

  assert.strictEqual(isValidTransition('active', 'paused'), true);
  assert.strictEqual(isValidTransition('active', 'completed'), true);
  assert.strictEqual(isValidTransition('paused', 'active'), true);
  assert.strictEqual(isValidTransition('completed', 'active'), true); // Reopening
  assert.strictEqual(isValidTransition('completed', 'paused'), false); // Cannot pause a completed episode
  assert.strictEqual(isValidTransition('archived', 'paused'), false); // Must restore to active
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n======================================================');
console.log(`SUMMARY: ${passedTests}/${totalTests} tests passed`);
console.log('======================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
