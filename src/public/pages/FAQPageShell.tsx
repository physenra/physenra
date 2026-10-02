// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — FAQ PAGE SHELL
// File: src/public/pages/FAQPageShell.tsx
// Route: /faq
// ==============================================================================

import React from 'react';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { SectionHeading } from '../components/SectionHeading';
import { FAQAccordion, FAQItem } from '../components/FAQAccordion';
import { PrimaryCTAButton } from '../components/PrimaryCTAButton';

const CATEGORIZED_FAQS: { category: string; items: FAQItem[] }[] = [
  {
    category: 'Trial & Onboarding',
    items: [
      {
        question: 'Do I need to enter credit card details to start a trial?',
        answer:
          'No. Physenra provides a 14-day free trial on all plans with no payment card required. You can set up your practice workspace in under two minutes.',
      },
      {
        question: 'How quickly can my clinic start charting patient visits?',
        answer:
          'Instantly. Once your practice owner account is created, you can immediately add practitioner colleagues, set up treatment bays, and begin clinical charting.',
      },
      {
        question: 'Can I import existing patient records?',
        answer:
          'Yes. Physenra provides standard CSV patient demographic import templates to help practices transition smoothly from spreadsheets or legacy software.',
      },
    ],
  },
  {
    category: 'Clinical Features & DICOM Imaging',
    items: [
      {
        question: 'What functional outcome measures are built into the EMR?',
        answer:
          'Physenra includes automated scoring and percentage impairment calculations for Visual Analogue Scale (VAS), Neck Disability Index (NDI), Oswestry Disability Index (ODI), Lower Extremity Functional Scale (LEFS), and QuickDASH.',
      },
      {
        question: 'How does the built-in DICOM PACS viewer work?',
        answer:
          'Physenra features a zero-footprint browser Web PACS viewer powered by CornerstoneJS. Clinicians can upload MRI, CT, and X-ray studies directly into a patient episode, adjust window levels, and measure Cobb angles inside the browser.',
      },
      {
        question: 'Can I create customized exercise prescriptions (HEP)?',
        answer:
          'Yes. Clinicians can document exercise protocols with sets, reps, hold times, and clinical notes, and generate printable instructions for patients.',
      },
    ],
  },
  {
    category: 'Commercial Billing & Treatment Packages',
    items: [
      {
        question: 'How do pre-paid treatment packages work?',
        answer:
          'You can configure custom multi-session therapy packages (e.g., 6, 10, or 12 sessions). Remaining session balances automatically decrement upon visit completion.',
      },
      {
        question: 'What are patient deposit wallets?',
        answer:
          'Patient deposit wallets allow clinics to record advance payments and maintain an immutable credit ledger. At checkout, receptionists can settle invoices directly from wallet credit or execute split payments.',
      },
      {
        question: 'How are online card payments processed?',
        answer:
          'Physenra integrates with Paystack for seamless card and bank payments with instant cryptographic server-side verification and automated receipts.',
      },
    ],
  },
  {
    category: 'Security, Privacy & Data Retention',
    items: [
      {
        question: 'What happens to my clinical records if my subscription lapses?',
        answer:
          'Physenra guarantees non-punitive read-only data retention. If your subscription ever lapses, your clinical notes and patient histories remain accessible in read-only mode forever.',
      },
      {
        question: 'Can Physenra staff or administrators see our patient notes?',
        answer:
          'No. Our platform enforces an architectural Platform Admin Privacy Firewall. PostgreSQL Row-Level Security policies strictly bar SaaS system administrators from accessing patient clinical PHI.',
      },
    ],
  },
];

export const FAQPageShell: React.FC = () => {
  return (
    <MarketingLayout
      title="Frequently Asked Questions | Physenra"
      description="Find answers to common questions about onboarding, clinical charting, DICOM imaging, and billing in Physenra."
    >
      <div className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Help & Answers"
            title="Frequently Asked Questions"
            subtitle="Everything you need to know about setting up your practice, clinical charting, and subscription billing."
          />
        </div>
      </div>

      <div className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-12">
          {CATEGORIZED_FAQS.map((cat, i) => (
            <div key={i} className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                {cat.category}
              </h2>
              <FAQAccordion items={cat.items} />
            </div>
          ))}

          <div className="pt-8 border-t border-slate-200 text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Ready to See Physenra in Action?
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Start your 14-day free trial today with full feature access and zero financial commitment.
            </p>
            <PrimaryCTAButton size="lg" to="/register-practice">
              Start 14-Day Free Trial
            </PrimaryCTAButton>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
};
