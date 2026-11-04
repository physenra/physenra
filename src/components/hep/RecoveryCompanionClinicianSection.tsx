import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Key,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import {
  recoveryCompanionService,
  RecoveryClinicianSummary,
  FollowUpAction,
} from '../../services/recoveryCompanionService';
import type { HEPStatus } from '../../types/models';

interface RecoveryCompanionClinicianSectionProps {
  programId: string;
  programStatus: HEPStatus;
  patientName: string;
}

export const RecoveryCompanionClinicianSection: React.FC<RecoveryCompanionClinicianSectionProps> = ({
  programId,
  programStatus,
  patientName,
}) => {
  const [summary, setSummary] = useState<RecoveryClinicianSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generating code
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [newlyGeneratedCode, setNewlyGeneratedCode] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Reviewing check-in
  const [reviewingCheckInId, setReviewingCheckInId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<FollowUpAction>('acknowledged');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const loadSummary = useCallback(async () => {
    if (programStatus !== 'active' && programStatus !== 'completed' && programStatus !== 'paused') {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await recoveryCompanionService.getCheckInSummary(programId);
      setSummary(data);
    } catch (err: any) {
      console.warn('Could not load check-in summary:', err.message);
      setError('Unable to load patient check-in telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, [programId, programStatus]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    setError(null);
    try {
      const result = await recoveryCompanionService.generateAccessCode(programId, 30);
      setNewlyGeneratedCode(result.access_code);
      await loadSummary();
    } catch (err: any) {
      setError(err.message || 'Failed to generate access code.');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCopyCode = () => {
    if (!newlyGeneratedCode) return;
    navigator.clipboard.writeText(newlyGeneratedCode);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 3000);
  };

  const handleReviewCheckIn = async (checkInId: string) => {
    setIsSubmittingReview(true);
    setError(null);
    try {
      await recoveryCompanionService.reviewCheckIn(checkInId, reviewNotes, reviewAction);
      setReviewingCheckInId(null);
      setReviewNotes('');
      setReviewAction('acknowledged');
      await loadSummary();
    } catch (err: any) {
      setError(err.message || 'Failed to record check-in review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Only render section for active, completed, or paused programs
  if (programStatus === 'draft' || programStatus === 'discontinued') {
    return null;
  }

  const checkIns = summary?.check_ins || [];

  return (
    <div
      className="print:hidden"
      style={{
        marginTop: '2rem',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '1rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Recovery Companion & Patient Check-Ins
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.125rem 0 0 0' }}>
              Remote session adherence tracking, symptom ratings, and clinician review.
            </p>
          </div>
        </div>

        <button
          onClick={loadSummary}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.375rem 0.625rem',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: '#475569',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '0.75rem',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Access Code Generation / Status Card */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Patient Mobile Access
            </div>
            <div style={{ fontSize: '0.875rem', color: '#334155', marginTop: '0.25rem' }}>
              {summary?.active_access_code ? (
                <span>
                  Active Access Code Hint: <strong>{summary.active_access_code.display_hint}</strong> (Expires: {new Date(summary.active_access_code.expires_at).toLocaleDateString()})
                </span>
              ) : (
                <span style={{ color: '#64748b' }}>No active access code currently generated for this patient.</span>
              )}
            </div>
          </div>

          <button
            onClick={handleGenerateCode}
            disabled={isGeneratingCode || programStatus !== 'active'}
            style={{
              padding: '0.5rem 0.875rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.8125rem',
              cursor: isGeneratingCode || programStatus !== 'active' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            <Key size={14} />
            {summary?.active_access_code ? 'Reissue Access Code' : 'Generate Access Code'}
          </button>
        </div>

        {/* Display freshly generated code once */}
        {newlyGeneratedCode && (
          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '6px',
            }}
          >
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>
              New Access Code Generated for {patientName}:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: '#065f46',
                  backgroundColor: '#ffffff',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #a7f3d0',
                }}
              >
                {newlyGeneratedCode}
              </div>
              <button
                onClick={handleCopyCode}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.375rem 0.75rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #a7f3d0',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#065f46',
                  cursor: 'pointer',
                }}
              >
                {hasCopied ? <Check size={14} /> : <Copy size={14} />}
                {hasCopied ? 'Copied' : 'Copy Code'}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#047857', margin: '0.5rem 0 0 0' }}>
              Instruct the patient to open <strong>physenra.com/recovery</strong> on any smartphone or tablet and enter this code. No app installation or account signup required.
            </p>
          </div>
        )}
      </div>

      {/* Adherence & Key Metrics Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ backgroundColor: '#f8fafc', padding: '0.875rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Completed</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
            {summary?.total_sessions || 0}
          </div>
        </div>

        <div style={{ backgroundColor: '#f8fafc', padding: '0.875rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Last Session</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', marginTop: '0.25rem' }}>
            {summary?.last_check_in ? (
              summary.days_since_last_check_in === 0
                ? 'Today'
                : `${summary.days_since_last_check_in} days ago`
            ) : (
              'None yet'
            )}
          </div>
        </div>

        <div style={{ backgroundColor: '#f8fafc', padding: '0.875rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Latest Pain</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: summary?.latest_pain !== null && summary?.latest_pain !== undefined && summary.latest_pain >= 7 ? '#dc2626' : '#0f172a', marginTop: '0.25rem' }}>
            {summary?.latest_pain !== null && summary?.latest_pain !== undefined ? `${summary.latest_pain}/10` : '—'}
          </div>
        </div>

        <div style={{ backgroundColor: '#f8fafc', padding: '0.875rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Latest Effort</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: summary?.latest_difficulty === 'hard' || summary?.latest_difficulty === 'very_hard' ? '#d97706' : '#0f172a', marginTop: '0.25rem' }}>
            {summary?.latest_difficulty ? summary.latest_difficulty.replace('_', ' ') : '—'}
          </div>
        </div>
      </div>

      {/* Clinical Attention Indicators (Non-diagnostic, observational only) */}
      {summary?.high_difficulty_flag && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8125rem',
            color: '#92400e',
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Observational Note:</strong> Patient reported high difficulty or elevated pain ({summary.latest_pain}/10) in their most recent check-in. Review their exercises to determine if dosage modification is needed.
          </span>
        </div>
      )}

      {summary?.inactivity_flag && summary.total_sessions > 0 && (
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8125rem',
            color: '#475569',
          }}
        >
          <Clock size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Adherence Notice:</strong> Patient has not recorded an exercise session in over 3 days.
          </span>
        </div>
      )}

      {/* Check-In History & Review Workflow */}
      <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.75rem 0' }}>
        Patient Check-In Records ({checkIns.length})
      </h4>

      {checkIns.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '2rem 1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            color: '#64748b',
            fontSize: '0.8125rem',
          }}
        >
          No check-ins recorded yet. Once the patient logs a session in the Recovery Companion, it will appear here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {checkIns.map((ci) => (
            <div
              key={ci.id}
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={14} style={{ color: '#64748b' }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                    {new Date(ci.completed_at).toLocaleDateString()} at {new Date(ci.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {ci.pain_rating !== null && (
                    <span
                      style={{
                        padding: '0.125rem 0.375rem',
                        borderRadius: '4px',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        backgroundColor: ci.pain_rating >= 7 ? '#fee2e2' : '#f1f5f9',
                        color: ci.pain_rating >= 7 ? '#dc2626' : '#475569',
                      }}
                    >
                      Pain: {ci.pain_rating}/10
                    </span>
                  )}
                  {ci.difficulty_rating && (
                    <span
                      style={{
                        padding: '0.125rem 0.375rem',
                        borderRadius: '4px',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                      }}
                    >
                      Effort: {ci.difficulty_rating.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Patient Notes */}
              {ci.patient_notes && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.8125rem',
                    color: '#334155',
                    fontStyle: 'italic',
                    marginBottom: '0.5rem',
                  }}
                >
                  "{ci.patient_notes}"
                </div>
              )}

              {/* Exercises Completed Count */}
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                Completed {ci.completed_exercises.length} prescribed exercises.
              </div>

              {/* Review Status & Actions */}
              {ci.clinician_reviewed_at ? (
                <div
                  style={{
                    backgroundColor: '#ecfdf5',
                    borderLeft: '3px solid #059669',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0 6px 6px 0',
                    fontSize: '0.75rem',
                    color: '#065f46',
                  }}
                >
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle2 size={12} />
                    Reviewed by {ci.reviewer_name || 'Clinician'} on {new Date(ci.clinician_reviewed_at).toLocaleDateString()}
                  </div>
                  {ci.clinician_follow_up_action && (
                    <div style={{ marginTop: '0.25rem' }}>
                      Action: <strong>{ci.clinician_follow_up_action.replace(/_/g, ' ')}</strong>
                    </div>
                  )}
                  {ci.clinician_feedback_notes && (
                    <div style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>
                      "{ci.clinician_feedback_notes}"
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {reviewingCheckInId === ci.id ? (
                    <div
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '0.75rem',
                        marginTop: '0.5rem',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                        Clinical Follow-up Action:
                      </div>
                      <select
                        value={reviewAction}
                        onChange={(e) => setReviewAction(e.target.value as FollowUpAction)}
                        style={{
                          width: '100%',
                          padding: '0.375rem',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.75rem',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <option value="acknowledged">Acknowledge (No Action Required)</option>
                        <option value="follow_up_planned">Follow-Up Call/Review Planned</option>
                        <option value="regimen_review_needed">Exercise Regimen Review Needed</option>
                        <option value="no_action_needed">Continue Current Dosage</option>
                      </select>

                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Internal clinician review notes (optional)..."
                        maxLength={1000}
                        style={{
                          width: '100%',
                          padding: '0.375rem',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.75rem',
                          boxSizing: 'border-box',
                          minHeight: '50px',
                          marginBottom: '0.5rem',
                        }}
                      />

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleReviewCheckIn(ci.id)}
                          disabled={isSubmittingReview}
                          style={{
                            padding: '0.375rem 0.625rem',
                            backgroundColor: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: isSubmittingReview ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isSubmittingReview ? 'Signing...' : 'Sign Off Review'}
                        </button>
                        <button
                          onClick={() => setReviewingCheckInId(null)}
                          style={{
                            padding: '0.375rem 0.625rem',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setReviewingCheckInId(ci.id);
                        setReviewNotes('');
                        setReviewAction('acknowledged');
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#2563eb',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <UserCheck size={12} />
                      Review & Sign Off
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
