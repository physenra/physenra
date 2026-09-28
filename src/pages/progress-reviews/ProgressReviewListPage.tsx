import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardCheck, Search, Plus, AlertCircle, User, Calendar, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { progressReviewService, GetProgressReviewsResult } from '../../services/progressReviewService';
import type { ProgressReviewStatus, OverallProgressRating } from '../../types/models';

export const ProgressReviewListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [reviewsData, setReviewsData] = useState<GetProgressReviewsResult>({
    reviews: [],
    totalCount: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters from URL
  const statusFilter = (searchParams.get('status') as ProgressReviewStatus | 'all') || 'all';
  const searchQuery = searchParams.get('q') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const patientFilter = searchParams.get('patientId') || '';
  const episodeFilter = searchParams.get('episodeId') || '';
  const planFilter = searchParams.get('treatmentPlanId') || '';

  const [searchInput, setSearchInput] = useState(searchQuery);

  const loadReviews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await progressReviewService.getReviews({
        page: currentPage,
        limit: 20,
        status: statusFilter,
        searchQuery: searchQuery || undefined,
        patientId: patientFilter || undefined,
        episodeId: episodeFilter || undefined,
        treatmentPlanId: planFilter || undefined,
      });
      setReviewsData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load progress reviews.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [statusFilter, searchQuery, currentPage, patientFilter, episodeFilter, planFilter]);

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

  const getStatusBadgeStyle = (status: ProgressReviewStatus) => {
    switch (status) {
      case 'draft':
        return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
      case 'finalized':
        return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
      case 'amended':
        return { backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' };
      default:
        return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    }
  };

  const getRatingBadgeStyle = (rating: OverallProgressRating) => {
    switch (rating) {
      case 'significant_improvement':
      case 'goals_met':
        return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' };
      case 'progressing':
        return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' };
      case 'slow_progress':
        return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' };
      case 'plateaued':
        return { backgroundColor: '#ffedd5', color: '#9a3412', border: '1px solid #fdba74' };
      case 'regressed':
        return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
      default:
        return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    }
  };

  const formatRatingText = (rating: OverallProgressRating) => {
    return rating
      .split('_')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
              }}
            >
              <ClipboardCheck size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Milestone & Progress Reviews
              </h1>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                Longitudinal clinical assessments, milestone tracking, and goal attainment reviews
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link
            to="/app/progress-reviews/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <Plus size={16} />
            New Progress Review
          </Link>
        </div>
      </div>

      {/* KPI / Status Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
            Total Reviews
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>
            {reviewsData.totalCount}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#059669', textTransform: 'uppercase' }}>
            Finalized Reviews
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#059669', marginTop: '4px' }}>
            {reviewsData.reviews.filter((r) => r.overall_status === 'finalized').length}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#d97706', textTransform: 'uppercase' }}>
            Draft Reviews
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#d97706', marginTop: '4px' }}>
            {reviewsData.reviews.filter((r) => r.overall_status === 'draft').length}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#4f46e5', textTransform: 'uppercase' }}>
            Amended Reviews
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#4f46e5', marginTop: '4px' }}>
            {reviewsData.reviews.filter((r) => r.overall_status === 'amended').length}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Reviews' },
              { id: 'draft', label: 'Draft' },
              { id: 'finalized', label: 'Finalized' },
              { id: 'amended', label: 'Amended' },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleStatusChange(tab.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: active ? '#0284c7' : '#e2e8f0',
                    backgroundColor: active ? '#f0f9ff' : '#ffffff',
                    color: active ? '#0369a1' : '#475569',
                    fontSize: '13px',
                    fontWeight: active ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <form
            onSubmit={handleSearchSubmit}
            style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flex: '1 1 260px', maxWidth: '380px' }}
          >
            <div style={{ position: 'relative', width: '100%' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search identifier or summary..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#334155',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Filter
            </button>
          </form>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Table Container */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {isLoading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <div
              style={{
                display: 'inline-block',
                width: '32px',
                height: '32px',
                border: '3px solid #e2e8f0',
                borderTopColor: '#0284c7',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ marginTop: '12px', fontSize: '14px' }}>Loading progress reviews...</p>
          </div>
        ) : reviewsData.reviews.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <ClipboardCheck size={48} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: 0 }}>
              No Progress Reviews Found
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '6px 0 20px 0' }}>
              {statusFilter !== 'all' || searchQuery
                ? 'Try adjusting your search query or status filter.'
                : 'No longitudinal progress reviews have been recorded yet.'}
            </p>
            <Link
              to="/app/progress-reviews/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                textDecoration: 'none',
              }}
            >
              <Plus size={16} /> Create Progress Review
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Identifier</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Patient</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Episode & Plan</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Review Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Assessment</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Reviewing Clinician</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviewsData.reviews.map((review) => {
                  const patientName = review.patient
                    ? `${review.patient.first_name} ${review.patient.last_name}`
                    : 'Unknown Patient';
                  const clinicianName = review.reviewing_clinician?.display_name ||
                    (review.reviewing_clinician?.first_name ? `${review.reviewing_clinician.first_name} ${review.reviewing_clinician.last_name || ''}` : 'Assigned Clinician');

                  return (
                    <tr
                      key={review.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.1s ease',
                      }}
                    >
                      {/* Review Identifier */}
                      <td style={{ padding: '14px 16px', fontWeight: '600', color: '#0f172a' }}>
                        <Link
                          to={`/app/progress-reviews/${review.id}`}
                          style={{
                            color: '#0284c7',
                            textDecoration: 'none',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {review.review_identifier}
                        </Link>
                      </td>

                      {/* Patient */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <User size={14} style={{ color: '#94a3b8' }} />
                          <div>
                            <div style={{ fontWeight: '500', color: '#0f172a' }}>{patientName}</div>
                            {review.patient?.patient_identifier && (
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                {review.patient.patient_identifier}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Episode & Treatment Plan */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '500', color: '#1e293b' }}>
                          {review.treatment_plan?.title || 'Treatment Plan'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {review.episode?.episode_identifier || 'Episode'} • {review.treatment_plan?.plan_identifier}
                        </div>
                      </td>

                      {/* Review Date */}
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} style={{ color: '#94a3b8' }} />
                          <span>{formatDate(review.review_date)}</span>
                        </div>
                      </td>

                      {/* Progress Assessment Rating */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: '600',
                            ...getRatingBadgeStyle(review.overall_progress_assessment),
                          }}
                        >
                          {formatRatingText(review.overall_progress_assessment)}
                        </span>
                      </td>

                      {/* Overall Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'capitalize',
                            ...getStatusBadgeStyle(review.overall_status),
                          }}
                        >
                          {review.overall_status === 'finalized' && <CheckCircle2 size={12} />}
                          {review.overall_status === 'amended' && <AlertTriangle size={12} />}
                          {review.overall_status}
                        </span>
                      </td>

                      {/* Clinician */}
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        <span>{clinicianName}</span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <Link
                          to={`/app/progress-reviews/${review.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            fontSize: '12px',
                            fontWeight: '500',
                            textDecoration: 'none',
                          }}
                        >
                          <span>Review</span>
                          <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {reviewsData.totalPages > 1 && (
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
            }}
          >
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Showing page {reviewsData.page} of {reviewsData.totalPages} ({reviewsData.totalCount} total reviews)
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                disabled={reviewsData.page <= 1}
                onClick={() => handlePageChange(reviewsData.page - 1)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: reviewsData.page <= 1 ? '#94a3b8' : '#334155',
                  fontSize: '12px',
                  cursor: reviewsData.page <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={reviewsData.page >= reviewsData.totalPages}
                onClick={() => handlePageChange(reviewsData.page + 1)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: reviewsData.page >= reviewsData.totalPages ? '#94a3b8' : '#334155',
                  fontSize: '12px',
                  cursor: reviewsData.page >= reviewsData.totalPages ? 'not-allowed' : 'pointer',
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
export default ProgressReviewListPage;
