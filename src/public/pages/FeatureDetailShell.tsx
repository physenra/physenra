// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — FEATURE DETAIL ROUTE SHELL
// File: src/public/pages/FeatureDetailShell.tsx
// ==============================================================================

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { SectionHeading } from '../components/SectionHeading';
import { PrimaryCTAButton } from '../components/PrimaryCTAButton';
import { CheckCircle2, ArrowLeft } from 'lucide-react';

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
    tagline: 'High-speed structured charting built around evidence-based physiotherapy.',
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
      'Instant online card checkout via secure Paystack payment gateway',
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

            <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Ready to Experience {data.kicker}?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                All plans include full access to our clinical EMR, treatment packages, and scheduling tools. Test on your clinic caseload with zero risk.
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
                  <span>Instant self-service onboarding</span>
                </div>
              </div>
              <PrimaryCTAButton to="/register-practice" className="w-full">
                Create Practice Workspace
              </PrimaryCTAButton>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
};
