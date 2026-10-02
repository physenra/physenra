// ==============================================================================
// PHYSENRA — GLOBAL SUBSCRIPTION STATUS & LIFECYCLE BANNER
// File: src/components/billing/SubscriptionStatusBanner.tsx
//
// Governs:
// 1. Context-aware clinical workspace subscription alert banners
// 2. Authoritative trial countdowns & warning thresholds (7d, 3d, 1d, 0d)
// 3. Expired trial paywall notice with read-only data preservation messaging
// 4. Past-due, grace-period, and suspended account-state messaging
// 5. Cancellation-at-period-end notices with reactivation shortcut
// 6. Non-obstructive UX: hidden in /app/billing (avoids duplication) and Platform Console
// ==============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Sparkles,
  Clock,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  X,
} from 'lucide-react';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import { saasSubscriptionService } from '../../services/saasSubscriptionService';
import type { PracticeSubscription, SaasPlan } from '../../types/models';

export const SubscriptionStatusBanner: React.FC = () => {
  const { activePractice } = usePractice();
  const { isOwner } = useRole();
  const location = useLocation();

  const [subscription, setSubscription] = useState<(PracticeSubscription & { plan?: SaasPlan }) | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dismissed, setDismissed] = useState<boolean>(false);

  // Suppress in billing areas to avoid visual duplication
  const isBillingRoute = location.pathname.startsWith('/app/billing');

  const loadSubscription = useCallback(async () => {
    if (!activePractice?.id) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const sub = await saasSubscriptionService.getPracticeSubscription(activePractice.id);
      setSubscription(sub);
    } catch (err) {
      console.warn('SubscriptionStatusBanner: Failed to load subscription:', err);
    } finally {
      setLoading(false);
    }
  }, [activePractice?.id]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  // Reset dismissal when route changes or practice changes
  useEffect(() => {
    setDismissed(false);
  }, [activePractice?.id]);

  // Derived Trial calculations (Step 3 & 4)
  const trialCountdown = useMemo(() => {
    if (!subscription || subscription.status !== 'trialing') return null;

    const endDateStr = subscription.trial_ends_at || subscription.current_period_end;
    if (!endDateStr) return null;

    const endDate = new Date(endDateStr);
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
      daysRemaining: Math.max(0, diffDays),
      isExpired: diffDays <= 0,
      endDateFormatted: endDate.toLocaleDateString(),
    };
  }, [subscription]);

  // Do not render if on billing routes, loading, dismissed, or no subscription
  if (isBillingRoute || loading || !subscription || dismissed) {
    return null;
  }

  const { status, cancel_at_period_end, current_period_end, grace_period_ends_at } = subscription;

  // Active subscriptions with no scheduled cancellation require no clinical warning
  if (status === 'active' && !cancel_at_period_end) {
    return null;
  }

  // ----------------------------------------------------------------------------
  // 1. TRIALING STATUS (Steps 3, 4, 5)
  // ----------------------------------------------------------------------------
  if (status === 'trialing' && trialCountdown) {
    const { daysRemaining, isExpired, endDateFormatted } = trialCountdown;

    if (isExpired) {
      return (
        <div className="mb-6 p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 shadow-sm print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">Your free trial has ended.</p>
                <p className="text-xs text-rose-700 mt-0.5">
                  Your clinical records remain preserved. Subscribe to continue creating or editing clinical records. Read-only access is currently active.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pl-8 sm:pl-0">
              <Link
                to="/app/billing/plans"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition shadow-sm"
              >
                <span>Choose a Plan</span>
                <ArrowRight size={13} />
              </Link>
              <Link
                to="/app/billing/invoices"
                className="inline-flex items-center px-3 py-1.5 bg-white border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold hover:bg-rose-100 transition"
              >
                View Invoices
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // Trial countdown text and hierarchy (Step 4)
    let countdownLabel = `${daysRemaining} days remaining`;
    let bannerStyle = 'bg-teal-50 border-teal-300 text-teal-900';
    let icon = <Sparkles className="w-5 h-5 text-teal-600 flex-shrink-0" />;

    if (daysRemaining === 0) {
      countdownLabel = 'Trial expires today';
      bannerStyle = 'bg-amber-100 border-amber-400 text-amber-900';
      icon = <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />;
    } else if (daysRemaining === 1) {
      countdownLabel = '1 day remaining';
      bannerStyle = 'bg-amber-100 border-amber-400 text-amber-900';
      icon = <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />;
    } else if (daysRemaining <= 3) {
      countdownLabel = '3 days remaining';
      bannerStyle = 'bg-amber-50 border-amber-300 text-amber-900';
      icon = <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />;
    } else if (daysRemaining <= 7) {
      countdownLabel = '7 days remaining';
      bannerStyle = 'bg-teal-50 border-teal-300 text-teal-900';
    }

    return (
      <div className={`mb-6 p-4 rounded-xl border shadow-sm print:hidden ${bannerStyle}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            {icon}
            <div>
              <p className="text-sm font-bold">
                Your Physenra trial ends in {daysRemaining > 1 ? `${daysRemaining} days` : daysRemaining === 1 ? '1 day' : 'a few hours'} ({endDateFormatted}).
              </p>
              <p className="text-xs opacity-90 mt-0.5">
                Evaluation period: {countdownLabel}. Upgrade anytime to ensure uninterrupted clinical write operations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-8 sm:pl-0">
            <Link
              to="/app/billing"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-50 transition shadow-sm"
            >
              <span>View Billing</span>
              <ArrowRight size={13} />
            </Link>
            {daysRemaining > 3 && (
              <button
                onClick={() => setDismissed(true)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition"
                aria-label="Dismiss banner"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // 2. PAST DUE STATE (Step 8)
  // ----------------------------------------------------------------------------
  if (status === 'past_due') {
    return (
      <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 shadow-sm print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Payment issue</p>
              <p className="text-xs text-amber-800 mt-0.5">
                Your subscription payment requires attention. Please update your payment method or settle open invoices to avoid service interruption.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-8 sm:pl-0">
            <Link
              to="/app/billing"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition shadow-sm"
            >
              <span>Review Billing</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // 3. GRACE PERIOD (Step 9)
  // ----------------------------------------------------------------------------
  if (status === 'grace_period') {
    const graceEndFormatted = grace_period_ends_at
      ? new Date(grace_period_ends_at).toLocaleDateString()
      : 'shortly';

    return (
      <div className="mb-6 p-4 rounded-xl border border-amber-400 bg-amber-50 text-amber-900 shadow-sm print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Payment overdue</p>
              <p className="text-xs text-amber-800 mt-0.5">
                Your practice remains active during the grace period until {graceEndFormatted}. Please update your billing before access is restricted.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-8 sm:pl-0">
            <Link
              to="/app/billing"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition shadow-sm"
            >
              <span>Review Billing</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // 4. SUSPENDED STATE (Step 10)
  // ----------------------------------------------------------------------------
  if (status === 'suspended') {
    return (
      <div className="mb-6 p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 shadow-sm print:hidden">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">Practice access is currently suspended.</p>
            <p className="text-xs text-rose-700 mt-0.5">
              Your clinical records remain preserved. Contact your practice administrator or Physenra platform support to restore operational status.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // 5. EXPIRED STATE (Step 6 & 7)
  // ----------------------------------------------------------------------------
  if (status === 'expired') {
    return (
      <div className="mb-6 p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 shadow-sm print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Subscription Expired — Read-only access active</p>
              <p className="text-xs text-rose-700 mt-0.5">
                Your subscription has expired. Your clinical records remain preserved in read-only mode. Subscribe to continue creating or editing clinical records.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-8 sm:pl-0">
            <Link
              to="/app/billing/plans"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition shadow-sm"
            >
              <span>Choose a Plan</span>
              <ArrowRight size={13} />
            </Link>
            <Link
              to="/app/billing/invoices"
              className="inline-flex items-center px-3 py-1.5 bg-white border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold hover:bg-rose-100 transition"
            >
              View Invoices
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // 6. CANCELLATION SCHEDULED (Step 11 & 15)
  // ----------------------------------------------------------------------------
  if (cancel_at_period_end) {
    const periodEndFormatted = current_period_end
      ? new Date(current_period_end).toLocaleDateString()
      : 'the end of your period';

    return (
      <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 shadow-sm print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Cancellation scheduled</p>
              <p className="text-xs text-amber-800 mt-0.5">
                Your subscription remains active until {periodEndFormatted}. After that date, access will transition according to the existing subscription lifecycle.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-8 sm:pl-0">
            {isOwner && (
              <Link
                to="/app/billing"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition shadow-sm"
              >
                <span>Reactivate Subscription</span>
              </Link>
            )}
            <Link
              to="/app/billing"
              className="inline-flex items-center px-3 py-1.5 bg-white border border-amber-200 text-amber-800 rounded-lg text-xs font-semibold hover:bg-amber-100 transition"
            >
              Billing Details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
