import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { clinicalVisitService } from '../../services/clinicalVisitService';
import { clinicalNoteService } from '../../services/clinicalNoteService';
import { outcomeMeasureService } from '../../services/outcomeMeasureService';
import { hepService } from '../../services/hepService';
import { treatmentPlanService } from '../../services/treatmentPlanService';
import { packageService } from '../../services/packageService';
import { clinicalAssessmentService } from '../../services/clinicalAssessmentService';
import { supabase } from '../../lib/supabase';
import { Ticket } from 'lucide-react';
import { NeurologyAssessmentForm } from '../../components/clinical/NeurologyAssessmentForm';
import { NeurologyLongitudinalView } from '../../components/clinical/NeurologyLongitudinalView';
import type {
  ClinicalVisitWithRelations,
  ClinicalVisitStatus,
  ClinicalVisitLocationMode,
  ClinicalNoteWithRelations,
  OutcomeMeasureAssessmentWithRelations,
  ClinicalAssessmentInstanceWithRelations,
  HomeExerciseProgramWithRelations,
  TreatmentPlanWithRelations,
  PackageEntitlementWithRelations,
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
  const [clinicalNote, setClinicalNote] = useState<ClinicalNoteWithRelations | null>(null);
  const [outcomeAssessments, setOutcomeAssessments] = useState<OutcomeMeasureAssessmentWithRelations[]>([]);
  const [clinicalAssessments, setClinicalAssessments] = useState<ClinicalAssessmentInstanceWithRelations[]>([]);
  const [homeExercisePrograms, setHomeExercisePrograms] = useState<HomeExerciseProgramWithRelations[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlanWithRelations[]>([]);

  // Neurology Assessment Workflow State
  const [isNeuroModalOpen, setIsNeuroModalOpen] = useState(false);
  const [isNeuroLongitudinalOpen, setIsNeuroLongitudinalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<ClinicalAssessmentInstanceWithRelations | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Package Settlement State
  const [consumedPackage, setConsumedPackage] = useState<any | null>(null);
  const [activePackages, setActivePackages] = useState<PackageEntitlementWithRelations[]>([]);
  const [selectedEntitlementId, setSelectedEntitlementId] = useState('');
  const [consumptionNotes, setConsumptionNotes] = useState('');
  const [isConsuming, setIsConsuming] = useState(false);
  const [packageMessage, setPackageMessage] = useState<string | null>(null);

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
        try {
          const note = await clinicalNoteService.getPrimaryNoteForVisit(visitId);
          setClinicalNote(note);
        } catch (noteErr) {
          console.warn('Could not load clinical note for visit:', noteErr);
        }

        try {
          const assessments = await outcomeMeasureService.getAssessmentsForVisit(visitId);
          setOutcomeAssessments(assessments);
        } catch (oaErr) {
          console.warn('Could not load outcome assessments for visit:', oaErr);
        }

        try {
          const cAssessments = await clinicalAssessmentService.getAssessmentsForVisit(visitId);
          setClinicalAssessments(cAssessments);
        } catch (caErr) {
          console.warn('Could not load clinical assessments for visit:', caErr);
        }

        try {
          const programs = await hepService.getProgramsForVisit(visitId);
          setHomeExercisePrograms(programs);
        } catch (hepErr) {
          console.warn('Could not load exercise programs for visit:', hepErr);
        }

        try {
          const plans = await treatmentPlanService.getPlansForVisit(visitId);
          setTreatmentPlans(plans);
        } catch (planErr) {
          console.warn('Could not load treatment plans for visit:', planErr);
        }

        try {
          // Check if this visit has already consumed a package session
          const { data: consumptionData } = await supabase
            .from('package_consumption_ledger')
            .select(`
              *,
              entitlement:package_entitlements!fk_consumption_entitlement_practice (
                id,
                package_number,
                definition:package_definitions!fk_entitlements_definition_practice (
                  name
                )
              )
            `)
            .eq('clinical_visit_id', visitId)
            .maybeSingle();

          setConsumedPackage(consumptionData || null);

          // If not consumed, load active packages for patient
          if (!consumptionData && data.patient_id) {
            const pkgs = await packageService.getPackageEntitlements(undefined, {
              patientId: data.patient_id,
              status: 'active',
            });
            const available = pkgs.filter((p) => (p.remaining_sessions || 0) > 0);
            setActivePackages(available);
            if (available.length > 0) {
              setSelectedEntitlementId(available[0].id);
            }
          }
        } catch (pkgErr) {
          console.warn('Could not load package info for visit:', pkgErr);
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
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) {
        setCurrentUserId(data.user.id);
      }
    });
  }, [visitId]);

  const handleNeuroSaved = async () => {
    setIsNeuroModalOpen(false);
    setEditingAssessment(null);
    if (visitId) {
      try {
        const cAssessments = await clinicalAssessmentService.getAssessmentsForVisit(visitId);
        setClinicalAssessments(cAssessments);
      } catch (caErr) {
        console.warn('Could not reload assessments:', caErr);
      }
    }
  };

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

  const handleConsumePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntitlementId || !visit) return;
    setIsConsuming(true);
    setPackageMessage(null);
    try {
      const res = await packageService.consumePackageSession({
        entitlement_id: selectedEntitlementId,
        clinical_visit_id: visit.id,
        notes: consumptionNotes.trim() || undefined,
      });
      setPackageMessage(`Session consumed from package ${res.package_number}. Remaining: ${res.remaining_sessions}.`);
      await loadVisit();
    } catch (err: any) {
      setPackageMessage(`Consumption failed: ${err.message}`);
    } finally {
      setIsConsuming(false);
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

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { dateStyle: 'medium' });
    } catch {
      return dateStr;
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

          {clinicalNote ? (
            <Link
              to={`/app/clinical-notes/${clinicalNote.id}`}
              style={{
                backgroundColor: '#0284c7',
                color: '#fff',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              View SOAP Note ({clinicalNote.note_identifier})
            </Link>
          ) : (
            visit.status !== 'cancelled' && (
              <Link
                to={`/app/clinical-notes/new?visitId=${visit.id}`}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                + Document SOAP Note
              </Link>
            )
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
        <strong>Clinical Architecture Invariant:</strong> Patient ≠ Episode of Care ≠ Appointment ≠ Clinical Visit ≠ Clinical Note.
        Clinical Visit records the actual encounter execution and timing. Clinical evaluation and SOAP notes are maintained in the
        dedicated Clinical Note domain. This encounter does not deduct patient wallet credits or package sessions in V1.
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

      {/* Clinical Note (SOAP Documentation) Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginTop: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.5rem',
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
            Clinical Note (SOAP Documentation)
          </h2>
          {clinicalNote ? (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.2rem 0.5rem',
                borderRadius: '9999px',
                textTransform: 'capitalize',
                backgroundColor: clinicalNote.status === 'draft' ? '#fef3c7' : '#dcfce7',
                color: clinicalNote.status === 'draft' ? '#92400e' : '#166534',
              }}
            >
              {clinicalNote.status}
            </span>
          ) : null}
        </div>

        {clinicalNote ? (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div>
                <Link
                  to={`/app/clinical-notes/${clinicalNote.id}`}
                  style={{ color: '#0284c7', fontWeight: 700, fontSize: '1.125rem', textDecoration: 'none' }}
                >
                  {clinicalNote.note_identifier}
                </Link>
                <span style={{ fontSize: '0.8125rem', color: '#64748b', marginLeft: '0.75rem' }}>
                  {clinicalNote.note_type.toUpperCase()} • Last updated {formatTimestamp(clinicalNote.updated_at || clinicalNote.created_at)}
                </span>
              </div>
              <Link
                to={`/app/clinical-notes/${clinicalNote.id}`}
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#0284c7',
                  textDecoration: 'none',
                }}
              >
                {clinicalNote.status === 'draft' ? 'Continue Editing Draft →' : 'View Full Note →'}
              </Link>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
                fontSize: '0.8125rem',
              }}
            >
              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                <strong style={{ color: '#0369a1', display: 'block', marginBottom: '0.25rem' }}>S: Subjective</strong>
                <p style={{ margin: 0, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {clinicalNote.subjective || '(None)'}
                </p>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                <strong style={{ color: '#0369a1', display: 'block', marginBottom: '0.25rem' }}>O: Objective</strong>
                <p style={{ margin: 0, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {clinicalNote.objective || '(None)'}
                </p>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                <strong style={{ color: '#0369a1', display: 'block', marginBottom: '0.25rem' }}>A: Assessment</strong>
                <p style={{ margin: 0, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {clinicalNote.assessment || '(None)'}
                </p>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                <strong style={{ color: '#0369a1', display: 'block', marginBottom: '0.25rem' }}>P: Plan</strong>
                <p style={{ margin: 0, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {clinicalNote.plan || '(None)'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
              No clinical documentation recorded for this encounter yet.
            </p>
            {visit.status !== 'cancelled' && (
              <Link
                to={`/app/clinical-notes/new?visitId=${visit.id}`}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  padding: '0.4rem 0.875rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}
              >
                + Document SOAP Note
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Clinical Outcome Measures Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginTop: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
              Clinical Outcome Measures
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: outcomeAssessments.length > 0 ? '#dcfce7' : '#f1f5f9',
                color: outcomeAssessments.length > 0 ? '#166534' : '#475569',
              }}
            >
              {outcomeAssessments.length} Recorded
            </span>
          </div>

          {visit.status !== 'cancelled' && (
            <Link
              to={`/app/outcome-measures/new?visitId=${visit.id}&patientId=${visit.patient_id}&episodeId=${visit.episode_id || ''}`}
              style={{
                backgroundColor: '#059669',
                color: '#ffffff',
                padding: '0.4rem 0.875rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.8125rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              + Record Outcome Measure
            </Link>
          )}
        </div>

        {outcomeAssessments.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {outcomeAssessments.map((oa) => (
              <div
                key={oa.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Link
                      to={`/app/outcome-measures/${oa.id}`}
                      style={{ color: '#059669', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}
                    >
                      {oa.assessment_identifier}
                    </Link>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }}>
                      {oa.definition?.name || 'Outcome Measure'} ({oa.definition?.code})
                    </span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                      }}
                    >
                      {oa.assessment_type}
                    </span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        textTransform: 'capitalize',
                        backgroundColor: oa.status === 'draft' ? '#fef3c7' : '#dcfce7',
                        color: oa.status === 'draft' ? '#92400e' : '#166534',
                      }}
                    >
                      {oa.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Assessed: {formatTimestamp(oa.performed_at)} &bull; Assessor: {oa.assessor?.display_name || 'Clinician'}
                    {oa.score_interpretation && ` &bull; ${oa.score_interpretation}`}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    {oa.status === 'amended' && oa.amended_numeric_score !== null
                      ? oa.amended_numeric_score
                      : oa.numeric_score !== null
                      ? oa.numeric_score
                      : '—'}
                    {oa.definition?.max_score !== null && oa.definition?.max_score !== undefined && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>
                        /{oa.definition.max_score}
                      </span>
                    )}
                  </div>
                  {oa.score_category && (
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#475569' }}>
                      {oa.score_category}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            No standardized outcome measures administered during this encounter.
          </p>
        )}
      </div>

      {/* Structured Clinical Assessments (Multi-Specialty Extension) Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginTop: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
              Structured Clinical Assessments (Specialty Extension)
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: clinicalAssessments.length > 0 ? '#f3e8ff' : '#f1f5f9',
                color: clinicalAssessments.length > 0 ? '#7c3aed' : '#475569',
              }}
            >
              {clinicalAssessments.length} Recorded
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setEditingAssessment(null);
                setIsNeuroModalOpen(true);
              }}
              style={{
                padding: '0.35rem 0.75rem',
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Document Neurological Exam
            </button>
            <button
              type="button"
              onClick={() => setIsNeuroLongitudinalOpen(true)}
              style={{
                padding: '0.35rem 0.75rem',
                backgroundColor: '#ffffff',
                color: '#6d28d9',
                border: '1px solid #ddd6fe',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              View Longitudinal Neurology
            </button>
          </div>
        </div>

        {clinicalAssessments.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {clinicalAssessments.map((ca) => (
              <div
                key={ca.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#7c3aed', fontWeight: 700, fontSize: '0.875rem' }}>
                      {ca.assessment_identifier}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }}>
                      {ca.definition?.name || 'Structured Assessment'}
                    </span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        backgroundColor: '#ede9fe',
                        color: '#6d28d9',
                      }}
                    >
                      {ca.definition?.specialty || 'General'}
                    </span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        textTransform: 'capitalize',
                        backgroundColor: ca.status === 'draft' ? '#fef3c7' : '#dcfce7',
                        color: ca.status === 'draft' ? '#92400e' : '#166534',
                      }}
                    >
                      {ca.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Performed: {formatTimestamp(ca.performed_at)} &bull; Assessor: {ca.assessor?.display_name || 'Clinician'}
                    {ca.summary_findings && ` &bull; ${ca.summary_findings}`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAssessment(ca);
                      setIsNeuroModalOpen(true);
                    }}
                    style={{
                      padding: '0.3rem 0.6rem',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {ca.status === 'draft' ? 'Edit Draft' : 'View Findings'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            No structured specialty assessments recorded for this encounter. (SOAP documentation remains the primary medico-legal clinical record).
          </p>
        )}
      </div>

      {/* Home Exercise Programs (HEP) Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginTop: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
              Home Exercise Programs (HEP)
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: homeExercisePrograms.length > 0 ? '#e0f2fe' : '#f1f5f9',
                color: homeExercisePrograms.length > 0 ? '#0369a1' : '#475569',
              }}
            >
              {homeExercisePrograms.length} Prescribed
            </span>
          </div>

          {visit.status !== 'cancelled' && (
            <Link
              to={`/app/hep/new?visitId=${visit.id}&patientId=${visit.patient_id}&episodeId=${visit.episode_id || ''}`}
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                padding: '0.4rem 0.875rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.8125rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              + Prescribe Exercise Program
            </Link>
          )}
        </div>

        {homeExercisePrograms.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {homeExercisePrograms.map((prog) => (
              <div
                key={prog.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Link
                      to={`/app/hep/${prog.id}`}
                      style={{ color: '#0284c7', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}
                    >
                      {prog.program_identifier}
                    </Link>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                      {prog.title}
                    </span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        textTransform: 'capitalize',
                        backgroundColor:
                          prog.status === 'active'
                            ? '#dcfce7'
                            : prog.status === 'draft'
                            ? '#fef3c7'
                            : prog.status === 'paused'
                            ? '#ffedd5'
                            : '#f1f5f9',
                        color:
                          prog.status === 'active'
                            ? '#166534'
                            : prog.status === 'draft'
                            ? '#92400e'
                            : prog.status === 'paused'
                            ? '#9a3412'
                            : '#475569',
                      }}
                    >
                      {prog.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Start Date: {formatDate(prog.start_date)}
                    {prog.review_date && ` • Review Due: ${formatDate(prog.review_date)}`}
                  </div>
                </div>

                <div>
                  <Link
                    to={`/app/hep/${prog.id}`}
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: '#0284c7',
                      textDecoration: 'none',
                    }}
                  >
                    View Prescription →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            No home exercise program prescribed during this clinical visit.
          </p>
        )}
      </div>

      {/* Treatment Plans Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginTop: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
              Formulated Treatment Plans
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: treatmentPlans.length > 0 ? '#ecfdf5' : '#f1f5f9',
                color: treatmentPlans.length > 0 ? '#059669' : '#475569',
              }}
            >
              {treatmentPlans.length} Formulated
            </span>
          </div>

          {visit.status !== 'cancelled' && (
            <Link
              to={`/app/treatment-plans/new?visitId=${visit.id}&patientId=${visit.patient_id}&episodeId=${visit.episode_id || ''}`}
              style={{
                backgroundColor: '#059669',
                color: '#ffffff',
                padding: '0.4rem 0.875rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.8125rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              + Formulate Treatment Plan
            </Link>
          )}
        </div>

        {treatmentPlans.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {treatmentPlans.map((tpl) => (
              <div
                key={tpl.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Link
                      to={`/app/treatment-plans/${tpl.id}`}
                      style={{ color: '#059669', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}
                    >
                      {tpl.plan_identifier}
                    </Link>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                      {tpl.title}
                    </span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        textTransform: 'capitalize',
                        backgroundColor:
                          tpl.status === 'active'
                            ? '#dcfce7'
                            : tpl.status === 'draft'
                            ? '#fef3c7'
                            : tpl.status === 'paused'
                            ? '#ffedd5'
                            : '#f1f5f9',
                        color:
                          tpl.status === 'active'
                            ? '#166534'
                            : tpl.status === 'draft'
                            ? '#92400e'
                            : tpl.status === 'paused'
                            ? '#9a3412'
                            : '#475569',
                      }}
                    >
                      {tpl.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Start Date: {formatDate(tpl.start_date)}
                    {tpl.target_review_date && ` • Review Due: ${formatDate(tpl.target_review_date)}`}
                    {tpl.treatment_frequency && ` • Cadence: ${tpl.treatment_frequency}`}
                  </div>
                </div>

                <div>
                  <Link
                    to={`/app/treatment-plans/${tpl.id}`}
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: '#059669',
                      textDecoration: 'none',
                    }}
                  >
                    View Plan →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            No treatment plan originated from this clinical visit.
          </p>
        )}
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

      {/* Package Settlement Card */}
      <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Ticket size={18} color="#0284c7" /> Treatment Package Settlement
          </h2>
          {consumedPackage && (
            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '9999px', backgroundColor: '#dcfce7', color: '#166534' }}>
              Settled via Package
            </span>
          )}
        </div>

        {packageMessage && (
          <div style={{ backgroundColor: packageMessage.includes('failed') ? '#fee2e2' : '#dcfce7', color: packageMessage.includes('failed') ? '#991b1b' : '#166534', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {packageMessage}
          </div>
        )}

        {consumedPackage ? (
          <div style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600, display: 'block' }}>CONSUMED PACKAGE SESSION</span>
                <strong style={{ fontSize: '1rem', color: '#14532d' }}>
                  {consumedPackage.entitlement?.package_number} — {consumedPackage.entitlement?.definition?.name || 'Package'}
                </strong>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#15803d', marginTop: '0.25rem' }}>
                  Consumed on {formatDate(consumedPackage.consumed_at)}
                </span>
              </div>
              <Link
                to={`/app/package-entitlements/${consumedPackage.entitlement_id}`}
                style={{ fontSize: '0.8125rem', color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}
              >
                View Package Entitlement &rarr;
              </Link>
            </div>
          </div>
        ) : visit.status === 'completed' ? (
          activePackages.length > 0 ? (
            <form onSubmit={handleConsumePackage} style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', color: '#334155' }}>
                This completed encounter can be settled against an active package held by the patient:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Select Active Package
                  </label>
                  <select
                    value={selectedEntitlementId}
                    onChange={(e) => setSelectedEntitlementId(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#fff' }}
                  >
                    {activePackages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.package_number} — {pkg.definition?.name} ({pkg.remaining_sessions} remaining)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Encounter Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Routine session checkout"
                    value={consumptionNotes}
                    onChange={(e) => setConsumptionNotes(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={isConsuming || !selectedEntitlementId}
                    style={{ width: '100%', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '0.5rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.875rem', cursor: isConsuming ? 'not-allowed' : 'pointer' }}
                  >
                    {isConsuming ? 'Processing...' : 'Consume Session'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
              Patient has no active packages available for this encounter. Standard invoice billing applies.
            </p>
          )
        ) : (
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            Package sessions can be settled once this encounter is completed.
          </p>
        )}
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

      {/* Neurology Structured Examination Modal */}
      {isNeuroModalOpen && visit && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            overflowY: 'auto',
          }}
        >
          <div style={{ maxWidth: '960px', width: '100%', maxHeight: '92vh', overflowY: 'auto', borderRadius: '8px' }}>
            <NeurologyAssessmentForm
              patientId={visit.patient_id}
              visitId={visit.id}
              episodeId={visit.episode_id}
              assessorId={currentUserId || visit.physiotherapist_id}
              initialAssessmentId={editingAssessment?.id}
              initialData={editingAssessment?.structured_data as Record<string, any>}
              initialStatus={editingAssessment?.status}
              onSuccess={handleNeuroSaved}
              onCancel={() => {
                setIsNeuroModalOpen(false);
                setEditingAssessment(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Patient Longitudinal Neurology History Modal */}
      {isNeuroLongitudinalOpen && visit && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxWidth: '920px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                  Patient Longitudinal Neurological Review
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Historical neurological documentation across clinical encounters.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNeuroLongitudinalOpen(false)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
            <NeurologyLongitudinalView
              patientId={visit.patient_id}
              onSelectAssessment={(a) => {
                setIsNeuroLongitudinalOpen(false);
                setEditingAssessment(a);
                setIsNeuroModalOpen(true);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
