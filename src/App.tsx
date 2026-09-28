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
import { ClinicalNoteListPage } from './pages/notes/ClinicalNoteListPage';
import { CreateClinicalNotePage } from './pages/notes/CreateClinicalNotePage';
import { ClinicalNoteDetailPage } from './pages/notes/ClinicalNoteDetailPage';
import { OutcomeMeasureListPage } from './pages/outcomes/OutcomeMeasureListPage';
import { CreateOutcomeAssessmentPage } from './pages/outcomes/CreateOutcomeAssessmentPage';
import { OutcomeAssessmentDetailPage } from './pages/outcomes/OutcomeAssessmentDetailPage';
import { HEPListPage } from './pages/hep/HEPListPage';
import { CreateHEPPage } from './pages/hep/CreateHEPPage';
import { HEPDetailPage } from './pages/hep/HEPDetailPage';
import { TreatmentPlanListPage } from './pages/treatment-plans/TreatmentPlanListPage';
import { CreateTreatmentPlanPage } from './pages/treatment-plans/CreateTreatmentPlanPage';
import { TreatmentPlanDetailPage } from './pages/treatment-plans/TreatmentPlanDetailPage';
import { ProgressReviewListPage } from './pages/progress-reviews/ProgressReviewListPage';
import { CreateProgressReviewPage } from './pages/progress-reviews/CreateProgressReviewPage';
import { ProgressReviewDetailPage } from './pages/progress-reviews/ProgressReviewDetailPage';
import { DischargeSummaryListPage } from './pages/discharge-summaries/DischargeSummaryListPage';
import { CreateDischargeSummaryPage } from './pages/discharge-summaries/CreateDischargeSummaryPage';
import { DischargeSummaryDetailPage } from './pages/discharge-summaries/DischargeSummaryDetailPage';
import { ServiceListPage } from './pages/services/ServiceListPage';
import { CreateServicePage } from './pages/services/CreateServicePage';
import { FeeScheduleListPage } from './pages/fee-schedules/FeeScheduleListPage';
import { CreateFeeSchedulePage } from './pages/fee-schedules/CreateFeeSchedulePage';
import { FeeScheduleDetailPage } from './pages/fee-schedules/FeeScheduleDetailPage';
import { InvoiceListPage } from './pages/invoices/InvoiceListPage';
import { CreateInvoicePage } from './pages/invoices/CreateInvoicePage';
import { InvoiceDetailPage } from './pages/invoices/InvoiceDetailPage';
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
        <Route path="clinical-visits" element={<ClinicalVisitListPage />} />
        <Route path="clinical-visits/new" element={<CreateClinicalVisitPage />} />
        <Route path="clinical-visits/:visitId" element={<ClinicalVisitDetailPage />} />

        {/* Clinical Note / SOAP Foundation V1 */}
        <Route path="clinical-notes" element={<ClinicalNoteListPage />} />
        <Route path="clinical-notes/new" element={<CreateClinicalNotePage />} />
        <Route path="clinical-notes/:noteId" element={<ClinicalNoteDetailPage />} />

        {/* Clinical Outcome Measures Foundation V1 */}
        <Route path="outcome-measures" element={<OutcomeMeasureListPage />} />
        <Route path="outcome-measures/new" element={<CreateOutcomeAssessmentPage />} />
        <Route path="outcome-measures/:assessmentId" element={<OutcomeAssessmentDetailPage />} />

        {/* Home Exercise Program (HEP) Foundation V1 */}
        <Route path="hep" element={<HEPListPage />} />
        <Route path="hep/new" element={<CreateHEPPage />} />
        <Route path="hep/:programId" element={<HEPDetailPage />} />
        <Route path="home-exercises" element={<HEPListPage />} />
        <Route path="home-exercises/new" element={<CreateHEPPage />} />
        <Route path="home-exercises/:programId" element={<HEPDetailPage />} />

        {/* Treatment Plan & Clinical Goals Foundation V1 */}
        <Route path="treatment-plans" element={<TreatmentPlanListPage />} />
        <Route path="treatment-plans/new" element={<CreateTreatmentPlanPage />} />
        <Route path="treatment-plans/:planId" element={<TreatmentPlanDetailPage />} />

        {/* Milestone & Progress Review Foundation V1 */}
        <Route path="progress-reviews" element={<ProgressReviewListPage />} />
        <Route path="progress-reviews/new" element={<CreateProgressReviewPage />} />
        <Route path="progress-reviews/:reviewId" element={<ProgressReviewDetailPage />} />

        {/* Discharge Summary Foundation V1 */}
        <Route path="discharge-summaries" element={<DischargeSummaryListPage />} />
        <Route path="discharge-summaries/new" element={<CreateDischargeSummaryPage />} />
        <Route path="discharge-summaries/:summaryId" element={<DischargeSummaryDetailPage />} />

        {/* Fee Schedule & Service Catalog Foundation V1 */}
        <Route path="services" element={<ServiceListPage />} />
        <Route path="services/new" element={<CreateServicePage />} />
        <Route path="fee-schedules" element={<FeeScheduleListPage />} />
        <Route path="fee-schedules/new" element={<CreateFeeSchedulePage />} />
        <Route path="fee-schedules/:scheduleId" element={<FeeScheduleDetailPage />} />

        {/* Billing & Invoicing Foundation V1 */}
        <Route path="invoices" element={<InvoiceListPage />} />
        <Route path="invoices/new" element={<CreateInvoicePage />} />
        <Route path="invoices/:invoiceId" element={<InvoiceDetailPage />} />
      </Route>

      {/* Unmatched 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
export default App;
