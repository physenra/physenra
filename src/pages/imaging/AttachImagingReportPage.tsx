import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  AlertTriangle,
  Save,
  ShieldAlert,
} from 'lucide-react';
import { imagingService } from '../../services/imagingService';
import { usePractice } from '../../hooks/usePractice';
import type { ImagingStudyWithRelations } from '../../types/models';
import type {
  ImagingReportType,
  ImagingReportSource,
} from '../../types/database';

export const AttachImagingReportPage: React.FC = () => {
  const { studyId } = useParams<{ studyId: string }>();
  const navigate = useNavigate();
  const { activePractice } = usePractice();

  const [study, setStudy] = useState<ImagingStudyWithRelations | null>(null);
  const [authorName, setAuthorName] = useState('');
  const [authorCredentials, setAuthorCredentials] = useState('');
  const [authoringOrganization, setAuthoringOrganization] = useState('');
  const [reportType, setReportType] = useState<ImagingReportType>('formal_radiology');
  const [source, setSource] = useState<ImagingReportSource>('external_facility');
  const [impression, setImpression] = useState('');
  const [findings, setFindings] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [criticalFindingsIdentified, setCriticalFindingsIdentified] = useState(false);
  const [criticalFindingsCommunicated, setCriticalFindingsCommunicated] = useState(false);
  const [communicationDetails, setCommunicationDetails] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudy = async () => {
      if (!studyId || !activePractice) return;
      try {
        const data = await imagingService.getStudyById(studyId, activePractice.id);
        setStudy(data);
        if (data?.performing_facility) {
          setAuthoringOrganization(data.performing_facility);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load study.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudy();
  }, [studyId, activePractice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyId || !activePractice) return;
    if (!impression.trim() || !findings.trim()) {
      setError('Diagnostic impression and detailed radiological findings are required.');
      return;
    }

    if (!authorName.trim()) {
      setError('Author / Radiologist name is required.');
      return;
    }

    if (criticalFindingsIdentified && !communicationDetails.trim()) {
      setError('When critical findings are identified, communication details must be documented.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await imagingService.attachReport({
        study_id: studyId,
        author_name: authorName.trim(),
        author_credentials: authorCredentials.trim() || null,
        authoring_organization: authoringOrganization.trim() || null,
        report_type: reportType,
        source: source,
        findings: findings.trim(),
        impression: impression.trim(),
        recommendations: recommendations.trim() || null,
        critical_findings_identified: criticalFindingsIdentified,
        critical_findings_communicated: criticalFindingsCommunicated,
        communication_details: criticalFindingsIdentified ? communicationDetails.trim() : null,
      });

      navigate(`/app/imaging/studies/${studyId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to attach radiology report.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-sm text-gray-400">Loading study...</div>;
  }

  if (!study) {
    return (
      <div className="p-8 text-center text-gray-500">
        Study not found.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          to={`/app/imaging/studies/${studyId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft size={16} />
          Back to Study {study.study_number}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2 flex items-center gap-2">
          <FileText className="h-7 w-7 text-indigo-600" />
          Attach Diagnostic Radiology Report
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Record the authoritative diagnostic report issued by the reporting radiologist.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Patient & Study Context */}
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-sm">
        <div>
          <span className="text-xs text-gray-500 block">Patient</span>
          <span className="font-semibold text-gray-900">
            {study.patient?.first_name} {study.patient?.last_name} ({study.patient?.patient_identifier})
          </span>
        </div>
        <div>
          <span className="text-xs text-gray-500 block">Modality / Region</span>
          <span className="font-semibold text-gray-900 uppercase">
            {study.modality} • {study.anatomical_region.replace('_', ' ')}
          </span>
        </div>
        <div>
          <span className="text-xs text-gray-500 block">Study Date</span>
          <span className="font-semibold text-gray-900">
            {new Date(study.study_date).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Report Entry Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        {/* Radiologist Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reporting Radiologist Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Dr. Arthur Vance, MD"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Credentials / Qualifications
            </label>
            <input
              type="text"
              placeholder="e.g. MD, FRCR"
              value={authorCredentials}
              onChange={(e) => setAuthorCredentials(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Authoring Organization / Facility
            </label>
            <input
              type="text"
              placeholder="e.g. Apex Diagnostic Radiology Center"
              value={authoringOrganization}
              onChange={(e) => setAuthoringOrganization(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Report Type & Source */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type *
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ImagingReportType)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="formal_radiology">Formal Radiology Report</option>
              <option value="preliminary_wet_read">Preliminary Wet Read</option>
              <option value="clinical_functional_note">Clinical Functional Note</option>
              <option value="amendment">Amendment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Source *
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as ImagingReportSource)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="external_facility">External Imaging Facility</option>
              <option value="in_house_radiologist">In-house Radiologist</option>
              <option value="attending_physiotherapist">Attending Physiotherapist</option>
            </select>
          </div>
        </div>

        {/* Diagnostic Impression */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">
            Diagnostic Impression & Conclusion *
          </label>
          <p className="text-xs text-gray-500 mb-2">
            The radiologist's primary diagnostic synthesis and conclusion.
          </p>
          <textarea
            rows={3}
            value={impression}
            onChange={(e) => setImpression(e.target.value)}
            placeholder="e.g. 1. Complete tear of the supraspinatus tendon with 1.5 cm retraction. 2. Moderate subacromial-subdeltoid bursitis."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />
        </div>

        {/* Detailed Findings */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">
            Detailed Radiological Findings *
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Systematic anatomical findings across sequences and views.
          </p>
          <textarea
            rows={6}
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            placeholder="e.g. Coronal and sagittal T2 sequences demonstrate disruption of supraspinatus tendon fibers..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />
        </div>

        {/* Recommendations */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Radiologist Recommendations (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Orthopedic surgical consultation recommended"
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Critical Findings Alert Box */}
        <div className="p-4 rounded-xl border border-red-200 bg-red-50/40 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="criticalFlag"
              checked={criticalFindingsIdentified}
              onChange={(e) => setCriticalFindingsIdentified(e.target.checked)}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <label htmlFor="criticalFlag" className="text-sm font-bold text-red-800 flex items-center gap-1.5 cursor-pointer">
              <ShieldAlert size={16} />
              Contains Critical or Urgent Unexpected Findings
            </label>
          </div>
          <p className="text-xs text-red-700">
            Check this box if the report identifies unexpected red-flag pathologies (e.g. occult fracture, cauda equina compression, malignancy suspicion) requiring direct clinical communication.
          </p>

          {criticalFindingsIdentified && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="criticalCommunicated"
                  checked={criticalFindingsCommunicated}
                  onChange={(e) => setCriticalFindingsCommunicated(e.target.checked)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="criticalCommunicated" className="text-xs font-semibold text-red-900 cursor-pointer">
                  Direct communication was completed with treating clinician
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-red-900 mb-1">
                  Communication Details & Recipient *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Communicated by telephone to Dr. Adams at 14:30 on 2026-10-01"
                  value={communicationDetails}
                  onChange={(e) => setCommunicationDetails(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white"
                  required={criticalFindingsIdentified}
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <Link
            to={`/app/imaging/studies/${studyId}`}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition"
          >
            <Save size={16} />
            {isSubmitting ? 'Attaching Report...' : 'Attach Radiology Report'}
          </button>
        </div>
      </form>
    </div>
  );
};
