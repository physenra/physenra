// ==============================================================================
// PHYSENRA — SALES REPRESENTATIVE INVITATION ACCEPTANCE & PASSWORD SETUP
// File: src/pages/rep/AcceptRepInvitePage.tsx
// Route: /sales-portal/accept-invite
//
// Governs:
// 1. Secure invitation acceptance from Supabase Auth email link
// 2. Representative establishes their own private password (never admin-set)
// 3. Verified identity binding via claimVerifiedAccount()
// 4. Clean redirection into free /sales-portal (never touches clinic subscriptions)
// ==============================================================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { salesRepPortalService } from '../../services/salesRepPortalService';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { Lock, CheckCircle2, AlertCircle, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';

export const AcceptRepInvitePage: React.FC = () => {
  const { user, loading, clearPendingAuthFlow } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      await salesRepPortalService.updateMyPassword(password);
      await salesRepPortalService.claimVerifiedAccount();
      clearPendingAuthFlow();
      setActivated(true);
      setTimeout(() => {
        navigate('/sales-portal', { replace: true });
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Unable to activate partner portal account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo theme="dark" size="md" to="/" showSubtitle={false} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
              Partner Portal Onboarding
            </span>
          </div>
          <Link
            to="/sales-portal/login"
            className="text-xs font-semibold text-slate-300 hover:text-white"
          >
            Partner Sign In
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {loading ? (
            <div className="py-10 flex flex-col items-center gap-3 text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
              <span>Verifying your partner invitation...</span>
            </div>
          ) : activated ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h1 className="text-xl font-bold text-white">Partner Account Activated</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your password is set. Your Sales Representative Portal is free of charge and ready to use.
              </p>
              <Link
                to="/sales-portal"
                className="inline-flex items-center justify-center gap-2 w-full h-11 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-bold"
              >
                <span>Open Sales Partner Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : !user ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h1 className="text-lg font-bold text-white">Invitation Link Invalid or Expired</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Please open the latest invitation link sent to your email, request a password reset, or contact Physenra Platform Operations to resend your invite.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  to="/sales-portal/forgot-password"
                  className="inline-flex items-center justify-center gap-2 w-full h-10 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold"
                >
                  <span>Request Password Setup Email</span>
                </Link>
                <Link
                  to="/sales-portal/login"
                  className="inline-flex items-center justify-center w-full h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  <span>Already have a password? Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-white">Activate Partner Account</h1>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Create your private password for <span className="text-teal-300 font-semibold">{user.email}</span> to access the free Physenra Sales Representative Portal.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2" role="alert">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleActivate} className="space-y-4">
                <div>
                  <label htmlFor="invite-password" className="block text-xs font-semibold text-slate-300 mb-1">
                    Choose Password (minimum 8 characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="invite-password"
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="invite-confirm-password" className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="invite-confirm-password"
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={submitting}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Activating Portal Access...</span>
                    </>
                  ) : (
                    <span>Set Password & Enter Portal</span>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Free Partner Access • Zero Clinical Data Access</span>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
