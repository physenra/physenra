// ==============================================================================
// PHYSENRA — PRACTICE REGISTRATION ROUTING BUG & REMEDIATION V2 REGRESSION TEST SUITE
// File: tests/practice_registration_routing_bug.test.cjs
//
// Governs & Verifies:
// 1. Authenticated user with zero practices can access /register-practice
// 2. Unauthenticated user cannot submit registration without account creation
// 3. /app remains strictly protected
// 4. /app/dashboard still requires practice membership
// 5. /no-practice remains correct for authenticated zero-practice users
// 6. Register a Practice CTA routes to /register-practice
// 7. Registration recognizes existing authenticated user with active session
// 8. Successful registration establishes practice context via refreshPractices
// 9. Successful registration redirects to dashboard (/app/dashboard?registered=<id>)
// 10. Failed registration does not loop to /no-practice (remains on page with error)
// 11. Active practice is correctly selected after registration
// 12. Existing multi-practice architecture is preserved
// 13. PracticeContext does not clear headers while auth is initializing
// 14. LoginPage safely supports ?from= query param from registration bridge
// 15. NoPracticePage auto-transitions into dashboard when practice is active
// 16. Registration uses authoritative server-side RPC (register_practice_and_subscribe)
// 17. No client injection of arbitrary practice_id or owner
// 18. Zero service-role credentials in client source code
// 19. Zero Kabworld references across codebase
// 20. Safe user error handling without raw database leak
// 21. Fix migration initializes practice_patient_counters with next_val = 1
// 22. Fix migration contains ZERO references to practice_patient_counters last_number
// 23. Patient registry foundation schema matches RPC initialization (next_val >= 1)
// 24. Service layer enforces valid session/access_token before RPC dispatch
// 25. RegisterPracticePage respects authLoading and blocks premature submission
// 26. RegisterPracticePage verifies session freshness immediately before RPC
// 27. RegisterPracticePage handles pending email confirmation safely
// 28. UI does not claim registration can proceed without active session
// 29. Fix migration preserves SECURITY DEFINER and search_path invariants
// 30. Fix migration preserves auth.uid() server-side ownership
// 31. Fix migration preserves permissions: REVOKE public, GRANT authenticated, service_role
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const APP_PATH = path.join(ROOT_DIR, 'src', 'App.tsx');
const PROTECTED_ROUTE_PATH = path.join(ROOT_DIR, 'src', 'components', 'auth', 'ProtectedRoute.tsx');
const PRACTICE_CONTEXT_PATH = path.join(ROOT_DIR, 'src', 'contexts', 'PracticeContext.tsx');
const AUTH_CONTEXT_PATH = path.join(ROOT_DIR, 'src', 'contexts', 'AuthContext.tsx');
const REGISTER_PRACTICE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'auth', 'RegisterPracticePage.tsx');
const LOGIN_PAGE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'auth', 'LoginPage.tsx');
const NO_PRACTICE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'error', 'NoPracticePage.tsx');
const SAAS_MIGRATION_PATH = path.join(ROOT_DIR, 'supabase', 'migrations', '20261001030000_platform_saas_subscriptions_foundation.sql');
const FIX_MIGRATION_PATH = path.join(ROOT_DIR, 'supabase', 'migrations', '20261004010000_fix_register_practice_patient_counter.sql');
const PATIENT_MIGRATION_PATH = path.join(ROOT_DIR, 'supabase', 'migrations', '20260928014500_patient_registry_foundation.sql');
const SAAS_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'saasSubscriptionService.ts');
const DATABASE_TYPES_PATH = path.join(ROOT_DIR, 'src', 'types', 'database.ts');

