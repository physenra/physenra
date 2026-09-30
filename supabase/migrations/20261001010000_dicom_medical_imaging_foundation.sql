-- ==============================================================================
-- PHYSENRA DATABASE MIGRATION: DICOM & MEDICAL IMAGING FOUNDATION V1
-- Timestamp: 20261001010000_dicom_medical_imaging_foundation.sql
--
-- Domains:
-- 1. Exact 5 domain tables:
--    - public.practice_imaging_counters
--    - public.imaging_orders
--    - public.imaging_studies
--    - public.imaging_reports
--    - public.imaging_attachments
-- 2. Approved Enums:
--    - imaging_modality
--    - imaging_anatomical_region
--    - imaging_laterality
--    - imaging_urgency
--    - imaging_order_status
--    - imaging_review_status
--    - imaging_patient_release_status
--    - imaging_report_type
--    - imaging_report_source
--    - imaging_attachment_type
--    - imaging_mime_type
-- 3. Atomic sequential numbering generators:
--    - generate_next_imaging_order_identifier (ORD-000001)
--    - generate_next_imaging_study_identifier (IMG-000001)
-- 4. Multi-tenant composite foreign keys linking to patients, episodes_of_care, and clinical_visits
-- 5. Immutability & clinical safety triggers protecting reports, attachments, and finalized orders
-- 6. Ten authoritative SECURITY DEFINER RPCs with search_path, tenant and role checks
-- 7. Row-Level Security (RLS) policies on all five tables
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENUM DEFINITIONS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'imaging_modality') THEN
    CREATE TYPE public.imaging_modality AS ENUM (
      'xray', 'mri', 'ultrasound', 'ct', 'dexa', 'fluoroscopy', 'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'imaging_anatomical_region') THEN
    CREATE TYPE public.imaging_anatomical_region AS ENUM (
      'cervical_spine', 'thoracic_spine', 'lumbar_spine', 'sacrum_pelvis',
      'shoulder', 'elbow', 'wrist_hand', 'hip', 'knee', 'ankle_foot',
      'chest_ribs', 'head_neck', 'abdomen', 'multi_region', 'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'imaging_laterality') THEN
    CREATE TYPE public.imaging_laterality AS ENUM (
      'left', 'right', 'bilateral', 'not_applicable'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'imaging_urgency') THEN
    CREATE TYPE public.imaging_urgency AS ENUM (
      'routine', 'urgent', 'red_flag_emergency'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'imaging_order_status') THEN
    CREATE TYPE public.imaging_order_status AS ENUM (
      'draft', 'placed', 'completed', 'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'imaging_review_status') THEN
    CREATE TYPE public.imaging_review_status AS ENUM (
      'unreviewed', 'under_review', 'reviewed', 'amended'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'imaging_patient_release_status') THEN
    CREATE TYPE public.imaging_patient_release_status AS ENUM (
      'withheld', 'released_to_portal', 'restricted'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'imaging_report_type') THEN
    CREATE TYPE public.imaging_report_type AS ENUM (
      'formal_radiology', 'preliminary_wet_read', 'clinical_functional_note', 'amendment'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'imaging_report_source') THEN
    CREATE TYPE public.imaging_report_source AS ENUM (
      'external_facility', 'in_house_radiologist', 'attending_physiotherapist'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'imaging_attachment_type') THEN
    CREATE TYPE public.imaging_attachment_type AS ENUM (
      'key_image', 'radiology_report_pdf', 'requisition_form_pdf', 'patient_scanned_document'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'imaging_mime_type') THEN
    CREATE TYPE public.imaging_mime_type AS ENUM (
      'image/jpeg', 'image/png', 'application/pdf'
    );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TABLE: public.practice_imaging_counters
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_imaging_counters (
  practice_id UUID PRIMARY KEY REFERENCES public.practices(id) ON DELETE RESTRICT,
  last_order_number BIGINT NOT NULL DEFAULT 0,
  last_study_number BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT chk_practice_imaging_counters_order CHECK (last_order_number >= 0),
  CONSTRAINT chk_practice_imaging_counters_study CHECK (last_study_number >= 0)
);

CREATE INDEX IF NOT EXISTS idx_practice_imaging_counters_practice ON public.practice_imaging_counters(practice_id);

-- ------------------------------------------------------------------------------
-- 3. SEQUENTIAL IDENTIFIER GENERATOR FUNCTIONS (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_next_imaging_order_identifier(p_practice_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_next_val BIGINT;
BEGIN
  IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
    RAISE EXCEPTION 'Access denied: Target practice does not match active practice context.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']) THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges to generate imaging order number.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public.practice_imaging_counters (practice_id, last_order_number, last_study_number, updated_at)
  VALUES (p_practice_id, 1, 0, clock_timestamp())
  ON CONFLICT (practice_id) DO UPDATE
  SET last_order_number = public.practice_imaging_counters.last_order_number + 1,
      updated_at = clock_timestamp()
  RETURNING last_order_number INTO v_next_val;

  RETURN 'ORD-' || LPAD(v_next_val::TEXT, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_next_imaging_order_identifier(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_imaging_order_identifier(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_next_imaging_study_identifier(p_practice_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_next_val BIGINT;
BEGIN
  IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
    RAISE EXCEPTION 'Access denied: Target practice does not match active practice context.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']) THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges to generate imaging study number.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public.practice_imaging_counters (practice_id, last_order_number, last_study_number, updated_at)
  VALUES (p_practice_id, 0, 1, clock_timestamp())
  ON CONFLICT (practice_id) DO UPDATE
  SET last_study_number = public.practice_imaging_counters.last_study_number + 1,
      updated_at = clock_timestamp()
  RETURNING last_study_number INTO v_next_val;

  RETURN 'IMG-' || LPAD(v_next_val::TEXT, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_next_imaging_study_identifier(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_imaging_study_identifier(UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. TABLE: public.imaging_orders
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.imaging_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  order_number TEXT NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  episode_id UUID NULL,
  clinical_visit_id UUID NULL,
  ordering_clinician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  modality public.imaging_modality NOT NULL,
  anatomical_region public.imaging_anatomical_region NOT NULL,
  laterality public.imaging_laterality NOT NULL DEFAULT 'not_applicable',
  clinical_indication TEXT NOT NULL,
  provisional_diagnosis TEXT NULL,
  urgency public.imaging_urgency NOT NULL DEFAULT 'routine',
  red_flag_concerns TEXT[] NOT NULL DEFAULT '{}',
  contraindications_screened BOOLEAN NOT NULL DEFAULT FALSE,
  contraindication_notes TEXT NULL,
  referred_facility_name TEXT NULL,
  status public.imaging_order_status NOT NULL DEFAULT 'draft',
  order_date TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  placed_at TIMESTAMPTZ NULL,
  cancelled_at TIMESTAMPTZ NULL,
  cancellation_reason TEXT NULL,
  completed_at TIMESTAMPTZ NULL,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT uq_imaging_orders_practice_number UNIQUE (practice_id, order_number),
  CONSTRAINT uq_imaging_orders_id_patient_practice UNIQUE (id, patient_id, practice_id),
  CONSTRAINT fk_imaging_orders_patient_practice FOREIGN KEY (patient_id, practice_id)
    REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT,
  CONSTRAINT fk_imaging_orders_episode_patient_practice FOREIGN KEY (episode_id, patient_id, practice_id)
    REFERENCES public.episodes_of_care(id, patient_id, practice_id) ON DELETE SET NULL,
  CONSTRAINT fk_imaging_orders_visit_patient_practice FOREIGN KEY (clinical_visit_id, patient_id, practice_id)
    REFERENCES public.clinical_visits(id, patient_id, practice_id) ON DELETE SET NULL,
  CONSTRAINT fk_imaging_orders_ordering_clinician FOREIGN KEY (ordering_clinician_id)
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT chk_imaging_orders_order_number CHECK (order_number ~ '^ORD-[0-9]{6}$'),
  CONSTRAINT chk_imaging_orders_indication CHECK (length(trim(clinical_indication)) >= 5),
  CONSTRAINT chk_imaging_orders_placed CHECK (status <> 'placed' OR placed_at IS NOT NULL),
  CONSTRAINT chk_imaging_orders_cancelled CHECK (
    status <> 'cancelled' OR (cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL AND length(trim(cancellation_reason)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_imaging_orders_practice_patient ON public.imaging_orders(practice_id, patient_id, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_imaging_orders_practice_status ON public.imaging_orders(practice_id, status);
CREATE INDEX IF NOT EXISTS idx_imaging_orders_practice_clinician ON public.imaging_orders(practice_id, ordering_clinician_id);
CREATE INDEX IF NOT EXISTS idx_imaging_orders_episode ON public.imaging_orders(practice_id, episode_id);
CREATE INDEX IF NOT EXISTS idx_imaging_orders_visit ON public.imaging_orders(practice_id, clinical_visit_id);

-- ------------------------------------------------------------------------------
-- 5. TABLE: public.imaging_studies
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.imaging_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  study_number TEXT NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  episode_id UUID NULL,
  clinical_visit_id UUID NULL,
  order_id UUID NULL,
  referring_clinician_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewing_clinician_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  study_instance_uid TEXT NULL,
  accession_number TEXT NULL,
  study_date DATE NOT NULL,
  study_time TIME NULL,
  modality public.imaging_modality NOT NULL,
  anatomical_region public.imaging_anatomical_region NOT NULL,
  laterality public.imaging_laterality NOT NULL DEFAULT 'not_applicable',
  performing_facility TEXT NULL,
  body_part_examined TEXT NULL,
  series_count INTEGER NOT NULL DEFAULT 1 CHECK (series_count >= 1),
  instance_count INTEGER NOT NULL DEFAULT 1 CHECK (instance_count >= 1),
  external_viewer_url TEXT NULL,
  review_status public.imaging_review_status NOT NULL DEFAULT 'unreviewed',
  reviewed_at TIMESTAMPTZ NULL,
  clinical_functional_interpretation TEXT NULL,
  correlation_with_physical_findings TEXT NULL,
  treatment_plan_impact TEXT NULL,
  red_flag_alert BOOLEAN NOT NULL DEFAULT FALSE,
  red_flag_details TEXT NULL,
  patient_release_status public.imaging_patient_release_status NOT NULL DEFAULT 'withheld',
  released_at TIMESTAMPTZ NULL,
  released_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_patient_visible BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT uq_imaging_studies_practice_number UNIQUE (practice_id, study_number),
  CONSTRAINT uq_imaging_studies_id_patient_practice UNIQUE (id, patient_id, practice_id),
  CONSTRAINT fk_imaging_studies_patient_practice FOREIGN KEY (patient_id, practice_id)
    REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT,
  CONSTRAINT fk_imaging_studies_episode_patient_practice FOREIGN KEY (episode_id, patient_id, practice_id)
    REFERENCES public.episodes_of_care(id, patient_id, practice_id) ON DELETE SET NULL,
  CONSTRAINT fk_imaging_studies_visit_patient_practice FOREIGN KEY (clinical_visit_id, patient_id, practice_id)
    REFERENCES public.clinical_visits(id, patient_id, practice_id) ON DELETE SET NULL,
  CONSTRAINT fk_imaging_studies_parent_order FOREIGN KEY (order_id, patient_id, practice_id)
    REFERENCES public.imaging_orders(id, patient_id, practice_id) ON DELETE SET NULL,
  CONSTRAINT fk_imaging_studies_referring_clinician FOREIGN KEY (referring_clinician_id)
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT fk_imaging_studies_reviewing_clinician FOREIGN KEY (reviewing_clinician_id)
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT fk_imaging_studies_released_by FOREIGN KEY (released_by)
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT chk_imaging_studies_study_number CHECK (study_number ~ '^IMG-[0-9]{6}$'),
  CONSTRAINT chk_imaging_studies_external_viewer_url CHECK (external_viewer_url IS NULL OR external_viewer_url ~ '^https://'),
  CONSTRAINT chk_imaging_studies_reviewed CHECK (
    review_status NOT IN ('reviewed', 'amended') OR (
      reviewed_at IS NOT NULL AND
      reviewing_clinician_id IS NOT NULL AND
      clinical_functional_interpretation IS NOT NULL AND
      length(trim(clinical_functional_interpretation)) >= 5
    )
  ),
  CONSTRAINT chk_imaging_studies_release CHECK (
    patient_release_status <> 'released_to_portal' OR (
      released_at IS NOT NULL AND
      released_by IS NOT NULL AND
      review_status IN ('reviewed', 'amended')
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_imaging_studies_practice_uid
  ON public.imaging_studies (practice_id, study_instance_uid)
  WHERE study_instance_uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_imaging_studies_practice_patient ON public.imaging_studies(practice_id, patient_id, study_date DESC);
CREATE INDEX IF NOT EXISTS idx_imaging_studies_practice_review ON public.imaging_studies(practice_id, review_status);
CREATE INDEX IF NOT EXISTS idx_imaging_studies_practice_modality ON public.imaging_studies(practice_id, modality);
CREATE INDEX IF NOT EXISTS idx_imaging_studies_accession ON public.imaging_studies(practice_id, accession_number) WHERE accession_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_imaging_studies_episode ON public.imaging_studies(practice_id, episode_id);
CREATE INDEX IF NOT EXISTS idx_imaging_studies_visit ON public.imaging_studies(practice_id, clinical_visit_id);

-- ------------------------------------------------------------------------------
-- 6. TABLE: public.imaging_reports
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.imaging_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  study_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  report_type public.imaging_report_type NOT NULL DEFAULT 'formal_radiology',
  source public.imaging_report_source NOT NULL DEFAULT 'external_facility',
  author_name TEXT NOT NULL CHECK (length(trim(author_name)) > 0),
  author_credentials TEXT NULL,
  authoring_organization TEXT NULL,
  findings TEXT NOT NULL,
  impression TEXT NOT NULL,
  recommendations TEXT NULL,
  critical_findings_identified BOOLEAN NOT NULL DEFAULT FALSE,
  critical_findings_communicated BOOLEAN NOT NULL DEFAULT FALSE,
  communication_details TEXT NULL,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  transcribed_at TIMESTAMPTZ NULL,
  is_amendment BOOLEAN NOT NULL DEFAULT FALSE,
  original_report_id UUID NULL REFERENCES public.imaging_reports(id) ON DELETE RESTRICT,
  amendment_reason TEXT NULL,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT uq_imaging_reports_id_practice UNIQUE (id, practice_id),
  CONSTRAINT fk_imaging_reports_parent_study FOREIGN KEY (study_id, patient_id, practice_id)
    REFERENCES public.imaging_studies(id, patient_id, practice_id) ON DELETE CASCADE,
  CONSTRAINT fk_imaging_reports_patient FOREIGN KEY (patient_id, practice_id)
    REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT,
  CONSTRAINT chk_imaging_reports_findings CHECK (length(trim(findings)) >= 5),
  CONSTRAINT chk_imaging_reports_impression CHECK (length(trim(impression)) >= 5),
  CONSTRAINT chk_imaging_reports_amendment CHECK (
    (is_amendment = FALSE AND original_report_id IS NULL AND amendment_reason IS NULL) OR
    (is_amendment = TRUE AND original_report_id IS NOT NULL AND length(trim(amendment_reason)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_imaging_reports_study ON public.imaging_reports(study_id);
CREATE INDEX IF NOT EXISTS idx_imaging_reports_practice_patient ON public.imaging_reports(practice_id, patient_id);

-- ------------------------------------------------------------------------------
-- 7. TABLE: public.imaging_attachments
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.imaging_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  study_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  report_id UUID NULL REFERENCES public.imaging_reports(id) ON DELETE SET NULL,
  attachment_type public.imaging_attachment_type NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL CHECK (length(trim(file_name)) > 0),
  file_size_bytes BIGINT NOT NULL,
  mime_type public.imaging_mime_type NOT NULL,
  sha256_hash TEXT NOT NULL CHECK (sha256_hash ~ '^[0-9a-f]{64}$'),
  caption TEXT NULL,
  key_slice_reference TEXT NULL,
  is_patient_visible BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT fk_imaging_attachments_parent_study FOREIGN KEY (study_id, patient_id, practice_id)
    REFERENCES public.imaging_studies(id, patient_id, practice_id) ON DELETE CASCADE,
  CONSTRAINT fk_imaging_attachments_patient FOREIGN KEY (patient_id, practice_id)
    REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT,
  CONSTRAINT chk_imaging_attachments_file_size CHECK (
    file_size_bytes > 0 AND (
      (mime_type = 'application/pdf' AND file_size_bytes <= 26214400) OR
      (mime_type IN ('image/jpeg', 'image/png') AND file_size_bytes <= 15728640)
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_imaging_attachments_study ON public.imaging_attachments(study_id);
CREATE INDEX IF NOT EXISTS idx_imaging_attachments_practice ON public.imaging_attachments(practice_id);

-- ------------------------------------------------------------------------------
-- 8. IMMUTABILITY & PROTECTION TRIGGERS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_imaging_report_direct_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Diagnostic imaging reports are immutable medical records and cannot be deleted.'
      USING ERRCODE = 'integrity_constraint_violation';
  ELSIF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Diagnostic imaging reports cannot be updated in place. Amendments must be recorded as linked amendment records.'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_imaging_reports_mutation ON public.imaging_reports;
CREATE TRIGGER trg_protect_imaging_reports_mutation
  BEFORE UPDATE OR DELETE ON public.imaging_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_imaging_report_direct_mutation();

CREATE OR REPLACE FUNCTION public.prevent_imaging_attachment_direct_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Imaging attachments are immutable medical assets and cannot be hard deleted.'
      USING ERRCODE = 'integrity_constraint_violation';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Allow updating only visibility and caption
    IF NEW.storage_path <> OLD.storage_path OR NEW.sha256_hash <> OLD.sha256_hash OR NEW.file_size_bytes <> OLD.file_size_bytes OR NEW.mime_type <> OLD.mime_type THEN
      RAISE EXCEPTION 'Storage binary metadata on imaging attachments cannot be mutated.'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_imaging_attachments_mutation ON public.imaging_attachments;
CREATE TRIGGER trg_protect_imaging_attachments_mutation
  BEFORE UPDATE OR DELETE ON public.imaging_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_imaging_attachment_direct_mutation();

CREATE OR REPLACE FUNCTION public.prevent_imaging_hard_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Hard deletion is strictly prohibited on imaging domain records. Use soft-delete / archival.'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_imaging_orders_delete ON public.imaging_orders;
CREATE TRIGGER trg_protect_imaging_orders_delete
  BEFORE DELETE ON public.imaging_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_imaging_hard_delete();

DROP TRIGGER IF EXISTS trg_protect_imaging_studies_delete ON public.imaging_studies;
CREATE TRIGGER trg_protect_imaging_studies_delete
  BEFORE DELETE ON public.imaging_studies
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_imaging_hard_delete();

-- ------------------------------------------------------------------------------
-- 9. ROW-LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.practice_imaging_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imaging_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imaging_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imaging_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imaging_attachments ENABLE ROW LEVEL SECURITY;

-- 1. Counters
DROP POLICY IF EXISTS imaging_counters_tenant ON public.practice_imaging_counters;
CREATE POLICY imaging_counters_tenant ON public.practice_imaging_counters
  FOR ALL
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND NOT public.is_platform_admin()
  )
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND NOT public.is_platform_admin()
  );

-- 2. Orders
DROP POLICY IF EXISTS imaging_orders_select ON public.imaging_orders;
CREATE POLICY imaging_orders_select ON public.imaging_orders
  FOR SELECT
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND NOT public.is_platform_admin()
    AND (
      public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist'])
      OR (
        public.user_has_practice_role(practice_id, ARRAY['patient'])
        AND patient_id = (SELECT id FROM public.patients WHERE practice_id = public.current_practice_id() AND id = auth.uid())
        AND status IN ('placed', 'completed')
      )
    )
  );

DROP POLICY IF EXISTS imaging_orders_insert ON public.imaging_orders;
CREATE POLICY imaging_orders_insert ON public.imaging_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND NOT public.is_platform_admin()
    AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist'])
  );

DROP POLICY IF EXISTS imaging_orders_update ON public.imaging_orders;
CREATE POLICY imaging_orders_update ON public.imaging_orders
  FOR UPDATE
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND NOT public.is_platform_admin()
    AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist'])
  )
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND NOT public.is_platform_admin()
    AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist'])
  );

-- 3. Studies
DROP POLICY IF EXISTS imaging_studies_select ON public.imaging_studies;
CREATE POLICY imaging_studies_select ON public.imaging_studies
  FOR SELECT
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND NOT public.is_platform_admin()
    AND is_active = TRUE
    AND (
      public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist'])
      OR (
        public.user_has_practice_role(practice_id, ARRAY['patient'])
        AND patient_id = (SELECT id FROM public.patients WHERE practice_id = public.current_practice_id() AND id = auth.uid())
        AND is_patient_visible = TRUE
        AND patient_release_status = 'released_to_portal'
      )
    )
  );

DROP POLICY IF EXISTS imaging_studies_insert ON public.imaging_studies;
CREATE POLICY imaging_studies_insert ON public.imaging_studies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND NOT public.is_platform_admin()
    AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist'])
  );

DROP POLICY IF EXISTS imaging_studies_update ON public.imaging_studies;
CREATE POLICY imaging_studies_update ON public.imaging_studies
  FOR UPDATE
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND NOT public.is_platform_admin()
    AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist'])
  )
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND NOT public.is_platform_admin()
    AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist'])
  );

-- 4. Reports
DROP POLICY IF EXISTS imaging_reports_select ON public.imaging_reports;
CREATE POLICY imaging_reports_select ON public.imaging_reports
  FOR SELECT
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND NOT public.is_platform_admin()
    AND (
      public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist'])
      OR (
        public.user_has_practice_role(practice_id, ARRAY['patient'])
        AND patient_id = (SELECT id FROM public.patients WHERE practice_id = public.current_practice_id() AND id = auth.uid())
        AND EXISTS (
          SELECT 1 FROM public.imaging_studies s
          WHERE s.id = imaging_reports.study_id
            AND s.practice_id = imaging_reports.practice_id
            AND s.is_patient_visible = TRUE
            AND s.patient_release_status = 'released_to_portal'
        )
      )
    )
  );

DROP POLICY IF EXISTS imaging_reports_insert ON public.imaging_reports;
CREATE POLICY imaging_reports_insert ON public.imaging_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND NOT public.is_platform_admin()
    AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist'])
  );

-- 5. Attachments
DROP POLICY IF EXISTS imaging_attachments_select ON public.imaging_attachments;
CREATE POLICY imaging_attachments_select ON public.imaging_attachments
  FOR SELECT
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND NOT public.is_platform_admin()
    AND (
      public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist'])
      OR (
        public.user_has_practice_role(practice_id, ARRAY['patient'])
        AND patient_id = (SELECT id FROM public.patients WHERE practice_id = public.current_practice_id() AND id = auth.uid())
        AND is_patient_visible = TRUE
        AND EXISTS (
          SELECT 1 FROM public.imaging_studies s
          WHERE s.id = imaging_attachments.study_id
            AND s.practice_id = imaging_attachments.practice_id
            AND s.is_patient_visible = TRUE
            AND s.patient_release_status = 'released_to_portal'
        )
      )
    )
  );

DROP POLICY IF EXISTS imaging_attachments_insert ON public.imaging_attachments;
CREATE POLICY imaging_attachments_insert ON public.imaging_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND NOT public.is_platform_admin()
    AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist'])
  );

DROP POLICY IF EXISTS imaging_attachments_update ON public.imaging_attachments;
CREATE POLICY imaging_attachments_update ON public.imaging_attachments
  FOR UPDATE
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND NOT public.is_platform_admin()
    AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
  )
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND NOT public.is_platform_admin()
    AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
  );

-- ------------------------------------------------------------------------------
-- 10. AUTHORITATIVE SECURITY DEFINER RPCS (10 FUNCTIONS)
-- ------------------------------------------------------------------------------

-- RPC 1: create_imaging_order
CREATE OR REPLACE FUNCTION public.create_imaging_order(
  p_practice_id UUID,
  p_patient_id UUID,
  p_ordering_clinician_id UUID,
  p_modality public.imaging_modality,
  p_anatomical_region public.imaging_anatomical_region,
  p_clinical_indication TEXT,
  p_laterality public.imaging_laterality DEFAULT 'not_applicable'::public.imaging_laterality,
  p_episode_id UUID DEFAULT NULL::UUID,
  p_clinical_visit_id UUID DEFAULT NULL::UUID,
  p_provisional_diagnosis TEXT DEFAULT NULL::TEXT,
  p_urgency public.imaging_urgency DEFAULT 'routine'::public.imaging_urgency,
  p_red_flag_concerns TEXT[] DEFAULT '{}'::TEXT[],
  p_contraindications_screened BOOLEAN DEFAULT FALSE,
  p_contraindication_notes TEXT DEFAULT NULL::TEXT,
  p_referred_facility_name TEXT DEFAULT NULL::TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_order_id UUID;
  v_order_number TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
    RAISE EXCEPTION 'Access denied: Target practice does not match active practice context.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']) THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges to create imaging orders.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Validate patient belongs to practice
  IF NOT EXISTS (SELECT 1 FROM public.patients WHERE id = p_patient_id AND practice_id = p_practice_id) THEN
    RAISE EXCEPTION 'Patient does not exist in target practice.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Validate clinician exists and belongs to practice
  IF NOT EXISTS (
    SELECT 1 FROM public.practice_memberships
    WHERE user_id = p_ordering_clinician_id
      AND practice_id = p_practice_id
      AND status = 'active'
      AND role IN ('practice_owner', 'practice_manager', 'physiotherapist')
  ) THEN
    RAISE EXCEPTION 'Ordering clinician must be an active clinician in target practice.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_order_number := public.generate_next_imaging_order_identifier(p_practice_id);

  INSERT INTO public.imaging_orders (
    practice_id, order_number, patient_id, episode_id, clinical_visit_id,
    ordering_clinician_id, modality, anatomical_region, laterality,
    clinical_indication, provisional_diagnosis, urgency, red_flag_concerns,
    contraindications_screened, contraindication_notes, referred_facility_name,
    status, created_by, updated_by
  ) VALUES (
    p_practice_id, v_order_number, p_patient_id, p_episode_id, p_clinical_visit_id,
    p_ordering_clinician_id, p_modality, p_anatomical_region, p_laterality,
    trim(p_clinical_indication), p_provisional_diagnosis, p_urgency, p_red_flag_concerns,
    p_contraindications_screened, p_contraindication_notes, p_referred_facility_name,
    'draft', v_user_id, v_user_id
  ) RETURNING id INTO v_order_id;

  PERFORM public.log_audit_event(
    p_practice_id,
    'imaging.order.created',
    'imaging_orders',
    v_order_id,
    jsonb_build_object('order_number', v_order_number, 'modality', p_modality, 'urgency', p_urgency),
    'web'
  );

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_imaging_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_imaging_order TO authenticated;

-- RPC 2: place_imaging_order
CREATE OR REPLACE FUNCTION public.place_imaging_order(
  p_order_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_practice_id UUID;
  v_status public.imaging_order_status;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT practice_id, status INTO v_practice_id, v_status
  FROM public.imaging_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Imaging order not found.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_practice_id <> public.current_practice_id() THEN
    RAISE EXCEPTION 'Access denied: Target practice does not match active practice context.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.user_has_practice_role(v_practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist']) THEN
    RAISE EXCEPTION 'Access denied: Only clinical staff can place imaging orders.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft orders can be placed. Current status: %', v_status
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.imaging_orders
  SET status = 'placed',
      placed_at = clock_timestamp(),
      updated_by = v_user_id,
      updated_at = clock_timestamp()
  WHERE id = p_order_id;

  PERFORM public.log_audit_event(
    v_practice_id,
    'imaging.order.placed',
    'imaging_orders',
    p_order_id,
    jsonb_build_object('previous_status', 'draft', 'new_status', 'placed'),
    'web'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.place_imaging_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_imaging_order TO authenticated;

-- RPC 3: cancel_imaging_order
CREATE OR REPLACE FUNCTION public.cancel_imaging_order(
  p_order_id UUID,
  p_cancellation_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_practice_id UUID;
  v_status public.imaging_order_status;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_cancellation_reason IS NULL OR length(trim(p_cancellation_reason)) = 0 THEN
    RAISE EXCEPTION 'Cancellation reason is required.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT practice_id, status INTO v_practice_id, v_status
  FROM public.imaging_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Imaging order not found.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_practice_id <> public.current_practice_id() THEN
    RAISE EXCEPTION 'Access denied: Target practice does not match active practice context.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.user_has_practice_role(v_practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist']) THEN
    RAISE EXCEPTION 'Access denied: Only clinical staff can cancel imaging orders.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_status NOT IN ('draft', 'placed') THEN
    RAISE EXCEPTION 'Cannot cancel an order with status: %', v_status USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.imaging_orders
  SET status = 'cancelled',
      cancelled_at = clock_timestamp(),
      cancellation_reason = trim(p_cancellation_reason),
      updated_by = v_user_id,
      updated_at = clock_timestamp()
  WHERE id = p_order_id;

  PERFORM public.log_audit_event(
    v_practice_id,
    'imaging.order.cancelled',
    'imaging_orders',
    p_order_id,
    jsonb_build_object('cancellation_reason', trim(p_cancellation_reason)),
    'web'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_imaging_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_imaging_order TO authenticated;

-- RPC 4: ingest_imaging_study
CREATE OR REPLACE FUNCTION public.ingest_imaging_study(
  p_practice_id UUID,
  p_patient_id UUID,
  p_study_date DATE,
  p_modality public.imaging_modality,
  p_anatomical_region public.imaging_anatomical_region,
  p_order_id UUID DEFAULT NULL::UUID,
  p_episode_id UUID DEFAULT NULL::UUID,
  p_clinical_visit_id UUID DEFAULT NULL::UUID,
  p_referring_clinician_id UUID DEFAULT NULL::UUID,
  p_study_instance_uid TEXT DEFAULT NULL::TEXT,
  p_accession_number TEXT DEFAULT NULL::TEXT,
  p_study_time TIME DEFAULT NULL::TIME,
  p_laterality public.imaging_laterality DEFAULT 'not_applicable'::public.imaging_laterality,
  p_performing_facility TEXT DEFAULT NULL::TEXT,
  p_body_part_examined TEXT DEFAULT NULL::TEXT,
  p_series_count INTEGER DEFAULT 1,
  p_instance_count INTEGER DEFAULT 1,
  p_external_viewer_url TEXT DEFAULT NULL::TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_study_id UUID;
  v_study_number TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
    RAISE EXCEPTION 'Access denied: Target practice does not match active practice context.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']) THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges to ingest imaging studies.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Validate patient exists in practice
  IF NOT EXISTS (SELECT 1 FROM public.patients WHERE id = p_patient_id AND practice_id = p_practice_id) THEN
    RAISE EXCEPTION 'Patient does not exist in target practice.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Validate external viewer url protocol if supplied
  IF p_external_viewer_url IS NOT NULL AND p_external_viewer_url !~ '^https://' THEN
    RAISE EXCEPTION 'External viewer URL must strictly use HTTPS protocol.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_study_number := public.generate_next_imaging_study_identifier(p_practice_id);

  INSERT INTO public.imaging_studies (
    practice_id, study_number, patient_id, episode_id, clinical_visit_id,
    order_id, referring_clinician_id, study_instance_uid, accession_number,
    study_date, study_time, modality, anatomical_region, laterality,
    performing_facility, body_part_examined, series_count, instance_count,
    external_viewer_url, review_status, patient_release_status,
    is_patient_visible, is_active, created_by, updated_by
  ) VALUES (
    p_practice_id, v_study_number, p_patient_id, p_episode_id, p_clinical_visit_id,
    p_order_id, p_referring_clinician_id, p_study_instance_uid, p_accession_number,
    p_study_date, p_study_time, p_modality, p_anatomical_region, p_laterality,
    p_performing_facility, p_body_part_examined, GREATEST(p_series_count, 1), GREATEST(p_instance_count, 1),
    p_external_viewer_url, 'unreviewed', 'withheld',
    FALSE, TRUE, v_user_id, v_user_id
  ) RETURNING id INTO v_study_id;

  -- If linked to an order, advance order to completed
  IF p_order_id IS NOT NULL THEN
    UPDATE public.imaging_orders
    SET status = 'completed',
        completed_at = clock_timestamp(),
        updated_by = v_user_id,
        updated_at = clock_timestamp()
    WHERE id = p_order_id
      AND status = 'placed';
  END IF;

  PERFORM public.log_audit_event(
    p_practice_id,
    'imaging.study.ingested',
    'imaging_studies',
    v_study_id,
    jsonb_build_object('study_number', v_study_number, 'modality', p_modality, 'study_date', p_study_date),
    'web'
  );

  RETURN v_study_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_imaging_study FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ingest_imaging_study TO authenticated;

-- RPC 5: attach_imaging_report
CREATE OR REPLACE FUNCTION public.attach_imaging_report(
  p_study_id UUID,
  p_author_name TEXT,
  p_findings TEXT,
  p_impression TEXT,
  p_report_type public.imaging_report_type DEFAULT 'formal_radiology'::public.imaging_report_type,
  p_source public.imaging_report_source DEFAULT 'external_facility'::public.imaging_report_source,
  p_author_credentials TEXT DEFAULT NULL::TEXT,
  p_authoring_organization TEXT DEFAULT NULL::TEXT,
  p_recommendations TEXT DEFAULT NULL::TEXT,
  p_critical_findings_identified BOOLEAN DEFAULT FALSE,
  p_critical_findings_communicated BOOLEAN DEFAULT FALSE,
  p_communication_details TEXT DEFAULT NULL::TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_practice_id UUID;
  v_patient_id UUID;
  v_report_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT practice_id, patient_id INTO v_practice_id, v_patient_id
  FROM public.imaging_studies
  WHERE id = p_study_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Imaging study not found.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_practice_id <> public.current_practice_id() THEN
    RAISE EXCEPTION 'Access denied: Target practice does not match active practice context.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.user_has_practice_role(v_practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']) THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges to attach diagnostic reports.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public.imaging_reports (
    practice_id, study_id, patient_id, report_type, source,
    author_name, author_credentials, authoring_organization,
    findings, impression, recommendations,
    critical_findings_identified, critical_findings_communicated,
    communication_details, is_amendment, created_by, updated_by
  ) VALUES (
    v_practice_id, p_study_id, v_patient_id, p_report_type, p_source,
    trim(p_author_name), p_author_credentials, p_authoring_organization,
    trim(p_findings), trim(p_impression), p_recommendations,
    p_critical_findings_identified, p_critical_findings_communicated,
    p_communication_details, FALSE, v_user_id, v_user_id
  ) RETURNING id INTO v_report_id;

  PERFORM public.log_audit_event(
    v_practice_id,
    'imaging.report.attached',
    'imaging_reports',
    v_report_id,
    jsonb_build_object('study_id', p_study_id, 'report_type', p_report_type, 'author_name', p_author_name),
    'web'
  );

  RETURN v_report_id;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_imaging_report FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_imaging_report TO authenticated;

