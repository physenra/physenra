// ==============================================================================
// PHYSENRA — PAYSTACK CHECKOUT MODAL FIX VERIFICATION TEST SUITE
// File: tests/paystack_checkout_modal_fix.test.cjs
//
// Governs and Verifies:
// 1. In-modal error alert rendering inside Modal 1 (Plan Confirmation Modal)
// 2. Elimination of silent failure and modal trapping on checkout error
// 3. Duplicate click prevention and loading state synchronization
// 4. Safe URL validation before window.location.href navigation
// 5. Background invoice synchronization on checkout failure
// 6. Robust response parsing (HTML 500/502/504 fallback) in saasSubscriptionService
// 7. PAYSTACK_SECRET_KEY whitespace trimming across all serverless helper functions
// 8. Serverless initialize-payment authorization_url validation and clean diagnostic logging
// 9. Zero Kabworld references and zero credential leakage
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

const saasServicePath = path.join(SRC_DIR, 'services', 'saasSubscriptionService.ts');
const saasServiceContent = fs.readFileSync(saasServicePath, 'utf8');

const initPaymentPath = path.join(NETLIFY_DIR, 'initialize-payment.cjs');
const initPaymentContent = fs.readFileSync(initPaymentPath, 'utf8');

const paystackLibPath = path.join(NETLIFY_DIR, 'lib', 'paystack.cjs');
const {
  sanitizePaystackKey,
  validatePaystackSecretKey,
  initializePaystackTransaction,
  verifyPaystackTransaction,
  verifyPaystackSignature,
} = require(paystackLibPath);

const { handler: initializePaymentHandler } = require(initPaymentPath);

