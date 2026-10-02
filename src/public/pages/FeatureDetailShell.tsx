// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — FEATURE DETAIL ROUTE SHELL (PHASE 1B REFINED)
// File: src/public/pages/FeatureDetailShell.tsx
// ==============================================================================

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { SectionHeading } from '../components/SectionHeading';
import { PrimaryCTAButton } from '../components/PrimaryCTAButton';
import { BrowserFrame } from '../components/BrowserFrame';
import { StatusBadge } from '../components/StatusBadge';
import {
  CheckCircle2,
  ArrowLeft,
  Receipt,
} from 'lucide-react';

interface FeatureModuleData {
  title: string;
  kicker: string;
  tagline: string;
  description: string;
  highlights: string[];
}

const FEATURE_DATA: Record<string, FeatureModuleData> = {
  'physiotherapy-emr': {
    title: 'Physiotherapy Clinical EMR & SOAP Notes',
    kicker: 'Clinical Musculoskeletal Charting',
    tagline: 'Document musculoskeletal assessments in minutes with specialized clinical fields.',
    description:
      'Generic medical charts fail to capture the functional reality of physical therapy. Physenra provides specialized subjective intake fields, active/passive joint range of motion (ROM), Oxford manual muscle testing (0-5), and automated outcome scale calculations.',
    highlights: [
      'Structured musculoskeletal subjective intake with 24-hour symptom behavior',
      'Joint mapping and active vs. passive Range of Motion (ROM) assessment',
      'Oxford scale Manual Muscle Testing (MMT) with side-by-side comparison',
      'Automated functional outcome scoring: VAS, NDI, ODI, LEFS, and QuickDASH',
      'Direct link between appointments, encounters, and longitudinal progress',
    ],
  },
  'patient-management': {
    title: 'Patient Directory & Episode Architecture',
    kicker: 'Longitudinal Care Organization',
    tagline: 'Organize patient records around distinct episodes of care.',
    description:
      'Physenra structures clinical records into distinct Episodes of Care—such as acute sports injury, post-operative spinal rehabilitation, or ongoing maintenance—ensuring past clinical history is never lost or confused.',
    highlights: [
      'Comprehensive demographic registry and emergency contact records',
      'Episode-of-care architecture segregating distinct medical presentations',
      'Active package entitlement and deposit wallet balance visibility',
      'Medical alerts, contraindications, and red-flag checklists',
    ],
  },
  appointments: {
    title: 'Multi-Practitioner Scheduling & Calendar',
    kicker: 'Clinic Appointment Coordination',
    tagline: 'Streamline multi-therapist scheduling and eliminate room conflicts.',
    description:
      'Manage multiple practitioners across treatment rooms and therapy bays with a responsive, color-coded calendar. Convert scheduled appointments directly into clinical visits and SOAP notes with one click.',
    highlights: [
      'Side-by-side multi-practitioner column calendar view',
      'Treatment room and therapy equipment allocation',
      'Status tracking: Scheduled, Arrived, In Session, Completed, No-Show',
      'One-click Clinical Visit and SOAP encounter creation from the calendar',
    ],
  },
  'clinical-documentation': {
    title: 'Orthopaedic & Neurological Documentation',
    kicker: 'Standardized Clinical Records',
    tagline: 'Structured charting built around evidence-based physiotherapy.',
    description:
      'Eliminate freehand narrative ambiguity. Physenra enforces standardized clinical fields for orthopaedic special tests, neurodynamic assessments, and functional goals.',
    highlights: [
      'Special orthopaedic tests database with instant positive/negative logging',
      'Standardized functional milestone and progress review documentation',
      'Printable clinical encounter summaries for referring medical physicians',
      'Immutable clinical sign-off with practitioner timestamp and digital lock',
    ],
  },
  'treatment-plans': {
    title: 'Treatment Protocols & Exercise Prescription (HEP)',
    kicker: 'Rehabilitation Care Pathways',
    tagline: 'Define measurable functional goals and prescribe home exercise programmes.',
    description:
      'Build structured rehabilitation pathways with SMART clinical goals, anticipated duration, and printable home exercise programmes (HEP) specifying sets, reps, and hold times.',
    highlights: [
      'Goal-setting protocols with short-term and long-term milestones',
      'Home exercise prescription with sets, reps, hold times, and instructions',
      'Printable patient instruction handouts and care guidance',
      'Discharge summary builder with comparative functional outcome recovery deltas',
    ],
  },
  'treatment-packages': {
    title: 'Treatment Packages & Patient Deposit Wallets',
    kicker: 'Commercial Protection & Entitlements',
    tagline: 'Automate multi-session bundles and eliminate lost visit revenue.',
    description:
      'Prepaid session bundles are the lifeblood of private physiotherapy clinics. Physenra automatically decrements remaining package sessions upon visit sign-off and provides immutable patient deposit wallets for advance credit balances.',
    highlights: [
      'Custom treatment session bundles (e.g. 6, 10, or 12 sessions)',
      'Atomic entitlement decrementing: sessions deduct automatically on visit completion',
      'Patient deposit wallets for advance payments and credit management',
      'Automated overpayment conversion and split billing (cash + wallet credit)',
    ],
  },
  billing: {
    title: 'Invoicing, Tax Receipts & Local Paystack Payments',
    kicker: 'Financial & Practice Accounting',
    tagline: 'Compliant tax invoices, official receipts, and automated card processing.',
    description:
      'Full-cycle commercial billing tailored for private practices. Generate itemized invoices from clinical encounters, print numbered tax receipts, and accept card payments via Paystack with instant verification.',
    highlights: [
      'Itemized billing from completed visits, packages, and clinic consumables',
      'Online card checkout via secure Paystack payment gateway integration',
      'Printable professional PDF tax invoices and official numbered receipts',
      'End-of-day revenue reconciliation and overdue outstanding account aging',
    ],
  },
  'medical-imaging': {
    title: 'Built-in DICOM PACS & Orthopaedic Measurement Viewer',
    kicker: 'Browser-Based Medical Imaging',
    tagline: 'Review MRI, CT, and X-ray studies directly inside the patient chart.',
    description:
      'Stop booting bulky desktop CD software or looking at phone photos. Physenra includes a zero-footprint Web PACS viewer powered by CornerstoneJS, allowing clinicians to review DICOM studies and measure Cobb angles inside the browser.',
    highlights: [
      'Native DICOM file (.dcm) and ZIP ingestion linked to patient episodes',
      'Zero desktop software or external plugins required',
      'Window width/level (WW/WL) presets for Bone, Soft Tissue, and Lung',
      'Orthopaedic measuring calipers including Cobb angle scoliosis quantification',
      'Attach radiologic findings directly to clinical SOAP documentation',
    ],
  },
  'practice-management': {
    title: 'Practice Governance & Consumables Control',
    kicker: 'Operations & Multi-Tenancy',
    tagline: 'Role-based access controls, multi-room tracking, and clinic supplies.',
    description:
      'Scale your clinic with granular team permissions, treatment room allocation, and physical supplies tracking across clinic rooms.',
    highlights: [
      'Granular Role-Based Access Control: Owner, Clinical Director, Senior PT, Staff PT, Receptionist',
      'Clinic inventory control for strapping tape, electrodes, and therapy consumables',
      'Treatment room and equipment utilization tracking',
      'Immutable administrative audit trail recording all privileged actions',
    ],
  },
};

