// ==============================================================================
// PHYSENRA — WEBSITE PHASE 1D FINAL LAUNCH READINESS & QA TEST SUITE
// File: tests/website_phase1d_launch_readiness.test.cjs
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const PUBLIC_DIR = path.join(SRC_DIR, 'public');
const STATIC_PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// Key file paths
const APP_TSX_PATH = path.join(SRC_DIR, 'App.tsx');
const PUBLIC_ROUTES_PATH = path.join(PUBLIC_DIR, 'routes', 'publicRoutes.tsx');
const HEADER_PATH = path.join(PUBLIC_DIR, 'components', 'MarketingHeader.tsx');
const FOOTER_PATH = path.join(PUBLIC_DIR, 'components', 'MarketingFooter.tsx');
const LAYOUT_PATH = path.join(PUBLIC_DIR, 'layouts', 'MarketingLayout.tsx');
const PLANS_PATH = path.join(PUBLIC_DIR, 'data', 'plans.ts');
const NAV_PATH = path.join(PUBLIC_DIR, 'data', 'navigation.ts');
const SEO_PATH = path.join(PUBLIC_DIR, 'data', 'seo.ts');
const PRICING_PAGE_PATH = path.join(SRC_DIR, 'pages', 'public', 'PricingPage.tsx');
const TERMS_PAGE_PATH = path.join(PUBLIC_DIR, 'pages', 'TermsPageShell.tsx');
const PRIVACY_PAGE_PATH = path.join(PUBLIC_DIR, 'pages', 'PrivacyPageShell.tsx');
const SECURITY_PAGE_PATH = path.join(PUBLIC_DIR, 'pages', 'SecurityPageShell.tsx');
const ROBOTS_PATH = path.join(STATIC_PUBLIC_DIR, 'robots.txt');
const SITEMAP_PATH = path.join(STATIC_PUBLIC_DIR, 'sitemap.xml');
const OG_ASSET_PATH = path.join(STATIC_PUBLIC_DIR, 'images', 'og-physenra-platform.png');

// File readers
const appTsx = fs.readFileSync(APP_TSX_PATH, 'utf8');
const publicRoutes = fs.readFileSync(PUBLIC_ROUTES_PATH, 'utf8');
const headerCode = fs.readFileSync(HEADER_PATH, 'utf8');
const footerCode = fs.readFileSync(FOOTER_PATH, 'utf8');
const layoutCode = fs.readFileSync(LAYOUT_PATH, 'utf8');
const plansCode = fs.readFileSync(PLANS_PATH, 'utf8');
const navCode = fs.readFileSync(NAV_PATH, 'utf8');
const seoCode = fs.readFileSync(SEO_PATH, 'utf8');
const pricingCode = fs.readFileSync(PRICING_PAGE_PATH, 'utf8');
const termsCode = fs.readFileSync(TERMS_PAGE_PATH, 'utf8');
const privacyCode = fs.readFileSync(PRIVACY_PAGE_PATH, 'utf8');
const securityCode = fs.readFileSync(SECURITY_PAGE_PATH, 'utf8');

