const fs = require('fs');
const path = require('path');

const testFile = path.resolve(__dirname, '../tests/exercise_visuals_catalog.test.cjs');
let content = fs.readFileSync(testFile, 'utf8');

// 1. Update summary counts
const targetSummary = `    assert.equal(photoSummary.totalPhotos, 43, 'Must have 43 photographic demonstrations registered');
    assert.equal(photoSummary.approvedPhotos, 41, 'Exactly 41 verified photos must be approved by physiotherapist');
    assert.equal(photoSummary.pendingReviewPhotos, 2, 'Bird-Dog and Clamshells photos must remain pending_physiotherapist_review');
    assert.equal(photoSummary.aiGeneratedCount, 43, 'All 43 photos must declare aiGenerated: true');`;

const replaceSummary = `    assert.equal(photoSummary.totalPhotos, 48, 'Must have 48 photographic demonstrations registered');
    assert.equal(photoSummary.approvedPhotos, 46, 'Exactly 46 verified photos must be approved by physiotherapist');
    assert.equal(photoSummary.pendingReviewPhotos, 2, 'Bird-Dog and Clamshells photos must remain pending_physiotherapist_review');
    assert.equal(photoSummary.aiGeneratedCount, 48, 'All 48 photos must declare aiGenerated: true');`;

// 2. Update approvedIds array
const targetApprovedIds = `      '00000000-0000-0000-0000-000000000021', // Wall Slides with Serratus Anterior Shrug
      '00000000-0000-0000-0000-000000000022', // Wrist Extensor Eccentric Loading (Tyler Twist)
      '00000000-0000-0000-0000-000000000024', // Finger Tendon Gliding Exercises
      '00000000-0000-0000-0000-000000000027', // Standing Banded Hip Abduction
      '00000000-0000-0000-0000-000000000028', // Half-Kneeling Hip Flexor Stretch
      '00000000-0000-0000-0000-000000000029', // Terminal Knee Extension (TKE) with Band
      '00000000-0000-0000-0000-000000000030', // Eccentric Decline Board Squat
      '00000000-0000-0000-0000-000000000031', // Romanian Deadlift (RDL) with Dumbbells
      '00000000-0000-0000-0000-000000000033', // Eccentric Heel Drop on Step (Alfredson Protocol)
      '00000000-0000-0000-0000-000000000037', // Bilateral Upper Extremity Table Slides with Towel
      '00000000-0000-0000-0000-000000000038', // Bridging with Affected Limb Weight Acceptance
      '00000000-0000-0000-0000-000000000041', // Frenkel Coordination Heel-to-Shin Exercises
      '00000000-0000-0000-0000-000000000043', // Brandt-Daroff Vestibular Habituation Drill
      '00000000-0000-0000-0000-000000000045', // Tall-Kneeling to Half-Kneeling Transitional Stepping
      '00000000-0000-0000-0000-000000000050', // 30-Second Chair Stand
      '00000000-0000-0000-0000-000000000051', // Multidirectional Stepping Clock Drill
      '00000000-0000-0000-0000-000000000042', // Vestibular VOR x1 Gaze Stabilization Drill
      '00000000-0000-0000-0000-000000000047', // Copenhagen Adductor Exercise (Groin Strain Protocol)
      '00000000-0000-0000-0000-000000000048', // Nordic Hamstring Curl (Eccentric Hamstring Protocol)
      '00000000-0000-0000-0000-000000000053', // Diaphragmatic Breathing
      '00000000-0000-0000-0000-000000000054', // Pursed-Lip Breathing Drill
      '00000000-0000-0000-0000-000000000055', // Active Cycle of Breathing Technique (ACBT)
      '00000000-0000-0000-0000-000000000057', // Supine Transverse Abdominis Drawing-In Maneuver`;

