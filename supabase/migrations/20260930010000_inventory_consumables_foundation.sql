-- ==============================================================================
-- PHYSENRA INVENTORY & CONSUMABLES FOUNDATION V1 MIGRATION
-- File: supabase/migrations/20260930010000_inventory_consumables_foundation.sql
--
-- Authoritative Architecture: OPTION D
-- Location-Scoped Append-Only Stock Movement Ledger with Derived Quantities
--
-- 1. Enums (Location Type, Item Category, Base Unit, Movement Type, Adjustment Reason)
-- 2. practice_inventory_counters (Atomic SKU Sequential Generator ITM-000001)
-- 3. inventory_locations (Storage Locations with single-default clinic store trigger)
-- 4. inventory_suppliers (Vendor directory)
-- 5. inventory_items (Catalog of items with composite FK to services)
-- 6. inventory_item_batches (Lot numbers & manufacturer expiry dates)
-- 7. inventory_stock_movements (Append-only physical stock ledger with sign checks)
-- 8. Movement Immutability Trigger (Strictly denies UPDATE and DELETE)
-- 9. Authoritative RPCs (Receipt, Issue, Clinical Consumption, Retail Sale, Transfer, Adjustment, Reversal)
-- 10. Row Level Security Policies (100% RLS on all 6 tables)
-- 11. Multi-tenant Composite Foreign Keys & Disambiguated PostgREST Relationships
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENUMS
-- ------------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE public.inventory_location_type AS ENUM (
        'central_store',
        'treatment_room',
        'mobile_kit',
        'reception'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.inventory_item_category AS ENUM (
        'clinical_consumable',
        'rehabilitation_supply',
        'disposable_sanitation',
        'retail_product'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.inventory_base_unit AS ENUM (
        'piece',
        'roll',
        'bottle',
        'pair',
        'pack',
        'meter',
        'tube'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.inventory_movement_type AS ENUM (
        'opening_balance',
        'purchase_receipt',
        'clinical_consumption',
        'retail_sale',
        'transfer_out',
        'transfer_in',
        'adjustment_in',
        'adjustment_out',
        'wastage',
        'expired',
        'reversal'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.inventory_adjustment_reason AS ENUM (
        'stocktake_discrepancy',
        'damaged_in_storage',
        'expired_on_shelf',
        'clerical_error',
        'theft_or_loss'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 2. PRACTICE INVENTORY COUNTERS & ATOMIC SKU GENERATION (ITM-000001)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.practice_inventory_counters (
    practice_id UUID PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_practice_inventory_counters_last_number CHECK (last_number >= 0)
);

CREATE OR REPLACE FUNCTION public.generate_next_inventory_item_sku(p_practice_id UUID)
RETURNS VARCHAR(64)
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

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to generate inventory item SKU.';
    END IF;

    INSERT INTO public.practice_inventory_counters (practice_id, last_number, updated_at)
    VALUES (p_practice_id, 1, now())
    ON CONFLICT (practice_id) DO UPDATE
    SET last_number = public.practice_inventory_counters.last_number + 1,
        updated_at = now()
    RETURNING last_number INTO v_next_val;

    RETURN 'ITM-' || LPAD(v_next_val::TEXT, 6, '0');
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. INVENTORY LOCATIONS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(32) NOT NULL,
    location_type public.inventory_location_type NOT NULL DEFAULT 'treatment_room',
    description VARCHAR(500) NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_inventory_locations_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_inventory_locations_practice_code UNIQUE (practice_id, code),
    CONSTRAINT chk_inventory_locations_name_non_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT chk_inventory_locations_code_format CHECK (code ~ '^[A-Z0-9_-]{2,32}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_locations_one_default 
    ON public.inventory_locations(practice_id) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_inventory_locations_practice_active 
    ON public.inventory_locations(practice_id, is_active);

-- Trigger to maintain single default location per practice
CREATE OR REPLACE FUNCTION public.trg_maintain_single_default_inventory_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE public.inventory_locations
        SET is_default = false, updated_at = now()
        WHERE practice_id = NEW.practice_id
          AND id <> NEW.id
          AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_locations_maintain_default ON public.inventory_locations;
CREATE TRIGGER trg_inventory_locations_maintain_default
    BEFORE INSERT OR UPDATE OF is_default ON public.inventory_locations
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION public.trg_maintain_single_default_inventory_location();

-- Trigger to initialize default Main Clinic Store on practice creation
CREATE OR REPLACE FUNCTION public.initialize_practice_default_inventory_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.inventory_locations (
        practice_id,
        name,
        code,
        location_type,
        description,
        is_default,
        is_active
    )
    VALUES (
        NEW.id,
        'Main Clinic Store',
        'STORE-MAIN',
        'central_store'::public.inventory_location_type,
        'Primary clinic inventory storage location',
        true,
        true
    )
    ON CONFLICT (practice_id, code) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_initialize_practice_default_inventory_location ON public.practices;
CREATE TRIGGER trg_initialize_practice_default_inventory_location
    AFTER INSERT ON public.practices
    FOR EACH ROW
    EXECUTE FUNCTION public.initialize_practice_default_inventory_location();

-- Seed default location for existing practices
INSERT INTO public.inventory_locations (
    practice_id,
    name,
    code,
    location_type,
    description,
    is_default,
    is_active
)
SELECT 
    p.id,
    'Main Clinic Store',
    'STORE-MAIN',
    'central_store'::public.inventory_location_type,
    'Primary clinic inventory storage location',
    true,
    true
FROM public.practices p
WHERE NOT EXISTS (
    SELECT 1 FROM public.inventory_locations loc 
    WHERE loc.practice_id = p.id AND loc.code = 'STORE-MAIN'
);

-- ------------------------------------------------------------------------------
-- 4. INVENTORY SUPPLIERS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_code VARCHAR(64) NULL,
    contact_person VARCHAR(255) NULL,
    phone VARCHAR(64) NULL,
    email VARCHAR(255) NULL,
    address TEXT NULL,
    lead_time_days INTEGER NOT NULL DEFAULT 3,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT NULL,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_inventory_suppliers_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_inventory_suppliers_practice_name UNIQUE (practice_id, supplier_name),
    CONSTRAINT chk_inventory_suppliers_name_non_empty CHECK (length(trim(supplier_name)) > 0),
    CONSTRAINT chk_inventory_suppliers_lead_time CHECK (lead_time_days >= 0),
    CONSTRAINT chk_inventory_suppliers_email CHECK (email IS NULL OR email ~* '^.+@.+$')
);

CREATE INDEX IF NOT EXISTS idx_inventory_suppliers_practice_active 
    ON public.inventory_suppliers(practice_id, is_active);

-- ------------------------------------------------------------------------------
-- 5. INVENTORY ITEMS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
    sku VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category public.inventory_item_category NOT NULL DEFAULT 'clinical_consumable',
    description TEXT NULL,
    base_unit public.inventory_base_unit NOT NULL DEFAULT 'piece',
    reorder_level NUMERIC(12,2) NOT NULL DEFAULT 10.00,
    minimum_stock NUMERIC(12,2) NOT NULL DEFAULT 5.00,
    maximum_stock NUMERIC(12,2) NULL,
    is_sterile BOOLEAN NOT NULL DEFAULT false,
    requires_batch BOOLEAN NOT NULL DEFAULT false,
    linked_service_id UUID NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_inventory_items_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_inventory_items_practice_sku UNIQUE (practice_id, sku),
    CONSTRAINT chk_inventory_items_sku_format CHECK (sku ~ '^[A-Z0-9_-]{3,64}$'),
    CONSTRAINT chk_inventory_items_name_non_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT chk_inventory_items_reorder_level CHECK (reorder_level >= 0),
    CONSTRAINT chk_inventory_items_minimum_stock CHECK (minimum_stock >= 0),
    CONSTRAINT chk_inventory_items_max_stock CHECK (maximum_stock IS NULL OR maximum_stock >= minimum_stock),

    -- Multi-tenant Composite Foreign Key to services
    CONSTRAINT fk_inventory_items_service_practice FOREIGN KEY (linked_service_id, practice_id)
        REFERENCES public.services(id, practice_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_practice_category 
    ON public.inventory_items(practice_id, category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_practice_active 
    ON public.inventory_items(practice_id, is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_items_linked_service 
    ON public.inventory_items(practice_id, linked_service_id);

-- ------------------------------------------------------------------------------
-- 6. INVENTORY ITEM BATCHES
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_item_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
    item_id UUID NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    manufacture_date DATE NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT NULL,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_inventory_item_batches_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_inventory_item_batches_item_batch UNIQUE (practice_id, item_id, batch_number),
    CONSTRAINT chk_inventory_batches_batch_non_empty CHECK (length(trim(batch_number)) > 0),
    CONSTRAINT chk_inventory_batches_dates CHECK (manufacture_date IS NULL OR expiry_date >= manufacture_date),

    -- Multi-tenant Composite Foreign Key to items
    CONSTRAINT fk_inventory_batches_item_practice FOREIGN KEY (item_id, practice_id)
        REFERENCES public.inventory_items(id, practice_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_item_expiry 
    ON public.inventory_item_batches(practice_id, item_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry_active 
    ON public.inventory_item_batches(practice_id, expiry_date, is_active);

-- ------------------------------------------------------------------------------
-- 7. INVENTORY STOCK MOVEMENTS (APPEND-ONLY LEDGER)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
    item_id UUID NOT NULL,
    location_id UUID NOT NULL,
    batch_id UUID NULL,
    movement_type public.inventory_movement_type NOT NULL,
    quantity_delta NUMERIC(12,2) NOT NULL,
    unit_cost_snapshot NUMERIC(12,2) NULL,
    reference_type VARCHAR(64) NULL,
    reference_id UUID NULL,
    adjustment_reason public.inventory_adjustment_reason NULL,
    reversal_of_movement_id UUID NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    notes TEXT NULL,
    actor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_inventory_stock_movements_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_inventory_stock_movements_idempotency UNIQUE (practice_id, idempotency_key),
    CONSTRAINT chk_stock_movement_quantity_nonzero CHECK (quantity_delta <> 0.00),
    CONSTRAINT chk_stock_movement_unit_cost CHECK (unit_cost_snapshot IS NULL OR unit_cost_snapshot >= 0),

    -- Multi-tenant Composite Foreign Keys
    CONSTRAINT fk_movement_item_practice FOREIGN KEY (item_id, practice_id)
        REFERENCES public.inventory_items(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_movement_location_practice FOREIGN KEY (location_id, practice_id)
        REFERENCES public.inventory_locations(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_movement_batch_practice FOREIGN KEY (batch_id, practice_id)
        REFERENCES public.inventory_item_batches(id, practice_id) ON DELETE RESTRICT,
    CONSTRAINT fk_movement_reversal_practice FOREIGN KEY (reversal_of_movement_id, practice_id)
        REFERENCES public.inventory_stock_movements(id, practice_id) ON DELETE RESTRICT,

    -- Sign Enforcement Constraint
    CONSTRAINT chk_stock_movement_sign CHECK (
        (movement_type = 'opening_balance' AND quantity_delta > 0) OR
        (movement_type = 'purchase_receipt' AND quantity_delta > 0) OR
        (movement_type = 'clinical_consumption' AND quantity_delta < 0) OR
        (movement_type = 'retail_sale' AND quantity_delta < 0) OR
        (movement_type = 'transfer_out' AND quantity_delta < 0) OR
        (movement_type = 'transfer_in' AND quantity_delta > 0) OR
        (movement_type = 'adjustment_in' AND quantity_delta > 0) OR
        (movement_type = 'adjustment_out' AND quantity_delta < 0) OR
        (movement_type = 'wastage' AND quantity_delta < 0) OR
        (movement_type = 'expired' AND quantity_delta < 0) OR
        (movement_type = 'reversal')
    )
);

CREATE INDEX IF NOT EXISTS idx_movements_item_location 
    ON public.inventory_stock_movements(practice_id, item_id, location_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_batch 
    ON public.inventory_stock_movements(practice_id, batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movements_reference 
    ON public.inventory_stock_movements(practice_id, reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_movements_created_at 
    ON public.inventory_stock_movements(practice_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 8. IMMUTABILITY TRIGGER (DENIES UPDATE / DELETE ON MOVEMENTS)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_inventory_movement_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Inventory stock movements are strictly append-only and cannot be updated or deleted.'
        USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_inventory_movements_immutability ON public.inventory_stock_movements;
CREATE TRIGGER trg_inventory_movements_immutability
    BEFORE UPDATE OR DELETE ON public.inventory_stock_movements
    FOR EACH ROW EXECUTE FUNCTION public.prevent_inventory_movement_mutation();

-- ------------------------------------------------------------------------------
-- 9. AUTHORITATIVE RPCS (OPTION D LEDGER ENGINE)
-- ------------------------------------------------------------------------------

-- Helper: Compute stock on hand for item at location
CREATE OR REPLACE FUNCTION public.get_inventory_stock_on_hand(
    p_practice_id UUID,
    p_item_id UUID DEFAULT NULL,
    p_location_id UUID DEFAULT NULL
)
RETURNS TABLE (
    item_id UUID,
    location_id UUID,
    derived_stock NUMERIC(12,2)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT 
        m.item_id,
        m.location_id,
        COALESCE(SUM(m.quantity_delta), 0.00)::NUMERIC(12,2) AS derived_stock
    FROM public.inventory_stock_movements m
    WHERE m.practice_id = p_practice_id
      AND (p_item_id IS NULL OR m.item_id = p_item_id)
      AND (p_location_id IS NULL OR m.location_id = p_location_id)
    GROUP BY m.item_id, m.location_id;
$$;

-- RPC 1: Create Inventory Item
CREATE OR REPLACE FUNCTION public.create_inventory_item(
    p_practice_id UUID,
    p_name TEXT,
    p_category public.inventory_item_category,
    p_base_unit public.inventory_base_unit,
    p_reorder_level NUMERIC DEFAULT 10.00,
    p_minimum_stock NUMERIC DEFAULT 5.00,
    p_maximum_stock NUMERIC DEFAULT NULL,
    p_is_sterile BOOLEAN DEFAULT false,
    p_requires_batch BOOLEAN DEFAULT false,
    p_linked_service_id UUID DEFAULT NULL,
    p_custom_sku TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS public.inventory_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
    v_sku VARCHAR(64);
    v_item public.inventory_items;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to create inventory items.';
    END IF;

    IF p_custom_sku IS NOT NULL AND TRIM(p_custom_sku) <> '' THEN
        v_sku := UPPER(TRIM(p_custom_sku));
        IF NOT (v_sku ~ '^[A-Z0-9_-]{3,64}$') THEN
            RAISE EXCEPTION 'Invalid SKU format. Must be 3-64 alphanumeric characters, underscores or dashes.';
        END IF;
    ELSE
        v_sku := public.generate_next_inventory_item_sku(p_practice_id);
    END IF;

    IF p_linked_service_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.services WHERE id = p_linked_service_id AND practice_id = p_practice_id) THEN
            RAISE EXCEPTION 'Linked service not found or does not belong to practice.';
        END IF;
    END IF;

    INSERT INTO public.inventory_items (
        practice_id,
        sku,
        name,
        category,
        description,
        base_unit,
        reorder_level,
        minimum_stock,
        maximum_stock,
        is_sterile,
        requires_batch,
        linked_service_id,
        created_by,
        updated_by
    )
    VALUES (
        p_practice_id,
        v_sku,
        TRIM(p_name),
        p_category,
        p_description,
        p_base_unit,
        p_reorder_level,
        p_minimum_stock,
        p_maximum_stock,
        p_is_sterile,
        p_requires_batch,
        p_linked_service_id,
        v_actor_id,
        v_actor_id
    )
    RETURNING * INTO v_item;

    PERFORM public.log_audit_event(
        p_practice_id,
        'inventory_item_created',
        'inventory_items',
        v_item.id,
        jsonb_build_object('sku', v_item.sku, 'name', v_item.name, 'category', v_item.category)
    );

    RETURN v_item;
END;
$$;

-- RPC 2: Record Stock Receipt
CREATE OR REPLACE FUNCTION public.record_stock_receipt(
    p_practice_id UUID,
    p_item_id UUID,
    p_location_id UUID,
    p_quantity NUMERIC,
    p_unit_cost NUMERIC DEFAULT NULL,
    p_supplier_id UUID DEFAULT NULL,
    p_supplier_invoice_ref TEXT DEFAULT NULL,
    p_batch_number TEXT DEFAULT NULL,
    p_expiry_date DATE DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS public.inventory_stock_movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
    v_item RECORD;
    v_loc RECORD;
    v_batch_id UUID;
    v_key VARCHAR(128);
    v_movement public.inventory_stock_movements;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to receive stock.';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Receipt quantity must be strictly greater than zero.';
    END IF;

    v_key := COALESCE(p_idempotency_key, 'receipt_' || gen_random_uuid()::TEXT);

    -- Check idempotency
    SELECT * INTO v_movement 
    FROM public.inventory_stock_movements 
    WHERE practice_id = p_practice_id AND idempotency_key = v_key;
    IF FOUND THEN
        RETURN v_movement;
    END IF;

    -- Row locks on item and location
    SELECT * INTO v_item 
    FROM public.inventory_items 
    WHERE id = p_item_id AND practice_id = p_practice_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory item not found.';
    END IF;

    SELECT * INTO v_loc 
    FROM public.inventory_locations 
    WHERE id = p_location_id AND practice_id = p_practice_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory location not found.';
    END IF;

    IF NOT v_loc.is_active THEN
        RAISE EXCEPTION 'Cannot receive stock into inactive location.';
    END IF;

    IF p_supplier_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.inventory_suppliers WHERE id = p_supplier_id AND practice_id = p_practice_id) THEN
            RAISE EXCEPTION 'Supplier not found.';
        END IF;
    END IF;

    -- Batch handling
    IF v_item.requires_batch THEN
        IF p_batch_number IS NULL OR TRIM(p_batch_number) = '' OR p_expiry_date IS NULL THEN
            RAISE EXCEPTION 'Item % requires a batch number and expiry date.', v_item.sku;
        END IF;

        INSERT INTO public.inventory_item_batches (
            practice_id,
            item_id,
            batch_number,
            expiry_date,
            created_by
        )
        VALUES (
            p_practice_id,
            p_item_id,
            TRIM(p_batch_number),
            p_expiry_date,
            v_actor_id
        )
        ON CONFLICT (practice_id, item_id, batch_number) DO UPDATE
        SET is_active = true
        RETURNING id INTO v_batch_id;
    END IF;

    INSERT INTO public.inventory_stock_movements (
        practice_id,
        item_id,
        location_id,
        batch_id,
        movement_type,
        quantity_delta,
        unit_cost_snapshot,
        reference_type,
        reference_id,
        idempotency_key,
        notes,
        actor_user_id
    )
    VALUES (
        p_practice_id,
        p_item_id,
        p_location_id,
        v_batch_id,
        'purchase_receipt',
        p_quantity,
        p_unit_cost,
        'supplier_receipt',
        p_supplier_id,
        v_key,
        p_notes,
        v_actor_id
    )
    RETURNING * INTO v_movement;

    PERFORM public.log_audit_event(
        p_practice_id,
        'inventory_stock_received',
        'inventory_stock_movements',
        v_movement.id,
        jsonb_build_object('item_id', p_item_id, 'location_id', p_location_id, 'quantity', p_quantity, 'batch_id', v_batch_id)
    );

    RETURN v_movement;
END;
$$;

-- RPC 3: Record Stock Issue (Wastage / Expired)
CREATE OR REPLACE FUNCTION public.record_stock_issue(
    p_practice_id UUID,
    p_item_id UUID,
    p_location_id UUID,
    p_batch_id UUID DEFAULT NULL,
    p_quantity NUMERIC DEFAULT 1.00,
    p_issue_type public.inventory_movement_type DEFAULT 'wastage',
    p_reason public.inventory_adjustment_reason DEFAULT 'damaged_in_storage',
    p_idempotency_key TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS public.inventory_stock_movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
    v_key VARCHAR(128);
    v_movement public.inventory_stock_movements;
    v_current_stock NUMERIC(12,2);
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to issue stock adjustments/wastage.';
    END IF;

    IF p_issue_type NOT IN ('wastage', 'expired') THEN
        RAISE EXCEPTION 'Issue type must be wastage or expired.';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Issue quantity must be strictly greater than zero.';
    END IF;

    v_key := COALESCE(p_idempotency_key, 'issue_' || gen_random_uuid()::TEXT);

    SELECT * INTO v_movement 
    FROM public.inventory_stock_movements 
    WHERE practice_id = p_practice_id AND idempotency_key = v_key;
    IF FOUND THEN
        RETURN v_movement;
    END IF;

    -- Row locks
    PERFORM id FROM public.inventory_items WHERE id = p_item_id AND practice_id = p_practice_id FOR UPDATE;
    PERFORM id FROM public.inventory_locations WHERE id = p_location_id AND practice_id = p_practice_id FOR UPDATE;

    -- Compute derived stock
    SELECT COALESCE(SUM(quantity_delta), 0.00) INTO v_current_stock
    FROM public.inventory_stock_movements
    WHERE practice_id = p_practice_id 
      AND item_id = p_item_id 
      AND location_id = p_location_id
      AND (p_batch_id IS NULL OR batch_id = p_batch_id);

    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock available (on hand: %, requested: %).', v_current_stock, p_quantity
            USING ERRCODE = 'insufficient_resources';
    END IF;

    INSERT INTO public.inventory_stock_movements (
        practice_id,
        item_id,
        location_id,
        batch_id,
        movement_type,
        quantity_delta,
        reference_type,
        adjustment_reason,
        idempotency_key,
        notes,
        actor_user_id
    )
    VALUES (
        p_practice_id,
        p_item_id,
        p_location_id,
        p_batch_id,
        p_issue_type,
        -ABS(p_quantity),
        p_issue_type::TEXT,
        p_reason,
        v_key,
        p_notes,
        v_actor_id
    )
    RETURNING * INTO v_movement;

    PERFORM public.log_audit_event(
        p_practice_id,
        CASE WHEN p_issue_type = 'expired' THEN 'inventory_stock_expired' ELSE 'inventory_stock_wastage' END,
        'inventory_stock_movements',
        v_movement.id,
        jsonb_build_object('item_id', p_item_id, 'location_id', p_location_id, 'quantity', p_quantity, 'reason', p_reason)
    );

    RETURN v_movement;
END;
$$;

-- RPC 4: Record Clinical Consumption (NON-BLOCKING CLINICAL FIREWALL)
CREATE OR REPLACE FUNCTION public.record_clinical_consumption(
    p_practice_id UUID,
    p_visit_id UUID,
    p_patient_id UUID,
    p_item_id UUID,
    p_location_id UUID,
    p_batch_id UUID DEFAULT NULL,
    p_quantity NUMERIC DEFAULT 1.00,
    p_idempotency_key TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS public.inventory_stock_movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
    v_key VARCHAR(128);
    v_movement public.inventory_stock_movements;
    v_batch RECORD;
    v_current_stock NUMERIC(12,2);
    v_final_notes TEXT;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to record clinical consumption.';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Consumption quantity must be strictly greater than zero.';
    END IF;

    -- Validate clinical encounter belongs to practice and patient
    IF NOT EXISTS (
        SELECT 1 FROM public.clinical_visits 
        WHERE id = p_visit_id AND practice_id = p_practice_id AND patient_id = p_patient_id
    ) THEN
        RAISE EXCEPTION 'Clinical visit does not belong to specified patient or practice.';
    END IF;

    v_key := COALESCE(p_idempotency_key, 'clin_cons_' || gen_random_uuid()::TEXT);

    SELECT * INTO v_movement 
    FROM public.inventory_stock_movements 
    WHERE practice_id = p_practice_id AND idempotency_key = v_key;
    IF FOUND THEN
        RETURN v_movement;
    END IF;

    -- Row locks
    PERFORM id FROM public.inventory_items WHERE id = p_item_id AND practice_id = p_practice_id FOR UPDATE;
    PERFORM id FROM public.inventory_locations WHERE id = p_location_id AND practice_id = p_practice_id FOR UPDATE;

    -- Batch expiry validation
    IF p_batch_id IS NOT NULL THEN
        SELECT * INTO v_batch 
        FROM public.inventory_item_batches 
        WHERE id = p_batch_id AND practice_id = p_practice_id AND item_id = p_item_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Batch does not belong to specified item and practice.';
        END IF;

        IF v_batch.expiry_date < CURRENT_DATE THEN
            RAISE EXCEPTION 'Cannot clinically consume expired stock (Batch % expired on %).', v_batch.batch_number, v_batch.expiry_date;
        END IF;
    END IF;

    -- Check derived stock (Non-blocking: if stock is 0, append discrepancy note and audit event rather than aborting)
    SELECT COALESCE(SUM(quantity_delta), 0.00) INTO v_current_stock
    FROM public.inventory_stock_movements
    WHERE practice_id = p_practice_id 
      AND item_id = p_item_id 
      AND location_id = p_location_id;

    v_final_notes := p_notes;
    IF v_current_stock < p_quantity THEN
        v_final_notes := COALESCE(p_notes, '') || ' [STOCKOUT DISCREPANCY: Physical usage recorded with zero system stock]';
        PERFORM public.log_audit_event(
            p_practice_id,
            'inventory_stockout_consumption_discrepancy',
            'clinical_visits',
            p_visit_id,
            jsonb_build_object('item_id', p_item_id, 'location_id', p_location_id, 'on_hand', v_current_stock, 'consumed', p_quantity)
        );
    END IF;

    INSERT INTO public.inventory_stock_movements (
        practice_id,
        item_id,
        location_id,
        batch_id,
        movement_type,
        quantity_delta,
        reference_type,
        reference_id,
        idempotency_key,
        notes,
        actor_user_id
    )
    VALUES (
        p_practice_id,
        p_item_id,
        p_location_id,
        p_batch_id,
        'clinical_consumption',
        -ABS(p_quantity),
        'clinical_visit',
        p_visit_id,
        v_key,
        v_final_notes,
        v_actor_id
    )
    RETURNING * INTO v_movement;

    PERFORM public.log_audit_event(
        p_practice_id,
        'inventory_clinical_consumption',
        'inventory_stock_movements',
        v_movement.id,
        jsonb_build_object('visit_id', p_visit_id, 'patient_id', p_patient_id, 'item_id', p_item_id, 'quantity', p_quantity)
    );

    RETURN v_movement;
END;
$$;

-- RPC 5: Record Retail Sale (Linked to Invoiced Line)
CREATE OR REPLACE FUNCTION public.record_retail_sale(
    p_practice_id UUID,
    p_invoice_line_id UUID,
    p_item_id UUID,
    p_location_id UUID,
    p_batch_id UUID DEFAULT NULL,
    p_quantity NUMERIC DEFAULT 1.00,
    p_idempotency_key TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS public.inventory_stock_movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
    v_key VARCHAR(128);
    v_movement public.inventory_stock_movements;
    v_line RECORD;
    v_current_stock NUMERIC(12,2);
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to record retail sales.';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Sale quantity must be strictly greater than zero.';
    END IF;

    -- Validate invoice line belongs to practice and is non-void
    SELECT il.*, i.status AS inv_status INTO v_line
    FROM public.invoice_lines il
    JOIN public.invoices i ON i.id = il.invoice_id AND i.practice_id = il.practice_id
    WHERE il.id = p_invoice_line_id AND il.practice_id = p_practice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice line not found.';
    END IF;

    IF v_line.inv_status IN ('draft', 'void') THEN
        RAISE EXCEPTION 'Cannot record retail stock issue for invoice in % status.', v_line.inv_status;
    END IF;

    v_key := COALESCE(p_idempotency_key, 'sale_' || gen_random_uuid()::TEXT);

    SELECT * INTO v_movement 
    FROM public.inventory_stock_movements 
    WHERE practice_id = p_practice_id AND idempotency_key = v_key;
    IF FOUND THEN
        RETURN v_movement;
    END IF;

    -- Row locks
    PERFORM id FROM public.inventory_items WHERE id = p_item_id AND practice_id = p_practice_id FOR UPDATE;
    PERFORM id FROM public.inventory_locations WHERE id = p_location_id AND practice_id = p_practice_id FOR UPDATE;

    SELECT COALESCE(SUM(quantity_delta), 0.00) INTO v_current_stock
    FROM public.inventory_stock_movements
    WHERE practice_id = p_practice_id 
      AND item_id = p_item_id 
      AND location_id = p_location_id
      AND (p_batch_id IS NULL OR batch_id = p_batch_id);

    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock available for retail sale (on hand: %, requested: %).', v_current_stock, p_quantity
            USING ERRCODE = 'insufficient_resources';
    END IF;

    INSERT INTO public.inventory_stock_movements (
        practice_id,
        item_id,
        location_id,
        batch_id,
        movement_type,
        quantity_delta,
        reference_type,
        reference_id,
        idempotency_key,
        notes,
        actor_user_id
    )
    VALUES (
        p_practice_id,
        p_item_id,
        p_location_id,
        p_batch_id,
        'retail_sale',
        -ABS(p_quantity),
        'invoice_line',
        p_invoice_line_id,
        v_key,
        p_notes,
        v_actor_id
    )
    RETURNING * INTO v_movement;

    PERFORM public.log_audit_event(
        p_practice_id,
        'inventory_retail_sale',
        'inventory_stock_movements',
        v_movement.id,
        jsonb_build_object('invoice_line_id', p_invoice_line_id, 'item_id', p_item_id, 'quantity', p_quantity)
    );

    RETURN v_movement;
END;
$$;

-- RPC 6: Transfer Stock Between Locations (DETERMINISTIC DEADLOCK-FREE LOCKING)
CREATE OR REPLACE FUNCTION public.transfer_stock_between_locations(
    p_practice_id UUID,
    p_item_id UUID,
    p_source_location_id UUID,
    p_dest_location_id UUID,
    p_batch_id UUID DEFAULT NULL,
    p_quantity NUMERIC DEFAULT 1.00,
    p_idempotency_key TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
    v_key VARCHAR(128);
    v_transfer_id UUID;
    v_out_id UUID;
    v_in_id UUID;
    v_current_stock NUMERIC(12,2);
    v_dest_loc RECORD;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to transfer stock.';
    END IF;

    IF p_source_location_id = p_dest_location_id THEN
        RAISE EXCEPTION 'Source and destination locations must be different.';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Transfer quantity must be strictly greater than zero.';
    END IF;

    v_key := COALESCE(p_idempotency_key, 'transfer_' || gen_random_uuid()::TEXT);

    -- Deterministic UUID Locking to prevent PostgreSQL deadlocks
    IF p_source_location_id < p_dest_location_id THEN
        PERFORM id FROM public.inventory_locations WHERE id = p_source_location_id AND practice_id = p_practice_id FOR UPDATE;
        SELECT * INTO v_dest_loc FROM public.inventory_locations WHERE id = p_dest_location_id AND practice_id = p_practice_id FOR UPDATE;
    ELSE
        SELECT * INTO v_dest_loc FROM public.inventory_locations WHERE id = p_dest_location_id AND practice_id = p_practice_id FOR UPDATE;
        PERFORM id FROM public.inventory_locations WHERE id = p_source_location_id AND practice_id = p_practice_id FOR UPDATE;
    END IF;

    IF NOT FOUND OR NOT v_dest_loc.is_active THEN
        RAISE EXCEPTION 'Destination location not found or inactive.';
    END IF;

    PERFORM id FROM public.inventory_items WHERE id = p_item_id AND practice_id = p_practice_id FOR UPDATE;

    SELECT COALESCE(SUM(quantity_delta), 0.00) INTO v_current_stock
    FROM public.inventory_stock_movements
    WHERE practice_id = p_practice_id 
      AND item_id = p_item_id 
      AND location_id = p_source_location_id
      AND (p_batch_id IS NULL OR batch_id = p_batch_id);

    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock in source location (on hand: %, requested: %).', v_current_stock, p_quantity
            USING ERRCODE = 'insufficient_resources';
    END IF;

    v_transfer_id := gen_random_uuid();

    -- Atomic 2-legged transfer
    INSERT INTO public.inventory_stock_movements (
        practice_id,
        item_id,
        location_id,
        batch_id,
        movement_type,
        quantity_delta,
        reference_type,
        reference_id,
        idempotency_key,
        notes,
        actor_user_id
    )
    VALUES (
        p_practice_id,
        p_item_id,
        p_source_location_id,
        p_batch_id,
        'transfer_out',
        -ABS(p_quantity),
        'transfer',
        v_transfer_id,
        v_key || '_out',
        p_notes,
        v_actor_id
    )
    RETURNING id INTO v_out_id;

    INSERT INTO public.inventory_stock_movements (
        practice_id,
        item_id,
        location_id,
        batch_id,
        movement_type,
        quantity_delta,
        reference_type,
        reference_id,
        idempotency_key,
        notes,
        actor_user_id
    )
    VALUES (
        p_practice_id,
        p_item_id,
        p_dest_location_id,
        p_batch_id,
        'transfer_in',
        ABS(p_quantity),
        'transfer',
        v_transfer_id,
        v_key || '_in',
        p_notes,
        v_actor_id
    )
    RETURNING id INTO v_in_id;

    PERFORM public.log_audit_event(
        p_practice_id,
        'inventory_stock_transferred',
        'inventory_stock_movements',
        v_transfer_id,
        jsonb_build_object('source_id', p_source_location_id, 'dest_id', p_dest_location_id, 'item_id', p_item_id, 'quantity', p_quantity)
    );

    RETURN jsonb_build_object(
        'transfer_id', v_transfer_id,
        'transfer_out_id', v_out_id,
        'transfer_in_id', v_in_id
    );
END;
$$;

-- RPC 7: Adjust Stock Balance (Stocktake Count Reconciliation)
CREATE OR REPLACE FUNCTION public.adjust_stock_balance(
    p_practice_id UUID,
    p_item_id UUID,
    p_location_id UUID,
    p_batch_id UUID DEFAULT NULL,
    p_actual_physical_count NUMERIC DEFAULT 0.00,
    p_reason public.inventory_adjustment_reason DEFAULT 'stocktake_discrepancy',
    p_idempotency_key TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS public.inventory_stock_movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
    v_key VARCHAR(128);
    v_movement public.inventory_stock_movements;
    v_current_stock NUMERIC(12,2);
    v_variance NUMERIC(12,2);
    v_type public.inventory_movement_type;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to adjust stock balance.';
    END IF;

    IF p_actual_physical_count IS NULL OR p_actual_physical_count < 0 THEN
        RAISE EXCEPTION 'Physical stock count cannot be negative.';
    END IF;

    v_key := COALESCE(p_idempotency_key, 'adjust_' || gen_random_uuid()::TEXT);

    SELECT * INTO v_movement 
    FROM public.inventory_stock_movements 
    WHERE practice_id = p_practice_id AND idempotency_key = v_key;
    IF FOUND THEN
        RETURN v_movement;
    END IF;

    PERFORM id FROM public.inventory_items WHERE id = p_item_id AND practice_id = p_practice_id FOR UPDATE;
    PERFORM id FROM public.inventory_locations WHERE id = p_location_id AND practice_id = p_practice_id FOR UPDATE;

    SELECT COALESCE(SUM(quantity_delta), 0.00) INTO v_current_stock
    FROM public.inventory_stock_movements
    WHERE practice_id = p_practice_id 
      AND item_id = p_item_id 
      AND location_id = p_location_id
      AND (p_batch_id IS NULL OR batch_id = p_batch_id);

    v_variance := p_actual_physical_count - v_current_stock;

    IF v_variance = 0.00 THEN
        -- Zero variance: physical matches ledger, no movement row needed
        RETURN NULL;
    ELSIF v_variance > 0 THEN
        v_type := 'adjustment_in';
    ELSE
        v_type := 'adjustment_out';
    END IF;

    INSERT INTO public.inventory_stock_movements (
        practice_id,
        item_id,
        location_id,
        batch_id,
        movement_type,
        quantity_delta,
        reference_type,
        adjustment_reason,
        idempotency_key,
        notes,
        actor_user_id
    )
    VALUES (
        p_practice_id,
        p_item_id,
        p_location_id,
        p_batch_id,
        v_type,
        v_variance,
        'adjustment',
        p_reason,
        v_key,
        p_notes,
        v_actor_id
    )
    RETURNING * INTO v_movement;

    PERFORM public.log_audit_event(
        p_practice_id,
        'inventory_stock_adjusted',
        'inventory_stock_movements',
        v_movement.id,
        jsonb_build_object('item_id', p_item_id, 'location_id', p_location_id, 'variance', v_variance, 'reason', p_reason)
    );

    RETURN v_movement;
END;
$$;

-- RPC 8: Reverse Stock Movement (Immutable Counter-Movement)
CREATE OR REPLACE FUNCTION public.reverse_stock_movement(
    p_practice_id UUID,
    p_movement_id_to_reverse UUID,
    p_reason TEXT,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS public.inventory_stock_movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
    v_orig RECORD;
    v_key VARCHAR(128);
    v_reversal public.inventory_stock_movements;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient privileges to reverse stock movements.';
    END IF;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'A valid reversal reason must be provided.';
    END IF;

    v_key := COALESCE(p_idempotency_key, 'rev_' || p_movement_id_to_reverse::TEXT);

    SELECT * INTO v_reversal 
    FROM public.inventory_stock_movements 
    WHERE practice_id = p_practice_id AND idempotency_key = v_key;
    IF FOUND THEN
        RETURN v_reversal;
    END IF;

    -- Row lock on original movement
    SELECT * INTO v_orig 
    FROM public.inventory_stock_movements 
    WHERE id = p_movement_id_to_reverse AND practice_id = p_practice_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Original stock movement not found.';
    END IF;

    IF v_orig.movement_type = 'reversal' THEN
        RAISE EXCEPTION 'Cannot reverse an existing reversal movement.';
    END IF;

    -- Check if already reversed
    IF EXISTS (
        SELECT 1 FROM public.inventory_stock_movements 
        WHERE reversal_of_movement_id = p_movement_id_to_reverse AND practice_id = p_practice_id
    ) THEN
        RAISE EXCEPTION 'Movement % has already been reversed.', p_movement_id_to_reverse;
    END IF;

    -- Append counter movement
    INSERT INTO public.inventory_stock_movements (
        practice_id,
        item_id,
        location_id,
        batch_id,
        movement_type,
        quantity_delta,
        reference_type,
        reference_id,
        reversal_of_movement_id,
        idempotency_key,
        notes,
        actor_user_id
    )
    VALUES (
        p_practice_id,
        v_orig.item_id,
        v_orig.location_id,
        v_orig.batch_id,
        'reversal',
        -1.00 * v_orig.quantity_delta,
        'reversal',
        p_movement_id_to_reverse,
        p_movement_id_to_reverse,
        v_key,
        TRIM(p_reason),
        v_actor_id
    )
    RETURNING * INTO v_reversal;

    PERFORM public.log_audit_event(
        p_practice_id,
        'inventory_movement_reversed',
        'inventory_stock_movements',
        v_reversal.id,
        jsonb_build_object('reversed_movement_id', p_movement_id_to_reverse, 'reason', p_reason)
    );

    RETURN v_reversal;
END;
$$;

-- ------------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (100% COVERAGE ACROSS ALL 6 TABLES)
-- ------------------------------------------------------------------------------

ALTER TABLE public.practice_inventory_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_item_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock_movements ENABLE ROW LEVEL SECURITY;

-- 10.1. practice_inventory_counters RLS
DROP POLICY IF EXISTS practice_inventory_counters_select ON public.practice_inventory_counters;
CREATE POLICY practice_inventory_counters_select ON public.practice_inventory_counters
    FOR SELECT USING (practice_id = public.current_practice_id());

-- 10.2. inventory_locations RLS
DROP POLICY IF EXISTS inventory_locations_select ON public.inventory_locations;
CREATE POLICY inventory_locations_select ON public.inventory_locations
    FOR SELECT USING (practice_id = public.current_practice_id());

DROP POLICY IF EXISTS inventory_locations_insert ON public.inventory_locations;
CREATE POLICY inventory_locations_insert ON public.inventory_locations
    FOR INSERT WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    );

DROP POLICY IF EXISTS inventory_locations_update ON public.inventory_locations;
CREATE POLICY inventory_locations_update ON public.inventory_locations
    FOR UPDATE USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    );

-- 10.3. inventory_suppliers RLS
DROP POLICY IF EXISTS inventory_suppliers_select ON public.inventory_suppliers;
CREATE POLICY inventory_suppliers_select ON public.inventory_suppliers
    FOR SELECT USING (practice_id = public.current_practice_id());

DROP POLICY IF EXISTS inventory_suppliers_insert ON public.inventory_suppliers;
CREATE POLICY inventory_suppliers_insert ON public.inventory_suppliers
    FOR INSERT WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    );

DROP POLICY IF EXISTS inventory_suppliers_update ON public.inventory_suppliers;
CREATE POLICY inventory_suppliers_update ON public.inventory_suppliers
    FOR UPDATE USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
    );

-- 10.4. inventory_items RLS
DROP POLICY IF EXISTS inventory_items_select ON public.inventory_items;
CREATE POLICY inventory_items_select ON public.inventory_items
    FOR SELECT USING (practice_id = public.current_practice_id());

DROP POLICY IF EXISTS inventory_items_insert ON public.inventory_items;
CREATE POLICY inventory_items_insert ON public.inventory_items
    FOR INSERT WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    );

DROP POLICY IF EXISTS inventory_items_update ON public.inventory_items;
CREATE POLICY inventory_items_update ON public.inventory_items
    FOR UPDATE USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    );

-- 10.5. inventory_item_batches RLS
DROP POLICY IF EXISTS inventory_item_batches_select ON public.inventory_item_batches;
CREATE POLICY inventory_item_batches_select ON public.inventory_item_batches
    FOR SELECT USING (practice_id = public.current_practice_id());

DROP POLICY IF EXISTS inventory_item_batches_insert ON public.inventory_item_batches;
CREATE POLICY inventory_item_batches_insert ON public.inventory_item_batches
    FOR INSERT WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist'])
    );

DROP POLICY IF EXISTS inventory_item_batches_update ON public.inventory_item_batches;
CREATE POLICY inventory_item_batches_update ON public.inventory_item_batches
    FOR UPDATE USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    );

-- 10.6. inventory_stock_movements RLS
DROP POLICY IF EXISTS inventory_stock_movements_select ON public.inventory_stock_movements;
CREATE POLICY inventory_stock_movements_select ON public.inventory_stock_movements
    FOR SELECT USING (practice_id = public.current_practice_id());

DROP POLICY IF EXISTS inventory_stock_movements_insert ON public.inventory_stock_movements;
CREATE POLICY inventory_stock_movements_insert ON public.inventory_stock_movements
    FOR INSERT WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant', 'receptionist', 'physiotherapist'])
    );

-- ------------------------------------------------------------------------------
-- 11. POSTGREST EXPLICIT RELATIONSHIP SUPPORT & GRANTS
-- ------------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
