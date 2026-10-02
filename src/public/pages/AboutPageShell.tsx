// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — ABOUT PAGE SHELL
// File: src/public/pages/AboutPageShell.tsx
// Route: /about
// ==============================================================================

import React from 'react';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { SectionHeading } from '../components/SectionHeading';
import { PrimaryCTAButton } from '../components/PrimaryCTAButton';
import { HeartPulse, ShieldCheck } from 'lucide-react';

export const AboutPageShell: React.FC = () => {
  return (
    <MarketingLayout
      title="About Physenra | Purpose-Built Physiotherapy Technology"
      description="Learn why Physenra was founded to modernize physical therapy practices with clinical diagnostic precision and sustainable commercial tools."
    >
      <div className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Our Mission"
            title="Elevating Physical Rehabilitation Through Specialized Technology"
            subtitle="Generic hospital software treats physical therapy as an afterthought. We built Physenra exclusively for how physiotherapists evaluate, treat, and bill."
          />
        </div>
      </div>

      <div className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-12">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              The Physenra Story
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Modern physiotherapy clinics face a persistent operational dilemma: choose between cumbersome, multi-specialty hospital EMRs that lack musculoskeletal assessments, or cobble together generic calendar apps, WhatsApp chats, and paper tally books.
            </p>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              Physenra was engineered to eliminate this compromise. By integrating specialized musculoskeletal clinical examinations, validated functional outcome measures, built-in DICOM PACS medical imaging, and automated multi-session package tracking, Physenra gives physiotherapy practices the dedicated digital operating system they deserve.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50">
              <HeartPulse className="w-8 h-8 text-teal-700 mb-3" />
              <h3 className="text-lg font-bold text-slate-900">Clinical Specialization</h3>
              <p className="mt-2 text-sm text-slate-600">
                Built from the ground up for musculoskeletal, neurological, and sports physical therapy.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50">
              <ShieldCheck className="w-8 h-8 text-teal-700 mb-3" />
              <h3 className="text-lg font-bold text-slate-900">Total Tenancy Sovereignty</h3>
              <p className="mt-2 text-sm text-slate-600">
                Guaranteed patient data isolation, architectural admin firewalls, and permanent read-only record retention.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 text-center">
            <PrimaryCTAButton size="lg" to="/register-practice">
              Start 14-Day Free Practice Trial
            </PrimaryCTAButton>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
};
