// ==============================================================================
// PHYSENRA INVENTORY & CONSUMABLES FOUNDATION V1 VERIFICATION SUITE
// File: tests/inventory_consumables.test.cjs
//
// Verifies:
// 1. Schema integrity: 6 tables, multi-tenant composite foreign keys, zero mutable balance column
// 2. Option D append-only stock movement ledger & derived stock mathematics (SUM(quantity_delta))
// 3. Movement sign enforcement constraint (purchases/in > 0, consumption/sales/out/wastage < 0)
// 4. Immutability trigger denying update and delete on inventory_stock_movements
// 5. Atomic sequential SKU generator (ITM-000001) via practice_inventory_counters
// 6. Multi-location physical store model, single default location constraint, STORE-MAIN bootstrap
// 7. Supplier directory management with lead times and contact info
// 8. Batch/lot tracking with expiration validation (chk_inventory_batches_dates)
// 9. Base units of measure (piece, roll, bottle, pair, pack, meter, tube)
// 10. Authoritative ledger RPCs:
//     - get_inventory_stock_on_hand
//     - create_inventory_item
//     - record_stock_receipt
//     - record_stock_issue
//     - record_clinical_consumption (non-blocking clinical firewall)
//     - record_retail_sale (invoice line validation)
//     - transfer_stock_between_locations (deterministic deadlock-free locking)
//     - adjust_stock_balance (stocktake reconciliation)
//     - reverse_stock_movement (immutable counter-movement)
// 11. Strict Row-Level Security (RLS) & tenant isolation policies on all 6 tables
// 12. TypeScript database.ts & models.ts definitions with Relationships: []
// 13. Service layer inventoryService.ts completeness
// 14. UI pages & React Router v7 routes in App.tsx and Sidebar.tsx
// 15. Absolute domain boundary verification (Zero gateways/webhooks/crons/direct clinical blocks)
// 16. Non-negotiable physical isolation from legacy systems (Zero forbidden references)
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MIGRATION_PATH = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260930010000_inventory_consumables_foundation.sql'
);
const INVENTORY_SERVICE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'services',
  'inventoryService.ts'
);
const TYPES_DB_PATH = path.join(
  __dirname,
  '..',
  'src',
  'types',
  'database.ts'
);
const TYPES_MODELS_PATH = path.join(
  __dirname,
  '..',
  'src',
  'types',
  'models.ts'
);
const APP_PATH = path.join(
  __dirname,
  '..',
  'src',
  'App.tsx'
);
const SIDEBAR_PATH = path.join(
  __dirname,
  '..',
  'src',
  'components',
  'layout',
  'Sidebar.tsx'
);

const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
const inventoryServiceCode = fs.readFileSync(INVENTORY_SERVICE_PATH, 'utf8');
const typesDbCode = fs.readFileSync(TYPES_DB_PATH, 'utf8');
const typesModelsCode = fs.readFileSync(TYPES_MODELS_PATH, 'utf8');
const appCode = fs.readFileSync(APP_PATH, 'utf8');
const sidebarCode = fs.readFileSync(SIDEBAR_PATH, 'utf8');

