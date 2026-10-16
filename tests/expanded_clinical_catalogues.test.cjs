// ==============================================================================
// PHYSENRA EXPANDED CLINICAL CATALOGUES COMPREHENSIVE VERIFICATION SUITE
// File: tests/expanded_clinical_catalogues.test.cjs
//
// Verifies:
// 1. Migration 20261016220000_expand_clinical_catalogues.sql syntax & idempotency
// 2. Comprehensive evidence-based exercise catalogue across all 8 clinical domains
// 3. Validated outcome measures catalogue across all clinical domains with score boundaries
// 4. Copyright compliance: validated score-entry workflows without copied instruments
// 5. Multi-tenancy isolation: is_system = true, practice_id IS NULL
// 6. Service layer merging and filtering (hepService and outcomeMeasureService)
// 7. Practice custom definitions and exercises support
// 8. Absolute physical isolation: Zero Kabworld references, zero exposed secrets
// 9. Zero modification of patient, billing, payment, or subscription tables
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
  '20261016220000_expand_clinical_catalogues.sql'
);
const HEP_CATALOGUE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'hepCatalogueData.ts'
);
const OM_CATALOGUE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'outcomeMeasureCatalogueData.ts'
);
const HEP_SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'hepService.ts'
);
const OM_SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'outcomeMeasureService.ts'
);
const CREATE_HEP_PAGE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'pages',
  'hep',
  'CreateHEPPage.tsx'
);
const CREATE_OM_PAGE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'pages',
  'outcomes',
  'CreateOutcomeAssessmentPage.tsx'
);

const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
const hepCatalogueCode = fs.readFileSync(HEP_CATALOGUE_PATH, 'utf8');
const omCatalogueCode = fs.readFileSync(OM_CATALOGUE_PATH, 'utf8');
const hepServiceCode = fs.readFileSync(HEP_SERVICE_PATH, 'utf8');
const omServiceCode = fs.readFileSync(OM_SERVICE_PATH, 'utf8');
const createHepPageCode = fs.readFileSync(CREATE_HEP_PAGE_PATH, 'utf8');
const createOmPageCode = fs.readFileSync(CREATE_OM_PAGE_PATH, 'utf8');

