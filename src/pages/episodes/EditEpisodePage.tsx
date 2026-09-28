import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { episodeService, ClinicianOption } from '../../services/episodeService';
import type { EpisodeWithPatient, EpisodeStatus } from '../../types/models';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Activity,
  Lock,
} from 'lucide-react';

export const EditEpisodePage: React.FC = () => {
  const { episodeId } = useParams<{ episodeId: string }>();
  const navigate = useNavigate();

  const [episode, setEpisode] = useState<EpisodeWithPatient | null>(null);
  const [clinicians, setClinicians] = useState<ClinicianOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [responsibleClinicianId, setResponsibleClinicianId] = useState('');
  const [status, setStatus] = useState<EpisodeStatus>('active');

  useEffect(() => {
    async function loadData() {
      if (!episodeId) return;
      try {
        setLoading(true);
        setError(null);
        const [ep, clinicianList] = await Promise.all([
          episodeService.getEpisodeById(episodeId),
          episodeService.getPracticeClinicians(),
        ]);

        if (!ep) {
          setError('Episode of care record not found.');
          return;
        }

        setEpisode(ep);
        setClinicians(clinicianList);
        setTitle(ep.title);
        setDescription(ep.description || '');
        setStartDate(ep.start_date);
        setEndDate(ep.end_date || '');
        setResponsibleClinicianId(ep.primary_physiotherapist_id || '');
        setStatus(ep.status);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load episode details.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [episodeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Episode title is required.');
      return;
    }
    if (!episodeId) return;

    try {
      setError(null);
      setSubmitting(true);

      await episodeService.updateEpisode(episodeId, {
        title: title.trim(),
        description: description.trim() || null,
        start_date: startDate,
        end_date: endDate || null,
        primary_physiotherapist_id: responsibleClinicianId || null,
        status: status !== 'archived' ? status : undefined,
      });

      navigate(`/app/episodes/${episodeId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save changes.';
      setError(msg);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="table-loading-container">
        <div className="loading-spinner" />
        <p>Loading episode details...</p>
      </div>
    );
  }

  if (error && !episode) {
    return (
      <div className="empty-patient-state">
        <AlertCircle size={48} className="text-danger" />
        <h3>Cannot Edit Episode</h3>
        <p>{error}</p>
        <Link to="/app/episodes" className="btn-secondary mt-4">
          <ArrowLeft size={16} />
          <span>Return to Episodes</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="edit-episode-page">
      <div className="page-header">
        <div className="page-header-text">
          <Link to={`/app/episodes/${episodeId}`} className="back-link">
            <ArrowLeft size={16} />
            <span>Cancel and Return to Episode</span>
          </Link>
          <h1 className="page-title">Edit Episode of Care</h1>
          <p className="page-subtitle">
            Update clinical course parameters for <strong>{episode?.title}</strong>
          </p>
        </div>

        <div className="immutable-identifier-badge">
          <Lock size={14} />
          <span>Episode ID: <strong>{episode?.episode_identifier}</strong></span>
        </div>
      </div>

      {error && (
        <div className="auth-error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

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
              />
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
                <label htmlFor="endDate">End Date</label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EpisodeStatus)}
                  disabled={episode?.status === 'archived'}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  {episode?.status === 'archived' && (
                    <option value="archived">Archived</option>
                  )}
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
            </div>

            <div className="form-group mt-4">
              <label htmlFor="description">Clinical Goals &amp; Scope Summary</label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <Link to={`/app/episodes/${episodeId}`} className="btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            <Save size={16} />
            <span>{submitting ? 'Saving Changes...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
