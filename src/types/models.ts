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
  TreatmentPlanStatus,
  TreatmentGoalCategory,
  TreatmentGoalPriority,
  TreatmentGoalStatus,
  ProgressReviewStatus,
  OverallProgressRating,
  ProgressReviewPlanRecommendation,
  GoalProgressStatus,
  DischargeSummaryStatus,
  DischargeReason,
  DischargeDisposition,
  ServiceCategory,
  FeeScheduleStatus,
  InvoiceStatus,
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

export type TreatmentPlan = Database['public']['Tables']['treatment_plans']['Row'];
export type TreatmentPlanInsert = Database['public']['Tables']['treatment_plans']['Insert'];
export type TreatmentPlanUpdate = Database['public']['Tables']['treatment_plans']['Update'];

export type TreatmentPlanGoal = Database['public']['Tables']['treatment_plan_goals']['Row'];
export type TreatmentPlanGoalInsert = Database['public']['Tables']['treatment_plan_goals']['Insert'];
export type TreatmentPlanGoalUpdate = Database['public']['Tables']['treatment_plan_goals']['Update'];

export type ProgressReview = Database['public']['Tables']['progress_reviews']['Row'];
export type ProgressReviewInsert = Database['public']['Tables']['progress_reviews']['Insert'];
export type ProgressReviewUpdate = Database['public']['Tables']['progress_reviews']['Update'];

export type ProgressReviewGoal = Database['public']['Tables']['progress_review_goals']['Row'];
export type ProgressReviewGoalInsert = Database['public']['Tables']['progress_review_goals']['Insert'];
export type ProgressReviewGoalUpdate = Database['public']['Tables']['progress_review_goals']['Update'];

export type DischargeSummary = Database['public']['Tables']['discharge_summaries']['Row'];
export type DischargeSummaryInsert = Database['public']['Tables']['discharge_summaries']['Insert'];
export type DischargeSummaryUpdate = Database['public']['Tables']['discharge_summaries']['Update'];
export type PracticeDischargeSummaryCounter = Database['public']['Tables']['practice_discharge_summary_counters']['Row'];

export type Service = Database['public']['Tables']['services']['Row'];
export type ServiceInsert = Database['public']['Tables']['services']['Insert'];
export type ServiceUpdate = Database['public']['Tables']['services']['Update'];
export type PracticeServiceCounter = Database['public']['Tables']['practice_service_counters']['Row'];

export type FeeSchedule = Database['public']['Tables']['fee_schedules']['Row'];
export type FeeScheduleInsert = Database['public']['Tables']['fee_schedules']['Insert'];
export type FeeScheduleUpdate = Database['public']['Tables']['fee_schedules']['Update'];
export type PracticeFeeScheduleCounter = Database['public']['Tables']['practice_fee_schedule_counters']['Row'];

export type FeeScheduleItem = Database['public']['Tables']['fee_schedule_items']['Row'];
export type FeeScheduleItemInsert = Database['public']['Tables']['fee_schedule_items']['Insert'];
export type FeeScheduleItemUpdate = Database['public']['Tables']['fee_schedule_items']['Update'];

export type PracticeInvoiceCounter = Database['public']['Tables']['practice_invoice_counters']['Row'];

export type Invoice = Database['public']['Tables']['invoices']['Row'];
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];

export type InvoiceLine = Database['public']['Tables']['invoice_lines']['Row'];
export type InvoiceLineInsert = Database['public']['Tables']['invoice_lines']['Insert'];
export type InvoiceLineUpdate = Database['public']['Tables']['invoice_lines']['Update'];

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

export interface TreatmentPlanGoalWithOutcome extends TreatmentPlanGoal {
  baseline_outcome_assessment?: OutcomeMeasureAssessmentWithRelations | null;
  target_outcome_assessment?: OutcomeMeasureAssessmentWithRelations | null;
}

export interface TreatmentPlanWithRelations extends TreatmentPlan {
  patient?: Pick<Patient, 'id' | 'patient_identifier' | 'first_name' | 'last_name' | 'phone' | 'email'> | null;
  episode?: Pick<EpisodeOfCare, 'id' | 'episode_identifier' | 'title' | 'status'> | null;
  originating_clinical_visit?: Pick<ClinicalVisit, 'id' | 'visit_identifier' | 'status' | 'actual_start' | 'actual_end'> | null;
  prescribing_clinician?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  finalizer?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  goals?: TreatmentPlanGoalWithOutcome[];
}

