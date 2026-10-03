// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — PRIVACY POLICY SHELL
// File: src/public/pages/PrivacyPageShell.tsx
// Route: /privacy
// ==============================================================================

import React from 'react';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { Lock, ShieldCheck } from 'lucide-react';
import { PrimaryCTAButton } from '../components/PrimaryCTAButton';

export const PrivacyPageShell: React.FC = () => {
  return (
    <MarketingLayout
      title="Privacy Policy & Healthcare Data Commitment | Physenra"
      description="Healthcare data privacy commitment and protection policies of the Physenra platform."
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 mb-4">
          <Lock className="w-3.5 h-3.5" />
          Data Sovereignty
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Healthcare Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Effective Date: Pre-Launch Architecture Baseline
        </p>

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Data Privacy & PHI Governance
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Privacy Policy content will be published here before public launch.
              </p>
              <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                Physenra is architected with strict PostgreSQL Row-Level Security (RLS) and an architectural Platform Admin Privacy Firewall. System operators are barred by database access policies from reading patient clinical notes, diagnoses, or imaging studies.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            For specific privacy inquiries, contact our data protection team.
          </span>
          <PrimaryCTAButton size="sm" to="/register-practice">
            Start Free Trial
          </PrimaryCTAButton>
        </div>
      </div>
    </MarketingLayout>
  );
};
