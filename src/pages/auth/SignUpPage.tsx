// ==============================================================================
// PHYSENRA DESIGN SYSTEM — USER SIGN UP PAGE
// File: src/pages/auth/SignUpPage.tsx
// Route: /signup
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { Lock, Mail, User, AlertCircle, ArrowRight, CheckCircle2, Building2, ShieldCheck, Loader2 } from 'lucide-react';

export const SignUpPage: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  // If already authenticated and not in success state, redirect to practice registration or dashboard
  useEffect(() => {
    if (!loading && user && !success) {
      navigate('/register-practice', { replace: true });
    }
  }, [user, loading, success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();

    if (!cleanFirstName) {
      setError('Please provide your first name.');
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters in length.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    try {
      setSubmitting(true);
      const { error: signUpError } = await signUp(cleanEmail, password, {
        first_name: cleanFirstName,
        last_name: cleanLastName,
        display_name: `${cleanFirstName} ${cleanLastName}`.trim(),
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already registered')) {
          setError('An account with this email address already exists. Please sign in instead.');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Account creation failed. Please try again.';
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
            to="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition"
          >
            <span>Sign In</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-card p-6 sm:p-8">
          
          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-200 shadow-subtle">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Account Created Successfully!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Your Physenra credentials are ready. You can now register your practice workspace to begin your 14-day free trial.
              </p>

              <div className="pt-4 flex flex-col gap-3">
                <Link
                  to="/register-practice"
                  className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition shadow-sm"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Register Practice Workspace &rarr;</span>
                </Link>

                <Link
                  to="/login"
                  className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center transition"
                >
                  <span>Go to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Create your Physenra account
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Enter your details to create an account and access your clinical practice.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5" role="alert">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Names */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="block text-xs font-semibold text-slate-700 mb-1">
                      First Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Ada"
                        autoComplete="given-name"
                        required
                        disabled={submitting}
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition shadow-subtle"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-xs font-semibold text-slate-700 mb-1">
                      Last Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Okonkwo"
                        autoComplete="family-name"
                        required
                        disabled={submitting}
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition shadow-subtle"
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ada@lagosphysio.com"
                      autoComplete="email"
                      required
                      disabled={submitting}
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition shadow-subtle"
                    />
                  </div>
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">
                      Password (min. 8 chars)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        autoComplete="new-password"
                        minLength={8}
                        required
                        disabled={submitting}
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition shadow-subtle"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        autoComplete="new-password"
                        minLength={8}
                        required
                        disabled={submitting}
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition shadow-subtle"
                      />
                    </div>
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
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-3">
                <p className="text-xs text-slate-500">
                  Looking to onboard your physiotherapy clinic?
                </p>
                <Link
                  to="/register-practice"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Register Practice Workspace with 14-Day Trial &rarr;</span>
                </Link>

                <div className="pt-2 text-xs text-slate-400">
                  <span>Already have an account? </span>
                  <Link to="/login" className="text-teal-600 font-semibold hover:underline">
                    Sign in
                  </Link>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>HIPAA-aligned Patient Data Segregation</span>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        &copy; {new Date().getFullYear()} Physenra. Physiotherapy EMR &amp; Practice Management.
      </footer>
    </div>
  );
};
