import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { clinicalVisitService } from '../../services/clinicalVisitService';
import type {
  ClinicalVisitWithRelations,
  ClinicalVisitStatus,
  ClinicalVisitLocationMode,
} from '../../types/models';

export const ClinicalVisitDetailPage: React.FC = () => {
  const { visitId } = useParams<{ visitId: string }>();

  const [visit, setVisit] = useState<ClinicalVisitWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transition Modals
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');
  const [completeEndTime, setCompleteEndTime] = useState(new Date().toISOString().slice(0, 16));

  const [isUpdating, setIsUpdating] = useState(false);

  const loadVisit = async () => {
    if (!visitId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await clinicalVisitService.getClinicalVisitById(visitId);
      if (!data) {
        setError('Clinical visit not found.');
      } else {
        setVisit(data);
        if (data.encounter_notes) {
          setCompleteNotes(data.encounter_notes);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load clinical visit.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVisit();
  }, [visitId]);

  const handleStartEncounter = async () => {
    if (!visit) return;
    setIsUpdating(true);
    setError(null);
    try {
      await clinicalVisitService.startEncounter(visit.id);
      await loadVisit();
    } catch (err: any) {
      setError(err.message || 'Failed to start encounter.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompleteEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visit) return;
    setIsUpdating(true);
    setError(null);
    try {
      const endIso = completeEndTime ? new Date(completeEndTime).toISOString() : new Date().toISOString();
      await clinicalVisitService.completeEncounter(visit.id, endIso, completeNotes.trim() || undefined);
      setIsCompleteModalOpen(false);
      await loadVisit();
    } catch (err: any) {
      setError(err.message || 'Failed to complete encounter.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkIncomplete = async () => {
    if (!visit) return;
    const reason = window.prompt('Please enter a reason or context for marking this visit incomplete:');
    if (reason === null) return; // user cancelled prompt

    setIsUpdating(true);
    setError(null);
    try {
      await clinicalVisitService.markIncomplete(visit.id, reason.trim() || undefined);
      await loadVisit();
    } catch (err: any) {
      setError(err.message || 'Failed to mark visit incomplete.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visit) return;
    if (!cancelReason.trim()) {
      setError('Please provide a reason for cancelling this clinical visit.');
      return;
    }

    setIsUpdating(true);
    setError(null);
    try {
      await clinicalVisitService.cancelClinicalVisit(visit.id, cancelReason.trim());
      setIsCancelModalOpen(false);
      await loadVisit();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel clinical visit.');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatStatusBadge = (status: ClinicalVisitStatus) => {
    const styles: Record<ClinicalVisitStatus, { bg: string; text: string; label: string }> = {
      scheduled: { bg: '#e0f2fe', text: '#0369a1', label: 'Scheduled' },
      in_progress: { bg: '#fef3c7', text: '#92400e', label: 'In Progress' },
      completed: { bg: '#dcfce7', text: '#15803d', label: 'Completed' },
      incomplete: { bg: '#fee2e2', text: '#991b1b', label: 'Incomplete' },
      cancelled: { bg: '#f1f5f9', text: '#475569', label: 'Cancelled' },
    };
    const s = styles[status] || { bg: '#f1f5f9', text: '#475569', label: status };
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: '0.8125rem',
          fontWeight: 600,
          backgroundColor: s.bg,
          color: s.text,
        }}
      >
        {s.label}
      </span>
    );
  };

  const formatLocationMode = (mode: ClinicalVisitLocationMode) => {
    const labels: Record<ClinicalVisitLocationMode, string> = {
      clinic: 'In-Clinic',
      home: 'Home Visit',
      telehealth: 'Telehealth',
      other: 'Other',
    };
    return labels[mode] || mode;
  };

  const formatTimestamp = (isoString: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  if (isLoading) {
    return (
      <div className="page-container" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        Loading clinical visit...
      </div>
    );
  }

  if (error && !visit) {
    return (
      <div className="page-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
        <Link to="/app/visits" style={{ color: '#0284c7', textDecoration: 'none' }}>
          &larr; Back to Clinical Visits
        </Link>
      </div>
    );
  }

  if (!visit) return null;

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Back Link */}
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/app/visits" style={{ color: '#0284c7', textDecoration: 'none', fontSize: '0.875rem' }}>
          &larr; Back to Clinical Visits
        </Link>
      </div>

      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          backgroundColor: '#fff',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{visit.visit_identifier}</h1>
            {formatStatusBadge(visit.status)}
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            Location: <strong>{formatLocationMode(visit.location_mode)}</strong> &bull; Clinician:{' '}
            <strong>
              {visit.physiotherapist?.display_name ||
                (visit.physiotherapist?.first_name
                  ? `${visit.physiotherapist.first_name} ${visit.physiotherapist.last_name || ''}`
                  : 'Assigned Clinician')}
            </strong>
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {visit.status === 'scheduled' && (
            <>
              <button
                onClick={handleStartEncounter}
                disabled={isUpdating}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                }}
              >
                Start Encounter
              </button>
              <button
                onClick={() => setIsCancelModalOpen(true)}
                disabled={isUpdating}
                style={{
                  backgroundColor: '#fff',
                  color: '#ef4444',
                  border: '1px solid #fca5a5',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel Visit
              </button>
            </>
          )}

          {visit.status === 'in_progress' && (
            <>
              <button
                onClick={() => {
                  setCompleteEndTime(new Date().toISOString().slice(0, 16));
                  setIsCompleteModalOpen(true);
                }}
                disabled={isUpdating}
                style={{
                  backgroundColor: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                }}
              >
                Complete Encounter
              </button>
              <button
                onClick={handleMarkIncomplete}
                disabled={isUpdating}
                style={{
                  backgroundColor: '#fff',
                  color: '#d97706',
                  border: '1px solid #fcd34d',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                }}
              >
                Mark Incomplete
              </button>
              <button
                onClick={() => setIsCancelModalOpen(true)}
                disabled={isUpdating}
                style={{
                  backgroundColor: '#fff',
                  color: '#ef4444',
                  border: '1px solid #fca5a5',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel Visit
              </button>
            </>
          )}

          {visit.status === 'incomplete' && (
            <>
              <button
                onClick={handleStartEncounter}
                disabled={isUpdating}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                }}
              >
                Resume Encounter
              </button>
              <button
                onClick={() => setIsCancelModalOpen(true)}
                disabled={isUpdating}
                style={{
                  backgroundColor: '#fff',
                  color: '#ef4444',
                  border: '1px solid #fca5a5',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel Visit
              </button>
            </>
          )}

          {(visit.status === 'completed' || visit.status === 'cancelled') && (
            <span style={{ fontSize: '0.8125rem', color: '#64748b', alignSelf: 'center' }}>
              Encounter record is terminal and immutable.
            </span>
          )}
        </div>
      </div>

      {/* Domain Separation Notice */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '0.875rem 1rem',
          marginBottom: '1.5rem',
          fontSize: '0.8125rem',
          color: '#475569',
        }}
      >
        <strong>Clinical Architecture Rule:</strong> Clinical Visit records the actual encounter execution and timing.
        Clinical evaluation and SOAP note documentation belong to the upcoming dedicated Clinical Note domain. This
        encounter does not deduct patient wallet credits or package sessions.
      </div>

      {/* Cancellation Banner */}
      {visit.status === 'cancelled' && (
        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <strong style={{ color: '#991b1b', display: 'block', marginBottom: '0.25rem' }}>Encounter Cancelled</strong>
          <p style={{ margin: 0, color: '#7f1d1d', fontSize: '0.875rem' }}>
            Reason: {visit.cancellation_reason || 'No cancellation reason specified.'}
          </p>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Grid of Encounter Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Timing Card */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            Encounter Timing
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Actual Start</span>
              <strong style={{ color: '#1e293b' }}>{formatTimestamp(visit.actual_start)}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Actual End</span>
              <strong style={{ color: '#1e293b' }}>{formatTimestamp(visit.actual_end)}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Recorded Duration</span>
              <strong style={{ color: '#1e293b' }}>
                {visit.duration_minutes ? `${visit.duration_minutes} minutes` : 'In progress / Not finalized'}
              </strong>
            </div>
          </div>
        </div>

        {/* Patient Details Card */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            Patient Information
          </h2>
          {visit.patient ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Full Name</span>
                <Link to={`/app/patients/${visit.patient.id}`} style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
                  {visit.patient.first_name} {visit.patient.last_name}
                </Link>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Identifier</span>
                <span>{visit.patient.patient_identifier}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Contact</span>
                <span>{visit.patient.phone || visit.patient.email || '—'}</span>
              </div>
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No patient information linked.</p>
          )}
        </div>

        {/* Episode of Care Card */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            Episode of Care
          </h2>
          {visit.episode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Episode Title</span>
                <Link to={`/app/episodes/${visit.episode.id}`} style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
                  {visit.episode.title}
                </Link>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Identifier</span>
                <span>{visit.episode.episode_identifier}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Episode Status</span>
                <span>{visit.episode.status}</span>
              </div>
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Standalone encounter (not attached to a specific episode of care).
            </p>
          )}
        </div>

        {/* Linked Appointment Card */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            Scheduled Appointment
          </h2>
          {visit.appointment ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Appointment Ref</span>
                <Link to={`/app/appointments/${visit.appointment.id}`} style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
                  {visit.appointment.appointment_identifier}
                </Link>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Scheduled Time</span>
                <span>
                  {formatTimestamp(visit.appointment.scheduled_start)} - {formatTimestamp(visit.appointment.scheduled_end)}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Appointment Status</span>
                <span>{visit.appointment.status}</span>
              </div>
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Unscheduled / Walk-in encounter (no prior appointment booked).
            </p>
          )}
        </div>
      </div>

      {/* Operational Notes Card */}
      <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '0.75rem' }}>
          Encounter Notes (Operational)
        </h2>
        <p style={{ color: '#334155', fontSize: '0.875rem', whiteSpace: 'pre-wrap', margin: 0 }}>
          {visit.encounter_notes || 'No operational encounter notes recorded.'}
        </p>
      </div>

      {/* Complete Encounter Modal */}
      {isCompleteModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 0, marginBottom: '1rem' }}>Complete Encounter</h2>
            <form onSubmit={handleCompleteEncounter}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Encounter End Time <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  value={completeEndTime}
                  onChange={(e) => setCompleteEndTime(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Operational Encounter Notes
                </label>
                <textarea
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  rows={3}
                  placeholder="Encounter wrap-up operational notes..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  style={{ backgroundColor: '#16a34a', color: '#fff', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', fontWeight: 600 }}
                >
                  {isUpdating ? 'Completing...' : 'Confirm Completion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Visit Modal */}
      {isCancelModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 0, marginBottom: '0.5rem', color: '#991b1b' }}>
              Cancel Clinical Visit
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
              Are you sure you want to cancel this clinical visit? Cancelled visits are retained for auditing purposes.
            </p>
            <form onSubmit={handleCancelVisit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Cancellation Reason <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="Enter reason for cancellation..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  style={{ backgroundColor: '#dc2626', color: '#fff', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', fontWeight: 600 }}
                >
                  {isUpdating ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
