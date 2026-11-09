-- ==============================================================================
-- PHYSENRA SAAS — SALES REPRESENTATIVE & REFERRAL MANAGEMENT FOUNDATION V1
-- Migration: 20261110000000_sales_rep_and_referral_foundation.sql
--
-- Governs:
-- 1. Sales Representatives & Isolated Banking Credentials
-- 2. Unique Referral Codes & Referral Attributions (with qualifying_payment_id)
-- 3. Immutable Commission Snapshot Ledger & Append-Only Lifecycle Events
-- 4. Idempotent Commission Adjustments & Signed Append-Only Recovery Ledger
-- 5. Durable Commission Outbox & Adjustment Quarantine
-- 6. Batch Payouts & M:N Allocation Junction (Allocations Scoped by Unique Payout)
-- 7. Strict Immutability Triggers (Permanent Paid Invoice & Commission Protection)
-- 8. Server-Side Masked Banking & Audited Raw NUBAN Retrieval RPCs
-- 9. Complete Row Level Security (RLS) & Access Firewall
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTEND SAAS_PAYMENTS WITH AUTHORITATIVE PAYSTACK PAID_AT TIMESTAMP
-- ------------------------------------------------------------------------------
ALTER TABLE public.saas_payments
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- ------------------------------------------------------------------------------
-- 2. PERMANENT PAID-INVOICE FINANCIAL IMMUTABILITY TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_freeze_paid_invoice_financials()
RETURNS TRIGGER AS $$
BEGIN
  -- Once paid_at is populated, it can NEVER be cleared, modified, or replaced,
  -- and financial amounts and tenant anchors can NEVER be modified,
  -- regardless of invoice status changes (e.g. to void, uncollectible, or open).
  IF OLD.paid_at IS NOT NULL THEN
    IF NEW.paid_at IS NULL OR NEW.paid_at <> OLD.paid_at THEN
      RAISE EXCEPTION 'Permanent Financial Invariant: Once paid_at is populated, it cannot be cleared, modified, or replaced'
        USING ERRCODE = 'restrict_violation';
    END IF;

    IF OLD.subtotal_cents <> NEW.subtotal_cents OR
       OLD.discount_cents <> NEW.discount_cents OR
       OLD.tax_cents <> NEW.tax_cents OR
       OLD.total_cents <> NEW.total_cents OR
       OLD.currency <> NEW.currency OR
       OLD.practice_id <> NEW.practice_id OR
       OLD.subscription_id <> NEW.subscription_id THEN
      RAISE EXCEPTION 'Permanent Financial Invariant: Invoices with paid_at cannot have financial amounts or identity modified'
        USING ERRCODE = 'restrict_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_freeze_paid_invoice_financials ON public.saas_invoices;
DROP TRIGGER IF EXISTS trg_00_freeze_paid_invoice_financials ON public.saas_invoices;
CREATE TRIGGER trg_00_freeze_paid_invoice_financials
BEFORE UPDATE ON public.saas_invoices
FOR EACH ROW EXECUTE FUNCTION public.fn_freeze_paid_invoice_financials();

-- ------------------------------------------------------------------------------
-- 3. SALES REPRESENTATIVES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_representatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone_number text NOT NULL,
  state_region text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated', 'completed')),
  commission_rate_bps integer NOT NULL DEFAULT 2000 CHECK (commission_rate_bps >= 0 AND commission_rate_bps <= 10000),
  pilot_start_date date NOT NULL DEFAULT CURRENT_DATE,
  pilot_end_date date NOT NULL DEFAULT (CURRENT_DATE + interval '90 days'),
  terminated_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_reps_status ON public.sales_representatives(status);
CREATE INDEX IF NOT EXISTS idx_sales_reps_user ON public.sales_representatives(user_id);

