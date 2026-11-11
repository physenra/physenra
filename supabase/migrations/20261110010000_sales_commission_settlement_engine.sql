-- ==============================================================================
-- PHYSENRA SAAS — SALES REPRESENTATIVE & REFERRAL MANAGEMENT ENGINE V1
-- Migration: 20261110010000_sales_commission_settlement_engine.sql
--
-- Governs:
-- 1. public.evaluate_referral_commission (Authoritative 20% Commission Calculation)
-- 2. Enhanced public.process_subscription_payment_settlement (paid_at + Outbox Fallback)
-- 3. Enhanced public.register_practice_and_subscribe (Server-side Attribution & Validation)
-- 4. public.record_commission_adjustment (Idempotent Delta & Post-Payout Clawback Ledger)
-- 5. public.settle_payout_transfer_event (Isolated Paystack Transfer Event Processor)
-- 6. public.process_commission_outbox_batch (Background Queue Worker with Lease Protection)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. AUTHORITATIVE COMMISSION EVALUATION ENGINE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_referral_commission(
  p_payment_id uuid,
  p_practice_id uuid,
  p_paid_at timestamptz
)
RETURNS jsonb AS $$
DECLARE
  v_flag_record record;
  v_flag_enabled boolean;
  v_referral record;
  v_rep record;
  v_payment record;
  v_invoice record;
  v_existing_comm record;
  v_matched_comm record;
  v_prior_payment_count integer;
  v_interval public.saas_billing_interval;
  v_commissionable_gross bigint;
  v_existing_outbox record;
  v_tax_cents bigint;
  v_gateway_fee_cents bigint;
  v_net_eligible_cents bigint;
  v_rate_bps integer;
  v_raw_comm_cents bigint;
  v_original_comm_cents bigint;
  v_holding_expires_at timestamptz;
  v_commission_id uuid;
  v_init_status text;
  v_is_frozen boolean;
