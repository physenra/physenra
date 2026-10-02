// ==============================================================================
// PHYSENRA DESIGN SYSTEM — BRAND LOGO COMPONENT
// File: src/components/ui/BrandLogo.tsx
// ==============================================================================

import React from 'react';
import { Link } from 'react-router-dom';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'mark';
  theme?: 'light' | 'dark';
  to?: string;
  className?: string;
  showSubtitle?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'full',
  theme = 'light',
  to = '/',
  className = '',
  showSubtitle = false,
}) => {
  const heightClass = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-11',
  }[size];

  const logoSrc =
    variant === 'mark'
      ? theme === 'dark'
        ? '/branding/physenra-mark-dark.png'
        : '/branding/physenra-mark.png'
      : theme === 'dark'
      ? '/branding/physenra-logo-dark.png'
      : '/branding/physenra-logo.png';

  const content = (
    <div className={`inline-flex flex-col ${className}`}>
      <div className="inline-flex items-center gap-2.5">
        <img
          src={logoSrc}
          alt="Physenra"
          className={`${heightClass} w-auto object-contain block`}
          style={{ maxHeight: size === 'sm' ? 28 : size === 'lg' ? 44 : 36, width: 'auto' }}
          onError={(e) => {
            // Graceful fallback to CSS styled mark if asset fails to load
            const target = e.currentTarget;
            target.style.display = 'none';
            const fallback = target.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'inline-flex';
          }}
        />
        <div
          style={{ display: 'none' }}
          className="items-center gap-2 text-teal-700 font-extrabold text-xl tracking-tight"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
            P
          </div>
          <span>Physenra</span>
        </div>
      </div>
      {showSubtitle && (
        <span className="text-[11px] font-medium text-slate-500 mt-0.5 tracking-tight">
          Physiotherapy EMR &amp; Practice Management
        </span>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
};
