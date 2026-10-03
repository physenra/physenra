// ==============================================================================
// PHYSENRA WEBSITE — FOUNDER PHOTO + FEATURE COMPLETENESS & LINK AUDIT TEST SUITE
// File: tests/website_founder_photo_and_feature_audit.test.cjs
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
const FOUNDER_PHOTO_FILE = path.join(STATIC_PUBLIC_DIR, 'images', 'founder', 'dr-oladejo-korede.webp');
const FOUNDER_PHOTO_COMPONENT = path.join(PUBLIC_DIR, 'components', 'FounderPhoto.tsx');
const FEATURE_SHELL_PATH = path.join(PUBLIC_DIR, 'pages', 'FeatureDetailShell.tsx');
const FEATURES_HUB_PATH = path.join(PUBLIC_DIR, 'pages', 'FeaturesHubShell.tsx');
const HOME_PAGE_PATH = path.join(PUBLIC_DIR, 'pages', 'HomePageShell.tsx');
const ABOUT_PAGE_PATH = path.join(PUBLIC_DIR, 'pages', 'AboutPageShell.tsx');
const APP_PATH = path.join(SRC_DIR, 'App.tsx');
const SEO_PATH = path.join(PUBLIC_DIR, 'data', 'seo.ts');
const SITEMAP_PATH = path.join(STATIC_PUBLIC_DIR, 'sitemap.xml');
const NAV_PATH = path.join(PUBLIC_DIR, 'data', 'navigation.ts');

// File contents
const founderPhotoComponentContent = fs.readFileSync(FOUNDER_PHOTO_COMPONENT, 'utf8');
const featureShellContent = fs.readFileSync(FEATURE_SHELL_PATH, 'utf8');
const featuresHubContent = fs.readFileSync(FEATURES_HUB_PATH, 'utf8');
const homeContent = fs.readFileSync(HOME_PAGE_PATH, 'utf8');
const aboutContent = fs.readFileSync(ABOUT_PAGE_PATH, 'utf8');
const appContent = fs.readFileSync(APP_PATH, 'utf8');
const seoContent = fs.readFileSync(SEO_PATH, 'utf8');
const sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf8');
const navContent = fs.readFileSync(NAV_PATH, 'utf8');

// ==============================================================================
// Suite 1: Real Founder Photograph Verification
// ==============================================================================
test('Suite 1: Real Founder Photograph Verification', async (t) => {
  await t.test('1. Founder WebP photograph file exists in public/images/founder', () => {
    assert.strictEqual(fs.existsSync(FOUNDER_PHOTO_FILE), true);
  });

  await t.test('2. File size is valid and optimized (> 50KB and < 500KB)', () => {
    const stat = fs.statSync(FOUNDER_PHOTO_FILE);
    assert.ok(stat.size > 50 * 1024, `Size should be > 50KB, got ${stat.size}`);
    assert.ok(stat.size < 500 * 1024, `Size should be < 500KB, got ${stat.size}`);
  });

  await t.test('3. File has valid WebP magic header (RIFF....WEBP)', () => {
    const fd = fs.openSync(FOUNDER_PHOTO_FILE, 'r');
    const buf = Buffer.alloc(12);
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    assert.strictEqual(buf.toString('ascii', 0, 4), 'RIFF');
    assert.strictEqual(buf.toString('ascii', 8, 12), 'WEBP');
  });

  await t.test('4. FounderPhoto component references the authentic WebP image', () => {
    assert.match(founderPhotoComponentContent, /\/images\/founder\/dr-oladejo-korede\.webp/);
  });

  await t.test('5. FounderPhoto component contains accessible alt text with Dr Oladejo Korede', () => {
    assert.match(founderPhotoComponentContent, /alt="Dr Oladejo Korede, PT, MPH, DPT, founder of Physenra"/);
  });

  await t.test('6. FounderPhoto component renders executive caption overlay', () => {
    assert.match(founderPhotoComponentContent, /Dr Oladejo Korede/);
    assert.match(founderPhotoComponentContent, /Founder &amp; Clinical Architect/);
  });

  await t.test('7. FounderPhoto component maintains robust placeholder/error fallback', () => {
    assert.match(founderPhotoComponentContent, /imageError/);
    assert.match(founderPhotoComponentContent, /ShieldCheck/);
    assert.match(founderPhotoComponentContent, /Founder Profile/);
  });
});

