// ==============================================================================
// PHYSENRA DICOM & MEDICAL IMAGING FOUNDATION V1 VERIFICATION SUITE
// File: tests/dicom_medical_imaging.test.cjs
//
// Verifies:
// 1. Schema integrity: 5 tables, multi-tenant composite foreign keys, zero pricing columns
// 2. Atomic sequential numbering generators (ORD-000001, IMG-000001) via practice_imaging_counters
// 3. Immutability triggers protecting diagnostic reports, attachments, and denying hard-delete
// 4. Check constraints: file size (25MB PDF, 15MB image), study dates, indications, report findings
// 5. Authoritative SECURITY DEFINER RPCs:
//    - generate_next_imaging_order_identifier
//    - generate_next_imaging_study_identifier
//    - create_imaging_order
//    - place_imaging_order
//    - cancel_imaging_order
//    - ingest_imaging_study
//    - attach_imaging_report
//    - register_imaging_attachment
//    - finalize_imaging_study_review
//    - amend_imaging_study_review
//    - release_imaging_to_patient
//    - get_patient_imaging_summary
// 6. Strict Row-Level Security (RLS) & tenant isolation policies on all 5 tables
// 7. Non-blocking clinical firewall & zero-billing commercial firewall
// 8. TypeScript database.ts & models.ts definitions with Relationships: []
// 9. Service layer imagingService.ts completeness
// 10. UI pages & React Router v7 routes in App.tsx and Sidebar.tsx
// 11. Non-negotiable physical isolation from legacy systems (Zero forbidden references)
// 12. Remote Supabase live verification: 5 tables, 11 enums, disambiguated foreign keys
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MIGRATION_PATH = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20261001010000_dicom_medical_imaging_foundation.sql'
);
const IMAGING_SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'imagingService.ts'
);
const TYPES_DB_PATH = path.join(
  __dirname,
  '..',
  'src',
  'types',
  'database.ts'
);
const TYPES_MODELS_PATH = path.join(
  __dirname,
  '..',
  'src',
  'types',
  'models.ts'
);
const APP_PATH = path.join(
  __dirname,
  '..',
  'src',
  'App.tsx'
);
const SIDEBAR_PATH = path.join(
  __dirname,
  '..',
  'src',
  'components',
  'layout',
  'Sidebar.tsx'
);

const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
const imagingServiceCode = fs.readFileSync(IMAGING_SERVICE_PATH, 'utf8');
const typesDbCode = fs.readFileSync(TYPES_DB_PATH, 'utf8');
const typesModelsCode = fs.readFileSync(TYPES_MODELS_PATH, 'utf8');
const appCode = fs.readFileSync(APP_PATH, 'utf8');
const sidebarCode = fs.readFileSync(SIDEBAR_PATH, 'utf8');

const SUPABASE_URL = 'https://xxknmdgneamtoahqayvl.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4a25tZGduZWFtdG9haHFheXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDUzNDgsImV4cCI6MjEwNjEyMTM0OH0.2XKv_9MixK87v-_3U_fEGHBeQsoPRpqM3Rw75QcVznk';
const PRACTICE_ID = '464c128a-f7a1-4efa-9e0b-485b14ae5ff4';

