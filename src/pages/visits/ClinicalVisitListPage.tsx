import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  clinicalVisitService,
  GetClinicalVisitsResult,
} from '../../services/clinicalVisitService';
import type {
  ClinicalVisitStatus,
  ClinicalVisitLocationMode,
} from '../../types/models';

export const ClinicalVisitListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [visitsData, setVisitsData] = useState<GetClinicalVisitsResult>({
    visits: [],
    totalCount: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const statusFilter = (searchParams.get('status') as ClinicalVisitStatus | 'all') || 'all';
  const locationFilter = (searchParams.get('location') as ClinicalVisitLocationMode | 'all') || 'all';
  const dateFilter = searchParams.get('date') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const loadVisits = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await clinicalVisitService.getClinicalVisits({
        page: currentPage,
        limit: 20,
        status: statusFilter,
        locationMode: locationFilter,
        date: dateFilter || undefined,
      });
      setVisitsData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load clinical visits.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, [statusFilter, locationFilter, dateFilter, currentPage]);

  const handleStatusFilterChange = (status: string) => {
    const params = new URLSearchParams(searchParams);
    if (status === 'all') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleLocationFilterChange = (loc: string) => {
    const params = new URLSearchParams(searchParams);
    if (loc === 'all') {
      params.delete('location');
    } else {
      params.set('location', loc);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const params = new URLSearchParams(searchParams);
    if (!e.target.value) {
      params.delete('date');
    } else {
      params.set('date', e.target.value);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
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
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '0.75rem',
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

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Clinical Visits</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Record and review actual clinical encounter occurrences, durations, and delivery modes.
          </p>
        </div>
        <Link
          to="/app/visits/new"
          className="btn btn-primary"
          style={{
            backgroundColor: '#0284c7',
            color: '#fff',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          + Record Clinical Visit
        </Link>
      </div>

      {/* Domain Separation Notice */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          fontSize: '0.8125rem',
          color: '#475569',
        }}
      >
        <strong>Domain Boundary:</strong> A Clinical Visit represents an actual clinical encounter execution. It does
        not generate a clinical SOAP note or trigger billing/package consumption in this phase.
      </div>

      {/* Filters Bar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          backgroundColor: '#fff',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            style={{ padding: '0.375rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="incomplete">Incomplete</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
            Location Mode
          </label>
          <select
            value={locationFilter}
            onChange={(e) => handleLocationFilterChange(e.target.value)}
            style={{ padding: '0.375rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          >
            <option value="all">All Modes</option>
            <option value="clinic">In-Clinic</option>
            <option value="home">Home Visit</option>
            <option value="telehealth">Telehealth</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
            Date
          </label>
          <input
            type="date"
            value={dateFilter}
            onChange={handleDateChange}
            style={{ padding: '0.375rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          />
        </div>

        {(statusFilter !== 'all' || locationFilter !== 'all' || dateFilter) && (
          <div style={{ alignSelf: 'flex-end' }}>
            <button
              onClick={clearFilters}
              style={{
                background: 'none',
                border: 'none',
                color: '#0284c7',
                fontSize: '0.875rem',
                cursor: 'pointer',
                padding: '0.375rem 0.5rem',
              }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Visits Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading clinical visits...</div>
        ) : visitsData.visits.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No clinical visits found</p>
            <p style={{ fontSize: '0.875rem' }}>
              No clinical visits match the current filters. Start a visit from an Appointment or record a standalone visit.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>Identifier</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>Patient</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>Clinician</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>Actual Start</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>Duration</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>Mode</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>Linked Appt</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visitsData.visits.map((visit) => (
                <tr key={visit.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                    <Link to={`/app/visits/${visit.id}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                      {visit.visit_identifier}
                    </Link>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {visit.patient ? (
                      <Link to={`/app/patients/${visit.patient.id}`} style={{ color: '#1e293b', textDecoration: 'none', fontWeight: 500 }}>
                        {visit.patient.first_name} {visit.patient.last_name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                    {visit.physiotherapist?.display_name ||
                      (visit.physiotherapist?.first_name
                        ? `${visit.physiotherapist.first_name} ${visit.physiotherapist.last_name || ''}`
                        : 'Clinician')}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{formatStatusBadge(visit.status)}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                    {formatDate(visit.actual_start)} {visit.actual_start ? `at ${formatTime(visit.actual_start)}` : ''}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                    {visit.duration_minutes ? `${visit.duration_minutes} min` : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                    {formatLocationMode(visit.location_mode)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {visit.appointment ? (
                      <Link
                        to={`/app/appointments/${visit.appointment.id}`}
                        style={{ color: '#0284c7', textDecoration: 'none', fontSize: '0.8125rem' }}
                      >
                        {visit.appointment.appointment_identifier}
                      </Link>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Standalone</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <Link
                      to={`/app/visits/${visit.id}`}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        textDecoration: 'none',
                      }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {visitsData.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              Showing {visitsData.visits.length} of {visitsData.totalCount} visits
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={currentPage <= 1}
                onClick={() => {
                  const p = new URLSearchParams(searchParams);
                  p.set('page', (currentPage - 1).toString());
                  setSearchParams(p);
                }}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.8125rem', alignSelf: 'center', color: '#475569' }}>
                Page {currentPage} of {visitsData.totalPages}
              </span>
              <button
                disabled={currentPage >= visitsData.totalPages}
                onClick={() => {
                  const p = new URLSearchParams(searchParams);
                  p.set('page', (currentPage + 1).toString());
                  setSearchParams(p);
                }}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
