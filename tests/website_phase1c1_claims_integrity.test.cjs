// ==============================================================================
// PHYSENRA — WEBSITE PHASE 1C.1 CLAIMS INTEGRITY & FINAL CONTENT AUDIT SUITE
// File: tests/website_phase1c1_claims_integrity.test.cjs
//
// Minimum Requirements Governed:
// A. Unsupported pricing absent (no ₦35,000 or ₦65,000)
// B. Unsupported extra-seat pricing absent (no ₦3,000 extra seat, no additional seat claims)
// C. AI claims absent (no AI scribe, generative SOAP, automated diagnosis)
// D. WhatsApp/SMS automation claims absent (no automated WhatsApp/SMS reminders)
// E. Patient self-booking claims absent (no patient self-booking portals)
// F. Video telehealth claims absent (no video telehealth consultations)
// G. Unsupported superlatives absent (no first, best, #1, number one, most advanced)
// H. Unsupported compliance certifications absent (no fake HIPAA/ISO/SOC/GDPR certifications)
// I. Unsupported cancellation guarantees absent (no "cancel anytime", money-back guarantees)
// J. Unsupported annual discount claims absent (no "2 months free", "save X%", annual discounts)
// K. Unsupported DICOM modality claims absent (no Ultrasound in DICOM vault / Web PACS)
// L. Unsupported security guarantees absent (no cryptographic RLS, no encrypted backups)
// M. CTA routing intact (Primary -> /register-practice, Secondary -> /login, Enterprise -> /contact)
// N. Pricing remains authoritative (Solo 15k, Pro 30k, Clinic 50k, Enterprise Custom)
// O. Terms/privacy remain structured placeholders
// P. Public/application separation intact (zero heavy clinical library imports in public code)
// Q. No frontend secrets (zero secret keys or service role tokens)
// R. No Kabworld references (zero legacy project references)
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

const allPublicFiles = getAllPublicFiles(PUBLIC_DIR).concat([PRICING_PAGE_PATH]);

