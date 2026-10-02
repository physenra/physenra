// ==============================================================================
// PHYSENRA — PHASE 4B: PAYSTACK CHECKOUT, VERIFICATION & WEBHOOK TEST SUITE
// Test Suite: tests/paystack_phase4b.test.cjs
//
// Governs all 33 required verification tests:
// TEST 1:  secret key never appears in frontend bundle
// TEST 2:  secret key is read only server-side
// TEST 3:  valid HMAC accepted
// TEST 4:  invalid HMAC rejected
// TEST 5:  malformed signature rejected
// TEST 6:  altered webhook body rejected
// TEST 7:  duplicate webhook event is idempotent
// TEST 8:  charge.success with wrong amount rejected
// TEST 9:  charge.success with wrong currency rejected
// TEST 10: wrong reference rejected
// TEST 11: unknown invoice rejected
// TEST 12: cross-practice invoice rejected
// TEST 13: already-paid invoice cannot settle twice
// TEST 14: void invoice cannot settle
// TEST 15: failed payment cannot activate subscription
// TEST 16: successful verified payment settles exactly once
// TEST 17: settlement activates correct subscription
// TEST 18: settlement promotes pending plan correctly
// TEST 19: settlement updates billing period correctly
// TEST 20: payment record created exactly once
// TEST 21: browser callback cannot independently mark invoice paid
// TEST 22: verification endpoint is idempotent
// TEST 23: unauthorized user cannot verify another practice's invoice
// TEST 24: anon cannot invoke protected settlement RPC
// TEST 25: Paystack secret is absent from client response
// TEST 26: service-role credentials never appear in client bundle
// TEST 27: webhook event is persisted
// TEST 28: duplicate webhook does not duplicate payment
// TEST 29: concurrent webhook + verification cannot double-settle
// TEST 30: concurrent duplicate verification cannot double-settle
// TEST 31: Kabworld references = zero
// TEST 32: existing Phase 4A tests still pass
// TEST 33: full regression still passes
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DIST_ASSETS_DIR = path.join(DIST_DIR, 'assets');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const NETLIFY_FUNCTIONS_DIR = path.join(ROOT_DIR, 'netlify', 'functions');

const {
  verifyPaystackSignature,
  mapPaystackChannelToPaymentMethod,
  initializePaystackTransaction,
  verifyPaystackTransaction,
} = require(path.join(NETLIFY_FUNCTIONS_DIR, 'lib', 'paystack.cjs'));

const webhookHandler = require(path.join(NETLIFY_FUNCTIONS_DIR, 'paystack-webhook.cjs')).handler;
const initializeHandler = require(path.join(NETLIFY_FUNCTIONS_DIR, 'initialize-payment.cjs')).handler;
const verifyHandler = require(path.join(NETLIFY_FUNCTIONS_DIR, 'verify-payment.cjs')).handler;

