// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — FEATURE CARD PRIMITIVE
// File: src/public/components/FeatureCard.tsx
// ==============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  linkTo?: string;
  linkLabel?: string;
  badge?: string;
  className?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  linkTo,
  linkLabel = 'Learn more',
  badge,
  className = '',
}) => {
  return (
    <div
      className={`group relative rounded-xl border border-slate-200/80 bg-white p-6 shadow-2xs hover:shadow-sm hover:border-teal-200 transition-all duration-200 flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-11 h-11 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
            {icon}
          </div>
          {badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
              {badge}
            </span>
          )}
        </div>
        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-teal-800 transition-colors">
          {title}
        </h3>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          {description}
        </p>
      </div>

      {linkTo && (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <Link
            to={linkTo}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900 group-hover:translate-x-0.5 transition-all"
          >
            <span>{linkLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
};
