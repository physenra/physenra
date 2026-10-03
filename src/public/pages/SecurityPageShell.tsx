// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — SECURITY & PRIVACY ARCHITECTURE SHELL
// File: src/public/pages/SecurityPageShell.tsx
// Route: /security
// ==============================================================================

import React from 'react';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { SectionHeading } from '../components/SectionHeading';
import { PrimaryCTAButton } from '../components/PrimaryCTAButton';
import { SecondaryCTAButton } from '../components/SecondaryCTAButton';
import { ShieldCheck, Lock, Database, FileCheck, CheckCircle2, Server } from 'lucide-react';

export const SecurityPageShell: React.FC = () => {
  return (
    <MarketingLayout
      title="Security & Healthcare Privacy Architecture | Physenra"
      description="Learn how Physenra safeguards patient records with PostgreSQL Row-Level Security, an architectural Platform Admin Privacy Firewall, and non-punitive read-only data retention."
    >
      <div className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Healthcare Data Sovereignty"
            title="Architected for Total Tenancy Isolation and Clinical Privacy"
            subtitle="Physenra enforces mathematical data segregation at the database engine level, ensuring patient records belong exclusively to your practice."
          />
        </div>
      </div>

      <div className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
            {/* Architecture Pillar 1 */}
            <div className="p-6 sm:p-8 rounded-xl border border-slate-200 bg-slate-50/50">
              <Database className="w-8 h-8 text-teal-700 mb-4" />
              <h2 className="text-xl font-bold text-slate-900">PostgreSQL Row-Level Security (RLS)</h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Every database table is protected by PostgreSQL Row-Level Security policies. Queries automatically scope to the authenticated user's practice tenant identifier, making cross-practice data leaks architecturally impossible.
              </p>
            </div>

            {/* Architecture Pillar 2 */}
            <div className="p-6 sm:p-8 rounded-xl border border-slate-200 bg-slate-50/50">
              <Lock className="w-8 h-8 text-teal-700 mb-4" />
              <h2 className="text-xl font-bold text-slate-900">Platform Admin Privacy Firewall</h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Global SaaS platform administrators can inspect subscription status, invoice dates, and seat limits, but are strictly barred by database access policies from querying patient medical charts, clinical SOAP notes, or imaging studies.
              </p>
            </div>

            {/* Architecture Pillar 3 */}
            <div className="p-6 sm:p-8 rounded-xl border border-slate-200 bg-slate-50/50">
              <Server className="w-8 h-8 text-teal-700 mb-4" />
              <h2 className="text-xl font-bold text-slate-900">Encryption in Transit & at Rest</h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                All communications are secured with TLS 1.3 in transit. Underlying database volumes and storage buckets use AES-256 encryption at rest.
              </p>
            </div>

            {/* Architecture Pillar 4 */}
            <div className="p-6 sm:p-8 rounded-xl border border-slate-200 bg-slate-50/50">
              <ShieldCheck className="w-8 h-8 text-teal-700 mb-4" />
              <h2 className="text-xl font-bold text-slate-900">Granular Role-Based Access Control</h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Practices assign granular roles (Practice Owner, Clinical Director, Senior Physiotherapist, Staff Physiotherapist, Receptionist). Staff view only the clinical and administrative functions necessary for their duties.
              </p>
            </div>

            {/* Architecture Pillar 5 */}
            <div className="p-6 sm:p-8 rounded-xl border border-slate-200 bg-slate-50/50">
              <FileCheck className="w-8 h-8 text-teal-700 mb-4" />
              <h2 className="text-xl font-bold text-slate-900">Immutable Audit Logging</h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Sensitive operational, clinical, and financial actions (wallet deposits, invoice voiding, clinical note finalization) generate append-only immutable audit records with timestamps and actor identifiers.
              </p>
            </div>

            {/* Architecture Pillar 6 */}
            <div className="p-6 sm:p-8 rounded-xl border border-slate-200 bg-slate-50/50">
              <CheckCircle2 className="w-8 h-8 text-teal-700 mb-4" />
              <h2 className="text-xl font-bold text-slate-900">Non-Punitive Read-Only Retention</h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                If a subscription lapses, your patient histories remain safely viewable in read-only mode. Physenra never holds patient medical records hostage or deletes clinical histories upon cancellation.
              </p>
            </div>
          </div>

          <div className="mt-16 rounded-2xl bg-slate-900 text-white p-8 sm:p-12 text-center">
            <h3 className="text-2xl font-bold">Have Specific Governance or Security Requirements?</h3>
            <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
              Our clinical and technical engineering team is available to review your clinic's technical requirements and data portability architecture.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <PrimaryCTAButton size="lg" to="/register-practice">
                Start Secure 14-Day Free Trial
              </PrimaryCTAButton>
              <SecondaryCTAButton size="lg" to="/login" className="text-white border-slate-700 hover:bg-slate-800">
                Log In
              </SecondaryCTAButton>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
};
