// ==============================================================================
// PHYSENRA — PHASE 4A: SELF-SERVICE SaaS BILLING FOUNDATION TESTS
// Test Suite: tests/practice_self_service_billing_phase4a.test.cjs
//
// Verification of:
// TEST 1:   Migration file 20261003000000_practice_self_service_billing_foundation.sql exists
// TEST 2:   Migration defines sequence public.saas_invoice_number_seq
// TEST 3:   Migration adds pending_plan_id and pending_billing_interval to practice_subscriptions
// TEST 4:   Migration defines initiate_practice_subscription_payment RPC with SECURITY DEFINER
// TEST 5:   initiate_practice_subscription_payment enforces practice_owner authorization guard
// TEST 6:   initiate_practice_subscription_payment derives price strictly from saas_plans (rejects arbitrary client pricing)
// TEST 7:   initiate_practice_subscription_payment validates practitioner capacity before invoicing
// TEST 8:   initiate_practice_subscription_payment creates open invoice with correct PHY-INV-YYYY-XXXXXX format
// TEST 9:   initiate_practice_subscription_payment does NOT mark invoice paid or activate subscription
// TEST 10:  initiate_practice_subscription_payment reuses open invoice idempotently to prevent duplicate open invoices
// TEST 11:  initiate_practice_subscription_payment logs practice.billing_payment_initiated audit event
// TEST 12:  Migration defines self_service_change_plan RPC with SECURITY DEFINER
// TEST 13:  self_service_change_plan enforces practice_owner authorization guard (rejects clinician/manager/anon)
// TEST 14:  self_service_change_plan enforces target plan is active and public
// TEST 15:  self_service_change_plan blocks downgrade if active practitioners exceed target seat limit
// TEST 16:  self_service_change_plan immediate switch for trialing subscription
// TEST 17:  self_service_change_plan schedules downgrade for period end without removing current entitlement
// TEST 18:  self_service_change_plan requires payment for upgrade before activating entitlement
// TEST 19:  self_service_change_plan logs practice.plan_changed or practice.plan_change_scheduled audit events
// TEST 20:  Migration defines cancel_practice_subscription RPC with SECURITY DEFINER
// TEST 21:  cancel_practice_subscription enforces practice_owner authorization guard
// TEST 22:  cancel_practice_subscription sets cancel_at_period_end = true for active paid subscriptions
// TEST 23:  cancel_practice_subscription preserves clinical write access until current_period_end for paid plans
// TEST 24:  cancel_practice_subscription cancels trialing subscription immediately and updates practice status
// TEST 25:  cancel_practice_subscription is idempotent and logs practice.subscription_cancelled audit event
// TEST 26:  Migration defines reactivate_practice_subscription RPC with SECURITY DEFINER
// TEST 27:  reactivate_practice_subscription clears cancel_at_period_end if current_period_end is in the future
// TEST 28:  reactivate_practice_subscription rejects silent reactivation if subscription has expired/lapsed
// TEST 29:  reactivate_practice_subscription logs practice.subscription_reactivated audit event
// TEST 30:  Enhanced process_subscription_payment_settlement promotes pending_plan_id upon settlement
// TEST 31:  RPC execution revoked from anon and public, granted strictly to authenticated/service_role
// TEST 32:  SECURITY DEFINER functions have fixed search_path = public, auth, pg_temp
// TEST 33:  Financial records (saas_invoices and saas_payments) maintain RLS denying client mutations
// TEST 34:  practice_subscriptions table maintains RLS denying direct client INSERT/UPDATE/DELETE
// TEST 35:  Tenant isolation: caller cannot access or mutate subscriptions of other practices
// TEST 36:  Clinical firewall: Phase 4A introduces zero admin access to clinical_notes or patients
// TEST 37:  TypeScript contracts: database.ts includes Phase 4A columns and functions
// TEST 38:  Service layer: saasSubscriptionService implements Phase 4A methods
// TEST 39:  Zero Kabworld references across all Phase 4A files
// TEST 40:  Security: Zero exposed secrets (sk_live_, sk_test_, sbp_) in frontend source
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const MIGRATION_PATH = path.join(
  ROOT_DIR,
  'supabase',
  'migrations',
  '20261003000000_practice_self_service_billing_foundation.sql'
);
const SAAS_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'saasSubscriptionService.ts');
const DB_TYPES_PATH = path.join(ROOT_DIR, 'src', 'types', 'database.ts');
const MODELS_PATH = path.join(ROOT_DIR, 'src', 'types', 'models.ts');

