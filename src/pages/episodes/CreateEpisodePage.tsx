import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { episodeService, ClinicianOption } from '../../services/episodeService';
import { patientService } from '../../services/patientService';
import { usePractice } from '../../hooks/usePractice';
import type { Patient, EpisodeStatus } from '../../types/models';
import {
  FolderPlus,
  ArrowLeft,
  AlertCircle,
  User,
  Activity,
  FileText,
} from 'lucide-react';

export const CreateEpisodePage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { activePractice } = usePractice();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [clinicians, setClinicians] = useState<ClinicianOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [responsibleClinicianId, setResponsibleClinicianId] = useState('');
  const [status, setStatus] = useState<EpisodeStatus>('active');

  useEffect(() => {
    async function loadData() {
      if (!patientId) return;
      try {
        setLoading(true);
        setError(null);
        const [patientData, clinicianList] = await Promise.all([
          patientService.getPatientById(patientId),
          episodeService.getPracticeClinicians(),
        ]);

        if (!patientData) {
          setError('Patient record not found in the active practice.');
          return;
        }

        setPatient(patientData);
        setClinicians(clinicianList);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load patient details.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [patientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for this episode of care.');
      return;
    }
    if (!patientId || !activePractice) {
      setError('Patient and practice context are required.');
      return;
    }

    try {
      setError(null);
      setSubmitting(true);

      const created = await episodeService.createEpisode({
        practice_id: activePractice.id,
        patient_id: patientId,
        title: title.trim(),
        description: description.trim() || null,
        start_date: startDate,
        end_date: endDate || null,
        primary_physiotherapist_id: responsibleClinicianId || null,
        status,
      });

      navigate(`/app/episodes/${created.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to open episode of care.';
      setError(msg);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="table-loading-container">
        <div className="loading-spinner" />
        <p>Loading patient context...</p>
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="empty-patient-state">
        <AlertCircle size={48} className="text-danger" />
        <h3>Cannot Open Episode</h3>
        <p>{error}</p>
        <Link to="/app/patients" className="btn-secondary mt-4">
          <ArrowLeft size={16} />
          <span>Return to Patients</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="create-episode-page">
      <div className="page-header">
        <div className="page-header-text">
          <Link to={`/app/patients/${patientId}`} className="back-link">
            <ArrowLeft size={16} />
            <span>Back to Patient Profile</span>
          </Link>
          <h1 className="page-title">Open Episode of Care</h1>
          <p className="page-subtitle">
            Initiate a dedicated clinical course of care for{' '}
            <strong>{patient?.first_name} {patient?.last_name}</strong> ({patient?.patient_identifier})
          </p>
        </div>
      </div>

      {error && (
        <div className="auth-error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Target Patient Card */}
      <div className="target-patient-card">
        <div className="target-patient-avatar">
          <User size={24} />
        </div>
        <div className="target-patient-details">
          <div className="target-patient-name">
            {patient?.last_name}, {patient?.first_name}
          </div>
          <div className="target-patient-sub">
            <span className="font-mono text-xs font-semibold">{patient?.patient_identifier}</span>
            <span>•</span>
            <span>DOB: {patient?.date_of_birth || 'Not recorded'}</span>
            {patient?.phone && (
              <>
                <span>•</span>
                <span>{patient.phone}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="patient-form">
        <div className="form-card">
          <div className="form-card-header">
            <Activity size={18} className="text-teal-600" />
            <h3>Episode Parameters</h3>
          </div>
          <div className="form-card-body">
            <div className="form-group">
              <label htmlFor="title">
                Course of Care Title <span className="text-danger">*</span>
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Left Knee Post-Op ACL Rehabilitation / Acute Cervical Sprain"
              />
              <span className="field-hint">
                A clinically descriptive title summarizing the primary complaint or treatment focus.
              </span>
            </div>

            <div className="form-grid-3 mt-4">
              <div className="form-group">
                <label htmlFor="startDate">
                  Start Date <span className="text-danger">*</span>
                </label>
                <input
                  id="startDate"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="endDate">Expected End Date (Optional)</label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="status">Initial Status</label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EpisodeStatus)}
                >
                  <option value="active">Active (Ongoing care)</option>
                  <option value="paused">Paused (On hold)</option>
                </select>
              </div>
            </div>

            <div className="form-group mt-4">
              <label htmlFor="responsibleClinician">
                Primary Responsible Physiotherapist
              </label>
              <select
                id="responsibleClinician"
                value={responsibleClinicianId}
                onChange={(e) => setResponsibleClinicianId(e.target.value)}
              >
                <option value="">Select clinician (Optional)...</option>
                {clinicians.map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.name} ({c.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
              <span className="field-hint">
                Only active practitioners with clinical roles in this practice may be assigned.
              </span>
            </div>

            <div className="form-group mt-4">
              <label htmlFor="description">Clinical Goals &amp; Scope Summary</label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 12-week rehabilitation focused on restoring quadriceps symmetry, knee flexion ROM to 135 deg, and progressive return-to-sport testing."
              />
            </div>
          </div>
        </div>

        {/* Scope Notice */}
        <div className="info-banner">
          <div className="info-banner-icon">
            <FileText size={20} />
          </div>
          <div className="info-banner-content">
            <h4 className="info-banner-title">Discrete Course of Care</h4>
            <p className="info-banner-text">
              Opening this episode establishes an independent course of care. Appointments,
              clinical encounter visits, and SOAP progress documentation will attach to this episode
              once those clinical modules are activated.
            </p>
          </div>
        </div>

        <div className="form-actions">
          <Link to={`/app/patients/${patientId}`} className="btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            <FolderPlus size={16} />
            <span>{submitting ? 'Opening Episode...' : 'Open Episode of Care'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
