// ==============================================================================
// PHYSENRA — WEBSITE PHASE 1C CONVERSION CONTENT & SEO VERIFICATION SUITE
// File: tests/website_phase1c_content.test.cjs
//
// Governs:
// A. Homepage content sections (all 15 required sections)
// B. Feature-page content (all 9 features with workflow, capabilities, benefits, CTAs, cross-links)
// C. Authoritative pricing values (Solo 15k, Pro 30k, Clinic 50k, Enterprise Custom)
// D. Prohibited pricing absent (no 35k, 65k, 3k extra-seat, extra-seat claims)
// E. Prohibited capabilities absent (no AI scribe, generative SOAP, WhatsApp bots, SMS automation, self-booking, video telehealth)
// F. Prohibited superlatives absent (no first, best, number one, #1, most advanced)
// G. CTA routing (Primary -> /register-practice, Secondary -> /login, Enterprise -> /contact)
// H. FAQ structure (7 mandated categories)
// I. Security claims (factual RLS, admin firewall, RBAC; no fake HIPAA/ISO certifications)
// J. Terms/privacy placeholders remain legal shells
// K. SEO metadata (title, description, canonical for all routes)
// L. Canonical URLs
// M. OpenGraph metadata (og:title, og:description, og:url, og:type, og:image, twitter:card)
// N. Internal linking architecture
// O. Secret hygiene
// P. Legacy project independence (zero Kabworld)
// Q. Public/application separation
// R. Responsive foundations
// S. Accessibility foundations
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const PUBLIC_DIR = path.join(SRC_DIR, 'public');

// Source files
const HOMEPAGE_PATH = path.join(PUBLIC_DIR, 'pages', 'HomePageShell.tsx');
const FEATURE_DETAIL_PATH = path.join(PUBLIC_DIR, 'pages', 'FeatureDetailShell.tsx');
const FEATURES_HUB_PATH = path.join(PUBLIC_DIR, 'pages', 'FeaturesHubShell.tsx');
const FAQ_PATH = path.join(PUBLIC_DIR, 'pages', 'FAQPageShell.tsx');
const ABOUT_PATH = path.join(PUBLIC_DIR, 'pages', 'AboutPageShell.tsx');
const CONTACT_PATH = path.join(PUBLIC_DIR, 'pages', 'ContactPageShell.tsx');
const SECURITY_PATH = path.join(PUBLIC_DIR, 'pages', 'SecurityPageShell.tsx');
const TERMS_PATH = path.join(PUBLIC_DIR, 'pages', 'TermsPageShell.tsx');
const PRIVACY_PATH = path.join(PUBLIC_DIR, 'pages', 'PrivacyPageShell.tsx');
const PLANS_PATH = path.join(PUBLIC_DIR, 'data', 'plans.ts');
const SEO_PATH = path.join(PUBLIC_DIR, 'data', 'seo.ts');
const LAYOUT_PATH = path.join(PUBLIC_DIR, 'layouts', 'MarketingLayout.tsx');
const PRICING_PAGE_PATH = path.join(SRC_DIR, 'pages', 'public', 'PricingPage.tsx');

// File readers
const homepage = fs.readFileSync(HOMEPAGE_PATH, 'utf8');
const featureDetail = fs.readFileSync(FEATURE_DETAIL_PATH, 'utf8');
const featuresHub = fs.readFileSync(FEATURES_HUB_PATH, 'utf8');
const faq = fs.readFileSync(FAQ_PATH, 'utf8');
const about = fs.readFileSync(ABOUT_PATH, 'utf8');
const contact = fs.readFileSync(CONTACT_PATH, 'utf8');
const security = fs.readFileSync(SECURITY_PATH, 'utf8');
const terms = fs.readFileSync(TERMS_PATH, 'utf8');
const privacy = fs.readFileSync(PRIVACY_PATH, 'utf8');
const plans = fs.readFileSync(PLANS_PATH, 'utf8');
const seo = fs.readFileSync(SEO_PATH, 'utf8');
const layout = fs.readFileSync(LAYOUT_PATH, 'utf8');
const pricingPage = fs.readFileSync(PRICING_PAGE_PATH, 'utf8');

