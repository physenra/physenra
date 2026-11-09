// ==============================================================================
// PHYSENRA SAAS — SALES REFERRAL COMMISSION RECONCILIATION SCANNER
// File: netlify/functions/reconcile-referral-commissions.cjs
// Route: POST /api/reconcile-referral-commissions -> /.netlify/functions/reconcile-referral-commissions
//
// Governs:
// 1. Scheduled 6-hour sweep to detect uncommissioned qualifying payments
// 2. Safe, idempotent outbox enqueue for missing evaluation tasks
// 3. Super Admin & cron secret authentication
// 4. Zero duplicate commissions; strict single qualifying payment rule
// ==============================================================================

const {
  getSupabaseAdmin,
  authenticateUser,
} = require('./lib/paystack.cjs');

/**
 * Netlify Function handler for reconciling referral commissions across settled payments.
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
    console.error('[Reconcile Commissions Scanner] Database client initialization failed:', clientErr.message);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Database service configuration error' }),
    };
  }

  // 2. Authorization check
  const cronSecretHeader = event.headers?.['x-cron-secret'] || event.headers?.['X-Cron-Secret'];
  const expectedCronSecret = env.CRON_SECRET || env.ADMIN_SECRET;
  let isAuthorized = false;

  if (cronSecretHeader && expectedCronSecret && cronSecretHeader === expectedCronSecret) {
    isAuthorized = true;
  } else {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    const authFn = deps.authenticateUser || authenticateUser;

    try {
      const user = await authFn(authHeader, supabaseAdmin);
      if (user) {
        const { data: isPlatformAdmin } = await supabaseAdmin.rpc('is_platform_admin');
        if (isPlatformAdmin) {
          isAuthorized = true;
        }
      }
    } catch {
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

  try {
    // 3. Find referred practices that have settled payments but no commission or outbox task
    // Query referrals in attributed or qualified status
    const { data: candidateReferrals, error: refErr } = await supabaseAdmin
      .from('sales_referrals')
      .select('id, practice_id, status, qualifying_payment_id')
      .in('status', ['attributed', 'qualified']);

    if (refErr) {
      throw refErr;
    }

    const enqueuedTasks = [];

    for (const ref of candidateReferrals || []) {
      let targetPayment = null;

      // Case A: Referral was marked qualified by a specific payment
      if (ref.qualifying_payment_id) {
        // Verify if a commission actually exists for this qualifying payment
        const { data: existingComm } = await supabaseAdmin
          .from('sales_commissions')
          .select('id')
          .eq('payment_id', ref.qualifying_payment_id)
          .maybeSingle();

        if (existingComm) {
          // Already properly commissioned
          continue;
        }

        // Commission is missing for this qualifying payment; load payment details
        const { data: payRecord } = await supabaseAdmin
          .from('saas_payments')
          .select('id, invoice_id, practice_id, amount_cents, paid_at, created_at')
          .eq('id', ref.qualifying_payment_id)
          .maybeSingle();

        if (payRecord) {
          targetPayment = payRecord;
        }
      }

      // Case B: Referral is attributed (or no valid payment record loaded above)
      if (!targetPayment) {
        // Find the first successful payment for this practice
        const { data: payments, error: payErr } = await supabaseAdmin
          .from('saas_payments')
          .select('id, invoice_id, practice_id, amount_cents, paid_at, created_at')
          .eq('practice_id', ref.practice_id)
          .eq('status', 'successful')
          .order('paid_at', { ascending: true })
          .limit(1);

        if (payErr || !payments || payments.length === 0) {
          continue;
        }

        const candidatePayment = payments[0];

        // Check if commission already exists for this payment
        const { data: existingComm } = await supabaseAdmin
          .from('sales_commissions')
          .select('id')
          .eq('payment_id', candidatePayment.id)
          .maybeSingle();

        if (existingComm) {
          continue;
        }

        targetPayment = candidatePayment;
      }

      if (!targetPayment) {
        continue;
      }

      // Check if an active outbox task already exists for this payment
      const { data: existingOutbox } = await supabaseAdmin
        .from('sales_commission_outbox')
        .select('id, status')
        .eq('payment_id', targetPayment.id)
        .maybeSingle();

      if (existingOutbox && !['abandoned', 'error'].includes(existingOutbox.status)) {
        // Task already pending_retry, processing, or resolved
        continue;
      }

      // Enqueue into outbox with verified practice, invoice, payment and referral identity
      const { data: enqueued, error: insertErr } = await supabaseAdmin
        .from('sales_commission_outbox')
        .upsert(
          {
            practice_id: ref.practice_id,
            invoice_id: targetPayment.invoice_id,
            payment_id: targetPayment.id,
            referral_id: ref.id,
            status: 'pending_retry',
            last_error: 'Reconciliation scanner: uncommissioned qualifying payment detected',
            next_retry_at: new Date().toISOString(),
          },
          { onConflict: 'payment_id' }
        )
        .select('id')
        .single();

      if (!insertErr && enqueued) {
        enqueuedTasks.push({
          outbox_id: enqueued.id,
          practice_id: ref.practice_id,
          payment_id: targetPayment.id,
          referral_id: ref.id,
        });
      }
    }

    // 4. Audit scan completion
    await supabaseAdmin.from('platform_audit_logs').insert({
      action: 'referral_reconciliation.completed',
      target_resource_type: 'sales_commission_outbox',
      details: {
        scanned_referrals: candidateReferrals?.length || 0,
        enqueued_tasks_count: enqueuedTasks.length,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        status: 'success',
        scanned_count: candidateReferrals?.length || 0,
        enqueued_count: enqueuedTasks.length,
        enqueued_tasks: enqueuedTasks,
      }),
    };
  } catch (err) {
    console.error('[Reconcile Commissions Scanner] Error during sweep:', err.message);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: `Reconciliation sweep failed: ${err.message}` }),
    };
  }
}

module.exports = { handler };
