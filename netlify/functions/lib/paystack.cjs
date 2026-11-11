// ==============================================================================
// PHYSENRA SAAS — PAYSTACK & SERVERLESS UTILITIES
// File: netlify/functions/lib/paystack.cjs
//
// Governs:
// 1. Cryptographic HMAC-SHA512 webhook signature verification (timing-safe)
// 2. Paystack API client (transaction initialization & server-side verification)
// 3. Supabase administrative client initialization (service-role only)
// 4. JWT user authentication & practice ownership verification
// 5. Payment channel to database enum mapping
// ==============================================================================

const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

/**
 * Validates Paystack webhook signature using constant-time HMAC-SHA512 comparison.
 * Must be executed against the EXACT raw request body string.
 *
 * @param {string} rawBody - Raw unparsed request body string
 * @param {string} signature - Hex signature from x-paystack-signature header
 * @param {string} secretKey - PAYSTACK_SECRET_KEY
 * @returns {boolean} True if signature is valid, false otherwise
 */
/**
 * Normalizes and sanitizes a Paystack key string:
 * - Strips zero-width unicode characters and BOM (\u200B-\u200D, \uFEFF)
 * - Trims standard and unicode whitespace
 * - Strips accidental surrounding quotes (double or single)
 * - Strips redundant 'Bearer ' prefix if accidentally entered
 *
 * @param {string} [key]
 * @returns {string} Cleaned key string, or empty string
 */
function sanitizePaystackKey(key) {
  if (!key || typeof key !== 'string') {
    return '';
  }
  return key
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^Bearer\s+/i, '')
    .trim();
}

/**
 * Validates that a Paystack secret key has the required format and prefix for backend API calls.
 * Rejects public keys (pk_...) with an explicit error to prevent authentication rejections.
 *
 * @param {string} [key]
 * @returns {{ valid: boolean, key?: string, mode?: 'live'|'test', reason?: string, message: string }}
 */
function validatePaystackSecretKey(key) {
  const sanitized = sanitizePaystackKey(key);
  if (!sanitized) {
    return {
      valid: false,
      reason: 'missing',
      message: 'PAYSTACK_SECRET_KEY is missing or empty',
    };
  }

  if (sanitized.startsWith('pk_live_') || sanitized.startsWith('pk_test_')) {
    const prefix = sanitized.substring(0, 7);
    return {
      valid: false,
      reason: 'public_key_provided',
      message: `PAYSTACK_SECRET_KEY is misconfigured with a Public Key (${prefix}...). A Secret Key (sk_...) is required for backend API calls.`,
    };
  }

  if (!sanitized.startsWith('sk_live_') && !sanitized.startsWith('sk_test_')) {
    return {
      valid: false,
      reason: 'invalid_prefix',
      message: 'PAYSTACK_SECRET_KEY does not start with a valid secret key prefix (sk_live_ or sk_test_).',
    };
  }

  return {
    valid: true,
    key: sanitized,
    mode: sanitized.startsWith('sk_live_') ? 'live' : 'test',
    message: 'Valid secret key format',
  };
}

/**
 * Validates Paystack webhook signature using constant-time HMAC-SHA512 comparison.
 * Must be executed against the EXACT raw request body string.
 *
 * @param {string} rawBody - Raw unparsed request body string
 * @param {string} signature - Hex signature from x-paystack-signature header
 * @param {string} secretKey - PAYSTACK_SECRET_KEY
 * @returns {boolean} True if signature is valid, false otherwise
 */
