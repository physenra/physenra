import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Target, Plus, Trash2, ArrowLeft, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { treatmentPlanService, CreateGoalInput } from '../../services/treatmentPlanService';
import { patientService } from '../../services/patientService';
import { appointmentService } from '../../services/appointmentService';
import type {
  Patient,
  EpisodeOfCare,
  ClinicalVisit,
  OutcomeMeasureAssessmentWithRelations,
  TreatmentGoalCategory,
  TreatmentGoalPriority,
} from '../../types/models';

interface GoalDraftItem extends CreateGoalInput {
  tempId: string;
}

export const CreateTreatmentPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialPatientId = searchParams.get('patientId') || '';
  const initialEpisodeId = searchParams.get('episodeId') || '';
  const initialVisitId = searchParams.get('visitId') || '';

  // Reference Data
  const [patients, setPatients] = useState<Patient[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeOfCare[]>([]);
  const [visits, setVisits] = useState<ClinicalVisit[]>([]);
  const [clinicians, setClinicians] = useState<Array<{ id: string; name: string }>>([]);
  const [outcomeAssessments, setOutcomeAssessments] = useState<OutcomeMeasureAssessmentWithRelations[]>([]);

  // Selected Entities
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(initialEpisodeId);
  const [selectedVisitId, setSelectedVisitId] = useState(initialVisitId);
  const [selectedClinicianId, setSelectedClinicianId] = useState('');

  // Plan Details
  const [title, setTitle] = useState('');
  const [diagnosisSummary, setDiagnosisSummary] = useState('');
  const [clinicalRationale, setClinicalRationale] = useState('');
  const [overallGoalsSummary, setOverallGoalsSummary] = useState('');
  const [treatmentFrequency, setTreatmentFrequency] = useState('');
  const [expectedDurationWeeks, setExpectedDurationWeeks] = useState<number | ''>('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetReviewDate, setTargetReviewDate] = useState('');

  // Structured Goals
  const [goals, setGoals] = useState<GoalDraftItem[]>([
    {
      tempId: 'default-1',
      order_index: 1,
      goal_statement: '',
      category: 'functional',
      priority: 'high',
      baseline_description: '',
      target_description: '',
      measurement_method: '',
      target_timeframe_weeks: 4,
      notes: '',
    },
  ]);

  // Loading & Submission State
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);

  // Initial Data Load
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [patientsRes, clinicianList] = await Promise.all([
          patientService.getPatients({ limit: 100 }),
          appointmentService.getClinicians(),
        ]);

        setPatients(patientsRes.patients);

        const clinicianOptions = clinicianList.map((c) => ({
          id: c.userId,
          name: c.name,
        }));
        setClinicians(clinicianOptions);

        // Default to current user
        const { data: authData } = await supabase.auth.getUser();
        const currentUserId = authData.user?.id;
        if (currentUserId && clinicianOptions.some((c) => c.id === currentUserId)) {
          setSelectedClinicianId(currentUserId);
        } else if (clinicianOptions.length > 0) {
          setSelectedClinicianId(clinicianOptions[0].id);
        }

        // Load patient specific data if provided
        if (initialPatientId) {
          const [epList, visitList, oaList] = await Promise.all([
            treatmentPlanService.getEpisodesForPatient(initialPatientId),
            treatmentPlanService.getVisitsForPatient(initialPatientId),
            treatmentPlanService.getOutcomeAssessmentsForPatient(initialPatientId),
          ]);
          setEpisodes(epList);
          setVisits(visitList);
          setOutcomeAssessments(oaList);

          if (initialEpisodeId && epList.some((e) => e.id === initialEpisodeId)) {
            setSelectedEpisodeId(initialEpisodeId);
          } else if (epList.length > 0) {
            setSelectedEpisodeId(epList[0].id);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize treatment plan form.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // When patient selection changes, refresh episodes, visits, and outcome assessments
  const handlePatientChange = async (patientId: string) => {
    setSelectedPatientId(patientId);
    setSelectedEpisodeId('');
    setSelectedVisitId('');
    setEpisodes([]);
    setVisits([]);
    setOutcomeAssessments([]);

    if (!patientId) return;

    try {
      const [epList, visitList, oaList] = await Promise.all([
        treatmentPlanService.getEpisodesForPatient(patientId),
        treatmentPlanService.getVisitsForPatient(patientId),
        treatmentPlanService.getOutcomeAssessmentsForPatient(patientId),
      ]);
      setEpisodes(epList);
      setVisits(visitList);
      setOutcomeAssessments(oaList);

      if (epList.length > 0) {
        setSelectedEpisodeId(epList[0].id);
      }
    } catch (err: any) {
      setError(`Failed to load patient records: ${err.message}`);
    }
  };

  // Add a new blank goal
  const handleAddGoal = () => {
    const nextIndex = goals.length + 1;
    setGoals((prev) => [
      ...prev,
      {
        tempId: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        order_index: nextIndex,
        goal_statement: '',
        category: 'functional',
        priority: 'medium',
        baseline_description: '',
        target_description: '',
        measurement_method: '',
        target_timeframe_weeks: 6,
        notes: '',
      },
    ]);
  };

  // Remove goal
  const handleRemoveGoal = (tempId: string) => {
    if (goals.length <= 1) {
      alert('A Treatment Plan must have at least one structured goal.');
      return;
    }
    setGoals((prev) => prev.filter((g) => g.tempId !== tempId).map((g, idx) => ({ ...g, order_index: idx + 1 })));
  };

  // Update specific goal field
  const handleGoalChange = (tempId: string, field: keyof GoalDraftItem, value: any) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.tempId === tempId) {
          return { ...g, [field]: value };
        }
        return g;
      })
    );
  };

  // Validation
  const validateForm = () => {
    if (!selectedPatientId) {
      setError('Please select a patient.');
      return false;
    }
    if (!selectedEpisodeId) {
      setError('Please select an active Episode of Care.');
      return false;
    }
    if (!selectedClinicianId) {
      setError('Please assign a responsible prescribing clinician.');
      return false;
    }
    if (!title.trim()) {
      setError('Please provide a descriptive title for the Treatment Plan.');
      return false;
    }
    if (!startDate) {
      setError('Please specify a plan start date.');
      return false;
    }
    if (targetReviewDate && targetReviewDate < startDate) {
      setError('Target review date cannot precede the start date.');
      return false;
    }

    // Validate goals
    for (let i = 0; i < goals.length; i++) {
      const g = goals[i];
      if (!g.goal_statement.trim()) {
        setError(`Goal #${i + 1} must include a clear, measurable goal statement.`);
        return false;
      }
    }

    return true;
  };

  // Submit Plan
  const handleSubmit = async (targetStatus: 'draft' | 'active') => {
    setError(null);
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const formattedGoals: CreateGoalInput[] = goals.map((g, idx) => ({
        order_index: idx + 1,
        goal_statement: g.goal_statement.trim(),
        category: g.category || 'functional',
        priority: g.priority || 'medium',
        baseline_description: g.baseline_description?.trim() || null,
        target_description: g.target_description?.trim() || null,
        measurement_method: g.measurement_method?.trim() || null,
        target_timeframe_weeks: g.target_timeframe_weeks ? Number(g.target_timeframe_weeks) : null,
        baseline_outcome_assessment_id: g.baseline_outcome_assessment_id || null,
        target_outcome_assessment_id: g.target_outcome_assessment_id || null,
        notes: g.notes?.trim() || null,
      }));

      const plan = await treatmentPlanService.createPlan({
        patient_id: selectedPatientId,
        episode_id: selectedEpisodeId,
        originating_clinical_visit_id: selectedVisitId || null,
        prescribing_clinician_id: selectedClinicianId,
        title: title.trim(),
        diagnosis_summary: diagnosisSummary.trim() || null,
        clinical_rationale: clinicalRationale.trim() || null,
        overall_goals_summary: overallGoalsSummary.trim() || null,
        treatment_frequency: treatmentFrequency.trim() || null,
        expected_duration_weeks: expectedDurationWeeks ? Number(expectedDurationWeeks) : null,
        start_date: startDate,
        target_review_date: targetReviewDate || null,
        status: targetStatus,
        goals: formattedGoals,
      });

      navigate(`/app/treatment-plans/${plan.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create treatment plan.');
      setIsSubmitting(false);
      setShowActivateConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Loading patient and clinical data...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1080px', margin: '0 auto' }}>
      {/* Back Link */}
      <div style={{ marginBottom: '1rem' }}>
        <Link
          to="/app/treatment-plans"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            color: '#64748b',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} />
          Back to Treatment Plans
        </Link>
      </div>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '8px',
            backgroundColor: '#ecfdf5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#059669',
          }}
        >
          <Target size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            New Treatment Plan
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Author a clinical treatment plan with measurable goals and rehabilitation trajectory.
          </p>
        </div>
      </div>

      {/* Clinical Architecture Notice */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '0.875rem 1rem',
          marginBottom: '1.5rem',
          fontSize: '0.8125rem',
          color: '#475569',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
        }}
      >
        <Info size={18} style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Clinical Governance Invariant:</strong> Treatment Plans represent strategic rehabilitation roadmaps and discrete goals. Once activated, the baseline roadmap and goals are locked into the legal medical record. Zero hard deletes permitted.
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: '6px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Section 1: Patient Context & Clinician Assignment */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: '0 0 1rem 0' }}>
            1. Patient & Case Context
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {/* Patient Select */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Patient <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => handlePatientChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="">Select Patient...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.last_name}, {p.first_name} ({p.patient_identifier})
                  </option>
                ))}
              </select>
            </div>

            {/* Episode of Care Select */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Episode of Care <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={selectedEpisodeId}
                onChange={(e) => setSelectedEpisodeId(e.target.value)}
                disabled={!selectedPatientId || episodes.length === 0}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: !selectedPatientId || episodes.length === 0 ? '#f8fafc' : '#ffffff',
                }}
              >
                <option value="">
                  {selectedPatientId
                    ? episodes.length === 0
                      ? 'No active episodes found'
                      : 'Select Episode...'
                    : 'Select Patient first...'}
                </option>
                {episodes.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.title} ({ep.episode_identifier}) - {ep.status}
                  </option>
                ))}
              </select>
            </div>

            {/* Originating Clinical Visit (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Originating Encounter (Optional)
              </label>
              <select
                value={selectedVisitId}
                onChange={(e) => setSelectedVisitId(e.target.value)}
                disabled={!selectedPatientId}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: !selectedPatientId ? '#f8fafc' : '#ffffff',
                }}
              >
                <option value="">None (Stand-alone or initial triage plan)</option>
                {visits.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.visit_identifier} - {new Date(v.actual_start || v.created_at).toLocaleDateString()} ({v.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Prescribing Clinician */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Prescribing Clinician <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={selectedClinicianId}
                onChange={(e) => setSelectedClinicianId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="">Select Clinician...</option>
                {clinicians.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Plan Parameters & Strategy */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: '0 0 1rem 0' }}>
            2. Strategic Rehabilitation Pathway
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {/* Title */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Plan Title <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Post-Op ACL Reconstruction Protocol - Phase 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                }}
              />
            </div>

            {/* Diagnosis Summary & Clinical Rationale */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Diagnosis / Problem Summary
                </label>
                <textarea
                  rows={3}
                  placeholder="Primary diagnosis, biomechanical deficits, tissue irritability level..."
                  value={diagnosisSummary}
                  onChange={(e) => setDiagnosisSummary(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Clinical Rationale & Modalities
                </label>
                <textarea
                  rows={3}
                  placeholder="Therapeutic reasoning, manual techniques, progressive loading strategy..."
                  value={clinicalRationale}
                  onChange={(e) => setClinicalRationale(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            {/* Overall Goals Summary */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Overall Clinical Goals Summary
              </label>
              <textarea
                rows={2}
                placeholder="High-level target functional state expected by the end of this plan..."
                value={overallGoalsSummary}
                onChange={(e) => setOverallGoalsSummary(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Cadence & Timelines */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Treatment Frequency
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2x weekly for 6 weeks"
                  value={treatmentFrequency}
                  onChange={(e) => setTreatmentFrequency(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Expected Duration (Weeks)
                </label>
                <input
                  type="number"
                  min="1"
                  max="104"
                  placeholder="e.g. 12"
                  value={expectedDurationWeeks}
                  onChange={(e) => setExpectedDurationWeeks(e.target.value ? parseInt(e.target.value, 10) : '')}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Start Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Target Review Date
                </label>
                <input
                  type="date"
                  min={startDate}
                  value={targetReviewDate}
                  onChange={(e) => setTargetReviewDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Structured Clinical Goals */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                3. Discrete Clinical Goals
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.8125rem' }}>
                Specific, quantifiable milestones with baseline and target outcome thresholds.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddGoal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                backgroundColor: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                padding: '0.4rem 0.875rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              Add Clinical Goal
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {goals.map((g, index) => (
              <div
                key={g.tempId}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.875rem',
                    paddingBottom: '0.5rem',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>
                    Goal #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveGoal(g.tempId)}
                    disabled={goals.length <= 1}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: goals.length <= 1 ? '#cbd5e1' : '#ef4444',
                      cursor: goals.length <= 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <Trash2 size={15} />
                    Remove
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.875rem' }}>
                  {/* Goal Statement */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      Goal Statement <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Restore active knee flexion to ≥ 120° for normal stair descent"
                      value={g.goal_statement}
                      onChange={(e) => handleGoalChange(g.tempId, 'goal_statement', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.875rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                      }}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      Category
                    </label>
                    <select
                      value={g.category}
                      onChange={(e) => handleGoalChange(g.tempId, 'category', e.target.value as TreatmentGoalCategory)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.875rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <option value="range_of_motion">Range of Motion</option>
                      <option value="strength">Strength</option>
                      <option value="pain_reduction">Pain Reduction</option>
                      <option value="functional">Functional</option>
                      <option value="balance">Balance</option>
                      <option value="mobility">Mobility</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      Priority
                    </label>
                    <select
                      value={g.priority}
                      onChange={(e) => handleGoalChange(g.tempId, 'priority', e.target.value as TreatmentGoalPriority)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.875rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  {/* Target Timeframe */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      Timeframe (Weeks)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="104"
                      value={g.target_timeframe_weeks || ''}
                      onChange={(e) => handleGoalChange(g.tempId, 'target_timeframe_weeks', e.target.value ? parseInt(e.target.value, 10) : null)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.875rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                      }}
                    />
                  </div>

                  {/* Measurement Method */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      Measurement Method
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Goniometer, LEFS score, 10m Walk Test"
                      value={g.measurement_method || ''}
                      onChange={(e) => handleGoalChange(g.tempId, 'measurement_method', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.875rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                      }}
                    />
                  </div>

                  {/* Baseline Description */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      Baseline Status
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Knee flexion limited to 85°"
                      value={g.baseline_description || ''}
                      onChange={(e) => handleGoalChange(g.tempId, 'baseline_description', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.875rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                      }}
                    />
                  </div>

                  {/* Target Description */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      Target Criterion
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Symmetrical ≥ 120° without pain"
                      value={g.target_description || ''}
                      onChange={(e) => handleGoalChange(g.tempId, 'target_description', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.875rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                      }}
                    />
                  </div>

                  {/* Outcome Assessment Link (Optional) */}
                  {outcomeAssessments.length > 0 && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                        Linked Baseline Outcome Assessment (Optional)
                      </label>
                      <select
                        value={g.baseline_outcome_assessment_id || ''}
                        onChange={(e) => handleGoalChange(g.tempId, 'baseline_outcome_assessment_id', e.target.value || null)}
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.65rem',
                          fontSize: '0.875rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="">None linked</option>
                        {outcomeAssessments.map((oa) => (
                          <option key={oa.id} value={oa.id}>
                            {oa.definition?.name || 'Assessment'} ({oa.assessment_identifier}) - Score: {oa.numeric_score ?? '—'} [{oa.status}]
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '1.25rem 1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <Link
            to="/app/treatment-plans"
            style={{
              padding: '0.625rem 1.25rem',
              color: '#475569',
              backgroundColor: '#f1f5f9',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Cancel
          </Link>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('draft')}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#334155',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                if (validateForm()) setShowActivateConfirm(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                backgroundColor: '#059669',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              <CheckCircle2 size={16} />
              Activate Plan
            </button>
          </div>
        </div>
      </div>

      {/* Activation Confirmation Modal */}
      {showActivateConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669',
                }}
              >
                <CheckCircle2 size={22} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
                Activate Treatment Plan?
              </h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Activating this Treatment Plan will officially establish the strategic rehabilitation protocol in the patient's medical record.
              All baseline goals will become active, and core identity parameters will become immutable.
            </p>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '0.75rem 1rem',
                fontSize: '0.8125rem',
                color: '#64748b',
                marginBottom: '1.5rem',
              }}
            >
              <strong>Zero Hard Deletes:</strong> Once activated, this plan can be paused, completed, or discontinued with clinical rationale, but cannot be erased.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowActivateConfirm(false)}
                disabled={isSubmitting}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#475569',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={() => handleSubmit('active')}
                disabled={isSubmitting}
                style={{
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  backgroundColor: '#059669',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? 'Activating...' : 'Confirm & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
