-- ==============================================================================
-- PHYSENRA PATIENT WALLETS V1 — FINANCIAL INVARIANTS & REVERSAL HARDENING
-- Migration: 20260929011000_harden_wallet_financial_invariants.sql
--
-- Objective:
-- 1. Support dual log_audit_event signature overloads (with and without explicit practice_id).
-- 2. Harden public.void_payment() with comprehensive wallet reversal semantics:
--    a. Blocks voiding deposit / overpayment conversion if wallet funds were already consumed.
--    b. Appends immutable 'payment_void_reversal' (-amount) when deposit payment is voided.
--    c. Appends immutable 'reversal_credit' (+amount) when invoice settlement payment is voided.
-- 3. Establish automatic wallet restoration on invoice voiding:
--    - When an invoice with wallet settlements is voided, appends immutable 'reversal_credit' (+amount)
--      and marks the internal settlement payment and receipt voided.
-- ==============================================================================

-- 1. OVERLOAD log_audit_event TO SUPPORT EXPLICIT practice_id
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_practice_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID DEFAULT NULL::UUID,
    p_metadata JSONB DEFAULT '{}'::JSONB,
    p_source TEXT DEFAULT 'web'::TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
    v_audit_id UUID;
    v_headers JSONB;
    v_ip INET;
    v_user_agent TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to record audit event'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF p_action IS NULL OR TRIM(p_action) = '' THEN
        RAISE EXCEPTION 'Audit action parameter cannot be empty'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF p_entity_type IS NULL OR TRIM(p_entity_type) = '' THEN
        RAISE EXCEPTION 'Audit entity_type parameter cannot be empty'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Actor role is derived from active membership in the specified practice context
    IF p_practice_id IS NOT NULL THEN
        SELECT role INTO v_role
        FROM public.practice_memberships
        WHERE practice_id = p_practice_id
          AND user_id = v_user_id
          AND status = 'active'
        ORDER BY 
            CASE role
                WHEN 'practice_owner' THEN 1
                WHEN 'practice_manager' THEN 2
                WHEN 'physiotherapist' THEN 3
                WHEN 'receptionist' THEN 4
                WHEN 'accountant' THEN 5
                WHEN 'patient' THEN 6
                ELSE 7
            END
        LIMIT 1;
    ELSIF public.is_platform_admin() THEN
        v_role := 'platform_admin';
    ELSE
        v_role := NULL;
    END IF;

    -- Extract network metadata safely if available
    BEGIN
        v_headers := current_setting('request.headers', true)::JSONB;
        IF v_headers IS NOT NULL THEN
            v_user_agent := v_headers ->> 'user-agent';
            BEGIN
                v_ip := (split_part(v_headers ->> 'x-forwarded-for', ',', 1))::INET;
            EXCEPTION WHEN OTHERS THEN
                v_ip := NULL;
            END;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_headers := NULL;
        v_ip := NULL;
        v_user_agent := NULL;
    END;

    INSERT INTO public.audit_events (
        practice_id,
        actor_user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata,
        source,
        ip_address,
        user_agent,
        created_at
    )
    VALUES (
        p_practice_id,
        v_user_id,
        v_role,
        TRIM(p_action),
        TRIM(p_entity_type),
        p_entity_id,
        COALESCE(p_metadata, '{}'::JSONB),
        COALESCE(p_source, 'web'),
        v_ip,
        v_user_agent,
        now()
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_event(UUID, TEXT, TEXT, UUID, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit_event(UUID, TEXT, TEXT, UUID, JSONB, TEXT) TO authenticated;

-- 2. HARDEN void_payment WITH WALLET REVERSAL & INVARIANT PROTECTION
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
    v_wallet_dep RECORD;
    v_wallet_settle RECORD;
    v_current_wallet_balance NUMERIC(12, 2);
    v_ledger_id UUID;
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
    SELECT id, payment_number, status, amount, patient_id, currency, payment_method, reference_number INTO v_payment_record
    FROM public.payments
    WHERE id = p_payment_id AND practice_id = p_practice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Validation failure: Payment % not found.', p_payment_id;
    END IF;

    IF v_payment_record.status = 'voided' THEN
        RAISE EXCEPTION 'Operation not permitted: Payment % is already voided.', v_payment_record.payment_number;
    END IF;

    -- 5. WALLET INVARIANT AUDIT: If payment originally created wallet credit (deposit or overpayment conversion)
    FOR v_wallet_dep IN
        SELECT wallet_id, patient_id, currency, SUM(amount) AS credited_amount
        FROM public.patient_wallet_ledger
        WHERE source_payment_id = p_payment_id 
          AND practice_id = p_practice_id
          AND entry_type IN ('deposit', 'overpayment_conversion')
        GROUP BY wallet_id, patient_id, currency
    LOOP
        -- Lock wallet row
        PERFORM 1 FROM public.patient_wallets WHERE id = v_wallet_dep.wallet_id FOR UPDATE;

        -- Calculate current wallet balance
        SELECT COALESCE(SUM(amount), 0.00) INTO v_current_wallet_balance
        FROM public.patient_wallet_ledger
        WHERE wallet_id = v_wallet_dep.wallet_id;

        -- If wallet funds were already consumed, BLOCK voiding with explicit message
        IF v_current_wallet_balance < v_wallet_dep.credited_amount THEN
            RAISE EXCEPTION 'Operation not permitted: Cannot void payment %. Wallet credit of % has already been partially or fully consumed (current wallet balance is %). Administrative intervention required.', v_payment_record.payment_number, v_wallet_dep.credited_amount, v_current_wallet_balance;
        END IF;

        -- Funds are intact: append immutable payment_void_reversal entry to ledger
        INSERT INTO public.patient_wallet_ledger (
            practice_id,
            wallet_id,
            patient_id,
            entry_type,
            amount,
            currency,
            source_payment_id,
            notes,
            created_by
        ) VALUES (
            p_practice_id,
            v_wallet_dep.wallet_id,
            v_wallet_dep.patient_id,
            'payment_void_reversal',
            -v_wallet_dep.credited_amount,
            v_wallet_dep.currency,
            p_payment_id,
            'Reversal of voided deposit payment ' || v_payment_record.payment_number || ': ' || p_void_reason,
            v_actor_id
        ) RETURNING id INTO v_ledger_id;

        PERFORM public.log_audit_event(
            p_practice_id,
            'wallet.payment_void_reversed',
            'patient_wallet_ledger',
            v_ledger_id,
            jsonb_build_object(
                'wallet_id', v_wallet_dep.wallet_id,
                'payment_id', p_payment_id,
                'payment_number', v_payment_record.payment_number,
                'amount_reversed', v_wallet_dep.credited_amount,
                'reason', p_void_reason
            )
        );
    END LOOP;

    -- 6. WALLET INVARIANT AUDIT: If payment was an internal wallet settlement tender
    FOR v_wallet_settle IN
        SELECT wallet_id, patient_id, currency, ABS(amount) AS settle_amount, source_invoice_id
        FROM public.patient_wallet_ledger
        WHERE source_payment_id = p_payment_id
          AND practice_id = p_practice_id
          AND entry_type = 'invoice_settlement'
    LOOP
        -- Lock wallet row
        PERFORM 1 FROM public.patient_wallets WHERE id = v_wallet_settle.wallet_id FOR UPDATE;

        -- Check if already restored
        IF NOT EXISTS (
            SELECT 1 FROM public.patient_wallet_ledger
            WHERE source_payment_id = p_payment_id
              AND entry_type = 'reversal_credit'
        ) THEN
            INSERT INTO public.patient_wallet_ledger (
                practice_id,
                wallet_id,
                patient_id,
                entry_type,
                amount,
                currency,
                source_payment_id,
                source_invoice_id,
                notes,
                created_by
            ) VALUES (
                p_practice_id,
                v_wallet_settle.wallet_id,
                v_wallet_settle.patient_id,
                'reversal_credit',
                v_wallet_settle.settle_amount,
                v_wallet_settle.currency,
                p_payment_id,
                v_wallet_settle.source_invoice_id,
                'Restoration of wallet funds from voided settlement payment ' || v_payment_record.payment_number || ': ' || p_void_reason,
                v_actor_id
            ) RETURNING id INTO v_ledger_id;

            PERFORM public.log_audit_event(
                p_practice_id,
                'wallet.restoration_credited',
                'patient_wallet_ledger',
                v_ledger_id,
                jsonb_build_object(
                    'wallet_id', v_wallet_settle.wallet_id,
                    'invoice_id', v_wallet_settle.source_invoice_id,
                    'amount_restored', v_wallet_settle.settle_amount,
                    'reason', p_void_reason
                )
            );
        END IF;
    END LOOP;

    -- 7. Lock and reverse each allocation
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

    -- 8. Update Payment status to voided
    UPDATE public.payments
    SET
        status = 'voided',
        voided_at = now(),
        voided_by = v_actor_id,
        void_reason = p_void_reason,
        updated_at = now()
    WHERE id = p_payment_id;

    -- 9. Update linked Receipt status to voided
    UPDATE public.receipts
    SET
        status = 'voided',
        voided_at = now(),
        voided_by = v_actor_id,
        void_reason = p_void_reason
    WHERE payment_id = p_payment_id
    RETURNING id INTO v_receipt_id;

    -- 10. Log Audit Events
    PERFORM public.log_audit_event(
        p_practice_id,
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
            p_practice_id,
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

-- 3. AUTOMATIC WALLET RESTORATION TRIGGER ON INVOICE VOIDING
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_wallet_restoration_on_invoice_void()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wallet_inv RECORD;
    v_already_restored NUMERIC(12, 2);
    v_to_restore NUMERIC(12, 2);
    v_ledger_id UUID;
BEGIN
    -- Only execute when transitioning to 'void'
    IF NEW.status <> 'void' OR OLD.status = 'void' THEN
        RETURN NEW;
    END IF;

    -- Find all wallet settlements for this invoice
    FOR v_wallet_inv IN
        SELECT wallet_id, patient_id, currency, source_payment_id, SUM(ABS(amount)) AS total_settled
        FROM public.patient_wallet_ledger
        WHERE source_invoice_id = NEW.id
          AND practice_id = NEW.practice_id
          AND entry_type = 'invoice_settlement'
        GROUP BY wallet_id, patient_id, currency, source_payment_id
    LOOP
        -- Check total already restored for this invoice
        SELECT COALESCE(SUM(amount), 0.00) INTO v_already_restored
        FROM public.patient_wallet_ledger
        WHERE source_invoice_id = NEW.id
          AND wallet_id = v_wallet_inv.wallet_id
          AND entry_type = 'reversal_credit';

        v_to_restore := v_wallet_inv.total_settled - v_already_restored;

        IF v_to_restore > 0.00 THEN
            -- Lock wallet row
            PERFORM 1 FROM public.patient_wallets WHERE id = v_wallet_inv.wallet_id FOR UPDATE;

            -- Append new immutable reversal_credit row
            INSERT INTO public.patient_wallet_ledger (
                practice_id,
                wallet_id,
                patient_id,
                entry_type,
                amount,
                currency,
                source_invoice_id,
                source_payment_id,
                notes,
                created_by
            ) VALUES (
                NEW.practice_id,
                v_wallet_inv.wallet_id,
                v_wallet_inv.patient_id,
                'reversal_credit',
                v_to_restore,
                v_wallet_inv.currency,
                NEW.id,
                v_wallet_inv.source_payment_id,
                'Automatic wallet restoration for voided invoice ' || NEW.invoice_number || ': ' || COALESCE(NEW.void_reason, 'Invoice voided'),
                COALESCE(NEW.voided_by, auth.uid())
            ) RETURNING id INTO v_ledger_id;

            -- Mark the internal settlement payment as voided if not already voided
            IF v_wallet_inv.source_payment_id IS NOT NULL THEN
                UPDATE public.payments
                SET status = 'voided',
                    voided_at = now(),
                    voided_by = COALESCE(NEW.voided_by, auth.uid()),
                    void_reason = 'Associated invoice ' || NEW.invoice_number || ' voided',
                    updated_at = now()
                WHERE id = v_wallet_inv.source_payment_id AND status <> 'voided';

                UPDATE public.receipts
                SET status = 'voided',
                    voided_at = now(),
                    voided_by = COALESCE(NEW.voided_by, auth.uid()),
                    void_reason = 'Associated invoice ' || NEW.invoice_number || ' voided'
                WHERE payment_id = v_wallet_inv.source_payment_id AND status <> 'voided';
            END IF;

            PERFORM public.log_audit_event(
                NEW.practice_id,
                'wallet.restoration_credited',
                'patient_wallet_ledger',
                v_ledger_id,
                jsonb_build_object(
                    'wallet_id', v_wallet_inv.wallet_id,
                    'invoice_id', NEW.id,
                    'invoice_number', NEW.invoice_number,
                    'amount_restored', v_to_restore,
                    'reason', NEW.void_reason
                )
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_wallet_restoration_on_invoice_void ON public.invoices;
CREATE TRIGGER trg_sync_wallet_restoration_on_invoice_void
AFTER UPDATE OF status ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.sync_wallet_restoration_on_invoice_void();
