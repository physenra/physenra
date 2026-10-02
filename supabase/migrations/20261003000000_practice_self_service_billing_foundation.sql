-- ==============================================================================
-- PHYSENRA SAAS SELF-SERVICE PRACTICE BILLING FOUNDATION V1
-- Migration: 20261003000000_practice_self_service_billing_foundation.sql
-- Description:
--   Establishes authoritative database primitives for Practice Owner self-service:
--   1. Sequence for SaaS invoice numbering: public.saas_invoice_number_seq
--   2. Schema extensions: pending_plan_id and pending_billing_interval on practice_subscriptions
--   3. RPC: public.initiate_practice_subscription_payment
--   4. RPC: public.self_service_change_plan
--   5. RPC: public.cancel_practice_subscription
--   6. RPC: public.reactivate_practice_subscription
--   7. Enhanced process_subscription_payment_settlement to promote pending_plan_id upon settlement
-- Enforces:
--   - Strict practice_owner role verification inside PostgreSQL
--   - Server-side authoritative pricing (zero trust of client amounts/discounts)
--   - Non-destructive downgrade scheduling at current_period_end
--   - Practitioner capacity constraints (active clinical staff vs target seat limit)
--   - Idempotent invoice initiation and replay protection
--   - Immutable financial records (paid invoices & payments protected)
--   - Immutable audit logging to public.audit_events
--   - Hardened SECURITY DEFINER search_path and execution revocation from anon/public
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEQUENCE & SCHEMA EXTENSIONS
-- ------------------------------------------------------------------------------

-- Sequential counter for collision-free PHY-INV-YYYY-XXXXXX formatting
CREATE SEQUENCE IF NOT EXISTS public.saas_invoice_number_seq START WITH 1;

-- Add pending plan columns to practice_subscriptions for scheduled end-of-period downgrades
ALTER TABLE public.practice_subscriptions
  ADD COLUMN IF NOT EXISTS pending_plan_id uuid REFERENCES public.saas_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pending_billing_interval public.saas_billing_interval;

CREATE INDEX IF NOT EXISTS idx_practice_subscriptions_pending_plan ON public.practice_subscriptions(pending_plan_id);

