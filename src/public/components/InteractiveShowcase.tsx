// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — INTERACTIVE CLINICAL SHOWCASE
// File: src/public/components/InteractiveShowcase.tsx
// ==============================================================================

import React, { useState } from 'react';
import { BrowserFrame } from './BrowserFrame';
import { ClinicalPanel } from './ClinicalPanel';
import { StatusBadge } from './StatusBadge';
import {
  Activity,
  Calendar,
  Layers,
  Scan,
  CheckCircle2,
} from 'lucide-react';

export type ShowcaseTab = 'clinical' | 'scheduling' | 'packages' | 'imaging';

interface ShowcaseTabConfig {
  id: ShowcaseTab;
  label: string;
  badge?: string;
  icon: React.ReactNode;
  urlPath: string;
  title: string;
  description: string;
}

const SHOWCASE_TABS: ShowcaseTabConfig[] = [
  {
    id: 'clinical',
    label: 'Clinical Documentation',
    badge: 'SOAP & ROM',
    icon: <Activity className="w-4 h-4 shrink-0" />,
    urlPath: 'physenra.com/app/patients/PT-2026-08/visits/new',
    title: 'Musculoskeletal SOAP Charting & Functional Scales',
    description: 'Document physical examinations, active/passive ROM, Oxford manual muscle tests, and standardized VAS/ODI outcome measures in minutes.',
  },
  {
    id: 'scheduling',
    label: 'Appointment Calendar',
    badge: 'Multi-Therapist',
    icon: <Calendar className="w-4 h-4 shrink-0" />,
    urlPath: 'physenra.com/app/appointments?date=today',
    title: 'Multi-Practitioner Scheduling & Treatment Rooms',
    description: 'Coordinate appointments across multiple physiotherapists and treatment bays with seamless one-click visit note creation.',
  },
  {
    id: 'packages',
    label: 'Packages & Wallets',
    badge: 'Atomic Entitlement',
    icon: <Layers className="w-4 h-4 shrink-0" />,
    urlPath: 'physenra.com/app/packages',
    title: 'Atomic Session Decrementing & Patient Wallets',
    description: 'Track prepaid session bundles with atomic entitlement deduction upon visit sign-off, plus immutable patient credit deposit ledgers.',
  },
  {
    id: 'imaging',
    label: 'Web DICOM PACS',
    badge: 'Zero Plugins',
    icon: <Scan className="w-4 h-4 shrink-0" />,
    urlPath: 'physenra.com/app/imaging/studies/ST-2026-04',
    title: 'Zero-Footprint Browser DICOM Diagnostic Viewer',
    description: 'Review patient MRI, CT, and X-ray studies directly inside the browser with window leveling presets and Cobb angle measuring calipers.',
  },
];

