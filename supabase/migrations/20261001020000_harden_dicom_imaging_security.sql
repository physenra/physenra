-- ==============================================================================
-- PHYSENRA DICOM & MEDICAL IMAGING FOUNDATION V1 SECURITY HARDENING MIGRATION
-- File: supabase/migrations/20261001020000_harden_dicom_imaging_security.sql
--
-- Governs:
-- 1. Storage bucket provisioning: patient-medical-imaging (private, 25MB limit)
-- 2. Storage object policies: Practice-scoped SELECT, INSERT, DELETE on storage.objects
-- 3. Storage path structure & PII sanitization validation in register_imaging_attachment
-- 4. Order state machine direct UPDATE protection & immutability trigger
-- 5. Diagnostic report amendment RPC: amend_imaging_report (SECURITY DEFINER)
-- 6. Signed URL authority & download audit enhancement in get_imaging_attachment_download_url
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. STORAGE BUCKET PROVISIONING: patient-medical-imaging
-- ------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient-medical-imaging',
  'patient-medical-imaging',
  false,
  26214400,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png']::text[];

-- ------------------------------------------------------------------------------
-- 2. STORAGE OBJECT ACCESS POLICIES ON storage.objects
-- ------------------------------------------------------------------------------

-- SELECT: Practice members can access attachments belonging to their practice
DROP POLICY IF EXISTS patient_medical_imaging_select ON storage.objects;
CREATE POLICY patient_medical_imaging_select ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'patient-medical-imaging'
    AND NOT public.is_platform_admin()
    AND (
      (
        split_part(name, '/', 1) = public.current_practice_id()::text
        AND public.user_has_practice_role(public.current_practice_id(), ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist'])
      )
      OR (
        split_part(name, '/', 1) = public.current_practice_id()::text
        AND split_part(name, '/', 2) = (SELECT id::text FROM public.patients WHERE practice_id = public.current_practice_id() AND id = auth.uid())
        AND public.user_has_practice_role(public.current_practice_id(), ARRAY['patient'])
      )
    )
  );

-- INSERT: Clinical staff can upload attachments for their active practice
DROP POLICY IF EXISTS patient_medical_imaging_insert ON storage.objects;
CREATE POLICY patient_medical_imaging_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'patient-medical-imaging'
    AND NOT public.is_platform_admin()
    AND split_part(name, '/', 1) = public.current_practice_id()::text
    AND public.user_has_practice_role(public.current_practice_id(), ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
  );

-- DELETE: Clinical staff can delete objects in their active practice (e.g. compensating cleanup on upload failure)
DROP POLICY IF EXISTS patient_medical_imaging_delete ON storage.objects;
CREATE POLICY patient_medical_imaging_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'patient-medical-imaging'
    AND NOT public.is_platform_admin()
    AND split_part(name, '/', 1) = public.current_practice_id()::text
    AND public.user_has_practice_role(public.current_practice_id(), ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
  );

