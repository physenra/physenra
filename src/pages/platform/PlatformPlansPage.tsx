import React, { useEffect, useState } from 'react';
import { saasSubscriptionService } from '../../services/saasSubscriptionService';
import type { SaasPlan } from '../../types/models';
import {
  Layers,
  Edit2,
  CheckCircle2,
  HardDrive,
  Users,
  Clock,
  Shield,
  RefreshCw,
} from 'lucide-react';

export const PlatformPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [editingPlan, setEditingPlan] = useState<SaasPlan | null>(null);
  const [editMonthlyPriceNaira, setEditMonthlyPriceNaira] = useState<number>(0);
  const [editAnnualPriceNaira, setEditAnnualPriceNaira] = useState<number>(0);
  const [editSeats, setEditSeats] = useState<number>(1);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await saasSubscriptionService.getAllPlans();
      setPlans(data);
    } catch (err: unknown) {
      console.error('Failed to load plans:', err);
      setError(err instanceof Error ? err.message : 'Error loading plans catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openEditModal = (plan: SaasPlan) => {
    setEditingPlan(plan);
    setEditMonthlyPriceNaira(plan.monthly_price_cents / 100);
    setEditAnnualPriceNaira(plan.annual_price_cents / 100);
    setEditSeats(plan.practitioner_seat_limit);
    setSaveSuccess(null);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    try {
      setSaving(true);
      await saasSubscriptionService.updatePlan(editingPlan.id, {
        monthly_price_cents: Math.round(editMonthlyPriceNaira * 100),
        annual_price_cents: Math.round(editAnnualPriceNaira * 100),
        practitioner_seat_limit: editSeats,
      });

      setSaveSuccess(`Plan ${editingPlan.name} updated successfully.`);
      setEditingPlan(null);
      await fetchPlans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save plan changes');
    } finally {
      setSaving(false);
    }
  };

  const formatNaira = (cents: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-400" />
            SaaS Plan Catalog & Pricing
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Authoritative tiers, seat allocations, storage allowances, and commercial pricing.
          </p>
        </div>
        <button
          onClick={fetchPlans}
          className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 flex items-center gap-2 self-start transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-500">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
            Loading plans catalog...
          </div>
        ) : (
          plans.map((plan) => {
            const isEnterprise = plan.plan_code === 'enterprise';
            return (
              <div
                key={plan.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {plan.plan_code}
                    </span>
                    {plan.is_public ? (
                      <span className="text-[11px] text-slate-400">Public Self-Service</span>
                    ) : (
                      <span className="text-[11px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        Contact Sales
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white mt-1">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.description}</p>

                  <div className="my-5 pb-5 border-b border-slate-800">
                    <div className="text-2xl font-bold text-white">
                      {isEnterprise ? 'Custom Quote' : formatNaira(plan.monthly_price_cents)}
                      {!isEnterprise && <span className="text-xs text-slate-400 font-normal"> / mo</span>}
                    </div>
                    {!isEnterprise && (
                      <div className="text-xs text-emerald-400 mt-1 font-medium">
                        {formatNaira(plan.annual_price_cents)} / yr
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>{plan.practitioner_seat_limit}</strong> Practitioner Seat
                        {plan.practitioner_seat_limit > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>
                        <strong>{plan.storage_allowance_mb >= 1024 ? `${plan.storage_allowance_mb / 1024} GB` : `${plan.storage_allowance_mb} MB`}</strong> Document & PACS Storage
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        {plan.trial_allowed ? `${plan.trial_duration_days}-Day Trial Included` : 'Zero Trial Period'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                        Features Included
                      </span>
                      <ul className="space-y-1.5 text-[11px] text-slate-400">
                        {Object.entries((plan.features as Record<string, boolean>) || {}).map(
                          ([featureKey, enabled]) => (
                            <li key={featureKey} className="flex items-center gap-1.5">
                              {enabled ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <span className="w-3.5 h-3.5 text-slate-600 shrink-0 text-center font-bold">×</span>
                              )}
                              <span className={enabled ? 'text-slate-200' : 'text-slate-600'}>
                                {featureKey.replace(/_/g, ' ')}
                              </span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => openEditModal(plan)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Plan Parameters</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                Edit Plan: {editingPlan.name}
              </h3>
              <button
                onClick={() => setEditingPlan(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Monthly Price (NGN ₦)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={editMonthlyPriceNaira}
                  onChange={(e) => setEditMonthlyPriceNaira(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Annual Price (NGN ₦)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={editAnnualPriceNaira}
                  onChange={(e) => setEditAnnualPriceNaira(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Practitioner Seat Ceiling
                </label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={editSeats}
                  onChange={(e) => setEditSeats(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
