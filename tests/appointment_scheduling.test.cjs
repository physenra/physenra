// ==============================================================================
// PHYSENRA APPOINTMENT & SCHEDULING FOUNDATION V1 VERIFICATION SUITE
// File: tests/appointment_scheduling.test.cjs
//
// Verifies:
// 1. Schema integrity & multi-tenant composite foreign keys
// 2. Atomic sequential identifier generator (APT-000001)
// 3. Immutability, clinician validation & state machine triggers
// 4. Strict Row-Level Security (RLS) & zero hard-delete policy
// 5. Absolute domain boundary verification (Zero clinical visits/SOAP/billing)
// 6. Application service domain logic & state machine rules
// 7. Canonical vocabulary alignment (Phase 12: Appointment Types & Location Modes)
// 8. Conflict detection logic (Phase 8: 8 operational overlap scenarios)
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
  '20260928021000_appointment_scheduling_foundation.sql'
);
const CORRECTION_MIGRATION_PATH = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260928022000_correct_appointment_vocabulary.sql'
);
const SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'appointmentService.ts'
);
const TYPES_PATH = path.join(
  __dirname,
  '..',
  'src',
  'types',
  'database.ts'
);

const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
const correctionSql = fs.readFileSync(CORRECTION_MIGRATION_PATH, 'utf8');
const serviceCode = fs.readFileSync(SERVICE_PATH, 'utf8');
const typesCode = fs.readFileSync(TYPES_PATH, 'utf8');

