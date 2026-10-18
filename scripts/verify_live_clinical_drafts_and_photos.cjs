// ==============================================================================
// PHYSENRA — LIVE PRODUCTION POST-DEPLOYMENT VERIFICATION SCRIPT
// File: scripts/verify_live_clinical_drafts_and_photos.cjs
// ==============================================================================

const https = require('node:https');

const BASE_URL = 'https://physenra.com';

function fetchUrl(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runLiveVerification() {
  console.log('================================================================');
  console.log('PHYSENRA LIVE PRODUCTION VERIFICATION');
  console.log(`Target: ${BASE_URL}`);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assertCheck(name, condition, details = '') {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  // 1. Verify /api/form-drafts endpoint security
  console.log('--- 1. Testing /api/form-drafts Serverless Endpoint ---');
  try {
    const unauthGet = await fetchUrl('/api/form-drafts?formId=test_form');
    assertCheck(
      'Unauthenticated GET /api/form-drafts returns 401 Unauthorized',
      unauthGet.statusCode === 401,
      `Received HTTP ${unauthGet.statusCode}`
    );

    const corsOptions = await fetchUrl('/api/form-drafts', { method: 'OPTIONS' });
    assertCheck(
      'OPTIONS /api/form-drafts returns 204 No Content with CORS headers',
      corsOptions.statusCode === 204 && corsOptions.headers['access-control-allow-origin'] === '*',
      `Received HTTP ${corsOptions.statusCode}`
    );

    const unauthPost = await fetchUrl('/api/form-drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formId: 'test', data: {} }),
    });
    assertCheck(
      'Unauthenticated POST /api/form-drafts returns 401 Unauthorized',
      unauthPost.statusCode === 401,
      `Received HTTP ${unauthPost.statusCode}`
    );
  } catch (err) {
    console.error('Error during endpoint test:', err);
    failed++;
  }

  // 2. Verify Nigerian Photographic Demonstration Assets on Production
  console.log('\n--- 2. Testing Live Nigerian Photographic Demonstrations ---');
  const verifiedPhotos = [
    { slug: 'quad-sets', file: '/images/exercises/photographs/quad-sets.jpg', title: 'Quad Sets' },
    { slug: 'straight-leg-raise', file: '/images/exercises/photographs/straight-leg-raise.jpg', title: 'Straight Leg Raise' },
    { slug: 'glute-bridge', file: '/images/exercises/photographs/glute-bridge.jpg', title: 'Glute Bridge' },
    { slug: 'sit-to-stand', file: '/images/exercises/photographs/sit-to-stand.jpg', title: 'Sit-to-Stand' },
    { slug: 'seated-chin-tuck', file: '/images/exercises/photographs/seated-chin-tuck.jpg', title: 'Seated Chin Tuck' },
    { slug: 'prone-on-elbows', file: '/images/exercises/photographs/prone-on-elbows.jpg', title: 'Prone on Elbows' },
  ];

  for (const item of verifiedPhotos) {
    try {
      const res = await fetchUrl(item.file);
      const isOk = res.statusCode === 200;
      const isJpeg = (res.headers['content-type'] || '').includes('image/jpeg');
      assertCheck(
        `Verified photo: ${item.title} (${item.file}) returns 200 image/jpeg`,
        isOk && isJpeg,
        `Status: ${res.statusCode}, Content-Type: ${res.headers['content-type']}`
      );
    } catch (err) {
      console.error(`Error fetching ${item.file}:`, err);
      failed++;
    }
  }

  // 3. Verify Homepage & Clinical App Shell
  console.log('\n--- 3. Testing Web Application Frontend Shell ---');
  try {
    const rootRes = await fetchUrl('/');
    assertCheck(
      'Root / returns HTTP 200 with HTML shell',
      rootRes.statusCode === 200 && rootRes.body.includes('<!DOCTYPE html>'),
      `Status: ${rootRes.statusCode}`
    );
  } catch (err) {
    console.error('Error fetching root:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`LIVE VERIFICATION COMPLETE: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveVerification();
