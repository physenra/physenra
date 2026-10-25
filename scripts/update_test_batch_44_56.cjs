const fs = require('fs');
const path = require('path');

const testFile = path.resolve(__dirname, '../tests/exercise_visuals_catalog.test.cjs');
let content = fs.readFileSync(testFile, 'utf8');

// 1. Update summary counts
const targetSummary = `    assert.equal(photoSummary.totalPhotos, 55, 'Must have 55 photographic demonstrations registered');
    assert.equal(photoSummary.approvedPhotos, 54, 'Exactly 54 verified photos must be approved by physiotherapist');
    assert.equal(photoSummary.pendingReviewPhotos, 1, 'Only Bird-Dog photo must remain pending_physiotherapist_review');
    assert.equal(photoSummary.aiGeneratedCount, 55, 'All 55 photos must declare aiGenerated: true');`;

const replaceSummary = `    assert.equal(photoSummary.totalPhotos, 57, 'Must have 57 photographic demonstrations registered');
    assert.equal(photoSummary.approvedPhotos, 56, 'Exactly 56 verified photos must be approved by physiotherapist');
    assert.equal(photoSummary.pendingReviewPhotos, 1, 'Only Bird-Dog photo must remain pending_physiotherapist_review');
    assert.equal(photoSummary.aiGeneratedCount, 57, 'All 57 photos must declare aiGenerated: true');`;

// 2. Update approvedIds array
const targetApprovedIds = `      '00000000-0000-0000-0000-000000000043', // Brandt-Daroff Vestibular Habituation Drill
      '00000000-0000-0000-0000-000000000045', // Tall-Kneeling to Half-Kneeling Transitional Stepping`;

const replaceApprovedIds = `      '00000000-0000-0000-0000-000000000043', // Brandt-Daroff Vestibular Habituation Drill
      '00000000-0000-0000-0000-000000000044', // Prone Tummy Time with Chest Bolster Support
      '00000000-0000-0000-0000-000000000045', // Tall-Kneeling to Half-Kneeling Transitional Stepping`;

const targetApprovedIds56 = `      '00000000-0000-0000-0000-000000000055', // Active Cycle of Breathing Technique (ACBT)
      '00000000-0000-0000-0000-000000000057', // Supine Transverse Abdominis Drawing-In Maneuver`;

const replaceApprovedIds56 = `      '00000000-0000-0000-0000-000000000055', // Active Cycle of Breathing Technique (ACBT)
      '00000000-0000-0000-0000-000000000056', // Pelvic Floor Muscle Training (Kegels with Knack Technique)
      '00000000-0000-0000-0000-000000000057', // Supine Transverse Abdominis Drawing-In Maneuver`;

// 3. Update coverage test
const targetCoverage = `  test('Catalogue Photo Coverage: Exactly 54 approved photos, 1 pending review, and 4 clean coming-soon fallbacks', () => {
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

    assert.equal(approvedExercises.length, 54, 'Exactly 54 exercises must have clinically approved photos');
    assert.equal(pendingExercises.length, 1, 'Exactly 1 exercise (bird-dog) must be pending review');
    assert.equal(comingSoonExercises.length, 4, 'Exactly 4 exercises must cleanly display "Photo demonstration coming soon"');
    assert.equal(approvedExercises.length + pendingExercises.length + comingSoonExercises.length, 59, 'Total must equal 59');

    // Verify all 54 approved photos map to valid JPEG files`;

const replaceCoverage = `  test('Catalogue Photo Coverage: Exactly 56 approved photos, 1 pending review, and 2 clean coming-soon fallbacks', () => {
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

    assert.equal(approvedExercises.length, 56, 'Exactly 56 exercises must have clinically approved photos');
    assert.equal(pendingExercises.length, 1, 'Exactly 1 exercise (bird-dog) must be pending review');
    assert.equal(comingSoonExercises.length, 2, 'Exactly 2 exercises must cleanly display "Photo demonstration coming soon"');
    assert.equal(approvedExercises.length + pendingExercises.length + comingSoonExercises.length, 59, 'Total must equal 59');

    // Verify all 56 approved photos map to valid JPEG files`;

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
content = replaceBlock(content, targetApprovedIds56, replaceApprovedIds56);
content = replaceBlock(content, targetCoverage, replaceCoverage);

fs.writeFileSync(testFile, content, 'utf8');
console.log('Successfully updated exercise_visuals_catalog.test.cjs for 56 approved photos.');