-- RPC 6: register_imaging_attachment
CREATE OR REPLACE FUNCTION public.register_imaging_attachment(
  p_study_id UUID,
  p_attachment_type public.imaging_attachment_type,
  p_storage_path TEXT,
  p_file_name TEXT,
  p_file_size_bytes BIGINT,
  p_mime_type public.imaging_mime_type,
  p_sha256_hash TEXT,
  p_report_id UUID DEFAULT NULL::UUID,
  p_caption TEXT DEFAULT NULL::TEXT,
  p_key_slice_reference TEXT DEFAULT NULL::TEXT,
  p_is_patient_visible BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_practice_id UUID;
  v_patient_id UUID;
  v_attachment_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT practice_id, patient_id INTO v_practice_id, v_patient_id
  FROM public.imaging_studies
  WHERE id = p_study_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Imaging study not found.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_practice_id <> public.current_practice_id() THEN
    RAISE EXCEPTION 'Access denied: Target practice does not match active practice context.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.user_has_practice_role(v_practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']) THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges to register attachments.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Validate path format: must start with practice_id
  IF p_storage_path !~ ('^' || v_practice_id::TEXT) THEN
    RAISE EXCEPTION 'Invalid storage path: must be prefixed with practice id.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO public.imaging_attachments (
    practice_id, study_id, patient_id, report_id, attachment_type,
    storage_path, file_name, file_size_bytes, mime_type, sha256_hash,
    caption, key_slice_reference, is_patient_visible, created_by
  ) VALUES (
    v_practice_id, p_study_id, v_patient_id, p_report_id, p_attachment_type,
    trim(p_storage_path), trim(p_file_name), p_file_size_bytes, p_mime_type, lower(trim(p_sha256_hash)),
    p_caption, p_key_slice_reference, p_is_patient_visible, v_user_id
  ) RETURNING id INTO v_attachment_id;

  PERFORM public.log_audit_event(
    v_practice_id,
    'imaging.attachment.registered',
    'imaging_attachments',
    v_attachment_id,
    jsonb_build_object('study_id', p_study_id, 'file_name', p_file_name, 'file_size_bytes', p_file_size_bytes),
    'web'
  );

  RETURN v_attachment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_imaging_attachment FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_imaging_attachment TO authenticated;

