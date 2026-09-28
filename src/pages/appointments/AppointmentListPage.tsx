import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePractice } from '../../hooks/usePractice';
import {
  appointmentService,
  type ClinicianOption,
} from '../../services/appointmentService';
import type {
  AppointmentWithRelations,
  AppointmentStatus,
  AppointmentType,
} from '../../types/models';

export const AppointmentListPage: React.FC = () => {
  const { activePractice } = usePractice();

  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [clinicians, setClinicians] = useState<ClinicianOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'all'>('day');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedClinician, setSelectedClinician] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | 'all'>('all');
  const [selectedType, setSelectedType] = useState<AppointmentType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Load clinicians on mount
  useEffect(() => {
    async function loadClinicians() {
      try {
        const list = await appointmentService.getClinicians();
        setClinicians(list);
      } catch (err) {
        console.warn('Failed to load clinicians:', err);
      }
    }
    loadClinicians();
  }, [activePractice?.id]);

  // Load appointments
  useEffect(() => {
    async function loadAppointments() {
      if (!activePractice) return;
      setIsLoading(true);
      setError(null);

      try {
        let dateFilter: string | undefined;
        let startDateFilter: string | undefined;
        let endDateFilter: string | undefined;

        if (viewMode === 'day') {
          dateFilter = selectedDate;
        } else if (viewMode === 'week') {
          const curr = new Date(selectedDate);
          const firstDay = new Date(curr.setDate(curr.getDate() - curr.getDay()));
          const lastDay = new Date(curr.setDate(curr.getDate() - curr.getDay() + 6));
          startDateFilter = `${firstDay.toISOString().split('T')[0]}T00:00:00.000Z`;
          endDateFilter = `${lastDay.toISOString().split('T')[0]}T23:59:59.999Z`;
        }

        const res = await appointmentService.getAppointments({
          date: dateFilter,
          startDate: startDateFilter,
          endDate: endDateFilter,
          physiotherapistId: selectedClinician !== 'all' ? selectedClinician : undefined,
          status: selectedStatus,
          appointmentType: selectedType,
          searchQuery: searchQuery.trim() || undefined,
          page,
          limit: 20,
        });

        setAppointments(res.appointments);
        setTotalPages(res.totalPages);
        setTotalCount(res.totalCount);
      } catch (err: any) {
        setError(err.message || 'Failed to load appointments.');
      } finally {
        setIsLoading(false);
      }
    }

    loadAppointments();
  }, [
    activePractice?.id,
    viewMode,
    selectedDate,
    selectedClinician,
    selectedStatus,
    selectedType,
    searchQuery,
    page,
  ]);

  const handleDateChange = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
    setPage(1);
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const getStatusBadgeClass = (status: AppointmentStatus) => {
    switch (status) {
      case 'scheduled':
        return 'badge-blue';
      case 'confirmed':
        return 'badge-purple';
      case 'arrived':
        return 'badge-amber';
      case 'in_progress':
        return 'badge-indigo';
      case 'completed':
      case 'documentation_completed':
        return 'badge-green';
      case 'cancelled':
        return 'badge-red';
      case 'no_show':
        return 'badge-gray';
      case 'rescheduled':
        return 'badge-teal';
      case 'incomplete':
        return 'badge-orange';
      default:
        return 'badge-gray';
    }
  };

  const formatAppointmentType = (type: AppointmentType) => {
    switch (type) {
      case 'initial_assessment':
        return 'Initial Assessment';
      case 'follow_up':
        return 'Follow-Up';
      case 'consultation':
        return 'Consultation';
      case 'review':
        return 'Review';
      default:
        return 'Other';
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Appointments & Schedule
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage scheduled patient encounters and clinician availability.
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/app/appointments/new" className="btn btn-primary">
            + Book Appointment
          </Link>
        </div>
      </div>

      {/* Architectural Callout Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6 text-sm text-amber-800 dark:text-amber-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">⚠️ Architectural Notice:</span>
          <span>
            An appointment represents a scheduled encounter slot. It does not represent proof of treatment,
            does not decrement packages, and is not a clinical visit note.
          </span>
        </div>
      </div>

      {/* Filter and Date Bar */}
      <div className="card p-4 mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* View Mode & Date Navigation */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                className={`px-3 py-1.5 text-xs font-medium rounded-l-lg border ${
                  viewMode === 'day'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  setViewMode('day');
                  setPage(1);
                }}
              >
                Day
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-xs font-medium border-t border-b ${
                  viewMode === 'week'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  setViewMode('week');
                  setPage(1);
                }}
              >
                Week
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-xs font-medium rounded-r-lg border ${
                  viewMode === 'all'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  setViewMode('all');
                  setPage(1);
                }}
              >
                All Dates
              </button>
            </div>

            {viewMode !== 'all' && (
              <div className="flex items-center gap-1 ml-3">
                <button
                  type="button"
                  className="btn btn-secondary px-2 py-1 text-xs"
                  onClick={() => handleDateChange(-1)}
                  title="Previous Day"
                >
                  ◀
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setPage(1);
                  }}
                  className="input py-1 px-2 text-xs w-36"
                />
                <button
                  type="button"
                  className="btn btn-secondary px-2 py-1 text-xs"
                  onClick={() => handleDateChange(1)}
                  title="Next Day"
                >
                  ▶
                </button>
                <button
                  type="button"
                  className="btn btn-secondary px-2 py-1 text-xs ml-1"
                  onClick={() => {
                    setSelectedDate(new Date().toISOString().split('T')[0]);
                    setPage(1);
                  }}
                >
                  Today
                </button>
              </div>
            )}
          </div>

          {/* Quick Search */}
          <div className="w-full md:w-64">
            <input
              type="text"
              placeholder="Search by ID or notes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="input text-sm w-full"
            />
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div>
            <label className="label text-xs">Clinician</label>
            <select
              value={selectedClinician}
              onChange={(e) => {
                setSelectedClinician(e.target.value);
                setPage(1);
              }}
              className="select text-xs w-full"
            >
              <option value="all">All Clinicians</option>
              {clinicians.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.name} ({c.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label text-xs">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as AppointmentStatus | 'all');
                setPage(1);
              }}
              className="select text-xs w-full"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="arrived">Arrived (Checked In)</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="incomplete">Incomplete</option>
            </select>
          </div>

          <div>
            <label className="label text-xs">Appointment Type</label>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as AppointmentType | 'all');
                setPage(1);
              }}
              className="select text-xs w-full"
            >
              <option value="all">All Types</option>
              <option value="initial_assessment">Initial Assessment</option>
              <option value="follow_up">Follow-Up</option>
              <option value="consultation">Consultation</option>
              <option value="review">Review</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Appointment Table / Cards */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="card p-12 text-center text-gray-500">
          <div className="inline-block animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-2"></div>
          <p>Loading appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
            No appointments found
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {viewMode === 'day'
              ? `There are no appointments scheduled for ${selectedDate}.`
              : 'Try adjusting your filters or date range.'}
          </p>
          <div className="mt-4">
            <Link to="/app/appointments/new" className="btn btn-primary">
              Book First Appointment
            </Link>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 text-xs uppercase">
                <tr>
                  <th className="py-3 px-4">Time & Date</th>
                  <th className="py-3 px-4">Identifier</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Clinician</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {appointments.map((appt) => (
                  <tr
                    key={appt.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {formatTime(appt.scheduled_start)} - {formatTime(appt.scheduled_end)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDate(appt.scheduled_start)} ({appt.duration_minutes}m)
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                      <Link to={`/app/appointments/${appt.id}`} className="hover:underline">
                        {appt.appointment_identifier}
                      </Link>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {appt.patient ? (
                        <div>
                          <Link
                            to={`/app/patients/${appt.patient.id}`}
                            className="font-medium text-gray-900 dark:text-white hover:text-blue-600 hover:underline"
                          >
                            {appt.patient.first_name} {appt.patient.last_name}
                          </Link>
                          <div className="text-xs text-gray-400 font-mono">
                            {appt.patient.patient_identifier}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Unknown Patient</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {formatAppointmentType(appt.appointment_type)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {appt.physiotherapist?.display_name ||
                        `${appt.physiotherapist?.first_name || ''} ${appt.physiotherapist?.last_name || ''}`.trim() ||
                        'Unassigned'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-xs capitalize text-gray-500">
                      {appt.location_mode.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`badge ${getStatusBadgeClass(appt.status)}`}>
                        {appt.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <Link
                        to={`/app/appointments/${appt.id}`}
                        className="btn btn-secondary px-2.5 py-1 text-xs"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
              <div>
                Showing page {page} of {totalPages} ({totalCount} total appointments)
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn btn-secondary px-3 py-1 text-xs disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn btn-secondary px-3 py-1 text-xs disabled:opacity-50"
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
