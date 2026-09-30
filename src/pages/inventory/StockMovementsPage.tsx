import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  History,
  ArrowLeft,
  RefreshCw,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type {
  InventoryStockMovementWithRelations,
  InventoryMovementType,
  InventoryItemWithRelations,
  InventoryLocation,
} from '../../types/models';

export const StockMovementsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialItemId = searchParams.get('itemId') || '';

  const { activePractice } = usePractice();
  const { isOwner, isManager } = useRole();
  const canReverse = isOwner || isManager;

  const [movements, setMovements] = useState<InventoryStockMovementWithRelations[]>([]);
  const [items, setItems] = useState<InventoryItemWithRelations[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedItemId, setSelectedItemId] = useState(initialItemId);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Reversal Modal
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [movementToReverse, setMovementToReverse] = useState<InventoryStockMovementWithRelations | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!activePractice) return;
    setIsLoading(true);
    setError(null);
    try {
      const [movementsData, itemsData, locationsData] = await Promise.all([
        inventoryService.getMovements(activePractice.id, {
          itemId: selectedItemId || undefined,
          locationId: selectedLocationId || undefined,
          movementType: selectedType === 'all' ? undefined : (selectedType as InventoryMovementType),
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
        }),
        inventoryService.getItems(activePractice.id),
        inventoryService.getLocations(activePractice.id),
      ]);
      setMovements(movementsData);
      setItems(itemsData);
      setLocations(locationsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock movements.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activePractice, selectedItemId, selectedLocationId, selectedType, startDate, endDate]);

  const handleOpenReverse = (movement: InventoryStockMovementWithRelations) => {
    setMovementToReverse(movement);
    setReversalReason('');
    setShowReverseModal(true);
  };

  const handleConfirmReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice || !movementToReverse) return;
    if (!reversalReason.trim()) {
      setError('Please provide a reason for this reversal.');
      return;
    }

    setIsReversing(true);
    setError(null);
    try {
      await inventoryService.reverseMovement(
        movementToReverse.id,
        reversalReason.trim(),
        activePractice.id
      );
      setSuccessMessage('Movement successfully reversed via immutable counter-movement.');
      setShowReverseModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to reverse stock movement.');
    } finally {
      setIsReversing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/app/inventory"
            className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <History className="h-7 w-7 text-indigo-600" />
              Stock Movement Ledger
            </h1>
            <p className="text-sm text-gray-500">
              Authoritative, append-only audit trail of all receipts, issues, transfers, and counts.
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 self-start sm:self-auto"
        >
          <RefreshCw size={16} />
          Refresh Ledger
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Item Filter</label>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Inventory Items</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.sku})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Location Filter</label>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Storage Locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Movement Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Movement Types</option>
            <option value="purchase_receipt">Purchase Receipt</option>
            <option value="clinical_consumption">Clinical Consumption</option>
            <option value="retail_sale">Retail Sale</option>
            <option value="transfer_in">Transfer In</option>
            <option value="transfer_out">Transfer Out</option>
            <option value="adjustment_in">Adjustment (Surplus)</option>
            <option value="adjustment_out">Adjustment (Shortage)</option>
            <option value="wastage">Wastage</option>
            <option value="expired">Expired Disposal</option>
            <option value="reversal">Reversal</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="animate-spin h-6 w-6 mx-auto mb-2 text-indigo-600" />
            Loading movement ledger...
          </div>
        ) : movements.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-2">
            <History className="h-10 w-10 text-gray-400 mx-auto" />
            <div className="text-base font-medium text-gray-900">No stock movements recorded</div>
            <p className="text-sm text-gray-500">
              Movements are created when stock is received, transferred, consumed, or counted.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Item (SKU)</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4 text-right">Delta</th>
                  <th className="py-3 px-4">Reference / Batch</th>
                  <th className="py-3 px-4">Recorded By</th>
                  {canReverse && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {movements.map((m) => {
                  const isPositive = Number(m.quantity_delta) > 0;
                  const isReversal = m.movement_type === 'reversal';

                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-4 font-mono text-xs text-gray-500">
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        <Link
                          to={`/app/inventory/${m.item_id}`}
                          className="hover:text-indigo-600 transition"
                        >
                          {m.item?.name || 'Unknown Item'}
                          <span className="block text-xs font-mono text-gray-500">
                            {m.item?.sku}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {m.location?.name || 'Clinic Store'}
                      </td>
                      <td className="py-3 px-4 capitalize">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            isPositive
                              ? 'bg-green-100 text-green-800'
                              : isReversal
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {m.movement_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold ${
                          isPositive ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {isPositive ? `+${m.quantity_delta}` : m.quantity_delta}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {m.batch?.batch_number ? (
                          <span className="font-mono bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">
                            Lot: {m.batch.batch_number}
                          </span>
                        ) : m.reference_type ? (
                          <span className="font-mono text-gray-600">Ref: {m.reference_type}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                        {m.notes && <p className="text-xs text-gray-400 italic truncate max-w-xs mt-0.5">{m.notes}</p>}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">
                        {m.actor?.display_name || 'Staff Member'}
                      </td>
                      {canReverse && (
                        <td className="py-3 px-4 text-right">
                          {!isReversal && (
                            <button
                              onClick={() => handleOpenReverse(m)}
                              title="Reverse movement"
                              className="text-xs font-medium text-gray-500 hover:text-red-600 transition inline-flex items-center gap-1"
                            >
                              <RotateCcw size={13} />
                              Reverse
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reversal Confirmation Modal */}
      {showReverseModal && movementToReverse && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <RotateCcw className="text-red-600" size={20} />
              Reverse Stock Movement
            </h3>
            <p className="text-sm text-gray-600">
              Stock movements in Physenra are strictly append-only. Reversing this will create an equal and opposite counter-movement of{' '}
              <strong className="font-mono text-gray-900">
                {Number(movementToReverse.quantity_delta) > 0 ? `-${movementToReverse.quantity_delta}` : `+${Math.abs(Number(movementToReverse.quantity_delta))}`}
              </strong>{' '}
              for <strong className="text-gray-900">{movementToReverse.item?.name}</strong>.
            </p>

            <form onSubmit={handleConfirmReversal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason for Reversal *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Inadvertent duplicate entry during morning receipt..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReverseModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReversing}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isReversing ? 'Reversing...' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
