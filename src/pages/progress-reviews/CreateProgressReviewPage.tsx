import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ClipboardCheck, ArrowLeft, AlertCircle, Save, CheckCircle2, Target } from 'lucide-react';
import { progressReviewService, ProgressReviewGoalInput } from '../../services/progressReviewService';
import { patientService } from '../../services/patientService';
import { useFormDraft } from '../../hooks/useFormDraft';
import { DraftBanner } from '../../components/ui/DraftBanner';
import type {
  Patient,
  EpisodeOfCare,
  ClinicalVisit,
  TreatmentPlanWithRelations,
  OutcomeMeasureAssessmentWithRelations,
  Profile,
  OverallProgressRating,
  ProgressReviewPlanRecommendation,
  GoalProgressStatus,
} from '../../types/models';

interface ProgressReviewDraftData {
  selectedPatientId: string;
  selectedEpisodeId: string;
  selectedPlanId: string;
  selectedVisitId: string;
  selectedClinicianId: string;
  reviewDate: string;
  periodStartDate: string;
  periodEndDate: string;
  nextReviewDueDate: string;
  overallProgressAssessment: OverallProgressRating;
  planRecommendation: ProgressReviewPlanRecommendation;
  clinicalSummary: string;
  barriersIdentified: string;
  treatmentModifications: string;
  goalEvaluations: ProgressReviewGoalInput[];
}

