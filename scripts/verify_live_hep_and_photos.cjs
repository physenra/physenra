const assert = require('assert/strict');

const BASE_URL = 'https://physenra.com';

async function main() {
  console.log('--- PHYSENRA LIVE PRODUCTION VERIFICATION ---');
  console.log('Target:', BASE_URL);

  // 1. Verify index.html loads
  const indexRes = await fetch(BASE_URL);
  assert.equal(indexRes.status, 200, 'index.html must return 200');
  const indexHtml = await indexRes.text();
  assert(indexHtml.includes('doctype html') || indexHtml.includes('<!DOCTYPE html>'), 'Must return valid HTML');
  console.log('✔ index.html returned HTTP 200 OK');

  // 2. Verify new photographs exist and return HTTP 200 with image/jpeg
  const photos = [
    { name: 'ACBT Breathing', path: '/images/exercises/photographs/acbt-breathing.jpg' },
    { name: 'Ankle Pumps', path: '/images/exercises/photographs/ankle-pumps.jpg' },
    { name: 'Sit to Stand / 30CST', path: '/images/exercises/photographs/sit-to-stand.jpg' },
    { name: 'Quad Sets', path: '/images/exercises/photographs/quad-sets.jpg' },
    { name: 'Straight Leg Raise', path: '/images/exercises/photographs/straight-leg-raise.jpg' },
    { name: 'Glute Bridge', path: '/images/exercises/photographs/glute-bridge.jpg' },
    { name: 'Prone on Elbows', path: '/images/exercises/photographs/prone-on-elbows.jpg' },
    { name: 'Seated Chin Tuck', path: '/images/exercises/photographs/seated-chin-tuck.jpg' },
    { name: 'Heel Slides', path: '/images/exercises/photographs/heel-slides.jpg' },
    { name: 'Cat-Camel', path: '/images/exercises/photographs/cat-camel.jpg' },
    { name: 'Scapular Retraction', path: '/images/exercises/photographs/scapular-retraction.jpg' },
    { name: 'Diaphragmatic Breathing', path: '/images/exercises/photographs/diaphragmatic-breathing.jpg' },
  ];

  for (const photo of photos) {
    const res = await fetch(BASE_URL + photo.path);
    assert.equal(res.status, 200, `Photo ${photo.name} at ${photo.path} must return 200 OK`);
    const contentType = res.headers.get('content-type');
    assert(contentType && contentType.includes('image'), `Photo ${photo.name} must return image content-type (got ${contentType})`);
    const buffer = await res.arrayBuffer();
    assert(buffer.byteLength > 20000, `Photo ${photo.name} must be > 20KB (got ${buffer.byteLength})`);
    console.log(`✔ Verified live photo: ${photo.name} (${(buffer.byteLength / 1024).toFixed(1)} KB)`);
  }

  // 3. Verify serverless endpoints
  const draftsRes = await fetch(BASE_URL + '/api/form-drafts');
  assert.equal(draftsRes.status, 401, 'Unauthenticated form-drafts must return 401 Unauthorized');
  console.log('✔ Verified live serverless endpoint /api/form-drafts enforces authentication (HTTP 401)');

  const initPayRes = await fetch(BASE_URL + '/api/initialize-payment', { method: 'POST' });
  assert.equal(initPayRes.status, 401, 'Unauthenticated initialize-payment must return 401 Unauthorized');
  console.log('✔ Verified live serverless endpoint /api/initialize-payment enforces authentication (HTTP 401)');

  // 4. Verify javascript bundles
  const scriptMatch = indexHtml.match(/src="(\/assets\/index-[^"]+\.js)"/);
  assert(scriptMatch, 'Must find main index JS bundle in HTML');
  const bundleRes = await fetch(BASE_URL + scriptMatch[1]);
  assert.equal(bundleRes.status, 200, 'Main bundle must return 200');
  const bundleText = await bundleRes.text();
  assert(bundleText.includes('create_home_exercise_program_atomic'), 'Live bundle must reference atomic RPC');
  assert(bundleText.includes('Photo demonstration coming soon'), 'Live bundle must include photo demonstration coming soon label');
  assert(bundleText.includes('Clinically Verified Photo'), 'Live bundle must include verified photo badge label');
  assert(!bundleText.toLowerCase().includes('kabworld'), 'Live bundle must contain zero Kabworld references');
  console.log('✔ Verified live JS bundle integrity: contains atomic RPC, multi-key visual registry, and zero Kabworld references');

  console.log('\n--- ALL LIVE PRODUCTION VERIFICATIONS PASSED ---');
}

main().catch((err) => {
  console.error('Live verification failed:', err);
  process.exit(1);
});
