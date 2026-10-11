-- ==============================================================================
-- PHYSENRA SAAS MANUAL BANK TRANSFER & ADMIN CONFIRMATION FOUNDATION V1
-- Migration: 20261009010000_manual_bank_transfer_foundation.sql
-- Description:
--   Establishes authoritative database primitives for Manual Bank Transfer SaaS
--   subscription payments with Platform Admin verification and atomic settlement:
--   1. Sequence: public.saas_bank_transfer_request_seq
--   2. Table: public.saas_bank_transfer_requests
--   3. Platform Settings Seed: 'bank_transfer_config' (default DISABLED & UNVERIFIED)
--   4. RPC: public.get_active_bank_transfer_config()
--   5. RPC: public.update_bank_transfer_config(...)
--   6. RPC: public.verify_and_enable_bank_transfer_config(...)
--   7. RPC: public.create_bank_transfer_payment_request(p_practice_id, p_invoice_id)
--   8. RPC: public.submit_bank_transfer_reference(p_request_id, p_customer_reference, p_transferred_at, p_notes)
--   9. RPC: public.confirm_bank_transfer_payment(p_request_id)
--   10. RPC: public.reject_bank_transfer_payment(p_request_id, p_rejection_reason)
--   11. RPC: public.cancel_bank_transfer_payment_request(p_request_id)
--
-- Enforces:
--   - Bank Transfer strictly DISABLED until explicitly configured & verified by Platform Admin
--   - Zero invented or prepopulated bank details
--   - Practice owner role verification for payment requests
--   - Platform Admin verification guard for bank configuration, approval, and rejection
--   - Concurrency locking via FOR UPDATE on request, invoice, and subscription
--   - Replay protection & partial unique index on active requests per invoice
--   - Duplicate reference rejection across confirmed requests
--   - Atomic settlement via existing public.process_subscription_payment_settlement
--   - Customer submissions NEVER independently settle invoices or activate subscriptions
--   - Immutable audit logging to public.audit_events with masked account numbers
--   - Strict SECURITY DEFINER search_path = public, auth, pg_temp
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEQUENCE FOR BANK TRANSFER REQUEST NUMBERING
-- ------------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.saas_bank_transfer_request_seq START WITH 1;

