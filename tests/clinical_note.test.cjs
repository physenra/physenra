// ==============================================================================
// PHYSENRA CLINICAL NOTE / SOAP FOUNDATION V1 VERIFICATION SUITE
// File: tests/clinical_note.test.cjs
//
// Verifies:
// 1. Schema integrity & multi-tenant composite foreign keys
// 2. Atomic sequential identifier generator (NOT-000001)
// 3. Immutability, clinician author validation & finalized lock triggers
// 4. Strict Row-Level Security (RLS) & zero hard-delete policy
// 5. Single primary SOAP note per clinical visit (partial unique index)
// 6. Absolute domain boundary verification (Zero billing/packages/wallets/AI)
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
  '20260928024000_clinical_note_foundation.sql'
);
const SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'clinicalNoteService.ts'
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

test('PHYSENRA CLINICAL NOTE / SOAP FOUNDATION V1 VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Database Schema & Relational Tenancy
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Clinical Note Database Schema & Relational Tenancy ---', async (st) => {
    await st.test('Migration creates composite unique constraint on clinical_visits table', () => {
      assert(
        migrationSql.includes('uq_clinical_visits_id_patient_practice') &&
        migrationSql.includes('UNIQUE (id, patient_id, practice_id)'),
        'Composite constraint uq_clinical_visits_id_patient_practice must be defined on clinical_visits'
      );
    });

    await st.test('Migration creates public.clinical_notes table with UUID primary key and practice_id', () => {
      assert(
        /CREATE\s+TABLE\s+public\.clinical_notes\s*\(/i.test(migrationSql),
        'Table public.clinical_notes must be created'
      );
      assert(
        /id\s+uuid\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i.test(migrationSql),
        'Clinical Note primary key must be UUID with gen_random_uuid() default'
      );
      assert(
        /practice_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+public\.practices\(id\)\s+ON\s+DELETE\s+RESTRICT/i.test(
          migrationSql
        ),
        'practice_id must be NOT NULL with RESTRICT on practices'
      );
    });

    await st.test('Migration defines required clinical note columns and SOAP fields', () => {
      assert(migrationSql.includes('clinical_visit_id uuid NOT NULL'), 'clinical_visit_id column must exist');
      assert(migrationSql.includes('patient_id uuid NOT NULL'), 'patient_id column must exist');
      assert(migrationSql.includes('episode_id uuid REFERENCES public.episodes_of_care(id)'), 'episode_id column must exist');
      assert(migrationSql.includes('author_id uuid NOT NULL'), 'author_id column must exist');
      assert(migrationSql.includes('note_identifier text NOT NULL'), 'note_identifier column must exist');
      assert(migrationSql.includes("note_type text NOT NULL DEFAULT 'soap'"), 'note_type column must default to soap');
      assert(migrationSql.includes('parent_note_id uuid REFERENCES public.clinical_notes(id)'), 'parent_note_id column must exist');
      assert(migrationSql.includes("status text NOT NULL DEFAULT 'draft'"), 'status column must default to draft');
      assert(migrationSql.includes("subjective text NOT NULL DEFAULT ''"), 'subjective column must exist');
      assert(migrationSql.includes("objective text NOT NULL DEFAULT ''"), 'objective column must exist');
      assert(migrationSql.includes("assessment text NOT NULL DEFAULT ''"), 'assessment column must exist');
      assert(migrationSql.includes("plan text NOT NULL DEFAULT ''"), 'plan column must exist');
      assert(migrationSql.includes('amendment_reason text'), 'amendment_reason column must exist');
      assert(migrationSql.includes('finalized_at timestamptz'), 'finalized_at column must exist');
      assert(migrationSql.includes('finalized_by uuid REFERENCES auth.users(id)'), 'finalized_by column must exist');
    });

    await st.test('Migration enforces unique note_identifier per practice', () => {
      assert(
        migrationSql.includes('uq_clinical_notes_practice_identifier') &&
        migrationSql.includes('UNIQUE (practice_id, note_identifier)'),
        'Composite unique constraint uq_clinical_notes_practice_identifier must be defined'
      );
    });

    await st.test('Migration enforces composite patient-practice foreign key', () => {
      assert(
        migrationSql.includes('fk_clinical_notes_patient_practice') &&
        migrationSql.includes('FOREIGN KEY (patient_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.patients(id, practice_id)'),
        'Composite FK fk_clinical_notes_patient_practice must reference patients(id, practice_id)'
      );
    });

    await st.test('Migration enforces composite episode-patient-practice foreign key', () => {
      assert(
        migrationSql.includes('fk_clinical_notes_episode_patient_practice') &&
        migrationSql.includes('FOREIGN KEY (episode_id, patient_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.episodes_of_care(id, patient_id, practice_id)'),
        'Composite FK fk_clinical_notes_episode_patient_practice must reference episodes_of_care(id, patient_id, practice_id)'
      );
    });

    await st.test('Migration enforces composite visit-patient-practice foreign key', () => {
      assert(
        migrationSql.includes('fk_clinical_notes_visit_patient_practice') &&
        migrationSql.includes('FOREIGN KEY (clinical_visit_id, patient_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.clinical_visits(id, patient_id, practice_id)'),
        'Composite FK fk_clinical_notes_visit_patient_practice must reference clinical_visits(id, patient_id, practice_id)'
      );
    });

    await st.test('Migration enforces single primary SOAP note per visit via partial unique index', () => {
      assert(
        migrationSql.includes('uq_clinical_notes_practice_visit_primary') &&
        migrationSql.includes('ON public.clinical_notes (practice_id, clinical_visit_id)') &&
        migrationSql.includes("WHERE note_type = 'soap'"),
        'Partial unique index uq_clinical_notes_practice_visit_primary must enforce exactly 1 SOAP note per visit'
      );
    });

    await st.test('Migration defines practice_clinical_note_counters table for atomic sequencing', () => {
      assert(
        /CREATE\s+TABLE\s+public\.practice_clinical_note_counters\s*\(/i.test(migrationSql),
        'Table public.practice_clinical_note_counters must be created'
      );
      assert(
        migrationSql.includes('next_val integer NOT NULL DEFAULT 1 CHECK (next_val >= 1)'),
        'next_val must be integer >= 1'
      );
    });

    await st.test('Migration defines performant practice-scoped indexes', () => {
      assert(migrationSql.includes('idx_clinical_notes_practice_patient'), 'idx_clinical_notes_practice_patient must exist');
      assert(migrationSql.includes('idx_clinical_notes_practice_visit'), 'idx_clinical_notes_practice_visit must exist');
      assert(migrationSql.includes('idx_clinical_notes_practice_episode'), 'idx_clinical_notes_practice_episode must exist');
      assert(migrationSql.includes('idx_clinical_notes_practice_author'), 'idx_clinical_notes_practice_author must exist');
      assert(migrationSql.includes('idx_clinical_notes_practice_status'), 'idx_clinical_notes_practice_status must exist');
      assert(migrationSql.includes('idx_clinical_notes_parent_note'), 'idx_clinical_notes_parent_note must exist');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Identifier Generator & Trigger Invariants
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Identifier Generator & Trigger Invariants ---', async (st) => {
    await st.test('generate_next_clinical_note_identifier is SECURITY DEFINER with safe search_path', () => {
      assert(
        migrationSql.includes('FUNCTION public.generate_next_clinical_note_identifier'),
        'Function generate_next_clinical_note_identifier must be created'
      );
      assert(
        migrationSql.includes('SECURITY DEFINER'),
        'generate_next_clinical_note_identifier must be SECURITY DEFINER'
      );
      assert(
        migrationSql.includes('SET search_path = public, pg_temp'),
        'generate_next_clinical_note_identifier must have safe search_path'
      );
    });

    await st.test('Identifier generator validates tenant context and authorized roles', () => {
      assert(
        migrationSql.includes('v_current_practice := public.current_practice_id()'),
        'Must resolve active practice context'
      );
      assert(
        migrationSql.includes('Tenant context mismatch: cannot generate clinical note identifier for another practice'),
        'Must reject cross-tenant generation'
      );
    });

    await st.test('Identifier generator revokes execution from PUBLIC and grants to authenticated', () => {
      assert(
        migrationSql.includes('REVOKE ALL ON FUNCTION public.generate_next_clinical_note_identifier(uuid) FROM PUBLIC;'),
        'Must revoke from PUBLIC'
      );
      assert(
        migrationSql.includes('GRANT EXECUTE ON FUNCTION public.generate_next_clinical_note_identifier(uuid) TO authenticated;'),
        'Must grant to authenticated'
      );
    });

    await st.test('Triggers guard tenancy, patient, visit, and identifier immutability', () => {
      assert(
        migrationSql.includes('Immutability violation: Note ID cannot be changed'),
        'Note ID must be immutable'
      );
      assert(
        migrationSql.includes('Immutability violation: practice_id cannot be changed'),
        'practice_id must be immutable'
      );
      assert(
        migrationSql.includes('Immutability violation: patient_id cannot be changed'),
        'patient_id must be immutable'
      );
      assert(
        migrationSql.includes('Immutability violation: clinical_visit_id cannot be changed'),
        'clinical_visit_id must be immutable'
      );
      assert(
        migrationSql.includes('Immutability violation: note_identifier cannot be changed'),
        'note_identifier must be immutable'
      );
    });

    await st.test('Trigger prevents modifying finalized or amended note content (medico-legal lock)', () => {
      assert(
        migrationSql.includes('Medico-legal immutability violation: Finalized or amended clinical notes cannot be modified'),
        'Finalized note content must be locked against edits'
      );
    });

    await st.test('Trigger validates clinician author membership and role', () => {
      assert(
        migrationSql.includes('trg_fn_validate_clinical_note_author'),
        'Author validation trigger must exist'
      );
      assert(
        migrationSql.includes("role IN ('practice_owner', 'practice_manager', 'physiotherapist')"),
        'Author must hold authorized clinical role'
      );
    });

    await st.test('Trigger validates addendum parent note existence and status', () => {
      assert(
        migrationSql.includes('trg_fn_validate_addendum'),
        'Addendum validation trigger must exist'
      );
      assert(
        migrationSql.includes("v_parent.status NOT IN ('finalized', 'amended')"),
        'Addendum must only attach to finalized or amended note'
      );
    });

    await st.test('Trigger automatically marks parent note as amended when addendum is inserted', () => {
      assert(
        migrationSql.includes('trg_on_addendum_created'),
        'Addendum creation trigger must exist'
      );
      assert(
        migrationSql.includes("SET status = 'amended'"),
        'Must update parent status to amended'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Tenant Isolation & RLS Policies
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Tenant Isolation & RLS Policies ---', async (st) => {
    await st.test('Row-Level Security is explicitly enabled on clinical_notes and counters', () => {
      assert(
        migrationSql.includes('ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on clinical_notes'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.practice_clinical_note_counters ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on counters'
      );
    });

    await st.test('SELECT policy restricts clinical note access to active practice context and staff roles', () => {
      assert(
        migrationSql.includes('CREATE POLICY clinical_notes_select ON public.clinical_notes'),
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

    await st.test('INSERT and UPDATE policies enforce active practice context and authorized clinical roles', () => {
      assert(
        migrationSql.includes('CREATE POLICY clinical_notes_insert ON public.clinical_notes'),
        'INSERT policy must exist'
      );
      assert(
        migrationSql.includes(
          "ARRAY['practice_owner', 'practice_manager', 'physiotherapist']"
        ),
        'INSERT policy must be restricted to clinical staff'
      );
      assert(
        migrationSql.includes('CREATE POLICY clinical_notes_update ON public.clinical_notes'),
        'UPDATE policy must exist'
      );
    });

    await st.test('DELETE policy is strictly DENIED across all roles (zero hard deletes)', () => {
      assert(
        migrationSql.includes('CREATE POLICY clinical_notes_delete_denied ON public.clinical_notes') &&
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
    await st.test('No billing, packages, wallets, or AI tables created in migration', () => {
      const prohibited = [
        'invoices',
        'payments',
        'packages',
        'package_ledger',
        'wallets',
        'wallet_transactions',
        'treatment_plans',
        'outcome_measures',
        'home_exercises',
        'ai_transcriptions',
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
    await st.test('clinicalNoteService integrates with public.log_audit_event for lifecycle events', () => {
      assert(
        serviceCode.includes("p_action: 'clinical_note.created'"),
        'Service must log note creation audit event'
      );
      assert(
        serviceCode.includes("p_action: 'clinical_note.updated'"),
        'Service must log note update audit event'
      );
      assert(
        serviceCode.includes("p_action: 'clinical_note.finalized'"),
        'Service must log note finalization audit event'
      );
      assert(
        serviceCode.includes("p_action: 'clinical_note.amended'"),
        'Service must log note amended audit event'
      );
      assert(
        serviceCode.includes("p_action: 'clinical_note.addendum_created'"),
        'Service must log addendum created audit event'
      );
    });

    await st.test('Sequential note identifier format matches NOT-000001 pattern in migration', () => {
      assert(
        migrationSql.includes("'NOT-' || lpad(v_next_val::text, 6, '0')"),
        'Migration identifier generator must match NOT-000001 format'
      );
    });

    await st.test('TypeScript database definitions declare clinical_notes and note enums', () => {
      assert(typesCode.includes('clinical_notes:'), 'database.ts must declare clinical_notes table');
      assert(typesCode.includes('practice_clinical_note_counters:'), 'database.ts must declare practice_clinical_note_counters');
      assert(typesCode.includes('generate_next_clinical_note_identifier:'), 'database.ts must declare identifier function');
      assert(typesCode.includes('clinical_note_status: ClinicalNoteStatus'), 'database.ts must declare clinical_note_status enum');
      assert(typesCode.includes('clinical_note_type: ClinicalNoteType'), 'database.ts must declare clinical_note_type enum');
    });
  });
});
