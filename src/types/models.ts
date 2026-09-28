import type {
  Database,
  MembershipRole,
  MembershipStatus,
  PracticeStatus,
  PatientStatus,
  PatientSex,
  EpisodeStatus,
  AppointmentStatus,
  AppointmentType,
  AppointmentLocationMode,
  ClinicalVisitStatus,
  ClinicalVisitLocationMode,
  ClinicalNoteStatus,
  ClinicalNoteType,
  OutcomeMeasureCategory,
  OutcomeMeasureScoringType,
  OutcomeAssessmentType,
  OutcomeAssessmentStatus,
  HEPStatus,
  ExerciseCategory,
  ExerciseBodyRegion,
  ExerciseLaterality,
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

export type Appointment = Database['public']['Tables']['appointments']['Row'];
export type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
export type AppointmentUpdate = Database['public']['Tables']['appointments']['Update'];

export type ClinicalVisit = Database['public']['Tables']['clinical_visits']['Row'];
export type ClinicalVisitInsert = Database['public']['Tables']['clinical_visits']['Insert'];
export type ClinicalVisitUpdate = Database['public']['Tables']['clinical_visits']['Update'];

export type ClinicalNote = Database['public']['Tables']['clinical_notes']['Row'];
export type ClinicalNoteInsert = Database['public']['Tables']['clinical_notes']['Insert'];
export type ClinicalNoteUpdate = Database['public']['Tables']['clinical_notes']['Update'];

export type OutcomeMeasureDefinition = Database['public']['Tables']['outcome_measure_definitions']['Row'];
export type OutcomeMeasureDefinitionInsert = Database['public']['Tables']['outcome_measure_definitions']['Insert'];
export type OutcomeMeasureDefinitionUpdate = Database['public']['Tables']['outcome_measure_definitions']['Update'];

export type OutcomeMeasureAssessment = Database['public']['Tables']['outcome_measure_assessments']['Row'];
export type OutcomeMeasureAssessmentInsert = Database['public']['Tables']['outcome_measure_assessments']['Insert'];
export type OutcomeMeasureAssessmentUpdate = Database['public']['Tables']['outcome_measure_assessments']['Update'];

export type Exercise = Database['public']['Tables']['exercises']['Row'];
export type ExerciseInsert = Database['public']['Tables']['exercises']['Insert'];
export type ExerciseUpdate = Database['public']['Tables']['exercises']['Update'];

export type HomeExerciseProgram = Database['public']['Tables']['home_exercise_programs']['Row'];
export type HomeExerciseProgramInsert = Database['public']['Tables']['home_exercise_programs']['Insert'];
export type HomeExerciseProgramUpdate = Database['public']['Tables']['home_exercise_programs']['Update'];

export type HomeExerciseProgramItem = Database['public']['Tables']['home_exercise_program_items']['Row'];
export type HomeExerciseProgramItemInsert = Database['public']['Tables']['home_exercise_program_items']['Insert'];
export type HomeExerciseProgramItemUpdate = Database['public']['Tables']['home_exercise_program_items']['Update'];

export interface EpisodeWithPatient extends EpisodeOfCare {
  patients?: Pick<Patient, 'id' | 'patient_identifier' | 'first_name' | 'last_name' | 'phone' | 'email'> | null;
  primary_physiotherapist?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
}

export interface AppointmentWithRelations extends Appointment {
  patient?: Pick<Patient, 'id' | 'patient_identifier' | 'first_name' | 'last_name' | 'phone' | 'email'> | null;
  episode?: Pick<EpisodeOfCare, 'id' | 'episode_identifier' | 'title' | 'status'> | null;
  physiotherapist?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  clinical_visit?: Pick<ClinicalVisit, 'id' | 'visit_identifier' | 'status'> | null;
}

export interface ClinicalVisitWithRelations extends ClinicalVisit {
  patient?: Pick<Patient, 'id' | 'patient_identifier' | 'first_name' | 'last_name' | 'phone' | 'email'> | null;
  episode?: Pick<EpisodeOfCare, 'id' | 'episode_identifier' | 'title' | 'status'> | null;
  appointment?: Pick<Appointment, 'id' | 'appointment_identifier' | 'status' | 'scheduled_start' | 'scheduled_end' | 'appointment_type'> | null;
  physiotherapist?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  clinical_note?: Pick<ClinicalNote, 'id' | 'note_identifier' | 'status'> | null;
}

export interface ClinicalNoteWithRelations extends ClinicalNote {
  patient?: Pick<Patient, 'id' | 'patient_identifier' | 'first_name' | 'last_name' | 'phone' | 'email'> | null;
  episode?: Pick<EpisodeOfCare, 'id' | 'episode_identifier' | 'title' | 'status'> | null;
  clinical_visit?: Pick<ClinicalVisit, 'id' | 'visit_identifier' | 'status' | 'actual_start' | 'actual_end'> | null;
  author?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  finalizer?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  parent_note?: Pick<ClinicalNote, 'id' | 'note_identifier' | 'note_type' | 'status'> | null;
  addenda?: ClinicalNoteWithRelations[];
}

export interface ClinicalNoteFilters {
  patientId?: string;
  episodeId?: string;
  visitId?: string;
  authorId?: string;
  status?: ClinicalNoteStatus | 'all';
  noteType?: ClinicalNoteType | 'all';
  searchQuery?: string;
}

export interface AppointmentFilters {
  date?: string; // YYYY-MM-DD
  startDate?: string;
  endDate?: string;
  patientId?: string;
  episodeId?: string;
  physiotherapistId?: string;
  status?: AppointmentStatus | 'all';
  appointmentType?: AppointmentType | 'all';
  searchQuery?: string;
}

export interface ClinicalVisitFilters {
  date?: string; // YYYY-MM-DD
  startDate?: string;
  endDate?: string;
  patientId?: string;
  episodeId?: string;
  physiotherapistId?: string;
  status?: ClinicalVisitStatus | 'all';
  locationMode?: ClinicalVisitLocationMode | 'all';
  searchQuery?: string;
}

export interface OutcomeMeasureAssessmentWithRelations extends OutcomeMeasureAssessment {
  patient?: Pick<Patient, 'id' | 'patient_identifier' | 'first_name' | 'last_name' | 'phone' | 'email'> | null;
  episode?: Pick<EpisodeOfCare, 'id' | 'episode_identifier' | 'title' | 'status'> | null;
  clinical_visit?: Pick<ClinicalVisit, 'id' | 'visit_identifier' | 'status' | 'actual_start' | 'actual_end'> | null;
  definition?: OutcomeMeasureDefinition | null;
  assessor?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  finalizer?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  corrector?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
}

export interface OutcomeMeasureFilters {
  patientId?: string;
  episodeId?: string;
  visitId?: string;
  measureId?: string;
  assessorId?: string;
  assessmentType?: OutcomeAssessmentType | 'all';
  status?: OutcomeAssessmentStatus | 'all';
  searchQuery?: string;
}

export interface HomeExerciseProgramItemWithExercise extends HomeExerciseProgramItem {
  exercise?: Exercise | null;
}

export interface HomeExerciseProgramWithRelations extends HomeExerciseProgram {
  patient?: Pick<Patient, 'id' | 'patient_identifier' | 'first_name' | 'last_name' | 'phone' | 'email'> | null;
  episode?: Pick<EpisodeOfCare, 'id' | 'episode_identifier' | 'title' | 'status'> | null;
  clinical_visit?: Pick<ClinicalVisit, 'id' | 'visit_identifier' | 'status' | 'actual_start' | 'actual_end'> | null;
  prescribing_clinician?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  finalizer?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  items?: HomeExerciseProgramItemWithExercise[];
}

export interface HEPFilters {
  patientId?: string;
  episodeId?: string;
  visitId?: string;
  clinicianId?: string;
  status?: HEPStatus | 'all';
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
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
  AppointmentStatus,
  AppointmentType,
  AppointmentLocationMode,
  ClinicalVisitStatus,
  ClinicalVisitLocationMode,
  ClinicalNoteStatus,
  ClinicalNoteType,
  OutcomeMeasureCategory,
  OutcomeMeasureScoringType,
  OutcomeAssessmentType,
  OutcomeAssessmentStatus,
  HEPStatus,
  ExerciseCategory,
  ExerciseBodyRegion,
  ExerciseLaterality,
};


