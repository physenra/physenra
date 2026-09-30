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
  PaymentMethod,
  PaymentStatus,
  ReceiptStatus,
  PackageStatus,
  WalletStatus,
  WalletLedgerEntryType,
  MembershipFrequency,
  PatientMembershipStatus,
  MembershipCycleStatus,
  InventoryLocationType,
  InventoryItemCategory,
  InventoryBaseUnit,
  InventoryMovementType,
  InventoryAdjustmentReason,
  ImagingModality,
  ImagingAnatomicalRegion,
  ImagingLaterality,
  ImagingUrgency,
  ImagingOrderStatus,
  ImagingReviewStatus,
  ImagingPatientReleaseStatus,
  ImagingReportType,
  ImagingReportSource,
  ImagingAttachmentType,
  ImagingMimeType,
} from './database';

export type {
  ImagingModality,
  ImagingAnatomicalRegion,
  ImagingLaterality,
  ImagingUrgency,
  ImagingOrderStatus,
  ImagingReviewStatus,
  ImagingPatientReleaseStatus,
  ImagingReportType,
  ImagingReportSource,
  ImagingAttachmentType,
  ImagingMimeType,
};

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

export type PracticePaymentCounter = Database['public']['Tables']['practice_payment_counters']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
export type PaymentUpdate = Database['public']['Tables']['payments']['Update'];

export type PracticeReceiptCounter = Database['public']['Tables']['practice_receipt_counters']['Row'];
export type Receipt = Database['public']['Tables']['receipts']['Row'];
export type ReceiptInsert = Database['public']['Tables']['receipts']['Insert'];
export type ReceiptUpdate = Database['public']['Tables']['receipts']['Update'];

export type PaymentAllocation = Database['public']['Tables']['payment_allocations']['Row'];
export type PaymentAllocationInsert = Database['public']['Tables']['payment_allocations']['Insert'];
export type PaymentAllocationUpdate = Database['public']['Tables']['payment_allocations']['Update'];

export type PracticeWalletCounter = Database['public']['Tables']['practice_wallet_counters']['Row'];
export type PatientWallet = Database['public']['Tables']['patient_wallets']['Row'];
export type PatientWalletInsert = Database['public']['Tables']['patient_wallets']['Insert'];
export type PatientWalletUpdate = Database['public']['Tables']['patient_wallets']['Update'];

export type PatientWalletLedgerEntry = Database['public']['Tables']['patient_wallet_ledger']['Row'];
export type PatientWalletLedgerEntryInsert = Database['public']['Tables']['patient_wallet_ledger']['Insert'];
export type PatientWalletLedgerEntryUpdate = Database['public']['Tables']['patient_wallet_ledger']['Update'];

export type PracticeMembershipCounter = Database['public']['Tables']['practice_membership_counters']['Row'];

export type MembershipPlan = Database['public']['Tables']['membership_plans']['Row'];
export type MembershipPlanInsert = Database['public']['Tables']['membership_plans']['Insert'];
export type MembershipPlanUpdate = Database['public']['Tables']['membership_plans']['Update'];

export type PatientMembership = Database['public']['Tables']['patient_memberships']['Row'];
export type PatientMembershipInsert = Database['public']['Tables']['patient_memberships']['Insert'];
export type PatientMembershipUpdate = Database['public']['Tables']['patient_memberships']['Update'];

export type MembershipBillingCycle = Database['public']['Tables']['membership_billing_cycles']['Row'];
export type MembershipBillingCycleInsert = Database['public']['Tables']['membership_billing_cycles']['Insert'];
export type MembershipBillingCycleUpdate = Database['public']['Tables']['membership_billing_cycles']['Update'];

export type MembershipUsageLedgerEntry = Database['public']['Tables']['membership_usage_ledger']['Row'];
export type MembershipUsageLedgerEntryInsert = Database['public']['Tables']['membership_usage_ledger']['Insert'];
export type MembershipUsageLedgerEntryUpdate = Database['public']['Tables']['membership_usage_ledger']['Update'];



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

export interface PaymentAllocationWithInvoice extends PaymentAllocation {
  invoice?: Pick<Invoice, 'id' | 'invoice_number' | 'grand_total' | 'balance_due' | 'status' | 'currency'> | null;
}

