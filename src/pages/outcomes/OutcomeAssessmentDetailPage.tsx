import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { outcomeMeasureService } from '../../services/outcomeMeasureService';
import type {
  OutcomeMeasureAssessmentWithRelations,
  OutcomeAssessmentStatus,
  OutcomeAssessmentType,
} from '../../types/models';

export const OutcomeAssessmentDetailPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<OutcomeMeasureAssessmentWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Draft Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editAssessmentType, setEditAssessmentType] = useState<OutcomeAssessmentType>('baseline');
  const [editPerformedAt, setEditPerformedAt] = useState('');
  const [editNumericScore, setEditNumericScore] = useState<string>('');
  const [editPercentageScore, setEditPercentageScore] = useState<string>('');
  const [editScoreCategory, setEditScoreCategory] = useState('');
  const [editScoreInterpretation, setEditScoreInterpretation] = useState('');
  const [editClinicalNotes, setEditClinicalNotes] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Finalize Modal State
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Amend Modal State
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [amendmentReason, setAmendmentReason] = useState('');
  const [amendedNumericScore, setAmendedNumericScore] = useState<string>('');
  const [amendedPercentageScore, setAmendedPercentageScore] = useState<string>('');
  const [amendClinicalNotes, setAmendClinicalNotes] = useState('');
  const [isSubmittingAmendment, setIsSubmittingAmendment] = useState(false);

  const loadAssessment = async () => {
    if (!assessmentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await outcomeMeasureService.getAssessmentById(assessmentId);
      if (!data) {
        setError('Clinical outcome assessment record not found.');
      } else {
        setAssessment(data);
        // Sync draft edit state
        setEditAssessmentType(data.assessment_type);
        setEditPerformedAt(data.performed_at ? data.performed_at.slice(0, 16) : '');
        setEditNumericScore(data.numeric_score !== null && data.numeric_score !== undefined ? String(data.numeric_score) : '');
        setEditPercentageScore(data.percentage_score !== null && data.percentage_score !== undefined ? String(data.percentage_score) : '');
        setEditScoreCategory(data.score_category || '');
        setEditScoreInterpretation(data.score_interpretation || '');
        setEditClinicalNotes(data.clinical_notes || '');

        // Sync amendment modal defaults
        setAmendedNumericScore(
          data.amended_numeric_score !== null && data.amended_numeric_score !== undefined
            ? String(data.amended_numeric_score)
            : data.numeric_score !== null && data.numeric_score !== undefined
            ? String(data.numeric_score)
            : ''
        );
        setAmendedPercentageScore(
          data.amended_percentage_score !== null && data.amended_percentage_score !== undefined
            ? String(data.amended_percentage_score)
            : data.percentage_score !== null && data.percentage_score !== undefined
            ? String(data.percentage_score)
            : ''
        );
        setAmendClinicalNotes(data.clinical_notes || '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load outcome assessment.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssessment();
  }, [assessmentId]);

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessment) return;
    setIsSavingDraft(true);
    setError(null);
    try {
      const numScore = editNumericScore !== '' ? parseFloat(editNumericScore) : null;
      const pctScore = editPercentageScore !== '' ? parseFloat(editPercentageScore) : null;

      await outcomeMeasureService.updateDraftAssessment(assessment.id, {
        assessment_type: editAssessmentType,
        performed_at: editPerformedAt ? new Date(editPerformedAt).toISOString() : undefined,
        numeric_score: numScore,
        percentage_score: pctScore,
        score_category: editScoreCategory.trim() || null,
        score_interpretation: editScoreInterpretation.trim() || null,
        clinical_notes: editClinicalNotes.trim() || null,
      });

      setIsEditing(false);
      setSuccessMessage('Draft assessment updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadAssessment();
    } catch (err: any) {
      setError(err.message || 'Failed to update draft assessment.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleFinalize = async () => {
    if (!assessment) return;
    setIsFinalizing(true);
    setError(null);
    try {
      await outcomeMeasureService.finalizeAssessment(assessment.id);
      setShowFinalizeModal(false);
      setIsEditing(false);
      setSuccessMessage('Assessment finalized successfully. Medico-legal score lock engaged.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadAssessment();
    } catch (err: any) {
      setError(err.message || 'Failed to finalize assessment.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleAmend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessment) return;
    if (!amendmentReason.trim()) {
      setError('An explicit clinical amendment reason is mandatory.');
      return;
    }
    setIsSubmittingAmendment(true);
    setError(null);
    try {
      const numScore = amendedNumericScore !== '' ? parseFloat(amendedNumericScore) : null;
      const pctScore = amendedPercentageScore !== '' ? parseFloat(amendedPercentageScore) : null;

      await outcomeMeasureService.amendAssessment(assessment.id, {
        amendment_reason: amendmentReason.trim(),
        amended_numeric_score: numScore,
        amended_percentage_score: pctScore,
        clinical_notes: amendClinicalNotes.trim() || undefined,
      });

      setShowAmendModal(false);
      setAmendmentReason('');
      setSuccessMessage('Assessment amendment recorded. Original measurement preserved.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadAssessment();
    } catch (err: any) {
      setError(err.message || 'Failed to record amendment.');
    } finally {
      setIsSubmittingAmendment(false);
    }
  };

  const getStatusBadge = (status: OutcomeAssessmentStatus) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
            Draft
          </span>
        );
      case 'finalized':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <svg className="w-3 h-3 mr-1 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Finalized
          </span>
        );
      case 'amended':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <svg className="w-3 h-3 mr-1 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Amended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  const getTypeBadge = (type: OutcomeAssessmentType) => {
    switch (type) {
      case 'baseline':
        return <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded">Baseline</span>;
      case 'interim':
        return <span className="px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">Interim</span>;
      case 'discharge':
        return <span className="px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">Discharge</span>;
      case 'follow_up':
        return <span className="px-2 py-0.5 text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200 rounded">Follow-up</span>;
      case 'routine':
      default:
        return <span className="px-2 py-0.5 text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 rounded">Routine</span>;
    }
  };

  const getCategoryBadge = (category?: string) => {
    if (!category) return null;
    return (
      <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded uppercase tracking-wider">
        {category.replace('_', ' ')}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        <span className="ml-3 text-sm text-slate-600 font-medium">Loading clinical assessment...</span>
      </div>
    );
  }

  if (error && !assessment) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-medium text-red-800 mb-1">Assessment Not Found</h3>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <Link
            to="/app/outcome-measures"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none"
          >
            ← Back to Outcome Measures
          </Link>
        </div>
      </div>
    );
  }

  if (!assessment) return null;

  const definition = assessment.definition;
  const isFinalized = assessment.status === 'finalized';
  const isAmended = assessment.status === 'amended';
  const isDraft = assessment.status === 'draft';

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumbs & Navigation */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center text-sm font-medium text-slate-500 space-x-2">
          <Link to="/app/outcome-measures" className="hover:text-slate-800 transition-colors">
            Outcome Measures
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold">{assessment.assessment_identifier}</span>
        </nav>
        <Link
          to={`/app/outcome-measures?patientId=${assessment.patient_id}`}
          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
        >
          View Patient Longitudinal Trend →
        </Link>
      </div>

      {/* Global Alerts / Messages */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center text-sm text-emerald-800">
          <svg className="w-5 h-5 text-emerald-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-sm text-red-800">
          <svg className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Medico-Legal Status Banner */}
      {isDraft && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-3">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-amber-800">
            <span className="font-semibold">Draft Clinical Assessment:</span> This assessment is in draft mode. Scores and notes may be revised by the assessor. When completed, finalize this assessment to engage medico-legal immutability protection.
          </div>
        </div>
      )}

      {isFinalized && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start space-x-3">
          <svg className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div className="text-sm text-emerald-900">
            <span className="font-semibold">Medico-Legal Score Lock Active:</span> Finalized by{' '}
            <span className="font-medium">{assessment.finalizer?.display_name || 'Authorized Clinician'}</span> on{' '}
            {assessment.finalized_at ? new Date(assessment.finalized_at).toLocaleString() : 'N/A'}. Authoritative metrics are permanently preserved. Any modifications must be recorded as an explicit amendment.
          </div>
        </div>
      )}

      {isAmended && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-start space-x-3">
          <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm text-purple-900">
            <span className="font-semibold">Amended Clinical Record:</span> Corrected by{' '}
            <span className="font-medium">{assessment.corrector?.display_name || 'Authorized Clinician'}</span>. Original assessment values remain archived and legally intact.
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {assessment.assessment_identifier}
              </span>
              {getStatusBadge(assessment.status)}
              {getTypeBadge(assessment.assessment_type)}
              {getCategoryBadge(definition?.category)}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {definition?.name || 'Outcome Measure Assessment'}{' '}
              {definition?.code && <span className="text-slate-500 text-lg font-medium">({definition.code})</span>}
            </h1>
            <p className="text-xs text-slate-500">
              Administered on <span className="font-medium text-slate-700">{new Date(assessment.performed_at).toLocaleString()}</span> by{' '}
              <span className="font-medium text-slate-700">{assessment.assessor?.display_name || 'Staff Clinician'}</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isDraft && !isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Edit Draft
                </button>
                <button
                  type="button"
                  onClick={() => setShowFinalizeModal(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-md text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm flex items-center"
                >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Finalize & Lock
                </button>
              </>
            )}

            {isDraft && isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                Cancel Editing
              </button>
            )}

            {(isFinalized || isAmended) && (
              <button
                type="button"
                onClick={() => setShowAmendModal(true)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-md border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors shadow-sm flex items-center"
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                + Record Amendment
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/app/outcome-measures')}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            >
              List View
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Content (Left) + Context Cards (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: 2 Spans */}
        <div className="lg:col-span-2 space-y-6">
          {/* DRAFT EDIT FORM (When editing mode is active) */}
          {isDraft && isEditing ? (
            <div className="bg-white rounded-lg border border-emerald-300 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center">
                <svg className="w-4 h-4 text-emerald-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Draft Outcome Assessment
              </h2>
              <form onSubmit={handleSaveDraft} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Assessment Type</label>
                    <select
                      value={editAssessmentType}
                      onChange={(e) => setEditAssessmentType(e.target.value as OutcomeAssessmentType)}
                      className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    >
                      <option value="baseline">Baseline</option>
                      <option value="interim">Interim</option>
                      <option value="discharge">Discharge</option>
                      <option value="follow_up">Follow-up</option>
                      <option value="routine">Routine</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date & Time Administered</label>
                    <input
                      type="datetime-local"
                      value={editPerformedAt}
                      onChange={(e) => setEditPerformedAt(e.target.value)}
                      className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Numeric Score {definition?.min_score !== null && definition?.max_score !== null && `(${definition?.min_score} – ${definition?.max_score})`}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min={definition?.min_score !== null ? definition?.min_score : undefined}
                      max={definition?.max_score !== null ? definition?.max_score : undefined}
                      value={editNumericScore}
                      onChange={(e) => setEditNumericScore(e.target.value)}
                      placeholder="e.g. 68"
                      className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Percentage Score (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={editPercentageScore}
                      onChange={(e) => setEditPercentageScore(e.target.value)}
                      placeholder="e.g. 85.0"
                      className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Score Classification / Category</label>
                  <input
                    type="text"
                    value={editScoreCategory}
                    onChange={(e) => setEditScoreCategory(e.target.value)}
                    placeholder="e.g. Mild Impairment, Severe Disability, Fall Risk"
                    className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Interpretation</label>
                  <textarea
                    rows={2}
                    value={editScoreInterpretation}
                    onChange={(e) => setEditScoreInterpretation(e.target.value)}
                    placeholder="Interpretation of score in clinical context (e.g. Minimal Clinically Important Difference met)..."
                    className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Assessment Notes</label>
                  <textarea
                    rows={3}
                    value={editClinicalNotes}
                    onChange={(e) => setEditClinicalNotes(e.target.value)}
                    placeholder="Observations, patient assistance required, protocol adherence..."
                    className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingDraft}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isSavingDraft ? 'Saving Draft...' : 'Save Draft Changes'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* SCORE AND RESULTS DISPLAY */
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-6">
              <h2 className="text-base font-semibold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>Assessment Results</span>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {definition?.scoring_type} Scoring Model
                </span>
              </h2>

              {/* Prominent Score Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Numeric Score
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900">
                    {assessment.numeric_score !== null && assessment.numeric_score !== undefined
                      ? assessment.numeric_score
                      : '—'}
                    {definition?.max_score !== null && definition?.max_score !== undefined && (
                      <span className="text-base font-normal text-slate-500 ml-1">/ {definition.max_score}</span>
                    )}
                  </div>
                  {definition?.min_score !== null && definition?.max_score !== null && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      Scale Range: {definition?.min_score} – {definition?.max_score}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Percentage Score
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900">
                    {assessment.percentage_score !== null && assessment.percentage_score !== undefined
                      ? `${assessment.percentage_score}%`
                      : '—'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Normalized 0–100% Metric</div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Classification
                  </div>
                  <div className="text-base font-bold text-slate-800 mt-2 truncate">
                    {assessment.score_category || 'Unclassified'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Clinical Categorization</div>
                </div>
              </div>

              {/* Score Interpretation */}
              {assessment.score_interpretation && (
                <div className="bg-emerald-50/50 rounded-lg p-4 border border-emerald-100">
                  <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1">
                    Clinical Interpretation
                  </h3>
                  <p className="text-sm text-emerald-950 whitespace-pre-wrap">{assessment.score_interpretation}</p>
                </div>
              )}

              {/* Clinical Notes & Observations */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Clinical Notes & Administration Observations
                </h3>
                {assessment.clinical_notes ? (
                  <p className="text-sm text-slate-800 bg-slate-50 p-4 rounded-md border border-slate-100 whitespace-pre-wrap">
                    {assessment.clinical_notes}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">No administrative notes recorded.</p>
                )}
              </div>

              {/* AMENDMENT HISTORY AUDIT BOX (If amended) */}
              {isAmended && (
                <div className="mt-6 p-4 rounded-lg bg-purple-50 border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-purple-200/70 pb-2">
                    <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center">
                      <svg className="w-4 h-4 text-purple-600 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Controlled Amendment Record
                    </h3>
                    <span className="text-xs text-purple-700 font-medium">
                      By {assessment.corrector?.display_name || 'Staff Clinician'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="bg-white p-3 rounded border border-purple-100">
                      <div className="font-semibold text-slate-500 uppercase text-[10px] mb-1">Original Values (Preserved)</div>
                      <div>
                        Numeric Score:{' '}
                        <span className="font-bold text-slate-700">
                          {assessment.numeric_score !== null ? assessment.numeric_score : 'N/A'}
                        </span>
                      </div>
                      <div>
                        Percentage Score:{' '}
                        <span className="font-bold text-slate-700">
                          {assessment.percentage_score !== null ? `${assessment.percentage_score}%` : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded border border-purple-200">
                      <div className="font-semibold text-purple-600 uppercase text-[10px] mb-1">Amended Values</div>
                      <div>
                        Numeric Score:{' '}
                        <span className="font-bold text-purple-900">
                          {assessment.amended_numeric_score !== null ? assessment.amended_numeric_score : 'N/A'}
                        </span>
                      </div>
                      <div>
                        Percentage Score:{' '}
                        <span className="font-bold text-purple-900">
                          {assessment.amended_percentage_score !== null ? `${assessment.amended_percentage_score}%` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wide">
                      Amendment Reason / Justification:
                    </span>
                    <p className="mt-1 text-xs text-purple-950 bg-white p-2.5 rounded border border-purple-200">
                      {assessment.amendment_reason || 'No explicit reason provided.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Definition Reference Details */}
          {definition && (
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 pb-2 border-b border-slate-100">
                Measurement Instrument Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Standard Code:</span>{' '}
                  <span className="font-semibold text-slate-800">{definition.code}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Instrument Name:</span>{' '}
                  <span className="font-semibold text-slate-800">{definition.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Category:</span>{' '}
                  <span className="font-semibold text-slate-800 capitalize">{definition.category.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Scoring Methodology:</span>{' '}
                  <span className="font-semibold text-slate-800 capitalize">{definition.scoring_type}</span>
                </div>
                {definition.score_unit && (
                  <div>
                    <span className="text-slate-500 font-medium">Unit:</span>{' '}
                    <span className="font-semibold text-slate-800">{definition.score_unit}</span>
                  </div>
                )}
                {definition.interpretation_guide && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 font-medium">Interpretation Guide:</span>{' '}
                    <span className="font-semibold text-slate-800">{definition.interpretation_guide}</span>
                  </div>
                )}
              </div>
              {definition.description && (
                <div className="pt-2 text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-100">
                  <span className="font-semibold text-slate-700">Description:</span> {definition.description}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Context & Relationship Cards (1 Span) */}
        <div className="space-y-6">
          {/* Patient Context Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Patient Context</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </h3>
            {assessment.patient ? (
              <div className="space-y-2 text-xs">
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    {assessment.patient.first_name} {assessment.patient.last_name}
                  </div>
                  <div className="text-slate-500 font-mono text-[11px]">{assessment.patient.patient_identifier}</div>
                </div>
                {assessment.patient.phone && (
                  <div className="text-slate-600">
                    <span className="text-slate-400">Phone:</span> {assessment.patient.phone}
                  </div>
                )}
                {assessment.patient.email && (
                  <div className="text-slate-600">
                    <span className="text-slate-400">Email:</span> {assessment.patient.email}
                  </div>
                )}
                <div className="pt-2">
                  <Link
                    to={`/app/patients/${assessment.patient_id}`}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Open Patient Record →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">ID: {assessment.patient_id}</div>
            )}
          </div>

          {/* Episode of Care Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Episode of Care</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </h3>
            {assessment.episode ? (
              <div className="space-y-2 text-xs">
                <div>
                  <div className="font-semibold text-slate-900">{assessment.episode.title}</div>
                  <div className="text-slate-500 font-mono text-[11px]">{assessment.episode.episode_identifier}</div>
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">
                    {assessment.episode.status}
                  </span>
                </div>
                <div className="pt-2">
                  <Link
                    to={`/app/episodes/${assessment.episode_id}`}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Open Episode Record →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">No episode attached.</div>
            )}
          </div>

          {/* Clinical Visit Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Clinical Visit</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </h3>
            {assessment.clinical_visit ? (
              <div className="space-y-2 text-xs">
                <div>
                  <div className="font-semibold text-slate-900 font-mono">{assessment.clinical_visit.visit_identifier}</div>
                  <div className="text-slate-500 text-[11px]">
                    {assessment.clinical_visit.actual_start
                      ? new Date(assessment.clinical_visit.actual_start).toLocaleString()
                      : 'Not yet started'}
                  </div>
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">
                    {assessment.clinical_visit.status}
                  </span>
                </div>
                <div className="pt-2">
                  <Link
                    to={`/app/visits/${assessment.clinical_visit_id}`}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Open Clinical Visit →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">Standalone assessment (no visit attached).</div>
            )}
          </div>

          {/* Audit & Legal Attribution Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100">
              Audit & Medico-Legal Log
            </h3>
            <div className="space-y-2 text-[11px]">
              <div>
                <span className="text-slate-400">Assessor:</span>{' '}
                <span className="font-semibold text-slate-700">
                  {assessment.assessor?.display_name || 'Staff Clinician'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Administered:</span>{' '}
                <span className="text-slate-700">{new Date(assessment.performed_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400">Created At:</span>{' '}
                <span className="text-slate-700">{new Date(assessment.created_at).toLocaleString()}</span>
              </div>
              {assessment.finalized_at && (
                <div className="pt-1 border-t border-slate-100">
                  <span className="text-slate-400">Finalized By:</span>{' '}
                  <span className="font-semibold text-slate-700">
                    {assessment.finalizer?.display_name || 'Authorized Clinician'}
                  </span>
                  <div className="text-slate-500">{new Date(assessment.finalized_at).toLocaleString()}</div>
                </div>
              )}
              {assessment.corrected_by && (
                <div className="pt-1 border-t border-slate-100">
                  <span className="text-slate-400">Amended By:</span>{' '}
                  <span className="font-semibold text-purple-700">
                    {assessment.corrector?.display_name || 'Authorized Clinician'}
                  </span>
                  <div className="text-slate-500">{new Date(assessment.updated_at).toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FINALIZE CONFIRMATION MODAL */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center space-x-3 text-emerald-600">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Finalize Outcome Assessment</h3>
                <p className="text-xs text-slate-500">{assessment.assessment_identifier}</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="font-semibold text-slate-800">
                Notice of Medico-Legal Score Finalization:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Once finalized, scores cannot be modified directly or deleted.</li>
                <li>Any subsequent corrections require recording a formal clinical amendment with justification.</li>
                <li>Your clinical attribution will be recorded as the finalizer.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFinalizeModal(false)}
                disabled={isFinalizing}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinalize}
                disabled={isFinalizing}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 flex items-center"
              >
                {isFinalizing ? 'Finalizing...' : 'Confirm & Finalize'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTROLLED AMENDMENT MODAL */}
      {showAmendModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center space-x-3 text-purple-600">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Controlled Amendment</h3>
                <p className="text-xs text-slate-500">
                  {assessment.assessment_identifier} • {definition?.name}
                </p>
              </div>
            </div>

            <div className="text-xs text-purple-900 bg-purple-50 p-3 rounded-lg border border-purple-200">
              <span className="font-semibold">Immutability Preservation:</span> Original score values (
              {assessment.numeric_score !== null ? `Score: ${assessment.numeric_score}` : ''}
              {assessment.percentage_score !== null ? `, ${assessment.percentage_score}%` : ''}) will remain permanently recorded.
            </div>

            <form onSubmit={handleAmend} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Amendment Reason / Clinical Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={amendmentReason}
                  onChange={(e) => setAmendmentReason(e.target.value)}
                  placeholder="Explain why this outcome measurement is being amended (e.g. Data entry transcription error corrected from paper worksheet)..."
                  className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amended Numeric Score {definition?.min_score !== null && definition?.max_score !== null && `(${definition?.min_score} – ${definition?.max_score})`}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min={definition?.min_score !== null ? definition?.min_score : undefined}
                    max={definition?.max_score !== null ? definition?.max_score : undefined}
                    value={amendedNumericScore}
                    onChange={(e) => setAmendedNumericScore(e.target.value)}
                    placeholder="e.g. 72"
                    className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amended Percentage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={amendedPercentageScore}
                    onChange={(e) => setAmendedPercentageScore(e.target.value)}
                    placeholder="e.g. 90.0"
                    className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amended Clinical Notes</label>
                <textarea
                  rows={2}
                  value={amendClinicalNotes}
                  onChange={(e) => setAmendClinicalNotes(e.target.value)}
                  placeholder="Add any clarifying observations regarding the amended assessment..."
                  className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAmendModal(false)}
                  disabled={isSubmittingAmendment}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAmendment || !amendmentReason.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 flex items-center"
                >
                  {isSubmittingAmendment ? 'Recording Amendment...' : 'Submit Controlled Amendment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
