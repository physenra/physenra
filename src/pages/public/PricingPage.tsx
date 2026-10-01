import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Shield,
  HelpCircle,
  Users,
  HardDrive,
  Clock,
  Sparkles,
} from 'lucide-react';

export const PricingPage: React.FC = () => {
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');

  const plans = [
    {
      code: 'solo',
      name: 'Solo Practice',
      tagline: 'Ideal for independent practitioners managing their private caseload.',
      monthlyNaira: 15000,
      annualNaira: 150000,
      seats: 1,
      storage: '5 GB',
      popular: false,
      trialDays: 14,
      features: [
        'Complete Clinical SOAP Notes & Templates',
        'Patient Registry & Demographic Records',
        'Appointment Scheduling & Calendar',
        'Invoicing & Direct Patient Receipts',
        'Exercise Prescription & HEP Builder',
        'Outcome Measures & Functional Tests',
        'Unlimited Reception & Admin Staff',
      ],
      excluded: [
        'Patient Wallets & Balances',
        'Treatment Session Packages',
        'Recurring Patient Memberships',
        'Inventory & Consumables Tracking',
        'DICOM Medical Imaging & PACS',
      ],
    },
    {
      code: 'professional',
      name: 'Professional Clinic',
      tagline: 'Built for collaborative physiotherapy clinics with 2 to 5 practitioners.',
      monthlyNaira: 30000,
      annualNaira: 300000,
      seats: 5,
      storage: '15 GB',
      popular: true,
      trialDays: 14,
      features: [
        'All Solo Practice Features Included',
        'Up to 5 Clinical Practitioner Seats',
        'Patient Wallets & Account Credits',
        'Treatment Session Packages & Balances',
        'Recurring Patient Memberships & Cycles',
        'Inventory & Clinical Consumables Control',
        'Discharge Summaries & Progress Reviews',
        'Unlimited Reception & Admin Staff',
      ],
      excluded: [
        'DICOM Medical Imaging & PACS Viewer',
        'Multi-Branch Consolidated Reporting',
      ],
    },
    {
      code: 'clinic',
      name: 'Comprehensive Clinic',
      tagline: 'Complete clinical EMR, diagnostic imaging, and practice management.',
      monthlyNaira: 50000,
      annualNaira: 500000,
      seats: 10,
      storage: '50 GB',
      popular: false,
      trialDays: 14,
      features: [
        'All Professional Clinic Features Included',
        'Up to 10 Clinical Practitioner Seats',
        'Full DICOM & Medical Imaging (PACS)',
        'Radiology Orders & Formal Reports',
        'PACS Image Attachment Viewer',
        'Advanced Clinical Analytics & Metrics',
        '50 GB Medical Imaging Cloud Vault',
        'Priority Technical Clinical Support',
      ],
      excluded: [
        'Multi-Branch Network Consolidated Ledger',
      ],
    },
    {
      code: 'enterprise',
      name: 'Hospital & Network',
      tagline: 'Custom infrastructure for hospital departments and multi-facility networks.',
      monthlyNaira: 0,
      annualNaira: 0,
      seats: 999,
      storage: '200 GB+',
      popular: false,
      trialDays: 0,
      features: [
        'Custom Practitioner Seat Allocation',
        'Multi-Branch & Multi-Facility Operations',
        '200 GB+ PACS High-Capacity Storage',
        'Custom Data Migration & Onboarding',
        'Dedicated SLA & 24/7 Priority Support',
        'Custom Clinical Form Integration',
      ],
      excluded: [],
    },
  ];

  const formatNaira = (naira: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(naira);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">Physenra</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register-practice"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-12 text-center max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>V1.1 Commercial Platform Release</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Transparent, Practitioner-First Plans for Modern Physiotherapy
        </h1>
        <p className="mt-4 text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
          Every plan includes a 14-day free evaluation trial. No credit card required to start.
          Lapsed subscriptions enter safe read-only mode — your clinical records are never held hostage.
        </p>

        {/* Monthly / Annual Toggle */}
        <div className="mt-8 inline-flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl shadow-inner">
          <button
            onClick={() => setInterval('monthly')}
            className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
              interval === 'monthly'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setInterval('annual')}
            className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              interval === 'annual'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Annual Billing</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300 text-[10px] font-bold">
              2 Months Free
            </span>
          </button>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p) => {
            const isEnterprise = p.code === 'enterprise';
            const price = interval === 'monthly' ? p.monthlyNaira : p.annualNaira;
            return (
              <div
                key={p.code}
                className={`bg-slate-900 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 shadow-sm relative ${
                  p.popular
                    ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/20 shadow-emerald-500/10'
                    : 'border border-slate-800 hover:border-slate-700'
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-500 text-slate-950 text-[11px] font-bold uppercase tracking-wider rounded-full shadow-md">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">{p.name}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 min-h-[34px]">{p.tagline}</p>

                  {/* Price */}
                  <div className="mt-5 pb-5 border-b border-slate-800">
                    {isEnterprise ? (
                      <div>
                        <div className="text-2xl font-bold text-white">Custom Quote</div>
                        <p className="text-xs text-slate-500 mt-1">Tailored capacity & SLA</p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-3xl font-extrabold text-white">
                          {formatNaira(price)}
                          <span className="text-xs text-slate-400 font-normal">
                            {' '}
                            / {interval === 'monthly' ? 'month' : 'year'}
                          </span>
                        </div>
                        {interval === 'annual' && (
                          <p className="text-xs text-emerald-400 mt-1 font-medium">
                            Equivalent to {formatNaira(p.monthlyNaira * 10 / 12)} / month
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="space-y-2.5 py-4 border-b border-slate-800 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>{p.seats === 999 ? 'Custom' : p.seats}</strong> Clinical Practitioner
                        {p.seats > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>
                        <strong>{p.storage}</strong> Cloud Document Vault
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        {p.trialDays > 0 ? `${p.trialDays}-Day Free Trial Included` : 'Dedicated Sales Setup'}
                      </span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="pt-4 space-y-2 text-xs">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Included Capabilities
                    </span>
                    {p.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2 text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                    {p.excluded.map((feat) => (
                      <div key={feat} className="flex items-start gap-2 text-slate-600 line-through">
                        <span className="w-4 text-center shrink-0">×</span>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Call to action */}
                <div className="mt-8 pt-4 border-t border-slate-800">
                  {isEnterprise ? (
                    <a
                      href="mailto:contact@physenra.com?subject=Enterprise%20Plan%20Inquiry"
                      className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center transition-colors border border-slate-700"
                    >
                      Contact Sales
                    </a>
                  ) : (
                    <Link
                      to={`/register-practice?plan=${p.code}&interval=${interval}`}
                      className={`w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors shadow-sm ${
                        p.popular
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      Start 14-Day Free Trial
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Safety & Clinical Ethics FAQ */}
      <section className="bg-slate-900/60 border-t border-slate-800 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-white mb-2">
            Non-Negotiable SaaS Safety Guarantees
          </h2>
          <p className="text-center text-slate-400 text-xs mb-10">
            Physenra is designed by physiotherapists for clinical safety and commercial peace of mind.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                What happens when our subscription expires?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your practice enters non-punitive read-only mode. You can export, review, and print all patient
                records, SOAP notes, and past invoices indefinitely. Patient data is <strong>never deleted</strong> due to non-payment.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                Can platform administrators see patient health records?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                No. Our PostgreSQL database enforces Row-Level Security (RLS) that bars platform administrators from
                clinical notes, diagnoses, and medical imaging. Only licensed practitioners in your workspace hold access.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                Are administrative staff counted against practitioner seats?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                No. Seat ceilings strictly apply to clinical practitioners (Physiotherapists and Practice Owners).
                Receptionists, clinic assistants, and accountants are free and unlimited on all tiers.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                Which payment methods are supported?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Payments are securely processed via Paystack. We support Nigerian debit/credit cards (Mastercard, Visa, Verve),
                direct bank transfers, and USSD with zero foreign exchange fees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-500">
        <p>© 2026 Physenra. Clinical practice management and electronic medical records platform.</p>
      </footer>
    </div>
  );
};
