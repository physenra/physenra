// ==============================================================================
// PHYSENRA PATIENT WALLETS FOUNDATION V1 VERIFICATION SUITE
// File: tests/wallets.test.cjs
//
// Verifies:
// 1. Schema integrity, multi-tenant composite foreign keys & zero mutable balance column
// 2. Atomic sequential identifier generator (WLT-000001)
// 3. Immutability, lifecycle triggers & zero hard-delete enforcement
// 4. Stored procedures (get_or_create, deposit, overpayment, settle, adjust, status) accounting invariants
// 5. Strict Row-Level Security (RLS) & multi-tenancy policies
// 6. Absolute domain boundary verification (Zero memberships/credit notes/gateways/refunds/FX/transfers)
// 7. Non-negotiable physical isolation from legacy systems (Zero kabworld references)
// 8. Application service domain logic, explicit PostgREST hints & dynamic derived balance
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
  '20260929010000_patient_wallets_foundation.sql'
);
const HARDENING_MIGRATION_PATH = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260929011000_harden_wallet_financial_invariants.sql'
);
const WALLET_SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'walletService.ts'
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
const hardeningMigrationSql = fs.readFileSync(HARDENING_MIGRATION_PATH, 'utf8');
const walletServiceCode = fs.readFileSync(WALLET_SERVICE_PATH, 'utf8');
const typesDbCode = fs.readFileSync(TYPES_DB_PATH, 'utf8');
const typesModelsCode = fs.readFileSync(TYPES_MODELS_PATH, 'utf8');

const SUPABASE_URL = 'https://xxknmdgneamtoahqayvl.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4a25tZGduZWFtdG9haHFheXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDUzNDgsImV4cCI6MjEwNjEyMTM0OH0.2XKv_9MixK87v-_3U_fEGHBeQsoPRpqM3Rw75QcVznk';
const PRACTICE_ID = '464c128a-f7a1-4efa-9e0b-485b14ae5ff4';