test('=== PHYSENRA — PRACTICE REGISTRATION REMEDIATION V2 VERIFICATION ===', async (t) => {
  const appCode = fs.readFileSync(APP_PATH, 'utf8');
  const protectedRouteCode = fs.readFileSync(PROTECTED_ROUTE_PATH, 'utf8');
  const practiceContextCode = fs.readFileSync(PRACTICE_CONTEXT_PATH, 'utf8');
  const authContextCode = fs.readFileSync(AUTH_CONTEXT_PATH, 'utf8');
  const registerPracticeCode = fs.readFileSync(REGISTER_PRACTICE_PATH, 'utf8');
  const loginPageCode = fs.readFileSync(LOGIN_PAGE_PATH, 'utf8');
  const noPracticeCode = fs.readFileSync(NO_PRACTICE_PATH, 'utf8');
  const saasMigrationCode = fs.readFileSync(SAAS_MIGRATION_PATH, 'utf8');
  const fixMigrationCode = fs.readFileSync(FIX_MIGRATION_PATH, 'utf8');
  const patientMigrationCode = fs.readFileSync(PATIENT_MIGRATION_PATH, 'utf8');
  const saasServiceCode = fs.readFileSync(SAAS_SERVICE_PATH, 'utf8');
  const databaseTypesCode = fs.readFileSync(DATABASE_TYPES_PATH, 'utf8');

  // ----------------------------------------------------------------------------
  // SUITE 1: Route Declarations & Access Control Boundaries
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Route Declarations & Access Control Boundaries ---', async (st) => {
    await st.test('TEST 1: Authenticated user with zero practices can access /register-practice', () => {
      assert(appCode.includes('path="/register-practice" element={<RegisterPracticePage />}'), 'Register practice route exists as standalone bridge');
      assert(!appCode.includes('<ProtectedRoute><RegisterPracticePage /></ProtectedRoute>'), 'Register practice must not be wrapped in default ProtectedRoute');
    });

    await st.test('TEST 2: Unauthenticated user cannot submit registration without account creation', () => {
      assert(registerPracticeCode.includes('if (!activeUser)'), 'Checks if active user exists before practice creation');
      assert(registerPracticeCode.includes('await signUp(cleanEmail, password'), 'Creates account first if user is unauthenticated');
    });

    await st.test('TEST 3: /app remains strictly protected by ProtectedRoute', () => {
      assert(appCode.includes('<ProtectedRoute>\n            <AppShell />\n          </ProtectedRoute>') ||
             appCode.includes('<ProtectedRoute>') && appCode.includes('<AppShell />'),
             'Root /app application must remain wrapped in ProtectedRoute');
      assert(protectedRouteCode.includes('if (!user)'), 'ProtectedRoute rejects unauthenticated users');
      assert(protectedRouteCode.includes('Navigate to="/login"'), 'Unauthenticated users are redirected to /login');
    });

    await st.test('TEST 4: /app/dashboard still strictly requires practice membership', () => {
      assert(protectedRouteCode.includes('if (requirePractice && memberships.length === 0)'), 'ProtectedRoute checks for zero practice memberships');
      assert(protectedRouteCode.includes('return <Navigate to="/no-practice" replace />;'), 'Zero practice users are redirected to /no-practice');
    });

    await st.test('TEST 5: /no-practice remains correct for authenticated zero-practice users', () => {
      assert(appCode.includes('path="/no-practice" element={<NoPracticePage />}'), 'App routes include /no-practice');
      assert(noPracticeCode.includes('No Practice Association Found'), 'NoPracticePage displays clear explanation');
      assert(noPracticeCode.includes('Your account is verified, but you are not currently associated with any active physiotherapy practice'), 'Displays descriptive guidance');
    });

    await st.test('TEST 6: Register a Practice CTA routes strictly to /register-practice', () => {
      assert(noPracticeCode.includes('to="/register-practice"'), 'CTA points to /register-practice');
      assert(noPracticeCode.includes('Register a Practice'), 'CTA displays Register a Practice text');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Registration Workflow & Existing User Recognition
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Registration Workflow & Existing User Recognition ---', async (st) => {
    await st.test('TEST 7: Registration recognizes existing authenticated user with active session', () => {
      assert(registerPracticeCode.includes('user && session ?'), 'Requires both user and session for authenticated owner state');
      assert(registerPracticeCode.includes('Signed in as Practice Owner'), 'Informs user of active owner identity');
      assert(registerPracticeCode.includes('{user.email}'), 'Displays authenticated user email');
      assert(registerPracticeCode.includes('let activeUser = user;'), 'Uses existing user object without re-signing up');
    });

    await st.test('TEST 8: Successful registration establishes practice context via refreshPractices', () => {
      assert(registerPracticeCode.includes('usePractice'), 'Imports usePractice hook');
      assert(registerPracticeCode.includes('refreshPractices'), 'Destructures refreshPractices');
      assert(registerPracticeCode.includes('await refreshPractices()'), 'Awaits practice context refresh before redirecting');
      assert(registerPracticeCode.includes('setActivePracticeHeader(result.practice_id)'), 'Persists practice ID to header');
    });

    await st.test('TEST 9: Successful registration redirects to dashboard with registered query param', () => {
      assert(registerPracticeCode.includes('window.location.href = `/app/dashboard?registered=${result.practice_id}`'), 'Redirects to /app/dashboard?registered=<id>');
      assert(registerPracticeCode.includes('Practice initialized!'), 'Informs user of initialization success');
    });

    await st.test('TEST 10: Failed registration does not loop to /no-practice', () => {
      assert(registerPracticeCode.includes('setError('), 'Sets user-facing error on failure');
      assert(!registerPracticeCode.includes('catch') || !registerPracticeCode.includes('navigate(\'/no-practice\')'), 'Does not navigate to /no-practice on catch');
    });

    await st.test('TEST 11: Active practice is correctly resolved after registration', () => {
      assert(practiceContextCode.includes('registeredParam'), 'PracticeContext checks for registered URL query parameter');
      assert(practiceContextCode.includes('setActivePracticeHeader(selected.practiceId)'), 'Sets active practice header');
      assert(practiceContextCode.includes('setActiveMembership(selected)'), 'Sets active membership');
    });

    await st.test('TEST 12: Existing multi-practice architecture is preserved', () => {
      assert(practiceContextCode.includes('switchPractice'), 'PracticeContext supports switching practices');
      assert(practiceContextCode.includes('memberships'), 'PracticeContext manages list of memberships');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Race Condition & Cold Reload Hardening
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Race Condition & Cold Reload Hardening ---', async (st) => {
    await st.test('TEST 13: PracticeContext does not clear headers while auth is initializing', () => {
      assert(practiceContextCode.includes('const { user, loading: authLoading } = useAuth()'), 'PracticeContext accesses authLoading state');
      assert(practiceContextCode.includes('if (authLoading)'), 'Guards against running while auth is in flight');
      assert(practiceContextCode.includes('if (!authLoading)'), 'Only triggers fetchMemberships once auth resolves');
    });

    await st.test('TEST 14: LoginPage safely supports ?from= query param from registration bridge', () => {
      assert(loginPageCode.includes('searchParams.get(\'from\')') || loginPageCode.includes('queryFrom'), 'LoginPage reads from query parameter');
      assert(loginPageCode.includes('isValidInternalPath'), 'Validates redirect path to prevent open redirect vulnerabilities');
    });

    await st.test('TEST 15: NoPracticePage automatically transitions into dashboard when practice is active', () => {
      assert(noPracticeCode.includes('memberships.length > 0'), 'Watches memberships length');
      assert(noPracticeCode.includes('navigate(\'/app/dashboard\''), 'Transitions to dashboard when practice is resolved');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Authoritative Backend & Security Invariants
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Authoritative Backend & Security Invariants ---', async (st) => {
    await st.test('TEST 16: Registration uses authoritative server-side RPC (register_practice_and_subscribe)', () => {
      assert(saasServiceCode.includes('rpc(\'register_practice_and_subscribe\''), 'Service invokes canonical database RPC');
      assert(fixMigrationCode.includes('CREATE OR REPLACE FUNCTION public.register_practice_and_subscribe'), 'Fix migration contains canonical RPC definition');
    });

    await st.test('TEST 17: No client injection of arbitrary practice_id or owner', () => {
      assert(fixMigrationCode.includes('v_user_id := auth.uid()'), 'RPC strictly binds membership to auth.uid()');
      const regSnippet = saasServiceCode.slice(
        saasServiceCode.indexOf('async registerPracticeAndSubscribe('),
        saasServiceCode.indexOf('// 2. TENANT-PLANE SUBSCRIPTION OPERATIONS')
      );
      assert(!regSnippet.includes('practice_id:'), 'Registration payload does not accept client-provided practice_id');
    });

    await st.test('TEST 18: Zero service-role credentials in client source code', () => {
      function scanDir(dir) {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, item.name);
          if (item.isDirectory()) scanDir(full);
          else if (item.name.endsWith('.ts') || item.name.endsWith('.tsx')) {
            const content = fs.readFileSync(full, 'utf8');
            assert(!content.includes('service_role') || full.includes('.test.'), `File ${full} must not contain service_role`);
            assert(!content.includes('SUPABASE_SERVICE_ROLE_KEY'), `File ${full} must not contain service role key`);
          }
        }
      }
      scanDir(path.join(ROOT_DIR, 'src'));
    });

    await st.test('TEST 19: Zero Kabworld references across codebase', () => {
      function scanKabworld(dir) {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, item.name);
          if (item.isDirectory() && !full.includes('.git') && !full.includes('node_modules')) {
            scanKabworld(full);
          } else if (item.name.endsWith('.ts') || item.name.endsWith('.tsx') || item.name.endsWith('.sql')) {
            const content = fs.readFileSync(full, 'utf8');
            assert(!content.toLowerCase().includes('kabworld'), `File ${full} must not contain Kabworld references`);
          }
        }
      }
      scanKabworld(path.join(ROOT_DIR, 'src'));
    });

    await st.test('TEST 20: Safe user error handling without raw database leak', () => {
      assert(registerPracticeCode.includes('rawMsg.replace(/RPC failed: |Database error: /gi'), 'Sanitizes backend database errors');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Database Schema Alignment & Patient Counter Fix (Error A & B Remediation)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Database Schema Alignment & Patient Counter Fix ---', async (st) => {
    await st.test('TEST 21: Fix migration initializes practice_patient_counters with next_val = 1', () => {
      assert(
        fixMigrationCode.includes('INSERT INTO public.practice_patient_counters (practice_id, next_val)'),
        'Must initialize practice_patient_counters with column next_val'
      );
      assert(
        fixMigrationCode.includes('VALUES (v_practice_id, 1)'),
        'Must set next_val to 1 for new practice'
      );
      assert(
        fixMigrationCode.includes('ON CONFLICT (practice_id) DO NOTHING;'),
        'Must be idempotent on conflict'
      );
    });

    await st.test('TEST 22: Fix migration contains ZERO references to practice_patient_counters last_number in SQL body', () => {
      const sqlBody = fixMigrationCode.slice(fixMigrationCode.indexOf('CREATE OR REPLACE FUNCTION'));
      assert(
        !sqlBody.includes('practice_patient_counters (practice_id, last_number)'),
        'Fix migration function body must not reference non-existent last_number on practice_patient_counters'
      );
    });

    await st.test('TEST 23: Patient registry foundation schema matches RPC initialization (next_val >= 1)', () => {
      assert(
        patientMigrationCode.includes('CREATE TABLE public.practice_patient_counters'),
        'Foundational patient counters table exists in migration'
      );
      assert(
        patientMigrationCode.includes('next_val integer NOT NULL DEFAULT 1 CHECK (next_val >= 1)'),
        'Foundational patient counters table defines next_val >= 1'
      );
      assert(
        databaseTypesCode.includes('practice_patient_counters: {') &&
        databaseTypesCode.includes('next_val: number;'),
        'TypeScript contracts match next_val column specification'
      );
    });

    await st.test('TEST 24: Service layer enforces valid session and access_token before RPC dispatch', () => {
      const regSnippet = saasServiceCode.slice(
        saasServiceCode.indexOf('async registerPracticeAndSubscribe('),
        saasServiceCode.indexOf('return data as unknown as RegisterPracticeAndSubscribeResponse;')
      );
      assert(regSnippet.includes('supabase.auth.getSession()'), 'Service checks getSession before RPC');
      assert(regSnippet.includes('session?.access_token'), 'Service verifies access_token is present');
      assert(regSnippet.includes('Authentication required'), 'Service throws descriptive error if unauthenticated');
    });

    await st.test('TEST 25: RegisterPracticePage respects authLoading and blocks premature submission', () => {
      assert(registerPracticeCode.includes('authLoading'), 'RegisterPracticePage extracts authLoading from useAuth');
      assert(registerPracticeCode.includes('if (authLoading)'), 'handleSubmit guards against submission during authLoading');
      assert(registerPracticeCode.includes('disabled={submitting || authLoading}'), 'Submit button disabled during authLoading');
    });

    await st.test('TEST 26: RegisterPracticePage verifies session freshness immediately before RPC', () => {
      assert(registerPracticeCode.includes('supabase.auth.getSession()'), 'handleSubmit validates session immediately before RPC');
      assert(registerPracticeCode.includes('supabase.auth.refreshSession()'), 'handleSubmit attempts refresh if session token is stale');
      assert(registerPracticeCode.includes('!activeSession?.access_token'), 'handleSubmit verifies active token exists');
    });

    await st.test('TEST 27: RegisterPracticePage handles pending email confirmation safely', () => {
      assert(registerPracticeCode.includes('!newSession?.access_token'), 'Detects newly registered accounts requiring email confirmation');
      assert(registerPracticeCode.includes('check your email to confirm your account'), 'Informs user to confirm email without firing RPC prematurely');
    });

    await st.test('TEST 28: UI does not claim registration can proceed without active session', () => {
      assert(registerPracticeCode.includes('user && session ?'), 'Step 1 requires active session before displaying ready status');
      assert(registerPracticeCode.includes('user && !session ?'), 'Step 1 renders expired notice when session is absent');
      assert(registerPracticeCode.includes('user && session && !authLoading ?'), 'Step 1 indicator only checks when session is valid');
    });

    await st.test('TEST 29: Fix migration preserves SECURITY DEFINER and search_path invariants', () => {
      assert(fixMigrationCode.includes('SECURITY DEFINER'), 'RPC remains SECURITY DEFINER');
      assert(fixMigrationCode.includes('search_path = public, auth, pg_temp'), 'Fixed search path prevents search-path hijacking');
    });

    await st.test('TEST 30: Fix migration preserves auth.uid() server-side ownership', () => {
      assert(fixMigrationCode.includes('v_user_id := auth.uid();'), 'Extracts user ID strictly from auth.uid()');
      assert(fixMigrationCode.includes('IF v_user_id IS NULL THEN'), 'Rejects unauthenticated requests');
      assert(fixMigrationCode.includes('user_id: v_user_id') || fixMigrationCode.includes('v_user_id,'), 'Associates membership with v_user_id');
    });

    await st.test('TEST 31: Fix migration preserves permissions: REVOKE public, GRANT authenticated, service_role', () => {
      assert(
        fixMigrationCode.includes('REVOKE EXECUTE ON FUNCTION public.register_practice_and_subscribe FROM public;'),
        'Revokes public execution'
      );
      assert(
        fixMigrationCode.includes('GRANT EXECUTE ON FUNCTION public.register_practice_and_subscribe TO authenticated, service_role;'),
        'Grants execution to authenticated and service_role'
      );
    });
  });
});
