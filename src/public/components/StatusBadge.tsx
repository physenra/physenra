// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — STATUS BADGE PRIMITIVE
// File: src/public/components/StatusBadge.tsx
// ==============================================================================

import React from 'react';

export type StatusVariant = 'active' | 'scheduled' | 'pending' | 'critical' | 'neutral';

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  dot = true,
  className = '',
}) => {
  const variantStyles: Record<StatusVariant, { pill: string; dot: string }> = {
    active: {
      pill: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
      dot: 'bg-emerald-500',
    },
    scheduled: {
      pill: 'bg-blue-50 text-blue-800 border-blue-200/80',
      dot: 'bg-blue-500',
    },
    pending: {
      pill: 'bg-amber-50 text-amber-800 border-amber-200/80',
      dot: 'bg-amber-500',
    },
    critical: {
      pill: 'bg-rose-50 text-rose-800 border-rose-200/80',
      dot: 'bg-rose-500',
    },
    neutral: {
      pill: 'bg-slate-100 text-slate-700 border-slate-200/80',
      dot: 'bg-slate-400',
    },
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  const config = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${config.pill} ${sizeClasses} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />}
      <span>{label}</span>
    </span>
  );
};
