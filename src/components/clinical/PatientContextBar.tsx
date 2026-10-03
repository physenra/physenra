import React from 'react';
import { Link } from 'react-router-dom';
import { User, FolderKanban, Calendar, Stethoscope } from 'lucide-react';

export interface PatientContextBarProps {
  patient: {
    id: string;
    patient_identifier: string;
    first_name: string;
    last_name: string;
    date_of_birth?: string | null;
    sex?: string | null;
  } | null;
  episode?: {
    id: string;
    episode_identifier: string;
    title: string;
    status?: string;
  } | null;
  visitDate?: string | null;
  clinicianName?: string | null;
  currentEncounterId?: string | null;
  currentSection?: 'visit' | 'episode' | 'note' | 'assessment';
}

export const PatientContextBar: React.FC<PatientContextBarProps> = ({
  patient,
  episode,
  visitDate,
  clinicianName,
  currentEncounterId: _currentEncounterId,
  currentSection = 'visit',
}) => {
  if (!patient) return null;

  const calculateAge = (dob: string | null | undefined): string | null => {
    if (!dob) return null;
    try {
      const birth = new Date(dob);
      if (isNaN(birth.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return `${age} yrs`;
    } catch {
      return null;
    }
  };

  const ageStr = calculateAge(patient.date_of_birth);
  const sexStr = patient.sex
    ? patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1).toLowerCase()
    : null;

  return (
    <section
      className="patient-context-bar bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 sm:p-4 mb-4 shadow-sm"
      aria-label="Patient and Clinical Context Bar"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Core Patient Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <User size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/app/patients/${patient.id}`}
                className="font-bold text-base text-gray-900 dark:text-white hover:text-blue-600 hover:underline truncate"
                title="View Patient Profile"
              >
                {patient.last_name}, {patient.first_name}
              </Link>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {patient.patient_identifier}
              </span>
              {(ageStr || sexStr) && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {[ageStr, sexStr].filter(Boolean).join(' • ')}
                </span>
              )}
            </div>

            {/* Episode Context & Practitioner */}
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex-wrap">
              {episode ? (
                <div className="flex items-center gap-1">
                  <FolderKanban size={13} className="text-teal-600" aria-hidden="true" />
                  <span>Episode:</span>
                  <Link
                    to={`/app/episodes/${episode.id}`}
                    className="font-semibold text-teal-700 dark:text-teal-400 hover:underline"
                  >
                    {episode.title} ({episode.episode_identifier})
                  </Link>
                </div>
              ) : (
                <span className="text-slate-400">No care episode linked</span>
              )}

              {clinicianName && (
                <div className="flex items-center gap-1">
                  <Stethoscope size={13} className="text-slate-500" aria-hidden="true" />
                  <span>Clinician: <strong>{clinicianName}</strong></span>
                </div>
              )}

              {visitDate && (
                <div className="flex items-center gap-1">
                  <Calendar size={13} className="text-slate-500" aria-hidden="true" />
                  <span>{new Date(visitDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick 1-Click Navigation Actions (Touch Targets >= 44px) */}
        <nav
          className="flex items-center gap-1.5 flex-wrap border-t lg:border-t-0 pt-2 lg:pt-0 border-slate-100 dark:border-slate-800"
          aria-label="Patient Quick Navigation"
        >
          <Link
            to={`/app/patients/${patient.id}`}
            className="inline-flex items-center justify-center px-3 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-700 hover:border-slate-300 transition-colors"
            style={{ minHeight: '44px' }}
          >
            Patient Profile
          </Link>

          {episode && (
            <Link
              to={`/app/episodes/${episode.id}`}
              className={`inline-flex items-center justify-center px-3 text-xs font-semibold rounded-md border transition-colors ${
                currentSection === 'episode'
                  ? 'bg-teal-50 border-teal-300 text-teal-800 dark:bg-teal-950/40 dark:border-teal-700 dark:text-teal-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
              }`}
              style={{ minHeight: '44px' }}
            >
              Episode Hub
            </Link>
          )}

          <Link
            to={`/app/appointments?patientId=${patient.id}`}
            className="inline-flex items-center justify-center px-3 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-700 hover:border-slate-300 transition-colors"
            style={{ minHeight: '44px' }}
          >
            Appointments
          </Link>

          <Link
            to={`/app/visits?patientId=${patient.id}`}
            className={`inline-flex items-center justify-center px-3 text-xs font-semibold rounded-md border transition-colors ${
              currentSection === 'visit'
                ? 'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
            }`}
            style={{ minHeight: '44px' }}
          >
            Visits & Encounters
          </Link>
        </nav>
      </div>
    </section>
  );
};
