// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — SEO METADATA FOUNDATION
// File: src/public/data/seo.ts
// ==============================================================================

export interface RouteMetadata {
  title: string;
  description: string;
  canonical: string;
  keywords?: string[];
}

export const ROUTE_METADATA: Record<string, RouteMetadata> = {
  '/': {
    title: 'Physenra | Physiotherapy EMR & Practice Management Platform',
    description:
      'The clinical EMR and practice operating system purpose-built for physiotherapy clinics. Musculoskeletal SOAP charting, built-in DICOM PACS, and automated package billing. Start 14-day free trial.',
    canonical: 'https://physenra.com/',
    keywords: [
      'physiotherapy EMR',
      'physiotherapy practice management software',
      'physical therapy clinic software',
      'physiotherapy SOAP notes',
    ],
  },
  '/features': {
    title: 'Features | Complete Physiotherapy Practice OS | Physenra',
    description:
      'Explore specialized physiotherapy features: clinical SOAP notes, built-in DICOM medical imaging, session packages, patient wallets, and Paystack invoicing.',
    canonical: 'https://physenra.com/features',
  },
  '/pricing': {
    title: 'Transparent Pricing | Physiotherapy Practice Software | Physenra',
    description:
      'Simple, flat subscription pricing for physiotherapy practices starting at ₦15,000/month. 14-day full free trial. No credit card required.',
    canonical: 'https://physenra.com/pricing',
  },
  '/security': {
    title: 'Security & Privacy Architecture | Physenra',
    description:
      'Learn how Physenra safeguards patient records with PostgreSQL Row-Level Security, an architectural Platform Admin Privacy Firewall, and guaranteed read-only data retention.',
    canonical: 'https://physenra.com/security',
  },
  '/about': {
    title: 'About Physenra | Dedicated Physiotherapy Platform',
    description:
      'Physenra is dedicated to elevating physical therapy practices with purpose-built clinical and operational software tools.',
    canonical: 'https://physenra.com/about',
  },
  '/contact': {
    title: 'Contact & Support | Physenra',
    description:
      'Reach the Physenra team for guided onboarding consultations, practice migration assistance, or platform inquiries.',
    canonical: 'https://physenra.com/contact',
  },
  '/faq': {
    title: 'Frequently Asked Questions | Physenra',
    description:
      'Find clear answers to common questions about onboarding, clinical charting, DICOM imaging, and billing in Physenra.',
    canonical: 'https://physenra.com/faq',
  },
  '/terms': {
    title: 'Terms of Service | Physenra',
    description: 'Commercial terms of service governing use of the Physenra clinical and practice management platform.',
    canonical: 'https://physenra.com/terms',
  },
  '/privacy': {
    title: 'Privacy Policy | Physenra',
    description:
      'Data privacy commitment and policies governing administrative and clinical data within the Physenra platform.',
    canonical: 'https://physenra.com/privacy',
  },
};
