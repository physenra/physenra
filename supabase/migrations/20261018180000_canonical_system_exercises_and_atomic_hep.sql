-- ==============================================================================
-- PHYSENRA DATABASE MIGRATION: CANONICAL SYSTEM EXERCISES & ATOMIC HEP RPC
-- Timestamp: 20261018180000_canonical_system_exercises_and_atomic_hep.sql
--
-- Domains:
-- 1. Canonical Evidence-Based System Exercises (public.exercises)
--    - Ensures all 59 standardized system exercises are seeded with stable canonical UUIDs
--    - Idempotent upsert matching on lower(trim(name)) and primary key id
-- 2. Atomic Home Exercise Program Creation RPC (public.create_home_exercise_program_atomic)
--    - Encapsulates program header and prescribed items in a single atomic transaction
--    - Eliminates foreign key race conditions and orphan draft programs
--    - Tenant-isolated and protected by clinician role validation
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CANONICAL SYSTEM EXERCISES SEEDING (ALL 59 EXERCISES)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_rec RECORD;
BEGIN
  -- Insert or update each canonical system exercise safely
  FOR v_rec IN (
    SELECT * FROM (
      VALUES
(
  '00000000-0000-0000-0000-000000000001'::uuid,
  NULL,
  true,
  'Quad Sets (Isometric Quadriceps Contraction)',
  'strengthening'::public.exercise_category,
  'knee'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Towel roll (optional)',
  'Foundational isometric quadriceps activation and extension lag reduction.',
  'Starting Position: Lie supine or sit with target leg extended flat. Action: Tighten thigh muscles by pressing back of knee downward into mat or small towel roll. Pull toes toward shin. Hold for 5 seconds, then relax.',
  'Avoid breath holding. Do not press into severe anterior knee pain.',
  true
),
(
  '00000000-0000-0000-0000-000000000002'::uuid,
  NULL,
  true,
  'Straight Leg Raise (Supine)',
  'strengthening'::public.exercise_category,
  'hip'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'None / Mat',
  'Active hip flexion strengthening with locked knee extension.',
  'Starting Position: Lie on back with opposite knee bent and foot flat on mat. Target leg straight. Action: Perform quad set to lock knee, then slowly raise leg to height of opposite knee (approx 45 degrees). Hold 2 seconds, lower slowly.',
  'Do not allow lumbar spine to arch; maintain core brace. Discontinue if extensor lag is present.',
  true
),
(
  '00000000-0000-0000-0000-000000000003'::uuid,
  NULL,
  true,
  'Glute Bridge (Supine Double Leg)',
  'strengthening'::public.exercise_category,
  'lumbar'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'None / Mat',
  'Gluteus maximus and posterior chain activation with core stabilization.',
  'Starting Position: Lie supine with knees bent to 90 degrees and feet flat hip-width apart. Action: Squeeze buttocks and lift hips until knees, hips, and shoulders form a straight line. Hold 3-5 seconds, then lower under control.',
  'Do not hyperextend lumbar spine. Squeeze glutes rather than straining lower back.',
  true
),
(
  '00000000-0000-0000-0000-000000000004'::uuid,
  NULL,
  true,
  'Heel Slides',
  'mobility'::public.exercise_category,
  'knee'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Smooth surface or towel',
  'Active-assisted or active knee flexion mobility exercise in supine position.',
  'Starting Position: Lie on your back with legs straight. Action: Slowly slide heel of target leg toward your buttocks, bending knee as far as comfortable. Hold briefly, then slide back.',
  'Do not force past severe pain thresholds; maintain smooth sliding motion.',
  true
),
(
  '00000000-0000-0000-0000-000000000005'::uuid,
  NULL,
  true,
  'Scapular Retraction (Pinch)',
  'strengthening'::public.exercise_category,
  'shoulder'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'None / Chair',
  'Postural correction and scapular stabilizer activation exercise.',
  'Starting Position: Sit tall with shoulders relaxed. Action: Squeeze shoulder blades backward and downward as if pinching a pencil between them. Hold for prescribed seconds, then release.',
  'Do not shrug shoulders upward toward ears during contraction.',
  true
),
(
  '00000000-0000-0000-0000-000000000006'::uuid,
  NULL,
  true,
  'Pendulum (Codman) Exercise',
  'mobility'::public.exercise_category,
  'shoulder'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Table or counter support',
  'Passive glenohumeral decompression and gentle early active-assisted shoulder mobility.',
  'Starting Position: Lean forward supporting unaffected arm on table. Action: Allow target arm to dangle freely. Initiate gentle circular sway using torso momentum, not arm muscles.',
  'Ensure the arm hangs completely limp without active shoulder muscle contraction.',
  true
),
(
  '00000000-0000-0000-0000-000000000007'::uuid,
  NULL,
  true,
  'Seated Chin Tucks (Cervical Retraction)',
  'mobility'::public.exercise_category,
  'cervical'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Chair',
  'Deep cervical flexor activation and forward head posture correction.',
  'Starting Position: Sit upright with eyes forward. Action: Gently glide head backward, creating a subtle double chin while keeping eyes level. Hold briefly, then return to neutral.',
  'Do not tilt head up or down; movement is a horizontal glide.',
  true
),
(
  '00000000-0000-0000-0000-000000000008'::uuid,
  NULL,
  true,
  'Ankle Pumps',
  'mobility'::public.exercise_category,
  'ankle_foot'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'None',
  'Ankle range of motion and lower extremity venous thromboembolism prevention exercise.',
  'Starting Position: Reclined or seated. Action: Point toes downward away from body, then pull toes upward toward shin as far as comfortable. Alternate in a rhythmic pumping motion.',
  'Ensure calf activation without inducing severe Achilles discomfort.',
  true
),
(
  '00000000-0000-0000-0000-000000000009'::uuid,
  NULL,
  true,
  'Standing Calf Stretch (Gastrocnemius)',
  'stretching'::public.exercise_category,
  'ankle_foot'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Wall',
  'Static stretching of gastrocnemius muscle group.',
  'Starting Position: Stand facing a wall. Action: Target leg back with knee straight and heel flat on floor. Lean forward into wall until gentle stretch is felt in back of calf.',
  'Keep back heel firmly planted on floor and toes pointed straight ahead.',
  true
),
(
  '00000000-0000-0000-0000-000000000010'::uuid,
  NULL,
  true,
  'Cat-Camel (Spinal Mobility)',
  'mobility'::public.exercise_category,
  'lumbar'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Mat',
  'Segmental spinal flexion and extension mobility drill in quadruped position.',
  'Starting Position: Hands and knees with wrists under shoulders and knees under hips. Action: Arch back upward toward ceiling lowering head (cat), then gently sag belly toward floor lifting head (camel).',
  'Perform within pain-free movement excursion; avoid forcing end-range extension.',
  true
),
(
  '00000000-0000-0000-0000-000000000011'::uuid,
  NULL,
  true,
  'Cervical Isometric Lateral Flexion & Rotation',
  'strengthening'::public.exercise_category,
  'cervical'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'None / Hand Resistance',
  'Isometric deep and superficial cervical stabilizer conditioning in neutral alignment.',
  'Starting Position: Sit or stand tall in neutral alignment. Action: Place palm against side of head. Gently press head into hand while resisting movement with hand so no head movement occurs. Hold 5-10s. Dosage: 2-3 sets of 5-8 reps.',
  'Do not hold breath. Stop if cervical radicular symptoms, dizziness, or upper extremity tingling occur.',
  true
),
(
  '00000000-0000-0000-0000-000000000012'::uuid,
  NULL,
  true,
  'Thoracic Extension over Foam Roller',
  'mobility'::public.exercise_category,
  'thoracic'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Foam Roller',
  'Restoration of thoracic kyphosis extension mobility and anterior chest opening.',
  'Starting Position: Lie supine with roller across mid-thoracic spine, knees bent, hands supporting head. Action: Gently extend upper back over roller keeping hips down. Inhale as you extend backward, hold 2-3s, exhale and return.',
  'Do not roll onto lumbar or cervical spine. Contraindicated in acute thoracic fractures or severe osteoporosis.',
  true
),
(
  '00000000-0000-0000-0000-000000000013'::uuid,
  NULL,
  true,
  'Prone Cobra (Thoracic Postural Extension)',
  'strengthening'::public.exercise_category,
  'thoracic'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Mat',
  'Postural endurance strengthening of thoracic erector spinae, rhomboids, and lower trapezius.',
  'Starting Position: Lie prone with arms at sides, palms down. Action: Squeeze shoulder blades together, externally rotate arms (thumbs to ceiling), lift chest 2-3 inches off mat while tucking chin. Hold 5-10s, lower slowly.',
  'Avoid hyperextending cervical spine; keep gaze directed at floor.',
  true
),
(
  '00000000-0000-0000-0000-000000000014'::uuid,
  NULL,
  true,
  'Bird-Dog (Contralateral Core Stabilization)',
  'neuromuscular'::public.exercise_category,
  'lumbar'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Mat',
  'McGill Big 3 core exercise: rotary core stability, lumbar multifidus, and gluteus maximus activation.',
  'Starting Position: Quadruped on hands and knees. Action: Brace core, slowly reach right arm forward and left leg backward until parallel to floor. Hold 3-5 seconds with hips level. Return and alternate.',
  'Do not allow pelvis or lower back to rotate or hyperextend. Avoid in acute extension-intolerant facet sprain.',
  true
),
(
  '00000000-0000-0000-0000-000000000015'::uuid,
  NULL,
  true,
  'Dead Bug (Anterior Core Motor Control)',
  'neuromuscular'::public.exercise_category,
  'lumbar'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Mat',
  'Dynamic anterior core stabilization and lumbo-pelvic dissociation against gravity.',
  'Starting Position: Supine with arms pointing straight up, hips/knees bent to 90 degrees. Action: Flatten lumbar spine against mat. Slowly lower right arm overhead and left leg toward floor simultaneously. Return and switch.',
  'If lumbar spine arches off the mat, discontinue full leg reach and reduce range of motion.',
  true
),
(
  '00000000-0000-0000-0000-000000000016'::uuid,
  NULL,
  true,
  'McKenzie Prone Press-Up (Lumbar Extension)',
  'mobility'::public.exercise_category,
  'lumbar'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Mat',
  'Directional preference mechanical diagnosis and therapy drill for centralization of posterior disc derangements.',
  'Starting Position: Lie prone with hands palms-down near shoulders. Action: Relax hips and lower back. Slowly press upper body upward with arms, allowing spine to sag into extension. Hold 2-3s, lower smoothly.',
  'Contraindicated if symptoms peripheralize further down leg. Indicated only when symptoms centralize.',
  true
),
(
  '00000000-0000-0000-0000-000000000017'::uuid,
  NULL,
  true,
  'Side Plank (Quadratus Lumborum Stabilization)',
  'strengthening'::public.exercise_category,
  'lumbar'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Mat',
  'McGill Big 3 core exercise targeting lateral abdominal wall, quadratus lumborum, and gluteus medius.',
  'Starting Position: Side-lying on forearm with elbow directly below shoulder, knees bent or legs straight. Action: Lift hips off mat forming a straight line from feet to shoulders. Hold 15-30s.',
  'Do not allow top hip to rotate forward or backward. Maintain vertical pelvic alignment.',
  true
),
(
  '00000000-0000-0000-0000-000000000018'::uuid,
  NULL,
  true,
  'Side-Lying Shoulder External Rotation',
  'strengthening'::public.exercise_category,
  'shoulder'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Dumbbell / Towel Roll',
  'Isolated hypertrophy and endurance training for infraspinatus and teres minor rotator cuff muscles.',
  'Starting Position: Lie on unaffected side, target elbow bent 90 degrees with towel roll under arm. Action: Rotate forearm upward toward ceiling against gravity or 1-3 kg dumbbell. Hold 2s, lower over 3s.',
  'Do not roll trunk backward. Keep elbow pinned to side at 90 degrees.',
  true
),
(
  '00000000-0000-0000-0000-000000000019'::uuid,
  NULL,
  true,
  'Prone Y-to-T Raises (Scapular Stabilizers)',
  'strengthening'::public.exercise_category,
  'shoulder'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Mat / Incline Bench',
  'Activation and strengthening of lower trapezius (Y-position) and middle trapezius (T-position).',
  'Starting Position: Prone on mat with arms dangling, thumbs up. Action: Lift arms to sides (T) pinching shoulder blades together, or at 45 degrees forward (Y) squeezing lower traps down and back. Hold 2s.',
  'Avoid shrugging shoulders up toward ears. Keep cervical spine neutral.',
  true
),
(
  '00000000-0000-0000-0000-000000000020'::uuid,
  NULL,
  true,
  'Sleeper Stretch (Posterior Capsule)',
  'stretching'::public.exercise_category,
  'shoulder'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Mat / Pillow',
  'Internal rotation and posterior glenohumeral capsule elongation for GIRD (Glenohumeral Internal Rotation Deficit).',
  'Starting Position: Side-lying on involved side with shoulder flexed 90 degrees, elbow 90 degrees. Action: With other hand, gently press wrist downward toward floor until comfortable posterior stretch is felt. Hold 30s.',
  'Do not force aggressive internal rotation. Discontinue if sharp anterior impingement pain occurs.',
  true
),
(
  '00000000-0000-0000-0000-000000000021'::uuid,
  NULL,
  true,
  'Wall Slides with Serratus Anterior Shrug',
  'mobility'::public.exercise_category,
  'shoulder'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Wall / Foam Roller',
  'Serratus anterior activation, upward scapular rotation facilitation, and dynamic shoulder mobility.',
  'Starting Position: Stand facing wall with forearms vertical against wall. Action: Slide forearms up wall. At top, gently push upper back away from wall (scapular protraction and shrug). Hold 2s, return.',
  'Maintain continuous forearm contact with wall. Do not hyperextend lumbar spine.',
  true
),
(
  '00000000-0000-0000-0000-000000000022'::uuid,
  NULL,
  true,
  'Wrist Extensor Eccentric Loading (Tyler Twist)',
  'strengthening'::public.exercise_category,
  'elbow'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Flexible Resistance Bar / Dumbbell',
  'Evidence-based eccentric loading protocol for lateral epicondylalgia (tennis elbow).',
  'Starting Position: Forearm supported on table, wrist in full extension holding bar or 1-2 kg dumbbell. Action: Slowly lower wrist into full flexion over 4 seconds (eccentric). Use other hand to assist back up.',
  'Mild tolerable discomfort during eccentric loading is expected; stop if sharp disabling pain occurs.',
  true
),
(
  '00000000-0000-0000-0000-000000000023'::uuid,
  NULL,
  true,
  'Wrist Flexor Eccentric Loading',
  'strengthening'::public.exercise_category,
  'elbow'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Dumbbell / Table',
  'Controlled eccentric tendon loading for medial epicondylalgia (golfer''s elbow).',
  'Starting Position: Forearm palm-up on table, wrist in flexion holding dumbbell. Action: Slowly lower wrist backward into extension over 4-5 seconds. Use other hand to return to start.',
  'Avoid ballistic movements. Discontinue if median nerve numbness or tingling occurs.',
  true
),
(
  '00000000-0000-0000-0000-000000000024'::uuid,
  NULL,
  true,
  'Finger Tendon Gliding Exercises',
  'mobility'::public.exercise_category,
  'wrist_hand'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'None',
  'Maximizes differential excursion between flexor digitorum superficialis and profundus tendons; carpal tunnel relief.',
  'Starting Position: Hand upright with fingers straight. Action: Transition through 5 positions: (1) Straight hand, (2) Hook fist, (3) Full fist, (4) Flat fist, (5) Straight hand. Hold each for 2-3s.',
  'Keep movements gentle and rhythmic. Do not squeeze fists with excessive force.',
  true
),
(
  '00000000-0000-0000-0000-000000000025'::uuid,
  NULL,
  true,
  'Forearm Pronation and Supination Drill',
  'mobility'::public.exercise_category,
  'elbow'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Hammer / Light Club / Towel',
  'Restoration of proximal and distal radioulnar joint rotational mobility and forearm muscular balance.',
  'Starting Position: Elbow bent 90 degrees at side, holding base of light hammer upright. Action: Slowly rotate palm up (supination), pause 2s, then rotate palm down (pronation).',
  'Isolate forearm rotation; do not allow upper arm or shoulder to flare outward.',
  true
),
(
  '00000000-0000-0000-0000-000000000026'::uuid,
  NULL,
  true,
  'Side-Lying Clamshells with Resistance Band',
  'strengthening'::public.exercise_category,
  'hip'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Loop Resistance Band / Mat',
  'Isolated activation and strengthening of gluteus medius posterior fibers and deep hip external rotators.',
  'Starting Position: Side-lying with hips 45 degrees, knees 90 degrees, band around thighs. Action: Keeping heels together, lift top knee upward toward ceiling. Hold 2s, lower slowly over 3s.',
  'Do not allow top hip or pelvis to roll backward during knee lift. Keep core engaged.',
  true
),
(
  '00000000-0000-0000-0000-000000000027'::uuid,
  NULL,
  true,
  'Standing Banded Hip Abduction',
  'strengthening'::public.exercise_category,
  'hip'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Resistance Band / Wall Support',
  'Closed-chain stance leg stabilizer activation combined with open-chain abductor strengthening.',
  'Starting Position: Stand tall with band around ankles, hands lightly on wall. Action: Shift weight to stance leg, lift target leg out to side at 30-45 degrees with toes forward. Hold 1-2s, lower under control.',
  'Avoid leaning torso sideways. Keep pelvis level and shoulders square.',
  true
),
(
  '00000000-0000-0000-0000-000000000028'::uuid,
  NULL,
  true,
  'Half-Kneeling Hip Flexor Stretch',
  'stretching'::public.exercise_category,
  'hip'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Mat / Cushion',
  'Targeted elongation of iliopsoas and rectus femoris with pelvic posterior tilt stabilization.',
  'Starting Position: Half-kneeling on padded mat, 90-degree angles at both knees. Action: Tuck tailbone under (posterior pelvic tilt). Gently glide weight forward 1-2 inches until stretch is felt in front hip. Hold 30s.',
  'Do not arch lumbar spine forward; anterior pelvic tilt nullifies the hip flexor stretch.',
  true
),
(
  '00000000-0000-0000-0000-000000000029'::uuid,
  NULL,
  true,
  'Terminal Knee Extension (TKE) with Band',
  'strengthening'::public.exercise_category,
  'knee'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Resistance Band / Anchor',
  'Isolated vastus medialis oblique (VMO) hypertrophy and terminal active knee extension motor control.',
  'Starting Position: Band looped behind target knee anchored in front. Staggered stance with knee slightly bent. Action: Straighten knee fully by contracting quadriceps against band resistance. Hold 2-3s, return.',
  'Do not hyperextend knee past neutral. Squeeze quads smoothly without snapping joint.',
  true
),
(
  '00000000-0000-0000-0000-000000000030'::uuid,
  NULL,
  true,
  'Eccentric Decline Board Squat',
  'strengthening'::public.exercise_category,
  'knee'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  '25-Degree Decline Board / Wedge',
  'Evidence-based Alfredson/Visnes eccentric loading protocol for patellar tendinopathy (Jumper''s knee).',
  'Starting Position: Stand on 25-degree decline wedge facing downhill. Action: Balance on target leg, slowly squat to 60-70 degrees knee flexion over 4 seconds. Put other foot down to return up.',
  'Mild tendon discomfort acceptable (<= 4/10); stop if sharp or progressive pain persists > 24 hours.',
  true
),
(
  '00000000-0000-0000-0000-000000000031'::uuid,
  NULL,
  true,
  'Romanian Deadlift (RDL) with Dumbbells',
  'strengthening'::public.exercise_category,
  'knee'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Dumbbells / Barbell',
  'Eccentric posterior chain loading targeting hamstring musculature and gluteal hip hinge mechanics.',
  'Starting Position: Feet hip-width apart holding dumbbells, knees slightly unlocked. Action: Hinge at hips pushing buttocks backward with flat back. Lower dumbbells to mid-shin feeling hamstring stretch, then return.',
  'Do not round lumbar spine. Contraindicated in acute disc herniation with radiculopathy.',
  true
),
(
  '00000000-0000-0000-0000-000000000032'::uuid,
  NULL,
  true,
  'Step-Down Drill (Eccentric Quadriceps)',
  'functional'::public.exercise_category,
  'knee'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Aerobic Step / Box (4-6 inches)',
  'Patellofemoral tracking re-education, eccentric quadriceps control, and knee dynamic valgus mitigation.',
  'Starting Position: Stand on 4-6 inch step on target leg. Action: Bend knee to slowly lower opposite heel toward floor over 3s. Lightly tap floor without bearing weight, push through stance heel to return.',
  'Ensure knee does not collapse inward (valgus collapse). Keep patella tracking over second toe.',
  true
),
(
  '00000000-0000-0000-0000-000000000033'::uuid,
  NULL,
  true,
  'Eccentric Heel Drop on Step (Alfredson Protocol)',
  'strengthening'::public.exercise_category,
  'ankle_foot'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Stair Step / Sturdy Platform',
  'Gold-standard eccentric tendon remodeling protocol for mid-portion and insertional Achilles tendinopathy.',
  'Starting Position: Balls of feet on step edge, heels hanging off. Action: Rise onto toes with both feet, lift good foot, slowly lower involved heel below step level over 4s. Repeat with straight and bent knee.',
  'For insertional tendinopathy, do not drop below step horizontal. Stop if sharp tearing sensation occurs.',
  true
),
(
  '00000000-0000-0000-0000-000000000034'::uuid,
  NULL,
  true,
  'Resisted Ankle Eversion with Resistance Band',
  'strengthening'::public.exercise_category,
  'ankle_foot'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Resistance Band',
  'Targeted hypertrophy of peroneus longus and brevis for chronic lateral ankle instability rehabilitation.',
  'Starting Position: Seated with legs extended, band anchored around foot. Action: Turn target foot outward and slightly upward against band resistance (eversion). Hold 2s, return over 3s.',
  'Isolate ankle eversion; do not rotate hip or knee to achieve outward movement.',
  true
),
(
  '00000000-0000-0000-0000-000000000035'::uuid,
  NULL,
  true,
  'Towel Scrunches and Marble Pick-ups',
  'strengthening'::public.exercise_category,
  'ankle_foot'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Hand Towel / Small Objects / Chair',
  'Intrinsic foot muscle strengthening, medial longitudinal arch restoration, and plantar fascia support.',
  'Starting Position: Seated barefoot on chair with towel flat on floor. Action: Keeping heel on floor, curl toes inward to gather towel toward you in scrunches. Reverse by pushing towel away.',
  'Do not lift heel off floor. If plantar arch cramps develop, pause and perform gentle arch stretch.',
  true
),
(
  '00000000-0000-0000-0000-000000000036'::uuid,
  NULL,
  true,
  'Weight-Shifting in Standing with Mirror Feedback',
  'neuromuscular'::public.exercise_category,
  'full_body'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Full-length Mirror / Parallel Bars',
  'Promotes symmetrical lower extremity loading, proprioceptive recalibration, and overcoming hemi-neglect.',
  'Starting Position: Stand facing mirror with hands on parallel bars/counter. Action: Slowly shift weight onto paretic leg until 60-70% loaded. Observe mirror to keep pelvis level and knee unlocked. Hold 5s.',
  'Guarding required if fall risk is elevated. Guard against knee recurvatum / hyperextension.',
  true
),
(
  '00000000-0000-0000-0000-000000000037'::uuid,
  NULL,
  true,
  'Bilateral Upper Extremity Table Slides with Towel',
  'mobility'::public.exercise_category,
  'shoulder'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Table / Towel / Chair',
  'Facilitates active-assisted forward reaching, protraction, and motor re-learning of the hemiparetic upper extremity.',
  'Starting Position: Seated at smooth table, both hands on folded towel with sound hand guiding paretic hand. Action: Lean trunk forward while sliding towel forward to achieve shoulder flexion and protraction. Hold 3s, return.',
  'Ensure shoulder does not shrug or impinge during forward slide. Stop if subluxation discomfort occurs.',
  true
),
(
  '00000000-0000-0000-0000-000000000038'::uuid,
  NULL,
  true,
  'Bridging with Affected Limb Weight Acceptance',
  'neuromuscular'::public.exercise_category,
  'hip'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Mat',
  'Breaks up lower extremity extensor synergy while building pelvic control for bed mobility and sit-to-stand transfers.',
  'Starting Position: Supine with knees bent 90 degrees, feet flat. Action: Press down evenly through both heels, squeeze glutes, lift hips into bridge. Keep pelvis level without dropping on paretic side. Hold 3-5s.',
  'Watch for pelvic drop asymmetry. Avoid breath holding and Valsalva maneuver.',
  true
),
(
  '00000000-0000-0000-0000-000000000039'::uuid,
  NULL,
  true,
  'LSVT BIG-Style High Amplitude Stepping Drill',
  'functional'::public.exercise_category,
  'full_body'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Floor Markers / Open Space',
  'Combats hypometria and bradykinesia through exaggerated amplitude, visual cueing, and sensory recalibration in Parkinson''s disease.',
  'Starting Position: Stand tall with floor markers. Action: Take an exaggerated, large-amplitude step forward with right foot while swinging left arm forward with open fingers. Stomp firmly, pause 1s, push back forcefully.',
  'Maintain clinician guarding for patients with postural instability (Hoehn & Yahr stage 3+).',
  true
),
(
  '00000000-0000-0000-0000-000000000040'::uuid,
  NULL,
  true,
  'Dynamic Auditory-Cued Gait Training',
  'aerobic'::public.exercise_category,
  'full_body'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Metronome / Rhythm App',
  'Rhythmic auditory stimulation (RAS) to normalize stride cadence, mitigate freezing of gait, and improve velocity.',
  'Starting Position: Stand at start of 20-meter hallway with metronome set to 100-110% baseline cadence. Action: Walk synchronizing heel strikes to rhythmic auditory beat. Focus on long heel strikes and reciprocal arm swing.',
  'Closely spot patient if freezing episodes occur during turning or doorway navigation.',
  true
),
(
  '00000000-0000-0000-0000-000000000041'::uuid,
  NULL,
  true,
  'Frenkel Coordination Heel-to-Shin Exercises',
  'neuromuscular'::public.exercise_category,
  'knee'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Mat',
  'Sensory compensation and visual guidance drill for cerebellar ataxia and proprioceptive loss.',
  'Starting Position: Supine with head elevated on pillow to view legs. Action: Lift right heel and place cleanly on left knee. Slowly and smoothly slide heel down crest of shin to ankle and back under visual guidance.',
  'Do not rush repetitions. Smoothness, accuracy, and visual control are the clinical goals.',
  true
),
(
  '00000000-0000-0000-0000-000000000042'::uuid,
  NULL,
  true,
  'Vestibular VOR x1 Gaze Stabilization Drill',
  'neuromuscular'::public.exercise_category,
  'cervical'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Target Card (Letter on wall)',
  'Vestibulo-ocular reflex (VOR) adaptation exercise for vestibular hypofunction and gaze instability.',
  'Starting Position: Seated holding target letter at eye level. Action: Focus eyes on letter. While keeping letter in sharp focus, rotate head left and right briskly (1-2 Hz). Eyes stay fixed on target for 30-60s.',
  'Mild dizziness is expected; stop immediately if symptoms exceed 5/10 increase or persist > 20 minutes.',
  true
),
(
  '00000000-0000-0000-0000-000000000043'::uuid,
  NULL,
  true,
  'Brandt-Daroff Vestibular Habituation Drill',
  'mobility'::public.exercise_category,
  'cervical'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Bed / Plinth',
  'Otolith particle dispersion and central vestibular habituation for benign paroxysmal positional vertigo (BPPV).',
  'Starting Position: Sit upright on edge of bed. Action: Turn head 45 degrees left, lie onto right side for 30s. Sit upright for 30s. Turn head 45 degrees right, lie onto left side for 30s. Return upright.',
  'Do not drive immediately after completing drill if transient vertigo or unsteadiness is elicited.',
  true
),
(
  '00000000-0000-0000-0000-000000000044'::uuid,
  NULL,
  true,
  'Prone Tummy Time with Chest Bolster Support',
  'strengthening'::public.exercise_category,
  'cervical'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Mat / Rolled Towel or Bolster / Visual Toys',
  'Developmental milestone facilitation: cervical and thoracic extensor strengthening and upper extremity weight-bearing.',
  'Starting Position: Infant/child prone over small rolled towel under chest. Action: Position toys/mirrors in sightline to encourage lifting head, extending neck, and propping onto forearms.',
  'Always perform under continuous adult supervision. Discontinue if child becomes fatigued or distressed.',
  true
),
(
  '00000000-0000-0000-0000-000000000045'::uuid,
  NULL,
  true,
  'Tall-Kneeling to Half-Kneeling Transitional Stepping',
  'neuromuscular'::public.exercise_category,
  'hip'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Mat / Bench Support',
  'Facilitates lower extremity dissociation, pelvic stability, and preparatory motor control for standing and walking.',
  'Starting Position: Tall-kneeling on padded mat, hands on bench. Action: Shift weight to one knee, bring opposite foot forward flat on floor into half-kneeling. Hold 3-5s, return and switch.',
  'Ensure adequate knee padding. Guard against sudden loss of balance during transitions.',
  true
),
(
  '00000000-0000-0000-0000-000000000046'::uuid,
  NULL,
  true,
  'Bear Crawl Coordination Drill',
  'neuromuscular'::public.exercise_category,
  'full_body'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Mat / Open Floor Space',
  'Promotes cross-lateral gross motor coordination, core stability, shoulder girdle weight-bearing, and vestibular input.',
  'Starting Position: On hands and feet with knees hovering 2-3 inches off floor. Action: Crawl forward in contralateral pattern (right hand + left foot, left hand + right foot).',
  'Ensure floor is clear of sharp objects. Provide verbal encouragement and game-based framing.',
  true
),
(
  '00000000-0000-0000-0000-000000000047'::uuid,
  NULL,
  true,
  'Copenhagen Adductor Exercise (Groin Strain Protocol)',
  'strengthening'::public.exercise_category,
  'hip'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Bench / Partner Support',
  'Evidence-based high-intensity eccentric adductor conditioning for groin injury prevention and return to kicking/cutting sports.',
  'Starting Position: Side plank with top ankle on bench, bottom leg underneath. Action: Lift hips into plank, raise bottom leg to touch underside of bench adducting both hips. Hold 2-3s, lower slowly.',
  'High muscle soreness common initially; build volume gradually. Contraindicated in acute adductor tears.',
  true
),
(
  '00000000-0000-0000-0000-000000000048'::uuid,
  NULL,
  true,
  'Nordic Hamstring Curl (Eccentric Hamstring Protocol)',
  'strengthening'::public.exercise_category,
  'knee'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Kneeling Mat / Ankle Anchor or Partner',
  'Proven injury prevention exercise generating maximal supramaximal eccentric hamstring force and muscle fascicle lengthening.',
  'Starting Position: Kneeling on mat with ankles securely anchored, hips extended. Action: Lean torso forward slowly resisting gravity with hamstrings. Catch with hands when control fails, push up to start.',
  'Do not bend at hips; maintain strict hip extension. Contraindicated in acute hamstring strains (< 4 weeks).',
  true
),
(
  '00000000-0000-0000-0000-000000000049'::uuid,
  NULL,
  true,
  'Lateral Bound and Stick (Frontal Plane Deceleration)',
  'functional'::public.exercise_category,
  'full_body'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Open Gym Floor / Agility Markers',
  'Dynamic plyometric deceleration, reactive knee valgus control, and return-to-sport clearance drill.',
  'Starting Position: Athletic stance on right leg. Action: Push off explosively to bound laterally 3-5 feet onto left leg. Land softly absorbing force by flexing ankle, knee, hip. Freeze 3s with knee over toes.',
  'Do not allow knee to collapse into dynamic valgus on landing. Requires 85%+ Limb Symmetry Index before intro.',
  true
),
(
  '00000000-0000-0000-0000-000000000050'::uuid,
  NULL,
  true,
  '30-Second Chair Stand Functional Training Drill',
  'functional'::public.exercise_category,
  'knee'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Standard Armless Chair (17 inches)',
  'Functional lower extremity extensor power, transfer independence, and sarcopenia mitigation in older adults.',
  'Starting Position: Seated on armless chair, arms crossed over chest. Action: Stand completely upright locking knees/hips, immediately sit back down lightly touching chair. Repeat briskly for 30 seconds.',
  'Back chair against wall. Stop if lightheadedness, chest tightness, or severe dyspnea occurs.',
  true
),
(
  '00000000-0000-0000-0000-000000000051'::uuid,
  NULL,
  true,
  'Multidirectional Stepping Clock Drill',
  'balance'::public.exercise_category,
  'full_body'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Clock Face Visual Markers / Chair Support',
  'Dynamic reactive postural stepping, perturbation recovery, and base-of-support reconfiguration for fall prevention.',
  'Starting Position: Stand in center of clock face. Action: Step right foot to 12:00, return; step to 1:00, 2:00, 3:00, 4:00, 5:00, 6:00. Repeat with left foot.',
  'Guarding required for individuals with BBS < 45 or history of recurrent falls.',
  true
),
(
  '00000000-0000-0000-0000-000000000052'::uuid,
  NULL,
  true,
  'Tandem Stance with Dual-Task Cognitive Challenge',
  'balance'::public.exercise_category,
  'full_body'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Counter Support',
  'Static narrow base-of-support balance with divided attention for real-world fall risk reduction.',
  'Starting Position: Heel of front foot touching toes of back foot in tandem line. Action: Maintain quiet stance for 20-30s while performing a cognitive task (counting backward, naming animals). Switch feet.',
  'Stand within arm''s reach of wall or counter support at all times.',
  true
),
(
  '00000000-0000-0000-0000-000000000053'::uuid,
  NULL,
  true,
  'Diaphragmatic Breathing with Lower Rib Cage Expansion',
  'mobility'::public.exercise_category,
  'thoracic'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Chair / Bed / Hands',
  'Reduces accessory breathing muscle tension, optimizes tidal volume, and reduces work of breathing in COPD/CHF.',
  'Starting Position: Seated in supportive chair, hands on abdomen and upper chest. Action: Inhale slowly through nose feeling belly expand outward. Exhale gently through pursed lips letting belly sink in. 3-5 min.',
  'Do not hyperventilate or force exhalation; avoid rapid shallow breaths.',
  true
),
(
  '00000000-0000-0000-0000-000000000054'::uuid,
  NULL,
  true,
  'Pursed-Lip Breathing Drill',
  'mobility'::public.exercise_category,
  'thoracic'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'None',
  'Generates positive end-expiratory pressure (PEEP) to prevent dynamic airway collapse during exertion.',
  'Starting Position: Comfortable sitting or standing. Action: Inhale slowly through nose for 2 counts. Purse lips as if blowing out candles. Exhale gently through pursed lips for 4 counts (1:2 ratio).',
  'Do not force air out aggressively; exhalation must be slow, controlled, and relaxed.',
  true
),
(
  '00000000-0000-0000-0000-000000000055'::uuid,
  NULL,
  true,
  'Active Cycle of Breathing Technique (ACBT)',
  'mobility'::public.exercise_category,
  'thoracic'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Comfortable Chair',
  'Airway clearance technique: mobilizes and clears pulmonary secretions without inducing bronchospasm.',
  'Starting Position: Seated comfortably. Action: (1) 4-5 relaxed diaphragmatic breaths, (2) 3-4 deep breaths with 3s hold at top, (3) 1-2 medium-breath huffs with open glottis as if fogging a mirror.',
  'Avoid violent coughing spells which cause airway collapse; huffing must be controlled with open glottis.',
  true
),
(
  '00000000-0000-0000-0000-000000000056'::uuid,
  NULL,
  true,
  'Pelvic Floor Muscle Training (Kegels with Knack Technique)',
  'strengthening'::public.exercise_category,
  'other'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Mat / Chair',
  'Levator ani and pubococcygeus hypertrophy for urinary stress incontinence and pelvic organ prolapse support.',
  'Starting Position: Supine with knees bent or seated tall. Action: Squeeze and lift pelvic muscles inward and upward as if stopping urine flow. Quick flicks: 10 fast 1s contractions. Endurance: 6-8s holds.',
  'Do not bear down (Valsalva) or squeeze gluteals/thighs. Ensure full conscious relaxation between contractions.',
  true
),
(
  '00000000-0000-0000-0000-000000000057'::uuid,
  NULL,
  true,
  'Supine Transverse Abdominis Drawing-In Maneuver',
  'neuromuscular'::public.exercise_category,
  'lumbar'::public.exercise_body_region,
  'bilateral'::public.exercise_laterality,
  'Mat / Biofeedback Pressure Unit',
  'Isolates deep transverse abdominis activation to restore lumbo-pelvic cylinder stability post-partum or post-injury.',
  'Starting Position: Supine, knees bent 90 degrees, feet flat. Fingers 1 inch inside hip bones. Action: Exhale gently and draw lower belly toward spine as if zipping tight jeans. Hold tension 10s breathing normally.',
  'Do not flatten lower back or flare ribcage (rectus substitution). Contraction must be subtle and deep.',
  true
),
(
  '00000000-0000-0000-0000-000000000058'::uuid,
  NULL,
  true,
  'Transtibial Residual Limb Extension and Prone Positioning',
  'mobility'::public.exercise_category,
  'hip'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Mat / Plinth',
  'Critical contracture prevention drill preserving knee and hip extension mobility for prosthetic ambulation.',
  'Starting Position: Prone on mat with residual limb extended. Action: Tighten glutes, press residual limb gently downward into mat to achieve 0 degrees knee/hip extension. Hold 10s. Spend 20-30 min daily prone.',
  'Never place pillows under knee or hip in sitting/supine; promotes flexion contractures that block prosthetic fitting.',
  true
),
(
  '00000000-0000-0000-0000-000000000059'::uuid,
  NULL,
  true,
  'Residual Limb Desensitization and Towel Friction Drill',
  'neuromuscular'::public.exercise_category,
  'knee'::public.exercise_body_region,
  'unilateral'::public.exercise_laterality,
  'Cotton Ball / Silk Cloth / Terrycloth Towel',
  'Promotes cortical sensory reorganization and reduces allodynia/phantom limb pain preparatory to prosthetic socket wear.',
  'Starting Position: Seated with limb clean and dry. Action: Gently rub distal limb and scar in circular motions using graded textures: soft cotton/silk for 3-5 min, progressing over days to terrycloth and gentle tapping.',
  'Contraindicated over open wounds or unhealed suture lines. Discontinue if persistent erythema occurs.',
  true
)
    ) AS t(id, practice_id, is_system, name, category, body_region, default_laterality, equipment, description, instructions, precautions, is_active)
  ) LOOP
    -- If row exists with this exact canonical ID, update definition
    IF EXISTS (SELECT 1 FROM public.exercises WHERE id = v_rec.id) THEN
      UPDATE public.exercises
      SET
        name = v_rec.name,
        category = v_rec.category,
        body_region = v_rec.body_region,
        default_laterality = v_rec.default_laterality,
        equipment = v_rec.equipment,
        description = v_rec.description,
        instructions = v_rec.instructions,
        precautions = v_rec.precautions,
        is_active = v_rec.is_active,
        updated_at = now()
      WHERE id = v_rec.id;
    -- Else if row exists with same system name under a different UUID, retain or align safely
    ELSIF EXISTS (SELECT 1 FROM public.exercises WHERE practice_id IS NULL AND lower(trim(name)) = lower(trim(v_rec.name))) THEN
      UPDATE public.exercises
      SET
        category = v_rec.category,
        body_region = v_rec.body_region,
        default_laterality = v_rec.default_laterality,
        equipment = v_rec.equipment,
        description = v_rec.description,
        instructions = v_rec.instructions,
        precautions = v_rec.precautions,
        is_active = v_rec.is_active,
        updated_at = now()
      WHERE practice_id IS NULL AND lower(trim(name)) = lower(trim(v_rec.name));
    ELSE
      -- Insert canonical exercise
      INSERT INTO public.exercises (
        id,
        practice_id,
        is_system,
        name,
        category,
        body_region,
        default_laterality,
        equipment,
        description,
        instructions,
        precautions,
        is_active
      ) VALUES (
        v_rec.id,
        NULL,
        true,
        v_rec.name,
        v_rec.category,
        v_rec.body_region,
        v_rec.default_laterality,
        v_rec.equipment,
        v_rec.description,
        v_rec.instructions,
        v_rec.precautions,
        v_rec.is_active
      );
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ATOMIC HOME EXERCISE PROGRAM CREATION RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_home_exercise_program_atomic(
  p_program jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_practice_id uuid;
  v_patient_id uuid;
  v_episode_id uuid;
  v_clinical_visit_id uuid;
  v_prescribing_clinician_id uuid;
  v_title text;
  v_instructions text;
  v_start_date date;
  v_review_date date;
  v_status public.hep_status;
  v_program_identifier text;
  v_program_id uuid;
  v_item jsonb;
  v_item_idx integer;
  v_raw_exercise_id uuid;
  v_resolved_exercise_id uuid;
  v_current_practice uuid;
  v_result jsonb;
BEGIN
  v_practice_id := (p_program->>'practice_id')::uuid;
  v_current_practice := public.current_practice_id();

  IF v_current_practice IS NOT NULL AND v_current_practice <> v_practice_id THEN
    RAISE EXCEPTION 'Access denied: Tenant practice mismatch.';
  END IF;

  -- Verify active clinician membership
  IF NOT EXISTS (
    SELECT 1 FROM public.practice_memberships
    WHERE practice_id = v_practice_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('practice_owner', 'practice_manager', 'physiotherapist')
  ) THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges to create Home Exercise Program.';
  END IF;

  v_patient_id := (p_program->>'patient_id')::uuid;
  v_episode_id := NULLIF(p_program->>'episode_id', '')::uuid;
  v_clinical_visit_id := NULLIF(p_program->>'clinical_visit_id', '')::uuid;
  v_prescribing_clinician_id := (p_program->>'prescribing_clinician_id')::uuid;
  v_title := trim(COALESCE(p_program->>'title', ''));
  v_instructions := NULLIF(trim(p_program->>'instructions'), '');
  v_start_date := COALESCE(NULLIF(p_program->>'start_date', '')::date, CURRENT_DATE);
  v_review_date := NULLIF(p_program->>'review_date', '')::date;
  v_status := COALESCE((p_program->>'status')::public.hep_status, 'draft'::public.hep_status);

  IF v_title = '' THEN
    RAISE EXCEPTION 'Program title is required.';
  END IF;

  -- Generate atomic sequential identifier
  v_program_identifier := public.generate_next_hep_identifier(v_practice_id);

  -- Insert program header
  INSERT INTO public.home_exercise_programs (
    practice_id,
    patient_id,
    episode_id,
    clinical_visit_id,
    prescribing_clinician_id,
    program_identifier,
    title,
    instructions,
    start_date,
    review_date,
    status
  ) VALUES (
    v_practice_id,
    v_patient_id,
    v_episode_id,
    v_clinical_visit_id,
    v_prescribing_clinician_id,
    v_program_identifier,
    v_title,
    v_instructions,
    v_start_date,
    v_review_date,
    v_status
  )
  RETURNING id INTO v_program_id;

  -- Insert prescribed items with canonical resolution
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    v_item_idx := 0;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      v_item_idx := v_item_idx + 1;
      v_raw_exercise_id := (v_item->>'exercise_id')::uuid;

      -- 1. Check if exercise exists by exact UUID
      SELECT id INTO v_resolved_exercise_id
      FROM public.exercises
      WHERE id = v_raw_exercise_id;

      -- 2. If not found by UUID, resolve by exercise name
      IF v_resolved_exercise_id IS NULL AND v_item->>'exercise_name' IS NOT NULL THEN
        SELECT id INTO v_resolved_exercise_id
        FROM public.exercises
        WHERE is_system = true
          AND (
            lower(trim(name)) = lower(trim(v_item->>'exercise_name'))
            OR lower(name) LIKE '%' || lower(trim(split_part(v_item->>'exercise_name', '(', 1))) || '%'
          )
        ORDER BY is_system DESC
        LIMIT 1;
      END IF;

      -- 3. If still not found, fail transaction atomically
      IF v_resolved_exercise_id IS NULL THEN
        RAISE EXCEPTION 'Prescribed exercise with ID % could not be resolved in the exercises library.', v_raw_exercise_id;
      END IF;

      INSERT INTO public.home_exercise_program_items (
        practice_id,
        program_id,
        exercise_id,
        order_index,
        sets,
        repetitions,
        hold_seconds,
        duration_minutes,
        rest_seconds,
        frequency,
        intensity_load,
        laterality,
        instructions,
        precautions,
        notes
      ) VALUES (
        v_practice_id,
        v_program_id,
        v_resolved_exercise_id,
        COALESCE((v_item->>'order_index')::integer, v_item_idx),
        NULLIF(v_item->>'sets', '')::integer,
        NULLIF(v_item->>'repetitions', '')::integer,
        NULLIF(v_item->>'hold_seconds', '')::integer,
        NULLIF(v_item->>'duration_minutes', '')::integer,
        NULLIF(v_item->>'rest_seconds', '')::integer,
        NULLIF(trim(v_item->>'frequency'), ''),
        NULLIF(trim(v_item->>'intensity_load'), ''),
        COALESCE((v_item->>'laterality')::public.exercise_laterality, 'na'::public.exercise_laterality),
        NULLIF(trim(v_item->>'instructions'), ''),
        NULLIF(trim(v_item->>'precautions'), ''),
        NULLIF(trim(v_item->>'notes'), '')
      );
    END LOOP;
  END IF;

  -- Log audit event
  PERFORM public.log_audit_event(
    p_action := 'hep.created',
    p_entity_type := 'home_exercise_program',
    p_entity_id := v_program_id,
    p_metadata := jsonb_build_object(
      'program_identifier', v_program_identifier,
      'patient_id', v_patient_id,
      'episode_id', v_episode_id,
      'prescribing_clinician_id', v_prescribing_clinician_id,
      'status', v_status,
      'item_count', COALESCE(jsonb_array_length(p_items), 0)
    ),
    p_source := 'create_home_exercise_program_atomic'
  );

  SELECT to_jsonb(p) INTO v_result
  FROM public.home_exercise_programs p
  WHERE p.id = v_program_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_home_exercise_program_atomic(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_home_exercise_program_atomic(jsonb, jsonb) TO authenticated;
