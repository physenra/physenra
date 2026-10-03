-- ==============================================================================
-- PHYSENRA DATABASE MIGRATION: SPECIALTY-NEUTRAL CLINICAL ASSESSMENT ARCHITECTURE
-- Timestamp: 20261003010000_specialty_assessment_architecture.sql
--
-- Domains:
-- 1. Clinical Specialty & Assessment Status Enums / Value Constraints
-- 2. Assessment Definitions Table (Specialty-neutral, version-aware, schema-driven)
-- 3. Practice-scoped Clinical Assessment Counters Table (ASM-000001)
-- 4. Clinical Assessment Instances Table with multi-tenant composite FKs
-- 5. Atomic sequential identifier generator (ASM-000001)
-- 6. Assessor clinical role validation trigger
-- 7. Medico-legal immutability & finalized record protection trigger
-- 8. Row-Level Security (RLS) policies & zero hard-delete policy
-- 9. Evidence-based representative seed definitions:
--    - Neurological: NEURO_MOTOR_SPASTICITY_SCREEN (Modified Ashworth Scale, Reflexes, Clonus)
--    - Paediatric: PAEDS_GROSS_MOTOR_SCREEN (Postural Control, Milestones, GMFCS)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. PRACTICE MEMBERS VIEW (COMPATIBILITY LAYER OVER PRACTICE_MEMBERSHIPS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.practice_members AS
  SELECT id, practice_id, user_id, role, status, joined_at, created_at, updated_at
  FROM public.practice_memberships;

GRANT SELECT ON public.practice_members TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 1. ASSESSMENT DEFINITIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.clinical_assessment_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid REFERENCES public.practices(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  specialty text NOT NULL CHECK (
    specialty IN (
      'msk',
      'neurological',
      'paediatric',
      'cardiorespiratory',
      'sports',
      'geriatric',
      'pelvic_health',
      'general_rehab',
      'other'
    )
  ),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'deprecated', 'retired')
  ),
  is_system boolean NOT NULL DEFAULT false,
  schema_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_assessment_def_schema_object CHECK (
    jsonb_typeof(schema_definition) = 'object'
  ),
  CONSTRAINT chk_assessment_def_rules_object CHECK (
    jsonb_typeof(validation_rules) = 'object'
  ),
  CONSTRAINT chk_assessment_def_display_object CHECK (
    jsonb_typeof(display_metadata) = 'object'
  )
);

-- Uniqueness: system definitions unique globally per (code, version); practice definitions unique per practice
CREATE UNIQUE INDEX uq_assessment_defs_system_code_version
  ON public.clinical_assessment_definitions (code, version)
  WHERE practice_id IS NULL;

CREATE UNIQUE INDEX uq_assessment_defs_practice_code_version
  ON public.clinical_assessment_definitions (practice_id, code, version)
  WHERE practice_id IS NOT NULL;

CREATE INDEX idx_assessment_defs_specialty ON public.clinical_assessment_definitions (specialty, is_system, status);
CREATE INDEX idx_assessment_defs_practice ON public.clinical_assessment_definitions (practice_id);

