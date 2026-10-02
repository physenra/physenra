// ==============================================================================
// PHYSENRA — PRACTICE OWNER BILLING & SUBSCRIPTION DASHBOARD
// File: src/pages/billing/PracticeBillingPage.tsx
// Route: /app/billing (also /app/billing/plans, /app/billing/invoices)
//
// Governs:
// 1. Authoritative subscription state, pricing, interval, and renewal tracking
// 2. Role-based access control (Owner = Full, Accountant/Manager = Read-only, Clinician/Reception = Blocked)
// 3. Plan management (Upgrade checkout, Scheduled downgrade with seat validation)
// 4. Paystack serverless checkout integration & post-redirect verification
// 5. Subscription cancellation data-preservation semantics & reactivation
// 6. Responsive, tablet-first UI with loading and error boundaries
// ==============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  Users,
  Receipt,
  Sparkles,
  Info,
  X,
  ExternalLink,
  ChevronRight,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import { saasSubscriptionService } from '../../services/saasSubscriptionService';
import { formatNaira, formatPlanPrice } from '../../utils/currency';
import type {
  PracticeSubscription,
  SaasPlan,
  SaasInvoice,
  SaasPayment,
} from '../../types/models';

interface PracticeBillingPageProps {
  defaultTab?: 'overview' | 'plans' | 'invoices';
}

