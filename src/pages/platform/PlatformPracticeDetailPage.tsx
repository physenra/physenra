import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { saasSubscriptionService, type PracticeDossier } from '../../services/saasSubscriptionService';
import type { SaasPlan } from '../../types/models';
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
  Ban,
  RefreshCw,
  Sliders,
  User,
  Mail,
  Phone,
} from 'lucide-react';

export const PlatformPracticeDetailPage: React.FC = () => {
  const { practiceId } = useParams<{ practiceId: string }>();
  const [dossier, setDossier] = useState<PracticeDossier | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Available plans for plan change modal
  const [plans, setPlans] = useState<SaasPlan[]>([]);

  // Trial Extension Modal State
  const [showExtendModal, setShowExtendModal] = useState<boolean>(false);
  const [daysToAdd, setDaysToAdd] = useState<number>(14);
  const [extensionReason, setExtensionReason] = useState<string>('');
  const [submittingExtension, setSubmittingExtension] = useState<boolean>(false);
  const [extensionError, setExtensionError] = useState<string | null>(null);

  // Suspend Practice Modal State
  const [showSuspendModal, setShowSuspendModal] = useState<boolean>(false);
  const [suspendReason, setSuspendReason] = useState<string>('');
  const [submittingSuspend, setSubmittingSuspend] = useState<boolean>(false);
  const [suspendError, setSuspendError] = useState<string | null>(null);

  // Restore Practice Modal State
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);
  const [restoreReason, setRestoreReason] = useState<string>('');
  const [submittingRestore, setSubmittingRestore] = useState<boolean>(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Change Plan Modal State
  const [showChangePlanModal, setShowChangePlanModal] = useState<boolean>(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('solo');
  const [customSeats, setCustomSeats] = useState<number>(1);
  const [changePlanReason, setChangePlanReason] = useState<string>('');
  const [submittingChangePlan, setSubmittingChangePlan] = useState<boolean>(false);
  const [changePlanError, setChangePlanError] = useState<string | null>(null);

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

  // Load plans in background for modals
  useEffect(() => {
    saasSubscriptionService.getAllPlans()
      .then((p) => setPlans(p))
      .catch((err) => console.warn('Could not preload plans:', err));
  }, []);

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
      setActionSuccess(
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

  const handleSuspendPractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceId) return;

    if (!suspendReason.trim() || suspendReason.trim().length < 5) {
      setSuspendError('Mandatory justification reason is required (minimum 5 characters).');
      return;
    }

    try {
      setSubmittingSuspend(true);
      setSuspendError(null);
      await saasSubscriptionService.suspendPractice(practiceId, suspendReason.trim());
      setActionSuccess('Practice successfully suspended. Write operations are now blocked.');
      setShowSuspendModal(false);
      setSuspendReason('');
      await loadDossier();
    } catch (err: unknown) {
      setSuspendError(err instanceof Error ? err.message : 'Practice suspension failed');
    } finally {
      setSubmittingSuspend(false);
    }
  };

  const handleRestorePractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceId) return;

    if (!restoreReason.trim() || restoreReason.trim().length < 5) {
      setRestoreError('Mandatory justification reason is required (minimum 5 characters).');
      return;
    }

    try {
      setSubmittingRestore(true);
      setRestoreError(null);
      const res = await saasSubscriptionService.restorePractice(practiceId, restoreReason.trim());
      setActionSuccess(`Practice restored successfully. Active subscription state: ${res.status}.`);
      setShowRestoreModal(false);
      setRestoreReason('');
      await loadDossier();
    } catch (err: unknown) {
      setRestoreError(err instanceof Error ? err.message : 'Practice restoration failed');
    } finally {
      setSubmittingRestore(false);
    }
  };

  const openChangePlanModal = () => {
    setChangePlanError(null);
    if (dossier?.subscription?.plan?.plan_code) {
      setSelectedPlanCode(dossier.subscription.plan.plan_code);
    }
    if (dossier?.subscription?.seat_limit) {
      setCustomSeats(dossier.subscription.seat_limit);
    }
    setChangePlanReason('');
    setShowChangePlanModal(true);
  };

  const handleChangePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceId) return;

    const targetPlan = plans.find((p) => p.plan_code === selectedPlanCode);
    if (!targetPlan) {
      setChangePlanError('Invalid plan selected.');
      return;
    }

    if (customSeats < targetPlan.practitioner_seat_limit) {
      setChangePlanError(
        `Seat limit cannot be lower than the ${targetPlan.name} plan minimum of ${targetPlan.practitioner_seat_limit} seats.`
      );
      return;
    }

    if (dossier && dossier.practitionerCount > customSeats) {
      setChangePlanError(
        `Capacity violation: practice has ${dossier.practitionerCount} active practitioners. Cannot reduce seat limit to ${customSeats}. Deactivate practitioners first.`
      );
      return;
    }

    if (!changePlanReason.trim() || changePlanReason.trim().length < 3) {
      setChangePlanError('Mandatory justification reason is required.');
      return;
    }

    try {
      setSubmittingChangePlan(true);
      setChangePlanError(null);
      await saasSubscriptionService.changePracticePlan(
        practiceId,
        selectedPlanCode,
        customSeats,
        changePlanReason.trim()
      );
      setActionSuccess(`Plan updated successfully to ${targetPlan.name} (${customSeats} seats).`);
      setShowChangePlanModal(false);
      setChangePlanReason('');
      await loadDossier();
    } catch (err: unknown) {
      setChangePlanError(err instanceof Error ? err.message : 'Plan change failed');
    } finally {
      setSubmittingChangePlan(false);
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
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Ban className="w-3.5 h-3.5" />
            Suspended
          </span>
        );
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

  const { practice, owner, subscription, trialExtensions, invoices, payments, practitionerCount } = dossier;
  const isSuspended = practice.status === 'suspended' || subscription?.status === 'suspended';
  const isTrialOrExpired = !isSuspended && subscription && ['trialing', 'expired', 'past_due'].includes(subscription.status);
  const selectedPlan = plans.find((p) => p.plan_code === selectedPlanCode);

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

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start">
          {/* Change Plan / Seats Button */}
          <button
            onClick={openChangePlanModal}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-700 shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Change Plan / Seats</span>
          </button>

          {/* Trial Extension (if trialing/expired) */}
          {isTrialOrExpired && (
            <button
              onClick={() => setShowExtendModal(true)}
              className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Extend Trial</span>
            </button>
          )}

          {/* Suspend or Restore Button */}
          {isSuspended ? (
            <button
              onClick={() => {
                setRestoreError(null);
                setRestoreReason('');
                setShowRestoreModal(true);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restore Practice</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setSuspendError(null);
                setSuspendReason('');
                setShowSuspendModal(true);
              }}
              className="px-3.5 py-2 bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Suspend Practice</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionSuccess && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-xs text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
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

      {/* Practice Owner Contact Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Practice Owner Contact</h2>
              <p className="text-xs text-slate-400">Primary administrative and operational contact for this tenant</p>
            </div>
          </div>
          {owner ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Verified Owner
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              No Direct Owner Linked
            </span>
          )}
        </div>

        {owner ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-5">
            <div>
              <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">Owner Name</span>
              <p className="text-sm font-semibold text-white mt-1">{owner.name}</p>
              <p className="text-xs text-slate-500 mt-0.5 capitalize">{owner.role.replace('_', ' ')}</p>
            </div>

            <div>
              <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                Email Address
              </span>
              <p className="text-sm font-semibold text-white mt-1">
                {owner.email ? (
                  <a href={`mailto:${owner.email}`} className="text-cyan-400 hover:underline">
                    {owner.email}
                  </a>
                ) : (
                  <span className="text-slate-500 italic">No email recorded</span>
                )}
              </p>
            </div>

            <div>
              <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                Phone Number
              </span>
              <p className="text-sm font-semibold text-white mt-1">
                {owner.phone ? (
                  <a href={`tel:${owner.phone}`} className="text-emerald-400 hover:underline">
                    {owner.phone}
                  </a>
                ) : (
                  <span className="text-slate-500 italic">No phone recorded</span>
                )}
              </p>
            </div>

            <div>
              <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                Member Since
              </span>
              <p className="text-sm font-semibold text-white mt-1">
                {owner.joined_at ? new Date(owner.joined_at).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
        ) : (
          <div className="pt-4 text-xs text-slate-400 flex flex-wrap items-center gap-3">
            <span>No specific practice_owner profile found. Practice contact channels:</span>
            {practice.email && (
              <span className="font-mono text-cyan-400">Email: {practice.email}</span>
            )}
            {practice.phone && (
              <span className="font-mono text-emerald-400">Phone: {practice.phone}</span>
            )}
          </div>
        )}
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

      {/* Suspend Practice Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-400" />
                Suspend Practice Workspace
              </h3>
              <button
                onClick={() => setShowSuspendModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed space-y-1">
              <p className="font-semibold text-rose-400">Immediate Operational Lockout</p>
              <p>
                Suspending this practice locks all clinical and administrative write access immediately.
                Users will be restricted from creating encounters, medical notes, appointments, or invoices.
                Historical medical records remain securely preserved and readable.
              </p>
            </div>

            {suspendError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {suspendError}
              </div>
            )}

            <form onSubmit={handleSuspendPractice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mandatory Audit Justification (Min. 5 characters)
                </label>
                <textarea
                  rows={3}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. Account suspended due to non-payment of invoice #PHY-INV-2026-000001 after grace period expired."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-rose-500 placeholder-slate-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSuspendModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSuspend || suspendReason.trim().length < 5}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {submittingSuspend ? 'Suspending Workspace...' : 'Confirm Suspension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore Practice Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-400" />
                Restore Practice Workspace
              </h3>
              <button
                onClick={() => setShowRestoreModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs leading-relaxed space-y-1">
              <p className="font-semibold text-emerald-400">Automatic State Restoration</p>
              <p>
                Restoring this practice will re-enable write access. The system automatically inspects
                the pre-suspension state and current period validity to restore to active, trialing, or past_due.
              </p>
            </div>

            {restoreError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {restoreError}
              </div>
            )}

            <form onSubmit={handleRestorePractice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mandatory Audit Justification (Min. 5 characters)
                </label>
                <textarea
                  rows={3}
                  value={restoreReason}
                  onChange={(e) => setRestoreReason(e.target.value)}
                  placeholder="e.g. Verified settlement received via Paystack; restoring full clinical access."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRestoreModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRestore || restoreReason.trim().length < 5}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {submittingRestore ? 'Restoring Workspace...' : 'Confirm Restoration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Plan / Seats Modal */}
      {showChangePlanModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                Change Practice Plan & Seat Limits
              </h3>
              <button
                onClick={() => setShowChangePlanModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {changePlanError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {changePlanError}
              </div>
            )}

            <form onSubmit={handleChangePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target SaaS Plan
                </label>
                <select
                  value={selectedPlanCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setSelectedPlanCode(code);
                    const p = plans.find((pl) => pl.plan_code === code);
                    if (p && customSeats < p.practitioner_seat_limit) {
                      setCustomSeats(p.practitioner_seat_limit);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.plan_code}>
                      {p.name} ({formatNaira(p.monthly_price_cents)}/mo • Min {p.practitioner_seat_limit} seats)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Practitioner Seat Limit
                  </label>
                  <span className="text-xs text-slate-400">
                    Currently Active: <strong className="text-white">{practitionerCount}</strong>
                  </span>
                </div>
                <input
                  type="number"
                  min={selectedPlan?.practitioner_seat_limit || 1}
                  value={customSeats}
                  onChange={(e) => setCustomSeats(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Plan minimum: {selectedPlan?.practitioner_seat_limit || 1} seats. Cannot be set lower than active practitioners ({practitionerCount}).
                </p>
                {practitionerCount > customSeats && (
                  <p className="text-xs text-rose-400 font-semibold mt-1">
                    ⚠ Downgrade blocked: Active practitioners ({practitionerCount}) exceed target seats ({customSeats}).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mandatory Audit Reason / Justification
                </label>
                <textarea
                  rows={2}
                  value={changePlanReason}
                  onChange={(e) => setChangePlanReason(e.target.value)}
                  placeholder="e.g. Upgraded to Professional plan per practice request and seat expansion."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePlanModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submittingChangePlan ||
                    practitionerCount > customSeats ||
                    customSeats < (selectedPlan?.practitioner_seat_limit || 1) ||
                    !changePlanReason.trim()
                  }
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {submittingChangePlan ? 'Updating Plan...' : 'Apply Plan Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