function verifyPaystackSignature(rawBody, signature, secretKey) {
  if (typeof rawBody !== 'string' || !rawBody) {
    return false;
  }
  if (typeof signature !== 'string' || !signature) {
    return false;
  }
  if (typeof secretKey !== 'string' || !secretKey) {
    return false;
  }

  const cleanSecretKey = sanitizePaystackKey(secretKey);
  if (!cleanSecretKey) {
    return false;
  }

  try {
    const expectedHex = crypto
      .createHmac('sha512', cleanSecretKey)
      .update(rawBody)
      .digest('hex');

    // Signatures must be valid hex strings of identical length
    if (!/^[0-9a-fA-F]+$/.test(signature)) {
      return false;
    }

    const sigBuf = Buffer.from(signature.toLowerCase(), 'hex');
    const expectedBuf = Buffer.from(expectedHex.toLowerCase(), 'hex');

    if (sigBuf.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  } catch (err) {
    return false;
  }
}

/**
 * Maps Paystack transaction channel string to allowed database enum.
 * Allowed in saas_payments: 'card', 'bank_transfer', 'ussd', 'manual', 'offline'
 *
 * @param {string} channel
 * @returns {string}
 */
function mapPaystackChannelToPaymentMethod(channel) {
  if (!channel || typeof channel !== 'string') {
    return 'card';
  }
  const normalized = channel.toLowerCase().trim();
  switch (normalized) {
    case 'card':
      return 'card';
    case 'bank':
    case 'bank_transfer':
    case 'dedicated_nuban':
    case 'eft':
      return 'bank_transfer';
    case 'ussd':
      return 'ussd';
    case 'manual':
      return 'manual';
    case 'offline':
      return 'offline';
    default:
      return 'card';
  }
}

/**
 * Initializes a Paystack transaction server-side.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {number} params.amount - Amount in Kobo (integer)
 * @param {string} params.reference
 * @param {string} [params.callback_url]
 * @param {Object} [params.metadata]
 * @param {string} secretKey
 * @param {Function} [customFetch]
 * @returns {Promise<{ status: boolean, message: string, data?: { authorization_url: string, access_code: string, reference: string } }>}
 */
async function initializePaystackTransaction(params, secretKey, customFetch) {
  const fetchFn = customFetch || globalThis.fetch;
  if (typeof fetchFn !== 'function') {
    throw new Error('fetch implementation is required for initializePaystackTransaction');
  }

  const keyValidation = validatePaystackSecretKey(secretKey);
  if (!keyValidation.valid) {
    throw new Error(keyValidation.message);
  }
  const cleanSecretKey = keyValidation.key;

  if (!params.amount || typeof params.amount !== 'number' || params.amount <= 0 || !Number.isInteger(params.amount)) {
    throw new Error('Transaction amount must be a positive integer in kobo');
  }

  if (!params.email || typeof params.email !== 'string') {
    throw new Error('Customer email is required to initialize transaction');
  }

  if (!params.reference || typeof params.reference !== 'string') {
    throw new Error('Transaction reference is required');
  }

  const payload = {
    email: params.email.trim(),
    amount: params.amount,
    reference: params.reference.trim(),
    currency: 'NGN',
    callback_url: params.callback_url,
    metadata: params.metadata || {},
  };

  const response = await fetchFn('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cleanSecretKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let responseData;
  try {
    responseData = await response.json();
  } catch (jsonErr) {
    throw new Error(`Invalid JSON response from Paystack gateway (HTTP ${response.status})`);
  }

  return responseData;
}

/**
 * Verifies a transaction status directly with Paystack API server-to-server.
 *
 * @param {string} reference - Gateway reference to verify
 * @param {string} secretKey - PAYSTACK_SECRET_KEY
 * @param {Function} [customFetch]
 * @returns {Promise<{ status: boolean, message: string, data?: { status: string, reference: string, amount: number, currency: string, channel: string, fees: number, authorization?: Object, metadata?: Object, paid_at?: string } }>}
 */
async function verifyPaystackTransaction(reference, secretKey, customFetch) {
  const fetchFn = customFetch || globalThis.fetch;
  if (typeof fetchFn !== 'function') {
    throw new Error('fetch implementation is required for verifyPaystackTransaction');
  }

  const keyValidation = validatePaystackSecretKey(secretKey);
  if (!keyValidation.valid) {
    throw new Error(keyValidation.message);
  }
  const cleanSecretKey = keyValidation.key;

  if (!reference || typeof reference !== 'string') {
    throw new Error('Valid transaction reference is required for verification');
  }

  const url = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference.trim())}`;
  const response = await fetchFn(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${cleanSecretKey}`,
      Accept: 'application/json',
    },
  });

  let responseData;
  try {
    responseData = await response.json();
  } catch (jsonErr) {
    throw new Error(`Invalid JSON response from Paystack gateway (HTTP ${response.status})`);
  }

  return responseData;
}

/**
 * Constructs a Supabase admin client equipped with the service-role key.
 *
 * @param {Object} [customEnv]
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getSupabaseAdmin(customEnv) {
  const env = customEnv || process.env;
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL (or VITE_SUPABASE_URL) must be configured in environment');
  }
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must be configured in environment');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Authenticates a caller using a Bearer token against Supabase.
 *
 * @param {string} authHeader - Authorization header (Bearer <token>)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @returns {Promise<import('@supabase/supabase-js').User|null>}
 */
async function authenticateUser(authHeader, supabaseAdmin) {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }
  const token = parts[1];
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data || !data.user) {
    return null;
  }
  return data.user;
}

/**
 * Verifies that a user has 'practice_owner' role in the specified practice,
 * or is a platform administrator.
 *
 * @param {string} userId
 * @param {string} practiceId
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @returns {Promise<boolean>}
 */
