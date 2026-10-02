// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — FEATURES OVERVIEW HUB SHELL
// File: src/public/pages/FeaturesHubShell.tsx
// Route: /features
// ==============================================================================

import React from 'react';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { SectionHeading } from '../components/SectionHeading';
import { FeatureCard } from '../components/FeatureCard';
import { PrimaryCTAButton } from '../components/PrimaryCTAButton';
import {
  Activity,
  Users,
  Calendar,
  FileText,
  Target,
  Layers,
  Receipt,
  Scan,
  Settings,
} from 'lucide-react';

export const FeaturesHubShell: React.FC = () => {
  return (
    <MarketingLayout
      title="Platform Features | Physenra Physiotherapy Practice OS"
      description="Explore the complete suite of specialized physiotherapy software modules: clinical EMR, DICOM imaging, session packages, and Paystack billing."
    >
      <div className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Specialized Clinical Platform"
            title="Every Tool Engineered for Modern Physiotherapy"
            subtitle="Physenra replaces fragmented spreadsheets, generic medical forms, and paper tally books with a unified clinical operating system."
          />
        </div>
      </div>

      <div className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
            <FeatureCard
              icon={<Activity className="w-6 h-6" />}
              title="Physiotherapy EMR & SOAP Charting"
              description="Rapid musculoskeletal examinations, active/passive ROM recording, Oxford manual muscle testing, and automated functional outcome scores."
              linkTo="/features/physiotherapy-emr"
              linkLabel="Explore EMR features"
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Patient Management & Episodes"
              description="Organize care around distinct medical presentations (acute injury, post-op, maintenance) with longitudinal attendance tracking."
              linkTo="/features/patient-management"
              linkLabel="Explore Patient Management"
            />
            <FeatureCard
              icon={<Calendar className="w-6 h-6" />}
              title="Multi-Practitioner Scheduling"
              description="Color-coded column calendar for multiple therapists, treatment bay allocation, and one-click appointment-to-visit conversion."
              linkTo="/features/appointments"
              linkLabel="Explore Scheduling"
            />
            <FeatureCard
              icon={<FileText className="w-6 h-6" />}
              title="Clinical Documentation"
              description="Structured orthopaedic and neurological templates with standardized assessment fields and progress tracking."
              linkTo="/features/clinical-documentation"
              linkLabel="Explore Documentation"
            />
            <FeatureCard
              icon={<Target className="w-6 h-6" />}
              title="Treatment Plans & Protocols"
              description="Define short-term and long-term SMART functional goals, recovery timelines, and home exercise programme instructions."
              linkTo="/features/treatment-plans"
              linkLabel="Explore Treatment Plans"
            />
            <FeatureCard
              icon={<Layers className="w-6 h-6" />}
              title="Treatment Packages & Wallets"
              description="Multi-session therapy bundles with atomic session decrementing upon visit completion, plus patient deposit credit ledgers."
              linkTo="/features/treatment-packages"
              linkLabel="Explore Packages & Wallets"
            />
            <FeatureCard
              icon={<Receipt className="w-6 h-6" />}
              title="Invoicing & Paystack Billing"
              description="Automated patient invoicing, official numbered receipts, and seamless card and bank payments via verified Paystack rails."
              linkTo="/features/billing"
              linkLabel="Explore Billing"
            />
            <FeatureCard
              icon={<Scan className="w-6 h-6" />}
              title="Built-in DICOM PACS Viewer"
              description="Zero-footprint web viewer for MRI, CT, and X-ray studies with window leveling presets and Cobb angle calipers directly in the chart."
              linkTo="/features/medical-imaging"
              linkLabel="Explore Medical Imaging"
            />
            <FeatureCard
              icon={<Settings className="w-6 h-6" />}
              title="Practice Management & RBAC"
              description="Multi-practitioner permissions, treatment room management, consumables stock control, and immutable audit logging."
              linkTo="/features/practice-management"
              linkLabel="Explore Practice Ops"
            />
          </div>

          <div className="mt-16 text-center">
            <PrimaryCTAButton size="lg" to="/register-practice">
              Start 14-Day Free Trial
            </PrimaryCTAButton>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
};
