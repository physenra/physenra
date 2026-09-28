import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  DischargeSummaryInsert,
  DischargeSummaryUpdate,
  DischargeSummaryWithRelations,
  DischargeSummaryFilters,
  DischargeSummaryStatus,
  DischargeReason,
  DischargeDisposition,
  Profile,
  EpisodeOfCare,
  ClinicalVisit,
  TreatmentPlanWithRelations,
  ProgressReviewWithRelations,
  OutcomeMeasureAssessmentWithRelations,
  HomeExerciseProgramWithRelations,
} from '../types/models';

export interface GetDischargeSummariesOptions extends DischargeSummaryFilters {
  page?: number;
  limit?: number;
}

export interface GetDischargeSummariesResult {
  summaries: DischargeSummaryWithRelations[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateDischargeSummaryInput {
  patient_id: string;
  episode_id: string;
  treatment_plan_id?: string | null;
  originating_clinical_visit_id?: string | null;
  final_progress_review_id?: string | null;
  discharging_clinician_id: string;
  discharge_date?: string;
  discharge_reason: DischargeReason;
  discharge_disposition: DischargeDisposition;
  status?: DischargeSummaryStatus;
  clinical_summary: string;
  functional_status_at_discharge: string;
  goal_attainment_summary: string;
  outcome_measure_summary?: string | null;
  treatment_summary?: string | null;
  hep_transition_summary?: string | null;
  recommendations?: string | null;
  follow_up_recommendations?: string | null;
}

export interface UpdateDraftDischargeSummaryInput {
  treatment_plan_id?: string | null;
  originating_clinical_visit_id?: string | null;
  final_progress_review_id?: string | null;
  discharging_clinician_id?: string;
  discharge_date?: string;
  discharge_reason?: DischargeReason;
  discharge_disposition?: DischargeDisposition;
  clinical_summary?: string;
  functional_status_at_discharge?: string;
  goal_attainment_summary?: string;
  outcome_measure_summary?: string | null;
  treatment_summary?: string | null;
  hep_transition_summary?: string | null;
  recommendations?: string | null;
  follow_up_recommendations?: string | null;
}

export interface AmendDischargeSummaryInput {
  amendment_reason: string;
  clinical_summary?: string;
  functional_status_at_discharge?: string;
  goal_attainment_summary?: string;
  outcome_measure_summary?: string | null;
  treatment_summary?: string | null;
  hep_transition_summary?: string | null;
  recommendations?: string | null;
  follow_up_recommendations?: string | null;
}

export interface DischargeEvidenceData {
  episode: EpisodeOfCare;
  treatmentPlan: TreatmentPlanWithRelations | null;
  latestProgressReview: ProgressReviewWithRelations | null;
  outcomeAssessments: OutcomeMeasureAssessmentWithRelations[];
  homeExercisePrograms: HomeExerciseProgramWithRelations[];
  visits: ClinicalVisit[];
}

/**
 * Valid allowed state transitions for Discharge Summary Foundation V1.
 */
export const ALLOWED_DISCHARGE_SUMMARY_TRANSITIONS: Record<
  DischargeSummaryStatus,
  DischargeSummaryStatus[]
> = {
  draft: ['finalized'],
  finalized: ['amended'],
  amended: [],
};

/**
 * Discharge Summary Service: Centralized domain & data layer for Discharge Summary Foundation V1.
 * Strictly enforces tenant isolation, multi-tenant composite foreign keys, PostgREST constraint hints,
 * medical record immutability, atomic episode completion upon finalization, and zero hard deletes.
 */
export const dischargeSummaryService = {
  /**
   * Fetch paginated list of Discharge Summaries for current practice with disambiguated relations.
   */
  async getSummaries(
    options: GetDischargeSummariesOptions = {}
  ): Promise<GetDischargeSummariesResult> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('discharge_summaries')
      .select(
        `
        *,
        patient:patients!fk_discharge_summaries_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_discharge_summaries_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        treatment_plan:treatment_plans!fk_discharge_summaries_plan_patient_episode_practice (
          id,
          plan_identifier,
          title,
          status
        ),
        originating_clinical_visit:clinical_visits!fk_discharge_summaries_visit_patient_practice (
          id,
          visit_identifier,
          status,
          actual_start,
          actual_end
        ),
        final_progress_review:progress_reviews!fk_discharge_summaries_review_patient_episode_practice (
          id,
          review_identifier,
          review_date,
          overall_status
        )
      `,
        { count: 'exact' }
      )
      .eq('practice_id', activePracticeId)
      .order('discharge_date', { ascending: false });

    if (options.patientId) {
      query = query.eq('patient_id', options.patientId);
    }
    if (options.episodeId) {
      query = query.eq('episode_id', options.episodeId);
    }
    if (options.treatmentPlanId) {
      query = query.eq('treatment_plan_id', options.treatmentPlanId);
    }
    if (options.clinicianId) {
      query = query.eq('discharging_clinician_id', options.clinicianId);
    }
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }
    if (options.dischargeReason && options.dischargeReason !== 'all') {
      query = query.eq('discharge_reason', options.dischargeReason);
    }
    if (options.dischargeDisposition && options.dischargeDisposition !== 'all') {
      query = query.eq('discharge_disposition', options.dischargeDisposition);
    }
    if (options.startDate) {
      query = query.gte('discharge_date', options.startDate);
    }
    if (options.endDate) {
      query = query.lte('discharge_date', options.endDate);
    }
    if (options.searchQuery && options.searchQuery.trim()) {
      const term = options.searchQuery.trim();
      query = query.or(
        `summary_identifier.ilike.%${term}%,clinical_summary.ilike.%${term}%,functional_status_at_discharge.ilike.%${term}%`
      );
    }

    const { data: rawSummaries, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to load discharge summaries: ${error.message}`);
    }

    const totalCount = count || 0;
    const summariesList = (rawSummaries || []) as unknown as DischargeSummaryWithRelations[];

    // Fetch clinician profiles for discharging clinician, finalizer, and amender
    const profileIds = Array.from(
      new Set(
        summariesList
          .flatMap((s) => [s.discharging_clinician_id, s.finalized_by, s.amended_by])
          .filter((id): id is string => Boolean(id))
      )
    );

    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, first_name, last_name')
        .in('id', profileIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      for (const summary of summariesList) {
        summary.discharging_clinician = profileMap.get(summary.discharging_clinician_id) || null;
        summary.finalizer = summary.finalized_by ? profileMap.get(summary.finalized_by) || null : null;
        summary.amender = summary.amended_by ? profileMap.get(summary.amended_by) || null : null;
      }
    }

    return {
      summaries: summariesList,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  },

  /**
   * Fetch single Discharge Summary by ID with disambiguated relations and clinician profiles.
   */
  async getSummaryById(id: string): Promise<DischargeSummaryWithRelations | null> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data: rawSummary, error } = await supabase
      .from('discharge_summaries')
      .select(
        `
        *,
        patient:patients!fk_discharge_summaries_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_discharge_summaries_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        treatment_plan:treatment_plans!fk_discharge_summaries_plan_patient_episode_practice (
          id,
          plan_identifier,
          title,
          status
        ),
        originating_clinical_visit:clinical_visits!fk_discharge_summaries_visit_patient_practice (
          id,
          visit_identifier,
          status,
          actual_start,
          actual_end
        ),
        final_progress_review:progress_reviews!fk_discharge_summaries_review_patient_episode_practice (
          id,
          review_identifier,
          review_date,
          overall_status
        )
      `
      )
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load discharge summary: ${error.message}`);
    }

