// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — PRIMARY CONVERSION CTA BUTTON
// File: src/public/components/PrimaryCTAButton.tsx
// ==============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface PrimaryCTAButtonProps {
  to?: string;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showArrow?: boolean;
  onClick?: () => void;
  'aria-label'?: string;
}

export const PrimaryCTAButton: React.FC<PrimaryCTAButtonProps> = ({
  to = '/register-practice',
  children = 'Start 14-Day Free Trial',
  size = 'md',
  className = '',
  showArrow = true,
  onClick,
  'aria-label': ariaLabel,
}) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm font-semibold',
    md: 'px-5 py-2.5 text-base font-semibold',
    lg: 'px-6 py-3.5 text-base md:text-lg font-semibold',
  }[size];

  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2';

  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label={ariaLabel || (typeof children === 'string' ? children : 'Start 14-Day Free Trial')}
      className={`${baseClasses} ${sizeClasses} ${className}`}
    >
      <span>{children}</span>
      {showArrow && <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />}
    </Link>
  );
};
