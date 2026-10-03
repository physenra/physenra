import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  ClinicalVisit,
  ClinicalVisitInsert,
  ClinicalVisitUpdate,
  ClinicalVisitStatus,
  ClinicalVisitWithRelations,
  ClinicalVisitFilters,
} from '../types/models';
import { appointmentService } from './appointmentService';

export interface GetClinicalVisitsOptions extends ClinicalVisitFilters {
  page?: number;
  limit?: number;
}

export interface GetClinicalVisitsResult {
  visits: ClinicalVisitWithRelations[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateClinicalVisitInput {
  patient_id: string;
  episode_id?: string | null;
  appointment_id?: string | null;
  physiotherapist_id: string;
  status?: ClinicalVisitStatus;
  actual_start?: string | null;
  actual_end?: string | null;
  duration_minutes?: number | null;
  location_mode?: 'clinic' | 'home' | 'telehealth' | 'other';
  encounter_notes?: string | null;
}

/**
 * Valid allowed state machine transitions for Clinical Visit V1.
 */
export const ALLOWED_VISIT_TRANSITIONS: Record<ClinicalVisitStatus, ClinicalVisitStatus[]> = {
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'incomplete', 'cancelled'],
  incomplete: ['in_progress', 'cancelled'],
  completed: [],
  cancelled: [],
};

/**
 * Clinical Visit Service: Centralized data access layer for Clinical Visit Foundation V1.
 * Strictly enforces practice isolation, encounter lifecycle transitions, and PostgreSQL RLS.
 */
export const clinicalVisitService = {
  /**
   * Fetch paginated list of clinical visits with joined relations.
   */
  async getClinicalVisits(options: GetClinicalVisitsOptions = {}): Promise<GetClinicalVisitsResult> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('clinical_visits')
      .select(
        `
        *,
        patient:patients!fk_clinical_visits_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email,
          date_of_birth
        ),
        episode:episodes_of_care!fk_clinical_visits_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        appointment:appointments!fk_clinical_visits_appointment_patient_practice (
          id,
          appointment_identifier,
          status,
          scheduled_start,
          scheduled_end,
          appointment_type
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

    // Location mode filter
    if (options.locationMode && options.locationMode !== 'all') {
      query = query.eq('location_mode', options.locationMode);
    }

    // Patient filter
    if (options.patientId) {
      query = query.eq('patient_id', options.patientId);
    }

    // Episode filter
    if (options.episodeId) {
      query = query.eq('episode_id', options.episodeId);
    }

    // Physiotherapist filter
    if (options.physiotherapistId) {
      query = query.eq('physiotherapist_id', options.physiotherapistId);
    }

    // Single Date filter (actual_start on that day)
    if (options.date) {
      const dayStart = `${options.date}T00:00:00.000Z`;
      const dayEnd = `${options.date}T23:59:59.999Z`;
      query = query.gte('actual_start', dayStart).lte('actual_start', dayEnd);
    }

    // Date range filters
    if (options.startDate) {
      query = query.gte('actual_start', options.startDate);
    }
    if (options.endDate) {
      query = query.lte('actual_start', options.endDate);
    }

    const { data: rawVisits, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to load clinical visits: ${error.message}`);
    }

    const totalCount = count || 0;
    const visitsList = (rawVisits || []) as unknown as ClinicalVisitWithRelations[];

    // Fetch clinician profiles for display
    const clinicianIds = Array.from(new Set(visitsList.map((v) => v.physiotherapist_id))).filter(Boolean);
    if (clinicianIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, first_name, last_name')
        .in('id', clinicianIds);

      if (profiles) {
        const profileMap = new Map(profiles.map((p) => [p.id, p]));
        for (const visit of visitsList) {
          visit.physiotherapist = profileMap.get(visit.physiotherapist_id) || null;
        }
      }
    }

    return {
      visits: visitsList,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  },