// ==============================================================================
// Suite 2: Feature Routing & Slug Resolution
// ==============================================================================
test('Suite 2: Feature Routing & Slug Resolution', async (t) => {
  await t.test('1. FeatureDetailShell resolves slug dynamically using useLocation()', () => {
    assert.match(featureShellContent, /useLocation/);
    assert.match(featureShellContent, /location\.pathname/);
    assert.match(featureShellContent, /pathSlug/);
  });

  await t.test('2. FeatureDetailShell normalizes aliases (treatment-plans-hep and pain-outcome-tracking)', () => {
    assert.match(featureShellContent, /treatment-plans-hep/);
    assert.match(featureShellContent, /treatment-plans/);
    assert.match(featureShellContent, /pain-outcome-tracking/);
    assert.match(featureShellContent, /pain-management/);
  });

  await t.test('3. App.tsx registers parameterized /features/:slug route', () => {
    assert.match(appContent, /path="\/features\/:slug"/);
  });

  await t.test('4. App.tsx registers all explicit feature subroutes', () => {
    const expectedSubroutes = [
      '/features/physiotherapy-emr',
      '/features/patient-management',
      '/features/appointments',
      '/features/clinical-documentation',
      '/features/treatment-plans',
      '/features/treatment-plans-hep',
      '/features/treatment-packages',
      '/features/billing',
      '/features/pain-management',
      '/features/pain-outcome-tracking',
      '/features/medical-imaging',
      '/features/practice-management',
    ];
    for (const route of expectedSubroutes) {
      assert.ok(appContent.includes(`path="${route}"`), `App.tsx missing route: ${route}`);
    }
  });
});

// ==============================================================================
// Suite 3: Feature Completeness & Substantive Modules
// ==============================================================================
test('Suite 3: Feature Completeness & Substantive Modules', async (t) => {
  const expectedModules = [
    'physiotherapy-emr',
    'patient-management',
    'appointments',
    'clinical-documentation',
    'treatment-plans',
    'treatment-packages',
    'billing',
    'pain-management',
    'medical-imaging',
    'practice-management',
  ];

  for (const mod of expectedModules) {
    await t.test(`1. Module '${mod}' is defined in FEATURE_DATA`, () => {
      assert.ok(featureShellContent.includes(`'${mod}': {`), `FEATURE_DATA missing '${mod}'`);
    });
  }

  await t.test('2. Clinical documentation module includes Neurology V1 and Paediatrics V1 coverage', () => {
    assert.match(featureShellContent, /Neurology/);
    assert.match(featureShellContent, /Modified Ashworth/);
    assert.match(featureShellContent, /Paediatric/);
    assert.match(featureShellContent, /Gross Motor/);
    assert.match(featureShellContent, /Specialty Assessment Architecture/);
  });

  await t.test('3. Appointments module includes multi-therapist calendar and bay allocation', () => {
    assert.match(featureShellContent, /Multi-Practitioner Scheduling & Bay Allocation/);
    assert.match(featureShellContent, /treatment bay or private therapy room/);
  });

  await t.test('4. Billing module includes itemized invoices, numbered receipts, and settlements', () => {
    assert.match(featureShellContent, /Itemized Invoicing, Numbered Receipts & Payment Tracking/);
    assert.match(featureShellContent, /REC-00042/);
    assert.match(featureShellContent, /fee schedule/);
  });

  await t.test('5. Pain management module includes VAS 0-10, 24h cycle, and functional outcome batteries', () => {
    assert.match(featureShellContent, /Pain & Functional Outcome Tracking Built for Physiotherapy/);
    assert.match(featureShellContent, /VAS 0–10/);
    assert.match(featureShellContent, /24-hour symptom behavior/);
    assert.match(featureShellContent, /NDI/);
    assert.match(featureShellContent, /ODI/);
    assert.match(featureShellContent, /LEFS/);
    assert.match(featureShellContent, /QuickDASH/);
  });

  await t.test('6. Treatment plans module includes SMART goals and Home Exercise Prescription (HEP)', () => {
    assert.match(featureShellContent, /Treatment Plans, SMART Goals & Home Exercise Prescription/);
    assert.match(featureShellContent, /Home Exercise Programme/);
    assert.match(featureShellContent, /sets, reps, hold duration, frequency/);
  });
});

