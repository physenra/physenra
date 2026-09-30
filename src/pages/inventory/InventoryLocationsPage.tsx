import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Plus, ArrowLeft, Check, AlertCircle, RefreshCw, Star } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type {
  InventoryLocationWithStock,
  InventoryLocationType,
  CreateInventoryLocationPayload,
} from '../../types/models';

export const InventoryLocationsPage: React.FC = () => {
  const { activePractice } = usePractice();
  const { isOwner, isManager } = useRole();
  const canManage = isOwner || isManager;

  const [locations, setLocations] = useState<InventoryLocationWithStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New location modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [locationType, setLocationType] = useState<InventoryLocationType>('treatment_room');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadLocations = async () => {
    if (!activePractice) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getLocations(activePractice.id);
      setLocations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load locations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, [activePractice]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice) return;
    if (!name.trim()) {
      setModalError('Location name is required.');
      return;
    }
    if (!code.trim()) {
      setModalError('Location code is required (e.g. ROOM-1).');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const payload: CreateInventoryLocationPayload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        location_type: locationType,
        description: description.trim() || null,
        is_default: isDefault,
      };

      await inventoryService.createLocation(payload, activePractice.id);
      setShowModal(false);
      setName('');
      setCode('');
      setDescription('');
      setIsDefault(false);
      loadLocations();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create storage location.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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
              <MapPin className="h-6 w-6 text-indigo-600" />
              Practice Storage Locations
            </h1>
            <p className="text-sm text-gray-500">
              Manage clinical rooms, central stores, mobile kits, and reception points.
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => {
              setModalError(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition"
          >
            <Plus size={16} />
            New Location
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Locations Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="animate-spin h-6 w-6 mx-auto mb-2 text-indigo-600" />
            Loading storage locations...
          </div>
        ) : locations.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-2">
            <MapPin className="h-10 w-10 text-gray-400 mx-auto" />
            <div className="text-base font-medium text-gray-900">No locations found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                  <th className="py-3 px-4">Location Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Unique Items</th>
                  <th className="py-3 px-4 text-right">Total Units</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {loc.name}
                        {loc.is_default && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <Star size={10} className="fill-amber-600 text-amber-600" />
                            Default Main Store
                          </span>
                        )}
                      </div>
                      {loc.description && (
                        <span className="text-xs text-gray-500 block mt-0.5">{loc.description}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-medium text-gray-700">
                      {loc.code}
                    </td>
                    <td className="py-3 px-4 capitalize text-gray-600 text-xs">
                      {loc.location_type.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-gray-900">
                      {loc.item_count ?? 0}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                      {(loc.total_units ?? 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {loc.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Location Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="text-indigo-600" size={20} />
              Add Storage Location
            </h3>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle size={16} />
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Treatment Room 2"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Location Code *
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. ROOM-02"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-gray-400">Unique alphanumeric code (2-32 characters).</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Location Type *
                </label>
                <select
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value as InventoryLocationType)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="treatment_room">Treatment Room</option>
                  <option value="central_store">Central Store</option>
                  <option value="mobile_kit">Mobile Kit / Field Bag</option>
                  <option value="reception">Reception / Retail Counter</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Upper floor physio cubicle with electrotherapy supplies..."
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="chkDefault" className="text-xs text-gray-700 cursor-pointer">
                  Set as practice default store location
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Check size={16} />
                  {isSubmitting ? 'Creating...' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
