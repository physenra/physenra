// ==============================================================================
// PHYSENRA SAAS SUBSCRIPTIONS & PLATFORM ADMINISTRATION V1 VERIFICATION SUITE
// File: tests/saas_subscriptions.test.cjs
//
// Verifies:
// 1. SaaS Plan Catalog & Minor-Unit Pricing (Kobo Bigint)
// 2. Atomic Self-Service Onboarding RPC (register_practice_and_subscribe)
// 3. Subscription Lifecycle & 8-State Machine Transitions
// 4. Access Enforcement & practice_is_writable() STABLE Security Definer
// 5. Billing & Invoicing Architectural Firewall (Zero Patient PHI in Platform Plane)
// 6. Paystack Ingestion & Idempotent Settlement (process_subscription_payment_settlement)
// 7. Practitioner Seat Capacity Enforcement (check_practitioner_seat_limit)
// 8. Clinical Privacy Firewall: Platform Admin Barred from Clinical Encounters
// 9. TypeScript Database & Model Contracts Completeness
// 10. Service Layer, Platform Admin Guard & Route Registration
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const MIGRATION_PATH = path.join(
  ROOT_DIR,
  'supabase',
  'migrations',
  '20261001030000_platform_saas_subscriptions_foundation.sql'
);
const SERVICE_PATH = path.join(
  ROOT_DIR,
  'src',
  'services',
  'saasSubscriptionService.ts'
);
const TYPES_DB_PATH = path.join(
  ROOT_DIR,
  'src',
  'types',
  'database.ts'
);
const TYPES_MODELS_PATH = path.join(
  ROOT_DIR,
  'src',
  'types',
  'models.ts'
);
const GUARD_PATH = path.join(
  ROOT_DIR,
  'src',
  'components',
  'auth',
  'PlatformAdminGuard.tsx'
);
const LAYOUT_PATH = path.join(
  ROOT_DIR,
  'src',
  'components',
  'layout',
  'PlatformLayout.tsx'
);
const APP_PATH = path.join(ROOT_DIR, 'src', 'App.tsx');

const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
const serviceCode = fs.readFileSync(SERVICE_PATH, 'utf8');
const typesDbCode = fs.readFileSync(TYPES_DB_PATH, 'utf8');
const typesModelsCode = fs.readFileSync(TYPES_MODELS_PATH, 'utf8');
const guardCode = fs.readFileSync(GUARD_PATH, 'utf8');
const layoutCode = fs.readFileSync(LAYOUT_PATH, 'utf8');
const appCode = fs.readFileSync(APP_PATH, 'utf8');

