// ==============================================================================
// PHYSENRA — INDEPENDENT SALES REPRESENTATIVE LOGIN PAGE
// File: src/pages/rep/SalesPortalLoginPage.tsx
// Route: /sales-portal/login
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { salesRepPortalService } from '../../services/salesRepPortalService';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { Lock, Mail, AlertCircle, ArrowRight, Loader2, ShieldCheck, Sparkles } from 'lucide-react';

export const SalesPortalLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { signIn, user, loading, pendingAuthFlow } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const stateFrom = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const targetDestination =
    stateFrom && stateFrom.startsWith('/sales-portal') && stateFrom !== '/sales-portal/login'
      ? stateFrom
      : '/sales-portal';

  useEffect(() => {
    if (loading || !user) return;
    if (pendingAuthFlow === 'invite') {
      navigate('/sales-portal/accept-invite', { replace: true });
      return;
    }
    if (pendingAuthFlow === 'recovery') {
      navigate('/reset-password?portal=sales', { replace: true });
      return;
    }

    let active = true;
    salesRepPortalService
      .claimVerifiedAccount()
      .catch(() => null)
      .finally(() => {
        if (active) navigate(targetDestination, { replace: true });
      });

    return () => {
      active = false;
    };
  }, [user, loading, pendingAuthFlow, navigate, targetDestination]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both your email address and password.');
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      const { error: signInError } = await signIn(email.trim(), password);
      if (signInError) {
        setError(signInError.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-500/20">
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo theme="dark" size="md" to="/" showSubtitle={false} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
              Sales Partner Portal
            </span>
          </div>
          <Link
            to="/login"
            className="text-xs font-semibold text-slate-300 hover:text-white"
          >
            Clinic Login &rarr;
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-[11px] font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Free Partner Access</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Sales Representative Sign In
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Access your referral link, practice attributions, and commission ledger.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5" role="alert">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="partner-email" className="block text-xs font-semibold text-slate-300 mb-1">
                Representative Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="partner-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="partner@physenra.com"
                  autoComplete="email"
                  disabled={submitting}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="partner-password" className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <Link
                  to="/sales-portal/forgot-password"
                  className="text-[11px] font-semibold text-teal-400 hover:text-teal-300"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="partner-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  disabled={submitting}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full h-11 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Enter Sales Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Independent Commercial Partner Workspace</span>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950">
        &copy; {new Date().getFullYear()} Physenra Sales Partner Program. Free Partner Portal.
      </footer>
    </div>
  );
};
