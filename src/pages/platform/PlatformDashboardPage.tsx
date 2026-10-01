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
} from 'lucide-react';

export const PlatformDashboardPage: React.FC = () => {
  const [kpis, setKpis] = useState<PlatformKPIs | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadKPIs() {
      try {
        setLoading(true);
        const data = await saasSubscriptionService.getPlatformKPIs();
        setKpis(data);
      } catch (err: unknown) {
        console.error('Failed to load platform KPIs:', err);
        setError(err instanceof Error ? err.message : 'Failed to query platform KPIs');
      } finally {
        setLoading(false);
      }
    }

    loadKPIs();
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
            <Shield className="w-6 h-6 text-emerald-400" />
            Executive Platform Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time SaaS operational telemetry, recurring revenue metrics, and tenant distribution.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/platform/practices"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            <span>Manage Practices</span>
            <ArrowRight className="w-4 h-4" />
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly Recurring (MRR)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {formatNaira(kpis?.mrr_cents || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Contracted normalized monthly run-rate</p>
          </div>
        </div>

        {/* ARR */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Annual Run-Rate (ARR)</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {formatNaira(kpis?.arr_cents || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Projected annual recurring subscription revenue</p>
          </div>
        </div>

        {/* Active Practices */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Paid Tenants</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{kpis?.active_practices ?? 0}</div>
            <p className="text-xs text-slate-500 mt-1">Subscribed practices in good standing</p>
          </div>
        </div>

        {/* Total Practices */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Registered</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{kpis?.total_practices ?? 0}</div>
            <p className="text-xs text-slate-500 mt-1">Total clinics on Physenra platform</p>
          </div>
        </div>
      </div>

      {/* Secondary Status Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">14-Day Evaluation Trials</p>
              <p className="text-xl font-bold text-white mt-0.5">{kpis?.trialing_practices ?? 0} Practices</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Past Due / Grace Period</p>
              <p className="text-xl font-bold text-white mt-0.5">{kpis?.past_due_practices ?? 0} Practices</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Suspended / Expired</p>
              <p className="text-xl font-bold text-white mt-0.5">{kpis?.suspended_practices ?? 0} Practices</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Quick Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <Link
          to="/platform/practices"
          className="group bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-6 transition-all duration-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h2 className="text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">
            Practice Directory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Search, inspect dossiers, review active practitioner seats, and grant authorized trial extensions.
          </p>
        </Link>

        <Link
          to="/platform/plans"
          className="group bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-6 transition-all duration-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
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
              <DollarSign className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
          </div>
          <h2 className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors">
            Billing & Invoices
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Audit platform invoices, gateway settlements, Paystack transaction references, and revenue ledgers.
          </p>
        </Link>
      </div>
    </div>
  );
};
