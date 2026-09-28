-- ==============================================================================
-- PHYSENRA FEE SCHEDULE & SERVICE CATALOG FOUNDATION V1
-- ==============================================================================
-- Controlled Migration: Fee Schedule and Service Catalog Foundation
-- Clinical Continuum: COMPLETE (Patient -> Episode -> Plan -> Goals -> Review -> Discharge)
-- Commercial Foundation: Service Catalog -> Fee Schedules -> Effective-Dated Tariffs
-- Architectural Isolation:
--   Service Catalog != Billing != Invoices != Payments != Packages != Wallets != Insurance
--   Service Catalog != AI != WhatsApp != Email Marketing Automation
-- ==============================================================================

-- 1. ENUMS & DOMAIN TYPES
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.service_category AS ENUM (
        'consultation',
        'assessment',
        'treatment',
        'rehabilitation',
        'home_visit',
        'reassessment',
        'group_class',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.fee_schedule_status AS ENUM (
        'draft',
        'active',
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. PRACTICE SERVICE COUNTERS (ATOMIC SEQUENTIAL NUMBERING: SRV-000001)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_service_counters (
    practice_id UUID PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_service_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practice_service_counters_isolation" ON public.practice_service_counters;
CREATE POLICY "practice_service_counters_isolation"
    ON public.practice_service_counters
    FOR ALL
    USING (practice_id = public.current_practice_id())
    WITH CHECK (practice_id = public.current_practice_id());

CREATE OR REPLACE FUNCTION public.generate_next_service_code(p_practice_id UUID)
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

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to generate service code.';
    END IF;

    INSERT INTO public.practice_service_counters (practice_id, last_number, updated_at)
    VALUES (p_practice_id, 1, now())
    ON CONFLICT (practice_id) DO UPDATE
        SET last_number = public.practice_service_counters.last_number + 1,
            updated_at = now()
    RETURNING last_number INTO v_next_val;

    RETURN 'SRV-' || LPAD(v_next_val::TEXT, 6, '0');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_next_service_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_service_code(UUID) TO authenticated;

-- 3. PRACTICE FEE SCHEDULE COUNTERS (ATOMIC SEQUENTIAL NUMBERING: FS-000001)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_fee_schedule_counters (
    practice_id UUID PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_fee_schedule_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practice_fs_counters_isolation" ON public.practice_fee_schedule_counters;
CREATE POLICY "practice_fs_counters_isolation"
    ON public.practice_fee_schedule_counters
    FOR ALL
    USING (practice_id = public.current_practice_id())
    WITH CHECK (practice_id = public.current_practice_id());

CREATE OR REPLACE FUNCTION public.generate_next_fee_schedule_identifier(p_practice_id UUID)
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

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to generate fee schedule identifier.';
    END IF;

    INSERT INTO public.practice_fee_schedule_counters (practice_id, last_number, updated_at)
    VALUES (p_practice_id, 1, now())
    ON CONFLICT (practice_id) DO UPDATE
        SET last_number = public.practice_fee_schedule_counters.last_number + 1,
            updated_at = now()
    RETURNING last_number INTO v_next_val;

    RETURN 'FS-' || LPAD(v_next_val::TEXT, 6, '0');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_next_fee_schedule_identifier(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_fee_schedule_identifier(UUID) TO authenticated;

-- 4. SERVICES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
    service_code TEXT NOT NULL,
    name TEXT NOT NULL,
    category public.service_category NOT NULL,
    description TEXT NULL,
    standard_duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (standard_duration_minutes > 0),
    delivery_mode TEXT NOT NULL DEFAULT 'all' CHECK (delivery_mode IN ('clinic', 'home', 'telehealth', 'other', 'all')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_services_practice_code UNIQUE (practice_id, service_code),
    CONSTRAINT uq_services_id_practice UNIQUE (id, practice_id)
);

CREATE INDEX IF NOT EXISTS idx_services_practice_id ON public.services(practice_id);
CREATE INDEX IF NOT EXISTS idx_services_practice_category ON public.services(practice_id, category);
CREATE INDEX IF NOT EXISTS idx_services_practice_active ON public.services(practice_id, is_active);

-- 5. FEE SCHEDULES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
    schedule_identifier TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NULL,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE NULL,
    status public.fee_schedule_status NOT NULL DEFAULT 'draft',
    is_default BOOLEAN NOT NULL DEFAULT false,
    currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency ~ '^[A-Z]{3}$'),
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT chk_fee_schedule_dates CHECK (effective_to IS NULL OR effective_to >= effective_from),
    CONSTRAINT uq_fee_schedules_practice_identifier UNIQUE (practice_id, schedule_identifier),
    CONSTRAINT uq_fee_schedules_id_practice UNIQUE (id, practice_id)
);

CREATE INDEX IF NOT EXISTS idx_fee_schedules_practice_id ON public.fee_schedules(practice_id);
CREATE INDEX IF NOT EXISTS idx_fee_schedules_practice_status ON public.fee_schedules(practice_id, status);
CREATE INDEX IF NOT EXISTS idx_fee_schedules_effective_dates ON public.fee_schedules(practice_id, effective_from, effective_to);

-- Partial unique index: at most ONE active default fee schedule per practice
CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_schedules_default_active 
    ON public.fee_schedules(practice_id) 
    WHERE (is_default = true AND status = 'active');

-- 6. FEE SCHEDULE ITEMS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_schedule_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
    fee_schedule_id UUID NOT NULL REFERENCES public.fee_schedules(id) ON DELETE RESTRICT,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency ~ '^[A-Z]{3}$'),
    is_taxable BOOLEAN NOT NULL DEFAULT false,
    tax_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (tax_rate_percent >= 0 AND tax_rate_percent <= 100),
    notes TEXT NULL,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_fee_schedule_items_schedule_service UNIQUE (fee_schedule_id, service_id),
    CONSTRAINT uq_fee_schedule_items_id_practice UNIQUE (id, practice_id),

    -- Multi-tenant Composite Foreign Keys
    CONSTRAINT fk_fee_schedule_items_schedule_practice
        FOREIGN KEY (fee_schedule_id, practice_id)
        REFERENCES public.fee_schedules(id, practice_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_fee_schedule_items_service_practice
        FOREIGN KEY (service_id, practice_id)
        REFERENCES public.services(id, practice_id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_fee_schedule_items_schedule ON public.fee_schedule_items(fee_schedule_id);
CREATE INDEX IF NOT EXISTS idx_fee_schedule_items_service ON public.fee_schedule_items(service_id);
CREATE INDEX IF NOT EXISTS idx_fee_schedule_items_practice ON public.fee_schedule_items(practice_id);

-- 7. TRIGGERS & INTEGRITY ENFORCEMENT
-- ------------------------------------------------------------------------------

-- set_updated_at triggers
DROP TRIGGER IF EXISTS trg_services_updated_at ON public.services;
CREATE TRIGGER trg_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_fee_schedules_updated_at ON public.fee_schedules;
CREATE TRIGGER trg_fee_schedules_updated_at
    BEFORE UPDATE ON public.fee_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_fee_schedule_items_updated_at ON public.fee_schedule_items;
CREATE TRIGGER trg_fee_schedule_items_updated_at
    BEFORE UPDATE ON public.fee_schedule_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Service Immutability Protection
CREATE OR REPLACE FUNCTION public.protect_service_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.practice_id <> NEW.practice_id THEN
        RAISE EXCEPTION 'Illegal operation: practice_id cannot be changed.';
    END IF;

    IF OLD.service_code <> NEW.service_code THEN
        RAISE EXCEPTION 'Illegal operation: service_code is immutable.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_service_immutability ON public.services;
CREATE TRIGGER trg_protect_service_immutability
    BEFORE UPDATE ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_service_immutability();

-- Service Hard Delete Protection
CREATE OR REPLACE FUNCTION public.prevent_service_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.fee_schedule_items
        WHERE service_id = OLD.id
    ) THEN
        RAISE EXCEPTION 'Integrity violation: Cannot hard delete a service referenced in fee schedules. Deactivate it instead.';
    END IF;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_service_hard_delete ON public.services;
CREATE TRIGGER trg_prevent_service_hard_delete
    BEFORE DELETE ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_service_hard_delete();

-- Fee Schedule Immutability Protection
CREATE OR REPLACE FUNCTION public.protect_fee_schedule_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.practice_id <> NEW.practice_id THEN
        RAISE EXCEPTION 'Illegal operation: practice_id cannot be changed.';
    END IF;

    IF OLD.schedule_identifier <> NEW.schedule_identifier THEN
        RAISE EXCEPTION 'Illegal operation: schedule_identifier is immutable.';
    END IF;

    -- Prevent modifying archived schedules
    IF OLD.status = 'archived' THEN
        IF NEW.status <> 'archived' THEN
            RAISE EXCEPTION 'Illegal state transition: Archived fee schedules cannot be unarchived.';
        END IF;

        IF OLD.name <> NEW.name OR
           OLD.effective_from <> NEW.effective_from OR
           OLD.effective_to IS DISTINCT FROM NEW.effective_to OR
           OLD.currency <> NEW.currency THEN
            RAISE EXCEPTION 'Illegal operation: Archived fee schedules are locked and cannot be altered.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_fee_schedule_immutability ON public.fee_schedules;
CREATE TRIGGER trg_protect_fee_schedule_immutability
    BEFORE UPDATE ON public.fee_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_fee_schedule_immutability();

-- Fee Schedule Hard Delete Protection
CREATE OR REPLACE FUNCTION public.prevent_fee_schedule_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.status IN ('active', 'archived') THEN
        RAISE EXCEPTION 'Integrity violation: Cannot delete an active or archived fee schedule. Archive it instead.';
    END IF;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_fee_schedule_hard_delete ON public.fee_schedules;
CREATE TRIGGER trg_prevent_fee_schedule_hard_delete
    BEFORE DELETE ON public.fee_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_fee_schedule_hard_delete();

-- Fee Schedule Items Immutability & Schedule Status Enforcement
CREATE OR REPLACE FUNCTION public.protect_fee_schedule_item_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_schedule_status public.fee_schedule_status;
    v_schedule_currency TEXT;
BEGIN
    -- On INSERT or UPDATE, check parent schedule status & currency
    SELECT status, currency INTO v_schedule_status, v_schedule_currency
    FROM public.fee_schedules
    WHERE id = NEW.fee_schedule_id AND practice_id = NEW.practice_id;

    IF v_schedule_status IS NULL THEN
        RAISE EXCEPTION 'Foreign key violation: Parent fee schedule does not exist in this practice.';
    END IF;

    IF v_schedule_status = 'archived' THEN
        RAISE EXCEPTION 'Illegal operation: Cannot add or modify items on an archived fee schedule.';
    END IF;

    IF NEW.currency <> v_schedule_currency THEN
        RAISE EXCEPTION 'Currency mismatch: Fee item currency (%) must match fee schedule currency (%).', NEW.currency, v_schedule_currency;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.practice_id <> NEW.practice_id THEN
            RAISE EXCEPTION 'Illegal operation: practice_id cannot be changed.';
        END IF;
        IF OLD.fee_schedule_id <> NEW.fee_schedule_id THEN
            RAISE EXCEPTION 'Illegal operation: fee_schedule_id cannot be changed.';
        END IF;
        IF OLD.service_id <> NEW.service_id THEN
            RAISE EXCEPTION 'Illegal operation: service_id cannot be changed.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_fee_schedule_item_integrity ON public.fee_schedule_items;
CREATE TRIGGER trg_protect_fee_schedule_item_integrity
    BEFORE INSERT OR UPDATE ON public.fee_schedule_items
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_fee_schedule_item_integrity();

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- SERVICES RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select_membership" ON public.services;
CREATE POLICY "services_select_membership"
    ON public.services
    FOR SELECT
    USING (
        practice_id = public.current_practice_id()
        AND (
            is_active = true 
            OR public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
        )
    );

DROP POLICY IF EXISTS "services_insert_management" ON public.services;
CREATE POLICY "services_insert_management"
    ON public.services
    FOR INSERT
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    );

DROP POLICY IF EXISTS "services_update_management" ON public.services;
CREATE POLICY "services_update_management"
    ON public.services
    FOR UPDATE
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    )
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    );

