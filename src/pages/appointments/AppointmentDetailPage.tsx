import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  appointmentService,
  ALLOWED_STATUS_TRANSITIONS,
} from '../../services/appointmentService';
import type {
  AppointmentWithRelations,
  AppointmentStatus,
  AppointmentType,
  AppointmentLocationMode,
} from '../../types/models';

export const AppointmentDetailPage: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState<AppointmentWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transition Modals
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [rescheduleTime, setRescheduleTime] = useState('10:00');
  const [rescheduleDuration, setRescheduleDuration] = useState(45);
  const [rescheduleReason, setRescheduleReason] = useState('');

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadAppointment = async () => {
    if (!appointmentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await appointmentService.getAppointmentById(appointmentId);
      if (!data) {
        setError('Appointment not found.');
      } else {
        setAppointment(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load appointment details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointment();
  }, [appointmentId]);

  const handleStatusTransition = async (newStatus: AppointmentStatus, reason?: string) => {
    if (!appointment) return;
    setIsUpdatingStatus(true);
    setError(null);
    try {
      await appointmentService.transitionStatus(
        appointment.id,
        appointment.status,
        newStatus,
        reason
      );
      await loadAppointment();
    } catch (err: any) {
      setError(err.message || `Failed to transition appointment to ${newStatus}.`);
    } finally {
      setIsUpdatingStatus(false);
      setIsCancelModalOpen(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment) return;
    setIsUpdatingStatus(true);
    setError(null);
    try {
      const newStart = new Date(`${rescheduleDate}T${rescheduleTime}:00`).toISOString();
      const newAppt = await appointmentService.rescheduleAppointment(appointment.id, {
        scheduledStart: newStart,
        durationMinutes: Number(rescheduleDuration),
        reason: rescheduleReason.trim() || undefined,
      });
      setIsRescheduleModalOpen(false);
      navigate(`/app/appointments/${newAppt.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to reschedule appointment.');
      setIsUpdatingStatus(false);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const getStatusBadgeClass = (status: AppointmentStatus) => {
    switch (status) {
      case 'scheduled':
        return 'badge-blue';
      case 'confirmed':
        return 'badge-purple';
      case 'arrived':
        return 'badge-amber';
      case 'in_progress':
        return 'badge-indigo';
      case 'completed':
      case 'documentation_completed':
        return 'badge-green';
      case 'cancelled':
        return 'badge-red';
      case 'no_show':
        return 'badge-gray';
      case 'rescheduled':
        return 'badge-teal';
      case 'incomplete':
        return 'badge-orange';
      default:
        return 'badge-gray';
    }
  };

  const formatAppointmentType = (type: AppointmentType) => {
    switch (type) {
      case 'initial_consultation':
        return 'Initial Consultation';
      case 'follow_up':
        return 'Follow-up';
      case 'reassessment':
        return 'Reassessment';
      case 'home_visit':
        return 'Home Visit';
      default:
        return 'Other';
    }
  };

  const formatLocationMode = (mode: AppointmentLocationMode) => {
    switch (mode) {
      case 'clinic':
        return 'Clinic';
      case 'home':
        return 'Home';
      case 'telehealth':
        return 'Telehealth';
      default:
        return 'Other';
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
      <div className="page-container max-w-3xl mx-auto">
        <div className="card p-8 text-center">
          <p className="text-red-600 font-semibold mb-2">Error</p>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
            {error || 'Appointment record could not be loaded.'}
          </p>
          <Link to="/app/appointments" className="btn btn-secondary">
            Back to Appointments
          </Link>
        </div>
      </div>
    );
  }

  const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[appointment.status] || [];
  const isTerminal = ['cancelled', 'no_show', 'rescheduled', 'incomplete', 'documentation_completed'].includes(
    appointment.status
  );

  return (
    <div className="page-container max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/app/appointments" className="text-xs text-blue-600 hover:underline">
              ← Appointments
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-xs font-mono font-semibold text-gray-500">
              {appointment.appointment_identifier}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
              {appointment.appointment_identifier}
            </h1>
            <span className={`badge ${getStatusBadgeClass(appointment.status)} text-sm py-1 px-3`}>
              {appointment.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!isTerminal && (
            <Link
              to={`/app/appointments/${appointment.id}/edit`}
              className="btn btn-secondary text-xs"
            >
              Edit Details
            </Link>
          )}

          {allowedTransitions.includes('confirmed') && (
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusTransition('confirmed')}
              className="btn btn-primary text-xs"
            >
              Confirm Attendance
            </button>
          )}

          {allowedTransitions.includes('arrived') && (
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusTransition('arrived')}
              className="btn bg-amber-600 hover:bg-amber-700 text-white text-xs py-1.5 px-3 rounded-lg font-medium"
            >
              Check In (Arrived)
            </button>
          )}

          {allowedTransitions.includes('in_progress') && (
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusTransition('in_progress')}
              className="btn bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-1.5 px-3 rounded-lg font-medium"
            >
              Start Encounter
            </button>
          )}

          {allowedTransitions.includes('completed') && (
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusTransition('completed')}
              className="btn bg-green-600 hover:bg-green-700 text-white text-xs py-1.5 px-3 rounded-lg font-medium"
            >
              Mark Completed
            </button>
          )}

          {allowedTransitions.includes('rescheduled') && (
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => setIsRescheduleModalOpen(true)}
              className="btn btn-secondary text-xs"
            >
              Reschedule...
            </button>
          )}

          {allowedTransitions.includes('no_show') && (
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusTransition('no_show')}
              className="btn btn-secondary text-xs text-red-600 border-red-200 hover:bg-red-50"
            >
              Mark No-Show
            </button>
          )}

          {allowedTransitions.includes('cancelled') && (
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => setIsCancelModalOpen(true)}
              className="btn btn-secondary text-xs text-red-600 border-red-200 hover:bg-red-50"
            >
              Cancel...
            </button>
          )}
        </div>
      </div>

      {/* Architectural Separation Notice */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 text-xs text-amber-800 dark:text-amber-300">
        <p className="font-semibold text-sm mb-1">
          ⚠️ Physenra Architecture Rule: Appointment ≠ Clinical Visit ≠ SOAP Note
        </p>
        <p>
          This record represents an administrative scheduled encounter. Marking this appointment completed does NOT
          assert clinical treatment occurred, does not consume package sessions, and does not record clinical findings.
          Clinical documentation and encounter verification will occur in future clinical encounter modules.
        </p>
      </div>

      {/* Grid: Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Main Details (Col 1 & 2) */}
        <div className="md:col-span-2 space-y-6">
          {/* Scheduling Card */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
              Encounter Schedule
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-gray-400 block">Date</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {formatDate(appointment.scheduled_start)}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Time & Duration</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {formatTime(appointment.scheduled_start)} - {formatTime(appointment.scheduled_end)} ({appointment.duration_minutes} mins)
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Type</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {formatAppointmentType(appointment.appointment_type)}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Location / Mode</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {formatLocationMode(appointment.location_mode)}
                </span>
              </div>
            </div>

            {appointment.rescheduled_from_id && (
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-teal-700 dark:text-teal-400">
                <span>🔄 Rescheduled from prior appointment: </span>
                <Link
                  to={`/app/appointments/${appointment.rescheduled_from_id}`}
                  className="font-mono underline"
                >
                  View Original Appointment
                </Link>
              </div>
            )}
          </div>

          {/* Cancellation Info (if cancelled) */}
          {appointment.status === 'cancelled' && (
            <div className="card p-5 bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
              <h2 className="text-sm font-semibold text-red-900 dark:text-red-300 uppercase tracking-wider mb-2">
                Cancellation Details
              </h2>
              <div className="text-sm text-red-800 dark:text-red-200 space-y-1">
                <p>
                  <span className="font-medium">Reason: </span>
                  {appointment.cancellation_reason || 'No reason specified'}
                </p>
                {appointment.cancelled_at && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Cancelled on {new Date(appointment.cancelled_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Administrative Notes */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
              Administrative Remarks
            </h2>
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {appointment.notes || (
                <span className="text-gray-400 italic">No administrative notes recorded.</span>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Cards (Col 3) */}
        <div className="space-y-6">
          {/* Patient Card */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
              <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                Patient Details
              </h3>
              {appointment.patient && (
                <Link
                  to={`/app/patients/${appointment.patient.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View Profile →
                </Link>
              )}
            </div>
            {appointment.patient ? (
              <div className="text-sm space-y-1.5">
                <div className="font-bold text-gray-900 dark:text-white">
                  {appointment.patient.first_name} {appointment.patient.last_name}
                </div>
                <div className="text-xs text-gray-400 font-mono">
                  ID: {appointment.patient.patient_identifier}
                </div>
                {appointment.patient.phone && (
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    📞 {appointment.patient.phone}
                  </div>
                )}
                {appointment.patient.email && (
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    ✉️ {appointment.patient.email}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-400 text-xs">Unknown Patient</span>
            )}
          </div>

          {/* Episode of Care Card */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
              <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                Linked Care Episode
              </h3>
              {appointment.episode && (
                <Link
                  to={`/app/episodes/${appointment.episode.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View Episode →
                </Link>
              )}
            </div>
            {appointment.episode ? (
              <div className="text-sm space-y-1.5">
                <div className="font-medium text-gray-900 dark:text-white">
                  {appointment.episode.title}
                </div>
                <div className="text-xs text-gray-400 font-mono">
                  {appointment.episode.episode_identifier}
                </div>
                <div>
                  <span className="badge badge-gray text-xs capitalize">
                    {appointment.episode.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-400 italic">
                Standalone appointment (not linked to an Episode of Care).
              </div>
            )}
          </div>

          {/* Assigned Clinician Card */}
          <div className="card p-5">
            <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
              Responsible Clinician
            </h3>
            <div className="text-sm space-y-1">
              <div className="font-medium text-gray-900 dark:text-white">
                {appointment.physiotherapist?.display_name ||
                  `${appointment.physiotherapist?.first_name || ''} ${appointment.physiotherapist?.last_name || ''}`.trim() ||
                  'Assigned Physiotherapist'}
              </div>
              <div className="text-xs text-gray-400">Licensed Physiotherapist</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Cancel Appointment
            </h3>
            <p className="text-xs text-gray-500">
              Are you sure you want to cancel appointment{' '}
              <span className="font-mono font-semibold">{appointment.appointment_identifier}</span>?
              Please supply an administrative cancellation reason.
            </p>
            <div>
              <label className="label text-xs">
                Cancellation Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Patient called to cancel due to illness..."
                rows={3}
                className="textarea w-full text-sm"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="btn btn-secondary text-xs"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={!cancelReason.trim() || isUpdatingStatus}
                onClick={() => handleStatusTransition('cancelled', cancelReason)}
                className="btn bg-red-600 hover:bg-red-700 text-white text-xs disabled:opacity-50"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {isRescheduleModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleRescheduleSubmit}
            className="card max-w-lg w-full p-6 space-y-4 shadow-xl"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Reschedule Appointment
            </h3>
            <p className="text-xs text-gray-500">
              Rescheduling marks appointment{' '}
              <span className="font-mono font-semibold">{appointment.appointment_identifier}</span> as
              rescheduled and books a new linked encounter.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">New Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="input w-full text-xs"
                  required
                />
              </div>
              <div>
                <label className="label text-xs">New Start Time</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="input w-full text-xs"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="label text-xs">Duration</label>
                <select
                  value={rescheduleDuration}
                  onChange={(e) => setRescheduleDuration(Number(e.target.value))}
                  className="select w-full text-xs"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                  <option value={90}>90 Minutes</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="label text-xs">Rescheduling Reason / Notes</label>
                <textarea
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Moved to next week at patient's request..."
                  rows={2}
                  className="textarea w-full text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setIsRescheduleModalOpen(false)}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingStatus}
                className="btn btn-primary text-xs"
              >
                {isUpdatingStatus ? 'Rescheduling...' : 'Confirm Reschedule'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
