import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileCheck,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Printer,
  Edit,
  Trash2,
  Save,
  X,
  FileText,
} from 'lucide-react';
import {
  dischargeSummaryService,
  UpdateDraftDischargeSummaryInput,
  AmendDischargeSummaryInput,
} from '../../services/dischargeSummaryService';
import { ClinicalDocumentPrintHeader } from '../../components/clinical/ClinicalDocumentPrintHeader';
import { ClinicalDocumentPrintFooter } from '../../components/clinical/ClinicalDocumentPrintFooter';
import type {
  DischargeSummaryWithRelations,
  DischargeSummaryStatus,
  DischargeReason,
  DischargeDisposition,
} from '../../types/models';

export const DischargeSummaryDetailPage: React.FC = () => {
  const { summaryId } = useParams<{ summaryId: string }>();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DischargeSummaryWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Draft Editing Mode
  const [isEditingDraft, setIsEditingDraft] = useState<boolean>(false);
  const [editClinicalSummary, setEditClinicalSummary] = useState<string>('');
  const [editFunctionalStatus, setEditFunctionalStatus] = useState<string>('');
  const [editGoalAttainment, setEditGoalAttainment] = useState<string>('');
  const [editOutcomeSummary, setEditOutcomeSummary] = useState<string>('');
  const [editTreatmentSummary, setEditTreatmentSummary] = useState<string>('');
  const [editHepTransition, setEditHepTransition] = useState<string>('');
  const [editRecommendations, setEditRecommendations] = useState<string>('');
  const [editFollowUp, setEditFollowUp] = useState<string>('');
  const [editReason, setEditReason] = useState<DischargeReason>('goals_achieved');
  const [editDisposition, setEditDisposition] = useState<DischargeDisposition>(
    'discharged_to_self_management'
  );

  // Modals
  const [showFinalizeModal, setShowFinalizeModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showAmendModal, setShowAmendModal] = useState<boolean>(false);

  // Amendment fields
  const [amendmentReason, setAmendmentReason] = useState<string>('');
  const [amendClinicalSummary, setAmendClinicalSummary] = useState<string>('');
  const [amendFunctionalStatus, setAmendFunctionalStatus] = useState<string>('');
  const [amendGoalAttainment, setAmendGoalAttainment] = useState<string>('');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const loadSummary = async () => {
    if (!summaryId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await dischargeSummaryService.getSummaryById(summaryId);
      if (!data) {
        setError('Discharge summary not found.');
      } else {
        setSummary(data);
        // Sync draft edit fields
        setEditClinicalSummary(data.clinical_summary);
        setEditFunctionalStatus(data.functional_status_at_discharge);
        setEditGoalAttainment(data.goal_attainment_summary);
        setEditOutcomeSummary(data.outcome_measure_summary || '');
        setEditTreatmentSummary(data.treatment_summary || '');
        setEditHepTransition(data.hep_transition_summary || '');
        setEditRecommendations(data.recommendations || '');
        setEditFollowUp(data.follow_up_recommendations || '');
        setEditReason(data.discharge_reason);
        setEditDisposition(data.discharge_disposition);

        // Sync amend fields
        setAmendClinicalSummary(data.clinical_summary);
        setAmendFunctionalStatus(data.functional_status_at_discharge);
        setAmendGoalAttainment(data.goal_attainment_summary);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load discharge summary.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [summaryId]);

  const handleSaveDraftEdits = async () => {
    if (!summary) return;
    if (!editClinicalSummary.trim() || !editFunctionalStatus.trim() || !editGoalAttainment.trim()) {
      setError('Clinical Summary, Functional Status, and Goal Attainment are required.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const payload: UpdateDraftDischargeSummaryInput = {
        clinical_summary: editClinicalSummary.trim(),
        functional_status_at_discharge: editFunctionalStatus.trim(),
        goal_attainment_summary: editGoalAttainment.trim(),
        outcome_measure_summary: editOutcomeSummary.trim() || null,
        treatment_summary: editTreatmentSummary.trim() || null,
        hep_transition_summary: editHepTransition.trim() || null,
        recommendations: editRecommendations.trim() || null,
        follow_up_recommendations: editFollowUp.trim() || null,
        discharge_reason: editReason,
        discharge_disposition: editDisposition,
      };

      const updated = await dischargeSummaryService.updateDraftSummary(summary.id, payload);
      setSummary(updated);
      setIsEditingDraft(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update draft summary.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalize = async () => {
    if (!summary) return;
    setIsProcessing(true);
    setError(null);
    try {
      const finalized = await dischargeSummaryService.finalizeSummary(summary.id);
      setSummary(finalized);
      setShowFinalizeModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to finalize discharge summary.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!summary) return;
    setIsProcessing(true);
    setError(null);
    try {
      await dischargeSummaryService.deleteDraftSummary(summary.id);
      navigate('/app/discharge-summaries');
    } catch (err: any) {
      setError(err.message || 'Failed to delete draft summary.');
      setIsProcessing(false);
      setShowDeleteModal(false);
    }
  };

  const handleAmend = async () => {
    if (!summary) return;
    if (!amendmentReason.trim()) {
      setError('A non-empty amendment reason is strictly required.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const payload: AmendDischargeSummaryInput = {
        amendment_reason: amendmentReason.trim(),
        clinical_summary: amendClinicalSummary.trim(),
        functional_status_at_discharge: amendFunctionalStatus.trim(),
        goal_attainment_summary: amendGoalAttainment.trim(),
      };

      const amended = await dischargeSummaryService.amendSummary(summary.id, payload);
      setSummary(amended);
      setShowAmendModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to amend discharge summary.');
    } finally {
      setIsProcessing(false);
    }
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

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '40px auto', textAlign: 'center', color: '#64748b' }}>
        Loading discharge summary details...
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 16px' }}>
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '16px',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
            <AlertCircle size={20} />
            Error
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>{error}</p>
        </div>
        <Link
          to="/app/discharge-summaries"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '16px',
            color: '#059669',
            fontSize: '14px',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Back to Discharge Summaries
        </Link>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Top Bar with Print & Actions */}
      <div
        className="print:hidden"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <Link
          to="/app/discharge-summaries"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#64748b',
            fontSize: '13px',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          Back to Discharge Summaries
        </Link>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <Printer size={16} />
            Print Record
          </button>

          {summary.status === 'draft' && !isEditingDraft && (
            <>
              <button
                onClick={() => setIsEditingDraft(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                <Edit size={16} />
                Edit Draft
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  backgroundColor: '#fef2f2',
                  color: '#991b1b',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={16} />
                Delete
              </button>
              <button
                onClick={() => setShowFinalizeModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                <CheckCircle2 size={16} />
                Finalize & Complete Episode
              </button>
            </>
          )}

          {summary.status === 'finalized' && (
            <button
              onClick={() => setShowAmendModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #c7d2fe',
                backgroundColor: '#eef2ff',
                color: '#4338ca',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              <FileText size={16} />
              Amend Summary
            </button>
          )}
        </div>
      </div>

      {/* Active Tenant Practice Branded Clinical Document Header */}
      <ClinicalDocumentPrintHeader
        documentTitle="Discharge Summary & Clinical Record"
        documentSubtitle="Episode of Care Formal Discharge & Clinical Continuity Record"
        documentReference={summary.summary_identifier}
        documentStatus={summary.status}
        issueDate={summary.discharge_date}
        patientName={
          summary.patient
            ? `${summary.patient.first_name} ${summary.patient.last_name}`
            : 'Unassigned Patient'
        }
        patientIdentifier={summary.patient?.patient_identifier}
        patientPhone={summary.patient?.phone}
        patientEmail={summary.patient?.email}
        clinicianName={
          summary.discharging_clinician?.display_name ||
          (summary.discharging_clinician
            ? `${summary.discharging_clinician.first_name} ${summary.discharging_clinician.last_name}`
            : 'Discharging Physiotherapist')
        }
        clinicianRole="Discharging Physiotherapist"
        secondaryClinicianName={
          summary.finalizer?.display_name ||
          (summary.finalizer
            ? `${summary.finalizer.first_name} ${summary.finalizer.last_name}`
            : null)
        }
        secondaryClinicianRole="Authorized & Finalized by"
        episodeTitle={summary.episode?.title}
        episodeIdentifier={summary.episode?.episode_identifier}
      />

      {/* Main Clinical Document Header Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <FileCheck size={26} color="#059669" />
              <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                {summary.summary_identifier}
              </h1>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  padding: '2px 10px',
                  borderRadius: '6px',
                  letterSpacing: '0.05em',
                  ...getStatusBadgeStyle(summary.status),
                }}
              >
                {summary.status}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  backgroundColor: '#f0fdf4',
                  color: '#166534',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid #bbf7d0',
                }}
              >
                Reason: {formatReasonLabel(summary.discharge_reason)}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  backgroundColor: '#f8fafc',
                  color: '#475569',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                }}
              >
                Disposition: {formatDispositionLabel(summary.discharge_disposition)}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right', fontSize: '13px', color: '#64748b' }}>
            <div style={{ fontWeight: '600', color: '#334155' }}>
              Discharge Date: {summary.discharge_date}
            </div>
            <div>
              Clinician:{' '}
              {summary.discharging_clinician?.display_name ||
                (summary.discharging_clinician
                  ? `${summary.discharging_clinician.first_name} ${summary.discharging_clinician.last_name}`
                  : 'Assigned Clinician')}
            </div>
          </div>
        </div>

        {/* Provenance Details */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '12px',
            color: '#64748b',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '12px',
          }}
        >
          {summary.finalized_at && (
            <div>
              <strong style={{ color: '#334155' }}>Finalized: </strong>
              {new Date(summary.finalized_at).toLocaleString()}
              {summary.finalizer && ` by ${summary.finalizer.first_name} ${summary.finalizer.last_name}`}
            </div>
          )}
          {summary.amended_at && (
            <div>
              <strong style={{ color: '#4338ca' }}>Amended: </strong>
              {new Date(summary.amended_at).toLocaleString()}
              {summary.amender && ` by ${summary.amender.first_name} ${summary.amender.last_name}`}
            </div>
          )}
        </div>

        {/* Amendment Banner if Amended */}
        {summary.status === 'amended' && summary.amendment_reason && (
          <div
            style={{
              backgroundColor: '#eef2ff',
              border: '1px solid #c7d2fe',
              borderRadius: '8px',
              padding: '12px 16px',
              marginTop: '16px',
              fontSize: '13px',
              color: '#3730a3',
            }}
          >
            <div style={{ fontWeight: '700', marginBottom: '4px' }}>
              Clinical Amendment Justification:
            </div>
            <div>{summary.amendment_reason}</div>
          </div>
        )}
      </div>

      {/* Patient & Episode Context Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '16px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>
            PATIENT INFORMATION
          </div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
            <Link
              to={`/app/patients/${summary.patient_id}`}
              style={{ color: '#0f172a', textDecoration: 'none' }}
            >
              {summary.patient?.first_name} {summary.patient?.last_name}
            </Link>
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
            Identifier: <span style={{ fontFamily: 'monospace' }}>{summary.patient?.patient_identifier}</span>
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Phone: {summary.patient?.phone || 'N/A'} • Email: {summary.patient?.email || 'N/A'}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '16px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>
            EPISODE OF CARE CLOSURE
          </div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
            <Link
              to={`/app/episodes/${summary.episode_id}`}
              style={{ color: '#0f172a', textDecoration: 'none' }}
            >
              {summary.episode?.title}
            </Link>
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
            Episode ID: <span style={{ fontFamily: 'monospace' }}>{summary.episode?.episode_identifier}</span>
          </div>
          <div style={{ fontSize: '13px', marginTop: '2px' }}>
            Status:{' '}
            <span
              style={{
                fontWeight: '600',
                color: summary.episode?.status === 'completed' ? '#166534' : '#b45309',
              }}
            >
              {summary.episode?.status?.toUpperCase()}
            </span>
            {summary.episode?.status === 'completed' && ' (Closed upon discharge finalization)'}
          </div>
        </div>
      </div>

      {/* Structured Clinical Sections */}
      {isEditingDraft ? (
        /* In-Place Draft Editing Form */
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Edit Draft Discharge Summary
            </h3>
            <button
              onClick={() => setIsEditingDraft(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <X size={14} /> Cancel
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Clinical Summary *
              </label>
              <textarea
                rows={4}
                value={editClinicalSummary}
                onChange={(e) => setEditClinicalSummary(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Functional Status at Discharge *
              </label>
              <textarea
                rows={3}
                value={editFunctionalStatus}
                onChange={(e) => setEditFunctionalStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Goal Attainment Summary *
              </label>
              <textarea
                rows={3}
                value={editGoalAttainment}
                onChange={(e) => setEditGoalAttainment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Outcome Measure Reconciliation
              </label>
              <textarea
                rows={2}
                value={editOutcomeSummary}
                onChange={(e) => setEditOutcomeSummary(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Treatment Summary
              </label>
              <textarea
                rows={2}
                value={editTreatmentSummary}
                onChange={(e) => setEditTreatmentSummary(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                HEP Transition Plan
              </label>
              <textarea
                rows={2}
                value={editHepTransition}
                onChange={(e) => setEditHepTransition(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setIsEditingDraft(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSaveDraftEdits}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                }}
              >
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Read-Only Structured Clinical Presentation */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Clinical Summary */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              padding: '20px',
            }}
          >
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>
              1. Clinical Summary
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: '#334155',
                lineHeight: '1.6',
                margin: 0,
                whiteSpace: 'pre-line',
              }}
            >
              {summary.clinical_summary}
            </p>
          </div>

          {/* Functional Status at Discharge */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              padding: '20px',
            }}
          >
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>
              2. Functional Status at Discharge
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: '#334155',
                lineHeight: '1.6',
                margin: 0,
                whiteSpace: 'pre-line',
              }}
            >
              {summary.functional_status_at_discharge}
            </p>
          </div>

          {/* Goal Attainment Summary */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              padding: '20px',
            }}
          >
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>
              3. Goal Attainment Summary
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: '#334155',
                lineHeight: '1.6',
                margin: 0,
                whiteSpace: 'pre-line',
              }}
            >
              {summary.goal_attainment_summary}
            </p>
          </div>

          {/* Outcome Measure Reconciliation */}
          {summary.outcome_measure_summary && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '20px',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>
                4. Outcome Measure Reconciliation
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: '#334155',
                  lineHeight: '1.6',
                  margin: 0,
                  whiteSpace: 'pre-line',
                }}
              >
                {summary.outcome_measure_summary}
              </p>
            </div>
          )}

          {/* Treatment Summary & HEP Transition */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
            }}
          >
            {summary.treatment_summary && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '18px',
                }}
              >
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                  Treatment Summary
                </h4>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#334155',
                    lineHeight: '1.5',
                    margin: 0,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {summary.treatment_summary}
                </p>
              </div>
            )}

            {summary.hep_transition_summary && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '18px',
                }}
              >
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                  HEP Transition Plan
                </h4>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#334155',
                    lineHeight: '1.5',
                    margin: 0,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {summary.hep_transition_summary}
                </p>
              </div>
            )}
          </div>

          {/* Recommendations & Follow-up */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
            }}
          >
            {summary.recommendations && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '18px',
                }}
              >
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                  Recommendations & Ergonomics
                </h4>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#334155',
                    lineHeight: '1.5',
                    margin: 0,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {summary.recommendations}
                </p>
              </div>
            )}

            {summary.follow_up_recommendations && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '18px',
                }}
              >
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                  Follow-up with Referrer
                </h4>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#334155',
                    lineHeight: '1.5',
                    margin: 0,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {summary.follow_up_recommendations}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Official Issuing Practice Clinical Document Footer */}
      <ClinicalDocumentPrintFooter
        documentReference={summary.summary_identifier}
        signOffClinicianName={
          summary.finalizer?.display_name ||
          summary.discharging_clinician?.display_name ||
          'Attending Physiotherapist'
        }
      />

      {/* Finalize Confirmation Modal */}
      {showFinalizeModal && (
        <div className="print:hidden"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <CheckCircle2 size={24} color="#059669" />
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Finalize Discharge Summary?
              </h3>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.5', marginBottom: '16px' }}>
              Finalization locks this record as an immutable legal clinical document and{' '}
              <strong>atomically transitions Episode of Care ({summary.episode?.episode_identifier}) to 'completed'</strong>.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setShowFinalizeModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleFinalize}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                }}
              >
                {isProcessing ? 'Finalizing...' : 'Yes, Finalize'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Draft Confirmation Modal */}
      {showDeleteModal && (
        <div className="print:hidden"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Trash2 size={24} color="#dc2626" />
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Delete Draft Summary?
              </h3>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.5', marginBottom: '16px' }}>
              Are you sure you want to delete draft discharge summary{' '}
              <strong>{summary.summary_identifier}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleDelete}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                }}
              >
                {isProcessing ? 'Deleting...' : 'Yes, Delete Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Amend Modal */}
      {showAmendModal && (
        <div className="print:hidden"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <FileText size={24} color="#4338ca" />
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Formal Clinical Record Amendment
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', marginBottom: '16px' }}>
              Medical record compliance requires a mandatory, non-empty amendment rationale. The original
              finalization stamp will be permanently preserved.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Amendment Reason * (Required by clinical compliance)
                </label>
                <textarea
                  rows={2}
                  value={amendmentReason}
                  onChange={(e) => setAmendmentReason(e.target.value)}
                  placeholder="State clinical reason for amending finalized summary (e.g. late hospital referral record received, clarified follow-up)..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Amended Clinical Summary
                </label>
                <textarea
                  rows={3}
                  value={amendClinicalSummary}
                  onChange={(e) => setAmendClinicalSummary(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Amended Functional Status
                </label>
                <textarea
                  rows={2}
                  value={amendFunctionalStatus}
                  onChange={(e) => setAmendFunctionalStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setShowAmendModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleAmend}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#4338ca',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                }}
              >
                {isProcessing ? 'Amending...' : 'Submit Amendment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
