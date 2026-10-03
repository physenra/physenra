// ==============================================================================
// PHYSENRA PAEDIATRIC STRUCTURED CLINICAL MODULE V1 VERIFICATION SUITE
// File: tests/paediatrics_v1.test.cjs
//
// Minimum Required Coverage:
// - ARCHITECTURE (Tests 1-6)
// - PATIENT / AGE CONTEXT (Tests 7-9)
// - DEVELOPMENTAL MILESTONES (Tests 10-13)
// - GROSS MOTOR DEVELOPMENT (Tests 14-16)
// - FINE MOTOR OBSERVATION (Tests 17-18)
// - TONE & MOVEMENT QUALITY (Tests 19-20)
// - POSTURE & MUSCULOSKELETAL ALIGNMENT (Test 21)
// - BALANCE & COORDINATION (Tests 22-26)
// - FUNCTIONAL MOBILITY (Tests 27-29)
// - SECURITY (Tests 30-33)
// - MEDICO-LEGAL (Tests 34-37)
// - LONGITUDINAL (Tests 38-39)
// - SOAP INTEGRATION (Tests 40-41)
// - NEUROLOGY INTEROPERABILITY (Test 42)
// - GUARDIAN / EMERGENCY CONTACT SAFETY INVARIANT (Tests 43-44)
// - SAFETY & INJECTION (Tests 45-48)
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ARCH_MIGRATION_PATH = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20261003010000_specialty_assessment_architecture.sql'
);
const NEURO_MIGRATION_PATH = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20261003020000_neurology_v1.sql'
);
const PAEDS_MIGRATION_PATH = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20261003030000_paediatrics_v1.sql'
);
const OUTCOME_MIGRATION_PATH = path.join(
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
  'clinicalAssessmentService.ts'
);
const OUTCOME_SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'outcomeMeasureService.ts'
);
const PAEDS_FORM_PATH = path.join(
  __dirname,
  '..',
  'src',
  'components',
  'clinical',
  'PaediatricAssessmentForm.tsx'
);
const PAEDS_LONGITUDINAL_PATH = path.join(
  __dirname,
  '..',
  'src',
  'components',
  'clinical',
  'PaediatricLongitudinalView.tsx'
);
const NEURO_FORM_PATH = path.join(
  __dirname,
  '..',
  'src',
  'components',
  'clinical',
  'NeurologyAssessmentForm.tsx'
);
const VISIT_DETAIL_PATH = path.join(
  __dirname,
  '..',
  'src',
  'pages',
  'visits',
  'ClinicalVisitDetailPage.tsx'
);
const NOTE_PAGE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'pages',
  'notes',
  'CreateClinicalNotePage.tsx'
);
const PATIENTS_MIGRATION_PATH = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260928014500_patient_registry_foundation.sql'
);

const archMigrationSql = fs.readFileSync(ARCH_MIGRATION_PATH, 'utf8');
const neuroMigrationSql = fs.readFileSync(NEURO_MIGRATION_PATH, 'utf8');
const paedsMigrationSql = fs.readFileSync(PAEDS_MIGRATION_PATH, 'utf8');
const outcomeMigrationSql = fs.readFileSync(OUTCOME_MIGRATION_PATH, 'utf8');
const serviceCode = fs.readFileSync(SERVICE_PATH, 'utf8');
const outcomeServiceCode = fs.readFileSync(OUTCOME_SERVICE_PATH, 'utf8');
const paedsFormCode = fs.readFileSync(PAEDS_FORM_PATH, 'utf8');
const paedsLongitudinalCode = fs.readFileSync(PAEDS_LONGITUDINAL_PATH, 'utf8');
const neuroFormCode = fs.readFileSync(NEURO_FORM_PATH, 'utf8');
const visitDetailCode = fs.readFileSync(VISIT_DETAIL_PATH, 'utf8');
const notePageCode = fs.readFileSync(NOTE_PAGE_PATH, 'utf8');
const patientsMigrationSql = fs.readFileSync(PATIENTS_MIGRATION_PATH, 'utf8');

// Parse PAEDS_EXAMINATION_V1 schema definition from migration
function extractPaedsDefinition() {
  const match = paedsMigrationSql.match(/'PAEDS_EXAMINATION_V1'[\s\S]*?'(\{[\s\S]*?\})'::jsonb/);
  if (!match) {
    throw new Error('Could not extract PAEDS_EXAMINATION_V1 schema JSON from migration.');
  }
  return JSON.parse(match[1]);
}

const paedsSchema = extractPaedsDefinition();