-- RPC 7: finalize_imaging_study_review
CREATE OR REPLACE FUNCTION public.finalize_imaging_study_review(
  p_study_id UUID,
  p_clinical_functional_interpretation TEXT,
  p_correlation_with_physical_findings TEXT,
  p_treatment_plan_impact TEXT,
  p_red_flag_alert BOOLEAN,
  p_red_flag_details TEXT DEFAULT NULL::TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_practice_id UUID;
  v_current_review_status public.imaging_review_status;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_clinical_functional_interpretation IS NULL OR length(trim(p_clinical_functional_interpretation)) < 5 THEN
    RAISE EXCEPTION 'Clinical functional interpretation must be at least 5 characters.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_red_flag_alert = TRUE AND (p_red_flag_details IS NULL OR length(trim(p_red_flag_details)) = 0) THEN
    RAISE EXCEPTION 'Red-flag alert requires documented red-flag details.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT practice_id, review_status INTO v_practice_id, v_current_review_status
  FROM public.imaging_studies
  WHERE id = p_study_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Imaging study not found.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_practice_id <> public.current_practice_id() THEN
    RAISE EXCEPTION 'Access denied: Target practice does not match active practice context.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Only clinical staff can finalize reviews
  IF NOT public.user_has_practice_role(v_practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist']) THEN
    RAISE EXCEPTION 'Access denied: Only physiotherapists and clinical management can finalize reviews.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_current_review_status IN ('reviewed', 'amended') THEN
    RAISE EXCEPTION 'Study review has already been finalized. Use amend_imaging_study_review for subsequent notes.'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.imaging_studies
  SET review_status = 'reviewed',
      reviewed_at = clock_timestamp(),
      reviewing_clinician_id = v_user_id,
      clinical_functional_interpretation = trim(p_clinical_functional_interpretation),
      correlation_with_physical_findings = trim(p_correlation_with_physical_findings),
      treatment_plan_impact = trim(p_treatment_plan_impact),
      red_flag_alert = p_red_flag_alert,
      red_flag_details = CASE WHEN p_red_flag_alert THEN trim(p_red_flag_details) ELSE NULL END,
      updated_by = v_user_id,
      updated_at = clock_timestamp()
  WHERE id = p_study_id;

  PERFORM public.log_audit_event(
    v_practice_id,
    'imaging.study.review_finalized',
    'imaging_studies',
    p_study_id,
    jsonb_build_object('reviewer_id', v_user_id, 'red_flag_alert', p_red_flag_alert),
    'web'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_imaging_study_review FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_imaging_study_review TO authenticated;

-- RPC 8: amend_imaging_study_review
CREATE OR REPLACE FUNCTION public.amend_imaging_study_review(
  p_study_id UUID,
  p_amendment_notes TEXT,
  p_amendment_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_practice_id UUID;
  v_current_review_status public.imaging_review_status;
  v_existing_interpretation TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_amendment_notes IS NULL OR length(trim(p_amendment_notes)) = 0 THEN
    RAISE EXCEPTION 'Amendment notes cannot be empty.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_amendment_reason IS NULL OR length(trim(p_amendment_reason)) = 0 THEN
    RAISE EXCEPTION 'Amendment reason is required.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT practice_id, review_status, clinical_functional_interpretation
  INTO v_practice_id, v_current_review_status, v_existing_interpretation
  FROM public.imaging_studies
  WHERE id = p_study_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Imaging study not found.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_practice_id <> public.current_practice_id() THEN
    RAISE EXCEPTION 'Access denied: Target practice does not match active practice context.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.user_has_practice_role(v_practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist']) THEN
    RAISE EXCEPTION 'Access denied: Only clinical staff can amend reviews.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_current_review_status NOT IN ('reviewed', 'amended') THEN
    RAISE EXCEPTION 'Cannot amend a review that has not been finalized.' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.imaging_studies
  SET review_status = 'amended',
      clinical_functional_interpretation = v_existing_interpretation || E'\n\n[AMENDMENT ' || to_char(clock_timestamp(), 'YYYY-MM-DD HH24:MI:SS UTC') || E']: ' || trim(p_amendment_notes),
      updated_by = v_user_id,
      updated_at = clock_timestamp()
  WHERE id = p_study_id;

  PERFORM public.log_audit_event(
    v_practice_id,
    'imaging.study.amended',
    'imaging_studies',
    p_study_id,
    jsonb_build_object('amendment_reason', trim(p_amendment_reason), 'amended_by', v_user_id),
    'web'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.amend_imaging_study_review FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.amend_imaging_study_review TO authenticated;

-- RPC 9: release_imaging_to_patient
CREATE OR REPLACE FUNCTION public.release_imaging_to_patient(
  p_study_id UUID,
  p_release_notes TEXT DEFAULT NULL::TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_practice_id UUID;
  v_review_status public.imaging_review_status;
  v_red_flag_alert BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT practice_id, review_status, red_flag_alert
  INTO v_practice_id, v_review_status, v_red_flag_alert
  FROM public.imaging_studies
  WHERE id = p_study_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Imaging study not found.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_practice_id <> public.current_practice_id() THEN
    RAISE EXCEPTION 'Access denied: Target practice does not match active practice context.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.user_has_practice_role(v_practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist']) THEN
    RAISE EXCEPTION 'Access denied: Only clinical staff can release imaging to patient portal.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_review_status NOT IN ('reviewed', 'amended') THEN
    RAISE EXCEPTION 'Clinical review must be completed before releasing imaging to patient portal.'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.imaging_studies
  SET patient_release_status = 'released_to_portal',
      released_at = clock_timestamp(),
      released_by = v_user_id,
      is_patient_visible = TRUE,
      updated_by = v_user_id,
      updated_at = clock_timestamp()
  WHERE id = p_study_id;

  -- Also release designated study attachments
  UPDATE public.imaging_attachments
  SET is_patient_visible = TRUE
  WHERE study_id = p_study_id
    AND attachment_type IN ('radiology_report_pdf', 'key_image');

  PERFORM public.log_audit_event(
    v_practice_id,
    'imaging.study.released_to_patient',
    'imaging_studies',
    p_study_id,
    jsonb_build_object('released_by', v_user_id, 'release_notes', p_release_notes, 'had_red_flags', v_red_flag_alert),
    'web'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.release_imaging_to_patient FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_imaging_to_patient TO authenticated;

-- RPC 10: get_imaging_attachment_download_url
CREATE OR REPLACE FUNCTION public.get_imaging_attachment_download_url(
  p_attachment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_practice_id UUID;
  v_patient_id UUID;
  v_storage_path TEXT;
  v_file_name TEXT;
  v_mime_type TEXT;
  v_is_patient_visible BOOLEAN;
  v_study_released BOOLEAN;
  v_is_patient_user BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT a.practice_id, a.patient_id, a.storage_path, a.file_name, a.mime_type::TEXT, a.is_patient_visible,
         (s.patient_release_status = 'released_to_portal' AND s.is_patient_visible = TRUE)
  INTO v_practice_id, v_patient_id, v_storage_path, v_file_name, v_mime_type, v_is_patient_visible, v_study_released
  FROM public.imaging_attachments a
  JOIN public.imaging_studies s ON s.id = a.study_id
  WHERE a.id = p_attachment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attachment not found.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_practice_id <> public.current_practice_id() THEN
    RAISE EXCEPTION 'Access denied: Target practice does not match active practice context.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_is_patient_user := public.user_has_practice_role(v_practice_id, ARRAY['patient']);

  IF v_is_patient_user THEN
    IF v_patient_id <> (SELECT id FROM public.patients WHERE practice_id = v_practice_id AND id = v_user_id) THEN
      RAISE EXCEPTION 'Access denied: Cannot access other patient records.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NOT (v_is_patient_visible AND v_study_released) THEN
      RAISE EXCEPTION 'Access denied: Attachment is withheld from patient portal.' USING ERRCODE = 'insufficient_privilege';
    END IF;
  ELSE
    IF NOT public.user_has_practice_role(v_practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']) THEN
      RAISE EXCEPTION 'Access denied: Insufficient privileges.' USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  PERFORM public.log_audit_event(
    v_practice_id,
    'imaging.attachment.downloaded',
    'imaging_attachments',
    p_attachment_id,
    jsonb_build_object('storage_path', v_storage_path, 'file_name', v_file_name),
    'web'
  );

  RETURN jsonb_build_object(
    'attachment_id', p_attachment_id,
    'storage_path', v_storage_path,
    'file_name', v_file_name,
    'mime_type', v_mime_type,
    'expires_in_seconds', 300
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_imaging_attachment_download_url FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_imaging_attachment_download_url TO authenticated;
