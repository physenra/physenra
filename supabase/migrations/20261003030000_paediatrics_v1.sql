-- ==============================================================================
-- PHYSENRA DATABASE MIGRATION: PAEDIATRIC STRUCTURED CLINICAL MODULE V1
-- Timestamp: 20261003030000_paediatrics_v1.sql
--
-- Domain: Paediatric Physiotherapy Structured Clinical Examination V1
-- 
-- Scope:
-- 1. Seeds system definition PAEDS_EXAMINATION_V1 in clinical_assessment_definitions
-- 2. Preserves existing PAEDS_GROSS_MOTOR_SCREEN v1 for complete backward-compatibility
-- 3. Incorporates all core clinical domains:
--    - Developmental / Clinical Context (Referral reason, perinatal history, medical history, caregiver present)
--    - Developmental Milestones (Head control, rolling, sitting, crawling, standing, walking, running, stairs)
--    - Gross Motor Development (Postural control, floor mobility, transitions, symmetry, observational GMFCS)
--    - Fine Motor Observation (Upper limb functional use, bilateral use, reach/grasp, object manipulation)
--    - Tone & Movement Quality (Muscle tone, movement fluidity, symmetry, involuntary movements)
--    - Posture & Alignment (Head/trunk alignment, sitting/standing posture, lower limb alignment)
--    - Balance & Coordination (Static, dynamic, protective/equilibrium reactions, coordination)
--    - Functional Mobility (Floor-to-stand, sit-to-stand, transfers, walking, stairs, assistive device)
--    - Play & Participation (Play engagement, activity limitations, caregiver goals)
--    - Clinical Examination Summary & Notes
-- 4. Uses authoritative patient date of birth (derived age, zero duplicate DOB storage)
-- 5. Preserves existing emergency contact architecture without conflating it with legal guardian
-- 6. Purely observational documentation — zero automated developmental delay diagnosis or prognosis
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEED DEFINITION: PAEDS_EXAMINATION_V1
-- ------------------------------------------------------------------------------
INSERT INTO public.clinical_assessment_definitions (
  practice_id,
  code,
  name,
  description,
  specialty,
  version,
  status,
  is_system,
  schema_definition,
  validation_rules,
  display_metadata
) VALUES (
  NULL,
  'PAEDS_EXAMINATION_V1',
  'Comprehensive Paediatric Physiotherapy Examination V1',
  'Clinician-guided structured paediatric examination documenting clinical observations across developmental context, developmental milestones, gross motor function, fine motor observation, muscle tone and movement quality, posture, balance and protective reactions, functional mobility, and play participation.',
  'paediatric',
  1,
  'active',
  true,
  '{
    "title": "Comprehensive Paediatric Physiotherapy Examination V1",
    "version": 1,
    "specialty": "paediatric",
    "sections": [
      {
        "id": "clinical_context",
        "title": "1. Developmental & Clinical Context",
        "description": "Referral reason, perinatal background, developmental context, and caregiver present during encounter. (Age is derived from authoritative patient profile).",
        "fields": [
          {
            "id": "referral_reason",
            "label": "Primary Reason for Physiotherapy / Referral Context",
            "type": "select",
            "options": [
              "Gross Motor Development Concerns",
              "Postural Alignment / Torticollis / Plagiocephaly",
              "Gait Abnormality / In-toeing / Toe-Walking",
              "Neuromotor Impairment / Cerebral Palsy Assessment",
              "Developmental Coordination Difficulty",
              "Musculoskeletal Injury / Pain",
              "Post-Surgical / Orthopaedic Rehabilitation",
              "Other Paediatric Concern",
              "NT"
            ],
            "required": true
          },
          {
            "id": "caregiver_present",
            "label": "Caregiver Accompanying Child",
            "type": "select",
            "options": [
              "Mother",
              "Father",
              "Both Parents",
              "Grandparent",
              "Foster Carer",
              "Legal Guardian",
              "Other Family Member / Carer",
              "Unaccompanied (Adolescent)",
              "NT"
            ],
            "required": true
          },
          {
            "id": "birth_perinatal_history",
            "label": "Perinatal & Birth History (If Clinically Relevant)",
            "type": "textarea",
            "description": "e.g., Gestational age at birth, birth weight, delivery mode, NICU/SCBU stay, neonatal complications.",
            "required": false
          },
          {
            "id": "developmental_medical_history",
            "label": "Relevant Medical & Developmental History",
            "type": "textarea",
            "description": "e.g., Medical diagnoses, seizures, respiratory status, feeding/swallowing history, hearing/vision, surgeries, medications.",
            "required": false
          }
        ]
      },
      {
        "id": "developmental_milestones",
        "title": "2. Developmental Milestones",
        "description": "Structured clinical observation of developmental milestone attainment. Observational status only — zero automated normative diagnostic classification.",
        "fields": [
          { "id": "milestone_head_control", "label": "Head Control (Antigravity lift in prone/sitting)", "type": "select", "options": ["Achieved", "Emerging", "Not Yet Achieved", "Not Assessed", "Unable to Determine"], "required": true },
          { "id": "milestone_rolling", "label": "Rolling (Prone to supine and supine to prone)", "type": "select", "options": ["Achieved", "Emerging", "Not Yet Achieved", "Not Assessed", "Unable to Determine"], "required": true },
          { "id": "milestone_sitting", "label": "Independent Sitting (Hands-free floor sitting)", "type": "select", "options": ["Achieved", "Emerging", "Not Yet Achieved", "Not Assessed", "Unable to Determine"], "required": true },
          { "id": "milestone_crawling", "label": "Crawling / Reciprocal Creeping (Hands & knees)", "type": "select", "options": ["Achieved", "Emerging", "Not Yet Achieved", "Not Assessed", "Unable to Determine"], "required": true },
          { "id": "milestone_standing", "label": "Independent Standing (No external handheld support)", "type": "select", "options": ["Achieved", "Emerging", "Not Yet Achieved", "Not Assessed", "Unable to Determine"], "required": true },
          { "id": "milestone_walking", "label": "Independent Walking (Bipedal locomotion)", "type": "select", "options": ["Achieved", "Emerging", "Not Yet Achieved", "Not Assessed", "Unable to Determine"], "required": true },
          { "id": "milestone_running", "label": "Running (Flight phase observed)", "type": "select", "options": ["Achieved", "Emerging", "Not Yet Achieved", "Not Assessed", "Unable to Determine"], "required": false },
          { "id": "milestone_stair_mobility", "label": "Stair Mobility (Ascending and descending)", "type": "select", "options": ["Achieved", "Emerging", "Not Yet Achieved", "Not Assessed", "Unable to Determine"], "required": false },
          { "id": "milestone_notes", "label": "Developmental Milestones Clinical Observations", "type": "textarea", "required": false }
        ]
      },
      {
        "id": "gross_motor",
        "title": "3. Gross Motor Development & Postural Control",
        "description": "Antigravity postural control, floor locomotion, movement symmetry, and observational gross motor classification.",
        "fields": [
          {
            "id": "prone_head_control",
            "label": "Prone: Head Lift & Forearm Support",
            "type": "select",
            "options": ["Age Appropriate / Mature", "Emerging (45 deg lift)", "Transient / Inconsistent", "Unable / Marked Lag", "NT"],
            "required": true
          },
          {
            "id": "sitting_posture",
            "label": "Sitting Posture & Trunk Alignment",
            "type": "select",
            "options": ["Independent Upright (Stable)", "Propped / Ring Sitting with Hands", "Kyphotic / Requires Pelvic Support", "Unable without Full External Support", "NT"],
            "required": true
          },
          {
            "id": "floor_mobility",
            "label": "Floor Mobility & Transitional Movement",
            "type": "select",
            "options": ["Reciprocal Crawling (Hands & Knees)", "Commando / Belly Crawling", "Bottom Shuffling", "Rolls for Mobility", "Stationary / Unable", "NT"],
            "required": true
          },
          {
            "id": "gross_motor_symmetry",
            "label": "Bilateral Symmetry of Gross Motor Movement",
            "type": "select",
            "options": ["Symmetric Both Sides", "Mild Asymmetry Observed", "Marked Hemilateral Asymmetry", "Fluctuating Asymmetry", "NT"],
            "required": true
          },
          {
            "id": "gmfcs_classification",
            "label": "GMFCS Classification (If Clinically Applicable)",
            "type": "select",
            "options": [
              "Not Applicable / Typical Development",
              "GMFCS Level I",
              "GMFCS Level II",
              "GMFCS Level III",
              "GMFCS Level IV",
              "GMFCS Level V",
              "NT"
            ],
            "required": true
          },
          { "id": "gross_motor_notes", "label": "Gross Motor Observations & Movement Patterns", "type": "textarea", "required": false }
        ]
      },
      {
        "id": "fine_motor",
        "title": "4. Fine Motor Observation",
        "description": "Limited observational screening of upper limb functional use, grasp, and bilateral coordination.",
        "fields": [
          {
            "id": "reaching_targeting",
            "label": "Reaching & Upper Limb Targeting",
            "type": "select",
            "options": ["Accurate Direct Reach", "Undershoots / Tremor Observed", "Asymmetric Reaching (Unilateral Preference)", "Unable to Initiate Reach", "NT"],
            "required": true
          },
          {
            "id": "grasp_release",
            "label": "Grasp & Voluntary Release",
            "type": "select",
            "options": ["Mature Pincer / Radial Grasp with Voluntary Release", "Palmar / Primitive Grasp with Inconsistent Release", "Weak Grasp / Fisting Present", "No Voluntary Grasp Observed", "NT"],
            "required": true
          },
          {
            "id": "bilateral_hand_use",
            "label": "Bilateral Hand Use & Midline Play",
            "type": "select",
            "options": ["Brings Hands to Midline & Bimanual Transfer", "One Hand Dominates / Neglects Other", "Unable to Cross Midline", "NT"],
            "required": false
          },
          { "id": "fine_motor_notes", "label": "Fine Motor Functional Observations", "type": "textarea", "required": false }
        ]
      },
      {
        "id": "tone_movement",
        "title": "5. Muscle Tone & Movement Quality",
        "description": "General muscle tone, movement fluidity, and involuntary movement observations.",
        "fields": [
          {
            "id": "general_muscle_tone",
            "label": "General Resting Muscle Tone",
            "type": "select",
            "options": [
              "Typical / Normal Tone",
              "Hypotonia / Low Tone Dominant",
              "Hypertonia / Increased Tone Dominant",
              "Fluctuating / Dystonic Tone",
              "Mixed Tone Presentation",
              "NT"
            ],
            "required": true
          },
          {
            "id": "movement_fluidity",
            "label": "Movement Fluidity & Variability",
            "type": "select",
            "options": ["Fluid & Varied Movement Patterns", "Stereotyped / Monotonous Patterns", "Jerky / Tremulous Movements", "Paucity of Spontaneous Movement", "NT"],
            "required": true
          },
          {
            "id": "involuntary_movements",
            "label": "Involuntary Movements Observed",
            "type": "select",
            "options": ["None Observed", "Dystonic Posturing", "Choreoathetosis Observed", "Tremor Present", "NT"],
            "required": false
          },
          { "id": "tone_notes", "label": "Tone Distribution & Qualitative Movement Notes", "type": "textarea", "required": false }
        ]
      },
      {
        "id": "posture_alignment",
        "title": "6. Posture & Musculoskeletal Alignment",
        "description": "Observational assessment of head alignment, spine, pelvic symmetry, and lower extremity alignment.",
        "fields": [
          {
            "id": "head_alignment",
            "label": "Head Alignment & Cervical Posture",
            "type": "select",
            "options": ["Midline & Symmetrical", "Persistent Tilt to Right", "Persistent Tilt to Left", "Persistent Rotation Preference", "Extensor Posturing / Head Lag", "NT"],
            "required": true
          },
          {
            "id": "spinal_alignment",
            "label": "Spine & Trunk Alignment",
            "type": "select",
            "options": ["Neutral & Flexible Alignment", "Postural Kyphosis Observed", "Scoliotic Asymmetry Observed", "Hyperextension Posturing", "NT"],
            "required": true
          },
          {
            "id": "lower_limb_alignment",
            "label": "Lower Limb Alignment Observations",
            "type": "select",
            "options": ["Within Typical Range", "Excessive Genu Valgum / Varum", "In-toeing / Internal Rotation", "Out-toeing / External Rotation", "Excessive Calcaneal Pronation / Flatfoot", "Equinus / Toe Contact", "NT"],
            "required": false
          },
          { "id": "posture_notes", "label": "Postural Alignment & Joint Range Notes", "type": "textarea", "required": false }
        ]
      },
      {
        "id": "balance_coordination",
        "title": "7. Balance & Protective Reactions",
        "description": "Static/dynamic balance and protective reactions. (Formal BBS/TUG psychometric outcomes remain separate).",
        "fields": [
          {
            "id": "static_balance",
            "label": "Static Postural Balance",
            "type": "select",
            "options": ["Stable in Age-Appropriate Postures", "Mild Instability / Wide Base Required", "Requires Constant Physical Support", "Unable to Maintain Stance / Sitting", "NT"],
            "required": true
          },
          {
            "id": "protective_reactions",
            "label": "Protective Reactions (Arms Extension on Perturbation)",
            "type": "select",
            "options": ["Present Anterior, Lateral & Posterior", "Anterior Present; Lateral/Posterior Delayed", "Delayed / Inconsistent Bilaterally", "Absent Protective Extension", "NT"],
            "required": true
          },
          {
            "id": "coordination_quality",
            "label": "Motor Coordination & Cadence",
            "type": "select",
            "options": ["Smooth & Well Coordinated", "Mild Clumsiness / Tripping Observed", "Marked Dyscoordination / Ataxia", "NT"],
            "required": false
          },
          { "id": "balance_notes", "label": "Balance, Protective Reactions & Outcome Notes", "type": "textarea", "required": false }
        ]
      },
      {
        "id": "functional_mobility",
        "title": "8. Functional Mobility & Locomotion",
        "description": "Everyday functional transitions, walking, running, and assistive device needs.",
        "fields": [
          {
            "id": "floor_to_stand",
            "label": "Floor-to-Stand Transition",
            "type": "select",
            "options": ["Independent without External Support", "Independent with Quadruped / Half-Kneeling", "Uses Furniture / External Hand Support", "Requires Physical Assistance from Carer", "Unable", "NT"],
            "required": true
          },
          {
            "id": "walking_mobility",
            "label": "Walking & Ambulation Status",
            "type": "select",
            "options": ["Independent Community Ambulator", "Independent Indoor Ambulator", "Walks with Handheld Assist", "Walks with Assistive Device", "Non-Ambulatory", "NT"],
            "required": true
          },
          {
            "id": "assistive_device",
            "label": "Assistive Device / Mobility Equipment",
            "type": "select",
            "options": ["None / Independent", "Posterior / Anterior Walker", "Crutches / Canes", "Stroller / Adaptive Pushchair", "Manual Wheelchair", "Powered Wheelchair", "NT"],
            "required": true
          },
          {
            "id": "stair_mobility",
            "label": "Stair Mobility Ability",
            "type": "select",
            "options": ["Reciprocal Feet Up & Down Independently", "Mark-Time (2 Feet per Step) with Handrail", "Creeps / Crawls on Stairs", "Requires 1-to-1 Physical Assistance", "Unable / Non-Ambulatory on Stairs", "NT"],
            "required": false
          },
          { "id": "functional_mobility_notes", "label": "Functional Locomotion & Endurance Observations", "type": "textarea", "required": false }
        ]
      },
      {
        "id": "play_participation",
        "title": "9. Play, Activity & Environmental Participation",
        "description": "Observational assessment of child engagement, toy exploration, and caregiver-reported priorities.",
        "fields": [
          {
            "id": "play_engagement",
            "label": "Play Engagement & Environmental Exploration",
            "type": "select",
            "options": ["Active Exploration & Varied Play", "Requires Encouragement / Facilitation", "Sedentary / Reluctant to Explore", "Severely Limited by Physical Access", "NT"],
            "required": true
          },
          {
            "id": "caregiver_concerns_goals",
            "label": "Caregiver-Reported Concerns & Family Functional Goals",
            "type": "textarea",
            "description": "Caregiver-stated priorities, daily routine challenges (e.g. dressing, car transfers, playground access).",
            "required": false
          }
        ]
      },
      {
        "id": "summary",
        "title": "10. Clinical Examination Summary & Notes",
        "description": "Clinician synthesis of findings and functional rehabilitation priorities without automated diagnostic claims.",
        "fields": [
          {
            "id": "clinical_summary",
            "label": "Paediatric Examination Findings & Functional Impact",
            "type": "textarea",
            "description": "Clinical observational synthesis of developmental findings, movement quality, and priority areas for physical therapy.",
            "required": false
          }
        ]
      }
    ]
  }'::jsonb,
  '{
    "required_sections": [
      "clinical_context",
      "developmental_milestones",
      "gross_motor",
      "fine_motor",
      "tone_movement",
      "posture_alignment",
      "balance_coordination",
      "functional_mobility",
      "play_participation"
    ],
    "allowed_milestone_states": ["Achieved", "Emerging", "Not Yet Achieved", "Not Assessed", "Unable to Determine"],
    "allowed_tone_states": [
      "Typical / Normal Tone",
      "Hypotonia / Low Tone Dominant",
      "Hypertonia / Increased Tone Dominant",
      "Fluctuating / Dystonic Tone",
      "Mixed Tone Presentation",
      "NT"
    ],
    "allowed_gmfcs_values": [
      "Not Applicable / Typical Development",
      "GMFCS Level I",
      "GMFCS Level II",
      "GMFCS Level III",
      "GMFCS Level IV",
      "GMFCS Level V",
      "NT"
    ]
  }'::jsonb,
  '{
    "icon": "Baby",
    "badge_color": "emerald",
    "display_order": 15,
    "specialty_label": "Paediatric Physiotherapy",
    "module_version": "v1.0.0"
  }'::jsonb
)
ON CONFLICT (code, version) WHERE practice_id IS NULL
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  schema_definition = EXCLUDED.schema_definition,
  validation_rules = EXCLUDED.validation_rules,
  display_metadata = EXCLUDED.display_metadata,
  updated_at = now();
