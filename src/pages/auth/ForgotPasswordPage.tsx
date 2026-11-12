// ==============================================================================
// PHYSENRA — FORGOT PASSWORD PAGE (RATE-LIMIT HARDENED)
// File: src/pages/auth/ForgotPasswordPage.tsx
// Routes: /forgot-password, /sales-portal/forgot-password
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2, ShieldCheck, RefreshCw } from 'lucide-react';

const COOLDOWN_SECONDS = 60;

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
  const [cooldown, setCooldown] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Restore cooldown from sessionStorage on mount / email change
  useEffect(() => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    const stored = sessionStorage.getItem(`pwd_reset_cooldown_${cleanEmail}`);
    if (stored) {
      const remaining = Math.max(0, Math.ceil((parseInt(stored, 10) - Date.now()) / 1000));
      if (remaining > 0) {
        setCooldown(remaining);
      }
    }
  }, [email]);

  // Countdown effect
  useEffect(() => {
    if (cooldown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown]);

  const startCooldown = (cleanEmail: string) => {
    setCooldown(COOLDOWN_SECONDS);
    sessionStorage.setItem(
      `pwd_reset_cooldown_${cleanEmail}`,
      (Date.now() + COOLDOWN_SECONDS * 1000).toString()
    );
  };

  const executeReset = async (cleanEmail: string) => {
    if (submitting || cooldown > 0) return;
    setError(null);

    try {
      setSubmitting(true);
      const redirectTarget = isSalesPortal
        ? '/reset-password?portal=sales'
        : '/reset-password';

      const { error: resetError } = await resetPasswordForEmail(cleanEmail, redirectTarget);

      if (resetError) {
        const msg = String(resetError.message || '').toLowerCase();
        if (msg.includes('rate limit') || msg.includes('60 seconds') || resetError.status === 429) {
          startCooldown(cleanEmail);
          setError(
            'For security, password reset requests are limited to once per 60 seconds. Please check your inbox and spam folder, or wait for the countdown before requesting another link.'
          );
        } else {
          setError(resetError.message);
        }
        return;
      }

      startCooldown(cleanEmail);
      setSent(true);
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('rate limit') || msg.includes('60 seconds')) {
        startCooldown(cleanEmail);
        setError(
          'For security, password reset requests are limited to once per 60 seconds. Please check your inbox and spam folder, or wait for the countdown before requesting another link.'
        );
      } else {
        setError(err?.message || 'Unable to send password reset email.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    await executeReset(cleanEmail);
  };

  const handleResend = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) return;
    await executeReset(cleanEmail);
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
                we have dispatched a secure link to reset your password.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-1">
                <p className="text-[11px] font-semibold text-slate-700">Didn't receive the email?</p>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Check your spam/junk folder. Delivery may take 1–2 minutes depending on your email provider.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 text-left" role="alert">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={submitting || cooldown > 0}
                  className="inline-flex items-center justify-center gap-1.5 w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition border border-slate-200 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : cooldown > 0 ? (
                    <span>Resend available in {cooldown}s</span>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend Reset Email</span>
                    </>
                  )}
                </button>

                <Link
                  to={isSalesPortal ? '/sales-portal/login' : '/login'}
                  className="inline-flex items-center justify-center gap-2 w-full h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
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
                  disabled={submitting || cooldown > 0}
                  className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Reset Link...</span>
                    </>
                  ) : cooldown > 0 ? (
                    <span>Wait {cooldown}s before requesting again</span>
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
