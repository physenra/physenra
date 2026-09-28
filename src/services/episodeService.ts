import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  EpisodeOfCare,
  EpisodeOfCareInsert,
  EpisodeOfCareUpdate,
  EpisodeStatus,
  EpisodeWithPatient,
} from '../types/models';

export interface GetEpisodesOptions {
  patientId?: string;
  search?: string;
  status?: EpisodeStatus | 'all';
  page?: number;
  limit?: number;
}

export interface GetEpisodesResult {
  episodes: EpisodeWithPatient[];
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

/**
 * Episode Service: Centralized data layer for Episode of Care Foundation V1.
 * Strictly respects active practice context and PostgreSQL Row-Level Security.
 */
export const episodeService = {
  /**
   * Fetch paginated list of episodes of care within the active practice.
   */
  async getEpisodes(options: GetEpisodesOptions = {}): Promise<GetEpisodesResult> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('episodes_of_care')
      .select(
        `
        *,
        patients!fk_episodes_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        )
      `,
        { count: 'exact' }
      );

    // Filter by specific patient
    if (options.patientId) {
      query = query.eq('patient_id', options.patientId);
    }

    // Status filtering
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    } else if (!options.status) {
      // Default: exclude archived episodes
      query = query.neq('status', 'archived');
    }

    // Search filtering across title and episode identifier
    if (options.search && options.search.trim().length > 0) {
      const term = options.search.trim();
      query = query.or(
        `title.ilike.%${term}%,episode_identifier.ilike.%${term}%,description.ilike.%${term}%`
      );
    }

    // Order by start_date descending, then created_at descending
    query = query
      .order('start_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching episodes of care:', error.message);
      throw error;
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    return {
      episodes: (data as unknown as EpisodeWithPatient[]) || [],
      totalCount,
      page,
      limit,
      totalPages,
    };
  },

  /**
   * Fetch a single episode of care by ID with joined patient and clinician details.
   */
  async getEpisodeById(id: string): Promise<EpisodeWithPatient | null> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('episodes_of_care')
      .select(
        `
        *,
        patients!fk_episodes_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        )
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching episode of care by id:', error.message);
      throw error;
    }

    return (data as unknown as EpisodeWithPatient) || null;
  },

  /**
   * Create a new episode of care for an active patient in the active practice.
   */
  async createEpisode(
    input: Omit<
      EpisodeOfCareInsert,
      | 'id'
      | 'episode_identifier'
      | 'created_at'
      | 'updated_at'
      | 'created_by'
      | 'updated_by'
      | 'closed_at'
      | 'closed_by'
      | 'archived_at'
      | 'archived_by'
    >
  ): Promise<EpisodeOfCare> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const insertPayload: EpisodeOfCareInsert = {
      ...input,
      practice_id: activePracticeId,
    };

    const { data, error } = await supabase
      .from('episodes_of_care')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating episode of care:', error.message);
      throw error;
    }

    // Record trusted audit event
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'episode_created',
        p_entity_type: 'episodes_of_care',
        p_entity_id: data.id,
        p_metadata: {
          episode_identifier: data.episode_identifier,
          patient_id: data.patient_id,
          title: data.title,
        },
      });
    } catch (auditErr) {
      console.warn('Non-blocking: Failed to log episode creation audit:', auditErr);
    }

    return data;
  },

  /**
   * Update an existing episode of care.
   */
  async updateEpisode(id: string, input: EpisodeOfCareUpdate): Promise<EpisodeOfCare> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('episodes_of_care')
      .update(input)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating episode of care:', error.message);
      throw error;
    }

    // Record trusted audit event
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'episode_updated',
        p_entity_type: 'episodes_of_care',
        p_entity_id: data.id,
        p_metadata: {
          episode_identifier: data.episode_identifier,
          updated_fields: Object.keys(input),
        },
      });
    } catch (auditErr) {
      console.warn('Non-blocking: Failed to log episode update audit:', auditErr);
    }

    return data;
  },

  /**
   * Change status of an episode of care (active, paused, completed).
   */
  async changeEpisodeStatus(
    id: string,
    newStatus: EpisodeStatus,
    reason?: string
  ): Promise<EpisodeOfCare> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const updatePayload: EpisodeOfCareUpdate = {
      status: newStatus,
    };

    if (newStatus === 'completed') {
      updatePayload.closed_at = new Date().toISOString();
      updatePayload.end_date = new Date().toISOString().split('T')[0];
    } else if (newStatus === 'active') {
      updatePayload.closed_at = null;
      updatePayload.closed_by = null;
    }

    const { data, error } = await supabase
      .from('episodes_of_care')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error changing episode status:', error.message);
      throw error;
    }

    const auditAction =
      newStatus === 'completed'
        ? 'episode_completed'
        : newStatus === 'active'
        ? 'episode_reopened'
        : 'episode_status_changed';

    try {
      await supabase.rpc('log_audit_event', {
        p_action: auditAction,
        p_entity_type: 'episodes_of_care',
        p_entity_id: data.id,
        p_metadata: {
          episode_identifier: data.episode_identifier,
          new_status: newStatus,
          reason: reason || undefined,
        },
      });
    } catch (auditErr) {
      console.warn('Non-blocking: Failed to log episode status audit:', auditErr);
    }

    return data;
  },

  /**
   * Archive an episode of care (soft-delete).
   */
  async archiveEpisode(id: string, reason?: string): Promise<EpisodeOfCare> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('episodes_of_care')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error archiving episode of care:', error.message);
      throw error;
    }

    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'episode_archived',
        p_entity_type: 'episodes_of_care',
        p_entity_id: data.id,
        p_metadata: {
          episode_identifier: data.episode_identifier,
          reason: reason || 'Administrative archive',
        },
      });
    } catch (auditErr) {
      console.warn('Non-blocking: Failed to log episode archive audit:', auditErr);
    }

    return data;
  },

  /**
   * Restore/unarchive an archived episode of care.
   */
  async restoreEpisode(id: string): Promise<EpisodeOfCare> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('episodes_of_care')
      .update({
        status: 'active',
        archived_at: null,
        archived_by: null,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error restoring episode of care:', error.message);
      throw error;
    }

    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'episode_unarchived',
        p_entity_type: 'episodes_of_care',
        p_entity_id: data.id,
        p_metadata: {
          episode_identifier: data.episode_identifier,
        },
      });
    } catch (auditErr) {
      console.warn('Non-blocking: Failed to log episode restore audit:', auditErr);
    }

    return data;
  },

  /**
   * Get active clinicians in the current practice for assignment dropdowns.
   */
  async getPracticeClinicians(): Promise<ClinicianOption[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) return [];

    const { data, error } = await supabase
      .from('practice_memberships')
      .select(
        `
        user_id,
        role,
        status
      `
      )
      .eq('practice_id', activePracticeId)
      .eq('status', 'active')
      .in('role', ['physiotherapist', 'practice_owner', 'practice_manager']);

    if (error || !data) {
      console.error('Error fetching practice clinicians:', error?.message);
      return [];
    }

    // Query profiles for the matched user IDs
    const userIds = data.map((d) => d.user_id);
    if (userIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, first_name, last_name')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    return data.map((membership) => {
      const p = profileMap.get(membership.user_id);
      const name =
        p?.display_name ||
        (p?.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : 'Practitioner');
      return {
        userId: membership.user_id,
        name,
        role: membership.role,
      };
    });
  },
};