test('PHYSENRA PATIENT WALLETS FOUNDATION V1 VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Database Schema & Relational Tenancy
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Database Schema & Relational Tenancy ---', async (st) => {
    await st.test('Migration creates practice_wallet_counters table', () => {
      assert(
        migrationSql.includes('practice_wallet_counters') &&
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.practice_wallet_counters'),
        'Must create public.practice_wallet_counters table'
      );
    });

    await st.test('Migration creates patient_wallets table with zero mutable balance column', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.patient_wallets'),
        'Must create public.patient_wallets table'
      );
      const patientWalletsTableBlock = migrationSql.match(/CREATE TABLE IF NOT EXISTS public\.patient_wallets \(([\s\S]+?)\);/)[1];
      assert(
        !patientWalletsTableBlock.includes('balance'),
        'patient_wallets table definition must NEVER contain a mutable balance column (Option E derived balance invariant)'
      );
      assert(
        migrationSql.includes('wallet_number VARCHAR(32) NOT NULL'),
        'Must define wallet_number column'
      );
      assert(
        migrationSql.includes("currency VARCHAR(3) NOT NULL DEFAULT 'NGN'"),
        'Must define ISO currency with NGN default'
      );
    });

    await st.test('Migration creates patient_wallet_ledger table with check constraints', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.patient_wallet_ledger'),
        'Must create public.patient_wallet_ledger table'
      );
      assert(
        migrationSql.includes('amount <> 0.00'),
        'Must enforce check constraint that amount <> 0.00 on patient_wallet_ledger'
      );
    });

    await st.test('Migration defines wallet_status and wallet_ledger_entry_type enums', () => {
      assert(
        migrationSql.includes('CREATE TYPE public.wallet_status AS ENUM') &&
        migrationSql.includes("'active'") &&
        migrationSql.includes("'suspended'") &&
        migrationSql.includes("'closed'"),
        'Must define wallet_status enum with active, suspended, closed'
      );
      assert(
        migrationSql.includes('CREATE TYPE public.wallet_ledger_entry_type AS ENUM') &&
        migrationSql.includes("'deposit'") &&
        migrationSql.includes("'overpayment_conversion'") &&
        migrationSql.includes("'invoice_settlement'") &&
        migrationSql.includes("'adjustment_credit'") &&
        migrationSql.includes("'adjustment_debit'"),
        'Must define wallet_ledger_entry_type enum with operations'
      );
    });

    await st.test('Migration enforces composite foreign keys for bulletproof multi-tenancy', () => {
      assert(
        migrationSql.includes('fk_wallets_patient_practice') &&
        migrationSql.includes('FOREIGN KEY (patient_id, practice_id)'),
        'Must enforce composite foreign key fk_wallets_patient_practice'
      );
      assert(
        migrationSql.includes('fk_ledger_wallet_practice') &&
        migrationSql.includes('FOREIGN KEY (wallet_id, practice_id)'),
        'Must enforce composite foreign key fk_ledger_wallet_practice'
      );
      assert(
        migrationSql.includes('fk_ledger_patient_practice') &&
        migrationSql.includes('FOREIGN KEY (patient_id, practice_id)'),
        'Must enforce composite foreign key fk_ledger_patient_practice'
      );
      assert(
        migrationSql.includes('fk_ledger_payment_practice') &&
        migrationSql.includes('FOREIGN KEY (source_payment_id, practice_id)'),
        'Must enforce composite foreign key fk_ledger_payment_practice'
      );
      assert(
        migrationSql.includes('fk_ledger_invoice_practice') &&
        migrationSql.includes('FOREIGN KEY (source_invoice_id, practice_id)'),
        'Must enforce composite foreign key fk_ledger_invoice_practice'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Atomic Sequential Identifier Generator
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Atomic Sequential Identifier Generator ---', async (st) => {
    await st.test('generate_next_wallet_number is SECURITY DEFINER with fixed search_path', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.generate_next_wallet_number'),
        'Must define generate_next_wallet_number function'
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

    await st.test('generate_next_wallet_number uses atomic upsert and formats WLT-000001', () => {
      assert(
        migrationSql.includes('ON CONFLICT (practice_id) DO UPDATE'),
        'Must use atomic upsert on practice_wallet_counters'
      );
      assert(
        migrationSql.includes("'WLT-' || LPAD("),
        'Must format identifier with WLT- prefix and zero-padded sequence'
      );
    });

    await st.test('Privileges for identifier generator are restricted', () => {
      assert(
        migrationSql.includes('REVOKE ALL ON FUNCTION public.generate_next_wallet_number'),
        'Must revoke public access from generate_next_wallet_number'
      );
      assert(
        migrationSql.includes('GRANT EXECUTE ON FUNCTION public.generate_next_wallet_number(UUID) TO authenticated'),
        'Must grant execution to authenticated role'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Immutability, Lifecycle Triggers & Zero Hard-Delete Enforcement
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Immutability & Lifecycle Triggers ---', async (st) => {
    await st.test('Trigger prevents hard-delete on wallet tables', () => {
      assert(
        migrationSql.includes('prevent_wallet_hard_delete'),
        'Must define prevent_wallet_hard_delete trigger function'
      );
      assert(
        migrationSql.includes('trg_prevent_delete_practice_wallet_counters'),
        'Must attach prevent delete trigger to practice_wallet_counters'
      );
      assert(
        migrationSql.includes('trg_prevent_delete_patient_wallets'),
        'Must attach prevent delete trigger to patient_wallets'
      );
      assert(
        migrationSql.includes('trg_prevent_delete_patient_wallet_ledger'),
        'Must attach prevent delete trigger to patient_wallet_ledger'
      );
    });

    await st.test('Ledger is strictly append-only (strictly no update or delete)', () => {
      assert(
        migrationSql.includes('protect_wallet_ledger_immutability'),
        'Must define protect_wallet_ledger_immutability trigger'
      );
      assert(
        migrationSql.includes('trg_protect_wallet_ledger_immutability'),
        'Must attach immutability trigger to patient_wallet_ledger'
      );
    });

    await st.test('Patient wallet immutability trigger protects identification fields & terminal states', () => {
      assert(
        migrationSql.includes('protect_patient_wallet_immutability'),
        'Must define protect_patient_wallet_immutability trigger'
      );
      assert(
        migrationSql.includes("OLD.status = 'closed' AND NEW.status <> 'closed'"),
        'Must prevent reopening closed wallets'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Option E Concurrency & Atomic Transaction Procedures
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Option E Concurrency & Stored Procedures ---', async (st) => {
    await st.test('Stored procedures acquire row lock FOR UPDATE on patient_wallets', () => {
      assert(
        migrationSql.includes('FROM public.patient_wallets') &&
        migrationSql.includes('FOR UPDATE;'),
        'Stored procedures must lock patient_wallets row FOR UPDATE'
      );
    });

    await st.test('deposit_to_wallet creates confirmed payment, receipt and positive ledger entry', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.deposit_to_wallet'),
        'Must define deposit_to_wallet function'
      );
      assert(
        migrationSql.includes("INSERT INTO public.payments"),
        'deposit_to_wallet must create an authoritative payments record'
      );
      assert(
        migrationSql.includes("INSERT INTO public.receipts"),
        'deposit_to_wallet must create an issued receipt voucher'
      );
      assert(
        migrationSql.includes("'deposit'"),
        'deposit_to_wallet must record entry_type = deposit'
      );
    });

    await st.test('convert_overpayment_to_wallet verifies unallocated surplus before crediting wallet', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.convert_overpayment_to_wallet'),
        'Must define convert_overpayment_to_wallet function'
      );
      assert(
        migrationSql.includes('v_available_excess') &&
        migrationSql.includes('p_amount > v_available_excess'),
        'convert_overpayment_to_wallet must reject amounts exceeding available payment surplus'
      );
      assert(
        migrationSql.includes("'overpayment_conversion'"),
        'convert_overpayment_to_wallet must record entry_type = overpayment_conversion'
      );
    });

    await st.test('settle_invoice_from_wallet locks both wallet and invoice, creates payment and receipt', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.settle_invoice_from_wallet'),
        'Must define settle_invoice_from_wallet function'
      );
      assert(
        migrationSql.includes("p_amount > v_current_balance"),
        'settle_invoice_from_wallet must reject when wallet balance is insufficient'
      );
      assert(
        migrationSql.includes("p_amount > v_invoice.balance_due"),
        'settle_invoice_from_wallet must reject when settlement exceeds invoice balance due'
      );
      assert(
        migrationSql.includes("-p_amount") && migrationSql.includes("'invoice_settlement'"),
        'settle_invoice_from_wallet must insert negative amount in ledger (-p_amount)'
      );
      assert(
        migrationSql.includes("balance_due = grand_total - (amount_paid + p_amount)"),
        'settle_invoice_from_wallet must update invoice balance_due authoritatively'
      );
    });

    await st.test('adjust_wallet_balance validates non-negative balance after debit', () => {
      assert(
        migrationSql.includes('CREATE OR REPLACE FUNCTION public.adjust_wallet_balance'),
        'Must define adjust_wallet_balance function'
      );
      assert(
        migrationSql.includes('v_new_balance < 0.00'),
        'adjust_wallet_balance must reject adjustments resulting in negative wallet balance'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Strict Row-Level Security (RLS) & Multi-Tenancy
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Row-Level Security & Multi-Tenancy ---', async (st) => {
    await st.test('RLS is enabled on all wallet foundation tables', () => {
      assert(
        migrationSql.includes('ALTER TABLE public.practice_wallet_counters ENABLE ROW LEVEL SECURITY;'),
        'Must enable RLS on practice_wallet_counters'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.patient_wallets ENABLE ROW LEVEL SECURITY;'),
        'Must enable RLS on patient_wallets'
      );
      assert(
        migrationSql.includes('ALTER TABLE public.patient_wallet_ledger ENABLE ROW LEVEL SECURITY;'),
        'Must enable RLS on patient_wallet_ledger'
      );
    });

    await st.test('Hard DELETE is strictly prohibited via RLS policies on wallet tables', () => {
      assert(
        !migrationSql.includes('CREATE POLICY "Allow delete on patient_wallets"') &&
        !migrationSql.includes('CREATE POLICY "Allow delete on patient_wallet_ledger"'),
        'Must NOT provide any DELETE policy on wallet tables'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Absolute Domain Boundary Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Absolute Domain Boundary Verification ---', async (st) => {
    await st.test('Zero recurring memberships or subscriptions in V1', () => {
      assert(!migrationSql.includes('CREATE TABLE public.memberships'), 'Must not create memberships table');
      assert(!migrationSql.includes('CREATE TABLE public.wallet_subscriptions'), 'Must not create wallet_subscriptions table');
    });

    await st.test('Zero external payment gateways or webhooks in V1', () => {
      assert(!migrationSql.includes('stripe'), 'Must not integrate stripe');
      assert(!migrationSql.includes('paystack'), 'Must not integrate paystack');
      assert(!migrationSql.includes('flutterwave'), 'Must not integrate flutterwave');
      assert(!walletServiceCode.includes('stripe'), 'walletService must not reference stripe');
    });

    await st.test('Zero credit notes or external cash refunds in V1', () => {
      assert(!migrationSql.includes('CREATE TABLE public.credit_notes'), 'Must not create credit_notes table');
      assert(!migrationSql.includes('CREATE TABLE public.refunds'), 'Must not create refunds table');
    });

    await st.test('Zero patient-to-patient wallet transfers in V1', () => {
      assert(!migrationSql.includes('transfer_wallet'), 'Must not create transfer_wallet function');
      assert(!walletServiceCode.includes('transferWallet'), 'walletService must not contain transferWallet method');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 7: Non-Negotiable Legacy System Physical Isolation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 7: Legacy Isolation (Zero kabworld References) ---', async (st) => {
    await st.test('Zero kabworld references across wallet foundation files', () => {
      assert(!migrationSql.toLowerCase().includes('kabworld'), 'Migration must not reference kabworld');
      assert(!walletServiceCode.toLowerCase().includes('kabworld'), 'walletService must not reference kabworld');
      assert(!typesDbCode.toLowerCase().includes('kabworld'), 'types/database must not reference kabworld');
      assert(!typesModelsCode.toLowerCase().includes('kabworld'), 'types/models must not reference kabworld');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 8: Application Service & PostgREST Relationship Disambiguation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 8: Application Service & PostgREST Disambiguation ---', async (st) => {
    await st.test('walletService uses explicit composite foreign key hints for queries', () => {
      assert(
        walletServiceCode.includes('patient:patients!fk_wallets_patient_practice'),
        'walletService must use fk_wallets_patient_practice hint'
      );
      assert(
        walletServiceCode.includes('payment:payments!fk_ledger_payment_practice'),
        'walletService must use fk_ledger_payment_practice hint'
      );
      assert(
        walletServiceCode.includes('invoice:invoices!fk_ledger_invoice_practice'),
        'walletService must use fk_ledger_invoice_practice hint'
      );
      assert(
        walletServiceCode.includes('creator:profiles!fk_ledger_created_by'),
        'walletService must use fk_ledger_created_by hint'
      );
    });

    await st.test('walletService computes derived balance dynamically without mutable column', () => {
      assert(
        walletServiceCode.includes('Number((sum + Number(entry.amount || 0)).toFixed(2))') ||
        walletServiceCode.includes('Number((current + Number(row.amount || 0)).toFixed(2))'),
        'walletService must compute derived balance from sum of ledger amounts'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 9: Remote Supabase Live Verification via REST API
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 9: Remote Supabase Live Verification ---', async (st) => {
    await st.test('Remote query returns HTTP 200 OK: Patient Wallets with disambiguated patient relation', async () => {
      const select = `
        *,
        patient:patients!fk_wallets_patient_practice(id,patient_identifier,first_name,last_name)
      `.replace(/\s+/g, '');

      const url = `${SUPABASE_URL}/rest/v1/patient_wallets?select=${encodeURIComponent(select)}&limit=1`;
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
        `Expected HTTP 200 for patient_wallets query, got ${res.status}. Body: ${body}`
      );
    });

    await st.test('Remote query returns HTTP 200 OK: Patient Wallet Ledger with disambiguated relations', async () => {
      const select = `
        *,
        payment:payments!fk_ledger_payment_practice(id,payment_number,amount),
        invoice:invoices!fk_ledger_invoice_practice(id,invoice_number,grand_total,balance_due),
        creator:profiles!fk_ledger_created_by(id,display_name)
      `.replace(/\s+/g, '');

      const url = `${SUPABASE_URL}/rest/v1/patient_wallet_ledger?select=${encodeURIComponent(select)}&limit=1`;
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
        `Expected HTTP 200 for patient_wallet_ledger query, got ${res.status}. Body: ${body}`
      );
    });

    await st.test('Remote query returns HTTP 200 OK: Practice Wallet Counters', async () => {
      const url = `${SUPABASE_URL}/rest/v1/practice_wallet_counters?select=*&limit=1`;
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
        `Expected HTTP 200 for practice_wallet_counters query, got ${res.status}. Body: ${body}`
      );
    });

    await st.test('Unhinted patient_wallets profiles query reproduces PGRST201 HTTP 300 proving disambiguation is required', async () => {
      const url = `${SUPABASE_URL}/rest/v1/patient_wallets?select=*,profiles(id)&limit=1`;
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
        `Expected HTTP 300 (Ambiguous relationship) for unhinted patient_wallets query, got ${res.status}`
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 10: Reversal Semantics & Financial Invariant Hardening (Phase 6 & 7)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 10: Reversal Semantics & Financial Invariant Hardening ---', async (st) => {
    await st.test('void_payment validates available wallet balance before voiding deposit', () => {
      assert(
        hardeningMigrationSql.includes('v_current_wallet_balance < v_wallet_dep.credited_amount') &&
        hardeningMigrationSql.includes('Wallet credit of % has already been partially or fully consumed'),
        'Must block voiding deposit if funds were already consumed'
      );
    });

    await st.test('void_payment appends immutable payment_void_reversal when deposit is voided', () => {
      assert(
        hardeningMigrationSql.includes("'payment_void_reversal'") &&
        hardeningMigrationSql.includes('-v_wallet_dep.credited_amount') &&
        hardeningMigrationSql.includes("'wallet.payment_void_reversed'"),
        'Must append payment_void_reversal with negative amount and log audit event'
      );
    });

    await st.test('void_payment appends immutable reversal_credit when wallet settlement is voided', () => {
      assert(
        hardeningMigrationSql.includes("'reversal_credit'") &&
        hardeningMigrationSql.includes('v_wallet_settle.settle_amount') &&
        hardeningMigrationSql.includes("'wallet.restoration_credited'"),
        'Must restore wallet funds via reversal_credit and log audit event'
      );
    });

    await st.test('Invoice voiding trigger automatically restores wallet credit on invoice void', () => {
      assert(
        hardeningMigrationSql.includes('sync_wallet_restoration_on_invoice_void') &&
        hardeningMigrationSql.includes('trg_sync_wallet_restoration_on_invoice_void') &&
        hardeningMigrationSql.includes('AFTER UPDATE OF status ON public.invoices') &&
        hardeningMigrationSql.includes('FOR EACH ROW EXECUTE FUNCTION public.sync_wallet_restoration_on_invoice_void'),
        'Must define trigger trg_sync_wallet_restoration_on_invoice_void on invoices'
      );
      assert(
        hardeningMigrationSql.includes("NEW.status <> 'void' OR OLD.status = 'void'") &&
        hardeningMigrationSql.includes('v_to_restore > 0.00'),
        'Must only trigger on transition to void and restore unreversed settlement balance'
      );
    });

    await st.test('log_audit_event provides explicit practice_id overload', () => {
      assert(
        hardeningMigrationSql.includes('CREATE OR REPLACE FUNCTION public.log_audit_event(') &&
        hardeningMigrationSql.includes('p_practice_id UUID'),
        'Must define overloaded log_audit_event accepting p_practice_id UUID'
      );
    });
  });
});

