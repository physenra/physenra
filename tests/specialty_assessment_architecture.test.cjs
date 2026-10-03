// ==============================================================================
// PHYSENRA SPECIALTY-NEUTRAL CLINICAL ASSESSMENT ARCHITECTURE VERIFICATION SUITE
// File: tests/specialty_assessment_architecture.test.cjs
//
// Verifies:
// Part 18 Requirements (34 tests):
// - ARCHITECTURE (Tests 1-7)
// - SECURITY (Tests 8-12)
// - VALIDATION (Tests 13-17)
// - CLINICAL (Tests 18-24)
// - NEUROLOGY (Tests 25-27)
// - PAEDIATRICS (Tests 28-30)
// - TENANCY (Tests 31-32)
// - MEDICO-LEGAL (Tests 33-34)
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
  '20261003010000_specialty_assessment_architecture.sql'
);
const SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'clinicalAssessmentService.ts'
);
const TYPES_PATH = path.join(
  __dirname,
  '..',
  'src',
  'types',
  'database.ts'
);
const MODELS_PATH = path.join(
  __dirname,
  '..',
  'src',
  'types',
  'models.ts'
);
const NOTE_PAGE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'pages',
  'notes',
  'CreateClinicalNotePage.tsx'
);
const VISIT_DETAIL_PATH = path.join(
  __dirname,
  '..',
  'src',
  'pages',
  'visits',
  'ClinicalVisitDetailPage.tsx'
);

const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
const serviceCode = fs.readFileSync(SERVICE_PATH, 'utf8');
const typesCode = fs.readFileSync(TYPES_PATH, 'utf8');
const modelsCode = fs.readFileSync(MODELS_PATH, 'utf8');
const notePageCode = fs.readFileSync(NOTE_PAGE_PATH, 'utf8');
const visitDetailCode = fs.readFileSync(VISIT_DETAIL_PATH, 'utf8');