-- ------------------------------------------------------------------------------
-- 2. RPC: initiate_practice_subscription_payment
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.initiate_practice_subscription_payment(
  p_practice_id uuid,
  p_plan_code text,
  p_billing_interval text DEFAULT 'monthly'
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_practice record;
  v_sub record;
  v_plan record;
  v_interval public.saas_billing_interval;
  v_price_cents bigint;
  v_active_practitioners integer;
  v_existing_inv record;
  v_inv_id uuid;
  v_invoice_num text;
  v_line_id uuid;
  v_description text;
BEGIN
  -- 1. Authentication check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to initiate subscription payment'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Authorization check: caller must be practice_owner of target practice
  IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner']) THEN
    RAISE EXCEPTION 'Access denied: Only a verified practice owner can initiate subscription payments'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 3. Target practice exists
  SELECT * INTO v_practice
  FROM public.practices
  WHERE id = p_practice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target practice % not found', p_practice_id
      USING ERRCODE = 'data_exception';
  END IF;

  -- 4. Target subscription exists
  SELECT * INTO v_sub
  FROM public.practice_subscriptions
  WHERE practice_id = p_practice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription contract not found for practice %', p_practice_id
      USING ERRCODE = 'data_exception';
  END IF;

  -- Reject payment initiation if administratively suspended
  IF v_sub.status = 'suspended' THEN
    RAISE EXCEPTION 'Practice is administratively suspended. Contact platform administration.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 5. Target plan exists and is active & public
  SELECT * INTO v_plan
  FROM public.saas_plans
  WHERE plan_code::text = p_plan_code
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive SaaS plan: %', p_plan_code
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF NOT v_plan.is_public THEN
    RAISE EXCEPTION 'Plan % is not eligible for self-service subscription', p_plan_code
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 6. Billing interval validation
  IF p_billing_interval NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'Billing interval must be monthly or annual'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  v_interval := p_billing_interval::public.saas_billing_interval;

  -- 7. Practitioner capacity validation
  SELECT count(*) INTO v_active_practitioners
  FROM public.practice_memberships
  WHERE practice_id = p_practice_id
    AND role IN ('physiotherapist', 'practice_owner')
    AND status = 'active';

  IF v_active_practitioners > v_plan.practitioner_seat_limit THEN
    RAISE EXCEPTION 'Cannot subscribe to plan %: practice currently has % active practitioners, exceeding the limit of % seats. Deactivate staff before proceeding.',
      v_plan.name, v_active_practitioners, v_plan.practitioner_seat_limit
      USING ERRCODE = 'check_violation';
  END IF;

  -- 8. Derive authoritative pricing from saas_plans (NEVER trust client)
  IF v_interval = 'annual' THEN
    v_price_cents := v_plan.annual_price_cents;
  ELSE
    v_price_cents := v_plan.monthly_price_cents;
  END IF;

  IF v_price_cents <= 0 THEN
    RAISE EXCEPTION 'Calculated plan amount must be greater than zero for self-service payment'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 9. Idempotency / Open Invoice Reuse:
  -- Check if an unexpired open invoice already exists for this exact practice, subscription, and amount
  SELECT * INTO v_existing_inv
  FROM public.saas_invoices
  WHERE practice_id = p_practice_id
    AND subscription_id = v_sub.id
    AND status = 'open'
    AND total_cents = v_price_cents
    AND due_date > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Void any other contradictory open invoices for different amounts
    UPDATE public.saas_invoices
    SET status = 'void', voided_at = now(), updated_at = now()
    WHERE practice_id = p_practice_id
      AND subscription_id = v_sub.id
      AND status = 'open'
      AND id <> v_existing_inv.id;

    RETURN jsonb_build_object(
      'success', true,
      'is_reused', true,
      'invoice_id', v_existing_inv.id,
      'invoice_number', v_existing_inv.invoice_number,
      'amount_cents', v_existing_inv.total_cents,
      'currency', v_existing_inv.currency,
      'plan_code', p_plan_code,
      'plan_name', v_plan.name,
      'billing_interval', p_billing_interval,
      'seat_limit', v_plan.practitioner_seat_limit,
      'due_date', v_existing_inv.due_date,
      'status', 'open'
    );
  END IF;

  -- Void any previous open invoices for this practice subscription before generating new one
  UPDATE public.saas_invoices
  SET status = 'void', voided_at = now(), updated_at = now()
  WHERE practice_id = p_practice_id
    AND subscription_id = v_sub.id
    AND status = 'open';

  -- 10. Generate new authoritative invoice number
  v_invoice_num := 'PHY-INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.saas_invoice_number_seq')::text, 6, '0');

  -- 11. Insert new saas_invoices record
  INSERT INTO public.saas_invoices (
    invoice_number,
    practice_id,
    subscription_id,
    billing_cycle_id,
    currency,
    subtotal_cents,
    discount_cents,
    tax_cents,
    total_cents,
    status,
    due_date
  ) VALUES (
    v_invoice_num,
    p_practice_id,
    v_sub.id,
    NULL,
    v_plan.currency,
    v_price_cents,
    0,
    0,
    v_price_cents,
    'open',
    now() + interval '7 days'
  ) RETURNING id INTO v_inv_id;

  -- 12. Insert line item
  v_description := v_plan.name || ' (' || initcap(p_billing_interval) || ' Subscription)';
  INSERT INTO public.saas_invoice_lines (
    invoice_id,
    description,
    quantity,
    unit_price_cents,
    amount_cents
  ) VALUES (
    v_inv_id,
    v_description,
    1,
    v_price_cents,
    v_price_cents
  ) RETURNING id INTO v_line_id;

  -- 13. Audit logging
  PERFORM public.log_audit_event(
    p_practice_id,
    'practice.billing_payment_initiated',
    'saas_invoices',
    v_inv_id,
    jsonb_build_object(
      'invoice_number', v_invoice_num,
      'plan_code', p_plan_code,
      'billing_interval', p_billing_interval,
      'amount_cents', v_price_cents,
      'seat_limit', v_plan.practitioner_seat_limit
    ),
    'self_service_rpc'
  );

  RETURN jsonb_build_object(
    'success', true,
    'is_reused', false,
    'invoice_id', v_inv_id,
    'invoice_number', v_invoice_num,
    'amount_cents', v_price_cents,
    'currency', v_plan.currency,
    'plan_code', p_plan_code,
    'plan_name', v_plan.name,
    'billing_interval', p_billing_interval,
    'seat_limit', v_plan.practitioner_seat_limit,
    'due_date', now() + interval '7 days',
    'status', 'open'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 3. RPC: self_service_change_plan
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.self_service_change_plan(
  p_practice_id uuid,
  p_plan_code text,
  p_billing_interval text DEFAULT 'monthly',
  p_reason text DEFAULT 'Practice owner requested plan adjustment'
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_sub record;
  v_current_plan record;
  v_target_plan record;
  v_interval public.saas_billing_interval;
  v_target_price_cents bigint;
  v_current_price_cents bigint;
  v_active_practitioners integer;
  v_is_downgrade boolean;
  v_inv_result jsonb;
  v_audit_id uuid;
BEGIN
  -- 1. Authentication check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to change plan'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Authorization check: caller must be practice_owner of target practice
  IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner']) THEN
    RAISE EXCEPTION 'Access denied: Only a verified practice owner can change the subscription plan'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 3. Lock subscription
  SELECT * INTO v_sub
  FROM public.practice_subscriptions
  WHERE practice_id = p_practice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found for practice %', p_practice_id
      USING ERRCODE = 'data_exception';
  END IF;

  IF v_sub.status = 'suspended' THEN
    RAISE EXCEPTION 'Practice is administratively suspended. Contact platform administration.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 4. Target plan validation
  SELECT * INTO v_target_plan
  FROM public.saas_plans
  WHERE plan_code::text = p_plan_code
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive SaaS plan: %', p_plan_code
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF NOT v_target_plan.is_public THEN
    RAISE EXCEPTION 'Plan % is not eligible for self-service plan change', p_plan_code
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 5. Billing interval validation
  IF p_billing_interval NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'Billing interval must be monthly or annual'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  v_interval := p_billing_interval::public.saas_billing_interval;

  -- 6. Capacity validation (practitioner count against target plan limit)
  SELECT count(*) INTO v_active_practitioners
  FROM public.practice_memberships
  WHERE practice_id = p_practice_id
    AND role IN ('physiotherapist', 'practice_owner')
    AND status = 'active';

  IF v_active_practitioners > v_target_plan.practitioner_seat_limit THEN
    RAISE EXCEPTION 'Cannot change practice to plan %: practice currently has % active practitioners, exceeding the target limit of % seats. Deactivate practitioners before changing plan.',
      v_target_plan.name, v_active_practitioners, v_target_plan.practitioner_seat_limit
      USING ERRCODE = 'check_violation';
  END IF;

  -- 7. Get current plan details
  SELECT * INTO v_current_plan
  FROM public.saas_plans
  WHERE id = v_sub.plan_id;

  -- Derive prices
  IF v_interval = 'annual' THEN
    v_target_price_cents := v_target_plan.annual_price_cents;
  ELSE
    v_target_price_cents := v_target_plan.monthly_price_cents;
  END IF;

  v_current_price_cents := v_sub.current_price_cents;

  -- Evaluate if downgrade
  -- Downgrade if: target seat limit < current seat limit OR (target seat limit == current seat limit AND target price < current price)
  v_is_downgrade := (v_target_plan.practitioner_seat_limit < v_current_plan.practitioner_seat_limit)
                    OR (v_target_plan.practitioner_seat_limit = v_current_plan.practitioner_seat_limit AND v_target_price_cents < v_current_price_cents);

  -- 8. Execution branches based on subscription status
  IF v_sub.status = 'trialing' THEN
    -- In trial mode, switch plan immediately (no payment was collected yet)
    UPDATE public.practice_subscriptions
    SET
      plan_id = v_target_plan.id,
      billing_interval = v_interval,
      seat_limit = v_target_plan.practitioner_seat_limit,
      current_price_cents = v_target_price_cents,
      currency = v_target_plan.currency,
      pending_plan_id = NULL,
      pending_billing_interval = NULL,
      updated_at = now()
    WHERE id = v_sub.id;

    v_audit_id := public.log_audit_event(
      p_practice_id,
      'practice.plan_changed',
      'practice_subscriptions',
      v_sub.id,
      jsonb_build_object(
        'action', 'trial_plan_change',
        'previous_plan_code', v_current_plan.plan_code,
        'new_plan_code', p_plan_code,
        'billing_interval', p_billing_interval,
        'seat_limit', v_target_plan.practitioner_seat_limit,
        'reason', trim(p_reason)
      ),
      'self_service_rpc'
    );

    RETURN jsonb_build_object(
      'success', true,
      'action', 'immediate_trial_plan_change',
      'plan_code', p_plan_code,
      'plan_name', v_target_plan.name,
      'seat_limit', v_target_plan.practitioner_seat_limit,
      'billing_interval', p_billing_interval,
      'effective_at', now(),
      'audit_event_id', v_audit_id
    );

  ELSIF v_sub.status = 'active' THEN
    IF v_is_downgrade THEN
      -- DOWNGRADE: Schedule for end of current paid period
      -- Preserve current plan and seat entitlement until current_period_end!
      UPDATE public.practice_subscriptions
      SET
        pending_plan_id = v_target_plan.id,
        pending_billing_interval = v_interval,
        updated_at = now()
      WHERE id = v_sub.id;

      v_audit_id := public.log_audit_event(
        p_practice_id,
        'practice.plan_change_scheduled',
        'practice_subscriptions',
        v_sub.id,
        jsonb_build_object(
          'action', 'scheduled_downgrade',
          'current_plan_code', v_current_plan.plan_code,
          'target_plan_code', p_plan_code,
          'target_billing_interval', p_billing_interval,
          'effective_date', v_sub.current_period_end,
          'reason', trim(p_reason)
        ),
        'self_service_rpc'
      );

      RETURN jsonb_build_object(
        'success', true,
        'action', 'scheduled_downgrade',
        'current_plan_code', v_current_plan.plan_code,
        'target_plan_code', p_plan_code,
        'target_plan_name', v_target_plan.name,
        'target_seat_limit', v_target_plan.practitioner_seat_limit,
        'target_billing_interval', p_billing_interval,
        'effective_at', v_sub.current_period_end,
        'message', 'Plan downgrade scheduled. Current entitlement remains active until ' || to_char(v_sub.current_period_end, 'YYYY-MM-DD HH24:MI:SS TZ'),
        'audit_event_id', v_audit_id
      );

    ELSE
      -- UPGRADE: Requires payment before activation!
      -- Set pending target plan and initiate payment invoice
      UPDATE public.practice_subscriptions
      SET
        pending_plan_id = v_target_plan.id,
        pending_billing_interval = v_interval,
        updated_at = now()
      WHERE id = v_sub.id;

      -- Generate invoice for the upgrade
      v_inv_result := public.initiate_practice_subscription_payment(
        p_practice_id,
        p_plan_code,
        p_billing_interval
      );

      v_audit_id := public.log_audit_event(
        p_practice_id,
        'practice.plan_change_requested',
        'practice_subscriptions',
        v_sub.id,
        jsonb_build_object(
          'action', 'upgrade_requested',
          'current_plan_code', v_current_plan.plan_code,
          'target_plan_code', p_plan_code,
          'target_billing_interval', p_billing_interval,
          'invoice_id', v_inv_result->>'invoice_id',
          'amount_cents', (v_inv_result->>'amount_cents')::bigint,
          'reason', trim(p_reason)
        ),
        'self_service_rpc'
      );

      RETURN jsonb_build_object(
        'success', true,
        'action', 'upgrade_payment_required',
        'current_plan_code', v_current_plan.plan_code,
        'target_plan_code', p_plan_code,
        'target_plan_name', v_target_plan.name,
        'target_seat_limit', v_target_plan.practitioner_seat_limit,
        'invoice_id', v_inv_result->>'invoice_id',
        'invoice_number', v_inv_result->>'invoice_number',
        'amount_cents', (v_inv_result->>'amount_cents')::bigint,
        'currency', v_inv_result->>'currency',
        'message', 'Upgrade invoice generated. Upgraded plan will activate upon payment settlement.',
        'audit_event_id', v_audit_id
      );
    END IF;

  ELSE
    -- Other statuses (expired, past_due): generate payment invoice for the chosen plan
    UPDATE public.practice_subscriptions
    SET
      pending_plan_id = v_target_plan.id,
      pending_billing_interval = v_interval,
      updated_at = now()
    WHERE id = v_sub.id;

    v_inv_result := public.initiate_practice_subscription_payment(
      p_practice_id,
      p_plan_code,
      p_billing_interval
    );

    RETURN jsonb_build_object(
      'success', true,
      'action', 'resubscription_payment_required',
      'target_plan_code', p_plan_code,
      'invoice_id', v_inv_result->>'invoice_id',
      'invoice_number', v_inv_result->>'invoice_number',
      'amount_cents', (v_inv_result->>'amount_cents')::bigint,
      'currency', v_inv_result->>'currency',
      'message', 'Invoice generated. Subscription will activate upon payment settlement.'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 4. RPC: cancel_practice_subscription
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_practice_subscription(
  p_practice_id uuid,
  p_reason text DEFAULT 'Practice owner requested cancellation'
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_sub record;
  v_audit_id uuid;
BEGIN
  -- 1. Authentication check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to cancel subscription'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Authorization check: caller must be practice_owner
  IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner']) THEN
    RAISE EXCEPTION 'Access denied: Only a verified practice owner can cancel the subscription'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 3. Lock subscription
  SELECT * INTO v_sub
  FROM public.practice_subscriptions
  WHERE practice_id = p_practice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found for practice %', p_practice_id
      USING ERRCODE = 'data_exception';
  END IF;

  -- 4. Idempotency: if already cancelled or already scheduled for cancellation
  IF v_sub.status = 'cancelled' OR (v_sub.status = 'active' AND v_sub.cancel_at_period_end = true) THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_idempotent', true,
      'status', v_sub.status,
      'cancel_at_period_end', v_sub.cancel_at_period_end,
      'effective_at', CASE WHEN v_sub.status = 'active' THEN v_sub.current_period_end ELSE v_sub.cancelled_at END,
      'message', 'Subscription is already scheduled for cancellation or cancelled'
    );
  END IF;

  -- 5. Cancellation semantics:
  IF v_sub.status = 'trialing' THEN
    -- Trial cancellation is immediate
    UPDATE public.practice_subscriptions
    SET
      status = 'cancelled',
      cancel_at_period_end = true,
      cancelled_at = now(),
      updated_at = now()
    WHERE id = v_sub.id;

    UPDATE public.practices
    SET
      status = 'suspended',
      updated_at = now()
    WHERE id = p_practice_id;

    v_audit_id := public.log_audit_event(
      p_practice_id,
      'practice.subscription_cancelled',
      'practice_subscriptions',
      v_sub.id,
      jsonb_build_object(
        'type', 'immediate_trial_cancellation',
        'previous_status', 'trialing',
        'cancelled_at', now(),
        'reason', trim(p_reason)
      ),
      'self_service_rpc'
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', 'cancelled',
      'cancel_at_period_end', true,
      'effective_at', now(),
      'message', 'Trial subscription successfully cancelled. Workspace write access terminated.',
      'audit_event_id', v_audit_id
    );

  ELSIF v_sub.status = 'active' THEN
    -- Paid subscription: schedule cancellation at end of paid period
    -- Clinical write access and active status are preserved until current_period_end!
    UPDATE public.practice_subscriptions
    SET
      cancel_at_period_end = true,
      cancelled_at = now(),
      updated_at = now()
    WHERE id = v_sub.id;

    v_audit_id := public.log_audit_event(
      p_practice_id,
      'practice.subscription_cancelled',
      'practice_subscriptions',
      v_sub.id,
      jsonb_build_object(
        'type', 'period_end_cancellation',
        'previous_status', 'active',
        'effective_at', v_sub.current_period_end,
        'reason', trim(p_reason)
      ),
      'self_service_rpc'
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', 'active',
      'cancel_at_period_end', true,
      'effective_at', v_sub.current_period_end,
      'message', 'Subscription cancellation scheduled. Clinical access continues until ' || to_char(v_sub.current_period_end, 'YYYY-MM-DD HH24:MI:SS TZ'),
      'audit_event_id', v_audit_id
    );

  ELSE
    -- Expired or past_due: set to cancelled immediately
    UPDATE public.practice_subscriptions
    SET
      status = 'cancelled',
      cancel_at_period_end = true,
      cancelled_at = now(),
      updated_at = now()
    WHERE id = v_sub.id;

    v_audit_id := public.log_audit_event(
      p_practice_id,
      'practice.subscription_cancelled',
      'practice_subscriptions',
      v_sub.id,
      jsonb_build_object(
        'type', 'immediate_lapsed_cancellation',
        'previous_status', v_sub.status,
        'cancelled_at', now(),
        'reason', trim(p_reason)
      ),
      'self_service_rpc'
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', 'cancelled',
      'cancel_at_period_end', true,
      'effective_at', now(),
      'message', 'Lapsed subscription marked as cancelled.',
      'audit_event_id', v_audit_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 5. RPC: reactivate_practice_subscription
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reactivate_practice_subscription(
  p_practice_id uuid,
  p_reason text DEFAULT 'Practice owner requested reactivation'
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_sub record;
  v_audit_id uuid;
BEGIN
  -- 1. Authentication check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to reactivate subscription'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Authorization check: caller must be practice_owner
  IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner']) THEN
    RAISE EXCEPTION 'Access denied: Only a verified practice owner can reactivate the subscription'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 3. Lock subscription
  SELECT * INTO v_sub
  FROM public.practice_subscriptions
  WHERE practice_id = p_practice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found for practice %', p_practice_id
      USING ERRCODE = 'data_exception';
  END IF;

  -- 4. Reactivation evaluation
  -- Case A: Subscription is ACTIVE with cancel_at_period_end = true AND current paid period is still valid
  IF v_sub.status = 'active' AND v_sub.cancel_at_period_end = true AND v_sub.current_period_end > now() THEN
    UPDATE public.practice_subscriptions
    SET
      cancel_at_period_end = false,
      cancelled_at = NULL,
      updated_at = now()
    WHERE id = v_sub.id;

    v_audit_id := public.log_audit_event(
      p_practice_id,
      'practice.subscription_reactivated',
      'practice_subscriptions',
      v_sub.id,
      jsonb_build_object(
        'type', 'period_end_cancellation_reversed',
        'current_period_end', v_sub.current_period_end,
        'reason', trim(p_reason)
      ),
      'self_service_rpc'
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', 'active',
      'cancel_at_period_end', false,
      'current_period_end', v_sub.current_period_end,
      'message', 'Subscription successfully reactivated. Renewal schedule restored.',
      'audit_event_id', v_audit_id
    );

  ELSIF v_sub.status = 'active' AND v_sub.cancel_at_period_end = false THEN
    -- Already active and not scheduled for cancellation
    RETURN jsonb_build_object(
      'success', true,
      'is_idempotent', true,
      'status', 'active',
      'cancel_at_period_end', false,
      'message', 'Subscription is already active and not scheduled for cancellation'
    );

  ELSE
    -- Subscription has already expired, lapsed, or was cancelled immediately:
    -- Cannot silently reactivate without valid payment!
    RETURN jsonb_build_object(
      'success', false,
      'requires_payment', true,
      'status', v_sub.status,
      'message', 'Paid period has elapsed. A subscription payment is required to restore access.'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 6. ENHANCE process_subscription_payment_settlement (PROMOTES PENDING PLAN)
-- ------------------------------------------------------------------------------
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
  v_target_plan record;
  v_payment_id uuid;
  v_new_period_start timestamptz;
  v_new_period_end timestamptz;
  v_new_plan_id uuid;
  v_new_seat_limit integer;
  v_new_price_cents bigint;
  v_new_interval public.saas_billing_interval;
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

  -- 5. Promote pending plan if set (e.g. from an upgrade)
  IF v_sub.pending_plan_id IS NOT NULL THEN
    SELECT * INTO v_target_plan FROM public.saas_plans WHERE id = v_sub.pending_plan_id;
    IF FOUND THEN
      v_new_plan_id := v_target_plan.id;
      v_new_seat_limit := v_target_plan.practitioner_seat_limit;
      v_new_interval := COALESCE(v_sub.pending_billing_interval, v_sub.billing_interval);
      IF v_new_interval = 'annual' THEN
        v_new_price_cents := v_target_plan.annual_price_cents;
      ELSE
        v_new_price_cents := v_target_plan.monthly_price_cents;
      END IF;
    ELSE
      v_new_plan_id := v_sub.plan_id;
      v_new_seat_limit := v_sub.seat_limit;
      v_new_price_cents := v_sub.current_price_cents;
      v_new_interval := v_sub.billing_interval;
    END IF;
  ELSE
    v_new_plan_id := v_sub.plan_id;
    v_new_seat_limit := v_sub.seat_limit;
    v_new_price_cents := v_sub.current_price_cents;
    v_new_interval := v_sub.billing_interval;
  END IF;

  -- 6. Record Payment in ledger
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

  -- 7. Mark Invoice Paid
  UPDATE public.saas_invoices
  SET status = 'paid',
      paid_at = now(),
      updated_at = now()
  WHERE id = v_inv.id;

  -- 8. Advance Subscription to ACTIVE & Apply promoted plan
  UPDATE public.practice_subscriptions
  SET status = 'active',
      plan_id = v_new_plan_id,
      seat_limit = v_new_seat_limit,
      current_price_cents = v_new_price_cents,
      billing_interval = v_new_interval,
      pending_plan_id = NULL,
      pending_billing_interval = NULL,
      cancel_at_period_end = false,
      cancelled_at = NULL,
      current_period_start = v_new_period_start,
      current_period_end = v_new_period_end,
      grace_period_ends_at = NULL,
      gateway_auth_token = COALESCE(p_auth_token, gateway_auth_token),
      updated_at = now()
  WHERE id = v_sub.id;

  -- 9. Ensure Practice Operational Status is Active
  UPDATE public.practices
  SET status = 'active',
      updated_at = now()
  WHERE id = v_inv.practice_id;

  -- 10. Audit Event
  PERFORM public.log_audit_event(
    v_inv.practice_id,
    'subscription.payment_confirmed',
    'saas_payments',
    v_payment_id,
    jsonb_build_object(
      'amount_cents', p_amount_cents,
      'reference', p_gateway_reference,
      'plan_id', v_new_plan_id,
      'seat_limit', v_new_seat_limit,
      'new_period_end', v_new_period_end
    ),
    'webhook_settlement'
  );

  RETURN jsonb_build_object(
    'status', 'settled',
    'invoice_id', v_inv.id,
    'payment_id', v_payment_id,
    'plan_id', v_new_plan_id,
    'seat_limit', v_new_seat_limit,
    'new_period_end', v_new_period_end
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 7. FUNCTION PERMISSIONS & ACCESS CONTROL
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.initiate_practice_subscription_payment FROM anon, public;
GRANT EXECUTE ON FUNCTION public.initiate_practice_subscription_payment TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.self_service_change_plan FROM anon, public;
GRANT EXECUTE ON FUNCTION public.self_service_change_plan TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.cancel_practice_subscription FROM anon, public;
GRANT EXECUTE ON FUNCTION public.cancel_practice_subscription TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.reactivate_practice_subscription FROM anon, public;
GRANT EXECUTE ON FUNCTION public.reactivate_practice_subscription TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.process_subscription_payment_settlement FROM anon, public;
GRANT EXECUTE ON FUNCTION public.process_subscription_payment_settlement TO service_role;
