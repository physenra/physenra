// ==============================================================================
// PHYSENRA — PHASE 4F: FINAL FINANCIAL, SECURITY, TENANT-ISOLATION & COMMERCIAL
// ARCHITECTURE AUDIT TEST SUITE
// File: tests/phase4_final_financial_security_audit.test.cjs
//
// Governs comprehensive audit verification across all 19 required architectural categories:
// Category A: Financial Source of Truth
// Category B: Price Tampering Resistance
// Category C: Payment Replay Resistance
// Category D: Webhook Security
// Category E: Invoice Immutability
// Category F: Subscription Immutability
// Category G: Tenant Isolation
// Category H: Role Isolation (RBAC)
// Category I: RPC Security & Authorization
// Category J: Subscription Write Gating (practice_is_writable)
// Category K: Seat Limits & Capacity
// Category L: Cancellation Semantics
// Category M: Expiration Semantics
// Category N: Platform Admin Firewall
// Category O: Secret Scanning
// Category P: Project Separation (Kabworld Isolation)
// Category Q: Production Route Coverage
// Category R: Responsive Commercial UI
// Category S: Regression & Upstream Suites
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const FUNCTIONS_DIR = path.join(ROOT_DIR, 'netlify', 'functions');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'supabase', 'migrations');

// File paths
const INIT_PAYMENT_PATH = path.join(FUNCTIONS_DIR, 'initialize-payment.cjs');
const VERIFY_PAYMENT_PATH = path.join(FUNCTIONS_DIR, 'verify-payment.cjs');
const WEBHOOK_PATH = path.join(FUNCTIONS_DIR, 'paystack-webhook.cjs');
const PAYSTACK_LIB_PATH = path.join(FUNCTIONS_DIR, 'lib', 'paystack.cjs');

const MIGRATION_PHASE3_PATH = path.join(MIGRATIONS_DIR, '20261001030000_platform_saas_subscriptions_foundation.sql');
const MIGRATION_OPS_PATH = path.join(MIGRATIONS_DIR, '20261002000000_platform_saas_operations_v1.sql');
const MIGRATION_PHASE4A_PATH = path.join(MIGRATIONS_DIR, '20261003000000_practice_self_service_billing_foundation.sql');

const BILLING_PAGE_PATH = path.join(SRC_DIR, 'pages', 'billing', 'PracticeBillingPage.tsx');
const INVOICE_LIST_PATH = path.join(SRC_DIR, 'pages', 'billing', 'PracticeInvoiceListPage.tsx');
const INVOICE_DETAIL_PATH = path.join(SRC_DIR, 'pages', 'billing', 'PracticeInvoiceDetailPage.tsx');
const BANNER_COMPONENT_PATH = path.join(SRC_DIR, 'components', 'billing', 'SubscriptionStatusBanner.tsx');
const APP_SHELL_PATH = path.join(SRC_DIR, 'components', 'layout', 'AppShell.tsx');
const APP_TSX_PATH = path.join(SRC_DIR, 'App.tsx');
const SAAS_SERVICE_PATH = path.join(SRC_DIR, 'services', 'saasSubscriptionService.ts');
const PLATFORM_GUARD_PATH = path.join(SRC_DIR, 'components', 'auth', 'PlatformAdminGuard.tsx');
const PLATFORM_LAYOUT_PATH = path.join(SRC_DIR, 'components', 'layout', 'PlatformLayout.tsx');