ALTER TABLE public.clinical_assessment_definitions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. PRACTICE ASSESSMENT COUNTERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.practice_clinical_assessment_counters (
  practice_id uuid PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
  next_val integer NOT NULL DEFAULT 1 CHECK (next_val >= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_clinical_assessment_counters ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. CLINICAL ASSESSMENT INSTANCES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.clinical_assessment_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  episode_id uuid REFERENCES public.episodes_of_care(id) ON DELETE SET NULL,
  clinical_visit_id uuid NOT NULL REFERENCES public.clinical_visits(id) ON DELETE RESTRICT,
  definition_id uuid NOT NULL REFERENCES public.clinical_assessment_definitions(id) ON DELETE RESTRICT,
  definition_version integer NOT NULL DEFAULT 1 CHECK (definition_version >= 1),
  assessor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assessment_identifier text NOT NULL,

  -- Lifecycle State Machine
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'amended')),

  -- Execution Timing
  performed_at timestamptz NOT NULL DEFAULT now(),

  -- Structured Clinical Assessment Payload
  structured_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary_findings text,
  clinical_notes text,

  -- Medico-legal Finalization Metadata
  finalized_at timestamptz,
  finalized_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Controlled Amendment / Correction Model
  amendment_reason text,
  corrected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_assessment_id uuid REFERENCES public.clinical_assessment_instances(id) ON DELETE RESTRICT,

  -- Operational Audit Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints & Integrity Invariants
  CONSTRAINT uq_clinical_assessments_practice_identifier UNIQUE (practice_id, assessment_identifier),
  CONSTRAINT fk_clinical_assessments_patient_practice FOREIGN KEY (patient_id, practice_id)
    REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT,
  CONSTRAINT fk_clinical_assessments_episode_patient_practice FOREIGN KEY (episode_id, patient_id, practice_id)
    REFERENCES public.episodes_of_care(id, patient_id, practice_id) ON DELETE SET NULL,
  CONSTRAINT fk_clinical_assessments_visit_patient_practice FOREIGN KEY (clinical_visit_id, patient_id, practice_id)
    REFERENCES public.clinical_visits(id, patient_id, practice_id) ON DELETE RESTRICT,
  CONSTRAINT chk_clinical_assessments_finalized CHECK (
    (status IN ('finalized', 'amended') AND finalized_at IS NOT NULL AND finalized_by IS NOT NULL)
    OR (status = 'draft' AND finalized_at IS NULL AND finalized_by IS NULL)
  ),
  CONSTRAINT chk_clinical_assessments_amended CHECK (
    status <> 'amended' OR (amendment_reason IS NOT NULL AND length(trim(amendment_reason)) > 0)
  ),
  CONSTRAINT chk_clinical_assessments_payload_object CHECK (
    jsonb_typeof(structured_data) = 'object'
  )
);

-- ------------------------------------------------------------------------------
-- 4. PERFORMANCE & PRACTICE-SCOPED INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX idx_clinical_assessments_practice_patient ON public.clinical_assessment_instances (practice_id, patient_id);
CREATE INDEX idx_clinical_assessments_practice_visit ON public.clinical_assessment_instances (practice_id, clinical_visit_id);
CREATE INDEX idx_clinical_assessments_practice_episode ON public.clinical_assessment_instances (practice_id, episode_id);
CREATE INDEX idx_clinical_assessments_practice_definition ON public.clinical_assessment_instances (practice_id, definition_id);
CREATE INDEX idx_clinical_assessments_practice_assessor ON public.clinical_assessment_instances (practice_id, assessor_id);
CREATE INDEX idx_clinical_assessments_practice_status ON public.clinical_assessment_instances (practice_id, status);
CREATE INDEX idx_clinical_assessments_performed_at ON public.clinical_assessment_instances (practice_id, performed_at DESC);
CREATE INDEX idx_clinical_assessments_parent_id ON public.clinical_assessment_instances (parent_assessment_id);

