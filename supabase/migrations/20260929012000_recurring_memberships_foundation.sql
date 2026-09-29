-- ==============================================================================
-- PHYSENRA RECURRING MEMBERSHIPS & SUBSCRIPTIONS FOUNDATION V1 MIGRATION
-- Migration: 20260929012000_recurring_memberships_foundation.sql
--
-- Architecture: OPTION E (Formally Cleared)
-- Invoiced Billing-Cycle Demand + Decoupled Membership Enrollment + 
-- Cycle-Scoped Immutable Entitlement & Usage Ledger
--
-- Features:
-- 1. Enums: membership_frequency, membership_status, membership_cycle_status
-- 2. Practice Membership Counters & Atomic Sequential Identifier Generator (MBR-000001)
-- 3. Membership Plans (Reusable Catalog Definitions with cadence, price, quota)
-- 4. Patient Memberships (Patient Enrollment Agreements with anniversary anchor, zero mutable balances)
-- 5. Membership Billing Cycles (Discrete time windows linked to authoritative Accounts Receivable Invoices)
-- 6. Membership Usage Ledger (Immutable append-only clinical visit decrements)
-- 7. Triggers for hard-delete denial, immutability, and invoice settlement / reversal synchronization
-- 8. Stored Procedures:
--    - generate_next_membership_number
--    - enroll_patient_in_membership
--    - generate_membership_cycle_invoice
--    - generate_membership_renewal_cycles
--    - record_membership_visit_usage
--    - pause_patient_membership
--    - resume_patient_membership
--    - cancel_patient_membership
-- 9. Multi-Tenant Composite Foreign Keys for PostgREST Relationship Disambiguation
-- 10. Strict Row-Level Security (RLS) & Multi-Tenancy Policies
-- ==============================================================================