async function verifyPracticeOwner(userId, practiceId, supabaseAdmin) {
  if (!userId || !practiceId) return false;

  // 1. Check if user is a platform administrator
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', userId)
    .maybeSingle();

  if (profile && profile.is_platform_admin === true) {
    return true;
  }

  // 2. Check practice membership with practice_owner role
  const { data: membership } = await supabaseAdmin
    .from('practice_memberships')
    .select('id, role, status')
    .eq('practice_id', practiceId)
    .eq('user_id', userId)
    .eq('role', 'practice_owner')
    .eq('status', 'active')
    .maybeSingle();

  return Boolean(membership);
}

/**
 * Detects whether a Paystack API key or environment is configured for test or live mode.
 *
 * @param {string} [key] - PAYSTACK_SECRET_KEY or PAYSTACK_PUBLIC_KEY
 * @returns {'test' | 'live' | 'unconfigured' | 'unknown'}
 */
function getPaystackEnvironment(key) {
  if (!key || typeof key !== 'string') {
    return 'unconfigured';
  }
  const sanitized = sanitizePaystackKey(key);
  if (!sanitized) {
    return 'unconfigured';
  }
  if (sanitized.startsWith('sk_test_') || sanitized.startsWith('pk_test_')) {
    return 'test';
  }
  if (sanitized.startsWith('sk_live_') || sanitized.startsWith('pk_live_')) {
    return 'live';
  }
  return 'unknown';
}

/**
 * Authoritatively settles an invoice and activates its practice subscription.
 *
 * Execution order:
 * 1. Tries authoritative PostgreSQL RPC: process_subscription_payment_settlement
 * 2. If the RPC succeeds, returns the result immediately.
 * 3. If the RPC fails due to an audit logging exception (e.g. 'Authentication required to record audit event'
 *    thrown when executed by service_role without auth.uid()), executes direct atomic service-role settlement fallback:
 *    - Re-verifies invoice state (rejects void or already paid)
 *    - Re-verifies amount matching
 *    - Calculates new subscription period (advances from max(now, current_period_end) by 1 month or 1 year)
 *    - Promotes pending plan if set
 *    - Records payment ledger row in saas_payments
 *    - Marks saas_invoices status = 'paid'
 *    - Updates practice_subscriptions status = 'active'
 *    - Ensures practices status = 'active'
 *    - Records audit_event with actor_role = 'service_role'
 *
 * @param {Object} params
 * @param {import('@supabase/supabase-js').SupabaseClient} params.supabaseAdmin
 * @param {Object} params.invoice - The saas_invoice record
 * @param {string} params.reference - Paystack gateway reference
 * @param {number|string} params.verifiedAmount - Amount in Kobo
 * @param {string} params.paymentMethod - Channel mapped to enum ('card', 'bank_transfer', etc.)
 * @param {number} [params.gatewayFeeCents=0] - Gateway fee in Kobo
 * @param {string|null} [params.authToken=null] - Reusable authorization token
 * @param {string|null} [params.paidAt=null] - Authoritative payment timestamp
 * @returns {Promise<{ status: 'settled'|'already_paid', invoice_id: string, payment_id?: string, plan_id?: string, seat_limit?: number, new_period_end?: string }>}
 */
