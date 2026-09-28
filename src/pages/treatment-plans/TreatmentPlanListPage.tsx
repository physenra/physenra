import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Target, Search, Plus, AlertCircle, User } from 'lucide-react';
import { treatmentPlanService, GetPlansResult } from '../../services/treatmentPlanService';
import type { TreatmentPlanStatus } from '../../types/models';

export const TreatmentPlanListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [plansData, setPlansData] = useState<GetPlansResult>({
    plans: [],
    totalCount: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters from URL
  const statusFilter = (searchParams.get('status') as TreatmentPlanStatus | 'all') || 'all';
  const searchQuery = searchParams.get('q') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const patientFilter = searchParams.get('patientId') || '';
  const episodeFilter = searchParams.get('episodeId') || '';

  const [searchInput, setSearchInput] = useState(searchQuery);

  const loadPlans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await treatmentPlanService.getPlans({
        page: currentPage,
        limit: 20,
        status: statusFilter,
        searchQuery: searchQuery || undefined,
        patientId: patientFilter || undefined,
        episodeId: episodeFilter || undefined,
      });
      setPlansData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load treatment plans.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [statusFilter, searchQuery, currentPage, patientFilter, episodeFilter]);

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

  const getStatusBadgeStyle = (status: TreatmentPlanStatus) => {
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
              backgroundColor: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
            }}
          >
            <Target size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Treatment Plans & Clinical Goals
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
              Formulate, track, and re-evaluate strategic rehabilitation plans and quantifiable clinical goals.
            </p>
          </div>
        </div>

        <div>
          <Link
            to="/app/treatment-plans/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#059669',
              color: '#ffffff',
              padding: '0.625rem 1.25rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            <Plus size={16} />
            New Treatment Plan
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
        <strong>Clinical Architecture Invariant:</strong> Patient ≠ Episode of Care ≠ Appointment ≠ Clinical Visit ≠ Clinical Note ≠ Outcome Measure ≠ HEP ≠ Treatment Plan.
        Treatment Plans establish long-term rehabilitation strategy and measurable milestones without financial, billing, or automated messaging cross-contamination. Zero hard deletes.
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
                border: statusFilter === st ? '1px solid #059669' : '1px solid #cbd5e1',
                backgroundColor: statusFilter === st ? '#ecfdf5' : '#ffffff',
                color: statusFilter === st ? '#059669' : '#475569',
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
              placeholder="Search title, ID, or diagnosis..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem 0.4rem 2rem',
                fontSize: '0.875rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                minWidth: '240px',
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
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: '6px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Plans List Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Loading treatment plans...
          </div>
        ) : plansData.plans.length === 0 ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                marginBottom: '1rem',
              }}
            >
              <Target size={24} />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              No treatment plans found
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search criteria or status filter.'
                : 'Formulate an individualized rehabilitation plan with target goals for your patients.'}
            </p>
            <Link
              to="/app/treatment-plans/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#059669',
                color: '#ffffff',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              <Plus size={16} />
              Create First Treatment Plan
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Plan ID</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Title & Diagnosis</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Patient</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Episode</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Clinician</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Timeline</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {plansData.plans.map((p) => {
                  const patientName = p.patient
                    ? `${p.patient.first_name} ${p.patient.last_name}`
                    : 'Unknown Patient';
                  const clinicianName = p.prescribing_clinician
                    ? p.prescribing_clinician.display_name || `${p.prescribing_clinician.first_name || ''} ${p.prescribing_clinician.last_name || ''}`.trim()
                    : '—';

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      <td style={{ padding: '0.875rem 1.25rem', fontWeight: 600, color: '#0f172a' }}>
                        <Link
                          to={`/app/treatment-plans/${p.id}`}
                          style={{ color: '#059669', textDecoration: 'none' }}
                        >
                          {p.plan_identifier}
                        </Link>
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.title}</div>
                        {p.diagnosis_summary && (
                          <div
                            style={{
                              fontSize: '0.8125rem',
                              color: '#64748b',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '240px',
                            }}
                          >
                            {p.diagnosis_summary}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>{patientName}</div>
                        {p.patient?.patient_identifier && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {p.patient.patient_identifier}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {p.episode ? (
                          <div>
                            <div style={{ color: '#334155', fontWeight: 500 }}>{p.episode.title}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {p.episode.episode_identifier}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: '#334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <User size={14} style={{ color: '#94a3b8' }} />
                          <span>{clinicianName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: '#475569', fontSize: '0.8125rem' }}>
                        <div>
                          <strong>Start:</strong> {formatDate(p.start_date)}
                        </div>
                        {p.target_review_date && (
                          <div>
                            <strong>Review:</strong> {formatDate(p.target_review_date)}
                          </div>
                        )}
                        {p.treatment_frequency && (
                          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{p.treatment_frequency}</div>
                        )}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            ...getStatusBadgeStyle(p.status),
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>
                        <Link
                          to={`/app/treatment-plans/${p.id}`}
                          style={{
                            color: '#059669',
                            fontWeight: 600,
                            textDecoration: 'none',
                            fontSize: '0.8125rem',
                            padding: '0.375rem 0.75rem',
                            borderRadius: '4px',
                            backgroundColor: '#ecfdf5',
                          }}
                        >
                          View Plan
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {plansData.totalPages > 1 && (
          <div
            style={{
              padding: '0.875rem 1.25rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
            }}
          >
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              Showing {plansData.plans.length} of {plansData.totalCount} plans (Page {plansData.page} of{' '}
              {plansData.totalPages})
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={plansData.page <= 1}
                onClick={() => handlePageChange(plansData.page - 1)}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8125rem',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  cursor: plansData.page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: plansData.page <= 1 ? 0.5 : 1,
                }}
              >
                Previous
              </button>
              <button
                disabled={plansData.page >= plansData.totalPages}
                onClick={() => handlePageChange(plansData.page + 1)}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8125rem',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  cursor: plansData.page >= plansData.totalPages ? 'not-allowed' : 'pointer',
                  opacity: plansData.page >= plansData.totalPages ? 0.5 : 1,
                }}
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
