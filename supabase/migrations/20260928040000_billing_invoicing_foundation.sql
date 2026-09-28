-- ==============================================================================
-- PHYSENRA BILLING & INVOICING FOUNDATION V1 MIGRATION
-- Migration: 20260928040000_billing_invoicing_foundation.sql
--
-- Features:
-- 1. Invoice Status Enum ('draft', 'issued', 'partially_paid', 'paid', 'void')
-- 2. Practice Invoice Counter & Atomic Sequential Generator (INV-000001)
-- 3. Standalone Top-Level Invoices Table with Optional Composite Clinical Provenance
-- 4. Itemized Invoice Lines with Authoritative Service & Fee Schedule Financial Snapshots
-- 5. Strict Historical Price Preservation, Immutability & Lifecycle Triggers
-- 6. Zero Hard-Delete Policy for Issued/Non-Draft Invoices and Their Lines
-- 7. Deterministic Financial Calculation Integrity & Database-Enforced Totals
-- 8. Explicit Multi-Tenant Composite Foreign Keys for PostgREST Safety
-- 9. Row-Level Security (RLS) & Role-Based Access Control (RBAC) Policies
-- ==============================================================================

-- 1. INVOICE STATUS ENUM (REFINED LIFECYCLE: DRAFT, ISSUED, PARTIALLY_PAID, PAID, VOID)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE public.invoice_status AS ENUM (
            'draft',
            'issued',
            'partially_paid',
            'paid',
            'void'
        );
    END IF;
END $$;