async function settleSubscriptionPayment({
  supabaseAdmin,
  invoice,
  reference,
  verifiedAmount,
  paymentMethod,
  gatewayFeeCents = 0,
  authToken = null,
  paidAt = null,
}) {
  const numericAmount = Number(verifiedAmount);

  // 1. Attempt authoritative database RPC
  let rpcErr = null;
  try {
    const { data: settlementData, error: settlementErr } = await supabaseAdmin.rpc(
      'process_subscription_payment_settlement',
      {
        p_invoice_id: invoice.id,
        p_gateway: 'paystack',
        p_gateway_reference: reference,
        p_amount_cents: numericAmount,
        p_payment_method: paymentMethod,
        p_gateway_fee_cents: gatewayFeeCents || 0,
        p_auth_token: authToken || null,
        p_paid_at: paidAt || null,
      }
    );

    if (settlementErr) {
      if (
        settlementErr.message?.includes('Gateway reference collision') ||
        settlementErr.message?.includes('cannot be settled') ||
        settlementErr.code === '23505'
      ) {
        throw new Error(settlementErr.message);
      }
      rpcErr = settlementErr;
    } else if (settlementData) {
      if (settlementData.status === 'error') {
        throw new Error(settlementData.message || `Settlement error: ${settlementData.error_code}`);
      }
      return settlementData;
    }
  } catch (err) {
    if (err.message?.includes('Gateway reference collision') || err.message?.includes('cannot be settled')) {
      throw err;
    }
    rpcErr = err;
  }

  // If RPC failed due to missing auth.uid() in audit log or general RPC execution error,
  // execute direct service-role table settlement fallback to preserve financial invariants.
  console.warn(
    `[Paystack Settlement] Database RPC error (${rpcErr?.message || 'unknown'}). Initiating direct service-role settlement fallback for invoice ${invoice.id}...`
  );

  // 2. Lock & re-verify authoritative invoice
  const { data: currentInv, error: invFetchErr } = await supabaseAdmin
    .from('saas_invoices')
    .select('*')
    .eq('id', invoice.id)
    .single();

  if (invFetchErr || !currentInv) {
    throw new Error(`Failed to fetch invoice ${invoice.id} for fallback settlement: ${invFetchErr?.message || 'not found'}`);
  }

  if (currentInv.status === 'paid') {
    return { status: 'already_paid', invoice_id: currentInv.id };
  }

  if (currentInv.status === 'void') {
    throw new Error(`Cannot settle void invoice ${currentInv.id}`);
  }

  if (numericAmount < Number(currentInv.total_cents)) {
    throw new Error(
      `Payment amount ${numericAmount} is less than invoice total ${currentInv.total_cents}`
    );
  }

  // 3. Fetch subscription
  const { data: sub, error: subFetchErr } = await supabaseAdmin
    .from('practice_subscriptions')
    .select('*')
    .eq('id', currentInv.subscription_id)
    .single();

  if (subFetchErr || !sub) {
    throw new Error(
      `Failed to fetch subscription ${currentInv.subscription_id} for invoice ${currentInv.id}: ${subFetchErr?.message || 'not found'}`
    );
  }

  // 4. Calculate new billing cycle
  const now = new Date();
  const currentEnd = sub.current_period_end ? new Date(sub.current_period_end) : now;
  const newPeriodStart = currentEnd > now ? currentEnd : now;
  const newPeriodEnd = new Date(newPeriodStart.getTime());

  const interval = sub.billing_interval || 'monthly';
  if (interval === 'annual') {
    newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
  } else {
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
  }

  // 5. Promote pending plan if set
  let newPlanId = sub.plan_id;
  let newSeatLimit = sub.seat_limit;
  let newPriceCents = sub.current_price_cents;
  let newInterval = sub.billing_interval;

  if (sub.pending_plan_id) {
    const { data: targetPlan } = await supabaseAdmin
      .from('saas_plans')
      .select('*')
      .eq('id', sub.pending_plan_id)
      .maybeSingle();

    if (targetPlan) {
      newPlanId = targetPlan.id;
      newSeatLimit = targetPlan.practitioner_seat_limit;
      newInterval = sub.pending_billing_interval || sub.billing_interval;
      newPriceCents =
        newInterval === 'annual'
          ? targetPlan.annual_price_cents
          : targetPlan.monthly_price_cents;
    }
  }

  // 5B. Strict transaction identity verification for existing reference in fallback
  try {
    const paymentTable = supabaseAdmin.from('saas_payments');
    if (paymentTable && typeof paymentTable.select === 'function') {
      const { data: existingRefPayment } = await paymentTable
        .select('id, invoice_id, practice_id, amount_cents, currency, gateway_provider, status')
        .eq('gateway_reference', reference)
        .maybeSingle();

      if (existingRefPayment) {
        if (
          existingRefPayment.invoice_id !== currentInv.id ||
          existingRefPayment.practice_id !== currentInv.practice_id ||
          Number(existingRefPayment.amount_cents) !== numericAmount ||
          existingRefPayment.currency !== currentInv.currency
        ) {
          throw new Error(
            `Gateway reference collision: reference ${reference} already belongs to payment ${existingRefPayment.id} for invoice ${existingRefPayment.invoice_id}`
          );
        }
        if (existingRefPayment.status === 'successful') {
          return { status: 'duplicate_reference', invoice_id: existingRefPayment.invoice_id, payment_id: existingRefPayment.id };
        }
      }
    }
  } catch (refCheckErr) {
    if (refCheckErr.message?.includes('Gateway reference collision')) {
      throw refCheckErr;
    }
  }

  // 6. Record Payment in ledger
  const paymentNumber = `PHY-PAY-${now.getFullYear()}-${String(
    Math.floor(Math.random() * 1000000)
  ).padStart(6, '0')}`;
  const effectivePaidAt = paidAt || now.toISOString();

  const { data: paymentRecord, error: payInsertErr } = await supabaseAdmin
    .from('saas_payments')
    .insert({
      payment_number: paymentNumber,
      invoice_id: currentInv.id,
      practice_id: currentInv.practice_id,
      amount_cents: numericAmount,
      currency: currentInv.currency,
      payment_method: paymentMethod || 'card',
      gateway_provider: 'paystack',
      gateway_reference: reference,
      gateway_fee_cents: gatewayFeeCents || 0,
      status: 'successful',
      settled_at: now.toISOString(),
      paid_at: effectivePaidAt,
    })
    .select('id')
    .single();

  if (payInsertErr) {
    throw new Error(`Failed to insert payment record: ${payInsertErr.message}`);
  }

  const paymentId = paymentRecord.id;

  // 7. Mark Invoice Paid
  const { error: invUpdateErr } = await supabaseAdmin
    .from('saas_invoices')
    .update({
      status: 'paid',
      paid_at: effectivePaidAt,
      updated_at: now.toISOString(),
    })
    .eq('id', currentInv.id);

  if (invUpdateErr) {
    throw new Error(`Failed to mark invoice paid: ${invUpdateErr.message}`);
  }

  // 7b. Enqueue to sales_commission_outbox for asynchronous commission evaluation
  try {
    await supabaseAdmin.from('sales_commission_outbox').insert({
      practice_id: currentInv.practice_id,
      invoice_id: currentInv.id,
      payment_id: paymentId,
      status: 'pending_retry',
      last_error: 'Fallback settlement: pending outbox evaluation',
    });
  } catch (outboxErr) {
    console.warn('[Paystack Settlement] Outbox fallback enqueue notice:', outboxErr.message);
  }

  // 8. Advance Subscription to ACTIVE & Apply promoted plan
  const { error: subUpdateErr } = await supabaseAdmin
    .from('practice_subscriptions')
    .update({
      status: 'active',
      plan_id: newPlanId,
      seat_limit: newSeatLimit,
      current_price_cents: newPriceCents,
      billing_interval: newInterval,
      pending_plan_id: null,
      pending_billing_interval: null,
      cancel_at_period_end: false,
      cancelled_at: null,
      current_period_start: newPeriodStart.toISOString(),
      current_period_end: newPeriodEnd.toISOString(),
      grace_period_ends_at: null,
      gateway_auth_token: authToken || sub.gateway_auth_token,
      updated_at: now.toISOString(),
    })
    .eq('id', sub.id);

  if (subUpdateErr) {
    throw new Error(`Failed to activate subscription: ${subUpdateErr.message}`);
  }

  // 9. Ensure Practice Operational Status is Active
  const { error: practiceUpdateErr } = await supabaseAdmin
    .from('practices')
    .update({
      status: 'active',
      updated_at: now.toISOString(),
    })
    .eq('id', currentInv.practice_id);

  if (practiceUpdateErr) {
    throw new Error(`Failed to activate practice operational status: ${practiceUpdateErr.message}`);
  }

  // 10. Audit Event (Service Role execution, non-blocking)
  try {
    await supabaseAdmin.from('audit_events').insert({
      practice_id: currentInv.practice_id,
      actor_user_id: null,
      actor_role: 'service_role',
      action: 'subscription.payment_confirmed',
      entity_type: 'saas_payments',
      entity_id: paymentId,
      metadata: {
        amount_cents: numericAmount,
        reference: reference,
        plan_id: newPlanId,
        seat_limit: newSeatLimit,
        new_period_end: newPeriodEnd.toISOString(),
        settlement_engine: 'service_role_fallback',
        rpc_error: rpcErr?.message || null,
      },
      source: 'webhook_settlement',
      created_at: now.toISOString(),
    });
  } catch (auditErr) {
    console.warn('[Paystack Settlement] Non-fatal audit log warning:', auditErr.message);
  }

  console.log(`[Paystack Settlement] Successfully settled invoice ${currentInv.id} via service-role fallback.`);

  return {
    status: 'settled',
    invoice_id: currentInv.id,
    payment_id: paymentId,
    plan_id: newPlanId,
    seat_limit: newSeatLimit,
    new_period_end: newPeriodEnd.toISOString(),
  };
}

module.exports = {
  sanitizePaystackKey,
  validatePaystackSecretKey,
  verifyPaystackSignature,
  mapPaystackChannelToPaymentMethod,
  initializePaystackTransaction,
  verifyPaystackTransaction,
  getPaystackEnvironment,
  getSupabaseAdmin,
  authenticateUser,
  verifyPracticeOwner,
  settleSubscriptionPayment,
};