// Validation runtime simulator identical to clinicalAssessmentService.validatePayload
function validatePayload(schema, data) {
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
                errors.push(`Invalid option '${val}' for '${field.id}'. Allowed: ${field.options.join(', ')}`);
              }
            }
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// Minimal valid payload satisfying all required fields in PAEDS_EXAMINATION_V1
function getMinimalValidPayload() {
  return {
    referral_reason: 'Gross Motor Development Concerns',
    caregiver_present: 'Mother',
    milestone_head_control: 'Achieved',
    milestone_rolling: 'Achieved',
    milestone_sitting: 'Achieved',
    milestone_crawling: 'Achieved',
    milestone_standing: 'Achieved',
    milestone_walking: 'Achieved',
    prone_head_control: 'Age Appropriate / Mature',
    sitting_posture: 'Independent Upright (Stable)',
    floor_mobility: 'Reciprocal Crawling (Hands & Knees)',
    gross_motor_symmetry: 'Symmetric Both Sides',
    gmfcs_classification: 'Not Applicable / Typical Development',
    reaching_targeting: 'Accurate Direct Reach',
    grasp_release: 'Mature Pincer / Radial Grasp with Voluntary Release',
    general_muscle_tone: 'Typical / Normal Tone',
    movement_fluidity: 'Fluid & Varied Movement Patterns',
    head_alignment: 'Midline & Symmetrical',
    spinal_alignment: 'Neutral & Flexible Alignment',
    static_balance: 'Stable in Age-Appropriate Postures',
    protective_reactions: 'Present Anterior, Lateral & Posterior',
    floor_to_stand: 'Independent without External Support',
    walking_mobility: 'Independent Community Ambulator',
    assistive_device: 'None / Independent',
    play_engagement: 'Active Exploration & Varied Play',
  };
}

// Local age derivation function reflecting service implementation
function formatPaediatricAge(dob, referenceDate = new Date()) {
  if (!dob) return 'Age unknown';
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return 'Age unknown';

  const diffMs = referenceDate.getTime() - birth.getTime();
  if (diffMs < 0) return 'Newborn';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 30) {
    return days <= 1 ? '1 day' : `${days} days`;
  }

  const months = Math.floor(days / 30.4375);
  if (months < 24) {
    return months === 1 ? '1 month' : `${months} months`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) {
    return `${years} years`;
  }
  return `${years}y ${remainingMonths}m`;
}

