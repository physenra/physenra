import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  ProgressReviewInsert,
  ProgressReviewUpdate,
  ProgressReviewGoalInsert,
  ProgressReviewWithRelations,
  ProgressReviewFilters,
  ProgressReviewStatus,
  OverallProgressRating,
  ProgressReviewPlanRecommendation,
  GoalProgressStatus,
  Profile,
  EpisodeOfCare,
  ClinicalVisit,
  TreatmentPlanWithRelations,
  OutcomeMeasureAssessmentWithRelations,
} from '../types/models';

export interface GetProgressReviewsOptions extends ProgressReviewFilters {
  page?: number;
  limit?: number;
}

export interface GetProgressReviewsResult {
  reviews: ProgressReviewWithRelations[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProgressReviewGoalInput {
  treatment_plan_goal_id: string;
  status_at_review: GoalProgressStatus;
  current_value?: string | null;
  measurement_method?: string | null;
  clinician_assessment: string;
  progress_notes?: string | null;
  linked_outcome_assessment_id?: string | null;
}

export interface CreateProgressReviewInput {
  patient_id: string;
  episode_id: string;
  treatment_plan_id: string;
  originating_clinical_visit_id?: string | null;
  reviewing_clinician_id: string;
  review_date?: string;
  period_start_date?: string | null;
  period_end_date?: string | null;
  overall_status?: ProgressReviewStatus;
  overall_progress_assessment: OverallProgressRating;
  clinical_summary: string;
  barriers_identified?: string | null;
  treatment_modifications?: string | null;
  plan_recommendation: ProgressReviewPlanRecommendation;
  next_review_due_date?: string | null;
  goals?: ProgressReviewGoalInput[];
}

export interface UpdateDraftProgressReviewInput {
  review_date?: string;
  period_start_date?: string | null;
  period_end_date?: string | null;
  originating_clinical_visit_id?: string | null;
  reviewing_clinician_id?: string;
  overall_progress_assessment?: OverallProgressRating;
  clinical_summary?: string;
  barriers_identified?: string | null;
  treatment_modifications?: string | null;
  plan_recommendation?: ProgressReviewPlanRecommendation;
  next_review_due_date?: string | null;
  goals?: ProgressReviewGoalInput[];
}

export interface AmendProgressReviewInput {
  amendment_reason: string;
  clinical_summary?: string;
  barriers_identified?: string | null;
  treatment_modifications?: string | null;
  overall_progress_assessment?: OverallProgressRating;
  plan_recommendation?: ProgressReviewPlanRecommendation;
  next_review_due_date?: string | null;
  goals?: ProgressReviewGoalInput[];
}

/**
 * Valid allowed state transitions for Milestone & Progress Review Foundation V1.
 */
export const ALLOWED_PROGRESS_REVIEW_TRANSITIONS: Record<ProgressReviewStatus, ProgressReviewStatus[]> = {
  draft: ['finalized'],
  finalized: ['amended'],
  amended: [],
};

/**
 * Progress Review Service: Centralized domain & data layer for Milestone & Progress Review Foundation V1.
 * Strictly enforces tenant isolation, multi-tenant composite foreign keys, PostgREST constraint hints,
 * medical record immutability, and zero hard deletes for finalized reviews.
 */
export const progressReviewService = {
  /**
   * Fetch paginated list of Progress Reviews for current practice with disambiguated relations.
   */
  async getReviews(options: GetProgressReviewsOptions = {}): Promise<GetProgressReviewsResult> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('progress_reviews')
      .select(
        `
        *,
        patient:patients!fk_progress_reviews_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_progress_reviews_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        treatment_plan:treatment_plans!fk_progress_reviews_plan_patient_episode_practice (
          id,
          plan_identifier,
          title,
          status,
          start_date,
          target_review_date
        ),
        originating_clinical_visit:clinical_visits!fk_progress_reviews_visit_patient_practice (
          id,
          visit_identifier,
          status,
          actual_start,
          actual_end
        )
      `,
        { count: 'exact' }
      )
      .eq('practice_id', activePracticeId)
      .order('review_date', { ascending: false });

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
      query = query.eq('reviewing_clinician_id', options.clinicianId);
    }
    if (options.status && options.status !== 'all') {
      query = query.eq('overall_status', options.status);
    }
    if (options.startDate) {
      query = query.gte('review_date', options.startDate);
    }
    if (options.endDate) {
      query = query.lte('review_date', options.endDate);
    }
    if (options.searchQuery && options.searchQuery.trim()) {
      const term = options.searchQuery.trim();
      query = query.or(`review_identifier.ilike.%${term}%,clinical_summary.ilike.%${term}%`);
    }

    const { data: rawReviews, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to load progress reviews: ${error.message}`);
    }

    const totalCount = count || 0;
    const reviewsList = (rawReviews || []) as unknown as ProgressReviewWithRelations[];

    // Fetch clinician profiles for reviewing clinician, finalizer, and amender
    const profileIds = Array.from(
      new Set(
        reviewsList
          .flatMap((r) => [r.reviewing_clinician_id, r.finalized_by, r.amended_by])
          .filter((id): id is string => Boolean(id))
      )
    );

    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, first_name, last_name')
        .in('id', profileIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      for (const review of reviewsList) {
        review.reviewing_clinician = profileMap.get(review.reviewing_clinician_id) || null;
        review.finalizer = review.finalized_by ? profileMap.get(review.finalized_by) || null : null;
        review.amender = review.amended_by ? profileMap.get(review.amended_by) || null : null;
      }
    }

    return {
      reviews: reviewsList,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  },

  /**
   * Fetch single Progress Review by ID with fully populated goal reviews and relations.
   */
  async getReviewById(id: string): Promise<ProgressReviewWithRelations | null> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data: rawReview, error } = await supabase
      .from('progress_reviews')
      .select(
        `
        *,
        patient:patients!fk_progress_reviews_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_progress_reviews_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        treatment_plan:treatment_plans!fk_progress_reviews_plan_patient_episode_practice (
          id,
          plan_identifier,
          title,
          status,
          start_date,
          target_review_date
        ),
        originating_clinical_visit:clinical_visits!fk_progress_reviews_visit_patient_practice (
          id,
          visit_identifier,
          status,
          actual_start,
          actual_end
        ),
        goals:progress_review_goals!fk_prg_goals_review_practice (
          *,
          treatment_plan_goal:treatment_plan_goals!fk_prg_goals_goal_practice (
            id,
            order_index,
            goal_statement,
            category,
            baseline_description,
            target_description,
            measurement_method,
            priority,
            status
          ),
          linked_outcome_assessment:outcome_measure_assessments!fk_prg_goals_outcome_assessment (
            id,
            assessment_identifier,
            assessment_type,
            numeric_score,
            assessment_status,
            performed_at,
            definition:outcome_measure_definitions!fk_outcome_assessments_definition (
              id,
              name,
              code,
              unit
            )
          )
        )
      `
      )
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load progress review: ${error.message}`);
    }

