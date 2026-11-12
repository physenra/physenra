/**
 * PHYSENRA — PHASE 7 & 7.1: SALES REPRESENTATIVE PORTAL & LIFECYCLE MANAGEMENT TESTS
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
    generatedLinks: [],
    updates: [],
    deletes: [],
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
        generateLink: async (params) => {
          calls.generatedLinks.push(params);
          if (options.generateLinkError) {
            return { data: null, error: { message: options.generateLinkError } };
          }
          return {
            data: {
              properties: {
                action_link: `https://physenra.com/auth/verify?token=mock_hash&type=${params.type}&redirect_to=${encodeURIComponent(params.options?.redirectTo || '')}`,
                email_otp: '123456',
                hashed_token: 'mock_hash',
                redirect_to: params.options?.redirectTo || '',
                verification_type: params.type,
              },
              user: { id: options.newAuthUserId || '99999999-9999-9999-9999-999999999999', email: params.email },
            },
            error: null,
          };
        },
        listUsers: async () => ({
          data: { users: options.existingAuthUsers || [] },
          error: null,
        }),
        getUserById: async (uid) => ({
          data: {
            user: options.linkedAuthUser !== undefined
              ? options.linkedAuthUser
              : { id: uid, last_sign_in_at: null, email_confirmed_at: null },
          },
          error: null,
        }),
        deleteUser: async (uid) => {
          calls.deletedUsers.push(uid);
          return { data: {}, error: null };
        },
      },
      resetPasswordForEmail: async (email, opts) => {
        calls.resets.push({ email, opts });
        if (options.resetPasswordRateLimited) {
          const err = new Error('For security purposes, you can only request this once every 60 seconds.');
          err.status = 429;
          return { data: null, error: err };
        }
        if (options.resetPasswordError) {
          return { data: null, error: { message: options.resetPasswordError } };
        }
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
                            commission_rate_bps: 2000,
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
            calls.updates.push({ table: 'sales_representatives', payload });
            return {
              eq: () => ({
                is: () => ({
                  select: async () => ({ data: [{ id: 'rep-1', user_id: payload.user_id }], error: null }),
                }),
              }),
            };
          },
          delete: () => {
            calls.deletes.push({ table: 'sales_representatives' });
            return {
              eq: async () => ({ data: null, error: null }),
            };
          },
        };
      }

      if (table === 'sales_referral_codes' || table === 'sales_rep_bank_accounts') {
        return {
          update: (payload) => {
            calls.updates.push({ table, payload });
            return {
              eq: async () => ({ data: null, error: null }),
            };
          },
          delete: () => {
            calls.deletes.push({ table });
            return {
              eq: async () => ({ data: null, error: null }),
            };
          },
        };
      }

      if (table === 'sales_referrals') {
        return {
          select: (_cols, opts) => ({
            eq: async () => ({
              data: null,
              count: options.referralCount !== undefined ? options.referralCount : 0,
              error: null,
            }),
          }),
        };
      }

      if (table === 'sales_commissions') {
        return {
          select: (_cols, opts) => ({
            eq: async () => ({
              data: null,
              count: options.commissionCount !== undefined ? options.commissionCount : 0,
              error: null,
            }),
          }),
        };
      }

      if (table === 'sales_commission_payouts') {
        return {
          select: (_cols, opts) => ({
            eq: async () => ({
              data: null,
              count: options.payoutCount !== undefined ? options.payoutCount : 0,
              error: null,
            }),
          }),
        };
      }

      if (table === 'practice_memberships') {
        return {
          select: () => ({
            eq: () => ({
              limit: async () => ({
                data: options.practiceMemberships !== undefined ? options.practiceMemberships : [],
                error: null,
              }),
            }),
          }),
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

test('PHASE 7 & 7.1 APPLICATION, SERVERLESS INVITE & LIFECYCLE SECURITY SUITE', async (t) => {
  await t.test('SUITE 1: Serverless Invite, Resend & Direct Link Lifecycle (/api/invite-sales-rep)', async (st) => {
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

    await st.test('State A: New unlinked rep generates direct action_link and dispatches email without password leak', async () => {
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
      assert.equal(body.email_sent, true);
      assert.ok(body.action_link.includes('auth/verify?token='), 'Must provide direct setup link');
      assert.equal(body.password, undefined);

      assert.equal(calls.invited.length, 1);
      assert.equal(calls.generatedLinks.length, 1);
      assert.equal(calls.generatedLinks[0].type, 'invite');
      assert.equal(calls.audits.length, 1);
      assert.equal(calls.audits[0].action, 'rep_account.invited');
    });

    await st.test('State B: Linked unconfirmed Auth account safely resends activation and returns direct setup link', async () => {
      const { adminClient, calls } = createMockAdminSupabase({
        rep: { id: '11111111-1111-4111-8111-111111111111', full_name: 'Adaeze', email: 'adaeze@physenra.com', status: 'active', user_id: 'auth-user-b' },
        linkedAuthUser: { id: 'auth-user-b', email: 'adaeze@physenra.com', email_confirmed_at: null, last_sign_in_at: null },
      });
      const res = await inviteHandler(
        { httpMethod: 'POST', headers: { origin: 'https://physenra.com' }, body: JSON.stringify({ sales_rep_id: '11111111-1111-4111-8111-111111111111', action: 'resend_setup' }) },
        {},
        { supabaseAdmin: adminClient, user: { id: 'admin-uid' } }
      );
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.equal(body.status, 'activation_resent');
      assert.equal(body.account_state, 'activation_pending');
      assert.ok(body.action_link.includes('type=invite'));
      assert.equal(calls.generatedLinks[0].type, 'invite');
    });

    await st.test('State C: Linked confirmed account awaiting password setup dispatches recovery setup link', async () => {
      const { adminClient, calls } = createMockAdminSupabase({
        rep: { id: '11111111-1111-4111-8111-111111111111', full_name: 'Adaeze', email: 'adaeze@physenra.com', status: 'active', user_id: 'auth-user-c' },
        linkedAuthUser: { id: 'auth-user-c', email: 'adaeze@physenra.com', email_confirmed_at: '2026-11-12T10:00:00Z', last_sign_in_at: null },
      });
      const res = await inviteHandler(
        { httpMethod: 'POST', headers: { origin: 'https://physenra.com' }, body: JSON.stringify({ sales_rep_id: '11111111-1111-4111-8111-111111111111', action: 'resend_setup' }) },
        {},
        { supabaseAdmin: adminClient, user: { id: 'admin-uid' } }
      );
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.equal(body.status, 'recovery_sent');
      assert.equal(body.account_state, 'password_setup_pending');
      assert.ok(body.action_link.includes('type=recovery'));
      assert.equal(calls.generatedLinks[0].type, 'recovery');
    });

    await st.test('State D: Fully activated account allows password recovery link generation on demand', async () => {
      const { adminClient, calls } = createMockAdminSupabase({
        rep: { id: '11111111-1111-4111-8111-111111111111', full_name: 'Adaeze', email: 'adaeze@physenra.com', status: 'active', user_id: 'auth-user-d' },
        linkedAuthUser: { id: 'auth-user-d', email: 'adaeze@physenra.com', email_confirmed_at: '2026-11-12T10:00:00Z', last_sign_in_at: '2026-11-12T11:00:00Z' },
      });
      const res = await inviteHandler(
        { httpMethod: 'POST', headers: { origin: 'https://physenra.com' }, body: JSON.stringify({ sales_rep_id: '11111111-1111-4111-8111-111111111111', action: 'resend_setup' }) },
        {},
        { supabaseAdmin: adminClient, user: { id: 'admin-uid' } }
      );
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.equal(body.status, 'recovery_sent');
      assert.equal(body.account_state, 'fully_activated');
      assert.ok(body.action_link.includes('type=recovery'));
    });

    await st.test('Rate-limit handling: Provider email throttle returns 200 with rate_limited=true and valid direct link', async () => {
      const { adminClient } = createMockAdminSupabase({
        rep: { id: '11111111-1111-4111-8111-111111111111', full_name: 'Adaeze', email: 'adaeze@physenra.com', status: 'active', user_id: 'auth-user-d' },
        linkedAuthUser: { id: 'auth-user-d', email: 'adaeze@physenra.com', email_confirmed_at: '2026-11-12T10:00:00Z', last_sign_in_at: '2026-11-12T11:00:00Z' },
        resetPasswordRateLimited: true,
      });
      const res = await inviteHandler(
        { httpMethod: 'POST', headers: {}, body: JSON.stringify({ sales_rep_id: '11111111-1111-4111-8111-111111111111', action: 'resend_setup' }) },
        {},
        { supabaseAdmin: adminClient, user: { id: 'admin-uid' } }
      );
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.equal(body.rate_limited, true);
      assert.equal(body.email_sent, false);
      assert.equal(body.cooldown_seconds, 60);
      assert.ok(body.action_link.includes('type=recovery'), 'Direct action_link must still be provided to unblock admin');
    });

    await st.test('Check status action returns detailed account state without dispatching email', async () => {
      const { adminClient, calls } = createMockAdminSupabase({
        rep: { id: '11111111-1111-4111-8111-111111111111', full_name: 'Adaeze', email: 'adaeze@physenra.com', status: 'active', user_id: 'auth-user-d' },
        linkedAuthUser: { id: 'auth-user-d', email: 'adaeze@physenra.com', email_confirmed_at: '2026-11-12T10:00:00Z', last_sign_in_at: '2026-11-12T11:00:00Z' },
      });
      const res = await inviteHandler(
        { httpMethod: 'POST', headers: {}, body: JSON.stringify({ sales_rep_id: '11111111-1111-4111-8111-111111111111', action: 'check_status' }) },
        {},
        { supabaseAdmin: adminClient, user: { id: 'admin-uid' } }
      );
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.equal(body.account_state, 'fully_activated');
      assert.equal(body.email_confirmed, true);
      assert.equal(calls.resets.length, 0);
      assert.equal(calls.invited.length, 0);
    });

    await st.test('Rejects arbitrary external redirect origins against open redirect abuse', () => {
      assert.equal(resolveSafeInviteRedirect('https://evil.example.com'), 'https://physenra.com/sales-portal/accept-invite');
      assert.equal(resolveSafeInviteRedirect('https://physenra.com'), 'https://physenra.com/sales-portal/accept-invite');
      assert.equal(resolveSafeInviteRedirect('http://localhost:5173'), 'http://localhost:5173/sales-portal/accept-invite');
      assert.equal(resolveSafeInviteRedirect('https://evil.example.com', 'recovery'), 'https://physenra.com/reset-password?portal=sales');
    });
  });

  await t.test('SUITE 2: Representative Deactivation, Reactivation, Archival & Safe Deletion Lifecycle', async (st) => {
    await st.test('Deactivates representative with mandatory reason and writes platform audit log', async () => {
      const { adminClient, calls } = createMockAdminSupabase({
        rep: { id: '11111111-1111-4111-8111-111111111111', full_name: 'Adaeze', email: 'a@p.com', status: 'active' },
      });
      const res = await inviteHandler(
        {
          httpMethod: 'POST',
          headers: {},
          body: JSON.stringify({
            sales_rep_id: '11111111-1111-4111-8111-111111111111',
            action: 'deactivate',
            reason: 'Temporary suspension during pilot assessment',
          }),
        },
        {},
        { supabaseAdmin: adminClient, user: { id: 'admin-uid' } }
      );
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.equal(body.status, 'suspended');
      assert.equal(calls.updates[0].payload.status, 'suspended');
      assert.equal(calls.audits[0].action, 'rep_account.deactivated');
    });

    await st.test('Rejects deactivation when reason is shorter than 5 characters', async () => {
      const { adminClient } = createMockAdminSupabase();
      const res = await inviteHandler(
        {
          httpMethod: 'POST',
          headers: {},
          body: JSON.stringify({ sales_rep_id: '11111111-1111-4111-8111-111111111111', action: 'deactivate', reason: 'bad' }),
        },
        {},
        { supabaseAdmin: adminClient, user: { id: 'admin-uid' } }
      );
      assert.equal(res.statusCode, 400);
    });

    await st.test('Reactivates suspended representative and clears termination timestamp', async () => {
      const { adminClient, calls } = createMockAdminSupabase({
        rep: { id: '11111111-1111-4111-8111-111111111111', full_name: 'Adaeze', email: 'a@p.com', status: 'suspended' },
      });
      const res = await inviteHandler(
        {
          httpMethod: 'POST',
          headers: {},
          body: JSON.stringify({
            sales_rep_id: '11111111-1111-4111-8111-111111111111',
            action: 'reactivate',
            reason: 'Pilot extension granted',
          }),
        },
        {},
        { supabaseAdmin: adminClient, user: { id: 'admin-uid' } }
      );
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.equal(body.status, 'active');
      assert.equal(calls.updates[0].payload.status, 'active');
      assert.equal(calls.updates[0].payload.terminated_at, null);
      assert.equal(calls.audits[0].action, 'rep_account.reactivated');
    });

    await st.test('Archives representative: sets status to terminated and deactivates active referral codes', async () => {
      const { adminClient, calls } = createMockAdminSupabase({
        rep: { id: '11111111-1111-4111-8111-111111111111', full_name: 'Adaeze', email: 'a@p.com', status: 'active' },
      });
      const res = await inviteHandler(
        {
          httpMethod: 'POST',
          headers: {},
          body: JSON.stringify({
            sales_rep_id: '11111111-1111-4111-8111-111111111111',
            action: 'archive',
            reason: 'Formal pilot program conclusion',
          }),
        },
        {},
        { supabaseAdmin: adminClient, user: { id: 'admin-uid' } }
      );
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.equal(body.status, 'terminated');

      // Verify code deactivation and status update
      const codeUpdate = calls.updates.find((u) => u.table === 'sales_referral_codes');
      assert.ok(codeUpdate, 'Referral codes must be deactivated upon archival');
      assert.equal(codeUpdate.payload.is_active, false);

      const repUpdate = calls.updates.find((u) => u.table === 'sales_representatives');
      assert.equal(repUpdate.payload.status, 'terminated');
      assert.ok(repUpdate.payload.terminated_at);
      assert.equal(calls.audits[0].action, 'rep_account.archived');
    });

    await st.test('Check deletion eligibility: returns can_delete=false when representative has referrals or commissions', async () => {
      const { adminClient } = createMockAdminSupabase({
        referralCount: 3,
        commissionCount: 1,
      });
      const res = await inviteHandler(
        {
          httpMethod: 'POST',
          headers: {},
          body: JSON.stringify({ sales_rep_id: '11111111-1111-4111-8111-111111111111', action: 'check_deletion_eligibility' }),
        },
        {},
        { supabaseAdmin: adminClient, user: { id: 'admin-uid' } }
      );
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.equal(body.can_delete, false);
      assert.equal(body.referral_count, 3);
      assert.equal(body.commission_count, 1);
      assert.equal(body.suggested_action, 'archive');
    });

    await st.test('Delete representative: BLOCKS hard deletion with HTTP 409 when financial/referral history exists', async () => {
      const { adminClient, calls } = createMockAdminSupabase({
        referralCount: 2,
        commissionCount: 1,
      });
      const res = await inviteHandler(
        {
          httpMethod: 'POST',
          headers: {},
          body: JSON.stringify({
            sales_rep_id: '11111111-1111-4111-8111-111111111111',
            action: 'delete',
            reason: 'Attempted hard deletion with history',
          }),
        },
        {},
        { supabaseAdmin: adminClient, user: { id: 'admin-uid' } }
      );
      assert.equal(res.statusCode, 409);
      assert.ok(res.body.includes('Cannot permanently delete representative with existing financial/referral history'));
      assert.equal(calls.deletes.length, 0, 'Zero deletion calls allowed when history exists');
    });

    await st.test('Delete representative: PERMITS hard deletion when representative has 0 referrals and 0 commissions', async () => {
      const { adminClient, calls } = createMockAdminSupabase({
        rep: { id: '11111111-1111-4111-8111-111111111111', full_name: 'Test Clean Rep', email: 'clean@p.com', status: 'active', user_id: 'clean-uid' },
        referralCount: 0,
        commissionCount: 0,
        payoutCount: 0,
        practiceMemberships: [], // Zero practice memberships -> safe to remove partner auth user
      });
      const res = await inviteHandler(
        {
          httpMethod: 'POST',
          headers: {},
          body: JSON.stringify({
            sales_rep_id: '11111111-1111-4111-8111-111111111111',
            action: 'delete',
            reason: 'Onboarded by mistake with zero activity',
          }),
        },
        {},
        { supabaseAdmin: adminClient, user: { id: 'admin-uid' } }
      );
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.equal(body.deleted, true);

      // Verify cascading partner cleanup and auth deletion
      assert.ok(calls.deletes.some((d) => d.table === 'sales_rep_bank_accounts'));
      assert.ok(calls.deletes.some((d) => d.table === 'sales_referral_codes'));
      assert.ok(calls.deletes.some((d) => d.table === 'sales_representatives'));
      assert.deepEqual(calls.deletedUsers, ['clean-uid']);
      assert.equal(calls.audits[0].action, 'rep_account.deleted');
    });

    await st.test('Delete representative: NEVER deletes Auth user if that user owns or belongs to a practice', async () => {
      const { adminClient, calls } = createMockAdminSupabase({
        rep: { id: '11111111-1111-4111-8111-111111111111', full_name: 'Clinic Partner', email: 'owner@clinic.com', status: 'active', user_id: 'clinic-owner-uid' },
        referralCount: 0,
        commissionCount: 0,
        payoutCount: 0,
        practiceMemberships: [{ id: 'membership-1' }], // User is a clinic member!
      });
      const res = await inviteHandler(
        {
          httpMethod: 'POST',
          headers: {},
          body: JSON.stringify({
            sales_rep_id: '11111111-1111-4111-8111-111111111111',
            action: 'delete',
            reason: 'Removed partner role only',
          }),
        },
        {},
        { supabaseAdmin: adminClient, user: { id: 'admin-uid' } }
      );
      assert.equal(res.statusCode, 200);
      assert.equal(calls.deletedUsers.length, 0, 'Auth user with practice memberships must NEVER be deleted');
    });
  });

  await t.test('SUITE 3: Frontend UI, Cooldown Hardening & Lifecycle Modals Verification', async (st) => {
    const forgotPasswordSrc = fs.readFileSync(path.join(ROOT, 'src/pages/auth/ForgotPasswordPage.tsx'), 'utf8');
    const platformSalesSrc = fs.readFileSync(path.join(ROOT, 'src/pages/platform/PlatformSalesPage.tsx'), 'utf8');
    const adminServiceSrc = fs.readFileSync(path.join(ROOT, 'src/services/salesRepAdminService.ts'), 'utf8');

    await st.test('ForgotPasswordPage enforces 60-second cooldown timer and sessionStorage persistence', () => {
      assert.ok(forgotPasswordSrc.includes('const COOLDOWN_SECONDS = 60'));
      assert.ok(forgotPasswordSrc.includes('pwd_reset_cooldown_'));
      assert.ok(forgotPasswordSrc.includes('Wait {cooldown}s before requesting again'));
      assert.ok(forgotPasswordSrc.includes('Resend available in {cooldown}s'));
    });

    await st.test('ForgotPasswordPage handles Supabase rate-limit errors with actionable guidance', () => {
      assert.ok(forgotPasswordSrc.includes('For security, password reset requests are limited to once per 60 seconds'));
      assert.ok(forgotPasswordSrc.includes('startCooldown(cleanEmail)'));
    });

    await st.test('PlatformSalesPage implements direct setup link copy modal and status actions', () => {
      assert.ok(platformSalesSrc.includes('directLinkModal'));
      assert.ok(platformSalesSrc.includes('Representative Portal Setup Link'));
      assert.ok(platformSalesSrc.includes('deactivateModal'));
      assert.ok(platformSalesSrc.includes('reactivateModal'));
      assert.ok(platformSalesSrc.includes('archiveDeleteModal'));
    });

    await st.test('salesRepAdminService implements complete representative lifecycle methods', () => {
      assert.ok(adminServiceSrc.includes('deactivateSalesRep'));
      assert.ok(adminServiceSrc.includes('reactivateSalesRep'));
      assert.ok(adminServiceSrc.includes('archiveSalesRep'));
      assert.ok(adminServiceSrc.includes('deleteSalesRep'));
      assert.ok(adminServiceSrc.includes('checkDeletionEligibility'));
    });
  });
});
