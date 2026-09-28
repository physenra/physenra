import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileCheck,
  Search,
  Plus,
  AlertCircle,
  User,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import {
  dischargeSummaryService,
  GetDischargeSummariesResult,
} from '../../services/dischargeSummaryService';
import type {
  DischargeSummaryStatus,
  DischargeReason,
  DischargeDisposition,
} from '../../types/models';

export const DischargeSummaryListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [summariesData, setSummariesData] = useState<GetDischargeSummariesResult>({
    summaries: [],
    totalCount: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters from URL
  const statusFilter = (searchParams.get('status') as DischargeSummaryStatus | 'all') || 'all';
  const reasonFilter = (searchParams.get('reason') as DischargeReason | 'all') || 'all';
  const searchQuery = searchParams.get('q') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const patientFilter = searchParams.get('patientId') || '';
  const episodeFilter = searchParams.get('episodeId') || '';

  const [searchInput, setSearchInput] = useState(searchQuery);

  const loadSummaries = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await dischargeSummaryService.getSummaries({
        page: currentPage,
        limit: 20,
        status: statusFilter,
        dischargeReason: reasonFilter,
        searchQuery: searchQuery || undefined,
        patientId: patientFilter || undefined,
        episodeId: episodeFilter || undefined,
      });
      setSummariesData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load discharge summaries.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSummaries();
  }, [statusFilter, reasonFilter, searchQuery, currentPage, patientFilter, episodeFilter]);

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

  const handleReasonChange = (reason: string) => {
    const params = new URLSearchParams(searchParams);
    if (reason === 'all') {
      params.delete('reason');
    } else {
      params.set('reason', reason);
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

  const getStatusBadgeStyle = (status: DischargeSummaryStatus) => {
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

  const formatReasonLabel = (reason: DischargeReason) => {
    switch (reason) {
      case 'goals_achieved':
        return 'All Goals Achieved';
      case 'goals_partially_achieved':
        return 'Goals Partially Achieved';
      case 'patient_independent':
        return 'Patient Independent';
      case 'plateau':
        return 'Functional Plateau';
      case 'patient_choice':
        return 'Patient Decision / Self-Discharge';
      case 'transfer_of_care':
        return 'Transfer of Care';
      case 'referred_elsewhere':
        return 'Referred to Specialist / Hospital';
      case 'lost_to_follow_up':
        return 'Lost to Follow-up';
      case 'financial_administrative':
        return 'Financial / Administrative';
      case 'other':
        return 'Other Clinical Rationale';
      default:
        return reason;
    }
  };

  const formatDispositionLabel = (disposition: DischargeDisposition) => {
    switch (disposition) {
      case 'discharged_to_self_management':
        return 'Self-Management';
      case 'discharged_with_home_program':
        return 'Discharged with HEP';
      case 'follow_up_with_referrer':
        return 'Referrer Follow-up';
      case 'transferred_to_other_provider':
        return 'Transferred to Provider';
      case 'continued_care_elsewhere':
        return 'Continued Care Elsewhere';
      case 'other':
        return 'Other Disposition';
      default:
        return disposition;
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <FileCheck size={28} color="#059669" />
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Discharge Summaries
            </h1>
            <span
              style={{
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: '#ecfdf5',
                color: '#065f46',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid #a7f3d0',
              }}
            >
              Episode Closure Foundation
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Formal clinical closure documents, outcome syntheses, and atomic Episode of Care completion.
          </p>
        </div>

        <Link
          to="/app/discharge-summaries/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#059669',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '14px',
            textDecoration: 'none',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'background-color 0.15s ease',
          }}
        >
          <Plus size={18} />
          Create Discharge Summary
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '16px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Status Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              backgroundColor: '#f1f5f9',
              padding: '4px',
              borderRadius: '8px',
            }}
          >
            {(['all', 'draft', 'finalized', 'amended'] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: statusFilter === s ? '600' : '500',
                  color: statusFilter === s ? '#0f172a' : '#64748b',
                  backgroundColor: statusFilter === s ? '#ffffff' : 'transparent',
                  border: 'none',
                  boxShadow: statusFilter === s ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Reason Select & Search Input */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
            <select
              value={reasonFilter}
              onChange={(e) => handleReasonChange(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                color: '#334155',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="all">All Discharge Reasons</option>
              <option value="goals_achieved">All Goals Achieved</option>
              <option value="goals_partially_achieved">Goals Partially Achieved</option>
              <option value="patient_independent">Patient Independent</option>
              <option value="plateau">Functional Plateau</option>
              <option value="patient_choice">Patient Choice</option>
              <option value="transfer_of_care">Transfer of Care</option>
              <option value="referred_elsewhere">Referred Elsewhere</option>
              <option value="lost_to_follow_up">Lost to Follow-up</option>
              <option value="financial_administrative">Financial / Administrative</option>
              <option value="other">Other</option>
            </select>

            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '6px' }}>
              <div style={{ position: 'relative', width: '220px' }}>
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
                  placeholder="Search DS identifier or notes..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 32px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
          }}
        >
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Main List */}
      {isLoading ? (
        <div
          style={{
            padding: '60px 0',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '14px',
          }}
        >
          Loading discharge summaries...
        </div>
      ) : summariesData.summaries.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <FileCheck size={48} color="#94a3b8" style={{ margin: '0 auto 16px auto', display: 'block' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>
            No Discharge Summaries Found
          </h3>
          <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '460px', margin: '0 auto 20px auto' }}>
            {searchQuery || statusFilter !== 'all' || reasonFilter !== 'all'
              ? 'No discharge summaries match the selected filters. Try broadening your search.'
              : 'Discharge summaries represent the formal clinical closure of an Episode of Care. Create one when a patient reaches goals, plateaus, or transitions care.'}
          </p>
          <Link
            to="/app/discharge-summaries/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#059669',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            <Plus size={16} />
            Create Discharge Summary
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {summariesData.summaries.map((summary) => (
            <div
              key={summary.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: '700',
                        fontSize: '15px',
                        color: '#0f172a',
                      }}
                    >
                      {summary.summary_identifier}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        letterSpacing: '0.05em',
                        ...getStatusBadgeStyle(summary.status),
                      }}
                    >
                      {summary.status}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: '#f0fdf4',
                        color: '#166534',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      {formatReasonLabel(summary.discharge_reason)}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: '#f8fafc',
                        color: '#475569',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      {formatDispositionLabel(summary.discharge_disposition)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      color: '#64748b',
                      fontSize: '13px',
                      marginTop: '6px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} />
                      Discharge Date: {summary.discharge_date}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <User size={14} />
                      Clinician:{' '}
                      {summary.discharging_clinician?.display_name ||
                        (summary.discharging_clinician
                          ? `${summary.discharging_clinician.first_name} ${summary.discharging_clinician.last_name}`
                          : 'Assigned Clinician')}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/app/discharge-summaries/${summary.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#059669',
                    fontSize: '13px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                  }}
                >
                  View Summary
                  <ArrowRight size={14} />
                </Link>
              </div>

              {/* Patient & Episode Context */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '12px',
                  backgroundColor: '#f8fafc',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  fontSize: '13px',
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>Patient: </span>
                  <Link
                    to={`/app/patients/${summary.patient_id}`}
                    style={{ color: '#0f172a', fontWeight: '600', textDecoration: 'none' }}
                  >
                    {summary.patient?.first_name} {summary.patient?.last_name}
                  </Link>
                  <span style={{ color: '#94a3b8', marginLeft: '6px', fontFamily: 'monospace' }}>
                    ({summary.patient?.patient_identifier})
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Episode of Care: </span>
                  <Link
                    to={`/app/episodes/${summary.episode_id}`}
                    style={{ color: '#0f172a', fontWeight: '600', textDecoration: 'none' }}
                  >
                    {summary.episode?.title || 'Episode'}
                  </Link>
                  <span style={{ color: '#94a3b8', marginLeft: '6px', fontFamily: 'monospace' }}>
                    ({summary.episode?.episode_identifier})
                  </span>
                </div>
              </div>

              {/* Clinical Summary Preview */}
              <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
                <span style={{ fontWeight: '600', color: '#475569' }}>Clinical Summary: </span>
                {summary.clinical_summary.length > 220
                  ? `${summary.clinical_summary.substring(0, 220)}...`
                  : summary.clinical_summary}
              </div>

              {summary.status === 'amended' && summary.amendment_reason && (
                <div
                  style={{
                    marginTop: '10px',
                    fontSize: '12px',
                    color: '#4338ca',
                    backgroundColor: '#eef2ff',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #c7d2fe',
                  }}
                >
                  <span style={{ fontWeight: '600' }}>Amendment Note: </span>
                  {summary.amendment_reason}
                </div>
              )}
            </div>
          ))}

          {/* Pagination */}
          {summariesData.totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                marginTop: '16px',
              }}
            >
              <button
                disabled={summariesData.page <= 1}
                onClick={() => handlePageChange(summariesData.page - 1)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: summariesData.page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: summariesData.page <= 1 ? 0.5 : 1,
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Page {summariesData.page} of {summariesData.totalPages}
              </span>
              <button
                disabled={summariesData.page >= summariesData.totalPages}
                onClick={() => handlePageChange(summariesData.page + 1)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: summariesData.page >= summariesData.totalPages ? 'not-allowed' : 'pointer',
                  opacity: summariesData.page >= summariesData.totalPages ? 0.5 : 1,
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
