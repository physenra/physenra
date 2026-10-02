// ==============================================================================
// PHYSENRA — WEBSITE PHASE 1B PUBLIC DESIGN SYSTEM & INTERACTIVE SHOWCASE TEST SUITE
// File: tests/website_phase1b_design.test.cjs
//
// Governs:
// A. Design primitives exist (BrowserFrame, StatusBadge, MetricCard, ClinicalPanel, ProductMockup, InteractiveShowcase)
// B. Public layout uses shared design primitives
// C. Homepage showcase exists
// D. Product mockup exists
// E. Interactive showcase states exist (clinical, scheduling, packages, imaging)
// F. Showcase uses static demo data (fictional patient records only)
// G. Showcase does not query Supabase
// H. Showcase does not import clinical stores
// I. No unsupported marketing claims (no "2-minute setup", no "trial guarantee")
// J. No AI, automated WhatsApp, SMS automation, patient self-booking, or video telehealth claims
// K. No fake testimonials
// L. No fake customer logos
// M. Pricing remains authoritative (Solo: 15k/150k, Pro: 30k/300k, Clinic: 50k/500k)
// N. Responsive classes/styles exist
// O. Accessibility attributes exist (role="tablist", role="tab", role="tabpanel", aria-selected)
// P. Reduced-motion handling & clean transitions
// Q. Legacy project independence (zero Kabworld references)
// R. Frontend secret hygiene (zero private keys or PATs)
// S. Heavy clinical dependencies remain isolated (zero CornerstoneJS or clinical stores in public routes)
// T. Existing application routes remain intact
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const PUBLIC_DIR = path.join(SRC_DIR, 'public');

// Component paths
const BROWSER_FRAME_PATH = path.join(PUBLIC_DIR, 'components', 'BrowserFrame.tsx');
const STATUS_BADGE_PATH = path.join(PUBLIC_DIR, 'components', 'StatusBadge.tsx');
const METRIC_CARD_PATH = path.join(PUBLIC_DIR, 'components', 'MetricCard.tsx');
const CLINICAL_PANEL_PATH = path.join(PUBLIC_DIR, 'components', 'ClinicalPanel.tsx');
const PRODUCT_MOCKUP_PATH = path.join(PUBLIC_DIR, 'components', 'ProductMockup.tsx');
const SHOWCASE_PATH = path.join(PUBLIC_DIR, 'components', 'InteractiveShowcase.tsx');
const HOMEPAGE_PATH = path.join(PUBLIC_DIR, 'pages', 'HomePageShell.tsx');
const FEATURE_DETAIL_PATH = path.join(PUBLIC_DIR, 'pages', 'FeatureDetailShell.tsx');
const TOKENS_PATH = path.join(PUBLIC_DIR, 'styles', 'tokens.ts');
const PLANS_PATH = path.join(PUBLIC_DIR, 'data', 'plans.ts');
const APP_TSX_PATH = path.join(SRC_DIR, 'App.tsx');

