// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — SECONDARY CTA BUTTON
// File: src/public/components/SecondaryCTAButton.tsx
// ==============================================================================

import React from 'react';
import { Link } from 'react-router-dom';

interface SecondaryCTAButtonProps {
  to?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  'aria-label'?: string;
}

export const SecondaryCTAButton: React.FC<SecondaryCTAButtonProps> = ({
  to = '/login',
  children,
  size = 'md',
  className = '',
  onClick,
  'aria-label': ariaLabel,
}) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm font-medium',
    md: 'px-5 py-2.5 text-base font-medium',
    lg: 'px-6 py-3.5 text-base md:text-lg font-medium',
  }[size];

  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2';

  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      className={`${baseClasses} ${sizeClasses} ${className}`}
    >
      {children}
    </Link>
  );
};
