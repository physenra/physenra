// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — FAQ PAGE (PHASE 1C COMPLETE CATEGORIZED ARCHITECTURE)
// File: src/public/pages/FAQPageShell.tsx
// Route: /faq
// ==============================================================================

import React from 'react';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { SectionHeading } from '../components/SectionHeading';
import { FAQAccordion, FAQItem } from '../components/FAQAccordion';
import { PrimaryCTAButton } from '../components/PrimaryCTAButton';
import { SecondaryCTAButton } from '../components/SecondaryCTAButton';

interface FAQCategory {
  category: string;
  items: FAQItem[];
}

const CATEGORIZED_FAQS: FAQCategory[] = [
  {
    category: 'Getting Started',
    items: [
      {
        question: 'Do I need to enter payment card details to start a trial?',
        answer:
          'No. Physenra provides a 14-day free evaluation trial on all plans with no credit card required. You can set up your practice workspace self-service.',
      },
      {
        question: 'How quickly can our clinic begin charting patient visits?',
        answer:
          'Immediately. Once your practice owner account is created, you can immediately add clinical practitioners, configure treatment bays, and begin charting musculoskeletal encounters.',
      },
      {
        question: 'Can we import our existing patient directory?',
        answer:
          'Yes. Physenra supports standard CSV patient demographic imports so practices can transition smoothly from spreadsheets or legacy clinical records.',
      },
      {
        question: 'Can administrative receptionists use the platform for free?',
        answer:
          'Yes. Only clinical practitioners (Physiotherapists and Practice Owners who chart encounters) require practitioner seats. Receptionists, front-desk assistants, and accountants are free and unlimited on all plans.',
      },
    ],
  },
  {
    category: 'Clinical Documentation',
    items: [
      {
        question: 'How does structured physiotherapy SOAP documentation work?',
        answer:
          'Physenra enforces structured musculoskeletal fields: Subjective intake with 24-hour symptom cycle, Objective bilateral joint Range of Motion (ROM) in degrees, Oxford scale Manual Muscle Testing (MMT 0-5), orthopaedic special tests, and digital sign-off locks.',
      },
      {
        question: 'Which functional outcome measures are built into encounters?',
        answer:
          'Physenra includes standardized functional outcome scoring batteries for Visual Analogue Scale (VAS), Neck Disability Index (NDI), Oswestry Disability Index (ODI), Lower Extremity Functional Scale (LEFS), and QuickDASH, tracking quantitative recovery across patient episodes.',
      },
      {
        question: 'Can I prescribe home exercise programmes (HEP)?',
        answer:
          'Yes. Clinicians can prescribe customized home exercise regimens with sets, reps, hold times, and clinical technique notes, and generate clean printable instruction handouts for patients.',
      },
      {
        question: 'Are clinical notes locked after practitioner sign-off?',
        answer:
          'Yes. Completed clinical encounters receive a digital signature with timestamp and practitioner identifier, locking the note against unauthorized retrospective changes.',
      },
    ],
  },
  {
    category: 'Practice Management',
    items: [
      {
        question: 'How does multi-practitioner scheduling work?',
        answer:
          'Physenra features a multi-column calendar displaying side-by-side timetables for all clinic practitioners, with physical treatment bay and room allocation to prevent double-bookings.',
      },
      {
        question: 'Can booked appointments be converted directly into clinical visits?',
        answer:
          'Yes. With one click from the calendar, front-desk staff or clinicians can convert an arrived appointment into an active clinical visit pre-populating patient and therapist details.',
      },
      {
        question: 'Does Physenra track clinic consumables and supplies?',
        answer:
          'Yes. The practice management module includes inventory tracking for physical consumables like strapping tape, dry needles, and electrodes across treatment rooms.',
      },
    ],
  },
  {
    category: 'Billing & Payments',
    items: [
      {
        question: 'How do multi-session treatment packages work?',
        answer:
          'Clinics can configure prepaid treatment bundles (e.g. 6, 10, or 12 sessions). When a therapist signs off on an encounter, the remaining session balance automatically decrements by 1 with an immutable transaction log.',
      },
      {
        question: 'What are patient deposit wallets?',
        answer:
          'Patient deposit wallets allow clinics to record advance payments and maintain an immutable credit ledger. Front-desk staff can settle visit invoices directly from wallet credit or execute split billing (wallet + card).',
      },
      {
        question: 'Which payment methods are supported for practice subscriptions via Paystack?',
        answer:
          'Practice subscriptions to Physenra are processed securely through Paystack, supporting Nigerian debit and credit cards (Mastercard, Visa, Verve), direct bank transfers, and USSD with zero foreign exchange fees and server-verified activation.',
      },
      {
        question: 'Can we print official tax receipts for patient insurance claims?',
        answer:
          'Yes. Physenra generates professional PDF tax invoices and official numbered receipts (#RCT-XXXXX) formatted with clinic letterhead for employer and insurance reimbursement.',
      },
    ],
  },
  {
    category: 'Medical Imaging',
    items: [
      {
        question: 'How does the built-in Web DICOM PACS viewer work?',
        answer:
          'Physenra incorporates a browser-based diagnostic radiology viewer. Clinicians can upload standard DICOM studies (MRI, CT, X-ray) directly into an episode of care, adjust window levels, and inspect multi-slice series without desktop software or plugins.',
      },
      {
        question: 'Can therapists measure Cobb angles in the browser?',
        answer:
          'Yes. The Web PACS includes orthopaedic measuring calipers, allowing clinicians to measure spinal Cobb angles and anatomical distances directly in the patient encounter.',
      },
      {
        question: 'Is imaging storage linked to patient episodes of care?',
        answer:
          'Yes. Every uploaded study is linked to the relevant patient episode, keeping imaging immediately accessible during follow-up reviews and progress assessments.',
      },
    ],
  },
  {
    category: 'Security',
    items: [
      {
        question: 'How is patient medical data isolated between different practices?',
        answer:
          'Physenra uses PostgreSQL Row-Level Security (RLS) to enforce strict multi-tenant mathematical isolation. Practices can only query and view records belonging to their own workspace.',
      },
      {
        question: 'Can SaaS administrators or platform operators view clinical notes?',
        answer:
          'No. Our platform enforces an architectural Platform Admin Privacy Firewall. System operators manage subscription tiers and billing status but are barred by database policies from inspecting patient clinical PHI.',
      },
      {
        question: 'Does the system record audit logs of privileged actions?',
        answer:
          'Yes. Sensitive administrative, financial, and clinical sign-off actions generate append-only immutable audit records with timestamps and actor identifiers.',
      },
    ],
  },
  {
    category: 'Subscription',
    items: [
      {
        question: 'What happens to our clinical records if our subscription expires?',
        answer:
          'Physenra implements non-punitive read-only data retention. If your subscription ever lapses, your clinical notes, patient histories, and historical invoices remain accessible in read-only mode so you never lose patient history.',
      },
      {
        question: 'What are the authoritative subscription tiers and seat limits?',
        answer:
          'Physenra offers three transparent self-service tiers: Solo Practice at ₦15,000/month (₦150,000/year) with 1 practitioner seat, Professional Clinic at ₦30,000/month (₦300,000/year) with up to 5 seats, and Comprehensive Clinic at ₦50,000/month (₦500,000/year) with up to 10 seats. Enterprise networks receive custom capacity.',
      },
      {
        question: 'Can we upgrade or downgrade our subscription plan at any time?',
        answer:
          'Yes. Practice owners can adjust subscription tiers from the billing console. Upgrades generate an invoice for the difference or new tier, while downgrades take effect at the conclusion of the active billing period.',
      },
    ],
  },
];