test('=== PHYSENRA PAYSTACK CHECKOUT MODAL FIX SUITE ===', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: In-Modal Error Visibility in PracticeBillingPage
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: In-Modal Error Visibility & UX ---', async (t1) => {
    await t1.test('TEST 1: PracticeBillingPage declares planModalError state', () => {
      assert.match(
        billingPageContent,
        /const\s*\[planModalError,\s*setPlanModalError\]\s*=\s*useState<string\s*\|\s*null>\(null\);/,
        'PracticeBillingPage must declare planModalError state for in-modal feedback'
      );
    });

    await t1.test('TEST 2: Plan confirmation modal renders in-modal error alert banner', () => {
      assert.match(
        billingPageContent,
        /\{planModalError\s*&&\s*\(/,
        'Modal 1 must conditionally render in-modal error alert when planModalError is set'
      );
      assert.match(
        billingPageContent,
        /Checkout Error/,
        'Modal error alert must render clear Checkout Error heading'
      );
      assert.match(
        billingPageContent,
        /\{planModalError\}/,
        'Modal error alert must display the dynamic planModalError message'
      );
    });

    await t1.test('TEST 3: Modal error banner provides dismiss button', () => {
      assert.match(
        billingPageContent,
        /onClick=\{\(\)\s*=>\s*setPlanModalError\(null\)\}/,
        'Modal error alert must allow dismissal via setPlanModalError(null)'
      );
    });

    await t1.test('TEST 4: Modal error banner offers Bank Transfer alternative when available', () => {
      assert.match(
        billingPageContent,
        /bankConfig\?\.is_available\s*&&\s*paymentMethod\s*===\s*'paystack'/,
        'Modal error must offer Bank Transfer when card payment fails and bank transfer is available'
      );
    });

    await t1.test('TEST 5: confirmPlanChange catch block populates both setPlanModalError and setErrorMessage', () => {
      assert.match(
        billingPageContent,
        /setPlanModalError\(failureMsg\);/,
        'confirmPlanChange catch block must set planModalError'
      );
      assert.match(
        billingPageContent,
        /setErrorMessage\(failureMsg\);/,
        'confirmPlanChange catch block must set global errorMessage'
      );
    });

    await t1.test('TEST 6: Background billing sync is triggered on checkout error', () => {
      assert.match(
        billingPageContent,
        /loadBillingData\(\)\.catch\(/,
        'confirmPlanChange catch block must trigger loadBillingData to sync newly created open invoices'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Duplicate Click Protection & Navigation Safety
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Duplicate Click Protection & Navigation Safety ---', async (t2) => {
    await t2.test('TEST 7: confirmPlanChange blocks re-entrancy while actionLoading or isRedirecting', () => {
      assert.match(
        billingPageContent,
        /if\s*\(!planToChange\s*\|\|\s*!activePractice\?\.id\s*\|\|\s*isReadOnly\)\s*return;/,
        'confirmPlanChange must maintain verified owner access guard'
      );
      assert.match(
        billingPageContent,
        /if\s*\(actionLoading\s*\|\|\s*isRedirecting\)\s*return;/,
        'confirmPlanChange must block duplicate clicks when actionLoading or isRedirecting is active'
      );
    });

    await t2.test('TEST 8: isValidCheckoutUrl validates URL protocol and format', () => {
      assert.match(
        billingPageContent,
        /function\s*isValidCheckoutUrl\(urlStr:\s*string\s*\|\s*null\s*\|\s*undefined\):\s*boolean/,
        'isValidCheckoutUrl helper must be defined'
      );
      assert.match(
        billingPageContent,
        /parsed\.protocol\s*===\s*'https:'\s*\|\|\s*parsed\.protocol\s*===\s*'http:'/,
        'isValidCheckoutUrl must verify valid http/https protocol'
      );
    });

    await t2.test('TEST 9: confirmPlanChange checks isValidCheckoutUrl before redirect', () => {
      assert.match(
        billingPageContent,
        /checkoutInit\.authorization_url\s*&&\s*isValidCheckoutUrl\(checkoutInit\.authorization_url\)/,
        'confirmPlanChange must validate authorization_url with isValidCheckoutUrl before navigation'
      );
    });

    await t2.test('TEST 10: Modal button indicates redirection handoff', () => {
      assert.match(
        billingPageContent,
        /isRedirecting\s*\?\s*'Redirecting to Paystack\.\.\.'/,
        'Button must display "Redirecting to Paystack..." during gateway handoff'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Robust Service Layer Error & Response Handling
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Service Layer Robustness ---', async (t3) => {
    await t3.test('TEST 11: initializePaystackCheckout parses response safely against HTML/non-JSON', () => {
      assert.match(
        saasServiceContent,
        /const\s*responseText\s*=\s*await\s*response\.text\(\);/,
        'initializePaystackCheckout must read response as text before JSON parsing'
      );
      assert.match(
        saasServiceContent,
        /JSON\.parse\(responseText\)/,
        'initializePaystackCheckout must safely parse responseText inside try-catch'
      );
      assert.match(
        saasServiceContent,
        /Payment service unavailable/,
        'Must provide descriptive error when server returns non-JSON error page'
      );
    });

    await t3.test('TEST 12: initializePaystackCheckout validates authorization_url presence', () => {
      assert.match(
        saasServiceContent,
        /if\s*\(!result\?\.authorization_url\s*\|\|\s*typeof\s*result\.authorization_url\s*!==\s*'string'\)/,
        'initializePaystackCheckout must validate authorization_url string'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Serverless Secret Trimming & Paystack Helpers
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Serverless Secret Trimming & Helpers ---', async (t4) => {
    await t4.test('TEST 13: initializePaystackTransaction trims secretKey with whitespace/newlines', async () => {
      let capturedAuthHeader = '';
      const dummyFetch = async (url, options) => {
        capturedAuthHeader = options.headers.Authorization;
        return {
          status: 200,
          json: async () => ({
            status: true,
            message: 'Authorization URL created',
            data: {
              authorization_url: 'https://checkout.paystack.com/test-auth-url',
              access_code: 'access-123',
              reference: 'PHY-SUB-TEST-1',
            },
          }),
        };
      };

      const untrimmedKey = '  sk_test_untrimmed_secret_key_123 \n';
      const result = await initializePaystackTransaction(
        {
          email: 'test@example.com',
          amount: 1500000,
          reference: 'PHY-SUB-TEST-1',
        },
        untrimmedKey,
        dummyFetch
      );

      assert.strictEqual(result.status, true);
      assert.strictEqual(
        capturedAuthHeader,
        'Bearer sk_test_untrimmed_secret_key_123',
        'Authorization header must contain cleanly trimmed key without whitespace or newlines'
      );
    });

    await t4.test('TEST 14: verifyPaystackSignature trims secretKey with whitespace/newlines', () => {
      const crypto = require('node:crypto');
      const cleanKey = 'sk_test_signature_key_999';
      const untrimmedKey = '  sk_test_signature_key_999\r\n  ';
      const body = JSON.stringify({ event: 'charge.success', id: 12345 });

      const validSignature = crypto.createHmac('sha512', cleanKey).update(body).digest('hex');

      const matches = verifyPaystackSignature(body, validSignature, untrimmedKey);
      assert.strictEqual(matches, true, 'verifyPaystackSignature must successfully verify with untrimmed key');
    });

    await t4.test('TEST 15: initialize-payment function rejects invalid gateway authorization_url', async () => {
      const mockDb = {
        from: (table) => {
          if (table === 'saas_invoices') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: {
                        id: 'inv-test-1',
                        invoice_number: 'PHY-INV-2026-000001',
                        practice_id: 'prac-test-1',
                        currency: 'NGN',
                        total_cents: 1500000,
                        status: 'open',
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'saas_payments') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: null }),
                  }),
                }),
              }),
            };
          }
          return {};
        },
      };

      const badGatewayFetch = async () => ({
        status: 200,
        json: async () => ({
          status: true,
          message: 'OK',
          data: {
            authorization_url: 'ftp://malformed-url', // invalid protocol
            access_code: 'code-123',
            reference: 'ref-123',
          },
        }),
      });

      const res = await initializePaymentHandler(
        {
          httpMethod: 'POST',
          headers: { authorization: 'Bearer test-token' },
          body: JSON.stringify({ practice_id: 'prac-test-1', invoice_id: 'inv-test-1' }),
        },
        {},
        {
          env: { PAYSTACK_SECRET_KEY: 'sk_test_dummy_key_123' },
          supabaseAdmin: mockDb,
          fetch: badGatewayFetch,
          isOwner: true,
          user: { id: 'user-1', email: 'owner@physenra.com' },
        }
      );

      assert.strictEqual(res.statusCode, 502);
      const parsedBody = JSON.parse(res.body);
      assert.match(parsedBody.error, /invalid checkout URL/i);
    });

    await t4.test('TEST 16: initialize-payment returns 400 when Paystack rejects transaction with message', async () => {
      const mockDb = {
        from: (table) => {
          if (table === 'saas_invoices') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: {
                        id: 'inv-test-2',
                        invoice_number: 'PHY-INV-2026-000002',
                        practice_id: 'prac-test-1',
                        currency: 'NGN',
                        total_cents: 1500000,
                        status: 'open',
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'saas_payments') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: null }),
                  }),
                }),
              }),
            };
          }
          return {};
        },
      };

      const rejectedGatewayFetch = async () => ({
        status: 400,
        json: async () => ({
          status: false,
          message: 'Merchant not permitted to accept live transactions',
        }),
      });

      const res = await initializePaymentHandler(
        {
          httpMethod: 'POST',
          headers: { authorization: 'Bearer test-token' },
          body: JSON.stringify({ practice_id: 'prac-test-1', invoice_id: 'inv-test-2' }),
        },
        {},
        {
          env: { PAYSTACK_SECRET_KEY: 'sk_live_dummy_live_key' },
          supabaseAdmin: mockDb,
          fetch: rejectedGatewayFetch,
          isOwner: true,
          user: { id: 'user-1', email: 'owner@physenra.com' },
        }
      );

      assert.strictEqual(res.statusCode, 400);
      const parsedBody = JSON.parse(res.body);
      assert.strictEqual(parsedBody.error, 'Merchant not permitted to accept live transactions');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Secret Hygiene & Project Isolation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Secret Hygiene & Project Isolation ---', async (t5) => {
    await t5.test('TEST 17: Zero Kabworld references across modified files', () => {
      assert.equal(/kabworld/i.test(billingPageContent), false, 'billingPageContent must have zero Kabworld references');
      assert.equal(/kabworld/i.test(saasServiceContent), false, 'saasServiceContent must have zero Kabworld references');
      assert.equal(/kabworld/i.test(initPaymentContent), false, 'initPaymentContent must have zero Kabworld references');
    });

    await t5.test('TEST 18: No secret keys in frontend files', () => {
      assert.equal(/sk_live_/i.test(billingPageContent), false, 'No sk_live_ in billingPageContent');
      assert.equal(/sk_test_/i.test(billingPageContent), false, 'No sk_test_ in billingPageContent');
      assert.equal(/sk_live_/i.test(saasServiceContent), false, 'No sk_live_ in saasServiceContent');
      assert.equal(/sk_test_/i.test(saasServiceContent), false, 'No sk_test_ in saasServiceContent');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Runtime Key Sanitization & Public Key Guard (Invalid Key Prevention)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Runtime Key Sanitization & Invalid Key Prevention ---', async (t6) => {
    await t6.test('TEST 19: sanitizePaystackKey strips quotes, Bearer prefix, and zero-width spaces', () => {
      assert.equal(sanitizePaystackKey('"sk_live_12345"'), 'sk_live_12345');
      assert.equal(sanitizePaystackKey("'sk_live_12345'"), 'sk_live_12345');
      assert.equal(sanitizePaystackKey('Bearer sk_live_12345'), 'sk_live_12345');
      assert.equal(sanitizePaystackKey('\uFEFFsk_live_12345\u200B'), 'sk_live_12345');
      assert.equal(sanitizePaystackKey('  sk_live_12345\r\n  '), 'sk_live_12345');
    });

    await t6.test('TEST 20: validatePaystackSecretKey accepts valid sk_live_ and sk_test_ keys', () => {
      const liveRes = validatePaystackSecretKey('sk_live_abcdef123456');
      assert.equal(liveRes.valid, true);
      assert.equal(liveRes.mode, 'live');

      const testRes = validatePaystackSecretKey('sk_test_abcdef123456');
      assert.equal(testRes.valid, true);
      assert.equal(testRes.mode, 'test');
    });

    await t6.test('TEST 21: validatePaystackSecretKey rejects public keys (pk_...) with explicit diagnostic', () => {
      const pubLive = validatePaystackSecretKey('pk_live_abcdef123456');
      assert.equal(pubLive.valid, false);
      assert.equal(pubLive.reason, 'public_key_provided');
      assert.match(pubLive.message, /Public Key/i);

      const pubTest = validatePaystackSecretKey('pk_test_abcdef123456');
      assert.equal(pubTest.valid, false);
      assert.equal(pubTest.reason, 'public_key_provided');
    });

    await t6.test('TEST 22: validatePaystackSecretKey rejects non-sk keys with invalid_prefix', () => {
      const nonSk = validatePaystackSecretKey('random_api_token_123');
      assert.equal(nonSk.valid, false);
      assert.equal(nonSk.reason, 'invalid_prefix');

      const empty = validatePaystackSecretKey('');
      assert.equal(empty.valid, false);
      assert.equal(empty.reason, 'missing');
    });

    await t6.test('TEST 23: initialize-payment rejects public key in PAYSTACK_SECRET_KEY with HTTP 500', async () => {
      const mockDb = {
        from: (table) => {
          if (table === 'saas_invoices') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: {
                        id: 'inv-test-pk',
                        invoice_number: 'PHY-INV-2026-000003',
                        practice_id: 'prac-test-1',
                        currency: 'NGN',
                        total_cents: 1000000,
                        status: 'open',
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'saas_payments') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: null }),
                  }),
                }),
              }),
            };
          }
          return {};
        },
      };

      const res = await initializePaymentHandler(
        {
          httpMethod: 'POST',
          headers: { authorization: 'Bearer test-token' },
          body: JSON.stringify({ practice_id: 'prac-test-1', invoice_id: 'inv-test-pk' }),
        },
        {},
        {
          env: { PAYSTACK_SECRET_KEY: 'pk_live_accidental_public_key' },
          supabaseAdmin: mockDb,
          isOwner: true,
          user: { id: 'user-1', email: 'owner@physenra.com' },
        }
      );

      assert.strictEqual(res.statusCode, 500);
      const body = JSON.parse(res.body);
      assert.match(body.error, /Public Key was provided where a Secret Key is required/i);
    });

    await t6.test('TEST 24: initialize-payment translates gateway Invalid key to actionable guidance', async () => {
      const mockDb = {
        from: (table) => {
          if (table === 'saas_invoices') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: {
                        id: 'inv-test-invalid-key',
                        invoice_number: 'PHY-INV-2026-000004',
                        practice_id: 'prac-test-1',
                        currency: 'NGN',
                        total_cents: 1000000,
                        status: 'open',
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'saas_payments') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: null }),
                  }),
                }),
              }),
            };
          }
          return {};
        },
      };

      const invalidKeyFetch = async () => ({
        status: 401,
        json: async () => ({
          status: false,
          message: 'Invalid key',
          type: 'validation_error',
          code: 'invalid_Key',
        }),
      });

      const res = await initializePaymentHandler(
        {
          httpMethod: 'POST',
          headers: { authorization: 'Bearer test-token' },
          body: JSON.stringify({ practice_id: 'prac-test-1', invoice_id: 'inv-test-invalid-key' }),
        },
        {},
        {
          env: { PAYSTACK_SECRET_KEY: 'sk_live_unrecognized_secret' },
          supabaseAdmin: mockDb,
          fetch: invalidKeyFetch,
          isOwner: true,
          user: { id: 'user-1', email: 'owner@physenra.com' },
        }
      );

      assert.strictEqual(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.match(body.error, /Payment gateway authentication failed \(Invalid key in live mode\)/i);
      assert.match(body.error, /Bank Transfer/i);
    });
  });
});
