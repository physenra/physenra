import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Plus,
  Paperclip,
  Download,
  Upload,
  User,
  ExternalLink,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { imagingService } from '../../services/imagingService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type {
  ImagingStudyWithRelations,
} from '../../types/models';
import type { ImagingAttachmentType } from '../../types/database';

export const ImagingStudyDetailPage: React.FC = () => {
  const { studyId } = useParams<{ studyId: string }>();
  const { activePractice } = usePractice();
  const { isClinician, isOwner, isStaff } = useRole();
  const canReview = isClinician || isOwner;

  const [study, setStudy] = useState<ImagingStudyWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] = useState<ImagingAttachmentType>('radiology_report_pdf');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Releasing state
  const [isReleasing, setIsReleasing] = useState(false);

  const loadStudy = async () => {
    if (!studyId || !activePractice) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await imagingService.getStudyById(studyId, activePractice.id);
      setStudy(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load study details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudy();
  }, [studyId, activePractice]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !studyId || !activePractice) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      await imagingService.uploadAttachmentFile(
        activePractice.id,
        studyId,
        selectedFile,
        attachmentType,
        study?.reports?.[0]?.id || null
      );
      setSelectedFile(null);
      await loadStudy();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload attachment.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewAttachment = async (storagePath: string) => {
    try {
      const signedUrl = await imagingService.getAttachmentSignedUrl(storagePath);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      alert(err.message || 'Could not access attachment securely.');
    }
  };

  const handleReleaseToPatient = async () => {
    if (!studyId) return;
    if (!confirm('Are you sure you want to release these reviewed imaging findings to the patient portal?')) return;

    setIsReleasing(true);
    try {
      await imagingService.releaseStudyToPatient(studyId, 'Released following clinician review');
      await loadStudy();
    } catch (err: any) {
      alert(err.message || 'Failed to release study to patient.');
    } finally {
      setIsReleasing(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-sm text-gray-400">Loading study details...</div>;
  }

  if (!study) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Imaging study not found.</p>
        <Link to="/app/imaging/studies" className="text-indigo-600 font-medium text-sm mt-2 inline-block">
          Return to studies
        </Link>
      </div>
    );
  }

  const reports = study.reports || [];
  const attachments = study.attachments || [];
  const hasCritical = reports.some((r) => r.critical_findings_identified) || study.red_flag_alert;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/app/imaging/studies"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition mb-2"
          >
            <ArrowLeft size={16} />
            Back to Studies
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{study.study_number}</h1>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold uppercase bg-indigo-50 text-indigo-700">
              {study.modality}
            </span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                study.review_status === 'reviewed'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {study.review_status}
            </span>
            {hasCritical && (
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-red-100 text-red-700 flex items-center gap-1">
                <AlertTriangle size={12} /> Critical Finding Alert
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Exam Date: {new Date(study.study_date).toLocaleDateString()} • Performed at{' '}
            {study.performing_facility || 'External Center'}
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {study.external_viewer_url && (
            <a
              href={study.external_viewer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <ExternalLink size={16} />
              Open PACS Viewer
            </a>
          )}

          {reports.length === 0 && isStaff && (
            <Link
              to={`/app/imaging/studies/${study.id}/attach-report`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition"
            >
              <FileText size={16} />
              Attach Diagnostic Report
            </Link>
          )}

          {study.review_status === 'unreviewed' && canReview && (
            <Link
              to={`/app/imaging/studies/${study.id}/review`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
            >
              <CheckCircle2 size={16} />
              Record Clinical Review
            </Link>
          )}

          {study.review_status === 'reviewed' && !study.is_patient_visible && canReview && (
            <button
              onClick={handleReleaseToPatient}
              disabled={isReleasing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
            >
              <Send size={14} /> Release to Portal
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Study Details & Patient Context */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              Imaging Study Specifications
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block text-xs font-medium">Modality</span>
                <span className="font-semibold text-gray-900 uppercase">{study.modality}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs font-medium">Anatomical Region</span>
                <span className="font-semibold text-gray-900 capitalize">
                  {study.anatomical_region.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs font-medium">Body Part Examined</span>
                <span className="font-semibold text-gray-900">
                  {study.body_part_examined || 'Not specified'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs font-medium">Accession Number</span>
                <span className="font-semibold text-gray-900 font-mono text-xs">
                  {study.accession_number || 'None'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs font-medium">Series / Images</span>
                <span className="font-semibold text-gray-900">
                  {study.series_count} series, {study.instance_count} images
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs font-medium">Patient Portal Visibility</span>
                <span className={`font-semibold ${study.is_patient_visible ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {study.is_patient_visible ? 'Released to Portal' : 'Withheld / Internal Only'}
                </span>
              </div>
            </div>

            {study.study_instance_uid && (
              <div className="pt-2">
                <span className="text-gray-500 block text-xs font-medium mb-1">
                  DICOM Study Instance UID
                </span>
                <p className="text-xs font-mono text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 break-all">
                  {study.study_instance_uid}
                </p>
              </div>
            )}
          </div>

          {/* Diagnostic Radiology Reports Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Radiology Reports ({reports.length})
              </h2>
              {reports.length === 0 && isStaff && (
                <Link
                  to={`/app/imaging/studies/${study.id}/attach-report`}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Plus size={14} /> Attach Report
                </Link>
              )}
            </div>

            {reports.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                No formal radiology report attached yet.
              </div>
            ) : (
              <div className="space-y-6">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className={`p-4 rounded-xl border ${
                      report.critical_findings_identified
                        ? 'border-red-200 bg-red-50/30'
                        : 'border-gray-200 bg-white'
                    } space-y-3`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">
                          {report.report_type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        {report.is_amendment && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                            AMENDED
                          </span>
                        )}
                        {report.critical_findings_identified && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 flex items-center gap-1">
                            <AlertTriangle size={10} /> Critical Findings
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-500">
                      Author: {report.author_name} {report.author_credentials && `(${report.author_credentials})`} • Facility:{' '}
                      {report.authoring_organization || study.performing_facility || 'N/A'}
                    </p>

                    <div>
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                        Impression & Diagnostic Conclusion
                      </h4>
                      <p className="text-sm font-medium text-gray-900 mt-1 whitespace-pre-line bg-gray-50 p-3 rounded-lg border border-gray-100">
                        {report.impression}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Detailed Radiological Findings
                      </h4>
                      <p className="text-sm text-gray-800 mt-1 whitespace-pre-line bg-gray-50 p-3 rounded-lg border border-gray-100">
                        {report.findings}
                      </p>
                    </div>

                    {report.recommendations && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          Recommendations
                        </h4>
                        <p className="text-xs text-gray-700 mt-1 bg-gray-50 p-2 rounded border border-gray-100">
                          {report.recommendations}
                        </p>
                      </div>
                    )}

                    {report.amendment_reason && (
                      <div className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                        <span className="font-semibold">Amendment Note:</span> {report.amendment_reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clinical Review Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                Treating Clinician Review
              </h2>
              {study.review_status === 'unreviewed' && canReview && (
                <Link
                  to={`/app/imaging/studies/${study.id}/review`}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Plus size={14} /> Complete Review
                </Link>
              )}
            </div>

            {study.review_status === 'unreviewed' ? (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-800">
                This study is currently unreviewed by the treating clinician. Please record clinical
                correlation and plan impact once imaging results are inspected.
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Reviewed at {study.reviewed_at ? new Date(study.reviewed_at).toLocaleString() : ''}</span>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-gray-600 uppercase">Clinical Interpretation</h4>
                  <p className="text-gray-900 mt-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {study.clinical_functional_interpretation}
                  </p>
                </div>

                {study.correlation_with_physical_findings && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 uppercase">
                      Physical Exam Correlation
                    </h4>
                    <p className="text-gray-900 mt-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      {study.correlation_with_physical_findings}
                    </p>
                  </div>
                )}

                {study.treatment_plan_impact && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 uppercase">
                      Physiotherapy Treatment Impact
                    </h4>
                    <p className="text-gray-900 mt-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      {study.treatment_plan_impact}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Attachments & Patient Info */}
        <div className="space-y-6">
          {/* Patient Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
              <User className="h-4 w-4 text-indigo-600" />
              Patient
            </h3>
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-gray-900">
                {study.patient?.first_name} {study.patient?.last_name}
              </p>
              <p className="text-xs text-gray-500">ID: {study.patient?.patient_identifier}</p>
              <div className="pt-2">
                <Link
                  to={`/app/patients/${study.patient_id}`}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View patient profile →
                </Link>
              </div>
            </div>
          </div>

          {/* Secure Attachments Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Paperclip className="h-4 w-4 text-indigo-600" />
              Attachments ({attachments.length})
            </h3>

            {attachments.length === 0 ? (
              <p className="text-xs text-gray-500">No documents or key images attached.</p>
            ) : (
              <div className="divide-y divide-gray-100 space-y-2">
                {attachments.map((att) => (
                  <div key={att.id} className="pt-2 flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <p className="font-medium text-gray-900 truncate">{att.file_name}</p>
                      <p className="text-gray-400 capitalize">
                        {att.attachment_type.replace(/_/g, ' ')} • {(att.file_size_bytes / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => handleViewAttachment(att.storage_path)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                      title="View file securely"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Box */}
            <form onSubmit={handleFileUpload} className="pt-3 border-t border-gray-100 space-y-2">
              <label className="block text-xs font-semibold text-gray-700">
                Upload Report PDF or Key Image
              </label>
              <select
                value={attachmentType}
                onChange={(e) => setAttachmentType(e.target.value as ImagingAttachmentType)}
                className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded bg-white"
              >
                <option value="radiology_report_pdf">Radiology Report (PDF &le; 25MB)</option>
                <option value="key_image">Key Image Slice (JPEG/PNG &le; 15MB)</option>
                <option value="patient_scanned_document">Patient Scanned Document</option>
                <option value="requisition_form_pdf">Requisition Form PDF</option>
              </select>

              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />

              {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                <Upload size={14} />
                {isUploading ? 'Uploading...' : 'Upload Attachment'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
