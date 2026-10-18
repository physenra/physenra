// ==============================================================================
// PHYSENRA CLINICAL — AUTHORIZED SERVER-SIDE CLINICAL FORM DRAFT ENDPOINT
// File: netlify/functions/form-drafts.cjs
// Route: /api/form-drafts -> /.netlify/functions/form-drafts
//
// Governs:
// 1. Authorized server-side persistence of in-progress clinical drafts.
// 2. Strict Bearer token authentication via Supabase Auth.
// 3. Mandatory active practice tenant membership verification.
// 4. Scoped isolation: (practiceId, userId, formId).
// 5. Zero patient clinical details in localStorage, URLs, logs, or error responses.
// 6. Safe memory fallback if database table is undergoing migration or temporarily unreachable.
// ==============================================================================

const { createClient } = require('@supabase/supabase-js');
const { getSupabaseAdmin, authenticateUser } = require('./lib/paystack.cjs');

// In-memory fallback map for serverless execution context or offline/migration fallback
// Key format: `${practiceId}:${userId}:${formId}`
const serverDraftFallbackMap = new Map();

/**
 * Netlify Function handler for server-side clinical form drafts.
 *
 * @param {Object} event - Netlify event object
 * @param {Object} [context] - Netlify context object
 * @param {Object} [deps] - Dependency injection for automated testing
 */
