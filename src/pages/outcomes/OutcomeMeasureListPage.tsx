import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  outcomeMeasureService,
  GetOutcomeAssessmentsResult,
} from '../../services/outcomeMeasureService';
import type {
  OutcomeAssessmentStatus,
  OutcomeAssessmentType,
  OutcomeMeasureDefinition,
} from '../../types/models';

export const OutcomeMeasureListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [assessmentsData, setAssessmentsData] = useState<GetOutcomeAssessmentsResult>({
    assessments: [],
    totalCount: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [definitions, setDefinitions] = useState<OutcomeMeasureDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const statusFilter = (searchParams.get('status') as OutcomeAssessmentStatus | 'all') || 'all';
  const typeFilter = (searchParams.get('type') as OutcomeAssessmentType | 'all') || 'all';
  const measureFilter = searchParams.get('measureId') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    const loadDefinitions = async () => {
      try {
        const defs = await outcomeMeasureService.getDefinitions();
        setDefinitions(defs);
      } catch (err: any) {
        console.warn('Could not load definitions:', err);
      }
    };
    loadDefinitions();
  }, []);

  const loadAssessments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await outcomeMeasureService.getAssessments({
        page: currentPage,
        limit: 20,
        status: statusFilter,
        assessmentType: typeFilter,
        measureId: measureFilter !== 'all' ? measureFilter : undefined,
      });
      setAssessmentsData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load outcome assessments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, [statusFilter, typeFilter, measureFilter, currentPage]);

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

  const handleTypeFilterChange = (type: string) => {
    const params = new URLSearchParams(searchParams);
    if (type === 'all') {
      params.delete('type');
    } else {
      params.set('type', type);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleMeasureFilterChange = (measureId: string) => {
    const params = new URLSearchParams(searchParams);
    if (measureId === 'all') {
      params.delete('measureId');
    } else {
      params.set('measureId', measureId);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  const getStatusBadgeStyle = (status: OutcomeAssessmentStatus) => {
    switch (status) {
      case 'draft':
        return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
      case 'finalized':
        return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
      case 'amended':
        return { backgroundColor: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff' };
      default:
        return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    }
  };

  const getTypeBadgeStyle = (type: OutcomeAssessmentType) => {
    switch (type) {
      case 'baseline':
        return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
      case 'interim':
        return { backgroundColor: '#fef9c3', color: '#854d0e', border: '1px solid #fef08a' };
      case 'discharge':
        return { backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' };
      case 'follow_up':
        return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
      default:
        return { backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' };
    }
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return ts;
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
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
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Clinical Outcome Measures
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Standardized functional assessments, pain indices, and longitudinal patient progress metrics.
          </p>
        </div>
        <div>
          <Link
            to="/app/outcome-measures/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              padding: '0.625rem 1.25rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            + Record Outcome Assessment
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
        <strong>Clinical Architecture Invariant:</strong> Patient ≠ Episode of Care ≠ Appointment ≠ Clinical Visit ≠ Clinical Note ≠ Clinical Outcome Measure.
        Outcome Measures represent structured clinical metrics (e.g. NPRS, LEFS, QuickDASH). Outcome assessments preserve longitudinal history across
        episodes and encounters without modifying billing or package records in V1.
      </div>

      {/* Filter Toolbar */}
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
        }}
      >
        {/* Status Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Status:</span>
          {(['all', 'draft', 'finalized', 'amended'] as const).map((st) => (
            <button
              key={st}
              onClick={() => handleStatusFilterChange(st)}
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

        {/* Milestone Type Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Milestone:</span>
          {(['all', 'baseline', 'interim', 'discharge'] as const).map((tp) => (
            <button
              key={tp}
              onClick={() => handleTypeFilterChange(tp)}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '6px',
                border: typeFilter === tp ? '1px solid #0284c7' : '1px solid #cbd5e1',
                backgroundColor: typeFilter === tp ? '#e0f2fe' : '#ffffff',
                color: typeFilter === tp ? '#0284c7' : '#475569',
                fontSize: '0.8125rem',
                fontWeight: typeFilter === tp ? 600 : 400,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tp}
            </button>
          ))}
        </div>

        {/* Measure Definition Select */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Instrument:</span>
          <select
            value={measureFilter}
            onChange={(e) => handleMeasureFilterChange(e.target.value)}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '0.8125rem',
              color: '#334155',
            }}
          >
            <option value="all">All Measures</option>
            {definitions.map((def) => (
              <option key={def.id} value={def.id}>
                {def.code} - {def.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            marginBottom: '1.5rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Table Container */}
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
            Loading outcome assessments...
          </div>
        ) : assessmentsData.assessments.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <p style={{ margin: 0, fontWeight: 500, color: '#334155' }}>No outcome assessments recorded.</p>
            <p style={{ margin: '0.5rem 0 1.5rem 0', fontSize: '0.875rem' }}>
              Standardized baseline and follow-up outcome measurements will appear here.
            </p>
            <Link
              to="/app/outcome-measures/new"
              style={{
                display: 'inline-block',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              Record First Assessment
            </Link>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Ref
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Measure
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Milestone
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Patient
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Result / Score
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Assessor
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Date
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {assessmentsData.assessments.map((item) => {
                const assessorName = item.assessor
                  ? `${item.assessor.first_name || ''} ${item.assessor.last_name || ''}`.trim() || item.assessor.display_name
                  : 'Clinician';

                const patientName = item.patient
                  ? `${item.patient.first_name} ${item.patient.last_name}`
                  : 'Patient';

                const measureName = item.definition ? item.definition.code : 'Measure';

                let scoreDisplay = '—';
                if (item.status === 'amended' && item.amended_numeric_score !== null) {
                  scoreDisplay = `${item.amended_numeric_score} ${item.definition?.score_unit || ''} (Amended)`;
                } else if (item.numeric_score !== null) {
                  scoreDisplay = `${item.numeric_score} ${item.definition?.score_unit || ''}`;
                } else if (item.percentage_score !== null) {
                  scoreDisplay = `${item.percentage_score}%`;
                } else if (item.score_category) {
                  scoreDisplay = item.score_category;
                }

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Link
                        to={`/app/outcome-measures/${item.id}`}
                        style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}
                      >
                        {item.assessment_identifier}
                      </Link>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <strong style={{ color: '#0f172a' }}>{measureName}</strong>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                        {item.definition?.name}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          ...getTypeBadgeStyle(item.assessment_type),
                        }}
                      >
                        {item.assessment_type}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {item.patient ? (
                        <Link
                          to={`/app/patients/${item.patient.id}`}
                          style={{ color: '#334155', fontWeight: 500, textDecoration: 'none' }}
                        >
                          {patientName}
                        </Link>
                      ) : (
                        <span style={{ color: '#64748b' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#0369a1' }}>
                      {scoreDisplay}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#334155' }}>
                      {assessorName}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          ...getStatusBadgeStyle(item.status),
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: '#64748b' }}>
                      {formatTimestamp(item.performed_at)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <Link
                        to={`/app/outcome-measures/${item.id}`}
                        style={{
                          color: '#0284c7',
                          fontWeight: 600,
                          textDecoration: 'none',
                          fontSize: '0.8125rem',
                        }}
                      >
                        {item.status === 'draft' ? 'Edit Draft' : 'View Result'}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination Bar */}
        {assessmentsData.totalPages > 1 && (
          <div
            style={{
              padding: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Showing {assessmentsData.assessments.length} of {assessmentsData.totalCount} assessments
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.8125rem',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage <= 1 ? 0.5 : 1,
                }}
              >
                Previous
              </button>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                  padding: '0 0.5rem',
                  color: '#475569',
                }}
              >
                Page {currentPage} of {assessmentsData.totalPages}
              </span>
              <button
                disabled={currentPage >= assessmentsData.totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.8125rem',
                  cursor: currentPage >= assessmentsData.totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage >= assessmentsData.totalPages ? 0.5 : 1,
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