/**
 * Renders a specialized, sanitized product mockup visual matching the module topic.
 */
const renderFeatureVisual = (slug: string) => {
  switch (slug) {
    case 'medical-imaging':
      return (
        <BrowserFrame urlPath="physenra.com/platform/imaging/studies/ST-2026-04" badge="Web PACS">
          <div className="bg-slate-950 text-white p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
              <span className="font-bold text-teal-400">Study: Lumbar Spine MRI (T2 SAG)</span>
              <span className="font-mono text-slate-400 text-[11px]">WW: 850 • WL: 320</span>
            </div>
            <div className="aspect-[4/3] rounded-lg bg-black border border-slate-800 flex items-center justify-center relative overflow-hidden">
              <div className="relative z-10 text-center p-3 rounded-lg bg-slate-900/90 border border-teal-500/50">
                <div className="text-[10px] font-mono text-teal-400 uppercase tracking-wider">Cobb Angle Caliper</div>
                <div className="text-2xl font-bold font-mono text-emerald-400">14.2°</div>
                <div className="text-[10px] text-slate-400">L1 to L4 Angle</div>
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Presets: Soft Tissue • Bone</span>
              <span className="text-teal-400">Attached to Episode #EP-2026-08</span>
            </div>
          </div>
        </BrowserFrame>
      );

    case 'treatment-packages':
      return (
        <BrowserFrame urlPath="physenra.com/platform/patients/PT-2026-08/packages" badge="Entitlements">
          <div className="p-5 bg-white space-y-4 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <div className="text-xs font-bold text-slate-900">Post-Op Rehab Package (10 Sessions)</div>
                <div className="text-[11px] text-slate-500">Patient: Adaeze N. • Atomic Decrementing</div>
              </div>
              <StatusBadge label="Active Package" variant="active" size="sm" />
            </div>
            <div className="p-3 rounded-lg bg-teal-50/70 border border-teal-100">
              <div className="text-xs text-teal-800 font-semibold">Remaining Session Balance</div>
              <div className="text-2xl font-extrabold font-mono text-teal-900 mt-0.5">7 of 10</div>
              <div className="w-full bg-teal-200/60 h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-teal-600 h-2 rounded-full" style={{ width: '70%' }} />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
              <div>
                <div className="text-[11px] text-slate-500">Deposit Wallet Credit</div>
                <div className="text-sm font-bold font-mono text-slate-900">₦120,000.00</div>
              </div>
              <StatusBadge label="Prepaid Credit" variant="scheduled" size="sm" dot={false} />
            </div>
          </div>
        </BrowserFrame>
      );

    case 'appointments':
      return (
        <BrowserFrame urlPath="physenra.com/platform/appointments" badge="Multi-Therapist">
          <div className="p-5 bg-white space-y-3 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900">Clinic Scheduling Grid</span>
              <StatusBadge label="Active Bays" variant="active" size="sm" />
            </div>
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-emerald-900">09:00 - 09:45 • Adaeze N.</div>
                  <div className="text-[11px] text-emerald-700">Dr. K. Okonjo • Bay 1</div>
                </div>
                <StatusBadge label="In Session" variant="active" size="sm" dot={false} />
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-slate-900">10:30 - 11:15 • Emeka O.</div>
                  <div className="text-[11px] text-slate-500">Dr. T. Balogun • Bay 2</div>
                </div>
                <StatusBadge label="Arrived" variant="scheduled" size="sm" dot={false} />
              </div>
            </div>
          </div>
        </BrowserFrame>
      );

    case 'billing':
      return (
        <BrowserFrame urlPath="physenra.com/platform/invoices/INV-2026-012" badge="Paystack Verified">
          <div className="p-5 bg-white space-y-3 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <div className="text-xs font-bold text-slate-900">Invoice #INV-2026-012</div>
                <div className="text-[11px] text-slate-500">Adaeze N. • Paystack Checkout</div>
              </div>
              <StatusBadge label="Paid in Full" variant="active" size="sm" />
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span>10-Session Rehab Package Bundle</span>
                <span className="font-mono font-bold">₦150,000</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>VAT (7.5%)</span>
                <span className="font-mono">₦11,250</span>
              </div>
              <div className="flex justify-between font-bold pt-1.5 border-t border-slate-200 text-slate-900">
                <span>Total Amount Paid</span>
                <span className="font-mono text-teal-800">₦161,250</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              <span>Official Tax Receipt #RCT-00042 Generated</span>
            </div>
          </div>
        </BrowserFrame>
      );

    default: // EMR / Clinical Documentation / Patient Management default
      return (
        <BrowserFrame urlPath="physenra.com/platform/encounters/ENC-2026-08" badge="Clinical EMR">
          <div className="p-5 bg-white space-y-3 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <div className="text-xs font-bold text-slate-900">Adaeze N. • L5-S1 Radiculopathy</div>
                <div className="text-[11px] text-slate-500">Initial Musculoskeletal SOAP Note</div>
              </div>
              <StatusBadge label="Signed" variant="active" size="sm" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-teal-50 border border-teal-100">
                <span className="text-[10px] text-teal-700 font-bold block">VAS Pain Scale</span>
                <span className="text-sm font-bold font-mono text-teal-900">6 / 10</span>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block">ODI Impairment</span>
                <span className="text-sm font-bold font-mono text-slate-900">42%</span>
              </div>
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
              Objective: Lumbar extension centralizes pain. Straight leg raise positive right at 40°. McKenzie prone press-ups prescribed.
            </div>
          </div>
        </BrowserFrame>
      );
  }
};

