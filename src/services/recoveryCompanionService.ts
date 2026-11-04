// ==============================================================================
// PHYSENRA RECOVERY COMPANION SERVICE
// File: src/services/recoveryCompanionService.ts
//
// Governs:
// 1. Patient verification with unguessable access codes (no app installation required).
// 2. Active Home Exercise Program (HEP) loading with approved photo demonstrations.
// 3. Session check-in recording (completed exercises, pain 0-10, effort/difficulty, patient notes).
// 4. Clinician follow-up review, adherence monitoring, and inactivity alerts.
// 5. Strict multi-tenant and patient privacy isolation (zero patient data in URLs or storage).
// ==============================================================================

import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type { ExerciseLaterality, ExerciseCategory, ExerciseBodyRegion } from '../types/models';

export type DifficultyRating = 'very_easy' | 'easy' | 'moderate' | 'hard' | 'very_hard';

export type FollowUpAction = 'acknowledged' | 'follow_up_planned' | 'regimen_review_needed' | 'no_action_needed';

export interface RecoveryExerciseItem {
  id: string;
  order_index: number;
  exercise_id: string;
  exercise_name: string;
  category: ExerciseCategory;
  body_region: ExerciseBodyRegion;
  sets: number | null;
  repetitions: number | null;
  hold_seconds: number | null;
  duration_minutes: number | null;
  rest_seconds: number | null;
  frequency: string | null;
  intensity_load: string | null;
  laterality: ExerciseLaterality;
  instructions: string | null;
  precautions: string | null;
  notes: string | null;
}

export interface PatientCheckInRecord {
  id: string;
  completed_at: string;
  pain_rating: number | null;
  difficulty_rating: DifficultyRating | null;
  patient_notes: string | null;
  completed_exercises: string[];
  clinician_reviewed_at: string | null;
  clinician_reviewed_by?: string | null;
  reviewer_name?: string | null;
  clinician_feedback_notes?: string | null;
  clinician_follow_up_action?: FollowUpAction | null;
}

export interface RecoveryProgramPayload {
  success: boolean;
  error?: string;
  session_token?: string;
  program: {
    id: string;
    title: string;
    instructions: string | null;
    start_date: string;
    review_date: string | null;
    status: string;
    program_identifier: string;
  };
  practice: {
    name: string;
    phone: string | null;
    email: string | null;
  };
  clinician: {
    display_name: string;
  };
  items: RecoveryExerciseItem[];
  recent_check_ins: PatientCheckInRecord[];
}

export interface RecoveryCheckInInput {
  painRating?: number | null;
  difficultyRating?: DifficultyRating | null;
  notes?: string;
  completedExercises: string[];
}

export interface RecoveryClinicianSummary {
  total_sessions: number;
  last_check_in: string | null;
  days_since_last_check_in: number | null;
  avg_pain: number | null;
  latest_pain: number | null;
  latest_difficulty: DifficultyRating | null;
  unreviewed_count: number;
  inactivity_flag: boolean;
  high_difficulty_flag: boolean;
  check_ins: PatientCheckInRecord[];
  active_access_code: {
    id: string;
    display_hint: string;
    expires_at: string;
    last_accessed_at?: string | null;
  } | null;
}

// Memory-only session token storage (never persisted to localStorage or sessionStorage)
let currentSessionToken: string | null = null;