BEGIN
  -- A. Feature Flag Synchronization with 500ms Local Lock Timeout
  -- Fail-closed on missing (P0002), malformed (22023), or lock acquisition timeout (55P03).
  -- Generic query cancellation (57014) is never confused with lock timeout.
  BEGIN
    SET LOCAL lock_timeout = '500ms';
    SELECT value INTO v_flag_record
    FROM public.platform_settings
    WHERE key = 'sales_referrals_enabled'
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Platform setting sales_referrals_enabled not found'
        USING ERRCODE = 'P0002';
    END IF;

    IF v_flag_record.value IS NULL OR
       jsonb_typeof(v_flag_record.value) <> 'object' OR
       (v_flag_record.value->'enabled') IS NULL OR
       jsonb_typeof(v_flag_record.value->'enabled') <> 'boolean' THEN
      RAISE EXCEPTION 'Malformed value for sales_referrals_enabled: missing or invalid boolean "enabled"'
        USING ERRCODE = '22023';
    END IF;

    v_flag_enabled := (v_flag_record.value->>'enabled')::boolean;

  EXCEPTION
    WHEN lock_not_available THEN -- 55P03 specifically
      RAISE EXCEPTION 'Lock acquisition timeout (55P03) on platform_settings (sales_referrals_enabled)'
        USING ERRCODE = '55P03';
    WHEN query_canceled THEN -- 57014 specifically
      RAISE EXCEPTION 'Query canceled (57014) during platform_settings read'
        USING ERRCODE = '57014';
    WHEN OTHERS THEN
      RAISE;
  END;

  IF NOT v_flag_enabled THEN
    -- Disabled flag generates zero commissions and resolves outbox task cleanly
    UPDATE public.sales_commission_outbox
    SET status = 'resolved',
        resolved_at = now(),
        resolution_reason = 'Sales referrals feature flag is disabled: zero commission generated',
        updated_at = now()
    WHERE payment_id = p_payment_id;

    RETURN jsonb_build_object(
      'status', 'disabled',
      'commission_cents', 0,
      'reason', 'Sales referrals feature flag is disabled: zero commission generated'
    );
  END IF;

  -- B. Practice Attribution Row Lock & Practice-Level Serialization
  -- Concurrency safety: Serialize settlement evaluations for this practice to guarantee
  -- two concurrent payments cannot race to claim the first qualifying payment.
  PERFORM id FROM public.practices WHERE id = p_practice_id FOR UPDATE;

  SELECT * INTO v_referral
  FROM public.sales_referrals
  WHERE practice_id = p_practice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Practice has no referral attribution. Mark outbox resolved if present.
    UPDATE public.sales_commission_outbox
    SET status = 'resolved',
        resolved_at = now(),
        resolution_reason = 'Practice is not referred',
        updated_at = now()
    WHERE payment_id = p_payment_id;

    RETURN jsonb_build_object('status', 'not_referred', 'practice_id', p_practice_id);
  END IF;

  -- C. Referral Status Verification
  IF v_referral.status IN ('disqualified', 'expired') THEN
    UPDATE public.sales_commission_outbox
    SET status = 'resolved',
        resolved_at = now(),
        resolution_reason = 'Referral status is ' || v_referral.status || ': ' || COALESCE(v_referral.disqualification_reason, 'none'),
        updated_at = now()
    WHERE payment_id = p_payment_id;

    RETURN jsonb_build_object('status', 'disqualified_or_expired', 'referral_status', v_referral.status);
  END IF;

  -- D. Payment & Invoice Verification
  SELECT * INTO v_payment
  FROM public.saas_payments
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment record % not found', p_payment_id
      USING ERRCODE = 'data_exception';
  END IF;

  IF v_payment.status <> 'successful' THEN
    RAISE EXCEPTION 'Payment % is not in successful status (current status: %)', p_payment_id, v_payment.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_payment.practice_id <> p_practice_id THEN
    RAISE EXCEPTION 'Payment % practice (%) does not match supplied practice (%)',
      p_payment_id, v_payment.practice_id, p_practice_id
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_invoice
  FROM public.saas_invoices
  WHERE id = v_payment.invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice record % not found for payment %', v_payment.invoice_id, p_payment_id
      USING ERRCODE = 'data_exception';
  END IF;

  IF v_invoice.practice_id <> p_practice_id THEN
    RAISE EXCEPTION 'Invoice % practice (%) does not match supplied practice (%)',
      v_invoice.id, v_invoice.practice_id, p_practice_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_invoice.status <> 'paid' OR v_invoice.paid_at IS NULL THEN
    RAISE EXCEPTION 'Invoice % is not settled/paid', v_invoice.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_payment.currency <> v_invoice.currency THEN
    RAISE EXCEPTION 'Currency mismatch between payment % (%) and invoice % (%)',
      p_payment_id, v_payment.currency, v_invoice.id, v_invoice.currency
      USING ERRCODE = 'check_violation';
  END IF;

  -- Verify outbox task identity when present
  SELECT * INTO v_existing_outbox
  FROM public.sales_commission_outbox
  WHERE payment_id = p_payment_id;

  IF FOUND THEN
    IF v_existing_outbox.practice_id <> p_practice_id OR
       v_existing_outbox.invoice_id <> v_invoice.id OR
       (v_existing_outbox.referral_id IS NOT NULL AND v_existing_outbox.referral_id <> v_referral.id) THEN
      RAISE EXCEPTION 'Outbox task identity conflict for payment %', p_payment_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- E. Outbox Uniqueness & Deduplication Check
  -- Check if commission already recorded for this exact payment
  SELECT * INTO v_existing_comm
  FROM public.sales_commissions
  WHERE payment_id = p_payment_id;

  IF FOUND THEN
    UPDATE public.sales_commission_outbox
    SET status = 'resolved',
        resolved_at = now(),
        resolution_reason = 'Commission already recorded: ' || v_existing_comm.id::text,
        updated_at = now()
    WHERE payment_id = p_payment_id;

    RETURN jsonb_build_object('status', 'already_processed', 'commission_id', v_existing_comm.id);
  END IF;

  -- F. First Qualifying Payment Verification (Zero Commission on Renewals)
  -- If referral already qualified by a different payment:
  IF v_referral.qualifying_payment_id IS NOT NULL AND v_referral.qualifying_payment_id <> p_payment_id THEN
    -- Never resolve merely because referral is marked qualified; verify the original commission exists!
    SELECT c.id INTO v_matched_comm
    FROM public.sales_commissions c
    WHERE c.payment_id = v_referral.qualifying_payment_id AND c.referral_id = v_referral.id;

    IF FOUND THEN
      UPDATE public.sales_commission_outbox
      SET status = 'resolved',
          resolved_at = now(),
          resolution_reason = 'Renewal payment: zero commission during pilot (verified qualifying commission ' || v_matched_comm.id::text || ' on payment ' || v_referral.qualifying_payment_id::text || ')',
          updated_at = now()
      WHERE payment_id = p_payment_id;

      RETURN jsonb_build_object(
        'status', 'renewal_zero_commission',
        'qualifying_commission_id', v_matched_comm.id,
        'qualifying_payment_id', v_referral.qualifying_payment_id
      );
    ELSE
      -- Referral was marked qualified, but no commission exists for qualifying_payment_id!
      -- Do NOT mark outbox resolved! This is an integrity anomaly that must be surfaced and recovered.
      RAISE EXCEPTION 'Referral % marked qualified by payment % but no matching commission exists',
        v_referral.id, v_referral.qualifying_payment_id
        USING ERRCODE = 'data_exception';
    END IF;
  END IF;

  -- Check if prior successful payment exists for this practice
  SELECT count(*) INTO v_prior_payment_count
  FROM public.saas_payments
  WHERE practice_id = p_practice_id
    AND status = 'successful'
    AND id <> p_payment_id
    AND (paid_at < COALESCE(p_paid_at, v_payment.paid_at, v_payment.created_at) OR 
        (paid_at = COALESCE(p_paid_at, v_payment.paid_at, v_payment.created_at) AND created_at < v_payment.created_at));

  IF v_prior_payment_count > 0 THEN
    UPDATE public.sales_commission_outbox
    SET status = 'resolved',
        resolved_at = now(),
        resolution_reason = 'Prior successful payments exist (' || v_prior_payment_count || '): non-qualifying renewal',
        updated_at = now()
    WHERE payment_id = p_payment_id;

    RETURN jsonb_build_object('status', 'prior_payment_exists', 'prior_count', v_prior_payment_count);
  END IF;

  -- G. Representative Eligibility & Post-Termination Grace Period (14 Days / 336 Hours)
  SELECT * INTO v_rep
  FROM public.sales_representatives
  WHERE id = v_referral.sales_rep_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales representative % not found', v_referral.sales_rep_id
      USING ERRCODE = 'data_exception';
  END IF;

  IF v_rep.status = 'terminated' THEN
    IF v_rep.terminated_at IS NOT NULL AND 
       COALESCE(p_paid_at, v_payment.paid_at, now()) > (v_rep.terminated_at + interval '14 days') THEN
      -- Grace period expired
      UPDATE public.sales_referrals
      SET status = 'disqualified',
          disqualification_reason = 'Settlement occurred after 14-day post-termination grace period',
          updated_at = now()
      WHERE id = v_referral.id;

      UPDATE public.sales_commission_outbox
      SET status = 'resolved',
          resolved_at = now(),
          resolution_reason = 'Representative terminated and grace period expired',
          updated_at = now()
      WHERE payment_id = p_payment_id;

      RETURN jsonb_build_object('status', 'disqualified_terminated_grace_expired');
    END IF;
  END IF;

  -- H. First-Touch Attribution Window (30 Days)
  IF COALESCE(p_paid_at, v_payment.paid_at, now()) > (v_referral.attributed_at + interval '30 days') THEN
    UPDATE public.sales_referrals
    SET status = 'expired',
        disqualification_reason = 'First-touch attribution window expired (30 days)',
        updated_at = now()
    WHERE id = v_referral.id;

    UPDATE public.sales_commission_outbox
    SET status = 'resolved',
        resolved_at = now(),
        resolution_reason = 'First-touch attribution window expired (30 days)',
        updated_at = now()
    WHERE payment_id = p_payment_id;

    RETURN jsonb_build_object('status', 'attribution_window_expired');
  END IF;

  -- I. Financial Calculation & Pilot Cap (₦25,000 / 2,500,000 Kobo for Annual Plans)
  -- Enforce non-inflated commissionable gross to prevent overpayment inflation:
  v_commissionable_gross := LEAST(v_payment.amount_cents, v_invoice.total_cents);
  v_tax_cents := v_invoice.tax_cents;
  v_gateway_fee_cents := COALESCE(v_payment.gateway_fee_cents, 0);
  v_net_eligible_cents := GREATEST(0::bigint, v_commissionable_gross - v_tax_cents - v_gateway_fee_cents);
  v_rate_bps := v_rep.commission_rate_bps;
  v_raw_comm_cents := ROUND((v_net_eligible_cents * v_rate_bps)::numeric / 10000)::bigint;

  SELECT billing_interval INTO v_interval
  FROM public.practice_subscriptions
  WHERE id = v_invoice.subscription_id;

  IF v_interval = 'annual' THEN
    v_original_comm_cents := LEAST(v_raw_comm_cents, 2500000::bigint);
  ELSE
    v_original_comm_cents := v_raw_comm_cents;
  END IF;

  v_holding_expires_at := COALESCE(p_paid_at, v_payment.paid_at, now()) + interval '14 days';

  -- J. Suspension Separation: Incurred entitlement is recorded but held under investigation
  IF v_rep.status = 'suspended' THEN
    v_init_status := 'held_suspended';
    v_is_frozen := true;
  ELSE
    v_init_status := 'pending';
    v_is_frozen := false;
  END IF;

  -- K. Atomic Insert into sales_commissions
  BEGIN
    INSERT INTO public.sales_commissions (
      referral_id,
      sales_rep_id,
      invoice_id,
      payment_id,
      gross_amount_cents,
      tax_cents,
      gateway_fee_cents,
      net_eligible_cents,
      commission_rate_bps,
      original_commission_cents,
      currency,
      current_status,
      holding_expires_at,
      is_payout_frozen
    ) VALUES (
      v_referral.id,
      v_rep.id,
      v_invoice.id,
      p_payment_id,
      v_payment.amount_cents,
      v_tax_cents,
      v_gateway_fee_cents,
      v_net_eligible_cents,
      v_rate_bps,
      v_original_comm_cents,
      v_payment.currency,
      v_init_status,
      v_holding_expires_at,
      v_is_frozen
    ) RETURNING id INTO v_commission_id;

  EXCEPTION WHEN unique_violation THEN
    -- Distinguish payment uniqueness from referral uniqueness.
    -- Resolve outbox uniqueness conflicts only after verifying exact payment, referral and qualifying-payment identity.
    
    -- Case 1: Check if commission exists for this exact payment_id (Payment Uniqueness)
    SELECT c.id, c.referral_id, c.payment_id
    INTO v_matched_comm
    FROM public.sales_commissions c
    WHERE c.payment_id = p_payment_id;

    IF FOUND THEN
      -- Exact same payment and exact same referral: verified duplicate retry
      IF v_matched_comm.referral_id = v_referral.id THEN
        IF v_referral.qualifying_payment_id IS NULL OR v_referral.qualifying_payment_id = p_payment_id THEN
          UPDATE public.sales_referrals
          SET status = 'qualified',
              qualifying_payment_id = p_payment_id,
              qualified_at = COALESCE(qualified_at, p_paid_at, v_payment.paid_at, now()),
              updated_at = now()
          WHERE id = v_referral.id AND (qualifying_payment_id IS NULL OR qualifying_payment_id = p_payment_id);

          UPDATE public.sales_commission_outbox
          SET status = 'resolved',
              resolved_at = now(),
              resolution_reason = 'Verified idempotent duplicate: commission ' || v_matched_comm.id::text || ' for qualifying payment ' || p_payment_id::text,
              updated_at = now()
          WHERE payment_id = p_payment_id;

          RETURN jsonb_build_object(
            'status', 'already_processed',
            'duplicate_type', 'exact_payment_match',
            'commission_id', v_matched_comm.id,
            'payment_id', p_payment_id
          );
        END IF;
      END IF;

      -- If payment_id matched but referral_id belongs to a different referral:
      -- cross-referral collision. Re-raise!
      RAISE EXCEPTION 'Cross-referral payment identity mismatch: commission % has payment % with referral % but current referral is %',
        v_matched_comm.id, p_payment_id, v_matched_comm.referral_id, v_referral.id
        USING ERRCODE = 'unique_violation';
    END IF;

    -- Case 2: referral_id unique collision (different payment_id attempted for same referral)
    SELECT c.id, c.referral_id, c.payment_id
    INTO v_matched_comm
    FROM public.sales_commissions c
    WHERE c.referral_id = v_referral.id;

    IF FOUND THEN
      -- A commission already exists for this referral under a different payment.
      -- Distinguish an existing commission for the same qualifying payment from a subsequent non-commissionable renewal:
      -- Verify the existing commission belongs to this referral and matches the referral's qualifying_payment_id.
      IF v_referral.qualifying_payment_id = v_matched_comm.payment_id THEN
        UPDATE public.sales_commission_outbox
        SET status = 'resolved',
            resolved_at = now(),
            resolution_reason = 'Subsequent payment: referral already qualified by verified commission ' || v_matched_comm.id::text || ' on payment ' || v_matched_comm.payment_id::text,
            updated_at = now()
        WHERE payment_id = p_payment_id;

        RETURN jsonb_build_object(
          'status', 'subsequent_payment_zero_commission',
          'duplicate_type', 'referral_already_qualified',
          'qualifying_commission_id', v_matched_comm.id,
          'qualifying_payment_id', v_matched_comm.payment_id
        );
      ELSE
        -- Referral qualifying_payment_id does not match the existing commission's payment! Integrity conflict: re-raise!
        RAISE EXCEPTION 'Referral commission conflict: existing commission % has payment % but referral qualifying_payment_id is %',
          v_matched_comm.id, v_matched_comm.payment_id, v_referral.qualifying_payment_id
          USING ERRCODE = 'unique_violation';
      END IF;
    END IF;

    -- Unrelated unique violation: re-raise
    RAISE;
  END;

  -- L. Append-Only Lifecycle Event
  INSERT INTO public.sales_commission_events (
    commission_id,
    from_status,
    to_status,
    event_type,
    reason,
    metadata
  ) VALUES (
    v_commission_id,
    'none',
    v_init_status,
    'created',
    'First qualifying subscription payment settled',
    jsonb_build_object(
      'payment_id', p_payment_id,
      'invoice_id', v_invoice.id,
      'gross_amount_cents', v_payment.amount_cents,
      'tax_cents', v_tax_cents,
      'gateway_fee_cents', v_gateway_fee_cents,
      'net_eligible_cents', v_net_eligible_cents,
      'original_commission_cents', v_original_comm_cents,
      'annual_capped', (v_interval = 'annual' AND v_raw_comm_cents > 2500000)
    )
  );

  -- M. Update Referral as Qualified
  UPDATE public.sales_referrals
  SET status = 'qualified',
      qualifying_payment_id = p_payment_id,
      qualified_at = COALESCE(p_paid_at, v_payment.paid_at, now()),
      updated_at = now()
  WHERE id = v_referral.id;

  -- N. Durably Resolve Outbox Task
  UPDATE public.sales_commission_outbox
  SET status = 'resolved',
      resolved_at = now(),
      resolution_reason = 'Commission successfully created: ' || v_commission_id::text,
      updated_at = now()
  WHERE payment_id = p_payment_id;

  RETURN jsonb_build_object(
    'status', 'commission_created',
    'commission_id', v_commission_id,
    'sales_rep_id', v_rep.id,
    'original_commission_cents', v_original_comm_cents,
    'initial_status', v_init_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.evaluate_referral_commission(uuid, uuid, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_referral_commission(uuid, uuid, timestamptz) TO service_role;

-- ------------------------------------------------------------------------------
-- 2. HARDENED process_subscription_payment_settlement (WITH OUTBOX FALLBACK)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_subscription_payment_settlement(
  p_invoice_id uuid,
  p_gateway public.saas_payment_gateway,
  p_gateway_reference text,
  p_amount_cents bigint,
  p_payment_method text,
  p_gateway_fee_cents bigint,
  p_auth_token text DEFAULT NULL,
  p_paid_at timestamptz DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_inv record;
  v_sub record;
  v_target_plan record;
  v_payment_id uuid;
  v_existing_payment_id uuid;
  v_existing_inv_id uuid;
  v_new_period_start timestamptz;
  v_new_period_end timestamptz;
  v_new_plan_id uuid;
  v_new_seat_limit integer;
  v_new_price_cents bigint;
  v_new_interval public.saas_billing_interval;
  v_paid_at timestamptz;
  v_existing_outbox record;
  v_eval_err text;
  v_referral_id uuid;
BEGIN
  v_paid_at := COALESCE(p_paid_at, now());

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

  IF v_inv.status IN ('void', 'uncollectible') THEN
    RAISE EXCEPTION 'Invoice % cannot be settled in status %', p_invoice_id, v_inv.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- Verify gateway reference uniqueness and duplicate webhook idempotency
  IF p_gateway_reference IS NOT NULL AND TRIM(p_gateway_reference) <> '' THEN
    SELECT id, invoice_id INTO v_existing_payment_id, v_existing_inv_id
    FROM public.saas_payments
    WHERE gateway_reference = TRIM(p_gateway_reference)
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'status', 'duplicate_reference',
        'invoice_id', v_existing_inv_id,
        'payment_id', v_existing_payment_id,
        'gateway_reference', p_gateway_reference
      );
    END IF;
  END IF;

  -- 2. Verify amount matches invoice total
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive: %', p_amount_cents
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_amount_cents < v_inv.total_cents THEN
    RAISE EXCEPTION 'Payment amount % is less than invoice total %', p_amount_cents, v_inv.total_cents
      USING ERRCODE = 'check_violation';
  END IF;

  -- 3. Lock subscription
  SELECT * INTO v_sub
  FROM public.practice_subscriptions
  WHERE id = v_inv.subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated practice subscription % not found for invoice %', v_inv.subscription_id, p_invoice_id
      USING ERRCODE = 'data_exception';
  END IF;

  IF v_sub.practice_id <> v_inv.practice_id THEN
    RAISE EXCEPTION 'Subscription practice mismatch: subscription % (practice %) does not match invoice practice %',
      v_sub.id, v_sub.practice_id, v_inv.practice_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- 4. Calculate new billing cycle
  v_new_period_start := GREATEST(v_paid_at, v_sub.current_period_end);
  IF v_sub.billing_interval = 'annual' THEN
    v_new_period_end := v_new_period_start + interval '1 year';
  ELSE
    v_new_period_end := v_new_period_start + interval '1 month';
  END IF;

  -- 5. Promote pending plan if set
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
    settled_at,
    paid_at
  ) VALUES (
    'PHY-PAY-' || to_char(v_paid_at, 'YYYY') || '-' || lpad(floor(random()*1000000)::text, 6, '0'),
    v_inv.id,
    v_inv.practice_id,
    p_amount_cents,
    v_inv.currency,
    p_payment_method,
    p_gateway,
    p_gateway_reference,
    p_gateway_fee_cents,
    'successful',
    now(),
    v_paid_at
  ) RETURNING id INTO v_payment_id;

  -- 7. Mark Invoice Paid (Triggers trg_freeze_paid_invoice_financials)
  UPDATE public.saas_invoices
  SET status = 'paid',
      paid_at = v_paid_at,
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
        'new_period_end', v_new_period_end,
        'paid_at', v_paid_at
      ),
      'webhook_settlement'
    );
  EXCEPTION WHEN OTHERS THEN
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
          'paid_at', v_paid_at,
          'audit_fallback_error', SQLERRM
        ),
        'webhook_settlement',
        now()
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;

  -- 11. Referral Commission Evaluation Hook (Failsafe & Durable Outbox Enqueue)
  BEGIN
    PERFORM public.evaluate_referral_commission(v_payment_id, v_inv.practice_id, v_paid_at);
  EXCEPTION WHEN OTHERS THEN
    v_eval_err := SQLERRM;

    -- Look up referral identity for this practice, if attribution exists
    SELECT id INTO v_referral_id
    FROM public.sales_referrals
    WHERE practice_id = v_inv.practice_id;

    -- In case of feature flag lock timeout, missing setting, or transient error,
    -- durably enqueue into sales_commission_outbox with strict identity validation
    -- so payment settlement is NEVER aborted while failed recovery is durably detectable.
    BEGIN
      SELECT * INTO v_existing_outbox
      FROM public.sales_commission_outbox
      WHERE payment_id = v_payment_id
      FOR UPDATE;

      IF NOT FOUND THEN
        INSERT INTO public.sales_commission_outbox (
          practice_id,
          invoice_id,
          payment_id,
          referral_id,
          status,
          last_error,
          next_retry_at
        ) VALUES (
          v_inv.practice_id,
          v_inv.id,
          v_payment_id,
          v_referral_id,
          'pending_retry',
          'Settlement evaluation fallback: ' || v_eval_err,
          now()
        );
      ELSE
        -- Verify ALL four identities before updating:
        -- 1. payment_id (guaranteed by WHERE payment_id = v_payment_id)
        -- 2. invoice_id
        -- 3. practice_id
        -- 4. referral identity (where referral attribution exists)
        IF v_existing_outbox.practice_id <> v_inv.practice_id OR
           v_existing_outbox.invoice_id <> v_inv.id OR
           (v_referral_id IS NOT NULL AND v_existing_outbox.referral_id IS NOT NULL AND v_existing_outbox.referral_id <> v_referral_id) OR
           (v_referral_id IS NOT NULL AND v_existing_outbox.referral_id IS NULL) THEN
          -- Identity conflict: do NOT overwrite unrelated task
          INSERT INTO public.platform_audit_logs (
            action,
            target_resource_type,
            target_resource_id,
            details
          ) VALUES (
            'commission_outbox.identity_conflict',
            'sales_commission_outbox',
            v_existing_outbox.id::text,
            jsonb_build_object(
              'error', 'Outbox task identity conflict on payment_id',
              'existing_outbox_id', v_existing_outbox.id,
              'existing_practice_id', v_existing_outbox.practice_id,
              'new_practice_id', v_inv.practice_id,
              'existing_invoice_id', v_existing_outbox.invoice_id,
              'new_invoice_id', v_inv.id,
              'existing_referral_id', v_existing_outbox.referral_id,
              'new_referral_id', v_referral_id,
              'payment_id', v_payment_id,
              'evaluation_error', v_eval_err
            )
          );
        ELSIF v_existing_outbox.status = 'resolved' THEN
          -- Task already completed/resolved: do NOT overwrite completed tasks
          NULL;
        ELSE
          -- Same identity and uncompleted task: update error and schedule retry
          UPDATE public.sales_commission_outbox
          SET status = 'pending_retry',
              referral_id = COALESCE(v_existing_outbox.referral_id, v_referral_id),
              last_error = 'Settlement evaluation fallback: ' || v_eval_err,
              next_retry_at = now(),
              updated_at = now()
          WHERE id = v_existing_outbox.id;
        END IF;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Do not silently swallow outbox insertion/update failures!
      -- Log durable operational monitoring alert into platform_audit_logs.
      -- Even if this audit insert also fails, customer payment settlement remains
      -- completely valid, and the reconciliation scanner independently recovers
      -- any uncommissioned payment lacking commission processing on its scheduled sweep.
      BEGIN
        INSERT INTO public.platform_audit_logs (
          action,
          target_resource_type,
          target_resource_id,
          details
        ) VALUES (
          'commission_outbox.fallback_failed',
          'saas_payments',
          v_payment_id::text,
          jsonb_build_object(
            'practice_id', v_inv.practice_id,
            'invoice_id', v_inv.id,
            'payment_id', v_payment_id,
            'referral_id', v_referral_id,
            'evaluation_error', v_eval_err,
            'outbox_error', SQLERRM,
            'requires_reconciliation', true
          )
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
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
-- 3. ENHANCED register_practice_and_subscribe (SERVER-AUTHORITATIVE ATTRIBUTION)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_practice_and_subscribe(
  p_practice_name text,
  p_slug text,
  p_plan_code public.saas_plan_code,
  p_billing_interval public.saas_billing_interval DEFAULT 'monthly',
  p_country text DEFAULT 'NG',
  p_timezone text DEFAULT 'Africa/Lagos',
  p_referral_code text DEFAULT NULL
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
  v_code_rec record;
  v_sanitized_code text;
  v_attribution_status text;
  v_disqual_reason text;
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

  -- 7. Initialize Tenant Counters
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

  -- 8. Server-Authoritative Referral Attribution
  IF p_referral_code IS NOT NULL AND TRIM(p_referral_code) <> '' THEN
    v_sanitized_code := UPPER(TRIM(p_referral_code));
    IF v_sanitized_code ~ '^[A-Z0-9_-]{4,32}$' THEN
      SELECT c.id AS code_id, c.sales_rep_id, r.status AS rep_status, 
             r.pilot_start_date, r.pilot_end_date, r.user_id AS rep_user_id
      INTO v_code_rec
      FROM public.sales_referral_codes c
      JOIN public.sales_representatives r ON c.sales_rep_id = r.id
      WHERE c.code = v_sanitized_code AND c.is_active = true;

      IF FOUND THEN
        -- Evaluate eligibility rules:
        -- Rule 1: Self-referral prohibition
        IF v_code_rec.rep_user_id IS NOT NULL AND v_code_rec.rep_user_id = v_user_id THEN
          v_attribution_status := 'disqualified';
          v_disqual_reason := 'Self-referral prohibited: registering user is the sales representative';
        -- Rule 2: Prior practice ownership prohibition
        ELSIF EXISTS (
          SELECT 1 FROM public.practice_memberships 
          WHERE user_id = v_user_id 
            AND role = 'practice_owner' 
            AND practice_id <> v_practice_id
        ) THEN
          v_attribution_status := 'disqualified';
          v_disqual_reason := 'Registering user previously owned an existing practice';
        -- Rule 3: Representative pilot active window (evaluated in Africa/Lagos business timezone)
        ELSIF (now() AT TIME ZONE 'Africa/Lagos')::date < v_code_rec.pilot_start_date OR 
              (now() AT TIME ZONE 'Africa/Lagos')::date > v_code_rec.pilot_end_date THEN
          v_attribution_status := 'disqualified';
          v_disqual_reason := 'Referral occurred outside representative pilot window';
        -- Rule 4: Active/Suspended status (Suspended retains attribution; payout holds applied at settlement)
        ELSIF v_code_rec.rep_status NOT IN ('active', 'suspended') THEN
          v_attribution_status := 'disqualified';
          v_disqual_reason := 'Sales representative status is ' || v_code_rec.rep_status;
        ELSE
          v_attribution_status := 'attributed';
          v_disqual_reason := NULL;
        END IF;

        INSERT INTO public.sales_referrals (
          practice_id,
          sales_rep_id,
          referral_code_id,
          attribution_type,
          status,
          disqualification_reason,
          attributed_at
        ) VALUES (
          v_practice_id,
          v_code_rec.sales_rep_id,
          v_code_rec.code_id,
          'code_link',
          v_attribution_status,
          v_disqual_reason,
          now()
        ) ON CONFLICT (practice_id) DO NOTHING;

        -- Audit referral attribution
        PERFORM public.log_audit_event(
          v_practice_id,
          'referral.attributed',
          'sales_referrals',
          v_practice_id,
          jsonb_build_object(
            'code', v_sanitized_code,
            'sales_rep_id', v_code_rec.sales_rep_id,
            'status', v_attribution_status,
            'disqualification_reason', v_disqual_reason
          ),
          'onboarding_rpc'
        );
      END IF;
    END IF;
  END IF;

  -- 9. Audit Events
  PERFORM public.log_audit_event(
    v_practice_id,
    'practice.created',
    'practices',
    v_practice_id,
    jsonb_build_object('name', p_practice_name, 'slug', p_slug, 'plan_code', p_plan_code),
    'onboarding_rpc'
  );

  PERFORM public.log_audit_event(
    v_practice_id,
    'subscription.created',
    'practice_subscriptions',
    v_subscription_id,
    jsonb_build_object('status', v_status, 'plan_code', p_plan_code),
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

-- ------------------------------------------------------------------------------
-- 4. IDEMPOTENT COMMISSION ADJUSTMENT & RECOVERY PROCEDURE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_commission_adjustment(
  p_payment_id uuid,
  p_adjustment_type text,
  p_refund_amount_cents bigint,
  p_source_system text,
  p_external_event_id text,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_comm record;
  v_delta bigint;
  v_raw_delta bigint;
  v_adj_id uuid;
  v_existing_adjusted_cents bigint;
  v_remaining_commission_cents bigint;
  v_actually_paid_cents bigint;
  v_existing_clawback_cents bigint;
  v_max_possible_clawback bigint;
  v_clawback_amount bigint;
BEGIN
  -- Validate caller authority
  IF NOT (COALESCE(public.is_platform_admin(), false) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Access Denied: Only Platform Admins or system services can record adjustments'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Validate parameter integrity
  IF p_source_system NOT IN ('paystack_webhook', 'manual_admin', 'banking_reversal') THEN
    RAISE EXCEPTION 'Unsupported source system for adjustment: %', p_source_system
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_external_event_id IS NULL OR TRIM(p_external_event_id) = '' THEN
    RAISE EXCEPTION 'Mandatory external event ID required for adjustment idempotency'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_refund_amount_cents <= 0 AND p_adjustment_type IN ('full_refund', 'partial_refund') THEN
    RAISE EXCEPTION 'Refund amount must be positive: %', p_refund_amount_cents
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_comm
  FROM public.sales_commissions
  WHERE payment_id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'no_commission_found', 'payment_id', p_payment_id);
  END IF;

  -- Calculate existing cumulative adjustments for this commission
  SELECT COALESCE(SUM(ABS(delta_amount_cents)), 0)
  INTO v_existing_adjusted_cents
  FROM public.sales_commission_adjustments
  WHERE commission_id = v_comm.id;

  v_remaining_commission_cents := GREATEST(0::bigint, v_comm.original_commission_cents - v_existing_adjusted_cents);

  IF v_remaining_commission_cents = 0 THEN
    RETURN jsonb_build_object('status', 'already_fully_adjusted', 'commission_id', v_comm.id);
  END IF;

  -- Calculate delta amount (negative adjustment to commission)
  IF p_adjustment_type IN ('full_refund', 'chargeback', 'payment_reversal') THEN
    v_raw_delta := v_remaining_commission_cents;
  ELSIF p_adjustment_type = 'partial_refund' THEN
    IF v_comm.gross_amount_cents > 0 THEN
      v_raw_delta := ROUND((p_refund_amount_cents::numeric / v_comm.gross_amount_cents::numeric) * v_comm.original_commission_cents)::bigint;
    ELSE
      v_raw_delta := 0;
    END IF;
  ELSE
    v_raw_delta := p_refund_amount_cents;
  END IF;

  -- Strictly cap adjustment delta at remaining commission
  v_delta := -LEAST(v_raw_delta, v_remaining_commission_cents);

  IF v_delta = 0 THEN
    RETURN jsonb_build_object('status', 'zero_delta');
  END IF;

  -- Insert adjustment record idempotently
  INSERT INTO public.sales_commission_adjustments (
    commission_id,
    sales_rep_id,
    adjustment_type,
    delta_amount_cents,
    source_system,
    external_event_id,
    reason,
    adjusted_by_user_id
  ) VALUES (
    v_comm.id,
    v_comm.sales_rep_id,
    p_adjustment_type,
    v_delta,
    p_source_system,
    p_external_event_id,
    p_reason,
    p_actor_id
  ) ON CONFLICT (commission_id, source_system, external_event_id) DO NOTHING
  RETURNING id INTO v_adj_id;

  IF v_adj_id IS NULL THEN
    RETURN jsonb_build_object('status', 'already_adjusted', 'external_event_id', p_external_event_id);
  END IF;

  -- Handle Post-Payout Clawback vs Pre-Payout Cancellation
  IF v_comm.current_status IN ('paid', 'partially_paid') THEN
    -- Calculate how much money the representative ACTUALLY received via settled allocations
    SELECT COALESCE(SUM(allocated_amount_cents), 0)
    INTO v_actually_paid_cents
    FROM public.sales_payout_allocations
    WHERE commission_id = v_comm.id
      AND allocation_status = 'settled';

    -- Calculate already recorded clawback debt for this commission
    SELECT COALESCE(SUM(amount_cents), 0)
    INTO v_existing_clawback_cents
    FROM public.sales_recovery_entries
    WHERE offset_commission_id = v_comm.id
      AND entry_type = 'clawback_debt';

    v_max_possible_clawback := GREATEST(0::bigint, v_actually_paid_cents - v_existing_clawback_cents);
    v_clawback_amount := LEAST(ABS(v_delta), v_max_possible_clawback);

    -- Only record clawback debt for funds actually received by representative
    IF v_clawback_amount > 0 THEN
      INSERT INTO public.sales_recovery_entries (
        sales_rep_id,
        source_system,
        source_reference_id,
        entry_type,
        amount_cents,
        offset_commission_id,
        actor_user_id
      ) VALUES (
        v_comm.sales_rep_id,
        'paystack_refund',
        p_external_event_id,
        'clawback_debt',
        v_clawback_amount,
        v_comm.id,
        p_actor_id
      ) ON CONFLICT (sales_rep_id, source_system, source_reference_id, entry_type) DO NOTHING;
    END IF;

    -- Update commission state machine projection:
    -- If cumulative adjustments cover original commission, transition to reversed.
    -- If partial, transition from paid to partially_paid.
    IF (v_existing_adjusted_cents + ABS(v_delta)) >= v_comm.original_commission_cents THEN
      PERFORM public.transition_commission_status(
        v_comm.id,
        'reversed',
        'post_payout_reversal',
        p_reason,
        p_actor_id,
        jsonb_build_object('clawback_amount_cents', v_clawback_amount, 'external_event_id', p_external_event_id)
      );
    ELSIF v_comm.current_status = 'paid' THEN
      PERFORM public.transition_commission_status(
        v_comm.id,
        'partially_paid',
        'manual_adjustment',
        p_reason,
        p_actor_id,
        jsonb_build_object('clawback_amount_cents', v_clawback_amount, 'external_event_id', p_external_event_id)
      );
    END IF;

  ELSIF v_comm.current_status IN ('pending', 'approved', 'held_suspended') THEN
    IF p_adjustment_type IN ('full_refund', 'chargeback', 'payment_reversal') THEN
      PERFORM public.transition_commission_status(
        v_comm.id,
        'cancelled',
        'refund_cancelled',
        p_reason,
        p_actor_id,
        jsonb_build_object('external_event_id', p_external_event_id)
      );
    ELSIF p_adjustment_type = 'dispute_opened' THEN
      PERFORM public.transition_commission_status(
        v_comm.id,
        'disputed',
        'dispute_opened',
        p_reason,
        p_actor_id,
        jsonb_build_object('external_event_id', p_external_event_id)
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('status', 'adjusted', 'delta_amount_cents', v_delta);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.record_commission_adjustment FROM anon, public;
GRANT EXECUTE ON FUNCTION public.record_commission_adjustment TO service_role;

-- ------------------------------------------------------------------------------
-- 5. PAYSTACK TRANSFER EVENT PROCESSOR (ALLOCATION ISOLATION & UNIQUE MAPPING)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.settle_payout_transfer_event(
  p_transfer_reference text,
  p_event_type text,
  p_reason text,
  p_external_event_id text,
  p_raw_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_payout record;
  v_alloc record;
  v_alloc_sum bigint;
  v_alloc_count integer;
BEGIN
  IF NOT (COALESCE(public.is_platform_admin(), false) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Access Denied: Only Platform Admins or system services can settle transfer events'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 1. STRICT UNIQUE LOOKUP: Query strictly by transfer_reference. Never use an OR lookup!
  SELECT * INTO v_payout
  FROM public.sales_commission_payouts
  WHERE transfer_reference = p_transfer_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Unmapped transfer reference: Quarantine for admin review
    INSERT INTO public.sales_adjustment_quarantine (
      event_type,
      source_reference,
      payload,
      reason
    ) VALUES (
      p_event_type,
      p_transfer_reference,
      p_raw_payload,
      'Unmapped transfer reference: ' || p_transfer_reference
    );

    RETURN jsonb_build_object('status', 'quarantined', 'reason', 'unmapped_transfer_reference');
  END IF;

  -- 2. Process transfer.success
  IF p_event_type = 'transfer.success' THEN
    IF v_payout.status = 'completed' THEN
      RETURN jsonb_build_object('status', 'already_completed', 'payout_id', v_payout.id);
    END IF;

    IF v_payout.status IN ('failed', 'cancelled') THEN
      -- Delayed or contradictory success event after failure: quarantine
      INSERT INTO public.sales_adjustment_quarantine (
        event_type,
        source_reference,
        payload,
        reason
      ) VALUES (
        p_event_type,
        p_transfer_reference,
        p_raw_payload,
        'Contradictory transfer.success received for payout in status ' || v_payout.status
      );

      RETURN jsonb_build_object('status', 'quarantined', 'reason', 'contradictory_state');
    END IF;

    -- Verify all allocations strictly belonging to this payout
    SELECT COALESCE(SUM(allocated_amount_cents), 0), count(*)
    INTO v_alloc_sum, v_alloc_count
    FROM public.sales_payout_allocations
    WHERE payout_id = v_payout.id
      AND allocation_status = 'reserved';

    IF v_alloc_count = 0 OR v_alloc_sum <> v_payout.total_amount_cents THEN
      INSERT INTO public.sales_adjustment_quarantine (
        event_type,
        source_reference,
        payload,
        reason
      ) VALUES (
        p_event_type,
        p_transfer_reference,
        p_raw_payload,
        'Allocation mismatch: reserved allocation sum (' || v_alloc_sum || ') does not match payout total (' || v_payout.total_amount_cents || ')'
      );

      RETURN jsonb_build_object('status', 'quarantined', 'reason', 'allocation_sum_mismatch');
    END IF;

    -- Verify allocation representative matches payout representative
    IF EXISTS (
      SELECT 1 FROM public.sales_payout_allocations a
      JOIN public.sales_commissions c ON a.commission_id = c.id
      WHERE a.payout_id = v_payout.id
        AND c.sales_rep_id <> v_payout.sales_rep_id
    ) THEN
      INSERT INTO public.sales_adjustment_quarantine (
        event_type,
        source_reference,
        payload,
        reason
      ) VALUES (
        p_event_type,
        p_transfer_reference,
        p_raw_payload,
        'Cross-representative allocation detected for payout ' || v_payout.id::text
      );

      RETURN jsonb_build_object('status', 'quarantined', 'reason', 'rep_mismatch');
    END IF;

    -- Mark payout completed
    UPDATE public.sales_commission_payouts
    SET status = 'completed',
        paid_at = now(),
        updated_at = now()
    WHERE id = v_payout.id;

    -- Settle allocations scoped strictly to this payout
    UPDATE public.sales_payout_allocations
    SET allocation_status = 'settled',
        settled_at = now()
    WHERE payout_id = v_payout.id;

    -- Transition commissions to paid
    FOR v_alloc IN SELECT commission_id FROM public.sales_payout_allocations WHERE payout_id = v_payout.id LOOP
      PERFORM public.transition_commission_status(
        v_alloc.commission_id,
        'paid',
        'payout_completed',
        'Paystack transfer ' || p_transfer_reference || ' confirmed successful',
        NULL,
        jsonb_build_object('transfer_reference', p_transfer_reference, 'external_event_id', p_external_event_id)
      );
    END LOOP;

    RETURN jsonb_build_object('status', 'completed', 'payout_id', v_payout.id);

  -- 3. Process transfer.failed
  ELSIF p_event_type = 'transfer.failed' THEN
    IF v_payout.status = 'completed' THEN
      -- Cannot fail an already completed transfer: quarantine
      INSERT INTO public.sales_adjustment_quarantine (
        event_type,
        source_reference,
        payload,
        reason
      ) VALUES (
        p_event_type,
        p_transfer_reference,
        p_raw_payload,
        'transfer.failed received for already completed payout ' || v_payout.id::text
      );

      RETURN jsonb_build_object('status', 'quarantined', 'reason', 'failed_after_completion');
    END IF;

    UPDATE public.sales_commission_payouts
    SET status = 'failed',
        failure_reason = p_reason,
        updated_at = now()
    WHERE id = v_payout.id;

    -- Release allocations so commissions can be paid in a subsequent run
    UPDATE public.sales_payout_allocations
    SET allocation_status = 'released',
        released_at = now()
    WHERE payout_id = v_payout.id;

    -- Transition commissions back to approved
    FOR v_alloc IN SELECT commission_id FROM public.sales_payout_allocations WHERE payout_id = v_payout.id LOOP
      PERFORM public.transition_commission_status(
        v_alloc.commission_id,
        'approved',
        'batch_released',
        'Paystack transfer failed: ' || p_reason,
        NULL,
        jsonb_build_object('transfer_reference', p_transfer_reference, 'external_event_id', p_external_event_id)
      );
    END LOOP;

    RETURN jsonb_build_object('status', 'failed', 'payout_id', v_payout.id);

  -- 4. Process transfer.reversed
  ELSIF p_event_type = 'transfer.reversed' THEN
    IF v_payout.status = 'cancelled' THEN
      RETURN jsonb_build_object('status', 'already_reversed', 'payout_id', v_payout.id);
    END IF;

    IF v_payout.status <> 'completed' THEN
      INSERT INTO public.sales_adjustment_quarantine (
        event_type,
        source_reference,
        payload,
        reason
      ) VALUES (
        p_event_type,
        p_transfer_reference,
        p_raw_payload,
        'Contradictory transfer.reversed received for payout in status ' || v_payout.status
      );

      RETURN jsonb_build_object('status', 'quarantined', 'reason', 'contradictory_reversal_state');
    END IF;

    -- Funds returned to Paystack balance by recipient bank
    INSERT INTO public.sales_recovery_entries (
      sales_rep_id,
      source_system,
      source_reference_id,
      entry_type,
      amount_cents
    ) VALUES (
      v_payout.sales_rep_id,
      'paystack_transfer_reversal',
      p_transfer_reference,
      'reversal_offset',
      v_payout.total_amount_cents
    ) ON CONFLICT (sales_rep_id, source_system, source_reference_id, entry_type) DO NOTHING;

    -- Update payout status to cancelled and log reversal notes
    UPDATE public.sales_commission_payouts
    SET status = 'cancelled',
        notes = COALESCE(notes || E'\n', '') || 'Transfer reversed by bank: ' || p_reason,
        updated_at = now()
    WHERE id = v_payout.id;

    -- Release allocations so commissions can be re-disbursed
    UPDATE public.sales_payout_allocations
    SET allocation_status = 'released',
        released_at = now()
    WHERE payout_id = v_payout.id;

    -- Transition commissions back to approved
    FOR v_alloc IN SELECT commission_id FROM public.sales_payout_allocations WHERE payout_id = v_payout.id LOOP
      PERFORM public.transition_commission_status(
        v_alloc.commission_id,
        'approved',
        'batch_released',
        'Paystack transfer reversed by bank: ' || p_reason,
        NULL,
        jsonb_build_object('transfer_reference', p_transfer_reference, 'external_event_id', p_external_event_id)
      );
    END LOOP;

    RETURN jsonb_build_object('status', 'reversed', 'payout_id', v_payout.id);
  END IF;

  RETURN jsonb_build_object('status', 'unhandled_event', 'event_type', p_event_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.settle_payout_transfer_event FROM anon, public;
GRANT EXECUTE ON FUNCTION public.settle_payout_transfer_event TO service_role;

-- ------------------------------------------------------------------------------
-- 6. COMMISSION OUTBOX BATCH WORKER PROCEDURE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_commission_outbox_batch(
  p_batch_size integer DEFAULT 10,
  p_lease_seconds integer DEFAULT 300
)
RETURNS TABLE (
  outbox_id uuid,
  payment_id uuid,
  result_status text,
  error_message text
) AS $$
DECLARE
  v_task record;
  v_eval_result jsonb;
  v_payment record;
BEGIN
  IF NOT (COALESCE(public.is_platform_admin(), false) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Access Denied: Only Platform Admins or system services can run the outbox worker'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Strictly bound batch size (1..100) and lease seconds (30..1800)
  p_batch_size := GREATEST(1, LEAST(COALESCE(p_batch_size, 10), 100));
  p_lease_seconds := GREATEST(30, LEAST(COALESCE(p_lease_seconds, 300), 1800));

  FOR v_task IN
    SELECT o.id, o.practice_id, o.invoice_id, o.payment_id, o.retry_count, o.max_retries
    FROM public.sales_commission_outbox o
    WHERE (
      o.status = 'pending_retry' AND o.next_retry_at <= now()
    ) OR (
      o.status = 'processing' AND o.lease_expires_at <= now()
    )
    ORDER BY o.next_retry_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Claim lease
    UPDATE public.sales_commission_outbox
    SET status = 'processing',
        lease_expires_at = now() + (p_lease_seconds || ' seconds')::interval,
        retry_count = v_task.retry_count + 1,
        updated_at = now()
    WHERE id = v_task.id;

    BEGIN
      SELECT * INTO v_payment FROM public.saas_payments WHERE id = v_task.payment_id;

      IF NOT FOUND THEN
        UPDATE public.sales_commission_outbox
        SET status = 'abandoned',
            last_error = 'Payment record not found',
            updated_at = now()
        WHERE id = v_task.id;

        outbox_id := v_task.id;
        payment_id := v_task.payment_id;
        result_status := 'abandoned';
        error_message := 'Payment record not found';
        RETURN NEXT;
        CONTINUE;
      END IF;

      -- Validate identity between payment, invoice, and practice
      IF v_payment.practice_id <> v_task.practice_id OR v_payment.invoice_id <> v_task.invoice_id THEN
        UPDATE public.sales_commission_outbox
        SET status = 'abandoned',
            last_error = 'Identity mismatch between payment, invoice, or practice in outbox task',
            updated_at = now()
        WHERE id = v_task.id;

        outbox_id := v_task.id;
        payment_id := v_task.payment_id;
        result_status := 'abandoned';
        error_message := 'Identity mismatch';
        RETURN NEXT;
        CONTINUE;
      END IF;

      -- Execute authoritative evaluation
      v_eval_result := public.evaluate_referral_commission(
        v_task.payment_id,
        v_task.practice_id,
        COALESCE(v_payment.paid_at, v_payment.created_at)
      );

      outbox_id := v_task.id;
      payment_id := v_task.payment_id;
      result_status := v_eval_result->>'status';
      error_message := NULL;
      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      -- Record failure with bounded exponential backoff or abandon if retries exhausted
      IF v_task.retry_count + 1 >= v_task.max_retries THEN
        UPDATE public.sales_commission_outbox
        SET status = 'abandoned',
            last_error = SQLERRM,
            updated_at = now()
        WHERE id = v_task.id;

        outbox_id := v_task.id;
        payment_id := v_task.payment_id;
        result_status := 'abandoned';
        error_message := SQLERRM;
        RETURN NEXT;
      ELSE
        UPDATE public.sales_commission_outbox
        SET status = 'pending_retry',
            next_retry_at = now() + (LEAST(POWER(2, v_task.retry_count + 1) * 30, 86400) || ' seconds')::interval,
            last_error = SQLERRM,
            updated_at = now()
        WHERE id = v_task.id;

        outbox_id := v_task.id;
        payment_id := v_task.payment_id;
        result_status := 'retried';
        error_message := SQLERRM;
        RETURN NEXT;
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.process_commission_outbox_batch(integer, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.process_commission_outbox_batch(integer, integer) TO service_role;

-- ------------------------------------------------------------------------------
-- 15. Schema Migration Tracking & PostgREST Cache Invalidation
-- ------------------------------------------------------------------------------
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20261110010000', 'sales_commission_settlement_engine')
ON CONFLICT (version) DO NOTHING;

NOTIFY pgrst, 'reload schema';

