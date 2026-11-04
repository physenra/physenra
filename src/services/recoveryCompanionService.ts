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

export const recoveryCompanionService = {
  /**
   * Normalizes an access code to standard format (RCV-XXXXX).
   */
  normalizeCode(code: string): string {
    if (!code) return '';
    let c = code.trim().toUpperCase().replace(/\s+/g, '');
    if (!c.startsWith('RCV-') && c.length === 5) {
      c = 'RCV-' + c;
    }
    return c;
  },

  /**
   * Patient: Verifies an unguessable access code and retrieves their active HEP.
   * Does NOT expose patient national IDs or cross-patient data.
   */
  async verifyAccessCode(code: string): Promise<RecoveryProgramPayload> {
    const normalized = this.normalizeCode(code);
    if (!normalized || normalized.length < 5) {
      throw new Error('Please enter a valid access code (e.g. RCV-XXXXX).');
    }

    // 1. Try authoritative Supabase RPC
    try {
      const { data, error } = await (supabase.rpc as any)('verify_recovery_companion_access', {
        p_access_code: normalized,
      });

      if (!error && data) {
        const payload = data as unknown as { success: boolean; error?: string };
        if (!payload.success) {
          throw new Error(payload.error || 'Access denied.');
        }
        return data as unknown as RecoveryProgramPayload;
      }
    } catch (rpcErr: any) {
      // If RPC failed due to network or function in transit, attempt API route
      console.warn('Direct Supabase RPC not available, trying API bridge:', rpcErr?.message);
    }

    // 2. Fallback to API bridge route
    const res = await fetch('/api/recovery-companion?action=verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: normalized }),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Failed to verify access code.');
    }

    return result as RecoveryProgramPayload;
  },

  /**
   * Patient: Submits a completed exercise session check-in.
   */
  async submitCheckIn(
    code: string,
    checkIn: RecoveryCheckInInput
  ): Promise<{ success: boolean; check_in_id: string; completed_at: string }> {
    const normalized = this.normalizeCode(code);
    if (!normalized) {
      throw new Error('Active access code is required.');
    }

    const payload = {
      pain_rating: checkIn.painRating !== undefined && checkIn.painRating !== null ? Number(checkIn.painRating) : null,
      difficulty_rating: checkIn.difficultyRating || null,
      patient_notes: checkIn.notes ? checkIn.notes.trim().slice(0, 1000) : null,
      completed_exercises: checkIn.completedExercises || [],
    };

    // 1. Try authoritative Supabase RPC
    try {
      const { data, error } = await (supabase.rpc as any)('submit_recovery_companion_check_in', {
        p_access_code: normalized,
        p_check_in: payload,
      });

      if (!error && data) {
        const resObj = data as unknown as { success: boolean; check_in_id: string; completed_at: string };
        if (resObj.success) {
          return resObj;
        }
      }
    } catch (rpcErr: any) {
      console.warn('Direct RPC submission fallback to API route:', rpcErr?.message);
    }

    // 2. Fallback to API bridge route
    const res = await fetch('/api/recovery-companion?action=submit-checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: normalized,
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
      throw new Error(result.error || 'Failed to submit check-in.');
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