export const recoveryCompanionService = {
  /**
   * Clears active patient session from memory.
   */
  clearSession(): void {
    currentSessionToken = null;
  },

  /**
   * Retrieves active in-memory session token.
   */
  getSessionToken(): string | null {
    return currentSessionToken;
  },

  /**
   * Normalizes an access code to standard format.
   */
  normalizeCode(code: string): string {
    if (!code) return '';
    let c = code.trim().toUpperCase().replace(/\s+/g, '');
    if (!c.startsWith('RCV-') && c.length >= 20) {
      c = 'RCV-' + c;
    }
    return c;
  },

  /**
   * Patient: Verifies an access code and receives an ephemeral session.
   * Does NOT expose patient national IDs or cross-patient data.
   */
  async verifyAccessCode(code: string): Promise<RecoveryProgramPayload> {
    const normalized = this.normalizeCode(code);
    if (!normalized || normalized.length < 8) {
      throw new Error('Please enter a valid access code (e.g. RCV-XXXXX...).');
    }

    // 1. Try authoritative Supabase RPC
    try {
      const { data, error } = await (supabase.rpc as any)('verify_recovery_companion_access', {
        p_access_code: normalized,
      });

      if (!error && data) {
        const payload = data as unknown as { success: boolean; session_token?: string; error?: string };
        if (!payload.success) {
          throw new Error(payload.error || 'Access denied. Invalid or expired access credentials.');
        }
        if (payload.session_token) {
          currentSessionToken = payload.session_token;
        }
        return data as unknown as RecoveryProgramPayload;
      }
    } catch (rpcErr: any) {
      // Direct RPC fallback to API route
    }

    // 2. Fallback to API bridge route with credentials: 'same-origin' for HttpOnly cookie
    const res = await fetch('/api/recovery-companion?action=verify-code', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: normalized }),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      if (res.status === 429) {
        throw new Error('Too many verification attempts. Please wait 5 minutes before retrying.');
      }
      throw new Error(result.error || 'Access denied. Invalid or expired access credentials.');
    }

    if (result.session_token) {
      currentSessionToken = result.session_token;
    }

    return result as RecoveryProgramPayload;
  },

  /**
   * Patient: Submits a completed exercise session check-in using the short-lived session.
   */
  async submitCheckIn(
    checkIn: RecoveryCheckInInput,
    sessionTokenOverride?: string
  ): Promise<{ success: boolean; check_in_id: string; completed_at: string }> {
    const sessionToken = sessionTokenOverride || currentSessionToken;

    const payload = {
      pain_rating: checkIn.painRating !== undefined && checkIn.painRating !== null ? Number(checkIn.painRating) : null,
      difficulty_rating: checkIn.difficultyRating || null,
      patient_notes: checkIn.notes ? checkIn.notes.trim().slice(0, 1000) : null,
      completed_exercises: checkIn.completedExercises || [],
    };

    // 1. Try authoritative Supabase RPC
    if (sessionToken) {
      try {
        const { data, error } = await (supabase.rpc as any)('submit_recovery_companion_check_in', {
          p_session_token: sessionToken,
          p_check_in: payload,
        });

        if (!error && data) {
          const resObj = data as unknown as { success: boolean; check_in_id: string; completed_at: string };
          if (resObj.success) {
            return resObj;
          }
        }
      } catch (rpcErr: any) {
        // Fallback to API route
      }
    }

    // 2. Fallback to API bridge route
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (sessionToken) {
      headers['Authorization'] = `Session ${sessionToken}`;
    }

    const res = await fetch('/api/recovery-companion?action=submit-checkin', {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({
        sessionToken,
        checkIn: {
          painRating: payload.pain_rating,
          difficultyRating: payload.difficulty_rating,
          notes: payload.patient_notes,
          completedExercises: payload.completed_exercises,
        },
      }),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Session expired or invalid. Please re-enter your access code.');
    }

    return result;
  },

  /**
   * Clinician: Generates a time-limited unguessable access code for a patient's active program.
   */
  async generateAccessCode(
    programId: string,
    durationDays: number = 30
  ): Promise<{
    success: boolean;
    program_id: string;
    access_code: string;
    display_hint: string;
    expires_at: string;
  }> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await (supabase.rpc as any)('generate_hep_access_code', {
      p_program_id: programId,
      p_duration_days: durationDays,
    });

    if (error) {
      throw new Error(`Failed to generate patient access code: ${error.message}`);
    }

    return data as unknown as {
      success: boolean;
      program_id: string;
      access_code: string;
      display_hint: string;
      expires_at: string;
    };
  },

  /**
   * Clinician: Retrieves check-in summary and adherence feedback for an HEP.
   */
  async getCheckInSummary(programId: string): Promise<RecoveryClinicianSummary> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    // Try authoritative RPC
    try {
      const { data, error } = await (supabase.rpc as any)('get_hep_check_in_summary', {
        p_program_id: programId,
      });

      if (!error && data) {
        return data as unknown as RecoveryClinicianSummary;
      }
    } catch (rpcErr) {
      console.warn('Direct RPC summary fallback to API route:', rpcErr);
    }

    // Fallback to API route
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';

    const res = await fetch(`/api/recovery-companion?action=clinician-summary&programId=${programId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-practice-id': activePracticeId,
      },
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Failed to load check-in summary.');
    }

    return result.summary as RecoveryClinicianSummary;
  },

  /**
   * Clinician: Reviews a patient check-in and signs off with follow-up action.
   */
  async reviewCheckIn(
    checkInId: string,
    notes: string,
    action: FollowUpAction
  ): Promise<{ success: boolean; check_in_id: string; reviewed_at: string; action: string }> {
    const activePracticeId = getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('No active practice context selected.');
    }

    const { data, error } = await (supabase.rpc as any)('review_hep_check_in', {
      p_check_in_id: checkInId,
      p_notes: notes.trim(),
      p_action: action,
    });

    if (error) {
      throw new Error(`Failed to review check-in: ${error.message}`);
    }

    return data as unknown as { success: boolean; check_in_id: string; reviewed_at: string; action: string };
  },
};
