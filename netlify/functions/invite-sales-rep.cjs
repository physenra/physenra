// ==============================================================================
// PHYSENRA SAAS — SERVER-SIDE SALES REPRESENTATIVE PORTAL INVITATION
// File: netlify/functions/invite-sales-rep.cjs
// Route: POST /api/invite-sales-rep -> /.netlify/functions/invite-sales-rep
//
// Governs:
// 1. Strict Platform Admin JWT authentication (service_role never reaches browser)
// 2. Secure Supabase Auth invitation (inviteUserByEmail) without shared passwords
// 3. Safe association of existing confirmed/registered emails (no clinic seats created)
// 4. Compensating auth user cleanup if rep linkage fails (zero partial orphans)
// 5. Immutable audit logging without credential disclosure
// ==============================================================================

const { getSupabaseAdmin, authenticateUser } = require('./lib/paystack.cjs');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CANONICAL_INVITE_REDIRECT = 'https://physenra.com/sales-portal/accept-invite';

/**
 * Resolves a strict allowlisted redirect URL for invitation / password setup emails.
 */
function resolveSafeInviteRedirect(requestedOrigin) {
  if (typeof requestedOrigin === 'string') {
    const clean = requestedOrigin.trim().toLowerCase();
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(clean)) {
      return `${clean}/sales-portal/accept-invite`;
    }
    if (clean === 'https://physenra.com') {
      return CANONICAL_INVITE_REDIRECT;
    }
  }
  return CANONICAL_INVITE_REDIRECT;
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
 * Handler for Platform Admin sales representative invitation / portal activation.
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
    console.error('[Invite Sales Rep] Database initialization error:', err.message);
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
      body: JSON.stringify({ error: 'Forbidden: Only Platform Administrators may invite sales representatives' }),
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

  // 4. Fetch authoritative representative record
  const { data: rep, error: repErr } = await supabaseAdmin
    .from('sales_representatives')
    .select('id, full_name, email, status, user_id')
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

  if (rep.status !== 'active') {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: `Cannot send portal invitation for a ${rep.status} representative. Reactivate the representative first.`,
      }),
    };
  }

  const redirectTo = resolveSafeInviteRedirect(event.headers?.origin || payload.origin);

  // 5. Case A: Representative already linked to an Auth user
  if (rep.user_id) {
    const { data: existingAuthResp } = await supabaseAdmin.auth.admin.getUserById(rep.user_id);
    const linkedAuthUser = existingAuthResp?.user || null;

    if (linkedAuthUser && !linkedAuthUser.last_sign_in_at) {
      // Pending activation: resend Supabase invite if unconfirmed, or setup link otherwise
      let resendErr = null;
      if (!linkedAuthUser.email_confirmed_at) {
        const { error: invResendErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          rep.email,
          {
            redirectTo,
            data: { role: 'sales_representative', full_name: rep.full_name },
          }
        );
        resendErr = invResendErr;
      }
      if (linkedAuthUser.email_confirmed_at || resendErr) {
        const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(rep.email, { redirectTo });
        resendErr = resetErr;
      }
      if (resendErr) {
        return {
          statusCode: 502,
          headers: jsonHeaders,
          body: JSON.stringify({ error: `Failed to resend portal setup email: ${resendErr.message}` }),
        };
      }
      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          status: 'invite_resent',
          linked: true,
          email_sent: true,
          sales_rep_id: rep.id,
          message: 'Password setup invitation email resent to representative.',
        }),
      };
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        status: 'already_active',
        linked: true,
        email_sent: false,
        sales_rep_id: rep.id,
        message: 'Representative portal account is already activated.',
      }),
    };
  }

  // 6. Case B: Rep not yet linked -> invite new Auth user or safely link existing Auth user
  let targetUserId = null;
  let createdFreshUser = false;
  let flowStatus = 'invited';

  const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    rep.email,
    {
      redirectTo,
      data: {
        role: 'sales_representative',
        full_name: rep.full_name,
      },
    }
  );

  if (!inviteErr && inviteData?.user?.id) {
    targetUserId = inviteData.user.id;
    createdFreshUser = true;
    flowStatus = 'invited';
  } else {
    // Check if an account already exists for this email (e.g. practice owner partnering as sales rep)
    const errMsg = String(inviteErr?.message || '').toLowerCase();
    const looksLikeExisting =
      errMsg.includes('already') || errMsg.includes('registered') || errMsg.includes('exists');

    if (!looksLikeExisting) {
      return {
        statusCode: 502,
        headers: jsonHeaders,
        body: JSON.stringify({ error: `Failed to invite representative account: ${inviteErr?.message || 'Unknown auth error'}` }),
      };
    }

    const existingAuthUser = await findAuthUserByEmail(supabaseAdmin, rep.email);
    if (!existingAuthUser?.id) {
      return {
        statusCode: 409,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Account already exists for this email but could not be resolved safely.' }),
      };
    }

    // Prevent linking one auth user to two distinct sales representatives
    const { data: conflictingRep } = await supabaseAdmin
      .from('sales_representatives')
      .select('id')
      .eq('user_id', existingAuthUser.id)
      .neq('id', rep.id)
      .maybeSingle();

    if (conflictingRep) {
      return {
        statusCode: 409,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'This Auth account is already associated with another sales representative.' }),
      };
    }

    targetUserId = existingAuthUser.id;
    createdFreshUser = false;
    flowStatus = 'linked_existing_account';
  }

  // 7. Atomically bind user_id only while still null
  const { data: updatedRows, error: linkErr } = await supabaseAdmin
    .from('sales_representatives')
    .update({ user_id: targetUserId, updated_at: new Date().toISOString() })
    .eq('id', rep.id)
    .is('user_id', null)
    .select('id, user_id');

  if (linkErr || !updatedRows || updatedRows.length === 0) {
    // Compensating rollback for newly created auth accounts to prevent orphaned credentials
    if (createdFreshUser && targetUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      } catch (cleanupErr) {
        console.error('[Invite Sales Rep] Failed rollback cleanup for orphan auth user:', cleanupErr.message);
      }
    }
    return {
      statusCode: 409,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: linkErr ? `Failed to associate auth account: ${linkErr.message}` : 'Representative was already linked concurrently.',
      }),
    };
  }

  // 8. Record non-credential audit event
  try {
    await supabaseAdmin.from('platform_audit_logs').insert({
      action: flowStatus === 'invited' ? 'rep_account.invited' : 'rep_account.existing_user_linked',
      actor_user_id: caller.id,
      target_resource_type: 'sales_representatives',
      target_resource_id: rep.id,
      details: {
        sales_rep_id: rep.id,
        auth_user_id: targetUserId,
        flow_status: flowStatus,
      },
    });
  } catch (auditErr) {
    console.warn('[Invite Sales Rep] Audit log notice:', auditErr.message);
  }

  return {
    statusCode: 200,
    headers: jsonHeaders,
    body: JSON.stringify({
      status: flowStatus,
      linked: true,
      invited: createdFreshUser,
      email_sent: createdFreshUser,
      sales_rep_id: rep.id,
      message: createdFreshUser
        ? 'Secure portal invitation email sent to representative.'
        : 'Associated with existing Physenra account without altering existing clinic access.',
    }),
  };
}

module.exports = {
  handler,
  resolveSafeInviteRedirect,
  findAuthUserByEmail,
};
