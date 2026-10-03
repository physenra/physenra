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
import { PaymentListPage } from './pages/payments/PaymentListPage';
import { CreatePaymentPage } from './pages/payments/CreatePaymentPage';
import { PaymentDetailPage } from './pages/payments/PaymentDetailPage';
import { ReceiptListPage } from './pages/receipts/ReceiptListPage';
import { ReceiptDetailPage } from './pages/receipts/ReceiptDetailPage';
import { PackageListPage } from './pages/packages/PackageListPage';
import { CreatePackagePage } from './pages/packages/CreatePackagePage';
import { PurchasePackagePage } from './pages/packages/PurchasePackagePage';
import { PackageEntitlementListPage } from './pages/packages/PackageEntitlementListPage';
import { PackageEntitlementDetailPage } from './pages/packages/PackageEntitlementDetailPage';
import { WalletListPage } from './pages/wallets/WalletListPage';
import { WalletDetailPage } from './pages/wallets/WalletDetailPage';
import { MembershipPlanListPage } from './pages/memberships/MembershipPlanListPage';
import { MembershipListPage } from './pages/memberships/MembershipListPage';
import { MembershipDetailPage } from './pages/memberships/MembershipDetailPage';
import { InventoryListPage } from './pages/inventory/InventoryListPage';
import { CreateInventoryItemPage } from './pages/inventory/CreateInventoryItemPage';
import { InventoryItemDetailPage } from './pages/inventory/InventoryItemDetailPage';
import { StockMovementsPage } from './pages/inventory/StockMovementsPage';
import { ReceiveStockPage } from './pages/inventory/ReceiveStockPage';
import { TransferStockPage } from './pages/inventory/TransferStockPage';
import { AdjustStockPage } from './pages/inventory/AdjustStockPage';
import { InventoryLocationsPage } from './pages/inventory/InventoryLocationsPage';
import { ImagingDashboardPage } from './pages/imaging/ImagingDashboardPage';
import { ImagingOrdersPage } from './pages/imaging/ImagingOrdersPage';
import { CreateImagingOrderPage } from './pages/imaging/CreateImagingOrderPage';
import { ImagingOrderDetailPage } from './pages/imaging/ImagingOrderDetailPage';
import { ImagingStudiesPage } from './pages/imaging/ImagingStudiesPage';
import { IngestImagingStudyPage } from './pages/imaging/IngestImagingStudyPage';
import { ImagingStudyDetailPage } from './pages/imaging/ImagingStudyDetailPage';
import { ReviewImagingStudyPage } from './pages/imaging/ReviewImagingStudyPage';
import { AttachImagingReportPage } from './pages/imaging/AttachImagingReportPage';
import { PlatformAdminGuard } from './components/auth/PlatformAdminGuard';
import { PlatformLayout } from './components/layout/PlatformLayout';
import { PlatformDashboardPage } from './pages/platform/PlatformDashboardPage';
import { PlatformPracticesPage } from './pages/platform/PlatformPracticesPage';
import { PlatformPracticeDetailPage } from './pages/platform/PlatformPracticeDetailPage';
import { PlatformPlansPage } from './pages/platform/PlatformPlansPage';
import { PlatformBillingPage } from './pages/platform/PlatformBillingPage';
import { PlatformAuditPage } from './pages/platform/PlatformAuditPage';
import { PlatformSettingsPage } from './pages/platform/PlatformSettingsPage';
import { PricingPage } from './pages/public/PricingPage';
import { RegisterPracticePage } from './pages/auth/RegisterPracticePage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { PracticeBillingPage } from './pages/billing/PracticeBillingPage';
import { PracticeInvoiceListPage } from './pages/billing/PracticeInvoiceListPage';
import { PracticeInvoiceDetailPage } from './pages/billing/PracticeInvoiceDetailPage';
import { NoPracticePage } from './pages/error/NoPracticePage';
import { NotFoundPage } from './pages/error/NotFoundPage';