-- ------------------------------------------------------------------------------
-- 3. HARDENED register_imaging_attachment RPC (PATH STRUCTURE & PII SANITIZATION)
-- ------------------------------------------------------------------------------

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
  v_expected_prefix TEXT;
  v_expected_ext_regex TEXT;
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

  -- Validate storage path strictly conforms to: <practice_id>/<patient_id>/<study_id>/<attachment_uuid>.<extension>
  -- Enforcing complete PII sanitization: zero patient names, zero client original filenames in path
  v_expected_prefix := v_practice_id::TEXT || '/' || v_patient_id::TEXT || '/' || p_study_id::TEXT || '/';
  
  IF p_mime_type = 'application/pdf' THEN
    v_expected_ext_regex := '\.pdf$';
  ELSIF p_mime_type = 'image/jpeg' THEN
    v_expected_ext_regex := '\.(jpe?g)$';
  ELSIF p_mime_type = 'image/png' THEN
    v_expected_ext_regex := '\.png$';
  ELSE
    v_expected_ext_regex := '\.(pdf|jpe?g|png)$';
  END IF;

  IF p_storage_path !~ ('^' || v_expected_prefix || '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}' || v_expected_ext_regex) THEN
    RAISE EXCEPTION 'Invalid storage path: must strictly follow pattern <practice_id>/<patient_id>/<study_id>/<attachment_uuid>.<ext> matching study patient and mime type.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Validate file size bounds
  IF p_mime_type = 'application/pdf' AND p_file_size_bytes > 26214400 THEN
    RAISE EXCEPTION 'PDF file size exceeds maximum limit of 25MB.' USING ERRCODE = 'check_violation';
  ELSIF p_mime_type IN ('image/jpeg', 'image/png') AND p_file_size_bytes > 15728640 THEN
    RAISE EXCEPTION 'Image file size exceeds maximum limit of 15MB.' USING ERRCODE = 'check_violation';
  END IF;

  IF length(trim(p_sha256_hash)) <> 64 OR p_sha256_hash !~ '^[0-9a-fA-F]{64}$' THEN
    RAISE EXCEPTION 'Invalid SHA-256 hash format.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Validate report linkage if supplied
  IF p_report_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.imaging_reports
      WHERE id = p_report_id AND study_id = p_study_id AND practice_id = v_practice_id
    ) THEN
      RAISE EXCEPTION 'Referenced diagnostic report does not exist or belong to this study.'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END IF;

  INSERT INTO public.imaging_attachments (
    practice_id, study_id, patient_id, report_id,
    attachment_type, storage_path, file_name, file_size_bytes,
    mime_type, sha256_hash, caption, key_slice_reference,
    is_patient_visible, uploaded_by, created_by, updated_by
  ) VALUES (
    v_practice_id, p_study_id, v_patient_id, p_report_id,
    p_attachment_type, trim(p_storage_path), trim(p_file_name), p_file_size_bytes,
    p_mime_type, lower(trim(p_sha256_hash)), p_caption, p_key_slice_reference,
    p_is_patient_visible, v_user_id, v_user_id, v_user_id
  ) RETURNING id INTO v_attachment_id;

  PERFORM public.log_audit_event(
    v_practice_id,
    'imaging.attachment.registered',
    'imaging_attachments',
    v_attachment_id,
    jsonb_build_object(
      'study_id', p_study_id,
      'attachment_type', p_attachment_type,
      'storage_path', trim(p_storage_path),
      'mime_type', p_mime_type,
      'file_size_bytes', p_file_size_bytes
    ),
    'web'
  );

  RETURN v_attachment_id;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. ORDER STATE MACHINE DIRECT UPDATE PROTECTION & IMMUTABILITY TRIGGER
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_imaging_order_lifecycle_and_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Strict immutability of identity and relational anchor columns
  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'Cannot modify immutable order ID.' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.practice_id <> OLD.practice_id THEN
    RAISE EXCEPTION 'Cannot transfer imaging orders across practices.' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.order_number <> OLD.order_number THEN
    RAISE EXCEPTION 'Cannot modify immutable order number.' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.patient_id <> OLD.patient_id THEN
    RAISE EXCEPTION 'Cannot reassign imaging order to different patient.' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.ordering_clinician_id <> OLD.ordering_clinician_id THEN
    RAISE EXCEPTION 'Cannot reassign ordering clinician.' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Cannot modify order creator.' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify order creation timestamp.' USING ERRCODE = 'check_violation';
  END IF;

  -- Lifecycle and status state machine guards
  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled imaging orders are immutable and cannot be updated.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Completed imaging orders are immutable and cannot be updated.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.status = 'placed' THEN
    -- In placed status, requisition parameters cannot be mutated in place
    IF NEW.modality <> OLD.modality
       OR NEW.anatomical_region <> OLD.anatomical_region
       OR NEW.clinical_indication <> OLD.clinical_indication
       OR NEW.laterality <> OLD.laterality
       OR NEW.urgency <> OLD.urgency
       OR NEW.episode_id IS DISTINCT FROM OLD.episode_id
       OR NEW.clinical_visit_id IS DISTINCT FROM OLD.clinical_visit_id THEN
      RAISE EXCEPTION 'Cannot mutate clinical requisition parameters of a placed order.'
        USING ERRCODE = 'check_violation';
    END IF;

    -- Allowed transitions from placed: placed -> completed, placed -> cancelled
    IF NEW.status = 'draft' THEN
      RAISE EXCEPTION 'Cannot regress placed imaging order to draft status.'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.status = 'cancelled' AND (NEW.cancellation_reason IS NULL OR length(trim(NEW.cancellation_reason)) = 0) THEN
      RAISE EXCEPTION 'Cancellation reason is mandatory when cancelling a placed order.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF OLD.status = 'draft' THEN
    -- Direct transition draft -> completed is forbidden (must be placed first)
    IF NEW.status = 'completed' THEN
      RAISE EXCEPTION 'Draft imaging orders cannot be completed directly; must be placed first.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_imaging_order_lifecycle ON public.imaging_orders;