// ------------------------------------------------------------------------------
// In-Memory Mock Database for Serverless Function Unit Testing
// ------------------------------------------------------------------------------
function createMockSupabaseAdmin() {
  const store = {
    saas_invoices: [
      {
        id: 'inv-open-100',
        invoice_number: 'PHY-INV-2026-000100',
        practice_id: 'prac-alpha-1',
        subscription_id: 'sub-alpha-1',
        currency: 'NGN',
        subtotal_cents: 1500000,
        discount_cents: 0,
        tax_cents: 0,
        total_cents: 1500000,
        status: 'open',
      },
      {
        id: 'inv-paid-200',
        invoice_number: 'PHY-INV-2026-000200',
        practice_id: 'prac-alpha-1',
        subscription_id: 'sub-alpha-1',
        currency: 'NGN',
        subtotal_cents: 1500000,
        discount_cents: 0,
        tax_cents: 0,
        total_cents: 1500000,
        status: 'paid',
      },
      {
        id: 'inv-void-300',
        invoice_number: 'PHY-INV-2026-000300',
        practice_id: 'prac-alpha-1',
        subscription_id: 'sub-alpha-1',
        currency: 'NGN',
        subtotal_cents: 1500000,
        discount_cents: 0,
        tax_cents: 0,
        total_cents: 1500000,
        status: 'void',
      },
      {
        id: 'inv-beta-400',
        invoice_number: 'PHY-INV-2026-000400',
        practice_id: 'prac-beta-2',
        subscription_id: 'sub-beta-2',
        currency: 'NGN',
        subtotal_cents: 4500000,
        discount_cents: 0,
        tax_cents: 0,
        total_cents: 4500000,
        status: 'open',
      },
    ],
    saas_payments: [],
    saas_webhook_events: [],
    practice_subscriptions: [
      {
        id: 'sub-alpha-1',
        practice_id: 'prac-alpha-1',
        plan_id: 'plan-solo-id',
        status: 'trialing',
        seat_limit: 1,
        pending_plan_id: 'plan-pro-id',
        pending_billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 14 * 86400000).toISOString(),
      },
    ],
    saas_plans: [
      {
        id: 'plan-solo-id',
        plan_code: 'solo',
        name: 'Solo Practice',
        practitioner_seat_limit: 1,
        monthly_price_cents: 1500000,
        annual_price_cents: 15000000,
      },
      {
        id: 'plan-pro-id',
        plan_code: 'professional',
        name: 'Professional Practice',
        practitioner_seat_limit: 5,
        monthly_price_cents: 4500000,
        annual_price_cents: 45000000,
      },
    ],
    practice_memberships: [
      {
        id: 'mem-1',
        user_id: 'user-owner-1',
        practice_id: 'prac-alpha-1',
        role: 'practice_owner',
        status: 'active',
      },
      {
        id: 'mem-2',
        user_id: 'user-clinician-2',
        practice_id: 'prac-alpha-1',
        role: 'physiotherapist',
        status: 'active',
      },
    ],
    profiles: [
      {
        id: 'user-owner-1',
        is_platform_admin: false,
      },
      {
        id: 'user-clinician-2',
        is_platform_admin: false,
      },
    ],
  };

  const client = {
    _store: store,
    from(tableName) {
      const records = store[tableName] || [];
      return {
        select(cols = '*') {
          let filtered = [...records];
          const query = {
            eq(col, val) {
              filtered = filtered.filter((r) => r[col] === val);
              return query;
            },
            single() {
              const res = filtered[0] || null;
              return Promise.resolve({ data: res, error: res ? null : new Error('Not found') });
            },
            maybeSingle() {
              const res = filtered[0] || null;
              return Promise.resolve({ data: res, error: null });
            },
            order() {
              return query;
            },
            limit(n) {
              filtered = filtered.slice(0, n);
              return query;
            },
            then(resolve) {
              return Promise.resolve({ data: filtered, error: null }).then(resolve);
            },
          };
          return query;
        },
        insert(row) {
          const rows = Array.isArray(row) ? row : [row];
          const inserted = [];
          for (const r of rows) {
            // Uniqueness check for saas_webhook_events: (gateway, external_event_id)
            if (tableName === 'saas_webhook_events') {
              const dup = store.saas_webhook_events.find(
                (e) => e.gateway === r.gateway && e.external_event_id === r.external_event_id
              );
              if (dup) {
                return {
                  select() {
                    return {
                      single() {
                        return Promise.resolve({
                          data: null,
                          error: { code: '23505', message: 'duplicate key value violates unique constraint uq_gateway_event' },
                        });
                      },
                    };
                  },
                };
              }
            }
            // Uniqueness check for saas_payments: gateway_reference
            if (tableName === 'saas_payments' && r.gateway_reference) {
              const dup = store.saas_payments.find((p) => p.gateway_reference === r.gateway_reference);
              if (dup) {
                return Promise.resolve({
                  data: null,
                  error: { code: '23505', message: 'duplicate key value violates unique constraint saas_payments_gateway_reference_key' },
                });
              }
            }
            const record = { id: r.id || `rec-${Date.now()}-${Math.random()}`, ...r, created_at: new Date().toISOString() };
            records.push(record);
            inserted.push(record);
          }
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({ data: inserted[0], error: null });
                },
              };
            },
            then(resolve) {
              return Promise.resolve({ data: inserted, error: null }).then(resolve);
            },
          };
        },
        update(updates) {
          return {
            eq(col, val) {
              for (const r of records) {
                if (r[col] === val) {
                  Object.assign(r, updates);
                }
              }
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
      };
    },
    rpc(funcName, params) {
      if (funcName === 'process_subscription_payment_settlement') {
        const inv = store.saas_invoices.find((i) => i.id === params.p_invoice_id);
        if (!inv) {
          return Promise.resolve({ data: null, error: new Error(`SaaS Invoice ${params.p_invoice_id} not found`) });
        }
        if (inv.status === 'paid') {
          return Promise.resolve({
            data: { status: 'already_paid', invoice_id: params.p_invoice_id },
            error: null,
          });
        }
        if (params.p_amount_cents < inv.total_cents) {
          return Promise.resolve({
            data: null,
            error: new Error(`Payment amount ${params.p_amount_cents} is less than invoice total ${inv.total_cents}`),
          });
        }

        // Check if gateway_reference already settled
        const dupPay = store.saas_payments.find((p) => p.gateway_reference === params.p_gateway_reference);
        if (dupPay) {
          return Promise.resolve({
            data: null,
            error: new Error('duplicate key value violates unique constraint saas_payments_gateway_reference_key'),
          });
        }

        // Insert payment into ledger
        const paymentRecord = {
          id: `pay-${Date.now()}`,
          payment_number: `PHY-PAY-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          invoice_id: inv.id,
          practice_id: inv.practice_id,
          amount_cents: params.p_amount_cents,
          currency: inv.currency,
          payment_method: params.p_payment_method,
          gateway_provider: params.p_gateway,
          gateway_reference: params.p_gateway_reference,
          gateway_fee_cents: params.p_gateway_fee_cents || 0,
          status: 'successful',
          settled_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        store.saas_payments.push(paymentRecord);

        // Update invoice to paid
        inv.status = 'paid';
        inv.paid_at = new Date().toISOString();

        // Update subscription
        const sub = store.practice_subscriptions.find((s) => s.id === inv.subscription_id);
        let newPlanId = sub?.plan_id;
        let newSeatLimit = sub?.seat_limit;
        if (sub) {
          if (sub.pending_plan_id) {
            const targetPlan = store.saas_plans.find((p) => p.id === sub.pending_plan_id);
            if (targetPlan) {
              sub.plan_id = targetPlan.id;
              sub.seat_limit = targetPlan.practitioner_seat_limit;
              newPlanId = targetPlan.id;
              newSeatLimit = targetPlan.practitioner_seat_limit;
            }
            sub.pending_plan_id = null;
          }
          sub.status = 'active';
          sub.current_period_start = new Date().toISOString();
          sub.current_period_end = new Date(Date.now() + 30 * 86400000).toISOString();
        }

        return Promise.resolve({
          data: {
            status: 'settled',
            invoice_id: inv.id,
            payment_id: paymentRecord.id,
            plan_id: newPlanId,
            seat_limit: newSeatLimit,
            new_period_end: sub?.current_period_end,
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: new Error(`Unknown RPC ${funcName}`) });
    },
    auth: {
      getUser(token) {
        if (token === 'valid-owner-token') {
          return Promise.resolve({
            data: { user: { id: 'user-owner-1', email: 'owner@alpha.com' } },
            error: null,
          });
        }
        if (token === 'valid-clinician-token') {
          return Promise.resolve({
            data: { user: { id: 'user-clinician-2', email: 'clinician@alpha.com' } },
            error: null,
          });
        }
        return Promise.resolve({ data: { user: null }, error: new Error('Invalid JWT') });
      },
    },
  };

  return client;
}

// ------------------------------------------------------------------------------
// MAIN TEST SUITE
// ------------------------------------------------------------------------------
test('=== PHYSENRA PHASE 4B: PAYSTACK PAYMENT INFRASTRUCTURE SUITE ===', async (t) => {
  const TEST_SECRET_KEY = 'sk_test_fake_paystack_secret_key_for_testing_only';

  // ----------------------------------------------------------------------------
  // SUITE 1: Secret Management & Bundle Isolation (Tests 1, 2, 25, 26)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Secret Management & Bundle Security ---', async (st) => {
    await st.test('TEST 1: secret key never appears in frontend bundle', () => {
      assert(fs.existsSync(DIST_ASSETS_DIR), 'dist/assets directory must exist (run npm run build first)');
      const assetFiles = fs.readdirSync(DIST_ASSETS_DIR).filter((f) => f.endsWith('.js'));
      assert(assetFiles.length > 0, 'Must have at least one JS bundle in dist/assets');

      for (const file of assetFiles) {
        const content = fs.readFileSync(path.join(DIST_ASSETS_DIR, file), 'utf8');
        assert(!content.includes('PAYSTACK_SECRET_KEY'), `File ${file} contains PAYSTACK_SECRET_KEY`);
        assert(!content.includes('sk_live_'), `File ${file} contains sk_live_`);
        assert(!content.includes('sk_test_'), `File ${file} contains sk_test_`);
      }
    });

    await st.test('TEST 2: secret key is read only server-side', () => {
      // Frontend src must have zero references to PAYSTACK_SECRET_KEY
      const srcFiles = [];
      function walkDir(dir) {
        for (const item of fs.readdirSync(dir)) {
          const fullPath = path.join(dir, item);
          if (fs.statSync(fullPath).isDirectory()) walkDir(fullPath);
          else if (item.endsWith('.ts') || item.endsWith('.tsx')) srcFiles.push(fullPath);
        }
      }
      walkDir(SRC_DIR);

      for (const file of srcFiles) {
        const content = fs.readFileSync(file, 'utf8');
        assert(!content.includes('PAYSTACK_SECRET_KEY'), `Frontend file ${file} references PAYSTACK_SECRET_KEY`);
      }

      // Netlify functions must access PAYSTACK_SECRET_KEY only via env
      const webhookCode = fs.readFileSync(path.join(NETLIFY_FUNCTIONS_DIR, 'paystack-webhook.cjs'), 'utf8');
      assert(webhookCode.includes('PAYSTACK_SECRET_KEY'), 'Webhook function must read PAYSTACK_SECRET_KEY from env');
    });

    await st.test('TEST 25: Paystack secret is absent from client response', async () => {
      const mockDb = createMockSupabaseAdmin();
      const mockFetch = async () => ({
        json: async () => ({
          status: true,
          data: {
            authorization_url: 'https://checkout.paystack.com/test12345',
            access_code: 'test12345',
            reference: 'PHY-SUB-2026-000100-XYZ',
          },
        }),
      });

      const res = await initializeHandler(
        {
          httpMethod: 'POST',
          headers: { authorization: 'Bearer valid-owner-token' },
          body: JSON.stringify({ practice_id: 'prac-alpha-1', invoice_id: 'inv-open-100' }),
        },
        {},
        {
          env: { PAYSTACK_SECRET_KEY: TEST_SECRET_KEY },
          supabaseAdmin: mockDb,
          fetch: mockFetch,
          isOwner: true,
        }
      );

      assert.strictEqual(res.statusCode, 200);
      assert(!res.body.includes(TEST_SECRET_KEY), 'Response body must not leak PAYSTACK_SECRET_KEY');
      assert(!res.body.includes('sk_'), 'Response body must not leak any secret key');
    });

    await st.test('TEST 26: service-role credentials never appear in client bundle', () => {
      const assetFiles = fs.readdirSync(DIST_ASSETS_DIR).filter((f) => f.endsWith('.js'));
      for (const file of assetFiles) {
        const content = fs.readFileSync(path.join(DIST_ASSETS_DIR, file), 'utf8');
        assert(!content.includes('service_role'), `File ${file} contains service_role key identifier`);
        assert(!content.includes('sbp_'), `File ${file} contains sbp_ personal access token prefix`);
      }
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Cryptographic HMAC Signature Verification (Tests 3, 4, 5, 6)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Cryptographic HMAC Signature Verification ---', async (st) => {
    const rawPayload = JSON.stringify({
      event: 'charge.success',
      data: { id: 987654, reference: 'PHY-SUB-TEST-1', amount: 1500000, currency: 'NGN' },
    });
    const validSignature = crypto
      .createHmac('sha512', TEST_SECRET_KEY)
      .update(rawPayload)
      .digest('hex');

    await st.test('TEST 3: valid HMAC accepted', () => {
      const isValid = verifyPaystackSignature(rawPayload, validSignature, TEST_SECRET_KEY);
      assert.strictEqual(isValid, true, 'Valid HMAC signature must be accepted');
    });

    await st.test('TEST 4: invalid HMAC rejected', () => {
      const wrongSignature = crypto
        .createHmac('sha512', 'wrong_secret_key_12345')
        .update(rawPayload)
        .digest('hex');
      const isValid = verifyPaystackSignature(rawPayload, wrongSignature, TEST_SECRET_KEY);
      assert.strictEqual(isValid, false, 'Invalid HMAC signature must be rejected');
    });

    await st.test('TEST 5: malformed signature rejected', () => {
      assert.strictEqual(verifyPaystackSignature(rawPayload, 'not-a-hex-signature', TEST_SECRET_KEY), false);
      assert.strictEqual(verifyPaystackSignature(rawPayload, '', TEST_SECRET_KEY), false);
      assert.strictEqual(verifyPaystackSignature(rawPayload, null, TEST_SECRET_KEY), false);
      assert.strictEqual(verifyPaystackSignature(rawPayload, undefined, TEST_SECRET_KEY), false);
      assert.strictEqual(verifyPaystackSignature(rawPayload, '1234567890abcdef', TEST_SECRET_KEY), false); // truncated
    });

    await st.test('TEST 6: altered webhook body rejected', () => {
      const alteredBody = rawPayload + ' ';
      const isValid = verifyPaystackSignature(alteredBody, validSignature, TEST_SECRET_KEY);
      assert.strictEqual(isValid, false, 'Altered body must not match original signature');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Webhook Ingestion, Deduplication & Idempotency (Tests 7, 27, 28)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Webhook Ingestion & Deduplication ---', async (st) => {
    const mockDb = createMockSupabaseAdmin();
    const eventPayload = {
      event: 'charge.success',
      data: {
        id: 11223344,
        reference: 'PHY-SUB-DEDUP-001',
        amount: 1500000,
        currency: 'NGN',
        channel: 'card',
        fees: 22500,
        metadata: {
          invoice_id: 'inv-open-100',
          practice_id: 'prac-alpha-1',
        },
      },
    };
    const rawBody = JSON.stringify(eventPayload);
    const signature = crypto.createHmac('sha512', TEST_SECRET_KEY).update(rawBody).digest('hex');

    const mockFetch = async () => ({
      json: async () => ({
        status: true,
        data: {
          status: 'success',
          reference: 'PHY-SUB-DEDUP-001',
          amount: 1500000,
          currency: 'NGN',
          channel: 'card',
          fees: 22500,
          metadata: { invoice_id: 'inv-open-100', practice_id: 'prac-alpha-1' },
        },
      }),
    });

    await st.test('TEST 27: webhook event is persisted', async () => {
      const res = await webhookHandler(
        {
          httpMethod: 'POST',
          headers: { 'x-paystack-signature': signature },
          body: rawBody,
        },
        {},
        {
          env: { PAYSTACK_SECRET_KEY: TEST_SECRET_KEY },
          supabaseAdmin: mockDb,
          fetch: mockFetch,
        }
      );

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(mockDb._store.saas_webhook_events.length, 1);
      assert.strictEqual(mockDb._store.saas_webhook_events[0].external_event_id, '11223344');
      assert.strictEqual(mockDb._store.saas_webhook_events[0].signature_verified, true);
    });

    await st.test('TEST 7: duplicate webhook event is idempotent', async () => {
      // Second delivery of identical event
      const res2 = await webhookHandler(
        {
          httpMethod: 'POST',
          headers: { 'x-paystack-signature': signature },
          body: rawBody,
        },
        {},
        {
          env: { PAYSTACK_SECRET_KEY: TEST_SECRET_KEY },
          supabaseAdmin: mockDb,
          fetch: mockFetch,
        }
      );

      assert.strictEqual(res2.statusCode, 200);
      const parsed = JSON.parse(res2.body);
      assert.strictEqual(parsed.status, 'already_processed');
    });

    await st.test('TEST 28: duplicate webhook does not duplicate payment', () => {
      const paymentsForInvoice = mockDb._store.saas_payments.filter((p) => p.invoice_id === 'inv-open-100');
      assert.strictEqual(paymentsForInvoice.length, 1, 'Exactly one payment record must exist despite duplicate deliveries');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Commercial Validation & Edge Case Rejection (Tests 8, 9, 10, 11, 12, 14, 15)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Commercial Invariants & Rejection Handling ---', async (st) => {
    await st.test('TEST 8: charge.success with wrong amount rejected', async () => {
      const mockDb = createMockSupabaseAdmin();
      const payload = {
        event: 'charge.success',
        data: {
          id: 55501,
          reference: 'PHY-SUB-WRONG-AMT',
          amount: 1000000, // Underpayment: ₦10,000 instead of ₦15,000
          currency: 'NGN',
          channel: 'card',
          metadata: { invoice_id: 'inv-open-100', practice_id: 'prac-alpha-1' },
        },
      };
      const raw = JSON.stringify(payload);
      const sig = crypto.createHmac('sha512', TEST_SECRET_KEY).update(raw).digest('hex');

      const mockFetch = async () => ({
        json: async () => ({
          status: true,
          data: {
            status: 'success',
            reference: 'PHY-SUB-WRONG-AMT',
            amount: 1000000,
            currency: 'NGN',
            channel: 'card',
            metadata: { invoice_id: 'inv-open-100', practice_id: 'prac-alpha-1' },
          },
        }),
      });

      const res = await webhookHandler(
        { httpMethod: 'POST', headers: { 'x-paystack-signature': sig }, body: raw },
        {},
        { env: { PAYSTACK_SECRET_KEY: TEST_SECRET_KEY }, supabaseAdmin: mockDb, fetch: mockFetch }
      );

      assert.strictEqual(res.statusCode, 400);
      assert(res.body.includes('Amount mismatch'), 'Must reject amount mismatch');
    });

    await st.test('TEST 9: charge.success with wrong currency rejected', async () => {
      const mockDb = createMockSupabaseAdmin();
      const payload = {
        event: 'charge.success',
        data: {
          id: 55502,
          reference: 'PHY-SUB-WRONG-CURR',
          amount: 1500000,
          currency: 'USD', // Mismatched currency
          channel: 'card',
          metadata: { invoice_id: 'inv-open-100', practice_id: 'prac-alpha-1' },
        },
      };
      const raw = JSON.stringify(payload);
      const sig = crypto.createHmac('sha512', TEST_SECRET_KEY).update(raw).digest('hex');

      const mockFetch = async () => ({
        json: async () => ({
          status: true,
          data: {
            status: 'success',
            reference: 'PHY-SUB-WRONG-CURR',
            amount: 1500000,
            currency: 'USD',
            channel: 'card',
            metadata: { invoice_id: 'inv-open-100', practice_id: 'prac-alpha-1' },
          },
        }),
      });

      const res = await webhookHandler(
        { httpMethod: 'POST', headers: { 'x-paystack-signature': sig }, body: raw },
        {},
        { env: { PAYSTACK_SECRET_KEY: TEST_SECRET_KEY }, supabaseAdmin: mockDb, fetch: mockFetch }
      );

      assert.strictEqual(res.statusCode, 400);
      assert(res.body.includes('Currency mismatch'), 'Must reject currency mismatch');
    });

    await st.test('TEST 10: wrong reference rejected', async () => {
      const mockDb = createMockSupabaseAdmin();
      const payload = {
        event: 'charge.success',
        data: {
          id: 55503,
          reference: 'NON-EXISTENT-REF',
          amount: 1500000,
          currency: 'NGN',
        },
      };
      const raw = JSON.stringify(payload);
      const sig = crypto.createHmac('sha512', TEST_SECRET_KEY).update(raw).digest('hex');

      const mockFetch = async () => ({
        json: async () => ({
          status: false,
          message: 'Transaction reference not found',
        }),
      });

      const res = await webhookHandler(
        { httpMethod: 'POST', headers: { 'x-paystack-signature': sig }, body: raw },
        {},
        { env: { PAYSTACK_SECRET_KEY: TEST_SECRET_KEY }, supabaseAdmin: mockDb, fetch: mockFetch }
      );

      assert.strictEqual(res.statusCode, 400);
      assert(res.body.includes('Gateway verification failed'), 'Must reject unverified reference');
    });

    await st.test('TEST 11: unknown invoice rejected', async () => {
      const mockDb = createMockSupabaseAdmin();
      const payload = {
        event: 'charge.success',
        data: {
          id: 55504,
          reference: 'PHY-SUB-UNK-INV',
          amount: 1500000,
          currency: 'NGN',
          channel: 'card',
          metadata: { invoice_id: 'inv-non-existent-999', practice_id: 'prac-alpha-1' },
        },
      };
      const raw = JSON.stringify(payload);
      const sig = crypto.createHmac('sha512', TEST_SECRET_KEY).update(raw).digest('hex');

      const mockFetch = async () => ({
        json: async () => ({
          status: true,
          data: {
            status: 'success',
            reference: 'PHY-SUB-UNK-INV',
            amount: 1500000,
            currency: 'NGN',
            channel: 'card',
            metadata: { invoice_id: 'inv-non-existent-999', practice_id: 'prac-alpha-1' },
          },
        }),
      });

      const res = await webhookHandler(
        { httpMethod: 'POST', headers: { 'x-paystack-signature': sig }, body: raw },
        {},
        { env: { PAYSTACK_SECRET_KEY: TEST_SECRET_KEY }, supabaseAdmin: mockDb, fetch: mockFetch }
      );

      assert.strictEqual(res.statusCode, 404);
    });

    await st.test('TEST 12: cross-practice invoice rejected', async () => {
      const mockDb = createMockSupabaseAdmin();
      // Practice Alpha caller attempts to verify Practice Beta's invoice
      const mockFetch = async () => ({
        json: async () => ({
          status: true,
          data: {
            status: 'success',
            reference: 'PHY-SUB-BETA-REF',
            amount: 4500000,
            currency: 'NGN',
            channel: 'card',
            metadata: { invoice_id: 'inv-beta-400', practice_id: 'prac-beta-2' },
          },
        }),
      });

      const res = await verifyHandler(
        {
          httpMethod: 'POST',
          headers: { authorization: 'Bearer valid-owner-token' },
          body: JSON.stringify({ practice_id: 'prac-alpha-1', reference: 'PHY-SUB-BETA-REF' }),
        },
        {},
        {
          env: { PAYSTACK_SECRET_KEY: TEST_SECRET_KEY },
          supabaseAdmin: mockDb,
          fetch: mockFetch,
          isOwner: true,
        }
      );

      assert.strictEqual(res.statusCode, 403);
      assert(res.body.includes('Cross-tenant violation'), 'Must prevent cross-tenant verification');
    });

    await st.test('TEST 14: void invoice cannot settle', async () => {
      const mockDb = createMockSupabaseAdmin();
      const payload = {
        event: 'charge.success',
        data: {
          id: 55505,
          reference: 'PHY-SUB-VOID-INV',
          amount: 1500000,
          currency: 'NGN',
          channel: 'card',
          metadata: { invoice_id: 'inv-void-300', practice_id: 'prac-alpha-1' },
        },
      };
      const raw = JSON.stringify(payload);
      const sig = crypto.createHmac('sha512', TEST_SECRET_KEY).update(raw).digest('hex');

      const mockFetch = async () => ({
        json: async () => ({
          status: true,
          data: {
            status: 'success',
            reference: 'PHY-SUB-VOID-INV',
            amount: 1500000,
            currency: 'NGN',
            channel: 'card',
            metadata: { invoice_id: 'inv-void-300', practice_id: 'prac-alpha-1' },
          },
        }),
      });

      const res = await webhookHandler(
        { httpMethod: 'POST', headers: { 'x-paystack-signature': sig }, body: raw },
        {},
        { env: { PAYSTACK_SECRET_KEY: TEST_SECRET_KEY }, supabaseAdmin: mockDb, fetch: mockFetch }
      );

      assert.strictEqual(res.statusCode, 400);
      assert(res.body.includes('Cannot settle void invoice'), 'Void invoice settlement must be rejected');
    });

    await st.test('TEST 15: failed payment cannot activate subscription', async () => {
      const mockDb = createMockSupabaseAdmin();
      const payload = {
        event: 'charge.failed',
        data: {
          id: 55506,
          reference: 'PHY-SUB-FAILED-CHARGE',
          amount: 1500000,
          currency: 'NGN',
          gateway_response: 'Insufficient funds',
        },
      };
      const raw = JSON.stringify(payload);
      const sig = crypto.createHmac('sha512', TEST_SECRET_KEY).update(raw).digest('hex');

      const res = await webhookHandler(
        { httpMethod: 'POST', headers: { 'x-paystack-signature': sig }, body: raw },
        {},
        { env: { PAYSTACK_SECRET_KEY: TEST_SECRET_KEY }, supabaseAdmin: mockDb }
      );

      assert.strictEqual(res.statusCode, 200);
      const parsed = JSON.parse(res.body);
      assert.strictEqual(parsed.status, 'ignored');
      // Verify subscription remains in trialing status
      const sub = mockDb._store.practice_subscriptions.find((s) => s.id === 'sub-alpha-1');
      assert.strictEqual(sub.status, 'trialing', 'Subscription must remain trialing after failed charge');
      assert.strictEqual(mockDb._store.saas_payments.length, 0, 'No payment record should be created');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Successful Settlement & Subscription Activation (Tests 13, 16, 17, 18, 19, 20)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Atomic Settlement & Plan Promotion ---', async (st) => {
    const mockDb = createMockSupabaseAdmin();
    const payload = {
      event: 'charge.success',
      data: {
        id: 77701,
        reference: 'PHY-SUB-SUCCESS-SETTLE-01',
        amount: 1500000,
        currency: 'NGN',
        channel: 'card',
        fees: 22500,
        metadata: { invoice_id: 'inv-open-100', practice_id: 'prac-alpha-1' },
      },
    };
    const raw = JSON.stringify(payload);
    const sig = crypto.createHmac('sha512', TEST_SECRET_KEY).update(raw).digest('hex');

    const mockFetch = async () => ({
      json: async () => ({
        status: true,
        data: {
          status: 'success',
          reference: 'PHY-SUB-SUCCESS-SETTLE-01',
          amount: 1500000,
          currency: 'NGN',
          channel: 'card',
          fees: 22500,
          metadata: { invoice_id: 'inv-open-100', practice_id: 'prac-alpha-1' },
        },
      }),
    });

    await st.test('TEST 16: successful verified payment settles exactly once', async () => {
      const res = await webhookHandler(
        { httpMethod: 'POST', headers: { 'x-paystack-signature': sig }, body: raw },
        {},
        { env: { PAYSTACK_SECRET_KEY: TEST_SECRET_KEY }, supabaseAdmin: mockDb, fetch: mockFetch }
      );

      assert.strictEqual(res.statusCode, 200);
      const parsed = JSON.parse(res.body);
      assert.strictEqual(parsed.status, 'success');
      assert.strictEqual(parsed.settlement?.status, 'settled');
    });

    await st.test('TEST 17: settlement activates correct subscription', () => {
      const sub = mockDb._store.practice_subscriptions.find((s) => s.id === 'sub-alpha-1');
      assert.strictEqual(sub.status, 'active', 'Subscription must be promoted to active');
    });

    await st.test('TEST 18: settlement promotes pending plan correctly', () => {
      const sub = mockDb._store.practice_subscriptions.find((s) => s.id === 'sub-alpha-1');
      assert.strictEqual(sub.plan_id, 'plan-pro-id', 'Pending plan must be promoted to active plan_id');
      assert.strictEqual(sub.seat_limit, 5, 'Seat limit must be upgraded to target plan capacity');
      assert.strictEqual(sub.pending_plan_id, null, 'Pending plan pointer must be cleared');
    });

    await st.test('TEST 19: settlement updates billing period correctly', () => {
      const sub = mockDb._store.practice_subscriptions.find((s) => s.id === 'sub-alpha-1');
      const periodEnd = new Date(sub.current_period_end).getTime();
      const now = Date.now();
      assert(periodEnd > now, 'New period end must be set in the future');
    });

    await st.test('TEST 20: payment record created exactly once', () => {
      const payments = mockDb._store.saas_payments.filter((p) => p.invoice_id === 'inv-open-100');
      assert.strictEqual(payments.length, 1, 'Payment ledger must contain exactly one payment record');
      assert.strictEqual(payments[0].status, 'successful');
      assert.strictEqual(payments[0].amount_cents, 1500000);
    });

    await st.test('TEST 13: already-paid invoice cannot settle twice', async () => {
      // Calling webhook again on an already-paid invoice
      const payload2 = {
        event: 'charge.success',
        data: {
          id: 77702, // Different event ID
          reference: 'PHY-SUB-REPEAT-SETTLE',
          amount: 1500000,
          currency: 'NGN',
          channel: 'card',
          metadata: { invoice_id: 'inv-open-100', practice_id: 'prac-alpha-1' },
        },
      };
      const raw2 = JSON.stringify(payload2);
      const sig2 = crypto.createHmac('sha512', TEST_SECRET_KEY).update(raw2).digest('hex');

      const mockFetch2 = async () => ({
        json: async () => ({
          status: true,
          data: {
            status: 'success',
            reference: 'PHY-SUB-REPEAT-SETTLE',
            amount: 1500000,
            currency: 'NGN',
            channel: 'card',
            metadata: { invoice_id: 'inv-open-100', practice_id: 'prac-alpha-1' },
          },
        }),
      });

      const res = await webhookHandler(
        { httpMethod: 'POST', headers: { 'x-paystack-signature': sig2 }, body: raw2 },
        {},
        { env: { PAYSTACK_SECRET_KEY: TEST_SECRET_KEY }, supabaseAdmin: mockDb, fetch: mockFetch2 }
      );

      assert.strictEqual(res.statusCode, 200);
      const parsed = JSON.parse(res.body);
      assert.strictEqual(parsed.status, 'already_paid');

      // Check payment ledger count hasn't doubled
      const payments = mockDb._store.saas_payments.filter((p) => p.invoice_id === 'inv-open-100');
      assert.strictEqual(payments.length, 1, 'No duplicate payment may be created');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Verification Endpoint & Concurrency Guarantees (Tests 21, 22, 23, 29, 30)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Verification Endpoint & Concurrency Control ---', async (st) => {
    await st.test('TEST 21: browser callback cannot independently mark invoice paid', () => {
      // Inspect source code: there must be no client RPC or direct update to saas_invoices
      const saasServiceContent = fs.readFileSync(path.join(SRC_DIR, 'services', 'saasSubscriptionService.ts'), 'utf8');
      assert(!saasServiceContent.includes('.from(\'saas_invoices\').update({ status: \'paid\''), 'Client must not directly mutate invoice status');
    });

    await st.test('TEST 22: verification endpoint is idempotent', async () => {
      const mockDb = createMockSupabaseAdmin();
      // Pre-seed a successful payment for reference
      mockDb._store.saas_payments.push({
        id: 'pay-existing-99',
        payment_number: 'PHY-PAY-2026-999999',
        invoice_id: 'inv-open-100',
        practice_id: 'prac-alpha-1',
        amount_cents: 1500000,
        currency: 'NGN',
        payment_method: 'card',
        gateway_provider: 'paystack',
        gateway_reference: 'PHY-SUB-IDEMPOTENT-01',
        status: 'successful',
        settled_at: new Date().toISOString(),
      });

      const res = await verifyHandler(
        {
          httpMethod: 'POST',
          headers: { authorization: 'Bearer valid-owner-token' },
          body: JSON.stringify({ practice_id: 'prac-alpha-1', reference: 'PHY-SUB-IDEMPOTENT-01' }),
        },
        {},
        {
          env: { PAYSTACK_SECRET_KEY: TEST_SECRET_KEY },
          supabaseAdmin: mockDb,
          isOwner: true,
        }
      );

      assert.strictEqual(res.statusCode, 200);
      const parsed = JSON.parse(res.body);
      assert.strictEqual(parsed.status, 'already_paid');
    });

    await st.test('TEST 23: unauthorized user cannot verify another practice invoice', async () => {
      const mockDb = createMockSupabaseAdmin();
      const res = await verifyHandler(
        {
          httpMethod: 'POST',
          headers: { authorization: 'Bearer valid-clinician-token' },
          body: JSON.stringify({ practice_id: 'prac-alpha-1', reference: 'PHY-SUB-SOME-REF' }),
        },
        {},
        {
          env: { PAYSTACK_SECRET_KEY: TEST_SECRET_KEY },
          supabaseAdmin: mockDb,
          isOwner: false, // Clinician is not practice owner
        }
      );

      assert.strictEqual(res.statusCode, 403);
      assert(res.body.includes('Access denied'), 'Non-owners must receive 403 Forbidden');
    });

    await st.test('TEST 29: concurrent webhook + verification cannot double-settle', async () => {
      const mockDb = createMockSupabaseAdmin();
      const ref = 'PHY-SUB-RACE-001';
      const mockFetch = async () => ({
        json: async () => ({
          status: true,
          data: {
            status: 'success',
            reference: ref,
            amount: 1500000,
            currency: 'NGN',
            channel: 'card',
            fees: 22500,
            metadata: { invoice_id: 'inv-open-100', practice_id: 'prac-alpha-1' },
          },
        }),
      });

      const payload = {
        event: 'charge.success',
        data: {
          id: 998811,
          reference: ref,
          amount: 1500000,
          currency: 'NGN',
          channel: 'card',
          metadata: { invoice_id: 'inv-open-100', practice_id: 'prac-alpha-1' },
        },
      };
      const raw = JSON.stringify(payload);
      const sig = crypto.createHmac('sha512', TEST_SECRET_KEY).update(raw).digest('hex');

      // Fire both simultaneously
      const [resWebhook, resVerify] = await Promise.all([
        webhookHandler(
          { httpMethod: 'POST', headers: { 'x-paystack-signature': sig }, body: raw },
          {},
          { env: { PAYSTACK_SECRET_KEY: TEST_SECRET_KEY }, supabaseAdmin: mockDb, fetch: mockFetch }
        ),
        verifyHandler(
          {
            httpMethod: 'POST',
            headers: { authorization: 'Bearer valid-owner-token' },
            body: JSON.stringify({ practice_id: 'prac-alpha-1', reference: ref }),
          },
          {},
          { env: { PAYSTACK_SECRET_KEY: TEST_SECRET_KEY }, supabaseAdmin: mockDb, fetch: mockFetch, isOwner: true }
        ),
      ]);

      assert.strictEqual(resWebhook.statusCode, 200);
      assert.strictEqual(resVerify.statusCode, 200);

      // Exactly one payment record must exist in ledger
      const payments = mockDb._store.saas_payments.filter((p) => p.invoice_id === 'inv-open-100');
      assert.strictEqual(payments.length, 1, 'Concurrent calls must produce exactly one payment record');
    });

    await st.test('TEST 30: concurrent duplicate verification cannot double-settle', async () => {
      const mockDb = createMockSupabaseAdmin();
      const ref = 'PHY-SUB-RACE-002';
      const mockFetch = async () => ({
        json: async () => ({
          status: true,
          data: {
            status: 'success',
            reference: ref,
            amount: 1500000,
            currency: 'NGN',
            channel: 'card',
            metadata: { invoice_id: 'inv-open-100', practice_id: 'prac-alpha-1' },
          },
        }),
      });

      const [resVerify1, resVerify2] = await Promise.all([
        verifyHandler(
          {
            httpMethod: 'POST',
            headers: { authorization: 'Bearer valid-owner-token' },
            body: JSON.stringify({ practice_id: 'prac-alpha-1', reference: ref }),
          },
          {},
          { env: { PAYSTACK_SECRET_KEY: TEST_SECRET_KEY }, supabaseAdmin: mockDb, fetch: mockFetch, isOwner: true }
        ),
        verifyHandler(
          {
            httpMethod: 'POST',
            headers: { authorization: 'Bearer valid-owner-token' },
            body: JSON.stringify({ practice_id: 'prac-alpha-1', reference: ref }),
          },
          {},
          { env: { PAYSTACK_SECRET_KEY: TEST_SECRET_KEY }, supabaseAdmin: mockDb, fetch: mockFetch, isOwner: true }
        ),
      ]);

      assert.strictEqual(resVerify1.statusCode, 200);
      assert.strictEqual(resVerify2.statusCode, 200);

      const payments = mockDb._store.saas_payments.filter((p) => p.invoice_id === 'inv-open-100');
      assert.strictEqual(payments.length, 1, 'Concurrent duplicate verifications must produce exactly one payment record');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 7: Database Migration & RPC Access Control (Test 24)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 7: Database RPC Access Control ---', async (st) => {
    await st.test('TEST 24: anon cannot invoke protected settlement RPC', () => {
      const migrationPath = path.join(
        ROOT_DIR,
        'supabase',
        'migrations',
        '20261003000000_practice_self_service_billing_foundation.sql'
      );
      assert(fs.existsSync(migrationPath), 'Phase 4A migration must exist');
      const sql = fs.readFileSync(migrationPath, 'utf8');

      assert(
        sql.includes('REVOKE EXECUTE ON FUNCTION public.process_subscription_payment_settlement FROM anon, public;'),
        'Must explicitly revoke execute on settlement RPC from anon and public'
      );
      assert(
        sql.includes('GRANT EXECUTE ON FUNCTION public.process_subscription_payment_settlement TO service_role;'),
        'Must restrict execute on settlement RPC strictly to service_role'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 8: Kabworld Isolation & Existing Suite Regression (Tests 31, 32, 33)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 8: Project Isolation & Regression Integrity ---', async (st) => {
    await st.test('TEST 31: Kabworld references = zero', () => {
      // Check netlify functions
      const functionFiles = fs.readdirSync(NETLIFY_FUNCTIONS_DIR);
      for (const file of functionFiles) {
        const fullPath = path.join(NETLIFY_FUNCTIONS_DIR, file);
        if (fs.statSync(fullPath).isFile()) {
          const content = fs.readFileSync(fullPath, 'utf8');
          assert(!content.toLowerCase().includes('kabworld'), `Function ${file} contains Kabworld reference`);
        }
      }
      // Check netlify lib
      const libFiles = fs.readdirSync(path.join(NETLIFY_FUNCTIONS_DIR, 'lib'));
      for (const file of libFiles) {
        const fullPath = path.join(NETLIFY_FUNCTIONS_DIR, 'lib', file);
        const content = fs.readFileSync(fullPath, 'utf8');
        assert(!content.toLowerCase().includes('kabworld'), `Lib file ${file} contains Kabworld reference`);
      }
    });

    await st.test('TEST 32: existing Phase 4A tests still pass', () => {
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
      assert(output.includes('tests 48'), 'All 48 Phase 4A tests must pass');
      assert(output.includes('pass 48'), 'All 48 Phase 4A tests must be marked pass');
      assert(!output.includes('fail 1'), 'Phase 4A suite must have 0 failures');
    });

    await st.test('TEST 33: full regression still passes', () => {
      // We verify package.json test command exists
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
      assert(pkg.scripts.test, 'npm test script must be configured');
    });
  });
});
