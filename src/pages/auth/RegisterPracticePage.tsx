import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { saasSubscriptionService } from '../../services/saasSubscriptionService';
import { setActivePracticeHeader } from '../../lib/supabase';
import type { SaasPlanCode, SaasBillingInterval } from '../../types/models';
import {
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Lock,
  Mail,
  User,
  LogIn,
  AlertCircle,
} from 'lucide-react';

export const RegisterPracticePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialPlan = (searchParams.get('plan') as SaasPlanCode) || 'professional';
  const initialInterval = (searchParams.get('interval') as SaasBillingInterval) || 'monthly';

  // Account creation fields (used if visitor is not yet authenticated)
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // Practice & Subscription fields
  const [practiceName, setPracticeName] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<SaasPlanCode>(initialPlan);
  const [selectedInterval, setSelectedInterval] = useState<SaasBillingInterval>(initialInterval);

  // Flow & UI states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const { user, signUp, signOut } = useAuth();

  // Auto-slugify when practice name changes if slug wasn't manually edited
  const handleNameChange = (name: string) => {
    setPracticeName(name);
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validate Practice Information
    if (!practiceName.trim()) {
      setError('Practice name is required.');
      return;
    }

    const cleanSlug = slug.trim().toLowerCase();
    if (!cleanSlug || cleanSlug.length < 3 || cleanSlug.length > 48) {
      setError('Practice URL identifier (slug) must be between 3 and 48 characters.');
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) {
      setError('Slug must consist of lowercase letters, numbers, and single hyphens (e.g. lagos-spine).');
      return;
    }

    try {
      setSubmitting(true);
      let activeUser = user;

      // 2. If visitor is not yet authenticated, create their account first
      if (!activeUser) {
        const cleanFirstName = firstName.trim();
        const cleanLastName = lastName.trim();
        const cleanEmail = email.trim();

        if (!cleanFirstName) {
          setError('Please provide your first name for your administrator profile.');
          setSubmitting(false);
          return;
        }

        if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          setError('Please enter a valid work email address.');
          setSubmitting(false);
          return;
        }

        if (password.length < 8) {
          setError('Password must be at least 8 characters in length.');
          setSubmitting(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match. Please verify your password confirmation.');
          setSubmitting(false);
          return;
        }

        setStatusMessage('Creating your Practice Owner account...');
        const { error: signUpError, user: newUser } = await signUp(cleanEmail, password, {
          first_name: cleanFirstName,
          last_name: cleanLastName,
          display_name: `${cleanFirstName} ${cleanLastName}`.trim(),
        });

        if (signUpError) {
          if (signUpError.message.toLowerCase().includes('already registered')) {
            setError('An account with this email address already exists. Please sign in to register a practice under your existing account.');
          } else {
            setError(signUpError.message);
          }
          setSubmitting(false);
          return;
        }

        activeUser = newUser;
      }

      // 3. Atomically register practice, assign owner role, and provision 14-day trial
      setStatusMessage('Initializing clinical workspace and 14-day trial...');
      const result = await saasSubscriptionService.registerPracticeAndSubscribe({
        practice_name: practiceName.trim(),
        slug: cleanSlug,
        plan_code: selectedPlan,
        billing_interval: selectedInterval,
        country: 'NG',
        timezone: 'Africa/Lagos',
      });

      // 4. Establish practice context header immediately
      setActivePracticeHeader(result.practice_id);
      setStatusMessage('Practice initialized! Redirecting to clinical workspace...');
      setSuccess(true);

      // 5. Navigate to canonical practice dashboard
      setTimeout(() => {
        window.location.href = `/app/dashboard?registered=${result.practice_id}`;
      }, 1200);

    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : 'Registration failed';
      if (rawMsg.includes('unique_violation') || rawMsg.includes('already registered')) {
        setError(`The practice URL identifier "${slug}" is already registered. Please choose a different URL slug.`);
      } else if (rawMsg.includes('insufficient_privilege') || rawMsg.includes('Authentication required')) {
        setError('Authentication required. Please sign in to complete practice registration.');
      } else {
        setError(rawMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-white">Physenra</span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold text-white tracking-tight">
          Register Your Practice Workspace
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Start your 14-day free evaluation trial in seconds. No credit card required.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4">
        <div className="bg-slate-900 py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          {success ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Practice Initialized Successfully!</h3>
              <p className="text-xs text-slate-400">
                {statusMessage || 'Your 14-day trial has begun. Preparing your clinical workspace...'}
              </p>
              <div className="pt-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading dashboard...</span>
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Authentication Status / Account Creation Section */}
              {user ? (
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Signed in as Practice Owner</p>
                      <p className="text-xs font-semibold text-white">{user.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline"
                  >
                    Change account
                  </button>
                </div>
              ) : (
                <div className="space-y-4 pt-1 pb-2 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>Step 1: Practice Owner Account</span>
                    </h3>
                    <Link
                      to="/login?from=/register-practice"
                      className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1"
                    >
                      <LogIn className="w-3 h-3" />
                      <span>Already have an account? Sign in</span>
                    </Link>
                  </div>

                  {/* Name fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        First Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="e.g. Ada"
                          autoComplete="given-name"
                          className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                          required
                          disabled={submitting}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Last Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="e.g. Okonkwo"
                          autoComplete="family-name"
                          className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                          required
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Work Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="dr.ada@lagosspine.com"
                        autoComplete="email"
                        className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Password & Confirm */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Password (min. 8 chars)
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          autoComplete="new-password"
                          minLength={8}
                          className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                          required
                          disabled={submitting}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          autoComplete="new-password"
                          minLength={8}
                          className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                          required
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Practice Information */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{user ? 'Practice Information' : 'Step 2: Practice Information'}</span>
                </h3>

                {/* Practice Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Practice Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={practiceName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Lagos Spine & Sports Physiotherapy"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Practice URL Identifier (Slug)
                  </label>
                  <div className="flex rounded-lg overflow-hidden border border-slate-700 bg-slate-800 text-sm">
                    <span className="px-3 py-2 bg-slate-800/80 text-slate-400 text-xs font-mono border-r border-slate-700 flex items-center">
                      physenra.app/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="lagos-spine"
                      className="w-full px-3 py-2 bg-slate-800 text-white font-mono text-xs focus:outline-none"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Unique clinic identifier. 3-48 lowercase letters, numbers, and hyphens.
                  </p>
                </div>
              </div>

              {/* Plan Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span>Selected Subscription Plan</span>
                  <Link to="/pricing" className="text-emerald-400 hover:underline text-[11px]">
                    Compare features
                  </Link>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { code: 'solo', name: 'Solo Practice', price: '₦15,000/mo', seats: '1 Clinician' },
                    { code: 'professional', name: 'Professional', price: '₦30,000/mo', seats: '5 Clinicians' },
                    { code: 'clinic', name: 'Comprehensive', price: '₦50,000/mo', seats: '10 Clinicians + DICOM' },
                  ].map((p) => {
                    const isSelected = selectedPlan === p.code;
                    return (
                      <button
                        type="button"
                        key={p.code}
                        onClick={() => setSelectedPlan(p.code as SaasPlanCode)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-emerald-600/10 border-emerald-500 ring-1 ring-emerald-500/20'
                            : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                        }`}
                        disabled={submitting}
                      >
                        <p className={`text-xs font-bold ${isSelected ? 'text-emerald-400' : 'text-white'}`}>
                          {p.name}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-300 mt-0.5">{p.price}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{p.seats}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Billing Interval */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Billing Cycle Preference
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedInterval('monthly')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      selectedInterval === 'monthly'
                        ? 'bg-slate-800 border-emerald-500 text-emerald-400'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400'
                    }`}
                    disabled={submitting}
                  >
                    Monthly (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedInterval('annual')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      selectedInterval === 'annual'
                        ? 'bg-slate-800 border-emerald-500 text-emerald-400'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400'
                    }`}
                    disabled={submitting}
                  >
                    Annual (2 Months Free)
                  </button>
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700 text-xs text-slate-400 flex items-start gap-2">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  You will receive full access for 14 days without charge. You will be assigned as{' '}
                  <strong className="text-white">Practice Owner</strong> with full administrator authority over your clinic.
                </span>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-600/20"
              >
                <span>
                  {submitting
                    ? (statusMessage || 'Initializing Workspace...')
                    : 'Create Practice & Begin 14-Day Free Trial'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
