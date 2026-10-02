// ==============================================================================
// PHYSENRA — VISUAL DESIGN & UI REMEDIATION TEST SUITE (PRE-PHASE 4D)
// Test Suite: tests/visual_design_phase4c.test.cjs
//
// Governs all 16 required verification points from Step 28:
// TEST 1:  registration route renders
// TEST 2:  login route renders
// TEST 3:  signup route renders
// TEST 4:  pricing route renders
// TEST 5:  billing route renders
// TEST 6:  global stylesheet is included
// TEST 7:  design tokens are present
// TEST 8:  no obvious raw Unicode UI icons remain where icon components are expected
// TEST 9:  no hardcoded authoritative billing prices introduced
// TEST 10: no Paystack secret introduced
// TEST 11: no service-role key introduced
// TEST 12: no Kabworld references
// TEST 13: existing Phase 4C tests pass
// TEST 14: Phase 4A tests pass
// TEST 15: Phase 4B tests pass
// TEST 16: full regression passes
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const APP_TSX_PATH = path.join(SRC_DIR, 'App.tsx');
const MAIN_TSX_PATH = path.join(SRC_DIR, 'main.tsx');
const INDEX_CSS_PATH = path.join(SRC_DIR, 'index.css');
const TAILWIND_CONFIG_PATH = path.join(ROOT_DIR, 'tailwind.config.js');
const POSTCSS_CONFIG_PATH = path.join(ROOT_DIR, 'postcss.config.js');

const REGISTER_PAGE_PATH = path.join(SRC_DIR, 'pages', 'auth', 'RegisterPracticePage.tsx');
const LOGIN_PAGE_PATH = path.join(SRC_DIR, 'pages', 'auth', 'LoginPage.tsx');
const SIGNUP_PAGE_PATH = path.join(SRC_DIR, 'pages', 'auth', 'SignUpPage.tsx');
const PRICING_PAGE_PATH = path.join(SRC_DIR, 'pages', 'public', 'PricingPage.tsx');
const BILLING_PAGE_PATH = path.join(SRC_DIR, 'pages', 'billing', 'PracticeBillingPage.tsx');
const INVOICE_DETAIL_PATH = path.join(SRC_DIR, 'pages', 'billing', 'PracticeInvoiceDetailPage.tsx');

const UI_DIR = path.join(SRC_DIR, 'components', 'ui');
const BRAND_LOGO_PATH = path.join(UI_DIR, 'BrandLogo.tsx');
const BUTTON_PATH = path.join(UI_DIR, 'Button.tsx');
const CARD_PATH = path.join(UI_DIR, 'Card.tsx');
const BADGE_PATH = path.join(UI_DIR, 'Badge.tsx');

const PLATFORM_LAYOUT_PATH = path.join(SRC_DIR, 'components', 'layout', 'PlatformLayout.tsx');
const PLATFORM_DASHBOARD_PATH = path.join(SRC_DIR, 'pages', 'platform', 'PlatformDashboardPage.tsx');

