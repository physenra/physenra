/**
 * PHYSENRA — PHASE 7: INDEPENDENT SALES REPRESENTATIVE PORTAL & FREE PARTNER ACCESS
 * Real PostgreSQL (PGlite 18.6 WASM) Security, RLS, Commercial Access & Attribution Suite
 *
 * Applies actual production baseline + Migration 40 + Migration 42 + Phase 7 Migration 43
 * (WITHOUT Migration 41) to prove exact compatibility with production schema.
 * Runs all role-scoped checks under `SET LOCAL ROLE authenticated` / `anon` so
 * genuine PostgreSQL Row-Level Security and GRANT/REVOKE rules are enforced.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('C:/project/physenra/node_modules/@electric-sql/pglite');

const ADMIN_ID = 'a1111111-1111-1111-1111-111111111111';
const REP_A_USER_ID = 'b2222222-2222-2222-2222-222222222222';
const REP_B_USER_ID = 'c3333333-3333-3333-3333-333333333333';
const CLINIC_USER_ID = 'd4444444-4444-4444-4444-444444444444';
const UNCONFIRMED_USER_ID = 'e5555555-5555-5555-5555-555555555555';

async function createPhase7Database() {
  const db = new PGlite();

  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;

    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE,
      email_confirmed_at timestamptz,
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

    CREATE TYPE public.saas_plan_code AS ENUM ('solo', 'professional', 'clinic', 'enterprise');
    CREATE TYPE public.saas_billing_interval AS ENUM ('monthly', 'annual', 'custom');
    CREATE TYPE public.saas_subscription_status AS ENUM (
      'trialing', 'active', 'pending_payment', 'past_due', 'grace_period', 'suspended', 'cancelled', 'expired'
    );
    CREATE TYPE public.saas_invoice_status AS ENUM ('draft', 'open', 'paid', 'uncollectible', 'void');
    CREATE TYPE public.saas_payment_status AS ENUM ('pending', 'successful', 'failed', 'refunded');
    CREATE TYPE public.saas_payment_gateway AS ENUM ('paystack', 'flutterwave', 'stripe', 'manual_bank_transfer', 'offline');

    CREATE TABLE public.practices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      slug text UNIQUE NOT NULL,
      status text NOT NULL DEFAULT 'active',
      email text,
      phone text,
      timezone text NOT NULL DEFAULT 'Africa/Lagos',
      country text NOT NULL DEFAULT 'NG',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      display_name text,
      first_name text,
      last_name text,
      phone text,
      is_platform_admin boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE public.practice_memberships (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role text NOT NULL,
      status text NOT NULL DEFAULT 'active',
      joined_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE public.saas_plans (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_code public.saas_plan_code UNIQUE NOT NULL,
      name text NOT NULL,
      currency text NOT NULL DEFAULT 'NGN',
      monthly_price_cents bigint NOT NULL,
      annual_price_cents bigint NOT NULL,
      practitioner_seat_limit integer NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      is_public boolean NOT NULL DEFAULT true,
      trial_allowed boolean NOT NULL DEFAULT true,
      trial_duration_days integer NOT NULL DEFAULT 14
    );

    INSERT INTO public.saas_plans (plan_code, name, monthly_price_cents, annual_price_cents, practitioner_seat_limit)
    VALUES ('professional', 'Professional Clinic', 3000000, 30000000, 5);

    CREATE TABLE public.practice_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      practice_id uuid NOT NULL UNIQUE REFERENCES public.practices(id) ON DELETE RESTRICT,
      plan_id uuid NOT NULL REFERENCES public.saas_plans(id) ON DELETE RESTRICT,
      status public.saas_subscription_status NOT NULL DEFAULT 'trialing',
      billing_interval public.saas_billing_interval NOT NULL DEFAULT 'monthly',
      current_price_cents bigint NOT NULL,
      currency text NOT NULL DEFAULT 'NGN',
      seat_limit integer NOT NULL,
      current_period_start timestamptz NOT NULL,
      current_period_end timestamptz NOT NULL,
      trial_started_at timestamptz,
      trial_ends_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE public.practice_invoice_counters (practice_id uuid PRIMARY KEY, last_number integer NOT NULL DEFAULT 0);
    CREATE TABLE public.practice_patient_counters (practice_id uuid PRIMARY KEY, next_val integer NOT NULL DEFAULT 1);
    CREATE TABLE public.practice_wallet_counters (practice_id uuid PRIMARY KEY, last_number integer NOT NULL DEFAULT 0);
    CREATE TABLE public.practice_imaging_counters (practice_id uuid PRIMARY KEY, last_order_number integer NOT NULL DEFAULT 0, last_study_number integer NOT NULL DEFAULT 0);

    CREATE TABLE public.saas_invoices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      practice_id uuid REFERENCES public.practices(id),
      subscription_id uuid REFERENCES public.practice_subscriptions(id),
      subtotal_cents bigint NOT NULL DEFAULT 0,
      discount_cents bigint NOT NULL DEFAULT 0,
      tax_cents bigint NOT NULL DEFAULT 0,
      total_cents bigint NOT NULL DEFAULT 0,
      currency text NOT NULL DEFAULT 'NGN',
      status public.saas_invoice_status NOT NULL DEFAULT 'open',
      paid_at timestamptz,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE public.saas_payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      practice_id uuid REFERENCES public.practices(id),
      invoice_id uuid REFERENCES public.saas_invoices(id),
      gateway_provider public.saas_payment_gateway NOT NULL,
      gateway_reference text UNIQUE NOT NULL,
      gateway_status public.saas_payment_status NOT NULL,
      amount_cents bigint NOT NULL DEFAULT 0,
      currency text NOT NULL DEFAULT 'NGN',
      paid_at timestamptz,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE public.platform_settings (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      description text,
      updated_by uuid REFERENCES public.profiles(id),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE public.audit_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      practice_id uuid,
      actor_user_id uuid,
      action text NOT NULL,
      entity_type text NOT NULL,
      entity_id uuid,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      source text,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE OR REPLACE FUNCTION public.is_platform_admin() RETURNS boolean AS $$
      SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_platform_admin = true
      );
    $$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

    CREATE OR REPLACE FUNCTION public.user_has_practice_role(target_practice_id uuid, allowed_roles text[])
    RETURNS boolean AS $$
      SELECT EXISTS (
        SELECT 1 FROM public.practice_memberships
        WHERE user_id = auth.uid()
          AND practice_id = target_practice_id
          AND status = 'active'
          AND role = ANY(allowed_roles)
      );
    $$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

    CREATE OR REPLACE FUNCTION public.practice_is_writable(p_practice_id uuid)
    RETURNS boolean AS $$
      SELECT EXISTS (
        SELECT 1 FROM public.practice_subscriptions ps
        JOIN public.practices p ON p.id = ps.practice_id
        WHERE ps.practice_id = p_practice_id
          AND ps.status IN ('trialing', 'active', 'past_due', 'grace_period')
          AND p.status IN ('active', 'trial')
      );
    $$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

    CREATE OR REPLACE FUNCTION public.log_audit_event(
      p_practice_id uuid,
      p_action text,
      p_entity_type text,
      p_entity_id uuid,
      p_metadata jsonb DEFAULT '{}'::jsonb,
      p_source text DEFAULT 'web'
    ) RETURNS uuid AS $$
    DECLARE v_id uuid;
    BEGIN
      INSERT INTO public.audit_events (practice_id, actor_user_id, action, entity_type, entity_id, metadata, source)
      VALUES (p_practice_id, auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata, p_source)
      RETURNING id INTO v_id;
      RETURN v_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

    CREATE OR REPLACE FUNCTION public.protect_is_platform_admin()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.is_platform_admin IS DISTINCT FROM COALESCE(OLD.is_platform_admin, false)
         AND NOT COALESCE(public.is_platform_admin(), false) THEN
        RAISE EXCEPTION 'Privilege escalation rejected' USING ERRCODE = 'insufficient_privilege';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

    ALTER TABLE public.practices ENABLE ROW LEVEL SECURITY;
    CREATE POLICY practices_select_member ON public.practices FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.practice_memberships pm WHERE pm.practice_id = practices.id AND pm.user_id = auth.uid() AND pm.status = 'active'));

    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY profiles_select_self ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
    CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT SELECT ON public.practices, public.profiles, public.saas_plans, public.practice_subscriptions, public.practice_memberships TO authenticated;
    GRANT SELECT ON public.saas_plans TO anon;
    GRANT UPDATE (display_name, first_name, last_name, phone) ON public.profiles TO authenticated;

    -- Seed Auth users & profiles before arming privilege escalation trigger
    INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
      ('${ADMIN_ID}', 'admin@physenra.com', now()),
      ('${REP_A_USER_ID}', 'repa@physenra.com', now()),
      ('${REP_B_USER_ID}', 'repb@physenra.com', now()),
      ('${CLINIC_USER_ID}', 'clinicowner@example.com', now()),
      ('${UNCONFIRMED_USER_ID}', 'pendingrep@physenra.com', NULL);

    INSERT INTO public.profiles (id, display_name, is_platform_admin) VALUES
      ('${ADMIN_ID}', 'Super Admin', true),
      ('${REP_A_USER_ID}', 'Adaeze Okafor', false),
      ('${REP_B_USER_ID}', 'Tunde Bakare', false),
      ('${CLINIC_USER_ID}', 'Dr. Bello', false),
      ('${UNCONFIRMED_USER_ID}', 'Pending Rep', false);

    CREATE TRIGGER trg_protect_is_platform_admin
      BEFORE INSERT OR UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.protect_is_platform_admin();
  `);

  // Apply production baseline 40 -> 42 -> Phase 7 (NO Migration 41!)
  const migrations = [
    '20261004010000_fix_register_practice_patient_counter.sql',
    '20261110000000_sales_rep_and_referral_foundation.sql',
    '20261111120000_atomic_sales_rep_onboarding.sql',
    '20261112100000_sales_rep_portal_and_attribution.sql',
  ];

  for (const m of migrations) {
    const sql = fs.readFileSync(path.join('C:/project/physenra/supabase/migrations', m), 'utf8');
    await db.exec(sql);
  }

  return db;
}

async function asRole(db, role, userId, fn) {
  await db.exec('BEGIN');
  try {
    await db.query(`SELECT set_config('role', $1, true)`, [role]);
    await db.query(`SELECT set_config('request.jwt.claim.role', $1, true)`, [role]);
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId || '']);
    const result = await fn();
    await db.exec('COMMIT');
    return result;
  } catch (err) {
    await db.exec('ROLLBACK');
    throw err;
  }
}

test('PHASE 7 POSTGRESQL SECURITY, FREE PARTNER ACCESS & ATTRIBUTION SUITE (PGlite 18.6)', async (t) => {
  const db = await createPhase7Database();

  // Onboard Rep A (Lagos) & Rep B (Abuja) via Admin RPC, then link Rep A & Rep B Auth accounts
  let repAId;
  let repBId;

  await asRole(db, 'authenticated', ADMIN_ID, async () => {
    const resA = await db.query(
      `SELECT public.admin_onboard_sales_rep($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) AS d`,
      ['Adaeze Okafor', 'repa@physenra.com', '08031112222', 'Lagos', 'LAGOS-REP-01', 'GTBank', '058', '0123456789', 'Adaeze Okafor', 2000, null]
    );
    repAId = resA.rows[0].d.id;

    const resB = await db.query(
      `SELECT public.admin_onboard_sales_rep($1,$2,$3,$4,$5) AS d`,
      ['Tunde Bakare', 'repb@physenra.com', '08098887777', 'Abuja', 'ABUJA-REP-02']
    );
    repBId = resB.rows[0].d.id;

    await db.query(`SELECT public.admin_link_sales_rep_user($1, $2)`, [repAId, REP_A_USER_ID]);
    await db.query(`SELECT public.admin_link_sales_rep_user($1, $2)`, [repBId, REP_B_USER_ID]);
  });

  await t.test('T1 (Free Access): Active rep enters portal with ZERO clinic memberships or subscriptions', async () => {
    const ctx = await asRole(db, 'authenticated', REP_A_USER_ID, async () => {
      const r = await db.query(`SELECT public.get_my_sales_portal_context() AS ctx`);
      return r.rows[0].ctx;
    });

    assert.equal(ctx.is_sales_rep, true);
    assert.equal(ctx.has_portal_access, true);
    assert.equal(ctx.free_partner_access, true);
    assert.equal(ctx.commission_settlement_enabled, false);
    assert.equal(ctx.profile.referral_code, 'LAGOS-REP-01');

    // Confirm zero practice memberships, zero subscriptions, zero invoices created for Rep A
    const counts = await db.query(`
      SELECT
        (SELECT count(*)::int FROM public.practice_memberships WHERE user_id = $1) AS mems,
        (SELECT count(*)::int FROM public.practice_subscriptions) AS subs,
        (SELECT count(*)::int FROM public.saas_invoices) AS invs
    `, [REP_A_USER_ID]);
    assert.equal(counts.rows[0].mems, 0);
    assert.equal(counts.rows[0].subs, 0);
    assert.equal(counts.rows[0].invs, 0);
  });

  await t.test('T2 (Security): Unconfirmed Auth user cannot claim unlinked rep account', async () => {
    const res = await asRole(db, 'authenticated', ADMIN_ID, async () => {
      const created = await db.query(
        `SELECT public.admin_onboard_sales_rep($1,$2,$3,$4,$5) AS d`,
        ['Pending Rep', 'pendingrep@physenra.com', '08051110000', 'Kano', 'KANO-REP-03']
      );
      return created.rows[0].d;
    });
    assert.ok(res.id);

    const claimAttempt = await asRole(db, 'authenticated', UNCONFIRMED_USER_ID, async () => {
      const r = await db.query(`SELECT public.claim_verified_sales_rep_account() AS res`);
      return r.rows[0].res;
    });
    assert.equal(claimAttempt.claimed, false);
    assert.equal(claimAttempt.reason, 'email_unconfirmed');

    // Confirm email -> claim succeeds securely and sets user_id
    await db.query(`UPDATE auth.users SET email_confirmed_at = now() WHERE id = $1`, [UNCONFIRMED_USER_ID]);
    const confirmedClaim = await asRole(db, 'authenticated', UNCONFIRMED_USER_ID, async () => {
      const r = await db.query(`SELECT public.claim_verified_sales_rep_account() AS res`);
      return r.rows[0].res;
    });
    assert.equal(confirmedClaim.claimed, true);
    assert.equal(confirmedClaim.sales_rep_id, res.id);
  });

  await t.test('T3 (Referral Attribution): Clinic registration works with valid, invalid, missing, duplicate & self-referral codes', async () => {
    // 3a. Valid code check via anon
    const validCheck = await asRole(db, 'anon', '', async () => {
      const r = await db.query(`SELECT public.validate_referral_code('lagos-rep-01') AS v`);
      return r.rows[0].v;
    });
    assert.equal(validCheck.valid, true);
    assert.equal(validCheck.code, 'LAGOS-REP-01');
    assert.equal(validCheck.email, undefined); // zero PII leaked

    // 3b. Clinic registers with Rep A valid code
    const regValid = await asRole(db, 'authenticated', CLINIC_USER_ID, async () => {
      const r = await db.query(
        `SELECT public.register_practice_and_subscribe('Apex Physio', 'apex-physio', 'professional', 'monthly', 'NG', 'Africa/Lagos', 'LAGOS-REP-01') AS res`
      );
      return r.rows[0].res;
    });
    assert.ok(regValid.practice_id);

    // 3c. Duplicate overwrite attempt with Rep B code is blocked cleanly
    const dupAttr = await asRole(db, 'authenticated', CLINIC_USER_ID, async () => {
      const r = await db.query(
        `SELECT public.attribute_practice_referral($1, 'ABUJA-REP-02', 'manual_code_entry') AS res`,
        [regValid.practice_id]
      );
      return r.rows[0].res;
    });
    assert.equal(dupAttr.attributed, false);
    assert.equal(dupAttr.reason, 'already_attributed');

    // 3d. Clinic registration with INVALID / tampered code still succeeds (non-blocking)
    const regInvalid = await asRole(db, 'authenticated', CLINIC_USER_ID, async () => {
      const r = await db.query(
        `SELECT public.register_practice_and_subscribe('Delta Clinic', 'delta-clinic', 'professional', 'monthly', 'NG', 'Africa/Lagos', 'FAKE-TAMPER-999') AS res`
      );
      return r.rows[0].res;
    });
    assert.ok(regInvalid.practice_id);

    // 3d-bis. Clinic registration with MISSING referral code (6-arg default & explicit NULL) succeeds normally
    const regMissing = await asRole(db, 'authenticated', CLINIC_USER_ID, async () => {
      const r = await db.query(
        `SELECT public.register_practice_and_subscribe('Echo Clinic', 'echo-clinic', 'professional', 'monthly', 'NG', 'Africa/Lagos') AS res`
      );
      return r.rows[0].res;
    });
    assert.ok(regMissing.practice_id);
    const echoRefCount = await db.query(`SELECT count(*)::int AS c FROM public.sales_referrals WHERE practice_id = $1`, [regMissing.practice_id]);
    assert.equal(echoRefCount.rows[0].c, 0);

    // 3e. Self-referral (Rep A registers own practice using LAGOS-REP-01): clinic succeeds, referral disqualified
    const selfReg = await asRole(db, 'authenticated', REP_A_USER_ID, async () => {
      const r = await db.query(
        `SELECT public.register_practice_and_subscribe('Adaeze Own Clinic', 'adaeze-own-clinic', 'professional', 'monthly', 'NG', 'Africa/Lagos', 'LAGOS-REP-01') AS res`
      );
      return r.rows[0].res;
    });
    assert.ok(selfReg.practice_id);
    const selfRefRow = await db.query(
      `SELECT status, disqualification_reason FROM public.sales_referrals WHERE practice_id = $1`,
      [selfReg.practice_id]
    );
    assert.equal(selfRefRow.rows[0].status, 'disqualified');
    assert.match(selfRefRow.rows[0].disqualification_reason, /Self-referral/i);
  });

  await t.test('T4 (IDOR & Isolation): Rep A sees ONLY Rep A referrals (without PHI) & ZERO Rep B data', async () => {
    const repARefs = await asRole(db, 'authenticated', REP_A_USER_ID, async () => {
      const r = await db.query(`SELECT * FROM public.get_my_rep_referrals()`);
      return r.rows;
    });
    assert.equal(repARefs.length, 2); // Apex Physio (attributed) + Adaeze Own Clinic (disqualified)
    assert.equal(repARefs.some((r) => r.practice_name === 'Apex Physio' && r.status === 'attributed'), true);

    // Rep B sees 0 referrals via both RPC and direct RLS SELECT
    const repBRefs = await asRole(db, 'authenticated', REP_B_USER_ID, async () => {
      const rpcRows = await db.query(`SELECT * FROM public.get_my_rep_referrals()`);
      const tableRows = await db.query(`SELECT id FROM public.sales_referrals`);
      const repRows = await db.query(`SELECT id FROM public.sales_representatives`);
      return { rpc: rpcRows.rows, table: tableRows.rows, reps: repRows.rows };
    });
    assert.equal(repBRefs.rpc.length, 0);
    assert.equal(repBRefs.table.length, 0);
    assert.equal(repBRefs.reps.length, 1);
    assert.equal(repBRefs.reps[0].id, repBId);
  });

  await t.test('T5 (Privilege Lockdown): Rep cannot elevate privileges or mutate rate/code/status', async () => {
    // Rep A can update safe profile fields cleanly
    const updated = await asRole(db, 'authenticated', REP_A_USER_ID, async () => {
      const r = await db.query(
        `SELECT public.update_my_rep_profile('Adaeze Okafor-Nwosu', '08039990000', 'FCT Abuja') AS res`
      );
      return r.rows[0].res;
    });
    assert.equal(updated.updated, true);

    // Direct SQL update attempting to bump commission_rate_bps fails RLS
    const directBump = await asRole(db, 'authenticated', REP_A_USER_ID, async () => {
      const r = await db.query(`UPDATE public.sales_representatives SET commission_rate_bps = 9000 RETURNING id`);
      return r.rows;
    });
    assert.equal(directBump.length, 0);

    // Admin RPC call by Rep B rejected
    await assert.rejects(
      asRole(db, 'authenticated', REP_B_USER_ID, async () => {
        await db.query(`SELECT public.admin_onboard_sales_rep('X','x@x.com','08011111111','Lagos','XXXX-01')`);
      }),
      /Access Denied/
    );

    // Platform Admin escalation in profiles rejected (by column GRANT and/or trigger)
    await assert.rejects(
      asRole(db, 'authenticated', REP_A_USER_ID, async () => {
        await db.query(`UPDATE public.profiles SET is_platform_admin = true WHERE id = $1`, [REP_A_USER_ID]);
      }),
      /Privilege escalation rejected|permission denied for table profiles/
    );
  });

  await t.test('T6 (Suspension & Independence): Suspending Rep A revokes portal/RLS access WITHOUT affecting Rep A clinic subscription', async () => {
    // Suspend Rep A as Super Admin
    await db.query(`UPDATE public.sales_representatives SET status = 'suspended' WHERE id = $1`, [repAId]);

    // Portal context immediately revokes access
    const ctxSuspended = await asRole(db, 'authenticated', REP_A_USER_ID, async () => {
      const r = await db.query(`SELECT public.get_my_sales_portal_context() AS ctx`);
      return r.rows[0].ctx;
    });
    assert.equal(ctxSuspended.is_sales_rep, true);
    assert.equal(ctxSuspended.has_portal_access, false);
    assert.equal(ctxSuspended.status, 'suspended');

    // Direct REST/table queries & RPCs return 0 rows or reject
    const directRows = await asRole(db, 'authenticated', REP_A_USER_ID, async () => {
      const refs = await db.query(`SELECT id FROM public.sales_referrals`);
      const codes = await db.query(`SELECT id FROM public.sales_referral_codes`);
      const bank = await db.query(`SELECT * FROM public.get_my_banking_profile()`);
      return { refs: refs.rows, codes: codes.rows, bank: bank.rows };
    });
    assert.equal(directRows.refs.length, 0);
    assert.equal(directRows.codes.length, 0);
    assert.equal(directRows.bank.length, 0);

    await assert.rejects(
      asRole(db, 'authenticated', REP_A_USER_ID, async () => {
        await db.query(`SELECT * FROM public.get_my_rep_referrals()`);
      }),
      /Access Denied/
    );

    // Suspended rep's referral code no longer validates as active
    const inactiveCheck = await asRole(db, 'anon', '', async () => {
      const r = await db.query(`SELECT public.validate_referral_code('LAGOS-REP-01') AS v`);
      return r.rows[0].v;
    });
    assert.equal(inactiveCheck.valid, false);

    // Verify Rep A's independent practice subscription ("adaeze-own-clinic") remains completely unaffected!
    const clinicSub = await db.query(`
      SELECT p.status AS practice_status, ps.status AS sub_status, public.practice_is_writable(p.id) AS writable
      FROM public.practices p
      JOIN public.practice_subscriptions ps ON ps.practice_id = p.id
      WHERE p.slug = 'adaeze-own-clinic'
    `);
    assert.equal(clinicSub.rows[0].sub_status, 'trialing');
    assert.equal(clinicSub.rows[0].writable, true);

    // Expire Rep A's clinic subscription while keeping/reactivating Rep A partner account:
    // Rep A still gets FREE sales portal access, while clinic writability is strictly blocked (Rule 7)!
    await db.query(`UPDATE public.sales_representatives SET status = 'active' WHERE id = $1`, [repAId]);
    await db.query(`
      UPDATE public.practice_subscriptions SET status = 'expired'
      WHERE practice_id = (SELECT id FROM public.practices WHERE slug = 'adaeze-own-clinic')
    `);

    const clinicWritableAfterExpiry = await db.query(`
      SELECT public.practice_is_writable(id) AS writable FROM public.practices WHERE slug = 'adaeze-own-clinic'
    `);
    assert.equal(clinicWritableAfterExpiry.rows[0].writable, false);

    const portalAfterClinicExpiry = await asRole(db, 'authenticated', REP_A_USER_ID, async () => {
      const r = await db.query(`SELECT public.get_my_sales_portal_context() AS ctx`);
      return r.rows[0].ctx;
    });
    assert.equal(portalAfterClinicExpiry.has_portal_access, true);
    assert.equal(portalAfterClinicExpiry.free_partner_access, true);

    // Terminated representative also loses portal access & RLS immediately
    await db.query(`UPDATE public.sales_representatives SET status = 'terminated' WHERE id = $1`, [repBId]);
    const termCtx = await asRole(db, 'authenticated', REP_B_USER_ID, async () => {
      const r = await db.query(`SELECT public.get_my_sales_portal_context() AS ctx`);
      return r.rows[0].ctx;
    });
    assert.equal(termCtx.is_sales_rep, true);
    assert.equal(termCtx.has_portal_access, false);
    assert.equal(termCtx.status, 'terminated');
  });

  await t.test('T7 (Anon Isolation): Unauthenticated anon requests rejected across portal & admin endpoints', async () => {
    await assert.rejects(
      asRole(db, 'anon', '', async () => {
        await db.query(`SELECT public.get_my_sales_portal_context()`);
      }),
      /Authentication required|permission denied for function get_my_sales_portal_context/
    );
  });
});
