import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Truck, ArrowLeft, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { usePractice } from '../../hooks/usePractice';
import type {
  InventoryItemWithRelations,
  InventoryLocation,
  InventorySupplier,
  ReceiveStockPayload,
} from '../../types/models';

export const ReceiveStockPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedItemId = searchParams.get('itemId') || '';

  const { activePractice } = usePractice();

  const [items, setItems] = useState<InventoryItemWithRelations[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [suppliers, setSuppliers] = useState<InventorySupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [selectedItemId, setSelectedItemId] = useState(preselectedItemId);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number | ''>('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPrerequisites = async () => {
      if (!activePractice) return;
      setIsLoading(true);
      setError(null);
      try {
        const [itemsData, locationsData, suppliersData] = await Promise.all([
          inventoryService.getItems(activePractice.id, { isActive: true }),
          inventoryService.getLocations(activePractice.id),
          inventoryService.getSuppliers(activePractice.id),
        ]);
        setItems(itemsData);
        setLocations(locationsData);
        setSuppliers(suppliersData);

        // Default location
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
        setError(err.message || 'Failed to load form requirements.');
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
    if (!quantity || quantity <= 0) {
      setError('Receipt quantity must be strictly greater than 0.');
      return;
    }

    if (selectedItem?.requires_batch) {
      if (!batchNumber.trim()) {
        setError('Batch / lot number is required for this item.');
        return;
      }
      if (!expiryDate) {
        setError('Expiration date is required for this item.');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: ReceiveStockPayload = {
        item_id: selectedItemId,
        location_id: selectedLocationId,
        quantity: Number(quantity),
        unit_cost: unitCost === '' ? null : Number(unitCost),
        supplier_id: selectedSupplierId || null,
        supplier_invoice_ref: invoiceRef.trim() || null,
        batch_number: batchNumber.trim() || null,
        expiry_date: expiryDate || null,
        notes: notes.trim() || null,
      };

      await inventoryService.receiveStock(payload, activePractice.id);
      navigate(`/app/inventory/${selectedItemId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to record stock receipt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-gray-500">
        <RefreshCw className="animate-spin h-6 w-6 mx-auto mb-2 text-indigo-600" />
        Loading stock receipt form...
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
            <Truck className="h-6 w-6 text-indigo-600" />
            Receive Stock
          </h1>
          <p className="text-sm text-gray-500">Record incoming inventory goods from a supplier or vendor.</p>
        </div>
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
                  {i.name} ({i.sku}) — {i.category.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination Location *
            </label>
            <select
              required
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.is_default ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier (Optional)
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No Supplier Specified</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.supplier_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity Received *
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Purchase Cost (Optional)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Invoice / Delivery Note #
            </label>
            <input
              type="text"
              value={invoiceRef}
              onChange={(e) => setInvoiceRef(e.target.value)}
              placeholder="e.g. INV-2026-99182"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Batch / Expiry Section */}
        {selectedItem?.requires_batch && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
            <h4 className="text-sm font-semibold text-purple-900">
              Batch & Lot Tracking Required
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-purple-900 mb-1">
                  Batch / Lot Number *
                </label>
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. LOT-2026-A"
                  className="w-full px-3 py-1.5 border border-purple-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-purple-900 mb-1">
                  Expiration Date *
                </label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Receipt Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Condition of package, storage notes, or inspection details..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          />
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
            {isSubmitting ? 'Receiving...' : 'Confirm Stock Receipt'}
          </button>
        </div>
      </form>
    </div>
  );
};
