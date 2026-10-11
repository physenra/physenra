-- ==============================================================================
-- Migration: 20261011220000_fix_submit_bank_transfer_reference_signature.sql
-- Description: Align submit_bank_transfer_reference and create_bank_transfer_payment_request signatures
-- 1. Drop old submit_bank_transfer_reference(uuid, text, timestamptz, text)
-- 2. Create updated submit_bank_transfer_reference supporting p_request_id and p_id with default nulls
-- 3. Update create_bank_transfer_payment_request to return both 'id' and 'request_id'
-- 4. Grant execute to authenticated and service_role
-- 5. Record migration and reload schema cache
-- ==============================================================================

-- 1. Drop old function signature to avoid ambiguous overloads
DROP FUNCTION IF EXISTS public.submit_bank_transfer_reference(uuid, text, timestamptz, text);

-- 2. Create updated submit_bank_transfer_reference function
CREATE OR REPLACE FUNCTION public.submit_bank_transfer_reference(
  p_request_id uuid DEFAULT NULL,
  p_customer_reference text DEFAULT NULL,
  p_transferred_at timestamptz DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_effective_id uuid;
  v_user_id uuid;
  v_req record;
  v_updated record;
  v_audit_id uuid;
BEGIN
  -- 0. Resolve request ID from p_request_id or p_id
  v_effective_id := COALESCE(p_request_id, p_id);
  IF v_effective_id IS NULL THEN
    RAISE EXCEPTION 'Bank transfer request ID is required to submit transfer reference'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 1. Authentication check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to submit transfer reference'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Input validation: Reference is mandatory
  IF p_customer_reference IS NULL OR length(TRIM(p_customer_reference)) < 3 THEN
    RAISE EXCEPTION 'Customer transfer reference is required and must be at least 3 characters'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 3. Lock & Validate Request
  SELECT * INTO v_req
  FROM public.saas_bank_transfer_requests
  WHERE id = v_effective_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank transfer request % not found', v_effective_id
      USING ERRCODE = 'data_exception';
  END IF;

  -- Disallow entering the Physenra request reference instead of actual bank transaction reference
  IF UPPER(TRIM(p_customer_reference)) = UPPER(TRIM(v_req.request_number)) THEN
    RAISE EXCEPTION 'Please enter the transaction reference from your bank receipt or payment session, not the Physenra request number (%)', v_req.request_number
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 4. Authorization check: caller must be practice_owner, practice_manager, or platform_admin
  IF NOT (
    public.user_has_practice_role(v_req.practice_id, ARRAY['practice_owner', 'practice_manager'])
    OR COALESCE(public.is_platform_admin(), false)
  ) THEN
    RAISE EXCEPTION 'Access denied: Only practice administrators or owners can submit transfer references'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 5. Status check: must be pending_transfer or submitted_for_review
  IF v_req.status NOT IN ('pending_transfer', 'submitted_for_review') THEN
    RAISE EXCEPTION 'Cannot submit reference for bank transfer request in % status', v_req.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- 6. Replay / Duplicate check: Check if this exact reference was already settled
  IF EXISTS (
    SELECT 1 FROM public.saas_bank_transfer_requests
    WHERE customer_reference = TRIM(p_customer_reference)
      AND status = 'confirmed'
      AND id <> v_effective_id
  ) THEN
    RAISE EXCEPTION 'This transfer reference has already been confirmed for a previous payment'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- 7. Update Request to submitted_for_review
  -- CRITICAL RULE: This does NOT mark invoice paid, does NOT create a payment,
  -- and does NOT activate subscription!
  UPDATE public.saas_bank_transfer_requests
  SET customer_reference = TRIM(p_customer_reference),
      customer_transferred_at = COALESCE(p_transferred_at, now()),
      customer_notes = NULLIF(TRIM(p_notes), ''),
      submitted_at = now(),
      status = 'submitted_for_review',
      updated_at = now()
  WHERE id = v_effective_id
  RETURNING * INTO v_updated;

  -- 8. Audit Logging
  v_audit_id := public.log_audit_event(
    v_req.practice_id,
    'bank_transfer.reference_submitted',
    'saas_bank_transfer_requests',
    v_effective_id,
    jsonb_build_object(
      'request_number', v_req.request_number,
      'customer_reference', TRIM(p_customer_reference),
      'transferred_at', COALESCE(p_transferred_at, now())
    ),
    'self_service'
  );

  RETURN jsonb_build_object(
    'success', true,
    'id', v_effective_id,
    'request_id', v_effective_id,
    'request_number', v_req.request_number,
    'status', 'submitted_for_review',
    'message', 'Transfer reference submitted. Physenra administration will verify funds receipt before activating your subscription.',
    'request', row_to_json(v_updated)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE EXECUTE ON FUNCTION public.submit_bank_transfer_reference FROM anon, public;
GRANT EXECUTE ON FUNCTION public.submit_bank_transfer_reference TO authenticated, service_role;

-- 3. Update create_bank_transfer_payment_request to return 'id' alongside 'request_id'
CREATE OR REPLACE FUNCTION public.create_bank_transfer_payment_request(
  p_practice_id uuid,
  p_invoice_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_cfg jsonb;
  v_is_enabled boolean;
  v_is_verified boolean;
  v_inv record;
  v_sub record;
  v_existing record;
  v_req_id uuid;
  v_req_num text;
  v_audit_id uuid;
BEGIN
  -- 1. Authentication Check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to initiate bank transfer' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Authorization Check: Practice Owner or Manager only
  IF NOT (
    public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager'])
    OR COALESCE(public.is_platform_admin(), false)
  ) THEN
    RAISE EXCEPTION 'Access denied: Only practice administrators or owners can initiate bank transfer payment requests'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 3. Platform Availability Check
  SELECT value INTO v_cfg
  FROM public.platform_settings
  WHERE key = 'bank_transfer_config';

  IF v_cfg IS NULL THEN
    RAISE EXCEPTION 'Bank transfer payment configuration has not been set up' USING ERRCODE = 'data_exception';
  END IF;

  v_is_enabled := COALESCE((v_cfg->>'is_enabled')::boolean, false);
  v_is_verified := COALESCE((v_cfg->>'is_verified')::boolean, false);

  IF NOT (v_is_enabled AND v_is_verified) THEN
    RAISE EXCEPTION 'Bank transfer is not currently available. Please use the available payment method or contact Physenra support.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NULLIF(TRIM(COALESCE(v_cfg->>'bank_name', '')), '') IS NULL OR
     NULLIF(TRIM(COALESCE(v_cfg->>'account_name', '')), '') IS NULL OR
     NULLIF(TRIM(COALESCE(v_cfg->>'account_number', '')), '') IS NULL THEN
    RAISE EXCEPTION 'Official receiving bank account details are incomplete' USING ERRCODE = 'data_exception';
  END IF;

  -- 4. Validate Invoice
  SELECT * INTO v_inv
  FROM public.saas_invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice % not found', p_invoice_id USING ERRCODE = 'data_exception';
  END IF;

  IF v_inv.practice_id <> p_practice_id THEN
    RAISE EXCEPTION 'Access denied: Invoice does not belong to specified practice' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_inv.status <> 'open' THEN
    RAISE EXCEPTION 'Bank transfer request can only be created for open invoices (current status: %)', v_inv.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_inv.total_cents <= 0 THEN
    RAISE EXCEPTION 'Invoice amount must be greater than zero to initiate bank transfer' USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Validate Practice Subscription
  SELECT * INTO v_sub
  FROM public.practice_subscriptions
  WHERE practice_id = p_practice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription contract not found' USING ERRCODE = 'data_exception';
  END IF;

  IF v_sub.status = 'suspended' THEN
    RAISE EXCEPTION 'Practice is administratively suspended' USING ERRCODE = 'check_violation';
  END IF;

  -- 6. Check for active request idempotency
  SELECT * INTO v_existing
  FROM public.saas_bank_transfer_requests
  WHERE invoice_id = p_invoice_id
    AND status IN ('pending_transfer', 'submitted_for_review')
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_reused', true,
      'id', v_existing.id,
      'request_id', v_existing.id,
      'request_number', v_existing.request_number,
      'status', v_existing.status,
      'amount_cents', v_existing.amount_cents,
      'currency', v_existing.currency,
      'bank_name', v_existing.bank_name,
      'account_name', v_existing.account_name,
      'account_number', v_existing.account_number,
      'payment_instructions', v_existing.payment_instructions,
      'customer_reference', v_existing.customer_reference,
      'created_at', v_existing.created_at
    );
  END IF;

  -- 7. Generate Request Number: PHY-BTR-YYYY-XXXXXX
  v_req_num := 'PHY-BTR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.saas_bank_transfer_request_seq')::text, 6, '0');

  -- 8. Insert New Request Snapshot
  INSERT INTO public.saas_bank_transfer_requests (
    request_number,
    practice_id,
    invoice_id,
    subscription_id,
    plan_id,
    amount_cents,
    currency,
    status,
    bank_name,
    account_name,
    account_number,
    payment_instructions
  ) VALUES (
    v_req_num,
    p_practice_id,
    v_inv.id,
    v_sub.id,
    v_sub.plan_id,
    v_inv.total_cents,
    v_inv.currency,
    'pending_transfer',
    v_cfg->>'bank_name',
    v_cfg->>'account_name',
    v_cfg->>'account_number',
    v_cfg->>'payment_instructions'
  ) RETURNING id INTO v_req_id;

  -- 9. Audit Logging
  v_audit_id := public.log_audit_event(
    p_practice_id,
    'bank_transfer.request_created',
    'saas_bank_transfer_requests',
    v_req_id,
    jsonb_build_object(
      'request_number', v_req_num,
      'invoice_id', v_inv.id,
      'amount_cents', v_inv.total_cents,
      'currency', v_inv.currency
    ),
    'self_service'
  );

  RETURN jsonb_build_object(
    'success', true,
    'is_reused', false,
    'id', v_req_id,
    'request_id', v_req_id,
    'request_number', v_req_num,
    'status', 'pending_transfer',
    'amount_cents', v_inv.total_cents,
    'currency', v_inv.currency,
    'bank_name', v_cfg->>'bank_name',
    'account_name', v_cfg->>'account_name',
    'account_number', v_cfg->>'account_number',
    'payment_instructions', v_cfg->>'payment_instructions',
    'created_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE EXECUTE ON FUNCTION public.create_bank_transfer_payment_request FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_bank_transfer_payment_request TO authenticated, service_role;

-- 4. Record migration
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20261011220000', 'fix_submit_bank_transfer_reference_signature')
ON CONFLICT (version) DO NOTHING;

-- 5. Invalidate PostgREST schema cache
NOTIFY pgrst, 'reload schema';