    if (!rawSummary) {
      return null;
    }

    const summary = rawSummary as unknown as DischargeSummaryWithRelations;

    // Fetch clinician profiles
    const profileIds = Array.from(
      new Set(
        [summary.discharging_clinician_id, summary.finalized_by, summary.amended_by].filter(
          (pid): pid is string => Boolean(pid)
        )
      )
    );

    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, first_name, last_name')
        .in('id', profileIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      summary.discharging_clinician = profileMap.get(summary.discharging_clinician_id) || null;
      summary.finalizer = summary.finalized_by ? profileMap.get(summary.finalized_by) || null : null;
      summary.amender = summary.amended_by ? profileMap.get(summary.amended_by) || null : null;
    }

    return summary;
  },

  /**
   * Fetch single Discharge Summary for a specific Episode of Care (at most one per episode).
   */
  async getSummaryByEpisodeId(episodeId: string): Promise<DischargeSummaryWithRelations | null> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data: rawSummary, error } = await supabase
      .from('discharge_summaries')
      .select(
        `
        *,
        patient:patients!fk_discharge_summaries_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_discharge_summaries_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        treatment_plan:treatment_plans!fk_discharge_summaries_plan_patient_episode_practice (
          id,
          plan_identifier,
          title,
          status
        ),
        originating_clinical_visit:clinical_visits!fk_discharge_summaries_visit_patient_practice (
          id,
          visit_identifier,
          status,
          actual_start,
          actual_end
        ),
        final_progress_review:progress_reviews!fk_discharge_summaries_review_patient_episode_practice (
          id,
          review_identifier,
          review_date,
          overall_status
        )
      `
      )
      .eq('episode_id', episodeId)
      .eq('practice_id', activePracticeId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load discharge summary for episode: ${error.message}`);
    }

    if (!rawSummary) {
      return null;
    }

    const summary = rawSummary as unknown as DischargeSummaryWithRelations;

    const profileIds = Array.from(
      new Set(
        [summary.discharging_clinician_id, summary.finalized_by, summary.amended_by].filter(
          (pid): pid is string => Boolean(pid)
        )
      )
    );

    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, first_name, last_name')
        .in('id', profileIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      summary.discharging_clinician = profileMap.get(summary.discharging_clinician_id) || null;
      summary.finalizer = summary.finalized_by ? profileMap.get(summary.finalized_by) || null : null;
      summary.amender = summary.amended_by ? profileMap.get(summary.amended_by) || null : null;
    }

    return summary;
  },

  /**
   * Create a new Discharge Summary (starts in draft by default).
   */
  async createSummary(input: CreateDischargeSummaryInput): Promise<DischargeSummaryWithRelations> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authenticated user required.');
    }

    // Check if an existing summary exists for this episode
    const { data: existingSummary } = await supabase
      .from('discharge_summaries')
      .select('id, summary_identifier')
      .eq('episode_id', input.episode_id)
      .eq('practice_id', activePracticeId)
      .maybeSingle();

    if (existingSummary) {
      throw new Error(
        `A discharge summary (${existingSummary.summary_identifier}) already exists for this episode of care.`
      );
    }

    // Verify parent episode status is not archived
    const { data: episodeData, error: epError } = await supabase
      .from('episodes_of_care')
      .select('status')
      .eq('id', input.episode_id)
      .eq('practice_id', activePracticeId)
      .single();

    if (epError || !episodeData) {
      throw new Error(`Failed to locate episode of care: ${epError?.message || 'Not found'}`);
    }

    if (episodeData.status === 'archived') {
      throw new Error('Cannot create discharge summary for an archived episode of care.');
    }

    // Generate atomic sequential identifier: DS-000001
    const { data: identifier, error: idError } = await supabase.rpc(
      'generate_next_discharge_summary_identifier',
      {
        p_practice_id: activePracticeId,
      }
    );

    if (idError || !identifier) {
      throw new Error(`Failed to generate discharge summary identifier: ${idError?.message || 'Unknown error'}`);
    }

    const targetStatus = input.status || 'draft';
    const now = new Date().toISOString();

    const insertPayload: DischargeSummaryInsert = {
      practice_id: activePracticeId,
      patient_id: input.patient_id,
      episode_id: input.episode_id,
      treatment_plan_id: input.treatment_plan_id || null,
      originating_clinical_visit_id: input.originating_clinical_visit_id || null,
      final_progress_review_id: input.final_progress_review_id || null,
      discharging_clinician_id: input.discharging_clinician_id,
      summary_identifier: identifier,
      discharge_date: input.discharge_date || now.split('T')[0],
      discharge_reason: input.discharge_reason,
      discharge_disposition: input.discharge_disposition,
      status: targetStatus,
      clinical_summary: input.clinical_summary,
      functional_status_at_discharge: input.functional_status_at_discharge,
      goal_attainment_summary: input.goal_attainment_summary,
      outcome_measure_summary: input.outcome_measure_summary || null,
      treatment_summary: input.treatment_summary || null,
      hep_transition_summary: input.hep_transition_summary || null,
      recommendations: input.recommendations || null,
      follow_up_recommendations: input.follow_up_recommendations || null,
      finalized_at: targetStatus === 'finalized' ? now : null,
      finalized_by: targetStatus === 'finalized' ? user.id : null,
      created_by: user.id,
      updated_by: user.id,
    };

    const { data: summaryData, error: summaryError } = await supabase
      .from('discharge_summaries')
      .insert(insertPayload)
      .select('id')
      .single();

    if (summaryError || !summaryData) {
      throw new Error(`Failed to create discharge summary: ${summaryError?.message}`);
    }

    const newSummaryId = summaryData.id;

    // Log immutable audit event
    await supabase.rpc('log_audit_event', {
      p_action: 'discharge_summary.created',
      p_entity_type: 'discharge_summary',
      p_entity_id: newSummaryId,
      p_metadata: {
        identifier,
        patient_id: input.patient_id,
        episode_id: input.episode_id,
        treatment_plan_id: input.treatment_plan_id || null,
        discharge_reason: input.discharge_reason,
        discharge_disposition: input.discharge_disposition,
        status: targetStatus,
      },
    });

    if (targetStatus === 'finalized') {
      await supabase.rpc('log_audit_event', {
        p_action: 'discharge_summary.finalized',
        p_entity_type: 'discharge_summary',
        p_entity_id: newSummaryId,
        p_metadata: {
          identifier,
          finalized_at: now,
          finalized_by: user.id,
          episode_id: input.episode_id,
        },
      });
    }

    const fullSummary = await this.getSummaryById(newSummaryId);
    if (!fullSummary) {
      throw new Error('Created discharge summary could not be retrieved.');
    }
    return fullSummary;
  },

  /**
   * Update an existing draft Discharge Summary.
   */
  async updateDraftSummary(
    id: string,
    input: UpdateDraftDischargeSummaryInput
  ): Promise<DischargeSummaryWithRelations> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authenticated user required.');
    }

    // Verify current status is draft
    const { data: existingSummary, error: fetchError } = await supabase
      .from('discharge_summaries')
      .select('status, summary_identifier')
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .single();

    if (fetchError || !existingSummary) {
      throw new Error(`Discharge summary not found: ${fetchError?.message}`);
    }

    if (existingSummary.status !== 'draft') {
      throw new Error(
        `Cannot edit discharge summary in '${existingSummary.status}' status. Only draft summaries can be edited directly.`
      );
    }

    const updatePayload: DischargeSummaryUpdate = {
      updated_by: user.id,
    };

    if (input.treatment_plan_id !== undefined) updatePayload.treatment_plan_id = input.treatment_plan_id;
    if (input.originating_clinical_visit_id !== undefined)
      updatePayload.originating_clinical_visit_id = input.originating_clinical_visit_id;
    if (input.final_progress_review_id !== undefined)
      updatePayload.final_progress_review_id = input.final_progress_review_id;
    if (input.discharging_clinician_id !== undefined)
      updatePayload.discharging_clinician_id = input.discharging_clinician_id;
    if (input.discharge_date !== undefined) updatePayload.discharge_date = input.discharge_date;
    if (input.discharge_reason !== undefined) updatePayload.discharge_reason = input.discharge_reason;
    if (input.discharge_disposition !== undefined)
      updatePayload.discharge_disposition = input.discharge_disposition;
    if (input.clinical_summary !== undefined) updatePayload.clinical_summary = input.clinical_summary;
    if (input.functional_status_at_discharge !== undefined)
      updatePayload.functional_status_at_discharge = input.functional_status_at_discharge;
    if (input.goal_attainment_summary !== undefined)
      updatePayload.goal_attainment_summary = input.goal_attainment_summary;
    if (input.outcome_measure_summary !== undefined)
      updatePayload.outcome_measure_summary = input.outcome_measure_summary;
    if (input.treatment_summary !== undefined) updatePayload.treatment_summary = input.treatment_summary;
    if (input.hep_transition_summary !== undefined)
      updatePayload.hep_transition_summary = input.hep_transition_summary;
    if (input.recommendations !== undefined) updatePayload.recommendations = input.recommendations;
    if (input.follow_up_recommendations !== undefined)
      updatePayload.follow_up_recommendations = input.follow_up_recommendations;

    const { error: updateError } = await supabase
      .from('discharge_summaries')
      .update(updatePayload)
      .eq('id', id)
      .eq('practice_id', activePracticeId);

    if (updateError) {
      throw new Error(`Failed to update draft discharge summary: ${updateError.message}`);
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_action: 'discharge_summary.updated',
      p_entity_type: 'discharge_summary',
      p_entity_id: id,
      p_metadata: {
        identifier: existingSummary.summary_identifier,
        updated_fields: Object.keys(updatePayload),
      },
    });

    const fullSummary = await this.getSummaryById(id);
    if (!fullSummary) {
      throw new Error('Updated discharge summary could not be retrieved.');
    }
    return fullSummary;
  },

  /**
   * Finalize a draft Discharge Summary.
   * Atomically triggers completion of the parent Episode of Care via DB trigger.
   */
  async finalizeSummary(id: string): Promise<DischargeSummaryWithRelations> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authenticated user required.');
    }

    const { data: existingSummary, error: fetchError } = await supabase
      .from('discharge_summaries')
      .select('status, summary_identifier, episode_id')
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .single();

    if (fetchError || !existingSummary) {
      throw new Error(`Discharge summary not found: ${fetchError?.message}`);
    }

    if (existingSummary.status !== 'draft') {
      throw new Error(
        `Cannot finalize discharge summary in '${existingSummary.status}' status. Only draft summaries can be finalized.`
      );
    }

    const now = new Date().toISOString();
    const updatePayload: DischargeSummaryUpdate = {
      status: 'finalized',
      finalized_at: now,
      finalized_by: user.id,
      updated_by: user.id,
    };

    const { error: updateError } = await supabase
      .from('discharge_summaries')
      .update(updatePayload)
      .eq('id', id)
      .eq('practice_id', activePracticeId);

    if (updateError) {
      throw new Error(`Failed to finalize discharge summary: ${updateError.message}`);
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_action: 'discharge_summary.finalized',
      p_entity_type: 'discharge_summary',
      p_entity_id: id,
      p_metadata: {
        identifier: existingSummary.summary_identifier,
        finalized_at: now,
        finalized_by: user.id,
        episode_id: existingSummary.episode_id,
      },
    });

    const fullSummary = await this.getSummaryById(id);
    if (!fullSummary) {
      throw new Error('Finalized discharge summary could not be retrieved.');
    }
    return fullSummary;
  },

  /**
   * Formally amend a finalized Discharge Summary.
   * Medical record law requires mandatory amendment reason and preserves original finalized provenance.
   */
  async amendSummary(
    id: string,
    input: AmendDischargeSummaryInput
  ): Promise<DischargeSummaryWithRelations> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authenticated user required.');
    }

    if (!input.amendment_reason || !input.amendment_reason.trim()) {
      throw new Error('A non-empty amendment reason is strictly required.');
    }

    const { data: existingSummary, error: fetchError } = await supabase
      .from('discharge_summaries')
      .select('status, summary_identifier')
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .single();

    if (fetchError || !existingSummary) {
      throw new Error(`Discharge summary not found: ${fetchError?.message}`);
    }

    if (existingSummary.status !== 'finalized') {
      throw new Error(
        `Cannot amend discharge summary in '${existingSummary.status}' status. Only finalized summaries can be amended.`
      );
    }

    const now = new Date().toISOString();
    const updatePayload: DischargeSummaryUpdate = {
      status: 'amended',
      amendment_reason: input.amendment_reason.trim(),
      amended_at: now,
      amended_by: user.id,
      updated_by: user.id,
    };

    if (input.clinical_summary !== undefined) updatePayload.clinical_summary = input.clinical_summary;
    if (input.functional_status_at_discharge !== undefined)
      updatePayload.functional_status_at_discharge = input.functional_status_at_discharge;
    if (input.goal_attainment_summary !== undefined)
      updatePayload.goal_attainment_summary = input.goal_attainment_summary;
    if (input.outcome_measure_summary !== undefined)
      updatePayload.outcome_measure_summary = input.outcome_measure_summary;
    if (input.treatment_summary !== undefined) updatePayload.treatment_summary = input.treatment_summary;
    if (input.hep_transition_summary !== undefined)
      updatePayload.hep_transition_summary = input.hep_transition_summary;
    if (input.recommendations !== undefined) updatePayload.recommendations = input.recommendations;
    if (input.follow_up_recommendations !== undefined)
      updatePayload.follow_up_recommendations = input.follow_up_recommendations;

    const { error: updateError } = await supabase
      .from('discharge_summaries')
      .update(updatePayload)
      .eq('id', id)
      .eq('practice_id', activePracticeId);

    if (updateError) {
      throw new Error(`Failed to amend discharge summary: ${updateError.message}`);
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_action: 'discharge_summary.amended',
      p_entity_type: 'discharge_summary',
      p_entity_id: id,
      p_metadata: {
        identifier: existingSummary.summary_identifier,
        amendment_reason: input.amendment_reason.trim(),
        amended_at: now,
        amended_by: user.id,
      },
    });

    const fullSummary = await this.getSummaryById(id);
    if (!fullSummary) {
      throw new Error('Amended discharge summary could not be retrieved.');
    }
    return fullSummary;
  },

  /**
   * Delete a draft Discharge Summary.
   * Finalized or amended summaries CANNOT be deleted (enforced by DB trigger).
   */
  async deleteDraftSummary(id: string): Promise<void> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data: existingSummary, error: fetchError } = await supabase
      .from('discharge_summaries')
      .select('status, summary_identifier')
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .single();

    if (fetchError || !existingSummary) {
      throw new Error(`Discharge summary not found: ${fetchError?.message}`);
    }

    if (existingSummary.status !== 'draft') {
      throw new Error(
        `Cannot delete discharge summary in '${existingSummary.status}' status. Only draft summaries can be removed.`
      );
    }

    const { error: deleteError } = await supabase
      .from('discharge_summaries')
      .delete()
      .eq('id', id)
      .eq('practice_id', activePracticeId);

    if (deleteError) {
      throw new Error(`Failed to delete draft discharge summary: ${deleteError.message}`);
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_action: 'discharge_summary.deleted',
      p_entity_type: 'discharge_summary',
      p_entity_id: id,
      p_metadata: {
        identifier: existingSummary.summary_identifier,
      },
    });
  },

  // --------------------------------------------------------------------------
  // Helper Queries for Discharge Synthesis & Clinical Workflows
  // --------------------------------------------------------------------------

  /**
   * Gather comprehensive clinical evidence for an Episode of Care to aid in discharge summary composition:
   * 1. Episode with Patient details
   * 2. Treatment Plan with clinical goals
   * 3. Latest Progress Review with goal status
   * 4. Outcome Measure Assessments
   * 5. Home Exercise Programs
   * 6. Clinical Visits
   */
  async getDischargeEvidence(episodeId: string): Promise<DischargeEvidenceData> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    // 1. Episode of Care
    const { data: episode, error: epError } = await supabase
      .from('episodes_of_care')
      .select('*')
      .eq('id', episodeId)
      .eq('practice_id', activePracticeId)
      .single();

    if (epError || !episode) {
      throw new Error(`Episode of care not found: ${epError?.message}`);
    }

    // 2. Treatment Plan for Episode (active or latest)
    const { data: plans } = await supabase
      .from('treatment_plans')
      .select(
        `
        *,
        goals:treatment_plan_goals!fk_tp_goals_plan_practice (
          id,
          order_index,
          goal_statement,
          category,
          baseline_description,
          target_description,
          measurement_method,
          priority,
          status
        )
      `
      )
      .eq('episode_id', episodeId)
      .eq('practice_id', activePracticeId)
      .order('created_at', { ascending: false });

    const activePlan = (plans || []).find((p) => p.status === 'active') || plans?.[0] || null;

    // 3. Latest Progress Review for Episode
    const { data: reviews } = await supabase
      .from('progress_reviews')
      .select(
        `
        *,
        goals:progress_review_goals!fk_progress_review_goals_review (
          id,
          treatment_plan_goal_id,
          status_at_review,
          current_value,
          measurement_method,
          clinician_assessment,
          progress_notes
        )
      `
      )
      .eq('episode_id', episodeId)
      .eq('practice_id', activePracticeId)
      .order('review_date', { ascending: false })
      .limit(1);

    const latestProgressReview = (reviews?.[0] || null) as unknown as ProgressReviewWithRelations | null;

    // 4. Outcome Assessments for Patient
    const { data: outcomes } = await supabase
      .from('outcome_measure_assessments')
      .select(
        `
        *,
        definition:outcome_measure_definitions!fk_outcome_assessments_definition (
          id,
          name,
          code,
          score_unit,
          category
        )
      `
      )
      .eq('patient_id', episode.patient_id)
      .eq('practice_id', activePracticeId)
      .order('performed_at', { ascending: false });

    // 5. Home Exercise Programs for Episode
    const { data: heps } = await supabase
      .from('home_exercise_programs')
      .select(
        `
        *,
        items:home_exercise_program_items!fk_hep_items_program (
          id,
          order_index,
          sets,
          reps,
          frequency,
          instructions,
          exercise:exercises!fk_hep_items_exercise (
            id,
            name,
            code,
            category
          )
        )
      `
      )
      .eq('episode_id', episodeId)
      .eq('practice_id', activePracticeId)
      .order('created_at', { ascending: false });

    // 6. Clinical Visits for Episode
    const { data: visits } = await supabase
      .from('clinical_visits')
      .select('*')
      .eq('episode_id', episodeId)
      .eq('practice_id', activePracticeId)
      .order('actual_start', { ascending: false });

    return {
      episode,
      treatmentPlan: (activePlan || null) as unknown as TreatmentPlanWithRelations | null,
      latestProgressReview,
      outcomeAssessments: (outcomes || []) as unknown as OutcomeMeasureAssessmentWithRelations[],
      homeExercisePrograms: (heps || []) as unknown as HomeExerciseProgramWithRelations[],
      visits: (visits || []) as ClinicalVisit[],
    };
  },

  /**
   * Fetch active clinical staff profiles for discharging clinician selection.
   */
  async getClinicians(): Promise<Profile[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data: memberships, error: memError } = await supabase
      .from('practice_memberships')
      .select('user_id')
      .eq('practice_id', activePracticeId)
      .eq('status', 'active')
      .in('role', ['practice_owner', 'practice_manager', 'physiotherapist']);

    if (memError) {
      throw new Error(`Failed to fetch clinicians: ${memError.message}`);
    }

    const userIds = (memberships || []).map((m) => m.user_id);
    if (userIds.length === 0) return [];

    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)
      .order('last_name', { ascending: true });

    if (profError) {
      throw new Error(`Failed to fetch clinician profiles: ${profError.message}`);
    }

    return (profiles || []) as Profile[];
  },

  /**
   * Fetch eligible episodes for creating a discharge summary.
   * Only active or paused episodes that do not yet have a discharge summary.
   */
  async getDischargeableEpisodes(): Promise<
    (EpisodeOfCare & { patient?: { id: string; patient_identifier: string; first_name: string; last_name: string } })[]
  > {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    // Fetch episodes that are active or paused
    const { data: episodes, error: epError } = await supabase
      .from('episodes_of_care')
      .select(
        `
        *,
        patient:patients!fk_episodes_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name
        )
      `
      )
      .eq('practice_id', activePracticeId)
      .in('status', ['active', 'paused'])
      .order('start_date', { ascending: false });

    if (epError) {
      throw new Error(`Failed to fetch episodes: ${epError.message}`);
    }

    if (!episodes || episodes.length === 0) {
      return [];
    }

    // Fetch existing discharge summary episode IDs
    const { data: existingSummaries } = await supabase
      .from('discharge_summaries')
      .select('episode_id')
      .eq('practice_id', activePracticeId);

    const existingEpIds = new Set((existingSummaries || []).map((s) => s.episode_id));

    return (episodes as any[]).filter((e) => !existingEpIds.has(e.id));
  },
};