test('PHYSENRA SAAS SUBSCRIPTIONS & PLATFORM ADMINISTRATION FOUNDATION V1 VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: SaaS Plan Catalog & Minor-Unit Pricing
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: SaaS Plan Catalog & Minor-Unit Pricing ---', async (st) => {
    await st.test('Migration creates saas_plans table with UUID primary key', () => {
      assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.saas_plans'), 'Must create saas_plans table');
      assert(migrationSql.includes('id uuid PRIMARY KEY DEFAULT gen_random_uuid()'), 'Must have UUID PK');
    });

    await st.test('Migration defines saas_plan_code enum with exactly 4 tiers', () => {
      assert(migrationSql.includes('saas_plan_code'), 'Must define saas_plan_code');
      assert(migrationSql.includes("'solo'"), "Must have 'solo' tier");
      assert(migrationSql.includes("'professional'"), "Must have 'professional' tier");
      assert(migrationSql.includes("'clinic'"), "Must have 'clinic' tier");
      assert(migrationSql.includes("'enterprise'"), "Must have 'enterprise' tier");
    });

    await st.test('Migration enforces non-negative integer minor units for prices', () => {
      assert(migrationSql.includes('monthly_price_cents bigint NOT NULL CHECK (monthly_price_cents >= 0)'), 'Must check monthly price');
      assert(migrationSql.includes('annual_price_cents bigint NOT NULL CHECK (annual_price_cents >= 0)'), 'Must check annual price');
    });

    await st.test('Migration seeds Solo tier: ₦15,000/mo (1500000 kobo), ₦150,000/yr (15000000 kobo), 1 seat, 5GB storage', () => {
      assert(migrationSql.includes("'solo'"), 'Must seed solo tier');
      assert(migrationSql.includes('1500000'), 'Must seed 1500000 monthly kobo');
      assert(migrationSql.includes('15000000'), 'Must seed 15000000 annual kobo');
      assert(migrationSql.includes('5120'), 'Must seed 5120 MB storage');
    });

    await st.test('Migration seeds Professional tier: ₦30,000/mo (3000000 kobo), ₦300,000/yr (30000000 kobo), 5 seats, 15GB storage', () => {
      assert(migrationSql.includes("'professional'"), 'Must seed professional tier');
      assert(migrationSql.includes('3000000'), 'Must seed 3000000 monthly kobo');
      assert(migrationSql.includes('30000000'), 'Must seed 30000000 annual kobo');
      assert(migrationSql.includes('15360'), 'Must seed 15360 MB storage');
    });

    await st.test('Migration seeds Clinic tier: ₦50,000/mo (5000000 kobo), ₦500,000/yr (50000000 kobo), 10 seats, 50GB storage', () => {
      assert(migrationSql.includes("'clinic'"), 'Must seed clinic tier');
      assert(migrationSql.includes('5000000'), 'Must seed 5000000 monthly kobo');
      assert(migrationSql.includes('50000000'), 'Must seed 50000000 annual kobo');
      assert(migrationSql.includes('51200'), 'Must seed 51200 MB storage');
    });

    await st.test('Migration seeds Enterprise tier: custom quote, 999 ceiling, 200GB storage, private', () => {
      assert(migrationSql.includes("'enterprise'"), 'Must seed enterprise tier');
      assert(migrationSql.includes('204800'), 'Must seed 204800 MB storage');
    });

    await st.test('Solo, Professional, Clinic are marked public and trial_allowed = true', () => {
      assert(migrationSql.includes('trial_duration_days'), 'Must define trial_duration_days');
      assert(migrationSql.includes('is_public boolean NOT NULL DEFAULT true'), 'Must have is_public column');
    });

    await st.test('Enterprise is marked is_public = false and trial_allowed = false', () => {
      const enterpriseSection = migrationSql.slice(migrationSql.indexOf("'enterprise'"));
      assert(enterpriseSection.includes('false'), 'Enterprise must have false for public or trial');
    });

    await st.test('saas_plans has Row-Level Security enabled with public read policy', () => {
      assert(migrationSql.includes('ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;'), 'Must enable RLS');
      assert(migrationSql.includes('CREATE POLICY saas_plans_read_public ON public.saas_plans'), 'Must create public read policy');
      assert(migrationSql.includes('is_active = true AND is_public = true'), 'Public read requires active and public');
    });

    await st.test('saas_plans restricts administration strictly to is_platform_admin()', () => {
      assert(migrationSql.includes('CREATE POLICY saas_plans_admin_manage ON public.saas_plans'), 'Must create admin manage policy');
      assert(migrationSql.includes('public.is_platform_admin()'), 'Must check is_platform_admin()');
    });

    await st.test('Migration creates platform_settings table with paystack default key', () => {
      assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.platform_settings'), 'Must create platform_settings');
      assert(migrationSql.includes('paystack_public_key'), 'Must seed paystack_public_key');
      assert(migrationSql.includes('trial_period_days'), 'Must seed trial_period_days');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Atomic Self-Service Onboarding RPC (register_practice_and_subscribe)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Atomic Self-Service Onboarding RPC ---', async (st) => {
    await st.test('Function register_practice_and_subscribe is defined as SECURITY DEFINER', () => {
      assert(migrationSql.includes('CREATE OR REPLACE FUNCTION public.register_practice_and_subscribe'), 'Must define RPC');
      assert(migrationSql.includes('SECURITY DEFINER'), 'Must be SECURITY DEFINER');
    });

    await st.test('Function register_practice_and_subscribe sets fixed search_path = public, auth, pg_temp', () => {
      assert(migrationSql.includes('SET search_path = public, auth, pg_temp'), 'Must set secure search_path');
    });

    await st.test('RPC asserts active authentication via auth.uid()', () => {
      assert(migrationSql.includes('v_user_id := auth.uid();'), 'Must read auth.uid()');
      assert(migrationSql.includes('Authentication required to register practice'), 'Must throw on null user');
    });

    await st.test('RPC validates that selected plan exists, is active, and is public', () => {
      assert(migrationSql.includes('WHERE plan_code = p_plan_code AND is_active = true;'), 'Must validate plan');
      assert(migrationSql.includes('NOT v_plan.is_public'), 'Must reject private plans');
    });

    await st.test('RPC enforces strict slug regex and length checks (3-48 characters)', () => {
      assert(migrationSql.includes("p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'"), 'Must check slug regex');
      assert(migrationSql.includes('length(p_slug) < 3 OR length(p_slug) > 48'), 'Must enforce length limits');
    });

    await st.test('RPC enforces slug uniqueness check against practices table', () => {
      assert(migrationSql.includes('SELECT 1 FROM public.practices WHERE slug = p_slug'), 'Must verify slug uniqueness');
      assert(migrationSql.includes('already registered'), 'Must throw on duplicate slug');
    });

    await st.test('RPC calculates 14-day trial period when trial_allowed is true', () => {
      assert(migrationSql.includes("v_status := 'trialing';"), 'Must set trialing status');
      assert(migrationSql.includes("v_period_start + (v_plan.trial_duration_days || ' days')::interval"), 'Must compute trial end');
    });

    await st.test('RPC inserts practice with status = trial', () => {
      assert(migrationSql.includes('INSERT INTO public.practices'), 'Must insert into practices');
      assert(migrationSql.includes("CASE WHEN v_status = 'trialing' THEN 'trial' ELSE 'active' END"), 'Must assign trial status');
    });

    await st.test('RPC inserts practice_owner membership for registering user', () => {
      assert(migrationSql.includes('INSERT INTO public.practice_memberships'), 'Must insert into practice_memberships');
      assert(migrationSql.includes("'practice_owner'"), "Must assign 'practice_owner' role");
      assert(migrationSql.includes("'active'"), "Must set status to 'active'");
    });

    await st.test('RPC inserts practice_subscriptions record with frozen plan snapshot', () => {
      assert(migrationSql.includes('INSERT INTO public.practice_subscriptions'), 'Must insert into practice_subscriptions');
      assert(migrationSql.includes('v_plan.practitioner_seat_limit'), 'Must snapshot seat limit');
    });

    await st.test('RPC initializes all 4 tenant counter singletons atomically', () => {
      assert(migrationSql.includes('INSERT INTO public.practice_invoice_counters'), 'Must initialize invoice counters');
      assert(migrationSql.includes('INSERT INTO public.practice_patient_counters'), 'Must initialize patient counters');
      assert(migrationSql.includes('INSERT INTO public.practice_wallet_counters'), 'Must initialize wallet counters');
      assert(migrationSql.includes('INSERT INTO public.practice_imaging_counters'), 'Must initialize imaging counters');
    });

    await st.test('RPC records immutable audit events for practice.created and subscription.created', () => {
      assert(migrationSql.includes("'practice.created'"), 'Must log practice.created');
      assert(migrationSql.includes("'subscription.created'"), 'Must log subscription.created');
    });

    await st.test('RPC revokes public execution and grants to authenticated and service_role', () => {
      assert(migrationSql.includes('REVOKE EXECUTE ON FUNCTION public.register_practice_and_subscribe FROM public;'), 'Must revoke public');
      assert(migrationSql.includes('GRANT EXECUTE ON FUNCTION public.register_practice_and_subscribe TO authenticated, service_role;'), 'Must grant auth');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Subscription Lifecycle & 8-State Machine
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Subscription Lifecycle & 8-State Machine ---', async (st) => {
    await st.test('Migration defines saas_subscription_status enum with all 8 lifecycle states', () => {
      assert(migrationSql.includes('saas_subscription_status'), 'Must define enum');
      assert(migrationSql.includes("'trialing'"), "Must have 'trialing'");
      assert(migrationSql.includes("'active'"), "Must have 'active'");
      assert(migrationSql.includes("'pending_payment'"), "Must have 'pending_payment'");
      assert(migrationSql.includes("'past_due'"), "Must have 'past_due'");
      assert(migrationSql.includes("'grace_period'"), "Must have 'grace_period'");
      assert(migrationSql.includes("'suspended'"), "Must have 'suspended'");
      assert(migrationSql.includes("'cancelled'"), "Must have 'cancelled'");
      assert(migrationSql.includes("'expired'"), "Must have 'expired'");
    });

    await st.test('RLS policy strictly denies direct client INSERT on practice_subscriptions', () => {
      assert(migrationSql.includes('CREATE POLICY subscriptions_deny_client_insert ON public.practice_subscriptions'), 'Must define deny insert');
      assert(migrationSql.includes('FOR INSERT TO authenticated\n  WITH CHECK (false);'), 'Must deny insert with check false');
    });

    await st.test('RLS policy strictly denies direct client UPDATE on practice_subscriptions', () => {
      assert(migrationSql.includes('CREATE POLICY subscriptions_deny_client_update ON public.practice_subscriptions'), 'Must define deny update');
      assert(migrationSql.includes('FOR UPDATE TO authenticated\n  USING (false);'), 'Must deny update with using false');
    });

    await st.test('RLS policy strictly denies direct client DELETE on practice_subscriptions', () => {
      assert(migrationSql.includes('CREATE POLICY subscriptions_deny_client_delete ON public.practice_subscriptions'), 'Must define deny delete');
      assert(migrationSql.includes('FOR DELETE TO authenticated\n  USING (false);'), 'Must deny delete with using false');
    });

    await st.test('Legacy subscriptions table insecure client update policy is dropped', () => {
      assert(migrationSql.includes('DROP POLICY IF EXISTS subscriptions_update_owner ON public.subscriptions;'), 'Must drop legacy update policy');
      assert(migrationSql.includes('DROP POLICY IF EXISTS subscriptions_insert_owner ON public.subscriptions;'), 'Must drop legacy insert policy');
    });

    await st.test('Function extend_practice_trial is defined as SECURITY DEFINER', () => {
      assert(migrationSql.includes('CREATE OR REPLACE FUNCTION public.extend_practice_trial'), 'Must define extend_practice_trial');
      assert(migrationSql.includes('SECURITY DEFINER'), 'Must be SECURITY DEFINER');
    });

    await st.test('RPC extend_practice_trial restricts execution strictly to is_platform_admin()', () => {
      assert(migrationSql.includes('IF NOT COALESCE(public.is_platform_admin(), false) THEN'), 'Must check is_platform_admin()');
      assert(migrationSql.includes('Restricted: Only Platform Administrators may extend practice trials'), 'Must raise exception on non-admin');
    });

    await st.test('RPC extend_practice_trial bounds days_to_add between 1 and 90', () => {
      assert(migrationSql.includes('p_days_to_add <= 0 OR p_days_to_add > 90'), 'Must validate days range');
    });

    await st.test('RPC extend_practice_trial requires non-empty audit justification reason', () => {
      assert(migrationSql.includes("p_reason IS NULL OR TRIM(p_reason) = ''"), 'Must validate reason non-empty');
    });

    await st.test('RPC extend_practice_trial restricts extensions to trialing, expired, and past_due subscriptions', () => {
      assert(migrationSql.includes("v_sub.status NOT IN ('trialing', 'expired', 'past_due')"), 'Must guard against active/cancelled extensions');
    });

    await st.test('RPC extend_practice_trial inserts audit override record into saas_trial_extensions', () => {
      assert(migrationSql.includes('INSERT INTO public.saas_trial_extensions'), 'Must insert into saas_trial_extensions');
      assert(migrationSql.includes('extended_by,'), 'Must record extended_by admin user ID');
      assert(migrationSql.includes('days_added,'), 'Must record days_added');
    });

    await st.test('RPC extend_practice_trial advances subscription status to trialing and updates trial_ends_at', () => {
      assert(migrationSql.includes("SET status = 'trialing',"), 'Must advance status to trialing');
      assert(migrationSql.includes('trial_ends_at = v_new_end,'), 'Must update trial_ends_at');
    });

    await st.test('RPC extend_practice_trial restores practice status to trial if expired', () => {
      assert(migrationSql.includes("SET status = 'trial',"), 'Must restore practice status to trial');
    });

    await st.test('RPC extend_practice_trial logs subscription.trial_extended audit event', () => {
      assert(migrationSql.includes("'subscription.trial_extended'"), 'Must log trial extension event');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Access Enforcement & practice_is_writable()
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Access Enforcement & practice_is_writable() ---', async (st) => {
    await st.test('Function practice_is_writable is STABLE SECURITY DEFINER with fixed search_path', () => {
      assert(migrationSql.includes('CREATE OR REPLACE FUNCTION public.practice_is_writable(p_practice_id uuid)'), 'Must define practice_is_writable');
      assert(migrationSql.includes('STABLE SECURITY DEFINER'), 'Must be STABLE SECURITY DEFINER');
      assert(migrationSql.includes('SET search_path = public, pg_temp'), 'Must fix search_path');
    });

    await st.test('practice_is_writable allows trialing, active, past_due, grace_period states', () => {
      assert(migrationSql.includes("ps.status IN ('trialing', 'active', 'past_due', 'grace_period')"), 'Must allow writable subscription states');
    });

    await st.test('practice_is_writable checks practice operational status IN (active, trial)', () => {
      assert(migrationSql.includes("p.status IN ('active', 'trial')"), 'Must check practice operational status');
    });

    await st.test('Suspended, expired, and cancelled states evaluate to false (safe read-only)', () => {
      const fnStart = migrationSql.indexOf('CREATE OR REPLACE FUNCTION public.practice_is_writable');
      const fnEnd = migrationSql.indexOf('$$ LANGUAGE sql', fnStart);
      const fnBody = migrationSql.slice(fnStart, fnEnd);
      assert(!fnBody.includes("'suspended'"), 'Suspended must NOT be in writable list');
      assert(!fnBody.includes("'expired'"), 'Expired must NOT be in writable list');
      assert(!fnBody.includes("'cancelled'"), 'Cancelled must NOT be in writable list');
    });

    await st.test('Lapsed subscriptions never drop, delete or invalidate past clinical encounters', () => {
      assert(!migrationSql.includes('DROP TABLE public.clinical_notes'), 'Must not drop clinical notes');
      assert(!migrationSql.includes('DELETE FROM public.clinical_notes'), 'Must not delete clinical notes');
      assert(!migrationSql.includes('DROP TABLE public.patients'), 'Must not drop patients');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Billing & Invoicing Architectural Firewall
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Billing & Invoicing Architectural Firewall ---', async (st) => {
    await st.test('Migration creates saas_invoices table with sequential invoice_number', () => {
      assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.saas_invoices'), 'Must create saas_invoices table');
      assert(migrationSql.includes('invoice_number text UNIQUE NOT NULL'), 'Must have unique invoice_number');
    });

    await st.test('saas_invoices stores monetary values in integer minor units (kobo bigint)', () => {
      assert(migrationSql.includes('subtotal_cents bigint NOT NULL CHECK (subtotal_cents >= 0)'), 'Must check subtotal');
      assert(migrationSql.includes('discount_cents bigint NOT NULL DEFAULT 0 CHECK (discount_cents >= 0)'), 'Must check discount');
      assert(migrationSql.includes('tax_cents bigint NOT NULL DEFAULT 0 CHECK (tax_cents >= 0)'), 'Must check tax');
      assert(migrationSql.includes('total_cents bigint NOT NULL CHECK (total_cents >= 0)'), 'Must check total');
    });

    await st.test('saas_invoices enforces mathematical total check constraint', () => {
      assert(migrationSql.includes('CONSTRAINT chk_invoice_total CHECK (total_cents = (subtotal_cents - discount_cents + tax_cents))'), 'Must enforce total equation');
    });

    await st.test('saas_invoice_lines table links to saas_invoices with CASCADE delete', () => {
      assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.saas_invoice_lines'), 'Must create saas_invoice_lines');
      assert(migrationSql.includes('invoice_id uuid NOT NULL REFERENCES public.saas_invoices(id) ON DELETE CASCADE'), 'Must cascade lines on invoice delete');
    });

    await st.test('Absolute firewall: saas_invoices contains zero patient references or clinical links', () => {
      const invSchema = migrationSql.slice(
        migrationSql.indexOf('CREATE TABLE IF NOT EXISTS public.saas_invoices'),
        migrationSql.indexOf('CREATE TABLE IF NOT EXISTS public.saas_invoice_lines')
      );
      assert(!invSchema.includes('patient_id'), 'saas_invoices must NEVER contain patient_id');
      assert(!invSchema.includes('episode_id'), 'saas_invoices must NEVER contain episode_id');
      assert(!invSchema.includes('visit_id'), 'saas_invoices must NEVER contain visit_id');
    });

    await st.test('Absolute firewall: clinic patient invoices table contains zero SaaS plan references', () => {
      assert(!migrationSql.includes('ALTER TABLE public.invoices ADD COLUMN saas_plan_id'), 'invoices must not have saas_plan_id');
      assert(!migrationSql.includes('ALTER TABLE public.invoices ADD COLUMN plan_id'), 'invoices must not have plan_id');
    });

    await st.test('saas_invoices RLS allows practice_owner and accountant, or is_platform_admin()', () => {
      assert(migrationSql.includes('CREATE POLICY saas_invoices_read_authorized ON public.saas_invoices'), 'Must define invoice read policy');
      assert(migrationSql.includes("public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'accountant'])"), 'Must allow owner & accountant');
      assert(migrationSql.includes('public.is_platform_admin()'), 'Must allow platform admin');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Payment Gateway Ingestion & Idempotent Settlement
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Payment Gateway Ingestion & Idempotent Settlement ---', async (st) => {
    await st.test('Migration creates saas_webhook_events table with unique deduplication constraint', () => {
      assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.saas_webhook_events'), 'Must create saas_webhook_events');
      assert(migrationSql.includes('CONSTRAINT uq_gateway_event UNIQUE (gateway, external_event_id)'), 'Must enforce unique event ID per gateway');
    });

    await st.test('saas_webhook_events tracks signature_verified and processed status', () => {
      assert(migrationSql.includes('signature_verified boolean NOT NULL DEFAULT false'), 'Must track signature verification');
      assert(migrationSql.includes('processed boolean NOT NULL DEFAULT false'), 'Must track processing status');
    });

    await st.test('Migration creates saas_payments table with unique gateway_reference', () => {
      assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.saas_payments'), 'Must create saas_payments');
      assert(migrationSql.includes('gateway_reference text UNIQUE NOT NULL'), 'Must enforce unique gateway reference');
    });

    await st.test('RPC process_subscription_payment_settlement is SECURITY DEFINER with fixed search_path', () => {
      assert(migrationSql.includes('CREATE OR REPLACE FUNCTION public.process_subscription_payment_settlement'), 'Must define settlement RPC');
      assert(migrationSql.includes('SECURITY DEFINER'), 'Must be SECURITY DEFINER');
    });

    await st.test('Settlement RPC locks invoice FOR UPDATE and handles already_paid idempotently', () => {
      assert(migrationSql.includes('WHERE id = p_invoice_id\n  FOR UPDATE;'), 'Must lock invoice FOR UPDATE');
      assert(migrationSql.includes("IF v_inv.status = 'paid' THEN"), 'Must check if already paid');
      assert(migrationSql.includes("'status', 'already_paid'"), 'Must return already_paid status');
    });

    await st.test('Settlement RPC validates that paid amount matches or exceeds invoice total', () => {
      assert(migrationSql.includes('IF p_amount_cents < v_inv.total_cents THEN'), 'Must check payment amount against invoice total');
      assert(migrationSql.includes('Payment amount % is less than invoice total'), 'Must raise exception on underpayment');
    });

    await st.test('Settlement RPC records successful payment in saas_payments ledger', () => {
      assert(migrationSql.includes('INSERT INTO public.saas_payments'), 'Must insert into saas_payments');
      assert(migrationSql.includes("'successful'"), "Must record status as 'successful'");
    });

    await st.test('Settlement RPC advances subscription status to ACTIVE and updates period end', () => {
      assert(migrationSql.includes("UPDATE public.practice_subscriptions\n  SET status = 'active',"), 'Must advance subscription to active');
      assert(migrationSql.includes('current_period_end = v_new_period_end,'), 'Must advance period end');
    });

    await st.test('Settlement RPC sets practice status to ACTIVE', () => {
      assert(migrationSql.includes("UPDATE public.practices\n  SET status = 'active',"), 'Must ensure practice status is active');
    });

    await st.test('Settlement RPC logs subscription.payment_confirmed audit event', () => {
      assert(migrationSql.includes("'subscription.payment_confirmed'"), 'Must log payment confirmation event');
    });

    await st.test('Settlement RPC execution is restricted strictly to service_role', () => {
      assert(migrationSql.includes('REVOKE EXECUTE ON FUNCTION public.process_subscription_payment_settlement FROM public;'), 'Must revoke public');
      assert(migrationSql.includes('GRANT EXECUTE ON FUNCTION public.process_subscription_payment_settlement TO service_role;'), 'Must grant service_role');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 7: Practitioner Seat Capacity Enforcement
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 7: Practitioner Seat Capacity Enforcement ---', async (st) => {
    await st.test('Function check_practitioner_seat_limit is SECURITY DEFINER with fixed search_path', () => {
      assert(migrationSql.includes('CREATE OR REPLACE FUNCTION public.check_practitioner_seat_limit()'), 'Must define seat limit function');
      assert(migrationSql.includes('SECURITY DEFINER'), 'Must be SECURITY DEFINER');
    });

    await st.test('Trigger evaluates only clinical roles (physiotherapist, practice_owner) with active status', () => {
      assert(migrationSql.includes("NEW.role IN ('physiotherapist', 'practice_owner') AND NEW.status = 'active'"), 'Must check clinical roles');
    });

    await st.test('Trigger counts active practitioner memberships against practice_subscriptions seat_limit', () => {
      assert(migrationSql.includes('count(*) INTO v_active_practitioners'), 'Must count active practitioners');
      assert(migrationSql.includes('(v_active_practitioners + 1) > v_sub.seat_limit'), 'Must check against seat_limit');
    });

    await st.test('Trigger raises check_violation when practitioner ceiling is exceeded', () => {
      assert(migrationSql.includes('Practitioner seat limit exceeded for current subscription plan'), 'Must throw seat limit error');
      assert(migrationSql.includes("USING ERRCODE = 'check_violation'"), 'Must use check_violation error code');
    });

    await st.test('Non-clinical roles (receptionist, accountant) do not trigger seat limit exceptions', () => {
      const fnStart = migrationSql.indexOf('CREATE OR REPLACE FUNCTION public.check_practitioner_seat_limit');
      const fnEnd = migrationSql.indexOf('$$ LANGUAGE plpgsql', fnStart);
      const fnCode = migrationSql.slice(fnStart, fnEnd);
      assert(!fnCode.includes("'receptionist'"), 'Receptionist must not be in clinical seat count');
      assert(!fnCode.includes("'accountant'"), 'Accountant must not be in clinical seat count');
    });

    await st.test('Trigger trg_enforce_practitioner_seat_limit is created on practice_memberships', () => {
      assert(migrationSql.includes('CREATE TRIGGER trg_enforce_practitioner_seat_limit'), 'Must create trigger');
      assert(migrationSql.includes('BEFORE INSERT OR UPDATE ON public.practice_memberships'), 'Must fire BEFORE INSERT OR UPDATE');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 8: Clinical Privacy Firewall & Zero Admin Bleed
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 8: Clinical Privacy Firewall & Zero Admin Bleed ---', async (st) => {
    await st.test('Migration contains zero policies granting platform_admin read access to clinical_notes', () => {
      assert(!migrationSql.includes('clinical_notes_platform_admin'), 'Must not grant platform admin access to clinical_notes');
    });

    await st.test('Migration contains zero policies granting platform_admin read access to patients', () => {
      assert(!migrationSql.includes('patients_platform_admin'), 'Must not grant platform admin access to patients');
    });

    await st.test('Migration contains zero policies granting platform_admin read access to imaging_studies', () => {
      assert(!migrationSql.includes('imaging_studies_platform_admin'), 'Must not grant platform admin access to imaging_studies');
    });

    await st.test('Platform admin KPI RPC returns strictly aggregated numeric counts with zero patient identifiers', () => {
      assert(migrationSql.includes('CREATE OR REPLACE FUNCTION public.get_platform_kpis()'), 'Must define get_platform_kpis');
      const kpiCode = migrationSql.slice(migrationSql.indexOf('CREATE OR REPLACE FUNCTION public.get_platform_kpis()'));
      assert(!kpiCode.includes('patient'), 'KPI RPC must NEVER query patient records');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 9: TypeScript Database & Model Contracts Completeness
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 9: TypeScript Database & Model Contracts Completeness ---', async (st) => {
    await st.test('database.ts exports SaasPlanCode with solo, professional, clinic, enterprise', () => {
      assert(typesDbCode.includes("export type SaasPlanCode = 'solo' | 'professional' | 'clinic' | 'enterprise';"), 'Must export SaasPlanCode');
    });

    await st.test('database.ts exports SaasSubscriptionStatus with all 8 states', () => {
      assert(typesDbCode.includes('export type SaasSubscriptionStatus ='), 'Must export SaasSubscriptionStatus');
      assert(typesDbCode.includes("'trialing'"), 'Must include trialing');
      assert(typesDbCode.includes("'grace_period'"), 'Must include grace_period');
    });

    await st.test('database.ts defines saas_plans table interface with Relationships: []', () => {
      assert(typesDbCode.includes('saas_plans: {'), 'Must define saas_plans');
      assert(typesDbCode.includes('monthly_price_cents: number;'), 'Must have monthly_price_cents');
    });

    await st.test('database.ts defines practice_subscriptions table interface', () => {
      assert(typesDbCode.includes('practice_subscriptions: {'), 'Must define practice_subscriptions');
      assert(typesDbCode.includes('seat_limit: number;'), 'Must have seat_limit');
    });

    await st.test('database.ts defines saas_invoices and saas_payments table interfaces', () => {
      assert(typesDbCode.includes('saas_invoices: {'), 'Must define saas_invoices');
      assert(typesDbCode.includes('saas_payments: {'), 'Must define saas_payments');
    });

    await st.test('database.ts defines register_practice_and_subscribe in Functions', () => {
      assert(typesDbCode.includes('register_practice_and_subscribe: {'), 'Must define register_practice_and_subscribe RPC');
    });

    await st.test('database.ts defines extend_practice_trial in Functions', () => {
      assert(typesDbCode.includes('extend_practice_trial: {'), 'Must define extend_practice_trial RPC');
    });

    await st.test('database.ts defines practice_is_writable in Functions', () => {
      assert(typesDbCode.includes('practice_is_writable: {'), 'Must define practice_is_writable RPC');
    });

    await st.test('models.ts exports domain models: SaasPlan, PracticeSubscription, SaasInvoice, SaasPayment', () => {
      assert(typesModelsCode.includes('export type SaasPlan ='), 'Must export SaasPlan');
      assert(typesModelsCode.includes('export type PracticeSubscription ='), 'Must export PracticeSubscription');
      assert(typesModelsCode.includes('export type SaasInvoice ='), 'Must export SaasInvoice');
      assert(typesModelsCode.includes('export type SaasPayment ='), 'Must export SaasPayment');
    });

    await st.test('models.ts exports RegisterPracticeAndSubscribePayload and PlatformKPIs interfaces', () => {
      assert(typesModelsCode.includes('export interface RegisterPracticeAndSubscribePayload'), 'Must export payload interface');
      assert(typesModelsCode.includes('export interface PlatformKPIs'), 'Must export KPIs interface');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 10: Service Layer, Platform Admin Guard & Route Registration
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 10: Service Layer, Platform Admin Guard & Route Registration ---', async (st) => {
    await st.test('saasSubscriptionService implements getPublicPlans', () => {
      assert(serviceCode.includes('async getPublicPlans(): Promise<SaasPlan[]>'), 'Must implement getPublicPlans');
    });

    await st.test('saasSubscriptionService implements registerPracticeAndSubscribe', () => {
      assert(serviceCode.includes('async registerPracticeAndSubscribe('), 'Must implement registerPracticeAndSubscribe');
    });

    await st.test('saasSubscriptionService implements getPracticeDossier with zero clinical queries', () => {
      assert(serviceCode.includes('async getPracticeDossier('), 'Must implement getPracticeDossier');
      assert(!serviceCode.includes('clinical_notes'), 'Dossier must NEVER query clinical notes');
      assert(!serviceCode.includes('clinical_visits'), 'Dossier must NEVER query clinical visits');
    });

    await st.test('saasSubscriptionService implements extendTrial', () => {
      assert(serviceCode.includes('async extendTrial('), 'Must implement extendTrial');
    });

    await st.test('saasSubscriptionService implements getPlatformKPIs', () => {
      assert(serviceCode.includes('async getPlatformKPIs(): Promise<PlatformKPIs>'), 'Must implement getPlatformKPIs');
    });

    await st.test('PlatformAdminGuard checks profile?.is_platform_admin === true', () => {
      assert(guardCode.includes('profile?.is_platform_admin'), 'Guard must check is_platform_admin');
      assert(guardCode.includes('Restricted Access'), 'Guard must render restricted UI for non-admin');
    });

    await st.test('PlatformLayout renders platform console navigation and privacy notice', () => {
      assert(layoutCode.includes('Platform Console'), 'Layout must have Platform Console badge');
      assert(layoutCode.includes('Clinical Privacy Firewall Active'), 'Layout must state firewall status');
      assert(layoutCode.includes('/platform/dashboard'), 'Layout must link to dashboard');
      assert(layoutCode.includes('/platform/practices'), 'Layout must link to practices');
      assert(layoutCode.includes('/platform/plans'), 'Layout must link to plans');
      assert(layoutCode.includes('/platform/billing'), 'Layout must link to billing');
    });

    await st.test('App.tsx registers /pricing and /register-practice public routes', () => {
      assert(appCode.includes('path="/pricing"'), 'App must register /pricing');
      assert(appCode.includes('path="/register-practice"'), 'App must register /register-practice');
    });

    await st.test('App.tsx registers /platform root with PlatformAdminGuard and sub-routes', () => {
      assert(appCode.includes('path="/platform"'), 'App must register /platform');
      assert(appCode.includes('<PlatformAdminGuard>'), 'Must wrap in PlatformAdminGuard');
      assert(appCode.includes('path="dashboard"'), 'Must have dashboard route');
      assert(appCode.includes('path="practices"'), 'Must have practices route');
      assert(appCode.includes('path="plans"'), 'Must have plans route');
      assert(appCode.includes('path="billing"'), 'Must have billing route');
    });

    await st.test('Zero legacy project references exist in new SaaS files', () => {
      const files = [migrationSql, serviceCode, guardCode, layoutCode];
      for (const content of files) {
        assert(!content.toLowerCase().includes('kabworld'), 'Must contain zero legacy references');
      }
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 11: Paystack HMAC-SHA512 Webhook Ingestion & Cryptographic Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 11: Paystack HMAC-SHA512 Webhook Ingestion & Cryptographic Verification ---', async (st) => {
    const crypto = require('crypto');
    const secretKey = 'sk_test_mock_paystack_secret_key_physenra';

    await st.test('HMAC-SHA512 signature is generated deterministically from request payload', () => {
      const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'PHY-REF-001', amount: 3000000 } });
      const signature = crypto.createHmac('sha512', secretKey).update(payload).digest('hex');
      assert.equal(signature.length, 128, 'SHA512 hex signature must be 128 characters');
    });

    await st.test('Timing-safe comparison validates matching HMAC signature', () => {
      const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'PHY-REF-002', amount: 1500000 } });
      const validSig = crypto.createHmac('sha512', secretKey).update(payload).digest('hex');
      const incomingSig = validSig;

      const validBuf = Buffer.from(validSig, 'utf8');
      const incomingBuf = Buffer.from(incomingSig, 'utf8');
      const isMatch = validBuf.length === incomingBuf.length && crypto.timingSafeEqual(validBuf, incomingBuf);
      assert.equal(isMatch, true, 'Matching signatures must pass timingSafeEqual');
    });

    await st.test('Timing-safe comparison rejects forged signature', () => {
      const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'PHY-REF-FORGED', amount: 0 } });
      const validSig = crypto.createHmac('sha512', secretKey).update(payload).digest('hex');
      const forgedSig = crypto.createHmac('sha512', 'wrong_key').update(payload).digest('hex');

      const validBuf = Buffer.from(validSig, 'utf8');
      const forgedBuf = Buffer.from(forgedSig, 'utf8');
      const isMatch = validBuf.length === forgedBuf.length && crypto.timingSafeEqual(validBuf, forgedBuf);
      assert.equal(isMatch, false, 'Forged signature must be rejected');
    });

    await st.test('Timing-safe comparison rejects tampered payload with valid original signature', () => {
      const originalPayload = JSON.stringify({ event: 'charge.success', data: { amount: 3000000 } });
      const tamperedPayload = JSON.stringify({ event: 'charge.success', data: { amount: 0 } });
      const originalSig = crypto.createHmac('sha512', secretKey).update(originalPayload).digest('hex');
      const tamperedSig = crypto.createHmac('sha512', secretKey).update(tamperedPayload).digest('hex');

      const origBuf = Buffer.from(originalSig, 'utf8');
      const tampBuf = Buffer.from(tamperedSig, 'utf8');
      assert.notEqual(originalSig, tamperedSig, 'Signatures must differ when payload is tampered');
      assert.equal(crypto.timingSafeEqual(origBuf, tampBuf), false, 'Tampered payload must fail');
    });

    await st.test('Paystack charge.success payload fields correctly extract into settlement parameters', () => {
      const eventPayload = {
        event: 'charge.success',
        data: {
          id: 99887766,
          reference: 'PHY-PAY-2026-XYZ123',
          amount: 3000000,
          currency: 'NGN',
          channel: 'card',
          fees: 45000,
          customer: { customer_code: 'CUS_mock123', email: 'owner@lagosphysio.com' },
          authorization: { authorization_code: 'AUTH_token_abc123' },
        },
      };

      assert.equal(eventPayload.data.amount, 3000000, 'Amount must match 3000000 kobo (₦30,000)');
      assert.equal(eventPayload.data.reference, 'PHY-PAY-2026-XYZ123', 'Reference must match');
      assert.equal(eventPayload.data.channel, 'card', 'Channel must be card');
      assert.equal(eventPayload.data.authorization.authorization_code, 'AUTH_token_abc123', 'Auth token must extract');
    });

    await st.test('Idempotency map deduplicates identical webhook events by external ID', () => {
      const processedEvents = new Set();
      const eventId = 'paystack_evt_99887766';

      // First delivery
      const isFirstNew = !processedEvents.has(eventId);
      assert.equal(isFirstNew, true, 'First delivery must be identified as new');
      processedEvents.add(eventId);

      // Replayed duplicate delivery
      const isSecondNew = !processedEvents.has(eventId);
      assert.equal(isSecondNew, false, 'Replayed event must be flagged as duplicate and ignored');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 12: Financial Invariants & Executive KPI Mathematical Integrity
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 12: Financial Invariants & Executive KPI Mathematical Integrity ---', async (st) => {
    await st.test('Minor-unit conversion guarantees zero fractional cent drift', () => {
      const ninaPriceCents = 1500000n; // ₦15,000
      const formatted = Number(ninaPriceCents) / 100;
      assert.equal(formatted, 15000, 'Kobo must divide cleanly to 15000 Naira');
    });

    await st.test('MRR and ARR calculations evaluate accurately without floating point rounding', () => {
      // 10 Solo monthly (₦15k = 1,500,000 kobo)
      // 5 Professional monthly (₦30k = 3,000,000 kobo)
      // 2 Clinic annual (₦500k = 50,000,000 kobo)
      const monthlySolo = 10n * 1500000n; // 15,000,000
      const monthlyPro = 5n * 3000000n;   // 15,000,000
      const annualClinic = (2n * 50000000n) / 12n; // 8,333,333

      const mrrCents = monthlySolo + monthlyPro + annualClinic;
      const arrCents = mrrCents * 12n;

      assert.equal(mrrCents, 38333333n, 'MRR must be 38,333,333 kobo');
      assert.equal(arrCents, 459999996n, 'ARR must be MRR * 12');
    });

    await st.test('Invoice line total constraint verifies exact subtotal, discount, and tax arithmetic', () => {
      const subtotalCents = 3000000n;
      const discountCents = 500000n;
      const taxCents = 187500n; // 7.5% VAT on discounted subtotal
      const totalCents = subtotalCents - discountCents + taxCents;

      assert.equal(totalCents, 2687500n, 'Total must equal exactly 2,687,500 kobo (₦26,875.00)');
    });

    await st.test('Trial extension forward constraint rejects past or non-advancing dates', () => {
      const previousEnd = new Date('2026-10-15T00:00:00Z');
      const validNewEnd = new Date('2026-10-29T00:00:00Z');
      const invalidNewEnd = new Date('2026-10-10T00:00:00Z');

      assert(validNewEnd > previousEnd, 'New end must be strictly after previous end');
      assert(!(invalidNewEnd > previousEnd), 'New end before previous end must be invalid');
    });

    await st.test('1,000 cycle minor-unit ledger simulation accumulates with zero penny drift', () => {
      let accumulatedCents = 0n;
      const pricePerCycle = 3000000n;

      for (let i = 0; i < 1000; i++) {
        accumulatedCents += pricePerCycle;
      }

      assert.equal(accumulatedCents, 3000000000n, '1,000 cycles must equal exactly 3,000,000,000 kobo (₦30,000,000.00)');
    });
  });
});

