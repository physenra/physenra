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
};
