// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — SANITIZED CLINICAL ENCOUNTER PANEL
// File: src/public/components/ClinicalPanel.tsx
// ==============================================================================

import React from 'react';
import { StatusBadge } from './StatusBadge';
import { Clock, FileCheck } from 'lucide-react';

interface ClinicalPanelProps {
  className?: string;
}

export const ClinicalPanel: React.FC<ClinicalPanelProps> = ({ className = '' }) => {
  return (
    <div className={`p-4 sm:p-6 space-y-5 bg-white text-left ${className}`}>
      {/* Patient & Encounter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold text-slate-900">
              Adaeze N. <span className="text-xs font-normal text-slate-400 font-mono">#PT-2026-08</span>
            </span>
            <StatusBadge label="In Session" variant="active" size="sm" />
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Episode: L5-S1 Lumbar Radiculopathy • Initial Assessment • Dr. K. Okonjo, PT
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-teal-600" />
          <span>Session: 35 min</span>
        </div>
      </div>

      {/* Outcome Batteries Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-teal-50/70 border border-teal-100 p-2.5">
          <div className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider">VAS Pain</div>
          <div className="text-lg font-bold font-mono text-teal-900 mt-0.5">6 / 10</div>
          <div className="text-[10px] text-teal-700">Moderate Sharp Lumbar</div>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">ODI Score</div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">42%</div>
          <div className="text-[10px] text-slate-500">Moderate Disability</div>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Lumbar Flexion</div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">35°</div>
          <div className="text-[10px] text-amber-700">Restricted with Pain</div>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Straight Leg Raise</div>
          <div className="text-lg font-bold font-mono text-rose-700 mt-0.5">+ Positive</div>
          <div className="text-[10px] text-slate-500">Right at 40°</div>
        </div>
      </div>

      {/* SOAP Notes Viewport */}
      <div className="space-y-3 text-xs sm:text-sm">
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
          <div className="font-bold text-teal-900 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
            Subjective (S)
          </div>
          <p className="text-slate-600 leading-relaxed text-xs">
            44-year-old presenting with 3-week onset of lower back pain radiating down right posterior thigh to lateral calf. Aggravated by prolonged sitting (&gt;20 mins) and forward bending. Morning stiffness lasting 25 minutes.
          </p>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
          <div className="font-bold text-teal-900 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
            Objective (O) — Physical & Special Tests
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
            <div>• Active Lumbar Extension: 15° (pain centralization)</div>
            <div>• Extensor Hallucis Longus (MMT): Grade 4/5 (R) vs 5/5 (L)</div>
            <div>• Slump Test: Positive right side at 30° knee extension</div>
            <div>• Deep Tendon Reflexes: Achilles reflex diminished (R)</div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
          <div className="font-bold text-teal-900 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
            Plan (P) & Active Prescription
          </div>
          <p className="text-slate-600 leading-relaxed text-xs">
            Prone press-ups (McKenzie extension protocol) 10 reps q2h. Core stabilization progressions. Assigned to 10-Session Post-Op Rehab Package. Follow-up encounter scheduled in 3 days.
          </p>
        </div>
      </div>

      {/* Footer Encounter Sign-off Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
          <FileCheck className="w-4 h-4" />
          <span>Structured Clinical Encounter Draft</span>
        </div>
        <span className="font-mono text-slate-400">ICD-10: M54.16 • Physenra Core</span>
      </div>
    </div>
  );
};
