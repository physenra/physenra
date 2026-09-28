-- ==============================================================================
-- PHYSENRA DATABASE MIGRATION: CLINICAL NOTE / SOAP FOUNDATION V1
-- Timestamp: 20260928024000_clinical_note_foundation.sql
--
-- Domains:
-- 1. Prerequisites: Composite unique constraint on clinical_visits for cross-tenant check
-- 2. Practice-scoped Clinical Note Counters table (NOT-000001)
-- 3. Clinical Notes table with SOAP schema, addenda support, and composite FKs
-- 4. Single primary SOAP note per visit index
-- 5. Atomic sequential note identifier generator
-- 6. Clinician author validation trigger
-- 7. Addendum validation & parent note status update triggers
-- 8. Immutability & finalized record protection triggers
-- 9. Row-Level Security (RLS) policies & zero hard deletes
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. COMPOSITE CLINICAL VISIT UNIQUE CONSTRAINT (Prerequisite for cross-tenant FK)
-- ------------------------------------------------------------------------------
ALTER TABLE public.clinical_visits
  ADD CONSTRAINT uq_clinical_visits_id_patient_practice UNIQUE (id, patient_id, practice_id);

-- ------------------------------------------------------------------------------
-- 2. CLINICAL NOTE COUNTERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.practice_clinical_note_counters (
  practice_id uuid PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
  next_val integer NOT NULL DEFAULT 1 CHECK (next_val >= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_clinical_note_counters ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. CLINICAL NOTES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  clinical_visit_id uuid NOT NULL REFERENCES public.clinical_visits(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  episode_id uuid REFERENCES public.episodes_of_care(id) ON DELETE SET NULL,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  note_identifier text NOT NULL,

  -- Note Classification
  note_type text NOT NULL DEFAULT 'soap' CHECK (note_type IN ('soap', 'addendum')),
  parent_note_id uuid REFERENCES public.clinical_notes(id) ON DELETE RESTRICT,

  -- Lifecycle State Machine
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'amended')),

  -- Physiotherapy SOAP Content Fields
  subjective text NOT NULL DEFAULT '',
  objective text NOT NULL DEFAULT '',
  assessment text NOT NULL DEFAULT '',
  plan text NOT NULL DEFAULT '',

  -- Addendum / Amendment Documentation
  amendment_reason text,

  -- Medico-legal Finalization Metadata
  finalized_at timestamptz,
  finalized_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Operational Audit Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints & Integrity Invariants
  CONSTRAINT uq_clinical_notes_practice_identifier UNIQUE (practice_id, note_identifier),
  CONSTRAINT fk_clinical_notes_patient_practice FOREIGN KEY (patient_id, practice_id)
    REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT,
  CONSTRAINT fk_clinical_notes_episode_patient_practice FOREIGN KEY (episode_id, patient_id, practice_id)
    REFERENCES public.episodes_of_care(id, patient_id, practice_id) ON DELETE SET NULL,
  CONSTRAINT fk_clinical_notes_visit_patient_practice FOREIGN KEY (clinical_visit_id, patient_id, practice_id)
    REFERENCES public.clinical_visits(id, patient_id, practice_id) ON DELETE RESTRICT,
  CONSTRAINT chk_clinical_notes_addendum CHECK (
    (note_type = 'addendum' AND parent_note_id IS NOT NULL AND amendment_reason IS NOT NULL AND length(trim(amendment_reason)) > 0)
    OR (note_type = 'soap' AND parent_note_id IS NULL)
  ),
  CONSTRAINT chk_clinical_notes_finalized CHECK (
    (status IN ('finalized', 'amended') AND finalized_at IS NOT NULL AND finalized_by IS NOT NULL)
    OR (status = 'draft' AND finalized_at IS NULL AND finalized_by IS NULL)
  )
);

-- Duplicate prevention: exactly one primary SOAP note per clinical visit
CREATE UNIQUE INDEX uq_clinical_notes_practice_visit_primary
  ON public.clinical_notes (practice_id, clinical_visit_id)
  WHERE note_type = 'soap';

