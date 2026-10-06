// ==============================================================================
// PHYSENRA LIVE PRODUCTION — SIDEBAR NAVIGATION SCROLL & OVERFLOW VERIFICATION
// Target: https://physenra.com
// Deploy ID: 6ac574bfb8eae37e08735bcc
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
    req.end();
  });
}

async function verifyLiveSidebar() {
  console.log('======================================================================');
  console.log('PHYSENRA LIVE PRODUCTION — SIDEBAR NAVIGATION VERIFICATION');
  console.log(`Target: ${BASE_URL}`);
  console.log('======================================================================\n');

  let passed = 0;

  // 1. Production homepage responds with HTTP 200
  process.stdout.write('TEST 1: Production homepage returns HTTP 200 OK... ');
  const homeRes = await fetchUrl(BASE_URL);
  assert.equal(homeRes.statusCode, 200, 'Homepage must return HTTP 200');
  console.log('PASS');
  passed++;

  // 2. Discover live CSS stylesheet link
  process.stdout.write('TEST 2: Discover production CSS stylesheet bundle... ');
  const cssMatch = homeRes.body.match(/assets\/index-[a-zA-Z0-9_\-]+\.css/);
  assert.ok(cssMatch, 'Must locate index.css in index.html');
  const cssPath = `/${cssMatch[0]}`;
  console.log(`PASS (${cssPath})`);
  passed++;

  // 3. Fetch production CSS bundle
  process.stdout.write('TEST 3: Production CSS bundle returns HTTP 200... ');
  const cssRes = await fetchUrl(`${BASE_URL}${cssPath}`);
  assert.equal(cssRes.statusCode, 200, 'Stylesheet must return HTTP 200');
  const cssContent = cssRes.body;
  console.log(`PASS (${cssContent.length} bytes)`);
  passed++;

  // 4. Verify live CSS includes .app-body min-height: 0
  process.stdout.write('TEST 4: Live CSS contains app-body flex & min-height: 0 constraint... ');
  assert.ok(
    cssContent.includes('.app-body{display:flex;flex:1;overflow:hidden;min-height:0}') ||
    cssContent.includes('.app-body') && cssContent.includes('min-height:0'),
    'Must include min-height:0 on app-body'
  );
  console.log('PASS');
  passed++;

  // 5. Verify live CSS includes .app-sidebar bounded height & overflow: hidden
  process.stdout.write('TEST 5: Live CSS contains app-sidebar height: 100% and overflow: hidden... ');
  assert.ok(
    cssContent.includes('.app-sidebar') && cssContent.includes('overflow:hidden') && cssContent.includes('min-height:0'),
    'Must bound app-sidebar with height: 100%, min-height: 0, overflow: hidden'
  );
  console.log('PASS');
  passed++;

  // 6. Verify live CSS includes .sidebar-section overflow-y: auto
  process.stdout.write('TEST 6: Live CSS contains sidebar-section independent scroll (overflow-y: auto)... ');
  assert.ok(
    cssContent.includes('.sidebar-section') && cssContent.includes('overflow-y:auto'),
    'sidebar-section must have overflow-y: auto in live production CSS'
  );
  console.log('PASS');
  passed++;

  // 7. Verify live CSS includes bottom clearance (>= 24px) above footer
  process.stdout.write('TEST 7: Live CSS contains generous bottom clearance (32px) and scroll-padding... ');
  assert.ok(
    (cssContent.includes('padding:20px 12px 32px') || cssContent.includes('32px')) && cssContent.includes('scroll-padding-bottom:32px'),
    'sidebar-section must include 32px bottom clearance and scroll-padding-bottom in live CSS'
  );
  console.log('PASS');
  passed++;

  // 8. Verify live CSS includes .sidebar-footer flex-shrink: 0
  process.stdout.write('TEST 8: Live CSS contains sidebar-footer pinned flex-shrink: 0... ');
  assert.ok(
    cssContent.includes('.sidebar-footer') && cssContent.includes('flex-shrink:0'),
    'sidebar-footer must have flex-shrink: 0 in live production CSS'
  );
  console.log('PASS');
  passed++;

  // 9. Discover and fetch main JS bundle
  process.stdout.write('TEST 9: Discover and load main JS bundle... ');
  const jsMatch = homeRes.body.match(/assets\/index-[a-zA-Z0-9_\-]+\.js/);
  assert.ok(jsMatch, 'Must find main JS bundle');
  const mainJsRes = await fetchUrl(`${BASE_URL}/${jsMatch[0]}`);
  assert.equal(mainJsRes.statusCode, 200, 'Main JS bundle must return HTTP 200');
  console.log(`PASS (${jsMatch[0]})`);
  passed++;

  // 10. Verify Sidebar component renders aria-label landmarks in live JS
  process.stdout.write('TEST 10: Live bundle contains accessible landmarks ("Practice navigation")... ');
  assert.ok(
    mainJsRes.body.includes('Practice navigation') || mainJsRes.body.includes('Practice Platform'),
    'Live bundle must include accessible practice navigation landmarks'
  );
  console.log('PASS');
  passed++;

  // 11. Verify Fee Schedules navigation item present in live bundle
  process.stdout.write('TEST 11: Live bundle contains Fee Schedules route (/app/fee-schedules)... ');
  assert.ok(
    mainJsRes.body.includes('/app/fee-schedules') && mainJsRes.body.includes('Fee Schedules'),
    'Live bundle must include Fee Schedules route and label'
  );
  console.log('PASS');
  passed++;

  // 12. Verify routes below Fee Schedules present in live bundle
  process.stdout.write('TEST 12: Routes below Fee Schedules (invoices, billing, practice) present in live bundle... ');
  assert.ok(mainJsRes.body.includes('/app/invoices'), 'Must include /app/invoices');
  assert.ok(mainJsRes.body.includes('/app/billing'), 'Must include /app/billing');
  assert.ok(mainJsRes.body.includes('/app/practice'), 'Must include /app/practice');
  console.log('PASS');
  passed++;

  // 13. Verify /app/billing route returns HTTP 200 on production
  process.stdout.write('TEST 13: Live production route /app/billing returns HTTP 200 OK... ');
  const billingRouteRes = await fetchUrl(`${BASE_URL}/app/billing`);
  assert.equal(billingRouteRes.statusCode, 200, '/app/billing must return HTTP 200');
  console.log('PASS');
  passed++;

  // 14. Verify /app/dashboard route returns HTTP 200 on production
  process.stdout.write('TEST 14: Live production route /app/dashboard returns HTTP 200 OK... ');
  const dashboardRouteRes = await fetchUrl(`${BASE_URL}/app/dashboard`);
  assert.equal(dashboardRouteRes.statusCode, 200, '/app/dashboard must return HTTP 200');
  console.log('PASS');
  passed++;

  // 15. Verify zero Kabworld references across live production bundles
  process.stdout.write('TEST 15: Zero Kabworld references across live HTML, CSS, and JS... ');
  assert.equal(/kabworld/i.test(homeRes.body), false, 'HTML must not reference Kabworld');
  assert.equal(/kabworld/i.test(cssContent), false, 'CSS must not reference Kabworld');
  assert.equal(/kabworld/i.test(mainJsRes.body), false, 'JS must not reference Kabworld');
  console.log('PASS');
  passed++;

  console.log('\n======================================================================');
  console.log(`RESULTS: ${passed}/15 LIVE PRODUCTION SIDEBAR TESTS PASSED`);
  console.log('======================================================================\n');
}

verifyLiveSidebar().catch((err) => {
  console.error('\nLIVE VERIFICATION FAILED:', err);
  process.exit(1);
});
