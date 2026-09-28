import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  TreatmentPlan,
  TreatmentPlanInsert,
  TreatmentPlanUpdate,
  TreatmentPlanGoalInsert,
  TreatmentPlanGoalUpdate,
  TreatmentPlanWithRelations,
  TreatmentPlanGoalWithOutcome,
  TreatmentPlanFilters,
  TreatmentPlanStatus,
  TreatmentGoalCategory,
  TreatmentGoalPriority,
  TreatmentGoalStatus,
  Profile,
  EpisodeOfCare,
  ClinicalVisit,
  OutcomeMeasureAssessmentWithRelations,
} from '../types/models';

export interface GetPlansOptions extends TreatmentPlanFilters {
  page?: number;
  limit?: number;
}

export interface GetPlansResult {
  plans: TreatmentPlanWithRelations[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateGoalInput {
  order_index?: number;
  goal_statement: string;
  category?: TreatmentGoalCategory;
  baseline_description?: string | null;
  target_description?: string | null;
  measurement_method?: string | null;
  target_timeframe_weeks?: number | null;
  priority?: TreatmentGoalPriority;
  status?: TreatmentGoalStatus;
  review_date?: string | null;
  achieved_date?: string | null;
  notes?: string | null;
  baseline_outcome_assessment_id?: string | null;
  target_outcome_assessment_id?: string | null;
}

export interface CreateTreatmentPlanInput {
  patient_id: string;
  episode_id: string;
  originating_clinical_visit_id?: string | null;
  prescribing_clinician_id: string;
  title: string;
  diagnosis_summary?: string | null;
  clinical_rationale?: string | null;
  overall_goals_summary?: string | null;
  treatment_frequency?: string | null;
  expected_duration_weeks?: number | null;
  start_date?: string;
  target_review_date?: string | null;
  status?: TreatmentPlanStatus;
  goals?: CreateGoalInput[];
}

export interface UpdateDraftTreatmentPlanInput {
  title?: string;
  diagnosis_summary?: string | null;
  clinical_rationale?: string | null;
  overall_goals_summary?: string | null;
  treatment_frequency?: string | null;
  expected_duration_weeks?: number | null;
  start_date?: string;
  target_review_date?: string | null;
  originating_clinical_visit_id?: string | null;
  goals?: CreateGoalInput[];
}

/**
 * Valid allowed state transitions for Treatment Plan V1.
 */
export const ALLOWED_TREATMENT_PLAN_TRANSITIONS: Record<TreatmentPlanStatus, TreatmentPlanStatus[]> = {
  draft: ['active', 'discontinued'],
  active: ['paused', 'completed', 'discontinued'],
  paused: ['active', 'discontinued'],
  completed: [],
  discontinued: [],
};

/**
 * Treatment Plan Service: Centralized domain & data layer for Treatment Plan & Clinical Goals V1.
 * Strictly enforces tenant isolation, multi-tenant composite foreign keys, PostgREST constraint hints,
 * immutable finalized medical records, and zero hard deletes.
 */
export const treatmentPlanService = {
  /**
   * Fetch paginated list of Treatment Plans for current practice with disambiguated relations.
   */
  async getPlans(options: GetPlansOptions = {}): Promise<GetPlansResult> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('treatment_plans')
      .select(
        `
        *,
        patient:patients!fk_treatment_plans_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_treatment_plans_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        originating_clinical_visit:clinical_visits!fk_treatment_plans_visit_patient_practice (
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
      .order('created_at', { ascending: false });

    if (options.patientId) {
      query = query.eq('patient_id', options.patientId);
    }
    if (options.episodeId) {
      query = query.eq('episode_id', options.episodeId);
    }
    if (options.visitId) {
      query = query.eq('originating_clinical_visit_id', options.visitId);
    }
    if (options.clinicianId) {
      query = query.eq('prescribing_clinician_id', options.clinicianId);
    }
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }
    if (options.startDate) {
      query = query.gte('start_date', options.startDate);
    }
    if (options.endDate) {
      query = query.lte('start_date', options.endDate);
    }
    if (options.searchQuery && options.searchQuery.trim()) {
      const term = options.searchQuery.trim();
      query = query.or(`title.ilike.%${term}%,plan_identifier.ilike.%${term}%,diagnosis_summary.ilike.%${term}%`);
    }

    const { data: rawPlans, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to load treatment plans: ${error.message}`);
    }

    const totalCount = count || 0;
    const plansList = (rawPlans || []) as unknown as TreatmentPlanWithRelations[];

    // Fetch clinician profiles for prescribing clinician and finalizer
    const profileIds = Array.from(
      new Set(
        plansList
          .flatMap((p) => [p.prescribing_clinician_id, p.finalized_by])
          .filter((id): id is string => Boolean(id))
      )
    );

    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, first_name, last_name')
        .in('id', profileIds);

      if (profiles) {
        const profileMap = new Map(profiles.map((p) => [p.id, p]));
        for (const plan of plansList) {
          plan.prescribing_clinician = profileMap.get(plan.prescribing_clinician_id) || null;
          plan.finalizer = plan.finalized_by ? profileMap.get(plan.finalized_by) || null : null;
        }
      }
    }