async function handler(event, context, deps = {}) {
  const jsonHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-practice-id',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: jsonHeaders,
      body: '',
    };
  }

  const allowedMethods = ['GET', 'POST', 'DELETE'];
  if (!allowedMethods.includes(event.httpMethod)) {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: `Method ${event.httpMethod} Not Allowed` }),
    };
  }

  const headers = event.headers || {};
  const authHeader = headers.authorization || headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Unauthorized: Valid authentication token is required.' }),
    };
  }

  const env = deps.env || process.env;

  // 1. Initialize Supabase Admin
  let supabaseAdmin;
  try {
    supabaseAdmin = deps.supabaseAdmin || getSupabaseAdmin(env);
  } catch (err) {
    // If supabaseAdmin cannot be initialized in test environment, allow mock injection
    if (!deps.supabaseAdmin) {
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Database configuration unavailable' }),
      };
    }
    supabaseAdmin = deps.supabaseAdmin;
  }

  // 2. Authenticate User via Bearer Token
  let user;
  try {
    user = deps.user || (await authenticateUser(authHeader, supabaseAdmin));
  } catch (authErr) {
    user = null;
  }

  if (!user || !user.id) {
    return {
      statusCode: 401,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Unauthorized: Valid authentication token is required.' }),
    };
  }

  const userId = user.id;

  // 3. Extract and Verify Practice Context
  const practiceId =
    event.headers['x-practice-id'] ||
    (event.queryStringParameters && event.queryStringParameters.practiceId) ||
    (event.body ? safeJsonParse(event.body)?.practiceId : null);

  if (!practiceId) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Active practice context (x-practice-id) is required.' }),
    };
  }

  // Verify practice membership
  const isMember = deps.isMember !== undefined
    ? deps.isMember
    : await verifyPracticeMembership(userId, practiceId, supabaseAdmin);

  if (!isMember) {
    return {
      statusCode: 403,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Forbidden: Caller is not an active member of this practice.' }),
    };
  }

  // 4. Handle HTTP Methods
  try {
    // --------------------------------------------------------------------------
    // GET: Retrieve a specific form draft
    // --------------------------------------------------------------------------
    if (event.httpMethod === 'GET') {
      const formId = event.queryStringParameters?.formId;
      if (!formId) {
        return {
          statusCode: 400,
          headers: jsonHeaders,
          body: JSON.stringify({ error: 'formId query parameter is required.' }),
        };
      }

      // Try database query
      let draft = null;
      try {
        const { data, error } = await supabaseAdmin
          .from('clinical_form_drafts')
          .select('id, practice_id, user_id, form_id, data, updated_at, expires_at')
          .eq('practice_id', practiceId)
          .eq('user_id', userId)
          .eq('form_id', formId)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (!error && data) {
          draft = {
            id: data.id,
            practiceId: data.practice_id,
            userId: data.user_id,
            formId: data.form_id,
            data: data.data,
            updatedAt: data.updated_at,
            expiresAt: data.expires_at,
          };
        }
      } catch (dbErr) {
        // Fallback to memory map if table does not exist or db call fails
      }

      if (!draft) {
        const memoryKey = `${practiceId}:${userId}:${formId}`;
        const memEnvelope = serverDraftFallbackMap.get(memoryKey);
        if (memEnvelope && new Date(memEnvelope.expiresAt).getTime() > Date.now()) {
          draft = memEnvelope;
        }
      }

      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ success: true, draft: draft || null }),
      };
    }

    // --------------------------------------------------------------------------
    // POST: Save or update an in-progress draft
    // --------------------------------------------------------------------------
    if (event.httpMethod === 'POST') {
      const payload = safeJsonParse(event.body);
      if (!payload || !payload.formId || payload.data === undefined) {
        return {
          statusCode: 400,
          headers: jsonHeaders,
          body: JSON.stringify({ error: 'Invalid payload: formId and data are required.' }),
        };
      }

      const formId = payload.formId;
      const data = payload.data;
      const ttlMs = payload.ttlMs || 24 * 60 * 60 * 1000;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

      const envelope = {
        practiceId,
        userId,
        formId,
        data,
        updatedAt: now.toISOString(),
        expiresAt,
      };

      // Always maintain in serverless memory map for rapid retrieval
      const memoryKey = `${practiceId}:${userId}:${formId}`;
      serverDraftFallbackMap.set(memoryKey, envelope);

      // Attempt upsert to database table
      try {
        await supabaseAdmin
          .from('clinical_form_drafts')
          .upsert(
            {
              practice_id: practiceId,
              user_id: userId,
              form_id: formId,
              data,
              updated_at: now.toISOString(),
              expires_at: expiresAt,
            },
            { onConflict: 'practice_id,user_id,form_id' }
          );
      } catch (dbErr) {
        // Safe to continue since envelope is held in memory
      }

      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          success: true,
          formId: envelope.formId,
          savedAt: envelope.updatedAt,
          expiresAt: envelope.expiresAt,
        }),
      };
    }

    // --------------------------------------------------------------------------
    // DELETE: Discard or purge a form draft
    // --------------------------------------------------------------------------
    if (event.httpMethod === 'DELETE') {
      const formId = event.queryStringParameters?.formId;
      if (!formId) {
        return {
          statusCode: 400,
          headers: jsonHeaders,
          body: JSON.stringify({ error: 'formId query parameter is required.' }),
        };
      }

      const memoryKey = `${practiceId}:${userId}:${formId}`;
      serverDraftFallbackMap.delete(memoryKey);

      try {
        await supabaseAdmin
          .from('clinical_form_drafts')
          .delete()
          .eq('practice_id', practiceId)
          .eq('user_id', userId)
          .eq('form_id', formId);
      } catch (dbErr) {
        // Ignored
      }

      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ success: true, deleted: true }),
      };
    }

    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: `Method ${event.httpMethod} Not Allowed` }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Internal server error processing form draft.' }),
    };
  }
}

/**
 * Checks if a user is an active member of the practice, or is a platform admin.
 */
async function verifyPracticeMembership(userId, practiceId, supabaseAdmin) {
  if (!userId || !practiceId) return false;

  try {
    // 1. Check platform admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_platform_admin')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.is_platform_admin === true) {
      return true;
    }

    // 2. Check active membership in practice
    const { data: membership } = await supabaseAdmin
      .from('practice_memberships')
      .select('id, status')
      .eq('practice_id', practiceId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    return Boolean(membership);
  } catch {
    return false;
  }
}

function safeJsonParse(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

module.exports = {
  handler,
  verifyPracticeMembership,
  serverDraftFallbackMap,
};
