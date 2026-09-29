-- ==============================================================================
-- PHYSENRA PATIENT WALLETS FOUNDATION V1 MIGRATION
-- Migration: 20260929010000_patient_wallets_foundation.sql
--
-- Approved Architecture: Option E
-- (Decoupled Wallet Account + Immutable Append-Only Ledger + Unified Invoice Settlement Allocation Bridge)
--
-- Invariants:
-- 1. Multi-tenant isolation anchored on practice_id with composite foreign keys.
-- 2. Zero mutable balance column: wallet balance is derived from the append-only ledger.
-- 3. Balance authority: Non-negative balance invariant (Balance >= 0.00).
-- 4. Concurrency safety: Row-level locking (SELECT ... FOR UPDATE) on patient_wallets header.
-- 5. Append-only ledger: Updates and deletes are prohibited by database triggers.
-- 6. Unified Invoice Settlement: Settle-from-wallet integrates atomically with existing Billing invariants.
-- 7. Firewalls: Clinical documentation and treatment packages remain strictly decoupled.
-- 8. Domain boundaries: Zero recurring memberships, cash refunds, credit notes, or gateways in V1.
-- ==============================================================================

-- 1. ENUMS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_status') THEN
        CREATE TYPE public.wallet_status AS ENUM (
            'active',
            'suspended',
            'closed'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_ledger_entry_type') THEN
        CREATE TYPE public.wallet_ledger_entry_type AS ENUM (
            'deposit',
            'overpayment_conversion',
            'adjustment_credit',
            'reversal_credit',
            'invoice_settlement',
            'adjustment_debit',
            'payment_void_reversal'
        );
    END IF;
END;
$$;

-- 2. PRACTICE WALLET COUNTERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_wallet_counters (
    practice_id UUID PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_practice_wallet_counters_last_number CHECK (last_number >= 0)
);

-- 3. SEQUENTIAL IDENTIFIER GENERATOR (WLT-000001)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_next_wallet_number(p_practice_id UUID)
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

    -- Only administrative and billing roles can generate wallet numbers
    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to generate wallet number.';
    END IF;

    INSERT INTO public.practice_wallet_counters (practice_id, last_number, updated_at)
    VALUES (p_practice_id, 1, now())
    ON CONFLICT (practice_id) DO UPDATE
        SET last_number = public.practice_wallet_counters.last_number + 1,
            updated_at = now()
    RETURNING last_number INTO v_next_val;

    RETURN 'WLT-' || LPAD(v_next_val::TEXT, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_next_wallet_number(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_wallet_number(UUID) TO authenticated;

-- 4. PATIENT WALLETS (ACCOUNT HEADER)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    wallet_number VARCHAR(32) NOT NULL,
    patient_id UUID NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status public.wallet_status NOT NULL DEFAULT 'active',
    closed_at TIMESTAMPTZ NULL,
    closed_by UUID REFERENCES public.profiles(id),
    closure_reason TEXT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_patient_wallets_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_patient_wallets_practice_number UNIQUE (practice_id, wallet_number),
    CONSTRAINT uq_patient_wallets_patient_currency UNIQUE (practice_id, patient_id, currency),
    CONSTRAINT chk_patient_wallets_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_patient_wallets_closure CHECK (
        status <> 'closed' OR (
            closed_at IS NOT NULL AND 
            closed_by IS NOT NULL AND 
            closure_reason IS NOT NULL AND 
            length(trim(closure_reason)) >= 10
        )
    ),

    -- Multi-tenant Composite Foreign Keys
    CONSTRAINT fk_wallets_patient_practice FOREIGN KEY (patient_id, practice_id)
        REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_wallets_created_by FOREIGN KEY (created_by)
        REFERENCES public.profiles(id),
    CONSTRAINT fk_wallets_closed_by FOREIGN KEY (closed_by)
        REFERENCES public.profiles(id)
);

-- 5. PATIENT WALLET LEDGER (IMMUTABLE APPEND-ONLY TRANSACTION LEDGER)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_wallet_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    entry_type public.wallet_ledger_entry_type NOT NULL,
    amount NUMERIC(12, 2) NOT NULL, -- Positive for credits, negative for debits
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    source_payment_id UUID NULL,
    source_invoice_id UUID NULL,
    idempotency_key VARCHAR(64) NULL,
    notes TEXT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_wallet_ledger_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_wallet_ledger_idempotency UNIQUE (practice_id, idempotency_key),
    CONSTRAINT chk_wallet_ledger_amount_nonzero CHECK (amount <> 0.00),
    CONSTRAINT chk_wallet_ledger_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_wallet_ledger_sign CHECK (
        (entry_type IN ('deposit', 'overpayment_conversion', 'adjustment_credit', 'reversal_credit') AND amount > 0.00) OR
        (entry_type IN ('invoice_settlement', 'adjustment_debit', 'payment_void_reversal') AND amount < 0.00)
    ),

    -- Multi-tenant Composite Foreign Keys
    CONSTRAINT fk_ledger_wallet_practice FOREIGN KEY (wallet_id, practice_id)
        REFERENCES public.patient_wallets(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ledger_patient_practice FOREIGN KEY (patient_id, practice_id)
        REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ledger_payment_practice FOREIGN KEY (source_payment_id, practice_id)
        REFERENCES public.payments(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ledger_invoice_practice FOREIGN KEY (source_invoice_id, practice_id)
        REFERENCES public.invoices(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ledger_created_by FOREIGN KEY (created_by)
        REFERENCES public.profiles(id)
);

-- 6. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_patient_wallets_practice ON public.patient_wallets(practice_id);
CREATE INDEX IF NOT EXISTS idx_patient_wallets_patient ON public.patient_wallets(practice_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_wallets_status ON public.patient_wallets(practice_id, status);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_practice ON public.patient_wallet_ledger(practice_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_wallet ON public.patient_wallet_ledger(practice_id, wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_patient ON public.patient_wallet_ledger(practice_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_invoice ON public.patient_wallet_ledger(practice_id, source_invoice_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_payment ON public.patient_wallet_ledger(practice_id, source_payment_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_created_at ON public.patient_wallet_ledger(practice_id, created_at DESC);

-- 7. IMMUTABILITY & PROTECTION TRIGGERS
-- ------------------------------------------------------------------------------

-- 7A. Prevent hard delete of wallet entities
CREATE OR REPLACE FUNCTION public.prevent_wallet_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Operation not permitted: Hard deletion of wallet entities is strictly prohibited.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_delete_practice_wallet_counters ON public.practice_wallet_counters;
CREATE TRIGGER trg_prevent_delete_practice_wallet_counters
BEFORE DELETE ON public.practice_wallet_counters
FOR EACH ROW EXECUTE FUNCTION public.prevent_wallet_hard_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_patient_wallets ON public.patient_wallets;
CREATE TRIGGER trg_prevent_delete_patient_wallets
BEFORE DELETE ON public.patient_wallets
FOR EACH ROW EXECUTE FUNCTION public.prevent_wallet_hard_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_patient_wallet_ledger ON public.patient_wallet_ledger;
CREATE TRIGGER trg_prevent_delete_patient_wallet_ledger
BEFORE DELETE ON public.patient_wallet_ledger
FOR EACH ROW EXECUTE FUNCTION public.prevent_wallet_hard_delete();

-- 7B. Protect wallet ledger immutability (strictly append-only)
CREATE OR REPLACE FUNCTION public.protect_wallet_ledger_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Operation not permitted: patient_wallet_ledger is strictly append-only. Updates are prohibited.';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_wallet_ledger_immutability ON public.patient_wallet_ledger;
CREATE TRIGGER trg_protect_wallet_ledger_immutability
BEFORE UPDATE ON public.patient_wallet_ledger
FOR EACH ROW EXECUTE FUNCTION public.protect_wallet_ledger_immutability();

-- 7C. Protect patient wallet core identity fields and status transitions
CREATE OR REPLACE FUNCTION public.protect_patient_wallet_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Core identity fields cannot be modified
    IF NEW.practice_id <> OLD.practice_id THEN
        RAISE EXCEPTION 'Operation not permitted: practice_id is immutable on patient wallets.';
    END IF;
    IF NEW.wallet_number <> OLD.wallet_number THEN
        RAISE EXCEPTION 'Operation not permitted: wallet_number is immutable on patient wallets.';
    END IF;
    IF NEW.patient_id <> OLD.patient_id THEN
        RAISE EXCEPTION 'Operation not permitted: patient_id is immutable on patient wallets.';
    END IF;
    IF NEW.currency <> OLD.currency THEN
        RAISE EXCEPTION 'Operation not permitted: currency is immutable on patient wallets.';
    END IF;
    IF NEW.created_by <> OLD.created_by THEN
        RAISE EXCEPTION 'Operation not permitted: created_by is immutable on patient wallets.';
    END IF;

    -- Lifecycle state machine validation
    IF OLD.status = 'closed' AND NEW.status <> 'closed' THEN
        RAISE EXCEPTION 'Operation not permitted: Closed wallet accounts cannot be reopened or transitioned to %.', NEW.status;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_patient_wallet ON public.patient_wallets;
CREATE TRIGGER trg_protect_patient_wallet
BEFORE UPDATE ON public.patient_wallets
FOR EACH ROW EXECUTE FUNCTION public.protect_patient_wallet_immutability();

-- 8. CORE ATOMIC RPCS
-- ------------------------------------------------------------------------------

-- 8A. RPC: GET OR CREATE PATIENT WALLET
CREATE OR REPLACE FUNCTION public.get_or_create_patient_wallet(
    p_practice_id UUID,
    p_patient_id UUID,
    p_currency VARCHAR(3) DEFAULT 'NGN'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wallet RECORD;
    v_wallet_number VARCHAR(32);
    v_caller_id UUID;
    v_balance NUMERIC(12, 2);
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist', 'physiotherapist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges.';
    END IF;

    -- Check if wallet already exists
    SELECT * INTO v_wallet
    FROM public.patient_wallets
    WHERE practice_id = p_practice_id 
      AND patient_id = p_patient_id 
      AND currency = COALESCE(p_currency, 'NGN');

    IF v_wallet.id IS NULL THEN
        -- Only billing/admin staff can create new wallet
        IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
            RAISE EXCEPTION 'Operation not permitted: Only administrative staff may initialize new patient wallets.';
        END IF;

        -- Verify patient exists in practice
        IF NOT EXISTS (SELECT 1 FROM public.patients WHERE id = p_patient_id AND practice_id = p_practice_id) THEN
            RAISE EXCEPTION 'Validation failure: Patient not found in active practice.';
        END IF;

        v_wallet_number := public.generate_next_wallet_number(p_practice_id);

        INSERT INTO public.patient_wallets (
            practice_id,
            wallet_number,
            patient_id,
            currency,
            status,
            created_by
        ) VALUES (
            p_practice_id,
            v_wallet_number,
            p_patient_id,
            COALESCE(p_currency, 'NGN'),
            'active',
            v_caller_id
        ) RETURNING * INTO v_wallet;

        PERFORM public.log_audit_event(
            p_practice_id,
            'wallet.created',
            'patient_wallets',
            v_wallet.id,
            jsonb_build_object(
                'wallet_number', v_wallet.wallet_number,
                'patient_id', v_wallet.patient_id,
                'currency', v_wallet.currency
            )
        );
    END IF;

    -- Calculate derived balance
    SELECT COALESCE(SUM(amount), 0.00) INTO v_balance
    FROM public.patient_wallet_ledger
    WHERE wallet_id = v_wallet.id AND practice_id = p_practice_id;

    RETURN jsonb_build_object(
        'id', v_wallet.id,
        'wallet_number', v_wallet.wallet_number,
        'patient_id', v_wallet.patient_id,
        'currency', v_wallet.currency,
        'status', v_wallet.status,
        'balance', v_balance,
        'created_at', v_wallet.created_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_patient_wallet(UUID, UUID, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_patient_wallet(UUID, UUID, VARCHAR) TO authenticated;

-- 8B. RPC: ADVANCE PATIENT DEPOSIT
CREATE OR REPLACE FUNCTION public.deposit_to_wallet(
    p_practice_id UUID,
    p_patient_id UUID,
    p_amount NUMERIC(12, 2),
    p_payment_method public.payment_method,
    p_reference_number VARCHAR(100) DEFAULT NULL,
    p_idempotency_key VARCHAR(64) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_wallet RECORD;
    v_payment_id UUID;
    v_payment_number VARCHAR(32);
    v_receipt_id UUID;
    v_receipt_number VARCHAR(32);
    v_ledger_id UUID;
    v_new_balance NUMERIC(12, 2);
    v_existing_ledger RECORD;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to record advance deposit.';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0.00 THEN
        RAISE EXCEPTION 'Validation failure: Deposit amount must be strictly greater than 0.00.';
    END IF;

    -- Idempotency check on ledger
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, wallet_id, amount INTO v_existing_ledger
        FROM public.patient_wallet_ledger
        WHERE practice_id = p_practice_id AND idempotency_key = p_idempotency_key;

        IF FOUND THEN
            SELECT COALESCE(SUM(amount), 0.00) INTO v_new_balance
            FROM public.patient_wallet_ledger
            WHERE wallet_id = v_existing_ledger.wallet_id;

            RETURN jsonb_build_object(
                'idempotent', true,
                'ledger_id', v_existing_ledger.id,
                'wallet_id', v_existing_ledger.wallet_id,
                'amount', v_existing_ledger.amount,
                'balance', v_new_balance
            );
        END IF;
    END IF;

    -- Ensure wallet exists and lock FOR UPDATE
    SELECT * INTO v_wallet
    FROM public.patient_wallets
    WHERE practice_id = p_practice_id AND patient_id = p_patient_id AND currency = 'NGN'
    FOR UPDATE;

    IF v_wallet.id IS NULL THEN
        -- Create wallet header
        SELECT * INTO v_wallet
        FROM jsonb_to_record(public.get_or_create_patient_wallet(p_practice_id, p_patient_id, 'NGN'))
        AS x(id UUID, wallet_number VARCHAR(32), patient_id UUID, currency VARCHAR(3), status public.wallet_status, balance NUMERIC(12, 2), created_at TIMESTAMPTZ);
    END IF;

    IF v_wallet.status <> 'active' THEN
        RAISE EXCEPTION 'Validation failure: Cannot deposit into % wallet account.', v_wallet.status;
    END IF;

    -- 1. Create Inflow Payment Record
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
    ) VALUES (
        p_practice_id,
        v_payment_number,
        p_patient_id,
        CURRENT_DATE,
        p_amount,
        'NGN',
        p_payment_method,
        p_reference_number,
        gen_random_uuid(),
        'confirmed',
        COALESCE(p_notes, 'Advance Wallet Deposit'),
        v_caller_id,
        now()
    ) RETURNING id INTO v_payment_id;

    -- 2. Create Deposit Proof Receipt
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
    ) VALUES (
        p_practice_id,
        v_receipt_number,
        v_payment_id,
        p_patient_id,
        CURRENT_DATE,
        p_amount,
        'NGN',
        p_payment_method,
        p_reference_number,
        'issued',
        v_caller_id,
        now()
    ) RETURNING id INTO v_receipt_id;

    -- 3. Append to Wallet Ledger (Credit)
    INSERT INTO public.patient_wallet_ledger (
        practice_id,
        wallet_id,
        patient_id,
        entry_type,
        amount,
        currency,
        source_payment_id,
        idempotency_key,
        notes,
        created_by
    ) VALUES (
        p_practice_id,
        v_wallet.id,
        p_patient_id,
        'deposit',
        p_amount,
        'NGN',
        v_payment_id,
        p_idempotency_key,
        COALESCE(p_notes, 'Deposit receipt ' || v_receipt_number),
        v_caller_id
    ) RETURNING id INTO v_ledger_id;

    -- 4. Calculate New Derived Balance
    SELECT COALESCE(SUM(amount), 0.00) INTO v_new_balance
    FROM public.patient_wallet_ledger
    WHERE wallet_id = v_wallet.id;

    PERFORM public.log_audit_event(
        p_practice_id,
        'wallet.deposit_recorded',
        'patient_wallet_ledger',
        v_ledger_id,
        jsonb_build_object(
            'wallet_number', v_wallet.wallet_number,
            'patient_id', p_patient_id,
            'payment_id', v_payment_id,
            'payment_number', v_payment_number,
            'receipt_number', v_receipt_number,
            'amount', p_amount,
            'new_balance', v_new_balance
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'wallet_id', v_wallet.id,
        'wallet_number', v_wallet.wallet_number,
        'ledger_id', v_ledger_id,
        'payment_id', v_payment_id,
        'payment_number', v_payment_number,
        'receipt_id', v_receipt_id,
        'receipt_number', v_receipt_number,
        'amount_credited', p_amount,
        'balance', v_new_balance
    );
END;
$$;

REVOKE ALL ON FUNCTION public.deposit_to_wallet(UUID, UUID, NUMERIC, public.payment_method, VARCHAR, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deposit_to_wallet(UUID, UUID, NUMERIC, public.payment_method, VARCHAR, VARCHAR, TEXT) TO authenticated;

-- 8C. RPC: CONVERT OVERPAYMENT TO WALLET CREDIT
CREATE OR REPLACE FUNCTION public.convert_overpayment_to_wallet(
    p_practice_id UUID,
    p_payment_id UUID,
    p_amount NUMERIC(12, 2),
    p_idempotency_key VARCHAR(64) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_payment RECORD;
    v_wallet RECORD;
    v_allocated_total NUMERIC(12, 2);
    v_converted_total NUMERIC(12, 2);
    v_available_excess NUMERIC(12, 2);
    v_ledger_id UUID;
    v_new_balance NUMERIC(12, 2);
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to convert overpayment.';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0.00 THEN
        RAISE EXCEPTION 'Validation failure: Conversion amount must be strictly greater than 0.00.';
    END IF;

    -- Lock payment
    SELECT * INTO v_payment
    FROM public.payments
    WHERE id = p_payment_id AND practice_id = p_practice_id
    FOR UPDATE;

    IF v_payment.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Payment not found.';
    END IF;

    IF v_payment.status <> 'confirmed' THEN
        RAISE EXCEPTION 'Validation failure: Cannot convert non-confirmed payment.';
    END IF;

    -- Calculate total already allocated to invoices
    SELECT COALESCE(SUM(amount), 0.00) INTO v_allocated_total
    FROM public.payment_allocations
    WHERE payment_id = v_payment.id AND practice_id = p_practice_id;

    -- Calculate total already converted to wallet
    SELECT COALESCE(SUM(amount), 0.00) INTO v_converted_total
    FROM public.patient_wallet_ledger
    WHERE source_payment_id = v_payment.id 
      AND entry_type = 'overpayment_conversion' 
      AND practice_id = p_practice_id;

    v_available_excess := v_payment.amount - (v_allocated_total + v_converted_total);

    IF p_amount > v_available_excess THEN
        RAISE EXCEPTION 'Validation failure: Requested conversion amount (%) exceeds available payment surplus (%).', p_amount, v_available_excess;
    END IF;

    -- Get or create wallet and lock
    SELECT * INTO v_wallet
    FROM public.patient_wallets
    WHERE practice_id = p_practice_id AND patient_id = v_payment.patient_id AND currency = v_payment.currency
    FOR UPDATE;

    IF v_wallet.id IS NULL THEN
        SELECT * INTO v_wallet
        FROM jsonb_to_record(public.get_or_create_patient_wallet(p_practice_id, v_payment.patient_id, v_payment.currency))
        AS x(id UUID, wallet_number VARCHAR(32), patient_id UUID, currency VARCHAR(3), status public.wallet_status, balance NUMERIC(12, 2), created_at TIMESTAMPTZ);
    END IF;

    IF v_wallet.status <> 'active' THEN
        RAISE EXCEPTION 'Validation failure: Patient wallet is in % status.', v_wallet.status;
    END IF;

    -- Append to Ledger
    INSERT INTO public.patient_wallet_ledger (
        practice_id,
        wallet_id,
        patient_id,
        entry_type,
        amount,
        currency,
        source_payment_id,
        idempotency_key,
        notes,
        created_by
    ) VALUES (
        p_practice_id,
        v_wallet.id,
        v_payment.patient_id,
        'overpayment_conversion',
        p_amount,
        v_payment.currency,
        v_payment.id,
        p_idempotency_key,
        COALESCE(p_notes, 'Converted surplus from payment ' || v_payment.payment_number),
        v_caller_id
    ) RETURNING id INTO v_ledger_id;

    -- Compute balance
    SELECT COALESCE(SUM(amount), 0.00) INTO v_new_balance
    FROM public.patient_wallet_ledger
    WHERE wallet_id = v_wallet.id;

    PERFORM public.log_audit_event(
        p_practice_id,
        'wallet.overpayment_converted',
        'patient_wallet_ledger',
        v_ledger_id,
        jsonb_build_object(
            'wallet_number', v_wallet.wallet_number,
            'payment_id', v_payment.id,
            'payment_number', v_payment.payment_number,
            'converted_amount', p_amount,
            'new_balance', v_new_balance
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'wallet_id', v_wallet.id,
        'wallet_number', v_wallet.wallet_number,
        'ledger_id', v_ledger_id,
        'converted_amount', p_amount,
        'balance', v_new_balance
    );
END;
$$;

REVOKE ALL ON FUNCTION public.convert_overpayment_to_wallet(UUID, UUID, NUMERIC, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_overpayment_to_wallet(UUID, UUID, NUMERIC, VARCHAR, TEXT) TO authenticated;

-- 8D. RPC: SETTLE INVOICE FROM WALLET (ATOMIC ALLOCATION & LEDGER DEBIT)
CREATE OR REPLACE FUNCTION public.settle_invoice_from_wallet(
    p_practice_id UUID,
    p_wallet_id UUID,
    p_invoice_id UUID,
    p_amount NUMERIC(12, 2),
    p_idempotency_key VARCHAR(64) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_wallet RECORD;
    v_invoice RECORD;
    v_current_balance NUMERIC(12, 2);
    v_new_balance NUMERIC(12, 2);
    v_ledger_id UUID;
    v_settlement_payment_id UUID;
    v_payment_number VARCHAR(32);
    v_receipt_number VARCHAR(32);
    v_new_invoice_status public.invoice_status;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to settle invoice from wallet.';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0.00 THEN
        RAISE EXCEPTION 'Validation failure: Settlement amount must be strictly greater than 0.00.';
    END IF;

    -- 1. Lock Wallet FOR UPDATE
    SELECT * INTO v_wallet
    FROM public.patient_wallets
    WHERE id = p_wallet_id AND practice_id = p_practice_id
    FOR UPDATE;

    IF v_wallet.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Patient wallet not found.';
    END IF;

    IF v_wallet.status <> 'active' THEN
        RAISE EXCEPTION 'Validation failure: Cannot settle from % wallet account.', v_wallet.status;
    END IF;

    -- 2. Lock Invoice FOR UPDATE
    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = p_invoice_id AND practice_id = p_practice_id
    FOR UPDATE;

    IF v_invoice.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Invoice not found.';
    END IF;

    IF v_invoice.patient_id <> v_wallet.patient_id THEN
        RAISE EXCEPTION 'Cross-patient settlement prohibited: Invoice patient does not match wallet owner.';
    END IF;

    IF v_invoice.currency <> v_wallet.currency THEN
        RAISE EXCEPTION 'Cross-currency settlement prohibited: Invoice currency (%) does not match wallet currency (%).', v_invoice.currency, v_wallet.currency;
    END IF;

    IF v_invoice.status NOT IN ('issued', 'partially_paid') THEN
        RAISE EXCEPTION 'Validation failure: Invoice is in % status. Only issued or partially_paid invoices can be settled.', v_invoice.status;
    END IF;

    IF p_amount > v_invoice.balance_due THEN
        RAISE EXCEPTION 'Validation failure: Settlement amount (%) exceeds invoice balance due (%).', p_amount, v_invoice.balance_due;
    END IF;

    -- 3. Calculate and Verify Wallet Balance
    SELECT COALESCE(SUM(amount), 0.00) INTO v_current_balance
    FROM public.patient_wallet_ledger
    WHERE wallet_id = v_wallet.id;

    IF p_amount > v_current_balance THEN
        RAISE EXCEPTION 'Validation failure: Insufficient wallet balance. Available: %, Requested: %.', v_current_balance, p_amount;
    END IF;

    -- 4. Create Authoritative Internal Payment Record (Payment Method = 'other' / Wallet tender)
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
    ) VALUES (
        p_practice_id,
        v_payment_number,
        v_wallet.patient_id,
        CURRENT_DATE,
        p_amount,
        v_wallet.currency,
        'other',
        'WALLET-' || v_wallet.wallet_number,
        gen_random_uuid(),
        'confirmed',
        COALESCE(p_notes, 'Wallet settlement for invoice ' || v_invoice.invoice_number),
        v_caller_id,
        now()
    ) RETURNING id INTO v_settlement_payment_id;

    -- 5. Create Payment Allocation
    INSERT INTO public.payment_allocations (
        practice_id,
        payment_id,
        invoice_id,
        patient_id,
        amount,
        allocated_at,
        allocated_by
    ) VALUES (
        p_practice_id,
        v_settlement_payment_id,
        v_invoice.id,
        v_wallet.patient_id,
        p_amount,
        now(),
        v_caller_id
    );

    -- 6. Issue Receipt
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
    ) VALUES (
        p_practice_id,
        v_receipt_number,
        v_settlement_payment_id,
        v_wallet.patient_id,
        CURRENT_DATE,
        p_amount,
        v_wallet.currency,
        'other',
        'WALLET-' || v_wallet.wallet_number,
        'issued',
        v_caller_id,
        now()
    );

    -- 7. Append Wallet Debit to Ledger
    INSERT INTO public.patient_wallet_ledger (
        practice_id,
        wallet_id,
        patient_id,
        entry_type,
        amount,
        currency,
        source_invoice_id,
        source_payment_id,
        idempotency_key,
        notes,
        created_by
    ) VALUES (
        p_practice_id,
        v_wallet.id,
        v_wallet.patient_id,
        'invoice_settlement',
        -p_amount,
        v_wallet.currency,
        v_invoice.id,
        v_settlement_payment_id,
        p_idempotency_key,
        COALESCE(p_notes, 'Settlement for invoice ' || v_invoice.invoice_number),
        v_caller_id
    ) RETURNING id INTO v_ledger_id;

    -- 8. Update Invoice Balance Due and Status
    IF (v_invoice.amount_paid + p_amount) >= v_invoice.grand_total THEN
        v_new_invoice_status := 'paid'::public.invoice_status;
    ELSE
        v_new_invoice_status := 'partially_paid'::public.invoice_status;
    END IF;

    UPDATE public.invoices
    SET
        amount_paid = amount_paid + p_amount,
        balance_due = grand_total - (amount_paid + p_amount),
        status = v_new_invoice_status,
        updated_at = now()
    WHERE id = v_invoice.id;

    -- 9. Calculate New Wallet Balance
    SELECT COALESCE(SUM(amount), 0.00) INTO v_new_balance
    FROM public.patient_wallet_ledger
    WHERE wallet_id = v_wallet.id;

    -- Guarantee Non-Negative Invariant
    IF v_new_balance < 0.00 THEN
        RAISE EXCEPTION 'CRITICAL INVARIANT VIOLATION: Wallet balance resulted in negative amount (%). Rolling back.', v_new_balance;
    END IF;

    PERFORM public.log_audit_event(
        p_practice_id,
        'wallet.invoice_settled',
        'patient_wallet_ledger',
        v_ledger_id,
        jsonb_build_object(
            'wallet_number', v_wallet.wallet_number,
            'invoice_id', v_invoice.id,
            'invoice_number', v_invoice.invoice_number,
            'amount_debited', p_amount,
            'new_balance', v_new_balance,
            'invoice_status', v_new_invoice_status
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'wallet_id', v_wallet.id,
        'wallet_number', v_wallet.wallet_number,
        'ledger_id', v_ledger_id,
        'invoice_id', v_invoice.id,
        'invoice_number', v_invoice.invoice_number,
        'payment_id', v_settlement_payment_id,
        'amount_settled', p_amount,
        'wallet_balance', v_new_balance,
        'invoice_status', v_new_invoice_status,
        'invoice_balance_due', v_invoice.grand_total - (v_invoice.amount_paid + p_amount)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.settle_invoice_from_wallet(UUID, UUID, UUID, NUMERIC, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_invoice_from_wallet(UUID, UUID, UUID, NUMERIC, VARCHAR, TEXT) TO authenticated;

-- 8E. RPC: MANUAL WALLET ADJUSTMENT (DISCRETIONARY CREDIT / DEBIT)
CREATE OR REPLACE FUNCTION public.adjust_wallet_balance(
    p_practice_id UUID,
    p_wallet_id UUID,
    p_amount NUMERIC(12, 2),
    p_reason TEXT,
    p_idempotency_key VARCHAR(64) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_wallet RECORD;
    v_current_balance NUMERIC(12, 2);
    v_new_balance NUMERIC(12, 2);
    v_entry_type public.wallet_ledger_entry_type;
    v_ledger_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    -- Strictly restricted to practice_owner and practice_manager
    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager']) THEN
        RAISE EXCEPTION 'Operation not permitted: Only practice owners or managers may perform manual wallet adjustments.';
    END IF;

    IF p_amount IS NULL OR p_amount = 0.00 THEN
        RAISE EXCEPTION 'Validation failure: Adjustment amount must be non-zero.';
    END IF;

    IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
        RAISE EXCEPTION 'Validation failure: Adjustment requires a detailed justification reason of at least 10 characters.';
    END IF;

    -- Lock wallet FOR UPDATE
    SELECT * INTO v_wallet
    FROM public.patient_wallets
    WHERE id = p_wallet_id AND practice_id = p_practice_id
    FOR UPDATE;

    IF v_wallet.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Patient wallet not found.';
    END IF;

    IF v_wallet.status <> 'active' THEN
        RAISE EXCEPTION 'Validation failure: Cannot adjust wallet in % status.', v_wallet.status;
    END IF;

    SELECT COALESCE(SUM(amount), 0.00) INTO v_current_balance
    FROM public.patient_wallet_ledger
    WHERE wallet_id = v_wallet.id;

    IF p_amount > 0.00 THEN
        v_entry_type := 'adjustment_credit';
    ELSE
        v_entry_type := 'adjustment_debit';
        IF (v_current_balance + p_amount) < 0.00 THEN
            RAISE EXCEPTION 'Validation failure: Adjustment would drive wallet balance negative (current: %, adjustment: %).', v_current_balance, p_amount;
        END IF;
    END IF;

    -- Append to ledger
    INSERT INTO public.patient_wallet_ledger (
        practice_id,
        wallet_id,
        patient_id,
        entry_type,
        amount,
        currency,
        idempotency_key,
        notes,
        created_by
    ) VALUES (
        p_practice_id,
        v_wallet.id,
        v_wallet.patient_id,
        v_entry_type,
        p_amount,
        v_wallet.currency,
        p_idempotency_key,
        p_reason,
        v_caller_id
    ) RETURNING id INTO v_ledger_id;

    SELECT COALESCE(SUM(amount), 0.00) INTO v_new_balance
    FROM public.patient_wallet_ledger
    WHERE wallet_id = v_wallet.id;

    PERFORM public.log_audit_event(
        p_practice_id,
        'wallet.adjusted',
        'patient_wallet_ledger',
        v_ledger_id,
        jsonb_build_object(
            'wallet_number', v_wallet.wallet_number,
            'entry_type', v_entry_type,
            'amount', p_amount,
            'reason', p_reason,
            'new_balance', v_new_balance,
            'adjusted_by', v_caller_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'wallet_id', v_wallet.id,
        'wallet_number', v_wallet.wallet_number,
        'ledger_id', v_ledger_id,
        'entry_type', v_entry_type,
        'amount', p_amount,
        'new_balance', v_new_balance
    );
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_wallet_balance(UUID, UUID, NUMERIC, TEXT, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_wallet_balance(UUID, UUID, NUMERIC, TEXT, VARCHAR) TO authenticated;

-- 8F. RPC: UPDATE WALLET STATUS (SUSPEND / RESUME / CLOSE)
CREATE OR REPLACE FUNCTION public.update_wallet_status(
    p_practice_id UUID,
    p_wallet_id UUID,
    p_status public.wallet_status,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_wallet RECORD;
    v_audit_action TEXT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    -- Only Owners and Managers can change lifecycle status
    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager']) THEN
        RAISE EXCEPTION 'Operation not permitted: Only practice owners or managers may update wallet status.';
    END IF;

    IF p_status IN ('suspended', 'closed') AND (p_reason IS NULL OR length(trim(p_reason)) < 10) THEN
        RAISE EXCEPTION 'Validation failure: Suspending or closing a wallet requires a reason of at least 10 characters.';
    END IF;

    SELECT * INTO v_wallet
    FROM public.patient_wallets
    WHERE id = p_wallet_id AND practice_id = p_practice_id
    FOR UPDATE;

    IF v_wallet.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Patient wallet not found.';
    END IF;

    IF v_wallet.status = 'closed' THEN
        RAISE EXCEPTION 'Operation not permitted: Cannot update status of closed wallet.';
    END IF;

    IF p_status = 'closed' THEN
        UPDATE public.patient_wallets
        SET
            status = 'closed',
            closed_at = now(),
            closed_by = v_caller_id,
            closure_reason = p_reason,
            updated_at = now()
        WHERE id = v_wallet.id;
        v_audit_action := 'wallet.closed';
    ELSIF p_status = 'suspended' THEN
        UPDATE public.patient_wallets
        SET
            status = 'suspended',
            updated_at = now()
        WHERE id = v_wallet.id;
        v_audit_action := 'wallet.suspended';
    ELSIF p_status = 'active' THEN
        UPDATE public.patient_wallets
        SET
            status = 'active',
            updated_at = now()
        WHERE id = v_wallet.id;
        v_audit_action := 'wallet.resumed';
    END IF;

    PERFORM public.log_audit_event(
        p_practice_id,
        v_audit_action,
        'patient_wallets',
        v_wallet.id,
        jsonb_build_object(
            'wallet_number', v_wallet.wallet_number,
            'old_status', v_wallet.status,
            'new_status', p_status,
            'reason', p_reason,
            'updated_by', v_caller_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'wallet_id', v_wallet.id,
        'status', p_status
    );
END;
$$;

REVOKE ALL ON FUNCTION public.update_wallet_status(UUID, UUID, public.wallet_status, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_wallet_status(UUID, UUID, public.wallet_status, TEXT) TO authenticated;

-- 9. ROW-LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.practice_wallet_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_wallet_ledger ENABLE ROW LEVEL SECURITY;

-- 9A. practice_wallet_counters RLS
CREATE POLICY "Practice members view wallet counters"
    ON public.practice_wallet_counters FOR SELECT
    USING (practice_id = public.current_practice_id());

CREATE POLICY "Administrative staff update wallet counters"
    ON public.practice_wallet_counters FOR ALL
    USING (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    )
    WITH CHECK (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    );

-- 9B. patient_wallets RLS
CREATE POLICY "Practice members view patient wallets"
    ON public.patient_wallets FOR SELECT
    USING (practice_id = public.current_practice_id());

CREATE POLICY "Administrative staff insert patient wallets"
    ON public.patient_wallets FOR INSERT
    WITH CHECK (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    );

CREATE POLICY "Owners and managers update patient wallets"
    ON public.patient_wallets FOR UPDATE
    USING (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    )
    WITH CHECK (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    );

-- Note: No DELETE policy exists for patient_wallets (hard-delete trigger prevents deletion).

-- 9C. patient_wallet_ledger RLS
CREATE POLICY "Practice members view wallet ledger"
    ON public.patient_wallet_ledger FOR SELECT
    USING (practice_id = public.current_practice_id());

CREATE POLICY "Administrative staff insert wallet ledger entries"
    ON public.patient_wallet_ledger FOR INSERT
    WITH CHECK (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    );

-- Note: No UPDATE or DELETE policies exist for patient_wallet_ledger (append-only enforcement).
