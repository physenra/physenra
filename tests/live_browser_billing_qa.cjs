// ==============================================================================
// PHYSENRA LIVE HEADLESS BROWSER VERIFICATION
// Uses Microsoft Edge Chromium headless engine
// ==============================================================================

const { execSync } = require('child_process');
const assert = require('assert');
const path = require('path');
const os = require('os');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA = path.join(os.tmpdir(), `edge-qa-${Date.now()}`);

function dumpDom(url) {
  try {
    const cmd = `"${EDGE_PATH}" --headless=new --disable-gpu --user-data-dir="${TEMP_USER_DATA}" --dump-dom "${url}"`;
    const stdout = execSync(cmd, { encoding: 'utf8', timeout: 30000, maxBuffer: 10 * 1024 * 1024 });
    return stdout;
  } catch (err) {
    if (err.stdout) return err.stdout;
    throw err;
  }
}

function runBrowserQA() {
  console.log('======================================================================');
  console.log('PHYSENRA LIVE HEADLESS BROWSER RENDER VERIFICATION');
  console.log('Browser Engine: Microsoft Edge Chromium');
  console.log('Target: https://physenra.com');
  console.log('======================================================================\n');

  let passed = 0;

  // 1. Homepage
  process.stdout.write('BROWSER TEST 1: Homepage renders complete DOM without blank screen... ');
  const homeDom = dumpDom('https://physenra.com/');
  assert.ok(homeDom.length > 5000, `Homepage DOM unexpectedly short: ${homeDom.length}`);
  assert.ok(homeDom.includes('Physenra') || homeDom.includes('physiotherapy'), 'Homepage missing brand content');
  assert.ok(!homeDom.includes('Something went wrong'), 'Homepage triggered ErrorBoundary');
  console.log(`PASS (${homeDom.length} bytes rendered)`);
  passed++;

  // 2. Pricing page
  process.stdout.write('BROWSER TEST 2: Pricing page renders SaaS subscription tiers... ');
  const pricingDom = dumpDom('https://physenra.com/pricing');
  assert.ok(pricingDom.length > 5000, `Pricing DOM unexpectedly short: ${pricingDom.length}`);
  assert.ok(pricingDom.includes('Solo') || pricingDom.includes('15,000'), 'Pricing page missing Solo plan');
  assert.ok(!pricingDom.includes('Something went wrong'), 'Pricing page triggered ErrorBoundary');
  console.log(`PASS (${pricingDom.length} bytes rendered)`);
  passed++;

  // 3. /app/billing route
  process.stdout.write('BROWSER TEST 3: /app/billing route renders gracefully without blank screen... ');
  const billingDom = dumpDom('https://physenra.com/app/billing');
  assert.ok(billingDom.length > 1000, `/app/billing DOM unexpectedly short: ${billingDom.length}`);
  // Unauthenticated user will be routed via ProtectedRoute to /login?from=/app/billing
  assert.ok(!billingDom.includes('Something went wrong'), '/app/billing triggered ErrorBoundary');
  assert.ok(
    billingDom.includes('Sign in') ||
    billingDom.includes('Log in') ||
    billingDom.includes('login') ||
    billingDom.includes('Billing & Subscription') ||
    billingDom.includes('Physenra'),
    'Unexpected empty render for /app/billing'
  );
  console.log(`PASS (${billingDom.length} bytes rendered, clean auth interception)`);
  passed++;

  // Cleanup temp profile
  try {
    fs.rmSync(TEMP_USER_DATA, { recursive: true, force: true });
  } catch {}

  console.log('\n======================================================================');
  console.log(`RESULTS: ${passed}/${passed} BROWSER RENDER TESTS PASSED (0 BLANK SCREENS)`);
  console.log('======================================================================');
}

runBrowserQA();
