-- ==============================================================================
-- PHYSENRA DATABASE MIGRATION: FIX PRACTICE REGISTRATION PATIENT COUNTER INITIALIZATION
-- Timestamp: 20261004010000_fix_register_practice_patient_counter.sql
--
-- Domain: Platform SaaS Subscriptions & Self-Service Onboarding
--
-- Defect Resolved:
--   public.register_practice_and_subscribe previously attempted:
--     INSERT INTO public.practice_patient_counters (practice_id, last_number) VALUES (v_practice_id, 0)
--   However, public.practice_patient_counters was established in 20260928014500_patient_registry_foundation.sql
--   with columns (practice_id uuid PK, next_val integer NOT NULL DEFAULT 1 CHECK (next_val >= 1), updated_at timestamptz).
--   There is no "last_number" column on practice_patient_counters.
--
-- Remediation:
--   Replace register_practice_and_subscribe with the corrected tenant counter initialization:
--     INSERT INTO public.practice_patient_counters (practice_id, next_val)
--     VALUES (v_practice_id, 1)
--     ON CONFLICT (practice_id) DO NOTHING;
--
-- Security & Permissions:
--   REVOKE EXECUTE ON FUNCTION public.register_practice_and_subscribe FROM public;
--   GRANT EXECUTE ON FUNCTION public.register_practice_and_subscribe TO authenticated, service_role;
-- ==============================================================================

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

  INSERT INTO public.practice_patient_counters (practice_id, next_val) 
  VALUES (v_practice_id, 1)
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

REVOKE EXECUTE ON FUNCTION public.register_practice_and_subscribe FROM public;
GRANT EXECUTE ON FUNCTION public.register_practice_and_subscribe TO authenticated, service_role;
