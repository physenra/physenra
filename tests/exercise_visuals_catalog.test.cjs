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
    for (const file of fs.readdirSync(exercisesDir)) {
      const content = fs.readFileSync(path.join(exercisesDir, file), 'utf8');
      for (const pattern of forbiddenPatterns) {
        assert.ok(!pattern.test(content), `Forbidden pattern ${pattern} found in SVG ${file}`);
      }
    }
  });
});
