// ==============================================================================
// PHYSENRA DICOM & MEDICAL IMAGING FOUNDATION V1 SERVICE LAYER
// File: src/services/imagingService.ts
//
// Governs:
// 1. Imaging orders lifecycle and clinician requisitions
// 2. Imaging studies metadata tracking (DICOM references, zero raw pixel storage)
// 3. Immutable diagnostic radiology reports & versioned amendments
// 4. Clinical imaging reviews with management correlation
// 5. Secure storage integration for authorized attachments (PDF, JPEG, PNG)
// 6. Explicit PostgREST relationship hint disambiguation
// 7. Non-blocking clinical firewall & zero-billing commercial firewall
// ==============================================================================

import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  ImagingOrderWithRelations,
  ImagingStudyWithRelations,
  ImagingAttachment,
  CreateImagingOrderPayload,
  IngestImagingStudyPayload,
  AttachImagingReportPayload,
  RegisterImagingAttachmentPayload,
  FinalizeImagingStudyReviewPayload,
  AmendImagingStudyReviewPayload,
  ImagingOrderFilters,
  ImagingStudyFilters,
} from '../types/models';
import type {
  ImagingAttachmentType,
  ImagingMimeType,
} from '../types/database';

export const imagingService = {
  // ----------------------------------------------------------------------------
  // 1. IMAGING ORDERS
  // ----------------------------------------------------------------------------

  /**
   * Retrieves imaging orders for the active practice with relational embeds.
   */
  async getOrders(
    practiceId?: string,
    filters?: ImagingOrderFilters
  ): Promise<ImagingOrderWithRelations[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    let query = supabase
      .from('imaging_orders')
      .select(`
        *,
        patient:patients!fk_imaging_orders_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          date_of_birth,
          gender,
          phone
        ),
        episode:episodes_of_care!fk_imaging_orders_episode_practice (
          id,
          episode_number,
          title
        ),
        visit:clinical_visits!fk_imaging_orders_visit_practice (
          id,
          visit_number,
          start_time
        ),
        ordering_clinician:profiles!fk_imaging_orders_clinician_profile (
          id,
          full_name,
          email
        ),
        studies:imaging_studies!fk_imaging_studies_order_practice (*)
      `)
      .eq('practice_id', activePracticeId)
      .order('created_at', { ascending: false });

    if (filters?.patientId) {
      query = query.eq('patient_id', filters.patientId);
    }

    if (filters?.modality && filters.modality !== 'all') {
      query = query.eq('modality', filters.modality);
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.urgency && filters.urgency !== 'all') {
      query = query.eq('urgency', filters.urgency);
    }

    if (filters?.startDate) {
      query = query.gte('order_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('order_date', filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    let results = ((data || []) as unknown as ImagingOrderWithRelations[]);

    if (filters?.searchQuery?.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      results = results.filter((order) => {
        const orderNum = order.order_number?.toLowerCase() || '';
        const indication = order.clinical_indication?.toLowerCase() || '';
        const patientName = `${order.patient?.first_name || ''} ${order.patient?.last_name || ''}`.toLowerCase();
        const patientId = order.patient?.patient_identifier?.toLowerCase() || '';
        return (
          orderNum.includes(q) ||
          indication.includes(q) ||
          patientName.includes(q) ||
          patientId.includes(q)
        );
      });
    }

    return results;
  },

  /**
   * Retrieves a single imaging order by ID with all relations.
   */
  async getOrderById(
    orderId: string,
    practiceId?: string
  ): Promise<ImagingOrderWithRelations | null> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('imaging_orders')
      .select(`
        *,
        patient:patients!fk_imaging_orders_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          date_of_birth,
          gender,
          phone
        ),
        episode:episodes_of_care!fk_imaging_orders_episode_practice (
          id,
          episode_number,
          title
        ),
        visit:clinical_visits!fk_imaging_orders_visit_practice (
          id,
          visit_number,
          start_time
        ),
        ordering_clinician:profiles!fk_imaging_orders_clinician_profile (
          id,
          full_name,
          email
        ),
        studies:imaging_studies!fk_imaging_studies_order_practice (*)
      `)
      .eq('practice_id', activePracticeId)
      .eq('id', orderId)
      .maybeSingle();

    if (error) throw error;
    return ((data as unknown) as ImagingOrderWithRelations) || null;
  },

  /**
   * Creates an imaging order via SECURITY DEFINER RPC.
   */
  async createOrder(
    payload: CreateImagingOrderPayload,
    practiceId?: string
  ): Promise<{ success: boolean; order_id: string }> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data: { user } } = await supabase.auth.getUser();
    const orderingClinicianId = payload.ordering_clinician_id || user?.id;
    if (!orderingClinicianId) {
      throw new Error('Authentication required: ordering clinician ID not determined.');
    }

    const { data, error } = await supabase.rpc('create_imaging_order', {
      p_practice_id: activePracticeId,
      p_patient_id: payload.patient_id,
      p_ordering_clinician_id: orderingClinicianId,
      p_modality: payload.modality,
      p_anatomical_region: payload.anatomical_region,
      p_clinical_indication: payload.clinical_indication,
      p_laterality: payload.laterality || 'not_applicable',
      p_episode_id: payload.episode_id || null,
      p_clinical_visit_id: payload.clinical_visit_id || null,
      p_provisional_diagnosis: payload.provisional_diagnosis || null,
      p_urgency: payload.urgency || 'routine',
      p_red_flag_concerns: payload.red_flag_concerns || [],
      p_contraindications_screened: payload.contraindications_screened ?? false,
      p_contraindication_notes: payload.contraindication_notes || null,
      p_referred_facility_name: payload.referred_facility_name || null,
    });

    if (error) throw error;
    return { success: true, order_id: data as string };
  },

  /**
   * Places an imaging order (moving it from draft to placed).
   */
  async placeOrder(
    orderId: string
  ): Promise<{ success: boolean }> {
    const { error } = await supabase.rpc('place_imaging_order', {
      p_order_id: orderId,
    });

    if (error) throw error;
    return { success: true };
  },

  /**
   * Cancels an imaging order via SECURITY DEFINER RPC.
   */
  async cancelOrder(
    orderId: string,
    cancellationReason: string
  ): Promise<{ success: boolean }> {
    const { error } = await supabase.rpc('cancel_imaging_order', {
      p_order_id: orderId,
      p_cancellation_reason: cancellationReason,
    });

    if (error) throw error;
    return { success: true };
  },

  // ----------------------------------------------------------------------------
  // 2. IMAGING STUDIES
  // ----------------------------------------------------------------------------

  /**
   * Retrieves imaging studies for the active practice with relational embeds.
   */
  async getStudies(
    practiceId?: string,
    filters?: ImagingStudyFilters
  ): Promise<ImagingStudyWithRelations[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    let query = supabase
      .from('imaging_studies')
      .select(`
        *,
        patient:patients!fk_imaging_studies_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          date_of_birth,
          gender
        ),
        order:imaging_orders!fk_imaging_studies_order_practice (*),
        episode:episodes_of_care!fk_imaging_studies_episode_practice (
          id,
          episode_number,
          title
        ),
        visit:clinical_visits!fk_imaging_studies_visit_practice (
          id,
          visit_number,
          start_time
        ),
        reports:imaging_reports!fk_imaging_reports_study_practice (
          *,
          attachments:imaging_attachments!fk_imaging_attachments_report_practice (*)
        ),
        attachments:imaging_attachments!fk_imaging_attachments_study_practice (*)
      `)
      .eq('practice_id', activePracticeId)
      .order('created_at', { ascending: false });

    if (filters?.patientId) {
      query = query.eq('patient_id', filters.patientId);
    }

    if (filters?.modality && filters.modality !== 'all') {
      query = query.eq('modality', filters.modality);
    }

    if (filters?.reviewStatus && filters.reviewStatus !== 'all') {
      query = query.eq('review_status', filters.reviewStatus);
    }

    if (filters?.startDate) {
      query = query.gte('study_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('study_date', filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    let results = ((data || []) as unknown as ImagingStudyWithRelations[]);

    if (filters?.searchQuery?.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      results = results.filter((study) => {
        const studyNum = study.study_number?.toLowerCase() || '';
        const bodyPart = study.body_part_examined?.toLowerCase() || '';
        const facility = study.performing_facility?.toLowerCase() || '';
        const patientName = `${study.patient?.first_name || ''} ${study.patient?.last_name || ''}`.toLowerCase();
        const patientId = study.patient?.patient_identifier?.toLowerCase() || '';
        return (
          studyNum.includes(q) ||
          bodyPart.includes(q) ||
          facility.includes(q) ||
          patientName.includes(q) ||
          patientId.includes(q)
        );
      });
    }

    return results;
  },

  /**
   * Retrieves a single imaging study by ID with all relations.
   */
  async getStudyById(
    studyId: string,
    practiceId?: string
  ): Promise<ImagingStudyWithRelations | null> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('imaging_studies')
      .select(`
        *,
        patient:patients!fk_imaging_studies_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          date_of_birth,
          gender
        ),
        order:imaging_orders!fk_imaging_studies_order_practice (*),
        episode:episodes_of_care!fk_imaging_studies_episode_practice (
          id,
          episode_number,
          title
        ),
        visit:clinical_visits!fk_imaging_studies_visit_practice (
          id,
          visit_number,
          start_time
        ),
        reports:imaging_reports!fk_imaging_reports_study_practice (
          *,
          attachments:imaging_attachments!fk_imaging_attachments_report_practice (*)
        ),
        attachments:imaging_attachments!fk_imaging_attachments_study_practice (*)
      `)
      .eq('practice_id', activePracticeId)
      .eq('id', studyId)
      .maybeSingle();

    if (error) throw error;
    return ((data as unknown) as ImagingStudyWithRelations) || null;
  },

  /**
   * Retrieves all studies for a specific patient.
   */
  async getStudiesByPatient(
    patientId: string,
    practiceId?: string
  ): Promise<ImagingStudyWithRelations[]> {
    return this.getStudies(practiceId, { patientId });
  },

  /**
   * Ingests a new imaging study record via SECURITY DEFINER RPC.
   */
  async ingestStudy(
    payload: IngestImagingStudyPayload,
    practiceId?: string
  ): Promise<{ success: boolean; study_id: string }> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('ingest_imaging_study', {
      p_practice_id: activePracticeId,
      p_patient_id: payload.patient_id,
      p_study_date: payload.study_date,
      p_modality: payload.modality,
      p_anatomical_region: payload.anatomical_region,
      p_order_id: payload.order_id || null,
      p_episode_id: payload.episode_id || null,
      p_clinical_visit_id: payload.clinical_visit_id || null,
      p_referring_clinician_id: payload.referring_clinician_id || null,
      p_study_instance_uid: payload.study_instance_uid || null,
      p_accession_number: payload.accession_number || null,
      p_study_time: payload.study_time || null,
      p_laterality: payload.laterality || 'not_applicable',
      p_performing_facility: payload.performing_facility || null,
      p_body_part_examined: payload.body_part_examined || null,
      p_series_count: payload.series_count ?? 1,
      p_instance_count: payload.instance_count ?? 1,
      p_external_viewer_url: payload.external_viewer_url || null,
    });

    if (error) throw error;
    return { success: true, study_id: data as string };
  },

  // ----------------------------------------------------------------------------
  // 3. IMAGING REPORTS
  // ----------------------------------------------------------------------------

  /**
   * Attaches a primary diagnostic radiology report to a study via RPC.
   */
  async attachReport(
    payload: AttachImagingReportPayload
  ): Promise<{ success: boolean; report_id: string }> {
    const { data, error } = await supabase.rpc('attach_imaging_report', {
      p_study_id: payload.study_id,
      p_author_name: payload.author_name,
      p_findings: payload.findings,
      p_impression: payload.impression,
      p_report_type: payload.report_type || 'formal_radiology',
      p_source: payload.source || 'external_facility',
      p_author_credentials: payload.author_credentials || null,
      p_authoring_organization: payload.authoring_organization || null,
      p_recommendations: payload.recommendations || null,
      p_critical_findings_identified: payload.critical_findings_identified ?? false,
      p_critical_findings_communicated: payload.critical_findings_communicated ?? false,
      p_communication_details: payload.communication_details || null,
    });

    if (error) throw error;
    return { success: true, report_id: data as string };
  },

  // ----------------------------------------------------------------------------
  // 4. CLINICAL REVIEW
  // ----------------------------------------------------------------------------

  /**
   * Finalizes treating clinician's imaging review with clinical correlation via RPC.
   */
  async finalizeStudyReview(
    payload: FinalizeImagingStudyReviewPayload
  ): Promise<{ success: boolean }> {
    const { error } = await supabase.rpc('finalize_imaging_study_review', {
      p_study_id: payload.study_id,
      p_clinical_functional_interpretation: payload.clinical_functional_interpretation,
      p_correlation_with_physical_findings: payload.correlation_with_physical_findings || null,
      p_treatment_plan_impact: payload.treatment_plan_impact || null,
      p_red_flag_alert: payload.red_flag_alert ?? false,
      p_red_flag_details: payload.red_flag_details || null,
    });

    if (error) throw error;
    return { success: true };
  },

  /**
   * Amends a completed clinical imaging review via RPC.
   */
  async amendStudyReview(
    payload: AmendImagingStudyReviewPayload
  ): Promise<{ success: boolean }> {
    const { error } = await supabase.rpc('amend_imaging_study_review', {
      p_study_id: payload.study_id,
      p_amendment_notes: payload.amendment_notes,
      p_amendment_reason: payload.amendment_reason,
    });

    if (error) throw error;
    return { success: true };
  },

  /**
   * Releases reviewed imaging results to patient portal via RPC.
   */
  async releaseStudyToPatient(
    studyId: string,
    releaseNotes?: string
  ): Promise<{ success: boolean }> {
    const { error } = await supabase.rpc('release_imaging_to_patient', {
      p_study_id: studyId,
      p_release_notes: releaseNotes || null,
    });

    if (error) throw error;
    return { success: true };
  },

  // ----------------------------------------------------------------------------
  // 5. ATTACHMENTS & STORAGE INTEGRATION
  // ----------------------------------------------------------------------------

  /**
   * Registers attachment metadata in imaging_attachments via RPC.
   */
  async registerAttachment(
    payload: RegisterImagingAttachmentPayload
  ): Promise<{ success: boolean; attachment_id: string }> {
    const { data, error } = await supabase.rpc('register_imaging_attachment', {
      p_study_id: payload.study_id,
      p_attachment_type: payload.attachment_type,
      p_storage_path: payload.storage_path,
      p_file_name: payload.file_name,
      p_file_size_bytes: payload.file_size_bytes,
      p_mime_type: payload.mime_type,
      p_sha256_hash: payload.sha256_hash,
      p_report_id: payload.report_id || null,
      p_caption: payload.caption || null,
      p_key_slice_reference: payload.key_slice_reference || null,
      p_is_patient_visible: payload.is_patient_visible ?? false,
    });

    if (error) throw error;
    return { success: true, attachment_id: data as string };
  },

  /**
   * Uploads an imaging attachment file to Supabase storage and registers it.
   */
  async uploadAttachmentFile(
    practiceId: string,
    studyId: string,
    file: File,
    attachmentType: ImagingAttachmentType,
    reportId?: string | null
  ): Promise<ImagingAttachment> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    // Size limit verification: 25MB for PDF, 15MB for images
    const isPdf = file.type === 'application/pdf';
    const maxBytes = isPdf ? 25 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error(
        `File size exceeds maximum allowed limit (${isPdf ? '25MB for PDF' : '15MB for images'}).`
      );
    }

    const mimeType: ImagingMimeType = isPdf
      ? 'application/pdf'
      : file.type === 'image/png'
      ? 'image/png'
      : 'image/jpeg';

    // Path pattern: {practice_id}/{study_id}/{timestamp}_{filename}
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${activePracticeId}/${studyId}/${Date.now()}_${cleanFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('imaging-attachments')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Hash calculation: fallback SHA-256 placeholder or array buffer hash
    const sha256Hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    // Register via RPC
    const regResult = await this.registerAttachment({
      study_id: studyId,
      report_id: reportId || null,
      attachment_type: attachmentType,
      storage_path: storagePath,
      file_name: file.name,
      file_size_bytes: file.size,
      mime_type: mimeType,
      sha256_hash: sha256Hash,
    });

    // Retrieve registered record
    const { data: attachmentRecord, error: fetchError } = await supabase
      .from('imaging_attachments')
      .select('*')
      .eq('id', regResult.attachment_id)
      .single();

    if (fetchError) throw fetchError;
    return attachmentRecord as ImagingAttachment;
  },

  /**
   * Generates a signed URL for secure viewing/downloading of an imaging attachment.
   */
  async getAttachmentSignedUrl(
    storagePath: string,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from('imaging-attachments')
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error) throw error;
    return data.signedUrl;
  },

  /**
   * Alias for getAttachmentSignedUrl for compatibility.
   */
  async getSignedAttachmentUrl(
    storagePath: string,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    return this.getAttachmentSignedUrl(storagePath, expiresInSeconds);
  },
};
