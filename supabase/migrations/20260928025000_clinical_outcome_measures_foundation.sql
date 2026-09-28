-- ==============================================================================
-- PHYSENRA DATABASE MIGRATION: CLINICAL OUTCOME MEASURES FOUNDATION V1
-- Timestamp: 20260928025000_clinical_outcome_measures_foundation.sql
--
-- Domains:
-- 1. Standard and practice-specific Outcome Measure Definitions
-- 2. Practice-scoped Outcome Measure Counters (OUT-000001)
-- 3. Outcome Measure Assessments with multi-tenant composite FKs
-- 4. Longitudinal repeat measurement support (never overwriting historical assessments)
-- 5. Standard evidence-based measure catalogue seeding (NPRS, LEFS, QuickDASH, etc.)
-- 6. Sequential monotonic identifier generator
-- 7. Assessor clinical role validation trigger
-- 8. Immutability & finalized result protection triggers
-- 9. Strict Row-Level Security (RLS) & zero hard deletes
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. OUTCOME MEASURE DEFINITIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.outcome_measure_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid REFERENCES public.practices(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'functional' CHECK (
    category IN ('pain', 'functional', 'mobility', 'quality_of_life', 'other')
  ),
  scoring_type text NOT NULL DEFAULT 'numeric' CHECK (
    scoring_type IN ('numeric', 'percentage', 'timed_seconds', 'points_scale', 'categorical')
  ),
  min_score numeric,
  max_score numeric,
  score_unit text,
  interpretation_guide text,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_outcome_definition_bounds CHECK (
    min_score IS NULL OR max_score IS NULL OR max_score >= min_score
  )
);

-- Uniqueness: system code is unique globally; practice code is unique per practice
CREATE UNIQUE INDEX uq_outcome_definitions_system_code
  ON public.outcome_measure_definitions (code)
  WHERE practice_id IS NULL;

CREATE UNIQUE INDEX uq_outcome_definitions_practice_code
  ON public.outcome_measure_definitions (practice_id, code)
  WHERE practice_id IS NOT NULL;

ALTER TABLE public.outcome_measure_definitions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. OUTCOME MEASURE COUNTERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.practice_outcome_measure_counters (
  practice_id uuid PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
  next_val integer NOT NULL DEFAULT 1 CHECK (next_val >= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_outcome_measure_counters ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. OUTCOME MEASURE ASSESSMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.outcome_measure_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  episode_id uuid REFERENCES public.episodes_of_care(id) ON DELETE SET NULL,
  clinical_visit_id uuid REFERENCES public.clinical_visits(id) ON DELETE SET NULL,
  measure_definition_id uuid NOT NULL REFERENCES public.outcome_measure_definitions(id) ON DELETE RESTRICT,
  assessor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assessment_identifier text NOT NULL,

  -- Milestone Type
  assessment_type text NOT NULL DEFAULT 'baseline' CHECK (
    assessment_type IN ('baseline', 'interim', 'discharge', 'follow_up', 'routine')
  ),

  -- Lifecycle State Machine
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'amended')),

  -- Execution Timing
  performed_at timestamptz NOT NULL DEFAULT now(),

  -- Quantitative & Categorical Score Model
  numeric_score numeric,
  percentage_score numeric CHECK (percentage_score IS NULL OR (percentage_score >= 0 AND percentage_score <= 100)),
  score_category text,
  score_interpretation text,
  clinical_notes text,

  -- Medico-legal Finalization Metadata
  finalized_at timestamptz,
  finalized_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Controlled Amendment / Correction Model
  amendment_reason text,
  amended_numeric_score numeric,
  amended_percentage_score numeric CHECK (amended_percentage_score IS NULL OR (amended_percentage_score >= 0 AND amended_percentage_score <= 100)),
  corrected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Operational Audit Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints & Integrity Invariants
  CONSTRAINT uq_outcome_assessments_practice_identifier UNIQUE (practice_id, assessment_identifier),
  CONSTRAINT fk_outcome_assessments_patient_practice FOREIGN KEY (patient_id, practice_id)
    REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT,
  CONSTRAINT fk_outcome_assessments_episode_patient_practice FOREIGN KEY (episode_id, patient_id, practice_id)
    REFERENCES public.episodes_of_care(id, patient_id, practice_id) ON DELETE SET NULL,
  CONSTRAINT fk_outcome_assessments_visit_patient_practice FOREIGN KEY (clinical_visit_id, patient_id, practice_id)
    REFERENCES public.clinical_visits(id, patient_id, practice_id) ON DELETE SET NULL,
  CONSTRAINT chk_outcome_assessments_finalized CHECK (
    (status IN ('finalized', 'amended') AND finalized_at IS NOT NULL AND finalized_by IS NOT NULL)
    OR (status = 'draft' AND finalized_at IS NULL AND finalized_by IS NULL)
  ),
  CONSTRAINT chk_outcome_assessments_amended CHECK (
    status <> 'amended' OR (amendment_reason IS NOT NULL AND length(trim(amendment_reason)) > 0)
  )
);