-- ------------------------------------------------------------------------------
-- 4. SALES REP BANK ACCOUNTS (ISOLATED RAW CREDENTIALS — ADMIN ONLY)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_rep_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep_id uuid NOT NULL UNIQUE REFERENCES public.sales_representatives(id) ON DELETE RESTRICT,
  bank_name text NOT NULL,
  bank_code varchar(10) NOT NULL,
  account_number varchar(10) NOT NULL CHECK (account_number ~ '^[0-9]{10}$'),
  account_name text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  verified_by_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5. SALES REFERRAL CODES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep_id uuid NOT NULL REFERENCES public.sales_representatives(id) ON DELETE RESTRICT,
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9_-]{4,32}$'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_referral_codes_rep ON public.sales_referral_codes(sales_rep_id);

-- ------------------------------------------------------------------------------
-- 6. SALES REFERRALS TABLE (PRACTICE ATTRIBUTION ANCHOR)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL UNIQUE REFERENCES public.practices(id) ON DELETE RESTRICT,
  sales_rep_id uuid NOT NULL REFERENCES public.sales_representatives(id) ON DELETE RESTRICT,
  referral_code_id uuid REFERENCES public.sales_referral_codes(id) ON DELETE SET NULL,
  attribution_type text NOT NULL DEFAULT 'code_link' CHECK (attribution_type IN ('code_link', 'manual_code_entry', 'manual_admin')),
  status text NOT NULL DEFAULT 'attributed' CHECK (status IN ('attributed', 'qualified', 'disqualified', 'expired')),
  disqualification_reason text,
  qualifying_payment_id uuid UNIQUE REFERENCES public.saas_payments(id) ON DELETE RESTRICT,
  admin_justification text,
  attributed_by_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  attributed_at timestamptz NOT NULL DEFAULT now(),
  qualified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_referrals_rep ON public.sales_referrals(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_referrals_status ON public.sales_referrals(status);

-- ------------------------------------------------------------------------------
-- 7. SALES COMMISSIONS TABLE (IMMUTABLE SNAPSHOT + CONTROLLED PROJECTION)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL UNIQUE REFERENCES public.sales_referrals(id) ON DELETE RESTRICT,
  sales_rep_id uuid NOT NULL REFERENCES public.sales_representatives(id) ON DELETE RESTRICT,
  invoice_id uuid NOT NULL REFERENCES public.saas_invoices(id) ON DELETE RESTRICT,
  payment_id uuid NOT NULL UNIQUE REFERENCES public.saas_payments(id) ON DELETE RESTRICT,
  gross_amount_cents bigint NOT NULL CHECK (gross_amount_cents >= 0),
  tax_cents bigint NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  gateway_fee_cents bigint NOT NULL DEFAULT 0 CHECK (gateway_fee_cents >= 0),
  net_eligible_cents bigint NOT NULL CHECK (net_eligible_cents >= 0),
  commission_rate_bps integer NOT NULL CHECK (commission_rate_bps >= 0),
  original_commission_cents bigint NOT NULL CHECK (original_commission_cents >= 0),
  currency text NOT NULL DEFAULT 'NGN',
  current_status text NOT NULL DEFAULT 'pending' CHECK (current_status IN (
    'pending', 'approved', 'in_payout', 'paid', 'partially_paid',
    'held_suspended', 'disputed', 'cancelled', 'reversed'
  )),
  holding_expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  is_payout_frozen boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  approved_by_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_commission_math CHECK (
    net_eligible_cents = GREATEST(0::bigint, gross_amount_cents - tax_cents - gateway_fee_cents) AND
    original_commission_cents = ROUND((net_eligible_cents * commission_rate_bps)::numeric / 10000)::bigint
  )
);

