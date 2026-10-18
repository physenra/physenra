// ==============================================================================
// PHYSENRA SAAS — PAYSTACK SERVER-SIDE FALLBACK VERIFICATION ENDPOINT
// File: netlify/functions/verify-payment.cjs
// Route: POST /api/verify-payment -> /.netlify/functions/verify-payment
//
// Governs:
// 1. Fallback verification when client redirect fires before asynchronous webhook
// 2. Mandatory JWT user authentication via Supabase Auth
// 3. Verified practice_owner role authorization guard
// 4. Server-to-server transaction verification directly with Paystack API
// 5. Verification of amount, currency, and practice tenant isolation
// 6. Idempotent settlement via public.process_subscription_payment_settlement
// ==============================================================================

const {
  verifyPaystackTransaction,
  validatePaystackSecretKey,
  mapPaystackChannelToPaymentMethod,
  getPaystackEnvironment,
  getSupabaseAdmin,
  authenticateUser,
  verifyPracticeOwner,
} = require('./lib/paystack.cjs');

/**
 * Netlify Function handler for server-side Paystack payment verification.
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

  // 1. HTTP Method validation: POST only
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const env = deps.env || process.env;

  // 2. Initialize Supabase Admin
  let supabaseAdmin;
  try {
    supabaseAdmin = deps.supabaseAdmin || getSupabaseAdmin(env);
  } catch (clientErr) {
    console.error('[Verify Payment] Database client initialization failed:', clientErr.message);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Database service configuration error' }),
    };
  }

  // 3. Authenticate caller via JWT
  const authHeader =
    event.headers?.authorization ||
    event.headers?.Authorization ||
    event.headers?.AUTHORIZATION;

  const user = deps.user || (await authenticateUser(authHeader, supabaseAdmin));
  if (!user || !user.id) {
    return {
      statusCode: 401,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Authentication required' }),
    };
  }

  // 4. Parse request payload
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (parseErr) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Malformed JSON payload' }),
    };
  }

  const { practice_id, reference } = payload;
  if (!practice_id || typeof practice_id !== 'string') {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'practice_id is required' }),
    };
  }

  if (!reference || typeof reference !== 'string') {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'reference is required' }),
    };
  }

  // 5. Validate practice ownership guard
  const isOwner =
    deps.isOwner !== undefined
      ? deps.isOwner
      : await verifyPracticeOwner(user.id, practice_id, supabaseAdmin);

  if (!isOwner) {
    return {
      statusCode: 403,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Access denied: Only verified practice owners may verify payments' }),
    };
  }

  // 6. Fast Idempotency Check: Was this reference already settled?
  const { data: existingPayment } = await supabaseAdmin
    .from('saas_payments')
    .select('id, payment_number, status, invoice_id, amount_cents, currency, settled_at')
    .eq('gateway_reference', reference)
    .eq('practice_id', practice_id)
    .maybeSingle();

  if (existingPayment && existingPayment.status === 'successful') {
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        status: 'already_paid',
        message: 'Payment has already been settled',
        payment_id: existingPayment.id,
        invoice_id: existingPayment.invoice_id,
        reference: reference,
      }),
    };
  }

  // 7. Mandatory Server-to-Server Verification with Paystack API
  const rawSecretKey = env.PAYSTACK_SECRET_KEY;
  const keyValidation = validatePaystackSecretKey(rawSecretKey);
  if (!keyValidation.valid) {
    console.error(`[Verify Payment] Paystack secret key validation error: ${keyValidation.message}`);
    const clientErrMsg = keyValidation.reason === 'public_key_provided'
      ? 'Payment gateway configuration error: A Paystack Public Key was provided where a Secret Key is required. Please update PAYSTACK_SECRET_KEY in Netlify settings.'
      : 'Server payment configuration error. Please contact practice administrator.';
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: clientErrMsg }),
    };
  }

  const paystackSecretKey = keyValidation.key;
  const paystackEnv = keyValidation.mode;
  console.log(`[Verify Payment] Paystack operating mode: ${paystackEnv}`);

  let verifyResult;
  try {
    const customFetch = deps.fetch || globalThis.fetch;
    verifyResult = await verifyPaystackTransaction(reference, paystackSecretKey, customFetch);
  } catch (verifyErr) {
    console.error('[Verify Payment] Paystack API request failed:', verifyErr.message);
    return {
      statusCode: 502,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Failed to communicate with payment gateway' }),
    };
  }

  if (!verifyResult || !verifyResult.status || verifyResult.data?.status !== 'success') {
    const rawErrMsg = verifyResult?.message || 'Gateway reported transaction not successful';
    const isInvalidKey = /invalid key/i.test(rawErrMsg) || verifyResult?.code === 'invalid_Key';

    if (isInvalidKey) {
      console.error(`[Verify Payment] Paystack API rejected the secret key (${paystackEnv} mode) as invalid.`);
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: `Payment gateway verification failed (Invalid key in ${paystackEnv} mode). Please verify your Paystack Live Secret Key in Netlify.`,
        }),
      };
    }

    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: `Gateway verification failed: ${rawErrMsg}` }),
    };
  }

  const verified = verifyResult.data;

  // 8. Practice Tenant Isolation Check
  const paymentPracticeId = verified.metadata?.practice_id;
  if (paymentPracticeId && paymentPracticeId !== practice_id) {
    return {
      statusCode: 403,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Cross-tenant violation: Payment does not belong to specified practice' }),
    };
  }

  // 9. Resolve invoice from metadata
  const invoiceId = verified.metadata?.invoice_id;
  if (!invoiceId) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Transaction metadata missing invoice_id' }),
    };
  }

  // 10. Retrieve authoritative invoice
  const { data: invoice, error: invoiceErr } = await supabaseAdmin
    .from('saas_invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('practice_id', practice_id)
    .maybeSingle();

  if (invoiceErr || !invoice) {
    return {
      statusCode: 404,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Authoritative invoice not found or does not belong to specified practice' }),
    };
  }

  // 11. Check invoice state
  if (invoice.status === 'void') {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Cannot settle void invoice' }),
    };
  }

  if (invoice.status === 'paid') {
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

  // 12. Amount & Currency Matching (Integer Kobo)
  if (verified.currency !== invoice.currency) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: `Currency mismatch: expected ${invoice.currency}, received ${verified.currency}`,
      }),
    };
  }

  if (Number(verified.amount) !== Number(invoice.total_cents)) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: `Amount mismatch: expected ${invoice.total_cents} kobo, received ${verified.amount} kobo`,
      }),
    };
  }

  // 13. Settle via Database RPC
  const paymentMethod = mapPaystackChannelToPaymentMethod(verified.channel);
  const gatewayFeeCents = verified.fees || 0;
  const authToken = verified.authorization?.authorization_code || null;

  try {
    const { data: settlementData, error: settlementErr } = await supabaseAdmin.rpc(
      'process_subscription_payment_settlement',
      {
        p_invoice_id: invoice.id,
        p_gateway: 'paystack',
        p_gateway_reference: reference,
        p_amount_cents: verified.amount,
        p_payment_method: paymentMethod,
        p_gateway_fee_cents: gatewayFeeCents,
        p_auth_token: authToken,
      }
    );

    if (settlementErr) {
      throw settlementErr;
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        status: 'success',
        settlement: settlementData,
      }),
    };
  } catch (rpcErr) {
    console.error('[Verify Payment] Settlement RPC failure:', rpcErr.message);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: `Settlement execution failed: ${rpcErr.message}` }),
    };
  }
}

module.exports = { handler };
