-- ==============================================================================
-- PHYSENRA PAYMENTS & RECEIPTS FOUNDATION V1 MIGRATION
-- Migration: 20260928041000_payments_receipts_foundation.sql
--
-- Features:
-- 1. Payment Method Enum ('cash', 'bank_transfer', 'pos', 'card', 'other')
-- 2. Payment Status Enum ('confirmed', 'voided')
-- 3. Receipt Status Enum ('issued', 'voided')
-- 4. Practice Payment Counter & Atomic Sequential Generator (PMT-000001)
-- 5. Standalone Top-Level Payments Table with Patient Provenance & Idempotency Key
-- 6. Practice Receipt Counter & Atomic Sequential Generator (REC-000001)
-- 7. Receipts Table (Immutable Proof-of-Payment Document: REC-000001)
-- 8. Payment Allocations Junction Table (Payment -> Allocation -> Invoice)
-- 9. Authoritative Atomic Settlement RPC (record_payment_and_allocate)
-- 10. Authoritative Payment Voiding RPC (void_payment)
-- 11. Immutability & Hard-Delete Prevention Triggers on Payments, Receipts, and Allocations
-- 12. Updated protect_invoice_immutability Trigger to Unlock Payment States
-- 13. Multi-Tenant Composite Foreign Keys for PostgREST Disambiguation
-- 14. Row-Level Security (RLS) & Role-Based Access Control (RBAC) Policies
-- ==============================================================================