test('PHYSENRA — Website Phase 1C.1 Claims Integrity & Content Audit', async (t) => {
  // --------------------------------------------------------------------------
  // SUITE A: Unsupported Pricing Absent
  // --------------------------------------------------------------------------
  await t.test('--- SUITE A: Unsupported Pricing Absent ---', async (st) => {
    await st.test('A1: Barred unapproved prices 35,000 and 65,000 across all public pages', () => {
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!content.includes('35,000'), `Found unapproved price 35,000 in ${filePath}`);
        assert(!content.includes('65,000'), `Found unapproved price 65,000 in ${filePath}`);
        assert(!content.includes('35000'), `Found unapproved price 35000 in ${filePath}`);
        assert(!content.includes('65000'), `Found unapproved price 65000 in ${filePath}`);
      }
    });
  });

  // --------------------------------------------------------------------------
  // SUITE B: Unsupported Extra-Seat Pricing Absent
  // --------------------------------------------------------------------------
  await t.test('--- SUITE B: Unsupported Extra-Seat Pricing Absent ---', async (st) => {
    await st.test('B1: Barred extra seat and additional seat pricing claims', () => {
      const barredPatterns = [
        /extra seat/i,
        /additional seat/i,
        /3,000\s*\/\s*seat/i,
        /3000\s*\/\s*seat/i,
        /seat add-on/i,
      ];
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of barredPatterns) {
          assert(!pattern.test(content), `Found extra-seat claim matching ${pattern} in ${filePath}`);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // SUITE C: AI Claims Absent
  // --------------------------------------------------------------------------
  await t.test('--- SUITE C: AI Claims Absent ---', async (st) => {
    await st.test('C1: Zero AI clinical scribe, generative SOAP, or auto-diagnosis claims', () => {
      const barredPatterns = [
        /ai scribe/i,
        /clinical scribe/i,
        /generative soap/i,
        /ai diagnosis/i,
        /automated diagnosis/i,
        /ai-powered/i,
      ];
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of barredPatterns) {
          assert(!pattern.test(content), `Found AI claim matching ${pattern} in ${filePath}`);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // SUITE D: WhatsApp & SMS Automation Claims Absent
  // --------------------------------------------------------------------------
  await t.test('--- SUITE D: WhatsApp & SMS Automation Claims Absent ---', async (st) => {
    await st.test('D1: Zero automated WhatsApp or SMS appointment reminders claims', () => {
      const barredPatterns = [
        /whatsapp bot/i,
        /whatsapp automation/i,
        /automated whatsapp/i,
        /sms automation/i,
        /automated sms/i,
        /sms reminder/i,
      ];
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of barredPatterns) {
          assert(!pattern.test(content), `Found messaging automation claim matching ${pattern} in ${filePath}`);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // SUITE E: Patient Self-Booking Claims Absent
  // --------------------------------------------------------------------------
  await t.test('--- SUITE E: Patient Self-Booking Claims Absent ---', async (st) => {
    await st.test('E1: Zero patient self-booking claims', () => {
      const barredPatterns = [
        /patient self-booking/i,
        /patient self booking/i,
        /book appointments online/i,
        /patient online booking/i,
      ];
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of barredPatterns) {
          assert(!pattern.test(content), `Found self-booking claim matching ${pattern} in ${filePath}`);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // SUITE F: Video Telehealth Claims Absent
  // --------------------------------------------------------------------------
  await t.test('--- SUITE F: Video Telehealth Claims Absent ---', async (st) => {
    await st.test('F1: Zero video telehealth or virtual consultation claims', () => {
      const barredPatterns = [
        /video telehealth/i,
        /telehealth video/i,
        /video consult/i,
        /virtual appointment/i,
        /tele-rehab/i,
      ];
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of barredPatterns) {
          assert(!pattern.test(content), `Found video telehealth claim matching ${pattern} in ${filePath}`);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // SUITE G: Unsupported Superlatives Absent
  // --------------------------------------------------------------------------
  await t.test('--- SUITE G: Unsupported Superlatives Absent ---', async (st) => {
    await st.test('G1: Zero unsupported superlatives (first, best, #1, number one, most advanced)', () => {
      const barredPatterns = [
        /\b#1\b/i,
        /\bnumber one\b/i,
        /\bmost advanced\b/i,
        /\bthe best\b/i,
        /\bthe first\b/i,
        /\bunrivaled\b/i,
        /\bunmatched\b/i,
      ];
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of barredPatterns) {
          assert(!pattern.test(content), `Found unsupported superlative matching ${pattern} in ${filePath}`);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // SUITE H: Unsupported Compliance Certifications Absent
  // --------------------------------------------------------------------------
  await t.test('--- SUITE H: Unsupported Compliance Certifications Absent ---', async (st) => {
    await st.test('H1: Zero unverified HIPAA, ISO, SOC 2, or GDPR certification claims', () => {
      const barredPatterns = [
        /hipaa cert/i,
        /hipaa compliant/i,
        /iso 27001/i,
        /iso cert/i,
        /soc 2/i,
        /gdpr cert/i,
        /gdpr compliant/i,
      ];
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of barredPatterns) {
          assert(!pattern.test(content), `Found compliance certification claim matching ${pattern} in ${filePath}`);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // SUITE I: Unsupported Cancellation Guarantees Absent
  // --------------------------------------------------------------------------
  await t.test('--- SUITE I: Unsupported Cancellation Guarantees Absent ---', async (st) => {
    await st.test('I1: Zero "cancel anytime" or unestablished cancellation guarantees', () => {
      const barredPatterns = [
        /cancel anytime/i,
        /cancellation guarantee/i,
        /money-back/i,
        /money back/i,
        /refund guarantee/i,
        /trial guarantee/i,
      ];
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of barredPatterns) {
          assert(!pattern.test(content), `Found cancellation guarantee matching ${pattern} in ${filePath}`);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // SUITE J: Unsupported Annual Discount Claims Absent
  // --------------------------------------------------------------------------
  await t.test('--- SUITE J: Unsupported Annual Discount Claims Absent ---', async (st) => {
    await st.test('J1: Zero unapproved annual discount or savings claims', () => {
      const barredPatterns = [
        /annual discount/i,
        /2 months free/i,
        /two months free/i,
        /save \d+%/i,
        /save up to/i,
      ];
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of barredPatterns) {
          assert(!pattern.test(content), `Found annual discount claim matching ${pattern} in ${filePath}`);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // SUITE K: Unsupported DICOM Modality Claims Absent
  // --------------------------------------------------------------------------
  await t.test('--- SUITE K: Unsupported DICOM Modality Claims Absent ---', async (st) => {
    await st.test('K1: Zero Ultrasound claims in DICOM vault or Web PACS marketing', () => {
      assert(!plans.includes('Ultrasound'), 'Ultrasound absent from plans.ts');
      assert(!pricingPage.includes('Ultrasound'), 'Ultrasound absent from PricingPage.tsx');
      assert(!homepage.includes('Ultrasound'), 'Ultrasound absent from HomePageShell.tsx');
      assert(!featureDetail.includes('Ultrasound'), 'Ultrasound absent from FeatureDetailShell.tsx');
      assert(!featuresHub.includes('Ultrasound'), 'Ultrasound absent from FeaturesHubShell.tsx');
    });
  });

  // --------------------------------------------------------------------------
  // SUITE L: Unsupported Security & Cryptographic Claims Absent
  // --------------------------------------------------------------------------
  await t.test('--- SUITE L: Unsupported Security & Cryptographic Claims Absent ---', async (st) => {
    await st.test('L1: Zero cryptographic RLS or encrypted backup claims', () => {
      assert(!homepage.includes('cryptographic Row-Level Security'), 'Cryptographic RLS absent from homepage');
      assert(!security.includes('encrypted backup'), 'Encrypted backups absent from security page');
      assert(!faq.includes('encrypted backup'), 'Encrypted backups absent from FAQ page');
      assert(!homepage.includes('encrypted backup'), 'Encrypted backups absent from homepage');
    });
  });

  // --------------------------------------------------------------------------
  // SUITE M: CTA Routing Invariants
  // --------------------------------------------------------------------------
  await t.test('--- SUITE M: CTA Routing Invariants ---', async (st) => {
    await st.test('M1: Primary registration CTAs route strictly to /register-practice', () => {
      assert(homepage.includes('/register-practice'), 'Homepage primary CTA routes to /register-practice');
      assert(featureDetail.includes('/register-practice'), 'Feature detail primary CTA routes to /register-practice');
      assert(pricingPage.includes('/register-practice'), 'Pricing page primary CTA routes to /register-practice');
    });

    await st.test('M2: Secondary clinician login CTAs route strictly to /login', () => {
      assert(homepage.includes('/login'), 'Homepage secondary CTA routes to /login');
      assert(featureDetail.includes('/login'), 'Feature detail secondary CTA routes to /login');
      assert(pricingPage.includes('/login'), 'Pricing page secondary CTA routes to /login');
    });

    await st.test('M3: Enterprise inquiries route strictly to /contact', () => {
      assert(pricingPage.includes('/contact'), 'Pricing page enterprise routes to /contact');
      assert(faq.includes('/contact'), 'FAQ page routes to /contact');
      assert(contact.includes('We Are Here to Support Your Practice'), 'Contact page header exists');
    });
  });

  // --------------------------------------------------------------------------
  // SUITE N: Pricing Remains Authoritative
  // --------------------------------------------------------------------------
  await t.test('--- SUITE N: Pricing Remains Authoritative ---', async (st) => {
    await st.test('N1: Solo Practice is ₦15,000/mo, ₦150,000/yr, 1 seat, 14-day trial', () => {
      assert(plans.includes('monthlyNaira: 15000'), 'Solo monthly price 15,000');
      assert(plans.includes('annualNaira: 150000'), 'Solo annual price 150,000');
      assert(plans.includes('seats: 1'), 'Solo seats: 1');
      assert(plans.includes('trialDays: 14'), 'Solo trialDays: 14');
    });

    await st.test('N2: Professional Clinic is ₦30,000/mo, ₦300,000/yr, 5 seats, 14-day trial', () => {
      assert(plans.includes('monthlyNaira: 30000'), 'Pro monthly price 30,000');
      assert(plans.includes('annualNaira: 300000'), 'Pro annual price 300,000');
      assert(plans.includes('seats: 5'), 'Pro seats: 5');
      assert(plans.includes('trialDays: 14'), 'Pro trialDays: 14');
    });

    await st.test('N3: Comprehensive Clinic is ₦50,000/mo, ₦500,000/yr, 10 seats, 14-day trial', () => {
      assert(plans.includes('monthlyNaira: 50000'), 'Clinic monthly price 50,000');
      assert(plans.includes('annualNaira: 500000'), 'Clinic annual price 500,000');
      assert(plans.includes('seats: 10'), 'Clinic seats: 10');
      assert(plans.includes('trialDays: 14'), 'Clinic trialDays: 14');
    });

    await st.test('N4: Enterprise specifies custom pricing', () => {
      assert(plans.includes("code: 'enterprise'"), 'Enterprise tier defined');
      assert(plans.includes('Custom'), 'Enterprise has custom pricing tagline');
    });
  });

  // --------------------------------------------------------------------------
  // SUITE O: Terms & Privacy Placeholders
  // --------------------------------------------------------------------------
  await t.test('--- SUITE O: Terms & Privacy Placeholders ---', async (st) => {
    await st.test('O1: Terms and Privacy remain structured placeholders without draft policies', () => {
      assert(terms.includes('will be published here before public launch'), 'Terms is placeholder');
      assert(privacy.includes('will be published here before public launch'), 'Privacy is placeholder');
    });
  });

  // --------------------------------------------------------------------------
  // SUITE P: Public & Application Separation Intact
  // --------------------------------------------------------------------------
  await t.test('--- SUITE P: Public & Application Separation Intact ---', async (st) => {
    await st.test('P1: Public marketing components do not import heavy clinical libraries', () => {
      const heavyLibraries = ['cornerstone-core', 'dicom-parser', 'jspdf', 'chart.js'];
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const lib of heavyLibraries) {
          assert(!content.includes(`from '${lib}'`), `Heavy library ${lib} imported in ${filePath}`);
          assert(!content.includes(`from "${lib}"`), `Heavy library ${lib} imported in ${filePath}`);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // SUITE Q: No Frontend Secrets
  // --------------------------------------------------------------------------
  await t.test('--- SUITE Q: No Frontend Secrets ---', async (st) => {
    await st.test('Q1: Zero secret keys, Paystack private keys, or service role tokens', () => {
      const secretPatterns = [
        /sk_live_[0-9a-zA-Z]+/i,
        /sk_test_[0-9a-zA-Z]+/i,
        /PAYSTACK_SECRET_KEY/i,
        /service_role/i,
        /sbp_[0-9a-zA-Z]+/i,
      ];
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of secretPatterns) {
          assert(!pattern.test(content), `Found secret pattern matching ${pattern} in ${filePath}`);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // SUITE R: Zero Kabworld References
  // --------------------------------------------------------------------------
  await t.test('--- SUITE R: Zero Kabworld References ---', async (st) => {
    await st.test('R1: Zero legacy kabworld references across all public website files', () => {
      for (const filePath of allPublicFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!content.toLowerCase().includes('kabworld'), `Found Kabworld reference in ${filePath}`);
      }
    });
  });
});
