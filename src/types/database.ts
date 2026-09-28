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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
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
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
