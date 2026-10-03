import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { clinicalVisitService } from '../../services/clinicalVisitService';
import { patientService } from '../../services/patientService';
import { episodeService } from '../../services/episodeService';
import { appointmentService } from '../../services/appointmentService';
import { usePractice } from '../../hooks/usePractice';
import type { Patient, EpisodeOfCare, AppointmentWithRelations } from '../../types/models';

export const CreateClinicalVisitPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activePractice } = usePractice();

  // Query parameter pre-fills
  const initialAppointmentId = searchParams.get('appointment_id') || searchParams.get('appointmentId') || '';
  const initialPatientId = searchParams.get('patient_id') || searchParams.get('patientId') || '';
  const initialEpisodeId = searchParams.get('episode_id') || searchParams.get('episodeId') || '';

  // Options Data
  const [patients, setPatients] = useState<Patient[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeOfCare[]>([]);
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [clinicians, setClinicians] = useState<Array<{ id: string; name: string }>>([]);

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(initialEpisodeId);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(initialAppointmentId);
  const [selectedClinicianId, setSelectedClinicianId] = useState('');
  const [locationMode, setLocationMode] = useState<'clinic' | 'home' | 'telehealth' | 'other'>('clinic');
  const [status, setStatus] = useState<'scheduled' | 'in_progress'>('in_progress');
  const [actualStartTime, setActualStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [encounterNotes, setEncounterNotes] = useState('');

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial patients & clinicians
  useEffect(() => {
    const loadInitialData = async () => {
      if (!activePractice) return;
      setIsLoading(true);
      setError(null);
      try {
        // If pre-filled appointment, check idempotency first to prevent duplicate encounters
        if (initialAppointmentId) {
          try {
            const existingVisit = await clinicalVisitService.getClinicalVisitByAppointmentId(initialAppointmentId);
            if (existingVisit) {
              navigate(`/app/visits/${existingVisit.id}`, { replace: true });
              return;
            }
          } catch (checkErr) {
            console.warn('Could not check existing visit for appointment:', checkErr);
          }
        }

        // Load patients and clinicians in parallel
        const [patientRes, clinicianList] = await Promise.all([
          patientService.getPatients({ limit: 100 }),
          appointmentService.getClinicians(),
        ]);
        setPatients(patientRes.patients);

        const clinicianOptions = clinicianList.map((c) => ({
          id: c.userId,
          name: c.name,
        }));
        setClinicians(clinicianOptions);
        if (clinicianOptions.length > 0 && !selectedClinicianId) {
          setSelectedClinicianId(clinicianOptions[0].id);
        }

        // If pre-filled appointment, load its details
        if (initialAppointmentId) {
          const appt = await appointmentService.getAppointmentById(initialAppointmentId);
          if (appt) {
            setSelectedPatientId(appt.patient_id);
            if (appt.episode_id) setSelectedEpisodeId(appt.episode_id);
            setSelectedClinicianId(appt.physiotherapist_id);
            if (appt.location_mode && ['clinic', 'home', 'telehealth', 'other'].includes(appt.location_mode)) {
              setLocationMode(appt.location_mode as any);
            }
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize form options.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [activePractice, initialAppointmentId]);

  // Load episodes and appointments when selected patient changes
  useEffect(() => {
    const loadPatientContext = async () => {
      if (!selectedPatientId || !activePractice) {
        setEpisodes([]);
        setAppointments([]);
        return;
      }

      try {
        // Load patient episodes
        const episodeRes = await episodeService.getEpisodes({
          patientId: selectedPatientId,
          limit: 50,
        });
        setEpisodes(episodeRes.episodes);

        // Load active/eligible appointments for this patient
        const apptRes = await appointmentService.getAppointments({
          patientId: selectedPatientId,
          limit: 50,
        });
        setAppointments(apptRes.appointments);
      } catch (err) {
        console.warn('Failed to load patient episodes/appointments:', err);
      }
    };

    loadPatientContext();
  }, [selectedPatientId, activePractice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setError('Please select a patient.');
      return;
    }
    if (!selectedClinicianId) {
      setError('Please assign a physiotherapist.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let actualStartIso: string | null = null;
      if (status === 'in_progress') {
        actualStartIso = actualStartTime ? new Date(actualStartTime).toISOString() : new Date().toISOString();
      }

      const created = await clinicalVisitService.createClinicalVisit({
        patient_id: selectedPatientId,
        episode_id: selectedEpisodeId || null,
        appointment_id: selectedAppointmentId || null,
        physiotherapist_id: selectedClinicianId,
        status,
        actual_start: actualStartIso,
        location_mode: locationMode,
        encounter_notes: encounterNotes.trim() || null,
      });

      // If created from appointment and in_progress, update appointment status as well
      if (selectedAppointmentId && status === 'in_progress') {
        try {
          const appt = await appointmentService.getAppointmentById(selectedAppointmentId);
          if (appt && ['scheduled', 'confirmed', 'arrived'].includes(appt.status)) {
            await appointmentService.transitionStatus(
              selectedAppointmentId,
              appt.status,
              'in_progress',
              'Clinical visit started'
            );
          }
        } catch (e) {
          console.warn('Could not auto-advance appointment status:', e);
        }
      }

      navigate(`/app/visits/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create clinical visit.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/app/visits" style={{ color: '#0284c7', textDecoration: 'none', fontSize: '0.875rem' }}>
          &larr; Back to Clinical Visits
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem', marginBottom: '0.25rem' }}>
          Record Clinical Visit
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Initiate or record an encounter execution for patient care.
        </p>
      </div>

      {/* Domain Separation Notice */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          fontSize: '0.8125rem',
          color: '#1e40af',
        }}
      >
        <strong>Clinical Boundary Notice:</strong> This action establishes an encounter occurrence record. Clinical SOAP
        notes and evaluation documentation will be maintained in a separate dedicated module in the next phase.
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading options...</div>
      ) : (
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          {/* Patient Selection */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
              Patient <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value);
                setSelectedEpisodeId('');
                setSelectedAppointmentId('');
              }}
              required
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            >
              <option value="">Select a patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.patient_identifier})
                </option>
              ))}
            </select>
          </div>

          {/* Episode Selection (Optional) */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
              Episode of Care (Optional)
            </label>
            <select
              value={selectedEpisodeId}
              onChange={(e) => setSelectedEpisodeId(e.target.value)}
              disabled={!selectedPatientId || episodes.length === 0}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            >
              <option value="">None / Standalone Visit</option>
              {episodes.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.title} ({ep.episode_identifier}) - {ep.status}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Scoped to episodes belonging to the selected patient and practice.
            </span>
          </div>

          {/* Appointment Selection (Optional) */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
              Linked Appointment (Optional)
            </label>
            <select
              value={selectedAppointmentId}
              onChange={(e) => setSelectedAppointmentId(e.target.value)}
              disabled={!selectedPatientId || appointments.length === 0}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            >
              <option value="">None / Unscheduled Walk-in Encounter</option>
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.appointment_identifier} - {new Date(a.scheduled_start).toLocaleDateString()} ({a.status})
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Only one clinical visit may be linked to an appointment. Duplicate links are blocked by database invariants.
            </span>
          </div>

          {/* Clinician Selection */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
              Assigned Physiotherapist <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={selectedClinicianId}
              onChange={(e) => setSelectedClinicianId(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            >
              <option value="">Select clinician...</option>
              {clinicians.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Encounter Mode & Initial Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                Location / Mode <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={locationMode}
                onChange={(e) => setLocationMode(e.target.value as any)}
                required
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              >
                <option value="clinic">In-Clinic</option>
                <option value="home">Home Visit</option>
                <option value="telehealth">Telehealth</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                Initial Status <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                required
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              >
                <option value="in_progress">In Progress (Starting Now)</option>
                <option value="scheduled">Scheduled (Queued for Later)</option>
              </select>
            </div>
          </div>

          {/* Actual Start Time (if in_progress) */}
          {status === 'in_progress' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                Encounter Start Time
              </label>
              <input
                type="datetime-local"
                value={actualStartTime}
                onChange={(e) => setActualStartTime(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              />
            </div>
          )}

          {/* Operational Encounter Notes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
              Encounter Notes (Operational)
            </label>
            <textarea
              value={encounterNotes}
              onChange={(e) => setEncounterNotes(e.target.value)}
              rows={3}
              placeholder="Operational notes regarding encounter logistics or check-in..."
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Link
              to="/app/visits"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                color: '#475569',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                backgroundColor: '#0284c7',
                color: '#fff',
                padding: '0.5rem 1.25rem',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Recording...' : 'Record Visit'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
