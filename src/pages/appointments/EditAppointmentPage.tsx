import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  appointmentService,
  type ClinicianOption,
} from '../../services/appointmentService';
import type {
  AppointmentWithRelations,
  AppointmentType,
  AppointmentLocationMode,
} from '../../types/models';

export const EditAppointmentPage: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState<AppointmentWithRelations | null>(null);
  const [clinicians, setClinicians] = useState<ClinicianOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [physiotherapistId, setPhysiotherapistId] = useState('');
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('follow_up');
  const [locationMode, setLocationMode] = useState<AppointmentLocationMode>('in_clinic');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!appointmentId) return;
      setIsLoading(true);
      setError(null);
      try {
        const [appt, clin] = await Promise.all([
          appointmentService.getAppointmentById(appointmentId),
          appointmentService.getClinicians(),
        ]);

        if (!appt) {
          setError('Appointment not found.');
          return;
        }

        if (['cancelled', 'no_show', 'rescheduled'].includes(appt.status)) {
          setError(`Cannot edit appointment with terminal status '${appt.status}'.`);
          return;
        }

        setAppointment(appt);
        setClinicians(clin);

        setPhysiotherapistId(appt.physiotherapist_id);
        setAppointmentType(appt.appointment_type);
        setLocationMode(appt.location_mode);

        const start = new Date(appt.scheduled_start);
        setAppointmentDate(start.toISOString().split('T')[0]);
        setStartTime(
          start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        );
        setDurationMinutes(appt.duration_minutes);
        setNotes(appt.notes || '');
      } catch (err: any) {
        setError(err.message || 'Failed to load appointment.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [appointmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const scheduledStart = new Date(`${appointmentDate}T${startTime}:00`).toISOString();

      await appointmentService.updateAppointment(appointment.id, {
        physiotherapist_id: physiotherapistId,
        appointment_type: appointmentType,
        location_mode: locationMode,
        scheduled_start: scheduledStart,
        duration_minutes: Number(durationMinutes),
        notes: notes.trim() || null,
      });

      navigate(`/app/appointments/${appointment.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update appointment.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container flex justify-center py-20">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="page-container max-w-xl mx-auto py-10">
        <div className="card p-6 text-center">
          <p className="text-red-600 font-semibold mb-2">Error</p>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{error}</p>
          <Link to="/app/appointments" className="btn btn-secondary text-xs">
            Back to Appointments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider mb-1">
            Editing Appointment
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
            {appointment.appointment_identifier}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Patient: {appointment.patient?.first_name} {appointment.patient?.last_name}
          </p>
        </div>
        <Link
          to={`/app/appointments/${appointment.id}`}
          className="btn btn-secondary text-xs"
        >
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="label text-xs">Assigned Physiotherapist</label>
          <select
            value={physiotherapistId}
            onChange={(e) => setPhysiotherapistId(e.target.value)}
            className="select w-full text-xs"
            required
          >
            {clinicians.map((c) => (
              <option key={c.userId} value={c.userId}>
                {c.name} ({c.role})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">Date</label>
            <input
              type="date"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              className="input w-full text-xs"
              required
            />
          </div>
          <div>
            <label className="label text-xs">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input w-full text-xs"
              required
            />
          </div>
          <div>
            <label className="label text-xs">Duration</label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="select w-full text-xs"
            >
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={45}>45 Minutes</option>
              <option value={60}>60 Minutes</option>
              <option value={90}>90 Minutes</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Type</label>
            <select
              value={appointmentType}
              onChange={(e) => setAppointmentType(e.target.value as AppointmentType)}
              className="select w-full text-xs"
            >
              <option value="initial_assessment">Initial Assessment</option>
              <option value="follow_up">Follow-Up Treatment</option>
              <option value="consultation">Consultation</option>
              <option value="review">Clinical Review</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label text-xs">Location / Mode</label>
            <select
              value={locationMode}
              onChange={(e) => setLocationMode(e.target.value as AppointmentLocationMode)}
              className="select w-full text-xs"
            >
              <option value="in_clinic">In-Clinic</option>
              <option value="home_visit">Home Visit</option>
              <option value="online">Online / Telehealth</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label text-xs">Administrative Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="textarea w-full text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Link
            to={`/app/appointments/${appointment.id}`}
            className="btn btn-secondary text-xs"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary text-xs"
          >
            {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
