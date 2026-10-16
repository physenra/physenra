import { supabase, getActivePracticeHeader } from '../lib/supabase';
import { SYSTEM_OUTCOME_MEASURES_CATALOGUE } from './outcomeMeasureCatalogueData';
import type {
  OutcomeMeasureDefinition,
  OutcomeMeasureDefinitionInsert,
  OutcomeMeasureScoringType,
  OutcomeMeasureAssessment,
  OutcomeMeasureAssessmentInsert,
  OutcomeMeasureAssessmentUpdate,
  OutcomeMeasureAssessmentWithRelations,
  OutcomeMeasureFilters,
  OutcomeAssessmentType,
  OutcomeAssessmentStatus,
  OutcomeMeasureCategory,
} from '../types/models';

export interface GetOutcomeAssessmentsOptions extends OutcomeMeasureFilters {
  page?: number;
  limit?: number;
}

export interface GetOutcomeAssessmentsResult {
  assessments: OutcomeMeasureAssessmentWithRelations[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateAssessmentInput {
  patient_id: string;
  episode_id?: string | null;
  clinical_visit_id?: string | null;
  measure_definition_id: string;
  assessor_id: string;
  assessment_type?: OutcomeAssessmentType;
  status?: OutcomeAssessmentStatus;
  performed_at?: string;
  numeric_score?: number | null;
  percentage_score?: number | null;
  score_category?: string | null;
  score_interpretation?: string | null;
  clinical_notes?: string | null;
}

export interface UpdateDraftAssessmentInput {
  assessment_type?: OutcomeAssessmentType;
  performed_at?: string;
  numeric_score?: number | null;
  percentage_score?: number | null;
  score_category?: string | null;
  score_interpretation?: string | null;
  clinical_notes?: string | null;
}

export interface AmendAssessmentInput {
  amendment_reason: string;
  amended_numeric_score?: number | null;
  amended_percentage_score?: number | null;
  clinical_notes?: string | null;
}

/**
 * Outcome Measure Service: Centralized data access layer for Clinical Outcome Measures Foundation V1.
 * Strictly enforces practice isolation, immutable finalized results, and PostgreSQL RLS.
 */
export const outcomeMeasureService = {
  /**
   * Fetch active measure definitions (both system standard and practice custom).
   * Seamlessly merges standard validated evidence-based library with practice custom definitions.
   */
  async getDefinitions(category?: OutcomeMeasureCategory): Promise<OutcomeMeasureDefinition[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    let remoteDefinitions: OutcomeMeasureDefinition[] = [];
    try {
      let query = supabase
        .from('outcome_measure_definitions')
        .select('*')
        .eq('is_active', true)
        .order('is_system', { ascending: false })
        .order('name', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (!error && data) {
        remoteDefinitions = data as OutcomeMeasureDefinition[];
      }
    } catch (err) {
      console.warn('Could not query remote measure definitions, using standard library:', err);
    }

    // Merge standard baseline catalogue with remote definitions
    const definitionMap = new Map<string, OutcomeMeasureDefinition>();

    // 1. Add standard system definitions
    for (const sysDef of SYSTEM_OUTCOME_MEASURES_CATALOGUE) {
      definitionMap.set(sysDef.code.toUpperCase(), sysDef);
    }

    // 2. Overlay remote definitions (overrides standard if in DB, and includes practice custom)
    for (const remoteDef of remoteDefinitions) {
      definitionMap.set(remoteDef.code.toUpperCase(), remoteDef);
    }

    let combined = Array.from(definitionMap.values()).filter((d) => d.is_active);

    if (category) {
      combined = combined.filter((d) => d.category === category);
    }

    // Sort: practice custom first, then alphabetical by name
    return combined.sort((a, b) => {
      if (a.is_system !== b.is_system) {
        return a.is_system ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });
  },

  /**
   * Fetch single definition by ID.
   */
  async getDefinitionById(id: string): Promise<OutcomeMeasureDefinition | null> {
    try {
      const { data, error } = await supabase
        .from('outcome_measure_definitions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return data as OutcomeMeasureDefinition;
      }
    } catch (err) {
      console.warn('Could not query measure definition by ID from remote:', err);
    }

    const fallback = SYSTEM_OUTCOME_MEASURES_CATALOGUE.find((d) => d.id === id);
    return fallback || null;
  },

  /**
   * Create a practice-owned custom outcome measure definition.
   */
  async createCustomDefinition(input: {
    code: string;
    name: string;
    description?: string | null;
    category?: OutcomeMeasureCategory;
    scoring_type?: OutcomeMeasureScoringType;
    min_score?: number | null;
    max_score?: number | null;
    score_unit?: string | null;
    interpretation_guide?: string | null;
  }): Promise<OutcomeMeasureDefinition> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const insertPayload: OutcomeMeasureDefinitionInsert = {
      practice_id: activePracticeId,
      is_system: false,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category: input.category || 'functional',
      scoring_type: input.scoring_type || 'numeric',
      min_score: input.min_score !== undefined ? input.min_score : null,
      max_score: input.max_score !== undefined ? input.max_score : null,
      score_unit: input.score_unit?.trim() || null,
      interpretation_guide: input.interpretation_guide?.trim() || null,
      is_active: true,
    };

    const { data, error } = await supabase
      .from('outcome_measure_definitions')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create custom outcome measure definition: ${error.message}`);
    }

    const created = data as OutcomeMeasureDefinition;

    await supabase.rpc('log_audit_event', {
      p_action: 'outcome_measure_definition.created',
      p_entity_type: 'outcome_measure_definition',
      p_entity_id: created.id,
      p_metadata: {
        code: created.code,
        name: created.name,
        category: created.category,
        scoring_type: created.scoring_type,
      },
    });

    return created;
  },

  /**
   * Fetch paginated list of administered outcome assessments.
   */
  async getAssessments(options: GetOutcomeAssessmentsOptions = {}): Promise<GetOutcomeAssessmentsResult> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('outcome_measure_assessments')
      .select(
        `
        *,
        patient:patients!fk_outcome_assessments_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_outcome_assessments_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        clinical_visit:clinical_visits!fk_outcome_assessments_visit_patient_practice (
          id,
          visit_identifier,
          status,
          actual_start,
          actual_end
        ),
        definition:outcome_measure_definitions (*)
      `,
        { count: 'exact' }
      )
      .eq('practice_id', activePracticeId)
      .order('performed_at', { ascending: false });

    // Filter by patient
    if (options.patientId) {
      query = query.eq('patient_id', options.patientId);
    }

    // Filter by episode
    if (options.episodeId) {
      query = query.eq('episode_id', options.episodeId);
    }

    // Filter by visit
    if (options.visitId) {
      query = query.eq('clinical_visit_id', options.visitId);
    }

    // Filter by measure definition
    if (options.measureId) {
      query = query.eq('measure_definition_id', options.measureId);
    }

    // Filter by assessor
    if (options.assessorId) {
      query = query.eq('assessor_id', options.assessorId);
    }

    // Filter by assessment type
    if (options.assessmentType && options.assessmentType !== 'all') {
      query = query.eq('assessment_type', options.assessmentType);
    }

    // Filter by status
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    const { data: rawAssessments, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to load outcome assessments: ${error.message}`);
    }

    const totalCount = count || 0;
    const assessmentsList = (rawAssessments || []) as unknown as OutcomeMeasureAssessmentWithRelations[];

    // Fetch clinician profiles for assessors, finalizers, correctors
    const profileIds = Array.from(
      new Set(
        assessmentsList
          .flatMap((a) => [a.assessor_id, a.finalized_by, a.corrected_by])
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
        for (const a of assessmentsList) {
          a.assessor = profileMap.get(a.assessor_id) || null;
          a.finalizer = a.finalized_by ? profileMap.get(a.finalized_by) || null : null;
          a.corrector = a.corrected_by ? profileMap.get(a.corrected_by) || null : null;
        }
      }
    }

    return {
      assessments: assessmentsList,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  },

  /**
   * Fetch single assessment by ID with complete relations.
   */
  async getAssessmentById(id: string): Promise<OutcomeMeasureAssessmentWithRelations | null> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('outcome_measure_assessments')
      .select(
        `
        *,
        patient:patients!fk_outcome_assessments_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_outcome_assessments_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        clinical_visit:clinical_visits!fk_outcome_assessments_visit_patient_practice (
          id,
          visit_identifier,
          status,
          actual_start,
          actual_end
        ),
        definition:outcome_measure_definitions (*)
      `
      )
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load outcome assessment: ${error.message}`);
    }

    if (!data) return null;

    const assessment = data as unknown as OutcomeMeasureAssessmentWithRelations;

    // Load clinician profiles
    const profileIds = [assessment.assessor_id, assessment.finalized_by, assessment.corrected_by].filter(
      (p): p is string => Boolean(p)
    );
    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, first_name, last_name')
        .in('id', profileIds);

      if (profiles) {
        const profileMap = new Map(profiles.map((p) => [p.id, p]));
        assessment.assessor = profileMap.get(assessment.assessor_id) || null;
        assessment.finalizer = assessment.finalized_by ? profileMap.get(assessment.finalized_by) || null : null;
        assessment.corrector = assessment.corrected_by ? profileMap.get(assessment.corrected_by) || null : null;
      }
    }

    return assessment;
  },

  /**
   * Fetch all outcome assessments linked to a specific clinical visit.
   */
  async getAssessmentsForVisit(visitId: string): Promise<OutcomeMeasureAssessmentWithRelations[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('outcome_measure_assessments')
      .select(
        `
        *,
        definition:outcome_measure_definitions (*)
      `
      )
      .eq('practice_id', activePracticeId)
      .eq('clinical_visit_id', visitId)
      .order('performed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load visit outcome assessments: ${error.message}`);
    }

