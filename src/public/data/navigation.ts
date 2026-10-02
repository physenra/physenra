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
    description: 'Automated session decrementing and patient credit ledgers.',
  },
  {
    label: 'Invoicing & Local Billing',
    href: '/features/billing',
    description: 'Paystack payments, automated tax invoices, and official receipts.',
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
      { label: 'Overview', href: '/features' },
      { label: 'Physiotherapy EMR', href: '/features/physiotherapy-emr' },
      { label: 'DICOM Medical Imaging', href: '/features/medical-imaging' },
      { label: 'Treatment Packages', href: '/features/treatment-packages' },
      { label: 'Invoicing & Billing', href: '/features/billing' },
      { label: 'Transparent Pricing', href: '/pricing' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Frequently Asked Questions', href: '/faq' },
      { label: 'Clinical Documentation', href: '/features/clinical-documentation' },
      { label: 'Practice Management', href: '/features/practice-management' },
      { label: 'Treatment Plans & Protocols', href: '/features/treatment-plans' },
    ],
  },
  {
    title: 'Company',
    items: [
      { label: 'About Physenra', href: '/about' },
      { label: 'Security & Privacy', href: '/security' },
      { label: 'Contact & Support', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
    ],
  },
  {
    title: 'Application',
    items: [
      { label: 'Practitioner Log In', href: '/login' },
      { label: 'Start 14-Day Free Trial', href: '/register-practice' },
    ],
  },
];
