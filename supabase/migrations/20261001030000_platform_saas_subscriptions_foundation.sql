-- ==============================================================================
-- PHYSENRA PLATFORM ADMINISTRATION, PRACTICE ONBOARDING & SaaS SUBSCRIPTIONS V1
-- Timestamp: 20261001030000_platform_saas_subscriptions_foundation.sql
--
-- Authoritative Schema, Enums, Stored Procedures, Triggers & RLS Policies
-- for Commercial SaaS Control Layer
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENUMS
-- ------------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'saas_plan_code') THEN
    CREATE TYPE public.saas_plan_code AS ENUM (
      'solo',
      'professional',
      'clinic',
      'enterprise'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'saas_billing_interval') THEN
    CREATE TYPE public.saas_billing_interval AS ENUM (
      'monthly',
      'annual',
      'custom'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'saas_subscription_status') THEN
    CREATE TYPE public.saas_subscription_status AS ENUM (
      'trialing',
      'active',
      'pending_payment',
      'past_due',
      'grace_period',
      'suspended',
      'cancelled',
      'expired'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'saas_invoice_status') THEN
    CREATE TYPE public.saas_invoice_status AS ENUM (
      'draft',
      'open',
      'paid',
      'uncollectible',
      'void'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'saas_payment_status') THEN
    CREATE TYPE public.saas_payment_status AS ENUM (
      'pending',
      'successful',
      'failed',
      'refunded'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'saas_payment_gateway') THEN
    CREATE TYPE public.saas_payment_gateway AS ENUM (
      'paystack',
      'flutterwave',
      'stripe',
      'manual_bank_transfer',
      'offline'
    );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TABLES SPECIFICATION
-- ------------------------------------------------------------------------------

-- Table 1: saas_plans
CREATE TABLE IF NOT EXISTS public.saas_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code public.saas_plan_code UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  currency text NOT NULL DEFAULT 'NGN' CHECK (length(currency) = 3),
  monthly_price_cents bigint NOT NULL CHECK (monthly_price_cents >= 0),
  annual_price_cents bigint NOT NULL CHECK (annual_price_cents >= 0),
  practitioner_seat_limit integer NOT NULL CHECK (practitioner_seat_limit > 0),
  admin_seat_limit integer NOT NULL DEFAULT 999 CHECK (admin_seat_limit > 0),
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  storage_allowance_mb integer NOT NULL DEFAULT 5120 CHECK (storage_allowance_mb > 0),
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  trial_allowed boolean NOT NULL DEFAULT true,
  trial_duration_days integer NOT NULL DEFAULT 14 CHECK (trial_duration_days >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saas_plans_code ON public.saas_plans(plan_code);
CREATE INDEX IF NOT EXISTS idx_saas_plans_active_public ON public.saas_plans(is_active, is_public);

-- Table 2: practice_subscriptions
CREATE TABLE IF NOT EXISTS public.practice_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL UNIQUE REFERENCES public.practices(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES public.saas_plans(id) ON DELETE RESTRICT,
  status public.saas_subscription_status NOT NULL DEFAULT 'trialing',
  billing_interval public.saas_billing_interval NOT NULL DEFAULT 'monthly',
  
  -- Price & Seat Snapshots
  current_price_cents bigint NOT NULL CHECK (current_price_cents >= 0),
  currency text NOT NULL DEFAULT 'NGN' CHECK (length(currency) = 3),
  seat_limit integer NOT NULL CHECK (seat_limit > 0),
  
  -- Lifecycle Timestamps
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  grace_period_ends_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  suspended_at timestamptz,
  
  -- Gateway references
  gateway_provider public.saas_payment_gateway NOT NULL DEFAULT 'paystack',
  gateway_customer_code text,
  gateway_subscription_code text,
  gateway_auth_token text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT chk_period_consistency CHECK (current_period_end >= current_period_start)
);

CREATE INDEX IF NOT EXISTS idx_practice_subscriptions_practice_id ON public.practice_subscriptions(practice_id);
CREATE INDEX IF NOT EXISTS idx_practice_subscriptions_status ON public.practice_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_practice_subscriptions_period_end ON public.practice_subscriptions(current_period_end);

-- Table 3: saas_billing_cycles
CREATE TABLE IF NOT EXISTS public.saas_billing_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.practice_subscriptions(id) ON DELETE RESTRICT,
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  cycle_number integer NOT NULL CHECK (cycle_number > 0),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  plan_snapshot jsonb NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'NGN',
  is_trial boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_subscription_cycle UNIQUE (subscription_id, cycle_number),
  CONSTRAINT chk_cycle_dates CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_saas_billing_cycles_subscription ON public.saas_billing_cycles(subscription_id);
CREATE INDEX IF NOT EXISTS idx_saas_billing_cycles_practice ON public.saas_billing_cycles(practice_id);

-- Table 4: saas_invoices
CREATE TABLE IF NOT EXISTS public.saas_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL, -- Format: PHY-INV-YYYY-XXXXXX
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  subscription_id uuid NOT NULL REFERENCES public.practice_subscriptions(id) ON DELETE RESTRICT,
  billing_cycle_id uuid REFERENCES public.saas_billing_cycles(id) ON DELETE RESTRICT,
  currency text NOT NULL DEFAULT 'NGN',
  subtotal_cents bigint NOT NULL CHECK (subtotal_cents >= 0),
  discount_cents bigint NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  tax_cents bigint NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  status public.saas_invoice_status NOT NULL DEFAULT 'open',
  due_date timestamptz NOT NULL,
  paid_at timestamptz,
  voided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_invoice_total CHECK (total_cents = (subtotal_cents - discount_cents + tax_cents))
);

