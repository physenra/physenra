import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import { episodeService } from '../../services/episodeService';
import { appointmentService } from '../../services/appointmentService';
import { walletService } from '../../services/walletService';
import { useRole } from '../../hooks/useRole';
import { usePractice } from '../../hooks/usePractice';
import type { Patient, EpisodeWithPatient, AppointmentWithRelations, PatientWalletWithBalance } from '../../types/models';
import {
  ArrowLeft,
  Edit,
  Archive,
  RotateCcw,
  User,
  Phone,
  ShieldAlert,
  AlertCircle,
  FileText,
  Activity,
  Building2,
  FolderKanban,
  FolderPlus,
  Calendar,
  Clock,
  CalendarPlus,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  Wallet,
} from 'lucide-react';

export const PatientProfilePage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const { isAccountant, isPatient, isOwner, isManager, isReceptionist } = useRole();
  const { activePractice } = usePractice();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeWithPatient[]>([]);
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [wallet, setWallet] = useState<PatientWalletWithBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');

  const fetchPatient = useCallback(async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      setError(null);
      const [patientData, episodeResult, appointmentResult, walletData] = await Promise.all([
        patientService.getPatientById(patientId),
        episodeService.getEpisodes({ patientId, status: 'all', limit: 100 }),
        appointmentService.getAppointments({ patientId, limit: 100 }),
        activePractice
          ? walletService.getWalletByPatientId(patientId, activePractice.id).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (!patientData) {
        setError('Patient not found or you do not have permission to view this record.');
      } else {
        setPatient(patientData);
        setEpisodes(episodeResult.episodes);
        setAppointments(appointmentResult.appointments);
        setWallet(walletData);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load patient record.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [patientId, activePractice]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  const handleArchive = async () => {
    if (!patient) return;
    try {
      setActionLoading(true);
      await patientService.archivePatient(patient.id, archiveReason.trim() || undefined);
      setArchiveModalOpen(false);
      setArchiveReason('');
      await fetchPatient();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to archive patient.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnarchive = async () => {
    if (!patient) return;
    try {
      setActionLoading(true);
      await patientService.unarchivePatient(patient.id);
      await fetchPatient();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to restore patient.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const calculateAge = (dob: string | null): string => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return 'N/A';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} years`;
  };

  const canEdit = !isAccountant && !isPatient;
  const canArchive = isOwner || isManager || isReceptionist;

  if (loading) {
    return (
      <div className="table-loading-container">
        <div className="loading-spinner" />
        <p>Loading patient demographic profile...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="empty-patient-state">
        <AlertCircle size={48} className="text-danger" />
        <h3>Patient Record Unavailable</h3>
        <p>{error || 'The requested patient record could not be found.'}</p>
        <Link to="/app/patients" className="btn-secondary mt-4">
          <ArrowLeft size={16} />
          <span>Return to Registry</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="patient-profile-page">
      {/* Back Link */}
      <div className="profile-top-nav">
        <Link to="/app/patients" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to Patient Registry</span>
        </Link>
      </div>

      {/* Profile Header Card */}
      <div className="profile-header-card">
        <div className="profile-header-main">
          <div className="profile-avatar-box">
            <User size={36} />
          </div>
          <div className="profile-identity">
            <div className="profile-title-row">
              <h1 className="profile-name">
                {patient.last_name}, {patient.first_name} {patient.middle_name || ''}
              </h1>
              {patient.preferred_name && (
                <span className="preferred-badge">“{patient.preferred_name}”</span>
              )}
            </div>
            <div className="profile-sub-row">
              <span className="identifier-tag font-mono">
                {patient.patient_identifier}
              </span>
              <span className={`status-pill status-${patient.status}`}>
                {patient.status === 'archived' && <Archive size={12} />}
                <span className="capitalize">{patient.status}</span>
              </span>
              <span className="practice-tag">
                <Building2 size={12} />
                <span>{activePractice?.name}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Profile Action Buttons */}
        <div className="profile-actions">
          {canEdit && patient.status !== 'archived' && (
            <Link
              to={`/app/patients/${patient.id}/edit`}
              className="btn-secondary"
            >
              <Edit size={16} />
              <span>Edit Details</span>
            </Link>
          )}

          {canArchive && (
            patient.status === 'archived' ? (
              <button
                type="button"
                onClick={handleUnarchive}
                disabled={actionLoading}
                className="btn-secondary text-emerald-600"
              >
                <RotateCcw size={16} />
                <span>Restore Patient</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setArchiveModalOpen(true)}
                disabled={actionLoading}
                className="btn-secondary text-danger"
              >
                <Archive size={16} />
                <span>Archive</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Profile Information Grid */}
      <div className="profile-grid">
        {/* Demographics Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon icon-teal">
              <User size={18} />
            </div>
            <h3 className="card-title">Demographics</h3>
          </div>
          <div className="card-content">
            <div className="metadata-list">
              <div className="metadata-row">
                <span className="metadata-label">Date of Birth:</span>
                <span className="metadata-value">
                  {patient.date_of_birth ? (
                    <>
                      {patient.date_of_birth} ({calculateAge(patient.date_of_birth)})
                    </>
                  ) : (
                    'Not recorded'
                  )}
                </span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Administrative Sex:</span>
                <span className="metadata-value capitalize">
                  {patient.sex || 'Not recorded'}
                </span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Preferred Name:</span>
                <span className="metadata-value">
                  {patient.preferred_name || 'None'}
                </span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Practice ID:</span>
                <span className="metadata-value font-mono text-sm">
                  {patient.practice_id}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon icon-emerald">
              <Phone size={18} />
            </div>
            <h3 className="card-title">Contact &amp; Address</h3>
          </div>
          <div className="card-content">
            <div className="metadata-list">
              <div className="metadata-row">
                <span className="metadata-label">Phone:</span>
                <span className="metadata-value font-medium">
                  {patient.phone || 'No phone recorded'}
                </span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Email:</span>
                <span className="metadata-value font-medium">
                  {patient.email || 'No email recorded'}
                </span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Residential Address:</span>
                <span className="metadata-value text-right">
                  {patient.address_line1 ? (
                    <>
                      {patient.address_line1}
                      {patient.address_line2 && <><br />{patient.address_line2}</>}
                      <br />
                      {[patient.city, patient.state_province, patient.postal_code]
                        .filter(Boolean)
                        .join(', ')}
                      <br />
                      {patient.country}
                    </>
                  ) : (
                    'No address recorded'
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contact Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon icon-blue">
              <ShieldAlert size={18} />
            </div>
            <h3 className="card-title">Emergency Contact</h3>
          </div>
          <div className="card-content">
            <div className="metadata-list">
              <div className="metadata-row">
                <span className="metadata-label">Name:</span>
                <span className="metadata-value font-medium">
                  {patient.emergency_contact_name || 'None recorded'}
                </span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Relationship:</span>
                <span className="metadata-value">
                  {patient.emergency_contact_relationship || 'N/A'}
                </span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Emergency Phone:</span>
                <span className="metadata-value">
                  {patient.emergency_contact_phone || 'N/A'}
                </span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Emergency Email:</span>
                <span className="metadata-value">
                  {patient.emergency_contact_email || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Administrative Details Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon icon-teal">
              <FileText size={18} />
            </div>
            <h3 className="card-title">Administrative Notes</h3>
          </div>
          <div className="card-content">
            <p className="admin-notes-text">
              {patient.administrative_notes || 'No administrative instructions recorded for this patient.'}
            </p>
            <div className="metadata-list mt-4 pt-4 border-top">
              <div className="metadata-row">
                <span className="metadata-label">Registered On:</span>
                <span className="metadata-value">
                  {new Date(patient.created_at).toLocaleString('en-GB')}
                </span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Last Updated:</span>
                <span className="metadata-value">
                  {new Date(patient.updated_at).toLocaleString('en-GB')}
                </span>
              </div>
              {patient.archived_at && (
                <div className="metadata-row">
                  <span className="metadata-label text-danger">Archived At:</span>
                  <span className="metadata-value text-danger">
                    {new Date(patient.archived_at).toLocaleString('en-GB')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Patient Wallet & Credit Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon icon-blue">
              <Wallet size={18} />
            </div>
            <h3 className="card-title">Patient Wallet &amp; Credit</h3>
          </div>
          <div className="card-content">
            {wallet ? (
              <div className="metadata-list">
                <div className="metadata-row">
                  <span className="metadata-label">Wallet Number:</span>
                  <span className="metadata-value font-mono">
                    <Link to={`/app/wallets/${wallet.id}`} className="text-primary-600 hover:underline">
                      {wallet.wallet_number}
                    </Link>
                  </span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-label">Available Balance:</span>
                  <span className="metadata-value font-bold text-emerald-600 text-lg">
                    {wallet.currency} {Number(wallet.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-label">Account Status:</span>
                  <span className="metadata-value capitalize font-medium">
                    {wallet.status}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-top flex justify-between items-center">
                  <Link
                    to={`/app/wallets/${wallet.id}`}
                    className="btn-secondary text-xs"
                  >
                    View Wallet Ledger &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-sm text-gray-500 mb-3">No active wallet provisioned yet for this patient.</p>
                <Link
                  to="/app/wallets"
                  className="btn-primary text-xs inline-flex items-center gap-1"
                >
                  <Wallet size={14} /> Provision Wallet
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Episodes of Care Section */}
      <div className="patient-episodes-section mt-6">
        <div className="section-header-bar">
          <div className="section-header-title">
            <FolderKanban size={20} className="text-teal-600" />
            <h3>Episodes of Care</h3>
            <span className="count-badge">{episodes.length}</span>
          </div>
          {canEdit && patient.status !== 'archived' && (
            <Link
              to={`/app/patients/${patient.id}/episodes/new`}
              className="btn-primary"
            >
              <FolderPlus size={16} />
              <span>Open New Episode</span>
            </Link>
          )}
        </div>

        {episodes.length === 0 ? (
          <div className="empty-episodes-card">
            <FolderKanban size={36} className="empty-state-icon" />
            <h4>No Episodes of Care</h4>
            <p>
              This patient has no active or past clinical courses of care recorded in this practice.
            </p>
            {canEdit && patient.status !== 'archived' && (
              <Link
                to={`/app/patients/${patient.id}/episodes/new`}
                className="btn-secondary mt-4"
              >
                <FolderPlus size={16} />
                <span>Open First Episode of Care</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="patient-table-container mt-4">
            <table className="patient-table">
              <thead>
                <tr>
                  <th>Episode ID</th>
                  <th>Title / Condition</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {episodes.map((ep) => (
                  <tr key={ep.id} className="patient-row">
                    <td>
                      <Link to={`/app/episodes/${ep.id}`} className="identifier-link">
                        {ep.episode_identifier}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/app/episodes/${ep.id}`} className="patient-name-link">
                        <span className="name-bold">{ep.title}</span>
                      </Link>
                      {ep.description && (
                        <p className="table-subtext">{ep.description}</p>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill status-${ep.status}`}>
                        {ep.status === 'completed' && <CheckCircle size={12} />}
                        {ep.status === 'paused' && <PauseCircle size={12} />}
                        {ep.status === 'active' && <PlayCircle size={12} />}
                        {ep.status === 'archived' && <Archive size={12} />}
                        <span className="capitalize">{ep.status}</span>
                      </span>
                    </td>
                    <td>
                      <div className="cell-date">
                        <Calendar size={12} />
                        <span>{ep.start_date}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-date">
                        <span>{ep.end_date || 'In Progress'}</span>
                      </div>
                    </td>
                    <td>
                      <Link to={`/app/episodes/${ep.id}`} className="btn-table-action">
                        View Course
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Appointments & Schedule Section */}
      <div className="patient-episodes-section mt-6">
        <div className="section-header-bar">
          <div className="section-header-title">
            <Clock size={20} className="text-blue-600" />
            <h3>Scheduled Appointments</h3>
            <span className="count-badge">{appointments.length}</span>
          </div>
          {canEdit && patient.status !== 'archived' && (
            <Link
              to={`/app/appointments/new?patientId=${patient.id}`}
              className="btn-primary"
            >
              <CalendarPlus size={16} />
              <span>Book Appointment</span>
            </Link>
          )}
        </div>

        {appointments.length === 0 ? (
          <div className="empty-episodes-card">
            <Clock size={36} className="empty-state-icon" />
            <h4>No Appointments Scheduled</h4>
            <p>
              This patient has no upcoming or past scheduled appointments in this practice.
            </p>
            {canEdit && patient.status !== 'archived' && (
              <Link
                to={`/app/appointments/new?patientId=${patient.id}`}
                className="btn-secondary mt-4"
              >
                <CalendarPlus size={16} />
                <span>Book First Appointment</span>
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

      {/* Scope Boundary Notification */}
      <div className="info-banner mt-6">
        <div className="info-banner-icon">
          <Activity size={24} />
        </div>
        <div className="info-banner-content">
          <h4 className="info-banner-title">Clinical Care Hierarchy Established</h4>
          <p className="info-banner-text">
            Patient Identity (<strong>{patient.patient_identifier}</strong>), Episodes of Care,
            and Scheduled Appointments are active. Subsequent modules (Clinical Visits and SOAP Progress Notes)
            will attach to specific care episodes in future development phases.
          </p>
        </div>
      </div>

      {/* Archive Confirmation Modal */}
      {archiveModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <Archive size={24} className="text-danger" />
              <h3>Archive Patient Record</h3>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to archive <strong>{patient.first_name} {patient.last_name}</strong> ({patient.patient_identifier})?
              </p>
              <p className="modal-subtext">
                Archived patients will not appear in the active registry directory by default.
                No clinical or demographic records will be deleted. You can restore this patient at any time.
              </p>
              <div className="form-group mt-4">
                <label htmlFor="archiveReason">Reason for Archiving (Optional)</label>
                <input
                  id="archiveReason"
                  type="text"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="e.g. Patient moved away / Discharged"
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
