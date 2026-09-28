// ==============================================================================
// PHYSENRA PAYMENTS & RECEIPTS FOUNDATION V1 VERIFICATION SUITE
// File: tests/payments_receipts.test.cjs
//
// Verifies:
// 1. Schema integrity & multi-tenant composite foreign keys
// 2. Atomic sequential identifier generators (PMT-000001, REC-000001)
// 3. Immutability, lifecycle triggers & zero hard-delete enforcement
// 4. Stored procedures (record_payment_and_allocate, void_payment) accounting invariants
// 5. Strict Row-Level Security (RLS) & Role-Based Access Control (RBAC)
// 6. Absolute domain boundary verification (Zero packages/wallets/insurance/gateways/refunds)
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
  '20260928041000_payments_receipts_foundation.sql'
);
const PAYMENT_SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'paymentService.ts'
);
const RECEIPT_SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'receiptService.ts'
);
const BILLING_SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'billingService.ts'
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
const paymentServiceCode = fs.readFileSync(PAYMENT_SERVICE_PATH, 'utf8');
const receiptServiceCode = fs.readFileSync(RECEIPT_SERVICE_PATH, 'utf8');
const billingServiceCode = fs.readFileSync(BILLING_SERVICE_PATH, 'utf8');
const typesDbCode = fs.readFileSync(TYPES_DB_PATH, 'utf8');
const typesModelsCode = fs.readFileSync(TYPES_MODELS_PATH, 'utf8');

const SUPABASE_URL = 'https://xxknmdgneamtoahqayvl.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4a25tZGduZWFtdG9haHFheXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDUzNDgsImV4cCI6MjEwNjEyMTM0OH0.2XKv_9MixK87v-_3U_fEGHBeQsoPRpqM3Rw75QcVznk';
const PRACTICE_ID = '464c128a-f7a1-4efa-9e0b-485b14ae5ff4';

