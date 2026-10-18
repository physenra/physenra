const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Load exercise catalogue and visual registry
const { SYSTEM_EXERCISES_CATALOGUE } = require('../src/services/hepCatalogueData.ts');
const {
  EXERCISE_VISUALS_REGISTRY,
  getExerciseVisual,
  hasApprovedVisual,
  getVisualStatusSummary,
  getExercisePhotoDemonstration,
  getPhotoDemonstrationSummary,
} = require('../src/services/exerciseVisualRegistry.ts');

describe('PHYSENRA CLINICAL EXERCISE VISUALS & REGISTRY AUDIT', () => {
  const exercisesDir = path.resolve(__dirname, '../public/images/exercises');

  test('Exercise catalogue has exactly 59 active evidence-based exercises', () => {
    assert.equal(SYSTEM_EXERCISES_CATALOGUE.length, 59);
  });

  test('Visual status summary reports accurate counts and approval rate', () => {
    const summary = getVisualStatusSummary(59);
    assert.equal(summary.totalCatalog, 59);
    assert.equal(summary.approvedCount, 28);
    assert.equal(summary.pendingReviewCount, 31);
    assert.equal(summary.approvalRatePercentage, 47);
  });

  test('Every registered exercise visual maps 1-to-1 to a valid catalogue exercise', () => {
    const catalogMap = new Map(SYSTEM_EXERCISES_CATALOGUE.map((ex) => [ex.id, ex]));

    for (const [id, visual] of Object.entries(EXERCISE_VISUALS_REGISTRY)) {
      assert.ok(catalogMap.has(id), `Visual ID ${id} must exist in SYSTEM_EXERCISES_CATALOGUE`);
      const catalogEx = catalogMap.get(id);
      assert.equal(visual.exerciseId, id, `Visual exerciseId must match key ${id}`);
      assert.equal(visual.bodyRegion, catalogEx.body_region, `Visual body region must match exercise body region for ${visual.title}`);
    }
  });

  test('Every approved visual has an existing, non-empty SVG asset file on disk', () => {
    for (const visual of Object.values(EXERCISE_VISUALS_REGISTRY)) {
      if (visual.clinicalReviewStatus === 'approved') {
        assert.ok(visual.assetPath, `Approved visual for ${visual.title} must have an assetPath`);
        const relativePath = visual.assetPath.replace(/^\//, '');
        const absolutePath = path.resolve(__dirname, '..', 'public', relativePath);

        assert.ok(fs.existsSync(absolutePath), `File must exist at ${absolutePath}`);
        const stat = fs.statSync(absolutePath);
        assert.ok(stat.size > 500, `SVG file at ${absolutePath} must be > 500 bytes (was ${stat.size})`);
      }
    }
  });

  test('All SVG files under public/images/exercises are registered and valid XML', () => {
    const files = fs.readdirSync(exercisesDir).filter((f) => f.endsWith('.svg'));
    assert.equal(files.length, 28, 'There must be exactly 28 SVG files on disk');

    const registeredSlugs = new Set(
      Object.values(EXERCISE_VISUALS_REGISTRY)
        .filter((v) => v.clinicalReviewStatus === 'approved')
        .map((v) => `${v.slug}.svg`)
    );

    for (const file of files) {
      assert.ok(registeredSlugs.has(file), `SVG file ${file} must have an approved entry in registry`);

      const filePath = path.join(exercisesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Valid SVG structure
      assert.ok(content.startsWith('<svg') || content.includes('<svg'), `${file} must contain <svg> root tag`);
      assert.ok(content.includes('viewBox="0 0 320 220"'), `${file} must declare standard viewBox="0 0 320 220"`);
      assert.ok(content.includes('<title>'), `${file} must contain accessible <title> element`);
      assert.ok(content.includes('<desc>'), `${file} must contain accessible <desc> element`);
      assert.ok(content.includes('</svg>'), `${file} must properly close </svg>`);
    }
  });

  test('Zero duplicate slugs or duplicate asset paths exist in registry', () => {
    const seenSlugs = new Set();
    const seenPaths = new Set();

    for (const visual of Object.values(EXERCISE_VISUALS_REGISTRY)) {
      assert.ok(!seenSlugs.has(visual.slug), `Duplicate slug detected: ${visual.slug}`);
      seenSlugs.add(visual.slug);

      if (visual.assetPath) {
        assert.ok(!seenPaths.has(visual.assetPath), `Duplicate assetPath detected: ${visual.assetPath}`);
        seenPaths.add(visual.assetPath);
      }
    }
  });

  test('Compliance: All approved visuals track licensing, attribution, and clinical review board', () => {
    for (const visual of Object.values(EXERCISE_VISUALS_REGISTRY)) {
      if (visual.clinicalReviewStatus === 'approved') {
        assert.equal(visual.license, 'Physenra Proprietary Original Clinical Artwork');
        assert.equal(visual.attribution, 'Physenra Clinical Architecture Team');
        assert.equal(visual.reviewedBy, 'Physenra Clinical Quality & Rehabilitation Board');
        assert.ok(visual.reviewedAt, `Approved visual ${visual.slug} must have reviewedAt timestamp`);
        assert.ok(!isNaN(Date.parse(visual.reviewedAt)), `${visual.reviewedAt} must be valid ISO date`);
      }
    }
  });

  test('Accessibility: All approved visuals feature detailed, non-empty alt text and movement phases', () => {
    for (const visual of Object.values(EXERCISE_VISUALS_REGISTRY)) {
      if (visual.clinicalReviewStatus === 'approved') {
        assert.ok(visual.altText && visual.altText.length > 25, `Alt text for ${visual.slug} must be comprehensive (>25 chars)`);
        assert.ok(visual.movementPhases && visual.movementPhases.length > 20, `Movement phases for ${visual.slug} must be detailed`);
      }
    }
  });

  test('Clinical Review Guard: getExerciseVisual returns null for unreviewed or unknown IDs', () => {
    // Approved ID
    const approvedVisual = getExerciseVisual('00000000-0000-0000-0000-000000000001');
    assert.ok(approvedVisual !== null);
    assert.equal(approvedVisual.slug, 'quad-sets');
    assert.equal(hasApprovedVisual('00000000-0000-0000-0000-000000000001'), true);

    // Unapproved ID (e.g. LSVT big drill 00000000-0000-0000-0000-000000000039)
    const unapprovedVisual = getExerciseVisual('00000000-0000-0000-0000-000000000039');
    assert.equal(unapprovedVisual, null, 'Unapproved/pending exercise must return null from getExerciseVisual');
    assert.equal(hasApprovedVisual('00000000-0000-0000-0000-000000000039'), false);

    // Completely unknown UUID
    assert.equal(getExerciseVisual('ffffffff-ffff-ffff-ffff-ffffffffffff'), null);
    assert.equal(hasApprovedVisual('ffffffff-ffff-ffff-ffff-ffffffffffff'), false);
  });

  test('Security & Multi-Tenant Audit: No secret keys, credentials, or Kabworld references exist', () => {
    const filesToCheck = [
      path.resolve(__dirname, '../src/services/exerciseVisualRegistry.ts'),
      path.resolve(__dirname, '../src/components/hep/ExerciseVisualCard.tsx'),
    ];

    const forbiddenPatterns = [
      /sk_live_[a-zA-Z0-9]+/i,
      /sk_test_[a-zA-Z0-9]+/i,
      /kabworld/i,
      /password/i,
      /service_role/i,
    ];

    for (const filePath of filesToCheck) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const pattern of forbiddenPatterns) {
        assert.ok(!pattern.test(content), `Forbidden pattern ${pattern} found in ${filePath}`);
      }
    }

    // Check all SVG files for security invariants
    const svgFiles = fs.readdirSync(exercisesDir).filter((f) => f.endsWith('.svg'));
    for (const file of svgFiles) {
      const content = fs.readFileSync(path.join(exercisesDir, file), 'utf8');
      for (const pattern of forbiddenPatterns) {
        assert.ok(!pattern.test(content), `Forbidden pattern ${pattern} found in SVG ${file}`);
      }
    }
  });

  test('Nigerian Photographic Demonstrations: Registry integrity and asset existence', () => {
    const photoSummary = getPhotoDemonstrationSummary();
    assert.equal(photoSummary.totalPhotos, 7, 'Must have 7 photographic demonstrations registered');
    assert.equal(photoSummary.approvedPhotos, 6, 'Exactly 6 verified photos must be approved by physiotherapist');
    assert.equal(photoSummary.pendingReviewPhotos, 1, 'Calf stretch photo must remain pending_physiotherapist_review');
    assert.equal(photoSummary.aiGeneratedCount, 7, 'All 7 photos must declare aiGenerated: true');

    const photosDir = path.resolve(__dirname, '../public/images/exercises/photographs');
    assert.ok(fs.existsSync(photosDir), 'Photographs directory must exist');

    for (const visual of Object.values(EXERCISE_VISUALS_REGISTRY)) {
      if (visual.photoAssetPath) {
        assert.ok(visual.photoAiGenerated, `Photo for ${visual.title} must be flagged aiGenerated`);
        assert.ok(visual.photoDemographic, `Photo for ${visual.title} must specify Nigerian demographic representation`);
        assert.ok(
          visual.photoAltText && visual.photoAltText.length > 20,
          `Photo for ${visual.title} must have descriptive alt text`
        );

        if (visual.photoClinicalReviewStatus === 'approved') {
          assert.ok(visual.photoReviewedBy, `Approved photo ${visual.title} must have photoReviewedBy`);
          assert.ok(visual.photoReviewedAt, `Approved photo ${visual.title} must have photoReviewedAt timestamp`);
          assert.ok(!isNaN(Date.parse(visual.photoReviewedAt)), `photoReviewedAt must be valid ISO date for ${visual.title}`);
        } else {
          assert.equal(visual.photoClinicalReviewStatus, 'pending_physiotherapist_review');
          assert.equal(visual.slug, 'standing-calf-stretch', 'Only the calf stretch photo should be pending review');
        }

        const relativePath = visual.photoAssetPath.replace(/^\//, '');
        const absolutePath = path.resolve(__dirname, '..', 'public', relativePath);
        assert.ok(fs.existsSync(absolutePath), `Photo file must exist at ${absolutePath}`);

        const stats = fs.statSync(absolutePath);
        assert.ok(stats.size > 20000, `Photo ${visual.photoAssetPath} must be > 20KB`);
        assert.ok(stats.size < 120000, `Photo ${visual.photoAssetPath} must be < 120KB for fast mobile performance (was ${stats.size} bytes)`);
      }
    }
  });

  test('Clinical Review Safety Guard: Calf stretch with heel discrepancy remains pending review', () => {
    const calfStretchPhoto = getExercisePhotoDemonstration('00000000-0000-0000-0000-000000000009');
    assert.ok(calfStretchPhoto !== null);
    assert.equal(calfStretchPhoto.photoClinicalReviewStatus, 'pending_physiotherapist_review');
    assert.ok(calfStretchPhoto.photoClinicalObservationNotes.includes('rear heel is slightly elevated'));

    // Approved photos
    const approvedIds = [
      '00000000-0000-0000-0000-000000000001', // Quad Sets
      '00000000-0000-0000-0000-000000000002', // Straight Leg Raise
      '00000000-0000-0000-0000-000000000003', // Glute Bridge
      '00000000-0000-0000-0000-000000000007', // Seated Chin Tucks
      '00000000-0000-0000-0000-000000000016', // McKenzie Prone Extension
      '00000000-0000-0000-0000-000000000050', // 30-Second Chair Stand
    ];

    for (const id of approvedIds) {
      const demo = getExercisePhotoDemonstration(id);
      assert.ok(demo !== null);
      assert.equal(demo.photoClinicalReviewStatus, 'approved');
      assert.ok(demo.photoReviewedBy.includes('Dr. A. Adeleke, PT'));
      assert.ok(demo.photoReviewedAt !== null);
    }
  });

  test('UI Invariants: Vector illustration toggles and "Visual in review" are retired from ExerciseVisualCard', () => {
    const cardComponentPath = path.resolve(__dirname, '../src/components/hep/ExerciseVisualCard.tsx');
    const cardSource = fs.readFileSync(cardComponentPath, 'utf8');

    // Retired elements must NOT exist in the component source
    assert.ok(!cardSource.includes('setActiveView'), 'activeView state must be removed from ExerciseVisualCard');
    assert.ok(!cardSource.includes('>Illustration<'), 'Illustration toggle button must be removed');
    assert.ok(!cardSource.includes('Photo Demo'), 'Photo Demo toggle button must be removed');
    assert.ok(!cardSource.includes('Visual in review'), '"Visual in review" placeholder text must be removed');
    assert.ok(!cardSource.includes('Dumbbell'), 'Generic Dumbbell icon placeholder must be removed');
    assert.ok(!cardSource.includes('AlertCircle'), 'AlertCircle warning icon must be removed');
    assert.ok(!cardSource.includes('visual?.assetPath'), 'Vector illustration assetPath fallback must be removed');

    // Standardized photo demonstration elements MUST exist
    assert.ok(cardSource.includes('Clinically Verified Photo'), 'Card must render "Clinically Verified Photo" badge for approved photos');
    assert.ok(cardSource.includes('Photo demonstration coming soon'), 'Card must render "Photo demonstration coming soon" for pending exercises');
    assert.ok(cardSource.includes("objectFit: 'cover'"), 'Photographs must render with clean objectFit: cover framing');
  });

  test('Catalogue Photo Coverage: Exactly 6 approved photos, 1 pending review, and 52 clean coming-soon fallbacks', () => {
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

    assert.equal(approvedExercises.length, 6, 'Exactly 6 exercises must have clinically approved photos');
    assert.equal(pendingExercises.length, 1, 'Exactly 1 exercise (standing calf stretch) must be pending review');
    assert.equal(comingSoonExercises.length, 52, 'Exactly 52 exercises must cleanly display "Photo demonstration coming soon"');
    assert.equal(approvedExercises.length + pendingExercises.length + comingSoonExercises.length, 59, 'Total must equal 59');

    // Verify all 6 approved photos map to valid JPEG files
    for (const ex of approvedExercises) {
      const demo = getExercisePhotoDemonstration(ex.id);
      assert.ok(demo.photoAssetPath.endsWith('.jpg'), `Photo for ${ex.name} must be a .jpg`);
      const fullPath = path.resolve(__dirname, '..', 'public', demo.photoAssetPath.replace(/^\//, ''));
      assert.ok(fs.existsSync(fullPath), `Physical photo file must exist: ${fullPath}`);
    }
  });
});

