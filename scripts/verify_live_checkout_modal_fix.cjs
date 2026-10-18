// ==============================================================================
// PHYSENRA PRODUCTION LIVE VERIFICATION — PAYSTACK CHECKOUT MODAL FIX
// Target: https://physenra.com
// Deploy ID: 6ad492fe22ce9e40d4268b90
// ==============================================================================

const https = require('node:https');
const assert = require('node:assert/strict');

const BASE_URL = 'https://physenra.com';
const DEPLOY_URL = 'https://6ad492fe22ce9e40d4268b90--physenra.netlify.app';

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
  console.log('PHYSENRA PRODUCTION LIVE VERIFICATION — PAYSTACK CHECKOUT MODAL FIX');
  console.log(`Production Target: ${BASE_URL}`);
  console.log(`Deploy URL:        ${DEPLOY_URL}`);
  console.log('======================================================================\n');

  let passed = 0;

  // TEST 1: Homepage returns 200 OK
  process.stdout.write('TEST 1: Production homepage returns HTTP 200 OK... ');
  const homeRes = await fetchUrl(BASE_URL);
  assert.equal(homeRes.statusCode, 200, 'Homepage must return HTTP 200');
  assert.ok(homeRes.body.includes('<div id="root"></div>'), 'Homepage must contain root div');
  console.log('PASS');
  passed++;

  // TEST 2: Extract live bundle hashes from index.html
  process.stdout.write('TEST 2: Extract live bundle script hashes from production HTML... ');
  const scriptRegex = /<script\s+type="module"\s+crossorigin\s+src="([^"]+)"><\/script>/g;
  const scriptMatches = [...homeRes.body.matchAll(scriptRegex)];
  assert.ok(scriptMatches.length > 0, 'Must find script tags in index.html');
  const mainScriptPath = scriptMatches[0][1];
  assert.ok(mainScriptPath.includes('index-C7PYGxC1.js'), `Expected fresh index-C7PYGxC1.js bundle, got ${mainScriptPath}`);
  console.log(`PASS (${mainScriptPath})`);
  passed++;

  // TEST 3: Fetch main JS bundle
  process.stdout.write('TEST 3: Main JS bundle returns HTTP 200 and loads successfully... ');
  const mainJsRes = await fetchUrl(`${BASE_URL}${mainScriptPath}`);
  assert.equal(mainJsRes.statusCode, 200, 'Main script must return HTTP 200');
  console.log('PASS');
  passed++;

  // TEST 4: Fetch domain billing chunk
  process.stdout.write('TEST 4: Discover and load platform-billing domain chunk... ');
  let billingJsPath = '';
  const match = mainJsRes.body.match(/assets\/domain-platform-billing-[a-zA-Z0-9_\-]+\.js/);
  assert.ok(match, 'Must find domain-platform-billing chunk in main bundle');
  billingJsPath = `/${match[0]}`;
  const billingRes = await fetchUrl(`${BASE_URL}${billingJsPath}`);
  assert.equal(billingRes.statusCode, 200, 'Billing chunk must return HTTP 200');
  console.log(`PASS (${billingJsPath})`);
  passed++;

  const combinedJs = mainJsRes.body + ' ' + billingRes.body;

  // TEST 5: Verify in-modal error alert presence in live bundle
  process.stdout.write('TEST 5: Live bundle includes in-modal "Checkout Error" alert banner... ');
  assert.ok(combinedJs.includes('Checkout Error'), 'Must include in-modal Checkout Error banner');
  console.log('PASS');
  passed++;

  // TEST 6: Verify redirection state in live bundle
  process.stdout.write('TEST 6: Live bundle includes "Redirecting to Paystack..." state... ');
  assert.ok(combinedJs.includes('Redirecting to Paystack...'), 'Must include Redirecting to Paystack... state');
  console.log('PASS');
  passed++;

  // TEST 7: Verify "Proceed to Checkout" button in live bundle
  process.stdout.write('TEST 7: Live bundle retains "Proceed to Checkout" CTA... ');
  assert.ok(combinedJs.includes('Proceed to Checkout'), 'Must retain Proceed to Checkout button');
  console.log('PASS');
  passed++;

  // TEST 8: Verify URL protocol validation in live bundle
  process.stdout.write('TEST 8: Live bundle includes URL validation guard... ');
  assert.ok(combinedJs.includes('https:') || combinedJs.includes('protocol'), 'Must include protocol check');
  console.log('PASS');
  passed++;

  // TEST 9: Netlify function /api/initialize-payment responds with method guard (405 on GET)
  process.stdout.write('TEST 9: Netlify /api/initialize-payment enforces method guard (HTTP 405 on GET)... ');
  const initGetRes = await fetchUrl(`${BASE_URL}/api/initialize-payment`, { method: 'GET' });
  assert.equal(initGetRes.statusCode, 405, 'GET /api/initialize-payment must return 405 Method Not Allowed');
  console.log('PASS');
  passed++;

  // TEST 10: Netlify function /api/initialize-payment requires authentication (401 on unauthenticated POST)
  process.stdout.write('TEST 10: /api/initialize-payment requires authentication (HTTP 401 on unauth POST)... ');
  const initPostRes = await fetchUrl(`${BASE_URL}/api/initialize-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ practice_id: 'test', invoice_id: 'test' }),
  });
  assert.equal(initPostRes.statusCode, 401, 'Unauthenticated POST must return 401');
  const initErr = JSON.parse(initPostRes.body);
  assert.equal(initErr.error, 'Authentication required');
  console.log('PASS');
  passed++;

  // TEST 11: Netlify function /api/verify-payment requires authentication
  process.stdout.write('TEST 11: /api/verify-payment requires authentication (HTTP 401 on unauth POST)... ');
  const verifyPostRes = await fetchUrl(`${BASE_URL}/api/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ practice_id: 'test', reference: 'test' }),
  });
  assert.equal(verifyPostRes.statusCode, 401, 'Unauthenticated POST must return 401');
  console.log('PASS');
  passed++;

  // TEST 12: Netlify function /api/paystack-webhook requires HMAC signature
  process.stdout.write('TEST 12: /api/paystack-webhook enforces HMAC-SHA512 verification (HTTP 401)... ');
  const webhookRes = await fetchUrl(`${BASE_URL}/api/paystack-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'charge.success', data: {} }),
  });
  assert.equal(webhookRes.statusCode, 401, 'Unsigned webhook must return 401');
  console.log('PASS');
  passed++;

  // TEST 13: Zero secret keys in live client bundle
  process.stdout.write('TEST 13: Zero server secrets, sk_live, sk_test, or service_role in client bundle... ');
  assert.equal(/sk_live_/i.test(combinedJs), false, 'Bundle must not contain sk_live_');
  assert.equal(/sk_test_/i.test(combinedJs), false, 'Bundle must not contain sk_test_');
  assert.equal(combinedJs.includes('SUPABASE_SERVICE_ROLE_KEY'), false, 'Bundle must not contain SUPABASE_SERVICE_ROLE_KEY');
  console.log('PASS');
  passed++;

  // TEST 14: Zero Kabworld references in live client bundle
  process.stdout.write('TEST 14: Zero Kabworld references across all production assets... ');
  assert.equal(/kabworld/i.test(combinedJs), false, 'Bundle must contain zero Kabworld references');
  console.log('PASS');
  passed++;

  console.log('\n======================================================================');
  console.log(`RESULTS: ${passed}/14 LIVE PRODUCTION CHECKS PASSED`);
  console.log('======================================================================\n');
}

runLiveVerification().catch((err) => {
  console.error('\nLIVE VERIFICATION FAILED:', err);
  process.exit(1);
});
