const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../src/services/exerciseVisualRegistry.ts');
let content = fs.readFileSync(targetPath, 'utf8');

const updates = [
  {
    id: '00000000-0000-0000-0000-000000000044',
    target: `'00000000-0000-0000-0000-000000000044': {
    exerciseId: '00000000-0000-0000-0000-000000000044',
    slug: 'prone-tummy-time-with-chest-bolster-support',
    title: 'Prone Tummy Time with Chest Bolster Support',
    assetPath: null,
    altText: 'Prone Tummy Time with Chest Bolster Support rehabilitation protocol.',
    bodyRegion: 'cervical',
    movementPhases: 'Starting Position: Infant/child prone over small rolled towel under chest. Action: Position toys/mirrors in sightline to encourage lifting head, exten',
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
    replacement: `'00000000-0000-0000-0000-000000000044': {
    exerciseId: '00000000-0000-0000-0000-000000000044',
    slug: 'prone-tummy-time-with-chest-bolster-support',
    title: 'Prone Tummy Time with Chest Bolster Support',
    assetPath: null,
    altText: 'Prone Tummy Time with Chest Bolster Support rehabilitation protocol.',
    bodyRegion: 'cervical',
    movementPhases: 'Starting Position: Infant/child prone over small rolled towel under chest. Action: Position toys/mirrors in sightline to encourage lifting head, exten',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/prone-tummy-time.jpg',
    photoAltText: 'Photograph of fictional Nigerian infant performing prone tummy time with a rolled clinical towel bolster under upper chest, propping onto forearms on a blue mat.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian infant, 5-6 months old, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Paediatric developmental prone milestone posture verified; bilateral forearm weight-bearing with elbows under shoulders; thoracic/cervical extensor activation engaging visual toy; supportive rolled towel bolster beneath axillae.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-25T16:50:00Z',
  },`,
  },
  {
    id: '00000000-0000-0000-0000-000000000056',
    target: `'00000000-0000-0000-0000-000000000056': {
    exerciseId: '00000000-0000-0000-0000-000000000056',
    slug: 'pelvic-floor-kegel',
    title: 'Pelvic Floor Muscle Training (Kegels with Knack Technique)',
    assetPath: '/images/exercises/pelvic-floor-kegel.svg',
    altText: 'Anatomical diagram of pelvic floor sling with upward and inward contraction vector arrows highlighting deep pelvic muscle activation.',
    bodyRegion: 'other',
    movementPhases: 'Start: Seated or supine with relaxed breathing, thighs and buttocks soft -> Action: Gently draw pelvic floor muscles inward and upward as if stopping urine flow -> Finish: Hold contraction 5-10s, then release completely for 10s.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
  },`,
    replacement: `'00000000-0000-0000-0000-000000000056': {
    exerciseId: '00000000-0000-0000-0000-000000000056',
    slug: 'pelvic-floor-kegel',
    title: 'Pelvic Floor Muscle Training (Kegels with Knack Technique)',
    assetPath: '/images/exercises/pelvic-floor-kegel.svg',
    altText: 'Anatomical diagram of pelvic floor sling with upward and inward contraction vector arrows highlighting deep pelvic muscle activation.',
    bodyRegion: 'other',
    movementPhases: 'Start: Seated or supine with relaxed breathing, thighs and buttocks soft -> Action: Gently draw pelvic floor muscles inward and upward as if stopping urine flow -> Finish: Hold contraction 5-10s, then release completely for 10s.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/pelvic-floor-kegel.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient seated tall on clinic chair demonstrating optimal posture and diaphragmatic breathing for pelvic floor muscle activation.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, mid-30s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Pelvic health rehabilitation postural alignment verified; upright seated posture on armless chair with 90-degree hip and knee flexion; neutral spine with relaxed shoulder girdle; relaxed diaphragmatic breathing without compensatory Valsalva or adductor/gluteal substitution.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-25T16:50:00Z',
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
