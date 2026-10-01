import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { saasSubscriptionService } from '../../services/saasSubscriptionService';
import type { SaasPlanCode, SaasBillingInterval } from '../../types/models';
import {
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Lock,
} from 'lucide-react';

export const RegisterPracticePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialPlan = (searchParams.get('plan') as SaasPlanCode) || 'professional';
  const initialInterval = (searchParams.get('interval') as SaasBillingInterval) || 'monthly';

  const [practiceName, setPracticeName] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<SaasPlanCode>(initialPlan);
  const [selectedInterval, setSelectedInterval] = useState<SaasBillingInterval>(initialInterval);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const { user } = useAuth();

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
    if (!user) {
      setError('Please sign in or create a user account first to register your practice.');
      return;
    }

    if (!practiceName.trim()) {
      setError('Practice name is required.');
      return;
    }

    if (!slug.trim() || slug.length < 3) {
      setError('Practice slug must be at least 3 lowercase characters.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const result = await saasSubscriptionService.registerPracticeAndSubscribe({
        practice_name: practiceName.trim(),
        slug: slug.trim().toLowerCase(),
        plan_code: selectedPlan,
        billing_interval: selectedInterval,
        country: 'NG',
        timezone: 'Africa/Lagos',
      });

      setSuccess(true);
      setTimeout(() => {
        // Force reload or redirect to app dashboard
        window.location.href = `/app/dashboard?registered=${result.practice_id}`;
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
          Start your 14-day free evaluation trial in seconds. No payment required.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4">
        <div className="bg-slate-900 py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          {!user ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Authentication Required</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Please log into your Physenra account or create one before initializing a practice workspace.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
                >
                  <span>Sign In / Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : success ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Practice Initialized Successfully!</h3>
              <p className="text-xs text-slate-400">
                Your 14-day trial has begun. Preparing your clinical workspace...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {error}
                </div>
              )}

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
                  />
                </div>
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Practice URL Identifier (Slug)
                </label>
                <div className="flex rounded-lg overflow-hidden border border-slate-700 bg-slate-800 text-sm">
                  <span className="px-3 py-2.5 bg-slate-800/80 text-slate-400 text-xs font-mono border-r border-slate-700">
                    physenra.app/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="lagos-spine"
                    className="w-full px-3 py-2.5 bg-slate-800 text-white font-mono text-sm focus:outline-none"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Lowercase letters, numbers, and hyphens only.</p>
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
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-emerald-600/10 border-emerald-500 ring-1 ring-emerald-500/20'
                            : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                        }`}
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
                <span>{submitting ? 'Registering Workspace...' : 'Create Practice & Begin Trial'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
