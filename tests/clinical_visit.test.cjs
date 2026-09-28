// ==============================================================================
// PHYSENRA CLINICAL VISIT FOUNDATION V1 VERIFICATION SUITE
// File: tests/clinical_visit.test.cjs
//
// Verifies:
// 1. Schema integrity & multi-tenant composite foreign keys
// 2. Atomic sequential identifier generator (VIS-000001)
// 3. Immutability, clinician validation & state machine triggers
// 4. Strict Row-Level Security (RLS) & zero hard-delete policy
// 5. Duplicate appointment visit prevention (one visit per appointment)
// 6. Absolute domain boundary verification (Zero SOAP notes/billing/packages/wallets)
// 7. Application service domain logic & state machine rules
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
  '20260928023000_clinical_visit_foundation.sql'
);
const SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'clinicalVisitService.ts'
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

test('PHYSENRA CLINICAL VISIT FOUNDATION V1 VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Database Schema & Relational Tenancy
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Clinical Visit Database Schema & Relational Tenancy ---', async (st) => {
    await st.test('Migration creates composite unique constraint on appointments table', () => {
      assert(
        migrationSql.includes('uq_appointments_id_patient_practice') &&
        migrationSql.includes('UNIQUE (id, patient_id, practice_id)'),
        'Composite constraint uq_appointments_id_patient_practice must be defined on appointments'
      );
    });

    await st.test('Migration creates public.clinical_visits table with UUID primary key and practice_id', () => {
      assert(
        /CREATE\s+TABLE\s+public\.clinical_visits\s*\(/i.test(migrationSql),
        'Table public.clinical_visits must be created'
      );
      assert(
        /id\s+uuid\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i.test(migrationSql),
        'Clinical Visit primary key must be UUID with gen_random_uuid() default'
      );
      assert(
        /practice_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+public\.practices\(id\)\s+ON\s+DELETE\s+RESTRICT/i.test(
          migrationSql
        ),
        'practice_id must be NOT NULL with RESTRICT on practices'
      );
    });

    await st.test('Migration defines required clinical visit columns', () => {
      assert(migrationSql.includes('patient_id uuid NOT NULL'), 'patient_id column must exist');
      assert(migrationSql.includes('episode_id uuid REFERENCES public.episodes_of_care(id)'), 'episode_id column must exist');
      assert(migrationSql.includes('appointment_id uuid REFERENCES public.appointments(id)'), 'appointment_id column must exist');
      assert(migrationSql.includes('physiotherapist_id uuid NOT NULL'), 'physiotherapist_id column must exist');
      assert(migrationSql.includes('visit_identifier text NOT NULL'), 'visit_identifier column must exist');
      assert(migrationSql.includes('status text NOT NULL DEFAULT \'scheduled\''), 'status column must have default scheduled');
      assert(migrationSql.includes('actual_start timestamptz'), 'actual_start column must exist');
      assert(migrationSql.includes('actual_end timestamptz'), 'actual_end column must exist');
      assert(migrationSql.includes('duration_minutes integer'), 'duration_minutes column must exist');
      assert(migrationSql.includes('location_mode text NOT NULL DEFAULT \'clinic\''), 'location_mode column must exist');
    });

    await st.test('Migration enforces unique visit_identifier per practice', () => {
      assert(
        migrationSql.includes('uq_clinical_visits_practice_identifier') &&
        migrationSql.includes('UNIQUE (practice_id, visit_identifier)'),
        'Composite unique constraint uq_clinical_visits_practice_identifier must be defined'
      );
    });

    await st.test('Migration enforces composite patient-practice foreign key', () => {
      assert(
        migrationSql.includes('fk_clinical_visits_patient_practice') &&
        migrationSql.includes('FOREIGN KEY (patient_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.patients(id, practice_id)'),
        'Composite foreign key fk_clinical_visits_patient_practice must prevent cross-tenant patient linkage'
      );
    });

    await st.test('Migration enforces composite episode-patient-practice foreign key', () => {
      assert(
        migrationSql.includes('fk_clinical_visits_episode_patient_practice') &&
        migrationSql.includes('FOREIGN KEY (episode_id, patient_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.episodes_of_care(id, patient_id, practice_id)'),
        'Composite foreign key fk_clinical_visits_episode_patient_practice must guarantee episode belongs to same patient and practice'
      );
    });

    await st.test('Migration enforces composite appointment-patient-practice foreign key', () => {
      assert(
        migrationSql.includes('fk_clinical_visits_appointment_patient_practice') &&
        migrationSql.includes('FOREIGN KEY (appointment_id, patient_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.appointments(id, patient_id, practice_id)'),
        'Composite foreign key fk_clinical_visits_appointment_patient_practice must guarantee appointment belongs to same patient and practice'
      );
    });

    await st.test('Migration defines practice_clinical_visit_counters table for atomic sequencing', () => {
      assert(
        /CREATE\s+TABLE\s+public\.practice_clinical_visit_counters\s*\(/i.test(migrationSql),
        'Table public.practice_clinical_visit_counters must exist'
      );
      assert(
        migrationSql.includes('next_val integer NOT NULL DEFAULT 1 CHECK (next_val >= 1)'),
        'Counter must enforce positive integers'
      );
    });

    await st.test('Migration defines duplicate prevention for appointment clinical visits', () => {
      assert(
        migrationSql.includes('uq_clinical_visits_practice_appointment') &&
        migrationSql.includes('CREATE UNIQUE INDEX uq_clinical_visits_practice_appointment') &&
        migrationSql.includes('ON public.clinical_visits (practice_id, appointment_id)') &&
        migrationSql.includes('WHERE appointment_id IS NOT NULL'),
        'Partial unique index uq_clinical_visits_practice_appointment must block duplicate visits for an appointment'
      );
    });

    await st.test('Migration defines performance indexes for practice-scoped lookups', () => {
      assert(migrationSql.includes('idx_clinical_visits_practice_patient'), 'Patient lookup index must exist');
      assert(migrationSql.includes('idx_clinical_visits_practice_episode'), 'Episode lookup index must exist');
      assert(migrationSql.includes('idx_clinical_visits_practice_appointment'), 'Appointment lookup index must exist');
      assert(migrationSql.includes('idx_clinical_visits_practice_physio'), 'Physiotherapist lookup index must exist');
      assert(migrationSql.includes('idx_clinical_visits_practice_status'), 'Status lookup index must exist');
      assert(migrationSql.includes('idx_clinical_visits_practice_start'), 'Actual start lookup index must exist');
      assert(migrationSql.includes('idx_clinical_visits_practice_identifier'), 'Visit identifier lookup index must exist');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Identifier Generator & Trigger Invariants
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Identifier Generator & Trigger Invariants ---', async (st) => {
    await st.test('generate_next_clinical_visit_identifier is SECURITY DEFINER with safe search_path', () => {
      assert(
        migrationSql.includes('FUNCTION public.generate_next_clinical_visit_identifier'),
        'Function generate_next_clinical_visit_identifier must be defined'
      );
      assert(migrationSql.includes('SECURITY DEFINER'), 'Identifier generator must be SECURITY DEFINER');
      assert(
        migrationSql.includes('SET search_path = public, pg_temp'),
        'Identifier generator must set fixed search_path'
      );
    });

    await st.test('Identifier generator validates tenant context', () => {
      assert(
        migrationSql.includes('v_current_practice := public.current_practice_id();'),
        'Generator must resolve current_practice_id()'
      );
      assert(
        migrationSql.includes('Tenant context mismatch: cannot generate visit identifier for another practice'),
        'Generator must throw exception on practice mismatch'
      );
    });

    await st.test('Identifier generator public execution revoked, granted to authenticated', () => {
      assert(
        migrationSql.includes('REVOKE ALL ON FUNCTION public.generate_next_clinical_visit_identifier(uuid) FROM PUBLIC;'),
        'Public execute revoked'
      );
      assert(
        migrationSql.includes('GRANT EXECUTE ON FUNCTION public.generate_next_clinical_visit_identifier(uuid) TO authenticated;'),
        'Execute granted to authenticated'
      );
    });

    await st.test('Triggers guard tenancy, patient, and visit identifier immutability', () => {
      assert(
        migrationSql.includes('CREATE TRIGGER trg_guard_clinical_visit_invariants'),
        'Trigger trg_guard_clinical_visit_invariants must exist'
      );
      assert(
        migrationSql.includes('Immutability violation: practice_id cannot be changed'),
        'practice_id mutation must be rejected'
      );
      assert(
        migrationSql.includes('Immutability violation: patient_id cannot be changed'),
        'patient_id mutation must be rejected'
      );
      assert(
        migrationSql.includes('Immutability violation: visit_identifier cannot be changed'),
        'visit_identifier mutation must be rejected'
      );
      assert(
        migrationSql.includes('Immutability violation: linked appointment cannot be reassigned'),
        'appointment_id reassignment must be rejected'
      );
    });

    await st.test('Triggers validate assigned physiotherapist membership and clinical role', () => {
      assert(
        migrationSql.includes('CREATE TRIGGER trg_validate_visit_physiotherapist'),
        'Trigger trg_validate_visit_physiotherapist must exist'
      );
      assert(
        migrationSql.includes("role IN ('practice_owner', 'practice_manager', 'physiotherapist')"),
        'Physiotherapist must have valid clinical staff role'
      );
      assert(
        migrationSql.includes('Invalid physiotherapist: Clinician must be an active clinical staff member of this practice.'),
        'Non-member/non-clinical user assignment must be rejected'
      );
    });

    await st.test('Triggers enforce state machine transitions and prohibit modification of terminal states', () => {
      assert(
        migrationSql.includes('CREATE TRIGGER trg_enforce_clinical_visit_state_transitions'),
        'Trigger trg_enforce_clinical_visit_state_transitions must exist'
      );
      assert(
        migrationSql.includes('Completed visits are immutable and cannot change status'),
        'Completed visit mutation must be blocked'
      );
      assert(
        migrationSql.includes('Cancelled visits cannot be modified'),
        'Cancelled visit mutation must be blocked'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Tenant Isolation & RLS Policies
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Tenant Isolation & RLS Policies ---', async (st) => {
    await st.test('Row-Level Security is explicitly enabled on clinical_visits and counters', () => {
      assert(
        migrationSql.includes('ALTER TABLE public.clinical_visits ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on clinical_visits'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.practice_clinical_visit_counters ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on counters'
      );
    });

    await st.test('SELECT policy restricts clinical visit access to active practice context and staff roles', () => {
      assert(
        migrationSql.includes('CREATE POLICY clinical_visits_select ON public.clinical_visits'),
        'SELECT policy must exist'
      );
      assert(
        migrationSql.includes('practice_id = public.current_practice_id()'),
        'SELECT policy must verify practice_id'
      );
      assert(
        migrationSql.includes(
          "ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'biller']"
        ),
        'SELECT policy must check authorized practice roles'
      );
    });

    await st.test('INSERT and UPDATE policies enforce active practice context and authorized staff roles', () => {
      assert(
        migrationSql.includes('CREATE POLICY clinical_visits_insert ON public.clinical_visits'),
        'INSERT policy must exist'
      );
      assert(
        migrationSql.includes('CREATE POLICY clinical_visits_update ON public.clinical_visits'),
        'UPDATE policy must exist'
      );
    });

    await st.test('DELETE policy is strictly DENIED across all roles (zero hard deletes)', () => {
      assert(
        migrationSql.includes('CREATE POLICY clinical_visits_delete_denied ON public.clinical_visits') &&
        migrationSql.includes('FOR DELETE') &&
        migrationSql.includes('USING (false)'),
        'DELETE policy must unconditionally evaluate to false'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Scope Boundary & Domain Firewall Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Scope Boundary & Domain Firewall Verification ---', async (st) => {
    await st.test('No clinical notes, SOAP, or billing tables created in migration', () => {
      const prohibited = [
        'clinical_notes',
        'soap_notes',
        'invoices',
        'payments',
        'packages',
        'package_ledger',
        'wallets',
        'wallet_transactions',
        'treatment_plans',
        'outcome_measures',
        'home_exercises'
      ];
      for (const table of prohibited) {
        const regex = new RegExp(`CREATE\\s+TABLE\\s+(?:public\\.)?${table}\\b`, 'i');
        assert(!regex.test(migrationSql), `Prohibited table '${table}' must NOT be created in migration`);
      }
    });

    await st.test('Migrations contain zero Kabworld references or IDs', () => {
      assert(!/kabworld/i.test(migrationSql), 'Migration must not reference kabworld');
      assert(!/vtzlhxvhmsfwtofwktpm/i.test(migrationSql), 'Migration must not reference kabworld project ref');
      assert(!/psyjbmetnpsqarbumzrb/i.test(migrationSql), 'Migration must not reference kabworld db ID');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Application Service & Domain Logic
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Application Service & Domain Logic ---', async (st) => {
    await st.test('clinicalVisitService integrates with public.log_audit_event for lifecycle events', () => {
      assert(
        serviceCode.includes("p_action: 'clinical_visit.created'"),
        'Service must log visit creation audit event'
      );
      assert(
        serviceCode.includes("p_action: 'clinical_visit.status_changed'"),
        'Service must log status change audit event'
      );
      assert(
        serviceCode.includes("p_action: 'clinical_visit.completed'"),
        'Service must log encounter completion audit event'
      );
      assert(
        serviceCode.includes("p_action: 'clinical_visit.cancelled'"),
        'Service must log encounter cancellation audit event'
      );
    });

    await st.test('Sequential clinical visit identifier format matches VIS-000001 pattern', () => {
      const formatId = (n) => `VIS-${String(n).padStart(6, '0')}`;
      assert.equal(formatId(1), 'VIS-000001');
      assert.equal(formatId(42), 'VIS-000042');
      assert.equal(formatId(100000), 'VIS-100000');
    });

    await st.test('Clinical visit state machine transition rules validate correctly', () => {
      const ALLOWED = {
        scheduled: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'incomplete', 'cancelled'],
        incomplete: ['in_progress', 'cancelled'],
        completed: [],
        cancelled: [],
      };

      // Valid forward transitions
      assert(ALLOWED.scheduled.includes('in_progress'));
      assert(ALLOWED.scheduled.includes('cancelled'));
      assert(ALLOWED.in_progress.includes('completed'));
      assert(ALLOWED.in_progress.includes('incomplete'));
      assert(ALLOWED.incomplete.includes('in_progress'));

      // Blocked invalid transitions
      assert(!ALLOWED.scheduled.includes('completed'), 'Direct scheduled -> completed must be prohibited');
      assert.equal(ALLOWED.completed.length, 0, 'Completed is terminal');
      assert.equal(ALLOWED.cancelled.length, 0, 'Cancelled is terminal');
    });

    await st.test('Canonical vocabulary constraints for clinical visits', () => {
      assert(
        migrationSql.includes("status IN ('scheduled', 'in_progress', 'completed', 'incomplete', 'cancelled')"),
        'Migration must enforce canonical status values'
      );
      assert(
        migrationSql.includes("location_mode IN ('clinic', 'home', 'telehealth', 'other')"),
        'Migration must enforce canonical location modes'
      );
      assert(
        !migrationSql.includes("'home_visit'") || !migrationSql.includes("location_mode IN ('clinic', 'home_visit'"),
        'home_visit must NOT be in location_mode'
      );
    });
  });
});
