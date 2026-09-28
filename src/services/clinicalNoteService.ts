import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  ClinicalNote,
  ClinicalNoteInsert,
  ClinicalNoteUpdate,
  ClinicalNoteStatus,
  ClinicalNoteType,
  ClinicalNoteWithRelations,
  ClinicalNoteFilters,
} from '../types/models';

export interface GetClinicalNotesOptions extends ClinicalNoteFilters {
  page?: number;
  limit?: number;
}

export interface GetClinicalNotesResult {
  notes: ClinicalNoteWithRelations[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateClinicalNoteInput {
  clinical_visit_id: string;
  patient_id: string;
  episode_id?: string | null;
  author_id: string;
  note_type?: ClinicalNoteType;
  parent_note_id?: string | null;
  status?: ClinicalNoteStatus;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  amendment_reason?: string | null;
}

export interface UpdateDraftNoteInput {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface CreateAddendumInput {
  parent_note_id: string;
  author_id: string;
  amendment_reason: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

/**
 * Valid allowed state transitions for Clinical Note V1.
 */
export const ALLOWED_NOTE_TRANSITIONS: Record<ClinicalNoteStatus, ClinicalNoteStatus[]> = {
  draft: ['finalized'],
  finalized: ['amended'],
  amended: [],
};

/**
 * Clinical Note Service: Centralized data access layer for Clinical Note / SOAP Foundation V1.
 * Strictly enforces practice isolation, immutable finalized records, and PostgreSQL RLS.
 */
export const clinicalNoteService = {
  /**
   * Fetch paginated list of clinical notes with joined relations.
   */
  async getClinicalNotes(options: GetClinicalNotesOptions = {}): Promise<GetClinicalNotesResult> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('clinical_notes')
      .select(
        `
        *,
        patient:patients!fk_clinical_notes_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_clinical_notes_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        clinical_visit:clinical_visits!fk_clinical_notes_visit_patient_practice (
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

    // Status filter
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    // Note type filter
    if (options.noteType && options.noteType !== 'all') {
      query = query.eq('note_type', options.noteType);
    }

    // Patient filter
    if (options.patientId) {
      query = query.eq('patient_id', options.patientId);
    }

    // Episode filter
    if (options.episodeId) {
      query = query.eq('episode_id', options.episodeId);
    }

    // Visit filter
    if (options.visitId) {
      query = query.eq('clinical_visit_id', options.visitId);
    }

    // Author filter
    if (options.authorId) {
      query = query.eq('author_id', options.authorId);
    }

    const { data: rawNotes, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to load clinical notes: ${error.message}`);
    }

    const totalCount = count || 0;
    const notesList = (rawNotes || []) as unknown as ClinicalNoteWithRelations[];

    // Fetch clinician profiles for authors and finalizers
    const profileIds = Array.from(
      new Set(
        notesList
          .flatMap((n) => [n.author_id, n.finalized_by])
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
        for (const note of notesList) {
          note.author = profileMap.get(note.author_id) || null;
          note.finalizer = note.finalized_by ? profileMap.get(note.finalized_by) || null : null;
        }
      }
    }

    return {
      notes: notesList,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  },

  /**
   * Fetch single clinical note by ID with complete relations, including any child addenda.
   */
  async getClinicalNoteById(id: string): Promise<ClinicalNoteWithRelations | null> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('clinical_notes')
      .select(
        `
        *,
        patient:patients!fk_clinical_notes_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_clinical_notes_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        clinical_visit:clinical_visits!fk_clinical_notes_visit_patient_practice (
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
      throw new Error(`Failed to load clinical note: ${error.message}`);
    }

    if (!data) return null;

    const note = data as unknown as ClinicalNoteWithRelations;

    // Load author & finalizer profiles
    const profileIds = [note.author_id, note.finalized_by].filter((p): p is string => Boolean(p));
    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, first_name, last_name')
        .in('id', profileIds);

      if (profiles) {
        const profileMap = new Map(profiles.map((p) => [p.id, p]));
        note.author = profileMap.get(note.author_id) || null;
        note.finalizer = note.finalized_by ? profileMap.get(note.finalized_by) || null : null;
      }
    }

    // Load parent note if this is an addendum
    if (note.parent_note_id) {
      const { data: parent } = await supabase
        .from('clinical_notes')
        .select('id, note_identifier, note_type, status')
        .eq('id', note.parent_note_id)
        .maybeSingle();

      note.parent_note = parent || null;
    }

    // Load child addenda if this is a primary note
    const { data: addendaData } = await supabase
      .from('clinical_notes')
      .select('*')
      .eq('parent_note_id', id)
      .eq('practice_id', activePracticeId)
      .order('created_at', { ascending: true });

    if (addendaData && addendaData.length > 0) {
      const addenda = addendaData as unknown as ClinicalNoteWithRelations[];
      const addendaAuthorIds = Array.from(new Set(addenda.map((a) => a.author_id)));
      if (addendaAuthorIds.length > 0) {
        const { data: addendaProfiles } = await supabase
          .from('profiles')
          .select('id, display_name, first_name, last_name')
          .in('id', addendaAuthorIds);

        if (addendaProfiles) {
          const addendaMap = new Map(addendaProfiles.map((p) => [p.id, p]));
          for (const a of addenda) {
            a.author = addendaMap.get(a.author_id) || null;
          }
        }
      }
      note.addenda = addenda;
    } else {
      note.addenda = [];
    }

    return note;
  },

  /**
   * Check if a primary SOAP note already exists for a clinical visit.
   */
  async getPrimaryNoteForVisit(visitId: string): Promise<ClinicalNoteWithRelations | null> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('clinical_notes')
      .select('id, note_identifier, status, note_type, subjective, objective, assessment, plan, author_id, finalized_at')
      .eq('practice_id', activePracticeId)
      .eq('clinical_visit_id', visitId)
      .eq('note_type', 'soap')
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check existing note for visit: ${error.message}`);
    }

    return (data as unknown as ClinicalNoteWithRelations) || null;
  },

  /**
   * Create a new Clinical Note (default primary SOAP note).
   */
  async createClinicalNote(input: CreateClinicalNoteInput): Promise<ClinicalNote> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const noteType = input.note_type || 'soap';

    // If creating primary SOAP note, verify visit doesn't already have one
    if (noteType === 'soap') {
      const existing = await this.getPrimaryNoteForVisit(input.clinical_visit_id);
      if (existing) {
        throw new Error(
          `Visit already has a primary clinical note (${existing.note_identifier}). Only one primary SOAP note is permitted per visit. To modify a finalized note, create an addendum.`
        );
      }
    }

    const insertPayload: ClinicalNoteInsert = {
      practice_id: activePracticeId,
      clinical_visit_id: input.clinical_visit_id,
      patient_id: input.patient_id,
      episode_id: input.episode_id || null,
      author_id: input.author_id,
      note_type: noteType,
      parent_note_id: input.parent_note_id || null,
      status: input.status || 'draft',
      subjective: input.subjective || '',
      objective: input.objective || '',
      assessment: input.assessment || '',
      plan: input.plan || '',
      amendment_reason: input.amendment_reason || null,
    };

    const { data, error } = await supabase
      .from('clinical_notes')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create clinical note: ${error.message}`);
    }

    const createdNote = data as ClinicalNote;

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_action: 'clinical_note.created',
      p_entity_type: 'clinical_note',
      p_entity_id: createdNote.id,
      p_metadata: {
        note_identifier: createdNote.note_identifier,
        clinical_visit_id: createdNote.clinical_visit_id,
        patient_id: createdNote.patient_id,
        author_id: createdNote.author_id,
        note_type: createdNote.note_type,
        status: createdNote.status,
      },
      p_source: 'clinical_note_service',
    });

    return createdNote;
  },

  /**
   * Update a draft clinical note.
   * Finalized and amended notes cannot be edited.
   */
  async updateDraftNote(noteId: string, input: UpdateDraftNoteInput): Promise<ClinicalNote> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    // Verify note is in draft status
    const existing = await this.getClinicalNoteById(noteId);
    if (!existing) {
      throw new Error('Clinical note not found.');
    }

    if (existing.status !== 'draft') {
      throw new Error(`Cannot edit note in '${existing.status}' status. Finalized notes are immutable. Create an addendum to amend.`);
    }

    const updatePayload: ClinicalNoteUpdate = {
      subjective: input.subjective !== undefined ? input.subjective : existing.subjective,
      objective: input.objective !== undefined ? input.objective : existing.objective,
      assessment: input.assessment !== undefined ? input.assessment : existing.assessment,
      plan: input.plan !== undefined ? input.plan : existing.plan,
    };

    const { data, error } = await supabase
      .from('clinical_notes')
      .update(updatePayload)
      .eq('id', noteId)
      .eq('practice_id', activePracticeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update clinical note: ${error.message}`);
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'clinical_note.updated',
      p_entity_type: 'clinical_note',
      p_entity_id: noteId,
      p_metadata: {
        note_identifier: existing.note_identifier,
        patient_id: existing.patient_id,
      },
      p_source: 'clinical_note_service',
    });

    return data as ClinicalNote;
  },

  /**
   * Finalize a draft clinical note. Medico-legally locks content.
   */
  async finalizeNote(noteId: string): Promise<ClinicalNote> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const existing = await this.getClinicalNoteById(noteId);
    if (!existing) {
      throw new Error('Clinical note not found.');
    }

    if (existing.status !== 'draft') {
      throw new Error(`Note is already in '${existing.status}' status.`);
    }

    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id;
    if (!currentUserId) {
      throw new Error('User must be authenticated to finalize a clinical note.');
    }

    const nowIso = new Date().toISOString();

    const updatePayload: ClinicalNoteUpdate = {
      status: 'finalized',
      finalized_at: nowIso,
      finalized_by: currentUserId,
    };

    const { data, error } = await supabase
      .from('clinical_notes')
      .update(updatePayload)
      .eq('id', noteId)
      .eq('practice_id', activePracticeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to finalize clinical note: ${error.message}`);
    }

    const finalizedNote = data as ClinicalNote;

    await supabase.rpc('log_audit_event', {
      p_action: 'clinical_note.finalized',
      p_entity_type: 'clinical_note',
      p_entity_id: noteId,
      p_metadata: {
        note_identifier: finalizedNote.note_identifier,
        patient_id: finalizedNote.patient_id,
        finalized_by: currentUserId,
        finalized_at: nowIso,
      },
      p_source: 'clinical_note_service',
    });

    return finalizedNote;
  },

  /**
   * Create an addendum note for a finalized clinical note.
   */
  async createAddendum(input: CreateAddendumInput): Promise<ClinicalNote> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    if (!input.amendment_reason || !input.amendment_reason.trim()) {
      throw new Error('An amendment reason is strictly required when creating an addendum.');
    }

    // Verify parent note
    const parentNote = await this.getClinicalNoteById(input.parent_note_id);
    if (!parentNote) {
      throw new Error('Parent clinical note not found.');
    }

    if (parentNote.status !== 'finalized' && parentNote.status !== 'amended') {
      throw new Error('Addenda can only be appended to finalized or amended notes.');
    }

    const nowIso = new Date().toISOString();

    const insertPayload: ClinicalNoteInsert = {
      practice_id: activePracticeId,
      clinical_visit_id: parentNote.clinical_visit_id,
      patient_id: parentNote.patient_id,
      episode_id: parentNote.episode_id,
      author_id: input.author_id,
      note_type: 'addendum',
      parent_note_id: parentNote.id,
      status: 'finalized',
      subjective: input.subjective || '',
      objective: input.objective || '',
      assessment: input.assessment || '',
      plan: input.plan || '',
      amendment_reason: input.amendment_reason.trim(),
      finalized_at: nowIso,
      finalized_by: input.author_id,
    };

    const { data, error } = await supabase
      .from('clinical_notes')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create addendum: ${error.message}`);
    }

    const addendumNote = data as ClinicalNote;

    // Log audit events
    await supabase.rpc('log_audit_event', {
      p_action: 'clinical_note.addendum_created',
      p_entity_type: 'clinical_note',
      p_entity_id: addendumNote.id,
      p_metadata: {
        note_identifier: addendumNote.note_identifier,
        parent_note_id: parentNote.id,
        amendment_reason: input.amendment_reason,
      },
      p_source: 'clinical_note_service',
    });

    await supabase.rpc('log_audit_event', {
      p_action: 'clinical_note.amended',
      p_entity_type: 'clinical_note',
      p_entity_id: parentNote.id,
      p_metadata: {
        parent_identifier: parentNote.note_identifier,
        addendum_id: addendumNote.id,
        addendum_identifier: addendumNote.note_identifier,
      },
      p_source: 'clinical_note_service',
    });

    return addendumNote;
  },
};
