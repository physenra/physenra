import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePractice } from '../../hooks/usePractice';
import { appointmentService } from '../../services/appointmentService';
import { clinicalVisitService } from '../../services/clinicalVisitService';
import { clinicalNoteService } from '../../services/clinicalNoteService';
import { supabase } from '../../lib/supabase';
import {
  Calendar,
  Clock,
  User,
  Activity,
  FileText,
  AlertTriangle,
  CalendarPlus,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  ArrowRight,
  FolderKanban,
  CheckCircle,
  ShieldCheck,
} from 'lucide-react';
import type {
  AppointmentWithRelations,
  ClinicalVisitWithRelations,
  ClinicalNoteWithRelations,
} from '../../types/models';

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { activePractice, activeMembership } = usePractice();
  const navigate = useNavigate();

  // Date state (defaults to today's local date YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Data states
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [inProgressVisits, setInProgressVisits] = useState<ClinicalVisitWithRelations[]>([]);
  const [draftNotes, setDraftNotes] = useState<ClinicalNoteWithRelations[]>([]);
  const [draftAssessments, setDraftAssessments] = useState<any[]>([]);
  const [recentPatients, setRecentPatients] = useState<any[]>([]);

  // Search Jump
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  // Loading & error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayName =
    profile?.display_name ||
    (profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : user?.email) ||
    'Clinician';

  const loadDashboardData = useCallback(async () => {
    if (!activePractice) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch appointments for selected date
      const apptPromise = appointmentService.getAppointments({
        date: selectedDate,
        limit: 50,
      });

      // 2. Fetch in-progress or incomplete clinical visits
      const inProgressPromise = clinicalVisitService.getClinicalVisits({
        status: 'in_progress',
        limit: 10,
      });

      const incompleteVisitsPromise = clinicalVisitService.getClinicalVisits({
        status: 'incomplete',
        limit: 10,
      });

      // 3. Fetch draft clinical SOAP notes
      const draftNotesPromise = clinicalNoteService.getClinicalNotes({
        status: 'draft',
        limit: 10,
      });

      // 4. Fetch draft specialty assessments
      const draftAssessmentsPromise = supabase
        .from('clinical_assessment_instances')
        .select(`
          id,
          assessment_identifier,
          status,
          created_at,
          patient_id,
          clinical_visit_id,
          definition:clinical_assessment_definitions!definition_id (
            name,
            code,
            specialty
          ),
          patient:patients!fk_clinical_assessments_patient_practice (
            id,
            first_name,
            last_name,
            patient_identifier
          )
        `)
        .eq('practice_id', activePractice.id)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(10);

      // 5. Fetch recent encounters to derive recently seen patients
      const recentVisitsPromise = clinicalVisitService.getClinicalVisits({
        limit: 15,
      });

      const [
        apptRes,
        inProgRes,
        incompRes,
        draftNotesRes,
        draftAssRes,
        recentVisRes,
      ] = await Promise.all([
        apptPromise.catch(() => ({ appointments: [], totalCount: 0, totalPages: 1, page: 1, limit: 50 })),
        inProgressPromise.catch(() => ({ visits: [], totalCount: 0, totalPages: 1, page: 1, limit: 10 })),
        incompleteVisitsPromise.catch(() => ({ visits: [], totalCount: 0, totalPages: 1, page: 1, limit: 10 })),
        draftNotesPromise.catch(() => ({ notes: [], totalCount: 0, totalPages: 1, page: 1, limit: 10 })),
        Promise.resolve(draftAssessmentsPromise).catch(() => ({ data: [] })),
        recentVisitsPromise.catch(() => ({ visits: [], totalCount: 0, totalPages: 1, page: 1, limit: 15 })),
      ]);

      setAppointments(apptRes.appointments);

      // Combine in_progress and incomplete visits awaiting completion
      const activeVisits = [...inProgRes.visits, ...incompRes.visits];
      setInProgressVisits(activeVisits);

      setDraftNotes(draftNotesRes.notes);
      setDraftAssessments((draftAssRes as any)?.data || []);

      // Extract unique recent patients
      const seenPatientIds = new Set<string>();
      const recPatients: any[] = [];
      for (const v of recentVisRes.visits) {
        if (v.patient && !seenPatientIds.has(v.patient.id)) {
          seenPatientIds.add(v.patient.id);
          recPatients.push({
            patient: v.patient,
            lastVisitId: v.id,
            lastVisitDate: v.actual_start || v.created_at,
            episode: v.episode,
          });
        }
        if (recPatients.length >= 5) break;
      }
      setRecentPatients(recPatients);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Failed to load clinical workspace data.');
    } finally {
      setIsLoading(false);
    }
  }, [activePractice, selectedDate]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Date manipulation
  const handleDateShift = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handlePatientSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (patientSearchQuery.trim()) {
      navigate(`/app/patients?search=${encodeURIComponent(patientSearchQuery.trim())}`);
    }
  };

  // Helper formatting
  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  // Metrics
  const completedAppointmentsCount = appointments.filter(
    (a) => a.status === 'completed' || a.status === 'documentation_completed'
  ).length;
  const remainingAppointmentsCount = appointments.length - completedAppointmentsCount;
  const totalAttentionItems =
    inProgressVisits.length + draftNotes.length + draftAssessments.length;

  return (
    <div className="clinician-daily-workspace space-y-6 pb-12">
      {/* Top Header / Greeting & Quick Patient Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Clinician Daily Workspace
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
              {activeMembership?.role ? activeMembership.role.replace('_', ' ') : 'Clinician'}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Welcome back, <strong>{displayName}</strong> &bull; {activePractice?.name}
          </p>
        </div>

        {/* Quick Patient Search / Jump Bar */}
        <form onSubmit={handlePatientSearchSubmit} className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Find patient by name/ID..."
              value={patientSearchQuery}
              onChange={(e) => setPatientSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ minHeight: '44px' }}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shrink-0"
            style={{ minHeight: '44px' }}
          >
            Find
          </button>
        </form>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Appointments */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Today's Schedule</span>
            <Calendar size={18} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {appointments.length}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span className="text-emerald-600 font-semibold">{completedAppointmentsCount} completed</span>
            <span>&bull;</span>
            <span className="text-blue-600 font-semibold">{remainingAppointmentsCount} remaining</span>
          </div>
        </div>

        {/* Card 2: Visits In Progress */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Encounters In Progress</span>
            <Activity size={18} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {inProgressVisits.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {inProgressVisits.length > 0 ? 'Requires clinical encounter completion' : 'No active open encounters'}
          </p>
        </div>

        {/* Card 3: Unfinished SOAP Notes */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Draft SOAP Notes</span>
            <FileText size={18} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {draftNotes.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {draftNotes.length > 0 ? 'Requires review & finalization' : 'All SOAP notes finalized'}
          </p>
        </div>

        {/* Card 4: Draft Specialty Assessments */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Draft Assessments</span>
            <Sparkles size={18} className="text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {draftAssessments.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {draftAssessments.length > 0 ? 'Neurology / Paediatrics in draft' : 'Zero draft assessments'}
          </p>
        </div>
      </div>

      {/* Error Banner if any */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button
            onClick={loadDashboardData}
            className="px-3 py-1 bg-red-100 text-red-800 rounded font-semibold text-xs hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Span 2): Today's Appointments & Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Schedule Section Header & Date Controls */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock size={20} className="text-blue-600" />
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Today's Patient Schedule
                </h2>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {appointments.length}
                </span>
              </div>

              {/* Date Nav Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDateShift(-1)}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                  style={{ minHeight: '44px' }}
                  title="Previous Day"
                  aria-label="Previous Day"
                >
                  ◀
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-200"
                  style={{ minHeight: '44px' }}
                  aria-label="Selected Schedule Date"
                />
                <button
                  type="button"
                  onClick={() => handleDateShift(1)}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                  style={{ minHeight: '44px' }}
                  title="Next Day"
                  aria-label="Next Day"
                >
                  ▶
                </button>
                {selectedDate !== todayStr && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayStr)}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 ml-1"
                    style={{ minHeight: '44px' }}
                  >
                    Today
                  </button>
                )}
                <Link
                  to="/app/appointments/new"
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1.5 ml-2 transition-colors"
                  style={{ minHeight: '44px' }}
                >
                  <CalendarPlus size={14} />
                  <span>+ Book</span>
                </Link>
              </div>
            </div>

            {/* Appointment Table */}
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">
                <div className="inline-block animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-2" />
                <p className="text-sm">Loading today's schedule...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                  No appointments scheduled for {selectedDate === todayStr ? 'today' : selectedDate}
                </h3>
                <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                  There are no scheduled patient encounters on this date. You can book an appointment or view upcoming sessions.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Link
                    to="/app/appointments/new"
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-1.5"
                    style={{ minHeight: '44px' }}
                  >
                    <CalendarPlus size={14} />
                    <span>Book Appointment</span>
                  </Link>
                  <Link
                    to="/app/appointments"
                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 inline-flex items-center"
                    style={{ minHeight: '44px' }}
                  >
                    View All Appointments
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm" aria-label="Today's Appointments">
                  <thead className="bg-slate-50 dark:bg-gray-800/60 text-slate-600 dark:text-slate-300 text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Type &amp; Mode</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Clinical Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {appointments.map((appt) => {
                      const isCompleted =
                        appt.status === 'completed' || appt.status === 'documentation_completed';
                      const isInProgress = appt.status === 'in_progress';
                      const isReadyToStart =
                        appt.status === 'scheduled' ||
                        appt.status === 'confirmed' ||
                        appt.status === 'arrived';

                      return (
                        <tr
                          key={appt.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-gray-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-gray-900 dark:text-white">
                              {formatTime(appt.scheduled_start)} - {formatTime(appt.scheduled_end)}
                            </div>
                            <div className="text-xs text-slate-400">
                              {appt.duration_minutes} mins
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {appt.patient ? (
                              <div>
                                <Link
                                  to={`/app/patients/${appt.patient.id}`}
                                  className="font-bold text-gray-900 dark:text-white hover:text-blue-600 hover:underline"
                                >
                                  {appt.patient.last_name}, {appt.patient.first_name}
                                </Link>
                                <div className="text-xs text-slate-400 font-mono">
                                  {appt.patient.patient_identifier}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400">Unknown Patient</span>
                            )}
                            {appt.episode && (
                              <div className="text-xs text-teal-700 dark:text-teal-400 flex items-center gap-1 mt-0.5">
                                <FolderKanban size={11} />
                                <Link
                                  to={`/app/episodes/${appt.episode.id}`}
                                  className="hover:underline truncate max-w-xs"
                                >
                                  {appt.episode.title}
                                </Link>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="capitalize font-medium text-slate-800 dark:text-slate-200">
                              {appt.appointment_type.replace('_', ' ')}
                            </div>
                            <div className="text-xs text-slate-400 capitalize">
                              {appt.location_mode.replace('_', ' ')}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 text-xs font-semibold rounded capitalize ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : isInProgress
                                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                                  : appt.status === 'arrived'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              }`}
                            >
                              {appt.status.replace('_', ' ')}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap text-right space-x-1.5">
                            {isReadyToStart && (
                              <Link
                                to={`/app/visits/new?appointment_id=${appt.id}`}
                                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                                style={{ minHeight: '44px' }}
                              >
                                <Play size={12} className="mr-1" />
                                Start Visit
                              </Link>
                            )}

                            {isInProgress && (
                              <Link
                                to={`/app/visits/new?appointment_id=${appt.id}`}
                                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                                style={{ minHeight: '44px' }}
                              >
                                <RotateCcw size={12} className="mr-1" />
                                Resume Visit
                              </Link>
                            )}

                            {isCompleted && (
                              <Link
                                to={`/app/appointments/new?patientId=${appt.patient_id}&episodeId=${appt.episode_id || ''}&clinicianId=${appt.physiotherapist_id}`}
                                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                                style={{ minHeight: '44px' }}
                              >
                                + Follow-up
                              </Link>
                            )}

                            <Link
                              to={`/app/appointments/${appt.id}`}
                              className="inline-flex items-center justify-center px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                              style={{ minHeight: '44px' }}
                            >
                              Details
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Span 1): Attention Required & Recent Patients */}
        <div className="space-y-6">
          {/* Card A: Attention Required (Outstanding Clinical Documentation) */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Attention Required
                </h3>
              </div>
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                totalAttentionItems > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {totalAttentionItems}
              </span>
            </div>

            {totalAttentionItems === 0 ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                <span>All clinical documentation is current. No pending drafts or open encounters.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 1. Open / Incomplete Visits */}
                {inProgressVisits.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-xs text-indigo-950 dark:text-indigo-200">
                        {v.visit_identifier} &bull; {v.patient ? `${v.patient.first_name} ${v.patient.last_name}` : 'Patient'}
                      </div>
                      <div className="text-xs text-indigo-700 dark:text-indigo-400">
                        Encounter awaiting completion
                      </div>
                    </div>
                    <Link
                      to={`/app/visits/${v.id}`}
                      className="px-2.5 py-1 text-xs font-bold rounded bg-indigo-600 text-white hover:bg-indigo-700 shrink-0 inline-flex items-center"
                      style={{ minHeight: '44px' }}
                    >
                      Resume
                    </Link>
                  </div>
                ))}

                {/* 2. Draft SOAP Notes */}
                {draftNotes.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-xs text-amber-950 dark:text-amber-200">
                        {n.note_identifier} &bull; {n.patient ? `${n.patient.first_name} ${n.patient.last_name}` : 'Patient'}
                      </div>
                      <div className="text-xs text-amber-700 dark:text-amber-400">
                        Draft SOAP Note &bull; Unfinalized
                      </div>
                    </div>
                    <Link
                      to={`/app/clinical-notes/${n.id}`}
                      className="px-2.5 py-1 text-xs font-bold rounded bg-amber-600 text-white hover:bg-amber-700 shrink-0 inline-flex items-center"
                      style={{ minHeight: '44px' }}
                    >
                      Finalize
                    </Link>
                  </div>
                ))}

                {/* 3. Draft Specialty Assessments */}
                {draftAssessments.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50/40 dark:bg-purple-950/20 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-xs text-purple-950 dark:text-purple-200">
                        {a.definition?.name || a.assessment_identifier}
                      </div>
                      <div className="text-xs text-purple-700 dark:text-purple-400">
                        {a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : 'Patient'} &bull; Draft Assessment
                      </div>
                    </div>
                    <Link
                      to={`/app/visits/${a.clinical_visit_id}`}
                      className="px-2.5 py-1 text-xs font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shrink-0 inline-flex items-center"
                      style={{ minHeight: '44px' }}
                    >
                      Continue
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card B: Recently Seen Patients */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <User size={18} className="text-teal-600" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Recent Patients
                </h3>
              </div>
              <Link
                to="/app/patients"
                className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5"
              >
                <span>Directory</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            {recentPatients.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No recent patient encounters found.</p>
            ) : (
              <div className="space-y-2">
                {recentPatients.map((item) => (
                  <div
                    key={item.patient.id}
                    className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <Link
                        to={`/app/patients/${item.patient.id}`}
                        className="font-bold text-xs text-gray-900 dark:text-white hover:text-blue-600 hover:underline truncate block"
                      >
                        {item.patient.last_name}, {item.patient.first_name}
                      </Link>
                      <div className="text-xs text-slate-400 font-mono">
                        {item.patient.patient_identifier}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.episode && (
                        <Link
                          to={`/app/episodes/${item.episode.id}`}
                          className="px-2 py-1 text-xs rounded border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100"
                          style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
                          title="Open Care Episode Hub"
                        >
                          Hub
                        </Link>
                      )}
                      <Link
                        to={`/app/visits/${item.lastVisitId}`}
                        className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
                        title="View Last Encounter"
                      >
                        Visit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card C: Multi-Tenant Architecture & Security Badge */}
          <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>Multi-Tenant Row-Level Security</span>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              Practicing in <strong>{activePractice?.name}</strong>. Encounters, notes, and assessments are protected by PostgreSQL RLS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
