// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — CLINICIAN VISUAL COMPONENT
// File: src/public/components/ClinicianVisual.tsx
// ==============================================================================

import React from 'react';

interface ClinicianVisualProps {
  imageSrc: string;
  alt: string;
  badge?: string;
  caption?: string;
  className?: string;
  priority?: boolean;
}

export const ClinicianVisual: React.FC<ClinicianVisualProps> = ({
  imageSrc,
  alt,
  badge = 'Physiotherapy Practice',
  caption,
  className = '',
  priority = false,
}) => {
  return (
    <div className={`relative group ${className}`}>
      {/* Subtle ambient glow matching teal/slate palette */}
      <div className="absolute -inset-1.5 bg-gradient-to-tr from-teal-500/10 via-slate-400/5 to-emerald-500/10 rounded-2xl blur-md opacity-75 group-hover:opacity-100 transition-opacity" />

      <div className="relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/90 shadow-lg">
        <div className="aspect-[4/3] w-full overflow-hidden">
          <img
            src={imageSrc}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            className="w-full h-full object-cover object-center transform group-hover:scale-[1.02] transition-transform duration-500"
          />
        </div>

        {/* Informative Context Bar */}
        {(badge || caption) && (
          <div className="p-3.5 bg-white border-t border-slate-100 flex items-center justify-between text-left">
            <div>
              {badge && (
                <span className="inline-block text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                  {badge}
                </span>
              )}
              {caption && (
                <p className="text-xs text-slate-600 mt-1 font-medium leading-tight">
                  {caption}
                </p>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-mono tracking-tight shrink-0 ml-2">
              Visual Storytelling
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
