-- ==============================================================================
-- PHYSENRA DATABASE MIGRATION: APPOINTMENT & SCHEDULING FOUNDATION V1
-- Timestamp: 20260928021000_appointment_scheduling_foundation.sql
--
-- Domains:
-- 1. Prerequisites: Composite unique constraint on episodes_of_care for cross-tenant check
-- 2. Appointment entity and practice-isolated scheduling lifecycle
-- 3. Declarative patient-practice & episode-patient-practice composite foreign keys
-- 4. Responsible physiotherapist assignment validation
-- 5. Practice-scoped sequential identifier generation (APT-000001)
-- 6. Controlled state machine transitions & immutability triggers
-- 7. Strict Row-Level Security (RLS) & tenant isolation
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. COMPOSITE EPISODE UNIQUE CONSTRAINT (Prerequisite for cross-tenant FK)
-- ------------------------------------------------------------------------------
ALTER TABLE public.episodes_of_care
  ADD CONSTRAINT uq_episodes_id_patient_practice UNIQUE (id, patient_id, practice_id);

-- ------------------------------------------------------------------------------
-- 2. APPOINTMENT COUNTERS TABLE (For practice-isolated sequential appointment IDs)
-- ------------------------------------------------------------------------------
CREATE TABLE public.practice_appointment_counters (
  practice_id uuid PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
  next_val integer NOT NULL DEFAULT 1 CHECK (next_val >= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_appointment_counters ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. APPOINTMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  episode_id uuid REFERENCES public.episodes_of_care(id) ON DELETE SET NULL,
  physiotherapist_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  appointment_identifier text NOT NULL,

  -- Appointment Metadata
  appointment_type text NOT NULL CHECK (
    appointment_type IN ('initial_assessment', 'follow_up', 'consultation', 'review', 'other')
  ),
  status text NOT NULL DEFAULT 'scheduled' CHECK (
    status IN (
      'scheduled',
      'confirmed',
      'arrived',
      'in_progress',
      'completed',
      'documentation_completed',
      'cancelled',
      'no_show',
      'rescheduled',
      'incomplete'
    )
  ),

  -- Scheduling Details
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes >= 5 AND duration_minutes <= 480),
  location_mode text NOT NULL DEFAULT 'in_clinic' CHECK (
    location_mode IN ('in_clinic', 'home_visit', 'online', 'other')
  ),
  notes text,

  -- Cancellation & Rescheduling Details
  cancellation_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rescheduled_from_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,

  -- Audit & Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT uq_appointments_practice_identifier UNIQUE (practice_id, appointment_identifier),
  CONSTRAINT fk_appointments_patient_practice FOREIGN KEY (patient_id, practice_id)
    REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_episode_patient_practice FOREIGN KEY (episode_id, patient_id, practice_id)
    REFERENCES public.episodes_of_care(id, patient_id, practice_id) ON DELETE SET NULL,
  CONSTRAINT chk_appointments_dates CHECK (scheduled_end > scheduled_start),
  CONSTRAINT chk_appointments_cancellation CHECK (status <> 'cancelled' OR cancellation_reason IS NOT NULL)
);

-- Indexes for practice-scoped lookups
CREATE INDEX idx_appointments_practice_patient ON public.appointments(practice_id, patient_id);
CREATE INDEX idx_appointments_practice_episode ON public.appointments(practice_id, episode_id)
  WHERE episode_id IS NOT NULL;
CREATE INDEX idx_appointments_practice_physio ON public.appointments(practice_id, physiotherapist_id);
CREATE INDEX idx_appointments_practice_dates ON public.appointments(practice_id, scheduled_start, scheduled_end);
CREATE INDEX idx_appointments_practice_status ON public.appointments(practice_id, status);
CREATE INDEX idx_appointments_practice_identifier ON public.appointments(practice_id, appointment_identifier);

