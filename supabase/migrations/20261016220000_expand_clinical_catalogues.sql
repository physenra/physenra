-- ==============================================================================
-- PHYSENRA DATABASE MIGRATION: EXPAND CLINICAL EXERCISE & OUTCOME CATALOGUES
-- Timestamp: 20261016220000_expand_clinical_catalogues.sql
--
-- Domains:
-- 1. Expanded Evidence-Based Exercise Library (public.exercises)
--    - Musculoskeletal & Orthopaedic (Cervical, Thoracic, Lumbar, Shoulder, Elbow, Wrist/Hand, Hip, Knee, Ankle/Foot)
--    - Neurological Rehabilitation (Stroke, Parkinson's, Multiple Sclerosis, Vestibular/Balance)
--    - Paediatric Rehabilitation & Developmental Conditions
--    - Sports Rehabilitation & Return-to-Activity
--    - Geriatric Care, Falls, Mobility & Balance
--    - Cardiovascular & Pulmonary Rehabilitation
--    - Pelvic & Women's Health
--    - Oncology, Wound & Amputee Rehabilitation
-- 2. Expanded Validated Clinical Outcome Measure Definitions (public.outcome_measure_definitions)
--    - Neurological: MAS, 10MWT, DGI, FMA-UE
--    - Geriatric / Falls: 30CST, POMA (Tinetti), FSST
--    - Sports: YBT-LQ, SLHD
--    - Cardiopulmonary: 6MWT, BORG-RPE, BORG-CR10
--    - Musculoskeletal / Joint: WOMAC, SPADI, FAAM
--    - Paediatric: GMFCS, PBS
--
-- Safeguards:
-- - Multi-tenant isolation: System entries have practice_id = NULL and is_system = true
-- - Safe idempotency: ON CONFLICT DO NOTHING preserves all existing records
-- - Zero alteration of patient, billing, payment, or subscription records
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXPANDED EVIDENCE-BASED SYSTEM EXERCISES
-- ------------------------------------------------------------------------------
INSERT INTO public.exercises (
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
) VALUES
-- Musculoskeletal - Cervical
(
  NULL,
  true,
  'Cervical Isometric Lateral Flexion & Rotation',
  'strengthening',
  'cervical',
  'bilateral',
  'None / Hand Resistance',
  'Isometric deep and superficial cervical stabilizer conditioning in neutral alignment.',
  'Starting Position: Sit or stand tall with cervical spine in neutral alignment.
Action: Place palm against side of head or temple. Gently press head into hand while resisting movement with hand so no head movement occurs. Hold for 5-10 seconds, then repeat on opposite side.
Dosage: 2-3 sets of 5-8 repetitions per side, 1-2 times daily.
Progression: Increase hold time to 15 seconds or perform in standing on an unstable surface.
Regression: Reduce manual pressing force to submaximal 25% effort.',
  'Do not hold breath. Stop if cervical radicular symptoms, dizziness, or tingling in upper extremities occur.',
  true
),
-- Musculoskeletal - Thoracic
(
  NULL,
  true,
  'Thoracic Extension over Foam Roller',
  'mobility',
  'thoracic',
  'bilateral',
  'Foam Roller',
  'Restoration of thoracic kyphosis extension mobility and anterior chest opening.',
  'Starting Position: Lie supine with foam roller positioned horizontally across mid-thoracic spine, knees bent, feet flat on floor, and hands supporting head.
Action: Gently extend upper back backward over roller while keeping hips on floor. Inhale as you extend backward, hold for 2-3 seconds, then exhale and return to start. Roll up or down 1-2 inches to target different thoracic segments.
Dosage: 2 sets of 8-10 repetitions across mid-to-upper thoracic segments.
Progression: Extend arms overhead with thumbs pointing toward floor.
Regression: Place a folded towel or pillow over foam roller to soften angle.',
  'Do not roll onto lumbar spine or cervical spine. Contraindicated in acute thoracic vertebral compression fractures or severe osteoporosis.',
  true
),
(
  NULL,
  true,
  'Prone Cobra (Thoracic Postural Extension)',
  'strengthening',
  'thoracic',
  'bilateral',
  'Mat',
  'Postural endurance strengthening of thoracic erector spinae, rhomboids, and lower trapezius.',
  'Starting Position: Lie prone on mat with arms at sides, palms facing down, and legs extended.
Action: Squeeze shoulder blades together, externally rotate arms so thumbs point toward ceiling, and gently lift chest and head 2-3 inches off mat while tucking chin. Keep glutes relaxed and gaze downward. Hold for 5-10 seconds, then slowly lower.
Dosage: 2-3 sets of 8-12 repetitions.
Progression: Hold position for up to 20 seconds or hold light 0.5 kg weights.
Regression: Keep forehead resting on a small rolled towel and perform only the arm external rotation and scapular squeeze.',
  'Avoid hyperextending cervical spine; keep gaze directly on floor to maintain neutral cervical curve.',
  true
),
-- Musculoskeletal - Lumbar & Core
(
  NULL,
  true,
  'Bird-Dog (Contralateral Core Stabilization)',
  'neuromuscular',
  'lumbar',
  'bilateral',
  'Mat',
  'McGill Big 3 core exercise: rotary core stability, lumbar multifidus, and gluteus maximus activation.',
  'Starting Position: Quadruped position on hands and knees, with wrists directly under shoulders and knees under hips.
Action: Engage abdominal core without flexing spine. Slowly extend right arm forward and left leg backward until both are parallel to floor. Hold for 3-5 seconds with hips level. Return smoothly to starting position and alternate sides.
Dosage: 3 sets of 8-10 repetitions per side.
Progression: Draw a square with outstretched hand and foot, or add a light cuff weight.
Regression: Perform leg extension only or arm elevation only before combining both.',
  'Do not allow pelvis or lumbar spine to rotate or arch into extension. Avoid in acute facet joint sprain during extension.',
  true
),
(
  NULL,
  true,
  'Dead Bug (Anterior Core Motor Control)',
  'neuromuscular',
  'lumbar',
  'bilateral',
  'Mat',
  'Dynamic anterior core stabilization and lumbo-pelvic dissociation against gravity.',
  'Starting Position: Lie supine with arms pointing straight up toward ceiling and hips and knees bent to 90 degrees (tabletop position).
Action: Flatten lumbar spine against mat by drawing navel inward. Slowly lower right arm overhead and left leg toward floor simultaneously while maintaining flat back contact with mat. Return to start and repeat with opposite limbs.
Dosage: 3 sets of 10 repetitions (5 each side).
Progression: Add light resistance bands or dumbbells in hands.
Regression: Keep knees bent and perform heel taps to floor instead of full leg extension.',
  'If lumbar spine arches off the mat, discontinue full leg extension and reduce range of motion.',
  true
),
(
  NULL,
  true,
  'McKenzie Prone Press-Up (Lumbar Extension)',
  'mobility',
  'lumbar',
  'bilateral',
  'Mat',
  'Directional preference mechanical diagnosis and therapy drill for centralization of posterior disc derangements.',
  'Starting Position: Lie prone on mat with hands placed palms-down near shoulders, as if preparing for a push-up.
Action: Completely relax hips, buttocks, and lower back muscles. Slowly press upper body upward with arms, allowing lumbar spine to sag into extension while pelvis remains on floor. Hold for 2-3 seconds at end-range, then lower.
Dosage: 1-2 sets of 10 repetitions, performed every 2-3 hours during acute derangement episodes.
Progression: Progress to standing lumbar extension if prone position is unavailable.
Regression: Lie prone on elbows (sphinx pose) before progressing to full elbow lock-out.',
  'Contraindicated if symptoms peripheralize further down lower extremity (leg pain worsens). Indicated only when symptoms centralize.',
  true
),
(
  NULL,
  true,
  'Side Plank (Quadratus Lumborum Stabilization)',
  'strengthening',
  'lumbar',
  'unilateral',
  'Mat',
  'McGill Big 3 core exercise targeting lateral abdominal wall, quadratus lumborum, and gluteus medius.',
  'Starting Position: Lie on side propped up on forearm with elbow directly below shoulder and knees bent at 90 degrees (or legs straight for advanced).
Action: Lift hips off mat so body forms a straight line from knees/feet to shoulders. Keep neck neutral and abdominal wall braced. Hold position for prescribed time, then lower with control.
Dosage: 3 sets of 15-30 second holds per side.
Progression: Full side plank from feet with top arm extended toward ceiling.
Regression: Modified side plank from knees with hips slightly flexed.',
  'Do not allow top hip to roll forward or backward; maintain vertical alignment of pelvis.',
  true
),
-- Musculoskeletal - Shoulder
(
  NULL,
  true,
  'Side-Lying Shoulder External Rotation',
  'strengthening',
  'shoulder',
  'unilateral',
  'Dumbbell / Towel Roll',
  'Isolated hypertrophy and endurance training for infraspinatus and teres minor rotator cuff muscles.',
  'Starting Position: Lie on unaffected side with target arm on top, elbow bent at 90 degrees, and a small towel roll tucked between upper arm and ribcage.
Action: Keeping elbow pinned to side, slowly rotate forearm upward toward ceiling against gravity or a light dumbbell (1-3 kg). Hold for 1-2 seconds at top, then slowly lower over 3 seconds.
Dosage: 3 sets of 12-15 repetitions, once daily.
Progression: Increase weight by 0.5-1 kg increments or perform with a resistance band in standing.
Regression: Perform active-assisted rotation using unaffected hand or reduce weight to gravity-only.',
  'Do not roll torso backward to cheat range of motion. Keep elbow at exactly 90 degrees throughout.',
  true
),
(
  NULL,
  true,
  'Prone Y-to-T Raises (Scapular Stabilizers)',
  'strengthening',
  'shoulder',
  'bilateral',
  'Mat / Incline Bench',
  'Activation and strengthening of lower trapezius (Y-position) and middle trapezius (T-position).',
  'Starting Position: Lie prone on mat or 45-degree incline bench with arms dangling down toward floor and thumbs pointing upward.
Action: For T-raise: lift arms straight out to sides forming a "T" shape, squeezing mid-back shoulder blades together. For Y-raise: lift arms forward at 45-degree angle forming a "Y" shape, squeezing lower shoulder blades down and back. Hold 2 seconds and lower smoothly.
Dosage: 2-3 sets of 10-12 repetitions in each position.
Progression: Add light wrist weights or small 1 kg dumbbells.
Regression: Perform one arm at a time or reduce lift excursion.',
  'Avoid hiking shoulders upward toward ears. Keep cervical spine neutral.',
  true
),
(
  NULL,
  true,
  'Sleeper Stretch (Posterior Capsule)',
  'stretching',
  'shoulder',
  'unilateral',
  'Mat / Pillow',
  'Internal rotation and posterior glenohumeral capsule elongation for GIRD (Glenohumeral Internal Rotation Deficit).',
  'Starting Position: Lie on involved side with shoulder flexed 90 degrees and elbow bent 90 degrees so fingers point toward ceiling. Head supported comfortably on a pillow.
Action: Using opposite hand, gently press involved wrist down toward floor until a comfortable stretch is felt in posterior shoulder. Hold for 30 seconds while breathing smoothly.
Dosage: 3 sets of 30-second static holds, 1-2 times daily.
Progression: Increase internal rotation range as capsule adapts.
Regression: Roll body slightly backward (20-30 degrees) to decrease acute subacromial pinch.',
  'Do not force internal rotation aggressively. If sharp anterior shoulder impingement pain occurs, back off immediately.',
  true
),
(
  NULL,
  true,
  'Wall Slides with Serratus Anterior Shrug',
  'mobility',
  'shoulder',
  'bilateral',
  'Wall / Foam Roller',
  'Serratus anterior activation, upward scapular rotation facilitation, and dynamic shoulder mobility.',
  'Starting Position: Stand facing wall in staggered stance. Place forearms vertically against wall with elbows bent 90 degrees.
Action: Gently slide forearms upward along wall. At the top of range, reach and push upper back slightly away from wall (scapular protraction and upward shrug). Pause for 2 seconds, then return smoothly.
Dosage: 3 sets of 10-12 repetitions.
Progression: Place a mini resistance band around wrists to add external rotation resistance.
Regression: Perform seated with forearms sliding on a smooth tabletop.',
  'Maintain constant forearm contact with wall. Do not hyperextend lumbar spine to gain overhead height.',
  true
),
-- Musculoskeletal - Elbow, Wrist & Hand
(
  NULL,
  true,
  'Wrist Extensor Eccentric Loading (Tyler Twist)',
  'strengthening',
  'elbow',
  'unilateral',
  'Flexible Resistance Bar / Dumbbell',
  'Evidence-based eccentric loading protocol for lateral epicondylalgia (tennis elbow).',
  'Starting Position: Sit with involved forearm supported on table, wrist hanging over edge in full extension holding flexible bar or 1-2 kg dumbbell.
Action: Slowly lower wrist into full flexion over a 4-second count (eccentric phase). Use uninvolved hand to assist wrist back up into full extension (concentric phase) so target extensor tendon is not loaded concentrically.
Dosage: 3 sets of 15 repetitions, once or twice daily for 6-12 weeks.
Progression: Increase bar resistance or dumbbell mass.
Regression: Perform without external resistance (gravity only).',
  'Mild, tolerable discomfort during eccentric loading is expected; stop if sharp or disabling pain develops.',
  true
),
(
  NULL,
  true,
  'Wrist Flexor Eccentric Loading',
  'strengthening',
  'elbow',
  'unilateral',
  'Dumbbell / Table',
  'Controlled eccentric tendon loading for medial epicondylalgia (golfer''s elbow).',
  'Starting Position: Sit with forearm supported palm-up on table, wrist hanging over edge in full flexion holding light dumbbell.
Action: Slowly lower wrist backward into extension over 4-5 seconds (eccentric load). Use other hand to return wrist to starting flexed position.
Dosage: 3 sets of 15 repetitions daily.
Progression: Increase dumbbell load in 0.5 kg increments.
Regression: Reduce range of motion or lower resistance.',
  'Do not perform rapid ballistic wrist movements. Stop if median nerve tingling is elicited.',
  true
),
(
  NULL,
  true,
  'Finger Tendon Gliding Exercises',
  'mobility',
  'wrist_hand',
  'bilateral',
  'None',
  'Maximizes differential excursion between flexor digitorum superficialis and profundus tendons; carpal tunnel relief.',
  'Starting Position: Hold hand upright in open palm position with fingers straight and wrist neutral.
Action: Transition sequentially through 5 distinct hand positions: (1) Straight hand, (2) Hook fist (interphalangeal joints flexed, MCPs straight), (3) Full fist, (4) Flat fist (MCPs and PIPs flexed, DIPs straight), and (5) Straight hand. Hold each position for 2-3 seconds.
Dosage: 3-5 cycles of the sequence, 3 times daily.
Progression: Add gentle active wrist flexion and extension during each position.
Regression: Active-assisted tendon glides using the unaffected hand.',
  'Keep movements gentle and rhythmic. Do not clench fists with excessive force.',
  true
),
(
  NULL,
  true,
  'Forearm Pronation and Supination Drill',
  'mobility',
  'elbow',
  'unilateral',
  'Hammer / Light Club / Towel',
  'Restoration of proximal and distal radioulnar joint rotational mobility and forearm muscular balance.',
  'Starting Position: Sit tall with elbow bent to 90 degrees and tucked close to side. Hold base of a light hammer or lightweight stick upright.
Action: Slowly rotate forearm outward so palm faces up (supination), pause for 2 seconds, then rotate forearm inward so palm faces down (pronation). Use momentum of weighted hammer head for gentle overpressure.
Dosage: 3 sets of 10-12 repetitions in each direction.
Progression: Choke down further on handle of hammer to increase rotational lever arm.
Regression: Hold hammer close to head or use an unweighted pen.',
  'Ensure rotation originates strictly from forearm; do not allow upper arm or shoulder to flare outward.',
  true
),
-- Musculoskeletal - Hip
(
  NULL,
  true,
  'Side-Lying Clamshells with Resistance Band',
  'strengthening',
  'hip',
  'unilateral',
  'Loop Resistance Band / Mat',
  'Isolated activation and strengthening of gluteus medius posterior fibers and deep hip external rotators.',
  'Starting Position: Lie on side with hips flexed 45 degrees, knees bent 90 degrees, feet stacked together, and a loop band around thighs just above knees.
Action: Keeping heels glued together, slowly lift top knee upward toward ceiling while keeping pelvis and trunk completely still. Hold for 2 seconds at top, then lower over 3 seconds.
Dosage: 3 sets of 12-15 repetitions per side.
Progression: Elevate both feet 6 inches off mat while performing clamshell (floating clamshell).
Regression: Remove resistance band and perform bodyweight only.',
  'Do not allow top hip or pelvis to roll backward during knee elevation. Keep abdominal core engaged.',
  true
),
(
  NULL,
  true,
  'Standing Banded Hip Abduction',
  'strengthening',
  'hip',
  'unilateral',
  'Resistance Band / Wall Support',
  'Closed-chain stance leg stabilizer activation combined with open-chain abductor strengthening.',
  'Starting Position: Stand tall with hands lightly supporting on wall or sturdy chair, loop band around ankles.
Action: Shift weight onto stance leg with slight knee bend. Lift target leg out to side at 30-45 degree angle with toes pointed straight forward or slightly inward. Hold 1-2 seconds, then return under control.
Dosage: 3 sets of 10-12 repetitions per leg.
Progression: Stand on a balance foam pad or remove hand support.
Regression: Move band up to above knees to reduce lever arm resistance.',
  'Avoid leaning torso to opposite side to cheat the movement. Keep pelvis level.',
  true
),
(
  NULL,
  true,
  'Half-Kneeling Hip Flexor Stretch',
  'stretching',
  'hip',
  'unilateral',
  'Mat / Cushion',
  'Targeted elongation of iliopsoas and rectus femoris with pelvic posterior tilt stabilization.',
  'Starting Position: Half-kneeling position with target knee down on a padded mat and opposite foot flat on floor in front, forming 90-degree angles at both knees.
Action: Engage abdominal core and tuck tailbone under (posterior pelvic tilt). Gently glide weight forward 1-2 inches until a deep stretch is felt in front of back hip/groin. Hold for 30 seconds while maintaining posterior tilt.
Dosage: 3 sets of 30-second holds per side.
Progression: Raise arm on stretching side overhead and gently side-bend away from stretch.
Regression: Perform standing lunging stretch with hands supported on a table.',
  'Do not arch lumbar spine forward; anterior pelvic tilt nullifies the hip flexor stretch and compresses lumbar facet joints.',
  true
),
-- Musculoskeletal - Knee
(
  NULL,
  true,
  'Terminal Knee Extension (TKE) with Band',
  'strengthening',
  'knee',
  'unilateral',
  'Resistance Band / Anchor',
  'Isolated vastus medialis oblique (VMO) hypertrophy and terminal active knee extension motor control.',
  'Starting Position: Stand facing anchor point with a resistance band looped behind target knee. Stagger stance with target leg in front, knee slightly flexed.
Action: Straighten target knee fully by contracting quadriceps and pushing knee back against band resistance until heel is firmly grounded. Hold contraction for 2-3 seconds, then slowly allow knee to bend slightly forward.
Dosage: 3 sets of 15 repetitions.
Progression: Increase band tension or perform on a single leg.
Regression: Perform seated active knee extension without resistance.',
  'Do not hyperextend knee joint beyond anatomical neutral. Squeeze quadriceps smoothly without snapping joint.',
  true
),
(
  NULL,
  true,
  'Eccentric Decline Board Squat',
  'strengthening',
  'knee',
  'unilateral',
  '25-Degree Decline Board / Wedge',
  'Evidence-based Alfredson/Visnes eccentric loading protocol for patellar tendinopathy (Jumper''s knee).',
  'Starting Position: Stand on a 25-degree decline wedge with toes pointing downhill, feet shoulder-width apart.
Action: Balance on target leg and slowly squat down to approximately 60-70 degrees of knee flexion over a 4-second count (eccentric phase). Place uninvolved foot down and use both legs to return to standing (concentric phase).
Dosage: 3 sets of 15 repetitions twice daily for 12 weeks.
Progression: Add a backpack with weights or hold dumbbells.
Regression: Perform double-leg decline squats before progressing to single-leg.',
  'Mild patellar tendon discomfort is acceptable during rehab (NPRS <= 4/10); stop if sharp or progressive pain persists > 24 hours post-exercise.',
  true
),
(
  NULL,
  true,
  'Romanian Deadlift (RDL) with Dumbbells',
  'strengthening',
  'knee',
  'bilateral',
  'Dumbbells / Barbell',
  'Eccentric posterior chain loading targeting hamstring musculature and gluteal hip hinge mechanics.',
  'Starting Position: Stand with feet hip-width apart holding dumbbells in front of thighs, knees unlocked with slight 15-degree bend.
Action: Hinge at hips by pushing buttocks backward while maintaining flat lumbar spine. Lower weights along shins until a stretch is felt in hamstrings (around mid-shin). Squeeze glutes to return to tall standing.
Dosage: 3-4 sets of 8-10 repetitions.
Progression: Perform single-leg Romanian deadlift for unilateral stability.
Regression: Practice hip hinge mechanics with a wooden dowel along spine.',
  'Do not round lumbar spine or drop dumbbells below comfortable hamstring stretch range. Contraindicated in acute disc herniation.',
  true
),
(
  NULL,
  true,
  'Step-Down Drill (Eccentric Quadriceps)',
  'functional',
  'knee',
  'unilateral',
  'Aerobic Step / Box (4-6 inches)',
  'Patellofemoral tracking re-education, eccentric quadriceps control, and knee dynamic valgus mitigation.',
  'Starting Position: Stand on a 4-to-6 inch step or box on target leg, hands on hips.
Action: Keeping pelvis level and knee aligned over second toe, slowly bend target knee to lower opposite heel down toward floor over 3 seconds. Lightly tap heel on floor without bearing weight, then push through stance heel to return to top.
Dosage: 3 sets of 10 repetitions per leg.
Progression: Increase step height to 8 inches or perform lateral step-downs.
Regression: Lower step height to 2-3 inches or hold a railing for balance assistance.',
  'Ensure knee does not collapse inward (valgus collapse) during descent. Keep kneecap tracking over second toe.',
  true
),
-- Musculoskeletal - Ankle & Foot
(
  NULL,
  true,
  'Eccentric Heel Drop on Step (Alfredson Protocol)',
  'strengthening',
  'ankle_foot',
  'unilateral',
  'Stair Step / Sturdy Platform',
  'Gold-standard eccentric tendon remodeling protocol for mid-portion and insertional Achilles tendinopathy.',
  'Starting Position: Stand on balls of feet on edge of a step, heels hanging off.
Action: Rise up onto toes using both feet. Lift uninvolved foot off step, and slowly lower involved heel below level of step over a 4-second count. Place other foot down to push back up. Perform with knee straight (gastrocnemius) and knee slightly bent (soleus).
Dosage: 3 sets of 15 repetitions with straight knee AND 3 sets of 15 repetitions with bent knee, twice daily for 12 weeks.
Progression: Wear a weighted vest or hold a dumbbell.
Regression: Perform on flat floor without dropping below horizontal level (for insertional tendinopathy).',
  'For insertional Achilles tendinopathy, do not drop below step level to avoid tendon-calcaneus compression. Stop if sharp tearing sensation occurs.',
  true
),
(
  NULL,
  true,
  'Resisted Ankle Eversion with Resistance Band',
  'strengthening',
  'ankle_foot',
  'unilateral',
  'Resistance Band',
  'Targeted hypertrophy of peroneus longus and brevis for chronic lateral ankle instability rehabilitation.',
  'Starting Position: Sit with legs extended in front. Loop resistance band around target foot and anchor the other end across the opposite foot or sturdy post.
Action: Keeping knee still, turn target foot outward and slightly upward against band resistance (eversion). Hold for 2 seconds at end range, then return slowly over 3 seconds.
Dosage: 3 sets of 15-20 repetitions daily.
Progression: Increase band tension or perform in standing balance positions.
Regression: Active ankle eversion without band resistance.',
  'Isolate ankle eversion; do not rotate hip or knee to achieve lateral foot movement.',
  true
),
(
  NULL,
  true,
  'Towel Scrunches and Marble Pick-ups',
  'strengthening',
  'ankle_foot',
  'unilateral',
  'Hand Towel / Small Objects / Chair',
  'Intrinsic foot muscle strengthening, medial longitudinal arch restoration, and plantar fascia support.',
  'Starting Position: Sit tall in chair with bare feet flat on floor on top of a smooth hand towel.
Action: Keeping heel planted on floor, curl toes inward to grip towel and pull it toward you in scrunches. Repeat until entire towel is gathered. Reverse by pushing towel away.
Dosage: 3 full scrunches per foot, 1-2 times daily.
Progression: Place a small weight or water bottle on far end of towel to add resistance.
Regression: Perform toe spreads and big toe / lesser toe isolations without towel.',
  'Do not lift heel off floor. If foot cramps develop, pause and perform gentle arch stretch.',
  true
),
-- Neurological Rehabilitation - Stroke & Hemiplegia
(
  NULL,
  true,
  'Weight-Shifting in Standing with Mirror Feedback',
  'neuromuscular',
  'full_body',
  'bilateral',
  'Full-length Mirror / Parallel Bars',
  'Promotes symmetrical lower extremity loading, proprioceptive recalibration, and overcoming hemi-neglect.',
  'Starting Position: Stand facing a full-length mirror with feet hip-width apart and hands lightly resting on parallel bars or sturdy counter.
Action: Slowly shift body weight onto paretic leg until 60-70% of body weight is loaded. Observe mirror to maintain level pelvis, straight trunk, and relaxed paretic knee (avoid hyperextension/recurvatum). Hold for 5 seconds, then shift back to center.
Dosage: 3 sets of 10 shifts per side, twice daily.
Progression: Step forward onto paretic leg in staggered stance or reduce hand support.
Regression: Perform seated weight-shifting on a firm treatment bench.',
  'Guarding by clinician or caregiver required if fall risk is elevated. Guard against knee recurvatum.',
  true
),
(
  NULL,
  true,
  'Bilateral Upper Extremity Table Slides with Towel',
  'mobility',
  'shoulder',
  'bilateral',
  'Table / Towel / Chair',
  'Facilitates active-assisted forward reaching, protraction, and motor re-learning of the hemiparetic upper extremity.',
  'Starting Position: Sit upright at a smooth table. Place both hands palms-down on a folded towel, with unaffected hand clasping or guiding paretic hand if necessary.
Action: Slowly lean trunk forward while sliding both hands forward along tabletop to achieve maximal pain-free shoulder flexion and scapular protraction. Hold for 3 seconds, then push trunk back upright to starting position.
Dosage: 3 sets of 10 repetitions, 2-3 times daily.
Progression: Slide towel diagonally toward paretic side to increase functional reaching excursion.
Regression: Clinician or caregiver supports paretic forearm through glide.',
  'Ensure shoulder does not shrug or impinge during forward slide. Stop if subluxation discomfort occurs.',
  true
),
(
  NULL,
  true,
  'Bridging with Affected Limb Weight Acceptance',
  'neuromuscular',
  'hip',
  'bilateral',
  'Mat',
  'Breaks up lower extremity extensor synergy while building pelvic control for bed mobility and sit-to-stand transfers.',
  'Starting Position: Lie supine with knees bent to 90 degrees and feet flat on mat. Clinician or strap stabilizes paretic foot if prone to sliding into inversion.
Action: Press down evenly through both heels, engage gluteals, and lift hips off mat into a bridge. Ensure pelvis remains level without dropping on the paretic side. Hold for 3-5 seconds, then lower under control.
Dosage: 3 sets of 8-10 repetitions.
Progression: Lift unaffected foot slightly off mat for 1-2 seconds at top of bridge to force single-leg loading on paretic hip.
Regression: Place small bolster under knees for partial-range bridge.',
  'Watch for pelvic tilt asymmetry. Avoid breath holding and Valsalva maneuver.',
  true
),
-- Neurological Rehabilitation - Parkinson's Disease
(
  NULL,
  true,
  'LSVT BIG-Style High Amplitude Stepping Drill',
  'functional',
  'full_body',
  'bilateral',
  'Floor Markers / Open Space',
  'Combats hypometria and bradykinesia through exaggerated amplitude, visual cueing, and sensory recalibration.',
  'Starting Position: Stand tall with arms at sides in an open, uncluttered room with visual floor tape markers.
Action: Take an exaggerated, large-amplitude forward step with right foot while simultaneously swinging left arm forward and right arm backward with open fingers. Stomp foot firmly on marker, pause for 1 second in deep stretch, then push back forcefully to start. Alternate sides.
Dosage: 2-3 sets of 10 high-effort repetitions per side.
Progression: Add multi-directional stepping (lateral and backward steps).
Regression: Perform seated high-amplitude arm and leg extensions with vocal counting.',
  'Maintain adequate clinician supervision or balance support for patients with postural instability (Hoehn & Yahr stage 3+).',
  true
),
(
  NULL,
  true,
  'Dynamic Auditory-Cued Gait Training',
  'aerobic',
  'full_body',
  'bilateral',
  'Metronome / Rhythm App',
  'Rhythmic auditory stimulation (RAS) to normalize stride cadence, mitigate freezing of gait, and improve velocity.',
  'Starting Position: Stand at beginning of an unobstructed 20-meter hallway with metronome set to 100-110% of patient''s baseline cadence.
Action: Walk along hallway synchronizing heel strikes to the rhythmic auditory beat. Focus on long heel strikes, upright posture, and reciprocal arm swings.
Dosage: 4 bouts of 2-3 minutes of continuous walking with 1 minute rest between bouts.
Progression: Introduce obstacles or cognitive dual-tasking (e.g. counting backward by 3s while walking to beat).
Regression: March in place to the auditory beat while holding a sturdy handrail.',
  'Ensure clinician closely spots patient if freezing episodes typically occur during turning or doorway navigation.',
  true
),
-- Neurological Rehabilitation - Ataxia & Vestibular
(
  NULL,
  true,
  'Frenkel Coordination Heel-to-Shin Exercises',
  'neuromuscular',
  'knee',
  'unilateral',
  'Mat',
  'Sensory compensation and visual guidance drill for cerebellar ataxia and proprioceptive loss.',
  'Starting Position: Lie supine on mat with head slightly elevated on pillow so patient can clearly view lower limbs.
Action: Lift right heel and place it cleanly on opposite knee. Slowly and smoothly slide heel down the crest of the left shin toward ankle, then slide it back up to knee before returning to mat. Movements must be slow, accurate, and deliberate under continuous visual tracking.
Dosage: 2 sets of 6-8 repetitions per leg.
Progression: Perform same coordination sequence in sitting and standing.
Regression: Clinician marks target circles on shin to provide visual landing points.',
  'Do not rush repetitions. Accuracy, smoothness, and visual concentration are the clinical goals, not speed.',
  true
),
(
  NULL,
  true,
  'Vestibular VOR x1 Gaze Stabilization Drill',
  'neuromuscular',
  'cervical',
  'bilateral',
  'Target Card (Letter on wall or business card)',
  'Vestibulo-ocular reflex (VOR) adaptation exercise for vestibular hypofunction and gaze instability.',
  'Starting Position: Sit comfortably holding a target card with a single 14-point printed letter at arm''s length at eye level.
Action: Focus eyes intently on the letter. While keeping letter in sharp focus, rotate head horizontally left and right at a brisk frequency (1-2 Hz, like shaking head "no"). Head moves while eyes remain fixed on target. Perform for 30-60 seconds. Repeat with vertical head nodding ("yes").
Dosage: 3-5 sessions daily, 1 minute per direction.
Progression: Perform standing, standing in tandem stance, or against a visually busy background (checkerboard).
Regression: Slow down head rotation speed until target remains completely clear without blurring.',
  'Transient mild dizziness or nausea is expected; stop immediately if symptoms exceed 5/10 increase or persist > 20 minutes.',
  true
),
(
  NULL,
  true,
  'Brandt-Daroff Vestibular Habituation Drill',
  'mobility',
  'cervical',
  'bilateral',
  'Bed / Plinth',
  'Otolith particle dispersion and central vestibular habituation for benign paroxysmal positional vertigo (BPPV).',
  'Starting Position: Sit upright on edge of bed or treatment plinth.
Action: (1) Turn head 45 degrees to left. Quickly lie down onto right side so head is facing 45 degrees upward. Stay for 30 seconds or until vertigo ceases. (2) Sit upright for 30 seconds. (3) Turn head 45 degrees to right and lie down onto left side. Stay for 30 seconds. (4) Return upright.
Dosage: Complete 5 repetitions per session, 2-3 sessions daily for 2 weeks.
Progression: Not applicable; follow structured protocol until 2 consecutive symptom-free days.
Regression: Allow longer rests in seated position between sides.',
  'Do not drive immediately after completing exercises if vertigo or unsteadiness is elicited.',
  true
),
-- Paediatric Rehabilitation & Developmental Milestones
(
  NULL,
  true,
  'Prone Tummy Time with Chest Bolster Support',
  'strengthening',
  'cervical',
  'bilateral',
  'Mat / Rolled Towel or Bolster / Visual Toys',
  'Developmental milestone facilitation: cervical and thoracic extensor strengthening and upper extremity weight-bearing.',
  'Starting Position: Place infant or young child in prone position over a small rolled towel or semi-firm bolster placed under chest.
Action: Position engaging toys, mirrors, or caregiver face directly in child''s line of sight to encourage lifting head, extending neck, and propping onto forearms. Encourage tracking toy from side to side.
Dosage: 3-5 short bouts daily, starting with 2-3 minutes per bout as tolerated.
Progression: Remove bolster for independent floor tummy time and reaching for toys.
Regression: Perform prone on caregiver''s chest while reclined.',
  'Always perform under direct adult supervision. Never leave child unattended in prone position. Discontinue if child becomes fatigued or distressed.',
  true
),
(
  NULL,
  true,
  'Tall-Kneeling to Half-Kneeling Transitional Stepping',
  'neuromuscular',
  'hip',
  'bilateral',
  'Mat / Bench Support',
  'Facilitates lower extremity dissociation, pelvic stability, and preparatory motor control for standing and walking.',
  'Starting Position: Child starts in tall-kneeling position on a padded mat with hips fully extended and hands resting on a low bench or table.
Action: Encourage child to shift weight onto one knee and bring opposite foot forward flat on floor into half-kneeling. Hold half-kneeling for 3-5 seconds, then return to tall-kneeling and alternate legs.
Dosage: 2-3 sets of 6-8 transitions per side.
Progression: Add reaching for suspended toys without hand support on bench.
Regression: Therapist provides manual pelvic facilitation to guide transitional weight shift.',
  'Ensure adequate padding under knees. Guard against sudden loss of balance during weight shifts.',
  true
),
(
  NULL,
  true,
  'Bear Crawl Coordination Drill',
  'neuromuscular',
  'full_body',
  'bilateral',
  'Mat / Open Floor Space',
  'Promotes cross-lateral gross motor coordination, core stability, shoulder girdle weight-bearing, and vestibular input.',
  'Starting Position: Child starts on hands and feet with knees bent and hovering 2-3 inches above floor (quadruped hover).
Action: Crawl forward smoothly in a contralateral pattern: advance right hand and left foot simultaneously, followed by left hand and right foot. Keep hips level and back relatively flat.
Dosage: 3-4 bouts of 5-10 meters.
Progression: Bear crawl backward or navigate around floor cones.
Regression: Standard hands-and-knees crawling on floor.',
  'Ensure floor is free of sharp objects and hazards. Provide verbal encouragement and game-based framing.',
  true
),
-- Sports Rehabilitation & Return-to-Activity
(
  NULL,
  true,
  'Copenhagen Adductor Exercise (Groin Strain Protocol)',
  'strengthening',
  'hip',
  'unilateral',
  'Bench / Partner Support',
  'Evidence-based high-intensity eccentric adductor conditioning for groin injury prevention and return to kicking/cutting sports.',
  'Starting Position: Side-lying plank position with top ankle and lower leg supported on a flat bench (or held by partner), bottom leg hanging free underneath.
Action: Lift hips off ground into side plank supported on forearm and top leg. Concurrently raise bottom leg up to touch underside of bench, adducting both hips. Hold for 2-3 seconds, then lower under control.
Dosage: 2-3 sets of 6-8 repetitions per side, 2-3 times per week.
Progression: Increase lever arm by placing only top foot on bench.
Regression: Place bench support at knee joint level rather than ankle to reduce adductor torque.',
  'High adductor muscle soreness is common when initiating; build volume gradually. Contraindicated in acute adductor longus avulsion or high-grade tear.',
  true
),
(
  NULL,
  true,
  'Nordic Hamstring Curl (Eccentric Hamstring Protocol)',
  'strengthening',
  'knee',
  'bilateral',
  'Kneeling Mat / Ankle Anchor or Partner',
  'Proven injury prevention exercise generating maximal supramaximal eccentric hamstring force and muscle fascicle lengthening.',
  'Starting Position: Kneel on a padded mat with ankles securely anchored under a loaded barbell, machine strap, or held firmly by clinician/partner. Trunk upright, hips extended.
Action: Keeping straight line from knees to shoulders, slowly lean torso forward toward floor as far as possible resisting gravity purely with hamstrings. When eccentric control fails, catch yourself with hands in a push-up position, push off floor lightly, and return to upright.
Dosage: 2-3 sets of 4-6 repetitions, 1-2 times weekly.
Progression: Resist deeper into the descent before catching with hands.
Regression: Use an elastic resistance band looped under chest to offset bodyweight.',
  'Do not bend at the hips; maintain strict hip extension throughout the descent. Contraindicated in acute hamstring strains (< 4 weeks post-injury).',
  true
),
(
  NULL,
  true,
  'Lateral Bound and Stick (Frontal Plane Deceleration)',
  'functional',
  'full_body',
  'unilateral',
  'Open Gym Floor / Agility Markers',
  'Dynamic plyometric deceleration, reactive knee valgus control, and return-to-sport clearance drill.',
  'Starting Position: Stand on right leg with knee and hip slightly flexed in an athletic stance.
Action: Push off right leg explosively to bound laterally 3-5 feet onto left leg. Land softly on left foot absorbing force by flexing ankle, knee, and hip like an accordion. "Stick" the landing and freeze for 3 seconds with knee tracking directly over toes. Repeat in opposite direction.
Dosage: 3 sets of 6-8 bounds per side.
Progression: Add a reactive directional cue or bound over a 6-inch hurdle.
Regression: Reduce lateral distance or perform two-footed lateral hops.',
  'Do not allow knee to collapse into dynamic valgus on landing. Ensure patient has achieved 85%+ Limb Symmetry Index before introducing explosive plyometrics.',
  true
),
-- Geriatric Care, Falls & Balance
(
  NULL,
  true,
  '30-Second Chair Stand Functional Training Drill',
  'functional',
  'knee',
  'bilateral',
  'Standard Armless Chair (17 inches)',
  'Functional lower extremity extensor power, transfer independence, and sarcopenia mitigation in older adults.',
  'Starting Position: Sit upright on an armless 17-inch chair with feet flat on floor shoulder-width apart, arms crossed over chest.
Action: Stand completely upright pushing through heels, ensuring knees and hips lock out in full extension. Immediately sit back down lightly touching chair before standing again. Repeat at a brisk, safe pace for 30 seconds.
Dosage: 2-3 sets of 30-second bouts with 1-2 minutes rest between sets.
Progression: Add light hand weights or perform on a slightly lower surface.
Regression: Allow light hand push off armrests or use chair with 2-inch cushion riser.',
  'Ensure chair is backed against a wall to prevent slipping. Stop if chest tightness, lightheadedness, or shortness of breath occurs.',
  true
),
(
  NULL,
  true,
  'Multidirectional Stepping Clock Drill',
  'balance',
  'full_body',
  'bilateral',
  'Clock Face Visual Markers / Chair Support',
  'Dynamic reactive postural stepping, perturbation recovery, and base-of-support reconfiguration for fall prevention.',
  'Starting Position: Stand in center of an imaginary clock face with feet together, hands near a sturdy support if needed.
Action: Step right foot forward to 12:00, then return to center. Step to 1:00, 2:00, 3:00 (lateral), 4:00, 5:00, and 6:00 (backward). Repeat stepping pattern with left foot on the other side of clock (12:00 through 6:00).
Dosage: 2-3 complete cycles per leg.
Progression: Clinician calls out random clock numbers to force cognitive-motor quick stepping.
Regression: Limit stepping excursions to 12:00, 3:00, and 9:00 with hand support.',
  'Guarding required for individuals with BBS < 45 or history of recurrent falls.',
  true
),
(
  NULL,
  true,
  'Tandem Stance with Dual-Task Cognitive Challenge',
  'balance',
  'full_body',
  'bilateral',
  'Counter Support',
  'Static narrow base-of-support balance with divided attention for real-world fall risk reduction.',
  'Starting Position: Stand with one foot directly in front of the other (heel of front foot touching toes of back foot). Lightly touch counter or wall for initial safety.
Action: Once balanced, lift hands off support and maintain quiet tandem stance for 20-30 seconds while performing a cognitive task (e.g. naming animals, reciting months backward). Switch feet and repeat.
Dosage: 3-4 trials of 30 seconds per foot position.
Progression: Close eyes or stand on a soft balance foam pad.
Regression: Semi-tandem stance (heel of front foot placed diagonally against instep of back foot).',
  'Stand within arm''s reach of a wall or sturdy surface at all times during testing and training.',
  true
),
-- Cardiovascular & Pulmonary Rehabilitation
(
  NULL,
  true,
  'Diaphragmatic Breathing with Lower Rib Cage Expansion',
  'mobility',
  'thoracic',
  'bilateral',
  'Chair / Bed / Hands',
  'Reduces accessory breathing muscle tension, optimizes tidal volume, and reduces work of breathing in COPD/CHF.',
  'Starting Position: Sit upright in a supportive chair with shoulders and neck completely relaxed. Place one hand on upper chest and other hand on abdomen just below ribcage.
Action: Inhale slowly through nose, feeling abdomen rise and expand outward against hand while chest remains relatively still. Exhale gently and passively through pursed lips, allowing abdomen to sink inward.
Dosage: 3-5 minutes of relaxed diaphragmatic breathing, 3 times daily.
Progression: Practice during transfers, walking, and stair climbing.
Regression: Practice in reclined supine position with knees bent over pillows.',
  'Do not hyperventilate or force exhalation; avoid rapid shallow breaths.',
  true
),
(
  NULL,
  true,
  'Pursed-Lip Breathing Drill',
  'mobility',
  'thoracic',
  'bilateral',
  'None',
  'Generates positive end-expiratory pressure (PEEP) to prevent dynamic airway collapse during exertion.',
  'Starting Position: Sit or stand in a comfortable position with shoulders dropped.
Action: Inhale slowly through nose for 2 counts. Purse lips as if blowing out birthday candles or whistling. Exhale slowly and gently through pursed lips for a count of 4 (exhalation time is double inhalation time).
Dosage: Perform for 2-3 minutes during resting intervals or immediately upon onset of exertional dyspnea.
Progression: Coordinate breathing with walking (inhale for 2 paces, exhale through pursed lips for 4 paces).
Regression: Perform seated with elbows resting on knees (tripod position).',
  'Do not force air out aggressively; exhalation must be slow, controlled, and relaxed.',
  true
),
(
  NULL,
  true,
  'Active Cycle of Breathing Technique (ACBT)',
  'mobility',
  'thoracic',
  'bilateral',
  'Comfortable Chair',
  'Airway clearance technique: mobilizes and clears pulmonary secretions without inducing bronchospasm.',
  'Starting Position: Sit upright in a comfortable chair with arms supported.
Action: Follow the 3 phases: (1) Breathing Control: 4-5 relaxed diaphragmatic breaths. (2) Thoracic Expansion: 3-4 deep, slow inspirations with 3-second breath-hold at top, followed by unforced exhalations. (3) Huffing (Forced Expiratory Technique): Take a medium breath in, then exhale forcefully with an open throat ("huff") as if fogging a mirror. Repeat cycle until airways feel clear.
Dosage: 2-3 full cycles, 1-2 times daily or as needed for secretion clearance.
Progression: Add gentle manual chest percussion or vibration during thoracic expansion phase.
Regression: Shorten breath-hold if patient experiences paroxysmal coughing.',
  'Avoid violent coughing spells which cause airway collapse; huffing must be controlled with open glottis.',
  true
),
-- Pelvic & Women's Health
(
  NULL,
  true,
  'Pelvic Floor Muscle Training (Kegels with Knack Technique)',
  'strengthening',
  'other',
  'bilateral',
  'Mat / Chair',
  'Levator ani and pubococcygeus hypertrophy for urinary stress incontinence and pelvic organ prolapse support.',
  'Starting Position: Lie supine with knees bent (or sit tall in firm chair).
Action: Relax abdominal, gluteal, and inner thigh muscles. Gently squeeze and lift pelvic floor muscles inward and upward, as if attempting to stop the flow of urine or hold back gas. (1) Quick Flicks: 10 fast 1-second contractions. (2) Endurance Holds: Squeeze and hold for 6-8 seconds while breathing normally, then relax fully for 10 seconds.
Dosage: 3 sets of 10 endurance holds + 10 quick flicks, 2-3 times daily.
Progression: Perform in standing and execute "The Knack" (pre-contracting pelvic floor immediately prior to coughing, sneezing, or lifting).
Regression: Perform in side-lying with pillow between knees.',
  'Do not bear down (Valsalva) or squeeze buttocks/thighs. Ensure full, conscious relaxation between contractions to prevent hypertonicity.',
  true
),
(
  NULL,
  true,
  'Supine Transverse Abdominis Drawing-In Maneuver',
  'neuromuscular',
  'lumbar',
  'bilateral',
  'Mat / Biofeedback Pressure Unit',
  'Isolates deep transverse abdominis activation to restore lumbo-pelvic cylinder stability post-partum or post-injury.',
  'Starting Position: Lie supine with knees bent to 90 degrees, feet flat on floor, pelvis in neutral alignment. Place fingertips 1 inch medial and inferior to anterior superior iliac spines (ASIS).
Action: Inhale gently. As you exhale, gently draw lower abdomen toward spine as if zipping up a tight pair of trousers, feeling deep tension develop under fingertips without bulging. Hold tension for 5-10 seconds while breathing normally.
Dosage: 3 sets of 10 repetitions with 10-second holds.
Progression: Maintain transverse abdominis contraction while performing single-leg heel slides or bent knee fallout.
Regression: Practice in quadruped position utilizing gravity assist.',
  'Do not flatten lumbar spine against floor or flare ribcage (rectus abdominis substitution). Contraction must be subtle and deep.',
  true
),
-- Oncology & Amputee Rehabilitation
(
  NULL,
  true,
  'Transtibial Residual Limb Extension and Prone Positioning',
  'mobility',
  'hip',
  'unilateral',
  'Mat / Plinth',
  'Critical contracture prevention drill preserving knee and hip extension mobility for prosthetic ambulation.',
  'Starting Position: Lie prone on flat mat with residual limb extended. A small towel roll may be placed under distal residual limb if needed.
Action: Actively tighten gluteal muscles and press residual limb gently downward into mat to achieve full 0-degree knee and hip extension. Hold contraction for 10 seconds, then relax. Spend a minimum of 20-30 minutes daily in this prone extended position.
Dosage: 3 sets of 10 isometric presses; 20-30 minutes static prone rest daily.
Progression: Add gentle active hip hyperextension lifting residual limb 1-2 inches off mat in prone.
Regression: Supine positioning with knee kept strictly straight with knee immobilizer or board.',
  'Never place pillows under knee or hip in supine/sitting, as this promotes rapid flexion contractures which disqualify prosthetic fitting.',
  true
),
(
  NULL,
  true,
  'Residual Limb Desensitization and Towel Friction Drill',
  'neuromuscular',
  'knee',
  'unilateral',
  'Cotton Ball / Silk Cloth / Terrycloth Towel',
  'Promotes cortical sensory reorganization and reduces allodynia/phantom limb pain preparatory to prosthetic socket wear.',
  'Starting Position: Sit comfortably on chair or bed with residual limb exposed and skin clean and dry.
Action: Gently rub distal residual limb and surgical scar line in circular motions using progressively textured fabrics: start with soft cotton/silk for 3-5 minutes, progressing over days to a rougher terrycloth towel, gentle tapping with fingertips, and gentle skin rolling.
Dosage: 10 minutes, 2-3 times daily.
Progression: Progress to gentle distal residual limb massage and elastic shrinker sock wear.
Regression: Use light air blowing or gentle brush strokes if hyperalgesia is extreme.',
  'Contraindicated over open wounds, active skin breakdown, or unhealed suture lines. Discontinue if redness persists > 30 minutes.',
  true
)
ON CONFLICT (lower(trim(name))) WHERE practice_id IS NULL
DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. EXPANDED VALIDATED CLINICAL OUTCOME MEASURES
-- ------------------------------------------------------------------------------
INSERT INTO public.outcome_measure_definitions (
  practice_id,
  code,
  name,
  description,
  category,
  scoring_type,
  min_score,
  max_score,
  score_unit,
  interpretation_guide,
  is_system,
  is_active
) VALUES
-- Neurological Outcomes
(
  NULL,
  'MAS',
  'Modified Ashworth Scale for Spasticity',
  'Standardized 6-point clinical grading scale assessing muscle tone and resistance to passive velocity-dependent muscle elongation.',
  'functional',
  'points_scale',
  0,
  4,
  '/4',
  '0 = No increase in muscle tone; 1 = Slight increase (catch and release or minimal resistance at end ROM); 1.5 (1+) = Catch followed by minimal resistance throughout remainder (< half) of ROM; 2 = Marked increase in tone through most of ROM, but affected part easily moved; 3 = Considerable increase in tone, passive movement difficult; 4 = Affected part rigid in flexion or extension.',
  true,
  true
),
(
  NULL,
  '10MWT',
  '10-Meter Walk Test',
  'Objective performance test measuring self-selected and fast walking velocity (m/s) over a 10-meter course with acceleration/deceleration buffers.',
  'mobility',
  'numeric',
  0,
  10,
  'm/s',
  'Calculated as 6 meters divided by time in seconds. Functional community thresholds: < 0.40 m/s = Household ambulator; 0.40 - 0.80 m/s = Limited community ambulator; > 0.80 m/s = Community ambulator; > 1.2 m/s = Able to safely cross street intersections. MCID in stroke is 0.16 m/s.',
  true,
  true
),
(
  NULL,
  'DGI',
  'Dynamic Gait Index',
  'Standardized 8-item observational test evaluating dynamic balance, head-turning stability, pivot turns, and obstacle negotiation during ambulation.',
  'mobility',
  'points_scale',
  0,
  24,
  '/24',
  'Each of 8 tasks scored 0 (severe impairment) to 3 (normal). Maximum score = 24. Scores <= 19 indicate significant fall risk in older adults and individuals with vestibular dysfunction. MCID is 2.6 - 3.0 points.',
  true,
  true
),
(
  NULL,
  'FMA-UE',
  'Fugl-Meyer Assessment - Upper Extremity Motor Score',
  'Gold-standard evaluative index measuring post-stroke sensorimotor impairment, synergy recovery, and isolated joint movement of the upper extremity.',
  'functional',
  'points_scale',
  0,
  66,
  '/66',
  'Scores: 0-31 = Severe motor impairment; 32-47 = Moderate motor impairment; 48-65 = Mild motor impairment; 66 = Fully intact motor function. Minimally Clinically Important Difference (MCID) is 9-10 points.',
  true,
  true
),
-- Geriatric / Falls Outcomes
(
  NULL,
  '30CST',
  '30-Second Chair Stand Test',
  'Objective functional test measuring lower body muscular power and endurance by counting completed full sit-to-stand repetitions within 30 seconds.',
  'functional',
  'numeric',
  0,
  50,
  'reps',
  'CDC STEADI Norms (65-69 yrs): Men < 12 reps, Women < 11 reps indicates elevated fall risk. (70-74 yrs): Men < 12, Women < 10. (75-79 yrs): Men < 11, Women < 10. MCID is 2.0 repetitions.',
  true,
  true
),
(
  NULL,
  'POMA',
  'Tinetti Performance Oriented Mobility Assessment',
  'Comprehensive task-oriented clinical assessment evaluating static balance (16 pts) and dynamic gait characteristics (12 pts) in older adults.',
  'mobility',
  'points_scale',
  0,
  28,
  '/28',
  'Combined Score: 24-28 = Low fall risk; 19-23 = Moderate fall risk; <= 18 = High fall risk (risk of falling is increased fivefold). MCID is 4.0 points.',
  true,
  true
),
(
  NULL,
  'FSST',
  'Four Square Step Test',
  'Dynamic balance and rapid stepping test evaluating multidirectional agility and obstacle avoidance over canes arranged in a cross on the floor.',
  'mobility',
  'timed_seconds',
  0,
  60,
  'seconds',
  'Measures total elapsed time to step clockwise and counter-clockwise through 4 quadrants. Cutoff thresholds: > 15 seconds indicates high fall risk in community older adults; > 12 seconds indicates fall risk in vestibular patients.',
  true,
  true
),
-- Sports & Return-to-Activity
(
  NULL,
  'YBT-LQ',
  'Lower Quarter Y-Balance Test',
  'Dynamic single-leg postural control and balance screen measuring normalized reach distance in anterior, posteromedial, and posterolateral directions.',
  'functional',
  'percentage',
  0,
  150,
  '% composite',
  'Composite Score = ((Anterior + Posteromedial + Posterolateral) / (3 * Limb Length)) * 100%. Composite score < 94% or Anterior reach asymmetry > 4 cm indicates significantly elevated risk of non-contact lower extremity athletic injury.',
  true,
  true
),
(
  NULL,
  'SLHD',
  'Single Leg Hop for Distance (LSI)',
  'Performance-based functional test evaluating lower extremity explosive power and landing stability following ACL reconstruction or knee injury.',
  'functional',
  'percentage',
  0,
  150,
  '% LSI',
  'Limb Symmetry Index (LSI) = (Involved Limb Mean Hop Distance / Uninvolved Limb Mean Hop Distance) * 100%. Clinical return-to-sport benchmark is LSI >= 90% without dynamic valgus collapse.',
  true,
  true
),
-- Cardiopulmonary Outcomes
(
  NULL,
  '6MWT',
  '6-Minute Walk Test',
  'Submaximal exercise capacity test measuring maximum distance walked in meters along a flat corridor over 6 minutes.',
  'mobility',
  'numeric',
  0,
  1200,
  'meters',
  'Healthy adult norms: 400 - 700 meters. Distance < 300 meters predicts increased mortality and high healthcare utilization in cardiac and pulmonary populations. MCID across COPD and heart failure is 30.0 - 54.0 meters.',
  true,
  true
),
(
  NULL,
  'BORG-RPE',
  'Borg Rating of Perceived Exertion (6-20 Scale)',
  'Standardized 15-point numerical rating of perceived physical exertion and cardiovascular effort during exercise training.',
  'functional',
  'numeric',
  6,
  20,
  '/20',
  '6 = No exertion at all; 7-8 = Extremely light; 9-10 = Very light; 11-12 = Light; 13-14 = Somewhat hard (target aerobic training zone); 15-16 = Hard (heavy); 17-18 = Very hard; 19 = Extremely hard; 20 = Maximal exertion. Corresponds roughly to Heart Rate = RPE x 10.',
  true,
  true
),
(
  NULL,
  'BORG-CR10',
  'Modified Borg Dyspnea Scale (CR-10)',
  'Category-ratio clinical scale measuring subjective intensity of shortness of breath (dyspnea) during exertion.',
  'functional',
  'numeric',
  0,
  10,
  '/10',
  '0 = Nothing at all; 0.5 = Very, very slight; 1 = Very slight; 2 = Slight; 3 = Moderate breathlessness; 4 = Somewhat severe; 5 = Severe dyspnea; 7 = Very severe; 10 = Maximal / suffocating. Target cardiopulmonary training range: 3 - 5.',
  true,
  true
),
-- Musculoskeletal / Joint-Specific
(
  NULL,
  'WOMAC',
  'WOMAC Osteoarthritis Index (Score Entry)',
  'Standardized health status instrument measuring pain, joint stiffness, and physical functional limitation in hip and knee osteoarthritis.',
  'functional',
  'percentage',
  0,
  100,
  '%',
  'Normalized percentage score from 0% (no disability/symptoms) to 100% (extreme disability and severe osteoarthritis symptoms). Minimally Clinically Important Difference (MCID) is 10-15%.',
  true,
  true
),
(
  NULL,
  'SPADI',
  'Shoulder Pain and Disability Index (Score Entry)',
  'Joint-specific self-report index assessing shoulder pain severity (5 items) and functional limitation (8 items) in upper extremity disorders.',
  'functional',
  'percentage',
  0,
  100,
  '%',
  'Total score ranges from 0% (best, no pain or disability) to 100% (worst, maximum shoulder pain and complete disability). MCID is 8 - 13 points.',
  true,
  true
),
(
  NULL,
  'FAAM',
  'Foot and Ankle Ability Measure (ADL Subscale)',
  'Comprehensive self-report measure evaluating functional limitation in daily living activities for lower leg, ankle, and foot conditions.',
  'functional',
  'percentage',
  0,
  100,
  '%',
  'ADL Subscale: 0% = Total functional inability; 100% = Full function with zero difficulty in daily weight-bearing tasks. MCID is 8.0 percentage points.',
  true,
  true
),
-- Paediatric Outcomes
(
  NULL,
  'GMFCS',
  'Gross Motor Function Classification System (Level)',
  'International 5-level clinical classification of self-initiated gross motor function in children with cerebral palsy.',
  'functional',
  'categorical',
  1,
  5,
  'Level',
  'Level I = Walks without limitations; Level II = Walks with limitations (uneven surfaces, crowds); Level III = Walks using hand-held mobility device; Level IV = Self-mobility with limitations, may use powered mobility; Level V = Transported in manual wheelchair with extensive trunk and head support needed.',
  true,
  true
),
(
  NULL,
  'PBS',
  'Pediatric Balance Scale',
  'Standardized 14-item functional balance assessment modified for school-age children with mild-to-moderate motor impairments.',
  'mobility',
  'points_scale',
  0,
  56,
  '/56',
  'Each item scored 0 to 4. Maximum score = 56. Scores below 50 indicate impaired postural stability and fall risk during playground and physical education activities in school-age children.',
  true,
  true
)
ON CONFLICT (code) WHERE practice_id IS NULL
DO NOTHING;

-- End of migration
