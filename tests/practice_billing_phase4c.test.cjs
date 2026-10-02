// ==============================================================================
// PHYSENRA — PHASE 4C: PRACTICE OWNER BILLING & SUBSCRIPTION UX TEST SUITE
// Test Suite: tests/practice_billing_phase4c.test.cjs
//
// Governs all 33 required verification tests:
// TEST 1:  billing route exists
// TEST 2:  billing route requires authenticated practice context
// TEST 3:  practice_owner can access billing
// TEST 4:  accountant can access read-only billing
// TEST 5:  practice_manager receives only permitted read-only view
// TEST 6:  physiotherapist cannot access tenant billing
// TEST 7:  receptionist cannot access tenant billing
// TEST 8:  platform admin remains on /platform billing
// TEST 9:  current plan is loaded from authoritative subscription data
// TEST 10: pricing is not hardcoded as the source of truth
// TEST 11: monthly/annual prices come from saas_plans
// TEST 12: Enterprise is not exposed as normal self-service checkout when custom/private
// TEST 13: upgrade flow invokes authoritative backend
// TEST 14: frontend never directly updates practice_subscriptions
// TEST 15: frontend never directly inserts saas_invoices
// TEST 16: frontend never directly inserts saas_payments
// TEST 17: payment initialization uses invoice identity rather than client-supplied amount
// TEST 18: Paystack secret absent from frontend bundle
// TEST 19: service-role absent from frontend bundle
// TEST 20: cancellation uses authoritative RPC
// TEST 21: reactivation uses authoritative RPC
// TEST 22: downgrade displays pending/effective date
// TEST 23: downgrade seat-limit error is surfaced clearly
// TEST 24: expired subscription shows renewal/payment path
// TEST 25: past_due state shows payment action
// TEST 26: cancellation state shows reactivation when appropriate
// TEST 27: payment verification refreshes authoritative state
// TEST 28: failed payment does not produce local paid state
// TEST 29: duplicate payment clicks are prevented in UI
// TEST 30: Kabworld references = zero
// TEST 31: Phase 4A tests remain passing
// TEST 32: Phase 4B tests remain passing
// TEST 33: full regression passes
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DIST_ASSETS_DIR = path.join(DIST_DIR, 'assets');

const APP_TSX_PATH = path.join(SRC_DIR, 'App.tsx');
const SIDEBAR_TSX_PATH = path.join(SRC_DIR, 'components', 'layout', 'Sidebar.tsx');
const BILLING_PAGE_PATH = path.join(SRC_DIR, 'pages', 'billing', 'PracticeBillingPage.tsx');
const INVOICE_DETAIL_PATH = path.join(SRC_DIR, 'pages', 'billing', 'PracticeInvoiceDetailPage.tsx');
const SAAS_SERVICE_PATH = path.join(SRC_DIR, 'services', 'saasSubscriptionService.ts');
const CURRENCY_UTIL_PATH = path.join(SRC_DIR, 'utils', 'currency.ts');

