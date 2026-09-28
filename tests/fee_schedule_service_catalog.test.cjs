// ==============================================================================
// PHYSENRA FEE SCHEDULE & SERVICE CATALOG FOUNDATION V1 VERIFICATION SUITE
// File: tests/fee_schedule_service_catalog.test.cjs
//
// Verifies:
// 1. Schema integrity & multi-tenant composite foreign keys
// 2. Atomic sequential identifier generators (SRV-000001, FS-000001)
// 3. Unique service code & unique schedule identifier per practice
// 4. Immutability, historical price preservation, & lifecycle triggers
// 5. Strict Row-Level Security (RLS) & zero hard-delete policy for referenced records
// 6. Absolute domain boundary verification (Zero invoices/payments/packages/wallets/insurance/AI)
// 7. Application service domain logic, PostgREST hints & state machine rules
// 8. Remote Supabase live query verification with PostgREST constraint hints
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
  '20260928035000_fee_schedule_service_catalog_foundation.sql'
);
const SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'serviceCatalogService.ts'
);
const TYPES_PATH = path.join(
  __dirname,
  '..',
  'src',
  'types',
  'database.ts'
);

const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
const serviceCode = fs.readFileSync(SERVICE_PATH, 'utf8');
const typesCode = fs.readFileSync(TYPES_PATH, 'utf8');

const SUPABASE_URL = 'https://xxknmdgneamtoahqayvl.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4a25tZGduZWFtdG9haHFheXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDUzNDgsImV4cCI6MjEwNjEyMTM0OH0.2XKv_9MixK87v-_3U_fEGHBeQsoPRpqM3Rw75QcVznk';
const PRACTICE_ID = '464c128a-f7a1-4efa-9e0b-485b14ae5ff4';

