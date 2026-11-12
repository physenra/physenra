-- ==============================================================================
-- PHYSENRA SAAS — INDEPENDENT SALES REPRESENTATIVE PORTAL & FREE PARTNER ACCESS
-- Migration: 20261112100000_sales_rep_portal_and_attribution.sql
--
-- Governs:
-- 1. Independent sales_representative authorization helpers (free partner access,
--    never consumes practice seats or requires SaaS practice subscriptions)
-- 2. Status-locked RLS hardening: suspended/terminated/completed reps immediately
--    lose table and banking read access across all sales_* tables
-- 3. Authoritative self-service Portal RPCs:
--    - get_my_sales_portal_context()
--    - get_my_rep_referrals()
--    - get_my_rep_commissions()
--    - update_my_rep_profile(p_full_name, p_phone_number, p_state_region)
--    - claim_verified_sales_rep_account()
-- 4. Server-authoritative Admin Auth Linkage RPC:
--    - admin_link_sales_rep_user(p_sales_rep_id, p_auth_user_id)
-- 5. Safe Referral Code Validation & Non-Blocking Attribution (no Migration 41):
--    - validate_referral_code(p_code)
--    - attribute_practice_referral(p_practice_id, p_referral_code)
--    - register_practice_and_subscribe(..., p_referral_code DEFAULT NULL)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ROLE & STATUS AUTHORIZATION HELPERS (COMPLETELY DECOUPLED FROM CLINIC BILLING)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_sales_representative()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sales_representatives r
    WHERE r.user_id = auth.uid()
      AND r.status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE EXECUTE ON FUNCTION public.is_sales_representative() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_sales_representative() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_sales_rep_id()
RETURNS uuid AS $$
  SELECT r.id
  FROM public.sales_representatives r
  WHERE r.user_id = auth.uid()
    AND r.status = 'active'
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE EXECUTE ON FUNCTION public.current_sales_rep_id() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_sales_rep_id() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. RLS HARDENING: ENFORCE ACTIVE STATUS ON REPRESENTATIVE-SCOPED READS
-- ------------------------------------------------------------------------------
-- Suspended or terminated representatives immediately lose direct table access.
DROP POLICY IF EXISTS sales_reps_read_own ON public.sales_representatives;
CREATE POLICY sales_reps_read_own ON public.sales_representatives FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND status = 'active');

