import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Dumbbell, Search, Plus, AlertCircle } from 'lucide-react';
import { hepService, GetProgramsResult } from '../../services/hepService';
import type { HEPStatus } from '../../types/models';

export const HEPListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [programsData, setProgramsData] = useState<GetProgramsResult>({
    programs: [],
    totalCount: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters from URL
  const statusFilter = (searchParams.get('status') as HEPStatus | 'all') || 'all';
  const searchQuery = searchParams.get('q') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const patientFilter = searchParams.get('patientId') || '';

  const [searchInput, setSearchInput] = useState(searchQuery);

  const loadPrograms = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await hepService.getPrograms({
        page: currentPage,
        limit: 20,
        status: statusFilter,
        searchQuery: searchQuery || undefined,
        patientId: patientFilter || undefined,
      });
      setProgramsData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load home exercise programs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, [statusFilter, searchQuery, currentPage, patientFilter]);

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams);
    if (status === 'all') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      params.set('q', searchInput.trim());
    } else {
      params.delete('q');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  const getStatusBadgeStyle = (status: HEPStatus) => {
    switch (status) {
      case 'draft':
        return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
      case 'active':
        return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
      case 'paused':
        return { backgroundColor: '#ffedd5', color: '#9a3412', border: '1px solid #fed7aa' };
      case 'completed':
        return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
      case 'discontinued':
        return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
      default:
        return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        dateStyle: 'medium',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: '#e0f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0284c7',
            }}
          >
            <Dumbbell size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Home Exercise Programs (HEP)
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
              Prescribe, track, and manage individualized home rehabilitation programs and exercise dosages.
            </p>
          </div>
        </div>

        <div>
          <Link
            to="/app/hep/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              padding: '0.625rem 1.25rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            <Plus size={16} />
            Prescribe Exercise Program
          </Link>
        </div>
      </div>

      {/* Domain Separation Notice */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '0.875rem 1rem',
          marginBottom: '1.5rem',
          fontSize: '0.8125rem',
          color: '#475569',
        }}
      >
        <strong>Clinical Architecture Invariant:</strong> Patient ≠ Episode of Care ≠ Appointment ≠ Clinical Visit ≠ Clinical Note ≠ Clinical Outcome Measure ≠ Home Exercise Program.
        Exercise definitions are reusable catalogue assets; exercise prescriptions are immutable clinical records upon activation. No hard deletes.
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '1rem 1.25rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Status Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Status:</span>
          {(['all', 'draft', 'active', 'paused', 'completed', 'discontinued'] as const).map((st) => (
            <button
              key={st}
              onClick={() => handleStatusChange(st)}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '6px',
                border: statusFilter === st ? '1px solid #0284c7' : '1px solid #cbd5e1',
                backgroundColor: statusFilter === st ? '#e0f2fe' : '#ffffff',
                color: statusFilter === st ? '#0284c7' : '#475569',
                fontSize: '0.8125rem',
                fontWeight: statusFilter === st ? 600 : 400,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              placeholder="Search title or HEP ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem 0.4rem 2rem',
                fontSize: '0.875rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                minWidth: '220px',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0.4rem 0.875rem',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#334155',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                const params = new URLSearchParams(searchParams);
                params.delete('q');
                params.set('page', '1');
                setSearchParams(params);
              }}
              style={{
                padding: '0.4rem 0.75rem',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            onClick={loadPrograms}
            style={{
              marginLeft: 'auto',
              backgroundColor: '#ffffff',
              border: '1px solid #fca5a5',
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '3rem',
            textAlign: 'center',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            color: '#64748b',
          }}
        >
          <p style={{ margin: 0 }}>Loading Home Exercise Programs...</p>
        </div>
      ) : programsData.programs.length === 0 ? (
        /* Empty State */
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              marginBottom: '1rem',
            }}
          >
            <Dumbbell size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: '0 0 0.5rem 0' }}>
            No Home Exercise Programs Found
          </h2>
          <p style={{ color: '#64748b', maxWidth: '450px', margin: '0 auto 1.5rem auto', fontSize: '0.875rem' }}>
            {statusFilter !== 'all' || searchQuery
              ? 'No programs matched your current filter criteria. Try resetting your filters.'
              : 'Start by prescribing an individualized home exercise program tailored to a patient’s rehabilitation episode.'}
          </p>
          <Link
            to="/app/hep/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              padding: '0.625rem 1.25rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            <Plus size={16} />
            Prescribe New Program
          </Link>
        </div>
      ) : (
        /* Data Table */
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                <th style={{ padding: '0.875rem 1.25rem' }}>Program ID</th>
                <th style={{ padding: '0.875rem 1.25rem' }}>Title</th>
                <th style={{ padding: '0.875rem 1.25rem' }}>Patient</th>
                <th style={{ padding: '0.875rem 1.25rem' }}>Episode</th>
                <th style={{ padding: '0.875rem 1.25rem' }}>Prescribing Clinician</th>
                <th style={{ padding: '0.875rem 1.25rem' }}>Status</th>
                <th style={{ padding: '0.875rem 1.25rem' }}>Start Date</th>
                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {programsData.programs.map((prog) => {
                const clinicianName = prog.prescribing_clinician
                  ? prog.prescribing_clinician.display_name ||
                    `${prog.prescribing_clinician.first_name || ''} ${prog.prescribing_clinician.last_name || ''}`.trim() ||
                    'Clinician'
                  : '—';

                return (
                  <tr
                    key={prog.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      fontSize: '0.875rem',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontWeight: 600, color: '#0284c7' }}>
                      <Link to={`/app/hep/${prog.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {prog.program_identifier}
                      </Link>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{prog.title}</div>
                      {prog.instructions && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {prog.instructions}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      {prog.patient ? (
                        <div>
                          <Link to={`/app/patients/${prog.patient.id}`} style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 500 }}>
                            {prog.patient.first_name} {prog.patient.last_name}
                          </Link>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{prog.patient.patient_identifier}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      {prog.episode ? (
                        <div>
                          <Link to={`/app/episodes/${prog.episode.id}`} style={{ color: '#0284c7', textDecoration: 'none', fontSize: '0.8125rem' }}>
                            {prog.episode.title}
                          </Link>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{prog.episode.episode_identifier}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>Standalone</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: '#334155' }}>
                      {clinicianName}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          textTransform: 'capitalize',
                          display: 'inline-block',
                          ...getStatusBadgeStyle(prog.status),
                        }}
                      >
                        {prog.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: '#475569' }}>
                      {formatDate(prog.start_date)}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <Link
                        to={`/app/hep/${prog.id}`}
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: '#0284c7',
                          textDecoration: 'none',
                        }}
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {programsData.totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.875rem 1.25rem',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                fontSize: '0.8125rem',
                color: '#64748b',
              }}
            >
              <div>
                Showing page {programsData.page} of {programsData.totalPages} ({programsData.totalCount} programs)
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  disabled={programsData.page <= 1}
                  onClick={() => handlePageChange(programsData.page - 1)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: programsData.page <= 1 ? '#94a3b8' : '#334155',
                    cursor: programsData.page <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>
                <button
                  disabled={programsData.page >= programsData.totalPages}
                  onClick={() => handlePageChange(programsData.page + 1)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: programsData.page >= programsData.totalPages ? '#94a3b8' : '#334155',
                    cursor: programsData.page >= programsData.totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
