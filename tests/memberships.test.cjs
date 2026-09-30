// ==============================================================================
// PHYSENRA RECURRING MEMBERSHIPS FOUNDATION V1 VERIFICATION SUITE
// File: tests/memberships.test.cjs
//
// Verifies:
// 1. Schema integrity, multi-tenant composite foreign keys & zero mutable balance column
// 2. Atomic sequential identifier generator (MBR-000001)
// 3. Immutability, lifecycle triggers & zero hard-delete enforcement
// 4. Option E stored procedures & authoritative invoiced billing demand
// 5. Invoice settlement & reversal synchronization triggers
// 6. Quota mathematical derivation & pessimistic concurrency safety
// 7. Strict Row-Level Security (RLS) & multi-tenancy policies
// 8. Absolute domain boundary verification (Zero gateways/webhooks/crons/proration/rollovers)
// 9. Non-negotiable physical isolation from legacy systems (Zero forbidden references)
// 10. Remote Supabase live query verification with explicit PostgREST constraint hints
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
  '20260929012000_recurring_memberships_foundation.sql'
);
const HARDEN_MIGRATION_PATH = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260929013000_harden_membership_financial_invariants.sql'
);
const MEMBERSHIP_SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'membershipService.ts'
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
const hardenMigrationSql = fs.readFileSync(HARDEN_MIGRATION_PATH, 'utf8');
const membershipServiceCode = fs.readFileSync(MEMBERSHIP_SERVICE_PATH, 'utf8');
const typesDbCode = fs.readFileSync(TYPES_DB_PATH, 'utf8');
const typesModelsCode = fs.readFileSync(TYPES_MODELS_PATH, 'utf8');

const SUPABASE_URL = 'https://xxknmdgneamtoahqayvl.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4a25tZGduZWFtdG9haHFheXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDUzNDgsImV4cCI6MjEwNjEyMTM0OH0.2XKv_9MixK87v-_3U_fEGHBeQsoPRpqM3Rw75QcVznk';
const PRACTICE_ID = '464c128a-f7a1-4efa-9e0b-485b14ae5ff4';