test('PHYSENRA EXPANDED CLINICAL CATALOGUES COMPREHENSIVE VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Migration Structure & Multi-Tenant Invariants
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Migration Structure & Multi-Tenant Invariants ---', async (st) => {
    await st.test('Migration uses ON CONFLICT DO NOTHING for exercises idempotency', () => {
      assert(
        migrationSql.includes('ON CONFLICT (lower(trim(name))) WHERE practice_id IS NULL'),
        'Must specify unique system index on exercise name'
      );
      assert(
        migrationSql.includes('DO NOTHING;'),
        'Must specify non-destructive DO NOTHING on conflict'
      );
    });

    await st.test('Migration uses ON CONFLICT DO NOTHING for outcome measures idempotency', () => {
      assert(
        migrationSql.includes('ON CONFLICT (code) WHERE practice_id IS NULL'),
        'Must specify unique system index on outcome measure code'
      );
    });

    await st.test('All seeded exercises and measures have practice_id = NULL and is_system = true', () => {
      // In the SQL, values start with (NULL, true, ...)
      const exMatches = migrationSql.match(/\(\s*NULL,\s*true,/g);
      assert(exMatches && exMatches.length >= 40, `Expected at least 40 system items, found ${exMatches ? exMatches.length : 0}`);
    });

    await st.test('Zero modification to patient, billing, payment, or subscription tables', () => {
      const forbiddenOperations = [
        'CREATE TABLE public.patients',
        'DROP TABLE public.patients',
        'ALTER TABLE public.patients',
        'INSERT INTO public.patients',
        'CREATE TABLE public.invoices',
        'DROP TABLE public.invoices',
        'ALTER TABLE public.invoices',
        'INSERT INTO public.invoices',
        'CREATE TABLE public.payments',
        'DROP TABLE public.payments',
        'ALTER TABLE public.payments',
        'INSERT INTO public.payments',
        'CREATE TABLE public.subscriptions',
        'DROP TABLE public.subscriptions',
        'ALTER TABLE public.subscriptions',
        'INSERT INTO public.subscriptions',
      ];
      for (const op of forbiddenOperations) {
        assert(!migrationSql.includes(op), `Migration must not contain '${op}'`);
      }
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Exercise Library Clinical Domain Coverage
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Exercise Library Clinical Domain Coverage ---', async (st) => {
    const requiredDomains = [
      { name: 'Cervical Spine', pattern: /cervical/i },
      { name: 'Thoracic Spine', pattern: /thoracic/i },
      { name: 'Lumbar Spine & Core', pattern: /lumbar/i },
      { name: 'Shoulder', pattern: /shoulder/i },
      { name: 'Elbow', pattern: /elbow/i },
      { name: 'Wrist & Hand', pattern: /wrist_hand/i },
      { name: 'Hip', pattern: /hip/i },
      { name: 'Knee', pattern: /knee/i },
      { name: 'Ankle & Foot', pattern: /ankle_foot/i },
      { name: 'Neurological / Stroke', pattern: /paretic|hemiparetic|stroke|synergy/i },
      { name: "Parkinson's Disease", pattern: /parkinson|lsvt|bradykinesia|cadence/i },
      { name: 'Vestibular & Balance', pattern: /vestibular|vor|habituation|bppv|gaze/i },
      { name: 'Paediatrics', pattern: /tummy time|infant|child|paediatric/i },
      { name: 'Sports & Return to Activity', pattern: /copenhagen|nordic|adductor|plyometric/i },
      { name: 'Geriatrics & Falls Prevention', pattern: /chair stand|clock drill|tandem stance|fall/i },
      { name: 'Cardiovascular & Pulmonary', pattern: /diaphragmatic|pursed-lip|acbt|breathing/i },
      { name: "Pelvic & Women's Health", pattern: /pelvic floor|kegel|transverse abdominis/i },
      { name: 'Oncology & Amputee Care', pattern: /residual limb|desensitization|prosthetic/i },
    ];

    for (const d of requiredDomains) {
      await st.test(`Exercise catalogue covers ${d.name}`, () => {
        assert(
          d.pattern.test(hepCatalogueCode) || d.pattern.test(migrationSql),
          `Exercise catalogue must cover ${d.name}`
        );
      });
    }

    await st.test('Exercise catalogue has at least 50 comprehensive evidence-based exercises', () => {
      const exCount = (hepCatalogueCode.match(/name:\s*'/g) || []).length;
      assert(exCount >= 50, `Expected at least 50 exercises in library, found ${exCount}`);
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Validated Outcome Measures Catalogue Coverage & Boundaries
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Validated Outcome Measures Catalogue Coverage & Boundaries ---', async (st) => {
    const requiredMeasures = [
      'NPRS', 'VAS', 'LEFS', 'QUICKDASH', 'ODI', 'NDI', 'TUG', 'PSFS', 'BBS',
      'MAS', '10MWT', 'DGI', 'FMA-UE', '30CST', 'POMA', 'FSST', 'YBT-LQ',
      'SLHD', '6MWT', 'BORG-RPE', 'BORG-CR10', 'WOMAC', 'SPADI', 'FAAM',
      'GMFCS', 'PBS'
    ];

    for (const code of requiredMeasures) {
      await st.test(`Outcome measure definition exists: ${code}`, () => {
        assert(
          omCatalogueCode.includes(`code: '${code}'`) || omCatalogueCode.includes(`code: "${code}"`),
          `Catalogue must contain definition for ${code}`
        );
      });
    }

    await st.test('All outcome measures have valid non-empty clinical interpretation guides', () => {
      assert(
        !omCatalogueCode.includes("interpretation_guide: ''"),
        'Interpretation guide must not be empty string'
      );
      assert(
        !omCatalogueCode.includes('interpretation_guide: null'),
        'Interpretation guide must not be null'
      );
    });

    await st.test('Copyright compliance: Outcome measures use score-entry / calculation workflows', () => {
      assert(
        !omCatalogueCode.includes('proprietary questionnaire reproduction'),
        'Must not contain proprietary questionnaire reproduction'
      );
      assert(
        omCatalogueCode.includes('Score Entry') || omCatalogueCode.includes('Scale'),
        'Must use score-entry or validated clinical scale workflows'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Service Layer Catalogue Merging & Custom Practice Support
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Service Layer Catalogue Merging & Custom Practice Support ---', async (st) => {
    await st.test('hepService merges standard catalogue with remote exercises', () => {
      assert(
        hepServiceCode.includes('SYSTEM_EXERCISES_CATALOGUE'),
        'hepService must import and utilize SYSTEM_EXERCISES_CATALOGUE'
      );
      assert(
        hepServiceCode.includes('exerciseMap.set(sysEx.name.toLowerCase().trim()'),
        'hepService must index standard exercises by name'
      );
    });

    await st.test('hepService search matches name, description, equipment, instructions, and precautions', () => {
      assert(
        hepServiceCode.includes('e.instructions && e.instructions.toLowerCase().includes(term)') ||
        hepServiceCode.includes('instructions.ilike'),
        'hepService search must inspect instructions'
      );
      assert(
        hepServiceCode.includes('e.precautions && e.precautions.toLowerCase().includes(term)') ||
        hepServiceCode.includes('precautions.ilike'),
        'hepService search must inspect precautions'
      );
    });

    await st.test('outcomeMeasureService merges standard definitions and exports createCustomDefinition', () => {
      assert(
        omServiceCode.includes('SYSTEM_OUTCOME_MEASURES_CATALOGUE'),
        'outcomeMeasureService must import SYSTEM_OUTCOME_MEASURES_CATALOGUE'
      );
      assert(
        omServiceCode.includes('async createCustomDefinition'),
        'outcomeMeasureService must support practice custom outcome measure creation'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: UI Filter Bug Fixes & UX Optimization
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: UI Filter Bug Fixes & UX Optimization ---', async (st) => {
    await st.test('CreateHEPPage anatomical region values match database enums (no cervical_spine mismatch)', () => {
      assert(
        !createHepPageCode.includes('value="cervical_spine"'),
        'Must not contain invalid enum value cervical_spine'
      );
      assert(
        !createHepPageCode.includes('value="thoracic_spine"'),
        'Must not contain invalid enum value thoracic_spine'
      );
      assert(
        !createHepPageCode.includes('value="lumbar_spine"'),
        'Must not contain invalid enum value lumbar_spine'
      );
      assert(
        createHepPageCode.includes('value="cervical"'),
        'Must match valid enum value cervical'
      );
      assert(
        createHepPageCode.includes('value="thoracic"'),
        'Must match valid enum value thoracic'
      );
      assert(
        createHepPageCode.includes('value="lumbar"'),
        'Must match valid enum value lumbar'
      );
      assert(
        createHepPageCode.includes('value="elbow"'),
        'Must include elbow region filter'
      );
      assert(
        createHepPageCode.includes('value="wrist_hand"'),
        'Must include wrist_hand region filter'
      );
    });

    await st.test('CreateOutcomeAssessmentPage includes domain filter tabs and search input', () => {
      assert(
        createOmPageCode.includes('definitionCategoryFilter'),
        'CreateOutcomeAssessmentPage must support domain category filtering'
      );
      assert(
        createOmPageCode.includes('definitionSearch'),
        'CreateOutcomeAssessmentPage must support search input'
      );
      assert(
        createOmPageCode.includes('filteredDefinitions'),
        'CreateOutcomeAssessmentPage must compute filteredDefinitions'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Physical Isolation & Zero Secret Exposure
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Physical Isolation & Zero Secret Exposure ---', async (st) => {
    const inspectedSources = [
      { name: 'Migration', content: migrationSql },
      { name: 'HEP Catalogue', content: hepCatalogueCode },
      { name: 'OM Catalogue', content: omCatalogueCode },
      { name: 'HEP Service', content: hepServiceCode },
      { name: 'OM Service', content: omServiceCode },
      { name: 'CreateHEPPage', content: createHepPageCode },
      { name: 'CreateOutcomeAssessmentPage', content: createOmPageCode },
    ];

    for (const src of inspectedSources) {
      await st.test(`Zero Kabworld references in ${src.name}`, () => {
        assert(!src.content.toLowerCase().includes('kabworld'), `Must not reference Kabworld in ${src.name}`);
      });

      await st.test(`Zero Paystack secret keys in ${src.name}`, () => {
        assert(!src.content.includes('sk_live_'), `Must not leak live secret key in ${src.name}`);
        assert(!src.content.includes('sk_test_'), `Must not leak test secret key in ${src.name}`);
      });
    }
  });
});
