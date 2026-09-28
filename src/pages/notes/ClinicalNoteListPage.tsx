import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  clinicalNoteService,
  GetClinicalNotesResult,
} from '../../services/clinicalNoteService';
import type {
  ClinicalNoteStatus,
  ClinicalNoteType,
} from '../../types/models';

export const ClinicalNoteListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [notesData, setNotesData] = useState<GetClinicalNotesResult>({
    notes: [],
    totalCount: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const statusFilter = (searchParams.get('status') as ClinicalNoteStatus | 'all') || 'all';
  const typeFilter = (searchParams.get('type') as ClinicalNoteType | 'all') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const loadNotes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await clinicalNoteService.getClinicalNotes({
        page: currentPage,
        limit: 20,
        status: statusFilter,
        noteType: typeFilter,
      });
      setNotesData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load clinical notes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [statusFilter, typeFilter, currentPage]);

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

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  const getStatusBadgeStyle = (status: ClinicalNoteStatus) => {
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

  const getTypeBadgeStyle = (type: ClinicalNoteType) => {
    switch (type) {
      case 'soap':
        return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
      case 'addendum':
        return { backgroundColor: '#fae8ff', color: '#86198f', border: '1px solid #f5d0fe' };
      default:
        return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
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
            Clinical Notes
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Physiotherapy SOAP documentation, clinical evaluations, and addenda.
          </p>
        </div>
        <div>
          <Link
            to="/app/clinical-notes/new"
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
            + Document Clinical Note
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
        <strong>Clinical Architecture Invariant:</strong> Patient ≠ Episode of Care ≠ Appointment ≠ Clinical Visit ≠ Clinical Note.
        Clinical Notes document clinical findings, examination, reasoning, and plans for an encounter. Notes do not trigger billing,
        invoices, or package session deductions in V1.
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

        {/* Note Type Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Type:</span>
          {(['all', 'soap', 'addendum'] as const).map((tp) => (
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
                textTransform: 'uppercase',
              }}
            >
              {tp}
            </button>
          ))}
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
            Loading clinical notes...
          </div>
        ) : notesData.notes.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <p style={{ margin: 0, fontWeight: 500, color: '#334155' }}>No clinical notes found.</p>
            <p style={{ margin: '0.5rem 0 1.5rem 0', fontSize: '0.875rem' }}>
              Create documentation for completed or in-progress clinical encounters.
            </p>
            <Link
              to="/app/clinical-notes/new"
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
              Document Clinical Note
            </Link>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Note Ref
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Type
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Patient
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Clinical Visit
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Author
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Date / Time
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {notesData.notes.map((note) => {
                const authorName = note.author
                  ? `${note.author.first_name || ''} ${note.author.last_name || ''}`.trim() || note.author.display_name
                  : 'Physiotherapist';

                const patientName = note.patient
                  ? `${note.patient.first_name} ${note.patient.last_name}`
                  : 'Unknown Patient';

                return (
                  <tr
                    key={note.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Link
                        to={`/app/clinical-notes/${note.id}`}
                        style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}
                      >
                        {note.note_identifier}
                      </Link>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          ...getTypeBadgeStyle(note.note_type),
                        }}
                      >
                        {note.note_type}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {note.patient ? (
                        <Link
                          to={`/app/patients/${note.patient.id}`}
                          style={{ color: '#334155', fontWeight: 500, textDecoration: 'none' }}
                        >
                          {patientName}
                        </Link>
                      ) : (
                        <span style={{ color: '#64748b' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {note.clinical_visit ? (
                        <Link
                          to={`/app/clinical-visits/${note.clinical_visit.id}`}
                          style={{ color: '#0284c7', textDecoration: 'none', fontSize: '0.875rem' }}
                        >
                          {note.clinical_visit.visit_identifier}
                        </Link>
                      ) : (
                        <span style={{ color: '#64748b' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#334155' }}>
                      {authorName}
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
                          ...getStatusBadgeStyle(note.status),
                        }}
                      >
                        {note.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: '#64748b' }}>
                      {formatTimestamp(note.finalized_at || note.created_at)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <Link
                        to={`/app/clinical-notes/${note.id}`}
                        style={{
                          color: '#0284c7',
                          fontWeight: 600,
                          textDecoration: 'none',
                          fontSize: '0.8125rem',
                        }}
                      >
                        {note.status === 'draft' ? 'Edit Draft' : 'View Note'}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination Bar */}
        {notesData.totalPages > 1 && (
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
              Showing {notesData.notes.length} of {notesData.totalCount} notes
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
                Page {currentPage} of {notesData.totalPages}
              </span>
              <button
                disabled={currentPage >= notesData.totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.8125rem',
                  cursor: currentPage >= notesData.totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage >= notesData.totalPages ? 0.5 : 1,
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