DROP POLICY IF EXISTS sales_codes_read_own ON public.sales_referral_codes;
CREATE POLICY sales_codes_read_own ON public.sales_referral_codes FOR SELECT TO authenticated
  USING (
    sales_rep_id IN (
      SELECT id FROM public.sales_representatives WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS sales_referrals_read_own ON public.sales_referrals;
CREATE POLICY sales_referrals_read_own ON public.sales_referrals FOR SELECT TO authenticated
  USING (
    sales_rep_id IN (
      SELECT id FROM public.sales_representatives WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS sales_commissions_read_own ON public.sales_commissions;
CREATE POLICY sales_commissions_read_own ON public.sales_commissions FOR SELECT TO authenticated
  USING (
    sales_rep_id IN (
      SELECT id FROM public.sales_representatives WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS sales_events_read_own ON public.sales_commission_events;
CREATE POLICY sales_events_read_own ON public.sales_commission_events FOR SELECT TO authenticated
  USING (
    commission_id IN (
      SELECT c.id
      FROM public.sales_commissions c
      JOIN public.sales_representatives r ON c.sales_rep_id = r.id
      WHERE r.user_id = auth.uid() AND r.status = 'active'
    )
  );

DROP POLICY IF EXISTS sales_adjustments_read_own ON public.sales_commission_adjustments;
CREATE POLICY sales_adjustments_read_own ON public.sales_commission_adjustments FOR SELECT TO authenticated
  USING (
    sales_rep_id IN (
      SELECT id FROM public.sales_representatives WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS sales_recovery_read_own ON public.sales_recovery_entries;
CREATE POLICY sales_recovery_read_own ON public.sales_recovery_entries FOR SELECT TO authenticated
  USING (
    sales_rep_id IN (
      SELECT id FROM public.sales_representatives WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS sales_payouts_read_own ON public.sales_commission_payouts;
CREATE POLICY sales_payouts_read_own ON public.sales_commission_payouts FOR SELECT TO authenticated
  USING (
    sales_rep_id IN (
      SELECT id FROM public.sales_representatives WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS sales_allocations_read_own ON public.sales_payout_allocations;
CREATE POLICY sales_allocations_read_own ON public.sales_payout_allocations FOR SELECT TO authenticated
  USING (
    commission_id IN (
      SELECT c.id
      FROM public.sales_commissions c
      JOIN public.sales_representatives r ON c.sales_rep_id = r.id
      WHERE r.user_id = auth.uid() AND r.status = 'active'
    )
  );

-- Update get_my_banking_profile() to strictly require active status
CREATE OR REPLACE FUNCTION public.get_my_banking_profile()
RETURNS TABLE (
  bank_name text,
  bank_code varchar(10),
  masked_account_number text,
  account_name text,
  is_verified boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.bank_name,
    b.bank_code,
    ('••••••' || RIGHT(b.account_number, 4))::text AS masked_account_number,
    b.account_name,
    b.is_verified
  FROM public.sales_rep_bank_accounts b
  JOIN public.sales_representatives r ON b.sales_rep_id = r.id
  WHERE r.user_id = auth.uid()
    AND r.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.get_my_banking_profile() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_banking_profile() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. ADMIN AUTH USER LINKAGE (PREVENT DUPLICATES & PARTIAL LINKING)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_link_sales_rep_user(
  p_sales_rep_id uuid,
  p_auth_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_rep record;
  v_auth_email text;
  v_existing_rep_id uuid;
  v_actor_id uuid;
BEGIN
  IF NOT (COALESCE(public.is_platform_admin(), false) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Access Denied: Only Platform Administrators can link representative auth accounts'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_actor_id := auth.uid();

  SELECT * INTO v_rep
  FROM public.sales_representatives
  WHERE id = p_sales_rep_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales representative % not found', p_sales_rep_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_rep.status <> 'active' THEN
    RAISE EXCEPTION 'Cannot activate or invite a % sales representative', v_rep.status
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT email INTO v_auth_email
  FROM auth.users
  WHERE id = p_auth_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auth user % not found', p_auth_user_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF LOWER(TRIM(COALESCE(v_auth_email, ''))) <> LOWER(TRIM(v_rep.email)) THEN
    RAISE EXCEPTION 'Email mismatch: auth account email does not match representative record'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_rep.user_id IS NOT NULL AND v_rep.user_id <> p_auth_user_id THEN
    RAISE EXCEPTION 'Representative is already associated with a different user account'
      USING ERRCODE = 'unique_violation';
  END IF;

  SELECT id INTO v_existing_rep_id
  FROM public.sales_representatives
  WHERE user_id = p_auth_user_id
    AND id <> p_sales_rep_id;

  IF FOUND THEN
    RAISE EXCEPTION 'Auth user account is already linked to another sales representative'
      USING ERRCODE = 'unique_violation';
  END IF;

  UPDATE public.sales_representatives
  SET user_id = p_auth_user_id,
      updated_at = now()
  WHERE id = p_sales_rep_id
    AND (user_id IS NULL OR user_id = p_auth_user_id);

  INSERT INTO public.platform_audit_logs (
    action,
    actor_user_id,
    target_resource_type,
    target_resource_id,
    details
  ) VALUES (
    'rep_account.auth_linked',
    v_actor_id,
    'sales_representatives',
    p_sales_rep_id::text,
    jsonb_build_object(
      'sales_rep_id', p_sales_rep_id,
      'auth_user_id', p_auth_user_id
    )
  );

  RETURN jsonb_build_object(
    'linked', true,
    'sales_rep_id', p_sales_rep_id,
    'user_id', p_auth_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE EXECUTE ON FUNCTION public.admin_link_sales_rep_user(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_link_sales_rep_user(uuid, uuid) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. SELF-SERVICE PORTAL RPCS (DERIVED FROM auth.uid(), ZERO IDOR, FREE ACCESS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_verified_sales_rep_account()
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_auth_user record;
  v_rep record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT id, email, email_confirmed_at
  INTO v_auth_user
  FROM auth.users
  WHERE id = v_user_id;

  IF NOT FOUND OR v_auth_user.email_confirmed_at IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'email_unconfirmed');
  END IF;

  -- Check if already linked: sync email if verified email changed via Supabase Auth
  SELECT * INTO v_rep
  FROM public.sales_representatives
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF FOUND THEN
    IF LOWER(TRIM(v_rep.email)) <> LOWER(TRIM(v_auth_user.email)) AND v_rep.status = 'active' THEN
      UPDATE public.sales_representatives
      SET email = LOWER(TRIM(v_auth_user.email)),
          updated_at = now()
      WHERE id = v_rep.id;
    END IF;
    RETURN jsonb_build_object('claimed', true, 'sales_rep_id', v_rep.id, 'status', v_rep.status);
  END IF;

  -- Bind unlinked active representative matching confirmed email (never elevates privileges)
  SELECT * INTO v_rep
  FROM public.sales_representatives
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(v_auth_user.email))
    AND user_id IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_a_representative');
  END IF;

  IF v_rep.status <> 'active' THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'inactive_representative', 'status', v_rep.status);
  END IF;

  UPDATE public.sales_representatives
  SET user_id = v_user_id,
      updated_at = now()
  WHERE id = v_rep.id
    AND user_id IS NULL;

  INSERT INTO public.platform_audit_logs (
    action,
    actor_user_id,
    target_resource_type,
    target_resource_id,
    details
  ) VALUES (
    'rep_account.activated',
    v_user_id,
    'sales_representatives',
    v_rep.id::text,
    jsonb_build_object('sales_rep_id', v_rep.id, 'activated_at', now())
  );

  RETURN jsonb_build_object('claimed', true, 'sales_rep_id', v_rep.id, 'status', v_rep.status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE EXECUTE ON FUNCTION public.claim_verified_sales_rep_account() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_verified_sales_rep_account() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_sales_portal_context()
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_rep record;
  v_active_code text;
  v_flag_enabled boolean := false;
  v_total_referrals integer := 0;
  v_pending_referrals integer := 0;
  v_attributed_referrals integer := 0;
  v_qualified_referrals integer := 0;
  v_commission_earned_cents bigint := 0;
  v_pending_commission_cents bigint := 0;
  v_approved_commission_cents bigint := 0;
  v_paid_commission_cents bigint := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT COALESCE((value->>'enabled')::boolean, false)
  INTO v_flag_enabled
  FROM public.platform_settings
  WHERE key = 'sales_referrals_enabled';

  SELECT * INTO v_rep
  FROM public.sales_representatives
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_sales_rep', false,
      'has_portal_access', false,
      'commission_settlement_enabled', COALESCE(v_flag_enabled, false)
    );
  END IF;

  -- Immediate portal revocation when suspended, terminated, or completed
  IF v_rep.status <> 'active' THEN
    RETURN jsonb_build_object(
      'is_sales_rep', true,
      'has_portal_access', false,
      'status', v_rep.status,
      'full_name', v_rep.full_name,
      'commission_settlement_enabled', COALESCE(v_flag_enabled, false)
    );
  END IF;

  SELECT COALESCE(
    (SELECT code FROM public.sales_referral_codes WHERE sales_rep_id = v_rep.id AND is_active = true ORDER BY created_at ASC LIMIT 1),
    (SELECT code FROM public.sales_referral_codes WHERE sales_rep_id = v_rep.id ORDER BY created_at ASC LIMIT 1)
  ) INTO v_active_code;

  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE status = 'attributed')::integer,
    COUNT(*) FILTER (WHERE status IN ('attributed', 'qualified'))::integer,
    COUNT(*) FILTER (WHERE status = 'qualified')::integer
  INTO v_total_referrals, v_pending_referrals, v_attributed_referrals, v_qualified_referrals
  FROM public.sales_referrals
  WHERE sales_rep_id = v_rep.id;

  SELECT
    COALESCE(SUM(original_commission_cents) FILTER (WHERE current_status NOT IN ('cancelled', 'reversed')), 0)::bigint,
    COALESCE(SUM(original_commission_cents) FILTER (WHERE current_status IN ('pending', 'held_suspended', 'disputed')), 0)::bigint,
    COALESCE(SUM(original_commission_cents) FILTER (WHERE current_status IN ('approved', 'in_payout')), 0)::bigint,
    COALESCE(SUM(original_commission_cents) FILTER (WHERE current_status = 'paid'), 0)::bigint
  INTO v_commission_earned_cents, v_pending_commission_cents, v_approved_commission_cents, v_paid_commission_cents
  FROM public.sales_commissions
  WHERE sales_rep_id = v_rep.id;

  RETURN jsonb_build_object(
    'is_sales_rep', true,
    'has_portal_access', true,
    'free_partner_access', true,
    'commission_settlement_enabled', COALESCE(v_flag_enabled, false),
    'profile', jsonb_build_object(
      'id', v_rep.id,
      'user_id', v_rep.user_id,
      'full_name', v_rep.full_name,
      'email', v_rep.email,
      'phone_number', v_rep.phone_number,
      'state_region', v_rep.state_region,
      'status', v_rep.status,
      'commission_rate_bps', v_rep.commission_rate_bps,
      'pilot_start_date', v_rep.pilot_start_date,
      'pilot_end_date', v_rep.pilot_end_date,
      'referral_code', v_active_code
    ),
    'metrics', jsonb_build_object(
      'total_referrals', v_total_referrals,
      'pending_referrals', v_pending_referrals,
      'attributed_registrations', v_attributed_referrals,
      'qualified_conversions', v_qualified_referrals,
      'commission_earned_cents', v_commission_earned_cents,
      'pending_commission_cents', v_pending_commission_cents,
      'approved_commission_cents', v_approved_commission_cents,
      'paid_commission_cents', v_paid_commission_cents
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE EXECUTE ON FUNCTION public.get_my_sales_portal_context() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_sales_portal_context() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_rep_referrals()
RETURNS TABLE (
  id uuid,
  practice_name text,
  practice_slug text,
  attribution_type text,
  status text,
  disqualification_reason text,
  subscription_status text,
  attributed_at timestamptz,
  qualified_at timestamptz
) AS $$
DECLARE
  v_rep_id uuid;
BEGIN
  v_rep_id := public.current_sales_rep_id();
  IF v_rep_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Active sales representative authorization required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    sr.id,
    p.name AS practice_name,
    p.slug AS practice_slug,
    sr.attribution_type,
    sr.status,
    sr.disqualification_reason,
    COALESCE(ps.status::text, p.status) AS subscription_status,
    sr.attributed_at,
    sr.qualified_at
  FROM public.sales_referrals sr
  JOIN public.practices p ON sr.practice_id = p.id
  LEFT JOIN public.practice_subscriptions ps ON ps.practice_id = p.id
  WHERE sr.sales_rep_id = v_rep_id
  ORDER BY sr.attributed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.get_my_rep_referrals() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_rep_referrals() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_rep_commissions()
RETURNS TABLE (
  id uuid,
  practice_name text,
  practice_slug text,
  gross_amount_cents bigint,
  net_eligible_cents bigint,
  commission_rate_bps integer,
  original_commission_cents bigint,
  current_status text,
  holding_expires_at timestamptz,
  is_payout_frozen boolean,
  approved_at timestamptz,
  created_at timestamptz,
  adjustments jsonb
) AS $$
DECLARE
  v_rep_id uuid;
BEGIN
  v_rep_id := public.current_sales_rep_id();
  IF v_rep_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Active sales representative authorization required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    p.name AS practice_name,
    p.slug AS practice_slug,
    c.gross_amount_cents,
    c.net_eligible_cents,
    c.commission_rate_bps,
    c.original_commission_cents,
    c.current_status,
    c.holding_expires_at,
    c.is_payout_frozen,
    c.approved_at,
    c.created_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'adjustment_type', a.adjustment_type,
            'delta_amount_cents', a.delta_amount_cents,
            'reason', a.reason,
            'created_at', a.created_at
          ) ORDER BY a.created_at DESC
        )
        FROM public.sales_commission_adjustments a
        WHERE a.commission_id = c.id
      ),
      '[]'::jsonb
    ) AS adjustments
  FROM public.sales_commissions c
  JOIN public.sales_referrals sr ON c.referral_id = sr.id
  JOIN public.practices p ON sr.practice_id = p.id
  WHERE c.sales_rep_id = v_rep_id
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.get_my_rep_commissions() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_rep_commissions() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_my_rep_profile(
  p_full_name text,
  p_phone_number text,
  p_state_region text
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_rep record;
  v_clean_name text;
  v_clean_phone text;
  v_clean_region text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_rep
  FROM public.sales_representatives
  WHERE user_id = v_user_id
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Access Denied: Only active sales representatives may update their profile'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_clean_name := TRIM(COALESCE(p_full_name, ''));
  v_clean_phone := TRIM(COALESCE(p_phone_number, ''));
  v_clean_region := TRIM(COALESCE(p_state_region, ''));

  IF LENGTH(v_clean_name) < 2 THEN
    RAISE EXCEPTION 'Full name must be at least 2 characters'
      USING ERRCODE = 'check_violation';
  END IF;
  IF LENGTH(v_clean_phone) < 7 THEN
    RAISE EXCEPTION 'Phone number must be at least 7 characters'
      USING ERRCODE = 'check_violation';
  END IF;
  IF LENGTH(v_clean_region) < 2 THEN
    RAISE EXCEPTION 'State / region must be at least 2 characters'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.sales_representatives
  SET full_name = v_clean_name,
      phone_number = v_clean_phone,
      state_region = v_clean_region,
      updated_at = now()
  WHERE id = v_rep.id;

  -- Sync display_name only; never touch is_platform_admin
  UPDATE public.profiles
  SET display_name = v_clean_name,
      phone = v_clean_phone,
      updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO public.platform_audit_logs (
    action,
    actor_user_id,
    target_resource_type,
    target_resource_id,
    details
  ) VALUES (
    'rep_profile.self_updated',
    v_user_id,
    'sales_representatives',
    v_rep.id::text,
    jsonb_build_object(
      'sales_rep_id', v_rep.id,
      'updated_fields', ARRAY['full_name', 'phone_number', 'state_region']
    )
  );

  RETURN jsonb_build_object(
    'id', v_rep.id,
    'full_name', v_clean_name,
    'phone_number', v_clean_phone,
    'state_region', v_clean_region,
    'updated', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE EXECUTE ON FUNCTION public.update_my_rep_profile(text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_my_rep_profile(text, text, text) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. REFERRAL CODE VALIDATION & SERVER-AUTHORITATIVE ATTRIBUTION (NON-BLOCKING)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text)
RETURNS jsonb AS $$
DECLARE
  v_clean text;
  v_exists boolean := false;
BEGIN
  v_clean := UPPER(TRIM(COALESCE(p_code, '')));
  IF v_clean !~ '^[A-Z0-9_-]{4,32}$' THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.sales_referral_codes c
    JOIN public.sales_representatives r ON c.sales_rep_id = r.id
    WHERE c.code = v_clean
      AND c.is_active = true
      AND r.status = 'active'
      AND (now() AT TIME ZONE 'Africa/Lagos')::date BETWEEN r.pilot_start_date AND r.pilot_end_date
  ) INTO v_exists;

  -- Returns minimal boolean only; zero representative PII disclosed
  RETURN jsonb_build_object('valid', v_exists, 'code', CASE WHEN v_exists THEN v_clean ELSE NULL END);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.validate_referral_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(text) TO anon, authenticated, service_role;

-- Standalone safe attribution helper (only active if no referral recorded yet)
CREATE OR REPLACE FUNCTION public.attribute_practice_referral(
  p_practice_id uuid,
  p_referral_code text,
  p_attribution_type text DEFAULT 'code_link'
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_clean_code text;
  v_code_rec record;
  v_status text;
  v_disqual_reason text;
  v_existing_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner']) THEN
    RAISE EXCEPTION 'Access Denied: Only the practice owner can register referral attribution'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.sales_referrals
  WHERE practice_id = p_practice_id;

  IF FOUND THEN
    RETURN jsonb_build_object('attributed', false, 'reason', 'already_attributed');
  END IF;

  v_clean_code := UPPER(TRIM(COALESCE(p_referral_code, '')));
  IF v_clean_code !~ '^[A-Z0-9_-]{4,32}$' THEN
    RETURN jsonb_build_object('attributed', false, 'reason', 'invalid_format');
  END IF;

  SELECT
    c.id AS code_id,
    c.sales_rep_id,
    r.status AS rep_status,
    r.pilot_start_date,
    r.pilot_end_date,
    r.user_id AS rep_user_id,
    r.email AS rep_email
  INTO v_code_rec
  FROM public.sales_referral_codes c
  JOIN public.sales_representatives r ON c.sales_rep_id = r.id
  WHERE c.code = v_clean_code
    AND c.is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('attributed', false, 'reason', 'code_not_found');
  END IF;

  -- Inactive or suspended representatives cannot receive new attributions
  IF v_code_rec.rep_status <> 'active' THEN
    RETURN jsonb_build_object('attributed', false, 'reason', 'inactive_representative');
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  IF (v_code_rec.rep_user_id IS NOT NULL AND v_code_rec.rep_user_id = v_user_id)
     OR LOWER(TRIM(COALESCE(v_user_email, ''))) = LOWER(TRIM(v_code_rec.rep_email)) THEN
    v_status := 'disqualified';
    v_disqual_reason := 'Self-referral prohibited: registering user matches sales representative';
  ELSIF EXISTS (
    SELECT 1 FROM public.practice_memberships
    WHERE user_id = v_user_id
      AND role = 'practice_owner'
      AND practice_id <> p_practice_id
  ) THEN
    v_status := 'disqualified';
    v_disqual_reason := 'Registering user previously owned an existing practice';
  ELSIF (now() AT TIME ZONE 'Africa/Lagos')::date < v_code_rec.pilot_start_date
     OR (now() AT TIME ZONE 'Africa/Lagos')::date > v_code_rec.pilot_end_date THEN
    v_status := 'disqualified';
    v_disqual_reason := 'Referral occurred outside representative pilot window';
  ELSE
    v_status := 'attributed';
    v_disqual_reason := NULL;
  END IF;

  INSERT INTO public.sales_referrals (
    practice_id,
    sales_rep_id,
    referral_code_id,
    attribution_type,
    status,
    disqualification_reason,
    attributed_by_user_id,
    attributed_at
  ) VALUES (
    p_practice_id,
    v_code_rec.sales_rep_id,
    v_code_rec.code_id,
    CASE WHEN p_attribution_type IN ('code_link', 'manual_code_entry') THEN p_attribution_type ELSE 'code_link' END,
    v_status,
    v_disqual_reason,
    v_user_id,
    now()
  ) ON CONFLICT (practice_id) DO NOTHING;

  PERFORM public.log_audit_event(
    p_practice_id,
    'referral.attributed',
    'sales_referrals',
    p_practice_id,
    jsonb_build_object(
      'code', v_clean_code,
      'sales_rep_id', v_code_rec.sales_rep_id,
      'status', v_status,
      'disqualification_reason', v_disqual_reason
    ),
    'onboarding_rpc'
  );

  RETURN jsonb_build_object(
    'attributed', (v_status = 'attributed'),
    'status', v_status,
    'disqualification_reason', v_disqual_reason
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE EXECUTE ON FUNCTION public.attribute_practice_referral(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.attribute_practice_referral(uuid, text, text) TO authenticated, service_role;

-- Replace 6-parameter overload cleanly with 7-parameter backward-compatible RPC
-- without modifying Paystack settlement or enabling referral commissions.
DROP FUNCTION IF EXISTS public.register_practice_and_subscribe(
  text,
  text,
  public.saas_plan_code,
  public.saas_billing_interval,
  text,
  text
);

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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to register practice'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

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

  IF p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' OR length(p_slug) < 3 OR length(p_slug) > 48 THEN
    RAISE EXCEPTION 'Slug must be 3-48 lowercase alphanumeric characters or hyphens'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF EXISTS (SELECT 1 FROM public.practices WHERE slug = p_slug) THEN
    RAISE EXCEPTION 'Practice slug % is already registered', p_slug
      USING ERRCODE = 'unique_violation';
  END IF;

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

  INSERT INTO public.practices (
    name, slug, status, country, timezone
  ) VALUES (
    TRIM(p_practice_name),
    p_slug,
    CASE WHEN v_status = 'trialing' THEN 'trial' ELSE 'active' END,
    p_country,
    p_timezone
  ) RETURNING id INTO v_practice_id;

  INSERT INTO public.practice_memberships (
    practice_id, user_id, role, status, joined_at
  ) VALUES (
    v_practice_id, v_user_id, 'practice_owner', 'active', now()
  );

  INSERT INTO public.practice_subscriptions (
    practice_id, plan_id, status, billing_interval,
    current_price_cents, currency, seat_limit,
    current_period_start, current_period_end,
    trial_started_at, trial_ends_at
  ) VALUES (
    v_practice_id, v_plan.id, v_status, p_billing_interval,
    v_price_cents, v_plan.currency, v_plan.practitioner_seat_limit,
    v_period_start, v_period_end,
    CASE WHEN v_status = 'trialing' THEN v_period_start ELSE NULL END,
    v_trial_ends_at
  ) RETURNING id INTO v_subscription_id;

  INSERT INTO public.practice_invoice_counters (practice_id, last_number)
  VALUES (v_practice_id, 0) ON CONFLICT (practice_id) DO NOTHING;

  INSERT INTO public.practice_patient_counters (practice_id, next_val)
  VALUES (v_practice_id, 1) ON CONFLICT (practice_id) DO NOTHING;

  INSERT INTO public.practice_wallet_counters (practice_id, last_number)
  VALUES (v_practice_id, 0) ON CONFLICT (practice_id) DO NOTHING;

  INSERT INTO public.practice_imaging_counters (practice_id, last_order_number, last_study_number)
  VALUES (v_practice_id, 0, 0) ON CONFLICT (practice_id) DO NOTHING;

  -- Non-blocking Server-Authoritative Referral Attribution (single shared source of truth)
  IF p_referral_code IS NOT NULL AND TRIM(p_referral_code) <> '' THEN
    BEGIN
      PERFORM public.attribute_practice_referral(v_practice_id, p_referral_code, 'code_link');
    EXCEPTION WHEN OTHERS THEN
      -- Invalid, inactive, or transient referral issues never abort ordinary clinic registration
      NULL;
    END;
  END IF;

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

REVOKE EXECUTE ON FUNCTION public.register_practice_and_subscribe(
  text, text, public.saas_plan_code, public.saas_billing_interval, text, text, text
) FROM public;
GRANT EXECUTE ON FUNCTION public.register_practice_and_subscribe(
  text, text, public.saas_plan_code, public.saas_billing_interval, text, text, text
) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 6. MIGRATION TRACKING & SCHEMA RELOAD
-- ------------------------------------------------------------------------------
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20261112100000', 'sales_rep_portal_and_attribution')
ON CONFLICT (version) DO NOTHING;

NOTIFY pgrst, 'reload schema';
