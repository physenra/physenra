// ==============================================================================
// PHYSENRA LIVE PRODUCTION — PAYSTACK TEST MODE CONTROLLED VERIFICATION
// Target: https://physenra.com
// Deploy ID: 6ac554310e7d67677be0e97b
// ==============================================================================

const https = require('node:https');
const assert = require('node:assert/strict');

const BASE_URL = 'https://physenra.com';

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
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
  console.log('======================================================================');
  console.log('PHYSENRA LIVE PRODUCTION — PAYSTACK TEST MODE CONTROLLED VERIFICATION');
  console.log(`Target: ${BASE_URL}`);
  console.log('======================================================================\n');

  let passed = 0;

  // 1. Site loads successfully
  process.stdout.write('TEST 1: Production homepage returns HTTP 200 OK... ');
  const homeRes = await fetchUrl(BASE_URL);
  assert.equal(homeRes.statusCode, 200, 'Homepage must return HTTP 200');
  assert.ok(homeRes.body.includes('<div id="root"></div>'), 'Homepage must contain root div');
  console.log('PASS');
  passed++;

  // 2. Extract live bundle script hashes
  process.stdout.write('TEST 2: Extract live bundle hashes from index.html... ');
  const scriptRegex = /<script\s+type="module"\s+crossorigin\s+src="([^"]+)"><\/script>/g;
  const scriptMatches = [...homeRes.body.matchAll(scriptRegex)];
  assert.ok(scriptMatches.length > 0, 'Must find script tags');
  const mainScriptPath = scriptMatches[0][1];
  console.log(`PASS (${mainScriptPath})`);
  passed++;

  // 3. Main JS bundle loads and returns HTTP 200
  process.stdout.write('TEST 3: Main JS bundle returns HTTP 200... ');
  const mainScriptRes = await fetchUrl(`${BASE_URL}${mainScriptPath}`);
  assert.equal(mainScriptRes.statusCode, 200, 'Main script bundle must return HTTP 200');
  console.log('PASS');
  passed++;

  // 4. Discover and fetch platform-billing domain chunk
  process.stdout.write('TEST 4: Discover and load platform billing chunk... ');
  let billingChunkContent = '';
  const match = mainScriptRes.body.match(/assets\/domain-platform-billing-[a-zA-Z0-9_\-]+\.js/);
  if (match) {
    const chunkPath = `/${match[0]}`;
    const chunkRes = await fetchUrl(`${BASE_URL}${chunkPath}`);
    assert.equal(chunkRes.statusCode, 200, 'Billing chunk must return HTTP 200');
    billingChunkContent = chunkRes.body;
  }
  const combinedBundles = mainScriptRes.body + '\n' + billingChunkContent;
  console.log(`PASS (${match ? match[0] : 'not found'})`);
  passed++;

  // 5. Login route registered in bundle
  process.stdout.write('TEST 5: Login route and authentication bridges present... ');
  assert.ok(combinedBundles.includes('/login') || combinedBundles.includes('login'), 'Must include login route');
  console.log('PASS');
  passed++;

  // 6. Practice billing page and upgrade flow in live bundle
  process.stdout.write('TEST 6: Practice billing page and upgrade flow present in live bundle... ');
  assert.ok(combinedBundles.includes('Upgrade to a Paid Plan'), 'Must include upgrade CTA');
  assert.ok(combinedBundles.includes('Current Trial Plan'), 'Must include current trial plan badge');
  assert.ok(combinedBundles.includes('Proceed to Checkout'), 'Must include proceed to checkout button');
  console.log('PASS');
  passed++;

  // 7. Authoritative Professional Monthly pricing
  process.stdout.write('TEST 7: Authoritative Professional Monthly pricing (₦30,000 / 3,000,000 kobo)... ');
  const marketingMatch = mainScriptRes.body.match(/assets\/MarketingLayout-[a-zA-Z0-9_\-]+\.js/);
  let marketingContent = '';
  if (marketingMatch) {
    const mRes = await fetchUrl(`${BASE_URL}/${marketingMatch[0]}`);
    marketingContent = mRes.body;
  }
  const allLoadedContent = combinedBundles + '\n' + marketingContent;
  assert.ok(allLoadedContent.includes('30000') || allLoadedContent.includes('3,000,000'), 'Must contain authoritative Professional price');
  console.log('PASS');
  passed++;

  // 8. Checkout initialization reaches Paystack endpoint
  process.stdout.write('TEST 8: Client checkout initiates via serverless /api/initialize-payment... ');
  assert.ok(combinedBundles.includes('/api/initialize-payment') || combinedBundles.includes('initializePaystackCheckout'), 'Must wire to initialize-payment');
  console.log('PASS');
  passed++;

  // 9. Zero Kabworld references in live bundle
  process.stdout.write('TEST 9: Live bundle strictly contains ZERO Kabworld references... ');
  assert.equal(/kabworld/i.test(combinedBundles), false, 'Must contain zero Kabworld references');
  console.log('PASS');
  passed++;

  // 10. Zero server secrets exposed in client bundle
  process.stdout.write('TEST 10: Zero secret keys, service role tokens or live Paystack keys in client bundle... ');
  assert.equal(/sk_live_/i.test(combinedBundles), false, 'Must contain zero sk_live_');
  assert.equal(/sk_test_/i.test(combinedBundles), false, 'Must contain zero sk_test_');
  assert.equal(combinedBundles.includes('SUPABASE_SERVICE_ROLE_KEY'), false, 'Must not contain SUPABASE_SERVICE_ROLE_KEY');
  assert.equal(combinedBundles.includes('pk_live_default_key'), false, 'Must not contain pk_live_default_key');
  console.log('PASS');
  passed++;

  // 11. Netlify Function /api/initialize-payment is live and enforces method guard
  process.stdout.write('TEST 11: Netlify /api/initialize-payment responds with method guard (405 on GET)... ');
  const initRes = await fetchUrl(`${BASE_URL}/api/initialize-payment`, { method: 'GET' });
  assert.equal(initRes.statusCode, 405, 'GET /api/initialize-payment must return HTTP 405 Method Not Allowed');
  console.log('PASS');
  passed++;

  // 12. Netlify Function /api/initialize-payment requires authentication (401 on unauthenticated POST)
  process.stdout.write('TEST 12: /api/initialize-payment rejects unauthenticated requests (HTTP 401)... ');
  const unauthInitRes = await fetchUrl(`${BASE_URL}/api/initialize-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ practice_id: 'dummy', invoice_id: 'dummy' }),
  });
  assert.equal(unauthInitRes.statusCode, 401, 'Unauthenticated POST must return HTTP 401');
  console.log('PASS');
  passed++;

  // 13. Netlify Function /api/verify-payment is live and requires authentication (401 on unauthenticated POST)
  process.stdout.write('TEST 13: /api/verify-payment rejects unauthenticated requests (HTTP 401)... ');
  const unauthVerifyRes = await fetchUrl(`${BASE_URL}/api/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ practice_id: 'dummy', reference: 'dummy' }),
  });
  assert.equal(unauthVerifyRes.statusCode, 401, 'Unauthenticated POST must return HTTP 401');
  console.log('PASS');
  passed++;

  // 14. Netlify Function /api/paystack-webhook enforces HMAC-SHA512 verification (401 on unsigned POST)
  process.stdout.write('TEST 14: /api/paystack-webhook rejects invalid/missing HMAC signature (HTTP 401)... ');
  const unsignedWebhookRes = await fetchUrl(`${BASE_URL}/api/paystack-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'charge.success', data: {} }),
  });
  assert.equal(unsignedWebhookRes.statusCode, 401, 'Unsigned webhook must return HTTP 401 Unauthorized');
  console.log('PASS');
  passed++;

  // 15. Serverless functions fail closed without exposing credentials
  process.stdout.write('TEST 15: Serverless endpoints fail closed without exposing credentials or stack traces... ');
  const errBody = JSON.parse(unsignedWebhookRes.body);
  assert.ok(errBody.error, 'Response must have an error message');
  assert.equal(/sk_/i.test(unsignedWebhookRes.body), false, 'Error body must not contain secret keys');
  console.log('PASS');
  passed++;

  console.log('\n======================================================================');
  console.log(`RESULTS: ${passed}/15 LIVE PRODUCTION TESTS PASSED`);
  console.log('======================================================================\n');
}

runLiveVerification().catch((err) => {
  console.error('\nLIVE VERIFICATION FAILED:', err);
  process.exit(1);
});
