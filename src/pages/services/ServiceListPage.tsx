import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Tag,
  Search,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Edit2,
  Filter,
} from 'lucide-react';
import { serviceCatalogService } from '../../services/serviceCatalogService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type { Service, ServiceCategory } from '../../types/models';

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  consultation: 'Consultation',
  assessment: 'Assessment',
  treatment: 'Treatment',
  rehabilitation: 'Rehabilitation',
  home_visit: 'Home Visit',
  reassessment: 'Reassessment',
  group_class: 'Group Class',
  other: 'Other',
};

export const ServiceListPage: React.FC = () => {
  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant } = useRole();
  const canManageServices = isOwner || isManager || isAccountant;

  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const categoryFilter = (searchParams.get('category') as ServiceCategory | 'all') || 'all';
  const statusFilter = searchParams.get('status') || 'all';
  const searchQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Quick edit modal state
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<ServiceCategory>('treatment');
  const [editDuration, setEditDuration] = useState(30);
  const [editDeliveryMode, setEditDeliveryMode] = useState('all');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadServices = async () => {
    if (!activePractice) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await serviceCatalogService.getServices(activePractice.id, {
        category: categoryFilter,
        isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : 'all',
        searchQuery: searchQuery || undefined,
      });
      setServices(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load services.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [activePractice, categoryFilter, statusFilter, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('q', searchInput.trim());
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };

  const handleCategoryChange = (category: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (category && category !== 'all') {
      newParams.set('category', category);
    } else {
      newParams.delete('category');
    }
    setSearchParams(newParams);
  };

  const handleStatusChange = (status: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (status && status !== 'all') {
      newParams.set('status', status);
    } else {
      newParams.delete('status');
    }
    setSearchParams(newParams);
  };

  const handleToggleStatus = async (service: Service) => {
    if (!canManageServices || !activePractice) return;
    try {
      await serviceCatalogService.toggleServiceStatus(service.id, !service.is_active, activePractice.id);
      await loadServices();
    } catch (err: any) {
      alert(`Failed to update service status: ${err.message}`);
    }
  };

  const handleOpenEdit = (service: Service) => {
    setEditingService(service);
    setEditName(service.name);
    setEditCategory(service.category);
    setEditDuration(service.standard_duration_minutes);
    setEditDeliveryMode(service.delivery_mode);
    setEditDescription(service.description || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService || !activePractice) return;
    setIsSaving(true);
    try {
      await serviceCatalogService.updateService(
        editingService.id,
        {
          name: editName,
          category: editCategory,
          standard_duration_minutes: editDuration,
          delivery_mode: editDeliveryMode,
          description: editDescription || null,
        },
        activePractice.id
      );
      setEditingService(null);
      await loadServices();
    } catch (err: any) {
      alert(`Failed to save service changes: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title text-2xl font-bold flex items-center gap-2">
            <Tag className="text-primary-600" size={24} />
            Service Catalog
          </h1>
          <p className="page-subtitle text-gray-600 text-sm">
            Practice-scoped professional physiotherapy services, modalities, and durations.
          </p>
        </div>
        {canManageServices && (
          <Link
            to="/app/services/new"
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            <span>New Service</span>
          </Link>
        )}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 min-w-[280px] max-w-md relative">
          <input
            type="text"
            placeholder="Search by code, service name, or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input-text w-full pl-10 pr-4 py-2 border rounded-md text-sm"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="select-dropdown text-sm border rounded-md px-3 py-2"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => (
                <option key={catKey} value={catKey}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="select-dropdown text-sm border rounded-md px-3 py-2"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-3 border border-red-200">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table Content */}
      {isLoading ? (
        <div className="loading-state p-12 text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
          <p>Loading service catalog...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="empty-state bg-white p-12 rounded-lg border border-gray-200 text-center">
          <Tag className="mx-auto text-gray-300 mb-3" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Services Found</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
            {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'No services match the current filter criteria.'
              : 'Your practice service catalog is currently empty. Add your first clinical service to get started.'}
          </p>
          {canManageServices && (
            <Link
              to="/app/services/new"
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Create First Service</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-xs">
                <th className="py-3 px-4 font-semibold">Service Code</th>
                <th className="py-3 px-4 font-semibold">Service Name</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Duration</th>
                <th className="py-3 px-4 font-semibold">Delivery Mode</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                {canManageServices && (
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {services.map((svc) => (
                <tr key={svc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-primary-700">
                    {svc.service_code}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-gray-900">{svc.name}</div>
                    {svc.description && (
                      <div className="text-xs text-gray-500 truncate max-w-xs">
                        {svc.description}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="badge badge-category px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100 font-medium">
                      {CATEGORY_LABELS[svc.category] || svc.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-gray-400" />
                      <span>{svc.standard_duration_minutes} min</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 capitalize text-gray-600">
                    {svc.delivery_mode}
                  </td>
                  <td className="py-3 px-4">
                    {svc.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <CheckCircle2 size={12} />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                        <XCircle size={12} />
                        Inactive
                      </span>
                    )}
                  </td>
                  {canManageServices && (
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(svc)}
                          className="btn-icon p-1.5 text-gray-600 hover:text-primary-700 rounded hover:bg-gray-100"
                          title="Edit Service"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(svc)}
                          className={`btn-text text-xs font-medium px-2 py-1 rounded transition-colors ${
                            svc.is_active
                              ? 'text-amber-700 hover:bg-amber-50'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {svc.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingService && (
        <div className="modal-backdrop fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="modal-content bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Edit Service: {editingService.service_code}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Service code is immutable and permanently preserved for billing audit integrity.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Service Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input-text w-full p-2 border rounded text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as ServiceCategory)}
                    className="select-dropdown w-full p-2 border rounded text-sm"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => (
                      <option key={catKey} value={catKey}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Standard Duration (min) *
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    step="5"
                    required
                    value={editDuration}
                    onChange={(e) => setEditDuration(parseInt(e.target.value, 10) || 30)}
                    className="input-text w-full p-2 border rounded text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Delivery Mode
                </label>
                <select
                  value={editDeliveryMode}
                  onChange={(e) => setEditDeliveryMode(e.target.value)}
                  className="select-dropdown w-full p-2 border rounded text-sm"
                >
                  <option value="all">All Delivery Modes</option>
                  <option value="clinic">Clinic Only</option>
                  <option value="home">Home Visit Only</option>
                  <option value="telehealth">Telehealth Only</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="textarea-input w-full p-2 border rounded text-sm"
                  placeholder="Optional details regarding service indications, modality or equipment..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="btn btn-outline text-sm px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary text-sm px-4 py-2 flex items-center gap-2"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ServiceListPage;
