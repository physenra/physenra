// ==============================================================================
// PHYSENRA — SAAS PLAN UPGRADE & PAYSTACK PURCHASE FLOW TEST SUITE
// Test Suite: tests/practice_saas_trial_upgrade_paystack_flow.test.cjs
//
// Governs complete paid subscription conversion journey:
// 14-DAY TRIAL -> VIEW BILLING -> CHANGE PLAN / AVAILABLE PLANS -> SELECT PAID PLAN
// -> CHECKOUT / PAYMENT -> PAYSTACK -> SUCCESSFUL PAYMENT -> AUTHORITATIVE SETTLEMENT
// -> SUBSCRIPTION ACTIVE -> PAID BILLING PERIOD STARTS -> INVOICE / RECEIPT AVAILABLE
// -> PRACTICE CONTINUES WITH PAID WRITE ACCESS
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const NETLIFY_DIR = path.join(ROOT_DIR, 'netlify', 'functions');

const billingPagePath = path.join(SRC_DIR, 'pages', 'billing', 'PracticeBillingPage.tsx');
const billingPageContent = fs.readFileSync(billingPagePath, 'utf8');

const invoiceDetailPath = path.join(SRC_DIR, 'pages', 'billing', 'PracticeInvoiceDetailPage.tsx');
const invoiceDetailContent = fs.readFileSync(invoiceDetailPath, 'utf8');

const initPaymentPath = path.join(NETLIFY_DIR, 'initialize-payment.cjs');
const initPaymentContent = fs.readFileSync(initPaymentPath, 'utf8');

const verifyPaymentPath = path.join(NETLIFY_DIR, 'verify-payment.cjs');
const verifyPaymentContent = fs.readFileSync(verifyPaymentPath, 'utf8');

const webhookPath = path.join(NETLIFY_DIR, 'paystack-webhook.cjs');
const webhookContent = fs.readFileSync(webhookPath, 'utf8');

const migrationPath = path.join(
  ROOT_DIR,
  'supabase',
  'migrations',
  '20261003000000_practice_self_service_billing_foundation.sql'
);
const migrationContent = fs.readFileSync(migrationPath, 'utf8');