// ==============================================================================
// Suite 4: Internal Link Invariants & Zero Circular Self-Links
// ==============================================================================
test('Suite 4: Internal Link Invariants & Zero Circular Self-Links', async (t) => {
  await t.test('1. Zero circular self-links in FEATURE_DATA relatedFeatures', () => {
    const slugs = [
      'physiotherapy-emr',
      'patient-management',
      'appointments',
      'clinical-documentation',
      'treatment-plans',
      'treatment-packages',
      'billing',
      'pain-management',
      'medical-imaging',
      'practice-management',
    ];

    let checkedModules = 0;
    for (const slug of slugs) {
      const start = featureShellContent.indexOf("'" + slug + "': {");
      assert.ok(start !== -1, `Could not find start for module '${slug}'`);

      const relIdx = featureShellContent.indexOf('relatedFeatures:', start);
      assert.ok(relIdx !== -1, `Could not find relatedFeatures for module '${slug}'`);

      const relEnd = featureShellContent.indexOf(']', relIdx);
      const relBlock = featureShellContent.slice(relIdx, relEnd);
      const slugMatches = [...relBlock.matchAll(/slug:\s*'([a-z0-9-]+)'/g)].map(m => m[1]);

      assert.ok(slugMatches.length >= 3, `Module '${slug}' should have >= 3 related features, got ${slugMatches.length}`);

      for (const relatedSlug of slugMatches) {
        assert.notStrictEqual(
          relatedSlug,
          slug,
          `Circular self-link detected! Module '${slug}' links to itself in relatedFeatures`
        );
      }
      checkedModules++;
    }

    assert.strictEqual(checkedModules, 10, 'All 10 modules must be verified for zero circular links');
  });

  await t.test('2. All relatedFeatures point to registered feature modules', () => {
    const validSlugs = new Set([
      'physiotherapy-emr',
      'patient-management',
      'appointments',
      'clinical-documentation',
      'treatment-plans',
      'treatment-packages',
      'billing',
      'pain-management',
      'medical-imaging',
      'practice-management',
    ]);

    const slugMatches = [...featureShellContent.matchAll(/slug:\s*'([a-z0-9-]+)'/g)].map(m => m[1]);
    for (const slug of slugMatches) {
      assert.ok(validSlugs.has(slug), `Unknown related feature slug: '${slug}'`);
    }
  });

  await t.test('3. Features hub page links are all valid', () => {
    const linkMatches = [...featuresHubContent.matchAll(/linkTo="(\/features\/[a-z0-9-]+)"/g)].map(m => m[1]);
    assert.ok(linkMatches.length >= 9, `Expected at least 9 feature cards, found ${linkMatches.length}`);
    for (const link of linkMatches) {
      assert.ok(appContent.includes(`path="${link}"`), `Hub links to unregistered route: ${link}`);
    }
  });

  await t.test('4. Homepage feature links are all valid', () => {
    const linkMatches = [...homeContent.matchAll(/to="(\/features\/[a-z0-9-]+)"/g)].map(m => m[1]);
    assert.ok(linkMatches.length >= 4, `Expected at least 4 homepage feature links, found ${linkMatches.length}`);
    for (const link of linkMatches) {
      assert.ok(appContent.includes(`path="${link}"`), `Homepage links to unregistered route: ${link}`);
    }
  });

  await t.test('5. Footer navigation feature links are all valid', () => {
    const linkMatches = [...navContent.matchAll(/href:\s*'(\/features\/[a-z0-9-]+)'/g)].map(m => m[1]);
    assert.ok(linkMatches.length >= 9, `Expected at least 9 footer feature links, found ${linkMatches.length}`);
    for (const link of linkMatches) {
      assert.ok(appContent.includes(`path="${link}"`), `Nav links to unregistered route: ${link}`);
    }
  });
});

// ==============================================================================
// Suite 5: SEO, Sitemap & Claims Discipline
// ==============================================================================
test('Suite 5: SEO, Sitemap & Claims Discipline', async (t) => {
  await t.test('1. SEO metadata exists for all core feature pages', () => {
    const routes = [
      '/features/physiotherapy-emr',
      '/features/patient-management',
      '/features/appointments',
      '/features/clinical-documentation',
      '/features/treatment-plans',
      '/features/treatment-packages',
      '/features/billing',
      '/features/pain-management',
      '/features/medical-imaging',
      '/features/practice-management',
    ];
    for (const r of routes) {
      assert.ok(seoContent.includes(`'${r}': {`), `Missing SEO config for: ${r}`);
    }
  });

  await t.test('2. Sitemap includes core feature routes', () => {
    const routes = [
      'https://physenra.com/features/physiotherapy-emr',
      'https://physenra.com/features/patient-management',
      'https://physenra.com/features/appointments',
      'https://physenra.com/features/clinical-documentation',
      'https://physenra.com/features/treatment-plans',
      'https://physenra.com/features/treatment-packages',
      'https://physenra.com/features/billing',
      'https://physenra.com/features/pain-management',
      'https://physenra.com/features/medical-imaging',
      'https://physenra.com/features/practice-management',
    ];
    for (const r of routes) {
      assert.ok(sitemapContent.includes(`<loc>${r}</loc>`), `Missing sitemap entry for: ${r}`);
    }
  });

  await t.test('3. Zero Kabworld references across codebase', () => {
    assert.doesNotMatch(founderPhotoComponentContent, /kabworld/i);
    assert.doesNotMatch(featureShellContent, /kabworld/i);
    assert.doesNotMatch(featuresHubContent, /kabworld/i);
    assert.doesNotMatch(homeContent, /kabworld/i);
    assert.doesNotMatch(aboutContent, /kabworld/i);
    assert.doesNotMatch(seoContent, /kabworld/i);
    assert.doesNotMatch(sitemapContent, /kabworld/i);
  });

  await t.test('4. Zero secret keys or environment credentials in source', () => {
    const sensitive = [/eyJhbGciOi/i, /sbp_[a-zA-Z0-9]+/i, /secret/i];
    for (const s of [founderPhotoComponentContent, featureShellContent, featuresHubContent]) {
      for (const pat of sensitive) {
        assert.doesNotMatch(s, pat);
      }
    }
  });
});
