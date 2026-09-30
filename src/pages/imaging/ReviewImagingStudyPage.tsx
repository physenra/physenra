import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  Save,
} from 'lucide-react';
import { imagingService } from '../../services/imagingService';
import { usePractice } from '../../hooks/usePractice';
import type { ImagingStudyWithRelations } from '../../types/models';

export const ReviewImagingStudyPage: React.FC = () => {
  const { studyId } = useParams<{ studyId: string }>();
  const navigate = useNavigate();
  const { activePractice } = usePractice();

  const [study, setStudy] = useState<ImagingStudyWithRelations | null>(null);
  const [clinicalFunctionalInterpretation, setClinicalFunctionalInterpretation] = useState('');
  const [correlationWithPhysicalFindings, setCorrelationWithPhysicalFindings] = useState('');
  const [treatmentPlanImpact, setTreatmentPlanImpact] = useState('');
  const [redFlagAlert, setRedFlagAlert] = useState(false);
  const [redFlagDetails, setRedFlagDetails] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudy = async () => {
      if (!studyId || !activePractice) return;
      try {
        const data = await imagingService.getStudyById(studyId, activePractice.id);
        setStudy(data);
        if (data?.clinical_functional_interpretation) {
          setClinicalFunctionalInterpretation(data.clinical_functional_interpretation);
        }
        if (data?.treatment_plan_impact) {
          setTreatmentPlanImpact(data.treatment_plan_impact);
        }
        if (data?.correlation_with_physical_findings) {
          setCorrelationWithPhysicalFindings(data.correlation_with_physical_findings);
        }
        if (data?.red_flag_alert) {
          setRedFlagAlert(data.red_flag_alert);
        }
        if (data?.red_flag_details) {
          setRedFlagDetails(data.red_flag_details);
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
    if (!clinicalFunctionalInterpretation.trim() || clinicalFunctionalInterpretation.trim().length < 5) {
      setError('Clinical functional interpretation is required (at least 5 characters).');
      return;
    }

    if (redFlagAlert && !redFlagDetails.trim()) {
      setError('Documented red-flag details are required when a red-flag alert is flagged.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await imagingService.finalizeStudyReview({
        study_id: studyId,
        clinical_functional_interpretation: clinicalFunctionalInterpretation.trim(),
        correlation_with_physical_findings: correlationWithPhysicalFindings.trim() || null,
        treatment_plan_impact: treatmentPlanImpact.trim() || null,
        red_flag_alert: redFlagAlert,
        red_flag_details: redFlagAlert ? redFlagDetails.trim() : null,
      });

      navigate(`/app/imaging/studies/${studyId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to record clinical review.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-sm text-gray-400">Loading study review...</div>;
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
          <ShieldCheck className="h-7 w-7 text-indigo-600" />
          Clinical Imaging Review & Sign-Off
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Document treating clinician review, clinical correlation, and impact on physiotherapy management.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Patient & Study Summary Banner */}
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

      {/* Review Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">
            Clinical Functional Interpretation *
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Record your examination of the imaging series, concordance with clinical symptoms, and key takeaways.
          </p>
          <textarea
            rows={4}
            value={clinicalFunctionalInterpretation}
            onChange={(e) => setClinicalFunctionalInterpretation(e.target.value)}
            placeholder="e.g. Reviewed 3-view lumbar radiographs. L4-L5 disc space narrowing noted concordant with extension pain..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">
            Correlation with Physical Examination Findings
          </label>
          <textarea
            rows={2}
            value={correlationWithPhysicalFindings}
            onChange={(e) => setCorrelationWithPhysicalFindings(e.target.value)}
            placeholder="e.g. Findings correlate directly with right L5 dermatomal paresthesias and positive slump test."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">
            Physiotherapy Treatment Plan Impact
          </label>
          <textarea
            rows={3}
            value={treatmentPlanImpact}
            onChange={(e) => setTreatmentPlanImpact(e.target.value)}
            placeholder="e.g. Emphasize flexion-biased stabilization exercises. Defer high-velocity thrust manipulation. Coordinate re-evaluation in 3 weeks."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Red Flag Alert Box */}
        <div className="p-4 rounded-xl border border-red-200 bg-red-50/40 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="redFlagAlert"
              checked={redFlagAlert}
              onChange={(e) => setRedFlagAlert(e.target.checked)}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <label htmlFor="redFlagAlert" className="text-sm font-bold text-red-800 flex items-center gap-1.5 cursor-pointer">
              <AlertTriangle size={16} />
              Flag Clinical Red-Flag Concern
            </label>
          </div>

          {redFlagAlert && (
            <div>
              <label className="block text-xs font-semibold text-red-900 mb-1">
                Red-Flag Details & Actions Taken *
              </label>
              <textarea
                rows={2}
                value={redFlagDetails}
                onChange={(e) => setRedFlagDetails(e.target.value)}
                placeholder="e.g. Suspicion of pars defect; referred for orthopedic spine consultation."
                className="w-full px-3 py-2 text-xs border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white"
                required={redFlagAlert}
              />
            </div>
          )}
        </div>

        {/* Buttons */}
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
            {isSubmitting ? 'Signing Off...' : 'Complete & Sign Off Review'}
          </button>
        </div>
      </form>
    </div>
  );
};
