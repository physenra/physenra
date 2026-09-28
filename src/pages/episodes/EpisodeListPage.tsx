import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { episodeService, GetEpisodesResult } from '../../services/episodeService';
import { usePractice } from '../../hooks/usePractice';
import type { EpisodeStatus, EpisodeWithPatient } from '../../types/models';
import {
  FolderKanban,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Calendar,
  User,
  Archive,
  CheckCircle,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';

export const EpisodeListPage: React.FC = () => {
  const { activePractice } = usePractice();

  const [data, setData] = useState<GetEpisodesResult>({
    episodes: [],
    totalCount: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EpisodeStatus | 'all'>('active');
  const [page, setPage] = useState(1);

  const fetchEpisodes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await episodeService.getEpisodes({
        search: search.trim() || undefined,
        status: statusFilter,
        page,
        limit: 20,
      });
      setData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load episodes of care.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchEpisodes();
  }, [fetchEpisodes]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEpisodes();
  };

  const handleStatusChange = (newStatus: EpisodeStatus | 'all') => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  return (
    <div className="episodes-page">
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Episodes of Care</h1>
          <p className="page-subtitle">
            Clinical courses of care across patients in {activePractice?.name}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by title, ID, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-secondary btn-search">
            Search
          </button>
        </form>

        <div className="status-filter-group">
          <Filter size={16} className="filter-icon" />
          <span className="filter-label">Status:</span>
          <button
            type="button"
            className={`filter-btn ${statusFilter === 'active' ? 'filter-btn-active' : ''}`}
            onClick={() => handleStatusChange('active')}
          >
            Active
          </button>
          <button
            type="button"
            className={`filter-btn ${statusFilter === 'paused' ? 'filter-btn-active' : ''}`}
            onClick={() => handleStatusChange('paused')}
          >
            Paused
          </button>
          <button
            type="button"
            className={`filter-btn ${statusFilter === 'completed' ? 'filter-btn-active' : ''}`}
            onClick={() => handleStatusChange('completed')}
          >
            Completed
          </button>
          <button
            type="button"
            className={`filter-btn ${statusFilter === 'all' ? 'filter-btn-active' : ''}`}
            onClick={() => handleStatusChange('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`filter-btn ${statusFilter === 'archived' ? 'filter-btn-active' : ''}`}
            onClick={() => handleStatusChange('archived')}
          >
            Archived
          </button>
        </div>
      </div>

      {error && (
        <div className="auth-error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Episode Table */}
      <div className="patient-table-container">
        {loading ? (
          <div className="table-loading-container">
            <div className="loading-spinner" />
            <p>Loading episodes of care...</p>
          </div>
        ) : data.episodes.length === 0 ? (
          <div className="empty-patient-state">
            <FolderKanban size={48} className="empty-state-icon" />
            <h3>No Episodes Found</h3>
            <p>
              {search.trim()
                ? `No episodes match "${search}".`
                : statusFilter === 'archived'
                ? 'No archived episodes in this practice.'
                : 'No episodes matching this status in this practice.'}
            </p>
          </div>
        ) : (
          <table className="patient-table">
            <thead>
              <tr>
                <th>Episode ID</th>
                <th>Course of Care Title</th>
                <th>Patient</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>End Date</th>
              </tr>
            </thead>
            <tbody>
              {data.episodes.map((ep: EpisodeWithPatient) => (
                <tr key={ep.id} className="patient-row">
                  <td>
                    <Link
                      to={`/app/episodes/${ep.id}`}
                      className="identifier-link"
                      title="View Episode Profile"
                    >
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
                    {ep.patients ? (
                      <Link
                        to={`/app/patients/${ep.patients.id}`}
                        className="patient-link-cell"
                      >
                        <User size={14} />
                        <span>
                          {ep.patients.last_name}, {ep.patients.first_name}
                        </span>
                        <span className="font-mono text-xs text-muted">
                          ({ep.patients.patient_identifier})
                        </span>
                      </Link>
                    ) : (
                      <span className="text-muted">Unlinked Patient</span>
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
                      <span>{ep.end_date || '—'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {!loading && data.totalCount > 0 && (
        <div className="pagination-bar">
          <span className="pagination-info">
            Showing {(data.page - 1) * data.limit + 1} to{' '}
            {Math.min(data.page * data.limit, data.totalCount)} of {data.totalCount} episodes
          </span>
          <div className="pagination-controls">
            <button
              type="button"
              className="btn-pagination"
              disabled={data.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <span className="page-indicator">
              Page {data.page} of {data.totalPages}
            </span>
            <button
              type="button"
              className="btn-pagination"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
