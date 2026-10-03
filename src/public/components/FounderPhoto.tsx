// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — FOUNDER PORTRAIT COMPONENT
// File: src/public/components/FounderPhoto.tsx
// ==============================================================================

import React, { useState } from 'react';
import { User, ShieldCheck } from 'lucide-react';

interface FounderPhotoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const FounderPhoto: React.FC<FounderPhotoProps> = ({
  className = '',
  size = 'md',
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Supported image path conventions
  const imageSrc = '/images/founder/dr-oladejo-korede.webp';

  const sizeClasses = {
    sm: 'max-w-xs',
    md: 'max-w-sm',
    lg: 'max-w-md',
  }[size];

  return (
    <div className={`relative w-full ${sizeClasses} mx-auto ${className}`}>
      {/* Background ambient glow */}
      <div className="absolute -inset-2 bg-gradient-to-tr from-teal-500/20 via-emerald-500/10 to-slate-500/20 rounded-3xl blur-lg opacity-75" />

      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col justify-between">
        {!imageError && (
          <img
            src={imageSrc}
            alt="Dr Oladejo Korede, PT, MPH, DPT, founder of Physenra"
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        )}

        {/* Restrained executive caption overlay */}
        {imageLoaded && !imageError && (
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent pointer-events-none text-left">
            <div className="text-white text-sm font-bold tracking-tight">
              Dr Oladejo Korede
            </div>
            <div className="text-[11px] text-teal-300 font-medium">
              Founder &amp; Clinical Architect • PT, MPH, DPT
            </div>
          </div>
        )}

        {/* Executive Portrait Placeholder when official photograph is awaiting drop-in */}
        {(!imageLoaded || imageError) && (
          <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase text-teal-300 bg-teal-950/80 border border-teal-800/60">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                Founder & Clinical Architect
              </span>
            </div>

            <div className="flex flex-col items-center justify-center my-auto py-8">
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-teal-800 to-emerald-700 p-0.5 shadow-xl flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-slate-900/90 flex flex-col items-center justify-center">
                  <User className="w-8 h-8 text-teal-400" />
                  <span className="text-xs font-mono font-bold text-teal-200 mt-1">OK</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-700/80 pt-4 text-left">
              <div className="text-xs font-mono text-teal-400 font-semibold tracking-wide uppercase">
                Founder Profile
              </div>
              <h4 className="text-lg font-bold text-white mt-0.5">
                Dr Oladejo Korede
              </h4>
              <p className="text-xs text-slate-300 font-medium">
                PT, MPH, DPT
              </p>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Physiotherapist • Master of Public Health • Doctor of Physiotherapy
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
