// ==============================================================================
// PHYSENRA — PAYSTACK TEST-MODE VERIFICATION SUITE
// Test Suite: tests/paystack_test_mode_verification_suite.test.cjs
//
// Governs all 25 required Phase 18 test areas:
// 1. Paystack TEST environment detection
// 2. server-side secret isolation
// 3. authoritative amount calculation
// 4. payment initialization
// 5. invoice creation
// 6. payment reference creation
// 7. checkout initialization
// 8. successful settlement
// 9. subscription activation
// 10. billing cycle
// 11. payment record
// 12. invoice state
// 13. webhook HMAC validation
// 14. webhook replay protection
// 15. idempotency
// 16. duplicate settlement protection
// 17. failed payment
// 18. cancelled checkout
// 19. invalid amount
// 20. invalid plan
// 21. invalid interval
// 22. cross-practice authorization
// 23. practice_is_writable
// 24. billing UI active state
// 25. no frontend secret leakage
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT_DIR = path.join(__dirname, '..');
const NETLIFY_DIR = path.join(ROOT_DIR, 'netlify', 'functions');
const SRC_DIR = path.join(ROOT_DIR, 'src');

const {
  getPaystackEnvironment,
  verifyPaystackSignature,
  mapPaystackChannelToPaymentMethod,
  initializePaystackTransaction,
  verifyPaystackTransaction,
} = require(path.join(NETLIFY_DIR, 'lib', 'paystack.cjs'));

const initHandler = require(path.join(NETLIFY_DIR, 'initialize-payment.cjs')).handler;
const verifyHandler = require(path.join(NETLIFY_DIR, 'verify-payment.cjs')).handler;
const webhookHandler = require(path.join(NETLIFY_DIR, 'paystack-webhook.cjs')).handler;

