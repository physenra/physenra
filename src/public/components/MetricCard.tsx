// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — METRIC CARD PRIMITIVE
// File: src/public/components/MetricCard.tsx
// ==============================================================================

import React from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  delta?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtitle,
  delta,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-sm transition-shadow ${className}`}
    >
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span className="font-medium truncate">{label}</span>
        {icon && <div className="text-teal-600 shrink-0">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900">
          {value}
        </span>
        {delta && (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
            {delta}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
};
