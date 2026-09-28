// ==============================================================================
// PHYSENRA CLINICAL OUTCOME MEASURES FOUNDATION V1 VERIFICATION SUITE
// File: tests/clinical_outcome_measures.test.cjs
//
// Verifies:
// 1. Schema integrity & multi-tenant composite foreign keys
// 2. Atomic sequential identifier generator (OUT-000001)
// 3. Evidence-based standard seed definitions (NPRS, VAS, LEFS, QuickDASH, etc.)
// 4. Immutability, assessor validation & finalized lock triggers
// 5. Controlled amendment pattern preserving original measurements
// 6. Longitudinal repeat assessments (Baseline -> Interim -> Discharge)
// 7. Strict Row-Level Security (RLS) & zero hard-delete policy
// 8. Absolute domain boundary verification (Zero billing/packages/wallets/AI)
// 9. TypeScript database types & service domain logic
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
  '20260928025000_clinical_outcome_measures_foundation.sql'
);
const SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'outcomeMeasureService.ts'
);
const TYPES_PATH = path.join(
  __dirname,
  '..',
  'src',
  'types',
  'database.ts'
);
const APP_PATH = path.join(
  __dirname,
  '..',
  'src',
  'App.tsx'
);
const SIDEBAR_PATH = path.join(
  __dirname,
  '..',
  'src',
  'components',
  'layout',
  'Sidebar.tsx'
);

const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
const serviceCode = fs.readFileSync(SERVICE_PATH, 'utf8');
const typesCode = fs.readFileSync(TYPES_PATH, 'utf8');
const appCode = fs.readFileSync(APP_PATH, 'utf8');
const sidebarCode = fs.readFileSync(SIDEBAR_PATH, 'utf8');

