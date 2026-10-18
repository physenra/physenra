import React, { useState } from 'react';
import { usePractice } from '../../hooks/usePractice';
import { Building2, MapPin, Phone, Mail, Globe } from 'lucide-react';

export interface PracticeBrandingOverride {
  id?: string;
  name: string;
  slug?: string;
  logo_url?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  country?: string | null;
}

export interface ClinicalDocumentPrintHeaderProps {
  documentTitle: string;
  documentSubtitle?: string;
  documentReference?: string;
  documentStatus?: string;
  issueDate?: string | null;
  reviewDate?: string | null;
  patientName?: string | null;
  patientIdentifier?: string | null;
  patientGender?: string | null;
  patientDob?: string | null;
  patientPhone?: string | null;
  patientEmail?: string | null;
  clinicianName?: string | null;
  clinicianRole?: string | null;
  secondaryClinicianName?: string | null;
  secondaryClinicianRole?: string | null;
  episodeTitle?: string | null;
  episodeIdentifier?: string | null;
  overridePractice?: PracticeBrandingOverride | null;
  className?: string;
  hideMetadataGrid?: boolean;
}

export const ClinicalDocumentPrintHeader: React.FC<ClinicalDocumentPrintHeaderProps> = ({
  documentTitle,
  documentSubtitle,
  documentReference,
  documentStatus,
  issueDate,
  reviewDate,
  patientName,
  patientIdentifier,
  patientGender,
  patientDob,
  patientPhone,
  patientEmail,
  clinicianName,
  clinicianRole,
  secondaryClinicianName,
  secondaryClinicianRole,
  episodeTitle,
  episodeIdentifier,
  overridePractice,
  className = '',
  hideMetadataGrid = false,
}) => {
  const { activePractice } = usePractice();
  const [imageError, setImageError] = useState(false);

  // Dynamic resolution of active practice fields (strictly tenant-scoped, never hardcoded)
  const practiceName =
    overridePractice?.name ||
    activePractice?.name ||
    'Physiotherapy Practice';

  const practiceLogoUrl =
    overridePractice?.logo_url ??
    (activePractice as any)?.logo_url ??
    (activePractice as any)?.settings?.logo_url ??
    null;

  const practiceEmail =
    overridePractice?.email ??
    activePractice?.email ??
    null;

  const practicePhone =
    overridePractice?.phone ??
    activePractice?.phone ??
    null;

  const practiceAddress =
    overridePractice?.address ??
    (activePractice as any)?.address ??
    null;

  const practiceCountry =
    overridePractice?.country ??
    activePractice?.country ??
    null;

  // Generate a clean clinic initials monogram as a graceful fallback
  const getMonogram = (name: string): string => {
    if (!name || !name.trim()) return 'PT';
    const clean = name.trim().replace(/^(the|a)\s+/i, '');
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const hasCustomLogo = Boolean(practiceLogoUrl && !imageError);
  const hasContactInfo = Boolean(practiceAddress || practicePhone || practiceEmail || practiceCountry);

  return (
    <div
      className={`clinical-document-header bg-white rounded-lg border border-slate-200 p-6 mb-6 shadow-sm ${className}`}
      data-testid="clinical-document-header"
      data-clinical-header="true"
      style={{
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
    >
      {/* Top Issuer Band: Tenant Practice Primary Branding & Document Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-200">
        {/* Left: Issuing Practice Identification */}
        <div className="flex items-start gap-3.5 max-w-xl">
          {hasCustomLogo ? (
            <img
              src={practiceLogoUrl!}
              alt={`${practiceName} Logo`}
              onError={() => setImageError(true)}
              className="h-12 max-h-12 max-w-[180px] object-contain object-left flex-shrink-0 rounded"
              data-testid="clinical-practice-logo"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-lg bg-teal-700 text-white font-bold text-base flex items-center justify-center shadow-sm flex-shrink-0 border border-teal-800"
              data-testid="clinical-practice-monogram"
              title={practiceName}
            >
              <span>{getMonogram(practiceName)}</span>
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5">
              <Building2 size={16} className="text-teal-700 flex-shrink-0" />
              <h2
                className="text-lg sm:text-xl font-bold text-slate-900 leading-tight"
                data-testid="clinical-practice-name"
              >
                {practiceName}
              </h2>
            </div>

            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Official Physiotherapy &amp; Rehabilitation Clinic
            </p>

            {/* Contact details rendered only when present (clean fallbacks) */}
            {hasContactInfo && (
              <div
                className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1.5"
                data-testid="clinical-practice-contact"
              >
                {practiceAddress && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                    <span>{practiceAddress}</span>
                  </span>
                )}
                {practicePhone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone size={12} className="text-slate-400 flex-shrink-0" />
                    <span>{practicePhone}</span>
                  </span>
                )}
                {practiceEmail && (
                  <span className="inline-flex items-center gap-1">
                    <Mail size={12} className="text-slate-400 flex-shrink-0" />
                    <span>{practiceEmail}</span>
                  </span>
                )}
                {practiceCountry && !practiceAddress && (
                  <span className="inline-flex items-center gap-1">
                    <Globe size={12} className="text-slate-400 flex-shrink-0" />
                    <span>{practiceCountry}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Document Title & Identification */}
        <div className="text-left sm:text-right flex-shrink-0 sm:ml-auto">
          <div className="inline-block bg-teal-50 text-teal-800 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border border-teal-200/80 mb-1">
            {documentTitle}
          </div>
          {documentSubtitle && (
            <div className="text-xs text-slate-500 font-medium mb-1">
              {documentSubtitle}
            </div>
          )}
          {documentReference && (
            <div
              className="font-mono text-base font-bold text-slate-900"
              data-testid="clinical-document-reference"
            >
              {documentReference}
            </div>
          )}
          {documentStatus && (
            <div className="mt-1">
              <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Status: {documentStatus}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Clinical Metadata Grid: Document Date, Patient & Clinician Attribution */}
      {!hideMetadataGrid && (
        <div
          className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs"
          data-testid="clinical-document-metadata-grid"
        >
          {/* Document Dates & Provenance */}
          <div className="bg-slate-50/70 p-3 rounded-md border border-slate-200/70">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Document Timeline
            </span>
            <div className="text-slate-700 space-y-0.5">
              <div>
                Issue Date:{' '}
                <strong className="text-slate-900 font-semibold">{issueDate || '—'}</strong>
              </div>
              {reviewDate && (
                <div>
                  Review Due:{' '}
                  <strong className="text-slate-900 font-semibold">{reviewDate}</strong>
                </div>
              )}
              {episodeIdentifier && (
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 mt-1">
                  Episode: <span className="font-mono font-medium text-slate-700">{episodeIdentifier}</span>
                  {episodeTitle && ` (${episodeTitle})`}
                </div>
              )}
            </div>
          </div>

          {/* Patient Identification */}
          <div className="bg-slate-50/70 p-3 rounded-md border border-slate-200/70">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Patient Identification
            </span>
            <div
              className="font-bold text-sm text-slate-900 leading-snug"
              data-testid="clinical-patient-name"
            >
              {patientName || 'Patient Details'}
            </div>
            <div className="text-slate-600 mt-1 space-y-0.5">
              {patientIdentifier && (
                <div className="font-mono text-[11px]">
                  ID / MRN: <strong>{patientIdentifier}</strong>
                </div>
              )}
              {(patientDob || patientGender) && (
                <div className="text-[11px] text-slate-500 capitalize">
                  {patientGender && <span>{patientGender}</span>}
                  {patientDob && <span> • DOB: {patientDob}</span>}
                </div>
              )}
              {(patientPhone || patientEmail) && (
                <div className="text-[11px] text-slate-500 truncate">
                  {patientPhone || patientEmail}
                </div>
              )}
            </div>
          </div>

          {/* Clinician Attribution */}
          <div className="bg-slate-50/70 p-3 rounded-md border border-slate-200/70">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Attending Clinician
            </span>
            <div
              className="font-bold text-sm text-slate-900 leading-snug"
              data-testid="clinical-clinician-name"
            >
              {clinicianName || 'Attending Physiotherapist'}
            </div>
            <div className="text-slate-500 mt-1 space-y-0.5 text-[11px]">
              <div>{clinicianRole || 'Prescribing Physiotherapist'}</div>
              {secondaryClinicianName && (
                <div className="pt-1 border-t border-slate-200/60 text-slate-500">
                  {secondaryClinicianRole || 'Finalized by'}:{' '}
                  <strong className="text-slate-700 font-medium">{secondaryClinicianName}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
