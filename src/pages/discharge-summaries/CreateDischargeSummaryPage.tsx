import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  FileCheck,
  ArrowLeft,
  AlertCircle,
  Save,
  CheckCircle2,
  Layers,
  Award,
  TrendingUp,
  Activity,
} from 'lucide-react';
import {
  dischargeSummaryService,
  CreateDischargeSummaryInput,
  DischargeEvidenceData,
} from '../../services/dischargeSummaryService';
import { useFormDraft } from '../../hooks/useFormDraft';
import { DraftBanner } from '../../components/ui/DraftBanner';
import type {
  DischargeReason,
  DischargeDisposition,
  Profile,
} from '../../types/models';

interface DischargeSummaryDraftData {
  selectedEpisodeId: string;
  dischargingClinicianId: string;
  dischargeDate: string;
  dischargeReason: DischargeReason;
  dischargeDisposition: DischargeDisposition;
  clinicalSummary: string;
  functionalStatusAtDischarge: string;
  goalAttainmentSummary: string;
  outcomeMeasureSummary: string;
  treatmentSummary: string;
  hepTransitionSummary: string;
  recommendations: string;
  followUpRecommendations: string;
}

export const CreateDischargeSummaryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedEpisodeId = searchParams.get('episodeId');

  // Platform-wide draft preservation
  const {
    data: draftData,
    updateField,
    isDirty,
    isRestored,
    restoredAt,
    saveStatus,
    discardDraft,
    markSaved,
  } = useFormDraft<DischargeSummaryDraftData>({
    formId: `create_discharge_summary_${preselectedEpisodeId || 'default'}`,
    initialData: {
      selectedEpisodeId: preselectedEpisodeId || '',
      dischargingClinicianId: '',
      dischargeDate: new Date().toISOString().split('T')[0],
      dischargeReason: 'goals_achieved',
      dischargeDisposition: 'discharged_to_self_management',
      clinicalSummary: '',
      functionalStatusAtDischarge: '',
      goalAttainmentSummary: '',
      outcomeMeasureSummary: '',
      treatmentSummary: '',
      hepTransitionSummary: '',
      recommendations: '',
      followUpRecommendations: '',
    },
  });

  // Form states bound to draftData
  const selectedEpisodeId = draftData.selectedEpisodeId;
  const setSelectedEpisodeId = (val: string) => updateField('selectedEpisodeId', val);
  const dischargingClinicianId = draftData.dischargingClinicianId;
  const setDischargingClinicianId = (val: string) => updateField('dischargingClinicianId', val);
  const dischargeDate = draftData.dischargeDate;
  const setDischargeDate = (val: string) => updateField('dischargeDate', val);
  const dischargeReason = draftData.dischargeReason;
  const setDischargeReason = (val: DischargeReason) => updateField('dischargeReason', val);
  const dischargeDisposition = draftData.dischargeDisposition;
  const setDischargeDisposition = (val: DischargeDisposition) => updateField('dischargeDisposition', val);

  const clinicalSummary = draftData.clinicalSummary;
  const setClinicalSummary = (val: string) => updateField('clinicalSummary', val);
  const functionalStatusAtDischarge = draftData.functionalStatusAtDischarge;
  const setFunctionalStatusAtDischarge = (val: string) => updateField('functionalStatusAtDischarge', val);
  const goalAttainmentSummary = draftData.goalAttainmentSummary;
  const setGoalAttainmentSummary = (val: string) => updateField('goalAttainmentSummary', val);
  const outcomeMeasureSummary = draftData.outcomeMeasureSummary;
  const setOutcomeMeasureSummary = (val: string) => updateField('outcomeMeasureSummary', val);
  const treatmentSummary = draftData.treatmentSummary;
  const setTreatmentSummary = (val: string) => updateField('treatmentSummary', val);
  const hepTransitionSummary = draftData.hepTransitionSummary;
  const setHepTransitionSummary = (val: string) => updateField('hepTransitionSummary', val);
  const recommendations = draftData.recommendations;
  const setRecommendations = (val: string) => updateField('recommendations', val);
  const followUpRecommendations = draftData.followUpRecommendations;
  const setFollowUpRecommendations = (val: string) => updateField('followUpRecommendations', val);

  // Dropdown & evidence data
  const [eligibleEpisodes, setEligibleEpisodes] = useState<any[]>([]);
  const [clinicians, setClinicians] = useState<Profile[]>([]);
  const [evidenceData, setEvidenceData] = useState<DischargeEvidenceData | null>(null);

  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState<boolean>(true);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Finalization Confirmation Modal
  const [showFinalizeModal, setShowFinalizeModal] = useState<boolean>(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingDropdowns(true);
      setError(null);
      try {
        const [episodesRes, cliniciansRes] = await Promise.all([
          dischargeSummaryService.getDischargeableEpisodes(),
          dischargeSummaryService.getClinicians(),
        ]);
        setEligibleEpisodes(episodesRes);
        setClinicians(cliniciansRes);
        if (cliniciansRes.length > 0 && !dischargingClinicianId) {
          setDischargingClinicianId(cliniciansRes[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load initial form data.');
      } finally {
        setIsLoadingDropdowns(false);
      }
    };
    fetchInitialData();
  }, []);

  // When episode changes, load evidence snapshot
  useEffect(() => {
    if (!selectedEpisodeId) {
      setEvidenceData(null);
      return;
    }

    const fetchEvidence = async () => {
      setIsLoadingEvidence(true);
      setError(null);
      try {
        const evidence = await dischargeSummaryService.getDischargeEvidence(selectedEpisodeId);
        setEvidenceData(evidence);

        // Pre-fill clinician if episode has a primary physiotherapist
        if (evidence.episode.primary_physiotherapist_id) {
          setDischargingClinicianId(evidence.episode.primary_physiotherapist_id);
        }

        // If goal attainment summary is empty, generate initial baseline if plan has goals
        if (evidence.treatmentPlan?.goals && evidence.treatmentPlan.goals.length > 0 && !goalAttainmentSummary) {
          const autoGoalLines = evidence.treatmentPlan.goals.map(
            (g, idx) => `Goal ${idx + 1} (${g.category.replace('_', ' ')}): "${g.goal_statement}" - Target: ${g.target_description || 'Met'}`
          );
          setGoalAttainmentSummary(autoGoalLines.join('\n'));
        }

        // Pre-fill outcome measures if available
        if (evidence.outcomeAssessments && evidence.outcomeAssessments.length > 0 && !outcomeMeasureSummary) {
          const outcomeLines = evidence.outcomeAssessments.slice(0, 5).map(
            (oa) => `${oa.definition?.name || 'Assessment'} (${oa.performed_at?.split('T')[0]}): Score ${oa.numeric_score ?? 'N/A'} ${oa.definition?.score_unit || ''}`
          );
          setOutcomeMeasureSummary(outcomeLines.join('\n'));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load episode clinical evidence.');
      } finally {
        setIsLoadingEvidence(false);
      }
    };

    fetchEvidence();
  }, [selectedEpisodeId]);

  const validateForm = (): boolean => {
    if (!selectedEpisodeId) {
      setError('Please select an Episode of Care to discharge.');
      return false;
    }
    if (!dischargingClinicianId) {
      setError('Please select the discharging clinician.');
      return false;
    }
    if (!clinicalSummary.trim()) {
      setError('Clinical Summary is required.');
      return false;
    }
    if (!functionalStatusAtDischarge.trim()) {
      setError('Functional Status at Discharge is required.');
      return false;
    }
    if (!goalAttainmentSummary.trim()) {
      setError('Goal Attainment Summary is required.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (targetStatus: 'draft' | 'finalized') => {
    if (!validateForm()) return;

    if (!evidenceData) {
      setError('Episode details could not be verified.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payload: CreateDischargeSummaryInput = {
        patient_id: evidenceData.episode.patient_id,
        episode_id: selectedEpisodeId,
        treatment_plan_id: evidenceData.treatmentPlan?.id || null,
        final_progress_review_id: evidenceData.latestProgressReview?.id || null,
        discharging_clinician_id: dischargingClinicianId,
        discharge_date: dischargeDate,
        discharge_reason: dischargeReason,
        discharge_disposition: dischargeDisposition,
        status: targetStatus,
        clinical_summary: clinicalSummary.trim(),
        functional_status_at_discharge: functionalStatusAtDischarge.trim(),
        goal_attainment_summary: goalAttainmentSummary.trim(),
        outcome_measure_summary: outcomeMeasureSummary.trim() || null,
        treatment_summary: treatmentSummary.trim() || null,
        hep_transition_summary: hepTransitionSummary.trim() || null,
        recommendations: recommendations.trim() || null,
        follow_up_recommendations: followUpRecommendations.trim() || null,
      };

      const created = await dischargeSummaryService.createSummary(payload);
      markSaved();
      navigate(`/app/discharge-summaries/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create discharge summary.');
      setIsSubmitting(false);
      setShowFinalizeModal(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Top Breadcrumb & Title */}
      <div style={{ marginBottom: '20px' }}>
        <Link
          to="/app/discharge-summaries"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#64748b',
            fontSize: '13px',
            textDecoration: 'none',
            marginBottom: '8px',
          }}
        >
          <ArrowLeft size={16} />
          Back to Discharge Summaries
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileCheck size={28} color="#059669" />
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            New Discharge Summary
          </h1>
        </div>
        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
          Synthesize clinical outcomes, document functional status, and close the Episode of Care.
        </p>
      </div>

      {/* Draft Restoration & Status Banner */}
      <DraftBanner
        isRestored={isRestored}
        restoredAt={restoredAt}
        isDirty={isDirty}
        saveStatus={saveStatus}
        onDiscard={discardDraft}
        entityName="discharge summary"
      />

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

      {/* Step 1: Select Episode of Care */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>
          1. Select Episode of Care
        </h3>
        {isLoadingDropdowns ? (
          <div style={{ fontSize: '13px', color: '#64748b' }}>Loading available episodes...</div>
        ) : (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Episode of Care (Active / In Progress) *
            </label>
            <select
              value={selectedEpisodeId}
              onChange={(e) => setSelectedEpisodeId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="">-- Choose an active episode of care to discharge --</option>
              {eligibleEpisodes.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.patient?.first_name} {ep.patient?.last_name} ({ep.patient?.patient_identifier}) —{' '}
                  {ep.title} ({ep.episode_identifier}) [{ep.status}]
                </option>
              ))}
            </select>
            {eligibleEpisodes.length === 0 && (
              <p style={{ fontSize: '13px', color: '#b45309', marginTop: '6px' }}>
                No active or paused episodes without an existing discharge summary were found.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Evidence Snapshot (Appears when episode is selected) */}
      {selectedEpisodeId && isLoadingEvidence && (
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
            padding: '20px',
            marginBottom: '20px',
            color: '#64748b',
            fontSize: '13px',
            textAlign: 'center',
          }}
        >
          Loading episode clinical evidence and outcome assessments...
        </div>
      )}

      {selectedEpisodeId && !isLoadingEvidence && evidenceData && (
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Layers size={20} color="#059669" />
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>
              Episode Clinical Evidence Snapshot
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '600',
                backgroundColor: '#d1fae5',
                color: '#065f46',
                padding: '2px 8px',
                borderRadius: '10px',
              }}
            >
              Auto-Loaded
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Treatment Plan & Goals */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '600',
                  color: '#0f172a',
                  fontSize: '13px',
                  marginBottom: '8px',
                }}
              >
                <Award size={16} color="#2563eb" />
                Treatment Plan & Goals
              </div>
              {evidenceData.treatmentPlan ? (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#334155' }}>
                    {evidenceData.treatmentPlan.plan_identifier}: {evidenceData.treatmentPlan.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    {evidenceData.treatmentPlan.goals?.length || 0} active clinical goals registered.
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>No formal treatment plan on file.</div>
              )}
            </div>

            {/* Latest Progress Review */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '600',
                  color: '#0f172a',
                  fontSize: '13px',
                  marginBottom: '8px',
                }}
              >
                <TrendingUp size={16} color="#7c3aed" />
                Latest Progress Review
              </div>
              {evidenceData.latestProgressReview ? (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#334155' }}>
                    {evidenceData.latestProgressReview.review_identifier} ({evidenceData.latestProgressReview.review_date})
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Rating: {evidenceData.latestProgressReview.overall_progress_assessment?.replace('_', ' ')}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>No milestone reviews recorded.</div>
              )}
            </div>

            {/* Outcome Measures & HEP */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '600',
                  color: '#0f172a',
                  fontSize: '13px',
                  marginBottom: '8px',
                }}
              >
                <Activity size={16} color="#ea580c" />
                Outcomes & Visits
              </div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                <div>• {evidenceData.outcomeAssessments.length} outcome assessments</div>
                <div>• {evidenceData.visits.length} clinical visits recorded</div>
                <div>• {evidenceData.homeExercisePrograms.length} exercise programs (HEP)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Discharge Form Details */}
      {selectedEpisodeId && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>
            2. Discharge Parameters & Clinical Rationale
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            {/* Discharging Clinician */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Discharging Clinician *
              </label>
              <select
                value={dischargingClinicianId}
                onChange={(e) => setDischargingClinicianId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                }}
              >
                {clinicians.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name || `${c.first_name} ${c.last_name}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Discharge Date */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Discharge Date *
              </label>
              <input
                type="date"
                value={dischargeDate}
                onChange={(e) => setDischargeDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Discharge Reason */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Discharge Reason *
              </label>
              <select
                value={dischargeReason}
                onChange={(e) => setDischargeReason(e.target.value as DischargeReason)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                }}
              >
                <option value="goals_achieved">All Goals Achieved</option>
                <option value="goals_partially_achieved">Goals Partially Achieved</option>
                <option value="patient_independent">Patient Independent / Self-Managing</option>
                <option value="plateau">Functional Plateau Reached</option>
                <option value="patient_choice">Patient Choice / Self-Discharge</option>
                <option value="transfer_of_care">Transfer of Care</option>
                <option value="referred_elsewhere">Referred to Specialist / Hospital</option>
                <option value="lost_to_follow_up">Lost to Follow-up</option>
                <option value="financial_administrative">Financial / Administrative Reason</option>
                <option value="other">Other Clinical Rationale</option>
              </select>
            </div>

            {/* Discharge Disposition */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Discharge Disposition *
              </label>
              <select
                value={dischargeDisposition}
                onChange={(e) => setDischargeDisposition(e.target.value as DischargeDisposition)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                }}
              >
                <option value="discharged_to_self_management">Discharged to Self-Management</option>
                <option value="discharged_with_home_program">Discharged with Home Exercise Program</option>
                <option value="follow_up_with_referrer">Follow-up with Referring Physician</option>
                <option value="transferred_to_other_provider">Transferred to Other Provider</option>
                <option value="continued_care_elsewhere">Continued Care Elsewhere</option>
                <option value="other">Other Disposition</option>
              </select>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '24px 0' }} />

          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>
            3. Clinical Synthesis & Functional Documentation
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Clinical Summary */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Clinical Summary * (Executive overview of course of treatment)
              </label>
              <textarea
                rows={4}
                value={clinicalSummary}
                onChange={(e) => setClinicalSummary(e.target.value)}
                placeholder="Comprehensive summary of clinical findings, key milestones, response to treatment, and condition upon discharge..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Functional Status at Discharge */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Functional Status at Discharge * (ROM, strength, gait, ADLs, pain levels)
              </label>
              <textarea
                rows={3}
                value={functionalStatusAtDischarge}
                onChange={(e) => setFunctionalStatusAtDischarge(e.target.value)}
                placeholder="Document functional capabilities at discharge compared to baseline..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Goal Attainment Summary */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Goal Attainment Summary * (Status of all treatment goals)
              </label>
              <textarea
                rows={3}
                value={goalAttainmentSummary}
                onChange={(e) => setGoalAttainmentSummary(e.target.value)}
                placeholder="Specific evaluation of each therapeutic goal set in the treatment plan..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Outcome Measure Summary */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Outcome Measure Reconciliation (Optional)
              </label>
              <textarea
                rows={2}
                value={outcomeMeasureSummary}
                onChange={(e) => setOutcomeMeasureSummary(e.target.value)}
                placeholder="Document initial vs final outcome measure scores (e.g. NPRS, ODI, LEFS, QuickDASH)..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Treatment Summary & HEP Transition */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Treatment Summary (Interventions provided)
                </label>
                <textarea
                  rows={2}
                  value={treatmentSummary}
                  onChange={(e) => setTreatmentSummary(e.target.value)}
                  placeholder="Summary of manual therapy, exercises, modalities provided..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  HEP Transition Plan (Ongoing home exercises)
                </label>
                <textarea
                  rows={2}
                  value={hepTransitionSummary}
                  onChange={(e) => setHepTransitionSummary(e.target.value)}
                  placeholder="Transition instructions for independent home program..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* Recommendations & Follow-up */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Recommendations (Activity modifications, ergonomics)
                </label>
                <textarea
                  rows={2}
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="Ergonomic advice, precautions, return to sports/work..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Follow-up Recommendations (Referrer / specialist)
                </label>
                <textarea
                  rows={2}
                  value={followUpRecommendations}
                  onChange={(e) => setFollowUpRecommendations(e.target.value)}
                  placeholder="Referral notes, follow-up timeline with GP..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '12px',
              marginTop: '28px',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '20px',
            }}
          >
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('draft')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              <Save size={16} />
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                if (validateForm()) {
                  setShowFinalizeModal(true);
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#059669',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <CheckCircle2 size={16} />
              Finalize & Complete Episode
            </button>
          </div>
        </div>
      )}

      {/* Finalize Confirmation Modal */}
      {showFinalizeModal && (
        <div
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
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={24} color="#059669" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Finalize Discharge Summary?
              </h3>
            </div>

            <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 10px 0' }}>
                Finalizing this Discharge Summary will execute an{' '}
                <strong style={{ color: '#0f172a' }}>atomic Episode of Care completion</strong>:
              </p>
              <ul style={{ margin: '0 0 10px 0', paddingLeft: '20px' }}>
                <li>
                  Parent <strong>Episode of Care</strong> status will automatically transition to{' '}
                  <span style={{ color: '#166534', fontWeight: '600' }}>'completed'</span>.
                </li>
                <li>
                  Discharge Summary will become an <strong>immutable legal medical record</strong>. Any future edits will require a formal clinical amendment.
                </li>
                <li>
                  Hard deletes will be permanently denied by database triggers.
                </li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={isSubmitting}
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
                disabled={isSubmitting}
                onClick={() => handleSubmit('finalized')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? 'Finalizing...' : 'Yes, Finalize & Close Episode'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
