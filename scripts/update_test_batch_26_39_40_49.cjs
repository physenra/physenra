const fs = require('fs');
const path = require('path');

const testFile = path.resolve(__dirname, '../tests/exercise_visuals_catalog.test.cjs');
let content = fs.readFileSync(testFile, 'utf8');

// 1. Update summary counts
const targetSummary = `    assert.equal(photoSummary.totalPhotos, 52, 'Must have 52 photographic demonstrations registered');
    assert.equal(photoSummary.approvedPhotos, 50, 'Exactly 50 verified photos must be approved by physiotherapist');
    assert.equal(photoSummary.pendingReviewPhotos, 2, 'Bird-Dog and Clamshells photos must remain pending_physiotherapist_review');
    assert.equal(photoSummary.aiGeneratedCount, 52, 'All 52 photos must declare aiGenerated: true');`;

const replaceSummary = `    assert.equal(photoSummary.totalPhotos, 55, 'Must have 55 photographic demonstrations registered');
    assert.equal(photoSummary.approvedPhotos, 54, 'Exactly 54 verified photos must be approved by physiotherapist');
    assert.equal(photoSummary.pendingReviewPhotos, 1, 'Only Bird-Dog photo must remain pending_physiotherapist_review');
    assert.equal(photoSummary.aiGeneratedCount, 55, 'All 55 photos must declare aiGenerated: true');`;

// 2. Update single pending check
const targetPendingSlug = `          assert.equal(visual.photoClinicalReviewStatus, 'pending_physiotherapist_review');
          assert.ok(
            ['bird-dog', 'clamshells'].includes(visual.slug),
            \`Only bird-dog or clamshells should be pending review (found: \${visual.slug})\`
          );`;

const replacePendingSlug = `          assert.equal(visual.photoClinicalReviewStatus, 'pending_physiotherapist_review');
          assert.equal(
            visual.slug,
            'bird-dog',
            \`Only bird-dog should be pending review (found: \${visual.slug})\`
          );`;

// 3. Update quarantine / clinical guard test
const targetQuarantineGuard = `    // 1. Pending Assets with discrepancies
    const birdDogPhoto = getExercisePhotoDemonstration('00000000-0000-0000-0000-000000000014');
    assert.ok(birdDogPhoto !== null);
    assert.equal(birdDogPhoto.photoClinicalReviewStatus, 'pending_physiotherapist_review');
    assert.ok(birdDogPhoto.photoClinicalObservationNotes.includes('ipsilateral plane'));

    const clamshellsPhoto = getExercisePhotoDemonstration('00000000-0000-0000-0000-000000000026');
    assert.ok(clamshellsPhoto !== null);
    assert.equal(clamshellsPhoto.photoClinicalReviewStatus, 'pending_physiotherapist_review');
    assert.ok(clamshellsPhoto.photoClinicalObservationNotes.includes('bottom leg rendered in full extension'));`;

const replaceQuarantineGuard = `    // 1. Pending Assets with discrepancies (Bird-Dog quarantined)
    const birdDogPhoto = getExercisePhotoDemonstration('00000000-0000-0000-0000-000000000014');
    assert.ok(birdDogPhoto !== null);
    assert.equal(birdDogPhoto.photoClinicalReviewStatus, 'pending_physiotherapist_review');
    assert.ok(birdDogPhoto.photoClinicalObservationNotes.includes('ipsilateral plane'));

    // Remediated Assets (Clamshells now approved with 90-degree knee flexion)
    const clamshellsPhoto = getExercisePhotoDemonstration('00000000-0000-0000-0000-000000000026');
    assert.ok(clamshellsPhoto !== null);
    assert.equal(clamshellsPhoto.photoClinicalReviewStatus, 'approved');
    assert.ok(clamshellsPhoto.photoClinicalObservationNotes.includes('90-degree knee flexion'));`;

// 4. Update approvedIds array
const targetApprovedIds = `      '00000000-0000-0000-0000-000000000025', // Forearm Pronation and Supination Drill
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
      '00000000-0000-0000-0000-000000000048', // Nordic Hamstring Curl (Eccentric Hamstring Protocol)`;

const replaceApprovedIds = `      '00000000-0000-0000-0000-000000000025', // Forearm Pronation and Supination Drill
      '00000000-0000-0000-0000-000000000026', // Side-Lying Clamshells with Resistance Band (Remediated)
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
      '00000000-0000-0000-0000-000000000038', // Bridging with Affected Limb Weight Acceptance
      '00000000-0000-0000-0000-000000000039', // LSVT BIG-Style High Amplitude Stepping Drill
      '00000000-0000-0000-0000-000000000040', // Dynamic Auditory-Cued Gait Training
      '00000000-0000-0000-0000-000000000041', // Frenkel Coordination Heel-to-Shin Exercises
      '00000000-0000-0000-0000-000000000043', // Brandt-Daroff Vestibular Habituation Drill
      '00000000-0000-0000-0000-000000000045', // Tall-Kneeling to Half-Kneeling Transitional Stepping
      '00000000-0000-0000-0000-000000000046', // Bear Crawl Coordination Drill
      '00000000-0000-0000-0000-000000000049', // Lateral Bound and Stick (Frontal Plane Deceleration)
      '00000000-0000-0000-0000-000000000050', // 30-Second Chair Stand
      '00000000-0000-0000-0000-000000000051', // Multidirectional Stepping Clock Drill
      '00000000-0000-0000-0000-000000000052', // Tandem Stance with Dual-Task Cognitive Challenge
      '00000000-0000-0000-0000-000000000042', // Vestibular VOR x1 Gaze Stabilization Drill
      '00000000-0000-0000-0000-000000000047', // Copenhagen Adductor Exercise (Groin Strain Protocol)
      '00000000-0000-0000-0000-000000000048', // Nordic Hamstring Curl (Eccentric Hamstring Protocol)`;

// 5. Update coverage test
const targetCoverage = `  test('Catalogue Photo Coverage: Exactly 50 approved photos, 2 pending review, and 7 clean coming-soon fallbacks', () => {
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

const replaceCoverage = `  test('Catalogue Photo Coverage: Exactly 54 approved photos, 1 pending review, and 4 clean coming-soon fallbacks', () => {
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
content = replaceBlock(content, targetPendingSlug, replacePendingSlug);
content = replaceBlock(content, targetQuarantineGuard, replaceQuarantineGuard);
content = replaceBlock(content, targetApprovedIds, replaceApprovedIds);
content = replaceBlock(content, targetCoverage, replaceCoverage);

fs.writeFileSync(testFile, content, 'utf8');
console.log('Successfully updated exercise_visuals_catalog.test.cjs for 54 approved photos.');
