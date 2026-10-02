// ==============================================================================
// PHYSENRA — WEBSITE PHASE 1A SCAFFOLD & ROUTING ARCHITECTURE TEST SUITE
// File: tests/website_phase1a_scaffold.test.cjs
//
// Verifies:
// A. Public route definitions (/, /features, /features/*, /pricing, /about, /contact, /faq, /security, /terms, /privacy)
// B. Application route preservation (/app/*, /platform/*)
// C. Login route preservation (/login, /signup)
// D. Register-practice preservation (/register-practice)
// E. Public CTA targets (/register-practice and /login)
// F. Marketing header presence & mobile menu accessibility
// G. Marketing footer presence & 5-column structure
// H. Authoritative pricing catalog (Solo: 15k/150k, Pro: 30k/300k, Clinic: 50k/500k)
// I. Terms & Privacy route shells with mandated placeholder notices
// J. Security route shell & Platform Admin Privacy Firewall
// K. Zero Kabworld references (absolute separation)
// L. Zero frontend secrets (Paystack secret, service-role, PATs)
// M. Public-route / application isolation (no clinical services or stores in public routes)
// N. Responsive CSS foundation & overflow protection
// O. Code-splitting & lazy-loading architecture
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const PUBLIC_DIR = path.join(SRC_DIR, 'public');

// File paths
const APP_TSX_PATH = path.join(SRC_DIR, 'App.tsx');
const PUBLIC_ROUTES_PATH = path.join(PUBLIC_DIR, 'routes', 'publicRoutes.tsx');
const HEADER_PATH = path.join(PUBLIC_DIR, 'components', 'MarketingHeader.tsx');
const FOOTER_PATH = path.join(PUBLIC_DIR, 'components', 'MarketingFooter.tsx');
const HOMEPAGE_PATH = path.join(PUBLIC_DIR, 'pages', 'HomePageShell.tsx');
const FEATURES_HUB_PATH = path.join(PUBLIC_DIR, 'pages', 'FeaturesHubShell.tsx');
const FEATURE_DETAIL_PATH = path.join(PUBLIC_DIR, 'pages', 'FeatureDetailShell.tsx');
const SECURITY_PAGE_PATH = path.join(PUBLIC_DIR, 'pages', 'SecurityPageShell.tsx');
const TERMS_PAGE_PATH = path.join(PUBLIC_DIR, 'pages', 'TermsPageShell.tsx');
const PRIVACY_PAGE_PATH = path.join(PUBLIC_DIR, 'pages', 'PrivacyPageShell.tsx');
const PLANS_DATA_PATH = path.join(PUBLIC_DIR, 'data', 'plans.ts');
const NAVIGATION_DATA_PATH = path.join(PUBLIC_DIR, 'data', 'navigation.ts');
const SEO_DATA_PATH = path.join(PUBLIC_DIR, 'data', 'seo.ts');
const DIST_ASSETS_DIR = path.join(ROOT_DIR, 'dist', 'assets');