interface FeatureDetailShellProps {
  slug?: string;
}

export const FeatureDetailShell: React.FC<FeatureDetailShellProps> = ({ slug: propSlug }) => {
  const params = useParams<{ slug: string }>();
  const activeSlug = propSlug || params.slug || 'physiotherapy-emr';
  const data = FEATURE_DATA[activeSlug] || FEATURE_DATA['physiotherapy-emr'];

  return (
    <MarketingLayout
      title={`${data.title} | Physenra`}
      description={data.description}
    >
      <div className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <Link
            to="/features"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Features</span>
          </Link>
          <SectionHeading
            kicker={data.kicker}
            title={data.title}
            subtitle={data.tagline}
            align="left"
          />
        </div>
      </div>

      <div className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Column: Clinical Description & Highlights */}
            <div className="lg:col-span-7">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">
                Clinical Workflow & Overview
              </h2>
              <p className="text-base text-slate-600 leading-relaxed mb-8">
                {data.description}
              </p>

              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Key Verified Capabilities
              </h3>
              <div className="space-y-3">
                {data.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-slate-700">{h}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <PrimaryCTAButton size="lg" to="/register-practice">
                  Start 14-Day Free Trial
                </PrimaryCTAButton>
              </div>
            </div>

            {/* Right Column: Tailored Product Visual Mockup */}
            <div className="lg:col-span-5 space-y-6">
              {renderFeatureVisual(activeSlug)}

              {/* Onboarding Callout Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Experience {data.kicker}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  All plans include full access to our clinical EMR, treatment packages, and scheduling tools. Test on your clinic caseload self-service.
                </p>
                <div className="space-y-2.5 text-xs text-slate-600 mb-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>14-day free trial on all plans</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Self-service practice setup</span>
                  </div>
                </div>
                <PrimaryCTAButton to="/register-practice" className="w-full">
                  Create Practice Workspace
                </PrimaryCTAButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
};