    if (!rawReview) {
      return null;
    }

    const review = rawReview as unknown as ProgressReviewWithRelations;

    // Fetch clinician profiles
    const profileIds = [review.reviewing_clinician_id, review.finalized_by, review.amended_by].filter(
      (pId): pId is string => Boolean(pId)
    );

    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, first_name, last_name')
        .in('id', profileIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      review.reviewing_clinician = profileMap.get(review.reviewing_clinician_id) || null;
      review.finalizer = review.finalized_by ? profileMap.get(review.finalized_by) || null : null;
      review.amender = review.amended_by ? profileMap.get(review.amended_by) || null : null;
    }

    return review;
  },

  /**
   * Create a new Progress Review in draft state with evaluated goals.
   */
  async createReview(input: CreateProgressReviewInput): Promise<ProgressReviewWithRelations> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication required.');
    }

    // Generate atomic sequential human-readable identifier
    const { data: identifier, error: idError } = await supabase.rpc(
      'generate_next_progress_review_identifier',
      { p_practice_id: activePracticeId }
    );

    if (idError || !identifier) {
      throw new Error(`Failed to generate review identifier: ${idError?.message || 'Unknown error'}`);
    }

    const insertPayload: ProgressReviewInsert = {
      practice_id: activePracticeId,
      patient_id: input.patient_id,
      episode_id: input.episode_id,
      treatment_plan_id: input.treatment_plan_id,
      originating_clinical_visit_id: input.originating_clinical_visit_id || null,
      reviewing_clinician_id: input.reviewing_clinician_id,
      review_identifier: identifier,
      review_date: input.review_date || new Date().toISOString().split('T')[0],
      period_start_date: input.period_start_date || null,
      period_end_date: input.period_end_date || null,
      overall_status: input.overall_status || 'draft',
      overall_progress_assessment: input.overall_progress_assessment,
      clinical_summary: input.clinical_summary,
      barriers_identified: input.barriers_identified || null,
      treatment_modifications: input.treatment_modifications || null,
      plan_recommendation: input.plan_recommendation,
      next_review_due_date: input.next_review_due_date || null,
      created_by: user.id,
      updated_by: user.id,
    };

    const { data: reviewData, error: reviewError } = await supabase
      .from('progress_reviews')
      .insert(insertPayload)
      .select('id')
      .single();

    if (reviewError || !reviewData) {
      throw new Error(`Failed to create progress review: ${reviewError?.message}`);
    }

    const newReviewId = reviewData.id;

    // Insert associated goal progress reviews if provided
    if (input.goals && input.goals.length > 0) {
      const goalsPayload: ProgressReviewGoalInsert[] = input.goals.map((g) => ({
        practice_id: activePracticeId,
        progress_review_id: newReviewId,
        treatment_plan_goal_id: g.treatment_plan_goal_id,
        status_at_review: g.status_at_review,
        current_value: g.current_value || null,
        measurement_method: g.measurement_method || null,
        clinician_assessment: g.clinician_assessment,
        progress_notes: g.progress_notes || null,
        linked_outcome_assessment_id: g.linked_outcome_assessment_id || null,
      }));

      const { error: goalsError } = await supabase
        .from('progress_review_goals')
        .insert(goalsPayload);

      if (goalsError) {
        // Rollback created draft review
        await supabase.from('progress_reviews').delete().eq('id', newReviewId);
        throw new Error(`Failed to save goal reviews: ${goalsError.message}`);
      }
    }

    // Log immutable audit event
    await supabase.rpc('log_audit_event', {
      p_action: 'progress_review.created',
      p_entity_type: 'progress_review',
      p_entity_id: newReviewId,
      p_metadata: {
        identifier,
        patient_id: input.patient_id,
        episode_id: input.episode_id,
        treatment_plan_id: input.treatment_plan_id,
        status: insertPayload.overall_status,
        goals_count: input.goals?.length || 0,
      },
    });

    const fullReview = await this.getReviewById(newReviewId);
    if (!fullReview) {
      throw new Error('Created review could not be retrieved.');
    }
    return fullReview;
  },

  /**
   * Update an existing draft Progress Review.
   */
  async updateDraftReview(
    id: string,
    input: UpdateDraftProgressReviewInput
  ): Promise<ProgressReviewWithRelations> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication required.');
    }

    // Verify current status is draft
    const { data: existingReview, error: checkError } = await supabase
      .from('progress_reviews')
      .select('overall_status')
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .single();

    if (checkError || !existingReview) {
      throw new Error('Progress review not found.');
    }

    if (existingReview.overall_status !== 'draft') {
      throw new Error(
        `Cannot update review in '${existingReview.overall_status}' status. Only draft reviews can be edited directly.`
      );
    }

    const updatePayload: ProgressReviewUpdate = {
      updated_by: user.id,
    };

    if (input.review_date !== undefined) updatePayload.review_date = input.review_date;
    if (input.period_start_date !== undefined) updatePayload.period_start_date = input.period_start_date;
    if (input.period_end_date !== undefined) updatePayload.period_end_date = input.period_end_date;
    if (input.originating_clinical_visit_id !== undefined)
      updatePayload.originating_clinical_visit_id = input.originating_clinical_visit_id;
    if (input.reviewing_clinician_id !== undefined)
      updatePayload.reviewing_clinician_id = input.reviewing_clinician_id;
    if (input.overall_progress_assessment !== undefined)
      updatePayload.overall_progress_assessment = input.overall_progress_assessment;
    if (input.clinical_summary !== undefined) updatePayload.clinical_summary = input.clinical_summary;
    if (input.barriers_identified !== undefined) updatePayload.barriers_identified = input.barriers_identified;
    if (input.treatment_modifications !== undefined)
      updatePayload.treatment_modifications = input.treatment_modifications;
    if (input.plan_recommendation !== undefined)
      updatePayload.plan_recommendation = input.plan_recommendation;
    if (input.next_review_due_date !== undefined)
      updatePayload.next_review_due_date = input.next_review_due_date;

    const { error: updateError } = await supabase
      .from('progress_reviews')
      .update(updatePayload)
      .eq('id', id)
      .eq('practice_id', activePracticeId);

    if (updateError) {
      throw new Error(`Failed to update progress review: ${updateError.message}`);
    }

    // If goals are specified, replace draft goal reviews
    if (input.goals) {
      await supabase
        .from('progress_review_goals')
        .delete()
        .eq('progress_review_id', id)
        .eq('practice_id', activePracticeId);

      if (input.goals.length > 0) {
        const goalsPayload: ProgressReviewGoalInsert[] = input.goals.map((g) => ({
          practice_id: activePracticeId,
          progress_review_id: id,
          treatment_plan_goal_id: g.treatment_plan_goal_id,
          status_at_review: g.status_at_review,
          current_value: g.current_value || null,
          measurement_method: g.measurement_method || null,
          clinician_assessment: g.clinician_assessment,
          progress_notes: g.progress_notes || null,
          linked_outcome_assessment_id: g.linked_outcome_assessment_id || null,
        }));

        const { error: goalsError } = await supabase
          .from('progress_review_goals')
          .insert(goalsPayload);

        if (goalsError) {
          throw new Error(`Failed to update goal reviews: ${goalsError.message}`);
        }
      }
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_action: 'progress_review.updated',
      p_entity_type: 'progress_review',
      p_entity_id: id,
      p_metadata: {
        updated_fields: Object.keys(updatePayload),
        goals_updated: Boolean(input.goals),
      },
    });

    const fullReview = await this.getReviewById(id);
    if (!fullReview) {
      throw new Error('Updated review could not be retrieved.');
    }
    return fullReview;
  },

  /**
   * Delete a draft Progress Review.
   * Finalized and amended reviews are protected by triggers and RLS against deletion.
   */
  async deleteDraftReview(id: string): Promise<void> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data: existingReview, error: checkError } = await supabase
      .from('progress_reviews')
      .select('overall_status, review_identifier')
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .single();

    if (checkError || !existingReview) {
      throw new Error('Progress review not found.');
    }

    if (existingReview.overall_status !== 'draft') {
      throw new Error('Cannot delete finalized or amended progress reviews. Medical records are immutable.');
    }

    const { error: deleteError } = await supabase
      .from('progress_reviews')
      .delete()
      .eq('id', id)
      .eq('practice_id', activePracticeId);

    if (deleteError) {
      throw new Error(`Failed to delete progress review: ${deleteError.message}`);
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'progress_review.deleted',
      p_entity_type: 'progress_review',
      p_entity_id: id,
      p_metadata: {
        identifier: existingReview.review_identifier,
        status: existingReview.overall_status,
      },
    });
  },

  /**
   * Finalize a draft Progress Review.
   * Once finalized, core clinical review fields and goal reviews become immutable.
   */
  async finalizeReview(id: string): Promise<ProgressReviewWithRelations> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication required.');
    }

    // Verify current status
    const { data: existingReview, error: checkError } = await supabase
      .from('progress_reviews')
      .select('overall_status, review_identifier')
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .single();

    if (checkError || !existingReview) {
      throw new Error('Progress review not found.');
    }

    if (existingReview.overall_status !== 'draft') {
      throw new Error(`Cannot finalize progress review in '${existingReview.overall_status}' status.`);
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('progress_reviews')
      .update({
        overall_status: 'finalized',
        finalized_at: now,
        finalized_by: user.id,
        updated_by: user.id,
      })
      .eq('id', id)
      .eq('practice_id', activePracticeId);

    if (updateError) {
      throw new Error(`Failed to finalize progress review: ${updateError.message}`);
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'progress_review.finalized',
      p_entity_type: 'progress_review',
      p_entity_id: id,
      p_metadata: {
        identifier: existingReview.review_identifier,
        finalized_at: now,
        finalized_by: user.id,
      },
    });

    const fullReview = await this.getReviewById(id);
    if (!fullReview) {
      throw new Error('Finalized review could not be retrieved.');
    }
    return fullReview;
  },

  /**
   * Create a controlled amendment for a finalized Progress Review.
   * Requires non-empty clinical justification.
   */
  async amendReview(id: string, input: AmendProgressReviewInput): Promise<ProgressReviewWithRelations> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication required.');
    }

    if (!input.amendment_reason || !input.amendment_reason.trim()) {
      throw new Error('Amendment reason is mandatory for clinical record integrity.');
    }

    const { data: existingReview, error: checkError } = await supabase
      .from('progress_reviews')
      .select('overall_status, review_identifier, finalized_at, finalized_by')
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .single();

    if (checkError || !existingReview) {
      throw new Error('Progress review not found.');
    }

    if (existingReview.overall_status !== 'finalized' && existingReview.overall_status !== 'amended') {
      throw new Error(
        `Cannot amend review in '${existingReview.overall_status}' status. Only finalized reviews can be amended.`
      );
    }

    const now = new Date().toISOString();
    const updatePayload: ProgressReviewUpdate = {
      overall_status: 'amended',
      amendment_reason: input.amendment_reason.trim(),
      amended_at: now,
      amended_by: user.id,
      updated_by: user.id,
    };

    if (input.clinical_summary !== undefined) updatePayload.clinical_summary = input.clinical_summary;
    if (input.barriers_identified !== undefined) updatePayload.barriers_identified = input.barriers_identified;
    if (input.treatment_modifications !== undefined)
      updatePayload.treatment_modifications = input.treatment_modifications;
    if (input.overall_progress_assessment !== undefined)
      updatePayload.overall_progress_assessment = input.overall_progress_assessment;
    if (input.plan_recommendation !== undefined)
      updatePayload.plan_recommendation = input.plan_recommendation;
    if (input.next_review_due_date !== undefined)
      updatePayload.next_review_due_date = input.next_review_due_date;

    const { error: updateError } = await supabase
      .from('progress_reviews')
      .update(updatePayload)
      .eq('id', id)
      .eq('practice_id', activePracticeId);

    if (updateError) {
      throw new Error(`Failed to amend progress review: ${updateError.message}`);
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_action: 'progress_review.amended',
      p_entity_type: 'progress_review',
      p_entity_id: id,
      p_metadata: {
        identifier: existingReview.review_identifier,
        amendment_reason: input.amendment_reason.trim(),
        amended_at: now,
        amended_by: user.id,
      },
    });

    const fullReview = await this.getReviewById(id);
    if (!fullReview) {
      throw new Error('Amended review could not be retrieved.');
    }
    return fullReview;
  },

  // --------------------------------------------------------------------------
  // Helper Queries for UI Workflows
  // --------------------------------------------------------------------------

  /**
   * Fetch active clinical staff profiles for reviewing clinician selection.
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
   * Fetch Treatment Plans for a patient.
   */
  async getTreatmentPlansForPatient(patientId: string): Promise<TreatmentPlanWithRelations[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('treatment_plans')
      .select(
        `
        *,
        episode:episodes_of_care!fk_treatment_plans_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
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
      .eq('practice_id', activePracticeId)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch treatment plans: ${error.message}`);
    }

    return (data || []) as unknown as TreatmentPlanWithRelations[];
  },

  /**
   * Fetch Episodes of Care for a patient.
   */
  async getEpisodesForPatient(patientId: string): Promise<EpisodeOfCare[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('episodes_of_care')
      .select('*')
      .eq('practice_id', activePracticeId)
      .eq('patient_id', patientId)
      .order('start_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch episodes: ${error.message}`);
    }

    return (data || []) as EpisodeOfCare[];
  },

  /**
   * Fetch completed or recorded Clinical Visits for a patient.
   */
  async getVisitsForPatient(patientId: string): Promise<ClinicalVisit[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('clinical_visits')
      .select('*')
      .eq('practice_id', activePracticeId)
      .eq('patient_id', patientId)
      .order('actual_start', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch clinical visits: ${error.message}`);
    }

    return (data || []) as ClinicalVisit[];
  },

  /**
   * Fetch Outcome Measure Assessments for a patient.
   */
  async getOutcomeAssessmentsForPatient(
    patientId: string
  ): Promise<OutcomeMeasureAssessmentWithRelations[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('outcome_measure_assessments')
      .select(
        `
        *,
        definition:outcome_measure_definitions!fk_outcome_assessments_definition (
          id,
          name,
          code,
          unit,
          category
        )
      `
      )
      .eq('practice_id', activePracticeId)
      .eq('patient_id', patientId)
      .order('performed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch outcome assessments: ${error.message}`);
    }

    return (data || []) as unknown as OutcomeMeasureAssessmentWithRelations[];
  },

  /**
   * Fetch Progress Reviews linked to a specific Treatment Plan.
   */
  async getReviewsForPlan(planId: string): Promise<ProgressReviewWithRelations[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('progress_reviews')
      .select(
        `
        *,
        patient:patients!fk_progress_reviews_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name
        ),
        episode:episodes_of_care!fk_progress_reviews_episode_patient_practice (
          id,
          episode_identifier,
          title
        )
      `
      )
      .eq('practice_id', activePracticeId)
      .eq('treatment_plan_id', planId)
      .order('review_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch reviews for plan: ${error.message}`);
    }

    return (data || []) as unknown as ProgressReviewWithRelations[];
  },

  /**
   * Fetch Progress Reviews linked to a specific Clinical Visit.
   */
  async getReviewsForVisit(visitId: string): Promise<ProgressReviewWithRelations[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('progress_reviews')
      .select(
        `
        *,
        patient:patients!fk_progress_reviews_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name
        ),
        treatment_plan:treatment_plans!fk_progress_reviews_plan_patient_episode_practice (
          id,
          plan_identifier,
          title
        )
      `
      )
      .eq('practice_id', activePracticeId)
      .eq('originating_clinical_visit_id', visitId)
      .order('review_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch reviews for visit: ${error.message}`);
    }

    return (data || []) as unknown as ProgressReviewWithRelations[];
  },
};
