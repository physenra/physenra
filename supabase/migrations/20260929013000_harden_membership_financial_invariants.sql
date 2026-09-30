-- ==============================================================================
-- PHYSENRA RECURRING MEMBERSHIPS V1 — FINANCIAL INVARIANTS & CLINICAL HARDENING
-- Migration: 20260929013000_harden_membership_financial_invariants.sql
--
-- Objective:
-- 1. Clinical Usage Authority:
--    - Enforce that only clinical encounters in status 'completed' can consume membership quota.
--    - Verify encounter timing falls within the cycle entitlement window [cycle_start_date, cycle_end_date].
-- 2. Billing Cycle Immutability Hardening:
--    - Establish BEFORE UPDATE trigger on membership_billing_cycles protecting cycle numbers,
--      prices, session quotas, date windows, and linked authoritative invoice IDs.
--    - Prevent reactivation or mutation of terminal cycles ('completed', 'cancelled').
-- 3. Membership Plan Catalog Immutability:
--    - Establish BEFORE UPDATE trigger on membership_plans protecting identity, plan_code,
--      service link, currency, and creation audit fields.
-- 4. Invoiced Demand Protection:
--    - Prohibit manual cycle invoice generation on non-active (e.g. cancelled/paused) memberships.
-- 5. Persistent Pause Justification & Constraints:
--    - Add pause_reason column to patient_memberships with check constraint for minimum justification length.
--    - Update pause_patient_membership and resume_patient_membership to persist/clear pause_reason.
-- ==============================================================================

-- 1. ADD PAUSE_REASON TO PATIENT_MEMBERSHIPS & ENFORCE CONSTRAINT
-- ------------------------------------------------------------------------------
ALTER TABLE public.patient_memberships
    ADD COLUMN IF NOT EXISTS pause_reason TEXT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_membership_pause'
    ) THEN
        ALTER TABLE public.patient_memberships
            ADD CONSTRAINT chk_membership_pause CHECK (
                status <> 'paused' OR (
                    paused_at IS NOT NULL AND 
                    pause_reason IS NOT NULL AND 
                    length(trim(pause_reason)) >= 5
                )
            );
    END IF;
END;
$$;