-- Enable Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. SEQUENTIAL IDENTIFIER GENERATOR FUNCTION (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_next_appointment_identifier(p_practice_id uuid)
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
    RAISE EXCEPTION 'Access denied: Insufficient privileges to generate appointment identifier.';
  END IF;

  -- Lock and increment counter atomically
  INSERT INTO public.practice_appointment_counters (practice_id, next_val, updated_at)
  VALUES (p_practice_id, 2, now())
  ON CONFLICT (practice_id) DO UPDATE
    SET next_val = public.practice_appointment_counters.next_val + 1,
        updated_at = now()
  RETURNING next_val - 1 INTO v_counter;

  v_identifier := 'APT-' || lpad(v_counter::text, 6, '0');
  RETURN v_identifier;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_next_appointment_identifier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_appointment_identifier(uuid) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. TRIGGER: VALIDATION & DEFAULTS BEFORE INSERT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_appointments_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_practice_id uuid;
  v_is_valid_physio boolean;
BEGIN
  v_user_id := auth.uid();
  v_practice_id := public.current_practice_id();

  -- Enforce practice context match
  IF NEW.practice_id IS NULL THEN
    NEW.practice_id := v_practice_id;
  END IF;

  IF NEW.practice_id IS NULL OR NEW.practice_id <> v_practice_id THEN
    RAISE EXCEPTION 'Access denied: Appointment practice must match the active practice context.'
      USING ERRCODE = '42501';
  END IF;

  -- Verify physiotherapist is an active staff member in the same practice
  SELECT EXISTS (
    SELECT 1 FROM public.practice_memberships
    WHERE practice_id = NEW.practice_id
      AND user_id = NEW.physiotherapist_id
      AND status = 'active'
      AND role IN ('physiotherapist', 'practice_owner', 'practice_manager')
  ) INTO v_is_valid_physio;

  IF NOT v_is_valid_physio THEN
    RAISE EXCEPTION 'Invalid physiotherapist: Clinician must be an active clinical staff member of this practice.'
      USING ERRCODE = '23503';
  END IF;

  -- Auto-generate human-readable appointment identifier if not supplied
  IF NEW.appointment_identifier IS NULL OR trim(NEW.appointment_identifier) = '' THEN
    NEW.appointment_identifier := public.generate_next_appointment_identifier(NEW.practice_id);
  END IF;

  -- Auto-calculate scheduled_end from duration if missing or misaligned
  IF NEW.scheduled_end IS NULL OR NEW.scheduled_end <= NEW.scheduled_start THEN
    NEW.scheduled_end := NEW.scheduled_start + (NEW.duration_minutes || ' minutes')::interval;
  END IF;

  -- Set audit metadata
  NEW.created_by := v_user_id;
  NEW.updated_by := v_user_id;
  NEW.created_at := now();
  NEW.updated_at := now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointments_before_insert
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_appointments_before_insert();

-- ------------------------------------------------------------------------------
-- 6. TRIGGER: IMMUTABILITY, STATE MACHINE & LIFECYCLE BEFORE UPDATE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_appointments_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_is_valid_physio boolean;
  v_allowed_transition boolean := false;
BEGIN
  v_user_id := auth.uid();

  -- Prevent altering core immutable identity fields
  IF OLD.id <> NEW.id OR OLD.practice_id <> NEW.practice_id OR OLD.patient_id <> NEW.patient_id OR OLD.appointment_identifier <> NEW.appointment_identifier THEN
    RAISE EXCEPTION 'Immutable field violation: id, practice_id, patient_id, and appointment_identifier cannot be modified.'
      USING ERRCODE = '42501';
  END IF;

  -- If physiotherapist changed, re-validate membership in the practice
  IF OLD.physiotherapist_id <> NEW.physiotherapist_id THEN
    SELECT EXISTS (
      SELECT 1 FROM public.practice_memberships
      WHERE practice_id = NEW.practice_id
        AND user_id = NEW.physiotherapist_id
        AND status = 'active'
        AND role IN ('physiotherapist', 'practice_owner', 'practice_manager')
    ) INTO v_is_valid_physio;

    IF NOT v_is_valid_physio THEN
      RAISE EXCEPTION 'Invalid physiotherapist: Clinician must be an active clinical staff member of this practice.'
        USING ERRCODE = '23503';
    END IF;
  END IF;

  -- State machine validation
  IF OLD.status <> NEW.status THEN
    -- Check permitted transitions
    IF OLD.status = 'scheduled' AND NEW.status IN ('confirmed', 'cancelled', 'rescheduled') THEN
      v_allowed_transition := true;
    ELSIF OLD.status = 'confirmed' AND NEW.status IN ('arrived', 'cancelled', 'rescheduled', 'no_show') THEN
      v_allowed_transition := true;
    ELSIF OLD.status = 'arrived' AND NEW.status IN ('in_progress', 'cancelled', 'incomplete') THEN
      v_allowed_transition := true;
    ELSIF OLD.status = 'in_progress' AND NEW.status IN ('completed', 'incomplete') THEN
      v_allowed_transition := true;
    ELSIF OLD.status = 'completed' AND NEW.status IN ('documentation_completed') THEN
      v_allowed_transition := true;
    END IF;

    IF NOT v_allowed_transition THEN
      RAISE EXCEPTION 'Invalid status transition: Cannot transition appointment from % to %.', OLD.status, NEW.status
        USING ERRCODE = '22023';
    END IF;

    -- If moving to cancelled, stamp cancelled_at and cancelled_by
    IF NEW.status = 'cancelled' THEN
      NEW.cancelled_at := now();
      NEW.cancelled_by := v_user_id;
      IF NEW.cancellation_reason IS NULL OR trim(NEW.cancellation_reason) = '' THEN
        RAISE EXCEPTION 'Cancellation reason is mandatory when cancelling an appointment.'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  -- Re-align scheduled_end if scheduled_start or duration changed
  IF OLD.scheduled_start <> NEW.scheduled_start OR OLD.duration_minutes <> NEW.duration_minutes THEN
    NEW.scheduled_end := NEW.scheduled_start + (NEW.duration_minutes || ' minutes')::interval;
  END IF;

  NEW.updated_by := v_user_id;
  NEW.updated_at := now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointments_before_update
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_appointments_before_update();

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY POLICIES: APPOINTMENTS
-- ------------------------------------------------------------------------------
-- SELECT Policy
CREATE POLICY "Staff can view appointments in active practice"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']
    )
  );

-- INSERT Policy
CREATE POLICY "Staff can create appointments in active practice"
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']
    )
  );

-- UPDATE Policy
CREATE POLICY "Staff can update appointments in active practice"
  ON public.appointments
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

-- Notice: ZERO DELETE policy defined on appointments.
-- Hard deletion is completely blocked. Deletion occurs via status = 'cancelled'.

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY POLICIES: APPOINTMENT COUNTERS
-- ------------------------------------------------------------------------------
CREATE POLICY "Staff can view appointment counters in active practice"
  ON public.practice_appointment_counters
  FOR SELECT
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']
    )
  );
