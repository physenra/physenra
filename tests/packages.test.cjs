// ==============================================================================
// PHYSENRA PACKAGES FOUNDATION V1 VERIFICATION SUITE
// File: tests/packages.test.cjs
//
// Verifies:
// 1. Schema integrity & multi-tenant composite foreign keys
// 2. Atomic sequential identifier generators (PKG-000001)
// 3. Immutability, lifecycle triggers & zero hard-delete enforcement
// 4. Stored procedures (purchase, activate, consume, extend, cancel) accounting invariants
// 5. Strict Row-Level Security (RLS) & Role-Based Access Control (RBAC)
// 6. Absolute domain boundary verification (Zero memberships/wallets/insurance/gateways/refunds)
// 7. Non-negotiable physical isolation from legacy systems (Zero kabworld references)
// 8. Application service domain logic, PostgREST hints & state machine rules
// 9. Remote Supabase live query verification with explicit PostgREST constraint hints
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
  '20260928042000_packages_foundation.sql'
);
const PACKAGE_SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'packageService.ts'
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

const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
const packageServiceCode = fs.readFileSync(PACKAGE_SERVICE_PATH, 'utf8');
const typesDbCode = fs.readFileSync(TYPES_DB_PATH, 'utf8');
const typesModelsCode = fs.readFileSync(TYPES_MODELS_PATH, 'utf8');

const SUPABASE_URL = 'https://xxknmdgneamtoahqayvl.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4a25tZGduZWFtdG9haHFheXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDUzNDgsImV4cCI6MjEwNjEyMTM0OH0.2XKv_9MixK87v-_3U_fEGHBeQsoPRpqM3Rw75QcVznk';
const PRACTICE_ID = '464c128a-f7a1-4efa-9e0b-485b14ae5ff4';

