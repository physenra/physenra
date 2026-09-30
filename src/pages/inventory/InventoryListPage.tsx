import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  ArrowRightLeft,
  SlidersHorizontal,
  MapPin,
  Truck,
  History,
  RefreshCw,
} from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type {
  InventoryItemWithRelations,
  InventoryItemCategory,
} from '../../types/models';

export const InventoryListPage: React.FC = () => {
  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant, isReceptionist } = useRole();
  const canManage = isOwner || isManager;
  const canOperate = isOwner || isManager || isAccountant || isReceptionist;

  const [items, setItems] = useState<InventoryItemWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('active');

  const loadItems = async () => {
    if (!activePractice) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getItems(activePractice.id, {
        category: categoryFilter === 'all' ? undefined : (categoryFilter as InventoryItemCategory),
        isActive: activeFilter === 'all' ? 'all' : activeFilter === 'active',
        lowStockOnly: lowStockOnly,
        searchQuery: searchQuery || undefined,
      });
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory items.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [activePractice, categoryFilter, lowStockOnly, activeFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-7 w-7 text-indigo-600" />
            Inventory & Consumables
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage clinical supplies, rehabilitation items, and derived stock levels across locations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/app/inventory/movements"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <History size={16} />
            Ledger
          </Link>
          <Link
            to="/app/inventory/locations"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <MapPin size={16} />
            Locations
          </Link>
          {canOperate && (
            <>
              <Link
                to="/app/inventory/receipt"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
              >
                <Truck size={16} />
                Receive Stock
              </Link>
              <Link
                to="/app/inventory/transfer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <ArrowRightLeft size={16} />
                Transfer
              </Link>
              <Link
                to="/app/inventory/adjust"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <SlidersHorizontal size={16} />
                Adjust / Count
              </Link>
            </>
          )}
          {canManage && (
            <Link
              to="/app/inventory/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition"
            >
              <Plus size={16} />
              New Item
            </Link>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by SKU, item name, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="clinical_consumable">Clinical Consumable</option>
              <option value="rehabilitation_supply">Rehabilitation Supply</option>
              <option value="disposable_sanitation">Disposable Sanitation</option>
              <option value="retail_product">Retail Product</option>
            </select>

            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="active">Active Only</option>
              <option value="all">All Statuses</option>
            </select>

            <button
              type="button"
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition ${
                lowStockOnly
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <AlertTriangle size={15} className={lowStockOnly ? 'text-amber-600' : 'text-gray-400'} />
              Low Stock Alert
            </button>

            <button
              onClick={loadItems}
              title="Refresh Items"
              className="p-2 text-gray-500 hover:text-gray-800 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="animate-spin h-6 w-6 mx-auto mb-2 text-indigo-600" />
            Loading inventory items...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <Package className="h-12 w-12 mx-auto text-gray-400" />
            <div className="text-base font-medium text-gray-900">No inventory items found</div>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Get started by registering clinical consumables, rehabilitation supplies, or retail stock.
            </p>
            {canManage && (
              <Link
                to="/app/inventory/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 mt-2"
              >
                <Plus size={16} />
                Create First Item
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">SKU / Item</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4 text-right">On Hand</th>
                  <th className="py-3 px-4 text-right">Reorder Level</th>
                  <th className="py-3 px-4">Stock Status</th>
                  <th className="py-3 px-4 text-center">Batch Tracked</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => {
                  const stock = item.total_stock ?? 0;
                  const reorder = Number(item.reorder_level || 0);
                  const isLow = stock <= reorder;
                  const isZero = stock === 0;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        <Link
                          to={`/app/inventory/${item.id}`}
                          className="hover:text-indigo-600 transition flex flex-col"
                        >
                          <span className="font-semibold">{item.name}</span>
                          <span className="text-xs text-gray-500 font-mono">{item.sku}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-gray-600 capitalize">
                        {item.category.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-gray-600 capitalize font-mono text-xs">
                        {item.base_unit}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold font-mono text-gray-900">
                        {stock.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500 font-mono text-xs">
                        {reorder.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        {isZero ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.requires_batch ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Batch Req.
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Standard</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/app/inventory/${item.id}`}
                          className="text-indigo-600 hover:text-indigo-900 font-medium text-xs inline-flex items-center gap-1"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
