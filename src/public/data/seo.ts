// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — SEO & OPEN GRAPH METADATA FOUNDATION
// File: src/public/data/seo.ts
// ==============================================================================

export interface RouteMetadata {
  title: string;
  description: string;
  canonical: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
}

const DEFAULT_OG_IMAGE = 'https://physenra.com/images/og-physenra-platform.png';

export const ROUTE_METADATA: Record<string, RouteMetadata> = {
  '/': {
    title: 'Physenra | Physiotherapy EMR & Practice Management Platform',
    description:
      'The clinical EMR and practice management platform purpose-built for physiotherapy clinics. Musculoskeletal SOAP charting, built-in DICOM PACS, and treatment package tracking. Start 14-day free trial.',
    canonical: 'https://physenra.com/',
    keywords: [
      'physiotherapy EMR',
      'physiotherapy practice management software',
      'physical therapy clinic software',
      'physiotherapy SOAP notes',
      'physiotherapy software Nigeria',
      'musculoskeletal EMR',
    ],
    ogTitle: 'Physenra | Physiotherapy EMR & Practice Management Platform',
    ogDescription:
      'Purpose-built physiotherapy practice management software. Musculoskeletal SOAP charting, built-in DICOM PACS, and multi-session package billing.',
    ogUrl: 'https://physenra.com/',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  },
  '/features': {
    title: 'Platform Features | Physenra Physiotherapy Practice OS',
    description:
      'Explore the complete suite of specialized physiotherapy software modules: clinical EMR, DICOM imaging, session packages, patient wallets, and Paystack billing.',
    canonical: 'https://physenra.com/features',
    keywords: [
      'physiotherapy software features',
      'clinic management tools',
      'physiotherapy EMR modules',
      'rehab practice software',
    ],
    ogTitle: 'Platform Features | Physenra Physiotherapy Practice OS',
    ogDescription:
      'Explore clinical EMR charting, browser DICOM PACS, session packages, and multi-therapist scheduling engineered for physiotherapy.',
    ogUrl: 'https://physenra.com/features',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  },
  '/features/physiotherapy-emr': {
    title: 'Physiotherapy EMR & SOAP Notes | Physenra',
    description:
      'Specialized musculoskeletal charting: active and passive Range of Motion (ROM), Oxford Manual Muscle Testing (MMT), and standardized functional outcome scores.',
    canonical: 'https://physenra.com/features/physiotherapy-emr',
    keywords: [
      'physiotherapy SOAP notes',
      'musculoskeletal EMR',
      'ROM charting software',
      'Oxford muscle testing',
      'physiotherapy assessment forms',
    ],
    ogTitle: 'Physiotherapy EMR & Musculoskeletal SOAP Charting | Physenra',
    ogDescription:
      'Document joint range of motion, muscle strength, and functional outcome measures in an evidence-based clinical EMR.',
    ogUrl: 'https://physenra.com/features/physiotherapy-emr',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  },
  '/features/patient-management': {
    title: 'Patient Management & Episodes of Care | Physenra',
    description:
      'Structure patient records into distinct longitudinal episodes of care. Track attendances, medical alerts, contraindications, and treatment history seamlessly.',
    canonical: 'https://physenra.com/features/patient-management',
    keywords: [
      'physiotherapy patient directory',
      'episodes of care software',
      'physical therapy patient records',
      'rehab patient management',
    ],
    ogTitle: 'Patient Management & Care Episodes | Physenra',
    ogDescription:
      'Organize physiotherapy records around distinct clinical episodes of care with longitudinal tracking.',
    ogUrl: 'https://physenra.com/features/patient-management',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  },
  '/features/appointments': {
    title: 'Multi-Practitioner Scheduling & Bay Management | Physenra',
    description:
      'Color-coded clinic scheduling for multiple therapists. Allocate treatment bays, prevent double-bookings, and convert appointments to clinical visits in one click.',
    canonical: 'https://physenra.com/features/appointments',
    keywords: [
      'physiotherapy scheduling software',
      'multi therapist calendar',
      'treatment bay scheduling',
      'clinic appointment calendar',
    ],
    ogTitle: 'Multi-Practitioner Scheduling & Calendar | Physenra',
    ogDescription:
      'Side-by-side therapist calendars, treatment bay allocation, and seamless appointment-to-visit conversion.',
    ogUrl: 'https://physenra.com/features/appointments',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  },
  '/features/clinical-documentation': {
    title: 'Orthopaedic & Neurological Clinical Documentation | Physenra',
    description:
      'Standardized clinical documentation for physical therapists. Special orthopaedic tests, neurodynamic tests, and immutable clinical note sign-off.',
    canonical: 'https://physenra.com/features/clinical-documentation',
    keywords: [
      'orthopaedic clinical notes',
      'special orthopaedic tests',
      'physiotherapy clinical documentation',
      'digital sign-off EMR',
    ],
    ogTitle: 'Orthopaedic & Neurological Clinical Documentation | Physenra',
    ogDescription:
      'Evidence-based clinical charting with special orthopaedic tests and digital sign-off locks.',
    ogUrl: 'https://physenra.com/features/clinical-documentation',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  },
  '/features/treatment-plans': {
    title: 'Treatment Protocols & Home Exercise Prescription (HEP) | Physenra',
    description:
      'Build structured rehabilitation pathways with SMART functional goals and prescribe printable home exercise programmes with sets, reps, and hold times.',
    canonical: 'https://physenra.com/features/treatment-plans',
    keywords: [
      'physiotherapy treatment plans',
      'home exercise prescription',
      'HEP builder physiotherapy',
      'rehab protocol software',
    ],
    ogTitle: 'Treatment Protocols & Exercise Prescription (HEP) | Physenra',
    ogDescription:
      'Set measurable functional milestones and prescribe customized home exercise regimens.',
    ogUrl: 'https://physenra.com/features/treatment-plans',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  },
  '/features/treatment-packages': {
    title: 'Treatment Packages & Patient Deposit Wallets | Physenra',
    description:
      'Prepaid session bundles with atomic decrementing upon visit completion. Maintain immutable patient deposit wallets and eliminate lost visit revenue.',
    canonical: 'https://physenra.com/features/treatment-packages',
    keywords: [
      'treatment package management',
      'session bundles physiotherapy',
      'patient deposit wallet',
      'rehab session tracking',
    ],
    ogTitle: 'Treatment Packages & Patient Deposit Wallets | Physenra',
    ogDescription:
      'Atomic session decrementing on visit completion and advance deposit credit ledgers.',
    ogUrl: 'https://physenra.com/features/treatment-packages',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  },
  '/features/billing': {
    title: 'Physiotherapy Billing, Invoicing & Payments | Physenra',
    description:
      'Compliant private practice invoicing, official numbered receipts, and multi-channel payment recording for physiotherapy clinics.',
    canonical: 'https://physenra.com/features/billing',
    keywords: [
      'physiotherapy billing software',
      'clinic invoices',
      'practice payment recording',
      'physiotherapy receipts',
    ],
    ogTitle: 'Invoicing, Receipts & Payment Tracking | Physenra',
    ogDescription:
      'Itemized clinical invoices, printable proof-of-payment receipts, and multi-channel practice payment recording.',
    ogUrl: 'https://physenra.com/features/billing',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  },
  '/features/medical-imaging': {
    title: 'Built-in Web DICOM PACS & Cobb Angle Caliper | Physenra',
    description:
      'Review MRI, CT, and X-ray studies directly inside the patient record. Zero-footprint web viewer with window leveling presets and Cobb angle calipers.',
    canonical: 'https://physenra.com/features/medical-imaging',
    keywords: [
      'physiotherapy DICOM viewer',
      'web PACS physical therapy',
      'Cobb angle measurement software',
      'browser MRI viewer',
    ],
    ogTitle: 'Web DICOM PACS & Orthopaedic Measurement Viewer | Physenra',
    ogDescription:
      'Zero-footprint diagnostic radiology viewer inside the patient chart with Cobb angle calipers.',
    ogUrl: 'https://physenra.com/features/medical-imaging',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  },
  '/features/treatment-plans-hep': {
    title: 'Treatment Protocols & Home Exercise Prescription (HEP) | Physenra',
    description:
      'Build structured rehabilitation pathways with SMART functional goals and prescribe printable home exercise programmes with sets, reps, and hold times.',
    canonical: 'https://physenra.com/features/treatment-plans',
    keywords: [
      'physiotherapy treatment plans',
      'home exercise prescription',
      'HEP builder physiotherapy',
      'rehab protocol software',
    ],
    ogTitle: 'Treatment Protocols & Exercise Prescription (HEP) | Physenra',
    ogDescription:
      'Set measurable functional milestones and prescribe customized home exercise regimens.',
    ogUrl: 'https://physenra.com/features/treatment-plans',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  },
  '/features/pain-management': {
    title: 'Pain & Functional Outcome Tracking Built for Physiotherapy | Physenra',
    description:
      'Track 0-10 VAS pain ratings, 24-hour symptom behavior cycles, and validated functional outcome batteries (NDI, ODI, LEFS, QuickDASH).',
    canonical: 'https://physenra.com/features/pain-management',
    keywords: [
      'pain tracking physiotherapy',
      'VAS pain scale',
      'NDI outcome measure',
      'ODI physical therapy',
      'LEFS functional scale',
    ],
    ogTitle: 'Pain & Functional Outcome Tracking | Physenra',
    ogDescription:
      'Track pain behavior and validate recovery with standardized functional outcome batteries.',
    ogUrl: 'https://physenra.com/features/pain-management',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  },
  '/features/practice-management': {
    title: 'Practice Governance & Consumables Management | Physenra',
    description:
      'Role-based access control (RBAC), treatment room utilization, clinic consumables stock control, and immutable audit logs for practice compliance.',
    canonical: 'https://physenra.com/features/practice-management',
    keywords: [
      'physiotherapy practice management',
      'clinic room management',
      'physiotherapy stock control',
      'healthcare RBAC',
    ],
    ogTitle: 'Practice Governance & Consumables Control | Physenra',
    ogDescription:
      'Team permissions, treatment room allocation, clinic supplies tracking, and immutable audit logs.',
    ogUrl: 'https://physenra.com/features/practice-management',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  },
  '/pricing': {
    title: 'Transparent Pricing | Physiotherapy Practice Software | Physenra',
    description:
      'Predictable subscription pricing for physiotherapy practices starting at ₦15,000/month. 14-day free evaluation trial on all plans. No credit card required.',
    canonical: 'https://physenra.com/pricing',
    keywords: [
      'physiotherapy software pricing',
      'physiotherapy EMR cost',
      'clinic software subscription',
      'affordable rehab EMR',
    ],
    ogTitle: 'Transparent Pricing | Physiotherapy Practice Software | Physenra',
    ogDescription:
      'Flat subscription pricing for physiotherapy clinics starting at ₦15,000/month. 14-day free trial.',
    ogUrl: 'https://physenra.com/pricing',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  },
  '/security': {
    title: 'Security & Privacy Architecture | Physenra',
    description:
      'Learn how Physenra safeguards patient records with PostgreSQL Row-Level Security, an architectural Platform Admin Privacy Firewall, and non-punitive read-only data retention.',
    canonical: 'https://physenra.com/security',
    keywords: [
      'physiotherapy data security',
      'healthcare tenant isolation',
      'PostgreSQL RLS medical',
      'patient privacy architecture',
    ],
    ogTitle: 'Security & Healthcare Privacy Architecture | Physenra',
    ogDescription:
      'PostgreSQL Row-Level Security, Platform Admin Privacy Firewall, and non-punitive read-only retention.',
    ogUrl: 'https://physenra.com/security',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  },
  '/about': {
    title: 'About Physenra | Purpose-Built Physiotherapy Technology & Founder',
    description:
      'Learn how Physenra was founded by Dr Oladejo Korede, PT, MPH, DPT, to elevate physiotherapy practices with specialized clinical documentation and sustainable practice tools.',
    canonical: 'https://physenra.com/about',
    keywords: [
      'about Physenra',
      'physiotherapy technology mission',
      'Dr Oladejo Korede',
      'physiotherapy clinical software',
      'dedicated physical therapy software',
    ],
    ogTitle: "About Physenra | Built from a Physiotherapist's Perspective",
    ogDescription:
      'Learn how Physenra was founded by Dr Oladejo Korede, PT, MPH, DPT, to bridge clinical rehabilitation and modern practice operations.',
    ogUrl: 'https://physenra.com/about',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  },
  '/contact': {
    title: 'Contact Support & Practice Consultation | Physenra',
    description:
      'Connect with the Physenra team for guided practice onboarding, enterprise inquiries, and clinical software consultations.',
    canonical: 'https://physenra.com/contact',
    keywords: [
      'contact Physenra',
      'physiotherapy software support',
      'clinic onboarding consultation',
    ],
    ogTitle: 'Contact Support & Practice Consultation | Physenra',
    ogDescription:
      'Connect with the Physenra team for guided onboarding consultations and platform inquiries.',
    ogUrl: 'https://physenra.com/contact',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  },
  '/faq': {
    title: 'Frequently Asked Questions | Physenra',
    description:
      'Find clear answers to common questions about onboarding, clinical charting, DICOM imaging, and billing in Physenra.',
    canonical: 'https://physenra.com/faq',
    keywords: [
      'physiotherapy software FAQ',
      'Physenra help',
      'clinic EMR questions',
    ],
    ogTitle: 'Frequently Asked Questions | Physenra',
    ogDescription:
      'Clear answers to common questions about clinical charting, DICOM imaging, packages, and billing.',
    ogUrl: 'https://physenra.com/faq',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  },
  '/terms': {
    title: 'Terms of Service | Physenra',
    description:
      'Commercial terms of service governing use of the Physenra clinical and practice management platform.',
    canonical: 'https://physenra.com/terms',
    keywords: ['terms of service', 'physenra terms'],
    ogTitle: 'Terms of Service | Physenra',
    ogDescription: 'Commercial terms of service governing use of the Physenra platform.',
    ogUrl: 'https://physenra.com/terms',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary',
  },
  '/privacy': {
    title: 'Privacy Policy | Physenra',
    description:
      'Data privacy commitment and policies governing administrative and clinical data within the Physenra platform.',
    canonical: 'https://physenra.com/privacy',
    keywords: ['privacy policy', 'physenra privacy'],
    ogTitle: 'Privacy Policy | Physenra',
    ogDescription: 'Data privacy commitment and policies governing the Physenra platform.',
    ogUrl: 'https://physenra.com/privacy',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary',
  },
};
