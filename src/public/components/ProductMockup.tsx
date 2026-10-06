// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — PRODUCT COMPOSITE MOCKUP
// File: src/public/components/ProductMockup.tsx
// ==============================================================================

import React from 'react';
import { BrowserFrame } from './BrowserFrame';
import { StatusBadge } from './StatusBadge';
import { Activity, Scan, Layers } from 'lucide-react';

interface ProductMockupProps {
  className?: string;
}

export const ProductMockup: React.FC<ProductMockupProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full max-w-lg mx-auto ${className}`}>
      {/* Main Base Card: Clinical Encounter Window */}
      <BrowserFrame
        urlPath="physenra.com/app/visits/VIS-2026-08"
        badge="Live Encounter"
        className="shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/10"
      >
        <div className="p-4 sm:p-5 space-y-4 bg-white text-left">
          {/* Header Row */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="text-sm font-bold text-slate-900">
                Adaeze N. <span className="text-xs font-normal text-slate-400 font-mono">#PT-2026-08</span>
              </div>
              <div className="text-xs text-slate-500">
                L5-S1 Lumbar Radiculopathy • Episode 2
              </div>
            </div>
            <StatusBadge label="In Progress" variant="active" size="sm" />
          </div>

          {/* Quick Metrics Row */}
          <div className="grid grid-cols-3 gap-2 text-left">
            <div className="p-2 rounded-lg bg-teal-50 border border-teal-100">
              <div className="text-[10px] font-bold uppercase text-teal-800">VAS Score</div>
              <div className="text-base font-extrabold font-mono text-teal-900">6 / 10</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-600">ODI Index</div>
              <div className="text-base font-extrabold font-mono text-slate-900">42%</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-600">ROM Flex</div>
              <div className="text-base font-extrabold font-mono text-slate-900">35°</div>
            </div>
          </div>

          {/* SOAP Note Snippet */}
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 space-y-1.5 text-xs text-left">
            <div className="font-semibold text-slate-800 text-[11px] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-teal-600" />
              <span>Objective Assessment</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Extensor Hallucis Longus (MMT): Grade 4/5 (R) vs 5/5 (L). Slump test positive at 30° knee extension. Extension centralized distal symptoms.
            </p>
          </div>
        </div>
      </BrowserFrame>

      {/* Floating Badge 1: Treatment Package Entitlement (Top Right) */}
      <div className="absolute -top-4 -right-2 sm:-right-4 rounded-xl bg-white border border-slate-200 p-3 shadow-lg ring-1 ring-slate-900/5 max-w-[200px] text-left transform sm:rotate-1 animate-in fade-in duration-300">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 mb-1">
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          <span>Package Entitlement</span>
        </div>
        <div className="text-xs font-bold text-slate-900">
          7 of 10 Sessions Left
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          Auto-decrements upon visit sign-off
        </div>
      </div>

      {/* Floating Badge 2: DICOM PACS Measurement (Bottom Left) */}
      <div className="absolute -bottom-4 -left-2 sm:-left-4 rounded-xl bg-slate-900 text-white border border-slate-800 p-3 shadow-xl max-w-[210px] text-left transform sm:-rotate-1 animate-in fade-in duration-300">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-400 mb-1">
          <Scan className="w-3.5 h-3.5" />
          <span>Web DICOM PACS</span>
        </div>
        <div className="text-xs font-bold font-mono text-emerald-400">
          Cobb Angle: 14.2°
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          Spine MRI • Zero-Plugin Web Viewer
        </div>
      </div>
    </div>
  );
};