export interface TreatmentPlanFilters {
  patientId?: string;
  episodeId?: string;
  visitId?: string;
  clinicianId?: string;
  status?: TreatmentPlanStatus | 'all';
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

export interface ProgressReviewGoalWithDetails extends ProgressReviewGoal {
  treatment_plan_goal?: TreatmentPlanGoalWithOutcome | null;
  linked_outcome_assessment?: OutcomeMeasureAssessmentWithRelations | null;
}

export interface ProgressReviewWithRelations extends ProgressReview {
  patient?: Pick<Patient, 'id' | 'patient_identifier' | 'first_name' | 'last_name' | 'phone' | 'email'> | null;
  episode?: Pick<EpisodeOfCare, 'id' | 'episode_identifier' | 'title' | 'status'> | null;
  treatment_plan?: Pick<TreatmentPlan, 'id' | 'plan_identifier' | 'title' | 'status' | 'start_date' | 'target_review_date'> | null;
  originating_clinical_visit?: Pick<ClinicalVisit, 'id' | 'visit_identifier' | 'status' | 'actual_start' | 'actual_end'> | null;
  reviewing_clinician?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  finalizer?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  amender?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  goals?: ProgressReviewGoalWithDetails[];
}

export interface ProgressReviewFilters {
  patientId?: string;
  episodeId?: string;
  treatmentPlanId?: string;
  clinicianId?: string;
  status?: ProgressReviewStatus | 'all';
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

export interface DischargeSummaryWithRelations extends DischargeSummary {
  patient?: Pick<Patient, 'id' | 'patient_identifier' | 'first_name' | 'last_name' | 'phone' | 'email'> | null;
  episode?: Pick<EpisodeOfCare, 'id' | 'episode_identifier' | 'title' | 'status'> | null;
  treatment_plan?: Pick<TreatmentPlan, 'id' | 'plan_identifier' | 'title' | 'status'> | null;
  originating_clinical_visit?: Pick<ClinicalVisit, 'id' | 'visit_identifier' | 'status' | 'actual_start' | 'actual_end'> | null;
  final_progress_review?: Pick<ProgressReview, 'id' | 'review_identifier' | 'review_date' | 'overall_status'> | null;
  discharging_clinician?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  finalizer?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  amender?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
}

export interface DischargeSummaryFilters {
  patientId?: string;
  episodeId?: string;
  treatmentPlanId?: string;
  clinicianId?: string;
  status?: DischargeSummaryStatus | 'all';
  dischargeReason?: DischargeReason | 'all';
  dischargeDisposition?: DischargeDisposition | 'all';
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

export interface FeeScheduleItemWithService extends FeeScheduleItem {
  service?: Pick<Service, 'id' | 'service_code' | 'name' | 'category' | 'standard_duration_minutes' | 'delivery_mode' | 'is_active'> | null;
}

export interface FeeScheduleWithItems extends FeeSchedule {
  items?: FeeScheduleItemWithService[];
  creator?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
}

export interface ServiceFilters {
  category?: ServiceCategory | 'all';
  deliveryMode?: string;
  isActive?: boolean | 'all';
  searchQuery?: string;
}

export interface FeeScheduleFilters {
  status?: FeeScheduleStatus | 'all';
  searchQuery?: string;
  isDefault?: boolean;
}

export interface InvoiceLineWithService extends InvoiceLine {
  service?: Pick<Service, 'id' | 'service_code' | 'name' | 'category' | 'standard_duration_minutes'> | null;
}

export interface InvoiceWithRelations extends Invoice {
  patient?: Pick<Patient, 'id' | 'patient_identifier' | 'first_name' | 'last_name' | 'phone' | 'email'> | null;
  episode?: Pick<EpisodeOfCare, 'id' | 'episode_identifier' | 'title' | 'status'> | null;
  clinical_visit?: Pick<ClinicalVisit, 'id' | 'visit_identifier' | 'status' | 'actual_start' | 'actual_end'> | null;
  fee_schedule?: Pick<FeeSchedule, 'id' | 'schedule_identifier' | 'name' | 'currency'> | null;
  lines?: InvoiceLineWithService[];
  creator?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  finalizer?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  voider?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
}

export interface InvoiceFilters {
  status?: InvoiceStatus | 'all';
  patientId?: string;
  episodeId?: string;
  clinicalVisitId?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
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
  TreatmentPlanStatus,
  TreatmentGoalCategory,
  TreatmentGoalPriority,
  TreatmentGoalStatus,
  ProgressReviewStatus,
  OverallProgressRating,
  ProgressReviewPlanRecommendation,
  GoalProgressStatus,
  DischargeSummaryStatus,
  DischargeReason,
  DischargeDisposition,
  ServiceCategory,
  FeeScheduleStatus,
  InvoiceStatus,
};



