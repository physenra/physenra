import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowRightLeft, ArrowLeft, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { usePractice } from '../../hooks/usePractice';
import type {
  InventoryItemWithRelations,
  InventoryLocation,
  TransferStockPayload,
} from '../../types/models';

export const TransferStockPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedItemId = searchParams.get('itemId') || '';

  const { activePractice } = usePractice();

  const [items, setItems] = useState<InventoryItemWithRelations[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [selectedItemId, setSelectedItemId] = useState(preselectedItemId);
  const [sourceLocId, setSourceLocId] = useState('');
  const [destLocId, setDestLocId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
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

        if (locationsData.length >= 2) {
          setSourceLocId(locationsData[0].id);
          setDestLocId(locationsData[1].id);
        } else if (locationsData.length === 1) {
          setSourceLocId(locationsData[0].id);
        }

        if (preselectedItemId) {
          setSelectedItemId(preselectedItemId);
        } else if (itemsData.length > 0) {
          setSelectedItemId(itemsData[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load transfer requirements.');
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
      setError('Please select an item to transfer.');
      return;
    }
    if (!sourceLocId || !destLocId) {
      setError('Source and destination locations are required.');
      return;
    }
    if (sourceLocId === destLocId) {
      setError('Source and destination locations must be distinct.');
      return;
    }
    if (!quantity || quantity <= 0) {
      setError('Transfer quantity must be strictly greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: TransferStockPayload = {
        item_id: selectedItemId,
        source_location_id: sourceLocId,
        dest_location_id: destLocId,
        quantity: Number(quantity),
        batch_id: selectedBatchId || null,
        notes: notes.trim() || null,
      };

      await inventoryService.transferStock(payload, activePractice.id);
      navigate(`/app/inventory/${selectedItemId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to execute atomic transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-gray-500">
        <RefreshCw className="animate-spin h-6 w-6 mx-auto mb-2 text-indigo-600" />
        Loading transfer options...
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
            <ArrowRightLeft className="h-6 w-6 text-indigo-600" />
            Transfer Stock Between Locations
          </h1>
          <p className="text-sm text-gray-500">Atomic two-legged inventory relocation within practice premises.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {locations.length < 2 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-amber-600 mx-auto" />
          <h3 className="text-base font-semibold text-amber-900">At Least Two Locations Required</h3>
          <p className="text-sm text-amber-700 max-w-md mx-auto">
            You must have at least two storage locations (e.g. Main Store and Treatment Room 1) to transfer stock.
          </p>
          <Link
            to="/app/inventory/locations"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700"
          >
            Create New Location
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inventory Item *
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
                Source Location (Transfer From) *
              </label>
              <select
                required
                value={sourceLocId}
                onChange={(e) => setSourceLocId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id} disabled={loc.id === destLocId}>
                    {loc.name} {loc.is_default ? '(Main)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destination Location (Transfer To) *
              </label>
              <select
                required
                value={destLocId}
                onChange={(e) => setDestLocId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id} disabled={loc.id === sourceLocId}>
                    {loc.name} {loc.is_default ? '(Main)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transfer Quantity *
              </label>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500"
              />
              {selectedItem && (
                <span className="text-xs text-gray-400">Measured in: {selectedItem.base_unit}s</span>
              )}
            </div>

            {selectedItem?.requires_batch && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Selection (Optional)
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Any Available Batch</option>
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
                Transfer Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for transfer, clinic room allocation..."
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
              {isSubmitting ? 'Transferring...' : 'Execute Transfer'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
