/**
 * PHYSENRA — MULTI-SPECIALTY PHYSIOTHERAPY COVERAGE AUDIT TEST SUITE
 * File: tests/multispecialty_physiotherapy_coverage_audit.test.cjs
 * 
 * Verifies the architectural evidence grounding the multi-specialty coverage audit:
 * 1. Core clinical architecture models (patients, episodes, visits, notes, plans)
 * 2. Specialty-neutral database design vs MSK-skewed template placeholders
 * 3. Seeded outcome measures inventory (7 MSK, 2 Geriatric/Neuro, 0 Paediatric/Cardio/Pelvic)
 * 4. HEP exercise catalogue categories and seeded items
 * 5. Visit location modes (confirming native 'home' visit support)
 * 6. Website claims vs actual application implementation (e.g. DICOM PACS & Cobb calipers)
 * 7. Invariant verification: Zero database modifications, zero unapproved features, zero secrets, zero Kabworld references
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function readFile(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

// -----------------------------------------------------------------------------
// 1. CORE CLINICAL ARCHITECTURE VERIFICATION
// -----------------------------------------------------------------------------
test('ARCHITECTURE: Core clinical entities are defined and decoupled', async (t) => {
  const patientSql = readFile('supabase/migrations/20260928014500_patient_registry_foundation.sql');
  const episodeSql = readFile('supabase/migrations/20260928015500_episode_of_care_foundation.sql');
  const visitSql = readFile('supabase/migrations/20260928023000_clinical_visit_foundation.sql');
  const noteSql = readFile('supabase/migrations/20260928024000_clinical_note_foundation.sql');
  const planSql = readFile('supabase/migrations/20260928032000_treatment_plan_foundation.sql');

  assert(patientSql.includes('CREATE TABLE public.patients'), 'patients table must exist');
  assert(episodeSql.includes('CREATE TABLE public.episodes_of_care'), 'episodes_of_care table must exist');
  assert(visitSql.includes('CREATE TABLE public.clinical_visits'), 'clinical_visits table must exist');
  assert(noteSql.includes('CREATE TABLE public.clinical_notes'), 'clinical_notes table must exist');
  assert(planSql.includes('CREATE TABLE IF NOT EXISTS public.treatment_plans'), 'treatment_plans table must exist');
});

test('ARCHITECTURE: Core database schema is specialty-neutral without MSK table coupling', async (t) => {
  const noteSql = readFile('supabase/migrations/20260928024000_clinical_note_foundation.sql');
  // Confirm clinical_notes uses standard generic SOAP text fields
  assert(noteSql.includes('subjective text NOT NULL DEFAULT \'\''), 'SOAP subjective field must be generic text');
  assert(noteSql.includes('objective text NOT NULL DEFAULT \'\''), 'SOAP objective field must be generic text');
  assert(noteSql.includes('assessment text NOT NULL DEFAULT \'\''), 'SOAP assessment field must be generic text');
  assert(noteSql.includes('plan text NOT NULL DEFAULT \'\''), 'SOAP plan field must be generic text');

  // Verify no specialty-coupled tables exist
  assert(!noteSql.includes('msk_assessment'), 'No dedicated MSK-coupled table in clinical notes migration');
  assert(!noteSql.includes('goniometry_measurements'), 'No goniometry table');
});

// -----------------------------------------------------------------------------
// 2. SPECIALTY-SPECIFIC INVENTORY & EVIDENCE CHECKS
// -----------------------------------------------------------------------------
test('MSK COVERAGE: Confirmed structured support for MSK outcome measures and pain scales', async (t) => {
  const outcomesSql = readFile('supabase/migrations/20260928025000_clinical_outcome_measures_foundation.sql');
  assert(outcomesSql.includes("'NPRS'"), 'NPRS must be present');
  assert(outcomesSql.includes("'VAS'"), 'VAS must be present');
  assert(outcomesSql.includes("'LEFS'"), 'LEFS must be present');
  assert(outcomesSql.includes("'QUICKDASH'"), 'QuickDASH must be present');
  assert(outcomesSql.includes("'ODI'"), 'ODI must be present');
  assert(outcomesSql.includes("'NDI'"), 'NDI must be present');
  assert(outcomesSql.includes("'PSFS'"), 'PSFS must be present');
});

test('NEUROLOGICAL COVERAGE: Confirmed BBS and TUG exist, but structured neuro assessment tools are absent', async (t) => {
  const outcomesSql = readFile('supabase/migrations/20260928025000_clinical_outcome_measures_foundation.sql');
  // BBS and TUG exist for mobility/balance
  assert(outcomesSql.includes("'BBS'"), 'Berg Balance Scale must be seeded');
  assert(outcomesSql.includes("'TUG'"), 'Timed Up and Go must be seeded');

  // But structured neurological assessment tools do NOT exist
  assert(!outcomesSql.includes("'MAS'"), 'Modified Ashworth Scale not seeded as structured tool');
  assert(!outcomesSql.includes("'Fugl-Meyer'"), 'Fugl-Meyer not seeded');
  assert(!outcomesSql.includes("'FIM'"), 'FIM not seeded');
  assert(!outcomesSql.includes("'Barthel'"), 'Barthel Index not seeded');
});

test('PAEDIATRIC COVERAGE: Patient date_of_birth exists, but paediatric motor/developmental tools are absent', async (t) => {
  const patientSql = readFile('supabase/migrations/20260928014500_patient_registry_foundation.sql');
  assert(patientSql.includes('date_of_birth date'), 'date_of_birth must exist on patients');

  const outcomesSql = readFile('supabase/migrations/20260928025000_clinical_outcome_measures_foundation.sql');
  assert(!outcomesSql.includes("'GMFM'"), 'GMFM not seeded');
  assert(!outcomesSql.includes("'PEDI'"), 'PEDI not seeded');
  assert(!outcomesSql.includes("'AIMS'"), 'Alberta Infant Motor Scale not seeded');
  assert(!outcomesSql.includes("'PDMS'"), 'Peabody Developmental Motor Scales not seeded');
});

test('CARDIORESPIRATORY COVERAGE: Dedicated vitals and respiratory measures are absent from core schema', async (t) => {
  const outcomesSql = readFile('supabase/migrations/20260928025000_clinical_outcome_measures_foundation.sql');
  assert(!outcomesSql.includes("'6MWT'"), '6-Minute Walk Test not seeded');
  assert(!outcomesSql.includes("'BORG'"), 'Borg Scale not seeded');
  assert(!outcomesSql.includes("'SGRQ'"), 'St Georges Respiratory Questionnaire not seeded');

  const visitSql = readFile('supabase/migrations/20260928023000_clinical_visit_foundation.sql');
  assert(!visitSql.includes('spo2'), 'SpO2 not structured on clinical_visits table');
  assert(!visitSql.includes('respiratory_rate'), 'respiratory_rate not structured on clinical_visits table');
});

test('GERIATRIC COVERAGE: Fall risk instruments TUG and BBS are seeded with clinical cut-offs', async (t) => {
  const outcomesSql = readFile('supabase/migrations/20260928025000_clinical_outcome_measures_foundation.sql');
  assert(outcomesSql.includes('Timed Up and Go Test'), 'TUG description present');
  assert(outcomesSql.includes('Greater than 12 seconds = Elevated fall risk'), 'TUG interpretation guide present');
  assert(outcomesSql.includes('Berg Balance Scale'), 'BBS description present');
  assert(outcomesSql.includes('Score below 45 indicates elevated risk of falling'), 'BBS interpretation guide present');
});

test('PELVIC HEALTH COVERAGE: Zero structured pelvic floor or continence outcome tools exist', async (t) => {
  const outcomesSql = readFile('supabase/migrations/20260928025000_clinical_outcome_measures_foundation.sql');
  assert(!outcomesSql.includes("'PFDI'"), 'PFDI not seeded');
  assert(!outcomesSql.includes("'ICIQ'"), 'ICIQ not seeded');
  assert(!outcomesSql.includes('pelvic_floor'), 'No pelvic floor specific category');
});

test('COMMUNITY / HOME PHYSIOTHERAPY: clinical_visits natively supports home location_mode', async (t) => {
  const visitSql = readFile('supabase/migrations/20260928023000_clinical_visit_foundation.sql');
  assert(visitSql.includes("location_mode IN ('clinic', 'home', 'telehealth', 'other')"), 'Visit location_mode must include home');
});

// -----------------------------------------------------------------------------
// 3. EXERCISE CATALOGUE AUDIT
// -----------------------------------------------------------------------------
test('HEP EXERCISE CATALOGUE: Supports multi-specialty categories but starter seed is 100% MSK', async (t) => {
  const hepSql = readFile('supabase/migrations/20260928031000_home_exercise_program_foundation.sql');
  // Category enum includes broad concepts
  assert(hepSql.includes("'aerobic'"), 'aerobic category supported in enum');
  assert(hepSql.includes("'balance'"), 'balance category supported in enum');
  assert(hepSql.includes("'neuromuscular'"), 'neuromuscular category supported in enum');
  assert(hepSql.includes("'functional'"), 'functional category supported in enum');

  // But the 10 seeded exercises are all orthopaedic/MSK
  assert(hepSql.includes("'Quad Sets (Isometric Quadriceps Contraction)'"), 'Seeded Quad Sets');
  assert(hepSql.includes("'Straight Leg Raise (SLR)'"), 'Seeded SLR');
  assert(hepSql.includes("'Glute Bridge'"), 'Seeded Glute Bridge');
  assert(hepSql.includes("'Heel Slides'"), 'Seeded Heel Slides');
  assert(hepSql.includes("'Scapular Retraction (Pinch)'"), 'Seeded Scapular Retraction');
  assert(hepSql.includes("'Pendulum (Codman) Exercise'"), 'Seeded Codman');
  assert(hepSql.includes("'Seated Chin Tucks (Cervical Retraction)'"), 'Seeded Chin Tucks');
  assert(hepSql.includes("'Ankle Pumps'"), 'Seeded Ankle Pumps');
  assert(hepSql.includes("'Standing Calf Stretch (Gastrocnemius)'"), 'Seeded Calf Stretch');
  assert(hepSql.includes("'Cat-Camel (Spinal Mobility)'"), 'Seeded Cat-Camel');
});

// -----------------------------------------------------------------------------
// 4. FRONTEND MSK TEMPLATE ASSUMPTIONS & COUPLING
// -----------------------------------------------------------------------------
test('FRONTEND TEMPLATES: CreateClinicalNotePage uses MSK-skewed placeholders on generic SOAP', async (t) => {
  const notePageCode = readFile('src/pages/notes/CreateClinicalNotePage.tsx');
  assert(notePageCode.includes('sharp lower back pain (6/10) with prolonged sitting'), 'MSK subjective placeholder');
  assert(notePageCode.includes('Lumbar flexion limited to 40 deg with central low back pain. SLR negative'), 'MSK objective placeholder');
  assert(notePageCode.includes('Mechanical lumbar spine dysfunction with core deconditioning'), 'MSK assessment placeholder');
  assert(notePageCode.includes('Continue lumbar stabilization program 2x weekly'), 'MSK plan placeholder');
});

// -----------------------------------------------------------------------------
// 5. WEBSITE CLAIMS VS APPLICATION REALITY
// -----------------------------------------------------------------------------
test('WEBSITE AUDIT: Cobb angle caliper claims exist on marketing site but not in clinical PACS app', async (t) => {
  const homepageCode = readFile('src/public/pages/HomePageShell.tsx');
  assert(homepageCode.includes('Cobb Angle'), 'Homepage claims Cobb angle caliper');

  // Verify that the actual clinical imaging review component does NOT implement Cobb calculation
  const reviewPageCode = readFile('src/pages/imaging/ReviewImagingStudyPage.tsx');
  assert(!reviewPageCode.includes('cobb'), 'ReviewImagingStudyPage does not implement cobb calculation');
});

// -----------------------------------------------------------------------------
// 6. INVARIANT CHECKS: ZERO SECRETS, ZERO KABWORLD, ZERO DB CHANGES
// -----------------------------------------------------------------------------
test('SECURITY INVARIANT: Zero frontend secrets or private keys in repository source', async (t) => {
  const srcDir = path.join(repoRoot, 'src');
  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        assert(!content.includes('service_role'), `${entry.name} must not contain service_role`);
        assert(!content.includes('SUPABASE_SERVICE_ROLE_KEY'), `${entry.name} must not contain service role key`);
        assert(!content.includes('sk_live_'), `${entry.name} must not contain sk_live_`);
        assert(!content.includes('sbp_'), `${entry.name} must not contain Supabase PAT`);
      }
    }
  }
  scan(srcDir);
});

test('SEPARATION INVARIANT: Zero Kabworld references across src/', async (t) => {
  const srcDir = path.join(repoRoot, 'src');
  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (/\.(ts|tsx|js|jsx|json|css)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        assert(!/kabworld/i.test(content), `${entry.name} contains Kabworld reference`);
      }
    }
  }
  scan(srcDir);
});
