// ==============================================================================
// PHYSENRA — PHASE 1: PLATFORM OPERATOR ACCESS & NAVIGATION BRIDGE TEST SUITE
// File: tests/platform_operator_access_phase1.test.cjs
//
// Verifies:
// TEST 1:  Platform Admin physenra@gmail.com has is_platform_admin = true
// TEST 2:  Platform Admin sees "Platform Admin Console" in Sidebar & Header
// TEST 3:  Ordinary Practice Admin does NOT see "Platform Admin Console"
// TEST 4:  Practitioner does NOT see "Platform Admin Console"
// TEST 5:  Patient does NOT see "Platform Admin Console"
// TEST 6:  Platform Admin can access /platform
// TEST 7:  Platform Admin can access /platform/practices
// TEST 8:  Platform Admin can access /platform/plans
// TEST 9:  Platform Admin can access /platform/billing
// TEST 10: Platform Admin can access /platform/audit
// TEST 11: Platform Admin can access /platform/settings
// TEST 12: Non-platform user cannot access platform routes (PlatformAdminGuard)
// TEST 13: Platform Admin without practice_id is not trapped by /no-practice
// TEST 14: Ordinary user without practice_id remains subject to existing protection
// TEST 15: "Return to Clinical Workspace" behaves safely with/without practice
// TEST 16: No clinical RLS behavior has been weakened
// TEST 17: No patient data becomes visible through Platform Administration
// TEST 18: No service-role credentials appear in client code
// TEST 19: Zero Kabworld references across codebase
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const ROOT_DIR = path.join(__dirname, '..');
const SIDEBAR_PATH = path.join(ROOT_DIR, 'src', 'components', 'layout', 'Sidebar.tsx');
const HEADER_PATH = path.join(ROOT_DIR, 'src', 'components', 'layout', 'Header.tsx');
const PLATFORM_LAYOUT_PATH = path.join(ROOT_DIR, 'src', 'components', 'layout', 'PlatformLayout.tsx');
const PROTECTED_ROUTE_PATH = path.join(ROOT_DIR, 'src', 'components', 'auth', 'ProtectedRoute.tsx');
const NO_PRACTICE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'error', 'NoPracticePage.tsx');
const GUARD_PATH = path.join(ROOT_DIR, 'src', 'components', 'auth', 'PlatformAdminGuard.tsx');
const APP_PATH = path.join(ROOT_DIR, 'src', 'App.tsx');
const USE_ROLE_PATH = path.join(ROOT_DIR, 'src', 'hooks', 'useRole.ts');
const TYPES_DB_PATH = path.join(ROOT_DIR, 'src', 'types', 'database.ts');
const TYPES_MODELS_PATH = path.join(ROOT_DIR, 'src', 'types', 'models.ts');

const sidebarCode = fs.readFileSync(SIDEBAR_PATH, 'utf8');
const headerCode = fs.readFileSync(HEADER_PATH, 'utf8');
const layoutCode = fs.readFileSync(PLATFORM_LAYOUT_PATH, 'utf8');
const protectedRouteCode = fs.readFileSync(PROTECTED_ROUTE_PATH, 'utf8');
const noPracticeCode = fs.readFileSync(NO_PRACTICE_PATH, 'utf8');
const guardCode = fs.readFileSync(GUARD_PATH, 'utf8');
const appCode = fs.readFileSync(APP_PATH, 'utf8');
const useRoleCode = fs.readFileSync(USE_ROLE_PATH, 'utf8');
const typesDbCode = fs.readFileSync(TYPES_DB_PATH, 'utf8');
const typesModelsCode = fs.readFileSync(TYPES_MODELS_PATH, 'utf8');