-- ------------------------------------------------------------------------------
-- 4. PERFORMANCE & PRACTICE-SCOPED INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX idx_clinical_notes_practice_patient ON public.clinical_notes (practice_id, patient_id);
CREATE INDEX idx_clinical_notes_practice_visit ON public.clinical_notes (practice_id, clinical_visit_id);
CREATE INDEX idx_clinical_notes_practice_episode ON public.clinical_notes (practice_id, episode_id);
CREATE INDEX idx_clinical_notes_practice_author ON public.clinical_notes (practice_id, author_id);
CREATE INDEX idx_clinical_notes_practice_status ON public.clinical_notes (practice_id, status);
CREATE INDEX idx_clinical_notes_parent_note ON public.clinical_notes (parent_note_id);
CREATE INDEX idx_clinical_notes_practice_identifier ON public.clinical_notes (practice_id, note_identifier);

-- ------------------------------------------------------------------------------
-- 5. NOTE IDENTIFIER GENERATOR (NOT-000001)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_next_clinical_note_identifier(p_practice_id uuid)
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
      RAISE EXCEPTION 'Tenant context mismatch: cannot generate clinical note identifier for another practice'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  -- Atomic counter allocation
  INSERT INTO public.practice_clinical_note_counters (practice_id, next_val, updated_at)
  VALUES (p_practice_id, 2, now())
  ON CONFLICT (practice_id) DO UPDATE
    SET next_val = practice_clinical_note_counters.next_val + 1,
        updated_at = now()
  RETURNING practice_clinical_note_counters.next_val - 1 INTO v_next_val;

  v_identifier := 'NOT-' || lpad(v_next_val::text, 6, '0');
  RETURN v_identifier;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_next_clinical_note_identifier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_clinical_note_identifier(uuid) TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. TRIGGERS: IDENTIFIER, AUTHOR, ADDENDA & IMMUTABILITY
-- ------------------------------------------------------------------------------

-- Trigger 6.1: Set Note Identifier before insert
CREATE OR REPLACE FUNCTION public.trg_fn_set_clinical_note_identifier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.note_identifier IS NULL OR trim(NEW.note_identifier) = '' THEN
    NEW.note_identifier := public.generate_next_clinical_note_identifier(NEW.practice_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_clinical_note_identifier
  BEFORE INSERT ON public.clinical_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_set_clinical_note_identifier();

-- Trigger 6.2: Validate Author Assignment
CREATE OR REPLACE FUNCTION public.trg_fn_validate_clinical_note_author()
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
      AND user_id = NEW.author_id
      AND status = 'active'
      AND role IN ('practice_owner', 'practice_manager', 'physiotherapist')
  ) INTO v_valid;

  IF NOT v_valid THEN
    RAISE EXCEPTION 'Invalid note author: Author must be an active clinical staff member of this practice.'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_clinical_note_author
  BEFORE INSERT OR UPDATE OF author_id, practice_id ON public.clinical_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_validate_clinical_note_author();

-- Trigger 6.3: Validate Addendum Parent
CREATE OR REPLACE FUNCTION public.trg_fn_validate_addendum()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_parent RECORD;
BEGIN
  IF NEW.note_type = 'addendum' THEN
    SELECT * INTO v_parent
    FROM public.clinical_notes
    WHERE id = NEW.parent_note_id;

    IF v_parent.id IS NULL THEN
      RAISE EXCEPTION 'Invalid addendum: Parent clinical note does not exist.'
        USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF v_parent.practice_id <> NEW.practice_id THEN
      RAISE EXCEPTION 'Tenant isolation violation: Addendum practice must match parent note practice.'
        USING ERRCODE = 'restrict_violation';
    END IF;

    IF v_parent.clinical_visit_id <> NEW.clinical_visit_id THEN
      RAISE EXCEPTION 'Visit mismatch: Addendum visit must match parent note visit.'
        USING ERRCODE = 'restrict_violation';
    END IF;

    IF v_parent.status NOT IN ('finalized', 'amended') THEN
      RAISE EXCEPTION 'Invalid addendum: Can only create addendum for finalized or amended clinical notes.'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_addendum
  BEFORE INSERT ON public.clinical_notes
  FOR EACH ROW
  WHEN (NEW.note_type = 'addendum')
  EXECUTE FUNCTION public.trg_fn_validate_addendum();