export const InteractiveShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('clinical');
  const currentConfig = SHOWCASE_TABS.find((t) => t.id === activeTab) || SHOWCASE_TABS[0];

  return (
    <div className="w-full max-w-6xl mx-auto text-left">
      {/* Tab Navigation Controls (Accessible Keyboard & Touch) */}
      <div
        role="tablist"
        aria-label="Clinical Software Capabilities"
        className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none"
      >
        {SHOWCASE_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-btn-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tab-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                isActive
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isActive ? 'bg-teal-800 text-teal-100' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feature Context Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <h3 className="text-base sm:text-lg font-bold text-slate-900">
          {currentConfig.title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
          {currentConfig.description}
        </p>
      </div>

      {/* Interactive Browser Frame Viewport */}
      <div
        role="tabpanel"
        id={`tab-panel-${activeTab}`}
        aria-labelledby={`tab-btn-${activeTab}`}
        className="w-full"
      >
        <BrowserFrame urlPath={currentConfig.urlPath} badge={currentConfig.badge}>
          {/* TAB 1: CLINICAL NOTES VIEW */}
          {activeTab === 'clinical' && <ClinicalPanel />}

          {/* TAB 2: MULTI-PRACTITIONER SCHEDULING VIEW */}
          {activeTab === 'scheduling' && (
            <div className="p-4 sm:p-6 bg-white space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900 text-sm">Today’s Clinic Schedule</span>
                  <StatusBadge label="Clinic Live" variant="active" size="sm" />
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Bay 1: Active • Bay 2: Available • Cryo Suite: In Use
                </div>
              </div>

              {/* Side-by-Side Practitioner Schedule Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1: Dr. Okonjo */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <div className="font-bold text-sm text-slate-900">Dr. K. Okonjo, PT</div>
                      <div className="text-[11px] text-slate-500">Senior Physiotherapist • 4 Encounters Today</div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold font-mono">
                      Bay 1
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-emerald-900">09:00 - 09:45 • Adaeze N.</div>
                        <div className="text-[11px] text-emerald-700">L5-S1 Radiculopathy • Visit 3 of 10</div>
                      </div>
                      <StatusBadge label="In Session" variant="active" size="sm" dot={false} />
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">10:30 - 11:15 • Emeka O.</div>
                        <div className="text-[11px] text-slate-500">Post-Op ACL Rehab • Week 4 Protocol</div>
                      </div>
                      <StatusBadge label="Arrived" variant="scheduled" size="sm" dot={false} />
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">12:00 - 12:45 • Tunde B.</div>
                        <div className="text-[11px] text-slate-500">Adhesive Capsulitis • Initial Eval</div>
                      </div>
                      <StatusBadge label="Confirmed" variant="neutral" size="sm" dot={false} />
                    </div>
                  </div>
                </div>

                {/* Column 2: Dr. Balogun */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <div className="font-bold text-sm text-slate-900">Dr. T. Balogun, PT</div>
                      <div className="text-[11px] text-slate-500">Sports Physical Therapist • 3 Encounters Today</div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold font-mono">
                      Bay 2
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">09:30 - 10:15 • Chinedu K.</div>
                        <div className="text-[11px] text-slate-500">Patellar Tendinopathy • Eccentric Loading</div>
                      </div>
                      <StatusBadge label="Completed" variant="neutral" size="sm" dot={false} />
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">11:00 - 11:45 • Grace A.</div>
                        <div className="text-[11px] text-slate-500">Cervical Spondylosis • Traction</div>
                      </div>
                      <StatusBadge label="Confirmed" variant="scheduled" size="sm" dot={false} />
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">14:00 - 14:45 • Folake S.</div>
                        <div className="text-[11px] text-slate-500">Hamstring Strain • Return-to-Play</div>
                      </div>
                      <StatusBadge label="Confirmed" variant="neutral" size="sm" dot={false} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TREATMENT PACKAGES & PATIENT WALLET VIEW */}
          {activeTab === 'packages' && (
            <div className="p-4 sm:p-6 bg-white space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Patient Package Entitlements & Deposit Wallet
                  </div>
                  <div className="text-xs text-slate-500">
                    Patient: Adaeze N. • Primary Practice Account • Currency: NGN (₦)
                  </div>
                </div>
                <StatusBadge label="Atomic Balance Tracking" variant="active" size="sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Active Package Tracker Card */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Active Therapy Package
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Auto-Decrement
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-sm font-bold text-slate-900">
                      Post-Op Spinal Rehabilitation Bundle
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold text-teal-800 font-mono">7</span>
                      <span className="text-xs text-slate-500">of 10 sessions remaining</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                      <div className="bg-teal-600 h-2 rounded-full" style={{ width: '70%' }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
                      <span>3 completed visits</span>
                      <span>Expires in 45 days</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 leading-relaxed">
                    Last session decremented: Today at 09:45 AM upon sign-off by Dr. K. Okonjo, PT. Zero manual tallying required.
                  </div>
                </div>

                {/* Patient Deposit Wallet Card */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Patient Deposit Wallet
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-600">
                      WLT-000042
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <div className="text-xs text-slate-500">Available Advance Credit Balance</div>
                    <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                      ₦120,000.00
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Overpayment of ₦20,000 auto-credited</span>
                    </div>
                  </div>

                  {/* Transaction Ledger Snippet */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/60 text-slate-600">
                      <span>Deposit via Paystack Card</span>
                      <span className="font-mono text-emerald-700 font-bold">+₦150,000</span>
                    </div>
                    <div className="flex justify-between py-1 text-slate-600">
                      <span>Deduction: Session Package Purchase</span>
                      <span className="font-mono text-slate-800 font-bold">-₦30,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WEB DICOM PACS MEDICAL IMAGING VIEW */}
          {activeTab === 'imaging' && (
            <div className="bg-slate-950 text-white p-4 sm:p-6 space-y-4">
              {/* Imaging Toolbar */}
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">Study: Lumbar Spine MRI (T2 SAG)</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-teal-300 font-mono text-[11px]">
                    CornerstoneJS Zero-Footprint
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                  <span>WW: 850 • WL: 320</span>
                  <span>Zoom: 100%</span>
                </div>
              </div>

              {/* Diagnostic PACS Viewport */}
              <div className="aspect-[16/9] rounded-xl bg-black border border-slate-800 relative flex items-center justify-center overflow-hidden">
                {/* Simulated Spine Radiologic Crosshair */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                  <div className="w-full h-px bg-teal-400" />
                  <div className="h-full w-px bg-teal-400 absolute" />
                </div>

                {/* Simulated Diagnostic Measurement Overlay */}
                <div className="relative z-10 text-center p-4 rounded-lg bg-slate-900/80 backdrop-blur-xs border border-teal-500/40">
                  <div className="text-[11px] font-mono text-teal-400 uppercase tracking-wider mb-1">
                    Cobb Angle Scoliosis Caliper
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
                    14.2°
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Measured: L1 Superior Endplate to L4 Inferior Endplate
                  </div>
                </div>

                {/* DICOM Metadata Watermarks */}
                <div className="absolute top-3 left-3 text-[10px] font-mono text-slate-400 space-y-0.5 text-left">
                  <div>PATIENT: Adaeze N. [F]</div>
                  <div>DOB: 1982-04-12</div>
                  <div>SERIES: 3 (T2 TSE SAG)</div>
                </div>
                <div className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-400 text-right">
                  <div>TE: 104 ms • TR: 3500 ms</div>
                  <div>SLICE: 4.0 mm / 12 of 24</div>
                </div>
              </div>

              {/* Preset Buttons Bar */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-300">Presets:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">Soft Tissue</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400">Bone</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400">Invert</span>
                </div>
                <span className="text-[11px] text-teal-400 font-medium">
                  Directly attachable to clinical SOAP encounter
                </span>
              </div>
            </div>
          )}
        </BrowserFrame>
      </div>
    </div>
  );
};