-- 2. PRACTICE INVOICE COUNTERS (ATOMIC SEQUENTIAL NUMBERING: INV-000001)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_invoice_counters (
    practice_id UUID PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_invoice_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practice_invoice_counters_isolation" ON public.practice_invoice_counters;
CREATE POLICY "practice_invoice_counters_isolation"
    ON public.practice_invoice_counters
    FOR ALL
    USING (practice_id = public.current_practice_id())
    WITH CHECK (practice_id = public.current_practice_id());

CREATE OR REPLACE FUNCTION public.generate_next_invoice_number(p_practice_id UUID)
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

    -- Only administrative and billing roles can generate invoice numbers (physiotherapists are view-only)
    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to generate invoice number.';
    END IF;

    INSERT INTO public.practice_invoice_counters (practice_id, last_number, updated_at)
    VALUES (p_practice_id, 1, now())
    ON CONFLICT (practice_id) DO UPDATE
        SET last_number = public.practice_invoice_counters.last_number + 1,
            updated_at = now()
    RETURNING last_number INTO v_next_val;

    RETURN 'INV-' || LPAD(v_next_val::TEXT, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_next_invoice_number(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_invoice_number(UUID) TO authenticated;

-- 3. INVOICES TABLE (STANDALONE TOP-LEVEL TENANT ENTITY)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    invoice_number VARCHAR(32) NOT NULL,
    patient_id UUID NOT NULL,
    episode_id UUID NULL,
    clinical_visit_id UUID NULL,
    fee_schedule_id UUID NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_date DATE GENERATED ALWAYS AS (issue_date) STORED,
    due_date DATE NULL,
    status public.invoice_status NOT NULL DEFAULT 'draft',
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) GENERATED ALWAYS AS (grand_total) STORED,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT NULL,
    terms TEXT NULL,
    issued_at TIMESTAMPTZ NULL,
    finalized_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    voided_at TIMESTAMPTZ NULL,
    voided_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    void_reason TEXT NULL,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique composite invariants
    CONSTRAINT uq_invoices_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_invoices_practice_number UNIQUE (practice_id, invoice_number),

    -- Value & date constraints
    CONSTRAINT chk_invoices_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_invoices_dates CHECK (due_date IS NULL OR due_date >= issue_date),
    CONSTRAINT chk_invoices_amounts CHECK (
        subtotal >= 0 AND 
        discount_total >= 0 AND 
        tax_total >= 0 AND 
        grand_total >= 0 AND 
        amount_paid >= 0 AND 
        balance_due >= 0
    ),
    CONSTRAINT chk_invoices_totals_balance CHECK (grand_total = (subtotal - discount_total + tax_total)),
    CONSTRAINT chk_invoices_balance CHECK (balance_due = grand_total - amount_paid),
    CONSTRAINT chk_invoices_void_reason CHECK (
        status <> 'void' OR (void_reason IS NOT NULL AND length(trim(void_reason)) >= 5)
    ),
    CONSTRAINT chk_invoices_voided_at CHECK (
        status <> 'void' OR voided_at IS NOT NULL
    ),
    CONSTRAINT chk_invoices_issued_at CHECK (
        status = 'draft' OR issued_at IS NOT NULL
    ),

    -- Multi-tenant Composite Foreign Keys for Relational Provenance
    CONSTRAINT fk_invoices_patient_practice FOREIGN KEY (patient_id, practice_id)
        REFERENCES public.patients(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_invoices_episode_patient_practice FOREIGN KEY (episode_id, patient_id, practice_id)
        REFERENCES public.episodes_of_care(id, patient_id, practice_id) ON DELETE SET NULL,
    CONSTRAINT fk_invoices_visit_patient_practice FOREIGN KEY (clinical_visit_id, patient_id, practice_id)
        REFERENCES public.clinical_visits(id, patient_id, practice_id) ON DELETE SET NULL,
    CONSTRAINT fk_invoices_schedule_practice FOREIGN KEY (fee_schedule_id, practice_id)
        REFERENCES public.fee_schedules(id, practice_id) ON DELETE SET NULL
);

-- 4. INVOICE LINES TABLE (ITEMIZED CHARGES & IMMUTABLE SNAPSHOTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL,
    service_id UUID NOT NULL,
    service_code_snapshot VARCHAR(64) NOT NULL,
    service_name_snapshot VARCHAR(255) NOT NULL,
    description VARCHAR(500) NULL,
    quantity NUMERIC(8, 2) NOT NULL DEFAULT 1.00,
    unit_price_snapshot NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    is_taxable BOOLEAN NOT NULL DEFAULT false,
    tax_rate_percent_snapshot NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Invariants
    CONSTRAINT uq_invoice_lines_id_practice UNIQUE (id, practice_id),
    CONSTRAINT chk_invoice_lines_quantity CHECK (quantity > 0),
    CONSTRAINT chk_invoice_lines_unit_price CHECK (unit_price_snapshot >= 0),
    CONSTRAINT chk_invoice_lines_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_invoice_lines_tax_rate CHECK (tax_rate_percent_snapshot >= 0 AND tax_rate_percent_snapshot <= 100),
    CONSTRAINT chk_invoice_lines_tax_amount CHECK (tax_amount >= 0),
    CONSTRAINT chk_invoice_lines_discount CHECK (discount_amount >= 0 AND discount_amount <= (quantity * unit_price_snapshot)),
    CONSTRAINT chk_invoice_lines_line_total CHECK (line_total >= 0),

    -- Multi-tenant Composite Foreign Keys
    CONSTRAINT fk_invoice_lines_invoice_practice FOREIGN KEY (invoice_id, practice_id)
        REFERENCES public.invoices(id, practice_id) ON DELETE CASCADE,
    CONSTRAINT fk_invoice_lines_service_practice FOREIGN KEY (service_id, practice_id)
        REFERENCES public.services(id, practice_id) ON DELETE RESTRICT
);

-- 5. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_invoices_practice_patient ON public.invoices(practice_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_practice_status ON public.invoices(practice_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_practice_issue_date ON public.invoices(practice_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_practice_created_at ON public.invoices(practice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_practice ON public.invoice_lines(practice_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_service_practice ON public.invoice_lines(practice_id, service_id);

-- 6. TRIGGERS & BUSINESS INVARIANTS
-- ------------------------------------------------------------------------------

-- Trigger: set updated_at
DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_invoice_lines_updated_at ON public.invoice_lines;
CREATE TRIGGER trg_invoice_lines_updated_at
    BEFORE UPDATE ON public.invoice_lines
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Trigger Function: Protect Invoice Line Immutability, Authoritative Price Snapshot & Amount Calculation
CREATE OR REPLACE FUNCTION public.protect_invoice_line_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invoice_status public.invoice_status;
    v_invoice_currency VARCHAR(3);
    v_invoice_practice_id UUID;
    v_invoice_fee_schedule_id UUID;
    v_effective_fee_schedule_id UUID;
    v_subtotal NUMERIC(12, 2);

    -- Authoritative tariff resolution fields
    v_authoritative_price NUMERIC(12, 2);
    v_authoritative_currency VARCHAR(3);
    v_authoritative_is_taxable BOOLEAN;
    v_authoritative_tax_rate NUMERIC(5, 2);
    v_service_code VARCHAR(64);
    v_service_name VARCHAR(255);
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT status, practice_id INTO v_invoice_status, v_invoice_practice_id
        FROM public.invoices
        WHERE id = OLD.invoice_id;

        IF v_invoice_status IS NULL THEN
            RETURN OLD;
        END IF;

        IF v_invoice_status <> 'draft' THEN
            RAISE EXCEPTION 'Operation not permitted: Cannot delete line from non-draft invoice (status: %). Issued invoices are immutable.', v_invoice_status;
        END IF;

        RETURN OLD;
    END IF;

    -- For INSERT or UPDATE:
    SELECT status, currency, practice_id, fee_schedule_id 
    INTO v_invoice_status, v_invoice_currency, v_invoice_practice_id, v_invoice_fee_schedule_id
    FROM public.invoices
    WHERE id = NEW.invoice_id;

    IF v_invoice_status IS NULL THEN
        RAISE EXCEPTION 'Referenced invoice % does not exist.', NEW.invoice_id;
    END IF;

    IF v_invoice_practice_id <> NEW.practice_id THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant mismatch between invoice and line.';
    END IF;

    IF v_invoice_status <> 'draft' THEN
        RAISE EXCEPTION 'Operation not permitted: Cannot modify lines of non-draft invoice (status: %). Issued invoices are immutable.', v_invoice_status;
    END IF;

    IF NEW.service_id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: service_id is mandatory for invoice lines. Custom manual uncatalogued lines are strictly prohibited.';
    END IF;

    IF NEW.quantity <= 0 THEN
        RAISE EXCEPTION 'Validation failure: quantity must be strictly greater than 0.';
    END IF;

    -- Resolve authoritative Fee Schedule: explicit invoice schedule or default active schedule
    v_effective_fee_schedule_id := v_invoice_fee_schedule_id;
    IF v_effective_fee_schedule_id IS NULL THEN
        SELECT id INTO v_effective_fee_schedule_id
        FROM public.fee_schedules
        WHERE practice_id = NEW.practice_id
          AND status = 'active'
          AND is_default = true
        LIMIT 1;
    END IF;

    IF v_effective_fee_schedule_id IS NULL THEN
        RAISE EXCEPTION 'Validation failure: No applicable active fee schedule found for practice %. Invoicing requires an active fee schedule.', NEW.practice_id;
    END IF;

    -- Authoritatively look up the service and tariff
    SELECT 
        fsi.unit_price,
        fsi.currency,
        fsi.is_taxable,
        fsi.tax_rate_percent,
        s.service_code,
        s.name
    INTO
        v_authoritative_price,
        v_authoritative_currency,
        v_authoritative_is_taxable,
        v_authoritative_tax_rate,
        v_service_code,
        v_service_name
    FROM public.fee_schedule_items fsi
    JOIN public.services s ON s.id = fsi.service_id AND s.practice_id = fsi.practice_id
    WHERE fsi.fee_schedule_id = v_effective_fee_schedule_id
      AND fsi.service_id = NEW.service_id
      AND fsi.practice_id = NEW.practice_id;

    IF v_authoritative_price IS NULL THEN
        RAISE EXCEPTION 'Validation failure: Service % does not have an active tariff defined in the applicable fee schedule %.', NEW.service_id, v_effective_fee_schedule_id;
    END IF;

    -- Ensure line currency matches invoice currency
    IF v_authoritative_currency <> v_invoice_currency THEN
        RAISE EXCEPTION 'Currency mismatch: Fee schedule tariff currency (%) does not match invoice currency (%).', v_authoritative_currency, v_invoice_currency;
    END IF;

    -- Stamp authoritative snapshots from Service Catalog and Fee Schedule
    NEW.service_code_snapshot := v_service_code;
    NEW.service_name_snapshot := v_service_name;
    NEW.unit_price_snapshot := v_authoritative_price;
    NEW.currency := v_authoritative_currency;
    NEW.is_taxable := v_authoritative_is_taxable;
    NEW.tax_rate_percent_snapshot := CASE WHEN v_authoritative_is_taxable THEN v_authoritative_tax_rate ELSE 0.00 END;

    -- Compute deterministic fixed-point monetary values
    v_subtotal := ROUND(NEW.quantity * NEW.unit_price_snapshot, 2);
    IF NEW.discount_amount < 0 THEN
        RAISE EXCEPTION 'Validation failure: discount_amount cannot be negative.';
    END IF;

    IF NEW.discount_amount > v_subtotal THEN
        RAISE EXCEPTION 'Validation failure: Discount amount (%) cannot exceed line subtotal (%).', NEW.discount_amount, v_subtotal;
    END IF;

    NEW.tax_amount := ROUND((v_subtotal - NEW.discount_amount) * (NEW.tax_rate_percent_snapshot / 100.0), 2);
    NEW.line_total := v_subtotal - NEW.discount_amount + NEW.tax_amount;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_invoice_line_immutability ON public.invoice_lines;
CREATE TRIGGER trg_protect_invoice_line_immutability
    BEFORE INSERT OR UPDATE OR DELETE ON public.invoice_lines
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_invoice_line_immutability();

-- Trigger Function: Synchronize Invoice Header Totals from Lines
CREATE OR REPLACE FUNCTION public.sync_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_target_invoice_id UUID;
    v_subtotal NUMERIC(12, 2);
    v_discount_total NUMERIC(12, 2);
    v_tax_total NUMERIC(12, 2);
    v_grand_total NUMERIC(12, 2);
    v_amount_paid NUMERIC(12, 2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_target_invoice_id := OLD.invoice_id;
    ELSE
        v_target_invoice_id := NEW.invoice_id;
    END IF;

    SELECT 
        COALESCE(SUM(ROUND(quantity * unit_price_snapshot, 2)), 0.00),
        COALESCE(SUM(discount_amount), 0.00),
        COALESCE(SUM(tax_amount), 0.00),
        COALESCE(SUM(line_total), 0.00)
    INTO v_subtotal, v_discount_total, v_tax_total, v_grand_total
    FROM public.invoice_lines
    WHERE invoice_id = v_target_invoice_id;

    SELECT amount_paid INTO v_amount_paid
    FROM public.invoices
    WHERE id = v_target_invoice_id;

    UPDATE public.invoices
    SET 
        subtotal = v_subtotal,
        discount_total = v_discount_total,
        tax_total = v_tax_total,
        grand_total = v_grand_total,
        balance_due = v_grand_total - COALESCE(v_amount_paid, 0.00),
        updated_at = now()
    WHERE id = v_target_invoice_id AND status = 'draft';

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_invoice_totals ON public.invoice_lines;
CREATE TRIGGER trg_sync_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.invoice_lines
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_invoice_totals();

-- Trigger Function: Protect Invoice Immutability, Lifecycle & Transitions
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

        -- Status transitions to payment states: Strictly blocked in Billing V1
        IF NEW.status IN ('partially_paid', 'paid') THEN
            RAISE EXCEPTION 'Operation not permitted: Status transition to % requires the Payments domain which is not implemented in Billing V1.', NEW.status;
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

DROP TRIGGER IF EXISTS trg_protect_invoice_immutability ON public.invoices;
CREATE TRIGGER trg_protect_invoice_immutability
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_invoice_immutability();

-- Trigger Function: Prevent Hard Delete on Non-Draft Invoices
CREATE OR REPLACE FUNCTION public.prevent_invoice_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.status <> 'draft' THEN
        RAISE EXCEPTION 'Operation not permitted: Cannot delete non-draft invoice % (status: %). Use voiding for issued invoices.', OLD.invoice_number, OLD.status;
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_invoice_hard_delete ON public.invoices;
CREATE TRIGGER trg_prevent_invoice_hard_delete
    BEFORE DELETE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_invoice_hard_delete();

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;

-- INVOICES RLS POLICIES
-- SELECT: All practice staff including physiotherapists have view access
DROP POLICY IF EXISTS "invoices_practice_select" ON public.invoices;
CREATE POLICY "invoices_practice_select"
    ON public.invoices
    FOR SELECT
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist', 'physiotherapist'])
    );

-- INSERT: Only administrative and billing roles can create invoices (physiotherapist is view-only)
DROP POLICY IF EXISTS "invoices_practice_insert" ON public.invoices;
CREATE POLICY "invoices_practice_insert"
    ON public.invoices
    FOR INSERT
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    );

-- UPDATE: Only administrative and billing roles can update draft invoices
DROP POLICY IF EXISTS "invoices_practice_update" ON public.invoices;
CREATE POLICY "invoices_practice_update"
    ON public.invoices
    FOR UPDATE
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    )
    WITH CHECK (practice_id = public.current_practice_id());

-- DELETE: Only administrative and billing roles can delete draft invoices
DROP POLICY IF EXISTS "invoices_practice_delete" ON public.invoices;
CREATE POLICY "invoices_practice_delete"
    ON public.invoices
    FOR DELETE
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    );

-- INVOICE LINES RLS POLICIES
-- SELECT: All practice staff including physiotherapists have view access
DROP POLICY IF EXISTS "invoice_lines_practice_select" ON public.invoice_lines;
CREATE POLICY "invoice_lines_practice_select"
    ON public.invoice_lines
    FOR SELECT
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist', 'physiotherapist'])
    );

-- INSERT: Only administrative and billing roles can insert lines (physiotherapist is view-only)
DROP POLICY IF EXISTS "invoice_lines_practice_insert" ON public.invoice_lines;
CREATE POLICY "invoice_lines_practice_insert"
    ON public.invoice_lines
    FOR INSERT
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    );

-- UPDATE: Only administrative and billing roles can update lines
DROP POLICY IF EXISTS "invoice_lines_practice_update" ON public.invoice_lines;
CREATE POLICY "invoice_lines_practice_update"
    ON public.invoice_lines
    FOR UPDATE
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    )
    WITH CHECK (practice_id = public.current_practice_id());

-- DELETE: Only administrative and billing roles can delete lines
DROP POLICY IF EXISTS "invoice_lines_practice_delete" ON public.invoice_lines;
CREATE POLICY "invoice_lines_practice_delete"
    ON public.invoice_lines
    FOR DELETE
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    );
