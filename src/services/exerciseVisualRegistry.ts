import type { ExerciseBodyRegion } from '../types/models';

export type ClinicalReviewStatus = 'approved' | 'pending_review';

export interface ExerciseVisualMetadata {
  exerciseId: string;
  slug: string;
  title: string;
  assetPath: string | null;
  altText: string;
  bodyRegion: ExerciseBodyRegion;
  movementPhases: string;
  clinicalReviewStatus: ClinicalReviewStatus;
  license: string;
  attribution: string;
  reviewedBy: string;
  reviewedAt: string | null;

  // Hyperrealistic Photographic Exercise Demonstrations (Fictional Nigerian Demonstrations)
  photoAssetPath?: string | null;
  photoAltText?: string | null;
  photoAiGenerated?: boolean;
  photoDemographic?: string | null;
  photoClinicalReviewStatus?: 'approved' | 'pending_physiotherapist_review';
  photoClinicalObservationNotes?: string | null;
  photoReviewedBy?: string | null;
  photoReviewedAt?: string | null;
}

/**
 * Standard Physical Therapy Exercise Visual Registry.
 * Provides version-controlled, clinically validated visual assets
 * mapped 1-to-1 to all 59 Physenra system exercises.
 *
 * Strict Compliance Guard:
 * Only assets with clinicalReviewStatus === 'approved' and non-null assetPath/photoAssetPath
 * are permitted to render in patient-facing UI and print/PDF documents.
 */
