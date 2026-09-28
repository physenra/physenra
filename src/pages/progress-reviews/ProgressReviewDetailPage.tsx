import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Edit,
  Trash2,
  AlertCircle,
  Award,
} from 'lucide-react';
import { progressReviewService, AmendProgressReviewInput } from '../../services/progressReviewService';
import type {
  ProgressReviewWithRelations,
  ProgressReviewStatus,
  OverallProgressRating,
  ProgressReviewPlanRecommendation,
  GoalProgressStatus,
} from '../../types/models';

export const ProgressReviewDetailPage: React.FC = () => {
  const { reviewId } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();

  const [review, setReview] = useState<ProgressReviewWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isAmendModalOpen, setIsAmendModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Amend form state
  const [amendReason, setAmendReason] = useState('');
  const [amendSummary, setAmendSummary] = useState('');
  const [amendBarriers, setAmendBarriers] = useState('');
  const [amendModifications, setAmendModifications] = useState('');
  const [amendRating, setAmendRating] = useState<OverallProgressRating>('progressing');
  const [amendRecommendation, setAmendRecommendation] =
    useState<ProgressReviewPlanRecommendation>('continue_current_plan');

  const loadReview = async () => {
    if (!reviewId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await progressReviewService.getReviewById(reviewId);
      if (!data) {
        setError('Progress Review not found.');
      } else {
        setReview(data);
        setAmendSummary(data.clinical_summary);
        setAmendBarriers(data.barriers_identified || '');
        setAmendModifications(data.treatment_modifications || '');
        setAmendRating(data.overall_progress_assessment);
        setAmendRecommendation(data.plan_recommendation);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load progress review.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReview();
  }, [reviewId]);

  const handleFinalize = async () => {
    if (!review) return;
    setIsProcessingAction(true);
    setError(null);
    try {
      const updated = await progressReviewService.finalizeReview(review.id);
      setReview(updated);
      setIsFinalizeModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to finalize review.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleAmend = async () => {
    if (!review) return;
    if (!amendReason.trim()) {
      setError('Amendment reason is mandatory.');
      return;
    }

    setIsProcessingAction(true);
    setError(null);
    try {
      const payload: AmendProgressReviewInput = {
        amendment_reason: amendReason.trim(),
        clinical_summary: amendSummary.trim(),
        barriers_identified: amendBarriers.trim() || null,
        treatment_modifications: amendModifications.trim() || null,
        overall_progress_assessment: amendRating,
        plan_recommendation: amendRecommendation,
      };

      const updated = await progressReviewService.amendReview(review.id, payload);
      setReview(updated);
      setIsAmendModalOpen(false);
      setAmendReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to amend review.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!review) return;
    setIsProcessingAction(true);
    setError(null);
    try {
      await progressReviewService.deleteDraftReview(review.id);
      navigate('/app/progress-reviews');
    } catch (err: any) {
      setError(err.message || 'Failed to delete draft review.');
      setIsProcessingAction(false);
    }
  };

  const getStatusBadgeStyle = (status: ProgressReviewStatus) => {
    switch (status) {
      case 'draft':
        return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
      case 'finalized':
        return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
      case 'amended':
        return { backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' };
      default:
        return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    }
  };

  const getRatingBadgeStyle = (rating: OverallProgressRating) => {
    switch (rating) {
      case 'significant_improvement':
      case 'goals_met':
        return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' };
      case 'progressing':
        return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' };
      case 'slow_progress':
        return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' };
      case 'plateaued':
        return { backgroundColor: '#ffedd5', color: '#9a3412', border: '1px solid #fdba74' };
      case 'regressed':
        return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
      default:
        return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    }
  };

  const getGoalStatusBadgeStyle = (status: GoalProgressStatus) => {
    switch (status) {
      case 'achieved':
        return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' };
      case 'partially_achieved':
        return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' };
      case 'in_progress':
        return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' };
      case 'not_achieved':
        return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
      case 'regressed':
        return { backgroundColor: '#fdf2f8', color: '#9d174d', border: '1px solid #fbcfe8' };
      case 'discontinued':
        return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' };
      default:
        return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    }
  };

  const formatText = (text: string) => {
    return text
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        <div
          style={{
            display: 'inline-block',
            width: '36px',
            height: '36px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#0284c7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ marginTop: '14px', fontSize: '14px' }}>Loading progress review details...</p>
      </div>
    );
  }

  if (!review) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 12px auto' }} />
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Progress Review Not Found</h2>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
          The requested review could not be located in the current practice.
        </p>
        <Link
          to="/app/progress-reviews"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '6px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: '600',
          }}
        >
          <ArrowLeft size={16} /> Return to Progress Reviews
        </Link>
      </div>
    );
  }

  const patientName = review.patient
    ? `${review.patient.first_name} ${review.patient.last_name}`
    : 'Unknown Patient';
  const clinicianName = review.reviewing_clinician?.display_name ||
    (review.reviewing_clinician?.first_name ? `${review.reviewing_clinician.first_name} ${review.reviewing_clinician.last_name || ''}` : 'Assigned Clinician');

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Navigation */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/app/progress-reviews"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#0284c7',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: '500',
          }}
        >
          <ArrowLeft size={16} /> Back to Progress Reviews
        </Link>
      </div>

      {/* Error alert */}
      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Review Header Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '20px',
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                {review.review_identifier}
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'capitalize',
                  ...getStatusBadgeStyle(review.overall_status),
                }}
              >
                {review.overall_status === 'finalized' && <CheckCircle2 size={13} />}
                {review.overall_status === 'amended' && <AlertTriangle size={13} />}
                {review.overall_status}
              </span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: '600',
                  ...getRatingBadgeStyle(review.overall_progress_assessment),
                }}
              >
                {formatText(review.overall_progress_assessment)}
              </span>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              Clinical Progress Review • Conducted on {formatDate(review.review_date)}
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {review.overall_status === 'draft' && (
              <>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    backgroundColor: '#fff1f2',
                    color: '#e11d48',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={15} /> Delete Draft
                </button>

                <button
                  type="button"
                  onClick={() => setIsFinalizeModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <CheckCircle2 size={15} /> Finalize Review
                </button>
              </>
            )}

            {(review.overall_status === 'finalized' || review.overall_status === 'amended') && (
              <button
                type="button"
                onClick={() => setIsAmendModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                <Edit size={15} /> Amend Review
              </button>
            )}
          </div>
        </div>

        {/* Clinical Provenance & Metadata Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
              Patient
            </div>
            <div style={{ marginTop: '4px', fontWeight: '600', color: '#0f172a' }}>
              <Link
                to={`/app/patients/${review.patient_id}`}
                style={{ color: '#0284c7', textDecoration: 'none' }}
              >
                {patientName}
              </Link>
            </div>
            {review.patient?.patient_identifier && (
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                ID: {review.patient.patient_identifier}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
              Episode of Care
            </div>
            <div style={{ marginTop: '4px', fontWeight: '600', color: '#0f172a' }}>
              <Link
                to={`/app/episodes/${review.episode_id}`}
                style={{ color: '#0284c7', textDecoration: 'none' }}
              >
                {review.episode?.title || 'Episode'}
              </Link>
            </div>
            {review.episode?.episode_identifier && (
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {review.episode.episode_identifier}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
              Treatment Plan
            </div>
            <div style={{ marginTop: '4px', fontWeight: '600', color: '#0f172a' }}>
              <Link
                to={`/app/treatment-plans/${review.treatment_plan_id}`}
                style={{ color: '#0284c7', textDecoration: 'none' }}
              >
                {review.treatment_plan?.title || 'Treatment Plan'}
              </Link>
            </div>
            {review.treatment_plan?.plan_identifier && (
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {review.treatment_plan.plan_identifier} ({review.treatment_plan.status})
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
              Reviewing Clinician
            </div>
            <div style={{ marginTop: '4px', fontWeight: '600', color: '#0f172a' }}>
              {clinicianName}
            </div>
            {review.finalized_at && (
              <div style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={11} /> Finalized {formatDate(review.finalized_at)}
              </div>
            )}
          </div>
        </div>

        {/* Originating Visit & Recommendation Sub-bar */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#475569' }}>
            {review.originating_clinical_visit && (
              <div>
                <strong>Linked Visit:</strong>{' '}
                <Link
                  to={`/app/visits/${review.originating_clinical_visit_id}`}
                  style={{ color: '#0284c7', textDecoration: 'none' }}
                >
                  {review.originating_clinical_visit.visit_identifier}
                </Link>
              </div>
            )}
            {review.next_review_due_date && (
              <div>
                <strong>Next Review Due:</strong> {formatDate(review.next_review_due_date)}
              </div>
            )}
          </div>

          <div>
            <span style={{ fontSize: '12px', color: '#64748b', marginRight: '6px' }}>Recommendation:</span>
            <span
              style={{
                display: 'inline-block',
                padding: '3px 10px',
                borderRadius: '6px',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              {formatText(review.plan_recommendation)}
            </span>
          </div>
        </div>
      </div>

      {/* Amendment Notice if review is amended */}
      {review.overall_status === 'amended' && (
        <div
          style={{
            backgroundColor: '#eef2ff',
            border: '1px solid #c7d2fe',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3730a3', fontWeight: '600', marginBottom: '6px' }}>
            <AlertTriangle size={18} />
            <span>Clinical Record Formally Amended</span>
          </div>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#312e81' }}>
            <strong>Amendment Rationale:</strong> {review.amendment_reason}
          </p>
          <div style={{ fontSize: '12px', color: '#4338ca' }}>
            Amended by{' '}
            {review.amender?.display_name ||
              (review.amender?.first_name ? `${review.amender.first_name} ${review.amender.last_name || ''}` : 'Clinician')}{' '}
            on {formatDate(review.amended_at)} • Original finalization preserved.
          </div>
        </div>
      )}

      {/* Structured Goal-by-Goal Progress Evaluations */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Evaluated Clinical Goals
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
              Structured longitudinal assessment against authoritative Treatment Plan goals
            </p>
          </div>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            {review.goals?.length || 0} Goals Reviewed
          </span>
        </div>

        {(!review.goals || review.goals.length === 0) ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            No goals were attached to this progress review.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {review.goals.map((goalReview, index) => {
              const tpGoal = goalReview.treatment_plan_goal;
              return (
                <div
                  key={goalReview.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    backgroundColor: '#fafbfc',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                      marginBottom: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>
                        Goal #{index + 1}: {tpGoal?.goal_statement || 'Clinical Goal'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Category: {tpGoal?.category?.replace('_', ' ') || 'General'} • Priority: {tpGoal?.priority || 'medium'}
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: '600',
                        ...getGoalStatusBadgeStyle(goalReview.status_at_review),
                      }}
                    >
                      {formatText(goalReview.status_at_review)}
                    </span>
                  </div>

                  {/* Goal Targets and Measured Values Comparison */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '12px',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <div style={{ color: '#64748b', fontWeight: '600' }}>Baseline Description</div>
                      <div style={{ marginTop: '2px', color: '#1e293b' }}>
                        {tpGoal?.baseline_description || '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontWeight: '600' }}>Target Description</div>
                      <div style={{ marginTop: '2px', color: '#1e293b' }}>
                        {tpGoal?.target_description || '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#0284c7', fontWeight: '600' }}>Current Measured Value</div>
                      <div style={{ marginTop: '2px', color: '#0f172a', fontWeight: '600' }}>
                        {goalReview.current_value || '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontWeight: '600' }}>Measurement Method</div>
                      <div style={{ marginTop: '2px', color: '#1e293b' }}>
                        {goalReview.measurement_method || tpGoal?.measurement_method || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Clinician Assessment */}
                  <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                    <strong style={{ color: '#334155' }}>Clinician Assessment:</strong>{' '}
                    <span style={{ color: '#0f172a' }}>{goalReview.clinician_assessment}</span>
                  </div>

                  {/* Progress Notes */}
                  {goalReview.progress_notes && (
                    <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
                      <strong>Notes:</strong> {goalReview.progress_notes}
                    </div>
                  )}

                  {/* Linked Outcome Measure Assessment */}
                  {goalReview.linked_outcome_assessment && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        fontSize: '11px',
                        color: '#166534',
                      }}
                    >
                      <Award size={13} />
                      <span>
                        Linked Outcome Measure:{' '}
                        <strong>{goalReview.linked_outcome_assessment.definition?.name || 'Assessment'}</strong> (Score:{' '}
                        {goalReview.linked_outcome_assessment.numeric_score || 'N/A'}) -{' '}
                        {formatDate(goalReview.linked_outcome_assessment.performed_at)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clinical Summary & Narrative Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          marginBottom: '24px',
        }}
      >
        {/* Clinical Summary */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 12px 0' }}>
            Clinical Synthesis & Summary
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
            {review.clinical_summary}
          </p>
        </div>

        {/* Barriers & Treatment Modifications */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 12px 0' }}>
            Barriers & Strategic Modifications
          </h3>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
              Identified Barriers
            </div>
            <div style={{ marginTop: '4px', fontSize: '13px', color: '#334155' }}>
              {review.barriers_identified || 'None documented during this review period.'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
              Treatment Plan Modifications
            </div>
            <div style={{ marginTop: '4px', fontSize: '13px', color: '#334155' }}>
              {review.treatment_modifications || 'No clinical adjustments required at this stage.'}
            </div>
          </div>
        </div>
      </div>

      {/* Finalize Confirmation Modal */}
      {isFinalizeModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#059669', marginBottom: '12px' }}>
              <Lock size={22} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                Finalize Progress Review?
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Finalizing locks this Progress Review as an authoritative medical record. Clinical summaries and evaluated
              goals will become permanent and cannot be modified without a formal clinical amendment.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => setIsFinalizeModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleFinalize}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: isProcessingAction ? 'not-allowed' : 'pointer',
                }}
              >
                {isProcessingAction ? 'Finalizing...' : 'Confirm & Finalize'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Draft Modal */}
      {isDeleteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e11d48', marginBottom: '12px' }}>
              <Trash2 size={22} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                Delete Draft Progress Review?
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Are you sure you want to permanently delete draft review <strong>{review.review_identifier}</strong>? This
              action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => setIsDeleteModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleDeleteDraft}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#e11d48',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: isProcessingAction ? 'not-allowed' : 'pointer',
                }}
              >
                {isProcessingAction ? 'Deleting...' : 'Delete Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Amend Modal */}
      {isAmendModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              maxWidth: '600px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#4f46e5', marginBottom: '12px' }}>
              <Edit size={22} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                Amend Finalized Progress Review
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              Medical records require explicit clinical justification for all corrections and updates.
            </p>

            {/* Amendment Reason (Mandatory) */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                Amendment Reason *
              </label>
              <textarea
                rows={2}
                placeholder="State the clinical justification for amending this finalized review..."
                value={amendReason}
                onChange={(e) => setAmendReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* Clinical Summary */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                Updated Clinical Summary
              </label>
              <textarea
                rows={3}
                value={amendSummary}
                onChange={(e) => setAmendSummary(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* Overall Rating & Recommendation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Progress Rating
                </label>
                <select
                  value={amendRating}
                  onChange={(e) => setAmendRating(e.target.value as OverallProgressRating)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                >
                  <option value="significant_improvement">Significant Improvement</option>
                  <option value="progressing">Progressing as Expected</option>
                  <option value="slow_progress">Slow Progress</option>
                  <option value="plateaued">Plateaued</option>
                  <option value="regressed">Regressed</option>
                  <option value="goals_met">All Primary Goals Met</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Plan Recommendation
                </label>
                <select
                  value={amendRecommendation}
                  onChange={(e) => setAmendRecommendation(e.target.value as ProgressReviewPlanRecommendation)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                >
                  <option value="continue_current_plan">Continue Current Plan</option>
                  <option value="modify_goals">Modify Goals</option>
                  <option value="advance_interventions">Advance Interventions</option>
                  <option value="reduce_frequency">Reduce Frequency</option>
                  <option value="prepare_discharge">Prepare Discharge</option>
                </select>
              </div>
            </div>

            {/* Barriers & Modifications */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                Updated Barriers
              </label>
              <input
                type="text"
                value={amendBarriers}
                onChange={(e) => setAmendBarriers(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                Updated Modifications
              </label>
              <input
                type="text"
                value={amendModifications}
                onChange={(e) => setAmendModifications(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => setIsAmendModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingAction || !amendReason.trim()}
                onClick={handleAmend}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: isProcessingAction || !amendReason.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {isProcessingAction ? 'Submitting...' : 'Save Clinical Amendment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProgressReviewDetailPage;
