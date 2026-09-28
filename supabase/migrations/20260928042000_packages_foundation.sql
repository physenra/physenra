-- ==============================================================================
-- PHYSENRA PACKAGES FOUNDATION V1 MIGRATION
-- Migration: 20260928042000_packages_foundation.sql
--
-- Features:
-- 1. Package Status Enum ('pending_payment', 'active', 'completed', 'expired', 'cancelled', 'suspended', 'void')
-- 2. Practice Package Counter & Atomic Sequential Generator (PKG-000001)
-- 3. Package Definitions (Catalog Templates for multi-session offerings)
-- 4. Package Entitlements (Patient-specific operational quotas linked to Invoices)
-- 5. Package Consumption Ledger (Immutable append-only ledger linked to Completed Clinical Visits)
-- 6. RPC: purchase_package (Authoritative commercial invoice & pending entitlement generation)
-- 7. RPC: activate_package (Atomic verification of invoice payment & entitlement activation)
-- 8. RPC: consume_package_session (Pessimistic row locking, visit validation & append-only decrement)
-- 9. RPC: extend_package_validity (Audited expiration extension by authorized roles)
-- 10. RPC: cancel_package (Administrative forfeiture of remaining sessions with reason)
-- 11. Trigger: trg_sync_package_entitlement_on_invoice_change (Payment void / settlement synchronization)
-- 12. Immutability & Hard-Delete Prevention Triggers
-- 13. Multi-Tenant Composite Foreign Keys for PostgREST Disambiguation
-- 14. Row-Level Security (RLS) & Role-Based Access Control (RBAC) Policies
-- ==============================================================================

-- 1. ENUMS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'package_status') THEN
        CREATE TYPE public.package_status AS ENUM (
            'pending_payment',
            'active',
            'completed',
            'expired',
            'cancelled',
            'suspended',
            'void'
        );
    END IF;
END;
$$;

-- 2. PRACTICE PACKAGE COUNTERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_package_counters (
    practice_id UUID PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_practice_package_counters_last_number CHECK (last_number >= 0)
);

