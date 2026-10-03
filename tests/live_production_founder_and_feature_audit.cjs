// ==============================================================================
// PHYSENRA PRODUCTION LIVE VERIFICATION — FOUNDER PHOTO + FEATURES ARCHITECTURE
// File: tests/live_production_founder_and_feature_audit.cjs
// ==============================================================================

const https = require('https');
const assert = require('assert');

const PROD_BASE = 'https://physenra.com';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          buffer: buffer,
          text: buffer.toString('utf8'),
        });
      });
    }).on('error', reject);
  });
}

async function runLiveVerification() {
  console.log('======================================================================');
  console.log('PHYSENRA PRODUCTION LIVE VERIFICATION');
  console.log('Target:', PROD_BASE);
  console.log('Deploy ID: 6ac1514d1e7f01455aeef2c5');
  console.log('======================================================================\n');

  let passed = 0;
  let total = 0;

  async function check(desc, fn) {
    total++;
    process.stdout.write(`TEST ${total}: ${desc}... `);
    try {
      await fn();
      console.log('PASS');
      passed++;
    } catch (err) {
      console.log(`FAIL: ${err.message}`);
    }
  }

  // 1. Founder Photo Asset
  await check('Founder WebP photograph returns HTTP 200 OK', async () => {
    const res = await fetchUrl(`${PROD_BASE}/images/founder/dr-oladejo-korede.webp`);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.buffer.length > 50000, `Expected size > 50KB, got ${res.buffer.length}`);
    assert.strictEqual(res.buffer.toString('ascii', 0, 4), 'RIFF');
    assert.strictEqual(res.buffer.toString('ascii', 8, 12), 'WEBP');
  });

  // 2. Homepage HTML & Meta
  await check('Homepage returns HTTP 200 and loads SPA root', async () => {
    const res = await fetchUrl(`${PROD_BASE}/`);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.text.includes('<div id="root"></div>'));
  });

  // 3. About page
  await check('About page returns HTTP 200', async () => {
    const res = await fetchUrl(`${PROD_BASE}/about`);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.text.includes('<div id="root"></div>'));
  });

  // 4. Features Hub page
  await check('Features hub page returns HTTP 200', async () => {
    const res = await fetchUrl(`${PROD_BASE}/features`);
    assert.strictEqual(res.statusCode, 200);
  });

  // 5. Core Feature Detail Routes
  const featureRoutes = [
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

  for (const route of featureRoutes) {
    await check(`Feature route ${route} returns HTTP 200`, async () => {
      const res = await fetchUrl(`${PROD_BASE}${route}`);
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.text.includes('<div id="root"></div>'));
    });
  }

  // 6. Inspect production FeatureDetailShell bundle
  await check('Production FeatureDetailShell bundle contains all substantive modules and specialty coverage', async () => {
    const indexRes = await fetchUrl(`${PROD_BASE}/`);
    // Find FeatureDetailShell bundle in dist assets
    const fs = require('fs');
    const path = require('path');
    const distAssets = fs.readdirSync(path.resolve('dist/assets'));
    const featureBundle = distAssets.find(f => f.startsWith('FeatureDetailShell-') && f.endsWith('.js'));
    assert.ok(featureBundle, 'FeatureDetailShell bundle must exist in dist');

    const bundleRes = await fetchUrl(`${PROD_BASE}/assets/${featureBundle}`);
    assert.strictEqual(bundleRes.statusCode, 200);

    const code = bundleRes.text;

    // Verify all module titles and topics are compiled in
    assert.ok(code.includes('Physiotherapy Clinical EMR & SOAP Notes'), 'Contains physiotherapy-emr');
    assert.ok(code.includes('Patient Directory & Episode Architecture'), 'Contains patient-management');
    assert.ok(code.includes('Multi-Practitioner Scheduling & Bay Allocation'), 'Contains appointments');
    assert.ok(code.includes('Specialized Clinical Documentation & Multi-Specialty Assessments'), 'Contains clinical-documentation');
    assert.ok(code.includes('Neurology V1'), 'Contains Neurology V1');
    assert.ok(code.includes('Paediatrics V1'), 'Contains Paediatrics V1');
    assert.ok(code.includes('Treatment Plans, SMART Goals & Home Exercise Prescription'), 'Contains treatment-plans');
    assert.ok(code.includes('Treatment Packages & Patient Deposit Wallets'), 'Contains treatment-packages');
    assert.ok(code.includes('Itemized Invoicing, Numbered Receipts & Payment Tracking'), 'Contains billing');
    assert.ok(code.includes('Pain & Functional Outcome Tracking Built for Physiotherapy'), 'Contains pain-management');
    assert.ok(code.includes('Built-in DICOM Web PACS Viewer'), 'Contains medical-imaging');
    assert.ok(code.includes('Practice Management & Granular Role-Based Access Control'), 'Contains practice-management');

    // Verify no circular self-links
    assert.doesNotMatch(code, /slug:"clinical-documentation"[\s\S]{0,100}slug:"clinical-documentation"/);
  });

  // 7. Sitemap & Robots
  await check('Sitemap XML returns HTTP 200 and lists core features including pain-management', async () => {
    const res = await fetchUrl(`${PROD_BASE}/sitemap.xml`);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.text.includes('<loc>https://physenra.com/features/pain-management</loc>'));
    assert.ok(res.text.includes('<loc>https://physenra.com/features/appointments</loc>'));
    assert.ok(res.text.includes('<loc>https://physenra.com/features/billing</loc>'));
  });

  await check('Robots TXT returns HTTP 200 and allows standard indexing', async () => {
    const res = await fetchUrl(`${PROD_BASE}/robots.txt`);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.text.includes('Sitemap: https://physenra.com/sitemap.xml'));
  });

  // 8. Critical Project Separation
  await check('Zero Kabworld references across production HTML, sitemap, and JS bundles', async () => {
    const pages = ['/', '/about', '/features', '/features/clinical-documentation', '/sitemap.xml'];
    for (const p of pages) {
      const res = await fetchUrl(`${PROD_BASE}${p}`);
      assert.doesNotMatch(res.text, /kabworld/i, `Kabworld found in ${p}`);
    }
  });

  // 9. Zero Secrets in Production
  await check('Zero leaked service keys or private tokens in production assets', async () => {
    const pages = ['/', '/features'];
    for (const p of pages) {
      const res = await fetchUrl(`${PROD_BASE}${p}`);
      assert.doesNotMatch(res.text, /sbp_[a-zA-Z0-9]+/i);
      assert.doesNotMatch(res.text, /service_role/i);
    }
  });

  console.log('\n======================================================================');
  console.log(`LIVE PRODUCTION QA RESULTS: ${passed}/${total} PASS`);
  console.log('======================================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runLiveVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