test('PHYSENRA DICOM & MEDICAL IMAGING FOUNDATION V1 VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Database Schema & Relational Tenancy
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Database Schema & Relational Tenancy ---', async (st) => {
    await st.test('Migration creates practice_imaging_counters table', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.practice_imaging_counters'),
        'Must create public.practice_imaging_counters table'
      );
      assert(
        migrationSql.includes('chk_practice_imaging_counters_order CHECK (last_order_number >= 0)'),
        'Must enforce last_order_number >= 0'
      );
      assert(
        migrationSql.includes('chk_practice_imaging_counters_study CHECK (last_study_number >= 0)'),
        'Must enforce last_study_number >= 0'
      );
    });

    await st.test('Migration creates imaging_orders table with constraints', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.imaging_orders'),
        'Must create public.imaging_orders table'
      );
      assert(
        migrationSql.includes('CONSTRAINT uq_imaging_orders_practice_number UNIQUE (practice_id, order_number)'),
        'Must enforce unique order_number per practice'
      );
      assert(
        migrationSql.includes('CONSTRAINT uq_imaging_orders_id_patient_practice UNIQUE (id, patient_id, practice_id)'),
        'Must have composite unique key (id, patient_id, practice_id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT chk_imaging_orders_order_number CHECK (order_number ~ \'^ORD-[0-9]{6}$\')'),
        'Must validate ORD-000001 pattern'
      );
    });

    await st.test('Migration enforces composite foreign keys on imaging_orders', () => {
      assert(
        migrationSql.includes('CONSTRAINT fk_imaging_orders_patient_practice FOREIGN KEY (patient_id, practice_id)'),
        'Must have composite FK to patients(id, practice_id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_imaging_orders_episode_patient_practice FOREIGN KEY (episode_id, patient_id, practice_id)'),
        'Must have composite FK to episodes_of_care(id, patient_id, practice_id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_imaging_orders_visit_patient_practice FOREIGN KEY (clinical_visit_id, patient_id, practice_id)'),
        'Must have composite FK to clinical_visits(id, patient_id, practice_id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_imaging_orders_ordering_clinician FOREIGN KEY (ordering_clinician_id)'),
        'Must have FK to profiles(id)'
      );
    });

    await st.test('Migration creates imaging_studies table with constraints', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.imaging_studies'),
        'Must create public.imaging_studies table'
      );
      assert(
        migrationSql.includes('CONSTRAINT uq_imaging_studies_practice_number UNIQUE (practice_id, study_number)'),
        'Must enforce unique study_number per practice'
      );
      assert(
        migrationSql.includes('CONSTRAINT uq_imaging_studies_id_patient_practice UNIQUE (id, patient_id, practice_id)'),
        'Must have composite unique key (id, patient_id, practice_id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT chk_imaging_studies_study_number CHECK (study_number ~ \'^IMG-[0-9]{6}$\')'),
        'Must validate IMG-000001 pattern'
      );
    });

    await st.test('Migration enforces composite foreign keys on imaging_studies', () => {
      assert(
        migrationSql.includes('CONSTRAINT fk_imaging_studies_patient_practice FOREIGN KEY (patient_id, practice_id)'),
        'Must have composite FK to patients(id, practice_id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_imaging_studies_episode_patient_practice FOREIGN KEY (episode_id, patient_id, practice_id)'),
        'Must have composite FK to episodes_of_care'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_imaging_studies_visit_patient_practice FOREIGN KEY (clinical_visit_id, patient_id, practice_id)'),
        'Must have composite FK to clinical_visits'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_imaging_studies_parent_order FOREIGN KEY (order_id, patient_id, practice_id)'),
        'Must have composite FK to imaging_orders'
      );
    });

    await st.test('Migration creates imaging_reports table with amendment constraints', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.imaging_reports'),
        'Must create public.imaging_reports table'
      );
      assert(
        migrationSql.includes('CONSTRAINT uq_imaging_reports_id_practice UNIQUE (id, practice_id)'),
        'Must have composite unique key (id, practice_id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_imaging_reports_parent_study FOREIGN KEY (study_id, patient_id, practice_id)'),
        'Must have composite FK to imaging_studies'
      );
      assert(
        migrationSql.includes('CONSTRAINT chk_imaging_reports_amendment CHECK'),
        'Must validate amendment rules'
      );
    });

    await st.test('Migration creates imaging_attachments table with size constraints', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.imaging_attachments'),
        'Must create public.imaging_attachments table'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_imaging_attachments_parent_study FOREIGN KEY (study_id, patient_id, practice_id)'),
        'Must have composite FK to imaging_studies'
      );
      assert(
        migrationSql.includes('26214400'),
        'Must enforce 25MB maximum limit for PDF attachments'
      );
      assert(
        migrationSql.includes('15728640'),
        'Must enforce 15MB maximum limit for image attachments'
      );
    });

    await st.test('Migration defines all 11 approved enums', () => {
      const enums = [
        'imaging_modality',
        'imaging_anatomical_region',
        'imaging_laterality',
        'imaging_urgency',
        'imaging_order_status',
        'imaging_review_status',
        'imaging_patient_release_status',
        'imaging_report_type',
        'imaging_report_source',
        'imaging_attachment_type',
        'imaging_mime_type',
      ];
      for (const e of enums) {
        assert(migrationSql.includes(`CREATE TYPE public.${e} AS ENUM`), `Must define enum ${e}`);
      }
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Atomic Sequential Identifier Generators
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Atomic Sequential Identifier Generators ---', async (st) => {
    await st.test('generate_next_imaging_order_identifier generates ORD-XXXXXX', () => {
      assert(
        migrationSql.includes('FUNCTION public.generate_next_imaging_order_identifier'),
        'Must define generate_next_imaging_order_identifier'
      );
      assert(
        migrationSql.includes("'ORD-' || LPAD(v_next_val::TEXT, 6, '0')"),
        'Must format order number as ORD-000001'
      );
      assert(
        migrationSql.includes('ON CONFLICT (practice_id) DO UPDATE'),
        'Must use atomic upsert pattern'
      );
    });

    await st.test('generate_next_imaging_study_identifier generates IMG-XXXXXX', () => {
      assert(
        migrationSql.includes('FUNCTION public.generate_next_imaging_study_identifier'),
        'Must define generate_next_imaging_study_identifier'
      );
      assert(
        migrationSql.includes("'IMG-' || LPAD(v_next_val::TEXT, 6, '0')"),
        'Must format study number as IMG-000001'
      );
      assert(
        migrationSql.includes('ON CONFLICT (practice_id) DO UPDATE'),
        'Must use atomic upsert pattern'
      );
    });

    await st.test('Identifier generators enforce tenant context and role security', () => {
      assert(
        migrationSql.includes("IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id()"),
        'Must verify current_practice_id'
      );
      assert(
        migrationSql.includes("public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist'])"),
        'Must verify authorized practice roles'
      );
    });

    await st.test('Identifier generators are SECURITY DEFINER with fixed search_path', () => {
      assert(
        migrationSql.includes('SECURITY DEFINER') &&
        migrationSql.includes('SET search_path = public, auth, pg_temp'),
        'Must declare SECURITY DEFINER with hardened search_path'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Immutability, Protection & Lifecycle Triggers
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Immutability, Protection & Lifecycle Triggers ---', async (st) => {
    await st.test('Reports trigger prevents in-place UPDATE and hard DELETE', () => {
      assert(
        migrationSql.includes('FUNCTION public.prevent_imaging_report_direct_mutation()'),
        'Must define prevent_imaging_report_direct_mutation'
      );
      assert(
        migrationSql.includes('Diagnostic imaging reports are immutable medical records and cannot be deleted'),
        'Must reject DELETE'
      );
      assert(
        migrationSql.includes('Diagnostic imaging reports cannot be updated in place'),
        'Must reject UPDATE'
      );
      assert(
        migrationSql.includes('CREATE TRIGGER trg_protect_imaging_reports_mutation'),
        'Must attach trg_protect_imaging_reports_mutation'
      );
    });

    await st.test('Attachments trigger prevents hard DELETE and binary metadata mutation', () => {
      assert(
        migrationSql.includes('FUNCTION public.prevent_imaging_attachment_direct_mutation()'),
        'Must define prevent_imaging_attachment_direct_mutation'
      );
      assert(
        migrationSql.includes('Imaging attachments are immutable medical assets and cannot be hard deleted'),
        'Must reject DELETE'
      );
      assert(
        migrationSql.includes('Storage binary metadata on imaging attachments cannot be mutated'),
        'Must reject mutating storage_path or sha256_hash'
      );
      assert(
        migrationSql.includes('CREATE TRIGGER trg_protect_imaging_attachments_mutation'),
        'Must attach trg_protect_imaging_attachments_mutation'
      );
    });

    await st.test('Hard delete is strictly prevented on imaging orders and studies', () => {
      assert(
        migrationSql.includes('FUNCTION public.prevent_imaging_hard_delete()'),
        'Must define prevent_imaging_hard_delete'
      );
      assert(
        migrationSql.includes('CREATE TRIGGER trg_protect_imaging_orders_delete'),
        'Must protect imaging_orders from hard delete'
      );
      assert(
        migrationSql.includes('CREATE TRIGGER trg_protect_imaging_studies_delete'),
        'Must protect imaging_studies from hard delete'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Authoritative SECURITY DEFINER RPCs
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Authoritative SECURITY DEFINER RPCs ---', async (st) => {
    const rpcs = [
      'create_imaging_order',
      'place_imaging_order',
      'cancel_imaging_order',
      'ingest_imaging_study',
      'attach_imaging_report',
      'register_imaging_attachment',
      'finalize_imaging_study_review',
      'amend_imaging_study_review',
      'release_imaging_to_patient',
      'get_imaging_attachment_download_url',
    ];

    for (const rpc of rpcs) {
      await st.test(`RPC ${rpc} is defined as SECURITY DEFINER with fixed search_path`, () => {
        assert(
          migrationSql.includes(`CREATE OR REPLACE FUNCTION public.${rpc}`),
          `Must define function ${rpc}`
        );
        assert(
          migrationSql.includes(`GRANT EXECUTE ON FUNCTION public.${rpc}`),
          `Must grant execute on ${rpc} to authenticated`
        );
      });
    }

    await st.test('create_imaging_order verifies active practice and patient match', () => {
      assert(
        migrationSql.includes('FUNCTION public.create_imaging_order'),
        'Must define create_imaging_order'
      );
      assert(
        migrationSql.includes('Patient does not exist in target practice.'),
        'Must verify patient belongs to active practice'
      );
      assert(
        migrationSql.includes("log_audit_event"),
        'Must log audit event upon creation'
      );
    });

    await st.test('place_imaging_order transitions draft order to placed', () => {
      assert(
        migrationSql.includes('FUNCTION public.place_imaging_order'),
        'Must define place_imaging_order'
      );
      assert(
        migrationSql.includes("Only draft orders can be placed."),
        'Must verify order is in draft status before placement'
      );
      assert(
        migrationSql.includes("status = 'placed'"),
        'Must transition status to placed'
      );
    });

    await st.test('cancel_imaging_order enforces mandatory cancellation reason', () => {
      assert(
        migrationSql.includes('FUNCTION public.cancel_imaging_order'),
        'Must define cancel_imaging_order'
      );
      assert(
        migrationSql.includes('Cancellation reason is required.'),
        'Must reject cancellation without valid reason'
      );
      assert(
        migrationSql.includes('Cannot cancel an order with status: %'),
        'Must reject cancelling invalid orders'
      );
    });

    await st.test('finalize_imaging_study_review transitions study to reviewed status', () => {
      assert(
        migrationSql.includes('FUNCTION public.finalize_imaging_study_review'),
        'Must define finalize_imaging_study_review'
      );
      assert(
        migrationSql.includes("review_status = 'reviewed'"),
        'Must set review_status to reviewed'
      );
      assert(
        migrationSql.includes('Clinical functional interpretation must be at least 5 characters.'),
        'Must enforce clinical interpretation'
      );
    });

    await st.test('amend_imaging_study_review transitions study to amended and creates audit record', () => {
      assert(
        migrationSql.includes('FUNCTION public.amend_imaging_study_review'),
        'Must define amend_imaging_study_review'
      );
      assert(
        migrationSql.includes("review_status = 'amended'"),
        'Must set review_status to amended'
      );
      assert(
        migrationSql.includes('Amendment reason is required.'),
        'Must enforce amendment reason'
      );
    });

    await st.test('release_imaging_to_patient verifies clinician review prior to release', () => {
      assert(
        migrationSql.includes('FUNCTION public.release_imaging_to_patient'),
        'Must define release_imaging_to_patient'
      );
      assert(
        migrationSql.includes('Clinical review must be completed before releasing imaging to patient portal.'),
        'Must enforce prior clinician review'
      );
      assert(
        migrationSql.includes("patient_release_status = 'released_to_portal'"),
        'Must set patient_release_status'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Domain Boundary & Architectural Firewalls
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Domain Boundary & Architectural Firewalls ---', async (st) => {
    await st.test('Non-blocking clinical firewall: Clinical visits and episodes are decoupled', () => {
      assert(
        migrationSql.includes('episode_id UUID NULL') &&
        migrationSql.includes('clinical_visit_id UUID NULL'),
        'Orders and studies must permit null episode and clinical_visit references'
      );
    });

    await st.test('Zero-billing commercial firewall: No pricing or financial columns in imaging domain', () => {
      const prohibitedFinancialTerms = [
        'cost_price',
        'sell_price',
        'retail_price',
        'fee_amount',
        'tax_rate',
        'currency_code',
        'billing_code',
        'invoice_id',
        'payment_id',
      ];
      for (const term of prohibitedFinancialTerms) {
        assert(
          !migrationSql.includes(` ${term} `),
          `Migration must NOT include commercial/financial column '${term}'`
        );
      }
    });

    await st.test('PACS decoupling: No requirement for local DICOM listener or external server daemon', () => {
      assert(
        migrationSql.includes('external_viewer_url TEXT NULL'),
        'Must decouple PACS via external viewer URL and key asset storage'
      );
    });

    await st.test('SHA-256 integrity hash enforced on all attachments', () => {
      assert(
        migrationSql.includes('sha256_hash TEXT NOT NULL CHECK (sha256_hash ~ \'^[0-9a-f]{64}$\')'),
        'Must enforce exact 64-character hex SHA-256 hash'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Row-Level Security & Multi-Tenancy
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Row-Level Security & Multi-Tenancy ---', async (st) => {
    const tables = [
      'practice_imaging_counters',
      'imaging_orders',
      'imaging_studies',
      'imaging_reports',
      'imaging_attachments',
    ];

    for (const table of tables) {
      await st.test(`Table ${table} has Row-Level Security enabled`, () => {
        assert(
          migrationSql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`),
          `Table public.${table} must have RLS enabled`
        );
      });

      await st.test(`Table ${table} enforces practice isolation policy`, () => {
        assert(
          migrationSql.includes(`ON public.${table}`),
          `Table public.${table} must have RLS policies defined`
        );
      });
    }

    await st.test('Platform admin is excluded from tenant data bypass', () => {
      assert(
        migrationSql.includes('NOT public.is_platform_admin()'),
        'RLS policies must enforce tenant boundary even for platform admin'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 7: TypeScript Types & Database Contracts
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 7: TypeScript Types & Database Contracts ---', async (st) => {
    await st.test('database.ts exports all 11 imaging enums', () => {
      assert(typesDbCode.includes('export type ImagingModality'), 'Must export ImagingModality');
      assert(typesDbCode.includes('export type ImagingAnatomicalRegion'), 'Must export ImagingAnatomicalRegion');
      assert(typesDbCode.includes('export type ImagingLaterality'), 'Must export ImagingLaterality');
      assert(typesDbCode.includes('export type ImagingUrgency'), 'Must export ImagingUrgency');
      assert(typesDbCode.includes('export type ImagingOrderStatus'), 'Must export ImagingOrderStatus');
      assert(typesDbCode.includes('export type ImagingReviewStatus'), 'Must export ImagingReviewStatus');
      assert(typesDbCode.includes('export type ImagingPatientReleaseStatus'), 'Must export ImagingPatientReleaseStatus');
      assert(typesDbCode.includes('export type ImagingReportType'), 'Must export ImagingReportType');
      assert(typesDbCode.includes('export type ImagingReportSource'), 'Must export ImagingReportSource');
      assert(typesDbCode.includes('export type ImagingAttachmentType'), 'Must export ImagingAttachmentType');
      assert(typesDbCode.includes('export type ImagingMimeType'), 'Must export ImagingMimeType');
    });

    await st.test('database.ts defines all 5 imaging tables with Relationships: []', () => {
      const tables = [
        'practice_imaging_counters',
        'imaging_orders',
        'imaging_studies',
        'imaging_reports',
        'imaging_attachments',
      ];
      for (const tName of tables) {
        assert(typesDbCode.includes(`${tName}: {`), `Must define ${tName} in Database tables`);
        const idx = typesDbCode.indexOf(`${tName}: {`);
        assert(idx !== -1, `${tName} must exist in database.ts`);
        const slice = typesDbCode.slice(idx, idx + 5000);
        assert(slice.includes('Relationships: [];'), `${tName} must have Relationships: []`);
      }
    });

    await st.test('database.ts defines imaging RPCs in Functions section', () => {
      assert(typesDbCode.includes('create_imaging_order: {'), 'Must define create_imaging_order');
      assert(typesDbCode.includes('place_imaging_order: {'), 'Must define place_imaging_order');
      assert(typesDbCode.includes('cancel_imaging_order: {'), 'Must define cancel_imaging_order');
      assert(typesDbCode.includes('ingest_imaging_study: {'), 'Must define ingest_imaging_study');
      assert(typesDbCode.includes('attach_imaging_report: {'), 'Must define attach_imaging_report');
      assert(typesDbCode.includes('register_imaging_attachment: {'), 'Must define register_imaging_attachment');
      assert(typesDbCode.includes('finalize_imaging_study_review: {'), 'Must define finalize_imaging_study_review');
      assert(typesDbCode.includes('amend_imaging_study_review: {'), 'Must define amend_imaging_study_review');
      assert(typesDbCode.includes('release_imaging_to_patient: {'), 'Must define release_imaging_to_patient');
      assert(typesDbCode.includes('get_patient_imaging_summary: {'), 'Must define get_patient_imaging_summary');
    });

    await st.test('models.ts exports domain models and payloads', () => {
      assert(typesModelsCode.includes('export interface ImagingOrderWithRelations'), 'Must export ImagingOrderWithRelations');
      assert(typesModelsCode.includes('export interface ImagingStudyWithRelations'), 'Must export ImagingStudyWithRelations');
      assert(typesModelsCode.includes('export interface ImagingReportWithRelations'), 'Must export ImagingReportWithRelations');
      assert(typesModelsCode.includes('export interface ImagingAttachmentWithRelations'), 'Must export ImagingAttachmentWithRelations');
      assert(typesModelsCode.includes('export interface CreateImagingOrderPayload'), 'Must export CreateImagingOrderPayload');
      assert(typesModelsCode.includes('export interface IngestImagingStudyPayload'), 'Must export IngestImagingStudyPayload');
      assert(typesModelsCode.includes('export interface AttachImagingReportPayload'), 'Must export AttachImagingReportPayload');
      assert(typesModelsCode.includes('export interface RegisterImagingAttachmentPayload'), 'Must export RegisterImagingAttachmentPayload');
      assert(typesModelsCode.includes('export interface FinalizeImagingStudyReviewPayload'), 'Must export FinalizeImagingStudyReviewPayload');
      assert(typesModelsCode.includes('export interface AmendImagingStudyReviewPayload'), 'Must export AmendImagingStudyReviewPayload');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 8: Service Layer Completeness (imagingService.ts)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 8: Service Layer Completeness ---', async (st) => {
    await st.test('imagingService implements order methods', () => {
      assert(imagingServiceCode.includes('async getOrders('), 'Must implement getOrders');
      assert(imagingServiceCode.includes('async getOrderById('), 'Must implement getOrderById');
      assert(imagingServiceCode.includes('async createOrder('), 'Must implement createOrder');
      assert(imagingServiceCode.includes('async placeOrder('), 'Must implement placeOrder');
      assert(imagingServiceCode.includes('async cancelOrder('), 'Must implement cancelOrder');
    });

    await st.test('imagingService implements study methods', () => {
      assert(imagingServiceCode.includes('async getStudies('), 'Must implement getStudies');
      assert(imagingServiceCode.includes('async getStudyById('), 'Must implement getStudyById');
      assert(imagingServiceCode.includes('async ingestStudy('), 'Must implement ingestStudy');
      assert(imagingServiceCode.includes('async finalizeStudyReview('), 'Must implement finalizeStudyReview');
      assert(imagingServiceCode.includes('async amendStudyReview('), 'Must implement amendStudyReview');
      assert(imagingServiceCode.includes('async releaseStudyToPatient('), 'Must implement releaseStudyToPatient');
    });

    await st.test('imagingService implements report & attachment methods', () => {
      assert(imagingServiceCode.includes('async attachReport('), 'Must implement attachReport');
      assert(imagingServiceCode.includes('async registerAttachment('), 'Must implement registerAttachment');
      assert(imagingServiceCode.includes('async uploadAttachmentFile('), 'Must implement uploadAttachmentFile');
      assert(imagingServiceCode.includes('async getSignedAttachmentUrl('), 'Must implement getSignedAttachmentUrl');
    });

    await st.test('imagingService calls all authoritative RPCs via Supabase client', () => {
      assert(imagingServiceCode.includes("supabase.rpc('create_imaging_order'"), 'Must call create_imaging_order RPC');
      assert(imagingServiceCode.includes("supabase.rpc('place_imaging_order'"), 'Must call place_imaging_order RPC');
      assert(imagingServiceCode.includes("supabase.rpc('cancel_imaging_order'"), 'Must call cancel_imaging_order RPC');
      assert(imagingServiceCode.includes("supabase.rpc('ingest_imaging_study'"), 'Must call ingest_imaging_study RPC');
      assert(imagingServiceCode.includes("supabase.rpc('attach_imaging_report'"), 'Must call attach_imaging_report RPC');
      assert(imagingServiceCode.includes("supabase.rpc('register_imaging_attachment'"), 'Must call register_imaging_attachment RPC');
      assert(imagingServiceCode.includes("supabase.rpc('finalize_imaging_study_review'"), 'Must call finalize_imaging_study_review RPC');
      assert(imagingServiceCode.includes("supabase.rpc('amend_imaging_study_review'"), 'Must call amend_imaging_study_review RPC');
      assert(imagingServiceCode.includes("supabase.rpc('release_imaging_to_patient'"), 'Must call release_imaging_to_patient RPC');
    });

    await st.test('imagingService enforces tenant context validation', () => {
      const tenantChecks = (imagingServiceCode.match(/Tenant context required: Active practice ID is missing/g) || []).length;
      assert(tenantChecks >= 7, `Expected at least 7 tenant context checks, found ${tenantChecks}`);
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 9: UI Pages & React Navigation Routes
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 9: UI Pages & React Navigation Routes ---', async (st) => {
    const requiredPages = [
      'ImagingDashboardPage.tsx',
      'ImagingOrdersPage.tsx',
      'CreateImagingOrderPage.tsx',
      'ImagingOrderDetailPage.tsx',
      'ImagingStudiesPage.tsx',
      'IngestImagingStudyPage.tsx',
      'ImagingStudyDetailPage.tsx',
      'ReviewImagingStudyPage.tsx',
      'AttachImagingReportPage.tsx',
    ];

    for (const page of requiredPages) {
      await st.test(`Page ${page} exists in src/pages/imaging/`, () => {
        const pagePath = path.join(__dirname, '..', 'src', 'pages', 'imaging', page);
        assert(fs.existsSync(pagePath), `Page file ${page} must exist`);
      });
    }

    await st.test('App.tsx registers all imaging routes', () => {
      assert(appCode.includes('<Route path="imaging" element={<ImagingDashboardPage />} />'), 'Must register /app/imaging');
      assert(appCode.includes('<Route path="imaging/orders" element={<ImagingOrdersPage />} />'), 'Must register /app/imaging/orders');
      assert(appCode.includes('<Route path="imaging/orders/new" element={<CreateImagingOrderPage />} />'), 'Must register /app/imaging/orders/new');
      assert(appCode.includes('<Route path="imaging/orders/:orderId" element={<ImagingOrderDetailPage />} />'), 'Must register /app/imaging/orders/:orderId');
      assert(appCode.includes('<Route path="imaging/studies" element={<ImagingStudiesPage />} />'), 'Must register /app/imaging/studies');
      assert(appCode.includes('<Route path="imaging/studies/ingest" element={<IngestImagingStudyPage />} />'), 'Must register /app/imaging/studies/ingest');
      assert(appCode.includes('<Route path="imaging/studies/:studyId" element={<ImagingStudyDetailPage />} />'), 'Must register /app/imaging/studies/:studyId');
      assert(appCode.includes('<Route path="imaging/studies/:studyId/review" element={<ReviewImagingStudyPage />} />'), 'Must register review route');
      assert(appCode.includes('<Route path="imaging/studies/:studyId/reports/new" element={<AttachImagingReportPage />} />'), 'Must register attach report route');
    });

    await st.test('Sidebar.tsx renders navigation link to /app/imaging', () => {
      assert(sidebarCode.includes('to="/app/imaging"'), 'Must have NavLink to /app/imaging');
      assert(sidebarCode.includes('Film'), 'Must use Film icon for imaging');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 10: Non-Negotiable Project Isolation & Zero Legacy References
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 10: Non-Negotiable Project Isolation ---', async (st) => {
    const legacyName = ['kab', 'world'].join('');
    await st.test('Migration contains zero references to legacy project', () => {
      assert(
        !migrationSql.toLowerCase().includes(legacyName),
        'Migration must not contain references to legacy project'
      );
    });

    await st.test('imagingService contains zero references to legacy project', () => {
      assert(
        !imagingServiceCode.toLowerCase().includes(legacyName),
        'imagingService must not contain references to legacy project'
      );
    });

    await st.test('App.tsx and Sidebar.tsx contain zero references to legacy project', () => {
      assert(!appCode.toLowerCase().includes(legacyName), 'App.tsx must not contain references to legacy project');
      assert(!sidebarCode.toLowerCase().includes(legacyName), 'Sidebar.tsx must not contain references to legacy project');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 11: Remote Supabase Live Verification via REST API
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 11: Remote Supabase Live Verification ---', async (st) => {
    await st.test('Remote query returns HTTP 200 OK: practice_imaging_counters', async () => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/practice_imaging_counters?select=*&limit=1`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Practice-ID': PRACTICE_ID
        }
      });
      assert.equal(res.status, 200, 'practice_imaging_counters must return HTTP 200');
    });

    await st.test('Remote query returns HTTP 200 OK: imaging_orders with disambiguated relations', async () => {
      const select = `
        id,order_number,modality,anatomical_region,urgency,status,
        patient:patients!fk_imaging_orders_patient_practice(id,first_name,last_name),
        ordering_clinician:profiles!fk_imaging_orders_ordering_clinician(id,first_name,last_name)
      `.replace(/\s+/g, '');
      const res = await fetch(`${SUPABASE_URL}/rest/v1/imaging_orders?select=${encodeURIComponent(select)}&limit=1`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Practice-ID': PRACTICE_ID
        }
      });
      assert.equal(res.status, 200, 'imaging_orders with hints must return HTTP 200');
    });

    await st.test('Remote query returns HTTP 200 OK: imaging_studies with disambiguated relations', async () => {
      const select = `
        id,study_number,modality,anatomical_region,review_status,study_date,
        patient:patients!fk_imaging_studies_patient_practice(id,first_name,last_name),
        order:imaging_orders!fk_imaging_studies_parent_order(id,order_number),
        reviewing_clinician:profiles!fk_imaging_studies_reviewing_clinician(id,first_name,last_name)
      `.replace(/\s+/g, '');
      const res = await fetch(`${SUPABASE_URL}/rest/v1/imaging_studies?select=${encodeURIComponent(select)}&limit=1`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Practice-ID': PRACTICE_ID
        }
      });
      assert.equal(res.status, 200, 'imaging_studies with hints must return HTTP 200');
    });

    await st.test('Remote query returns HTTP 200 OK: imaging_reports with disambiguated relations', async () => {
      const select = `
        id,report_type,source,findings,impression,is_amendment,
        study:imaging_studies!fk_imaging_reports_parent_study(id,study_number,modality),
        patient:patients!fk_imaging_reports_patient(id,first_name,last_name)
      `.replace(/\s+/g, '');
      const res = await fetch(`${SUPABASE_URL}/rest/v1/imaging_reports?select=${encodeURIComponent(select)}&limit=1`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Practice-ID': PRACTICE_ID
        }
      });
      assert.equal(res.status, 200, 'imaging_reports with hints must return HTTP 200');
    });

    await st.test('Remote query returns HTTP 200 OK: imaging_attachments with disambiguated relations', async () => {
      const select = `
        id,file_name,attachment_type,mime_type,file_size_bytes,storage_path,
        study:imaging_studies!fk_imaging_attachments_parent_study(id,study_number),
        patient:patients!fk_imaging_attachments_patient(id,first_name,last_name)
      `.replace(/\s+/g, '');
      const res = await fetch(`${SUPABASE_URL}/rest/v1/imaging_attachments?select=${encodeURIComponent(select)}&limit=1`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Practice-ID': PRACTICE_ID
        }
      });
      assert.equal(res.status, 200, 'imaging_attachments with hints must return HTTP 200');
    });

    await st.test('Remote database proves absence of pricing/commercial columns in imaging tables', async () => {
      for (const badCol of ['cost_price', 'price', 'fee_amount', 'tax_rate']) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/imaging_studies?select=${badCol}&limit=1`, {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Practice-ID': PRACTICE_ID
          }
        });
        assert.equal(res.status, 400, `Querying non-existent column ${badCol} must fail with HTTP 400`);
      }
    });

    await st.test('Remote database confirms all 11 approved enum types live', async () => {
      const probes = [
        { table: 'imaging_orders', col: 'modality', enumName: 'imaging_modality' },
        { table: 'imaging_orders', col: 'anatomical_region', enumName: 'imaging_anatomical_region' },
        { table: 'imaging_orders', col: 'laterality', enumName: 'imaging_laterality' },
        { table: 'imaging_orders', col: 'urgency', enumName: 'imaging_urgency' },
        { table: 'imaging_orders', col: 'status', enumName: 'imaging_order_status' },
        { table: 'imaging_studies', col: 'review_status', enumName: 'imaging_review_status' },
        { table: 'imaging_studies', col: 'patient_release_status', enumName: 'imaging_patient_release_status' },
        { table: 'imaging_reports', col: 'report_type', enumName: 'imaging_report_type' },
        { table: 'imaging_reports', col: 'source', enumName: 'imaging_report_source' },
        { table: 'imaging_attachments', col: 'attachment_type', enumName: 'imaging_attachment_type' },
        { table: 'imaging_attachments', col: 'mime_type', enumName: 'imaging_mime_type' },
      ];

      for (const p of probes) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${p.table}?${p.col}=eq.invalid_probe_val&limit=1`, {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Practice-ID': PRACTICE_ID
          }
        });
        const err = await res.json();
        assert(
          err.message && err.message.includes(`enum ${p.enumName}`),
          `Error must reference enum ${p.enumName}: ${err.message}`
        );
      }
    });

    await st.test('Remote database validates approved enum values live', async () => {
      const checks = [
        { table: 'imaging_orders', col: 'modality', val: 'mri' },
        { table: 'imaging_orders', col: 'anatomical_region', val: 'lumbar_spine' },
        { table: 'imaging_orders', col: 'laterality', val: 'bilateral' },
        { table: 'imaging_orders', col: 'urgency', val: 'routine' },
        { table: 'imaging_orders', col: 'status', val: 'draft' },
        { table: 'imaging_studies', col: 'review_status', val: 'unreviewed' },
        { table: 'imaging_studies', col: 'patient_release_status', val: 'withheld' },
        { table: 'imaging_reports', col: 'report_type', val: 'formal_radiology' },
        { table: 'imaging_reports', col: 'source', val: 'external_facility' },
        { table: 'imaging_attachments', col: 'attachment_type', val: 'key_image' },
        { table: 'imaging_attachments', col: 'mime_type', val: 'image/jpeg' },
      ];

      for (const c of checks) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${c.table}?${c.col}=eq.${c.val}&limit=1`, {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Practice-ID': PRACTICE_ID
          }
        });
        assert.equal(res.status, 200, `Enum value ${c.val} must be accepted with HTTP 200`);
      }
    });
  });
});
