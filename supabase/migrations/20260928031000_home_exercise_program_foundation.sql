-- ==============================================================================
-- PHYSENRA DATABASE MIGRATION: HOME EXERCISE PROGRAM (HEP) FOUNDATION V1
-- Timestamp: 20260928031000_home_exercise_program_foundation.sql
--
-- Domains:
-- 1. Standard and practice-specific Exercise Definitions (public.exercises)
-- 2. Practice-scoped HEP Monotonic Counters (HEP-000001)
-- 3. Home Exercise Programs with multi-tenant composite FKs (public.home_exercise_programs)
-- 4. Prescribed Exercise Items with personalized dosages (public.home_exercise_program_items)
-- 5. Standard evidence-based starter exercise catalogue seeding
-- 6. Atomic sequential identifier generator (generate_next_hep_identifier)
-- 7. Clinician membership & clinical role validation trigger
-- 8. Immutability, lifecycle state machine, & prescription protection triggers
-- 9. Strict Row-Level Security (RLS) & zero hard deletes
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENUMS & COMPATIBLE DOMAIN TYPES
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hep_status') THEN
    CREATE TYPE public.hep_status AS ENUM ('draft', 'active', 'paused', 'completed', 'discontinued');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exercise_category') THEN
    CREATE TYPE public.exercise_category AS ENUM (
      'mobility', 'strengthening', 'stretching', 'aerobic', 'balance', 'neuromuscular', 'functional', 'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exercise_body_region') THEN
    CREATE TYPE public.exercise_body_region AS ENUM (
      'cervical', 'thoracic', 'lumbar', 'shoulder', 'elbow', 'wrist_hand', 'hip', 'knee', 'ankle_foot', 'full_body', 'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exercise_laterality') THEN
    CREATE TYPE public.exercise_laterality AS ENUM (
      'bilateral', 'left', 'right', 'unilateral', 'na'
    );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. EXERCISE DEFINITIONS TABLE (CATALOGUE / LIBRARY)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid REFERENCES public.practices(id) ON DELETE CASCADE,
  is_system boolean NOT NULL DEFAULT false,
  name text NOT NULL,
  category public.exercise_category NOT NULL DEFAULT 'other',
  body_region public.exercise_body_region NOT NULL DEFAULT 'other',
  default_laterality public.exercise_laterality NOT NULL DEFAULT 'na',
  equipment text,
  description text,
  instructions text,
  precautions text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT chk_exercise_practice_or_system CHECK (
    (is_system = true AND practice_id IS NULL) OR
    (is_system = false AND practice_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_exercises_system_name
  ON public.exercises (lower(trim(name)))
  WHERE practice_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_exercises_practice_name
  ON public.exercises (practice_id, lower(trim(name)))
  WHERE practice_id IS NOT NULL;

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. HEP MONOTONIC COUNTERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_hep_counters (
  practice_id uuid PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
  next_val integer NOT NULL DEFAULT 1 CHECK (next_val >= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_hep_counters ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. ATOMIC IDENTIFIER GENERATOR FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_next_hep_identifier(p_practice_id uuid)
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
  v_current_practice := public.current_practice_id();
  IF v_current_practice IS NOT NULL AND v_current_practice <> p_practice_id THEN
    RAISE EXCEPTION 'Access denied: Tenant practice mismatch.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.practice_memberships
    WHERE practice_id = p_practice_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('practice_owner', 'practice_manager', 'physiotherapist')
  ) THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges to generate HEP identifier.';
  END IF;

  INSERT INTO public.practice_hep_counters (practice_id, next_val, updated_at)
  VALUES (p_practice_id, 2, now())
  ON CONFLICT (practice_id) DO UPDATE
    SET next_val = public.practice_hep_counters.next_val + 1,
        updated_at = now()
  RETURNING (public.practice_hep_counters.next_val - 1) INTO v_next_val;

  v_identifier := 'HEP-' || LPAD(v_next_val::text, 6, '0');
  RETURN v_identifier;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_next_hep_identifier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_hep_identifier(uuid) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. HOME EXERCISE PROGRAMS TABLE (CONTAINER / ASSIGNMENT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.home_exercise_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  episode_id uuid REFERENCES public.episodes_of_care(id) ON DELETE SET NULL,
  clinical_visit_id uuid REFERENCES public.clinical_visits(id) ON DELETE SET NULL,
  prescribing_clinician_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  program_identifier text NOT NULL,
  title text NOT NULL,
  instructions text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  review_date date,
  status public.hep_status NOT NULL DEFAULT 'draft',
  finalized_at timestamptz,
  finalized_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  discontinued_reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Multi-tenant composite uniqueness
  CONSTRAINT uq_hep_practice_identifier UNIQUE (practice_id, program_identifier),
  CONSTRAINT uq_hep_id_practice UNIQUE (id, practice_id),

  -- Multi-tenant composite foreign keys
  CONSTRAINT fk_hep_patient_practice FOREIGN KEY (patient_id, practice_id)
    REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT,

  CONSTRAINT fk_hep_episode_patient_practice FOREIGN KEY (episode_id, patient_id, practice_id)
    REFERENCES public.episodes_of_care(id, patient_id, practice_id) ON DELETE SET NULL,

  CONSTRAINT fk_hep_visit_patient_practice FOREIGN KEY (clinical_visit_id, patient_id, practice_id)
    REFERENCES public.clinical_visits(id, patient_id, practice_id) ON DELETE SET NULL,

  -- Date and finalization bounds
  CONSTRAINT chk_hep_review_after_start CHECK (
    review_date IS NULL OR review_date >= start_date
  ),
  CONSTRAINT chk_hep_finalized CHECK (
    (status IN ('active', 'paused', 'completed') AND finalized_at IS NOT NULL AND finalized_by IS NOT NULL)
    OR (status = 'draft' AND finalized_at IS NULL AND finalized_by IS NULL)
    OR (status = 'discontinued')
  )
);

ALTER TABLE public.home_exercise_programs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 6. HOME EXERCISE PROGRAM ITEMS TABLE (PRESCRIPTION DOSAGE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.home_exercise_program_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.home_exercise_programs(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL,
  order_index integer NOT NULL DEFAULT 1,
  sets integer,
  repetitions integer,
  hold_seconds integer,
  duration_minutes integer,
  rest_seconds integer,
  frequency text,
  intensity_load text,
  laterality public.exercise_laterality NOT NULL DEFAULT 'na',
  instructions text,
  precautions text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Multi-tenant composite foreign key to parent program
  CONSTRAINT fk_hep_items_program_practice FOREIGN KEY (program_id, practice_id)
    REFERENCES public.home_exercise_programs(id, practice_id) ON DELETE CASCADE,

  -- Exercise relationship
  CONSTRAINT fk_hep_items_exercise FOREIGN KEY (exercise_id)
    REFERENCES public.exercises(id) ON DELETE RESTRICT,

  -- Non-negative dosage parameter checks
  CONSTRAINT chk_hep_item_sets CHECK (sets IS NULL OR sets > 0),
  CONSTRAINT chk_hep_item_reps CHECK (repetitions IS NULL OR repetitions > 0),
  CONSTRAINT chk_hep_item_hold CHECK (hold_seconds IS NULL OR hold_seconds >= 0),
  CONSTRAINT chk_hep_item_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  CONSTRAINT chk_hep_item_rest CHECK (rest_seconds IS NULL OR rest_seconds >= 0)
);

ALTER TABLE public.home_exercise_program_items ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 7. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_exercises_practice ON public.exercises (practice_id) WHERE practice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises (category);
CREATE INDEX IF NOT EXISTS idx_exercises_body_region ON public.exercises (body_region);
CREATE INDEX IF NOT EXISTS idx_exercises_active ON public.exercises (is_active);

CREATE INDEX IF NOT EXISTS idx_hep_practice_patient ON public.home_exercise_programs (practice_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_hep_practice_episode ON public.home_exercise_programs (practice_id, episode_id) WHERE episode_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hep_practice_visit ON public.home_exercise_programs (practice_id, clinical_visit_id) WHERE clinical_visit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hep_practice_clinician ON public.home_exercise_programs (practice_id, prescribing_clinician_id);
CREATE INDEX IF NOT EXISTS idx_hep_practice_status ON public.home_exercise_programs (practice_id, status);
CREATE INDEX IF NOT EXISTS idx_hep_practice_start_date ON public.home_exercise_programs (practice_id, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_hep_items_program_order ON public.home_exercise_program_items (program_id, order_index);
CREATE INDEX IF NOT EXISTS idx_hep_items_exercise ON public.home_exercise_program_items (exercise_id);

-- ------------------------------------------------------------------------------
-- 8. INTEGRITY & IMMUTABILITY TRIGGERS
-- ------------------------------------------------------------------------------

-- Trigger 1: Prescribing clinician validation
CREATE OR REPLACE FUNCTION public.validate_hep_prescribing_clinician()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.practice_memberships
    WHERE practice_id = NEW.practice_id
      AND user_id = NEW.prescribing_clinician_id
      AND status = 'active'
      AND role IN ('practice_owner', 'practice_manager', 'physiotherapist')
  ) THEN
    RAISE EXCEPTION 'Prescribing clinician must be an active clinician or administrator within this practice.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_hep_prescribing_clinician ON public.home_exercise_programs;
CREATE TRIGGER trg_validate_hep_prescribing_clinician
  BEFORE INSERT OR UPDATE OF prescribing_clinician_id, practice_id
  ON public.home_exercise_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_hep_prescribing_clinician();

-- Trigger 2: Immutability and state machine transitions
CREATE OR REPLACE FUNCTION public.protect_hep_immutability_and_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Tenancy and patient identity cannot be mutated
  IF OLD.practice_id <> NEW.practice_id THEN
    RAISE EXCEPTION 'Practice context of a Home Exercise Program cannot be modified.';
  END IF;
  IF OLD.patient_id <> NEW.patient_id THEN
    RAISE EXCEPTION 'Patient association of a Home Exercise Program cannot be modified.';
  END IF;
  IF OLD.program_identifier <> NEW.program_identifier THEN
    RAISE EXCEPTION 'Program identifier of a Home Exercise Program cannot be modified.';
  END IF;

  -- Lifecycle state machine rules
  IF OLD.status <> NEW.status THEN
    IF OLD.status = 'draft' AND NEW.status NOT IN ('active', 'discontinued') THEN
      RAISE EXCEPTION 'Draft HEP can only transition to active or discontinued.';
    ELSIF OLD.status = 'active' AND NEW.status NOT IN ('paused', 'completed', 'discontinued') THEN
      RAISE EXCEPTION 'Active HEP can only transition to paused, completed, or discontinued.';
    ELSIF OLD.status = 'paused' AND NEW.status NOT IN ('active', 'discontinued') THEN
      RAISE EXCEPTION 'Paused HEP can only transition to active or discontinued.';
    ELSIF OLD.status = 'completed' THEN
      RAISE EXCEPTION 'Completed HEP records are terminal and cannot be transitioned.';
    ELSIF OLD.status = 'discontinued' THEN
      RAISE EXCEPTION 'Discontinued HEP records are terminal and cannot be transitioned.';
    END IF;

    -- Automatically record finalization when transitioning to active
    IF NEW.status = 'active' AND OLD.status = 'draft' THEN
      IF NEW.finalized_at IS NULL THEN
        NEW.finalized_at := now();
      END IF;
      IF NEW.finalized_by IS NULL THEN
        NEW.finalized_by := COALESCE(auth.uid(), NEW.prescribing_clinician_id);
      END IF;
    END IF;
  END IF;

  -- If status is completed or discontinued, require no core modification
  IF OLD.status IN ('completed', 'discontinued') AND OLD.status = NEW.status THEN
    IF OLD.title <> NEW.title OR OLD.instructions <> NEW.instructions OR OLD.start_date <> NEW.start_date THEN
      RAISE EXCEPTION 'Completed or discontinued HEP records are immutable.';
    END IF;
  END IF;

  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_hep_immutability_and_lifecycle ON public.home_exercise_programs;
CREATE TRIGGER trg_protect_hep_immutability_and_lifecycle
  BEFORE UPDATE
  ON public.home_exercise_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_hep_immutability_and_lifecycle();

-- Trigger 3: Protect prescription items on finalized programs
CREATE OR REPLACE FUNCTION public.protect_hep_items_finalized()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_program_status public.hep_status;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT status INTO v_program_status
    FROM public.home_exercise_programs
    WHERE id = OLD.program_id;

    IF v_program_status IS NOT NULL AND v_program_status <> 'draft' THEN
      RAISE EXCEPTION 'Cannot delete exercise prescription items from a finalized or active HEP. Historical prescriptions are immutable.';
    END IF;
    RETURN OLD;
  ELSE
    SELECT status INTO v_program_status
    FROM public.home_exercise_programs
    WHERE id = NEW.program_id;

    IF v_program_status IS NOT NULL AND v_program_status <> 'draft' THEN
      RAISE EXCEPTION 'Cannot add or modify exercise prescription items in a finalized or active HEP. Historical prescriptions are immutable.';
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_hep_items_finalized ON public.home_exercise_program_items;
CREATE TRIGGER trg_protect_hep_items_finalized
  BEFORE INSERT OR UPDATE OR DELETE
  ON public.home_exercise_program_items
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_hep_items_finalized();

-- Trigger 4: Deny hard delete on home_exercise_programs
CREATE OR REPLACE FUNCTION public.deny_hep_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Hard deletion of Home Exercise Programs is prohibited. Mark as discontinued instead.';
END;
$$;

DROP TRIGGER IF EXISTS trg_deny_hep_hard_delete ON public.home_exercise_programs;
CREATE TRIGGER trg_deny_hep_hard_delete
  BEFORE DELETE
  ON public.home_exercise_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.deny_hep_hard_delete();

-- Trigger 5: Prevent deleting exercise if referenced in programs
CREATE OR REPLACE FUNCTION public.deny_exercise_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.home_exercise_program_items
    WHERE exercise_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot delete exercise that is referenced by existing Home Exercise Programs. Archive the exercise instead.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_deny_exercise_hard_delete ON public.exercises;
CREATE TRIGGER trg_deny_exercise_hard_delete
  BEFORE DELETE
  ON public.exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.deny_exercise_hard_delete();

-- ------------------------------------------------------------------------------
-- 9. ROW-LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------

-- Exercises RLS
DROP POLICY IF EXISTS "exercises_select_policy" ON public.exercises;
CREATE POLICY "exercises_select_policy"
  ON public.exercises
  FOR SELECT
  TO authenticated
  USING (
    is_system = true
    OR (
      practice_id = public.current_practice_id()
      AND public.user_has_practice_role(
        practice_id,
        ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'biller']
      )
    )
  );

DROP POLICY IF EXISTS "exercises_insert_policy" ON public.exercises;
CREATE POLICY "exercises_insert_policy"
  ON public.exercises
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_system = false
    AND practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist']
    )
  );

DROP POLICY IF EXISTS "exercises_update_policy" ON public.exercises;
CREATE POLICY "exercises_update_policy"
  ON public.exercises
  FOR UPDATE
  TO authenticated
  USING (
    is_system = false
    AND practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist']
    )
  )
  WITH CHECK (
    is_system = false
    AND practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist']
    )
  );

