// ==============================================================================
// PHYSENRA — FORGOT PASSWORD PAGE
// File: src/pages/auth/ForgotPasswordPage.tsx
// Routes: /forgot-password, /sales-portal/forgot-password
// ==============================================================================

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPasswordForEmail } = useAuth();
  const location = useLocation();
  const isSalesPortal =
    location.pathname.startsWith('/sales-portal') ||
    new URLSearchParams(location.search).get('portal') === 'sales';

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setSubmitting(true);
      const redirectTarget = isSalesPortal
        ? '/reset-password?portal=sales'
        : '/reset-password';
      const { error: resetError } = await resetPasswordForEmail(cleanEmail, redirectTarget);
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Unable to send password reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="bg-white border-b border-slate-200 py-4 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <BrandLogo size="md" to="/" />
          <Link
            to={isSalesPortal ? '/sales-portal/login' : '/login'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-card p-6 sm:p-8">
          {sent ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Check your email</h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                If an account exists for <span className="font-semibold text-slate-800">{email.trim()}</span>,
                we have sent a secure link to reset your password.
              </p>
              <Link
                to={isSalesPortal ? '/sales-portal/login' : '/login'}
                className="inline-flex items-center justify-center gap-2 w-full h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                {isSalesPortal && (
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full mb-2">
                    Sales Partner Portal
                  </span>
                )}
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Reset your password
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Enter your account email and we will send you a secure password recovery link.
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
                  <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="partner@example.com"
                      disabled={submitting}
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                      <span>Sending Reset Link...</span>
                    </>
                  ) : (
                    <span>Send Password Reset Link</span>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Secure Identity Verification</span>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