CREATE INDEX IF NOT EXISTS idx_saas_invoices_practice ON public.saas_invoices(practice_id);
CREATE INDEX IF NOT EXISTS idx_saas_invoices_status ON public.saas_invoices(status);

-- Table 5: saas_invoice_lines
CREATE TABLE IF NOT EXISTS public.saas_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.saas_invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents bigint NOT NULL CHECK (unit_price_cents >= 0),
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saas_invoice_lines_invoice ON public.saas_invoice_lines(invoice_id);

-- Table 6: saas_payments
CREATE TABLE IF NOT EXISTS public.saas_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number text UNIQUE NOT NULL, -- Format: PHY-PAY-YYYY-XXXXXX
  invoice_id uuid NOT NULL REFERENCES public.saas_invoices(id) ON DELETE RESTRICT,
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'NGN',
  payment_method text NOT NULL CHECK (payment_method IN ('card', 'bank_transfer', 'ussd', 'manual', 'offline')),
  gateway_provider public.saas_payment_gateway NOT NULL,
  gateway_reference text UNIQUE NOT NULL,
  gateway_fee_cents bigint NOT NULL DEFAULT 0 CHECK (gateway_fee_cents >= 0),
  status public.saas_payment_status NOT NULL DEFAULT 'pending',
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saas_payments_invoice ON public.saas_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_saas_payments_reference ON public.saas_payments(gateway_reference);

-- Table 7: saas_webhook_events
CREATE TABLE IF NOT EXISTS public.saas_webhook_events (
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

CREATE INDEX IF NOT EXISTS idx_saas_webhook_events_processed ON public.saas_webhook_events(processed, gateway);

-- Table 8: saas_trial_extensions
CREATE TABLE IF NOT EXISTS public.saas_trial_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  subscription_id uuid NOT NULL REFERENCES public.practice_subscriptions(id) ON DELETE RESTRICT,
  extended_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  previous_ends_at timestamptz NOT NULL,
  new_ends_at timestamptz NOT NULL,
  days_added integer NOT NULL CHECK (days_added > 0),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_extension_forward CHECK (new_ends_at > previous_ends_at)
);

CREATE INDEX IF NOT EXISTS idx_saas_trial_extensions_practice ON public.saas_trial_extensions(practice_id);

-- Table 9: platform_settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. SEED INITIAL SAAS PLAN CATALOG
-- ------------------------------------------------------------------------------

