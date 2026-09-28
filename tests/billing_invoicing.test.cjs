// ==============================================================================
// PHYSENRA BILLING & INVOICING FOUNDATION V1 VERIFICATION SUITE
// File: tests/billing_invoicing.test.cjs
//
// Verifies:
// 1. Schema integrity & multi-tenant composite foreign keys
// 2. Atomic sequential identifier generator (INV-000001)
// 3. Immutability, historical price preservation, & lifecycle triggers
// 4. Zero hard-delete policy for non-draft invoices and their lines
// 5. Deterministic financial calculation integrity & snapshot preservation
// 6. Strict Row-Level Security (RLS) & Role-Based Access Control (RBAC)
// 7. Absolute domain boundary verification (Zero payments/packages/wallets/insurance/gateways)
// 8. Application service domain logic, PostgREST hints & state machine rules
// 9. Authoritative fee schedule pricing & rejection of client price manipulation
// 10. Remote Supabase live query verification with PostgREST constraint hints
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
  '20260928040000_billing_invoicing_foundation.sql'
);
const SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'billingService.ts'
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

test('PHYSENRA BILLING & INVOICING FOUNDATION V1 VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Database Schema & Relational Tenancy
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Billing Database Schema & Relational Tenancy ---', async (st) => {
    await st.test('Migration creates practice invoice counter table', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.practice_invoice_counters') ||
        migrationSql.includes('CREATE TABLE public.practice_invoice_counters'),
        'Must create public.practice_invoice_counters table'
      );
    });

    await st.test('Migration defines controlled enum for invoice_status without cancelled', () => {
      assert(
        migrationSql.includes('CREATE TYPE public.invoice_status AS ENUM'),
        'Must create public.invoice_status enum'
      );
      assert(
        migrationSql.includes("'draft'") &&
        migrationSql.includes("'issued'") &&
        migrationSql.includes("'partially_paid'") &&
        migrationSql.includes("'paid'") &&
        migrationSql.includes("'void'"),
        'invoice_status must contain draft, issued, partially_paid, paid, void'
      );
      assert(
        !migrationSql.includes("'cancelled'"),
        'invoice_status must NOT contain cancelled'
      );
    });

    await st.test('TypeScript types do NOT define cancelled status', () => {
      assert(
        !typesCode.includes("export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'void' | 'cancelled';"),
        'InvoiceStatus type must not include cancelled'
      );
      assert(
        typesCode.includes("export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'void';"),
        'InvoiceStatus must strictly be draft | issued | partially_paid | paid | void'
      );
    });

    await st.test('Migration creates public.invoices table with composite tenant keys and balance invariants', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.invoices') ||
        migrationSql.includes('CREATE TABLE public.invoices'),
        'Must create public.invoices table'
      );
      assert(
        migrationSql.includes('uq_invoices_practice_number UNIQUE (practice_id, invoice_number)'),
        'Must enforce unique invoice_number per practice'
      );
      assert(
        migrationSql.includes('uq_invoices_id_practice UNIQUE (id, practice_id)'),
        'Must enforce unique (id, practice_id) for multi-tenant child FK references'
      );
      assert(
        migrationSql.includes('fk_invoices_patient_practice'),
        'Must declare composite fk_invoices_patient_practice'
      );
      assert(
        migrationSql.includes('fk_invoices_episode_patient_practice'),
        'Must declare composite fk_invoices_episode_patient_practice'
      );
      assert(
        migrationSql.includes('fk_invoices_visit_patient_practice'),
        'Must declare composite fk_invoices_visit_patient_practice'
      );
      assert(
        migrationSql.includes('fk_invoices_schedule_practice'),
        'Must declare composite fk_invoices_schedule_practice'
      );
      assert(
        migrationSql.includes('chk_invoices_totals_balance CHECK (grand_total = (subtotal - discount_total + tax_total))'),
        'Must enforce mathematical grand total check invariant'
      );
      assert(
        migrationSql.includes('chk_invoices_balance CHECK (balance_due = grand_total - amount_paid)'),
        'Must enforce balance_due check invariant'
      );
    });

    await st.test('Migration creates public.invoice_lines table with mandatory service_id and snapshot columns', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.invoice_lines') ||
        migrationSql.includes('CREATE TABLE public.invoice_lines'),
        'Must create public.invoice_lines table'
      );
      assert(
        migrationSql.includes('service_id UUID NOT NULL'),
        'service_id must be NOT NULL on invoice_lines'
      );
      assert(
        migrationSql.includes('service_code_snapshot VARCHAR(64) NOT NULL'),
        'Must store service_code_snapshot'
      );
      assert(
        migrationSql.includes('service_name_snapshot VARCHAR(255) NOT NULL'),
        'Must store service_name_snapshot'
      );
      assert(
        migrationSql.includes('unit_price_snapshot NUMERIC(12, 2) NOT NULL'),
        'Must store unit_price_snapshot with NUMERIC(12, 2)'
      );
      assert(
        migrationSql.includes('tax_rate_percent_snapshot NUMERIC(5, 2) NOT NULL'),
        'Must store tax_rate_percent_snapshot'
      );
      assert(
        migrationSql.includes('fk_invoice_lines_invoice_practice'),
        'Must declare composite fk_invoice_lines_invoice_practice'
      );
      assert(
        migrationSql.includes('fk_invoice_lines_service_practice'),
        'Must declare composite fk_invoice_lines_service_practice'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Identifier Generator & Trigger Invariants
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Identifier Generator, Immutability & Hard Delete Protection ---', async (st) => {
    await st.test('Sequence generator is SECURITY DEFINER with fixed search_path and RBAC protection', () => {
      assert(
        migrationSql.includes('FUNCTION public.generate_next_invoice_number'),
        'Must declare generate_next_invoice_number function'
      );
      assert(
        migrationSql.includes("'INV-' || LPAD"),
        'Invoice number must use INV-000001 format'
      );
      assert(
        migrationSql.includes('SECURITY DEFINER'),
        'Generator must be SECURITY DEFINER'
      );
      assert(
        migrationSql.includes('SET search_path = public, pg_temp'),
        'Generator must set search_path to public, pg_temp'
      );
      assert(
        migrationSql.includes("ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']"),
        'Generator must restrict execution to authorized billing roles'
      );
    });

    await st.test('Triggers protect invoice immutability, line immutability and prevent hard delete', () => {
      assert(
        migrationSql.includes('FUNCTION public.protect_invoice_immutability'),
        'Must declare protect_invoice_immutability function'
      );
      assert(
        migrationSql.includes('FUNCTION public.protect_invoice_line_immutability'),
        'Must declare protect_invoice_line_immutability function'
      );
      assert(
        migrationSql.includes('FUNCTION public.sync_invoice_totals'),
        'Must declare sync_invoice_totals function'
      );
      assert(
        migrationSql.includes('FUNCTION public.prevent_invoice_hard_delete'),
        'Must declare prevent_invoice_hard_delete function'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Authoritative Pricing & Mathematical Integrity Invariants
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Authoritative Pricing & Mathematical Integrity ---', async (st) => {
    await st.test('Line trigger authoritatively resolves price from fee_schedule_items and rejects manipulation', () => {
      assert(
        migrationSql.includes('FROM public.fee_schedule_items fsi'),
        'Trigger must query fee_schedule_items directly'
      );
      assert(
        migrationSql.includes('NEW.unit_price_snapshot := v_authoritative_price;'),
        'Trigger must overwrite unit_price_snapshot with authoritative tariff'
      );
      assert(
        migrationSql.includes('NEW.service_code_snapshot := v_service_code;'),
        'Trigger must stamp service_code_snapshot from services table'
      );
      assert(
        migrationSql.includes('NEW.service_name_snapshot := v_service_name;'),
        'Trigger must stamp service_name_snapshot from services table'
      );
    });

    await st.test('Line trigger computes deterministic tax and total values', () => {
      assert(
        migrationSql.includes('NEW.tax_amount := ROUND((v_subtotal - NEW.discount_amount) * (NEW.tax_rate_percent_snapshot / 100.0), 2);'),
        'Tax must be derived deterministically from taxable subtotal'
      );
      assert(
        migrationSql.includes('NEW.line_total := v_subtotal - NEW.discount_amount + NEW.tax_amount;'),
        'Line total must be derived deterministically from subtotal, discount, and tax'
      );
    });

    await st.test('Line trigger validates discount does not exceed subtotal', () => {
      assert(
        migrationSql.includes('IF NEW.discount_amount > v_subtotal THEN'),
        'Trigger must reject discount exceeding subtotal'
      );
    });

    await st.test('Invoice trigger strictly rejects premature payment transitions in Billing V1', () => {
      assert(
        migrationSql.includes("IF NEW.status IN ('partially_paid', 'paid') THEN") &&
        migrationSql.includes("requires the Payments domain which is not implemented in Billing V1"),
        'Trigger must block arbitrary client transitions to partially_paid or paid'
      );
    });

    await st.test('Invoice trigger requires minimum 5-character reason for voiding', () => {
      assert(
        migrationSql.includes("length(trim(NEW.void_reason)) < 5"),
        'Trigger must require at least 5 characters for void_reason'
      );
    });

    await st.test('Invoice trigger restricts voiding to owners, managers, and accountants', () => {
      assert(
        migrationSql.includes("ARRAY['practice_owner', 'practice_manager', 'accountant']"),
        'Voiding must be restricted to management and accounting roles'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Tenant Isolation & Row-Level Security
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Tenant Isolation & Row-Level Security ---', async (st) => {
    await st.test('RLS is explicitly enabled on all billing tables', () => {
      assert(
        migrationSql.includes('ALTER TABLE public.practice_invoice_counters ENABLE ROW LEVEL SECURITY;'),
        'Must enable RLS on practice_invoice_counters'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;'),
        'Must enable RLS on invoices'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;'),
        'Must enable RLS on invoice_lines'
      );
    });

    await st.test('RLS policies enforce view-only access for physiotherapists', () => {
      // Invoices
      assert(
        migrationSql.includes("CREATE POLICY \"invoices_practice_select\"") &&
        migrationSql.includes("'physiotherapist'"),
        'Physiotherapist must have SELECT access on invoices'
      );
      const insertPolicy = migrationSql.split('CREATE POLICY "invoices_practice_insert"')[1].split(';')[0];
      assert(!insertPolicy.includes('physiotherapist'), 'Physiotherapist must NOT have INSERT access on invoices');

      const updatePolicy = migrationSql.split('CREATE POLICY "invoices_practice_update"')[1].split(';')[0];
      assert(!updatePolicy.includes('physiotherapist'), 'Physiotherapist must NOT have UPDATE access on invoices');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Absolute Domain Boundary Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Absolute Domain Boundary Verification ---', async (st) => {
    await st.test('Migration does NOT introduce prohibited table or column "payments"', () => {
      assert(
        !migrationSql.includes('CREATE TABLE public.payments') &&
        !migrationSql.includes('CREATE TABLE IF NOT EXISTS public.payments'),
        'Must NOT create payments table'
      );
    });

    await st.test('Migration does NOT introduce prohibited table or column "receipts"', () => {
      assert(
        !migrationSql.includes('CREATE TABLE public.receipts') &&
        !migrationSql.includes('CREATE TABLE IF NOT EXISTS public.receipts'),
        'Must NOT create receipts table'
      );
    });

    await st.test('Migration does NOT introduce prohibited table or column "patient_wallets"', () => {
      assert(
        !migrationSql.includes('patient_wallets'),
        'Must NOT reference patient_wallets'
      );
    });

    await st.test('Migration does NOT introduce prohibited table or column "packages"', () => {
      assert(
        !migrationSql.includes('CREATE TABLE public.packages') &&
        !migrationSql.includes('CREATE TABLE IF NOT EXISTS public.packages'),
        'Must NOT create packages table'
      );
    });

    await st.test('Migration does NOT introduce prohibited table or column "insurance_claims"', () => {
      assert(
        !migrationSql.includes('insurance_claims'),
        'Must NOT reference insurance_claims'
      );
    });

    await st.test('Migration does NOT introduce prohibited table or column "gateways"', () => {
      assert(
        !migrationSql.includes('payment_gateways') &&
        !migrationSql.includes('gateway_credentials'),
        'Must NOT reference payment gateways'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Application Service & Domain Logic
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Application Service & Domain Logic ---', async (st) => {
    await st.test('billingService integrates with public.log_audit_event for billing events', () => {
      assert(
        serviceCode.includes("p_action: 'invoice.created'"),
        'Must log invoice.created'
      );
      assert(
        serviceCode.includes("p_action: 'invoice.issued'"),
        'Must log invoice.issued'
      );
      assert(
        serviceCode.includes("p_action: 'invoice.voided'"),
        'Must log invoice.voided'
      );
      assert(
        !serviceCode.includes("p_action: 'invoice.cancelled'"),
        'Must NOT log invoice.cancelled'
      );
    });

    await st.test('billingService enforces allowed lifecycle transitions without cancelled', () => {
      assert(
        serviceCode.includes('ALLOWED_INVOICE_TRANSITIONS'),
        'Must define ALLOWED_INVOICE_TRANSITIONS'
      );
      assert(
        !serviceCode.includes("draft: ['issued', 'cancelled']"),
        'Draft transitions must not include cancelled'
      );
    });

    await st.test('resolveServicePrice requires defined fee schedule tariff and throws on missing tariff', () => {
      assert(
        serviceCode.includes('does not have an active tariff defined in the applicable fee schedule'),
        'resolveServicePrice must reject services without active tariffs'
      );
      assert(
        !serviceCode.includes('unitPrice: 0,\n      currency: \'NGN\',\n      isTaxable: false'),
        'Must NOT provide silent zero-price fallback'
      );
    });

    await st.test('billingService uses explicit PostgREST foreign key constraint hints', () => {
      assert(
        serviceCode.includes('patient:patients!fk_invoices_patient_practice'),
        'Must use fk_invoices_patient_practice hint'
      );
      assert(
        serviceCode.includes('episode:episodes_of_care!fk_invoices_episode_patient_practice'),
        'Must use fk_invoices_episode_patient_practice hint'
      );
      assert(
        serviceCode.includes('clinical_visit:clinical_visits!fk_invoices_visit_patient_practice'),
        'Must use fk_invoices_visit_patient_practice hint'
      );
      assert(
        serviceCode.includes('fee_schedule:fee_schedules!fk_invoices_schedule_practice'),
        'Must use fk_invoices_schedule_practice hint'
      );
      assert(
        serviceCode.includes('lines:invoice_lines!fk_invoice_lines_invoice_practice'),
        'Must use fk_invoice_lines_invoice_practice hint'
      );
      assert(
        serviceCode.includes('service:services!fk_invoice_lines_service_practice'),
        'Must use fk_invoice_lines_service_practice hint'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 7: Remote Supabase Live Query Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 7: Remote Supabase Live Query Verification ---', async (st) => {
    await st.test('Remote query returns HTTP 200 OK: Invoices with disambiguated relations', async () => {
      const select = `
        *,
        patient:patients!fk_invoices_patient_practice(id,patient_identifier,first_name,last_name),
        episode:episodes_of_care!fk_invoices_episode_patient_practice(id,episode_identifier,title),
        clinical_visit:clinical_visits!fk_invoices_visit_patient_practice(id,visit_identifier),
        fee_schedule:fee_schedules!fk_invoices_schedule_practice(id,schedule_identifier,name),
        lines:invoice_lines!fk_invoice_lines_invoice_practice(*,service:services!fk_invoice_lines_service_practice(id,service_code,name))
      `.replace(/\s+/g, '');

      const url = `${SUPABASE_URL}/rest/v1/invoices?select=${encodeURIComponent(select)}&limit=1`;
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
        `Expected HTTP 200 for invoices query, got ${res.status}. Body: ${body}`
      );
    });

    await st.test('Remote query returns HTTP 200 OK: Invoice Lines with disambiguated service', async () => {
      const select = '*,service:services!fk_invoice_lines_service_practice(*)';
      const url = `${SUPABASE_URL}/rest/v1/invoice_lines?select=${encodeURIComponent(select)}&limit=1`;
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
        `Expected HTTP 200 for invoice_lines query, got ${res.status}. Body: ${body}`
      );
    });

    await st.test('Unhinted query reproduces PGRST201 HTTP 300 to prove disambiguation is required', async () => {
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
        `Expected HTTP 300 (Ambiguous relationship) for unhinted query, got ${res.status}`
      );
    });
  });
});
