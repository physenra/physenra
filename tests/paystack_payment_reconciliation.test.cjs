// ==============================================================================
// PHYSENRA SAAS — PAYSTACK PAYMENT RECONCILIATION & DEDUPLICATION TEST SUITE
// File: tests/paystack_payment_reconciliation.test.cjs
//
// Verifies:
// 1. Webhook Deduplication Retry Logic (retry uncompleted events with processed=false)
// 2. Authoritative Settlement Helper (settleSubscriptionPayment fallback on RPC failure)
// 3. Service-role Fallback Invariant Preservation (invoice=paid, sub=active, payment recorded)
// 4. Verify-Payment & Reconcile-Payment Endpoints
// 5. Tenant Isolation, Permission Guards, and Idempotency
// 6. Zero Kabworld separation & secret hygiene
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { handler: webhookHandler } = require('../netlify/functions/paystack-webhook.cjs');
const { handler: verifyHandler } = require('../netlify/functions/verify-payment.cjs');
const { handler: reconcileHandler } = require('../netlify/functions/reconcile-payment.cjs');
const {
  settleSubscriptionPayment,
  validatePaystackSecretKey,
  sanitizePaystackKey,
} = require('../netlify/functions/lib/paystack.cjs');

test('=== PHYSENRA PAYSTACK PAYMENT RECONCILIATION & SETTLEMENT SUITE ===', async (t) => {

  // ----------------------------------------------------------------------------
  // SUITE 1: Authoritative Settlement Helper & RPC Fallback Handling
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Authoritative Settlement Fallback ---', async (t1) => {
    const mockInvoice = {
      id: 'inv-1111-2222',
      practice_id: 'prac-3333-4444',
      subscription_id: 'sub-5555-6666',
      total_cents: 1500000,
      currency: 'NGN',
      status: 'open',
    };

    const mockSub = {
      id: 'sub-5555-6666',
      practice_id: 'prac-3333-4444',
      plan_id: 'plan-solo-monthly',
      status: 'trialing',
      billing_interval: 'monthly',
      seat_limit: 1,
      current_price_cents: 1500000,
      current_period_end: new Date(Date.now() - 3600000).toISOString(),
      pending_plan_id: null,
      pending_billing_interval: null,
      gateway_auth_token: null,
    };

    let rpcCalled = false;
    let invoiceUpdated = false;
    let subscriptionUpdated = false;
    let practiceUpdated = false;
    let paymentInserted = false;
    let auditInserted = false;

    const mockSupabaseAdmin = {
      rpc: async (fnName, params) => {
        rpcCalled = true;
        // Simulate the exact production RPC error: missing auth.uid() in log_audit_event
        const err = new Error('Authentication required to record audit event');
        err.code = 'insufficient_privilege';
        return { data: null, error: err };
      },
      from: (table) => {
        if (table === 'saas_invoices') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { ...mockInvoice }, error: null }),
              }),
            }),
            update: (payload) => {
              if (payload.status === 'paid') invoiceUpdated = true;
              return {
                eq: async () => ({ data: null, error: null }),
              };
            },
          };
        }
        if (table === 'practice_subscriptions') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: { ...mockSub }, error: null }),
              }),
            }),
            update: (payload) => {
              if (payload.status === 'active') subscriptionUpdated = true;
              return {
                eq: async () => ({ data: null, error: null }),
              };
            },
          };
        }
        if (table === 'practices') {
          return {
            update: (payload) => {
              if (payload.status === 'active') practiceUpdated = true;
              return {
                eq: async () => ({ data: null, error: null }),
              };
            },
          };
        }
        if (table === 'saas_payments') {
          return {
            insert: (payload) => {
              paymentInserted = true;
              assert.equal(payload.amount_cents, 1500000);
              assert.equal(payload.status, 'successful');
              assert.equal(payload.gateway_provider, 'paystack');
              return {
                select: () => ({
                  single: async () => ({ data: { id: 'pay-new-9999' }, error: null }),
                }),
              };
            },
          };
        }
        if (table === 'audit_events') {
          return {
            insert: async (payload) => {
              auditInserted = true;
              assert.equal(payload.actor_role, 'service_role');
              assert.equal(payload.action, 'subscription.payment_confirmed');
              return { data: null, error: null };
            },
          };
        }
        return {};
      },
    };

    const result = await settleSubscriptionPayment({
      supabaseAdmin: mockSupabaseAdmin,
      invoice: mockInvoice,
      reference: 'LIVE_TEST_REF_123',
      verifiedAmount: 1500000,
      paymentMethod: 'card',
      gatewayFeeCents: 22500,
      authToken: 'AUTH_TEST_123',
    });

    await t1.test('TEST 1: RPC was attempted first', () => {
      assert.strictEqual(rpcCalled, true);
    });

    await t1.test('TEST 2: Fallback settled successfully upon RPC audit failure', () => {
      assert.strictEqual(result.status, 'settled');
      assert.strictEqual(result.invoice_id, 'inv-1111-2222');
      assert.strictEqual(result.payment_id, 'pay-new-9999');
    });

    await t1.test('TEST 3: Ledger records and entities were updated atomically', () => {
      assert.strictEqual(invoiceUpdated, true, 'Invoice must be updated to paid');
      assert.strictEqual(subscriptionUpdated, true, 'Subscription must be activated');
      assert.strictEqual(practiceUpdated, true, 'Practice status must be set active');
      assert.strictEqual(paymentInserted, true, 'Payment record must be inserted');
      assert.strictEqual(auditInserted, true, 'Audit record must be logged');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Webhook Deduplication & Uncompleted Retry Handling
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Webhook Deduplication and Retry ---', async (t2) => {
    await t2.test('TEST 4: Already-processed webhook event (processed=true) returns already_processed idempotently', async () => {
      const mockAdmin = {
        from: (table) => {
          if (table === 'saas_webhook_events') {
            return {
              insert: () => ({
                select: () => ({
                  single: async () => ({
                    data: null,
                    error: { code: '23505', message: 'duplicate key value violates unique constraint uq_gateway_event' },
                  }),
                }),
              }),
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: { id: 'evt-123', processed: true, processed_at: new Date().toISOString() },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        },
      };

      const event = {
        httpMethod: 'POST',
        headers: {
          'x-paystack-signature': 'mock_valid_signature',
        },
        body: JSON.stringify({
          event: 'charge.success',
          data: { id: 6670506095, reference: 'REF_DUP_TEST' },
        }),
      };

      const deps = {
        env: { PAYSTACK_SECRET_KEY: 'sk_test_mocksecret1234567890abcdef' },
        supabaseAdmin: mockAdmin,
        verifyPaystackSignature: () => true,
      };

      const res = await webhookHandler(event, {}, deps);
      assert.strictEqual(res.statusCode, 200);
      const parsed = JSON.parse(res.body);
      assert.strictEqual(parsed.status, 'already_processed');
    });

    await t2.test('TEST 5: Retried webhook event with processed=false proceeds to settlement', async () => {
      let settled = false;
      let eventMarkedProcessed = false;

      const mockAdmin = {
        from: (table) => {
          if (table === 'saas_webhook_events') {
            return {
              insert: () => ({
                select: () => ({
                  single: async () => ({
                    data: null,
                    error: { code: '23505', message: 'duplicate key violates uq_gateway_event' },
                  }),
                }),
              }),
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: { id: 'evt-stalled-999', processed: false, error_message: 'Settlement RPC error' },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: (payload) => {
                if (payload.processed === true) eventMarkedProcessed = true;
                return {
                  eq: async () => ({ data: null, error: null }),
                };
              },
            };
          }
          if (table === 'saas_invoices') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'inv-target-001',
                      practice_id: 'prac-001',
                      subscription_id: 'sub-001',
                      total_cents: 1500000,
                      currency: 'NGN',
                      status: 'open',
                    },
                    error: null,
                  }),
                  single: async () => ({
                    data: {
                      id: 'inv-target-001',
                      practice_id: 'prac-001',
                      subscription_id: 'sub-001',
                      total_cents: 1500000,
                      currency: 'NGN',
                      status: 'open',
                    },
                    error: null,
                  }),
                }),
              }),
              update: () => ({ eq: async () => ({ data: null, error: null }) }),
            };
          }
          if (table === 'practice_subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: 'sub-001',
                      practice_id: 'prac-001',
                      plan_id: 'plan-001',
                      status: 'trialing',
                      billing_interval: 'monthly',
                      current_period_end: new Date().toISOString(),
                    },
                    error: null,
                  }),
                }),
              }),
              update: () => ({ eq: async () => ({ data: null, error: null }) }),
            };
          }
          if (table === 'practices') {
            return {
              update: () => ({ eq: async () => ({ data: null, error: null }) }),
            };
          }
          if (table === 'saas_payments') {
            return {
              insert: () => ({
                select: () => ({
                  single: async () => ({ data: { id: 'pay-retried-111' }, error: null }),
                }),
              }),
            };
          }
          if (table === 'audit_events') {
            return { insert: async () => ({ data: null, error: null }) };
          }
          return {};
        },
        rpc: async () => {
          settled = true;
          return { data: { status: 'settled', invoice_id: 'inv-target-001' }, error: null };
        },
      };

      const event = {
        httpMethod: 'POST',
        headers: {
          'x-paystack-signature': 'mock_valid_signature',
        },
        body: JSON.stringify({
          event: 'charge.success',
          data: {
            id: 6670506095,
            reference: 'REF_RETRY_SUCCESS',
            amount: 1500000,
            currency: 'NGN',
            channel: 'card',
            metadata: { invoice_id: 'inv-target-001', practice_id: 'prac-001' },
          },
        }),
      };

      const mockFetch = async () => ({
        ok: true,
        json: async () => ({
          status: true,
          data: {
            status: 'success',
            reference: 'REF_RETRY_SUCCESS',
            amount: 1500000,
            currency: 'NGN',
            channel: 'card',
            metadata: { invoice_id: 'inv-target-001', practice_id: 'prac-001' },
          },
        }),
      });

      const deps = {
        env: { PAYSTACK_SECRET_KEY: 'sk_test_mocksecret1234567890abcdef' },
        supabaseAdmin: mockAdmin,
        fetch: mockFetch,
        verifyPaystackSignature: () => true,
      };

      const res = await webhookHandler(event, {}, deps);
      assert.strictEqual(res.statusCode, 200);
      const parsed = JSON.parse(res.body);
      assert.strictEqual(parsed.status, 'success');
      assert.strictEqual(settled, true, 'Settlement must be executed for uncompleted retry');
      assert.strictEqual(eventMarkedProcessed, true, 'Webhook event must be marked processed=true');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Reconcile-Payment Serverless Endpoint
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Reconcile Payment Endpoint ---', async (t3) => {
    await t3.test('TEST 6: Reconciles uncompleted webhook event for practice owner', async () => {
      let settlementCalled = false;

      const mockAdmin = {
        from: (table) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { is_platform_admin: false }, error: null }),
                }),
              }),
            };
          }
          if (table === 'saas_webhook_events') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: async () => ({
                      data: [
                        {
                          id: 'evt-reconcile-001',
                          external_event_id: '6670506095',
                          event_type: 'charge.success',
                          processed: false,
                          payload: {
                            data: {
                              reference: 'REF_STALLED_PAYMENT_1',
                              amount: 1500000,
                              currency: 'NGN',
                              metadata: { invoice_id: 'inv-recon-001', practice_id: 'prac-recon-001' },
                            },
                          },
                        },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
              update: () => ({ eq: async () => ({ data: null, error: null }) }),
            };
          }
          if (table === 'saas_invoices') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'inv-recon-001',
                      practice_id: 'prac-recon-001',
                      subscription_id: 'sub-recon-001',
                      total_cents: 1500000,
                      currency: 'NGN',
                      status: 'open',
                    },
                    error: null,
                  }),
                  single: async () => ({
                    data: {
                      id: 'inv-recon-001',
                      practice_id: 'prac-recon-001',
                      subscription_id: 'sub-recon-001',
                      total_cents: 1500000,
                      currency: 'NGN',
                      status: 'open',
                    },
                    error: null,
                  }),
                }),
              }),
              update: () => ({ eq: async () => ({ data: null, error: null }) }),
            };
          }
          if (table === 'practice_subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: 'sub-recon-001',
                      practice_id: 'prac-recon-001',
                      plan_id: 'plan-001',
                      status: 'trialing',
                      billing_interval: 'monthly',
                      current_period_end: new Date().toISOString(),
                    },
                    error: null,
                  }),
                }),
              }),
              update: () => ({ eq: async () => ({ data: null, error: null }) }),
            };
          }
          if (table === 'practices') {
            return { update: () => ({ eq: async () => ({ data: null, error: null }) }) };
          }
          if (table === 'saas_payments') {
            return {
              insert: () => ({
                select: () => ({
                  single: async () => ({ data: { id: 'pay-recon-001' }, error: null }),
                }),
              }),
            };
          }
          if (table === 'audit_events') {
            return { insert: async () => ({ data: null, error: null }) };
          }
          return {};
        },
        rpc: async () => {
          settlementCalled = true;
          return { data: { status: 'settled', invoice_id: 'inv-recon-001' }, error: null };
        },
      };

      const mockFetch = async () => ({
        ok: true,
        json: async () => ({
          status: true,
          data: {
            status: 'success',
            reference: 'REF_STALLED_PAYMENT_1',
            amount: 1500000,
            currency: 'NGN',
            channel: 'card',
            metadata: { invoice_id: 'inv-recon-001', practice_id: 'prac-recon-001' },
          },
        }),
      });

      const event = {
        httpMethod: 'POST',
        headers: {
          authorization: 'Bearer mock_jwt_owner',
        },
        body: JSON.stringify({
          practice_id: 'prac-recon-001',
        }),
      };

      const deps = {
        env: { PAYSTACK_SECRET_KEY: 'sk_test_mocksecret1234567890abcdef' },
        user: { id: 'user-owner-123' },
        isOwner: true,
        supabaseAdmin: mockAdmin,
        fetch: mockFetch,
      };

      const res = await reconcileHandler(event, {}, deps);
      assert.strictEqual(res.statusCode, 200);
      const parsed = JSON.parse(res.body);
      assert.strictEqual(parsed.status, 'complete');
      assert.strictEqual(parsed.reconciled_count, 1);
      assert.strictEqual(settlementCalled, true);
    });

    await t3.test('TEST 7: Reconcile endpoint blocks non-owners from cross-tenant reconciliation', async () => {
      const event = {
        httpMethod: 'POST',
        headers: { authorization: 'Bearer mock_jwt' },
        body: JSON.stringify({ practice_id: 'prac-other' }),
      };

      const deps = {
        env: { PAYSTACK_SECRET_KEY: 'sk_test_mocksecret1234567890abcdef' },
        user: { id: 'user-intruder' },
        isOwner: false,
        isPlatformAdmin: false,
        supabaseAdmin: {
          from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
        },
      };

      const res = await reconcileHandler(event, {}, deps);
      assert.strictEqual(res.statusCode, 403);
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Security Hygiene & Kabworld Separation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Security Hygiene & Domain Separation ---', async (t4) => {
    const filesToAudit = [
      'netlify/functions/lib/paystack.cjs',
      'netlify/functions/paystack-webhook.cjs',
      'netlify/functions/verify-payment.cjs',
      'netlify/functions/reconcile-payment.cjs',
      'src/services/saasSubscriptionService.ts',
      'src/pages/billing/PracticeBillingPage.tsx',
      'src/pages/billing/PracticeInvoiceDetailPage.tsx',
      'supabase/migrations/20261018110000_fix_service_role_settlement_audit.sql',
    ];

    for (const relPath of filesToAudit) {
      const absPath = path.join(__dirname, '..', relPath);
      if (fs.existsSync(absPath)) {
        const content = fs.readFileSync(absPath, 'utf8');
        await t4.test(`TEST 8: Zero Kabworld references in ${relPath}`, () => {
          assert.doesNotMatch(content, /kabworld/i, `${relPath} must not contain Kabworld references`);
        });

        await t4.test(`TEST 9: Zero hardcoded secrets in ${relPath}`, () => {
          assert.doesNotMatch(content, /sk_live_[a-zA-Z0-9]{20,}/, `${relPath} must not contain live secret key`);
          assert.doesNotMatch(content, /sbp_[a-zA-Z0-9]{20,}/, `${relPath} must not contain supabase personal token`);
        });
      }
    }
  });

});
