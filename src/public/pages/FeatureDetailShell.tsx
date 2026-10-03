// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — FEATURE DETAIL ROUTE SHELL (PHASE 1C ENHANCED)
// File: src/public/pages/FeatureDetailShell.tsx
// ==============================================================================

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { PrimaryCTAButton } from '../components/PrimaryCTAButton';
import { SecondaryCTAButton } from '../components/SecondaryCTAButton';
import { BrowserFrame } from '../components/BrowserFrame';
import { StatusBadge } from '../components/StatusBadge';
import {
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Receipt,
} from 'lucide-react';

interface PracticeBenefit {
  title: string;
  desc: string;
}

interface RelatedFeatureLink {
  title: string;
  slug: string;
  desc: string;
}

interface FeatureModuleData {
  title: string;
  kicker: string;
  tagline: string;
  description: string;
  workflowTitle: string;
  workflowDescription: string;
  workflowSteps: string[];
  highlights: string[];
  practiceBenefits: PracticeBenefit[];
  relatedFeatures: RelatedFeatureLink[];
}

const FEATURE_DATA: Record<string, FeatureModuleData> = {
  'physiotherapy-emr': {
    title: 'Physiotherapy Clinical EMR & SOAP Notes',
    kicker: 'Clinical Musculoskeletal Charting',
    tagline: 'Document musculoskeletal assessments in minutes with specialized clinical fields.',
    description:
      'Generic medical charts fail to capture the functional reality of physical therapy. Physenra provides specialized subjective intake fields, active and passive joint Range of Motion (ROM), Oxford scale Manual Muscle Testing (MMT 0-5), and standardized functional outcome measure scoring.',
    workflowTitle: 'Musculoskeletal Encounter Workflow',
    workflowDescription:
      'A structured, step-by-step documentation pathway designed to keep consultations efficient while ensuring thorough evidence-based charting.',
    workflowSteps: [
      'Record 24-hour symptom cycle, pain behavior, and aggravating/easing postures.',
      'Log bilateral joint active and passive Range of Motion (ROM) in degrees.',
      'Grade muscle group strength using the standard Oxford Scale (0 to 5).',
      'Select and record orthopaedic special test results with instant positive/negative toggles.',
      'Generate baseline or progress functional outcome scores (VAS, NDI, ODI, LEFS, QuickDASH).',
      'Sign off clinical encounter with practitioner digital timestamp lock.',
    ],
    highlights: [
      'Structured musculoskeletal subjective intake with 24-hour symptom behavior',
      'Joint mapping and active vs. passive Range of Motion (ROM) assessment',
      'Oxford scale Manual Muscle Testing (MMT) with side-by-side comparison',
      'Standardized functional outcome scoring: VAS, NDI, ODI, LEFS, and QuickDASH',
      'Direct link between appointments, encounters, and longitudinal progress',
    ],
    practiceBenefits: [
      {
        title: 'Eliminate Documentation Backlog',
        desc: 'Standardized physical therapy fields cut documentation time significantly compared to unformatted free-text notes.',
      },
      {
        title: 'Defensible Clinical Records',
        desc: 'Objective degree and strength measurements provide concrete data for medical referrals and audit compliance.',
      },
      {
        title: 'Clear Longitudinal Recovery Tracking',
        desc: 'Compare baseline ROM and strength against current session findings to demonstrate tangible patient improvement.',
      },
    ],
    relatedFeatures: [
      {
        title: 'Clinical Documentation',
        slug: 'clinical-documentation',
        desc: 'Orthopaedic special tests and immutable sign-off locks.',
      },
      {
        title: 'Treatment Plans & HEP',
        slug: 'treatment-plans',
        desc: 'SMART goals and home exercise prescription.',
      },
      {
        title: 'Patient Management',
        slug: 'patient-management',
        desc: 'Longitudinal episode organization and medical alerts.',
      },
    ],
  },

  'patient-management': {
    title: 'Patient Directory & Episode Architecture',
    kicker: 'Longitudinal Care Organization',
    tagline: 'Organize patient records around distinct episodes of care.',
    description:
      'Physenra structures clinical records into distinct Episodes of Care—such as acute sports injury, post-operative spinal rehabilitation, or ongoing maintenance—ensuring past clinical history is never lost, mixed up, or overwritten.',
    workflowTitle: 'Episode-Based Patient Care Journey',
    workflowDescription:
      'How patient demographics, medical history, and multiple concurrent or sequential rehabilitation episodes are organized.',
    workflowSteps: [
      'Register patient profile with demographics, occupation, and emergency contacts.',
      'Flag clinical contraindications, allergies, and red-flag screening alerts.',
      'Create targeted Episode of Care specifying anatomical presentation and referring physician.',
      'Link all subsequent appointments, SOAP encounters, and DICOM imaging to the active episode.',
      'Review attendance history, completed visits, and active treatment package entitlements.',
      'Close episode upon functional milestone achievement or discharge summary sign-off.',
    ],
    highlights: [
      'Comprehensive demographic registry and emergency contact records',
      'Episode-of-care architecture segregating distinct medical presentations',
      'Active package entitlement and deposit wallet balance visibility',
      'Medical alerts, contraindications, and red-flag checklists',
    ],
    practiceBenefits: [
      {
        title: 'Contextual Clinical History',
        desc: 'Therapists immediately see previous treatments and response to care when patients return for new or recurring episodes.',
      },
      {
        title: 'Unified Front-Desk & Clinical Visibility',
        desc: 'Front desk can verify package balances while therapists access clinical history without permission conflicts.',
      },
      {
        title: 'Red-Flag Risk Prevention',
        desc: 'Prominently displayed contraindications ensure high-risk conditions are reviewed before any manual therapy.',
      },
    ],
    relatedFeatures: [
      {
        title: 'Physiotherapy EMR',
        slug: 'physiotherapy-emr',
        desc: 'Specialized musculoskeletal SOAP charting and functional batteries.',
      },
      {
        title: 'Appointments & Scheduling',
        slug: 'appointments',
        desc: 'Multi-practitioner scheduling and bay allocations.',
      },
      {
        title: 'Treatment Packages',
        slug: 'treatment-packages',
        desc: 'Prepaid therapy bundles and patient deposit wallets.',
      },
    ],
  },

  appointments: {
    title: 'Multi-Practitioner Scheduling & Bay Management',
    kicker: 'Clinic Appointment Coordination',
    tagline: 'Streamline multi-therapist scheduling and eliminate room conflicts.',
    description:
      'Manage multiple practitioners across treatment rooms and therapy bays with a responsive, color-coded calendar. Convert scheduled appointments directly into clinical visits and SOAP notes with one click.',
    workflowTitle: 'Daily Clinic Scheduling & Arrival Flow',
    workflowDescription:
      'From patient booking to bay allocation and clinical visit handover at the front desk.',
    workflowSteps: [
      'Select practitioner timetable column and available time slot.',
      'Assign treatment bay, private consultation room, or rehabilitation gym space.',
      'Mark patient arrival status: Scheduled, Arrived, In Session, Completed, No-Show.',
      'Click Convert to Visit to launch the clinical encounter with pre-filled patient context.',
      'Encounter sign-off updates calendar visit status and decrements package session balance.',
    ],
    highlights: [
      'Side-by-side multi-practitioner column calendar view',
      'Treatment room and therapy equipment allocation',
      'Status tracking: Scheduled, Arrived, In Session, Completed, No-Show',
      'One-click Clinical Visit and SOAP encounter creation from the calendar',
    ],
    practiceBenefits: [
      {
        title: 'Zero Double-Booked Resources',
        desc: 'Physical bay and room allocations prevent two therapists from scheduling the same private room simultaneously.',
      },
      {
        title: 'Seamless Reception-to-Therapist Handover',
        desc: 'Therapists see real-time arrival badges on their dashboard when patients check in at reception.',
      },
      {
        title: 'Reduced Front-Desk Overhead',
        desc: 'Converting appointments directly into visits eliminates redundant patient data entry.',
      },
    ],
    relatedFeatures: [
      {
        title: 'Practice Management',
        slug: 'practice-management',
        desc: 'Room governance, stock control, and team permissions.',
      },
      {
        title: 'Treatment Packages',
        slug: 'treatment-packages',
        desc: 'Session decrementing and wallet ledger management.',
      },
      {
        title: 'Billing & Invoicing',
        slug: 'billing',
        desc: 'Itemized invoice generation from completed visits.',
      },
    ],
  },

  'clinical-documentation': {
    title: 'Orthopaedic & Neurological Documentation',
    kicker: 'Standardized Clinical Records',
    tagline: 'Structured charting built around evidence-based physiotherapy.',
    description:
      'Eliminate freehand narrative ambiguity. Physenra enforces standardized clinical fields for orthopaedic special tests, neurodynamic assessments, and functional goals.',
    workflowTitle: 'Evidence-Based Documentation Process',
    workflowDescription:
      'How specialized orthopaedic tests, neurological assessments, and medical reports are recorded and secured.',
    workflowSteps: [
      'Select relevant joint or spinal region during objective examination.',
      'Execute orthopaedic tests (e.g. Lachman, Hawkins-Kennedy, Straight Leg Raise, Spurling).',
      'Record findings with structured positive/negative indicators and symptom reproduction notes.',
      'Document neurological dermatome sensitivity, myotome power, and deep tendon reflexes.',
      'Lock encounter permanently with digital practitioner credentials and timestamp.',
      'Export or print standardized medical progress reports for referring medical specialists.',
    ],
    highlights: [
      'Special orthopaedic tests database with instant positive/negative logging',
      'Standardized functional milestone and progress review documentation',
      'Printable clinical encounter summaries for referring medical physicians',
      'Immutable clinical sign-off with practitioner timestamp and digital lock',
    ],
    practiceBenefits: [
      {
        title: 'Professional Medical Referrals',
        desc: 'Produce clean, standardized clinical summaries that strengthen referral relationships with orthopaedic surgeons and physicians.',
      },
      {
        title: 'Legal & Clinical Integrity',
        desc: 'Digital sign-off locks notes against retrospective tampering, protecting practice liability.',
      },
      {
        title: 'Clinical Consistency Across Associates',
        desc: 'Junior clinicians follow standardized evaluation frameworks, maintaining consistent care quality across your clinic.',
      },
    ],
    relatedFeatures: [
      {
        title: 'Physiotherapy EMR',
        slug: 'physiotherapy-emr',
        desc: 'Musculoskeletal SOAP charting, ROM, and Oxford MMT.',
      },
      {
        title: 'Medical Imaging PACS',
        slug: 'medical-imaging',
        desc: 'Browser-based DICOM evaluation and Cobb calipers.',
      },
      {
        title: 'Treatment Plans',
        slug: 'treatment-plans',
        desc: 'Goal setting and home exercise prescription.',
      },
    ],
  },

  'treatment-plans': {
    title: 'Treatment Protocols & Exercise Prescription (HEP)',
    kicker: 'Rehabilitation Care Pathways',
    tagline: 'Define measurable functional goals and prescribe home exercise programmes.',
    description:
      'Build structured rehabilitation pathways with SMART clinical goals, anticipated duration, and printable home exercise programmes (HEP) specifying sets, reps, and hold times.',
    workflowTitle: 'Rehabilitation Pathway & Exercise Prescription Flow',
    workflowDescription:
      'Structuring recovery milestones and equipping patients with clear home exercise guidance.',
    workflowSteps: [
      'Define short-term (2-4 weeks) and long-term (6-12 weeks) measurable functional goals.',
      'Select therapeutic exercises targeting mobility, strength, motor control, or endurance.',
      'Configure prescribed dosage: sets, repetitions, hold duration, and weekly frequency.',
      'Add clinical technique cues, precautions, and symptom stop-rules.',
      'Print patient-facing home exercise programme handout at visit conclusion.',
      'Track milestone attainment and adjust protocols during follow-up reviews.',
    ],
    highlights: [
      'Goal-setting protocols with short-term and long-term milestones',
      'Home exercise prescription with sets, reps, hold times, and instructions',
      'Printable patient instruction handouts and care guidance',
      'Discharge summary builder with comparative functional outcome recovery deltas',
    ],
    practiceBenefits: [
      {
        title: 'Enhanced Patient Adherence',
        desc: 'Patients receive clear, printable home exercise instructions, reducing exercise confusion between clinical sessions.',
      },
      {
        title: 'Demonstrable Clinical Value',
        desc: 'Documenting goal attainment helps patients appreciate their functional progress, improving care plan completion.',
      },
      {
        title: 'Standardized Clinic Care Pathways',
        desc: 'Build consistent recovery protocols for common presentations like ACL rehab or post-laminectomy recovery.',
      },
    ],
    relatedFeatures: [
      {
        title: 'Physiotherapy EMR',
        slug: 'physiotherapy-emr',
        desc: 'Musculoskeletal SOAP charting, ROM, and Oxford MMT.',
      },
      {
        title: 'Clinical Documentation',
        slug: 'clinical-documentation',
        desc: 'Orthopaedic special tests and progress reviews.',
      },
      {
        title: 'Treatment Packages',
        slug: 'treatment-packages',
        desc: 'Session bundles and deposit wallet credits.',
      },
    ],
  },

  'treatment-packages': {
    title: 'Treatment Packages & Patient Deposit Wallets',
    kicker: 'Commercial Protection & Entitlements',
    tagline: 'Automate multi-session bundles and eliminate lost visit revenue.',
    description:
      'Prepaid session bundles are the lifeblood of private physiotherapy clinics. Physenra automatically decrements remaining package sessions upon visit sign-off and provides immutable patient deposit wallets for advance credit balances.',
    workflowTitle: 'Package Billing & Session Decrement Flow',
    workflowDescription:
      'How therapy packages are sold, tracked, decremented, and reconciled without front-desk disputes.',
    workflowSteps: [
      'Front desk issues multi-session package (e.g., 6, 10, or 12 sessions) and records payment.',
      'Package entitlement balance is attached to the patient profile.',
      'Patient attends scheduled therapy session with practitioner.',
      'Practitioner signs off clinical encounter.',
      'System atomically decrements session balance by 1 and records transaction timestamp.',
      'Patient deposit wallet balance adjusts automatically if advance funds are utilized.',
    ],
    highlights: [
      'Custom treatment session bundles (e.g. 6, 10, or 12 sessions)',
      'Atomic entitlement decrementing: sessions deduct automatically on visit completion',
      'Patient deposit wallets for advance payments and credit management',
      'Patient overpayment conversion to deposit wallet credit and flexible invoice settlement',
    ],
    practiceBenefits: [
      {
        title: 'Eliminate Disputed Sessions',
        desc: 'Every session decrement is tied to an immutable, timestamped clinician sign-off, ending disputes about remaining sessions.',
      },
      {
        title: 'Upfront Cash Flow Improvement',
        desc: 'Encourage patients to commit to full rehabilitation pathways with prepaid package bundles.',
      },
      {
        title: 'Flexible Deposit Wallets',
        desc: 'Accept advance deposits for future visits, consumables, or package top-ups with transparent ledger accounting.',
      },
    ],
    relatedFeatures: [
      {
        title: 'Billing & Invoicing',
        slug: 'billing',
        desc: 'Paystack online card processing and printable receipts.',
      },
      {
        title: 'Appointments',
        slug: 'appointments',
        desc: 'Multi-practitioner scheduling and bay allocations.',
      },
      {
        title: 'Patient Management',
        slug: 'patient-management',
        desc: 'Longitudinal episode records and package visibility.',
      },
    ],
  },

  billing: {
    title: 'Itemized Invoicing, Proof-of-Payment Receipts & Practice Accounting',
    kicker: 'Financial & Practice Accounting',
    tagline: 'Itemized invoices, numbered receipts, and multi-channel payment recording.',
    description:
      'Structured commercial billing built for private practices. Generate itemized invoices directly from clinical encounters or fee schedules, record payments across cash, POS, and bank transfer, and issue official numbered receipts.',
    workflowTitle: 'Clinical Billing & Payment Lifecycle',
    workflowDescription:
      'Converting completed clinical care into clean invoices, settled payments, and official receipts.',
    workflowSteps: [
      'Select completed clinical visit, treatment package, or clinic consumable products.',
      'Generate itemized invoice applying practice fee schedule rates and optional discounts.',
      'Collect payment via cash, patient deposit wallet, direct bank transfer, or card terminal.',
      'Authoritative database transaction allocates payment and marks invoice settled or partially paid.',
      'System generates and locks official numbered proof-of-payment receipt (#REC-XXXXX).',
      'Print or export PDF receipt for patient records or health insurance reimbursement.',
    ],
    highlights: [
      'Itemized billing from completed visits, packages, and clinic consumables',
      'Multi-channel payment recording: Cash, POS Terminal, Bank Transfer, and Wallet',
      'Printable professional PDF invoices and official numbered receipts (#REC-XXXXX)',
      'Invoice balance tracking across draft, issued, partially paid, and paid states',
    ],
    practiceBenefits: [
      {
        title: 'Accurate Clinical Provenance',
        desc: 'Every invoice is tied to clinical encounters or verified stock items, preventing unbilled treatments.',
      },
      {
        title: 'Multi-Channel Payment Recording',
        desc: 'Easily record patient settlements across front-desk cash, bank transfers, or card terminals.',
      },
      {
        title: 'Insurance-Ready Tax Receipts',
        desc: 'Patients receive numbered, professional receipts with clinic letterhead for employer and insurance claims.',
      },
    ],
    relatedFeatures: [
      {
        title: 'Treatment Packages',
        slug: 'treatment-packages',
        desc: 'Multi-session bundles and patient deposit wallets.',
      },
      {
        title: 'Appointments',
        slug: 'appointments',
        desc: 'Clinic calendar and appointment-to-visit conversion.',
      },
      {
        title: 'Practice Management',
        slug: 'practice-management',
        desc: 'Consumables inventory and practice accounting.',
      },
    ],
  },

  'medical-imaging': {
    title: 'Built-in DICOM PACS & Orthopaedic Measurement Viewer',
    kicker: 'Browser-Based Medical Imaging',
    tagline: 'Review MRI, CT, and X-ray studies directly inside the patient chart.',
    description:
      'Stop booting bulky desktop CD software or looking at phone photos. Physenra includes a zero-footprint Web PACS viewer, allowing clinicians to review DICOM studies and measure Cobb angles inside the browser.',
    workflowTitle: 'Radiology Ingestion & Measurement Workflow',
    workflowDescription:
      'How patient imaging studies are uploaded, reviewed, measured, and attached to clinical SOAP notes.',
    workflowSteps: [
      'Upload patient DICOM (.dcm) files or study ZIP archives directly into the episode vault.',
      'Open zero-footprint Web PACS viewer inside the patient encounter.',
      'Navigate multi-slice axial, sagittal, or coronal imaging series.',
      'Apply window width and level presets (Bone, Soft Tissue, Lung) to optimize visualization.',
      'Apply Cobb angle measuring calipers to quantify spinal curvature or postural deformities.',
      'Radiology measurements save directly to the objective clinical encounter record.',
    ],
    highlights: [
      'Native DICOM file (.dcm) and ZIP ingestion linked to patient episodes',
      'Zero desktop software or external plugins required',
      'Window width/level (WW/WL) presets for Bone, Soft Tissue, and Lung',
      'Orthopaedic measuring calipers including Cobb angle scoliosis quantification',
      'Attach radiologic findings directly to clinical SOAP documentation',
    ],
    practiceBenefits: [
      {
        title: 'Point-of-Care Imaging Review',
        desc: 'Clinicians review patient MRI and X-ray studies alongside SOAP notes during evaluations, not on a separate PC.',
      },
      {
        title: 'Objective Caliper Measurements',
        desc: 'Quantify Cobb angles and joint alignment directly to support orthopaedic rehabilitation decision-making.',
      },
      {
        title: 'Zero Software Overhead',
        desc: 'Runs entirely in modern web browsers without installing heavy desktop DICOM viewers or maintaining plugins.',
      },
    ],
    relatedFeatures: [
      {
        title: 'Physiotherapy EMR',
        slug: 'physiotherapy-emr',
        desc: 'Specialized musculoskeletal SOAP charting and functional batteries.',
      },
      {
        title: 'Clinical Documentation',
        slug: 'clinical-documentation',
        desc: 'Orthopaedic special tests and progress reviews.',
      },
      {
        title: 'Patient Management',
        slug: 'patient-management',
        desc: 'Episode vaults and imaging study attachments.',
      },
    ],
  },

  'practice-management': {
    title: 'Practice Governance & Consumables Control',
    kicker: 'Operations & Multi-Tenancy',
    tagline: 'Role-based access controls, multi-room tracking, and clinic supplies.',
    description:
      'Scale your clinic with granular team permissions, treatment room allocation, and physical supplies tracking across clinic rooms.',
    workflowTitle: 'Practice Administration & Stock Workflow',
    workflowDescription:
      'How clinic administrators manage team roles, room assets, and clinical consumables.',
    workflowSteps: [
      'Assign team roles: Practice Owner, Clinical Director, Senior PT, Staff PT, Receptionist.',
      'Configure practice profile, clinic branches, and letterhead presets.',
      'Define physical treatment bays, private therapy rooms, and gym equipment areas.',
      'Record physical stock: kinesiology tape, resistance bands, dry needles, and electrodes.',
      'Track stock decrements as consumables are used during clinical treatments or sold to patients.',
      'Review immutable audit logs recording privileged administrative and financial changes.',
    ],
    highlights: [
      'Granular Role-Based Access Control: Owner, Clinical Director, Senior PT, Staff PT, Receptionist',
      'Clinic inventory control for strapping tape, electrodes, and therapy consumables',
      'Treatment room and equipment utilization tracking',
      'Immutable administrative audit trail recording all privileged actions',
    ],
    practiceBenefits: [
      {
        title: 'Protect Patient Privacy',
        desc: 'Staff members only access the clinical and administrative records necessary for their specific clinic roles.',
      },
      {
        title: 'Prevent Consumable Losses',
        desc: 'Track high-turnover clinic supplies like strapping tape and electrodes to stop inventory leakage.',
      },
      {
        title: 'Multi-Room Efficiency',
        desc: 'Maximize clinic capacity by visualizing bay and equipment utilization across your practitioner team.',
      },
    ],
    relatedFeatures: [
      {
        title: 'Appointments',
        slug: 'appointments',
        desc: 'Clinic calendar and multi-therapist scheduling.',
      },
      {
        title: 'Billing & Invoicing',
        slug: 'billing',
        desc: 'Itemized invoices, numbered receipts, and payment records.',
      },
      {
        title: 'Patient Management',
        slug: 'patient-management',
        desc: 'Longitudinal care episodes and demographic records.',
      },
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
        <BrowserFrame urlPath="physenra.com/platform/invoices/INV-2026-012" badge="Payment Settled">
          <div className="p-5 bg-white space-y-3 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <div className="text-xs font-bold text-slate-900">Invoice #INV-2026-012</div>
                <div className="text-[11px] text-slate-500">Adaeze N. • POS Terminal Settlement</div>
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
              <span>Official Receipt #REC-00042 Generated</span>
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
      {/* Header Banner */}
      <div className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <Link
            to="/features"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Features</span>
          </Link>
          <div className="max-w-3xl">
            {data.kicker && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200/60 mb-3">
                {data.kicker}
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              {data.title}
            </h1>
            {data.tagline && (
              <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
                {data.tagline}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Feature Content Grid */}
      <div className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Column: Description, Workflow Steps, Capabilities & Practice Benefits */}
            <div className="lg:col-span-7 space-y-12">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">
                  Overview & Clinical Purpose
                </h2>
                <p className="text-base text-slate-600 leading-relaxed">
                  {data.description}
                </p>
              </div>

              {/* 3. Practical Workflow Description */}
              <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {data.workflowTitle}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  {data.workflowDescription}
                </p>
                <div className="space-y-3">
                  {data.workflowSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-700 leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Capability Bullets */}
              <div>
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
              </div>

              {/* 6. "How It Helps The Practice" Section */}
              <div className="pt-8 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-6">
                  How This Helps Your Practice
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {data.practiceBenefits.map((b, i) => (
                    <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1.5">
                      <h4 className="font-bold text-slate-900 text-sm">{b.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{b.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. Dual CTA Buttons */}
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <PrimaryCTAButton size="lg" to="/register-practice">
                  Start 14-Day Free Trial
                </PrimaryCTAButton>
                <SecondaryCTAButton size="lg" to="/login">
                  Log In
                </SecondaryCTAButton>
              </div>
            </div>

            {/* Right Column: Tailored Product Visual Mockup & Onboarding Card */}
            <div className="lg:col-span-5 space-y-6">
              {/* 4. Relevant Product Visual */}
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

          {/* 8. Related Feature Links (Internal Cross-Linking) */}
          <div className="mt-20 pt-12 border-t border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-6">
              Related Platform Capabilities
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {data.relatedFeatures.map((rf, i) => (
                <Link
                  key={i}
                  to={`/features/${rf.slug}`}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-300 hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {rf.title}
                    </h4>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {rf.desc}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-teal-700">
                    <span>Learn more</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
};