-- ------------------------------------------------------------------------------
-- 4. PERFORMANCE & PRACTICE-SCOPED INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX idx_outcome_assessments_practice_patient ON public.outcome_measure_assessments (practice_id, patient_id);
CREATE INDEX idx_outcome_assessments_practice_episode ON public.outcome_measure_assessments (practice_id, episode_id);
CREATE INDEX idx_outcome_assessments_practice_visit ON public.outcome_measure_assessments (practice_id, clinical_visit_id);
CREATE INDEX idx_outcome_assessments_practice_measure ON public.outcome_measure_assessments (practice_id, measure_definition_id);
CREATE INDEX idx_outcome_assessments_practice_assessor ON public.outcome_measure_assessments (practice_id, assessor_id);
CREATE INDEX idx_outcome_assessments_practice_status ON public.outcome_measure_assessments (practice_id, status);
CREATE INDEX idx_outcome_assessments_practice_performed ON public.outcome_measure_assessments (practice_id, performed_at);
CREATE INDEX idx_outcome_assessments_practice_identifier ON public.outcome_measure_assessments (practice_id, assessment_identifier);

-- ------------------------------------------------------------------------------
-- 5. IDENTIFIER GENERATOR (OUT-000001)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_next_outcome_measure_identifier(p_practice_id uuid)
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
  v_current_practice := public.current_practice_id();
  IF v_current_practice IS NULL OR v_current_practice <> p_practice_id THEN
    IF NOT COALESCE(public.is_platform_admin(), false) THEN
      RAISE EXCEPTION 'Tenant context mismatch: cannot generate outcome measure identifier for another practice'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  -- Atomic counter allocation
  INSERT INTO public.practice_outcome_measure_counters (practice_id, next_val, updated_at)
  VALUES (p_practice_id, 2, now())
  ON CONFLICT (practice_id) DO UPDATE
    SET next_val = practice_outcome_measure_counters.next_val + 1,
        updated_at = now()
  RETURNING practice_outcome_measure_counters.next_val - 1 INTO v_next_val;

  v_identifier := 'OUT-' || lpad(v_next_val::text, 6, '0');
  RETURN v_identifier;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_next_outcome_measure_identifier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_outcome_measure_identifier(uuid) TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. TRIGGERS: IDENTIFIER, ASSESSOR, MEASURE DEFINITION & IMMUTABILITY
-- ------------------------------------------------------------------------------

-- Trigger 6.1: Set Assessment Identifier before insert
CREATE OR REPLACE FUNCTION public.trg_fn_set_outcome_measure_identifier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.assessment_identifier IS NULL OR trim(NEW.assessment_identifier) = '' THEN
    NEW.assessment_identifier := public.generate_next_outcome_measure_identifier(NEW.practice_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_outcome_measure_identifier
  BEFORE INSERT ON public.outcome_measure_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_set_outcome_measure_identifier();

-- Trigger 6.2: Validate Assessor Assignment
CREATE OR REPLACE FUNCTION public.trg_fn_validate_outcome_assessor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.practice_memberships
    WHERE practice_id = NEW.practice_id
      AND user_id = NEW.assessor_id
      AND status = 'active'
      AND role IN ('practice_owner', 'practice_manager', 'physiotherapist')
  ) INTO v_valid;

  IF NOT v_valid THEN
    RAISE EXCEPTION 'Invalid assessor: Clinician must be an active clinical staff member of this practice.'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_outcome_assessor
  BEFORE INSERT OR UPDATE OF assessor_id, practice_id ON public.outcome_measure_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_validate_outcome_assessor();

-- Trigger 6.3: Validate Measure Definition Scope
CREATE OR REPLACE FUNCTION public.trg_fn_validate_outcome_definition_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_def_practice_id uuid;
  v_def_active boolean;
BEGIN
  SELECT practice_id, is_active
  INTO v_def_practice_id, v_def_active
  FROM public.outcome_measure_definitions
  WHERE id = NEW.measure_definition_id;

  IF v_def_active IS NULL THEN
    RAISE EXCEPTION 'Invalid measure: Definition does not exist.'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF NOT v_def_active THEN
    RAISE EXCEPTION 'Invalid measure: Definition is currently inactive.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_def_practice_id IS NOT NULL AND v_def_practice_id <> NEW.practice_id THEN
    RAISE EXCEPTION 'Tenant isolation violation: Measure definition belongs to another practice.'
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_outcome_definition_scope
  BEFORE INSERT OR UPDATE OF measure_definition_id, practice_id ON public.outcome_measure_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_validate_outcome_definition_scope();

