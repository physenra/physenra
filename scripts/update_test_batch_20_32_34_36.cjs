const fs = require('fs');
const path = require('path');

const testFile = path.resolve(__dirname, '../tests/exercise_visuals_catalog.test.cjs');
let content = fs.readFileSync(testFile, 'utf8');

// 1. Update summary counts
const targetSummary = `    assert.equal(photoSummary.totalPhotos, 48, 'Must have 48 photographic demonstrations registered');
    assert.equal(photoSummary.approvedPhotos, 46, 'Exactly 46 verified photos must be approved by physiotherapist');
    assert.equal(photoSummary.pendingReviewPhotos, 2, 'Bird-Dog and Clamshells photos must remain pending_physiotherapist_review');
    assert.equal(photoSummary.aiGeneratedCount, 48, 'All 48 photos must declare aiGenerated: true');`;

const replaceSummary = `    assert.equal(photoSummary.totalPhotos, 52, 'Must have 52 photographic demonstrations registered');
    assert.equal(photoSummary.approvedPhotos, 50, 'Exactly 50 verified photos must be approved by physiotherapist');
    assert.equal(photoSummary.pendingReviewPhotos, 2, 'Bird-Dog and Clamshells photos must remain pending_physiotherapist_review');
    assert.equal(photoSummary.aiGeneratedCount, 52, 'All 52 photos must declare aiGenerated: true');`;

// 2. Update approvedIds array
const targetApprovedIds = `      '00000000-0000-0000-0000-000000000019', // Prone Y-to-T Raises
      '00000000-0000-0000-0000-000000000021', // Wall Slides with Serratus Anterior Shrug
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
      '00000000-0000-0000-0000-000000000038', // Bridging with Affected Limb Weight Acceptance`;

const replaceApprovedIds = `      '00000000-0000-0000-0000-000000000019', // Prone Y-to-T Raises
      '00000000-0000-0000-0000-000000000020', // Sleeper Stretch (Posterior Capsule)
      '00000000-0000-0000-0000-000000000021', // Wall Slides with Serratus Anterior Shrug
      '00000000-0000-0000-0000-000000000022', // Wrist Extensor Eccentric Loading (Tyler Twist)
      '00000000-0000-0000-0000-000000000023', // Wrist Flexor Eccentric Loading
      '00000000-0000-0000-0000-000000000024', // Finger Tendon Gliding Exercises
      '00000000-0000-0000-0000-000000000025', // Forearm Pronation and Supination Drill
      '00000000-0000-0000-0000-000000000027', // Standing Banded Hip Abduction
      '00000000-0000-0000-0000-000000000028', // Half-Kneeling Hip Flexor Stretch
      '00000000-0000-0000-0000-000000000029', // Terminal Knee Extension (TKE) with Band
      '00000000-0000-0000-0000-000000000030', // Eccentric Decline Board Squat
      '00000000-0000-0000-0000-000000000031', // Romanian Deadlift (RDL) with Dumbbells
      '00000000-0000-0000-0000-000000000032', // Step-Down Drill (Eccentric Quadriceps)
      '00000000-0000-0000-0000-000000000033', // Eccentric Heel Drop on Step (Alfredson Protocol)
      '00000000-0000-0000-0000-000000000034', // Resisted Ankle Eversion with Resistance Band
      '00000000-0000-0000-0000-000000000035', // Towel Scrunches and Marble Pick-ups
      '00000000-0000-0000-0000-000000000036', // Weight-Shifting in Standing with Mirror Feedback
      '00000000-0000-0000-0000-000000000037', // Bilateral Upper Extremity Table Slides with Towel
      '00000000-0000-0000-0000-000000000038', // Bridging with Affected Limb Weight Acceptance`;

// 3. Update coverage test
const targetCoverage = `  test('Catalogue Photo Coverage: Exactly 46 approved photos, 2 pending review, and 11 clean coming-soon fallbacks', () => {
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

const replaceCoverage = `  test('Catalogue Photo Coverage: Exactly 50 approved photos, 2 pending review, and 7 clean coming-soon fallbacks', () => {
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

    assert.equal(approvedExercises.length, 50, 'Exactly 50 exercises must have clinically approved photos');
    assert.equal(pendingExercises.length, 2, 'Exactly 2 exercises (bird-dog and clamshells) must be pending review');
    assert.equal(comingSoonExercises.length, 7, 'Exactly 7 exercises must cleanly display "Photo demonstration coming soon"');
    assert.equal(approvedExercises.length + pendingExercises.length + comingSoonExercises.length, 59, 'Total must equal 59');

    // Verify all 50 approved photos map to valid JPEG files`;

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
console.log('Successfully updated exercise_visuals_catalog.test.cjs for 50 approved photos.');