-- 3. SEQUENTIAL IDENTIFIER GENERATOR (PKG-000001)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_next_package_number(p_practice_id UUID)
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

    -- Only administrative and billing roles can generate package numbers (physiotherapists are restricted)
    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to generate package number. Physiotherapists have view-only access.';
    END IF;

    INSERT INTO public.practice_package_counters (practice_id, last_number, updated_at)
    VALUES (p_practice_id, 1, now())
    ON CONFLICT (practice_id) DO UPDATE
        SET last_number = public.practice_package_counters.last_number + 1,
            updated_at = now()
    RETURNING last_number INTO v_next_val;

    RETURN 'PKG-' || LPAD(v_next_val::TEXT, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_next_package_number(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_package_number(UUID) TO authenticated;

-- 4. PACKAGE DEFINITIONS TABLE (REUSABLE CATALOG OFFERINGS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.package_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    service_id UUID NOT NULL,
    total_sessions INTEGER NOT NULL,
    validity_days INTEGER NOT NULL,
    package_price NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    updated_by UUID NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_package_definitions_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_package_definitions_code UNIQUE (practice_id, code),
    CONSTRAINT chk_package_definitions_total_sessions CHECK (total_sessions > 0),
    CONSTRAINT chk_package_definitions_validity_days CHECK (validity_days > 0),
    CONSTRAINT chk_package_definitions_price CHECK (package_price > 0.00),
    CONSTRAINT chk_package_definitions_currency CHECK (currency ~ '^[A-Z]{3}$'),

    -- Multi-tenant Composite Foreign Keys
    CONSTRAINT fk_package_definitions_service_practice FOREIGN KEY (service_id, practice_id)
        REFERENCES public.services(id, practice_id) ON DELETE RESTRICT
);

-- 5. PACKAGE ENTITLEMENTS TABLE (PATIENT-SPECIFIC QUOTA)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.package_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    package_number VARCHAR(32) NOT NULL,
    patient_id UUID NOT NULL,
    package_definition_id UUID NOT NULL,
    invoice_id UUID NOT NULL,
    total_sessions INTEGER NOT NULL,
    validity_days INTEGER NOT NULL,
    status public.package_status NOT NULL DEFAULT 'pending_payment',
    activated_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ NULL,
    cancelled_at TIMESTAMPTZ NULL,
    cancelled_by UUID REFERENCES public.profiles(id),
    cancellation_reason TEXT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_package_entitlements_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_package_entitlements_practice_number UNIQUE (practice_id, package_number),
    CONSTRAINT uq_package_entitlements_invoice UNIQUE (invoice_id),
    CONSTRAINT chk_package_entitlements_total_sessions CHECK (total_sessions > 0),
    CONSTRAINT chk_package_entitlements_validity_days CHECK (validity_days > 0),
    CONSTRAINT chk_package_entitlements_cancellation CHECK (
        status <> 'cancelled' OR (
            cancelled_at IS NOT NULL AND 
            cancelled_by IS NOT NULL AND 
            cancellation_reason IS NOT NULL AND 
            length(trim(cancellation_reason)) >= 5
        )
    ),
    CONSTRAINT chk_package_entitlements_activation CHECK (
        status NOT IN ('active', 'completed') OR (
            activated_at IS NOT NULL AND 
            expires_at IS NOT NULL
        )
    ),

    -- Multi-tenant Composite Foreign Keys
    CONSTRAINT fk_entitlements_patient_practice FOREIGN KEY (patient_id, practice_id)
        REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_entitlements_definition_practice FOREIGN KEY (package_definition_id, practice_id)
        REFERENCES public.package_definitions(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_entitlements_invoice_practice FOREIGN KEY (invoice_id, practice_id)
        REFERENCES public.invoices(id, practice_id) ON DELETE RESTRICT
);

-- 6. PACKAGE CONSUMPTION LEDGER (APPEND-ONLY CLINICAL VISIT DECREMENTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.package_consumption_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    entitlement_id UUID NOT NULL,
    clinical_visit_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    consumed_by UUID NOT NULL REFERENCES public.profiles(id),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Invariants: One clinical visit consumes at most one session from an entitlement
    CONSTRAINT uq_consumption_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_consumption_entitlement_visit UNIQUE (entitlement_id, clinical_visit_id),

    -- Multi-tenant Composite Foreign Keys
    CONSTRAINT fk_consumption_entitlement_practice FOREIGN KEY (entitlement_id, practice_id)
        REFERENCES public.package_entitlements(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_consumption_patient_practice FOREIGN KEY (patient_id, practice_id)
        REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_consumption_visit_patient_practice FOREIGN KEY (clinical_visit_id, patient_id, practice_id)
        REFERENCES public.clinical_visits(id, patient_id, practice_id) ON DELETE RESTRICT
);

-- 7. INDEXES FOR PERFORMANCE & LOOKUPS
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_package_definitions_practice ON public.package_definitions(practice_id);
CREATE INDEX IF NOT EXISTS idx_package_definitions_service ON public.package_definitions(practice_id, service_id);
CREATE INDEX IF NOT EXISTS idx_package_definitions_active ON public.package_definitions(practice_id, is_active);

CREATE INDEX IF NOT EXISTS idx_package_entitlements_practice ON public.package_entitlements(practice_id);
CREATE INDEX IF NOT EXISTS idx_package_entitlements_patient ON public.package_entitlements(practice_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_package_entitlements_status ON public.package_entitlements(practice_id, status);
CREATE INDEX IF NOT EXISTS idx_package_entitlements_invoice ON public.package_entitlements(practice_id, invoice_id);

CREATE INDEX IF NOT EXISTS idx_package_consumption_practice ON public.package_consumption_ledger(practice_id);
CREATE INDEX IF NOT EXISTS idx_package_consumption_entitlement ON public.package_consumption_ledger(practice_id, entitlement_id);
CREATE INDEX IF NOT EXISTS idx_package_consumption_visit ON public.package_consumption_ledger(practice_id, clinical_visit_id);
CREATE INDEX IF NOT EXISTS idx_package_consumption_patient ON public.package_consumption_ledger(practice_id, patient_id);

-- 8. IMMUTABILITY & PROTECTION TRIGGERS
-- ------------------------------------------------------------------------------

-- 8A. Prevent hard delete of package definitions, entitlements, and consumption ledger
CREATE OR REPLACE FUNCTION public.prevent_package_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Operation not permitted: Hard deletion of package entities is strictly prohibited.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_delete_package_definitions ON public.package_definitions;
CREATE TRIGGER trg_prevent_delete_package_definitions
BEFORE DELETE ON public.package_definitions
FOR EACH ROW EXECUTE FUNCTION public.prevent_package_hard_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_package_entitlements ON public.package_entitlements;
CREATE TRIGGER trg_prevent_delete_package_entitlements
BEFORE DELETE ON public.package_entitlements
FOR EACH ROW EXECUTE FUNCTION public.prevent_package_hard_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_package_consumption ON public.package_consumption_ledger;
CREATE TRIGGER trg_prevent_delete_package_consumption
BEFORE DELETE ON public.package_consumption_ledger
FOR EACH ROW EXECUTE FUNCTION public.prevent_package_hard_delete();

-- 8B. Protect package consumption ledger from updates (append-only enforcement)
CREATE OR REPLACE FUNCTION public.protect_package_consumption_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Operation not permitted: package_consumption_ledger is strictly append-only. Updates are prohibited.';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_package_consumption ON public.package_consumption_ledger;
CREATE TRIGGER trg_protect_package_consumption
BEFORE UPDATE ON public.package_consumption_ledger
FOR EACH ROW EXECUTE FUNCTION public.protect_package_consumption_immutability();

-- 8C. Protect package entitlement core fields and lifecycle transitions
CREATE OR REPLACE FUNCTION public.protect_package_entitlement_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Core identity fields cannot be modified
    IF NEW.practice_id <> OLD.practice_id THEN
        RAISE EXCEPTION 'Operation not permitted: practice_id is immutable on package entitlements.';
    END IF;
    IF NEW.package_number <> OLD.package_number THEN
        RAISE EXCEPTION 'Operation not permitted: package_number is immutable on package entitlements.';
    END IF;
    IF NEW.patient_id <> OLD.patient_id THEN
        RAISE EXCEPTION 'Operation not permitted: patient_id is immutable on package entitlements.';
    END IF;
    IF NEW.package_definition_id <> OLD.package_definition_id THEN
        RAISE EXCEPTION 'Operation not permitted: package_definition_id is immutable on package entitlements.';
    END IF;
    IF NEW.invoice_id <> OLD.invoice_id THEN
        RAISE EXCEPTION 'Operation not permitted: invoice_id is immutable on package entitlements.';
    END IF;
    IF NEW.total_sessions <> OLD.total_sessions THEN
        RAISE EXCEPTION 'Operation not permitted: total_sessions is immutable on package entitlements.';
    END IF;
    IF NEW.validity_days <> OLD.validity_days THEN
        RAISE EXCEPTION 'Operation not permitted: validity_days is immutable on package entitlements.';
    END IF;

    -- Lifecycle state machine validation
    IF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
        RAISE EXCEPTION 'Operation not permitted: Completed package entitlements cannot be reopened or transitioned to %.', NEW.status;
    END IF;
    IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'Operation not permitted: Cancelled package entitlements cannot be transitioned to %.', NEW.status;
    END IF;
    IF OLD.status = 'void' AND NEW.status <> 'void' THEN
        RAISE EXCEPTION 'Operation not permitted: Void package entitlements cannot be transitioned to %.', NEW.status;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_package_entitlement ON public.package_entitlements;
CREATE TRIGGER trg_protect_package_entitlement
BEFORE UPDATE ON public.package_entitlements
FOR EACH ROW EXECUTE FUNCTION public.protect_package_entitlement_immutability();

-- 9. INVOICE PAYMENT / VOID SYNCHRONIZATION TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_package_entitlement_on_invoice_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_entitlement RECORD;
    v_consumed_count INTEGER;
BEGIN
    -- Check if there is an associated package entitlement
    SELECT * INTO v_entitlement
    FROM public.package_entitlements
    WHERE invoice_id = NEW.id;

    IF v_entitlement.id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Case 1: Invoice transitioned to PAID (Full Settlement)
    IF NEW.status = 'paid' AND NEW.balance_due = 0.00 THEN
        IF v_entitlement.status = 'pending_payment' THEN
            UPDATE public.package_entitlements
            SET status = 'active',
                activated_at = COALESCE(activated_at, now()),
                expires_at = COALESCE(expires_at, now() + (v_entitlement.validity_days || ' days')::INTERVAL),
                updated_at = now()
            WHERE id = v_entitlement.id;

            PERFORM public.log_audit_event(
                NEW.practice_id,
                'package.activated',
                'package_entitlements',
                v_entitlement.id,
                jsonb_build_object(
                    'package_number', v_entitlement.package_number,
                    'patient_id', v_entitlement.patient_id,
                    'invoice_id', NEW.id,
                    'invoice_number', NEW.invoice_number,
                    'reason', 'Invoice fully paid'
                )
            );
        ELSIF v_entitlement.status = 'suspended' THEN
            -- Check if expired or fully consumed
            SELECT count(*) INTO v_consumed_count
            FROM public.package_consumption_ledger
            WHERE entitlement_id = v_entitlement.id;

            IF v_consumed_count >= v_entitlement.total_sessions THEN
                UPDATE public.package_entitlements
                SET status = 'completed', updated_at = now()
                WHERE id = v_entitlement.id;
            ELSIF v_entitlement.expires_at IS NOT NULL AND now() > v_entitlement.expires_at THEN
                UPDATE public.package_entitlements
                SET status = 'expired', updated_at = now()
                WHERE id = v_entitlement.id;
            ELSE
                UPDATE public.package_entitlements
                SET status = 'active', updated_at = now()
                WHERE id = v_entitlement.id;

                PERFORM public.log_audit_event(
                    NEW.practice_id,
                    'package.resumed',
                    'package_entitlements',
                    v_entitlement.id,
                    jsonb_build_object(
                        'package_number', v_entitlement.package_number,
                        'patient_id', v_entitlement.patient_id,
                        'invoice_id', NEW.id,
                        'reason', 'Invoice re-settled'
                    )
                );
            END IF;
        END IF;

    -- Case 2: Invoice was paid, but is now reverted to partially_paid or issued (e.g. payment void)
    ELSIF OLD.status = 'paid' AND NEW.status IN ('partially_paid', 'issued') THEN
        IF v_entitlement.status = 'active' THEN
            UPDATE public.package_entitlements
            SET status = 'suspended',
                updated_at = now()
            WHERE id = v_entitlement.id;

            PERFORM public.log_audit_event(
                NEW.practice_id,
                'package.suspended',
                'package_entitlements',
                v_entitlement.id,
                jsonb_build_object(
                    'package_number', v_entitlement.package_number,
                    'patient_id', v_entitlement.patient_id,
                    'invoice_id', NEW.id,
                    'reason', 'Payment voided; invoice balance due reverted'
                )
            );
        END IF;

    -- Case 3: Invoice voided
    ELSIF NEW.status = 'void' THEN
        IF v_entitlement.status = 'pending_payment' THEN
            UPDATE public.package_entitlements
            SET status = 'void',
                updated_at = now()
            WHERE id = v_entitlement.id;

            PERFORM public.log_audit_event(
                NEW.practice_id,
                'package.voided',
                'package_entitlements',
                v_entitlement.id,
                jsonb_build_object(
                    'package_number', v_entitlement.package_number,
                    'invoice_id', NEW.id,
                    'reason', 'Invoice voided'
                )
            );
        ELSIF v_entitlement.status IN ('active', 'suspended') THEN
            UPDATE public.package_entitlements
            SET status = 'cancelled',
                cancelled_at = now(),
                cancelled_by = NEW.voided_by,
                cancellation_reason = 'Invoice was voided: ' || COALESCE(NEW.void_reason, 'No reason provided'),
                updated_at = now()
            WHERE id = v_entitlement.id;

            PERFORM public.log_audit_event(
                NEW.practice_id,
                'package.cancelled',
                'package_entitlements',
                v_entitlement.id,
                jsonb_build_object(
                    'package_number', v_entitlement.package_number,
                    'invoice_id', NEW.id,
                    'reason', 'Invoice voided'
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_package_entitlement_on_invoice ON public.invoices;
CREATE TRIGGER trg_sync_package_entitlement_on_invoice
AFTER UPDATE OF status, amount_paid, balance_due ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.sync_package_entitlement_on_invoice_change();

-- 10. RPC: PURCHASE PACKAGE (ATOMIC INVOICE & ENTITLEMENT CREATION)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purchase_package(
    p_practice_id UUID,
    p_patient_id UUID,
    p_package_definition_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_def RECORD;
    v_patient RECORD;
    v_service RECORD;
    v_package_number VARCHAR(32);
    v_invoice_number VARCHAR(32);
    v_invoice_id UUID;
    v_entitlement_id UUID;
    v_caller_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: Caller is not authenticated.';
    END IF;

    -- Validate caller authorization
    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to purchase packages. Physiotherapists have view-only billing access.';
    END IF;

    -- Validate patient
    SELECT * INTO v_patient
    FROM public.patients
    WHERE id = p_patient_id AND practice_id = p_practice_id;
    IF v_patient.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Patient not found or does not belong to target practice.';
    END IF;

    -- Validate package definition
    SELECT * INTO v_def
    FROM public.package_definitions
    WHERE id = p_package_definition_id AND practice_id = p_practice_id;
    IF v_def.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Package definition not found.';
    END IF;
    IF NOT v_def.is_active THEN
        RAISE EXCEPTION 'Validation failure: Package definition is inactive and cannot be purchased.';
    END IF;

    -- Retrieve service snapshot
    SELECT * INTO v_service
    FROM public.services
    WHERE id = v_def.service_id AND practice_id = p_practice_id;
    IF v_service.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Linked service not found.';
    END IF;

    -- Generate atomic identifiers
    v_package_number := public.generate_next_package_number(p_practice_id);
    v_invoice_number := public.generate_next_invoice_number(p_practice_id);

    -- 1. Create Authoritative Debtor Invoice in status 'issued'
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
        CURRENT_DATE,
        v_def.currency,
        'issued',
        v_def.package_price,
        0.00,
        0.00,
        v_def.package_price,
        0.00,
        v_def.package_price,
        COALESCE(p_notes, 'Package Purchase: ' || v_package_number || ' - ' || v_def.name),
        'Payment required to activate package sessions.',
        now(),
        v_caller_id,
        v_caller_id
    ) RETURNING id INTO v_invoice_id;

    -- 2. Create Itemized Invoice Line
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
        v_def.service_id,
        v_service.code,
        v_def.name || ' (' || v_def.total_sessions || ' Sessions)',
        'Package: ' || v_package_number || ' - ' || v_def.name,
        1.00,
        v_def.package_price,
        v_def.currency,
        false,
        0.00,
        0.00,
        0.00,
        v_def.package_price
    );

    -- 3. Create Pending Package Entitlement
    INSERT INTO public.package_entitlements (
        practice_id,
        package_number,
        patient_id,
        package_definition_id,
        invoice_id,
        total_sessions,
        validity_days,
        status,
        created_by
    ) VALUES (
        p_practice_id,
        v_package_number,
        p_patient_id,
        v_def.id,
        v_invoice_id,
        v_def.total_sessions,
        v_def.validity_days,
        'pending_payment',
        v_caller_id
    ) RETURNING id INTO v_entitlement_id;

    -- Audit log
    PERFORM public.log_audit_event(
        p_practice_id,
        'package.purchased',
        'package_entitlements',
        v_entitlement_id,
        jsonb_build_object(
            'package_number', v_package_number,
            'package_definition_id', v_def.id,
            'package_name', v_def.name,
            'patient_id', p_patient_id,
            'invoice_id', v_invoice_id,
            'invoice_number', v_invoice_number,
            'package_price', v_def.package_price,
            'currency', v_def.currency,
            'total_sessions', v_def.total_sessions,
            'validity_days', v_def.validity_days
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'package_id', v_entitlement_id,
        'package_number', v_package_number,
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number,
        'patient_id', p_patient_id,
        'total_sessions', v_def.total_sessions,
        'validity_days', v_def.validity_days,
        'package_price', v_def.package_price,
        'currency', v_def.currency,
        'status', 'pending_payment'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_package(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_package(UUID, UUID, UUID, TEXT) TO authenticated;

-- 11. RPC: ACTIVATE PACKAGE (EXPLICIT / MANUAL ACTIVATION CHECK)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_package(
    p_practice_id UUID,
    p_entitlement_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_entitlement RECORD;
    v_invoice RECORD;
    v_caller_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: Caller is not authenticated.';
    END IF;

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to activate package.';
    END IF;

    -- Lock entitlement row FOR UPDATE
    SELECT * INTO v_entitlement
    FROM public.package_entitlements
    WHERE id = p_entitlement_id AND practice_id = p_practice_id
    FOR UPDATE;

    IF v_entitlement.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Package entitlement not found.';
    END IF;

    IF v_entitlement.status = 'active' THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Package is already active.',
            'package_id', v_entitlement.id,
            'package_number', v_entitlement.package_number,
            'status', 'active',
            'expires_at', v_entitlement.expires_at
        );
    END IF;

    IF v_entitlement.status IN ('completed', 'expired', 'cancelled', 'void') THEN
        RAISE EXCEPTION 'Operation not permitted: Cannot activate package in terminal status %.', v_entitlement.status;
    END IF;

    -- Check linked invoice
    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = v_entitlement.invoice_id AND practice_id = p_practice_id;

    IF v_invoice.id IS NULL THEN
        RAISE EXCEPTION 'Integrity failure: Linked invoice not found.';
    END IF;

    IF v_invoice.status <> 'paid' OR v_invoice.balance_due <> 0.00 OR v_invoice.amount_paid <> v_invoice.grand_total THEN
        RAISE EXCEPTION 'Validation failure: Package invoice is not fully settled. Current invoice status: %, balance_due: %', v_invoice.status, v_invoice.balance_due;
    END IF;

    -- Activate entitlement
    UPDATE public.package_entitlements
    SET status = 'active',
        activated_at = COALESCE(activated_at, now()),
        expires_at = COALESCE(expires_at, now() + (v_entitlement.validity_days || ' days')::INTERVAL),
        updated_at = now()
    WHERE id = v_entitlement.id;

    PERFORM public.log_audit_event(
        p_practice_id,
        'package.activated',
        'package_entitlements',
        v_entitlement.id,
        jsonb_build_object(
            'package_number', v_entitlement.package_number,
            'patient_id', v_entitlement.patient_id,
            'invoice_id', v_invoice.id,
            'invoice_number', v_invoice.invoice_number,
            'activated_by', v_caller_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'package_id', v_entitlement.id,
        'package_number', v_entitlement.package_number,
        'status', 'active',
        'activated_at', now(),
        'expires_at', now() + (v_entitlement.validity_days || ' days')::INTERVAL
    );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_package(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_package(UUID, UUID) TO authenticated;

-- 12. RPC: CONSUME PACKAGE SESSION (APPEND-ONLY LEDGER INSERTION)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_package_session(
    p_practice_id UUID,
    p_entitlement_id UUID,
    p_clinical_visit_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_entitlement RECORD;
    v_visit RECORD;
    v_consumed_count INTEGER;
    v_remaining INTEGER;
    v_consumption_id UUID;
    v_caller_id UUID;
    v_new_status public.package_status;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: Caller is not authenticated.';
    END IF;

    -- Clinicians and administrative staff can record consumption upon visit completion
    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist', 'physiotherapist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to consume package session.';
    END IF;

    -- 1. Lock Entitlement FOR UPDATE to prevent concurrency races
    SELECT * INTO v_entitlement
    FROM public.package_entitlements
    WHERE id = p_entitlement_id AND practice_id = p_practice_id
    FOR UPDATE;

    IF v_entitlement.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Package entitlement not found.';
    END IF;

    -- 2. Validate Clinical Visit
    SELECT * INTO v_visit
    FROM public.clinical_visits
    WHERE id = p_clinical_visit_id AND practice_id = p_practice_id;

    IF v_visit.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Clinical visit not found or does not belong to target practice.';
    END IF;

    -- 3. Confirm Visit Belongs to Same Patient
    IF v_visit.patient_id <> v_entitlement.patient_id THEN
        RAISE EXCEPTION 'Cross-patient consumption prohibited: Visit patient (%) does not match package entitlement patient (%).', v_visit.patient_id, v_entitlement.patient_id;
    END IF;

    -- 4. Confirm Clinical Visit Status = 'completed'
    IF v_visit.status <> 'completed' THEN
        RAISE EXCEPTION 'Validation failure: Clinical visit must be in status completed to consume a package session. Current status: %', v_visit.status;
    END IF;

    -- 5. Confirm Entitlement Status = 'active'
    IF v_entitlement.status <> 'active' THEN
        RAISE EXCEPTION 'Validation failure: Cannot consume session: Package entitlement is in status % (must be active).', v_entitlement.status;
    END IF;

    -- 6. Check Validity Window
    IF v_entitlement.expires_at IS NOT NULL AND now() > v_entitlement.expires_at THEN
        UPDATE public.package_entitlements
        SET status = 'expired', updated_at = now()
        WHERE id = v_entitlement.id;

        PERFORM public.log_audit_event(
            p_practice_id,
            'package.expired',
            'package_entitlements',
            v_entitlement.id,
            jsonb_build_object(
                'package_number', v_entitlement.package_number,
                'patient_id', v_entitlement.patient_id,
                'expires_at', v_entitlement.expires_at
            )
        );

        RAISE EXCEPTION 'Validation failure: Cannot consume session: Package validity expired on %.', v_entitlement.expires_at;
    END IF;

    -- 7. Calculate Derived Balances
    SELECT count(*) INTO v_consumed_count
    FROM public.package_consumption_ledger
    WHERE entitlement_id = v_entitlement.id;

    v_remaining := v_entitlement.total_sessions - v_consumed_count;
    IF v_remaining <= 0 THEN
        UPDATE public.package_entitlements
        SET status = 'completed', updated_at = now()
        WHERE id = v_entitlement.id;

        RAISE EXCEPTION 'Validation failure: Cannot consume session: Package has zero remaining sessions.';
    END IF;

    -- 8. Double-Consumption Protection
    IF EXISTS (
        SELECT 1 FROM public.package_consumption_ledger
        WHERE entitlement_id = v_entitlement.id AND clinical_visit_id = v_visit.id
    ) THEN
        RAISE EXCEPTION 'Duplicate consumption prohibited: Clinical visit % has already consumed a session from this package.', p_clinical_visit_id;
    END IF;

    -- 9. Insert Immutable Consumption Ledger Record
    INSERT INTO public.package_consumption_ledger (
        practice_id,
        entitlement_id,
        clinical_visit_id,
        patient_id,
        consumed_at,
        consumed_by,
        notes
    ) VALUES (
        p_practice_id,
        v_entitlement.id,
        v_visit.id,
        v_entitlement.patient_id,
        now(),
        v_caller_id,
        p_notes
    ) RETURNING id INTO v_consumption_id;

    -- 10. Update Status to 'completed' if this was the final session
    IF v_remaining - 1 = 0 THEN
        v_new_status := 'completed';
        UPDATE public.package_entitlements
        SET status = 'completed', updated_at = now()
        WHERE id = v_entitlement.id;

        PERFORM public.log_audit_event(
            p_practice_id,
            'package.completed',
            'package_entitlements',
            v_entitlement.id,
            jsonb_build_object(
                'package_number', v_entitlement.package_number,
                'patient_id', v_entitlement.patient_id,
                'total_sessions', v_entitlement.total_sessions,
                'final_visit_id', v_visit.id
            )
        );
    ELSE
        v_new_status := 'active';
    END IF;

    -- Audit log
    PERFORM public.log_audit_event(
        p_practice_id,
        'package.session_consumed',
        'package_consumption_ledger',
        v_consumption_id,
        jsonb_build_object(
            'package_number', v_entitlement.package_number,
            'entitlement_id', v_entitlement.id,
            'clinical_visit_id', v_visit.id,
            'patient_id', v_entitlement.patient_id,
            'consumed_sessions', v_consumed_count + 1,
            'remaining_sessions', v_remaining - 1,
            'consumed_by', v_caller_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'consumption_id', v_consumption_id,
        'entitlement_id', v_entitlement.id,
        'package_number', v_entitlement.package_number,
        'clinical_visit_id', v_visit.id,
        'patient_id', v_entitlement.patient_id,
        'total_sessions', v_entitlement.total_sessions,
        'consumed_sessions', v_consumed_count + 1,
        'remaining_sessions', v_remaining - 1,
        'status', v_new_status
    );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_package_session(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_package_session(UUID, UUID, UUID, TEXT) TO authenticated;

-- 13. RPC: EXTEND PACKAGE VALIDITY
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.extend_package_validity(
    p_practice_id UUID,
    p_entitlement_id UUID,
    p_new_expires_at TIMESTAMPTZ,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_entitlement RECORD;
    v_caller_id UUID;
    v_old_expires_at TIMESTAMPTZ;
    v_consumed_count INTEGER;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: Caller is not authenticated.';
    END IF;

    -- Only Owners and Managers can extend validity
    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to extend package validity. Only practice owners or managers may extend packages.';
    END IF;

    IF p_new_expires_at IS NULL OR p_new_expires_at <= now() THEN
        RAISE EXCEPTION 'Validation failure: New expiration timestamp must be strictly in the future.';
    END IF;

    IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
        RAISE EXCEPTION 'Validation failure: Validity extension requires a non-empty reason of at least 5 characters.';
    END IF;

    SELECT * INTO v_entitlement
    FROM public.package_entitlements
    WHERE id = p_entitlement_id AND practice_id = p_practice_id
    FOR UPDATE;

    IF v_entitlement.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Package entitlement not found.';
    END IF;

    IF v_entitlement.status IN ('completed', 'cancelled', 'void') THEN
        RAISE EXCEPTION 'Operation not permitted: Cannot extend validity for package in status %.', v_entitlement.status;
    END IF;

    v_old_expires_at := v_entitlement.expires_at;

    -- If previously expired but has remaining sessions, resume to active
    SELECT count(*) INTO v_consumed_count
    FROM public.package_consumption_ledger
    WHERE entitlement_id = v_entitlement.id;

    IF v_entitlement.status = 'expired' AND (v_entitlement.total_sessions - v_consumed_count) > 0 THEN
        UPDATE public.package_entitlements
        SET expires_at = p_new_expires_at,
            status = 'active',
            updated_at = now()
        WHERE id = v_entitlement.id;
    ELSE
        UPDATE public.package_entitlements
        SET expires_at = p_new_expires_at,
            updated_at = now()
        WHERE id = v_entitlement.id;
    END IF;

    PERFORM public.log_audit_event(
        p_practice_id,
        'package.extended',
        'package_entitlements',
        v_entitlement.id,
        jsonb_build_object(
            'package_number', v_entitlement.package_number,
            'old_expires_at', v_old_expires_at,
            'new_expires_at', p_new_expires_at,
            'reason', p_reason,
            'extended_by', v_caller_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'package_id', v_entitlement.id,
        'package_number', v_entitlement.package_number,
        'old_expires_at', v_old_expires_at,
        'new_expires_at', p_new_expires_at,
        'reason', p_reason
    );
END;
$$;

REVOKE ALL ON FUNCTION public.extend_package_validity(UUID, UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.extend_package_validity(UUID, UUID, TIMESTAMPTZ, TEXT) TO authenticated;

-- 14. RPC: CANCEL PACKAGE (ADMINISTRATIVE FORFEITURE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_package(
    p_practice_id UUID,
    p_entitlement_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_entitlement RECORD;
    v_caller_id UUID;
    v_consumed_count INTEGER;
    v_remaining INTEGER;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: Caller is not authenticated.';
    END IF;

    -- Only Owners and Managers can cancel packages
    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to cancel package. Only practice owners or managers may cancel packages.';
    END IF;

    IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
        RAISE EXCEPTION 'Validation failure: Package cancellation requires a non-empty reason of at least 5 characters.';
    END IF;

    SELECT * INTO v_entitlement
    FROM public.package_entitlements
    WHERE id = p_entitlement_id AND practice_id = p_practice_id
    FOR UPDATE;

    IF v_entitlement.id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Package entitlement not found.';
    END IF;

    IF v_entitlement.status IN ('completed', 'cancelled', 'void') THEN
        RAISE EXCEPTION 'Operation not permitted: Cannot cancel package in status %.', v_entitlement.status;
    END IF;

    SELECT count(*) INTO v_consumed_count
    FROM public.package_consumption_ledger
    WHERE entitlement_id = v_entitlement.id;

    v_remaining := v_entitlement.total_sessions - v_consumed_count;

    UPDATE public.package_entitlements
    SET status = 'cancelled',
        cancelled_at = now(),
        cancelled_by = v_caller_id,
        cancellation_reason = p_reason,
        updated_at = now()
    WHERE id = v_entitlement.id;

    PERFORM public.log_audit_event(
        p_practice_id,
        'package.cancelled',
        'package_entitlements',
        v_entitlement.id,
        jsonb_build_object(
            'package_number', v_entitlement.package_number,
            'consumed_sessions', v_consumed_count,
            'forfeited_sessions', v_remaining,
            'reason', p_reason,
            'cancelled_by', v_caller_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'package_id', v_entitlement.id,
        'package_number', v_entitlement.package_number,
        'status', 'cancelled',
        'consumed_sessions', v_consumed_count,
        'forfeited_sessions', v_remaining,
        'reason', p_reason
    );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_package(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_package(UUID, UUID, TEXT) TO authenticated;

-- 15. ROW-LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.practice_package_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_consumption_ledger ENABLE ROW LEVEL SECURITY;

-- 15A. practice_package_counters policies
CREATE POLICY p_practice_package_counters_select ON public.practice_package_counters
    FOR SELECT TO authenticated
    USING (practice_id = public.current_practice_id());

CREATE POLICY p_practice_package_counters_insert ON public.practice_package_counters
    FOR INSERT TO authenticated
    WITH CHECK (practice_id = public.current_practice_id());

CREATE POLICY p_practice_package_counters_update ON public.practice_package_counters
    FOR UPDATE TO authenticated
    USING (practice_id = public.current_practice_id())
    WITH CHECK (practice_id = public.current_practice_id());

-- 15B. package_definitions policies
CREATE POLICY p_package_definitions_select ON public.package_definitions
    FOR SELECT TO authenticated
    USING (practice_id = public.current_practice_id());

CREATE POLICY p_package_definitions_insert ON public.package_definitions
    FOR INSERT TO authenticated
    WITH CHECK (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    );

CREATE POLICY p_package_definitions_update ON public.package_definitions
    FOR UPDATE TO authenticated
    USING (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    )
    WITH CHECK (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    );

-- 15C. package_entitlements policies
CREATE POLICY p_package_entitlements_select ON public.package_entitlements
    FOR SELECT TO authenticated
    USING (practice_id = public.current_practice_id());

CREATE POLICY p_package_entitlements_insert ON public.package_entitlements
    FOR INSERT TO authenticated
    WITH CHECK (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    );

CREATE POLICY p_package_entitlements_update ON public.package_entitlements
    FOR UPDATE TO authenticated
    USING (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    )
    WITH CHECK (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    );

-- 15D. package_consumption_ledger policies
CREATE POLICY p_package_consumption_select ON public.package_consumption_ledger
    FOR SELECT TO authenticated
    USING (practice_id = public.current_practice_id());

CREATE POLICY p_package_consumption_insert ON public.package_consumption_ledger
    FOR INSERT TO authenticated
    WITH CHECK (
        practice_id = public.current_practice_id() AND
        public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist', 'physiotherapist'])
    );

-- 16. GRANTS FOR AUTHENTICATED USERS
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.practice_package_counters TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.package_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.package_entitlements TO authenticated;
GRANT SELECT, INSERT ON public.package_consumption_ledger TO authenticated;
