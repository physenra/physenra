const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../src/services/exerciseVisualRegistry.ts');
let content = fs.readFileSync(targetPath, 'utf8');

const updates = [
  {
    id: '00000000-0000-0000-0000-000000000026',
    target: `  // 26. Side-Lying Clamshells with Resistance Band
  '00000000-0000-0000-0000-000000000026': {
    exerciseId: '00000000-0000-0000-0000-000000000026',
    slug: 'clamshells',
    title: 'Side-Lying Clamshells with Resistance Band',
    assetPath: '/images/exercises/clamshells.svg',
    altText: 'Illustration of patient side-lying with knees bent at 90 degrees and looped band around thighs, opening top knee upward while feet stay touching.',
    bodyRegion: 'hip',
    movementPhases: 'Start: Side-lying with hips flexed 45° and knees bent 90°, looped resistance band above knees -> Action: Keep heels glued together, rotate top knee upward -> Finish: Squeeze side glute, hold 2s, lower with control.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/clamshells.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient side-lying on blue mat with resistance band around thighs.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, mid-30s, warm brown skin',
    photoClinicalReviewStatus: 'pending_physiotherapist_review',
    photoClinicalObservationNotes: 'Discrepancy noted during clinical safety audit: bottom leg rendered in full extension rather than 45-degree knee flexion with stacked feet. Requires physiotherapist remediation before live patient-facing approval.',
  },`,
    replacement: `  // 26. Side-Lying Clamshells with Resistance Band
  '00000000-0000-0000-0000-000000000026': {
    exerciseId: '00000000-0000-0000-0000-000000000026',
    slug: 'clamshells',
    title: 'Side-Lying Clamshells with Resistance Band',
    assetPath: '/images/exercises/clamshells.svg',
    altText: 'Illustration of patient side-lying with knees bent at 90 degrees and looped band around thighs, opening top knee upward while feet stay touching.',
    bodyRegion: 'hip',
    movementPhases: 'Start: Side-lying with hips flexed 45° and knees bent 90°, looped resistance band above knees -> Action: Keep heels glued together, rotate top knee upward -> Finish: Squeeze side glute, hold 2s, lower with control.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/clamshells.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient side-lying on clinic mat demonstrating side-lying clamshell with resistance band, both knees bent at 90 degrees, and feet touching.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, late 20s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Side-lying clamshell gluteus medius isolation mechanics verified; textbook 90-degree knee flexion and 45-degree hip flexion on clinic mat; heels pinned together; top knee abducted against green mini-loop resistance band; vertical pelvic stability without rollback.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-25T15:15:00Z',
  },`,
  },
  {
    id: '00000000-0000-0000-0000-000000000039',
    target: `  // 39. LSVT BIG-Style High Amplitude Stepping Drill
  '00000000-0000-0000-0000-000000000039': {
    exerciseId: '00000000-0000-0000-0000-000000000039',
    slug: 'lsvt-big-style-high-amplitude-stepping-drill',
    title: 'LSVT BIG-Style High Amplitude Stepping Drill',
    assetPath: null,
    altText: 'LSVT BIG-Style High Amplitude Stepping Drill rehabilitation protocol.',
    bodyRegion: 'full_body',
    movementPhases: 'Starting Position: Stand tall with floor markers. Action: Take an exaggerated, large-amplitude step forward with right foot while swinging left arm fo',
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
    replacement: `  // 39. LSVT BIG-Style High Amplitude Stepping Drill
  '00000000-0000-0000-0000-000000000039': {
    exerciseId: '00000000-0000-0000-0000-000000000039',
    slug: 'lsvt-big-style-high-amplitude-stepping-drill',
    title: 'LSVT BIG-Style High Amplitude Stepping Drill',
    assetPath: null,
    altText: 'LSVT BIG-Style High Amplitude Stepping Drill rehabilitation protocol.',
    bodyRegion: 'full_body',
    movementPhases: 'Starting Position: Stand tall with floor markers. Action: Take an exaggerated, large-amplitude step forward with right foot while swinging left arm fo',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/lsvt-big-stepping.jpg',
    photoAltText: 'Photograph of fictional older Nigerian male patient performing LSVT BIG high amplitude forward stepping drill with exaggerated stride and open-palm reach in physiotherapy gym.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male older adult, late 50s, warm dark brown skin, salt-and-pepper hair',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: LSVT BIG motor amplitude recalibration mechanics verified (Fox et al., 2012); exaggerated forward stride striking firmly on yellow floor markers; open-palm reciprocal arm extension combating bradykinesia and hypometria; erect spinal posture.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-25T15:15:00Z',
  },`,
  },
  {
    id: '00000000-0000-0000-0000-000000000040',
    target: `  // 40. Dynamic Auditory-Cued Gait Training
  '00000000-0000-0000-0000-000000000040': {
    exerciseId: '00000000-0000-0000-0000-000000000040',
    slug: 'dynamic-auditory-cued-gait-training',
    title: 'Dynamic Auditory-Cued Gait Training',
    assetPath: null,
    altText: 'Dynamic Auditory-Cued Gait Training rehabilitation protocol.',
    bodyRegion: 'full_body',
    movementPhases: 'Starting Position: Stand at start of 20-meter hallway with metronome set to 100-110% baseline cadence. Action: Walk synchronizing heel strikes to rhyt',
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
    replacement: `  // 40. Dynamic Auditory-Cued Gait Training
  '00000000-0000-0000-0000-000000000040': {
    exerciseId: '00000000-0000-0000-0000-000000000040',
    slug: 'dynamic-auditory-cued-gait-training',
    title: 'Dynamic Auditory-Cued Gait Training',
    assetPath: null,
    altText: 'Dynamic Auditory-Cued Gait Training rehabilitation protocol.',
    bodyRegion: 'full_body',
    movementPhases: 'Starting Position: Stand at start of 20-meter hallway with metronome set to 100-110% baseline cadence. Action: Walk synchronizing heel strikes to rhyt',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/auditory-cued-gait.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient performing auditory-cued gait training along a brightly lit clinic corridor with synchronized rhythmic heel strikes.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, mid-50s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Rhythmic auditory stimulation (RAS) gait mechanics verified; active initial contact heel strike with clear ankle dorsiflexion; reciprocal arm swing; upright sagittal spinal alignment; background clinic metronome setup.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-25T15:15:00Z',
  },`,
  },
  {
    id: '00000000-0000-0000-0000-000000000049',
    target: `  // 49. Lateral Bound and Stick (Frontal Plane Deceleration)
  '00000000-0000-0000-0000-000000000049': {
    exerciseId: '00000000-0000-0000-0000-000000000049',
    slug: 'lateral-bound-and-stick-frontal-plane-deceleration',
    title: 'Lateral Bound and Stick (Frontal Plane Deceleration)',
    assetPath: null,
    altText: 'Lateral Bound and Stick (Frontal Plane Deceleration) rehabilitation protocol.',
    bodyRegion: 'full_body',
    movementPhases: 'Starting Position: Athletic stance on right leg. Action: Push off explosively to bound laterally 3-5 feet onto left leg. Land softly absorbing force b',
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
    replacement: `  // 49. Lateral Bound and Stick (Frontal Plane Deceleration)
  '00000000-0000-0000-0000-000000000049': {
    exerciseId: '00000000-0000-0000-0000-000000000049',
    slug: 'lateral-bound-and-stick-frontal-plane-deceleration',
    title: 'Lateral Bound and Stick (Frontal Plane Deceleration)',
    assetPath: null,
    altText: 'Lateral Bound and Stick (Frontal Plane Deceleration) rehabilitation protocol.',
    bodyRegion: 'full_body',
    movementPhases: 'Starting Position: Athletic stance on right leg. Action: Push off explosively to bound laterally 3-5 feet onto left leg. Land softly absorbing force b',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/lateral-bound-and-stick.jpg',
    photoAltText: 'Photograph of fictional Nigerian male athlete sticking single-leg deceleration landing from lateral bound with triple flexion and clean patellofemoral tracking.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male athlete, mid-20s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Frontal plane plyometric deceleration and dynamic knee valgus control verified; single-leg landing absorbed in triple flexion (~35 degree knee flexion, ankle dorsiflexion, hip flexion); knee tracking cleanly over second toe without valgus collapse; level pelvis; arms forward for counterbalance.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-25T15:15:00Z',
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
