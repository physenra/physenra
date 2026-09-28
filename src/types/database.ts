export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PracticeStatus = 'active' | 'trial' | 'past_due' | 'suspended' | 'archived';
export type MembershipRole =
  | 'platform_admin'
  | 'practice_owner'
  | 'practice_manager'
  | 'physiotherapist'
  | 'receptionist'
  | 'accountant'
  | 'patient';
export type MembershipStatus = 'active' | 'invited' | 'suspended' | 'revoked';
export type SubscriptionTier = 'starter' | 'growth' | 'enterprise';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'cancelled'
  | 'expired';
export type PatientStatus = 'active' | 'inactive' | 'archived';
export type PatientSex = 'male' | 'female' | 'other' | 'unknown';
export type EpisodeStatus = 'active' | 'paused' | 'completed' | 'archived';
export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'documentation_completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled'
  | 'incomplete';
export type AppointmentType =
  | 'initial_consultation'
  | 'follow_up'
  | 'reassessment'
  | 'home_visit'
  | 'other';
export type AppointmentLocationMode =
  | 'clinic'
  | 'home'
  | 'telehealth'
  | 'other';
export type ClinicalVisitStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'incomplete'
  | 'cancelled';
export type ClinicalVisitLocationMode =
  | 'clinic'
  | 'home'
  | 'telehealth'
  | 'other';
export type ClinicalNoteStatus = 'draft' | 'finalized' | 'amended';
export type ClinicalNoteType = 'soap' | 'addendum';
export type OutcomeMeasureCategory = 'pain' | 'functional' | 'mobility' | 'quality_of_life' | 'other';
export type OutcomeMeasureScoringType = 'numeric' | 'percentage' | 'timed_seconds' | 'points_scale' | 'categorical';
export type OutcomeAssessmentType = 'baseline' | 'interim' | 'discharge' | 'follow_up' | 'routine';
export type OutcomeAssessmentStatus = 'draft' | 'finalized' | 'amended';
export type HEPStatus = 'draft' | 'active' | 'paused' | 'completed' | 'discontinued';
export type ExerciseCategory =
  | 'mobility'
  | 'strengthening'
  | 'stretching'
  | 'aerobic'
  | 'balance'
  | 'neuromuscular'
  | 'functional'
  | 'other';
export type ExerciseBodyRegion =
  | 'cervical'
  | 'thoracic'
  | 'lumbar'
  | 'shoulder'
  | 'elbow'
  | 'wrist_hand'
  | 'hip'
  | 'knee'
  | 'ankle_foot'
  | 'full_body'
  | 'other';
export type ExerciseLaterality = 'bilateral' | 'left' | 'right' | 'unilateral' | 'na';
export type TreatmentPlanStatus = 'draft' | 'active' | 'paused' | 'completed' | 'discontinued';
export type TreatmentGoalCategory =
  | 'range_of_motion'
  | 'strength'
  | 'pain_reduction'
  | 'functional'
  | 'balance'
  | 'mobility'
  | 'other';
export type TreatmentGoalPriority = 'low' | 'medium' | 'high';
export type TreatmentGoalStatus =
  | 'draft'
  | 'active'
  | 'achieved'
  | 'partially_achieved'
  | 'not_achieved'
  | 'discontinued';

export type ProgressReviewStatus = 'draft' | 'finalized' | 'amended';
export type OverallProgressRating =
  | 'significant_improvement'
  | 'progressing'
  | 'slow_progress'
  | 'plateaued'
  | 'regressed'
  | 'goals_met';
export type ProgressReviewPlanRecommendation =
  | 'continue_current_plan'
  | 'modify_goals'
  | 'advance_interventions'
  | 'reduce_frequency'
  | 'prepare_discharge';
export type GoalProgressStatus =
  | 'in_progress'
  | 'achieved'
  | 'partially_achieved'
  | 'not_achieved'
  | 'regressed'
  | 'discontinued';

export type DischargeSummaryStatus = 'draft' | 'finalized' | 'amended';
export type DischargeReason =
  | 'goals_achieved'
  | 'goals_partially_achieved'
  | 'patient_independent'
  | 'plateau'
  | 'patient_choice'
  | 'transfer_of_care'
  | 'referred_elsewhere'
  | 'lost_to_follow_up'
  | 'financial_administrative'
  | 'other';
