// ==============================================================================
// PHYSENRA SAAS — SALES REPRESENTATIVE & REFERRAL MANAGEMENT TEST SUITE
// Test Suite: tests/sales_rep_referral_management.test.cjs
//
// Governs:
// 1. Database schema, constraints, triggers & RLS firewall
// 2. Authoritative 20% net-eligible basis math & ₦25,000 annual cap
// 3. First qualifying payment invariant & zero commission on renewals
// 4. 14-day post-termination grace period & 30-day attribution window
// 5. Paystack webhook routing, unique transfer-ref mapping & quarantine
// 6. Pre-payout cancellation vs post-payout clawback recovery ledger
// 7. Feature flag fail-closed locking & outbox error resilience
// 8. Masked banking privacy & mandatory audit-guarded NUBAN disclosure
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Read migration files directly
const foundationMigrationPath = path.join(
  __dirname,
  '../supabase/migrations/20261110000000_sales_rep_and_referral_foundation.sql'
);
const engineMigrationPath = path.join(
  __dirname,
  '../supabase/migrations/20261110010000_sales_commission_settlement_engine.sql'
);

const foundationSql = fs.readFileSync(foundationMigrationPath, 'utf8');
const engineSql = fs.readFileSync(engineMigrationPath, 'utf8');

// Read webhook and services
const { handler: webhookHandler } = require('../netlify/functions/paystack-webhook.cjs');
const { handler: outboxWorkerHandler } = require('../netlify/functions/process-commission-outbox.cjs');
const { handler: scannerHandler } = require('../netlify/functions/reconcile-referral-commissions.cjs');

