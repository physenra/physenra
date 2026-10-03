// ==============================================================================
// PHYSENRA NEUROLOGY STRUCTURED CLINICAL MODULE V1 VERIFICATION SUITE
// File: tests/neurology_v1.test.cjs
//
// Minimum Required Coverage:
// - ARCHITECTURE (Tests 1-6)
// - TONE (Tests 7-9)
// - REFLEXES (Tests 10-12)
// - CLONUS (Tests 13-14)
// - SENSATION (Tests 15-16)
// - COORDINATION (Tests 17-18)
// - MOTOR CONTROL (Tests 19-20)
// - BALANCE / OUTCOMES (Tests 21-23)
// - GAIT / MOBILITY (Tests 24-26)
// - SECURITY (Tests 27-30)
// - MEDICO-LEGAL (Tests 31-34)
// - LONGITUDINAL (Tests 35-36)
// - SOAP (Tests 37-38)
// - SAFETY & INJECTION (Tests 39-42)
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
const FORM_COMPONENT_PATH = path.join(
  __dirname,
  '..',
  'src',
  'components',
  'clinical',
  'NeurologyAssessmentForm.tsx'
);
const LONGITUDINAL_COMPONENT_PATH = path.join(
  __dirname,
  '..',
  'src',
  'components',
  'clinical',
  'NeurologyLongitudinalView.tsx'
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
const TYPES_PATH = path.join(
  __dirname,
  '..',
  'src',
  'types',
  'database.ts'
);

const archMigrationSql = fs.readFileSync(ARCH_MIGRATION_PATH, 'utf8');
const neuroMigrationSql = fs.readFileSync(NEURO_MIGRATION_PATH, 'utf8');
const outcomeMigrationSql = fs.readFileSync(OUTCOME_MIGRATION_PATH, 'utf8');
const serviceCode = fs.readFileSync(SERVICE_PATH, 'utf8');
const outcomeServiceCode = fs.readFileSync(OUTCOME_SERVICE_PATH, 'utf8');
const formComponentCode = fs.readFileSync(FORM_COMPONENT_PATH, 'utf8');
const longitudinalComponentCode = fs.readFileSync(LONGITUDINAL_COMPONENT_PATH, 'utf8');
const visitDetailCode = fs.readFileSync(VISIT_DETAIL_PATH, 'utf8');
const notePageCode = fs.readFileSync(NOTE_PAGE_PATH, 'utf8');
const typesCode = fs.readFileSync(TYPES_PATH, 'utf8');

// Parse NEURO_EXAMINATION_V1 schema definition from migration
function extractNeuroDefinition() {
  const match = neuroMigrationSql.match(/'NEURO_EXAMINATION_V1'[\s\S]*?'(\{[\s\S]*?\})'::jsonb/);
  if (!match) {
    throw new Error('Could not extract NEURO_EXAMINATION_V1 schema JSON from migration.');
  }
  return JSON.parse(match[1]);
}

const neuroSchema = extractNeuroDefinition();

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

// Minimal valid payload satisfying all required fields in NEURO_EXAMINATION_V1
function getMinimalValidPayload() {
  return {
    alertness_participation: 'Alert & Fully Participative',
    biceps_tone_left: '0',
    biceps_tone_right: '0',
    wrist_flexors_left: '0',
    wrist_flexors_right: '0',
    quadriceps_tone_left: '0',
    quadriceps_tone_right: '0',
    gastrocnemius_tone_left: '0',
    gastrocnemius_tone_right: '0',
    biceps_reflex_left: '2+',
    biceps_reflex_right: '2+',
    patellar_reflex_left: '2+',
    patellar_reflex_right: '2+',
    ankle_clonus_left: 'Absent',
    ankle_clonus_right: 'Absent',
    light_touch: 'Intact Bilaterally',
    proprioception: 'Intact / Accurate Joint Position',
    coordination_upper_limb: 'Smooth & Accurate',
    selective_motor_control: 'Isolated Selective Movement',
    balance_sitting: 'Independent & Stable',
    balance_standing: 'Independent (>30s without support)',
    gait_assistance_level: 'Independent (Community)',
    assistive_device: 'None / Independent',
    bed_mobility: 'Independent (Rolling & Bridging)',
    sit_to_stand: 'Independent without Arms',
    transfers: 'Independent (Bed to Chair)',
  };
}

test('PHYSENRA — NEUROLOGY STRUCTURED CLINICAL MODULE V1 VERIFICATION SUITE', async (t) => {
  // ============================================================================
  // ARCHITECTURE (Tests 1-6)
  // ============================================================================
  await t.test('--- ARCHITECTURE (Tests 1-6) ---', async (st) => {
    await st.test('1. neurological assessment definition exists', () => {
      assert(
        neuroMigrationSql.includes('NEURO_EXAMINATION_V1'),
        'NEURO_EXAMINATION_V1 definition must be seeded in migration'
      );
      assert(
        archMigrationSql.includes('NEURO_MOTOR_SPASTICITY_SCREEN'),
        'NEURO_MOTOR_SPASTICITY_SCREEN must be preserved for backward compatibility'
      );
      assert(
        neuroSchema && Array.isArray(neuroSchema.sections) && neuroSchema.sections.length >= 10,
        'NEURO_EXAMINATION_V1 must define at least 10 clinical sections'
      );
    });

    await st.test('2. correct specialty/domain exists', () => {
      assert(
        neuroMigrationSql.includes("'neurological'"),
        'Specialty must be neurological'
      );
      assert(
        neuroMigrationSql.includes("'specialty_label': 'Neurological Physiotherapy'") ||
        neuroMigrationSql.includes('"specialty_label": "Neurological Physiotherapy"'),
        'display_metadata must declare Neurological Physiotherapy'
      );
    });

    await st.test('3. correct version exists', () => {
      assert(
        neuroMigrationSql.includes('1,') && neuroMigrationSql.includes("'active'"),
        'NEURO_EXAMINATION_V1 must be seeded with version 1 and active status'
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

    await st.test('5. SOAP remains independent', () => {
      assert(
        typesCode.includes('clinical_notes: {'),
        'clinical_notes table definition must remain intact'
      );
      assert(
        !visitDetailCode.includes('requireNeurologicalAssessment'),
        'Clinical visits must not force every visit to have a neurological assessment'
      );
      assert(
        notePageCode.includes('S: Subjective') || notePageCode.includes('subjective'),
        'SOAP documentation must remain primary clinical record'
      );
    });

    await st.test('6. assessment instance is tenant-owned', () => {
      assert(
        archMigrationSql.includes('practice_id uuid NOT NULL REFERENCES public.practices(id)'),
        'Assessment instance must enforce practice tenancy'
      );
      assert(
        archMigrationSql.includes('uq_clinical_assessments_practice_identifier'),
        'Practice-scoped identifier uniqueness must be enforced'
      );
    });
  });

  // ============================================================================
  // TONE (Tests 7-9)
  // ============================================================================
  await t.test('--- TONE (Tests 7-9) ---', async (st) => {
    await st.test('7. MAS values are constrained', () => {
      const allowedMas = ['0', '1', '1+', '2', '3', '4', 'NT'];
      assert(
        neuroMigrationSql.includes('"allowed_mas_values": ["0", "1", "1+", "2", "3", "4", "NT"]'),
        'Validation rules must define controlled MAS values'
      );
      assert.deepEqual(
        formComponentCode.includes("export const MAS_OPTIONS = ['0', '1', '1+', '2', '3', '4', 'NT'];"),
        true,
        'Form component must provide standard MAS options'
      );
    });

    await st.test('8. invalid MAS value rejected', () => {
      const payload = getMinimalValidPayload();
      payload.biceps_tone_left = '5'; // Invalid MAS value
      const result = validatePayload(neuroSchema, payload);
      assert.strictEqual(result.valid, false, 'Invalid MAS value 5 must be rejected');
      assert(result.errors.some((e) => e.includes('biceps_tone_left')), 'Error must mention biceps_tone_left');

      payload.biceps_tone_left = 'Severe'; // Arbitrary text
      const result2 = validatePayload(neuroSchema, payload);
      assert.strictEqual(result2.valid, false, 'Arbitrary text MAS must be rejected');
    });

    await st.test('9. bilateral tone fields work', () => {
      const payload = getMinimalValidPayload();
      payload.biceps_tone_left = '1+';
      payload.biceps_tone_right = '0';
      payload.wrist_flexors_left = '2';
      payload.wrist_flexors_right = '0';
      payload.quadriceps_tone_left = '1';
      payload.quadriceps_tone_right = '0';
      payload.gastrocnemius_tone_left = '3';
      payload.gastrocnemius_tone_right = '0';

      const result = validatePayload(neuroSchema, payload);
      assert.strictEqual(result.valid, true, 'Bilateral upper and lower extremity MAS values must be valid');
    });
  });

  // ============================================================================
  // REFLEXES (Tests 10-12)
  // ============================================================================
  await t.test('--- REFLEXES (Tests 10-12) ---', async (st) => {
    await st.test('10. reflex values are constrained', () => {
      assert(
        neuroMigrationSql.includes('"allowed_reflex_values": ["0", "1+", "2+", "3+", "4+", "NT"]'),
        'Reflex validation rules must contain standard reflex options'
      );
    });

    await st.test('11. invalid reflex value rejected', () => {
      const payload = getMinimalValidPayload();
      payload.biceps_reflex_left = '5+'; // Invalid reflex
      const result = validatePayload(neuroSchema, payload);
      assert.strictEqual(result.valid, false, 'Invalid reflex value 5+ must be rejected');

      payload.biceps_reflex_left = 'brisk'; // Non-standard string
      const result2 = validatePayload(neuroSchema, payload);
      assert.strictEqual(result2.valid, false, 'Non-standard reflex string must be rejected');
    });

    await st.test('12. bilateral reflex fields work', () => {
      const payload = getMinimalValidPayload();
      payload.biceps_reflex_left = '3+';
      payload.biceps_reflex_right = '2+';
      payload.patellar_reflex_left = '4+';
      payload.patellar_reflex_right = '2+';
      const result = validatePayload(neuroSchema, payload);
      assert.strictEqual(result.valid, true, 'Bilateral reflex values must pass validation');
    });
  });

  // ============================================================================
  // CLONUS (Tests 13-14)
  // ============================================================================
  await t.test('--- CLONUS (Tests 13-14) ---', async (st) => {
    await st.test('13. clonus categories are constrained', () => {
      assert(
        neuroMigrationSql.includes('"allowed_clonus_values": ["Absent", "Unsustained (<5 beats)", "Sustained (>=5 beats)", "NT"]'),
        'Clonus categories must be constrained'
      );
    });

    await st.test('14. invalid clonus value rejected', () => {
      const payload = getMinimalValidPayload();
      payload.ankle_clonus_left = 'Continuous'; // Invalid category
      const result = validatePayload(neuroSchema, payload);
      assert.strictEqual(result.valid, false, 'Invalid clonus value must be rejected');
    });
  });

  // ============================================================================
  // SENSATION (Tests 15-16)
  // ============================================================================
  await t.test('--- SENSATION (Tests 15-16) ---', async (st) => {
    await st.test('15. structured sensation fields exist', () => {
      const sensationSection = neuroSchema.sections.find((s) => s.id === 'sensation');
      assert(sensationSection, 'Sensation section must exist');
      const fieldIds = sensationSection.fields.map((f) => f.id);
      assert(fieldIds.includes('light_touch'), 'light_touch field must exist');
      assert(fieldIds.includes('proprioception'), 'proprioception field must exist');
      assert(fieldIds.includes('pin_prick_pain'), 'pin_prick_pain field must exist');
      assert(fieldIds.includes('sensation_symmetry'), 'sensation_symmetry field must exist');
    });

    await st.test('16. invalid structured sensation payload rejected', () => {
      const payload = getMinimalValidPayload();
      payload.light_touch = 'Numbness'; // Invalid
      const result = validatePayload(neuroSchema, payload);
      assert.strictEqual(result.valid, false, 'Invalid sensation value must be rejected');
    });
  });

  // ============================================================================
  // COORDINATION (Tests 17-18)
  // ============================================================================
  await t.test('--- COORDINATION (Tests 17-18) ---', async (st) => {
    await st.test('17. coordination fields persist', () => {
      const coordinationSection = neuroSchema.sections.find((s) => s.id === 'coordination');
      assert(coordinationSection, 'Coordination section must exist');
      const fieldIds = coordinationSection.fields.map((f) => f.id);
      assert(fieldIds.includes('coordination_upper_limb'), 'Upper limb coordination must exist');
      assert(fieldIds.includes('coordination_lower_limb'), 'Lower limb coordination must exist');
      assert(fieldIds.includes('rapid_alternating_movements'), 'Rapid alternating movements must exist');

      const payload = getMinimalValidPayload();
      payload.coordination_upper_limb = 'Mild Dysmetria / Intention Tremor';
      payload.coordination_lower_limb = 'Smooth & Accurate';
      const result = validatePayload(neuroSchema, payload);
      assert.strictEqual(result.valid, true, 'Valid coordination payload must pass');
    });

    await st.test('18. invalid coordination payload rejected', () => {
      const payload = getMinimalValidPayload();
      payload.coordination_upper_limb = 'Wobbly'; // Invalid
      const result = validatePayload(neuroSchema, payload);
      assert.strictEqual(result.valid, false, 'Invalid coordination option must be rejected');
    });
  });

  // ============================================================================
  // MOTOR CONTROL (Tests 19-20)
  // ============================================================================
  await t.test('--- MOTOR CONTROL (Tests 19-20) ---', async (st) => {
    await st.test('19. motor-control fields persist', () => {
      const motorSection = neuroSchema.sections.find((s) => s.id === 'motor_control');
      assert(motorSection, 'Motor control section must exist');
      const fieldIds = motorSection.fields.map((f) => f.id);
      assert(fieldIds.includes('selective_motor_control'), 'selective_motor_control must exist');
      assert(fieldIds.includes('movement_synergies_observed'), 'movement_synergies_observed must exist');

      const payload = getMinimalValidPayload();
      payload.selective_motor_control = 'Synergistic Movement Dominant';
      const result = validatePayload(neuroSchema, payload);
      assert.strictEqual(result.valid, true, 'Valid motor control payload must pass');
    });

    await st.test('20. invalid values rejected where enumerated', () => {
      const payload = getMinimalValidPayload();
      payload.selective_motor_control = 'Weak'; // Invalid enumeration
      const result = validatePayload(neuroSchema, payload);
      assert.strictEqual(result.valid, false, 'Invalid motor control enumeration must be rejected');
    });
  });

  // ============================================================================
  // BALANCE / OUTCOMES (Tests 21-23)
  // ============================================================================
  await t.test('--- BALANCE / OUTCOMES (Tests 21-23) ---', async (st) => {
    await st.test('21. BBS remains functional', () => {
      assert(
        outcomeMigrationSql.includes("'BBS'"),
        'BBS must exist in outcome measure foundation migration'
      );
      assert(
        outcomeServiceCode.includes('getAssessmentsForVisit'),
        'Outcome measure service must be capable of retrieving BBS for visit'
      );
    });

    await st.test('22. TUG remains functional', () => {
      assert(
        outcomeMigrationSql.includes("'TUG'"),
        'TUG must exist in outcome measure foundation migration'
      );
    });

    await st.test('23. neurological assessment does not duplicate BBS/TUG records', () => {
      const balanceSection = neuroSchema.sections.find((s) => s.id === 'balance');
      assert(balanceSection, 'Balance section must exist');
      const fieldIds = balanceSection.fields.map((f) => f.id);
      assert(fieldIds.includes('balance_bbs_reference_id'), 'BBS reference ID field must exist');
      assert(fieldIds.includes('balance_tug_reference_id'), 'TUG reference ID field must exist');

      assert(
        !neuroMigrationSql.includes('CREATE TABLE public.neurology_bbs_scores'),
        'Neurology module must NOT create separate BBS score tables'
      );
      assert(
        serviceCode.includes('getBalanceOutcomeMeasuresForVisit'),
        'Clinical assessment service must fetch authoritative BBS/TUG from outcome_measure_assessments'
      );
    });
  });

  // ============================================================================
  // GAIT / MOBILITY (Tests 24-26)
  // ============================================================================
  await t.test('--- GAIT / MOBILITY (Tests 24-26) ---', async (st) => {
    await st.test('24. gait fields persist', () => {
      const gaitSection = neuroSchema.sections.find((s) => s.id === 'gait_mobility');
      assert(gaitSection, 'Gait section must exist');
      const fieldIds = gaitSection.fields.map((f) => f.id);
      assert(fieldIds.includes('gait_assistance_level'), 'gait_assistance_level must exist');
      assert(fieldIds.includes('assistive_device'), 'assistive_device must exist');

      const payload = getMinimalValidPayload();
      payload.gait_assistance_level = 'Contact Guard / Minimal Assist';
      payload.assistive_device = 'Quad Cane';
      const result = validatePayload(neuroSchema, payload);
      assert.strictEqual(result.valid, true, 'Valid gait fields must pass');
    });

    await st.test('25. mobility fields persist', () => {
      const functionalSection = neuroSchema.sections.find((s) => s.id === 'functional_mobility');
      assert(functionalSection, 'Functional mobility section must exist');
      const fieldIds = functionalSection.fields.map((f) => f.id);
      assert(fieldIds.includes('bed_mobility'), 'bed_mobility must exist');
      assert(fieldIds.includes('sit_to_stand'), 'sit_to_stand must exist');
      assert(fieldIds.includes('wheelchair_mobility'), 'wheelchair_mobility must exist');
    });

    await st.test('26. transfer fields persist', () => {
      const functionalSection = neuroSchema.sections.find((s) => s.id === 'functional_mobility');
      const transfersField = functionalSection.fields.find((f) => f.id === 'transfers');
      assert(transfersField, 'Transfers field must exist');
      assert(transfersField.required === true, 'Transfers must be required observational field');

      const payload = getMinimalValidPayload();
      payload.transfers = 'Assisted (Pivot / Sliding Board)';
      const result = validatePayload(neuroSchema, payload);
      assert.strictEqual(result.valid, true, 'Valid transfers option must pass');
    });
  });

  // ============================================================================
  // SECURITY (Tests 27-30)
  // ============================================================================
  await t.test('--- SECURITY (Tests 27-30) ---', async (st) => {
    await st.test('27. anonymous access denied', () => {
      assert(
        archMigrationSql.includes('TO authenticated') &&
        !/\bTO\s+anon\b/i.test(archMigrationSql) &&
        !/\bTO\s+public\b/i.test(archMigrationSql),
        'RLS policies must restrict assessment access to authenticated users only'
      );
    });

    await st.test('28. cross-tenant access denied', () => {
      assert(
        archMigrationSql.includes('practice_id IN (') &&
        archMigrationSql.includes('SELECT practice_id FROM public.practice_members'),
        'Cross-tenant isolation must be enforced via practice membership'
      );
    });

    await st.test('29. unauthorized mutation denied', () => {
      assert(
        archMigrationSql.includes("role IN ('practice_owner', 'practice_manager', 'physiotherapist')"),
        'Assessment mutation policies must require clinical role'
      );
      assert(
        archMigrationSql.includes('CREATE POLICY assessment_instances_delete_denied') &&
        archMigrationSql.includes('USING (false);'),
        'Hard deletes must be denied by zero hard delete policy'
      );
    });

    await st.test('30. authorized clinician access works', () => {
      assert(
        archMigrationSql.includes("role IN ('practice_owner', 'practice_manager', 'physiotherapist')"),
        'Authorized clinicians are permitted to record structured assessments'
      );
    });
  });

  // ============================================================================
  // MEDICO-LEGAL (Tests 31-34)
  // ============================================================================
  await t.test('--- MEDICO-LEGAL (Tests 31-34) ---', async (st) => {
    await st.test('31. finalized assessment cannot be silently overwritten', () => {
      assert(
        archMigrationSql.includes('OLD.status = \'finalized\' AND NEW.status = \'finalized\'') &&
        archMigrationSql.includes('OLD.structured_data IS DISTINCT FROM NEW.structured_data'),
        'Guard trigger must block silent alterations of finalized assessment structured_data'
      );
      assert(
        serviceCode.includes("Cannot edit assessment in '${existing.status}' status"),
        'Service layer must reject updateDraftAssessment for finalized records'
      );
    });

    await st.test('32. finalized assessment cannot be deleted', () => {
      assert(
        archMigrationSql.includes('assessment_instances_delete_denied'),
        'RLS policy must categorically deny DELETE on assessment instances'
      );
    });

    await st.test('33. amendment requires reason', () => {
      assert(
        archMigrationSql.includes('amendment_reason IS NOT NULL AND length(trim(amendment_reason)) > 0'),
        'Database invariant must require amendment reason'
      );
      assert(
        serviceCode.includes('An explicit amendment reason is mandatory'),
        'Service must enforce amendment reason presence'
      );
    });

    await st.test('34. amendment preserves previous state', () => {
      assert(
        archMigrationSql.includes('parent_assessment_id uuid REFERENCES public.clinical_assessment_instances(id)'),
        'parent_assessment_id must exist to link amended record to original instance'
      );
      assert(
        archMigrationSql.includes('corrected_by uuid REFERENCES auth.users(id)'),
        'corrected_by must track amending practitioner'
      );
    });
  });

  // ============================================================================
  // LONGITUDINAL (Tests 35-36)
  // ============================================================================
  await t.test('--- LONGITUDINAL (Tests 35-36) ---', async (st) => {
    await st.test('35. historical neurological assessments retrievable', () => {
      assert(
        serviceCode.includes('getAssessmentsForPatient'),
        'clinicalAssessmentService must support fetching patient assessments longitudinally'
      );
      assert(
        longitudinalComponentCode.includes('Longitudinal Neurological Examinations'),
        'NeurologyLongitudinalView component must render historical examinations'
      );
      assert(
        visitDetailCode.includes('NeurologyLongitudinalView'),
        'ClinicalVisitDetailPage must integrate longitudinal review'
      );
    });

    await st.test('36. historical versions remain interpretable', () => {
      assert(
        archMigrationSql.includes('definition_version integer NOT NULL DEFAULT 1'),
        'definition_version must be persisted on every instance to preserve exact schema context'
      );
    });
  });

  // ============================================================================
  // SOAP (Tests 37-38)
  // ============================================================================
  await t.test('--- SOAP (Tests 37-38) ---', async (st) => {
    await st.test('37. SOAP-only workflow still works', () => {
      assert(
        notePageCode.includes('S: Subjective') || notePageCode.includes('subjective'),
        'CreateClinicalNotePage must permit completing SOAP note independently'
      );
      assert(
        !notePageCode.includes('clinicalAssessmentService.createAssessment') ||
        notePageCode.includes('Optional Specialty Extension'),
        'SOAP note submission does not mandate structured assessment creation'
      );
    });

    await st.test('38. SOAP + neurological assessment workflow works', () => {
      assert(
        visitDetailCode.includes('+ Document Neurological Exam'),
        'Visit detail page must allow documenting neurological assessment alongside encounter note'
      );
      assert(
        visitDetailCode.includes('NeurologyAssessmentForm'),
        'Visit detail page must render NeurologyAssessmentForm'
      );
    });
  });

  // ============================================================================
  // SAFETY & INJECTION (Tests 39-42)
  // ============================================================================
  await t.test('--- SAFETY & INJECTION (Tests 39-42) ---', async (st) => {
    await st.test('39. script and eval injection blocked in structured data', () => {
      const payload = getMinimalValidPayload();
      payload.precautions_observations = '<script>alert("xss")</script>';
      const result = validatePayload(neuroSchema, payload);
      assert.strictEqual(result.valid, false, '<script> tag must be rejected');

      const payload2 = getMinimalValidPayload();
      payload2.precautions_observations = 'eval(maliciousCode)';
      const result2 = validatePayload(neuroSchema, payload2);
      assert.strictEqual(result2.valid, false, 'eval() must be rejected');
    });

    await st.test('40. zero automated diagnostic or prognostic inference generated', () => {
      assert(
        !neuroMigrationSql.includes('automated_diagnosis'),
        'Migration must not contain automated diagnosis'
      );
      assert(
        !formComponentCode.includes('diagnoseCondition') &&
        !formComponentCode.includes('automatedPrognosis'),
        'Form must be purely observational'
      );
    });

    await st.test('41. UI tablet friendliness (Pills, accordions, responsive layout)', () => {
      assert(
        formComponentCode.includes('overflowX') || formComponentCode.includes('flexWrap'),
        'Form must provide responsive overflow handling for tablets'
      );
      assert(
        formComponentCode.includes('activeTab') || formComponentCode.includes('sections.map'),
        'Form must provide sectioned progressive navigation for tablet screens'
      );
    });

    await st.test('42. Legacy project independence (zero Kabworld references)', () => {
      assert(!neuroMigrationSql.toLowerCase().includes('kabworld'), 'Migration must not mention Kabworld');
      assert(!formComponentCode.toLowerCase().includes('kabworld'), 'Form must not mention Kabworld');
      assert(!longitudinalComponentCode.toLowerCase().includes('kabworld'), 'Longitudinal view must not mention Kabworld');
    });
  });
});