export const CreateProgressReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const preselectedPatientId = searchParams.get('patientId') || '';
  const preselectedEpisodeId = searchParams.get('episodeId') || '';
  const preselectedPlanId = searchParams.get('treatmentPlanId') || '';
  const preselectedVisitId = searchParams.get('visitId') || '';

  // Form draft preservation across navigation, modal flows, and reloads
  const {
    data: draftData,
    updateField,
    isDirty,
    isRestored,
    restoredAt,
    saveStatus,
    discardDraft,
    markSaved,
  } = useFormDraft<ProgressReviewDraftData>({
    formId: `create_progress_review_${preselectedPatientId || 'default'}_${preselectedEpisodeId || 'default'}`,
    initialData: {
      selectedPatientId: preselectedPatientId,
      selectedEpisodeId: preselectedEpisodeId,
      selectedPlanId: preselectedPlanId,
      selectedVisitId: preselectedVisitId,
      selectedClinicianId: '',
      reviewDate: new Date().toISOString().split('T')[0],
      periodStartDate: '',
      periodEndDate: '',
      nextReviewDueDate: '',
      overallProgressAssessment: 'progressing',
      planRecommendation: 'continue_current_plan',
      clinicalSummary: '',
      barriersIdentified: '',
      treatmentModifications: '',
      goalEvaluations: [],
    },
  });

  // Data sources
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinicians, setClinicians] = useState<Profile[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeOfCare[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlanWithRelations[]>([]);
  const [visits, setVisits] = useState<ClinicalVisit[]>([]);
  const [outcomeAssessments, setOutcomeAssessments] = useState<OutcomeMeasureAssessmentWithRelations[]>([]);

  // Loading states
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields bound to draftData
  const selectedPatientId = draftData.selectedPatientId;
  const setSelectedPatientId = (val: string) => updateField('selectedPatientId', val);
  const selectedEpisodeId = draftData.selectedEpisodeId;
  const setSelectedEpisodeId = (val: string) => updateField('selectedEpisodeId', val);
  const selectedPlanId = draftData.selectedPlanId;
  const setSelectedPlanId = (val: string) => updateField('selectedPlanId', val);
  const selectedVisitId = draftData.selectedVisitId;
  const setSelectedVisitId = (val: string) => updateField('selectedVisitId', val);
  const selectedClinicianId = draftData.selectedClinicianId;
  const setSelectedClinicianId = (val: string) => updateField('selectedClinicianId', val);

  const reviewDate = draftData.reviewDate;
  const setReviewDate = (val: string) => updateField('reviewDate', val);
  const periodStartDate = draftData.periodStartDate;
  const setPeriodStartDate = (val: string) => updateField('periodStartDate', val);
  const periodEndDate = draftData.periodEndDate;
  const setPeriodEndDate = (val: string) => updateField('periodEndDate', val);
  const nextReviewDueDate = draftData.nextReviewDueDate;
  const setNextReviewDueDate = (val: string) => updateField('nextReviewDueDate', val);

  const overallProgressAssessment = draftData.overallProgressAssessment;
  const setOverallProgressAssessment = (val: OverallProgressRating) =>
    updateField('overallProgressAssessment', val);
  const planRecommendation = draftData.planRecommendation;
  const setPlanRecommendation = (val: ProgressReviewPlanRecommendation) =>
    updateField('planRecommendation', val);

  const clinicalSummary = draftData.clinicalSummary;
  const setClinicalSummary = (val: string) => updateField('clinicalSummary', val);
  const barriersIdentified = draftData.barriersIdentified;
  const setBarriersIdentified = (val: string) => updateField('barriersIdentified', val);
  const treatmentModifications = draftData.treatmentModifications;
  const setTreatmentModifications = (val: string) => updateField('treatmentModifications', val);

  // Structured Goal Progress Evaluations
  const goalEvaluations = draftData.goalEvaluations;
  const setGoalEvaluations = (
    updater: ProgressReviewGoalInput[] | ((prev: ProgressReviewGoalInput[]) => ProgressReviewGoalInput[])
  ) => {
    if (typeof updater === 'function') {
      updateField('goalEvaluations', updater(draftData.goalEvaluations));
    } else {
      updateField('goalEvaluations', updater);
    }
  };

  // Initial load: patients & clinicians
  useEffect(() => {
    const fetchInitial = async () => {
      setIsLoadingPatients(true);
      setError(null);
      try {
        const [patientsRes, cliniciansRes] = await Promise.all([
          patientService.getPatients({ limit: 100 }),
          progressReviewService.getClinicians(),
        ]);
        setPatients(patientsRes.patients);
        setClinicians(cliniciansRes);
        if (cliniciansRes.length > 0) {
          setSelectedClinicianId(cliniciansRes[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load initial form data.');
      } finally {
        setIsLoadingPatients(false);
      }
    };
    fetchInitial();
  }, []);

  // When patient changes, load episodes, treatment plans, visits, and outcome assessments
  useEffect(() => {
    if (!selectedPatientId) {
      setEpisodes([]);
      setTreatmentPlans([]);
      setVisits([]);
      setOutcomeAssessments([]);
      setSelectedEpisodeId('');
      setSelectedPlanId('');
      setSelectedVisitId('');
      setGoalEvaluations([]);
      return;
    }

    const loadPatientContext = async () => {
      setIsLoadingDetails(true);
      setError(null);
      try {
        const [epRes, tpRes, visRes, oaRes] = await Promise.all([
          progressReviewService.getEpisodesForPatient(selectedPatientId),
          progressReviewService.getTreatmentPlansForPatient(selectedPatientId),
          progressReviewService.getVisitsForPatient(selectedPatientId),
          progressReviewService.getOutcomeAssessmentsForPatient(selectedPatientId),
        ]);

        setEpisodes(epRes);
        setTreatmentPlans(tpRes);
        setVisits(visRes);
        setOutcomeAssessments(oaRes);

        // Preselect episode if matched, or keep restored selection, or default to first
        if (selectedEpisodeId && epRes.some((e) => e.id === selectedEpisodeId)) {
          // Keep current restored selection
        } else if (preselectedEpisodeId && epRes.some((e) => e.id === preselectedEpisodeId)) {
          setSelectedEpisodeId(preselectedEpisodeId);
        } else if (epRes.length > 0) {
          setSelectedEpisodeId(epRes[0].id);
        } else {
          setSelectedEpisodeId('');
        }

        // Preselect treatment plan if matched, or keep restored selection, or default to first
        if (selectedPlanId && tpRes.some((p) => p.id === selectedPlanId)) {
          // Keep current restored selection
        } else if (preselectedPlanId && tpRes.some((p) => p.id === preselectedPlanId)) {
          setSelectedPlanId(preselectedPlanId);
        } else if (tpRes.length > 0) {
          setSelectedPlanId(tpRes[0].id);
        } else {
          setSelectedPlanId('');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load patient records.');
      } finally {
        setIsLoadingDetails(false);
      }
    };

    loadPatientContext();
  }, [selectedPatientId]);

  // When selected treatment plan changes, populate goal evaluations from existing goals
  useEffect(() => {
    if (!selectedPlanId) {
      setGoalEvaluations([]);
      return;
    }

    const plan = treatmentPlans.find((p) => p.id === selectedPlanId);
    if (plan && plan.goals && plan.goals.length > 0) {
      // If goal evaluations are already loaded/restored for this plan, keep them
      const alreadyHasGoals =
        goalEvaluations.length > 0 &&
        goalEvaluations.some((g) => plan.goals?.some((pg) => pg.id === g.treatment_plan_goal_id));
      if (!alreadyHasGoals) {
        const initialEvaluations: ProgressReviewGoalInput[] = plan.goals.map((g) => ({
          treatment_plan_goal_id: g.id,
          status_at_review: 'in_progress',
          current_value: '',
          measurement_method: g.measurement_method || '',
          clinician_assessment: '',
          progress_notes: '',
          linked_outcome_assessment_id: null,
        }));
        setGoalEvaluations(initialEvaluations);
      }
    } else {
      setGoalEvaluations([]);
    }
  }, [selectedPlanId, treatmentPlans]);

  const handleGoalFieldChange = (index: number, field: keyof ProgressReviewGoalInput, value: any) => {
    setGoalEvaluations((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (finalizeImmediately: boolean = false) => {
    if (!selectedPatientId) {
      setError('Please select a patient.');
      return;
    }
    if (!selectedEpisodeId) {
      setError('Please select an episode of care.');
      return;
    }
    if (!selectedPlanId) {
      setError('Please select an active Treatment Plan to review.');
      return;
    }
    if (!selectedClinicianId) {
      setError('Please assign a reviewing clinician.');
      return;
    }
    if (!clinicalSummary.trim()) {
      setError('Clinical Summary is mandatory for progress reviews.');
      return;
    }

    // Verify all evaluated goals have clinician assessment
    for (let i = 0; i < goalEvaluations.length; i++) {
      if (!goalEvaluations[i].clinician_assessment.trim()) {
        setError(`Please provide a clinician assessment for goal #${i + 1}.`);
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const createdReview = await progressReviewService.createReview({
        patient_id: selectedPatientId,
        episode_id: selectedEpisodeId,
        treatment_plan_id: selectedPlanId,
        originating_clinical_visit_id: selectedVisitId || null,
        reviewing_clinician_id: selectedClinicianId,
        review_date: reviewDate,
        period_start_date: periodStartDate || null,
        period_end_date: periodEndDate || null,
        overall_progress_assessment: overallProgressAssessment,
        clinical_summary: clinicalSummary.trim(),
        barriers_identified: barriersIdentified.trim() || null,
        treatment_modifications: treatmentModifications.trim() || null,
        plan_recommendation: planRecommendation,
        next_review_due_date: nextReviewDueDate || null,
        goals: goalEvaluations,
      });

      if (finalizeImmediately) {
        await progressReviewService.finalizeReview(createdReview.id);
      }

      markSaved();
      navigate(`/app/progress-reviews/${createdReview.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save progress review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPlan = treatmentPlans.find((p) => p.id === selectedPlanId);

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Back button & Page title */}
      <div style={{ marginBottom: '20px' }}>
        <Link
          to="/app/progress-reviews"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#0284c7',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: '500',
            marginBottom: '12px',
          }}
        >
          <ArrowLeft size={16} /> Back to Progress Reviews
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
            }}
          >
            <ClipboardCheck size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              New Progress Review
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
              Evaluate longitudinal progress, milestone achievement, and goal attainment
            </p>
          </div>
        </div>
      </div>

      {/* Draft Restoration & Status Banner */}
      <DraftBanner
        isRestored={isRestored}
        restoredAt={restoredAt}
        isDirty={isDirty}
        saveStatus={saveStatus}
        onDiscard={discardDraft}
        entityName="progress review"
      />

      {/* Error Alert */}
      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Patient & Relationship Context Section */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 16px 0' }}>
          1. Patient, Episode & Treatment Plan Context
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {/* Patient Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Patient *
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              disabled={isLoadingPatients || Boolean(preselectedPatientId)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: preselectedPatientId ? '#f8fafc' : '#ffffff',
              }}
            >
              <option value="">Select a patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.patient_identifier})
                </option>
              ))}
            </select>
          </div>

          {/* Episode of Care Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Episode of Care *
            </label>
            <select
              value={selectedEpisodeId}
              onChange={(e) => setSelectedEpisodeId(e.target.value)}
              disabled={!selectedPatientId || isLoadingDetails}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            >
              <option value="">Select an episode...</option>
              {episodes.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.title} ({ep.episode_identifier}) - {ep.status}
                </option>
              ))}
            </select>
          </div>

          {/* Treatment Plan Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Treatment Plan to Review *
            </label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              disabled={!selectedPatientId || isLoadingDetails}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            >
              <option value="">Select treatment plan...</option>
              {treatmentPlans.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.title} ({tp.plan_identifier}) - {tp.status}
                </option>
              ))}
            </select>
          </div>

          {/* Originating Clinical Visit Selector (Optional) */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Originating Encounter / Visit (Optional)
            </label>
            <select
              value={selectedVisitId}
              onChange={(e) => setSelectedVisitId(e.target.value)}
              disabled={!selectedPatientId || isLoadingDetails}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            >
              <option value="">None (Independent Review)</option>
              {visits.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.visit_identifier} - {new Date(v.actual_start || v.created_at).toLocaleDateString()} ({v.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Review Parameters & Clinician */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 16px 0' }}>
          2. Review Dates & Clinician
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Review Date */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Review Date *
            </label>
            <input
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Period Start */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Period Start Date
            </label>
            <input
              type="date"
              value={periodStartDate}
              onChange={(e) => setPeriodStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Period End */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Period End Date
            </label>
            <input
              type="date"
              value={periodEndDate}
              onChange={(e) => setPeriodEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Reviewing Clinician */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Reviewing Clinician *
            </label>
            <select
              value={selectedClinicianId}
              onChange={(e) => setSelectedClinicianId(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            >
              {clinicians.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name || `${c.first_name || ''} ${c.last_name || ''}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Structured Goal-by-Goal Progress Review Section */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>
              3. Treatment Plan Goals Progress Evaluation
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
              Evaluate each objective goal from the selected Treatment Plan without modifying the baseline definition
            </p>
          </div>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            {goalEvaluations.length} Goals
          </span>
        </div>

        {goalEvaluations.length === 0 ? (
          <div
            style={{
              padding: '30px 20px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '8px',
              color: '#64748b',
              fontSize: '13px',
            }}
          >
            <Target size={28} style={{ color: '#94a3b8', margin: '0 auto 8px auto' }} />
            <p style={{ margin: 0 }}>
              {selectedPlanId
                ? 'The selected Treatment Plan does not contain any defined clinical goals.'
                : 'Select a Treatment Plan above to load its clinical goals for evaluation.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {goalEvaluations.map((evalItem, index) => {
              const originalGoal = selectedPlan?.goals?.find(
                (g) => g.id === evalItem.treatment_plan_goal_id
              );

              return (
                <div
                  key={evalItem.treatment_plan_goal_id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    backgroundColor: '#fafbfc',
                  }}
                >
                  {/* Goal Definition Summary Header */}
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>
                        Goal #{index + 1}: {originalGoal?.goal_statement || 'Goal'}
                      </div>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: '#e2e8f0',
                          color: '#334155',
                          textTransform: 'capitalize',
                        }}
                      >
                        {originalGoal?.category?.replace('_', ' ') || 'General'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', marginTop: '6px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
                      {originalGoal?.baseline_description && (
                        <div>
                          <strong>Baseline:</strong> {originalGoal.baseline_description}
                        </div>
                      )}
                      {originalGoal?.target_description && (
                        <div>
                          <strong>Target:</strong> {originalGoal.target_description}
                        </div>
                      )}
                      {originalGoal?.measurement_method && (
                        <div>
                          <strong>Method:</strong> {originalGoal.measurement_method}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clinician Review Inputs */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                    {/* Status at Review */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                        Status at Review *
                      </label>
                      <select
                        value={evalItem.status_at_review}
                        onChange={(e) =>
                          handleGoalFieldChange(index, 'status_at_review', e.target.value as GoalProgressStatus)
                        }
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="in_progress">In Progress</option>
                        <option value="achieved">Achieved</option>
                        <option value="partially_achieved">Partially Achieved</option>
                        <option value="not_achieved">Not Achieved</option>
                        <option value="regressed">Regressed</option>
                        <option value="discontinued">Discontinued</option>
                      </select>
                    </div>

                    {/* Current Measured Value */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                        Current Measured Value
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 110 deg flexion, 4/5 MMT, VAS 2/10"
                        value={evalItem.current_value || ''}
                        onChange={(e) => handleGoalFieldChange(index, 'current_value', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          backgroundColor: '#ffffff',
                        }}
                      />
                    </div>

                    {/* Measurement Method */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                        Measurement Method
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Goniometer, Dynamometer, Visual Analog Scale"
                        value={evalItem.measurement_method || ''}
                        onChange={(e) => handleGoalFieldChange(index, 'measurement_method', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          backgroundColor: '#ffffff',
                        }}
                      />
                    </div>

                    {/* Linked Outcome Assessment */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                        Link Outcome Assessment (Optional)
                      </label>
                      <select
                        value={evalItem.linked_outcome_assessment_id || ''}
                        onChange={(e) =>
                          handleGoalFieldChange(index, 'linked_outcome_assessment_id', e.target.value || null)
                        }
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="">None</option>
                        {outcomeAssessments.map((oa) => (
                          <option key={oa.id} value={oa.id}>
                            {oa.definition?.name || 'Assessment'} (Score: {oa.numeric_score || 'N/A'}) -{' '}
                            {new Date(oa.performed_at).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Clinician Assessment (Mandatory) */}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      Clinician Assessment *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Demonstrated 20 deg improvement in knee flexion since baseline; tolerating loading well."
                      value={evalItem.clinician_assessment}
                      onChange={(e) => handleGoalFieldChange(index, 'clinician_assessment', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        backgroundColor: '#ffffff',
                      }}
                    />
                  </div>

                  {/* Progress Notes */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>
                      Progress Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Additional qualitative observations or patient comments..."
                      value={evalItem.progress_notes || ''}
                      onChange={(e) => handleGoalFieldChange(index, 'progress_notes', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        backgroundColor: '#ffffff',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clinical Findings, Recommendations & Overall Assessment */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 16px 0' }}>
          4. Overall Clinical Assessment & Plan Recommendations
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {/* Overall Progress Assessment */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Overall Progress Assessment *
            </label>
            <select
              value={overallProgressAssessment}
              onChange={(e) => setOverallProgressAssessment(e.target.value as OverallProgressRating)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            >
              <option value="significant_improvement">Significant Improvement</option>
              <option value="progressing">Progressing as Expected</option>
              <option value="slow_progress">Slow Progress</option>
              <option value="plateaued">Plateaued</option>
              <option value="regressed">Regressed</option>
              <option value="goals_met">All Primary Goals Met</option>
            </select>
          </div>

          {/* Plan Recommendation */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Plan Recommendation *
            </label>
            <select
              value={planRecommendation}
              onChange={(e) => setPlanRecommendation(e.target.value as ProgressReviewPlanRecommendation)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            >
              <option value="continue_current_plan">Continue Current Plan</option>
              <option value="modify_goals">Modify Goals / Timelines</option>
              <option value="advance_interventions">Advance Therapeutic Interventions</option>
              <option value="reduce_frequency">Reduce Frequency / Transition to Maintenance</option>
              <option value="prepare_discharge">Prepare for Formal Discharge</option>
            </select>
          </div>

          {/* Next Review Due Date */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Next Review Due Date
            </label>
            <input
              type="date"
              value={nextReviewDueDate}
              onChange={(e) => setNextReviewDueDate(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            />
          </div>
        </div>

        {/* Clinical Summary */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
            Clinical Summary *
          </label>
          <textarea
            rows={4}
            placeholder="Synthesize functional recovery, patient trajectory, objective measures, and clinical response..."
            value={clinicalSummary}
            onChange={(e) => setClinicalSummary(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
            }}
          />
        </div>

        {/* Barriers Identified */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
            Barriers Identified (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Identify factors impeding progress (e.g. pain flares, adherence, biomechanics, psychosocial)..."
            value={barriersIdentified}
            onChange={(e) => setBarriersIdentified(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
            }}
          />
        </div>

        {/* Treatment Modifications */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
            Treatment Modifications & Strategy Updates (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Adjustments to frequency, therapeutic exercises, manual therapy, or modalities..."
            value={treatmentModifications}
            onChange={(e) => setTreatmentModifications(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
            }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 0',
        }}
      >
        <Link
          to="/app/progress-reviews"
          style={{
            padding: '10px 18px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#475569',
            fontSize: '14px',
            fontWeight: '600',
            textDecoration: 'none',
          }}
        >
          Cancel
        </Link>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit(false)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#f8fafc',
            color: '#334155',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          <Save size={16} /> Save as Draft
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#059669',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <CheckCircle2 size={16} /> Save & Finalize Review
        </button>
      </div>
    </div>
  );
};
export default CreateProgressReviewPage;
