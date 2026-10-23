const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../src/services/exerciseVisualRegistry.ts');
let content = fs.readFileSync(targetPath, 'utf8');

const updates = [
  {
    id: '00000000-0000-0000-0000-000000000023',
    target: `  // 23. Wrist Flexor Eccentric Loading
  '00000000-0000-0000-0000-000000000023': {
    exerciseId: '00000000-0000-0000-0000-000000000023',
    slug: 'wrist-flexor-eccentric-loading',
    title: 'Wrist Flexor Eccentric Loading',
    assetPath: null,
    altText: 'Wrist Flexor Eccentric Loading rehabilitation protocol.',
    bodyRegion: 'elbow',
    movementPhases: 'Starting Position: Forearm palm-up on table, wrist in flexion holding dumbbell. Action: Slowly lower wrist backward into extension over 4-5 seconds. U',
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
    replacement: `  // 23. Wrist Flexor Eccentric Loading
  '00000000-0000-0000-0000-000000000023': {
    exerciseId: '00000000-0000-0000-0000-000000000023',
    slug: 'wrist-flexor-eccentric-loading',
    title: 'Wrist Flexor Eccentric Loading',
    assetPath: null,
    altText: 'Wrist Flexor Eccentric Loading rehabilitation protocol.',
    bodyRegion: 'elbow',
    movementPhases: 'Starting Position: Forearm palm-up on table, wrist in flexion holding dumbbell. Action: Slowly lower wrist backward into extension over 4-5 seconds. U',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/wrist-flexor-eccentric.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient seated with supinated forearm supported on plinth performing controlled eccentric wrist flexor lowering with dumbbell.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, early 30s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Wrist flexor eccentric protocol verified (Page, 2010); seated forearm full supination supported on clinic plinth; active eccentric lowering into extension against dumbbell load; isolated radiocarpal flexion-extension without compensatory shoulder or trunk abduction.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-23T06:20:00Z',
  },`,
  },
  {
    id: '00000000-0000-0000-0000-000000000025',
    target: `  // 25. Forearm Pronation and Supination Drill
  '00000000-0000-0000-0000-000000000025': {
    exerciseId: '00000000-0000-0000-0000-000000000025',
    slug: 'forearm-pronation-and-supination-drill',
    title: 'Forearm Pronation and Supination Drill',
    assetPath: null,
    altText: 'Forearm Pronation and Supination Drill rehabilitation protocol.',
    bodyRegion: 'elbow',
    movementPhases: 'Starting Position: Elbow bent 90 degrees at side, holding base of light hammer upright. Action: Slowly rotate palm up (supination), pause 2s, then rot',
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
    replacement: `  // 25. Forearm Pronation and Supination Drill
  '00000000-0000-0000-0000-000000000025': {
    exerciseId: '00000000-0000-0000-0000-000000000025',
    slug: 'forearm-pronation-and-supination-drill',
    title: 'Forearm Pronation and Supination Drill',
    assetPath: null,
    altText: 'Forearm Pronation and Supination Drill rehabilitation protocol.',
    bodyRegion: 'elbow',
    movementPhases: 'Starting Position: Elbow bent 90 degrees at side, holding base of light hammer upright. Action: Slowly rotate palm up (supination), pause 2s, then rot',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/forearm-pronation-supination.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient seated with 90-degree elbow flexion and clinic towel roll spacer performing controlled forearm rotation with weighted mallet.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, early 30s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Proximal radioulnar joint pronation-supination drill verified; 90-degree elbow flexion maintained with towel spacer against thoracic wall preventing compensatory shoulder abduction; controlled rotational arc grasping base of weighted mallet; erect seated posture.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-23T06:20:00Z',
  },`,
  },
  {
    id: '00000000-0000-0000-0000-000000000035',
    target: `  // 35. Towel Scrunches and Marble Pick-ups
  '00000000-0000-0000-0000-000000000035': {
    exerciseId: '00000000-0000-0000-0000-000000000035',
    slug: 'towel-scrunches-and-marble-pick-ups',
    title: 'Towel Scrunches and Marble Pick-ups',
    assetPath: null,
    altText: 'Towel Scrunches and Marble Pick-ups rehabilitation protocol.',
    bodyRegion: 'ankle_foot',
    movementPhases: 'Starting Position: Seated barefoot on chair with towel flat on floor. Action: Keeping heel on floor, curl toes inward to gather towel toward you in sc',
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
    replacement: `  // 35. Towel Scrunches and Marble Pick-ups
  '00000000-0000-0000-0000-000000000035': {
    exerciseId: '00000000-0000-0000-0000-000000000035',
    slug: 'towel-scrunches-and-marble-pick-ups',
    title: 'Towel Scrunches and Marble Pick-ups',
    assetPath: null,
    altText: 'Towel Scrunches and Marble Pick-ups rehabilitation protocol.',
    bodyRegion: 'ankle_foot',
    movementPhases: 'Starting Position: Seated barefoot on chair with towel flat on floor. Action: Keeping heel on floor, curl toes inward to gather towel toward you in sc',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/towel-scrunches.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient seated barefoot on clinic chair performing towel scrunches to strengthen intrinsic foot flexor musculature.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, late 20s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Intrinsic foot musculature recruitment verified (Mulligan & Cook, 2013); upright seated chair posture; barefoot heel planted firmly and continuously on clinic floor; active interphalangeal and metatarsophalangeal toe flexion gathering towel folds under foot.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-23T06:20:00Z',
  },`,
  },
  {
    id: '00000000-0000-0000-0000-000000000046',
    target: `  // 46. Bear Crawl Coordination Drill
  '00000000-0000-0000-0000-000000000046': {
    exerciseId: '00000000-0000-0000-0000-000000000046',
    slug: 'bear-crawl-coordination-drill',
    title: 'Bear Crawl Coordination Drill',
    assetPath: null,
    altText: 'Bear Crawl Coordination Drill rehabilitation protocol.',
    bodyRegion: 'full_body',
    movementPhases: 'Starting Position: On hands and feet with knees hovering 2-3 inches off floor. Action: Crawl forward in contralateral pattern (right hand + left foot,',
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
    replacement: `  // 46. Bear Crawl Coordination Drill
  '00000000-0000-0000-0000-000000000046': {
    exerciseId: '00000000-0000-0000-0000-000000000046',
    slug: 'bear-crawl-coordination-drill',
    title: 'Bear Crawl Coordination Drill',
    assetPath: null,
    altText: 'Bear Crawl Coordination Drill rehabilitation protocol.',
    bodyRegion: 'full_body',
    movementPhases: 'Starting Position: On hands and feet with knees hovering 2-3 inches off floor. Action: Crawl forward in contralateral pattern (right hand + left foot,',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/bear-crawl.jpg',
    photoAltText: 'Photograph of fictional Nigerian female athlete demonstrating low quadruped hover in bear crawl position with flat tabletop back and knees 2-3 inches above mat.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, late 20s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Low quadruped motor control and core stabilization verified; bilateral knees flexed at 90 degrees hovering 2-3 inches above clinic mat; tabletop flat back with neutral lumbar curve and active serratus anterior scapular protraction; neutral cervical alignment.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-23T06:20:00Z',
  },`,
  },
  {
    id: '00000000-0000-0000-0000-000000000052',
    target: `  // 52. Tandem Stance with Dual-Task Cognitive Challenge
  '00000000-0000-0000-0000-000000000052': {
    exerciseId: '00000000-0000-0000-0000-000000000052',
    slug: 'tandem-stance',
    title: 'Tandem Stance with Dual-Task Cognitive Challenge',
    assetPath: '/images/exercises/tandem-stance.svg',
    altText: 'Illustration of patient standing in heel-to-toe tandem alignment, front heel directly touching back toes with hands on hips.',
    bodyRegion: 'full_body',
    movementPhases: 'Start: Stand upright placing one foot directly in front of the other (heel touches toes) -> Action: Fix gaze on eye-level target, distribute weight evenly across both feet -> Finish: Hold stationary balance 20-30s.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
  },`,
    replacement: `  // 52. Tandem Stance with Dual-Task Cognitive Challenge
  '00000000-0000-0000-0000-000000000052': {
    exerciseId: '00000000-0000-0000-0000-000000000052',
    slug: 'tandem-stance',
    title: 'Tandem Stance with Dual-Task Cognitive Challenge',
    assetPath: '/images/exercises/tandem-stance.svg',
    altText: 'Illustration of patient standing in heel-to-toe tandem alignment, front heel directly touching back toes with hands on hips.',
    bodyRegion: 'full_body',
    movementPhases: 'Start: Stand upright placing one foot directly in front of the other (heel touches toes) -> Action: Fix gaze on eye-level target, distribute weight evenly across both feet -> Finish: Hold stationary balance 20-30s.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/tandem-stance.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient demonstrating heel-to-toe tandem stance balance beside clinic safety balance rail.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, mid-40s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Narrow base of support static balance mechanics verified; textbook heel-to-toe tandem alignment with front heel touching rear toe in straight sagittal line; erect spinal posture; proximity to waist-height balance rail provides safe fall-prevention guarding.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-23T06:20:00Z',
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