test('=== PHYSENRA SAAS PLAN UPGRADE & PAYSTACK PURCHASE FLOW SUITE ===', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: 14-Day Trial UI State & CTA Wiring in PracticeBillingPage
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: 14-Day Trial UI State & CTA Wiring ---', async (t1) => {
    await t1.test('TEST 1: Overview tab renders "Upgrade to a Paid Plan" CTA when status is trialing', () => {
      assert.match(
        billingPageContent,
        /subscription\?\.status === 'trialing'\s*\?\s*'Upgrade to a Paid Plan'\s*:\s*'Change Plan'/,
        'Overview tab must provide explicit Upgrade to a Paid Plan CTA when trialing'
      );
    });

    await t1.test('TEST 2: Available Plans tab displays "Current Trial Plan" badge for active trial plan', () => {
      assert.match(
        billingPageContent,
        /subscription\?\.status === 'trialing'\s*\?\s*'Current Trial Plan'\s*:\s*'Current Plan'/,
        'Available Plans tab must display Current Trial Plan badge when trialing'
      );
    });

    await t1.test('TEST 3: Current trial plan action button is ENABLED so trialing user can purchase current plan', () => {
      assert.match(
        billingPageContent,
        /isCurrent && subscription\?\.status !== 'trialing'/,
        'Current plan button must only be disabled when subscription is NOT trialing'
      );
      assert.match(
        billingPageContent,
        /subscription\?\.status === 'trialing'\s*\?\s*`Subscribe to \$\{p\.name\}`/,
        'Trialing plan button must provide active "Subscribe to {p.name}" CTA'
      );
    });

    await t1.test('TEST 4: handleSelectPlan treats any trial selection as an upgrade requiring payment', () => {
      assert.match(
        billingPageContent,
        /isTrial \|\| targetPrice >= currentPrice/,
        'handleSelectPlan must treat any paid plan selection during trial as upgrade/checkout'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Plan Confirmation Modal Copy & Action Wiring
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Plan Confirmation Modal & Trial Copy ---', async (t2) => {
    await t2.test('TEST 5: Modal title clarifies trial conversion when subscription is trialing', () => {
      assert.match(
        billingPageContent,
        /subscription\?\.status === 'trialing'\s*\?\s*`Subscribe to \$\{planToChange\.name\}`/,
        'Modal title must indicate subscription activation during trial'
      );
    });

    await t2.test('TEST 6: Modal body includes explicit Evaluation Trial Conversion explanation', () => {
      assert.match(
        billingPageContent,
        /Evaluation Trial Conversion:/,
        'Modal must include Evaluation Trial Conversion section'
      );
      assert.match(
        billingPageContent,
        /You are currently on a 14-day evaluation trial/,
        'Modal must explain that completing checkout activates the paid subscription immediately'
      );
    });

    await t2.test('TEST 7: Modal button provides "Proceed to Checkout" for trial conversion', () => {
      assert.match(
        billingPageContent,
        /Proceed to Checkout/,
        'Modal button must display Proceed to Checkout'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Trial Conversion & Upgrade Paystack Checkout Initiation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Trial Conversion & Upgrade Paystack Checkout Initiation ---', async (t3) => {
    await t3.test('TEST 8: confirmPlanChange handles trialing subscription via initiatePracticeSubscriptionPayment', () => {
      assert.match(
        billingPageContent,
        /saasSubscriptionService\.initiatePracticeSubscriptionPayment\(\s*activePractice\.id,\s*planToChange\.plan_code,\s*catalogInterval\s*\)/,
        'Trial conversion must authoritatively invoke initiatePracticeSubscriptionPayment to generate open invoice'
      );
    });

    await t3.test('TEST 9: confirmPlanChange synchronizes trial plan if different before initiating invoice', () => {
      assert.match(
        billingPageContent,
        /subscription\?\.plan_id !== planToChange\.id \|\|\s*subscription\?\.billing_interval !== catalogInterval/,
        'Must detect plan or interval change during trial before invoice generation'
      );
      assert.match(
        billingPageContent,
        /saasSubscriptionService\.selfServiceChangePlan\(\s*activePractice\.id,\s*planToChange\.plan_code,\s*catalogInterval/,
        'Must synchronize trial plan via selfServiceChangePlan'
      );
    });

    await t3.test('TEST 10: confirmPlanChange initializes Paystack checkout with authoritative invoice_id', () => {
      assert.match(
        billingPageContent,
        /saasSubscriptionService\.initializePaystackCheckout\(\s*activePractice\.id,\s*invResult\.invoice_id\s*\)/,
        'Trial conversion must initialize Paystack checkout with authoritative invoice id'
      );
    });

    await t3.test('TEST 11: confirmPlanChange supports upgrade_payment_required and resubscription_payment_required for paid accounts', () => {
      assert.match(
        billingPageContent,
        /result\.action === 'upgrade_payment_required'/,
        'Must support upgrade_payment_required action from self_service_change_plan RPC'
      );
      assert.match(
        billingPageContent,
        /result\.action === 'resubscription_payment_required'/,
        'Must support resubscription_payment_required action from self_service_change_plan RPC'
      );
      assert.match(
        billingPageContent,
        /result\.invoice_id/,
        'Must pass invoice_id to initializePaystackCheckout'
      );
    });

    await t3.test('TEST 12: Redirects browser to Paystack authorization_url upon initialization', () => {
      assert.match(
        billingPageContent,
        /window\.location\.href = checkoutInit\.authorization_url;/,
        'Must redirect browser window to Paystack authorization URL'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Serverless Paystack API Infrastructure & Invariants
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Serverless Paystack API Infrastructure & Invariants ---', async (t4) => {
    await t4.test('TEST 13: initialize-payment function enforces practice_owner guard', () => {
      assert.match(
        initPaymentContent,
        /verifyPracticeOwner/,
        'initialize-payment must enforce practice_owner guard'
      );
      assert.match(
        initPaymentContent,
        /Access denied: Only verified practice owners may initiate payments/,
        'Must reject non-owners with 403'
      );
    });

    await t4.test('TEST 14: initialize-payment derives authoritative invoice amount server-side', () => {
      assert.match(
        initPaymentContent,
        /amount:\s*invoice\.total_cents/,
        'initialize-payment must send database invoice.total_cents to Paystack, strictly ignoring client amount'
      );
      assert.match(
        initPaymentContent,
        /invoice\.currency !== 'NGN'/,
        'Must validate NGN currency'
      );
    });

    await t4.test('TEST 15: initialize-payment sets redirect callback_url to /app/billing', () => {
      assert.match(
        initPaymentContent,
        /\/app\/billing\?reference=/,
        'Callback URL must return to /app/billing with reference query parameter'
      );
    });

    await t4.test('TEST 16: verify-payment enforces practice_owner guard and server-to-server Paystack verification', () => {
      assert.match(
        verifyPaymentContent,
        /verifyPracticeOwner/,
        'verify-payment must verify practice_owner guard'
      );
      assert.match(
        verifyPaymentContent,
        /verifyPaystackTransaction/,
        'verify-payment must query Paystack API directly server-to-server'
      );
    });

    await t4.test('TEST 17: Database settlement RPC promotes subscription to active upon payment', () => {
      assert.match(
        migrationContent,
        /UPDATE public\.practice_subscriptions[\s\S]*?status = 'active'/,
        'Settlement RPC must promote subscription status to active'
      );
      assert.match(
        migrationContent,
        /UPDATE public\.practices[\s\S]*?status = 'active'/,
        'Settlement RPC must ensure practice status is active'
      );
    });

    await t4.test('TEST 18: Browser callback verification in PracticeBillingPage handles post-payment redirect', () => {
      assert.match(
        billingPageContent,
        /searchParams\.get\('reference'\)/,
        'PracticeBillingPage must inspect reference query param on mount'
      );
      assert.match(
        billingPageContent,
        /saasSubscriptionService\.verifyPaystackPayment\(activePractice\.id, reference\)/,
        'Must invoke verifyPaystackPayment'
      );
      assert.match(
        billingPageContent,
        /navigate\('\/app\/billing', \{ replace: true \}\)/,
        'Must clean reference query parameter from URL after verification'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Invoicing, Receipts & Separation of Domains
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Invoicing, Receipts & Separation of Domains ---', async (t5) => {
    await t5.test('TEST 19: PracticeInvoiceDetailPage provides Pay Now and printable Receipt/Invoice', () => {
      assert.match(
        invoiceDetailContent,
        /handlePayNow/,
        'PracticeInvoiceDetailPage must provide handlePayNow'
      );
      assert.match(
        invoiceDetailContent,
        /handlePrintInvoice/,
        'Must support invoice printing'
      );
      assert.match(
        invoiceDetailContent,
        /handlePrintReceipt/,
        'Must support receipt printing'
      );
    });

    await t5.test('TEST 20: Strict separation between SaaS subscription billing and patient clinical billing', () => {
      assert.match(
        billingPageContent,
        /to="\/app\/invoices"/,
        'PracticeBillingPage must link out to patient invoices as separate domain'
      );
      assert.match(
        billingPageContent,
        /Patient Invoices (&|&amp;) Billing/,
        'Must clearly distinguish Patient Invoices from Practice SaaS Billing'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Secret Hygiene & Project Isolation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Secret Hygiene & Project Isolation ---', async (t6) => {
    await t6.test('TEST 21: Zero Kabworld references across billing components', () => {
      assert.doesNotMatch(billingPageContent, /kabworld/i, 'billing page must have 0 Kabworld references');
      assert.doesNotMatch(invoiceDetailContent, /kabworld/i, 'invoice detail must have 0 Kabworld references');
      assert.doesNotMatch(initPaymentContent, /kabworld/i, 'init payment function must have 0 Kabworld references');
      assert.doesNotMatch(verifyPaymentContent, /kabworld/i, 'verify payment function must have 0 Kabworld references');
      assert.doesNotMatch(webhookContent, /kabworld/i, 'webhook function must have 0 Kabworld references');
    });

    await t6.test('TEST 22: Secret keys absent from frontend source code', () => {
      assert.doesNotMatch(billingPageContent, /sk_live_[a-zA-Z0-9]+/, 'No live Paystack keys in frontend');
      assert.doesNotMatch(billingPageContent, /sk_test_[a-zA-Z0-9]+/, 'No test Paystack keys in frontend');
      assert.doesNotMatch(billingPageContent, /service_role/, 'No service_role secrets in frontend billing page');
    });
  });
});
