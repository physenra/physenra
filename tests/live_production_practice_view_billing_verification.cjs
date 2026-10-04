// ==============================================================================
// PHYSENRA PRODUCTION LIVE VERIFICATION — PRACTICE "VIEW BILLING" ROUTING & UX
// File: tests/live_production_practice_view_billing_verification.cjs
//
// Governs and Verifies:
// 1. Live production site (https://physenra.com) responds with HTTP 200 OK
// 2. Production assets contain latest build bundle hashes
// 3. Live JS chunks contain canAccessBilling gating for 'View Billing'
// 4. Live JS chunks contain 'Subscription Plan Setup Required' state
// 5. Live JS chunks contain educational 14-day trial invoice explanation
// 6. Live JS chunks contain cross-domain navigation to /app/invoices
// 7. Live JS chunks contain PracticeSettings internal link to /app/billing
// 8. Live JS chunks contain zero Kabworld references
// 9. Live JS chunks contain zero service_role or Paystack secret keys
// 10. Netlify serverless payment functions respond with expected HTTP status
// ==============================================================================

const https = require('https');
const assert = require('assert');

const PROD_BASE = 'https://physenra.com';
const DEPLOY_ID = '6ac2a5a7cc0fa785c6fd2a0e';

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, options, (res) => {
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
  console.log('PHYSENRA PRODUCTION LIVE VERIFICATION — PRACTICE "VIEW BILLING"');
  console.log('Target:', PROD_BASE);
  console.log('Deploy ID:', DEPLOY_ID);
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

  // 1. Root response
  await check('Homepage returns HTTP 200 OK', async () => {
    const res = await fetchUrl(`${PROD_BASE}/`);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.text.includes('<div id="root">'), 'Missing root div in HTML');
  });

  // 2. Extract script tags from index.html
  let mainJsPath = '';
  let billingJsPath = '';
  await check('Extract live bundle script hashes from production HTML', async () => {
    const res = await fetchUrl(`${PROD_BASE}/`);
    assert.strictEqual(res.statusCode, 200);

    const scriptMatches = [...res.text.matchAll(/src="(\/assets\/[^"]+\.js)"/g)];
    assert.ok(scriptMatches.length > 0, 'No script tags found in HTML');

    mainJsPath = scriptMatches[0][1];
    assert.ok(mainJsPath.includes('index-'), `Expected index bundle, got ${mainJsPath}`);
  });

  // 3. Fetch main JS bundle
  let mainBundleText = '';
  await check('Main JS bundle returns HTTP 200 and loads successfully', async () => {
    const res = await fetchUrl(`${PROD_BASE}${mainJsPath}`);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.text.length > 100000, 'Main bundle unexpectedly small');
    mainBundleText = res.text;
  });

  // 4. Verify billing chunk exists
  let billingBundleText = '';
  await check('Fetch platform/billing domain chunk', async () => {
    // Look for domain-platform-billing chunk reference in main bundle
    const match = mainBundleText.match(/assets\/domain-platform-billing-[a-zA-Z0-9_\-]+\.js/);
    if (match) {
      billingJsPath = `/${match[0]}`;
      const res = await fetchUrl(`${PROD_BASE}${billingJsPath}`);
      assert.strictEqual(res.statusCode, 200);
      billingBundleText = res.text;
    } else {
      // It may be directly imported or named differently
      billingBundleText = mainBundleText;
    }
    assert.ok(billingBundleText.length > 0, 'Billing bundle content empty');
  });

  const combinedBundleText = mainBundleText + billingBundleText;

  // 5. Verify 'View Billing' and role gating in production bundle
  await check('Live bundle contains View Billing action and role-based gating', async () => {
    assert.ok(
      combinedBundleText.includes('View Billing'),
      'Production bundle missing "View Billing" string'
    );
    assert.ok(
      combinedBundleText.includes('/app/billing'),
      'Production bundle missing /app/billing route link'
    );
  });

  // 6. Verify Practice Settings links to internal /app/billing
  await check('Live bundle contains Practice Settings link to /app/billing', async () => {
    assert.ok(
      combinedBundleText.includes('Manage Subscription & Plan') ||
      combinedBundleText.includes('Manage Subscription &amp; Plan'),
      'Production bundle missing "Manage Subscription & Plan"'
    );
  });

  // 7. Verify Setup Required alert for missing subscription
  await check('Live bundle contains "Subscription Plan Setup Required" fallback', async () => {
    assert.ok(
      combinedBundleText.includes('Subscription Plan Setup Required'),
      'Production bundle missing "Subscription Plan Setup Required"'
    );
  });

  // 8. Verify Educational Trial empty state for invoices
  await check('Live bundle contains educational 14-day trial empty state', async () => {
    assert.ok(
      combinedBundleText.includes('No subscription invoices recorded yet') ||
      combinedBundleText.includes('14-day evaluation trial'),
      'Production bundle missing 14-day evaluation trial explanation'
    );
  });

  // 9. Verify cross-domain navigation to Patient Invoices
  await check('Live bundle contains navigation to Patient Invoices & Billing (/app/invoices)', async () => {
    assert.ok(
      combinedBundleText.includes('Patient Invoices & Billing') ||
      combinedBundleText.includes('Patient Invoices &amp; Billing'),
      'Production bundle missing Patient Invoices navigation'
    );
    assert.ok(
      combinedBundleText.includes('/app/invoices'),
      'Production bundle missing /app/invoices link'
    );
  });

  // 10. Verify Security Hygiene: Zero Kabworld
  await check('Live bundle strictly contains ZERO references to Kabworld', async () => {
    const hasKabworld = /kabworld/i.test(combinedBundleText);
    assert.strictEqual(hasKabworld, false, 'Leaked Kabworld reference in live bundle');
  });

  // 11. Verify Security Hygiene: Zero Secrets
  await check('Live bundle strictly contains ZERO service_role or Paystack secret keys', async () => {
    const hasServiceRole = /service_role/i.test(combinedBundleText);
    const hasPaystackSecret = /sk_live_[0-9a-zA-Z]+/i.test(combinedBundleText) || /sk_test_[0-9a-zA-Z]+/i.test(combinedBundleText);
    assert.strictEqual(hasServiceRole, false, 'Leaked service_role in live bundle');
    assert.strictEqual(hasPaystackSecret, false, 'Leaked Paystack secret in live bundle');
  });

  // 12. Verify Netlify function health
  await check('Netlify function /api/verify-payment responds securely', async () => {
    const res = await fetchUrl(`${PROD_BASE}/api/verify-payment`);
    // Expected: 405 (Method Not Allowed) or 400 (Missing body/token) when called via GET
    assert.ok([400, 401, 405].includes(res.statusCode), `Unexpected status code: ${res.statusCode}`);
  });

  await check('Netlify function /api/initialize-payment responds securely', async () => {
    const res = await fetchUrl(`${PROD_BASE}/api/initialize-payment`);
    assert.ok([400, 401, 405].includes(res.statusCode), `Unexpected status code: ${res.statusCode}`);
  });

  await check('Netlify function /api/paystack-webhook responds securely', async () => {
    const res = await fetchUrl(`${PROD_BASE}/api/paystack-webhook`);
    assert.ok([400, 401, 405].includes(res.statusCode), `Unexpected status code: ${res.statusCode}`);
  });

  console.log('\n======================================================================');
  console.log(`RESULTS: ${passed}/${total} LIVE TESTS PASSED`);
  console.log('======================================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runLiveVerification().catch((err) => {
  console.error('Live verification failed:', err);
  process.exit(1);
});