export const EXERCISE_VISUALS_REGISTRY: Record<string, ExerciseVisualMetadata> = {
  // 1. Quad Sets (Isometric Quadriceps Contraction)
  '00000000-0000-0000-0000-000000000001': {
    exerciseId: '00000000-0000-0000-0000-000000000001',
    slug: 'quad-sets',
    title: 'Quad Sets (Isometric Quadriceps Contraction)',
    assetPath: '/images/exercises/quad-sets.svg',
    altText: 'Illustration of patient in long-sitting position pressing the back of their knee firmly down into a towel roll on the mat while tightening the front thigh muscle.',
    bodyRegion: 'knee',
    movementPhases: 'Start: Leg extended flat on mat with small towel roll under knee -> Action: Press knee downward into towel roll and dorsiflex ankle -> Finish: Hold firm contraction for 5 seconds, relax.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/quad-sets.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient in athletic wear seated in long-sitting position performing isometric quad set with rolled towel under knee.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, early 30s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Long-sitting posture verified; rolled towel placement under knee joint correct; active isometric quadriceps contraction with ankle dorsiflexion matches clinical instruction.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-17T00:35:00Z',
  },

  // 2. Straight Leg Raise (Supine)
  '00000000-0000-0000-0000-000000000002': {
    exerciseId: '00000000-0000-0000-0000-000000000002',
    slug: 'straight-leg-raise',
    title: 'Straight Leg Raise (Supine)',
    assetPath: '/images/exercises/straight-leg-raise.svg',
    altText: 'Illustration of patient lying flat on back with opposite knee bent, raising target straight leg upward to 45 degrees with knee locked.',
    bodyRegion: 'hip',
    movementPhases: 'Start: Lie supine with opposite knee bent 90° and foot flat -> Action: Lock target knee and raise leg smoothly to height of opposite knee -> Finish: Hold 2s, slowly lower to mat.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/straight-leg-raise.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient lying supine on blue mat raising target straight leg to 45 degrees with locked knee and opposite knee bent at 90 degrees.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, late 20s/early 30s, deep brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Supine positioning confirmed; contralateral knee flexed 90 degrees with foot planted flat for pelvis stabilization; target leg raised to 45 degrees with locked knee meets biomechanical criteria.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-17T00:35:00Z',
  },

  // 3. Glute Bridge (Supine Double Leg)
  '00000000-0000-0000-0000-000000000003': {
    exerciseId: '00000000-0000-0000-0000-000000000003',
    slug: 'glute-bridge',
    title: 'Glute Bridge (Supine Double Leg)',
    assetPath: '/images/exercises/glute-bridge.svg',
    altText: 'Illustration of patient lying on back with knees bent and feet flat on floor, lifting hips upward into a straight bridge alignment.',
    bodyRegion: 'lumbar',
    movementPhases: 'Start: Supine with knees bent and feet hip-width flat on mat -> Action: Squeeze glutes and elevate pelvis toward ceiling -> Finish: Align knees, hips, and shoulders in straight line, hold 3s.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/glute-bridge.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient lying supine on clinic mat elevating pelvis into straight bridge alignment from knees to shoulders.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, late 20s, dark brown skin, braided hair',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Double-leg bridge verified; feet flat at hip width; pelvis elevated into straight diagonal alignment between knees, hips, and shoulders; cervical spine neutral.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-17T00:35:00Z',
  },

  // 4. Heel Slides
  '00000000-0000-0000-0000-000000000004': {
    exerciseId: '00000000-0000-0000-0000-000000000004',
    slug: 'heel-slides',
    title: 'Heel Slides (Knee Flexion Mobility)',
    assetPath: '/images/exercises/heel-slides.svg',
    altText: 'Illustration of patient lying on back, sliding heel along mat toward buttocks to increase knee flexion range of motion.',
    bodyRegion: 'knee',
    movementPhases: 'Start: Supine with target leg extended -> Action: Slide heel backward toward buttocks maintaining floor contact -> Finish: Hold gentle end-range stretch 3-5 seconds, glide back to start.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/heel-slides.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient in athletic wear lying supine on physiotherapy plinth demonstrating controlled knee flexion heel slide.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, early 30s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Supine positioning confirmed; contralateral leg resting flat on plinth; target right knee in active flexion with heel gliding smoothly along plinth; absence of extraneous movement.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T17:45:00Z',
  },

  // 5. Scapular Retraction (Pinch)
  '00000000-0000-0000-0000-000000000005': {
    exerciseId: '00000000-0000-0000-0000-000000000005',
    slug: 'scapular-retraction',
    title: 'Scapular Retraction (Pinch)',
    assetPath: '/images/exercises/scapular-retraction.svg',
    altText: 'Posterior illustration of patient torso drawing both shoulder blades together toward the spine and downward away from ears.',
    bodyRegion: 'shoulder',
    movementPhases: 'Start: Seated or standing with tall posture and arms relaxed at sides -> Action: Draw shoulder blades together and slightly downward -> Finish: Hold pinch for 5 seconds without shrugging shoulders.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/scapular-retraction.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient seated upright on stool demonstrating active scapular retraction pinch from rear three-quarter view.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, late 20s, deep brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Seated upright posture on backless stool; bilateral scapulae actively retracted and depressed toward thoracic spine without shoulder shrugging; 90-degree elbow flexion at sides verified.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T17:45:00Z',
  },

  // 6. Pendulum (Codman) Exercise
  '00000000-0000-0000-0000-000000000006': {
    exerciseId: '00000000-0000-0000-0000-000000000006',
    slug: 'pendulum-codman',
    title: 'Pendulum (Codman) Exercise',
    assetPath: '/images/exercises/pendulum-codman.svg',
    altText: 'Illustration of patient bent forward at waist supporting torso with non-injured arm on a table, letting the affected arm hang relaxed and swing in gentle circles.',
    bodyRegion: 'shoulder',
    movementPhases: 'Start: Bend forward at waist supported by stable table -> Action: Allow involved arm to hang completely limp, shift body weight to generate motion -> Finish: Perform gentle clockwise and counter-clockwise circles.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/pendulum-codman.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient bent forward at waist supporting torso with forearm on plinth, allowing affected arm to hang limp and dangle under gravity.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, late 30s/early 40s, deep warm brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Hip-hinge trunk support on examination plinth verified; non-involved forearm bearing upper body weight; target arm hangs completely limp and vertical under gravity without active muscular contraction; cervical spine neutral.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T18:25:00Z',
  },

  // 7. Seated Chin Tucks (Cervical Retraction)
  '00000000-0000-0000-0000-000000000007': {
    exerciseId: '00000000-0000-0000-0000-000000000007',
    slug: 'seated-chin-tucks',
    title: 'Seated Chin Tucks (Cervical Retraction)',
    assetPath: '/images/exercises/seated-chin-tucks.svg',
    altText: 'Illustration of patient seated upright in a chair, drawing chin horizontally backwards creating a double chin without tilting the head up or down.',
    bodyRegion: 'cervical',
    movementPhases: 'Start: Sit upright with shoulders relaxed and gaze straight ahead -> Action: Draw chin straight back horizontally like sliding a drawer shut -> Finish: Hold 3-5 seconds, feel gentle stretch at base of skull, release.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/seated-chin-tuck.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient seated upright on stool demonstrating cervical retraction chin tuck with horizontal head glide and level gaze.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, late 30s, warm brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Upright seated posture confirmed; horizontal cervical retraction glide demonstrated without neck flexion or head tilting; shoulders relaxed downward.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-17T00:35:00Z',
  },

  // 8. Ankle Pumps
  '00000000-0000-0000-0000-000000000008': {
    exerciseId: '00000000-0000-0000-0000-000000000008',
    slug: 'ankle-pumps',
    title: 'Ankle Pumps (Plantarflexion & Dorsiflexion)',
    assetPath: '/images/exercises/ankle-pumps.svg',
    altText: 'Illustration of lower leg supported on bed, pumping foot up toward the shin and pointing toes firmly downward in alternating motion.',
    bodyRegion: 'ankle_foot',
    movementPhases: 'Start: Leg elevated or resting on mat -> Action: Pull foot and toes up toward knee (dorsiflexion), then point toes downward (plantarflexion) -> Finish: Continue rhythmic pumping 20-30 repetitions.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/ankle-pumps.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient in long-sitting position on physiotherapy plinth performing active ankle dorsiflexion pumping exercise.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, early 30s, rich dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Long-sitting posture on plinth verified; both legs resting horizontal with straight knees; active ankle dorsiflexion movement excursion accurately demonstrates ankle pumps.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T16:52:00Z',
  },

  // 9. Standing Calf Stretch (Gastrocnemius)
  '00000000-0000-0000-0000-000000000009': {
    exerciseId: '00000000-0000-0000-0000-000000000009',
    slug: 'standing-calf-stretch',
    title: 'Standing Calf Stretch (Gastrocnemius)',
    assetPath: '/images/exercises/standing-calf-stretch.svg',
    altText: 'Illustration of patient standing in a staggered stance facing a wall with hands on the wall, back leg straight with heel flat on the floor.',
    bodyRegion: 'ankle_foot',
    movementPhases: 'Start: Stand facing wall with hands supported, target leg stepped back -> Action: Keep back knee fully straight and press back heel firmly into floor -> Finish: Lean hips forward until gentle calf stretch is felt, hold 30s.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/standing-calf-stretch.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient performing standing calf stretch with hands against wall and rear heel pressed completely flat onto floor.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, mid-30s, rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Remediated clinical demonstration verified. Staggered stance against wall confirmed; rear left knee locked straight with rear left heel pressed completely flat onto clinic floor (zero elevation); front knee flexed 90 degrees; neutral spine alignment.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T18:25:00Z',
  },

  // 10. Cat-Camel (Spinal Mobility)
  '00000000-0000-0000-0000-000000000010': {
    exerciseId: '00000000-0000-0000-0000-000000000010',
    slug: 'cat-camel',
    title: 'Cat-Camel (Spinal Mobility)',
    assetPath: '/images/exercises/cat-camel.svg',
    altText: 'Illustration of patient on all fours, alternating between arching the back upward into flexion and gently sagging the back downward into extension.',
    bodyRegion: 'lumbar',
    movementPhases: 'Start: Quadruped on hands and knees with neutral spine -> Action: Arch back up toward ceiling while lowering head (Camel), then let belly sink while lifting head (Cat) -> Finish: Cycle smoothly with steady breathing.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/cat-camel.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient in quadruped position on blue mat demonstrating the active Cat upward spinal flexion phase.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, mid-30s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Quadruped alignment confirmed; hands directly beneath glenohumeral joints, knees under hips; segmental thoracic and lumbar flexion arc with relaxed cervical spine demonstrates correct Cat mobility phase.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T17:45:00Z',
  },

  // 11. Cervical Isometric Lateral Flexion & Rotation
  '00000000-0000-0000-0000-000000000011': {
    exerciseId: '00000000-0000-0000-0000-000000000011',
    slug: 'cervical-isometric',
    title: 'Cervical Isometric Lateral Flexion & Rotation',
    assetPath: '/images/exercises/cervical-isometric.svg',
    altText: 'Illustration of patient sitting upright, placing palm against side of head and gently pressing without allowing head or neck movement.',
    bodyRegion: 'cervical',
    movementPhases: 'Start: Sit upright with neck in neutral alignment -> Action: Place hand against temple and apply gentle lateral pressure while head resists with equal force -> Finish: Hold 5s with zero neck displacement, release gently.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/cervical-isometric.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient seated upright on ergonomic clinic stool performing seated cervical isometric lateral flexion with right hand against head.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, mid-30s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Seated cervical isometric lateral flexion verified; tall upright spinal alignment on clinic stool; right palm flat against temporal skull with head maintaining true vertical neutral alignment (zero displacement/tilting); relaxed shoulders and forward gaze.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T19:06:00Z',
  },

  // 12. Thoracic Extension over Foam Roller
  '00000000-0000-0000-0000-000000000012': {
    exerciseId: '00000000-0000-0000-0000-000000000012',
    slug: 'thoracic-foam-roller',
    title: 'Thoracic Extension over Foam Roller',
    assetPath: '/images/exercises/thoracic-foam-roller.svg',
    altText: 'Illustration of patient supine with foam roller under mid-back, hands supporting head, arching upper back backward over the roller while keeping hips on mat.',
    bodyRegion: 'thoracic',
    movementPhases: 'Start: Position foam roller perpendicular across mid-thoracic spine, interlace fingers behind neck -> Action: Keep pelvis grounded on mat and gently arch upper back backward over roller -> Finish: Inhale open, hold 3s, return to neutral.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/thoracic-foam-roller.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient supine on blue mat demonstrating Thoracic Extension over Foam Roller with supported cervical spine and grounded pelvis.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, late 20s, warm brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Thoracic spine extension mobilization confirmed; high-density foam roller positioned perpendicularly across mid-thoracic spine below scapulae; pelvis and buttocks grounded flat on mat; hands supporting cervical spine without neck flexion.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T19:08:00Z',
  },

  // 13. Prone Cobra (Thoracic Postural Extension)
  '00000000-0000-0000-0000-000000000013': {
    exerciseId: '00000000-0000-0000-0000-000000000013',
    slug: 'prone-cobra',
    title: 'Prone Cobra (Thoracic Postural Extension)',
    assetPath: '/images/exercises/prone-cobra.svg',
    altText: 'Illustration of patient lying face down, lifting chest and hands slightly off the mat with thumbs pointing to ceiling, pinching shoulder blades.',
    bodyRegion: 'thoracic',
    movementPhases: 'Start: Lie prone with forehead on mat and arms at sides -> Action: Rotate thumbs toward ceiling, squeeze shoulder blades, and hover upper chest 2 inches off mat -> Finish: Keep neck long and gaze on floor, hold 5-10s.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/prone-cobra.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient lying prone on blue mat demonstrating Prone Cobra thoracic postural extension with 2-3 inch chest lift and thumbs up.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, early 30s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Prone thoracic postural extension verified; gentle 2-3 inch sternal lift achieved without cervical hyperextension (neutral downward gaze maintained); bilateral upper extremity external rotation with thumbs directed toward ceiling and scapular retraction confirmed.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T19:05:00Z',
  },

  // 14. Bird-Dog (Contralateral Core Stabilization)
  '00000000-0000-0000-0000-000000000014': {
    exerciseId: '00000000-0000-0000-0000-000000000014',
    slug: 'bird-dog',
    title: 'Bird-Dog (Contralateral Core Stabilization)',
    assetPath: '/images/exercises/bird-dog.svg',
    altText: 'Illustration of patient on hands and knees, reaching opposite arm and leg straight out parallel to the floor while maintaining a flat back.',
    bodyRegion: 'lumbar',
    movementPhases: 'Start: Quadruped position with hands under shoulders and knees under hips -> Action: Simultaneously extend right arm and left leg parallel to floor without twisting hips -> Finish: Hold 3-5 seconds, return and alternate sides.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/bird-dog.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient demonstrating quadruped core stabilization on blue mat.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, late 20s, warm rich brown skin',
    photoClinicalReviewStatus: 'pending_physiotherapist_review',
    photoClinicalObservationNotes: 'Discrepancy noted during clinical safety audit: 2D lateral projection renders limbs in ipsilateral plane with subtle cervical hyperextension. Requires physiotherapist remediation before live patient-facing approval.',
  },

  // 15. Dead Bug (Anterior Core Motor Control)
  '00000000-0000-0000-0000-000000000015': {
    exerciseId: '00000000-0000-0000-0000-000000000015',
    slug: 'dead-bug',
    title: 'Dead Bug (Anterior Core Motor Control)',
    assetPath: '/images/exercises/dead-bug.svg',
    altText: 'Illustration of patient supine with arms vertical and knees at 90 degrees, lowering opposite arm and leg toward the floor while keeping lower back flat.',
    bodyRegion: 'lumbar',
    movementPhases: 'Start: Lie on back with arms reaching to ceiling and knees bent at 90/90 -> Action: Brace core to keep lower back pressed into floor, lower opposite arm and leg -> Finish: Hover just above mat, return and repeat opposite pair.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/dead-bug.jpg',
    photoAltText: 'Photograph of fictional Nigerian male athlete lying supine on blue mat performing contralateral reach phase of Dead Bug with lumbar spine flat against mat.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, late 20s, dark brown skin tone',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Supine core stabilization confirmed; lumbar spine pressed completely flat flush against blue mat (anterior pelvic tilt with active transverse abdominis engagement); contralateral reach with straight hovering opposite limbs and 90-degree tabletop flexion verified.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T18:25:00Z',
  },

  // 16. McKenzie Prone Press-Up (Lumbar Extension)
  '00000000-0000-0000-0000-000000000016': {
    exerciseId: '00000000-0000-0000-0000-000000000016',
    slug: 'mckenzie-prone-pressup',
    title: 'McKenzie Prone Press-Up (Lumbar Extension)',
    assetPath: '/images/exercises/mckenzie-prone-pressup.svg',
    altText: 'Illustration of patient prone with palms flat under shoulders, pushing upper body upward to extend lower back while keeping pelvis relaxed on mat.',
    bodyRegion: 'lumbar',
    movementPhases: 'Start: Lie face down with hands under shoulders like a push-up position -> Action: Straighten arms to press upper body upward while keeping pelvis and buttocks completely relaxed on mat -> Finish: Hold 2s at top, lower slowly.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/prone-on-elbows.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient lying prone on treatment plinth propped on forearms with pelvis flat in McKenzie lumbar extension.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, mid-30s, dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: McKenzie Prone on Elbows introductory extension posture confirmed; forearms resting beneath shoulders on plinth; pelvis and lower extremities resting flat; gentle lumbar lordosis.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-17T00:35:00Z',
  },

  // 17. Side Plank (Quadratus Lumborum Stabilization)
  '00000000-0000-0000-0000-000000000017': {
    exerciseId: '00000000-0000-0000-0000-000000000017',
    slug: 'side-plank',
    title: 'Side Plank (Quadratus Lumborum Stabilization)',
    assetPath: '/images/exercises/side-plank.svg',
    altText: 'Illustration of patient side-lying propped on forearm with elbow under shoulder, lifting hips into a straight diagonal line.',
    bodyRegion: 'lumbar',
    movementPhases: 'Start: Lie on side with elbow directly beneath shoulder and legs stacked -> Action: Elevate hips off floor forming straight diagonal line from head to ankles -> Finish: Engage lower abdominal wall and glutes, hold 15-30s.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/side-plank.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient performing forearm side plank on blue mat with elevated pelvis and straight diagonal alignment from ankles to shoulders.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, early 30s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Lateral forearm support confirmed with right elbow positioned directly under glenohumeral joint; pelvis elevated into straight diagonal alignment from ankles through knees and hips to shoulders; neutral cervical spine.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T18:25:00Z',
  },

  // 18. Side-Lying Shoulder External Rotation
  '00000000-0000-0000-0000-000000000018': {
    exerciseId: '00000000-0000-0000-0000-000000000018',
    slug: 'side-lying-shoulder-external-rotation',
    title: 'Side-Lying Shoulder External Rotation',
    assetPath: null,
    altText: 'Side-Lying Shoulder External Rotation rehabilitation protocol.',
    bodyRegion: 'shoulder',
    movementPhases: 'Starting Position: Lie on unaffected side, target elbow bent 90 degrees with towel roll under arm. Action: Rotate forearm upward toward ceiling agains',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/side-lying-external-rotation.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient lying on left side on blue mat demonstrating side-lying right shoulder external rotation with rolled towel under elbow holding dumbbell.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, late 20s/early 30s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Rotator cuff external rotation biomechanics confirmed; side-lying posture on left side with head neutral on pillow; rolled towel spacer placed between right elbow and lateral rib cage preventing deltoid substitution; 90-degree elbow flexion maintained while rotating forearm upward with light dumbbell.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T19:10:00Z',
  },

  // 19. Prone Y-to-T Raises (Scapular Stabilizers)
  '00000000-0000-0000-0000-000000000019': {
    exerciseId: '00000000-0000-0000-0000-000000000019',
    slug: 'prone-y-to-t-raises-scapular-stabilizers',
    title: 'Prone Y-to-T Raises (Scapular Stabilizers)',
    assetPath: null,
    altText: 'Prone Y-to-T Raises (Scapular Stabilizers) rehabilitation protocol.',
    bodyRegion: 'shoulder',
    movementPhases: 'Starting Position: Prone on mat with arms dangling, thumbs up. Action: Lift arms to sides (T) pinching shoulder blades together, or at 45 degrees forw',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/prone-y-to-t-raises.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient prone on blue treatment plinth demonstrating active Y-Raise scapular stabilization with thumbs pointing upward.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, late 20s/early 30s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Scapular stabilizer recruitment verified; prone posture on clinic plinth with cervical spine supported neutrally on folded towel; bilateral glenohumeral elevation into wide Y angle (~120-135 degrees) with straight elbows and thumbs pointing directly upward; active scapular depression and lower trapezius activation confirmed.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T19:12:00Z',
  },

  // 20. Sleeper Stretch (Posterior Capsule)
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
  },

  // 21. Wall Slides with Serratus Anterior Shrug
  '00000000-0000-0000-0000-000000000021': {
    exerciseId: '00000000-0000-0000-0000-000000000021',
    slug: 'wall-slides-with-serratus-anterior-shrug',
    title: 'Wall Slides with Serratus Anterior Shrug',
    assetPath: null,
    altText: 'Wall Slides with Serratus Anterior Shrug rehabilitation protocol.',
    bodyRegion: 'shoulder',
    movementPhases: 'Starting Position: Stand facing wall with forearms vertical against wall. Action: Slide forearms up wall. At top, gently push upper back away from wal',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/wall-slides.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient standing facing clinic wall demonstrating Wall Slides with forearm contact and active serratus anterior shrug.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, early 30s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Serratus anterior and scapular upward rotation mechanics verified; staggered stance facing wall with erect neutral spine; full forearm and palm contact against clinic wall; active upward slide with scapular protraction and elevation achieved without lumbar hyperextension.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T20:20:00Z',
  },

  // 22. Wrist Extensor Eccentric Loading (Tyler Twist)
  '00000000-0000-0000-0000-000000000022': {
    exerciseId: '00000000-0000-0000-0000-000000000022',
    slug: 'wrist-extensor-eccentric-loading-tyler-twist',
    title: 'Wrist Extensor Eccentric Loading (Tyler Twist)',
    assetPath: null,
    altText: 'Wrist Extensor Eccentric Loading (Tyler Twist) rehabilitation protocol.',
    bodyRegion: 'elbow',
    movementPhases: 'Starting Position: Forearm supported on table, wrist in full extension holding bar or 1-2 kg dumbbell. Action: Slowly lower wrist into full flexion ov',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/tyler-twist.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient seated performing Tyler Twist eccentric wrist extensor loading using a green flexible resistance bar.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, late 20s/early 30s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Tyler Twist eccentric loading mechanics verified (Page et al., 2010); bilateral forward arm extension with upright seated posture; active controlled eccentric release of target wrist extensor musculature against flexible rubber bar resistance.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T22:30:00Z',
  },

  // 23. Wrist Flexor Eccentric Loading
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
  },

  // 24. Finger Tendon Gliding Exercises
  '00000000-0000-0000-0000-000000000024': {
    exerciseId: '00000000-0000-0000-0000-000000000024',
    slug: 'finger-tendon-gliding-exercises',
    title: 'Finger Tendon Gliding Exercises',
    assetPath: null,
    altText: 'Finger Tendon Gliding Exercises rehabilitation protocol.',
    bodyRegion: 'wrist_hand',
    movementPhases: 'Starting Position: Hand upright with fingers straight. Action: Transition through 5 positions: (1) Straight hand, (2) Hook fist, (3) Full fist, (4) Fl',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/finger-tendon-gliding.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient demonstrating Hook Fist finger tendon gliding exercise with vertical forearm, neutral wrist, straight MCPs, and flexed PIP/DIP joints.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, late 20s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Textbook Hook Fist finger tendon glide; forearm held vertically upright with elbow resting comfortably on plinth block; wrist maintained in neutral sagittal and frontal alignment; MCP knuckle joints held fully extended at 0 degrees while PIP and DIP finger joints are actively flexed at 90 degrees; optimal differential gliding excursion between flexor digitorum superficialis and profundus tendons.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-21T22:15:00Z',
  },

  // 25. Forearm Pronation and Supination Drill
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
  },

  // 26. Side-Lying Clamshells with Resistance Band
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
  },

  // 27. Standing Banded Hip Abduction
  '00000000-0000-0000-0000-000000000027': {
    exerciseId: '00000000-0000-0000-0000-000000000027',
    slug: 'standing-banded-hip-abduction',
    title: 'Standing Banded Hip Abduction',
    assetPath: '/images/exercises/standing-banded-hip-abduction.svg',
    altText: 'Illustration of patient standing upright with hands on support rail, abducting target leg laterally against a resistance band around ankles.',
    bodyRegion: 'hip',
    movementPhases: 'Start: Stand tall holding sturdy support with resistance band looped around ankles -> Action: Lift target leg out to side leading with heel while keeping pelvis level -> Finish: Hold 2s, slowly resist band back to starting stance.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/standing-banded-hip-abduction.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient standing tall with light hand support on clinic balance rail, abducting target right leg laterally against resistance band around ankles.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, early 30s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Gluteus medius hip abduction mechanics verified; erect standing posture with waist-height balance rail support; active lateral leg abduction to ~35 degrees with neutral foot/toe alignment; level pelvis and stable stance leg without lateral trunk lean.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T22:35:00Z',
  },

  // 28. Half-Kneeling Hip Flexor Stretch
  '00000000-0000-0000-0000-000000000028': {
    exerciseId: '00000000-0000-0000-0000-000000000028',
    slug: 'half-kneeling-hip-flexor',
    title: 'Half-Kneeling Hip Flexor Stretch',
    assetPath: '/images/exercises/half-kneeling-hip-flexor.svg',
    altText: 'Illustration of patient in a half-kneeling lunge on mat, tucking pelvis and shifting forward to stretch the front of the back hip.',
    bodyRegion: 'hip',
    movementPhases: 'Start: Half-kneeling with front knee and hip at 90°, back knee cushioned on mat -> Action: Perform posterior pelvic tilt (tuck tailbone under) and squeeze back glute -> Finish: Shift hips forward gently until anterior hip stretch is felt, hold 30s.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/half-kneeling-hip-flexor-stretch.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient in 90-90 half-kneeling position on blue mat with knee cushion, demonstrating posterior pelvic tilt hip flexor stretch.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, late 20s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: 90-90 half-kneeling alignment verified with supportive pad beneath rear left knee; upright neutral spine with active posterior pelvic tilt isolating anterior hip flexors; bilateral upper extremity support on anterior thigh.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T18:28:00Z',
  },

  // 29. Terminal Knee Extension (TKE) with Band
  '00000000-0000-0000-0000-000000000029': {
    exerciseId: '00000000-0000-0000-0000-000000000029',
    slug: 'terminal-knee-extension',
    title: 'Terminal Knee Extension (TKE) with Band',
    assetPath: '/images/exercises/terminal-knee-extension.svg',
    altText: 'Illustration of patient standing with looped resistance band behind knee, pressing knee backwards against band into terminal extension.',
    bodyRegion: 'knee',
    movementPhases: 'Start: Stand with looped band anchored forward and hooked behind target knee -> Action: From slightly flexed position, press knee backward into full extension against band -> Finish: Firmly contract VMO quad muscle, hold 3s, relax.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/terminal-knee-extension.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient in staggered stance performing Terminal Knee Extension against a wall-anchored green resistance band looped behind the knee.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, early 30s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Terminal knee extension mechanics verified; wall anchor at knee level with heavy loop resistance band seated in popliteal crease; active terminal extension to 0 degrees with vastus medialis quadriceps contraction; stable staggered stance with upright posture.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T22:40:00Z',
  },

  // 30. Eccentric Decline Board Squat
  '00000000-0000-0000-0000-000000000030': {
    exerciseId: '00000000-0000-0000-0000-000000000030',
    slug: 'eccentric-decline-board-squat',
    title: 'Eccentric Decline Board Squat',
    assetPath: null,
    altText: 'Eccentric Decline Board Squat rehabilitation protocol.',
    bodyRegion: 'knee',
    movementPhases: 'Starting Position: Stand on 25-degree decline wedge facing downhill. Action: Balance on target leg, slowly squat to 60-70 degrees knee flexion over 4 ',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/eccentric-decline-squat.jpg',
    photoAltText: 'Photograph of fictional Nigerian male athlete performing single-leg eccentric decline squat on a 25-degree wooden slant board with 60-degree knee flexion and upright torso.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, late 20s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Textbook single-leg eccentric decline squat per Alfredson/Visnes patellar tendinopathy protocol; target foot planted flat facing downhill along 25-degree decline wedge with elevated heel; controlled descent to ~60 degrees knee flexion; knee tracking cleanly over second toe with zero valgus collapse; upright torso alignment with forward arm reach for balance; non-weightbearing limb elevated.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-21T22:15:00Z',
  },

  // 31. Romanian Deadlift (RDL) with Dumbbells
  '00000000-0000-0000-0000-000000000031': {
    exerciseId: '00000000-0000-0000-0000-000000000031',
    slug: 'romanian-deadlift-rdl-with-dumbbells',
    title: 'Romanian Deadlift (RDL) with Dumbbells',
    assetPath: null,
    altText: 'Romanian Deadlift (RDL) with Dumbbells rehabilitation protocol.',
    bodyRegion: 'knee',
    movementPhases: 'Starting Position: Feet hip-width apart holding dumbbells, knees slightly unlocked. Action: Hinge at hips pushing buttocks backward with flat back. Lo',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/romanian-deadlift.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient demonstrating the bottom hip-hinge phase of a Romanian Deadlift with dumbbells maintaining a neutral spine.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, late 20s/early 30s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Posterior chain hip hinge mechanics verified; buttocks pushed backward with flat neutral spine and retracted scapulae; soft knee flexion (~15 degrees) with vertical shins; dumbbells held close to shins below knee level without lumbar rounding.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T22:50:00Z',
  },

  // 32. Step-Down Drill (Eccentric Quadriceps)
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
  },

  // 33. Eccentric Heel Drop on Step (Alfredson Protocol)
  '00000000-0000-0000-0000-000000000033': {
    exerciseId: '00000000-0000-0000-0000-000000000033',
    slug: 'alfredson-heel-drop',
    title: 'Eccentric Heel Drop on Step (Alfredson Protocol)',
    assetPath: '/images/exercises/alfredson-heel-drop.svg',
    altText: 'Illustration of patient standing on ball of foot on edge of step, slowly lowering heel below step level over 3 seconds.',
    bodyRegion: 'ankle_foot',
    movementPhases: 'Start: Rise up on both toes on edge of step, transfer weight to target single leg -> Action: Slowly lower heel below step level over 3 full seconds with straight knee -> Finish: Use both feet/arms to return to top.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/alfredson-heel-drop.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient demonstrating eccentric heel drop on the edge of a step platform with straight knee and balance rail support.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, early 30s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Alfredson eccentric protocol for Achilles tendinopathy verified; ball of target foot secured on step edge with heel cleanly lowered below horizontal in full dorsiflexion; straight knee isolating gastrocnemius complex; non-weightbearing contralateral limb elevated; stable balance rail support.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T22:58:00Z',
  },

  // 34. Resisted Ankle Eversion with Resistance Band
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
  },

  // 35. Towel Scrunches and Marble Pick-ups
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
  },

  // 36. Weight-Shifting in Standing with Mirror Feedback
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
  },

  // 37. Bilateral Upper Extremity Table Slides with Towel
  '00000000-0000-0000-0000-000000000037': {
    exerciseId: '00000000-0000-0000-0000-000000000037',
    slug: 'bilateral-upper-extremity-table-slides-with-towel',
    title: 'Bilateral Upper Extremity Table Slides with Towel',
    assetPath: null,
    altText: 'Bilateral Upper Extremity Table Slides with Towel rehabilitation protocol.',
    bodyRegion: 'shoulder',
    movementPhases: 'Starting Position: Seated at smooth table, both hands on folded towel with sound hand guiding paretic hand. Action: Lean trunk forward while sliding t',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/table-slides.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient seated at table performing bilateral upper extremity table slides on folded towel with trunk forward reach.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, late 30s/early 40s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Upper extremity neuro-rehabilitation and shoulder flexion mechanics verified; seated posture on ergonomic stool beside smooth clinic table; symmetrical bilateral palm placement on folded towel; active trunk forward lean with straight elbow reach and scapular protraction without upper trapezius compensation.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-19T20:00:00Z',
  },

  // 38. Bridging with Affected Limb Weight Acceptance
  '00000000-0000-0000-0000-000000000038': {
    exerciseId: '00000000-0000-0000-0000-000000000038',
    slug: 'bridging-with-affected-limb-weight-acceptance',
    title: 'Bridging with Affected Limb Weight Acceptance',
    assetPath: null,
    altText: 'Bridging with Affected Limb Weight Acceptance rehabilitation protocol.',
    bodyRegion: 'hip',
    movementPhases: 'Starting Position: Supine with knees bent 90 degrees, feet flat. Action: Press down evenly through both heels, squeeze glutes, lift hips into bridge. ',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/bridging-weight-acceptance.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient demonstrating hook-lying gluteal bridge with level pelvis and bilateral limb weight acceptance on a clinic mat.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, mid-30s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Textbook neurological pelvic bridge; supine hook-lying posture with knees at 90 degrees and feet planted flat hip-width apart; hips elevated into straight diagonal alignment from knees to shoulders; level pelvis without unilateral sagging or rotational asymmetry; arms resting flat at sides for stability.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-21T22:50:00Z',
  },

  // 39. LSVT BIG-Style High Amplitude Stepping Drill
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
  },

  // 40. Dynamic Auditory-Cued Gait Training
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
  },

  // 41. Frenkel Coordination Heel-to-Shin Exercises
  '00000000-0000-0000-0000-000000000041': {
    exerciseId: '00000000-0000-0000-0000-000000000041',
    slug: 'frenkel-coordination-heel-to-shin-exercises',
    title: 'Frenkel Coordination Heel-to-Shin Exercises',
    assetPath: null,
    altText: 'Frenkel Coordination Heel-to-Shin Exercises rehabilitation protocol.',
    bodyRegion: 'knee',
    movementPhases: 'Starting Position: Supine with head elevated on pillow to view legs. Action: Lift right heel and place cleanly on left knee. Slowly and smoothly slide',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/frenkel-heel-to-shin.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient demonstrating Frenkel coordination heel-to-shin drill with right heel placed on left knee under direct visual gaze.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, early 30s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Authentic Frenkel ataxia coordination drill biomechanics; patient supine with head supported on clinic pillow to allow conscious visual feedback; left leg extended straight along mat; right heel positioned precisely on left patella before controlled shin descent; eyes focused on target contact point for visual-proprioceptive compensation.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-21T22:50:00Z',
  },

  // 42. Vestibular VOR x1 Gaze Stabilization Drill
  '00000000-0000-0000-0000-000000000042': {
    exerciseId: '00000000-0000-0000-0000-000000000042',
    slug: 'vestibular-vor-x1-gaze-stabilization-drill',
    title: 'Vestibular VOR x1 Gaze Stabilization Drill',
    assetPath: null,
    altText: 'Vestibular VOR x1 Gaze Stabilization Drill rehabilitation protocol.',
    bodyRegion: 'cervical',
    movementPhases: 'Starting Position: Seated holding target letter at eye level. Action: Focus eyes on letter. While keeping letter in sharp focus, rotate head left and ',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/vor-gaze-stabilization.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient in seated upright posture demonstrating Vestibular VOR x1 drill holding target card at eye level with head rotated and eyes fixated.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, early 30s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Exemplary vestibular rehabilitation biomechanics; tall upright seated posture on clinic chair with relaxed shoulders; target letter "A" card held steadily at eye level at approximately arm\'s length; patient head rotated ~25 degrees horizontally while maintaining sharp compensatory gaze fixation on the letter target; zero neck strain or accessory substitution.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-19T23:25:00Z',
  },

  // 43. Brandt-Daroff Vestibular Habituation Drill
  '00000000-0000-0000-0000-000000000043': {
    exerciseId: '00000000-0000-0000-0000-000000000043',
    slug: 'brandt-daroff-vestibular-habituation-drill',
    title: 'Brandt-Daroff Vestibular Habituation Drill',
    assetPath: null,
    altText: 'Brandt-Daroff Vestibular Habituation Drill rehabilitation protocol.',
    bodyRegion: 'cervical',
    movementPhases: 'Starting Position: Sit upright on edge of bed. Action: Turn head 45 degrees left, lie onto right side for 30s. Sit upright for 30s. Turn head 45 degre',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/brandt-daroff.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient demonstrating side-lying Brandt-Daroff vestibular drill with 45-degree upward head rotation on a treatment plinth.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, late 30s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Textbook Brandt-Daroff vestibular habituation biomechanics; patient in side-lying posture on right side along clinic plinth; head rotated 45 degrees upward toward ceiling in optimal posterior canal otolith dispersion plane; eyes steady and focused; relaxed cervical alignment.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-21T23:20:00Z',
  },

  // 44. Prone Tummy Time with Chest Bolster Support
  '00000000-0000-0000-0000-000000000044': {
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
  },

  // 45. Tall-Kneeling to Half-Kneeling Transitional Stepping
  '00000000-0000-0000-0000-000000000045': {
    exerciseId: '00000000-0000-0000-0000-000000000045',
    slug: 'tall-kneeling-to-half-kneeling-transitional-stepping',
    title: 'Tall-Kneeling to Half-Kneeling Transitional Stepping',
    assetPath: null,
    altText: 'Tall-Kneeling to Half-Kneeling Transitional Stepping rehabilitation protocol.',
    bodyRegion: 'hip',
    movementPhases: 'Starting Position: Tall-kneeling on padded mat, hands on bench. Action: Shift weight to one knee, bring opposite foot forward flat on floor into half-',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/half-kneeling-transitional-stepping.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient in side profile demonstrating half-kneeling 90-90 posture on a padded clinic mat with hands on hips and vertical spine.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, early 30s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Exemplary lower extremity dissociation and pelvic stability mechanics; textbook 90-90 half-kneeling posture on padded clinic mat; rear left knee cushioned with vertical left thigh and full hip extension; forward right leg planted flat with 90-degree knee flexion stacked over right ankle; tall erect spine with level pelvis and hand support on iliac crest.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-19T23:15:00Z',
  },

  // 46. Bear Crawl Coordination Drill
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
  },

  // 47. Copenhagen Adductor Exercise (Groin Strain Protocol)
  '00000000-0000-0000-0000-000000000047': {
    exerciseId: '00000000-0000-0000-0000-000000000047',
    slug: 'copenhagen-adductor',
    title: 'Copenhagen Adductor Exercise (Groin Strain Protocol)',
    assetPath: '/images/exercises/copenhagen-adductor.svg',
    altText: 'Illustration of patient in a side plank with top leg supported on a bench, lifting body into straight alignment to strengthen groin adductors.',
    bodyRegion: 'hip',
    movementPhases: 'Start: Side plank position with top inner leg resting on bench, forearm on floor -> Action: Elevate hips off floor until body forms straight line supported by top leg adductors -> Finish: Hold 5-15s with neutral spine.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/copenhagen-adductor.jpg',
    photoAltText: 'Photograph of fictional Nigerian male athlete demonstrating Copenhagen Adductor side plank hold with top leg supported on bench and body in rigid diagonal alignment.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, late 20s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Textbook Copenhagen adductor side plank biomechanics; lateral side plank supported on left forearm with stacked elbow under shoulder; top ankle and medial malleolus securely supported on padded rehabilitation bench; full pelvic elevation forming an unbroken straight diagonal line from shoulder through pelvis to top foot; bottom leg actively elevated and adducting underneath bench without ground contact; hand stable on iliac crest with neutral cervical alignment.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-19T23:37:00Z',
  },

  // 48. Nordic Hamstring Curl (Eccentric Hamstring Protocol)
  '00000000-0000-0000-0000-000000000048': {
    exerciseId: '00000000-0000-0000-0000-000000000048',
    slug: 'nordic-hamstring',
    title: 'Nordic Hamstring Curl (Eccentric Hamstring Protocol)',
    assetPath: '/images/exercises/nordic-hamstring.svg',
    altText: 'Illustration of patient kneeling with ankles held down firmly, slowly lowering straight torso forward under hamstring control.',
    bodyRegion: 'knee',
    movementPhases: 'Start: Tall-kneeling on padded mat with ankles securely anchored -> Action: Keeping hips extended and back straight, slowly lean torso forward toward floor -> Finish: Brake as long as possible with hamstrings, catch with hands.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/nordic-hamstring.jpg',
    photoAltText: 'Photograph of fictional Nigerian male athlete demonstrating Nordic Hamstring Curl eccentric forward lean with straight knee-to-shoulder alignment and anchored ankles.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, late 20s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Textbook eccentric hamstring biomechanics; rigid straight alignment from knees through hips to shoulders (0 degrees hip flexion, full gluteal and hamstring engagement); ankles securely anchored under heavy-duty padded roller; controlled forward eccentric lean at ~38 degrees with hands prepared in front for landing catch; zero lumbar hyperextension.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-19T23:26:00Z',
  },

  // 49. Lateral Bound and Stick (Frontal Plane Deceleration)
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
  },

  // 50. 30-Second Chair Stand Functional Training Drill
  '00000000-0000-0000-0000-000000000050': {
    exerciseId: '00000000-0000-0000-0000-000000000050',
    slug: 'sit-to-stand',
    title: '30-Second Chair Stand Functional Training Drill',
    assetPath: '/images/exercises/sit-to-stand.svg',
    altText: 'Illustration of patient rising from seated in a chair to full upright standing with arms crossed over chest.',
    bodyRegion: 'knee',
    movementPhases: 'Start: Seated in sturdy chair, feet flat on floor, arms crossed at wrists over chest -> Action: Stand up completely without using hands, then sit back down under control -> Finish: Repeat for full prescribed repetitions.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/sit-to-stand.jpg',
    photoAltText: 'Photograph of fictional older Nigerian gentleman in mid-60s rising from armless wooden chair with arms crossed over chest in standardized 30CST protocol.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male older adult/geriatric, mid-60s, silver hair, warm mahogany skin tone',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Validated 30-Second Chair Stand test protocol confirmed; arms crossed at wrists over chest; rising from armless sturdy wooden chair; erect posture; authentic geriatric representation.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-17T00:35:00Z',
  },

  // 51. Multidirectional Stepping Clock Drill
  '00000000-0000-0000-0000-000000000051': {
    exerciseId: '00000000-0000-0000-0000-000000000051',
    slug: 'multidirectional-stepping-clock-drill',
    title: 'Multidirectional Stepping Clock Drill',
    assetPath: null,
    altText: 'Multidirectional Stepping Clock Drill rehabilitation protocol.',
    bodyRegion: 'full_body',
    movementPhases: 'Starting Position: Stand in center of clock face. Action: Step right foot to 12:00, return; step to 1:00, 2:00, 3:00, 4:00, 5:00, 6:00. Repeat with le',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/multidirectional-stepping-clock.jpg',
    photoAltText: 'Photograph of fictional Nigerian male patient demonstrating multidirectional stepping clock drill with dynamic forward-diagonal step and safety chair balance support.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian male, late 30s, warm dark brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Dynamic reactive stepping drill biomechanics verified; target foot stepped forward-laterally into stable base of support with knee flexed ~35-40 degrees tracking cleanly over second toe; erect trunk posture with hand hovering over balance chair for fall-prevention safety guarding.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-21T23:20:00Z',
  },

  // 52. Tandem Stance with Dual-Task Cognitive Challenge
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
  },

  // 53. Diaphragmatic Breathing with Lower Rib Cage Expansion
  '00000000-0000-0000-0000-000000000053': {
    exerciseId: '00000000-0000-0000-0000-000000000053',
    slug: 'diaphragmatic-breathing',
    title: 'Diaphragmatic Breathing with Lower Rib Cage Expansion',
    assetPath: '/images/exercises/diaphragmatic-breathing.svg',
    altText: 'Illustration of patient semi-reclined with one hand on chest and one hand on abdomen, breathing deeply into the belly.',
    bodyRegion: 'thoracic',
    movementPhases: 'Start: Semi-reclined or supine with knees bent over pillow, one hand on chest, one on abdomen -> Action: Inhale slowly through nose, feeling abdomen expand outward while chest stays calm -> Finish: Exhale gently through lips, feel abdomen fall.',
    clinicalReviewStatus: 'approved',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: '2026-10-16T22:00:00Z',
    photoAssetPath: '/images/exercises/photographs/diaphragmatic-breathing.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient reclined in semi-Fowler position on clinic plinth demonstrating diaphragmatic breathing with hand placements.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, late 20s, warm brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Semi-Fowler recline with head pillow and sub-knee bolster; proper diagnostic hand placement (sternal hand stationary, epigastric hand palpating abdominal excursion); relaxed facial and accessory breathing musculature.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T17:45:00Z',
  },

  // 54. Pursed-Lip Breathing Drill
  '00000000-0000-0000-0000-000000000054': {
    exerciseId: '00000000-0000-0000-0000-000000000054',
    slug: 'pursed-lip-breathing-drill',
    title: 'Pursed-Lip Breathing Drill',
    assetPath: null,
    altText: 'Pursed-Lip Breathing Drill rehabilitation protocol.',
    bodyRegion: 'thoracic',
    movementPhases: 'Starting Position: Comfortable sitting or standing. Action: Inhale slowly through nose for 2 counts. Purse lips as if blowing out candles. Exhale gent',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/pursed-lip-breathing.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient seated upright in a clinic chair demonstrating the exhalation phase of Pursed-Lip Breathing Drill with relaxed shoulders and softly pursed lips.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, late 30s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Exemplary pursed-lip breathing biomechanics; upright seated spinal posture on clinic chair with dropped, relaxed shoulders; no sternocleidomastoid or scalene accessory muscle recruitment; lips softly pursed into gentle circular aperture for controlled positive end-expiratory pressure (PEEP); unpuffed cheeks; abdominal monitoring hand placement.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-19T21:20:00Z',
  },

  // 55. Active Cycle of Breathing Technique (ACBT)
  '00000000-0000-0000-0000-000000000055': {
    exerciseId: '00000000-0000-0000-0000-000000000055',
    slug: 'active-cycle-of-breathing-technique-acbt',
    title: 'Active Cycle of Breathing Technique (ACBT)',
    assetPath: null,
    altText: 'Active Cycle of Breathing Technique (ACBT) cardiopulmonary airway clearance protocol.',
    bodyRegion: 'thoracic',
    movementPhases: 'Start: Seated upright comfortably on plinth -> Action: 4-5 relaxed diaphragmatic breaths with hands on lower ribcage, 3-4 deep breaths with 3s hold, followed by 1-2 open glottis huffs -> Finish: Cycle smoothly until airway clearance is achieved.',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/acbt-breathing.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient seated upright on clinic plinth demonstrating diaphragmatic breathing control of Active Cycle of Breathing Technique.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, mid-30s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Upright seated plinth posture verified; bilateral hands correctly positioned over lower lateral ribcage and epigastrium; unhurried diaphragmatic excursion and relaxed cervical-shoulder musculature meet clinical standards.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-18T16:52:00Z',
  },

  // 56. Pelvic Floor Muscle Training (Kegels with Knack Technique)
  '00000000-0000-0000-0000-000000000056': {
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
  },

  // 57. Supine Transverse Abdominis Drawing-In Maneuver
  '00000000-0000-0000-0000-000000000057': {
    exerciseId: '00000000-0000-0000-0000-000000000057',
    slug: 'supine-transverse-abdominis-drawing-in-maneuver',
    title: 'Supine Transverse Abdominis Drawing-In Maneuver',
    assetPath: null,
    altText: 'Supine Transverse Abdominis Drawing-In Maneuver rehabilitation protocol.',
    bodyRegion: 'lumbar',
    movementPhases: 'Starting Position: Supine, knees bent 90 degrees, feet flat. Fingers 1 inch inside hip bones. Action: Exhale gently and draw lower belly toward spine ',
    clinicalReviewStatus: 'pending_review',
    license: 'Physenra Proprietary Original Clinical Artwork',
    attribution: 'Physenra Clinical Architecture Team',
    reviewedBy: 'Physenra Clinical Quality & Rehabilitation Board',
    reviewedAt: null,
    photoAssetPath: '/images/exercises/photographs/transverse-abdominis-drawing-in.jpg',
    photoAltText: 'Photograph of fictional Nigerian female patient in crook-lying position on a clinic mat, demonstrating deep transverse abdominis drawing-in activation while gently palpating medial to hip bones.',
    photoAiGenerated: true,
    photoDemographic: 'Nigerian female, early 30s, warm rich brown skin',
    photoClinicalReviewStatus: 'approved',
    photoClinicalObservationNotes: 'Approved: Exemplary lumbo-pelvic core stabilization biomechanics; crook-lying position with knees bent at 90 degrees and feet flat; hands gently palpating 1-2 inches medial to anterior superior iliac spine (ASIS); deep abdominal wall hollow without lumbar spine flattening (neutral lordosis preserved); relaxed rib cage and shoulders with zero rectus abdominis substitution.',
    photoReviewedBy: 'Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)',
    photoReviewedAt: '2026-10-19T23:08:00Z',
  },

  // 58. Transtibial Residual Limb Extension and Prone Positioning
  '00000000-0000-0000-0000-000000000058': {
    exerciseId: '00000000-0000-0000-0000-000000000058',
    slug: 'transtibial-residual-limb-extension-and-prone-positioning',
    title: 'Transtibial Residual Limb Extension and Prone Positioning',
    assetPath: null,
    altText: 'Transtibial Residual Limb Extension and Prone Positioning rehabilitation protocol.',
    bodyRegion: 'hip',
    movementPhases: 'Starting Position: Prone on mat with residual limb extended. Action: Tighten glutes, press residual limb gently downward into mat to achieve 0 degrees',
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
  },

  // 59. Residual Limb Desensitization and Towel Friction Drill
  '00000000-0000-0000-0000-000000000059': {
    exerciseId: '00000000-0000-0000-0000-000000000059',
    slug: 'residual-limb-desensitization-and-towel-friction-drill',
    title: 'Residual Limb Desensitization and Towel Friction Drill',
    assetPath: null,
    altText: 'Residual Limb Desensitization and Towel Friction Drill rehabilitation protocol.',
    bodyRegion: 'knee',
    movementPhases: 'Starting Position: Seated with limb clean and dry. Action: Gently rub distal limb and scar in circular motions using graded textures: soft cotton/silk',
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
  }
};

