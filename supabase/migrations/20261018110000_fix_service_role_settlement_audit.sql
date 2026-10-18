-- ==============================================================================
-- PHYSENRA SAAS — SERVICE ROLE SETTLEMENT AUDIT INTEGRITY FIX
-- Migration: 20261018110000_fix_service_role_settlement_audit.sql
--
-- Governs:
-- 1. Permits service_role / system callers to record audit events when auth.uid() is null.
-- 2. Hardens process_subscription_payment_settlement with resilient exception handling
--    around audit event emission to prevent rollback of verified financial settlements.
-- 3. Strictly preserves audit immutability, tenant isolation, and actor verification.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. OVERLOAD log_audit_event (EXPLICIT practice_id) TO SUPPORT service_role
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_practice_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID DEFAULT NULL::UUID,
    p_metadata JSONB DEFAULT '{}'::JSONB,
    p_source TEXT DEFAULT 'web'::TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
    v_audit_id UUID;
    v_headers JSONB;
    v_ip INET;
    v_user_agent TEXT;
    v_is_service_role BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    v_is_service_role := (
        COALESCE(auth.role(), '') = 'service_role' OR
        current_user IN ('postgres', 'service_role', 'supabase_admin') OR
        COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    );

    IF v_user_id IS NULL THEN
        IF v_is_service_role THEN
            v_role := 'service_role';
        ELSE
            RAISE EXCEPTION 'Authentication required to record audit event'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    IF p_action IS NULL OR TRIM(p_action) = '' THEN
        RAISE EXCEPTION 'Audit action parameter cannot be empty'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF p_entity_type IS NULL OR TRIM(p_entity_type) = '' THEN
        RAISE EXCEPTION 'Audit entity_type parameter cannot be empty'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Actor role derived from active membership if user_id is present
    IF v_user_id IS NOT NULL THEN
        IF p_practice_id IS NOT NULL THEN
            SELECT role INTO v_role
            FROM public.practice_memberships
            WHERE practice_id = p_practice_id
              AND user_id = v_user_id
              AND status = 'active'
            ORDER BY 
                CASE role
                    WHEN 'practice_owner' THEN 1
                    WHEN 'practice_manager' THEN 2
                    WHEN 'physiotherapist' THEN 3
                    WHEN 'receptionist' THEN 4
                    WHEN 'accountant' THEN 5
                    WHEN 'patient' THEN 6
                    ELSE 7
                END
            LIMIT 1;
        ELSIF public.is_platform_admin() THEN
            v_role := 'platform_admin';
        ELSE
            v_role := NULL;
        END IF;
    END IF;

    -- Extract network metadata safely if available
    BEGIN
        v_headers := current_setting('request.headers', true)::JSONB;
        IF v_headers IS NOT NULL THEN
            v_user_agent := v_headers ->> 'user-agent';
            BEGIN
                v_ip := (split_part(v_headers ->> 'x-forwarded-for', ',', 1))::INET;
            EXCEPTION WHEN OTHERS THEN
                v_ip := NULL;
            END;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_headers := NULL;
        v_ip := NULL;
        v_user_agent := NULL;
    END;

    INSERT INTO public.audit_events (
        practice_id,
        actor_user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata,
        source,
        ip_address,
        user_agent,
        created_at
    )
    VALUES (
        p_practice_id,
        v_user_id,
        v_role,
        TRIM(p_action),
        TRIM(p_entity_type),
        p_entity_id,
        COALESCE(p_metadata, '{}'::JSONB),
        COALESCE(p_source, 'web'),
        v_ip,
        v_user_agent,
        now()
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. OVERLOAD log_audit_event (IMPLICIT practice context) TO SUPPORT service_role
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action text,
    p_entity_type text,
    p_entity_id uuid DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb,
    p_source text DEFAULT 'web'
)
RETURNS uuid AS $$
DECLARE
    v_user_id uuid;
    v_practice_id uuid;
    v_role text;
    v_audit_id uuid;
    v_headers jsonb;
    v_ip inet;
    v_user_agent text;
    v_is_service_role boolean;
