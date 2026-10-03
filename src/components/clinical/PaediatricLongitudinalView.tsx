import React, { useState, useEffect } from 'react';
import {
  clinicalAssessmentService,
  formatPaediatricAge,
} from '../../services/clinicalAssessmentService';
import type { ClinicalAssessmentInstanceWithRelations } from '../../types/models';

export interface PaediatricLongitudinalViewProps {
  patientId: string;
  patientDob?: string | null;
  onSelectAssessment?: (assessment: ClinicalAssessmentInstanceWithRelations) => void;
}

export const PaediatricLongitudinalView: React.FC<PaediatricLongitudinalViewProps> = ({
  patientId,
  patientDob,
  onSelectAssessment,
}) => {
  const [assessments, setAssessments] = useState<ClinicalAssessmentInstanceWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const data = await clinicalAssessmentService.getAssessmentsForPatient(patientId, 'paediatric');
        setAssessments(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load longitudinal paediatric assessments.');
      } finally {
        setIsLoading(false);
      }
    }

    if (patientId) {
      loadData();
    }
  }, [patientId]);

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        Loading historical paediatric documentation...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem' }}>
        {error}
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px dashed #cbd5e1',
          color: '#64748b',
        }}
      >
        <p style={{ margin: 0, fontWeight: 500 }}>No paediatric assessments recorded for this patient.</p>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>
          Document a paediatric examination during an active encounter to track longitudinal developmental progression.
        </p>
      </div>
    );
  }

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return 'N/A';
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#064e3b', margin: 0 }}>
          Longitudinal Paediatric Examinations ({assessments.length})
        </h3>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Chronological record &bull; Observational developmental findings
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {assessments.map((a) => {
          const data = (a.structured_data || {}) as Record<string, any>;
          const isExpanded = expandedId === a.id;
          const ageAtExam = patientDob
            ? formatPaediatricAge(patientDob, new Date(a.performed_at))
            : 'Age unknown';

          return (
            <div
              key={a.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              {/* Header row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.875rem' }}>
                      {a.assessment_identifier}
                    </span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                      {a.definition?.name || 'Paediatric Exam'}
                    </span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        textTransform: 'capitalize',
                        backgroundColor: a.status === 'draft' ? '#fef3c7' : '#dcfce7',
                        color: a.status === 'draft' ? '#92400e' : '#166534',
                      }}
                    >
                      {a.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Date: {formatDateTime(a.performed_at)} &bull; Age at Exam: <strong>{ageAtExam}</strong> &bull; Assessor: {a.assessor?.display_name || 'Clinician'} &bull; Visit: {a.clinical_visit?.visit_identifier || 'Encounter'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    {isExpanded ? 'Hide Details' : 'View Full Findings'}
                  </button>
                  {onSelectAssessment && (
                    <button
                      type="button"
                      onClick={() => onSelectAssessment(a)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid #059669',
                        backgroundColor: '#ecfdf5',
                        color: '#065f46',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Open
                    </button>
                  )}
                </div>
              </div>

              {/* High-level Clinical Matrix Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '0.5rem',
                  backgroundColor: '#f8fafc',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Sitting Milestone:</span>
                  <strong style={{ color: '#1e293b' }}>{data.milestone_sitting || 'N/A'}</strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Walking Milestone:</span>
                  <strong style={{ color: '#1e293b' }}>{data.milestone_walking || 'N/A'}</strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Floor Mobility:</span>
                  <strong style={{ color: '#1e293b' }}>{data.floor_mobility || 'N/A'}</strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Muscle Tone:</span>
                  <strong style={{ color: '#1e293b' }}>{data.general_muscle_tone || 'N/A'}</strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Ambulation Status:</span>
                  <strong style={{ color: '#1e293b' }}>{data.walking_mobility || 'N/A'}</strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Symmetry:</span>
                  <strong style={{ color: '#1e293b' }}>{data.gross_motor_symmetry || 'N/A'}</strong>
                </div>
              </div>

              {/* Summary note snippet */}
              {a.summary_findings && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#475569' }}>
                  <strong>Summary:</strong> {a.summary_findings}
                </div>
              )}

              {/* Expanded Detailed Accordion */}
              {isExpanded && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #e2e8f0',
                    fontSize: '0.8125rem',
                  }}
                >
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#0f172a' }}>
                    Full Structured Findings (Version {a.definition_version})
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Milestones Detail:</span>
                      <div>Head Control: <strong>{data.milestone_head_control || 'NT'}</strong></div>
                      <div>Rolling: <strong>{data.milestone_rolling || 'NT'}</strong></div>
                      <div>Crawling: <strong>{data.milestone_crawling || 'NT'}</strong></div>
                      <div>Standing: <strong>{data.milestone_standing || 'NT'}</strong></div>
                    </div>

                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Fine Motor & Play:</span>
                      <div>Reaching: <strong>{data.reaching_targeting || 'NT'}</strong></div>
                      <div>Grasp: <strong>{data.grasp_release || 'NT'}</strong></div>
                      <div>Play Engagement: <strong>{data.play_engagement || 'NT'}</strong></div>
                    </div>

                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Posture & Balance:</span>
                      <div>Head Alignment: <strong>{data.head_alignment || 'NT'}</strong></div>
                      <div>Spine: <strong>{data.spinal_alignment || 'NT'}</strong></div>
                      <div>Static Balance: <strong>{data.static_balance || 'NT'}</strong></div>
                      <div>Protective Extension: <strong>{data.protective_reactions || 'NT'}</strong></div>
                    </div>

                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Functional Locomotion:</span>
                      <div>Floor to Stand: <strong>{data.floor_to_stand || 'NT'}</strong></div>
                      <div>Device: <strong>{data.assistive_device || 'None'}</strong></div>
                      <div>Stairs: <strong>{data.stair_mobility || 'NT'}</strong></div>
                      <div>Accompanying Carer: <strong>{data.caregiver_present || 'N/A'}</strong></div>
                    </div>
                  </div>

                  {data.caregiver_concerns_goals && (
                    <div style={{ marginTop: '0.75rem', padding: '0.5rem', backgroundColor: '#ecfdf5', borderRadius: '4px' }}>
                      <strong style={{ fontSize: '0.75rem', color: '#065f46' }}>Caregiver-Reported Goals:</strong>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#064e3b' }}>
                        {data.caregiver_concerns_goals}
                      </p>
                    </div>
                  )}

                  {data.clinical_summary && (
                    <div style={{ marginTop: '0.75rem', padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '4px' }}>
                      <strong style={{ fontSize: '0.75rem', color: '#334155' }}>Clinical Examination Summary:</strong>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#1e293b' }}>
                        {data.clinical_summary}
                      </p>
                    </div>
                  )}

                  {a.clinical_notes && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#475569' }}>
                      <strong>Additional Clinician Notes:</strong> {a.clinical_notes}
                    </div>
                  )}

                  {a.status === 'amended' && (
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#fef3c7', borderRadius: '4px', fontSize: '0.75rem', color: '#92400e' }}>
                      <strong>Official Amendment:</strong> {a.amendment_reason || 'Correction recorded.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