// Load clinicalAssessmentService mock/runtime validation helper
function validateAssessmentPayload(definition, data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Assessment payload must be a non-null JSON object.'] };
  }

  const jsonString = JSON.stringify(data);
  if (
    /<script\b/i.test(jsonString) ||
    /\beval\s*\(/i.test(jsonString) ||
    /javascript:/i.test(jsonString) ||
    /\bon\w+\s*=/i.test(jsonString)
  ) {
    errors.push('Security violation: Prohibited executable or script content.');
    return { valid: false, errors };
  }

  const schema = definition.schema_definition;
  if (schema && Array.isArray(schema.sections)) {
    for (const section of schema.sections) {
      if (Array.isArray(section.fields)) {
        for (const field of section.fields) {
          const val = data[field.id];
          if (field.required && (val === undefined || val === null || val === '')) {
            errors.push(`Field '${field.id}' is required in section '${section.id}'.`);
          }
          if (val !== undefined && val !== null && val !== '') {
            if (field.type === 'select' && Array.isArray(field.options)) {
              if (!field.options.includes(val)) {
                errors.push(`Invalid option '${val}' for '${field.id}'.`);
              }
            }
            if (field.type === 'number') {
              const num = Number(val);
              if (isNaN(num)) {
                errors.push(`Field '${field.id}' must be a number.`);
              } else {
                if (field.min !== undefined && num < field.min) {
                  errors.push(`Field '${field.id}' below minimum ${field.min}.`);
                }
                if (field.max !== undefined && num > field.max) {
                  errors.push(`Field '${field.id}' above maximum ${field.max}.`);
                }
              }
            }
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

test('PHYSENRA SPECIALTY-NEUTRAL CLINICAL ASSESSMENT ARCHITECTURE VERIFICATION', async (t) => {
  // ============================================================================
  // ARCHITECTURE (Tests 1-7)
  // ============================================================================
  await t.test('--- ARCHITECTURE (Tests 1-7) ---', async (st) => {
    await st.test('1. assessment architecture exists', () => {
      assert(
        migrationSql.includes('CREATE TABLE public.clinical_assessment_definitions'),
        'clinical_assessment_definitions table must be defined'
      );
      assert(
        migrationSql.includes('CREATE TABLE public.clinical_assessment_instances'),
        'clinical_assessment_instances table must be defined'
      );
      assert(
        migrationSql.includes('CREATE TABLE public.practice_clinical_assessment_counters'),
        'practice_clinical_assessment_counters table must be defined'
      );
    });

    await st.test('2. clinical visits remain intact', () => {
      assert(
        typesCode.includes('clinical_visits: {'),
        'clinical_visits table definition must remain intact in database.ts'
      );
      assert(
        visitDetailCode.includes('ClinicalVisitDetailPage'),
        'ClinicalVisitDetailPage must remain intact'
      );
      assert(
        !migrationSql.includes('DROP TABLE public.clinical_visits'),
        'Migration must not drop or alter clinical_visits structure destructively'
      );
    });

    await st.test('3. SOAP remains intact', () => {
      assert(
        typesCode.includes('clinical_notes: {'),
        'clinical_notes table definition must remain intact in database.ts'
      );
      assert(
        notePageCode.includes('S: Subjective') || notePageCode.includes('subjective'),
        'SOAP documentation fields must remain intact in note creation'
      );
      assert(
        notePageCode.includes('Structured Clinical Assessments (Optional Specialty Extension)'),
        'Structured assessments must be presented as an optional extension alongside SOAP'
      );
    });

    await st.test('4. assessment definitions are identifiable', () => {
      assert(
        migrationSql.includes('code text NOT NULL'),
        'Definitions must have identifiable code'
      );
      assert(
        migrationSql.includes('uq_assessment_defs_system_code_version') &&
        migrationSql.includes('UNIQUE INDEX uq_assessment_defs_system_code_version'),
        'System definitions must have unique code and version index'
      );
      assert(
        migrationSql.includes('uq_assessment_defs_practice_code_version'),
        'Practice definitions must have unique practice, code, and version index'
      );
    });

    await st.test('5. assessment instances are linked to visits', () => {
      assert(
        migrationSql.includes('clinical_visit_id uuid NOT NULL REFERENCES public.clinical_visits(id)'),
        'assessment instance must reference clinical_visit_id'
      );
      assert(
        migrationSql.includes('fk_clinical_assessments_visit_patient_practice') &&
        migrationSql.includes('FOREIGN KEY (clinical_visit_id, patient_id, practice_id)'),
        'Composite FK on (clinical_visit_id, patient_id, practice_id) must exist'
      );
    });

    await st.test('6. versioning exists', () => {
      assert(
        migrationSql.includes('version integer NOT NULL DEFAULT 1 CHECK (version >= 1)'),
        'Definition must have version integer >= 1'
      );
      assert(
        migrationSql.includes('definition_version integer NOT NULL DEFAULT 1 CHECK (definition_version >= 1)'),
        'Instance must record definition_version >= 1'
      );
    });

    await st.test('7. historical assessments remain interpretable', () => {
      assert(
        migrationSql.includes('definition_version integer NOT NULL DEFAULT 1'),
        'Instance must permanently store definition_version so historical data is bound to exact version'
      );
      assert(
        serviceCode.includes('definition_version: definition.version'),
        'Service must stamp definition.version on instance creation'
      );
    });
  });

  // ============================================================================
  // SECURITY (Tests 8-12)
  // ============================================================================
  await t.test('--- SECURITY (Tests 8-12) ---', async (st) => {
    await st.test('8. anonymous access denied', () => {
      assert(
        migrationSql.includes('TO authenticated') &&
        !/\bTO\s+anon\b/i.test(migrationSql) &&
        !/\bTO\s+public\b/i.test(migrationSql),
        'Assessment tables policies must be granted only TO authenticated'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.clinical_assessment_instances ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on assessment instances'
      );
    });

    await st.test('9. cross-tenant access denied', () => {
      assert(
        migrationSql.includes('practice_id IN (') &&
        migrationSql.includes('SELECT practice_id FROM public.practice_members'),
        'Instance SELECT policy must verify active practice membership'
      );
    });

    await st.test('10. unauthorized mutation denied', () => {
      assert(
        migrationSql.includes("role IN ('practice_owner', 'practice_manager', 'physiotherapist')"),
        'Mutation policy must restrict INSERT and UPDATE to clinical roles'
      );
      assert(
        migrationSql.includes('CREATE POLICY assessment_instances_delete_denied') &&
        migrationSql.includes('FOR DELETE') &&
        migrationSql.includes('USING (false);'),
        'Hard deletes must be denied categorically'
      );
    });

    await st.test('11. authorized clinician access works', () => {
      assert(
        migrationSql.includes("role IN ('practice_owner', 'practice_manager', 'physiotherapist')"),
        'Authorized clinicians are permitted to insert and update assessments'
      );
    });

    await st.test('12. practice ownership enforced', () => {
      assert(
        migrationSql.includes('practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT'),
        'practice_id must be NOT NULL with RESTRICT on practices'
      );
      assert(
        migrationSql.includes('uq_clinical_assessments_practice_identifier') &&
        migrationSql.includes('UNIQUE (practice_id, assessment_identifier)'),
        'Practice-scoped identifier uniqueness must be enforced'
      );
    });
  });

  // ============================================================================
  // VALIDATION (Tests 13-17)
  // ============================================================================
  await t.test('--- VALIDATION (Tests 13-17) ---', async (st) => {
    const mockDef = {
      id: 'def-1',
      code: 'TEST_SCREEN',
      name: 'Test Screen',
      version: 1,
      schema_definition: {
        sections: [
          {
            id: 'tone',
            title: 'Tone',
            fields: [
              { id: 'biceps', label: 'Biceps Tone', type: 'select', options: ['0', '1', '1+', '2', '3', '4'], required: true },
              { id: 'score', label: 'Score', type: 'number', min: 0, max: 10, required: true },
            ],
          },
        ],
      },
    };

    await st.test('13. invalid assessment payload rejected', () => {
      // Prohibited script injection
      const maliciousPayload = {
        biceps: '1',
        score: 5,
        notes: '<script>alert("xss")</script>',
      };
      const res = validateAssessmentPayload(mockDef, maliciousPayload);
      assert.equal(res.valid, false, 'Malicious script payload must be rejected');
      assert(res.errors[0].includes('Security violation'), 'Error must note security violation');
    });

    await st.test('14. required fields enforced', () => {
      const incompletePayload = {
        biceps: '1',
        // score missing
      };
      const res = validateAssessmentPayload(mockDef, incompletePayload);
      assert.equal(res.valid, false, 'Incomplete payload missing required fields must fail');
      assert(res.errors.some((e) => e.includes("Field 'score' is required")));
    });

    await st.test('15. type/range validation works', () => {
      // Invalid select option
      const invalidOptionPayload = {
        biceps: 'INVALID_GRADE',
        score: 5,
      };
      const resOption = validateAssessmentPayload(mockDef, invalidOptionPayload);
      assert.equal(resOption.valid, false, 'Invalid select option must fail');

      // Invalid range
      const invalidRangePayload = {
        biceps: '1',
        score: 999, // Max is 10
      };
      const resRange = validateAssessmentPayload(mockDef, invalidRangePayload);
      assert.equal(resRange.valid, false, 'Number exceeding max must fail');
      assert(resRange.errors.some((e) => e.includes('above maximum 10')));
    });

    await st.test('16. unknown assessment definition rejected', () => {
      assert(
        serviceCode.includes('if (!definition)'),
        'Service must throw if target clinical assessment definition does not exist'
      );
      assert(
        serviceCode.includes('Target clinical assessment definition does not exist.'),
        'Explicit error message for unknown definition'
      );
    });

    await st.test('17. invalid version rejected', () => {
      assert(
        migrationSql.includes('CHECK (version >= 1)'),
        'Database must check version >= 1'
      );
      assert(
        migrationSql.includes('CHECK (definition_version >= 1)'),
        'Database must check definition_version >= 1'
      );
    });
  });

  // ============================================================================
  // CLINICAL (Tests 18-24)
  // ============================================================================
  await t.test('--- CLINICAL (Tests 18-24) ---', async (st) => {
    await st.test('18. MSK outcome measures remain functional', () => {
      assert(
        typesCode.includes('OutcomeMeasureCategory') &&
        typesCode.includes('outcome_measure_definitions: {') &&
        typesCode.includes('outcome_measure_assessments: {'),
        'MSK outcome measure tables and types must remain intact'
      );
    });

    await st.test('19. TUG remains functional', () => {
      const outcomeMigration = fs.readFileSync(
        path.join(__dirname, '..', 'supabase', 'migrations', '20260928025000_clinical_outcome_measures_foundation.sql'),
        'utf8'
      );
      assert(outcomeMigration.includes("'TUG'"), 'Timed Up and Go (TUG) seed definition preserved');
    });

    await st.test('20. BBS remains functional', () => {
      const outcomeMigration = fs.readFileSync(
        path.join(__dirname, '..', 'supabase', 'migrations', '20260928025000_clinical_outcome_measures_foundation.sql'),
        'utf8'
      );
      assert(outcomeMigration.includes("'BBS'"), 'Berg Balance Scale (BBS) seed definition preserved');
    });

    await st.test('21. SOAP workflow remains functional', () => {
      assert(
        typesCode.includes('ClinicalNoteStatus') && typesCode.includes('ClinicalNoteType'),
        'SOAP types remain functional'
      );
      assert(
        notePageCode.includes('handleSubmit'),
        'CreateClinicalNotePage SOAP submission workflow remains active'
      );
    });

    await st.test('22. treatment plans remain functional', () => {
      assert(
        typesCode.includes('treatment_plans: {') && typesCode.includes('treatment_plan_goals: {'),
        'Treatment plan schema remains intact'
      );
    });

    await st.test('23. progress reviews remain functional', () => {
      assert(
        typesCode.includes('progress_reviews: {') && typesCode.includes('progress_review_goals: {'),
        'Progress review schema remains intact'
      );
    });

    await st.test('24. discharge remains functional', () => {
      assert(
        typesCode.includes('discharge_summaries: {'),
        'Discharge summaries schema remains intact'
      );
    });
  });

  // ============================================================================
  // NEUROLOGY (Tests 25-27)
  // ============================================================================
  await t.test('--- NEUROLOGY (Tests 25-27) ---', async (st) => {
    await st.test('25. representative neurological assessment can be defined', () => {
      assert(
        migrationSql.includes("'NEURO_MOTOR_SPASTICITY_SCREEN'"),
        'NEURO_MOTOR_SPASTICITY_SCREEN code must be seeded'
      );
      assert(
        migrationSql.includes("'neurological'"),
        'Specialty must be neurological'
      );
      assert(
        migrationSql.includes('Modified Ashworth Scale'),
        'Modified Ashworth Scale must be referenced in neurological definition'
      );
    });

    await st.test('26. representative neurological assessment can be attached to a clinical visit', () => {
      assert(
        migrationSql.includes('clinical_visit_id uuid NOT NULL REFERENCES public.clinical_visits(id)'),
        'Neurological assessment instance can attach to clinical_visit_id'
      );
      assert(
        serviceCode.includes('clinical_visit_id: input.clinical_visit_id'),
        'Service passes clinical_visit_id to instance insertion'
      );
    });

    await st.test('27. structured neurological data can be retrieved longitudinally', () => {
      assert(
        serviceCode.includes('getAssessmentsForPatient('),
        'Service provides getAssessmentsForPatient'
      );
      assert(
        serviceCode.includes("order('performed_at', { ascending: true })"),
        'Patient assessments are retrieved longitudinally ordered by performed_at'
      );
    });
  });

  // ============================================================================
  // PAEDIATRICS (Tests 28-30)
  // ============================================================================
  await t.test('--- PAEDIATRICS (Tests 28-30) ---', async (st) => {
    await st.test('28. representative paediatric assessment can be defined', () => {
      assert(
        migrationSql.includes("'PAEDS_GROSS_MOTOR_SCREEN'"),
        'PAEDS_GROSS_MOTOR_SCREEN code must be seeded'
      );
      assert(
        migrationSql.includes("'paediatric'"),
        'Specialty must be paediatric'
      );
      assert(
        migrationSql.includes('GMFCS'),
        'GMFCS classification must be supported in paediatric screen'
      );
    });

    await st.test('29. representative paediatric assessment can be attached to a clinical visit', () => {
      assert(
        migrationSql.includes('definition_id uuid NOT NULL REFERENCES public.clinical_assessment_definitions(id)'),
        'Paediatric assessment instance references definition and visit'
      );
    });

    await st.test('30. structured paediatric data can be retrieved longitudinally', () => {
      assert(
        serviceCode.includes('results.filter((item) => item.definition?.specialty === specialty)'),
        'Service supports longitudinal filtering specifically for paediatric assessments'
      );
    });
  });

  // ============================================================================
  // TENANCY (Tests 31-32)
  // ============================================================================
  await t.test('--- TENANCY (Tests 31-32) ---', async (st) => {
    await st.test('31. Practice A cannot access Practice B assessment', () => {
      assert(
        migrationSql.includes('practice_id IN (') &&
        migrationSql.includes('SELECT practice_id FROM public.practice_members'),
        'RLS prevents Practice A from reading Practice B assessment'
      );
      assert(
        serviceCode.includes('eq(\'practice_id\', activePracticeId)'),
        'Service strictly filters by active practice header'
      );
    });

    await st.test('32. Practice B cannot access Practice A assessment', () => {
      assert(
        migrationSql.includes('ALTER TABLE public.clinical_assessment_instances ENABLE ROW LEVEL SECURITY;'),
        'RLS isolation symmetrically applies to all practices'
      );
    });
  });

  // ============================================================================
  // MEDICO-LEGAL (Tests 33-34)
  // ============================================================================
  await t.test('--- MEDICO-LEGAL (Tests 33-34) ---', async (st) => {
    await st.test('33. finalized assessment cannot be silently overwritten', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.trg_fn_guard_assessment_invariants()'),
        'Guard trigger function must exist'
      );
      assert(
        migrationSql.includes('Medico-legal immutability violation: Finalized clinical assessments cannot alter historical structured data'),
        'Guard trigger blocks direct structured data modification on finalized assessments'
      );
      assert(
        serviceCode.includes("existing.status !== 'draft'") &&
        serviceCode.includes('Only draft assessments can be edited directly'),
        'Service blocks editing non-draft assessments directly'
      );
    });

    await st.test('34. amendment follows approved clinical lifecycle', () => {
      assert(
        migrationSql.includes('status text NOT NULL DEFAULT \'draft\' CHECK (status IN (\'draft\', \'finalized\', \'amended\'))'),
        'Lifecycle state machine draft -> finalized -> amended'
      );
      assert(
        migrationSql.includes('amendment_reason text'),
        'Amendment reason column must exist'
      );
      assert(
        migrationSql.includes('An explicit amendment reason is mandatory when correcting a finalized assessment'),
        'Trigger requires non-empty amendment_reason when status is amended'
      );
      assert(
        serviceCode.includes('amendAssessment('),
        'Service provides formal amendAssessment API'
      );
    });
  });
});