-- 2. HARDEN PAUSE / RESUME STORED PROCEDURES
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pause_patient_membership(
    p_practice_id UUID,
    p_membership_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_membership RECORD;
    v_caller_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: Caller is not authenticated.';
    END IF;

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to pause memberships.';
    END IF;

    IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
        RAISE EXCEPTION 'Validation failure: A valid pause reason of at least 5 characters is required.';
    END IF;

    SELECT * INTO v_membership
    FROM public.patient_memberships
    WHERE id = p_membership_id AND practice_id = p_practice_id
    FOR UPDATE;

    IF v_membership.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Membership not found.';
    END IF;

    IF v_membership.status <> 'active' THEN
        RAISE EXCEPTION 'Operation not permitted: Only active memberships can be paused (current status: %).', v_membership.status;
    END IF;

    UPDATE public.patient_memberships
    SET status = 'paused',
        paused_at = now(),
        pause_reason = trim(p_reason),
        updated_at = now()
    WHERE id = v_membership.id;

    PERFORM public.log_audit_event(
        p_practice_id,
        'membership.paused',
        'patient_memberships',
        v_membership.id,
        jsonb_build_object(
            'membership_number', v_membership.membership_number,
            'reason', trim(p_reason)
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'membership_id', v_membership.id,
        'membership_number', v_membership.membership_number,
        'status', 'paused',
        'reason', trim(p_reason)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.resume_patient_membership(
    p_practice_id UUID,
    p_membership_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_membership RECORD;
    v_caller_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: Caller is not authenticated.';
    END IF;

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to resume memberships.';
    END IF;

    SELECT * INTO v_membership
    FROM public.patient_memberships
    WHERE id = p_membership_id AND practice_id = p_practice_id
    FOR UPDATE;

    IF v_membership.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Membership not found.';
    END IF;

    IF v_membership.status <> 'paused' THEN
        RAISE EXCEPTION 'Operation not permitted: Only paused memberships can be resumed (current status: %).', v_membership.status;
    END IF;

    UPDATE public.patient_memberships
    SET status = 'active',
        resumed_at = now(),
        pause_reason = NULL,
        updated_at = now()
    WHERE id = v_membership.id;

    PERFORM public.log_audit_event(
        p_practice_id,
        'membership.resumed',
        'patient_memberships',
        v_membership.id,
        jsonb_build_object(
            'membership_number', v_membership.membership_number,
            'reason', p_reason
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'membership_id', v_membership.id,
        'membership_number', v_membership.membership_number,
        'status', 'active'
    );
END;
$$;

-- 3. HARDEN CLINICAL USAGE AUTHORITY IN record_membership_visit_usage
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_membership_visit_usage(
    p_practice_id UUID,
    p_cycle_id UUID,
    p_clinical_visit_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cycle RECORD;
    v_membership RECORD;
    v_visit RECORD;
    v_plan RECORD;
    v_used_sessions NUMERIC(6, 2);
    v_remaining_sessions NUMERIC(6, 2);
    v_caller_id UUID;
    v_ledger_id UUID;
    v_visit_date DATE;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: Caller is not authenticated.';
    END IF;

    -- Authorized roles: practice_owner, practice_manager, receptionist, physiotherapist
    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'receptionist', 'physiotherapist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to record membership usage.';
    END IF;

    -- 1. Pessimistic row locking on billing cycle
    SELECT * INTO v_cycle
    FROM public.membership_billing_cycles
    WHERE id = p_cycle_id AND practice_id = p_practice_id
    FOR UPDATE;

    IF v_cycle.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Billing cycle not found or does not belong to target practice.';
    END IF;

    -- Check cycle status
    IF v_cycle.status <> 'active' THEN
        RAISE EXCEPTION 'Operation not permitted: Billing cycle is in status % and cannot be used for clinical encounters.', v_cycle.status;
    END IF;

    -- 2. Verify clinical visit exists in this practice
    SELECT * INTO v_visit
    FROM public.clinical_visits
    WHERE id = p_clinical_visit_id AND practice_id = p_practice_id;

    IF v_visit.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Clinical visit not found or does not belong to target practice.';
    END IF;

    -- 3. CLINICAL USAGE AUTHORITY: Clinical Visit MUST be completed
    IF v_visit.status <> 'completed' THEN
        RAISE EXCEPTION 'Validation failure: Clinical visit must be completed to record membership usage (current status: %).', v_visit.status;
    END IF;

    -- 4. Verify parent membership
    SELECT * INTO v_membership
    FROM public.patient_memberships
    WHERE id = v_cycle.membership_id AND practice_id = p_practice_id;

    IF v_membership.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Parent membership not found.';
    END IF;

    IF v_membership.status <> 'active' THEN
        RAISE EXCEPTION 'Operation not permitted: Membership is currently in status % (must be active).', v_membership.status;
    END IF;

    -- Verify patient match
    IF v_visit.patient_id <> v_membership.patient_id THEN
        RAISE EXCEPTION 'Validation failure: Clinical visit patient does not match membership patient.';
    END IF;

    -- 5. Scope Verification: Encounter timing within cycle boundaries
    v_visit_date := COALESCE(v_visit.actual_start::DATE, v_visit.created_at::DATE);
    IF v_visit_date < v_cycle.cycle_start_date OR v_visit_date > v_cycle.cycle_end_date THEN
        RAISE EXCEPTION 'Validation failure: Clinical encounter date (%) falls outside billing cycle window (% to %).',
            v_visit_date, v_cycle.cycle_start_date, v_cycle.cycle_end_date;
    END IF;

    -- 6. Check uniqueness constraint: this visit cannot have been deducted against this cycle already
    IF EXISTS (
        SELECT 1 FROM public.membership_usage_ledger
        WHERE cycle_id = p_cycle_id AND clinical_visit_id = p_clinical_visit_id
    ) THEN
        RAISE EXCEPTION 'Duplicate deduction: Clinical visit % has already been recorded against billing cycle %.', p_clinical_visit_id, p_cycle_id;
    END IF;

    -- 7. Calculate derived remaining quota
    SELECT COALESCE(SUM(sessions_consumed), 0.00) INTO v_used_sessions
    FROM public.membership_usage_ledger
    WHERE cycle_id = p_cycle_id;

    v_remaining_sessions := v_cycle.session_quota - v_used_sessions;

    IF v_remaining_sessions < 1.00 THEN
        RAISE EXCEPTION 'Quota exhausted: This billing cycle has no remaining sessions (Quota: %, Consumed: %).', v_cycle.session_quota, v_used_sessions;
    END IF;

    -- Get plan included service
    SELECT * INTO v_plan
    FROM public.membership_plans
    WHERE id = v_membership.plan_id AND practice_id = p_practice_id;

    -- 8. Insert into append-only membership usage ledger
    INSERT INTO public.membership_usage_ledger (
        practice_id,
        cycle_id,
        membership_id,
        patient_id,
        clinical_visit_id,
        service_id,
        sessions_consumed,
        notes,
        recorded_by
    ) VALUES (
        p_practice_id,
        p_cycle_id,
        v_membership.id,
        v_membership.patient_id,
        p_clinical_visit_id,
        v_plan.included_service_id,
        1.00,
        p_notes,
        v_caller_id
    ) RETURNING id INTO v_ledger_id;

    -- 9. Audit Logging
    PERFORM public.log_audit_event(
        p_practice_id,
        'membership.usage_recorded',
        'membership_usage_ledger',
        v_ledger_id,
        jsonb_build_object(
            'membership_number', v_membership.membership_number,
            'cycle_id', p_cycle_id,
            'clinical_visit_id', p_clinical_visit_id,
            'sessions_consumed', 1.00,
            'remaining_sessions', v_remaining_sessions - 1.00
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'ledger_id', v_ledger_id,
        'cycle_id', p_cycle_id,
        'membership_number', v_membership.membership_number,
        'clinical_visit_id', p_clinical_visit_id,
        'sessions_consumed', 1.00,
        'remaining_sessions', v_remaining_sessions - 1.00
    );
END;
$$;

-- 4. HARDEN INVOICE GENERATION ON NON-ACTIVE MEMBERSHIPS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_membership_cycle_invoice(
    p_practice_id UUID,
    p_membership_id UUID,
    p_cycle_number INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_membership RECORD;
    v_cycle RECORD;
    v_plan RECORD;
    v_service RECORD;
    v_invoice_number VARCHAR(32);
    v_invoice_id UUID;
    v_caller_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: Caller is not authenticated.';
    END IF;

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to generate cycle invoices.';
    END IF;

    -- Retrieve membership
    SELECT * INTO v_membership
    FROM public.patient_memberships
    WHERE id = p_membership_id AND practice_id = p_practice_id;
    IF v_membership.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Membership not found.';
    END IF;

    -- Cannot generate invoice for non-active or terminal memberships
    IF v_membership.status <> 'active' THEN
        RAISE EXCEPTION 'Operation not permitted: Cannot generate cycle invoice for membership in status % (must be active).', v_membership.status;
    END IF;

    -- Retrieve cycle
    SELECT * INTO v_cycle
    FROM public.membership_billing_cycles
    WHERE membership_id = p_membership_id AND cycle_number = p_cycle_number AND practice_id = p_practice_id;
    IF v_cycle.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Billing cycle % not found for this membership.', p_cycle_number;
    END IF;

    IF v_cycle.invoice_id IS NOT NULL THEN
        RAISE EXCEPTION 'Validation failure: Cycle % already has an authoritative invoice linked.', p_cycle_number;
    END IF;

    -- Retrieve plan & service snapshot
    SELECT * INTO v_plan
    FROM public.membership_plans
    WHERE id = v_membership.plan_id AND practice_id = p_practice_id;

    SELECT * INTO v_service
    FROM public.services
    WHERE id = v_plan.included_service_id AND practice_id = p_practice_id;

    -- Generate invoice
    v_invoice_number := public.generate_next_invoice_number(p_practice_id);

    INSERT INTO public.invoices (
        practice_id,
        invoice_number,
        patient_id,
        issue_date,
        currency,
        status,
        subtotal,
        discount_total,
        tax_total,
        grand_total,
        amount_paid,
        balance_due,
        notes,
        terms,
        issued_at,
        finalized_by,
        created_by
    ) VALUES (
        p_practice_id,
        v_invoice_number,
        v_membership.patient_id,
        v_cycle.billing_date,
        v_cycle.currency,
        'issued',
        v_cycle.cycle_price,
        0.00,
        0.00,
        v_cycle.cycle_price,
        0.00,
        v_cycle.cycle_price,
        'Membership Renewal: ' || v_membership.membership_number || ' - ' || v_plan.name || ' (Cycle ' || p_cycle_number || ')',
        'Payment required to activate membership entitlement.',
        now(),
        v_caller_id,
        v_caller_id
    ) RETURNING id INTO v_invoice_id;

    -- Insert invoice line
    INSERT INTO public.invoice_lines (
        practice_id,
        invoice_id,
        service_id,
        service_code_snapshot,
        service_name_snapshot,
        description,
        quantity,
        unit_price_snapshot,
        currency,
        is_taxable,
        tax_rate_percent_snapshot,
        tax_amount,
        discount_amount,
        line_total
    ) VALUES (
        p_practice_id,
        v_invoice_id,
        v_plan.included_service_id,
        v_service.code,
        v_plan.name || ' (' || v_cycle.session_quota || ' Sessions)',
        'Membership Renewal: ' || v_membership.membership_number || ' (Cycle ' || p_cycle_number || ': ' || v_cycle.cycle_start_date::TEXT || ' to ' || v_cycle.cycle_end_date::TEXT || ')',
        1.00,
        v_cycle.cycle_price,
        v_cycle.currency,
        false,
        0.00,
        0.00,
        0.00,
        v_cycle.cycle_price
    );

    -- Link invoice to cycle
    UPDATE public.membership_billing_cycles
    SET invoice_id = v_invoice_id,
        status = 'invoiced',
        updated_at = now()
    WHERE id = v_cycle.id;

    PERFORM public.log_audit_event(
        p_practice_id,
        'membership.cycle_generated',
        'membership_billing_cycles',
        v_cycle.id,
        jsonb_build_object(
            'membership_id', v_membership.id,
            'cycle_number', p_cycle_number,
            'invoice_id', v_invoice_id,
            'invoice_number', v_invoice_number
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'cycle_id', v_cycle.id,
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number,
        'cycle_number', p_cycle_number
    );
END;
$$;

-- 5. IMMUTABILITY TRIGGER: MEMBERSHIP BILLING CYCLES
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_membership_billing_cycles_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.id <> OLD.id OR
       NEW.practice_id <> OLD.practice_id OR
       NEW.membership_id <> OLD.membership_id OR
       NEW.cycle_number <> OLD.cycle_number OR
       NEW.cycle_price <> OLD.cycle_price OR
       NEW.session_quota <> OLD.session_quota OR
       NEW.cycle_start_date <> OLD.cycle_start_date OR
       NEW.cycle_end_date <> OLD.cycle_end_date OR
       NEW.billing_date <> OLD.billing_date OR
       NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Operation not permitted: Core membership billing cycle identity, quota, and date parameters are immutable.'
            USING ERRCODE = 'restrict_violation';
    END IF;

    -- Once an invoice is linked, it cannot be unlinked or swapped
    IF OLD.invoice_id IS NOT NULL AND NEW.invoice_id <> OLD.invoice_id THEN
        RAISE EXCEPTION 'Operation not permitted: Linked authoritative cycle invoice cannot be modified or unlinked.'
            USING ERRCODE = 'restrict_violation';
    END IF;

    -- Terminal state protection
    IF OLD.status IN ('completed', 'cancelled') AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'Operation not permitted: Cannot transition billing cycle out of terminal state %.', OLD.status
            USING ERRCODE = 'restrict_violation';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_membership_billing_cycles_immutability ON public.membership_billing_cycles;
CREATE TRIGGER trg_protect_membership_billing_cycles_immutability
BEFORE UPDATE ON public.membership_billing_cycles
FOR EACH ROW EXECUTE FUNCTION public.protect_membership_billing_cycles_immutability();

-- 6. IMMUTABILITY TRIGGER: MEMBERSHIP PLANS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_membership_plans_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.id <> OLD.id OR
       NEW.practice_id <> OLD.practice_id OR
       NEW.plan_code <> OLD.plan_code OR
       NEW.included_service_id <> OLD.included_service_id OR
       NEW.currency <> OLD.currency OR
       NEW.created_by <> OLD.created_by OR
       NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Operation not permitted: Core membership plan code, service link, currency, and creation audit fields are immutable.'
            USING ERRCODE = 'restrict_violation';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_membership_plans_immutability ON public.membership_plans;
CREATE TRIGGER trg_protect_membership_plans_immutability
BEFORE UPDATE ON public.membership_plans
FOR EACH ROW EXECUTE FUNCTION public.protect_membership_plans_immutability();
