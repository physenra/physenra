// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — TERMS OF SERVICE SHELL
// File: src/public/pages/TermsPageShell.tsx
// Route: /terms
// ==============================================================================

import React from 'react';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { FileText, Shield } from 'lucide-react';
import { PrimaryCTAButton } from '../components/PrimaryCTAButton';

export const TermsPageShell: React.FC = () => {
  return (
    <MarketingLayout
      title="Terms of Service | Physenra"
      description="Commercial terms of service governing the Physenra clinical EMR and practice operating system."
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 mb-4">
          <FileText className="w-3.5 h-3.5" />
          Legal & Governance
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Effective Date: Pre-Launch Architecture Baseline
        </p>

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-teal-700 shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Commercial Service Agreement
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Terms of Service content will be published here before public launch. Formal Terms of Service content is pending legal review and publication.
              </p>
              <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                The authoritative terms will outline practice tenant responsibilities, multi-user seat subscriptions, billing cycles, data sovereignty commitments, and service availability.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Questions regarding terms? Contact our legal governance team.
          </span>
          <PrimaryCTAButton size="sm" to="/register-practice">
            Start Free Trial
          </PrimaryCTAButton>
        </div>
      </div>
    </MarketingLayout>
  );
};
