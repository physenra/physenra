// ==============================================================================
// PHYSENRA — PRE-DISTRIBUTION & PRODUCTION LAUNCH READINESS AUDIT SUITE
// File: tests/pre_distribution_launch_readiness.test.cjs
//
// Governs:
// 1. Category A: Public Route Coverage
// 2. Category B: Onboarding Route Coverage
// 3. Category C: Authentication Flow Coverage
// 4. Category D: Billing Route Coverage
// 5. Category E: Invoice Route Coverage
// 6. Category F: Role Visibility & Navigation
// 7. Category G: Subscription Lifecycle UI Contracts
// 8. Category H: Production Configuration
// 9. Category I: Secret Scanning
// 10. Category J: Kabworld Separation
// 11. Category K: PHI Leakage Prevention
// 12. Category L: Production URL Integrity
// 13. Category M: Responsive UI Contracts
// 14. Category N: Error-State Contracts
// 15. Category O: Launch Configuration & Operational Readiness
// 16. Category P: Regression Compatibility
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT_DIR = path.join(__dirname, '..');

// Source paths
const APP_TSX_PATH = path.join(ROOT_DIR, 'src', 'App.tsx');
const PRICING_PAGE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'public', 'PricingPage.tsx');
const LOGIN_PAGE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'auth', 'LoginPage.tsx');
const SIGNUP_PAGE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'auth', 'SignUpPage.tsx');
const REGISTER_PRACTICE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'auth', 'RegisterPracticePage.tsx');
const BILLING_PAGE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'billing', 'PracticeBillingPage.tsx');
const INVOICE_LIST_PATH = path.join(ROOT_DIR, 'src', 'pages', 'billing', 'PracticeInvoiceListPage.tsx');
const INVOICE_DETAIL_PATH = path.join(ROOT_DIR, 'src', 'pages', 'billing', 'PracticeInvoiceDetailPage.tsx');
const BANNER_COMPONENT_PATH = path.join(ROOT_DIR, 'src', 'components', 'billing', 'SubscriptionStatusBanner.tsx');
const APP_SHELL_PATH = path.join(ROOT_DIR, 'src', 'components', 'layout', 'AppShell.tsx');
const SIDEBAR_PATH = path.join(ROOT_DIR, 'src', 'components', 'layout', 'Sidebar.tsx');
const HEADER_PATH = path.join(ROOT_DIR, 'src', 'components', 'layout', 'Header.tsx');
const PLATFORM_LAYOUT_PATH = path.join(ROOT_DIR, 'src', 'components', 'layout', 'PlatformLayout.tsx');
const PROTECTED_ROUTE_PATH = path.join(ROOT_DIR, 'src', 'components', 'auth', 'ProtectedRoute.tsx');
const PLATFORM_GUARD_PATH = path.join(ROOT_DIR, 'src', 'components', 'auth', 'PlatformAdminGuard.tsx');
const NO_PRACTICE_PATH = path.join(ROOT_DIR, 'src', 'pages', 'error', 'NoPracticePage.tsx');
const NOT_FOUND_PATH = path.join(ROOT_DIR, 'src', 'pages', 'error', 'NotFoundPage.tsx');
const NETLIFY_TOML_PATH = path.join(ROOT_DIR, 'netlify.toml');

