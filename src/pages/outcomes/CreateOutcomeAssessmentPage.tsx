import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { outcomeMeasureService } from '../../services/outcomeMeasureService';
import { patientService } from '../../services/patientService';
import { episodeService } from '../../services/episodeService';
import { clinicalVisitService } from '../../services/clinicalVisitService';
import type {
  OutcomeMeasureDefinition,
  OutcomeAssessmentType,
  Patient,
  EpisodeOfCare,
  ClinicalVisitWithRelations,
} from '../../types/models';

export const CreateOutcomeAssessmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialPatientId = searchParams.get('patientId') || '';
  const initialEpisodeId = searchParams.get('episodeId') || '';
  const initialVisitId = searchParams.get('visitId') || '';

  const [definitions, setDefinitions] = useState<OutcomeMeasureDefinition[]>([]);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState('');
  const [selectedDefinition, setSelectedDefinition] = useState<OutcomeMeasureDefinition | null>(null);

  // Entities
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);

  const [episodes, setEpisodes] = useState<EpisodeOfCare[]>([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(initialEpisodeId);

  const [visits, setVisits] = useState<ClinicalVisitWithRelations[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState(initialVisitId);

  // Form Fields
  const [assessmentType, setAssessmentType] = useState<OutcomeAssessmentType>('baseline');
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().slice(0, 16));
  const [numericScore, setNumericScore] = useState<string>('');
  const [percentageScore, setPercentageScore] = useState<string>('');
  const [scoreCategory, setScoreCategory] = useState('');
  const [scoreInterpretation, setScoreInterpretation] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Status & states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const [defs, patientRes] = await Promise.all([
          outcomeMeasureService.getDefinitions(),
          patientService.getPatients({ limit: 100 }),
        ]);

        setDefinitions(defs);
        if (defs.length > 0) {
          setSelectedDefinitionId(defs[0].id);
          setSelectedDefinition(defs[0]);
        }

        setPatients(patientRes.patients);

        // If patient provided, load their episodes & visits
        if (initialPatientId) {
          const [epRes, visitRes] = await Promise.all([
            episodeService.getEpisodes({ patientId: initialPatientId, limit: 50 }),
            clinicalVisitService.getClinicalVisits({ patientId: initialPatientId, limit: 50 }),
          ]);
          setEpisodes(epRes.episodes);
          setVisits(visitRes.visits);
        }
      } catch (err: any) {
        console.error('Failed to load initial form data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [initialPatientId]);

  // When patient selection changes, load their episodes and visits
  const handlePatientChange = async (patientId: string) => {
    setSelectedPatientId(patientId);
    setSelectedEpisodeId('');
    setSelectedVisitId('');
    if (!patientId) {
      setEpisodes([]);
      setVisits([]);
      return;
    }

    try {
      const [epRes, visitRes] = await Promise.all([
        episodeService.getEpisodes({ patientId, limit: 50 }),
        clinicalVisitService.getClinicalVisits({ patientId, limit: 50 }),
      ]);
      setEpisodes(epRes.episodes);
      setVisits(visitRes.visits);
    } catch (err) {
      console.warn('Error loading patient context:', err);
    }
  };

  // When definition selection changes
  const handleDefinitionChange = (definitionId: string) => {
    setSelectedDefinitionId(definitionId);
    const def = definitions.find((d) => d.id === definitionId) || null;
    setSelectedDefinition(def);
  };

  const handleSubmit = async (finalize: boolean = false) => {
    setError(null);
    if (!selectedPatientId) {
      setError('Please select a patient.');
      return;
    }

    if (!selectedDefinitionId) {
      setError('Please select an outcome measure instrument.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id;
      if (!currentUserId) {
        throw new Error('Authenticated user session required.');
      }

      const numVal = numericScore !== '' ? parseFloat(numericScore) : null;
      const pctVal = percentageScore !== '' ? parseFloat(percentageScore) : null;

      const created = await outcomeMeasureService.createAssessment({
        patient_id: selectedPatientId,
        episode_id: selectedEpisodeId || null,
        clinical_visit_id: selectedVisitId || null,
        measure_definition_id: selectedDefinitionId,
        assessor_id: currentUserId,
        assessment_type: assessmentType,
        status: finalize ? 'finalized' : 'draft',
        performed_at: performedAt ? new Date(performedAt).toISOString() : new Date().toISOString(),
        numeric_score: numVal,
        percentage_score: pctVal,
        score_category: scoreCategory.trim() || null,
        score_interpretation: scoreInterpretation.trim() || null,
        clinical_notes: clinicalNotes.trim() || null,
      });

      navigate(`/app/outcome-measures/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to record outcome assessment.');
    } finally {
      setIsSubmitting(false);
      setShowFinalizeModal(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      {/* Top Navigation */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          to="/app/outcome-measures"
          style={{ color: '#0284c7', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}
        >
          ← Back to Outcome Measures
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.5rem 0 0 0', color: '#0f172a' }}>
          Record Clinical Outcome Assessment
        </h1>
        <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
          Standardized functional assessment, pain metric, or milestone progress evaluation.
        </p>
      </div>

      {/* Domain Separation Notice */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '0.875rem 1rem',
          marginBottom: '1.5rem',
          fontSize: '0.8125rem',
          color: '#475569',
        }}
      >
        <strong>Clinical Architecture Invariant:</strong> Patient ≠ Episode of Care ≠ Appointment ≠ Clinical Visit ≠ Clinical Note ≠ Clinical Outcome Measure.
        This record represents an objective clinical assessment. Finalizing locks the historical result for permanent auditability.
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            marginBottom: '1.5rem',
          }}
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <p style={{ color: '#64748b' }}>Loading assessment form...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* 1. Context Selection */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem', color: '#0f172a' }}>
              1. Patient & Encounter Context
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {/* Patient */}
              <div>
                <label
                  htmlFor="patient-select"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}
                >
                  Patient *
                </label>
                <select
                  id="patient-select"
                  value={selectedPatientId}
                  onChange={(e) => handlePatientChange(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#fff' }}
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.patient_identifier})
                    </option>
                  ))}
                </select>
              </div>

              {/* Episode */}
              <div>
                <label
                  htmlFor="episode-select"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}
                >
                  Episode of Care (Optional)
                </label>
                <select
                  id="episode-select"
                  value={selectedEpisodeId}
                  disabled={!selectedPatientId || episodes.length === 0}
                  onChange={(e) => setSelectedEpisodeId(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#fff' }}
                >
                  <option value="">-- None (Standalone Assessment) --</option>
                  {episodes.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.title} ({ep.episode_identifier})
                    </option>
                  ))}
                </select>
              </div>

              {/* Visit */}
              <div>
                <label
                  htmlFor="visit-select"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}
                >
                  Clinical Visit Encounter (Optional)
                </label>
                <select
                  id="visit-select"
                  value={selectedVisitId}
                  disabled={!selectedPatientId || visits.length === 0}
                  onChange={(e) => setSelectedVisitId(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#fff' }}
                >
                  <option value="">-- None (Outside Encounter) --</option>
                  {visits.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.visit_identifier} ({v.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Measure Definition Selection */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem', color: '#0f172a' }}>
              2. Outcome Measure Instrument
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="measure-select"
                style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}
              >
                Standardized Measure *
              </label>
              <select
                id="measure-select"
                value={selectedDefinitionId}
                onChange={(e) => handleDefinitionChange(e.target.value)}
                style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#fff' }}
              >
                {definitions.map((def) => (
                  <option key={def.id} value={def.id}>
                    {def.code} — {def.name} ({def.category})
                  </option>
                ))}
              </select>
            </div>

            {selectedDefinition && (
              <div
                style={{
                  backgroundColor: '#f1f5f9',
                  borderRadius: '6px',
                  padding: '1rem',
                  fontSize: '0.8125rem',
                  color: '#334155',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#0f172a', fontSize: '0.875rem' }}>
                    {selectedDefinition.code}: {selectedDefinition.name}
                  </strong>
                  <span style={{ textTransform: 'capitalize', color: '#64748b' }}>
                    {selectedDefinition.category} • Scoring: {selectedDefinition.scoring_type}
                  </span>
                </div>
                <p style={{ margin: '0 0 0.5rem 0', color: '#475569', lineHeight: 1.5 }}>
                  {selectedDefinition.description}
                </p>
                {selectedDefinition.interpretation_guide && (
                  <div style={{ backgroundColor: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    <strong style={{ color: '#0369a1', display: 'block' }}>Interpretation Guide:</strong>
                    <span>{selectedDefinition.interpretation_guide}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Administration & Scores */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: 0, marginBottom: '1.25rem', color: '#0f172a' }}>
              3. Measurement Administration & Results
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Milestone Type */}
              <div>
                <label
                  htmlFor="type-select"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}
                >
                  Milestone Designation *
                </label>
                <select
                  id="type-select"
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value as OutcomeAssessmentType)}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#fff' }}
                >
                  <option value="baseline">Baseline (Initial Evaluation)</option>
                  <option value="interim">Interim (Re-assessment)</option>
                  <option value="discharge">Discharge (Conclusion of Episode)</option>
                  <option value="follow_up">Follow-up (Post-discharge)</option>
                  <option value="routine">Routine (Per Session)</option>
                </select>
              </div>

              {/* Performed Date/Time */}
              <div>
                <label
                  htmlFor="performed-at"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}
                >
                  Date / Time Administered *
                </label>
                <input
                  id="performed-at"
                  type="datetime-local"
                  value={performedAt}
                  onChange={(e) => setPerformedAt(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Numeric Score */}
              <div>
                <label
                  htmlFor="numeric-score"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}
                >
                  Numeric Score {selectedDefinition?.score_unit ? `(${selectedDefinition.score_unit})` : ''}
                </label>
                <input
                  id="numeric-score"
                  type="number"
                  step="0.1"
                  value={numericScore}
                  onChange={(e) => setNumericScore(e.target.value)}
                  placeholder={selectedDefinition?.min_score !== null && selectedDefinition?.max_score !== null ? `${selectedDefinition?.min_score} to ${selectedDefinition?.max_score}` : 'e.g. 7.5'}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Percentage Score */}
              <div>
                <label
                  htmlFor="pct-score"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}
                >
                  Percentage Score (%)
                </label>
                <input
                  id="pct-score"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={percentageScore}
                  onChange={(e) => setPercentageScore(e.target.value)}
                  placeholder="0 - 100"
                  style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Score Category & Interpretation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label
                  htmlFor="score-category"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}
                >
                  Score Category / Band (Optional)
                </label>
                <input
                  id="score-category"
                  type="text"
                  value={scoreCategory}
                  onChange={(e) => setScoreCategory(e.target.value)}
                  placeholder="e.g. Minimal Disability, Severe Pain, High Fall Risk"
                  style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label
                  htmlFor="score-interpretation"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}
                >
                  Clinical Interpretation (Optional)
                </label>
                <input
                  id="score-interpretation"
                  type="text"
                  value={scoreInterpretation}
                  onChange={(e) => setScoreInterpretation(e.target.value)}
                  placeholder="e.g. MCID achieved (+12 points from baseline)"
                  style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Clinical Notes / Remarks */}
            <div>
              <label
                htmlFor="clinical-notes"
                style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}
              >
                Administration Context & Remarks (Optional)
              </label>
              <textarea
                id="clinical-notes"
                rows={3}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Patient execution tolerance, assistive devices used during test, compensations noted..."
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
            <Link
              to="/app/outcome-measures"
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Cancel
            </Link>
            <button
              type="button"
              disabled={isSubmitting || !selectedPatientId || !selectedDefinitionId}
              onClick={() => handleSubmit(false)}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '6px',
                border: '1px solid #0284c7',
                backgroundColor: '#ffffff',
                color: '#0284c7',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isSubmitting || !selectedPatientId ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !selectedPatientId ? 0.6 : 1,
              }}
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={isSubmitting || !selectedPatientId || !selectedDefinitionId}
              onClick={() => setShowFinalizeModal(true)}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isSubmitting || !selectedPatientId ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !selectedPatientId ? 0.6 : 1,
              }}
            >
              Finalize Assessment
            </button>
          </div>
        </div>
      )}

      {/* Finalize Modal */}
      {showFinalizeModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.125rem', fontWeight: 600 }}>
              Finalize Outcome Assessment?
            </h3>
            <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Finalizing this assessment marks it as an official measurement and <strong>medico-legally locks</strong> the original score.
              Any subsequent corrections will require an official amendment with documented rationale.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setShowFinalizeModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Continue Editing
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(true)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? 'Finalizing...' : 'Confirm & Finalize'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
