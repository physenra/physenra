// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — CONTACT & CONSULTATION SHELL
// File: src/public/pages/ContactPageShell.tsx
// Route: /contact
// ==============================================================================

import React, { useState } from 'react';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { SectionHeading } from '../components/SectionHeading';
import { PrimaryCTAButton } from '../components/PrimaryCTAButton';
import { MessageSquare, Building2, CheckCircle2 } from 'lucide-react';

export const ContactPageShell: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <MarketingLayout
      title="Contact Support & Practice Consultation | Physenra"
      description="Connect with the Physenra team for guided practice onboarding, enterprise inquiries, and clinical software consultations."
    >
      <div className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Practice Inquiries & Support"
            title="We Are Here to Support Your Practice"
            subtitle="Request a guided clinical walkthrough, ask technical onboarding questions, or inquire about enterprise practice migrations."
          />
        </div>
      </div>

      <div className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">
            {/* Consultation Intake Form */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-slate-50/50 p-6 sm:p-8">
              {submitted ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Inquiry Received</h3>
                  <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                    Thank you for reaching out. A Physenra clinical practice advisor will review your message and respond shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Dr. K. Okonjo, PT"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Practice Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Apex Motion Physiotherapy"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="clinic@apexmotion.com"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Number of Practitioners
                      </label>
                      <select className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                        <option>1 (Solo Practice)</option>
                        <option>2 - 5 (Professional Clinic)</option>
                        <option>6 - 10 (Comprehensive Clinic)</option>
                        <option>10+ (Enterprise / Multi-Branch)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Message / Inquiry Details
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Tell us about your clinic setup, current charting workflow, or specific questions..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-lg bg-teal-700 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                  >
                    Submit Practice Inquiry
                  </button>
                </form>
              )}
            </div>

            {/* Direct Support Information */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-xl border border-slate-200 bg-white">
                <Building2 className="w-6 h-6 text-teal-700 mb-2" />
                <h3 className="text-base font-bold text-slate-900">Direct Self-Service Trial</h3>
                <p className="mt-1 text-sm text-slate-600">
                  You do not need to wait for a demo to evaluate Physenra. Create your practice in 2 minutes and start testing with full feature access immediately.
                </p>
                <div className="mt-4">
                  <PrimaryCTAButton size="sm" to="/register-practice">
                    Start 14-Day Free Trial
                  </PrimaryCTAButton>
                </div>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 bg-white">
                <MessageSquare className="w-6 h-6 text-teal-700 mb-2" />
                <h3 className="text-base font-bold text-slate-900">Practice Onboarding Consultation</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Migrating from paper charts or Excel? Our onboarding specialists can assist with clinical workflow setup and staff orientation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
};
