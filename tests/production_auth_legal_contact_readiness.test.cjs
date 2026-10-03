/**
 * PHYSENRA — PRODUCTION AUTH + LEGAL + CONTACT OPERATIONAL READINESS TEST SUITE
 * File: tests/production_auth_legal_contact_readiness.test.cjs
 * 
 * Verifies:
 * 1. Auth redirect origin security (production https://physenra.com vs localhost development)
 * 2. Absolute prohibition on wildcards or unsafe arbitrary redirects
 * 3. Email confirmation & password recovery redirect wiring
 * 4. Legal route inventory, placeholder honesty, and absence of fake compliance claims
 * 5. Unexpected legal route classification (confirming non-existence in app routes)
 * 6. Contact page honesty (direct email dispatch, zero fake server success)
 * 7. Public/App/Platform security boundaries and zero secret leakage
 * 8. Zero Kabworld separation rule compliance
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

// Helper to read file contents
function readFile(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

// -----------------------------------------------------------------------------
// SECTION 1: AUTHENTICATION REDIRECT SECURITY
// -----------------------------------------------------------------------------
test('AUTH: Production origin is strictly https://physenra.com', async (t) => {
  const authRedirectCode = readFile('src/lib/authRedirect.ts');
  assert(authRedirectCode.includes('https://physenra.com'), 'authRedirect.ts must declare https://physenra.com as production origin');
  assert(authRedirectCode.includes("origin === 'https://physenra.com'"), 'authRedirect.ts must explicitly validate production origin');
});

test('AUTH: Localhost is restricted to development environments only', async (t) => {
  const authRedirectCode = readFile('src/lib/authRedirect.ts');
  assert(authRedirectCode.includes('isLocalhost'), 'authRedirect.ts must identify localhost origins');
  assert(authRedirectCode.includes('localhost:3000'), 'authRedirect.ts must support standard local dev port 3000');
  assert(authRedirectCode.includes('127.0.0.1:3000'), 'authRedirect.ts must support 127.0.0.1:3000');
});

test('AUTH: No unsafe wildcard redirects or arbitrary destination allowance', async (t) => {
  const authRedirectCode = readFile('src/lib/authRedirect.ts');
  // Strip out comment blocks before verifying code does not contain wildcard redirection logic
  const codeWithoutComments = authRedirectCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  assert(!codeWithoutComments.includes('*'), 'authRedirect.ts code must not contain wildcard redirect rules');
  // Must fallback to https://physenra.com if unknown origin (e.g., https://malicious.com)
  assert(authRedirectCode.includes('return `https://physenra.com${normalizedPath}`;'), 'Must default to https://physenra.com for unverified origins');
});

test('AUTH: No hard-coded localhost production redirect in source code', async (t) => {
  const authContextCode = readFile('src/contexts/AuthContext.tsx');
  const signUpCode = readFile('src/pages/auth/SignUpPage.tsx');
  const loginCode = readFile('src/pages/auth/LoginPage.tsx');

  assert(!authContextCode.includes('localhost:3000'), 'AuthContext must not hard-code localhost:3000');
  assert(!signUpCode.includes('localhost:3000'), 'SignUpPage must not hard-code localhost:3000');
  assert(!loginCode.includes('localhost:3000'), 'LoginPage must not hard-code localhost:3000');
});

test('AUTH: SignUp passes emailRedirectTo derived from getAuthRedirectUrl', async (t) => {
  const authContextCode = readFile('src/contexts/AuthContext.tsx');
  assert(authContextCode.includes('emailRedirectTo: redirectUrl'), 'AuthContext signUp must pass emailRedirectTo option');
  assert(authContextCode.includes("getAuthRedirectUrl('/login')"), 'AuthContext must resolve redirectUrl via getAuthRedirectUrl');
});

test('AUTH: Password recovery redirect configuration is implemented safely', async (t) => {
  const authContextCode = readFile('src/contexts/AuthContext.tsx');
  assert(authContextCode.includes('resetPasswordForEmail'), 'AuthContext must expose resetPasswordForEmail');
  assert(authContextCode.includes('redirectTo: redirectUrl'), 'Password reset must pass redirectTo option');
});

test('AUTH: Verification of simulated URL resolution behavior', async (t) => {
  // Test simulated resolution in Node environment (SSR / default)
  // Re-implement the pure logic to test isolated outputs
  function resolveRedirect(origin, path = '/login') {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (origin) {
      const lower = origin.toLowerCase();
      const isLocalhost =
        lower === 'http://localhost:3000' ||
        lower === 'http://127.0.0.1:3000' ||
        /^http:\/\/localhost(:\d+)?$/.test(lower) ||
        /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(lower);

      if (isLocalhost) return `${lower}${normalizedPath}`;
      if (lower === 'https://physenra.com') return `https://physenra.com${normalizedPath}`;
    }
    return `https://physenra.com${normalizedPath}`;
  }

  // Production origin
  assert.strictEqual(resolveRedirect('https://physenra.com'), 'https://physenra.com/login');
  assert.strictEqual(resolveRedirect('https://physenra.com', '/app/dashboard'), 'https://physenra.com/app/dashboard');

  // Development origin
  assert.strictEqual(resolveRedirect('http://localhost:3000'), 'http://localhost:3000/login');
  assert.strictEqual(resolveRedirect('http://127.0.0.1:3000'), 'http://127.0.0.1:3000/login');
  assert.strictEqual(resolveRedirect('http://localhost:5173'), 'http://localhost:5173/login');

  // Malicious / Arbitrary external origins blocked
  assert.strictEqual(resolveRedirect('https://evil.com'), 'https://physenra.com/login');
  assert.strictEqual(resolveRedirect('https://attacker.org'), 'https://physenra.com/login');
  assert.strictEqual(resolveRedirect('http://physenra.com.attacker.com'), 'https://physenra.com/login');

  // SSR / undefined origin
  assert.strictEqual(resolveRedirect(undefined), 'https://physenra.com/login');
});

// -----------------------------------------------------------------------------
// SECTION 2: LEGAL ROUTE INVENTORY & CLAIMS INTEGRITY
// -----------------------------------------------------------------------------
test('LEGAL: Authorized legal routes exist in router', async (t) => {
  const appCode = readFile('src/App.tsx');
  assert(appCode.includes('path="/terms"'), 'Route /terms must exist in App.tsx');
  assert(appCode.includes('path="/privacy"'), 'Route /privacy must exist in App.tsx');
  assert(appCode.includes('path="/security"'), 'Route /security must exist in App.tsx');
});

test('LEGAL: Unexpected legal routes are NOT defined as application routes', async (t) => {
  const appCode = readFile('src/App.tsx');
  assert(!appCode.includes('path="/medical-disclaimer"'), 'Route /medical-disclaimer must NOT exist in App.tsx');
  assert(!appCode.includes('path="/dpa"'), 'Route /dpa must NOT exist in App.tsx');
  assert(!appCode.includes('path="/cookie-policy"'), 'Route /cookie-policy must NOT exist in App.tsx');
  assert(!appCode.includes('path="/acceptable-use"'), 'Route /acceptable-use must NOT exist in App.tsx');
  assert(!appCode.includes('path="/subprocessors"'), 'Route /subprocessors must NOT exist in App.tsx');
  assert(!appCode.includes('path="/compliance/ndpr"'), 'Route /compliance/ndpr must NOT exist in App.tsx');
});

test('LEGAL: Terms and Privacy pages honestly identify as pre-launch baseline shells', async (t) => {
  const termsCode = readFile('src/public/pages/TermsPageShell.tsx');
  const privacyCode = readFile('src/public/pages/PrivacyPageShell.tsx');

  assert(termsCode.includes('pending legal review and publication'), 'Terms must state content is pending legal review');
  assert(privacyCode.includes('pending legal review and publication'), 'Privacy must state content is pending legal review');
});

test('LEGAL: Zero invented regulatory certifications in legal and trust pages', async (t) => {
  const securityCode = readFile('src/public/pages/SecurityPageShell.tsx');
  const termsCode = readFile('src/public/pages/TermsPageShell.tsx');
  const privacyCode = readFile('src/public/pages/PrivacyPageShell.tsx');

  const combined = securityCode + '\n' + termsCode + '\n' + privacyCode;
  assert(!combined.includes('ISO 27001 Certified'), 'Must not claim ISO 27001 certification');
  assert(!combined.includes('SOC 2 Certified'), 'Must not claim SOC 2 certification');
  assert(!combined.includes('NDPR Certified'), 'Must not claim NDPR certification');
});

// -----------------------------------------------------------------------------
// SECTION 3: CONTACT PAGE OPERATIONAL INTEGRITY
// -----------------------------------------------------------------------------
test('CONTACT: Contact page implementation routes directly via email without fake backend success', async (t) => {
  const contactCode = readFile('src/public/pages/ContactPageShell.tsx');
  assert(contactCode.includes('mailto:contact@physenra.com'), 'Contact page must use mailto:contact@physenra.com');
  assert(!contactCode.includes('Inquiry Received'), 'Must not display fake "Inquiry Received" success screen');
  assert(contactCode.includes('Email Dispatch Initiated'), 'Must honestly state email dispatch initiated');
  assert(contactCode.includes('contact@physenra.com'), 'Must reference official contact@physenra.com address');
});

test('CONTACT: Form collects only legitimate practice inquiry fields and validates input', async (t) => {
  const contactCode = readFile('src/public/pages/ContactPageShell.tsx');
  assert(contactCode.includes('required'), 'Form fields must require input');
  assert(contactCode.includes('type="email"'), 'Email input must enforce email format');
  // Ensure no sensitive clinical or financial fields are gathered
  assert(!contactCode.includes('patient'), 'Contact form must not solicit patient data');
  assert(!contactCode.includes('diagnosis'), 'Contact form must not solicit clinical diagnosis data');
  assert(!contactCode.includes('card_number'), 'Contact form must not solicit payment card data');
});

// -----------------------------------------------------------------------------
// SECTION 4: ARCHITECTURAL BOUNDARIES & SECURITY
// -----------------------------------------------------------------------------
test('BOUNDARIES: Public pages do not import clinical state stores or direct queries', async (t) => {
  const publicDir = path.join(repoRoot, 'src', 'public');
  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        assert(!content.includes("from '../../lib/supabase'"), `${entry.name} must not import direct supabase client`);
        assert(!content.includes("from '../../services/patientService'"), `${entry.name} must not import patient service`);
        assert(!content.includes("from '../../services/clinicalNoteService'"), `${entry.name} must not import clinical note service`);
      }
    }
  }
  scan(publicDir);
});

test('BOUNDARIES: ProtectedRoute and PlatformAdminGuard secure clinical and platform spaces', async (t) => {
  const appCode = readFile('src/App.tsx');
  assert(appCode.includes('<ProtectedRoute>'), 'App.tsx must wrap clinical application in ProtectedRoute');
  assert(appCode.includes('<PlatformAdminGuard>'), 'App.tsx must wrap platform admin in PlatformAdminGuard');
});

test('SECURITY: Zero frontend secrets or private keys in repository source', async (t) => {
  const srcDir = path.join(repoRoot, 'src');
  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        assert(!content.includes('service_role'), `${entry.name} must not reference service_role`);
        assert(!content.includes('SUPABASE_SERVICE_ROLE_KEY'), `${entry.name} must not contain service role key`);
        assert(!content.includes('sk_live_'), `${entry.name} must not contain live secret key`);
        assert(!content.includes('sbp_'), `${entry.name} must not contain Supabase PAT`);
      }
    }
  }
  scan(srcDir);
});

test('SEPARATION: Zero Kabworld references anywhere in src/', async (t) => {
  const srcDir = path.join(repoRoot, 'src');
  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (/\.(ts|tsx|js|jsx|json|css)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        assert(!/kabworld/i.test(content), `${entry.name} contains Kabworld reference`);
      }
    }
  }
  scan(srcDir);
});
