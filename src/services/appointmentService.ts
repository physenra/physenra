import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  Appointment,
  AppointmentInsert,
  AppointmentUpdate,
  AppointmentStatus,
  AppointmentWithRelations,
  AppointmentFilters,
} from '../types/models';

export interface GetAppointmentsOptions extends AppointmentFilters {
  page?: number;
  limit?: number;
}

export interface GetAppointmentsResult {
  appointments: AppointmentWithRelations[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ClinicianOption {
  userId: string;
  name: string;
  role: string;
}

export interface RescheduleAppointmentInput {
  scheduledStart: string;
  durationMinutes: number;
  reason?: string;
  notes?: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingAppointments: Array<{
    id: string;
    appointment_identifier: string;
    scheduled_start: string;
    scheduled_end: string;
    patient_name?: string;
  }>;
}

/**
 * Valid allowed state machine transitions for Appointment V1.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ['confirmed', 'cancelled', 'rescheduled'],
  confirmed: ['arrived', 'cancelled', 'rescheduled', 'no_show'],
  arrived: ['in_progress', 'cancelled', 'incomplete'],
  in_progress: ['completed', 'incomplete'],
  completed: ['documentation_completed'],
  documentation_completed: [],
  cancelled: [],
  no_show: [],
  rescheduled: [],
  incomplete: [],
};

/**
 * Appointment Service: Centralized data layer for Appointment & Scheduling Foundation V1.
 * Strictly respects active practice context, state machine rules, and PostgreSQL RLS.
 */
export const appointmentService = {
  /**
   * Fetch paginated list of appointments with joined patient and episode details.
   */
  async getAppointments(options: GetAppointmentsOptions = {}): Promise<GetAppointmentsResult> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('appointments')
      .select(
        `
        *,
        patient:patients!fk_appointments_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_appointments_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        )
      `,
        { count: 'exact' }
      );

    // Filter by specific patient
    if (options.patientId) {
      query = query.eq('patient_id', options.patientId);
    }

    // Filter by specific episode
    if (options.episodeId) {
      query = query.eq('episode_id', options.episodeId);
    }

    // Filter by specific physiotherapist
    if (options.physiotherapistId) {
      query = query.eq('physiotherapist_id', options.physiotherapistId);
    }

    // Filter by single date (start of day to end of day)
    if (options.date) {
      const dayStart = `${options.date}T00:00:00.000Z`;
      const dayEnd = `${options.date}T23:59:59.999Z`;
      query = query.gte('scheduled_start', dayStart).lte('scheduled_start', dayEnd);
    } else {
      if (options.startDate) {
        query = query.gte('scheduled_start', options.startDate);
      }
      if (options.endDate) {
        query = query.lte('scheduled_start', options.endDate);
      }
    }

    // Status filtering
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    // Appointment type filtering
    if (options.appointmentType && options.appointmentType !== 'all') {
      query = query.eq('appointment_type', options.appointmentType);
    }

    // Search query on identifier or notes
    if (options.searchQuery && options.searchQuery.trim().length > 0) {
      const term = options.searchQuery.trim();
      query = query.or(`appointment_identifier.ilike.%${term}%,notes.ilike.%${term}%`);
    }

    // Order by scheduled_start ascending for chronological viewing
    query = query
      .order('scheduled_start', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching appointments:', error.message);
      throw error;
    }

    // Enrich with clinician profile data
    const enrichedAppointments = await this.enrichClinicianProfiles(data || []);

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      appointments: enrichedAppointments,
      totalCount,
      page,
      limit,
      totalPages,
    };
  },