export type DischargeDisposition =
  | 'discharged_to_self_management'
  | 'discharged_with_home_program'
  | 'follow_up_with_referrer'
  | 'transferred_to_other_provider'
  | 'continued_care_elsewhere'
  | 'other';

export type ServiceCategory =
  | 'consultation'
  | 'assessment'
  | 'treatment'
  | 'rehabilitation'
  | 'home_visit'
  | 'reassessment'
  | 'group_class'
  | 'other';

export type FeeScheduleStatus = 'draft' | 'active' | 'archived';

export interface Database {
  public: {
    Tables: {
      practices: {
        Row: {
          id: string;
          name: string;
          slug: string;
          status: PracticeStatus;
          email: string | null;
          phone: string | null;
          timezone: string;
          country: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          status?: PracticeStatus;
          email?: string | null;
          phone?: string | null;
          timezone?: string;
          country?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          status?: PracticeStatus;
          email?: string | null;
          phone?: string | null;
          timezone?: string;
          country?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          is_platform_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_platform_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_platform_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      practice_memberships: {
        Row: {
          id: string;
          practice_id: string;
          user_id: string;
          role: MembershipRole;
          status: MembershipStatus;
          joined_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          user_id: string;
          role: MembershipRole;
          status?: MembershipStatus;
          joined_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          user_id?: string;
          role?: MembershipRole;
          status?: MembershipStatus;
          joined_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          practice_id: string;
          plan_tier: SubscriptionTier;
          status: SubscriptionStatus;
          seat_limit: number;
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          plan_tier?: SubscriptionTier;
          status?: SubscriptionStatus;
          seat_limit?: number;
          current_period_start?: string;
          current_period_end?: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          plan_tier?: SubscriptionTier;
          status?: SubscriptionStatus;
          seat_limit?: number;
          current_period_start?: string;
          current_period_end?: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          id: string;
          practice_id: string | null;
          actor_user_id: string | null;
          actor_role: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          source: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          practice_id?: string | null;
          actor_user_id?: string | null;
          actor_role?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          source?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: never; // Audit events are strictly immutable
        Relationships: [];
      };
      practice_patient_counters: {
        Row: {
          practice_id: string;
          next_val: number;
          updated_at: string;
        };
        Insert: {
          practice_id: string;
          next_val?: number;
          updated_at?: string;
        };
        Update: {
          practice_id?: string;
          next_val?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      patients: {
        Row: {
          id: string;
          practice_id: string;
          patient_identifier: string;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          preferred_name: string | null;
          date_of_birth: string | null;
          sex: PatientSex | null;
          phone: string | null;
          email: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state_province: string | null;
          postal_code: string | null;
          country: string;
          emergency_contact_name: string | null;
          emergency_contact_relationship: string | null;
          emergency_contact_phone: string | null;
          emergency_contact_email: string | null;
          status: PatientStatus;
          administrative_notes: string | null;
          archived_at: string | null;
          archived_by: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id?: string;
          patient_identifier?: string;
          first_name: string;
          middle_name?: string | null;
          last_name: string;
          preferred_name?: string | null;
          date_of_birth?: string | null;
          sex?: PatientSex | null;
          phone?: string | null;
          email?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state_province?: string | null;
          postal_code?: string | null;
          country?: string;
          emergency_contact_name?: string | null;
          emergency_contact_relationship?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_email?: string | null;
          status?: PatientStatus;
          administrative_notes?: string | null;
          archived_at?: string | null;
          archived_by?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          patient_identifier?: string;
          first_name?: string;
          middle_name?: string | null;
          last_name?: string;
          preferred_name?: string | null;
          date_of_birth?: string | null;
          sex?: PatientSex | null;
          phone?: string | null;
          email?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state_province?: string | null;
          postal_code?: string | null;
          country?: string;
          emergency_contact_name?: string | null;
          emergency_contact_relationship?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_email?: string | null;
          status?: PatientStatus;
          administrative_notes?: string | null;
          archived_at?: string | null;
          archived_by?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      practice_episode_counters: {
        Row: {
          practice_id: string;
          next_val: number;
          updated_at: string;
        };
        Insert: {
          practice_id: string;
          next_val?: number;
          updated_at?: string;
        };
        Update: {
          practice_id?: string;
          next_val?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      episodes_of_care: {
        Row: {
          id: string;
          practice_id: string;
          patient_id: string;
          episode_identifier: string;
          title: string;
          description: string | null;
          status: EpisodeStatus;
          start_date: string;
          end_date: string | null;
          primary_physiotherapist_id: string | null;
          closed_at: string | null;
          closed_by: string | null;
          archived_at: string | null;
          archived_by: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          patient_id: string;
          episode_identifier?: string;
          title: string;
          description?: string | null;
          status?: EpisodeStatus;
          start_date?: string;
          end_date?: string | null;
          primary_physiotherapist_id?: string | null;
          closed_at?: string | null;
          closed_by?: string | null;
          archived_at?: string | null;
          archived_by?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          patient_id?: string;
          episode_identifier?: string;
          title?: string;
          description?: string | null;
          status?: EpisodeStatus;
          start_date?: string;
          end_date?: string | null;
          primary_physiotherapist_id?: string | null;
          closed_at?: string | null;
          closed_by?: string | null;
          archived_at?: string | null;
          archived_by?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      practice_appointment_counters: {
        Row: {
          practice_id: string;
          next_val: number;
          updated_at: string;
        };
        Insert: {
          practice_id: string;
          next_val?: number;
          updated_at?: string;
        };
        Update: {
          practice_id?: string;
          next_val?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          practice_id: string;
          patient_id: string;
          episode_id: string | null;
          physiotherapist_id: string;
          appointment_identifier: string;
          appointment_type: AppointmentType;
          status: AppointmentStatus;
          scheduled_start: string;
          scheduled_end: string;
          duration_minutes: number;
          location_mode: AppointmentLocationMode;
          notes: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          rescheduled_from_id: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id?: string;
          patient_id: string;
          episode_id?: string | null;
          physiotherapist_id: string;
          appointment_identifier?: string;
          appointment_type: AppointmentType;
          status?: AppointmentStatus;
          scheduled_start: string;
          scheduled_end?: string;
          duration_minutes: number;
          location_mode?: AppointmentLocationMode;
          notes?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          rescheduled_from_id?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          patient_id?: string;
          episode_id?: string | null;
          physiotherapist_id?: string;
          appointment_identifier?: string;
          appointment_type?: AppointmentType;
          status?: AppointmentStatus;
          scheduled_start?: string;
          scheduled_end?: string;
          duration_minutes?: number;
          location_mode?: AppointmentLocationMode;
          notes?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          rescheduled_from_id?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      practice_clinical_visit_counters: {
        Row: {
          practice_id: string;
          next_val: number;
          updated_at: string;
        };
        Insert: {
          practice_id: string;
          next_val?: number;
          updated_at?: string;
        };
        Update: {
          practice_id?: string;
          next_val?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      clinical_visits: {
        Row: {
          id: string;
          practice_id: string;
          patient_id: string;
          episode_id: string | null;
          appointment_id: string | null;
          physiotherapist_id: string;
          visit_identifier: string;
          status: ClinicalVisitStatus;
          actual_start: string | null;
          actual_end: string | null;
          duration_minutes: number | null;
          location_mode: ClinicalVisitLocationMode;
          encounter_notes: string | null;
          cancellation_reason: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          patient_id: string;
          episode_id?: string | null;
          appointment_id?: string | null;
          physiotherapist_id: string;
          visit_identifier?: string;
          status?: ClinicalVisitStatus;
          actual_start?: string | null;
          actual_end?: string | null;
          duration_minutes?: number | null;
          location_mode?: ClinicalVisitLocationMode;
          encounter_notes?: string | null;
          cancellation_reason?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          patient_id?: string;
          episode_id?: string | null;
          appointment_id?: string | null;
          physiotherapist_id?: string;
          visit_identifier?: string;
          status?: ClinicalVisitStatus;
          actual_start?: string | null;
          actual_end?: string | null;
          duration_minutes?: number | null;
          location_mode?: ClinicalVisitLocationMode;
          encounter_notes?: string | null;
          cancellation_reason?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      practice_clinical_note_counters: {
        Row: {
          practice_id: string;
          next_val: number;
          updated_at: string;
        };
        Insert: {
          practice_id: string;
          next_val?: number;
          updated_at?: string;
        };
        Update: {
          practice_id?: string;
          next_val?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      clinical_notes: {
        Row: {
          id: string;
          practice_id: string;
          clinical_visit_id: string;
          patient_id: string;
          episode_id: string | null;
          author_id: string;
          note_identifier: string;
          note_type: ClinicalNoteType;
          parent_note_id: string | null;
          status: ClinicalNoteStatus;
          subjective: string;
          objective: string;
          assessment: string;
          plan: string;
          amendment_reason: string | null;
          finalized_at: string | null;
          finalized_by: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          clinical_visit_id: string;
          patient_id: string;
          episode_id?: string | null;
          author_id: string;
          note_identifier?: string;
          note_type?: ClinicalNoteType;
          parent_note_id?: string | null;
          status?: ClinicalNoteStatus;
          subjective?: string;
          objective?: string;
          assessment?: string;
          plan?: string;
          amendment_reason?: string | null;
          finalized_at?: string | null;
          finalized_by?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          clinical_visit_id?: string;
          patient_id?: string;
          episode_id?: string | null;
          author_id?: string;
          note_identifier?: string;
          note_type?: ClinicalNoteType;
          parent_note_id?: string | null;
          status?: ClinicalNoteStatus;
          subjective?: string;
          objective?: string;
          assessment?: string;
          plan?: string;
          amendment_reason?: string | null;
          finalized_at?: string | null;
          finalized_by?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      outcome_measure_definitions: {
        Row: {
          id: string;
          practice_id: string | null;
          code: string;
          name: string;
          description: string | null;
          category: OutcomeMeasureCategory;
          scoring_type: OutcomeMeasureScoringType;
          min_score: number | null;
          max_score: number | null;
          score_unit: string | null;
          interpretation_guide: string | null;
          is_system: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id?: string | null;
          code: string;
          name: string;
          description?: string | null;
          category?: OutcomeMeasureCategory;
          scoring_type?: OutcomeMeasureScoringType;
          min_score?: number | null;
          max_score?: number | null;
          score_unit?: string | null;
          interpretation_guide?: string | null;
          is_system?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string | null;
          code?: string;
          name?: string;
          description?: string | null;
          category?: OutcomeMeasureCategory;
          scoring_type?: OutcomeMeasureScoringType;
          min_score?: number | null;
          max_score?: number | null;
          score_unit?: string | null;
          interpretation_guide?: string | null;
          is_system?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      practice_outcome_measure_counters: {
        Row: {
          practice_id: string;
          next_val: number;
          updated_at: string;
        };
        Insert: {
          practice_id: string;
          next_val?: number;
          updated_at?: string;
        };
        Update: {
          practice_id?: string;
          next_val?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      outcome_measure_assessments: {
        Row: {
          id: string;
          practice_id: string;
          patient_id: string;
          episode_id: string | null;
          clinical_visit_id: string | null;
          measure_definition_id: string;
          assessor_id: string;
          assessment_identifier: string;
          assessment_type: OutcomeAssessmentType;
          status: OutcomeAssessmentStatus;
          performed_at: string;
          numeric_score: number | null;
          percentage_score: number | null;
          score_category: string | null;
          score_interpretation: string | null;
          clinical_notes: string | null;
          finalized_at: string | null;
          finalized_by: string | null;
          amendment_reason: string | null;
          amended_numeric_score: number | null;
          amended_percentage_score: number | null;
          corrected_by: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          patient_id: string;
          episode_id?: string | null;
          clinical_visit_id?: string | null;
          measure_definition_id: string;
          assessor_id: string;
          assessment_identifier?: string;
          assessment_type?: OutcomeAssessmentType;
          status?: OutcomeAssessmentStatus;
          performed_at?: string;
          numeric_score?: number | null;
          percentage_score?: number | null;
          score_category?: string | null;
          score_interpretation?: string | null;
          clinical_notes?: string | null;
          finalized_at?: string | null;
          finalized_by?: string | null;
          amendment_reason?: string | null;
          amended_numeric_score?: number | null;
          amended_percentage_score?: number | null;
          corrected_by?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          patient_id?: string;
          episode_id?: string | null;
          clinical_visit_id?: string | null;
          measure_definition_id?: string;
          assessor_id?: string;
          assessment_identifier?: string;
          assessment_type?: OutcomeAssessmentType;
          status?: OutcomeAssessmentStatus;
          performed_at?: string;
          numeric_score?: number | null;
          percentage_score?: number | null;
          score_category?: string | null;
          score_interpretation?: string | null;
          clinical_notes?: string | null;
          finalized_at?: string | null;
          finalized_by?: string | null;
          amendment_reason?: string | null;
          amended_numeric_score?: number | null;
          amended_percentage_score?: number | null;
          corrected_by?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          practice_id: string | null;
          is_system: boolean;
          name: string;
          category: ExerciseCategory;
          body_region: ExerciseBodyRegion;
          default_laterality: ExerciseLaterality;
          equipment: string | null;
          description: string | null;
          instructions: string | null;
          precautions: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          practice_id?: string | null;
          is_system?: boolean;
          name: string;
          category?: ExerciseCategory;
          body_region?: ExerciseBodyRegion;
          default_laterality?: ExerciseLaterality;
          equipment?: string | null;
          description?: string | null;
          instructions?: string | null;
          precautions?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          practice_id?: string | null;
          is_system?: boolean;
          name?: string;
          category?: ExerciseCategory;
          body_region?: ExerciseBodyRegion;
          default_laterality?: ExerciseLaterality;
          equipment?: string | null;
          description?: string | null;
          instructions?: string | null;
          precautions?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      practice_hep_counters: {
        Row: {
          practice_id: string;
          next_val: number;
          updated_at: string;
        };
        Insert: {
          practice_id: string;
          next_val?: number;
          updated_at?: string;
        };
        Update: {
          practice_id?: string;
          next_val?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      home_exercise_programs: {
        Row: {
          id: string;
          practice_id: string;
          patient_id: string;
          episode_id: string | null;
          clinical_visit_id: string | null;
          prescribing_clinician_id: string;
          program_identifier: string;
          title: string;
          instructions: string | null;
          start_date: string;
          review_date: string | null;
          status: HEPStatus;
          finalized_at: string | null;
          finalized_by: string | null;
          discontinued_reason: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          patient_id: string;
          episode_id?: string | null;
          clinical_visit_id?: string | null;
          prescribing_clinician_id: string;
          program_identifier: string;
          title: string;
          instructions?: string | null;
          start_date?: string;
          review_date?: string | null;
          status?: HEPStatus;
          finalized_at?: string | null;
          finalized_by?: string | null;
          discontinued_reason?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          patient_id?: string;
          episode_id?: string | null;
          clinical_visit_id?: string | null;
          prescribing_clinician_id?: string;
          program_identifier?: string;
          title?: string;
          instructions?: string | null;
          start_date?: string;
          review_date?: string | null;
          status?: HEPStatus;
          finalized_at?: string | null;
          finalized_by?: string | null;
          discontinued_reason?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      home_exercise_program_items: {
        Row: {
          id: string;
          practice_id: string;
          program_id: string;
          exercise_id: string;
          order_index: number;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          program_id: string;
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
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          program_id?: string;
          exercise_id?: string;
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
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      practice_treatment_plan_counters: {
        Row: {
          practice_id: string;
          last_number: number;
          updated_at: string;
        };
        Insert: {
          practice_id: string;
          last_number?: number;
          updated_at?: string;
        };
        Update: {
          practice_id?: string;
          last_number?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      treatment_plans: {
        Row: {
          id: string;
          practice_id: string;
          patient_id: string;
          episode_id: string;
          originating_clinical_visit_id: string | null;
          prescribing_clinician_id: string;
          plan_identifier: string;
          title: string;
          diagnosis_summary: string | null;
          clinical_rationale: string | null;
          overall_goals_summary: string | null;
          treatment_frequency: string | null;
          expected_duration_weeks: number | null;
          start_date: string;
          target_review_date: string | null;
          status: TreatmentPlanStatus;
          finalized_at: string | null;
          finalized_by: string | null;
          discontinued_reason: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          patient_id: string;
          episode_id: string;
          originating_clinical_visit_id?: string | null;
          prescribing_clinician_id: string;
          plan_identifier: string;
          title: string;
          diagnosis_summary?: string | null;
          clinical_rationale?: string | null;
          overall_goals_summary?: string | null;
          treatment_frequency?: string | null;
          expected_duration_weeks?: number | null;
          start_date?: string;
          target_review_date?: string | null;
          status?: TreatmentPlanStatus;
          finalized_at?: string | null;
          finalized_by?: string | null;
          discontinued_reason?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          patient_id?: string;
          episode_id?: string;
          originating_clinical_visit_id?: string | null;
          prescribing_clinician_id?: string;
          plan_identifier?: string;
          title?: string;
          diagnosis_summary?: string | null;
          clinical_rationale?: string | null;
          overall_goals_summary?: string | null;
          treatment_frequency?: string | null;
          expected_duration_weeks?: number | null;
          start_date?: string;
          target_review_date?: string | null;
          status?: TreatmentPlanStatus;
          finalized_at?: string | null;
          finalized_by?: string | null;
          discontinued_reason?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      treatment_plan_goals: {
        Row: {
          id: string;
          practice_id: string;
          treatment_plan_id: string;
          order_index: number;
          goal_statement: string;
          category: TreatmentGoalCategory;
          baseline_description: string | null;
          target_description: string | null;
          measurement_method: string | null;
          target_timeframe_weeks: number | null;
          priority: TreatmentGoalPriority;
          status: TreatmentGoalStatus;
          review_date: string | null;
          achieved_date: string | null;
          notes: string | null;
          baseline_outcome_assessment_id: string | null;
          target_outcome_assessment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          treatment_plan_id: string;
          order_index?: number;
          goal_statement: string;
          category?: TreatmentGoalCategory;
          baseline_description?: string | null;
          target_description?: string | null;
          measurement_method?: string | null;
          target_timeframe_weeks?: number | null;
          priority?: TreatmentGoalPriority;
          status?: TreatmentGoalStatus;
          review_date?: string | null;
          achieved_date?: string | null;
          notes?: string | null;
          baseline_outcome_assessment_id?: string | null;
          target_outcome_assessment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          treatment_plan_id?: string;
          order_index?: number;
          goal_statement?: string;
          category?: TreatmentGoalCategory;
          baseline_description?: string | null;
          target_description?: string | null;
          measurement_method?: string | null;
          target_timeframe_weeks?: number | null;
          priority?: TreatmentGoalPriority;
          status?: TreatmentGoalStatus;
          review_date?: string | null;
          achieved_date?: string | null;
          notes?: string | null;
          baseline_outcome_assessment_id?: string | null;
          target_outcome_assessment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      practice_progress_review_counters: {
        Row: {
          practice_id: string;
          last_number: number;
          updated_at: string;
        };
        Insert: {
          practice_id: string;
          last_number?: number;
          updated_at?: string;
        };
        Update: {
          practice_id?: string;
          last_number?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      progress_reviews: {
        Row: {
          id: string;
          practice_id: string;
          patient_id: string;
          episode_id: string;
          treatment_plan_id: string;
          originating_clinical_visit_id: string | null;
          reviewing_clinician_id: string;
          review_identifier: string;
          review_date: string;
          period_start_date: string | null;
          period_end_date: string | null;
          overall_status: ProgressReviewStatus;
          overall_progress_assessment: OverallProgressRating;
          clinical_summary: string;
          barriers_identified: string | null;
          treatment_modifications: string | null;
          plan_recommendation: ProgressReviewPlanRecommendation;
          next_review_due_date: string | null;
          finalized_at: string | null;
          finalized_by: string | null;
          amendment_reason: string | null;
          amended_at: string | null;
          amended_by: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          patient_id: string;
          episode_id: string;
          treatment_plan_id: string;
          originating_clinical_visit_id?: string | null;
          reviewing_clinician_id: string;
          review_identifier: string;
          review_date?: string;
          period_start_date?: string | null;
          period_end_date?: string | null;
          overall_status?: ProgressReviewStatus;
          overall_progress_assessment?: OverallProgressRating;
          clinical_summary: string;
          barriers_identified?: string | null;
          treatment_modifications?: string | null;
          plan_recommendation?: ProgressReviewPlanRecommendation;
          next_review_due_date?: string | null;
          finalized_at?: string | null;
          finalized_by?: string | null;
          amendment_reason?: string | null;
          amended_at?: string | null;
          amended_by?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          patient_id?: string;
          episode_id?: string;
          treatment_plan_id?: string;
          originating_clinical_visit_id?: string | null;
          reviewing_clinician_id?: string;
          review_identifier?: string;
          review_date?: string;
          period_start_date?: string | null;
          period_end_date?: string | null;
          overall_status?: ProgressReviewStatus;
          overall_progress_assessment?: OverallProgressRating;
          clinical_summary?: string;
          barriers_identified?: string | null;
          treatment_modifications?: string | null;
          plan_recommendation?: ProgressReviewPlanRecommendation;
          next_review_due_date?: string | null;
          finalized_at?: string | null;
          finalized_by?: string | null;
          amendment_reason?: string | null;
          amended_at?: string | null;
          amended_by?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      progress_review_goals: {
        Row: {
          id: string;
          practice_id: string;
          progress_review_id: string;
          treatment_plan_goal_id: string;
          status_at_review: GoalProgressStatus;
          current_value: string | null;
          measurement_method: string | null;
          clinician_assessment: string;
          progress_notes: string | null;
          linked_outcome_assessment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          progress_review_id: string;
          treatment_plan_goal_id: string;
          status_at_review?: GoalProgressStatus;
          current_value?: string | null;
          measurement_method?: string | null;
          clinician_assessment: string;
          progress_notes?: string | null;
          linked_outcome_assessment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          progress_review_id?: string;
          treatment_plan_goal_id?: string;
          status_at_review?: GoalProgressStatus;
          current_value?: string | null;
          measurement_method?: string | null;
          clinician_assessment?: string;
          progress_notes?: string | null;
          linked_outcome_assessment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      practice_discharge_summary_counters: {
        Row: {
          practice_id: string;
          last_number: number;
          updated_at: string;
        };
        Insert: {
          practice_id: string;
          last_number?: number;
          updated_at?: string;
        };
        Update: {
          practice_id?: string;
          last_number?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      discharge_summaries: {
        Row: {
          id: string;
          practice_id: string;
          patient_id: string;
          episode_id: string;
          treatment_plan_id: string | null;
          originating_clinical_visit_id: string | null;
          final_progress_review_id: string | null;
          discharging_clinician_id: string;
          summary_identifier: string;
          discharge_date: string;
          discharge_reason: DischargeReason;
          discharge_disposition: DischargeDisposition;
          status: DischargeSummaryStatus;
          clinical_summary: string;
          functional_status_at_discharge: string;
          goal_attainment_summary: string;
          outcome_measure_summary: string | null;
          treatment_summary: string | null;
          hep_transition_summary: string | null;
          recommendations: string | null;
          follow_up_recommendations: string | null;
          finalized_at: string | null;
          finalized_by: string | null;
          amendment_reason: string | null;
          amended_at: string | null;
          amended_by: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          patient_id: string;
          episode_id: string;
          treatment_plan_id?: string | null;
          originating_clinical_visit_id?: string | null;
          final_progress_review_id?: string | null;
          discharging_clinician_id: string;
          summary_identifier: string;
          discharge_date?: string;
          discharge_reason?: DischargeReason;
          discharge_disposition?: DischargeDisposition;
          status?: DischargeSummaryStatus;
          clinical_summary: string;
          functional_status_at_discharge: string;
          goal_attainment_summary: string;
          outcome_measure_summary?: string | null;
          treatment_summary?: string | null;
          hep_transition_summary?: string | null;
          recommendations?: string | null;
          follow_up_recommendations?: string | null;
          finalized_at?: string | null;
          finalized_by?: string | null;
          amendment_reason?: string | null;
          amended_at?: string | null;
          amended_by?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          patient_id?: string;
          episode_id?: string;
          treatment_plan_id?: string | null;
          originating_clinical_visit_id?: string | null;
          final_progress_review_id?: string | null;
          discharging_clinician_id?: string;
          summary_identifier?: string;
          discharge_date?: string;
          discharge_reason?: DischargeReason;
          discharge_disposition?: DischargeDisposition;
          status?: DischargeSummaryStatus;
          clinical_summary?: string;
          functional_status_at_discharge?: string;
          goal_attainment_summary?: string;
          outcome_measure_summary?: string | null;
          treatment_summary?: string | null;
          hep_transition_summary?: string | null;
          recommendations?: string | null;
          follow_up_recommendations?: string | null;
          finalized_at?: string | null;
          finalized_by?: string | null;
          amendment_reason?: string | null;
          amended_at?: string | null;
          amended_by?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      practice_service_counters: {
        Row: {
          practice_id: string;
          last_number: number;
          updated_at: string;
        };
        Insert: {
          practice_id: string;
          last_number?: number;
          updated_at?: string;
        };
        Update: {
          practice_id?: string;
          last_number?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      practice_fee_schedule_counters: {
        Row: {
          practice_id: string;
          last_number: number;
          updated_at: string;
        };
        Insert: {
          practice_id: string;
          last_number?: number;
          updated_at?: string;
        };
        Update: {
          practice_id?: string;
          last_number?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          practice_id: string;
          service_code: string;
          name: string;
          category: ServiceCategory;
          description: string | null;
          standard_duration_minutes: number;
          delivery_mode: string;
          is_active: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          service_code: string;
          name: string;
          category: ServiceCategory;
          description?: string | null;
          standard_duration_minutes?: number;
          delivery_mode?: string;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          service_code?: string;
          name?: string;
          category?: ServiceCategory;
          description?: string | null;
          standard_duration_minutes?: number;
          delivery_mode?: string;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fee_schedules: {
        Row: {
          id: string;
          practice_id: string;
          schedule_identifier: string;
          name: string;
          description: string | null;
          effective_from: string;
          effective_to: string | null;
          status: FeeScheduleStatus;
          is_default: boolean;
          currency: string;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          schedule_identifier: string;
          name: string;
          description?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          status?: FeeScheduleStatus;
          is_default?: boolean;
          currency?: string;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          schedule_identifier?: string;
          name?: string;
          description?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          status?: FeeScheduleStatus;
          is_default?: boolean;
          currency?: string;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fee_schedule_items: {
        Row: {
          id: string;
          practice_id: string;
          fee_schedule_id: string;
          service_id: string;
          unit_price: number;
          currency: string;
          is_taxable: boolean;
          tax_rate_percent: number;
          notes: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          fee_schedule_id: string;
          service_id: string;
          unit_price: number;
          currency?: string;
          is_taxable?: boolean;
          tax_rate_percent?: number;
          notes?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          fee_schedule_id?: string;
          service_id?: string;
          unit_price?: number;
          currency?: string;
          is_taxable?: boolean;
          tax_rate_percent?: number;
          notes?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_next_service_code: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      generate_next_fee_schedule_identifier: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      generate_next_discharge_summary_identifier: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      generate_next_progress_review_identifier: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      generate_next_treatment_plan_identifier: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      generate_next_hep_identifier: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      generate_next_outcome_measure_identifier: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      generate_next_clinical_note_identifier: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      generate_next_clinical_visit_identifier: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      generate_next_appointment_identifier: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      generate_next_episode_identifier: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      generate_next_patient_identifier: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      current_practice_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      user_has_practice_role: {
        Args: {
          target_practice_id: string;
          allowed_roles: string[];
        };
        Returns: boolean;
      };
      is_platform_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      log_audit_event: {
        Args: {
          p_action: string;
          p_entity_type: string;
          p_entity_id?: string | null;
          p_metadata?: Json;
          p_source?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      membership_role: MembershipRole;
      membership_status: MembershipStatus;
      practice_status: PracticeStatus;
      subscription_tier: SubscriptionTier;
      subscription_status: SubscriptionStatus;
      patient_status: PatientStatus;
      patient_sex: PatientSex;
      episode_status: EpisodeStatus;
      appointment_status: AppointmentStatus;
      appointment_type: AppointmentType;
      appointment_location_mode: AppointmentLocationMode;
      clinical_visit_status: ClinicalVisitStatus;
      clinical_visit_location_mode: ClinicalVisitLocationMode;
      clinical_note_status: ClinicalNoteStatus;
      clinical_note_type: ClinicalNoteType;
      outcome_measure_category: OutcomeMeasureCategory;
      outcome_measure_scoring_type: OutcomeMeasureScoringType;
      outcome_assessment_type: OutcomeAssessmentType;
      outcome_assessment_status: OutcomeAssessmentStatus;
      hep_status: HEPStatus;
      exercise_category: ExerciseCategory;
      exercise_body_region: ExerciseBodyRegion;
      exercise_laterality: ExerciseLaterality;
      treatment_plan_status: TreatmentPlanStatus;
      treatment_goal_category: TreatmentGoalCategory;
      treatment_goal_priority: TreatmentGoalPriority;
      treatment_goal_status: TreatmentGoalStatus;
      progress_review_status: ProgressReviewStatus;
      overall_progress_rating: OverallProgressRating;
      progress_review_plan_recommendation: ProgressReviewPlanRecommendation;
      goal_progress_status: GoalProgressStatus;
      discharge_summary_status: DischargeSummaryStatus;
      discharge_reason: DischargeReason;
      discharge_disposition: DischargeDisposition;
      service_category: ServiceCategory;
      fee_schedule_status: FeeScheduleStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
