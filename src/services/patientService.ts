import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type { Patient, PatientInsert, PatientUpdate, PatientStatus } from '../types/models';

export interface GetPatientsOptions {
  search?: string;
  status?: PatientStatus | 'all';
  page?: number;
  limit?: number;
}

export interface GetPatientsResult {
  patients: Patient[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DuplicateCheckParams {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  excludePatientId?: string;
}

export interface DuplicateMatch {
  id: string;
  patient_identifier: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  matchReason: string;
}

/**
 * Patient Service: Centralized data layer for Patient Registry Foundation V1.
 * Strictly respects active practice context and PostgreSQL Row-Level Security.
 */
export const patientService = {
  /**
   * Fetch paginated list of patients within the active practice.
   */
  async getPatients(options: GetPatientsOptions = {}): Promise<GetPatientsResult> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' });

    // Status filtering
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    } else if (!options.status) {
      // Default to active patients
      query = query.eq('status', 'active');
    }

    // Search filtering across administrative demographic fields
    if (options.search && options.search.trim().length > 0) {
      const term = options.search.trim();
      query = query.or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%,patient_identifier.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`
      );
    }

    // Ordering and Pagination
    query = query
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching patients:', error.message);
      throw error;
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    return {
      patients: data || [],
      totalCount,
      page,
      limit,
      totalPages,
    };
  },

  /**
   * Fetch a single patient by ID.
   */
  async getPatientById(id: string): Promise<Patient | null> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching patient by id:', error.message);
      throw error;
    }

    return data;
  },

  /**
   * Check for potential duplicates in the active practice.
   */
  async checkPotentialDuplicates(params: DuplicateCheckParams): Promise<DuplicateMatch[]> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) return [];

    const matches: DuplicateMatch[] = [];
    const firstName = params.firstName.trim();
    const lastName = params.lastName.trim();

    if (!firstName || !lastName) return [];

    // Check same first and last name
    let nameQuery = supabase
      .from('patients')
      .select('id, patient_identifier, first_name, last_name, date_of_birth, phone, email')
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .neq('status', 'archived');

    if (params.excludePatientId) {
      nameQuery = nameQuery.neq('id', params.excludePatientId);
    }

    const { data: nameMatches } = await nameQuery;

    if (nameMatches) {
      for (const m of nameMatches) {
        let reason = 'Exact name match';
        if (params.dateOfBirth && m.date_of_birth === params.dateOfBirth) {
          reason = 'Exact name and Date of Birth match';
        }
        matches.push({ ...m, matchReason: reason });
      }
    }

    // Check phone match if provided
    if (params.phone && params.phone.trim().length > 5) {
      const cleanPhone = params.phone.trim();
      let phoneQuery = supabase
        .from('patients')
        .select('id, patient_identifier, first_name, last_name, date_of_birth, phone, email')
        .eq('phone', cleanPhone)
        .neq('status', 'archived');

      if (params.excludePatientId) {
        phoneQuery = phoneQuery.neq('id', params.excludePatientId);
      }

      const { data: phoneMatches } = await phoneQuery;
      if (phoneMatches) {
        for (const pm of phoneMatches) {
          if (!matches.some(m => m.id === pm.id)) {
            matches.push({ ...pm, matchReason: 'Matching contact phone' });
          }
        }
      }
    }

    return matches;
  },

  /**
   * Create a new patient in the active practice.
   */
  async createPatient(
    input: Omit<
      PatientInsert,
      'id' | 'patient_identifier' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'archived_at' | 'archived_by'
    >
  ): Promise<Patient> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const insertPayload: PatientInsert = {
      ...input,
      practice_id: activePracticeId,
    };

    const { data, error } = await supabase
      .from('patients')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating patient:', error.message);
      throw error;
    }

    // Record trusted audit event
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'patient_created',
        p_entity_type: 'patients',
        p_entity_id: data.id,
        p_metadata: {
          patient_identifier: data.patient_identifier,
          first_name: data.first_name,
          last_name: data.last_name,
        },
      });
    } catch (auditErr) {
      console.warn('Non-blocking: Failed to log patient creation audit:', auditErr);
    }

    return data;
  },

  /**
   * Update an existing patient's demographic and contact details.
   */
  async updatePatient(id: string, input: PatientUpdate): Promise<Patient> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('patients')
      .update(input)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating patient:', error.message);
      throw error;
    }

    // Record trusted audit event
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'patient_updated',
        p_entity_type: 'patients',
        p_entity_id: data.id,
        p_metadata: {
          patient_identifier: data.patient_identifier,
          updated_fields: Object.keys(input),
        },
      });
    } catch (auditErr) {
      console.warn('Non-blocking: Failed to log patient update audit:', auditErr);
    }

    return data;
  },

  /**
   * Archive a patient record (soft-delete).
   */
  async archivePatient(id: string, reason?: string): Promise<Patient> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('patients')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error archiving patient:', error.message);
      throw error;
    }

    // Record trusted audit event
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'patient_archived',
        p_entity_type: 'patients',
        p_entity_id: data.id,
        p_metadata: {
          patient_identifier: data.patient_identifier,
          reason: reason || 'Administrative archive',
        },
      });
    } catch (auditErr) {
      console.warn('Non-blocking: Failed to log patient archive audit:', auditErr);
    }

    return data;
  },

  /**
   * Restore/unarchive an archived patient record.
   */
  async unarchivePatient(id: string): Promise<Patient> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await supabase
      .from('patients')
      .update({
        status: 'active',
        archived_at: null,
        archived_by: null,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error unarchiving patient:', error.message);
      throw error;
    }

    // Record trusted audit event
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'patient_unarchived',
        p_entity_type: 'patients',
        p_entity_id: data.id,
        p_metadata: {
          patient_identifier: data.patient_identifier,
        },
      });
    } catch (auditErr) {
      console.warn('Non-blocking: Failed to log patient unarchive audit:', auditErr);
    }

    return data;
  },
};
