// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — HOMEPAGE ARCHITECTURAL SHELL
// File: src/public/pages/HomePageShell.tsx
// Route: /
// ==============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { PrimaryCTAButton } from '../components/PrimaryCTAButton';
import { SecondaryCTAButton } from '../components/SecondaryCTAButton';
import { SectionHeading } from '../components/SectionHeading';
import { FeatureCard } from '../components/FeatureCard';
import { FAQAccordion, FAQItem } from '../components/FAQAccordion';
import { AUTHORITATIVE_SAAS_PLANS } from '../data/plans';
import { formatNaira } from '../../utils/currency';
import {
  Activity,
  Calendar,
  Layers,
  Wallet,
  Scan,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Lock,
  ArrowRight,
} from 'lucide-react';

const HOMEPAGE_FAQS: FAQItem[] = [
  {
    question: 'Do I need to enter payment card details to start the trial?',
    answer:
      'No. Physenra provides a full-featured 14-day free trial on all plans with no credit card required. You can set up your practice workspace in under two minutes.',
  },
  {
    question: 'How does the built-in DICOM PACS medical imaging viewer work?',
    answer:
      'Physenra incorporates a browser-based Web PACS viewer. Clinicians can upload standard DICOM studies (MRI, CT, X-ray) directly into an episode of care, adjust window levels, and measure Cobb angles inside the patient chart.',
  },
  {
    question: 'What happens if my practice subscription expires or cancels?',
    answer:
      'Physenra guarantees non-punitive read-only data retention. If your subscription ever lapses, your clinical notes and patient histories remain accessible in read-only mode so you never lose patient records.',
  },
  {
    question: 'Are patient medical records isolated between different practices?',
    answer:
      'Yes. Our platform utilizes strict PostgreSQL Row-Level Security (RLS) and an architectural Platform Admin Privacy Firewall that bars SaaS system operators from accessing patient clinical PHI.',
  },
];

