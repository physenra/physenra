// ==============================================================================
// PHYSENRA INVENTORY & CONSUMABLES FOUNDATION V1 SERVICE LAYER
// File: src/services/inventoryService.ts
//
// Architecture: OPTION D (Formally Cleared)
// Location-Scoped Append-Only Stock Movement Ledger with Derived Quantities
// Stock Authority: Stock(item, location) = SUM(quantity_delta)
// Zero Mutable Stock Balance Column.
//
// Governs:
// 1. Inventory Items Catalog management (CRUD & active toggling)
// 2. Multi-location physical storage tracking
// 3. Supplier directory management
// 4. Batch/lot tracking and clinical expiry validation
// 5. Authoritative Ledger RPCs:
//    - record_stock_receipt
//    - record_stock_issue (wastage/expired)
//    - record_clinical_consumption (non-blocking clinical firewall)
//    - record_retail_sale (linked to invoice line)
//    - transfer_stock_between_locations (atomic 2-legged transfer)
//    - adjust_stock_balance (stocktake count reconciliation)
//    - reverse_stock_movement (immutable counter-movement)
// 6. Explicit PostgREST constraint hint disambiguation
// ==============================================================================

import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  InventoryItem,
  InventoryItemWithRelations,
  InventoryLocation,
  InventoryLocationWithStock,
  InventorySupplier,
  InventoryStockMovement,
  InventoryStockMovementWithRelations,
  CreateInventoryItemPayload,
  UpdateInventoryItemPayload,
  CreateInventoryLocationPayload,
  CreateInventorySupplierPayload,
  ReceiveStockPayload,
  IssueStockPayload,
  ClinicalConsumptionPayload,
  RetailSaleStockPayload,
  TransferStockPayload,
  AdjustStockPayload,
  InventoryItemFilters,
  StockMovementFilters,
} from '../types/models';