test('PHYSENRA INVENTORY & CONSUMABLES FOUNDATION V1 VERIFICATION', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Database Schema & Relational Tenancy
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Database Schema & Relational Tenancy ---', async (st) => {
    await st.test('Migration creates practice_inventory_counters table', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.practice_inventory_counters'),
        'Must create public.practice_inventory_counters table'
      );
      assert(
        migrationSql.includes('chk_practice_inventory_counters_last_number CHECK (last_number >= 0)'),
        'Must enforce last_number >= 0'
      );
    });

    await st.test('Migration creates inventory_locations table with constraints', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.inventory_locations'),
        'Must create public.inventory_locations table'
      );
      assert(
        migrationSql.includes('CONSTRAINT uq_inventory_locations_id_practice UNIQUE (id, practice_id)'),
        'Must have composite unique key (id, practice_id)'
      );
      assert(
        migrationSql.includes('CONSTRAINT uq_inventory_locations_practice_code UNIQUE (practice_id, code)'),
        'Must enforce unique location code per practice'
      );
      assert(
        migrationSql.includes('uq_inventory_locations_one_default'),
        'Must enforce single default location index per practice'
      );
    });

    await st.test('Migration bootstraps STORE-MAIN default location for existing practices', () => {
      assert(
        migrationSql.includes("'STORE-MAIN'"),
        'Must seed STORE-MAIN default location code'
      );
      assert(
        migrationSql.includes('trg_initialize_practice_default_inventory_location'),
        'Must attach trigger to initialize STORE-MAIN for future practices'
      );
    });

    await st.test('Migration creates inventory_suppliers table with constraints', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.inventory_suppliers'),
        'Must create public.inventory_suppliers table'
      );
      assert(
        migrationSql.includes('CONSTRAINT uq_inventory_suppliers_id_practice UNIQUE (id, practice_id)'),
        'Must have composite unique key (id, practice_id)'
      );
      assert(
        migrationSql.includes('chk_inventory_suppliers_lead_time CHECK (lead_time_days >= 0)'),
        'Must enforce non-negative lead time'
      );
    });

    await st.test('Migration creates inventory_items table with zero mutable stock column', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.inventory_items'),
        'Must create public.inventory_items table'
      );
      assert(
        !migrationSql.match(/inventory_items\s*\([^;]*current_stock/i) &&
        !migrationSql.match(/inventory_items\s*\([^;]*stock_on_hand/i) &&
        !migrationSql.match(/inventory_items\s*\([^;]*balance_on_hand/i),
        'Must NOT contain mutable balance column on inventory_items'
      );
      assert(
        migrationSql.includes('reorder_level NUMERIC(12,2) NOT NULL DEFAULT 10.00'),
        'Must define reorder_level'
      );
      assert(
        migrationSql.includes('minimum_stock NUMERIC(12,2) NOT NULL DEFAULT 5.00'),
        'Must define minimum_stock'
      );
    });

    await st.test('Migration creates inventory_item_batches table with expiry validation', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.inventory_item_batches'),
        'Must create public.inventory_item_batches table'
      );
      assert(
        migrationSql.includes('chk_inventory_batches_dates CHECK (manufacture_date IS NULL OR expiry_date >= manufacture_date)'),
        'Must enforce expiry_date >= manufacture_date'
      );
      assert(
        migrationSql.includes('CONSTRAINT uq_inventory_item_batches_item_batch UNIQUE (practice_id, item_id, batch_number)'),
        'Must enforce unique batch number per item and practice'
      );
    });

    await st.test('Migration creates inventory_stock_movements append-only table', () => {
      assert(
        migrationSql.includes('CREATE TABLE IF NOT EXISTS public.inventory_stock_movements'),
        'Must create public.inventory_stock_movements table'
      );
      assert(
        migrationSql.includes('CONSTRAINT uq_inventory_stock_movements_idempotency UNIQUE (practice_id, idempotency_key)'),
        'Must enforce unique idempotency_key per practice'
      );
      assert(
        migrationSql.includes('CONSTRAINT chk_stock_movement_quantity_nonzero CHECK (quantity_delta <> 0.00)'),
        'Must reject zero delta movements'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Stock Mathematics, Immutability & Ledger Invariants (Option D)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: Stock Mathematics, Immutability & Ledger Invariants ---', async (st) => {
    await st.test('Enforces strict movement sign constraint chk_stock_movement_sign', () => {
      assert(
        migrationSql.includes('CONSTRAINT chk_stock_movement_sign CHECK'),
        'Must contain chk_stock_movement_sign constraint'
      );
      assert(
        migrationSql.includes("movement_type = 'purchase_receipt' AND quantity_delta > 0"),
        'Purchase receipts must have positive quantity delta'
      );
      assert(
        migrationSql.includes("movement_type = 'clinical_consumption' AND quantity_delta < 0"),
        'Clinical consumptions must have negative quantity delta'
      );
      assert(
        migrationSql.includes("movement_type = 'retail_sale' AND quantity_delta < 0"),
        'Retail sales must have negative quantity delta'
      );
      assert(
        migrationSql.includes("movement_type = 'transfer_out' AND quantity_delta < 0"),
        'Transfer out must have negative quantity delta'
      );
      assert(
        migrationSql.includes("movement_type = 'transfer_in' AND quantity_delta > 0"),
        'Transfer in must have positive quantity delta'
      );
      assert(
        migrationSql.includes("movement_type = 'wastage' AND quantity_delta < 0"),
        'Wastage must have negative quantity delta'
      );
      assert(
        migrationSql.includes("movement_type = 'expired' AND quantity_delta < 0"),
        'Expired disposal must have negative quantity delta'
      );
    });

    await st.test('Enforces strict append-only immutability trigger on movements', () => {
      assert(
        migrationSql.includes('prevent_inventory_movement_mutation'),
        'Must define prevent_inventory_movement_mutation function'
      );
      assert(
        migrationSql.includes('BEFORE UPDATE OR DELETE ON public.inventory_stock_movements'),
        'Must trigger BEFORE UPDATE OR DELETE on stock movements'
      );
      assert(
        migrationSql.includes('Inventory stock movements are strictly append-only and cannot be updated or deleted'),
        'Must throw explicit exception on attempted update or delete'
      );
    });

    await st.test('Derives stock mathematically as SUM(quantity_delta) via get_inventory_stock_on_hand', () => {
      assert(
        migrationSql.includes('FUNCTION public.get_inventory_stock_on_hand'),
        'Must define get_inventory_stock_on_hand'
      );
      assert(
        migrationSql.includes('COALESCE(SUM(m.quantity_delta), 0.00)::NUMERIC(12,2) AS derived_stock'),
        'Derived stock must strictly equal SUM(quantity_delta)'
      );
      assert(
        migrationSql.includes('GROUP BY m.item_id, m.location_id'),
        'Must aggregate by item and location'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: Authoritative RPCs & Business Rules
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Authoritative RPCs & Business Rules ---', async (st) => {
    await st.test('RPC 1: generate_next_inventory_item_sku generates sequence ITM-XXXXXX', () => {
      assert(
        migrationSql.includes('FUNCTION public.generate_next_inventory_item_sku'),
        'Must define generate_next_inventory_item_sku'
      );
      assert(
        migrationSql.includes("'ITM-' || LPAD(v_next_val::TEXT, 6, '0')"),
        'Must format SKU as ITM-000001'
      );
    });

    await st.test('RPC 2: create_inventory_item creates catalog item with audit logging', () => {
      assert(
        migrationSql.includes('FUNCTION public.create_inventory_item'),
        'Must define create_inventory_item'
      );
      assert(
        migrationSql.includes("log_audit_event"),
        'Must log audit event upon creation'
      );
      assert(
        migrationSql.includes("'inventory_item_created'"),
        'Must use action inventory_item_created'
      );
    });

    await st.test('RPC 3: record_stock_receipt enforces positive quantity and idempotency', () => {
      assert(
        migrationSql.includes('FUNCTION public.record_stock_receipt'),
        'Must define record_stock_receipt'
      );
      assert(
        migrationSql.includes('Receipt quantity must be strictly greater than zero'),
        'Must validate receipt quantity > 0'
      );
      assert(
        migrationSql.includes('idempotency_key = v_key'),
        'Must check existing idempotency_key'
      );
    });

    await st.test('RPC 4: record_stock_issue handles wastage and expired write-offs', () => {
      assert(
        migrationSql.includes('FUNCTION public.record_stock_issue'),
        'Must define record_stock_issue'
      );
      assert(
        migrationSql.includes('p_issue_type NOT IN (\'wastage\', \'expired\')'),
        'Must validate issue type is wastage or expired'
      );
      assert(
        migrationSql.includes('-ABS(p_quantity)'),
        'Must ensure negative delta'
      );
    });

    await st.test('RPC 5: record_clinical_consumption implements non-blocking clinical firewall', () => {
      assert(
        migrationSql.includes('FUNCTION public.record_clinical_consumption'),
        'Must define record_clinical_consumption'
      );
      assert(
        migrationSql.includes('STOCKOUT DISCREPANCY: Physical usage recorded with zero system stock'),
        'Must note stockout discrepancy instead of aborting patient encounter'
      );
      assert(
        migrationSql.includes("'inventory_stockout_consumption_discrepancy'"),
        'Must log stockout discrepancy audit event'
      );
      assert(
        migrationSql.includes('Cannot clinically consume expired stock'),
        'Must prevent patient administration of expired stock'
      );
    });

    await st.test('RPC 6: record_retail_sale validates non-void invoice line', () => {
      assert(
        migrationSql.includes('FUNCTION public.record_retail_sale'),
        'Must define record_retail_sale'
      );
      assert(
        migrationSql.includes('Cannot record retail stock issue for invoice in % status'),
        'Must reject draft or void invoice lines'
      );
      assert(
        migrationSql.includes('Insufficient stock available for retail sale'),
        'Must prevent overselling retail product'
      );
    });

    await st.test('RPC 7: transfer_stock_between_locations uses deterministic UUID ordering for deadlock prevention', () => {
      assert(
        migrationSql.includes('FUNCTION public.transfer_stock_between_locations'),
        'Must define transfer_stock_between_locations'
      );
      assert(
        migrationSql.includes('p_source_location_id < p_dest_location_id'),
        'Must order lock acquisition by UUID to prevent PostgreSQL deadlocks'
      );
      assert(
        migrationSql.includes("v_key || '_out'") && migrationSql.includes("v_key || '_in'"),
        'Must record paired 2-legged transfer movements'
      );
    });

    await st.test('RPC 8: adjust_stock_balance reconciles physical stocktake counts', () => {
      assert(
        migrationSql.includes('FUNCTION public.adjust_stock_balance'),
        'Must define adjust_stock_balance'
      );
      assert(
        migrationSql.includes('v_variance := p_actual_physical_count - v_current_stock'),
        'Must calculate delta variance from physical count'
      );
      assert(
        migrationSql.includes("v_type := 'adjustment_in'") && migrationSql.includes("v_type := 'adjustment_out'"),
        'Must assign adjustment_in or adjustment_out based on variance sign'
      );
    });

    await st.test('RPC 9: reverse_stock_movement creates immutable counter-movement', () => {
      assert(
        migrationSql.includes('FUNCTION public.reverse_stock_movement'),
        'Must define reverse_stock_movement'
      );
      assert(
        migrationSql.includes('-1.00 * v_orig.quantity_delta'),
        'Must invert the original quantity delta'
      );
      assert(
        migrationSql.includes("reversal_of_movement_id = p_movement_id_to_reverse"),
        'Must prevent duplicate reversal of the same movement'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Row-Level Security & Role-Based Access Control
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Row-Level Security & Role-Based Access Control ---', async (st) => {
    const tables = [
      'practice_inventory_counters',
      'inventory_locations',
      'inventory_suppliers',
      'inventory_items',
      'inventory_item_batches',
      'inventory_stock_movements',
    ];

    for (const table of tables) {
      await st.test(`Table ${table} has Row-Level Security enabled`, () => {
        assert(
          migrationSql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`),
          `Table public.${table} must have RLS enabled`
        );
      });

      await st.test(`Table ${table} has practice isolation policies`, () => {
        assert(
          migrationSql.includes(`ON public.${table}`),
          `Table public.${table} must have RLS policies defined`
        );
      });
    }

    await st.test('Ensures 100% of public tables maintain RLS coverage', () => {
      const rlsStatements = (migrationSql.match(/ENABLE ROW LEVEL SECURITY/g) || []).length;
      assert(
        rlsStatements >= 6,
        `Expected at least 6 ENABLE ROW LEVEL SECURITY statements, found ${rlsStatements}`
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: TypeScript Types & Database Contracts
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: TypeScript Types & Database Contracts ---', async (st) => {
    await st.test('database.ts exports inventory enums', () => {
      assert(typesDbCode.includes('export type InventoryLocationType'), 'Must export InventoryLocationType');
      assert(typesDbCode.includes('export type InventoryItemCategory'), 'Must export InventoryItemCategory');
      assert(typesDbCode.includes('export type InventoryBaseUnit'), 'Must export InventoryBaseUnit');
      assert(typesDbCode.includes('export type InventoryMovementType'), 'Must export InventoryMovementType');
      assert(typesDbCode.includes('export type InventoryAdjustmentReason'), 'Must export InventoryAdjustmentReason');
    });

    await st.test('database.ts defines all 6 inventory tables with Relationships: []', () => {
      assert(typesDbCode.includes('practice_inventory_counters: {'), 'Must define practice_inventory_counters table');
      assert(typesDbCode.includes('inventory_locations: {'), 'Must define inventory_locations table');
      assert(typesDbCode.includes('inventory_suppliers: {'), 'Must define inventory_suppliers table');
      assert(typesDbCode.includes('inventory_items: {'), 'Must define inventory_items table');
      assert(typesDbCode.includes('inventory_item_batches: {'), 'Must define inventory_item_batches table');
      assert(typesDbCode.includes('inventory_stock_movements: {'), 'Must define inventory_stock_movements table');

      const countersRel = typesDbCode.indexOf('practice_inventory_counters: {');
      assert(countersRel !== -1 && typesDbCode.slice(countersRel, countersRel + 800).includes('Relationships: [];'), 'practice_inventory_counters must have Relationships: []');

      const itemsRel = typesDbCode.indexOf('inventory_items: {');
      assert(itemsRel !== -1 && typesDbCode.slice(itemsRel, itemsRel + 2500).includes('Relationships: [];'), 'inventory_items must have Relationships: []');

      const movementsRel = typesDbCode.indexOf('inventory_stock_movements: {');
      assert(movementsRel !== -1 && typesDbCode.slice(movementsRel, movementsRel + 2500).includes('Relationships: [];'), 'inventory_stock_movements must have Relationships: []');
    });

    await st.test('database.ts defines inventory RPCs in Functions section', () => {
      assert(typesDbCode.includes('get_inventory_stock_on_hand: {'), 'Must define get_inventory_stock_on_hand RPC in Functions');
      assert(typesDbCode.includes('record_stock_receipt: {'), 'Must define record_stock_receipt RPC in Functions');
      assert(typesDbCode.includes('transfer_stock_between_locations: {'), 'Must define transfer_stock_between_locations RPC in Functions');
      assert(typesDbCode.includes('adjust_stock_balance: {'), 'Must define adjust_stock_balance RPC in Functions');
      assert(typesDbCode.includes('reverse_stock_movement: {'), 'Must define reverse_stock_movement RPC in Functions');
    });

    await st.test('models.ts exports domain models and payloads', () => {
      assert(typesModelsCode.includes('export interface InventoryItemWithRelations'), 'Must export InventoryItemWithRelations');
      assert(typesModelsCode.includes('export interface InventoryStockMovementWithRelations'), 'Must export InventoryStockMovementWithRelations');
      assert(typesModelsCode.includes('export interface ReceiveStockPayload'), 'Must export ReceiveStockPayload');
      assert(typesModelsCode.includes('export interface TransferStockPayload'), 'Must export TransferStockPayload');
      assert(typesModelsCode.includes('export interface AdjustStockPayload'), 'Must export AdjustStockPayload');
      assert(typesModelsCode.includes('export interface ClinicalConsumptionPayload'), 'Must export ClinicalConsumptionPayload');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Service Layer Completeness (inventoryService.ts)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Service Layer Completeness ---', async (st) => {
    await st.test('inventoryService implements getItems and getItemById', () => {
      assert(typeof inventoryServiceCode === 'string', 'Service code must be loaded');
      assert(inventoryServiceCode.includes('async getItems('), 'Must implement getItems');
      assert(inventoryServiceCode.includes('async getItemById('), 'Must implement getItemById');
    });

    await st.test('inventoryService implements createItem and updateItem', () => {
      assert(inventoryServiceCode.includes('async createItem('), 'Must implement createItem');
      assert(inventoryServiceCode.includes('async updateItem('), 'Must implement updateItem');
    });

    await st.test('inventoryService implements locations and suppliers queries', () => {
      assert(inventoryServiceCode.includes('async getLocations('), 'Must implement getLocations');
      assert(inventoryServiceCode.includes('async createLocation('), 'Must implement createLocation');
      assert(inventoryServiceCode.includes('async getSuppliers('), 'Must implement getSuppliers');
      assert(inventoryServiceCode.includes('async createSupplier('), 'Must implement createSupplier');
    });

    await st.test('inventoryService implements getMovements ledger query', () => {
      assert(inventoryServiceCode.includes('async getMovements('), 'Must implement getMovements');
    });

    await st.test('inventoryService calls all authoritative RPCs', () => {
      assert(inventoryServiceCode.includes("supabase.rpc('record_stock_receipt'"), 'Must call record_stock_receipt RPC');
      assert(inventoryServiceCode.includes("supabase.rpc('record_stock_issue'"), 'Must call record_stock_issue RPC');
      assert(inventoryServiceCode.includes("supabase.rpc('record_clinical_consumption'"), 'Must call record_clinical_consumption RPC');
      assert(inventoryServiceCode.includes("supabase.rpc('record_retail_sale'"), 'Must call record_retail_sale RPC');
      assert(inventoryServiceCode.includes("supabase.rpc('transfer_stock_between_locations'"), 'Must call transfer_stock_between_locations RPC');
      assert(inventoryServiceCode.includes("supabase.rpc('adjust_stock_balance'"), 'Must call adjust_stock_balance RPC');
      assert(inventoryServiceCode.includes("supabase.rpc('reverse_stock_movement'"), 'Must call reverse_stock_movement RPC');
    });

    await st.test('inventoryService enforces tenant context validation', () => {
      const tenantCheckCount = (inventoryServiceCode.match(/Tenant context required: Active practice ID is missing/g) || []).length;
      assert(tenantCheckCount >= 10, `Expected at least 10 tenant context checks, found ${tenantCheckCount}`);
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 7: UI Pages & React Navigation Routes
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 7: UI Pages & React Navigation Routes ---', async (st) => {
    const requiredPages = [
      'InventoryListPage.tsx',
      'CreateInventoryItemPage.tsx',
      'InventoryItemDetailPage.tsx',
      'StockMovementsPage.tsx',
      'ReceiveStockPage.tsx',
      'TransferStockPage.tsx',
      'AdjustStockPage.tsx',
      'InventoryLocationsPage.tsx',
    ];

    for (const page of requiredPages) {
      await st.test(`Page ${page} exists in src/pages/inventory/`, () => {
        const pagePath = path.join(__dirname, '..', 'src', 'pages', 'inventory', page);
        assert(fs.existsSync(pagePath), `Page file ${page} must exist`);
      });
    }

    await st.test('App.tsx registers all inventory routes', () => {
      assert(appCode.includes('<Route path="inventory" element={<InventoryListPage />} />'), 'Must register /app/inventory');
      assert(appCode.includes('<Route path="inventory/new" element={<CreateInventoryItemPage />} />'), 'Must register /app/inventory/new');
      assert(appCode.includes('<Route path="inventory/movements" element={<StockMovementsPage />} />'), 'Must register /app/inventory/movements');
      assert(appCode.includes('<Route path="inventory/receipt" element={<ReceiveStockPage />} />'), 'Must register /app/inventory/receipt');
      assert(appCode.includes('<Route path="inventory/transfer" element={<TransferStockPage />} />'), 'Must register /app/inventory/transfer');
      assert(appCode.includes('<Route path="inventory/adjust" element={<AdjustStockPage />} />'), 'Must register /app/inventory/adjust');
      assert(appCode.includes('<Route path="inventory/locations" element={<InventoryLocationsPage />} />'), 'Must register /app/inventory/locations');
      assert(appCode.includes('<Route path="inventory/:itemId" element={<InventoryItemDetailPage />} />'), 'Must register /app/inventory/:itemId');
    });

    await st.test('Sidebar.tsx renders navigation link to /app/inventory', () => {
      assert(sidebarCode.includes('to="/app/inventory"'), 'Must have NavLink to /app/inventory');
      assert(sidebarCode.includes('Boxes'), 'Must use Boxes icon for inventory');
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 8: Non-Negotiable Project Isolation & Zero Legacy References
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 8: Non-Negotiable Project Isolation ---', async (st) => {
    const legacyName = ['kab', 'world'].join('');
    await st.test('Migration contains zero references to legacy project', () => {
      assert(
        !migrationSql.toLowerCase().includes(legacyName),
        'Migration must not contain references to legacy project'
      );
    });

    await st.test('inventoryService contains zero references to legacy project', () => {
      assert(
        !inventoryServiceCode.toLowerCase().includes(legacyName),
        'inventoryService must not contain references to legacy project'
      );
    });

    await st.test('Domain maintains strict non-blocking clinical care firewall', () => {
      assert(
        migrationSql.includes('STOCKOUT DISCREPANCY') &&
        migrationSql.includes('record_clinical_consumption'),
        'Clinical care/documentation must never be blocked by stock shortages'
      );
    });
  });
});