CREATE TRIGGER trg_enforce_imaging_order_lifecycle
  BEFORE UPDATE ON public.imaging_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_imaging_order_lifecycle_and_immutability();

-- ------------------------------------------------------------------------------
-- 5. REPORT AMENDMENT RPC: amend_imaging_report
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.amend_imaging_report(
  p_original_report_id UUID,
  p_author_name TEXT,
  p_findings TEXT,
  p_impression TEXT,
  p_amendment_reason TEXT,
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
  v_study_id UUID;
  v_patient_id UUID;
  v_amended_report_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Fetch original report and lock it
  SELECT practice_id, study_id, patient_id
  INTO v_practice_id, v_study_id, v_patient_id
  FROM public.imaging_reports
  WHERE id = p_original_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original diagnostic report not found.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_practice_id <> public.current_practice_id() THEN
    RAISE EXCEPTION 'Access denied: Target practice does not match active practice context.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.user_has_practice_role(v_practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist']) THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges to amend diagnostic radiology reports.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Validate mandatory amendment reason and findings
  IF length(trim(p_amendment_reason)) < 5 THEN
    RAISE EXCEPTION 'Amendment reason must contain at least 5 characters detailing the clinical justification.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF length(trim(p_findings)) < 5 THEN
    RAISE EXCEPTION 'Detailed findings must contain at least 5 characters.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF length(trim(p_impression)) < 5 THEN
    RAISE EXCEPTION 'Impression must contain at least 5 characters.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF length(trim(p_author_name)) = 0 THEN
    RAISE EXCEPTION 'Author name is required.' USING ERRCODE = 'check_violation';
  END IF;

  IF p_critical_findings_identified AND (p_communication_details IS NULL OR length(trim(p_communication_details)) = 0) THEN
    RAISE EXCEPTION 'Communication details are mandatory when critical findings are identified.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Insert amendment report
  INSERT INTO public.imaging_reports (
    practice_id, study_id, patient_id, report_type, source,
    author_name, author_credentials, authoring_organization,
    findings, impression, recommendations,
    critical_findings_identified, critical_findings_communicated,
    communication_details, is_amendment, original_report_id,
    amendment_reason, created_by, updated_by
  ) VALUES (
    v_practice_id, v_study_id, v_patient_id, 'amendment'::public.imaging_report_type, p_source,
    trim(p_author_name), p_author_credentials, p_authoring_organization,
    trim(p_findings), trim(p_impression), p_recommendations,
    p_critical_findings_identified, p_critical_findings_communicated,
    p_communication_details, TRUE, p_original_report_id,
    trim(p_amendment_reason), v_user_id, v_user_id
  ) RETURNING id INTO v_amended_report_id;

  PERFORM public.log_audit_event(
    v_practice_id,
    'imaging.report.amended',
    'imaging_reports',
    v_amended_report_id,
    jsonb_build_object(
      'original_report_id', p_original_report_id,
      'study_id', v_study_id,
      'amendment_reason', trim(p_amendment_reason),
      'author_name', trim(p_author_name)
    ),
    'web'
  );

  RETURN v_amended_report_id;
END;
$$;

REVOKE ALL ON FUNCTION public.amend_imaging_report FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.amend_imaging_report TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. ENHANCE get_imaging_attachment_download_url (BUCKET SPECIFICATION & 300s)
-- ------------------------------------------------------------------------------

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
    jsonb_build_object(
      'bucket', 'patient-medical-imaging',
      'storage_path', v_storage_path,
      'file_name', v_file_name
    ),
    'web'
  );

  RETURN jsonb_build_object(
    'attachment_id', p_attachment_id,
    'bucket', 'patient-medical-imaging',
    'storage_path', v_storage_path,
    'file_name', v_file_name,
    'mime_type', v_mime_type,
    'expires_in_seconds', 300
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_imaging_attachment_download_url FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_imaging_attachment_download_url TO authenticated;