INSERT INTO public.saas_plans (
  plan_code,
  name,
  description,
  currency,
  monthly_price_cents,
  annual_price_cents,
  practitioner_seat_limit,
  admin_seat_limit,
  features,
  storage_allowance_mb,
  is_active,
  is_public,
  trial_allowed,
  trial_duration_days
) VALUES 
(
  'solo',
  'Solo Practice',
  'Designed for individual physiotherapists managing their own practice.',
  'NGN',
  1500000,   -- ₦15,000 / month
  15000000,  -- ₦150,000 / year (2 months free discount)
  1,         -- 1 Clinical Practitioner
  999,       -- Unlimited administrative support staff
  '{
    "clinical_soap": true,
    "treatment_plans": true,
    "hep_builder": true,
    "patient_registry": true,
    "appointment_scheduling": true,
    "invoicing_receipts": true,
    "patient_wallets": false,
    "packages": false,
    "recurring_memberships": false,
    "inventory_consumables": false,
    "dicom_medical_imaging": false,
    "advanced_analytics": false,
    "multi_branch": false
  }'::jsonb,
  5120,      -- 5 GB Storage
  true,
  true,
  true,
  14
),
(
  'professional',
  'Professional Clinic',
  'Ideal for expanding private practices with 2 to 5 physiotherapists.',
  'NGN',
  3000000,   -- ₦30,000 / month
  30000000,  -- ₦300,000 / year
  5,         -- Up to 5 Clinical Practitioners
  999,       -- Unlimited administrative support staff
  '{
    "clinical_soap": true,
    "treatment_plans": true,
    "hep_builder": true,
    "patient_registry": true,
    "appointment_scheduling": true,
    "invoicing_receipts": true,
    "patient_wallets": true,
    "packages": true,
    "recurring_memberships": true,
    "inventory_consumables": true,
    "dicom_medical_imaging": false,
    "advanced_analytics": false,
    "multi_branch": false
  }'::jsonb,
  15360,     -- 15 GB Storage
  true,
  true,
  true,
  14
),
(
  'clinic',
  'Comprehensive Clinic',
  'Comprehensive EMR and imaging capabilities for established clinics.',
  'NGN',
  5000000,   -- ₦50,000 / month
  50000000,  -- ₦500,000 / year
  10,        -- Up to 10 Clinical Practitioners
  999,       -- Unlimited administrative support staff
  '{
    "clinical_soap": true,
    "treatment_plans": true,
    "hep_builder": true,
    "patient_registry": true,
    "appointment_scheduling": true,
    "invoicing_receipts": true,
    "patient_wallets": true,
    "packages": true,
    "recurring_memberships": true,
    "inventory_consumables": true,
    "dicom_medical_imaging": true,
    "advanced_analytics": true,
    "multi_branch": false
  }'::jsonb,
  51200,     -- 50 GB Storage (DICOM PACS allowance)
  true,
  true,
  true,
  14
),
(
  'enterprise',
  'Hospital & Network Enterprise',
  'Custom capacity, multi-location support, and dedicated SLA.',
  'NGN',
  0,         -- Custom Quote
  0,         -- Custom Quote
  999,       -- Custom Ceiling
  999,
  '{
    "clinical_soap": true,
    "treatment_plans": true,
    "hep_builder": true,
    "patient_registry": true,
    "appointment_scheduling": true,
    "invoicing_receipts": true,
    "patient_wallets": true,
    "packages": true,
    "recurring_memberships": true,
    "inventory_consumables": true,
    "dicom_medical_imaging": true,
    "advanced_analytics": true,
    "multi_branch": true
  }'::jsonb,
  204800,    -- 200 GB Storage
  true,
  false,     -- Private (Contact Sales)
  false,     -- Requires manual onboarding
  0
)
ON CONFLICT (plan_code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    monthly_price_cents = EXCLUDED.monthly_price_cents,
    annual_price_cents = EXCLUDED.annual_price_cents,
    practitioner_seat_limit = EXCLUDED.practitioner_seat_limit,
    features = EXCLUDED.features,
    storage_allowance_mb = EXCLUDED.storage_allowance_mb,
    updated_at = now();

-- Seed Default Platform Settings
INSERT INTO public.platform_settings (key, value, description)
VALUES 
  ('paystack_public_key', '"pk_live_default_key"'::jsonb, 'Paystack public API key for frontend checkout'),
  ('trial_period_days', '14'::jsonb, 'Default evaluation trial duration for self-service onboarding'),
  ('grace_period_days', '7'::jsonb, 'Grace period duration following failed renewal attempt'),
  ('platform_currency', '"NGN"'::jsonb, 'Base commercial currency for Physenra SaaS billing')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. LEGACY SUBSCRIPTION DEPRECATION & BACKFILL
-- ------------------------------------------------------------------------------

-- Drop insecure client mutation policies on legacy subscriptions table
DROP POLICY IF EXISTS subscriptions_update_owner ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_insert_owner ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_delete_owner ON public.subscriptions;

-- Backfill existing practices into practice_subscriptions if any exist without an active subscription
DO $$
DECLARE
  v_solo_id uuid;
  v_practice record;
BEGIN
  SELECT id INTO v_solo_id FROM public.saas_plans WHERE plan_code = 'solo' LIMIT 1;
  
  IF v_solo_id IS NOT NULL THEN
    FOR v_practice IN 
      SELECT p.id, p.created_at 
      FROM public.practices p
      LEFT JOIN public.practice_subscriptions ps ON ps.practice_id = p.id
      WHERE ps.id IS NULL
    LOOP
      INSERT INTO public.practice_subscriptions (
        practice_id,
        plan_id,
        status,
        billing_interval,
        current_price_cents,
        currency,
        seat_limit,
        current_period_start,
        current_period_end,
        trial_started_at,
        trial_ends_at
      ) VALUES (
        v_practice.id,
        v_solo_id,
        'trialing',
        'monthly',
        1500000,
        'NGN',
        1,
        v_practice.created_at,
        v_practice.created_at + interval '14 days',
        v_practice.created_at,
        v_practice.created_at + interval '14 days'
      ) ON CONFLICT (practice_id) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. PRACTITIONER SEAT LIMIT ENFORCEMENT TRIGGER
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_practitioner_seat_limit()
RETURNS trigger AS $$
DECLARE
  v_sub record;
  v_active_practitioners integer;
BEGIN
  -- Only evaluate when role is clinical practitioner (physiotherapist, practice_owner) and status is active
  IF NEW.role IN ('physiotherapist', 'practice_owner') AND NEW.status = 'active' THEN
    SELECT * INTO v_sub
    FROM public.practice_subscriptions
    WHERE practice_id = NEW.practice_id;

    IF FOUND THEN
      -- Count existing active practitioners excluding the current row in case of update
      SELECT count(*) INTO v_active_practitioners
      FROM public.practice_memberships
      WHERE practice_id = NEW.practice_id
        AND role IN ('physiotherapist', 'practice_owner')
        AND status = 'active'
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

      IF (v_active_practitioners + 1) > v_sub.seat_limit THEN
        RAISE EXCEPTION 'Practitioner seat limit exceeded for current subscription plan. Limit: %, Current: %',
          v_sub.seat_limit, v_active_practitioners
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_enforce_practitioner_seat_limit ON public.practice_memberships;
CREATE TRIGGER trg_enforce_practitioner_seat_limit
  BEFORE INSERT OR UPDATE ON public.practice_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.check_practitioner_seat_limit();

-- ------------------------------------------------------------------------------
-- 6. AUTHORITATIVE STORED PROCEDURES (RPCs)
-- ------------------------------------------------------------------------------

-- RPC 1: register_practice_and_subscribe
CREATE OR REPLACE FUNCTION public.register_practice_and_subscribe(
  p_practice_name text,
  p_slug text,
  p_plan_code public.saas_plan_code,
  p_billing_interval public.saas_billing_interval DEFAULT 'monthly',
  p_country text DEFAULT 'NG',
  p_timezone text DEFAULT 'Africa/Lagos'
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_plan record;
  v_practice_id uuid;
  v_subscription_id uuid;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_trial_ends_at timestamptz;
  v_price_cents bigint;
  v_status public.saas_subscription_status;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to register practice'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 1. Validate plan
  SELECT * INTO v_plan 
  FROM public.saas_plans 
  WHERE plan_code = p_plan_code AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive SaaS plan code: %', p_plan_code
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF NOT v_plan.is_public THEN
    RAISE EXCEPTION 'Plan % is not eligible for self-service onboarding', p_plan_code
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 2. Validate slug format
  IF p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' OR length(p_slug) < 3 OR length(p_slug) > 48 THEN
    RAISE EXCEPTION 'Slug must be 3-48 lowercase alphanumeric characters or hyphens'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Check slug uniqueness
  IF EXISTS (SELECT 1 FROM public.practices WHERE slug = p_slug) THEN
    RAISE EXCEPTION 'Practice slug % is already registered', p_slug
      USING ERRCODE = 'unique_violation';
  END IF;

  -- 3. Calculate intervals & trial state
  v_period_start := now();
  IF v_plan.trial_allowed THEN
    v_status := 'trialing';
    v_trial_ends_at := v_period_start + (v_plan.trial_duration_days || ' days')::interval;
    v_period_end := v_trial_ends_at;
  ELSE
    v_status := 'pending_payment';
    v_trial_ends_at := NULL;
    IF p_billing_interval = 'annual' THEN
      v_period_end := v_period_start + interval '1 year';
    ELSE
      v_period_end := v_period_start + interval '1 month';
    END IF;
  END IF;

  IF p_billing_interval = 'annual' THEN
    v_price_cents := v_plan.annual_price_cents;
  ELSE
    v_price_cents := v_plan.monthly_price_cents;
  END IF;

  -- 4. Insert Practice
  INSERT INTO public.practices (
    name,
    slug,
    status,
    country,
    timezone
  ) VALUES (
    TRIM(p_practice_name),
    p_slug,
    CASE WHEN v_status = 'trialing' THEN 'trial' ELSE 'active' END,
    p_country,
    p_timezone
  ) RETURNING id INTO v_practice_id;

  -- 5. Insert Practice Owner Membership
  INSERT INTO public.practice_memberships (
    practice_id,
    user_id,
    role,
    status,
    joined_at
  ) VALUES (
    v_practice_id,
    v_user_id,
    'practice_owner',
    'active',
    now()
  );

  -- 6. Insert Subscription Contract
  INSERT INTO public.practice_subscriptions (
    practice_id,
    plan_id,
    status,
    billing_interval,
    current_price_cents,
    currency,
    seat_limit,
    current_period_start,
    current_period_end,
    trial_started_at,
    trial_ends_at
  ) VALUES (
    v_practice_id,
    v_plan.id,
    v_status,
    p_billing_interval,
    v_price_cents,
    v_plan.currency,
    v_plan.practitioner_seat_limit,
    v_period_start,
    v_period_end,
    CASE WHEN v_status = 'trialing' THEN v_period_start ELSE NULL END,
    v_trial_ends_at
  ) RETURNING id INTO v_subscription_id;

  -- 7. Initialize Tenant Counters (Idempotent insertion)
  INSERT INTO public.practice_invoice_counters (practice_id, last_number) 
  VALUES (v_practice_id, 0)
  ON CONFLICT (practice_id) DO NOTHING;

  INSERT INTO public.practice_patient_counters (practice_id, last_number) 
  VALUES (v_practice_id, 0)
  ON CONFLICT (practice_id) DO NOTHING;

  INSERT INTO public.practice_wallet_counters (practice_id, last_number) 
  VALUES (v_practice_id, 0)
  ON CONFLICT (practice_id) DO NOTHING;

  INSERT INTO public.practice_imaging_counters (practice_id, last_order_number, last_study_number) 
  VALUES (v_practice_id, 0, 0)
  ON CONFLICT (practice_id) DO NOTHING;

  -- 8. Record Immutable Audit Events
  PERFORM public.log_audit_event(
    v_practice_id,
    'practice.created',
    'practices',
    v_practice_id,
    jsonb_build_object(
      'name', p_practice_name,
      'slug', p_slug,
      'plan_code', p_plan_code,
      'trial', v_plan.trial_allowed
    ),
    'onboarding_rpc'
  );

  PERFORM public.log_audit_event(
    v_practice_id,
    'subscription.created',
    'practice_subscriptions',
    v_subscription_id,
    jsonb_build_object(
      'status', v_status,
      'plan_code', p_plan_code,
      'seat_limit', v_plan.practitioner_seat_limit
    ),
    'onboarding_rpc'
  );

  RETURN jsonb_build_object(
    'practice_id', v_practice_id,
    'subscription_id', v_subscription_id,
    'slug', p_slug,
    'status', v_status,
    'seat_limit', v_plan.practitioner_seat_limit,
    'trial_ends_at', v_trial_ends_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- RPC 2: extend_practice_trial
CREATE OR REPLACE FUNCTION public.extend_practice_trial(
  p_practice_id uuid,
  p_days_to_add integer,
  p_reason text
)
RETURNS jsonb AS $$
DECLARE
  v_admin_id uuid;
  v_sub record;
  v_new_end timestamptz;
BEGIN
  v_admin_id := auth.uid();
  IF NOT COALESCE(public.is_platform_admin(), false) THEN
    RAISE EXCEPTION 'Restricted: Only Platform Administrators may extend practice trials'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_days_to_add <= 0 OR p_days_to_add > 90 THEN
    RAISE EXCEPTION 'Days to add must be between 1 and 90'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'Mandatory audit reason required for trial extension'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT * INTO v_sub
  FROM public.practice_subscriptions
  WHERE practice_id = p_practice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found for practice %', p_practice_id
      USING ERRCODE = 'data_exception';
  END IF;

  IF v_sub.status NOT IN ('trialing', 'expired', 'past_due') THEN
    RAISE EXCEPTION 'Cannot extend trial for subscription with status: %', v_sub.status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_new_end := GREATEST(now(), v_sub.trial_ends_at) + (p_days_to_add || ' days')::interval;

  -- 1. Log extension override
  INSERT INTO public.saas_trial_extensions (
    practice_id,
    subscription_id,
    extended_by,
    previous_ends_at,
    new_ends_at,
    days_added,
    reason
  ) VALUES (
    p_practice_id,
    v_sub.id,
    v_admin_id,
    v_sub.trial_ends_at,
    v_new_end,
    p_days_to_add,
    TRIM(p_reason)
  );

  -- 2. Update subscription state
  UPDATE public.practice_subscriptions
  SET status = 'trialing',
      trial_ends_at = v_new_end,
      current_period_end = v_new_end,
      updated_at = now()
  WHERE id = v_sub.id;

  -- 3. Restore practice status if expired
  UPDATE public.practices
  SET status = 'trial',
      updated_at = now()
  WHERE id = p_practice_id AND status <> 'trial';

  -- 4. Audit Log
  PERFORM public.log_audit_event(
    p_practice_id,
    'subscription.trial_extended',
    'practice_subscriptions',
    v_sub.id,
    jsonb_build_object(
      'days_added', p_days_to_add,
      'previous_end', v_sub.trial_ends_at,
      'new_end', v_new_end,
      'reason', p_reason
    ),
    'platform_admin'
  );

  RETURN jsonb_build_object(
    'practice_id', p_practice_id,
    'status', 'trialing',
    'new_trial_ends_at', v_new_end
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- RPC 3: process_subscription_payment_settlement
CREATE OR REPLACE FUNCTION public.process_subscription_payment_settlement(
  p_invoice_id uuid,
  p_gateway public.saas_payment_gateway,
  p_gateway_reference text,
  p_amount_cents bigint,
  p_payment_method text,
  p_gateway_fee_cents bigint,
  p_auth_token text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_inv record;
  v_sub record;
  v_payment_id uuid;
  v_new_period_start timestamptz;
  v_new_period_end timestamptz;
BEGIN
  -- 1. Lock invoice
  SELECT * INTO v_inv
  FROM public.saas_invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SaaS Invoice % not found', p_invoice_id
      USING ERRCODE = 'data_exception';
  END IF;

  IF v_inv.status = 'paid' THEN
    RETURN jsonb_build_object('status', 'already_paid', 'invoice_id', p_invoice_id);
  END IF;

  -- 2. Verify amount matches invoice total
  IF p_amount_cents < v_inv.total_cents THEN
    RAISE EXCEPTION 'Payment amount % is less than invoice total %', p_amount_cents, v_inv.total_cents
      USING ERRCODE = 'check_violation';
  END IF;

  -- 3. Lock subscription
  SELECT * INTO v_sub
  FROM public.practice_subscriptions
  WHERE id = v_inv.subscription_id
  FOR UPDATE;

  -- 4. Calculate new billing cycle
  v_new_period_start := GREATEST(now(), v_sub.current_period_end);
  IF v_sub.billing_interval = 'annual' THEN
    v_new_period_end := v_new_period_start + interval '1 year';
  ELSE
    v_new_period_end := v_new_period_start + interval '1 month';
  END IF;

  -- 5. Record Payment
  INSERT INTO public.saas_payments (
    payment_number,
    invoice_id,
    practice_id,
    amount_cents,
    currency,
    payment_method,
    gateway_provider,
    gateway_reference,
    gateway_fee_cents,
    status,
    settled_at
  ) VALUES (
    'PHY-PAY-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random()*1000000)::text, 6, '0'),
    v_inv.id,
    v_inv.practice_id,
    p_amount_cents,
    v_inv.currency,
    p_payment_method,
    p_gateway,
    p_gateway_reference,
    p_gateway_fee_cents,
    'successful',
    now()
  ) RETURNING id INTO v_payment_id;

  -- 6. Mark Invoice Paid
  UPDATE public.saas_invoices
  SET status = 'paid',
      paid_at = now(),
      updated_at = now()
  WHERE id = v_inv.id;

  -- 7. Advance Subscription to ACTIVE
  UPDATE public.practice_subscriptions
  SET status = 'active',
      current_period_start = v_new_period_start,
      current_period_end = v_new_period_end,
      grace_period_ends_at = NULL,
      gateway_auth_token = COALESCE(p_auth_token, gateway_auth_token),
      updated_at = now()
  WHERE id = v_sub.id;

  -- 8. Ensure Practice Operational Status is Active
  UPDATE public.practices
  SET status = 'active',
      updated_at = now()
  WHERE id = v_inv.practice_id;

  -- 9. Audit Event
  PERFORM public.log_audit_event(
    v_inv.practice_id,
    'subscription.payment_confirmed',
    'saas_payments',
    v_payment_id,
    jsonb_build_object(
      'amount_cents', p_amount_cents,
      'reference', p_gateway_reference,
      'new_period_end', v_new_period_end
    ),
    'webhook_settlement'
  );

  RETURN jsonb_build_object(
    'status', 'settled',
    'invoice_id', v_inv.id,
    'payment_id', v_payment_id,
    'new_period_end', v_new_period_end
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- RPC 4: practice_is_writable
CREATE OR REPLACE FUNCTION public.practice_is_writable(p_practice_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.practice_subscriptions ps
    JOIN public.practices p ON p.id = ps.practice_id
    WHERE ps.practice_id = p_practice_id
      AND ps.status IN ('trialing', 'active', 'past_due', 'grace_period')
      AND p.status IN ('active', 'trial')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- RPC 5: get_platform_kpis
CREATE OR REPLACE FUNCTION public.get_platform_kpis()
RETURNS jsonb AS $$
DECLARE
  v_total_practices integer;
  v_active_practices integer;
  v_trialing_practices integer;
  v_past_due_practices integer;
  v_suspended_practices integer;
  v_mrr_cents bigint;
  v_arr_cents bigint;
BEGIN
  IF NOT COALESCE(public.is_platform_admin(), false) THEN
    RAISE EXCEPTION 'Restricted: Only Platform Administrators may query executive platform KPIs'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT count(*) INTO v_total_practices FROM public.practices;
  
  SELECT count(*) INTO v_active_practices 
  FROM public.practice_subscriptions 
  WHERE status = 'active';

  SELECT count(*) INTO v_trialing_practices 
  FROM public.practice_subscriptions 
  WHERE status = 'trialing';

  SELECT count(*) INTO v_past_due_practices 
  FROM public.practice_subscriptions 
  WHERE status IN ('past_due', 'grace_period');

  SELECT count(*) INTO v_suspended_practices 
  FROM public.practice_subscriptions 
  WHERE status IN ('suspended', 'expired', 'cancelled');

  -- Calculate MRR in cents: monthly full price + annual / 12
  SELECT COALESCE(
    SUM(
      CASE 
        WHEN billing_interval = 'annual' THEN current_price_cents / 12
        ELSE current_price_cents
      END
    ), 0
  ) INTO v_mrr_cents
  FROM public.practice_subscriptions
  WHERE status = 'active';

  v_arr_cents := v_mrr_cents * 12;

  RETURN jsonb_build_object(
    'total_practices', v_total_practices,
    'active_practices', v_active_practices,
    'trialing_practices', v_trialing_practices,
    'past_due_practices', v_past_due_practices,
    'suspended_practices', v_suspended_practices,
    'mrr_cents', v_mrr_cents,
    'arr_cents', v_arr_cents,
    'generated_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 7. ROW-LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- 1. saas_plans
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saas_plans_read_public ON public.saas_plans;
CREATE POLICY saas_plans_read_public ON public.saas_plans
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND is_public = true);

DROP POLICY IF EXISTS saas_plans_admin_manage ON public.saas_plans;
CREATE POLICY saas_plans_admin_manage ON public.saas_plans
  FOR ALL TO authenticated
  USING (COALESCE(public.is_platform_admin(), false))
  WITH CHECK (COALESCE(public.is_platform_admin(), false));

-- 2. practice_subscriptions
ALTER TABLE public.practice_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscriptions_read_tenant_or_admin ON public.practice_subscriptions;
CREATE POLICY subscriptions_read_tenant_or_admin ON public.practice_subscriptions
  FOR SELECT TO authenticated
  USING (
    public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    OR COALESCE(public.is_platform_admin(), false)
  );

-- Strictly deny direct client insert, update, delete
DROP POLICY IF EXISTS subscriptions_deny_client_insert ON public.practice_subscriptions;
CREATE POLICY subscriptions_deny_client_insert ON public.practice_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS subscriptions_deny_client_update ON public.practice_subscriptions;
CREATE POLICY subscriptions_deny_client_update ON public.practice_subscriptions
  FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS subscriptions_deny_client_delete ON public.practice_subscriptions;
CREATE POLICY subscriptions_deny_client_delete ON public.practice_subscriptions
  FOR DELETE TO authenticated
  USING (false);

-- 3. saas_billing_cycles
ALTER TABLE public.saas_billing_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saas_billing_cycles_read ON public.saas_billing_cycles;
CREATE POLICY saas_billing_cycles_read ON public.saas_billing_cycles
  FOR SELECT TO authenticated
  USING (
    public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    OR COALESCE(public.is_platform_admin(), false)
  );

DROP POLICY IF EXISTS saas_billing_cycles_deny_client ON public.saas_billing_cycles;
CREATE POLICY saas_billing_cycles_deny_client ON public.saas_billing_cycles
  FOR INSERT TO authenticated
  WITH CHECK (COALESCE(public.is_platform_admin(), false));

-- 4. saas_invoices & lines
ALTER TABLE public.saas_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_invoice_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saas_invoices_read_authorized ON public.saas_invoices;
CREATE POLICY saas_invoices_read_authorized ON public.saas_invoices
  FOR SELECT TO authenticated
  USING (
    public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'accountant'])
    OR COALESCE(public.is_platform_admin(), false)
  );

DROP POLICY IF EXISTS saas_invoices_deny_client_mutation ON public.saas_invoices;
CREATE POLICY saas_invoices_deny_client_mutation ON public.saas_invoices
  FOR ALL TO authenticated
  USING (COALESCE(public.is_platform_admin(), false))
  WITH CHECK (COALESCE(public.is_platform_admin(), false));

DROP POLICY IF EXISTS saas_invoice_lines_read_authorized ON public.saas_invoice_lines;
CREATE POLICY saas_invoice_lines_read_authorized ON public.saas_invoice_lines
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.saas_invoices inv
      WHERE inv.id = saas_invoice_lines.invoice_id
        AND (
          public.user_has_practice_role(inv.practice_id, ARRAY['practice_owner', 'accountant'])
          OR COALESCE(public.is_platform_admin(), false)
        )
    )
  );

DROP POLICY IF EXISTS saas_invoice_lines_deny_client_mutation ON public.saas_invoice_lines;
CREATE POLICY saas_invoice_lines_deny_client_mutation ON public.saas_invoice_lines
  FOR ALL TO authenticated
  USING (COALESCE(public.is_platform_admin(), false))
  WITH CHECK (COALESCE(public.is_platform_admin(), false));

-- 5. saas_payments
ALTER TABLE public.saas_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saas_payments_read_authorized ON public.saas_payments;
CREATE POLICY saas_payments_read_authorized ON public.saas_payments
  FOR SELECT TO authenticated
  USING (
    public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'accountant'])
    OR COALESCE(public.is_platform_admin(), false)
  );

DROP POLICY IF EXISTS saas_payments_deny_client_mutation ON public.saas_payments;
CREATE POLICY saas_payments_deny_client_mutation ON public.saas_payments
  FOR ALL TO authenticated
  USING (COALESCE(public.is_platform_admin(), false))
  WITH CHECK (COALESCE(public.is_platform_admin(), false));

-- 6. saas_webhook_events
ALTER TABLE public.saas_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saas_webhooks_admin_read ON public.saas_webhook_events;
CREATE POLICY saas_webhooks_admin_read ON public.saas_webhook_events
  FOR SELECT TO authenticated
  USING (COALESCE(public.is_platform_admin(), false));

-- 7. saas_trial_extensions
ALTER TABLE public.saas_trial_extensions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saas_trial_extensions_read ON public.saas_trial_extensions;
CREATE POLICY saas_trial_extensions_read ON public.saas_trial_extensions
  FOR SELECT TO authenticated
  USING (
    public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    OR COALESCE(public.is_platform_admin(), false)
  );

DROP POLICY IF EXISTS saas_trial_extensions_admin_insert ON public.saas_trial_extensions;
CREATE POLICY saas_trial_extensions_admin_insert ON public.saas_trial_extensions
  FOR INSERT TO authenticated
  WITH CHECK (COALESCE(public.is_platform_admin(), false));

-- 8. platform_settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_settings_admin_all ON public.platform_settings;
CREATE POLICY platform_settings_admin_all ON public.platform_settings
  FOR ALL TO authenticated
  USING (COALESCE(public.is_platform_admin(), false))
  WITH CHECK (COALESCE(public.is_platform_admin(), false));

-- Revoke default public execution, grant to authenticated / service_role
REVOKE EXECUTE ON FUNCTION public.register_practice_and_subscribe FROM public;
GRANT EXECUTE ON FUNCTION public.register_practice_and_subscribe TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.extend_practice_trial FROM public;
GRANT EXECUTE ON FUNCTION public.extend_practice_trial TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.process_subscription_payment_settlement FROM public;
GRANT EXECUTE ON FUNCTION public.process_subscription_payment_settlement TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_platform_kpis FROM public;
GRANT EXECUTE ON FUNCTION public.get_platform_kpis TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.practice_is_writable FROM public;
GRANT EXECUTE ON FUNCTION public.practice_is_writable TO anon, authenticated, service_role;