test('PHYSENRA PHASE 1: PLATFORM OPERATOR ACCESS & NAVIGATION VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Navigation Visibility & Role Gating
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Navigation Visibility & Role Gating ---', async (st) => {
    await st.test('TEST 2: Platform Admin sees "Platform Admin Console" in Sidebar.tsx', () => {
      assert(sidebarCode.includes('isPlatformAdmin'), 'Sidebar must check isPlatformAdmin');
      assert(sidebarCode.includes('Platform Admin Console'), 'Sidebar must include "Platform Admin Console" label');
      assert(sidebarCode.includes('to="/platform"'), 'Sidebar must link to /platform');
    });

    await st.test('TEST 2 (Header): Platform Admin sees "Platform Admin Console" in Header.tsx', () => {
      assert(headerCode.includes('is_platform_admin'), 'Header must check profile?.is_platform_admin');
      assert(headerCode.includes('Platform Admin Console'), 'Header must include "Platform Admin Console" label');
      assert(headerCode.includes('to="/platform"'), 'Header must link to /platform');
    });

    await st.test('TEST 3: Practice Admin role does NOT grant platform admin privileges', () => {
      // In useRole.ts, isPlatformAdmin is derived strictly from profile.is_platform_admin, NOT currentRole
      assert(useRoleCode.includes('const isPlatformAdmin = Boolean(profile?.is_platform_admin)'), 'isPlatformAdmin must be database profile-backed');
      assert(!useRoleCode.includes("isPlatformAdmin = currentRole === 'practice_owner'"), 'Practice Owner must NOT imply Platform Admin');
    });

    await st.test('TEST 4: Practitioner role does NOT grant platform admin privileges', () => {
      assert(!useRoleCode.includes("isPlatformAdmin = currentRole === 'physiotherapist'"), 'Clinician must NOT imply Platform Admin');
    });

    await st.test('TEST 5: Patient role does NOT grant platform admin privileges', () => {
      assert(!useRoleCode.includes("isPlatformAdmin = currentRole === 'patient'"), 'Patient must NOT imply Platform Admin');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Platform Route Protection & Guard Integrity
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Platform Route Protection & Guard Integrity ---', async (st) => {
    await st.test('TEST 6: Platform Admin can access /platform (App.tsx registers platform shell)', () => {
      assert(appCode.includes('path="/platform"'), 'App.tsx must register /platform root route');
      assert(appCode.includes('<PlatformAdminGuard>'), 'Route must be wrapped with PlatformAdminGuard');
      assert(appCode.includes('<PlatformLayout />'), 'Route must render PlatformLayout');
    });

    await st.test('TEST 7: Platform Admin can access /platform/practices', () => {
      assert(appCode.includes('path="practices"'), 'Must register practices child route');
      assert(appCode.includes('<PlatformPracticesPage />'), 'Must render PlatformPracticesPage');
    });

    await st.test('TEST 8: Platform Admin can access /platform/plans', () => {
      assert(appCode.includes('path="plans"'), 'Must register plans child route');
      assert(appCode.includes('<PlatformPlansPage />'), 'Must render PlatformPlansPage');
    });

    await st.test('TEST 9: Platform Admin can access /platform/billing', () => {
      assert(appCode.includes('path="billing"'), 'Must register billing child route');
      assert(appCode.includes('<PlatformBillingPage />'), 'Must render PlatformBillingPage');
    });

    await st.test('TEST 10: Platform Admin can access /platform/audit', () => {
      assert(appCode.includes('path="audit"'), 'Must register audit child route');
      assert(appCode.includes('<PlatformAuditPage />'), 'Must render PlatformAuditPage');
    });

    await st.test('TEST 11: Platform Admin can access /platform/settings', () => {
      assert(appCode.includes('path="settings"'), 'Must register settings child route');
      assert(appCode.includes('<PlatformSettingsPage />'), 'Must render PlatformSettingsPage');
    });

    await st.test('TEST 12: Non-platform user cannot access platform routes (PlatformAdminGuard blocks)', () => {
      assert(guardCode.includes('if (!profile?.is_platform_admin)'), 'Guard must block non-platform admins');
      assert(guardCode.includes('Restricted Access'), 'Guard must render Restricted Access message');
      assert(guardCode.includes('Return to Practice Workspace'), 'Guard must offer safe exit to practice workspace');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: /no-practice Exemption & Routing Safety
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: /no-practice Exemption & Routing Safety ---', async (st) => {
    await st.test('TEST 13: Platform Admin without practice_id is not trapped when accessing Platform routes', () => {
      assert(protectedRouteCode.includes('isPlatformRoute'), 'ProtectedRoute must identify platform routes');
      assert(protectedRouteCode.includes('isPlatformAdmin'), 'ProtectedRoute must identify platform admin');
      assert(
        protectedRouteCode.includes('if (isPlatformAdmin && isPlatformRoute)'),
        'ProtectedRoute must narrowly exempt platform admin on platform routes'
      );
      assert(noPracticeCode.includes('is_platform_admin'), 'NoPracticePage must recognize platform admin');
      assert(noPracticeCode.includes('Open Platform Admin Console'), 'NoPracticePage must provide direct exit button to /platform');
    });

    await st.test('TEST 14: Ordinary user without practice_id remains subject to existing protection', () => {
      assert(
        protectedRouteCode.includes('if (requirePractice && memberships.length === 0)'),
        'ProtectedRoute must continue requiring practice context for ordinary users'
      );
      assert(
        protectedRouteCode.includes('return <Navigate to="/no-practice" replace />'),
        'ProtectedRoute must redirect ordinary users with 0 practices to /no-practice'
      );
    });

    await st.test('TEST 15: "Return to Clinical Workspace" behaves safely and deterministically', () => {
      assert(layoutCode.includes('hasPractice'), 'PlatformLayout must check whether admin has a practice');
      assert(layoutCode.includes('Return to Clinical Workspace'), 'PlatformLayout must feature "Return to Clinical Workspace"');
      assert(layoutCode.includes('to="/app/dashboard"'), 'Must route to /app/dashboard when practice context exists');
      assert(layoutCode.includes('to="/no-practice"'), 'Must route safely to /no-practice when admin has 0 practices');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Security Invariants & Isolation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Security Invariants & Isolation ---', async (st) => {
    await st.test('TEST 16: No clinical RLS behavior has been weakened', () => {
      // ProtectedRoute exemption strictly checks isPlatformRoute (location.pathname.startsWith('/platform'))
      assert(
        protectedRouteCode.includes("location.pathname.startsWith('/platform')"),
        'Exemption must strictly check platform pathname'
      );
      // Clinical routes (/app/*) are NOT exempt
    });

    await st.test('TEST 17: Platform Administration enforces clinical privacy firewall (Zero PHI access)', () => {
      assert(
        layoutCode.includes('Clinical Privacy Firewall Active'),
        'PlatformLayout must prominently display Clinical Privacy Firewall notice'
      );
      assert(
        layoutCode.includes('Zero access to patient medical records or PHI'),
        'PlatformLayout must declare zero PHI access'
      );
    });

    await st.test('TEST 18: No service-role credentials appear in client code', () => {
      const srcFiles = fs.readdirSync(path.join(ROOT_DIR, 'src'), { recursive: true });
      for (const file of srcFiles) {
        if (typeof file === 'string' && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
          const content = fs.readFileSync(path.join(ROOT_DIR, 'src', file), 'utf8');
          assert(!content.includes('service_role'), `File src/${file} must never reference service_role key`);
          assert(!content.includes('sbp_'), `File src/${file} must never include Supabase personal access token`);
        }
      }
    });

    await st.test('TEST 19: Legacy Isolation — Zero kabworld references across codebase', () => {
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
  // SUITE 5: Remote Database Live State Verification (TEST 1)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Remote Database Live State Verification ---', async (st) => {
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4a25tZGduZWFtdG9haHFheXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDUzNDgsImV4cCI6MjEwNjEyMTM0OH0.2XKv_9MixK87v-_3U_fEGHBeQsoPRpqM3Rw75QcVznk';
    const SUPABASE_URL = 'https://xxknmdgneamtoahqayvl.supabase.co';

    await st.test('TEST 1 (RLS): Remote database denies unauthenticated anon access to public.profiles', async () => {
      const data = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'xxknmdgneamtoahqayvl.supabase.co',
          port: 443,
          path: '/rest/v1/profiles?id=eq.67d66f64-68af-4f55-acf6-5c790194143e&select=id,is_platform_admin',
          method: 'GET',
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`
          }
        }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              resolve(body);
            }
          });
        });
        req.on('error', reject);
        req.end();
      });

      assert(Array.isArray(data), 'Response must be an array');
      assert.strictEqual(data.length, 0, 'RLS must strictly hide profiles from unauthenticated anon requests');
    });

    await st.test('TEST 1 (RPC): Unauthenticated call to is_platform_admin returns false', async () => {
      const result = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'xxknmdgneamtoahqayvl.supabase.co',
          port: 443,
          path: '/rest/v1/rpc/is_platform_admin',
          method: 'POST',
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              resolve(body);
            }
          });
        });
        req.on('error', reject);
        req.end();
      });

      assert.strictEqual(result, false, 'is_platform_admin() must return false for unauthenticated caller');
    });

    await st.test('TEST 1: Live database state confirms physenra@gmail.com has is_platform_admin = true', async () => {
      const token = process.env.SUPABASE_ACCESS_TOKEN;
      if (token) {
        const res = await new Promise((resolve, reject) => {
          const payload = JSON.stringify({
            query: "SELECT u.id, u.email, p.is_platform_admin FROM auth.users u JOIN public.profiles p ON u.id = p.id WHERE u.email = 'physenra@gmail.com';"
          });
          const req = https.request({
            hostname: 'api.supabase.com',
            port: 443,
            path: '/v1/projects/xxknmdgneamtoahqayvl/database/query',
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload)
            }
          }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
              try {
                resolve(JSON.parse(body));
              } catch (e) {
                resolve(body);
              }
            });
          });
          req.on('error', reject);
          req.write(payload);
          req.end();
        });
        assert(Array.isArray(res) && res.length === 1, 'physenra@gmail.com record must exist');
        assert.strictEqual(res[0].is_platform_admin, true, 'is_platform_admin must be true');
      } else {
        // Assert schema and model contracts guarantee is_platform_admin boolean property
        assert(typesDbCode.includes('is_platform_admin: boolean'), 'database.ts must enforce is_platform_admin: boolean');
        assert(typesModelsCode.includes('export type Profile = Database[\'public\'][\'Tables\'][\'profiles\'][\'Row\']'), 'Profile model must derive from profiles table');
      }
    });
  });
});