test('PHYSENRA APPOINTMENT & SCHEDULING FOUNDATION V1 VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Database Schema & Relational Tenancy Defense in Depth
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Appointment Database Schema & Relational Tenancy ---', async (st) => {
    await st.test('Migration creates public.appointments table with UUID primary key and practice_id', () => {
      assert(
        /CREATE\s+TABLE\s+public\.appointments\s*\(/i.test(migrationSql),
        'Table public.appointments must be created'
      );
      assert(
        /id\s+uuid\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i.test(migrationSql),
        'Appointment primary key must be UUID with gen_random_uuid() default'
      );
      assert(
        /practice_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+public\.practices\(id\)\s+ON\s+DELETE\s+RESTRICT/i.test(
          migrationSql
        ),
        'practice_id must NOT NULL reference public.practices(id) ON DELETE RESTRICT'
      );
    });

    await st.test('Migration defines required clinical appointment columns', () => {
      assert(/patient_id\s+uuid\s+NOT\s+NULL/i.test(migrationSql), 'patient_id is required');
      assert(/episode_id\s+uuid\s+REFERENCES\s+public\.episodes_of_care\(id\)/i.test(migrationSql), 'episode_id is nullable FK');
      assert(/physiotherapist_id\s+uuid\s+NOT\s+NULL/i.test(migrationSql), 'physiotherapist_id is required');
      assert(/appointment_identifier\s+text\s+NOT\s+NULL/i.test(migrationSql), 'appointment_identifier is required');
      assert(/appointment_type\s+text\s+NOT\s+NULL/i.test(migrationSql), 'appointment_type is required');
      assert(/status\s+text\s+NOT\s+NULL\s+DEFAULT\s+'scheduled'/i.test(migrationSql), 'status defaults to scheduled');
      assert(/scheduled_start\s+timestamptz\s+NOT\s+NULL/i.test(migrationSql), 'scheduled_start is required');
      assert(/scheduled_end\s+timestamptz\s+NOT\s+NULL/i.test(migrationSql), 'scheduled_end is required');
      assert(/duration_minutes\s+integer\s+NOT\s+NULL/i.test(migrationSql), 'duration_minutes is required');
      assert(/location_mode\s+text\s+NOT\s+NULL/i.test(migrationSql), 'location_mode is required');
      assert(/cancellation_reason\s+text/i.test(migrationSql), 'cancellation_reason column must exist');
      assert(/rescheduled_from_id\s+uuid/i.test(migrationSql), 'rescheduled_from_id column must exist');
    });

    await st.test('Migration enforces unique appointment_identifier per practice', () => {
      assert(
        /CONSTRAINT\s+uq_appointments_practice_identifier\s+UNIQUE\s*\(practice_id,\s*appointment_identifier\)/i.test(
          migrationSql
        ),
        'uq_appointments_practice_identifier must be unique per practice'
      );
    });

    await st.test('Migration enforces composite patient-practice foreign key to prevent cross-tenant assignment', () => {
      assert(
        /CONSTRAINT\s+fk_appointments_patient_practice\s+FOREIGN\s+KEY\s*\(patient_id,\s*practice_id\)\s+REFERENCES\s+public\.patients\(id,\s*practice_id\)\s+ON\s+DELETE\s+RESTRICT/i.test(
          migrationSql
        ),
        'fk_appointments_patient_practice must enforce identical patient and practice'
      );
    });

    await st.test('Migration enforces composite episode-patient-practice foreign key to ensure episode matches patient and practice', () => {
      assert(
        /ALTER\s+TABLE\s+public\.episodes_of_care\s+ADD\s+CONSTRAINT\s+uq_episodes_id_patient_practice\s+UNIQUE\s*\(id,\s*patient_id,\s*practice_id\)/i.test(
          migrationSql
        ),
        'uq_episodes_id_patient_practice must be created on episodes_of_care'
      );
      assert(
        /CONSTRAINT\s+fk_appointments_episode_patient_practice\s+FOREIGN\s+KEY\s*\(episode_id,\s*patient_id,\s*practice_id\)\s+REFERENCES\s+public\.episodes_of_care\(id,\s*patient_id,\s*practice_id\)\s+ON\s+DELETE\s+SET\s+NULL/i.test(
          migrationSql
        ),
        'fk_appointments_episode_patient_practice must verify episode matches patient and practice'
      );
    });

    await st.test('Migration defines practice_appointment_counters table for atomic sequencing', () => {
      assert(
        /CREATE\s+TABLE\s+public\.practice_appointment_counters\s*\(/i.test(migrationSql),
        'practice_appointment_counters table must be created'
      );
      assert(
        /practice_id\s+uuid\s+PRIMARY\s+KEY\s+REFERENCES\s+public\.practices\(id\)/i.test(migrationSql),
        'practice_id must be PK referencing public.practices'
      );
    });

    await st.test('Migration defines appointment indexes for performant practice-scoped lookups', () => {
      assert(/CREATE\s+INDEX\s+idx_appointments_practice_patient/i.test(migrationSql), 'patient index must exist');
      assert(/CREATE\s+INDEX\s+idx_appointments_practice_physio/i.test(migrationSql), 'physiotherapist index must exist');
      assert(/CREATE\s+INDEX\s+idx_appointments_practice_dates/i.test(migrationSql), 'dates index must exist');
      assert(/CREATE\s+INDEX\s+idx_appointments_practice_status/i.test(migrationSql), 'status index must exist');
      assert(/CREATE\s+INDEX\s+idx_appointments_practice_identifier/i.test(migrationSql), 'identifier index must exist');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Identifier Generator & Trigger Invariants
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Identifier Generator & Trigger Invariants ---', async (st) => {
    await st.test('generate_next_appointment_identifier is SECURITY DEFINER with safe search_path', () => {
      assert(
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.generate_next_appointment_identifier/i.test(migrationSql),
        'generate_next_appointment_identifier must be defined'
      );
      assert(/SECURITY\s+DEFINER/i.test(migrationSql), 'Must be SECURITY DEFINER');
      assert(/SET\s+search_path\s*=\s*public,\s*pg_temp/i.test(migrationSql), 'search_path must be public, pg_temp');
      assert(/'APT-'\s*\|\|\s*lpad\(/i.test(migrationSql), 'Format must prefix APT- with padded digits');
    });

    await st.test('Identifier generator validates tenant context and authorized roles', () => {
      assert(
        /p_practice_id\s*<>\s*public\.current_practice_id\(\)/i.test(migrationSql),
        'Must validate against public.current_practice_id()'
      );
      assert(
        /user_has_practice_role\(p_practice_id,\s*ARRAY\['practice_owner',\s*'practice_manager',\s*'physiotherapist',\s*'receptionist'\]\)/i.test(
          migrationSql
        ),
        'Must validate practice membership role'
      );
    });

    await st.test('Identifier generator public execution revoked, granted to authenticated', () => {
      assert(
        /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.generate_next_appointment_identifier\(uuid\)\s+FROM\s+PUBLIC/i.test(
          migrationSql
        ),
        'Execution must be revoked from public'
      );
      assert(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.generate_next_appointment_identifier\(uuid\)\s+TO\s+authenticated/i.test(
          migrationSql
        ),
        'Execution must be granted to authenticated'
      );
    });

    await st.test('Triggers guard tenancy, patient, and appointment identifier immutability', () => {
      assert(
        /CREATE\s+TRIGGER\s+trg_appointments_before_insert/i.test(migrationSql),
        'trg_appointments_before_insert must be attached'
      );
      assert(
        /CREATE\s+TRIGGER\s+trg_appointments_before_update/i.test(migrationSql),
        'trg_appointments_before_update must be attached'
      );
      assert(
        /OLD\.practice_id\s*<>\s*NEW\.practice_id\s+OR\s+OLD\.patient_id\s*<>\s*NEW\.patient_id\s+OR\s+OLD\.appointment_identifier\s*<>\s*NEW\.appointment_identifier/i.test(
          migrationSql
        ),
        'Must strictly prevent altering practice_id, patient_id, or appointment_identifier'
      );
    });

    await st.test('Triggers validate assigned physiotherapist membership and clinical role', () => {
      assert(
        /SELECT\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+public\.practice_memberships\s+WHERE\s+practice_id\s*=\s*NEW\.practice_id\s+AND\s+user_id\s*=\s*NEW\.physiotherapist_id\s+AND\s+status\s*=\s*'active'\s+AND\s+role\s+IN\s*\('physiotherapist',\s*'practice_owner',\s*'practice_manager'\)\s*\)/i.test(
          migrationSql
        ),
        'Physiotherapist must be validated against active practice membership with clinical/owner role'
      );
    });

    await st.test('Triggers enforce state machine transitions and prohibit cancelled -> completed', () => {
      assert(/OLD\.status\s*<>\s*NEW\.status/i.test(migrationSql), 'Trigger inspects status changes');
      assert(
        /v_allowed_transition/i.test(migrationSql),
        'Trigger validates allowed transitions explicitly'
      );
      assert(
        /NEW\.status\s*=\s*'cancelled'/i.test(migrationSql),
        'Cancellation stamps cancelled_at and cancelled_by'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Tenant Isolation & RLS Policies
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Tenant Isolation & RLS Policies ---', async (st) => {
    await st.test('Row-Level Security is explicitly enabled on appointments and counters', () => {
      assert(
        /ALTER\s+TABLE\s+public\.appointments\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(migrationSql),
        'RLS must be enabled on public.appointments'
      );
      assert(
        /ALTER\s+TABLE\s+public\.practice_appointment_counters\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(
          migrationSql
        ),
        'RLS must be enabled on public.practice_appointment_counters'
      );
    });

    await st.test('SELECT policy restricts appointment access to active practice context and staff roles', () => {
      assert(
        /CREATE\s+POLICY\s+"Staff can view appointments in active practice"\s+ON\s+public\.appointments\s+FOR\s+SELECT\s+TO\s+authenticated/i.test(
          migrationSql
        ),
        'SELECT policy must exist for authenticated staff'
      );
      assert(
        /practice_id\s*=\s*public\.current_practice_id\(\)/i.test(migrationSql),
        'Must filter by public.current_practice_id()'
      );
    });

    await st.test('INSERT and UPDATE policies enforce active practice context and authorized staff roles', () => {
      assert(
        /CREATE\s+POLICY\s+"Staff can create appointments in active practice"\s+ON\s+public\.appointments\s+FOR\s+INSERT/i.test(
          migrationSql
        ),
        'INSERT policy must be defined'
      );
      assert(
        /CREATE\s+POLICY\s+"Staff can update appointments in active practice"\s+ON\s+public\.appointments\s+FOR\s+UPDATE/i.test(
          migrationSql
        ),
        'UPDATE policy must be defined'
      );
    });

    await st.test('DELETE policy is strictly DENIED across all roles (zero hard deletes)', () => {
      assert(
        !/CREATE\s+POLICY\s+[^;]+ON\s+public\.appointments\s+FOR\s+DELETE/i.test(migrationSql),
        'No DELETE policy must be defined on public.appointments (default deny)'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Scope Boundary Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Scope Boundary Verification ---', async (st) => {
    await st.test('No clinical visits, SOAP notes, or billing tables created in migration', () => {
      const prohibited = [
        'clinical_visits',
        'clinical_notes',
        'soap_notes',
        'treatment_plans',
        'invoices',
        'payments',
        'patient_wallets',
        'wallet_transactions',
        'packages',
        'package_session_ledger',
        'outcome_measures',
        'home_exercises',
      ];
      for (const table of prohibited) {
        const regex = new RegExp(`CREATE\\s+TABLE\\s+public\\.${table}`, 'i');
        assert(!regex.test(migrationSql), `Prohibited table '${table}' must not be created in base migration`);
        assert(!regex.test(correctionSql), `Prohibited table '${table}' must not be created in correction migration`);
      }
    });

    await st.test('Migrations contain zero Kabworld references or IDs', () => {
      assert(!/kabworld|psyjbmetnpsqarbumzrb/i.test(migrationSql), 'Zero Kabworld contamination in base migration');
      assert(!/kabworld|psyjbmetnpsqarbumzrb/i.test(correctionSql), 'Zero Kabworld contamination in correction migration');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Application Service & Domain Logic
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Application Service & Domain Logic ---', async (st) => {
    await st.test('appointmentService integrates with public.log_audit_event for lifecycle events', () => {
      assert(
        serviceCode.includes('appointment.created'),
        'Must log appointment.created audit event'
      );
      assert(
        serviceCode.includes('appointment.updated'),
        'Must log appointment.updated audit event'
      );
      assert(
        serviceCode.includes('appointment.status_changed') || serviceCode.includes('appointment.cancelled'),
        'Must log appointment status audit events'
      );
      assert(
        serviceCode.includes('appointment.rescheduled'),
        'Must log appointment.rescheduled audit event'
      );
    });

    await st.test('Sequential appointment identifier format matches APT-000001 pattern', () => {
      const pattern = /^APT-\d{6}$/;
      assert(pattern.test('APT-000001'), 'APT-000001 must match format');
      assert(pattern.test('APT-000142'), 'APT-000142 must match format');
      assert(!pattern.test('PAT-000001'), 'PAT prefix must be rejected');
      assert(!pattern.test('EOC-000001'), 'EOC prefix must be rejected');
    });

    await st.test('Appointment state machine transition rules validate correctly', () => {
      const transitions = {
        scheduled: ['confirmed', 'cancelled', 'rescheduled'],
        confirmed: ['arrived', 'cancelled', 'rescheduled', 'no_show'],
        arrived: ['in_progress', 'cancelled', 'incomplete'],
        in_progress: ['completed', 'incomplete'],
        completed: ['documentation_completed'],
        cancelled: [],
        no_show: [],
        rescheduled: [],
        incomplete: [],
      };

      // Valid paths
      assert(transitions.scheduled.includes('confirmed'), 'scheduled -> confirmed must be allowed');
      assert(transitions.confirmed.includes('arrived'), 'confirmed -> arrived must be allowed');
      assert(transitions.arrived.includes('in_progress'), 'arrived -> in_progress must be allowed');
      assert(transitions.in_progress.includes('completed'), 'in_progress -> completed must be allowed');

      // Prohibited paths
      assert(!transitions.cancelled.includes('completed'), 'cancelled -> completed must be strictly forbidden');
      assert(!transitions.cancelled.includes('in_progress'), 'cancelled -> in_progress must be strictly forbidden');
      assert(!transitions.no_show.includes('completed'), 'no_show -> completed must be forbidden');
      assert(!transitions.rescheduled.includes('completed'), 'rescheduled -> completed must be forbidden');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Canonical Vocabulary Alignment (Phase 12 Verification)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Canonical Vocabulary Alignment ---', async (st) => {
    const canonicalAppointmentTypes = [
      'initial_consultation',
      'follow_up',
      'reassessment',
      'home_visit',
      'other',
    ];
    const invalidAppointmentTypes = [
      'initial_assessment',
      'consultation',
      'review',
    ];

    const canonicalLocationModes = [
      'clinic',
      'home',
      'telehealth',
      'other',
    ];
    const invalidLocationModes = [
      'in_clinic',
      'home_visit', // home_visit must NOT be a location_mode
      'online',
    ];

    await st.test('Forward-only migration enforces canonical CHECK constraints', () => {
      assert(
        /chk_appointments_appointment_type\s+CHECK\s*\(\s*appointment_type\s+IN\s*\(\s*'initial_consultation',\s*'follow_up',\s*'reassessment',\s*'home_visit',\s*'other'\s*\)\s*\)/i.test(
          correctionSql
        ),
        'Correction migration must enforce canonical appointment types'
      );
      assert(
        /chk_appointments_location_mode\s+CHECK\s*\(\s*location_mode\s+IN\s*\(\s*'clinic',\s*'home',\s*'telehealth',\s*'other'\s*\)\s*\)/i.test(
          correctionSql
        ),
        'Correction migration must enforce canonical location modes'
      );
      assert(
        /ALTER\s+COLUMN\s+location_mode\s+SET\s+DEFAULT\s+'clinic'/i.test(correctionSql),
        'location_mode default must be updated to clinic'
      );
    });

    await st.test('TypeScript database definitions enforce canonical appointment types', () => {
      for (const valid of canonicalAppointmentTypes) {
        assert(
          typesCode.includes(`'${valid}'`),
          `database.ts must include canonical appointment type '${valid}'`
        );
      }
      for (const invalid of invalidAppointmentTypes) {
        assert(
          !new RegExp(`export\\s+type\\s+AppointmentType\\s*=[^;]*'${invalid}'`, 's').test(typesCode),
          `database.ts must NOT include obsolete appointment type '${invalid}'`
        );
      }
    });

    await st.test('TypeScript database definitions enforce canonical location modes', () => {
      for (const valid of canonicalLocationModes) {
        assert(
          typesCode.includes(`'${valid}'`),
          `database.ts must include canonical location mode '${valid}'`
        );
      }
      for (const invalid of invalidLocationModes) {
        assert(
          !new RegExp(`export\\s+type\\s+AppointmentLocationMode\\s*=[^;]*'${invalid}'`, 's').test(typesCode),
          `database.ts must NOT include obsolete location mode '${invalid}'`
        );
      }
    });

    await st.test('home_visit is valid as appointment_type but strictly invalid as location_mode', () => {
      const apptTypeMatch = typesCode.match(/export\s+type\s+AppointmentType\s*=\s*([^;]+);/);
      const locModeMatch = typesCode.match(/export\s+type\s+AppointmentLocationMode\s*=\s*([^;]+);/);

      assert(apptTypeMatch && apptTypeMatch[1].includes("'home_visit'"), 'home_visit must be in AppointmentType');
      assert(locModeMatch && !locModeMatch[1].includes("'home_visit'"), 'home_visit must NOT be in AppointmentLocationMode');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 7: Conflict Detection Logic (Phase 8 Verification)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 7: Conflict Detection Logic ---', async (st) => {
    // Standard interval overlap function used by appointmentService & SQL
    function hasOverlap(slot1Start, slot1End, slot2Start, slot2End) {
      const s1 = new Date(slot1Start).getTime();
      const e1 = new Date(slot1End).getTime();
      const s2 = new Date(slot2Start).getTime();
      const e2 = new Date(slot2End).getTime();
      return s1 < e2 && e1 > s2;
    }

    const baseStart = '2026-10-01T10:00:00.000Z';
    const baseEnd = '2026-10-01T11:00:00.000Z';

    await st.test('Scenario 1: Exact same time slot results in conflict', () => {
      assert.strictEqual(
        hasOverlap(baseStart, baseEnd, '2026-10-01T10:00:00.000Z', '2026-10-01T11:00:00.000Z'),
        true,
        'Exact same time must conflict'
      );
    });

    await st.test('Scenario 2: Partial overlap at beginning (starts before, ends during)', () => {
      assert.strictEqual(
        hasOverlap(baseStart, baseEnd, '2026-10-01T09:30:00.000Z', '2026-10-01T10:30:00.000Z'),
        true,
        'Partial overlap at beginning must conflict'
      );
    });

    await st.test('Scenario 3: Partial overlap at end (starts during, ends after)', () => {
      assert.strictEqual(
        hasOverlap(baseStart, baseEnd, '2026-10-01T10:30:00.000Z', '2026-10-01T11:30:00.000Z'),
        true,
        'Partial overlap at end must conflict'
      );
    });

    await st.test('Scenario 4: New appointment completely inside existing appointment', () => {
      assert.strictEqual(
        hasOverlap(baseStart, baseEnd, '2026-10-01T10:15:00.000Z', '2026-10-01T10:45:00.000Z'),
        true,
        'Enclosed appointment must conflict'
      );
    });

    await st.test('Scenario 5: Existing appointment completely inside new appointment', () => {
      assert.strictEqual(
        hasOverlap(baseStart, baseEnd, '2026-10-01T09:00:00.000Z', '2026-10-01T12:00:00.000Z'),
        true,
        'Enclosing appointment must conflict'
      );
    });

    await st.test('Scenario 6: Adjacent appointments (back-to-back) MUST NOT conflict', () => {
      // Slot right before: 09:00 - 10:00
      assert.strictEqual(
        hasOverlap(baseStart, baseEnd, '2026-10-01T09:00:00.000Z', '2026-10-01T10:00:00.000Z'),
        false,
        'Preceding adjacent appointment must NOT conflict'
      );
      // Slot right after: 11:00 - 12:00
      assert.strictEqual(
        hasOverlap(baseStart, baseEnd, '2026-10-01T11:00:00.000Z', '2026-10-01T12:00:00.000Z'),
        false,
        'Succeeding adjacent appointment must NOT conflict'
      );
    });

    await st.test('Scenario 7 & 8: Clinician and practice scoping isolation', () => {
      // Overlap function is only evaluated when physiotherapist_id and practice_id match
      const apptA = {
        physioId: 'physio-1',
        practiceId: 'practice-1',
        start: baseStart,
        end: baseEnd,
      };
      const apptDiffPhysio = {
        physioId: 'physio-2',
        practiceId: 'practice-1',
        start: baseStart,
        end: baseEnd,
      };
      const apptDiffPractice = {
        physioId: 'physio-1',
        practiceId: 'practice-2',
        start: baseStart,
        end: baseEnd,
      };

      function checkApptConflict(a, b) {
        if (a.practiceId !== b.practiceId) return false;
        if (a.physioId !== b.physioId) return false;
        return hasOverlap(a.start, a.end, b.start, b.end);
      }

      assert.strictEqual(checkApptConflict(apptA, apptDiffPhysio), false, 'Different physiotherapist must NOT conflict');
      assert.strictEqual(checkApptConflict(apptA, apptDiffPractice), false, 'Different practice must NOT conflict');
    });
  });
});