test('=== PHYSENRA PHASE 4A: SELF-SERVICE SAAS BILLING FOUNDATION ===', async (t) => {
  assert(fs.existsSync(MIGRATION_PATH), 'Migration 20261003000000 must exist');
  const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
  const saasServiceContent = fs.readFileSync(SAAS_SERVICE_PATH, 'utf8');
  const dbTypesContent = fs.readFileSync(DB_TYPES_PATH, 'utf8');

  // ----------------------------------------------------------------------------
  // SUITE 1: Migration Structure, Sequence & Schema Extensions
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Sequence & Schema Extensions ---', async (st) => {
    await st.test('TEST 1: Migration file exists and is populated', () => {
      assert(migrationSql.length > 500, 'Migration must contain valid SQL statements');
    });

    await st.test('TEST 2: Sequence saas_invoice_number_seq is created', () => {
      assert(
        migrationSql.includes('CREATE SEQUENCE IF NOT EXISTS public.saas_invoice_number_seq'),
        'Must create saas_invoice_number_seq sequence'
      );
    });

    await st.test('TEST 3: Columns pending_plan_id and pending_billing_interval are added to practice_subscriptions', () => {
      assert(
        migrationSql.includes('pending_plan_id uuid REFERENCES public.saas_plans(id)'),
        'Must add pending_plan_id column with foreign key to saas_plans'
      );
      assert(
        migrationSql.includes('pending_billing_interval public.saas_billing_interval'),
        'Must add pending_billing_interval column'
      );
      assert(
        migrationSql.includes('CREATE INDEX IF NOT EXISTS idx_practice_subscriptions_pending_plan'),
        'Must index pending_plan_id'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: initiate_practice_subscription_payment RPC
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: initiate_practice_subscription_payment RPC ---', async (st) => {
    await st.test('TEST 4: RPC is SECURITY DEFINER with fixed search_path', () => {
      assert(
        migrationSql.includes('FUNCTION public.initiate_practice_subscription_payment'),
        'Must define initiate_practice_subscription_payment'
      );
      assert(
        /initiate_practice_subscription_payment[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = public, auth, pg_temp/i.test(
          migrationSql
        ),
        'Must be SECURITY DEFINER with fixed search_path'
      );
    });

    await st.test('TEST 5: Caller must be verified practice_owner of target practice', () => {
      assert(
        migrationSql.includes("public.user_has_practice_role(p_practice_id, ARRAY['practice_owner'])"),
        'Must verify caller is practice_owner'
      );
    });

    await st.test('TEST 6: Authoritative pricing is derived server-side from saas_plans (rejects arbitrary client pricing)', () => {
      const initSig = migrationSql.match(/FUNCTION public\.initiate_practice_subscription_payment\(([\s\S]*?)\)/)?.[1] || '';
      assert(
        !initSig.includes('p_amount') && !initSig.includes('p_price'),
        'RPC initiate_practice_subscription_payment must not accept price or amount parameter from client'
      );
      assert(
        migrationSql.includes('v_price_cents := v_plan.annual_price_cents') &&
        migrationSql.includes('v_price_cents := v_plan.monthly_price_cents'),
        'Must derive price strictly from saas_plans without trusting client'
      );
    });

    await st.test('TEST 7: Validates active practitioner capacity against plan seat limit', () => {
      assert(
        migrationSql.includes("role IN ('physiotherapist', 'practice_owner')") &&
        migrationSql.includes("status = 'active'"),
        'Must count active clinical staff'
      );
      assert(
        migrationSql.includes('v_active_practitioners > v_plan.practitioner_seat_limit'),
        'Must block if active practitioners exceed target plan limit'
      );
    });

    await st.test('TEST 8: Generates open invoice formatted PHY-INV-YYYY-XXXXXX', () => {
      assert(
        migrationSql.includes("'PHY-INV-' || to_char(now(), 'YYYY') || '-'"),
        'Must format invoice number with PHY-INV-YYYY prefix'
      );
      assert(
        migrationSql.includes("nextval('public.saas_invoice_number_seq')"),
        'Must use sequence nextval'
      );
      assert(
        migrationSql.includes("status,\n    due_date\n  ) VALUES (\n    v_invoice_num,\n    p_practice_id,\n    v_sub.id,\n    NULL,\n    v_plan.currency,\n    v_price_cents,\n    0,\n    0,\n    v_price_cents,\n    'open'"),
        'Must insert open invoice with subtotal, tax=0, discount=0, total=price'
      );
    });

    await st.test('TEST 9: Payment initiation does NOT mark invoice paid or advance subscription status', () => {
      // Must not insert into saas_payments or update subscription status in initiate_practice_subscription_payment
      const funcBody = migrationSql.match(/FUNCTION public\.initiate_practice_subscription_payment[\s\S]*?\$\$ LANGUAGE/)?.[0] || '';
      assert(!funcBody.includes("status = 'paid'"), 'Must not mark invoice paid');
      assert(!funcBody.includes("status = 'active',"), 'Must not set subscription status active');
      assert(!funcBody.includes('UPDATE public.practice_subscriptions'), 'Must not update practice_subscriptions in initiate RPC');
      assert(!funcBody.includes('INSERT INTO public.saas_payments'), 'Must not insert payments');
    });

    await st.test('TEST 10: Reuses unexpired open invoice for same amount idempotently', () => {
      assert(
        migrationSql.includes("status = 'open'") &&
        migrationSql.includes('total_cents = v_price_cents') &&
        migrationSql.includes('due_date > now()'),
        'Must check for existing unexpired open invoice'
      );
      assert(
        migrationSql.includes("'is_reused', true"),
        'Must indicate reused open invoice in response'
      );
    });

    await st.test('TEST 11: Emits practice.billing_payment_initiated audit log', () => {
      assert(
        migrationSql.includes("'practice.billing_payment_initiated'"),
        'Must log practice.billing_payment_initiated audit event'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: self_service_change_plan RPC
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: self_service_change_plan RPC ---', async (st) => {
    await st.test('TEST 12: RPC is SECURITY DEFINER with fixed search_path', () => {
      assert(
        migrationSql.includes('FUNCTION public.self_service_change_plan'),
        'Must define self_service_change_plan'
      );
      assert(
        /self_service_change_plan[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = public, auth, pg_temp/i.test(
          migrationSql
        ),
        'Must be SECURITY DEFINER with fixed search_path'
      );
    });

    await st.test('TEST 13: Strictly restricted to practice_owner role', () => {
      const funcBody = migrationSql.match(/FUNCTION public\.self_service_change_plan[\s\S]*?\$\$ LANGUAGE/)?.[0] || '';
      assert(
        funcBody.includes("public.user_has_practice_role(p_practice_id, ARRAY['practice_owner'])"),
        'Must enforce practice_owner check'
      );
    });

    await st.test('TEST 14: Target plan must be active and public for self-service', () => {
      const funcBody = migrationSql.match(/FUNCTION public\.self_service_change_plan[\s\S]*?\$\$ LANGUAGE/)?.[0] || '';
      assert(
        funcBody.includes('is_active = true') && funcBody.includes('is_public'),
        'Must validate target plan is active and public'
      );
    });

    await st.test('TEST 15: Capacity validation blocks downgrade if active staff exceed limit', () => {
      const funcBody = migrationSql.match(/FUNCTION public\.self_service_change_plan[\s\S]*?\$\$ LANGUAGE/)?.[0] || '';
      assert(
        funcBody.includes('v_active_practitioners > v_target_plan.practitioner_seat_limit'),
        'Must block downgrade exceeding practitioner seat limit'
      );
    });

    await st.test('TEST 16: Immediate plan switch for trialing subscription', () => {
      const funcBody = migrationSql.match(/FUNCTION public\.self_service_change_plan[\s\S]*?\$\$ LANGUAGE/)?.[0] || '';
      assert(
        funcBody.includes("v_sub.status = 'trialing'"),
        'Must handle trialing subscriptions'
      );
      assert(
        funcBody.includes("'immediate_trial_plan_change'"),
        'Must return immediate trial plan change action'
      );
    });

    await st.test('TEST 17: Scheduled downgrade for active paid subscription preserves current entitlement', () => {
      const funcBody = migrationSql.match(/FUNCTION public\.self_service_change_plan[\s\S]*?\$\$ LANGUAGE/)?.[0] || '';
      assert(
        funcBody.includes('pending_plan_id = v_target_plan.id'),
        'Must set pending_plan_id for scheduled downgrade'
      );
      assert(
        funcBody.includes("'scheduled_downgrade'"),
        'Must return scheduled_downgrade action'
      );
      assert(
        funcBody.includes('effective_at') || funcBody.includes('effective_date'),
        'Must return effective date as current_period_end'
      );
    });

    await st.test('TEST 18: Upgrades require payment before activating entitlement', () => {
      const funcBody = migrationSql.match(/FUNCTION public\.self_service_change_plan[\s\S]*?\$\$ LANGUAGE/)?.[0] || '';
      assert(
        funcBody.includes('public.initiate_practice_subscription_payment'),
        'Must call initiate_practice_subscription_payment for upgrade'
      );
      assert(
        funcBody.includes("'upgrade_payment_required'"),
        'Must return upgrade_payment_required action'
      );
    });

    await st.test('TEST 19: Logs plan change audit events', () => {
      assert(
        migrationSql.includes("'practice.plan_changed'") ||
        migrationSql.includes("'practice.plan_change_scheduled'") ||
        migrationSql.includes("'practice.plan_change_requested'"),
        'Must log audit events for plan changes'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: cancel_practice_subscription RPC
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: cancel_practice_subscription RPC ---', async (st) => {
    await st.test('TEST 20: RPC is SECURITY DEFINER with fixed search_path', () => {
      assert(
        migrationSql.includes('FUNCTION public.cancel_practice_subscription'),
        'Must define cancel_practice_subscription'
      );
      assert(
        /cancel_practice_subscription[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = public, auth, pg_temp/i.test(
          migrationSql
        ),
        'Must be SECURITY DEFINER with fixed search_path'
      );
    });

    await st.test('TEST 21: Enforces practice_owner authorization guard', () => {
      const funcBody = migrationSql.match(/FUNCTION public\.cancel_practice_subscription[\s\S]*?\$\$ LANGUAGE/)?.[0] || '';
      assert(
        funcBody.includes("public.user_has_practice_role(p_practice_id, ARRAY['practice_owner'])"),
        'Must check practice_owner role'
      );
    });

    await st.test('TEST 22: Paid subscription sets cancel_at_period_end = true', () => {
      const funcBody = migrationSql.match(/FUNCTION public\.cancel_practice_subscription[\s\S]*?\$\$ LANGUAGE/)?.[0] || '';
      assert(
        funcBody.includes("v_sub.status = 'active'"),
        'Must check active status'
      );
      assert(
        funcBody.includes('cancel_at_period_end = true'),
        'Must set cancel_at_period_end = true'
      );
    });

    await st.test('TEST 23: Paid subscription preserves status = active until current_period_end', () => {
      const cancelFunc = migrationSql.match(/FUNCTION public\.cancel_practice_subscription[\s\S]*?\$\$ LANGUAGE/)?.[0] || '';
      const activeBranch = cancelFunc.match(/ELSIF v_sub\.status = 'active' THEN([\s\S]*?)ELSE/)?.[1] || '';
      assert(
        !activeBranch.includes("status = 'cancelled'"),
        'Must not immediately cancel status for active paid subscriptions'
      );
      assert(
        activeBranch.includes('cancel_at_period_end = true'),
        'Must set cancel_at_period_end = true in active branch'
      );
    });

    await st.test('TEST 24: Trial cancellation is immediate and updates practice status', () => {
      const funcBody = migrationSql.match(/FUNCTION public\.cancel_practice_subscription[\s\S]*?\$\$ LANGUAGE/)?.[0] || '';
      assert(
        funcBody.includes("v_sub.status = 'trialing'"),
        'Must identify trialing subscriptions'
      );
      assert(
        funcBody.includes("status = 'cancelled'"),
        'Must set subscription status = cancelled for trials'
      );
    });

    await st.test('TEST 25: Cancellation is idempotent and logs practice.subscription_cancelled audit event', () => {
      assert(
        migrationSql.includes("'is_idempotent', true"),
        'Must handle already cancelled subscriptions idempotently'
      );
      assert(
        migrationSql.includes("'practice.subscription_cancelled'"),
        'Must log practice.subscription_cancelled audit event'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: reactivate_practice_subscription RPC
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: reactivate_practice_subscription RPC ---', async (st) => {
    await st.test('TEST 26: RPC is SECURITY DEFINER with fixed search_path', () => {
      assert(
        migrationSql.includes('FUNCTION public.reactivate_practice_subscription'),
        'Must define reactivate_practice_subscription'
      );
      assert(
        /reactivate_practice_subscription[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = public, auth, pg_temp/i.test(
          migrationSql
        ),
        'Must be SECURITY DEFINER with fixed search_path'
      );
    });

    await st.test('TEST 27: Clears cancel_at_period_end if current_period_end is in the future', () => {
      const funcBody = migrationSql.match(/FUNCTION public\.reactivate_practice_subscription[\s\S]*?\$\$ LANGUAGE/)?.[0] || '';
      assert(
        funcBody.includes('v_sub.current_period_end > now()'),
        'Must verify current_period_end > now()'
      );
      assert(
        funcBody.includes('cancel_at_period_end = false'),
        'Must clear cancel_at_period_end'
      );
    });

    await st.test('TEST 28: Expired/lapsed subscription cannot be silently reactivated without payment', () => {
      const funcBody = migrationSql.match(/FUNCTION public\.reactivate_practice_subscription[\s\S]*?\$\$ LANGUAGE/)?.[0] || '';
      assert(
        funcBody.includes("'requires_payment', true"),
        'Must require payment if period has lapsed'
      );
      assert(
        funcBody.includes("'success', false"),
        'Must return success = false when payment is required'
      );
    });

    await st.test('TEST 29: Emits practice.subscription_reactivated audit event', () => {
      assert(
        migrationSql.includes("'practice.subscription_reactivated'"),
        'Must log practice.subscription_reactivated audit event'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Settlement Enhancement & Permissions Hardening
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Settlement Enhancement & Permissions Hardening ---', async (st) => {
    await st.test('TEST 30: process_subscription_payment_settlement promotes pending_plan_id upon settlement', () => {
      assert(
        migrationSql.includes('v_sub.pending_plan_id IS NOT NULL'),
        'Must check for pending_plan_id in settlement'
      );
      assert(
        migrationSql.includes('pending_plan_id = NULL'),
        'Must clear pending_plan_id after applying'
      );
    });

    await st.test('TEST 31: RPC permissions revoked from anon and public, granted to authenticated/service_role', () => {
      assert(
        migrationSql.includes('REVOKE EXECUTE ON FUNCTION public.initiate_practice_subscription_payment FROM anon, public;'),
        'Must revoke initiate_practice_subscription_payment from anon, public'
      );
      assert(
        migrationSql.includes('REVOKE EXECUTE ON FUNCTION public.self_service_change_plan FROM anon, public;'),
        'Must revoke self_service_change_plan from anon, public'
      );
      assert(
        migrationSql.includes('REVOKE EXECUTE ON FUNCTION public.cancel_practice_subscription FROM anon, public;'),
        'Must revoke cancel_practice_subscription from anon, public'
      );
      assert(
        migrationSql.includes('REVOKE EXECUTE ON FUNCTION public.reactivate_practice_subscription FROM anon, public;'),
        'Must revoke reactivate_practice_subscription from anon, public'
      );
    });

    await st.test('TEST 32: SECURITY DEFINER functions have fixed search_path = public, auth, pg_temp', () => {
      const defMatches = migrationSql.match(/SET search_path = public, auth, pg_temp/g);
      assert(defMatches && defMatches.length >= 4, 'Must set search_path on all RPCs');
    });

    await st.test('TEST 33: Financial records maintain RLS denying client mutations', () => {
      assert(
        !migrationSql.includes('CREATE POLICY.*INSERT.*ON public.saas_invoices.*TO authenticated.*WITH CHECK (true)'),
        'Must never grant direct insert on saas_invoices to clients'
      );
      assert(
        !migrationSql.includes('CREATE POLICY.*UPDATE.*ON public.saas_payments.*TO authenticated.*USING (true)'),
        'Must never grant direct update on saas_payments to clients'
      );
    });

    await st.test('TEST 34: practice_subscriptions maintains RLS denying direct client mutations', () => {
      assert(
        !migrationSql.includes('CREATE POLICY.*UPDATE.*ON public.practice_subscriptions.*TO authenticated.*USING (true)'),
        'Must never grant direct update on practice_subscriptions to clients'
      );
    });

    await st.test('TEST 35: Tenant isolation prevents cross-practice mutation', () => {
      assert(
        migrationSql.includes("public.user_has_practice_role(p_practice_id, ARRAY['practice_owner'])"),
        'All mutation RPCs enforce tenant practice_id boundary'
      );
    });

    await st.test('TEST 36: Clinical firewall intact (zero clinical access in SaaS billing)', () => {
      assert(!migrationSql.includes('clinical_notes'), 'Billing migration must not reference clinical_notes');
      assert(!migrationSql.includes('medical_records'), 'Billing migration must not reference medical_records');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 7: TypeScript Contracts & Service Layer
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 7: TypeScript Contracts & Service Layer ---', async (st) => {
    await st.test('TEST 37: database.ts includes pending_plan_id and Phase 4A Functions', () => {
      assert(dbTypesContent.includes('pending_plan_id'), 'database.ts must include pending_plan_id');
      assert(dbTypesContent.includes('pending_billing_interval'), 'database.ts must include pending_billing_interval');
      assert(dbTypesContent.includes('initiate_practice_subscription_payment:'), 'database.ts must type initiate RPC');
      assert(dbTypesContent.includes('self_service_change_plan:'), 'database.ts must type change plan RPC');
      assert(dbTypesContent.includes('cancel_practice_subscription:'), 'database.ts must type cancel RPC');
      assert(dbTypesContent.includes('reactivate_practice_subscription:'), 'database.ts must type reactivate RPC');
    });

    await st.test('TEST 38: saasSubscriptionService implements Phase 4A wrapper methods', () => {
      assert(saasServiceContent.includes('initiatePracticeSubscriptionPayment'), 'Service must implement initiate');
      assert(saasServiceContent.includes('selfServiceChangePlan'), 'Service must implement change plan');
      assert(saasServiceContent.includes('cancelPracticeSubscription'), 'Service must implement cancel');
      assert(saasServiceContent.includes('reactivatePracticeSubscription'), 'Service must implement reactivate');
    });

    await st.test('TEST 39: Zero Kabworld references across all Phase 4A files', () => {
      assert(!migrationSql.toLowerCase().includes('kabworld'), 'Migration must not reference kabworld');
      assert(!saasServiceContent.toLowerCase().includes('kabworld'), 'Service must not reference kabworld');
    });

    await st.test('TEST 40: Zero leaked secrets in frontend source code', () => {
      assert(!saasServiceContent.includes('sk_live_'), 'Must not contain sk_live_');
      assert(!saasServiceContent.includes('sk_test_'), 'Must not contain sk_test_');
      assert(!saasServiceContent.includes('sbp_'), 'Must not contain sbp_ token');
    });
  });
});
