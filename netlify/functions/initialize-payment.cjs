// ==============================================================================
// PHYSENRA SAAS — PAYSTACK PAYMENT INITIALIZATION ENDPOINT
// File: netlify/functions/initialize-payment.cjs
// Route: POST /api/initialize-payment -> /.netlify/functions/initialize-payment
//
// Governs:
// 1. Mandatory JWT user authentication via Supabase Auth
// 2. Verified practice_owner role authorization guard
// 3. Retrieval of authoritative open invoice (client amount is strictly rejected)
// 4. Server-to-server Paystack transaction initialization
// 5. Minimal client response (authorization_url, access_code, reference)
// 6. Absolute zero leakage of PAYSTACK_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY
// ==============================================================================

const {
  initializePaystackTransaction,
  validatePaystackSecretKey,
  getPaystackEnvironment,
  getSupabaseAdmin,
  authenticateUser,
  verifyPracticeOwner,
} = require('./lib/paystack.cjs');

/**
 * Netlify Function handler for Paystack payment initialization.
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
    console.error('[Initialize Payment] Database client initialization failed:', clientErr.message);
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

  const { practice_id, invoice_id } = payload;
  if (!practice_id || typeof practice_id !== 'string') {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'practice_id is required' }),
    };
  }

  if (!invoice_id || typeof invoice_id !== 'string') {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'invoice_id is required' }),
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
      body: JSON.stringify({ error: 'Access denied: Only verified practice owners may initiate payments' }),
    };
  }

  // 6. Retrieve authoritative invoice from database (ignoring any client amount)
  const { data: invoice, error: invoiceErr } = await supabaseAdmin
    .from('saas_invoices')
    .select('*')
    .eq('id', invoice_id)
    .eq('practice_id', practice_id)
    .maybeSingle();

  if (invoiceErr || !invoice) {
    return {
      statusCode: 404,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Invoice not found or does not belong to specified practice' }),
    };
  }

  // 7. Verify invoice commercial state
  if (invoice.status === 'paid') {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Invoice is already paid' }),
    };
  }

  if (invoice.status === 'void') {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Invoice has been voided' }),
    };
  }

  if (invoice.status !== 'open') {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: `Invoice cannot be settled in status '${invoice.status}'` }),
    };
  }

  if (invoice.total_cents <= 0) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Invoice amount must be greater than zero' }),
    };
  }

  if (invoice.currency !== 'NGN') {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Only NGN currency is supported for Paystack payments' }),
    };
  }

  // 8. Verify no conflicting successful payment exists in saas_payments ledger
  const { data: existingPayment } = await supabaseAdmin
    .from('saas_payments')
    .select('id, payment_number, status')
    .eq('invoice_id', invoice.id)
    .eq('status', 'successful')
    .maybeSingle();

  if (existingPayment) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: 'Invoice has already been settled in the payment ledger',
        payment_id: existingPayment.id,
      }),
    };
  }

  // 9. Derive authoritative gateway reference
  const invNumClean = String(invoice.invoice_number || 'INV').replace(/^PHY-INV-/, '');
  const timestampSuffix = Date.now().toString(36).toUpperCase();
  const reference = `PHY-SUB-${invNumClean}-${timestampSuffix}`;

  // 10. Call Paystack API server-side
  const rawSecretKey = env.PAYSTACK_SECRET_KEY;
  const keyValidation = validatePaystackSecretKey(rawSecretKey);
  if (!keyValidation.valid) {
    console.error(`[Initialize Payment] Paystack secret key validation error: ${keyValidation.message}`);
    const clientErrMsg = keyValidation.reason === 'public_key_provided'
      ? 'Payment gateway configuration error: A Paystack Public Key was provided where a Secret Key is required. Please update PAYSTACK_SECRET_KEY in Netlify settings.'
      : 'Server payment configuration error. Please try again or use Bank Transfer.';
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: clientErrMsg }),
    };
  }

  const paystackSecretKey = keyValidation.key;
  const paystackEnv = keyValidation.mode;
  console.log(`[Initialize Payment] Paystack operating mode: ${paystackEnv}`);

  const callbackUrl =
    env.PAYSTACK_CALLBACK_URL ||
    `${env.URL || 'https://physenra.com'}/app/billing?reference=${encodeURIComponent(reference)}`;

  const userEmail = user.email || 'practice_owner@physenra.com';

  let initResponse;
  try {
    const customFetch = deps.fetch || globalThis.fetch;
    initResponse = await initializePaystackTransaction(
      {
        email: userEmail,
        amount: invoice.total_cents, // authoritative integer kobo
        reference: reference,
        callback_url: callbackUrl,
        metadata: {
          practice_id: practice_id,
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          purpose: 'practice_subscription_payment',
        },
      },
      paystackSecretKey,
      customFetch
    );
  } catch (apiErr) {
    console.error('[Initialize Payment] Paystack API request failed:', apiErr.message);
    return {
      statusCode: 502,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Failed to communicate with payment gateway. Please try again or use Bank Transfer.' }),
    };
  }

  if (!initResponse || !initResponse.status || !initResponse.data) {
    const rawErrMsg = initResponse?.message || 'Gateway rejected transaction initialization';
    const isInvalidKey = /invalid key/i.test(rawErrMsg) || initResponse?.code === 'invalid_Key';

    if (isInvalidKey) {
      console.error(`[Initialize Payment] Paystack API rejected the secret key (${paystackEnv} mode) as invalid.`);
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: `Payment gateway authentication failed (Invalid key in ${paystackEnv} mode). Please verify your Paystack Live Secret Key in Netlify, or use Bank Transfer.`,
        }),
      };
    }

    console.error(`[Initialize Payment] Gateway rejected transaction initialization: ${rawErrMsg}`);
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: rawErrMsg }),
    };
  }

  const authUrl = initResponse.data.authorization_url;
  if (!authUrl || typeof authUrl !== 'string' || !authUrl.startsWith('http')) {
    console.error('[Initialize Payment] Gateway returned an invalid authorization_url');
    return {
      statusCode: 502,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Payment gateway returned an invalid checkout URL' }),
    };
  }

  // 11. Return checkout credentials (authorization_url, access_code, reference)
  // CRITICAL: NEVER leak secret keys or service role credentials!
  return {
    statusCode: 200,
    headers: jsonHeaders,
    body: JSON.stringify({
      success: true,
      authorization_url: authUrl,
      access_code: initResponse.data.access_code,
      reference: reference,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      amount_cents: invoice.total_cents,
      currency: invoice.currency,
    }),
  };
}

module.exports = { handler };
