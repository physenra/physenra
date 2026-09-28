import type {
  Database,
  MembershipRole,
  MembershipStatus,
  PracticeStatus,
  PatientStatus,
  PatientSex,
  EpisodeStatus,
} from './database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Practice = Database['public']['Tables']['practices']['Row'];
export type PracticeMembership = Database['public']['Tables']['practice_memberships']['Row'];
export type Patient = Database['public']['Tables']['patients']['Row'];
export type PatientInsert = Database['public']['Tables']['patients']['Insert'];
export type PatientUpdate = Database['public']['Tables']['patients']['Update'];

export type EpisodeOfCare = Database['public']['Tables']['episodes_of_care']['Row'];
export type EpisodeOfCareInsert = Database['public']['Tables']['episodes_of_care']['Insert'];
export type EpisodeOfCareUpdate = Database['public']['Tables']['episodes_of_care']['Update'];

export interface EpisodeWithPatient extends EpisodeOfCare {
  patients?: Pick<Patient, 'id' | 'patient_identifier' | 'first_name' | 'last_name' | 'phone' | 'email'> | null;
  primary_physiotherapist?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
}

export interface UserPracticeMembership {
  id: string;
  practiceId: string;
  practiceName: string;
  practiceSlug: string;
  practiceStatus: PracticeStatus;
  role: MembershipRole;
  membershipStatus: MembershipStatus;
  timezone: string;
  country: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  profile: Profile | null;
}

export type {
  MembershipRole,
  MembershipStatus,
  PracticeStatus,
  PatientStatus,
  PatientSex,
  EpisodeStatus,
};