DROP POLICY IF EXISTS "services_delete_management" ON public.services;
CREATE POLICY "services_delete_management"
    ON public.services
    FOR DELETE
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    );

-- FEE SCHEDULES RLS
ALTER TABLE public.fee_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fee_schedules_select_membership" ON public.fee_schedules;
CREATE POLICY "fee_schedules_select_membership"
    ON public.fee_schedules
    FOR SELECT
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'accountant'])
    );

DROP POLICY IF EXISTS "fee_schedules_insert_management" ON public.fee_schedules;
CREATE POLICY "fee_schedules_insert_management"
    ON public.fee_schedules
    FOR INSERT
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    );

DROP POLICY IF EXISTS "fee_schedules_update_management" ON public.fee_schedules;
CREATE POLICY "fee_schedules_update_management"
    ON public.fee_schedules
    FOR UPDATE
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    )
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    );

DROP POLICY IF EXISTS "fee_schedules_delete_management" ON public.fee_schedules;
CREATE POLICY "fee_schedules_delete_management"
    ON public.fee_schedules
    FOR DELETE
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    );

-- FEE SCHEDULE ITEMS RLS
ALTER TABLE public.fee_schedule_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fee_schedule_items_select_membership" ON public.fee_schedule_items;
CREATE POLICY "fee_schedule_items_select_membership"
    ON public.fee_schedule_items
    FOR SELECT
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'accountant'])
    );

DROP POLICY IF EXISTS "fee_schedule_items_insert_management" ON public.fee_schedule_items;
CREATE POLICY "fee_schedule_items_insert_management"
    ON public.fee_schedule_items
    FOR INSERT
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    );

DROP POLICY IF EXISTS "fee_schedule_items_update_management" ON public.fee_schedule_items;
CREATE POLICY "fee_schedule_items_update_management"
    ON public.fee_schedule_items
    FOR UPDATE
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    )
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    );

DROP POLICY IF EXISTS "fee_schedule_items_delete_management" ON public.fee_schedule_items;
CREATE POLICY "fee_schedule_items_delete_management"
    ON public.fee_schedule_items
    FOR DELETE
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    );
