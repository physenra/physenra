// ==============================================================================
// PHYSENRA SAAS — PAYSTACK WEBHOOK INGESTION ENDPOINT
// File: netlify/functions/paystack-webhook.cjs
// Route: POST /api/paystack-webhook -> /.netlify/functions/paystack-webhook
//
// Governs:
// 1. Strict raw-body HMAC-SHA512 signature validation (constant-time)
// 2. Webhook idempotency via public.saas_webhook_events deduplication ledger
// 3. Mandatory server-to-server transaction verification against Paystack API
// 4. Exact amount (integer kobo) and currency (NGN) validation
// 5. Authoritative atomic settlement via public.process_subscription_payment_settlement
// 6. Zero clinical/patient data exposure; zero secret leakage
// ==============================================================================

const {
  verifyPaystackSignature,
  mapPaystackChannelToPaymentMethod,
  verifyPaystackTransaction,
  getPaystackEnvironment,
  getSupabaseAdmin,
  settleSubscriptionPayment,
} = require('./lib/paystack.cjs');

/**
 * Netlify Function handler for Paystack webhooks.
 *
 * @param {Object} event - Netlify event object
 * @param {Object} [context] - Netlify context object
 * @param {Object} [deps] - Dependency injection override for automated testing
 * @returns {Promise<{ statusCode: number, headers: Object, body: string }>}
 */