-- ------------------------------------------------------------------------------
-- 2. TABLE: saas_bank_transfer_requests
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saas_bank_transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text UNIQUE NOT NULL, -- Format: PHY-BTR-YYYY-XXXXXX
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  invoice_id uuid NOT NULL REFERENCES public.saas_invoices(id) ON DELETE RESTRICT,
  subscription_id uuid NOT NULL REFERENCES public.practice_subscriptions(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES public.saas_plans(id) ON DELETE RESTRICT,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'NGN' CHECK (length(currency) = 3),
  status text NOT NULL DEFAULT 'pending_transfer' CHECK (status IN ('pending_transfer', 'submitted_for_review', 'confirmed', 'rejected', 'cancelled')),

  -- Snapshot of receiving bank details at request creation time
  bank_name text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  payment_instructions text,

  -- Customer submission details
  customer_reference text,
  customer_transferred_at timestamptz,
  customer_notes text,
  submitted_at timestamptz,

  -- Administrative review details
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejection_reason text,

  -- Settled payment association (populated upon confirmed settlement)
  payment_id uuid REFERENCES public.saas_payments(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Partial Unique Index: Only one active bank transfer request per invoice
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_invoice_bank_transfer 
  ON public.saas_bank_transfer_requests (invoice_id) 
  WHERE status IN ('pending_transfer', 'submitted_for_review');

-- Partial Unique Index: A customer transfer reference can only be confirmed once
CREATE UNIQUE INDEX IF NOT EXISTS uq_confirmed_bank_transfer_ref 
  ON public.saas_bank_transfer_requests (customer_reference) 
  WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_saas_btr_practice ON public.saas_bank_transfer_requests(practice_id);
CREATE INDEX IF NOT EXISTS idx_saas_btr_invoice ON public.saas_bank_transfer_requests(invoice_id);
CREATE INDEX IF NOT EXISTS idx_saas_btr_status ON public.saas_bank_transfer_requests(status);
CREATE INDEX IF NOT EXISTS idx_saas_btr_created ON public.saas_bank_transfer_requests(created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. SEED DEFAULT PLATFORM SETTING: bank_transfer_config (DISABLED & UNVERIFIED)
-- ------------------------------------------------------------------------------
INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'bank_transfer_config',
  jsonb_build_object(
    'is_enabled', false,
    'is_verified', false,
    'bank_name', '',
    'account_name', '',
    'account_number', '',
    'payment_instructions', '',
    'verified_at', null,
    'verified_by', null,
    'updated_at', now(),
    'updated_by', null
  ),
  'Physenra SaaS receiving bank account configuration and availability state'
)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.saas_bank_transfer_requests ENABLE ROW LEVEL SECURITY;

-- Practice Owners / Accountants / Managers can view transfer requests for their own practice
DROP POLICY IF EXISTS saas_btr_practice_select ON public.saas_bank_transfer_requests;
CREATE POLICY saas_btr_practice_select ON public.saas_bank_transfer_requests
  FOR SELECT TO authenticated
  USING (
    public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    OR COALESCE(public.is_platform_admin(), false)
  );

-- Platform Admins have full access
DROP POLICY IF EXISTS saas_btr_admin_all ON public.saas_bank_transfer_requests;
CREATE POLICY saas_btr_admin_all ON public.saas_bank_transfer_requests
  FOR ALL TO authenticated
  USING (COALESCE(public.is_platform_admin(), false))
  WITH CHECK (COALESCE(public.is_platform_admin(), false));

-- ------------------------------------------------------------------------------
-- 5. RPC: get_active_bank_transfer_config
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_bank_transfer_config()
RETURNS jsonb AS $$
DECLARE
  v_setting record;
  v_val jsonb;
  v_is_enabled boolean;
  v_is_verified boolean;
  v_bank_name text;
  v_acct_name text;
  v_acct_num text;
BEGIN
  SELECT * INTO v_setting
  FROM public.platform_settings
  WHERE key = 'bank_transfer_config';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_available', false,
      'is_enabled', false,
      'is_verified', false,
      'message', 'Bank transfer is not currently available. Please use the available payment method or contact Physenra support.'
    );
  END IF;

  v_val := v_setting.value;
  v_is_enabled := COALESCE((v_val->>'is_enabled')::boolean, false);
  v_is_verified := COALESCE((v_val->>'is_verified')::boolean, false);
  v_bank_name := TRIM(COALESCE(v_val->>'bank_name', ''));
  v_acct_name := TRIM(COALESCE(v_val->>'account_name', ''));
  v_acct_num := TRIM(COALESCE(v_val->>'account_number', ''));

  -- Strict Availability Guard:
  -- Must be explicitly enabled, verified, and have non-empty bank name, account name, and account number
  IF NOT v_is_enabled OR NOT v_is_verified OR v_bank_name = '' OR v_acct_name = '' OR v_acct_num = '' THEN
    RETURN jsonb_build_object(
      'is_available', false,
      'is_enabled', false,
      'is_verified', v_is_verified,
      'message', 'Bank transfer is not currently available. Please use the available payment method or contact Physenra support.'
    );
  END IF;

  RETURN jsonb_build_object(
    'is_available', true,
    'is_enabled', true,
    'is_verified', true,
    'bank_name', v_bank_name,
    'account_name', v_acct_name,
    'account_number', v_acct_num,
    'payment_instructions', COALESCE(v_val->>'payment_instructions', '')
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 6. RPC: update_bank_transfer_config
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_bank_transfer_config(
  p_bank_name text,
  p_account_name text,
  p_account_number text,
  p_payment_instructions text
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_masked_acct text;
  v_new_val jsonb;
  v_audit_id uuid;
BEGIN
  -- 1. Authorization Guard: Platform Admin only
  v_user_id := auth.uid();
  IF NOT COALESCE(public.is_platform_admin(), false) THEN
    RAISE EXCEPTION 'Restricted: Only Platform Administrators may update receiving bank configuration'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Input validation
  IF p_bank_name IS NULL OR TRIM(p_bank_name) = '' THEN
    RAISE EXCEPTION 'Bank name is required' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_account_name IS NULL OR TRIM(p_account_name) = '' THEN
    RAISE EXCEPTION 'Account name is required' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_account_number IS NULL OR TRIM(p_account_number) = '' THEN
    RAISE EXCEPTION 'Account number is required' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 3. Mask account number for audit logging (never log full account numbers)
  IF length(TRIM(p_account_number)) > 4 THEN
    v_masked_acct := '******' || right(TRIM(p_account_number), 4);
  ELSE
    v_masked_acct := '******';
  END IF;

  -- 4. Construct new configuration:
  -- CRITICAL RULE: Updating bank details automatically sets is_verified = false and is_enabled = false
  v_new_val := jsonb_build_object(
    'is_enabled', false,
    'is_verified', false,
    'bank_name', TRIM(p_bank_name),
    'account_name', TRIM(p_account_name),
    'account_number', TRIM(p_account_number),
    'payment_instructions', TRIM(COALESCE(p_payment_instructions, '')),
    'verified_at', null,
    'verified_by', null,
    'updated_at', now(),
    'updated_by', v_user_id
  );

  INSERT INTO public.platform_settings (key, value, description, updated_by, updated_at)
  VALUES (
    'bank_transfer_config',
    v_new_val,
    'Physenra SaaS receiving bank account configuration and availability state',
    v_user_id,
    now()
  )
  ON CONFLICT (key) DO UPDATE
  SET value = v_new_val,
      updated_by = v_user_id,
      updated_at = now();

  -- 5. Audit Logging
  v_audit_id := public.log_audit_event(
    NULL,
    'platform_settings.bank_transfer_updated',
    'platform_setting',
    NULL,
    jsonb_build_object(
      'bank_name', TRIM(p_bank_name),
      'account_name', TRIM(p_account_name),
      'masked_account', v_masked_acct,
      'is_verified', false,
      'is_enabled', false
    ),
    'platform_admin'
  );

  RETURN v_new_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 7. RPC: verify_and_enable_bank_transfer_config
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_and_enable_bank_transfer_config(
  p_enable boolean DEFAULT NULL,
  p_enabled boolean DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_effective_enable boolean;
  v_user_id uuid;
  v_setting record;
  v_val jsonb;
  v_bank_name text;
  v_acct_name text;
  v_acct_num text;
  v_new_val jsonb;
  v_audit_id uuid;
BEGIN
  -- 0. Resolve parameter: supports either p_enable or p_enabled; defaults to true
  v_effective_enable := COALESCE(p_enable, p_enabled, true);

  -- 1. Authorization Guard: Platform Admin only
  v_user_id := auth.uid();
  IF NOT COALESCE(public.is_platform_admin(), false) THEN
    RAISE EXCEPTION 'Restricted: Only Platform Administrators may verify receiving bank configuration'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Retrieve current setting
  SELECT * INTO v_setting
  FROM public.platform_settings
  WHERE key = 'bank_transfer_config';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank transfer configuration has not been set up'
      USING ERRCODE = 'data_exception';
  END IF;

  v_val := v_setting.value;
  v_bank_name := TRIM(COALESCE(v_val->>'bank_name', ''));
  v_acct_name := TRIM(COALESCE(v_val->>'account_name', ''));
  v_acct_num := TRIM(COALESCE(v_val->>'account_number', ''));

  -- 3. Strict Validation before Verification:
  -- Must have bank name, account name, and valid 10-digit account number
  IF v_bank_name = '' OR v_acct_name = '' OR v_acct_num = '' THEN
    RAISE EXCEPTION 'Cannot verify incomplete bank configuration: bank name, account name, and account number are required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF length(v_acct_num) < 10 THEN
    RAISE EXCEPTION 'Account number must be a valid Nigerian bank account number (at least 10 digits)'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 4. Apply Verification and Enablement
  v_new_val := jsonb_build_object(
    'is_enabled', v_effective_enable,
    'is_verified', true,
    'bank_name', v_bank_name,
    'account_name', v_acct_name,
    'account_number', v_acct_num,
    'payment_instructions', COALESCE(v_val->>'payment_instructions', ''),
    'verified_at', now(),
    'verified_by', v_user_id,
    'updated_at', now(),
    'updated_by', v_user_id
  );

  UPDATE public.platform_settings
  SET value = v_new_val,
      updated_by = v_user_id,
      updated_at = now()
  WHERE key = 'bank_transfer_config';

  -- 5. Audit Logging
  v_audit_id := public.log_audit_event(
    NULL,
    'platform_settings.bank_transfer_verified',
    'platform_setting',
    NULL,
    jsonb_build_object(
      'is_verified', true,
      'is_enabled', v_effective_enable,
      'verified_by', v_user_id,
      'verified_at', now()
    ),
    'platform_admin'
  );

  RETURN v_new_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 8. RPC: create_bank_transfer_payment_request
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_bank_transfer_payment_request(
  p_practice_id uuid,
  p_invoice_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_cfg jsonb;
  v_inv record;
  v_sub record;
  v_plan record;
  v_existing record;
  v_req_num text;
  v_req_id uuid;
  v_audit_id uuid;
BEGIN
  -- 1. Authentication check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create payment request'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Authorization check: must be practice_owner of target practice
  IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner']) THEN
    RAISE EXCEPTION 'Access denied: Only a verified practice owner can create bank transfer payment requests'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 3. Availability check: Bank Transfer must be active & verified
  v_cfg := public.get_active_bank_transfer_config();
  IF NOT COALESCE((v_cfg->>'is_available')::boolean, false) THEN
    RAISE EXCEPTION 'Bank transfer is not currently available. Please use the available payment method or contact Physenra support.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 4. Lock & Validate Invoice
  SELECT * INTO v_inv
  FROM public.saas_invoices
  WHERE id = p_invoice_id AND practice_id = p_practice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice % not found for practice %', p_invoice_id, p_practice_id
      USING ERRCODE = 'data_exception';
  END IF;

  IF v_inv.status = 'paid' THEN
    RAISE EXCEPTION 'Invoice is already paid' USING ERRCODE = 'check_violation';
  END IF;

  IF v_inv.status = 'void' THEN
    RAISE EXCEPTION 'Cannot create payment request for void invoice' USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Lock & Validate Subscription
  SELECT * INTO v_sub
  FROM public.practice_subscriptions
  WHERE id = v_inv.subscription_id AND practice_id = p_practice_id
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

-- ------------------------------------------------------------------------------
-- 9. RPC: submit_bank_transfer_reference
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_bank_transfer_reference(
  p_request_id uuid,
  p_customer_reference text,
  p_transferred_at timestamptz DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_req record;
  v_updated record;
  v_audit_id uuid;
BEGIN
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
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank transfer request % not found', p_request_id
      USING ERRCODE = 'data_exception';
  END IF;

  -- Disallow entering the Physenra request reference instead of the actual bank transaction reference
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
      AND id <> p_request_id
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
  WHERE id = p_request_id
  RETURNING * INTO v_updated;

  -- 8. Audit Logging
  v_audit_id := public.log_audit_event(
    v_req.practice_id,
    'bank_transfer.reference_submitted',
    'saas_bank_transfer_requests',
    p_request_id,
    jsonb_build_object(
      'request_number', v_req.request_number,
      'customer_reference', TRIM(p_customer_reference),
      'transferred_at', COALESCE(p_transferred_at, now())
    ),
    'self_service'
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'request_number', v_req.request_number,
    'status', 'submitted_for_review',
    'message', 'Transfer reference submitted. Physenra administration will verify funds receipt before activating your subscription.',
    'request', row_to_json(v_updated)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 10. RPC: confirm_bank_transfer_payment
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_bank_transfer_payment(
  p_request_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_admin_id uuid;
  v_req record;
  v_inv record;
  v_sub record;
  v_settle jsonb;
  v_payment_id uuid;
  v_audit_id uuid;
BEGIN
  -- 1. Authorization Guard: Platform Admin only
  v_admin_id := auth.uid();
  IF NOT COALESCE(public.is_platform_admin(), false) THEN
    RAISE EXCEPTION 'Restricted: Only Platform Administrators may confirm bank transfer payments'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Lock Request FOR UPDATE
  SELECT * INTO v_req
  FROM public.saas_bank_transfer_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank transfer request % not found', p_request_id
      USING ERRCODE = 'data_exception';
  END IF;

  -- 3. Status eligibility: Must be submitted_for_review or pending_transfer
  IF v_req.status = 'confirmed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_already_confirmed', true,
      'request_id', p_request_id,
      'status', 'confirmed',
      'payment_id', v_req.payment_id
    );
  END IF;

  IF v_req.status IN ('rejected', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot confirm bank transfer request with status %', v_req.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- 4. Customer Reference Guard: Admin cannot approve without a reference or narration
  IF v_req.customer_reference IS NULL OR TRIM(v_req.customer_reference) = '' THEN
    RAISE EXCEPTION 'Customer transfer reference is missing. Payment cannot be confirmed without a verified transaction reference.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 5. Duplicate Reference Guard: Ensure reference not confirmed on another request
  IF EXISTS (
    SELECT 1 FROM public.saas_bank_transfer_requests
    WHERE customer_reference = TRIM(v_req.customer_reference)
      AND status = 'confirmed'
      AND id <> p_request_id
  ) THEN
    RAISE EXCEPTION 'Customer transfer reference % has already been settled for another request'
      , TRIM(v_req.customer_reference)
      USING ERRCODE = 'unique_violation';
  END IF;

  -- 6. Lock Invoice FOR UPDATE
  SELECT * INTO v_inv
  FROM public.saas_invoices
  WHERE id = v_req.invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated invoice % not found', v_req.invoice_id
      USING ERRCODE = 'data_exception';
  END IF;

  IF v_inv.status = 'paid' THEN
    RAISE EXCEPTION 'Invoice is already marked paid' USING ERRCODE = 'check_violation';
  END IF;

  -- 7. Amount & Currency Matching
  IF v_req.amount_cents <> v_inv.total_cents THEN
    RAISE EXCEPTION 'Amount mismatch: request amount % does not match invoice total %',
      v_req.amount_cents, v_inv.total_cents
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_req.currency <> v_inv.currency THEN
    RAISE EXCEPTION 'Currency mismatch: request currency % does not match invoice currency %',
      v_req.currency, v_inv.currency
      USING ERRCODE = 'check_violation';
  END IF;

  -- 8. Authoritative Settlement via process_subscription_payment_settlement
  v_settle := public.process_subscription_payment_settlement(
    p_invoice_id := v_inv.id,
    p_gateway := 'manual_bank_transfer'::public.saas_payment_gateway,
    p_gateway_reference := TRIM(v_req.customer_reference),
    p_amount_cents := v_req.amount_cents,
    p_payment_method := 'bank_transfer',
    p_gateway_fee_cents := 0
  );

  v_payment_id := (v_settle->>'payment_id')::uuid;

  -- 9. Update Request to confirmed
  UPDATE public.saas_bank_transfer_requests
  SET status = 'confirmed',
      reviewed_at = now(),
      reviewed_by = v_admin_id,
      payment_id = v_payment_id,
      updated_at = now()
  WHERE id = p_request_id;

  -- 10. Audit Logging
  v_audit_id := public.log_audit_event(
    v_req.practice_id,
    'bank_transfer.payment_confirmed',
    'saas_bank_transfer_requests',
    p_request_id,
    jsonb_build_object(
      'request_number', v_req.request_number,
      'invoice_id', v_inv.id,
      'payment_id', v_payment_id,
      'amount_cents', v_req.amount_cents,
      'customer_reference', v_req.customer_reference,
      'confirmed_by', v_admin_id
    ),
    'platform_admin'
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'confirmed',
    'request_id', p_request_id,
    'payment_id', v_payment_id,
    'invoice_id', v_inv.id,
    'settlement', v_settle
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 11. RPC: reject_bank_transfer_payment
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_bank_transfer_payment(
  p_request_id uuid,
  p_rejection_reason text
)
RETURNS jsonb AS $$
DECLARE
  v_admin_id uuid;
  v_req record;
  v_audit_id uuid;
BEGIN
  -- 1. Authorization Guard: Platform Admin only
  v_admin_id := auth.uid();
  IF NOT COALESCE(public.is_platform_admin(), false) THEN
    RAISE EXCEPTION 'Restricted: Only Platform Administrators may reject bank transfer payments'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Input validation: Rejection reason is mandatory
  IF p_rejection_reason IS NULL OR length(TRIM(p_rejection_reason)) < 5 THEN
    RAISE EXCEPTION 'Rejection reason is required and must be at least 5 characters'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 3. Lock Request FOR UPDATE
  SELECT * INTO v_req
  FROM public.saas_bank_transfer_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank transfer request % not found', p_request_id
      USING ERRCODE = 'data_exception';
  END IF;

  -- 4. Status check: cannot reject confirmed request
  IF v_req.status = 'confirmed' THEN
    RAISE EXCEPTION 'Cannot reject a payment request that has already been confirmed'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_req.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot reject a cancelled payment request'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Update Request to rejected (invoice remains open for retry or Paystack checkout)
  UPDATE public.saas_bank_transfer_requests
  SET status = 'rejected',
      rejection_reason = TRIM(p_rejection_reason),
      reviewed_at = now(),
      reviewed_by = v_admin_id,
      updated_at = now()
  WHERE id = p_request_id;

  -- 6. Audit Logging
  v_audit_id := public.log_audit_event(
    v_req.practice_id,
    'bank_transfer.payment_rejected',
    'saas_bank_transfer_requests',
    p_request_id,
    jsonb_build_object(
      'request_number', v_req.request_number,
      'invoice_id', v_req.invoice_id,
      'reason', TRIM(p_rejection_reason),
      'rejected_by', v_admin_id
    ),
    'platform_admin'
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'rejected',
    'request_id', p_request_id,
    'rejection_reason', TRIM(p_rejection_reason)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 12. RPC: cancel_bank_transfer_payment_request
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_bank_transfer_payment_request(
  p_request_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_req record;
  v_audit_id uuid;
BEGIN
  -- 1. Authentication check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to cancel payment request'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Lock Request FOR UPDATE
  SELECT * INTO v_req
  FROM public.saas_bank_transfer_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank transfer request % not found', p_request_id
      USING ERRCODE = 'data_exception';
  END IF;

  -- 3. Authorization check: caller must be practice_owner
  IF NOT public.user_has_practice_role(v_req.practice_id, ARRAY['practice_owner']) THEN
    RAISE EXCEPTION 'Access denied: Only the practice owner can cancel the payment request'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 4. Status check: can only cancel pending or submitted
  IF v_req.status NOT IN ('pending_transfer', 'submitted_for_review') THEN
    RAISE EXCEPTION 'Cannot cancel bank transfer request in % status', v_req.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Update to cancelled
  UPDATE public.saas_bank_transfer_requests
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_request_id;

  -- 6. Audit Logging
  v_audit_id := public.log_audit_event(
    v_req.practice_id,
    'bank_transfer.request_cancelled',
    'saas_bank_transfer_requests',
    p_request_id,
    jsonb_build_object(
      'request_number', v_req.request_number,
      'invoice_id', v_req.invoice_id
    ),
    'self_service'
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'cancelled',
    'request_id', p_request_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------
-- 13. REVOKE & GRANT PERMISSIONS
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_active_bank_transfer_config FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_active_bank_transfer_config TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.update_bank_transfer_config FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_bank_transfer_config TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.verify_and_enable_bank_transfer_config FROM anon, public;
GRANT EXECUTE ON FUNCTION public.verify_and_enable_bank_transfer_config TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.create_bank_transfer_payment_request FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_bank_transfer_payment_request TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.submit_bank_transfer_reference FROM anon, public;
GRANT EXECUTE ON FUNCTION public.submit_bank_transfer_reference TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.confirm_bank_transfer_payment FROM anon, public;
GRANT EXECUTE ON FUNCTION public.confirm_bank_transfer_payment TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.reject_bank_transfer_payment FROM anon, public;
GRANT EXECUTE ON FUNCTION public.reject_bank_transfer_payment TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.cancel_bank_transfer_payment_request FROM anon, public;
GRANT EXECUTE ON FUNCTION public.cancel_bank_transfer_payment_request TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 15. Record Migration & Reload PostgREST Schema Cache
-- ------------------------------------------------------------------------------
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20261009010000', 'manual_bank_transfer_foundation')
ON CONFLICT (version) DO NOTHING;

NOTIFY pgrst, 'reload schema';


