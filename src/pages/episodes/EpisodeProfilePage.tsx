import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { episodeService, ClinicianOption } from '../../services/episodeService';
import { appointmentService } from '../../services/appointmentService';
import { useRole } from '../../hooks/useRole';
import { usePractice } from '../../hooks/usePractice';
import type { EpisodeWithPatient, EpisodeStatus, AppointmentWithRelations } from '../../types/models';
import {
  ArrowLeft,
  Edit,
  Archive,
  RotateCcw,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  Calendar,
  Clock,
  CalendarPlus,
  User,
  FileText,
  AlertCircle,
  Building2,
  Layers,
  Sparkles,
  FileCheck,
} from 'lucide-react';

export const EpisodeProfilePage: React.FC = () => {
  const { episodeId } = useParams<{ episodeId: string }>();
  const { isOwner, isManager, isClinician, isReceptionist } = useRole();
  const { activePractice } = usePractice();

  const [episode, setEpisode] = useState<EpisodeWithPatient | null>(null);
  const [clinicians, setClinicians] = useState<ClinicianOption[]>([]);
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Archive modal
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');

  const fetchEpisode = useCallback(async () => {
    if (!episodeId) return;
    try {
      setLoading(true);
      setError(null);
      const [data, clinicianList, apptResult] = await Promise.all([
        episodeService.getEpisodeById(episodeId),
        episodeService.getPracticeClinicians(),
        appointmentService.getAppointments({ episodeId, limit: 100 }),
      ]);

      if (!data) {
        setError('Episode of care not found or you lack permission to view it.');
      } else {
        setEpisode(data);
        setClinicians(clinicianList);
        setAppointments(apptResult.appointments);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load episode of care.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  useEffect(() => {
    fetchEpisode();
  }, [fetchEpisode]);

  const handleStatusChange = async (newStatus: EpisodeStatus) => {
    if (!episode) return;
    try {
      setActionLoading(true);
      await episodeService.changeEpisodeStatus(episode.id, newStatus);
      await fetchEpisode();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change episode status.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!episode) return;
    try {
      setActionLoading(true);
      await episodeService.archiveEpisode(episode.id, archiveReason.trim() || undefined);
      setArchiveModalOpen(false);
      setArchiveReason('');
      await fetchEpisode();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to archive episode.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!episode) return;
    try {
      setActionLoading(true);
      await episodeService.restoreEpisode(episode.id);
      await fetchEpisode();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to restore episode.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const canEdit = isOwner || isManager || isClinician || isReceptionist;
  const canChangeClinicalStatus = isOwner || isManager || isClinician;
  const canArchive = isOwner || isManager;

  const clinicianName = episode?.primary_physiotherapist_id
    ? clinicians.find((c) => c.userId === episode.primary_physiotherapist_id)?.name ||
      'Assigned Practitioner'
    : 'Unassigned';

  if (loading) {
    return (
      <div className="table-loading-container">
        <div className="loading-spinner" />
        <p>Loading episode of care...</p>
      </div>
    );
  }

  if (error || !episode) {
    return (
      <div className="empty-patient-state">
        <AlertCircle size={48} className="text-danger" />
        <h3>Episode of Care Unavailable</h3>
        <p>{error || 'The requested episode could not be found.'}</p>
        <Link to="/app/episodes" className="btn-secondary mt-4">
          <ArrowLeft size={16} />
          <span>Return to Episodes</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="episode-profile-page">
      {/* Top Nav */}
      <div className="profile-top-nav">
        {episode.patients ? (
          <Link to={`/app/patients/${episode.patients.id}`} className="back-link">
            <ArrowLeft size={16} />
            <span>
              Back to Patient: {episode.patients.last_name}, {episode.patients.first_name}
            </span>
          </Link>
        ) : (
          <Link to="/app/episodes" className="back-link">
            <ArrowLeft size={16} />
            <span>Back to Episodes</span>
          </Link>
        )}
      </div>

      {/* Header Card */}
      <div className="profile-header-card">
        <div className="profile-header-main">
          <div className="profile-avatar-box icon-teal">
            <Layers size={32} />
          </div>
          <div className="profile-identity">
            <div className="profile-title-row">
              <h1 className="profile-name">{episode.title}</h1>
            </div>
            <div className="profile-sub-row">
              <span className="identifier-tag font-mono">{episode.episode_identifier}</span>
              <span className={`status-pill status-${episode.status}`}>
                {episode.status === 'completed' && <CheckCircle size={12} />}
                {episode.status === 'paused' && <PauseCircle size={12} />}
                {episode.status === 'active' && <PlayCircle size={12} />}
                {episode.status === 'archived' && <Archive size={12} />}
                <span className="capitalize">{episode.status}</span>
              </span>
              <span className="practice-tag">
                <Building2 size={12} />
                <span>{activePractice?.name}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="profile-actions">
          {canEdit && episode.status !== 'archived' && (
            <Link to={`/app/episodes/${episode.id}/edit`} className="btn-secondary">
              <Edit size={16} />
              <span>Edit Details</span>
            </Link>
          )}

          {canChangeClinicalStatus && episode.status === 'active' && (
            <>
              <button
                type="button"
                className="btn-secondary"
                disabled={actionLoading}
                onClick={() => handleStatusChange('paused')}
              >
                <PauseCircle size={16} />
                <span>Pause Care</span>
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={actionLoading}
                onClick={() => handleStatusChange('completed')}
              >
                <CheckCircle size={16} />
                <span>Discharge / Complete</span>
              </button>
            </>
          )}

          {canChangeClinicalStatus && episode.status === 'paused' && (
            <>
              <button
                type="button"
                className="btn-secondary"
                disabled={actionLoading}
                onClick={() => handleStatusChange('active')}
              >
                <PlayCircle size={16} />
                <span>Resume Care</span>
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={actionLoading}
                onClick={() => handleStatusChange('completed')}
              >
                <CheckCircle size={16} />
                <span>Discharge / Complete</span>
              </button>
            </>
          )}

          {canChangeClinicalStatus && (episode.status === 'active' || episode.status === 'paused') && (
            <Link
              to={`/app/discharge-summaries/new?episodeId=${episode.id}`}
              className="btn-secondary"
              style={{ color: '#059669', borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' }}
            >
              <FileCheck size={16} />
              <span>Formal Discharge</span>
            </Link>
          )}

          {canChangeClinicalStatus && episode.status === 'completed' && (
            <>
              <Link
                to={`/app/discharge-summaries?episodeId=${episode.id}`}
                className="btn-secondary"
                style={{ color: '#059669', borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' }}
              >
                <FileCheck size={16} />
                <span>Discharge Summary</span>
              </Link>
              <button
                type="button"
                className="btn-secondary text-teal-700"
                disabled={actionLoading}
                onClick={() => handleStatusChange('active')}
              >
                <RotateCcw size={16} />
                <span>Reopen Episode</span>
              </button>
            </>
          )}

          {canArchive && (
            episode.status === 'archived' ? (
              <button
                type="button"
                className="btn-secondary text-emerald-600"
                disabled={actionLoading}
                onClick={handleRestore}
              >
                <RotateCcw size={16} />
                <span>Restore Episode</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-secondary text-danger"
                disabled={actionLoading}
                onClick={() => setArchiveModalOpen(true)}
              >
                <Archive size={16} />
                <span>Archive</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="profile-grid">
        {/* Patient Reference Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon icon-teal">
              <User size={18} />
            </div>
            <h3 className="card-title">Patient</h3>
          </div>
          <div className="card-content">
            {episode.patients ? (
              <div className="metadata-list">
                <div className="metadata-row">
                  <span className="metadata-label">Patient Name:</span>
                  <Link
                    to={`/app/patients/${episode.patients.id}`}
                    className="metadata-value font-semibold text-teal-700 underline"
                  >
                    {episode.patients.last_name}, {episode.patients.first_name}
                  </Link>
                </div>
                <div className="metadata-row">
                  <span className="metadata-label">Patient ID:</span>
                  <span className="metadata-value font-mono">
                    {episode.patients.patient_identifier}
                  </span>
                </div>
                {episode.patients.phone && (
                  <div className="metadata-row">
                    <span className="metadata-label">Phone:</span>
                    <span className="metadata-value">{episode.patients.phone}</span>
                  </div>
                )}
                {episode.patients.email && (
                  <div className="metadata-row">
                    <span className="metadata-label">Email:</span>
                    <span className="metadata-value">{episode.patients.email}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted">Unlinked Patient Record</p>
            )}
          </div>
        </div>

        {/* Clinical Parameters Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon icon-emerald">
              <Calendar size={18} />
            </div>
            <h3 className="card-title">Clinical Course Timeline</h3>
          </div>
          <div className="card-content">
            <div className="metadata-list">
              <div className="metadata-row">
                <span className="metadata-label">Start Date:</span>
                <span className="metadata-value font-medium">{episode.start_date}</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">End / Discharge Date:</span>
                <span className="metadata-value">{episode.end_date || 'In Progress'}</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Responsible Clinician:</span>
                <span className="metadata-value font-medium">{clinicianName}</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Operational Status:</span>
                <span className={`status-pill status-${episode.status}`}>
                  <span className="capitalize">{episode.status}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Goals & Description Card */}
        <div className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div className="card-icon icon-blue">
              <FileText size={18} />
            </div>
            <h3 className="card-title">Clinical Scope &amp; Goals</h3>
          </div>
          <div className="card-content">
            <p className="admin-notes-text">
              {episode.description || 'No detailed scope description recorded for this episode.'}
            </p>
            <div className="metadata-list mt-4 pt-4 border-top">
              <div className="metadata-row">
                <span className="metadata-label">Initiated On:</span>
                <span className="metadata-value">
                  {new Date(episode.created_at).toLocaleString('en-GB')}
                </span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Last Modified:</span>
                <span className="metadata-value">
                  {new Date(episode.updated_at).toLocaleString('en-GB')}
                </span>
              </div>
              {episode.closed_at && (
                <div className="metadata-row">
                  <span className="metadata-label">Closed / Discharged On:</span>
                  <span className="metadata-value text-emerald-600 font-medium">
                    {new Date(episode.closed_at).toLocaleString('en-GB')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Linked Scheduled Appointments Section */}
      <div className="patient-episodes-section mt-6">
        <div className="section-header-bar">
          <div className="section-header-title">
            <Clock size={20} className="text-blue-600" />
            <h3>Scheduled Appointments</h3>
            <span className="count-badge">{appointments.length}</span>
          </div>
          {canEdit && episode.status !== 'archived' && (
            <Link
              to={`/app/appointments/new?patientId=${episode.patient_id}&episodeId=${episode.id}`}
              className="btn-primary"
            >
              <CalendarPlus size={16} />
              <span>Schedule Appointment</span>
            </Link>
          )}
        </div>

        {appointments.length === 0 ? (
          <div className="empty-episodes-card">
            <Clock size={36} className="empty-state-icon" />
            <h4>No Appointments Linked to this Episode</h4>
            <p>
              Schedule an initial consultation, follow-up, or reassessment linked to this care episode.
            </p>
            {canEdit && episode.status !== 'archived' && (
              <Link
                to={`/app/appointments/new?patientId=${episode.patient_id}&episodeId=${episode.id}`}
                className="btn-secondary mt-4"
              >
                <CalendarPlus size={16} />
                <span>Schedule First Appointment</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="patient-table-container mt-4">
            <table className="patient-table">
              <thead>
                <tr>
                  <th>Appointment ID</th>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>Clinician</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => (
                  <tr key={appt.id} className="patient-row">
                    <td>
                      <Link to={`/app/appointments/${appt.id}`} className="identifier-link">
                        {appt.appointment_identifier}
                      </Link>
                    </td>
                    <td>
                      <div className="cell-date">
                        <Calendar size={12} />
                        <span>
                          {new Date(appt.scheduled_start).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          ({new Date(appt.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="capitalize">{appt.appointment_type.replace('_', ' ')}</span>
                    </td>
                    <td>
                      <span>
                        {appt.physiotherapist?.display_name ||
                          `${appt.physiotherapist?.first_name || ''} ${appt.physiotherapist?.last_name || ''}`.trim() ||
                          'Physiotherapist'}
                      </span>
                    </td>
                    <td>
                      <span className="capitalize text-xs text-gray-500">
                        {appt.location_mode.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill status-${appt.status}`}>
                        <span className="capitalize">{appt.status.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td>
                      <Link to={`/app/appointments/${appt.id}`} className="btn-table-action">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Staged Future Clinical Encounters Area */}
      <div className="staged-clinical-modules-container mt-6">
        <div className="staged-header">
          <Sparkles size={18} className="text-teal-600" />
          <h3>Subsequent Clinical Modules (Staged Anchor)</h3>
        </div>
        <p className="staged-desc">
          This episode anchors scheduled appointments and future clinical workflows.
          Appointments are administrative scheduling slots; clinical encounters and documentation will follow.
        </p>

        <div className="staged-grid">
          <div className="staged-card">
            <div className="staged-card-badge">Active Domain</div>
            <h4>Appointments &amp; Scheduling</h4>
            <p>Calendar bookings, schedule management, and practitioner conflict checks.</p>
          </div>

          <div className="staged-card">
            <div className="staged-card-badge">Upcoming Milestone</div>
            <h4>Clinical Visits &amp; Attendance</h4>
            <p>Physical encounter execution, check-in verification, and duration.</p>
          </div>

          <div className="staged-card">
            <div className="staged-card-badge">Upcoming Milestone</div>
            <h4>SOAP &amp; Progress Notes</h4>
            <p>Subjective, Objective, Assessment, and Plan clinical documentation.</p>
          </div>

          <div className="staged-card">
            <div className="staged-card-badge">Upcoming Milestone</div>
            <h4>Treatment Plans &amp; Outcomes</h4>
            <p>Care plans, exercise prescriptions, and objective outcome measure tracking.</p>
          </div>
        </div>
      </div>

      {/* Archive Modal */}
      {archiveModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <Archive size={24} className="text-danger" />
              <h3>Archive Episode of Care</h3>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to archive <strong>{episode.title}</strong> ({episode.episode_identifier})?
              </p>
              <p className="modal-subtext">
                Archived episodes will be excluded from default views. All data remains preserved in the database.
              </p>
              <div className="form-group mt-4">
                <label htmlFor="archiveReason">Reason for Archiving (Optional)</label>
                <input
                  id="archiveReason"
                  type="text"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="e.g. Opened in error / Duplicate course"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setArchiveModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary btn-danger"
                onClick={handleArchive}
                disabled={actionLoading}
              >
                {actionLoading ? 'Archiving...' : 'Confirm Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
