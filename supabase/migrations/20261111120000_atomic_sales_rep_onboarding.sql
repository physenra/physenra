-- ==============================================================================
-- PHYSENRA SAAS — ATOMIC SALES REPRESENTATIVE ONBOARDING RPC
-- Migration: 20261111120000_atomic_sales_rep_onboarding.sql
--
-- Governs:
-- 1. Atomic creation of sales_representatives, sales_referral_codes, and optional
--    sales_rep_bank_accounts in a single PostgreSQL transaction block.
-- 2. Strict caller authorization: Must be authenticated Platform Admin (is_platform_admin()).
--    service_role execution is revoked to enforce human accountability in audit logs.
-- 3. Security Definer with fixed search_path = public, pg_temp.
-- 4. Complete input validation & unique collision handling.
-- 5. Zero raw banking credentials returned or recorded in audit logs.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.admin_onboard_sales_rep(
  p_full_name text,
  p_email text,
  p_phone_number text,
  p_state_region text,
  p_referral_code text,
  p_bank_name text DEFAULT NULL,
  p_bank_code text DEFAULT NULL,
  p_account_number text DEFAULT NULL,
  p_account_name text DEFAULT NULL,
  p_commission_rate_bps integer DEFAULT 2000,
  p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_admin_id uuid;
  v_clean_name text;
  v_clean_email text;
  v_clean_phone text;
  v_clean_region text;
  v_clean_code text;
  v_clean_bank_name text;
  v_clean_bank_code text;
  v_clean_account_num text;
  v_clean_account_name text;
  v_clean_notes text;
  v_rate_bps integer;
  v_has_banking boolean;
  v_rep_id uuid;
  v_code_id uuid;
  v_bank_id uuid;
  v_masked_nuban text;
BEGIN
  -- 1. Authorization: Must be an authenticated Platform Admin
  IF NOT COALESCE(public.is_platform_admin(), false) THEN
    RAISE EXCEPTION 'Access Denied: Only Platform Administrators can onboard sales representatives'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_admin_id := auth.uid();

  -- 2. Input Validation & Sanitization
  v_clean_name := TRIM(COALESCE(p_full_name, ''));
  IF LENGTH(v_clean_name) < 2 THEN
    RAISE EXCEPTION 'Full name is required (minimum 2 characters)'
      USING ERRCODE = 'check_violation';
  END IF;

  v_clean_email := LOWER(TRIM(COALESCE(p_email, '')));
  IF v_clean_email !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RAISE EXCEPTION 'A valid email address is required'
      USING ERRCODE = 'check_violation';
  END IF;

  v_clean_phone := TRIM(COALESCE(p_phone_number, ''));
  IF LENGTH(v_clean_phone) < 7 THEN
    RAISE EXCEPTION 'A valid phone number is required (minimum 7 characters)'
      USING ERRCODE = 'check_violation';
  END IF;

  v_clean_region := TRIM(COALESCE(p_state_region, ''));
  IF LENGTH(v_clean_region) < 2 THEN
    RAISE EXCEPTION 'State / region is required'
      USING ERRCODE = 'check_violation';
  END IF;

  v_clean_code := UPPER(TRIM(COALESCE(p_referral_code, '')));
  IF v_clean_code !~ '^[A-Z0-9_-]{4,32}$' THEN
    RAISE EXCEPTION 'Referral code must be 4 to 32 characters long and contain only uppercase letters, numbers, hyphens, and underscores'
      USING ERRCODE = 'check_violation';
  END IF;

  v_rate_bps := COALESCE(p_commission_rate_bps, 2000);
  IF v_rate_bps < 0 OR v_rate_bps > 10000 THEN
    RAISE EXCEPTION 'Commission rate basis points must be between 0 and 10000'
      USING ERRCODE = 'check_violation';
  END IF;

  v_clean_notes := NULLIF(TRIM(COALESCE(p_notes, '')), '');

  -- 3. Optional Banking Validation
  v_clean_account_num := NULLIF(TRIM(COALESCE(p_account_number, '')), '');
  v_clean_bank_name := NULLIF(TRIM(COALESCE(p_bank_name, '')), '');
  v_clean_bank_code := NULLIF(TRIM(COALESCE(p_bank_code, '')), '');
  v_clean_account_name := NULLIF(TRIM(COALESCE(p_account_name, '')), '');

  v_has_banking := (v_clean_account_num IS NOT NULL OR v_clean_bank_name IS NOT NULL OR v_clean_account_name IS NOT NULL);

  IF v_has_banking THEN
    IF v_clean_bank_name IS NULL OR LENGTH(v_clean_bank_name) < 2 THEN
      RAISE EXCEPTION 'Bank name is required'
        USING ERRCODE = 'check_violation';
    END IF;
    IF v_clean_account_num IS NULL OR v_clean_account_num !~ '^[0-9]{10}$' THEN
      RAISE EXCEPTION 'Bank account number must be exactly 10 digits'
        USING ERRCODE = 'check_violation';
    END IF;
    IF v_clean_account_name IS NULL OR LENGTH(v_clean_account_name) < 2 THEN
      RAISE EXCEPTION 'Account name is required'
        USING ERRCODE = 'check_violation';
    END IF;
    v_clean_bank_code := COALESCE(v_clean_bank_code, '058');
    v_masked_nuban := '••••••' || RIGHT(v_clean_account_num, 4);
  END IF;

  -- 4. Pre-check uniqueness for clean human-readable messaging
  IF EXISTS (SELECT 1 FROM public.sales_representatives WHERE email = v_clean_email) THEN
    RAISE EXCEPTION 'A sales representative with email "%" already exists', v_clean_email
      USING ERRCODE = 'unique_violation';
  END IF;

  IF EXISTS (SELECT 1 FROM public.sales_referral_codes WHERE code = v_clean_code) THEN
    RAISE EXCEPTION 'Referral code "%" is already in use. Please choose a different referral code.', v_clean_code
      USING ERRCODE = 'unique_violation';
  END IF;

  -- 5. Atomic Insertion: Sales Representative
  INSERT INTO public.sales_representatives (
    full_name,
    email,
    phone_number,
    state_region,
    commission_rate_bps,
    notes
  ) VALUES (
    v_clean_name,
    v_clean_email,
    v_clean_phone,
    v_clean_region,
    v_rate_bps,
    v_clean_notes
  )
  RETURNING id INTO v_rep_id;

  -- 6. Atomic Insertion: Referral Code
  INSERT INTO public.sales_referral_codes (
    sales_rep_id,
    code,
    is_active
  ) VALUES (
    v_rep_id,
    v_clean_code,
    true
  )
  RETURNING id INTO v_code_id;

  -- 7. Atomic Insertion: Bank Account (if provided)
  IF v_has_banking THEN
    INSERT INTO public.sales_rep_bank_accounts (
      sales_rep_id,
      bank_name,
      bank_code,
      account_number,
      account_name
    ) VALUES (
      v_rep_id,
      v_clean_bank_name,
      v_clean_bank_code,
      v_clean_account_num,
      v_clean_account_name
    )
    RETURNING id INTO v_bank_id;
  END IF;

  -- 8. Immutable Platform Audit Log (Zero raw credentials)
  INSERT INTO public.platform_audit_logs (
    action,
    actor_user_id,
    target_resource_type,
    target_resource_id,
    details
  ) VALUES (
    'sales_rep.onboarded',
    v_admin_id,
    'sales_representatives',
    v_rep_id::text,
    jsonb_build_object(
      'rep_id', v_rep_id,
      'email', v_clean_email,
      'referral_code', v_clean_code,
      'state_region', v_clean_region,
      'commission_rate_bps', v_rate_bps,
      'has_bank_account', v_has_banking,
      'bank_name', v_clean_bank_name,
      'masked_account_number', v_masked_nuban
    )
  );

  -- 9. Authoritative Return Payload (Never returns raw NUBAN)
  RETURN jsonb_build_object(
    'id', v_rep_id,
    'full_name', v_clean_name,
    'email', v_clean_email,
    'phone_number', v_clean_phone,
    'state_region', v_clean_region,
    'commission_rate_bps', v_rate_bps,
    'referral_code', jsonb_build_object(
      'id', v_code_id,
      'code', v_clean_code,
      'is_active', true
    ),
    'bank_account', CASE
      WHEN v_has_banking THEN jsonb_build_object(
        'bank_name', v_clean_bank_name,
        'bank_code', v_clean_bank_code,
        'masked_account_number', v_masked_nuban,
        'account_name', v_clean_account_name,
        'is_verified', false
      )
      ELSE NULL
    END
  );

EXCEPTION
  WHEN unique_violation THEN
    IF SQLERRM LIKE '%sales_representatives_email_key%' THEN
      RAISE EXCEPTION 'A sales representative with email "%" already exists', v_clean_email
        USING ERRCODE = 'unique_violation';
    ELSIF SQLERRM LIKE '%sales_referral_codes_code_key%' THEN
      RAISE EXCEPTION 'Referral code "%" is already in use. Please choose a different referral code.', v_clean_code
        USING ERRCODE = 'unique_violation';
    ELSIF SQLERRM LIKE '%sales_rep_bank_accounts_sales_rep_id_key%' THEN
      RAISE EXCEPTION 'A bank account is already registered for this representative'
        USING ERRCODE = 'unique_violation';
    ELSE
      RAISE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Privilege Lockdown: Revoke from public, anon, and service_role; grant exclusively to authenticated
REVOKE EXECUTE ON FUNCTION public.admin_onboard_sales_rep(text, text, text, text, text, text, text, text, text, integer, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_onboard_sales_rep(text, text, text, text, text, text, text, text, text, integer, text) TO authenticated;

-- PostgREST Schema Cache Invalidation Notification
NOTIFY pgrst, 'reload schema';
