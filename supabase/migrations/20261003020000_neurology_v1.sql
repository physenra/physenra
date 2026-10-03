-- ==============================================================================
-- PHYSENRA DATABASE MIGRATION: NEUROLOGY STRUCTURED CLINICAL MODULE V1
-- Timestamp: 20261003020000_neurology_v1.sql
--
-- Domain: Neurological Physiotherapy Structured Clinical Examination V1
-- 
-- Scope:
-- 1. Seeds system definition NEURO_EXAMINATION_V1 in clinical_assessment_definitions
-- 2. Preserves existing NEURO_MOTOR_SPASTICITY_SCREEN v1 for complete backward-compatibility
-- 3. Incorporates all 10 clinical domains:
--    - General Neurological Observation (Alertness, Communication, Precautions)
--    - Tone / Spasticity (Modified Ashworth Scale: Upper & Lower Limbs, Bilateral)
--    - Reflexes (Biceps, Patellar, Bilateral: 0, 1+, 2+, 3+, 4+, NT)
--    - Clonus (Ankle Clonus Bilateral: Absent, Unsustained, Sustained, NT)
--    - Sensation (Light Touch, Pin-prick, Proprioception, Symmetry, Body Regions)
--    - Coordination (Upper Limb, Lower Limb, Rapid Alternating Movements, Notes)
--    - Motor Control (Selective Motor Control, Synergies, Functional Activation)
--    - Balance Integration (Sitting, Standing, Authoritative BBS/TUG references)
--    - Gait / Mobility (Assistance Level, Pattern, Assistive Device, Stairs)
--    - Functional Mobility (Bed Mobility, Sit-to-Stand, Transfers, Wheelchair)
--    - Clinical Summary & Notes
-- 4. Enforces non-destructive, versioned, multi-tenant RLS schema invariants
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEED DEFINITION: NEURO_EXAMINATION_V1
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
  'NEURO_EXAMINATION_V1',
  'Comprehensive Neurological Examination V1',
  'Clinician-guided structured neurological examination documenting clinical observations across general alertness, muscle tone (Modified Ashworth Scale), deep tendon reflexes, clonus, sensory modalities, coordination, voluntary motor control, balance integration (referencing authoritative BBS and TUG outcomes), gait mechanics, and functional mobility.',
  'neurological',
  1,
  'active',
  true,
  '{
    "title": "Comprehensive Neurological Examination V1",
    "version": 1,
    "specialty": "neurological",
    "sections": [
      {
        "id": "general_observation",
        "title": "1. General Neurological Observation",
        "description": "Observational clinical assessment of patient responsiveness and engagement during encounter.",
        "fields": [
          {
            "id": "alertness_participation",
            "label": "Level of Alertness & Participation",
            "type": "select",
            "options": [
              "Alert & Fully Participative",
              "Alert & Requires Frequent Prompting",
              "Lethargic / Fluctuating Alertness",
              "Minimally Responsive / Obtunded",
              "NT"
            ],
            "required": true
          },
          {
            "id": "communication_cognition",
            "label": "Communication & Cognitive Observations",
            "type": "select",
            "options": [
              "Intact / Communicates Needs Clearly",
              "Expressive / Receptive Communication Difficulty",
              "Cognitive / Processing Impairment Observed",
              "Dysarthria Present",
              "NT"
            ],
            "required": false
          },
          {
            "id": "general_presentation",
            "label": "General Presentation & Posture",
            "type": "select",
            "options": [
              "Sitting Upright Independently",
              "Supported in Wheelchair",
              "Bed-Bound (Supine / Side-Lying)",
              "Hemiparetic Posturing Observed",
              "Other Postural Presentation",
              "NT"
            ],
            "required": false
          },
          {
            "id": "precautions_observations",
            "label": "Clinical Precautions & Risk Notes",
            "type": "textarea",
            "description": "e.g., High fall risk, seizure precautions, autonomic dysreflexia risk, glenohumeral subluxation precautions.",
            "required": false
          }
        ]
      },
      {
        "id": "tone_upper_extremity",
        "title": "2. Upper Limb Tone (Modified Ashworth Scale)",
        "description": "Bilateral resistance to passive movement evaluated via MAS (0-4, NT).",
        "fields": [
          { "id": "biceps_tone_left", "label": "Biceps (Left)", "type": "select", "options": ["0", "1", "1+", "2", "3", "4", "NT"], "required": true },
          { "id": "biceps_tone_right", "label": "Biceps (Right)", "type": "select", "options": ["0", "1", "1+", "2", "3", "4", "NT"], "required": true },
          { "id": "wrist_flexors_left", "label": "Wrist Flexors (Left)", "type": "select", "options": ["0", "1", "1+", "2", "3", "4", "NT"], "required": true },
          { "id": "wrist_flexors_right", "label": "Wrist Flexors (Right)", "type": "select", "options": ["0", "1", "1+", "2", "3", "4", "NT"], "required": true }
        ]
      },
      {
        "id": "tone_lower_extremity",
        "title": "3. Lower Limb Tone (Modified Ashworth Scale)",
        "description": "Bilateral lower extremity tone evaluation via MAS (0-4, NT).",
        "fields": [
          { "id": "quadriceps_tone_left", "label": "Quadriceps (Left)", "type": "select", "options": ["0", "1", "1+", "2", "3", "4", "NT"], "required": true },
          { "id": "quadriceps_tone_right", "label": "Quadriceps (Right)", "type": "select", "options": ["0", "1", "1+", "2", "3", "4", "NT"], "required": true },
          { "id": "gastrocnemius_tone_left", "label": "Gastrocnemius / Soleus (Left)", "type": "select", "options": ["0", "1", "1+", "2", "3", "4", "NT"], "required": true },
          { "id": "gastrocnemius_tone_right", "label": "Gastrocnemius / Soleus (Right)", "type": "select", "options": ["0", "1", "1+", "2", "3", "4", "NT"], "required": true }
        ]
      },
      {
        "id": "reflexes",
        "title": "4. Deep Tendon Reflexes",
        "description": "Standardized deep tendon reflex grading scale (0 to 4+, NT).",
        "fields": [
          { "id": "biceps_reflex_left", "label": "Biceps Reflex (Left)", "type": "select", "options": ["0", "1+", "2+", "3+", "4+", "NT"], "required": true },
          { "id": "biceps_reflex_right", "label": "Biceps Reflex (Right)", "type": "select", "options": ["0", "1+", "2+", "3+", "4+", "NT"], "required": true },
          { "id": "patellar_reflex_left", "label": "Patellar Reflex (Left)", "type": "select", "options": ["0", "1+", "2+", "3+", "4+", "NT"], "required": true },
          { "id": "patellar_reflex_right", "label": "Patellar Reflex (Right)", "type": "select", "options": ["0", "1+", "2+", "3+", "4+", "NT"], "required": true }
        ]
      },
      {
        "id": "clonus",
        "title": "5. Clonus Observation",
        "description": "Bilateral evaluation of ankle clonus following rapid dorsiflexion.",
        "fields": [
          { "id": "ankle_clonus_left", "label": "Ankle Clonus (Left)", "type": "select", "options": ["Absent", "Unsustained (<5 beats)", "Sustained (>=5 beats)", "NT"], "required": true },
          { "id": "ankle_clonus_right", "label": "Ankle Clonus (Right)", "type": "select", "options": ["Absent", "Unsustained (<5 beats)", "Sustained (>=5 beats)", "NT"], "required": true }
        ]
      },
      {
        "id": "sensation",
        "title": "6. Sensory Examination",
        "description": "Evaluation of exteroceptive and proprioceptive sensory integrity.",
        "fields": [
          {
            "id": "light_touch",
            "label": "Light Touch Sensation",
            "type": "select",
            "options": ["Intact Bilaterally", "Impaired Left", "Impaired Right", "Impaired Bilateral / Absent", "NT"],
            "required": true
          },
          {
            "id": "pin_prick_pain",
            "label": "Pin-Prick / Pain Sensation",
            "type": "select",
            "options": ["Intact Bilaterally", "Impaired Left", "Impaired Right", "Impaired Bilateral / Absent", "NT"],
            "required": false
          },
          {
            "id": "proprioception",
            "label": "Proprioception / Joint Position Sense",
            "type": "select",
            "options": ["Intact / Accurate Joint Position", "Impaired Distal / Intact Proximal", "Markedly Impaired / Absent", "NT"],
            "required": true
          },
          {
            "id": "sensation_symmetry",
            "label": "Sensory Symmetry Observation",
            "type": "select",
            "options": ["Symmetrical Both Sides", "Asymmetrical (Left Impaired)", "Asymmetrical (Right Impaired)", "NT"],
            "required": false
          },
          {
            "id": "sensory_regions_notes",
            "label": "Sensory Distribution & Region Notes",
            "type": "textarea",
            "description": "Clinician notes on body regions affected (e.g. stocking-glove, hemisensory, dermatomal pattern).",
            "required": false
          }
        ]
      },
      {
        "id": "coordination",
        "title": "7. Coordination & Movement Accuracy",
        "description": "Evaluation of cerebellar and motor coordination without diagnostic inference.",
        "fields": [
          {
            "id": "coordination_upper_limb",
            "label": "Upper Limb Coordination (Finger-to-Nose)",
            "type": "select",
            "options": ["Smooth & Accurate", "Mild Dysmetria / Intention Tremor", "Marked Dysmetria / Decomposition", "Unable to Perform / Severe Ataxia", "NT"],
            "required": true
          },
          {
            "id": "coordination_lower_limb",
            "label": "Lower Limb Coordination (Heel-to-Shin)",
            "type": "select",
            "options": ["Smooth & Accurate", "Mild Ataxia / Overshoot", "Marked Dysmetria / Off-Track", "Unable to Perform", "NT"],
            "required": false
          },
          {
            "id": "rapid_alternating_movements",
            "label": "Rapid Alternating Movements (Dysdiadochokinesia)",
            "type": "select",
            "options": ["Intact / Equal Cadence", "Dysdiadochokinesia Present", "Severely Impaired", "NT"],
            "required": false
          },
          {
            "id": "coordination_notes",
            "label": "Coordination Clinical Observations",
            "type": "textarea",
            "required": false
          }
        ]
      },
      {
        "id": "motor_control",
        "title": "8. Voluntary Motor Control & Synergies",
        "description": "Observation of selective vs synergistic movement control.",
        "fields": [
          {
            "id": "selective_motor_control",
            "label": "Selective Motor Control Pattern",
            "type": "select",
            "options": ["Isolated Selective Movement", "Synergistic Movement Dominant", "Minimal / Trace Voluntary Activation", "Flaccid / No Movement", "NT"],
            "required": true
          },
          {
            "id": "movement_synergies_observed",
            "label": "Movement Synergies Observed",
            "type": "select",
            "options": ["None / Pure Selective Control", "Flexor Synergy Dominant", "Extensor Synergy Dominant", "Mixed Synergies", "NT"],
            "required": false
          },
          {
            "id": "motor_control_notes",
            "label": "Voluntary Activation & Functional Motor Notes",
            "type": "textarea",
            "required": false
          }
        ]
      },
      {
        "id": "balance",
        "title": "9. Balance & Outcome Integration",
        "description": "Functional balance observations and references to authoritative BBS/TUG outcome records.",
        "fields": [
          {
            "id": "balance_sitting",
            "label": "Sitting Balance Stability",
            "type": "select",
            "options": ["Independent & Stable", "Requires Supervision / Arm Support", "Unstable / Requires External Trunk Support", "NT"],
            "required": true
          },
          {
            "id": "balance_standing",
            "label": "Static Standing Balance",
            "type": "select",
            "options": ["Independent (>30s without support)", "Able with Narrow/Wide Stance Support", "Requires Handheld / Physical Assistance", "Unable to Stand", "NT"],
            "required": true
          },
          {
            "id": "balance_bbs_reference_id",
            "label": "Berg Balance Scale (BBS) Reference",
            "type": "text",
            "description": "Authoritative Outcome Measure Assessment ID for BBS recorded during encounter (score not duplicated here).",
            "required": false
          },
          {
            "id": "balance_tug_reference_id",
            "label": "Timed Up and Go (TUG) Reference",
            "type": "text",
            "description": "Authoritative Outcome Measure Assessment ID for TUG recorded during encounter (score not duplicated here).",
            "required": false
          },
          {
            "id": "balance_notes",
            "label": "Balance Observations & Postural Reactions",
            "type": "textarea",
            "required": false
          }
        ]
      },
      {
        "id": "gait_mobility",
        "title": "10. Gait & Locomotion",
        "description": "Clinician observation of ambulation, assistance needs, and devices.",
        "fields": [
          {
            "id": "gait_assistance_level",
            "label": "Gait Assistance Level",
            "type": "select",
            "options": [
              "Independent (Community)",
              "Independent (Indoor Only)",
              "Supervision / Standby Assist",
              "Contact Guard / Minimal Assist",
              "Moderate / Maximum Assist",
              "Non-Ambulatory / Wheelchair",
              "NT"
            ],
            "required": true
          },
          {
            "id": "gait_pattern",
            "label": "Gait Pattern Observation",
            "type": "select",
            "options": [
              "Typical / Unremarkable",
              "Hemiparetic / Circumducting",
              "Ataxic / Wide-Based",
              "Scissoring / Spastic",
              "Trendelenburg Gait",
              "Shuffling / Short Step Cadence",
              "NT"
            ],
            "required": false
          },
          {
            "id": "assistive_device",
            "label": "Assistive Device Used",
            "type": "select",
            "options": [
              "None / Independent",
              "Single Point Cane",
              "Quad Cane",
              "Axillary / Elbow Crutches",
              "Rollator / Wheeled Walker",
              "Standard Walker",
              "Manual Wheelchair",
              "Power Wheelchair",
              "NT"
            ],
            "required": true
          },
          {
            "id": "stair_mobility",
            "label": "Stair Mobility Ability",
            "type": "select",
            "options": [
              "Independent without Handrail",
              "Independent with Handrail",
              "Requires Physical Assistance",
              "Unable / Non-Ambulatory on Stairs",
              "NT"
            ],
            "required": false
          },
          {
            "id": "gait_notes",
            "label": "Gait Cadence & Distance Observations",
            "type": "textarea",
            "required": false
          }
        ]
      },
      {
        "id": "functional_mobility",
        "title": "11. Functional Mobility & Transfers",
        "description": "Fundamental everyday functional transfer skills.",
        "fields": [
          {
            "id": "bed_mobility",
            "label": "Bed Mobility (Rolling / Bridging)",
            "type": "select",
            "options": ["Independent (Rolling & Bridging)", "Minimal Assist / Uses Bedrail", "Moderate to Maximum Assist", "Dependent", "NT"],
            "required": true
          },
          {
            "id": "sit_to_stand",
            "label": "Sit-to-Stand Transfer",
            "type": "select",
            "options": ["Independent without Arms", "Independent with Arms", "Requires 1-Person Physical Assist", "Requires 2-Person / Mechanical Lift", "NT"],
            "required": true
          },
          {
            "id": "transfers",
            "label": "Transfers (Bed to Chair / Commode)",
            "type": "select",
            "options": ["Independent (Bed to Chair)", "Supervision / Setup", "Assisted (Pivot / Sliding Board)", "Dependent / Mechanical Lift", "NT"],
            "required": true
          },
          {
            "id": "wheelchair_mobility",
            "label": "Wheelchair Mobility (If Applicable)",
            "type": "select",
            "options": ["Not Applicable (Ambulatory)", "Independent Manual Propulsion", "Independent Power Mobility", "Requires Assistance to Propel", "Dependent", "NT"],
            "required": false
          },
          {
            "id": "functional_mobility_notes",
            "label": "Functional Mobility Observations",
            "type": "textarea",
            "required": false
          }
        ]
      },
      {
        "id": "summary",
        "title": "12. Clinical Examination Summary",
        "description": "Synthesized observational summary and clinical notes without automated diagnostic claims.",
        "fields": [
          {
            "id": "clinical_summary",
            "label": "Neurological Examination Findings & Functional Impact",
            "type": "textarea",
            "description": "Clinical observational synthesis of neurological findings, functional limitations, and movement quality.",
            "required": false
          }
        ]
      }
    ]
  }'::jsonb,
  '{
    "required_sections": [
      "general_observation",
      "tone_upper_extremity",
      "tone_lower_extremity",
      "reflexes",
      "clonus",
      "sensation",
      "coordination",
      "motor_control",
      "balance",
      "gait_mobility",
      "functional_mobility"
    ],
    "allowed_mas_values": ["0", "1", "1+", "2", "3", "4", "NT"],
    "allowed_reflex_values": ["0", "1+", "2+", "3+", "4+", "NT"],
    "allowed_clonus_values": ["Absent", "Unsustained (<5 beats)", "Sustained (>=5 beats)", "NT"],
    "allowed_alertness_values": [
      "Alert & Fully Participative",
      "Alert & Requires Frequent Prompting",
      "Lethargic / Fluctuating Alertness",
      "Minimally Responsive / Obtunded",
      "NT"
    ],
    "allowed_sensation_values": ["Intact Bilaterally", "Impaired Left", "Impaired Right", "Impaired Bilateral / Absent", "NT"],
    "allowed_proprioception_values": ["Intact / Accurate Joint Position", "Impaired Distal / Intact Proximal", "Markedly Impaired / Absent", "NT"],
    "allowed_coordination_values": ["Smooth & Accurate", "Mild Dysmetria / Intention Tremor", "Marked Dysmetria / Decomposition", "Unable to Perform / Severe Ataxia", "NT"],
    "allowed_motor_control_values": ["Isolated Selective Movement", "Synergistic Movement Dominant", "Minimal / Trace Voluntary Activation", "Flaccid / No Movement", "NT"],
    "allowed_gait_assistance_values": [
      "Independent (Community)",
      "Independent (Indoor Only)",
      "Supervision / Standby Assist",
      "Contact Guard / Minimal Assist",
      "Moderate / Maximum Assist",
      "Non-Ambulatory / Wheelchair",
      "NT"
    ]
  }'::jsonb,
  '{
    "icon": "Brain",
    "badge_color": "purple",
    "display_order": 5,
    "specialty_label": "Neurological Physiotherapy",
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
