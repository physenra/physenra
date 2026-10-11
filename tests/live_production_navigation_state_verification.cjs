// ==============================================================================
// PHYSENRA — LIVE PRODUCTION NAVIGATION & DRAFT STATE VERIFICATION
// Script: tests/live_production_navigation_state_verification.cjs
// ==============================================================================

const https = require('https');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2) {
    env[parts[0]] = parts.slice(1).join('=');
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runLiveProbes() {
  console.log('Starting Physenra Live Production Navigation & Page State Verification...\n');
  const results = [];

  // Probe 1: Production Home
  try {
    const home = await fetchUrl('https://physenra.com/');
    console.log(`[PROBE 1] Production Homepage: Status ${home.statusCode}`);
    if (home.statusCode === 200 && home.body.includes('Physenra')) {
      results.push({ name: 'Production Homepage HTTP 200', pass: true });
    } else {
      results.push({ name: 'Production Homepage HTTP 200', pass: false, detail: `Status: ${home.statusCode}` });
    }

    // Extract main JS bundle URL from homepage
    const bundleMatch = home.body.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (bundleMatch) {
      const bundlePath = bundleMatch[1];
      const indexBundle = await fetchUrl(`https://physenra.com${bundlePath}`);
      console.log(`[PROBE 2a] Production index Bundle (${bundlePath}): Status ${indexBundle.statusCode}, Length ${indexBundle.body.length}`);
      
      const hasListFilterPrefix = indexBundle.body.includes('physenra:list_filters:v1:');
      console.log(`  - Has List Filter Prefix ('physenra:list_filters:v1:'): ${hasListFilterPrefix}`);

      // Now fetch domain chunk with draft service (domain-platform-billing chunk)
      const domainChunkName = 'domain-platform-billing-DPcOskYe.js';
      const domainChunk = await fetchUrl(`https://physenra.com/assets/${domainChunkName}`);
      console.log(`[PROBE 2b] Production domain chunk (/assets/${domainChunkName}): Status ${domainChunk.statusCode}, Length ${domainChunk.body.length}`);

      const hasDraftPrefix = domainChunk.body.includes('physenra:draft:v1:');
      const hasDraftBanner = domainChunk.body.includes('Unsaved') && domainChunk.body.includes('draft restored');
      const hasDiscardDraft = domainChunk.body.includes('Discard Draft');

      console.log(`  - Has Draft Prefix ('physenra:draft:v1:'): ${hasDraftPrefix}`);
      console.log(`  - Has Draft Restoration Banner text: ${hasDraftBanner}`);
      console.log(`  - Has Discard Action: ${hasDiscardDraft}`);

      results.push({
        name: 'Production Chunks Contain formDraftService, DraftBanner & useListFilters',
        pass: hasListFilterPrefix && hasDraftPrefix && hasDraftBanner && hasDiscardDraft,
      });
    } else {
      results.push({ name: 'Discover Production Bundle', pass: false, detail: 'Bundle path not found in HTML' });
    }
  } catch (err) {
    console.error('Probe 1/2 error:', err);
    results.push({ name: 'Production Homepage & Bundle Probe', pass: false, detail: err.message });
  }

  // Probe 3: Paystack Functions Integrity
  try {
    const initRes = await fetchUrl('https://physenra.com/.netlify/functions/initialize-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    console.log(`[PROBE 3] Paystack initialize-payment: Status ${initRes.statusCode}`);
    const pass = initRes.statusCode === 400 || initRes.statusCode === 401;
    results.push({
      name: 'Paystack initialize-payment Endpoint Active',
      pass,
      detail: `Returned expected guard status ${initRes.statusCode}`,
    });
  } catch (err) {
    results.push({ name: 'Paystack initialize-payment Endpoint Active', pass: false, detail: err.message });
  }

  // Probe 4: Paystack Webhook Integrity
  try {
    const webhookRes = await fetchUrl('https://physenra.com/.netlify/functions/paystack-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'charge.success' }),
    });
    console.log(`[PROBE 4] Paystack webhook endpoint: Status ${webhookRes.statusCode}`);
    const pass = webhookRes.statusCode === 400 || webhookRes.statusCode === 401;
    results.push({
      name: 'Paystack Webhook HMAC Rejection Active',
      pass,
      detail: `Returned expected status ${webhookRes.statusCode}`,
    });
  } catch (err) {
    results.push({ name: 'Paystack Webhook Endpoint Active', pass: false, detail: err.message });
  }

  // Probe 5: Supabase API Health & Bank Transfer RPC Schema Cache
  try {
    const rpcRes = await fetchUrl(`${SUPABASE_URL}/rest/v1/rpc/get_active_bank_transfer_config`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    console.log(`[PROBE 5] Supabase get_active_bank_transfer_config: Status ${rpcRes.statusCode}`);
    // PGRST202 means missing function. Code 42501 means PostgreSQL resolved the function and enforced authenticated RBAC.
    const isPgrstMissing = rpcRes.body.includes('PGRST202');
    const pass = (rpcRes.statusCode === 200 || rpcRes.statusCode === 401 || rpcRes.statusCode === 403) && !isPgrstMissing;
    results.push({
      name: 'Supabase Bank Transfer RPC Schema Cache Operational',
      pass,
      detail: `Status ${rpcRes.statusCode}, PGRST202 missing: ${!isPgrstMissing}`,
    });
  } catch (err) {
    results.push({ name: 'Supabase Bank Transfer RPC Schema Cache Operational', pass: false, detail: err.message });
  }

  // Probe 6: Supabase submit_bank_transfer_reference Schema Cache Check
  try {
    const submitRes = await fetchUrl(`${SUPABASE_URL}/rest/v1/rpc/submit_bank_transfer_reference`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_customer_reference: 'PROBE-REF-001',
      }),
    });
    console.log(`[PROBE 6] Supabase submit_bank_transfer_reference: Status ${submitRes.statusCode}`);
    const isPgrstMissing = submitRes.body.includes('PGRST202');
    results.push({
      name: 'Supabase submit_bank_transfer_reference Found in Schema Cache',
      pass: !isPgrstMissing,
      detail: `Status ${submitRes.statusCode}, PGRST202 missing: ${!isPgrstMissing}`,
    });
  } catch (err) {
    results.push({ name: 'Supabase submit_bank_transfer_reference Check', pass: false, detail: err.message });
  }

  console.log('\n--- VERIFICATION SUMMARY ---');
  let allPass = true;
  for (const r of results) {
    const mark = r.pass ? 'PASS' : 'FAIL';
    if (!r.pass) allPass = false;
    console.log(`[${mark}] ${r.name}${r.detail ? ` (${r.detail})` : ''}`);
  }

  if (allPass) {
    console.log('\nALL 6 LIVE PRODUCTION PROBES PASSED SUCCESSFULLY!');
  } else {
    console.log('\nSOME PROBES FAILED.');
    process.exit(1);
  }
}

runLiveProbes();
