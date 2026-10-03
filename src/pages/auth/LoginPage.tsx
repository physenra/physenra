// ==============================================================================
// PHYSENRA DESIGN SYSTEM — AUTHENTICATION LOGIN PAGE
// File: src/pages/auth/LoginPage.tsx
// Route: /login
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { Lock, Mail, AlertCircle, ArrowRight, Building2, ShieldCheck, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const stateFrom = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const queryFrom = searchParams.get('from');

  // Validate internal redirect path to prevent open redirect vulnerabilities
  const isValidInternalPath = (path?: string | null) =>
    Boolean(path && path.startsWith('/') && !path.startsWith('//'));

  const from =
    (isValidInternalPath(stateFrom) ? stateFrom : null) ||
    (isValidInternalPath(queryFrom) ? queryFrom : null) ||
    '/app/dashboard';

  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      const { error: signInError } = await signIn(email.trim(), password);
      if (signInError) {
        setError(signInError.message);
      }
      // Navigation is triggered by the effect when auth state updates
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-teal-100 selection:text-teal-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <BrandLogo size="md" to="/" />
          <Link
            to="/register-practice"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100/80 rounded-lg border border-teal-200 transition"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Register Practice</span>
          </Link>
        </div>
      </header>

      {/* Main Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-card p-6 sm:p-8">
          
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Sign in to your practice
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Enter your credentials to access your clinical workspace.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5" role="alert">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@practice.com"
                  autoComplete="email"
                  required
                  disabled={submitting}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition shadow-subtle"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition shadow-subtle"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full h-11 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Actions */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-3">
            <p className="text-xs text-slate-500">
              Setting up a new physiotherapy practice?
            </p>
            <Link
              to="/register-practice"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline"
            >
              <Building2 className="w-4 h-4" />
              <span>Start 14-Day Free Practice Trial &rarr;</span>
            </Link>

            <div className="pt-2 text-xs text-slate-400">
              <span>Need an individual staff account? </span>
              <Link to="/signup" className="text-teal-600 font-semibold hover:underline">
                Create account
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Secure Multi-Tenant Healthcare Isolation</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        &copy; {new Date().getFullYear()} Physenra. Physiotherapy EMR &amp; Practice Management.
      </footer>
    </div>
  );
};
