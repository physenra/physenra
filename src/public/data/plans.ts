// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — AUTHORITATIVE SAAS PLAN DEFINITIONS
// File: src/public/data/plans.ts
//
// CRITICAL ARCHITECTURAL INVARIANT:
// Derived strictly from the authoritative backend catalog.
// Solo: ₦15,000/mo (₦150,000/yr) - 1 seat
// Professional: ₦30,000/mo (₦300,000/yr) - 5 seats
// Clinic: ₦50,000/mo (₦500,000/yr) - 10 seats
// Enterprise: Custom
// ==============================================================================

export interface SaaSPlanDefinition {
  code: 'solo' | 'professional' | 'clinic' | 'enterprise';
  name: string;
  tagline: string;
  monthlyNaira: number;
  annualNaira: number;
  monthlyCents: number;
  annualCents: number;
  seats: number;
  storage: string;
  popular: boolean;
  trialDays: number;
  features: string[];
  excluded?: string[];
}

export const AUTHORITATIVE_SAAS_PLANS: SaaSPlanDefinition[] = [
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
      'Patient Membership Plans',
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
      'Patient Membership Plans & Billing Cycles',
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
      'X-Ray, MRI & CT Patient Vault',
      'Specialized Clinical Image Measurements (Cobb Angle)',
      'Priority Phone & Clinical Support',
      'Custom Header & Clinic Letterhead Presets',
    ],
    excluded: [],
  },
  {
    code: 'enterprise',
    name: 'Enterprise / Hospital Network',
    tagline: 'Custom deployments for multi-center hospital networks and large rehabilitation institutions.',
    monthlyNaira: 0,
    annualNaira: 0,
    monthlyCents: 0,
    annualCents: 0,
    seats: 999,
    storage: 'Unlimited',
    popular: false,
    trialDays: 14,
    features: [
      'Unlimited Clinical Practitioner Seats',
      'Multi-Location Centralized Governance',
      'Custom Role Permissions & SLAs',
      'Dedicated Account Manager & Concierge Migration',
      'Custom Integrations & Advanced Reporting',
    ],
    excluded: [],
  },
];
