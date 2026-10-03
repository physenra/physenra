import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, MinusCircle, FileEdit } from 'lucide-react';

/**
 * Standardized Clinical Documentation Status Language V1.
 * 
 * Invariant: UI states are derived strictly from authoritative database records.
 * Never claim 'Complete' unless the underlying authoritative record is finalized/completed.
 */
export type ClinicalDocumentationState =
  | 'COMPLETE'
  | 'DRAFT'
  | 'ACTION_REQUIRED'
  | 'NOT_STARTED'
  | 'NOT_APPLICABLE';

export interface DocumentationStatusConfig {
  state: ClinicalDocumentationState;
  label: string;
  badgeClass: string;
  bgStyle: { backgroundColor: string; color: string; border: string };
  icon: React.ReactNode;
}

export function getDocumentationStatusConfig(
  state: ClinicalDocumentationState,
  customLabel?: string
): DocumentationStatusConfig {
  switch (state) {
    case 'COMPLETE':
      return {
        state: 'COMPLETE',
        label: customLabel || 'Complete',
        badgeClass: 'badge-complete',
        bgStyle: { backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' },
        icon: <CheckCircle2 size={13} className="text-emerald-600 inline-block mr-1" aria-hidden="true" />,
      };
    case 'DRAFT':
      return {
        state: 'DRAFT',
        label: customLabel || 'Draft',
        badgeClass: 'badge-draft',
        bgStyle: { backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' },
        icon: <FileEdit size={13} className="text-amber-600 inline-block mr-1" aria-hidden="true" />,
      };
    case 'ACTION_REQUIRED':
      return {
        state: 'ACTION_REQUIRED',
        label: customLabel || 'Action Required',
        badgeClass: 'badge-action-required',
        bgStyle: { backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' },
        icon: <AlertTriangle size={13} className="text-red-600 inline-block mr-1" aria-hidden="true" />,
      };
    case 'NOT_STARTED':
      return {
        state: 'NOT_STARTED',
        label: customLabel || 'Not Started',
        badgeClass: 'badge-not-started',
        bgStyle: { backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' },
        icon: <Clock size={13} className="text-slate-400 inline-block mr-1" aria-hidden="true" />,
      };
    case 'NOT_APPLICABLE':
    default:
      return {
        state: 'NOT_APPLICABLE',
        label: customLabel || 'Optional / N/A',
        badgeClass: 'badge-na',
        bgStyle: { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' },
        icon: <MinusCircle size={13} className="text-gray-400 inline-block mr-1" aria-hidden="true" />,
      };
  }
}

export interface ClinicalStatusBadgeProps {
  state: ClinicalDocumentationState;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const ClinicalStatusBadge: React.FC<ClinicalStatusBadgeProps> = ({
  state,
  label,
  size = 'md',
  className = '',
}) => {
  const config = getDocumentationStatusConfig(state, label);
  const padding = size === 'sm' ? '2px 6px' : '4px 8px';
  const fontSize = size === 'sm' ? '0.75rem' : '0.8125rem';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md ${config.badgeClass} ${className}`}
      style={{
        ...config.bgStyle,
        padding,
        fontSize,
        lineHeight: 1.25,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        whiteSpace: 'nowrap',
      }}
      role="status"
      aria-label={`${config.label} status`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
