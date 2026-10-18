import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Target,
  ArrowLeft,
  CheckCircle2,
  PauseCircle,
  XCircle,
  AlertCircle,
  Plus,
  PlayCircle,
  Award,
  TrendingUp,
  ExternalLink,
  ClipboardCheck,
} from 'lucide-react';
import { Printer } from 'lucide-react';
import { ClinicalDocumentPrintHeader } from '../../components/clinical/ClinicalDocumentPrintHeader';
import { ClinicalDocumentPrintFooter } from '../../components/clinical/ClinicalDocumentPrintFooter';
import { treatmentPlanService } from '../../services/treatmentPlanService';
import type {
  TreatmentPlanWithRelations,
  TreatmentPlanGoalWithOutcome,
  TreatmentPlanStatus,
  TreatmentGoalStatus,
  TreatmentGoalCategory,
  TreatmentGoalPriority,
} from '../../types/models';

export const TreatmentPlanDetailPage: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();

  const [plan, setPlan] = useState<TreatmentPlanWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals state
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');
  const [showDiscontinueModal, setShowDiscontinueModal] = useState(false);
  const [discontinueReason, setDiscontinueReason] = useState('');
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [evaluatingGoal, setEvaluatingGoal] = useState<TreatmentPlanGoalWithOutcome | null>(null);
  const [newGoalStatus, setNewGoalStatus] = useState<TreatmentGoalStatus>('achieved');
  const [evaluationNotes, setEvaluationNotes] = useState('');

  // Add Goal Form State
  const [newGoalStatement, setNewGoalStatement] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<TreatmentGoalCategory>('functional');
  const [newGoalPriority, setNewGoalPriority] = useState<TreatmentGoalPriority>('medium');
  const [newGoalBaseline, setNewGoalBaseline] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalMeasurement, setNewGoalMeasurement] = useState('');
  const [newGoalTimeframe, setNewGoalTimeframe] = useState<number | ''>(6);

  const [isProcessing, setIsProcessing] = useState(false);

  const loadPlan = async () => {
    if (!planId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await treatmentPlanService.getPlanById(planId);
      if (!data) {
        setError('Treatment plan not found.');
      } else {
        setPlan(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load treatment plan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, [planId]);

  const handleActivate = async () => {
    if (!planId) return;
    setIsProcessing(true);
    try {
      const updated = await treatmentPlanService.activatePlan(planId);
      setPlan(updated);
      setShowActivateModal(false);
      setActionSuccess('Treatment Plan successfully activated and baseline goals locked.');
    } catch (err: any) {
      setError(err.message || 'Failed to activate plan.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePause = async () => {
    if (!planId) return;
    setIsProcessing(true);
    try {
      const updated = await treatmentPlanService.pausePlan(planId, pauseReason);
      setPlan(updated);
      setShowPauseModal(false);
      setPauseReason('');
      setActionSuccess('Treatment Plan has been paused.');
    } catch (err: any) {
      setError(err.message || 'Failed to pause plan.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResume = async () => {
    if (!planId) return;
    setIsProcessing(true);
    try {
      const updated = await treatmentPlanService.resumePlan(planId);
      setPlan(updated);
      setActionSuccess('Treatment Plan has been resumed.');
    } catch (err: any) {
      setError(err.message || 'Failed to resume plan.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async () => {
    if (!planId) return;
    setIsProcessing(true);
    try {
      const updated = await treatmentPlanService.completePlan(planId, completeNotes);
      setPlan(updated);
      setShowCompleteModal(false);
      setCompleteNotes('');
      setActionSuccess('Treatment Plan has been successfully completed.');
    } catch (err: any) {
      setError(err.message || 'Failed to complete plan.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscontinue = async () => {
    if (!planId) return;
    if (!discontinueReason.trim()) {
      setError('A clinical justification reason is strictly required when discontinuing a Treatment Plan.');
      return;
    }
    setIsProcessing(true);
    try {
      const updated = await treatmentPlanService.discontinuePlan(planId, discontinueReason);
      setPlan(updated);
      setShowDiscontinueModal(false);
      setDiscontinueReason('');
      setActionSuccess('Treatment Plan has been discontinued.');
    } catch (err: any) {
      setError(err.message || 'Failed to discontinue plan.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId) return;
    if (!newGoalStatement.trim()) {
      setError('Goal statement is required.');
      return;
    }
    setIsProcessing(true);
    try {
      await treatmentPlanService.addGoal(planId, {
        goal_statement: newGoalStatement.trim(),
        category: newGoalCategory,
        priority: newGoalPriority,
        baseline_description: newGoalBaseline.trim() || null,
        target_description: newGoalTarget.trim() || null,
        measurement_method: newGoalMeasurement.trim() || null,
        target_timeframe_weeks: newGoalTimeframe ? Number(newGoalTimeframe) : null,
      });

      // Reload plan to refresh goals
      await loadPlan();
      setShowAddGoalModal(false);
      setNewGoalStatement('');
      setNewGoalBaseline('');
      setNewGoalTarget('');
      setNewGoalMeasurement('');
      setActionSuccess('Clinical goal added successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to add goal.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateGoalStatus = async () => {
    if (!evaluatingGoal) return;
    setIsProcessing(true);
    try {
      await treatmentPlanService.updateGoalStatus(evaluatingGoal.id, newGoalStatus, evaluationNotes);
      await loadPlan();
      setEvaluatingGoal(null);
      setEvaluationNotes('');
      setActionSuccess('Goal evaluation updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update goal.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadgeStyle = (status: TreatmentPlanStatus) => {
    switch (status) {
      case 'draft':
        return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
      case 'active':
        return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
      case 'paused':
        return { backgroundColor: '#ffedd5', color: '#9a3412', border: '1px solid #fed7aa' };
      case 'completed':
        return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
      case 'discontinued':
        return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
      default:
        return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    }
  };

  const getGoalStatusBadgeStyle = (status: TreatmentGoalStatus) => {
    switch (status) {
      case 'achieved':
        return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
      case 'partially_achieved':
        return { backgroundColor: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' };
      case 'active':
        return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
      case 'not_achieved':
        return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
      case 'discontinued':
        return { backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' };
      case 'draft':
      default:
        return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        dateStyle: 'medium',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Loading treatment plan details...
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: '8px',
            padding: '1.5rem',
            textAlign: 'center',
          }}
        >
          <AlertCircle size={32} style={{ margin: '0 auto 0.5rem auto' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Error</h2>
          <p style={{ margin: '0 0 1rem 0' }}>{error}</p>
          <Link
            to="/app/treatment-plans"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#059669',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} />
            Back to Treatment Plans
          </Link>
        </div>
      </div>
    );
  }

  if (!plan) return null;

  const patientName = plan.patient
    ? `${plan.patient.first_name} ${plan.patient.last_name}`
    : 'Unknown Patient';
  const clinicianName = plan.prescribing_clinician
    ? plan.prescribing_clinician.display_name ||
      `${plan.prescribing_clinician.first_name || ''} ${plan.prescribing_clinician.last_name || ''}`.trim()
    : '—';
  const finalizerName = plan.finalizer
    ? plan.finalizer.display_name ||
      `${plan.finalizer.first_name || ''} ${plan.finalizer.last_name || ''}`.trim()
    : null;

  const isTerminal = plan.status === 'completed' || plan.status === 'discontinued';

  return (
    <div style={{ padding: '2rem', maxWidth: '1120px', margin: '0 auto' }}>
      {/* Back Link */}
      {/* Back Link and Print Toolbar */}
      <div className="print:hidden" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <Link
          to="/app/treatment-plans"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            color: '#64748b',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} />
          Back to Treatment Plans
        </Link>

        <button
          type="button"
          onClick={() => window.print()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.45rem 0.875rem',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            color: '#334155',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Printer size={15} />
          Print / Export Treatment Plan
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div
          className="print:hidden"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: '6px',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div
          className="print:hidden"
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            borderRadius: '6px',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <CheckCircle2 size={20} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Active Tenant Practice Branded Clinical Document Header */}
      <ClinicalDocumentPrintHeader
        documentTitle="Treatment Plan & Clinical Protocol"
        documentSubtitle="Goal Attainment & Outcome Progression Framework"
        documentReference={plan.plan_identifier}
        documentStatus={plan.status}
        issueDate={formatDate(plan.start_date)}
        reviewDate={formatDate(plan.target_review_date)}
        patientName={patientName}
        patientIdentifier={plan.patient?.patient_identifier}
        patientPhone={plan.patient?.phone}
        patientEmail={plan.patient?.email}
        clinicianName={clinicianName}
        clinicianRole="Prescribing Physiotherapist"
        secondaryClinicianName={finalizerName}
        secondaryClinicianRole="Authorized & Finalized by"
        episodeTitle={plan.episode?.title}
        episodeIdentifier={plan.episode?.episode_identifier}
      />

      {/* Header Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                backgroundColor: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
                flexShrink: 0,
              }}
            >
              <Target size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    padding: '0.25rem 0.625rem',
                    borderRadius: '4px',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                  }}
                >
                  {plan.plan_identifier}
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.625rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    ...getStatusBadgeStyle(plan.status),
                  }}
                >
                  {plan.status}
                </span>
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0 0.25rem 0', color: '#0f172a' }}>
                {plan.title}
              </h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                Patient: <strong>{patientName}</strong> ({plan.patient?.patient_identifier || '—'})
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="print:hidden" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {plan.status === 'draft' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowActivateModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <CheckCircle2 size={16} />
                  Activate Plan
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiscontinueModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '0.5rem 0.875rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <XCircle size={16} />
                  Discontinue
                </button>
              </>
            )}

            {plan.status === 'active' && (
              <>
                <Link
                  to={`/app/progress-reviews/new?patientId=${plan.patient_id}&episodeId=${plan.episode_id}&treatmentPlanId=${plan.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 0.875rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <ClipboardCheck size={16} />
                  Conduct Progress Review
                </Link>
                <button
                  type="button"
                  onClick={() => setShowAddGoalModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    backgroundColor: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    borderRadius: '6px',
                    padding: '0.5rem 0.875rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={16} />
                  Add Goal
                </button>
                <button
                  type="button"
                  onClick={() => setShowPauseModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    backgroundColor: '#ffedd5',
                    color: '#9a3412',
                    border: '1px solid #fed7aa',
                    borderRadius: '6px',
                    padding: '0.5rem 0.875rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <PauseCircle size={16} />
                  Pause
                </button>
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Award size={16} />
                  Complete Plan
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiscontinueModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '0.5rem 0.875rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <XCircle size={16} />
                  Discontinue
                </button>
              </>
            )}

            {plan.status === 'paused' && (
              <>
                <button
                  type="button"
                  onClick={handleResume}
                  disabled={isProcessing}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                  }}
                >
                  <PlayCircle size={16} />
                  Resume Plan
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiscontinueModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '0.5rem 0.875rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <XCircle size={16} />
                  Discontinue
                </button>
              </>
            )}

            {isTerminal && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.8125rem',
                  color: '#64748b',
                  backgroundColor: '#f1f5f9',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '6px',
                }}
              >
                Medical Record Terminal State
              </span>
            )}
          </div>
        </div>

        {/* Discontinued Justification Note if applicable */}
        {plan.status === 'discontinued' && plan.discontinued_reason && (
          <div
            style={{
              marginTop: '1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '0.875rem 1rem',
              fontSize: '0.875rem',
              color: '#991b1b',
            }}
          >
            <strong>Discontinuation Reason:</strong> {plan.discontinued_reason}
          </div>
        )}
      </div>

      {/* Main Grid: Details & Clinical Rationale */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Context Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
          }}
        >
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', margin: '0 0 1rem 0' }}>
            Clinical Context & Provenance
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>EPISODE OF CARE</span>
              {plan.episode ? (
                <Link
                  to={`/app/episodes/${plan.episode.id}`}
                  style={{ color: '#059669', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  {plan.episode.title} ({plan.episode.episode_identifier})
                  <ExternalLink size={12} />
                </Link>
              ) : (
                '—'
              )}
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>ORIGINATING ENCOUNTER</span>
              {plan.originating_clinical_visit ? (
                <Link
                  to={`/app/visits/${plan.originating_clinical_visit.id}`}
                  style={{ color: '#059669', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  {plan.originating_clinical_visit.visit_identifier}
                  <ExternalLink size={12} />
                </Link>
              ) : (
                <span style={{ color: '#94a3b8' }}>None (Direct Formulation)</span>
              )}
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>PRESCRIBING CLINICIAN</span>
              <span style={{ fontWeight: 500, color: '#1e293b' }}>{clinicianName}</span>
            </div>

            {plan.finalized_at && (
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>LOCKED & ACTIVATED</span>
                <span style={{ color: '#334155' }}>
                  {formatDate(plan.finalized_at)} {finalizerName ? `by ${finalizerName}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Pathway Parameters Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
          }}
        >
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', margin: '0 0 1rem 0' }}>
            Dosage & Review Schedule
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>TREATMENT FREQUENCY</span>
              <span style={{ fontWeight: 500, color: '#1e293b' }}>{plan.treatment_frequency || 'As indicated'}</span>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>EXPECTED DURATION</span>
              <span style={{ fontWeight: 500, color: '#1e293b' }}>
                {plan.expected_duration_weeks ? `${plan.expected_duration_weeks} weeks` : '—'}
              </span>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>START DATE</span>
              <span style={{ fontWeight: 500, color: '#1e293b' }}>{formatDate(plan.start_date)}</span>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>TARGET REVIEW DATE</span>
              <span style={{ fontWeight: 500, color: '#1e293b' }}>{formatDate(plan.target_review_date)}</span>
            </div>
          </div>

          {plan.diagnosis_summary && (
            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                DIAGNOSIS SUMMARY
              </span>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.4 }}>
                {plan.diagnosis_summary}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Narrative Clinical Rationale & Goals Summary */}
      {(plan.clinical_rationale || plan.overall_goals_summary) && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {plan.clinical_rationale && (
              <div>
                <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', margin: '0 0 0.375rem 0' }}>
                  CLINICAL RATIONALE & THERAPEUTIC APPROACH
                </h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {plan.clinical_rationale}
                </p>
              </div>
            )}

            {plan.overall_goals_summary && (
              <div>
                <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', margin: '0 0 0.375rem 0' }}>
                  OVERALL GOALS SUMMARY
                </h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {plan.overall_goals_summary}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section: Clinical Goals */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              Measurable Clinical Goals ({plan.goals?.length || 0})
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.8125rem' }}>
              Functional milestones tracked and reviewed across encounters.
            </p>
          </div>

          {plan.status === 'active' && (
            <button
              type="button"
              onClick={() => setShowAddGoalModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                backgroundColor: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                padding: '0.4rem 0.875rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              Add Goal
            </button>
          )}
        </div>

        {/* Goals List */}
        {!plan.goals || plan.goals.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            No clinical goals defined on this plan.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {plan.goals.map((g) => (
              <div
                key={g.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>
                        #{g.order_index}
                      </span>
                      <span
                        style={{
                          backgroundColor: '#e2e8f0',
                          color: '#475569',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}
                      >
                        {g.category.replace('_', ' ')}
                      </span>
                      <span
                        style={{
                          backgroundColor:
                            g.priority === 'high' ? '#fee2e2' : g.priority === 'medium' ? '#fef3c7' : '#f1f5f9',
                          color:
                            g.priority === 'high' ? '#991b1b' : g.priority === 'medium' ? '#92400e' : '#475569',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}
                      >
                        {g.priority} priority
                      </span>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                      {g.goal_statement}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        ...getGoalStatusBadgeStyle(g.status),
                      }}
                    >
                      {g.status.replace('_', ' ')}
                    </span>

                    {/* Progress Evaluation Quick Action */}
                    {plan.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => {
                          setEvaluatingGoal(g);
                          setNewGoalStatus(g.status === 'draft' ? 'active' : g.status);
                          setEvaluationNotes(g.notes || '');
                        }}
                        style={{
                          padding: '0.25rem 0.625rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#059669',
                          cursor: 'pointer',
                        }}
                      >
                        Evaluate
                      </button>
                    )}
                  </div>
                </div>

                {/* Goal Details Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.75rem',
                    fontSize: '0.8125rem',
                    color: '#475569',
                    backgroundColor: '#ffffff',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <strong>Baseline:</strong> {g.baseline_description || '—'}
                  </div>
                  <div>
                    <strong>Target Criterion:</strong> {g.target_description || '—'}
                  </div>
                  <div>
                    <strong>Measurement:</strong> {g.measurement_method || '—'}
                  </div>
                  <div>
                    <strong>Target Timeframe:</strong>{' '}
                    {g.target_timeframe_weeks ? `${g.target_timeframe_weeks} weeks` : '—'}
                  </div>
                  {g.review_date && (
                    <div>
                      <strong>Last Reviewed:</strong> {formatDate(g.review_date)}
                    </div>
                  )}
                  {g.achieved_date && (
                    <div style={{ color: '#166534', fontWeight: 600 }}>
                      <strong>Achieved On:</strong> {formatDate(g.achieved_date)}
                    </div>
                  )}
                </div>

                {/* Linked Baseline Assessment if present */}
                {g.baseline_outcome_assessment && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.75rem',
                      color: '#0369a1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    <TrendingUp size={13} />
                    <span>
                      Linked Baseline Measure:{' '}
                      <strong>{g.baseline_outcome_assessment.definition?.name || 'Outcome Assessment'}</strong> (Score:{' '}
                      {g.baseline_outcome_assessment.numeric_score ?? '—'})
                    </span>
                  </div>
                )}

                {/* Evaluation Notes if present */}
                {g.notes && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#64748b' }}>
                    <strong>Progress Notes:</strong> {g.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Official Issuing Practice Clinical Document Footer */}
      <ClinicalDocumentPrintFooter
        documentReference={plan.plan_identifier}
        signOffClinicianName={finalizerName || clinicianName}
        customAttribution="Powered by Physenra • Physiotherapy EMR & Rehabilitation Protocol Management"
      />

      {/* Activate Plan Confirmation Modal */}
      {showActivateModal && (
        <div className="print:hidden"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.75rem',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1rem 0', color: '#0f172a' }}>
              Activate Treatment Plan?
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Activating this plan locks its baseline roadmap and goals into the patient's legal medical record.
              All draft goals will immediately transition to active.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowActivateModal(false)}
                disabled={isProcessing}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActivate}
                disabled={isProcessing}
                style={{
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                }}
              >
                {isProcessing ? 'Activating...' : 'Confirm Activation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {showPauseModal && (
        <div className="print:hidden"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.75rem',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1rem 0', color: '#0f172a' }}>
              Pause Treatment Plan
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1rem' }}>
              Temporarily halt active progress on this plan (e.g. patient illness, travel, or surgical hold).
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                Reason for Pause (Optional)
              </label>
              <textarea
                rows={2}
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="e.g. Intercurrent viral illness; paused for 2 weeks"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowPauseModal(false)}
                disabled={isProcessing}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePause}
                disabled={isProcessing}
                style={{
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#ea580c',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                }}
              >
                {isProcessing ? 'Pausing...' : 'Confirm Pause'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="print:hidden"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.75rem',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1rem 0', color: '#0f172a' }}>
              Complete Treatment Plan
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1rem' }}>
              Mark this treatment plan as successfully completed. This moves the plan to a terminal state.
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                Completion Summary Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="Summary of patient rehabilitation outcomes achieved..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                disabled={isProcessing}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={isProcessing}
                style={{
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                }}
              >
                {isProcessing ? 'Completing...' : 'Mark Completed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discontinue Modal */}
      {showDiscontinueModal && (
        <div className="print:hidden"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.75rem',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1rem 0', color: '#991b1b' }}>
              Discontinue Treatment Plan
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1rem' }}>
              A clinical justification reason is strictly required when discontinuing an active or draft Treatment Plan.
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                Clinical Justification Reason <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows={3}
                value={discontinueReason}
                onChange={(e) => setDiscontinueReason(e.target.value)}
                placeholder="e.g. Re-injury required surgical intervention; superseded by revised protocol"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowDiscontinueModal(false)}
                disabled={isProcessing}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDiscontinue}
                disabled={isProcessing || !discontinueReason.trim()}
                style={{
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: isProcessing || !discontinueReason.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {isProcessing ? 'Discontinuing...' : 'Confirm Discontinuation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoalModal && (
        <div className="print:hidden"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '540px',
              width: '100%',
              padding: '1.75rem',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1rem 0', color: '#0f172a' }}>
              Add Clinical Goal
            </h3>

            <form onSubmit={handleAddGoal} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Goal Statement <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Symmetrical quad strength index ≥ 90%"
                  value={newGoalStatement}
                  onChange={(e) => setNewGoalStatement(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Category
                  </label>
                  <select
                    value={newGoalCategory}
                    onChange={(e) => setNewGoalCategory(e.target.value as TreatmentGoalCategory)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      fontSize: '0.875rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    <option value="range_of_motion">Range of Motion</option>
                    <option value="strength">Strength</option>
                    <option value="pain_reduction">Pain Reduction</option>
                    <option value="functional">Functional</option>
                    <option value="balance">Balance</option>
                    <option value="mobility">Mobility</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Priority
                  </label>
                  <select
                    value={newGoalPriority}
                    onChange={(e) => setNewGoalPriority(e.target.value as TreatmentGoalPriority)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      fontSize: '0.875rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Baseline Status
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LSI 68%"
                    value={newGoalBaseline}
                    onChange={(e) => setNewGoalBaseline(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      fontSize: '0.875rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Target Milestone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LSI ≥ 90%"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      fontSize: '0.875rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Measurement Method
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Handheld dynamometer"
                    value={newGoalMeasurement}
                    onChange={(e) => setNewGoalMeasurement(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      fontSize: '0.875rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Timeframe (Weeks)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="104"
                    value={newGoalTimeframe}
                    onChange={(e) => setNewGoalTimeframe(e.target.value ? parseInt(e.target.value, 10) : '')}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      fontSize: '0.875rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddGoalModal(false)}
                  disabled={isProcessing}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  style={{
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.875rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isProcessing ? 'Adding...' : 'Add Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goal Evaluation Modal */}
      {evaluatingGoal && (
        <div className="print:hidden"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.75rem',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
              Evaluate Goal Progress
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
              {evaluatingGoal.goal_statement}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Progress Status
                </label>
                <select
                  value={newGoalStatus}
                  onChange={(e) => setNewGoalStatus(e.target.value as TreatmentGoalStatus)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  <option value="achieved">Achieved (Milestone fully met)</option>
                  <option value="partially_achieved">Partially Achieved (Good progress made)</option>
                  <option value="active">Active (Ongoing rehabilitation)</option>
                  <option value="not_achieved">Not Achieved (Unmet during timeframe)</option>
                  <option value="discontinued">Discontinued (No longer indicated)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Clinical Evaluation Notes
                </label>
                <textarea
                  rows={3}
                  value={evaluationNotes}
                  onChange={(e) => setEvaluationNotes(e.target.value)}
                  placeholder="Record current measurements, functional performance, and clinical observations..."
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEvaluatingGoal(null)}
                  disabled={isProcessing}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateGoalStatus}
                  disabled={isProcessing}
                  style={{
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.875rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isProcessing ? 'Saving...' : 'Save Evaluation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
