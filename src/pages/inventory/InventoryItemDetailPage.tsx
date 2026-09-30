import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  AlertTriangle,
  History,
  Truck,
  ArrowRightLeft,
  SlidersHorizontal,
  Edit,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type {
  InventoryItemWithRelations,
  InventoryStockMovementWithRelations,
} from '../../types/models';

export const InventoryItemDetailPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant, isReceptionist } = useRole();
  const canOperate = isOwner || isManager || isAccountant || isReceptionist;
  const canManage = isOwner || isManager;

  const [item, setItem] = useState<InventoryItemWithRelations | null>(null);
  const [movements, setMovements] = useState<InventoryStockMovementWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit status modal
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editReorder, setEditReorder] = useState(10);
  const [editMin, setEditMin] = useState(5);
  const [editActive, setEditActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = async () => {
    if (!activePractice || !itemId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [itemData, movementsData] = await Promise.all([
        inventoryService.getItemById(itemId, activePractice.id),
        inventoryService.getMovements(activePractice.id, { itemId }),
      ]);
      setItem(itemData);
      setMovements(movementsData);
      setEditName(itemData.name);
      setEditReorder(Number(itemData.reorder_level || 0));
      setEditMin(Number(itemData.minimum_stock || 0));
      setEditActive(itemData.is_active);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory item details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activePractice, itemId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice || !itemId) return;
    setIsUpdating(true);
    try {
      await inventoryService.updateItem(
        itemId,
        {
          name: editName.trim(),
          reorder_level: Number(editReorder),
          minimum_stock: Number(editMin),
          is_active: editActive,
        },
        activePractice.id
      );
      setIsEditing(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update item.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-gray-500">
        <RefreshCw className="animate-spin h-6 w-6 mx-auto mb-2 text-indigo-600" />
        Loading item details...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-12 text-center text-gray-500 space-y-4">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <p className="text-base font-medium text-gray-900">Item not found or inaccessible.</p>
        <Link to="/app/inventory" className="text-indigo-600 hover:underline text-sm font-medium">
          Return to Inventory List
        </Link>
      </div>
    );
  }

  const stock = item.total_stock ?? 0;
  const reorder = Number(item.reorder_level || 0);
  const isLow = stock <= reorder;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/app/inventory"
            className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
              <span className="font-mono text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                {item.sku}
              </span>
              {item.is_active ? (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  Active
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                  Archived
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 capitalize mt-0.5">
              {item.category.replace('_', ' ')} • Unit: {item.base_unit}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canOperate && (
            <>
              <Link
                to={`/app/inventory/receipt?itemId=${item.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
              >
                <Truck size={16} />
                Receive Stock
              </Link>
              <Link
                to={`/app/inventory/transfer?itemId=${item.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <ArrowRightLeft size={16} />
                Transfer
              </Link>
              <Link
                to={`/app/inventory/adjust?itemId=${item.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <SlidersHorizontal size={16} />
                Adjust
              </Link>
            </>
          )}
          {canManage && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <Edit size={16} />
              {isEditing ? 'Cancel Edit' : 'Edit'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* Edit Form (if toggled) */}
      {isEditing && (
        <form onSubmit={handleUpdate} className="bg-white border border-indigo-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-base font-semibold text-gray-900">Edit Item Properties</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Item Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Reorder Level</label>
              <input
                type="number"
                min="0"
                value={editReorder}
                onChange={(e) => setEditReorder(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Safety Minimum</label>
              <input
                type="number"
                min="0"
                value={editMin}
                onChange={(e) => setEditMin(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Active item in catalog
            </label>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* Primary KPI & Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500">Total Derived Stock</div>
          <div className="mt-1 text-2xl font-bold font-mono text-gray-900">
            {stock.toFixed(2)} <span className="text-xs font-normal text-gray-500">{item.base_unit}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            {stock === 0 ? (
              <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                <XCircle size={12} /> Stockout
              </span>
            ) : isLow ? (
              <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle size={12} /> Below Reorder Trigger ({reorder})
              </span>
            ) : (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <CheckCircle2 size={12} /> Healthy Stock
              </span>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500">Reorder Threshold</div>
          <div className="mt-1 text-2xl font-bold font-mono text-gray-900">
            {reorder.toFixed(2)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Triggers stock replenishment</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500">Batch Management</div>
          <div className="mt-1 text-base font-semibold text-gray-900">
            {item.requires_batch ? 'Enforced' : 'Standard'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {item.batches?.length || 0} batches recorded
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500">Sterility Grade</div>
          <div className="mt-1 text-base font-semibold text-gray-900">
            {item.is_sterile ? 'Clinical Sterile' : 'Standard / Non-sterile'}
          </div>
          <div className="text-xs text-gray-400 mt-1">Medical compliance</div>
        </div>
      </div>

      {/* Stock Breakdown by Location */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <MapPin size={18} className="text-indigo-600" />
          Location Distribution
        </h2>
        {(!item.stock_by_location || item.stock_by_location.length === 0) ? (
          <p className="text-sm text-gray-500 italic">No stock currently held at any clinic location.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {item.stock_by_location.map((loc) => (
              <div
                key={loc.location_id}
                className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">{loc.location_name}</div>
                  <div className="text-xs text-gray-400 font-mono">Location ID: {loc.location_id.slice(0, 8)}...</div>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold font-mono text-gray-900">
                    {loc.quantity.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500 block">{item.base_unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batches & Expiry (if batch tracked) */}
      {item.requires_batch && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Calendar size={18} className="text-purple-600" />
            Active Batches & Expiry Dates
          </h2>
          {(!item.batches || item.batches.length === 0) ? (
            <p className="text-sm text-gray-500 italic">No batches registered for this item yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                    <th className="py-2.5 px-3">Batch Number</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {item.batches.map((batch) => {
                    const isExpired = new Date(batch.expiry_date) < new Date();
                    return (
                      <tr key={batch.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-mono font-medium text-gray-900">
                          {batch.batch_number}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 font-mono text-xs">
                          {batch.expiry_date}
                        </td>
                        <td className="py-2.5 px-3">
                          {isExpired ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Recent Movements Ledger */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <History size={18} className="text-indigo-600" />
            Recent Stock Movement Ledger
          </h2>
          <Link
            to={`/app/inventory/movements?itemId=${item.id}`}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            View All Ledger Entries →
          </Link>
        </div>

        {movements.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No movements recorded for this item yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Movement Type</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3 text-right">Delta</th>
                  <th className="py-2.5 px-3">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {movements.slice(0, 10).map((m) => {
                  const isPositive = Number(m.quantity_delta) > 0;
                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 text-xs text-gray-500 font-mono">
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-gray-900 font-medium capitalize">
                        {m.movement_type.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {m.location?.name || 'Unknown'}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold ${
                          isPositive ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {isPositive ? `+${m.quantity_delta}` : m.quantity_delta}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">
                        {m.actor?.display_name || 'Staff Member'}
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