    const list = (data || []) as unknown as OutcomeMeasureAssessmentWithRelations[];

    const assessorIds = Array.from(new Set(list.map((a) => a.assessor_id).filter(Boolean)));
    if (assessorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, first_name, last_name')
        .in('id', assessorIds);

      if (profiles) {
        const map = new Map(profiles.map((p) => [p.id, p]));
        for (const item of list) {
          item.assessor = map.get(item.assessor_id) || null;
        }
      }
    }

    return list;
  },

  /**
   * Fetch all outcome assessments for a patient (longitudinal tracking).
   */
  async getAssessmentsForPatient(patientId: string): Promise<OutcomeMeasureAssessmentWithRelations[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('outcome_measure_assessments')
      .select(
        `
        *,
        definition:outcome_measure_definitions (*),
        episode:episodes_of_care!fk_outcome_assessments_episode_patient_practice (id, episode_identifier, title)
      `
      )
      .eq('practice_id', activePracticeId)
      .eq('patient_id', patientId)
      .order('performed_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to load patient outcome assessments: ${error.message}`);
    }

    return (data || []) as unknown as OutcomeMeasureAssessmentWithRelations[];
  },

  /**
   * Create a new outcome measure assessment.
   */
  async createAssessment(input: CreateAssessmentInput): Promise<OutcomeMeasureAssessment> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const insertPayload: OutcomeMeasureAssessmentInsert = {
      practice_id: activePracticeId,
      patient_id: input.patient_id,
      episode_id: input.episode_id || null,
      clinical_visit_id: input.clinical_visit_id || null,
      measure_definition_id: input.measure_definition_id,
      assessor_id: input.assessor_id,
      assessment_type: input.assessment_type || 'baseline',
      status: input.status || 'draft',
      performed_at: input.performed_at || new Date().toISOString(),
      numeric_score: input.numeric_score !== undefined ? input.numeric_score : null,
      percentage_score: input.percentage_score !== undefined ? input.percentage_score : null,
      score_category: input.score_category || null,
      score_interpretation: input.score_interpretation || null,
      clinical_notes: input.clinical_notes || null,
    };

    const { data, error } = await supabase
      .from('outcome_measure_assessments')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create outcome assessment: ${error.message}`);
    }

    const created = data as OutcomeMeasureAssessment;

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_action: 'outcome_measure.created',
      p_entity_type: 'outcome_measure_assessment',
      p_entity_id: created.id,
      p_metadata: {
        assessment_identifier: created.assessment_identifier,
        patient_id: created.patient_id,
        measure_definition_id: created.measure_definition_id,
        assessment_type: created.assessment_type,
        status: created.status,
      },
      p_source: 'outcome_measure_service',
    });

    return created;
  },

  /**
   * Update a draft outcome assessment.
   * Finalized assessments cannot be updated directly.
   */
  async updateDraftAssessment(id: string, input: UpdateDraftAssessmentInput): Promise<OutcomeMeasureAssessment> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const existing = await this.getAssessmentById(id);
    if (!existing) {
      throw new Error('Assessment not found.');
    }

    if (existing.status !== 'draft') {
      throw new Error(`Cannot edit assessment in '${existing.status}' status. Finalized assessments are immutable. Record an amendment instead.`);
    }

    const updatePayload: OutcomeMeasureAssessmentUpdate = {
      assessment_type: input.assessment_type || existing.assessment_type,
      performed_at: input.performed_at || existing.performed_at,
      numeric_score: input.numeric_score !== undefined ? input.numeric_score : existing.numeric_score,
      percentage_score: input.percentage_score !== undefined ? input.percentage_score : existing.percentage_score,
      score_category: input.score_category !== undefined ? input.score_category : existing.score_category,
      score_interpretation: input.score_interpretation !== undefined ? input.score_interpretation : existing.score_interpretation,
      clinical_notes: input.clinical_notes !== undefined ? input.clinical_notes : existing.clinical_notes,
    };

    const { data, error } = await supabase
      .from('outcome_measure_assessments')
      .update(updatePayload)
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update assessment: ${error.message}`);
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'outcome_measure.updated',
      p_entity_type: 'outcome_measure_assessment',
      p_entity_id: id,
      p_metadata: {
        assessment_identifier: existing.assessment_identifier,
        patient_id: existing.patient_id,
      },
      p_source: 'outcome_measure_service',
    });

    return data as OutcomeMeasureAssessment;
  },

  /**
   * Finalize a draft outcome assessment. Medico-legally locks original score.
   */
  async finalizeAssessment(id: string): Promise<OutcomeMeasureAssessment> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const existing = await this.getAssessmentById(id);
    if (!existing) {
      throw new Error('Assessment not found.');
    }

    if (existing.status !== 'draft') {
      throw new Error(`Assessment is already in '${existing.status}' status.`);
    }

    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id;
    if (!currentUserId) {
      throw new Error('User must be authenticated to finalize an assessment.');
    }

    const nowIso = new Date().toISOString();

    const updatePayload: OutcomeMeasureAssessmentUpdate = {
      status: 'finalized',
      finalized_at: nowIso,
      finalized_by: currentUserId,
    };

    const { data, error } = await supabase
      .from('outcome_measure_assessments')
      .update(updatePayload)
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to finalize assessment: ${error.message}`);
    }

    const finalized = data as OutcomeMeasureAssessment;

    await supabase.rpc('log_audit_event', {
      p_action: 'outcome_measure.finalized',
      p_entity_type: 'outcome_measure_assessment',
      p_entity_id: id,
      p_metadata: {
        assessment_identifier: finalized.assessment_identifier,
        patient_id: finalized.patient_id,
        finalized_by: currentUserId,
        finalized_at: nowIso,
      },
      p_source: 'outcome_measure_service',
    });

    return finalized;
  },

  /**
   * Record a controlled amendment for a finalized assessment.
   * Preserves the original numeric/percentage score and records amended metrics with an explicit reason.
   */
  async amendAssessment(id: string, input: AmendAssessmentInput): Promise<OutcomeMeasureAssessment> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    if (!input.amendment_reason || !input.amendment_reason.trim()) {
      throw new Error('An amendment reason is strictly required when correcting a finalized assessment.');
    }

    const existing = await this.getAssessmentById(id);
    if (!existing) {
      throw new Error('Assessment not found.');
    }

    if (existing.status !== 'finalized' && existing.status !== 'amended') {
      throw new Error('Only finalized assessments can be amended.');
    }

    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id;
    if (!currentUserId) {
      throw new Error('User must be authenticated to amend an assessment.');
    }

    const updatePayload: OutcomeMeasureAssessmentUpdate = {
      status: 'amended',
      amendment_reason: input.amendment_reason.trim(),
      amended_numeric_score: input.amended_numeric_score !== undefined ? input.amended_numeric_score : existing.amended_numeric_score,
      amended_percentage_score: input.amended_percentage_score !== undefined ? input.amended_percentage_score : existing.amended_percentage_score,
      corrected_by: currentUserId,
    };

    if (input.clinical_notes !== undefined) {
      updatePayload.clinical_notes = input.clinical_notes;
    }

    const { data, error } = await supabase
      .from('outcome_measure_assessments')
      .update(updatePayload)
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to amend assessment: ${error.message}`);
    }

    const amended = data as OutcomeMeasureAssessment;

    await supabase.rpc('log_audit_event', {
      p_action: 'outcome_measure.amended',
      p_entity_type: 'outcome_measure_assessment',
      p_entity_id: id,
      p_metadata: {
        assessment_identifier: amended.assessment_identifier,
        patient_id: amended.patient_id,
        amendment_reason: input.amendment_reason,
        corrected_by: currentUserId,
      },
      p_source: 'outcome_measure_service',
    });

    return amended;
  },
};
