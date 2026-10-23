const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../src/services/exerciseVisualRegistry.ts');
let content = fs.readFileSync(targetPath, 'utf8');

const updates = [
  {
    id: '00000000-0000-0000-0000-000000000020',
    target: `  // 20. Sleeper Stretch (Posterior Capsule)
  '00000000-0000-0000-0000-000000000020': {
    exerciseId: '00000000-0000-0000-0000-000000000020',
    slug: 'sleeper-stretch-posterior-capsule',
    title: 'Sleeper Stretch (Posterior Capsule)',
    assetPath: null,
    altText: 'Sleeper Stretch (Posterior Capsule) rehabilitation protocol.',
    bodyRegion: 'shoulder',
    movementPhases: 'Starting Position: Side-lying on involved side with shoulder flexed 90 degrees, elbow 90 degrees. Action: With other hand, gently press wrist downward',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: null,
    photoAltText: null,
    photoAiGenerated: false,
    photoDemographic: null,
    photoClinicalReviewStatus: 'pending_physiotherapist_review',
    photoClinicalObservationNotes: null,
    photoReviewedBy: null,
    photoReviewedAt: null,
  },`,
    replacement: `  // 20. Sleeper Stretch (Posterior Capsule)
  '00000000-0000-0000-0000-000000000020': {
    exerciseId: '00000000-0000-0000-0000-000000000020',
    slug: 'sleeper-stretch-posterior-capsule',
    title: 'Sleeper Stretch (Posterior Capsule)',
    assetPath: null,
    altText: 'Sleeper Stretch (Posterior Capsule) rehabilitation protocol.',
    bodyRegion: 'shoulder',
    movementPhases: 'Starting Position: Side-lying on involved side with shoulder flexed 90 degrees, elbow 90 degrees. Action: With other hand, gently press wrist downward',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/sleeper-stretch.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient lying on side on clinic mat demonstrating posterior capsule sleeper stretch with 90-degree shoulder flexion and gentle internal rotation overpressure.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, early 30s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Posterior glenohumeral capsule stretch biomechanics verified; side-lying on clinic mat with head pillow support; right humerus aligned at 90 degrees flexion in scapular plane; 90-degree elbow flexion; gentle contralateral hand overpressure into internal rotation without trunk rollback.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-23T20:55:00Z',
  },`,
  },
  {
    id: '00000000-0000-0000-0000-000000000032',
    target: `  // 32. Step-Down Drill (Eccentric Quadriceps)
  '00000000-0000-0000-0000-000000000032': {
    exerciseId: '00000000-0000-0000-0000-000000000032',
    slug: 'step-down-drill-eccentric-quadriceps',
    title: 'Step-Down Drill (Eccentric Quadriceps)',
    assetPath: null,
    altText: 'Step-Down Drill (Eccentric Quadriceps) rehabilitation protocol.',
    bodyRegion: 'knee',
    movementPhases: 'Starting Position: Stand on 4-6 inch step on target leg. Action: Bend knee to slowly lower opposite heel toward floor over 3s. Lightly tap floor witho',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: null,
    photoAltText: null,
    photoAiGenerated: false,
    photoDemographic: null,
    photoClinicalReviewStatus: 'pending_physiotherapist_review',
    photoClinicalObservationNotes: null,
    photoReviewedBy: null,
    photoReviewedAt: null,
  },`,
    replacement: `  // 32. Step-Down Drill (Eccentric Quadriceps)
  '00000000-0000-0000-0000-000000000032': {
    exerciseId: '00000000-0000-0000-0000-000000000032',
    slug: 'step-down-drill-eccentric-quadriceps',
    title: 'Step-Down Drill (Eccentric Quadriceps)',
    assetPath: null,
    altText: 'Step-Down Drill (Eccentric Quadriceps) rehabilitation protocol.',
    bodyRegion: 'knee',
    movementPhases: 'Starting Position: Stand on 4-6 inch step on target leg. Action: Bend knee to slowly lower opposite heel toward floor over 3s. Lightly tap floor witho',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/step-down-drill.jpg',
    photoAltText: 'Photograph of fictional Nigerian male athlete performing eccentric step-down drill from 6-inch rehab box with clean patellofemoral tracking and upright posture.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, mid-20s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Single-leg eccentric quadriceps mechanics and patellofemoral tracking verified; stance leg on 6-inch aerobic box with 45-60 degree knee flexion tracking cleanly over second toe without valgus collapse; level pelvis; non-weightbearing foot dorsiflexed in forward descent.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-23T20:55:00Z',
  },`,
  },
  {
    id: '00000000-0000-0000-0000-000000000034',
    target: `  // 34. Resisted Ankle Eversion with Resistance Band
  '00000000-0000-0000-0000-000000000034': {
    exerciseId: '00000000-0000-0000-0000-000000000034',
    slug: 'resisted-ankle-eversion-with-resistance-band',
    title: 'Resisted Ankle Eversion with Resistance Band',
    assetPath: null,
    altText: 'Resisted Ankle Eversion with Resistance Band rehabilitation protocol.',
    bodyRegion: 'ankle_foot',
    movementPhases: 'Starting Position: Seated with legs extended, band anchored around foot. Action: Turn target foot outward and slightly upward against band resistance ',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: null,
    photoAltText: null,
    photoAiGenerated: false,
    photoDemographic: null,
    photoClinicalReviewStatus: 'pending_physiotherapist_review',
    photoClinicalObservationNotes: null,
    photoReviewedBy: null,
    photoReviewedAt: null,
  },`,
    replacement: `  // 34. Resisted Ankle Eversion with Resistance Band
  '00000000-0000-0000-0000-000000000034': {
    exerciseId: '00000000-0000-0000-0000-000000000034',
    slug: 'resisted-ankle-eversion-with-resistance-band',
    title: 'Resisted Ankle Eversion with Resistance Band',
    assetPath: null,
    altText: 'Resisted Ankle Eversion with Resistance Band rehabilitation protocol.',
    bodyRegion: 'ankle_foot',
    movementPhases: 'Starting Position: Seated with legs extended, band anchored around foot. Action: Turn target foot outward and slightly upward against band resistance ',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/resisted-ankle-eversion.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient in long-sitting posture performing resisted ankle eversion with green elastic band looped around forefoot.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, late 20s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Isolated subtalar joint eversion mechanics verified; long-sitting mat posture with upright spine; green resistance band tensioned medially around target forefoot; active peroneal contraction turning foot outward without hip external rotation substitution.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-23T20:55:00Z',
  },`,
  },
  {
    id: '00000000-0000-0000-0000-000000000036',
    target: `  // 36. Weight-Shifting in Standing with Mirror Feedback
  '00000000-0000-0000-0000-000000000036': {
    exerciseId: '00000000-0000-0000-0000-000000000036',
    slug: 'weight-shifting-in-standing-with-mirror-feedback',
    title: 'Weight-Shifting in Standing with Mirror Feedback',
    assetPath: null,
    altText: 'Weight-Shifting in Standing with Mirror Feedback rehabilitation protocol.',
    bodyRegion: 'full_body',
    movementPhases: 'Starting Position: Stand facing mirror with hands on parallel bars/counter. Action: Slowly shift weight onto paretic leg until 60-70% loaded. Observe ',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: null,
    photoAltText: null,
    photoAiGenerated: false,
    photoDemographic: null,
    photoClinicalReviewStatus: 'pending_physiotherapist_review',
    photoClinicalObservationNotes: null,
    photoReviewedBy: null,
    photoReviewedAt: null,
  },`,
    replacement: `  // 36. Weight-Shifting in Standing with Mirror Feedback
  '00000000-0000-0000-0000-000000000036': {
    exerciseId: '00000000-0000-0000-0000-000000000036',
    slug: 'weight-shifting-in-standing-with-mirror-feedback',
    title: 'Weight-Shifting in Standing with Mirror Feedback',
    assetPath: null,
    altText: 'Weight-Shifting in Standing with Mirror Feedback rehabilitation protocol.',
    bodyRegion: 'full_body',
    movementPhases: 'Starting Position: Stand facing mirror with hands on parallel bars/counter. Action: Slowly shift weight onto paretic leg until 60-70% loaded. Observe ',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/weight-shifting-standing.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient standing in clinic gym holding wooden balance rail and practicing lateral weight shift while monitoring alignment in posture mirror.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, late 30s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Postural symmetry and lateral weight-shift balance mechanics verified; upright standing posture with hands on waist-height clinic balance rail; controlled lateral weight transfer onto target limb; visual mirror feedback utilized for real-time postural alignment correction.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-23T20:55:00Z',
  },`,
  },
];

let replaced = 0;
for (const u of updates) {
  const normTarget = u.target.replace(/\r\n/g, '\n');
  const normContent = content.replace(/\r\n/g, '\n');
  
  if (normContent.includes(normTarget)) {
    const isCRLF = content.includes('\r\n');
    const matchedTarget = isCRLF ? u.target.replace(/\r?\n/g, '\r\n') : normTarget;
    const matchedReplacement = isCRLF ? u.replacement.replace(/\r?\n/g, '\r\n') : u.replacement.replace(/\r\n/g, '\n');
    content = content.replace(matchedTarget, matchedReplacement);
    replaced++;
    console.log(`[PASS] Replaced exercise: ${u.id}`);
  } else {
    console.error(`[FAIL] Target snippet not found for: ${u.id}`);
  }
}

if (replaced === updates.length) {
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log(`[SUCCESS] All ${replaced} exercises updated in exerciseVisualRegistry.ts`);
} else {
  console.error(`Only ${replaced} / ${updates.length} were replaced. Aborting.`);
  process.exit(1);
}
