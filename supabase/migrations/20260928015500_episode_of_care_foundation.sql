-- ==============================================================================
-- PHYSENRA DATABASE MIGRATION: EPISODE OF CARE FOUNDATION V1
-- Timestamp: 20260928015500_episode_of_care_foundation.sql
--
-- Domains:
-- 1. Episode of Care entity and practice-isolated lifecycle
-- 2. Declarative patient-practice composite foreign key
-- 3. Responsible clinician assignment validation
-- 4. Practice-scoped sequential identifier generation (EOC-000001)
-- 5. Strict Row-Level Security (RLS) & tenant isolation
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. COMPOSITE PATIENT UNIQUE CONSTRAINT (Prerequisite for cross-tenant FK)
-- ------------------------------------------------------------------------------
ALTER TABLE public.patients
  ADD CONSTRAINT uq_patients_id_practice UNIQUE (id, practice_id);

-- ------------------------------------------------------------------------------
-- 2. EPISODE COUNTERS TABLE (For practice-isolated sequential episode IDs)
-- ------------------------------------------------------------------------------
CREATE TABLE public.practice_episode_counters (
  practice_id uuid PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
  next_val integer NOT NULL DEFAULT 1 CHECK (next_val >= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_episode_counters ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. EPISODES OF CARE TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.episodes_of_care (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  episode_identifier text NOT NULL,
  
  -- Clinical Course Metadata
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  
  -- Dates
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,

  -- Responsible Clinician (physiotherapist, practice_owner, or practice_manager in active practice)
  primary_physiotherapist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Lifecycle & Audit
  closed_at timestamptz,
  closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at timestamptz,
  archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT uq_episodes_practice_identifier UNIQUE (practice_id, episode_identifier),
  CONSTRAINT fk_episodes_patient_practice FOREIGN KEY (patient_id, practice_id)
    REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT,
  CONSTRAINT chk_episodes_dates CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT chk_episodes_title_not_empty CHECK (length(trim(title)) > 0)
);

-- Indexes for practice-scoped lookups
CREATE INDEX idx_episodes_practice_patient ON public.episodes_of_care(practice_id, patient_id);
CREATE INDEX idx_episodes_practice_status ON public.episodes_of_care(practice_id, status);
CREATE INDEX idx_episodes_practice_identifier ON public.episodes_of_care(practice_id, episode_identifier);
CREATE INDEX idx_episodes_practice_dates ON public.episodes_of_care(practice_id, start_date);
CREATE INDEX idx_episodes_physiotherapist ON public.episodes_of_care(practice_id, primary_physiotherapist_id)
  WHERE primary_physiotherapist_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.episodes_of_care ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. SEQUENTIAL IDENTIFIER GENERATOR FUNCTION (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_next_episode_identifier(p_practice_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_counter integer;
  v_identifier text;
BEGIN
  -- Strict tenant check: Actor must have authorized role in the target practice
  IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
    RAISE EXCEPTION 'Access denied: Target practice does not match active practice context.';
  END IF;

  IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']) THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges to generate episode identifier.';
  END IF;

  -- Atomic counter upsert
  INSERT INTO public.practice_episode_counters (practice_id, next_val, updated_at)
  VALUES (p_practice_id, 2, now())
  ON CONFLICT (practice_id)
  DO UPDATE SET
    next_val = public.practice_episode_counters.next_val + 1,
    updated_at = now()
  RETURNING public.practice_episode_counters.next_val - 1 INTO v_counter;

  v_identifier := 'EOC-' || lpad(v_counter::text, 6, '0');
  RETURN v_identifier;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_next_episode_identifier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_episode_identifier(uuid) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. EPISODE TRIGGERS (Identifier assignment, immutability, role validation)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_episodes_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Practice ID must match active context
  IF NEW.practice_id IS NULL THEN
    NEW.practice_id := public.current_practice_id();
  END IF;

  IF NEW.practice_id IS NULL OR NEW.practice_id <> public.current_practice_id() THEN
    RAISE EXCEPTION 'Episode practice_id must match active tenant context.';
  END IF;

  -- Validate responsible clinician belongs to the same practice with valid clinician role
  IF NEW.primary_physiotherapist_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.practice_memberships
      WHERE practice_id = NEW.practice_id
        AND user_id = NEW.primary_physiotherapist_id
        AND status = 'active'
        AND role IN ('physiotherapist', 'practice_owner', 'practice_manager')
    ) THEN
      RAISE EXCEPTION 'Responsible physiotherapist must be an active clinician in the same practice.';
    END IF;
  END IF;

  -- Auto-generate human-readable episode identifier if not supplied
  IF NEW.episode_identifier IS NULL OR trim(NEW.episode_identifier) = '' THEN
    NEW.episode_identifier := public.generate_next_episode_identifier(NEW.practice_id);
  END IF;

  -- Metadata and timestamps
  NEW.created_at := now();
  NEW.updated_at := now();
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  NEW.updated_by := auth.uid();

  -- Lifecycle consistency on insert
  IF NEW.status = 'completed' THEN
    NEW.closed_at := COALESCE(NEW.closed_at, now());
    NEW.closed_by := COALESCE(NEW.closed_by, auth.uid());
    NEW.end_date := COALESCE(NEW.end_date, CURRENT_DATE);
  ELSIF NEW.status = 'archived' THEN
    NEW.archived_at := COALESCE(NEW.archived_at, now());
    NEW.archived_by := COALESCE(NEW.archived_by, auth.uid());
  ELSE
    NEW.closed_at := NULL;
    NEW.closed_by := NULL;
    NEW.archived_at := NULL;
    NEW.archived_by := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_episodes_before_insert
  BEFORE INSERT ON public.episodes_of_care
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_episodes_before_insert();

CREATE OR REPLACE FUNCTION public.trg_episodes_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Immutability invariants
  IF NEW.practice_id <> OLD.practice_id THEN
    RAISE EXCEPTION 'Transferring episode of care to another practice is prohibited.';
  END IF;

  IF NEW.patient_id <> OLD.patient_id THEN
    RAISE EXCEPTION 'Transferring episode of care to another patient is prohibited.';
  END IF;

  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'Altering episode internal UUID is prohibited.';
  END IF;

  IF NEW.episode_identifier <> OLD.episode_identifier THEN
    RAISE EXCEPTION 'Altering episode identifier is prohibited.';
  END IF;

  -- Validate responsible clinician if updated
  IF NEW.primary_physiotherapist_id IS DISTINCT FROM OLD.primary_physiotherapist_id AND NEW.primary_physiotherapist_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.practice_memberships
      WHERE practice_id = NEW.practice_id
        AND user_id = NEW.primary_physiotherapist_id
        AND status = 'active'
        AND role IN ('physiotherapist', 'practice_owner', 'practice_manager')
    ) THEN
      RAISE EXCEPTION 'Responsible physiotherapist must be an active clinician in the same practice.';
    END IF;
  END IF;

  -- Lifecycle transition rules
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    IF NOT public.user_has_practice_role(NEW.practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist']) THEN
      RAISE EXCEPTION 'Access denied: Only clinical staff can complete an episode of care.';
    END IF;
    NEW.closed_at := now();
    NEW.closed_by := auth.uid();
    NEW.end_date := COALESCE(NEW.end_date, CURRENT_DATE);
  ELSIF NEW.status = 'active' AND OLD.status = 'completed' THEN
    -- Reopening an episode
    IF NOT public.user_has_practice_role(NEW.practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist']) THEN
      RAISE EXCEPTION 'Access denied: Only clinical staff can reopen an episode of care.';
    END IF;
    NEW.closed_at := NULL;
    NEW.closed_by := NULL;
  ELSIF NEW.status = 'archived' AND OLD.status <> 'archived' THEN
    IF NOT public.user_has_practice_role(NEW.practice_id, ARRAY['practice_owner', 'practice_manager']) THEN
      RAISE EXCEPTION 'Access denied: Only practice owners or managers can archive an episode of care.';
    END IF;
    NEW.archived_at := now();
    NEW.archived_by := auth.uid();
  ELSIF NEW.status <> 'archived' AND OLD.status = 'archived' THEN
    IF NOT public.user_has_practice_role(NEW.practice_id, ARRAY['practice_owner', 'practice_manager']) THEN
      RAISE EXCEPTION 'Access denied: Only practice owners or managers can restore an archived episode of care.';
    END IF;
    NEW.archived_at := NULL;
    NEW.archived_by := NULL;
  END IF;

  NEW.updated_at := now();
  NEW.updated_by := auth.uid();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_episodes_before_update
  BEFORE UPDATE ON public.episodes_of_care
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_episodes_before_update();

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- SELECT: Staff members in active practice context can view episodes
CREATE POLICY "episodes_select_active_practice"
  ON public.episodes_of_care
  FOR SELECT
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'accountant']
    )
  );

-- INSERT: Practice staff authorized to create care episodes
CREATE POLICY "episodes_insert_active_practice"
  ON public.episodes_of_care
  FOR INSERT
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']
    )
  );

-- UPDATE: Practice staff authorized to edit care episodes
CREATE POLICY "episodes_update_active_practice"
  ON public.episodes_of_care
  FOR UPDATE
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']
    )
  )
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']
    )
  );

-- DELETE: Prohibited for all roles (Zero hard deletes)
-- (No DELETE policy created; RLS default denies all DELETE commands)

-- ------------------------------------------------------------------------------
-- 7. PERMISSIONS & GRANTS
-- ------------------------------------------------------------------------------
REVOKE ALL ON public.episodes_of_care FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public.episodes_of_care TO authenticated;

REVOKE ALL ON public.practice_episode_counters FROM PUBLIC;
-- Counters accessed strictly through SECURITY DEFINER function