CREATE INDEX IF NOT EXISTS idx_sales_commissions_rep ON public.sales_commissions(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_status ON public.sales_commissions(current_status);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_payment ON public.sales_commissions(payment_id);

-- ------------------------------------------------------------------------------
-- 8. COMMISSION FINANCIAL IMMUTABILITY TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_protect_commission_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Financial calculations, IDs, and timestamps are PERMANENTLY IMMUTABLE.
  IF OLD.gross_amount_cents <> NEW.gross_amount_cents OR
     OLD.tax_cents <> NEW.tax_cents OR
     OLD.gateway_fee_cents <> NEW.gateway_fee_cents OR
     OLD.net_eligible_cents <> NEW.net_eligible_cents OR
     OLD.commission_rate_bps <> NEW.commission_rate_bps OR
     OLD.original_commission_cents <> NEW.original_commission_cents OR
     OLD.currency <> NEW.currency OR
     OLD.referral_id <> NEW.referral_id OR
     OLD.sales_rep_id <> NEW.sales_rep_id OR
     OLD.invoice_id <> NEW.invoice_id OR
     OLD.payment_id <> NEW.payment_id OR
     OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'Permanent Financial Invariant: Financial calculation columns on sales_commissions cannot be modified'
      USING ERRCODE = 'restrict_violation';
  END IF;

  -- 2. Direct updates to lifecycle fields are strictly denied.
  -- Lifecycle changes are permitted ONLY through authorised database transition functions.
  IF (OLD.current_status <> NEW.current_status OR
      OLD.is_payout_frozen <> NEW.is_payout_frozen OR
      OLD.approved_at IS DISTINCT FROM NEW.approved_at OR
      OLD.approved_by_user_id IS DISTINCT FROM NEW.approved_by_user_id OR
      OLD.holding_expires_at <> NEW.holding_expires_at) THEN
    IF current_setting('physenra.in_commission_transition', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Direct update to commission lifecycle fields prohibited; use transition_commission_status()'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_commission_immutability ON public.sales_commissions;
CREATE TRIGGER trg_protect_commission_immutability
BEFORE UPDATE ON public.sales_commissions
FOR EACH ROW EXECUTE FUNCTION public.fn_protect_commission_immutability();

-- ------------------------------------------------------------------------------
-- 9. SALES COMMISSION EVENTS TABLE (IMMUTABLE LIFECYCLE LEDGER)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_commission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES public.sales_commissions(id) ON DELETE RESTRICT,
  from_status text NOT NULL,
  to_status text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'created', 'hold_matured', 'suspension_held', 'suspension_cleared',
    'contract_terminated', 'batch_reserved', 'payout_completed',
    'batch_released', 'refund_cancelled', 'dispute_opened',
    'dispute_won', 'dispute_lost', 'post_payout_reversal', 'manual_adjustment'
  )),
  reason text NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commission_events_comm ON public.sales_commission_events(commission_id);

-- Prohibit direct updates or deletes on commission events
REVOKE UPDATE, DELETE ON public.sales_commission_events FROM public, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 10. SALES COMMISSION ADJUSTMENTS TABLE (IDEMPOTENT DELTA LEDGER)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_commission_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES public.sales_commissions(id) ON DELETE RESTRICT,
  sales_rep_id uuid NOT NULL REFERENCES public.sales_representatives(id) ON DELETE RESTRICT,
  adjustment_type text NOT NULL CHECK (adjustment_type IN (
    'full_refund', 'partial_refund', 'chargeback', 'payment_reversal',
    'rate_correction', 'manual_adjustment', 'dispute_reversal'
  )),
  delta_amount_cents bigint NOT NULL CHECK (delta_amount_cents <> 0),
  source_system text NOT NULL CHECK (source_system IN ('paystack_webhook', 'manual_admin', 'banking_reversal')),
  external_event_id text NOT NULL,
  reason text NOT NULL,
  adjusted_by_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_commission_adjustment_source UNIQUE (commission_id, source_system, external_event_id)
);

CREATE INDEX IF NOT EXISTS idx_commission_adjustments_comm ON public.sales_commission_adjustments(commission_id);
REVOKE UPDATE, DELETE ON public.sales_commission_adjustments FROM public, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 11. SALES RECOVERY ENTRIES TABLE (SIGNED APPEND-ONLY DEBT LEDGER)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_recovery_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep_id uuid NOT NULL REFERENCES public.sales_representatives(id) ON DELETE RESTRICT,
  source_system text NOT NULL CHECK (source_system IN (
    'paystack_refund', 'paystack_transfer_reversal', 'commission_payout', 'bank_deposit', 'admin_correction'
  )),
  source_reference_id text NOT NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('clawback_debt', 'commission_offset', 'manual_recovery', 'reversal_offset')),
  amount_cents bigint NOT NULL CHECK (amount_cents <> 0),
  offset_commission_id uuid REFERENCES public.sales_commissions(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_recovery_source UNIQUE (sales_rep_id, source_system, source_reference_id, entry_type)
);

