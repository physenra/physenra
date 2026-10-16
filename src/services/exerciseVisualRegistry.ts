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
}

/**
 * Standard Physical Therapy Exercise Visual Registry.
 * Provides version-controlled, clinically validated vector medical illustrations
 * mapped 1-to-1 to Physenra system exercises.
 *
 * Strict Compliance Guard:
 * Only assets with clinicalReviewStatus === 'approved' and non-null assetPath
 * are permitted to render in patient-facing UI and print/PDF documents.
 */
export const EXERCISE_VISUALS_REGISTRY: Record<string, ExerciseVisualMetadata> = {
  // 1. Quad Sets
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
  },

  // 2. Straight Leg Raise
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
  },

  // 3. Glute Bridge
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
  },

  // 5. Scapular Retraction
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
  },

  // 6. Pendulum
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
  },

  // 7. Seated Chin Tucks
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
  },

  // 9. Standing Calf Stretch
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
  },

  // 10. Cat-Camel
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
  },

  // 13. Prone Cobra
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
  },

  // 14. Bird-Dog
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
  },

  // 15. Dead Bug
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
  },

  // 16. McKenzie Prone Press-Up
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
  },

  // 17. Side Plank
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
  },

  // 26. Side-Lying Clamshells
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
  },

  // 29. Terminal Knee Extension (TKE)
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
  },

  // 33. Eccentric Heel Drop
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
  },

  // 47. Copenhagen Adductor
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
  },

  // 48. Nordic Hamstring Curl
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
  },

  // 50. 30-Second Chair Stand
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
  },

  // 52. Tandem Stance
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
  },

  // 53. Diaphragmatic Breathing
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
  },

  // 56. Pelvic Floor Muscle Training (Kegels)
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
};

/**
 * Retrieve visual illustration metadata for an exercise ID.
 * Returns null if the exercise has no visual entry or if its visual is not approved.
 */
export function getExerciseVisual(exerciseId: string): ExerciseVisualMetadata | null {
  const meta = EXERCISE_VISUALS_REGISTRY[exerciseId];
  if (!meta) return null;
  if (meta.clinicalReviewStatus !== 'approved' || !meta.assetPath) return null;
  return meta;
}

/**
 * Check whether an exercise has a clinically approved visual illustration ready for patient-facing display.
 */
export function hasApprovedVisual(exerciseId: string): boolean {
  return getExerciseVisual(exerciseId) !== null;
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
