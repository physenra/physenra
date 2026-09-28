-- ==============================================================================
-- PHYSENRA DATABASE MIGRATION: CLINICAL VISIT FOUNDATION V1
-- Timestamp: 20260928023000_clinical_visit_foundation.sql
--
-- Domains:
-- 1. Prerequisites: Composite unique constraint on appointments for cross-tenant check
-- 2. Clinical Visit entity and practice-isolated encounter lifecycle
-- 3. Declarative patient-practice, episode-patient-practice, and appointment-patient-practice FKs
-- 4. Physiotherapist assignment validation
-- 5. Practice-scoped sequential identifier generation (VIS-000001)
-- 6. Duplicate appointment visit prevention (one visit per appointment)
-- 7. Controlled state machine transitions & immutability triggers
-- 8. Strict Row-Level Security (RLS) & zero hard deletes
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. COMPOSITE APPOINTMENT UNIQUE CONSTRAINT (Prerequisite for cross-tenant FK)
-- ------------------------------------------------------------------------------
ALTER TABLE public.appointments
  ADD CONSTRAINT uq_appointments_id_patient_practice UNIQUE (id, patient_id, practice_id);

-- ------------------------------------------------------------------------------
-- 2. CLINICAL VISIT COUNTERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.practice_clinical_visit_counters (
  practice_id uuid PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
  next_val integer NOT NULL DEFAULT 1 CHECK (next_val >= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_clinical_visit_counters ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. CLINICAL VISITS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.clinical_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  episode_id uuid REFERENCES public.episodes_of_care(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  physiotherapist_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  visit_identifier text NOT NULL,

  -- Visit State Machine
  status text NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'in_progress', 'completed', 'incomplete', 'cancelled')
  ),

  -- Encounter Timing
  actual_start timestamptz,
  actual_end timestamptz,
  duration_minutes integer CHECK (duration_minutes IS NULL OR (duration_minutes >= 1 AND duration_minutes <= 1440)),

  -- Encounter Mode
  location_mode text NOT NULL DEFAULT 'clinic' CHECK (
    location_mode IN ('clinic', 'home', 'telehealth', 'other')
  ),

  -- Operational Notes & Cancellation
  encounter_notes text,
  cancellation_reason text,

  -- Audit & Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT uq_clinical_visits_practice_identifier UNIQUE (practice_id, visit_identifier),
  CONSTRAINT fk_clinical_visits_patient_practice FOREIGN KEY (patient_id, practice_id)
    REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT,
  CONSTRAINT fk_clinical_visits_episode_patient_practice FOREIGN KEY (episode_id, patient_id, practice_id)
    REFERENCES public.episodes_of_care(id, patient_id, practice_id) ON DELETE SET NULL,
  CONSTRAINT fk_clinical_visits_appointment_patient_practice FOREIGN KEY (appointment_id, patient_id, practice_id)
    REFERENCES public.appointments(id, patient_id, practice_id) ON DELETE SET NULL,
  CONSTRAINT chk_clinical_visits_timing CHECK (actual_end IS NULL OR (actual_start IS NOT NULL AND actual_end > actual_start)),
  CONSTRAINT chk_clinical_visits_completed_timing CHECK (status <> 'completed' OR (actual_start IS NOT NULL AND actual_end IS NOT NULL)),
  CONSTRAINT chk_clinical_visits_cancellation CHECK (status <> 'cancelled' OR cancellation_reason IS NOT NULL)
);

-- Duplicate prevention: exactly one visit per appointment
CREATE UNIQUE INDEX uq_clinical_visits_practice_appointment
  ON public.clinical_visits (practice_id, appointment_id)
  WHERE appointment_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 4. PERFORMANCE & PRACTICE-SCOPED INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX idx_clinical_visits_practice_patient ON public.clinical_visits (practice_id, patient_id);
CREATE INDEX idx_clinical_visits_practice_episode ON public.clinical_visits (practice_id, episode_id);
CREATE INDEX idx_clinical_visits_practice_appointment ON public.clinical_visits (practice_id, appointment_id);
CREATE INDEX idx_clinical_visits_practice_physio ON public.clinical_visits (practice_id, physiotherapist_id);
CREATE INDEX idx_clinical_visits_practice_status ON public.clinical_visits (practice_id, status);
CREATE INDEX idx_clinical_visits_practice_start ON public.clinical_visits (practice_id, actual_start);
CREATE INDEX idx_clinical_visits_practice_identifier ON public.clinical_visits (practice_id, visit_identifier);

