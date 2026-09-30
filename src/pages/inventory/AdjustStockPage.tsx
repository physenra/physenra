import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, ArrowLeft, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { usePractice } from '../../hooks/usePractice';
import type {
  InventoryItemWithRelations,
  InventoryLocation,
  InventoryAdjustmentReason,
  AdjustStockPayload,
  IssueStockPayload,
} from '../../types/models';

export const AdjustStockPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedItemId = searchParams.get('itemId') || '';

  const { activePractice } = usePractice();

  const [items, setItems] = useState<InventoryItemWithRelations[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tab: 'stocktake' (Count Reconciliation) vs 'writeoff' (Damage/Expired writeoff)
  const [mode, setMode] = useState<'stocktake' | 'writeoff'>('stocktake');

  // Form State
  const [selectedItemId, setSelectedItemId] = useState(preselectedItemId);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [physicalCount, setPhysicalCount] = useState<number>(0);
  const [writeoffQty, setWriteoffQty] = useState<number>(1);
  const [reason, setReason] = useState<InventoryAdjustmentReason>('stocktake_discrepancy');
  const [issueType, setIssueType] = useState<'wastage' | 'expired'>('wastage');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPrerequisites = async () => {
      if (!activePractice) return;
      setIsLoading(true);
      setError(null);
      try {
        const [itemsData, locationsData] = await Promise.all([
          inventoryService.getItems(activePractice.id, { isActive: true }),
          inventoryService.getLocations(activePractice.id),
        ]);
        setItems(itemsData);
        setLocations(locationsData);

        const defaultLoc = locationsData.find((l) => l.is_default) || locationsData[0];
        if (defaultLoc) {
          setSelectedLocationId(defaultLoc.id);
        }

        if (preselectedItemId) {
          setSelectedItemId(preselectedItemId);
        } else if (itemsData.length > 0) {
          setSelectedItemId(itemsData[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load adjustment requirements.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPrerequisites();
  }, [activePractice, preselectedItemId]);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice) return;

    if (!selectedItemId) {
      setError('Please select an inventory item.');
      return;
    }
    if (!selectedLocationId) {
      setError('Please select a storage location.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'stocktake') {
        const payload: AdjustStockPayload = {
          item_id: selectedItemId,
          location_id: selectedLocationId,
          actual_physical_count: Number(physicalCount),
          reason: reason,
          batch_id: selectedBatchId || null,
          notes: notes.trim() || null,
        };
        await inventoryService.adjustStock(payload, activePractice.id);
      } else {
        const payload: IssueStockPayload = {
          item_id: selectedItemId,
          location_id: selectedLocationId,
          quantity: Number(writeoffQty),
          issue_type: issueType,
          reason: reason,
          batch_id: selectedBatchId || null,
          notes: notes.trim() || null,
        };
        await inventoryService.issueStock(payload, activePractice.id);
      }

      navigate(`/app/inventory/${selectedItemId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to perform stock adjustment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-gray-500">
        <RefreshCw className="animate-spin h-6 w-6 mx-auto mb-2 text-indigo-600" />
        Loading adjustment prerequisites...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/app/inventory"
          className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <SlidersHorizontal className="h-6 w-6 text-indigo-600" />
            Stock Adjustment & Reconciliation
          </h1>
          <p className="text-sm text-gray-500">Record stocktake count discrepancies or write off damaged/expired stock.</p>
        </div>
      </div>

      {/* Mode selection tabs */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => {
            setMode('stocktake');
            setReason('stocktake_discrepancy');
          }}
          className={`py-2 px-4 text-sm font-medium border-b-2 transition ${
            mode === 'stocktake'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Physical Count Reconciliation
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('writeoff');
            setReason('damaged_in_storage');
          }}
          className={`py-2 px-4 text-sm font-medium border-b-2 transition ${
            mode === 'writeoff'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Damage / Expired Write-Off
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Inventory Item *
            </label>
            <select
              required
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.sku}) — Total on hand: {i.total_stock ?? 0} {i.base_unit}s
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Storage Location *
            </label>
            <select
              required
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.is_default ? '(Main)' : ''}
                </option>
              ))}
            </select>
          </div>

          {mode === 'stocktake' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Actual Counted Physical Quantity *
              </label>
              <input
                type="number"
                required
                min="0"
                step="1"
                value={physicalCount}
                onChange={(e) => setPhysicalCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-gray-500">System ledger will adjust by the delta variance.</span>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disposal Type *
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value as 'wastage' | 'expired')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="wastage">Clinical Wastage / Spoilage</option>
                  <option value="expired">Expired Shelf Inventory</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity to Write-Off *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={writeoffQty}
                  onChange={(e) => setWriteoffQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discrepancy / Write-Off Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as InventoryAdjustmentReason)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="stocktake_discrepancy">Stocktake Discrepancy</option>
              <option value="damaged_in_storage">Damaged in Storage / Clinic</option>
              <option value="expired_on_shelf">Expired on Shelf</option>
              <option value="clerical_error">Clerical / Recording Error</option>
              <option value="theft_or_loss">Theft, Misplacement, or Loss</option>
            </select>
          </div>

          {selectedItem?.requires_batch && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specific Batch (Optional)
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">No Batch Specific</option>
                {(selectedItem.batches || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batch_number} (Exp: {b.expiry_date})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Audit Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Clinical reason, physical count sheets reference, or disposal method..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            to="/app/inventory"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
          >
            <Check size={16} />
            {isSubmitting ? 'Adjusting...' : mode === 'stocktake' ? 'Reconcile Count' : 'Record Write-Off'}
          </button>
        </div>
      </form>
    </div>
  );
};
