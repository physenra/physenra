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
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'void';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'pos' | 'card' | 'other';
export type PaymentStatus = 'confirmed' | 'voided';
export type ReceiptStatus = 'issued' | 'voided';
export type PackageStatus =
  | 'pending_payment'
  | 'active'
  | 'completed'
  | 'expired'
  | 'cancelled'
  | 'suspended'
  | 'void';

export type WalletStatus = 'active' | 'suspended' | 'closed';
export type WalletLedgerEntryType =
  | 'deposit'
  | 'overpayment_conversion'
  | 'invoice_settlement'
  | 'manual_adjustment'
  | 'void_reversal';

export type MembershipFrequency = 'monthly' | 'quarterly' | 'annually';
export type PatientMembershipStatus =
  | 'pending_payment'
  | 'active'
  | 'paused'
  | 'suspended'
  | 'cancelled'
  | 'completed';
export type MembershipCycleStatus =
  | 'pending_invoice'
  | 'invoiced'
  | 'active'
  | 'past_due'
  | 'completed'
  | 'cancelled';

export type InventoryLocationType =
  | 'central_store'
  | 'treatment_room'
  | 'mobile_kit'
  | 'reception';
export type InventoryItemCategory =
  | 'clinical_consumable'
  | 'rehabilitation_supply'
  | 'disposable_sanitation'
  | 'retail_product';
export type InventoryBaseUnit =
  | 'piece'
  | 'roll'
  | 'bottle'
  | 'pair'
  | 'pack'
  | 'meter'
  | 'tube';
export type InventoryMovementType =
  | 'opening_balance'
  | 'purchase_receipt'
  | 'clinical_consumption'
  | 'retail_sale'
  | 'transfer_out'
  | 'transfer_in'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'wastage'
  | 'expired'
  | 'reversal';
export type InventoryAdjustmentReason =
  | 'stocktake_discrepancy'
  | 'damaged_in_storage'
  | 'expired_on_shelf'
  | 'clerical_error'
  | 'theft_or_loss';

export type ImagingModality =
  | 'xray'
  | 'mri'
  | 'ultrasound'
  | 'ct'
  | 'dexa'
  | 'fluoroscopy'
  | 'other';
export type ImagingAnatomicalRegion =
  | 'cervical_spine'
  | 'thoracic_spine'
  | 'lumbar_spine'
  | 'sacrum_pelvis'
  | 'shoulder'
  | 'elbow'
  | 'wrist_hand'
  | 'hip'
  | 'knee'
  | 'ankle_foot'
  | 'chest_ribs'
  | 'head_neck'
  | 'abdomen'
  | 'multi_region'
  | 'other';
export type ImagingLaterality =
  | 'left'
  | 'right'
  | 'bilateral'
  | 'not_applicable';
export type ImagingUrgency =
  | 'routine'
  | 'urgent'
  | 'red_flag_emergency';
export type ImagingOrderStatus =
  | 'draft'
  | 'placed'
  | 'completed'
  | 'cancelled';
export type ImagingReviewStatus =
  | 'unreviewed'
  | 'under_review'
  | 'reviewed'
  | 'amended';
export type ImagingPatientReleaseStatus =
  | 'withheld'
  | 'released_to_portal'
  | 'restricted';
export type ImagingReportType =
  | 'formal_radiology'
  | 'preliminary_wet_read'
  | 'clinical_functional_note'
  | 'amendment';
export type ImagingReportSource =
  | 'external_facility'
  | 'in_house_radiologist'
  | 'attending_physiotherapist';
export type ImagingAttachmentType =
  | 'key_image'
  | 'radiology_report_pdf'
  | 'requisition_form_pdf'
  | 'patient_scanned_document';
export type ImagingMimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'application/pdf';