export const PracticeBillingPage: React.FC<PracticeBillingPageProps> = ({
  defaultTab = 'overview',
}) => {
  const { activePractice, loading: practiceLoading } = usePractice();
  const { isOwner, isAccountant, isClinician, isReceptionist } = useRole();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'invoices'>(defaultTab);

  // Data states
  const [subscription, setSubscription] = useState<(PracticeSubscription & { plan?: SaasPlan }) | null>(null);
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [invoices, setInvoices] = useState<SaasInvoice[]>([]);
  const [payments, setPayments] = useState<SaasPayment[]>([]);
  const [practitionerCount, setPractitionerCount] = useState<number>(0);
  const [pendingPlan, setPendingPlan] = useState<SaasPlan | null>(null);

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Plan catalog interval toggle
  const [catalogInterval, setCatalogInterval] = useState<'monthly' | 'annual'>('monthly');

  // Modals state
  const [planToChange, setPlanToChange] = useState<SaasPlan | null>(null);
  const [changeType, setChangeType] = useState<'upgrade' | 'downgrade' | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Payment verification state (from redirect callback)
  const [verificationState, setVerificationState] = useState<{
    status: 'idle' | 'verifying' | 'success' | 'failed';
    message: string | null;
  }>({ status: 'idle', message: null });

  const isReadOnly = !isOwner;

  // ----------------------------------------------------------------------------
  // 1. Authoritative Data Loading
  // ----------------------------------------------------------------------------
  const loadBillingData = useCallback(async () => {
    if (!activePractice?.id) return;
    try {
      setLoading(true);
      setErrorMessage(null);

      const [subData, plansData, invData, payData, staffCount] = await Promise.all([
        saasSubscriptionService.getPracticeSubscription(activePractice.id),
        saasSubscriptionService.getPublicPlans(),
        saasSubscriptionService.getPracticeInvoices(activePractice.id),
        saasSubscriptionService.getPracticePayments(activePractice.id),
        saasSubscriptionService.getActivePractitionerCount(activePractice.id),
      ]);

      setSubscription(subData);
      setPlans(plansData);
      setInvoices(invData);
      setPayments(payData);
      setPractitionerCount(staffCount);

      // Load pending plan if scheduled
      if (subData?.pending_plan_id) {
        const found = plansData.find((p) => p.id === subData.pending_plan_id);
        if (found) {
          setPendingPlan(found);
        } else {
          // Fallback fetch if not public
          const { data: pData } = await (saasSubscriptionService as any).getPlanByCode?.(subData.pending_plan_id);
          setPendingPlan(pData || null);
        }
      } else {
        setPendingPlan(null);
      }
    } catch (err: any) {
      console.error('Failed to load billing data:', err);
      setErrorMessage(err.message || 'Unable to load billing data. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [activePractice?.id]);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  // ----------------------------------------------------------------------------
  // 2. Paystack Redirect Callback Verification
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const reference = searchParams.get('reference');
    if (reference && activePractice?.id) {
      const verifyPayment = async () => {
        setVerificationState({
          status: 'verifying',
          message: 'Confirming your payment with Paystack...',
        });
        try {
          const result = await saasSubscriptionService.verifyPaystackPayment(activePractice.id, reference);
          if (result.status === 'success' || result.status === 'already_paid') {
            setVerificationState({
              status: 'success',
              message: 'Payment verified and subscription successfully activated!',
            });
            setSuccessMessage('Payment confirmed. Your subscription has been updated.');
            await loadBillingData();
          } else {
            setVerificationState({
              status: 'failed',
              message: result.message || 'Payment verification could not be confirmed.',
            });
          }
        } catch (verifyErr: any) {
          console.error('Payment verification failed:', verifyErr);
          setVerificationState({
            status: 'failed',
            message: verifyErr.message || 'Failed to verify payment with gateway.',
          });
        } finally {
          // Clean reference query parameter from URL without page reload
          navigate('/app/billing', { replace: true });
        }
      };

      verifyPayment();
    }
  }, [searchParams, activePractice?.id, loadBillingData, navigate]);

  // ----------------------------------------------------------------------------
  // 3. Security Role Gating
  // ----------------------------------------------------------------------------
  if (practiceLoading || (loading && !subscription)) {
    return (
      <div className="p-8 text-center text-slate-500">
        <Clock className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
        <p>Loading practice subscription and billing details...</p>
      </div>
    );
  }

  // Strictly block physiotherapists and receptionists from tenant commercial billing
  if (isClinician || isReceptionist) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-rose-200 rounded-xl shadow-sm text-center">
        <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-600 mb-6">
          Practice billing and commercial plan management is restricted to practice owners and designated administrators.
        </p>
        <Link
          to="/app/dashboard"
          className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // 4. Commercial Actions (Owner Only)
  // ----------------------------------------------------------------------------

  // A. Initiate Plan Change (Upgrade / Downgrade Selection)
  const handleSelectPlan = (targetPlan: SaasPlan) => {
    if (isReadOnly) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const currentPrice = subscription?.current_price_cents || 0;
    const targetPrice =
      catalogInterval === 'annual'
        ? targetPlan.annual_price_cents
        : targetPlan.monthly_price_cents;

    if (targetPrice >= currentPrice) {
      setChangeType('upgrade');
    } else {
      setChangeType('downgrade');
    }
    setPlanToChange(targetPlan);
  };

  // B. Confirm Plan Change
  const confirmPlanChange = async () => {
    if (!planToChange || !activePractice?.id || isReadOnly) return;

    try {
      setActionLoading(true);
      setErrorMessage(null);

      // Invoke authoritative self_service_change_plan RPC
      const result = await saasSubscriptionService.selfServiceChangePlan(
        activePractice.id,
        planToChange.plan_code,
        catalogInterval,
        `Self-service plan change to ${planToChange.name}`
      );

      // Upgrade requires payment checkout
      if (result.action === 'upgrade_invoice_created' && result.invoice_id) {
        // Initialize Paystack checkout server-side
        const checkoutInit = await saasSubscriptionService.initializePaystackCheckout(
          activePractice.id,
          result.invoice_id
        );

        if (checkoutInit.authorization_url) {
          // Redirect to Paystack secure checkout URL
          window.location.href = checkoutInit.authorization_url;
          return;
        } else {
          throw new Error('Gateway did not return an authorization URL.');
        }
      }

      // Scheduled downgrade or immediate trial switch
      if (result.action === 'downgrade_scheduled') {
        setSuccessMessage(
          `Downgrade to ${planToChange.name} scheduled for ${new Date(result.effective_at || '').toLocaleDateString()}. Your current entitlement remains active until then.`
        );
      } else if (result.action === 'plan_changed_immediately') {
        setSuccessMessage(`Subscription plan updated to ${planToChange.name}.`);
      }

      setPlanToChange(null);
      setChangeType(null);
      await loadBillingData();
    } catch (err: any) {
      console.error('Plan change error:', err);
      setErrorMessage(err.message || 'Unable to update subscription plan.');
    } finally {
      setActionLoading(false);
    }
  };

  // C. Pay Open Invoice Directly
  const handlePayInvoice = async (invoiceId: string) => {
    if (!activePractice?.id || isReadOnly) return;
    try {
      setActionLoading(true);
      setErrorMessage(null);

      const checkoutInit = await saasSubscriptionService.initializePaystackCheckout(
        activePractice.id,
        invoiceId
      );

      if (checkoutInit.authorization_url) {
        window.location.href = checkoutInit.authorization_url;
      } else {
        throw new Error('Failed to generate payment authorization.');
      }
    } catch (err: any) {
      console.error('Invoice payment initiation failed:', err);
      setErrorMessage(err.message || 'Payment initialization failed.');
      setActionLoading(false);
    }
  };

  // D. Cancel Subscription
  const confirmCancelSubscription = async () => {
    if (!activePractice?.id || isReadOnly) return;
    try {
      setActionLoading(true);
      setErrorMessage(null);

      const res = await saasSubscriptionService.cancelPracticeSubscription(
        activePractice.id,
        cancelReason || 'Practice owner requested cancellation'
      );

      if (res.cancel_at_period_end) {
        setSuccessMessage(
          `Subscription cancellation scheduled. Your clinical access and data remain fully active until ${new Date(res.effective_at || '').toLocaleDateString()}.`
        );
      } else {
        setSuccessMessage('Evaluation trial ended. Practice access is now read-only.');
      }

      setShowCancelModal(false);
      setCancelReason('');
      await loadBillingData();
    } catch (err: any) {
      console.error('Cancellation failed:', err);
      setErrorMessage(err.message || 'Failed to cancel subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  // E. Reactivate Subscription
  const handleReactivateSubscription = async () => {
    if (!activePractice?.id || isReadOnly) return;
    try {
      setActionLoading(true);
      setErrorMessage(null);

      const res = await saasSubscriptionService.reactivatePracticeSubscription(
        activePractice.id,
        'Practice owner reactivated subscription'
      );

      if (res.success) {
        setSuccessMessage('Subscription successfully reactivated! Your automatic renewal has been restored.');
        await loadBillingData();
      }
    } catch (err: any) {
      console.error('Reactivation failed:', err);
      setErrorMessage(err.message || 'Failed to reactivate subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // 5. Subscription Status Computation
  // ----------------------------------------------------------------------------
  const statusConfig = useMemo(() => {
    const status = subscription?.status || 'trialing';
    const isCancelScheduled = Boolean(subscription?.cancel_at_period_end);

    if (isCancelScheduled) {
      return {
        label: 'Cancellation Scheduled',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        bannerClass: 'bg-amber-50 border-amber-300 text-amber-900',
        icon: <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />,
        headline: `Your subscription will end on ${new Date(subscription?.current_period_end || '').toLocaleDateString()}`,
        explanation: 'Your practice will not lose paid clinical features immediately. No patient or clinical records will ever be deleted.',
      };
    }

    switch (status) {
      case 'active':
        return {
          label: 'Active',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          bannerClass: 'bg-emerald-50 border-emerald-300 text-emerald-900',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
          headline: 'Your Physenra subscription is active and in good standing.',
          explanation: `Next scheduled renewal: ${new Date(subscription?.current_period_end || '').toLocaleDateString()}`,
        };
      case 'trialing':
        return {
          label: 'Evaluation Trial',
          badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
          bannerClass: 'bg-teal-50 border-teal-300 text-teal-900',
          icon: <Sparkles className="w-5 h-5 text-teal-600 flex-shrink-0" />,
          headline: `Your free evaluation trial ends on ${new Date(subscription?.current_period_end || '').toLocaleDateString()}.`,
          explanation: 'Upgrade to a paid subscription at any time to preserve uninterrupted clinical write access.',
        };
      case 'past_due':
        return {
          label: 'Payment Past Due',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          bannerClass: 'bg-amber-50 border-amber-300 text-amber-900',
          icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
          headline: 'Payment is required to keep your practice active.',
          explanation: 'Please settle your outstanding invoice to avoid entering the suspended grace period.',
        };
      case 'grace_period':
        return {
          label: 'Payment Grace Period',
          badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
          bannerClass: 'bg-orange-50 border-orange-300 text-orange-900',
          icon: <Clock className="w-5 h-5 text-orange-600 flex-shrink-0" />,
          headline: 'Your account is currently in its payment grace period.',
          explanation: 'Immediate settlement is required to prevent temporary suspension of clinical write operations.',
        };
      case 'suspended':
        return {
          label: 'Suspended',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
          bannerClass: 'bg-rose-50 border-rose-300 text-rose-900',
          icon: <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />,
          headline: 'Your practice is suspended.',
          explanation: 'Clinical write access is paused. Contact Physenra platform support or settle outstanding charges to restore access.',
        };
      case 'expired':
        return {
          label: 'Expired',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
          bannerClass: 'bg-rose-50 border-rose-300 text-rose-900',
          icon: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
          headline: 'Your trial or subscription has expired.',
          explanation: 'Payment is required to restore full clinical write entitlement. Your clinical data remains securely preserved.',
        };
      default:
        return {
          label: status,
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
          bannerClass: 'bg-slate-50 border-slate-300 text-slate-900',
          icon: <Info className="w-5 h-5 text-slate-600 flex-shrink-0" />,
          headline: `Subscription status: ${status}`,
          explanation: 'Review current billing settings below.',
        };
    }
  }, [subscription]);

  // Seat capacity computation
  const seatLimit = subscription?.seat_limit || 1;
  const availableSeats = Math.max(0, seatLimit - practitionerCount);
  const isCapacityFull = practitionerCount >= seatLimit;

  // ----------------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------------
  return (
    <div className="practice-billing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-teal-600" />
            Billing & Subscription
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your practice plan, seats, payment methods, and authoritative invoices.
          </p>
        </div>

        {/* Read-Only Badge for Accountant / Manager */}
        {isReadOnly && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-xs font-medium">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span>Read-Only Financial Access ({isAccountant ? 'Accountant' : 'Practice Manager'})</span>
          </div>
        )}
      </div>

      {/* Global Alerts */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-800">
            <X size={16} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{successMessage}</div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-800">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Payment Verification Status Toast */}
      {verificationState.status === 'verifying' && (
        <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-lg flex items-center gap-3 text-teal-900 text-sm">
          <Clock className="w-5 h-5 text-teal-600 animate-spin" />
          <span>{verificationState.message}</span>
        </div>
      )}

      {/* Subscription Status Banner */}
      <div className={`mb-8 p-5 rounded-xl border flex items-start gap-4 ${statusConfig.bannerClass}`}>
        {statusConfig.icon}
        <div className="flex-1">
          <h3 className="font-semibold text-base mb-1">{statusConfig.headline}</h3>
          <p className="text-sm opacity-90">{statusConfig.explanation}</p>
        </div>
        {subscription?.cancel_at_period_end && !isReadOnly && (
          <button
            onClick={handleReactivateSubscription}
            disabled={actionLoading}
            className="px-3.5 py-1.5 bg-white border border-amber-400 text-amber-900 rounded-lg text-xs font-semibold hover:bg-amber-50 transition shadow-sm"
          >
            Keep My Subscription
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 mb-8 space-x-8">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Overview & Plan
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'plans'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Available Plans
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'invoices'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Invoices & Payments
        </button>
      </div>

      {/* TAB 1: OVERVIEW & CURRENT PLAN */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Top Grid: Plan Card & Seats Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Plan Card (Span 2) */}
            <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                      Current Subscription
                    </span>
                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${statusConfig.badgeClass}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-500 capitalize">
                    {subscription?.billing_interval || 'Monthly'} Billing
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {subscription?.plan?.name || 'Active Practice Plan'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {subscription?.plan?.description || 'Physenra Clinical Practice Management System'}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-3xl font-extrabold text-slate-900">
                      {formatNaira(subscription?.current_price_cents)}
                    </div>
                    <span className="text-xs text-slate-400">
                      per {subscription?.billing_interval === 'annual' ? 'year' : 'month'}
                    </span>
                  </div>
                </div>

                {/* Pending Plan Notice */}
                {pendingPlan && (
                  <div className="mb-6 p-3.5 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2.5 text-blue-900 text-xs">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Pending Plan Scheduled: </span>
                      Downgrade to <strong>{pendingPlan.name}</strong> will take effect at the end of the billing period (
                      {new Date(subscription?.current_period_end || '').toLocaleDateString()}).
                    </div>
                  </div>
                )}

                {/* Period Dates */}
                <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Billing Period Start</span>
                    <span className="font-semibold text-slate-800">
                      {subscription?.current_period_start
                        ? new Date(subscription.current_period_start).toLocaleDateString()
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Renewal / Expiration Date</span>
                    <span className="font-semibold text-slate-800">
                      {subscription?.current_period_end
                        ? new Date(subscription.current_period_end).toLocaleDateString()
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {!isReadOnly && (
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveTab('plans')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition shadow-sm"
                  >
                    <span>Change Plan</span>
                    <ArrowUpRight size={16} />
                  </button>

                  {/* Open invoice pay button */}
                  {invoices.some((i) => i.status === 'open') && (
                    <button
                      onClick={() => {
                        const openInv = invoices.find((i) => i.status === 'open');
                        if (openInv) handlePayInvoice(openInv.id);
                      }}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition shadow-sm"
                    >
                      <CreditCard size={16} />
                      <span>Pay Outstanding Invoice</span>
                    </button>
                  )}

                  {/* Cancellation toggle */}
                  {!subscription?.cancel_at_period_end && subscription?.status !== 'cancelled' && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="ml-auto text-xs text-slate-400 hover:text-rose-600 transition"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Practitioner Seats Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    Practitioner Seats
                  </span>
                  <Users className="w-5 h-5 text-teal-600" />
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-extrabold text-slate-900">{practitionerCount}</span>
                  <span className="text-slate-400 text-sm">/ {seatLimit} included</span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      isCapacityFull ? 'bg-amber-500' : 'bg-teal-600'
                    }`}
                    style={{ width: `${Math.min(100, (practitionerCount / seatLimit) * 100)}%` }}
                  />
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Active Clinical Staff:</span>
                    <span className="font-semibold text-slate-900">{practitionerCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available Seats:</span>
                    <span className={`font-semibold ${availableSeats === 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                      {availableSeats}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Administrative Staff:</span>
                    <span className="font-semibold text-emerald-600">Unlimited (Free)</span>
                  </div>
                </div>

                {isCapacityFull && (
                  <div className="mt-4 p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs">
                    Capacity reached. To add more clinical practitioners, upgrade your practice plan.
                  </div>
                )}
              </div>

              {!isReadOnly && isCapacityFull && (
                <div className="pt-4 border-t border-slate-100 mt-4">
                  <button
                    onClick={() => setActiveTab('plans')}
                    className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
                  >
                    Upgrade Seat Limit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Recent Invoices Preview */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-teal-600" />
                Recent Invoices
              </h3>
              <button
                onClick={() => setActiveTab('invoices')}
                className="text-xs text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-1"
              >
                <span>View All Invoices</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {invoices.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No invoices recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-400 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Invoice #</th>
                      <th className="py-2.5 px-4 font-semibold">Date</th>
                      <th className="py-2.5 px-4 font-semibold">Amount</th>
                      <th className="py-2.5 px-4 font-semibold">Status</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.slice(0, 3).map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900">
                          <Link to={`/app/billing/invoices/${inv.id}`} className="hover:underline text-teal-700">
                            {inv.invoice_number}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-xs">{new Date(inv.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{formatNaira(inv.total_cents)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              inv.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'open'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {inv.status === 'open' && !isReadOnly ? (
                            <button
                              onClick={() => handlePayInvoice(inv.id)}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 transition"
                            >
                              Pay Now
                            </button>
                          ) : (
                            <Link
                              to={`/app/billing/invoices/${inv.id}`}
                              className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                            >
                              View
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AVAILABLE PLANS (PLAN COMPARISON) */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {/* Monthly / Annual Billing Toggle */}
          <div className="flex flex-col items-center justify-center my-6">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setCatalogInterval('monthly')}
                className={`px-5 py-2 text-sm font-semibold rounded-lg transition ${
                  catalogInterval === 'monthly'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setCatalogInterval('annual')}
                className={`px-5 py-2 text-sm font-semibold rounded-lg transition flex items-center gap-1.5 ${
                  catalogInterval === 'annual'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>Annual Billing</span>
                <span className="px-1.5 py-0.5 text-xs font-bold bg-teal-100 text-teal-800 rounded-md">
                  2 Months Free
                </span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Annual subscriptions include a discount equivalent to 2 months free per year.
            </p>
          </div>

          {/* Plan Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {plans
              .filter((p) => p.is_public)
              .map((p) => {
                const isCurrent = subscription?.plan?.id === p.id;
                const isPending = subscription?.pending_plan_id === p.id;
                const currentPrice = subscription?.current_price_cents || 0;
                const priceCents =
                  catalogInterval === 'annual' ? p.annual_price_cents : p.monthly_price_cents;
                const isUpgrade = priceCents > currentPrice;

                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-2xl border shadow-sm p-6 flex flex-col justify-between transition relative ${
                      isCurrent
                        ? 'border-teal-500 ring-2 ring-teal-500 ring-opacity-20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute -top-3 left-6 px-3 py-0.5 bg-teal-600 text-white text-xs font-bold rounded-full shadow-sm">
                        Current Plan
                      </span>
                    )}

                    {isPending && (
                      <span className="absolute -top-3 left-6 px-3 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full shadow-sm">
                        Pending Switch
                      </span>
                    )}

                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 min-h-[36px]">{p.description}</p>

                      <div className="my-5 pb-5 border-b border-slate-100">
                        <div className="text-3xl font-extrabold text-slate-900">
                          {formatNaira(priceCents)}
                        </div>
                        <span className="text-xs text-slate-400">
                          per {catalogInterval === 'annual' ? 'year' : 'month'}
                        </span>
                      </div>

                      {/* Key entitlements */}
                      <ul className="space-y-3 text-xs text-slate-600 mb-6">
                        <li className="flex items-center gap-2 font-medium text-slate-900">
                          <Users size={15} className="text-teal-600" />
                          <span>{p.practitioner_seat_limit} Clinical Practitioner Seats</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-teal-600" />
                          <span>Unlimited Reception Staff</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-teal-600" />
                          <span>{p.storage_allowance_mb / 1024} GB Cloud Document Storage</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      {isCurrent ? (
                        <button
                          disabled
                          className="w-full py-2.5 bg-slate-100 text-slate-400 text-sm font-semibold rounded-xl cursor-default"
                        >
                          Current Active Plan
                        </button>
                      ) : isReadOnly ? (
                        <button
                          disabled
                          className="w-full py-2.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-xl cursor-not-allowed"
                        >
                          Owner Action Required
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSelectPlan(p)}
                          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${
                            isUpgrade
                              ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {isUpgrade ? 'Upgrade Plan' : 'Downgrade Plan'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

            {/* Enterprise Card (Private/Custom) */}
            <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custom Setup</span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Enterprise Network</h3>
                <p className="text-xs text-slate-500 mt-1 min-h-[36px]">
                  For multi-branch hospital chains, physical therapy departments, and multi-facility networks.
                </p>

                <div className="my-5 pb-5 border-b border-slate-200">
                  <div className="text-xl font-bold text-slate-700">Custom Pricing</div>
                  <span className="text-xs text-slate-400">Tailored to clinical capacity</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-600 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-slate-400" />
                    <span>Unlimited Practitioner Seats</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-slate-400" />
                    <span>Dedicated PACS DICOM Storage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-slate-400" />
                    <span>Priority Support & SLA</span>
                  </li>
                </ul>
              </div>

              <a
                href="mailto:contact@physenra.com?subject=Enterprise%20Plan%20Inquiry"
                className="w-full py-2.5 bg-slate-800 text-white text-center text-sm font-semibold rounded-xl hover:bg-slate-900 transition flex items-center justify-center gap-1.5"
              >
                <span>Contact Physenra</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INVOICES & PAYMENTS */}
      {activeTab === 'invoices' && (
        <div className="space-y-8">
          {/* Invoices Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-teal-600" />
              SaaS Invoices
            </h3>

            {invoices.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No invoices generated for this practice.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-400 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Invoice #</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold">Due Date</th>
                      <th className="py-3 px-4 font-semibold">Amount</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900">
                          <Link to={`/app/billing/invoices/${inv.id}`} className="hover:underline text-teal-700">
                            {inv.invoice_number}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-xs">{new Date(inv.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-xs">{new Date(inv.due_date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{formatNaira(inv.total_cents)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                              inv.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'open'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {inv.status === 'open' && !isReadOnly ? (
                            <button
                              onClick={() => handlePayInvoice(inv.id)}
                              disabled={actionLoading}
                              className="px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition shadow-sm"
                            >
                              Pay Now
                            </button>
                          ) : (
                            <Link
                              to={`/app/billing/invoices/${inv.id}`}
                              className="text-xs font-semibold text-teal-600 hover:text-teal-800"
                            >
                              Details
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment History Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-teal-600" />
              Settled Payment Transactions
            </h3>

            {payments.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No payment transactions recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-400 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Payment #</th>
                      <th className="py-3 px-4 font-semibold">Gateway Reference</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold">Method</th>
                      <th className="py-3 px-4 font-semibold">Amount</th>
                      <th className="py-3 px-4 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900">
                          {pay.payment_number}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">
                          {pay.gateway_reference}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {pay.settled_at ? new Date(pay.settled_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-xs capitalize">{pay.payment_method}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{formatNaira(pay.amount_cents)}</td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              pay.status === 'successful'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {pay.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: PLAN CHANGE CONFIRMATION (UPGRADE OR DOWNGRADE) */}
      {planToChange && changeType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900 bg-opacity-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {changeType === 'upgrade' ? `Upgrade to ${planToChange.name}` : `Schedule Downgrade to ${planToChange.name}`}
              </h3>
              <button
                onClick={() => {
                  setPlanToChange(null);
                  setChangeType(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-4 space-y-4 text-sm text-slate-600">
              {/* Comparison Card */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Current Plan</span>
                  <div className="font-bold text-slate-900">{subscription?.plan?.name || 'Current'}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {formatNaira(subscription?.current_price_cents)} / {subscription?.billing_interval}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{subscription?.seat_limit} Practitioner Seats</div>
                </div>

                <div className="border-l border-slate-200 pl-4">
                  <span className="text-xs text-teal-600 font-bold block mb-1">Target Plan</span>
                  <div className="font-bold text-slate-900">{planToChange.name}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {formatPlanPrice(
                      catalogInterval === 'annual' ? planToChange.annual_price_cents : planToChange.monthly_price_cents,
                      catalogInterval
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {planToChange.practitioner_seat_limit} Practitioner Seats
                  </div>
                </div>
              </div>

              {/* Specific explanations */}
              {changeType === 'upgrade' ? (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-900">
                  <p className="font-semibold mb-1">Payment Required for Upgrade:</p>
                  <p>
                    Upgrading plan capacity requires immediate payment via Paystack. Your new practitioner seat
                    entitlements will be activated immediately upon confirmed payment settlement.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                    <p className="font-semibold mb-1">Scheduled at Period End:</p>
                    <p>
                      Your current plan and entitlements will remain active until{' '}
                      <strong>{new Date(subscription?.current_period_end || '').toLocaleDateString()}</strong>.
                      The lower price and reduced seat capacity will take effect upon subsequent renewal.
                    </p>
                  </div>

                  {/* Seat capacity check for downgrade */}
                  {practitionerCount > planToChange.practitioner_seat_limit && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                      <p className="font-semibold mb-1">Capacity Limit Exceeded:</p>
                      <p>
                        This plan includes <strong>{planToChange.practitioner_seat_limit}</strong> practitioner seats,
                        but your practice currently has <strong>{practitionerCount}</strong> active practitioners. You
                        must deactivate staff members before scheduling this downgrade.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setPlanToChange(null);
                  setChangeType(null);
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPlanChange}
                disabled={actionLoading || (changeType === 'downgrade' && practitionerCount > planToChange.practitioner_seat_limit)}
                className={`px-5 py-2 text-sm font-semibold text-white rounded-lg transition shadow-sm ${
                  changeType === 'upgrade'
                    ? 'bg-teal-600 hover:bg-teal-700'
                    : 'bg-slate-900 hover:bg-slate-800'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {actionLoading
                  ? 'Processing...'
                  : changeType === 'upgrade'
                  ? 'Proceed to Checkout'
                  : 'Confirm Downgrade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CANCELLATION CONFIRMATION */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900 bg-opacity-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Cancel Subscription</h3>
              <button onClick={() => setShowCancelModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="py-4 space-y-3 text-sm text-slate-600">
              <p>
                Are you sure you want to cancel your practice subscription?
              </p>
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1.5">
                <p className="font-semibold">Authoritative Terms:</p>
                <p>
                  • Your subscription remains active until{' '}
                  <strong>{new Date(subscription?.current_period_end || '').toLocaleDateString()}</strong>.
                </p>
                <p>• You will not lose paid clinical features before that date.</p>
                <p>• <strong>No clinical records or patient history will be deleted.</strong></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for cancellation (optional):
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. temporary closure, restructuring"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                Keep Subscription
              </button>
              <button
                type="button"
                onClick={confirmCancelSubscription}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition"
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
