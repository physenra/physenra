import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Tag, ArrowLeft, AlertCircle, Save } from 'lucide-react';
import { serviceCatalogService } from '../../services/serviceCatalogService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type { ServiceCategory } from '../../types/models';

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

export const CreateServicePage: React.FC = () => {
  const navigate = useNavigate();
  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant } = useRole();
  const canManage = isOwner || isManager || isAccountant;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('treatment');
  const [standardDuration, setStandardDuration] = useState(30);
  const [deliveryMode, setDeliveryMode] = useState('all');
  const [customCode, setCustomCode] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    return (
      <div className="page-container p-6">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-lg">
          <h2 className="text-lg font-bold mb-2">Access Denied</h2>
          <p className="text-sm">
            Only practice owners, managers, and accountants are authorized to create new services in the practice catalog.
          </p>
          <Link to="/app/services" className="btn btn-outline mt-4 inline-block">
            Back to Service Catalog
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice) return;

    if (!name.trim()) {
      setError('Service name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await serviceCatalogService.createService(
        {
          name: name.trim(),
          category,
          standard_duration_minutes: standardDuration,
          delivery_mode: deliveryMode,
          service_code: customCode.trim() ? customCode.trim().toUpperCase() : undefined,
          description: description.trim() || null,
        },
        activePractice.id
      );

      navigate('/app/services');
    } catch (err: any) {
      console.error('Failed to create service:', err);
      setError(err.message || 'Failed to create service catalog entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container max-w-2xl mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/app/services"
          className="text-gray-600 hover:text-gray-900 inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft size={16} />
          <span>Back to Catalog</span>
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-50 text-primary-600 rounded-lg">
              <Tag size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Create New Service</h1>
              <p className="text-xs text-gray-500">
                Register a billable or clinical physiotherapy service in your practice catalog.
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
              Service Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Initial Musculoskeletal Assessment & Plan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-text w-full p-2.5 border rounded-md text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                className="select-dropdown w-full p-2.5 border rounded-md text-sm bg-white"
              >
                {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => (
                  <option key={catKey} value={catKey}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Standard Duration (Minutes) *
              </label>
              <input
                type="number"
                min="5"
                max="480"
                step="5"
                required
                value={standardDuration}
                onChange={(e) => setStandardDuration(parseInt(e.target.value, 10) || 30)}
                className="input-text w-full p-2.5 border rounded-md text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Delivery Mode
              </label>
              <select
                value={deliveryMode}
                onChange={(e) => setDeliveryMode(e.target.value)}
                className="select-dropdown w-full p-2.5 border rounded-md text-sm bg-white"
              >
                <option value="all">All Delivery Modes</option>
                <option value="clinic">Clinic Location Only</option>
                <option value="home">Home / Domiciliary Visit</option>
                <option value="telehealth">Telehealth / Remote Video</option>
                <option value="other">Other / Community Facility</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Custom Service Code (Optional)
              </label>
              <input
                type="text"
                placeholder="Auto-generated (e.g. SRV-000001)"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                className="input-text w-full p-2.5 border rounded-md text-sm font-mono uppercase"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                Leave blank to auto-generate sequentially.
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Description & Clinical Indication
            </label>
            <textarea
              rows={3}
              placeholder="Describe modality, protocols, target condition, or billing notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea-input w-full p-2.5 border rounded-md text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Link to="/app/services" className="btn btn-outline text-sm px-4 py-2">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary text-sm px-5 py-2 inline-flex items-center gap-2"
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Creating Service...' : 'Create Service'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CreateServicePage;