CREATE INDEX IF NOT EXISTS idx_recovery_entries_rep ON public.sales_recovery_entries(sales_rep_id);
REVOKE UPDATE, DELETE ON public.sales_recovery_entries FROM public, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 12. SALES COMMISSION OUTBOX TABLE (DURABLE RETRY QUEUE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_commission_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  invoice_id uuid NOT NULL REFERENCES public.saas_invoices(id) ON DELETE RESTRICT,
  payment_id uuid NOT NULL UNIQUE REFERENCES public.saas_payments(id) ON DELETE RESTRICT,
  referral_id uuid REFERENCES public.sales_referrals(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending_retry' CHECK (status IN ('pending_retry', 'processing', 'resolved', 'abandoned', 'error')),
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 5,
  lease_expires_at timestamptz,
  last_error text,
  resolution_reason text,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commission_outbox_queue 
  ON public.sales_commission_outbox(status, next_retry_at) 
  WHERE status IN ('pending_retry', 'processing');

-- ------------------------------------------------------------------------------
-- 13. SALES COMMISSION PAYOUTS TABLE (BATCH DISBURSEMENTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_commission_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_number text NOT NULL UNIQUE, -- Format: PHY-PAYOUT-YYYY-XXXXXX
  transfer_reference text UNIQUE,     -- Paystack Transfer Code TRF_... or NIP reference
  sales_rep_id uuid NOT NULL REFERENCES public.sales_representatives(id) ON DELETE RESTRICT,
  total_amount_cents bigint NOT NULL CHECK (total_amount_cents > 0),
  currency text NOT NULL DEFAULT 'NGN',
  bank_name text NOT NULL,
  bank_code varchar(10) NOT NULL,
  masked_account_number varchar(10) NOT NULL, -- e.g. '••••••4567'
  account_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'initiated', 'processing', 'completed', 'failed', 'cancelled')),
  failure_reason text,
  paid_by_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commission_payouts_rep ON public.sales_commission_payouts(sales_rep_id);

-- ------------------------------------------------------------------------------
-- 14. SALES PAYOUT ALLOCATIONS TABLE (M:N COMMISSION-TO-PAYOUT JUNCTION)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_payout_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.sales_commission_payouts(id) ON DELETE RESTRICT,
  commission_id uuid NOT NULL REFERENCES public.sales_commissions(id) ON DELETE RESTRICT,
  allocated_amount_cents bigint NOT NULL CHECK (allocated_amount_cents > 0),
  allocation_status text NOT NULL DEFAULT 'reserved' CHECK (allocation_status IN ('reserved', 'settled', 'released')),
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  released_at timestamptz,
  CONSTRAINT uq_payout_commission UNIQUE (payout_id, commission_id)
);

CREATE INDEX IF NOT EXISTS idx_allocations_payout ON public.sales_payout_allocations(payout_id);
CREATE INDEX IF NOT EXISTS idx_allocations_comm ON public.sales_payout_allocations(commission_id);

-- ------------------------------------------------------------------------------
-- 15. SALES ADJUSTMENT QUARANTINE TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_adjustment_quarantine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  source_reference text,
  payload jsonb NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'resolved', 'dismissed')),
  resolved_by_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- ------------------------------------------------------------------------------
-- 16. AUTHORITATIVE STORED PROCEDURES
-- ------------------------------------------------------------------------------