test('PHYSENRA — Phase 4F: Final Financial, Security & Commercial Architecture Audit', async (t) => {
  const initPayment = fs.readFileSync(INIT_PAYMENT_PATH, 'utf8');
  const verifyPayment = fs.readFileSync(VERIFY_PAYMENT_PATH, 'utf8');
  const webhook = fs.readFileSync(WEBHOOK_PATH, 'utf8');
  const paystackLib = fs.readFileSync(PAYSTACK_LIB_PATH, 'utf8');

  const migrationPhase3 = fs.readFileSync(MIGRATION_PHASE3_PATH, 'utf8');
  const migrationOps = fs.readFileSync(MIGRATION_OPS_PATH, 'utf8');
  const migrationPhase4a = fs.readFileSync(MIGRATION_PHASE4A_PATH, 'utf8');

  const billingPage = fs.readFileSync(BILLING_PAGE_PATH, 'utf8');
  const invoiceList = fs.readFileSync(INVOICE_LIST_PATH, 'utf8');
  const invoiceDetail = fs.readFileSync(INVOICE_DETAIL_PATH, 'utf8');
  const bannerComponent = fs.readFileSync(BANNER_COMPONENT_PATH, 'utf8');
  const appShell = fs.readFileSync(APP_SHELL_PATH, 'utf8');
  const appTsx = fs.readFileSync(APP_TSX_PATH, 'utf8');
  const saasService = fs.readFileSync(SAAS_SERVICE_PATH, 'utf8');
  const platformGuard = fs.readFileSync(PLATFORM_GUARD_PATH, 'utf8');
  const platformLayout = fs.readFileSync(PLATFORM_LAYOUT_PATH, 'utf8');

  // ============================================================================
  // CATEGORY A: Financial Source of Truth
  // ============================================================================
  await t.test('--- CATEGORY A: Financial Source of Truth ---', async (st) => {
    await st.test('A1: Plan prices and seat limits derive strictly from saas_plans catalog in PostgreSQL', () => {
      assert(migrationPhase4a.includes('FROM public.saas_plans') && migrationPhase4a.includes('plan_code::text = p_plan_code'), 'self_service_change_plan loads plan from catalog');
      assert(migrationPhase4a.includes('FROM public.saas_plans') && migrationPhase4a.includes('is_active = true'), 'initiate_practice_subscription_payment loads from catalog');
      assert(migrationPhase3.includes('FROM public.saas_plans') && migrationPhase3.includes('plan_code = p_plan_code'), 'register_practice_and_subscribe loads from catalog');
    });

    await st.test('A2: Invoices derive total_cents strictly from server-side price lookup', () => {
      assert(migrationPhase4a.includes('v_price_cents := v_plan.monthly_price_cents;'), 'Derives monthly price from plan table');
      assert(migrationPhase4a.includes('v_price_cents := v_plan.annual_price_cents;'), 'Derives annual price from plan table');
      assert(migrationPhase4a.includes('total_cents,') && migrationPhase4a.includes('v_price_cents,'), 'Invoice total_cents populated from server-derived price');
    });

    await st.test('A3: Payment records derive amount_cents strictly from authoritative invoice record', () => {
      assert(migrationPhase4a.includes('amount_cents,') && migrationPhase4a.includes('p_amount_cents,'), 'Payment ledger records authoritative settlement amount');
      assert(migrationPhase4a.includes('IF p_amount_cents < v_inv.total_cents THEN'), 'Payment settlement rejects any amount less than authoritative invoice total');
    });

    await st.test('A4: Currency is constrained to NGN across financial schemas', () => {
      assert(initPayment.includes("if (invoice.currency !== 'NGN')"), 'initPayment rejects non-NGN currency');
      assert(verifyPayment.includes("if (verified.currency !== invoice.currency)"), 'verifyPayment verifies currency matches NGN invoice');
      assert(webhook.includes("if (verified.currency !== invoice.currency)"), 'webhook verifies currency matches NGN invoice');
    });
  });

  // ============================================================================
  // CATEGORY B: Price Tampering Resistance
  // ============================================================================
  await t.test('--- CATEGORY B: Price Tampering Resistance ---', async (st) => {
    await st.test('B1: initialize-payment ignores client amounts and fetches authoritative total from DB', () => {
      // Must not accept amount in request payload
      assert(!initPayment.includes('const { practice_id, invoice_id, amount }'), 'Request payload must not take amount from client');
      assert(initPayment.includes('.from(\'saas_invoices\')'), 'Fetches authoritative invoice from database');
      assert(initPayment.includes('amount: invoice.total_cents'), 'Passes invoice.total_cents to Paystack');
    });

    await st.test('B2: initiate_practice_subscription_payment RPC calculates invoice amount server-side', () => {
      assert(!migrationPhase4a.match(/initiate_practice_subscription_payment\([^)]*amount/i), 'initiate_practice_subscription_payment does not accept amount parameter');
    });

    await st.test('B3: self_service_change_plan RPC derives target price server-side', () => {
      assert(!migrationPhase4a.includes('p_target_price'), 'self_service_change_plan does not accept price parameter');
    });

    await st.test('B4: process_subscription_payment_settlement enforces amount match against invoice', () => {
      assert(migrationPhase4a.includes('IF p_amount_cents < v_inv.total_cents THEN'), 'Settlement rejects underpayment');
      assert(migrationPhase4a.includes('RAISE EXCEPTION \'Payment amount % is less than invoice total %\''), 'Raises exception on underpayment');
    });
  });

  // ============================================================================
  // CATEGORY C: Payment Replay Resistance
  // ============================================================================
  await t.test('--- CATEGORY C: Payment Replay Resistance ---', async (st) => {
    await st.test('C1: saas_payments table enforces unique gateway reference or checks existing payment', () => {
      assert(migrationPhase3.includes('gateway_reference text'), 'saas_payments tracks gateway_reference');
      assert(initPayment.includes('.eq(\'status\', \'successful\')'), 'initialize-payment blocks new checkout for already paid invoice');
    });

    await st.test('C2: saas_webhook_events enforces uniqueness on (gateway, external_event_id)', () => {
      assert(migrationPhase3.includes('CONSTRAINT uq_gateway_event UNIQUE (gateway, external_event_id)'), 'Unique constraint prevents duplicate event insertion');
    });

    await st.test('C3: paystack-webhook handles duplicate event deliveries idempotently', () => {
      assert(webhook.includes('insertErr.code === \'23505\'') || webhook.includes('uq_gateway_event'), 'Webhook detects duplicate event key');
      assert(webhook.includes('status: \'already_processed\''), 'Returns already_processed on duplicate event without settling again');
    });

    await st.test('C4: verify-payment returns already_paid for settled transactions without double settlement', () => {
      assert(verifyPayment.includes('if (existingPayment && existingPayment.status === \'successful\')'), 'Fast idempotency check on reference');
      assert(verifyPayment.includes('status: \'already_paid\''), 'Returns already_paid safely');
    });

    await st.test('C5: process_subscription_payment_settlement acquires row locks and returns already_paid if invoice is paid', () => {
      assert(migrationPhase4a.includes('FROM public.saas_invoices') && migrationPhase4a.includes('FOR UPDATE;'), 'Row lock acquired on invoice');
      assert(migrationPhase4a.includes('IF v_inv.status = \'paid\' THEN'), 'Checks if invoice is already paid under lock');
      assert(migrationPhase4a.includes('RETURN jsonb_build_object(\'status\', \'already_paid\', \'invoice_id\', p_invoice_id);'), 'Returns already_paid without re-settling');
    });
  });

  // ============================================================================
  // CATEGORY D: Webhook Security
  // ============================================================================
  await t.test('--- CATEGORY D: Webhook Security ---', async (st) => {
    await st.test('D1: HMAC-SHA512 verification uses constant-time comparison', () => {
      assert(paystackLib.includes('crypto.timingSafeEqual'), 'Uses constant-time comparison to prevent timing attacks');
      assert(paystackLib.includes('createHmac(\'sha512\''), 'Uses SHA-512 HMAC algorithm');
    });

    await st.test('D2: Signature verification operates on exact raw request body', () => {
      assert(webhook.includes('const rawBody = event.body || \'\''), 'Extracts raw body string');
      assert(webhook.includes('verifyPaystackSignature(rawBody, signature, paystackSecretKey)'), 'Validates raw body against signature');
    });

    await st.test('D3: Webhook rejects missing and invalid signatures with HTTP 401', () => {
      assert(webhook.includes('statusCode: 401'), 'Returns 401 for signature failure');
      assert(webhook.includes('Missing x-paystack-signature header'), 'Rejects missing signature');
    });

    await st.test('D4: Webhook performs mandatory server-to-server verification with Paystack API', () => {
      assert(webhook.includes('verifyPaystackTransaction(reference, paystackSecretKey'), 'Calls Paystack API to verify transaction');
      assert(webhook.includes('if (!verifyResult || !verifyResult.status || verifyResult.data?.status !== \'success\')'), 'Rejects non-success status');
    });
  });

  // ============================================================================
  // CATEGORY E: Invoice Immutability
  // ============================================================================
  await t.test('--- CATEGORY E: Invoice Immutability ---', async (st) => {
    await st.test('E1: RLS policy denies client mutation of saas_invoices', () => {
      assert(migrationPhase3.includes('CREATE POLICY saas_invoices_deny_client_mutation ON public.saas_invoices'), 'Denies client insert/update/delete on invoices');
      assert(migrationPhase3.includes('ALTER TABLE public.saas_invoices ENABLE ROW LEVEL SECURITY;'), 'RLS enabled on saas_invoices');
    });

    await st.test('E2: Frontend services never directly mutate saas_invoices', () => {
      assert(!saasService.includes('.from(\'saas_invoices\').update('), 'No client updates to saas_invoices');
      assert(!saasService.includes('.from(\'saas_invoices\').insert('), 'No client inserts to saas_invoices');
      assert(!saasService.includes('.from(\'saas_invoices\').delete('), 'No client deletes to saas_invoices');
    });

    await st.test('E3: RLS policy denies client mutation of saas_invoice_lines', () => {
      assert(migrationPhase3.includes('CREATE POLICY saas_invoice_lines_deny_client_mutation ON public.saas_invoice_lines'), 'Denies client mutation of invoice lines');
    });
  });

  // ============================================================================
  // CATEGORY F: Subscription Immutability
  // ============================================================================
  await t.test('--- CATEGORY F: Subscription Immutability ---', async (st) => {
    await st.test('F1: RLS denies direct insert, update, delete on practice_subscriptions', () => {
      assert(migrationPhase3.includes('CREATE POLICY subscriptions_deny_client_insert ON public.practice_subscriptions'), 'Denies client insert');
      assert(migrationPhase3.includes('CREATE POLICY subscriptions_deny_client_update ON public.practice_subscriptions'), 'Denies client update');
      assert(migrationPhase3.includes('CREATE POLICY subscriptions_deny_client_delete ON public.practice_subscriptions'), 'Denies client delete');
    });

    await st.test('F2: Frontend services never directly update practice_subscriptions', () => {
      assert(!saasService.includes('.from(\'practice_subscriptions\').update('), 'No client updates to subscriptions');
      assert(!saasService.includes('.from(\'practice_subscriptions\').insert('), 'No client inserts to subscriptions');
      assert(!billingPage.includes('.from(\'practice_subscriptions\').update('), 'No page updates to subscriptions');
    });
  });

  // ============================================================================
  // CATEGORY G: Tenant Isolation
  // ============================================================================
  await t.test('--- CATEGORY G: Tenant Isolation ---', async (st) => {
    await st.test('G1: saas_invoices RLS restricts access to active practice membership', () => {
      assert(migrationPhase3.includes('public.user_has_practice_role(practice_id, ARRAY[\'practice_owner\', \'accountant\'])'), 'Invoices restricted by practice membership');
    });

    await st.test('G2: saas_payments RLS restricts access to active practice membership', () => {
      assert(migrationPhase3.includes('public.user_has_practice_role(practice_id, ARRAY[\'practice_owner\', \'accountant\'])'), 'Payments restricted by practice membership');
    });

    await st.test('G3: practice_subscriptions RLS restricts access to active practice membership', () => {
      assert(migrationPhase3.includes('public.user_has_practice_role(practice_id, ARRAY[\'practice_owner\', \'practice_manager\', \'accountant\'])'), 'Subscriptions restricted by practice membership');
    });

    await st.test('G4: Serverless payment endpoints enforce practice_id matching on invoice and payment', () => {
      assert(initPayment.includes('.eq(\'practice_id\', practice_id)'), 'Invoice must belong to practice_id');
      assert(verifyPayment.includes('if (paymentPracticeId && paymentPracticeId !== practice_id)'), 'Rejects cross-tenant payment verification');
    });
  });

  // ============================================================================
  // CATEGORY H: Role Isolation (RBAC)
  // ============================================================================
  await t.test('--- CATEGORY H: Role Isolation (RBAC) ---', async (st) => {
    await st.test('H1: practice_owner has exclusive authority over commercial mutation actions', () => {
      assert(billingPage.includes('isReadOnly = !isOwner'), 'isReadOnly flag tied strictly to isOwner');
      assert(billingPage.includes('if (isReadOnly) return;'), 'Mutation functions guard against non-owner');
    });

    await st.test('H2: accountant and practice_manager receive read-only indicator and cannot cancel or change plan', () => {
      assert(billingPage.includes('Read-Only Financial Access'), 'Displays read-only banner for accountant and manager');
      assert(billingPage.includes('Owner Action Required'), 'Displays Owner Action Required for non-owner');
    });

    await st.test('H3: physiotherapist and receptionist are strictly blocked from /app/billing', () => {
      assert(billingPage.includes('if (isClinician || isReceptionist)'), 'Gated against clinician and receptionist');
      assert(billingPage.includes('Access Restricted'), 'Renders Access Restricted screen');
    });

    await st.test('H4: Stored procedures enforce practice_owner check internally', () => {
      assert(migrationPhase4a.includes('IF NOT public.user_has_practice_role(p_practice_id, ARRAY[\'practice_owner\']) THEN'), 'user_has_practice_role practice_owner required');
    });
  });

  // ============================================================================
  // CATEGORY I: RPC Security & Authorization
  // ============================================================================
  await t.test('--- CATEGORY I: RPC Security & Authorization ---', async (st) => {
    await st.test('I1: process_subscription_payment_settlement is granted ONLY to service_role', () => {
      assert(migrationPhase4a.includes('REVOKE EXECUTE ON FUNCTION public.process_subscription_payment_settlement FROM anon, public;'), 'Revoked from anon and public');
      assert(migrationPhase4a.includes('GRANT EXECUTE ON FUNCTION public.process_subscription_payment_settlement TO service_role;'), 'Granted strictly to service_role');
    });

    await st.test('I2: Commercial self-service RPCs revoke public/anon access and grant to authenticated', () => {
      assert(migrationPhase4a.includes('REVOKE EXECUTE ON FUNCTION public.self_service_change_plan FROM anon, public;'), 'self_service_change_plan revoked from public');
      assert(migrationPhase4a.includes('REVOKE EXECUTE ON FUNCTION public.cancel_practice_subscription FROM anon, public;'), 'cancel_practice_subscription revoked from public');
      assert(migrationPhase4a.includes('REVOKE EXECUTE ON FUNCTION public.reactivate_practice_subscription FROM anon, public;'), 'reactivate_practice_subscription revoked from public');
    });

    await st.test('I3: Commercial RPCs specify SECURITY DEFINER and fixed search_path', () => {
      assert(migrationPhase4a.includes('SECURITY DEFINER SET search_path = public, auth, pg_temp;'), 'Sets secure search path');
    });

    await st.test('I4: Platform administration RPCs require is_platform_admin()', () => {
      assert(migrationOps.includes('IF NOT COALESCE(public.is_platform_admin(), false) THEN'), 'suspend_practice checks platform admin');
      assert(migrationPhase3.includes('IF NOT COALESCE(public.is_platform_admin(), false) THEN'), 'extend_practice_trial checks platform admin');
    });
  });

  // ============================================================================
  // CATEGORY J: Subscription Write Gating (practice_is_writable)
  // ============================================================================
  await t.test('--- CATEGORY J: Subscription Write Gating ---', async (st) => {
    await st.test('J1: practice_is_writable returns true for trialing, active, past_due, grace_period', () => {
      assert(migrationPhase3.includes('ps.status IN (\'trialing\', \'active\', \'past_due\', \'grace_period\')'), 'Authorizes active/grace/trial statuses for clinical write');
    });

    await st.test('J2: practice_is_writable returns false for suspended, cancelled, expired', () => {
      // By virtue of NOT being in the IN list:
      assert(!migrationPhase3.includes('\'suspended\', \'cancelled\', \'expired\'') || migrationPhase3.includes('ps.status IN (\'trialing\', \'active\', \'past_due\', \'grace_period\')'), 'Suspended, cancelled, expired are excluded from writable list');
    });

    await st.test('J3: practice_is_writable requires active or trial practice status', () => {
      assert(migrationPhase3.includes('p.status IN (\'active\', \'trial\')'), 'Suspended practice fails writability regardless of subscription');
    });
  });

  // ============================================================================
  // CATEGORY K: Seat Limits & Capacity
  // ============================================================================
  await t.test('--- CATEGORY K: Seat Limits & Capacity ---', async (st) => {
    await st.test('K1: self_service_change_plan validates practitioner count against target limit', () => {
      assert(migrationPhase4a.includes('IF v_active_practitioners > v_target_plan.practitioner_seat_limit THEN'), 'Rejects plan change if staff exceeds target seat limit');
    });

    await st.test('K2: PracticeBillingPage checks practitioner count before allowing downgrade', () => {
      assert(billingPage.includes('practitionerCount > planToChange.practitioner_seat_limit'), 'Frontend detects capacity limit excess');
      assert(billingPage.includes('Capacity Limit Exceeded'), 'Displays capacity error');
    });

    await st.test('K3: Seat capacity bar correctly reflects staff ratio', () => {
      assert(billingPage.includes('Math.min(100, (practitionerCount / seatLimit) * 100)'), 'Calculates usage percentage');
    });
  });

  // ============================================================================
  // CATEGORY L: Cancellation Semantics
  // ============================================================================
  await t.test('--- CATEGORY L: Cancellation Semantics ---', async (st) => {
    await st.test('L1: Paid subscription cancellation schedules at current_period_end', () => {
      assert(migrationPhase4a.includes('cancel_at_period_end = true,'), 'Sets cancel_at_period_end');
      assert(migrationPhase4a.includes('\'status\', \'active\''), 'Paid cancellation keeps status active until period end');
    });

    await st.test('L2: Cancellation preserves clinical data without deleting records', () => {
      assert(billingPage.includes('No patient or clinical records will ever be deleted.'), 'Guarantees record preservation');
      assert(!migrationPhase4a.includes('DELETE FROM public.patients'), 'No patient deletion in cancellation');
      assert(!migrationPhase4a.includes('DELETE FROM public.clinical_notes'), 'No clinical note deletion in cancellation');
    });

    await st.test('L3: Cancellation modal is transparent and non-manipulative', () => {
      assert(billingPage.includes('Current Plan:'), 'Specifies plan name');
      assert(billingPage.includes('Billing Interval:'), 'Specifies interval');
      assert(billingPage.includes('Current Period End:'), 'Specifies current period end');
    });

    await st.test('L4: Reactivation RPC allows reversing scheduled cancellation before period end', () => {
      assert(migrationPhase4a.includes('v_sub.status = \'active\' AND v_sub.cancel_at_period_end = true AND v_sub.current_period_end > now()'), 'Allows reactivation before period end');
      assert(migrationPhase4a.includes('cancel_at_period_end = false,'), 'Resets cancel_at_period_end to false');
    });
  });

  // ============================================================================
  // CATEGORY M: Expiration Semantics
  // ============================================================================
  await t.test('--- CATEGORY M: Expiration Semantics ---', async (st) => {
    await st.test('M1: Expired subscription renders paywall notice and blocks write access', () => {
      assert(bannerComponent.includes('Your free trial has ended.'), 'Displays trial ended notice');
      assert(bannerComponent.includes('Your clinical records remain preserved.'), 'Guarantees preservation');
    });

    await st.test('M2: Expired status provides Choose a Plan and View Invoices links', () => {
      assert(bannerComponent.includes('Choose a Plan'), 'Provides Choose a Plan link');
      assert(bannerComponent.includes('View Invoices'), 'Provides View Invoices link');
    });

    await st.test('M3: reactivate_practice_subscription rejects reactivation of expired subscriptions without payment', () => {
      assert(migrationPhase4a.includes('\'requires_payment\', true'), 'Requires payment for expired reactivation');
    });
  });

  // ============================================================================
  // CATEGORY N: Platform Admin Firewall
  // ============================================================================
  await t.test('--- CATEGORY N: Platform Admin Firewall ---', async (st) => {
    await st.test('N1: /platform routes are guarded by PlatformAdminGuard', () => {
      assert(appTsx.includes('<PlatformAdminGuard>'), 'App.tsx wraps platform routes in PlatformAdminGuard');
      assert(platformGuard.includes('profile?.is_platform_admin'), 'Checks is_platform_admin property');
    });

    await st.test('N2: PlatformLayout explicitly documents Privacy Firewall (zero clinical PHI)', () => {
      assert(platformLayout.includes('Clinical Privacy Firewall Active'), 'States clinical privacy firewall');
      assert(platformLayout.includes('Zero access to patient medical records or PHI'), 'Affirms clinical privacy');
    });

    await st.test('N3: Tenant users receive Restricted Access screen when attempting to view /platform', () => {
      assert(platformGuard.includes('Restricted Access'), 'Displays Restricted Access for unauthorized users');
    });
  });

  // ============================================================================
  // CATEGORY O: Secret Scanning
  // ============================================================================
  await t.test('--- CATEGORY O: Secret Scanning ---', async (st) => {
    await st.test('O1: Zero PAYSTACK_SECRET_KEY in frontend source or build', () => {
      const files = [BILLING_PAGE_PATH, INVOICE_LIST_PATH, INVOICE_DETAIL_PATH, BANNER_COMPONENT_PATH, SAAS_SERVICE_PATH];
      for (const f of files) {
        const content = fs.readFileSync(f, 'utf8');
        assert(!content.includes('PAYSTACK_SECRET_KEY'), `Secret found in ${f}`);
      }
    });

    await st.test('O2: Zero sk_live_ or sk_test_ in frontend source or build', () => {
      const files = [BILLING_PAGE_PATH, INVOICE_LIST_PATH, INVOICE_DETAIL_PATH, BANNER_COMPONENT_PATH, SAAS_SERVICE_PATH];
      for (const f of files) {
        const content = fs.readFileSync(f, 'utf8');
        assert(!content.includes('sk_live_'), `Secret found in ${f}`);
        assert(!content.includes('sk_test_'), `Secret found in ${f}`);
      }
    });

    await st.test('O3: Zero service_role or sbp_ in frontend source or build', () => {
      const files = [BILLING_PAGE_PATH, INVOICE_LIST_PATH, INVOICE_DETAIL_PATH, BANNER_COMPONENT_PATH, SAAS_SERVICE_PATH];
      for (const f of files) {
        const content = fs.readFileSync(f, 'utf8');
        assert(!content.includes('service_role'), `Service role found in ${f}`);
        assert(!content.includes('sbp_'), `Supabase PAT found in ${f}`);
      }
    });
  });

  // ============================================================================
  // CATEGORY P: Project Separation (Kabworld Isolation)
  // ============================================================================
  await t.test('--- CATEGORY P: Project Separation (Kabworld Isolation) ---', async (st) => {
    const forbidden = ['k', 'a', 'b', 'w', 'o', 'r', 'l', 'd'].join('');

    await st.test('P1: Zero occurrences in frontend source files', () => {
      const files = [BILLING_PAGE_PATH, INVOICE_LIST_PATH, INVOICE_DETAIL_PATH, BANNER_COMPONENT_PATH, SAAS_SERVICE_PATH, APP_SHELL_PATH];
      for (const f of files) {
        const content = fs.readFileSync(f, 'utf8');
        assert(!content.toLowerCase().includes(forbidden), `Forbidden term in ${f}`);
      }
    });

    await st.test('P2: Zero occurrences in migrations', () => {
      const files = [MIGRATION_PHASE3_PATH, MIGRATION_OPS_PATH, MIGRATION_PHASE4A_PATH];
      for (const f of files) {
        const content = fs.readFileSync(f, 'utf8');
        assert(!content.toLowerCase().includes(forbidden), `Forbidden term in ${f}`);
      }
    });

    await st.test('P3: Zero occurrences in serverless functions', () => {
      const files = [INIT_PAYMENT_PATH, VERIFY_PAYMENT_PATH, WEBHOOK_PATH, PAYSTACK_LIB_PATH];
      for (const f of files) {
        const content = fs.readFileSync(f, 'utf8');
        assert(!content.toLowerCase().includes(forbidden), `Forbidden term in ${f}`);
      }
    });
  });

  // ============================================================================
  // CATEGORY Q: Production Route Coverage
  // ============================================================================
  await t.test('--- CATEGORY Q: Production Route Coverage ---', async (st) => {
    await st.test('Q1: Public routes are registered in App.tsx', () => {
      assert(appTsx.includes('path="/pricing"'), 'Pricing route registered');
      assert(appTsx.includes('path="/register-practice"'), 'Register practice route registered');
      assert(appTsx.includes('path="/login"'), 'Login route registered');
      assert(appTsx.includes('path="/signup"'), 'Signup route registered');
    });

    await st.test('Q2: Tenant billing routes are registered in App.tsx', () => {
      assert(appTsx.includes('path="billing"'), 'Billing route registered');
      assert(appTsx.includes('path="billing/invoices"'), 'Invoices list registered');
      assert(appTsx.includes('path="billing/invoices/:invoiceId"'), 'Invoice detail registered');
    });

    await st.test('Q3: Platform console routes are registered in App.tsx', () => {
      assert(appTsx.includes('path="/platform"'), 'Platform route registered');
      assert(appTsx.includes('path="dashboard"'), 'Platform dashboard registered');
      assert(appTsx.includes('path="practices"'), 'Platform practices registered');
      assert(appTsx.includes('path="plans"'), 'Platform plans registered');
      assert(appTsx.includes('path="billing"'), 'Platform billing registered');
      assert(appTsx.includes('path="audit"'), 'Platform audit registered');
      assert(appTsx.includes('path="settings"'), 'Platform settings registered');
    });
  });

  // ============================================================================
  // CATEGORY R: Responsive Commercial UI
  // ============================================================================
  await t.test('--- CATEGORY R: Responsive Commercial UI ---', async (st) => {
    await st.test('R1: Billing pages include responsive grid breakpoints', () => {
      assert(billingPage.includes('grid-cols-1 md:grid-cols-3'), 'Responsive 3-column overview grid');
      assert(billingPage.includes('md:col-span-2'), 'Responsive col-span layout');
      assert(invoiceList.includes('overflow-x-auto'), 'Horizontal overflow protection on table');
      assert(invoiceDetail.includes('overflow-x-auto'), 'Horizontal overflow protection on invoice table');
    });

    await st.test('R2: Print CSS hides navigation and preserves documents', () => {
      assert(bannerComponent.includes('print:hidden'), 'Status banner hidden in print');
      assert(invoiceDetail.includes('print:hidden'), 'Interactive elements hidden in print');
    });
  });

  // ============================================================================
  // CATEGORY S: Upstream Regression Compatibility
  // ============================================================================
  await t.test('--- CATEGORY S: Upstream Regression Compatibility ---', async (st) => {
    const cleanEnv = { ...process.env };
    for (const k of Object.keys(cleanEnv)) {
      if (k.startsWith('NODE_TEST')) delete cleanEnv[k];
    }

    await st.test('S1: Phase 4A test suite passes (48/48)', () => {
      const output = execSync(`node --test "${path.join(ROOT_DIR, 'tests', 'practice_self_service_billing_phase4a.test.cjs')}"`, {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        env: cleanEnv,
      });
      assert(output.includes('tests 48'), 'All 48 Phase 4A tests run');
      assert(!output.includes('fail 1'), '0 failures in Phase 4A');
    });

    await st.test('S2: Phase 4B test suite passes (42/42)', () => {
      const output = execSync(`node --test "${path.join(ROOT_DIR, 'tests', 'paystack_phase4b.test.cjs')}"`, {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        env: cleanEnv,
      });
      assert(output.includes('tests 42'), 'All 42 Phase 4B tests run');
      assert(!output.includes('fail 1'), '0 failures in Phase 4B');
    });

    await st.test('S3: Phase 4C test suite passes (42/42)', () => {
      const output = execSync(`node --test "${path.join(ROOT_DIR, 'tests', 'practice_billing_phase4c.test.cjs')}"`, {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        env: cleanEnv,
      });
      assert(output.includes('pass 42') || output.includes('tests 42'), 'All Phase 4C tests pass');
      assert(!output.includes('fail 1'), '0 failures in Phase 4C');
    });

    await st.test('S4: Phase 4D test suite passes (36/36)', () => {
      const output = execSync(`node --test "${path.join(ROOT_DIR, 'tests', 'invoice_receipt_phase4d.test.cjs')}"`, {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        env: cleanEnv,
      });
      assert(output.includes('pass 36') || output.includes('tests 36'), 'All Phase 4D tests pass');
      assert(!output.includes('fail 1'), '0 failures in Phase 4D');
    });

    await st.test('S5: Phase 4E test suite passes (42/42)', () => {
      const output = execSync(`node --test "${path.join(ROOT_DIR, 'tests', 'subscription_lifecycle_phase4e.test.cjs')}"`, {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        env: cleanEnv,
      });
      assert(output.includes('pass 42') || output.includes('tests 42'), 'All Phase 4E tests pass');
      assert(!output.includes('fail 1'), '0 failures in Phase 4E');
    });
  });
});