test('PHYSENRA — Website Phase 1B Design System & Interactive Showcase Verification', async (t) => {
  // Read component source files
  const browserFrame = fs.readFileSync(BROWSER_FRAME_PATH, 'utf8');
  const statusBadge = fs.readFileSync(STATUS_BADGE_PATH, 'utf8');
  const metricCard = fs.readFileSync(METRIC_CARD_PATH, 'utf8');
  const clinicalPanel = fs.readFileSync(CLINICAL_PANEL_PATH, 'utf8');
  const productMockup = fs.readFileSync(PRODUCT_MOCKUP_PATH, 'utf8');
  const showcase = fs.readFileSync(SHOWCASE_PATH, 'utf8');
  const homepage = fs.readFileSync(HOMEPAGE_PATH, 'utf8');
  const featureDetail = fs.readFileSync(FEATURE_DETAIL_PATH, 'utf8');
  const tokens = fs.readFileSync(TOKENS_PATH, 'utf8');
  const plans = fs.readFileSync(PLANS_PATH, 'utf8');
  const appTsx = fs.readFileSync(APP_TSX_PATH, 'utf8');

  // ============================================================================
  // SUITE A: Design Primitives Existence & Integrity
  // ============================================================================
  await t.test('--- SUITE A: Design Primitives Integrity ---', async (st) => {
    await st.test('A1: BrowserFrame primitive renders address bar and chrome header', () => {
      assert(browserFrame.includes('urlPath'), 'BrowserFrame supports urlPath prop');
      assert(browserFrame.includes('rounded-xl sm:rounded-2xl'), 'BrowserFrame enforces rounded radius tokens');
      assert(browserFrame.includes('bg-slate-50 border-b border-slate-200/80'), 'BrowserFrame renders chrome header');
    });

    await st.test('A2: StatusBadge primitive supports active, scheduled, pending, and critical variants', () => {
      assert(statusBadge.includes("'active'"), 'Supports active variant');
      assert(statusBadge.includes("'scheduled'"), 'Supports scheduled variant');
      assert(statusBadge.includes("'pending'"), 'Supports pending variant');
      assert(statusBadge.includes("'critical'"), 'Supports critical variant');
    });

    await st.test('A3: MetricCard primitive supports numeric display and delta badges', () => {
      assert(metricCard.includes('value'), 'MetricCard displays numeric value');
      assert(metricCard.includes('delta'), 'MetricCard supports optional delta indicator');
    });

    await st.test('A4: ClinicalPanel primitive renders sanitized SOAP notes and functional batteries', () => {
      assert(clinicalPanel.includes('VAS Pain'), 'Renders VAS pain score');
      assert(clinicalPanel.includes('ODI Score'), 'Renders Oswestry Disability Index');
      assert(clinicalPanel.includes('Lumbar Flexion'), 'Renders Range of Motion');
      assert(clinicalPanel.includes('Straight Leg Raise'), 'Renders special orthopaedic tests');
      assert(clinicalPanel.includes('Subjective (S)'), 'Renders Subjective section');
      assert(clinicalPanel.includes('Objective (O)'), 'Renders Objective section');
      assert(clinicalPanel.includes('Plan (P)'), 'Renders Plan section');
    });

    await st.test('A5: Design tokens module defines color, typography, radius, and spacing tokens', () => {
      assert(tokens.includes('brandTeal'), 'Defines brandTeal tokens');
      assert(tokens.includes('accentEmerald'), 'Defines accentEmerald tokens');
      assert(tokens.includes('neutralSlate'), 'Defines neutralSlate tokens');
      assert(tokens.includes('typography'), 'Defines typography scale');
    });
  });

  // ============================================================================
  // SUITE B: Public Layout Uses Shared Design Primitives
  // ============================================================================
  await t.test('--- SUITE B: Public Layout Uses Shared Primitives ---', async (st) => {
    await st.test('B1: HomePageShell imports and renders ProductMockup and InteractiveShowcase', () => {
      assert(homepage.includes('ProductMockup'), 'HomePageShell imports ProductMockup');
      assert(homepage.includes('<ProductMockup />'), 'HomePageShell mounts ProductMockup in hero');
      assert(homepage.includes('InteractiveShowcase'), 'HomePageShell imports InteractiveShowcase');
      assert(homepage.includes('<InteractiveShowcase />'), 'HomePageShell mounts InteractiveShowcase');
    });

    await st.test('B2: FeatureDetailShell renders tailored BrowserFrame product mockups', () => {
      assert(featureDetail.includes('BrowserFrame'), 'FeatureDetailShell uses BrowserFrame');
      assert(featureDetail.includes('renderFeatureVisual'), 'FeatureDetailShell dynamically renders feature visuals');
    });
  });

  // ============================================================================
  // SUITE C & D: Product Mockup & Interactive Showcase States
  // ============================================================================
  await t.test('--- SUITE C & D: Product Mockup & Showcase States ---', async (st) => {
    await st.test('C1: ProductMockup combines clinical encounter with package and imaging badges', () => {
      assert(productMockup.includes('BrowserFrame'), 'ProductMockup wraps in BrowserFrame');
      assert(productMockup.includes('Package Entitlement'), 'ProductMockup displays package badge');
      assert(productMockup.includes('Web DICOM PACS'), 'ProductMockup displays DICOM imaging badge');
      assert(productMockup.includes('Cobb Angle: 14.2°'), 'ProductMockup displays Cobb angle measurement');
    });

    await st.test('D1: InteractiveShowcase defines all 4 required product tabs', () => {
      assert(showcase.includes("id: 'clinical'"), 'Showcase defines clinical tab');
      assert(showcase.includes("id: 'scheduling'"), 'Showcase defines scheduling tab');
      assert(showcase.includes("id: 'packages'"), 'Showcase defines packages tab');
      assert(showcase.includes("id: 'imaging'"), 'Showcase defines imaging tab');
    });

    await st.test('D2: InteractiveShowcase scheduling tab demonstrates multi-practitioner columns', () => {
      assert(showcase.includes('Dr. K. Okonjo, PT'), 'Renders Practitioner 1 column');
      assert(showcase.includes('Dr. T. Balogun, PT'), 'Renders Practitioner 2 column');
      assert(showcase.includes('Bay 1'), 'Renders treatment bay 1 allocation');
      assert(showcase.includes('Bay 2'), 'Renders treatment bay 2 allocation');
    });

    await st.test('D3: InteractiveShowcase packages tab demonstrates atomic entitlement and deposit wallets', () => {
      assert(showcase.includes('Post-Op Spinal Rehabilitation Bundle'), 'Renders package name');
      assert(showcase.includes('of 10 sessions remaining'), 'Renders session entitlement');
      assert(showcase.includes('Patient Deposit Wallet'), 'Renders deposit wallet balance');
      assert(showcase.includes('₦120,000.00'), 'Renders credit balance');
    });

    await st.test('D4: InteractiveShowcase imaging tab demonstrates zero-footprint PACS and Cobb calipers', () => {
      assert(showcase.includes('CornerstoneJS Zero-Footprint'), 'Renders CornerstoneJS PACS attribution');
      assert(showcase.includes('Cobb Angle Scoliosis Caliper'), 'Renders Cobb angle caliper');
      assert(showcase.includes('14.2°'), 'Renders angle measurement');
      assert(showcase.includes('WW: 850 • WL: 320'), 'Renders window leveling parameters');
    });
  });

  // ============================================================================
  // SUITE E, F, G, H: Data Isolation & Static Hygiene
  // ============================================================================
  await t.test('--- SUITE E, F, G, H: Data Isolation & Static Demo Data ---', async (st) => {
    await st.test('E1: Showcase and Product Mockup use purely fictional patient records', () => {
      assert(showcase.includes('Adaeze N.'), 'Uses fictional patient identifier');
      assert(!showcase.includes('John Doe'), 'Avoids lazy Western placeholder names');
      assert(!productMockup.includes('John Doe'), 'Avoids lazy Western placeholder names');
    });

    await st.test('F1: Showcase does NOT import or query Supabase client', () => {
      assert(!showcase.includes('@supabase/supabase-js'), 'Showcase has zero Supabase import');
      assert(!showcase.includes('supabase.from'), 'Showcase executes zero Supabase queries');
      assert(!clinicalPanel.includes('supabase.from'), 'ClinicalPanel executes zero Supabase queries');
      assert(!productMockup.includes('supabase.from'), 'ProductMockup executes zero Supabase queries');
    });

    await st.test('G1: Showcase does NOT import clinical stores or services', () => {
      assert(!showcase.includes('patientService'), 'Zero patientService import');
      assert(!showcase.includes('clinicalVisitService'), 'Zero clinicalVisitService import');
      assert(!showcase.includes('usePatientStore'), 'Zero usePatientStore import');
      assert(!showcase.includes('useVisitStore'), 'Zero useVisitStore import');
    });
  });

  // ============================================================================
  // SUITE I, J, K, L: Claim Safety & Marketing Authenticity
  // ============================================================================
  await t.test('--- SUITE I, J, K, L: Claim Safety & Authenticity ---', async (st) => {
    const getAllFiles = (dir) => {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat && stat.isDirectory()) {
          results = results.concat(getAllFiles(full));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          results.push(full);
        }
      });
      return results;
    };
    const allPublicFiles = getAllFiles(PUBLIC_DIR);
    const pricingPagePath = path.join(SRC_DIR, 'pages', 'public', 'PricingPage.tsx');
    if (fs.existsSync(pricingPagePath)) {
      allPublicFiles.push(pricingPagePath);
    }

    await st.test('I1: Neutralized claims: zero unapproved "2-minute setup" or "trial guarantee" claims', () => {
      assert(!homepage.includes('2-minute practice setup'), 'Removed 2-minute practice setup');
      assert(!homepage.includes('2-minute setup'), 'Removed 2-minute setup');
      assert(!homepage.includes('Read-Only Data Guarantee'), 'Neutralized to Read-Only Access Architecture');
    });

    await st.test('I2: Zero unsupported guarantees across public website files', () => {
      const publicWebsiteFiles = getAllFiles(PUBLIC_DIR);
      for (const filePath of publicWebsiteFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim().startsWith('//') || line.trim().startsWith('{/*')) continue;
          assert(!/\bguarantees?\b/i.test(line), `Unsupported guarantee found in ${path.basename(filePath)}:${i + 1}`);
          assert(!/\bguaranteed\b/i.test(line), `Unsupported guaranteed found in ${path.basename(filePath)}:${i + 1}`);
        }
      }
    });

    await st.test('J1: Zero prohibited claims across public components (AI, WhatsApp, SMS, Video, Self-Booking)', () => {
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!/ai clinical scribe/i.test(content), `Found forbidden AI claim in ${filePath}`);
        assert(!/automated whatsapp/i.test(content), `Found forbidden WhatsApp claim in ${filePath}`);
        assert(!/whatsapp integration/i.test(content), `Found forbidden WhatsApp claim in ${filePath}`);
        assert(!/whatsapp/i.test(content), `Found forbidden WhatsApp mention in ${filePath}`);
        assert(!/sms appointment reminder/i.test(content), `Found forbidden SMS claim in ${filePath}`);
        assert(!/sms automation/i.test(content), `Found forbidden SMS automation in ${filePath}`);
        assert(!/video telehealth/i.test(content), `Found forbidden Video Telehealth claim in ${filePath}`);
        assert(!/patient self-booking portal/i.test(content), `Found forbidden Self-Booking claim in ${filePath}`);
      }
    });

    await st.test('K1: Zero fake customer testimonials or reviews in public pages', () => {
      assert(!homepage.includes('Loved by 10,000+ doctors'), 'Zero fake customer claim');
      assert(!homepage.includes('Testimonial:'), 'Zero unverified testimonials');
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!/5-star rating/i.test(content), `Found fake rating in ${filePath}`);
        assert(!/rated 4\.[89]\/5/i.test(content), `Found fake rating in ${filePath}`);
      }
    });

    await st.test('L1: Zero fake customer logos or unverified hospital endorsements', () => {
      assert(!homepage.includes('hospital-logo-1.png'), 'Zero fake logo assets');
      assert(!homepage.includes('Mayo Clinic'), 'Zero fake hospital endorsement');
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!/Johns Hopkins/i.test(content), `Found fake hospital endorsement in ${filePath}`);
        assert(!/Cleveland Clinic/i.test(content), `Found fake hospital endorsement in ${filePath}`);
      }
    });

    await st.test('L2: Zero unsupported awards or unverified certifications', () => {
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!/#1 physiotherapy software/i.test(content), `Found unverified #1 claim in ${filePath}`);
        assert(!/award-winning/i.test(content), `Found unverified award claim in ${filePath}`);
        assert(!/hipaa certified/i.test(content), `Found unverified HIPAA certification claim in ${filePath}`);
        assert(!/iso certified/i.test(content), `Found unverified ISO certification claim in ${filePath}`);
        assert(!/soc 2 certified/i.test(content), `Found unverified SOC 2 certification claim in ${filePath}`);
      }
    });
  });

  // ============================================================================
  // SUITE M: Authoritative Pricing Integrity
  // ============================================================================
  await t.test('--- SUITE M: Authoritative Pricing Integrity ---', async (st) => {
    await st.test('M1: Solo plan matches authoritative backend values (₦15,000/mo, ₦150,000/yr, 1 seat, 14-day trial)', () => {
      assert(plans.includes('code: \'solo\''), 'Defines solo plan');
      assert(plans.includes('monthlyNaira: 15000'), 'Solo is 15,000 monthly');
      assert(plans.includes('annualNaira: 150000'), 'Solo is 150,000 annual');
      assert(plans.includes('seats: 1'), 'Solo has 1 seat');
      assert(plans.includes('trialDays: 14'), 'Solo has 14-day trial');
    });

    await st.test('M2: Professional plan matches authoritative backend values (₦30,000/mo, ₦300,000/yr, 5 seats, 14-day trial)', () => {
      assert(plans.includes('code: \'professional\''), 'Defines professional plan');
      assert(plans.includes('monthlyNaira: 30000'), 'Professional is 30,000 monthly');
      assert(plans.includes('annualNaira: 300000'), 'Professional is 300,000 annual');
      assert(plans.includes('seats: 5'), 'Professional has 5 seats');
      assert(plans.includes('trialDays: 14'), 'Professional has 14-day trial');
    });

    await st.test('M3: Clinic plan matches authoritative backend values (₦50,000/mo, ₦500,000/yr, 10 seats, 14-day trial)', () => {
      assert(plans.includes('code: \'clinic\''), 'Defines clinic plan');
      assert(plans.includes('monthlyNaira: 50000'), 'Clinic is 50,000 monthly');
      assert(plans.includes('annualNaira: 500000'), 'Clinic is 500,000 annual');
      assert(plans.includes('seats: 10'), 'Clinic has 10 seats');
      assert(plans.includes('trialDays: 14'), 'Clinic has 14-day trial');
    });

    await st.test('M4: Enterprise plan specifies custom pricing', () => {
      assert(plans.includes('code: \'enterprise\''), 'Defines enterprise plan');
      assert(plans.includes('monthlyNaira: 0'), 'Enterprise monthly is custom (0 in numeric model)');
      assert(plans.includes('annualNaira: 0'), 'Enterprise annual is custom (0 in numeric model)');
    });

    await st.test('M5: Barred unapproved prices (₦35,000 or ₦65,000)', () => {
      assert(!plans.includes('35000'), 'Strictly no 35,000 in plans catalog');
      assert(!plans.includes('65000'), 'Strictly no 65,000 in plans catalog');
      assert(!homepage.includes('35000') && !homepage.includes('35,000'), 'No 35k on homepage');
      assert(!homepage.includes('65000') && !homepage.includes('65,000'), 'No 65k on homepage');
    });

    await st.test('M6: Barred unapproved ₦3,000 extra-seat pricing & extra-seat claims', () => {
      const allPublicFiles = [
        HOMEPAGE_PATH,
        SHOWCASE_PATH,
        PRODUCT_MOCKUP_PATH,
        FEATURE_DETAIL_PATH,
        PLANS_PATH,
        path.join(PUBLIC_DIR, 'pages', 'SecurityPageShell.tsx'),
        path.join(PUBLIC_DIR, 'pages', 'AboutPageShell.tsx'),
        path.join(PUBLIC_DIR, 'pages', 'FAQPageShell.tsx'),
        path.join(PUBLIC_DIR, 'pages', 'ContactPageShell.tsx'),
        path.join(PUBLIC_DIR, 'pages', 'TermsPageShell.tsx'),
        path.join(PUBLIC_DIR, 'pages', 'PrivacyPageShell.tsx'),
        path.join(SRC_DIR, 'pages', 'public', 'PricingPage.tsx'),
      ];
      for (const filePath of allPublicFiles) {
        if (!fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!/extra seat/i.test(content), `Found unsupported extra seat claim in ${filePath}`);
        assert(!/additional seat/i.test(content), `Found unsupported additional seat claim in ${filePath}`);
        assert(!/3,?000\s*\/\s*(?:extra|additional)?\s*seat/i.test(content), `Found 3,000 extra seat pricing in ${filePath}`);
      }
    });
  });

  // ============================================================================
  // SUITE N & O & P: Responsive Design & Accessibility
  // ============================================================================
  await t.test('--- SUITE N, O, P: Responsive Design & Accessibility ---', async (st) => {
    await st.test('N1: Showcase tablist includes overflow protection and touch scrollbar classes', () => {
      assert(showcase.includes('overflow-x-auto'), 'Showcase tabs support touch scrolling');
      assert(showcase.includes('shrink-0'), 'Tabs do not compress illegibly');
    });

    await st.test('O1: InteractiveShowcase implements full WAI-ARIA tab semantics', () => {
      assert(showcase.includes('role="tablist"'), 'Implements tablist role');
      assert(showcase.includes('role="tab"'), 'Implements tab role');
      assert(showcase.includes('role="tabpanel"'), 'Implements tabpanel role');
      assert(showcase.includes('aria-selected='), 'Implements aria-selected attribute');
      assert(showcase.includes('aria-controls='), 'Implements aria-controls link');
      assert(showcase.includes('focus-visible:ring-2'), 'Implements visible keyboard focus rings');
    });

    await st.test('P1: Buttons and tabs use clean, unbloated CSS transitions', () => {
      assert(showcase.includes('transition-all'), 'Showcase uses clean CSS transitions');
      assert(!showcase.includes('animate-bounce'), 'No distracting bouncing animations');
    });
  });

  // ============================================================================
  // SUITE Q, R, S, T: Security, Independence & Upstream Regression
  // ============================================================================
  await t.test('--- SUITE Q, R, S, T: Security & Project Independence ---', async (st) => {
    await st.test('Q1: Zero Kabworld references across public codebase', () => {
      const forbiddenPattern = new RegExp(['k', 'a', 'b', 'w', 'o', 'r', 'l', 'd'].join(''), 'i');
      function scan(dir) {
        for (const file of fs.readdirSync(dir)) {
          const fp = path.join(dir, file);
          if (fs.statSync(fp).isDirectory()) scan(fp);
          else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
            const content = fs.readFileSync(fp, 'utf8');
            assert(!forbiddenPattern.test(content), `Found forbidden word in ${fp}`);
          }
        }
      }
      scan(PUBLIC_DIR);
    });

    await st.test('R1: Zero frontend secrets or private keys in public components', () => {
      const secretPatterns = [/sk_live_/, /sk_test_/, /PAYSTACK_SECRET_KEY/, /sbp_/, /service_role/];
      function scan(dir) {
        for (const file of fs.readdirSync(dir)) {
          const fp = path.join(dir, file);
          if (fs.statSync(fp).isDirectory()) scan(fp);
          else if (/\.(ts|tsx)$/.test(file)) {
            const content = fs.readFileSync(fp, 'utf8');
            for (const p of secretPatterns) {
              assert(!p.test(content), `Potential secret in ${fp}: ${p}`);
            }
          }
        }
      }
      scan(PUBLIC_DIR);
    });

    await st.test('S1: Heavy clinical packages are quarantined from public components', () => {
      function scan(dir) {
        for (const file of fs.readdirSync(dir)) {
          const fp = path.join(dir, file);
          if (fs.statSync(fp).isDirectory()) scan(fp);
          else if (/\.(ts|tsx)$/.test(file)) {
            const content = fs.readFileSync(fp, 'utf8');
            assert(!content.includes('@cornerstonejs'), `CornerstoneJS must not be imported in ${fp}`);
            assert(!content.includes('chart.js'), `Chart.js must not be imported in ${fp}`);
          }
        }
      }
      scan(PUBLIC_DIR);
    });

    await st.test('T1: Existing application routes in App.tsx remain completely intact', () => {
      assert(appTsx.includes('path="/app"'), 'App.tsx maintains /app route');
      assert(appTsx.includes('path="/platform"'), 'App.tsx maintains /platform route');
      assert(appTsx.includes('path="/login"'), 'App.tsx maintains /login route');
      assert(appTsx.includes('path="/signup"'), 'App.tsx maintains /signup route');
      assert(appTsx.includes('path="/register-practice"'), 'App.tsx maintains /register-practice route');
      assert(appTsx.includes('path="/pricing"'), 'App.tsx maintains /pricing route');
    });
  });
});