-- Procedure 1: Transition Commission Status (with Event Logging)
CREATE OR REPLACE FUNCTION public.transition_commission_status(
  p_commission_id uuid,
  p_target_status text,
  p_event_type text,
  p_reason text,
  p_actor_user_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
DECLARE
  v_comm record;
  v_actor uuid;
BEGIN
  -- Validate caller authority: Must be Platform Admin or service_role
  IF NOT (COALESCE(public.is_platform_admin(), false) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Access Denied: Only Platform Admins or system services can transition commission states'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_actor := COALESCE(p_actor_user_id, auth.uid());

  -- Set session guard flag to permit the update through the immutability trigger
  PERFORM set_config('physenra.in_commission_transition', 'true', true);

  -- Lock commission row
  SELECT * INTO v_comm
  FROM public.sales_commissions
  WHERE id = p_commission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission % not found', p_commission_id
      USING ERRCODE = 'data_exception';
  END IF;

  -- Insert immutable event in same transaction (atomic state transition)
  INSERT INTO public.sales_commission_events (
    commission_id,
    from_status,
    to_status,
    event_type,
    reason,
    actor_user_id,
    metadata
  ) VALUES (
    p_commission_id,
    v_comm.current_status,
    p_target_status,
    p_event_type,
    p_reason,
    v_actor,
    p_metadata
  );

  -- Update controlled status projection
  UPDATE public.sales_commissions
  SET current_status = p_target_status,
      approved_at = CASE WHEN p_target_status = 'approved' AND approved_at IS NULL THEN now() ELSE approved_at END,
      approved_by_user_id = CASE WHEN p_target_status = 'approved' AND approved_by_user_id IS NULL THEN v_actor ELSE approved_by_user_id END,
      is_payout_frozen = CASE 
        WHEN p_target_status = 'held_suspended' THEN true 
        WHEN p_event_type = 'suspension_cleared' THEN false 
        ELSE is_payout_frozen 
      END,
      updated_at = now()
  WHERE id = p_commission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.transition_commission_status(uuid, text, text, text, uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.transition_commission_status(uuid, text, text, text, uuid, jsonb) TO authenticated, service_role;

-- Revoke direct UPDATE/DELETE on sales_commissions across client roles
REVOKE UPDATE, DELETE ON public.sales_commissions FROM public, authenticated;

-- Procedure 2: Representative Masked Banking View RPC
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
  WHERE r.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.get_my_banking_profile() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_banking_profile() TO authenticated, service_role;

-- Procedure 3: Admin Reveal Raw NUBAN with Mandatory Audit
CREATE OR REPLACE FUNCTION public.admin_reveal_rep_bank_account(
  p_sales_rep_id uuid,
  p_justification text
)
RETURNS TABLE (
  bank_name text,
  bank_code varchar(10),
  account_number varchar(10),
  account_name text,
  is_verified boolean
) AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  v_admin_id := auth.uid();

  -- Strict Platform Admin Authorization
  IF NOT (COALESCE(public.is_platform_admin(), false) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Access Denied: Only Platform Admins can reveal raw representative bank details'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Mandatory written justification
  IF p_justification IS NULL OR TRIM(p_justification) = '' THEN
    RAISE EXCEPTION 'Mandatory justification required to reveal unmasked bank details'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Audit log BEFORE revealing credentials
  INSERT INTO public.platform_audit_logs (
    action,
    actor_user_id,
    target_resource_type,
    target_resource_id,
    details
  ) VALUES (
    'rep_banking.raw_revealed',
    v_admin_id,
    'sales_rep_bank_accounts',
    p_sales_rep_id::text,
    jsonb_build_object(
      'sales_rep_id', p_sales_rep_id,
      'justification', TRIM(p_justification),
      'revealed_at', now()
    )
  );

  RETURN QUERY
  SELECT 
    b.bank_name,
    b.bank_code,
    b.account_number,
    b.account_name,
    b.is_verified
  FROM public.sales_rep_bank_accounts b
  WHERE b.sales_rep_id = p_sales_rep_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.admin_reveal_rep_bank_account(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_reveal_rep_bank_account(uuid, text) TO authenticated, service_role;

-- Procedure 4: Admin Requeue Abandoned Outbox Record
CREATE OR REPLACE FUNCTION public.admin_requeue_abandoned_outbox(
  p_outbox_id uuid,
  p_justification text
)
RETURNS boolean AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  v_admin_id := auth.uid();

  IF NOT (COALESCE(public.is_platform_admin(), false) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Access Denied: Only Platform Admins can requeue abandoned outbox tasks'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_justification IS NULL OR TRIM(p_justification) = '' THEN
    RAISE EXCEPTION 'Mandatory justification required to requeue abandoned outbox task'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.sales_commission_outbox
  SET status = 'pending_retry',
      retry_count = 0,
      next_retry_at = now(),
      last_error = 'Admin requeued: ' || TRIM(p_justification),
      updated_at = now()
  WHERE id = p_outbox_id
    AND status IN ('abandoned', 'error');

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Audit log action
  INSERT INTO public.platform_audit_logs (
    action,
    actor_user_id,
    target_resource_type,
    target_resource_id,
    details
  ) VALUES (
    'commission_outbox.requeued',
    v_admin_id,
    'sales_commission_outbox',
    p_outbox_id::text,
    jsonb_build_object(
      'outbox_id', p_outbox_id,
      'justification', TRIM(p_justification)
    )
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.admin_requeue_abandoned_outbox(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_requeue_abandoned_outbox(uuid, text) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 17. INITIALIZE PLATFORM SETTING FOR SALES REFERRALS (DISABLED BY DEFAULT)
-- ------------------------------------------------------------------------------
INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'sales_referrals_enabled',
  '{"enabled": false, "pilot_mode": true, "annual_cap_cents": 2500000}'::jsonb,
  'Master toggle and parameters for Physenra Sales Representative & Referral Management'
)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 18. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.sales_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_rep_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_commission_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_commission_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_recovery_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_commission_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_commission_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_payout_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_adjustment_quarantine ENABLE ROW LEVEL SECURITY;

-- Super Admin Full CRUD across all tables
DROP POLICY IF EXISTS sales_reps_admin_all ON public.sales_representatives;
CREATE POLICY sales_reps_admin_all ON public.sales_representatives FOR ALL TO authenticated
  USING (COALESCE(public.is_platform_admin(), false)) WITH CHECK (COALESCE(public.is_platform_admin(), false));

DROP POLICY IF EXISTS sales_rep_bank_admin_all ON public.sales_rep_bank_accounts;
CREATE POLICY sales_rep_bank_admin_all ON public.sales_rep_bank_accounts FOR ALL TO authenticated
  USING (COALESCE(public.is_platform_admin(), false)) WITH CHECK (COALESCE(public.is_platform_admin(), false));

DROP POLICY IF EXISTS sales_codes_admin_all ON public.sales_referral_codes;
CREATE POLICY sales_codes_admin_all ON public.sales_referral_codes FOR ALL TO authenticated
  USING (COALESCE(public.is_platform_admin(), false)) WITH CHECK (COALESCE(public.is_platform_admin(), false));

DROP POLICY IF EXISTS sales_referrals_admin_all ON public.sales_referrals;
CREATE POLICY sales_referrals_admin_all ON public.sales_referrals FOR ALL TO authenticated
  USING (COALESCE(public.is_platform_admin(), false)) WITH CHECK (COALESCE(public.is_platform_admin(), false));

DROP POLICY IF EXISTS sales_commissions_admin_all ON public.sales_commissions;
CREATE POLICY sales_commissions_admin_all ON public.sales_commissions FOR ALL TO authenticated
  USING (COALESCE(public.is_platform_admin(), false)) WITH CHECK (COALESCE(public.is_platform_admin(), false));

DROP POLICY IF EXISTS sales_events_admin_all ON public.sales_commission_events;
CREATE POLICY sales_events_admin_all ON public.sales_commission_events FOR ALL TO authenticated
  USING (COALESCE(public.is_platform_admin(), false));

DROP POLICY IF EXISTS sales_adjustments_admin_all ON public.sales_commission_adjustments;
CREATE POLICY sales_adjustments_admin_all ON public.sales_commission_adjustments FOR ALL TO authenticated
  USING (COALESCE(public.is_platform_admin(), false));

DROP POLICY IF EXISTS sales_recovery_admin_all ON public.sales_recovery_entries;
CREATE POLICY sales_recovery_admin_all ON public.sales_recovery_entries FOR ALL TO authenticated
  USING (COALESCE(public.is_platform_admin(), false));

DROP POLICY IF EXISTS sales_outbox_admin_all ON public.sales_commission_outbox;
CREATE POLICY sales_outbox_admin_all ON public.sales_commission_outbox FOR ALL TO authenticated
  USING (COALESCE(public.is_platform_admin(), false)) WITH CHECK (COALESCE(public.is_platform_admin(), false));

DROP POLICY IF EXISTS sales_payouts_admin_all ON public.sales_commission_payouts;
CREATE POLICY sales_payouts_admin_all ON public.sales_commission_payouts FOR ALL TO authenticated
  USING (COALESCE(public.is_platform_admin(), false)) WITH CHECK (COALESCE(public.is_platform_admin(), false));

DROP POLICY IF EXISTS sales_allocations_admin_all ON public.sales_payout_allocations;
CREATE POLICY sales_allocations_admin_all ON public.sales_payout_allocations FOR ALL TO authenticated
  USING (COALESCE(public.is_platform_admin(), false)) WITH CHECK (COALESCE(public.is_platform_admin(), false));

DROP POLICY IF EXISTS sales_quarantine_admin_all ON public.sales_adjustment_quarantine;
CREATE POLICY sales_quarantine_admin_all ON public.sales_adjustment_quarantine FOR ALL TO authenticated
  USING (COALESCE(public.is_platform_admin(), false)) WITH CHECK (COALESCE(public.is_platform_admin(), false));

-- Representative Scoped Read Policies (Zero Access to Raw Bank Table)
DROP POLICY IF EXISTS sales_reps_read_own ON public.sales_representatives;
CREATE POLICY sales_reps_read_own ON public.sales_representatives FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS sales_codes_read_own ON public.sales_referral_codes;
CREATE POLICY sales_codes_read_own ON public.sales_referral_codes FOR SELECT TO authenticated
  USING (sales_rep_id IN (SELECT id FROM public.sales_representatives WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS sales_referrals_read_own ON public.sales_referrals;
CREATE POLICY sales_referrals_read_own ON public.sales_referrals FOR SELECT TO authenticated
  USING (sales_rep_id IN (SELECT id FROM public.sales_representatives WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS sales_commissions_read_own ON public.sales_commissions;
CREATE POLICY sales_commissions_read_own ON public.sales_commissions FOR SELECT TO authenticated
  USING (sales_rep_id IN (SELECT id FROM public.sales_representatives WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS sales_events_read_own ON public.sales_commission_events;
CREATE POLICY sales_events_read_own ON public.sales_commission_events FOR SELECT TO authenticated
  USING (commission_id IN (SELECT c.id FROM public.sales_commissions c JOIN public.sales_representatives r ON c.sales_rep_id = r.id WHERE r.user_id = auth.uid()));

DROP POLICY IF EXISTS sales_adjustments_read_own ON public.sales_commission_adjustments;
CREATE POLICY sales_adjustments_read_own ON public.sales_commission_adjustments FOR SELECT TO authenticated
  USING (sales_rep_id IN (SELECT id FROM public.sales_representatives WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS sales_recovery_read_own ON public.sales_recovery_entries;
CREATE POLICY sales_recovery_read_own ON public.sales_recovery_entries FOR SELECT TO authenticated
  USING (sales_rep_id IN (SELECT id FROM public.sales_representatives WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS sales_payouts_read_own ON public.sales_commission_payouts;
CREATE POLICY sales_payouts_read_own ON public.sales_commission_payouts FOR SELECT TO authenticated
  USING (sales_rep_id IN (SELECT id FROM public.sales_representatives WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS sales_allocations_read_own ON public.sales_payout_allocations;
CREATE POLICY sales_allocations_read_own ON public.sales_payout_allocations FOR SELECT TO authenticated
  USING (commission_id IN (SELECT c.id FROM public.sales_commissions c JOIN public.sales_representatives r ON c.sales_rep_id = r.id WHERE r.user_id = auth.uid()));

-- ------------------------------------------------------------------------------
-- 20. Schema Migration Tracking & PostgREST Cache Invalidation
-- ------------------------------------------------------------------------------
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20261110000000', 'sales_rep_and_referral_foundation')
ON CONFLICT (version) DO NOTHING;

NOTIFY pgrst, 'reload schema';

