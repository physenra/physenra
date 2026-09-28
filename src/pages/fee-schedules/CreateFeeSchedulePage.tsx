import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Coins, ArrowLeft, AlertCircle, Save } from 'lucide-react';
import { serviceCatalogService } from '../../services/serviceCatalogService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type { FeeScheduleStatus } from '../../types/models';

export const CreateFeeSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant } = useRole();
  const canManage = isOwner || isManager || isAccountant;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveTo, setEffectiveTo] = useState('');
  const [status, setStatus] = useState<FeeScheduleStatus>('draft');
  const [isDefault, setIsDefault] = useState(false);
  const [currency, setCurrency] = useState('NGN');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    return (
      <div className="page-container p-6">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-lg">
          <h2 className="text-lg font-bold mb-2">Access Denied</h2>
          <p className="text-sm">
            Only practice owners, managers, and accountants are authorized to create new fee schedules.
          </p>
          <Link to="/app/fee-schedules" className="btn btn-outline mt-4 inline-block">
            Back to Fee Schedules
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice) return;

    if (!name.trim()) {
      setError('Fee schedule name is required.');
      return;
    }

    if (effectiveTo && effectiveTo < effectiveFrom) {
      setError('Effective To date must be on or after Effective From date.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await serviceCatalogService.createFeeSchedule(
        {
          name: name.trim(),
          description: description.trim() || null,
          effective_from: effectiveFrom,
          effective_to: effectiveTo || null,
          status,
          is_default: isDefault,
          currency: currency.trim().toUpperCase(),
        },
        activePractice.id
      );

      navigate(`/app/fee-schedules/${created.id}`);
    } catch (err: any) {
      console.error('Failed to create fee schedule:', err);
      setError(err.message || 'Failed to create fee schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container max-w-2xl mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/app/fee-schedules"
          className="text-gray-600 hover:text-gray-900 inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft size={16} />
          <span>Back to Fee Schedules</span>
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-50 text-primary-600 rounded-lg">
              <Coins size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Create Fee Schedule</h1>
              <p className="text-xs text-gray-500">
                Establish an effective-dated tariff schedule for outpatient physiotherapy services.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 mx-6 mt-6 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 border border-red-200 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Schedule Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Standard Clinic Tariff 2026 / Private Pay Rate"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-text w-full p-2.5 border rounded-md text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Effective From Date *
              </label>
              <input
                type="date"
                required
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="input-text w-full p-2.5 border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Effective To Date (Optional)
              </label>
              <input
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="input-text w-full p-2.5 border rounded-md text-sm"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                Leave empty for ongoing indefinite validity.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FeeScheduleStatus)}
                className="select-dropdown w-full p-2.5 border rounded-md text-sm bg-white"
              >
                <option value="draft">Draft (Preparing Tariffs)</option>
                <option value="active">Active (Operational)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Currency (ISO-4217) *
              </label>
              <input
                type="text"
                required
                maxLength={3}
                pattern="^[A-Za-z]{3}$"
                placeholder="NGN"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="input-text w-full p-2.5 border rounded-md text-sm font-mono uppercase"
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
              />
              <div>
                <span className="text-sm font-semibold text-gray-800">
                  Set as Default Active Schedule
                </span>
                <p className="text-xs text-gray-500">
                  If checked and active, this fee schedule will automatically serve as the clinic baseline.
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Description & Tariff Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Standard outpatient physical therapy fee schedule approved by clinical director..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea-input w-full p-2.5 border rounded-md text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Link to="/app/fee-schedules" className="btn btn-outline text-sm px-4 py-2">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary text-sm px-5 py-2 inline-flex items-center gap-2"
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Creating Schedule...' : 'Save & Configure Items'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CreateFeeSchedulePage;