-- Trigger 6.4: Update Parent Note Status on Addendum Creation
CREATE OR REPLACE FUNCTION public.trg_fn_on_addendum_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.note_type = 'addendum' AND NEW.parent_note_id IS NOT NULL THEN
    UPDATE public.clinical_notes
    SET status = 'amended',
        updated_at = now(),
        updated_by = NEW.author_id
    WHERE id = NEW.parent_note_id
      AND status = 'finalized';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_addendum_created
  AFTER INSERT ON public.clinical_notes
  FOR EACH ROW
  WHEN (NEW.note_type = 'addendum')
  EXECUTE FUNCTION public.trg_fn_on_addendum_created();

-- Trigger 6.5: Guard Invariants and Finalized Immutability
CREATE OR REPLACE FUNCTION public.trg_fn_guard_clinical_note_invariants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Strict identity immutability
  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'Immutability violation: Note ID cannot be changed'
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

  IF NEW.clinical_visit_id <> OLD.clinical_visit_id THEN
    RAISE EXCEPTION 'Immutability violation: clinical_visit_id cannot be changed'
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF NEW.note_identifier <> OLD.note_identifier THEN
    RAISE EXCEPTION 'Immutability violation: note_identifier cannot be changed'
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF NEW.note_type <> OLD.note_type THEN
    RAISE EXCEPTION 'Immutability violation: note_type cannot be changed'
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF NEW.parent_note_id IS DISTINCT FROM OLD.parent_note_id THEN
    RAISE EXCEPTION 'Immutability violation: parent_note_id cannot be changed'
      USING ERRCODE = 'restrict_violation';
  END IF;

  -- Content Immutability for Finalized and Amended Notes
  IF OLD.status IN ('finalized', 'amended') THEN
    IF (NEW.subjective <> OLD.subjective)
       OR (NEW.objective <> OLD.objective)
       OR (NEW.assessment <> OLD.assessment)
       OR (NEW.plan <> OLD.plan)
       OR (NEW.author_id <> OLD.author_id)
       OR (NEW.finalized_at <> OLD.finalized_at)
       OR (NEW.finalized_by <> OLD.finalized_by)
    THEN
      RAISE EXCEPTION 'Medico-legal immutability violation: Finalized or amended clinical notes cannot be modified. Create an addendum instead.'
        USING ERRCODE = 'restrict_violation';
    END IF;

    -- Lifecycle rules for finalized/amended notes
    IF OLD.status = 'finalized' AND NEW.status NOT IN ('finalized', 'amended') THEN
      RAISE EXCEPTION 'State transition violation: Finalized notes can only transition to amended'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF OLD.status = 'amended' AND NEW.status <> 'amended' THEN
      RAISE EXCEPTION 'State transition violation: Amended clinical notes are permanently locked'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END IF;

  -- Lifecycle rules for draft notes
  IF OLD.status = 'draft' THEN
    IF NEW.status = 'amended' THEN
      RAISE EXCEPTION 'State transition violation: Draft notes cannot directly transition to amended'
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

CREATE TRIGGER trg_guard_clinical_note_invariants
  BEFORE UPDATE ON public.clinical_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_guard_clinical_note_invariants();

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;

-- 7.1 SELECT: Active practice staff with authorized clinical or administrative roles
CREATE POLICY clinical_notes_select ON public.clinical_notes
  FOR SELECT
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'biller']
    )
  );

-- 7.2 INSERT: Active practice clinical staff
CREATE POLICY clinical_notes_insert ON public.clinical_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist']
    )
  );

-- 7.3 UPDATE: Active practice clinical staff
CREATE POLICY clinical_notes_update ON public.clinical_notes
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

-- 7.4 DELETE: Denied across all roles (No Hard Deletes)
CREATE POLICY clinical_notes_delete_denied ON public.clinical_notes
  FOR DELETE
  TO authenticated
  USING (false);

-- 7.5 Counters RLS
CREATE POLICY clinical_note_counters_select ON public.practice_clinical_note_counters
  FOR SELECT
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist']
    )
  );