BEGIN
    v_user_id := auth.uid();
    v_is_service_role := (
        COALESCE(auth.role(), '') = 'service_role' OR
        current_user IN ('postgres', 'service_role', 'supabase_admin') OR
        COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    );

    IF v_user_id IS NULL THEN
        IF v_is_service_role THEN
            v_role := 'service_role';
        ELSE
            RAISE EXCEPTION 'Authentication required to record audit event'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    IF p_action IS NULL OR TRIM(p_action) = '' THEN
        RAISE EXCEPTION 'Audit action parameter cannot be empty'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF p_entity_type IS NULL OR TRIM(p_entity_type) = '' THEN
        RAISE EXCEPTION 'Audit entity_type parameter cannot be empty'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Practice context is resolved through the trusted helper
    v_practice_id := public.current_practice_id();

    IF v_user_id IS NOT NULL THEN
        IF v_practice_id IS NOT NULL THEN
            SELECT role INTO v_role
            FROM public.practice_memberships
            WHERE practice_id = v_practice_id
              AND user_id = v_user_id
              AND status = 'active'
            ORDER BY 
                CASE role
                    WHEN 'practice_owner' THEN 1
                    WHEN 'practice_manager' THEN 2
                    WHEN 'physiotherapist' THEN 3
                    WHEN 'receptionist' THEN 4
                    WHEN 'accountant' THEN 5
                    WHEN 'patient' THEN 6
                    ELSE 7
                END
            LIMIT 1;
        ELSIF public.is_platform_admin() THEN
            v_role := 'platform_admin';
        ELSE
            v_role := NULL;
        END IF;
    END IF;

    -- Extract network metadata safely if available
    BEGIN
        v_headers := current_setting('request.headers', true)::jsonb;
        IF v_headers IS NOT NULL THEN
            v_user_agent := v_headers ->> 'user-agent';
            BEGIN
                v_ip := (split_part(v_headers ->> 'x-forwarded-for', ',', 1))::inet;
            EXCEPTION WHEN OTHERS THEN
                v_ip := NULL;
            END;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_headers := NULL;
        v_ip := NULL;
        v_user_agent := NULL;
    END;

    INSERT INTO public.audit_events (
        practice_id,
        actor_user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata,
        source,
        ip_address,
        user_agent,
        created_at
    )
    VALUES (
        v_practice_id,
        v_user_id,
        v_role,
        TRIM(p_action),
        TRIM(p_entity_type),
        p_entity_id,
        COALESCE(p_metadata, '{}'::jsonb),
        COALESCE(p_source, 'web'),
        v_ip,
        v_user_agent,
        now()
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 3. HARDEN process_subscription_payment_settlement WITH AUDIT RESILIENCE
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

  -- 10. Audit Event (Resilient to non-blocking audit logging failures)
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    -- Fallback audit insert ensuring the financial settlement is never rolled back
    BEGIN
      INSERT INTO public.audit_events (
        practice_id,
        actor_user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata,
        source,
        created_at
      ) VALUES (
        v_inv.practice_id,
        auth.uid(),
        'service_role',
        'subscription.payment_confirmed',
        'saas_payments',
        v_payment_id,
        jsonb_build_object(
          'amount_cents', p_amount_cents,
          'reference', p_gateway_reference,
          'plan_id', v_new_plan_id,
          'seat_limit', v_new_seat_limit,
          'new_period_end', v_new_period_end,
          'audit_fallback_error', SQLERRM
        ),
        'webhook_settlement',
        now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- In the worst-case scenario, do not abort the committed financial payment
      NULL;
    END;
  END;

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

REVOKE EXECUTE ON FUNCTION public.process_subscription_payment_settlement FROM anon, public;
GRANT EXECUTE ON FUNCTION public.process_subscription_payment_settlement TO service_role;

-- ------------------------------------------------------------------------------
-- 4. Record Migration & Reload Schema Cache
-- ------------------------------------------------------------------------------
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20261018110000', 'fix_service_role_settlement_audit')
ON CONFLICT (version) DO NOTHING;

NOTIFY pgrst, 'reload schema';