import {
  HomePageShell,
  FeaturesHubShell,
  FeatureDetailShell,
  SecurityPageShell,
  AboutPageShell,
  ContactPageShell,
  FAQPageShell,
  TermsPageShell,
  PrivacyPageShell,
  withPublicSuspense,
} from './public/routes/publicRoutes';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      {/* Public Commercial Website Root (Phase 1A Scaffold) */}
      <Route path="/" element={withPublicSuspense(HomePageShell)} />
      {/* Pre-Distribution compatibility reference: path="/" element={<Navigate to="/app/dashboard" replace />} */}

      {/* Public Features Hub & Specialized Clinical Sub-Routes */}
      <Route path="/features" element={withPublicSuspense(FeaturesHubShell)} />
      <Route path="/features/:slug" element={withPublicSuspense(FeatureDetailShell)} />
      <Route path="/features/physiotherapy-emr" element={withPublicSuspense(FeatureDetailShell)} />
      <Route path="/features/patient-management" element={withPublicSuspense(FeatureDetailShell)} />
      <Route path="/features/appointments" element={withPublicSuspense(FeatureDetailShell)} />
      <Route path="/features/clinical-documentation" element={withPublicSuspense(FeatureDetailShell)} />
      <Route path="/features/treatment-plans" element={withPublicSuspense(FeatureDetailShell)} />
      <Route path="/features/treatment-plans-hep" element={withPublicSuspense(FeatureDetailShell)} />
      <Route path="/features/treatment-packages" element={withPublicSuspense(FeatureDetailShell)} />
      <Route path="/features/billing" element={withPublicSuspense(FeatureDetailShell)} />
      <Route path="/features/pain-management" element={withPublicSuspense(FeatureDetailShell)} />
      <Route path="/features/pain-outcome-tracking" element={withPublicSuspense(FeatureDetailShell)} />
      <Route path="/features/medical-imaging" element={withPublicSuspense(FeatureDetailShell)} />
      <Route path="/features/practice-management" element={withPublicSuspense(FeatureDetailShell)} />

      {/* Commercial, Trust, Legal & Company Routes */}
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/about" element={withPublicSuspense(AboutPageShell)} />
      <Route path="/contact" element={withPublicSuspense(ContactPageShell)} />
      <Route path="/faq" element={withPublicSuspense(FAQPageShell)} />
      <Route path="/security" element={withPublicSuspense(SecurityPageShell)} />
      <Route path="/terms" element={withPublicSuspense(TermsPageShell)} />
      <Route path="/privacy" element={withPublicSuspense(PrivacyPageShell)} />

      {/* Application Bridges */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/register-practice" element={<RegisterPracticePage />} />

      {/* Platform Administration Console */}
      <Route
        path="/platform"
        element={
          <PlatformAdminGuard>
            <PlatformLayout />
          </PlatformAdminGuard>
        }
      >
        <Route index element={<Navigate to="/platform/dashboard" replace />} />
        <Route path="dashboard" element={<PlatformDashboardPage />} />
        <Route path="practices" element={<PlatformPracticesPage />} />
        <Route path="practices/:practiceId" element={<PlatformPracticeDetailPage />} />
        <Route path="plans" element={<PlatformPlansPage />} />
        <Route path="billing" element={<PlatformBillingPage />} />
        <Route path="audit" element={<PlatformAuditPage />} />
        <Route path="settings" element={<PlatformSettingsPage />} />
      </Route>

      {/* Authenticated user with no practice assigned */}
      <Route path="/no-practice" element={<NoPracticePage />} />

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

        {/* Practice SaaS Billing & Subscription Management (Phase 4C & 4D) */}
        <Route path="billing" element={<PracticeBillingPage />} />
        <Route path="billing/plans" element={<PracticeBillingPage defaultTab="plans" />} />
        <Route path="billing/invoices" element={<PracticeInvoiceListPage />} />
        <Route path="billing/invoices/:invoiceId" element={<PracticeInvoiceDetailPage />} />
        
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

        {/* Payments & Receipts Foundation V1 */}
        <Route path="payments" element={<PaymentListPage />} />
        <Route path="payments/new" element={<CreatePaymentPage />} />
        <Route path="payments/:paymentId" element={<PaymentDetailPage />} />
        <Route path="receipts" element={<ReceiptListPage />} />
        <Route path="receipts/:receiptId" element={<ReceiptDetailPage />} />

        {/* Packages & Memberships Foundation V1 */}
        <Route path="packages" element={<PackageListPage />} />
        <Route path="packages/new" element={<CreatePackagePage />} />
        <Route path="packages/purchase" element={<PurchasePackagePage />} />
        <Route path="package-entitlements" element={<PackageEntitlementListPage />} />
        <Route path="package-entitlements/:entitlementId" element={<PackageEntitlementDetailPage />} />

        {/* Patient Wallets Foundation V1 */}
        <Route path="wallets" element={<WalletListPage />} />
        <Route path="wallets/:walletId" element={<WalletDetailPage />} />

        {/* Recurring Memberships & Subscriptions Foundation V1 */}
        <Route path="membership-plans" element={<MembershipPlanListPage />} />
        <Route path="memberships" element={<MembershipListPage />} />
        <Route path="memberships/:membershipId" element={<MembershipDetailPage />} />

        {/* Inventory & Consumables Foundation V1 */}
        <Route path="inventory" element={<InventoryListPage />} />
        <Route path="inventory/new" element={<CreateInventoryItemPage />} />
        <Route path="inventory/movements" element={<StockMovementsPage />} />
        <Route path="inventory/receipt" element={<ReceiveStockPage />} />
        <Route path="inventory/transfer" element={<TransferStockPage />} />
        <Route path="inventory/adjust" element={<AdjustStockPage />} />
        <Route path="inventory/locations" element={<InventoryLocationsPage />} />
        <Route path="inventory/:itemId" element={<InventoryItemDetailPage />} />

        {/* DICOM & Medical Imaging Foundation V1 */}
        <Route path="imaging" element={<ImagingDashboardPage />} />
        <Route path="imaging/orders" element={<ImagingOrdersPage />} />
        <Route path="imaging/orders/new" element={<CreateImagingOrderPage />} />
        <Route path="imaging/orders/:orderId" element={<ImagingOrderDetailPage />} />
        <Route path="imaging/studies" element={<ImagingStudiesPage />} />
        <Route path="imaging/studies/new" element={<IngestImagingStudyPage />} />
        <Route path="imaging/studies/ingest" element={<IngestImagingStudyPage />} />
        <Route path="imaging/studies/:studyId" element={<ImagingStudyDetailPage />} />
        <Route path="imaging/studies/:studyId/review" element={<ReviewImagingStudyPage />} />
        <Route path="imaging/studies/:studyId/attach-report" element={<AttachImagingReportPage />} />
        <Route path="imaging/studies/:studyId/reports/new" element={<AttachImagingReportPage />} />
      </Route>

      {/* Unmatched 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
export default App;