test('PHYSENRA RECURRING MEMBERSHIPS FOUNDATION V1 VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Database Schema & Relational Tenancy
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Database Schema & Relational Tenancy ---', async (st) => {
    await st.test('Migration creates practice_membership_counters table', () => {
      assert(
        migrationSql.includes('practice_membership_counters') &&
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.practice_membership_counters'),
        'Must create public.practice_membership_counters table'
      );
    });

    await st.test('Migration creates membership_plans table with check constraints', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.membership_plans'),
        'Must create public.membership_plans table'
      );
      assert(
        migrationSql.includes('cycle_price > 0.00'),
        'Must enforce cycle_price > 0.00 on membership plans'
      );
      assert(
        migrationSql.includes('cycle_session_quota > 0'),
        'Must enforce cycle_session_quota > 0 on membership plans'
      );
    });

    await st.test('Migration creates patient_memberships table with zero mutable balance or quota column', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.patient_memberships'),
        'Must create public.patient_memberships table'
      );
      assert(!migrationSql.includes('balance NUMERIC'), 'Must NOT have mutable monetary balance column');
      assert(!migrationSql.includes('remaining_sessions INTEGER'), 'Must NOT have mutable session balance column');
      assert(!migrationSql.includes('sessions_remaining INTEGER'), 'Must NOT have mutable session counter column');
      assert(
        migrationSql.includes('billing_anchor_day BETWEEN 1 AND 28'),
        'Must enforce billing anchor day between 1 and 28'
      );
    });

    await st.test('Migration creates membership_billing_cycles table with constraints', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.membership_billing_cycles'),
        'Must create public.membership_billing_cycles table'
      );
      assert(
        migrationSql.includes('cycle_end_date >= cycle_start_date'),
        'Must enforce cycle_end_date >= cycle_start_date'
      );
      assert(
        migrationSql.includes('cycle_number > 0'),
        'Must enforce cycle_number > 0'
      );
      assert(
        migrationSql.includes('cycle_price > 0.00'),
        'Must enforce cycle_price > 0.00'
      );
      assert(
        migrationSql.includes('session_quota > 0'),
        'Must enforce session_quota > 0'
      );
    });

    await st.test('Migration creates membership_usage_ledger table with append-only check', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.membership_usage_ledger'),
        'Must create public.membership_usage_ledger table'
      );
      assert(
        migrationSql.includes('sessions_consumed > 0.00'),
        'Must enforce sessions_consumed > 0.00'
      );
      assert(
        migrationSql.includes('uq_usage_cycle_visit'),
        'Must enforce unique constraint on (cycle_id, clinical_visit_id)'
      );
    });

    await st.test('Migration defines membership enums', () => {
      assert(
        migrationSql.includes('CREATE TYPE public.membership_frequency AS ENUM') &&
        migrationSql.includes("'monthly'") &&
        migrationSql.includes("'quarterly'") &&
        migrationSql.includes("'annually'"),
        'Must define membership_frequency enum'
      );
      assert(
        migrationSql.includes('CREATE TYPE public.membership_status AS ENUM') &&
        migrationSql.includes("'pending_payment'") &&
        migrationSql.includes("'active'") &&
        migrationSql.includes("'paused'") &&
        migrationSql.includes("'suspended'") &&
        migrationSql.includes("'cancelled'") &&
        migrationSql.includes("'completed'"),
        'Must define membership_status enum'
      );
      assert(
        migrationSql.includes('CREATE TYPE public.membership_cycle_status AS ENUM') &&
        migrationSql.includes("'pending_invoice'") &&
        migrationSql.includes("'invoiced'") &&
        migrationSql.includes("'active'") &&
        migrationSql.includes("'past_due'") &&
        migrationSql.includes("'completed'") &&
        migrationSql.includes("'cancelled'"),
        'Must define membership_cycle_status enum'
      );
    });

    await st.test('Migration enforces multi-tenant composite foreign keys', () => {
      assert(
        migrationSql.includes('fk_plan_service_practice'),
        'Must enforce composite foreign key fk_plan_service_practice'
      );
      assert(
        migrationSql.includes('fk_membership_patient_practice'),
        'Must enforce composite foreign key fk_membership_patient_practice'
      );
      assert(
        migrationSql.includes('fk_membership_plan_practice'),
        'Must enforce composite foreign key fk_membership_plan_practice'
      );
      assert(
        migrationSql.includes('fk_cycle_membership_practice'),
        'Must enforce composite foreign key fk_cycle_membership_practice'
      );
      assert(
        migrationSql.includes('fk_cycle_invoice_practice'),
        'Must enforce composite foreign key fk_cycle_invoice_practice'
      );
      assert(
        migrationSql.includes('fk_usage_cycle_practice'),
        'Must enforce composite foreign key fk_usage_cycle_practice'
      );
      assert(
        migrationSql.includes('fk_usage_visit_patient_practice'),
        'Must enforce composite foreign key fk_usage_visit_patient_practice'
      );
      assert(
        migrationSql.includes('fk_usage_service_practice'),
        'Must enforce composite foreign key fk_usage_service_practice'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Atomic Sequential Identifier Generator
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Atomic Sequential Identifier Generator ---', async (st) => {
    await st.test('generate_next_membership_number is SECURITY DEFINER with fixed search_path', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.generate_next_membership_number') &&
        migrationSql.includes('SECURITY DEFINER') &&
        migrationSql.includes('SET search_path = public, pg_temp'),
        'Must define generate_next_membership_number with SECURITY DEFINER and fixed search path'
      );
    });

    await st.test('generate_next_membership_number uses atomic upsert and formats MBR-000001', () => {
      assert(
        migrationSql.includes("RETURNING last_number INTO v_next_val") &&
        migrationSql.includes("'MBR-' || LPAD(v_next_val::TEXT, 6, '0')"),
        'Must format sequential identifier as MBR-000001'
      );
    });

    await st.test('Privileges for identifier generator are restricted', () => {
      assert(
        migrationSql.includes('REVOKE ALL ON FUNCTION public.generate_next_membership_number(UUID) FROM PUBLIC') &&
        migrationSql.includes('GRANT EXECUTE ON FUNCTION public.generate_next_membership_number(UUID) TO authenticated'),
        'Must revoke from public and grant only to authenticated'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Immutability & Lifecycle Triggers
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Immutability & Lifecycle Triggers ---', async (st) => {
    await st.test('Trigger prevents hard-delete on membership tables', () => {
      assert(
        migrationSql.includes('prevent_membership_hard_delete') &&
        migrationSql.includes('trg_prevent_delete_membership_plans') &&
        migrationSql.includes('trg_prevent_delete_patient_memberships') &&
        migrationSql.includes('trg_prevent_delete_membership_billing_cycles') &&
        migrationSql.includes('trg_prevent_delete_membership_usage_ledger'),
        'Must register hard-delete prevention triggers across all membership tables'
      );
    });

    await st.test('Usage ledger is strictly append-only (strictly no update or delete)', () => {
      assert(
        migrationSql.includes('protect_membership_usage_immutability') &&
        migrationSql.includes('trg_protect_membership_usage_immutability') &&
        migrationSql.includes('BEFORE UPDATE ON public.membership_usage_ledger'),
        'Must block updates on membership_usage_ledger'
      );
    });

    await st.test('Patient membership immutability trigger protects identification fields & terminal states', () => {
      assert(
        migrationSql.includes('protect_patient_membership_immutability') &&
        migrationSql.includes("OLD.status IN ('cancelled', 'completed')") &&
        migrationSql.includes('Cannot transition membership out of terminal state'),
        'Must prevent reactivation of cancelled or completed memberships'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Option E Stored Procedures & Invoiced Billing Demand
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Option E Stored Procedures & Invoiced Billing Demand ---', async (st) => {
    await st.test('enroll_patient_in_membership creates authoritative invoice in public.invoices', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.enroll_patient_in_membership') &&
        migrationSql.includes('INSERT INTO public.invoices') &&
        migrationSql.includes('INSERT INTO public.invoice_lines') &&
        migrationSql.includes('INSERT INTO public.membership_billing_cycles'),
        'enroll_patient_in_membership must create invoice, invoice line, and cycle 1'
      );
    });

    await st.test('enroll_patient_in_membership calculates anchor day between 1 and 28', () => {
      assert(
        migrationSql.includes('EXTRACT(DAY FROM p_start_date)::INTEGER') &&
        migrationSql.includes('v_anchor_day := 28'),
        'Must cap anchor day at 28 to avoid February month overflow'
      );
    });

    await st.test('generate_membership_cycle_invoice creates invoice for cycle renewal', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.generate_membership_cycle_invoice') &&
        migrationSql.includes('INSERT INTO public.invoices') &&
        migrationSql.includes("status = 'invoiced'"),
        'Must generate authoritative renewal invoice and update cycle status'
      );
    });

    await st.test('generate_membership_renewal_cycles provides deterministic batch cycle renewal', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.generate_membership_renewal_cycles') &&
        migrationSql.includes('m.auto_renew = true') &&
        migrationSql.includes("m.status = 'active'"),
        'Must scan active auto-renew memberships and generate next cycle'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Invoice Payment & Cycle State Synchronization
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Invoice Payment & Cycle State Synchronization ---', async (st) => {
    await st.test('sync_membership_cycle_on_invoice_payment activates cycle upon full payment', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.sync_membership_cycle_on_invoice_payment') &&
        migrationSql.includes("NEW.status = 'paid' AND NEW.balance_due <= 0.00") &&
        migrationSql.includes("SET status = 'active'"),
        'Must transition cycle status to active upon full invoice payment'
      );
    });

    await st.test('Trigger activates parent patient_membership when cycle 1 is paid', () => {
      assert(
        migrationSql.includes("v_membership.status IN ('pending_payment', 'suspended')") &&
        migrationSql.includes("UPDATE public.patient_memberships") &&
        migrationSql.includes("SET status = 'active'"),
        'Must activate patient membership upon cycle invoice settlement'
      );
    });

    await st.test('Trigger reverts cycle to past_due upon payment voiding or debt balance reversal', () => {
      assert(
        migrationSql.includes("OLD.status = 'paid' AND NEW.status IN ('partially_paid', 'issued')") &&
        migrationSql.includes("SET status = 'past_due'"),
        'Must transition cycle to past_due when payment is reversed'
      );
    });

    await st.test('Trigger cancels cycle when linked invoice is voided', () => {
      assert(
        migrationSql.includes("NEW.status = 'void'") &&
        migrationSql.includes("SET status = 'cancelled'"),
        'Must transition cycle to cancelled when invoice is voided'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Quota Mathematical Derivation & Concurrency Hardening
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Quota Mathematical Derivation & Concurrency Hardening ---', async (st) => {
    await st.test('record_membership_visit_usage acquires row lock FOR UPDATE on billing cycle', () => {
      assert(
        migrationSql.includes('SELECT * INTO v_cycle') &&
        migrationSql.includes('FROM public.membership_billing_cycles') &&
        migrationSql.includes('FOR UPDATE'),
        'Must acquire pessimistic row lock FOR UPDATE on membership_billing_cycles'
      );
    });

    await st.test('record_membership_visit_usage derives remaining quota from usage ledger', () => {
      assert(
        migrationSql.includes('SELECT COALESCE(SUM(sessions_consumed), 0.00) INTO v_used_sessions') &&
        migrationSql.includes('v_remaining_sessions := v_cycle.session_quota - v_used_sessions') &&
        migrationSql.includes('v_remaining_sessions < 1.00'),
        'Must derive remaining quota and prevent over-consumption'
      );
    });

    await st.test('record_membership_visit_usage verifies visit belongs to enrolled patient', () => {
      assert(
        migrationSql.includes('v_visit.patient_id <> v_membership.patient_id') &&
        migrationSql.includes('Clinical visit patient does not match membership patient'),
        'Must reject visit deduction for a different patient'
      );
    });

    await st.test('record_membership_visit_usage rejects duplicate deduction for same visit', () => {
      assert(
        migrationSql.includes('Duplicate deduction: Clinical visit % has already been recorded'),
        'Must reject duplicate usage entry for the same clinical visit'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 7: Row-Level Security & Multi-Tenancy
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 7: Row-Level Security & Multi-Tenancy ---', async (st) => {
    await st.test('RLS is enabled on all 5 membership tables', () => {
      assert(migrationSql.includes('ALTER TABLE public.practice_membership_counters ENABLE ROW LEVEL SECURITY;'));
      assert(migrationSql.includes('ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;'));
      assert(migrationSql.includes('ALTER TABLE public.patient_memberships ENABLE ROW LEVEL SECURITY;'));
      assert(migrationSql.includes('ALTER TABLE public.membership_billing_cycles ENABLE ROW LEVEL SECURITY;'));
      assert(migrationSql.includes('ALTER TABLE public.membership_usage_ledger ENABLE ROW LEVEL SECURITY;'));
    });

    await st.test('Hard DELETE is strictly prohibited via RLS and triggers', () => {
      assert(migrationSql.includes('prevent_membership_hard_delete()'), 'Hard delete must trigger exception');
    });

    await st.test('RLS policies isolate tenant practice context', () => {
      assert(
        migrationSql.includes('practice_id = public.current_practice_id()'),
        'Must enforce practice_id = current_practice_id() in all policies'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 8: Absolute Domain Boundary Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 8: Absolute Domain Boundary Verification ---', async (st) => {
    await st.test('Zero external payment gateways (Stripe/Paystack/Flutterwave) in V1', () => {
      const lower = migrationSql.toLowerCase();
      assert(!lower.includes('stripe'), 'Must not reference Stripe');
      assert(!lower.includes('paystack'), 'Must not reference Paystack');
      assert(!lower.includes('flutterwave'), 'Must not reference Flutterwave');
    });

    await st.test('Zero external webhooks in V1', () => {
      const lower = migrationSql.toLowerCase();
      assert(!lower.includes('webhook'), 'Must not reference webhooks');
    });

    await st.test('Zero automated background cron daemons in V1', () => {
      const lower = migrationSql.toLowerCase();
      assert(!lower.includes('pg_cron'), 'Must not reference pg_cron');
    });

    await st.test('Zero mid-cycle proration math in V1', () => {
      const lower = migrationSql.toLowerCase();
      assert(!lower.includes('proration_rate'), 'Must not implement proration rate');
      assert(!lower.includes('prorated_amount'), 'Must not implement prorated amount');
    });

    await st.test('Zero session rollover across cycles in V1', () => {
      const lower = migrationSql.toLowerCase();
      assert(!lower.includes('rollover_quota'), 'Must not implement session rollover');
      assert(!lower.includes('carryover_sessions'), 'Must not implement carryover sessions');
    });

    await st.test('Zero multi-patient shared family plans in V1', () => {
      const lower = migrationSql.toLowerCase();
      assert(!lower.includes('family_plan'), 'Must not implement family plan');
      assert(!lower.includes('shared_quota'), 'Must not implement shared quota');
    });

    await st.test('Zero credit notes or cash refunds in V1', () => {
      const lower = migrationSql.toLowerCase();
      assert(!lower.includes('credit_notes'), 'Must not implement credit notes');
      assert(!lower.includes('cash_refund'), 'Must not implement cash refunds');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 9: Legacy Isolation (Zero Forbidden References)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 9: Legacy Isolation ---', async (st) => {
    await st.test('Zero forbidden legacy references across membership files', () => {
      const forbiddenPattern = /kabworld/i;
      assert(!forbiddenPattern.test(migrationSql), 'Migration contains forbidden legacy reference');
      assert(!forbiddenPattern.test(hardenMigrationSql), 'Hardening migration contains forbidden legacy reference');
      assert(!forbiddenPattern.test(membershipServiceCode), 'Service contains forbidden legacy reference');
      assert(!forbiddenPattern.test(typesDbCode), 'types/database contains forbidden legacy reference');
      assert(!forbiddenPattern.test(typesModelsCode), 'types/models contains forbidden legacy reference');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 10: Remote Supabase Live Verification & Ambiguity Reproduction
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 10: Remote Supabase Live Verification ---', async (st) => {
    const headers = {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'X-Practice-ID': PRACTICE_ID,
    };

    await st.test('Remote query returns HTTP 200 OK: Membership Plans with disambiguated service', async () => {
      const select = `*,service:services!fk_plan_service_practice(id,service_code,name,category)`.replace(/\s+/g, '');
      const url = `${SUPABASE_URL}/rest/v1/membership_plans?select=${encodeURIComponent(select)}&limit=1`;
      const res = await fetch(url, { headers });
      const body = await res.text();
      assert.equal(res.status, 200, `Expected HTTP 200 for membership_plans query, got ${res.status}. Body: ${body}`);
    });

    await st.test('Remote query returns HTTP 200 OK: Patient Memberships with disambiguated relations', async () => {
      const select = `*,patient:patients!fk_membership_patient_practice(id,patient_identifier,first_name,last_name),plan:membership_plans!fk_membership_plan_practice(id,plan_code,name)`.replace(/\s+/g, '');
      const url = `${SUPABASE_URL}/rest/v1/patient_memberships?select=${encodeURIComponent(select)}&limit=1`;
      const res = await fetch(url, { headers });
      const body = await res.text();
      assert.equal(res.status, 200, `Expected HTTP 200 for patient_memberships query, got ${res.status}. Body: ${body}`);
    });

    await st.test('Remote query returns HTTP 200 OK: Membership Billing Cycles with disambiguated invoice', async () => {
      const select = `*,invoice:invoices!fk_cycle_invoice_practice(id,invoice_number,grand_total,balance_due,status)`.replace(/\s+/g, '');
      const url = `${SUPABASE_URL}/rest/v1/membership_billing_cycles?select=${encodeURIComponent(select)}&limit=1`;
      const res = await fetch(url, { headers });
      const body = await res.text();
      assert.equal(res.status, 200, `Expected HTTP 200 for membership_billing_cycles query, got ${res.status}. Body: ${body}`);
    });

    await st.test('Remote query returns HTTP 200 OK: Membership Usage Ledger with disambiguated relations', async () => {
      const select = `*,visit:clinical_visits!fk_usage_visit_patient_practice(id,visit_identifier,status),service:services!fk_usage_service_practice(id,service_code,name)`.replace(/\s+/g, '');
      const url = `${SUPABASE_URL}/rest/v1/membership_usage_ledger?select=${encodeURIComponent(select)}&limit=1`;
      const res = await fetch(url, { headers });
      const body = await res.text();
      assert.equal(res.status, 200, `Expected HTTP 200 for membership_usage_ledger query, got ${res.status}. Body: ${body}`);
    });

    await st.test('Unhinted patient_memberships profiles query reproduces PGRST201 HTTP 300 proving disambiguation is required', async () => {
      const url = `${SUPABASE_URL}/rest/v1/patient_memberships?select=*,profiles(id)&limit=1`;
      const res = await fetch(url, { headers });
      assert.equal(res.status, 300, `Expected HTTP 300 for unhinted patient_memberships query, got ${res.status}`);
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 11: Clinical Usage Authority & Immutability Hardening
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 11: Clinical Usage Authority & Immutability Hardening ---', async (st) => {
    await st.test('record_membership_visit_usage strictly requires clinical visit status completed', () => {
      assert(
        hardenMigrationSql.includes("v_visit.status <> 'completed'") &&
        hardenMigrationSql.includes('Clinical visit must be completed to record membership usage'),
        'Must reject non-completed visits in record_membership_visit_usage'
      );
    });

    await st.test('record_membership_visit_usage verifies clinical encounter falls within cycle window', () => {
      assert(
        hardenMigrationSql.includes('v_visit_date < v_cycle.cycle_start_date OR v_visit_date > v_cycle.cycle_end_date') &&
        hardenMigrationSql.includes('falls outside billing cycle window'),
        'Must reject clinical visits that fall outside cycle date bounds'
      );
    });

    await st.test('generate_membership_cycle_invoice prohibits generating invoices on non-active memberships', () => {
      assert(
        hardenMigrationSql.includes("v_membership.status <> 'active'") &&
        hardenMigrationSql.includes('Cannot generate cycle invoice for membership in status'),
        'Must block cycle invoice generation for non-active memberships'
      );
    });

    await st.test('Billing cycle immutability trigger protects identification, quota, dates, and invoice link', () => {
      assert(
        hardenMigrationSql.includes('protect_membership_billing_cycles_immutability') &&
        hardenMigrationSql.includes('trg_protect_membership_billing_cycles_immutability') &&
        hardenMigrationSql.includes('Linked authoritative cycle invoice cannot be modified or unlinked') &&
        hardenMigrationSql.includes("OLD.status IN ('completed', 'cancelled')"),
        'Must register immutability and terminal state protection trigger on membership_billing_cycles'
      );
    });

    await st.test('Membership plans immutability trigger protects plan code, service link, and currency', () => {
      assert(
        hardenMigrationSql.includes('protect_membership_plans_immutability') &&
        hardenMigrationSql.includes('trg_protect_membership_plans_immutability') &&
        hardenMigrationSql.includes('Core membership plan code, service link, currency, and creation audit fields are immutable'),
        'Must register immutability trigger on membership_plans'
      );
    });

    await st.test('patient_memberships enforces chk_membership_pause and persists pause_reason', () => {
      assert(
        hardenMigrationSql.includes('chk_membership_pause') &&
        hardenMigrationSql.includes('pause_reason IS NOT NULL AND \n                    length(trim(pause_reason)) >= 5') &&
        hardenMigrationSql.includes('pause_reason = trim(p_reason)') &&
        hardenMigrationSql.includes('pause_reason = NULL'),
        'Must enforce pause constraint and maintain pause_reason lifecycle'
      );
    });
  });
});