DROP POLICY IF EXISTS "exercises_delete_policy" ON public.exercises;
CREATE POLICY "exercises_delete_policy"
  ON public.exercises
  FOR DELETE
  TO authenticated
  USING (false);

-- Counters RLS
DROP POLICY IF EXISTS "counters_access_policy" ON public.practice_hep_counters;
CREATE POLICY "counters_access_policy"
  ON public.practice_hep_counters
  FOR ALL
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

-- Home Exercise Programs RLS
DROP POLICY IF EXISTS "hep_select_policy" ON public.home_exercise_programs;
CREATE POLICY "hep_select_policy"
  ON public.home_exercise_programs
  FOR SELECT
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'biller']
    )
  );

DROP POLICY IF EXISTS "hep_insert_policy" ON public.home_exercise_programs;
CREATE POLICY "hep_insert_policy"
  ON public.home_exercise_programs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist']
    )
  );

DROP POLICY IF EXISTS "hep_update_policy" ON public.home_exercise_programs;
CREATE POLICY "hep_update_policy"
  ON public.home_exercise_programs
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

DROP POLICY IF EXISTS "hep_delete_policy" ON public.home_exercise_programs;
CREATE POLICY "hep_delete_policy"
  ON public.home_exercise_programs
  FOR DELETE
  TO authenticated
  USING (false);

