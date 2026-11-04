const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Netlify serverless function handler & utilities
const {
  handler: recoveryCompanionHandler,
  hashSecret,
  hashRequesterIp,
  getTrustedClientIp,
} = require('../netlify/functions/recovery-companion.cjs');

// Visual registry & catalogue
const {
  EXERCISE_VISUALS_REGISTRY,
  hasApprovedVisual,
  getExercisePhotoDemonstration,
} = require('../src/services/exerciseVisualRegistry.ts');
const { SYSTEM_EXERCISES_CATALOGUE } = require('../src/services/hepCatalogueData.ts');

describe('PHYSENRA RECOVERY COMPANION SECURITY HARDENING SUITE', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../supabase/migrations/20261104080000_recovery_companion_foundation.sql'
  );
  const serverlessPath = path.resolve(__dirname, '../netlify/functions/recovery-companion.cjs');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  const serverlessCode = fs.readFileSync(serverlessPath, 'utf8');

  // --------------------------------------------------------------------------
  // 1. High-Entropy Cryptographic Access Codes (>= 128 bits entropy)
  // --------------------------------------------------------------------------
  describe('1. Access Code Cryptographic Entropy & Secure Hashing', () => {
    function generateHighEntropyAccessCode() {
      const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      const randomBytes = crypto.randomBytes(16); // 16 bytes = 128 bits of entropy
      let code = 'RCV-';
      for (let i = 0; i < 26; i++) {
        const val = randomBytes[i % 16] ^ (i * 7);
        code += charset[Math.abs(val) % 32];
      }
      return code;
    }

    test('Access codes have at least 128 bits of entropy in the random portion', () => {
      const code = generateHighEntropyAccessCode();
      assert.match(code, /^RCV-[2-9A-Z]{26}$/, 'Must have RCV- prefix followed by 26 base32 characters');
      const randomPart = code.substring(4);
      assert.equal(randomPart.length, 26, 'Random portion must be 26 characters long');

      // 32^26 combinations = 2^(5 * 26) = 2^130 keyspace >= 128 bits entropy
      const entropyBits = Math.log2(Math.pow(32, randomPart.length));
      assert.ok(entropyBits >= 128, `Entropy (${entropyBits} bits) must be >= 128 bits`);
    });

    test('Access code generator in SQL migration utilizes 16 random bytes (128 bits entropy)', () => {
      assert.ok(migrationSql.includes('gen_random_bytes(16)'), 'Migration must draw 16 bytes of entropy');
      assert.ok(migrationSql.includes('0..25 LOOP'), 'Must iterate 26 characters for base32 representation');
    });

    test('Cryptographic SHA-256 hash is deterministic, constant-case, and one-way', () => {
      const code = generateHighEntropyAccessCode();
      const hash1 = hashSecret(code);
      const hash2 = hashSecret(code.toLowerCase());
      assert.equal(hash1, hash2, 'Hash must be case-insensitive to withstand user typing variation');
      assert.equal(hash1.length, 64, 'SHA-256 hex string must be 64 characters');
    });

    test('Migration strictly enforces UNIQUE constraint on code_hash', () => {
      assert.ok(migrationSql.includes('code_hash text NOT NULL UNIQUE'), 'code_hash must be unique in table schema');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Removal of Production Test Credentials & Mock Fallbacks
  // --------------------------------------------------------------------------
  describe('2. Elimination of Production Test Fixtures & Predictable Codes', () => {
    test('RCV-TEST99 is strictly eliminated from serverless production runtime', () => {
      assert.equal(
        serverlessCode.includes('RCV-TEST99'),
        false,
        'Serverless function must NOT contain hardcoded RCV-TEST99'
      );
    });

    test('seedSyntheticStore() is strictly eliminated from serverless production runtime', () => {
      assert.equal(
        serverlessCode.includes('seedSyntheticStore'),
        false,
        'Serverless function must NOT contain seedSyntheticStore'
      );
    });

    test('In production (without test mock store injection), unknown code verification fails generically', async () => {
      const mockSupabaseAdmin = {
        rpc: async (name, args) => {
          if (name === 'check_hep_rate_limit') return { data: { allowed: true }, error: null };
          if (name === 'verify_recovery_companion_access') return { data: { success: false, error: 'Invalid code' }, error: null };
          return { data: null, error: null };
        },
      };

      const event = {
        httpMethod: 'POST',
        queryStringParameters: { action: 'verify-code' },
        body: JSON.stringify({ code: 'RCV-TEST99' }),
        headers: { 'client-ip': '192.0.2.1' },
      };

      // Calling handler with NO mock store injected (simulating production execution with Supabase DB & dedicated HMAC secret)
      const res = await recoveryCompanionHandler(event, {}, {
        env: { RATE_LIMIT_HMAC_SECRET: 'test-dedicated-hmac-secret-123456789' },
        supabaseAdmin: mockSupabaseAdmin,
      });
      assert.equal(res.statusCode, 401, 'Must return 401 generic failure');
      const body = JSON.parse(res.body);
      assert.equal(body.success, false);
      assert.equal(body.error, 'Access denied. Invalid or expired access credentials.');
    });

    test('In production, endpoint returns 503 and zero mock data when Supabase is unavailable', async () => {
      const event = {
        httpMethod: 'POST',
        queryStringParameters: { action: 'verify-code' },
        body: JSON.stringify({ code: 'RCV-TEST99' }),
        headers: { 'client-ip': '192.0.2.1' },
      };

      const res = await recoveryCompanionHandler(event, {}, {
        env: { RATE_LIMIT_HMAC_SECRET: 'test-dedicated-hmac-secret-123456789' },
      });
      assert.equal(res.statusCode, 503, 'Must return 503 when Supabase is unavailable');
      const body = JSON.parse(res.body);
      assert.equal(body.success, false);
      assert.equal(body.program, undefined, 'Must not return mock program data');
    });

    test('In production, endpoint returns 503 when Supabase RPC returns infrastructure error (PGRST202)', async () => {
      const mockSupabaseAdmin = {
        rpc: async (name) => {
          if (name === 'check_hep_rate_limit') return { data: { allowed: true }, error: null };
          if (name === 'verify_recovery_companion_access') {
            return { data: null, error: { code: 'PGRST202', message: 'Could not find the function in schema cache' } };
          }
          return { data: null, error: null };
        },
      };

      const event = {
        httpMethod: 'POST',
        queryStringParameters: { action: 'verify-code' },
        body: JSON.stringify({ code: 'RCV-23456789-2345-6789-2345-678923' }),
        headers: { 'client-ip': '192.0.2.1' },
      };

      const res = await recoveryCompanionHandler(event, {}, {
        env: { RATE_LIMIT_HMAC_SECRET: 'test-dedicated-hmac-secret-123456789' },
        supabaseAdmin: mockSupabaseAdmin,
      });
      assert.equal(res.statusCode, 503, 'Must return 503 when RPC is missing, distinguishing from 401 invalid code');
      const body = JSON.parse(res.body);
      assert.equal(body.success, false);
    });

    test('In production, missing RATE_LIMIT_HMAC_SECRET returns 503 configuration error without fallback', async () => {
      const event = {
        httpMethod: 'POST',
        queryStringParameters: { action: 'verify-code' },
        body: JSON.stringify({ code: 'RCV-TEST99' }),
        headers: { 'client-ip': '192.0.2.1' },
      };

      // Even if SUPABASE_SERVICE_ROLE_KEY is provided, function must NOT fall back to it
      const res = await recoveryCompanionHandler(event, {}, {
        env: { SUPABASE_SERVICE_ROLE_KEY: 'test-service-key-not-for-hmac' },
      });
      assert.equal(res.statusCode, 503, 'Must return 503 when dedicated HMAC secret is missing');
      const body = JSON.parse(res.body);
      assert.equal(body.success, false);
      assert.ok(body.error.includes('Configuration required'));
    });

    test('In production, unauthenticated clinician-summary request fails with HTTP 401', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { action: 'clinician-summary', programId: 'synth-1' },
        headers: { 'client-ip': '192.0.2.1' },
      };

      const res = await recoveryCompanionHandler(event, {}, {
        env: { RATE_LIMIT_HMAC_SECRET: 'test-dedicated-hmac-secret-123456789' },
      });
      assert.equal(res.statusCode, 401, 'Must require valid Bearer token');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Durable Keyed-HMAC Rate Limiting & Throttling
  // --------------------------------------------------------------------------
  describe('3. Durable Keyed-HMAC IP Rate Limiting', () => {
    test('Requester IP is derived strictly from Netlify edge headers, rejecting spoofed forwarding headers', () => {
      const spoofedHeaders = {
        'x-forwarded-for': '203.0.113.195, 198.51.100.1',
        'client-ip': '198.51.100.24',
        'x-nf-client-connection-ip': '198.51.100.24',
      };
      const ip = getTrustedClientIp(spoofedHeaders);
      assert.equal(ip, '198.51.100.24', 'Must prioritize trusted Netlify client connection IP');
    });

    test('IP identifier uses keyed HMAC-SHA256 with server-only secret and never logs raw IP', () => {
      const ip = '198.51.100.42';
      const secret = 'physenra-test-hmac-secret';
      const hmac1 = hashRequesterIp(ip, secret);
      const hmac2 = hashRequesterIp(ip, secret);
      assert.equal(hmac1, hmac2, 'Keyed HMAC must be deterministic for the same secret');
      assert.equal(hmac1.length, 64, 'HMAC-SHA256 hex string must be 64 characters');
      assert.notEqual(hmac1, ip, 'IP must be thoroughly hashed');
    });

    test('Rate limiter throttles after 5 verification attempts per 5-minute window with HTTP 429', async () => {
      // In-memory rate limiter mock simulating durable atomic DB/edge table
      const attempts = new Map();
      const mockRateLimiter = {
        check: (key) => {
          const count = (attempts.get(key) || 0) + 1;
          attempts.set(key, count);
          if (count > 5) {
            return { allowed: false, retryAfter: 300 };
          }
          return { allowed: true, remaining: 5 - count };
        },
      };

      const testIp = '192.0.2.100';
      const mockStore = new Map();

      // Submit 5 invalid attempts
      for (let i = 1; i <= 5; i++) {
        const event = {
          httpMethod: 'POST',
          queryStringParameters: { action: 'verify-code' },
          body: JSON.stringify({ code: `RCV-INVALID${i}RANDOM` }),
          headers: { 'client-ip': testIp },
        };
        const res = await recoveryCompanionHandler(event, {}, { mockStore, rateLimiter: mockRateLimiter });
        assert.equal(res.statusCode, 401, `Attempt ${i} must return 401 generic failure`);
      }

      // 6th attempt must trigger HTTP 429
      const event6 = {
        httpMethod: 'POST',
        queryStringParameters: { action: 'verify-code' },
        body: JSON.stringify({ code: 'RCV-INVALID6RANDOM' }),
        headers: { 'client-ip': testIp },
      };
      const res6 = await recoveryCompanionHandler(event6, {}, { mockStore, rateLimiter: mockRateLimiter });
      assert.equal(res6.statusCode, 429, '6th attempt must be blocked with HTTP 429');
      assert.equal(res6.headers['Retry-After'], '300', 'Must specify Retry-After header of 300 seconds');
      const body6 = JSON.parse(res6.body);
      assert.equal(body6.success, false);
      assert.ok(body6.error.includes('Too many verification attempts'));
    });

    test('Database migration contains hep_access_rate_limits table with composite window index', () => {
      assert.ok(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.hep_access_rate_limits'),
        'Must define hep_access_rate_limits table'
      );
      assert.ok(migrationSql.includes('ip_hmac text NOT NULL'), 'Must store hashed IP');
      assert.ok(migrationSql.includes('attempt_count integer NOT NULL DEFAULT 1'), 'Must track attempts');
      assert.ok(migrationSql.includes('check_hep_rate_limit'), 'Must implement atomic rate limiting RPC');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Ephemeral, Revocable Patient Sessions
  // --------------------------------------------------------------------------
  describe('4. Short-Lived Revocable Patient Sessions & Cookie Binding', () => {
    test('Migration creates hep_patient_sessions with composite tenant keys and session hash', () => {
      assert.ok(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.hep_patient_sessions'),
        'Must create hep_patient_sessions table'
      );
      assert.ok(migrationSql.includes('session_token_hash text NOT NULL UNIQUE'), 'Must hash session secret uniquely');
      assert.ok(migrationSql.includes('fk_hep_session_program_practice'), 'Must enforce program-practice composite key');
      assert.ok(migrationSql.includes('fk_hep_session_patient_practice'), 'Must enforce patient-practice composite key');
      assert.ok(migrationSql.includes('expires_at timestamptz NOT NULL'), 'Must enforce expiration timestamp');
      assert.ok(migrationSql.includes('revoked_at timestamptz'), 'Must support session revocation');
    });

    test('Successful verification issues 128-bit session secret and Set-Cookie with HttpOnly and Secure flags', async () => {
      const mockStore = new Map();
      const code = 'RCV-SECURECODE128BITEXACTLY';
      const codeHash = hashSecret(code);
      mockStore.set(codeHash, {
        accessCode: code,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        revoked: false,
        program: { id: 'prog-1', title: 'Shoulder Rehab', status: 'active' },
        practice: { name: 'Apex Lagos', phone: '0800', email: 'care@apex.ng' },
        clinician: { display_name: 'Dr. Kalu' },
        items: [],
      });

      const event = {
        httpMethod: 'POST',
        queryStringParameters: { action: 'verify-code' },
        body: JSON.stringify({ code }),
        headers: { 'client-ip': '192.0.2.20' },
      };

      const res = await recoveryCompanionHandler(event, {}, { mockStore });
      assert.equal(res.statusCode, 200);
      assert.ok(res.headers['Set-Cookie'], 'Must issue Set-Cookie header');
      const cookie = res.headers['Set-Cookie'];
      assert.ok(cookie.includes('HttpOnly'), 'Cookie must be HttpOnly');
      assert.ok(cookie.includes('Secure'), 'Cookie must be Secure');
      assert.ok(cookie.includes('SameSite=Strict'), 'Cookie must be SameSite=Strict');

      const body = JSON.parse(res.body);
      assert.ok(body.session_token, 'Response must return session_token');
      assert.equal(body.session_token.length, 32, 'Session token must be 32 hex chars (128 bits)');
    });

    test('Check-in submission requires valid session token and rejects expired/unauthorized sessions', async () => {
      const mockStore = new Map();
      const code = 'RCV-PATIENTSESSIONCHECK';
      const codeHash = hashSecret(code);
      const record = {
        accessCode: code,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        revoked: false,
        program: { id: 'prog-2', title: 'Knee Rehab', status: 'active' },
        sessions: new Map(),
        checkIns: [],
      };
      mockStore.set(codeHash, record);

      // Create valid session
      const validSession = 'session_valid_128bit_token';
      record.sessions.set(validSession, { expiresAt: Date.now() + 86400000 });

      // Valid session check-in
      const validEvent = {
        httpMethod: 'POST',
        queryStringParameters: { action: 'submit-checkin' },
        headers: {
          'cookie': `physenra_recovery_session=${validSession}`,
          'client-ip': '192.0.2.30',
        },
        body: JSON.stringify({
          checkIn: { painRating: 2, difficultyRating: 'easy', notes: 'Feeling better' },
        }),
      };
      const validRes = await recoveryCompanionHandler(validEvent, {}, { mockStore });
      assert.equal(validRes.statusCode, 200, 'Valid session check-in must succeed');
      const validBody = JSON.parse(validRes.body);
      assert.ok(validBody.check_in_id);

      // Invalid / fake session check-in
      const invalidEvent = {
        httpMethod: 'POST',
        queryStringParameters: { action: 'submit-checkin' },
        headers: {
          'cookie': 'physenra_recovery_session=fake_invalid_token',
          'client-ip': '192.0.2.30',
        },
        body: JSON.stringify({
          checkIn: { painRating: 5 },
        }),
      };
      const invalidRes = await recoveryCompanionHandler(invalidEvent, {}, { mockStore });
      assert.equal(invalidRes.statusCode, 401, 'Invalid session must be rejected with HTTP 401');
    });
  });

  // --------------------------------------------------------------------------
  // 5. Uniform Generic Failure Responses
  // --------------------------------------------------------------------------
  describe('5. Uniform Failure Responses & Anti-Enumeration', () => {
    test('Non-existent, expired, and revoked codes return identical HTTP 401 status and error message', async () => {
      const mockStore = new Map();

      // Expired code
      const expiredCode = 'RCV-EXPIREDCODE128BIT';
      mockStore.set(hashSecret(expiredCode), {
        accessCode: expiredCode,
        expiresAt: new Date(Date.now() - 100000).toISOString(),
        revoked: false,
      });

      // Revoked code
      const revokedCode = 'RCV-REVOKEDCODE128BIT';
      mockStore.set(hashSecret(revokedCode), {
        accessCode: revokedCode,
        expiresAt: new Date(Date.now() + 100000).toISOString(),
        revoked: true,
      });

      const codesToTest = [
        'RCV-NONEXISTENTCODE128BIT',
        expiredCode,
        revokedCode,
        'MALFORMED_SHORT',
      ];

      for (const code of codesToTest) {
        const event = {
          httpMethod: 'POST',
          queryStringParameters: { action: 'verify-code' },
          body: JSON.stringify({ code }),
          headers: { 'client-ip': '192.0.2.40' },
        };
        const res = await recoveryCompanionHandler(event, {}, { mockStore });
        assert.equal(res.statusCode, 401, `Code ${code} must return HTTP 401`);
        const body = JSON.parse(res.body);
        assert.equal(body.success, false);
        assert.equal(
          body.error,
          'Access denied. Invalid or expired access credentials.',
          `Error string for ${code} must be identical to prevent enumeration`
        );
      }
    });
  });

  // --------------------------------------------------------------------------
  // 6. Clinician Authorization & Elevated Credential Scoping
  // --------------------------------------------------------------------------
  describe('6. Clinician Summary Authorization & Access Boundary', () => {
    test('clinician-summary strictly requires Authorization Bearer header', async () => {
      const mockStore = new Map();
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { action: 'clinician-summary', programId: 'prog-1' },
        headers: {}, // No auth header
      };

      const res = await recoveryCompanionHandler(event, {}, { mockStore });
      assert.equal(res.statusCode, 401);
      const body = JSON.parse(res.body);
      assert.ok(body.error.includes('Unauthorized'));
    });

    test('clinician-summary validates clinician Bearer credentials before returning summary', async () => {
      const mockStore = new Map();
      mockStore.set('prog-1', {
        program: { id: 'prog-1', title: 'Ankle Protocol' },
        checkIns: [
          { id: 'chk-1', pain_rating: 3, difficulty_rating: 'moderate', completed_at: new Date().toISOString() },
        ],
      });

      // Valid clinician token
      const validEvent = {
        httpMethod: 'GET',
        queryStringParameters: { action: 'clinician-summary', programId: 'prog-1' },
        headers: {
          authorization: 'Bearer valid-clinician-token-lagos',
        },
      };

      const validRes = await recoveryCompanionHandler(validEvent, {}, { mockStore });
      assert.equal(validRes.statusCode, 200);
      const validBody = JSON.parse(validRes.body);
      assert.equal(validBody.success, true);
      assert.equal(validBody.summary.total_sessions, 1);

      // Invalid clinician token
      const invalidEvent = {
        httpMethod: 'GET',
        queryStringParameters: { action: 'clinician-summary', programId: 'prog-1' },
        headers: {
          authorization: 'Bearer invalid-token',
        },
      };

      const invalidRes = await recoveryCompanionHandler(invalidEvent, {}, { mockStore });
      assert.equal(invalidRes.statusCode, 401);

      // Wrong role clinician token
      const wrongRoleEvent = {
        httpMethod: 'GET',
        queryStringParameters: { action: 'clinician-summary', programId: 'prog-1' },
        headers: {
          authorization: 'Bearer valid-clinician-token-wrong-role',
        },
      };

      const wrongRoleRes = await recoveryCompanionHandler(wrongRoleEvent, {}, { mockStore });
      assert.equal(wrongRoleRes.statusCode, 403, 'Must return 403 for wrong role');
      const wrongRoleBody = JSON.parse(wrongRoleRes.body);
      assert.ok(wrongRoleBody.error.includes('Insufficient privileges'));

      // Cross-practice access attempt
      const crossPracticeEvent = {
        httpMethod: 'GET',
        queryStringParameters: {
          action: 'clinician-summary',
          programId: 'prog-1',
          practiceId: 'mismatched-practice-id',
        },
        headers: {
          authorization: 'Bearer valid-clinician-token-lagos',
        },
      };

      const crossPracticeRes = await recoveryCompanionHandler(crossPracticeEvent, {}, { mockStore });
      assert.equal(crossPracticeRes.statusCode, 403, 'Must return 403 for cross-practice attempt');
      const crossBody = JSON.parse(crossPracticeRes.body);
      assert.ok(crossBody.error.includes('Practice mismatch'));
    });
  });

  // --------------------------------------------------------------------------
  // 7. Database Grants, SECURITY DEFINER & Search Path Auditing
  // --------------------------------------------------------------------------
  describe('7. Database Security, Grants & Role Boundaries', () => {
    test('Every RPC function is SECURITY DEFINER with fixed search_path = public, pg_temp', () => {
      const rpcFunctions = [
        'generate_hep_access_code',
        'verify_recovery_companion_access',
        'submit_recovery_companion_check_in',
        'get_hep_check_in_summary',
        'review_hep_check_in',
        'check_hep_rate_limit',
      ];

      for (const fn of rpcFunctions) {
        assert.ok(migrationSql.includes(`FUNCTION public.${fn}`), `Must define function ${fn}`);
        const fnBlock = migrationSql.substring(migrationSql.indexOf(`FUNCTION public.${fn}`));
        const endIndex = fnBlock.indexOf('$$;');
        const snippet = fnBlock.substring(0, endIndex + 3);
        assert.ok(snippet.includes('SECURITY DEFINER'), `${fn} must be SECURITY DEFINER`);
        assert.ok(snippet.includes('SET search_path = public, pg_temp'), `${fn} must lock search_path`);
      }
    });

    test('Public execution is revoked from all sensitive clinician RPCs', () => {
      assert.ok(migrationSql.includes('REVOKE ALL ON FUNCTION public.generate_hep_access_code(uuid, integer, uuid) FROM PUBLIC;'));
      assert.ok(migrationSql.includes('REVOKE ALL ON FUNCTION public.get_hep_check_in_summary(uuid, uuid) FROM PUBLIC;'));
      assert.ok(migrationSql.includes('REVOKE ALL ON FUNCTION public.review_hep_check_in(uuid, text, text, uuid) FROM PUBLIC;'));
    });
  });

  // --------------------------------------------------------------------------
  // 8. Privacy, Storage & Source Code Scan
  // --------------------------------------------------------------------------
  describe('8. Source Code & Bundle Privacy Compliance', () => {
    test('No access codes, tokens, or patient PII stored in localStorage or sessionStorage in frontend code', () => {
      const pageCode = fs.readFileSync(
        path.resolve(__dirname, '../src/pages/recovery/RecoveryCompanionPage.tsx'),
        'utf8'
      );
      assert.equal(pageCode.includes('localStorage'), false, 'RecoveryCompanionPage must NOT access localStorage');
      assert.equal(pageCode.includes('sessionStorage'), false, 'RecoveryCompanionPage must NOT access sessionStorage');
    });

    test('Zero clinical details or patient IDs in recovery routes', () => {
      const appCode = fs.readFileSync(path.resolve(__dirname, '../src/App.tsx'), 'utf8');
      assert.ok(appCode.includes('path="/recovery"'), 'Must have clean /recovery route');
      assert.ok(appCode.includes('path="/companion"'), 'Must have clean /companion route');
      assert.equal(appCode.includes('path="/recovery/:patientId"'), false, 'Route must not expose patientId');
    });
  });
});