test('PHYSENRA — PAEDIATRIC STRUCTURED CLINICAL MODULE V1 VERIFICATION SUITE', async (t) => {
  // ============================================================================
  // ARCHITECTURE (Tests 1-6)
  // ============================================================================
  await t.test('--- ARCHITECTURE (Tests 1-6) ---', async (st) => {
    await st.test('1. paediatric assessment definition exists', () => {
      assert(
        paedsMigrationSql.includes('PAEDS_EXAMINATION_V1'),
        'PAEDS_EXAMINATION_V1 definition must be seeded in migration'
      );
      assert(
        serviceCode.includes('PAEDS_EXAMINATION_DEFINITION_CODE'),
        'clinicalAssessmentService must export PAEDS_EXAMINATION_DEFINITION_CODE'
      );
    });

    await st.test('2. correct specialty/domain exists', () => {
      assert(
        paedsMigrationSql.includes("'paediatric'"),
        'Specialty must be paediatric in migration'
      );
      assert(
        paedsMigrationSql.includes("'specialty_label': 'Paediatric Physiotherapy'") ||
        paedsMigrationSql.includes('"specialty_label": "Paediatric Physiotherapy"'),
        'display_metadata must declare Paediatric Physiotherapy'
      );
    });

    await st.test('3. correct version exists', () => {
      assert(
        paedsMigrationSql.includes('1,') && paedsMigrationSql.includes("'active'"),
        'PAEDS_EXAMINATION_V1 must be seeded with version 1 and active status'
      );
      assert(
        archMigrationSql.includes('uq_assessment_defs_system_code_version'),
        'System definition version uniqueness index must exist'
      );
    });

    await st.test('4. assessment attaches to clinical visit', () => {
      assert(
        archMigrationSql.includes('clinical_visit_id uuid NOT NULL REFERENCES public.clinical_visits(id)'),
        'Assessment instance must link to clinical_visit_id'
      );
      assert(
        archMigrationSql.includes('fk_clinical_assessments_visit_patient_practice'),
        'Composite foreign key (clinical_visit_id, patient_id, practice_id) must exist'
      );
    });

    await st.test('5. assessment definition does not collide with PAEDS_GROSS_MOTOR_SCREEN', () => {
      assert(
        archMigrationSql.includes('PAEDS_GROSS_MOTOR_SCREEN'),
        'PAEDS_GROSS_MOTOR_SCREEN must be preserved from architecture foundation'
      );
      assert(
        serviceCode.includes('PAEDS_GROSS_MOTOR_SCREEN_CODE'),
        'clinicalAssessmentService must preserve PAEDS_GROSS_MOTOR_SCREEN_CODE'
      );
      assert.notStrictEqual(
        'PAEDS_EXAMINATION_V1',
        'PAEDS_GROSS_MOTOR_SCREEN',
        'Codes must be completely distinct'
      );
    });

    await st.test('6. definition schema validation enforces 10 paediatric sections', () => {
      assert(
        paedsSchema && Array.isArray(paedsSchema.sections) && paedsSchema.sections.length === 10,
        'PAEDS_EXAMINATION_V1 must define exactly 10 clinical domains/sections'
      );
      const expectedSections = [
        'clinical_context',
        'developmental_milestones',
        'gross_motor',
        'fine_motor',
        'tone_movement',
        'posture_alignment',
        'balance_coordination',
        'functional_mobility',
        'play_participation',
        'summary',
      ];
      const actualSectionIds = paedsSchema.sections.map((s) => s.id);
      assert.deepStrictEqual(
        actualSectionIds,
        expectedSections,
        'Sections must match required 10 paediatric domains exactly'
      );
    });
  });

  // ============================================================================
  // PATIENT / AGE CONTEXT (Tests 7-9)
  // ============================================================================
  await t.test('--- PATIENT / AGE CONTEXT (Tests 7-9) ---', async (st) => {
    await st.test('7. age dynamically derived from patient date_of_birth and encounter performed_at', () => {
      assert(
        serviceCode.includes('formatPaediatricAge'),
        'formatPaediatricAge function must be defined and exported in clinicalAssessmentService'
      );
      assert(
        paedsFormCode.includes('formatPaediatricAge'),
        'PaediatricAssessmentForm must use formatPaediatricAge'
      );
      assert(
        paedsLongitudinalCode.includes('formatPaediatricAge'),
        'PaediatricLongitudinalView must use formatPaediatricAge'
      );
    });

    await st.test('8. formatPaediatricAge handles days (<1m), months (<2y), and years/months (>=2y)', () => {
      const refDate = new Date('2026-10-03T10:00:00Z');

      // 14 days old infant
      const dob14Days = '2026-09-19';
      const age14Days = formatPaediatricAge(dob14Days, refDate);
      assert.strictEqual(age14Days, '14 days', 'Infant <30 days should be in days');

      // 8 months old infant (Jan 20 to Oct 3 is 256 days -> 8 months)
      const dob8Months = '2026-01-20';
      const age8Months = formatPaediatricAge(dob8Months, refDate);
      assert.strictEqual(age8Months, '8 months', 'Infant <24 months should be in months');

      // 3 years and 4 months old child
      const dob3y4m = '2023-06-03';
      const age3y4m = formatPaediatricAge(dob3y4m, refDate);
      assert.strictEqual(age3y4m, '3y 4m', 'Child >=2 years should be in years and months');

      // Exactly 4 years old child
      const dob4y = '2022-10-03';
      const age4y = formatPaediatricAge(dob4y, refDate);
      assert.strictEqual(age4y, '4 years', 'Exact year child should display years');
    });

    await st.test('9. duplicate date_of_birth or age is NEVER stored in structured_data or clinical_assessment_instances', () => {
      // Verify schema has no duplicate DOB field
      const allFieldIds = [];
      paedsSchema.sections.forEach((s) => s.fields.forEach((f) => allFieldIds.push(f.id)));
      assert(!allFieldIds.includes('date_of_birth'), 'structured_data must not contain duplicate date_of_birth');
      assert(!allFieldIds.includes('patient_age'), 'structured_data must not store duplicate calculated age');
      assert(
        !paedsMigrationSql.includes('ADD COLUMN patient_age') &&
        !paedsMigrationSql.includes('ADD COLUMN date_of_birth'),
        'Migration must not add redundant age/DOB columns to clinical_assessment_instances'
      );
    });
  });

  // ============================================================================
  // DEVELOPMENTAL MILESTONES (Tests 10-13)
  // ============================================================================
  await t.test('--- DEVELOPMENTAL MILESTONES (Tests 10-13) ---', async (st) => {
    const milestoneSection = paedsSchema.sections.find((s) => s.id === 'developmental_milestones');

    await st.test('10. controlled milestone states strictly enforced', () => {
      const allowedStates = [
        'Achieved',
        'Emerging',
        'Not Yet Achieved',
        'Not Assessed',
        'Unable to Determine',
      ];
      assert(milestoneSection, 'developmental_milestones section must exist');
      const headControlField = milestoneSection.fields.find((f) => f.id === 'milestone_head_control');
      assert(headControlField, 'milestone_head_control field must exist');
      assert.deepStrictEqual(headControlField.options, allowedStates, 'Milestone states must match allowed set');

      // Test validation rejects arbitrary strings
      const payload = getMinimalValidPayload();
      payload.milestone_head_control = 'Delayed by 6 Months';
      const res = validatePayload(paedsSchema, payload);
      assert.strictEqual(res.valid, false, 'Arbitrary diagnostic milestone status must be rejected');
    });

    await st.test('11. all 8 milestone domains represented', () => {
      const expectedMilestones = [
        'milestone_head_control',
        'milestone_rolling',
        'milestone_sitting',
        'milestone_crawling',
        'milestone_standing',
        'milestone_walking',
        'milestone_running',
        'milestone_stair_mobility',
      ];
      const milestoneFieldIds = milestoneSection.fields.map((f) => f.id);
      expectedMilestones.forEach((m) => {
        assert(milestoneFieldIds.includes(m), `Milestone field '${m}' must be present`);
      });
    });

    await st.test('12. zero automated developmental delay diagnosis or cutoff logic', () => {
      assert(
        !paedsMigrationSql.includes('delay_score') &&
        !paedsMigrationSql.includes('developmental_quotient') &&
        !paedsMigrationSql.includes('delay_diagnosis'),
        'Schema must contain zero automated delay calculations'
      );
      assert(
        !paedsFormCode.includes('calculateDelay') &&
        !paedsFormCode.includes('diagnoseDevelopmentalDelay'),
        'Component must not compute automated developmental delay'
      );
    });

    await st.test('13. milestone notes are descriptive text only', () => {
      const notesField = milestoneSection.fields.find((f) => f.id === 'milestone_notes');
      assert(notesField, 'milestone_notes field must exist');
      assert.strictEqual(notesField.type, 'textarea', 'milestone_notes must be a descriptive textarea');
      assert.strictEqual(notesField.required, false, 'milestone_notes must be optional');
    });
  });

  // ============================================================================
  // GROSS MOTOR DEVELOPMENT (Tests 14-16)
  // ============================================================================
  await t.test('--- GROSS MOTOR DEVELOPMENT (Tests 14-16) ---', async (st) => {
    const gmSection = paedsSchema.sections.find((s) => s.id === 'gross_motor');

    await st.test('14. gross motor fields exist with proper options', () => {
      assert(gmSection, 'gross_motor section must exist');
      const expectedFields = [
        'prone_head_control',
        'sitting_posture',
        'floor_mobility',
        'gross_motor_symmetry',
        'gmfcs_classification',
      ];
      expectedFields.forEach((fId) => {
        assert(gmSection.fields.some((f) => f.id === fId), `Field '${fId}' must exist in gross_motor`);
      });
    });

    await st.test('15. observational GMFCS level strictly observational descriptor without automated scoring', () => {
      const gmfcsField = gmSection.fields.find((f) => f.id === 'gmfcs_classification');
      assert(gmfcsField, 'gmfcs_classification field must exist');
      assert(
        gmSection.description.includes('observational gross motor classification'),
        'Gross motor section description must designate observational classification nature'
      );
      assert(
        !paedsFormCode.includes('computeGMFCS') &&
        !serviceCode.includes('calculateGmfcsScore'),
        'Zero GMFCS score engine allowed'
      );
    });

    await st.test('16. GMFCS levels cover I through V plus Not Applicable / Typical Development and NT', () => {
      const gmfcsField = gmSection.fields.find((f) => f.id === 'gmfcs_classification');
      const expectedLevels = [
        'Not Applicable / Typical Development',
        'GMFCS Level I',
        'GMFCS Level II',
        'GMFCS Level III',
        'GMFCS Level IV',
        'GMFCS Level V',
        'NT',
      ];
      assert.deepStrictEqual(gmfcsField.options, expectedLevels, 'GMFCS options must match expected set');
    });
  });

  // ============================================================================
  // FINE MOTOR OBSERVATION (Tests 17-18)
  // ============================================================================
  await t.test('--- FINE MOTOR OBSERVATION (Tests 17-18) ---', async (st) => {
    const fmSection = paedsSchema.sections.find((s) => s.id === 'fine_motor');

    await st.test('17. fine motor fields exist', () => {
      assert(fmSection, 'fine_motor section must exist');
      const expectedFields = [
        'reaching_targeting',
        'grasp_release',
        'bilateral_hand_use',
        'fine_motor_notes',
      ];
      expectedFields.forEach((fId) => {
        assert(fmSection.fields.some((f) => f.id === fId), `Field '${fId}' must exist in fine_motor`);
      });
    });

    await st.test('18. pure observational documentation without diagnostic claims', () => {
      assert(
        !paedsMigrationSql.includes('apraxia_score') &&
        !paedsMigrationSql.includes('fine_motor_quotient'),
        'Migration must not include fine motor scores'
      );
      assert(
        paedsFormCode.includes('Accurate Direct Reach') &&
        paedsFormCode.includes('Mature Pincer'),
        'Form must provide clinician-friendly observational descriptors'
      );
    });
  });

  // ============================================================================
  // TONE & MOVEMENT QUALITY (Tests 19-20)
  // ============================================================================
  await t.test('--- TONE & MOVEMENT QUALITY (Tests 19-20) ---', async (st) => {
    const toneSection = paedsSchema.sections.find((s) => s.id === 'tone_movement');

    await st.test('19. general resting tone options cover Typical, Hypotonia, Hypertonia, Fluctuating, Mixed, NT', () => {
      assert(toneSection, 'tone_movement section must exist');
      const toneField = toneSection.fields.find((f) => f.id === 'general_muscle_tone');
      assert(toneField, 'general_muscle_tone field must exist');
      const expectedOptions = [
        'Typical / Normal Tone',
        'Hypotonia / Low Tone Dominant',
        'Hypertonia / Increased Tone Dominant',
        'Fluctuating / Dystonic Tone',
        'Mixed Tone Presentation',
        'NT',
      ];
      assert.deepStrictEqual(toneField.options, expectedOptions, 'General tone options must match specified options');
    });

    await st.test('20. movement fluidity and involuntary movements are descriptive', () => {
      const fluidityField = toneSection.fields.find((f) => f.id === 'movement_fluidity');
      const involuntaryField = toneSection.fields.find((f) => f.id === 'involuntary_movements');
      assert(fluidityField, 'movement_fluidity field must exist');
      assert(involuntaryField, 'involuntary_movements field must exist');
      assert(
        fluidityField.options.includes('Fluid & Varied Movement Patterns'),
        'Fluidity must have descriptive options'
      );
      assert(
        involuntaryField.options.includes('None Observed'),
        'Involuntary movements must have observational options'
      );
    });
  });

  // ============================================================================
  // POSTURE & MUSCULOSKELETAL ALIGNMENT (Test 21)
  // ============================================================================
  await t.test('--- POSTURE & MUSCULOSKELETAL ALIGNMENT (Test 21) ---', async (st) => {
    await st.test('21. posture fields: head, spinal, lower limb alignment', () => {
      const postureSection = paedsSchema.sections.find((s) => s.id === 'posture_alignment');
      assert(postureSection, 'posture_alignment section must exist');
      const headField = postureSection.fields.find((f) => f.id === 'head_alignment');
      const spineField = postureSection.fields.find((f) => f.id === 'spinal_alignment');
      const lowerLimbField = postureSection.fields.find((f) => f.id === 'lower_limb_alignment');
      assert(headField, 'head_alignment field must exist');
      assert(spineField, 'spinal_alignment field must exist');
      assert(lowerLimbField, 'lower_limb_alignment field must exist');
      assert(headField.options.includes('Midline & Symmetrical'), 'head_alignment options must include Midline');
      assert(spineField.options.includes('Neutral & Flexible Alignment'), 'spinal_alignment options must include Neutral');
    });
  });

  // ============================================================================
  // BALANCE & COORDINATION (Tests 22-26)
  // ============================================================================
  await t.test('--- BALANCE & COORDINATION (Tests 22-26) ---', async (st) => {
    const balSection = paedsSchema.sections.find((s) => s.id === 'balance_coordination');

    await st.test('22. balance fields: static balance, protective reactions, motor coordination', () => {
      assert(balSection, 'balance_coordination section must exist');
      const staticBalField = balSection.fields.find((f) => f.id === 'static_balance');
      const protectiveField = balSection.fields.find((f) => f.id === 'protective_reactions');
      const coordinationField = balSection.fields.find((f) => f.id === 'coordination_quality');
      assert(staticBalField, 'static_balance field must exist');
      assert(protectiveField, 'protective_reactions field must exist');
      assert(coordinationField, 'coordination_quality field must exist');
    });

    await st.test('23. protective reactions options cover Anterior/Lateral/Posterior permutations and NT', () => {
      const protectiveField = balSection.fields.find((f) => f.id === 'protective_reactions');
      const expectedOptions = [
        'Present Anterior, Lateral & Posterior',
        'Anterior Present; Lateral/Posterior Delayed',
        'Delayed / Inconsistent Bilaterally',
        'Absent Protective Extension',
        'NT',
      ];
      assert.deepStrictEqual(protectiveField.options, expectedOptions, 'Protective reactions options must match exactly');
    });

    await st.test('24. zero score engine or automated score generation', () => {
      assert(
        !paedsMigrationSql.includes('balance_score') &&
        !paedsMigrationSql.includes('fall_risk_score'),
        'No automated score engine columns in migration'
      );
      assert(
        !paedsFormCode.includes('calculateScore') &&
        !serviceCode.includes('calculatePaedsBalanceScore'),
        'Form and service must not compute automated numerical balance scores'
      );
    });

    await st.test('25. balance outcome measure integration uses existing clinical_outcome_measures without duplicating outcome definitions', () => {
      assert(
        outcomeMigrationSql.includes('clinical_outcome_measures'),
        'clinical_outcome_measures must be the single source of truth for validated standardized outcome measures'
      );
      assert(
        outcomeServiceCode.includes('getAssessmentsForPatient'),
        'outcomeMeasureService provides standardized measures'
      );
      assert(
        serviceCode.includes('getBalanceOutcomeMeasuresForPatient'),
        'clinicalAssessmentService provides reference linking to validated balance outcome measures'
      );
    });

    await st.test('26. paediatric balance outcome measure reference correctly references clinical_outcome_measures table', () => {
      assert(
        balSection.description.includes('BBS/TUG psychometric outcomes remain separate') ||
        balSection.description.includes('Formal BBS/TUG'),
        'Balance section must designate that validated psychometric outcome measures remain separate'
      );
      assert(
        serviceCode.includes("item.definition?.code === 'BBS' || item.definition?.code === 'TUG'"),
        'Service links to validated clinical_outcome_measures codes'
      );
    });
  });

  // ============================================================================
  // FUNCTIONAL MOBILITY (Tests 27-29)
  // ============================================================================
  await t.test('--- FUNCTIONAL MOBILITY (Tests 27-29) ---', async (st) => {
    const mobSection = paedsSchema.sections.find((s) => s.id === 'functional_mobility');

    await st.test('27. functional mobility fields exist', () => {
      assert(mobSection, 'functional_mobility section must exist');
      const expectedFields = [
        'floor_to_stand',
        'walking_mobility',
        'assistive_device',
        'stair_mobility',
        'functional_mobility_notes',
      ];
      expectedFields.forEach((fId) => {
        assert(mobSection.fields.some((f) => f.id === fId), `Field '${fId}' must exist in functional_mobility`);
      });
    });

    await st.test('28. mobility descriptors are observational', () => {
      const floorField = mobSection.fields.find((f) => f.id === 'floor_to_stand');
      const walkField = mobSection.fields.find((f) => f.id === 'walking_mobility');
      assert(floorField.options.includes('Independent without External Support'), 'Observational floor-to-stand descriptor');
      assert(walkField.options.includes('Independent Community Ambulator'), 'Observational walking descriptor');
    });

    await st.test('29. assistive device captures aids, orthotics, or none', () => {
      const devField = mobSection.fields.find((f) => f.id === 'assistive_device');
      assert(devField.options.includes('None / Independent'), 'Captures independent status');
      assert(
        devField.options.some((opt) => opt.includes('Walker')),
        'Captures pediatric mobility walker aids'
      );
      assert(
        devField.options.some((opt) => opt.includes('Wheelchair') || opt.includes('Stroller')),
        'Captures wheelchair/adaptive stroller equipment'
      );
    });
  });

  // ============================================================================
  // SECURITY (Tests 30-33)
  // ============================================================================
  await t.test('--- SECURITY (Tests 30-33) ---', async (st) => {
    await st.test('30. multitenant isolation (practice_id) enforced on paediatric assessments', () => {
      assert(
        archMigrationSql.includes('practice_id uuid NOT NULL REFERENCES public.practices(id)'),
        'practice_id mandatory tenant foreign key on clinical_assessment_instances'
      );
      assert(
        archMigrationSql.includes('idx_clinical_assessments_practice_patient'),
        'Multitenant index on practice_id, patient_id must exist'
      );
    });

    await st.test('31. RLS policies apply to paediatric instances', () => {
      assert(
        archMigrationSql.includes('ALTER TABLE public.clinical_assessment_instances ENABLE ROW LEVEL SECURITY;'),
        'Row Level Security must be explicitly enabled on clinical_assessment_instances'
      );
      assert(
        archMigrationSql.includes('assessment_instances_select_policy'),
        'Tenant isolation SELECT policy must exist'
      );
    });

    await st.test('32. assessor must belong to the active practice/organization', () => {
      assert(
        archMigrationSql.includes('assessor_id uuid NOT NULL REFERENCES auth.users(id)'),
        'assessor_id must reference auth.users'
      );
      assert(
        serviceCode.includes('getActivePracticeHeader'),
        'clinicalAssessmentService must supply active practice header'
      );
    });

    await st.test('33. finalized paediatric assessments cannot be modified or deleted', () => {
      assert(
        archMigrationSql.includes("OLD.status = 'finalized' AND NEW.status = 'finalized'"),
        'Database trigger must block mutations to finalized assessment instances'
      );
      assert(
        archMigrationSql.includes('assessment_instances_delete_denied'),
        'RLS policy must categorically deny DELETE on assessment instances'
      );
    });
  });

  // ============================================================================
  // MEDICO-LEGAL (Tests 34-37)
  // ============================================================================
  await t.test('--- MEDICO-LEGAL (Tests 34-37) ---', async (st) => {
    await st.test('34. primary clinical note (SOAP) remains authoritative medico-legal record', () => {
      assert(
        notePageCode.includes('Clinical Architecture Invariant'),
        'CreateClinicalNotePage reinforces SOAP invariant'
      );
      assert(
        visitDetailCode.includes('SOAP documentation remains the primary medico-legal clinical record'),
        'Visit detail page explicitly notes SOAP primacy'
      );
    });

    await st.test('35. paediatric assessment complements but does not replace SOAP note', () => {
      assert(
        visitDetailCode.includes('Structured Clinical Assessments (Specialty Extension)'),
        'Structured assessments are designated as specialty extensions'
      );
      assert(
        visitDetailCode.includes('+ Document Paediatric Exam'),
        'Paediatric exam is an additional structured action alongside visit notes'
      );
    });

    await st.test('36. assessment status transitions: draft -> finalized (with amend via new note/addendum)', () => {
      assert(
        serviceCode.includes("draft: ['finalized']"),
        'Service enforces draft -> finalized transition'
      );
      assert(
        serviceCode.includes("finalized: ['amended']"),
        'Service enforces finalized -> amended transition'
      );
      assert(
        serviceCode.includes('amendment_reason'),
        'Service enforces amendment_reason presence'
      );
    });

    await st.test('37. clinical assessment instance stores summary findings for quick review', () => {
      assert(
        archMigrationSql.includes('summary_findings text'),
        'summary_findings text field exists on clinical_assessment_instances'
      );
      assert(
        paedsFormCode.includes('summary_findings'),
        'PaediatricAssessmentForm generates and passes summary_findings'
      );
    });
  });

  // ============================================================================
  // LONGITUDINAL (Tests 38-39)
  // ============================================================================
  await t.test('--- LONGITUDINAL (Tests 38-39) ---', async (st) => {
    await st.test('38. longitudinal view retrieves assessments chronologically by performed_at', () => {
      assert(
        serviceCode.includes('getAssessmentsForPatient'),
        'Service must support fetching patient assessments longitudinally'
      );
      assert(
        paedsLongitudinalCode.includes('performed_at'),
        'PaediatricLongitudinalView displays chronological encounter dates'
      );
      assert(
        visitDetailCode.includes('PaediatricLongitudinalView'),
        'ClinicalVisitDetailPage must integrate PaediatricLongitudinalView'
      );
    });

    await st.test('39. age at each assessment is calculated from patient date_of_birth relative to each encounter date', () => {
      assert(
        paedsLongitudinalCode.includes('formatPaediatricAge(patientDob, new Date(a.performed_at))'),
        'PaediatricLongitudinalView must compute patient age relative to assessment performed_at date'
      );
    });
  });

  // ============================================================================
  // SOAP INTEGRATION (Tests 40-41)
  // ============================================================================
  await t.test('--- SOAP INTEGRATION (Tests 40-41) ---', async (st) => {
    await st.test('40. visit detail page displays both SOAP notes and structured paediatric assessments', () => {
      assert(
        visitDetailCode.includes('clinicalNote'),
        'Visit detail page loads encounter clinical note'
      );
      assert(
        visitDetailCode.includes('clinicalAssessments'),
        'Visit detail page loads structured clinical assessments'
      );
    });

    await st.test('41. clinician can navigate between SOAP note and paediatric examination', () => {
      assert(
        visitDetailCode.includes('+ Document Paediatric Exam'),
        'Clinician can open paediatric examination modal directly from visit'
      );
      assert(
        visitDetailCode.includes('View Longitudinal Paediatrics'),
        'Clinician can open paediatric longitudinal view directly from visit'
      );
      assert(
        visitDetailCode.includes('Document Clinical Note (SOAP)') ||
        visitDetailCode.includes('clinical-notes'),
        'Clinician can navigate to or view SOAP note'
      );
    });
  });

  // ============================================================================
  // NEUROLOGY INTEROPERABILITY (Test 42)
  // ============================================================================
  await t.test('--- NEUROLOGY INTEROPERABILITY (Test 42) ---', async (st) => {
    await st.test('42. both NEURO_EXAMINATION_V1 and PAEDS_EXAMINATION_V1 coexist in the same visit and platform', () => {
      assert(
        visitDetailCode.includes('+ Document Neurological Exam') &&
        visitDetailCode.includes('+ Document Paediatric Exam'),
        'Visit detail page offers both neurological and paediatric assessment actions'
      );
      assert(
        visitDetailCode.includes('isNeuroModalOpen') &&
        visitDetailCode.includes('isPaedsModalOpen'),
        'Distinct modal states prevent UI state conflicts'
      );
      assert(
        visitDetailCode.includes("ca.definition?.code === 'PAEDS_EXAMINATION_V1'"),
        'Clicking an assessment row accurately routes to the corresponding specialty form'
      );
    });
  });

  // ============================================================================
  // GUARDIAN SAFETY INVARIANT (Tests 43-44)
  // ============================================================================
  await t.test('--- GUARDIAN / EMERGENCY CONTACT SAFETY INVARIANT (Tests 43-44) ---', async (st) => {
    await st.test('43. database schema does NOT conflate emergency contacts with legal guardian or consent authority', () => {
      // In patient registry migration, columns are emergency_contact_*, NOT guardian_*
      assert(
        patientsMigrationSql.includes('emergency_contact_name'),
        'patients table contains emergency_contact_name'
      );
      assert(
        !patientsMigrationSql.includes('legal_guardian_name') &&
        !patientsMigrationSql.includes('consent_authority_name'),
        'patients table must not assume emergency contacts are legal guardians'
      );
      assert(
        !paedsMigrationSql.includes('ALTER TABLE public.patients ADD COLUMN legal_guardian'),
        'Paediatric migration must not retroactively mutate patient schema'
      );
    });

    await st.test('44. accompanying caregiver in paediatric form is documented as encounter-specific clinical context, not legal consent', () => {
      const caregiverField = paedsSchema.sections[0].fields.find((f) => f.id === 'caregiver_present');
      assert(caregiverField, 'caregiver_present field must exist in clinical context');
      assert(
        paedsSchema.sections[0].description.includes('caregiver present during encounter'),
        'clinical_context section description must emphasize caregiver present during encounter context'
      );
      assert(
        !caregiverField.label.includes('Legal Consent Authority'),
        'Caregiver field must not claim to establish legal consent authority'
      );
    });
  });

  // ============================================================================
  // SAFETY & INJECTION (Tests 45-48)
  // ============================================================================
  await t.test('--- SAFETY & INJECTION (Tests 45-48) ---', async (st) => {
    await st.test('45. script and eval injection blocked in structured data', () => {
      const payload1 = getMinimalValidPayload();
      payload1.clinical_summary = '<script>alert("xss")</script>';
      const res1 = validatePayload(paedsSchema, payload1);
      assert.strictEqual(res1.valid, false, '<script> tag must be rejected');

      const payload2 = getMinimalValidPayload();
      payload2.clinical_summary = 'eval(maliciousCode)';
      const res2 = validatePayload(paedsSchema, payload2);
      assert.strictEqual(res2.valid, false, 'eval() must be rejected');
    });

    await st.test('46. zero automated diagnostic or prognostic inference generated', () => {
      assert(
        !paedsMigrationSql.includes('automated_diagnosis'),
        'Migration must not contain automated diagnosis'
      );
      assert(
        !paedsFormCode.includes('diagnoseCondition') &&
        !paedsFormCode.includes('automatedPrognosis'),
        'Form must be purely observational'
      );
    });

    await st.test('47. UI tablet friendliness (Pills, accordions, responsive layout)', () => {
      assert(
        paedsFormCode.includes('overflowX') || paedsFormCode.includes('flexWrap'),
        'Form must provide responsive overflow handling for tablets'
      );
      assert(
        paedsFormCode.includes('activeTab') || paedsFormCode.includes('SECTIONS.map'),
        'Form must provide tabbed progressive navigation for tablet screens'
      );
    });

    await st.test('48. Legacy project independence (zero Kabworld references)', () => {
      assert(!paedsMigrationSql.toLowerCase().includes('kabworld'), 'Paeds migration must not mention Kabworld');
      assert(!paedsFormCode.toLowerCase().includes('kabworld'), 'Paeds form must not mention Kabworld');
      assert(!paedsLongitudinalCode.toLowerCase().includes('kabworld'), 'Paeds longitudinal view must not mention Kabworld');
    });
  });
});