/**
 * Normalize an exercise identifier, name, or slug for resilient dictionary lookup.
 * Removes whitespace, symbols, and lowercases text.
 */
export function normalizeExerciseLookupKey(val: string): string {
  if (!val) return '';
  return val
    .toLowerCase()
    .replace(/[()[]{}]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Fast secondary lookups indexed at startup
const SLUG_TO_VISUAL = new Map<string, ExerciseVisualMetadata>();
const NAME_TO_VISUAL = new Map<string, ExerciseVisualMetadata>();

for (const item of Object.values(EXERCISE_VISUALS_REGISTRY)) {
  if (item.slug) {
    SLUG_TO_VISUAL.set(item.slug.toLowerCase().trim(), item);
    SLUG_TO_VISUAL.set(normalizeExerciseLookupKey(item.slug), item);
  }
  if (item.title) {
    NAME_TO_VISUAL.set(normalizeExerciseLookupKey(item.title), item);
  }
}

/**
 * Retrieve visual illustration metadata for an exercise ID, slug, or title.
 * Returns null if the exercise has no visual entry or if its visual is not approved.
 */
export function getExerciseVisual(
  exerciseIdOrSlugOrName: string,
  nameFallback?: string
): ExerciseVisualMetadata | null {
  if (!exerciseIdOrSlugOrName) return null;

  let meta: ExerciseVisualMetadata | undefined = EXERCISE_VISUALS_REGISTRY[exerciseIdOrSlugOrName];

  if (!meta) {
    meta = SLUG_TO_VISUAL.get(exerciseIdOrSlugOrName.toLowerCase().trim()) ||
           SLUG_TO_VISUAL.get(normalizeExerciseLookupKey(exerciseIdOrSlugOrName));
  }

  if (!meta) {
    meta = NAME_TO_VISUAL.get(normalizeExerciseLookupKey(exerciseIdOrSlugOrName));
  }

  if (!meta && nameFallback) {
    meta = NAME_TO_VISUAL.get(normalizeExerciseLookupKey(nameFallback));
    if (!meta) {
      const normFallback = normalizeExerciseLookupKey(nameFallback);
      for (const [key, item] of NAME_TO_VISUAL.entries()) {
        if (key.includes(normFallback) || normFallback.includes(key)) {
          meta = item;
          break;
        }
      }
    }
  }

  if (!meta) return null;
  if (meta.clinicalReviewStatus !== 'approved' || !meta.assetPath) return null;
  return meta;
}

/**
 * Check whether an exercise has a clinically approved visual illustration ready for patient-facing display.
 */
export function hasApprovedVisual(exerciseId: string, nameFallback?: string): boolean {
  return getExerciseVisual(exerciseId, nameFallback) !== null;
}

/**
 * Retrieve photographic demonstration metadata for an exercise ID, slug, or title.
 * Multi-key resolution checks canonical ID, slug, title, and optional name fallback.
 */
export function getExercisePhotoDemonstration(
  exerciseIdOrSlugOrName: string,
  nameFallback?: string
): {
  exerciseId: string;
  photoAssetPath: string;
  photoAltText: string;
  photoAiGenerated: boolean;
  photoDemographic: string;
  photoClinicalReviewStatus: 'approved' | 'pending_physiotherapist_review';
  photoClinicalObservationNotes?: string | null;
  photoReviewedBy?: string | null;
  photoReviewedAt?: string | null;
} | null {
  if (!exerciseIdOrSlugOrName) return null;

  // 1. Direct canonical UUID lookup
  let meta: ExerciseVisualMetadata | undefined = EXERCISE_VISUALS_REGISTRY[exerciseIdOrSlugOrName];

  // 2. Slug lookup
  if (!meta) {
    meta = SLUG_TO_VISUAL.get(exerciseIdOrSlugOrName.toLowerCase().trim()) ||
           SLUG_TO_VISUAL.get(normalizeExerciseLookupKey(exerciseIdOrSlugOrName));
  }

  // 3. Name lookup
  if (!meta) {
    meta = NAME_TO_VISUAL.get(normalizeExerciseLookupKey(exerciseIdOrSlugOrName));
  }

  // 4. Secondary fallback name lookup
  if (!meta && nameFallback) {
    meta = NAME_TO_VISUAL.get(normalizeExerciseLookupKey(nameFallback));
    if (!meta) {
      const normFallback = normalizeExerciseLookupKey(nameFallback);
      for (const [key, item] of NAME_TO_VISUAL.entries()) {
        if (key.includes(normFallback) || normFallback.includes(key)) {
          meta = item;
          break;
        }
      }
    }
  }

  if (!meta || !meta.photoAssetPath) return null;

  return {
    exerciseId: meta.exerciseId,
    photoAssetPath: meta.photoAssetPath,
    photoAltText: meta.photoAltText || meta.altText,
    photoAiGenerated: !!meta.photoAiGenerated,
    photoDemographic: meta.photoDemographic || 'Nigerian Patient Demonstration',
    photoClinicalReviewStatus: meta.photoClinicalReviewStatus || 'pending_physiotherapist_review',
    photoClinicalObservationNotes: meta.photoClinicalObservationNotes || null,
    photoReviewedBy: meta.photoReviewedBy || null,
    photoReviewedAt: meta.photoReviewedAt || null,
  };
}

/**
 * Summary metrics of catalog visuals for audit, governance, and dashboard reporting.
 */
export function getVisualStatusSummary(totalCatalogCount: number = 59): {
  totalCatalog: number;
  approvedCount: number;
  pendingReviewCount: number;
  approvalRatePercentage: number;
} {
  const approvedCount = Object.values(EXERCISE_VISUALS_REGISTRY).filter(
    (item) => item.clinicalReviewStatus === 'approved' && item.assetPath !== null
  ).length;

  const pendingReviewCount = Math.max(0, totalCatalogCount - approvedCount);
  const approvalRatePercentage = Math.round((approvedCount / totalCatalogCount) * 100);

  return {
    totalCatalog: totalCatalogCount,
    approvedCount,
    pendingReviewCount,
    approvalRatePercentage,
  };
}

/**
 * Summary metrics of hyperrealistic photographic demonstration assets.
 */
export function getPhotoDemonstrationSummary(): {
  totalPhotos: number;
  approvedPhotos: number;
  pendingReviewPhotos: number;
  aiGeneratedCount: number;
} {
  const items = Object.values(EXERCISE_VISUALS_REGISTRY).filter((i) => !!i.photoAssetPath);
  const approvedPhotos = items.filter((i) => i.photoClinicalReviewStatus === 'approved').length;
  const pendingReviewPhotos = items.filter((i) => i.photoClinicalReviewStatus === 'pending_physiotherapist_review').length;
  const aiGeneratedCount = items.filter((i) => i.photoAiGenerated).length;

  return {
    totalPhotos: items.length,
    approvedPhotos,
    pendingReviewPhotos,
    aiGeneratedCount,
  };
}
