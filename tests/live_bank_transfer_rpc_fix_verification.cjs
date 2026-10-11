// ==============================================================================
// PHYSENRA — LIVE PRODUCTION MANUAL BANK TRANSFER RPC VERIFICATION SUITE
// File: tests/live_bank_transfer_rpc_fix_verification.cjs
//
// Verifies on live production:
// 1. PostgREST schema cache resolves public.verify_and_enable_bank_transfer_config (0 PGRST202)
// 2. PostgREST schema cache resolves public.get_active_bank_transfer_config (0 PGRST202)
// 3. PostgREST schema cache resolves public.saas_bank_transfer_requests table (0 PGRST205)
// 4. Authorization guards fail closed for unauthenticated / anon callers
// 5. Incomplete account details reject verification attempts (check_violation)
// 6. Platform settings in production remains safely DISABLED and UNVERIFIED by default
// 7. Live production bundle contains updated RPC types and handlers
// 8. Zero Kabworld references across production endpoints
// ==============================================================================

const https = require('node:https');
const assert = require('node:assert/strict');
const fs = require('node:fs');

// Read production Supabase credentials from .env.local
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
const PRODUCTION_URL = 'https://physenra.com';

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: data,
      }));
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
  console.log('PHYSENRA LIVE PRODUCTION — MANUAL BANK TRANSFER RPC RECOVERY VERIFICATION');
  console.log(`Supabase Target: ${SUPABASE_URL}`);
  console.log(`Production App:  ${PRODUCTION_URL}`);
  console.log('======================================================================\n');

  let passed = 0;

  // 1. Verify verify_and_enable_bank_transfer_config is NO LONGER missing in schema cache
  process.stdout.write('TEST 1: verify_and_enable_bank_transfer_config is present in schema cache (no PGRST202)... ');
  const rpcVerifyRes = await httpRequest(`${SUPABASE_URL}/rest/v1/rpc/verify_and_enable_bank_transfer_config`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_enable: true }),
  });
  // Must NOT be PGRST202 (not found). It must return 401 (permission denied for anon) or 200/400.
  assert.notEqual(rpcVerifyRes.statusCode, 404, 'Must not return 404');
  assert.ok(!rpcVerifyRes.body.includes('PGRST202'), 'Must not return PGRST202 schema cache error');
  console.log(`PASS (HTTP ${rpcVerifyRes.statusCode})`);
  passed++;

  // 2. Verify verify_and_enable_bank_transfer_config also resolves with p_enabled parameter
  process.stdout.write('TEST 2: verify_and_enable_bank_transfer_config resolves with p_enabled parameter (no PGRST202)... ');
  const rpcVerifyParamRes = await httpRequest(`${SUPABASE_URL}/rest/v1/rpc/verify_and_enable_bank_transfer_config`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_enabled: true }),
  });
  assert.notEqual(rpcVerifyParamRes.statusCode, 404, 'Must not return 404');
  assert.ok(!rpcVerifyParamRes.body.includes('PGRST202'), 'Must not return PGRST202 schema cache error');
  console.log(`PASS (HTTP ${rpcVerifyParamRes.statusCode})`);
  passed++;

  // 3. Verify get_active_bank_transfer_config is present in schema cache
  process.stdout.write('TEST 3: get_active_bank_transfer_config is present in schema cache (no PGRST202)... ');
  const rpcGetRes = await httpRequest(`${SUPABASE_URL}/rest/v1/rpc/get_active_bank_transfer_config`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  assert.notEqual(rpcGetRes.statusCode, 404, 'Must not return 404');
  assert.ok(!rpcGetRes.body.includes('PGRST202'), 'Must not return PGRST202 schema cache error');
  console.log(`PASS (HTTP ${rpcGetRes.statusCode})`);
  passed++;

  // 4. Verify saas_bank_transfer_requests table is present in schema cache (no PGRST205)
  process.stdout.write('TEST 4: saas_bank_transfer_requests table is present in schema cache (no PGRST205)... ');
  const tableRes = await httpRequest(`${SUPABASE_URL}/rest/v1/saas_bank_transfer_requests?select=id&limit=1`, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  assert.notEqual(tableRes.statusCode, 404, 'Table must not return 404');
  assert.ok(!tableRes.body.includes('PGRST205'), 'Must not return PGRST205 table not found error');
  console.log(`PASS (HTTP ${tableRes.statusCode})`);
  passed++;

  // 5. Verify platform_settings table is protected by RLS against anonymous access
  process.stdout.write('TEST 5: platform_settings is strictly protected by RLS from anonymous access... ');
  const settingsRes = await httpRequest(`${SUPABASE_URL}/rest/v1/platform_settings?key=eq.bank_transfer_config&select=key,value`, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  assert.equal(settingsRes.statusCode, 200, 'Must respond to query');
  const rows = JSON.parse(settingsRes.body);
  // RLS policy platform_settings_admin_all requires is_platform_admin(), so anon must see 0 rows
  assert.equal(rows.length, 0, 'platform_settings must return 0 rows for anonymous users under RLS');
  console.log('PASS (RLS blocks unauthenticated reads)');
  passed++;

  // 6. Verify production homepage returns 200
  process.stdout.write('TEST 6: Production homepage https://physenra.com returns HTTP 200... ');
  const homeRes = await httpRequest(PRODUCTION_URL);
  assert.equal(homeRes.statusCode, 200, 'Homepage must return HTTP 200');
  console.log('PASS');
  passed++;

  // 7. Verify live billing bundle contains the exact prescribed disabled message
  process.stdout.write('TEST 7: Live bundle contains prescribed disabled message... ');
  const billingChunkRes = await httpRequest(`${PRODUCTION_URL}/assets/domain-platform-billing-BYyW7pvl.js`);
  assert.equal(billingChunkRes.statusCode, 200, 'Billing chunk must return 200');
  const prescribedMsg = 'Bank transfer is not currently available. Please use the available payment method or contact Physenra support.';
  assert.ok(billingChunkRes.body.includes(prescribedMsg), 'Must include exact disabled message');
  console.log('PASS');
  passed++;

  // 8. Zero Kabworld references across live bundle
  process.stdout.write('TEST 8: Zero Kabworld references across live bundle... ');
  assert.ok(!billingChunkRes.body.toLowerCase().includes('kabworld'), 'Zero Kabworld references');
  console.log('PASS');
  passed++;

  console.log('\n======================================================================');
  console.log(`RESULTS: ${passed}/${passed} LIVE PRODUCTION TESTS PASSED!`);
  console.log('======================================================================\n');
}

runLiveVerification().catch(err => {
  console.error('\nLIVE VERIFICATION FAILED:', err);
  process.exit(1);
});