    return {
      plans: plansList,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  },

  /**
   * Fetch single Treatment Plan by ID with complete relations and structured goals.
   */
  async getPlanById(id: string): Promise<TreatmentPlanWithRelations | null> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('treatment_plans')
      .select(
        `
        *,
        patient:patients!fk_treatment_plans_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_treatment_plans_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        originating_clinical_visit:clinical_visits!fk_treatment_plans_visit_patient_practice (
          id,
          visit_identifier,
          status,
          actual_start,
          actual_end
        ),
        goals:treatment_plan_goals!fk_tp_goals_plan_practice (
          *,
          baseline_outcome_assessment:outcome_measure_assessments!fk_tp_goals_baseline_oa (
            id,
            assessment_identifier,
            performed_at,
            status,
            numeric_score,
            percentage_score,
            score_interpretation,
            definition:outcome_measure_definitions (
              id,
              name,
              code,
              category
            )
          ),
          target_outcome_assessment:outcome_measure_assessments!fk_tp_goals_target_oa (
            id,
            assessment_identifier,
            performed_at,
            status,
            numeric_score,
            percentage_score,
            score_interpretation,
            definition:outcome_measure_definitions (
              id,
              name,
              code,
              category
            )
          )
        )
      `
      )
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load treatment plan: ${error.message}`);
    }

    if (!data) return null;

    const plan = data as unknown as TreatmentPlanWithRelations;

    // Resolve clinician profiles
    const profileIds = [plan.prescribing_clinician_id, plan.finalized_by].filter((p): p is string => Boolean(p));
    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, first_name, last_name')
        .in('id', profileIds);

      if (profiles) {
        const profileMap = new Map(profiles.map((p) => [p.id, p]));
        plan.prescribing_clinician = profileMap.get(plan.prescribing_clinician_id) || null;
        plan.finalizer = plan.finalized_by ? profileMap.get(plan.finalized_by) || null : null;
      }
    }

    // Ensure goals are ordered by order_index
    if (plan.goals && Array.isArray(plan.goals)) {
      plan.goals.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    } else {
      const { data: goalsData, error: goalsError } = await supabase
        .from('treatment_plan_goals')
        .select(
          `
          *,
          baseline_outcome_assessment:outcome_measure_assessments!fk_tp_goals_baseline_oa (
            id,
            assessment_identifier,
            performed_at,
            status,
            numeric_score,
            percentage_score,
            score_interpretation,
            definition:outcome_measure_definitions (
              id,
              name,
              code,
              category
            )
          ),
          target_outcome_assessment:outcome_measure_assessments!fk_tp_goals_target_oa (
            id,
            assessment_identifier,
            performed_at,
            status,
            numeric_score,
            percentage_score,
            score_interpretation,
            definition:outcome_measure_definitions (
              id,
              name,
              code,
              category
            )
          )
        `
        )
        .eq('treatment_plan_id', id)
        .eq('practice_id', activePracticeId)
        .order('order_index', { ascending: true });

      if (goalsError) {
        throw new Error(`Failed to load treatment plan goals: ${goalsError.message}`);
      }

      plan.goals = (goalsData || []) as unknown as TreatmentPlanGoalWithOutcome[];
    }

    return plan;
  },

  /**
   * Create a new Treatment Plan with optional initial goals.
   */
  async createPlan(input: CreateTreatmentPlanInput): Promise<TreatmentPlanWithRelations> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    // Generate atomic sequential identifier via RPC
    const { data: identifierData, error: identifierError } = await supabase.rpc(
      'generate_next_treatment_plan_identifier',
      { p_practice_id: activePracticeId }
    );

    if (identifierError || !identifierData) {
      throw new Error(`Failed to generate treatment plan identifier: ${identifierError?.message || 'Unknown error'}`);
    }

    const planIdentifier = identifierData as string;

    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id || null;

    const initialStatus: TreatmentPlanStatus = input.status || 'draft';
    const nowIso = new Date().toISOString();

    const insertPayload: TreatmentPlanInsert = {
      practice_id: activePracticeId,
      patient_id: input.patient_id,
      episode_id: input.episode_id,
      originating_clinical_visit_id: input.originating_clinical_visit_id || null,
      prescribing_clinician_id: input.prescribing_clinician_id,
      plan_identifier: planIdentifier,
      title: input.title.trim(),
      diagnosis_summary: input.diagnosis_summary?.trim() || null,
      clinical_rationale: input.clinical_rationale?.trim() || null,
      overall_goals_summary: input.overall_goals_summary?.trim() || null,
      treatment_frequency: input.treatment_frequency?.trim() || null,
      expected_duration_weeks: input.expected_duration_weeks || null,
      start_date: input.start_date || new Date().toISOString().split('T')[0],
      target_review_date: input.target_review_date || null,
      status: initialStatus,
      created_by: currentUserId,
      updated_by: currentUserId,
      ...(initialStatus === 'active'
        ? {
            finalized_at: nowIso,
            finalized_by: currentUserId,
          }
        : {}),
    };

    const { data: createdPlanData, error: planError } = await supabase
      .from('treatment_plans')
      .insert(insertPayload)
      .select()
      .single();

    if (planError) {
      throw new Error(`Failed to create treatment plan: ${planError.message}`);
    }

    const createdPlan = createdPlanData as TreatmentPlan;

    // Insert structured goals if provided
    if (input.goals && input.goals.length > 0) {
      const goalsPayload = input.goals.map((g, idx) => ({
        practice_id: activePracticeId,
        treatment_plan_id: createdPlan.id,
        order_index: g.order_index !== undefined ? g.order_index : idx + 1,
        goal_statement: g.goal_statement.trim(),
        category: g.category || 'functional',
        baseline_description: g.baseline_description?.trim() || null,
        target_description: g.target_description?.trim() || null,
        measurement_method: g.measurement_method?.trim() || null,
        target_timeframe_weeks: g.target_timeframe_weeks || null,
        priority: g.priority || 'medium',
        status: initialStatus === 'active' ? ('active' as TreatmentGoalStatus) : (g.status || 'draft'),
        review_date: g.review_date || null,
        achieved_date: g.achieved_date || null,
        notes: g.notes?.trim() || null,
        baseline_outcome_assessment_id: g.baseline_outcome_assessment_id || null,
        target_outcome_assessment_id: g.target_outcome_assessment_id || null,
      }));

      const { error: goalsError } = await supabase
        .from('treatment_plan_goals')
        .insert(goalsPayload);

      if (goalsError) {
        throw new Error(`Plan created but goals insertion failed: ${goalsError.message}`);
      }
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_action: 'treatment_plan.created',
      p_entity_type: 'treatment_plan',
      p_entity_id: createdPlan.id,
      p_metadata: {
        plan_identifier: createdPlan.plan_identifier,
        patient_id: createdPlan.patient_id,
        episode_id: createdPlan.episode_id,
        prescribing_clinician_id: createdPlan.prescribing_clinician_id,
        status: createdPlan.status,
        goals_count: input.goals ? input.goals.length : 0,
      },
      p_source: 'treatment_plan_service',
    });

    if (initialStatus === 'active') {
      await supabase.rpc('log_audit_event', {
        p_action: 'treatment_plan.activated',
        p_entity_type: 'treatment_plan',
        p_entity_id: createdPlan.id,
        p_metadata: {
          plan_identifier: createdPlan.plan_identifier,
          patient_id: createdPlan.patient_id,
          finalized_by: currentUserId,
          finalized_at: nowIso,
        },
        p_source: 'treatment_plan_service',
      });
    }

    const fullPlan = await this.getPlanById(createdPlan.id);
    if (!fullPlan) {
      throw new Error('Treatment plan created but failed to load complete record.');
    }
    return fullPlan;
  },

  /**
   * Update draft Treatment Plan and its goals. Only draft plans can be updated this way.
   */
  async updateDraftPlan(planId: string, input: UpdateDraftTreatmentPlanInput): Promise<TreatmentPlanWithRelations> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const existing = await this.getPlanById(planId);
    if (!existing) {
      throw new Error('Treatment plan not found.');
    }

    if (existing.status !== 'draft') {
      throw new Error(`Cannot modify treatment plan in '${existing.status}' status. Only draft plans are mutable.`);
    }

    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id || null;

    const updatePayload: TreatmentPlanUpdate = {
      updated_by: currentUserId,
    };
    if (input.title !== undefined) updatePayload.title = input.title.trim();
    if (input.diagnosis_summary !== undefined) updatePayload.diagnosis_summary = input.diagnosis_summary?.trim() || null;
    if (input.clinical_rationale !== undefined) updatePayload.clinical_rationale = input.clinical_rationale?.trim() || null;
    if (input.overall_goals_summary !== undefined) updatePayload.overall_goals_summary = input.overall_goals_summary?.trim() || null;
    if (input.treatment_frequency !== undefined) updatePayload.treatment_frequency = input.treatment_frequency?.trim() || null;
    if (input.expected_duration_weeks !== undefined) updatePayload.expected_duration_weeks = input.expected_duration_weeks;
    if (input.start_date !== undefined) updatePayload.start_date = input.start_date;
    if (input.target_review_date !== undefined) updatePayload.target_review_date = input.target_review_date;
    if (input.originating_clinical_visit_id !== undefined) updatePayload.originating_clinical_visit_id = input.originating_clinical_visit_id;

    const { error: updateError } = await supabase
      .from('treatment_plans')
      .update(updatePayload)
      .eq('id', planId)
      .eq('practice_id', activePracticeId);

    if (updateError) {
      throw new Error(`Failed to update draft treatment plan: ${updateError.message}`);
    }

    // Sync goals if provided
    if (input.goals !== undefined) {
      await supabase
        .from('treatment_plan_goals')
        .delete()
        .eq('treatment_plan_id', planId)
        .eq('practice_id', activePracticeId);

      if (input.goals.length > 0) {
        const goalsPayload = input.goals.map((g, idx) => ({
          practice_id: activePracticeId,
          treatment_plan_id: planId,
          order_index: g.order_index !== undefined ? g.order_index : idx + 1,
          goal_statement: g.goal_statement.trim(),
          category: g.category || 'functional',
          baseline_description: g.baseline_description?.trim() || null,
          target_description: g.target_description?.trim() || null,
          measurement_method: g.measurement_method?.trim() || null,
          target_timeframe_weeks: g.target_timeframe_weeks || null,
          priority: g.priority || 'medium',
          status: 'draft' as TreatmentGoalStatus,
          review_date: g.review_date || null,
          achieved_date: g.achieved_date || null,
          notes: g.notes?.trim() || null,
          baseline_outcome_assessment_id: g.baseline_outcome_assessment_id || null,
          target_outcome_assessment_id: g.target_outcome_assessment_id || null,
        }));

        const { error: goalsInsertError } = await supabase
          .from('treatment_plan_goals')
          .insert(goalsPayload);

        if (goalsInsertError) {
          throw new Error(`Failed to re-sync treatment plan goals: ${goalsInsertError.message}`);
        }
      }
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'treatment_plan.updated',
      p_entity_type: 'treatment_plan',
      p_entity_id: planId,
      p_metadata: {
        plan_identifier: existing.plan_identifier,
        patient_id: existing.patient_id,
      },
      p_source: 'treatment_plan_service',
    });

    const updated = await this.getPlanById(planId);
    if (!updated) throw new Error('Failed to load updated plan.');
    return updated;
  },

  /**
   * Activate a draft Treatment Plan.
   * Clinically locks baseline parameters, sets finalized_at, and activates draft goals.
   */
  async activatePlan(planId: string): Promise<TreatmentPlanWithRelations> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const existing = await this.getPlanById(planId);
    if (!existing) {
      throw new Error('Treatment plan not found.');
    }

    if (existing.status !== 'draft') {
      throw new Error(`Cannot activate treatment plan from '${existing.status}' status. Only draft plans can be activated.`);
    }

    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id;
    if (!currentUserId) {
      throw new Error('User must be authenticated to activate a treatment plan.');
    }

    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('treatment_plans')
      .update({
        status: 'active',
        finalized_at: nowIso,
        finalized_by: currentUserId,
        updated_by: currentUserId,
      })
      .eq('id', planId)
      .eq('practice_id', activePracticeId);

    if (updateError) {
      throw new Error(`Failed to activate treatment plan: ${updateError.message}`);
    }

    // Set any draft goals to active
    await supabase
      .from('treatment_plan_goals')
      .update({ status: 'active' })
      .eq('treatment_plan_id', planId)
      .eq('practice_id', activePracticeId)
      .eq('status', 'draft');

    await supabase.rpc('log_audit_event', {
      p_action: 'treatment_plan.activated',
      p_entity_type: 'treatment_plan',
      p_entity_id: planId,
      p_metadata: {
        plan_identifier: existing.plan_identifier,
        patient_id: existing.patient_id,
        finalized_by: currentUserId,
        finalized_at: nowIso,
      },
      p_source: 'treatment_plan_service',
    });

    const updated = await this.getPlanById(planId);
    if (!updated) throw new Error('Failed to load activated plan.');
    return updated;
  },

  /**
   * Pause an active Treatment Plan.
   */
  async pausePlan(planId: string, reason?: string): Promise<TreatmentPlanWithRelations> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const existing = await this.getPlanById(planId);
    if (!existing) {
      throw new Error('Treatment plan not found.');
    }

    if (existing.status !== 'active') {
      throw new Error(`Only active plans can be paused. Current status: '${existing.status}'`);
    }

    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id || null;

    const { error } = await supabase
      .from('treatment_plans')
      .update({
        status: 'paused',
        updated_by: currentUserId,
      })
      .eq('id', planId)
      .eq('practice_id', activePracticeId);

    if (error) {
      throw new Error(`Failed to pause treatment plan: ${error.message}`);
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'treatment_plan.paused',
      p_entity_type: 'treatment_plan',
      p_entity_id: planId,
      p_metadata: {
        plan_identifier: existing.plan_identifier,
        patient_id: existing.patient_id,
        reason: reason || null,
      },
      p_source: 'treatment_plan_service',
    });

    const updated = await this.getPlanById(planId);
    if (!updated) throw new Error('Failed to load paused plan.');
    return updated;
  },

  /**
   * Resume a paused Treatment Plan back to active.
   */
  async resumePlan(planId: string): Promise<TreatmentPlanWithRelations> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const existing = await this.getPlanById(planId);
    if (!existing) {
      throw new Error('Treatment plan not found.');
    }

    if (existing.status !== 'paused') {
      throw new Error(`Only paused plans can be resumed. Current status: '${existing.status}'`);
    }

    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id || null;

    const { error } = await supabase
      .from('treatment_plans')
      .update({
        status: 'active',
        updated_by: currentUserId,
      })
      .eq('id', planId)
      .eq('practice_id', activePracticeId);

    if (error) {
      throw new Error(`Failed to resume treatment plan: ${error.message}`);
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'treatment_plan.resumed',
      p_entity_type: 'treatment_plan',
      p_entity_id: planId,
      p_metadata: {
        plan_identifier: existing.plan_identifier,
        patient_id: existing.patient_id,
      },
      p_source: 'treatment_plan_service',
    });

    const updated = await this.getPlanById(planId);
    if (!updated) throw new Error('Failed to load resumed plan.');
    return updated;
  },

  /**
   * Complete an active Treatment Plan (terminal success state).
   */
  async completePlan(planId: string, notes?: string): Promise<TreatmentPlanWithRelations> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const existing = await this.getPlanById(planId);
    if (!existing) {
      throw new Error('Treatment plan not found.');
    }

    if (existing.status !== 'active') {
      throw new Error(`Only active plans can be completed. Current status: '${existing.status}'`);
    }

    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id || null;

    const { error } = await supabase
      .from('treatment_plans')
      .update({
        status: 'completed',
        updated_by: currentUserId,
      })
      .eq('id', planId)
      .eq('practice_id', activePracticeId);

    if (error) {
      throw new Error(`Failed to complete treatment plan: ${error.message}`);
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'treatment_plan.completed',
      p_entity_type: 'treatment_plan',
      p_entity_id: planId,
      p_metadata: {
        plan_identifier: existing.plan_identifier,
        patient_id: existing.patient_id,
        notes: notes || null,
      },
      p_source: 'treatment_plan_service',
    });

    const updated = await this.getPlanById(planId);
    if (!updated) throw new Error('Failed to load completed plan.');
    return updated;
  },

  /**
   * Discontinue a Treatment Plan with a mandatory clinical justification reason.
   */
  async discontinuePlan(planId: string, reason: string): Promise<TreatmentPlanWithRelations> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    if (!reason || !reason.trim()) {
      throw new Error('A clinical justification reason is strictly required when discontinuing a Treatment Plan.');
    }

    const existing = await this.getPlanById(planId);
    if (!existing) {
      throw new Error('Treatment plan not found.');
    }

    if (existing.status === 'completed' || existing.status === 'discontinued') {
      throw new Error(`Cannot discontinue a plan already in terminal '${existing.status}' state.`);
    }

    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id || null;

    const { error } = await supabase
      .from('treatment_plans')
      .update({
        status: 'discontinued',
        discontinued_reason: reason.trim(),
        updated_by: currentUserId,
      })
      .eq('id', planId)
      .eq('practice_id', activePracticeId);

    if (error) {
      throw new Error(`Failed to discontinue treatment plan: ${error.message}`);
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'treatment_plan.discontinued',
      p_entity_type: 'treatment_plan',
      p_entity_id: planId,
      p_metadata: {
        plan_identifier: existing.plan_identifier,
        patient_id: existing.patient_id,
        discontinued_reason: reason.trim(),
      },
      p_source: 'treatment_plan_service',
    });

    const updated = await this.getPlanById(planId);
    if (!updated) throw new Error('Failed to load discontinued plan.');
    return updated;
  },

  /**
   * Add a single goal to an existing Treatment Plan.
   */
  async addGoal(planId: string, input: CreateGoalInput): Promise<TreatmentPlanGoalWithOutcome> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const plan = await this.getPlanById(planId);
    if (!plan) {
      throw new Error('Treatment plan not found.');
    }

    if (plan.status === 'completed' || plan.status === 'discontinued') {
      throw new Error(`Cannot add goals to a treatment plan in '${plan.status}' status.`);
    }

    const nextOrder = (plan.goals?.length || 0) + 1;

    const insertPayload: TreatmentPlanGoalInsert = {
      practice_id: activePracticeId,
      treatment_plan_id: planId,
      order_index: input.order_index !== undefined ? input.order_index : nextOrder,
      goal_statement: input.goal_statement.trim(),
      category: input.category || 'functional',
      baseline_description: input.baseline_description?.trim() || null,
      target_description: input.target_description?.trim() || null,
      measurement_method: input.measurement_method?.trim() || null,
      target_timeframe_weeks: input.target_timeframe_weeks || null,
      priority: input.priority || 'medium',
      status: plan.status === 'active' ? 'active' : input.status || 'draft',
      review_date: input.review_date || null,
      achieved_date: input.achieved_date || null,
      notes: input.notes?.trim() || null,
      baseline_outcome_assessment_id: input.baseline_outcome_assessment_id || null,
      target_outcome_assessment_id: input.target_outcome_assessment_id || null,
    };

    const { data, error } = await supabase
      .from('treatment_plan_goals')
      .insert(insertPayload)
      .select(
        `
        *,
        baseline_outcome_assessment:outcome_measure_assessments!fk_tp_goals_baseline_oa (
          id,
          assessment_identifier,
          performed_at,
          status,
          numeric_score,
          percentage_score,
          score_interpretation,
          definition:outcome_measure_definitions (
            id,
            name,
            code,
            category
          )
        ),
        target_outcome_assessment:outcome_measure_assessments!fk_tp_goals_target_oa (
          id,
          assessment_identifier,
          performed_at,
          status,
          numeric_score,
          percentage_score,
          score_interpretation,
          definition:outcome_measure_definitions (
            id,
            name,
            code,
            category
          )
        )
      `
      )
      .single();

    if (error) {
      throw new Error(`Failed to add goal: ${error.message}`);
    }

    const createdGoal = data as unknown as TreatmentPlanGoalWithOutcome;

    await supabase.rpc('log_audit_event', {
      p_action: 'treatment_goal.created',
      p_entity_type: 'treatment_plan_goal',
      p_entity_id: createdGoal.id,
      p_metadata: {
        treatment_plan_id: planId,
        goal_statement: createdGoal.goal_statement,
        category: createdGoal.category,
      },
      p_source: 'treatment_plan_service',
    });

    return createdGoal;
  },

  /**
   * Update goal details or progress evaluation status.
   */
  async updateGoalStatus(
    goalId: string,
    status: TreatmentGoalStatus,
    notes?: string
  ): Promise<TreatmentPlanGoalWithOutcome> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const updatePayload: TreatmentPlanGoalUpdate = {
      status,
      review_date: new Date().toISOString().split('T')[0],
      ...(notes !== undefined ? { notes: notes.trim() } : {}),
      ...(status === 'achieved' ? { achieved_date: new Date().toISOString().split('T')[0] } : {}),
    };

    const { data, error } = await supabase
      .from('treatment_plan_goals')
      .update(updatePayload)
      .eq('id', goalId)
      .eq('practice_id', activePracticeId)
      .select(
        `
        *,
        baseline_outcome_assessment:outcome_measure_assessments!fk_tp_goals_baseline_oa (
          id,
          assessment_identifier,
          performed_at,
          status,
          numeric_score,
          percentage_score,
          score_interpretation,
          definition:outcome_measure_definitions (
            id,
            name,
            code,
            category
          )
        ),
        target_outcome_assessment:outcome_measure_assessments!fk_tp_goals_target_oa (
          id,
          assessment_identifier,
          performed_at,
          status,
          numeric_score,
          percentage_score,
          score_interpretation,
          definition:outcome_measure_definitions (
            id,
            name,
            code,
            category
          )
        )
      `
      )
      .single();

    if (error) {
      throw new Error(`Failed to update goal status: ${error.message}`);
    }

    const updatedGoal = data as unknown as TreatmentPlanGoalWithOutcome;

    await supabase.rpc('log_audit_event', {
      p_action: 'treatment_goal.status_changed',
      p_entity_type: 'treatment_plan_goal',
      p_entity_id: goalId,
      p_metadata: {
        treatment_plan_id: updatedGoal.treatment_plan_id,
        new_status: status,
      },
      p_source: 'treatment_plan_service',
    });

    return updatedGoal;
  },

  /**
   * Delete a draft goal from a draft plan. Cannot delete goals from active/terminal plans.
   */
  async deleteDraftGoal(goalId: string): Promise<void> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { error } = await supabase
      .from('treatment_plan_goals')
      .delete()
      .eq('id', goalId)
      .eq('practice_id', activePracticeId);

    if (error) {
      throw new Error(`Failed to delete goal: ${error.message}`);
    }
  },

  /**
   * Retrieve active clinical staff eligible to author or oversee Treatment Plans.
   */
  async getClinicians(): Promise<Profile[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data: memberships, error: membershipError } = await supabase
      .from('practice_memberships')
      .select('user_id')
      .eq('practice_id', activePracticeId)
      .eq('status', 'active')
      .in('role', ['practice_owner', 'practice_manager', 'physiotherapist']);

    if (membershipError) {
      throw new Error(`Failed to load practice clinicians: ${membershipError.message}`);
    }

    if (!memberships || memberships.length === 0) {
      return [];
    }

    const userIds = memberships.map((m) => m.user_id);

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)
      .order('last_name', { ascending: true });

    if (profileError) {
      throw new Error(`Failed to load clinician profiles: ${profileError.message}`);
    }

    return (profiles || []) as Profile[];
  },

  /**
   * Retrieve active episodes of care for a given patient within the practice context.
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
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load patient episodes: ${error.message}`);
    }

    return (data || []) as EpisodeOfCare[];
  },

  /**
   * Retrieve clinical visits for a patient (optional filter by episode) for originating encounter linking.
   */
  async getVisitsForPatient(patientId: string, episodeId?: string): Promise<ClinicalVisit[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    let query = supabase
      .from('clinical_visits')
      .select('*')
      .eq('practice_id', activePracticeId)
      .eq('patient_id', patientId)
      .order('actual_start', { ascending: false });

    if (episodeId) {
      query = query.eq('episode_id', episodeId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load patient visits: ${error.message}`);
    }

    return (data || []) as ClinicalVisit[];
  },

  /**
   * Retrieve outcome assessments for a patient for goal baseline/target linking.
   */
  async getOutcomeAssessmentsForPatient(
    patientId: string,
    episodeId?: string
  ): Promise<OutcomeMeasureAssessmentWithRelations[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    let query = supabase
      .from('outcome_measure_assessments')
      .select(
        `
        *,
        definition:outcome_measure_definitions (*)
      `
      )
      .eq('practice_id', activePracticeId)
      .eq('patient_id', patientId)
      .order('performed_at', { ascending: false });

    if (episodeId) {
      query = query.eq('episode_id', episodeId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load patient outcome assessments: ${error.message}`);
    }

    return (data || []) as unknown as OutcomeMeasureAssessmentWithRelations[];
  },

  /**
   * Retrieve Treatment Plans formulated from a specific Clinical Visit encounter.
   */
  async getPlansForVisit(visitId: string): Promise<TreatmentPlanWithRelations[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('treatment_plans')
      .select(
        `
        *,
        patient:patients!fk_treatment_plans_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_treatment_plans_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        originating_clinical_visit:clinical_visits!fk_treatment_plans_visit_patient_practice (
          id,
          visit_identifier,
          status,
          actual_start,
          actual_end
        )
      `
      )
      .eq('practice_id', activePracticeId)
      .eq('originating_clinical_visit_id', visitId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load visit treatment plans: ${error.message}`);
    }

    return (data || []) as unknown as TreatmentPlanWithRelations[];
  },
};
