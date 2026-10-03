// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — FEATURE DETAIL ROUTE SHELL (PHASE 1C ENHANCED)
// File: src/public/pages/FeatureDetailShell.tsx
// ==============================================================================

import React from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
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
  Lock,
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
    tagline: 'Document musculoskeletal assessments in minutes with specialized physical therapy fields.',
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
        desc: 'Specialty assessment architecture covering Neurology and Paediatrics.',
      },
      {
        title: 'Treatment Plans & HEP',
        slug: 'treatment-plans',
        desc: 'SMART goals and home exercise prescription.',
      },
      {
        title: 'Appointments & Scheduling',
        slug: 'appointments',
        desc: 'Multi-therapist calendar and bay allocation.',
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
        desc: 'Specialized SOAP notes and joint range of motion charting.',
      },
      {
        title: 'Appointments',
        slug: 'appointments',
        desc: 'Multi-practitioner scheduling and bay allocations.',
      },
      {
        title: 'Treatment Packages',
        slug: 'treatment-packages',
        desc: 'Multi-session care bundles and deposit wallets.',
      },
    ],
  },

  'appointments': {
    title: 'Multi-Practitioner Scheduling & Bay Allocation',
    kicker: 'Clinic Calendar & Resource Coordination',
    tagline: 'Coordinate therapist schedules, private treatment rooms, and physical therapy bays effortlessly.',
    description:
      'Designed specifically for the physical layout of physiotherapy practices. Manage multi-therapist schedules, allocate individual treatment bays and private consultation rooms, track real-time patient arrival statuses, and convert booked appointments into clinical encounters with a single click.',
    workflowTitle: 'Front-Desk to Treatment Table Journey',
    workflowDescription:
      'Seamless coordination between reception scheduling, treatment room availability, and clinician charting.',
    workflowSteps: [
      'Front desk books appointment selecting patient, attending physiotherapist, and care episode.',
      'System assigns specific physical treatment bay or private therapy room based on availability.',
      'Patient arrives at clinic; reception updates status to "Arrived".',
      'Attending physiotherapist calls patient into bay and launches clinical visit with 1 click.',
      'Encounter is documented and signed, automatically updating appointment to "Completed".',
      'Follow-up appointments are scheduled directly from the treatment plan review.',
    ],
    highlights: [
      'Multi-practitioner column calendar view with color-coded therapist schedules',
      'Physical treatment bay and private consultation room assignment',
      'Live patient status flow: Scheduled, Arrived, In Session, Completed, No-Show',
      '1-click conversion from booked appointment to clinical visit documentation',
      'Direct integration with patient episodes and active package balances',
    ],
    practiceBenefits: [
      {
        title: 'Eliminate Room Conflicts',
        desc: 'Visual bay and room allocation prevents double-booking specialized equipment or private therapy rooms.',
      },
      {
        title: 'Reduced Clinic Wait Times',
        desc: 'Live status indicators show therapists exactly when patients arrive in the reception area.',
      },
      {
        title: 'Seamless Documentation Handover',
        desc: 'Therapists launch the correct patient chart and episode directly from their calendar slot.',
      },
    ],
    relatedFeatures: [
      {
        title: 'Patient Management',
        slug: 'patient-management',
        desc: 'Longitudinal episode records and medical alerts.',
      },
      {
        title: 'Clinical Documentation',
        slug: 'clinical-documentation',
        desc: 'Structured clinical notes and specialty assessments.',
      },
      {
        title: 'Billing & Invoicing',
        slug: 'billing',
        desc: 'Itemized invoices and official numbered receipts.',
      },
    ],
  },

  'clinical-documentation': {
    title: 'Specialized Clinical Documentation & Multi-Specialty Assessments',
    kicker: 'Specialty Assessment Architecture',
    tagline: 'Structured examination protocols spanning Musculoskeletal, Neurology, and Paediatric physiotherapy.',
    description:
      'Physenra provides specialized clinical documentation built around real physical therapy modalities. Beyond core SOAP charting, clinicians can complete structured specialty assessments including Neurology V1 (Modified Ashworth Spasticity, reflex grading, coordination) and Paediatrics V1 (Gross Motor screening, developmental milestones, primitive reflexes), secured with immutable practitioner digital locks.',
    workflowTitle: 'Specialty-Integrated Documentation Workflow',
    workflowDescription:
      'How specialized assessments seamlessly link to clinical visits, episodes of care, and longitudinal progress tracking.',
    workflowSteps: [
      'Select clinical visit and initialize standardized documentation workflow.',
      'Document subjective history, pain rating (VAS 0–10), and aggravating/easing postures.',
      'Complete objective physical exam: bilateral joint ROM, Oxford muscle strength, and dermatomes.',
      'Attach optional structured specialty module: Neurology Motor/Spasticity Screen or Paediatric Gross Motor Screen.',
      'Formulate clinical physiotherapy diagnosis, prognosis, and treatment plan.',
      'Sign off and lock encounter with practitioner digital timestamp lock.',
    ],
    highlights: [
      'Structured SOAP encounter notes linked directly to clinical visits',
      'Built-in Neurology Structured Clinical Module V1 (Modified Ashworth Scale, deep tendon reflexes, coordination)',
      'Built-in Paediatric Structured Clinical Module V1 (gross motor milestones, primitive reflexes, muscle tone)',
      'Orthopaedic special test battery with bilateral positive/negative findings',
      'Immutable sign-off lock preventing retrospective tampering',
    ],
    practiceBenefits: [
      {
        title: 'High-Fidelity Specialty Care',
        desc: 'Chart neurological and paediatric cases with dedicated clinical scales rather than narrative free-text.',
      },
      {
        title: 'Audit-Ready Compliance',
        desc: 'Immutable digital signature locks protect record defensibility for medical-legal and referral standards.',
      },
      {
        title: 'Streamlined Clinical Handover',
        desc: 'Multi-disciplinary teams immediately understand patient functional status across visits.',
      },
    ],
    relatedFeatures: [
      {
        title: 'Physiotherapy EMR',
        slug: 'physiotherapy-emr',
        desc: 'Musculoskeletal clinical charting and ROM measurement.',
      },
      {
        title: 'Treatment Plans & HEP',
        slug: 'treatment-plans',
        desc: 'SMART functional goals and home exercise prescription.',
      },
      {
        title: 'Pain & Outcome Tracking',
        slug: 'pain-management',
        desc: 'VAS pain tracking and standardized functional scores (NDI, ODI, LEFS).',
      },
    ],
  },

  'treatment-plans': {
    title: 'Treatment Plans, SMART Goals & Home Exercise Prescription',
    kicker: 'Rehabilitation Protocols & Exercise Guidance',
    tagline: 'Prescribe targeted rehabilitation pathways with measurable functional goals and home exercises.',
    description:
      'Drive longitudinal patient recovery with structured treatment plans. Define short-term and long-term SMART functional milestones, document rehabilitation protocols, prescribe clinician-guided Home Exercise Programmes (HEP) with precise sets, reps, and hold times, and track patient adherence over the episode of care.',
    workflowTitle: 'Protocol Creation & Progression Workflow',
    workflowDescription:
      'How physical therapists build personalized rehabilitation regimens and track patient milestone attainment.',
    workflowSteps: [
      'Establish rehabilitation plan linked to the active episode of care.',
      'Define baseline functional impairment and target recovery timeline.',
      'Create short-term and long-term SMART functional goals with measurable targets.',
      'Prescribe Home Exercise Programme (HEP) with exact dosage (sets, reps, hold duration, frequency).',
      'Track patient exercise compliance and functional goal progression at follow-up visits.',
      'Transition or discharge treatment plan upon goal milestone completion.',
    ],
    highlights: [
      'Structured SMART rehabilitation goal tracking (short-term & long-term)',
      'Clinician-prescribed Home Exercise Programmes (dosage, frequency, hold times)',
      'Direct integration with clinical encounters and progress notes',
      'Longitudinal recovery milestone benchmarks',
    ],
    practiceBenefits: [
      {
        title: 'Improved Patient Adherence',
        desc: 'Clear home exercise instructions empower patients to continue rehabilitation safely between clinic sessions.',
      },
      {
        title: 'Objective Progress Verification',
        desc: 'Quantifiable SMART milestones provide clear evidence of recovery for patients, physicians, and payers.',
      },
      {
        title: 'Standardized Clinical Quality',
        desc: 'Senior clinical directors can establish consistent treatment protocols across clinic staff.',
      },
    ],
    relatedFeatures: [
      {
        title: 'Clinical Documentation',
        slug: 'clinical-documentation',
        desc: 'Specialty assessment architecture and SOAP encounter notes.',
      },
      {
        title: 'Patient Management',
        slug: 'patient-management',
        desc: 'Episode architecture and longitudinal history.',
      },
      {
        title: 'Pain & Outcome Tracking',
        slug: 'pain-management',
        desc: 'Standardized outcome batteries and VAS pain scoring.',
      },
    ],
  },

  'treatment-packages': {
    title: 'Treatment Packages & Patient Deposit Wallets',
    kicker: 'Care Bundles & Prepaid Balance Tracking',
    tagline: 'Prevent session leakage with atomic package decrementing and deposit credit management.',
    description:
      'Managing multi-session therapy packages on spreadsheets causes lost revenue, patient billing disputes, and awkward front-desk confrontations. Physenra automates care package entitlements: sessions are atomically decremented only when clinical visits are signed off, and patient deposit wallets track prepaid credits transparently.',
    workflowTitle: 'Package Lifecycle & Session Deduction',
    workflowDescription:
      'How therapy packages are sold, tracked, and automatically decremented across clinical visits.',
    workflowSteps: [
      'Front desk bills an upfront multi-session package (e.g., 6, 10, or 12 rehabilitation sessions).',
      'Package balance and expiration rules are automatically credited to the patient profile.',
      'Patient attends scheduled physical therapy session.',
      'Attending therapist completes the clinical encounter and digitally signs the note.',
      'System atomically decrements one session from the active package ledger.',
      'Front desk and patient receive real-time balance notification (e.g., "7 of 10 remaining").',
    ],
    highlights: [
      'Atomic session decrementing tied strictly to signed clinical visits',
      'Multi-session discount bundle configuration (e.g., Post-Op 10-Pack)',
      'Patient prepaid deposit wallet balance tracking',
      'Real-time remaining session alerts at front desk and clinical check-in',
      'Complete package transaction history and audit ledger',
    ],
    practiceBenefits: [
      {
        title: 'Zero Session Leakage',
        desc: 'Eliminates unbilled visits by locking session deductions directly to clinical sign-offs.',
      },
      {
        title: 'Elimination of Front-Desk Disputes',
        desc: 'Front desk and patients have complete visibility into exact session usage timestamps.',
      },
      {
        title: 'Upfront Clinic Cash Flow',
        desc: 'Incentivize care completion with upfront package purchases while maintaining automated tracking.',
      },
    ],
    relatedFeatures: [
      {
        title: 'Billing & Invoicing',
        slug: 'billing',
        desc: 'Itemized invoices, numbered receipts, and payment records.',
      },
      {
        title: 'Appointments',
        slug: 'appointments',
        desc: 'Multi-therapist calendar and bay allocation.',
      },
      {
        title: 'Patient Management',
        slug: 'patient-management',
        desc: 'Care episodes and demographic records.',
      },
    ],
  },

  'billing': {
    title: 'Itemized Invoicing, Numbered Receipts & Payment Tracking',
    kicker: 'Practice Financial Operations',
    tagline: 'Generate itemized invoices, track multi-channel payments, and issue official numbered receipts.',
    description:
      'Physenra streamlines private practice billing with built-in fee schedules, itemized invoicing directly from clinical visits, and official numbered proof-of-payment receipts. Track settlements across front-desk POS terminals, bank transfers, cash, and deposit wallets without administrative reconciliation headaches.',
    workflowTitle: 'Clinical Encounter to Payment Settlement',
    workflowDescription:
      'How physical therapy encounters convert smoothly into itemized invoices, settlements, and numbered receipts.',
    workflowSteps: [
      'Select completed clinical visit, treatment package, or clinic consumable item.',
      'Generate itemized invoice with standardized practice fee schedule and applicable taxes.',
      'Record patient payment method: POS card terminal, bank transfer, cash, or deposit credit.',
      'System issues an official sequential numbered receipt (e.g., #REC-00042).',
      'Print or export professional PDF invoice and receipt with practice clinic letterhead.',
      'Review daily collection summaries and payment reconciliation reports.',
    ],
    highlights: [
      'Itemized invoicing directly tied to clinical encounters, packages, and supplies',
      'Standardized practice fee schedules for consultations, reviews, and modalities',
      'Official sequential numbered receipts with tamper-evident audit records',
      'Multi-channel payment recording: POS terminal, bank transfer, cash, wallet credit',
      'Clinic letterhead presets and printable professional PDF generation',
    ],
    practiceBenefits: [
      {
        title: 'Accurate Revenue Collection',
        desc: 'Eliminate missed billings by generating invoices directly from documented clinical visits.',
      },
      {
        title: 'Professional Patient Proof',
        desc: 'Patients receive clear, itemized receipts for private records and insurance reimbursement.',
      },
      {
        title: 'Painless Daily Balancing',
        desc: 'Front desk can balance POS slips and cash collections against system financial ledgers at shift close.',
      },
    ],
    relatedFeatures: [
      {
        title: 'Treatment Packages',
        slug: 'treatment-packages',
        desc: 'Care bundles and deposit wallet credits.',
      },
      {
        title: 'Appointments',
        slug: 'appointments',
        desc: 'Multi-practitioner calendar and scheduling.',
      },
      {
        title: 'Practice Management',
        slug: 'practice-management',
        desc: 'Role-based access control and clinic consumables.',
      },
    ],
  },

  'pain-management': {
    title: 'Pain & Functional Outcome Tracking Built for Physiotherapy',
    kicker: 'Objective Symptom & Recovery Metrics',
    tagline: 'Track pain behavior, 24-hour symptom cycles, and standardized functional outcome batteries.',
    description:
      'Subjective pain alone does not tell the full recovery story. Physenra combines 0–10 Visual Analog Scale (VAS) pain scoring with 24-hour symptom behavior mapping and validated functional outcome batteries (NDI, ODI, LEFS, QuickDASH) to provide clear, defensible evidence of patient progress.',
    workflowTitle: 'Objective Outcome Assessment Pathway',
    workflowDescription:
      'Standardized scoring from initial intake through rehabilitation reviews to discharge benchmarking.',
    workflowSteps: [
      'Record baseline resting, current, and worst pain ratings using the 0–10 VAS scale.',
      'Map 24-hour symptom cycle: morning stiffness duration, aggravating activities, and easing postures.',
      'Administer anatomical functional outcome battery: Neck Disability Index (NDI), Oswestry Disability Index (ODI), Lower Extremity Functional Scale (LEFS), or QuickDASH.',
      'System computes validated percentage impairment score and records baseline benchmark.',
      'Re-evaluate functional scores at scheduled re-assessment intervals.',
      'Generate longitudinal recovery comparison charts for patient engagement and referral reporting.',
    ],
    highlights: [
      'Visual Analog Scale (VAS 0–10) tracking current, best, and worst pain levels',
      '24-hour symptom behavior profiling (diurnal variation, aggravating and easing factors)',
      'Validated functional outcome batteries: NDI, ODI, LEFS, and QuickDASH',
      'Automated percentage impairment calculation and baseline comparison',
      'Longitudinal recovery charts demonstrating objective functional improvement',
    ],
    practiceBenefits: [
      {
        title: 'Concrete Recovery Demonstration',
        desc: 'Show patients and referring physicians objective proof of recovery beyond subjective reports.',
      },
      {
        title: 'Evidence-Based Care Decisions',
        desc: 'Identify patients who are plateauing early to adjust treatment techniques or exercise dosage.',
      },
      {
        title: 'Defensible Referral Reports',
        desc: 'Provide referring physicians with standardized functional battery scores that validate clinical efficacy.',
      },
    ],
    relatedFeatures: [
      {
        title: 'Clinical Documentation',
        slug: 'clinical-documentation',
        desc: 'Specialty assessment architecture and SOAP encounter notes.',
      },
      {
        title: 'Physiotherapy EMR',
        slug: 'physiotherapy-emr',
        desc: 'Joint ROM measurement and Oxford manual muscle testing.',
      },
      {
        title: 'Treatment Plans & HEP',
        slug: 'treatment-plans',
        desc: 'SMART functional goals and home exercise prescription.',
      },
    ],
  },

  'medical-imaging': {
    title: 'Built-in DICOM Web PACS Viewer',
    kicker: 'Zero-Footprint Medical Imaging',
    tagline: 'View MRI, CT, and X-ray studies directly in the patient clinical chart without third-party software.',
    description:
      'Eliminate external viewer installations and lost CD-ROMs. Physenra integrates a zero-footprint web DICOM PACS viewer directly into the patient clinical chart. Physiotherapists can view sagittal and axial MRI slices, measure Cobb angles and vertebral dimensions with digital calipers, and correlate radiological findings with physical examination results.',
    workflowTitle: 'Radiological Review Workflow',
    workflowDescription:
      'How physical therapists review diagnostic studies alongside clinical findings at the treatment table.',
    workflowSteps: [
      'Upload or link DICOM imaging study (MRI, CT, X-ray) directly to the active Episode of Care.',
      'Launch built-in zero-footprint Web PACS viewer directly inside the browser window.',
      'Adjust window/leveling presets (Bone, Soft Tissue, Lung) for optimal anatomical contrast.',
      'Use calibrated measurement calipers to assess Cobb angles, joint spaces, or disc heights.',
      'Save key annotated slices and clinical impressions directly into the clinical visit note.',
      'Review imaging side-by-side with objective ROM and manual muscle testing data.',
    ],
    highlights: [
      'Zero-footprint web DICOM viewer running natively in modern web browsers',
      'Window/leveling (WW/WL) presets for bone, soft tissue, and spinal imaging',
      'Calibrated measurement tools: distance calipers, angle measurements, and Cobb angle',
      'Direct study attachment to specific clinical episodes of care',
      'Instant side-by-side comparison with objective physical examination findings',
    ],
    practiceBenefits: [
      {
        title: 'Faster Consultations',
        desc: 'Review patient MRI or X-ray studies immediately at the treatment table without launching separate desktop software.',
      },
      {
        title: 'Improved Patient Understanding',
        desc: 'Show patients their spinal scans and explain mechanical findings visually on screen.',
      },
      {
        title: 'Consolidated Clinical Record',
        desc: 'Imaging studies and measurements remain permanently associated with the relevant episode of care.',
      },
    ],
    relatedFeatures: [
      {
        title: 'Clinical Documentation',
        slug: 'clinical-documentation',
        desc: 'Specialty assessment architecture and SOAP encounter notes.',
      },
      {
        title: 'Patient Management',
        slug: 'patient-management',
        desc: 'Care episodes and diagnostic history.',
      },
      {
        title: 'Physiotherapy EMR',
        slug: 'physiotherapy-emr',
        desc: 'Specialized SOAP notes and joint range of motion charting.',
      },
    ],
  },

  'practice-management': {
    title: 'Practice Management & Granular Role-Based Access Control',
    kicker: 'Clinical Governance & Inventory Operations',
    tagline: 'Govern clinical access permissions, track physical consumables, and maintain an immutable audit trail.',
    description:
      'Run your clinic with enterprise governance. Manage staff roles (Practice Owner, Clinical Director, Senior PT, Staff PT, Receptionist), allocate treatment bays and equipment, control physical stock for strapping tape, dry needles, and therapy consumables, and preserve an immutable administrative audit log.',
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
                  <div className="text-[11px] text-emerald-700">Dr. K. Okonjo • Bay 1 (Spine Traction)</div>
                </div>
                <StatusBadge label="In Session" variant="active" size="sm" dot={false} />
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-slate-900">10:30 - 11:15 • Emeka O.</div>
                  <div className="text-[11px] text-slate-500">Dr. T. Balogun • Bay 2 (Neuro Rehab)</div>
                </div>
                <StatusBadge label="Arrived" variant="scheduled" size="sm" dot={false} />
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50/60 border border-slate-100 flex justify-between items-center text-slate-500">
                <div>
                  <div className="text-xs font-medium">11:30 - 12:15 • Chinedu M.</div>
                  <div className="text-[11px]">Private Consultation Room A</div>
                </div>
                <span className="text-[10px] font-mono uppercase bg-slate-100 px-2 py-0.5 rounded">Booked</span>
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

    case 'clinical-documentation':
      return (
        <BrowserFrame urlPath="physenra.com/platform/visits/VIS-2026-042/specialty" badge="Specialty Module">
          <div className="p-5 bg-white space-y-3 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <div className="text-xs font-bold text-slate-900">Specialty Assessment Architecture</div>
                <div className="text-[11px] text-slate-500">Active Visit #VIS-2026-042 • Locked &amp; Signed</div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Lock className="w-3 h-3" />
                Signed Off
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-100 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-teal-900">Neurology V1: Motor &amp; Spasticity Screen</span>
                  <span className="font-mono text-[10px] bg-teal-200/60 text-teal-900 px-1.5 py-0.2 rounded font-semibold">NEURO_MOTOR_V1</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-teal-800 pt-1">
                  <div>R Biceps (MAS): <span className="font-bold">1+ (Catch &amp; release)</span></div>
                  <div>Patellar Reflex: <span className="font-bold">Grade 3+ (Brisk)</span></div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">Paediatrics V1: Gross Motor Screen</span>
                  <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded">PAEDS_GM_V1</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  GMFCS Level: II • Primitive Reflexes: Integrated • Milestone Age: 24m
                </div>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1">
              <span>Timestamp Lock: 2026-10-03T11:42Z</span>
              <span className="text-teal-700 font-semibold">Immutable Record</span>
            </div>
          </div>
        </BrowserFrame>
      );

    case 'treatment-plans':
      return (
        <BrowserFrame urlPath="physenra.com/platform/treatment-plans/TP-2026-14" badge="Rehab Protocol">
          <div className="p-5 bg-white space-y-3 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <div className="text-xs font-bold text-slate-900">Rehabilitation Plan: Rotator Cuff Tendinopathy</div>
                <div className="text-[11px] text-slate-500">Patient: Babatunde A. • Episode #EP-2026-11</div>
              </div>
              <StatusBadge label="In Progress" variant="active" size="sm" />
            </div>
            <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-100 space-y-2">
              <div className="text-xs font-bold text-teal-900">SMART Functional Goals</div>
              <div className="space-y-1 text-xs text-teal-800">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>STG: Active shoulder flexion to 120° pain-free by Week 3</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded-full border border-teal-400 shrink-0" />
                  <span>LTG: Resume overhead tennis serve with QuickDASH &lt; 15%</span>
                </div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="font-bold text-slate-900">Home Exercise Prescription (HEP)</div>
              <div className="text-[11px] text-slate-600 leading-snug">
                • Pendulum Swings: 2 sets x 30 sec, 3x daily<br />
                • Scapular Retractions: 3 sets x 12 reps, 5-sec hold<br />
                • Side-lying External Rotation (Yellow Band): 3 sets x 10 reps
              </div>
            </div>
          </div>
        </BrowserFrame>
      );

    case 'pain-management':
      return (
        <BrowserFrame urlPath="physenra.com/platform/patients/PT-2026-08/outcomes" badge="Outcome Measures">
          <div className="p-5 bg-white space-y-3 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <div className="text-xs font-bold text-slate-900">Symptom Behavior &amp; Functional Battery</div>
                <div className="text-[11px] text-slate-500">Adaeze N. • Lumbar Spine Recovery Trajectory</div>
              </div>
              <StatusBadge label="Re-Assessment" variant="active" size="sm" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-lg bg-teal-50 border border-teal-100">
                <span className="text-[10px] text-teal-700 font-bold uppercase tracking-wider block">VAS Pain Rating</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold font-mono text-teal-900">3 / 10</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">(Down from 8/10)</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">ODI Disability Index</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold font-mono text-slate-900">22%</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Minimal (Down from 54%)</span>
                </div>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600">
              <div className="text-[10px] font-bold text-slate-700 uppercase">24-Hour Symptom Cycle</div>
              <p className="text-[11px] mt-0.5">Morning stiffness decreased from 45 min to under 10 min. Tolerating 45 minutes seated computer work without peripheral radiating symptoms.</p>
            </div>
          </div>
        </BrowserFrame>
      );

    case 'patient-management':
      return (
        <BrowserFrame urlPath="physenra.com/platform/patients/PT-2026-08" badge="Episode Architecture">
          <div className="p-5 bg-white space-y-3 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <div className="text-xs font-bold text-slate-900">Adaeze Nwosu • 34 yrs (Female)</div>
                <div className="text-[11px] text-slate-500">ID: #PT-2026-08 • Occupation: Software Engineer</div>
              </div>
              <StatusBadge label="Active Care" variant="active" size="sm" />
            </div>
            <div className="p-2.5 rounded-lg bg-rose-50/80 border border-rose-200 text-xs text-rose-900 flex items-center justify-between">
              <div>
                <span className="font-bold">Medical Alerts:</span> Penicillin Allergy • No Lumbar Traction
              </div>
              <span className="text-[10px] font-bold bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded">RED FLAG CHECKED</span>
            </div>
            <div className="p-3 rounded-lg bg-teal-50/50 border border-teal-100 space-y-1.5 text-xs">
              <div className="flex justify-between font-bold text-teal-900">
                <span>Active Episode: L5-S1 Radiculopathy</span>
                <span className="text-teal-700 font-normal">Ref: Dr. M. Adeleke</span>
              </div>
              <div className="text-[11px] text-slate-600">
                8 Encounters Completed • 1 Active Care Package (7 of 10 remaining)
              </div>
            </div>
          </div>
        </BrowserFrame>
      );

    case 'practice-management':
      return (
        <BrowserFrame urlPath="physenra.com/platform/admin/governance" badge="Governance & Stock">
          <div className="p-5 bg-white space-y-3 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900">Clinic Inventory &amp; Team Roles</span>
              <StatusBadge label="Compliance Clean" variant="active" size="sm" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block">Kinesiology Tape (Beige)</span>
                <span className="text-sm font-bold font-mono text-slate-900">14 rolls</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block">Dry Needles (0.25x40mm)</span>
                <span className="text-sm font-bold font-mono text-slate-900">120 units</span>
              </div>
            </div>
            <div className="p-2.5 rounded bg-teal-50/60 border border-teal-100 text-xs text-teal-900 flex justify-between items-center">
              <div>
                <span className="font-bold">Role: Clinical Director</span>
                <div className="text-[10px] text-teal-700">Full clinical, template, &amp; audit privileges</div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-teal-200/60 px-2 py-0.5 rounded">RBAC L4</span>
            </div>
          </div>
        </BrowserFrame>
      );

    default: // physiotherapy-emr default
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
  const location = useLocation();

  // Extract path slug if direct static route was used (e.g. /features/clinical-documentation)
  const pathSlug = location.pathname.replace(/^\/features\/?/, '').split('/')[0];
  const rawSlug = propSlug || params.slug || pathSlug || 'physiotherapy-emr';

  // Normalize aliases
  const activeSlug =
    rawSlug === 'treatment-plans-hep' ? 'treatment-plans' :
    rawSlug === 'pain-outcome-tracking' ? 'pain-management' :
    rawSlug;

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
                  Overview &amp; Clinical Purpose
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

              {/* 5. Key Functional Highlights */}
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  Key Functional Capabilities
                </h3>
                <div className="space-y-3">
                  {data.highlights.map((highlight, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700 leading-relaxed">{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Measurable Practice Benefits */}
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  How This Helps Your Practice
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {data.practiceBenefits.map((b, i) => (
                    <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 text-left">
                      <h4 className="font-bold text-slate-900 text-sm mb-1.5">{b.title}</h4>
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

          {/* 8. Related Feature Links (Internal Cross-Linking, Zero Circular Links) */}
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
