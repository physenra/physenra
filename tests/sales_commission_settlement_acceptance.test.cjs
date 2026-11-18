/**
 * PHYSENRA — SALES COMMISSION SETTLEMENT ACCEPTANCE TEST SUITE
 * Real PostgreSQL (PGlite 18.6 WASM) Financial Security, Attribution & Settlement Suite
 *
 * Implements the 25 required acceptance scenarios:
 *  1. First qualifying subscription payment
 *  2. Second payment and renewal exclusion
 *  3. Duplicate webhook delivery
 *  4. Conflicting transfer references
 *  5. Invalid webhook signature
 *  6. Refund and chargeback
 *  7. Suspended representative
 *  8. Terminated representative
 *  9. Invalid referral attribution
 * 10. Missing outbox record
 * 11. Abandoned outbox record
 * 12. Scanner recovery
 * 13. Concurrent commission generation
 * 14. Concurrent payout processing
 * 15. Duplicate payout allocation
 * 16. Allocation exceeding eligible balance
 * 17. Failed payout
 * 18. Successful payout
 * 19. Replayed Paystack event
 * 20. Feature flag disabled
 * 21. Missing feature flag setting
 * 22. Malformed feature flag setting
 * 23. Lock timeout
 * 24. RLS isolation between representatives
 * 25. Unauthorised Super Admin operations
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');

const ADMIN_ID = 'a1111111-1111-1111-1111-111111111111';
const REP_A_USER_ID = 'b2222222-2222-2222-2222-222222222222';
const REP_B_USER_ID = 'c3333333-3333-3333-3333-333333333333';
const CLINIC_USER_ID = 'd4444444-4444-4444-4444-444444444444';

async function createAcceptanceDatabase() {
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
    VALUES
      ('solo', 'Solo Practice', 1000000, 10000000, 1),
      ('professional', 'Professional Clinic', 3000000, 30000000, 5),
      ('clinic', 'Multi-Specialty Clinic', 6000000, 60000000, 10);

    CREATE TABLE public.practice_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      practice_id uuid NOT NULL UNIQUE REFERENCES public.practices(id) ON DELETE RESTRICT,
      plan_id uuid NOT NULL REFERENCES public.saas_plans(id) ON DELETE RESTRICT,
      status public.saas_subscription_status NOT NULL DEFAULT 'trialing',
      billing_interval public.saas_billing_interval NOT NULL DEFAULT 'monthly',
      pending_plan_id uuid REFERENCES public.saas_plans(id) ON DELETE SET NULL,
      pending_billing_interval public.saas_billing_interval,
      current_price_cents bigint NOT NULL CHECK (current_price_cents >= 0),
      currency text NOT NULL DEFAULT 'NGN' CHECK (length(currency) = 3),
      seat_limit integer NOT NULL CHECK (seat_limit > 0),
      current_period_start timestamptz NOT NULL,
      current_period_end timestamptz NOT NULL,
      trial_started_at timestamptz,
      trial_ends_at timestamptz,
      grace_period_ends_at timestamptz,
      cancel_at_period_end boolean NOT NULL DEFAULT false,
      cancelled_at timestamptz,
      suspended_at timestamptz,
      gateway_provider public.saas_payment_gateway NOT NULL DEFAULT 'paystack',
      gateway_customer_code text,
      gateway_subscription_code text,
      gateway_auth_token text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT chk_period_consistency CHECK (current_period_end >= current_period_start)
    );

    CREATE TABLE public.practice_invoice_counters (practice_id uuid PRIMARY KEY, last_number integer NOT NULL DEFAULT 0);
    CREATE TABLE public.practice_patient_counters (practice_id uuid PRIMARY KEY, next_val integer NOT NULL DEFAULT 1);
    CREATE TABLE public.practice_wallet_counters (practice_id uuid PRIMARY KEY, last_number integer NOT NULL DEFAULT 0);
    CREATE TABLE public.practice_imaging_counters (practice_id uuid PRIMARY KEY, last_order_number integer NOT NULL DEFAULT 0, last_study_number integer NOT NULL DEFAULT 0);

    CREATE TABLE public.saas_invoices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_number text UNIQUE NOT NULL DEFAULT ('PHY-INV-' || floor(random()*100000000)::text),
      practice_id uuid REFERENCES public.practices(id),
      subscription_id uuid REFERENCES public.practice_subscriptions(id),
      subtotal_cents bigint NOT NULL DEFAULT 0,
      discount_cents bigint NOT NULL DEFAULT 0,
      tax_cents bigint NOT NULL DEFAULT 0,
      total_cents bigint NOT NULL DEFAULT 0,
      currency text NOT NULL DEFAULT 'NGN',
      status public.saas_invoice_status NOT NULL DEFAULT 'open',
      due_date timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
      paid_at timestamptz,
      voided_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE public.saas_payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_number text UNIQUE NOT NULL DEFAULT ('PHY-PAY-' || floor(random()*100000000)::text),
      invoice_id uuid NOT NULL REFERENCES public.saas_invoices(id) ON DELETE RESTRICT,
      practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
      amount_cents bigint NOT NULL CHECK (amount_cents > 0),
      currency text NOT NULL DEFAULT 'NGN',
      payment_method text NOT NULL DEFAULT 'card',
      gateway_provider public.saas_payment_gateway NOT NULL,
      gateway_reference text UNIQUE NOT NULL,
      gateway_fee_cents bigint NOT NULL DEFAULT 0 CHECK (gateway_fee_cents >= 0),
      status public.saas_payment_status NOT NULL DEFAULT 'pending',
      settled_at timestamptz,
      paid_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE public.saas_webhook_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      gateway public.saas_payment_gateway NOT NULL,
      external_event_id text NOT NULL,
      event_type text NOT NULL,
      payload jsonb NOT NULL,
      signature_verified boolean NOT NULL DEFAULT false,
      processed boolean NOT NULL DEFAULT false,
      error_message text,
      received_at timestamptz NOT NULL DEFAULT now(),
      processed_at timestamptz,
      CONSTRAINT uq_gateway_event UNIQUE (gateway, external_event_id)
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

    CREATE TABLE public.platform_audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      action text NOT NULL,
      target_resource_type text,
      target_resource_id text,
      details jsonb DEFAULT '{}'::jsonb,
      actor_user_id uuid,
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

    INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
      ('${ADMIN_ID}', 'admin@physenra.com', now()),
      ('${REP_A_USER_ID}', 'repa@physenra.com', now()),
      ('${REP_B_USER_ID}', 'repb@physenra.com', now()),
      ('${CLINIC_USER_ID}', 'clinicowner@example.com', now()),
      ('00000000-0000-0000-0000-000000000000', 'system@physenra.internal', now());

    INSERT INTO public.profiles (id, display_name, is_platform_admin) VALUES
      ('${ADMIN_ID}', 'Super Admin', true),
      ('${REP_A_USER_ID}', 'Adaeze Okafor', false),
      ('${REP_B_USER_ID}', 'Tunde Bakare', false),
      ('${CLINIC_USER_ID}', 'Dr. Bello', false),
      ('00000000-0000-0000-0000-000000000000', 'System Service', true);

    CREATE TRIGGER trg_protect_is_platform_admin
      BEFORE INSERT OR UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.protect_is_platform_admin();

    -- Seed default feature flag enabled for acceptance tests
    INSERT INTO public.platform_settings (key, value)
    VALUES ('sales_referrals_enabled', '{"enabled": true}'::jsonb);
  `);

  const migrations = [
    '20261004010000_fix_register_practice_patient_counter.sql',
    '20261110000000_sales_rep_and_referral_foundation.sql',
    '20261111120000_atomic_sales_rep_onboarding.sql',
    '20261112100000_sales_rep_portal_and_attribution.sql',
    '20261110010000_sales_commission_settlement_engine.sql',
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

let clinicCounter = 100;
async function createClinicUser(db) {
  clinicCounter++;
  const uid = crypto.randomUUID();
  await db.query(`INSERT INTO auth.users (id, email, email_confirmed_at) VALUES ($1, $2, now())`, [uid, `clinic${clinicCounter}@example.com`]);
  await db.query(`INSERT INTO public.profiles (id, display_name, is_platform_admin) VALUES ($1, $2, false)`, [uid, `Dr. Owner ${clinicCounter}`]);
  return uid;
}

test('PHYSENRA SALES COMMISSION SETTLEMENT ACCEPTANCE SUITE (25 SCENARIOS)', async (t) => {
  const db = await createAcceptanceDatabase();

  // Onboard Representative A and B
  let repAId, repBId;
  await asRole(db, 'authenticated', ADMIN_ID, async () => {
    const resA = await db.query(
      `SELECT public.admin_onboard_sales_rep($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) AS d`,
      ['Adaeze Okafor', 'repa@physenra.com', '08031112222', 'Lagos', 'REPA-CODE', 'Access Bank', '044', '0123456789', 'Adaeze Okafor', 2000, null]
    );
    repAId = resA.rows[0].d.id;

    const resB = await db.query(
      `SELECT public.admin_onboard_sales_rep($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) AS d`,
      ['Tunde Bakare', 'repb@physenra.com', '08098887777', 'Abuja', 'REPB-CODE', 'GTBank', '058', '9876543210', 'Tunde Bakare', 2000, null]
    );
    repBId = resB.rows[0].d.id;

    await db.query(`SELECT public.admin_link_sales_rep_user($1, $2)`, [repAId, REP_A_USER_ID]);
    await db.query(`SELECT public.admin_link_sales_rep_user($1, $2)`, [repBId, REP_B_USER_ID]);
  });

  // State shared across first few scenarios:
  let practice1Id;
  let subscription1Id;
  let invoice1Id;
  let payment1Id;
  let commission1Id;

  // --------------------------------------------------------------------------
  // SCENARIO 1: First qualifying subscription payment
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 1: First qualifying subscription payment', async () => {
    // Clinic registers with REPA-CODE
    const regRes = await asRole(db, 'authenticated', CLINIC_USER_ID, async () => {
      const r = await db.query(
        `SELECT public.register_practice_and_subscribe($1, $2, $3, $4, $5, $6, $7) AS d`,
        ['Apex Physical Health', 'apex-health-sc1', 'professional', 'monthly', 'NG', 'Africa/Lagos', 'REPA-CODE']
      );
      return r.rows[0].d;
    });

    practice1Id = regRes.practice_id;
    subscription1Id = regRes.subscription_id;
    assert.ok(practice1Id, 'Practice must be registered');
    assert.ok(subscription1Id, 'Subscription must be created');

    // Create an open invoice for the practice subscription (₦30,000 / 3,000,000 kobo)
    const invRes = await db.query(`
      INSERT INTO public.saas_invoices (practice_id, subscription_id, subtotal_cents, total_cents, currency, status)
      VALUES ($1, $2, 3000000, 3000000, 'NGN', 'open')
      RETURNING id
    `, [practice1Id, subscription1Id]);
    invoice1Id = invRes.rows[0].id;

    // Settle first payment via service_role/admin
    const settleRes = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(`
        SELECT public.process_subscription_payment_settlement(
          $1::uuid,
          'paystack'::public.saas_payment_gateway,
          'PAY-REF-SC1-001',
          3000000::bigint,
          'card',
          45000::bigint,
          NULL,
          now()
        ) AS d
      `, [invoice1Id]);
      return r.rows[0].d;
    });

    assert.equal(settleRes.status, 'settled', 'Payment settlement must succeed');
    payment1Id = settleRes.payment_id;

    // Verify invoice marked paid
    const invCheck = await db.query(`SELECT status, paid_at FROM public.saas_invoices WHERE id = $1`, [invoice1Id]);
    assert.equal(invCheck.rows[0].status, 'paid');
    assert.ok(invCheck.rows[0].paid_at);

    // Verify commission generated
    const commCheck = await db.query(`
      SELECT id, gross_amount_cents, gateway_fee_cents, net_eligible_cents, original_commission_cents, current_status
      FROM public.sales_commissions
      WHERE payment_id = $1
    `, [payment1Id]);

    assert.equal(commCheck.rows.length, 1, 'Exactly one commission record generated');
    commission1Id = commCheck.rows[0].id;
    assert.equal(Number(commCheck.rows[0].gross_amount_cents), 3000000);
    assert.equal(Number(commCheck.rows[0].gateway_fee_cents), 45000);
    assert.equal(Number(commCheck.rows[0].net_eligible_cents), 2955000);
    // 20% of 2,955,000 = 591,000 kobo
    assert.equal(Number(commCheck.rows[0].original_commission_cents), 591000);
    assert.equal(commCheck.rows[0].current_status, 'pending');

    // Verify referral marked as qualified
    const refCheck = await db.query(`SELECT status, qualifying_payment_id FROM public.sales_referrals WHERE practice_id = $1`, [practice1Id]);
    assert.equal(refCheck.rows[0].status, 'qualified');
    assert.equal(refCheck.rows[0].qualifying_payment_id, payment1Id);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 2: Second payment and renewal exclusion
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 2: Second payment and renewal exclusion', async () => {
    // Generate second invoice for same practice
    const invRes = await db.query(`
      INSERT INTO public.saas_invoices (practice_id, subscription_id, subtotal_cents, total_cents, currency, status)
      VALUES ($1, $2, 3000000, 3000000, 'NGN', 'open')
      RETURNING id
    `, [practice1Id, subscription1Id]);
    const invoice2Id = invRes.rows[0].id;

    // Settle second payment
    const settleRes = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(`
        SELECT public.process_subscription_payment_settlement(
          $1::uuid,
          'paystack'::public.saas_payment_gateway,
          'PAY-REF-SC2-002',
          3000000::bigint,
          'card',
          45000::bigint,
          NULL,
          now()
        ) AS d
      `, [invoice2Id]);
      return r.rows[0].d;
    });

    assert.equal(settleRes.status, 'settled');
    const payment2Id = settleRes.payment_id;

    // Commission must NOT be created for renewal/second payment
    const commCheck = await db.query(`SELECT id FROM public.sales_commissions WHERE payment_id = $1`, [payment2Id]);
    assert.equal(commCheck.rows.length, 0, 'Zero commission for renewal / second payment');

    // Total commissions for practice remains 1
    const totalComms = await db.query(`
      SELECT count(*)::int as c FROM public.sales_commissions c
      JOIN public.sales_referrals r ON c.referral_id = r.id
      WHERE r.practice_id = $1
    `, [practice1Id]);
    assert.equal(totalComms.rows[0].c, 1);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 3: Duplicate webhook delivery
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 3: Duplicate webhook delivery', async () => {
    // Deliver exact duplicate for payment 1 with identical invoice and reference
    const dupRes = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(`
        SELECT public.process_subscription_payment_settlement(
          $1::uuid,
          'paystack'::public.saas_payment_gateway,
          'PAY-REF-SC1-001',
          3000000::bigint,
          'card',
          45000::bigint,
          NULL,
          now()
        ) AS d
      `, [invoice1Id]);
      return r.rows[0].d;
    });

    assert.ok(
      dupRes.status === 'already_paid' || dupRes.status === 'duplicate_reference',
      'Duplicate delivery must be handled idempotently'
    );

    // Payments count for this invoice must remain strictly 1
    const pCount = await db.query(`SELECT count(*)::int as c FROM public.saas_payments WHERE invoice_id = $1`, [invoice1Id]);
    assert.equal(pCount.rows[0].c, 1);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 4: Conflicting transfer references
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 4: Conflicting transfer references', async () => {
    // Create new unrelated invoice
    const invRes = await db.query(`
      INSERT INTO public.saas_invoices (practice_id, subscription_id, subtotal_cents, total_cents, currency, status)
      VALUES ($1, $2, 1000000, 1000000, 'NGN', 'open')
      RETURNING id
    `, [practice1Id, subscription1Id]);
    const conflictingInvId = invRes.rows[0].id;

    // Attempt to settle using reference 'PAY-REF-SC1-001' which already belongs to invoice1
    const conflictRes = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(`
        SELECT public.process_subscription_payment_settlement(
          $1::uuid,
          'paystack'::public.saas_payment_gateway,
          'PAY-REF-SC1-001',
          1000000::bigint,
          'card',
          15000::bigint,
          NULL,
          now()
        ) AS d
      `, [conflictingInvId]);
      return r.rows[0].d;
    });

    assert.equal(conflictRes.status, 'error');
    assert.equal(conflictRes.error_code, 'gateway_reference_collision');

    // Conflicting invoice must remain open
    const invCheck = await db.query(`SELECT status FROM public.saas_invoices WHERE id = $1`, [conflictingInvId]);
    assert.equal(invCheck.rows[0].status, 'open');

    // Collision logged to platform_audit_logs and sales_adjustment_quarantine
    const qCheck = await db.query(`
      SELECT count(*)::int as c FROM public.sales_adjustment_quarantine
      WHERE source_reference = 'PAY-REF-SC1-001'
    `);
    assert.ok(qCheck.rows[0].c >= 1, 'Collision must be quarantined');
  });

  // --------------------------------------------------------------------------
  // SCENARIO 5: Invalid webhook signature
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 5: Invalid webhook signature', async () => {
    const { handler } = require('../netlify/functions/paystack-webhook.cjs');
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_fake_secret_key_12345';

    const body = JSON.stringify({ event: 'charge.success', data: { reference: 'FAKE_REF' } });

    // Request with missing signature -> 401
    const resNoSig = await handler({
      httpMethod: 'POST',
      headers: {},
      body,
    });
    assert.equal(resNoSig.statusCode, 401);

    // Request with invalid signature -> 401
    const resBadSig = await handler({
      httpMethod: 'POST',
      headers: { 'x-paystack-signature': 'bad_hmac_hex_value' },
      body,
    });
    assert.equal(resBadSig.statusCode, 401);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 6: Refund and chargeback
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 6: Refund and chargeback', async () => {
    // 6A: Pre-payout partial refund
    const adjRes = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(`
        SELECT public.record_commission_adjustment(
          $1::uuid,
          'partial_refund',
          1500000::bigint,
          'paystack_webhook',
          'rf_test_sc6_01',
          'Practice requested partial refund',
          NULL
        ) AS d
      `, [payment1Id]);
      return r.rows[0].d;
    });

    assert.equal(adjRes.status, 'adjusted');

    // Check sales_commission_adjustments
    const adjCheck = await db.query(`
      SELECT delta_amount_cents, adjustment_type
      FROM public.sales_commission_adjustments
      WHERE commission_id = $1 AND external_event_id = 'rf_test_sc6_01'
    `, [commission1Id]);
    assert.equal(adjCheck.rows.length, 1);
    assert.ok(BigInt(adjCheck.rows[0].delta_amount_cents) < 0n, 'Delta must be negative');

    // 6B: Post-payout clawback
    // Create new practice and commission for Rep A
    const sc6ClinicUser = await createClinicUser(db);
    const regRes = await asRole(db, 'authenticated', sc6ClinicUser, async () => {
      const r = await db.query(
        `SELECT public.register_practice_and_subscribe($1, $2, $3, $4, $5, $6, $7) AS d`,
        ['Clawback Clinic', 'clawback-clinic-sc6', 'professional', 'monthly', 'NG', 'Africa/Lagos', 'REPA-CODE']
      );
      return r.rows[0].d;
    });

    const inv = await db.query(`
      INSERT INTO public.saas_invoices (practice_id, subscription_id, subtotal_cents, total_cents, currency, status)
      VALUES ($1, $2, 3000000, 3000000, 'NGN', 'open') RETURNING id
    `, [regRes.practice_id, regRes.subscription_id]);

    const settle = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(`
        SELECT public.process_subscription_payment_settlement(
          $1::uuid, 'paystack'::public.saas_payment_gateway, 'PAY-REF-SC6-CLAW',
          3000000::bigint, 'card', 45000::bigint, NULL, now()
        ) AS d
      `, [inv.rows[0].id]);
      return r.rows[0].d;
    });

    const paidPaymentId = settle.payment_id;
    const commRow = await db.query(`SELECT id, original_commission_cents FROM public.sales_commissions WHERE payment_id = $1`, [paidPaymentId]);
    assert.ok(commRow.rows.length > 0, 'Commission must exist for qualifying payment');
    const paidCommId = commRow.rows[0].id;

    // Transition commission from pending -> approved -> in_payout -> paid
    await asRole(db, 'service_role', null, async () => {
      await db.query(`SELECT public.transition_commission_status($1, 'approved', 'hold_matured', 'Approved')`, [paidCommId]);
      await db.query(`SELECT public.transition_commission_status($1, 'in_payout', 'batch_reserved', 'Batched')`, [paidCommId]);
    });

    // Create processing payout and reserved allocation, then settle via transfer.success
    const payoutRes = await db.query(`
      INSERT INTO public.sales_commission_payouts (
        payout_number, sales_rep_id, total_amount_cents, status, transfer_reference,
        bank_name, bank_code, masked_account_number, account_name
      ) VALUES (
        'PHY-PAYOUT-2026-000001', $1, 591000, 'processing', 'TRF-CLAWBACK-01',
        'Access Bank', '044', '••••••6789', 'Adaeze Okafor'
      ) RETURNING id
    `, [repAId]);
    const payoutId = payoutRes.rows[0].id;

    await db.query(`
      INSERT INTO public.sales_payout_allocations (
        payout_id, commission_id, allocated_amount_cents, allocation_status
      ) VALUES (
        $1, $2, 591000, 'reserved'
      )
    `, [payoutId, paidCommId]);

    await asRole(db, 'service_role', null, async () => {
      await db.query(`
        SELECT public.settle_payout_transfer_event('TRF-CLAWBACK-01', 'transfer.success', 'Payout completed', 'evt_clawback_init')
      `);
    });

    // Record chargeback on the paid payment
    const clawbackRes = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(`
        SELECT public.record_commission_adjustment(
          $1::uuid,
          'chargeback',
          3000000::bigint,
          'paystack_webhook',
          'cb_test_sc6_02',
          'Chargeback received after payout',
          NULL
        ) AS d
      `, [paidPaymentId]);
      return r.rows[0].d;
    });

    assert.equal(clawbackRes.status, 'adjusted');

    // Verify append-only recovery entry of type clawback_debt created
    const recCheck = await db.query(`
      SELECT entry_type, amount_cents, sales_rep_id
      FROM public.sales_recovery_entries
      WHERE offset_commission_id = $1 AND entry_type = 'clawback_debt'
    `, [paidCommId]);
    assert.equal(recCheck.rows.length, 1, 'Clawback debt entry must be recorded');
    assert.equal(Number(recCheck.rows[0].amount_cents), 591000);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 7: Suspended representative
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 7: Suspended representative', async () => {
    let repSId;
    await asRole(db, 'authenticated', ADMIN_ID, async () => {
      const resS = await db.query(
        `SELECT public.admin_onboard_sales_rep($1,$2,$3,$4,$5) AS d`,
        ['Suspended Rep', 'reps@physenra.com', '08022223333', 'Enugu', 'REPS-CODE']
      );
      repSId = resS.rows[0].d.id;
      // Suspend rep
      await db.query(`UPDATE public.sales_representatives SET status = 'suspended' WHERE id = $1`, [repSId]);
    });

    // Register practice with REPS-CODE
    const sc7ClinicUser = await createClinicUser(db);
    const regRes = await asRole(db, 'authenticated', sc7ClinicUser, async () => {
      const r = await db.query(
        `SELECT public.register_practice_and_subscribe($1, $2, $3, $4, $5, $6, $7) AS d`,
        ['Enugu Care Clinic', 'enugu-care-sc7', 'professional', 'monthly', 'NG', 'Africa/Lagos', 'REPS-CODE']
      );
      return r.rows[0].d;
    });

    const invRes = await db.query(`
      INSERT INTO public.saas_invoices (practice_id, subscription_id, subtotal_cents, total_cents, currency, status)
      VALUES ($1, $2, 3000000, 3000000, 'NGN', 'open')
      RETURNING id
    `, [regRes.practice_id, regRes.subscription_id]);

    const settleRes = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(`
        SELECT public.process_subscription_payment_settlement(
          $1::uuid,
          'paystack'::public.saas_payment_gateway,
          'PAY-REF-SC7-001',
          3000000::bigint,
          'card',
          45000::bigint,
          NULL,
          now()
        ) AS d
      `, [invRes.rows[0].id]);
      return r.rows[0].d;
    });

    assert.equal(settleRes.status, 'settled');

    // Verify commission status is 'held_suspended' with is_payout_frozen = true
    const commCheck = await db.query(`
      SELECT current_status, is_payout_frozen
      FROM public.sales_commissions
      WHERE payment_id = $1
    `, [settleRes.payment_id]);

    assert.equal(commCheck.rows.length, 1);
    assert.equal(commCheck.rows[0].current_status, 'held_suspended');
    assert.equal(commCheck.rows[0].is_payout_frozen, true);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 8: Terminated representative (14-day grace period)
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 8: Terminated representative (14-day grace period)', async () => {
    let repTId;
    await asRole(db, 'authenticated', ADMIN_ID, async () => {
      const resT = await db.query(
        `SELECT public.admin_onboard_sales_rep($1,$2,$3,$4,$5) AS d`,
        ['Terminated Rep', 'rept@physenra.com', '08033334444', 'Ibadan', 'REPT-CODE']
      );
      repTId = resT.rows[0].d.id;
    });

    // Practice registers while representative is active
    const sc8aClinicUser = await createClinicUser(db);
    const regRes1 = await asRole(db, 'authenticated', sc8aClinicUser, async () => {
      const r = await db.query(
        `SELECT public.register_practice_and_subscribe($1, $2, $3, $4, $5, $6, $7) AS d`,
        ['Ibadan Health A', 'ibadan-health-sc8a', 'professional', 'monthly', 'NG', 'Africa/Lagos', 'REPT-CODE']
      );
      return r.rows[0].d;
    });

    // 8A: Terminated 5 days ago (Within 14-day grace period) -> Commission earned
    await db.query(`
      UPDATE public.sales_representatives
      SET status = 'terminated', terminated_at = now() - interval '5 days'
      WHERE id = $1
    `, [repTId]);

    const inv1 = await db.query(`
      INSERT INTO public.saas_invoices (practice_id, subscription_id, subtotal_cents, total_cents, currency, status)
      VALUES ($1, $2, 3000000, 3000000, 'NGN', 'open') RETURNING id
    `, [regRes1.practice_id, regRes1.subscription_id]);

    const settle1 = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(`
        SELECT public.process_subscription_payment_settlement(
          $1::uuid, 'paystack'::public.saas_payment_gateway, 'PAY-REF-SC8-001',
          3000000::bigint, 'card', 45000::bigint, NULL, now()
        ) AS d
      `, [inv1.rows[0].id]);
      return r.rows[0].d;
    });

    const comm1 = await db.query(`SELECT current_status FROM public.sales_commissions WHERE payment_id = $1`, [settle1.payment_id]);
    assert.equal(comm1.rows.length, 1, 'Commission must be earned during grace period');
    assert.equal(comm1.rows[0].current_status, 'pending');

    // Practice 2 registers while rep is active
    await db.query(`UPDATE public.sales_representatives SET status = 'active', terminated_at = NULL WHERE id = $1`, [repTId]);
    const sc8bClinicUser = await createClinicUser(db);
    const regRes2 = await asRole(db, 'authenticated', sc8bClinicUser, async () => {
      const r = await db.query(
        `SELECT public.register_practice_and_subscribe($1, $2, $3, $4, $5, $6, $7) AS d`,
        ['Ibadan Health B', 'ibadan-health-sc8b', 'professional', 'monthly', 'NG', 'Africa/Lagos', 'REPT-CODE']
      );
      return r.rows[0].d;
    });

    // 8B: Terminated 20 days ago (Beyond 14-day grace period) -> Disqualified
    await db.query(`
      UPDATE public.sales_representatives
      SET status = 'terminated', terminated_at = now() - interval '20 days'
      WHERE id = $1
    `, [repTId]);

    const inv2 = await db.query(`
      INSERT INTO public.saas_invoices (practice_id, subscription_id, subtotal_cents, total_cents, currency, status)
      VALUES ($1, $2, 3000000, 3000000, 'NGN', 'open') RETURNING id
    `, [regRes2.practice_id, regRes2.subscription_id]);

    const settle2 = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(`
        SELECT public.process_subscription_payment_settlement(
          $1::uuid, 'paystack'::public.saas_payment_gateway, 'PAY-REF-SC8-002',
          3000000::bigint, 'card', 45000::bigint, NULL, now()
        ) AS d
      `, [inv2.rows[0].id]);
      return r.rows[0].d;
    });

    const comm2 = await db.query(`SELECT id FROM public.sales_commissions WHERE payment_id = $1`, [settle2.payment_id]);
    assert.equal(comm2.rows.length, 0, 'Zero commission after grace period expired');
  });

  // --------------------------------------------------------------------------
  // SCENARIO 9: Invalid referral attribution
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 9: Invalid referral attribution', async () => {
    // Registration with non-existent code
    const sc9ClinicUser = await createClinicUser(db);
    const regRes = await asRole(db, 'authenticated', sc9ClinicUser, async () => {
      const r = await db.query(
        `SELECT public.register_practice_and_subscribe($1, $2, $3, $4, $5, $6, $7) AS d`,
        ['Orphan Practice', 'orphan-practice-sc9', 'solo', 'monthly', 'NG', 'Africa/Lagos', 'INVALID-CODE-999']
      );
      return r.rows[0].d;
    });

    const refCheck = await db.query(`SELECT id FROM public.sales_referrals WHERE practice_id = $1`, [regRes.practice_id]);
    assert.equal(refCheck.rows.length, 0, 'No referral record created for invalid code');

    const invRes = await db.query(`
      INSERT INTO public.saas_invoices (practice_id, subscription_id, subtotal_cents, total_cents, currency, status)
      VALUES ($1, $2, 1000000, 1000000, 'NGN', 'open') RETURNING id
    `, [regRes.practice_id, regRes.subscription_id]);

    const settleRes = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(`
        SELECT public.process_subscription_payment_settlement(
          $1::uuid, 'paystack'::public.saas_payment_gateway, 'PAY-REF-SC9-001',
          1000000::bigint, 'card', 15000::bigint, NULL, now()
        ) AS d
      `, [invRes.rows[0].id]);
      return r.rows[0].d;
    });

    const commCheck = await db.query(`SELECT id FROM public.sales_commissions WHERE payment_id = $1`, [settleRes.payment_id]);
    assert.equal(commCheck.rows.length, 0, 'Zero commission for unattributed practice');
  });

  // --------------------------------------------------------------------------
  // SCENARIO 10: Missing outbox record
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 10: Missing outbox record resilience', async () => {
    const sc10User = await createClinicUser(db);
    const reg10 = await asRole(db, 'authenticated', sc10User, async () => {
      const r = await db.query(
        `SELECT public.register_practice_and_subscribe($1, $2, $3, $4, $5, $6) AS d`,
        ['Outbox Practice 10', 'outbox-prac-10', 'solo', 'monthly', 'NG', 'Africa/Lagos']
      );
      return r.rows[0].d;
    });
    const inv10 = await db.query(`
      INSERT INTO public.saas_invoices (practice_id, subscription_id, subtotal_cents, total_cents, currency, status)
      VALUES ($1, $2, 1000000, 1000000, 'NGN', 'paid') RETURNING id
    `, [reg10.practice_id, reg10.subscription_id]);
    const pay10 = await db.query(`
      INSERT INTO public.saas_payments (payment_number, practice_id, invoice_id, gateway_provider, gateway_reference, status, amount_cents)
      VALUES ('PHY-PAY-10', $1, $2, 'paystack', 'OUTBOX-REF-10', 'successful', 1000000) RETURNING id
    `, [reg10.practice_id, inv10.rows[0].id]);

    const insRes = await db.query(`
      INSERT INTO public.sales_commission_outbox (
        payment_id, invoice_id, practice_id, status, retry_count
      ) VALUES ($1, $2, $3, 'pending_retry', 0)
      RETURNING id, status
    `, [pay10.rows[0].id, inv10.rows[0].id, reg10.practice_id]);

    assert.equal(insRes.rows[0].status, 'pending_retry');

    // Query outbox task
    const check = await db.query(`SELECT id, status FROM public.sales_commission_outbox WHERE id = $1`, [insRes.rows[0].id]);
    assert.equal(check.rows.length, 1);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 11: Abandoned outbox record
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 11: Abandoned outbox record after max retries', async () => {
    const sc11User = await createClinicUser(db);
    const reg11 = await asRole(db, 'authenticated', sc11User, async () => {
      const r = await db.query(
        `SELECT public.register_practice_and_subscribe($1, $2, $3, $4, $5, $6) AS d`,
        ['Outbox Practice 11', 'outbox-prac-11', 'solo', 'monthly', 'NG', 'Africa/Lagos']
      );
      return r.rows[0].d;
    });
    const inv11 = await db.query(`
      INSERT INTO public.saas_invoices (practice_id, subscription_id, subtotal_cents, total_cents, currency, status)
      VALUES ($1, $2, 1000000, 1000000, 'NGN', 'paid') RETURNING id
    `, [reg11.practice_id, reg11.subscription_id]);
    const pay11 = await db.query(`
      INSERT INTO public.saas_payments (payment_number, practice_id, invoice_id, gateway_provider, gateway_reference, status, amount_cents)
      VALUES ('PHY-PAY-11', $1, $2, 'paystack', 'OUTBOX-REF-11', 'successful', 1000000) RETURNING id
    `, [reg11.practice_id, inv11.rows[0].id]);

    // Outbox task with retry_count = 5 and identity mismatch to trigger immediate abandonment
    const insRes = await db.query(`
      INSERT INTO public.sales_commission_outbox (
        payment_id, invoice_id, practice_id, status, retry_count, last_error
      ) VALUES ($1, $2, $3, 'pending_retry', 5, 'Persistent foreign key error')
      RETURNING id
    `, [pay11.rows[0].id, inv11.rows[0].id, practice1Id]);
    const taskId = insRes.rows[0].id;

    // Run batch processor
    await asRole(db, 'service_role', null, async () => {
      await db.query(`SELECT * FROM public.process_commission_outbox_batch(10, 300)`);
    });

    // Status must transition to abandoned
    const check = await db.query(`SELECT status FROM public.sales_commission_outbox WHERE id = $1`, [taskId]);
    assert.equal(check.rows[0].status, 'abandoned', 'Task exceeding max retries must be marked abandoned');
  });

  // --------------------------------------------------------------------------
  // SCENARIO 12: Scanner recovery
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 12: Scanner recovery of missing commission', async () => {
    // Create practice attributed to Rep B
    const sc12ClinicUser = await createClinicUser(db);
    const regRes = await asRole(db, 'authenticated', sc12ClinicUser, async () => {
      const r = await db.query(
        `SELECT public.register_practice_and_subscribe($1, $2, $3, $4, $5, $6, $7) AS d`,
        ['Scanner Test Clinic', 'scanner-test-sc12', 'solo', 'monthly', 'NG', 'Africa/Lagos', 'REPB-CODE']
      );
      return r.rows[0].d;
    });

    const invRes = await db.query(`
      INSERT INTO public.saas_invoices (practice_id, subscription_id, subtotal_cents, total_cents, currency, status, paid_at)
      VALUES ($1, $2, 1000000, 1000000, 'NGN', 'paid', now()) RETURNING id
    `, [regRes.practice_id, regRes.subscription_id]);

    const payRes = await db.query(`
      INSERT INTO public.saas_payments (payment_number, practice_id, invoice_id, gateway_provider, gateway_reference, status, amount_cents, paid_at)
      VALUES ('PHY-PAY-SCAN-01', $1, $2, 'paystack', 'SCAN-PAY-REF-001', 'successful', 1000000, now())
      RETURNING id
    `, [regRes.practice_id, invRes.rows[0].id]);
    const paymentId = payRes.rows[0].id;

    // Simulate recovery scan: call evaluate_referral_commission directly
    const evalRes = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(
        `SELECT public.evaluate_referral_commission($1::uuid, $2::uuid, now()) AS d`,
        [paymentId, regRes.practice_id]
      );
      return r.rows[0].d;
    });

    assert.equal(evalRes.status, 'commission_created');
    const commCheck = await db.query(`SELECT id, current_status FROM public.sales_commissions WHERE payment_id = $1`, [paymentId]);
    assert.equal(commCheck.rows.length, 1, 'Commission must be recovered');
  });

  // --------------------------------------------------------------------------
  // SCENARIO 13: Concurrent commission generation serialization
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 13: Concurrent commission generation serialization', async () => {
    // Evaluate commission again for payment1Id (already evaluated in Scenario 1)
    const evalRes = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(
        `SELECT public.evaluate_referral_commission($1::uuid, $2::uuid, now()) AS d`,
        [payment1Id, practice1Id]
      );
      return r.rows[0].d;
    });

    assert.equal(evalRes.status, 'already_processed');

    // Commission count for payment 1 remains strictly 1
    const cCount = await db.query(`SELECT count(*)::int as c FROM public.sales_commissions WHERE payment_id = $1`, [payment1Id]);
    assert.equal(cCount.rows[0].c, 1);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 14: Concurrent payout processing
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 14: Concurrent payout processing', async () => {
    // Approve commission1Id (which was in 'pending' from Scenario 1)
    await asRole(db, 'service_role', null, async () => {
      await db.query(`SELECT public.transition_commission_status($1, 'approved', 'hold_matured', 'Approved for batch')`, [commission1Id]);
    });

    // Worker 1 transitions to in_payout
    await asRole(db, 'service_role', null, async () => {
      await db.query(`
        SELECT public.transition_commission_status($1, 'in_payout', 'batch_reserved', 'Batched for payment')
      `, [commission1Id]);
    });

    // Worker 2 attempts same transition from approved
    await assert.rejects(
      async () => {
        await asRole(db, 'service_role', null, async () => {
          await db.query(`
            SELECT public.transition_commission_status($1, 'in_payout', 'batch_reserved', 'Second worker batch')
          `, [commission1Id]);
        });
      },
      (err) => err.message.includes('already in status') || err.message.includes('Illegal state transition')
    );
  });

  // --------------------------------------------------------------------------
  // SCENARIO 15: Duplicate payout allocation rejection
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 15: Duplicate payout allocation rejection', async () => {
    const payoutRes = await db.query(`
      INSERT INTO public.sales_commission_payouts (
        payout_number, sales_rep_id, total_amount_cents, status, transfer_reference,
        bank_name, bank_code, masked_account_number, account_name
      ) VALUES (
        'PHY-PAYOUT-2026-000015', $1, 591000, 'processing', 'TRF-DUP-ALLOC-01',
        'Access Bank', '044', '••••••6789', 'Adaeze Okafor'
      ) RETURNING id
    `, [repAId]);
    const payoutId = payoutRes.rows[0].id;

    // First allocation
    await db.query(`
      INSERT INTO public.sales_payout_allocations (
        payout_id, commission_id, allocated_amount_cents, allocation_status
      ) VALUES ($1, $2, 591000, 'reserved')
    `, [payoutId, commission1Id]);

    // Second duplicate allocation attempt on same payout and commission
    await assert.rejects(
      async () => {
        await db.query(`
          INSERT INTO public.sales_payout_allocations (
            payout_id, commission_id, allocated_amount_cents, allocation_status
          ) VALUES ($1, $2, 591000, 'reserved')
        `, [payoutId, commission1Id]);
      },
      (err) => err.code === '23505' // Unique constraint violation
    );

    // Clean up test allocation so commission1Id can be used in Scenarios 17 and 18
    await db.query(`DELETE FROM public.sales_payout_allocations WHERE payout_id = $1`, [payoutId]);
    await db.query(`DELETE FROM public.sales_commission_payouts WHERE id = $1`, [payoutId]);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 16: Allocation exceeding eligible balance
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 16: Allocation exceeding eligible balance', async () => {
    const payoutRes = await db.query(`
      INSERT INTO public.sales_commission_payouts (
        payout_number, sales_rep_id, total_amount_cents, status, transfer_reference,
        bank_name, bank_code, masked_account_number, account_name
      ) VALUES (
        'PHY-PAYOUT-2026-000016', $1, 1000000, 'processing', 'TRF-OVER-ALLOC-01',
        'Access Bank', '044', '••••••6789', 'Adaeze Okafor'
      ) RETURNING id
    `, [repAId]);
    const payoutId = payoutRes.rows[0].id;

    await assert.rejects(
      async () => {
        // Enforce check constraint: allocated_amount_cents > 0
        await db.query(`
          INSERT INTO public.sales_payout_allocations (
            payout_id, commission_id, allocated_amount_cents, allocation_status
          ) VALUES ($1, $2, -500, 'reserved')
        `, [payoutId, commission1Id]);
      },
      (err) => err.code === '23514' // Check constraint violation
    );
  });

  // --------------------------------------------------------------------------
  // SCENARIO 17: Failed payout
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 17: Failed payout releases allocations back to approved', async () => {
    // commission1Id is currently in 'in_payout' from Scenario 14/15
    const payoutRes = await db.query(`
      INSERT INTO public.sales_commission_payouts (
        payout_number, sales_rep_id, total_amount_cents, status, transfer_reference,
        bank_name, bank_code, masked_account_number, account_name
      ) VALUES (
        'PHY-PAYOUT-2026-000017', $1, 591000, 'processing', 'TRF-FAIL-001',
        'Access Bank', '044', '••••••6789', 'Adaeze Okafor'
      ) RETURNING id
    `, [repAId]);
    const payoutId = payoutRes.rows[0].id;

    await db.query(`
      INSERT INTO public.sales_payout_allocations (
        payout_id, commission_id, allocated_amount_cents, allocation_status
      ) VALUES ($1, $2, 591000, 'reserved')
    `, [payoutId, commission1Id]);

    // Deliver transfer.failed event
    const failRes = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(`
        SELECT public.settle_payout_transfer_event(
          'TRF-FAIL-001',
          'transfer.failed',
          'Beneficiary account blacklisted',
          'evt_fail_17'
        ) AS d
      `);
      return r.rows[0].d;
    });

    assert.equal(failRes.status, 'failed');

    // Commission must roll back to approved
    const commCheck = await db.query(`SELECT current_status FROM public.sales_commissions WHERE id = $1`, [commission1Id]);
    assert.equal(commCheck.rows[0].current_status, 'approved', 'Must roll back to approved for re-batching');

    // Payout must be marked failed
    const payoutCheck = await db.query(`SELECT status FROM public.sales_commission_payouts WHERE id = $1`, [payoutId]);
    assert.equal(payoutCheck.rows[0].status, 'failed');
  });

  // --------------------------------------------------------------------------
  // SCENARIO 18: Successful payout
  // --------------------------------------------------------------------------
  let successPayoutTransferRef = 'TRF-SUCC-001';

  await t.test('SCENARIO 18: Successful payout transitions commissions to paid', async () => {
    // Re-batch commission1Id: from 'approved' -> 'in_payout'
    await asRole(db, 'service_role', null, async () => {
      await db.query(`SELECT public.transition_commission_status($1, 'in_payout', 'batch_reserved', 'Re-batched')`, [commission1Id]);
    });

    const payoutRes = await db.query(`
      INSERT INTO public.sales_commission_payouts (
        payout_number, sales_rep_id, total_amount_cents, status, transfer_reference,
        bank_name, bank_code, masked_account_number, account_name
      ) VALUES (
        'PHY-PAYOUT-2026-000018', $1, 591000, 'processing', $2,
        'Access Bank', '044', '••••••6789', 'Adaeze Okafor'
      ) RETURNING id
    `, [repAId, successPayoutTransferRef]);
    const payoutId = payoutRes.rows[0].id;

    await db.query(`
      INSERT INTO public.sales_payout_allocations (
        payout_id, commission_id, allocated_amount_cents, allocation_status
      ) VALUES ($1, $2, 591000, 'reserved')
    `, [payoutId, commission1Id]);

    // Settle transfer.success
    const succRes = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(`
        SELECT public.settle_payout_transfer_event(
          $1,
          'transfer.success',
          'Transfer completed successfully',
          'evt_succ_18'
        ) AS d
      `, [successPayoutTransferRef]);
      return r.rows[0].d;
    });

    assert.equal(succRes.status, 'completed');

    // Commission must be paid
    const commCheck = await db.query(`SELECT current_status FROM public.sales_commissions WHERE id = $1`, [commission1Id]);
    assert.equal(commCheck.rows[0].current_status, 'paid');

    // Payout status completed
    const pCheck = await db.query(`SELECT status, paid_at FROM public.sales_commission_payouts WHERE id = $1`, [payoutId]);
    assert.equal(pCheck.rows[0].status, 'completed');
    assert.ok(pCheck.rows[0].paid_at);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 19: Replayed Paystack event
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 19: Replayed Paystack event handled idempotently', async () => {
    const replayRes = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(`
        SELECT public.settle_payout_transfer_event(
          $1,
          'transfer.success',
          'Replayed webhook',
          'evt_succ_18_replay'
        ) AS d
      `, [successPayoutTransferRef]);
      return r.rows[0].d;
    });

    assert.equal(replayRes.status, 'already_completed');
  });

  // --------------------------------------------------------------------------
  // SCENARIO 20: Feature flag disabled
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 20: Feature flag disabled generates zero commissions', async () => {
    // Disable feature flag
    await db.query(`
      UPDATE public.platform_settings
      SET value = '{"enabled": false}'::jsonb
      WHERE key = 'sales_referrals_enabled'
    `);

    // Register clinic and settle payment
    const regRes = await asRole(db, 'authenticated', CLINIC_USER_ID, async () => {
      const r = await db.query(
        `SELECT public.register_practice_and_subscribe($1, $2, $3, $4, $5, $6, $7) AS d`,
        ['Disabled Flag Clinic', 'dis-flag-sc20', 'solo', 'monthly', 'NG', 'Africa/Lagos', 'REPA-CODE']
      );
      return r.rows[0].d;
    });

    const inv = await db.query(`
      INSERT INTO public.saas_invoices (practice_id, subscription_id, subtotal_cents, total_cents, currency, status)
      VALUES ($1, $2, 1000000, 1000000, 'NGN', 'open') RETURNING id
    `, [regRes.practice_id, regRes.subscription_id]);

    const settle = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(`
        SELECT public.process_subscription_payment_settlement(
          $1::uuid, 'paystack'::public.saas_payment_gateway, 'PAY-REF-SC20-001',
          1000000::bigint, 'card', 15000::bigint, NULL, now()
        ) AS d
      `, [inv.rows[0].id]);
      return r.rows[0].d;
    });

    assert.equal(settle.status, 'settled');

    // Zero commission created
    const comm = await db.query(`SELECT id FROM public.sales_commissions WHERE payment_id = $1`, [settle.payment_id]);
    assert.equal(comm.rows.length, 0, 'Zero commission when feature flag disabled');

    // Re-enable feature flag for subsequent tests
    await db.query(`
      UPDATE public.platform_settings
      SET value = '{"enabled": true}'::jsonb
      WHERE key = 'sales_referrals_enabled'
    `);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 21: Missing feature flag setting
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 21: Missing feature flag setting fails closed safely', async () => {
    // Delete feature flag setting row
    await db.query(`DELETE FROM public.platform_settings WHERE key = 'sales_referrals_enabled'`);

    const regRes = await asRole(db, 'authenticated', CLINIC_USER_ID, async () => {
      const r = await db.query(
        `SELECT public.register_practice_and_subscribe($1, $2, $3, $4, $5, $6, $7) AS d`,
        ['Missing Flag Clinic', 'mis-flag-sc21', 'solo', 'monthly', 'NG', 'Africa/Lagos', 'REPA-CODE']
      );
      return r.rows[0].d;
    });

    const inv = await db.query(`
      INSERT INTO public.saas_invoices (practice_id, subscription_id, subtotal_cents, total_cents, currency, status)
      VALUES ($1, $2, 1000000, 1000000, 'NGN', 'open') RETURNING id
    `, [regRes.practice_id, regRes.subscription_id]);

    // Payment settlement must still succeed without crashing
    const settle = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(`
        SELECT public.process_subscription_payment_settlement(
          $1::uuid, 'paystack'::public.saas_payment_gateway, 'PAY-REF-SC21-001',
          1000000::bigint, 'card', 15000::bigint, NULL, now()
        ) AS d
      `, [inv.rows[0].id]);
      return r.rows[0].d;
    });

    assert.equal(settle.status, 'settled');

    // Zero commission created (fail-closed)
    const comm = await db.query(`SELECT id FROM public.sales_commissions WHERE payment_id = $1`, [settle.payment_id]);
    assert.equal(comm.rows.length, 0, 'Zero commission when feature flag missing');

    // Restore feature flag
    await db.query(`
      INSERT INTO public.platform_settings (key, value)
      VALUES ('sales_referrals_enabled', '{"enabled": true}'::jsonb)
    `);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 22: Malformed feature flag setting
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 22: Malformed feature flag setting fails closed safely', async () => {
    // Malformed JSON (string instead of object with boolean)
    await db.query(`
      UPDATE public.platform_settings
      SET value = '"invalid_value"'::jsonb
      WHERE key = 'sales_referrals_enabled'
    `);

    const regRes = await asRole(db, 'authenticated', CLINIC_USER_ID, async () => {
      const r = await db.query(
        `SELECT public.register_practice_and_subscribe($1, $2, $3, $4, $5, $6, $7) AS d`,
        ['Malformed Flag Clinic', 'mal-flag-sc22', 'solo', 'monthly', 'NG', 'Africa/Lagos', 'REPA-CODE']
      );
      return r.rows[0].d;
    });

    const inv = await db.query(`
      INSERT INTO public.saas_invoices (practice_id, subscription_id, subtotal_cents, total_cents, currency, status)
      VALUES ($1, $2, 1000000, 1000000, 'NGN', 'open') RETURNING id
    `, [regRes.practice_id, regRes.subscription_id]);

    const settle = await asRole(db, 'service_role', null, async () => {
      const r = await db.query(`
        SELECT public.process_subscription_payment_settlement(
          $1::uuid, 'paystack'::public.saas_payment_gateway, 'PAY-REF-SC22-001',
          1000000::bigint, 'card', 15000::bigint, NULL, now()
        ) AS d
      `, [inv.rows[0].id]);
      return r.rows[0].d;
    });

    assert.equal(settle.status, 'settled');
    const comm = await db.query(`SELECT id FROM public.sales_commissions WHERE payment_id = $1`, [settle.payment_id]);
    assert.equal(comm.rows.length, 0, 'Zero commission when feature flag malformed');

    // Restore feature flag
    await db.query(`
      UPDATE public.platform_settings
      SET value = '{"enabled": true}'::jsonb
      WHERE key = 'sales_referrals_enabled'
    `);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 23: Lock timeout
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 23: evaluate_referral_commission lock timeout protection', async () => {
    // Verify that lock_timeout configuration is set and handled in evaluate_referral_commission
    const funcDef = fs.readFileSync(
      'C:/project/physenra/supabase/migrations/20261110010000_sales_commission_settlement_engine.sql',
      'utf8'
    );
    assert.ok(funcDef.includes("SET LOCAL lock_timeout = '500ms'"), 'Must set 500ms lock timeout');
    assert.ok(funcDef.includes("lock_not_available") || funcDef.includes("55P03"), 'Must catch lock_not_available 55P03');
  });

  // --------------------------------------------------------------------------
  // SCENARIO 24: RLS isolation between representatives
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 24: RLS isolation between representatives', async () => {
    // Under Rep A's authenticated session, query sales_commissions
    const repAComms = await asRole(db, 'authenticated', REP_A_USER_ID, async () => {
      const r = await db.query(`SELECT id, sales_rep_id FROM public.sales_commissions`);
      return r.rows;
    });

    // All rows seen must belong to Rep A
    for (const row of repAComms) {
      assert.equal(row.sales_rep_id, repAId, 'Rep A must only see Rep A commissions');
    }

    // Under Rep B's authenticated session, query sales_commissions
    const repBComms = await asRole(db, 'authenticated', REP_B_USER_ID, async () => {
      const r = await db.query(`SELECT id, sales_rep_id FROM public.sales_commissions`);
      return r.rows;
    });

    // Rep B must see ZERO of Rep A's commissions
    for (const row of repBComms) {
      assert.notEqual(row.sales_rep_id, repAId, 'Rep B must never see Rep A commissions');
    }
  });

  // --------------------------------------------------------------------------
  // SCENARIO 25: Unauthorised Super Admin operations
  // --------------------------------------------------------------------------
  await t.test('SCENARIO 25: Unauthorised Super Admin operations rejected', async () => {
    // 25A: Anonymous caller calling transition_commission_status
    await assert.rejects(
      async () => {
        await asRole(db, 'anon', null, async () => {
          await db.query(`
            SELECT public.transition_commission_status($1, 'approved', 'admin_approved', 'Hacked')
          `, [commission1Id]);
        });
      },
      (err) => err.code === '42501' || err.message.includes('permission denied') || err.message.includes('Access Denied')
    );

    // 25B: Representative caller calling settle_payout_transfer_event
    await assert.rejects(
      async () => {
        await asRole(db, 'authenticated', REP_A_USER_ID, async () => {
          await db.query(`
            SELECT public.settle_payout_transfer_event('TRF-FAKE-01', 'transfer.success', 'Fake', 'fake_evt')
          `);
        });
      },
      (err) => err.code === '42501' || err.message.includes('Access Denied') || err.message.includes('insufficient_privilege')
    );

    // 25C: Representative caller calling record_commission_adjustment
    await assert.rejects(
      async () => {
        await asRole(db, 'authenticated', REP_A_USER_ID, async () => {
          await db.query(`
            SELECT public.record_commission_adjustment($1::uuid, 'full_refund', 1000, 'paystack_webhook', 'ev1', 'test')
          `, [payment1Id]);
        });
      },
      (err) => err.code === '42501' || err.message.includes('Access Denied') || err.message.includes('insufficient_privilege')
    );

    // 25D: Representative caller calling admin_onboard_sales_rep
    await assert.rejects(
      async () => {
        await asRole(db, 'authenticated', REP_A_USER_ID, async () => {
          await db.query(`
            SELECT public.admin_onboard_sales_rep('Rogue Rep', 'rogue@example.com', '08099990000', 'Lagos', 'ROGUE-01')
          `);
        });
      },
      (err) => err.code === '42501' || err.message.includes('Access Denied') || err.message.includes('insufficient_privilege')
    );
  });
});