-- ------------------------------------------------------------------------------
-- 5. VISIT IDENTIFIER GENERATOR (VIS-000001)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_next_clinical_visit_identifier(p_practice_id uuid)
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
      RAISE EXCEPTION 'Tenant context mismatch: cannot generate visit identifier for another practice'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  -- Atomic counter allocation
  INSERT INTO public.practice_clinical_visit_counters (practice_id, next_val, updated_at)
  VALUES (p_practice_id, 2, now())
  ON CONFLICT (practice_id) DO UPDATE
    SET next_val = practice_clinical_visit_counters.next_val + 1,
        updated_at = now()
  RETURNING practice_clinical_visit_counters.next_val - 1 INTO v_next_val;

  v_identifier := 'VIS-' || lpad(v_next_val::text, 6, '0');
  RETURN v_identifier;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_next_clinical_visit_identifier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_clinical_visit_identifier(uuid) TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. TRIGGERS: IDENTIFIER, PHYSIOTHERAPIST, IMMUTABILITY & TRANSITIONS
-- ------------------------------------------------------------------------------

-- Trigger 6.1: Set Visit Identifier before insert
CREATE OR REPLACE FUNCTION public.trg_fn_set_clinical_visit_identifier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.visit_identifier IS NULL OR trim(NEW.visit_identifier) = '' THEN
    NEW.visit_identifier := public.generate_next_clinical_visit_identifier(NEW.practice_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_clinical_visit_identifier
  BEFORE INSERT ON public.clinical_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_set_clinical_visit_identifier();

-- Trigger 6.2: Validate Physiotherapist Assignment
CREATE OR REPLACE FUNCTION public.trg_fn_validate_visit_physiotherapist()
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
      AND user_id = NEW.physiotherapist_id
      AND status = 'active'
      AND role IN ('practice_owner', 'practice_manager', 'physiotherapist')
  ) INTO v_valid;

  IF NOT v_valid THEN
    RAISE EXCEPTION 'Invalid physiotherapist: Clinician must be an active clinical staff member of this practice.'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_visit_physiotherapist
  BEFORE INSERT OR UPDATE OF physiotherapist_id, practice_id ON public.clinical_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_validate_visit_physiotherapist();

-- Trigger 6.3: Guard Invariants
CREATE OR REPLACE FUNCTION public.trg_fn_guard_clinical_visit_invariants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'Immutability violation: Visit ID cannot be changed'
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

  IF NEW.visit_identifier <> OLD.visit_identifier THEN
    RAISE EXCEPTION 'Immutability violation: visit_identifier cannot be changed'
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF OLD.appointment_id IS NOT NULL AND NEW.appointment_id IS DISTINCT FROM OLD.appointment_id THEN
    RAISE EXCEPTION 'Immutability violation: linked appointment cannot be reassigned'
      USING ERRCODE = 'restrict_violation';
  END IF;

  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_clinical_visit_invariants
  BEFORE UPDATE ON public.clinical_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_guard_clinical_visit_invariants();

-- Trigger 6.4: Enforce State Machine Transitions
CREATE OR REPLACE FUNCTION public.trg_fn_enforce_clinical_visit_state_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Terminal states cannot transition to any other state
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'State transition violation: Completed visits are immutable and cannot change status'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'State transition violation: Cancelled visits cannot be modified'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Permitted transitions:
  -- scheduled -> in_progress, cancelled
  -- in_progress -> completed, incomplete, cancelled
  -- incomplete -> in_progress, cancelled
  IF OLD.status = 'scheduled' AND NEW.status NOT IN ('in_progress', 'cancelled') THEN
    RAISE EXCEPTION 'State transition violation: Scheduled visit can only transition to in_progress or cancelled'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF OLD.status = 'in_progress' AND NEW.status NOT IN ('completed', 'incomplete', 'cancelled') THEN
    RAISE EXCEPTION 'State transition violation: In-progress visit can only transition to completed, incomplete, or cancelled'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF OLD.status = 'incomplete' AND NEW.status NOT IN ('in_progress', 'cancelled') THEN
    RAISE EXCEPTION 'State transition violation: Incomplete visit can only resume to in_progress or be cancelled'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_clinical_visit_state_transitions
  BEFORE UPDATE OF status ON public.clinical_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_enforce_clinical_visit_state_transitions();

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.clinical_visits ENABLE ROW LEVEL SECURITY;

-- 7.1 SELECT: Active practice staff with authorized roles
CREATE POLICY clinical_visits_select ON public.clinical_visits
  FOR SELECT
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'biller']
    )
  );

-- 7.2 INSERT: Active practice clinical/reception staff
CREATE POLICY clinical_visits_insert ON public.clinical_visits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']
    )
  );

-- 7.3 UPDATE: Active practice clinical/reception staff
CREATE POLICY clinical_visits_update ON public.clinical_visits
  FOR UPDATE
  TO authenticated
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

-- 7.4 DELETE: Denied across all roles (No Hard Deletes)
CREATE POLICY clinical_visits_delete_denied ON public.clinical_visits
  FOR DELETE
  TO authenticated
  USING (false);

-- 7.5 Counters RLS
CREATE POLICY clinical_visit_counters_select ON public.practice_clinical_visit_counters
  FOR SELECT
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']
    )
  );
