// ==============================================================================
// PHYSENRA SAAS — SALES COMMISSION OUTBOX RETRY WORKER
// File: netlify/functions/process-commission-outbox.cjs
// Route: POST /api/process-commission-outbox -> /.netlify/functions/process-commission-outbox
//
// Governs:
// 1. Asynchronous execution of pending and lease-expired commission outbox tasks
// 2. Database-level row locking with SKIP LOCKED and lease expiration protection
// 3. Strict authentication: Platform Admin session or secret CRON_SECRET header
// 4. Exponential backoff and maximum retry limits
// ==============================================================================

const {
  getSupabaseAdmin,
  authenticateUser,
} = require('./lib/paystack.cjs');

/**
 * Netlify Function handler for processing the commission outbox queue.
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

  const env = deps.env || process.env;

  // 1. Initialize Supabase Admin client
  let supabaseAdmin;
  try {
    supabaseAdmin = deps.supabaseAdmin || getSupabaseAdmin(env);
  } catch (clientErr) {
    console.error('[Commission Outbox Worker] Database client initialization failed:', clientErr.message);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Database service configuration error' }),
    };
  }

  // 2. Authorization check: Either CRON_SECRET header or Platform Admin JWT
  const cronSecretHeader = event.headers?.['x-cron-secret'] || event.headers?.['X-Cron-Secret'];
  const expectedCronSecret = env.CRON_SECRET || env.ADMIN_SECRET;
  let isAuthorized = false;

  if (cronSecretHeader && expectedCronSecret && cronSecretHeader === expectedCronSecret) {
    isAuthorized = true;
  } else {
    // Authenticate via Supabase JWT
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    const authFn = deps.authenticateUser || authenticateUser;

    try {
      const user = await authFn(authHeader, supabaseAdmin);
      if (user) {
        // Verify Platform Admin
        const { data: isPlatformAdmin } = await supabaseAdmin.rpc('is_platform_admin');
        if (isPlatformAdmin) {
          isAuthorized = true;
        }
      }
    } catch {
      // In tests or mock environments, allow dependency injection override
      if (deps.isAuthorized) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized && !deps.isAuthorized) {
    return {
      statusCode: 403,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Access Denied: Platform Admin or valid cron secret required' }),
    };
  }

  // 3. Parse batch parameters
  let batchSize = 10;
  let leaseSeconds = 300; // 5-minute lease TTL
  try {
    if (event.body) {
      const parsed = JSON.parse(event.body);
      if (parsed.batch_size && Number.isInteger(parsed.batch_size)) {
        batchSize = Math.min(Math.max(1, parsed.batch_size), 50);
      }
      if (parsed.lease_seconds && Number.isInteger(parsed.lease_seconds)) {
        leaseSeconds = Math.min(Math.max(30, parsed.lease_seconds), 1800);
      }
    }
  } catch {
    // Default parameters if not JSON
  }

  // 4. Invoke Database Outbox Batch Processor RPC
  try {
    const { data: batchResults, error: rpcErr } = await supabaseAdmin.rpc(
      'process_commission_outbox_batch',
      {
        p_batch_size: batchSize,
        p_lease_seconds: leaseSeconds,
      }
    );

    if (rpcErr) {
      throw rpcErr;
    }

    const items = batchResults || [];
    const summary = {
      processed_count: items.length,
      commission_created: items.filter((i) => i.result_status === 'commission_created').length,
      retried: items.filter((i) => i.result_status === 'retried').length,
      abandoned: items.filter((i) => i.result_status === 'abandoned').length,
      already_processed: items.filter((i) => i.result_status === 'already_processed').length,
    };

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        status: 'success',
        summary,
        tasks: items,
      }),
    };
  } catch (err) {
    console.error('[Commission Outbox Worker] Batch processing error:', err.message);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: `Outbox processing failed: ${err.message}` }),
    };
  }
}

module.exports = { handler };
