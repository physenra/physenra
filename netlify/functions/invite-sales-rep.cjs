// ==============================================================================
// PHYSENRA SAAS — SERVER-SIDE SALES REPRESENTATIVE PORTAL & LIFECYCLE MANAGEMENT
// File: netlify/functions/invite-sales-rep.cjs
// Route: POST /api/invite-sales-rep -> /.netlify/functions/invite-sales-rep
//
// Governs:
// 1. Strict Platform Admin JWT authentication (service_role never reaches browser)
// 2. Authoritative representative invitation & resend lifecycle (States A, B, C, D)
// 3. Direct action_link generation (via GoTrue Admin API) bypassing email queue delays
// 4. Rate-limit resilient response (handles 429 without failure, provides action_link)
// 5. Super Admin lifecycle management: Deactivate, Reactivate, Archive, Delete
// 6. Non-credential audit logging in platform_audit_logs
// ==============================================================================

const { getSupabaseAdmin, authenticateUser } = require('./lib/paystack.cjs');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CANONICAL_INVITE_REDIRECT = 'https://physenra.com/sales-portal/accept-invite';
const CANONICAL_RECOVERY_REDIRECT = 'https://physenra.com/reset-password?portal=sales';

/**
 * Resolves a strict allowlisted redirect URL for invitation / password setup emails.
 */
function resolveSafeInviteRedirect(requestedOrigin, type = 'invite') {
  const fallback = type === 'recovery' ? CANONICAL_RECOVERY_REDIRECT : CANONICAL_INVITE_REDIRECT;
  if (typeof requestedOrigin === 'string') {
    const clean = requestedOrigin.trim().toLowerCase();
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(clean)) {
      return type === 'recovery' ? `${clean}/reset-password?portal=sales` : `${clean}/sales-portal/accept-invite`;
    }
    if (clean === 'https://physenra.com') {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Finds an auth user by normalized email via Admin paginated lookup.
 */
async function findAuthUserByEmail(supabaseAdmin, targetEmail) {
  const cleanTarget = targetEmail.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error || !data || !Array.isArray(data.users)) {
      return null;
    }
    const found = data.users.find((u) => String(u.email || '').trim().toLowerCase() === cleanTarget);
    if (found) {
      return found;
    }
    if (data.users.length < perPage) {
      break;
    }
    page += 1;
  }

  return null;
}

/**
 * Handler for Platform Admin sales representative invitation & lifecycle management.
 */
