import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Coins,
  ArrowLeft,
  Calendar,
  Lock,
  CheckCircle2,
  FileEdit,
  AlertCircle,
  Plus,
  Trash2,
  Star,
  Archive,
  Save,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { serviceCatalogService } from '../../services/serviceCatalogService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type {
  FeeScheduleWithItems,
  Service,
  FeeScheduleStatus,
} from '../../types/models';

export const FeeScheduleDetailPage: React.FC = () => {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant } = useRole();
  const canManage = isOwner || isManager || isAccountant;

  const [schedule, setSchedule] = useState<FeeScheduleWithItems | null>(null);
  const [catalogServices, setCatalogServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Item form state
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [isTaxable, setIsTaxable] = useState(false);
  const [taxRatePercent, setTaxRatePercent] = useState<number>(0);
  const [itemNotes, setItemNotes] = useState('');
  const [isItemSubmitting, setIsItemSubmitting] = useState(false);

  // Status transition state
  const [isStatusChanging, setIsStatusChanging] = useState(false);

  const loadData = async () => {
    if (!activePractice || !scheduleId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [scheduleData, servicesData] = await Promise.all([
        serviceCatalogService.getFeeScheduleById(scheduleId, activePractice.id),
        serviceCatalogService.getServices(activePractice.id, { isActive: true }),
      ]);
      setSchedule(scheduleData);
      setCatalogServices(servicesData);
      if (servicesData.length > 0 && !selectedServiceId) {
        setSelectedServiceId(servicesData[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load fee schedule:', err);
      setError(err.message || 'Failed to load fee schedule details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activePractice, scheduleId]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice || !scheduleId || !schedule) return;

    const parsedPrice = parseFloat(unitPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      alert('Please enter a valid non-negative unit price.');
      return;
    }

    if (!selectedServiceId) {
      alert('Please select a service from the catalog.');
      return;
    }

    setIsItemSubmitting(true);
    try {
      await serviceCatalogService.upsertFeeScheduleItem(
        {
          fee_schedule_id: scheduleId,
          service_id: selectedServiceId,
          unit_price: parsedPrice,
          currency: schedule.currency,
          is_taxable: isTaxable,
          tax_rate_percent: isTaxable ? taxRatePercent : 0.0,
          notes: itemNotes.trim() || null,
        },
        activePractice.id
      );

      // Reset form fields
      setUnitPrice('');
      setItemNotes('');
      setIsTaxable(false);
      setTaxRatePercent(0);

      await loadData();
    } catch (err: any) {
      alert(`Failed to add tariff item: ${err.message}`);
    } finally {
      setIsItemSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!activePractice || !scheduleId || !schedule) return;
    if (schedule.status === 'archived') {
      alert('Cannot delete items from an archived fee schedule.');
      return;
    }

    if (!confirm('Are you sure you want to remove this service from the fee schedule?')) {
      return;
    }

    try {
      await serviceCatalogService.deleteFeeScheduleItem(itemId, scheduleId, activePractice.id);
      await loadData();
    } catch (err: any) {
      alert(`Failed to remove tariff item: ${err.message}`);
    }
  };

  const handleStatusTransition = async (newStatus: FeeScheduleStatus) => {
    if (!activePractice || !scheduleId || !schedule) return;
    if (newStatus === 'archived') {
      if (!confirm('Are you sure you want to archive this fee schedule? Archived fee schedules are permanently locked and cannot be edited.')) {
        return;
      }
    }

    setIsStatusChanging(true);
    try {
      await serviceCatalogService.updateFeeSchedule(
        scheduleId,
        { status: newStatus },
        activePractice.id
      );
      await loadData();
    } catch (err: any) {
      alert(`Failed to transition status: ${err.message}`);
    } finally {
      setIsStatusChanging(false);
    }
  };

  const handleSetDefault = async () => {
    if (!activePractice || !scheduleId || !schedule) return;
    if (schedule.status !== 'active') {
      alert('Only active fee schedules can be set as the clinic default.');
      return;
    }

    setIsStatusChanging(true);
    try {
      await serviceCatalogService.updateFeeSchedule(
        scheduleId,
        { is_default: true },
        activePractice.id
      );
      await loadData();
    } catch (err: any) {
      alert(`Failed to set default: ${err.message}`);
    } finally {
      setIsStatusChanging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container p-12 text-center text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
        <p>Loading fee schedule details...</p>
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="page-container p-6">
        <div className="bg-red-50 text-red-700 p-6 rounded-lg border border-red-200">
          <AlertCircle size={24} className="mb-2" />
          <h2 className="text-lg font-bold">Failed to Load Fee Schedule</h2>
          <p className="text-sm mb-4">{error || 'Fee schedule not found.'}</p>
          <Link to="/app/fee-schedules" className="btn btn-outline text-sm">
            Back to Fee Schedules
          </Link>
        </div>
      </div>
    );
  }

  const isArchived = schedule.status === 'archived';
  const items = schedule.items || [];

  return (
    <div className="page-container max-w-6xl mx-auto py-6">
      {/* Navigation Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/app/fee-schedules"
          className="text-gray-600 hover:text-gray-900 inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft size={16} />
          <span>Back to Fee Schedules</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm font-bold px-2.5 py-1 bg-gray-100 text-gray-800 rounded">
                {schedule.schedule_identifier}
              </span>
              {schedule.is_default && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  <Star size={12} className="fill-amber-500 text-amber-500" />
                  Default Clinic Schedule
                </span>
              )}
              {schedule.status === 'active' && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  <CheckCircle2 size={13} />
                  Active
                </span>
              )}
              {schedule.status === 'draft' && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  <FileEdit size={13} />
                  Draft
                </span>
              )}
              {schedule.status === 'archived' && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
                  <Lock size={13} />
                  Archived & Locked
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-1">{schedule.name}</h1>
            {schedule.description && (
              <p className="text-sm text-gray-600 max-w-2xl">{schedule.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-6 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" />
                <span>
                  Validity:{' '}
                  <strong>
                    {schedule.effective_from}{' '}
                    {schedule.effective_to ? `to ${schedule.effective_to}` : '(Ongoing)'}
                  </strong>
                </span>
              </div>
              <div>
                Currency: <strong className="font-mono">{schedule.currency}</strong>
              </div>
              <div>
                Priced Services: <strong>{items.length} items</strong>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {canManage && !isArchived && (
            <div className="flex flex-wrap items-center gap-2">
              {schedule.status === 'draft' && (
                <button
                  onClick={() => handleStatusTransition('active')}
                  disabled={isStatusChanging}
                  className="btn btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>Activate Schedule</span>
                </button>
              )}
              {schedule.status === 'active' && !schedule.is_default && (
                <button
                  onClick={handleSetDefault}
                  disabled={isStatusChanging}
                  className="btn btn-outline text-xs px-3 py-1.5 inline-flex items-center gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  <Star size={14} />
                  <span>Set as Default</span>
                </button>
              )}
              <button
                onClick={() => handleStatusTransition('archived')}
                disabled={isStatusChanging}
                className="btn btn-outline text-xs px-3 py-1.5 inline-flex items-center gap-1.5 text-gray-600 hover:bg-gray-100"
              >
                <Archive size={14} />
                <span>Archive & Freeze</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lock Notice if Archived */}
      {isArchived && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg mb-6 flex items-start gap-3">
          <ShieldAlert size={20} className="shrink-0 mt-0.5 text-amber-600" />
          <div className="text-xs">
            <strong className="block font-semibold mb-0.5">
              Historical Price Preservation Lock Active
            </strong>
            This fee schedule has been archived and is permanently frozen in accordance with billing audit standards.
            No services or tariffs can be added, altered, or deleted. Future encounters referencing this period will
            reliably resolve these historical rates.
          </div>
        </div>
      )}

      {/* Add Item Card (Only if NOT Archived and user has management role) */}
      {canManage && !isArchived && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Plus size={18} className="text-primary-600" />
            Add / Update Service Tariff
          </h2>

          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select Service *
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="select-dropdown w-full p-2 border rounded-md text-sm bg-white"
                  required
                >
                  {catalogServices.map((svc) => (
                    <option key={svc.id} value={svc.id}>
                      [{svc.service_code}] {svc.name} ({svc.standard_duration_minutes} min)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Unit Price ({schedule.currency}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="input-text w-full p-2 border rounded-md text-sm font-mono"
                />
              </div>

              <div className="flex items-center gap-3 pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={isTaxable}
                    onChange={(e) => setIsTaxable(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 h-4 w-4"
                  />
                  <span>Tax Applicable</span>
                </label>
                {isTaxable && (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    placeholder="Rate %"
                    value={taxRatePercent}
                    onChange={(e) => setTaxRatePercent(parseFloat(e.target.value) || 0)}
                    className="input-text w-20 p-1.5 border rounded-md text-xs font-mono"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Billing / Coverage Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Standard consultation fee; includes initial dry needling supplies."
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  className="input-text w-full p-2 border rounded-md text-sm"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isItemSubmitting}
                  className="btn btn-primary w-full p-2 text-sm flex items-center justify-center gap-1.5"
                >
                  <Save size={16} />
                  <span>{isItemSubmitting ? 'Saving Tariff...' : 'Save Tariff Item'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Tariffs Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-sm">
            Tariff Table ({items.length} Configured Services)
          </h3>
          <span className="text-xs text-gray-500 font-mono">
            Currency: {schedule.currency}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Coins size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-700">No Services Priced Yet</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
              {canManage && !isArchived
                ? 'Select a service from the form above and define its rate for this schedule.'
                : 'This fee schedule currently contains no itemized tariffs.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200 text-gray-600 uppercase text-xs">
                <th className="py-3 px-4 font-semibold">Service Code</th>
                <th className="py-3 px-4 font-semibold">Service Name</th>
                <th className="py-3 px-4 font-semibold">Duration</th>
                <th className="py-3 px-4 font-semibold text-right">Unit Price</th>
                <th className="py-3 px-4 font-semibold">Taxability</th>
                <th className="py-3 px-4 font-semibold">Notes</th>
                {canManage && !isArchived && (
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => {
                const svc = item.service;
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-primary-700 text-xs">
                      {svc?.service_code || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{svc?.name || 'Service'}</div>
                      <div className="text-[11px] text-gray-400 capitalize">
                        {svc?.category || ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">
                      <div className="flex items-center gap-1">
                        <Clock size={13} className="text-gray-400" />
                        <span>{svc?.standard_duration_minutes || 30} min</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                      {item.currency}{' '}
                      {Number(item.unit_price).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {item.is_taxable ? (
                        <span className="badge bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                          Taxable ({Number(item.tax_rate_percent).toFixed(1)}%)
                        </span>
                      ) : (
                        <span className="text-gray-400">Tax Exempt</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 max-w-xs truncate">
                      {item.notes || '-'}
                    </td>
                    {canManage && !isArchived && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="btn-icon p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          title="Remove Tariff Item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
export default FeeScheduleDetailPage;