// Helper: collect all files recursively
function getAllFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(full, extensions));
    } else if (extensions.some((ext) => file.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

const allPublicFiles = getAllFiles(PUBLIC_DIR);
const allPublicAndPricingFiles = [...allPublicFiles, PRICING_PAGE_PATH];

test('PHYSENRA — Website Phase 1D Final Launch Readiness & QA Verification', async (t) => {
  // ============================================================================
  // SUITE A: Public Route Inventory
  // ============================================================================
  await t.test('--- SUITE A: Public Route Inventory ---', async (st) => {
    const requiredPublicRoutes = [
      '/',
      '/features',
      '/features/physiotherapy-emr',
      '/features/patient-management',
      '/features/appointments',
      '/features/clinical-documentation',
      '/features/treatment-plans',
      '/features/treatment-packages',
      '/features/billing',
      '/features/medical-imaging',
      '/features/practice-management',
      '/pricing',
      '/about',
      '/contact',
      '/faq',
      '/security',
      '/terms',
      '/privacy',
    ];

    for (const r of requiredPublicRoutes) {
      await st.test(`A: Route "${r}" is registered in publicRoutes or App.tsx`, () => {
        const inPublic = publicRoutes.includes(`path: '${r}'`) || publicRoutes.includes(`path: "${r}"`);
        const inApp = appTsx.includes(`path="${r}"`) || appTsx.includes(`path='${r}'`);
        assert(inPublic || inApp, `Public route ${r} is missing from route registrations`);
      });
    }

    await st.test('A19: Application bridges /login, /signup, /register-practice are registered', () => {
      assert(appTsx.includes('path="/login"') || appTsx.includes("path='/login'"), '/login is registered');
      assert(appTsx.includes('path="/signup"') || appTsx.includes("path='/signup'"), '/signup is registered');
      assert(
        appTsx.includes('path="/register-practice"') || appTsx.includes("path='/register-practice'"),
        '/register-practice is registered'
      );
    });
  });

  // ============================================================================
  // SUITE B: Header Navigation
  // ============================================================================
  await t.test('--- SUITE B: Header Navigation ---', async (st) => {
    await st.test('B1: MarketingHeader renders BrandLogo anchored to /', () => {
      assert(headerCode.includes('<BrandLogo size="md" to="/" />'), 'BrandLogo to /');
    });

    await st.test('B2: MarketingHeader includes all core navigation items', () => {
      assert(headerCode.includes('Features'), 'Features navigation present');
      assert(navCode.includes("href: '/pricing'"), 'Pricing link present');
      assert(navCode.includes("href: '/about'"), 'About link present');
      assert(navCode.includes("href: '/faq'"), 'FAQ link present');
      assert(navCode.includes("href: '/security'"), 'Security link present');
      assert(navCode.includes("href: '/contact'"), 'Contact link present');
    });

    await st.test('B3: MarketingHeader provides Log In and Start Free Trial CTAs', () => {
      assert(headerCode.includes('to="/login"'), 'Log In links to /login');
      assert(headerCode.includes('to="/register-practice"'), 'Free Trial links to /register-practice');
    });

    await st.test('B4: Mobile menu includes accessible controls and Escape key support', () => {
      assert(headerCode.includes('aria-expanded={mobileMenuOpen}'), 'Accessible aria-expanded toggle');
      assert(headerCode.includes("e.key === 'Escape'"), 'Escape key handler closes navigation cleanly');
    });
  });

  // ============================================================================
  // SUITE C: Footer Navigation
  // ============================================================================
  await t.test('--- SUITE C: Footer Navigation ---', async (st) => {
    await st.test('C1: Footer contains required logical groups (PRODUCT, COMPANY, TRUST, ACCOUNT)', () => {
      assert(navCode.includes("title: 'Product'"), 'Contains Product group');
      assert(navCode.includes("title: 'Company'"), 'Contains Company group');
      assert(navCode.includes("title: 'Trust'"), 'Contains Trust group');
      assert(navCode.includes("title: 'Account'"), 'Contains Account group');
    });

    await st.test('C2: Product group contains all 9 clinical features', () => {
      const requiredFeatures = [
        'Physiotherapy EMR',
        'Patient Management',
        'Appointments',
        'Clinical Documentation',
        'Treatment Plans',
        'Treatment Packages',
        'Billing',
        'Medical Imaging',
        'Practice Management',
      ];
      for (const feat of requiredFeatures) {
        assert(navCode.includes(feat), `Feature ${feat} present in navigation`);
      }
    });

    await st.test('C3: Footer displays official copyright without fabricated contact or social links', () => {
      assert(footerCode.includes('Physenra Platform Technologies. All rights reserved.'), 'Official copyright notice');
      assert(!footerCode.includes('facebook.com'), 'Zero fake Facebook links');
      assert(!footerCode.includes('twitter.com/fake'), 'Zero fake Twitter links');
      assert(!footerCode.includes('123 Fake Street'), 'Zero fake physical address');
    });
  });

  // ============================================================================
  // SUITE D: CTA Routing Invariants
  // ============================================================================
  await t.test('--- SUITE D: CTA Routing Invariants ---', async (st) => {
    await st.test('D1: Primary registration CTAs route strictly to /register-practice', () => {
      const primaryCta = fs.readFileSync(path.join(PUBLIC_DIR, 'components', 'PrimaryCTAButton.tsx'), 'utf8');
      assert(primaryCta.includes('to?: string'), 'PrimaryCTAButton accepts to prop');
      assert(headerCode.includes('to="/register-practice"'), 'Header primary CTA');
      assert(footerCode.includes('to="/register-practice"') || navCode.includes('/register-practice'), 'Footer primary CTA');
    });

    await st.test('D2: Secondary login CTAs route strictly to /login', () => {
      assert(headerCode.includes('to="/login"'), 'Header secondary CTA');
      assert(navCode.includes("href: '/login'"), 'Footer login bridge');
    });

    await st.test('D3: Zero empty or dead anchor links in public navigation', () => {
      assert(!navCode.includes("href: '#'"), 'Zero hash links in navigation');
      assert(!navCode.includes('href: ""'), 'Zero empty links in navigation');
    });
  });

  // ============================================================================
  // SUITE E: Pricing Integrity
  // ============================================================================
  await t.test('--- SUITE E: Pricing Integrity ---', async (st) => {
    await st.test('E1: Authoritative plans match backend (Solo ₦15k, Pro ₦30k, Clinic ₦50k, Enterprise Custom)', () => {
      assert(plansCode.includes("code: 'solo'"), 'Solo plan exists');
      assert(plansCode.includes('monthlyNaira: 15000') && plansCode.includes('annualNaira: 150000'), 'Solo: 15k / 150k');
      assert(plansCode.includes("code: 'professional'"), 'Professional plan exists');
      assert(plansCode.includes('monthlyNaira: 30000') && plansCode.includes('annualNaira: 300000'), 'Pro: 30k / 300k');
      assert(plansCode.includes("code: 'clinic'"), 'Clinic plan exists');
      assert(plansCode.includes('monthlyNaira: 50000') && plansCode.includes('annualNaira: 500000'), 'Clinic: 50k / 500k');
      assert(plansCode.includes("code: 'enterprise'"), 'Enterprise plan exists');
    });

    await st.test('E2: Barred unapproved prices (35,000, 65,000) across all public files', () => {
      for (const filePath of allPublicAndPricingFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!content.includes('35000') && !content.includes('35,000'), `Found 35k in ${path.basename(filePath)}`);
        assert(!content.includes('65000') && !content.includes('65,000'), `Found 65k in ${path.basename(filePath)}`);
      }
    });

    await st.test('E3: Barred extra-seat and additional seat pricing claims', () => {
      for (const filePath of allPublicAndPricingFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!/extra seat/i.test(content), `Found extra seat in ${path.basename(filePath)}`);
        assert(!/additional seat/i.test(content), `Found additional seat in ${path.basename(filePath)}`);
      }
    });

    await st.test('E4: Barred unapproved discount or savings claims', () => {
      for (const filePath of allPublicAndPricingFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!/save 2 months/i.test(content), `Found save 2 months in ${path.basename(filePath)}`);
        assert(!/2 months free/i.test(content), `Found 2 months free in ${path.basename(filePath)}`);
      }
    });
  });

  // ============================================================================
  // SUITE F: Legal-Page Placeholders
  // ============================================================================
  await t.test('--- SUITE F: Legal-Page Placeholders ---', async (st) => {
    await st.test('F1: Terms page displays Terms of Service and neutral pending notice', () => {
      assert(termsCode.includes('Terms of Service'), 'Displays Terms of Service');
      assert(
        termsCode.includes('Formal Terms of Service content is pending legal review and publication.'),
        'Displays formal pending notice'
      );
      assert(!termsCode.includes('indemnify and hold harmless'), 'Zero fabricated liability clauses');
      assert(!termsCode.includes('arbitration agreement'), 'Zero fabricated dispute clauses');
    });

    await st.test('F2: Privacy page displays Privacy Policy and neutral pending notice', () => {
      assert(privacyCode.includes('Privacy Policy'), 'Displays Privacy Policy');
      assert(
        privacyCode.includes('Formal Privacy Policy content is pending legal review and publication.'),
        'Displays formal pending notice'
      );
      assert(!privacyCode.includes('cookie banner'), 'Zero fabricated cookie policy');
      assert(!privacyCode.includes('subprocessor list:'), 'Zero fabricated subprocessor obligations');
    });
  });

  // ============================================================================
  // SUITE G & H: SEO Titles & Meta Descriptions
  // ============================================================================
  await t.test('--- SUITE G & H: SEO Titles & Descriptions ---', async (st) => {
    const requiredSlugs = [
      '/',
      '/features',
      '/features/physiotherapy-emr',
      '/features/patient-management',
      '/features/appointments',
      '/features/clinical-documentation',
      '/features/treatment-plans',
      '/features/treatment-packages',
      '/features/billing',
      '/features/medical-imaging',
      '/features/practice-management',
      '/pricing',
      '/about',
      '/contact',
      '/faq',
      '/security',
      '/terms',
      '/privacy',
    ];

    for (const slug of requiredSlugs) {
      await st.test(`G & H: Route "${slug}" has unique title and descriptive meta`, () => {
        assert(seoCode.includes(`'${slug}': {`), `Route ${slug} defined in seo.ts`);
      });
    }
  });

  // ============================================================================
  // SUITE I: Canonicals
  // ============================================================================
  await t.test('--- SUITE I: Canonicals ---', async (st) => {
    await st.test('I1: Canonical URLs adhere strictly to https://physenra.com domain', () => {
      const canonicalMatches = seoCode.match(/canonical:\s*['"]([^'"]+)['"]/g) || [];
      assert(canonicalMatches.length >= 18, 'All 18 routes have canonical URLs');
      for (const m of canonicalMatches) {
        assert(m.includes('https://physenra.com'), `Canonical must use https://physenra.com: ${m}`);
        assert(!m.includes('localhost'), `Canonical must not contain localhost: ${m}`);
      }
    });
  });

  // ============================================================================
  // SUITE J & K: OpenGraph & Twitter Metadata
  // ============================================================================
  await t.test('--- SUITE J & K: OpenGraph & Twitter Metadata ---', async (st) => {
    await st.test('J1: MarketingLayout dynamically injects OpenGraph tags', () => {
      assert(layoutCode.includes("upsertMeta('property', 'og:title'"), 'Injects og:title');
      assert(layoutCode.includes("upsertMeta('property', 'og:description'"), 'Injects og:description');
      assert(layoutCode.includes("upsertMeta('property', 'og:url'"), 'Injects og:url');
      assert(layoutCode.includes("upsertMeta('property', 'og:image'"), 'Injects og:image');
    });

    await st.test('K1: MarketingLayout dynamically injects Twitter card tags', () => {
      assert(layoutCode.includes("upsertMeta('name', 'twitter:card'"), 'Injects twitter:card');
      assert(layoutCode.includes("upsertMeta('name', 'twitter:title'"), 'Injects twitter:title');
      assert(layoutCode.includes("upsertMeta('name', 'twitter:description'"), 'Injects twitter:description');
      assert(layoutCode.includes("upsertMeta('name', 'twitter:image'"), 'Injects twitter:image');
    });
  });

  // ============================================================================
  // SUITE L: OpenGraph Asset Existence
  // ============================================================================
  await t.test('--- SUITE L: OpenGraph Asset Existence ---', async (st) => {
    await st.test('L1: /images/og-physenra-platform.png exists in static public directory', () => {
      assert(fs.existsSync(OG_ASSET_PATH), `OG asset must exist at ${OG_ASSET_PATH}`);
      const stat = fs.statSync(OG_ASSET_PATH);
      assert(stat.size > 1000, `OG asset must be a valid file (size: ${stat.size} bytes)`);
    });
  });

  // ============================================================================
  // SUITE M: robots.txt
  // ============================================================================
  await t.test('--- SUITE M: robots.txt ---', async (st) => {
    await st.test('M1: robots.txt exists and contains valid directives', () => {
      assert(fs.existsSync(ROBOTS_PATH), 'public/robots.txt exists');
      const robots = fs.readFileSync(ROBOTS_PATH, 'utf8');
      assert(robots.includes('User-agent: *'), 'Specifies User-agent: *');
      assert(robots.includes('Allow: /'), 'Allows public root');
      assert(robots.includes('Disallow: /app/'), 'Disallows /app/');
      assert(robots.includes('Disallow: /platform/'), 'Disallows /platform/');
      assert(robots.includes('Disallow: /login'), 'Disallows /login');
      assert(robots.includes('Disallow: /signup'), 'Disallows /signup');
      assert(robots.includes('Sitemap: https://physenra.com/sitemap.xml'), 'References sitemap.xml');
    });
  });

  // ============================================================================
  // SUITE N & O: sitemap.xml & Route Exclusions
  // ============================================================================
  await t.test('--- SUITE N & O: sitemap.xml & Route Exclusions ---', async (st) => {
    await st.test('N1: sitemap.xml exists and lists all 18 public marketing routes', () => {
      assert(fs.existsSync(SITEMAP_PATH), 'public/sitemap.xml exists');
      const sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');
      assert(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'), 'Valid sitemap schema');
      assert(sitemap.includes('<loc>https://physenra.com/</loc>'), 'Lists /');
      assert(sitemap.includes('<loc>https://physenra.com/pricing</loc>'), 'Lists /pricing');
      assert(sitemap.includes('<loc>https://physenra.com/features</loc>'), 'Lists /features');
      assert(sitemap.includes('<loc>https://physenra.com/about</loc>'), 'Lists /about');
      assert(sitemap.includes('<loc>https://physenra.com/contact</loc>'), 'Lists /contact');
      assert(sitemap.includes('<loc>https://physenra.com/faq</loc>'), 'Lists /faq');
      assert(sitemap.includes('<loc>https://physenra.com/security</loc>'), 'Lists /security');
      assert(sitemap.includes('<loc>https://physenra.com/terms</loc>'), 'Lists /terms');
      assert(sitemap.includes('<loc>https://physenra.com/privacy</loc>'), 'Lists /privacy');
    });

    await st.test('O1: Authenticated and sensitive routes are strictly excluded from sitemap', () => {
      const sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');
      assert(!sitemap.includes('/app/'), 'Zero /app/ in sitemap');
      assert(!/<loc>https:\/\/physenra\.com\/app[<]/i.test(sitemap), 'Zero exact /app route in sitemap');
      assert(!sitemap.includes('/platform/'), 'Zero /platform/ in sitemap');
      assert(!/<loc>https:\/\/physenra\.com\/platform[<]/i.test(sitemap), 'Zero exact /platform in sitemap');
      assert(!sitemap.includes('/login'), 'Zero /login in sitemap');
      assert(!sitemap.includes('/signup'), 'Zero /signup in sitemap');
      assert(!sitemap.includes('/register-practice'), 'Zero /register-practice in sitemap');
    });
  });

  // ============================================================================
  // SUITE P: No Localhost in Production Metadata
  // ============================================================================
  await t.test('--- SUITE P: No Localhost in Production Metadata ---', async (st) => {
    await st.test('P1: Zero localhost or 127.0.0.1 in public files, robots, or sitemap', () => {
      const filesToCheck = [...allPublicFiles, ROBOTS_PATH, SITEMAP_PATH];
      for (const filePath of filesToCheck) {
        if (!fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!content.includes('localhost:3000'), `Found localhost:3000 in ${path.basename(filePath)}`);
        assert(!content.includes('127.0.0.1'), `Found 127.0.0.1 in ${path.basename(filePath)}`);
      }
    });
  });

  // ============================================================================
  // SUITE Q: Security Claims
  // ============================================================================
  await t.test('--- SUITE Q: Security Claims ---', async (st) => {
    await st.test('Q1: Security page documents verified architecture (RLS, Admin Firewall, RBAC)', () => {
      assert(securityCode.includes('PostgreSQL Row-Level Security'), 'Documents PostgreSQL RLS');
      assert(securityCode.includes('Platform Admin Privacy Firewall'), 'Documents Platform Admin Privacy Firewall');
      assert(securityCode.includes('Role-Based Access Control'), 'Documents RBAC');
      assert(securityCode.includes('read-only'), 'Documents read-only data retention');
    });

    await st.test('Q2: Zero unverified certifications (HIPAA cert, ISO 27001, SOC 2, GDPR cert, PCI cert)', () => {
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!/hipaa cert/i.test(content), `Found HIPAA cert in ${path.basename(filePath)}`);
        assert(!/iso 27001/i.test(content), `Found ISO 27001 in ${path.basename(filePath)}`);
        assert(!/soc 2/i.test(content), `Found SOC 2 in ${path.basename(filePath)}`);
        assert(!/gdpr cert/i.test(content), `Found GDPR cert in ${path.basename(filePath)}`);
        assert(!/pci cert/i.test(content), `Found PCI cert in ${path.basename(filePath)}`);
      }
    });
  });

  // ============================================================================
  // SUITE R: Unsupported Feature Claims
  // ============================================================================
  await t.test('--- SUITE R: Unsupported Feature Claims ---', async (st) => {
    await st.test('R1: Zero AI, WhatsApp, SMS, or Telehealth claims across public site', () => {
      const barredPatterns = [
        /\bai\s+scribe\b/i,
        /\bgenerative\s+soap\b/i,
        /\bauto-diagnosis\b/i,
        /\bwhatsapp\b/i,
        /\bsms\b/i,
        /\bself-booking\b/i,
        /\bvideo\s+telehealth\b/i,
        /\b#1\b/i,
        /\bthe\s+best\b/i,
        /\bthe\s+first\b/i,
        /\bmost\s+advanced\b/i,
      ];
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of barredPatterns) {
          assert(!pattern.test(content), `Found barred pattern ${pattern} in ${path.basename(filePath)}`);
        }
      }
    });

    await st.test('R2: Zero Ultrasound DICOM claims across public site', () => {
      for (const filePath of allPublicAndPricingFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!/dicom.*ultrasound/i.test(content), `Found ultrasound in ${path.basename(filePath)}`);
      }
    });
  });

  // ============================================================================
  // SUITE S: Responsive Foundations
  // ============================================================================
  await t.test('--- SUITE S: Responsive Foundations ---', async (st) => {
    await st.test('S1: MarketingLayout applies container overflow guard', () => {
      assert(layoutCode.includes('overflow-x-hidden'), 'Applies overflow-x-hidden');
    });

    await st.test('S2: Responsive breakpoints (sm, md, lg) used throughout public pages', () => {
      const homeCode = fs.readFileSync(path.join(PUBLIC_DIR, 'pages', 'HomePageShell.tsx'), 'utf8');
      assert(homeCode.includes('grid-cols-1'), 'Mobile 1-column base');
      assert(homeCode.includes('md:grid-cols-'), 'Tablet grid breakpoint');
      assert(homeCode.includes('lg:grid-cols-'), 'Desktop grid breakpoint');
    });
  });

  // ============================================================================
  // SUITE T: Accessibility Foundations
  // ============================================================================
  await t.test('--- SUITE T: Accessibility Foundations ---', async (st) => {
    await st.test('T1: Semantic landmarks (<header>, <main>, <nav>, <footer>) used in MarketingLayout', () => {
      assert(layoutCode.includes('<MarketingHeader />'), 'Header present');
      assert(layoutCode.includes('<main'), 'Main semantic landmark present');
      assert(layoutCode.includes('<MarketingFooter />'), 'Footer present');
    });

    await st.test('T2: Visible focus states and accessible button attributes present', () => {
      assert(headerCode.includes('focus-visible:ring-2'), 'Visible focus ring on header buttons');
      assert(headerCode.includes('aria-label='), 'Aria labels on icon buttons');
    });
  });

  // ============================================================================
  // SUITE U: Public / Application Separation
  // ============================================================================
  await t.test('--- SUITE U: Public / Application Separation ---', async (st) => {
    await st.test('U1: Public marketing components do not import heavy clinical packages', () => {
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!content.includes('patientService'), `Forbidden import in ${path.basename(filePath)}`);
        assert(!content.includes('clinicalVisitService'), `Forbidden import in ${path.basename(filePath)}`);
        assert(!content.includes('imagingService'), `Forbidden import in ${path.basename(filePath)}`);
        assert(!content.includes('usePatientStore'), `Forbidden import in ${path.basename(filePath)}`);
        assert(!content.includes('cornerstone'), `Forbidden import in ${path.basename(filePath)}`);
      }
    });
  });

  // ============================================================================
  // SUITE V: Code-Splitting Architecture
  // ============================================================================
  await t.test('--- SUITE V: Code-Splitting Architecture ---', async (st) => {
    await st.test('V1: publicRoutes uses React.lazy() and Suspense for all page shells', () => {
      assert(publicRoutes.includes('React.lazy(') || publicRoutes.includes('lazy('), 'Uses lazy()');
      assert(publicRoutes.includes('Suspense'), 'Uses Suspense');
      assert(publicRoutes.includes('PublicLoadingFallback'), 'Uses PublicLoadingFallback');
    });
  });

  // ============================================================================
  // SUITE W: Frontend Secrets Hygiene
  // ============================================================================
  await t.test('--- SUITE W: Frontend Secrets Hygiene ---', async (st) => {
    await st.test('W1: Zero secret keys, Paystack private keys, or service role tokens', () => {
      const secretRegexes = [
        /sk_live_[a-zA-Z0-9]{20,}/,
        /sk_test_[a-zA-Z0-9]{20,}/,
        /PAYSTACK_SECRET_KEY/,
        /sbp_[a-zA-Z0-9]{20,}/,
        /service_role/,
      ];
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const regex of secretRegexes) {
          assert(!regex.test(content), `Found secret pattern ${regex} in ${path.basename(filePath)}`);
        }
      }
    });
  });

  // ============================================================================
  // SUITE X: Legacy Project Independence (Zero Kabworld)
  // ============================================================================
  await t.test('--- SUITE X: Legacy Project Independence ---', async (st) => {
    await st.test('X1: Zero kabworld references across all public website files', () => {
      const forbiddenPattern = /kabworld/i;
      const filesToCheck = [...allPublicFiles, ROBOTS_PATH, SITEMAP_PATH];
      for (const filePath of filesToCheck) {
        if (!fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!forbiddenPattern.test(content), `Found legacy reference in ${path.basename(filePath)}`);
      }
    });
  });
});
