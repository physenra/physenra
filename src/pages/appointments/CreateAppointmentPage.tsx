import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { usePractice } from '../../hooks/usePractice';
import {
  appointmentService,
  type ClinicianOption,
  type ConflictCheckResult,
} from '../../services/appointmentService';
import { patientService } from '../../services/patientService';
import { episodeService } from '../../services/episodeService';
import type {
  Patient,
  EpisodeWithPatient,
  AppointmentType,
  AppointmentLocationMode,
} from '../../types/models';

export const CreateAppointmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activePractice } = usePractice();

  const preselectedPatientId = searchParams.get('patientId') || searchParams.get('patient_id');
  const preselectedEpisodeId = searchParams.get('episodeId') || searchParams.get('episode_id');
  const preselectedClinicianId = searchParams.get('clinicianId') || searchParams.get('clinician_id');

  // Form states
  const [patientId, setPatientId] = useState<string>(preselectedPatientId || '');
  const [episodeId, setEpisodeId] = useState<string>(preselectedEpisodeId || '');
  const [physiotherapistId, setPhysiotherapistId] = useState<string>(preselectedClinicianId || '');
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('follow_up');
  const [locationMode, setLocationMode] = useState<AppointmentLocationMode>('clinic');
  const [appointmentDate, setAppointmentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState<string>('09:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [notes, setNotes] = useState<string>('');

  // Dropdown data
  const [patients, setPatients] = useState<Patient[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeWithPatient[]>([]);
  const [clinicians, setClinicians] = useState<ClinicianOption[]>([]);

  // Conflict state
  const [conflictResult, setConflictResult] = useState<ConflictCheckResult>({
    hasConflict: false,
    conflictingAppointments: [],
  });
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load patients and clinicians
  useEffect(() => {
    async function loadData() {
      if (!activePractice) return;
      try {
        const [patResult, clinResult] = await Promise.all([
          patientService.getPatients({ limit: 100 }),
          appointmentService.getClinicians(),
        ]);
        setPatients(patResult.patients);
        setClinicians(clinResult);

        if (clinResult.length > 0 && !physiotherapistId) {
          if (preselectedClinicianId && clinResult.some((c) => c.userId === preselectedClinicianId)) {
            setPhysiotherapistId(preselectedClinicianId);
          } else {
            setPhysiotherapistId(clinResult[0].userId);
          }
        }
      } catch (err: any) {
        setFormError(err.message || 'Failed to load prerequisite data.');
      }
    }
    loadData();
  }, [activePractice?.id]);

  // Load patient episodes when patientId changes
  useEffect(() => {
    async function loadPatientEpisodes() {
      if (!patientId) {
        setEpisodes([]);
        setEpisodeId('');
        return;
      }
      try {
        const res = await episodeService.getEpisodes({
          patientId,
          status: 'all',
          limit: 50,
        });
        setEpisodes(res.episodes);
        if (preselectedEpisodeId && res.episodes.some((e) => e.id === preselectedEpisodeId)) {
          setEpisodeId(preselectedEpisodeId);
        } else if (res.episodes.length === 1) {
          setEpisodeId(res.episodes[0].id);
        }
      } catch (err) {
        console.warn('Failed to load patient episodes:', err);
      }
    }
    loadPatientEpisodes();
  }, [patientId, preselectedEpisodeId]);

  // Check conflicts whenever clinician, date, time, or duration changes
  useEffect(() => {
    async function runConflictCheck() {
      if (!physiotherapistId || !appointmentDate || !startTime || !durationMinutes) {
        setConflictResult({ hasConflict: false, conflictingAppointments: [] });
        return;
      }

      setIsCheckingConflict(true);
      try {
        const startIso = new Date(`${appointmentDate}T${startTime}:00`).toISOString();
        const endIso = new Date(
          new Date(startIso).getTime() + durationMinutes * 60000
        ).toISOString();

        const res = await appointmentService.checkPhysiotherapistConflicts(
          physiotherapistId,
          startIso,
          endIso
        );
        setConflictResult(res);
      } catch (err) {
        console.warn('Conflict check non-fatal error:', err);
      } finally {
        setIsCheckingConflict(false);
      }
    }

    const timer = setTimeout(runConflictCheck, 300);
    return () => clearTimeout(timer);
  }, [physiotherapistId, appointmentDate, startTime, durationMinutes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!patientId) {
      setFormError('Please select a patient.');
      return;
    }
    if (!physiotherapistId) {
      setFormError('Please select a physiotherapist.');
      return;
    }
    if (!appointmentDate || !startTime) {
      setFormError('Please specify the appointment date and start time.');
      return;
    }

    setIsSubmitting(true);

    try {
      const scheduledStart = new Date(`${appointmentDate}T${startTime}:00`).toISOString();

      const newAppt = await appointmentService.createAppointment({
        patient_id: patientId,
        episode_id: episodeId || undefined,
        physiotherapist_id: physiotherapistId,
        appointment_type: appointmentType,
        scheduled_start: scheduledStart,
        duration_minutes: Number(durationMinutes),
        location_mode: locationMode,
        notes: notes.trim() || undefined,
      });

      navigate(`/app/appointments/${newAppt.id}`);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create appointment.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider mb-1">
            Scheduling & Operations
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Book New Appointment
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Schedule a patient encounter with an active practice physiotherapist.
          </p>
        </div>
        <Link to="/app/appointments" className="btn btn-secondary text-sm">
          Cancel
        </Link>
      </div>

      {/* Architectural Separation Callout */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-xs text-blue-800 dark:text-blue-300 space-y-1">
        <p className="font-semibold text-sm">
          ℹ️ Physenra Operational Rule: Scheduled Slot ≠ Clinical Visit
        </p>
        <p>
          Scheduling an appointment reserves an encounter slot. It does NOT assert that clinical treatment occurred,
          does not consume patient package credits, and does not record a SOAP note. Clinical documentation will occur in future encounter modules.
        </p>
      </div>

      {/* Error Banner */}
      {formError && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6 text-sm">
          {formError}
        </div>
      )}

      {/* Conflict Warning Banner */}
      {conflictResult.hasConflict && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg p-4 mb-6 text-amber-900 dark:text-amber-200 text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <span>⚠️ Scheduling Conflict Warning:</span>
          </div>
          <p className="mt-1 text-xs">
            The selected clinician already has {conflictResult.conflictingAppointments.length} appointment(s) during this time slot:
          </p>
          <ul className="mt-2 list-disc list-inside text-xs space-y-1">
            {conflictResult.conflictingAppointments.map((c) => (
              <li key={c.id}>
                <span className="font-mono font-medium">{c.appointment_identifier}</span> with{' '}
                {c.patient_name || 'Patient'} ({new Date(c.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                {new Date(c.scheduled_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Section 1: Patient & Optional Episode */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
            1. Patient & Care Course
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Patient <span className="text-red-500">*</span>
              </label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="select w-full"
                required
              >
                <option value="">-- Select Patient --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} ({p.patient_identifier})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                Episode of Care <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <select
                value={episodeId}
                onChange={(e) => setEpisodeId(e.target.value)}
                className="select w-full"
                disabled={!patientId || episodes.length === 0}
              >
                <option value="">-- None / Standalone Appointment --</option>
                {episodes.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.episode_identifier}: {ep.title} ({ep.status})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {patientId && episodes.length === 0
                  ? 'No episodes found for this patient.'
                  : 'Links appointment to an active clinical episode.'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Clinician & Scheduling */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
            2. Clinician & Time
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="label">
                Assigned Physiotherapist <span className="text-red-500">*</span>
              </label>
              <select
                value={physiotherapistId}
                onChange={(e) => setPhysiotherapistId(e.target.value)}
                className="select w-full"
                required
              >
                <option value="">-- Select Physiotherapist --</option>
                {clinicians.map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.name} ({c.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="label">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="label">
                Duration <span className="text-red-500">*</span>
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="select w-full"
                required
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes (Standard)</option>
                <option value={60}>60 Minutes (1 Hour)</option>
                <option value={90}>90 Minutes</option>
                <option value={120}>120 Minutes (2 Hours)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Appointment Details */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
            3. Type & Location
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Appointment Type <span className="text-red-500">*</span>
              </label>
              <select
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value as AppointmentType)}
                className="select w-full"
                required
              >
                <option value="initial_consultation">Initial Consultation</option>
                <option value="follow_up">Follow-up</option>
                <option value="reassessment">Reassessment</option>
                <option value="home_visit">Home Visit</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="label">
                Location / Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={locationMode}
                onChange={(e) => setLocationMode(e.target.value as AppointmentLocationMode)}
                className="select w-full"
                required
              >
                <option value="clinic">Clinic</option>
                <option value="home">Home</option>
                <option value="telehealth">Telehealth</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="label">Administrative Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Booking notes, room requests, or administrative remarks..."
                rows={3}
                className="textarea w-full"
              />
              <p className="text-xs text-gray-400 mt-1">
                For administrative scheduling only. Do not record clinical SOAP documentation here.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Link to="/app/appointments" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || isCheckingConflict}
            className="btn btn-primary"
          >
            {isSubmitting ? 'Booking Appointment...' : 'Confirm & Book Appointment'}
          </button>
        </div>
      </form>
    </div>
  );
};
