import React from 'react';
import { usePractice } from '../../hooks/usePractice';
import { ShieldCheck } from 'lucide-react';

export interface ClinicalDocumentPrintFooterProps {
  documentReference?: string;
  overridePracticeName?: string;
  className?: string;
  customAttribution?: string;
  signOffClinicianName?: string | null;
}

export const ClinicalDocumentPrintFooter: React.FC<ClinicalDocumentPrintFooterProps> = ({
  documentReference,
  overridePracticeName,
  className = '',
  customAttribution,
  signOffClinicianName,
}) => {
  const { activePractice } = usePractice();
  const practiceName = overridePracticeName || activePractice?.name || 'Physiotherapy Practice';
  const currentDate = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={`clinical-document-footer mt-8 pt-4 border-t border-slate-200 text-xs text-slate-500 ${className}`}
      data-testid="clinical-document-footer"
      data-clinical-footer="true"
      style={{
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-teal-700 flex-shrink-0" />
          <div>
            <div
              className="font-semibold text-slate-800"
              data-testid="clinical-footer-issuer"
            >
              Issued by {practiceName} • Official Clinical Documentation
            </div>
            <div className="text-[11px] text-slate-400">
              Confidential clinical health record intended solely for designated patient and authorized care providers.
            </div>
          </div>
        </div>

        <div className="text-left sm:text-right text-[11px] text-slate-500 flex-shrink-0">
          {signOffClinicianName && (
            <div>
              Clinician Sign-off: <strong className="text-slate-700">{signOffClinicianName}</strong>
            </div>
          )}
          {documentReference && (
            <div className="font-mono text-slate-600">
              Ref: <strong>{documentReference}</strong>
            </div>
          )}
          <div>Generated: {currentDate}</div>
        </div>
      </div>

      {/* Secondary Software Attribution: Powered by Physenra (not presented as treating clinic) */}
      <div
        className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400"
        data-testid="powered-by-physenra"
      >
        <span>
          {customAttribution || 'Powered by Physenra • Physiotherapy EMR & Clinical Management Platform'}
        </span>
        <span className="hidden sm:inline font-medium text-slate-400">
          Clinical Document System
        </span>
      </div>
    </div>
  );
};
