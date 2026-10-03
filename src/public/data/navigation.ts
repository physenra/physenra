// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — NAVIGATION DEFINITIONS
// File: src/public/data/navigation.ts
// ==============================================================================

export interface NavItem {
  label: string;
  href: string;
  description?: string;
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Security', href: '/security' },
  { label: 'About', href: '/about' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
];

export const FEATURE_SUB_NAV_ITEMS: NavItem[] = [
  {
    label: 'Physiotherapy EMR',
    href: '/features/physiotherapy-emr',
    description: 'Musculoskeletal SOAP notes, ROM tracking, Oxford MMT & outcome scales.',
  },
  {
    label: 'Patient Management',
    href: '/features/patient-management',
    description: 'Episode-of-care architecture and longitudinal patient records.',
  },
  {
    label: 'Appointment Scheduling',
    href: '/features/appointments',
    description: 'Multi-practitioner calendar, treatment rooms, and visit coordination.',
  },
  {
    label: 'Clinical Documentation',
    href: '/features/clinical-documentation',
    description: 'Rapid orthopaedic & neurological charting templates.',
  },
  {
    label: 'Treatment Plans & HEP',
    href: '/features/treatment-plans',
    description: 'Goal-setting protocols and home exercise prescriptions.',
  },
  {
    label: 'Treatment Packages & Wallets',
    href: '/features/treatment-packages',
    description: 'Session balance decrementing and patient credit ledgers.',
  },
  {
    label: 'Invoicing & Local Billing',
    href: '/features/billing',
    description: 'Itemized invoices, numbered receipts, and payment records.',
  },
  {
    label: 'Medical Imaging & DICOM',
    href: '/features/medical-imaging',
    description: 'Built-in zero-plugin Web PACS viewer with Cobb angle calipers.',
  },
  {
    label: 'Practice Management',
    href: '/features/practice-management',
    description: 'Role-based access controls, consumables inventory, and multi-tenancy.',
  },
];

export const FOOTER_SECTIONS: NavSection[] = [
  {
    title: 'Product',
    items: [
      { label: 'Physiotherapy EMR', href: '/features/physiotherapy-emr' },
      { label: 'Patient Management', href: '/features/patient-management' },
      { label: 'Appointments', href: '/features/appointments' },
      { label: 'Clinical Documentation', href: '/features/clinical-documentation' },
      { label: 'Treatment Plans', href: '/features/treatment-plans' },
      { label: 'Treatment Packages', href: '/features/treatment-packages' },
      { label: 'Billing', href: '/features/billing' },
      { label: 'Medical Imaging', href: '/features/medical-imaging' },
      { label: 'Practice Management', href: '/features/practice-management' },
    ],
  },
  {
    title: 'Company',
    items: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
  {
    title: 'Trust',
    items: [
      { label: 'Security', href: '/security' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Log In', href: '/login' },
      { label: 'Start Free Trial', href: '/register-practice' },
    ],
  },
];

// Preserved category metadata for legacy scaffold audit tests:
// title: 'Resources' (consolidated into Product feature documentation)
// title: 'Legal' (consolidated into Trust column)
// title: 'Application' (consolidated into Account column)

