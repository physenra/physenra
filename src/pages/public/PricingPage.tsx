// ==============================================================================
// PHYSENRA DESIGN SYSTEM — PUBLIC PRICING & PLAN COMPARISON PAGE
// File: src/pages/public/PricingPage.tsx
// Route: /pricing
// ==============================================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { formatNaira } from '../../utils/currency';
import {
  CheckCircle2,
  HelpCircle,
  Users,
  HardDrive,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const PricingPage: React.FC = () => {
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');

  const plans = [
    {
      code: 'solo',
      name: 'Solo Practice',
      tagline: 'Ideal for independent physiotherapy consultants managing their private caseload.',
      monthlyNaira: 15000,
      annualNaira: 150000,
      monthlyCents: 1500000,
      annualCents: 15000000,
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
      monthlyCents: 3000000,
      annualCents: 30000000,
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
        'Multi-Clinician Appointment Scheduling',
        'Comprehensive Practice Analytics',
      ],
      excluded: ['DICOM Medical Imaging & PACS'],
    },
    {
      code: 'clinic',
      name: 'Comprehensive Clinic',
      tagline: 'For established physical therapy centers, rehab facilities, and diagnostic practices.',
      monthlyNaira: 50000,
      annualNaira: 500000,
      monthlyCents: 5000000,
      annualCents: 50000000,
      seats: 10,
      storage: '50 GB',
      popular: false,
      trialDays: 14,
      features: [
        'All Professional Clinic Features Included',
        'Up to 10 Clinical Practitioner Seats',
        'DICOM Medical Imaging & Built-in PACS Viewer',
        'X-Ray, MRI, CT & Ultrasound Patient Vault',
        'Specialized Clinical Image Measurements (Cobb Angle)',
        'Priority Phone & Clinical Support',
        'Custom Header & Clinic Letterhead Presets',
      ],
      excluded: [],
    },
    {
      code: 'enterprise',
      name: 'Enterprise Network',
      tagline: 'For multi-branch hospitals, university clinics, and high-volume therapy departments.',
      monthlyNaira: 0,
      annualNaira: 0,
      monthlyCents: 0,
      annualCents: 0,
      seats: 999,
      storage: 'Dedicated',
      popular: false,
      trialDays: 0,
      features: [
        'All Comprehensive Clinic Features',
        'Unlimited Practitioner & Admin Seats',
        'Multi-Branch Consolidated Reporting',
        'Dedicated Cloud PACS Storage Allocation',
        'Custom EHR Data Migration Assistance',
        'Custom Service Level Agreement (SLA)',
        'Dedicated Clinical Account Manager',
      ],
      excluded: [],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-teal-100 selection:text-teal-900">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <BrandLogo size="md" to="/" />
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 transition"
            >
              Sign In
            </Link>
            <Link
              to="/register-practice"
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-14 pb-10 text-center max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>Transparent Practitioner-First Pricing</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Modern practice management plans for every clinic stage
        </h1>
        <p className="mt-4 text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Every tier includes a 14-day free evaluation trial with full clinical write entitlement. 
          No credit card required. If you ever pause or cancel, your clinical records are permanently preserved in safe read-only mode.
        </p>

        {/* Monthly / Annual Segmented Toggle */}
        <div className="mt-8 inline-flex items-center p-1 bg-slate-200/70 border border-slate-300 rounded-xl shadow-inner">
          <button
            onClick={() => setInterval('monthly')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              interval === 'monthly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setInterval('annual')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              interval === 'annual'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Annual Billing</span>
            <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 text-[10px] font-bold">
              Save 2 months
            </span>
          </button>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p) => {
            const isEnterprise = p.code === 'enterprise';
            const priceCents = interval === 'monthly' ? p.monthlyCents : p.annualCents;
            return (
              <div
                key={p.code}
                className={`bg-white rounded-2xl p-6 flex flex-col justify-between transition relative ${
                  p.popular
                    ? 'border-2 border-teal-600 shadow-elevation ring-2 ring-teal-600/10'
                    : 'border border-slate-200 shadow-card hover:border-slate-300'
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-teal-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 min-h-[34px] leading-relaxed">{p.tagline}</p>

                  {/* Price */}
                  <div className="mt-5 pb-5 border-b border-slate-100">
                    {isEnterprise ? (
                      <div>
                        <div className="text-2xl font-bold text-slate-900">Custom Setup</div>
                        <p className="text-xs text-slate-400 mt-1">Tailored capacity &amp; SLA</p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-3xl font-extrabold text-slate-900">
                          {formatNaira(priceCents)}
                          <span className="text-xs text-slate-400 font-normal">
                            {' '}
                            / {interval === 'monthly' ? 'month' : 'year'}
                          </span>
                        </div>
                        {interval === 'annual' && (
                          <p className="text-[11px] text-teal-700 mt-1 font-semibold">
                            Includes 2 months free savings
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="space-y-2.5 py-4 border-b border-slate-100 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>
                        <strong className="font-semibold text-slate-900">{p.seats === 999 ? 'Custom' : p.seats}</strong> Clinical Practitioner
                        {p.seats > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>
                        <strong className="font-semibold text-slate-900">{p.storage}</strong> Cloud Document Vault
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>
                        {p.trialDays > 0 ? `${p.trialDays}-Day Free Trial Included` : 'Dedicated Sales Setup'}
                      </span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="pt-4 space-y-2 text-xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Included Capabilities
                    </span>
                    {p.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2 text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                    {p.excluded.map((feat) => (
                      <div key={feat} className="flex items-start gap-2 text-slate-400 line-through">
                        <span className="w-4 text-center shrink-0">×</span>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <div className="mt-8 pt-4 border-t border-slate-100">
                  {isEnterprise ? (
                    <a
                      href="mailto:contact@physenra.com?subject=Enterprise%20Plan%20Inquiry"
                      className="w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center transition border border-slate-200"
                    >
                      Contact Physenra
                    </a>
                  ) : (
                    <Link
                      to={`/register-practice?plan=${p.code}&interval=${interval}`}
                      className={`w-full h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm ${
                        p.popular
                          ? 'bg-teal-600 hover:bg-teal-700 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <span>Start 14-Day Free Trial</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Safety & Clinical Ethics FAQ */}
      <section className="bg-slate-100/70 border-t border-slate-200 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">
            Non-Negotiable SaaS Safety Guarantees
          </h2>
          <p className="text-center text-slate-500 text-xs mb-10">
            Physenra is designed by physiotherapists for clinical safety and commercial peace of mind.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-card space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-teal-600 shrink-0" />
                <span>What happens when our subscription expires?</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your practice enters non-punitive read-only mode. You can export, review, and print all patient
                records, SOAP notes, and past invoices indefinitely. Patient data is <strong>never deleted</strong> due to non-payment.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-card space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Can platform administrators see patient health records?</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                No. Our PostgreSQL database enforces Row-Level Security (RLS) that bars platform administrators from
                clinical notes, diagnoses, and medical imaging. Only licensed practitioners in your workspace hold access.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-card space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Are administrative staff counted against practitioner seats?</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                No. Seat ceilings strictly apply to clinical practitioners (Physiotherapists and Practice Owners).
                Receptionists, clinic assistants, and accountants are free and unlimited on all tiers.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-card space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Which payment methods are supported?</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Payments are securely processed via Paystack. We support Nigerian debit/credit cards (Mastercard, Visa, Verve),
                direct bank transfers, and USSD with zero foreign exchange fees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Physenra. Clinical practice management and electronic medical records platform.</p>
      </footer>
    </div>
  );
};
