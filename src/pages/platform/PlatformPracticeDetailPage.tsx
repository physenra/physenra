import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { saasSubscriptionService, type PracticeDossier } from '../../services/saasSubscriptionService';
import {
  Building2,
  ArrowLeft,
  Calendar,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Receipt,
  CreditCard,
  History,
  Lock,
} from 'lucide-react';

export const PlatformPracticeDetailPage: React.FC = () => {
  const { practiceId } = useParams<{ practiceId: string }>();
  const [dossier, setDossier] = useState<PracticeDossier | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Trial Extension Modal State
  const [showExtendModal, setShowExtendModal] = useState<boolean>(false);
  const [daysToAdd, setDaysToAdd] = useState<number>(14);
  const [extensionReason, setExtensionReason] = useState<string>('');
  const [submittingExtension, setSubmittingExtension] = useState<boolean>(false);
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const [extensionSuccess, setExtensionSuccess] = useState<string | null>(null);

  const loadDossier = useCallback(async () => {
    if (!practiceId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await saasSubscriptionService.getPracticeDossier(practiceId);
      setDossier(data);
    } catch (err: unknown) {
      console.error('Failed to load dossier:', err);
      setError(err instanceof Error ? err.message : 'Error fetching practice dossier');
    } finally {
      setLoading(false);
    }
  }, [practiceId]);

  useEffect(() => {
    loadDossier();
  }, [loadDossier]);

  const handleExtendTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceId) return;

    if (!extensionReason.trim()) {
      setExtensionError('Mandatory audit justification reason is required.');
      return;
    }

    try {
      setSubmittingExtension(true);
      setExtensionError(null);
      const result = await saasSubscriptionService.extendTrial(
        practiceId,
        daysToAdd,
        extensionReason.trim()
      );
      setExtensionSuccess(
        `Trial extended successfully! New trial period ends: ${new Date(
          result.new_trial_ends_at
        ).toLocaleDateString()}`
      );
      setShowExtendModal(false);
      setExtensionReason('');
      await loadDossier();
    } catch (err: unknown) {
      setExtensionError(err instanceof Error ? err.message : 'Trial extension failed');
    } finally {
      setSubmittingExtension(false);
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

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active Subscription
          </span>
        );
      case 'trialing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Clock className="w-3.5 h-3.5" />
            Active 14-Day Trial
          </span>
        );
      case 'past_due':
      case 'grace_period':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            Past Due / Grace Period
          </span>
        );
      case 'suspended':
      case 'expired':
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
            Unlicensed
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Dossier Unavailable</h2>
        <p className="text-slate-400 text-sm">{error || 'Practice record could not be found.'}</p>
        <Link
          to="/platform/practices"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </Link>
      </div>
    );
  }

  const { practice, subscription, trialExtensions, invoices, payments, practitionerCount } = dossier;
  const isTrialOrExpired = subscription && ['trialing', 'expired', 'past_due'].includes(subscription.status);

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            to="/platform/practices"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Practice Directory
          </Link>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Building2 className="w-7 h-7 text-emerald-400" />
            {practice.name}
          </h1>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
            <span className="font-mono">Slug: /{practice.slug}</span>
            <span>•</span>
            <span>Region: {practice.country} ({practice.timezone})</span>
            <span>•</span>
            <span>Registered: {new Date(practice.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {isTrialOrExpired && (
          <button
            onClick={() => setShowExtendModal(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 self-start shadow-sm"
          >
            <Calendar className="w-4 h-4" />
            <span>Grant Trial Extension</span>
          </button>
        )}
      </div>

      {extensionSuccess && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{extensionSuccess}</span>
        </div>
      )}

      {/* Clinical Privacy Firewall Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-start gap-3 shadow-sm">
        <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-semibold text-emerald-400">Architectural Clinical Privacy Firewall Invariant</p>
          <p className="text-slate-400 mt-0.5 leading-relaxed">
            Platform Administrators hold zero clearance or cryptographic access to patient clinical notes,
            diagnoses, medical imaging, or patient PHI. The information below is restricted strictly to
            commercial software licensing, seat allocation, and gateway billing ledgers.
          </p>
        </div>
      </div>

      {/* Subscription Dossier Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">Current Licensing Plan</span>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-xl font-bold text-white">
                {subscription?.plan?.name || 'No Active Plan'}
              </h2>
              {renderStatusBadge(subscription?.status)}
            </div>
          </div>
          <div className="text-right sm:text-right">
            <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">Contracted Rate</span>
            <p className="text-lg font-bold text-slate-100 mt-1">
              {formatNaira(subscription?.current_price_cents || 0)} / {subscription?.billing_interval || 'month'}
            </p>
          </div>
        </div>

        {/* Capacity & Timestamps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Practitioner Seat Allocation</span>
            </div>
            <p className="text-base font-semibold text-white">
              {practitionerCount} / {subscription?.seat_limit || 0} Clinicians
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {subscription && practitionerCount >= subscription.seat_limit
                ? 'Seat capacity reached'
                : 'Seats available'}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Current Period Span</span>
            </div>
            <p className="text-sm font-semibold text-white">
              {subscription
                ? `${new Date(subscription.current_period_start).toLocaleDateString()} – ${new Date(
                    subscription.current_period_end
                  ).toLocaleDateString()}`
                : '—'}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Trial Expiration</span>
            </div>
            <p className="text-sm font-semibold text-white">
              {subscription?.trial_ends_at
                ? new Date(subscription.trial_ends_at).toLocaleDateString()
                : 'Not applicable'}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <CreditCard className="w-4 h-4 text-purple-400" />
              <span>Gateway Provider</span>
            </div>
            <p className="text-sm font-semibold text-white uppercase tracking-wider">
              {subscription?.gateway_provider || 'paystack'}
            </p>
          </div>
        </div>
      </div>

      {/* Trial Extensions Audit Stream */}
      {trialExtensions.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-cyan-400" />
            Trial Extension Audit Overrides
          </h2>
          <div className="divide-y divide-slate-800">
            {trialExtensions.map((ext) => (
              <div key={ext.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between text-xs gap-2">
                <div>
                  <span className="font-semibold text-cyan-400">+{ext.days_added} Days Granted</span>
                  <span className="text-slate-400 ml-2">Reason: "{ext.reason}"</span>
                </div>
                <div className="text-slate-500 font-mono">
                  {new Date(ext.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SaaS Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-purple-400" />
          SaaS Subscription Invoices
        </h2>
        {invoices.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Zero subscription invoices issued yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Settled At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-3 font-mono text-white">{inv.invoice_number}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-400">
                      {formatNaira(inv.total_cents)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(inv.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gateway Settlement Payments */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-emerald-400" />
          Gateway Settlement Transactions
        </h2>
        {payments.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Zero gateway settlement payments logged.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Payment Number</th>
                  <th className="px-4 py-3">Gateway Ref</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Settled At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {payments.map((pmt) => (
                  <tr key={pmt.id}>
                    <td className="px-4 py-3 font-mono text-white">{pmt.payment_number}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{pmt.gateway_reference}</td>
                    <td className="px-4 py-3 capitalize">{pmt.payment_method}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-400">
                      {formatNaira(pmt.amount_cents)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                        {pmt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {pmt.settled_at ? new Date(pmt.settled_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trial Extension Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                Authorized Trial Extension
              </h3>
              <button
                onClick={() => setShowExtendModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {extensionError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {extensionError}
              </div>
            )}

            <form onSubmit={handleExtendTrial} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Days to Add (1 to 90)
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={daysToAdd}
                  onChange={(e) => setDaysToAdd(parseInt(e.target.value, 10) || 14)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mandatory Audit Reason / Justification
                </label>
                <textarea
                  rows={3}
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="e.g. Extended for clinical review and physician evaluation committee demo."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExtendModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExtension}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {submittingExtension ? 'Recording Override...' : 'Confirm Extension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
