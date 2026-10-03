// ==============================================================================
// PHYSENRA WEBSITE — FOUNDER + CLINICIAN VISUAL STORYTELLING V1 TEST SUITE
// File: tests/website_founder_clinician_storytelling_v1.test.cjs
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const PUBLIC_DIR = path.join(SRC_DIR, 'public');
const STATIC_PUBLIC_DIR = path.join(ROOT_DIR, 'public');

// File paths
const HOME_PAGE_PATH = path.join(PUBLIC_DIR, 'pages', 'HomePageShell.tsx');
const ABOUT_PAGE_PATH = path.join(PUBLIC_DIR, 'pages', 'AboutPageShell.tsx');
const FOUNDER_PHOTO_PATH = path.join(PUBLIC_DIR, 'components', 'FounderPhoto.tsx');
const CLINICIAN_VISUAL_PATH = path.join(PUBLIC_DIR, 'components', 'ClinicianVisual.tsx');
const FOUNDER_README_PATH = path.join(STATIC_PUBLIC_DIR, 'images', 'founder', 'README.md');
const CLINICIANS_DIR = path.join(STATIC_PUBLIC_DIR, 'images', 'clinicians');
const SEO_PATH = path.join(PUBLIC_DIR, 'data', 'seo.ts');
const PLANS_PATH = path.join(PUBLIC_DIR, 'data', 'plans.ts');

// File contents
const homeContent = fs.readFileSync(HOME_PAGE_PATH, 'utf8');
const aboutContent = fs.readFileSync(ABOUT_PAGE_PATH, 'utf8');
const founderPhotoContent = fs.readFileSync(FOUNDER_PHOTO_PATH, 'utf8');
const clinicianVisualContent = fs.readFileSync(CLINICIAN_VISUAL_PATH, 'utf8');
const founderReadmeContent = fs.readFileSync(FOUNDER_README_PATH, 'utf8');
const seoContent = fs.readFileSync(SEO_PATH, 'utf8');
const plansContent = fs.readFileSync(PLANS_PATH, 'utf8');

