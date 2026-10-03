// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — HOMEPAGE (PHASE 1C COMPLETE CONVERSION ARCHITECTURE)
// File: src/public/pages/HomePageShell.tsx
// Route: /
// ==============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { PrimaryCTAButton } from '../components/PrimaryCTAButton';
import { SecondaryCTAButton } from '../components/SecondaryCTAButton';
import { SectionHeading } from '../components/SectionHeading';
import { FAQAccordion, FAQItem } from '../components/FAQAccordion';
import { ProductMockup } from '../components/ProductMockup';
import { FounderPhoto } from '../components/FounderPhoto';
import { ClinicianVisual } from '../components/ClinicianVisual';
const InteractiveShowcase = React.lazy(() =>
  import('../components/InteractiveShowcase').then((m) => ({ default: m.InteractiveShowcase }))
);
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
  Award,
  Sparkles,
} from 'lucide-react';

const HOMEPAGE_FAQS: FAQItem[] = [
  {
    question: 'What is Physenra and who is it designed for?',
    answer:
      'Physenra is a dedicated Electronic Medical Records (EMR) and practice management operating system built exclusively for private physiotherapy practices, physical rehabilitation clinics, and musculoskeletal clinicians.',
  },
  {
    question: 'Do I need to enter payment card details to start a trial?',
    answer:
      'No. Physenra provides a 14-day free evaluation trial on all plans with no credit card required. You can register your practice workspace self-service and test on clinical caseloads immediately.',
  },
  {
    question: 'How do physiotherapy-specific SOAP notes work in Physenra?',
    answer:
      'Physenra includes specialized subjective history fields (24-hour symptom cycle, aggravating and easing factors), objective Range of Motion (ROM) degrees, Oxford scale Manual Muscle Testing (MMT 0-5), orthopaedic special tests, and standardized functional outcome measure scoring.',
  },
  {
    question: 'How does the built-in Web DICOM PACS medical imaging viewer work?',
    answer:
      'Physenra features a browser-based diagnostic radiology viewer. Clinicians can upload standard DICOM studies (MRI, CT, X-ray) directly into an episode of care, adjust window levels (Bone, Soft Tissue, Lung), and measure Cobb angles inside the patient chart without desktop software or plugins.',
  },
  {
    question: 'How do multi-session treatment packages and deposit wallets prevent lost revenue?',
    answer:
      'When a patient purchases a treatment bundle (e.g., 10 sessions), Physenra tracks package entitlements. When a physiotherapist signs off on an encounter, the remaining balance decrements automatically. Deposit wallets maintain an immutable ledger for patient advance payments and credit balances.',
  },
  {
    question: 'What happens to our clinical records if our subscription expires?',
    answer:
      'Physenra enforces a non-punitive read-only data retention policy. If your subscription ever lapses, your clinical notes, patient charts, and historical invoices remain fully viewable and exportable in read-only mode so you never lose patient history.',
  },
  {
    question: 'Can platform operators or third parties view our patient records?',
    answer:
      'No. Our platform enforces strict PostgreSQL Row-Level Security (RLS) and an architectural Platform Admin Privacy Firewall that bars SaaS administrators and platform operators from viewing patient clinical PHI.',
  },
];

