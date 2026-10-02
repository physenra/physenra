import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { saasSubscriptionService } from '../../services/saasSubscriptionService';
import type { PlatformKPIs } from '../../types/models';
import {
  TrendingUp,
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Shield,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface ExpiringTrialItem {
  practiceId: string;
  practiceName: string;
  slug: string;
  planName: string;
  trialEndsAt: string;
  daysRemaining: number;
  status: string;
}

interface DunningItem {
  practiceId: string;
  practiceName: string;
  slug: string;
  status: string;
  planName: string;
  currentPeriodEnd: string | null;
  amountDueCents: number;
}

export const PlatformDashboardPage: React.FC = () => {
  const [kpis, setKpis] = useState<PlatformKPIs | null>(null);
  const [expiringTrials, setExpiringTrials] = useState<ExpiringTrialItem[]>([]);
  const [dunningPractices, setDunningPractices] = useState<DunningItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [kpiData, trialsData, dunningData] = await Promise.all([
          saasSubscriptionService.getPlatformKPIs(),
          saasSubscriptionService.getExpiringTrials(7).catch(() => []),
          saasSubscriptionService.getDunningPractices().catch(() => []),
        ]);
        setKpis(kpiData);
        setExpiringTrials(trialsData);
        setDunningPractices(dunningData);
      } catch (err: unknown) {
        console.error('Failed to load platform dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to query platform dashboard data');
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const formatNaira = (cents: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Shield size={22} className="w-6 h-6 text-emerald-400" />
            Executive Platform Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time SaaS operational telemetry, recurring revenue metrics, and tenant distribution.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/platform/practices"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Manage Practices</span>
            <ArrowRight size={16} className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
          Notice: {error}. Displaying current snapshot.
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* MRR */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly Recurring (MRR)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp size={18} className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {formatNaira(kpis?.mrr_cents || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">Contracted normalized monthly run-rate</p>
          </div>
        </div>

        {/* ARR */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Annual Run-Rate (ARR)</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <DollarSign size={18} className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {formatNaira(kpis?.arr_cents || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">Projected annual recurring subscription revenue</p>
          </div>
        </div>

        {/* Active Practices */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Paid Tenants</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={18} className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">{kpis?.active_practices ?? 0}</div>
            <p className="text-xs text-slate-500 mt-1.5">Subscribed practices in good standing</p>
          </div>
        </div>

        {/* Total Practices */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Registered</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Building2 size={18} className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">{kpis?.total_practices ?? 0}</div>
            <p className="text-xs text-slate-500 mt-1.5">Total clinics on Physenra platform</p>
          </div>
        </div>
      </div>

      {/* Secondary Status Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Clock size={20} className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">14-Day Evaluation Trials</p>
              <p className="text-xl font-bold text-white mt-0.5">{kpis?.trialing_practices ?? 0} Practices</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle size={20} className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Past Due / Grace Period</p>
              <p className="text-xl font-bold text-white mt-0.5">{kpis?.past_due_practices ?? 0} Practices</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle size={20} className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Suspended / Expired</p>
              <p className="text-xl font-bold text-white mt-0.5">{kpis?.suspended_practices ?? 0} Practices</p>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Watchlist Feeds Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Trials Feed (Within 7 Days) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Clock size={18} className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">Expiring Trials Feed</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Next 7 Days ({expiringTrials.length})
              </span>
            </div>

            {expiringTrials.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Zero trial accounts expiring in the next 7 days.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {expiringTrials.slice(0, 5).map((trial) => (
                  <Link
                    key={trial.practiceId}
                    to={`/platform/practices/${trial.practiceId}`}
                    className="py-3 px-2 flex items-center justify-between hover:bg-slate-800/50 rounded-lg transition-colors group"
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-200 group-hover:text-cyan-400 transition-colors">
                        {trial.practiceName}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{trial.planName}</span>
                        <span>•</span>
                        <span>Ends: {new Date(trial.trialEndsAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/10 text-cyan-400">
                        {trial.daysRemaining === 0 ? 'Today' : `${trial.daysRemaining}d remaining`}
                      </span>
                      <ChevronRight size={16} className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {expiringTrials.length > 5 && (
            <div className="pt-3 border-t border-slate-800 text-right">
              <Link
                to="/platform/practices"
                className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
              >
                <span>View all ({expiringTrials.length})</span>
                <ChevronRight size={14} className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Overdue / Dunning Watchlist Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Overdue & Dunning Watchlist</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Action Required ({dunningPractices.length})
              </span>
            </div>

            {dunningPractices.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Zero practices in dunning, past due, or expired status.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {dunningPractices.slice(0, 5).map((item) => (
                  <Link
                    key={item.practiceId}
                    to={`/platform/practices/${item.practiceId}`}
                    className="py-3 px-2 flex items-center justify-between hover:bg-slate-800/50 rounded-lg transition-colors group"
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-200 group-hover:text-amber-400 transition-colors">
                        {item.practiceName}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{item.planName}</span>
                        <span>•</span>
                        <span className="capitalize">{item.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-xs font-semibold text-amber-400">
                          {formatNaira(item.amountDueCents)}
                        </div>
                        {item.currentPeriodEnd && (
                          <div className="text-[10px] text-slate-500">
                            Due {new Date(item.currentPeriodEnd).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {dunningPractices.length > 5 && (
            <div className="pt-3 border-t border-slate-800 text-right">
              <Link
                to="/platform/practices"
                className="text-xs text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
              >
                <span>View all ({dunningPractices.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Quick Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <Link
          to="/platform/practices"
          className="group bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-6 transition-all duration-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Building2 size={20} className="w-5 h-5" />
            </div>
            <ArrowRight size={16} className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h2 className="text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">
            Practice Directory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Search, inspect dossiers, review active practitioner seats, suspend, restore, or change plans.
          </p>
        </Link>

        <Link
          to="/platform/plans"
          className="group bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-6 transition-all duration-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Layers size={20} className="w-5 h-5" />
            </div>
            <ArrowRight size={16} className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <h2 className="text-base font-semibold text-white group-hover:text-blue-300 transition-colors">
            SaaS Plan Catalog
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure Solo, Professional, Clinic, and Enterprise tier pricing, seat capacities, and feature flags.
          </p>
        </Link>

        <Link
          to="/platform/billing"
          className="group bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-6 transition-all duration-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <DollarSign size={20} className="w-5 h-5" />
            </div>
            <ArrowRight size={16} className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
          </div>
          <h2 className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors">
            Billing & Invoices
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Audit platform invoices, gateway settlements, Paystack references, and webhook telemetry.
          </p>
        </Link>
      </div>
    </div>
  );
};