  /**
   * Fetch single appointment by UUID with joined relations.
   */
  async getAppointmentById(id: string): Promise<AppointmentWithRelations | null> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('appointments')
      .select(
        `
        *,
        patient:patients!fk_appointments_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_appointments_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching appointment:', error.message);
      throw error;
    }

    const enriched = await this.enrichClinicianProfiles([data]);
    return enriched[0] || null;
  },

  /**
   * Check for overlapping appointments for the assigned physiotherapist.
   */
  async checkPhysiotherapistConflicts(
    physiotherapistId: string,
    scheduledStart: string,
    scheduledEnd: string,
    excludeAppointmentId?: string
  ): Promise<ConflictCheckResult> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      return { hasConflict: false, conflictingAppointments: [] };
    }

    let query = supabase
      .from('appointments')
      .select(
        `
        id,
        appointment_identifier,
        scheduled_start,
        scheduled_end,
        patients!fk_appointments_patient_practice (
          first_name,
          last_name
        )
      `
      )
      .eq('physiotherapist_id', physiotherapistId)
      .not('status', 'in', '("cancelled","rescheduled","no_show")')
      // Overlap condition: start < other.end AND end > other.start
      .lt('scheduled_start', scheduledEnd)
      .gt('scheduled_end', scheduledStart);

    if (excludeAppointmentId) {
      query = query.neq('id', excludeAppointmentId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error checking conflicts:', error.message);
      return { hasConflict: false, conflictingAppointments: [] };
    }

    const conflicts = (data || []).map((row: any) => ({
      id: row.id,
      appointment_identifier: row.appointment_identifier,
      scheduled_start: row.scheduled_start,
      scheduled_end: row.scheduled_end,
      patient_name: row.patients ? `${row.patients.first_name} ${row.patients.last_name}` : undefined,
    }));

    return {
      hasConflict: conflicts.length > 0,
      conflictingAppointments: conflicts,
    };
  },

  /**
   * Create a new appointment within the active practice.
   */
  async createAppointment(input: {
    patient_id: string;
    episode_id?: string | null;
    physiotherapist_id: string;
    appointment_type: Appointment['appointment_type'];
    scheduled_start: string;
    duration_minutes: number;
    location_mode?: Appointment['location_mode'];
    notes?: string | null;
  }): Promise<Appointment> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    // 1. Generate human-readable identifier
    const { data: identifierData, error: idError } = await supabase.rpc(
      'generate_next_appointment_identifier',
      { p_practice_id: activePracticeId }
    );

    if (idError) {
      console.error('Failed to generate appointment identifier:', idError.message);
      throw new Error(`Identifier generation failed: ${idError.message}`);
    }

    const appointmentIdentifier = identifierData as string;

    // 2. Compute scheduled_end
    const startDate = new Date(input.scheduled_start);
    const endDate = new Date(startDate.getTime() + input.duration_minutes * 60000);
    const scheduledEnd = endDate.toISOString();

    // 3. Insert record
    const insertPayload: AppointmentInsert = {
      practice_id: activePracticeId,
      patient_id: input.patient_id,
      episode_id: input.episode_id || null,
      physiotherapist_id: input.physiotherapist_id,
      appointment_identifier: appointmentIdentifier,
      appointment_type: input.appointment_type,
      status: 'scheduled',
      scheduled_start: input.scheduled_start,
      scheduled_end: scheduledEnd,
      duration_minutes: input.duration_minutes,
      location_mode: input.location_mode || 'clinic',
      notes: input.notes?.trim() || null,
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Error creating appointment:', error.message);
      throw error;
    }

    // 4. Log audit event
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'appointment.created',
        p_entity_type: 'appointment',
        p_entity_id: data.id,
        p_metadata: {
          appointment_identifier: data.appointment_identifier,
          patient_id: data.patient_id,
          episode_id: data.episode_id,
          physiotherapist_id: data.physiotherapist_id,
          scheduled_start: data.scheduled_start,
          appointment_type: data.appointment_type,
        },
        p_source: 'web_client',
      });
    } catch (auditErr) {
      console.warn('Audit event creation failed non-fatally:', auditErr);
    }

    return data;
  },

  /**
   * Update editable appointment fields (for non-terminal appointments).
   */
  async updateAppointment(
    id: string,
    updates: {
      physiotherapist_id?: string;
      episode_id?: string | null;
      appointment_type?: Appointment['appointment_type'];
      scheduled_start?: string;
      duration_minutes?: number;
      location_mode?: Appointment['location_mode'];
      notes?: string | null;
    }
  ): Promise<Appointment> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const payload: AppointmentUpdate = {};
    if (updates.physiotherapist_id !== undefined) payload.physiotherapist_id = updates.physiotherapist_id;
    if (updates.episode_id !== undefined) payload.episode_id = updates.episode_id;
    if (updates.appointment_type !== undefined) payload.appointment_type = updates.appointment_type;
    if (updates.location_mode !== undefined) payload.location_mode = updates.location_mode;
    if (updates.notes !== undefined) payload.notes = updates.notes ? updates.notes.trim() : null;

    if (updates.scheduled_start !== undefined || updates.duration_minutes !== undefined) {
      if (updates.scheduled_start) payload.scheduled_start = updates.scheduled_start;
      if (updates.duration_minutes) payload.duration_minutes = updates.duration_minutes;
      
      // Calculate new end time if either start or duration was provided
      if (updates.scheduled_start && updates.duration_minutes) {
        const start = new Date(updates.scheduled_start);
        payload.scheduled_end = new Date(start.getTime() + updates.duration_minutes * 60000).toISOString();
      }
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating appointment:', error.message);
      throw error;
    }

    // Log audit event
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'appointment.updated',
        p_entity_type: 'appointment',
        p_entity_id: data.id,
        p_metadata: {
          appointment_identifier: data.appointment_identifier,
          updated_fields: Object.keys(updates),
        },
        p_source: 'web_client',
      });
    } catch (auditErr) {
      console.warn('Audit event update failed non-fatally:', auditErr);
    }

    return data;
  },

  /**
   * Transition appointment status according to the controlled state machine.
   */
  async transitionStatus(
    id: string,
    currentStatus: AppointmentStatus,
    newStatus: AppointmentStatus,
    reason?: string
  ): Promise<Appointment> {
    const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid status transition: Cannot transition appointment from '${currentStatus}' to '${newStatus}'.`
      );
    }

    if (newStatus === 'cancelled' && (!reason || reason.trim().length === 0)) {
      throw new Error('A cancellation reason is required when cancelling an appointment.');
    }

    const payload: AppointmentUpdate = {
      status: newStatus,
    };

    if (newStatus === 'cancelled') {
      payload.cancellation_reason = reason!.trim();
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error transitioning appointment status:', error.message);
      throw error;
    }

    // Log audit event
    try {
      await supabase.rpc('log_audit_event', {
        p_action: newStatus === 'cancelled' ? 'appointment.cancelled' : 'appointment.status_changed',
        p_entity_type: 'appointment',
        p_entity_id: data.id,
        p_metadata: {
          appointment_identifier: data.appointment_identifier,
          previous_status: currentStatus,
          new_status: newStatus,
          reason: reason || null,
        },
        p_source: 'web_client',
      });
    } catch (auditErr) {
      console.warn('Audit event status update failed non-fatally:', auditErr);
    }

    return data;
  },

  /**
   * Reschedule an appointment: marks existing appointment as 'rescheduled'
   * and creates a new appointment linked via `rescheduled_from_id`.
   */
  async rescheduleAppointment(
    originalAppointmentId: string,
    input: RescheduleAppointmentInput
  ): Promise<Appointment> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    // 1. Fetch original appointment
    const original = await this.getAppointmentById(originalAppointmentId);
    if (!original) {
      throw new Error('Original appointment not found.');
    }

    if (original.status !== 'scheduled' && original.status !== 'confirmed') {
      throw new Error(
        `Cannot reschedule an appointment with status '${original.status}'. Only 'scheduled' or 'confirmed' appointments may be rescheduled.`
      );
    }

    // 2. Transition original to 'rescheduled'
    await this.transitionStatus(original.id, original.status, 'rescheduled');

    // 3. Generate new identifier
    const { data: identifierData, error: idError } = await supabase.rpc(
      'generate_next_appointment_identifier',
      { p_practice_id: activePracticeId }
    );

    if (idError) {
      throw new Error(`Failed to generate new appointment identifier: ${idError.message}`);
    }

    const startDate = new Date(input.scheduledStart);
    const endDate = new Date(startDate.getTime() + input.durationMinutes * 60000);

    // 4. Create new appointment pointing to original
    const insertPayload: AppointmentInsert = {
      practice_id: activePracticeId,
      patient_id: original.patient_id,
      episode_id: original.episode_id,
      physiotherapist_id: original.physiotherapist_id,
      appointment_identifier: identifierData as string,
      appointment_type: original.appointment_type,
      status: 'scheduled',
      scheduled_start: input.scheduledStart,
      scheduled_end: endDate.toISOString(),
      duration_minutes: input.durationMinutes,
      location_mode: original.location_mode,
      notes: input.notes ? input.notes.trim() : original.notes,
      rescheduled_from_id: original.id,
    };

    const { data: newAppointment, error: insertError } = await supabase
      .from('appointments')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating rescheduled appointment:', insertError.message);
      throw insertError;
    }

    // 5. Log audit event
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'appointment.rescheduled',
        p_entity_type: 'appointment',
        p_entity_id: newAppointment.id,
        p_metadata: {
          original_appointment_id: original.id,
          original_identifier: original.appointment_identifier,
          new_appointment_id: newAppointment.id,
          new_identifier: newAppointment.appointment_identifier,
          reason: input.reason || null,
        },
        p_source: 'web_client',
      });
    } catch (auditErr) {
      console.warn('Audit event rescheduling failed non-fatally:', auditErr);
    }

    return newAppointment;
  },

  /**
   * Load active clinicians within the practice.
   */
  async getClinicians(): Promise<ClinicianOption[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      return [];
    }

    const { data: memberships, error: memError } = await supabase
      .from('practice_memberships')
      .select('user_id, role')
      .eq('practice_id', activePracticeId)
      .eq('status', 'active')
      .in('role', ['physiotherapist', 'practice_owner', 'practice_manager']);

    if (memError || !memberships || memberships.length === 0) {
      return [];
    }

    const userIds = memberships.map((m: any) => m.user_id);
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('id, display_name, first_name, last_name')
      .in('id', userIds);

    if (profError || !profiles) {
      return [];
    }

    const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

    return memberships.map((m: any) => {
      const p = profileMap.get(m.user_id);
      const name = p
        ? p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown Clinician'
        : 'Unknown Clinician';
      return {
        userId: m.user_id,
        name,
        role: m.role,
      };
    });
  },

  /**
   * Helper: Enrich appointment rows with clinician profile names.
   */
  async enrichClinicianProfiles(appointments: any[]): Promise<AppointmentWithRelations[]> {
    if (!appointments || appointments.length === 0) return [];

    const physioIds = Array.from(
      new Set(appointments.map((a) => a.physiotherapist_id).filter(Boolean))
    );

    if (physioIds.length === 0) return appointments;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, first_name, last_name')
      .in('id', physioIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    return appointments.map((appt) => {
      return {
        ...appt,
        physiotherapist: profileMap.get(appt.physiotherapist_id) || null,
      };
    });
  },
};