export const FAQPageShell: React.FC = () => {
  return (
    <MarketingLayout
      title="Frequently Asked Questions | Physenra"
      description="Find clear answers to common questions about onboarding, clinical charting, DICOM imaging, and billing in Physenra."
    >
      <div className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <SectionHeading
            kicker="Help & Answers"
            title="Frequently Asked Questions"
            subtitle="Everything you need to know about setting up your practice, clinical charting, treatment packages, and subscription billing."
            align="left"
          />
        </div>
      </div>

      <div className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-16">
          {CATEGORIZED_FAQS.map((cat, i) => (
            <div key={i} className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 pb-2 border-b border-slate-200">
                {cat.category}
              </h2>
              <FAQAccordion items={cat.items} />
            </div>
          ))}

          {/* Bottom Conversion Callout */}
          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-4">
            <h3 className="text-xl font-bold text-slate-900">
              Have Further Practice or Clinical Questions?
            </h3>
            <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
              Our clinical and technical team is available to discuss your practice's specific workflow requirements and data migration needs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <PrimaryCTAButton size="md" to="/register-practice">
                Start 14-Day Free Trial
              </PrimaryCTAButton>
              <SecondaryCTAButton size="md" to="/contact">
                Contact Practice Advisors
              </SecondaryCTAButton>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
};
