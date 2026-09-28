import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { PracticeSettingsPage } from './pages/practice/PracticeSettingsPage';
import { PatientListPage } from './pages/patients/PatientListPage';
import { CreatePatientPage } from './pages/patients/CreatePatientPage';
import { PatientProfilePage } from './pages/patients/PatientProfilePage';
import { EditPatientPage } from './pages/patients/EditPatientPage';
import { EpisodeListPage } from './pages/episodes/EpisodeListPage';
import { CreateEpisodePage } from './pages/episodes/CreateEpisodePage';
import { EpisodeProfilePage } from './pages/episodes/EpisodeProfilePage';
import { EditEpisodePage } from './pages/episodes/EditEpisodePage';
import { AppointmentListPage } from './pages/appointments/AppointmentListPage';
import { CreateAppointmentPage } from './pages/appointments/CreateAppointmentPage';
import { AppointmentDetailPage } from './pages/appointments/AppointmentDetailPage';
import { EditAppointmentPage } from './pages/appointments/EditAppointmentPage';
import { ClinicalVisitListPage } from './pages/visits/ClinicalVisitListPage';
import { CreateClinicalVisitPage } from './pages/visits/CreateClinicalVisitPage';
import { ClinicalVisitDetailPage } from './pages/visits/ClinicalVisitDetailPage';
import { NoPracticePage } from './pages/error/NoPracticePage';
import { NotFoundPage } from './pages/error/NotFoundPage';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication */}
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated user with no practice assigned */}
      <Route path="/no-practice" element={<NoPracticePage />} />

      {/* Root redirection to dashboard */}
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

      {/* Protected Practice Application Routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="practice" element={<PracticeSettingsPage />} />
        
        {/* Patient Registry Foundation V1 */}
        <Route path="patients" element={<PatientListPage />} />
        <Route path="patients/new" element={<CreatePatientPage />} />
        <Route path="patients/:patientId" element={<PatientProfilePage />} />
        <Route path="patients/:patientId/edit" element={<EditPatientPage />} />

        {/* Episode of Care Foundation V1 */}
        <Route path="episodes" element={<EpisodeListPage />} />
        <Route path="patients/:patientId/episodes/new" element={<CreateEpisodePage />} />
        <Route path="episodes/:episodeId" element={<EpisodeProfilePage />} />
        <Route path="episodes/:episodeId/edit" element={<EditEpisodePage />} />

        {/* Appointment & Scheduling Foundation V1 */}
        <Route path="appointments" element={<AppointmentListPage />} />
        <Route path="appointments/new" element={<CreateAppointmentPage />} />
        <Route path="appointments/:appointmentId" element={<AppointmentDetailPage />} />
        <Route path="appointments/:appointmentId/edit" element={<EditAppointmentPage />} />

        {/* Clinical Visit Foundation V1 */}
        <Route path="visits" element={<ClinicalVisitListPage />} />
        <Route path="visits/new" element={<CreateClinicalVisitPage />} />
        <Route path="visits/:visitId" element={<ClinicalVisitDetailPage />} />
      </Route>

      {/* Unmatched 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
export default App;