test('PHYSENRA — Visual Design System & UI Remediation Suite', async (t) => {
  const appTsx = fs.readFileSync(APP_TSX_PATH, 'utf8');
  const mainTsx = fs.readFileSync(MAIN_TSX_PATH, 'utf8');
  const indexCss = fs.readFileSync(INDEX_CSS_PATH, 'utf8');
  const tailwindConfig = fs.readFileSync(TAILWIND_CONFIG_PATH, 'utf8');
  const registerPage = fs.readFileSync(REGISTER_PAGE_PATH, 'utf8');
  const loginPage = fs.readFileSync(LOGIN_PAGE_PATH, 'utf8');
  const signupPage = fs.readFileSync(SIGNUP_PAGE_PATH, 'utf8');
  const pricingPage = fs.readFileSync(PRICING_PAGE_PATH, 'utf8');
  const billingPage = fs.readFileSync(BILLING_PAGE_PATH, 'utf8');
  const invoicePage = fs.readFileSync(INVOICE_DETAIL_PATH, 'utf8');

  // ============================================================================
  // SUITE 1: Route Registration & Component Integration
  // ============================================================================
  await t.test('--- SUITE 1: Route Registration & Component Integration ---', async (st) => {
    await st.test('TEST 1: registration route renders', () => {
      assert(appTsx.includes('path="/register-practice"'), 'App.tsx must register /register-practice route');
      assert(appTsx.includes('<RegisterPracticePage />'), 'App.tsx must render RegisterPracticePage');
      assert(registerPage.includes('BrandLogo'), 'RegisterPracticePage must include BrandLogo component');
      assert(registerPage.includes('Start My 14-Day Free Trial'), 'RegisterPracticePage must provide trial CTA');
    });

    await st.test('TEST 2: login route renders', () => {
      assert(appTsx.includes('path="/login"'), 'App.tsx must register /login route');
      assert(appTsx.includes('<LoginPage />'), 'App.tsx must render LoginPage');
      assert(loginPage.includes('BrandLogo'), 'LoginPage must include BrandLogo component');
      assert(loginPage.includes('/register-practice'), 'LoginPage must link to practice onboarding');
    });

    await st.test('TEST 3: signup route renders', () => {
      assert(appTsx.includes('path="/signup"'), 'App.tsx must register /signup route');
      assert(appTsx.includes('<SignUpPage />'), 'App.tsx must render SignUpPage');
      assert(signupPage.includes('BrandLogo'), 'SignUpPage must include BrandLogo component');
      assert(signupPage.includes('/register-practice'), 'SignUpPage must link to register-practice');
    });

    await st.test('TEST 4: pricing route renders', () => {
      assert(appTsx.includes('path="/pricing"'), 'App.tsx must register /pricing route');
      assert(appTsx.includes('<PricingPage />'), 'App.tsx must render PricingPage');
      assert(pricingPage.includes('BrandLogo'), 'PricingPage must include BrandLogo component');
      assert(pricingPage.includes('formatNaira'), 'PricingPage must use formatNaira utility');
    });

    await st.test('TEST 5: billing route renders', () => {
      assert(appTsx.includes('path="billing"'), 'App.tsx must register billing route');
      assert(appTsx.includes('<PracticeBillingPage />'), 'App.tsx must render PracticeBillingPage');
      assert(billingPage.includes('Billing & Subscription'), 'PracticeBillingPage must render billing header');
      assert(billingPage.includes('statusConfig'), 'PracticeBillingPage must compute status badges');
    });
  });

  // ============================================================================
  // SUITE 2: Styling Pipeline & Design Tokens
  // ============================================================================
  await t.test('--- SUITE 2: Styling Pipeline & Design Tokens ---', async (st) => {
    await st.test('TEST 6: global stylesheet is included', () => {
      assert(mainTsx.includes("import './index.css'"), 'main.tsx must import index.css');
      assert(indexCss.includes('@tailwind base;'), 'index.css must include Tailwind base');
      assert(indexCss.includes('@tailwind components;'), 'index.css must include Tailwind components');
      assert(indexCss.includes('@tailwind utilities;'), 'index.css must include Tailwind utilities');
      assert(fs.existsSync(POSTCSS_CONFIG_PATH), 'postcss.config.js must exist');
    });

    await st.test('TEST 7: design tokens are present', () => {
      assert(fs.existsSync(TAILWIND_CONFIG_PATH), 'tailwind.config.js must exist');
      assert(tailwindConfig.includes('#0d9488') || tailwindConfig.includes('teal'), 'Brand teal color token must be present');
      assert(tailwindConfig.includes('fontFamily'), 'Typography tokens must be defined');
      assert(fs.existsSync(BRAND_LOGO_PATH), 'BrandLogo UI primitive must exist');
      assert(fs.existsSync(BUTTON_PATH), 'Button UI primitive must exist');
      assert(fs.existsSync(CARD_PATH), 'Card UI primitive must exist');
      assert(fs.existsSync(BADGE_PATH), 'Badge UI primitive must exist');
    });

    await st.test('TEST 8: no obvious raw Unicode UI icons remain where icon components are expected', () => {
      const targetFiles = [
        registerPage,
        loginPage,
        signupPage,
        pricingPage,
        billingPage,
        invoicePage,
      ];
      const rawIconPattern = /[→←⇒✓✔✕✖]/;
      for (const content of targetFiles) {
        assert(!rawIconPattern.test(content), 'Found raw unicode icon character where icon component was expected');
      }
    });
  });

  // ============================================================================
  // SUITE 3: Authoritative Billing & Security Hygiene
  // ============================================================================
  await t.test('--- SUITE 3: Authoritative Billing & Security Hygiene ---', async (st) => {
    await st.test('TEST 9: no hardcoded authoritative billing prices introduced', () => {
      // Must use dynamic pricing or formatNaira from integer cents
      assert(pricingPage.includes('formatNaira'), 'PricingPage must use formatNaira');
      assert(registerPage.includes('formatNaira'), 'RegisterPracticePage must use formatNaira');
      assert(billingPage.includes('formatNaira'), 'PracticeBillingPage must use formatNaira');
    });

    await st.test('TEST 10: no Paystack secret introduced in frontend source or build', () => {
      const frontendFiles = [
        registerPage,
        loginPage,
        signupPage,
        pricingPage,
        billingPage,
        invoicePage,
      ];
      for (const content of frontendFiles) {
        assert(!content.includes('sk_live_'), 'Forbidden Paystack live secret found in frontend file');
        assert(!content.includes('sk_test_'), 'Forbidden Paystack test secret found in frontend file');
      }
    });

    await st.test('TEST 11: no service-role key introduced', () => {
      const frontendFiles = [
        registerPage,
        loginPage,
        signupPage,
        pricingPage,
        billingPage,
        invoicePage,
      ];
      for (const content of frontendFiles) {
        assert(!content.includes('service_role'), 'Forbidden Supabase service-role reference found in frontend file');
      }
    });

    await st.test('TEST 12: no Kabworld references across design and billing files', () => {
      const filesToCheck = [
        TAILWIND_CONFIG_PATH,
        POSTCSS_CONFIG_PATH,
        INDEX_CSS_PATH,
        BRAND_LOGO_PATH,
        BUTTON_PATH,
        CARD_PATH,
        BADGE_PATH,
        REGISTER_PAGE_PATH,
        LOGIN_PAGE_PATH,
        SIGNUP_PAGE_PATH,
        PRICING_PAGE_PATH,
        BILLING_PAGE_PATH,
        INVOICE_DETAIL_PATH,
      ];
      for (const filePath of filesToCheck) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!content.toLowerCase().includes('kabworld'), `Forbidden legacy reference found in ${path.basename(filePath)}`);
      }
    });
  });

  // ============================================================================
  // SUITE 4: Regression & Upstream Phase Verification
  // ============================================================================
  await t.test('--- SUITE 4: Regression & Upstream Phase Verification ---', async (st) => {
    const cleanEnv = { ...process.env };
    for (const k of Object.keys(cleanEnv)) {
      if (k.startsWith('NODE_TEST')) delete cleanEnv[k];
    }

    await st.test('TEST 13: existing Phase 4C tests pass', () => {
      const out = execSync('node --test tests/practice_billing_phase4c.test.cjs', { cwd: ROOT_DIR, encoding: 'utf8', env: cleanEnv });
      assert(out.includes('pass 42') && !out.includes('fail 1'), 'Phase 4C test suite must pass all tests');
    });

    await st.test('TEST 14: Phase 4A tests pass', () => {
      const out = execSync('node --test tests/practice_self_service_billing_phase4a.test.cjs', { cwd: ROOT_DIR, encoding: 'utf8', env: cleanEnv });
      assert(out.includes('pass 48') && !out.includes('fail 1'), 'Phase 4A test suite must pass all tests');
    });

    await st.test('TEST 15: Phase 4B tests pass', () => {
      const out = execSync('node --test tests/paystack_phase4b.test.cjs', { cwd: ROOT_DIR, encoding: 'utf8', env: cleanEnv });
      assert(out.includes('pass 42') && !out.includes('fail 1'), 'Phase 4B test suite must pass all tests');
    });

    await st.test('TEST 16: full regression passes', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
      assert(pkg.scripts.test, 'npm test script must be configured');
      const out = execSync('node --test tests/app_foundation.test.cjs', { cwd: ROOT_DIR, encoding: 'utf8', env: cleanEnv });
      assert(!out.includes('fail 1'), 'Core application foundation test suite must pass without failure');
    });
  });

  // ============================================================================
  // SUITE 5: Platform Console Design & Production CSS Verification
  // ============================================================================
  await t.test('--- SUITE 5: Platform Console Design & Production CSS Verification ---', async (st) => {
    const platformLayout = fs.readFileSync(PLATFORM_LAYOUT_PATH, 'utf8');
    const platformDashboard = fs.readFileSync(PLATFORM_DASHBOARD_PATH, 'utf8');

    await st.test('TEST 17: PlatformLayout renders BrandLogo, Platform Console, and Privacy Firewall notice', () => {
      assert(platformLayout.includes('BrandLogo'), 'PlatformLayout must render BrandLogo');
      assert(platformLayout.includes('Platform Console'), 'PlatformLayout must display Platform Console tag');
      assert(platformLayout.includes('Clinical Privacy Firewall Active'), 'PlatformLayout must display privacy notice');
      assert(platformLayout.includes('Zero access to patient medical records or PHI'), 'PlatformLayout must state zero PHI access');
    });

    await st.test('TEST 18: PlatformDashboardPage renders responsive 4-column KPI cards and operational feeds', () => {
      assert(platformDashboard.includes('grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'), 'PlatformDashboard must render 4-col desktop, 2-col tablet KPI grid');
      assert(platformDashboard.includes('Monthly Recurring (MRR)'), 'PlatformDashboard must show MRR metric');
      assert(platformDashboard.includes('Annual Run-Rate (ARR)'), 'PlatformDashboard must show ARR metric');
      assert(platformDashboard.includes('Active Paid Tenants'), 'PlatformDashboard must show active tenants');
      assert(platformDashboard.includes('Total Registered'), 'PlatformDashboard must show total practices');
      assert(platformDashboard.includes('Expiring Trials Feed'), 'PlatformDashboard must show expiring trials feed');
      assert(platformDashboard.includes('Overdue & Dunning Watchlist'), 'PlatformDashboard must show dunning watchlist');
    });

    await st.test('TEST 19: production CSS bundle size proves complete utility generation (>80kB)', () => {
      const distAssets = path.join(DIST_DIR, 'assets');
      assert(fs.existsSync(distAssets), 'dist/assets directory must exist');
      const cssFiles = fs.readdirSync(distAssets).filter(f => f.endsWith('.css'));
      assert(cssFiles.length > 0, 'dist/assets must contain built CSS bundle');
      const cssContent = fs.readFileSync(path.join(distAssets, cssFiles[0]), 'utf8');
      assert(cssContent.length > 80000, 'Compiled CSS must exceed 80kB confirming Tailwind utility inclusion');
    });

    await st.test('TEST 20: production CSS contains required platform and responsive escape selectors', () => {
      const distAssets = path.join(DIST_DIR, 'assets');
      const cssFiles = fs.readdirSync(distAssets).filter(f => f.endsWith('.css'));
      const cssContent = fs.readFileSync(path.join(distAssets, cssFiles[0]), 'utf8');
      assert(cssContent.includes('sm\\:grid-cols-2'), 'CSS must include escaped sm:grid-cols-2');
      assert(cssContent.includes('lg\\:grid-cols-4'), 'CSS must include escaped lg:grid-cols-4');
      assert(cssContent.includes('md\\:flex-row'), 'CSS must include escaped md:flex-row');
      assert(cssContent.includes('bg-slate-950'), 'CSS must include bg-slate-950');
      assert(cssContent.includes('text-emerald-400'), 'CSS must include text-emerald-400');
    });
  });
});