-- 1. ENUMS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_frequency') THEN
        CREATE TYPE public.membership_frequency AS ENUM (
            'monthly',
            'quarterly',
            'annually'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_status') THEN
        CREATE TYPE public.membership_status AS ENUM (
            'pending_payment',
            'active',
            'paused',
            'suspended',
            'cancelled',
            'completed'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_cycle_status') THEN
        CREATE TYPE public.membership_cycle_status AS ENUM (
            'pending_invoice',
            'invoiced',
            'active',
            'past_due',
            'completed',
            'cancelled'
        );
    END IF;
END;
$$;

-- 2. PRACTICE MEMBERSHIP COUNTERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_membership_counters (
    practice_id UUID PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_practice_membership_counters_last_number CHECK (last_number >= 0)
);

-- 3. SEQUENTIAL IDENTIFIER GENERATOR (MBR-000001)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_next_membership_number(p_practice_id UUID)
RETURNS VARCHAR(32)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_next_val INTEGER;
BEGIN
    IF p_practice_id IS NULL THEN
        RAISE EXCEPTION 'Tenant context required: p_practice_id cannot be null.';
    END IF;

    -- Only administrative and billing roles can generate membership numbers
    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to generate membership number.';
    END IF;

    INSERT INTO public.practice_membership_counters (practice_id, last_number, updated_at)
    VALUES (p_practice_id, 1, now())
    ON CONFLICT (practice_id) DO UPDATE
        SET last_number = public.practice_membership_counters.last_number + 1,
            updated_at = now()
    RETURNING last_number INTO v_next_val;

    RETURN 'MBR-' || LPAD(v_next_val::TEXT, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_next_membership_number(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_membership_number(UUID) TO authenticated;

-- 4. MEMBERSHIP PLANS TABLE (REUSABLE CATALOG PLANS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    plan_code VARCHAR(32) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    included_service_id UUID NOT NULL,
    billing_frequency public.membership_frequency NOT NULL DEFAULT 'monthly',
    cycle_price NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    cycle_session_quota INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    updated_by UUID NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_membership_plans_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_membership_plans_code UNIQUE (practice_id, plan_code),
    CONSTRAINT chk_membership_plans_price CHECK (cycle_price > 0.00),
    CONSTRAINT chk_membership_plans_quota CHECK (cycle_session_quota > 0),
    CONSTRAINT chk_membership_plans_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_membership_plans_status CHECK (status IN ('active', 'archived')),

    -- Multi-tenant Composite Foreign Key
    CONSTRAINT fk_plan_service_practice FOREIGN KEY (included_service_id, practice_id)
        REFERENCES public.services(id, practice_id) ON DELETE RESTRICT
);

-- 5. PATIENT MEMBERSHIPS TABLE (PATIENT ENROLLMENTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    membership_number VARCHAR(32) NOT NULL,
    patient_id UUID NOT NULL,
    plan_id UUID NOT NULL,
    start_date DATE NOT NULL,
    billing_anchor_day INTEGER NOT NULL,
    status public.membership_status NOT NULL DEFAULT 'pending_payment',
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    paused_at TIMESTAMPTZ NULL,
    resumed_at TIMESTAMPTZ NULL,
    cancelled_at TIMESTAMPTZ NULL,
    cancelled_by UUID REFERENCES public.profiles(id),
    cancellation_reason TEXT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_patient_memberships_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_patient_memberships_number UNIQUE (practice_id, membership_number),
    CONSTRAINT chk_membership_anchor_day CHECK (billing_anchor_day BETWEEN 1 AND 28),
    CONSTRAINT chk_membership_cancellation CHECK (
        status <> 'cancelled' OR (
            cancelled_at IS NOT NULL AND 
            cancellation_reason IS NOT NULL AND 
            length(trim(cancellation_reason)) >= 5
        )
    ),

    -- Multi-tenant Composite Foreign Keys
    CONSTRAINT fk_membership_patient_practice FOREIGN KEY (patient_id, practice_id)
        REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_membership_plan_practice FOREIGN KEY (plan_id, practice_id)
        REFERENCES public.membership_plans(id, practice_id) ON DELETE RESTRICT
);

-- 6. MEMBERSHIP BILLING CYCLES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_billing_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL,
    cycle_number INTEGER NOT NULL,
    cycle_start_date DATE NOT NULL,
    cycle_end_date DATE NOT NULL,
    billing_date DATE NOT NULL,
    invoice_id UUID NULL,
    cycle_price NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    session_quota INTEGER NOT NULL,
    status public.membership_cycle_status NOT NULL DEFAULT 'pending_invoice',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_cycle_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_cycle_membership_number UNIQUE (membership_id, cycle_number),
    CONSTRAINT chk_cycle_dates CHECK (cycle_end_date >= cycle_start_date),
    CONSTRAINT chk_cycle_number CHECK (cycle_number > 0),
    CONSTRAINT chk_cycle_price CHECK (cycle_price > 0.00),
    CONSTRAINT chk_cycle_quota CHECK (session_quota > 0),

    -- Multi-tenant Composite Foreign Keys
    CONSTRAINT fk_cycle_membership_practice FOREIGN KEY (membership_id, practice_id)
        REFERENCES public.patient_memberships(id, practice_id) ON DELETE CASCADE,
    CONSTRAINT fk_cycle_invoice_practice FOREIGN KEY (invoice_id, practice_id)
        REFERENCES public.invoices(id, practice_id) ON DELETE RESTRICT
);

-- 7. MEMBERSHIP USAGE LEDGER TABLE (IMMUTABLE APPEND-ONLY)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_usage_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL,
    membership_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    clinical_visit_id UUID NOT NULL,
    service_id UUID NOT NULL,
    sessions_consumed NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
    notes TEXT NULL,
    recorded_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_usage_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_usage_cycle_visit UNIQUE (cycle_id, clinical_visit_id),
    CONSTRAINT chk_usage_consumed_positive CHECK (sessions_consumed > 0.00),

    -- Multi-tenant Composite Foreign Keys
    CONSTRAINT fk_usage_cycle_practice FOREIGN KEY (cycle_id, practice_id)
        REFERENCES public.membership_billing_cycles(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_usage_visit_patient_practice FOREIGN KEY (clinical_visit_id, patient_id, practice_id)
        REFERENCES public.clinical_visits(id, patient_id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_usage_service_practice FOREIGN KEY (service_id, practice_id)
        REFERENCES public.services(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_usage_membership_practice FOREIGN KEY (membership_id, practice_id)
        REFERENCES public.patient_memberships(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_usage_patient_practice FOREIGN KEY (patient_id, practice_id)
        REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT
);

-- 8. IMMUTABILITY & HARD DELETE TRIGGERS
-- ------------------------------------------------------------------------------

-- 8A. Prevent hard delete on any membership table
CREATE OR REPLACE FUNCTION public.prevent_membership_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Operation not permitted: Hard-deletion of records in % is strictly prohibited to preserve financial, legal, and clinical auditability.', TG_TABLE_NAME
        USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_delete_membership_plans ON public.membership_plans;
CREATE TRIGGER trg_prevent_delete_membership_plans
BEFORE DELETE ON public.membership_plans
FOR EACH ROW EXECUTE FUNCTION public.prevent_membership_hard_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_patient_memberships ON public.patient_memberships;
CREATE TRIGGER trg_prevent_delete_patient_memberships
BEFORE DELETE ON public.patient_memberships
FOR EACH ROW EXECUTE FUNCTION public.prevent_membership_hard_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_membership_billing_cycles ON public.membership_billing_cycles;
CREATE TRIGGER trg_prevent_delete_membership_billing_cycles
BEFORE DELETE ON public.membership_billing_cycles
FOR EACH ROW EXECUTE FUNCTION public.prevent_membership_hard_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_membership_usage_ledger ON public.membership_usage_ledger;
CREATE TRIGGER trg_prevent_delete_membership_usage_ledger
BEFORE DELETE ON public.membership_usage_ledger
FOR EACH ROW EXECUTE FUNCTION public.prevent_membership_hard_delete();

-- 8B. Protect usage ledger immutability (strictly append-only, zero updates)
CREATE OR REPLACE FUNCTION public.protect_membership_usage_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Operation not permitted: Membership usage ledger entries are strictly immutable. Updates are prohibited.'
        USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_membership_usage_immutability ON public.membership_usage_ledger;
CREATE TRIGGER trg_protect_membership_usage_immutability
BEFORE UPDATE ON public.membership_usage_ledger
FOR EACH ROW EXECUTE FUNCTION public.protect_membership_usage_immutability();

-- 8C. Protect patient membership immutable identification fields and terminal states
CREATE OR REPLACE FUNCTION public.protect_patient_membership_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Protect identification fields
    IF NEW.id <> OLD.id OR
       NEW.practice_id <> OLD.practice_id OR
       NEW.membership_number <> OLD.membership_number OR
       NEW.patient_id <> OLD.patient_id OR
       NEW.plan_id <> OLD.plan_id OR
       NEW.created_by <> OLD.created_by OR
       NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Operation not permitted: Core membership enrollment identity fields are immutable.'
            USING ERRCODE = 'restrict_violation';
    END IF;

    -- Terminal state protection
    IF OLD.status IN ('cancelled', 'completed') AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'Operation not permitted: Cannot transition membership out of terminal state %.', OLD.status
            USING ERRCODE = 'restrict_violation';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_patient_membership_immutability ON public.patient_memberships;
CREATE TRIGGER trg_protect_patient_membership_immutability
BEFORE UPDATE ON public.patient_memberships
FOR EACH ROW EXECUTE FUNCTION public.protect_patient_membership_immutability();

-- 8D. Synchronize membership cycle on invoice settlement, reversion, or voidance
CREATE OR REPLACE FUNCTION public.sync_membership_cycle_on_invoice_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cycle RECORD;
    v_membership RECORD;
BEGIN
    -- Check if this invoice is linked to a membership billing cycle
    SELECT * INTO v_cycle
    FROM public.membership_billing_cycles
    WHERE invoice_id = NEW.id AND practice_id = NEW.practice_id;

    IF v_cycle.id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Case 1: Invoice paid in full (balance_due = 0)
    IF NEW.status = 'paid' AND NEW.balance_due <= 0.00 THEN
        IF v_cycle.status IN ('pending_invoice', 'invoiced', 'past_due') THEN
            UPDATE public.membership_billing_cycles
            SET status = 'active',
                updated_at = now()
            WHERE id = v_cycle.id;

            -- Check if parent patient membership is pending_payment or past_due
            SELECT * INTO v_membership
            FROM public.patient_memberships
            WHERE id = v_cycle.membership_id;

            IF v_membership.status IN ('pending_payment', 'suspended') THEN
                UPDATE public.patient_memberships
                SET status = 'active',
                    updated_at = now()
                WHERE id = v_membership.id;

                PERFORM public.log_audit_event(
                    NEW.practice_id,
                    'membership.activated',
                    'patient_memberships',
                    v_membership.id,
                    jsonb_build_object(
                        'membership_number', v_membership.membership_number,
                        'cycle_id', v_cycle.id,
                        'invoice_id', NEW.id,
                        'reason', 'Cycle invoice paid in full'
                    )
                );
            END IF;

            PERFORM public.log_audit_event(
                NEW.practice_id,
                'membership.cycle_activated',
                'membership_billing_cycles',
                v_cycle.id,
                jsonb_build_object(
                    'cycle_number', v_cycle.cycle_number,
                    'membership_id', v_cycle.membership_id,
                    'invoice_id', NEW.id,
                    'cycle_price', v_cycle.cycle_price
                )
            );
        END IF;

    -- Case 2: Invoice was paid, but reverted to partially_paid or issued (e.g. payment voided)
    ELSIF OLD.status = 'paid' AND NEW.status IN ('partially_paid', 'issued') THEN
        IF v_cycle.status = 'active' THEN
            UPDATE public.membership_billing_cycles
            SET status = 'past_due',
                updated_at = now()
            WHERE id = v_cycle.id;

            PERFORM public.log_audit_event(
                NEW.practice_id,
                'membership.cycle_past_due',
                'membership_billing_cycles',
                v_cycle.id,
                jsonb_build_object(
                    'cycle_number', v_cycle.cycle_number,
                    'membership_id', v_cycle.membership_id,
                    'invoice_id', NEW.id,
                    'reason', 'Invoice payment reverted or voided'
                )
            );
        END IF;

    -- Case 3: Invoice voided
    ELSIF NEW.status = 'void' THEN
        IF v_cycle.status IN ('pending_invoice', 'invoiced', 'past_due', 'active') THEN
            UPDATE public.membership_billing_cycles
            SET status = 'cancelled',
                updated_at = now()
            WHERE id = v_cycle.id;

            PERFORM public.log_audit_event(
                NEW.practice_id,
                'membership.cycle_cancelled',
                'membership_billing_cycles',
                v_cycle.id,
                jsonb_build_object(
                    'cycle_number', v_cycle.cycle_number,
                    'membership_id', v_cycle.membership_id,
                    'invoice_id', NEW.id,
                    'reason', 'Cycle invoice was voided'
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_membership_cycle_on_invoice ON public.invoices;
CREATE TRIGGER trg_sync_membership_cycle_on_invoice
AFTER UPDATE OF status, amount_paid, balance_due ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.sync_membership_cycle_on_invoice_payment();

-- 9. RPC: ENROLL PATIENT IN MEMBERSHIP (CYCLE 1 & INVOICE CREATION)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enroll_patient_in_membership(
    p_practice_id UUID,
    p_patient_id UUID,
    p_plan_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_auto_renew BOOLEAN DEFAULT true,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_plan RECORD;
    v_patient RECORD;
    v_service RECORD;
    v_membership_number VARCHAR(32);
    v_invoice_number VARCHAR(32);
    v_membership_id UUID;
    v_cycle_id UUID;
    v_invoice_id UUID;
    v_caller_id UUID;
    v_anchor_day INTEGER;
    v_cycle_end_date DATE;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: Caller is not authenticated.';
    END IF;

    -- Validate caller authorization
    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to enroll patients in memberships.';
    END IF;

    -- Validate patient
    SELECT * INTO v_patient
    FROM public.patients
    WHERE id = p_patient_id AND practice_id = p_practice_id;
    IF v_patient.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Patient not found or does not belong to target practice.';
    END IF;

    -- Validate membership plan
    SELECT * INTO v_plan
    FROM public.membership_plans
    WHERE id = p_plan_id AND practice_id = p_practice_id;
    IF v_plan.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Membership plan not found.';
    END IF;
    IF v_plan.status <> 'active' THEN
        RAISE EXCEPTION 'Validation failure: Membership plan is not active and cannot accept new enrollments.';
    END IF;

    -- Validate included service
    SELECT * INTO v_service
    FROM public.services
    WHERE id = v_plan.included_service_id AND practice_id = p_practice_id;
    IF v_service.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Included service not found.';
    END IF;

    -- Calculate billing anchor day (bounded 1 to 28)
    v_anchor_day := EXTRACT(DAY FROM p_start_date)::INTEGER;
    IF v_anchor_day > 28 THEN
        v_anchor_day := 28;
    END IF;

    -- Calculate cycle end date based on billing frequency
    IF v_plan.billing_frequency = 'monthly' THEN
        v_cycle_end_date := (p_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    ELSIF v_plan.billing_frequency = 'quarterly' THEN
        v_cycle_end_date := (p_start_date + INTERVAL '3 months' - INTERVAL '1 day')::DATE;
    ELSIF v_plan.billing_frequency = 'annually' THEN
        v_cycle_end_date := (p_start_date + INTERVAL '1 year' - INTERVAL '1 day')::DATE;
    ELSE
        v_cycle_end_date := (p_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    END IF;

    -- Generate atomic identifiers
    v_membership_number := public.generate_next_membership_number(p_practice_id);
    v_invoice_number := public.generate_next_invoice_number(p_practice_id);

    -- 1. Insert patient membership enrollment
    INSERT INTO public.patient_memberships (
        practice_id,
        membership_number,
        patient_id,
        plan_id,
        start_date,
        billing_anchor_day,
        status,
        auto_renew,
        created_by
    ) VALUES (
        p_practice_id,
        v_membership_number,
        p_patient_id,
        p_plan_id,
        p_start_date,
        v_anchor_day,
        'pending_payment',
        p_auto_renew,
        v_caller_id
    ) RETURNING id INTO v_membership_id;

    -- 2. Create authoritative invoice in status 'issued'
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
        p_patient_id,
        p_start_date,
        v_plan.currency,
        'issued',
        v_plan.cycle_price,
        0.00,
        0.00,
        v_plan.cycle_price,
        0.00,
        v_plan.cycle_price,
        COALESCE(p_notes, 'Membership Enrollment: ' || v_membership_number || ' - ' || v_plan.name || ' (Cycle 1)'),
        'Payment required to activate membership entitlement.',
        now(),
        v_caller_id,
        v_caller_id
    ) RETURNING id INTO v_invoice_id;

    -- 3. Create itemized invoice line
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
        v_plan.name || ' (' || v_plan.cycle_session_quota || ' Sessions)',
        'Membership: ' || v_membership_number || ' - ' || v_plan.name || ' (Cycle 1: ' || p_start_date::TEXT || ' to ' || v_cycle_end_date::TEXT || ')',
        1.00,
        v_plan.cycle_price,
        v_plan.currency,
        false,
        0.00,
        0.00,
        0.00,
        v_plan.cycle_price
    );

    -- 4. Create Cycle 1 record
    INSERT INTO public.membership_billing_cycles (
        practice_id,
        membership_id,
        cycle_number,
        cycle_start_date,
        cycle_end_date,
        billing_date,
        invoice_id,
        cycle_price,
        currency,
        session_quota,
        status
    ) VALUES (
        p_practice_id,
        v_membership_id,
        1,
        p_start_date,
        v_cycle_end_date,
        p_start_date,
        v_invoice_id,
        v_plan.cycle_price,
        v_plan.currency,
        v_plan.cycle_session_quota,
        'invoiced'
    ) RETURNING id INTO v_cycle_id;

    -- 5. Audit Logging
    PERFORM public.log_audit_event(
        p_practice_id,
        'membership.enrolled',
        'patient_memberships',
        v_membership_id,
        jsonb_build_object(
            'membership_number', v_membership_number,
            'patient_id', p_patient_id,
            'plan_id', p_plan_id,
            'start_date', p_start_date,
            'cycle_1_id', v_cycle_id,
            'invoice_id', v_invoice_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'membership_id', v_membership_id,
        'membership_number', v_membership_number,
        'status', 'pending_payment',
        'cycle_id', v_cycle_id,
        'cycle_number', 1,
        'cycle_start_date', p_start_date,
        'cycle_end_date', v_cycle_end_date,
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number,
        'cycle_price', v_plan.cycle_price,
        'session_quota', v_plan.cycle_session_quota
    );
END;
$$;

REVOKE ALL ON FUNCTION public.enroll_patient_in_membership(UUID, UUID, UUID, DATE, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enroll_patient_in_membership(UUID, UUID, UUID, DATE, BOOLEAN, TEXT) TO authenticated;

-- 10. RPC: GENERATE MEMBERSHIP CYCLE INVOICE
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

REVOKE ALL ON FUNCTION public.generate_membership_cycle_invoice(UUID, UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_membership_cycle_invoice(UUID, UUID, INTEGER) TO authenticated;

-- 11. RPC: GENERATE MEMBERSHIP RENEWAL CYCLES (DETERMINISTIC BATCH RENEWALS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_membership_renewal_cycles(p_practice_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_mbr RECORD;
    v_last_cycle RECORD;
    v_plan RECORD;
    v_service RECORD;
    v_next_cycle_number INTEGER;
    v_next_start_date DATE;
    v_next_end_date DATE;
    v_next_billing_date DATE;
    v_invoice_number VARCHAR(32);
    v_invoice_id UUID;
    v_cycle_id UUID;
    v_caller_id UUID;
    v_generated_count INTEGER := 0;
    v_results JSONB := '[]'::JSONB;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: Caller is not authenticated.';
    END IF;

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to generate renewal cycles.';
    END IF;

    -- Find active memberships with auto_renew enabled whose latest cycle ends within 7 days or is past
    FOR v_mbr IN
        SELECT m.*
        FROM public.patient_memberships m
        WHERE m.practice_id = p_practice_id
          AND m.status = 'active'
          AND m.auto_renew = true
        ORDER BY m.created_at ASC
    LOOP
        -- Get latest cycle for this membership
        SELECT * INTO v_last_cycle
        FROM public.membership_billing_cycles
        WHERE membership_id = v_mbr.id AND practice_id = p_practice_id
        ORDER BY cycle_number DESC
        LIMIT 1;

        -- Generate renewal if latest cycle ends within 7 days and next cycle does not exist
        IF v_last_cycle.id IS NOT NULL AND v_last_cycle.cycle_end_date <= (CURRENT_DATE + INTERVAL '7 days') THEN
            v_next_cycle_number := v_last_cycle.cycle_number + 1;

            -- Check if next cycle already created
            IF NOT EXISTS (
                SELECT 1 FROM public.membership_billing_cycles
                WHERE membership_id = v_mbr.id AND cycle_number = v_next_cycle_number AND practice_id = p_practice_id
            ) THEN
                SELECT * INTO v_plan
                FROM public.membership_plans
                WHERE id = v_mbr.plan_id AND practice_id = p_practice_id;

                SELECT * INTO v_service
                FROM public.services
                WHERE id = v_plan.included_service_id AND practice_id = p_practice_id;

                v_next_start_date := (v_last_cycle.cycle_end_date + INTERVAL '1 day')::DATE;

                IF v_plan.billing_frequency = 'monthly' THEN
                    v_next_end_date := (v_next_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
                ELSIF v_plan.billing_frequency = 'quarterly' THEN
                    v_next_end_date := (v_next_start_date + INTERVAL '3 months' - INTERVAL '1 day')::DATE;
                ELSIF v_plan.billing_frequency = 'annually' THEN
                    v_next_end_date := (v_next_start_date + INTERVAL '1 year' - INTERVAL '1 day')::DATE;
                ELSE
                    v_next_end_date := (v_next_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
                END IF;

                v_next_billing_date := (v_next_start_date - INTERVAL '3 days')::DATE;
                IF v_next_billing_date < CURRENT_DATE THEN
                    v_next_billing_date := CURRENT_DATE;
                END IF;

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
                    v_mbr.patient_id,
                    v_next_billing_date,
                    v_plan.currency,
                    'issued',
                    v_plan.cycle_price,
                    0.00,
                    0.00,
                    v_plan.cycle_price,
                    0.00,
                    v_plan.cycle_price,
                    'Membership Renewal: ' || v_mbr.membership_number || ' - ' || v_plan.name || ' (Cycle ' || v_next_cycle_number || ')',
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
                    v_plan.name || ' (' || v_plan.cycle_session_quota || ' Sessions)',
                    'Membership Renewal: ' || v_mbr.membership_number || ' (Cycle ' || v_next_cycle_number || ': ' || v_next_start_date::TEXT || ' to ' || v_next_end_date::TEXT || ')',
                    1.00,
                    v_plan.cycle_price,
                    v_plan.currency,
                    false,
                    0.00,
                    0.00,
                    0.00,
                    v_plan.cycle_price
                );

                -- Insert new cycle
                INSERT INTO public.membership_billing_cycles (
                    practice_id,
                    membership_id,
                    cycle_number,
                    cycle_start_date,
                    cycle_end_date,
                    billing_date,
                    invoice_id,
                    cycle_price,
                    currency,
                    session_quota,
                    status
                ) VALUES (
                    p_practice_id,
                    v_mbr.id,
                    v_next_cycle_number,
                    v_next_start_date,
                    v_next_end_date,
                    v_next_billing_date,
                    v_invoice_id,
                    v_plan.cycle_price,
                    v_plan.currency,
                    v_plan.cycle_session_quota,
                    'invoiced'
                ) RETURNING id INTO v_cycle_id;

                v_generated_count := v_generated_count + 1;
                v_results := v_results || jsonb_build_object(
                    'membership_id', v_mbr.id,
                    'membership_number', v_mbr.membership_number,
                    'cycle_id', v_cycle_id,
                    'cycle_number', v_next_cycle_number,
                    'invoice_id', v_invoice_id,
                    'invoice_number', v_invoice_number
                );

                PERFORM public.log_audit_event(
                    p_practice_id,
                    'membership.cycle_generated',
                    'membership_billing_cycles',
                    v_cycle_id,
                    jsonb_build_object(
                        'membership_id', v_mbr.id,
                        'membership_number', v_mbr.membership_number,
                        'cycle_number', v_next_cycle_number,
                        'invoice_id', v_invoice_id
                    )
                );
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'cycles_generated', v_generated_count,
        'results', v_results
    );
END;
$$;

REVOKE ALL ON FUNCTION public.generate_membership_renewal_cycles(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_membership_renewal_cycles(UUID) TO authenticated;

-- 12. RPC: RECORD MEMBERSHIP VISIT USAGE (PESSIMISTIC LOCKING & USAGE LEDGER)
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

    -- 2. Verify clinical visit
    SELECT * INTO v_visit
    FROM public.clinical_visits
    WHERE id = p_clinical_visit_id AND practice_id = p_practice_id;

    IF v_visit.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Clinical visit not found or does not belong to target practice.';
    END IF;

    -- 3. Verify parent membership
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

    -- 4. Check uniqueness constraint: this visit cannot have been deducted against this cycle already
    IF EXISTS (
        SELECT 1 FROM public.membership_usage_ledger
        WHERE cycle_id = p_cycle_id AND clinical_visit_id = p_clinical_visit_id
    ) THEN
        RAISE EXCEPTION 'Duplicate deduction: Clinical visit % has already been recorded against billing cycle %.', p_clinical_visit_id, p_cycle_id;
    END IF;

    -- 5. Calculate derived remaining quota
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

    -- 6. Insert into append-only membership usage ledger
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

    -- 7. Audit Logging
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

REVOKE ALL ON FUNCTION public.record_membership_visit_usage(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_membership_visit_usage(UUID, UUID, UUID, TEXT) TO authenticated;

-- 13. RPC: PAUSE PATIENT MEMBERSHIP
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
        updated_at = now()
    WHERE id = v_membership.id;

    PERFORM public.log_audit_event(
        p_practice_id,
        'membership.paused',
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
        'status', 'paused',
        'reason', p_reason
    );
END;
$$;

REVOKE ALL ON FUNCTION public.pause_patient_membership(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pause_patient_membership(UUID, UUID, TEXT) TO authenticated;

-- 14. RPC: RESUME PATIENT MEMBERSHIP
-- ------------------------------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.resume_patient_membership(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resume_patient_membership(UUID, UUID, TEXT) TO authenticated;

-- 15. RPC: CANCEL PATIENT MEMBERSHIP
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_patient_membership(
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

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to cancel memberships.';
    END IF;

    IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
        RAISE EXCEPTION 'Validation failure: A valid cancellation reason of at least 5 characters is required.';
    END IF;

    SELECT * INTO v_membership
    FROM public.patient_memberships
    WHERE id = p_membership_id AND practice_id = p_practice_id
    FOR UPDATE;

    IF v_membership.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Membership not found.';
    END IF;

    IF v_membership.status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Operation not permitted: Membership is already in terminal status %.', v_membership.status;
    END IF;

    UPDATE public.patient_memberships
    SET status = 'cancelled',
        auto_renew = false,
        cancelled_at = now(),
        cancelled_by = v_caller_id,
        cancellation_reason = p_reason,
        updated_at = now()
    WHERE id = v_membership.id;

    PERFORM public.log_audit_event(
        p_practice_id,
        'membership.cancelled',
        'patient_memberships',
        v_membership.id,
        jsonb_build_object(
            'membership_number', v_membership.membership_number,
            'reason', p_reason,
            'cancelled_by', v_caller_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'membership_id', v_membership.id,
        'membership_number', v_membership.membership_number,
        'status', 'cancelled',
        'reason', p_reason
    );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_patient_membership(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_patient_membership(UUID, UUID, TEXT) TO authenticated;

-- 16. ROW-LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.practice_membership_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_billing_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_usage_ledger ENABLE ROW LEVEL SECURITY;

-- 16A. practice_membership_counters policies
CREATE POLICY p_practice_membership_counters_select ON public.practice_membership_counters
    FOR SELECT TO authenticated
    USING (practice_id = public.current_practice_id());

CREATE POLICY p_practice_membership_counters_insert ON public.practice_membership_counters
    FOR INSERT TO authenticated
    WITH CHECK (practice_id = public.current_practice_id());

CREATE POLICY p_practice_membership_counters_update ON public.practice_membership_counters
    FOR UPDATE TO authenticated
    USING (practice_id = public.current_practice_id())
    WITH CHECK (practice_id = public.current_practice_id());

-- 16B. membership_plans policies
CREATE POLICY p_membership_plans_select ON public.membership_plans
    FOR SELECT TO authenticated
    USING (practice_id = public.current_practice_id());

CREATE POLICY p_membership_plans_insert ON public.membership_plans
    FOR INSERT TO authenticated
    WITH CHECK (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    );

CREATE POLICY p_membership_plans_update ON public.membership_plans
    FOR UPDATE TO authenticated
    USING (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    )
    WITH CHECK (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    );

-- 16C. patient_memberships policies
CREATE POLICY p_patient_memberships_select ON public.patient_memberships
    FOR SELECT TO authenticated
    USING (practice_id = public.current_practice_id());

CREATE POLICY p_patient_memberships_insert ON public.patient_memberships
    FOR INSERT TO authenticated
    WITH CHECK (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    );

CREATE POLICY p_patient_memberships_update ON public.patient_memberships
    FOR UPDATE TO authenticated
    USING (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    )
    WITH CHECK (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    );

-- 16D. membership_billing_cycles policies
CREATE POLICY p_membership_billing_cycles_select ON public.membership_billing_cycles
    FOR SELECT TO authenticated
    USING (practice_id = public.current_practice_id());

CREATE POLICY p_membership_billing_cycles_insert ON public.membership_billing_cycles
    FOR INSERT TO authenticated
    WITH CHECK (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    );

CREATE POLICY p_membership_billing_cycles_update ON public.membership_billing_cycles
    FOR UPDATE TO authenticated
    USING (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    )
    WITH CHECK (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    );

-- 16E. membership_usage_ledger policies
CREATE POLICY p_membership_usage_select ON public.membership_usage_ledger
    FOR SELECT TO authenticated
    USING (practice_id = public.current_practice_id());

CREATE POLICY p_membership_usage_insert ON public.membership_usage_ledger
    FOR INSERT TO authenticated
    WITH CHECK (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'receptionist', 'physiotherapist'])
    );

-- 17. GRANTS FOR AUTHENTICATED USERS
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.practice_membership_counters TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.membership_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.patient_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.membership_billing_cycles TO authenticated;
GRANT SELECT, INSERT ON public.membership_usage_ledger TO authenticated;
