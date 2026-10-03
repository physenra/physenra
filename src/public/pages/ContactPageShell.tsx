// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — CONTACT & CONSULTATION SHELL
// File: src/public/pages/ContactPageShell.tsx
// Route: /contact
// ==============================================================================

import React, { useState } from 'react';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { SectionHeading } from '../components/SectionHeading';
import { PrimaryCTAButton } from '../components/PrimaryCTAButton';
import { SecondaryCTAButton } from '../components/SecondaryCTAButton';
import { MessageSquare, Building2, Mail, ExternalLink, ArrowRight } from 'lucide-react';

export const ContactPageShell: React.FC = () => {
  const [name, setName] = useState('');
  const [practiceName, setPracticeName] = useState('');
  const [email, setEmail] = useState('');
  const [practitioners, setPractitioners] = useState('1 (Solo Practice)');
  const [message, setMessage] = useState('');
  const [dispatched, setDispatched] = useState(false);

  const constructMailtoUri = () => {
    const subject = `Physenra Practice Inquiry: ${practiceName.trim() || 'New Clinic'}`;
    const body = `Name: ${name.trim()}
Practice Name: ${practiceName.trim()}
Work Email: ${email.trim()}
Practitioners: ${practitioners}

Inquiry Details:
${message.trim()}
`;
    return `mailto:contact@physenra.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailto = constructMailtoUri();
    if (typeof window !== 'undefined') {
      window.location.href = mailto;
    }
    setDispatched(true);
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
              <div className="mb-6 pb-4 border-b border-slate-200/80">
                <span className="text-xs font-semibold text-teal-800 uppercase tracking-wider">
                  Direct Inquiries Dispatch
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  Submitting this form prepares a pre-formatted inquiry dispatched directly to our practice advisory team at{' '}
                  <a href="mailto:contact@physenra.com" className="text-teal-700 font-semibold underline">
                    contact@physenra.com
                  </a>.
                </p>
              </div>

              {dispatched ? (
                <div className="py-10 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto shadow-subtle">
                    <Mail className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Email Dispatch Initiated</h3>
                  <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    Your email client has been opened with your inquiry pre-populated for{' '}
                    <strong className="text-slate-900 font-semibold">contact@physenra.com</strong>.
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    If your email client did not launch automatically, please send your email directly using the button below.
                  </p>
                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href={constructMailtoUri()}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-sm transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in Email App</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setDispatched(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                    >
                      Edit Inquiry Details
                    </button>
                  </div>
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
                        value={name}
                        onChange={(e) => setName(e.target.value)}
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
                        value={practiceName}
                        onChange={(e) => setPracticeName(e.target.value)}
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="clinic@apexmotion.com"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Number of Practitioners
                      </label>
                      <select
                        value={practitioners}
                        onChange={(e) => setPractitioners(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
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
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us about your clinic setup, current charting workflow, or specific questions..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-lg bg-teal-700 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 flex items-center justify-center gap-2"
                  >
                    <span>Send Message via Email Client</span>
                    <ArrowRight className="w-4 h-4" />
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
                  You do not need to wait for a demo to evaluate Physenra. Create your practice self-service and start testing with full feature access immediately.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <PrimaryCTAButton size="sm" to="/register-practice">
                    Start 14-Day Free Trial
                  </PrimaryCTAButton>
                  <SecondaryCTAButton size="sm" to="/login">
                    Log In
                  </SecondaryCTAButton>
                </div>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 bg-white">
                <MessageSquare className="w-6 h-6 text-teal-700 mb-2" />
                <h3 className="text-base font-bold text-slate-900">Direct Team Dispatch</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Prefer direct correspondence? Email our practice advisory and technical support desk directly:
                </p>
                <div className="mt-3">
                  <a
                    href="mailto:contact@physenra.com"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800 hover:underline"
                  >
                    <Mail className="w-4 h-4" />
                    <span>contact@physenra.com</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
};