export interface PaymentWithRelations extends Payment {
  patient?: Pick<Patient, 'id' | 'patient_identifier' | 'first_name' | 'last_name' | 'phone' | 'email'> | null;
  allocations?: PaymentAllocationWithInvoice[];
  receipt?: Receipt | null;
  recorder?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  voider?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
}

export interface ReceiptWithRelations extends Receipt {
  patient?: Pick<Patient, 'id' | 'patient_identifier' | 'first_name' | 'last_name' | 'phone' | 'email'> | null;
  payment?: (Pick<Payment, 'id' | 'payment_number' | 'payment_date' | 'amount' | 'currency' | 'payment_method' | 'reference_number' | 'status'> & {
    allocations?: PaymentAllocationWithInvoice[];
  }) | null;
  issuer?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
  voider?: Pick<Profile, 'id' | 'display_name' | 'first_name' | 'last_name'> | null;
}

export interface RecordPaymentAllocationItem {
  invoice_id: string;
  amount: number;
}

export interface RecordPaymentPayload {
  patient_id: string;
  payment_date?: string;
  amount: number;
  currency?: string;
  payment_method: PaymentMethod;
  reference_number?: string | null;
  idempotency_key?: string;
  notes?: string | null;
  allocations: RecordPaymentAllocationItem[];
}

export interface VoidPaymentPayload {
  payment_id: string;
  void_reason: string;
}