const replaceApprovedIds = `      '00000000-0000-0000-0000-000000000021', // Wall Slides with Serratus Anterior Shrug
      '00000000-0000-0000-0000-000000000022', // Wrist Extensor Eccentric Loading (Tyler Twist)
      '00000000-0000-0000-0000-000000000023', // Wrist Flexor Eccentric Loading
      '00000000-0000-0000-0000-000000000024', // Finger Tendon Gliding Exercises
      '00000000-0000-0000-0000-000000000025', // Forearm Pronation and Supination Drill
      '00000000-0000-0000-0000-000000000027', // Standing Banded Hip Abduction
      '00000000-0000-0000-0000-000000000028', // Half-Kneeling Hip Flexor Stretch
      '00000000-0000-0000-0000-000000000029', // Terminal Knee Extension (TKE) with Band
      '00000000-0000-0000-0000-000000000030', // Eccentric Decline Board Squat
      '00000000-0000-0000-0000-000000000031', // Romanian Deadlift (RDL) with Dumbbells
      '00000000-0000-0000-0000-000000000033', // Eccentric Heel Drop on Step (Alfredson Protocol)
      '00000000-0000-0000-0000-000000000035', // Towel Scrunches and Marble Pick-ups
      '00000000-0000-0000-0000-000000000037', // Bilateral Upper Extremity Table Slides with Towel
      '00000000-0000-0000-0000-000000000038', // Bridging with Affected Limb Weight Acceptance
      '00000000-0000-0000-0000-000000000041', // Frenkel Coordination Heel-to-Shin Exercises
      '00000000-0000-0000-0000-000000000043', // Brandt-Daroff Vestibular Habituation Drill
      '00000000-0000-0000-0000-000000000045', // Tall-Kneeling to Half-Kneeling Transitional Stepping
      '00000000-0000-0000-0000-000000000046', // Bear Crawl Coordination Drill
      '00000000-0000-0000-0000-000000000050', // 30-Second Chair Stand
      '00000000-0000-0000-0000-000000000051', // Multidirectional Stepping Clock Drill
      '00000000-0000-0000-0000-000000000052', // Tandem Stance with Dual-Task Cognitive Challenge
      '00000000-0000-0000-0000-000000000042', // Vestibular VOR x1 Gaze Stabilization Drill
      '00000000-0000-0000-0000-000000000047', // Copenhagen Adductor Exercise (Groin Strain Protocol)
      '00000000-0000-0000-0000-000000000048', // Nordic Hamstring Curl (Eccentric Hamstring Protocol)
      '00000000-0000-0000-0000-000000000053', // Diaphragmatic Breathing
      '00000000-0000-0000-0000-000000000054', // Pursed-Lip Breathing Drill
      '00000000-0000-0000-0000-000000000055', // Active Cycle of Breathing Technique (ACBT)
      '00000000-0000-0000-0000-000000000057', // Supine Transverse Abdominis Drawing-In Maneuver`;

// 3. Update coverage test
const targetCoverage = `  test('Catalogue Photo Coverage: Exactly 41 approved photos, 2 pending review, and 16 clean coming-soon fallbacks', () => {
    const approvedExercises = [];
    const pendingExercises = [];
    const comingSoonExercises = [];

    for (const exercise of SYSTEM_EXERCISES_CATALOGUE) {
      const photo = getExercisePhotoDemonstration(exercise.id);
      if (photo && photo.photoClinicalReviewStatus === 'approved') {
        approvedExercises.push(exercise);
      } else if (photo && photo.photoClinicalReviewStatus === 'pending_physiotherapist_review') {
        pendingExercises.push(exercise);
      } else {
        comingSoonExercises.push(exercise);
      }
    }

    assert.equal(approvedExercises.length, 41, 'Exactly 41 exercises must have clinically approved photos');
    assert.equal(pendingExercises.length, 2, 'Exactly 2 exercises (bird-dog and clamshells) must be pending review');
    assert.equal(comingSoonExercises.length, 16, 'Exactly 16 exercises must cleanly display "Photo demonstration coming soon"');
    assert.equal(approvedExercises.length + pendingExercises.length + comingSoonExercises.length, 59, 'Total must equal 59');

    // Verify all 41 approved photos map to valid JPEG files`;

const replaceCoverage = `  test('Catalogue Photo Coverage: Exactly 46 approved photos, 2 pending review, and 11 clean coming-soon fallbacks', () => {
    const approvedExercises = [];
    const pendingExercises = [];
    const comingSoonExercises = [];

    for (const exercise of SYSTEM_EXERCISES_CATALOGUE) {
      const photo = getExercisePhotoDemonstration(exercise.id);
      if (photo && photo.photoClinicalReviewStatus === 'approved') {
        approvedExercises.push(exercise);
      } else if (photo && photo.photoClinicalReviewStatus === 'pending_physiotherapist_review') {
        pendingExercises.push(exercise);
      } else {
        comingSoonExercises.push(exercise);
      }
    }

    assert.equal(approvedExercises.length, 46, 'Exactly 46 exercises must have clinically approved photos');
    assert.equal(pendingExercises.length, 2, 'Exactly 2 exercises (bird-dog and clamshells) must be pending review');
    assert.equal(comingSoonExercises.length, 11, 'Exactly 11 exercises must cleanly display "Photo demonstration coming soon"');
    assert.equal(approvedExercises.length + pendingExercises.length + comingSoonExercises.length, 59, 'Total must equal 59');

    // Verify all 46 approved photos map to valid JPEG files`;

const isCRLF = content.includes('\r\n');
function replaceBlock(str, target, rep) {
  const normTarget = isCRLF ? target.replace(/\r?\n/g, '\r\n') : target.replace(/\r?\n/g, '\n');
  const normRep = isCRLF ? rep.replace(/\r?\n/g, '\r\n') : rep.replace(/\r?\n/g, '\n');
  if (!str.includes(normTarget)) {
    throw new Error('Target not found in test file:\n' + target.slice(0, 100));
  }
  return str.replace(normTarget, normRep);
}

content = replaceBlock(content, targetSummary, replaceSummary);
content = replaceBlock(content, targetApprovedIds, replaceApprovedIds);
content = replaceBlock(content, targetCoverage, replaceCoverage);

fs.writeFileSync(testFile, content, 'utf8');
console.log('Successfully updated exercise_visuals_catalog.test.cjs for 46 approved photos.');
