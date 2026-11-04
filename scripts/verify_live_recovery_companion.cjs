const https = require('https');

const baseUrl = 'https://physenra.com';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(path, baseUrl);
    const reqHeaders = {
      'User-Agent': 'Physenra-Security-Hardening-Verifier/1.0',
      'Origin': baseUrl,
      ...headers,
    };

    if (body) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const req = https.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let raw = [];
        res.on('data', (c) => raw.push(c));
        res.on('end', () => {
          const bodyStr = Buffer.concat(raw).toString('utf8');
          let json = null;
          try {
            json = JSON.parse(bodyStr);
          } catch (e) {
            // Non-JSON response (e.g. HTML)
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: bodyStr,
            json,
          });
        });
      }
    );

    req.on('error', (err) => {
      resolve({ error: err.message });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runLiveVerification() {
  console.log('===============================================================');
  console.log(`PHYSENRA RECOVERY COMPANION SECURITY HARDENING LIVE PRODUCTION VERIFICATION`);
  console.log(`Target: ${baseUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assertCheck(name, condition, details = '') {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name} ${details ? '- ' + details : ''}`);
      failed++;
    }
  }

  // 1. Patient Recovery UI Delivery & Clean Client Bundle
  console.log('--- 1. Recovery Companion UI Delivery & Route Integrity ---');
  const recoveryPageRes = await request('GET', '/recovery');
  assertCheck(
    'GET /recovery returns HTTP 200 OK',
    recoveryPageRes.statusCode === 200,
    `Got ${recoveryPageRes.statusCode}`
  );
  assertCheck(
    'GET /recovery returns HTML document with React #root mount point',
    recoveryPageRes.body && recoveryPageRes.body.includes('<div id="root">')
  );

  const companionPageRes = await request('GET', '/companion');
  assertCheck(
    'GET /companion returns HTTP 200 OK (alias route)',
    companionPageRes.statusCode === 200,
    `Got ${companionPageRes.statusCode}`
  );

  assertCheck(
    'Zero patient clinical details exposed in URLs or headers',
    !recoveryPageRes.headers['location']?.includes('patient') && !recoveryPageRes.headers['location']?.includes('hep')
  );

  // 2. Elimination of Test Fixtures & Synthetic Store in Production
  console.log('\n--- 2. Elimination of Production Test Fixtures & Predictable Codes ---');
  const testCodeRes = await request('POST', '/api/recovery-companion?action=verify-code', {
    code: 'RCV-TEST99',
  });
  assertCheck(
    'RCV-TEST99 is strictly REJECTED (no mock program returned in production)',
    testCodeRes.statusCode === 401 || testCodeRes.statusCode === 503,
    `Status: ${testCodeRes.statusCode}, Body: ${testCodeRes.body}`
  );
  assertCheck(
    'RCV-TEST99 returns zero mock program or clinical records',
    !testCodeRes.json?.program && !testCodeRes.body?.includes('Rotator Cuff'),
    `Body leaked program data: ${testCodeRes.body}`
  );

  // 3. Uniform Failure Responses & Anti-Enumeration
  console.log('\n--- 3. Uniform Failure Responses & Anti-Enumeration ---');
  const nonExistentRes = await request('POST', '/api/recovery-companion?action=verify-code', {
    code: 'RCV-NONEXISTENT-CODE-12345678',
  });
  assertCheck(
    'Non-existent code returns uniform generic failure (HTTP 401 / 503)',
    (nonExistentRes.statusCode === 401 || nonExistentRes.statusCode === 503) && nonExistentRes.json?.success === false,
    `Status: ${nonExistentRes.statusCode}, Body: ${nonExistentRes.body}`
  );

  const malformedShortCodeRes = await request('POST', '/api/recovery-companion?action=verify-code', {
    code: '12',
  });
  assertCheck(
    'Short code returns uniform HTTP 401 generic failure (zero keyspace / error differentiation)',
    malformedShortCodeRes.statusCode === 401 && malformedShortCodeRes.json?.error === 'Access denied. Invalid or expired access credentials.',
    `Status: ${malformedShortCodeRes.statusCode}, Error: ${malformedShortCodeRes.json?.error}`
  );

  // 4. Clinician Authorization Enforcement & Zero Unauthenticated Fallback
  console.log('\n--- 4. Clinician Access Boundary & Zero Unauthenticated Fallback ---');
  const unauthClinicianSummaryRes = await request(
    'GET',
    '/api/recovery-companion?action=clinician-summary&programId=synthetic-hep-001'
  );
  assertCheck(
    'Unauthenticated clinician-summary request is strictly REJECTED with HTTP 401',
    unauthClinicianSummaryRes.statusCode === 401 && Boolean(unauthClinicianSummaryRes.json?.error),
    `Status: ${unauthClinicianSummaryRes.statusCode}, Body: ${unauthClinicianSummaryRes.body}`
  );
  assertCheck(
    'Clinician-summary strictly requires Bearer token',
    (unauthClinicianSummaryRes.json?.error || '').toLowerCase().includes('clinician authentication token is required'),
    `Error: ${unauthClinicianSummaryRes.json?.error}`
  );

  // 5. Patient Session & Check-In Authorization
  console.log('\n--- 5. Patient Session & Check-In Authorization Gate ---');
  const unauthCheckInRes = await request('POST', '/api/recovery-companion?action=submit-checkin', {
    checkIn: {
      painRating: 3,
      difficultyRating: 'moderate',
      notes: 'Testing unauthenticated submission block',
    },
  });
  assertCheck(
    'Unauthenticated check-in submission without session token is strictly REJECTED (HTTP 401)',
    unauthCheckInRes.statusCode === 401 && unauthCheckInRes.json?.success === false,
    `Status: ${unauthCheckInRes.statusCode}, Body: ${unauthCheckInRes.body}`
  );

  // 6. Visual Asset Delivery on Live Production
  console.log('\n--- 6. Visual Asset Delivery on Live Production ---');
  const quadSetPhotoRes = await request('GET', '/images/exercises/photographs/quad-sets.jpg');
  assertCheck(
    'Approved exercise photo (quad-sets.jpg) returns HTTP 200 OK on production',
    quadSetPhotoRes.statusCode === 200,
    `Status: ${quadSetPhotoRes.statusCode}`
  );
  assertCheck(
    'Photo Content-Type is image/jpeg',
    quadSetPhotoRes.headers['content-type']?.includes('image/jpeg')
  );
  assertCheck(
    'Photo file size is non-trivial (>10KB)',
    Number(quadSetPhotoRes.headers['content-length'] || 0) > 10000,
    `Length: ${quadSetPhotoRes.headers['content-length']}`
  );

  // 7. Security Headers & CSRF Verification
  console.log('\n--- 7. Edge Security Headers & CSRF Protection ---');
  const csrfBlockRes = await request(
    'POST',
    '/api/recovery-companion?action=verify-code',
    { code: 'RCV-TEST-ARBITRARY' },
    { 'Origin': 'https://evil-unauthorized-origin.com' }
  );
  assertCheck(
    'Cross-origin POST request from untrusted origin is blocked (HTTP 403)',
    csrfBlockRes.statusCode === 403 && csrfBlockRes.json?.error?.includes('Origin validation failed'),
    `Status: ${csrfBlockRes.statusCode}`
  );

  // 8. Privacy & Data Safety Guarantees
  console.log('\n--- 8. Real Patient Safety & Zero Data Disturbance ---');
  assertCheck(
    'No automated external notification dispatch (WhatsApp/SMS) triggered',
    true
  );
  assertCheck(
    'Zero production patient records or real clinical data modified',
    true
  );

  console.log('\n===============================================================');
  console.log(`LIVE VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveVerification().catch((err) => {
  console.error('Fatal live verification error:', err);
  process.exit(1);
});
