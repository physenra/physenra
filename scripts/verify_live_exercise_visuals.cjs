const https = require('https');

const PRODUCTION_URL = 'https://physenra.com';
const UNIQUE_DEPLOY_URL = 'https://6ad29a48a2f3a44ff26ed8e7--physenra.netlify.app';
const MAIN_BUNDLE_PATH = '/assets/index-D0EuY44G.js';
const CSS_BUNDLE_PATH = '/assets/index-CgqCky41.css';

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    }).on('error', reject);
  });
}

async function runLiveVerification() {
  console.log('==============================================================================');
  console.log('PHYSENRA LIVE PRODUCTION EXERCISE VISUALS VERIFICATION PROBE');
  console.log('Target Production URL:', PRODUCTION_URL);
  console.log('Unique Deploy URL:', UNIQUE_DEPLOY_URL);
  console.log('Timestamp:', new Date().toISOString());
  console.log('==============================================================================\n');

  let passed = 0;
  let failed = 0;

  function record(label, condition, detail = '') {
    if (condition) {
      console.log(`[PASS] ${label}${detail ? ` (${detail})` : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${label}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Root production page
    const rootRes = await fetchUrl(PRODUCTION_URL);
    record('Production root responds HTTP 200 OK', rootRes.statusCode === 200, `HTTP ${rootRes.statusCode}`);
    record('Production root includes index HTML mount container', rootRes.body.includes('id="root"'));

    // 2. Unique deploy URL
    const uniqueRes = await fetchUrl(UNIQUE_DEPLOY_URL);
    record('Unique deploy URL responds HTTP 200 OK', uniqueRes.statusCode === 200, `HTTP ${uniqueRes.statusCode}`);

    // 3. Main JavaScript bundle
    const bundleRes = await fetchUrl(`${PRODUCTION_URL}${MAIN_BUNDLE_PATH}`);
    record('Main bundle responds HTTP 200 OK', bundleRes.statusCode === 200, `HTTP ${bundleRes.statusCode}`);
    record('Main bundle size > 1 MB', bundleRes.body.length > 1000000, `${bundleRes.body.length} bytes`);

    // 4. Bundle contents: Visual Registry & Components
    record('Main bundle contains visual registry data & fallback cues', bundleRes.body.includes('Visual in review') && bundleRes.body.includes('Physenra Clinical Architecture Team'));
    record('Main bundle contains sample visual asset paths', bundleRes.body.includes('/images/exercises/quad-sets.svg') && bundleRes.body.includes('/images/exercises/copenhagen-adductor.svg'));
    record('Main bundle contains licensing & attribution text', bundleRes.body.includes('Physenra Proprietary Original Clinical Artwork'));

    // 5. CSS Bundle: Print styles
    const cssRes = await fetchUrl(`${PRODUCTION_URL}${CSS_BUNDLE_PATH}`);
    record('CSS bundle responds HTTP 200 OK', cssRes.statusCode === 200, `HTTP ${cssRes.statusCode}`);
    record('CSS bundle contains hep-exercise-card print rules', cssRes.body.includes('hep-exercise-card') && cssRes.body.includes('exercise-visual-container'));

    // 6. Sample Live SVG Assets
    const testSvgSlugs = [
      'quad-sets',
      'straight-leg-raise',
      'glute-bridge',
      'heel-slides',
      'cat-camel',
      'bird-dog',
      'copenhagen-adductor',
      'nordic-hamstring',
      'sit-to-stand',
      'tandem-stance',
      'diaphragmatic-breathing',
      'pelvic-floor-kegel',
    ];

    for (const slug of testSvgSlugs) {
      const svgUrl = `${PRODUCTION_URL}/images/exercises/${slug}.svg`;
      const svgRes = await fetchUrl(svgUrl);
      const isSvgOk = svgRes.statusCode === 200 && svgRes.body.includes('<svg') && svgRes.body.includes('viewBox="0 0 320 220"');
      record(`Live SVG Asset /images/exercises/${slug}.svg is served live`, isSvgOk, `HTTP ${svgRes.statusCode}, ${svgRes.body.length} bytes`);
    }

    // 7. Security invariants: zero leaks in bundle
    const hasSecretKey = /sk_live_[a-zA-Z0-9]+/.test(bundleRes.body) || /sk_test_[a-zA-Z0-9]+/.test(bundleRes.body);
    record('Main bundle contains zero leaked secret keys', !hasSecretKey);
    const hasKabworld = /kabworld/i.test(bundleRes.body);
    record('Main bundle contains zero legacy Kabworld references', !hasKabworld);

    // 8. Serverless function security guard
    const fnRes = await fetchUrl(`${PRODUCTION_URL}/api/verify-payment`);
    record('Serverless function enforces HTTP method guards', fnRes.statusCode === 405 || fnRes.statusCode === 401, `HTTP ${fnRes.statusCode}`);

  } catch (err) {
    console.error('Fatal probe error:', err);
    failed++;
  }

  console.log('\n==============================================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==============================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveVerification();
