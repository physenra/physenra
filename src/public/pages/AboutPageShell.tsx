// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — ABOUT PAGE (PHASE 1C COMPLETE EDITORIAL)
// File: src/public/pages/AboutPageShell.tsx
// Route: /about
// ==============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { SectionHeading } from '../components/SectionHeading';
import { PrimaryCTAButton } from '../components/PrimaryCTAButton';
import { SecondaryCTAButton } from '../components/SecondaryCTAButton';
import {
  ShieldCheck,
  Activity,
  Layers,
  ArrowRight,
  Scale,
} from 'lucide-react';

export const AboutPageShell: React.FC = () => {
  return (
    <MarketingLayout
      title="About Physenra | Dedicated Physiotherapy Platform"
      description="Learn why Physenra was engineered to elevate physical therapy practices with purpose-built clinical documentation and sustainable practice tools."
    >
      {/* Header Banner */}
      <div className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <SectionHeading
            kicker="Our Mission"
            title="Elevating Physical Rehabilitation Through Specialized Technology"
            subtitle="Generic hospital software treats physical therapy as an afterthought. We built Physenra exclusively for how physiotherapists evaluate, treat, and bill."
            align="left"
          />
        </div>
      </div>

      <div className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-16">
          {/* Section 1: What Physenra Is */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">
              What Is Physenra?
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Physenra is a dedicated Electronic Medical Records (EMR) and practice management operating system built specifically for physiotherapy practices, physical rehabilitation clinics, and musculoskeletal clinicians.
            </p>
            <p className="text-base text-slate-600 leading-relaxed">
              Unlike broad enterprise EHRs designed for multi-specialty hospital ward rounds, Physenra aligns directly with the functional physical examination: objective joint angles, muscle strength grades, validated outcome scores, longitudinal episodes of care, and multi-session treatment bundles.
            </p>
          </section>

          {/* Section 2: Why Physiotherapy-Specific? */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">
              Why Does Physiotherapy Need a Dedicated Platform?
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Physical rehabilitation is fundamentally physical and quantitative. Clinicians measure joint mobility in degrees of Range of Motion, assess contractile strength on the Oxford Scale (0 to 5), evaluate neurodynamic tension, and administer standardized functional batteries like VAS, NDI, ODI, LEFS, and QuickDASH.
            </p>
            <p className="text-base text-slate-600 leading-relaxed">
              When physical therapists are forced to use generic hospital software, these critical quantitative indicators are buried in narrative free-text boxes. This creates documentation fatigue, obscures recovery trends, and weakens clinical communication with referring orthopaedic surgeons.
            </p>
          </section>

          {/* Section 3: The Operational Dilemma */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">
              The Practice Management Challenge
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Private physical therapy clinics face an equally frustrating administrative dilemma. Most private practices rely heavily on prepaid multi-session rehabilitation packages (e.g. 10 post-op sessions).
            </p>
            <p className="text-base text-slate-600 leading-relaxed">
              When clinics manage these bundles using paper tally cards or generic spreadsheets, session tracking breaks down. Visits go unrecorded, disputes arise at the front desk regarding remaining sessions, and clinics experience quiet revenue leakage. Physenra solves this by establishing atomic session decrementing tied immutably to clinician encounter sign-off.
            </p>
          </section>

          {/* Section 4: Product Philosophy Pillars */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Our Product Philosophy
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Clinical Authenticity</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every charting field, outcome scale, and workflow reflects how physical therapists actually evaluate and treat musculoskeletal conditions.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Data Sovereignty</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your patient records belong exclusively to your practice. Mathematical PostgreSQL RLS ensures tenant isolation, backed by non-punitive read-only access.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Commercial Precision</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Atomic package decrements and immutable deposit wallets eliminate billing disputes and ensure every billable visit is accounted for.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Scale className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Transparent Pricing</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Predictable, flat monthly and annual subscription tiers with zero hidden fees, zero card requirements for trials, and free reception staff.
                </p>
              </div>
            </div>
          </section>

          {/* Internal Cross-Links */}
          <section className="pt-8 border-t border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Explore Physenra
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                to="/features"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-teal-300 transition-all flex items-center justify-between text-xs font-semibold text-slate-800"
              >
                <span>Platform Features</span>
                <ArrowRight className="w-4 h-4 text-teal-600" />
              </Link>
              <Link
                to="/pricing"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-teal-300 transition-all flex items-center justify-between text-xs font-semibold text-slate-800"
              >
                <span>Transparent Plans</span>
                <ArrowRight className="w-4 h-4 text-teal-600" />
              </Link>
              <Link
                to="/security"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-teal-300 transition-all flex items-center justify-between text-xs font-semibold text-slate-800"
              >
                <span>Security Architecture</span>
                <ArrowRight className="w-4 h-4 text-teal-600" />
              </Link>
            </div>
          </section>

          {/* Conversion Action */}
          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-center gap-4">
            <PrimaryCTAButton size="lg" to="/register-practice">
              Start 14-Day Free Trial
            </PrimaryCTAButton>
            <SecondaryCTAButton size="lg" to="/login">
              Log In
            </SecondaryCTAButton>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
};
