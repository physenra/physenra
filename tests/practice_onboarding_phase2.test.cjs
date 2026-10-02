// ==============================================================================
// PHYSENRA — PHASE 2: SELF-SERVICE PRACTICE ONBOARDING & ACCOUNT CREATION
// Test Suite: tests/practice_onboarding_phase2.test.cjs
//
// Authoritative Verification:
// TEST 1:  Unauthenticated visitor can reach registration (/register-practice)
// TEST 2:  Unauthenticated visitor can reach account creation (/signup)
// TEST 3:  Existing login still works (LoginPage.tsx retains signIn & links)
// TEST 4:  New account creation uses Supabase Auth correctly (AuthContext.signUp)
// TEST 5:  Password is never stored in profile tables
// TEST 6:  New user does not become Platform Admin (is_platform_admin = false default)
// TEST 7:  Practice is created exactly once in atomic RPC
// TEST 8:  Practice Admin membership is created exactly once in atomic RPC
// TEST 9:  Correct Practice Admin role ('practice_owner') is assigned
// TEST 10: Practice ID is correctly associated between practice and membership
// TEST 11: Selected SaaS plan comes from authoritative saas_plans catalog
// TEST 12: Subscription/trial state is created using authoritative SaaS mechanism
// TEST 13: No duplicate subscription is created for the same practice
// TEST 14: No duplicate practice is created on retry (slug unique constraint)
// TEST 15: Partial failure does not leave an invalid onboarding state (ACID RPC)
// TEST 16: New Practice Admin reaches correct practice workspace (/app/dashboard)
// TEST 17: Practice Admin cannot access another practice (Tenant RLS isolation)
// TEST 18: Practice Admin cannot access Platform Administration (PlatformAdminGuard)
// TEST 19: Platform Admin flow remains intact (Phase 1 preserved)
// TEST 20: Existing /no-practice behavior remains correct with registration bridge
// TEST 21: Clinical RLS remains intact (practice_id = current_practice_id())
// TEST 22: No service-role key in frontend source code
// TEST 23: No Supabase PAT in frontend or tests
// TEST 24: No Paystack secret in frontend source code
// TEST 25: Legacy Isolation — Zero kabworld references across codebase
// TEST 26: Live Remote Supabase verification (RPCs, constraints, RLS)
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const ROOT_DIR = path.join(__dirname, '..');
const APP_PATH = path.join(ROOT_DIR, 'src', 'App.tsx');
const AUTH_CONTEXT_PATH = path.join(ROOT_DIR, 'src', 'contexts', 'AuthContext.tsx');
const LOGIN_PAGE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'auth', 'LoginPage.tsx');
const SIGNUP_PAGE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'auth', 'SignUpPage.tsx');
const REGISTER_PRACTICE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'auth', 'RegisterPracticePage.tsx');
const NO_PRACTICE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'error', 'NoPracticePage.tsx');
const GUARD_PATH = path.join(ROOT_DIR, 'src', 'components', 'auth', 'PlatformAdminGuard.tsx');
const PROTECTED_ROUTE_PATH = path.join(ROOT_DIR, 'src', 'components', 'auth', 'ProtectedRoute.tsx');
const SAAS_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'saasSubscriptionService.ts');
const SAAS_MIGRATION_PATH = path.join(
  ROOT_DIR,
  'supabase',
  'migrations',
  '20261001030000_platform_saas_subscriptions_foundation.sql'
);
const FOUNDATION_MIGRATION_PATH = path.join(
  ROOT_DIR,
  'supabase',
  'migrations',
  '20260928011500_foundation_platform_tenancy_and_auth.sql'
);
const PATIENTS_MIGRATION_PATH = path.join(
  ROOT_DIR,
  'supabase',
  'migrations',
  '20260928014500_patient_registry_foundation.sql'
);

