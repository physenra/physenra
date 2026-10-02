-- ==============================================================================
-- PHYSENRA SAAS OPERATIONS & PLATFORM ADMINISTRATION V1
-- Migration: 20261002000000_platform_saas_operations_v1.sql
-- Description: Establishes authoritative operational RPCs for Platform Admins:
--   1. public.suspend_practice(p_practice_id, p_reason)
--   2. public.restore_practice(p_practice_id, p_reason)
--   3. public.change_practice_plan(p_practice_id, p_plan_code, p_seat_limit, p_reason)
-- Enforces:
--   - Platform Admin role verification (COALESCE(public.is_platform_admin(), false))
--   - Non-destructive operational state transitions
--   - Preservation of historical billing and clinical records
--   - Immediate write-blocking on suspension via practice_is_writable()
--   - State-aware restoration semantics (trial/past_due/active)
--   - Practitioner count capacity guards on plan downgrades
--   - Immutable audit logging to public.audit_events
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RPC: suspend_practice
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.suspend_practice(
  p_practice_id uuid,
  p_reason text
)
RETURNS jsonb AS $$
DECLARE
  v_practice record;
  v_sub record;
  v_audit_id uuid;
BEGIN
  -- 1. Authorization guard: Platform Admin only
  IF NOT COALESCE(public.is_platform_admin(), false) THEN
    RAISE EXCEPTION 'Privilege escalation rejected: only platform administrators can suspend practices'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Input validation: reason is mandatory
  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'Suspension reason is required and must be at least 5 characters'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 3. Verify target practice exists
  SELECT * INTO v_practice
  FROM public.practices
  WHERE id = p_practice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Practice % not found', p_practice_id
      USING ERRCODE = 'data_exception';
  END IF;

  -- 4. Lock and verify subscription
  SELECT * INTO v_sub
  FROM public.practice_subscriptions
  WHERE practice_id = p_practice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SaaS subscription not found for practice %', p_practice_id
      USING ERRCODE = 'data_exception';
  END IF;

  -- Reject if already suspended
  IF v_sub.status = 'suspended' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Practice is already suspended',
      'practice_id', p_practice_id,
      'status', 'suspended'
    );
  END IF;

  -- 5. Atomically update subscription and practice status
  UPDATE public.practice_subscriptions
  SET 
    status = 'suspended',
    updated_at = now()
  WHERE practice_id = p_practice_id;

  UPDATE public.practices
  SET 
    status = 'suspended',
    updated_at = now()
  WHERE id = p_practice_id;

  -- 6. Log immutable audit event
  v_audit_id := public.log_audit_event(
    p_practice_id,
    'practice.suspended',
    'practice',
    p_practice_id,
    jsonb_build_object(
      'reason', trim(p_reason),
      'previous_subscription_status', v_sub.status,
      'previous_practice_status', v_practice.status,
      'suspended_at', now()
    ),
    'web'
  );

  RETURN jsonb_build_object(
    'success', true,
    'practice_id', p_practice_id,
    'status', 'suspended',
    'previous_status', v_sub.status,
    'audit_event_id', v_audit_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 2. RPC: restore_practice
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_practice(
  p_practice_id uuid,
  p_reason text
)
RETURNS jsonb AS $$
DECLARE
  v_practice record;
  v_sub record;
  v_prior_sub_status text;
  v_new_sub_status public.saas_subscription_status;
  v_new_practice_status text;
  v_audit_id uuid;
BEGIN
  -- 1. Authorization guard: Platform Admin only
  IF NOT COALESCE(public.is_platform_admin(), false) THEN
    RAISE EXCEPTION 'Privilege escalation rejected: only platform administrators can restore practices'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Input validation: reason is mandatory
  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'Restoration reason is required and must be at least 5 characters'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 3. Verify target practice exists
  SELECT * INTO v_practice
  FROM public.practices
  WHERE id = p_practice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Practice % not found', p_practice_id
      USING ERRCODE = 'data_exception';
  END IF;

  -- 4. Lock subscription
  SELECT * INTO v_sub
  FROM public.practice_subscriptions
  WHERE practice_id = p_practice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SaaS subscription not found for practice %', p_practice_id
      USING ERRCODE = 'data_exception';
  END IF;

  IF v_sub.status != 'suspended' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Practice is not currently suspended',
      'practice_id', p_practice_id,
      'status', v_sub.status
    );
  END IF;

  -- 5. Determine prior subscription status from audit log
  SELECT (metadata->>'previous_subscription_status') INTO v_prior_sub_status
  FROM public.audit_events
  WHERE practice_id = p_practice_id
    AND action = 'practice.suspended'
  ORDER BY created_at DESC
  LIMIT 1;

  -- 6. Apply state restoration rules
  IF v_prior_sub_status = 'trialing' THEN
    IF v_sub.trial_ends_at IS NOT NULL AND v_sub.trial_ends_at > now() THEN
      v_new_sub_status := 'trialing';
      v_new_practice_status := 'trial';
    ELSE
      v_new_sub_status := 'expired';
      v_new_practice_status := 'trial';
    END IF;
  ELSIF v_prior_sub_status = 'past_due' THEN
    v_new_sub_status := 'past_due';
    v_new_practice_status := 'past_due';
  ELSIF v_prior_sub_status = 'grace_period' THEN
    v_new_sub_status := 'past_due';
    v_new_practice_status := 'past_due';
  ELSIF v_prior_sub_status = 'active' THEN
    IF v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end > now() THEN
      v_new_sub_status := 'active';
      v_new_practice_status := 'active';
    ELSE
      v_new_sub_status := 'past_due';
      v_new_practice_status := 'past_due';
    END IF;
  ELSE
    -- Default fallback based on period end
    IF v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end > now() THEN
      v_new_sub_status := 'active';
      v_new_practice_status := 'active';
    ELSE
      v_new_sub_status := 'past_due';
      v_new_practice_status := 'past_due';
    END IF;
  END IF;

  -- 7. Atomically update subscription and practice
  UPDATE public.practice_subscriptions
  SET 
    status = v_new_sub_status,
    updated_at = now()
  WHERE practice_id = p_practice_id;

  UPDATE public.practices
  SET 
    status = v_new_practice_status,
    updated_at = now()
  WHERE id = p_practice_id;

  -- 8. Log immutable audit event
  v_audit_id := public.log_audit_event(
    p_practice_id,
    'practice.restored',
    'practice',
    p_practice_id,
    jsonb_build_object(
      'reason', trim(p_reason),
      'previous_status', 'suspended',
      'prior_subscription_status', v_prior_sub_status,
      'resulting_subscription_status', v_new_sub_status,
      'resulting_practice_status', v_new_practice_status,
      'restored_at', now()
    ),
    'web'
  );

  RETURN jsonb_build_object(
    'success', true,
    'practice_id', p_practice_id,
    'status', v_new_sub_status,
    'practice_status', v_new_practice_status,
    'prior_subscription_status', v_prior_sub_status,
    'audit_event_id', v_audit_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 3. RPC: change_practice_plan
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.change_practice_plan(
  p_practice_id uuid,
  p_plan_code text,
  p_seat_limit integer DEFAULT NULL,
  p_reason text DEFAULT 'Administrative plan adjustment'
)
RETURNS jsonb AS $$
DECLARE
  v_plan record;
  v_sub record;
  v_target_seats integer;
  v_active_practitioners integer;
  v_new_price_cents bigint;
  v_audit_id uuid;
BEGIN
  -- 1. Authorization guard: Platform Admin only
  IF NOT COALESCE(public.is_platform_admin(), false) THEN
    RAISE EXCEPTION 'Privilege escalation rejected: only platform administrators can modify practice plans'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Input validation
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Plan change reason is required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 3. Validate target plan exists and is active
  SELECT * INTO v_plan
  FROM public.saas_plans
  WHERE plan_code::text = p_plan_code
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive SaaS plan code: %', p_plan_code
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 4. Lock target subscription
  SELECT * INTO v_sub
  FROM public.practice_subscriptions
  WHERE practice_id = p_practice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SaaS subscription not found for practice %', p_practice_id
      USING ERRCODE = 'data_exception';
  END IF;

  -- 5. Determine target seat limit
  IF p_seat_limit IS NULL THEN
    v_target_seats := v_plan.practitioner_seat_limit;
  ELSE
    v_target_seats := p_seat_limit;
  END IF;

  -- Rule E: Custom seat limit cannot be below plan minimum
  IF v_target_seats < v_plan.practitioner_seat_limit THEN
    RAISE EXCEPTION 'Target seat limit (% seats) cannot be below the % plan catalog minimum of % seats',
      v_target_seats, v_plan.name, v_plan.practitioner_seat_limit
      USING ERRCODE = 'check_violation';
  END IF;

  -- 6. Count currently active clinical practitioners
  SELECT count(*) INTO v_active_practitioners
  FROM public.practice_memberships
  WHERE practice_id = p_practice_id
    AND role IN ('physiotherapist', 'practice_owner')
    AND status = 'active';

  -- Rule F: Reject downgrade if active practitioners exceed target seat limit
  IF v_active_practitioners > v_target_seats THEN
    RAISE EXCEPTION 'Cannot change practice to plan %: practice currently has % active practitioners, exceeding the target limit of % seats. Deactivate practitioners before changing plan.',
      v_plan.name, v_active_practitioners, v_target_seats
      USING ERRCODE = 'check_violation';
  END IF;

  -- 7. Determine updated renewal price for subscription's active billing interval
  IF v_sub.billing_interval = 'annual' THEN
    v_new_price_cents := v_plan.annual_price_cents;
  ELSE
    v_new_price_cents := v_plan.monthly_price_cents;
  END IF;

  -- 8. Atomically update subscription
  UPDATE public.practice_subscriptions
  SET
    plan_id = v_plan.id,
    seat_limit = v_target_seats,
    current_price_cents = v_new_price_cents,
    currency = v_plan.currency,
    updated_at = now()
  WHERE practice_id = p_practice_id;

  -- 9. Log immutable audit event
  v_audit_id := public.log_audit_event(
    p_practice_id,
    'practice.plan_changed',
    'practice_subscription',
    v_sub.id,
    jsonb_build_object(
      'previous_plan_id', v_sub.plan_id,
      'new_plan_id', v_plan.id,
      'new_plan_code', p_plan_code,
      'previous_seat_limit', v_sub.seat_limit,
      'new_seat_limit', v_target_seats,
      'previous_price_cents', v_sub.current_price_cents,
      'new_price_cents', v_new_price_cents,
      'active_practitioners', v_active_practitioners,
      'reason', trim(p_reason),
      'changed_at', now()
    ),
    'web'
  );

  RETURN jsonb_build_object(
    'success', true,
    'practice_id', p_practice_id,
    'plan_id', v_plan.id,
    'plan_code', p_plan_code,
    'plan_name', v_plan.name,
    'seat_limit', v_target_seats,
    'price_cents', v_new_price_cents,
    'currency', v_plan.currency,
    'audit_event_id', v_audit_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 4. FUNCTION PERMISSIONS & ACCESS CONTROL
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.suspend_practice FROM anon, public;
GRANT EXECUTE ON FUNCTION public.suspend_practice TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.restore_practice FROM anon, public;
GRANT EXECUTE ON FUNCTION public.restore_practice TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.change_practice_plan FROM anon, public;
GRANT EXECUTE ON FUNCTION public.change_practice_plan TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. RLS POLICIES FOR PLATFORM ADMINISTRATION
-- ------------------------------------------------------------------------------
-- Allow platform administrators to inspect practice memberships for operational review
DROP POLICY IF EXISTS memberships_select_platform_admin ON public.practice_memberships;
CREATE POLICY memberships_select_platform_admin ON public.practice_memberships
  FOR SELECT TO authenticated
  USING (COALESCE(public.is_platform_admin(), false));

-- Allow platform administrators to inspect practice records for operational review and management
DROP POLICY IF EXISTS practices_select_platform_admin ON public.practices;
CREATE POLICY practices_select_platform_admin ON public.practices
  FOR SELECT TO authenticated
  USING (COALESCE(public.is_platform_admin(), false));