export interface Database {
  public: {
    Tables: {
      practice_inventory_counters: {
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
      inventory_locations: {
        Row: {
          id: string;
          practice_id: string;
          name: string;
          code: string;
          location_type: InventoryLocationType;
          description: string | null;
          is_default: boolean;
          is_active: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          name: string;
          code: string;
          location_type?: InventoryLocationType;
          description?: string | null;
          is_default?: boolean;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          name?: string;
          code?: string;
          location_type?: InventoryLocationType;
          description?: string | null;
          is_default?: boolean;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      inventory_suppliers: {
        Row: {
          id: string;
          practice_id: string;
          supplier_name: string;
          supplier_code: string | null;
          contact_person: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          lead_time_days: number;
          is_active: boolean;
          notes: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          supplier_name: string;
          supplier_code?: string | null;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          lead_time_days?: number;
          is_active?: boolean;
          notes?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          supplier_name?: string;
          supplier_code?: string | null;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          lead_time_days?: number;
          is_active?: boolean;
          notes?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      inventory_items: {
        Row: {
          id: string;
          practice_id: string;
          sku: string;
          name: string;
          category: InventoryItemCategory;
          description: string | null;
          base_unit: InventoryBaseUnit;
          reorder_level: number;
          minimum_stock: number;
          maximum_stock: number | null;
          is_sterile: boolean;
          requires_batch: boolean;
          linked_service_id: string | null;
          is_active: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          sku?: string;
          name: string;
          category?: InventoryItemCategory;
          description?: string | null;
          base_unit?: InventoryBaseUnit;
          reorder_level?: number;
          minimum_stock?: number;
          maximum_stock?: number | null;
          is_sterile?: boolean;
          requires_batch?: boolean;
          linked_service_id?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          sku?: string;
          name?: string;
          category?: InventoryItemCategory;
          description?: string | null;
          base_unit?: InventoryBaseUnit;
          reorder_level?: number;
          minimum_stock?: number;
          maximum_stock?: number | null;
          is_sterile?: boolean;
          requires_batch?: boolean;
          linked_service_id?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      inventory_item_batches: {
        Row: {
          id: string;
          practice_id: string;
          item_id: string;
          batch_number: string;
          expiry_date: string;
          manufacture_date: string | null;
          is_active: boolean;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          item_id: string;
          batch_number: string;
          expiry_date: string;
          manufacture_date?: string | null;
          is_active?: boolean;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          item_id?: string;
          batch_number?: string;
          expiry_date?: string;
          manufacture_date?: string | null;
          is_active?: boolean;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      inventory_stock_movements: {
        Row: {
          id: string;
          practice_id: string;
          item_id: string;
          location_id: string;
          batch_id: string | null;
          movement_type: InventoryMovementType;
          quantity_delta: number;
          unit_cost_snapshot: number | null;
          reference_type: string | null;
          reference_id: string | null;
          adjustment_reason: InventoryAdjustmentReason | null;
          reversal_of_movement_id: string | null;
          idempotency_key: string;
          notes: string | null;
          actor_user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          item_id: string;
          location_id: string;
          batch_id?: string | null;
          movement_type: InventoryMovementType;
          quantity_delta: number;
          unit_cost_snapshot?: number | null;
          reference_type?: string | null;
          reference_id?: string | null;
          adjustment_reason?: InventoryAdjustmentReason | null;
          reversal_of_movement_id?: string | null;
          idempotency_key: string;
          notes?: string | null;
          actor_user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          item_id?: string;
          location_id?: string;
          batch_id?: string | null;
          movement_type?: InventoryMovementType;
          quantity_delta?: number;
          unit_cost_snapshot?: number | null;
          reference_type?: string | null;
          reference_id?: string | null;
          adjustment_reason?: InventoryAdjustmentReason | null;
          reversal_of_movement_id?: string | null;
          idempotency_key?: string;
          notes?: string | null;
          actor_user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      practice_imaging_counters: {
        Row: {
          practice_id: string;
          last_order_number: number;
          last_study_number: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          practice_id: string;
          last_order_number?: number;
          last_study_number?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          practice_id?: string;
          last_order_number?: number;
          last_study_number?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      imaging_orders: {
        Row: {
          id: string;
          practice_id: string;
          order_number: string;
          patient_id: string;
          episode_id: string | null;
          clinical_visit_id: string | null;
          ordering_clinician_id: string;
          modality: ImagingModality;
          anatomical_region: ImagingAnatomicalRegion;
          laterality: ImagingLaterality;
          clinical_indication: string;
          provisional_diagnosis: string | null;
          urgency: ImagingUrgency;
          red_flag_concerns: string[];
          contraindications_screened: boolean;
          contraindication_notes: string | null;
          referred_facility_name: string | null;
          status: ImagingOrderStatus;
          order_date: string;
          placed_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          completed_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          order_number: string;
          patient_id: string;
          episode_id?: string | null;
          clinical_visit_id?: string | null;
          ordering_clinician_id: string;
          modality: ImagingModality;
          anatomical_region: ImagingAnatomicalRegion;
          laterality?: ImagingLaterality;
          clinical_indication: string;
          provisional_diagnosis?: string | null;
          urgency?: ImagingUrgency;
          red_flag_concerns?: string[];
          contraindications_screened?: boolean;
          contraindication_notes?: string | null;
          referred_facility_name?: string | null;
          status?: ImagingOrderStatus;
          order_date?: string;
          placed_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          order_number?: string;
          patient_id?: string;
          episode_id?: string | null;
          clinical_visit_id?: string | null;
          ordering_clinician_id?: string;
          modality?: ImagingModality;
          anatomical_region?: ImagingAnatomicalRegion;
          laterality?: ImagingLaterality;
          clinical_indication?: string;
          provisional_diagnosis?: string | null;
          urgency?: ImagingUrgency;
          red_flag_concerns?: string[];
          contraindications_screened?: boolean;
          contraindication_notes?: string | null;
          referred_facility_name?: string | null;
          status?: ImagingOrderStatus;
          order_date?: string;
          placed_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      imaging_studies: {
        Row: {
          id: string;
          practice_id: string;
          study_number: string;
          patient_id: string;
          episode_id: string | null;
          clinical_visit_id: string | null;
          order_id: string | null;
          referring_clinician_id: string | null;
          reviewing_clinician_id: string | null;
          study_instance_uid: string | null;
          accession_number: string | null;
          study_date: string;
          study_time: string | null;
          modality: ImagingModality;
          anatomical_region: ImagingAnatomicalRegion;
          laterality: ImagingLaterality;
          performing_facility: string | null;
          body_part_examined: string | null;
          series_count: number;
          instance_count: number;
          external_viewer_url: string | null;
          review_status: ImagingReviewStatus;
          reviewed_at: string | null;
          clinical_functional_interpretation: string | null;
          correlation_with_physical_findings: string | null;
          treatment_plan_impact: string | null;
          red_flag_alert: boolean;
          red_flag_details: string | null;
          patient_release_status: ImagingPatientReleaseStatus;
          released_at: string | null;
          released_by: string | null;
          is_patient_visible: boolean;
          is_active: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          study_number: string;
          patient_id: string;
          episode_id?: string | null;
          clinical_visit_id?: string | null;
          order_id?: string | null;
          referring_clinician_id?: string | null;
          reviewing_clinician_id?: string | null;
          study_instance_uid?: string | null;
          accession_number?: string | null;
          study_date: string;
          study_time?: string | null;
          modality: ImagingModality;
          anatomical_region: ImagingAnatomicalRegion;
          laterality?: ImagingLaterality;
          performing_facility?: string | null;
          body_part_examined?: string | null;
          series_count?: number;
          instance_count?: number;
          external_viewer_url?: string | null;
          review_status?: ImagingReviewStatus;
          reviewed_at?: string | null;
          clinical_functional_interpretation?: string | null;
          correlation_with_physical_findings?: string | null;
          treatment_plan_impact?: string | null;
          red_flag_alert?: boolean;
          red_flag_details?: string | null;
          patient_release_status?: ImagingPatientReleaseStatus;
          released_at?: string | null;
          released_by?: string | null;
          is_patient_visible?: boolean;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          study_number?: string;
          patient_id?: string;
          episode_id?: string | null;
          clinical_visit_id?: string | null;
          order_id?: string | null;
          referring_clinician_id?: string | null;
          reviewing_clinician_id?: string | null;
          study_instance_uid?: string | null;
          accession_number?: string | null;
          study_date?: string;
          study_time?: string | null;
          modality?: ImagingModality;
          anatomical_region?: ImagingAnatomicalRegion;
          laterality?: ImagingLaterality;
          performing_facility?: string | null;
          body_part_examined?: string | null;
          series_count?: number;
          instance_count?: number;
          external_viewer_url?: string | null;
          review_status?: ImagingReviewStatus;
          reviewed_at?: string | null;
          clinical_functional_interpretation?: string | null;
          correlation_with_physical_findings?: string | null;
          treatment_plan_impact?: string | null;
          red_flag_alert?: boolean;
          red_flag_details?: string | null;
          patient_release_status?: ImagingPatientReleaseStatus;
          released_at?: string | null;
          released_by?: string | null;
          is_patient_visible?: boolean;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      imaging_reports: {
        Row: {
          id: string;
          practice_id: string;
          study_id: string;
          patient_id: string;
          report_type: ImagingReportType;
          source: ImagingReportSource;
          author_name: string;
          author_credentials: string | null;
          authoring_organization: string | null;
          findings: string;
          impression: string;
          recommendations: string | null;
          critical_findings_identified: boolean;
          critical_findings_communicated: boolean;
          communication_details: string | null;
          reported_at: string;
          transcribed_at: string | null;
          is_amendment: boolean;
          original_report_id: string | null;
          amendment_reason: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          study_id: string;
          patient_id: string;
          report_type?: ImagingReportType;
          source?: ImagingReportSource;
          author_name: string;
          author_credentials?: string | null;
          authoring_organization?: string | null;
          findings: string;
          impression: string;
          recommendations?: string | null;
          critical_findings_identified?: boolean;
          critical_findings_communicated?: boolean;
          communication_details?: string | null;
          reported_at?: string;
          transcribed_at?: string | null;
          is_amendment?: boolean;
          original_report_id?: string | null;
          amendment_reason?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          study_id?: string;
          patient_id?: string;
          report_type?: ImagingReportType;
          source?: ImagingReportSource;
          author_name?: string;
          author_credentials?: string | null;
          authoring_organization?: string | null;
          findings?: string;
          impression?: string;
          recommendations?: string | null;
          critical_findings_identified?: boolean;
          critical_findings_communicated?: boolean;
          communication_details?: string | null;
          reported_at?: string;
          transcribed_at?: string | null;
          is_amendment?: boolean;
          original_report_id?: string | null;
          amendment_reason?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      imaging_attachments: {
        Row: {
          id: string;
          practice_id: string;
          study_id: string;
          patient_id: string;
          report_id: string | null;
          attachment_type: ImagingAttachmentType;
          storage_path: string;
          file_name: string;
          file_size_bytes: number;
          mime_type: ImagingMimeType;
          sha256_hash: string;
          caption: string | null;
          key_slice_reference: string | null;
          is_patient_visible: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          study_id: string;
          patient_id: string;
          report_id?: string | null;
          attachment_type: ImagingAttachmentType;
          storage_path: string;
          file_name: string;
          file_size_bytes: number;
          mime_type: ImagingMimeType;
          sha256_hash: string;
          caption?: string | null;
          key_slice_reference?: string | null;
          is_patient_visible?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          study_id?: string;
          patient_id?: string;
          report_id?: string | null;
          attachment_type?: ImagingAttachmentType;
          storage_path?: string;
          file_name?: string;
          file_size_bytes?: number;
          mime_type?: ImagingMimeType;
          sha256_hash?: string;
          caption?: string | null;
          key_slice_reference?: string | null;
          is_patient_visible?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
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
      practice_invoice_counters: {
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
      invoices: {
        Row: {
          id: string;
          practice_id: string;
          invoice_number: string;
          patient_id: string;
          episode_id: string | null;
          clinical_visit_id: string | null;
          fee_schedule_id: string | null;
          issue_date: string;
          invoice_date: string;
          due_date: string | null;
          status: InvoiceStatus;
          currency: string;
          subtotal: number;
          discount_total: number;
          tax_total: number;
          grand_total: number;
          total_amount: number;
          amount_paid: number;
          balance_due: number;
          notes: string | null;
          terms: string | null;
          issued_at: string | null;
          finalized_by: string | null;
          voided_at: string | null;
          voided_by: string | null;
          void_reason: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          invoice_number: string;
          patient_id: string;
          episode_id?: string | null;
          clinical_visit_id?: string | null;
          fee_schedule_id?: string | null;
          issue_date?: string;
          due_date?: string | null;
          status?: InvoiceStatus;
          currency?: string;
          subtotal?: number;
          discount_total?: number;
          tax_total?: number;
          grand_total?: number;
          amount_paid?: number;
          balance_due?: number;
          notes?: string | null;
          terms?: string | null;
          issued_at?: string | null;
          finalized_by?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          invoice_number?: string;
          patient_id?: string;
          episode_id?: string | null;
          clinical_visit_id?: string | null;
          fee_schedule_id?: string | null;
          issue_date?: string;
          due_date?: string | null;
          status?: InvoiceStatus;
          currency?: string;
          subtotal?: number;
          discount_total?: number;
          tax_total?: number;
          grand_total?: number;
          amount_paid?: number;
          balance_due?: number;
          notes?: string | null;
          terms?: string | null;
          issued_at?: string | null;
          finalized_by?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invoice_lines: {
        Row: {
          id: string;
          practice_id: string;
          invoice_id: string;
          service_id: string;
          service_code_snapshot: string;
          service_name_snapshot: string;
          description: string | null;
          quantity: number;
          unit_price_snapshot: number;
          currency: string;
          is_taxable: boolean;
          tax_rate_percent_snapshot: number;
          tax_amount: number;
          discount_amount: number;
          line_total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          invoice_id: string;
          service_id: string;
          service_code_snapshot: string;
          service_name_snapshot: string;
          description?: string | null;
          quantity?: number;
          unit_price_snapshot: number;
          currency: string;
          is_taxable?: boolean;
          tax_rate_percent_snapshot?: number;
          tax_amount?: number;
          discount_amount?: number;
          line_total?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          invoice_id?: string;
          service_id?: string;
          service_code_snapshot?: string;
          service_name_snapshot?: string;
          description?: string | null;
          quantity?: number;
          unit_price_snapshot?: number;
          currency?: string;
          is_taxable?: boolean;
          tax_rate_percent_snapshot?: number;
          tax_amount?: number;
          discount_amount?: number;
          line_total?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      practice_payment_counters: {
        Row: {
          practice_id: string;
          last_number: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          practice_id: string;
          last_number?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          practice_id?: string;
          last_number?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          practice_id: string;
          payment_number: string;
          patient_id: string;
          payment_date: string;
          amount: number;
          currency: string;
          payment_method: PaymentMethod;
          reference_number: string | null;
          idempotency_key: string;
          status: PaymentStatus;
          notes: string | null;
          recorded_by: string;
          confirmed_at: string;
          voided_at: string | null;
          voided_by: string | null;
          void_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          payment_number: string;
          patient_id: string;
          payment_date?: string;
          amount: number;
          currency?: string;
          payment_method: PaymentMethod;
          reference_number?: string | null;
          idempotency_key: string;
          status?: PaymentStatus;
          notes?: string | null;
          recorded_by: string;
          confirmed_at?: string;
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          payment_number?: string;
          patient_id?: string;
          payment_date?: string;
          amount?: number;
          currency?: string;
          payment_method?: PaymentMethod;
          reference_number?: string | null;
          idempotency_key?: string;
          status?: PaymentStatus;
          notes?: string | null;
          recorded_by?: string;
          confirmed_at?: string;
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      practice_receipt_counters: {
        Row: {
          practice_id: string;
          last_number: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          practice_id: string;
          last_number?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          practice_id?: string;
          last_number?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      receipts: {
        Row: {
          id: string;
          practice_id: string;
          receipt_number: string;
          payment_id: string;
          patient_id: string;
          issue_date: string;
          amount: number;
          currency: string;
          payment_method: PaymentMethod;
          reference_number: string | null;
          status: ReceiptStatus;
          issued_by: string;
          issued_at: string;
          voided_at: string | null;
          voided_by: string | null;
          void_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          receipt_number: string;
          payment_id: string;
          patient_id: string;
          issue_date?: string;
          amount: number;
          currency?: string;
          payment_method: PaymentMethod;
          reference_number?: string | null;
          status?: ReceiptStatus;
          issued_by: string;
          issued_at?: string;
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          receipt_number?: string;
          payment_id?: string;
          patient_id?: string;
          issue_date?: string;
          amount?: number;
          currency?: string;
          payment_method?: PaymentMethod;
          reference_number?: string | null;
          status?: ReceiptStatus;
          issued_by?: string;
          issued_at?: string;
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      payment_allocations: {
        Row: {
          id: string;
          practice_id: string;
          payment_id: string;
          invoice_id: string;
          patient_id: string;
          amount: number;
          allocated_at: string;
          allocated_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          payment_id: string;
          invoice_id: string;
          patient_id: string;
          amount: number;
          allocated_at?: string;
          allocated_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          payment_id?: string;
          invoice_id?: string;
          patient_id?: string;
          amount?: number;
          allocated_at?: string;
          allocated_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      practice_package_counters: {
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
      package_definitions: {
        Row: {
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
        };
        Insert: {
          id?: string;
          practice_id: string;
          code: string;
          name: string;
          description?: string | null;
          service_id: string;
          total_sessions: number;
          validity_days: number;
          package_price: number;
          currency?: string;
          is_active?: boolean;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          service_id?: string;
          total_sessions?: number;
          validity_days?: number;
          package_price?: number;
          currency?: string;
          is_active?: boolean;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      package_entitlements: {
        Row: {
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
        };
        Insert: {
          id?: string;
          practice_id: string;
          package_number: string;
          patient_id: string;
          package_definition_id: string;
          invoice_id: string;
          total_sessions: number;
          validity_days: number;
          status?: PackageStatus;
          activated_at?: string | null;
          expires_at?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          package_number?: string;
          patient_id?: string;
          package_definition_id?: string;
          invoice_id?: string;
          total_sessions?: number;
          validity_days?: number;
          status?: PackageStatus;
          activated_at?: string | null;
          expires_at?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      package_consumption_ledger: {
        Row: {
          id: string;
          practice_id: string;
          entitlement_id: string;
          clinical_visit_id: string;
          patient_id: string;
          consumed_at: string;
          consumed_by: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          entitlement_id: string;
          clinical_visit_id: string;
          patient_id: string;
          consumed_at?: string;
          consumed_by: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          entitlement_id?: string;
          clinical_visit_id?: string;
          patient_id?: string;
          consumed_at?: string;
          consumed_by?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      practice_wallet_counters: {
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
      patient_wallets: {
        Row: {
          id: string;
          practice_id: string;
          patient_id: string;
          wallet_number: string;
          currency: string;
          status: WalletStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          patient_id: string;
          wallet_number: string;
          currency?: string;
          status?: WalletStatus;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          patient_id?: string;
          wallet_number?: string;
          currency?: string;
          status?: WalletStatus;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      patient_wallet_ledger: {
        Row: {
          id: string;
          practice_id: string;
          wallet_id: string;
          patient_id: string;
          entry_type: WalletLedgerEntryType;
          amount: number;
          payment_id: string | null;
          invoice_id: string | null;
          idempotency_key: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          wallet_id: string;
          patient_id: string;
          entry_type: WalletLedgerEntryType;
          amount: number;
          payment_id?: string | null;
          invoice_id?: string | null;
          idempotency_key?: string | null;
          notes?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          wallet_id?: string;
          patient_id?: string;
          entry_type?: WalletLedgerEntryType;
          amount?: number;
          payment_id?: string | null;
          invoice_id?: string | null;
          idempotency_key?: string | null;
          notes?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      practice_membership_counters: {
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
      membership_plans: {
        Row: {
          id: string;
          practice_id: string;
          plan_code: string;
          name: string;
          description: string | null;
          included_service_id: string;
          billing_frequency: MembershipFrequency;
          cycle_price: number;
          currency: string;
          cycle_session_quota: number;
          status: 'active' | 'archived';
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          plan_code: string;
          name: string;
          description?: string | null;
          included_service_id: string;
          billing_frequency?: MembershipFrequency;
          cycle_price: number;
          currency?: string;
          cycle_session_quota: number;
          status?: 'active' | 'archived';
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          plan_code?: string;
          name?: string;
          description?: string | null;
          included_service_id?: string;
          billing_frequency?: MembershipFrequency;
          cycle_price?: number;
          currency?: string;
          cycle_session_quota?: number;
          status?: 'active' | 'archived';
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      patient_memberships: {
        Row: {
          id: string;
          practice_id: string;
          membership_number: string;
          patient_id: string;
          plan_id: string;
          start_date: string;
          billing_anchor_day: number;
          status: PatientMembershipStatus;
          auto_renew: boolean;
          paused_at: string | null;
          resumed_at: string | null;
          pause_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          cancellation_reason: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          membership_number: string;
          patient_id: string;
          plan_id: string;
          start_date: string;
          billing_anchor_day: number;
          status?: PatientMembershipStatus;
          auto_renew?: boolean;
          paused_at?: string | null;
          resumed_at?: string | null;
          pause_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          membership_number?: string;
          patient_id?: string;
          plan_id?: string;
          start_date?: string;
          billing_anchor_day?: number;
          status?: PatientMembershipStatus;
          auto_renew?: boolean;
          paused_at?: string | null;
          resumed_at?: string | null;
          pause_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      membership_billing_cycles: {
        Row: {
          id: string;
          practice_id: string;
          membership_id: string;
          cycle_number: number;
          cycle_start_date: string;
          cycle_end_date: string;
          billing_date: string;
          invoice_id: string | null;
          cycle_price: number;
          currency: string;
          session_quota: number;
          status: MembershipCycleStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          membership_id: string;
          cycle_number: number;
          cycle_start_date: string;
          cycle_end_date: string;
          billing_date: string;
          invoice_id?: string | null;
          cycle_price: number;
          currency?: string;
          session_quota: number;
          status?: MembershipCycleStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          membership_id?: string;
          cycle_number?: number;
          cycle_start_date?: string;
          cycle_end_date?: string;
          billing_date?: string;
          invoice_id?: string | null;
          cycle_price?: number;
          currency?: string;
          session_quota?: number;
          status?: MembershipCycleStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      membership_usage_ledger: {
        Row: {
          id: string;
          practice_id: string;
          cycle_id: string;
          membership_id: string;
          patient_id: string;
          clinical_visit_id: string;
          service_id: string;
          sessions_consumed: number;
          notes: string | null;
          recorded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          cycle_id: string;
          membership_id: string;
          patient_id: string;
          clinical_visit_id: string;
          service_id: string;
          sessions_consumed?: number;
          notes?: string | null;
          recorded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          cycle_id?: string;
          membership_id?: string;
          patient_id?: string;
          clinical_visit_id?: string;
          service_id?: string;
          sessions_consumed?: number;
          notes?: string | null;
          recorded_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_next_inventory_item_sku: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      get_inventory_stock_on_hand: {
        Args: {
          p_practice_id: string;
          p_item_id?: string | null;
          p_location_id?: string | null;
        };
        Returns: {
          item_id: string;
          location_id: string;
          derived_stock: number;
        }[];
      };
      create_inventory_item: {
        Args: {
          p_practice_id: string;
          p_name: string;
          p_category: InventoryItemCategory;
          p_base_unit: InventoryBaseUnit;
          p_reorder_level?: number;
          p_minimum_stock?: number;
          p_maximum_stock?: number | null;
          p_is_sterile?: boolean;
          p_requires_batch?: boolean;
          p_linked_service_id?: string | null;
          p_custom_sku?: string | null;
          p_description?: string | null;
        };
        Returns: Database['public']['Tables']['inventory_items']['Row'];
      };
      record_stock_receipt: {
        Args: {
          p_practice_id: string;
          p_item_id: string;
          p_location_id: string;
          p_quantity: number;
          p_unit_cost?: number | null;
          p_supplier_id?: string | null;
          p_supplier_invoice_ref?: string | null;
          p_batch_number?: string | null;
          p_expiry_date?: string | null;
          p_idempotency_key?: string | null;
          p_notes?: string | null;
        };
        Returns: Database['public']['Tables']['inventory_stock_movements']['Row'];
      };
      record_stock_issue: {
        Args: {
          p_practice_id: string;
          p_item_id: string;
          p_location_id: string;
          p_batch_id?: string | null;
          p_quantity?: number;
          p_issue_type?: InventoryMovementType;
          p_reason?: InventoryAdjustmentReason;
          p_idempotency_key?: string | null;
          p_notes?: string | null;
        };
        Returns: Database['public']['Tables']['inventory_stock_movements']['Row'];
      };
      record_clinical_consumption: {
        Args: {
          p_practice_id: string;
          p_visit_id: string;
          p_patient_id: string;
          p_item_id: string;
          p_location_id: string;
          p_batch_id?: string | null;
          p_quantity?: number;
          p_idempotency_key?: string | null;
          p_notes?: string | null;
        };
        Returns: Database['public']['Tables']['inventory_stock_movements']['Row'];
      };
      record_retail_sale: {
        Args: {
          p_practice_id: string;
          p_invoice_line_id: string;
          p_item_id: string;
          p_location_id: string;
          p_batch_id?: string | null;
          p_quantity?: number;
          p_idempotency_key?: string | null;
          p_notes?: string | null;
        };
        Returns: Database['public']['Tables']['inventory_stock_movements']['Row'];
      };
      transfer_stock_between_locations: {
        Args: {
          p_practice_id: string;
          p_item_id: string;
          p_source_location_id: string;
          p_dest_location_id: string;
          p_batch_id?: string | null;
          p_quantity?: number;
          p_idempotency_key?: string | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      adjust_stock_balance: {
        Args: {
          p_practice_id: string;
          p_item_id: string;
          p_location_id: string;
          p_batch_id?: string | null;
          p_actual_physical_count?: number;
          p_reason?: InventoryAdjustmentReason;
          p_idempotency_key?: string | null;
          p_notes?: string | null;
        };
        Returns: Database['public']['Tables']['inventory_stock_movements']['Row'] | null;
      };
      reverse_stock_movement: {
        Args: {
          p_practice_id: string;
          p_movement_id_to_reverse: string;
          p_reason: string;
          p_idempotency_key?: string | null;
        };
        Returns: Database['public']['Tables']['inventory_stock_movements']['Row'];
      };
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
      generate_next_invoice_number: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      generate_next_payment_number: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      generate_next_receipt_number: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      record_payment_and_allocate: {
        Args: {
          p_practice_id: string;
          p_patient_id: string;
          p_payment_date: string;
          p_amount: number;
          p_currency: string;
          p_payment_method: PaymentMethod;
          p_reference_number: string | null;
          p_idempotency_key: string;
          p_notes: string | null;
          p_allocations: Json;
        };
        Returns: Json;
      };
      void_payment: {
        Args: {
          p_practice_id: string;
          p_payment_id: string;
          p_void_reason: string;
        };
        Returns: Json;
      };
      generate_next_package_number: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      purchase_package: {
        Args: {
          p_practice_id: string;
          p_patient_id: string;
          p_package_definition_id: string;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      activate_package: {
        Args: {
          p_practice_id: string;
          p_entitlement_id: string;
        };
        Returns: Json;
      };
      consume_package_session: {
        Args: {
          p_practice_id: string;
          p_entitlement_id: string;
          p_clinical_visit_id: string;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      extend_package_validity: {
        Args: {
          p_practice_id: string;
          p_entitlement_id: string;
          p_new_expires_at: string;
          p_reason: string;
        };
        Returns: Json;
      };
      cancel_package: {
        Args: {
          p_practice_id: string;
          p_entitlement_id: string;
          p_reason: string;
        };
        Returns: Json;
      };
      generate_next_wallet_number: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      get_or_create_patient_wallet: {
        Args: {
          p_practice_id: string;
          p_patient_id: string;
          p_currency?: string;
        };
        Returns: Json;
      };
      deposit_to_wallet: {
        Args: {
          p_practice_id: string;
          p_patient_id: string;
          p_amount: number;
          p_payment_method: PaymentMethod;
          p_reference_number?: string | null;
          p_idempotency_key?: string | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      convert_overpayment_to_wallet: {
        Args: {
          p_practice_id: string;
          p_payment_id: string;
          p_amount: number;
          p_idempotency_key?: string | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      settle_invoice_from_wallet: {
        Args: {
          p_practice_id: string;
          p_wallet_id: string;
          p_invoice_id: string;
          p_amount: number;
          p_idempotency_key?: string | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      adjust_wallet_balance: {
        Args: {
          p_practice_id: string;
          p_wallet_id: string;
          p_amount: number;
          p_reason: string;
          p_idempotency_key?: string | null;
        };
        Returns: Json;
      };
      update_wallet_status: {
        Args: {
          p_practice_id: string;
          p_wallet_id: string;
          p_status: WalletStatus;
          p_reason: string;
        };
        Returns: Json;
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
      generate_next_membership_number: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      enroll_patient_in_membership: {
        Args: {
          p_practice_id: string;
          p_patient_id: string;
          p_plan_id: string;
          p_start_date?: string;
          p_auto_renew?: boolean;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      generate_membership_cycle_invoice: {
        Args: {
          p_practice_id: string;
          p_membership_id: string;
          p_cycle_number: number;
        };
        Returns: Json;
      };
      generate_membership_renewal_cycles: {
        Args: {
          p_practice_id: string;
        };
        Returns: Json;
      };
      record_membership_visit_usage: {
        Args: {
          p_practice_id: string;
          p_cycle_id: string;
          p_clinical_visit_id: string;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      pause_patient_membership: {
        Args: {
          p_practice_id: string;
          p_membership_id: string;
          p_reason: string;
        };
        Returns: Json;
      };
      resume_patient_membership: {
        Args: {
          p_practice_id: string;
          p_membership_id: string;
          p_reason?: string | null;
        };
        Returns: Json;
      };
      cancel_patient_membership: {
        Args: {
          p_practice_id: string;
          p_membership_id: string;
          p_reason: string;
        };
        Returns: Json;
      };
      generate_next_imaging_order_identifier: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      generate_next_imaging_study_identifier: {
        Args: {
          p_practice_id: string;
        };
        Returns: string;
      };
      create_imaging_order: {
        Args: {
          p_practice_id: string;
          p_patient_id: string;
          p_ordering_clinician_id: string;
          p_modality: ImagingModality;
          p_anatomical_region: ImagingAnatomicalRegion;
          p_clinical_indication: string;
          p_laterality?: ImagingLaterality;
          p_episode_id?: string | null;
          p_clinical_visit_id?: string | null;
          p_provisional_diagnosis?: string | null;
          p_urgency?: ImagingUrgency;
          p_red_flag_concerns?: string[];
          p_contraindications_screened?: boolean;
          p_contraindication_notes?: string | null;
          p_referred_facility_name?: string | null;
        };
        Returns: string;
      };
      place_imaging_order: {
        Args: {
          p_order_id: string;
        };
        Returns: undefined;
      };
      cancel_imaging_order: {
        Args: {
          p_order_id: string;
          p_cancellation_reason: string;
        };
        Returns: undefined;
      };
      ingest_imaging_study: {
        Args: {
          p_practice_id: string;
          p_patient_id: string;
          p_study_date: string;
          p_modality: ImagingModality;
          p_anatomical_region: ImagingAnatomicalRegion;
          p_order_id?: string | null;
          p_episode_id?: string | null;
          p_clinical_visit_id?: string | null;
          p_referring_clinician_id?: string | null;
          p_study_instance_uid?: string | null;
          p_accession_number?: string | null;
          p_study_time?: string | null;
          p_laterality?: ImagingLaterality;
          p_performing_facility?: string | null;
          p_body_part_examined?: string | null;
          p_series_count?: number;
          p_instance_count?: number;
          p_external_viewer_url?: string | null;
        };
        Returns: string;
      };
      attach_imaging_report: {
        Args: {
          p_study_id: string;
          p_author_name: string;
          p_findings: string;
          p_impression: string;
          p_report_type?: ImagingReportType;
          p_source?: ImagingReportSource;
          p_author_credentials?: string | null;
          p_authoring_organization?: string | null;
          p_recommendations?: string | null;
          p_critical_findings_identified?: boolean;
          p_critical_findings_communicated?: boolean;
          p_communication_details?: string | null;
        };
        Returns: string;
      };
      register_imaging_attachment: {
        Args: {
          p_study_id: string;
          p_attachment_type: ImagingAttachmentType;
          p_storage_path: string;
          p_file_name: string;
          p_file_size_bytes: number;
          p_mime_type: ImagingMimeType;
          p_sha256_hash: string;
          p_report_id?: string | null;
          p_caption?: string | null;
          p_key_slice_reference?: string | null;
          p_is_patient_visible?: boolean;
        };
        Returns: string;
      };
      finalize_imaging_study_review: {
        Args: {
          p_study_id: string;
          p_clinical_functional_interpretation: string;
          p_correlation_with_physical_findings?: string | null;
          p_treatment_plan_impact?: string | null;
          p_red_flag_alert?: boolean;
          p_red_flag_details?: string | null;
        };
        Returns: undefined;
      };
      amend_imaging_study_review: {
        Args: {
          p_study_id: string;
          p_amendment_notes: string;
          p_amendment_reason: string;
        };
        Returns: undefined;
      };
      release_imaging_to_patient: {
        Args: {
          p_study_id: string;
          p_release_notes?: string | null;
        };
        Returns: undefined;
      };
      get_imaging_attachment_download_url: {
        Args: {
          p_attachment_id: string;
        };
        Returns: Json;
      };
      get_patient_imaging_summary: {
        Args: {
          p_patient_id: string;
        };
        Returns: Json;
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
      invoice_status: InvoiceStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
      receipt_status: ReceiptStatus;
      package_status: PackageStatus;
      wallet_status: WalletStatus;
      wallet_ledger_entry_type: WalletLedgerEntryType;
      membership_frequency: MembershipFrequency;
      patient_membership_status: PatientMembershipStatus;
      membership_cycle_status: MembershipCycleStatus;
      inventory_location_type: InventoryLocationType;
      inventory_item_category: InventoryItemCategory;
      inventory_base_unit: InventoryBaseUnit;
      inventory_movement_type: InventoryMovementType;
      inventory_adjustment_reason: InventoryAdjustmentReason;
      imaging_modality: ImagingModality;
      imaging_anatomical_region: ImagingAnatomicalRegion;
      imaging_laterality: ImagingLaterality;
      imaging_urgency: ImagingUrgency;
      imaging_order_status: ImagingOrderStatus;
      imaging_review_status: ImagingReviewStatus;
      imaging_patient_release_status: ImagingPatientReleaseStatus;
      imaging_report_type: ImagingReportType;
      imaging_report_source: ImagingReportSource;
      imaging_attachment_type: ImagingAttachmentType;
      imaging_mime_type: ImagingMimeType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