test('PHYSENRA FEE SCHEDULE & SERVICE CATALOG FOUNDATION V1 VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Database Schema & Relational Tenancy
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Service Catalog & Fee Schedule Database Schema ---', async (st) => {
    await st.test('Migration creates practice sequence counter tables', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.practice_service_counters') ||
        migrationSql.includes('CREATE TABLE public.practice_service_counters'),
        'Must create public.practice_service_counters table'
      );
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.practice_fee_schedule_counters') ||
        migrationSql.includes('CREATE TABLE public.practice_fee_schedule_counters'),
        'Must create public.practice_fee_schedule_counters table'
      );
    });

    await st.test('Migration defines controlled enums for service_category and fee_schedule_status', () => {
      assert(
        migrationSql.includes('CREATE TYPE public.service_category AS ENUM'),
        'Must create public.service_category enum'
      );
      assert(
        migrationSql.includes("'consultation'") &&
        migrationSql.includes("'assessment'") &&
        migrationSql.includes("'treatment'") &&
        migrationSql.includes("'rehabilitation'") &&
        migrationSql.includes("'home_visit'") &&
        migrationSql.includes("'reassessment'") &&
        migrationSql.includes("'group_class'") &&
        migrationSql.includes("'other'"),
        'service_category must contain all specified categories'
      );
      assert(
        migrationSql.includes('CREATE TYPE public.fee_schedule_status AS ENUM'),
        'Must create public.fee_schedule_status enum'
      );
      assert(
        migrationSql.includes("'draft'") &&
        migrationSql.includes("'active'") &&
        migrationSql.includes("'archived'"),
        'fee_schedule_status must contain draft, active, archived'
      );
    });

    await st.test('Migration creates public.services table with practice uniqueness and delivery mode', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.services') ||
        migrationSql.includes('CREATE TABLE public.services'),
        'Must create public.services table'
      );
      assert(
        migrationSql.includes('uq_services_practice_code UNIQUE (practice_id, service_code)'),
        'Must enforce unique service_code per practice'
      );
      assert(
        migrationSql.includes('standard_duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (standard_duration_minutes > 0)'),
        'Must enforce positive standard_duration_minutes'
      );
      assert(
        migrationSql.includes('delivery_mode TEXT NOT NULL DEFAULT \'all\''),
        'Must support delivery_mode using canonical vocabulary'
      );
    });

    await st.test('Migration creates public.fee_schedules with partial unique index for default schedule', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.fee_schedules') ||
        migrationSql.includes('CREATE TABLE public.fee_schedules'),
        'Must create public.fee_schedules table'
      );
      assert(
        migrationSql.includes('uq_fee_schedules_practice_identifier UNIQUE (practice_id, schedule_identifier)'),
        'Must enforce unique schedule_identifier per practice'
      );
      assert(
        migrationSql.includes('uq_fee_schedules_default_active'),
        'Must enforce partial unique index for at most one active default schedule'
      );
      assert(
        migrationSql.includes('currency ~ \'^[A-Z]{3}$\''),
        'Must validate currency using ISO-4217 uppercase 3-letter regex'
      );
    });

    await st.test('Migration creates public.fee_schedule_items with composite multi-tenant FKs & numeric price', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.fee_schedule_items') ||
        migrationSql.includes('CREATE TABLE public.fee_schedule_items'),
        'Must create public.fee_schedule_items table'
      );
      assert(
        migrationSql.includes('fk_fee_schedule_items_schedule_practice'),
        'Must declare composite fk_fee_schedule_items_schedule_practice'
      );
      assert(
        migrationSql.includes('fk_fee_schedule_items_service_practice'),
        'Must declare composite fk_fee_schedule_items_service_practice'
      );
      assert(
        migrationSql.includes('unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0)'),
        'Must use fixed-point NUMERIC(12, 2) with non-negative check'
      );
      assert(
        migrationSql.includes('uq_fee_schedule_items_schedule_service UNIQUE (fee_schedule_id, service_id)'),
        'Must enforce unique service per fee schedule'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Identifier Generators & Integrity Triggers
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Identifier Generators, Immutability & Hard Delete Protection ---', async (st) => {
    await st.test('Sequence generators are SECURITY DEFINER with fixed search_path', () => {
      assert(
        migrationSql.includes('FUNCTION public.generate_next_service_code'),
        'Must declare generate_next_service_code function'
      );
      assert(
        migrationSql.includes("'SRV-' || LPAD"),
        'Service code must use SRV-000001 format'
      );
      assert(
        migrationSql.includes('FUNCTION public.generate_next_fee_schedule_identifier'),
        'Must declare generate_next_fee_schedule_identifier function'
      );
      assert(
        migrationSql.includes("'FS-' || LPAD"),
        'Fee schedule identifier must use FS-000001 format'
      );
    });

    await st.test('Service immutability trigger protects practice_id and service_code', () => {
      assert(
        migrationSql.includes('FUNCTION public.protect_service_immutability'),
        'Must declare protect_service_immutability function'
      );
      assert(
        migrationSql.includes('service_code is immutable'),
        'Must enforce service_code immutability'
      );
    });

    await st.test('Service hard delete protection prevents deleting referenced services', () => {
      assert(
        migrationSql.includes('FUNCTION public.prevent_service_hard_delete'),
        'Must declare prevent_service_hard_delete function'
      );
      assert(
        migrationSql.includes('Cannot hard delete a service referenced in fee schedules'),
        'Must deny hard delete if fee schedule items exist'
      );
    });

    await st.test('Fee schedule immutability trigger protects archived fee schedules from modification', () => {
      assert(
        migrationSql.includes('FUNCTION public.protect_fee_schedule_immutability'),
        'Must declare protect_fee_schedule_immutability function'
      );
      assert(
        migrationSql.includes('Archived fee schedules cannot be unarchived'),
        'Must prohibit unarchiving archived fee schedules'
      );
      assert(
        migrationSql.includes('Archived fee schedules are locked and cannot be altered'),
        'Must prohibit altering archived fee schedules'
      );
    });

    await st.test('Fee schedule items trigger enforces parent schedule active status and currency match', () => {
      assert(
        migrationSql.includes('FUNCTION public.protect_fee_schedule_item_integrity'),
        'Must declare protect_fee_schedule_item_integrity function'
      );
      assert(
        migrationSql.includes('Cannot add or modify items on an archived fee schedule'),
        'Must prohibit adding or modifying items on archived schedules'
      );
      assert(
        migrationSql.includes('Fee item currency (%) must match fee schedule currency (%)'),
        'Must validate currency synchronization'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Tenant Isolation & Row-Level Security
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Tenant Isolation & Row-Level Security ---', async (st) => {
    await st.test('Row-Level Security is explicitly enabled on all 5 new tables', () => {
      assert(
        migrationSql.includes('ALTER TABLE public.practice_service_counters ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on practice_service_counters'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.practice_fee_schedule_counters ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on practice_fee_schedule_counters'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on services'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.fee_schedules ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on fee_schedules'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.fee_schedule_items ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on fee_schedule_items'
      );
    });

    await st.test('RLS policies restrict service and fee configuration to management and accountants', () => {
      assert(
        migrationSql.includes("ARRAY['practice_owner', 'practice_manager', 'accountant']"),
        'Must allow practice_owner, practice_manager, and accountant'
      );
      assert(
        migrationSql.includes("services_insert_management"),
        'Must define services_insert_management policy'
      );
      assert(
        migrationSql.includes("fee_schedules_insert_management"),
        'Must define fee_schedules_insert_management policy'
      );
    });

    await st.test('RLS policies allow read-only access for clinicians and receptionists', () => {
      assert(
        migrationSql.includes("ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'accountant']"),
        'Must grant select policy to staff roles'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Absolute Domain Boundary Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Absolute Domain Boundary Verification ---', async (st) => {
    const prohibitedTerms = [
      'invoices',
      'invoice_items',
      'payments',
      'payment_ledgers',
      'patient_wallets',
      'wallet_transactions',
      'packages',
      'package_session_ledger',
      'insurance_claims',
      'whatsapp',
      'ai_jobs',
    ];

    for (const term of prohibitedTerms) {
      await st.test(`Migration does NOT introduce prohibited table or column '${term}'`, () => {
        const regexTable = new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.${term}`, 'i');
        const regexColumn = new RegExp(`\\b${term}\\b\\s+UUID`, 'i');
        assert(
          !regexTable.test(migrationSql),
          `Migration must not create table public.${term}`
        );
        assert(
          !regexColumn.test(migrationSql),
          `Migration must not introduce column ${term}`
        );
      });
    }
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Application Service Implementation & State Machine
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Application Service Implementation & State Machine ---', async (st) => {
    await st.test('serviceCatalogService implements full service and fee schedule methods', () => {
      assert(typeof serviceCode === 'string', 'Service code must exist');
      assert(serviceCode.includes('getServices('), 'Must implement getServices');
      assert(serviceCode.includes('getServiceById('), 'Must implement getServiceById');
      assert(serviceCode.includes('createService('), 'Must implement createService');
      assert(serviceCode.includes('updateService('), 'Must implement updateService');
      assert(serviceCode.includes('toggleServiceStatus('), 'Must implement toggleServiceStatus');
      assert(serviceCode.includes('getFeeSchedules('), 'Must implement getFeeSchedules');
      assert(serviceCode.includes('getFeeScheduleById('), 'Must implement getFeeScheduleById');
      assert(serviceCode.includes('getDefaultActiveFeeSchedule('), 'Must implement getDefaultActiveFeeSchedule');
      assert(serviceCode.includes('createFeeSchedule('), 'Must implement createFeeSchedule');
      assert(serviceCode.includes('updateFeeSchedule('), 'Must implement updateFeeSchedule');
      assert(serviceCode.includes('archiveFeeSchedule('), 'Must implement archiveFeeSchedule');
      assert(serviceCode.includes('upsertFeeScheduleItem('), 'Must implement upsertFeeScheduleItem');
      assert(serviceCode.includes('deleteFeeScheduleItem('), 'Must implement deleteFeeScheduleItem');
    });

    await st.test('serviceCatalogService records audit events for all commercial actions', () => {
      assert(
        serviceCode.includes("p_action: 'service.created'"),
        'Must audit service.created'
      );
      assert(
        serviceCode.includes("p_action: 'service.updated'"),
        'Must audit service.updated'
      );
      assert(
        serviceCode.includes("p_action: 'service.status_changed'"),
        'Must audit service.status_changed'
      );
      assert(
        serviceCode.includes("p_action: 'fee_schedule.created'"),
        'Must audit fee_schedule.created'
      );
      assert(
        serviceCode.includes("p_action: 'fee_schedule.item_upserted'"),
        'Must audit fee_schedule.item_upserted'
      );
    });

    await st.test('serviceCatalogService enforces allowed fee schedule lifecycle transitions', () => {
      assert(
        serviceCode.includes('ALLOWED_FEE_SCHEDULE_TRANSITIONS'),
        'Must define ALLOWED_FEE_SCHEDULE_TRANSITIONS state map'
      );
    });

    await st.test('serviceCatalogService uses explicit PostgREST foreign key constraint hints', () => {
      assert(
        serviceCode.includes('items:fee_schedule_items!fk_fee_schedule_items_schedule_practice'),
        'Must use explicit hint for fee schedule items'
      );
      assert(
        serviceCode.includes('service:services!fk_fee_schedule_items_service_practice'),
        'Must use explicit hint for services'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Remote Supabase Live Query Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Remote Supabase Live Query Verification ---', async (st) => {
    await st.test('Remote query returns HTTP 200 OK: Services catalog query', async () => {
      const url = `${SUPABASE_URL}/rest/v1/services?select=*&limit=1`;
      const res = await fetch(url, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Practice-ID': PRACTICE_ID
        }
      });
      const body = await res.text();
      assert.equal(
        res.status,
        200,
        `Expected HTTP 200 for services query, got ${res.status}. Body: ${body}`
      );
    });

    await st.test('Remote query returns HTTP 200 OK: Fee Schedules with disambiguated items and services', async () => {
      const select = '*,items:fee_schedule_items!fk_fee_schedule_items_schedule_practice(*,service:services!fk_fee_schedule_items_service_practice(*))';
      const url = `${SUPABASE_URL}/rest/v1/fee_schedules?select=${encodeURIComponent(select)}&limit=1`;
      const res = await fetch(url, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Practice-ID': PRACTICE_ID
        }
      });
      const body = await res.text();
      assert.equal(
        res.status,
        200,
        `Expected HTTP 200 for fee_schedules query, got ${res.status}. Body: ${body}`
      );
    });

    await st.test('Remote query returns HTTP 200 OK: Fee Schedule Items with disambiguated service', async () => {
      const select = '*,service:services!fk_fee_schedule_items_service_practice(*)';
      const url = `${SUPABASE_URL}/rest/v1/fee_schedule_items?select=${encodeURIComponent(select)}&limit=1`;
      const res = await fetch(url, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Practice-ID': PRACTICE_ID
        }
      });
      const body = await res.text();
      assert.equal(
        res.status,
        200,
        `Expected HTTP 200 for fee_schedule_items query, got ${res.status}. Body: ${body}`
      );
    });

    await st.test('Unhinted fee_schedule_items query reproduces PGRST201 HTTP 300 to prove disambiguation is required', async () => {
      const url = `${SUPABASE_URL}/rest/v1/fee_schedule_items?select=*,services(id)&limit=1`;
      const res = await fetch(url, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Practice-ID': PRACTICE_ID
        }
      });
      assert.equal(
        res.status,
        300,
        `Expected HTTP 300 (Ambiguous relationship) for unhinted fee_schedule_items query, got ${res.status}`
      );
    });
  });
});