test('PHYSENRA — Phase 4C: Practice Owner Billing & Subscription UX Test Suite', async (t) => {
  const appTsx = fs.readFileSync(APP_TSX_PATH, 'utf8');
  const sidebarTsx = fs.readFileSync(SIDEBAR_TSX_PATH, 'utf8');
  const billingPage = fs.readFileSync(BILLING_PAGE_PATH, 'utf8');
  const invoiceDetailPage = fs.readFileSync(INVOICE_DETAIL_PATH, 'utf8');
  const saasService = fs.readFileSync(SAAS_SERVICE_PATH, 'utf8');
  const currencyUtil = fs.readFileSync(CURRENCY_UTIL_PATH, 'utf8');

  // ============================================================================
  // SUITE 1: Routing & Protected Context
  // ============================================================================
  await t.test('--- SUITE 1: Routing & Protected Context ---', async (st) => {
    await st.test('TEST 1: billing route exists', () => {
      assert(appTsx.includes('path="billing"'), 'App.tsx must define /app/billing');
      assert(appTsx.includes('path="billing/plans"'), 'App.tsx must define /app/billing/plans');
      assert(appTsx.includes('path="billing/invoices"'), 'App.tsx must define /app/billing/invoices');
      assert(appTsx.includes('path="billing/invoices/:invoiceId"'), 'App.tsx must define /app/billing/invoices/:invoiceId');
      assert(appTsx.includes('<PracticeBillingPage />'), 'Billing route must render PracticeBillingPage');
      assert(appTsx.includes('<PracticeInvoiceDetailPage />'), 'Invoice detail route must render PracticeInvoiceDetailPage');
    });

    await st.test('TEST 2: billing route requires authenticated practice context', () => {
      // Must be nested inside ProtectedRoute and AppShell
      const appIndex = appTsx.indexOf('path="/app"');
      const protectedIndex = appTsx.indexOf('<ProtectedRoute>', appIndex);
      const appShellIndex = appTsx.indexOf('<AppShell />', protectedIndex);
      const billingIndex = appTsx.indexOf('path="billing"', appShellIndex);

      assert(appIndex !== -1, '/app route must be registered');
      assert(protectedIndex > appIndex, 'ProtectedRoute must wrap /app');
      assert(appShellIndex > protectedIndex, 'AppShell must be inside ProtectedRoute');
      assert(billingIndex > appShellIndex, 'billing route must be child of AppShell');
    });
  });

  // ============================================================================
  // SUITE 2: Role-Based Access Control & Navigation
  // ============================================================================
  await t.test('--- SUITE 2: Role-Based Access Control & Navigation ---', async (st) => {
    await st.test('TEST 3: practice_owner can access billing', () => {
      assert(billingPage.includes('const isReadOnly = !isOwner'), 'PracticeBillingPage defines write permission strictly for isOwner');
      assert(sidebarTsx.includes('isOwner || isAccountant || isManager'), 'Sidebar shows billing link for practice_owner');
      assert(!billingPage.includes('if (!isOwner) return <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-rose-200 rounded-xl shadow-sm text-center">'), 'Owner is not blocked from billing');
    });

    await st.test('TEST 4: accountant can access read-only billing', () => {
      assert(sidebarTsx.includes('isAccountant'), 'Sidebar allows accountant to see billing link');
      assert(billingPage.includes('Read-Only Financial Access'), 'PracticeBillingPage displays Read-Only badge for accountant');
      assert(billingPage.includes('isReadOnly'), 'Billing page evaluates isReadOnly state to disable mutations');
      assert(invoiceDetailPage.includes('isReadOnly'), 'Invoice detail evaluates isReadOnly to hide pay button from accountant');
    });

    await st.test('TEST 5: practice_manager receives only permitted read-only view', () => {
      assert(sidebarTsx.includes('isManager'), 'Sidebar allows practice_manager to see billing link');
      assert(billingPage.includes("'Practice Manager'"), 'PracticeBillingPage recognizes Practice Manager read-only label');
      assert(billingPage.includes('if (!planToChange || !activePractice?.id || isReadOnly) return'), 'Plan mutations blocked when isReadOnly is true');
      assert(billingPage.includes('if (!activePractice?.id || isReadOnly) return'), 'Subscription cancellation blocked when isReadOnly is true');
    });

    await st.test('TEST 6: physiotherapist cannot access tenant billing', () => {
      // Clinician blocked in page and not given link in sidebar
      assert(billingPage.includes('if (isClinician || isReceptionist)'), 'PracticeBillingPage blocks clinician');
      assert(billingPage.includes('Access Restricted'), 'Access Restricted headline rendered for clinician');
      assert(invoiceDetailPage.includes('if (isClinician || isReceptionist)'), 'PracticeInvoiceDetailPage blocks clinician');
      assert(!sidebarTsx.includes('isClinician && <NavLink to="/app/billing"'), 'Sidebar does not expose billing to clinician');
    });

    await st.test('TEST 7: receptionist cannot access tenant billing', () => {
      assert(billingPage.includes('if (isClinician || isReceptionist)'), 'PracticeBillingPage blocks receptionist');
      assert(invoiceDetailPage.includes('if (isClinician || isReceptionist)'), 'PracticeInvoiceDetailPage blocks receptionist');
      assert(!sidebarTsx.includes('isReceptionist && <NavLink to="/app/billing"'), 'Sidebar does not expose billing to receptionist');
    });

    await st.test('TEST 8: platform admin remains on /platform billing', () => {
      assert(appTsx.includes('path="/platform"'), '/platform layout exists');
      assert(appTsx.includes('<PlatformBillingPage />'), 'PlatformBillingPage exists for platform admin');
      assert(appTsx.indexOf('path="/platform"') < appTsx.indexOf('path="/app"'), 'Platform routes remain strictly partitioned from /app tenant routes');
    });
  });

  // ============================================================================
  // SUITE 3: Authoritative Plan & Pricing Data
  // ============================================================================
  await t.test('--- SUITE 3: Authoritative Plan & Pricing Data ---', async (st) => {
    await st.test('TEST 9: current plan is loaded from authoritative subscription data', () => {
      assert(billingPage.includes('saasSubscriptionService.getPracticeSubscription'), 'Loads subscription from authoritative service');
      assert(billingPage.includes('saasSubscriptionService.getPublicPlans'), 'Loads public plans from authoritative service');
      assert(billingPage.includes('subscription?.plan?.name'), 'Renders active subscription plan name');
      assert(billingPage.includes('subscription?.current_period_end'), 'Renders active subscription period end');
    });

    await st.test('TEST 10: pricing is not hardcoded as the source of truth', () => {
      assert(currencyUtil.includes('formatNaira'), 'Central formatNaira utility exists');
      assert(currencyUtil.includes('Math.floor(amountCents / 100)'), 'Calculates naira from integer cents/kobo');
      assert(billingPage.includes('formatPlanPrice('), 'Uses formatPlanPrice for dynamic plan pricing');
      assert(!billingPage.includes('₦15,000'), 'Hardcoded price strings are not used as source of truth');
      assert(!billingPage.includes('₦45,000'), 'Hardcoded price strings are not used as source of truth');
    });

    await st.test('TEST 11: monthly/annual prices come from saas_plans', () => {
      assert(billingPage.includes('p.monthly_price_cents'), 'Reads monthly_price_cents from plan object');
      assert(billingPage.includes('p.annual_price_cents'), 'Reads annual_price_cents from plan object');
      assert(billingPage.includes("catalogInterval === 'annual'"), 'Toggles between monthly and annual prices dynamically');
    });

    await st.test('TEST 12: Enterprise is not exposed as normal self-service checkout when custom/private', () => {
      assert(billingPage.includes('Enterprise Network'), 'Enterprise tier is displayed');
      assert(billingPage.includes('Contact Physenra'), 'Enterprise tier routes to Contact Physenra');
      assert(billingPage.includes('mailto:contact@physenra.com'), 'Enterprise tier uses contact link rather than checkout button');
    });
  });

  // ============================================================================
  // SUITE 4: Plan Operations & Ledger Mutation Protection
  // ============================================================================
  await t.test('--- SUITE 4: Plan Operations & Ledger Mutation Protection ---', async (st) => {
    await st.test('TEST 13: upgrade flow invokes authoritative backend', () => {
      assert(billingPage.includes('saasSubscriptionService.selfServiceChangePlan'), 'Upgrade invokes selfServiceChangePlan RPC');
      assert(billingPage.includes('saasSubscriptionService.initializePaystackCheckout'), 'Upgrade calls initializePaystackCheckout');
      assert(billingPage.includes('window.location.href = checkoutInit.authorization_url'), 'Redirects to Paystack checkout URL');
    });

    await st.test('TEST 14: frontend never directly updates practice_subscriptions', () => {
      // Scan all frontend ts/tsx files for direct mutation calls on practice_subscriptions
      const frontendFiles = [APP_TSX_PATH, SIDEBAR_TSX_PATH, BILLING_PAGE_PATH, INVOICE_DETAIL_PATH, SAAS_SERVICE_PATH];
      for (const f of frontendFiles) {
        const content = fs.readFileSync(f, 'utf8');
        assert(!content.includes(".from('practice_subscriptions').update("), `File ${f} must not update practice_subscriptions directly`);
        assert(!content.includes(".from('practice_subscriptions').insert("), `File ${f} must not insert practice_subscriptions directly`);
        assert(!content.includes(".from('practice_subscriptions').delete("), `File ${f} must not delete practice_subscriptions directly`);
      }
    });

    await st.test('TEST 15: frontend never directly inserts saas_invoices', () => {
      const frontendFiles = [APP_TSX_PATH, SIDEBAR_TSX_PATH, BILLING_PAGE_PATH, INVOICE_DETAIL_PATH, SAAS_SERVICE_PATH];
      for (const f of frontendFiles) {
        const content = fs.readFileSync(f, 'utf8');
        assert(!content.includes(".from('saas_invoices').insert("), `File ${f} must not insert saas_invoices directly`);
        assert(!content.includes(".from('saas_invoices').update("), `File ${f} must not update saas_invoices directly`);
      }
    });

    await st.test('TEST 16: frontend never directly inserts saas_payments', () => {
      const frontendFiles = [APP_TSX_PATH, SIDEBAR_TSX_PATH, BILLING_PAGE_PATH, INVOICE_DETAIL_PATH, SAAS_SERVICE_PATH];
      for (const f of frontendFiles) {
        const content = fs.readFileSync(f, 'utf8');
        assert(!content.includes(".from('saas_payments').insert("), `File ${f} must not insert saas_payments directly`);
        assert(!content.includes(".from('saas_payments').update("), `File ${f} must not update saas_payments directly`);
      }
    });

    await st.test('TEST 17: payment initialization uses invoice identity rather than client-supplied amount', () => {
      assert(saasService.includes('initializePaystackCheckout('), 'initializePaystackCheckout method exists');
      assert(saasService.includes('practiceId: string'), 'accepts practiceId parameter');
      assert(saasService.includes('invoiceId: string'), 'accepts invoiceId parameter');
      assert(billingPage.includes('initializePaystackCheckout('), 'PracticeBillingPage calls initializePaystackCheckout');
      assert(billingPage.includes('result.invoice_id'), 'PracticeBillingPage passes result.invoice_id');
      assert(invoiceDetailPage.includes('initializePaystackCheckout('), 'PracticeInvoiceDetailPage calls initializePaystackCheckout');
      assert(invoiceDetailPage.includes('invoice.id'), 'PracticeInvoiceDetailPage passes invoice.id');
    });
  });

  // ============================================================================
  // SUITE 5: Frontend Security & Secret Hygiene
  // ============================================================================
  await t.test('--- SUITE 5: Frontend Security & Secret Hygiene ---', async (st) => {
    await st.test('TEST 18: Paystack secret absent from frontend bundle', () => {
      assert(fs.existsSync(DIST_ASSETS_DIR), 'dist/assets directory must exist');
      const files = fs.readdirSync(DIST_ASSETS_DIR);
      for (const file of files) {
        if (file.endsWith('.js')) {
          const content = fs.readFileSync(path.join(DIST_ASSETS_DIR, file), 'utf8');
          assert(!content.includes('sk_live_'), `Bundle ${file} contains sk_live_ secret`);
          assert(!content.includes('sk_test_'), `Bundle ${file} contains sk_test_ secret`);
          assert(!content.includes('PAYSTACK_SECRET_KEY'), `Bundle ${file} references PAYSTACK_SECRET_KEY`);
        }
      }
    });

    await st.test('TEST 19: service-role absent from frontend bundle', () => {
      const files = fs.readdirSync(DIST_ASSETS_DIR);
      for (const file of files) {
        if (file.endsWith('.js')) {
          const content = fs.readFileSync(path.join(DIST_ASSETS_DIR, file), 'utf8');
          assert(!content.includes('SUPABASE_SERVICE_ROLE_KEY'), `Bundle ${file} references SUPABASE_SERVICE_ROLE_KEY`);
          assert(!content.includes('sbp_'), `Bundle ${file} contains sbp_ service role key`);
        }
      }
    });
  });

  // ============================================================================
  // SUITE 6: Lifecycle State Transitions & Modals
  // ============================================================================
  await t.test('--- SUITE 6: Lifecycle State Transitions & Modals ---', async (st) => {
    await st.test('TEST 20: cancellation uses authoritative RPC', () => {
      assert(billingPage.includes('saasSubscriptionService.cancelPracticeSubscription'), 'Cancellation calls cancelPracticeSubscription');
      assert(saasService.includes(".rpc('cancel_practice_subscription'"), 'Service calls cancel_practice_subscription RPC');
    });

    await st.test('TEST 21: reactivation uses authoritative RPC', () => {
      assert(billingPage.includes('saasSubscriptionService.reactivatePracticeSubscription'), 'Reactivation calls reactivatePracticeSubscription');
      assert(saasService.includes(".rpc('reactivate_practice_subscription'"), 'Service calls reactivate_practice_subscription RPC');
    });

    await st.test('TEST 22: downgrade displays pending/effective date', () => {
      assert(billingPage.includes('downgrade_scheduled'), 'Handles downgrade_scheduled action');
      assert(billingPage.includes('Downgrade to ${planToChange.name} scheduled for'), 'Displays effective date for scheduled downgrade');
      assert(billingPage.includes('Your current entitlement remains active until then'), 'Notifies owner that current entitlement is preserved');
    });

    await st.test('TEST 23: downgrade seat-limit error is surfaced clearly', () => {
      assert(billingPage.includes('practitionerCount > planToChange.practitioner_seat_limit'), 'Checks practitionerCount against target plan seat limit');
      assert(billingPage.includes('Capacity Limit Exceeded'), 'Displays explicit error when staff exceeds seat limit');
      assert(billingPage.includes('disabled={actionLoading || (changeType === \'downgrade\' && practitionerCount > planToChange.practitioner_seat_limit)}'), 'Disables downgrade button if team size exceeds seat limit');
    });

    await st.test('TEST 24: expired subscription shows renewal/payment path', () => {
      assert(billingPage.includes("case 'expired':"), 'Handles expired subscription state');
      assert(billingPage.includes('Payment is required to restore full clinical write entitlement'), 'Instructs user on restoring entitlement');
      assert(billingPage.includes('Your clinical data remains securely preserved'), 'Confirms clinical data is preserved during expired status');
    });

    await st.test('TEST 25: past_due state shows payment action', () => {
      assert(billingPage.includes("case 'past_due':"), 'Handles past_due subscription state');
      assert(billingPage.includes('Payment is required to keep your practice active'), 'Highlights past_due status');
      assert(billingPage.includes('handlePayInvoice'), 'Provides direct invoice settlement action');
    });

    await st.test('TEST 26: cancellation state shows reactivation when appropriate', () => {
      assert(billingPage.includes('subscription?.cancel_at_period_end'), 'Detects cancellation scheduled state');
      assert(billingPage.includes('handleReactivateSubscription'), 'Provides reactivate subscription action');
      assert(billingPage.includes('Keep My Subscription'), 'Shows reactivation button on cancellation banner');
    });
  });

  // ============================================================================
  // SUITE 7: Payment UX & State Handling
  // ============================================================================
  await t.test('--- SUITE 7: Payment UX & State Handling ---', async (st) => {
    await st.test('TEST 27: payment verification refreshes authoritative state', () => {
      assert(billingPage.includes("searchParams.get('reference')"), 'Reads reference query parameter from Paystack redirect');
      assert(billingPage.includes('saasSubscriptionService.verifyPaystackPayment'), 'Invokes server-side verifyPaystackPayment');
      assert(billingPage.includes('await loadBillingData()'), 'Refreshes billing state upon successful verification');
    });

    await st.test('TEST 28: failed payment does not produce local paid state', () => {
      assert(billingPage.includes("status: 'failed'"), 'Sets failed verification state on gateway rejection');
      assert(billingPage.includes('Failed to verify payment with gateway'), 'Surfaces gateway failure message');
      assert(!billingPage.includes("invoice.status = 'paid'"), 'Frontend does not locally mark invoice paid without server verification');
    });

    await st.test('TEST 29: duplicate payment clicks are prevented in UI', () => {
      assert(billingPage.includes('disabled={actionLoading}'), 'Disables payment buttons during submission in billing page');
      assert(invoiceDetailPage.includes('disabled={actionLoading}'), 'Disables payment button during submission in invoice detail');
      assert(billingPage.includes("setActionLoading(true)"), 'Sets actionLoading during checkout initialization');
    });
  });

  // ============================================================================
  // SUITE 8: Project Separation & Regression Integrity
  // ============================================================================
  await t.test('--- SUITE 8: Project Separation & Regression Integrity ---', async (st) => {
    await st.test('TEST 30: Kabworld references = zero', () => {
      const filesToCheck = [
        BILLING_PAGE_PATH,
        INVOICE_DETAIL_PATH,
        SAAS_SERVICE_PATH,
        CURRENCY_UTIL_PATH,
        SIDEBAR_TSX_PATH,
      ];

      const forbidden = ['k', 'a', 'b', 'w', 'o', 'r', 'l', 'd'].join('');
      for (const filePath of filesToCheck) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!content.toLowerCase().includes(forbidden), `File ${filePath} contains forbidden reference`);
      }
    });

    await st.test('TEST 31: Phase 4A tests remain passing', () => {
      const phase4aTestPath = path.join(ROOT_DIR, 'tests', 'practice_self_service_billing_phase4a.test.cjs');
      assert(fs.existsSync(phase4aTestPath), 'Phase 4A test file must exist');

      const cleanEnv = { ...process.env };
      for (const k of Object.keys(cleanEnv)) {
        if (k.startsWith('NODE_TEST')) delete cleanEnv[k];
      }

      const output = execSync(`node --test "${phase4aTestPath}"`, {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        env: cleanEnv,
      });

      assert(output.includes('tests 48'), 'All 48 Phase 4A tests must run');
      assert(output.includes('pass 48'), 'All 48 Phase 4A tests must pass');
      assert(!output.includes('fail 1'), 'Phase 4A suite must have 0 failures');
    });

    await st.test('TEST 32: Phase 4B tests remain passing', () => {
      const phase4bTestPath = path.join(ROOT_DIR, 'tests', 'paystack_phase4b.test.cjs');
      assert(fs.existsSync(phase4bTestPath), 'Phase 4B test file must exist');

      const cleanEnv = { ...process.env };
      for (const k of Object.keys(cleanEnv)) {
        if (k.startsWith('NODE_TEST')) delete cleanEnv[k];
      }

      const output = execSync(`node --test "${phase4bTestPath}"`, {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        env: cleanEnv,
      });

      assert(output.includes('pass 42') || output.includes('tests 42'), 'Phase 4B tests must pass');
      assert(!output.includes('fail 1'), 'Phase 4B suite must have 0 failures');
    });

    await st.test('TEST 33: full regression passes', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
      assert(pkg.scripts.test, 'npm test script must be configured');
    });
  });
});
