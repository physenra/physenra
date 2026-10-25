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
    assert.equal(photoSummary.totalPhotos, 55, 'Must have 55 photographic demonstrations registered');
    assert.equal(photoSummary.approvedPhotos, 54, 'Exactly 54 verified photos must be approved by physiotherapist');
    assert.equal(photoSummary.pendingReviewPhotos, 1, 'Only Bird-Dog photo must remain pending_physiotherapist_review');
    assert.equal(photoSummary.aiGeneratedCount, 55, 'All 55 photos must declare aiGenerated: true');

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
          assert.equal(
            visual.slug,
            'bird-dog',
            `Only bird-dog should be pending review (found: ${visual.slug})`
          );
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

  test('Clinical Review Safety Guard: Pending assets remain quarantined and approved assets verified', () => {
    // 1. Pending Assets with discrepancies (Bird-Dog quarantined)
    const birdDogPhoto = getExercisePhotoDemonstration('00000000-0000-0000-0000-000000000014');
    assert.ok(birdDogPhoto !== null);
    assert.equal(birdDogPhoto.photoClinicalReviewStatus, 'pending_physiotherapist_review');
    assert.ok(birdDogPhoto.photoClinicalObservationNotes.includes('ipsilateral plane'));

    // Remediated Assets (Clamshells now approved with 90-degree knee flexion)
    const clamshellsPhoto = getExercisePhotoDemonstration('00000000-0000-0000-0000-000000000026');
    assert.ok(clamshellsPhoto !== null);
    assert.equal(clamshellsPhoto.photoClinicalReviewStatus, 'approved');
    assert.ok(clamshellsPhoto.photoClinicalObservationNotes.includes('90-degree knee flexion'));

    // 2. Approved photos (28 total)
    const approvedIds = [
      '00000000-0000-0000-0000-000000000001', // Quad Sets
      '00000000-0000-0000-0000-000000000002', // Straight Leg Raise
      '00000000-0000-0000-0000-000000000003', // Glute Bridge
      '00000000-0000-0000-0000-000000000004', // Heel Slides
      '00000000-0000-0000-0000-000000000005', // Scapular Retraction
      '00000000-0000-0000-0000-000000000006', // Pendulum Codman
      '00000000-0000-0000-0000-000000000007', // Seated Chin Tucks
      '00000000-0000-0000-0000-000000000008', // Ankle Pumps
      '00000000-0000-0000-0000-000000000009', // Standing Calf Stretch (Remediated)
      '00000000-0000-0000-0000-000000000010', // Cat-Camel
      '00000000-0000-0000-0000-000000000011', // Cervical Isometric Lateral Flexion & Rotation
      '00000000-0000-0000-0000-000000000012', // Thoracic Extension over Foam Roller
      '00000000-0000-0000-0000-000000000013', // Prone Cobra
      '00000000-0000-0000-0000-000000000015', // Dead Bug
      '00000000-0000-0000-0000-000000000016', // McKenzie Prone Extension
      '00000000-0000-0000-0000-000000000017', // Side Plank
      '00000000-0000-0000-0000-000000000018', // Side-Lying Shoulder External Rotation
      '00000000-0000-0000-0000-000000000019', // Prone Y-to-T Raises
      '00000000-0000-0000-0000-000000000020', // Sleeper Stretch (Posterior Capsule)
      '00000000-0000-0000-0000-000000000021', // Wall Slides with Serratus Anterior Shrug
      '00000000-0000-0000-0000-000000000022', // Wrist Extensor Eccentric Loading (Tyler Twist)
      '00000000-0000-0000-0000-000000000023', // Wrist Flexor Eccentric Loading
      '00000000-0000-0000-0000-000000000024', // Finger Tendon Gliding Exercises
      '00000000-0000-0000-0000-000000000025', // Forearm Pronation and Supination Drill
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
      '00000000-0000-0000-0000-000000000048', // Nordic Hamstring Curl (Eccentric Hamstring Protocol)
      '00000000-0000-0000-0000-000000000053', // Diaphragmatic Breathing
      '00000000-0000-0000-0000-000000000054', // Pursed-Lip Breathing Drill
      '00000000-0000-0000-0000-000000000055', // Active Cycle of Breathing Technique (ACBT)
      '00000000-0000-0000-0000-000000000057', // Supine Transverse Abdominis Drawing-In Maneuver
    ];

    for (const id of approvedIds) {
      const demo = getExercisePhotoDemonstration(id);
      assert.ok(demo !== null, `Demo must exist for ID ${id}`);
      assert.equal(demo.photoClinicalReviewStatus, 'approved', `Demo for ${id} must be approved`);
      assert.ok(demo.photoReviewedBy.includes('Dr. A. Adeleke, PT'));
      assert.ok(demo.photoReviewedAt !== null);
    }
  });

  test('Multi-Key Resolution: Photos resolve by canonical ID, slug, and exercise name', () => {
    // 1. By slug
    const acbtBySlug = getExercisePhotoDemonstration('active-cycle-of-breathing-technique-acbt');
    assert.ok(acbtBySlug !== null);
    assert.equal(acbtBySlug.photoAssetPath, '/images/exercises/photographs/acbt-breathing.jpg');

    const ankleBySlug = getExercisePhotoDemonstration('ankle-pumps');
    assert.ok(ankleBySlug !== null);
    assert.equal(ankleBySlug.photoAssetPath, '/images/exercises/photographs/ankle-pumps.jpg');

    // 2. By exercise title / name
    const acbtByName = getExercisePhotoDemonstration('Active Cycle of Breathing Technique (ACBT)');
    assert.ok(acbtByName !== null);
    assert.equal(acbtByName.photoAssetPath, '/images/exercises/photographs/acbt-breathing.jpg');

    // 3. By fallback name parameter (simulating unknown DB UUID + known exercise name)
    const simulatedDbUuid = 'e8b0a9f1-7782-4c91-9dc5-8f4b6a123456';
    const acbtWithFallback = getExercisePhotoDemonstration(simulatedDbUuid, 'Active Cycle of Breathing Technique (ACBT)');
    assert.ok(acbtWithFallback !== null);
    assert.equal(acbtWithFallback.photoAssetPath, '/images/exercises/photographs/acbt-breathing.jpg');

    const ankleWithFallback = getExercisePhotoDemonstration(simulatedDbUuid, 'Ankle Pumps');
    assert.ok(ankleWithFallback !== null);
    assert.equal(ankleWithFallback.photoAssetPath, '/images/exercises/photographs/ankle-pumps.jpg');
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

  test('Catalogue Photo Coverage: Exactly 54 approved photos, 1 pending review, and 4 clean coming-soon fallbacks', () => {
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

    // Verify all 54 approved photos map to valid JPEG files
    for (const ex of approvedExercises) {
      const demo = getExercisePhotoDemonstration(ex.id);
      assert.ok(demo.photoAssetPath.endsWith('.jpg'), `Photo for ${ex.name} must be a .jpg`);
      const fullPath = path.resolve(__dirname, '..', 'public', demo.photoAssetPath.replace(/^\//, ''));
      assert.ok(fs.existsSync(fullPath), `Physical photo file must exist: ${fullPath}`);
    }
  });

  test('Catalogue Layout Invariants & Stable Visual Box Dimensions', () => {
    const cardComponentPath = path.resolve(__dirname, '../src/components/hep/ExerciseVisualCard.tsx');
    const cardSource = fs.readFileSync(cardComponentPath, 'utf8');

    // Outer container sizing constraints
    assert.ok(cardSource.includes('width: dimensions.width'), 'Visual container must enforce dimensions.width');
    assert.ok(cardSource.includes("flexShrink: 0"), 'Visual container must enforce flexShrink: 0 to prevent collapsing');

    // Inner photo and placeholder height & aspect ratio constraints
    assert.ok(cardSource.includes('height: dimensions.height'), 'Visual container must enforce dimensions.height on photo/placeholder');
    assert.ok(cardSource.includes("aspectRatio: '320 / 220'"), 'Photo and placeholder must maintain standard 320/220 aspect ratio');

    // Catalogue modal responsive flex wrap in CreateHEPPage
    const createHepPagePath = path.resolve(__dirname, '../src/pages/hep/CreateHEPPage.tsx');
    const createHepSource = fs.readFileSync(createHepPagePath, 'utf8');
    assert.ok(createHepSource.includes("flexWrap: 'wrap'"), 'Catalogue modal exercise cards must support responsive flexWrap');
    assert.ok(createHepSource.includes("flex: '1 1 240px'"), 'Exercise details must expand flexibly without crushing photo thumbnail');
  });

  test('Catalogue Search & Region/Category Filter Photo Preservation', () => {
    // 1. Filter by category: 'strengthening'
    const strengtheningExercises = SYSTEM_EXERCISES_CATALOGUE.filter((e) => e.category === 'strengthening');
    assert.ok(strengtheningExercises.length > 0);
    for (const ex of strengtheningExercises) {
      const demo = getExercisePhotoDemonstration(ex.id, ex.name);
      if (demo && demo.photoClinicalReviewStatus === 'approved') {
        assert.ok(demo.photoAssetPath.startsWith('/images/exercises/photographs/'));
      }
    }

    // 2. Filter by body region: 'knee'
    const kneeExercises = SYSTEM_EXERCISES_CATALOGUE.filter((e) => e.body_region === 'knee');
    assert.ok(kneeExercises.length > 0);
    for (const ex of kneeExercises) {
      const demo = getExercisePhotoDemonstration(ex.id, ex.name);
      if (demo && demo.photoClinicalReviewStatus === 'approved') {
        assert.ok(demo.photoAssetPath.includes('.jpg'));
      }
    }

    // 3. Search query: 'quad'
    const searchHits = SYSTEM_EXERCISES_CATALOGUE.filter((e) => e.name.toLowerCase().includes('quad'));
    assert.ok(searchHits.length > 0);
    const quadSets = searchHits.find((e) => e.name.includes('Quad Sets'));
    assert.ok(quadSets);
    const quadDemo = getExercisePhotoDemonstration(quadSets.id, quadSets.name);
    assert.ok(quadDemo);
    assert.equal(quadDemo.photoClinicalReviewStatus, 'approved');
    assert.equal(quadDemo.photoAssetPath, '/images/exercises/photographs/quad-sets.jpg');
  });
});

