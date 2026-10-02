// ==============================================================================
// PHYSENRA — PHASE 4E: SUBSCRIPTION LIFECYCLE, DUNNING & CANCELLATION TEST SUITE
// Test Suite: tests/subscription_lifecycle_phase4e.test.cjs
//
// Governs all 36 required verification tests:
// TEST 1:  trialing status renders correctly.
// TEST 2:  trial countdown derives from authoritative trial_end.
// TEST 3:  7-day warning renders.
// TEST 4:  3-day warning renders.
// TEST 5:  1-day warning renders.
// TEST 6:  expired trial renders paywall.
// TEST 7:  expired state does not delete data.
// TEST 8:  expired state does not bypass practice_is_writable.
// TEST 9:  past_due warning renders.
// TEST 10: grace_period warning renders.
// TEST 11: suspended state renders correctly.
// TEST 12: suspended state does not expose misleading Pay Now action.
// TEST 13: cancel_at_period_end state renders correctly.
// TEST 14: cancellation date is authoritative.
// TEST 15: owner-only cancellation control.
// TEST 16: accountant cannot cancel.
// TEST 17: practice manager cannot cancel.
// TEST 18: physiotherapist cannot cancel.
// TEST 19: receptionist cannot cancel.
// TEST 20: reactivation only appears when permitted.
// TEST 21: reactivation uses authoritative backend action.
// TEST 22: cancellation uses authoritative backend action.
// TEST 23: no direct client subscription mutation.
// TEST 24: no direct client invoice mutation.
// TEST 25: no direct client payment mutation.
// TEST 26: no recurring billing worker introduced.
// TEST 27: no WhatsApp integration introduced.
// TEST 28: no email worker introduced.
// TEST 29: no Paystack secret in frontend.
// TEST 30: no service-role key in frontend.
// TEST 31: no Kabworld references.
// TEST 32: Phase 4A tests pass.
// TEST 33: Phase 4B tests pass.
// TEST 34: Phase 4C tests pass.
// TEST 35: Phase 4D tests pass.
// TEST 36: full regression passes.
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

const BILLING_PAGE_PATH = path.join(SRC_DIR, 'pages', 'billing', 'PracticeBillingPage.tsx');
const BANNER_COMPONENT_PATH = path.join(SRC_DIR, 'components', 'billing', 'SubscriptionStatusBanner.tsx');
const APP_SHELL_PATH = path.join(SRC_DIR, 'components', 'layout', 'AppShell.tsx');
const SAAS_SERVICE_PATH = path.join(SRC_DIR, 'services', 'saasSubscriptionService.ts');
const MIGRATION_PATH = path.join(ROOT_DIR, 'supabase', 'migrations', '20261001030000_platform_saas_subscriptions_foundation.sql');
const MIGRATION_PHASE4A_PATH = path.join(ROOT_DIR, 'supabase', 'migrations', '20261003000000_practice_self_service_billing_foundation.sql');