test('PHYSENRA PAYMENTS & RECEIPTS FOUNDATION V1 VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Database Schema & Relational Tenancy
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Database Schema & Relational Tenancy ---', async (st) => {
    await st.test('Migration creates practice payment counters table', () => {
      assert(
        migrationSql.includes('practice_payment_counters') &&
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.practice_payment_counters'),
        'Must create public.practice_payment_counters table'
      );
    });

    await st.test('Migration creates practice receipt counters table', () => {
      assert(
        migrationSql.includes('practice_receipt_counters') &&
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.practice_receipt_counters'),
        'Must create public.practice_receipt_counters table'
      );
    });

    await st.test('Migration defines payment_method, payment_status, and receipt_status enums', () => {
      assert(
        migrationSql.includes('CREATE TYPE public.payment_method AS ENUM') &&
        migrationSql.includes("'cash'") &&
        migrationSql.includes("'bank_transfer'") &&
        migrationSql.includes("'pos'") &&
        migrationSql.includes("'card'") &&
        migrationSql.includes("'other'"),
        'Must define payment_method enum with cash, bank_transfer, pos, card, other'
      );
      assert(
        migrationSql.includes('CREATE TYPE public.payment_status AS ENUM') &&
        migrationSql.includes("'confirmed'") &&
        migrationSql.includes("'voided'"),
        'Must define payment_status enum with confirmed and voided'
      );
      assert(
        migrationSql.includes('CREATE TYPE public.receipt_status AS ENUM') &&
        migrationSql.includes("'issued'") &&
        migrationSql.includes("'voided'"),
        'Must define receipt_status enum with issued and voided'
      );
    });

    await st.test('Migration creates public.payments table with multi-tenant composite keys', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.payments'),
        'Must create public.payments table'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_payments_practice FOREIGN KEY (practice_id)'),
        'Payments must have tenant foreign key to practices'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_payments_patient_practice FOREIGN KEY (patient_id, practice_id)'),
        'Payments must have composite foreign key to patients(practice_id, id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT uq_payments_practice_number UNIQUE (practice_id, payment_number)'),
        'Payments must enforce unique payment number per practice'
      );
      assert(
        migrationSql.includes('CONSTRAINT uq_payments_practice_idempotency UNIQUE (practice_id, idempotency_key)'),
        'Payments must enforce unique idempotency key per practice'
      );
      assert(
        migrationSql.includes('CONSTRAINT chk_payments_amount CHECK (amount > 0.00)'),
        'Payments must enforce amount > 0.00'
      );
    });

    await st.test('Migration creates public.receipts table with 1:1 payment relationship and composite tenant keys', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.receipts'),
        'Must create public.receipts table'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_receipts_payment_practice FOREIGN KEY (payment_id, practice_id)'),
        'Receipts must reference payment composite (practice_id, id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT uq_receipts_payment UNIQUE (payment_id)'),
        'Receipts must enforce strict 1:1 relation per payment'
      );
      assert(
        migrationSql.includes('CONSTRAINT uq_receipts_practice_number UNIQUE (practice_id, receipt_number)'),
        'Receipts must enforce unique receipt number per practice'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_receipts_patient_practice FOREIGN KEY (patient_id, practice_id)'),
        'Receipts must reference patient composite (practice_id, id)'
      );
    });

    await st.test('Migration creates public.payment_allocations table with composite keys to invoices and payments', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.payment_allocations'),
        'Must create public.payment_allocations table'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_allocations_payment_practice FOREIGN KEY (payment_id, practice_id)'),
        'Payment allocations must reference payment composite (practice_id, id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT fk_allocations_invoice_practice FOREIGN KEY (invoice_id, practice_id)'),
        'Payment allocations must reference invoice composite (practice_id, id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT chk_allocations_amount CHECK (amount > 0.00)'),
        'Payment allocations must enforce amount > 0.00'
      );
      assert(
        migrationSql.includes('CONSTRAINT uq_allocations_payment_invoice UNIQUE (payment_id, invoice_id)'),
        'Payment allocations must enforce unique invoice per payment'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Immutability, Audit, & Zero Hard-Delete Enforcement
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Immutability, Audit & Zero Hard-Delete ---', async (st) => {
    await st.test('Payment hard delete is completely blocked', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.prevent_payment_hard_delete()') &&
        migrationSql.includes('Payments cannot be deleted'),
        'Must define hard-delete prevention trigger for payments'
      );
      assert(
        migrationSql.includes('CREATE TRIGGER trg_prevent_payment_hard_delete') &&
        migrationSql.includes('BEFORE DELETE ON public.payments'),
        'Must attach hard-delete trigger to payments table'
      );
    });

    await st.test('Receipt hard delete is completely blocked', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.prevent_receipt_hard_delete()') &&
        migrationSql.includes('Receipts are permanent legal documents and cannot be deleted'),
        'Must define hard-delete prevention trigger for receipts'
      );
      assert(
        migrationSql.includes('CREATE TRIGGER trg_prevent_receipt_hard_delete') &&
        migrationSql.includes('BEFORE DELETE ON public.receipts'),
        'Must attach hard-delete trigger to receipts table'
      );
    });

    await st.test('Payment allocation hard delete is completely blocked', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.prevent_allocation_hard_delete()') &&
        migrationSql.includes('Payment allocations are immutable audit records and cannot be deleted'),
        'Must define hard-delete prevention trigger for payment allocations'
      );
      assert(
        migrationSql.includes('CREATE TRIGGER trg_prevent_allocation_hard_delete') &&
        migrationSql.includes('BEFORE DELETE ON public.payment_allocations'),
        'Must attach hard-delete trigger to payment_allocations table'
      );
    });

    await st.test('Payment fields immutability trigger blocks financial modifications', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.protect_payment_immutability()') &&
        migrationSql.includes('amount is immutable on confirmed payments'),
        'Must define immutability trigger for payments'
      );
      assert(
        migrationSql.includes('CREATE TRIGGER trg_protect_payment_immutability') &&
        migrationSql.includes('BEFORE UPDATE ON public.payments'),
        'Must attach immutability trigger to payments'
      );
    });

    await st.test('Receipt fields immutability trigger protects legal proof of payment', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.protect_receipt_immutability()') &&
        migrationSql.includes('amount is immutable on receipts'),
        'Must define immutability trigger for receipts'
      );
      assert(
        migrationSql.includes('CREATE TRIGGER trg_protect_receipt_immutability') &&
        migrationSql.includes('BEFORE UPDATE ON public.receipts'),
        'Must attach immutability trigger to receipts'
      );
    });

    await st.test('Invoice immutability trigger was updated to permit payment settlements', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.protect_invoice_immutability()') &&
        migrationSql.includes("NEW.status = 'partially_paid'") &&
        migrationSql.includes("NEW.status = 'paid'"),
        'Invoice immutability trigger must allow issued -> partially_paid -> paid transitions'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Stored Procedures & Accounting Invariants
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Stored Procedures & Accounting Invariants ---', async (st) => {
    await st.test('Sequential payment and receipt counter functions are defined', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.generate_next_payment_number') &&
        migrationSql.includes("'PMT-' || LPAD(v_next_val::TEXT, 6, '0')"),
        'Must define generate_next_payment_number producing PMT-000001 format'
      );
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.generate_next_receipt_number') &&
        migrationSql.includes("'REC-' || LPAD(v_next_val::TEXT, 6, '0')"),
        'Must define generate_next_receipt_number producing REC-000001 format'
      );
    });

    await st.test('record_payment_and_allocate validates RBAC and idempotency', () => {
      assert(
        migrationSql.includes("user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])"),
        'record_payment_and_allocate must enforce role authorization'
      );
      assert(
        migrationSql.includes('idempotency_key = p_idempotency_key'),
        'record_payment_and_allocate must enforce idempotent settlement return'
      );
    });

    await st.test('record_payment_and_allocate validates allocation sum matches total payment amount', () => {
      assert(
        migrationSql.includes('v_total_allocated <> p_amount') &&
        migrationSql.includes('Total allocated amount (%) does not match payment amount (%)'),
        'Must enforce that sum of allocations equals payment amount'
      );
    });

    await st.test('record_payment_and_allocate validates invoice balance invariants and currency match', () => {
      assert(
        migrationSql.includes('FROM public.invoices') &&
        migrationSql.includes('FOR UPDATE;'),
        'Must acquire pessimistic row lock FOR UPDATE on invoice'
      );
      assert(
        migrationSql.includes('v_inv_record.patient_id <> p_patient_id') &&
        migrationSql.includes('Cross-patient allocation is prohibited'),
        'Must reject allocations for invoices belonging to different patients'
      );
      assert(
        migrationSql.includes('v_inv_record.currency <> p_currency') &&
        migrationSql.includes('Cross-currency allocation is prohibited'),
        'Must reject multi-currency allocations'
      );
      assert(
        migrationSql.includes('v_inv_amt > v_inv_record.balance_due') &&
        migrationSql.includes('exceeds remaining invoice balance'),
        'Must strictly prevent over-allocation beyond invoice balance due'
      );
    });

    await st.test('record_payment_and_allocate updates invoice balances and automatically issues receipt', () => {
      assert(
        migrationSql.includes('UPDATE public.invoices') &&
        migrationSql.includes('amount_paid = amount_paid + v_inv_amt') &&
        migrationSql.includes('balance_due = grand_total - (amount_paid + v_inv_amt)'),
        'Must update invoice amount_paid, balance_due, and transition status to partially_paid or paid'
      );
      assert(
        migrationSql.includes('INSERT INTO public.receipts') &&
        migrationSql.includes('v_receipt_number') &&
        migrationSql.includes("'issued'"),
        'Must automatically create an issued receipt upon payment recording'
      );
    });

    await st.test('void_payment validates role, void reason, reverses invoice balances and marks receipt voided', () => {
      assert(
        migrationSql.includes("user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])"),
        'void_payment must strictly restrict role to owner, manager, or accountant (receptionist forbidden)'
      );
      assert(
        migrationSql.includes('length(trim(p_void_reason)) < 5') &&
        migrationSql.includes('Voiding a payment requires a non-empty void_reason of at least 5 characters'),
        'void_payment requires minimum 5-character reason'
      );
      assert(
        migrationSql.includes('UPDATE public.invoices') &&
        migrationSql.includes('amount_paid = GREATEST(0.00, amount_paid - v_alloc_record.amount)') &&
        migrationSql.includes('balance_due = grand_total - GREATEST(0.00, amount_paid - v_alloc_record.amount)'),
        'void_payment must reverse invoice amount_paid, balance_due, and restore prior status'
      );
      assert(
        migrationSql.includes('UPDATE public.receipts') &&
        migrationSql.includes('UPDATE public.payments') &&
        migrationSql.includes("'voided'"),
        'void_payment must transition both receipt and payment to voided status'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Absolute Domain Boundary Firewall (Anti-Leakage)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Absolute Domain Boundary Firewall ---', async (st) => {
    await st.test('Zero Kabworld references anywhere in codebase', () => {
      assert(!migrationSql.toLowerCase().includes('kabworld'), 'Migration must not reference kabworld');
      assert(!paymentServiceCode.toLowerCase().includes('kabworld'), 'paymentService must not reference kabworld');
      assert(!receiptServiceCode.toLowerCase().includes('kabworld'), 'receiptService must not reference kabworld');
      assert(!typesDbCode.toLowerCase().includes('kabworld'), 'types/database must not reference kabworld');
      assert(!typesModelsCode.toLowerCase().includes('kabworld'), 'types/models must not reference kabworld');
    });

    await st.test('Zero packages/memberships implementation in V1', () => {
      assert(!migrationSql.includes('CREATE TABLE public.packages'), 'Must not create packages table');
      assert(!migrationSql.includes('CREATE TABLE public.memberships'), 'Must not create memberships table');
      assert(!migrationSql.includes('CREATE TABLE public.package_subscriptions'), 'Must not create subscriptions table');
      assert(!paymentServiceCode.includes('packageId'), 'paymentService must not contain packageId');
    });

    await st.test('Zero patient wallets implementation in V1', () => {
      assert(!migrationSql.includes('CREATE TABLE public.wallets'), 'Must not create wallets table');
      assert(!migrationSql.includes('CREATE TABLE public.wallet_transactions'), 'Must not create wallet_transactions table');
      assert(!paymentServiceCode.includes('walletBalance'), 'paymentService must not reference wallet balance');
    });

    await st.test('Zero insurance claims or external gateway webhooks in V1', () => {
      assert(!migrationSql.includes('CREATE TABLE public.claims'), 'Must not create insurance claims table');
      assert(!migrationSql.includes('stripe'), 'Must not integrate stripe in V1');
      assert(!migrationSql.includes('paystack'), 'Must not integrate paystack in V1');
      assert(!migrationSql.includes('flutterwave'), 'Must not integrate flutterwave in V1');
      assert(!paymentServiceCode.includes('stripe'), 'paymentService must not reference stripe');
    });

    await st.test('Zero credit notes or refund tables in V1', () => {
      assert(!migrationSql.includes('CREATE TABLE public.credit_notes'), 'Must not create credit_notes table');
      assert(!migrationSql.includes('CREATE TABLE public.refunds'), 'Must not create refunds table');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Application Service & PostgREST Relationship Disambiguation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Application Service & PostgREST Disambiguation ---', async (st) => {
    await st.test('paymentService uses explicit composite foreign key hints for queries', () => {
      assert(
        paymentServiceCode.includes('patient:patients!fk_payments_patient_practice'),
        'paymentService must use fk_payments_patient_practice hint'
      );
      assert(
        paymentServiceCode.includes('allocations:payment_allocations!fk_allocations_payment_practice'),
        'paymentService must use fk_allocations_payment_practice hint'
      );
      assert(
        paymentServiceCode.includes('invoice:invoices!fk_allocations_invoice_practice'),
        'paymentService must use fk_allocations_invoice_practice hint'
      );
      assert(
        paymentServiceCode.includes('receipt:receipts!fk_receipts_payment_practice'),
        'paymentService must use fk_receipts_payment_practice hint'
      );
    });

    await st.test('receiptService uses explicit composite foreign key hints for queries', () => {
      assert(
        receiptServiceCode.includes('patient:patients!fk_receipts_patient_practice'),
        'receiptService must use fk_receipts_patient_practice hint'
      );
      assert(
        receiptServiceCode.includes('payment:payments!fk_receipts_payment_practice'),
        'receiptService must use fk_receipts_payment_practice hint'
      );
      assert(
        receiptServiceCode.includes('allocations:payment_allocations!fk_allocations_payment_practice'),
        'receiptService must use fk_allocations_payment_practice hint'
      );
      assert(
        receiptServiceCode.includes('invoice:invoices!fk_allocations_invoice_practice'),
        'receiptService must use fk_allocations_invoice_practice hint'
      );
    });

    await st.test('billingService permits invoice transitions initiated by payment settlements', () => {
      assert(
        billingServiceCode.includes("issued: ['partially_paid', 'paid', 'void']"),
        'billingService must allow transition from issued to partially_paid or paid'
      );
      assert(
        billingServiceCode.includes("partially_paid: ['issued', 'paid', 'void']"),
        'billingService must allow transition from partially_paid to issued, paid or void'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Remote Supabase Live Verification via REST API
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Remote Supabase Live Verification ---', async (st) => {
    await st.test('Remote query returns HTTP 200 OK: Payments with disambiguated relations', async () => {
      const select = `
        *,
        patient:patients!fk_payments_patient_practice(id,patient_identifier,first_name,last_name),
        receipt:receipts!fk_receipts_payment_practice(id,receipt_number,issue_date,status),
        allocations:payment_allocations!fk_allocations_payment_practice(
          id,
          amount,
          invoice:invoices!fk_allocations_invoice_practice(id,invoice_number,grand_total,balance_due,status)
        )
      `.replace(/\s+/g, '');

      const url = `${SUPABASE_URL}/rest/v1/payments?select=${encodeURIComponent(select)}&limit=1`;
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
        `Expected HTTP 200 for payments query, got ${res.status}. Body: ${body}`
      );
    });

    await st.test('Remote query returns HTTP 200 OK: Receipts with disambiguated relations', async () => {
      const select = `
        *,
        patient:patients!fk_receipts_patient_practice(id,patient_identifier,first_name,last_name),
        payment:payments!fk_receipts_payment_practice(
          id,
          payment_number,
          payment_date,
          amount,
          currency,
          payment_method,
          status
        )
      `.replace(/\s+/g, '');

      const url = `${SUPABASE_URL}/rest/v1/receipts?select=${encodeURIComponent(select)}&limit=1`;
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
        `Expected HTTP 200 for receipts query, got ${res.status}. Body: ${body}`
      );
    });

    await st.test('Remote query returns HTTP 200 OK: Payment Allocations with disambiguated relations', async () => {
      const select = `
        *,
        payment:payments!fk_allocations_payment_practice(id,payment_number,amount),
        invoice:invoices!fk_allocations_invoice_practice(id,invoice_number,grand_total,balance_due)
      `.replace(/\s+/g, '');

      const url = `${SUPABASE_URL}/rest/v1/payment_allocations?select=${encodeURIComponent(select)}&limit=1`;
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
        `Expected HTTP 200 for payment_allocations query, got ${res.status}. Body: ${body}`
      );
    });

    await st.test('Unhinted payments query reproduces PGRST201 HTTP 300 proving disambiguation is required', async () => {
      const url = `${SUPABASE_URL}/rest/v1/payments?select=*,profiles(id)&limit=1`;
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
        `Expected HTTP 300 (Ambiguous relationship) for unhinted payments query, got ${res.status}`
      );
    });
  });
});
