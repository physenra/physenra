import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { patientService, GetPatientsResult } from '../../services/patientService';
import { useRole } from '../../hooks/useRole';
import { usePractice } from '../../hooks/usePractice';
import type { Patient, PatientStatus } from '../../types/models';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  Archive,
} from 'lucide-react';

export const PatientListPage: React.FC = () => {
  const { isAccountant, isPatient } = useRole();
  const { activePractice } = usePractice();

  const [data, setData] = useState<GetPatientsResult>({
    patients: [],
    totalCount: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatientStatus | 'all'>('active');
  const [page, setPage] = useState(1);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await patientService.getPatients({
        search: search.trim() || undefined,
        status: statusFilter,
        page,
        limit: 20,
      });
      setData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load patients.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPatients();
  };

  const handleStatusChange = (newStatus: PatientStatus | 'all') => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const calculateAge = (dob: string | null): string => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return 'N/A';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} yrs`;
  };

  const canCreate = !isAccountant && !isPatient;

  return (
    <div className="patients-page">
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Patient Registry</h1>
          <p className="page-subtitle">
            Demographic directory and administrative records for {activePractice?.name}
          </p>
        </div>
        {canCreate && (
          <Link to="/app/patients/new" className="btn-primary">
            <UserPlus size={16} />
            <span>New Patient</span>
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, ID, phone, or email..."
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
            className={`filter-btn ${statusFilter === 'inactive' ? 'filter-btn-active' : ''}`}
            onClick={() => handleStatusChange('inactive')}
          >
            Inactive
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

      {/* Patient Table */}
      <div className="patient-table-container">
        {loading ? (
          <div className="table-loading-container">
            <div className="loading-spinner" />
            <p>Loading patient directory...</p>
          </div>
        ) : data.patients.length === 0 ? (
          <div className="empty-patient-state">
            <Users size={48} className="empty-state-icon" />
            <h3>No Patients Found</h3>
            <p>
              {search.trim()
                ? `No patients match the search query "${search}".`
                : statusFilter === 'archived'
                ? 'No archived patient records in this practice.'
                : 'No patients registered in this practice yet.'}
            </p>
            {canCreate && !search.trim() && statusFilter === 'active' && (
              <Link to="/app/patients/new" className="btn-primary mt-4">
                <UserPlus size={16} />
                <span>Register First Patient</span>
              </Link>
            )}
          </div>
        ) : (
          <table className="patient-table">
            <thead>
              <tr>
                <th>Patient Identifier</th>
                <th>Full Name</th>
                <th>DOB / Age</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {data.patients.map((patient: Patient) => (
                <tr key={patient.id} className="patient-row">
                  <td>
                    <Link
                      to={`/app/patients/${patient.id}`}
                      className="identifier-link"
                      title="View Patient Profile"
                    >
                      {patient.patient_identifier}
                    </Link>
                  </td>
                  <td>
                    <Link to={`/app/patients/${patient.id}`} className="patient-name-link">
                      <span className="name-bold">
                        {patient.last_name}, {patient.first_name}
                      </span>
                      {patient.preferred_name && (
                        <span className="preferred-tag">({patient.preferred_name})</span>
                      )}
                    </Link>
                  </td>
                  <td>
                    <div className="cell-dob">
                      <span>{patient.date_of_birth || 'Not recorded'}</span>
                      <span className="age-pill">{calculateAge(patient.date_of_birth)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="cell-contact">
                      {patient.phone ? (
                        <div className="contact-item">
                          <Phone size={12} />
                          <span>{patient.phone}</span>
                        </div>
                      ) : null}
                      {patient.email ? (
                        <div className="contact-item">
                          <Mail size={12} />
                          <span>{patient.email}</span>
                        </div>
                      ) : null}
                      {!patient.phone && !patient.email && (
                        <span className="text-muted">No contact info</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill status-${patient.status}`}>
                      {patient.status === 'archived' && <Archive size={12} />}
                      <span className="capitalize">{patient.status}</span>
                    </span>
                  </td>
                  <td>
                    <div className="cell-date">
                      <Calendar size={12} />
                      <span>
                        {new Date(patient.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
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
            {Math.min(data.page * data.limit, data.totalCount)} of {data.totalCount} patients
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