-- Trigger 6.4: Guard Invariants & Immutability of Finalized Results
CREATE OR REPLACE FUNCTION public.trg_fn_guard_outcome_assessment_invariants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Strict identity immutability
  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'Immutability violation: Assessment ID cannot be changed'
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF NEW.practice_id <> OLD.practice_id THEN
    RAISE EXCEPTION 'Immutability violation: practice_id cannot be changed'
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF NEW.patient_id <> OLD.patient_id THEN
    RAISE EXCEPTION 'Immutability violation: patient_id cannot be changed'
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF NEW.assessment_identifier <> OLD.assessment_identifier THEN
    RAISE EXCEPTION 'Immutability violation: assessment_identifier cannot be changed'
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF NEW.measure_definition_id <> OLD.measure_definition_id THEN
    RAISE EXCEPTION 'Immutability violation: measure_definition_id cannot be changed'
      USING ERRCODE = 'restrict_violation';
  END IF;

  -- Protection of Finalized and Amended Assessments
  IF OLD.status IN ('finalized', 'amended') THEN
    -- Original scores and historical measurement attributes cannot be silently modified
    IF (NEW.numeric_score IS DISTINCT FROM OLD.numeric_score)
       OR (NEW.percentage_score IS DISTINCT FROM OLD.percentage_score)
       OR (NEW.score_category IS DISTINCT FROM OLD.score_category)
       OR (NEW.performed_at IS DISTINCT FROM OLD.performed_at)
       OR (NEW.assessor_id IS DISTINCT FROM OLD.assessor_id)
       OR (NEW.finalized_at IS DISTINCT FROM OLD.finalized_at)
       OR (NEW.finalized_by IS DISTINCT FROM OLD.finalized_by)
    THEN
      RAISE EXCEPTION 'Medico-legal immutability violation: Finalized outcome assessments cannot alter historical original scores. Record an amendment instead.'
        USING ERRCODE = 'restrict_violation';
    END IF;

    -- Lifecycle rules for finalized/amended records
    IF OLD.status = 'finalized' AND NEW.status NOT IN ('finalized', 'amended') THEN
      RAISE EXCEPTION 'State transition violation: Finalized assessments can only transition to amended'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF OLD.status = 'amended' AND NEW.status <> 'amended' THEN
      RAISE EXCEPTION 'State transition violation: Amended clinical outcome assessments are permanently locked'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF NEW.status = 'amended' AND OLD.status = 'finalized' THEN
      NEW.corrected_by := auth.uid();
    END IF;
  END IF;

  -- Lifecycle rules for draft assessments
  IF OLD.status = 'draft' THEN
    IF NEW.status = 'amended' THEN
      RAISE EXCEPTION 'State transition violation: Draft assessments cannot transition directly to amended'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF NEW.status = 'finalized' THEN
      IF NEW.finalized_at IS NULL THEN
        NEW.finalized_at := now();
      END IF;
      IF NEW.finalized_by IS NULL THEN
        NEW.finalized_by := auth.uid();
      END IF;
    END IF;
  END IF;

  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_outcome_assessment_invariants
  BEFORE UPDATE ON public.outcome_measure_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_guard_outcome_assessment_invariants();

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.outcome_measure_assessments ENABLE ROW LEVEL SECURITY;

-- 7.1 Definitions RLS: Viewable if system standard or belongs to active practice
CREATE POLICY outcome_definitions_select ON public.outcome_measure_definitions
  FOR SELECT
  TO authenticated
  USING (
    is_system = true
    OR (
      practice_id IS NOT NULL
      AND practice_id = public.current_practice_id()
      AND public.user_has_practice_role(
        practice_id,
        ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'biller']
      )
    )
  );

CREATE POLICY outcome_definitions_insert ON public.outcome_measure_definitions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND is_system = false
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager']
    )
  );

CREATE POLICY outcome_definitions_update ON public.outcome_measure_definitions
  FOR UPDATE
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND is_system = false
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager']
    )
  )
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND is_system = false
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager']
    )
  );

CREATE POLICY outcome_definitions_delete_denied ON public.outcome_measure_definitions
  FOR DELETE
  TO authenticated
  USING (false);

-- 7.2 Counters RLS
CREATE POLICY outcome_counters_select ON public.practice_outcome_measure_counters
  FOR SELECT
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist']
    )
  );

-- 7.3 Assessments SELECT: Active practice staff
CREATE POLICY outcome_assessments_select ON public.outcome_measure_assessments
  FOR SELECT
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'biller']
    )
  );

-- 7.4 Assessments INSERT: Clinical staff
CREATE POLICY outcome_assessments_insert ON public.outcome_measure_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist']
    )
  );