  /**
   * Fetch single clinical visit by ID with complete relations.
   */
  async getClinicalVisitById(id: string): Promise<ClinicalVisitWithRelations | null> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('clinical_visits')
      .select(
        `
        *,
        patient:patients!fk_clinical_visits_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email,
          date_of_birth
        ),
        episode:episodes_of_care!fk_clinical_visits_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        appointment:appointments!fk_clinical_visits_appointment_patient_practice (
          id,
          appointment_identifier,
          status,
          scheduled_start,
          scheduled_end,
          appointment_type
        )
      `
      )
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load clinical visit: ${error.message}`);
    }

    if (!data) return null;

    const visit = data as unknown as ClinicalVisitWithRelations;

    // Load physiotherapist profile
    if (visit.physiotherapist_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, first_name, last_name')
        .eq('id', visit.physiotherapist_id)
        .maybeSingle();

      visit.physiotherapist = profile || null;
    }

    return visit;
  },

  /**
   * Check if a clinical visit already exists for an appointment.
   */
  async getClinicalVisitByAppointmentId(appointmentId: string): Promise<ClinicalVisit | null> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('clinical_visits')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('practice_id', activePracticeId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check appointment visit: ${error.message}`);
    }

    return (data as ClinicalVisit) || null;
  },

  /**
   * Create a new Clinical Visit record.
   */
  async createClinicalVisit(input: CreateClinicalVisitInput): Promise<ClinicalVisit> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    // Verify appointment duplicate prevention if appointment_id provided
    if (input.appointment_id) {
      const existing = await this.getClinicalVisitByAppointmentId(input.appointment_id);
      if (existing) {
        throw new Error(
          `A clinical visit (${existing.visit_identifier}) already exists for this appointment.`
        );
      }
    }

    // Auto-calculate duration if start and end provided
    let duration = input.duration_minutes;
    if (!duration && input.actual_start && input.actual_end) {
      const startMs = new Date(input.actual_start).getTime();
      const endMs = new Date(input.actual_end).getTime();
      if (endMs > startMs) {
        duration = Math.round((endMs - startMs) / (1000 * 60));
      }
    }

    const insertPayload: ClinicalVisitInsert = {
      practice_id: activePracticeId,
      patient_id: input.patient_id,
      episode_id: input.episode_id || null,
      appointment_id: input.appointment_id || null,
      physiotherapist_id: input.physiotherapist_id,
      status: input.status || 'scheduled',
      actual_start: input.actual_start || null,
      actual_end: input.actual_end || null,
      duration_minutes: duration || null,
      location_mode: input.location_mode || 'clinic',
      encounter_notes: input.encounter_notes || null,
    };

    const { data, error } = await supabase
      .from('clinical_visits')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create clinical visit: ${error.message}`);
    }

    const createdVisit = data as ClinicalVisit;

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_action: 'clinical_visit.created',
      p_entity_type: 'clinical_visit',
      p_entity_id: createdVisit.id,
      p_metadata: {
        visit_identifier: createdVisit.visit_identifier,
        patient_id: createdVisit.patient_id,
        appointment_id: createdVisit.appointment_id,
        status: createdVisit.status,
      },
      p_source: 'clinical_visit_service',
    });

    return createdVisit;
  },

  /**
   * Start a Clinical Visit from an eligible appointment.
   * Creates the visit and moves the appointment to 'in_progress'.
   */
  async startClinicalVisitFromAppointment(appointmentId: string): Promise<ClinicalVisit> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    // Check existing visit
    const existing = await this.getClinicalVisitByAppointmentId(appointmentId);
    if (existing) {
      return existing;
    }

    // Retrieve appointment
    const appointment = await appointmentService.getAppointmentById(appointmentId);
    if (!appointment) {
      throw new Error('Appointment not found.');
    }

    if (['cancelled', 'no_show', 'completed', 'documentation_completed'].includes(appointment.status)) {
      throw new Error(`Cannot start clinical visit for an appointment with status: ${appointment.status}`);
    }

    const nowIso = new Date().toISOString();

    // Create visit in in_progress status
    const visit = await this.createClinicalVisit({
      patient_id: appointment.patient_id,
      episode_id: appointment.episode_id,
      appointment_id: appointment.id,
      physiotherapist_id: appointment.physiotherapist_id,
      status: 'in_progress',
      actual_start: nowIso,
      location_mode: (appointment.location_mode as any) || 'clinic',
      encounter_notes: appointment.notes || null,
    });

    // Move appointment to in_progress if currently scheduled / confirmed / arrived
    if (['scheduled', 'confirmed', 'arrived'].includes(appointment.status)) {
      try {
        await appointmentService.transitionStatus(
          appointmentId,
          appointment.status,
          'in_progress',
          'Clinical visit started'
        );
      } catch (e) {
        console.warn('Could not update appointment status automatically:', e);
      }
    }

    return visit;
  },

  /**
   * Start encounter for an existing scheduled visit.
   */
  async startEncounter(visitId: string): Promise<ClinicalVisit> {
    const visit = await this.getClinicalVisitById(visitId);
    if (!visit) {
      throw new Error('Clinical visit not found.');
    }

    if (visit.status !== 'scheduled' && visit.status !== 'incomplete') {
      throw new Error(`Cannot start encounter from status: ${visit.status}`);
    }

    const nowIso = new Date().toISOString();
    const updatePayload: ClinicalVisitUpdate = {
      status: 'in_progress',
      actual_start: visit.actual_start || nowIso,
    };

    const { data, error } = await supabase
      .from('clinical_visits')
      .update(updatePayload)
      .eq('id', visitId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to start encounter: ${error.message}`);
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'clinical_visit.status_changed',
      p_entity_type: 'clinical_visit',
      p_entity_id: visitId,
      p_metadata: {
        old_status: visit.status,
        new_status: 'in_progress',
        actual_start: nowIso,
      },
      p_source: 'clinical_visit_service',
    });

    return data as ClinicalVisit;
  },

  /**
   * Complete an in-progress clinical visit.
   */
  async completeEncounter(visitId: string, actualEnd?: string, notes?: string): Promise<ClinicalVisit> {
    const visit = await this.getClinicalVisitById(visitId);
    if (!visit) {
      throw new Error('Clinical visit not found.');
    }

    if (visit.status !== 'in_progress') {
      throw new Error(`Only in-progress visits can be completed. Current status: ${visit.status}`);
    }

    const endTime = actualEnd || new Date().toISOString();
    const startTime = visit.actual_start || new Date().toISOString();

    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();
    if (endMs <= startMs) {
      throw new Error('Encounter end time must be after start time.');
    }

    const durationMinutes = Math.max(1, Math.round((endMs - startMs) / (1000 * 60)));

    const updatePayload: ClinicalVisitUpdate = {
      status: 'completed',
      actual_start: startTime,
      actual_end: endTime,
      duration_minutes: durationMinutes,
      encounter_notes: notes !== undefined ? notes : visit.encounter_notes,
    };

    const { data, error } = await supabase
      .from('clinical_visits')
      .update(updatePayload)
      .eq('id', visitId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to complete encounter: ${error.message}`);
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'clinical_visit.completed',
      p_entity_type: 'clinical_visit',
      p_entity_id: visitId,
      p_metadata: {
        actual_start: startTime,
        actual_end: endTime,
        duration_minutes: durationMinutes,
      },
      p_source: 'clinical_visit_service',
    });

    return data as ClinicalVisit;
  },

  /**
   * Mark an in-progress visit as incomplete.
   */
  async markIncomplete(visitId: string, reason?: string): Promise<ClinicalVisit> {
    const visit = await this.getClinicalVisitById(visitId);
    if (!visit) {
      throw new Error('Clinical visit not found.');
    }

    if (visit.status !== 'in_progress') {
      throw new Error(`Only in-progress visits can be marked incomplete. Current status: ${visit.status}`);
    }

    const updatePayload: ClinicalVisitUpdate = {
      status: 'incomplete',
      encounter_notes: reason
        ? `${visit.encounter_notes ? visit.encounter_notes + '\n' : ''}[Incomplete Note]: ${reason}`
        : visit.encounter_notes,
    };

    const { data, error } = await supabase
      .from('clinical_visits')
      .update(updatePayload)
      .eq('id', visitId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to mark visit incomplete: ${error.message}`);
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'clinical_visit.status_changed',
      p_entity_type: 'clinical_visit',
      p_entity_id: visitId,
      p_metadata: {
        old_status: 'in_progress',
        new_status: 'incomplete',
        reason,
      },
      p_source: 'clinical_visit_service',
    });

    return data as ClinicalVisit;
  },

  /**
   * Cancel a clinical visit.
   */
  async cancelClinicalVisit(visitId: string, cancellationReason: string): Promise<ClinicalVisit> {
    if (!cancellationReason || !cancellationReason.trim()) {
      throw new Error('A cancellation reason is required to cancel a clinical visit.');
    }

    const visit = await this.getClinicalVisitById(visitId);
    if (!visit) {
      throw new Error('Clinical visit not found.');
    }

    if (visit.status === 'completed') {
      throw new Error('Completed clinical visits cannot be cancelled.');
    }

    if (visit.status === 'cancelled') {
      throw new Error('Clinical visit is already cancelled.');
    }

    const updatePayload: ClinicalVisitUpdate = {
      status: 'cancelled',
      cancellation_reason: cancellationReason.trim(),
    };

    const { data, error } = await supabase
      .from('clinical_visits')
      .update(updatePayload)
      .eq('id', visitId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel clinical visit: ${error.message}`);
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'clinical_visit.cancelled',
      p_entity_type: 'clinical_visit',
      p_entity_id: visitId,
      p_metadata: {
        cancellation_reason: cancellationReason.trim(),
      },
      p_source: 'clinical_visit_service',
    });

    return data as ClinicalVisit;
  },
};