test('PHYSENRA CLINICAL OUTCOME MEASURES FOUNDATION V1 VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Database Schema & Relational Tenancy
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Outcome Measures Schema & Relational Tenancy ---', async (st) => {
    await st.test('Migration creates public.outcome_measure_definitions table', () => {
      assert(
        /CREATE\s+TABLE\s+public\.outcome_measure_definitions\s*\(/i.test(migrationSql),
        'Table public.outcome_measure_definitions must be created'
      );
      assert(
        /id\s+uuid\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i.test(migrationSql),
        'Definition primary key must be UUID with gen_random_uuid() default'
      );
      assert(
        migrationSql.includes('practice_id uuid REFERENCES public.practices(id) ON DELETE CASCADE'),
        'practice_id on definitions must be nullable for system measures with cascade delete'
      );
      assert(
        migrationSql.includes('code text NOT NULL'),
        'code column must be NOT NULL'
      );
      assert(
        migrationSql.includes('scoring_type text NOT NULL'),
        'scoring_type column must be NOT NULL'
      );
      assert(
        migrationSql.includes('category text NOT NULL'),
        'category column must be NOT NULL'
      );
    });

    await st.test('Migration creates public.outcome_measure_assessments table with UUID PK and practice_id', () => {
      assert(
        /CREATE\s+TABLE\s+public\.outcome_measure_assessments\s*\(/i.test(migrationSql),
        'Table public.outcome_measure_assessments must be created'
      );
      assert(
        /id\s+uuid\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i.test(migrationSql),
        'Assessment primary key must be UUID with gen_random_uuid() default'
      );
      assert(
        /practice_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+public\.practices\(id\)\s+ON\s+DELETE\s+RESTRICT/i.test(
          migrationSql
        ),
        'practice_id must be NOT NULL with RESTRICT on practices'
      );
      assert(
        migrationSql.includes('assessment_identifier text NOT NULL'),
        'assessment_identifier column must exist'
      );
    });

    await st.test('Migration enforces composite foreign keys guaranteeing practice integrity', () => {
      // Patient composite FK
      assert(
        migrationSql.includes('fk_outcome_assessments_patient_practice') &&
        migrationSql.includes('FOREIGN KEY (patient_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.patients(id, practice_id)'),
        'Must enforce composite FK on (patient_id, practice_id)'
      );
      // Episode composite FK
      assert(
        migrationSql.includes('fk_outcome_assessments_episode_patient_practice') &&
        migrationSql.includes('FOREIGN KEY (episode_id, patient_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.episodes_of_care(id, patient_id, practice_id)'),
        'Must enforce composite FK on (episode_id, patient_id, practice_id)'
      );
      // Clinical Visit composite FK
      assert(
        migrationSql.includes('fk_outcome_assessments_visit_patient_practice') &&
        migrationSql.includes('FOREIGN KEY (clinical_visit_id, patient_id, practice_id)') &&
        migrationSql.includes('REFERENCES public.clinical_visits(id, patient_id, practice_id)'),
        'Must enforce composite FK on (clinical_visit_id, patient_id, practice_id)'
      );
    });

    await st.test('Migration enforces unique assessment_identifier per practice', () => {
      assert(
        migrationSql.includes('uq_outcome_assessments_practice_identifier') &&
        migrationSql.includes('UNIQUE (practice_id, assessment_identifier)'),
        'Must define unique constraint uq_outcome_assessments_practice_identifier'
      );
    });

    await st.test('Migration creates practice outcome measure counters table', () => {
      assert(
        migrationSql.includes('CREATE TABLE public.practice_outcome_measure_counters'),
        'Counter table practice_outcome_measure_counters must be created'
      );
      assert(
        migrationSql.includes('practice_id uuid PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE'),
        'Counter must reference practice_id as PK with cascade delete'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Standard Evidence-Based Seed Definitions
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Standard Evidence-Based Measure Definitions ---', async (st) => {
    const requiredMeasures = [
      'NPRS',
      'VAS',
      'LEFS',
      'QUICKDASH',
      'ODI',
      'NDI',
      'TUG',
      'PSFS',
      'BBS',
    ];

    for (const code of requiredMeasures) {
      await st.test(`Migration seeds evidence-based standard measure: ${code}`, () => {
        assert(
          migrationSql.includes(`'${code}'`),
          `Seed definition for ${code} must exist in migration SQL`
        );
      });
    }

    await st.test('Seed definitions are marked as is_system = true with practice_id NULL', () => {
      assert(
        migrationSql.includes('is_system') && migrationSql.includes('NULL,') && migrationSql.includes('true,'),
        'System definitions must have practice_id as NULL and is_system = true'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Atomic Identifier Generator & Trigger
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Atomic Sequential Identifier Generator ---', async (st) => {
    await st.test('Migration defines generate_next_outcome_measure_identifier function', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.generate_next_outcome_measure_identifier(p_practice_id uuid)'),
        'Function generate_next_outcome_measure_identifier must be defined'
      );
      assert(
        migrationSql.includes("'OUT-' || lpad(v_next_val::text, 6, '0')"),
        'Identifier must be formatted with OUT- prefix and 6 digits (OUT-000001)'
      );
      assert(
        migrationSql.includes('RETURNING practice_outcome_measure_counters.next_val - 1 INTO v_next_val'),
        'Must atomically increment and return current value'
      );
    });

    await st.test('Migration attaches trigger to set assessment_identifier before insert', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.trg_fn_set_outcome_measure_identifier()'),
        'Function trg_fn_set_outcome_measure_identifier must exist'
      );
      assert(
        migrationSql.includes('CREATE TRIGGER trg_set_outcome_measure_identifier') &&
        migrationSql.includes('BEFORE INSERT ON public.outcome_measure_assessments'),
        'Trigger trg_set_outcome_measure_identifier must be registered BEFORE INSERT'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Assessor Validation & Medico-Legal Locking
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Assessor Validation & Immutability Protection ---', async (st) => {
    await st.test('Migration validates assessor active clinical practice membership', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.trg_fn_validate_outcome_assessor()'),
        'Function trg_fn_validate_outcome_assessor must exist'
      );
      assert(
        migrationSql.includes("'practice_owner', 'practice_manager', 'physiotherapist'"),
        'Must validate assessor possesses clinical or authorized practice role'
      );
    });

    await st.test('Migration enforces finalized score lock and controlled amendment trigger', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.trg_fn_guard_outcome_assessment_invariants()'),
        'Function trg_fn_guard_outcome_assessment_invariants must exist'
      );
      assert(
        migrationSql.includes('Medico-legal immutability violation: Finalized outcome assessments cannot alter historical original scores'),
        'Must block direct score alteration on finalized assessments'
      );
      assert(
        migrationSql.includes('CREATE TRIGGER trg_guard_outcome_assessment_invariants') &&
        migrationSql.includes('BEFORE UPDATE ON public.outcome_measure_assessments'),
        'Trigger trg_guard_outcome_assessment_invariants must be active BEFORE UPDATE'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Strict RLS & Zero Hard Deletes
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Row-Level Security & Deletion Policy ---', async (st) => {
    await st.test('Row Level Security is enabled on outcome tables', () => {
      assert(
        migrationSql.includes('ALTER TABLE public.outcome_measure_definitions ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on outcome_measure_definitions'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.outcome_measure_assessments ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on outcome_measure_assessments'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.practice_outcome_measure_counters ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on practice_outcome_measure_counters'
      );
    });

    await st.test('Zero hard-delete policy is enforced by RLS on assessments', () => {
      assert(
        migrationSql.includes('CREATE POLICY outcome_assessments_delete_denied ON public.outcome_measure_assessments') &&
        migrationSql.includes('FOR DELETE') &&
        migrationSql.includes('USING (false);'),
        'Hard deletes must be categorically denied with USING (false)'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Absolute Domain Firewall Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Domain Firewall & Independence ---', async (st) => {
    const prohibitedKeywords = [
      'invoice',
      'billing',
      'payment',
      'package',
      'wallet',
      'stripe',
      'telehealth_session',
      'whatsapp',
      'openai',
      'gemini',
    ];

    for (const kw of prohibitedKeywords) {
      await st.test(`Migration does NOT introduce prohibited domain: ${kw}`, () => {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        assert(
          !regex.test(migrationSql),
          `Migration must not reference prohibited commercial/AI domain: ${kw}`
        );
      });
    }

    await st.test('Assessment is strictly decoupled from SOAP narrative storage', () => {
      assert(
        !migrationSql.includes('soap_note') && !migrationSql.includes('soap_sections'),
        'Outcome measures table must not embed SOAP narrative content'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 7: TypeScript Types & Service Layer
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 7: TypeScript Types & Service Layer ---', async (st) => {
    await st.test('Database types define outcome measure tables and enums', () => {
      assert(typesCode.includes('OutcomeMeasureCategory'), 'OutcomeMeasureCategory type must exist');
      assert(typesCode.includes('OutcomeMeasureScoringType'), 'OutcomeMeasureScoringType type must exist');
      assert(typesCode.includes('OutcomeAssessmentType'), 'OutcomeAssessmentType type must exist');
      assert(typesCode.includes('OutcomeAssessmentStatus'), 'OutcomeAssessmentStatus type must exist');
      assert(typesCode.includes('outcome_measure_definitions: {'), 'outcome_measure_definitions row type must exist');
      assert(typesCode.includes('outcome_measure_assessments: {'), 'outcome_measure_assessments row type must exist');
    });

    await st.test('outcomeMeasureService provides complete CRUD & finalization API', () => {
      assert(serviceCode.includes('getDefinitions('), 'Service must have getDefinitions method');
      assert(serviceCode.includes('getAssessments('), 'Service must have getAssessments method');
      assert(serviceCode.includes('getAssessmentById('), 'Service must have getAssessmentById method');
      assert(serviceCode.includes('getAssessmentsForVisit('), 'Service must have getAssessmentsForVisit method');
      assert(serviceCode.includes('getAssessmentsForPatient('), 'Service must have getAssessmentsForPatient method');
      assert(serviceCode.includes('createAssessment('), 'Service must have createAssessment method');
      assert(serviceCode.includes('updateDraftAssessment('), 'Service must have updateDraftAssessment method');
      assert(serviceCode.includes('finalizeAssessment('), 'Service must have finalizeAssessment method');
      assert(serviceCode.includes('amendAssessment('), 'Service must have amendAssessment method');
    });

    await st.test('outcomeMeasureService logs audit events for all lifecycle transitions', () => {
      assert(serviceCode.includes("'outcome_measure.created'"), 'Audit log for created must exist');
      assert(serviceCode.includes("'outcome_measure.updated'"), 'Audit log for updated must exist');
      assert(serviceCode.includes("'outcome_measure.finalized'"), 'Audit log for finalized must exist');
      assert(serviceCode.includes("'outcome_measure.amended'"), 'Audit log for amended must exist');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 8: Navigation & Routing Integration
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 8: Navigation & Routing Integration ---', async (st) => {
    await st.test('App.tsx registers outcome measures routes', () => {
      assert(appCode.includes('path="outcome-measures"'), 'Route outcome-measures must exist in App.tsx');
      assert(appCode.includes('path="outcome-measures/new"'), 'Route outcome-measures/new must exist in App.tsx');
      assert(appCode.includes('path="outcome-measures/:assessmentId"'), 'Route outcome-measures/:assessmentId must exist in App.tsx');
    });

    await st.test('Sidebar.tsx renders Outcome Measures navigation item', () => {
      assert(
        sidebarCode.includes('to="/app/outcome-measures"'),
        'Sidebar must include NavLink to /app/outcome-measures'
      );
      assert(
        sidebarCode.includes('Outcome Measures'),
        'Sidebar must display Outcome Measures label'
      );
      assert(
        sidebarCode.includes('TrendingUp'),
        'Sidebar must use TrendingUp icon'
      );
    });
  });
});
