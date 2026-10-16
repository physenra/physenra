import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  XCircle,
  Printer,
  User,
  FolderKanban,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { hepService } from '../../services/hepService';
import { ExerciseVisualCard } from '../../components/hep/ExerciseVisualCard';
import type {
  HomeExerciseProgramWithRelations,
  HEPStatus,
} from '../../types/models';

export const HEPDetailPage: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();

  const [program, setProgram] = useState<HomeExerciseProgramWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDiscontinueModal, setShowDiscontinueModal] = useState(false);
  const [discontinueReason, setDiscontinueReason] = useState('');
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  const loadProgram = async () => {
    if (!programId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await hepService.getProgramById(programId);
      if (!data) {
        setError('Home Exercise Program not found.');
      } else {
        setProgram(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Home Exercise Program.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProgram();
  }, [programId]);

  // Lifecycle Action Handlers
  const handleActivate = async () => {
    if (!program) return;
    setIsActionSubmitting(true);
    setError(null);
    try {
      await hepService.activateProgram(program.id);
      setShowActivateModal(false);
      setSuccessMessage('Home Exercise Program activated and locked into clinical record.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadProgram();
    } catch (err: any) {
      setError(err.message || 'Failed to activate program.');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handlePause = async () => {
    if (!program) return;
    setIsActionSubmitting(true);
    setError(null);
    try {
      await hepService.pauseProgram(program.id, pauseReason.trim() || undefined);
      setShowPauseModal(false);
      setPauseReason('');
      setSuccessMessage('Home Exercise Program paused.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadProgram();
    } catch (err: any) {
      setError(err.message || 'Failed to pause program.');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleResume = async () => {
    if (!program) return;
    setIsActionSubmitting(true);
    setError(null);
    try {
      await hepService.resumeProgram(program.id);
      setSuccessMessage('Home Exercise Program resumed back to active status.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadProgram();
    } catch (err: any) {
      setError(err.message || 'Failed to resume program.');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!program) return;
    setIsActionSubmitting(true);
    setError(null);
    try {
      await hepService.completeProgram(program.id);
      setShowCompleteModal(false);
      setSuccessMessage('Home Exercise Program marked as completed.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadProgram();
    } catch (err: any) {
      setError(err.message || 'Failed to complete program.');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleDiscontinue = async () => {
    if (!program) return;
    if (!discontinueReason.trim()) {
      setError('A clinical discontinuation reason is strictly required.');
      return;
    }

    setIsActionSubmitting(true);
    setError(null);
    try {
      await hepService.discontinueProgram(program.id, discontinueReason.trim());
      setShowDiscontinueModal(false);
      setDiscontinueReason('');
      setSuccessMessage('Home Exercise Program discontinued.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadProgram();
    } catch (err: any) {
      setError(err.message || 'Failed to discontinue program.');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadgeStyle = (status: HEPStatus) => {
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

  const formatTimestamp = (ts?: string | null) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return ts;
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Loading Home Exercise Program details...
      </div>
    );
  }

  if (error && !program) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '1.5rem',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <AlertCircle size={32} style={{ margin: '0 auto 0.5rem auto' }} />
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>Failed to Load Program</h2>
          <p style={{ margin: '0 0 1rem 0' }}>{error}</p>
          <Link
            to="/app/hep"
            style={{
              color: '#0284c7',
              fontWeight: 600,
              textDecoration: 'underline',
              fontSize: '0.875rem',
            }}
          >
            ← Back to Home Exercise Programs
          </Link>
        </div>
      </div>
    );
  }

  if (!program) return null;

  const clinicianName = program.prescribing_clinician
    ? program.prescribing_clinician.display_name ||
      `${program.prescribing_clinician.first_name || ''} ${program.prescribing_clinician.last_name || ''}`.trim() ||
      'Clinician'
    : 'Prescribing Clinician';

  const finalizerName = program.finalizer
    ? program.finalizer.display_name ||
      `${program.finalizer.first_name || ''} ${program.finalizer.last_name || ''}`.trim() ||
      'Authorized Clinician'
    : null;

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Top Navigation */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          to="/app/hep"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: '#64748b',
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          <ArrowLeft size={16} />
          Back to Exercise Programs
        </Link>

        {/* Print Prescription */}
        <button
          type="button"
          onClick={handlePrint}
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
          Print / Export Prescription
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            padding: '0.875rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '0.875rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Program Header Card */}
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
            marginBottom: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.35rem' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  backgroundColor: '#f1f5f9',
                  color: '#0284c7',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                }}
              >
                {program.program_identifier}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  textTransform: 'capitalize',
                  ...getStatusBadgeStyle(program.status),
                }}
              >
                {program.status}
              </span>
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: '#0f172a' }}>
              {program.title}
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
              Prescribed by {clinicianName} • Issued {formatDate(program.start_date)}
              {program.review_date && ` • Review due ${formatDate(program.review_date)}`}
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Draft Actions */}
            {program.status === 'draft' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowActivateModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <CheckCircle2 size={16} />
                  Activate Prescription
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiscontinueModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 0.875rem',
                    backgroundColor: '#ffffff',
                    color: '#ef4444',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <XCircle size={16} />
                  Discard Draft
                </button>
              </>
            )}

            {/* Active Actions */}
            {program.status === 'active' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowPauseModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 0.875rem',
                    backgroundColor: '#ffffff',
                    color: '#ea580c',
                    border: '1px solid #fed7aa',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <PauseCircle size={16} />
                  Pause Program
                </button>
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 0.875rem',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <CheckCircle2 size={16} />
                  Complete Program
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiscontinueModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 0.875rem',
                    backgroundColor: '#ffffff',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <XCircle size={16} />
                  Discontinue
                </button>
              </>
            )}

            {/* Paused Actions */}
            {program.status === 'paused' && (
              <>
                <button
                  type="button"
                  disabled={isActionSubmitting}
                  onClick={handleResume}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: isActionSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  <PlayCircle size={16} />
                  Resume Program
                </button>
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 0.875rem',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <CheckCircle2 size={16} />
                  Complete Program
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiscontinueModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 0.875rem',
                    backgroundColor: '#ffffff',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <XCircle size={16} />
                  Discontinue
                </button>
              </>
            )}
          </div>
        </div>

        {/* Discontinued Banner if applicable */}
        {program.status === 'discontinued' && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              color: '#991b1b',
              fontSize: '0.875rem',
              marginTop: '0.75rem',
            }}
          >
            <strong>Prescription Discontinued:</strong> {program.discontinued_reason || 'No specific clinical reason recorded.'}
          </div>
        )}

        {/* Completed Banner if applicable */}
        {program.status === 'completed' && (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              color: '#166534',
              fontSize: '0.875rem',
              marginTop: '0.75rem',
            }}
          >
            <strong>Rehabilitation Objective Met:</strong> This home exercise program has reached clinical completion.
          </div>
        )}
      </div>

      {/* Grid of Clinical Relationships */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Patient Card */}
        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#0284c7' }}>
            <User size={18} />
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>Patient Details</h3>
          </div>
          {program.patient ? (
            <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Name</span>
                <Link to={`/app/patients/${program.patient.id}`} style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
                  {program.patient.first_name} {program.patient.last_name}
                </Link>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Identifier</span>
                <span style={{ fontFamily: 'monospace' }}>{program.patient.patient_identifier}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Contact</span>
                <span>{program.patient.phone || program.patient.email || '—'}</span>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>No patient record linked.</p>
          )}
        </div>

        {/* Episode of Care Card */}
        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#0284c7' }}>
            <FolderKanban size={18} />
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>Episode of Care</h3>
          </div>
          {program.episode ? (
            <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Title</span>
                <Link to={`/app/episodes/${program.episode.id}`} style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
                  {program.episode.title}
                </Link>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Episode ID</span>
                <span style={{ fontFamily: 'monospace' }}>{program.episode.episode_identifier}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Status</span>
                <span style={{ textTransform: 'capitalize' }}>{program.episode.status}</span>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Standalone program (no episode linked).</p>
          )}
        </div>

        {/* Clinical Visit Provenance Card */}
        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#0284c7' }}>
            <Activity size={18} />
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>Clinical Visit Link</h3>
          </div>
          {program.clinical_visit ? (
            <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Visit Reference</span>
                <Link to={`/app/visits/${program.clinical_visit.id}`} style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
                  {program.clinical_visit.visit_identifier}
                </Link>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Encounter Date</span>
                <span>{formatDate(program.clinical_visit.actual_start)}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Status</span>
                <span style={{ textTransform: 'capitalize' }}>{program.clinical_visit.status}</span>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
              Stand-alone prescription (not issued during an in-person clinical visit).
            </p>
          )}
        </div>
      </div>

      {/* General Instructions Card */}
      {program.instructions && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
            General Rehabilitation & Safety Instructions
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {program.instructions}
          </p>
        </div>
      )}

      {/* Prescribed Exercises Section */}
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
            alignItems: 'center',
            marginBottom: '1rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.5rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
              Prescribed Exercise Regimen ({program.items?.length || 0})
            </h2>
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              Individual exercises, dosage specifications, technique cues, and precautions.
            </span>
          </div>
        </div>

        {!program.items || program.items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.875rem' }}>
            No exercises prescribed for this program.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {program.items.map((item) => (
              <div
                key={item.id}
                className="hep-exercise-card"
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  backgroundColor: '#fbfcfd',
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid',
                }}
              >
                {/* Exercise Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    marginBottom: '0.75rem',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.order_index}
                  </span>
                  <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                    {item.exercise ? item.exercise.name : 'Prescribed Exercise'}
                  </strong>

                  {item.exercise && (
                    <>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          textTransform: 'capitalize',
                        }}
                      >
                        {item.exercise.category.replace('_', ' ')}
                      </span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          textTransform: 'capitalize',
                        }}
                      >
                        {item.exercise.body_region.replace('_', ' ')}
                      </span>
                    </>
                  )}

                  {item.laterality && item.laterality !== 'na' && (
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        textTransform: 'capitalize',
                      }}
                    >
                      {item.laterality} side
                    </span>
                  )}
                </div>

                {/* Exercise Content: Visual Illustration & Dosage Parameters */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '1.25rem',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Left Column: Clinical Vector Illustration & Movement Phases */}
                  <div style={{ flex: '0 0 auto', width: '220px', maxWidth: '100%' }}>
                    <ExerciseVisualCard
                      exerciseId={item.exercise_id}
                      exerciseName={item.exercise?.name || 'Prescribed Exercise'}
                      bodyRegion={item.exercise?.body_region || 'other'}
                      category={item.exercise?.category}
                      size="md"
                      showPhases={true}
                      showApprovalBadge={true}
                    />
                  </div>

                  {/* Right Column: Dosage Parameters Grid & Clinical Cues */}
                  <div style={{ flex: '1 1 300px', minWidth: '240px' }}>
                    {/* Dosage Parameters Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                        gap: '0.75rem',
                        marginBottom: '0.75rem',
                        backgroundColor: '#ffffff',
                        padding: '0.75rem 1rem',
                        borderRadius: '6px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Sets</span>
                        <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>{item.sets ?? '—'}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Reps</span>
                        <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>{item.repetitions ?? '—'}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Hold Time</span>
                        <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                          {item.hold_seconds ? `${item.hold_seconds}s` : '—'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Frequency</span>
                        <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>{item.frequency || 'Daily'}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Resistance / Load</span>
                        <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>{item.intensity_load || 'Bodyweight'}</strong>
                      </div>
                      {item.rest_seconds && (
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Rest Period</span>
                          <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>{item.rest_seconds}s</strong>
                        </div>
                      )}
                    </div>

                    {/* Patient Instructions & Precautions */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', fontSize: '0.8125rem' }}>
                      {item.instructions && (
                        <div style={{ backgroundColor: '#f8fafc', padding: '0.625rem 0.75rem', borderRadius: '6px' }}>
                          <strong style={{ color: '#0369a1', display: 'block', marginBottom: '0.15rem' }}>
                            Patient Cues &amp; Instructions:
                          </strong>
                          <span style={{ color: '#334155' }}>{item.instructions}</span>
                        </div>
                      )}

                      {item.precautions && (
                        <div style={{ backgroundColor: '#fef2f2', padding: '0.625rem 0.75rem', borderRadius: '6px' }}>
                          <strong style={{ color: '#b91c1c', display: 'block', marginBottom: '0.15rem' }}>
                            Precautions &amp; Warnings:
                          </strong>
                          <span style={{ color: '#7f1d1d' }}>{item.precautions}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit & Finalization Provenance */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
          fontSize: '0.8125rem',
          color: '#64748b',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
        }}
      >
        <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Clinical Provenance & Audit Trail</div>
        <div>Created: {formatTimestamp(program.created_at)}</div>
        {program.finalized_at && (
          <div>
            Finalized & Locked: {formatTimestamp(program.finalized_at)}
            {finalizerName && ` by ${finalizerName}`}
          </div>
        )}
        <div>Last Updated: {formatTimestamp(program.updated_at || program.created_at)}</div>
      </div>

      {/* Modal: Activate */}
      {showActivateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>
              Activate Exercise Program?
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Activating this program locks the prescribed exercise items into the official patient clinical record.
              Dosage parameters cannot be deleted or mutated after activation.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={isActionSubmitting}
                onClick={() => setShowActivateModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActionSubmitting}
                onClick={handleActivate}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: isActionSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isActionSubmitting ? 'Activating...' : 'Confirm Activation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pause */}
      {showPauseModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>
              Pause Exercise Program
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, marginBottom: '1rem' }}>
              Temporarily suspend the patient’s home exercise routine (e.g. acute symptom flare-up, illness).
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                Reason for Pause (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Temporary rest due to systemic illness"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8125rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={isActionSubmitting}
                onClick={() => setShowPauseModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActionSubmitting}
                onClick={handlePause}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  backgroundColor: '#ea580c',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: isActionSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isActionSubmitting ? 'Pausing...' : 'Confirm Pause'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Complete */}
      {showCompleteModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>
              Mark Program as Completed?
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              This will transition the program to terminal <strong>Completed</strong> status, signifying that the patient has
              achieved the intended rehabilitation milestones.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={isActionSubmitting}
                onClick={() => setShowCompleteModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActionSubmitting}
                onClick={handleComplete}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: isActionSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isActionSubmitting ? 'Completing...' : 'Mark Completed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Discontinue */}
      {showDiscontinueModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#dc2626' }}>
              Discontinue Exercise Program
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, marginBottom: '1rem' }}>
              Discontinuing ends this prescription permanently. A clinical justification reason is strictly required.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                Discontinuation Reason <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Adverse reaction to abduction exercises; patient transitioned to modified hydrotherapy protocol"
                value={discontinueReason}
                onChange={(e) => setDiscontinueReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8125rem',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={isActionSubmitting}
                onClick={() => setShowDiscontinueModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActionSubmitting || !discontinueReason.trim()}
                onClick={handleDiscontinue}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: isActionSubmitting || !discontinueReason.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {isActionSubmitting ? 'Discontinuing...' : 'Confirm Discontinuation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
