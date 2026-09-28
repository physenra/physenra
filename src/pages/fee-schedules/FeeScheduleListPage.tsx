import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Coins,
  Search,
  Plus,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Lock,
  FileEdit,
  ArrowRight,
  Star,
} from 'lucide-react';
import { serviceCatalogService } from '../../services/serviceCatalogService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type { FeeScheduleWithItems, FeeScheduleStatus } from '../../types/models';

export const FeeScheduleListPage: React.FC = () => {
  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant } = useRole();
  const canManageFees = isOwner || isManager || isAccountant;

  const [searchParams, setSearchParams] = useSearchParams();
  const [schedules, setSchedules] = useState<FeeScheduleWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusFilter = (searchParams.get('status') as FeeScheduleStatus | 'all') || 'all';
  const searchQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(searchQuery);

  const loadSchedules = async () => {
    if (!activePractice) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await serviceCatalogService.getFeeSchedules(activePractice.id, {
        status: statusFilter,
        searchQuery: searchQuery || undefined,
      });
      setSchedules(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load fee schedules.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [activePractice, statusFilter, searchQuery]);

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

  const handleStatusChange = (status: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (status && status !== 'all') {
      newParams.set('status', status);
    } else {
      newParams.delete('status');
    }
    setSearchParams(newParams);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title text-2xl font-bold flex items-center gap-2">
            <Coins className="text-primary-600" size={24} />
            Fee Schedules & Tariffs
          </h1>
          <p className="page-subtitle text-gray-600 text-sm">
            Practice pricing tariffs, effective validity windows, and historical price preservation.
          </p>
        </div>
        {canManageFees && (
          <Link
            to="/app/fee-schedules/new"
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            <span>New Fee Schedule</span>
          </Link>
        )}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 min-w-[280px] max-w-md relative">
          <input
            type="text"
            placeholder="Search by identifier, name, or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input-text w-full pl-10 pr-4 py-2 border rounded-md text-sm"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </form>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="select-dropdown text-sm border rounded-md px-3 py-2"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="draft">Draft Only</option>
            <option value="archived">Archived (Locked)</option>
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

      {/* Content */}
      {isLoading ? (
        <div className="loading-state p-12 text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
          <p>Loading fee schedules...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="empty-state bg-white p-12 rounded-lg border border-gray-200 text-center">
          <Coins className="mx-auto text-gray-300 mb-3" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Fee Schedules Found</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
            {searchQuery || statusFilter !== 'all'
              ? 'No fee schedules match the current search or status filter.'
              : 'Create your first fee schedule to define service tariffs for your clinic.'}
          </p>
          {canManageFees && (
            <Link
              to="/app/fee-schedules/new"
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Create Fee Schedule</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schedules.map((schedule) => {
            const itemCount = schedule.items?.length || 0;
            return (
              <div
                key={schedule.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                      {schedule.schedule_identifier}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {schedule.is_default && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Star size={11} className="fill-amber-500 text-amber-500" />
                          Default
                        </span>
                      )}
                      {schedule.status === 'active' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          <CheckCircle2 size={12} />
                          Active
                        </span>
                      )}
                      {schedule.status === 'draft' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          <FileEdit size={12} />
                          Draft
                        </span>
                      )}
                      {schedule.status === 'archived' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                          <Lock size={12} />
                          Archived
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-gray-900 text-base mb-1">
                    {schedule.name}
                  </h3>
                  {schedule.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                      {schedule.description}
                    </p>
                  )}

                  <div className="space-y-1.5 text-xs text-gray-600 mb-4 pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Effective Window:</span>
                      <span className="font-medium flex items-center gap-1">
                        <Calendar size={12} className="text-gray-400" />
                        {schedule.effective_from} {schedule.effective_to ? `→ ${schedule.effective_to}` : '(Ongoing)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Currency:</span>
                      <span className="font-mono font-medium">{schedule.currency}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Priced Services:</span>
                      <span className="font-semibold text-gray-800">{itemCount} items</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {schedule.status === 'archived' ? 'Locked' : 'Configurable'}
                  </span>
                  <Link
                    to={`/app/fee-schedules/${schedule.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800"
                  >
                    <span>View & Manage Tariffs</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default FeeScheduleListPage;