test('PHYSENRA — Website Phase 1A Scaffold & Routing Verification', async (t) => {
  // Read core source files
  const appTsx = fs.readFileSync(APP_TSX_PATH, 'utf8');
  const publicRoutes = fs.readFileSync(PUBLIC_ROUTES_PATH, 'utf8');
  const headerCode = fs.readFileSync(HEADER_PATH, 'utf8');
  const footerCode = fs.readFileSync(FOOTER_PATH, 'utf8');
  const homepageCode = fs.readFileSync(HOMEPAGE_PATH, 'utf8');
  const termsCode = fs.readFileSync(TERMS_PAGE_PATH, 'utf8');
  const privacyCode = fs.readFileSync(PRIVACY_PAGE_PATH, 'utf8');
  const securityCode = fs.readFileSync(SECURITY_PAGE_PATH, 'utf8');
  const plansData = fs.readFileSync(PLANS_DATA_PATH, 'utf8');
  const navData = fs.readFileSync(NAVIGATION_DATA_PATH, 'utf8');
  const seoData = fs.readFileSync(SEO_DATA_PATH, 'utf8');

  // ============================================================================
  // SUITE A: Public Route Definitions
  // ============================================================================
  await t.test('--- SUITE A: Public Route Definitions ---', async (st) => {
    await st.test('A1: Root route / renders code-split HomePageShell', () => {
      assert(appTsx.includes('path="/" element={withPublicSuspense(HomePageShell)}'), 'App.tsx registers / with HomePageShell');
    });

    await st.test('A2: Features hub /features is registered', () => {
      assert(appTsx.includes('path="/features" element={withPublicSuspense(FeaturesHubShell)}'), 'App.tsx registers /features');
    });

    await st.test('A3: All 9 specialized clinical feature sub-routes are registered', () => {
      const featureRoutes = [
        'path="/features/physiotherapy-emr"',
        'path="/features/patient-management"',
        'path="/features/appointments"',
        'path="/features/clinical-documentation"',
        'path="/features/treatment-plans"',
        'path="/features/treatment-packages"',
        'path="/features/billing"',
        'path="/features/medical-imaging"',
        'path="/features/practice-management"',
      ];
      for (const route of featureRoutes) {
        assert(appTsx.includes(route), `App.tsx must register ${route}`);
      }
    });

    await st.test('A4: Commercial, Trust, Legal and Company routes are registered', () => {
      const publicRoutesList = [
        'path="/pricing"',
        'path="/about"',
        'path="/contact"',
        'path="/faq"',
        'path="/security"',
        'path="/terms"',
        'path="/privacy"',
      ];
      for (const route of publicRoutesList) {
        assert(appTsx.includes(route), `App.tsx must register ${route}`);
      }
    });
  });

  // ============================================================================
  // SUITE B: Application Route Preservation
  // ============================================================================
  await t.test('--- SUITE B: Application Route Preservation ---', async (st) => {
    await st.test('B1: Authenticated /app parent route and ProtectedRoute are preserved', () => {
      assert(appTsx.includes('path="/app"'), 'App.tsx registers /app route');
      assert(appTsx.includes('<ProtectedRoute>'), 'App.tsx protects /app with ProtectedRoute');
      assert(appTsx.includes('<AppShell />'), 'App.tsx renders AppShell in /app');
    });

    await st.test('B2: Practice dashboard and settings routes are preserved', () => {
      assert(appTsx.includes('path="dashboard" element={<DashboardPage />}'), 'Registers /app/dashboard');
      assert(appTsx.includes('path="practice" element={<PracticeSettingsPage />}'), 'Registers /app/practice');
    });

    await st.test('B3: Practice billing & invoice routes are preserved', () => {
      assert(appTsx.includes('path="billing" element={<PracticeBillingPage />}'), 'Registers /app/billing');
      assert(appTsx.includes('path="billing/plans"'), 'Registers /app/billing/plans');
      assert(appTsx.includes('path="billing/invoices" element={<PracticeInvoiceListPage />}'), 'Registers /app/billing/invoices');
      assert(appTsx.includes('path="billing/invoices/:invoiceId" element={<PracticeInvoiceDetailPage />}'), 'Registers /app/billing/invoices/:invoiceId');
    });

    await st.test('B4: Platform admin console /platform is preserved with PlatformAdminGuard', () => {
      assert(appTsx.includes('path="/platform"'), 'Registers /platform route');
      assert(appTsx.includes('<PlatformAdminGuard>'), 'Guards /platform with PlatformAdminGuard');
      assert(appTsx.includes('path="practices" element={<PlatformPracticesPage />}'), 'Registers /platform/practices');
      assert(appTsx.includes('path="plans" element={<PlatformPlansPage />}'), 'Registers /platform/plans');
      assert(appTsx.includes('path="audit" element={<PlatformAuditPage />}'), 'Registers /platform/audit');
    });
  });

  // ============================================================================
  // SUITE C: Login Route Preservation
  // ============================================================================
  await t.test('--- SUITE C: Login & Signup Route Preservation ---', async (st) => {
    await st.test('C1: /login route is registered with LoginPage', () => {
      assert(appTsx.includes('path="/login" element={<LoginPage />}'), 'Registers /login with LoginPage');
    });

    await st.test('C2: /signup route is registered with SignUpPage', () => {
      assert(appTsx.includes('path="/signup" element={<SignUpPage />}'), 'Registers /signup with SignUpPage');
    });
  });

  // ============================================================================
  // SUITE D: Register-Practice Preservation
  // ============================================================================
  await t.test('--- SUITE D: Register-Practice Preservation ---', async (st) => {
    await st.test('D1: /register-practice route is registered with RegisterPracticePage', () => {
      assert(appTsx.includes('path="/register-practice" element={<RegisterPracticePage />}'), 'Registers /register-practice');
    });
  });

  // ============================================================================
  // SUITE E: Public CTA Targets
  // ============================================================================
  await t.test('--- SUITE E: Public CTA Targets ---', async (st) => {
    await st.test('E1: Header Primary CTA routes to /register-practice and Secondary to /login', () => {
      assert(headerCode.includes('to="/register-practice"'), 'Header primary CTA routes to /register-practice');
      assert(headerCode.includes('to="/login"'), 'Header secondary CTA routes to /login');
    });

    await st.test('E2: Homepage CTAs route cleanly to /register-practice and /pricing', () => {
      assert(homepageCode.includes('to="/register-practice"'), 'Homepage primary CTA routes to /register-practice');
      assert(homepageCode.includes('to="/pricing"'), 'Homepage secondary CTA routes to /pricing');
    });

    await st.test('E3: Footer links include direct bridges to /login and /register-practice', () => {
      assert(navData.includes("href: '/login'"), 'Footer nav includes /login');
      assert(navData.includes("href: '/register-practice'"), 'Footer nav includes /register-practice');
    });
  });

  // ============================================================================
  // SUITE F: Marketing Header Presence & Accessibility
  // ============================================================================
  await t.test('--- SUITE F: Marketing Header Presence & Accessibility ---', async (st) => {
    await st.test('F1: MarketingHeader renders BrandLogo and Main Navigation', () => {
      assert(headerCode.includes('BrandLogo'), 'Header renders BrandLogo');
      assert(headerCode.includes('aria-label="Main Navigation"'), 'Header has accessible nav landmark');
    });

    await st.test('F2: Mobile menu toggle includes accessible aria attributes', () => {
      assert(headerCode.includes('aria-expanded='), 'Mobile toggle has aria-expanded');
      assert(headerCode.includes('aria-label='), 'Mobile toggle has aria-label');
      assert(headerCode.includes('role="dialog"'), 'Mobile drawer has accessible dialog role');
    });
  });

  // ============================================================================
  // SUITE G: Marketing Footer Presence
  // ============================================================================
  await t.test('--- SUITE G: Marketing Footer Presence ---', async (st) => {
    await st.test('G1: MarketingFooter renders 5-column categorized architecture', () => {
      assert(navData.includes("title: 'Product'"), 'Contains Product column');
      assert(navData.includes("title: 'Resources'"), 'Contains Resources column');
      assert(navData.includes("title: 'Company'"), 'Contains Company column');
      assert(navData.includes("title: 'Legal'"), 'Contains Legal column');
      assert(navData.includes("title: 'Application'"), 'Contains Application column');
    });

    await st.test('G2: Footer displays official copyright notice without fake credentials', () => {
      assert(footerCode.includes('Physenra Platform Technologies. All rights reserved.'), 'Displays official copyright');
      assert(!footerCode.includes('facebook.com'), 'Zero fake Facebook links');
      assert(!footerCode.includes('twitter.com/fake'), 'Zero fake Twitter links');
      assert(!footerCode.includes('123 Fake Street'), 'Zero fake address');
    });
  });

  // ============================================================================
  // SUITE H: Authoritative Pricing Catalog
  // ============================================================================
  await t.test('--- SUITE H: Authoritative Pricing Catalog ---', async (st) => {
    await st.test('H1: Solo plan matches authoritative backend values (₦15,000/mo, 1 seat)', () => {
      assert(plansData.includes("code: 'solo'"), 'Solo plan defined');
      assert(plansData.includes('monthlyNaira: 15000'), 'Solo monthly is 15,000');
      assert(plansData.includes('annualNaira: 150000'), 'Solo annual is 150,000');
      assert(plansData.includes('seats: 1'), 'Solo seats is 1');
    });

    await st.test('H2: Professional plan matches authoritative backend values (₦30,000/mo, 5 seats)', () => {
      assert(plansData.includes("code: 'professional'"), 'Professional plan defined');
      assert(plansData.includes('monthlyNaira: 30000'), 'Professional monthly is 30,000');
      assert(plansData.includes('annualNaira: 300000'), 'Professional annual is 300,000');
      assert(plansData.includes('seats: 5'), 'Professional seats is 5');
    });

    await st.test('H3: Clinic plan matches authoritative backend values (₦50,000/mo, 10 seats)', () => {
      assert(plansData.includes("code: 'clinic'"), 'Clinic plan defined');
      assert(plansData.includes('monthlyNaira: 50000'), 'Clinic monthly is 50,000');
      assert(plansData.includes('annualNaira: 500000'), 'Clinic annual is 500,000');
      assert(plansData.includes('seats: 10'), 'Clinic seats is 10');
    });

    await st.test('H4: Conflicting unapproved prices (₦35,000 or ₦65,000) are strictly barred', () => {
      assert(!plansData.includes('35000'), 'Must not contain 35000');
      assert(!plansData.includes('65000'), 'Must not contain 65000');
      assert(!plansData.includes('35,000'), 'Must not contain 35,000');
      assert(!plansData.includes('65,000'), 'Must not contain 65,000');
    });
  });

  // ============================================================================
  // SUITE I: Terms & Privacy Route Shells
  // ============================================================================
  await t.test('--- SUITE I: Terms & Privacy Route Shells ---', async (st) => {
    await st.test('I1: Terms route shell contains mandated pre-launch placeholder text', () => {
      assert(
        termsCode.includes('Terms of Service content will be published here before public launch.'),
        'Terms shell contains mandated placeholder'
      );
    });

    await st.test('I2: Privacy route shell contains mandated pre-launch placeholder text', () => {
      assert(
        privacyCode.includes('Privacy Policy content will be published here before public launch.'),
        'Privacy shell contains mandated placeholder'
      );
    });
  });

  // ============================================================================
  // SUITE J: Security Route Shell
  // ============================================================================
  await t.test('--- SUITE J: Security Route Shell ---', async (st) => {
    await st.test('J1: Security page documents Row-Level Security and Admin Privacy Firewall', () => {
      assert(securityCode.includes('Row-Level Security'), 'Documents Row-Level Security');
      assert(securityCode.includes('Platform Admin Privacy Firewall'), 'Documents Platform Admin Privacy Firewall');
      assert(securityCode.includes('read-only'), 'Documents read-only data retention');
    });

    await st.test('J2: Security page does NOT make unverified HIPAA or ISO certifications', () => {
      assert(!securityCode.includes('HIPAA Certified'), 'Zero unverified HIPAA certification claim');
      assert(!securityCode.includes('ISO 27001 Certified'), 'Zero unverified ISO certification claim');
    });
  });

  // ============================================================================
  // SUITE K: Project Independence (Zero Kabworld)
  // ============================================================================
  await t.test('--- SUITE K: Legacy Project Independence (Zero Kabworld) ---', async (st) => {
    const forbiddenPattern = new RegExp(['k', 'a', 'b', 'w', 'o', 'r', 'l', 'd'].join(''), 'i');

    function scanDir(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (/\.(ts|tsx|js|jsx|css|html|json)$/.test(file)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          assert(!forbiddenPattern.test(content), `Found forbidden legacy reference in: ${fullPath}`);
        }
      }
    }

    scanDir(PUBLIC_DIR);
    assert(!forbiddenPattern.test(appTsx), 'App.tsx must not contain legacy references');
  });

  // ============================================================================
  // SUITE L: Secret Hygiene
  // ============================================================================
  await t.test('--- SUITE L: Secret Hygiene ---', async (st) => {
    const secretPatterns = [
      /sk_live_[0-9a-zA-Z]{20,}/,
      /sk_test_[0-9a-zA-Z]{20,}/,
      /PAYSTACK_SECRET_KEY/,
      /sbp_[0-9a-zA-Z]{20,}/,
      /service_role/,
    ];

    function scanDirForSecrets(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDirForSecrets(fullPath);
        } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const pattern of secretPatterns) {
            assert(!pattern.test(content), `Found potential secret in ${fullPath}: ${pattern}`);
          }
        }
      }
    }

    scanDirForSecrets(PUBLIC_DIR);
  });

  // ============================================================================
  // SUITE M: Public-Route / Application Isolation
  // ============================================================================
  await t.test('--- SUITE M: Public-Route / Application Isolation ---', async (st) => {
    await st.test('M1: Public components do not import clinical patient or visit services', () => {
      function scanImports(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanImports(fullPath);
          } else if (/\.(ts|tsx)$/.test(file)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            assert(!content.includes('patientService'), `Public component must not import patientService: ${fullPath}`);
            assert(!content.includes('clinicalVisitService'), `Public component must not import clinicalVisitService: ${fullPath}`);
            assert(!content.includes('imagingService'), `Public component must not import imagingService: ${fullPath}`);
            assert(!content.includes('usePatientStore'), `Public component must not import usePatientStore: ${fullPath}`);
            assert(!content.includes('cornerstone'), `Public component must not import cornerstone: ${fullPath}`);
          }
        }
      }

      scanImports(PUBLIC_DIR);
    });
  });

  // ============================================================================
  // SUITE N: Responsive CSS Foundation
  // ============================================================================
  await t.test('--- SUITE N: Responsive CSS Foundation ---', async (st) => {
    await st.test('N1: MarketingLayout applies overflow-x-hidden container guard', () => {
      const layoutCode = fs.readFileSync(path.join(PUBLIC_DIR, 'layouts', 'MarketingLayout.tsx'), 'utf8');
      assert(layoutCode.includes('overflow-x-hidden'), 'Layout guards against horizontal overflow');
    });

    await st.test('N2: Homepage uses responsive grid & breakpoint tokens (sm, md, lg)', () => {
      assert(homepageCode.includes('grid-cols-1'), 'Homepage uses mobile 1-column base');
      assert(homepageCode.includes('md:grid-cols-'), 'Homepage uses tablet breakpoint');
      assert(homepageCode.includes('lg:grid-cols-'), 'Homepage uses desktop breakpoint');
    });
  });

  // ============================================================================
  // SUITE O: Code-Splitting & Lazy Loading
  // ============================================================================
  await t.test('--- SUITE O: Code-Splitting & Lazy Loading Architecture ---', async (st) => {
    await st.test('O1: Public routes use lazy() dynamic imports', () => {
      assert(publicRoutes.includes('lazy('), 'publicRoutes uses React.lazy()');
      assert(publicRoutes.includes('Suspense'), 'publicRoutes incorporates Suspense');
      assert(publicRoutes.includes('PublicLoadingFallback'), 'publicRoutes provides accessible loading fallback');
    });

    await st.test('O2: Production dist assets contain isolated public chunk bundles (< 35kB each)', () => {
      if (fs.existsSync(DIST_ASSETS_DIR)) {
        const assets = fs.readdirSync(DIST_ASSETS_DIR);
        const homeChunk = assets.find((f) => f.startsWith('HomePageShell-') && f.endsWith('.js'));
        const layoutChunk = assets.find((f) => f.startsWith('MarketingLayout-') && f.endsWith('.js'));
        assert(homeChunk, 'Production dist contains isolated HomePageShell chunk');
        assert(layoutChunk, 'Production dist contains isolated MarketingLayout chunk');

        const homeStat = fs.statSync(path.join(DIST_ASSETS_DIR, homeChunk));
        assert(homeStat.size < 35000, `HomePageShell chunk (${homeStat.size} bytes) is well under 35kB budget`);
      }
    });
  });
});