export const HomePageShell: React.FC = () => {
  return (
    <MarketingLayout>
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white py-16 sm:py-24 lg:py-32 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Specialized Physiotherapy EMR & Practice OS
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
                The Clinical EMR Purpose-Built for <span className="text-teal-700">Physiotherapy</span>.
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl">
                Document musculoskeletal assessments in minutes, review DICOM diagnostic imaging in your browser, automate multi-session treatment packages, and run your entire practice on one secure platform.
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <PrimaryCTAButton size="lg" to="/register-practice">
                  Start 14-Day Free Trial
                </PrimaryCTAButton>
                <SecondaryCTAButton size="lg" to="/pricing">
                  View Transparent Pricing
                </SecondaryCTAButton>
              </div>

              <div className="mt-6 flex items-center gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>2-minute practice setup</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Full clinical features</span>
                </div>
              </div>
            </div>

            {/* 2. PRODUCT PREVIEW SHELL */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-lg ring-1 ring-slate-900/5">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-200" />
                    <div className="w-3 h-3 rounded-full bg-slate-200" />
                    <div className="w-3 h-3 rounded-full bg-slate-200" />
                  </div>
                  <span className="text-xs font-mono text-slate-400">physenra.com/platform</span>
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-100 text-left">
                    <div className="text-xs font-semibold text-teal-800">Active Patient Encounter</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">L5-S1 Lumbar Radiculopathy</div>
                    <div className="text-xs text-slate-500">SOAP Charting • Oxford MMT • VAS: 6/10 • ODI: 42%</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-left flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-slate-500">Active Treatment Package</div>
                      <div className="text-sm font-semibold text-slate-900">Post-Op Rehab (10 Sessions)</div>
                    </div>
                    <span className="px-2 py-1 rounded text-xs font-bold bg-amber-100 text-amber-800">
                      7 Sessions Left
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 text-white text-left flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scan className="w-4 h-4 text-teal-400" />
                      <div className="text-xs">Web DICOM PACS • Spine MRI</div>
                    </div>
                    <span className="text-xs font-mono text-emerald-400">Cobb: 14.2°</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TRUST BAR */}
      <section className="bg-slate-50 border-b border-slate-200/80 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-6 h-6 text-teal-700 mb-1" />
              <div className="text-sm font-bold text-slate-900">PostgreSQL RLS</div>
              <div className="text-xs text-slate-500">Tenant Data Isolation</div>
            </div>
            <div className="flex flex-col items-center">
              <Lock className="w-6 h-6 text-teal-700 mb-1" />
              <div className="text-sm font-bold text-slate-900">Admin Privacy Firewall</div>
              <div className="text-xs text-slate-500">Zero Staff PHI Access</div>
            </div>
            <div className="flex flex-col items-center">
              <Scan className="w-6 h-6 text-teal-700 mb-1" />
              <div className="text-sm font-bold text-slate-900">Web DICOM PACS</div>
              <div className="text-xs text-slate-500">Zero Desktop Plugins</div>
            </div>
            <div className="flex flex-col items-center">
              <Wallet className="w-6 h-6 text-teal-700 mb-1" />
              <div className="text-sm font-bold text-slate-900">Paystack Verified</div>
              <div className="text-xs text-slate-500">Automated Naira Invoicing</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CLINICAL WORKFLOW */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="End-to-End Care Cycle"
            title="Designed Around How Physiotherapists Actually Work"
            subtitle="Connect patient intake, specialized clinical documentation, diagnostic imaging, and package billing into one unified workflow."
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Intake & Episode Creation</h3>
              <p className="mt-2 text-sm text-slate-600">
                Structure patient medical history around distinct Episodes of Care—acute injuries, post-operative rehab, or chronic conditions.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Musculoskeletal Assessment</h3>
              <p className="mt-2 text-sm text-slate-600">
                Document active/passive ROM, Oxford muscle strength grades, and automated functional outcome scores (NDI, ODI, LEFS, QuickDASH).
              </p>
            </div>
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Package Billing & Discharge</h3>
              <p className="mt-2 text-sm text-slate-600">
                Assign multi-session therapy packages, deduct sessions automatically upon visit completion, and print official tax receipts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FEATURE CATEGORIES */}
      <section className="py-16 sm:py-24 bg-slate-50/60 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Platform Capabilities"
            title="Everything Your Physiotherapy Practice Needs"
            subtitle="Explore our verified, clinical-grade modules built specifically for physical therapy workflows."
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            <FeatureCard
              icon={<Activity className="w-6 h-6" />}
              title="Physiotherapy SOAP Notes"
              description="Specialized musculoskeletal examination, joint mapping, ROM, Oxford muscle testing, and functional outcome scales."
              linkTo="/features/physiotherapy-emr"
            />
            <FeatureCard
              icon={<Scan className="w-6 h-6" />}
              title="Built-in DICOM PACS"
              description="Review MRI, CT, and X-ray studies directly in the patient record with window leveling presets and Cobb angle calipers."
              linkTo="/features/medical-imaging"
            />
            <FeatureCard
              icon={<Layers className="w-6 h-6" />}
              title="Treatment Packages"
              description="Prepaid therapy bundles with atomic session decrementing upon visit completion. Never lose track of paid sessions."
              linkTo="/features/treatment-packages"
            />
            <FeatureCard
              icon={<Wallet className="w-6 h-6" />}
              title="Patient Deposit Wallets"
              description="Accept advance deposits, maintain immutable credit ledgers, and execute front-desk split payments seamlessly."
              linkTo="/features/treatment-packages"
            />
            <FeatureCard
              icon={<Calendar className="w-6 h-6" />}
              title="Appointment Scheduling"
              description="Multi-practitioner column calendar, treatment bay management, and seamless appointment-to-visit conversion."
              linkTo="/features/appointments"
            />
            <FeatureCard
              icon={<FileText className="w-6 h-6" />}
              title="Invoicing & Paystack"
              description="Generate compliant tax invoices, print official receipts, and process online card payments via verified Paystack rails."
              linkTo="/features/billing"
            />
          </div>
        </div>
      </section>

      {/* 6. PRACTICE OPERATIONS & 7. BILLING */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 mb-4">
                Practice Operations & Billing
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                Eliminate Front-Desk Session Disputes Forever.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                Private clinics lose billable visits due to paper tally books and disconnected spreadsheets. Physenra maintains an immutable transactional ledger that decrements package balances atomically when a clinician signs off on a visit.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">Multi-session rehab packages decrement automatically on visit sign-off.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">Patient deposit wallets allow advance payments with credit balances.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">Generate professional printable tax invoices and official numbered receipts.</span>
                </div>
              </div>
              <div className="mt-8">
                <PrimaryCTAButton to="/features/treatment-packages">
                  Explore Packages & Billing
                </PrimaryCTAButton>
              </div>
            </div>

            {/* 8. MEDICAL IMAGING PREVIEW */}
            <div className="rounded-2xl bg-slate-900 p-6 md:p-8 text-white shadow-xl text-left">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Scan className="w-5 h-5 text-teal-400" />
                  <span className="font-semibold text-sm">Diagnostic PACS Web Viewer</span>
                </div>
                <span className="text-xs bg-slate-800 px-2.5 py-1 rounded text-slate-300 font-mono">
                  Zero Plugins
                </span>
              </div>
              <div className="mt-6 aspect-video rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wider text-teal-400 font-mono mb-1">
                    Cobb Angle Measurement Caliper
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-400">14.2° Lumbar Scoliosis</div>
                  <div className="text-xs text-slate-400 mt-2">CornerstoneJS Zero-Footprint PACS Engine</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>Presets: Bone • Soft Tissue • Lung</span>
                <span>Zoom • Pan • Invert</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. SECURITY & DATA PRIVACY */}
      <section className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Healthcare Data Sovereignty"
            title="Enterprise Security. Absolute Clinical Privacy."
            subtitle="Your clinical records belong entirely to your practice. Built with cryptographic Row-Level Security and guaranteed data retention."
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-6 rounded-xl border border-slate-200 bg-white">
              <ShieldCheck className="w-8 h-8 text-teal-700 mb-3" />
              <h3 className="text-lg font-semibold text-slate-900">PostgreSQL Row-Level Security</h3>
              <p className="mt-2 text-sm text-slate-600">
                Mathematical multi-tenant isolation ensures Practice A can never view or query records belonging to Practice B.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-slate-200 bg-white">
              <Lock className="w-8 h-8 text-teal-700 mb-3" />
              <h3 className="text-lg font-semibold text-slate-900">Platform Admin Firewall</h3>
              <p className="mt-2 text-sm text-slate-600">
                SaaS operators can manage subscriptions and billing status but are strictly barred by database policies from inspecting clinical PHI.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-slate-200 bg-white">
              <CheckCircle2 className="w-8 h-8 text-teal-700 mb-3" />
              <h3 className="text-lg font-semibold text-slate-900">Read-Only Data Guarantee</h3>
              <p className="mt-2 text-sm text-slate-600">
                If your subscription ever lapses, your clinical records remain accessible in read-only mode. We never hold your data hostage.
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/security"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900"
            >
              <span>Read complete Security & Tenancy Architecture</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 10. PRICING PREVIEW */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Transparent Plans"
            title="Predictable Pricing for Practices of Every Scale"
            subtitle="Start your 14-day free trial today. Every plan includes full clinical EMR, treatment packages, and dedicated support."
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {AUTHORITATIVE_SAAS_PLANS.filter((p) => p.code !== 'enterprise').map((plan) => (
              <div
                key={plan.code}
                className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between ${
                  plan.popular
                    ? 'border-2 border-emerald-600 bg-white shadow-lg relative ring-1 ring-emerald-600/20'
                    : 'border border-slate-200 bg-slate-50/50'
                }`}
              >
                <div>
                  {plan.popular && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-3">
                      Most Popular for Clinics
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="mt-2 text-xs text-slate-500 line-clamp-2">{plan.tagline}</p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                      {formatNaira(plan.monthlyCents)}
                    </span>
                    <span className="text-sm font-medium text-slate-500">/month</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    or {formatNaira(plan.annualCents)} billed annually
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-200/80 space-y-2.5">
                    <div className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Includes:
                    </div>
                    {plan.features.slice(0, 5).map((f, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4">
                  <PrimaryCTAButton
                    to={`/register-practice?plan=${plan.code}`}
                    className="w-full"
                    size="md"
                  >
                    Start 14-Day Free Trial
                  </PrimaryCTAButton>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900"
            >
              <span>View full feature comparison matrix across all tiers</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 11. FAQ ACCORDION */}
      <section className="py-16 sm:py-24 bg-slate-50/60 border-b border-slate-200/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Questions & Answers"
            title="Frequently Asked Questions"
            subtitle="Everything you need to know about getting started and running your practice on Physenra."
          />

          <div className="mt-10 text-left">
            <FAQAccordion items={HOMEPAGE_FAQS} />
          </div>
        </div>
      </section>

      {/* 12. FINAL CTA CONVERSION BANNER */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-teal-900 to-slate-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Ready to Modernize Your Physiotherapy Practice?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Join forward-thinking physiotherapy clinics delivering faster clinical documentation, seamless package billing, and superior patient care.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <PrimaryCTAButton size="lg" to="/register-practice">
              Start 14-Day Free Trial Now
            </PrimaryCTAButton>
            <SecondaryCTAButton size="lg" to="/pricing" className="bg-transparent text-white border-slate-600 hover:bg-slate-800 hover:text-white">
              Compare All Plans
            </SecondaryCTAButton>
          </div>
          <div className="mt-6 text-xs text-slate-400">
            Instant setup • No credit card required • Cancel anytime
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};
