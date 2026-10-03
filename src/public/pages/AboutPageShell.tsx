// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — ABOUT PAGE (FOUNDER & CLINICIAN STORYTELLING V1)
// File: src/public/pages/AboutPageShell.tsx
// Route: /about
// ==============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { SectionHeading } from '../components/SectionHeading';
import { PrimaryCTAButton } from '../components/PrimaryCTAButton';
import { SecondaryCTAButton } from '../components/SecondaryCTAButton';
import { FounderPhoto } from '../components/FounderPhoto';
import { ClinicianVisual } from '../components/ClinicianVisual';
import {
  ShieldCheck,
  Activity,
  Layers,
  ArrowRight,
  Scale,
  Award,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export const AboutPageShell: React.FC = () => {
  return (
    <MarketingLayout
      title="About Physenra | Purpose-Built Physiotherapy Technology & Founder"
      description="Learn how Physenra was founded by Dr Oladejo Korede, PT, MPH, DPT, to elevate physiotherapy practices with specialized clinical documentation and sustainable practice tools."
    >
      {/* Header Banner */}
      <div className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <SectionHeading
            kicker="Our Mission & Origin"
            title="Built from a Physiotherapist's Perspective"
            subtitle="Generic hospital software treats physical therapy as an afterthought. Physenra was created from practical experience to provide a dedicated operating system for physical rehabilitation practice."
            align="left"
          />
        </div>
      </div>

      <div className="py-16 sm:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-20">
          {/* SECTION: FOUNDER PROFILE */}
          <section className="p-8 sm:p-12 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Founder Image Column */}
              <div className="lg:col-span-5 flex justify-center">
                <FounderPhoto size="md" />
              </div>

              {/* Founder Narrative Column */}
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-100/70 border border-teal-200">
                  <Award className="w-3.5 h-3.5 text-teal-700" />
                  Founder Profile
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Dr Oladejo Korede
                </h2>

                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-teal-800">
                  <span className="px-2.5 py-1 rounded-md bg-white border border-teal-200 font-mono">
                    PT, MPH, DPT
                  </span>
                  <span>&bull;</span>
                  <span className="text-slate-600 font-medium">Founder, Physenra</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                  <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Physiotherapist &bull; Master of Public Health &bull; Doctor of Physiotherapy</span>
                </div>

                <div className="pt-2 space-y-3 text-sm text-slate-600 leading-relaxed border-t border-slate-200/80">
                  <p>
                    Dr Oladejo Korede founded Physenra from practical experience with physiotherapy practice and the need for a purpose-built digital system that understands clinical documentation and practice operations.
                  </p>
                  <p>
                    In physical rehabilitation, clinicians evaluate joint mobility in degrees of Range of Motion, assess contractile strength on the Oxford Scale (0 to 5), evaluate neurodynamic tension, and administer standardized functional batteries. When forced onto generic hospital software, these essential quantitative indicators are buried in narrative free-text boxes, creating documentation fatigue and obscuring patient recovery trends.
                  </p>
                  <p>
                    Physenra was engineered to solve these operational and clinical challenges—delivering structured musculoskeletal documentation, browser-based diagnostic imaging, and automated multi-session package tracking that protects clinic revenue.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION: CLINICAL VISUAL STORYTELLING */}
          <section className="space-y-6">
            <div className="text-left max-w-3xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                Modern Clinical Practice
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Designed for Contemporary Physiotherapy Teams
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                From single-practitioner private clinics to multi-therapist rehabilitation centers, Physenra connects clinical excellence with streamlined daily operations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <ClinicianVisual
                imageSrc="/images/clinicians/clinician-digital-workflow-01.jpg"
                alt="Nigerian physiotherapist reviewing digital clinical records on a tablet in a modern physical therapy clinic"
                badge="Clinical Documentation"
                caption="Specialized musculoskeletal SOAP charting and outcome batteries at the treatment table."
              />
              <ClinicianVisual
                imageSrc="/images/clinicians/clinician-practice-management-01.jpg"
                alt="African physiotherapist reviewing clinic scheduling and appointment records on a laptop"
                badge="Practice Operations"
                caption="Multi-therapist timetable coordination and automated package session decrementing."
              />
            </div>
          </section>

          {/* SECTION 1: WHAT PHYSENRA IS */}
          <section className="space-y-4 pt-8 border-t border-slate-200">
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

          {/* SECTION 2: WHY PHYSIOTHERAPY-SPECIFIC? */}
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

          {/* SECTION 3: THE OPERATIONAL DILEMMA */}
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

          {/* SECTION 4: PRODUCT PHILOSOPHY PILLARS */}
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