ALTER TABLE public.clinical_assessment_instances ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 5. ATOMIC SEQUENTIAL IDENTIFIER GENERATOR (ASM-000001)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_next_assessment_identifier(p_practice_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next_val integer;
  v_identifier text;
  v_current_practice uuid;
BEGIN
  -- Validate caller has access to target practice context
  BEGIN
    v_current_practice := NULLIF(current_setting('app.current_practice_id', true), '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_current_practice := NULL;
  END;

  IF v_current_practice IS NOT NULL AND v_current_practice <> p_practice_id THEN
    RAISE EXCEPTION 'Access denied: Cannot generate assessment identifier for external practice.';
  END IF;

  -- Atomically increment and fetch next sequence number
  INSERT INTO public.practice_clinical_assessment_counters (practice_id, next_val, updated_at)
  VALUES (p_practice_id, 2, now())
  ON CONFLICT (practice_id) DO UPDATE
    SET next_val = practice_clinical_assessment_counters.next_val + 1,
        updated_at = now()
    RETURNING practice_clinical_assessment_counters.next_val - 1 INTO v_next_val;

  v_identifier := 'ASM-' || lpad(v_next_val::text, 6, '0');
  RETURN v_identifier;
END;
$$;

-- Trigger to auto-assign identifier if not provided
CREATE OR REPLACE FUNCTION public.trg_fn_set_assessment_identifier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.assessment_identifier IS NULL OR trim(NEW.assessment_identifier) = '' THEN
    NEW.assessment_identifier := public.generate_next_assessment_identifier(NEW.practice_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_assessment_identifier
  BEFORE INSERT ON public.clinical_assessment_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_set_assessment_identifier();

-- ------------------------------------------------------------------------------
-- 6. ASSESSOR CLINICAL ROLE VALIDATION TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fn_validate_assessment_assessor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text;
  v_status text;
BEGIN
  -- Verify assessor exists as active practice clinical member
  SELECT role, status INTO v_role, v_status
  FROM public.practice_members
  WHERE practice_id = NEW.practice_id
    AND user_id = NEW.assessor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assessor validation failed: User % is not a registered member of practice %.',
      NEW.assessor_id, NEW.practice_id;
  END IF;

  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'Assessor validation failed: Membership status for user % is % (must be active).',
      NEW.assessor_id, v_status;
  END IF;

  IF v_role NOT IN ('practice_owner', 'practice_manager', 'physiotherapist') THEN
    RAISE EXCEPTION 'Assessor validation failed: Role % cannot record clinical structured assessments.',
      v_role;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_assessment_assessor
  BEFORE INSERT OR UPDATE OF assessor_id, practice_id ON public.clinical_assessment_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_validate_assessment_assessor();

-- ------------------------------------------------------------------------------
-- 7. MEDICO-LEGAL IMMUTABILITY & GUARD TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fn_guard_assessment_invariants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Prevent altering core relationship keys
  IF OLD.practice_id <> NEW.practice_id THEN
    RAISE EXCEPTION 'Integrity violation: Practice ownership cannot be altered once assessment is created.';
  END IF;

  IF OLD.patient_id <> NEW.patient_id THEN
    RAISE EXCEPTION 'Integrity violation: Patient association cannot be altered once assessment is created.';
  END IF;

  IF OLD.clinical_visit_id <> NEW.clinical_visit_id THEN
    RAISE EXCEPTION 'Integrity violation: Clinical encounter association cannot be altered.';
  END IF;

  IF OLD.definition_id <> NEW.definition_id THEN
    RAISE EXCEPTION 'Integrity violation: Assessment definition cannot be altered.';
  END IF;

  -- Lifecycle regression guard: once finalized or amended, cannot return to draft
  IF OLD.status IN ('finalized', 'amended') AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'Lifecycle violation: Finalized clinical assessments cannot be reverted to draft status.';
  END IF;

  IF OLD.status = 'amended' AND NEW.status <> 'amended' THEN
    RAISE EXCEPTION 'Lifecycle violation: Amended assessments cannot change status.';
  END IF;

  -- Medico-legal immutability: finalized assessments cannot alter original structured_data silently
  IF OLD.status = 'finalized' AND NEW.status = 'finalized' THEN
    IF OLD.structured_data IS DISTINCT FROM NEW.structured_data THEN
      RAISE EXCEPTION 'Medico-legal immutability violation: Finalized clinical assessments cannot alter historical structured data. Amendments require an explicit amendment reason and status = amended.';
    END IF;
  END IF;

  -- Finalization metadata stamping
  IF OLD.status = 'draft' AND NEW.status = 'finalized' THEN
    NEW.finalized_at := coalesce(NEW.finalized_at, now());
    NEW.finalized_by := coalesce(NEW.finalized_by, auth.uid(), NEW.assessor_id);
  END IF;

  -- Amendment validation
  IF NEW.status = 'amended' THEN
    IF NEW.amendment_reason IS NULL OR length(trim(NEW.amendment_reason)) = 0 THEN
      RAISE EXCEPTION 'Amendment violation: An explicit amendment reason is mandatory when correcting a finalized assessment.';
    END IF;
    NEW.corrected_by := coalesce(NEW.corrected_by, auth.uid(), NEW.assessor_id);
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_assessment_invariants
  BEFORE UPDATE ON public.clinical_assessment_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_guard_assessment_invariants();

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Definitions Policies:
-- SELECT: Active practice members OR public system definitions
CREATE POLICY assessment_definitions_select_policy
  ON public.clinical_assessment_definitions
  FOR SELECT
  TO authenticated
  USING (
    is_system = true
    OR practice_id IN (
      SELECT practice_id FROM public.practice_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- INSERT/UPDATE: Practice managers/owners for their own practice-scoped definitions
CREATE POLICY assessment_definitions_insert_policy
  ON public.clinical_assessment_definitions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    practice_id IS NOT NULL
    AND is_system = false
    AND practice_id IN (
      SELECT practice_id FROM public.practice_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('practice_owner', 'practice_manager')
    )
  );

CREATE POLICY assessment_definitions_update_policy
  ON public.clinical_assessment_definitions
  FOR UPDATE
  TO authenticated
  USING (
    practice_id IS NOT NULL
    AND is_system = false
    AND practice_id IN (
      SELECT practice_id FROM public.practice_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('practice_owner', 'practice_manager')
    )
  );

CREATE POLICY assessment_definitions_delete_denied
  ON public.clinical_assessment_definitions
  FOR DELETE
  USING (false);

-- Counters Policies:
CREATE POLICY assessment_counters_select_policy
  ON public.practice_clinical_assessment_counters
  FOR SELECT
  TO authenticated
  USING (
    practice_id IN (
      SELECT practice_id FROM public.practice_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY assessment_counters_update_policy
  ON public.practice_clinical_assessment_counters
  FOR UPDATE
  TO authenticated
  USING (
    practice_id IN (
      SELECT practice_id FROM public.practice_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Instances Policies:
-- SELECT: Active members of the owning practice only
CREATE POLICY assessment_instances_select_policy
  ON public.clinical_assessment_instances
  FOR SELECT
  TO authenticated
  USING (
    practice_id IN (
      SELECT practice_id FROM public.practice_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- INSERT: Authorized clinicians of the owning practice
CREATE POLICY assessment_instances_insert_policy
  ON public.clinical_assessment_instances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    practice_id IN (
      SELECT practice_id FROM public.practice_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('practice_owner', 'practice_manager', 'physiotherapist')
    )
  );

-- UPDATE: Authorized clinicians of the owning practice
CREATE POLICY assessment_instances_update_policy
  ON public.clinical_assessment_instances
  FOR UPDATE
  TO authenticated
  USING (
    practice_id IN (
      SELECT practice_id FROM public.practice_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('practice_owner', 'practice_manager', 'physiotherapist')
    )
  );

-- Hard Deletion: Absolutely prohibited (Zero hard-delete policy)
CREATE POLICY assessment_instances_delete_denied
  ON public.clinical_assessment_instances
  FOR DELETE
  USING (false);

-- ------------------------------------------------------------------------------
-- 9. EVIDENCE-BASED REPRESENTATIVE SEED DEFINITIONS
-- ------------------------------------------------------------------------------

-- Seed 1: Neurological Motor & Spasticity Screen (Modified Ashworth Scale)
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
  'NEURO_MOTOR_SPASTICITY_SCREEN',
  'Neurological Motor & Spasticity Screen (MAS)',
  'Standardized neurological examination screen evaluating muscle tone via the Modified Ashworth Scale (0-4), deep tendon reflexes (0-4+), clonus, and voluntary motor activation across affected extremities.',
  'neurological',
  1,
  'active',
  true,
  '{
    "title": "Neurological Motor & Spasticity Screen",
    "version": 1,
    "sections": [
      {
        "id": "tone_upper_extremity",
        "title": "Upper Extremity Muscle Tone (Modified Ashworth Scale)",
        "fields": [
          { "id": "biceps_tone_left", "label": "Biceps (Left)", "type": "select", "options": ["0", "1", "1+", "2", "3", "4", "NT"], "required": true },
          { "id": "biceps_tone_right", "label": "Biceps (Right)", "type": "select", "options": ["0", "1", "1+", "2", "3", "4", "NT"], "required": true },
          { "id": "wrist_flexors_left", "label": "Wrist Flexors (Left)", "type": "select", "options": ["0", "1", "1+", "2", "3", "4", "NT"], "required": true },
          { "id": "wrist_flexors_right", "label": "Wrist Flexors (Right)", "type": "select", "options": ["0", "1", "1+", "2", "3", "4", "NT"], "required": true }
        ]
      },
      {
        "id": "tone_lower_extremity",
        "title": "Lower Extremity Muscle Tone (Modified Ashworth Scale)",
        "fields": [
          { "id": "quadriceps_tone_left", "label": "Quadriceps (Left)", "type": "select", "options": ["0", "1", "1+", "2", "3", "4", "NT"], "required": true },
          { "id": "quadriceps_tone_right", "label": "Quadriceps (Right)", "type": "select", "options": ["0", "1", "1+", "2", "3", "4", "NT"], "required": true },
          { "id": "gastrocnemius_tone_left", "label": "Gastrocnemius (Left)", "type": "select", "options": ["0", "1", "1+", "2", "3", "4", "NT"], "required": true },
          { "id": "gastrocnemius_tone_right", "label": "Gastrocnemius (Right)", "type": "select", "options": ["0", "1", "1+", "2", "3", "4", "NT"], "required": true }
        ]
      },
      {
        "id": "reflexes",
        "title": "Deep Tendon Reflexes & Clonus",
        "fields": [
          { "id": "biceps_reflex_left", "label": "Biceps Reflex (Left)", "type": "select", "options": ["0", "1+", "2+", "3+", "4+"], "required": true },
          { "id": "biceps_reflex_right", "label": "Biceps Reflex (Right)", "type": "select", "options": ["0", "1+", "2+", "3+", "4+"], "required": true },
          { "id": "patellar_reflex_left", "label": "Patellar Reflex (Left)", "type": "select", "options": ["0", "1+", "2+", "3+", "4+"], "required": true },
          { "id": "patellar_reflex_right", "label": "Patellar Reflex (Right)", "type": "select", "options": ["0", "1+", "2+", "3+", "4+"], "required": true },
          { "id": "ankle_clonus_left", "label": "Ankle Clonus (Left)", "type": "select", "options": ["Absent", "Unsustained (<5 beats)", "Sustained (>=5 beats)"], "required": true },
          { "id": "ankle_clonus_right", "label": "Ankle Clonus (Right)", "type": "select", "options": ["Absent", "Unsustained (<5 beats)", "Sustained (>=5 beats)"], "required": true }
        ]
      },
      {
        "id": "motor_control",
        "title": "Voluntary Motor Control & Synergies",
        "fields": [
          { "id": "voluntary_motor_pattern", "label": "Selective Motor Control Pattern", "type": "select", "options": ["Isolated Selective Movement", "Synergistic Movement Dominant", "Minimal / Trace Voluntary Activation", "Flaccid / No Movement"], "required": true },
          { "id": "functional_impact_summary", "label": "Functional Mobility Impact Summary", "type": "textarea", "required": false }
        ]
      }
    ]
  }'::jsonb,
  '{
    "required_sections": ["tone_upper_extremity", "tone_lower_extremity", "reflexes", "motor_control"],
    "allowed_mas_values": ["0", "1", "1+", "2", "3", "4", "NT"],
    "allowed_reflex_values": ["0", "1+", "2+", "3+", "4+"]
  }'::jsonb,
  '{
    "icon": "Brain",
    "badge_color": "purple",
    "display_order": 10,
    "specialty_label": "Neurological Physiotherapy"
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- Seed 2: Paediatric Gross Motor & Postural Screen
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
  'PAEDS_GROSS_MOTOR_SCREEN',
  'Paediatric Gross Motor & Postural Screen',
  'Foundational paediatric assessment recording antigravity postural control, developmental milestone attainment, movement quality, and Gross Motor Function Classification System (GMFCS) level where clinically applicable.',
  'paediatric',
  1,
  'active',
  true,
  '{
    "title": "Paediatric Gross Motor & Postural Screen",
    "version": 1,
    "sections": [
      {
        "id": "postural_control",
        "title": "Antigravity Postural Control & Head Alignment",
        "fields": [
          { "id": "prone_head_control", "label": "Prone: Head Lift & Forearm Support", "type": "select", "options": ["Age Appropriate / Mature", "Emerging (45 deg lift)", "Transient / Inconsistent", "Unable / Marked Lag"], "required": true },
          { "id": "sitting_posture", "label": "Sitting Posture & Trunk Alignment", "type": "select", "options": ["Independent Upright (Stable)", "Propped / Ring Sitting with Hands", "Kyphotic / Requires Pelvic Support", "Unable without Full External Support"], "required": true }
        ]
      },
      {
        "id": "developmental_milestones",
        "title": "Developmental Milestones & Locomotion",
        "fields": [
          { "id": "rolling_status", "label": "Rolling (Prone to Supine & Supine to Prone)", "type": "select", "options": ["Achieved Segmental", "Achieved Log-Rolling", "Emerging / Incomplete", "Not Yet Present"], "required": true },
          { "id": "floor_mobility", "label": "Floor Mobility & Transitional Movement", "type": "select", "options": ["Reciprocal Crawling (Hands & Knees)", "Commando / Belly Crawling", "Bottom Shuffling", "Rolls for Mobility", "Stationary"], "required": true },
          { "id": "supported_standing", "label": "Standing & Cruising Support", "type": "select", "options": ["Independent Walking", "Cruising on Furniture", "Stands with Handheld Assistance", "Stands with Knee / Pelvic Support", "Non-Weight Bearing"], "required": true }
        ]
      },
      {
        "id": "movement_quality",
        "title": "Movement Quality & Symmetry Observations",
        "fields": [
          { "id": "bilateral_symmetry", "label": "Bilateral Symmetry of Movement", "type": "select", "options": ["Symmetric Both Sides", "Mild Asymmetry Observed", "Marked Hemilateral Asymmetry", "Fluctuating Tone / Dystonic Posturing"], "required": true },
          { "id": "gmfcs_classification", "label": "GMFCS Classification (If Clinically Applicable)", "type": "select", "options": ["Not Applicable / Typical Development", "GMFCS Level I", "GMFCS Level II", "GMFCS Level III", "GMFCS Level IV", "GMFCS Level V"], "required": true },
          { "id": "developmental_notes", "label": "Clinical Developmental Findings & Caregiver Observations", "type": "textarea", "required": false }
        ]
      }
    ]
  }'::jsonb,
  '{
    "required_sections": ["postural_control", "developmental_milestones", "movement_quality"],
    "allowed_gmfcs_values": ["Not Applicable / Typical Development", "GMFCS Level I", "GMFCS Level II", "GMFCS Level III", "GMFCS Level IV", "GMFCS Level V"]
  }'::jsonb,
  '{
    "icon": "Baby",
    "badge_color": "emerald",
    "display_order": 20,
    "specialty_label": "Paediatric Physiotherapy"
  }'::jsonb
) ON CONFLICT DO NOTHING;
