import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  Exercise,
  ExerciseInsert,
  ExerciseUpdate,
  ExerciseCategory,
  ExerciseBodyRegion,
  HomeExerciseProgram,
  HomeExerciseProgramInsert,
  HomeExerciseProgramUpdate,
  HomeExerciseProgramWithRelations,
  HomeExerciseProgramItemWithExercise,
  HEPFilters,
  HEPStatus,
  ExerciseLaterality,
} from '../types/models';

export interface GetProgramsOptions extends HEPFilters {
  page?: number;
  limit?: number;
}

export interface GetProgramsResult {
  programs: HomeExerciseProgramWithRelations[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateProgramItemInput {
  exercise_id: string;
  order_index?: number;
  sets?: number | null;
  repetitions?: number | null;
  hold_seconds?: number | null;
  duration_minutes?: number | null;
  rest_seconds?: number | null;
  frequency?: string | null;
  intensity_load?: string | null;
  laterality?: ExerciseLaterality;
  instructions?: string | null;
  precautions?: string | null;
  notes?: string | null;
}

export interface CreateProgramInput {
  patient_id: string;
  episode_id?: string | null;
  clinical_visit_id?: string | null;
  prescribing_clinician_id: string;
  title: string;
  instructions?: string | null;
  start_date?: string;
  review_date?: string | null;
  status?: HEPStatus;
  items?: CreateProgramItemInput[];
}

export interface UpdateDraftProgramInput {
  title?: string;
  instructions?: string | null;
  start_date?: string;
  review_date?: string | null;
  items?: CreateProgramItemInput[];
}

/**
 * Valid allowed state transitions for Home Exercise Program V1.
 */
export const ALLOWED_HEP_TRANSITIONS: Record<HEPStatus, HEPStatus[]> = {
  draft: ['active', 'discontinued'],
  active: ['paused', 'completed', 'discontinued'],
  paused: ['active', 'discontinued'],
  completed: [],
  discontinued: [],
};

/**
 * Home Exercise Program (HEP) Service: Centralized data layer for HEP Foundation V1.
 * Strictly enforces practice isolation, immutable finalized prescriptions, and PostgreSQL RLS.
 */
export const hepService = {
  /**
   * Fetch exercises catalogue (system exercises + practice custom exercises).
   */
  async getExercises(options: {
    category?: ExerciseCategory;
    bodyRegion?: ExerciseBodyRegion;
    search?: string;
    activeOnly?: boolean;
  } = {}): Promise<Exercise[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    let query = supabase
      .from('exercises')
      .select('*')
      .or(`is_system.eq.true,practice_id.eq.${activePracticeId}`)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (options.activeOnly !== false) {
      query = query.eq('is_active', true);
    }

    if (options.category) {
      query = query.eq('category', options.category);
    }

    if (options.bodyRegion) {
      query = query.eq('body_region', options.bodyRegion);
    }

    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      query = query.or(
        `name.ilike.%${term}%,description.ilike.%${term}%,equipment.ilike.%${term}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load exercises: ${error.message}`);
    }

    return (data || []) as Exercise[];
  },

  /**
   * Fetch a single exercise by ID.
   */
  async getExerciseById(id: string): Promise<Exercise | null> {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load exercise: ${error.message}`);
    }

    return (data as Exercise) || null;
  },

  /**
   * Create a practice-owned custom exercise.
   */
  async createCustomExercise(input: {
    name: string;
    category?: ExerciseCategory;
    body_region?: ExerciseBodyRegion;
    default_laterality?: ExerciseLaterality;
    equipment?: string | null;
    description?: string | null;
    instructions?: string | null;
    precautions?: string | null;
  }): Promise<Exercise> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const insertPayload: ExerciseInsert = {
      practice_id: activePracticeId,
      is_system: false,
      name: input.name.trim(),
      category: input.category || 'other',
      body_region: input.body_region || 'other',
      default_laterality: input.default_laterality || 'na',
      equipment: input.equipment?.trim() || null,
      description: input.description?.trim() || null,
      instructions: input.instructions?.trim() || null,
      precautions: input.precautions?.trim() || null,
      is_active: true,
    };

    const { data, error } = await supabase
      .from('exercises')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create exercise: ${error.message}`);
    }

    const created = data as Exercise;

