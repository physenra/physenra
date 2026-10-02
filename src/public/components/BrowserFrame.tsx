// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — BROWSER FRAME PRIMITIVE
// File: src/public/components/BrowserFrame.tsx
// ==============================================================================

import React from 'react';

interface BrowserFrameProps {
  urlPath?: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
}

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  urlPath = 'physenra.com/platform',
  badge,
  children,
  className = '',
}) => {
  return (
    <div
      className={`rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/5 overflow-hidden flex flex-col ${className}`}
    >
      {/* Browser Chrome Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
        </div>

        {/* Address Bar Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-500 font-mono max-w-[200px] sm:max-w-xs truncate shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate">{urlPath}</span>
        </div>

        <div className="flex items-center gap-2">
          {badge && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200/60">
              {badge}
            </span>
          )}
          <div className="w-4" />
        </div>
      </div>

      {/* Frame Interior Viewport */}
      <div className="flex-1 w-full bg-white overflow-hidden text-left">
        {children}
      </div>
    </div>
  );
};