-- 1. ENUMS (CONTROLLED TENDER METHODS & LIFECYCLES)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE public.payment_method AS ENUM (
            'cash',
            'bank_transfer',
            'pos',
            'card',
            'other'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE public.payment_status AS ENUM (
            'confirmed',
            'voided'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'receipt_status') THEN
        CREATE TYPE public.receipt_status AS ENUM (
            'issued',
            'voided'
        );
    END IF;
END $$;

-- 2. PRACTICE PAYMENT COUNTERS (PMT-000001)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_payment_counters (
    practice_id UUID PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
    last_number INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_payment_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practice_payment_counters_isolation" ON public.practice_payment_counters;
CREATE POLICY "practice_payment_counters_isolation"
    ON public.practice_payment_counters
    FOR ALL
    USING (practice_id = public.current_practice_id())
    WITH CHECK (practice_id = public.current_practice_id());

CREATE OR REPLACE FUNCTION public.generate_next_payment_number(p_practice_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_next_val INTEGER;
BEGIN
    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    -- Only administrative and billing roles can generate payment numbers (physiotherapists are view-only)
    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to generate payment number. Physiotherapists have view-only access.';
    END IF;

    INSERT INTO public.practice_payment_counters (practice_id, last_number, updated_at)
    VALUES (p_practice_id, 1, now())
    ON CONFLICT (practice_id) DO UPDATE
        SET last_number = public.practice_payment_counters.last_number + 1,
            updated_at = now()
    RETURNING last_number INTO v_next_val;

    RETURN 'PMT-' || LPAD(v_next_val::TEXT, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_next_payment_number(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_payment_number(UUID) TO authenticated;

-- 3. PAYMENTS TABLE (AUTHORITATIVE MONETARY INFLOW ENTITY)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    payment_number VARCHAR(32) NOT NULL,
    patient_id UUID NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    payment_method public.payment_method NOT NULL,
    reference_number VARCHAR(100) NULL,
    idempotency_key UUID NOT NULL,
    status public.payment_status NOT NULL DEFAULT 'confirmed',
    notes TEXT NULL,
    recorded_by UUID NOT NULL REFERENCES public.profiles(id),
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    voided_at TIMESTAMPTZ NULL,
    voided_by UUID REFERENCES public.profiles(id),
    void_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_payments_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_payments_practice_number UNIQUE (practice_id, payment_number),
    CONSTRAINT uq_payments_practice_idempotency UNIQUE (practice_id, idempotency_key),
    CONSTRAINT chk_payments_amount CHECK (amount > 0.00),
    CONSTRAINT chk_payments_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_payments_void CHECK (
        (status <> 'voided') OR 
        (voided_at IS NOT NULL AND void_reason IS NOT NULL AND length(trim(void_reason)) >= 5)
    ),

    -- Multi-tenant Composite Foreign Keys
    CONSTRAINT fk_payments_practice FOREIGN KEY (practice_id)
        REFERENCES public.practices(id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_patient_practice FOREIGN KEY (patient_id, practice_id)
        REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT
);

-- 4. PRACTICE RECEIPT COUNTERS (REC-000001)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_receipt_counters (
    practice_id UUID PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
    last_number INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_receipt_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practice_receipt_counters_isolation" ON public.practice_receipt_counters;
CREATE POLICY "practice_receipt_counters_isolation"
    ON public.practice_receipt_counters
    FOR ALL
    USING (practice_id = public.current_practice_id())
    WITH CHECK (practice_id = public.current_practice_id());

CREATE OR REPLACE FUNCTION public.generate_next_receipt_number(p_practice_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_next_val INTEGER;
BEGIN
    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    -- Only administrative and billing roles can generate receipt numbers
    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to generate receipt number. Physiotherapists have view-only access.';
    END IF;

    INSERT INTO public.practice_receipt_counters (practice_id, last_number, updated_at)
    VALUES (p_practice_id, 1, now())
    ON CONFLICT (practice_id) DO UPDATE
        SET last_number = public.practice_receipt_counters.last_number + 1,
            updated_at = now()
    RETURNING last_number INTO v_next_val;

    RETURN 'REC-' || LPAD(v_next_val::TEXT, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_next_receipt_number(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_receipt_number(UUID) TO authenticated;

-- 5. RECEIPTS TABLE (IMMUTABLE PROOF-OF-PAYMENT DOCUMENT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    receipt_number VARCHAR(32) NOT NULL,
    payment_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    payment_method public.payment_method NOT NULL,
    reference_number VARCHAR(100) NULL,
    status public.receipt_status NOT NULL DEFAULT 'issued',
    issued_by UUID NOT NULL REFERENCES public.profiles(id),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    voided_at TIMESTAMPTZ NULL,
    voided_by UUID REFERENCES public.profiles(id),
    void_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_receipts_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_receipts_practice_number UNIQUE (practice_id, receipt_number),
    CONSTRAINT uq_receipts_payment UNIQUE (payment_id), -- Strict 1:1 between Payment and Receipt in V1
    CONSTRAINT chk_receipts_amount CHECK (amount > 0.00),
    CONSTRAINT chk_receipts_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_receipts_void CHECK (
        (status <> 'voided') OR 
        (voided_at IS NOT NULL AND void_reason IS NOT NULL AND length(trim(void_reason)) >= 5)
    ),

    -- Multi-tenant Composite Foreign Keys
    CONSTRAINT fk_receipts_practice FOREIGN KEY (practice_id)
        REFERENCES public.practices(id) ON DELETE CASCADE,
    CONSTRAINT fk_receipts_payment_practice FOREIGN KEY (payment_id, practice_id)
        REFERENCES public.payments(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_receipts_patient_practice FOREIGN KEY (patient_id, practice_id)
        REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT
);

-- 6. PAYMENT ALLOCATIONS TABLE (PAYMENT -> ALLOCATION -> INVOICE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL,
    invoice_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    allocated_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_allocations_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_allocations_payment_invoice UNIQUE (payment_id, invoice_id),
    CONSTRAINT chk_allocations_amount CHECK (amount > 0.00),

    -- Multi-tenant Composite Foreign Keys
    CONSTRAINT fk_allocations_practice FOREIGN KEY (practice_id)
        REFERENCES public.practices(id) ON DELETE CASCADE,
    CONSTRAINT fk_allocations_payment_practice FOREIGN KEY (payment_id, practice_id)
        REFERENCES public.payments(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_allocations_invoice_practice FOREIGN KEY (invoice_id, practice_id)
        REFERENCES public.invoices(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_allocations_patient_practice FOREIGN KEY (patient_id, practice_id)
        REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT
);

-- 7. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_payments_practice_patient ON public.payments(practice_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_practice_status ON public.payments(practice_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_practice_payment_date ON public.payments(practice_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_practice_created_at ON public.payments(practice_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_receipts_practice_patient ON public.receipts(practice_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_receipts_practice_payment ON public.receipts(practice_id, payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_practice_created_at ON public.receipts(practice_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_allocations_practice_payment ON public.payment_allocations(practice_id, payment_id);
CREATE INDEX IF NOT EXISTS idx_allocations_practice_invoice ON public.payment_allocations(practice_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_allocations_practice_patient ON public.payment_allocations(practice_id, patient_id);

-- 8. IMMUTABILITY & LIFECYCLE TRIGGERS
-- ------------------------------------------------------------------------------

-- Trigger: set updated_at on payments
DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Trigger Function: Prevent hard delete on payments
CREATE OR REPLACE FUNCTION public.prevent_payment_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Operation not permitted: Payments cannot be deleted. Use voiding to reverse confirmed payments.';
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_payment_hard_delete ON public.payments;
CREATE TRIGGER trg_prevent_payment_hard_delete
    BEFORE DELETE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_payment_hard_delete();

-- Trigger Function: Prevent hard delete on receipts
CREATE OR REPLACE FUNCTION public.prevent_receipt_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Operation not permitted: Receipts are permanent legal documents and cannot be deleted.';
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_receipt_hard_delete ON public.receipts;
CREATE TRIGGER trg_prevent_receipt_hard_delete
    BEFORE DELETE ON public.receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_receipt_hard_delete();

-- Trigger Function: Prevent hard delete on payment allocations
CREATE OR REPLACE FUNCTION public.prevent_allocation_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Operation not permitted: Payment allocations are immutable audit records and cannot be deleted.';
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_allocation_hard_delete ON public.payment_allocations;
CREATE TRIGGER trg_prevent_allocation_hard_delete
    BEFORE DELETE ON public.payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_allocation_hard_delete();

-- Trigger Function: Protect Payment Immutability & Reversals
CREATE OR REPLACE FUNCTION public.protect_payment_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Core identity and tenancy are strictly immutable
    IF NEW.practice_id <> OLD.practice_id THEN
        RAISE EXCEPTION 'Operation not permitted: practice_id is immutable.';
    END IF;
    IF NEW.payment_number <> OLD.payment_number THEN
        RAISE EXCEPTION 'Operation not permitted: payment_number is immutable.';
    END IF;
    IF NEW.patient_id <> OLD.patient_id THEN
        RAISE EXCEPTION 'Operation not permitted: patient_id is immutable.';
    END IF;
    IF NEW.amount <> OLD.amount THEN
        RAISE EXCEPTION 'Operation not permitted: amount is immutable on confirmed payments.';
    END IF;
    IF NEW.currency <> OLD.currency THEN
        RAISE EXCEPTION 'Operation not permitted: currency is immutable.';
    END IF;
    IF NEW.payment_method <> OLD.payment_method THEN
        RAISE EXCEPTION 'Operation not permitted: payment_method is immutable.';
    END IF;
    IF NEW.idempotency_key <> OLD.idempotency_key THEN
        RAISE EXCEPTION 'Operation not permitted: idempotency_key is immutable.';
    END IF;
    IF NEW.recorded_by <> OLD.recorded_by THEN
        RAISE EXCEPTION 'Operation not permitted: recorded_by is immutable.';
    END IF;

    -- Terminal state: voided payments are completely locked
    IF OLD.status = 'voided' THEN
        RAISE EXCEPTION 'Operation not permitted: Voided payments are terminal and immutable.';
    END IF;

    -- Allowed transition: confirmed -> voided
    IF OLD.status = 'confirmed' AND NEW.status = 'voided' THEN
        IF NOT public.user_has_practice_role(NEW.practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant']) THEN
            RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to void payment. Only owners, managers, or accountants may void payments.';
        END IF;

        IF NEW.void_reason IS NULL OR length(trim(NEW.void_reason)) < 5 THEN
            RAISE EXCEPTION 'Operation not permitted: Voiding a payment requires a non-empty void_reason of at least 5 characters.';
        END IF;

        NEW.voided_at := COALESCE(NEW.voided_at, now());
        NEW.voided_by := COALESCE(NEW.voided_by, auth.uid());
        RETURN NEW;
    END IF;

    IF OLD.status = 'confirmed' AND NEW.status <> 'confirmed' AND NEW.status <> 'voided' THEN
        RAISE EXCEPTION 'Operation not permitted: Invalid payment status transition.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_payment_immutability ON public.payments;
CREATE TRIGGER trg_protect_payment_immutability
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_payment_immutability();

-- Trigger Function: Protect Receipt Immutability & Reversals
CREATE OR REPLACE FUNCTION public.protect_receipt_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.practice_id <> OLD.practice_id THEN
        RAISE EXCEPTION 'Operation not permitted: practice_id is immutable on receipts.';
    END IF;
    IF NEW.receipt_number <> OLD.receipt_number THEN
        RAISE EXCEPTION 'Operation not permitted: receipt_number is immutable.';
    END IF;
    IF NEW.payment_id <> OLD.payment_id THEN
        RAISE EXCEPTION 'Operation not permitted: payment_id is immutable.';
    END IF;
    IF NEW.patient_id <> OLD.patient_id THEN
        RAISE EXCEPTION 'Operation not permitted: patient_id is immutable.';
    END IF;
    IF NEW.amount <> OLD.amount THEN
        RAISE EXCEPTION 'Operation not permitted: amount is immutable on receipts.';
    END IF;
    IF NEW.currency <> OLD.currency THEN
        RAISE EXCEPTION 'Operation not permitted: currency is immutable.';
    END IF;
    IF NEW.payment_method <> OLD.payment_method THEN
        RAISE EXCEPTION 'Operation not permitted: payment_method is immutable.';
    END IF;
    IF NEW.issued_by <> OLD.issued_by THEN
        RAISE EXCEPTION 'Operation not permitted: issued_by is immutable.';
    END IF;
    IF NEW.issued_at <> OLD.issued_at THEN
        RAISE EXCEPTION 'Operation not permitted: issued_at is immutable.';
    END IF;

    -- Terminal state
    IF OLD.status = 'voided' THEN
        RAISE EXCEPTION 'Operation not permitted: Voided receipts are terminal and immutable.';
    END IF;

    -- Allowed transition: issued -> voided
    IF OLD.status = 'issued' AND NEW.status = 'voided' THEN
        NEW.voided_at := COALESCE(NEW.voided_at, now());
        NEW.voided_by := COALESCE(NEW.voided_by, auth.uid());
        RETURN NEW;
    END IF;

    IF OLD.status = 'issued' AND NEW.status <> 'issued' AND NEW.status <> 'voided' THEN
        RAISE EXCEPTION 'Operation not permitted: Invalid receipt status transition.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_receipt_immutability ON public.receipts;
CREATE TRIGGER trg_protect_receipt_immutability
    BEFORE UPDATE ON public.receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_receipt_immutability();

-- 9. UPDATE INVOICE IMMUTABILITY TRIGGER TO UNLOCK PAYMENT DOMAIN TRANSITIONS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_invoice_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_line_count INTEGER;
    v_sum_grand_total NUMERIC(12, 2);
BEGIN
    -- Tenancy and identifier are strictly immutable across all states
    IF NEW.practice_id <> OLD.practice_id THEN
        RAISE EXCEPTION 'Operation not permitted: practice_id is immutable.';
    END IF;
    IF NEW.invoice_number <> OLD.invoice_number THEN
        RAISE EXCEPTION 'Operation not permitted: invoice_number is immutable.';
    END IF;

    -- Terminal state: voided invoices are completely locked
    IF OLD.status = 'void' THEN
        RAISE EXCEPTION 'Operation not permitted: Voided invoices are terminal and immutable.';
    END IF;

    -- Transitions when OLD is issued, partially_paid, paid
    IF OLD.status IN ('issued', 'partially_paid', 'paid') THEN
        -- Patient, dates, currency, and line-derived totals cannot be modified directly
        IF NEW.patient_id <> OLD.patient_id THEN
            RAISE EXCEPTION 'Operation not permitted: patient_id is immutable on issued invoices.';
        END IF;
        IF NEW.issue_date <> OLD.issue_date THEN
            RAISE EXCEPTION 'Operation not permitted: issue_date is immutable on issued invoices.';
        END IF;
        IF NEW.currency <> OLD.currency THEN
            RAISE EXCEPTION 'Operation not permitted: currency is immutable on issued invoices.';
        END IF;
        IF NEW.subtotal <> OLD.subtotal OR NEW.discount_total <> OLD.discount_total OR NEW.tax_total <> OLD.tax_total OR NEW.grand_total <> OLD.grand_total THEN
            RAISE EXCEPTION 'Operation not permitted: financial totals are locked on issued invoices.';
        END IF;

        -- Permitted status transitions:
        IF NEW.status = 'void' THEN
            -- Only practice_owner, practice_manager, and accountant can void invoices
            IF NOT public.user_has_practice_role(NEW.practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant']) THEN
                RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to void invoice. Only owners, practice managers, or accountants may void invoices.';
            END IF;

            IF NEW.void_reason IS NULL OR length(trim(NEW.void_reason)) < 5 THEN
                RAISE EXCEPTION 'Operation not permitted: Voiding an invoice requires a non-empty void_reason of at least 5 characters.';
            END IF;

            NEW.voided_at := COALESCE(NEW.voided_at, now());
            NEW.voided_by := COALESCE(NEW.voided_by, auth.uid());
            NEW.balance_due := 0.00;
            RETURN NEW;
        ELSIF NEW.status = 'draft' THEN
            RAISE EXCEPTION 'Operation not permitted: Cannot revert issued invoice to draft.';
        END IF;

        -- Permitted payment status transitions:
        IF NEW.status = 'partially_paid' THEN
            IF NEW.amount_paid <= 0.00 OR NEW.amount_paid >= NEW.grand_total THEN
                RAISE EXCEPTION 'Validation failure: Invoice status partially_paid requires 0 < amount_paid < grand_total.';
            END IF;
            IF NEW.balance_due <> (NEW.grand_total - NEW.amount_paid) THEN
                RAISE EXCEPTION 'Validation failure: balance_due must equal grand_total - amount_paid.';
            END IF;
            RETURN NEW;
        ELSIF NEW.status = 'paid' THEN
            IF NEW.amount_paid <> NEW.grand_total OR NEW.balance_due <> 0.00 THEN
                RAISE EXCEPTION 'Validation failure: Invoice status paid requires amount_paid = grand_total and balance_due = 0.00.';
            END IF;
            RETURN NEW;
        ELSIF NEW.status = 'issued' THEN
            -- Reversal back to issued during payment voiding
            IF NEW.amount_paid <> 0.00 OR NEW.balance_due <> NEW.grand_total THEN
                RAISE EXCEPTION 'Validation failure: Invoice status issued requires amount_paid = 0.00 and balance_due = grand_total.';
            END IF;
            RETURN NEW;
        END IF;

        RETURN NEW;
    END IF;

    -- OLD is draft:
    IF OLD.status = 'draft' THEN
        -- Transition to issued:
        IF NEW.status = 'issued' THEN
            -- Check user authorization for issuing (Owners, Managers, Accountants, Receptionists)
            IF NOT public.user_has_practice_role(NEW.practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
                RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to issue invoice. Physiotherapists have view-only billing access.';
            END IF;

            -- Verify lines exist:
            SELECT count(*), COALESCE(SUM(line_total), 0.00)
            INTO v_line_count, v_sum_grand_total
            FROM public.invoice_lines
            WHERE invoice_id = NEW.id;

            IF v_line_count = 0 THEN
                RAISE EXCEPTION 'Validation failure: Cannot issue invoice without invoice lines.';
            END IF;

            IF v_sum_grand_total <= 0.00 THEN
                RAISE EXCEPTION 'Validation failure: Cannot issue invoice with non-positive grand total.';
            END IF;

            NEW.issued_at := COALESCE(NEW.issued_at, now());
            NEW.finalized_by := COALESCE(NEW.finalized_by, auth.uid());
            NEW.grand_total := v_sum_grand_total;
            NEW.balance_due := NEW.grand_total - COALESCE(NEW.amount_paid, 0.00);
            RETURN NEW;
        END IF;

        -- Cannot transition directly from draft to paid, partially_paid, or void:
        IF NEW.status IN ('partially_paid', 'paid', 'void') THEN
            RAISE EXCEPTION 'Operation not permitted: Draft invoice must be issued before entering status %', NEW.status;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 10. ATOMIC PAYMENT RECORDING & ALLOCATION RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_payment_and_allocate(
    p_practice_id UUID,
    p_patient_id UUID,
    p_payment_date DATE,
    p_amount NUMERIC(12, 2),
    p_currency VARCHAR(3),
    p_payment_method public.payment_method,
    p_reference_number VARCHAR(100),
    p_idempotency_key UUID,
    p_notes TEXT,
    p_allocations JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing_payment RECORD;
    v_payment_id UUID;
    v_payment_number TEXT;
    v_receipt_id UUID;
    v_receipt_number TEXT;
    v_total_allocated NUMERIC(12, 2) := 0.00;
    v_alloc_item JSONB;
    v_inv_id UUID;
    v_inv_amt NUMERIC(12, 2);
    v_inv_record RECORD;
    v_actor_id UUID;
    v_result_allocations JSONB := '[]'::JSONB;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- 1. Validate tenant context
    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    -- 2. Validate role authorization (Owners, Managers, Accountants, Receptionists)
    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to record payment. Physiotherapists have view-only financial access.';
    END IF;

    -- 3. Check Idempotency Key
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, payment_number, status, amount INTO v_existing_payment
        FROM public.payments
        WHERE practice_id = p_practice_id AND idempotency_key = p_idempotency_key;

        IF FOUND THEN
            -- Idempotent return: fetch linked receipt and return existing data
            SELECT id, receipt_number INTO v_receipt_id, v_receipt_number
            FROM public.receipts
            WHERE payment_id = v_existing_payment.id;

            RETURN jsonb_build_object(
                'idempotent', true,
                'payment_id', v_existing_payment.id,
                'payment_number', v_existing_payment.payment_number,
                'status', v_existing_payment.status,
                'amount', v_existing_payment.amount,
                'receipt_id', v_receipt_id,
                'receipt_number', v_receipt_number
            );
        END IF;
    ELSE
        RAISE EXCEPTION 'Validation failure: idempotency_key is mandatory.';
    END IF;

    -- 4. Validate Amount and Currency
    IF p_amount IS NULL OR p_amount <= 0.00 THEN
        RAISE EXCEPTION 'Validation failure: Payment amount must be strictly greater than 0.00.';
    END IF;

    IF p_currency IS NULL OR p_currency !~ '^[A-Z]{3}$' THEN
        RAISE EXCEPTION 'Validation failure: Invalid currency format (must be 3 uppercase letters).';
    END IF;

    -- 5. Validate Patient exists in this practice
    IF NOT EXISTS (
        SELECT 1 FROM public.patients WHERE id = p_patient_id AND practice_id = p_practice_id
    ) THEN
        RAISE EXCEPTION 'Validation failure: Patient not found in active practice.';
    END IF;

    -- 6. Validate Allocations array
    IF p_allocations IS NULL OR jsonb_typeof(p_allocations) <> 'array' OR jsonb_array_length(p_allocations) = 0 THEN
        RAISE EXCEPTION 'Validation failure: Payment must be allocated to at least one invoice.';
    END IF;

    -- Calculate total allocation and verify against payment amount
    FOR v_alloc_item IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
        v_inv_amt := (v_alloc_item->>'amount')::NUMERIC(12, 2);
        IF v_inv_amt IS NULL OR v_inv_amt <= 0.00 THEN
            RAISE EXCEPTION 'Validation failure: Allocation amount must be strictly positive.';
        END IF;
        v_total_allocated := v_total_allocated + v_inv_amt;
    END LOOP;

    -- Exhaustive allocation check in V1
    IF v_total_allocated <> p_amount THEN
        RAISE EXCEPTION 'Validation failure: Total allocated amount (%) does not match payment amount (%). Unallocated funds are rejected in V1.', v_total_allocated, p_amount;
    END IF;

    -- 7. Generate Payment Number & Insert Payment
    v_payment_number := public.generate_next_payment_number(p_practice_id);

    INSERT INTO public.payments (
        practice_id,
        payment_number,
        patient_id,
        payment_date,
        amount,
        currency,
        payment_method,
        reference_number,
        idempotency_key,
        status,
        notes,
        recorded_by,
        confirmed_at
    )
    VALUES (
        p_practice_id,
        v_payment_number,
        p_patient_id,
        COALESCE(p_payment_date, CURRENT_DATE),
        p_amount,
        p_currency,
        p_payment_method,
        p_reference_number,
        p_idempotency_key,
        'confirmed',
        p_notes,
        v_actor_id,
        now()
    )
    RETURNING id INTO v_payment_id;

    -- 8. Process each allocation under row locks
    FOR v_alloc_item IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
        v_inv_id := (v_alloc_item->>'invoice_id')::UUID;
        v_inv_amt := (v_alloc_item->>'amount')::NUMERIC(12, 2);

        -- Lock invoice row
        SELECT id, patient_id, currency, grand_total, amount_paid, balance_due, status
        INTO v_inv_record
        FROM public.invoices
        WHERE id = v_inv_id AND practice_id = p_practice_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Validation failure: Invoice % not found in practice.', v_inv_id;
        END IF;

        IF v_inv_record.patient_id <> p_patient_id THEN
            RAISE EXCEPTION 'Validation failure: Cross-patient allocation is prohibited. Invoice % belongs to another patient.', v_inv_id;
        END IF;

        IF v_inv_record.currency <> p_currency THEN
            RAISE EXCEPTION 'Validation failure: Cross-currency allocation is prohibited. Invoice currency % does not match payment currency %.', v_inv_record.currency, p_currency;
        END IF;

        IF v_inv_record.status NOT IN ('issued', 'partially_paid') THEN
            RAISE EXCEPTION 'Validation failure: Cannot allocate to invoice % in % status. Invoices must be issued or partially paid.', v_inv_id, v_inv_record.status;
        END IF;

        IF v_inv_amt > v_inv_record.balance_due THEN
            RAISE EXCEPTION 'Validation failure: Allocation amount (%) exceeds remaining invoice balance (%) for invoice %.', v_inv_amt, v_inv_record.balance_due, v_inv_id;
        END IF;

        -- Insert allocation
        INSERT INTO public.payment_allocations (
            practice_id,
            payment_id,
            invoice_id,
            patient_id,
            amount,
            allocated_at,
            allocated_by
        )
        VALUES (
            p_practice_id,
            v_payment_id,
            v_inv_id,
            p_patient_id,
            v_inv_amt,
            now(),
            v_actor_id
        );

        -- Update invoice totals and status
        UPDATE public.invoices
        SET
            amount_paid = amount_paid + v_inv_amt,
            balance_due = grand_total - (amount_paid + v_inv_amt),
            status = CASE 
                WHEN (grand_total - (amount_paid + v_inv_amt)) = 0.00 THEN 'paid'::public.invoice_status
                ELSE 'partially_paid'::public.invoice_status
            END,
            updated_at = now()
        WHERE id = v_inv_id;

        -- Log allocation audit event
        PERFORM public.log_audit_event(
            'payment.allocated',
            'payment_allocations',
            v_payment_id,
            jsonb_build_object(
                'invoice_id', v_inv_id,
                'amount', v_inv_amt,
                'patient_id', p_patient_id,
                'practice_id', p_practice_id
            )
        );

        v_result_allocations := v_result_allocations || jsonb_build_object(
            'invoice_id', v_inv_id,
            'amount', v_inv_amt
        );
    END LOOP;

    -- 9. Generate Receipt Number & Insert Receipt
    v_receipt_number := public.generate_next_receipt_number(p_practice_id);

    INSERT INTO public.receipts (
        practice_id,
        receipt_number,
        payment_id,
        patient_id,
        issue_date,
        amount,
        currency,
        payment_method,
        reference_number,
        status,
        issued_by,
        issued_at
    )
    VALUES (
        p_practice_id,
        v_receipt_number,
        v_payment_id,
        p_patient_id,
        COALESCE(p_payment_date, CURRENT_DATE),
        p_amount,
        p_currency,
        p_payment_method,
        p_reference_number,
        'issued',
        v_actor_id,
        now()
    )
    RETURNING id INTO v_receipt_id;

    -- 10. Log Audit Events
    PERFORM public.log_audit_event(
        'payment.recorded',
        'payments',
        v_payment_id,
        jsonb_build_object(
            'payment_number', v_payment_number,
            'patient_id', p_patient_id,
            'amount', p_amount,
            'currency', p_currency,
            'payment_method', p_payment_method,
            'reference_number', p_reference_number,
            'allocations', v_result_allocations
        )
    );

    PERFORM public.log_audit_event(
        'receipt.issued',
        'receipts',
        v_receipt_id,
        jsonb_build_object(
            'receipt_number', v_receipt_number,
            'payment_id', v_payment_id,
            'patient_id', p_patient_id,
            'amount', p_amount
        )
    );

    -- 11. Return created details
    RETURN jsonb_build_object(
        'idempotent', false,
        'payment_id', v_payment_id,
        'payment_number', v_payment_number,
        'status', 'confirmed',
        'amount', p_amount,
        'currency', p_currency,
        'receipt_id', v_receipt_id,
        'receipt_number', v_receipt_number,
        'allocations', v_result_allocations
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_payment_and_allocate(UUID, UUID, DATE, NUMERIC, VARCHAR, public.payment_method, VARCHAR, UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_payment_and_allocate(UUID, UUID, DATE, NUMERIC, VARCHAR, public.payment_method, VARCHAR, UUID, TEXT, JSONB) TO authenticated;

-- 11. ATOMIC PAYMENT VOIDING RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.void_payment(
    p_practice_id UUID,
    p_payment_id UUID,
    p_void_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_payment_record RECORD;
    v_alloc_record RECORD;
    v_inv_record RECORD;
    v_receipt_id UUID;
    v_actor_id UUID;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- 1. Validate tenant context
    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    -- 2. Authorization: Only Owners, Managers, Accountants can void (Receptionists & Physios DENIED)
    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to void payment. Only practice owners, managers, or accountants may void payments.';
    END IF;

    -- 3. Void reason check
    IF p_void_reason IS NULL OR length(trim(p_void_reason)) < 5 THEN
        RAISE EXCEPTION 'Validation failure: Voiding a payment requires a non-empty void_reason of at least 5 characters.';
    END IF;

    -- 4. Lock Payment
    SELECT id, payment_number, status, amount, patient_id INTO v_payment_record
    FROM public.payments
    WHERE id = p_payment_id AND practice_id = p_practice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Validation failure: Payment % not found.', p_payment_id;
    END IF;

    IF v_payment_record.status = 'voided' THEN
        RAISE EXCEPTION 'Operation not permitted: Payment % is already voided.', v_payment_record.payment_number;
    END IF;

    -- 5. Lock and reverse each allocation
    FOR v_alloc_record IN 
        SELECT id, invoice_id, amount
        FROM public.payment_allocations
        WHERE payment_id = p_payment_id AND practice_id = p_practice_id
        FOR UPDATE
    LOOP
        -- Lock invoice
        SELECT id, grand_total, amount_paid, balance_due, status INTO v_inv_record
        FROM public.invoices
        WHERE id = v_alloc_record.invoice_id AND practice_id = p_practice_id
        FOR UPDATE;

        IF FOUND THEN
            UPDATE public.invoices
            SET
                amount_paid = GREATEST(0.00, amount_paid - v_alloc_record.amount),
                balance_due = grand_total - GREATEST(0.00, amount_paid - v_alloc_record.amount),
                status = CASE
                    WHEN (grand_total - GREATEST(0.00, amount_paid - v_alloc_record.amount)) = grand_total THEN 'issued'::public.invoice_status
                    ELSE 'partially_paid'::public.invoice_status
                END,
                updated_at = now()
            WHERE id = v_alloc_record.invoice_id;
        END IF;
    END LOOP;

    -- 6. Update Payment status to voided
    UPDATE public.payments
    SET
        status = 'voided',
        voided_at = now(),
        voided_by = v_actor_id,
        void_reason = p_void_reason,
        updated_at = now()
    WHERE id = p_payment_id;

    -- 7. Update linked Receipt status to voided
    UPDATE public.receipts
    SET
        status = 'voided',
        voided_at = now(),
        voided_by = v_actor_id,
        void_reason = p_void_reason
    WHERE payment_id = p_payment_id
    RETURNING id INTO v_receipt_id;

    -- 8. Log Audit Events
    PERFORM public.log_audit_event(
        'payment.voided',
        'payments',
        p_payment_id,
        jsonb_build_object(
            'payment_number', v_payment_record.payment_number,
            'void_reason', p_void_reason,
            'patient_id', v_payment_record.patient_id,
            'amount', v_payment_record.amount
        )
    );

    IF v_receipt_id IS NOT NULL THEN
        PERFORM public.log_audit_event(
            'receipt.voided',
            'receipts',
            v_receipt_id,
            jsonb_build_object(
                'payment_id', p_payment_id,
                'void_reason', p_void_reason
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'status', 'voided',
        'void_reason', p_void_reason
    );
END;
$$;

REVOKE ALL ON FUNCTION public.void_payment(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_payment(UUID, UUID, TEXT) TO authenticated;

-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Payments RLS Policies
DROP POLICY IF EXISTS "payments_tenant_isolation_select" ON public.payments;
CREATE POLICY "payments_tenant_isolation_select"
    ON public.payments
    FOR SELECT
    USING (practice_id = public.current_practice_id());

DROP POLICY IF EXISTS "payments_tenant_isolation_insert" ON public.payments;
CREATE POLICY "payments_tenant_isolation_insert"
    ON public.payments
    FOR INSERT
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    );

DROP POLICY IF EXISTS "payments_tenant_isolation_update" ON public.payments;
CREATE POLICY "payments_tenant_isolation_update"
    ON public.payments
    FOR UPDATE
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    )
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    );

DROP POLICY IF EXISTS "payments_deny_delete" ON public.payments;
CREATE POLICY "payments_deny_delete"
    ON public.payments
    FOR DELETE
    USING (false);

-- Payment Allocations RLS Policies
DROP POLICY IF EXISTS "allocations_tenant_isolation_select" ON public.payment_allocations;
CREATE POLICY "allocations_tenant_isolation_select"
    ON public.payment_allocations
    FOR SELECT
    USING (practice_id = public.current_practice_id());

DROP POLICY IF EXISTS "allocations_tenant_isolation_insert" ON public.payment_allocations;
CREATE POLICY "allocations_tenant_isolation_insert"
    ON public.payment_allocations
    FOR INSERT
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    );

DROP POLICY IF EXISTS "allocations_deny_update" ON public.payment_allocations;
CREATE POLICY "allocations_deny_update"
    ON public.payment_allocations
    FOR UPDATE
    USING (false);

DROP POLICY IF EXISTS "allocations_deny_delete" ON public.payment_allocations;
CREATE POLICY "allocations_deny_delete"
    ON public.payment_allocations
    FOR DELETE
    USING (false);

-- Receipts RLS Policies
DROP POLICY IF EXISTS "receipts_tenant_isolation_select" ON public.receipts;
CREATE POLICY "receipts_tenant_isolation_select"
    ON public.receipts
    FOR SELECT
    USING (practice_id = public.current_practice_id());

DROP POLICY IF EXISTS "receipts_tenant_isolation_insert" ON public.receipts;
CREATE POLICY "receipts_tenant_isolation_insert"
    ON public.receipts
    FOR INSERT
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    );

DROP POLICY IF EXISTS "receipts_tenant_isolation_update" ON public.receipts;
CREATE POLICY "receipts_tenant_isolation_update"
    ON public.receipts
    FOR UPDATE
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    )
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    );

DROP POLICY IF EXISTS "receipts_deny_delete" ON public.receipts;
CREATE POLICY "receipts_deny_delete"
    ON public.receipts
    FOR DELETE
    USING (false);
