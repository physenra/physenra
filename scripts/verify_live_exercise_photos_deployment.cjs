const https = require('https');

const PRODUCTION_URL = 'https://physenra.com';
const UNIQUE_DEPLOY_URL = 'https://6ad4dd8ef22e3252dc207237--physenra.netlify.app';
const MAIN_BUNDLE_PATH = '/assets/index-BIeZ1uPe.js';
const CSS_BUNDLE_PATH = '/assets/index-Cy-uX9Xa.css';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          length: data.length
        });
      });
    }).on('error', reject);
  });
}

function checkImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let bytes = 0;
      res.on('data', (chunk) => { bytes += chunk.length; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          length: bytes
        });
      });
    }).on('error', reject);
  });
}

async function verifyLive() {
  console.log('==============================================================================');
  console.log('PHYSENRA PRODUCTION LIVE VERIFICATION');
  console.log('Target Production URL:', PRODUCTION_URL);
  console.log('Unique Deploy URL:', UNIQUE_DEPLOY_URL);
  console.log('Timestamp:', new Date().toISOString());
  console.log('==============================================================================\n');

  let failed = 0;
  function assertCheck(label, cond, extra = '') {
    if (cond) {
      console.log(`[PASS] ${label}${extra ? ` (${extra})` : ''}`);
    } else {
      console.error(`[FAIL] ${label}${extra ? ` (${extra})` : ''}`);
      failed++;
    }
  }

  // 1. Root & Deploy URL
  const root = await fetchUrl(PRODUCTION_URL);
  assertCheck('Live Root HTTP 200 OK', root.statusCode === 200, `HTTP ${root.statusCode}`);
  assertCheck('Live Root mounts app element', root.body.includes('id="root"'));

  const unique = await fetchUrl(UNIQUE_DEPLOY_URL);
  assertCheck('Unique Deploy HTTP 200 OK', unique.statusCode === 200, `HTTP ${unique.statusCode}`);

  // 2. Main Bundle
  const bundle = await fetchUrl(PRODUCTION_URL + MAIN_BUNDLE_PATH);
  assertCheck('Main JS Bundle HTTP 200 OK', bundle.statusCode === 200, `HTTP ${bundle.statusCode}, ${bundle.length} bytes`);
  assertCheck('Main Bundle includes "Clinically Verified Photo"', bundle.body.includes('Clinically Verified Photo'));
  assertCheck('Main Bundle includes "Photo demonstration coming soon"', bundle.body.includes('Photo demonstration coming soon'));
  assertCheck('Main Bundle retired "Visual in review" placeholder', !bundle.body.includes('Visual in review'));
  assertCheck('Main Bundle retired "Photo Demo (In Review)" toggle', !bundle.body.includes('Photo Demo (In Review)'));
  assertCheck('Main Bundle has zero secret key leaks', !/sk_live_[a-zA-Z0-9]+/.test(bundle.body));
  assertCheck('Main Bundle has zero Kabworld leaks', !/kabworld/i.test(bundle.body));

  // 3. CSS Bundle
  const css = await fetchUrl(PRODUCTION_URL + CSS_BUNDLE_PATH);
  assertCheck('CSS Bundle HTTP 200 OK', css.statusCode === 200, `HTTP ${css.statusCode}, ${css.length} bytes`);
  assertCheck('CSS Bundle contains exercise-visual-container rules', css.body.includes('exercise-visual-container'));

  // 4. Live Photos
  const photos = [
    'quad-sets.jpg',
    'straight-leg-raise.jpg',
    'glute-bridge.jpg',
    'seated-chin-tuck.jpg',
    'prone-on-elbows.jpg',
    'sit-to-stand.jpg',
    'standing-calf-stretch.jpg'
  ];

  for (const photo of photos) {
    const img = await checkImage(`${PRODUCTION_URL}/images/exercises/photographs/${photo}`);
    const ok = img.statusCode === 200 && img.contentType && img.contentType.includes('image/jpeg') && img.length > 20000;
    assertCheck(`Photo Asset /images/exercises/photographs/${photo}`, ok, `HTTP ${img.statusCode}, ${img.contentType}, ${(img.length/1024).toFixed(1)} KB`);
  }

  console.log('\n==============================================================================');
  console.log(`Verification Summary: ${failed === 0 ? 'ALL CHECKS PASSED SUCCESSFULLY!' : `${failed} CHECKS FAILED`}`);
  console.log('==============================================================================\n');
  process.exit(failed === 0 ? 0 : 1);
}

verifyLive().catch(e => {
  console.error('Fatal probe error:', e);
  process.exit(1);
});