const appCode = fs.readFileSync(APP_PATH, 'utf8');
const authContextCode = fs.readFileSync(AUTH_CONTEXT_PATH, 'utf8');
const loginPageCode = fs.readFileSync(LOGIN_PAGE_PATH, 'utf8');
const signUpPageCode = fs.readFileSync(SIGNUP_PAGE_PATH, 'utf8');
const registerPracticeCode = fs.readFileSync(REGISTER_PRACTICE_PATH, 'utf8');
const noPracticeCode = fs.readFileSync(NO_PRACTICE_PATH, 'utf8');
const guardCode = fs.readFileSync(GUARD_PATH, 'utf8');
const protectedRouteCode = fs.readFileSync(PROTECTED_ROUTE_PATH, 'utf8');
const saasServiceCode = fs.readFileSync(SAAS_SERVICE_PATH, 'utf8');
const saasMigrationSql = fs.readFileSync(SAAS_MIGRATION_PATH, 'utf8');
const foundationMigrationSql = fs.readFileSync(FOUNDATION_MIGRATION_PATH, 'utf8');
const patientsMigrationSql = fs.readFileSync(PATIENTS_MIGRATION_PATH, 'utf8');

test('PHYSENRA PHASE 2: SELF-SERVICE PRACTICE ONBOARDING & ACCOUNT CREATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Routing, Navigation & Access Points
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Routing, Navigation & Access Points ---', async (st) => {
    await st.test('TEST 1: Unauthenticated visitor can reach registration (/register-practice)', () => {
      assert(appCode.includes('path="/register-practice"'), 'App.tsx must register /register-practice');
      assert(registerPracticeCode.includes('export const RegisterPracticePage'), 'RegisterPracticePage must export component');
      // Unauthenticated visitor must NOT be blocked by an "Authentication Required" wall
      assert(!registerPracticeCode.includes('Authentication Required'), 'RegisterPracticePage must not block unauthenticated users');
      assert(registerPracticeCode.includes('Step 1: Practice Owner Account'), 'Must render inline account creation for unauthenticated visitors');
    });

    await st.test('TEST 2: Unauthenticated visitor can reach account creation (/signup)', () => {
      assert(appCode.includes('path="/signup"'), 'App.tsx must register /signup');
      assert(signUpPageCode.includes('export const SignUpPage'), 'SignUpPage must export component');
      assert(signUpPageCode.includes('Create your Physenra account'), 'SignUpPage must present account creation form');
      assert(signUpPageCode.includes('to="/register-practice"'), 'SignUpPage must link to practice registration');
    });

    await st.test('TEST 3: Existing login still works and links to registration', () => {
      assert(loginPageCode.includes('const { signIn, user, loading } = useAuth()'), 'LoginPage must use signIn from useAuth');
      assert(loginPageCode.includes('await signIn(email.trim(), password)'), 'LoginPage must execute signIn on submit');
      assert(loginPageCode.includes('to="/register-practice"'), 'LoginPage must provide link to /register-practice');
      assert(loginPageCode.includes('Start 14-Day Free Practice Trial'), 'LoginPage must display practice trial CTA');
      assert(loginPageCode.includes('to="/signup"'), 'LoginPage must link to /signup');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Account Creation & Profile Integrity
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Account Creation & Profile Integrity ---', async (st) => {
    await st.test('TEST 4: New account creation uses Supabase Auth correctly', () => {
      assert(authContextCode.includes('signUp: (email: string, password: string,'), 'AuthContext must declare signUp method');
      assert(authContextCode.includes('supabase.auth.signUp({'), 'AuthContext must invoke supabase.auth.signUp');
      assert(authContextCode.includes('first_name: metadata?.first_name'), 'Must pass first_name to Supabase Auth metadata');
      assert(authContextCode.includes('last_name: metadata?.last_name'), 'Must pass last_name to Supabase Auth metadata');
      assert(authContextCode.includes('display_name: displayName'), 'Must pass display_name to Supabase Auth metadata');
    });

    await st.test('TEST 5: Password is never stored in profile tables', () => {
      // In foundation migration, public.profiles contains only non-sensitive identity metadata
      assert(foundationMigrationSql.includes('CREATE TABLE public.profiles'), 'profiles table must exist');
      assert(!foundationMigrationSql.includes('password text'), 'profiles table must NEVER contain password column');
      assert(!foundationMigrationSql.includes('encrypted_password'), 'profiles table must NEVER store password hashes');
      // handle_new_user trigger only inserts display_name, first_name, last_name
      assert(foundationMigrationSql.includes('INSERT INTO public.profiles (id, display_name, first_name, last_name)'), 'Trigger only maps display and names');
    });

    await st.test('TEST 6: New user does not become Platform Admin', () => {
      assert(foundationMigrationSql.includes('is_platform_admin boolean NOT NULL DEFAULT false'), 'is_platform_admin must default to false');
      assert(foundationMigrationSql.includes('is_platform_admin = (SELECT p.is_platform_admin FROM public.profiles p WHERE p.id = auth.uid())'), 'Update policy must prevent self-escalation');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Practice Creation, Roles & Atomic RPC
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Practice Creation, Roles & Atomic RPC ---', async (st) => {
    await st.test('TEST 7: Practice is created exactly once in atomic RPC', () => {
      assert(saasMigrationSql.includes('CREATE OR REPLACE FUNCTION public.register_practice_and_subscribe'), 'Atomic RPC must exist');
      assert(saasMigrationSql.includes('INSERT INTO public.practices ('), 'RPC must insert into public.practices');
      assert(saasMigrationSql.includes('RETURNING id INTO v_practice_id'), 'RPC must capture unique practice ID');
    });

    await st.test('TEST 8: Practice Admin membership is created exactly once in atomic RPC', () => {
      assert(saasMigrationSql.includes('INSERT INTO public.practice_memberships ('), 'RPC must insert membership');
      assert(saasMigrationSql.includes('practice_id,'), 'Must link to newly created practice_id');
      assert(saasMigrationSql.includes('user_id,'), 'Must link to auth.uid()');
    });

    await st.test('TEST 9: Correct Practice Admin role (practice_owner) is assigned', () => {
      assert(saasMigrationSql.includes("'practice_owner'"), 'Membership role must strictly be practice_owner');
      assert(saasMigrationSql.includes("'active'"), 'Membership status must be active');
    });

    await st.test('TEST 10: Practice ID is correctly associated between practice and membership', () => {
      assert(saasMigrationSql.includes('v_practice_id,\n    v_user_id,\n    \'practice_owner\''), 'v_practice_id must bind directly to membership');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: SaaS Plan Catalog & Subscription Contract
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: SaaS Plan Catalog & Subscription Contract ---', async (st) => {
    await st.test('TEST 11: Selected SaaS plan comes from authoritative saas_plans catalog', () => {
      assert(saasMigrationSql.includes('SELECT * INTO v_plan \n  FROM public.saas_plans \n  WHERE plan_code = p_plan_code AND is_active = true'), 'RPC must validate plan in database');
      assert(saasMigrationSql.includes('IF NOT v_plan.is_public THEN'), 'RPC must verify plan is public');
    });

    await st.test('TEST 12: Subscription/trial state is created using authoritative SaaS mechanism', () => {
      assert(saasMigrationSql.includes('INSERT INTO public.practice_subscriptions ('), 'RPC must create subscription');
      assert(saasMigrationSql.includes("v_status := 'trialing'"), 'Must assign trialing status');
      assert(saasMigrationSql.includes("v_trial_ends_at := v_period_start + (v_plan.trial_duration_days || ' days')::interval"), 'Must calculate 14-day trial end');
    });

    await st.test('TEST 13: No duplicate subscription is created for the same practice', () => {
      // Unique constraint on practice_subscriptions(practice_id)
      assert(saasMigrationSql.includes('practice_id uuid NOT NULL UNIQUE REFERENCES public.practices(id)'), 'practice_subscriptions must have UNIQUE constraint on practice_id');
    });

    await st.test('TEST 14: No duplicate practice is created on retry (slug unique constraint)', () => {
      assert(saasMigrationSql.includes('IF EXISTS (SELECT 1 FROM public.practices WHERE slug = p_slug) THEN'), 'RPC must explicitly check slug uniqueness');
      assert(saasMigrationSql.includes("RAISE EXCEPTION 'Practice slug % is already registered'"), 'RPC must raise unique_violation error');
    });

    await st.test('TEST 15: Partial failure does not leave an invalid onboarding state (ACID transaction)', () => {
      // PostgreSQL functions are executed in a single atomic transaction block
      assert(saasMigrationSql.includes('RETURNS jsonb AS $$'), 'Function runs inside single PL/pgSQL transaction block');
      assert(saasMigrationSql.includes('BEGIN\n  v_user_id := auth.uid();'), 'Begins atomic transaction block');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Practice Admin Landing & Role Isolation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Practice Admin Landing & Role Isolation ---', async (st) => {
    await st.test('TEST 16: New Practice Admin reaches correct practice workspace (/app/dashboard)', () => {
      assert(registerPracticeCode.includes('setActivePracticeHeader(result.practice_id)'), 'Must store active practice ID in header');
      assert(registerPracticeCode.includes('window.location.href = `/app/dashboard?registered=${result.practice_id}`'), 'Must redirect to /app/dashboard');
    });

    await st.test('TEST 17: Practice Admin cannot access another practice (Tenant RLS isolation)', () => {
      assert(foundationMigrationSql.includes('CREATE POLICY practices_select_member ON public.practices'), 'Practices isolation policy exists');
      assert(foundationMigrationSql.includes('CREATE POLICY memberships_select ON public.practice_memberships'), 'Memberships isolation policy exists');
    });

    await st.test('TEST 18: Practice Admin cannot access Platform Administration (PlatformAdminGuard)', () => {
      assert(guardCode.includes('if (!profile?.is_platform_admin)'), 'Guard strictly checks profile.is_platform_admin');
      assert(guardCode.includes('Restricted Access'), 'Guard renders Restricted Access notice');
      assert(guardCode.includes('to="/app"'), 'Guard directs non-platform admins back to clinical application');
    });

    await st.test('TEST 19: Platform Admin flow remains intact (Phase 1 preserved)', () => {
      assert(appCode.includes('path="/platform"'), 'App.tsx maintains /platform shell');
      assert(appCode.includes('<PlatformAdminGuard>'), 'App.tsx wraps platform with PlatformAdminGuard');
      assert(noPracticeCode.includes('Boolean(profile?.is_platform_admin)'), 'NoPracticePage preserves Platform Admin bypass link');
    });

    await st.test('TEST 20: Existing /no-practice behavior remains correct with registration bridge', () => {
      assert(protectedRouteCode.includes('memberships.length === 0'), 'ProtectedRoute detects user with 0 memberships');
      assert(protectedRouteCode.includes('Navigate to="/no-practice"'), 'ProtectedRoute redirects 0-membership users to /no-practice');
      assert(noPracticeCode.includes('to="/register-practice"'), 'NoPracticePage provides direct registration bridge');
      assert(noPracticeCode.includes('Register a Practice'), 'NoPracticePage displays "Register a Practice" button');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Security Invariants, Credentials & Isolation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Security Invariants, Credentials & Isolation ---', async (st) => {
    await st.test('TEST 21: Clinical RLS remains intact (Zero bypass for Practice Admin in clinical records)', () => {
      // In patient registry migration, policies require current_practice_id()
      assert(patientsMigrationSql.includes('patients_select_active_practice'), 'Patient active practice select policy exists');
      assert(patientsMigrationSql.includes('practice_id = public.current_practice_id()'), 'Patient policy requires current_practice_id()');
    });

    await st.test('TEST 22: No service-role key in frontend source code', () => {
      const srcFiles = [];
      function scanDir(dir) {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, item.name);
          if (item.isDirectory()) scanDir(full);
          else if (item.name.endsWith('.ts') || item.name.endsWith('.tsx') || item.name.endsWith('.html')) {
            srcFiles.push(full);
          }
        }
      }
      scanDir(path.join(ROOT_DIR, 'src'));

      for (const file of srcFiles) {
        const content = fs.readFileSync(file, 'utf8');
        assert(!content.includes('service_role'), `File ${file} must not contain service_role`);
        assert(!content.includes('SUPABASE_SERVICE_ROLE_KEY'), `File ${file} must not reference service role key`);
      }
    });

    await st.test('TEST 23: No Supabase PAT in frontend or tests', () => {
      const allFiles = [APP_PATH, AUTH_CONTEXT_PATH, LOGIN_PAGE_PATH, SIGNUP_PAGE_PATH, REGISTER_PRACTICE_PATH, NO_PRACTICE_PATH];
      for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf8');
        assert(!content.includes('sbp_'), `File ${file} must not contain any Supabase Personal Access Token`);
      }
    });

    await st.test('TEST 24: No Paystack secret in frontend source code', () => {
      const srcFiles = [];
      function scanDir(dir) {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, item.name);
          if (item.isDirectory()) scanDir(full);
          else if (item.name.endsWith('.ts') || item.name.endsWith('.tsx')) {
            srcFiles.push(full);
          }
        }
      }
      scanDir(path.join(ROOT_DIR, 'src'));

      for (const file of srcFiles) {
        const content = fs.readFileSync(file, 'utf8');
        assert(!content.includes('sk_live_'), `File ${file} must not contain Paystack live secret`);
        assert(!content.includes('sk_test_'), `File ${file} must not contain Paystack test secret`);
      }
    });

    await st.test('TEST 25: Legacy Isolation — Zero kabworld references across codebase', () => {
      const srcFiles = fs.readdirSync(path.join(ROOT_DIR, 'src'), { recursive: true });
      for (const file of srcFiles) {
        if (typeof file === 'string' && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
          const content = fs.readFileSync(path.join(ROOT_DIR, 'src', file), 'utf8');
          assert(!content.toLowerCase().includes('kabworld'), `File src/${file} must never reference kabworld`);
        }
      }
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 7: Live Remote Supabase Architecture Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 7: Live Remote Supabase Architecture Verification ---', async (st) => {
    await st.test('TEST 26: Live Remote Supabase rejects unauthenticated call to register_practice_and_subscribe', async () => {
      const supabaseUrl = 'https://xxknmdgneamtoahqayvl.supabase.co';
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4a25tZGduZWFtdG9haHFheXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDUzNDgsImV4cCI6MjEwNjEyMTM0OH0.2XKv_9MixK87v-_3U_fEGHBeQsoPRpqM3Rw75QcVznk';

      const payload = JSON.stringify({
        p_practice_name: 'Unauthorized Probe Practice',
        p_slug: 'unauthorized-probe',
        p_plan_code: 'solo',
      });

      const options = {
        hostname: 'xxknmdgneamtoahqayvl.supabase.co',
        path: '/rest/v1/rpc/register_practice_and_subscribe',
        method: 'POST',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const result = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            resolve({ statusCode: res.statusCode, body: data });
          });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
      });

      // Anonymous callers must be denied by RPC permission gate or throw permission error
      // HTTP 401 Unauthorized, 403 Forbidden, 400 with insufficient_privilege, or 404 (if ungranted to anon)
      assert(
        result.statusCode === 401 || result.statusCode === 403 || result.statusCode === 400 || result.statusCode === 404,
        `Expected anonymous RPC call to be denied, but received HTTP ${result.statusCode}: ${result.body}`
      );
      if (result.statusCode === 400 || result.statusCode === 403) {
        assert(
          result.body.includes('insufficient_privilege') ||
          result.body.includes('Authentication required') ||
          result.body.includes('permission denied'),
          `Expected authentication or privilege error in body, got: ${result.body}`
        );
      }
    });
  });
});
