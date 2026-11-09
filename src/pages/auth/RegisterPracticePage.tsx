// ==============================================================================
// PHYSENRA — PRACTICE ONBOARDING & SELF-SERVICE REGISTRATION
// File: src/pages/auth/RegisterPracticePage.tsx
// Route: /register-practice
//
// Governs:
// 1. Unified 2-column premium healthcare SaaS onboarding layout
// 2. Clear visual hierarchy: Brand & Value panel (Left) + Registration card (Right)
// 3. Step indicator: 1 Account ── 2 Practice ── 3 Plan
// 4. Authoritative plan catalog cards with dynamic Monthly / Annual segmented control
// 5. Account creation + practice registration + 14-day trial provisioning
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePractice } from '../../hooks/usePractice';
import { saasSubscriptionService } from '../../services/saasSubscriptionService';
import { supabase, setActivePracticeHeader } from '../../lib/supabase';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { formatNaira } from '../../utils/currency';
import { referralTrackingService, isValidReferralCode } from '../../services/referralTrackingService';
import type { SaasPlanCode, SaasBillingInterval, SaasPlan } from '../../types/models';
import {
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Lock,
  Mail,
  User,
  LogIn,
  AlertCircle,
  Check,
  Users,
  Shield,
  Sparkles,
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
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'annual'>(
    initialInterval === 'annual' ? 'annual' : 'monthly'
  );
  const [referralCode, setReferralCode] = useState<string>('');
  const [showReferralInput, setShowReferralInput] = useState<boolean>(false);

  // Authoritative plan data from backend
  const [plans, setPlans] = useState<SaasPlan[]>([]);

  // Flow & UI states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const { user, session, loading: authLoading, signUp, signOut } = useAuth();
  const { refreshPractices } = usePractice();

  // Load authoritative public plans on mount & capture referral code
  useEffect(() => {
    let isMounted = true;
    const captured =
      referralTrackingService.captureReferralFromUrl(searchParams) ||
      referralTrackingService.getStoredReferralCode();
    if (captured) {
      setReferralCode(captured);
      setShowReferralInput(true);
    }

    saasSubscriptionService
      .getPublicPlans()
      .then((data) => {
        if (isMounted && data && data.length > 0) {
          setPlans(data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load live plans in registration, using fallback catalog:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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

    // 0. Ensure authentication state is resolved before permitting submission
    if (authLoading) {
      setError('Authentication status is still resolving. Please wait a moment.');
      return;
    }

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
        const { error: signUpError, user: newUser, session: newSession } = await signUp(cleanEmail, password, {
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

        // Handle pending email confirmation safely: account created but no immediate session token
        if (!newSession?.access_token) {
          setError('Account created! Please check your email to confirm your account before creating your practice workspace.');
          setStatusMessage('');
          setSubmitting(false);
          return;
        }

        activeUser = newUser;
      }

      // 3. Verify that a valid, fresh authenticated session exists immediately before RPC
      setStatusMessage('Verifying authentication credentials...');
      let { data: { session: activeSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !activeSession?.access_token) {
        // Attempt session refresh if token is expired or stale
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshData.session) {
          activeSession = refreshData.session;
        }
      }

      if (!activeSession?.access_token) {
        setError('Authentication session is missing or expired. Please sign in to complete practice registration.');
        setSubmitting(false);
        return;
      }

      // 4. Atomically register practice, assign owner role, and provision 14-day trial
      setStatusMessage('Initializing clinical workspace and 14-day trial...');
      const cleanRefCode = referralCode.trim() ? referralCode.trim().toUpperCase() : undefined;
      const result = await saasSubscriptionService.registerPracticeAndSubscribe({
        practice_name: practiceName.trim(),
        slug: cleanSlug,
        plan_code: selectedPlan,
        billing_interval: selectedInterval,
        country: 'NG',
        timezone: 'Africa/Lagos',
        referral_code: cleanRefCode,
      });

      // Clear referral attribution storage on success
      referralTrackingService.clearStoredReferralCode();

      // 5. Establish practice context header immediately
      setActivePracticeHeader(result.practice_id);
      setStatusMessage('Practice initialized! Establishing workspace context...');

      // Authoritatively refresh PracticeContext before routing to prevent zero-practice race
      try {
        await refreshPractices();
      } catch (refreshErr) {
        console.warn('Physenra: Background practice refresh notice:', refreshErr);
      }

      setStatusMessage('Practice initialized! Redirecting to clinical workspace...');
      setSuccess(true);

      // 6. Navigate to canonical practice dashboard
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
        const sanitized = rawMsg.replace(/RPC failed: |Database error: /gi, '');
        setError(sanitized);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Authoritative plans fallback if network delayed
  const planCatalog = plans.length > 0 ? plans : [
    {
      id: 'plan_solo',
      plan_code: 'solo' as SaasPlanCode,
      name: 'Solo Practice',
      description: 'Ideal for independent physiotherapy consultants.',
      monthly_price_cents: 1500000,
      annual_price_cents: 15000000,
      practitioner_seat_limit: 1,
      storage_allowance_mb: 5120,
    },
    {
      id: 'plan_pro',
      plan_code: 'professional' as SaasPlanCode,
      name: 'Professional Clinic',
      description: 'Built for collaborative clinics with up to 5 clinicians.',
      monthly_price_cents: 3000000,
      annual_price_cents: 30000000,
      practitioner_seat_limit: 5,
      storage_allowance_mb: 15360,
    },
    {
      id: 'plan_clinic',
      plan_code: 'clinic' as SaasPlanCode,
      name: 'Comprehensive Clinic',
      description: 'Full multi-practitioner clinic with DICOM imaging.',
      monthly_price_cents: 5000000,
      annual_price_cents: 50000000,
      practitioner_seat_limit: 10,
      storage_allowance_mb: 51200,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-teal-100 selection:text-teal-900">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <BrandLogo size="md" to="/" showSubtitle={false} />
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">Already registered?</span>
            <Link
              to="/login?from=/register-practice"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-teal-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* ================================================================ */}
          {/* LEFT COLUMN: BRAND & CLINICAL VALUE PANEL                        */}
          {/* ================================================================ */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Modern Physiotherapy EMR</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                Your practice. Your patients. One intelligent workspace.
              </h1>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Physenra unites clinical SOAP documentation, outcome assessments, exercise prescription, 
                and practice management into a single HIPAA-aligned clinical workspace designed specifically for physiotherapy.
              </p>
            </div>

            {/* Feature Highlights List */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-3.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Included in Your 14-Day Free Trial
              </h2>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-slate-900 font-semibold block">Specialized Clinical EMR</strong>
                    <span>SOAP notes, body charts, functional outcome measures, and HEP prescription.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-slate-900 font-semibold block">Practice Scheduling &amp; Calendar</strong>
                    <span>Multi-clinician appointment scheduling, attendance, and patient reminders.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-slate-900 font-semibold block">Secure Multi-Tenant Architecture</strong>
                    <span>Complete patient privacy with strict row-level security and tenant isolation.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-slate-900 font-semibold block">Packages, Wallets &amp; Invoicing</strong>
                    <span>Patient account balances, session packages, and itemized billing.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reassurance Callout */}
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 font-semibold block mb-0.5">Safe Read-Only Data Preservation</strong>
                <span>
                  No credit card required. If your trial lapses, your clinical records remain safely accessible in read-only mode — your patient data is never held hostage.
                </span>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* RIGHT COLUMN: REGISTRATION CARD & STEP FORM                      */}
          {/* ================================================================ */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 sm:p-8">
              
              {/* Form Header */}
              <div className="mb-6 pb-5 border-b border-slate-100">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Register your practice
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Start your 14-day free trial. Full clinical write access included.
                </p>

                {/* Polished Step Indicator (Step 8) */}
                <div className="mt-6 flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2 text-teal-700">
                    <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-subtle">
                      {user && session && !authLoading ? <Check className="w-3.5 h-3.5" /> : '1'}
                    </div>
                    <span>Account</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-slate-200 mx-3 rounded" />
                  <div className="flex items-center gap-2 text-teal-700">
                    <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-subtle">
                      2
                    </div>
                    <span>Practice</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-slate-200 mx-3 rounded" />
                  <div className="flex items-center gap-2 text-teal-700">
                    <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-subtle">
                      3
                    </div>
                    <span>Plan</span>
                  </div>
                </div>
              </div>

              {/* Success Screen */}
              {success ? (
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-200 shadow-subtle">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Practice Workspace Initialized!</h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                    {statusMessage || 'Your 14-day evaluation trial has begun. Preparing your clinical workspace...'}
                  </p>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-2 text-xs text-teal-700 font-semibold bg-teal-50 px-3 py-1.5 rounded-full border border-teal-200">
                      <Clock className="w-3.5 h-3.5 animate-spin text-teal-600" />
                      <span>Opening clinical dashboard...</span>
                    </span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{error}</span>
                    </div>
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* STEP 1: PRACTICE OWNER ACCOUNT                           */}
                  {/* -------------------------------------------------------- */}
                  {authLoading ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-2.5 text-xs text-slate-500">
                      <Clock className="w-4 h-4 animate-spin text-teal-600" />
                      <span>Verifying account status...</span>
                    </div>
                  ) : user && session ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500 font-medium">Signed in as Practice Owner</p>
                          <p className="text-xs font-bold text-slate-900">{user.email}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => signOut()}
                        className="text-xs text-teal-700 hover:text-teal-800 font-semibold hover:underline"
                      >
                        Switch account
                      </button>
                    </div>
                  ) : user && !session ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800">
                      <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Session expired for {user.email}. Please sign in again.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => signOut()}
                        className="text-xs text-amber-900 hover:underline font-semibold"
                      >
                        Sign in
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-teal-600" />
                          <span>Step 1: Practice Owner Account</span>
                        </span>
                        <Link
                          to="/login?from=/register-practice"
                          className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Sign in instead</span>
                        </Link>
                      </div>

                      {/* Name fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            First Name
                          </label>
                          <div className="relative">
                            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              placeholder="e.g. Ada"
                              autoComplete="given-name"
                              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition shadow-subtle"
                              required
                              disabled={submitting}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Last Name
                          </label>
                          <div className="relative">
                            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              placeholder="e.g. Okonkwo"
                              autoComplete="family-name"
                              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition shadow-subtle"
                              required
                              disabled={submitting}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Work Email */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Work Email Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="dr.ada@lagosspine.com"
                            autoComplete="email"
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition shadow-subtle"
                            required
                            disabled={submitting}
                          />
                        </div>
                      </div>

                      {/* Passwords */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Password (min. 8 chars)
                          </label>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••••••"
                              autoComplete="new-password"
                              minLength={8}
                              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition shadow-subtle"
                              required
                              disabled={submitting}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Confirm Password
                          </label>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="••••••••••••"
                              autoComplete="new-password"
                              minLength={8}
                              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition shadow-subtle"
                              required
                              disabled={submitting}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* STEP 2: PRACTICE INFORMATION                             */}
                  {/* -------------------------------------------------------- */}
                  <div className="space-y-4 pt-2">
                    <div className="pb-1 border-b border-slate-100">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-teal-600" />
                        <span>Step 2: Practice Information</span>
                      </span>
                    </div>

                    {/* Practice Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Practice / Clinic Name
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={practiceName}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="e.g. Lagos Spine &amp; Sports Physiotherapy"
                          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition shadow-subtle"
                          required
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    {/* Practice URL Identifier */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Practice URL Identifier (Slug)
                      </label>
                      <div className="flex rounded-xl overflow-hidden border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition shadow-subtle">
                        <span className="px-3 py-2.5 bg-slate-100 text-slate-500 text-xs font-mono border-r border-slate-200 flex items-center select-none">
                          physenra.app/
                        </span>
                        <input
                          type="text"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder="lagos-spine"
                          className="w-full px-3 py-2.5 bg-white text-slate-900 font-mono text-xs focus:outline-none"
                          required
                          disabled={submitting}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Unique clinic identifier. 3–48 lowercase letters, numbers, and hyphens.
                      </p>
                    </div>

                    {/* Referral Partner Attribution */}
                    <div className="pt-1">
                      {!showReferralInput && !referralCode ? (
                        <button
                          type="button"
                          onClick={() => setShowReferralInput(true)}
                          className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 underline flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-teal-500" />
                          <span>Have a referral code from a Physenra Sales Partner?</span>
                        </button>
                      ) : (
                        <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-teal-900 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                              <span>Sales Partner Referral Code</span>
                            </label>
                            {referralCode && (
                              <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Applied
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={referralCode}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
                              setReferralCode(val);
                              if (val && isValidReferralCode(val)) {
                                referralTrackingService.setReferralCode(val, true);
                              }
                            }}
                            placeholder="e.g. LAGOS-REP-01"
                            className="w-full px-3 py-2 bg-white border border-teal-300 rounded-lg text-xs font-mono font-semibold text-teal-900 placeholder-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                            disabled={submitting}
                          />
                          <p className="text-[11px] text-teal-700 mt-1">
                            Your practice will be connected with your Physenra representative for priority onboarding.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* -------------------------------------------------------- */}
                  {/* STEP 3: CHOOSE YOUR PLAN                                 */}
                  {/* -------------------------------------------------------- */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-teal-600" />
                        <span>Step 3: Choose Your Plan</span>
                      </span>

                      {/* Segmented Control for Billing Interval (Step 11) */}
                      <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setSelectedInterval('monthly')}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                            selectedInterval === 'monthly'
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedInterval('annual')}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                            selectedInterval === 'annual'
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <span>Annual</span>
                          <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                            Save 2 months
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Plan Cards Grid (Step 10) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {planCatalog.map((p) => {
                        const isSelected = selectedPlan === p.plan_code;
                        const priceCents =
                          selectedInterval === 'annual' ? p.annual_price_cents : p.monthly_price_cents;
                        const periodLabel = selectedInterval === 'annual' ? '/yr' : '/mo';

                        return (
                          <div
                            key={p.plan_code}
                            onClick={() => setSelectedPlan(p.plan_code)}
                            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                              isSelected
                                ? 'bg-teal-50/40 border-teal-600 ring-2 ring-teal-600/20 shadow-sm'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs font-bold ${isSelected ? 'text-teal-900' : 'text-slate-900'}`}>
                                  {p.name}
                                </span>
                                {isSelected ? (
                                  <div className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border border-slate-300" />
                                )}
                              </div>

                              <div className="mt-1">
                                <span className="text-base font-extrabold text-slate-900">
                                  {formatNaira(priceCents)}
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium ml-1">
                                  {periodLabel}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">
                                {p.description}
                              </p>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-teal-600" />
                              <span>{p.practitioner_seat_limit} Clinician {p.practitioner_seat_limit === 1 ? 'Seat' : 'Seats'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Enterprise Callout */}
                    <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-between text-xs text-slate-600">
                      <div>
                        <strong className="text-slate-900 block font-semibold">Hospital or Multi-Facility Network?</strong>
                        <span className="text-slate-500">Custom pricing for unlimited seats &amp; dedicated PACS.</span>
                      </div>
                      <a
                        href="mailto:contact@physenra.com?subject=Enterprise%20Setup"
                        className="text-teal-700 font-bold hover:underline shrink-0"
                      >
                        Contact Physenra &rarr;
                      </a>
                    </div>
                  </div>

                  {/* -------------------------------------------------------- */}
                  {/* SUBMISSION CTA & REASSURANCE                             */}
                  {/* -------------------------------------------------------- */}
                  <div className="pt-3 space-y-3">
                    <button
                      type="submit"
                      disabled={submitting || authLoading}
                      className="w-full h-12 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                    >
                      {submitting ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          <span>{statusMessage || 'Initializing Workspace...'}</span>
                        </>
                      ) : authLoading ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          <span>Verifying Account...</span>
                        </>
                      ) : (
                        <>
                          <span>Start My 14-Day Free Trial</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-500 text-center">
                      <span className="inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-teal-600" />
                        14-day free trial
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-teal-600" />
                        No credit card required
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-teal-600" />
                        Cancel anytime
                      </span>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} Physenra. All rights reserved. Specialized Physiotherapy Practice Management.</p>
      </footer>
    </div>
  );
};