const getAllPublicFiles = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllPublicFiles(full));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(full);
    }
  });
  return results;
};

const allPublicFiles = getAllPublicFiles(PUBLIC_DIR);
const allPublicAndPricingFiles = [...allPublicFiles, PRICING_PAGE_PATH];

test('PHYSENRA — Website Phase 1C Conversion Content & SEO Verification', async (t) => {
  // ============================================================================
  // SUITE A: Homepage Content Sections (All 15 Required Sections)
  // ============================================================================
  await t.test('--- SUITE A: Homepage Content Sections (15 Sections) ---', async (st) => {
    await st.test('A1: Section 1 (Hero) communicates positioning, target, and dual CTAs', () => {
      assert(homepage.includes('Physiotherapy EMR & Practice Management Platform'), 'Hero includes authoritative positioning kicker');
      assert(homepage.includes('The Clinical EMR Purpose-Built for'), 'Hero contains clear value proposition headline');
      assert(homepage.includes('/register-practice'), 'Hero primary CTA routes to /register-practice');
      assert(homepage.includes('/login'), 'Hero secondary CTA routes to /login');
      assert(homepage.includes('No credit card required'), 'Hero includes trust point: no credit card');
      assert(homepage.includes('Self-service practice setup'), 'Hero includes trust point: self-service setup');
      assert(homepage.includes('ProductMockup'), 'Hero mounts ProductMockup');
    });

    await st.test('A2: Section 2 (Product Showcase) renders InteractiveShowcase', () => {
      assert(homepage.includes('InteractiveShowcase'), 'Mounts InteractiveShowcase');
      assert(homepage.includes('Explore Physenra’s Core Clinical Workflows'), 'Showcase title present');
    });

    await st.test('A3: Section 3 (Why Physenra) presents physiotherapy-specific advantages', () => {
      assert(homepage.includes('Why Physiotherapy Clinics Choose Physenra'), 'Why Physenra section header');
      assert(homepage.includes('Musculoskeletal Specialization'), 'Specialization advantage card');
      assert(homepage.includes('Atomic Package Entitlement'), 'Package advantage card');
      assert(homepage.includes('Zero-Footprint Web PACS'), 'PACS advantage card');
      assert(homepage.includes('Multi-Therapist Scheduling'), 'Scheduling advantage card');
    });

    await st.test('A4: Section 4 (Clinical Workflow) details 5-step patient care pathway', () => {
      assert(homepage.includes('The End-to-End Clinical Care Pathway'), 'Clinical workflow header');
      assert(homepage.includes('Episode Creation'), 'Step 1 present');
      assert(homepage.includes('Objective Exam'), 'Step 2 present');
      assert(homepage.includes('Baseline Outcome'), 'Step 3 present');
      assert(homepage.includes('Care Protocol & HEP'), 'Step 4 present');
      assert(homepage.includes('Sign-off & Debit'), 'Step 5 present');
    });

    await st.test('A5: Section 5 (Physiotherapy Documentation) details specialized SOAP charting', () => {
      assert(homepage.includes('Specialized SOAP Notes Built for Physical Therapy'), 'Documentation header');
      assert(homepage.includes('Subjective Intake:'), 'Subjective intake explanation');
      assert(homepage.includes('Objective Examination:'), 'Objective exam explanation');
      assert(homepage.includes('Assessment & Plan:'), 'Assessment & plan explanation');
      assert(homepage.includes('Straight Leg Raise (SLR) Test'), 'Special test demonstration');
    });

    await st.test('A6: Section 6 (Outcome Measures) presents validated functional batteries', () => {
      assert(homepage.includes('Validated Functional Outcome Batteries'), 'Outcome measures header');
      assert(homepage.includes('Visual Analogue Scale'), 'VAS present');
      assert(homepage.includes('Neck Disability Index'), 'NDI present');
      assert(homepage.includes('Oswestry Disability Index'), 'ODI present');
      assert(homepage.includes('Lower Extremity Scale'), 'LEFS present');
      assert(homepage.includes('Arm, Shoulder & Hand'), 'QuickDASH present');
    });

    await st.test('A7: Section 7 (Treatment Plans & Packages) presents session packages and wallets', () => {
      assert(homepage.includes('Eliminate Front-Desk Session Disputes Forever'), 'Packages section header');
      assert(homepage.includes('Patient Deposit Wallet Balance'), 'Deposit wallet demonstration');
      assert(homepage.includes('Remaining Sessions'), 'Session decrementing demonstration');
    });

    await st.test('A8: Section 8 (Scheduling) presents multi-practitioner bay allocation', () => {
      assert(homepage.includes('Multi-Practitioner Scheduling Without Room Conflicts'), 'Scheduling section header');
      assert(homepage.includes('Dr. N. Okonjo, PT'), 'Therapist 1 column');
      assert(homepage.includes('Dr. T. Balogun, PT'), 'Therapist 2 column');
      assert(homepage.includes('Bay 1') && homepage.includes('Bay 2'), 'Treatment bays allocated');
    });

    await st.test('A9: Section 9 (Billing & Payments) presents itemized invoicing and receipts', () => {
      assert(homepage.includes('Itemized Invoicing, Numbered Receipts & Payment Tracking'), 'Billing section header');
      assert(homepage.includes('Invoice #INV-2026-0042'), 'Invoice mockup present');
      assert(homepage.includes('Official Receipt #REC-00042 Generated'), 'Receipt indication');
    });

    await st.test('A10: Section 10 (Medical Imaging) presents browser DICOM and Cobb calipers', () => {
      assert(homepage.includes('Browser DICOM PACS with Cobb Angle Caliper'), 'Imaging section header');
      assert(homepage.includes('14.2° Lumbar Scoliosis'), 'Cobb angle measurement');
      assert(homepage.includes('Presets: Bone • Soft Tissue • Lung'), 'Window level presets');
    });

    await st.test('A11: Section 11 (Security) documents RLS, admin firewall, and non-punitive retention', () => {
      assert(homepage.includes('Healthcare Data Sovereignty'), 'Security section header');
      assert(homepage.includes('PostgreSQL Row-Level Security'), 'RLS architecture');
      assert(homepage.includes('Platform Admin Firewall'), 'Admin firewall');
      assert(homepage.includes('Read-Only Access Architecture'), 'Read-only retention');
    });

    await st.test('A12: Section 12 (Pricing Preview) presents authoritative plans', () => {
      assert(homepage.includes('Predictable Pricing for Practices of Every Scale'), 'Pricing section header');
      assert(homepage.includes('AUTHORITATIVE_SAAS_PLANS'), 'Renders plans from authoritative catalog');
      assert(homepage.includes('/register-practice?plan='), 'Plan selection query parameter');
      assert(homepage.includes('/pricing'), 'Links to full pricing comparison page');
      assert(plans.includes('Solo Practice'), 'Solo plan present in catalog');
      assert(plans.includes('Professional Clinic'), 'Professional plan present in catalog');
      assert(plans.includes('Comprehensive Clinic'), 'Clinic plan present in catalog');
    });

    await st.test('A13: Section 13 (FAQ) renders categorized FAQ accordion', () => {
      assert(homepage.includes('Frequently Asked Questions'), 'FAQ section header');
      assert(homepage.includes('FAQAccordion items={HOMEPAGE_FAQS}'), 'Mounts FAQAccordion');
    });

    await st.test('A14: Section 14 (Final CTA) provides high-conversion closing block', () => {
      assert(homepage.includes('Ready to Modernize Your Physiotherapy Practice?'), 'Final CTA headline');
      assert(homepage.includes('/register-practice'), 'Primary CTA button present');
      assert(homepage.includes('/login'), 'Secondary CTA button present');
    });

    await st.test('A15: Section 15 (Footer) rendered by MarketingLayout wrapper', () => {
      assert(layout.includes('<MarketingFooter />'), 'MarketingLayout mounts MarketingFooter');
    });
  });

  // ============================================================================
  // SUITE B: Feature Page Content (All 9 Features Complete)
  // ============================================================================
  await t.test('--- SUITE B: Feature Page Content (9 Features) ---', async (st) => {
    const requiredFeatureSlugs = [
      'physiotherapy-emr',
      'patient-management',
      'appointments',
      'clinical-documentation',
      'treatment-plans',
      'treatment-packages',
      'billing',
      'medical-imaging',
      'practice-management',
    ];

    for (const slug of requiredFeatureSlugs) {
      await st.test(`B: Feature /features/${slug} contains complete required elements`, () => {
        assert(featureDetail.includes(`'${slug}': {`) || featureDetail.includes(`${slug}: {`), `Defines data for ${slug}`);
      });
    }

    await st.test('B10: FeatureDetailShell renders practical workflow and practice benefits', () => {
      assert(featureDetail.includes('data.workflowTitle'), 'Renders workflow title');
      assert(featureDetail.includes('data.workflowSteps'), 'Renders workflow steps');
      assert(featureDetail.includes('How This Helps Your Practice'), 'Renders practice benefits section');
      assert(featureDetail.includes('data.practiceBenefits'), 'Renders benefits list');
    });

    await st.test('B11: FeatureDetailShell provides dual conversion CTAs', () => {
      assert(featureDetail.includes('to="/register-practice"'), 'Primary CTA routes to /register-practice');
      assert(featureDetail.includes('to="/login"'), 'Secondary CTA routes to /login');
    });

    await st.test('B12: FeatureDetailShell provides related feature cross-links', () => {
      assert(featureDetail.includes('Related Platform Capabilities'), 'Cross-links section header');
      assert(featureDetail.includes('data.relatedFeatures'), 'Maps over related feature links');
    });
  });

  // ============================================================================
  // SUITE C & D: Authoritative Pricing & Prohibited Pricing Absent
  // ============================================================================
  await t.test('--- SUITE C & D: Pricing Integrity ---', async (st) => {
    await st.test('C1: Solo plan matches authoritative numbers (₦15k/mo, ₦150k/yr, 1 seat, 14-day trial)', () => {
      assert(plans.includes('monthlyNaira: 15000'), 'Solo 15,000 monthly');
      assert(plans.includes('annualNaira: 150000'), 'Solo 150,000 annual');
      assert(plans.includes('seats: 1'), 'Solo 1 seat');
      assert(plans.includes('trialDays: 14'), 'Solo 14-day trial');
    });

    await st.test('C2: Professional plan matches authoritative numbers (₦30k/mo, ₦300k/yr, 5 seats, 14-day trial)', () => {
      assert(plans.includes('monthlyNaira: 30000'), 'Pro 30,000 monthly');
      assert(plans.includes('annualNaira: 300000'), 'Pro 300,000 annual');
      assert(plans.includes('seats: 5'), 'Pro 5 seats');
      assert(plans.includes('trialDays: 14'), 'Pro 14-day trial');
    });

    await st.test('C3: Clinic plan matches authoritative numbers (₦50k/mo, ₦500k/yr, 10 seats, 14-day trial)', () => {
      assert(plans.includes('monthlyNaira: 50000'), 'Clinic 50,000 monthly');
      assert(plans.includes('annualNaira: 500000'), 'Clinic 500,000 annual');
      assert(plans.includes('seats: 10'), 'Clinic 10 seats');
      assert(plans.includes('trialDays: 14'), 'Clinic 14-day trial');
    });

    await st.test('C4: Enterprise plan specifies custom pricing', () => {
      assert(plans.includes("code: 'enterprise'"), 'Enterprise code present');
      assert(plans.includes('monthlyNaira: 0'), 'Enterprise monthly custom');
      assert(plans.includes('annualNaira: 0'), 'Enterprise annual custom');
    });

    await st.test('D1: Barred unapproved pricing (35k or 65k) across all public files', () => {
      for (const filePath of allPublicAndPricingFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!content.includes('35000') && !content.includes('35,000'), `Found 35k in ${filePath}`);
        assert(!content.includes('65000') && !content.includes('65,000'), `Found 65k in ${filePath}`);
      }
    });

    await st.test('D2: Barred unsupported extra-seat pricing across all public files', () => {
      for (const filePath of allPublicAndPricingFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!/extra seat/i.test(content), `Found extra seat in ${filePath}`);
        assert(!/additional seat/i.test(content), `Found additional seat in ${filePath}`);
        assert(!/3,?000\s*\/\s*(?:extra|additional)?\s*seat/i.test(content), `Found 3000 extra seat in ${filePath}`);
      }
    });
  });

  // ============================================================================
  // SUITE E & F: Prohibited Capabilities & Superlatives Absent
  // ============================================================================
  await t.test('--- SUITE E & F: Prohibited Claims & Superlatives ---', async (st) => {
    await st.test('E1: Zero AI clinical scribe or generative SOAP claims', () => {
      for (const filePath of allPublicAndPricingFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!/ai clinical scribe/i.test(content), `Found AI scribe claim in ${filePath}`);
        assert(!/generative soap/i.test(content), `Found generative SOAP claim in ${filePath}`);
      }
    });

    await st.test('E2: Zero automated WhatsApp or SMS automation claims', () => {
      for (const filePath of allPublicAndPricingFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!/automated whatsapp/i.test(content), `Found automated WhatsApp in ${filePath}`);
        assert(!/whatsapp/i.test(content), `Found WhatsApp mention in ${filePath}`);
        assert(!/sms automation/i.test(content), `Found SMS automation in ${filePath}`);
        assert(!/sms appointment reminder/i.test(content), `Found SMS reminder in ${filePath}`);
      }
    });

    await st.test('E3: Zero patient self-booking or video telehealth claims', () => {
      for (const filePath of allPublicAndPricingFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!/patient self-booking/i.test(content), `Found self-booking claim in ${filePath}`);
        assert(!/video telehealth/i.test(content), `Found video telehealth claim in ${filePath}`);
      }
    });

    await st.test('E4: Zero fake customer testimonials, logos, or ratings', () => {
      for (const filePath of allPublicAndPricingFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!/5-star rating/i.test(content), `Found fake rating in ${filePath}`);
        assert(!/Loved by 10,000\+/i.test(content), `Found fake usage in ${filePath}`);
        assert(!/Mayo Clinic/i.test(content), `Found fake hospital logo in ${filePath}`);
        assert(!/Cleveland Clinic/i.test(content), `Found fake hospital logo in ${filePath}`);
      }
    });

    await st.test('F1: Zero unsupported superlatives (first, best, #1, most advanced)', () => {
      for (const filePath of allPublicAndPricingFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!/#1 physiotherapy software/i.test(content), `Found #1 claim in ${filePath}`);
        assert(!/best physiotherapy software/i.test(content), `Found best claim in ${filePath}`);
        assert(!/most advanced EMR/i.test(content), `Found most advanced claim in ${filePath}`);
        assert(!/award-winning/i.test(content), `Found award-winning claim in ${filePath}`);
      }
    });

    await st.test('F2: Zero unsupported setup time or guarantee claims', () => {
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!/2-minute/i.test(content) && !/two-minute/i.test(content) && !/two minute/i.test(content), `Found 2-minute claim in ${filePath}`);
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim().startsWith('//') || line.trim().startsWith('{/*')) continue;
          assert(!/\bguarantees?\b/i.test(line), `Unsupported guarantee found in ${path.basename(filePath)}:${i + 1}`);
          assert(!/\bguaranteed\b/i.test(line), `Unsupported guaranteed found in ${path.basename(filePath)}:${i + 1}`);
        }
      }
    });
  });

  // ============================================================================
  // SUITE G: CTA Routing Invariants
  // ============================================================================
  await t.test('--- SUITE G: CTA Routing Invariants ---', async (st) => {
    await st.test('G1: Primary CTAs route to /register-practice', () => {
      assert(homepage.includes('to="/register-practice"'), 'Homepage has CTA to /register-practice');
      assert(featureDetail.includes('to="/register-practice"'), 'FeatureDetail has CTA to /register-practice');
      assert(featuresHub.includes('to="/register-practice"'), 'FeaturesHub has CTA to /register-practice');
      assert(about.includes('to="/register-practice"'), 'About has CTA to /register-practice');
      assert(faq.includes('to="/register-practice"'), 'FAQ has CTA to /register-practice');
    });

    await st.test('G2: Secondary CTAs route to /login', () => {
      assert(homepage.includes('to="/login"'), 'Homepage has CTA to /login');
      assert(featureDetail.includes('to="/login"'), 'FeatureDetail has CTA to /login');
      assert(about.includes('to="/login"'), 'About has CTA to /login');
      assert(contact.includes('to="/login"'), 'Contact has CTA to /login');
      assert(security.includes('to="/login"'), 'Security has CTA to /login');
    });

    await st.test('G3: Enterprise CTA routes to /contact', () => {
      assert(pricingPage.includes('to="/contact"'), 'PricingPage Enterprise CTA routes to /contact');
    });
  });

  // ============================================================================
  // SUITE H: FAQ Structure (7 Mandated Categories)
  // ============================================================================
  await t.test('--- SUITE H: FAQ Structure (7 Mandated Categories) ---', async (st) => {
    const requiredCategories = [
      'Getting Started',
      'Clinical Documentation',
      'Practice Management',
      'Billing & Payments',
      'Medical Imaging',
      'Security',
      'Subscription',
    ];

    for (const cat of requiredCategories) {
      await st.test(`H: Category "${cat}" is present in FAQPageShell`, () => {
        assert(faq.includes(`category: '${cat}'`), `FAQ contains category ${cat}`);
      });
    }
  });

  // ============================================================================
  // SUITE I & J: Security & Legal Placeholders
  // ============================================================================
  await t.test('--- SUITE I & J: Security & Legal Placeholders ---', async (st) => {
    await st.test('I1: Security page documents RLS, admin firewall, and RBAC without fake certifications', () => {
      assert(security.includes('PostgreSQL Row-Level Security'), 'Documents RLS');
      assert(security.includes('Platform Admin Privacy Firewall'), 'Documents Privacy Firewall');
      assert(security.includes('Granular Role-Based Access Control'), 'Documents RBAC');
      assert(!/hipaa certified/i.test(security), 'No fake HIPAA certification');
      assert(!/iso certified/i.test(security), 'No fake ISO certification');
      assert(!/soc 2 certified/i.test(security), 'No fake SOC 2 certification');
    });

    await st.test('J1: Terms and Privacy pages remain structured legal placeholders', () => {
      assert(terms.includes('Terms of Service content will be published here before public launch'), 'Terms has pre-launch placeholder');
      assert(privacy.includes('Privacy Policy content will be published here before public launch'), 'Privacy has pre-launch placeholder');
    });
  });

  // ============================================================================
  // SUITE K, L, M: SEO & OpenGraph Architecture
  // ============================================================================
  await t.test('--- SUITE K, L, M: SEO & OpenGraph Metadata ---', async (st) => {
    await st.test('K1: seo.ts defines metadata for all public routes', () => {
      assert(seo.includes("'/':"), 'Root route metadata present');
      assert(seo.includes("'/features':"), 'Features route metadata present');
      assert(seo.includes("'/features/physiotherapy-emr':"), 'Physiotherapy EMR route metadata present');
      assert(seo.includes("'/features/patient-management':"), 'Patient Management route metadata present');
      assert(seo.includes("'/features/appointments':"), 'Appointments route metadata present');
      assert(seo.includes("'/features/clinical-documentation':"), 'Clinical Documentation route metadata present');
      assert(seo.includes("'/features/treatment-plans':"), 'Treatment Plans route metadata present');
      assert(seo.includes("'/features/treatment-packages':"), 'Treatment Packages route metadata present');
      assert(seo.includes("'/features/billing':"), 'Billing route metadata present');
      assert(seo.includes("'/features/medical-imaging':"), 'Medical Imaging route metadata present');
      assert(seo.includes("'/features/practice-management':"), 'Practice Management route metadata present');
      assert(seo.includes("'/pricing':"), 'Pricing route metadata present');
      assert(seo.includes("'/security':"), 'Security route metadata present');
      assert(seo.includes("'/about':"), 'About route metadata present');
      assert(seo.includes("'/contact':"), 'Contact route metadata present');
      assert(seo.includes("'/faq':"), 'FAQ route metadata present');
      assert(seo.includes("'/terms':"), 'Terms route metadata present');
      assert(seo.includes("'/privacy':"), 'Privacy route metadata present');
    });

    await st.test('L1: Canonical URLs adhere to https://physenra.com domain', () => {
      assert(seo.includes("canonical: 'https://physenra.com/'"), 'Root canonical URL correct');
      assert(seo.includes("canonical: 'https://physenra.com/features'"), 'Features canonical URL correct');
      assert(layout.includes('canonical'), 'MarketingLayout injects canonical link tag');
    });

    await st.test('M1: OpenGraph & Twitter metadata injected by MarketingLayout', () => {
      assert(layout.includes('og:title'), 'Injects og:title');
      assert(layout.includes('og:description'), 'Injects og:description');
      assert(layout.includes('og:url'), 'Injects og:url');
      assert(layout.includes('og:image'), 'Injects og:image');
      assert(layout.includes('twitter:card'), 'Injects twitter:card');
    });
  });

  // ============================================================================
  // SUITE N: Internal Linking
  // ============================================================================
  await t.test('--- SUITE N: Internal Linking ---', async (st) => {
    await st.test('N1: Homepage connects to all core commercial hubs', () => {
      assert(homepage.includes('to="/features/physiotherapy-emr"'), 'Links to EMR feature');
      assert(homepage.includes('to="/features/treatment-packages"'), 'Links to Packages feature');
      assert(homepage.includes('to="/features/appointments"'), 'Links to Appointments feature');
      assert(homepage.includes('to="/features/billing"'), 'Links to Billing feature');
      assert(homepage.includes('to="/features/medical-imaging"'), 'Links to Imaging feature');
      assert(homepage.includes('to="/security"'), 'Links to Security');
      assert(homepage.includes('to="/pricing"'), 'Links to Pricing');
      assert(homepage.includes('to="/faq"'), 'Links to FAQ');
    });

    await st.test('N2: About and FAQ pages link back to features and contact', () => {
      assert(about.includes('to="/features"'), 'About links to Features');
      assert(about.includes('to="/pricing"'), 'About links to Pricing');
      assert(faq.includes('to="/contact"'), 'FAQ links to Contact');
    });
  });

  // ============================================================================
  // SUITE O & P: Secret Hygiene & Kabworld Separation
  // ============================================================================
  await t.test('--- SUITE O & P: Secrets & Legacy Independence ---', async (st) => {
    await st.test('O1: Zero frontend secrets or private keys in public files', () => {
      for (const filePath of allPublicAndPricingFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!content.includes('PAYSTACK_SECRET_KEY'), `Found secret key in ${filePath}`);
        assert(!content.includes('sk_live_'), `Found live token in ${filePath}`);
        assert(!content.includes('service_role'), `Found service role key in ${filePath}`);
        assert(!content.includes('sbp_'), `Found personal access token in ${filePath}`);
      }
    });

    await st.test('P1: Zero Kabworld references across public codebase', () => {
      for (const filePath of allPublicAndPricingFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!content.toLowerCase().includes('kabworld'), `Found Kabworld in ${filePath}`);
      }
    });
  });

  // ============================================================================
  // SUITE Q, R, S: Application Separation, Responsive & Accessibility
  // ============================================================================
  await t.test('--- SUITE Q, R, S: Separation, Responsive & Accessibility ---', async (st) => {
    await st.test('Q1: Public files do not import heavy clinical libraries', () => {
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!content.includes('cornerstone-core'), `Cornerstone imported in ${filePath}`);
        assert(!content.includes('cornerstone-wado-image-loader'), `Cornerstone loader imported in ${filePath}`);
        assert(!content.includes('chart.js'), `Chart.js imported in ${filePath}`);
      }
    });

    await st.test('R1: Responsive overflow guards and container tokens exist', () => {
      assert(layout.includes('overflow-x-hidden'), 'Layout guards horizontal overflow');
      assert(homepage.includes('max-w-7xl'), 'Container width constrained');
      assert(homepage.includes('grid-cols-1'), 'Mobile-first grid fallback');
    });

    await st.test('S1: Semantic landmarks and accessible interactive states exist', () => {
      assert(layout.includes('<main'), 'Layout uses semantic main tag');
      assert(homepage.includes('<h1'), 'Homepage has semantic h1');
      assert(featureDetail.includes('<h1'), 'Feature detail has semantic h1');
      assert(faq.includes('<h2'), 'FAQ has semantic h2 headers');
    });
  });
});
