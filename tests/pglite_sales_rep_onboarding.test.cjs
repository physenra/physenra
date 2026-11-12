/**
 * PHYSENRA — STAGE 5 / 5.1: ISOLATED POSTGRESQL (PGLITE) INTEGRATION SUITE
 *
 * Executes against actual PostgreSQL engine (PostgreSQL 18.6 WASM via @electric-sql/pglite).
 * Verifies the 3 migrations:
 *   1. 20261110000000_sales_rep_and_referral_foundation.sql
 *   2. 20261110010000_sales_commission_settlement_engine.sql
 *   3. 20261111120000_atomic_sales_rep_onboarding.sql
 *
 * Validates the 10 real PostgreSQL integration scenarios without touching production.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { PGlite } = require('C:/project/physenra/node_modules/@electric-sql/pglite');

const ADMIN_ID = 'a1111111-1111-1111-1111-111111111111';
const NON_ADMIN_ID = 'b2222222-2222-2222-2222-222222222222';

async function createIsolatedDatabase(dataDir = undefined) {
  const db = new PGlite(dataDir);

  // 1. Initialize Base Supabase & Platform Schema
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE,
      created_at timestamptz DEFAULT now()
    );

    CREATE SCHEMA IF NOT EXISTS supabase_migrations;
    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
      version text PRIMARY KEY,
      name text,
      statements text[]
    );

    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$ LANGUAGE sql STABLE;

    CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
      SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
    $$ LANGUAGE sql STABLE;

    -- Enums
    CREATE TYPE public.saas_plan_code AS ENUM ('solo', 'professional', 'clinic', 'enterprise');
    CREATE TYPE public.saas_billing_interval AS ENUM ('monthly', 'annual', 'custom');
    CREATE TYPE public.saas_subscription_status AS ENUM (
      'trialing', 'active', 'pending_payment', 'past_due', 'grace_period', 'suspended', 'cancelled', 'expired'
    );
    CREATE TYPE public.saas_invoice_status AS ENUM ('draft', 'open', 'paid', 'uncollectible', 'void');
    CREATE TYPE public.saas_payment_status AS ENUM ('pending', 'successful', 'failed', 'refunded');
    CREATE TYPE public.saas_payment_gateway AS ENUM ('paystack', 'flutterwave', 'stripe', 'manual_bank_transfer', 'offline');

    CREATE TABLE IF NOT EXISTS public.practices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      slug text UNIQUE NOT NULL,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id),
      full_name text,
      email text,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.platform_settings (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      description text,
      updated_by uuid REFERENCES public.profiles(id),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      practice_id uuid REFERENCES public.practices(id),
      status public.saas_subscription_status NOT NULL,
      plan_code public.saas_plan_code NOT NULL,
      billing_interval public.saas_billing_interval NOT NULL DEFAULT 'monthly',
      current_period_end timestamptz,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.saas_invoices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      practice_id uuid REFERENCES public.practices(id),
      subscription_id uuid REFERENCES public.saas_subscriptions(id),
      invoice_number text UNIQUE NOT NULL,
      amount_due numeric NOT NULL DEFAULT 0,
      amount_paid numeric DEFAULT 0,
      subtotal_cents integer NOT NULL DEFAULT 0,
      discount_cents integer NOT NULL DEFAULT 0,
      tax_cents integer NOT NULL DEFAULT 0,
      total_cents integer NOT NULL DEFAULT 0,
      currency text NOT NULL DEFAULT 'NGN',
      status public.saas_invoice_status NOT NULL DEFAULT 'open',
      paid_at timestamptz,
      metadata jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.saas_payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      practice_id uuid REFERENCES public.practices(id),
      invoice_id uuid REFERENCES public.saas_invoices(id),
      gateway_provider public.saas_payment_gateway NOT NULL,
      gateway_reference text UNIQUE NOT NULL,
      gateway_status public.saas_payment_status NOT NULL,
      amount numeric NOT NULL,
      currency text NOT NULL DEFAULT 'NGN',
      paid_at timestamptz,
      metadata jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now()
    );

    CREATE OR REPLACE FUNCTION public.is_platform_admin() RETURNS boolean AS $$
    BEGIN
      RETURN coalesce(current_setting('request.jwt.claim.is_platform_admin', true) = 'true', false);
    END;
    $$ LANGUAGE plpgsql STABLE;

    -- Seed test users
    INSERT INTO auth.users (id, email) VALUES
      ('${ADMIN_ID}', 'admin@physenra.com'),
      ('${NON_ADMIN_ID}', 'staff@physenra.com');
  `);

  // 2. Apply Migrations in Sequence
  const migrations = [
    '20261110000000_sales_rep_and_referral_foundation.sql',
    '20261110010000_sales_commission_settlement_engine.sql',
    '20261111120000_atomic_sales_rep_onboarding.sql',
  ];

  for (const m of migrations) {
    const sql = fs.readFileSync(path.join('C:/project/physenra/supabase/migrations', m), 'utf8');
    await db.exec(sql);
  }

  return db;
}

/**
 * Execute RPC as a specific caller
 */
