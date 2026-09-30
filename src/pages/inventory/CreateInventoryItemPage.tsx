import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { usePractice } from '../../hooks/usePractice';
import type {
  InventoryItemCategory,
  InventoryBaseUnit,
  CreateInventoryItemPayload,
} from '../../types/models';

export const CreateInventoryItemPage: React.FC = () => {
  const navigate = useNavigate();
  const { activePractice } = usePractice();

  const [name, setName] = useState('');
  const [customSku, setCustomSku] = useState('');
  const [category, setCategory] = useState<InventoryItemCategory>('clinical_consumable');
  const [baseUnit, setBaseUnit] = useState<InventoryBaseUnit>('piece');
  const [reorderLevel, setReorderLevel] = useState(10);
  const [minimumStock, setMinimumStock] = useState(5);
  const [maximumStock, setMaximumStock] = useState<number | ''>('');
  const [isSterile, setIsSterile] = useState(false);
  const [requiresBatch, setRequiresBatch] = useState(false);
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice) return;
    if (!name.trim()) {
      setError('Item name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: CreateInventoryItemPayload = {
        name: name.trim(),
        category,
        base_unit: baseUnit,
        reorder_level: Number(reorderLevel) || 0,
        minimum_stock: Number(minimumStock) || 0,
        maximum_stock: maximumStock === '' ? null : Number(maximumStock),
        is_sterile: isSterile,
        requires_batch: requiresBatch,
        custom_sku: customSku.trim() ? customSku.trim().toUpperCase() : null,
        description: description.trim() || null,
      };

      const newItem = await inventoryService.createItem(payload, activePractice.id);
      navigate(`/app/inventory/${newItem.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create inventory item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/app/inventory"
          className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Inventory Item</h1>
          <p className="text-sm text-gray-500">Register a new supply, consumable, or clinical product.</p>
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
              Item Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rigid Strapping Tape (38mm)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom SKU (Optional)
            </label>
            <input
              type="text"
              value={customSku}
              onChange={(e) => setCustomSku(e.target.value)}
              placeholder="Leave blank to auto-generate ITM-XXXXXX"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-xs text-gray-400">If blank, system assigns next sequence SKU.</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as InventoryItemCategory)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="clinical_consumable">Clinical Consumable</option>
              <option value="rehabilitation_supply">Rehabilitation Supply</option>
              <option value="disposable_sanitation">Disposable Sanitation</option>
              <option value="retail_product">Retail Product</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base Unit of Measure *
            </label>
            <select
              value={baseUnit}
              onChange={(e) => setBaseUnit(e.target.value as InventoryBaseUnit)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="piece">Piece (pc)</option>
              <option value="roll">Roll</option>
              <option value="bottle">Bottle</option>
              <option value="pair">Pair</option>
              <option value="pack">Pack</option>
              <option value="meter">Meter (m)</option>
              <option value="tube">Tube</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reorder Trigger Level
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Safety Stock
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={minimumStock}
              onChange={(e) => setMinimumStock(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Storage Capacity (Optional)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={maximumStock}
              onChange={(e) => setMaximumStock(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="No ceiling"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description / Clinical Specifications
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Zinc oxide adhesive tape for joint stabilization and patellofemoral taping..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Quality and Tracking Flags */}
        <div className="pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition">
            <input
              type="checkbox"
              checked={requiresBatch}
              onChange={(e) => setRequiresBatch(e.target.checked)}
              className="mt-1 h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
            <div>
              <span className="text-sm font-semibold text-gray-900 block">Requires Batch / Lot Tracking</span>
              <span className="text-xs text-gray-500">
                Enforces batch numbers and expiration dates on stock receipts and issues.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition">
            <input
              type="checkbox"
              checked={isSterile}
              onChange={(e) => setIsSterile(e.target.checked)}
              className="mt-1 h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
            <div>
              <span className="text-sm font-semibold text-gray-900 block">Sterile Supply / Clinical Grade</span>
              <span className="text-xs text-gray-500">
                Marks item as sterile medical equipment (e.g. acupuncture needles, wound dressings).
              </span>
            </div>
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            to="/app/inventory"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition"
          >
            <Check size={16} />
            {isSubmitting ? 'Creating...' : 'Create Item'}
          </button>
        </div>
      </form>
    </div>
  );
};