export interface PaymentFilters {
  status?: PaymentStatus | 'all';
  patientId?: string;
  paymentMethod?: PaymentMethod | 'all';
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

export interface ReceiptFilters {
  status?: ReceiptStatus | 'all';
  patientId?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

// ----------------------------------------------------------------------------
// PACKAGES FOUNDATION V1 MODELS
// ----------------------------------------------------------------------------

export interface PackageDefinition {
  id: string;
  practice_id: string;
  code: string;
  name: string;
  description: string | null;
  service_id: string;
  total_sessions: number;
  validity_days: number;
  package_price: number;
  currency: string;
  is_active: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PackageDefinitionWithRelations extends PackageDefinition {
  service?: {
    id: string;
    code?: string;
    service_code?: string;
    name: string;
    category: string;
  };
}

export interface PackageEntitlement {
  id: string;
  practice_id: string;
  package_number: string;
  patient_id: string;
  package_definition_id: string;
  invoice_id: string;
  total_sessions: number;
  validity_days: number;
  status: PackageStatus;
  activated_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PackageConsumption {
  id: string;
  practice_id: string;
  entitlement_id: string;
  clinical_visit_id: string;
  patient_id: string;
  consumed_at: string;
  consumed_by: string;
  notes: string | null;
  created_at: string;
}

export interface PackageEntitlementWithRelations extends PackageEntitlement {
  patient?: {
    id: string;
    patient_identifier: string;
    first_name: string;
    last_name: string;
    date_of_birth?: string | null;
    gender?: string | null;
    sex?: string | null;
  };
  definition?: {
    id: string;
    code: string;
    name: string;
    service_id: string;
    total_sessions: number;
    validity_days: number;
    package_price: number;
    currency: string;
    service?: {
      id: string;
      code?: string;
      service_code?: string;
      name: string;
    };
  };
  invoice?: {
    id: string;
    invoice_number: string;
    status: InvoiceStatus;
    grand_total: number;
    amount_paid: number;
    balance_due: number;
  };
  consumptions?: PackageConsumption[];
  consumed_sessions?: number;
  remaining_sessions?: number;
}

export interface CreatePackageDefinitionPayload {
  code: string;
  name: string;
  description?: string;
  service_id: string;
  total_sessions: number;
  validity_days: number;
  package_price: number;
  currency?: string;
  is_active?: boolean;
}

export interface UpdatePackageDefinitionPayload {
  name?: string;
  description?: string;
  total_sessions?: number;
  validity_days?: number;
  package_price?: number;
  is_active?: boolean;
}

export interface PurchasePackagePayload {
  patient_id: string;
  package_definition_id: string;
  notes?: string;
}

export interface ConsumePackageSessionPayload {
  entitlement_id: string;
  clinical_visit_id: string;
  notes?: string;
}

export interface ExtendPackageValidityPayload {
  entitlement_id: string;
  new_expires_at: string;
  reason: string;
}

export interface CancelPackagePayload {
  entitlement_id: string;
  reason: string;
}

export interface PackageDefinitionFilters {
  serviceId?: string;
  isActive?: boolean | 'all';
  searchQuery?: string;
}

export interface PackageEntitlementFilters {
  status?: PackageStatus | 'all';
  patientId?: string;
  definitionId?: string;
  searchQuery?: string;
}

export interface PatientWalletLedgerEntryWithRelations extends PatientWalletLedgerEntry {
  payment?: {
    id: string;
    payment_number: string;
    payment_method: PaymentMethod;
    status: PaymentStatus;
    amount: number;
    payment_date: string;
  } | null;
  invoice?: {
    id: string;
    invoice_number: string;
    status: InvoiceStatus;
    grand_total: number;
    balance_due: number;
  } | null;
  creator?: {
    id: string;
    display_name: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface PatientWalletWithBalance extends PatientWallet {
  balance: number;
  patient?: {
    id: string;
    patient_identifier: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  ledger_entries?: PatientWalletLedgerEntryWithRelations[];
}

export interface DepositToWalletPayload {
  patient_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string | null;
  idempotency_key?: string | null;
  notes?: string | null;
}

export interface ConvertOverpaymentPayload {
  payment_id: string;
  amount: number;
  idempotency_key?: string | null;
  notes?: string | null;
}

export interface SettleInvoiceFromWalletPayload {
  wallet_id: string;
  invoice_id: string;
  amount: number;
  idempotency_key?: string | null;
  notes?: string | null;
}

export interface AdjustWalletBalancePayload {
  wallet_id: string;
  amount: number;
  reason: string;
  idempotency_key?: string | null;
}

export interface UpdateWalletStatusPayload {
  wallet_id: string;
  status: WalletStatus;
  reason: string;
}

export interface WalletFilters {
  status?: WalletStatus | 'all';
  patientId?: string;
  searchQuery?: string;
}

export interface WalletLedgerFilters {
  walletId?: string;
  patientId?: string;
  entryType?: WalletLedgerEntryType | 'all';
}

// ----------------------------------------------------------------------------
// RECURRING MEMBERSHIPS FOUNDATION V1 MODELS
// ----------------------------------------------------------------------------

export interface MembershipPlanWithService extends MembershipPlan {
  service?: {
    id: string;
    service_code: string;
    name: string;
    category: string;
    standard_duration_minutes?: number;
  } | null;
}

export interface MembershipUsageLedgerEntryWithRelations extends MembershipUsageLedgerEntry {
  visit?: {
    id: string;
    visit_identifier: string;
    status: ClinicalVisitStatus;
    actual_start: string | null;
    actual_end: string | null;
  } | null;
  service?: {
    id: string;
    service_code: string;
    name: string;
  } | null;
  recorder?: {
    id: string;
    display_name: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface MembershipBillingCycleWithRelations extends MembershipBillingCycle {
  invoice?: {
    id: string;
    invoice_number: string;
    status: InvoiceStatus;
    grand_total: number;
    amount_paid: number;
    balance_due: number;
  } | null;
  usage_entries?: MembershipUsageLedgerEntryWithRelations[];
  remaining_quota?: number;
  used_quota?: number;
}

export interface MembershipBillingCycleWithQuota extends MembershipBillingCycleWithRelations {
  remaining_quota: number;
  used_quota: number;
}

export interface PatientMembershipWithRelations extends PatientMembership {
  patient?: {
    id: string;
    patient_identifier: string;
    first_name: string;
    last_name: string;
    date_of_birth?: string | null;
    gender?: string | null;
    sex?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  plan?: MembershipPlanWithService | null;
  cycles?: MembershipBillingCycleWithRelations[];
  active_cycle?: MembershipBillingCycleWithQuota | null;
}

export interface CreateMembershipPlanPayload {
  plan_code: string;
  name: string;
  description?: string;
  included_service_id: string;
  billing_frequency?: MembershipFrequency;
  cycle_price: number;
  currency?: string;
  cycle_session_quota: number;
  status?: 'active' | 'archived';
}

export interface UpdateMembershipPlanPayload {
  name?: string;
  description?: string;
  cycle_price?: number;
  cycle_session_quota?: number;
  status?: 'active' | 'archived';
}

export interface EnrollMembershipPayload {
  patient_id: string;
  plan_id: string;
  start_date?: string;
  auto_renew?: boolean;
  notes?: string;
}

export interface RecordMembershipUsagePayload {
  cycle_id: string;
  clinical_visit_id: string;
  notes?: string;
}

export interface PauseMembershipPayload {
  membership_id: string;
  reason: string;
}

export interface ResumeMembershipPayload {
  membership_id: string;
  reason?: string;
}

export interface CancelMembershipPayload {
  membership_id: string;
  reason: string;
}

export interface MembershipPlanFilters {
  status?: 'active' | 'archived' | 'all';
  billingFrequency?: MembershipFrequency | 'all';
  searchQuery?: string;
}

export interface MembershipFilters {
  status?: PatientMembershipStatus | 'all';
  patientId?: string;
  planId?: string;
  searchQuery?: string;
}

export interface MembershipCycleFilters {
  membershipId?: string;
  status?: MembershipCycleStatus | 'all';
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
  PaymentMethod,
  PaymentStatus,
  ReceiptStatus,
  PackageStatus,
  WalletStatus,
  WalletLedgerEntryType,
  MembershipFrequency,
  PatientMembershipStatus,
  MembershipCycleStatus,
  InventoryLocationType,
  InventoryItemCategory,
  InventoryBaseUnit,
  InventoryMovementType,
  InventoryAdjustmentReason,
};

export type PracticeInventoryCounter = Database['public']['Tables']['practice_inventory_counters']['Row'];
export type InventoryLocation = Database['public']['Tables']['inventory_locations']['Row'];
export type InventoryLocationInsert = Database['public']['Tables']['inventory_locations']['Insert'];
export type InventoryLocationUpdate = Database['public']['Tables']['inventory_locations']['Update'];

export type InventorySupplier = Database['public']['Tables']['inventory_suppliers']['Row'];
export type InventorySupplierInsert = Database['public']['Tables']['inventory_suppliers']['Insert'];
export type InventorySupplierUpdate = Database['public']['Tables']['inventory_suppliers']['Update'];

export type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
export type InventoryItemInsert = Database['public']['Tables']['inventory_items']['Insert'];
export type InventoryItemUpdate = Database['public']['Tables']['inventory_items']['Update'];

export type InventoryItemBatch = Database['public']['Tables']['inventory_item_batches']['Row'];
export type InventoryItemBatchInsert = Database['public']['Tables']['inventory_item_batches']['Insert'];
export type InventoryItemBatchUpdate = Database['public']['Tables']['inventory_item_batches']['Update'];

export type InventoryStockMovement = Database['public']['Tables']['inventory_stock_movements']['Row'];
export type InventoryStockMovementInsert = Database['public']['Tables']['inventory_stock_movements']['Insert'];

export interface InventoryItemWithRelations extends InventoryItem {
  linked_service?: {
    id: string;
    service_code: string;
    name: string;
    category: ServiceCategory;
  } | null;
  batches?: InventoryItemBatch[];
  total_stock?: number;
  stock_by_location?: {
    location_id: string;
    location_name: string;
    quantity: number;
  }[];
}

export interface InventoryStockMovementWithRelations extends InventoryStockMovement {
  item?: {
    id: string;
    sku: string;
    name: string;
    category: InventoryItemCategory;
    base_unit: InventoryBaseUnit;
  } | null;
  location?: {
    id: string;
    name: string;
    code: string;
    location_type: InventoryLocationType;
  } | null;
  batch?: {
    id: string;
    batch_number: string;
    expiry_date: string;
  } | null;
  actor?: {
    id: string;
    display_name: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface InventoryLocationWithStock extends InventoryLocation {
  item_count?: number;
  total_units?: number;
}

export interface CreateInventoryItemPayload {
  name: string;
  category: InventoryItemCategory;
  base_unit: InventoryBaseUnit;
  reorder_level?: number;
  minimum_stock?: number;
  maximum_stock?: number | null;
  is_sterile?: boolean;
  requires_batch?: boolean;
  linked_service_id?: string | null;
  custom_sku?: string | null;
  description?: string | null;
}

export interface UpdateInventoryItemPayload {
  name?: string;
  category?: InventoryItemCategory;
  base_unit?: InventoryBaseUnit;
  reorder_level?: number;
  minimum_stock?: number;
  maximum_stock?: number | null;
  is_sterile?: boolean;
  requires_batch?: boolean;
  linked_service_id?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export interface CreateInventoryLocationPayload {
  name: string;
  code: string;
  location_type: InventoryLocationType;
  description?: string | null;
  is_default?: boolean;
  is_active?: boolean;
}

export interface CreateInventorySupplierPayload {
  supplier_name: string;
  supplier_code?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  lead_time_days?: number;
  notes?: string | null;
  is_active?: boolean;
}

export interface ReceiveStockPayload {
  item_id: string;
  location_id: string;
  quantity: number;
  unit_cost?: number | null;
  supplier_id?: string | null;
  supplier_invoice_ref?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  idempotency_key?: string | null;
  notes?: string | null;
}

export interface IssueStockPayload {
  item_id: string;
  location_id: string;
  batch_id?: string | null;
  quantity: number;
  issue_type?: 'wastage' | 'expired';
  reason?: InventoryAdjustmentReason;
  idempotency_key?: string | null;
  notes?: string | null;
}

export interface ClinicalConsumptionPayload {
  visit_id: string;
  patient_id: string;
  item_id: string;
  location_id: string;
  batch_id?: string | null;
  quantity: number;
  idempotency_key?: string | null;
  notes?: string | null;
}

export interface RetailSaleStockPayload {
  invoice_line_id: string;
  item_id: string;
  location_id: string;
  batch_id?: string | null;
  quantity: number;
  idempotency_key?: string | null;
  notes?: string | null;
}

export interface TransferStockPayload {
  item_id: string;
  source_location_id: string;
  dest_location_id: string;
  batch_id?: string | null;
  quantity: number;
  idempotency_key?: string | null;
  notes?: string | null;
}

export interface AdjustStockPayload {
  item_id: string;
  location_id: string;
  batch_id?: string | null;
  actual_physical_count: number;
  reason?: InventoryAdjustmentReason;
  idempotency_key?: string | null;
  notes?: string | null;
}

export interface InventoryItemFilters {
  category?: InventoryItemCategory | 'all';
  isActive?: boolean | 'all';
  searchQuery?: string;
  lowStockOnly?: boolean;
}

export interface StockMovementFilters {
  itemId?: string;
  locationId?: string;
  movementType?: InventoryMovementType | 'all';
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

// ==========================================
// DICOM & Medical Imaging Foundation Models
// ==========================================

export type PracticeImagingCounters = Database['public']['Tables']['practice_imaging_counters']['Row'];
export type PracticeImagingCountersInsert = Database['public']['Tables']['practice_imaging_counters']['Insert'];
export type PracticeImagingCountersUpdate = Database['public']['Tables']['practice_imaging_counters']['Update'];

export type ImagingOrder = Database['public']['Tables']['imaging_orders']['Row'];
export type ImagingOrderInsert = Database['public']['Tables']['imaging_orders']['Insert'];
export type ImagingOrderUpdate = Database['public']['Tables']['imaging_orders']['Update'];

export type ImagingStudy = Database['public']['Tables']['imaging_studies']['Row'];
export type ImagingStudyInsert = Database['public']['Tables']['imaging_studies']['Insert'];
export type ImagingStudyUpdate = Database['public']['Tables']['imaging_studies']['Update'];

export type ImagingReport = Database['public']['Tables']['imaging_reports']['Row'];
export type ImagingReportInsert = Database['public']['Tables']['imaging_reports']['Insert'];
export type ImagingReportUpdate = Database['public']['Tables']['imaging_reports']['Update'];

export type ImagingAttachment = Database['public']['Tables']['imaging_attachments']['Row'];
export type ImagingAttachmentInsert = Database['public']['Tables']['imaging_attachments']['Insert'];
export type ImagingAttachmentUpdate = Database['public']['Tables']['imaging_attachments']['Update'];

export interface ImagingOrderWithRelations extends ImagingOrder {
  patient?: {
    id: string;
    patient_identifier: string;
    first_name: string;
    last_name: string;
    date_of_birth?: string | null;
    gender?: string | null;
    sex?: string | null;
    phone?: string | null;
  };
  episode?: {
    id: string;
    episode_number?: string;
    episode_identifier?: string;
    title?: string;
  } | null;
  visit?: {
    id: string;
    visit_number?: string;
    visit_identifier?: string;
    start_time?: string;
    actual_start?: string;
  } | null;
  ordering_clinician?: {
    id: string;
    full_name?: string;
    display_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
  studies?: ImagingStudy[];
}

export interface ImagingStudyWithRelations extends ImagingStudy {
  patient?: {
    id: string;
    patient_identifier: string;
    first_name: string;
    last_name: string;
    date_of_birth?: string | null;
    gender?: string | null;
    sex?: string | null;
  };
  order?: ImagingOrder | null;
  episode?: {
    id: string;
    episode_number?: string;
    episode_identifier?: string;
    title?: string;
  } | null;
  visit?: {
    id: string;
    visit_number?: string;
    visit_identifier?: string;
    start_time?: string;
    actual_start?: string;
  } | null;
  reviewed_by_clinician?: {
    id: string;
    full_name?: string;
    display_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
  reports?: ImagingReportWithRelations[];
  attachments?: ImagingAttachment[];
}

export interface ImagingReportWithRelations extends ImagingReport {
  study?: ImagingStudy;
  amended_from?: ImagingReport | null;
  attachments?: ImagingAttachment[];
}

export interface ImagingAttachmentWithRelations extends ImagingAttachment {
  study?: ImagingStudy;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface CreateImagingOrderPayload {
  patient_id: string;
  modality: ImagingModality;
  anatomical_region: ImagingAnatomicalRegion;
  clinical_indication: string;
  ordering_clinician_id?: string;
  laterality?: ImagingLaterality;
  episode_id?: string | null;
  clinical_visit_id?: string | null;
  provisional_diagnosis?: string | null;
  urgency?: ImagingUrgency;
  red_flag_concerns?: string[];
  contraindications_screened?: boolean;
  contraindication_notes?: string | null;
  referred_facility_name?: string | null;
}

export interface IngestImagingStudyPayload {
  patient_id: string;
  study_date: string;
  modality: ImagingModality;
  anatomical_region: ImagingAnatomicalRegion;
  order_id?: string | null;
  episode_id?: string | null;
  clinical_visit_id?: string | null;
  referring_clinician_id?: string | null;
  study_instance_uid?: string | null;
  accession_number?: string | null;
  study_time?: string | null;
  laterality?: ImagingLaterality;
  performing_facility?: string | null;
  body_part_examined?: string | null;
  series_count?: number;
  instance_count?: number;
  external_viewer_url?: string | null;
}

export interface AttachImagingReportPayload {
  study_id: string;
  author_name: string;
  findings: string;
  impression: string;
  report_type?: ImagingReportType;
  source?: ImagingReportSource;
  author_credentials?: string | null;
  authoring_organization?: string | null;
  recommendations?: string | null;
  critical_findings_identified?: boolean;
  critical_findings_communicated?: boolean;
  communication_details?: string | null;
}

export interface AmendImagingReportPayload {
  original_report_id: string;
  author_name: string;
  findings: string;
  impression: string;
  amendment_reason: string;
  source?: ImagingReportSource;
  author_credentials?: string | null;
  authoring_organization?: string | null;
  recommendations?: string | null;
  critical_findings_identified?: boolean;
  critical_findings_communicated?: boolean;
  communication_details?: string | null;
}

export interface RegisterImagingAttachmentPayload {
  study_id: string;
  attachment_type: ImagingAttachmentType;
  storage_path: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: ImagingMimeType;
  sha256_hash: string;
  report_id?: string | null;
  caption?: string | null;
  key_slice_reference?: string | null;
  is_patient_visible?: boolean;
}

export interface FinalizeImagingStudyReviewPayload {
  study_id: string;
  clinical_functional_interpretation: string;
  correlation_with_physical_findings?: string | null;
  treatment_plan_impact?: string | null;
  red_flag_alert?: boolean;
  red_flag_details?: string | null;
}

export interface AmendImagingStudyReviewPayload {
  study_id: string;
  amendment_notes: string;
  amendment_reason: string;
}

export interface ImagingOrderFilters {
  patientId?: string;
  modality?: ImagingModality | 'all';
  status?: ImagingOrderStatus | 'all';
  urgency?: ImagingUrgency | 'all';
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

export interface ImagingStudyFilters {
  patientId?: string;
  modality?: ImagingModality | 'all';
  reviewStatus?: ImagingReviewStatus | 'all';
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}