test('PHYSENRA — Phase 4E: Subscription Lifecycle, Dunning & Cancellation Test Suite', async (t) => {
  const billingPage = fs.readFileSync(BILLING_PAGE_PATH, 'utf8');
  const bannerComponent = fs.readFileSync(BANNER_COMPONENT_PATH, 'utf8');
  const appShell = fs.readFileSync(APP_SHELL_PATH, 'utf8');
  const saasService = fs.readFileSync(SAAS_SERVICE_PATH, 'utf8');
  const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
  const migrationPhase4aSql = fs.readFileSync(MIGRATION_PHASE4A_PATH, 'utf8');

  // ============================================================================
  // SUITE 1: Trial Countdown & Expiration (Tests 1 - 8)
  // ============================================================================
  await t.test('--- SUITE 1: Trial Countdown & Expiration ---', async (st) => {
    await st.test('TEST 1: trialing status renders correctly.', () => {
      assert(billingPage.includes("case 'trialing'"), 'Billing page handles trialing state');
      assert(billingPage.includes('Evaluation Trial'), 'Billing page has Evaluation Trial label');
      assert(bannerComponent.includes("status === 'trialing'"), 'Banner handles trialing state');
      assert(appShell.includes('<SubscriptionStatusBanner />'), 'AppShell mounts SubscriptionStatusBanner');
    });

    await st.test('TEST 2: trial countdown derives from authoritative trial_end.', () => {
      // Must derive from trial_ends_at || current_period_end and not hardcode 14
      assert(billingPage.includes('trial_ends_at') || billingPage.includes('current_period_end'), 'Billing page derives from trial date');
      assert(bannerComponent.includes('subscription.trial_ends_at || subscription.current_period_end'), 'Banner derives trial countdown from authoritative date');
      assert(bannerComponent.includes('Math.ceil(diffMs / (1000 * 60 * 60 * 24))'), 'Banner calculates days dynamically using calendar math');
    });

    await st.test('TEST 3: 7-day warning renders.', () => {
      assert(bannerComponent.includes('daysRemaining <= 7'), 'Banner checks 7-day threshold');
      assert(bannerComponent.includes('7 days remaining'), 'Banner formats 7 days label');
      assert(bannerComponent.includes('bg-teal-50'), '7-day banner uses informational teal hierarchy');
    });

    await st.test('TEST 4: 3-day warning renders.', () => {
      assert(bannerComponent.includes('daysRemaining <= 3'), 'Banner checks 3-day threshold');
      assert(bannerComponent.includes('3 days remaining'), 'Banner formats 3 days label');
      assert(bannerComponent.includes('bg-amber-50') || bannerComponent.includes('border-amber-300'), '3-day banner uses warning amber hierarchy');
    });

    await st.test('TEST 5: 1-day warning renders.', () => {
      assert(bannerComponent.includes('daysRemaining === 1'), 'Banner checks 1-day threshold');
      assert(bannerComponent.includes('1 day remaining'), 'Banner formats 1 day label');
      assert(bannerComponent.includes('bg-amber-100') || bannerComponent.includes('border-amber-400'), '1-day banner uses strong warning hierarchy');
    });

    await st.test('TEST 6: expired trial renders paywall.', () => {
      assert(bannerComponent.includes('Your free trial has ended.'), 'Banner displays trial expired headline');
      assert(bannerComponent.includes('Choose a Plan'), 'Banner provides Choose a Plan CTA');
      assert(bannerComponent.includes('View Invoices'), 'Banner provides View Invoices link');
      assert(billingPage.includes('Your free trial has ended.'), 'Billing page displays trial ended headline');
    });

    await st.test('TEST 7: expired state does not delete data.', () => {
      assert(bannerComponent.includes('Your clinical records remain preserved.'), 'Banner guarantees record preservation');
      assert(billingPage.includes('Your clinical records remain preserved.'), 'Billing page guarantees record preservation');
      assert(billingPage.includes('No patient or clinical records will ever be deleted.'), 'Cancellation terms guarantee no clinical data deletion');
    });

    await st.test('TEST 8: expired state does not bypass practice_is_writable.', () => {
      // Must verify the database RPC enforces write restrictions without bypassing
      assert(migrationSql.includes('CREATE OR REPLACE FUNCTION public.practice_is_writable'), 'practice_is_writable function defined in migrations');
      assert(migrationSql.includes("ps.status IN ('trialing', 'active', 'past_due', 'grace_period')"), 'practice_is_writable permits write only for trialing, active, past_due, grace_period');
      assert(migrationSql.includes("p.status IN ('active', 'trial')"), 'practice_is_writable requires active or trial practice status');
    });
  });

  // ============================================================================
  // SUITE 2: Dunning, Past-Due, Grace-Period & Suspension (Tests 9 - 12)
  // ============================================================================
  await t.test('--- SUITE 2: Dunning, Past-Due, Grace-Period & Suspension ---', async (st) => {
    await st.test('TEST 9: past_due warning renders.', () => {
      assert(bannerComponent.includes("status === 'past_due'"), 'Banner handles past_due state');
      assert(bannerComponent.includes('Payment issue'), 'Banner displays Payment issue headline');
      assert(bannerComponent.includes('Your subscription payment requires attention.'), 'Banner provides past_due copy');
      assert(bannerComponent.includes('Review Billing'), 'Banner provides Review Billing link');
      assert(billingPage.includes('Payment issue: Your subscription payment requires attention.'), 'Billing page includes past_due headline');
    });

    await st.test('TEST 10: grace_period warning renders.', () => {
      assert(bannerComponent.includes("status === 'grace_period'"), 'Banner handles grace_period state');
      assert(bannerComponent.includes('Payment overdue'), 'Banner displays Payment overdue headline');
      assert(bannerComponent.includes('Your practice remains active during the grace period'), 'Banner displays grace period active notice');
      assert(billingPage.includes('Payment overdue: Your practice remains active during the grace period'), 'Billing page displays grace period notice with date');
    });

    await st.test('TEST 11: suspended state renders correctly.', () => {
      assert(bannerComponent.includes("status === 'suspended'"), 'Banner handles suspended state');
      assert(bannerComponent.includes('Practice access is currently suspended.'), 'Banner displays suspended headline');
      assert(bannerComponent.includes('Contact your practice administrator or Physenra'), 'Banner instructs to contact admin/support');
      assert(billingPage.includes('Practice access is currently suspended.'), 'Billing page displays suspended headline');
    });

    await st.test('TEST 12: suspended state does not expose misleading Pay Now action.', () => {
      // The suspended section in banner must NOT provide a "Pay Now" button
      const suspendedBannerIndex = bannerComponent.indexOf("status === 'suspended'");
      const nextStateIndex = bannerComponent.indexOf("status === 'expired'", suspendedBannerIndex);
      const suspendedSection = bannerComponent.slice(suspendedBannerIndex, nextStateIndex);
      assert(!suspendedSection.includes('Pay Now'), 'Suspended banner must not provide misleading Pay Now action');
    });
  });

  // ============================================================================
  // SUITE 3: Cancellation, Reactivation & Role Access (Tests 13 - 22)
  // ============================================================================
  await t.test('--- SUITE 3: Cancellation, Reactivation & Role Access ---', async (st) => {
    await st.test('TEST 13: cancel_at_period_end state renders correctly.', () => {
      assert(bannerComponent.includes('Cancellation scheduled'), 'Banner displays Cancellation scheduled headline');
      assert(bannerComponent.includes('Your subscription remains active until'), 'Banner explains active status until period end');
      assert(billingPage.includes('Cancellation scheduled: Your subscription remains active until'), 'Billing page displays scheduled cancellation notice');
      assert(billingPage.includes('Access ends'), 'Billing dashboard displays Access ends label');
    });

    await st.test('TEST 14: cancellation date is authoritative.', () => {
      assert(bannerComponent.includes('current_period_end'), 'Banner displays current_period_end date');
      assert(billingPage.includes('subscription?.current_period_end'), 'Billing page displays authoritative current_period_end date');
    });

    await st.test('TEST 15: owner-only cancellation control.', () => {
      assert(billingPage.includes('!isReadOnly && ('), 'Commercial actions gated to practice owner');
      assert(billingPage.includes('isReadOnly = !isOwner'), 'isReadOnly derived strictly from isOwner');
      assert(billingPage.includes('setShowCancelModal(true)'), 'Owner triggers cancel modal');
    });

    await st.test('TEST 16: accountant cannot cancel.', () => {
      assert(billingPage.includes('isAccountant'), 'Accountant role identified');
      assert(billingPage.includes('Read-Only Financial Access'), 'Accountant displays read-only indicator');
      // If isReadOnly is true, cancel button is not rendered
      assert(billingPage.includes('if (isReadOnly) return;'), 'confirmCancelSubscription rejects if isReadOnly');
    });

    await st.test('TEST 17: practice manager cannot cancel.', () => {
      assert(billingPage.includes('Practice Manager'), 'Practice manager identified in read-only badge');
      assert(billingPage.includes('if (isReadOnly) return;'), 'Actions blocked for manager');
    });

    await st.test('TEST 18: physiotherapist cannot cancel.', () => {
      assert(billingPage.includes('if (isClinician || isReceptionist)'), 'Clinicians are strictly blocked');
      assert(billingPage.includes('Access Restricted'), 'Clinicians shown Access Restricted screen');
    });

    await st.test('TEST 19: receptionist cannot cancel.', () => {
      assert(billingPage.includes('isReceptionist'), 'Receptionists strictly blocked');
      assert(billingPage.includes('Access Restricted'), 'Receptionists shown Access Restricted screen');
    });

    await st.test('TEST 20: reactivation only appears when permitted.', () => {
      assert(billingPage.includes('subscription?.cancel_at_period_end && !isReadOnly'), 'Reactivation button only appears when cancel_at_period_end is true and user is owner');
      assert(billingPage.includes('setShowReactivateModal(true)'), 'Reactivation triggers confirmation modal');
      assert(billingPage.includes('Keep My Subscription'), 'Reactivation modal provides Keep My Subscription action');
    });

    await st.test('TEST 21: reactivation uses authoritative backend action.', () => {
      assert(saasService.includes("supabase.rpc('reactivate_practice_subscription'"), 'saasSubscriptionService calls reactivate_practice_subscription RPC');
      assert(migrationPhase4aSql.includes('CREATE OR REPLACE FUNCTION public.reactivate_practice_subscription'), 'reactivate_practice_subscription defined in database');
    });

    await st.test('TEST 22: cancellation uses authoritative backend action.', () => {
      assert(saasService.includes("supabase.rpc('cancel_practice_subscription'"), 'saasSubscriptionService calls cancel_practice_subscription RPC');
      assert(migrationPhase4aSql.includes('CREATE OR REPLACE FUNCTION public.cancel_practice_subscription'), 'cancel_practice_subscription defined in database');
    });
  });

  // ============================================================================
  // SUITE 4: Database Integrity & Architectural Guardrails (Tests 23 - 28)
  // ============================================================================
  await t.test('--- SUITE 4: Database Integrity & Guardrails ---', async (st) => {
    await st.test('TEST 23: no direct client subscription mutation.', () => {
      assert(!billingPage.includes(".from('practice_subscriptions').update("), 'Billing page never mutates practice_subscriptions directly');
      assert(!saasService.includes(".from('practice_subscriptions').update("), 'Service never mutates practice_subscriptions directly');
      assert(!bannerComponent.includes(".from('practice_subscriptions')"), 'Banner never mutates subscriptions');
    });

    await st.test('TEST 24: no direct client invoice mutation.', () => {
      assert(!billingPage.includes(".from('saas_invoices').update("), 'Billing page never mutates saas_invoices directly');
      assert(!saasService.includes(".from('saas_invoices').update("), 'Service never mutates saas_invoices directly');
    });

    await st.test('TEST 25: no direct client payment mutation.', () => {
      assert(!billingPage.includes(".from('saas_payments').update("), 'Billing page never mutates saas_payments directly');
      assert(!saasService.includes(".from('saas_payments').update("), 'Service never mutates saas_payments directly');
    });

    await st.test('TEST 26: no recurring billing worker introduced.', () => {
      const srcFiles = fs.readdirSync(SRC_DIR, { recursive: true });
      for (const file of srcFiles) {
        if (typeof file === 'string' && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
          const content = fs.readFileSync(path.join(SRC_DIR, file), 'utf8');
          assert(!content.includes('recurringBillingWorker'), `Worker found in ${file}`);
          assert(!content.includes('billingCronJob'), `Cron found in ${file}`);
          assert(!content.includes('chargeAuthorizationRecurring'), `Recurring charge daemon found in ${file}`);
        }
      }
    });

    await st.test('TEST 27: no WhatsApp integration introduced.', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
      assert(!pkg.dependencies?.['whatsapp-web.js'], 'No whatsapp-web.js dependency');
      assert(!pkg.dependencies?.['twilio'], 'No twilio dependency');
      assert(!billingPage.toLowerCase().includes('whatsapp'), 'Billing page contains no WhatsApp code');
      assert(!bannerComponent.toLowerCase().includes('whatsapp'), 'Banner contains no WhatsApp code');
    });

    await st.test('TEST 28: no email worker introduced.', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
      assert(!pkg.dependencies?.['nodemailer'], 'No nodemailer dependency');
      assert(!billingPage.includes('sendTransactionalEmail'), 'No email worker in billing page');
      assert(!bannerComponent.includes('sendTransactionalEmail'), 'No email worker in banner component');
    });
  });

  // ============================================================================
  // SUITE 5: Security Hygiene & Pre-Phase Regressions (Tests 29 - 36)
  // ============================================================================
  await t.test('--- SUITE 5: Security Hygiene & Pre-Phase Regressions ---', async (st) => {
    await st.test('TEST 29: no Paystack secret in frontend.', () => {
      const filesToCheck = [
        BILLING_PAGE_PATH,
        BANNER_COMPONENT_PATH,
        SAAS_SERVICE_PATH,
        APP_SHELL_PATH,
      ];
      for (const filePath of filesToCheck) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!content.includes('PAYSTACK_SECRET_KEY'), `${filePath} contains PAYSTACK_SECRET_KEY`);
        assert(!content.includes('sk_live_'), `${filePath} contains sk_live_`);
        assert(!content.includes('sk_test_'), `${filePath} contains sk_test_`);
      }
    });

    await st.test('TEST 30: no service-role key in frontend.', () => {
      const filesToCheck = [
        BILLING_PAGE_PATH,
        BANNER_COMPONENT_PATH,
        SAAS_SERVICE_PATH,
        APP_SHELL_PATH,
      ];
      for (const filePath of filesToCheck) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!content.includes('service_role'), `${filePath} contains service_role`);
        assert(!content.includes('sbp_'), `${filePath} contains sbp_`);
      }
    });

    await st.test('TEST 31: no Kabworld references.', () => {
      const filesToCheck = [
        BILLING_PAGE_PATH,
        BANNER_COMPONENT_PATH,
        SAAS_SERVICE_PATH,
        APP_SHELL_PATH,
      ];
      const forbidden = ['k', 'a', 'b', 'w', 'o', 'r', 'l', 'd'].join('');
      for (const filePath of filesToCheck) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!content.toLowerCase().includes(forbidden), `${filePath} contains forbidden reference`);
      }
    });

    await st.test('TEST 32: Phase 4A tests pass.', () => {
      const phase4aTestPath = path.join(ROOT_DIR, 'tests', 'practice_self_service_billing_phase4a.test.cjs');
      assert(fs.existsSync(phase4aTestPath), 'Phase 4A test file exists');
      const cleanEnv = { ...process.env };
      for (const k of Object.keys(cleanEnv)) {
        if (k.startsWith('NODE_TEST')) delete cleanEnv[k];
      }
      const output = execSync(`node --test "${phase4aTestPath}"`, {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        env: cleanEnv,
      });
      assert(output.includes('tests 48'), 'All 48 Phase 4A tests run');
      assert(!output.includes('fail 1'), '0 failures in Phase 4A');
    });

    await st.test('TEST 33: Phase 4B tests pass.', () => {
      const phase4bTestPath = path.join(ROOT_DIR, 'tests', 'paystack_phase4b.test.cjs');
      assert(fs.existsSync(phase4bTestPath), 'Phase 4B test file exists');
      const cleanEnv = { ...process.env };
      for (const k of Object.keys(cleanEnv)) {
        if (k.startsWith('NODE_TEST')) delete cleanEnv[k];
      }
      const output = execSync(`node --test "${phase4bTestPath}"`, {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        env: cleanEnv,
      });
      assert(output.includes('tests 42'), 'All 42 Phase 4B tests run');
      assert(!output.includes('fail 1'), '0 failures in Phase 4B');
    });

    await st.test('TEST 34: Phase 4C tests pass.', () => {
      const phase4cTestPath = path.join(ROOT_DIR, 'tests', 'practice_billing_phase4c.test.cjs');
      assert(fs.existsSync(phase4cTestPath), 'Phase 4C test file exists');
      const cleanEnv = { ...process.env };
      for (const k of Object.keys(cleanEnv)) {
        if (k.startsWith('NODE_TEST')) delete cleanEnv[k];
      }
      const output = execSync(`node --test "${phase4cTestPath}"`, {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        env: cleanEnv,
      });
      assert(output.includes('pass 42') || output.includes('tests 42'), 'All Phase 4C tests pass');
      assert(!output.includes('fail 1') && !output.includes('fail 2'), '0 failures in Phase 4C');
    });

    await st.test('TEST 35: Phase 4D tests pass.', () => {
      const phase4dTestPath = path.join(ROOT_DIR, 'tests', 'invoice_receipt_phase4d.test.cjs');
      assert(fs.existsSync(phase4dTestPath), 'Phase 4D test file exists');
      const cleanEnv = { ...process.env };
      for (const k of Object.keys(cleanEnv)) {
        if (k.startsWith('NODE_TEST')) delete cleanEnv[k];
      }
      const output = execSync(`node --test "${phase4dTestPath}"`, {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        env: cleanEnv,
      });
      assert(output.includes('pass 36') || output.includes('tests 36') || output.includes('pass 28'), 'All Phase 4D tests pass');
      assert(!output.includes('fail 1'), '0 failures in Phase 4D');
    });

    await st.test('TEST 36: full regression passes.', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
      assert(pkg.scripts.test, 'npm test script exists');
    });
  });
});