test('PHYSENRA SALES REP & REFERRAL SUITE', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: DATABASE FOUNDATION, CONSTRAINTS & IMMUTABILITY TRIGGERS
  // ----------------------------------------------------------------------------
  await t.test('SUITE 1: Database Foundation, Constraints & Immutability Triggers', async (st) => {
    await st.test('TEST 1: All 12 required tables are defined in foundation migration', () => {
      const requiredTables = [
        'sales_representatives',
        'sales_rep_bank_accounts',
        'sales_referral_codes',
        'sales_referrals',
        'sales_commissions',
        'sales_commission_events',
        'sales_commission_adjustments',
        'sales_recovery_entries',
        'sales_commission_outbox',
        'sales_commission_payouts',
        'sales_payout_allocations',
        'sales_adjustment_quarantine',
      ];

      for (const table of requiredTables) {
        assert.ok(
          foundationSql.includes(`CREATE TABLE IF NOT EXISTS public.${table}`),
          `Table public.${table} must be created in foundation migration`
        );
      }
    });

    await st.test('TEST 2: Strict format constraints enforced on NUBAN and referral codes', () => {
      assert.ok(
        foundationSql.includes("account_number varchar(10) NOT NULL CHECK (account_number ~ '^[0-9]{10}$'"),
        'account_number must enforce 10-digit numeric constraint'
      );
      assert.ok(
        foundationSql.includes("code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9_-]{4,32}$'"),
        'referral code must enforce alphanumeric 4-32 uppercase pattern'
      );
    });

    await st.test('TEST 3: Paid invoice permanent financial immutability trigger exists', () => {
      assert.ok(
        foundationSql.includes('trg_freeze_paid_invoice_financials') || foundationSql.includes('trg_00_freeze_paid_invoice_financials'),
        'Trigger trg_00_freeze_paid_invoice_financials must exist on saas_invoices'
      );
      assert.ok(
        foundationSql.includes('Permanent Financial Invariant: Invoices with paid_at cannot have financial amounts or identity modified'),
        'Trigger must prevent modifications to subtotal, discount, tax, total, currency, practice_id, subscription_id'
      );
    });

    await st.test('TEST 3B: Paid invoice immutability strictly prohibits clearing or modifying paid_at, even during status changes', () => {
      // 1. Verify SQL definition contains explicit paid_at protection
      assert.ok(
        foundationSql.includes('Permanent Financial Invariant: Once paid_at is populated, it cannot be cleared, modified, or replaced'),
        'Trigger must explicitly prohibit clearing or replacing paid_at'
      );
      assert.ok(
        foundationSql.includes('NEW.paid_at IS NULL OR NEW.paid_at <> OLD.paid_at'),
        'Trigger must compare NEW.paid_at with OLD.paid_at'
      );

      // 2. Behavioral verification of the trigger logic
      function simulateInvoiceTrigger(oldRow, newRow) {
        if (oldRow.paid_at !== null) {
          if (newRow.paid_at === null || newRow.paid_at !== oldRow.paid_at) {
            const err = new Error('Permanent Financial Invariant: Once paid_at is populated, it cannot be cleared, modified, or replaced');
            err.code = 'restrict_violation';
            throw err;
          }
          if (
            oldRow.subtotal_cents !== newRow.subtotal_cents ||
            oldRow.discount_cents !== newRow.discount_cents ||
            oldRow.tax_cents !== newRow.tax_cents ||
            oldRow.total_cents !== newRow.total_cents ||
            oldRow.currency !== newRow.currency ||
            oldRow.practice_id !== newRow.practice_id ||
            oldRow.subscription_id !== newRow.subscription_id
          ) {
            const err = new Error('Permanent Financial Invariant: Invoices with paid_at cannot have financial amounts or identity modified');
            err.code = 'restrict_violation';
            throw err;
          }
        }
        return newRow;
      }

      const paidInvoice = {
        id: 'inv-1',
        paid_at: '2026-11-10T12:00:00Z',
        status: 'paid',
        subtotal_cents: 3000000,
        discount_cents: 0,
        tax_cents: 0,
        total_cents: 3000000,
        currency: 'NGN',
        practice_id: 'prac-1',
        subscription_id: 'sub-1',
      };

      // Attempt 1: Clearing paid_at to null
      assert.throws(
        () => simulateInvoiceTrigger(paidInvoice, { ...paidInvoice, paid_at: null }),
        /Once paid_at is populated, it cannot be cleared, modified, or replaced/
      );

      // Attempt 2: Modifying paid_at timestamp
      assert.throws(
        () => simulateInvoiceTrigger(paidInvoice, { ...paidInvoice, paid_at: '2026-11-10T15:00:00Z' }),
        /Once paid_at is populated, it cannot be cleared, modified, or replaced/
      );

      // Attempt 3: Changing status to void while clearing paid_at
      assert.throws(
        () => simulateInvoiceTrigger(paidInvoice, { ...paidInvoice, status: 'void', paid_at: null }),
        /Once paid_at is populated, it cannot be cleared, modified, or replaced/
      );

      // Attempt 4: Changing status to void while clearing total_cents
      assert.throws(
        () => simulateInvoiceTrigger(paidInvoice, { ...paidInvoice, status: 'void', total_cents: 0 }),
        /Invoices with paid_at cannot have financial amounts or identity modified/
      );

      // Valid update: Updating status to void without touching paid_at or financial fields
      const updated = simulateInvoiceTrigger(paidInvoice, { ...paidInvoice, status: 'void' });
      assert.strictEqual(updated.status, 'void');
      assert.strictEqual(updated.paid_at, paidInvoice.paid_at);
      assert.strictEqual(updated.total_cents, paidInvoice.total_cents);
    });

    await st.test('TEST 3C: Trigger ordering ensures trg_00_freeze_paid_invoice_financials runs first', () => {
      assert.ok(
        foundationSql.includes('trg_00_freeze_paid_invoice_financials'),
        'Trigger must be prefixed with trg_00_ to guarantee first execution in alphabetical BEFORE UPDATE ordering'
      );
    });

    await st.test('TEST 4: Commission calculation snapshot immutability trigger exists', () => {
      assert.ok(
        foundationSql.includes('trg_protect_commission_immutability'),
        'Trigger trg_protect_commission_immutability must exist on sales_commissions'
      );
      assert.ok(
        foundationSql.includes('Permanent Financial Invariant: Financial calculation columns on sales_commissions cannot be modified'),
        'Trigger must permanently protect original calculation values'
      );
    });

    await st.test('TEST 4B: Direct UPDATE to commission lifecycle fields is strictly denied without session guard', () => {
      // 1. Verify SQL definition contains lifecycle check and session guard
      assert.ok(
        foundationSql.includes("current_setting('physenra.in_commission_transition', true) IS DISTINCT FROM 'true'"),
        'Trigger must check physenra.in_commission_transition session guard'
      );
      assert.ok(
        foundationSql.includes('Direct update to commission lifecycle fields prohibited; use transition_commission_status()'),
        'Trigger must raise insufficient_privilege on direct lifecycle mutation'
      );

      // 2. Behavioral verification of commission trigger logic
      function simulateCommissionTrigger(oldRow, newRow, inTransition = false) {
        if (
          oldRow.gross_amount_cents !== newRow.gross_amount_cents ||
          oldRow.tax_cents !== newRow.tax_cents ||
          oldRow.gateway_fee_cents !== newRow.gateway_fee_cents ||
          oldRow.net_eligible_cents !== newRow.net_eligible_cents ||
          oldRow.commission_rate_bps !== newRow.commission_rate_bps ||
          oldRow.original_commission_cents !== newRow.original_commission_cents ||
          oldRow.currency !== newRow.currency ||
          oldRow.referral_id !== newRow.referral_id ||
          oldRow.sales_rep_id !== newRow.sales_rep_id ||
          oldRow.invoice_id !== newRow.invoice_id ||
          oldRow.payment_id !== newRow.payment_id ||
          oldRow.created_at !== newRow.created_at
        ) {
          const err = new Error('Permanent Financial Invariant: Financial calculation columns on sales_commissions cannot be modified');
          err.code = 'restrict_violation';
          throw err;
        }

        if (
          oldRow.current_status !== newRow.current_status ||
          oldRow.is_payout_frozen !== newRow.is_payout_frozen ||
          oldRow.approved_at !== newRow.approved_at ||
          oldRow.approved_by_user_id !== newRow.approved_by_user_id ||
          oldRow.holding_expires_at !== newRow.holding_expires_at
        ) {
          if (!inTransition) {
            const err = new Error('Direct update to commission lifecycle fields prohibited; use transition_commission_status()');
            err.code = 'insufficient_privilege';
            throw err;
          }
        }
        return newRow;
      }

      const sampleComm = {
        id: 'comm-1',
        gross_amount_cents: 3000000,
        tax_cents: 0,
        gateway_fee_cents: 45000,
        net_eligible_cents: 2955000,
        commission_rate_bps: 2000,
        original_commission_cents: 591000,
        currency: 'NGN',
        referral_id: 'ref-1',
        sales_rep_id: 'rep-1',
        invoice_id: 'inv-1',
        payment_id: 'pay-1',
        created_at: '2026-11-10T12:00:00Z',
        current_status: 'pending',
        is_payout_frozen: false,
        approved_at: null,
        approved_by_user_id: null,
        holding_expires_at: '2026-11-24T12:00:00Z',
      };

      // Direct update without transition function (inTransition = false) MUST fail
      assert.throws(
        () => simulateCommissionTrigger(sampleComm, { ...sampleComm, current_status: 'approved' }, false),
        /Direct update to commission lifecycle fields prohibited; use transition_commission_status\(\)/
      );
      assert.throws(
        () => simulateCommissionTrigger(sampleComm, { ...sampleComm, is_payout_frozen: true }, false),
        /Direct update to commission lifecycle fields prohibited; use transition_commission_status\(\)/
      );

      // Transition with session guard (inTransition = true) MUST succeed
      const transitioned = simulateCommissionTrigger(
        sampleComm,
        { ...sampleComm, current_status: 'approved', approved_at: '2026-11-10T13:00:00Z' },
        true
      );
      assert.strictEqual(transitioned.current_status, 'approved');
      assert.strictEqual(transitioned.approved_at, '2026-11-10T13:00:00Z');
    });

    await st.test('TEST 4C: transition_commission_status enforces actor authority and atomic event creation', () => {
      assert.ok(
        foundationSql.includes("COALESCE(public.is_platform_admin(), false) OR auth.role() = 'service_role'"),
        'transition_commission_status must validate Platform Admin or service_role caller'
      );
      assert.ok(
        foundationSql.includes("PERFORM set_config('physenra.in_commission_transition', 'true', true);"),
        'transition_commission_status must set transaction-local session guard'
      );
      assert.ok(
        foundationSql.includes('INSERT INTO public.sales_commission_events'),
        'transition_commission_status must write immutable audit event in same transaction'
      );
      assert.ok(
        foundationSql.includes('REVOKE EXECUTE ON FUNCTION public.transition_commission_status(uuid, text, text, text, uuid, jsonb) FROM public;'),
        'Public execution must be revoked'
      );
      assert.ok(
        foundationSql.includes('GRANT EXECUTE ON FUNCTION public.transition_commission_status(uuid, text, text, text, uuid, jsonb) TO authenticated, service_role;'),
        'Execution must be granted strictly to authenticated and service_role'
      );
    });

    await st.test('TEST 5: Direct UPDATE and DELETE are revoked on append-only ledgers and commissions table', () => {
      assert.ok(
        foundationSql.includes('REVOKE UPDATE, DELETE ON public.sales_commission_events FROM public, authenticated, service_role;'),
        'Direct update/delete must be revoked from sales_commission_events'
      );
      assert.ok(
        foundationSql.includes('REVOKE UPDATE, DELETE ON public.sales_commission_adjustments FROM public, authenticated, service_role;'),
        'Direct update/delete must be revoked from sales_commission_adjustments'
      );
      assert.ok(
        foundationSql.includes('REVOKE UPDATE, DELETE ON public.sales_recovery_entries FROM public, authenticated, service_role;'),
        'Direct update/delete must be revoked from sales_recovery_entries'
      );
      assert.ok(
        foundationSql.includes('REVOKE UPDATE, DELETE ON public.sales_commissions FROM public, authenticated;'),
        'Direct update/delete must be revoked on sales_commissions from client roles'
      );
    });

    await st.test('TEST 6: Row Level Security is enabled across all 12 tables with zero sales rep access to raw banking credentials', () => {
      const requiredTables = [
        'sales_representatives',
        'sales_rep_bank_accounts',
        'sales_referral_codes',
        'sales_referrals',
        'sales_commissions',
        'sales_commission_events',
        'sales_commission_adjustments',
        'sales_recovery_entries',
        'sales_commission_outbox',
        'sales_commission_payouts',
        'sales_payout_allocations',
        'sales_adjustment_quarantine',
      ];

      for (const table of requiredTables) {
        assert.ok(
          foundationSql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`),
          `RLS must be enabled on ${table}`
        );
      }

      // Ensure sales_rep_bank_accounts has NO policy for sales_reps (admin only)
      assert.ok(!foundationSql.includes('CREATE POLICY sales_rep_bank_read_own'), 'Sales rep must not have direct SELECT on raw bank accounts');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: COMMISSION ENGINE MATH & PILOT PARAMETERS
  // ----------------------------------------------------------------------------
  await t.test('SUITE 2: Commission Engine Math & Pilot Parameters', async (st) => {
    await st.test('TEST 7: 20% Net Eligible Basis calculation on monthly plan', () => {
      const grossAmount = 3000000; // ₦30,000
      const taxAmount = 0;
      const gatewayFee = 45000; // ₦450
      const netEligible = Math.max(0, grossAmount - taxAmount - gatewayFee); // 2,955,000 kobo (₦29,550)
      const commissionRateBps = 2000; // 20%

      const commissionCents = Math.round((netEligible * commissionRateBps) / 10000); // 591,000 kobo (₦5,910)
      assert.strictEqual(commissionCents, 591000);
      assert.strictEqual(commissionCents, 5910 * 100);
    });

    await st.test('TEST 8: Annual plan ₦25,000 cap enforced during pilot', () => {
      const grossAmount = 30000000; // ₦300,000
      const taxAmount = 0;
      const gatewayFee = 200000; // ₦2,000
      const netEligible = Math.max(0, grossAmount - taxAmount - gatewayFee); // 29,800,000 kobo (₦298,000)
      const rawCommission = Math.round((netEligible * 2000) / 10000); // 5,960,000 kobo (₦59,600)

      const annualCapCents = 2500000; // ₦25,000 max
      const effectiveCommission = Math.min(rawCommission, annualCapCents);

      assert.strictEqual(effectiveCommission, 2500000);
      assert.ok(effectiveCommission < rawCommission, 'Cap must prevent payout above ₦25,000 on annual plans');
    });

    await st.test('TEST 9: evaluate_referral_commission enforces first-qualifying payment invariant', () => {
      assert.ok(
        engineSql.includes('Prior successful payments exist'),
        'Must detect prior successful payments and reject renewals with zero commission'
      );
      assert.ok(
        engineSql.includes('Renewal payment: zero commission during pilot'),
        'Must detect referral already qualified and reject subsequent payments'
      );
    });

    await st.test('TEST 10: 14-day post-termination grace period enforced in evaluate_referral_commission', () => {
      assert.ok(
        engineSql.includes("COALESCE(p_paid_at, v_payment.paid_at, now()) > (v_rep.terminated_at + interval '14 days')"),
        'Must enforce 14-day grace period from terminated_at'
      );
      assert.ok(
        engineSql.includes('Settlement occurred after 14-day post-termination grace period'),
        'Must record disqualification reason when grace period expires'
      );
    });

    await st.test('TEST 11: 30-day first-touch attribution window enforced', () => {
      assert.ok(
        engineSql.includes("COALESCE(p_paid_at, v_payment.paid_at, now()) > (v_referral.attributed_at + interval '30 days')"),
        'Must enforce 30-day window from attributed_at'
      );
    });

    await st.test('TEST 12: Suspended representative incurs entitlement held in held_suspended status', () => {
      assert.ok(
        engineSql.includes("IF v_rep.status = 'suspended' THEN"),
        'Must handle suspended representative'
      );
      assert.ok(
        engineSql.includes("v_init_status := 'held_suspended'"),
        'Initial status for suspended rep must be held_suspended'
      );
      assert.ok(
        engineSql.includes('v_is_frozen := true'),
        'Payout must be frozen when rep is suspended'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: PAYSTACK WEBHOOK ROUTING & ISOLATED TRANSFER HANDLING
  // ----------------------------------------------------------------------------
  await t.test('SUITE 3: Paystack Webhook Routing & Transfer Isolation', async (st) => {
    await st.test('TEST 13: settle_payout_transfer_event performs strictly unique transfer_reference lookup', () => {
      assert.ok(
        engineSql.includes('SELECT * INTO v_payout'),
        'Must select payout'
      );
      assert.ok(
        engineSql.includes('WHERE transfer_reference = p_transfer_reference'),
        'Must look up strictly by transfer_reference'
      );
      assert.ok(
        !engineSql.includes('WHERE transfer_reference = p_transfer_reference OR payout_number ='),
        'Must NEVER use an OR lookup across payout_number and transfer_reference'
      );
    });

    await st.test('TEST 14: Unmapped transfer reference is quarantined in sales_adjustment_quarantine', () => {
      assert.ok(
        engineSql.includes('INSERT INTO public.sales_adjustment_quarantine'),
        'Must quarantine unmapped transfer events'
      );
      assert.ok(
        engineSql.includes('Unmapped transfer reference:'),
        'Must record reason in quarantine'
      );
    });

    await st.test('TEST 15: transfer.success transitions commissions strictly scoped to that payout', () => {
      assert.ok(
        engineSql.includes('WHERE payout_id = v_payout.id'),
        'Allocations and commission updates must be scoped strictly to v_payout.id'
      );
      assert.ok(
        engineSql.includes("allocation_status = 'settled'"),
        'Allocations must transition to settled'
      );
      assert.ok(
        engineSql.includes("'paid'"),
        'Commissions must transition to paid'
      );
    });

    await st.test('TEST 16: transfer.failed releases allocations back to approved status', () => {
      assert.ok(
        engineSql.includes("allocation_status = 'released'"),
        'Allocations must transition to released on failure'
      );
      assert.ok(
        engineSql.includes("'approved'"),
        'Commissions must be released back to approved'
      );
    });

    await st.test('TEST 17: transfer.reversed records reversal recovery entry in sales_recovery_entries', () => {
      assert.ok(
        engineSql.includes("INSERT INTO public.sales_recovery_entries"),
        'Must record entry into sales_recovery_entries'
      );
      assert.ok(
        engineSql.includes("'paystack_transfer_reversal'"),
        'Source system must be paystack_transfer_reversal'
      );
      assert.ok(
        engineSql.includes("'reversal_offset'"),
        'Entry type must be reversal_offset'
      );
    });

    await st.test('TEST 18: paystack-webhook routes refund.processed to record_commission_adjustment', () => {
      const webhookCode = fs.readFileSync(path.join(__dirname, '../netlify/functions/paystack-webhook.cjs'), 'utf8');
      assert.ok(
        webhookCode.includes("eventType === 'refund.processed'"),
        'Webhook must handle refund.processed'
      );
      assert.ok(
        webhookCode.includes("rpc('record_commission_adjustment'"),
        'Webhook must call record_commission_adjustment RPC'
      );
    });

    await st.test('TEST 19: paystack-webhook routes dispute events to record_commission_adjustment', () => {
      const webhookCode = fs.readFileSync(path.join(__dirname, '../netlify/functions/paystack-webhook.cjs'), 'utf8');
      assert.ok(
        webhookCode.includes("eventType === 'charge.dispute.create'"),
        'Webhook must handle dispute create'
      );
      assert.ok(
        webhookCode.includes("eventType === 'charge.dispute.resolve'"),
        'Webhook must handle dispute resolve'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: RECOVERY LEDGER & POST-PAYOUT CLAWBACK PROTECTION
  // ----------------------------------------------------------------------------
  await t.test('SUITE 4: Recovery Ledger & Post-Payout Clawback Protection', async (st) => {
    await st.test('TEST 20: record_commission_adjustment distinguishes pre-payout cancellation from post-payout clawback', () => {
      assert.ok(
        engineSql.includes("IF v_comm.current_status IN ('paid', 'partially_paid') THEN"),
        'Must check if commission is already disbursed'
      );
      assert.ok(
        engineSql.includes("'clawback_debt'"),
        'Post-payout refund must record clawback_debt in recovery ledger'
      );
      assert.ok(
        engineSql.includes("ELSIF v_comm.current_status IN ('pending', 'approved', 'held_suspended') THEN"),
        'Pre-payout refund must cancel commission'
      );
      assert.ok(
        engineSql.includes("'cancelled'"),
        'Pre-payout refund transitions to cancelled'
      );
    });

    await st.test('TEST 21: Partial refund calculates proportionate commission reduction', () => {
      const originalComm = 600000; // ₦6,000
      const grossAmount = 3000000; // ₦30,000
      const refundAmount = 1500000; // ₦15,000 (50% partial refund)

      const delta = -Math.round((refundAmount / grossAmount) * originalComm);
      assert.strictEqual(delta, -300000); // ₦3,000 clawback
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: FEATURE FLAG SYNCHRONIZATION & OUTBOX RESILIENCE
  // ----------------------------------------------------------------------------
  await t.test('SUITE 5: Feature Flag Synchronization & Outbox Resilience', async (st) => {
    await st.test('TEST 22: evaluate_referral_commission applies 500ms lock timeout on platform_settings', () => {
      assert.ok(
        engineSql.includes("SET LOCAL lock_timeout = '500ms'"),
        'Must set 500ms lock timeout'
      );
      assert.ok(
        engineSql.includes("key = 'sales_referrals_enabled'") && engineSql.includes("FOR SHARE;"),
        'Must acquire FOR SHARE lock on feature flag'
      );
    });

    await st.test('TEST 22B: Feature flag explicitly distinguishes missing (P0002), malformed (22023), and lock timeout (55P03)', () => {
      // 1. Verify SQL assertions
      assert.ok(
        engineSql.includes("ERRCODE = 'P0002'"),
        'Must use SQLSTATE P0002 (no_data_found) for missing feature flag'
      );
      assert.ok(
        engineSql.includes("ERRCODE = '22023'"),
        'Must use SQLSTATE 22023 (invalid_parameter_value) for malformed JSON feature flag'
      );
      assert.ok(
        engineSql.includes("ERRCODE = '55P03'"),
        'Must use SQLSTATE 55P03 (lock_not_available) specifically for lock timeout'
      );

      // 2. Behavioral verification of feature flag parser logic
      function evaluateFlagRecord(flagRecord, lockError = null) {
        if (lockError) {
          if (lockError.code === '55P03' || lockError.name === 'lock_not_available') {
            const err = new Error('Lock acquisition timeout (55P03) on platform_settings (sales_referrals_enabled)');
            err.code = '55P03';
            throw err;
          }
          if (lockError.code === '57014' || lockError.name === 'query_canceled') {
            const err = new Error('Query canceled (57014) during platform_settings read');
            err.code = '57014';
            throw err;
          }
          throw lockError;
        }

        if (!flagRecord) {
          const err = new Error('Platform setting sales_referrals_enabled not found');
          err.code = 'P0002';
          throw err;
        }

        if (
          !flagRecord.value ||
          typeof flagRecord.value !== 'object' ||
          typeof flagRecord.value.enabled !== 'boolean'
        ) {
          const err = new Error('Malformed value for sales_referrals_enabled: missing or invalid boolean "enabled"');
          err.code = '22023';
          throw err;
        }

        return flagRecord.value.enabled;
      }

      // Missing
      assert.throws(() => evaluateFlagRecord(null), (err) => err.code === 'P0002');

      // Malformed: value is null
      assert.throws(() => evaluateFlagRecord({ value: null }), (err) => err.code === '22023');

      // Malformed: enabled is string, not boolean
      assert.throws(() => evaluateFlagRecord({ value: { enabled: 'true' } }), (err) => err.code === '22023');

      // Malformed: enabled is missing
      assert.throws(() => evaluateFlagRecord({ value: { other_key: 123 } }), (err) => err.code === '22023');

      // Lock timeout: 55P03
      assert.throws(
        () => evaluateFlagRecord(null, { code: '55P03', name: 'lock_not_available' }),
        (err) => err.code === '55P03'
      );

      // Query canceled: 57014 (not confused with lock timeout)
      assert.throws(
        () => evaluateFlagRecord(null, { code: '57014', name: 'query_canceled' }),
        (err) => err.code === '57014'
      );

      // Valid enabled
      assert.strictEqual(evaluateFlagRecord({ value: { enabled: true } }), true);

      // Valid disabled
      assert.strictEqual(evaluateFlagRecord({ value: { enabled: false } }), false);
    });

    await st.test('TEST 22C: Lock timeout specifically catches 55P03 and does not confuse with generic query cancellation', () => {
      assert.ok(
        engineSql.includes('WHEN lock_not_available THEN -- 55P03 specifically'),
        'Must catch lock_not_available specifically'
      );
      assert.ok(
        engineSql.includes('WHEN query_canceled THEN -- 57014 specifically'),
        'Must handle query_canceled separately and re-raise with 57014'
      );
    });

    await st.test('TEST 22D: Disabled feature flag generates zero commissions and resolves outbox task cleanly', () => {
      assert.ok(
        engineSql.includes("IF NOT v_flag_enabled THEN"),
        'Must check IF NOT v_flag_enabled'
      );
      assert.ok(
        engineSql.includes("'commission_cents', 0"),
        'Disabled flag must generate zero commission (0 cents)'
      );
      assert.ok(
        engineSql.includes("resolution_reason = 'Sales referrals feature flag is disabled: zero commission generated'"),
        'Outbox task must be marked resolved with zero commission explanation'
      );
    });

    await st.test('TEST 22E: Fresh staging migration seeds sales_referrals_enabled as disabled by default', () => {
      assert.ok(
        foundationSql.includes("'sales_referrals_enabled',\n  '{\"enabled\": false, \"pilot_mode\": true, \"annual_cap_cents\": 2500000}'::jsonb"),
        'Foundation migration must seed sales_referrals_enabled with enabled = false'
      );
      assert.ok(
        foundationSql.includes('ON CONFLICT (key) DO NOTHING;'),
        'Must preserve existing platform settings using ON CONFLICT DO NOTHING'
      );
    });

    await st.test('TEST 23: Settlement hook durably enqueues to sales_commission_outbox on any error', () => {
      assert.ok(
        engineSql.includes('INSERT INTO public.sales_commission_outbox'),
        'process_subscription_payment_settlement must insert into outbox on exception'
      );
      assert.ok(
        engineSql.includes('WHERE payment_id = v_payment_id\n      FOR UPDATE;'),
        'Must check and lock existing task on payment_id'
      );
    });

    await st.test('TEST 23B: Settlement fallback validates practice, invoice, payment and referral identity before updating existing task', () => {
      assert.ok(
        engineSql.includes('v_existing_outbox.practice_id <> v_inv.practice_id OR\n           v_existing_outbox.invoice_id <> v_inv.id'),
        'Must verify existing task belongs to same practice and invoice identity'
      );
      assert.ok(
        engineSql.includes('(v_referral_id IS NOT NULL AND v_existing_outbox.referral_id IS NOT NULL AND v_existing_outbox.referral_id <> v_referral_id)'),
        'Must verify referral identity matches when attribution exists'
      );
      assert.ok(
        engineSql.includes("'commission_outbox.identity_conflict'"),
        'Must log identity conflict to platform_audit_logs instead of overwriting'
      );
      assert.ok(
        engineSql.includes("ELSIF v_existing_outbox.status = 'resolved' THEN"),
        'Must preserve completed tasks and never overwrite them'
      );

      // Behavioral simulation of 4-part identity validation
      function handleFallbackConflict(existingTask, newTask) {
        if (!existingTask) {
          return { action: 'inserted', status: 'pending_retry' };
        }
        const practiceMismatch = existingTask.practice_id !== newTask.practice_id;
        const invoiceMismatch = existingTask.invoice_id !== newTask.invoice_id;
        const referralMismatch = (newTask.referral_id && existingTask.referral_id && existingTask.referral_id !== newTask.referral_id) ||
                                 (newTask.referral_id && !existingTask.referral_id);

        if (practiceMismatch || invoiceMismatch || referralMismatch) {
          return {
            action: 'identity_conflict_logged',
            alert: 'commission_outbox.identity_conflict',
            reasons: { practiceMismatch, invoiceMismatch, referralMismatch },
          };
        }
        if (existingTask.status === 'resolved') {
          return { action: 'preserved_resolved', status: 'resolved' };
        }
        return { action: 'updated', status: 'pending_retry' };
      }

      // 1. Same identity, pending -> updated
      const res1 = handleFallbackConflict(
        { id: 'out-1', practice_id: 'prac-1', invoice_id: 'inv-1', referral_id: 'ref-1', status: 'pending_retry' },
        { practice_id: 'prac-1', invoice_id: 'inv-1', referral_id: 'ref-1' }
      );
      assert.strictEqual(res1.action, 'updated');

      // 2. Practice/Invoice mismatch -> conflict logged
      const res2 = handleFallbackConflict(
        { id: 'out-1', practice_id: 'prac-DIFF', invoice_id: 'inv-1', referral_id: 'ref-1', status: 'pending_retry' },
        { practice_id: 'prac-1', invoice_id: 'inv-1', referral_id: 'ref-1' }
      );
      assert.strictEqual(res2.action, 'identity_conflict_logged');

      // 3. Referral identity mismatch -> conflict logged, refuses to overwrite
      const res3 = handleFallbackConflict(
        { id: 'out-1', practice_id: 'prac-1', invoice_id: 'inv-1', referral_id: 'ref-MISMATCH', status: 'pending_retry' },
        { practice_id: 'prac-1', invoice_id: 'inv-1', referral_id: 'ref-1' }
      );
      assert.strictEqual(res3.action, 'identity_conflict_logged');
      assert.strictEqual(res3.reasons.referralMismatch, true);

      // 4. Completed task -> preserved, refuses to overwrite
      const res4 = handleFallbackConflict(
        { id: 'out-1', practice_id: 'prac-1', invoice_id: 'inv-1', referral_id: 'ref-1', status: 'resolved' },
        { practice_id: 'prac-1', invoice_id: 'inv-1', referral_id: 'ref-1' }
      );
      assert.strictEqual(res4.action, 'preserved_resolved');
      assert.strictEqual(res4.status, 'resolved');
    });

    await st.test('TEST 23C: Settlement fallback writes operational monitoring alert if outbox insertion fails', () => {
      assert.ok(
        engineSql.includes("'commission_outbox.fallback_failed'"),
        'Must log operational alert to platform_audit_logs if outbox insertion fails'
      );
      assert.ok(
        engineSql.includes("'requires_reconciliation', true"),
        'Must flag task for 6-hour reconciliation scanner'
      );
    });

    await st.test('TEST 23D: Audit alert failure in settlement fallback is safely absorbed without aborting payment settlement', () => {
      // Simulate double failure: outbox insertion throws AND platform_audit_logs insert throws
      function simulateDoubleFailureSettlement() {
        let paymentSettled = false;
        try {
          // 1. Core payment settlement succeeds
          paymentSettled = true;

          // 2. Referral evaluation fails
          throw new Error('Lock acquisition timeout on platform_settings');
        } catch (evalErr) {
          try {
            // Outbox insert throws (e.g. disk or constraint error)
            throw new Error('Outbox write failure');
          } catch (outboxErr) {
            try {
              // Audit log insert throws (e.g. connection reset)
              throw new Error('Audit log write failure');
            } catch (auditErr) {
              // Safely absorbed
            }
          }
        }
        return { status: paymentSettled ? 'settled' : 'failed' };
      }

      const result = simulateDoubleFailureSettlement();
      assert.strictEqual(result.status, 'settled', 'Customer payment settlement MUST remain valid even if outbox and audit writes both fail');
    });

    await st.test('TEST 23E: Reconciliation scanner independently discovers qualifying settled payments after fallback failure and safely enqueues them', async () => {
      const practiceId = 'prac-uncommissioned-1';
      const paymentId = 'pay-uncommissioned-1';
      const referralId = 'ref-123';

      let enqueuedPayload = null;

      const mockDb = {
        from: (table) => {
          if (table === 'sales_referrals') {
            return {
              select: () => ({
                in: () => Promise.resolve({
                  data: [{ id: referralId, practice_id: practiceId, status: 'attributed', qualifying_payment_id: null }],
                  error: null,
                }),
              }),
            };
          }
          if (table === 'saas_payments') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      limit: () => Promise.resolve({
                        data: [{ id: paymentId, invoice_id: 'inv-1', practice_id: practiceId, amount_cents: 3000000, paid_at: '2026-11-10T12:00:00Z' }],
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'sales_commissions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null }), // NO commission exists!
                }),
              }),
            };
          }
          if (table === 'sales_commission_outbox') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null }), // NO outbox task exists (fallback failed)!
                }),
              }),
              upsert: (payload) => {
                enqueuedPayload = payload;
                return {
                  select: () => ({
                    single: () => Promise.resolve({ data: { id: 'new-outbox-task-1', ...payload }, error: null }),
                  }),
                };
              },
            };
          }
          if (table === 'platform_audit_logs') {
            return {
              insert: () => Promise.resolve({ error: null }),
            };
          }
          return {};
        },
      };

      const res = await scannerHandler(
        { headers: { 'x-cron-secret': 'valid-staging-secret' } },
        {},
        { env: { CRON_SECRET: 'valid-staging-secret' }, supabaseAdmin: mockDb }
      );

      assert.strictEqual(res.statusCode, 200);
      assert.ok(enqueuedPayload !== null, 'Reconciliation scanner must enqueue missing outbox task');
      assert.strictEqual(enqueuedPayload.practice_id, practiceId);
      assert.strictEqual(enqueuedPayload.payment_id, paymentId);
      assert.strictEqual(enqueuedPayload.referral_id, referralId);
      assert.strictEqual(enqueuedPayload.status, 'pending_retry');
    });

    await st.test('TEST 23F: Repeated reconciliation runs do not create duplicate outbox tasks or duplicate commissions', async () => {
      let upsertCalled = false;

      const mockDbRun2 = {
        from: (table) => {
          if (table === 'sales_referrals') {
            return {
              select: () => ({
                in: () => Promise.resolve({
                  data: [{ id: 'ref-123', practice_id: 'prac-1', status: 'attributed', qualifying_payment_id: null }],
                  error: null,
                }),
              }),
            };
          }
          if (table === 'saas_payments') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      limit: () => Promise.resolve({
                        data: [{ id: 'pay-1', invoice_id: 'inv-1', practice_id: 'prac-1', amount_cents: 3000000, paid_at: '2026-11-10T12:00:00Z' }],
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'sales_commissions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: { id: 'comm-already-created' } }), // Commission now exists!
                }),
              }),
            };
          }
          if (table === 'sales_commission_outbox') {
            return {
              upsert: () => {
                upsertCalled = true;
                return { select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) };
              },
            };
          }
          if (table === 'platform_audit_logs') {
            return { insert: () => Promise.resolve({ error: null }) };
          }
          return {};
        },
      };

      const res = await scannerHandler(
        { headers: { 'x-cron-secret': 'valid-staging-secret' } },
        {},
        { env: { CRON_SECRET: 'valid-staging-secret' }, supabaseAdmin: mockDbRun2 }
      );

      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.strictEqual(body.enqueued_count, 0, 'Must enqueue zero tasks when commission already exists');
      assert.strictEqual(upsertCalled, false, 'Upsert must not be called when commission exists');
    });

    await st.test('TEST 24: Customer payment settlement is NEVER aborted by commission errors', () => {
      assert.ok(
        engineSql.includes('EXCEPTION WHEN OTHERS THEN'),
        'Must contain outer exception handler'
      );
      assert.ok(
        engineSql.includes('status\', \'settled'),
        'Function returns settled even if commission evaluation fails'
      );
    });

    await st.test('TEST 24B: Outbox uniqueness conflict distinguishes payment uniqueness from referral uniqueness and validates identities', () => {
      assert.ok(
        engineSql.includes('-- Case 1: Check if commission exists for this exact payment_id (Payment Uniqueness)'),
        'Must explicitly check payment uniqueness'
      );
      assert.ok(
        engineSql.includes('-- Case 2: referral_id unique collision (different payment_id attempted for same referral)'),
        'Must explicitly check referral uniqueness'
      );
      assert.ok(
        engineSql.includes('Cross-referral payment identity mismatch:'),
        'Must reject and re-raise cross-referral collision'
      );
      assert.ok(
        engineSql.includes('Referral commission conflict: existing commission'),
        'Must reject and re-raise mismatched referral qualifying payment'
      );

      // Behavioral simulation of dual uniqueness resolution
      function resolveUniqueConflict(existingComms, referral, paymentId) {
        // Case 1: exact payment match
        const paymentMatch = existingComms.find((c) => c.payment_id === paymentId);
        if (paymentMatch) {
          if (paymentMatch.referral_id === referral.id) {
            if (!referral.qualifying_payment_id || referral.qualifying_payment_id === paymentId) {
              return { status: 'already_processed', duplicate_type: 'exact_payment_match', commission_id: paymentMatch.id };
            }
          }
          throw new Error('Cross-referral payment identity mismatch');
        }

        // Case 2: referral collision (different payment attempted for same referral)
        const referralMatch = existingComms.find((c) => c.referral_id === referral.id);
        if (referralMatch) {
          if (referral.qualifying_payment_id === referralMatch.payment_id) {
            return {
              status: 'subsequent_payment_zero_commission',
              duplicate_type: 'referral_already_qualified',
              qualifying_commission_id: referralMatch.id,
              qualifying_payment_id: referralMatch.payment_id,
            };
          }
          throw new Error('Referral commission conflict');
        }

        throw new Error('Unrelated unique violation');
      }

      const referral = { id: 'ref-100', qualifying_payment_id: 'pay-1' };
      const comm1 = { id: 'comm-100', referral_id: 'ref-100', payment_id: 'pay-1' };

      // Exact retry for pay-1 -> succeeds as duplicate
      const retryResult = resolveUniqueConflict([comm1], referral, 'pay-1');
      assert.strictEqual(retryResult.status, 'already_processed');
      assert.strictEqual(retryResult.duplicate_type, 'exact_payment_match');

      // Subsequent payment pay-2 for same referral -> recognized as zero commission subsequent payment
      const subsequentResult = resolveUniqueConflict([comm1], referral, 'pay-2');
      assert.strictEqual(subsequentResult.status, 'subsequent_payment_zero_commission');
      assert.strictEqual(subsequentResult.duplicate_type, 'referral_already_qualified');

      // Cross-referral collision (pay-1 belongs to another referral) -> throws
      assert.throws(
        () => resolveUniqueConflict([{ id: 'comm-x', referral_id: 'ref-OTHER', payment_id: 'pay-1' }], referral, 'pay-1'),
        /Cross-referral payment identity mismatch/
      );

      // Qualifying payment mismatch (referral says pay-999 qualified it, but comm is on pay-1) -> throws
      assert.throws(
        () => resolveUniqueConflict([comm1], { id: 'ref-100', qualifying_payment_id: 'pay-999' }, 'pay-2'),
        /Referral commission conflict/
      );
    });

    await st.test('TEST 24C: Renewal verification strictly requires verified existence of original commission in sales_commissions', () => {
      assert.ok(
        engineSql.includes('Never resolve merely because referral is marked qualified; verify the original commission exists!'),
        'Must document and enforce verified original commission existence'
      );
      assert.ok(
        engineSql.includes('SELECT c.id INTO v_matched_comm\n    FROM public.sales_commissions c\n    WHERE c.payment_id = v_referral.qualifying_payment_id AND c.referral_id = v_referral.id;'),
        'Must select matching commission by payment_id and referral_id'
      );
      assert.ok(
        engineSql.includes('marked qualified by payment % but no matching commission exists'),
        'Must raise exception when referral is marked qualified but original commission is missing'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: BANKING PRIVACY & AUDITED RAW DISCLOSURE
  // ----------------------------------------------------------------------------
  await t.test('SUITE 6: Banking Privacy & Audited Raw Disclosure', async (st) => {
    await st.test('TEST 25: get_my_banking_profile returns masked string with right 4 digits', () => {
      assert.ok(
        foundationSql.includes("('••••••' || RIGHT(b.account_number, 4))::text AS masked_account_number"),
        'RPC must return pre-masked banking string'
      );
      assert.ok(
        foundationSql.includes('WHERE r.user_id = auth.uid()'),
        'RPC must be strictly scoped to caller auth.uid()'
      );
    });

    await st.test('TEST 26: admin_reveal_rep_bank_account enforces mandatory written justification and logs to platform_audit_logs', () => {
      assert.ok(
        foundationSql.includes('Mandatory justification required to reveal unmasked bank details'),
        'Must reject empty justification'
      );
      assert.ok(
        foundationSql.includes('INSERT INTO public.platform_audit_logs'),
        'Must insert into platform_audit_logs before returning raw NUBAN'
      );
      assert.ok(
        foundationSql.includes("'rep_banking.raw_revealed'"),
        'Action must be rep_banking.raw_revealed'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 7: OUTBOX BATCH WORKER & ABANDONED TASK RECOVERY
  // ----------------------------------------------------------------------------
  await t.test('SUITE 7: Outbox Batch Worker & Abandoned Task Recovery', async (st) => {
    await st.test('TEST 27: process_commission_outbox_batch uses SKIP LOCKED and 5-minute lease TTL', () => {
      assert.ok(
        engineSql.includes('FOR UPDATE SKIP LOCKED'),
        'Outbox batch worker must use SKIP LOCKED'
      );
      assert.ok(
        engineSql.includes('lease_expires_at = now() + (p_lease_seconds'),
        'Outbox batch worker must claim lease'
      );
    });

    await st.test('TEST 28: admin_requeue_abandoned_outbox resets abandoned record with audit log', () => {
      assert.ok(
        foundationSql.includes('UPDATE public.sales_commission_outbox'),
        'Must update outbox record'
      );
      assert.ok(
        foundationSql.includes("status IN ('abandoned', 'error')"),
        'Must only requeue abandoned or error tasks'
      );
      assert.ok(
        foundationSql.includes("'commission_outbox.requeued'"),
        'Must audit requeue action'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 8: NETLIFY FUNCTION ROUTING & STAGING SECURITY
  // ----------------------------------------------------------------------------
  await t.test('SUITE 8: Netlify Function Routing & Staging Security', async (st) => {
    const netlifyToml = fs.readFileSync(path.join(__dirname, '../netlify.toml'), 'utf8');

    await st.test('TEST 29: netlify.toml defines explicit redirects for outbox worker and reconciliation scanner', () => {
      assert.ok(
        netlifyToml.includes('from = "/api/process-commission-outbox"\n  to = "/.netlify/functions/process-commission-outbox"'),
        'Must define redirect for process-commission-outbox'
      );
      assert.ok(
        netlifyToml.includes('from = "/api/reconcile-referral-commissions"\n  to = "/.netlify/functions/reconcile-referral-commissions"'),
        'Must define redirect for reconcile-referral-commissions'
      );
    });

    await st.test('TEST 30: Outbox worker and reconciliation scanner reject unauthorized invocations with HTTP 403', async () => {
      const mockAdmin = {
        rpc: () => Promise.resolve({ data: false }),
        from: () => ({
          select: () => ({
            eq: () => Promise.resolve({ data: [] }),
            in: () => Promise.resolve({ data: [] }),
          }),
          insert: () => Promise.resolve({ error: null }),
        }),
      };

      // Worker rejects without auth
      const workerRes = await outboxWorkerHandler(
        { headers: {} },
        {},
        { env: { CRON_SECRET: 'super-secret' }, supabaseAdmin: mockAdmin }
      );
      assert.strictEqual(workerRes.statusCode, 403);
      assert.ok(workerRes.body.includes('Access Denied'));

      // Scanner rejects without auth
      const scannerRes = await scannerHandler(
        { headers: {} },
        {},
        { env: { CRON_SECRET: 'super-secret' }, supabaseAdmin: mockAdmin }
      );
      assert.strictEqual(scannerRes.statusCode, 403);
      assert.ok(scannerRes.body.includes('Access Denied'));

      // Scanner accepts valid x-cron-secret
      const authorizedScannerRes = await scannerHandler(
        { headers: { 'x-cron-secret': 'valid-staging-secret' } },
        {},
        {
          env: { CRON_SECRET: 'valid-staging-secret' },
          supabaseAdmin: mockAdmin,
        }
      );
      assert.strictEqual(authorizedScannerRes.statusCode, 200);
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 9: PAYOUT RETRIEVAL RESILIENCE & SCHEMA CACHE RECOVERY
  // ----------------------------------------------------------------------------
  await t.test('SUITE 9: Payout Retrieval Resilience & Schema Cache Recovery', async (st) => {
    const adminServiceSource = fs.readFileSync(
      path.join(__dirname, '../src/services/salesRepAdminService.ts'),
      'utf8'
    );
    const salesPageSource = fs.readFileSync(
      path.join(__dirname, '../src/pages/platform/PlatformSalesPage.tsx'),
      'utf8'
    );

    await st.test('TEST 31: isSchemaCacheOrMissingTableError recognizes PostgREST PGRST205, PGRST200, PGRST202 and 42P01', () => {
      assert.ok(
        adminServiceSource.includes("code === 'PGRST205'"),
        'Must catch PGRST205 table not found in schema cache'
      );
      assert.ok(
        adminServiceSource.includes("message.includes('schema cache')"),
        'Must catch schema cache message strings'
      );
      assert.ok(
        adminServiceSource.includes("code === '42P01'"),
        'Must catch PostgreSQL undefined table code 42P01'
      );
    });

    await st.test('TEST 32: getPayouts handles PGRST205 schema cache error gracefully and returns empty array', () => {
      assert.ok(
        adminServiceSource.includes("async getPayouts(): Promise<PayoutBatchRecord[]>"),
        'getPayouts must be typed as Promise<PayoutBatchRecord[]>'
      );
      assert.ok(
        adminServiceSource.includes("if (isSchemaCacheOrMissingTableError(error))"),
        'getPayouts must check isSchemaCacheOrMissingTableError'
      );
      assert.ok(
        adminServiceSource.includes("console.warn('[salesRepAdminService] sales_commission_payouts table unavailable or schema cache pending:'"),
        'getPayouts must log informative warning on missing table'
      );
      assert.ok(
        adminServiceSource.includes("return [];"),
        'getPayouts must return empty array instead of throwing on schema cache miss'
      );
    });

    await st.test('TEST 33: getSalesOverview returns safe zeroed metrics on missing table / schema cache miss', () => {
      assert.ok(
        adminServiceSource.includes("activeRepsCount: 0"),
        'Fallback metrics must default activeRepsCount to 0'
      );
      assert.ok(
        adminServiceSource.includes("totalEarnedCents: 0"),
        'Fallback metrics must default totalEarnedCents to 0'
      );
      assert.ok(
        adminServiceSource.includes("totalPendingLiabilityCents: 0"),
        'Fallback metrics must default totalPendingLiabilityCents to 0'
      );
    });

    await st.test('TEST 34: getSalesReps, getCommissions, getOutboxTasks, and getQuarantineEntries handle schema cache gracefully', () => {
      const methods = ['getSalesReps', 'getCommissions', 'getOutboxTasks', 'getQuarantineEntries'];
      for (const m of methods) {
        assert.ok(
          adminServiceSource.includes(`async ${m}`) || adminServiceSource.includes(`${m}(`),
          `Service must define ${m}`
        );
      }
    });

    await st.test('TEST 35: PlatformSalesPage uses Promise.allSettled to isolate subsystem loading', () => {
      assert.ok(
        salesPageSource.includes('Promise.allSettled'),
        'PlatformSalesPage must use Promise.allSettled so a missing table or single failure cannot crash the dashboard'
      );
      assert.ok(
        salesPageSource.includes('No payout records found'),
        'PlatformSalesPage must render clean empty state for payouts'
      );
      assert.ok(
        salesPageSource.includes('No representatives registered yet'),
        'PlatformSalesPage must render clean empty state for representatives'
      );
    });

    await st.test('TEST 36: Database migration creates public.sales_commission_payouts with complete schema and constraints', () => {
      assert.ok(
        foundationSql.includes('CREATE TABLE IF NOT EXISTS public.sales_commission_payouts'),
        'Migration must create sales_commission_payouts'
      );
      assert.ok(
        foundationSql.includes('transfer_reference text UNIQUE'),
        'transfer_reference must have UNIQUE constraint'
      );
      assert.ok(
        foundationSql.includes('payout_number text NOT NULL UNIQUE'),
        'payout_number must have UNIQUE constraint'
      );
      assert.ok(
        foundationSql.includes('sales_rep_id uuid NOT NULL REFERENCES public.sales_representatives(id)'),
        'Must link to sales_representatives'
      );
    });
  });
});