async function callOnboardRpc(db, {
  role = 'authenticated',
  userId = ADMIN_ID,
  isPlatformAdmin = true,
  params = {},
} = {}) {
  const defaultParams = {
    p_full_name: 'Chidi Okonkwo',
    p_email: 'chidi.okonkwo@example.com',
    p_phone_number: '+2348012345678',
    p_state_region: 'Lagos',
    p_referral_code: 'LAGOS-REP-01',
    p_bank_name: 'Guaranty Trust Bank',
    p_bank_code: '058',
    p_account_number: '0123456789',
    p_account_name: 'CHIDI OKONKWO',
    p_commission_rate_bps: 2000,
    p_notes: 'Initial test onboarding',
  };

  const p = { ...defaultParams, ...params };

  // Set session context mimicking PostgREST
  await db.exec(`
    SET request.jwt.claim.sub = '${userId || ''}';
    SET request.jwt.claim.role = '${role}';
    SET request.jwt.claim.is_platform_admin = '${isPlatformAdmin ? 'true' : 'false'}';
    SET ROLE ${role};
  `);

  try {
    const res = await db.query(`
      SELECT public.admin_onboard_sales_rep(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) as result
    `, [
      p.p_full_name,
      p.p_email,
      p.p_phone_number,
      p.p_state_region,
      p.p_referral_code,
      p.p_bank_name,
      p.p_bank_code,
      p.p_account_number,
      p.p_account_name,
      p.p_commission_rate_bps,
      p.p_notes,
    ]);

    return { data: res.rows[0].result, error: null };
  } catch (err) {
    return { data: null, error: err };
  } finally {
    // Reset role to superuser for clean subsequent operations
    await db.exec('RESET ROLE;');
  }
}