async function handler(event, context, deps = {}) {
  const jsonHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };

  // 1. HTTP Method validation: Webhooks are exclusively POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // 2. Retrieve signature from headers
  const signature =
    event.headers?.['x-paystack-signature'] ||
    event.headers?.['X-Paystack-Signature'] ||
    event.headers?.['X-PAYSTACK-SIGNATURE'];

  if (!signature) {
    return {
      statusCode: 401,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Missing x-paystack-signature header' }),
    };
  }

  // 3. Resolve server-side secret key (NEVER exposed to frontend)
  const env = deps.env || process.env;
  const paystackSecretKey = env.PAYSTACK_SECRET_KEY;

  if (!paystackSecretKey) {
    console.error('[Paystack Webhook] PAYSTACK_SECRET_KEY is not configured in server environment');
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Server payment configuration error' }),
    };
  }

  const paystackEnv = getPaystackEnvironment(paystackSecretKey);
  console.log(`[Paystack Webhook] Paystack operating mode: ${paystackEnv}`);

  // 4. Cryptographic HMAC-SHA512 verification against EXACT raw request body
  const rawBody = event.body || '';
  const verifyFn = deps.verifyPaystackSignature || verifyPaystackSignature;
  const isSignatureValid = verifyFn === verifyPaystackSignature
    ? verifyPaystackSignature(rawBody, signature, paystackSecretKey)
    : verifyFn(rawBody, signature, paystackSecretKey);

  if (!isSignatureValid) {
    console.warn('[Paystack Webhook] Invalid webhook signature rejected');
    return {
      statusCode: 401,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Invalid webhook signature' }),
    };
  }

  // 5. Parse JSON payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (parseErr) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Malformed JSON payload' }),
    };
  }

  const eventType = payload.event;
  const eventData = payload.data || {};
  const externalEventId = String(eventData.id || payload.id || eventData.reference || `evt_${Date.now()}`);

  // 6. Supabase Admin Client
  let supabaseAdmin;
  try {
    supabaseAdmin = deps.supabaseAdmin || getSupabaseAdmin(env);
  } catch (clientErr) {
    console.error('[Paystack Webhook] Failed to initialize Supabase admin client:', clientErr.message);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Database service configuration error' }),
    };
  }

  // 7. Authoritative Webhook Deduplication Ledger (saas_webhook_events)
  let webhookRecordId = null;
  try {
    const { data: insertData, error: insertErr } = await supabaseAdmin
      .from('saas_webhook_events')
      .insert({
        gateway: 'paystack',
        external_event_id: externalEventId,
        event_type: eventType || 'unknown',
        payload: payload,
        signature_verified: true,
        processed: false,
      })
      .select('id')
      .single();

    if (insertErr) {
      // Check for uniqueness constraint violation (duplicate or retried webhook delivery)
      if (insertErr.code === '23505' || insertErr.message?.includes('duplicate key') || insertErr.message?.includes('uq_gateway_event')) {
        const { data: existingEvent, error: fetchErr } = await supabaseAdmin
          .from('saas_webhook_events')
          .select('id, processed, processed_at, error_message')
          .eq('gateway', 'paystack')
          .eq('external_event_id', externalEventId)
          .maybeSingle();

        if (existingEvent && existingEvent.processed) {
          console.log(`[Paystack Webhook] Duplicate event ignored (already successfully processed): ${externalEventId}`);
          return {
            statusCode: 200,
            headers: jsonHeaders,
            body: JSON.stringify({
              status: 'already_processed',
              message: 'Webhook event already recorded and processed',
              external_event_id: externalEventId,
            }),
          };
        }

        if (existingEvent && !existingEvent.processed) {
          console.log(`[Paystack Webhook] Retrying previously uncompleted webhook event: ${externalEventId}`);
          webhookRecordId = existingEvent.id;
        } else {
          // If query returned null or error, throw to return 500 so gateway retries later
          console.error(`[Paystack Webhook] Uniqueness conflict but failed to inspect existing event ${externalEventId}:`, fetchErr?.message);
          throw insertErr;
        }
      } else {
        throw insertErr;
      }
    } else {
      webhookRecordId = insertData.id;
    }
  } catch (dbErr) {
    console.error('[Paystack Webhook] Error recording webhook event:', dbErr.message);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Failed to record webhook event' }),
    };
  }

  // 8. Event filtering: Safely acknowledge non-charge events without settlement
  if (eventType !== 'charge.success') {
    if (webhookRecordId) {
      await supabaseAdmin
        .from('saas_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: `Ignored unhandled event type: ${eventType}`,
        })
        .eq('id', webhookRecordId);
    }
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        status: 'ignored',
        message: `Event type ${eventType} acknowledged without financial settlement`,
      }),
    };
  }

  // 9. Process 'charge.success'
  const reference = eventData.reference;
  if (!reference) {
    if (webhookRecordId) {
      await supabaseAdmin
        .from('saas_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: 'Missing reference in charge.success event data',
        })
        .eq('id', webhookRecordId);
    }
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Missing payment reference in event data' }),
    };
  }

  // 10. Mandatory Server-to-Server Verification with Paystack API
  let verifyResult;
  try {
    const customFetch = deps.fetch || globalThis.fetch;
    verifyResult = await verifyPaystackTransaction(reference, paystackSecretKey, customFetch);
  } catch (verifyErr) {
    console.error('[Paystack Webhook] Paystack API verification request failed:', verifyErr.message);
    if (webhookRecordId) {
      await supabaseAdmin
        .from('saas_webhook_events')
        .update({
          error_message: `Paystack API verification network error: ${verifyErr.message}`,
        })
        .eq('id', webhookRecordId);
    }
    return {
      statusCode: 502,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Failed to verify transaction with gateway' }),
    };
  }

  if (!verifyResult || !verifyResult.status || verifyResult.data?.status !== 'success') {
    const errorMsg = verifyResult?.message || 'Gateway reported transaction not successful';
    if (webhookRecordId) {
      await supabaseAdmin
        .from('saas_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: `Paystack verification rejected: ${errorMsg}`,
        })
        .eq('id', webhookRecordId);
    }
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: `Gateway verification failed: ${errorMsg}` }),
    };
  }

  const verified = verifyResult.data;

  // 11. Resolve authoritative invoice ID
  const invoiceId = verified.metadata?.invoice_id || eventData.metadata?.invoice_id;
  if (!invoiceId) {
    if (webhookRecordId) {
      await supabaseAdmin
        .from('saas_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: 'Transaction metadata missing invoice_id',
        })
        .eq('id', webhookRecordId);
    }
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Missing invoice_id in transaction metadata' }),
    };
  }

  // 12. Retrieve authoritative invoice from database
  const { data: invoice, error: invoiceErr } = await supabaseAdmin
    .from('saas_invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle();

  if (invoiceErr || !invoice) {
    const errText = invoiceErr ? invoiceErr.message : `Invoice ${invoiceId} not found`;
    if (webhookRecordId) {
      await supabaseAdmin
        .from('saas_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: errText,
        })
        .eq('id', webhookRecordId);
    }
    return {
      statusCode: 404,
      headers: jsonHeaders,
      body: JSON.stringify({ error: errText }),
    };
  }

  // 13. Validate invoice state: reject void, handle already paid idempotently
  if (invoice.status === 'void') {
    if (webhookRecordId) {
      await supabaseAdmin
        .from('saas_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: 'Cannot settle void invoice',
        })
        .eq('id', webhookRecordId);
    }
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Cannot settle void invoice' }),
    };
  }

  if (invoice.status === 'paid') {
    if (webhookRecordId) {
      await supabaseAdmin
        .from('saas_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: 'Invoice was already paid; duplicate settlement skipped',
        })
        .eq('id', webhookRecordId);
    }
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        status: 'already_paid',
        message: 'Invoice has already been settled',
        invoice_id: invoice.id,
      }),
    };
  }

  // 14. Strict Amount & Currency Matching (Integer Kobo)
  if (verified.currency !== invoice.currency) {
    const errMsg = `Currency mismatch: expected ${invoice.currency}, received ${verified.currency}`;
    if (webhookRecordId) {
      await supabaseAdmin
        .from('saas_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: errMsg,
        })
        .eq('id', webhookRecordId);
    }
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: errMsg }),
    };
  }

  if (Number(verified.amount) !== Number(invoice.total_cents)) {
    const errMsg = `Amount mismatch: expected ${invoice.total_cents} kobo, received ${verified.amount} kobo`;
    if (webhookRecordId) {
      await supabaseAdmin
        .from('saas_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: errMsg,
        })
        .eq('id', webhookRecordId);
    }
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: errMsg }),
    };
  }

  // 15. Invoke Authoritative Settlement (RPC with direct service-role fallback)
  const paymentMethod = mapPaystackChannelToPaymentMethod(verified.channel);
  const gatewayFeeCents = verified.fees || 0;
  const authToken = verified.authorization?.authorization_code || null;

  try {
    const settlementData = await settleSubscriptionPayment({
      supabaseAdmin,
      invoice,
      reference,
      verifiedAmount: verified.amount,
      paymentMethod,
      gatewayFeeCents,
      authToken,
    });

    // 16. Mark webhook event as successfully processed
    if (webhookRecordId) {
      await supabaseAdmin
        .from('saas_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', webhookRecordId);
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        status: 'success',
        settlement: settlementData,
      }),
    };
  } catch (settleErr) {
    console.error('[Paystack Webhook] Settlement failure:', settleErr.message);
    if (webhookRecordId) {
      await supabaseAdmin
        .from('saas_webhook_events')
        .update({
          error_message: `Settlement error: ${settleErr.message}`,
        })
        .eq('id', webhookRecordId);
    }
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: `Settlement execution failed: ${settleErr.message}` }),
    };
  }
}

module.exports = { handler };
