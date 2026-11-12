// ==============================================================================
// PHYSENRA — PASSWORD RESET COMPLETION PAGE
// File: src/pages/auth/ResetPasswordPage.tsx
// Route: /reset-password
// ==============================================================================

import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { salesRepPortalService } from '../../services/salesRepPortalService';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { Lock, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const { user, loading, clearPendingAuthFlow } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSalesPortalHint = new URLSearchParams(location.search).get('portal') === 'sales';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [redirectToPortal, setRedirectToPortal] = useState(isSalesPortalHint);

  const handleSubmit = async (e: React.FormEvent) => {
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
      clearPendingAuthFlow();

      let portalAccess = isSalesPortalHint;
      try {
        await salesRepPortalService.claimVerifiedAccount();
        const ctx = await salesRepPortalService.getMyPortalContext();
        if (ctx.is_sales_rep) {
          portalAccess = true;
        }
      } catch {
        // Ignore if standard clinical account
      }

      setRedirectToPortal(portalAccess);
      setDone(true);

      setTimeout(() => {
        navigate(portalAccess ? '/sales-portal' : '/app/dashboard', { replace: true });
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Please request a fresh recovery link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="bg-white border-b border-slate-200 py-4 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <BrandLogo size="md" to="/" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-card p-6 sm:p-8">
          {loading ? (
            <div className="py-8 flex flex-col items-center gap-3 text-xs text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              <span>Verifying recovery token...</span>
            </div>
          ) : done ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Password Updated</h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Your new password is active. Redirecting you now...
              </p>
              <Link
                to={redirectToPortal ? '/sales-portal' : '/app/dashboard'}
                className="inline-flex items-center justify-center gap-2 w-full h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : !user ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h1 className="text-lg font-bold text-slate-900">Recovery Session Expired or Invalid</h1>
              <p className="text-xs text-slate-600 leading-relaxed">
                This password reset link is invalid or has expired. Please request a new reset email.
              </p>
              <Link
                to="/forgot-password"
                className="inline-flex items-center justify-center gap-2 w-full h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold"
              >
                <span>Request New Reset Link</span>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Set New Password</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Choose a strong password for <span className="font-semibold text-slate-700">{user.email}</span>
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5" role="alert">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password (min 8 characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="new-password"
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting}
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="confirm-password"
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={submitting}
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Save New Password</span>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