export const HomePageShell: React.FC = () => {
  return (
    <MarketingLayout>
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white py-16 sm:py-24 lg:py-32 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Positioning & Conversion Proposition */}
            <div className="lg:col-span-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Physiotherapy EMR & Practice Management Platform
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
                The Clinical EMR Purpose-Built for <span className="text-teal-700">Physiotherapy</span>.
              </h1>
              <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Physenra is the specialized practice operating system for private physical therapy clinics and rehabilitation teams. Document musculoskeletal SOAP assessments with ROM and MMT, review DICOM diagnostic imaging in your browser, automate multi-session treatment packages, and run your entire practice on one secure platform.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <PrimaryCTAButton size="lg" to="/register-practice">
                  Start 14-Day Free Trial
                </PrimaryCTAButton>
                <SecondaryCTAButton size="lg" to="/login">
                  Log In
                </SecondaryCTAButton>
              </div>

              {/* Factual Value Points */}
              <div className="mt-6 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Self-service practice setup</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Full clinical write entitlement</span>
                </div>
              </div>
            </div>

            {/* Right Column: High-Fidelity Product Mockup */}
            <div className="lg:col-span-6">
              <ProductMockup />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
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
              <div className="text-sm font-bold text-slate-900">Paystack Checkout</div>
              <div className="text-xs text-slate-500">Self-Service Practice Billing</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PRODUCT SHOWCASE */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Interactive Platform Preview"
            title="Explore Physenra’s Core Clinical Workflows"
            subtitle="Switch between live product views to see how Physenra streamlines daily clinical documentation, multi-therapist scheduling, session packages, and diagnostic radiology."
          />

          <div className="mt-12">
            <React.Suspense
              fallback={
                <div className="h-96 rounded-2xl bg-slate-900/5 border border-slate-200 animate-pulse flex items-center justify-center text-slate-400 font-mono text-xs">
                  Loading interactive showcase...
                </div>
              }
            >
              <InteractiveShowcase />
            </React.Suspense>
          </div>
        </div>
      </section>

      {/* 3. WHY PHYSENRA */}
      <section className="py-16 sm:py-24 bg-slate-50/70 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Purpose-Built Specialization"
            title="Why Physiotherapy Clinics Choose Physenra"
            subtitle="Generic hospital software treats physical rehabilitation as a narrative afterthought. Physenra is engineered around the actual clinical and commercial realities of physiotherapy."
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Musculoskeletal Specialization</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Structured joint mapping, active vs. passive ROM angles, Oxford muscle testing (0-5), and orthopaedic tests built directly into every SOAP chart.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-teal-700">
                vs. Generic freehand text boxes
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Atomic Package Entitlement</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Prepaid rehab bundles automatically decrement upon visit sign-off. Deposit wallets track advance credits, eliminating front-desk session disputes.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-emerald-700">
                vs. Manual paper tally cards
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
                  <Scan className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Zero-Footprint Web PACS</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Ingest DICOM MRI, CT, and X-ray studies directly into care episodes. Review imaging and measure Cobb angles inside the browser with zero desktop software.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-teal-700">
                vs. Bulky desktop CD software
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Multi-Therapist Scheduling</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Color-coded multi-practitioner column calendar with treatment bay and private room allocation. Convert booked appointments into clinical visits with one click.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-emerald-700">
                vs. Disjointed Google Calendars
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CLINICAL WORKFLOW */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Care Pathway"
            title="The End-to-End Clinical Care Pathway"
            subtitle="From first patient intake to final functional discharge, Physenra aligns clinical evaluation, treatment progress, and financial reconciliation into one seamless process."
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-4 text-left">
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 relative">
              <span className="text-xs font-mono font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded">01</span>
              <h4 className="font-bold text-slate-900 text-sm mt-3">Episode Creation</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Register patient, attach episode presentation (e.g. Spine, Knee Rehab), and assign primary therapist.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 relative">
              <span className="text-xs font-mono font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded">02</span>
              <h4 className="font-bold text-slate-900 text-sm mt-3">Objective Exam</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Record active/passive Range of Motion degrees, Oxford muscle grades (0-5), and orthopaedic tests.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 relative">
              <span className="text-xs font-mono font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded">03</span>
              <h4 className="font-bold text-slate-900 text-sm mt-3">Baseline Outcome</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Establish validated outcome measure baselines using VAS, NDI, ODI, LEFS, or QuickDASH batteries.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 relative">
              <span className="text-xs font-mono font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded">04</span>
              <h4 className="font-bold text-slate-900 text-sm mt-3">Care Protocol & HEP</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Establish SMART functional milestones, document manual therapy, and prescribe home exercise regimens.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-teal-200 bg-teal-50/40 relative">
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">05</span>
              <h4 className="font-bold text-slate-900 text-sm mt-3">Sign-off & Debit</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Sign encounter immutably. Remaining package sessions decrement automatically with zero disputed visits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4B. CLINICIAN WORKFLOW STORYTELLING */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left: Clinician Visual Image */}
            <div className="lg:col-span-6">
              <ClinicianVisual
                imageSrc="/images/clinicians/clinician-digital-workflow-01.jpg"
                alt="Nigerian physiotherapist reviewing digital clinical records on a tablet in a modern physical therapy clinic"
                badge="Clinical Mobility & Focus"
                caption="Point-of-care digital documentation engineered for rehabilitation teams."
              />
            </div>

            {/* Right: Clinician Storytelling Text */}
            <div className="lg:col-span-6 text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 mb-4">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                Clinician-First Design
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                Built for the Way Physiotherapists Actually Work.
              </h2>
              <p className="mt-4 text-base text-slate-600 leading-relaxed">
                Clinical documentation should elevate patient care, not interrupt it. Physenra is engineered for fluid tablet and workstation interaction—enabling physiotherapists to document Range of Motion angles, muscle testing grades, and functional recovery milestones directly at the treatment table without breaking clinical connection.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">
                    <strong>Touch &amp; Tablet Ergonomics:</strong> Responsive interfaces with touch targets &ge; 44px for effortless tapping during hands-on evaluations.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">
                    <strong>Real-Time Encounter Continuity:</strong> Start, pause, and resume visits with zero lost data when moving between bays and exercise areas.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">
                    <strong>Patient-Centered Visual Communication:</strong> Review diagnostic imaging and functional score trajectories side-by-side with patients.
                  </span>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <Link
                  to="/features/clinical-documentation"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900"
                >
                  <span>Explore Clinical Documentation Workflows</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PHYSIOTHERAPY DOCUMENTATION */}
      <section className="py-16 sm:py-24 bg-slate-50/60 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 mb-4">
                Clinical Musculoskeletal Charting
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                Specialized SOAP Notes Built for Physical Therapy.
              </h2>
              <p className="mt-4 text-base text-slate-600 leading-relaxed">
                Physiotherapists spend hours fighting EHR systems that were designed for internal medicine or billing clerks. Physenra provides structured musculoskeletal documentation capturing true physical function:
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">
                    <strong>Subjective Intake:</strong> Document 24-hour symptom cycle, pain mechanisms, and aggravating or easing postures.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">
                    <strong>Objective Examination:</strong> Side-by-side active and passive joint Range of Motion (ROM), Oxford scale Manual Muscle Testing (MMT 0-5), and dermatome/myotome neurological mapping.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">
                    <strong>Assessment & Plan:</strong> Clinical physiotherapy diagnosis, recovery prognosis, intervention techniques, and digital sign-off lock.
                  </span>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <Link
                  to="/features/physiotherapy-emr"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900"
                >
                  <span>Explore Physiotherapy EMR Features</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm text-left space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900">Musculoskeletal Examination Matrix</div>
                <span className="text-[11px] font-mono bg-teal-50 text-teal-700 px-2 py-0.5 rounded">Bilateral Assessment</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-900">Lumbar Spine Flexion</div>
                    <div className="text-[11px] text-slate-500">Active Movement • Pain Centralization</div>
                  </div>
                  <span className="font-mono font-bold text-teal-800">35° (Deficit: 45°)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-900">Extensor Hallucis Longus (L5)</div>
                    <div className="text-[11px] text-slate-500">Oxford Scale MMT</div>
                  </div>
                  <span className="font-mono font-bold text-teal-800">Grade 4 / 5</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-900">Straight Leg Raise (SLR) Test</div>
                    <div className="text-[11px] text-slate-500">Neurodynamic Tension</div>
                  </div>
                  <span className="font-mono font-bold text-emerald-800">Positive Right @ 40°</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. OUTCOME MEASURES */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Evidence-Based Metrics"
            title="Validated Functional Outcome Batteries"
            subtitle="Track quantitative patient recovery across sessions using standardized outcome scoring batteries built into patient encounters."
          />

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-left">
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div className="text-xs font-mono font-bold text-teal-700 uppercase tracking-wider">VAS</div>
              <h4 className="font-bold text-slate-900 text-sm mt-1">Visual Analogue Scale</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Quantify subjective pain intensity on a 0–10 scale at rest, during movement, and after therapy.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div className="text-xs font-mono font-bold text-teal-700 uppercase tracking-wider">NDI</div>
              <h4 className="font-bold text-slate-900 text-sm mt-1">Neck Disability Index</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Measure functional cervical disability across reading, headaches, lifting, and work capacity.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div className="text-xs font-mono font-bold text-teal-700 uppercase tracking-wider">ODI</div>
              <h4 className="font-bold text-slate-900 text-sm mt-1">Oswestry Disability Index</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                The gold standard for lumbar spine impairment: walking, sitting, standing, and personal care.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div className="text-xs font-mono font-bold text-teal-700 uppercase tracking-wider">LEFS</div>
              <h4 className="font-bold text-slate-900 text-sm mt-1">Lower Extremity Scale</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Track functional recovery for hip, knee, ankle, and foot conditions (0–80 score scale).
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div className="text-xs font-mono font-bold text-teal-700 uppercase tracking-wider">QuickDASH</div>
              <h4 className="font-bold text-slate-900 text-sm mt-1">Arm, Shoulder & Hand</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Standardized upper limb disability percentage scoring across daily activity demands.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. TREATMENT PLANS & PACKAGES */}
      <section className="py-16 sm:py-24 bg-slate-50/60 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 mb-4">
                Commercial Protection & Wallets
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                Eliminate Front-Desk Session Disputes Forever.
              </h2>
              <p className="mt-4 text-base text-slate-600 leading-relaxed">
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
                  <span className="text-sm text-slate-700">Front desk can execute split payments (wallet credit + online card).</span>
                </div>
              </div>
              <div className="mt-8">
                <PrimaryCTAButton to="/features/treatment-packages">
                  Explore Packages & Wallets
                </PrimaryCTAButton>
              </div>
            </div>

            <div className="lg:col-span-6 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm text-left space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="text-xs font-bold text-slate-900">Post-Op Spinal Rehab (10 Sessions)</div>
                  <div className="text-[11px] text-slate-500">Patient: Amara Okafor • Atomic Decrementing</div>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">Active</span>
              </div>
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-100">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-semibold text-teal-800">Remaining Sessions</span>
                  <span className="text-xl font-bold font-mono text-teal-900">7 of 10</span>
                </div>
                <div className="w-full bg-teal-200/60 h-2.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-teal-600 h-2.5 rounded-full" style={{ width: '70%' }} />
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <div>
                  <div className="text-xs text-slate-500">Patient Deposit Wallet Balance</div>
                  <div className="text-base font-bold font-mono text-slate-900">₦120,000.00</div>
                </div>
                <span className="text-xs font-semibold text-teal-800 bg-white border border-slate-200 px-3 py-1 rounded-lg">Credit Available</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. SCHEDULING & PRACTICE OPERATIONS */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm text-left space-y-4 order-2 lg:order-1">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">Multi-Therapist Daily Timetable</span>
                <span className="text-[11px] font-mono text-slate-500">Bays 1 & 2 Active</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-2">
                  <div className="font-semibold text-slate-700 pb-1 border-b border-slate-100">Dr. N. Okonjo, PT</div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="font-bold text-emerald-900">09:00 - 09:45</div>
                    <div className="text-[11px] text-emerald-700">Amara O. • Bay 1</div>
                    <span className="text-[10px] font-semibold text-emerald-800 uppercase">In Session</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900">10:00 - 10:45</div>
                    <div className="text-[11px] text-slate-600">Ibrahim K. • Bay 1</div>
                    <span className="text-[10px] font-semibold text-teal-700 uppercase">Arrived</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-slate-700 pb-1 border-b border-slate-100">Dr. T. Balogun, PT</div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900">09:15 - 10:00</div>
                    <div className="text-[11px] text-slate-600">Chidinma E. • Bay 2</div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Scheduled</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200">
                    <div className="font-bold text-teal-900">10:30 - 11:15</div>
                    <div className="text-[11px] text-teal-700">Emeka O. • Bay 2</div>
                    <span className="text-[10px] font-semibold text-teal-800 uppercase">Evaluation</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 text-left order-1 lg:order-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 mb-4">
                Clinic Coordination & Resources
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                Multi-Practitioner Scheduling Without Room Conflicts.
              </h2>
              <p className="mt-4 text-base text-slate-600 leading-relaxed">
                Manage multiple therapists across open treatment bays, private consultation rooms, and gym equipment with zero scheduling overlap:
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">Side-by-side practitioner column calendar with real-time status updates.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">Assign physical therapy bays and rooms during appointment booking.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">Convert booked appointments to clinical visits with one click.</span>
                </div>
              </div>
              <div className="mt-8 flex items-center gap-4">
                <Link
                  to="/features/appointments"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900"
                >
                  <span>Explore Scheduling Features</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. BILLING & PAYMENTS */}
      <section className="py-16 sm:py-24 bg-slate-50/60 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 mb-4">
                Practice Financial Operations
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                Itemized Invoicing, Numbered Receipts & Payment Tracking.
              </h2>
              <p className="mt-4 text-base text-slate-600 leading-relaxed">
                Physenra streamlines practice financial administration. Generate itemized invoices from completed clinical encounters, record settlements across front-desk card terminals, cash, or bank transfers, and issue official proof-of-payment receipts.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">Itemized billing directly from clinical visits, treatment packages, and consumables.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">Multi-channel settlement: Front-desk POS terminals, cash, bank transfer, and deposit wallets.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">Printable professional PDF invoices and official numbered proof-of-payment receipts.</span>
                </div>
              </div>
              <div className="mt-8 flex items-center gap-4">
                <Link
                  to="/features/billing"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900"
                >
                  <span>Explore Invoicing & Billing</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm text-left space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="text-xs font-bold text-slate-900">Invoice #INV-2026-0042</div>
                  <div className="text-[11px] text-slate-500">Adaeze N. • POS Terminal Settlement</div>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">Settled</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>10-Session Spinal Rehabilitation Package</span>
                  <span className="font-mono font-bold">₦150,000.00</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>VAT (7.5%)</span>
                  <span className="font-mono">₦11,250.00</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t border-slate-200 text-slate-900">
                  <span>Total Amount Paid</span>
                  <span className="font-mono text-teal-800">₦161,250.00</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Official Receipt #REC-00042 Generated</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. MEDICAL IMAGING / PACS */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 mb-4">
                Diagnostic Radiology Inside the Chart
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                Browser DICOM PACS with Cobb Angle Caliper.
              </h2>
              <p className="mt-4 text-base text-slate-600 leading-relaxed">
                Review MRI, CT, and X-ray studies directly in the patient record without booting slow CD software or inspecting blurry phone snapshots. Physenra includes a zero-footprint web viewer built for musculoskeletal clinicians.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">Native DICOM (.dcm) file and ZIP upload directly into patient care episodes.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">Window Width/Level (WW/WL) presets for Bone, Soft Tissue, and Lung.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">Orthopaedic measurement tools including Cobb angle scoliosis quantification.</span>
                </div>
              </div>
              <div className="mt-8 flex items-center gap-4">
                <Link
                  to="/features/medical-imaging"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900"
                >
                  <span>Explore Medical Imaging & PACS</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-2xl bg-slate-900 p-6 md:p-8 text-white shadow-xl text-left">
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
                  <div className="text-xs text-slate-400 mt-2">Zero-Footprint PACS Engine</div>
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

      {/* 10B. FOUNDER SECTION */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-white via-slate-50/70 to-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 lg:p-16 rounded-3xl bg-slate-900 text-white shadow-2xl relative overflow-hidden">
            {/* Ambient decorative subtle glow */}
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              {/* Left Column: Founder Photo / Executive Portrait Slot */}
              <div className="lg:col-span-5 flex justify-center">
                <FounderPhoto size="md" />
              </div>

              {/* Right Column: Founder Narrative & Context */}
              <div className="lg:col-span-7 text-left space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-teal-300 bg-teal-950/80 border border-teal-800/60">
                  <Award className="w-3.5 h-3.5 text-teal-400" />
                  Founder Authenticity &amp; Purpose
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Built by a Physiotherapist. Designed for Physiotherapy Practice.
                </h2>

                <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
                  Dr Oladejo Korede, PT, MPH, DPT, is the founder of Physenra. The platform was created from a practical understanding of the challenges involved in managing modern physiotherapy practice — from clinical documentation and patient management to appointments, treatment planning and practice operations.
                </p>

                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-slate-300">
                      <strong>Clinical Origin:</strong> Designed from practical experience at the treatment table, not secondary administrative assumptions.
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-slate-300">
                      <strong>Musculoskeletal Integrity:</strong> Real physical metrics (ROM degrees, Oxford MMT, validated outcome scales) are native first-class data.
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-slate-300">
                      <strong>Practice Revenue Protection:</strong> Atomic package decrementing and deposit wallets eliminate disputed visits.
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <Link
                    to="/about"
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-colors shadow-sm"
                    style={{ minHeight: '44px' }}
                  >
                    <span>Meet the Founder</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                  <PrimaryCTAButton
                    size="md"
                    to="/register-practice"
                    className="shadow-teal-900/30"
                  >
                    Start 14-Day Free Trial
                  </PrimaryCTAButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. SECURITY & DATA ARCHITECTURE */}
      <section className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Healthcare Data Sovereignty"
            title="Enterprise Security. Absolute Clinical Privacy."
            subtitle="Your clinical records belong entirely to your practice. Built with PostgreSQL Row-Level Security, Platform Admin firewalls, and non-punitive read-only access."
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
              <h3 className="text-lg font-semibold text-slate-900">Read-Only Access Architecture</h3>
              <p className="mt-2 text-sm text-slate-600">
                If your subscription ever lapses, your clinical records remain accessible in read-only mode so you never lose patient history.
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

      {/* 12. PRICING PREVIEW */}
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
              <span>Compare all plan features & Enterprise options</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 13. FAQ */}
      <section className="py-16 sm:py-24 bg-slate-50/60 border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Practice Questions"
            title="Frequently Asked Questions"
            subtitle="Clear answers to common questions about onboarding, clinical charting, DICOM imaging, and billing in Physenra."
          />

          <div className="mt-12 text-left">
            <FAQAccordion items={HOMEPAGE_FAQS} />
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/faq"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900"
            >
              <span>View complete FAQ library</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 14. FINAL CTA */}
      <section className="py-20 bg-slate-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Modernize Your Physiotherapy Practice?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Join physical therapy clinics using Physenra to streamline musculoskeletal documentation, eliminate package billing disputes, and review diagnostic imaging inside the patient chart.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <PrimaryCTAButton size="lg" to="/register-practice">
              Start 14-Day Free Trial
            </PrimaryCTAButton>
            <SecondaryCTAButton size="lg" to="/login" className="text-white border-slate-700 hover:bg-slate-800">
              Log In to Workspace
            </SecondaryCTAButton>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span>✓ 14-day free trial on all plans</span>
            <span>✓ No credit card required</span>
            <span>✓ Self-service practice setup</span>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};
