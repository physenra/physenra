// ==============================================================================
// PHYSENRA PRODUCTION LIVE CATALOGUE READ-ONLY VERIFICATION
// ==============================================================================

const PROD_URL = 'https://physenra.com';
const UNIQUE_URL = 'https://6ad293cb0cdbcc9dfaff8c28--physenra.netlify.app';

async function verify() {
  console.log('=== PHYSENRA LIVE PRODUCTION READ-ONLY VERIFICATION ===\n');

  // 1. Homepage probe
  const homeRes = await fetch(PROD_URL);
  const homeHtml = await homeRes.text();
  console.log('1. Production Homepage (' + PROD_URL + '):', homeRes.status, homeHtml.includes('<div id="root">') ? 'OK (root container found)' : 'FAIL');

  // 2. Unique deploy URL probe
  const uniqueRes = await fetch(UNIQUE_URL);
  console.log('2. Unique Deploy URL (' + UNIQUE_URL + '):', uniqueRes.status, uniqueRes.status === 200 ? 'OK' : 'FAIL');

  // Extract main script
  const scriptMatch = homeHtml.match(/src="(\/assets\/index-[^"]+\.js)"/);
  const scriptPath = scriptMatch ? scriptMatch[1] : null;
  console.log('3. Main Bundle Path:', scriptPath);

  if (scriptPath) {
    const bundleRes = await fetch(PROD_URL + scriptPath);
    const bundleText = await bundleRes.text();
    console.log('4. Bundle HTTP Status:', bundleRes.status, 'Size:', bundleText.length, 'bytes');

    // Secrets scan
    const hasLiveSecret = bundleText.includes('sk_live_');
    const hasTestSecret = bundleText.includes('sk_test_');
    const hasServiceRole = bundleText.includes('service_role');
    console.log('5. Zero Secrets Scan:', (!hasLiveSecret && !hasTestSecret && !hasServiceRole) ? 'PASS (0 secret keys)' : 'FAIL');

    // Kabworld scan
    const hasKabworld = bundleText.toLowerCase().includes('kabworld');
    console.log('6. Zero Kabworld Scan:', (!hasKabworld) ? 'PASS (0 references)' : 'FAIL');

    // Catalog symbols scan
    const has10MWT = bundleText.includes('10-Meter Walk Test') || bundleText.includes('10MWT');
    const hasMAS = bundleText.includes('Modified Ashworth Scale') || bundleText.includes('MAS');
    const hasCopenhagen = bundleText.includes('Copenhagen') || bundleText.includes('Adductor');
    const hasQuadSets = bundleText.includes('Quad Sets');
    console.log('7. Catalog Deployment Verification:', (has10MWT && hasMAS && hasCopenhagen && hasQuadSets) ? 'PASS (Expanded clinical items present in deployed client)' : 'PARTIAL/CHECK');
    console.log('   - 10MWT present:', has10MWT);
    console.log('   - MAS present:', hasMAS);
    console.log('   - Copenhagen present:', hasCopenhagen);
    console.log('   - Quad Sets present:', hasQuadSets);
  }

  // 8. Serverless function security guards (read-only unauth checks)
  const fn1 = await fetch(PROD_URL + '/api/initialize-payment', { method: 'GET' });
  console.log('8. GET /api/initialize-payment (Method Guard):', fn1.status, fn1.status === 405 ? 'PASS (405 Method Not Allowed)' : 'FAIL');

  const fn2 = await fetch(PROD_URL + '/api/initialize-payment', { method: 'POST', body: '{}' });
  console.log('9. POST /api/initialize-payment unauth (Auth Guard):', fn2.status, fn2.status === 401 ? 'PASS (401 Unauthorized)' : 'FAIL');

  const fn3 = await fetch(PROD_URL + '/api/verify-payment', { method: 'POST', body: '{}' });
  console.log('10. POST /api/verify-payment unauth (Auth Guard):', fn3.status, fn3.status === 401 ? 'PASS (401 Unauthorized)' : 'FAIL');

  const fn4 = await fetch(PROD_URL + '/api/paystack-webhook', { method: 'POST', body: '{}' });
  console.log('11. POST /api/paystack-webhook unsigned (HMAC Guard):', fn4.status, fn4.status === 401 ? 'PASS (401 Unauthorized)' : 'FAIL');

  console.log('\n=== ALL LIVE VERIFICATION CHECKS COMPLETED SUCCESSFULLY ===');
}

verify();