test('PHYSENRA — Pre-Distribution & Production Launch Readiness Audit', async (t) => {
  // Load source files
  const appTsx = fs.readFileSync(APP_TSX_PATH, 'utf8');
  const pricingPage = fs.readFileSync(PRICING_PAGE_PATH, 'utf8');
  const loginPage = fs.readFileSync(LOGIN_PAGE_PATH, 'utf8');
  const signUpPage = fs.readFileSync(SIGNUP_PAGE_PATH, 'utf8');
  const registerPractice = fs.readFileSync(REGISTER_PRACTICE_PATH, 'utf8');
  const billingPage = fs.readFileSync(BILLING_PAGE_PATH, 'utf8');
  const invoiceList = fs.readFileSync(INVOICE_LIST_PATH, 'utf8');
  const invoiceDetail = fs.readFileSync(INVOICE_DETAIL_PATH, 'utf8');
  const banner = fs.readFileSync(BANNER_COMPONENT_PATH, 'utf8');
  const appShell = fs.readFileSync(APP_SHELL_PATH, 'utf8');
  const sidebar = fs.readFileSync(SIDEBAR_PATH, 'utf8');
  const header = fs.readFileSync(HEADER_PATH, 'utf8');
  const platformLayout = fs.readFileSync(PLATFORM_LAYOUT_PATH, 'utf8');
  const protectedRoute = fs.readFileSync(PROTECTED_ROUTE_PATH, 'utf8');
  const platformGuard = fs.readFileSync(PLATFORM_GUARD_PATH, 'utf8');
  const noPractice = fs.readFileSync(NO_PRACTICE_PATH, 'utf8');
  const notFound = fs.readFileSync(NOT_FOUND_PATH, 'utf8');
  const netlifyToml = fs.readFileSync(NETLIFY_TOML_PATH, 'utf8');

  // ============================================================================
  // CATEGORY A: Public Route Coverage
  // ============================================================================
  await t.test('--- CATEGORY A: Public Route Coverage ---', async (st) => {
    await st.test('A1: Public landing, pricing, login, and registration routes are registered', () => {
      assert(appTsx.includes('path="/login" element={<LoginPage />}'), 'Registers /login');
      assert(appTsx.includes('path="/signup" element={<SignUpPage />}'), 'Registers /signup');
      assert(appTsx.includes('path="/pricing" element={<PricingPage />}'), 'Registers /pricing');
      assert(appTsx.includes('path="/register-practice" element={<RegisterPracticePage />}'), 'Registers /register-practice');
    });

    await st.test('A2: Root URL redirects cleanly to application dashboard', () => {
      assert(appTsx.includes('path="/" element={<Navigate to="/app/dashboard" replace />}'), 'Redirects / to /app/dashboard');
    });

    await st.test('A3: Public routes mount outside ProtectedRoute barrier', () => {
      // Find where public routes and ProtectedRoute are in App.tsx
      const publicIndex = appTsx.indexOf('{/* Public Routes */}');
      const protectedIndex = appTsx.indexOf('<ProtectedRoute>');
      assert(publicIndex !== -1 && protectedIndex !== -1, 'Comments and guards present');
      assert(publicIndex < protectedIndex, 'Public routes are declared before ProtectedRoute barrier');
    });
  });

  // ============================================================================
  // CATEGORY B: Onboarding Route Coverage
  // ============================================================================
  await t.test('--- CATEGORY B: Onboarding Route Coverage ---', async (st) => {
    await st.test('B1: RegisterPracticePage provides self-service onboarding with account creation', () => {
      assert(registerPractice.includes('firstName'), 'Includes firstName field');
      assert(registerPractice.includes('email'), 'Includes email field');
      assert(registerPractice.includes('password'), 'Includes password field');
      assert(registerPractice.includes('confirmPassword'), 'Includes confirmPassword field');
      assert(registerPractice.includes('signUp('), 'Integrates with signUp for unauthenticated visitors');
    });

    await st.test('B2: Practice name and URL slug validation are enforced', () => {
      assert(registerPractice.includes('cleanSlug.length < 3 || cleanSlug.length > 48'), 'Validates slug length (3-48 chars)');
      assert(registerPractice.includes('/^[a-z0-9]+(?:-[a-z0-9]+)*$/'), 'Validates alphanumeric and hyphenated slug format');
    });

    await st.test('B3: Authoritative trial creation executes via server-side RPC', () => {
      assert(registerPractice.includes('saasSubscriptionService.registerPracticeAndSubscribe'), 'Invokes atomic onboarding service');
      assert(registerPractice.includes('setActivePracticeHeader('), 'Injects active practice header upon success');
      assert(registerPractice.includes('/app/dashboard?registered='), 'Redirects to dashboard after registration');
    });

    await st.test('B4: Plan selection accepts query parameters from marketing/pricing page', () => {
      assert(registerPractice.includes('searchParams.get(\'plan\')'), 'Reads plan parameter from query string');
      assert(registerPractice.includes('searchParams.get(\'interval\')'), 'Reads interval parameter from query string');
    });
  });

  // ============================================================================
  // CATEGORY C: Authentication Flow Coverage
  // ============================================================================
  await t.test('--- CATEGORY C: Authentication Flow Coverage ---', async (st) => {
    await st.test('C1: ProtectedRoute intercepts unauthenticated requests and redirects to /login', () => {
      assert(protectedRoute.includes('if (!user)'), 'Checks user authentication');
      assert(protectedRoute.includes('<Navigate to="/login"'), 'Redirects unauthenticated users to /login');
    });

    await st.test('C2: ProtectedRoute redirects users with zero practice memberships to /no-practice', () => {
      assert(protectedRoute.includes('if (requirePractice && memberships.length === 0)'), 'Checks practice membership count');
      assert(protectedRoute.includes('<Navigate to="/no-practice" replace />'), 'Redirects to /no-practice');
    });

    await st.test('C3: SignUpPage enforces password minimum length and confirmation match', () => {
      assert(signUpPage.includes('password.length < 8'), 'Enforces password >= 8 characters');
      assert(signUpPage.includes('password !== confirmPassword'), 'Enforces password confirmation equality');
    });

    await st.test('C4: LoginPage displays user-facing authentication errors safely', () => {
      assert(loginPage.includes('signIn('), 'Invokes signIn from auth hook');
      assert(loginPage.includes('setError('), 'Captures errors into state');
      assert(loginPage.includes('role="alert"'), 'Renders accessible error alert');
    });
  });

  // ============================================================================
  // CATEGORY D: Billing Route Coverage
  // ============================================================================
  await t.test('--- CATEGORY D: Billing Route Coverage ---', async (st) => {
    await st.test('D1: /app/billing is registered under protected shell', () => {
      assert(appTsx.includes('path="billing" element={<PracticeBillingPage />}'), 'Registers /app/billing');
      assert(appTsx.includes('path="billing/plans" element={<PracticeBillingPage defaultTab="plans" />}'), 'Registers /app/billing/plans');
    });

    await st.test('D2: PracticeBillingPage displays authoritative plan catalog and current subscription', () => {
      assert(billingPage.includes('saasSubscriptionService.getPublicPlans()'), 'Fetches authoritative plans');
      assert(billingPage.includes('saasSubscriptionService.getPracticeSubscription('), 'Fetches active subscription');
      assert(billingPage.includes('subscription?.plan?.name'), 'Displays active plan name');
      assert(billingPage.includes('subscription.current_period_end'), 'Displays subscription renewal date');
    });

    await st.test('D3: Commercial mutation actions are restricted to practice_owner', () => {
      assert(billingPage.includes('const isReadOnly = !isOwner;'), 'Enforces read-only mode for non-owners');
      assert(billingPage.includes('Read-Only Financial Access'), 'Displays read-only badge for staff');
    });
  });

  // ============================================================================
  // CATEGORY E: Invoice Route Coverage
  // ============================================================================
  await t.test('--- CATEGORY E: Invoice Route Coverage ---', async (st) => {
    await st.test('E1: /app/billing/invoices routes are registered', () => {
      assert(appTsx.includes('path="billing/invoices" element={<PracticeInvoiceListPage />}'), 'Registers invoice list');
      assert(appTsx.includes('path="billing/invoices/:invoiceId" element={<PracticeInvoiceDetailPage />}'), 'Registers invoice detail');
    });

    await st.test('E2: Invoice detail page includes print functionality and formal documents', () => {
      assert(invoiceDetail.includes('handlePrintInvoice'), 'Provides print trigger');
      assert(invoiceDetail.includes('Commercial Invoice'), 'Renders formal invoice header');
      assert(invoiceDetail.includes('Official SaaS Subscription Payment Receipt'), 'Renders formal receipt header when paid');
    });

    await st.test('E3: Open invoices provide Pay Now action linking to checkout', () => {
      assert(invoiceDetail.includes('handlePayNow'), 'Provides Pay Now action handler');
      assert(invoiceDetail.includes('saasSubscriptionService.initializePaystackCheckout'), 'Connects to payment initialization');
    });
  });

  // ============================================================================
  // CATEGORY F: Role Visibility & Navigation
  // ============================================================================
  await t.test('--- CATEGORY F: Role Visibility & Navigation ---', async (st) => {
    await st.test('F1: Sidebar renders Billing & Plan only for Owner, Accountant, Manager', () => {
      assert(sidebar.includes('(isOwner || isAccountant || isManager)'), 'Checks owner, accountant, manager');
      assert(sidebar.includes('to="/app/billing"'), 'Renders Billing & Plan link conditionally');
    });

    await st.test('F2: Sidebar renders Platform Admin Console only for Platform Administrators', () => {
      assert(sidebar.includes('isPlatformAdmin &&'), 'Checks isPlatformAdmin');
      assert(sidebar.includes('to="/platform"'), 'Renders /platform link conditionally');
    });

    await st.test('F3: Header displays user role badge and practice selector', () => {
      assert(header.includes('activeMembership.role'), 'Displays active membership role');
      assert(header.includes('<PracticeSelector />'), 'Provides practice selector dropdown');
    });
  });

  // ============================================================================
  // CATEGORY G: Subscription Lifecycle UI Contracts
  // ============================================================================
  await t.test('--- CATEGORY G: Subscription Lifecycle UI Contracts ---', async (st) => {
    await st.test('G1: SubscriptionStatusBanner handles all core lifecycle warning states', () => {
      assert(banner.includes("status === 'trialing'"), 'Handles trialing state with countdown');
      assert(banner.includes("status === 'past_due'"), 'Handles past_due state');
      assert(banner.includes("status === 'grace_period'"), 'Handles grace_period state');
      assert(banner.includes("status === 'suspended'"), 'Handles suspended state');
      assert(banner.includes("status === 'expired'"), 'Handles expired state');
      assert(banner.includes('cancel_at_period_end'), 'Handles scheduled cancellation state');
      assert(banner.includes('Cancellation scheduled'), 'Renders scheduled cancellation warning');
    });

    await st.test('G2: AppShell renders SubscriptionStatusBanner globally on all tenant pages', () => {
      assert(appShell.includes('<SubscriptionStatusBanner />'), 'Includes banner above page content');
    });
  });

  // ============================================================================
  // CATEGORY H: Production Configuration
  // ============================================================================
  await t.test('--- CATEGORY H: Production Configuration ---', async (st) => {
    await st.test('H1: netlify.toml configures SPA history api fallback and API redirects', () => {
      assert(netlifyToml.includes('from = "/*"'), 'Redirects all paths');
      assert(netlifyToml.includes('to = "/index.html"'), 'Fallbacks to /index.html');
      assert(netlifyToml.includes('status = 200'), 'Returns 200 rewrite for SPA');
      assert(netlifyToml.includes('from = "/api/initialize-payment"'), 'Redirects /api/initialize-payment');
      assert(netlifyToml.includes('from = "/api/verify-payment"'), 'Redirects /api/verify-payment');
      assert(netlifyToml.includes('from = "/api/paystack-webhook"'), 'Redirects /api/paystack-webhook');
    });

    await st.test('H2: netlify.toml configures build command, publish directory, and Node runtime', () => {
      assert(netlifyToml.includes('command = "npm run build"'), 'Specifies build command');
      assert(netlifyToml.includes('publish = "dist"'), 'Specifies publish directory');
      assert(netlifyToml.includes('NODE_VERSION = "20"'), 'Pins Node.js runtime');
    });

    await st.test('H3: Production client source contains zero localhost API calls', () => {
      const srcFiles = fs.readdirSync(path.join(ROOT_DIR, 'src', 'services'));
      for (const file of srcFiles) {
        if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = fs.readFileSync(path.join(ROOT_DIR, 'src', 'services', file), 'utf8');
          assert(!content.includes('http://localhost:'), `File ${file} must not contain localhost API URL`);
          assert(!content.includes('http://127.0.0.1:'), `File ${file} must not contain 127.0.0.1 API URL`);
        }
      }
    });
  });

  // ============================================================================
  // CATEGORY I: Secret Scanning
  // ============================================================================
  await t.test('--- CATEGORY I: Secret Scanning ---', async (st) => {
    const scanDir = (dir, forbiddenPatterns) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.git') {
            scanDir(fullPath, forbiddenPatterns);
          }
        } else if (entry.isFile() && /\.(js|ts|tsx|css|html|json)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const pattern of forbiddenPatterns) {
            assert(!content.includes(pattern), `Forbidden secret pattern "${pattern}" found in ${fullPath}`);
          }
        }
      }
    };

    await st.test('I1: Zero PAYSTACK_SECRET_KEY in frontend source and dist', () => {
      scanDir(path.join(ROOT_DIR, 'src'), ['PAYSTACK_SECRET_KEY']);
      if (fs.existsSync(path.join(ROOT_DIR, 'dist'))) {
        scanDir(path.join(ROOT_DIR, 'dist'), ['PAYSTACK_SECRET_KEY']);
      }
    });

    await st.test('I2: Zero live Paystack secret tokens (sk_live_) in frontend or build', () => {
      scanDir(path.join(ROOT_DIR, 'src'), ['sk_live_']);
      if (fs.existsSync(path.join(ROOT_DIR, 'dist'))) {
        scanDir(path.join(ROOT_DIR, 'dist'), ['sk_live_']);
      }
    });

    await st.test('I3: Zero service_role or sbp_ in frontend or build', () => {
      scanDir(path.join(ROOT_DIR, 'src'), ['SUPABASE_SERVICE_ROLE_KEY', 'sbp_']);
      if (fs.existsSync(path.join(ROOT_DIR, 'dist'))) {
        scanDir(path.join(ROOT_DIR, 'dist'), ['SUPABASE_SERVICE_ROLE_KEY', 'sbp_']);
      }
    });
  });

  // ============================================================================
  // CATEGORY J: Kabworld Separation
  // ============================================================================
  await t.test('--- CATEGORY J: Kabworld Separation ---', async (st) => {
    const checkKabworld = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.git') {
            checkKabworld(fullPath);
          }
        } else if (entry.isFile() && /\.(js|ts|tsx|css|html|sql|md)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lower = content.toLowerCase();
          assert(!lower.includes('kabworld'), `Forbidden legacy reference "kabworld" found in ${fullPath}`);
        }
      }
    };

    await st.test('J1: Zero occurrences in frontend source and dist', () => {
      checkKabworld(path.join(ROOT_DIR, 'src'));
      if (fs.existsSync(path.join(ROOT_DIR, 'dist'))) {
        checkKabworld(path.join(ROOT_DIR, 'dist'));
      }
    });

    await st.test('J2: Zero occurrences in migrations', () => {
      checkKabworld(path.join(ROOT_DIR, 'supabase', 'migrations'));
    });

    await st.test('J3: Zero occurrences in serverless functions', () => {
      checkKabworld(path.join(ROOT_DIR, 'netlify', 'functions'));
    });
  });

  // ============================================================================
  // CATEGORY K: PHI Leakage Prevention
  // ============================================================================
  await t.test('--- CATEGORY K: PHI Leakage Prevention ---', async (st) => {
    await st.test('K1: Platform layout strictly declares Clinical Privacy Firewall', () => {
      assert(platformLayout.includes('Clinical Privacy Firewall Active'), 'States Clinical Privacy Firewall Active');
      assert(platformLayout.includes('Zero access to patient medical records or PHI'), 'Affirms zero PHI access');
    });

    await st.test('K2: Platform routes are strictly barred from clinical patient queries', () => {
      assert(platformLayout.includes('/platform/practices'), 'Focuses on practices');
      assert(platformLayout.includes('/platform/plans'), 'Focuses on plans');
      assert(platformLayout.includes('/platform/billing'), 'Focuses on billing');
      assert(!platformLayout.includes('/platform/patients'), 'Zero patient administration route');
      assert(!platformLayout.includes('/platform/clinical-notes'), 'Zero clinical note route');
    });
  });

  // ============================================================================
  // CATEGORY L: Production URL Integrity
  // ============================================================================
  await t.test('--- CATEGORY L: Production URL Integrity ---', async (st) => {
    await st.test('L1: Brand logo links to canonical application root', () => {
      assert(pricingPage.includes('BrandLogo size="md" to="/"'), 'Pricing page links to root');
    });

    await st.test('L2: Netlify Functions use correct server-side relative endpoints', () => {
      const saasServiceContent = fs.readFileSync(path.join(ROOT_DIR, 'src', 'services', 'saasSubscriptionService.ts'), 'utf8');
      assert(saasServiceContent.includes("fetch('/api/initialize-payment'"), 'Connects to /api/initialize-payment');
      assert(saasServiceContent.includes("fetch('/api/verify-payment'"), 'Connects to /api/verify-payment');
    });
  });

  // ============================================================================
  // CATEGORY M: Responsive UI Contracts
  // ============================================================================
  await t.test('--- CATEGORY M: Responsive UI Contracts ---', async (st) => {
    await st.test('M1: Landing, pricing, and registration include mobile-responsive grid classes', () => {
      assert(pricingPage.includes('grid-cols-1 md:grid-cols-2 lg:grid-cols-4'), 'Responsive pricing grid');
      assert(registerPractice.includes('lg:grid-cols-12') || registerPractice.includes('md:'), 'Responsive registration layout');
      assert(billingPage.includes('grid grid-cols-1 md:grid-cols-3'), 'Responsive billing plan grid');
    });

    await st.test('M2: Print stylesheets hide navigation and headers on billing documents', () => {
      assert(invoiceList.includes('@media print') || invoiceDetail.includes('@media print') || fs.readFileSync(path.join(ROOT_DIR, 'src', 'styles', 'globals.css'), 'utf8').includes('@media print'), 'Defines @media print rules');
    });
  });

  // ============================================================================
  // CATEGORY N: Error-State Contracts
  // ============================================================================
  await t.test('--- CATEGORY N: Error-State Contracts ---', async (st) => {
    await st.test('N1: NoPracticePage renders clean guidance for users without a practice', () => {
      assert(noPractice.includes('No Practice Association Found'), 'Explains missing practice context');
      assert(noPractice.includes('to="/register-practice"'), 'Links to /register-practice');
      assert(noPractice.includes('to="/platform"'), 'Provides platform console link for admins');
    });

    await st.test('N2: NotFoundPage renders clean 404 screen', () => {
      assert(notFound.includes('404'), 'Indicates 404 status');
      assert(notFound.includes('Page Not Found'), 'Indicates page not found');
    });

    await st.test('N3: PlatformAdminGuard renders Restricted Access for unauthorized users', () => {
      assert(platformGuard.includes('Restricted Access'), 'Renders Restricted Access');
      assert(platformGuard.includes('verified Physenra Platform Administrators'), 'Explains restriction');
      assert(platformGuard.includes('Return to Practice Workspace'), 'Provides return button to workspace');
    });
  });

  // ============================================================================
  // CATEGORY O: Launch Configuration & Operational Readiness
  // ============================================================================
  await t.test('--- CATEGORY O: Launch Configuration & Operational Readiness ---', async (st) => {
    await st.test('O1: Self-service onboarding requires zero manual database intervention', () => {
      assert(registerPractice.includes('saasSubscriptionService.registerPracticeAndSubscribe'), 'Uses atomic RPC for full onboarding');
    });

    await st.test('O2: Pricing page includes transparent billing FAQ and 14-day trial explanation', () => {
      assert(pricingPage.includes('14-day free evaluation trial'), 'Explains 14-day evaluation');
      assert(pricingPage.includes('No credit card required'), 'Explains no credit card required');
      assert(pricingPage.includes('Non-Negotiable SaaS Safety Guarantees'), 'Includes safety guarantees FAQ');
    });
  });

  // ============================================================================
  // CATEGORY P: Regression Compatibility
  // ============================================================================
  await t.test('--- CATEGORY P: Regression Compatibility ---', async (st) => {
    await st.test('P1: Phase 4F comprehensive financial audit suite passes (86/86)', () => {
      const output = execSync('node tests/phase4_final_financial_security_audit.test.cjs', {
        cwd: ROOT_DIR,
        encoding: 'utf8',
      });
      assert(output.includes('pass 86'), 'Audit suite must pass 86/86 tests');
      assert(output.includes('fail 0'), 'Audit suite must have 0 failures');
    });
  });
});