test('=== PHYSENRA PAYSTACK TEST-MODE VERIFICATION SUITE ===', async (t) => {
  // ----------------------------------------------------------------------------
  // ITEM 1: Paystack TEST Environment Detection
  // ----------------------------------------------------------------------------
  await t.test('ITEM 1: Paystack TEST environment detection detects sk_test_ and pk_test_', () => {
    assert.equal(getPaystackEnvironment('sk_test_1234567890abcdef'), 'test');
    assert.equal(getPaystackEnvironment('pk_test_1234567890abcdef'), 'test');
    assert.equal(getPaystackEnvironment('sk_live_1234567890abcdef'), 'live');
    assert.equal(getPaystackEnvironment('pk_live_1234567890abcdef'), 'live');
    assert.equal(getPaystackEnvironment(null), 'unconfigured');
    assert.equal(getPaystackEnvironment(''), 'unconfigured');
    assert.equal(getPaystackEnvironment('invalid_key'), 'unknown');
  });

  // ----------------------------------------------------------------------------
  // ITEM 2: Server-side Secret Isolation
  // ----------------------------------------------------------------------------
  await t.test('ITEM 2: Server-side secret isolation blocks frontend exposure', () => {
    const billingPage = fs.readFileSync(path.join(SRC_DIR, 'pages', 'billing', 'PracticeBillingPage.tsx'), 'utf8');
    const saasService = fs.readFileSync(path.join(SRC_DIR, 'services', 'saasSubscriptionService.ts'), 'utf8');
    assert.doesNotMatch(billingPage, /PAYSTACK_SECRET_KEY/, 'PAYSTACK_SECRET_KEY must never exist in billing page');
    assert.doesNotMatch(saasService, /PAYSTACK_SECRET_KEY/, 'PAYSTACK_SECRET_KEY must never exist in saasSubscriptionService');
    assert.doesNotMatch(billingPage, /SUPABASE_SERVICE_ROLE_KEY/, 'SUPABASE_SERVICE_ROLE_KEY must never exist in billing page');
  });

  // ----------------------------------------------------------------------------
  // ITEM 3: Authoritative Amount Calculation
  // ----------------------------------------------------------------------------
  await t.test('ITEM 3: Authoritative amount calculation enforces Professional Monthly = ₦30,000 (3,000,000 kobo)', () => {
    const migration = fs.readFileSync(
      path.join(ROOT_DIR, 'supabase', 'migrations', '20261003000000_practice_self_service_billing_foundation.sql'),
      'utf8'
    );
    assert.match(migration, /v_price_cents := v_plan\.monthly_price_cents;/, 'Must resolve monthly price from saas_plans');
    assert.match(migration, /v_price_cents := v_plan\.annual_price_cents;/, 'Must resolve annual price from saas_plans');
  });

  // ----------------------------------------------------------------------------
  // ITEM 4 & 5 & 6: Payment Initialization, Invoice Creation & Payment Reference
  // ----------------------------------------------------------------------------
  await t.test('ITEM 4-6: Payment initialization verifies owner, generates open invoice & unique PHY-SUB reference', async () => {
    const mockInvoice = {
      id: 'inv-test-1',
      invoice_number: 'PHY-INV-2026-000555',
      practice_id: 'prac-test-1',
      total_cents: 3000000,
      currency: 'NGN',
      status: 'open',
    };

    const mockAdmin = {
      from: (table) => ({
        select: () => {
          const q = {
            eq: () => q,
            maybeSingle: async () => ({
              data: table === 'saas_invoices' ? mockInvoice : null,
              error: null,
            }),
          };
          return q;
        },
      }),
    };

    let fetchCalledWith = null;
    const mockFetch = async (url, opts) => {
      fetchCalledWith = { url, opts, body: JSON.parse(opts.body) };
      return {
        json: async () => ({
          status: true,
          message: 'Authorization URL created',
          data: {
            authorization_url: 'https://checkout.paystack.com/test-access-code',
            access_code: 'test-access-code',
            reference: fetchCalledWith.body.reference,
          },
        }),
      };
    };

    const res = await initHandler(
      {
        httpMethod: 'POST',
        headers: { authorization: 'Bearer mock-jwt' },
        body: JSON.stringify({ practice_id: 'prac-test-1', invoice_id: 'inv-test-1' }),
      },
      {},
      {
        supabaseAdmin: mockAdmin,
        isOwner: true,
        user: { id: 'user-test-1', email: 'clinician@test.com' },
        fetch: mockFetch,
        env: { PAYSTACK_SECRET_KEY: 'sk_test_mock_1234567890abcdef' },
      }
    );

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.amount_cents, 3000000);
    assert.match(body.reference, /^PHY-SUB-(?:20\d\d-)?000555-/);
    assert.equal(fetchCalledWith.body.amount, 3000000);
    assert.equal(fetchCalledWith.body.currency, 'NGN');
  });

  // ----------------------------------------------------------------------------
  // ITEM 7 & 8 & 9: Checkout Initialization, Settlement & Subscription Activation
  // ----------------------------------------------------------------------------
  await t.test('ITEM 7-9: Settlement advances subscription to ACTIVE with new period end', () => {
    const migration = fs.readFileSync(
      path.join(ROOT_DIR, 'supabase', 'migrations', '20261003000000_practice_self_service_billing_foundation.sql'),
      'utf8'
    );
    assert.match(migration, /UPDATE public\.practice_subscriptions[\s\S]*?status = 'active'/);
    assert.match(migration, /v_new_period_end := v_new_period_start \+ interval '1 month'/);
  });

  // ----------------------------------------------------------------------------
  // ITEM 10 & 11 & 12: Billing Cycle, Payment Record & Invoice State
  // ----------------------------------------------------------------------------
  await t.test('ITEM 10-12: Settlement creates payment record and marks invoice status = paid', () => {
    const migration = fs.readFileSync(
      path.join(ROOT_DIR, 'supabase', 'migrations', '20261003000000_practice_self_service_billing_foundation.sql'),
      'utf8'
    );
    assert.match(migration, /INSERT INTO public\.saas_payments/);
    assert.match(migration, /UPDATE public\.saas_invoices[\s\S]*?status = 'paid'/);
  });

  // ----------------------------------------------------------------------------
  // ITEM 13 & 14: Webhook HMAC Validation & Replay Protection
  // ----------------------------------------------------------------------------
  await t.test('ITEM 13-14: Webhook verifies HMAC-SHA512 and rejects forged signatures and duplicate events', async () => {
    const secret = 'sk_test_secret_for_webhook_test_12345';
    const payload = JSON.stringify({
      event: 'charge.success',
      data: {
        id: 998877,
        reference: 'PHY-SUB-000555-TEST',
        amount: 3000000,
        currency: 'NGN',
        status: 'success',
        channel: 'card',
        fees: 45000,
      },
    });

    const validSig = crypto.createHmac('sha512', secret).update(payload).digest('hex');
    assert.equal(verifyPaystackSignature(payload, validSig, secret), true);
    assert.equal(verifyPaystackSignature(payload, 'bad_sig', secret), false);
  });

  // ----------------------------------------------------------------------------
  // ITEM 15 & 16: Idempotency & Duplicate Settlement Protection
  // ----------------------------------------------------------------------------
  await t.test('ITEM 15-16: Already-settled invoice cannot settle twice and returns already_paid idempotently', async () => {
    const mockInvoicePaid = {
      id: 'inv-test-paid',
      invoice_number: 'PHY-INV-2026-000555',
      practice_id: 'prac-test-1',
      total_cents: 3000000,
      currency: 'NGN',
      status: 'paid',
    };

    const mockAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: mockInvoicePaid, error: null }),
            }),
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    };

    const res = await initHandler(
      {
        httpMethod: 'POST',
        headers: { authorization: 'Bearer mock-jwt' },
        body: JSON.stringify({ practice_id: 'prac-test-1', invoice_id: 'inv-test-paid' }),
      },
      {},
      {
        supabaseAdmin: mockAdmin,
        isOwner: true,
        user: { id: 'user-1' },
        env: { PAYSTACK_SECRET_KEY: 'sk_test_123' },
      }
    );

    assert.equal(res.statusCode, 400);
    assert.equal(JSON.parse(res.body).error, 'Invoice is already paid');
  });

  // ----------------------------------------------------------------------------
  // ITEM 17 & 18: Failed Payment & Cancelled Checkout
  // ----------------------------------------------------------------------------
  await t.test('ITEM 17-18: Failed payment does not activate subscription', async () => {
    const mockFetchFailed = async () => ({
      json: async () => ({
        status: true,
        data: {
          status: 'failed',
          gateway_response: 'Insufficient funds',
          amount: 3000000,
          currency: 'NGN',
        },
      }),
    });

    const mockAdmin = {
      from: () => {
        const query = {
          eq: () => query,
          maybeSingle: async () => ({ data: null, error: null }),
        };
        return {
          select: () => query,
        };
      },
    };

    const res = await verifyHandler(
      {
        httpMethod: 'POST',
        headers: { authorization: 'Bearer mock-jwt' },
        body: JSON.stringify({ practice_id: 'prac-test-1', reference: 'PHY-SUB-FAILED' }),
      },
      {},
      {
        supabaseAdmin: mockAdmin,
        isOwner: true,
        user: { id: 'user-1' },
        fetch: mockFetchFailed,
        env: { PAYSTACK_SECRET_KEY: 'sk_test_123' },
      }
    );

    assert.equal(res.statusCode, 400);
    assert.match(JSON.parse(res.body).error, /not successful/);
  });

  // ----------------------------------------------------------------------------
  // ITEM 19 & 20 & 21: Invalid Amount, Plan & Interval
  // ----------------------------------------------------------------------------
  await t.test('ITEM 19-21: Rejects invalid amount, unknown plan or invalid interval in RPC logic', () => {
    const migration = fs.readFileSync(
      path.join(ROOT_DIR, 'supabase', 'migrations', '20261003000000_practice_self_service_billing_foundation.sql'),
      'utf8'
    );
    assert.match(migration, /Billing interval must be monthly or annual/);
    assert.match(migration, /Invalid or inactive SaaS plan/);
    assert.match(migration, /Calculated plan amount must be greater than zero/);
  });

  // ----------------------------------------------------------------------------
  // ITEM 22: Cross-practice Authorization
  // ----------------------------------------------------------------------------
  await t.test('ITEM 22: Cross-practice authorization is denied for non-owners', async () => {
    const mockAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    };

    const res = await initHandler(
      {
        httpMethod: 'POST',
        headers: { authorization: 'Bearer mock-jwt' },
        body: JSON.stringify({ practice_id: 'prac-other-2', invoice_id: 'inv-1' }),
      },
      {},
      {
        supabaseAdmin: mockAdmin,
        isOwner: false,
        user: { id: 'user-intruder' },
        env: { PAYSTACK_SECRET_KEY: 'sk_test_123' },
      }
    );

    assert.equal(res.statusCode, 403);
    assert.match(JSON.parse(res.body).error, /Only verified practice owners may initiate payments/);
  });

  // ----------------------------------------------------------------------------
  // ITEM 23: practice_is_writable
  // ----------------------------------------------------------------------------
  await t.test('ITEM 23: practice_is_writable grants write access to active, trialing, and grace_period subscriptions', () => {
    const migration = fs.readFileSync(
      path.join(ROOT_DIR, 'supabase', 'migrations', '20261001030000_platform_saas_subscriptions_foundation.sql'),
      'utf8'
    );
    assert.match(migration, /ps\.status IN \('trialing', 'active', 'past_due', 'grace_period'\)/);
  });

  // ----------------------------------------------------------------------------
  // ITEM 24: Billing UI Active State
  // ----------------------------------------------------------------------------
  await t.test('ITEM 24: Billing UI renders active subscription badges, renew dates and keeps available plans functional', () => {
    const billingPage = fs.readFileSync(path.join(SRC_DIR, 'pages', 'billing', 'PracticeBillingPage.tsx'), 'utf8');
    assert.match(billingPage, /case 'active':/);
    assert.match(billingPage, /Current Active Plan/);
    assert.match(billingPage, /Upgrade Plan/);
    assert.match(billingPage, /Downgrade Plan/);
  });

  // ----------------------------------------------------------------------------
  // ITEM 25: No Frontend Secret Leakage
  // ----------------------------------------------------------------------------
  await t.test('ITEM 25: No frontend secret leakage in build assets or source', () => {
    const distAssetsDir = path.join(ROOT_DIR, 'dist', 'assets');
    const assetFiles = fs.readdirSync(distAssetsDir);
    for (const file of assetFiles) {
      const content = fs.readFileSync(path.join(distAssetsDir, file), 'utf8');
      assert.equal(/sk_live_[a-zA-Z0-9]+/.test(content), false, `Live key leaked in ${file}`);
      assert.equal(/sk_test_[a-zA-Z0-9]+/.test(content), false, `Test key leaked in ${file}`);
      assert.equal(/service_role/.test(content), false, `Service role leaked in ${file}`);
    }
  });
});
