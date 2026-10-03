import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  ClinicalAssessmentDefinition,
  ClinicalAssessmentInstance,
  ClinicalAssessmentInstanceInsert,
  ClinicalAssessmentInstanceUpdate,
  ClinicalAssessmentInstanceWithRelations,
  ClinicalAssessmentFilters,
  ClinicalSpecialty,
  ClinicalAssessmentStatus,
} from '../types/models';

export interface GetClinicalAssessmentsOptions extends ClinicalAssessmentFilters {
  page?: number;
  limit?: number;
}

export interface GetClinicalAssessmentsResult {
  assessments: ClinicalAssessmentInstanceWithRelations[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateClinicalAssessmentInput {
  patient_id: string;
  episode_id?: string | null;
  clinical_visit_id: string;
  definition_id: string;
  assessor_id: string;
  status?: ClinicalAssessmentStatus;
  performed_at?: string;
  structured_data: Record<string, any>;
  summary_findings?: string | null;
  clinical_notes?: string | null;
}

export interface UpdateDraftClinicalAssessmentInput {
  performed_at?: string;
  structured_data?: Record<string, any>;
  summary_findings?: string | null;
  clinical_notes?: string | null;
}

export interface AmendClinicalAssessmentInput {
  amendment_reason: string;
  structured_data?: Record<string, any>;
  summary_findings?: string | null;
  clinical_notes?: string | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Valid allowed state transitions for Clinical Assessments.
 */
export const ALLOWED_ASSESSMENT_TRANSITIONS: Record<ClinicalAssessmentStatus, ClinicalAssessmentStatus[]> = {
  draft: ['finalized'],
  finalized: ['amended'],
  amended: [],
};

/**
 * Clinical Assessment Service: Centralized data access and validation layer for
 * Specialty-Neutral Clinical Assessment Architecture Foundation V1.
 * Strictly enforces practice isolation, schema-level validation, immutable finalized records, and PostgreSQL RLS.
 */
export const clinicalAssessmentService = {
  /**
   * Validate structured payload against definition schema & security invariants.
   * Enforces required fields, value ranges, and bars arbitrary code execution.
   */
  validatePayload(
    definition: ClinicalAssessmentDefinition,
    data: Record<string, any>
  ): ValidationResult {
    const errors: string[] = [];

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { valid: false, errors: ['Assessment payload must be a non-null JSON object.'] };
    }

    // Security invariant: inspect string values for script/eval injection
    const jsonString = JSON.stringify(data);
    if (
      /<script\b/i.test(jsonString) ||
      /\beval\s*\(/i.test(jsonString) ||
      /javascript:/i.test(jsonString) ||
      /\bon\w+\s*=/i.test(jsonString)
    ) {
      errors.push('Security violation: Assessment payload contains prohibited executable or script content.');
      return { valid: false, errors };
    }

    const schema = definition.schema_definition as any;
    if (schema && Array.isArray(schema.sections)) {
      for (const section of schema.sections) {
        if (Array.isArray(section.fields)) {
          for (const field of section.fields) {
            const val = data[field.id];

            if (field.required && (val === undefined || val === null || val === '')) {
              errors.push(`Field '${field.label || field.id}' is required in section '${section.title || section.id}'.`);
            }

            if (val !== undefined && val !== null && val !== '') {
              // Select validation
              if (field.type === 'select' && Array.isArray(field.options)) {
                if (!field.options.includes(val)) {
                  errors.push(
                    `Invalid value '${val}' for '${field.label || field.id}'. Allowed options: ${field.options.join(', ')}.`
                  );
                }
              }

              // Numeric bounds validation
              if (field.type === 'number') {
                const num = Number(val);
                if (isNaN(num)) {
                  errors.push(`Field '${field.label || field.id}' must be a valid number.`);
                } else {
                  if (field.min !== undefined && num < field.min) {
                    errors.push(`Field '${field.label || field.id}' cannot be less than ${field.min}.`);
                  }
                  if (field.max !== undefined && num > field.max) {
                    errors.push(`Field '${field.label || field.id}' cannot be greater than ${field.max}.`);
                  }
                }
              }
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Fetch active assessment definitions (both system standard and practice custom).
   */
  async getDefinitions(specialty?: ClinicalSpecialty): Promise<ClinicalAssessmentDefinition[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    let query = supabase
      .from('clinical_assessment_definitions')
      .select('*')
      .eq('status', 'active')
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (specialty && specialty !== ('all' as any)) {
      query = query.eq('specialty', specialty);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load assessment definitions: ${error.message}`);
    }

    return (data || []) as ClinicalAssessmentDefinition[];
  },

  /**
   * Fetch single definition by code and optional version.
   */
  async getDefinitionByCode(
    code: string,
    version: number = 1
  ): Promise<ClinicalAssessmentDefinition | null> {
    const { data, error } = await supabase
      .from('clinical_assessment_definitions')
      .select('*')
      .eq('code', code)
      .eq('version', version)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load assessment definition by code: ${error.message}`);
    }

    return data as ClinicalAssessmentDefinition | null;
  },

  /**
   * Fetch single definition by ID.
   */
  async getDefinitionById(id: string): Promise<ClinicalAssessmentDefinition | null> {
    const { data, error } = await supabase
      .from('clinical_assessment_definitions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load assessment definition: ${error.message}`);
    }

    return data as ClinicalAssessmentDefinition | null;
  },

  /**
   * Fetch paginated list of clinical assessments with joined relations.
   */
  async getAssessments(
    options: GetClinicalAssessmentsOptions = {}
  ): Promise<GetClinicalAssessmentsResult> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('clinical_assessment_instances')
      .select(
        `
        *,
        patient:patients!fk_clinical_assessments_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_clinical_assessments_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        clinical_visit:clinical_visits!fk_clinical_assessments_visit_patient_practice (
          id,
          visit_identifier,
          status,
          actual_start,
          actual_end
        ),
        definition:clinical_assessment_definitions!definition_id (
          id,
          code,
          name,
          specialty,
          version,
          status,
          schema_definition,
          validation_rules,
          display_metadata
        ),
        assessor:profiles!assessor_id (
          id,
          display_name,
          first_name,
          last_name
        ),
        finalizer:profiles!finalized_by (
          id,
          display_name,
          first_name,
          last_name
        ),
        corrector:profiles!corrected_by (
          id,
          display_name,
          first_name,
          last_name
        )
      `,
        { count: 'exact' }
      )
      .eq('practice_id', activePracticeId)
      .order('performed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (options.patientId) {
      query = query.eq('patient_id', options.patientId);
    }
    if (options.episodeId) {
      query = query.eq('episode_id', options.episodeId);
    }
    if (options.visitId) {
      query = query.eq('clinical_visit_id', options.visitId);
    }
    if (options.definitionId) {
      query = query.eq('definition_id', options.definitionId);
    }
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }
    if (options.searchQuery && options.searchQuery.trim().length > 0) {
      query = query.or(
        `assessment_identifier.ilike.%${options.searchQuery}%,summary_findings.ilike.%${options.searchQuery}%,clinical_notes.ilike.%${options.searchQuery}%`
      );
    }

    const { data, count, error } = await query;
    if (error) {
      throw new Error(`Failed to load clinical assessments: ${error.message}`);
    }

    const totalCount = count || 0;
    return {
      assessments: (data || []) as unknown as ClinicalAssessmentInstanceWithRelations[],
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  },

  /**
   * Fetch all structured assessments recorded for a specific clinical visit.
   */
  async getAssessmentsForVisit(
    visitId: string
  ): Promise<ClinicalAssessmentInstanceWithRelations[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('clinical_assessment_instances')
      .select(
        `
        *,
        definition:clinical_assessment_definitions!definition_id (
          id,
          code,
          name,
          specialty,
          version,
          status,
          schema_definition,
          validation_rules,
          display_metadata
        ),
        assessor:profiles!assessor_id (
          id,
          display_name,
          first_name,
          last_name
        ),
        finalizer:profiles!finalized_by (
          id,
          display_name,
          first_name,
          last_name
        )
      `
      )
      .eq('practice_id', activePracticeId)
      .eq('clinical_visit_id', visitId)
      .order('performed_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to load visit assessments: ${error.message}`);
    }

    return (data || []) as unknown as ClinicalAssessmentInstanceWithRelations[];
  },

  /**
   * Fetch longitudinal assessments for a specific patient.
   */
  async getAssessmentsForPatient(
    patientId: string,
    specialty?: ClinicalSpecialty
  ): Promise<ClinicalAssessmentInstanceWithRelations[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    let query = supabase
      .from('clinical_assessment_instances')
      .select(
        `
        *,
        definition:clinical_assessment_definitions!definition_id (
          id,
          code,
          name,
          specialty,
          version,
          status,
          schema_definition,
          validation_rules,
          display_metadata
        ),
        clinical_visit:clinical_visits!fk_clinical_assessments_visit_patient_practice (
          id,
          visit_identifier,
          actual_start
        ),
        assessor:profiles!assessor_id (
          id,
          display_name,
          first_name,
          last_name
        )
      `
      )
      .eq('practice_id', activePracticeId)
      .eq('patient_id', patientId)
      .order('performed_at', { ascending: true });

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load patient assessments: ${error.message}`);
    }

    let results = (data || []) as unknown as ClinicalAssessmentInstanceWithRelations[];
    if (specialty && specialty !== ('all' as any)) {
      results = results.filter((item) => item.definition?.specialty === specialty);
    }

    return results;
  },

  /**
   * Fetch single assessment by ID.
   */
  async getAssessmentById(
    id: string
  ): Promise<ClinicalAssessmentInstanceWithRelations | null> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('clinical_assessment_instances')
      .select(
        `
        *,
        patient:patients!fk_clinical_assessments_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_clinical_assessments_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        clinical_visit:clinical_visits!fk_clinical_assessments_visit_patient_practice (
          id,
          visit_identifier,
          status,
          actual_start,
          actual_end
        ),
        definition:clinical_assessment_definitions!definition_id (
          id,
          code,
          name,
          specialty,
          version,
          status,
          schema_definition,
          validation_rules,
          display_metadata
        ),
        assessor:profiles!assessor_id (
          id,
          display_name,
          first_name,
          last_name
        ),
        finalizer:profiles!finalized_by (
          id,
          display_name,
          first_name,
          last_name
        ),
        corrector:profiles!corrected_by (
          id,
          display_name,
          first_name,
          last_name
        )
      `
      )
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load assessment: ${error.message}`);
    }

    return (data as unknown as (ClinicalAssessmentInstanceWithRelations | null)) || null;
  },

  /**
   * Create a new clinical assessment instance.
   * Performs schema validation against the selected definition and enforces practice tenancy.
   */
  async createAssessment(
    input: CreateClinicalAssessmentInput
  ): Promise<ClinicalAssessmentInstance> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    // 1. Fetch definition and validate schema
    const definition = await this.getDefinitionById(input.definition_id);
    if (!definition) {
      throw new Error('Target clinical assessment definition does not exist.');
    }

    const validation = this.validatePayload(definition, input.structured_data);
    if (!validation.valid) {
      throw new Error(`Assessment payload validation failed: ${validation.errors.join('; ')}`);
    }

    const status: ClinicalAssessmentStatus = input.status || 'draft';
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id || input.assessor_id;

    const insertPayload: ClinicalAssessmentInstanceInsert = {
      practice_id: activePracticeId,
      patient_id: input.patient_id,
      episode_id: input.episode_id || null,
      clinical_visit_id: input.clinical_visit_id,
      definition_id: input.definition_id,
      definition_version: definition.version,
      assessor_id: input.assessor_id,
      status,
      performed_at: input.performed_at || new Date().toISOString(),
      structured_data: input.structured_data,
      summary_findings: input.summary_findings || null,
      clinical_notes: input.clinical_notes || null,
      finalized_at: status === 'finalized' ? new Date().toISOString() : null,
      finalized_by: status === 'finalized' ? currentUserId : null,
    };

    const { data, error } = await supabase
      .from('clinical_assessment_instances')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create clinical assessment: ${error.message}`);
    }

    const created = data as ClinicalAssessmentInstance;

    await supabase.rpc('log_audit_event', {
      p_action: 'clinical_assessment.created',
      p_entity_type: 'clinical_assessment_instance',
      p_entity_id: created.id,
      p_metadata: {
        assessment_identifier: created.assessment_identifier,
        definition_code: definition.code,
        specialty: definition.specialty,
        patient_id: created.patient_id,
        clinical_visit_id: created.clinical_visit_id,
        status: created.status,
      },
      p_source: 'clinical_assessment_service',
    });

    return created;
  },

  /**
   * Update an existing draft assessment.
   * Finalized or amended assessments cannot be updated via this method.
   */
  async updateDraftAssessment(
    id: string,
    input: UpdateDraftClinicalAssessmentInput
  ): Promise<ClinicalAssessmentInstance> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const existing = await this.getAssessmentById(id);
    if (!existing) {
      throw new Error('Assessment not found.');
    }

    if (existing.status !== 'draft') {
      throw new Error(
        `Cannot edit assessment in '${existing.status}' status. Only draft assessments can be edited directly.`
      );
    }

    if (input.structured_data && existing.definition) {
      const validation = this.validatePayload(existing.definition, input.structured_data);
      if (!validation.valid) {
        throw new Error(`Assessment payload validation failed: ${validation.errors.join('; ')}`);
      }
    }

    const updatePayload: ClinicalAssessmentInstanceUpdate = {
      ...(input.performed_at && { performed_at: input.performed_at }),
      ...(input.structured_data && { structured_data: input.structured_data }),
      ...(input.summary_findings !== undefined && { summary_findings: input.summary_findings }),
      ...(input.clinical_notes !== undefined && { clinical_notes: input.clinical_notes }),
    };

    const { data, error } = await supabase
      .from('clinical_assessment_instances')
      .update(updatePayload)
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update draft assessment: ${error.message}`);
    }

    const updated = data as ClinicalAssessmentInstance;

    await supabase.rpc('log_audit_event', {
      p_action: 'clinical_assessment.updated',
      p_entity_type: 'clinical_assessment_instance',
      p_entity_id: id,
      p_metadata: {
        assessment_identifier: updated.assessment_identifier,
        patient_id: updated.patient_id,
      },
      p_source: 'clinical_assessment_service',
    });

    return updated;
  },

  /**
   * Medico-legally finalize a draft clinical assessment.
   * Freezes historical structured data and stamps finalized_at and finalized_by.
   */
  async finalizeAssessment(
    id: string,
    finalizedBy?: string
  ): Promise<ClinicalAssessmentInstance> {
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
    const currentUserId = authData.user?.id || finalizedBy;
    if (!currentUserId) {
      throw new Error('User must be authenticated to finalize a clinical assessment.');
    }

    const nowIso = new Date().toISOString();

    const updatePayload: ClinicalAssessmentInstanceUpdate = {
      status: 'finalized',
      finalized_at: nowIso,
      finalized_by: currentUserId,
    };

    const { data, error } = await supabase
      .from('clinical_assessment_instances')
      .update(updatePayload)
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to finalize assessment: ${error.message}`);
    }

    const finalized = data as ClinicalAssessmentInstance;

    await supabase.rpc('log_audit_event', {
      p_action: 'clinical_assessment.finalized',
      p_entity_type: 'clinical_assessment_instance',
      p_entity_id: id,
      p_metadata: {
        assessment_identifier: finalized.assessment_identifier,
        patient_id: finalized.patient_id,
        finalized_by: currentUserId,
        finalized_at: nowIso,
      },
      p_source: 'clinical_assessment_service',
    });

    return finalized;
  },

  /**
   * Record a controlled amendment for a finalized assessment.
   * Requires an explicit amendment reason and records correcting practitioner.
   */
  async amendAssessment(
    id: string,
    input: AmendClinicalAssessmentInput
  ): Promise<ClinicalAssessmentInstance> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    if (!input.amendment_reason || !input.amendment_reason.trim()) {
      throw new Error('An explicit amendment reason is mandatory when correcting a finalized assessment.');
    }

    const existing = await this.getAssessmentById(id);
    if (!existing) {
      throw new Error('Assessment not found.');
    }

    if (existing.status !== 'finalized') {
      throw new Error(
        `Cannot amend an assessment in '${existing.status}' status. Only finalized assessments can be amended.`
      );
    }

    if (input.structured_data && existing.definition) {
      const validation = this.validatePayload(existing.definition, input.structured_data);
      if (!validation.valid) {
        throw new Error(`Amended payload validation failed: ${validation.errors.join('; ')}`);
      }
    }

    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id;
    if (!currentUserId) {
      throw new Error('User must be authenticated to amend a clinical assessment.');
    }

    const updatePayload: ClinicalAssessmentInstanceUpdate = {
      status: 'amended',
      amendment_reason: input.amendment_reason.trim(),
      corrected_by: currentUserId,
      ...(input.structured_data && { structured_data: input.structured_data }),
      ...(input.summary_findings !== undefined && { summary_findings: input.summary_findings }),
      ...(input.clinical_notes !== undefined && { clinical_notes: input.clinical_notes }),
    };

    const { data, error } = await supabase
      .from('clinical_assessment_instances')
      .update(updatePayload)
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to amend clinical assessment: ${error.message}`);
    }

    const amended = data as ClinicalAssessmentInstance;

    await supabase.rpc('log_audit_event', {
      p_action: 'clinical_assessment.amended',
      p_entity_type: 'clinical_assessment_instance',
      p_entity_id: id,
      p_metadata: {
        assessment_identifier: amended.assessment_identifier,
        patient_id: amended.patient_id,
        amendment_reason: input.amendment_reason.trim(),
        corrected_by: currentUserId,
      },
      p_source: 'clinical_assessment_service',
    });

    return amended;
  },
};