-- 7.5 Assessments UPDATE: Clinical staff
CREATE POLICY outcome_assessments_update ON public.outcome_measure_assessments
  FOR UPDATE
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist']
    )
  )
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist']
    )
  );

-- 7.6 Assessments DELETE: Denied across all roles (zero hard deletes)
CREATE POLICY outcome_assessments_delete_denied ON public.outcome_measure_assessments
  FOR DELETE
  TO authenticated
  USING (false);

-- ------------------------------------------------------------------------------
-- 8. SEED STANDARD EVIDENCE-BASED MEASURES CATALOGUE
-- ------------------------------------------------------------------------------
INSERT INTO public.outcome_measure_definitions (
  practice_id, code, name, description, category, scoring_type, min_score, max_score, score_unit, interpretation_guide, is_system, is_active
) VALUES
(
  NULL,
  'NPRS',
  'Numeric Pain Rating Scale',
  'Standard 11-point unidimensional numeric scale for patient self-reporting of current, best, and worst pain severity over the last 24 hours.',
  'pain',
  'numeric',
  0,
  10,
  '/10',
  '0 = No pain; 1-3 = Mild pain; 4-6 = Moderate pain; 7-10 = Severe pain. MCID is typically 2.0 points.',
  true,
  true
),
(
  NULL,
  'VAS',
  'Visual Analogue Scale for Pain',
  'Continuous line scale from 0 to 100 mm measuring perceived pain intensity.',
  'pain',
  'numeric',
  0,
  100,
  'mm',
  '0 mm = No pain; 100 mm = Worst imaginable pain. Clinically meaningful change threshold is 13-20 mm.',
  true,
  true
),
(
  NULL,
  'LEFS',
  'Lower Extremity Functional Scale',
  '20-item patient-reported questionnaire evaluating functional difficulty in daily activities due to lower extremity disorders.',
  'functional',
  'points_scale',
  0,
  80,
  '/80',
  '0 = Extreme difficulty/unable to perform; 80 = Full function with no difficulty. MCID is 9 points.',
  true,
  true
),
(
  NULL,
  'QUICKDASH',
  'Quick Disabilities of the Arm, Shoulder and Hand',
  '11-item self-report questionnaire assessing physical function and symptoms in persons with upper limb musculoskeletal conditions.',
  'functional',
  'percentage',
  0,
  100,
  '%',
  '0% = No disability; 100% = Most severe disability. Minimally clinically important difference is 8-15%.',
  true,
  true
),
(
  NULL,
  'ODI',
  'Oswestry Disability Index',
  'Self-administered questionnaire assessing functional impairment and disability in patients with low back pain.',
  'functional',
  'percentage',
  0,
  100,
  '%',
  '0-20% = Minimal disability; 21-40% = Moderate disability; 41-60% = Severe disability; 61-80% = Crippled; 81-100% = Bed-bound. MCID is 10-12%.',
  true,
  true
),
(
  NULL,
  'NDI',
  'Neck Disability Index',
  'Standardized 10-item questionnaire measuring self-rated disability and pain impact from cervical spine disorders.',
  'functional',
  'percentage',
  0,
  100,
  '%',
  '0-8% = No disability; 10-28% = Mild disability; 30-48% = Moderate disability; 50-68% = Severe disability; 70%+ = Complete. MCID is 10%.',
  true,
  true
),
(
  NULL,
  'TUG',
  'Timed Up and Go Test',
  'Objective mobility and fall-risk test measuring time in seconds taken by a patient to stand from an armchair, walk 3 meters, turn, and sit down.',
  'mobility',
  'timed_seconds',
  0,
  300,
  'seconds',
  'Under 10 seconds = Normal mobility; 11-20 seconds = Normal for frail elderly; Greater than 12 seconds = Elevated fall risk in community-dwelling adults.',
  true,
  true
),
(
  NULL,
  'PSFS',
  'Patient-Specific Functional Scale',
  'Patient-driven functional assessment where the individual nominates 3-5 specific activities they struggle with, scored 0 (unable) to 10 (normal).',
  'functional',
  'numeric',
  0,
  10,
  '/10',
  '0 = Unable to perform activity; 10 = Able to perform at pre-injury level. MCID is 2.0-3.0 points average across nominated activities.',
  true,
  true
),
(
  NULL,
  'BBS',
  'Berg Balance Scale',
  '14-item objective functional balance test assessing both static and dynamic balance activities.',
  'mobility',
  'points_scale',
  0,
  56,
  '/56',
  '41-56 = Low fall risk; 21-40 = Medium fall risk; 0-20 = High fall risk. Score below 45 indicates elevated risk of falling.',
  true,
  true
)
ON CONFLICT DO NOTHING;