-- Home Exercise Program Items RLS
DROP POLICY IF EXISTS "hep_items_select_policy" ON public.home_exercise_program_items;
CREATE POLICY "hep_items_select_policy"
  ON public.home_exercise_program_items
  FOR SELECT
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'biller']
    )
  );

DROP POLICY IF EXISTS "hep_items_insert_policy" ON public.home_exercise_program_items;
CREATE POLICY "hep_items_insert_policy"
  ON public.home_exercise_program_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist']
    )
  );

DROP POLICY IF EXISTS "hep_items_update_policy" ON public.home_exercise_program_items;
CREATE POLICY "hep_items_update_policy"
  ON public.home_exercise_program_items
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

DROP POLICY IF EXISTS "hep_items_delete_policy" ON public.home_exercise_program_items;
CREATE POLICY "hep_items_delete_policy"
  ON public.home_exercise_program_items
  FOR DELETE
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist']
    )
  );

-- ------------------------------------------------------------------------------
-- 10. EVIDENCE-BASED STARTER EXERCISE CATALOGUE SEEDING
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
(
  NULL,
  true,
  'Quad Sets (Isometric Quadriceps Contraction)',
  'strengthening',
  'knee',
  'unilateral',
  'Towel roll (optional)',
  'Isometric contraction of the quadriceps muscle to facilitate voluntary activation and extension.',
  'Lie on your back or sit with leg straight. Tighten your front thigh muscles by pressing the back of your knee flat into the bed. Hold firmly, then relax.',
  'Avoid holding breath during isometric contraction. Discontinue if sharp anterior knee pain occurs.',
  true
),
(
  NULL,
  true,
  'Straight Leg Raise (SLR)',
  'strengthening',
  'knee',
  'unilateral',
  'None / Mat',
  'Active straight leg elevation targeting hip flexors and quadriceps without active knee flexion.',
  'Lie on your back with one knee bent and target leg straight. Tighten thigh muscle, lock knee, and lift leg 6 to 12 inches off surface. Lower smoothly with control.',
  'Maintain flat lumbar spine; do not arch lower back during lift.',
  true
),
(
  NULL,
  true,
  'Glute Bridge',
  'strengthening',
  'hip',
  'bilateral',
  'Mat',
  'Bilateral hip extension exercise targeting gluteus maximus and posterior chain stability.',
  'Lie on your back with knees bent and feet flat hip-width apart. Squeeze glutes and lift hips toward ceiling until thighs and torso align. Lower with control.',
  'Avoid hyperextending the lumbar spine at peak extension.',
  true
),
(
  NULL,
  true,
  'Heel Slides',
  'mobility',
  'knee',
  'unilateral',
  'Smooth surface or towel',
  'Active-assisted or active knee flexion mobility exercise in supine position.',
  'Lie on your back with legs straight. Slowly slide heel of target leg toward your buttocks, bending knee as far as comfortable. Hold briefly, then slide back.',
  'Do not force past severe pain thresholds; maintain smooth sliding motion.',
  true
),
(
  NULL,
  true,
  'Scapular Retraction (Pinch)',
  'strengthening',
  'shoulder',
  'bilateral',
  'None / Chair',
  'Postural correction and scapular stabilizer activation exercise.',
  'Sit tall with shoulders relaxed. Squeeze shoulder blades backward and downward as if pinching a pencil between them. Hold for prescribed seconds, then release.',
  'Do not shrug shoulders upward toward ears during contraction.',
  true
),
(
  NULL,
  true,
  'Pendulum (Codman) Exercise',
  'mobility',
  'shoulder',
  'unilateral',
  'Table or counter support',
  'Passive glenohumeral decompression and gentle early active-assisted shoulder mobility.',
  'Lean forward supporting unaffected arm on table. Allow target arm to dangle freely. Initiate gentle circular sway using torso momentum, not arm muscles.',
  'Ensure the arm hangs completely limp without active shoulder muscle contraction.',
  true
),
(
  NULL,
  true,
  'Seated Chin Tucks (Cervical Retraction)',
  'mobility',
  'cervical',
  'bilateral',
  'Chair',
  'Deep cervical flexor activation and forward head posture correction.',
  'Sit upright with eyes forward. Gently glide head backward, creating a subtle double chin while keeping eyes level. Hold briefly, then return to neutral.',
  'Do not tilt head up or down; movement is a horizontal glide.',
  true
),
(
  NULL,
  true,
  'Ankle Pumps',
  'mobility',
  'ankle_foot',
  'unilateral',
  'None',
  'Ankle range of motion and lower extremity venous thromboembolism prevention exercise.',
  'Point toes downward away from body, then pull toes upward toward shin as far as comfortable. Alternate in a rhythmic pumping motion.',
  'Ensure calf activation without inducing severe Achilles discomfort.',
  true
),
(
  NULL,
  true,
  'Standing Calf Stretch (Gastrocnemius)',
  'stretching',
  'ankle_foot',
  'unilateral',
  'Wall',
  'Static stretching of gastrocnemius muscle group.',
  'Stand facing a wall with target leg back, knee straight, and heel flat on floor. Lean forward into wall until gentle stretch is felt in back of calf.',
  'Keep back heel firmly planted on floor and toes pointed straight ahead.',
  true
),
(
  NULL,
  true,
  'Cat-Camel (Spinal Mobility)',
  'mobility',
  'lumbar',
  'bilateral',
  'Mat',
  'Segmental spinal flexion and extension mobility drill in quadruped position.',
  'Begin on hands and knees with wrists under shoulders and knees under hips. Arch back upward toward ceiling lowering head (cat), then gently sag belly toward floor lifting head (camel).',
  'Perform within pain-free movement excursion; avoid forcing end-range extension.',
  true
)
ON CONFLICT (lower(trim(name))) WHERE practice_id IS NULL
DO NOTHING;