export const inventoryService = {
  // ----------------------------------------------------------------------------
  // 1. INVENTORY ITEMS CATALOG
  // ----------------------------------------------------------------------------

  /**
   * Retrieves inventory items for the active practice with derived total stock and locations.
   */
  async getItems(
    practiceId?: string,
    filters?: InventoryItemFilters
  ): Promise<InventoryItemWithRelations[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    let query = supabase
      .from('inventory_items')
      .select(`
        *,
        linked_service:services!fk_inventory_items_service_practice (
          id,
          service_code,
          name,
          category
        ),
        batches:inventory_item_batches!fk_inventory_batches_item_practice (
          id,
          batch_number,
          expiry_date,
          is_active
        )
      `)
      .eq('practice_id', activePracticeId)
      .order('name', { ascending: true });

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters?.isActive !== undefined && filters.isActive !== 'all') {
      query = query.eq('is_active', filters.isActive);
    }

    const { data: items, error } = await query;
    if (error) {
      throw error;
    }

    // Fetch derived stock on hand for all items in the practice
    const { data: stockRows, error: stockError } = await supabase.rpc(
      'get_inventory_stock_on_hand',
      { p_practice_id: activePracticeId }
    );

    if (stockError) {
      console.warn('Could not fetch derived stock levels:', stockError.message);
    }

    // Map derived stock to each item
    const stockMap = new Map<string, { total: number; locations: { location_id: string; location_name: string; quantity: number }[] }>();
    for (const row of stockRows || []) {
      const existing = stockMap.get(row.item_id) || { total: 0, locations: [] };
      existing.total += Number(row.derived_stock || 0);
      existing.locations.push({
        location_id: row.location_id,
        location_name: '', // Populated if needed
        quantity: Number(row.derived_stock || 0),
      });
      stockMap.set(row.item_id, existing);
    }

    let results: InventoryItemWithRelations[] = ((items || []) as unknown as InventoryItemWithRelations[]).map((item) => {
      const stock = stockMap.get(item.id) || { total: 0, locations: [] };
      return {
        ...item,
        total_stock: stock.total,
        stock_by_location: stock.locations,
      };
    });

    if (filters?.lowStockOnly) {
      results = results.filter((item) => (item.total_stock ?? 0) <= Number(item.reorder_level || 0));
    }

    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      results = results.filter((item) => {
        const nameMatch = item.name.toLowerCase().includes(q);
        const skuMatch = item.sku.toLowerCase().includes(q);
        const descMatch = item.description?.toLowerCase().includes(q) || false;
        return nameMatch || skuMatch || descMatch;
      });
    }

    return results;
  },

  /**
   * Retrieves a single inventory item by ID with batches and location breakdown.
   */
  async getItemById(
    itemId: string,
    practiceId?: string
  ): Promise<InventoryItemWithRelations> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data: item, error } = await supabase
      .from('inventory_items')
      .select(`
        *,
        linked_service:services!fk_inventory_items_service_practice (
          id,
          service_code,
          name,
          category
        ),
        batches:inventory_item_batches!fk_inventory_batches_item_practice (
          id,
          batch_number,
          expiry_date,
          manufacture_date,
          is_active,
          notes,
          created_at
        )
      `)
      .eq('id', itemId)
      .eq('practice_id', activePracticeId)
      .single();

    if (error) {
      throw error;
    }

    // Fetch stock on hand for this item
    const { data: stockRows } = await supabase.rpc('get_inventory_stock_on_hand', {
      p_practice_id: activePracticeId,
      p_item_id: itemId,
    });

    const locations = await this.getLocations(activePracticeId);
    const locMap = new Map(locations.map((l) => [l.id, l.name]));

    let totalStock = 0;
    const stockByLocation = (stockRows || []).map((row) => {
      const qty = Number(row.derived_stock || 0);
      totalStock += qty;
      return {
        location_id: row.location_id,
        location_name: locMap.get(row.location_id) || 'Unknown Location',
        quantity: qty,
      };
    });

    return {
      ...(item as unknown as InventoryItemWithRelations),
      total_stock: totalStock,
      stock_by_location: stockByLocation,
    };
  },

  /**
   * Creates a new inventory item using the authoritative RPC.
   */
  async createItem(
    payload: CreateInventoryItemPayload,
    practiceId?: string
  ): Promise<InventoryItem> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('create_inventory_item', {
      p_practice_id: activePracticeId,
      p_name: payload.name.trim(),
      p_category: payload.category,
      p_base_unit: payload.base_unit,
      p_reorder_level: payload.reorder_level ?? 10.0,
      p_minimum_stock: payload.minimum_stock ?? 5.0,
      p_maximum_stock: payload.maximum_stock ?? null,
      p_is_sterile: payload.is_sterile ?? false,
      p_requires_batch: payload.requires_batch ?? false,
      p_linked_service_id: payload.linked_service_id || null,
      p_custom_sku: payload.custom_sku ? payload.custom_sku.trim() : null,
      p_description: payload.description ? payload.description.trim() : null,
    });

    if (error) {
      throw error;
    }

    return data as InventoryItem;
  },

  /**
   * Updates an existing inventory item's non-movement metadata.
   */
  async updateItem(
    itemId: string,
    payload: UpdateInventoryItemPayload,
    practiceId?: string
  ): Promise<InventoryItem> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const updateData: import('../types/models').InventoryItemUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (payload.name !== undefined) updateData.name = payload.name.trim();
    if (payload.category !== undefined) updateData.category = payload.category;
    if (payload.base_unit !== undefined) updateData.base_unit = payload.base_unit;
    if (payload.reorder_level !== undefined) updateData.reorder_level = payload.reorder_level;
    if (payload.minimum_stock !== undefined) updateData.minimum_stock = payload.minimum_stock;
    if (payload.maximum_stock !== undefined) updateData.maximum_stock = payload.maximum_stock;
    if (payload.is_sterile !== undefined) updateData.is_sterile = payload.is_sterile;
    if (payload.requires_batch !== undefined) updateData.requires_batch = payload.requires_batch;
    if (payload.linked_service_id !== undefined) updateData.linked_service_id = payload.linked_service_id;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

    const { data, error } = await supabase
      .from('inventory_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('practice_id', activePracticeId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as InventoryItem;
  },

  // ----------------------------------------------------------------------------
  // 2. LOCATIONS MANAGEMENT
  // ----------------------------------------------------------------------------

  /**
   * Retrieves all locations for the practice.
   */
  async getLocations(practiceId?: string): Promise<InventoryLocationWithStock[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data: locations, error } = await supabase
      .from('inventory_locations')
      .select('*')
      .eq('practice_id', activePracticeId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    // Fetch stock on hand breakdown
    const { data: stockRows } = await supabase.rpc('get_inventory_stock_on_hand', {
      p_practice_id: activePracticeId,
    });

    const locStockMap = new Map<string, { items: Set<string>; totalUnits: number }>();
    for (const row of stockRows || []) {
      const entry = locStockMap.get(row.location_id) || { items: new Set<string>(), totalUnits: 0 };
      const qty = Number(row.derived_stock || 0);
      if (qty > 0) {
        entry.items.add(row.item_id);
      }
      entry.totalUnits += qty;
      locStockMap.set(row.location_id, entry);
    }

    return (locations || []).map((loc) => {
      const stats = locStockMap.get(loc.id) || { items: new Set<string>(), totalUnits: 0 };
      return {
        ...loc,
        item_count: stats.items.size,
        total_units: stats.totalUnits,
      };
    });
  },

  /**
   * Creates a new inventory storage location.
   */
  async createLocation(
    payload: CreateInventoryLocationPayload,
    practiceId?: string
  ): Promise<InventoryLocation> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('inventory_locations')
      .insert({
        practice_id: activePracticeId,
        name: payload.name.trim(),
        code: payload.code.trim().toUpperCase(),
        location_type: payload.location_type,
        description: payload.description ? payload.description.trim() : null,
        is_default: payload.is_default ?? false,
        is_active: payload.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as InventoryLocation;
  },

  // ----------------------------------------------------------------------------
  // 3. SUPPLIERS DIRECTORY
  // ----------------------------------------------------------------------------

  /**
   * Retrieves suppliers for the active practice.
   */
  async getSuppliers(practiceId?: string): Promise<InventorySupplier[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('inventory_suppliers')
      .select('*')
      .eq('practice_id', activePracticeId)
      .order('supplier_name', { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []) as InventorySupplier[];
  },

  /**
   * Creates a new supplier record.
   */
  async createSupplier(
    payload: CreateInventorySupplierPayload,
    practiceId?: string
  ): Promise<InventorySupplier> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('inventory_suppliers')
      .insert({
        practice_id: activePracticeId,
        supplier_name: payload.supplier_name.trim(),
        supplier_code: payload.supplier_code ? payload.supplier_code.trim() : null,
        contact_person: payload.contact_person ? payload.contact_person.trim() : null,
        phone: payload.phone ? payload.phone.trim() : null,
        email: payload.email ? payload.email.trim() : null,
        address: payload.address ? payload.address.trim() : null,
        lead_time_days: payload.lead_time_days ?? 3,
        notes: payload.notes ? payload.notes.trim() : null,
        is_active: payload.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as InventorySupplier;
  },

  // ----------------------------------------------------------------------------
  // 4. STOCK MOVEMENTS LEDGER (APPEND-ONLY)
  // ----------------------------------------------------------------------------

  /**
   * Retrieves stock movements with linked item, location, batch, and actor information.
   */
  async getMovements(
    practiceId?: string,
    filters?: StockMovementFilters
  ): Promise<InventoryStockMovementWithRelations[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    let query = supabase
      .from('inventory_stock_movements')
      .select(`
        *,
        item:inventory_items!fk_movement_item_practice (
          id,
          sku,
          name,
          category,
          base_unit
        ),
        location:inventory_locations!fk_movement_location_practice (
          id,
          name,
          code,
          location_type
        ),
        batch:inventory_item_batches!fk_movement_batch_practice (
          id,
          batch_number,
          expiry_date
        ),
        actor:profiles!inventory_stock_movements_actor_user_id_fkey (
          id,
          display_name,
          first_name,
          last_name
        )
      `)
      .eq('practice_id', activePracticeId)
      .order('created_at', { ascending: false });

    if (filters?.itemId) {
      query = query.eq('item_id', filters.itemId);
    }

    if (filters?.locationId) {
      query = query.eq('location_id', filters.locationId);
    }

    if (filters?.movementType && filters.movementType !== 'all') {
      query = query.eq('movement_type', filters.movementType);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return (data || []) as unknown as InventoryStockMovementWithRelations[];
  },

  // ----------------------------------------------------------------------------
  // 5. AUTHORITATIVE LEDGER OPERATIONS (RPCS)
  // ----------------------------------------------------------------------------

  /**
   * Records a stock receipt from a supplier into a designated location.
   */
  async receiveStock(
    payload: ReceiveStockPayload,
    practiceId?: string
  ): Promise<InventoryStockMovement> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('record_stock_receipt', {
      p_practice_id: activePracticeId,
      p_item_id: payload.item_id,
      p_location_id: payload.location_id,
      p_quantity: payload.quantity,
      p_unit_cost: payload.unit_cost ?? null,
      p_supplier_id: payload.supplier_id || null,
      p_supplier_invoice_ref: payload.supplier_invoice_ref || null,
      p_batch_number: payload.batch_number ? payload.batch_number.trim() : null,
      p_expiry_date: payload.expiry_date || null,
      p_idempotency_key: payload.idempotency_key || null,
      p_notes: payload.notes ? payload.notes.trim() : null,
    });

    if (error) {
      throw error;
    }

    return data as InventoryStockMovement;
  },

  /**
   * Records stock wastage or disposal of expired inventory.
   */
  async issueStock(
    payload: IssueStockPayload,
    practiceId?: string
  ): Promise<InventoryStockMovement> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('record_stock_issue', {
      p_practice_id: activePracticeId,
      p_item_id: payload.item_id,
      p_location_id: payload.location_id,
      p_batch_id: payload.batch_id || null,
      p_quantity: payload.quantity,
      p_issue_type: payload.issue_type || 'wastage',
      p_reason: payload.reason || 'damaged_in_storage',
      p_idempotency_key: payload.idempotency_key || null,
      p_notes: payload.notes ? payload.notes.trim() : null,
    });

    if (error) {
      throw error;
    }

    return data as InventoryStockMovement;
  },

  /**
   * Records clinical consumption during a patient clinical visit.
   * Non-blocking: stockout will log discrepancy rather than block patient care.
   */
  async recordClinicalConsumption(
    payload: ClinicalConsumptionPayload,
    practiceId?: string
  ): Promise<InventoryStockMovement> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('record_clinical_consumption', {
      p_practice_id: activePracticeId,
      p_visit_id: payload.visit_id,
      p_patient_id: payload.patient_id,
      p_item_id: payload.item_id,
      p_location_id: payload.location_id,
      p_batch_id: payload.batch_id || null,
      p_quantity: payload.quantity,
      p_idempotency_key: payload.idempotency_key || null,
      p_notes: payload.notes ? payload.notes.trim() : null,
    });

    if (error) {
      throw error;
    }

    return data as InventoryStockMovement;
  },

  /**
   * Records retail product sale linked to an invoice line.
   */
  async recordRetailSale(
    payload: RetailSaleStockPayload,
    practiceId?: string
  ): Promise<InventoryStockMovement> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('record_retail_sale', {
      p_practice_id: activePracticeId,
      p_invoice_line_id: payload.invoice_line_id,
      p_item_id: payload.item_id,
      p_location_id: payload.location_id,
      p_batch_id: payload.batch_id || null,
      p_quantity: payload.quantity,
      p_idempotency_key: payload.idempotency_key || null,
      p_notes: payload.notes ? payload.notes.trim() : null,
    });

    if (error) {
      throw error;
    }

    return data as InventoryStockMovement;
  },

  /**
   * Transfers stock atomically between two clinic locations.
   */
  async transferStock(
    payload: TransferStockPayload,
    practiceId?: string
  ): Promise<{ transfer_id: string; transfer_out_id: string; transfer_in_id: string }> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('transfer_stock_between_locations', {
      p_practice_id: activePracticeId,
      p_item_id: payload.item_id,
      p_source_location_id: payload.source_location_id,
      p_dest_location_id: payload.dest_location_id,
      p_batch_id: payload.batch_id || null,
      p_quantity: payload.quantity,
      p_idempotency_key: payload.idempotency_key || null,
      p_notes: payload.notes ? payload.notes.trim() : null,
    });

    if (error) {
      throw error;
    }

    return data as { transfer_id: string; transfer_out_id: string; transfer_in_id: string };
  },

  /**
   * Reconciles stock discrepancies based on a physical stocktake count.
   */
  async adjustStock(
    payload: AdjustStockPayload,
    practiceId?: string
  ): Promise<InventoryStockMovement | null> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('adjust_stock_balance', {
      p_practice_id: activePracticeId,
      p_item_id: payload.item_id,
      p_location_id: payload.location_id,
      p_batch_id: payload.batch_id || null,
      p_actual_physical_count: payload.actual_physical_count,
      p_reason: payload.reason || 'stocktake_discrepancy',
      p_idempotency_key: payload.idempotency_key || null,
      p_notes: payload.notes ? payload.notes.trim() : null,
    });

    if (error) {
      throw error;
    }

    return data as InventoryStockMovement | null;
  },

  /**
   * Reverses an existing movement by creating an equal and opposite counter-movement.
   */
  async reverseMovement(
    movementId: string,
    reason: string,
    practiceId?: string
  ): Promise<InventoryStockMovement> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('reverse_stock_movement', {
      p_practice_id: activePracticeId,
      p_movement_id_to_reverse: movementId,
      p_reason: reason.trim(),
    });

    if (error) {
      throw error;
    }

    return data as InventoryStockMovement;
  },
};