    await supabase.rpc('log_audit_event', {
      p_action: 'exercise.created',
      p_entity_type: 'exercise',
      p_entity_id: created.id,
      p_metadata: {
        name: created.name,
        category: created.category,
        body_region: created.body_region,
      },
      p_source: 'hep_service',
    });

    return created;
  },

  /**
   * Update custom exercise definition.
   */
  async updateCustomExercise(id: string, updates: ExerciseUpdate): Promise<Exercise> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('exercises')
      .update(updates)
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .eq('is_system', false)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update exercise: ${error.message}`);
    }

    const updated = data as Exercise;

    await supabase.rpc('log_audit_event', {
      p_action: 'exercise.updated',
      p_entity_type: 'exercise',
      p_entity_id: updated.id,
      p_metadata: {
        name: updated.name,
      },
      p_source: 'hep_service',
    });

    return updated;
  },

  /**
   * Archive / soft-delete custom exercise.
   */
  async archiveCustomExercise(id: string): Promise<Exercise> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('exercises')
      .update({ is_active: false })
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .eq('is_system', false)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to archive exercise: ${error.message}`);
    }

    const archived = data as Exercise;

    await supabase.rpc('log_audit_event', {
      p_action: 'exercise.archived',
      p_entity_type: 'exercise',
      p_entity_id: archived.id,
      p_metadata: {
        name: archived.name,
      },
      p_source: 'hep_service',
    });

    return archived;
  },

  /**
   * Fetch paginated list of home exercise programs with joined relations.
   */
  async getPrograms(options: GetProgramsOptions = {}): Promise<GetProgramsResult> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('home_exercise_programs')
      .select(
        `
        *,
        patient:patients!fk_hep_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_hep_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        clinical_visit:clinical_visits!fk_hep_visit_patient_practice (
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

    // Filter by clinician
    if (options.clinicianId) {
      query = query.eq('prescribing_clinician_id', options.clinicianId);
    }

    // Filter by status
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    // Filter by date range
    if (options.startDate) {
      query = query.gte('start_date', options.startDate);
    }
    if (options.endDate) {
      query = query.lte('start_date', options.endDate);
    }

    // Filter by search query
    if (options.searchQuery && options.searchQuery.trim()) {
      const term = options.searchQuery.trim();
      query = query.or(`title.ilike.%${term}%,program_identifier.ilike.%${term}%`);
    }

    const { data: rawPrograms, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to load home exercise programs: ${error.message}`);
    }

    const totalCount = count || 0;
    const programsList = (rawPrograms || []) as unknown as HomeExerciseProgramWithRelations[];

    // Fetch clinician profiles for prescribing clinicians and finalizers
    const profileIds = Array.from(
      new Set(
        programsList
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
        for (const prog of programsList) {
          prog.prescribing_clinician = profileMap.get(prog.prescribing_clinician_id) || null;
          prog.finalizer = prog.finalized_by ? profileMap.get(prog.finalized_by) || null : null;
        }
      }
    }

    return {
      programs: programsList,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  },

  /**
   * Fetch single HEP program by ID with complete relations and prescribed items.
   */
  async getProgramById(id: string): Promise<HomeExerciseProgramWithRelations | null> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('home_exercise_programs')
      .select(
        `
        *,
        patient:patients!fk_hep_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_hep_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        clinical_visit:clinical_visits!fk_hep_visit_patient_practice (
          id,
          visit_identifier,
          status,
          actual_start,
          actual_end
        )
      `
      )
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load home exercise program: ${error.message}`);
    }

    if (!data) return null;

    const program = data as unknown as HomeExerciseProgramWithRelations;

    // Load clinician profiles
    const profileIds = [program.prescribing_clinician_id, program.finalized_by].filter(
      (p): p is string => Boolean(p)
    );
    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, first_name, last_name')
        .in('id', profileIds);

      if (profiles) {
        const profileMap = new Map(profiles.map((p) => [p.id, p]));
        program.prescribing_clinician = profileMap.get(program.prescribing_clinician_id) || null;
        program.finalizer = program.finalized_by ? profileMap.get(program.finalized_by) || null : null;
      }
    }

    // Load prescribed exercise items
    const { data: itemsData, error: itemsError } = await supabase
      .from('home_exercise_program_items')
      .select(
        `
        *,
        exercise:exercises!fk_hep_items_exercise (*)
      `
      )
      .eq('program_id', id)
      .eq('practice_id', activePracticeId)
      .order('order_index', { ascending: true });

    if (itemsError) {
      throw new Error(`Failed to load HEP items: ${itemsError.message}`);
    }

    program.items = (itemsData || []) as unknown as HomeExerciseProgramItemWithExercise[];

    return program;
  },

  /**
   * Fetch all HEP programs linked to a specific clinical visit.
   */
  async getProgramsForVisit(visitId: string): Promise<HomeExerciseProgramWithRelations[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('home_exercise_programs')
      .select(
        `
        *,
        patient:patients!fk_hep_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name
        )
      `
      )
      .eq('practice_id', activePracticeId)
      .eq('clinical_visit_id', visitId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load visit HEP programs: ${error.message}`);
    }

    return (data || []) as unknown as HomeExerciseProgramWithRelations[];
  },

  /**
   * Fetch all HEP programs for a specific patient.
   */
  async getProgramsForPatient(patientId: string): Promise<HomeExerciseProgramWithRelations[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('home_exercise_programs')
      .select(
        `
        *,
        episode:episodes_of_care!fk_hep_episode_patient_practice (
          id,
          episode_identifier,
          title
        )
      `
      )
      .eq('practice_id', activePracticeId)
      .eq('patient_id', patientId)
      .order('start_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to load patient HEP programs: ${error.message}`);
    }

    return (data || []) as unknown as HomeExerciseProgramWithRelations[];
  },

  /**
   * Create a new Home Exercise Program (default draft status).
   */
  async createProgram(input: CreateProgramInput): Promise<HomeExerciseProgram> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    if (!input.title || !input.title.trim()) {
      throw new Error('Program title is required.');
    }

    // Generate atomic sequential identifier
    const { data: identifierData, error: idError } = await supabase.rpc(
      'generate_next_hep_identifier',
      { p_practice_id: activePracticeId }
    );

    if (idError) {
      throw new Error(`Identifier generation failed: ${idError.message}`);
    }

    const programIdentifier = identifierData as string;
    const initialStatus: HEPStatus = input.status || 'draft';

    const insertPayload: HomeExerciseProgramInsert = {
      practice_id: activePracticeId,
      patient_id: input.patient_id,
      episode_id: input.episode_id || null,
      clinical_visit_id: input.clinical_visit_id || null,
      prescribing_clinician_id: input.prescribing_clinician_id,
      program_identifier: programIdentifier,
      title: input.title.trim(),
      instructions: input.instructions?.trim() || null,
      start_date: input.start_date || new Date().toISOString().split('T')[0],
      review_date: input.review_date || null,
      status: initialStatus,
    };

    const { data: programData, error: programError } = await supabase
      .from('home_exercise_programs')
      .insert(insertPayload)
      .select()
      .single();

    if (programError) {
      throw new Error(`Failed to create home exercise program: ${programError.message}`);
    }

    const createdProgram = programData as HomeExerciseProgram;

    // Insert prescribed items if provided
    if (input.items && input.items.length > 0) {
      const itemsPayload = input.items.map((item, idx) => ({
        practice_id: activePracticeId,
        program_id: createdProgram.id,
        exercise_id: item.exercise_id,
        order_index: item.order_index !== undefined ? item.order_index : idx + 1,
        sets: item.sets || null,
        repetitions: item.repetitions || null,
        hold_seconds: item.hold_seconds || null,
        duration_minutes: item.duration_minutes || null,
        rest_seconds: item.rest_seconds || null,
        frequency: item.frequency?.trim() || null,
        intensity_load: item.intensity_load?.trim() || null,
        laterality: item.laterality || 'na',
        instructions: item.instructions?.trim() || null,
        precautions: item.precautions?.trim() || null,
        notes: item.notes?.trim() || null,
      }));

      const { error: itemsInsertError } = await supabase
        .from('home_exercise_program_items')
        .insert(itemsPayload);

      if (itemsInsertError) {
        throw new Error(`Program created but items insertion failed: ${itemsInsertError.message}`);
      }
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_action: 'hep.created',
      p_entity_type: 'home_exercise_program',
      p_entity_id: createdProgram.id,
      p_metadata: {
        program_identifier: createdProgram.program_identifier,
        patient_id: createdProgram.patient_id,
        episode_id: createdProgram.episode_id,
        prescribing_clinician_id: createdProgram.prescribing_clinician_id,
        status: createdProgram.status,
        item_count: input.items ? input.items.length : 0,
      },
      p_source: 'hep_service',
    });

    return createdProgram;
  },

  /**
   * Update an existing draft HEP program and its prescription items.
   * Finalized (active, paused, completed, discontinued) programs cannot have items modified.
   */
  async updateDraftProgram(programId: string, input: UpdateDraftProgramInput): Promise<HomeExerciseProgram> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const existing = await this.getProgramById(programId);
    if (!existing) {
      throw new Error('Home exercise program not found.');
    }

    if (existing.status !== 'draft') {
      throw new Error(`Cannot modify program in '${existing.status}' status. Only draft programs are mutable.`);
    }

    const updatePayload: HomeExerciseProgramUpdate = {};
    if (input.title !== undefined) updatePayload.title = input.title.trim();
    if (input.instructions !== undefined) updatePayload.instructions = input.instructions ? input.instructions.trim() : null;
    if (input.start_date !== undefined) updatePayload.start_date = input.start_date;
    if (input.review_date !== undefined) updatePayload.review_date = input.review_date;

    const { data: updatedData, error: updateError } = await supabase
      .from('home_exercise_programs')
      .update(updatePayload)
      .eq('id', programId)
      .eq('practice_id', activePracticeId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update draft HEP: ${updateError.message}`);
    }

    // If items provided, re-sync items (delete existing items and insert new ones)
    if (input.items !== undefined) {
      await supabase
        .from('home_exercise_program_items')
        .delete()
        .eq('program_id', programId)
        .eq('practice_id', activePracticeId);

      if (input.items.length > 0) {
        const itemsPayload = input.items.map((item, idx) => ({
          practice_id: activePracticeId,
          program_id: programId,
          exercise_id: item.exercise_id,
          order_index: item.order_index !== undefined ? item.order_index : idx + 1,
          sets: item.sets || null,
          repetitions: item.repetitions || null,
          hold_seconds: item.hold_seconds || null,
          duration_minutes: item.duration_minutes || null,
          rest_seconds: item.rest_seconds || null,
          frequency: item.frequency?.trim() || null,
          intensity_load: item.intensity_load?.trim() || null,
          laterality: item.laterality || 'na',
          instructions: item.instructions?.trim() || null,
          precautions: item.precautions?.trim() || null,
          notes: item.notes?.trim() || null,
        }));

        const { error: itemsInsertError } = await supabase
          .from('home_exercise_program_items')
          .insert(itemsPayload);

        if (itemsInsertError) {
          throw new Error(`Failed to re-sync HEP items: ${itemsInsertError.message}`);
        }
      }
    }

    const updatedProgram = updatedData as HomeExerciseProgram;

    await supabase.rpc('log_audit_event', {
      p_action: 'hep.updated',
      p_entity_type: 'home_exercise_program',
      p_entity_id: programId,
      p_metadata: {
        program_identifier: existing.program_identifier,
        patient_id: existing.patient_id,
      },
      p_source: 'hep_service',
    });

    return updatedProgram;
  },

  /**
   * Activate a draft HEP program (clinically finalizes prescription).
   */
  async activateProgram(programId: string): Promise<HomeExerciseProgram> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const existing = await this.getProgramById(programId);
    if (!existing) {
      throw new Error('Home exercise program not found.');
    }

    if (existing.status !== 'draft') {
      throw new Error(`Cannot activate program from status '${existing.status}'.`);
    }

    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id;
    if (!currentUserId) {
      throw new Error('User must be authenticated to activate a home exercise program.');
    }

    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('home_exercise_programs')
      .update({
        status: 'active',
        finalized_at: nowIso,
        finalized_by: currentUserId,
      })
      .eq('id', programId)
      .eq('practice_id', activePracticeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to activate home exercise program: ${error.message}`);
    }

    const activated = data as HomeExerciseProgram;

    await supabase.rpc('log_audit_event', {
      p_action: 'hep.activated',
      p_entity_type: 'home_exercise_program',
      p_entity_id: programId,
      p_metadata: {
        program_identifier: activated.program_identifier,
        patient_id: activated.patient_id,
        finalized_by: currentUserId,
        finalized_at: nowIso,
      },
      p_source: 'hep_service',
    });

    return activated;
  },

  /**
   * Pause an active HEP program.
   */
  async pauseProgram(programId: string, reason?: string): Promise<HomeExerciseProgram> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const existing = await this.getProgramById(programId);
    if (!existing) {
      throw new Error('Home exercise program not found.');
    }

    if (existing.status !== 'active') {
      throw new Error(`Only active programs can be paused. Current status: ${existing.status}`);
    }

    const { data, error } = await supabase
      .from('home_exercise_programs')
      .update({ status: 'paused' })
      .eq('id', programId)
      .eq('practice_id', activePracticeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to pause home exercise program: ${error.message}`);
    }

    const paused = data as HomeExerciseProgram;

    await supabase.rpc('log_audit_event', {
      p_action: 'hep.paused',
      p_entity_type: 'home_exercise_program',
      p_entity_id: programId,
      p_metadata: {
        program_identifier: paused.program_identifier,
        patient_id: paused.patient_id,
        reason: reason || null,
      },
      p_source: 'hep_service',
    });

    return paused;
  },

  /**
   * Resume a paused HEP program back to active.
   */
  async resumeProgram(programId: string): Promise<HomeExerciseProgram> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const existing = await this.getProgramById(programId);
    if (!existing) {
      throw new Error('Home exercise program not found.');
    }

    if (existing.status !== 'paused') {
      throw new Error(`Only paused programs can be resumed. Current status: ${existing.status}`);
    }

    const { data, error } = await supabase
      .from('home_exercise_programs')
      .update({ status: 'active' })
      .eq('id', programId)
      .eq('practice_id', activePracticeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to resume home exercise program: ${error.message}`);
    }

    const resumed = data as HomeExerciseProgram;

    await supabase.rpc('log_audit_event', {
      p_action: 'hep.activated',
      p_entity_type: 'home_exercise_program',
      p_entity_id: programId,
      p_metadata: {
        program_identifier: resumed.program_identifier,
        patient_id: resumed.patient_id,
        resumed_from: 'paused',
      },
      p_source: 'hep_service',
    });

    return resumed;
  },

  /**
   * Complete an active HEP program.
   */
  async completeProgram(programId: string): Promise<HomeExerciseProgram> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const existing = await this.getProgramById(programId);
    if (!existing) {
      throw new Error('Home exercise program not found.');
    }

    if (existing.status !== 'active') {
      throw new Error(`Only active programs can be completed. Current status: ${existing.status}`);
    }

    const { data, error } = await supabase
      .from('home_exercise_programs')
      .update({ status: 'completed' })
      .eq('id', programId)
      .eq('practice_id', activePracticeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to complete home exercise program: ${error.message}`);
    }

    const completed = data as HomeExerciseProgram;

    await supabase.rpc('log_audit_event', {
      p_action: 'hep.completed',
      p_entity_type: 'home_exercise_program',
      p_entity_id: programId,
      p_metadata: {
        program_identifier: completed.program_identifier,
        patient_id: completed.patient_id,
      },
      p_source: 'hep_service',
    });

    return completed;
  },

  /**
   * Discontinue an HEP program (from draft, active, or paused).
   */
  async discontinueProgram(programId: string, reason: string): Promise<HomeExerciseProgram> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    if (!reason || !reason.trim()) {
      throw new Error('A reason is strictly required when discontinuing a Home Exercise Program.');
    }

    const existing = await this.getProgramById(programId);
    if (!existing) {
      throw new Error('Home exercise program not found.');
    }

    if (existing.status === 'completed' || existing.status === 'discontinued') {
      throw new Error(`Cannot discontinue a program in terminal '${existing.status}' status.`);
    }

    const { data, error } = await supabase
      .from('home_exercise_programs')
      .update({
        status: 'discontinued',
        discontinued_reason: reason.trim(),
      })
      .eq('id', programId)
      .eq('practice_id', activePracticeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to discontinue home exercise program: ${error.message}`);
    }

    const discontinued = data as HomeExerciseProgram;

    await supabase.rpc('log_audit_event', {
      p_action: 'hep.discontinued',
      p_entity_type: 'home_exercise_program',
      p_entity_id: programId,
      p_metadata: {
        program_identifier: discontinued.program_identifier,
        patient_id: discontinued.patient_id,
        previous_status: existing.status,
        reason: reason.trim(),
      },
      p_source: 'hep_service',
    });

    return discontinued;
  },
};
