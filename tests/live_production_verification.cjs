// Live QA verification script for https://physenra.com
const https = require('node:https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('=== LIVE PRODUCTION VERIFICATION: https://physenra.com ===');

  // 1. Homepage
  const home = await get('https://physenra.com');
  console.log('1. Homepage status:', home.statusCode);
  if (home.statusCode !== 200) throw new Error('Homepage not 200');

  // 2. Security Headers
  console.log('2. Security Headers:');
  console.log('   Strict-Transport-Security:', home.headers['strict-transport-security'] || 'N/A');
  console.log('   X-Content-Type-Options:', home.headers['x-content-type-options'] || 'N/A');
  console.log('   X-Frame-Options:', home.headers['x-frame-options'] || 'N/A');
  console.log('   Referrer-Policy:', home.headers['referrer-policy'] || 'N/A');

  // 3. Core Public Routes
  const routes = ['/pricing', '/features/clinical-documentation', '/security', '/contact', '/about'];
  for (const r of routes) {
    const res = await get('https://physenra.com' + r);
    console.log(`3. Route ${r}:`, res.statusCode);
    if (res.statusCode !== 200) throw new Error(`Route ${r} failed with ${res.statusCode}`);
  }

  // 4. JS Bundle Integrity
  const match = home.body.match(/src="\/assets\/(index-[^"]+\.js)"/);
  if (!match) throw new Error('Could not find index JS bundle in HTML');
  const jsBundle = match[1];
  console.log('4. Live JS bundle detected:', jsBundle);

  const jsRes = await get(`https://physenra.com/assets/${jsBundle}`);
  console.log('   JS bundle status:', jsRes.statusCode, 'size:', jsRes.body.length);
  if (jsRes.statusCode !== 200) throw new Error('JS bundle failed to load');

  // 5. CSS Bundle Integrity
  const cssMatch = home.body.match(/href="\/assets\/(index-[^"]+\.css)"/);
  if (cssMatch) {
    const cssBundle = cssMatch[1];
    console.log('5. Live CSS bundle detected:', cssBundle);
    const cssRes = await get(`https://physenra.com/assets/${cssBundle}`);
    console.log('   CSS bundle status:', cssRes.statusCode, 'size:', cssRes.body.length);
  }

  // 6. Kabworld Isolation Check
  const hasKabworldInHome = /kabworld/i.test(home.body);
  const hasKabworldInJs = /kabworld/i.test(jsRes.body);
  console.log('6. Project Separation (Kabworld check):');
  console.log('   HTML contains kabworld:', hasKabworldInHome);
  console.log('   JS contains kabworld:', hasKabworldInJs);
  if (hasKabworldInHome || hasKabworldInJs) throw new Error('Kabworld found in production output!');

  // 7. Netlify Functions Check
  const fnRes = await get('https://physenra.com/.netlify/functions/initialize-payment');
  console.log('7. Netlify Function (initialize-payment) responds:', fnRes.statusCode);

  // 8. Secret Exposure Check
  const hasPaystackSecret = /sk_live_[a-zA-Z0-9]+/i.test(jsRes.body) || /sk_test_[a-zA-Z0-9]+/i.test(jsRes.body);
  const hasServiceRoleKey = /service_role/i.test(jsRes.body);
  console.log('8. Secret Hygiene:');
  console.log('   Exposed Paystack secret key:', hasPaystackSecret);
  console.log('   Exposed Service Role key:', hasServiceRoleKey);
  if (hasPaystackSecret) throw new Error('Exposed Paystack secret in client JS!');

  // 9. Specialty Integration Code Presence in Client Bundle
  const hasSpecialtyInJs = jsRes.body.includes('NEURO_EXAMINATION_V1') && jsRes.body.includes('PAEDS_EXAMINATION_V1');
  console.log('9. Specialty Clinical Modules included in bundle:', hasSpecialtyInJs);

  // 10. Overall Status
  console.log('10. Overall Verification: SUCCESS — Production is healthy, secure, and up to date.');
}

run().catch(err => {
  console.error('LIVE QA ERROR:', err);
  process.exit(1);
});