test('POSTGRESQL INTEGRATION: Sales Representative Onboarding (PGlite 18.6)', async (t) => {

  await t.test('SCENARIO 1: Authenticated Platform Admin successfully onboards a representative', async () => {
    const db = await createIsolatedDatabase();

    const res = await callOnboardRpc(db, {
      userId: ADMIN_ID,
      isPlatformAdmin: true,
      params: {
        p_email: 'rep.alpha@example.com',
        p_referral_code: 'ALPHA-REP-01',
      },
    });

    assert.equal(res.error, null, 'RPC call must succeed without error');
    assert.ok(res.data.id, 'Must return sales rep id');
    assert.ok(res.data.referral_code.id, 'Must return referral_code.id');
    assert.equal(res.data.referral_code.code, 'ALPHA-REP-01');
    assert.ok(res.data.bank_account, 'Must return bank_account');
    assert.equal(res.data.bank_account.masked_account_number, '••••••6789');

    // Verify actual PostgreSQL rows
    const repRows = await db.query('SELECT * FROM public.sales_representatives WHERE id = $1', [res.data.id]);
    assert.equal(repRows.rows.length, 1, 'Representative record must exist in PostgreSQL');
    assert.equal(repRows.rows[0].email, 'rep.alpha@example.com');
    assert.equal(repRows.rows[0].status, 'active');

    const codeRows = await db.query('SELECT * FROM public.sales_referral_codes WHERE id = $1', [res.data.referral_code.id]);
    assert.equal(codeRows.rows.length, 1, 'Referral code must exist');
    assert.equal(codeRows.rows[0].code, 'ALPHA-REP-01');

    const bankRows = await db.query('SELECT * FROM public.sales_rep_bank_accounts WHERE sales_rep_id = $1', [res.data.id]);
    assert.equal(bankRows.rows.length, 1, 'Bank account must exist');
    assert.equal(bankRows.rows[0].account_number, '0123456789');

    const auditRows = await db.query('SELECT * FROM public.platform_audit_logs WHERE target_resource_id = $1', [res.data.id]);
    assert.equal(auditRows.rows.length, 1, 'Audit log must exist');
    assert.equal(auditRows.rows[0].action, 'sales_rep.onboarded');
    assert.equal(auditRows.rows[0].target_resource_type, 'sales_representatives');
  });

  await t.test('SCENARIO 2: Unauthenticated caller (anon) is rejected by PostgreSQL privilege check', async () => {
    const db = await createIsolatedDatabase();

    const res = await callOnboardRpc(db, {
      role: 'anon',
      userId: null,
      isPlatformAdmin: false,
    });

    assert.ok(res.error, 'Unauthenticated caller must be rejected with error');
    // Error code 42501: permission denied for function admin_onboard_sales_rep
    assert.equal(res.error.code, '42501', 'Must fail with PostgreSQL permission denied error (42501)');

    const repCount = await db.query('SELECT count(*) as cnt FROM public.sales_representatives');
    assert.equal(Number(repCount.rows[0].cnt), 0, 'Zero records must be created');
  });

  await t.test('SCENARIO 3: Authenticated non-admin is rejected by is_platform_admin() check', async () => {
    const db = await createIsolatedDatabase();

    const res = await callOnboardRpc(db, {
      role: 'authenticated',
      userId: NON_ADMIN_ID,
      isPlatformAdmin: false,
    });

    assert.ok(res.error, 'Authenticated non-admin must be rejected with error');
    assert.match(res.error.message, /Access Denied: Only Platform Administrators/, 'Must throw exact permission message');
    assert.equal(res.error.code, '42501', 'Must return insufficient_privilege SQLSTATE 42501');

    const repCount = await db.query('SELECT count(*) as cnt FROM public.sales_representatives');
    assert.equal(Number(repCount.rows[0].cnt), 0, 'Zero records must be created on rejection');
  });

  await t.test('SCENARIO 4: Duplicate referral code triggers rollback with zero partial records', async () => {
    const db = await createIsolatedDatabase();

    // Onboard rep 1
    const res1 = await callOnboardRpc(db, {
      params: { p_email: 'rep1@example.com', p_referral_code: 'UNIQUE-CODE' },
    });
    assert.equal(res1.error, null);

    // Attempt rep 2 with same referral code
    const res2 = await callOnboardRpc(db, {
      params: { p_email: 'rep2@example.com', p_referral_code: 'UNIQUE-CODE' },
    });

    assert.ok(res2.error, 'Duplicate referral code must be rejected');
    assert.match(res2.error.message, /referral code.*already in use/i);

    // Verify rollback
    const rep2 = await db.query("SELECT * FROM public.sales_representatives WHERE email = 'rep2@example.com'");
    assert.equal(rep2.rows.length, 0, 'Rep 2 must NOT exist in database (transaction rolled back)');

    const repCount = await db.query('SELECT count(*) as cnt FROM public.sales_representatives');
    assert.equal(Number(repCount.rows[0].cnt), 1, 'Exactly 1 representative must exist in total');
  });

  await t.test('SCENARIO 5: Bank-account check constraint failure triggers complete rollback', async () => {
    const db = await createIsolatedDatabase();

    // Invalid 5-digit account number (violates check constraint: account_number ~ '^[0-9]{10}$')
    const res = await callOnboardRpc(db, {
      params: {
        p_email: 'bad.bank@example.com',
        p_referral_code: 'BAD-BANK-01',
        p_account_number: '12345', // INVALID
      },
    });

    assert.ok(res.error, 'Invalid account number must fail database check constraint');
    assert.equal(res.error.code, '23514', 'PostgreSQL check constraint violation (23514)');

    // Verify all-or-nothing rollback
    const rep = await db.query("SELECT * FROM public.sales_representatives WHERE email = 'bad.bank@example.com'");
    assert.equal(rep.rows.length, 0, 'Representative must be rolled back');

    const codes = await db.query("SELECT * FROM public.sales_referral_codes WHERE code = 'BAD-BANK-01'");
    assert.equal(codes.rows.length, 0, 'Referral code must be rolled back');

    const audit = await db.query("SELECT * FROM public.platform_audit_logs WHERE details->>'email' = 'bad.bank@example.com'");
    assert.equal(audit.rows.length, 0, 'Audit log must be rolled back');
  });

  await t.test('SCENARIO 6: Duplicate email triggers unique violation and clean rollback', async () => {
    const db = await createIsolatedDatabase();

    await callOnboardRpc(db, {
      params: { p_email: 'same.email@example.com', p_referral_code: 'CODE-AAA' },
    });

    // Attempt second onboarding with same email but different code
    const res2 = await callOnboardRpc(db, {
      params: { p_email: 'same.email@example.com', p_referral_code: 'CODE-BBB' },
    });

    assert.ok(res2.error, 'Duplicate email must fail');
    assert.match(res2.error.message, /already exists/i);

    // Verify CODE-BBB was never persisted
    const code2 = await db.query("SELECT * FROM public.sales_referral_codes WHERE code = 'CODE-BBB'");
    assert.equal(code2.rows.length, 0, 'Orphaned referral code CODE-BBB must NOT exist');
  });

  await t.test('SCENARIO 7: Optional bank details creates representative without bank records', async () => {
    const db = await createIsolatedDatabase();

    const res = await callOnboardRpc(db, {
      params: {
        p_email: 'no.bank@example.com',
        p_referral_code: 'NO-BANK-01',
        p_bank_name: null,
        p_bank_code: null,
        p_account_number: null,
        p_account_name: null,
      },
    });

    assert.equal(res.error, null);
    assert.ok(res.data.id);
    assert.equal(res.data.bank_account, null, 'bank_account must be null');

    const rep = await db.query('SELECT * FROM public.sales_representatives WHERE id = $1', [res.data.id]);
    assert.equal(rep.rows.length, 1);

    const bank = await db.query('SELECT * FROM public.sales_rep_bank_accounts WHERE sales_rep_id = $1', [res.data.id]);
    assert.equal(bank.rows.length, 0, 'Zero bank records must exist for this representative');
  });

  await t.test('SCENARIO 8: Independent-session concurrent submissions safely serialized across separate connections', async () => {
    const tmpDir = path.join(os.tmpdir(), 'pglite_concurrency_' + Date.now());
    let dbSetup, db1, db2;

    try {
      dbSetup = await createIsolatedDatabase(tmpDir);
      await dbSetup.close();
      dbSetup = null;

      // Open TWO SEPARATE PostgreSQL SESSIONS to the same physical database
      db1 = new PGlite(tmpDir);
      db2 = new PGlite(tmpDir);

      const p = {
        p_email: 'concurrent@example.com',
        p_referral_code: 'CONCURRENT-01',
      };

      // Dispatch simultaneous requests across two separate PostgreSQL connections
      const [r1, r2] = await Promise.all([
        callOnboardRpc(db1, { params: p }),
        callOnboardRpc(db2, { params: p }),
      ]);

      const successes = [r1, r2].filter(r => r.error === null);
      const failures = [r1, r2].filter(r => r.error !== null);

      assert.equal(successes.length, 1, 'Exactly one independent session must succeed');
      assert.equal(failures.length, 1, 'Exactly one independent session must fail with collision');
      assert.match(failures[0].error.message, /already exists|already in use/i);

      // Verify database state: exactly 1 representative and 1 referral code persisted
      await db1.exec('RESET ROLE;');
      const repRows = await db1.query("SELECT * FROM public.sales_representatives WHERE email = 'concurrent@example.com'");
      assert.equal(repRows.rows.length, 1, 'Exactly one representative record must exist across both sessions');

      const codeRows = await db1.query("SELECT * FROM public.sales_referral_codes WHERE code = 'CONCURRENT-01'");
      assert.equal(codeRows.rows.length, 1, 'Exactly one referral code record must exist across both sessions');
    } finally {
      if (dbSetup) await dbSetup.close();
      if (db1) await db1.close();
      if (db2) await db2.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  await t.test('SCENARIO 9: Audit log records the exact authenticated Platform Admin actor identity', async () => {
    const db = await createIsolatedDatabase();

    const res = await callOnboardRpc(db, {
      userId: ADMIN_ID,
      params: { p_email: 'audited@example.com', p_referral_code: 'AUDIT-01' },
    });

    const audit = await db.query('SELECT * FROM public.platform_audit_logs WHERE target_resource_id = $1', [res.data.id]);
    assert.equal(audit.rows.length, 1);
    assert.equal(audit.rows[0].actor_user_id, ADMIN_ID, 'Audit actor must match the authenticated admin user ID');
    assert.equal(audit.rows[0].target_resource_type, 'sales_representatives');
    assert.equal(audit.rows[0].action, 'sales_rep.onboarded');
  });

  await t.test('SCENARIO 10: Raw bank account numbers never appear in RPC response or audit log details', async () => {
    const db = await createIsolatedDatabase();

    const RAW_NUBAN = '0123456789';

    const res = await callOnboardRpc(db, {
      params: {
        p_email: 'confidential@example.com',
        p_referral_code: 'CONF-01',
        p_account_number: RAW_NUBAN,
      },
    });

    // Check RPC Response payload
    const responseJson = JSON.stringify(res.data);
    assert.ok(!responseJson.includes(RAW_NUBAN), 'Raw account number must NEVER appear in RPC response JSON');
    assert.ok(responseJson.includes('••••••6789'), 'RPC response must contain masked account number');

    // Check Audit Log details
    const audit = await db.query('SELECT details FROM public.platform_audit_logs WHERE target_resource_id = $1', [res.data.id]);
    const auditJson = JSON.stringify(audit.rows[0].details);
    assert.ok(!auditJson.includes(RAW_NUBAN), 'Raw account number must NEVER appear in platform_audit_logs details');
    assert.ok(auditJson.includes('••••••6789'), 'Audit log must store masked account number');
  });

  await t.test('SCENARIO 11: Error classification distinguishes duplicate referral code from duplicate email using PostgreSQL error details', async () => {
    const db = await createIsolatedDatabase();

    const callRpcWithServiceTranslation = async (params) => {
      const cleanFullName = (params.fullName || '').trim();
      const cleanEmail = (params.email || '').trim().toLowerCase();
      const cleanPhone = (params.phoneNumber || '').trim();
      const cleanRegion = (params.stateRegion || '').trim();
      const cleanCode = (params.referralCode || '').trim().toUpperCase();
      const cleanBankName = params.bankName?.trim() || null;
      const cleanBankCode = params.bankCode?.trim() || null;
      const cleanAccountNumber = params.accountNumber?.trim() || null;
      const cleanAccountName = params.accountName?.trim() || null;

      let rpcResult;
      try {
        rpcResult = await callOnboardRpc(db, {
          userId: ADMIN_ID,
          isPlatformAdmin: true,
          params: {
            p_full_name: cleanFullName,
            p_email: cleanEmail,
            p_phone_number: cleanPhone,
            p_state_region: cleanRegion,
            p_referral_code: cleanCode,
            p_bank_name: cleanBankName,
            p_bank_code: cleanBankCode,
            p_account_number: cleanAccountNumber,
            p_account_name: cleanAccountName,
            p_commission_rate_bps: params.commissionRateBps || 2000,
            p_notes: params.notes?.trim() || null,
          },
        });
      } catch (err) {
        rpcResult = { data: null, error: err };
      }

      const error = rpcResult.error;
      if (error) {
        const msg = error.message || '';
        const details = error.details || '';
        const combined = `${msg} ${details}`;

        // 1. Referral Code Collision (Explicit RPC check or sales_referral_codes_code_key constraint)
        const isReferralCodeDuplicate =
          combined.includes('sales_referral_codes_code_key') ||
          combined.includes('already in use') ||
          (combined.toLowerCase().includes('sales_referral_codes') && combined.toLowerCase().includes('code'));

        if (isReferralCodeDuplicate) {
          throw new Error(`Referral code "${cleanCode}" is already in use. Please choose a different referral code.`);
        }

        // 2. Email Address Collision (Explicit RPC check or sales_representatives_email_key constraint)
        const isEmailDuplicate =
          combined.includes('sales_representatives_email_key') ||
          (combined.toLowerCase().includes('sales representative with email') && combined.toLowerCase().includes('already exists')) ||
          (combined.toLowerCase().includes('sales_representatives') && combined.toLowerCase().includes('email'));

        if (isEmailDuplicate) {
          throw new Error(`A sales representative with email "${cleanEmail}" already exists.`);
        }

        // 3. Permission Denial (insufficient_privilege or Access Denied)
        if (error.code === '42501' || combined.toLowerCase().includes('access denied') || combined.toLowerCase().includes('insufficient_privilege')) {
          throw new Error('Permission denied: Only Platform Administrators can onboard sales representatives.');
        }

        // 4. Fall through for unrelated unique violations (code 23505) or general errors
        throw new Error(error.message || 'Failed to onboard representative');
      }

      return rpcResult.data;
    };

    // 1. Onboard initial representative
    const rep1 = await callRpcWithServiceTranslation({
      fullName: 'Aisha Bello',
      email: 'aisha@example.com',
      phoneNumber: '+2348011112222',
      stateRegion: 'Kaduna',
      referralCode: 'KADUNA-PILOT-01',
    });
    assert.ok(rep1.id);
    assert.equal(rep1.referral_code.code, 'KADUNA-PILOT-01');

    // 2. Duplicate Referral Code: Must produce referral code error (NOT email error!)
    await assert.rejects(
      callRpcWithServiceTranslation({
        fullName: 'Another Rep',
        email: 'different.email@example.com',
        phoneNumber: '+2348022223333',
        stateRegion: 'Kaduna',
        referralCode: 'KADUNA-PILOT-01', // Colliding code
      }),
      (err) => {
        assert.equal(err.message, 'Referral code "KADUNA-PILOT-01" is already in use. Please choose a different referral code.');
        return true;
      }
    );

    // 3. Duplicate Email: Must produce email error (NOT referral code error!)
    await assert.rejects(
      callRpcWithServiceTranslation({
        fullName: 'Another Rep',
        email: 'aisha@example.com', // Colliding email
        phoneNumber: '+2348033334444',
        stateRegion: 'Kaduna',
        referralCode: 'KADUNA-PILOT-02', // Different code
      }),
      (err) => {
        assert.equal(err.message, 'A sales representative with email "aisha@example.com" already exists.');
        return true;
      }
    );

    // 4. Low-level PostgreSQL constraint collision for referral code
    const mockConstraintCodeError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "sales_referral_codes_code_key"',
      details: 'Key (code)=(KADUNA-PILOT-01) already exists.',
    };
    const combinedCode = `${mockConstraintCodeError.message} ${mockConstraintCodeError.details}`;
    const isReferralCodeDuplicate =
      combinedCode.includes('sales_referral_codes_code_key') ||
      combinedCode.includes('already in use') ||
      (combinedCode.toLowerCase().includes('sales_referral_codes') && combinedCode.toLowerCase().includes('code'));
    assert.equal(isReferralCodeDuplicate, true, 'Low-level constraint must be classified as referral code collision');

    // 5. Low-level PostgreSQL constraint collision for email
    const mockConstraintEmailError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "sales_representatives_email_key"',
      details: 'Key (email)=(aisha@example.com) already exists.',
    };
    const combinedEmail = `${mockConstraintEmailError.message} ${mockConstraintEmailError.details}`;
    const isEmailDuplicate =
      combinedEmail.includes('sales_representatives_email_key') ||
      (combinedEmail.toLowerCase().includes('sales representative with email') && combinedEmail.toLowerCase().includes('already exists')) ||
      (combinedEmail.toLowerCase().includes('sales_representatives') && combinedEmail.toLowerCase().includes('email'));
    assert.equal(isEmailDuplicate, true, 'Low-level constraint must be classified as email collision');

    // 6. Unrelated unique constraint violation (SQLSTATE 23505) falls through without misclassification
    const mockUnrelatedUniqueError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "unrelated_table_unique_idx"',
      details: 'Key (tenant_id)=(xyz) already exists.',
    };
    const combinedUnrelated = `${mockUnrelatedUniqueError.message} ${mockUnrelatedUniqueError.details}`;
    const isUnrelatedCode =
      combinedUnrelated.includes('sales_referral_codes_code_key') ||
      combinedUnrelated.includes('already in use') ||
      (combinedUnrelated.toLowerCase().includes('sales_referral_codes') && combinedUnrelated.toLowerCase().includes('code'));
    const isUnrelatedEmail =
      combinedUnrelated.includes('sales_representatives_email_key') ||
      (combinedUnrelated.toLowerCase().includes('sales representative with email') && combinedUnrelated.toLowerCase().includes('already exists')) ||
      (combinedUnrelated.toLowerCase().includes('sales_representatives') && combinedUnrelated.toLowerCase().includes('email'));

    assert.equal(isUnrelatedCode, false, 'Unrelated unique constraint must NOT be classified as referral code collision');
    assert.equal(isUnrelatedEmail, false, 'Unrelated unique constraint must NOT be classified as email collision');
  });
});