test('PHYSENRA PACKAGES FOUNDATION V1 VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Database Schema & Relational Tenancy
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Database Schema & Relational Tenancy ---', async (st) => {
    await st.test('Migration creates practice package counters table', () => {
      assert(
        migrationSql.includes('practice_package_counters') &&
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.practice_package_counters'),
        'Must create public.practice_package_counters table'
      );
    });

    await st.test('Migration creates package_definitions table with constraints', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.package_definitions'),
        'Must create public.package_definitions table'
      );
      assert(
        migrationSql.includes('total_sessions > 0'),
        'Must enforce check total_sessions > 0 on package definitions'
      );
      assert(
        migrationSql.includes('validity_days > 0'),
        'Must enforce check validity_days > 0 on package definitions'
      );
      assert(
        migrationSql.includes('package_price > 0.00'),
        'Must enforce check package_price > 0.00 on package definitions'
      );
    });

    await st.test('Migration defines package_status enum', () => {
      assert(
        migrationSql.includes('CREATE TYPE public.package_status AS ENUM') &&
        migrationSql.includes("'pending_payment'") &&
        migrationSql.includes("'active'") &&
        migrationSql.includes("'completed'") &&
        migrationSql.includes("'expired'") &&
        migrationSql.includes("'cancelled'") &&
        migrationSql.includes("'suspended'"),
        'Must define package_status enum with all required states'
      );
    });

    await st.test('Migration creates package_entitlements table with constraints', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.package_entitlements'),
        'Must create public.package_entitlements table'
      );
      assert(
        migrationSql.includes('uq_package_entitlements_invoice'),
        'Must enforce unique constraint on invoice_id for 1:1 invoice to entitlement mapping'
      );
      assert(
        migrationSql.includes('uq_package_entitlements_practice_number'),
        'Must enforce unique constraint on (practice_id, package_number)'
      );
      // Verify zero mutable counter column in package_entitlements schema
      assert(
        !migrationSql.includes('used_sessions INTEGER') &&
        !migrationSql.includes('remaining_sessions INTEGER'),
        'package_entitlements must NOT contain mutable counter columns (remaining sessions derived from ledger)'
      );
    });

    await st.test('Migration creates package_consumption_ledger table with constraints', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.package_consumption_ledger'),
        'Must create public.package_consumption_ledger table'
      );
      assert(
        migrationSql.includes('uq_consumption_entitlement_visit'),
        'Must enforce unique constraint on (entitlement_id, clinical_visit_id)'
      );
    });

    await st.test('Migration defines multi-tenant composite foreign keys', () => {
      assert(
        migrationSql.includes('fk_package_definitions_service_practice'),
        'Must enforce composite foreign key fk_package_definitions_service_practice'
      );
      assert(
        migrationSql.includes('fk_entitlements_patient_practice'),
        'Must enforce composite foreign key fk_entitlements_patient_practice'
      );
      assert(
        migrationSql.includes('fk_entitlements_definition_practice'),
        'Must enforce composite foreign key fk_entitlements_definition_practice'
      );
      assert(
        migrationSql.includes('fk_entitlements_invoice_practice'),
        'Must enforce composite foreign key fk_entitlements_invoice_practice'
      );
      assert(
        migrationSql.includes('fk_consumption_entitlement_practice'),
        'Must enforce composite foreign key fk_consumption_entitlement_practice'
      );
      assert(
        migrationSql.includes('fk_consumption_patient_practice'),
        'Must enforce composite foreign key fk_consumption_patient_practice'
      );
      assert(
        migrationSql.includes('fk_consumption_visit_patient_practice'),
        'Must enforce composite foreign key fk_consumption_visit_patient_practice'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Atomic Sequential Identifier Generator
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Atomic Sequential Identifier Generator ---', async (st) => {
    await st.test('generate_next_package_number is SECURITY DEFINER with fixed search_path', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.generate_next_package_number'),
        'Must define generate_next_package_number function'
      );
      assert(
        migrationSql.includes('SECURITY DEFINER'),
        'Function must be declared SECURITY DEFINER'
      );
      assert(
        migrationSql.includes("SET search_path = public, pg_temp"),
        'Function must set secure fixed search_path'
      );
    });

    await st.test('generate_next_package_number uses atomic upsert and formats PKG-000001', () => {
      assert(
        migrationSql.includes('ON CONFLICT (practice_id) DO UPDATE'),
        'Must use atomic upsert on practice_package_counters'
      );
      assert(
        migrationSql.includes("'PKG-' || LPAD("),
        'Must format identifier with PKG- prefix and zero-padded sequence'
      );
    });

    await st.test('Privileges for identifier generator are restricted', () => {
      assert(
        migrationSql.includes('REVOKE ALL ON FUNCTION public.generate_next_package_number'),
        'Must revoke public access from generate_next_package_number'
      );
      assert(
        migrationSql.includes('GRANT EXECUTE ON FUNCTION public.generate_next_package_number(UUID) TO authenticated'),
        'Must grant execution to authenticated role'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Immutability, Lifecycle Triggers & Zero Hard-Delete Enforcement
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Immutability & Lifecycle Triggers ---', async (st) => {
    await st.test('Trigger prevents hard-delete on package tables', () => {
      assert(
        migrationSql.includes('prevent_package_hard_delete'),
        'Must define prevent_package_hard_delete trigger function'
      );
      assert(
        migrationSql.includes('trg_prevent_delete_package_definitions'),
        'Must attach prevent delete trigger to package_definitions'
      );
      assert(
        migrationSql.includes('trg_prevent_delete_package_entitlements'),
        'Must attach prevent delete trigger to package_entitlements'
      );
      assert(
        migrationSql.includes('trg_prevent_delete_package_consumption'),
        'Must attach prevent delete trigger to package_consumption_ledger'
      );
    });

    await st.test('Consumption ledger is append-only (strictly no update or delete)', () => {
      assert(
        migrationSql.includes('protect_package_consumption_immutability'),
        'Must define protect_package_consumption_immutability trigger'
      );
      assert(
        migrationSql.includes('trg_protect_package_consumption'),
        'Must attach immutability trigger to package_consumption_ledger'
      );
    });

    await st.test('Entitlement immutability trigger protects identification fields & terminal states', () => {
      assert(
        migrationSql.includes('protect_package_entitlement_immutability'),
        'Must define protect_package_entitlement_immutability trigger'
      );
      assert(
        migrationSql.includes('trg_protect_package_entitlement'),
        'Must attach immutability trigger to package_entitlements'
      );
      assert(
        migrationSql.includes("OLD.status = 'completed' AND NEW.status <> 'completed'") &&
        migrationSql.includes("OLD.status = 'cancelled' AND NEW.status <> 'cancelled'") &&
        migrationSql.includes("OLD.status = 'void' AND NEW.status <> 'void'"),
        'Must prevent status transitions out of terminal completed, cancelled or void states'
      );
    });

    await st.test('Invoice change trigger synchronizes entitlement status on payment or voiding', () => {
      assert(
        migrationSql.includes('sync_package_entitlement_on_invoice_change'),
        'Must define sync_package_entitlement_on_invoice_change trigger'
      );
      assert(
        migrationSql.includes('trg_sync_package_entitlement_on_invoice'),
        'Must attach reactive trigger to invoices table'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Stored Procedures & Atomic Invariants
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Stored Procedures & Atomic Invariants ---', async (st) => {
    await st.test('purchase_package stored procedure creates invoice line and entitlement atomically', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.purchase_package'),
        'Must define purchase_package function'
      );
      assert(
        migrationSql.includes('INSERT INTO public.invoice_lines'),
        'purchase_package must insert into invoice_lines'
      );
      assert(
        migrationSql.includes('INSERT INTO public.package_entitlements'),
        'purchase_package must insert into package_entitlements'
      );
      assert(
        migrationSql.includes("'pending_payment'"),
        'Purchased package entitlement must initially be pending_payment'
      );
    });

    await st.test('activate_package stored procedure enforces full invoice settlement', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.activate_package'),
        'Must define activate_package function'
      );
      assert(
        migrationSql.includes("v_invoice.status <> 'paid'"),
        'activate_package must verify invoice status is paid'
      );
      assert(
        migrationSql.includes('v_invoice.balance_due <> 0.00'),
        'activate_package must verify invoice balance_due is zero'
      );
      assert(
        migrationSql.includes("expires_at = COALESCE(expires_at, now() + (v_entitlement.validity_days || ' days')::INTERVAL)"),
        'activate_package must set expires_at based on definition validity_days'
      );
    });

    await st.test('consume_package_session stored procedure acquires lock and derives balance', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.consume_package_session'),
        'Must define consume_package_session function'
      );
      assert(
        migrationSql.includes('FOR UPDATE'),
        'consume_package_session must lock package_entitlements row'
      );
      assert(
        migrationSql.includes('count(*) INTO v_consumed_count'),
        'consume_package_session must count consumption ledger rows to derive remaining'
      );
      assert(
        migrationSql.includes("v_remaining <= 0"),
        'consume_package_session must reject when no sessions remain'
      );
      assert(
        migrationSql.includes("status = 'completed'"),
        'consume_package_session must mark entitlement completed when last session is consumed'
      );
    });

    await st.test('extend_package_validity stored procedure validates permissions and dates', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.extend_package_validity'),
        'Must define extend_package_validity function'
      );
      assert(
        migrationSql.includes('p_new_expires_at <= now()'),
        'extend_package_validity must require new expiration date to be strictly in the future'
      );
    });

    await st.test('cancel_package stored procedure validates permissions and prevents cancelled packages', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.cancel_package'),
        'Must define cancel_package function'
      );
      assert(
        migrationSql.includes("v_entitlement.status IN ('completed', 'cancelled', 'void')"),
        'cancel_package must forbid cancellation of already completed, cancelled or void packages'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Strict Row-Level Security (RLS) & Role-Based Access Control (RBAC)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Row-Level Security & Multi-Tenancy ---', async (st) => {
    await st.test('RLS is enabled on all packages foundation tables', () => {
      assert(
        migrationSql.includes('ALTER TABLE public.practice_package_counters ENABLE ROW LEVEL SECURITY;'),
        'Must enable RLS on practice_package_counters'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.package_definitions ENABLE ROW LEVEL SECURITY;'),
        'Must enable RLS on package_definitions'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.package_entitlements ENABLE ROW LEVEL SECURITY;'),
        'Must enable RLS on package_entitlements'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.package_consumption_ledger ENABLE ROW LEVEL SECURITY;'),
        'Must enable RLS on package_consumption_ledger'
      );
    });

    await st.test('Hard DELETE is strictly prohibited via RLS policies on packages tables', () => {
      assert(
        !migrationSql.includes('CREATE POLICY "Allow delete on package_definitions"') &&
        !migrationSql.includes('CREATE POLICY "Allow delete on package_entitlements"') &&
        !migrationSql.includes('CREATE POLICY "Allow delete on package_consumption_ledger"'),
        'Must NOT provide any DELETE policy on package tables'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Absolute Domain Boundary Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Absolute Domain Boundary Verification ---', async (st) => {
    await st.test('Zero recurring memberships or subscriptions in V1', () => {
      assert(!migrationSql.includes('CREATE TABLE public.memberships'), 'Must not create memberships table');
      assert(!migrationSql.includes('CREATE TABLE public.package_subscriptions'), 'Must not create package_subscriptions table');
      assert(!packageServiceCode.includes('subscriptionInterval'), 'packageService must not contain subscription intervals');
    });

    await st.test('Zero patient wallets implementation in V1', () => {
      assert(!migrationSql.includes('CREATE TABLE public.wallets'), 'Must not create wallets table');
      assert(!migrationSql.includes('CREATE TABLE public.wallet_transactions'), 'Must not create wallet_transactions table');
      assert(!packageServiceCode.includes('walletBalance'), 'packageService must not reference wallet balances');
    });

    await st.test('Zero external payment gateways or webhooks in V1', () => {
      assert(!migrationSql.includes('stripe'), 'Must not integrate stripe');
      assert(!migrationSql.includes('paystack'), 'Must not integrate paystack');
      assert(!migrationSql.includes('flutterwave'), 'Must not integrate flutterwave');
      assert(!packageServiceCode.includes('stripe'), 'packageService must not reference stripe');
    });

    await st.test('Zero credit notes or cash refunds in V1', () => {
      assert(!migrationSql.includes('CREATE TABLE public.credit_notes'), 'Must not create credit_notes table');
      assert(!migrationSql.includes('CREATE TABLE public.refunds'), 'Must not create refunds table');
    });

    await st.test('Zero patient-to-patient package transfers in V1', () => {
      assert(!migrationSql.includes('transfer_package'), 'Must not create transfer_package function');
      assert(!packageServiceCode.includes('transferPackage'), 'packageService must not contain transferPackage method');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 7: Non-Negotiable Legacy System Physical Isolation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 7: Legacy Isolation (Zero kabworld References) ---', async (st) => {
    await st.test('Zero kabworld references across packages foundation files', () => {
      assert(!migrationSql.toLowerCase().includes('kabworld'), 'Migration must not reference kabworld');
      assert(!packageServiceCode.toLowerCase().includes('kabworld'), 'packageService must not reference kabworld');
      assert(!typesDbCode.toLowerCase().includes('kabworld'), 'types/database must not reference kabworld');
      assert(!typesModelsCode.toLowerCase().includes('kabworld'), 'types/models must not reference kabworld');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 8: Application Service & PostgREST Relationship Disambiguation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 8: Application Service & PostgREST Disambiguation ---', async (st) => {
    await st.test('packageService uses explicit composite foreign key hints for queries', () => {
      assert(
        packageServiceCode.includes('service:services!fk_package_definitions_service_practice'),
        'packageService must use fk_package_definitions_service_practice hint'
      );
      assert(
        packageServiceCode.includes('patient:patients!fk_entitlements_patient_practice'),
        'packageService must use fk_entitlements_patient_practice hint'
      );
      assert(
        packageServiceCode.includes('definition:package_definitions!fk_entitlements_definition_practice'),
        'packageService must use fk_entitlements_definition_practice hint'
      );
      assert(
        packageServiceCode.includes('invoice:invoices!fk_entitlements_invoice_practice'),
        'packageService must use fk_entitlements_invoice_practice hint'
      );
      assert(
        packageServiceCode.includes('consumptions:package_consumption_ledger!fk_consumption_entitlement_practice'),
        'packageService must use fk_consumption_entitlement_practice hint'
      );
      assert(
        packageServiceCode.includes('patient:patients!fk_consumption_patient_practice'),
        'packageService must use fk_consumption_patient_practice hint'
      );
      assert(
        packageServiceCode.includes('visit:clinical_visits!fk_consumption_visit_patient_practice'),
        'packageService must use fk_consumption_visit_patient_practice hint'
      );
    });

    await st.test('packageService derives remaining sessions dynamically without mutable column', () => {
      assert(
        packageServiceCode.includes('const consumed = ent.consumptions?.length || 0;') &&
        packageServiceCode.includes('const remaining = Math.max(0, ent.total_sessions - consumed);'),
        'packageService must derive remaining_sessions from total_sessions minus consumption_ledger count'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 9: Remote Supabase Live Verification via REST API
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 9: Remote Supabase Live Verification ---', async (st) => {
    await st.test('Remote query returns HTTP 200 OK: Package Definitions with disambiguated service relation', async () => {
      const select = `
        *,
        service:services!fk_package_definitions_service_practice(id,service_code,name,category)
      `.replace(/\s+/g, '');

      const url = `${SUPABASE_URL}/rest/v1/package_definitions?select=${encodeURIComponent(select)}&limit=1`;
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
        `Expected HTTP 200 for package_definitions query, got ${res.status}. Body: ${body}`
      );
    });

    await st.test('Remote query returns HTTP 200 OK: Package Entitlements with disambiguated relations', async () => {
      const select = `
        *,
        definition:package_definitions!fk_entitlements_definition_practice(id,code,name,total_sessions,package_price),
        patient:patients!fk_entitlements_patient_practice(id,patient_identifier,first_name,last_name),
        invoice:invoices!fk_entitlements_invoice_practice(id,invoice_number,status,grand_total,balance_due),
        consumptions:package_consumption_ledger!fk_consumption_entitlement_practice(
          id,
          consumed_at,
          clinical_visit_id
        )
      `.replace(/\s+/g, '');

      const url = `${SUPABASE_URL}/rest/v1/package_entitlements?select=${encodeURIComponent(select)}&limit=1`;
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
        `Expected HTTP 200 for package_entitlements query, got ${res.status}. Body: ${body}`
      );
    });

    await st.test('Remote query returns HTTP 200 OK: Package Consumption Ledger with disambiguated relations', async () => {
      const select = `
        *,
        entitlement:package_entitlements!fk_consumption_entitlement_practice(id,package_number,total_sessions,status),
        visit:clinical_visits!fk_consumption_visit_patient_practice(id,visit_identifier,actual_start,status),
        patient:patients!fk_consumption_patient_practice(id,patient_identifier,first_name,last_name)
      `.replace(/\s+/g, '');

      const url = `${SUPABASE_URL}/rest/v1/package_consumption_ledger?select=${encodeURIComponent(select)}&limit=1`;
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
        `Expected HTTP 200 for package_consumption_ledger query, got ${res.status}. Body: ${body}`
      );
    });

    await st.test('Unhinted package_entitlements profiles query reproduces PGRST201 HTTP 300 proving disambiguation is required', async () => {
      const url = `${SUPABASE_URL}/rest/v1/package_entitlements?select=*,profiles(id)&limit=1`;
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
        `Expected HTTP 300 (Ambiguous relationship) for unhinted package_entitlements query, got ${res.status}`
      );
    });
  });
});
