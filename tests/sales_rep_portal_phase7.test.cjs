/**
 * PHYSENRA — PHASE 7: SALES REPRESENTATIVE PORTAL, INVITE ENDPOINT & ATTRIBUTION TESTS
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const { handler: inviteHandler, resolveSafeInviteRedirect } = require('../netlify/functions/invite-sales-rep.cjs');

function createMockAdminSupabase(options = {}) {
  const calls = {
    invited: [],
    deletedUsers: [],
    resets: [],
    updates: [],
    audits: [],
  };

  const adminClient = {
    auth: {
      admin: {
        inviteUserByEmail: async (email, opts) => {
          calls.invited.push({ email, opts });
          if (options.inviteError) {
            return { data: { user: null }, error: { message: options.inviteError } };
          }
          return {
            data: { user: { id: options.newAuthUserId || '99999999-9999-9999-9999-999999999999', email } },
            error: null,
          };
        },
        listUsers: async () => ({
          data: { users: options.existingAuthUsers || [] },
          error: null,
        }),
        getUserById: async (uid) => ({
          data: { user: options.linkedAuthUser || { id: uid, last_sign_in_at: null, email_confirmed_at: null } },
          error: null,
        }),
        deleteUser: async (uid) => {
          calls.deletedUsers.push(uid);
          return { data: {}, error: null };
        },
      },
      resetPasswordForEmail: async (email, opts) => {
        calls.resets.push({ email, opts });
        return { data: {}, error: null };
      },
    },
    from: (table) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: (_col, val) => ({
              maybeSingle: async () => ({
                data: { is_platform_admin: options.callerIsAdmin !== false && val === 'admin-uid' },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'sales_representatives') {
        return {
          select: () => ({
            eq: (col, val) => {
              if (col === 'id') {
                return {
                  maybeSingle: async () => ({
                    data:
                      options.rep === null
                        ? null
                        : options.rep || {
                            id: val,
                            full_name: 'Adaeze Okafor',
                            email: 'adaeze@physenra.com',
                            status: 'active',
                            user_id: null,
                          },
                    error: null,
                  }),
                };
              }
              return {
                neq: () => ({
                  maybeSingle: async () => ({
                    data: options.conflictingRep || null,
                    error: null,
                  }),
                }),
              };
            },
          }),
          update: (payload) => {
            calls.updates.push(payload);
            return {
              eq: () => ({
                is: () => ({
                  select: async () => {
                    if (options.linkUpdateError) {
                      return { data: null, error: { message: options.linkUpdateError } };
                    }
                    return { data: [{ id: 'rep-1', user_id: payload.user_id }], error: null };
                  },
                }),
              }),
            };
          },
        };
      }

      if (table === 'platform_audit_logs') {
        return {
          insert: async (row) => {
            calls.audits.push(row);
            return { data: null, error: null };
          },
        };
      }

      throw new Error(`Unexpected table query: ${table}`);
    },
  };

  return { adminClient, calls };
}

test('PHASE 7 APPLICATION, SERVERLESS INVITE & PORTAL SECURITY SUITE', async (t) => {
  await t.test('SUITE 1: Serverless Invite Provisioning (/api/invite-sales-rep)', async (st) => {
    await st.test('Rejects non-POST methods with HTTP 405', async () => {
      const { adminClient } = createMockAdminSupabase();
      const res = await inviteHandler({ httpMethod: 'GET', headers: {} }, {}, { supabaseAdmin: adminClient });
      assert.equal(res.statusCode, 405);
    });

    await st.test('Rejects unauthenticated requests with HTTP 401', async () => {
      const { adminClient } = createMockAdminSupabase();
      const res = await inviteHandler(
        { httpMethod: 'POST', headers: {}, body: '{}' },
        {},
        { supabaseAdmin: adminClient, user: null }
      );
      assert.equal(res.statusCode, 401);
    });

    await st.test('Rejects non-Platform Admin callers with HTTP 403', async () => {
      const { adminClient } = createMockAdminSupabase({ callerIsAdmin: false });
      const res = await inviteHandler(
        { httpMethod: 'POST', headers: {}, body: JSON.stringify({ sales_rep_id: '11111111-1111-4111-8111-111111111111' }) },
        {},
        { supabaseAdmin: adminClient, user: { id: 'non-admin-uid' } }
      );
      assert.equal(res.statusCode, 403);
    });

    await st.test('Rejects inviting suspended representative with HTTP 400', async () => {
      const { adminClient } = createMockAdminSupabase({
        rep: { id: '11111111-1111-4111-8111-111111111111', full_name: 'Susp', email: 's@p.com', status: 'suspended', user_id: null },
      });
      const res = await inviteHandler(
        { httpMethod: 'POST', headers: {}, body: JSON.stringify({ sales_rep_id: '11111111-1111-4111-8111-111111111111' }) },
        {},
        { supabaseAdmin: adminClient, user: { id: 'admin-uid' } }
      );
      assert.equal(res.statusCode, 400);
    });

    await st.test('Invites active unlinked rep via inviteUserByEmail without shared passwords or admin privilege', async () => {
      const { adminClient, calls } = createMockAdminSupabase();
      const repUuid = '11111111-1111-4111-8111-111111111111';
      const res = await inviteHandler(
        { httpMethod: 'POST', headers: { origin: 'https://physenra.com' }, body: JSON.stringify({ sales_rep_id: repUuid }) },
        {},
        { supabaseAdmin: adminClient, user: { id: 'admin-uid' } }
      );
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.equal(body.status, 'invited');
      assert.equal(body.linked, true);
      assert.equal(body.invited, true);
      assert.equal(body.password, undefined);
      assert.equal(body.action_link, undefined);

      assert.equal(calls.invited.length, 1);
      assert.equal(calls.invited[0].opts.redirectTo, 'https://physenra.com/sales-portal/accept-invite');
      assert.equal(calls.invited[0].opts.data.role, 'sales_representative');
      assert.notEqual(calls.invited[0].opts.data.is_platform_admin, true);
      assert.equal(calls.updates.length, 1);
      assert.equal(calls.audits.length, 1);
    });

    await st.test('Associates existing Auth account safely without overwriting password when email already registered', async () => {
      const { adminClient, calls } = createMockAdminSupabase({
        inviteError: 'User already registered',
        existingAuthUsers: [{ id: 'existing-clinic-owner-uid', email: 'adaeze@physenra.com' }],
      });
      const res = await inviteHandler(
        { httpMethod: 'POST', headers: {}, body: JSON.stringify({ sales_rep_id: '11111111-1111-4111-8111-111111111111' }) },
        {},
        { supabaseAdmin: adminClient, user: { id: 'admin-uid' } }
      );
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.equal(body.status, 'linked_existing_account');
      assert.equal(body.linked, true);
      assert.equal(calls.updates[0].user_id, 'existing-clinic-owner-uid');
      assert.equal(calls.resets.length, 0);
    });

    await st.test('Performs compensating Auth user cleanup if DB link update fails (zero partial orphans)', async () => {
      const { adminClient, calls } = createMockAdminSupabase({
        newAuthUserId: 'orphan-check-uid',
        linkUpdateError: 'concurrent conflict',
      });
      const res = await inviteHandler(
        { httpMethod: 'POST', headers: {}, body: JSON.stringify({ sales_rep_id: '11111111-1111-4111-8111-111111111111' }) },
        {},
        { supabaseAdmin: adminClient, user: { id: 'admin-uid' } }
      );
      assert.equal(res.statusCode, 409);
      assert.deepEqual(calls.deletedUsers, ['orphan-check-uid']);
    });

    await st.test('Rejects arbitrary external redirect origins against open redirect abuse', () => {
      assert.equal(resolveSafeInviteRedirect('https://evil.example.com'), 'https://physenra.com/sales-portal/accept-invite');
      assert.equal(resolveSafeInviteRedirect('https://physenra.com'), 'https://physenra.com/sales-portal/accept-invite');
      assert.equal(resolveSafeInviteRedirect('http://localhost:5173'), 'http://localhost:5173/sales-portal/accept-invite');
    });
  });

  await t.test('SUITE 2: Independent Portal Routes, Commercial Isolation & Auth Wiring', async (st) => {
    const appSrc = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
    const guardSrc = fs.readFileSync(path.join(ROOT, 'src/components/auth/SalesRepGuard.tsx'), 'utf8');
    const portalSrc = fs.readFileSync(path.join(ROOT, 'src/pages/rep/SalesPortalPage.tsx'), 'utf8');
    const portalServiceSrc = fs.readFileSync(path.join(ROOT, 'src/services/salesRepPortalService.ts'), 'utf8');
    const subServiceSrc = fs.readFileSync(path.join(ROOT, 'src/services/saasSubscriptionService.ts'), 'utf8');
    const migrationSrc = fs.readFileSync(
      path.join(ROOT, 'supabase/migrations/20261112100000_sales_rep_portal_and_attribution.sql'),
      'utf8'
    );

    await st.test('App.tsx exposes /sales-portal, partner login, invite acceptance & password reset routes', () => {
      for (const route of [
        '/sales-portal',
        '/sales-portal/login',
        '/sales-portal/accept-invite',
        '/sales-portal/forgot-password',
        '/forgot-password',
        '/reset-password',
        '/register',
      ]) {
        assert.ok(appSrc.includes(`path="${route}"`), `Missing route: ${route}`);
      }
    });

    await st.test('SalesRepGuard enforces free access without usePractice or clinic subscriptions and blocks inactive reps', () => {
      assert.ok(!guardSrc.includes('usePractice'), 'SalesRepGuard must never depend on clinic PracticeContext');
      assert.ok(!guardSrc.includes('practice_subscriptions'), 'SalesRepGuard must never require clinic subscription');
      assert.ok(guardSrc.includes('Sales Portal Access Revoked'), 'Must render explicit revocation UI when suspended/terminated');
    });

    await st.test('SalesPortalPage enforces commission-disabled disclosure, WhatsApp/copy sharing & zero clinical/admin links', () => {
      assert.ok(portalSrc.includes('Commission settlement is not yet activated.'));
      assert.ok(portalSrc.includes('Copy Link'));
      assert.ok(portalSrc.includes('Share via WhatsApp'));
      assert.ok(!portalSrc.includes('/platform/'), 'Portal must never expose Platform Console navigation');
      assert.ok(!portalSrc.includes('patients'), 'Portal must never access patient records');
    });

    await st.test('buildReferralShareUrls points to /register-practice?ref=CODE', () => {
      assert.ok(portalServiceSrc.includes('/register-practice?ref=${encodeURIComponent(cleanCode)}'));
      assert.ok(portalServiceSrc.includes('https://wa.me/?text='));
    });

    await st.test('saasSubscriptionService keeps clinic onboarding compatible with both 6-param and 7-param production RPC', () => {
      assert.ok(subServiceSrc.includes('isMissing7thParam'));
      assert.ok(subServiceSrc.includes('attribute_practice_referral'));
    });

    await st.test('Zero service_role or Kabworld credentials in src/', () => {
      const files = fs.readdirSync(path.join(ROOT, 'src'), { recursive: true });
      for (const rel of files) {
        const full = path.join(ROOT, 'src', rel);
        if (fs.statSync(full).isFile() && /\.(ts|tsx)$/.test(rel)) {
          const content = fs.readFileSync(full, 'utf8');
          assert.ok(!/service_role/i.test(content), `Found service_role in ${rel}`);
          assert.ok(!content.includes('psyjbmetnpsqarbumzrb'), `Found Kabworld reference in ${rel}`);
        }
      }
    });

    await st.test('Phase 7 migration never alters sales_referrals_enabled, Paystack, or creates rep subscriptions', () => {
      assert.ok(!migrationSrc.includes('process_subscription_payment_settlement'));
      assert.ok(!migrationSrc.includes('evaluate_referral_commission'));
      assert.ok(!migrationSrc.includes("'enabled': true") && !migrationSrc.includes('"enabled": true'));
      const portalRpcSection = migrationSrc.split('DROP FUNCTION IF EXISTS public.register_practice_and_subscribe')[0];
      assert.ok(!portalRpcSection.includes('INSERT INTO public.practice_subscriptions'));
      assert.ok(!portalRpcSection.includes('INSERT INTO public.practice_memberships'));
    });
  });
});