// ==============================================================================
// Suite 1: Founder Presentation & Identity
// ==============================================================================
test('Suite 1: Founder Presentation & Identity', async (t) => {
  await t.test('1. Founder name "Dr Oladejo Korede" appears in Homepage and About page', () => {
    assert.match(homeContent, /Dr Oladejo Korede/);
    assert.match(aboutContent, /Dr Oladejo Korede/);
  });

  await t.test('2. Authoritative credentials "PT, MPH, DPT" appear accurately', () => {
    assert.match(homeContent, /PT, MPH, DPT/);
    assert.match(aboutContent, /PT, MPH, DPT/);
    assert.match(founderPhotoContent, /PT, MPH, DPT/);
  });

  await t.test('3. Confirmed professional background (Physiotherapist, Master of Public Health, Doctor of Physiotherapy)', () => {
    assert.match(aboutContent, /Physiotherapist/);
    assert.match(aboutContent, /Master of Public Health/);
    assert.match(aboutContent, /Doctor of Physiotherapy/);
  });

  await t.test('4. Homepage includes dedicated Founder Section with approved heading', () => {
    assert.match(homeContent, /Built by a Physiotherapist\. Designed for Physiotherapy Practice\./);
  });

  await t.test('5. Homepage founder section includes approved supporting narrative copy', () => {
    assert.match(homeContent, /Dr Oladejo Korede, PT, MPH, DPT, is the founder of Physenra/);
    assert.match(homeContent, /practical understanding of the challenges involved in managing modern physiotherapy practice/);
  });

  await t.test('6. Homepage founder section provides "Meet the Founder" CTA linking to /about', () => {
    assert.match(homeContent, /to="\/about"/);
    assert.match(homeContent, /Meet the Founder/);
  });

  await t.test('7. About page includes "Built from a physiotherapist\'s perspective" thematic framing', () => {
    assert.match(aboutContent, /Built from a Physiotherapist's Perspective/i);
  });

  await t.test('8. About page cross-links back to product features, pricing, and security', () => {
    assert.match(aboutContent, /to="\/features"/);
    assert.match(aboutContent, /to="\/pricing"/);
    assert.match(aboutContent, /to="\/security"/);
    assert.match(aboutContent, /to="\/register-practice"/);
  });
});

// ==============================================================================
// Suite 2: Claims Integrity & Restrained Biography
// ==============================================================================
test('Suite 2: Claims Integrity & Restrained Biography', async (t) => {
  const combined = homeContent + ' ' + aboutContent + ' ' + founderPhotoContent;

  await t.test('9. Barred exaggerated marketing claims across all founder sections', () => {
    assert.doesNotMatch(combined, /revolutionized physiotherapy/i);
    assert.doesNotMatch(combined, /leading physiotherapist in Nigeria/i);
    assert.doesNotMatch(combined, /number one/i);
    assert.doesNotMatch(combined, /thousands of clinics/i);
  });

  await t.test('10. Barred fabricated customer numbers, awards, or false patient volumes', () => {
    assert.doesNotMatch(combined, /10,000\+ patients/i);
    assert.doesNotMatch(combined, /500\+ clinics/i);
    assert.doesNotMatch(combined, /award-winning physiotherapist/i);
  });

  await t.test('11. Visual storytelling does not claim photographed persons are real customers or employees', () => {
    assert.doesNotMatch(combined, /Meet one of our customers/i);
    assert.doesNotMatch(combined, /Our customers use Physenra/i);
  });
});

// ==============================================================================
// Suite 3: Founder Photograph Architecture & Fallback
// ==============================================================================
test('Suite 3: Founder Photograph Architecture & Fallback', async (t) => {
  await t.test('12. FounderPhoto component exists and is imported into Homepage and About page', () => {
    assert.ok(fs.existsSync(FOUNDER_PHOTO_PATH));
    assert.match(homeContent, /<FounderPhoto/);
    assert.match(aboutContent, /<FounderPhoto/);
  });

  await t.test('13. FounderPhoto component defines standard asset path convention', () => {
    assert.match(founderPhotoContent, /\/images\/founder\/dr-oladejo-korede\.webp/);
  });

  await t.test('14. FounderPhoto specifies authoritative alt text for when photo is loaded', () => {
    assert.match(founderPhotoContent, /alt="Dr Oladejo Korede, PT, MPH, DPT, founder of Physenra"/);
  });

  await t.test('15. FounderPhoto provides executive placeholder state with credentials when image is not yet present', () => {
    assert.match(founderPhotoContent, /Founder & Clinical Architect/);
    assert.match(founderPhotoContent, /Dr Oladejo Korede/);
    assert.match(founderPhotoContent, /PT, MPH, DPT/);
    assert.match(founderPhotoContent, /onError/);
  });

  await t.test('16. Founder photograph placement documentation exists in public/images/founder/README.md', () => {
    assert.ok(fs.existsSync(FOUNDER_README_PATH));
    assert.match(founderReadmeContent, /dr-oladejo-korede\.webp/);
    assert.match(founderReadmeContent, /Dr Oladejo Korede, PT, MPH, DPT/);
  });
});

// ==============================================================================
// Suite 4: Clinician Imagery & Asset Architecture
// ==============================================================================
test('Suite 4: Clinician Imagery & Asset Architecture', async (t) => {
  await t.test('17. ClinicianVisual component exists and supports badge, caption, and alt text', () => {
    assert.ok(fs.existsSync(CLINICIAN_VISUAL_PATH));
    assert.match(clinicianVisualContent, /interface ClinicianVisualProps/);
    assert.match(clinicianVisualContent, /alt: string/);
    assert.match(clinicianVisualContent, /Visual Storytelling/);
  });

  await t.test('18. Generated clinician image files exist in public/images/clinicians/', () => {
    const img1 = path.join(CLINICIANS_DIR, 'clinician-digital-workflow-01.jpg');
    const img2 = path.join(CLINICIANS_DIR, 'clinician-practice-management-01.jpg');
    const img3 = path.join(CLINICIANS_DIR, 'clinician-patient-care-01.jpg');

    assert.ok(fs.existsSync(img1), 'clinician-digital-workflow-01.jpg missing');
    assert.ok(fs.existsSync(img2), 'clinician-practice-management-01.jpg missing');
    assert.ok(fs.existsSync(img3), 'clinician-patient-care-01.jpg missing');

    assert.ok(fs.statSync(img1).size > 50000, 'Image 1 must be non-empty');
    assert.ok(fs.statSync(img2).size > 50000, 'Image 2 must be non-empty');
    assert.ok(fs.statSync(img3).size > 50000, 'Image 3 must be non-empty');
  });

  await t.test('19. Homepage incorporates clinician visual storytelling section', () => {
    assert.match(homeContent, /Built for the Way Physiotherapists Actually Work/);
    assert.match(homeContent, /clinician-digital-workflow-01\.jpg/);
    assert.match(homeContent, /Nigerian physiotherapist/i);
  });

  await t.test('20. About page incorporates clinician visual storytelling cards', () => {
    assert.match(aboutContent, /Modern Clinical Practice/);
    assert.match(aboutContent, /clinician-digital-workflow-01\.jpg/);
    assert.match(aboutContent, /clinician-practice-management-01\.jpg/);
  });

  await t.test('21. Clinician imagery does not expose PHI or fake charts with sensitive data', () => {
    assert.doesNotMatch(combinedCode(), /\bssn\b/i);
    assert.doesNotMatch(combinedCode(), /credit_card/i);
  });
});

// ==============================================================================
// Suite 5: Design System & Responsive Layout
// ==============================================================================
test('Suite 5: Design System & Responsive Layout', async (t) => {
  await t.test('22. Color palette adheres to Physenra brand tokens (teal, emerald, slate)', () => {
    assert.match(homeContent, /text-teal-/);
    assert.match(homeContent, /bg-slate-900/);
    assert.match(aboutContent, /text-teal-/);
    assert.match(aboutContent, /border-teal-/);
  });

  await t.test('23. Responsive grid breakpoints (sm:, md:, lg:) used across founder and clinician sections', () => {
    assert.match(homeContent, /grid-cols-1 lg:grid-cols-12/);
    assert.match(aboutContent, /grid-cols-1 lg:grid-cols-12/);
    assert.match(aboutContent, /grid-cols-1 md:grid-cols-2/);
  });

  await t.test('24. Interactive CTAs maintain minimum touch targets of 44px', () => {
    assert.match(homeContent, /minHeight:\s*'44px'/);
  });
});

// ==============================================================================
// Suite 6: Route, Pricing & SEO Integrity
// ==============================================================================
test('Suite 6: Route, Pricing & SEO Integrity', async (t) => {
  await t.test('25. Authoritative SaaS pricing plans remain unaltered', () => {
    assert.match(plansContent, /code:\s*'solo'/);
    assert.match(plansContent, /1500000/); // ₦15k
    assert.match(plansContent, /code:\s*'professional'/);
    assert.match(plansContent, /3000000/); // ₦30k
    assert.match(plansContent, /code:\s*'clinic'/);
    assert.match(plansContent, /5000000/); // ₦50k
  });

  await t.test('26. SEO metadata for /about contains natural founder context without keyword stuffing', () => {
    assert.match(seoContent, /Dr Oladejo Korede/);
    assert.match(seoContent, /canonical:\s*'https:\/\/physenra\.com\/about'/);
  });
});

// ==============================================================================
// Suite 7: Security & Critical Project Separation
// ==============================================================================
test('Suite 7: Security & Critical Project Separation', async (t) => {
  await t.test('27. Zero Kabworld references across all modified and created public files', () => {
    assert.doesNotMatch(homeContent, /kabworld/i);
    assert.doesNotMatch(aboutContent, /kabworld/i);
    assert.doesNotMatch(founderPhotoContent, /kabworld/i);
    assert.doesNotMatch(clinicianVisualContent, /kabworld/i);
    assert.doesNotMatch(founderReadmeContent, /kabworld/i);
  });

  await t.test('28. Zero leaked secrets, API keys, or private tokens in source code', () => {
    const combined = combinedCode();
    assert.doesNotMatch(combined, /sk_live_[0-9a-zA-Z]+/);
    assert.doesNotMatch(combined, /sk_test_[0-9a-zA-Z]+/);
    assert.doesNotMatch(combined, /-----BEGIN PRIVATE KEY-----/);
  });

  await t.test('29. Zero unsafe eval calls in source code', () => {
    assert.doesNotMatch(homeContent, /\beval\s*\(/);
    assert.doesNotMatch(aboutContent, /\beval\s*\(/);
    assert.doesNotMatch(founderPhotoContent, /\beval\s*\(/);
    assert.doesNotMatch(clinicianVisualContent, /\beval\s*\(/);
  });
});

function combinedCode() {
  return [homeContent, aboutContent, founderPhotoContent, clinicianVisualContent].join(' ');
}
