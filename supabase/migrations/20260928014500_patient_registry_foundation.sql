-- ==============================================================================
-- PHYSENRA DATABASE MIGRATION: PATIENT REGISTRY FOUNDATION V1
-- Timestamp: 20260928014500_patient_registry_foundation.sql
--
-- Domains:
-- 1. Patient identity, demographics, contact, emergency contact, status
-- 2. Practice-scoped patient identifier sequence generation
-- 3. Strict Row-Level Security (RLS) & tenant isolation
-- 4. Audit trail integration for patient lifecycle events
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PATIENT COUNTERS TABLE (For practice-isolated sequential patient IDs)
-- ------------------------------------------------------------------------------
CREATE TABLE public.practice_patient_counters (
  practice_id uuid PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
  next_val integer NOT NULL DEFAULT 1 CHECK (next_val >= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_patient_counters ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. PATIENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  patient_identifier text NOT NULL,
  
  -- Demographics
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  preferred_name text,
  date_of_birth date,
  sex text CHECK (sex IS NULL OR sex IN ('male', 'female', 'other', 'unknown')),

  -- Contact Details
  phone text,
  email text,
  address_line1 text,
  address_line2 text,
  city text,
  state_province text,
  postal_code text,
  country text NOT NULL DEFAULT 'GB',

  -- Emergency Contact
  emergency_contact_name text,
  emergency_contact_relationship text,
  emergency_contact_phone text,
  emergency_contact_email text,

  -- Status & Lifecycle
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  administrative_notes text,
  archived_at timestamptz,
  archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT uq_patients_practice_identifier UNIQUE (practice_id, patient_identifier),
  CONSTRAINT chk_patients_name_not_empty CHECK (
    length(trim(first_name)) > 0 AND length(trim(last_name)) > 0
  )
);

-- Indexes for performant practice-scoped lookups and search
CREATE INDEX idx_patients_practice_status ON public.patients(practice_id, status);
CREATE INDEX idx_patients_practice_name ON public.patients(practice_id, last_name, first_name);
CREATE INDEX idx_patients_practice_identifier ON public.patients(practice_id, patient_identifier);
CREATE INDEX idx_patients_practice_dob ON public.patients(practice_id, date_of_birth);
CREATE INDEX idx_patients_practice_phone ON public.patients(practice_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_patients_practice_email ON public.patients(practice_id, email) WHERE email IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. SEQUENTIAL IDENTIFIER GENERATOR FUNCTION (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_next_patient_identifier(p_practice_id uuid)
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
    RAISE EXCEPTION 'Access denied: Insufficient privileges to generate patient identifier.';
  END IF;

  -- Atomic counter upsert
  INSERT INTO public.practice_patient_counters (practice_id, next_val, updated_at)
  VALUES (p_practice_id, 2, now())
  ON CONFLICT (practice_id)
  DO UPDATE SET
    next_val = public.practice_patient_counters.next_val + 1,
    updated_at = now()
  RETURNING public.practice_patient_counters.next_val - 1 INTO v_counter;

  v_identifier := 'PAT-' || lpad(v_counter::text, 6, '0');
  RETURN v_identifier;
END;
$$;

-- Revoke execute from public; grant to authenticated only
REVOKE ALL ON FUNCTION public.generate_next_patient_identifier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_patient_identifier(uuid) TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. PATIENT TRIGGERS (Identifier assignment, immutability, timestamps)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_patients_before_insert()
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
    RAISE EXCEPTION 'Patient practice_id must match active tenant context.';
  END IF;

  -- Auto-generate human-readable patient identifier if not supplied
  IF NEW.patient_identifier IS NULL OR trim(NEW.patient_identifier) = '' THEN
    NEW.patient_identifier := public.generate_next_patient_identifier(NEW.practice_id);
  END IF;

  -- Set audit timestamps and creator
  NEW.created_at := now();
  NEW.updated_at := now();
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  NEW.updated_by := auth.uid();

  -- Archive state consistency
  IF NEW.status = 'archived' THEN
    IF NEW.archived_at IS NULL THEN
      NEW.archived_at := now();
    END IF;
    IF NEW.archived_by IS NULL THEN
      NEW.archived_by := auth.uid();
    END IF;
  ELSE
    NEW.archived_at := NULL;
    NEW.archived_by := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_patients_before_insert
  BEFORE INSERT ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_patients_before_insert();

CREATE OR REPLACE FUNCTION public.trg_patients_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Prohibit tenant transfer
  IF NEW.practice_id <> OLD.practice_id THEN
    RAISE EXCEPTION 'Transferring patient to another practice is strictly prohibited.';
  END IF;

  -- Prohibit primary key or identifier alteration
  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'Altering patient internal UUID is prohibited.';
  END IF;

  IF NEW.patient_identifier <> OLD.patient_identifier THEN
    RAISE EXCEPTION 'Altering patient identifier is prohibited.';
  END IF;

  -- Guard archiving operations
  IF NEW.status = 'archived' AND OLD.status <> 'archived' THEN
    IF NOT public.user_has_practice_role(NEW.practice_id, ARRAY['practice_owner', 'practice_manager', 'receptionist']) THEN
      RAISE EXCEPTION 'Access denied: Insufficient privileges to archive patient.';
    END IF;
    NEW.archived_at := now();
    NEW.archived_by := auth.uid();
  ELSIF NEW.status <> 'archived' AND OLD.status = 'archived' THEN
    IF NOT public.user_has_practice_role(NEW.practice_id, ARRAY['practice_owner', 'practice_manager', 'receptionist']) THEN
      RAISE EXCEPTION 'Access denied: Insufficient privileges to unarchive patient.';
    END IF;
    NEW.archived_at := NULL;
    NEW.archived_by := NULL;
  END IF;

  NEW.updated_at := now();
  NEW.updated_by := auth.uid();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_patients_before_update
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_patients_before_update();

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES ON PATIENTS
-- ------------------------------------------------------------------------------

-- SELECT: Staff members in active practice context can view patients
CREATE POLICY "patients_select_active_practice"
  ON public.patients
  FOR SELECT
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'accountant']
    )
  );

-- INSERT: Authorized practice staff (owner, manager, physiotherapist, receptionist)
CREATE POLICY "patients_insert_active_practice"
  ON public.patients
  FOR INSERT
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']
    )
  );

-- UPDATE: Authorized practice staff
CREATE POLICY "patients_update_active_practice"
  ON public.patients
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
-- 6. PERMISSIONS & EXECUTE GRANTS
-- ------------------------------------------------------------------------------
REVOKE ALL ON public.patients FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public.patients TO authenticated;

REVOKE ALL ON public.practice_patient_counters FROM PUBLIC;
-- Counters accessed strictly through SECURITY DEFINER function