async function handler(event, context, deps = {}) {
  const jsonHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const env = deps.env || process.env;
  let supabaseAdmin;
  try {
    supabaseAdmin = deps.supabaseAdmin || getSupabaseAdmin(env);
  } catch (err) {
    console.error('[Sales Rep Lifecycle] Database initialization error:', err.message);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  // 1. Authenticate caller via Bearer JWT
  const authHeader =
    event.headers?.authorization ||
    event.headers?.Authorization ||
    event.headers?.AUTHORIZATION;

  const caller = deps.user || (await authenticateUser(authHeader, supabaseAdmin));
  if (!caller || !caller.id) {
    return {
      statusCode: 401,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Authentication required' }),
    };
  }

  // 2. Enforce Platform Admin authority strictly from database profile
  const { data: callerProfile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', caller.id)
    .maybeSingle();

  if (profileErr || !callerProfile || callerProfile.is_platform_admin !== true) {
    return {
      statusCode: 403,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Forbidden: Only Platform Administrators may manage sales representatives' }),
    };
  }

  // 3. Parse payload
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Invalid JSON request body' }),
    };
  }

  const salesRepId = typeof payload.sales_rep_id === 'string' ? payload.sales_rep_id.trim() : '';
  if (!UUID_REGEX.test(salesRepId)) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Valid sales_rep_id UUID is required' }),
    };
  }

  const action = typeof payload.action === 'string' ? payload.action.trim().toLowerCase() : 'invite';
  const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';

  // 4. Fetch authoritative representative record
  const { data: rep, error: repErr } = await supabaseAdmin
    .from('sales_representatives')
    .select('id, full_name, email, status, user_id, commission_rate_bps')
    .eq('id', salesRepId)
    .maybeSingle();

  if (repErr) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: `Failed to inspect representative: ${repErr.message}` }),
    };
  }

  if (!rep) {
    return {
      statusCode: 404,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Sales representative not found' }),
    };
  }

  // ============================================================================
  // 5. LIFECYCLE ACTION: CHECK DELETION ELIGIBILITY
  // ============================================================================
  if (action === 'check_deletion_eligibility') {
    const [referralsRes, commissionsRes, payoutsRes] = await Promise.all([
      supabaseAdmin.from('sales_referrals').select('id', { count: 'exact', head: true }).eq('sales_rep_id', rep.id),
      supabaseAdmin.from('sales_commissions').select('id', { count: 'exact', head: true }).eq('sales_rep_id', rep.id),
      supabaseAdmin.from('sales_commission_payouts').select('id', { count: 'exact', head: true }).eq('sales_rep_id', rep.id),
    ]);

    const referralCount = referralsRes.count || 0;
    const commissionCount = commissionsRes.count || 0;
    const payoutCount = payoutsRes.count || 0;
    const canDelete = referralCount === 0 && commissionCount === 0 && payoutCount === 0;

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        sales_rep_id: rep.id,
        can_delete: canDelete,
        referral_count: referralCount,
        commission_count: commissionCount,
        payout_count: payoutCount,
        suggested_action: canDelete ? 'delete' : 'archive',
      }),
    };
  }

  // ============================================================================
  // 6. LIFECYCLE ACTION: DEACTIVATE REPRESENTATIVE
  // ============================================================================
  if (action === 'deactivate') {
    if (reason.length < 5) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'A valid written justification (minimum 5 characters) is required to deactivate a representative.' }),
      };
    }
    if (rep.status === 'suspended') {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Representative is already deactivated (suspended).' }),
      };
    }

    const { error: updateErr } = await supabaseAdmin
      .from('sales_representatives')
      .update({
        status: 'suspended',
        notes: rep.notes ? `${rep.notes}\n[Deactivated]: ${reason}` : `[Deactivated]: ${reason}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rep.id);

    if (updateErr) {
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ error: `Failed to deactivate representative: ${updateErr.message}` }),
      };
    }

    try {
      await supabaseAdmin.from('platform_audit_logs').insert({
        action: 'rep_account.deactivated',
        actor_user_id: caller.id,
        target_resource_type: 'sales_representatives',
        target_resource_id: rep.id,
        details: {
          sales_rep_id: rep.id,
          reason,
          previous_status: rep.status,
          new_status: 'suspended',
        },
      });
    } catch (auditErr) {
      console.warn('[Sales Rep Lifecycle] Audit log notice:', auditErr.message);
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: true,
        sales_rep_id: rep.id,
        status: 'suspended',
        message: `Representative ${rep.full_name} has been deactivated. Portal access and referral attribution are immediately revoked.`,
      }),
    };
  }

  // ============================================================================
  // 7. LIFECYCLE ACTION: REACTIVATE REPRESENTATIVE
  // ============================================================================
  if (action === 'reactivate') {
    if (rep.status === 'active') {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Representative is already active.' }),
      };
    }

    const effectiveReason = reason || 'Reactivated by Platform Administrator';

    const { error: updateErr } = await supabaseAdmin
      .from('sales_representatives')
      .update({
        status: 'active',
        terminated_at: null,
        notes: rep.notes ? `${rep.notes}\n[Reactivated]: ${effectiveReason}` : `[Reactivated]: ${effectiveReason}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rep.id);

    if (updateErr) {
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ error: `Failed to reactivate representative: ${updateErr.message}` }),
      };
    }

    try {
      await supabaseAdmin.from('platform_audit_logs').insert({
        action: 'rep_account.reactivated',
        actor_user_id: caller.id,
        target_resource_type: 'sales_representatives',
        target_resource_id: rep.id,
        details: {
          sales_rep_id: rep.id,
          reason: effectiveReason,
          previous_status: rep.status,
          new_status: 'active',
        },
      });
    } catch (auditErr) {
      console.warn('[Sales Rep Lifecycle] Audit log notice:', auditErr.message);
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: true,
        sales_rep_id: rep.id,
        status: 'active',
        message: `Representative ${rep.full_name} has been reactivated. Portal access and referral capabilities are restored.`,
      }),
    };
  }

  // ============================================================================
  // 8. LIFECYCLE ACTION: ARCHIVE REPRESENTATIVE (SOFT-DELETE)
  // ============================================================================
  if (action === 'archive') {
    if (reason.length < 5) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'A valid written justification (minimum 5 characters) is required to archive a representative.' }),
      };
    }
    if (rep.status === 'terminated') {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Representative is already archived (terminated).' }),
      };
    }

    // Deactivate active referral codes so no future attributions occur
    await supabaseAdmin
      .from('sales_referral_codes')
      .update({ is_active: false })
      .eq('sales_rep_id', rep.id);

    const nowIso = new Date().toISOString();
    const { error: updateErr } = await supabaseAdmin
      .from('sales_representatives')
      .update({
        status: 'terminated',
        terminated_at: nowIso,
        notes: rep.notes ? `${rep.notes}\n[Archived]: ${reason}` : `[Archived]: ${reason}`,
        updated_at: nowIso,
      })
      .eq('id', rep.id);

    if (updateErr) {
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ error: `Failed to archive representative: ${updateErr.message}` }),
      };
    }

    try {
      await supabaseAdmin.from('platform_audit_logs').insert({
        action: 'rep_account.archived',
        actor_user_id: caller.id,
        target_resource_type: 'sales_representatives',
        target_resource_id: rep.id,
        details: {
          sales_rep_id: rep.id,
          reason,
          previous_status: rep.status,
          new_status: 'terminated',
        },
      });
    } catch (auditErr) {
      console.warn('[Sales Rep Lifecycle] Audit log notice:', auditErr.message);
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: true,
        sales_rep_id: rep.id,
        status: 'terminated',
        message: `Representative ${rep.full_name} has been archived. Portal access revoked; referral code deactivated; financial history preserved.`,
      }),
    };
  }

  // ============================================================================
  // 9. LIFECYCLE ACTION: HARD DELETE (ONLY FOR ZERO FINANCIAL/REFERRAL HISTORY)
  // ============================================================================
  if (action === 'delete') {
    if (reason.length < 5) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'A valid written justification (minimum 5 characters) is required to delete a representative.' }),
      };
    }

    // Verify zero financial and referral history before hard deletion
    const [referralsRes, commissionsRes, payoutsRes] = await Promise.all([
      supabaseAdmin.from('sales_referrals').select('id', { count: 'exact', head: true }).eq('sales_rep_id', rep.id),
      supabaseAdmin.from('sales_commissions').select('id', { count: 'exact', head: true }).eq('sales_rep_id', rep.id),
      supabaseAdmin.from('sales_commission_payouts').select('id', { count: 'exact', head: true }).eq('sales_rep_id', rep.id),
    ]);

    const refCount = referralsRes.count || 0;
    const commCount = commissionsRes.count || 0;
    const payCount = payoutsRes.count || 0;

    if (refCount > 0 || commCount > 0 || payCount > 0) {
      return {
        statusCode: 409,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: `Cannot permanently delete representative with existing financial/referral history (${refCount} referrals, ${commCount} commissions, ${payCount} payouts). Use Archive Representative instead to preserve ledger integrity.`,
          can_delete: false,
          referral_count: refCount,
          commission_count: commCount,
        }),
      };
    }

    // Safe deletion: remove unreferenced banking and referral code records
    await supabaseAdmin.from('sales_rep_bank_accounts').delete().eq('sales_rep_id', rep.id);
    await supabaseAdmin.from('sales_referral_codes').delete().eq('sales_rep_id', rep.id);

    // Delete representative record
    const { error: deleteRepErr } = await supabaseAdmin.from('sales_representatives').delete().eq('id', rep.id);
    if (deleteRepErr) {
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ error: `Failed to delete representative record: ${deleteRepErr.message}` }),
      };
    }

    // Safely verify if Auth user should be deleted (NEVER delete if user owns/belongs to a clinical practice!)
    let deletedAuthUser = false;
    if (rep.user_id) {
      const { data: practiceMemberships } = await supabaseAdmin
        .from('practice_memberships')
        .select('id')
        .eq('user_id', rep.user_id)
        .limit(1);

      if (!practiceMemberships || practiceMemberships.length === 0) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(rep.user_id);
          deletedAuthUser = true;
        } catch (authDelErr) {
          console.warn('[Sales Rep Lifecycle] Auth user deletion note:', authDelErr.message);
        }
      }
    }

    try {
      await supabaseAdmin.from('platform_audit_logs').insert({
        action: 'rep_account.deleted',
        actor_user_id: caller.id,
        target_resource_type: 'sales_representatives',
        target_resource_id: rep.id,
        details: {
          sales_rep_id: rep.id,
          full_name: rep.full_name,
          email: rep.email,
          reason,
          deleted_auth_user: deletedAuthUser,
        },
      });
    } catch (auditErr) {
      console.warn('[Sales Rep Lifecycle] Audit log notice:', auditErr.message);
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: true,
        deleted: true,
        sales_rep_id: rep.id,
        message: `Representative ${rep.full_name} and unreferenced partner records deleted cleanly.`,
      }),
    };
  }

  // ============================================================================
  // 10. INVITATION & SETUP REGENERATION LIFECYCLE (STATES A, B, C, D)
  // ============================================================================
  if (rep.status !== 'active') {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: `Cannot invite or generate setup links for an inactive (${rep.status}) representative. Reactivate the representative first.`,
      }),
    };
  }

  const requestedRedirect = event.headers?.origin || payload.origin;
  const inviteRedirect = resolveSafeInviteRedirect(requestedRedirect, 'invite');
  const recoveryRedirect = resolveSafeInviteRedirect(requestedRedirect, 'recovery');

  // Inspect existing Auth identity
  let authUser = null;
  if (rep.user_id) {
    const { data: userResp } = await supabaseAdmin.auth.admin.getUserById(rep.user_id);
    authUser = userResp?.user || null;
  }
  if (!authUser) {
    authUser = await findAuthUserByEmail(supabaseAdmin, rep.email);
  }

  // Determine current lifecycle state
  let accountState = 'unlinked'; // 'unlinked' | 'activation_pending' | 'password_setup_pending' | 'fully_activated'
  if (!authUser) {
    accountState = 'unlinked';
  } else if (!authUser.email_confirmed_at) {
    accountState = 'activation_pending';
  } else if (!authUser.last_sign_in_at) {
    accountState = 'password_setup_pending';
  } else {
    accountState = 'fully_activated';
  }

  // Action: check_status only
  if (action === 'check_status') {
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        sales_rep_id: rep.id,
        account_state: accountState,
        status: rep.status,
        has_auth_user: Boolean(authUser),
        email_confirmed: Boolean(authUser?.email_confirmed_at),
        last_sign_in_at: authUser?.last_sign_in_at || null,
        created_at: authUser?.created_at || null,
      }),
    };
  }

  // ----------------------------------------------------------------------------
  // Case A: Representative has NO Auth user yet -> create/invite & bind
  // ----------------------------------------------------------------------------
  let targetUserId = authUser?.id || null;
  let actionLink = null;
  let emailSent = false;
  let rateLimited = false;
  let responseStatus = 'invited';
  let responseMsg = '';

  if (!authUser) {
    // Generate authoritative link and create user via GoTrue Admin API
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: rep.email,
      options: {
        redirectTo: inviteRedirect,
        data: { role: 'sales_representative', full_name: rep.full_name },
      },
    });

    if (!linkErr && linkData?.properties?.action_link) {
      actionLink = linkData.properties.action_link;
      targetUserId = linkData.user?.id || null;
    }

    // Also attempt official inviteUserByEmail for native provider email dispatch
    const { data: invData, error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(rep.email, {
      redirectTo: inviteRedirect,
      data: { role: 'sales_representative', full_name: rep.full_name },
    });

    if (!invErr) {
      emailSent = true;
      if (!targetUserId && invData?.user?.id) targetUserId = invData.user.id;
    } else {
      const errStr = String(invErr.message || '').toLowerCase();
      if (errStr.includes('rate limit') || invErr.status === 429) {
        rateLimited = true;
      }
    }

    // Atomically link rep record to Auth user
    if (targetUserId) {
      await supabaseAdmin
        .from('sales_representatives')
        .update({ user_id: targetUserId, updated_at: new Date().toISOString() })
        .eq('id', rep.id)
        .is('user_id', null);
    }

    responseStatus = 'invited';
    responseMsg = emailSent
      ? 'Secure portal invitation dispatched to representative.'
      : 'Direct invitation link generated for representative.';
  } else {
    // ----------------------------------------------------------------------------
    // Case B, C, D: Representative already has an Auth account -> bind if unlinked
    // ----------------------------------------------------------------------------
    targetUserId = authUser.id;
    if (!rep.user_id) {
      await supabaseAdmin
        .from('sales_representatives')
        .update({ user_id: targetUserId, updated_at: new Date().toISOString() })
        .eq('id', rep.id)
        .is('user_id', null);
    }

    // Choose appropriate link type based on lifecycle state
    const linkType = !authUser.email_confirmed_at ? 'invite' : 'recovery';
    const redirectTarget = linkType === 'invite' ? inviteRedirect : recoveryRedirect;

    // 1. Generate direct action link via Admin API (bypasses email delivery delays and rate limits)
    try {
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: linkType,
        email: rep.email,
        options: {
          redirectTo: redirectTarget,
        },
      });
      if (!linkErr && linkData?.properties?.action_link) {
        actionLink = linkData.properties.action_link;
      }
    } catch (genErr) {
      console.warn('[Sales Rep Lifecycle] Generate link warning:', genErr.message);
    }

    // 2. Dispatch email via resetPasswordForEmail / invite
    try {
      const { error: dispatchErr } = await supabaseAdmin.auth.resetPasswordForEmail(rep.email, {
        redirectTo: redirectTarget,
      });
      if (!dispatchErr) {
        emailSent = true;
      } else {
        const errStr = String(dispatchErr.message || '').toLowerCase();
        if (errStr.includes('rate limit') || dispatchErr.status === 429) {
          rateLimited = true;
        }
      }
    } catch (dispatchCatch) {
      const errStr = String(dispatchCatch?.message || '').toLowerCase();
      if (errStr.includes('rate limit')) {
        rateLimited = true;
      }
    }

    if (accountState === 'activation_pending') {
      responseStatus = 'activation_resent';
      responseMsg = emailSent
        ? 'Activation email resent to representative.'
        : 'Direct activation setup link generated.';
    } else if (accountState === 'password_setup_pending') {
      responseStatus = 'recovery_sent';
      responseMsg = emailSent
        ? 'Password setup link dispatched to representative.'
        : 'Direct password setup link generated.';
    } else {
      // Fully activated user requested password recovery or setup regeneration
      responseStatus = 'recovery_sent';
      responseMsg = emailSent
        ? 'Password recovery email dispatched to representative.'
        : 'Direct password recovery link generated.';
    }
  }

  // 11. Write Platform Audit Log
  try {
    await supabaseAdmin.from('platform_audit_logs').insert({
      action: `rep_account.${responseStatus}`,
      actor_user_id: caller.id,
      target_resource_type: 'sales_representatives',
      target_resource_id: rep.id,
      details: {
        sales_rep_id: rep.id,
        auth_user_id: targetUserId,
        account_state: accountState,
        action_requested: action,
        email_sent: emailSent,
        rate_limited: rateLimited,
        has_direct_link: Boolean(actionLink),
      },
    });
  } catch (auditErr) {
    console.warn('[Sales Rep Lifecycle] Audit log notice:', auditErr.message);
  }

  return {
    statusCode: 200,
    headers: jsonHeaders,
    body: JSON.stringify({
      status: responseStatus,
      account_state: accountState,
      linked: true,
      email_sent: emailSent,
      rate_limited: rateLimited,
      action_link: actionLink,
      sales_rep_id: rep.id,
      cooldown_seconds: rateLimited ? 60 : 0,
      message: rateLimited
        ? `${responseMsg} (Email delivery is temporarily in 60s cooldown; direct link is ready).`
        : responseMsg,
    }),
  };
}

module.exports = {
  handler,
  resolveSafeInviteRedirect,
  findAuthUserByEmail,
};
