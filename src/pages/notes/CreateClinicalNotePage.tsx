import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { clinicalNoteService } from '../../services/clinicalNoteService';
import { clinicalVisitService } from '../../services/clinicalVisitService';
import { useFormDraft } from '../../hooks/useFormDraft';
import { DraftBanner } from '../../components/ui/DraftBanner';
import type { ClinicalVisitWithRelations } from '../../types/models';

interface NoteDraftData {
  selectedVisitId: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export const CreateClinicalNotePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialVisitId = searchParams.get('visitId') || searchParams.get('visit_id') || '';

  const [visits, setVisits] = useState<ClinicalVisitWithRelations[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<ClinicalVisitWithRelations | null>(null);

  // Platform-wide draft preservation
  const {
    data: draftData,
    updateField,
    isDirty,
    isRestored,
    restoredAt,
    discardDraft,
    markSaved,
  } = useFormDraft<NoteDraftData>({
    formId: `clinical_note_new_${initialVisitId || 'default'}`,
    initialData: {
      selectedVisitId: initialVisitId,
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
    },
  });

  const selectedVisitId = draftData.selectedVisitId || initialVisitId;
  const setSelectedVisitId = (val: string) => updateField('selectedVisitId', val);
  const subjective = draftData.subjective;
  const setSubjective = (val: string) => updateField('subjective', val);
  const objective = draftData.objective;
  const setObjective = (val: string) => updateField('objective', val);
  const assessment = draftData.assessment;
  const setAssessment = (val: string) => updateField('assessment', val);
  const plan = draftData.plan;
  const setPlan = (val: string) => updateField('plan', val);

  // Status & loading states
  const [isLoadingVisits, setIsLoadingVisits] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingNoteWarning, setExistingNoteWarning] = useState<string | null>(null);

  // Finalize confirmation modal
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  // Load available clinical visits
  useEffect(() => {
    const loadVisits = async () => {
      setIsLoadingVisits(true);
      try {
        const res = await clinicalVisitService.getClinicalVisits({ limit: 50 });
        setVisits(res.visits);

        if (initialVisitId) {
          const matched = res.visits.find((v) => v.id === initialVisitId);
          if (matched) {
            setSelectedVisit(matched);
          } else {
            // Fetch individually if not in top 50
            const single = await clinicalVisitService.getClinicalVisitById(initialVisitId);
            if (single) {
              setSelectedVisit(single);
            }
          }
        }
      } catch (err: any) {
        console.error('Failed to load visits:', err);
      } finally {
        setIsLoadingVisits(false);
      }
    };

    loadVisits();
  }, [initialVisitId]);

  // When visit selection changes, check if it already has a primary SOAP note
  useEffect(() => {
    const checkExistingNote = async () => {
      setExistingNoteWarning(null);
      if (!selectedVisitId) {
        setSelectedVisit(null);
        return;
      }

      const v = visits.find((item) => item.id === selectedVisitId);
      if (v) {
        setSelectedVisit(v);
      } else {
        const single = await clinicalVisitService.getClinicalVisitById(selectedVisitId);
        setSelectedVisit(single);
      }

      try {
        const existing = await clinicalNoteService.getPrimaryNoteForVisit(selectedVisitId);
        if (existing) {
          setExistingNoteWarning(
            `This visit already has a primary clinical note (${existing.note_identifier}, status: ${existing.status}). Only one primary SOAP note is permitted per encounter.`
          );
        }
      } catch (err: any) {
        console.warn('Could not check existing note for visit:', err);
      }
    };

    checkExistingNote();
  }, [selectedVisitId, visits]);

  const handleSubmit = async (finalize: boolean = false) => {
    setError(null);
    if (!selectedVisitId || !selectedVisit) {
      setError('Please select a clinical visit encounter to document.');
      return;
    }

    if (existingNoteWarning) {
      setError('Cannot create multiple primary SOAP notes for the same clinical visit.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id;
      if (!currentUserId) {
        throw new Error('Authenticated user session required.');
      }

      const createdNote = await clinicalNoteService.createClinicalNote({
        clinical_visit_id: selectedVisit.id,
        patient_id: selectedVisit.patient_id,
        episode_id: selectedVisit.episode_id,
        author_id: currentUserId,
        note_type: 'soap',
        status: finalize ? 'finalized' : 'draft',
        subjective,
        objective,
        assessment,
        plan,
      });

      markSaved();
      navigate(`/app/clinical-notes/${createdNote.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create clinical note.');
    } finally {
      setIsSubmitting(false);
      setShowFinalizeModal(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          to="/app/clinical-notes"
          style={{ color: '#0284c7', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}
        >
          ← Back to Clinical Notes
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.5rem 0 0 0', color: '#0f172a' }}>
          Document Clinical Note (SOAP)
        </h1>
        <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
          Structured physiotherapy clinical documentation for an encounter.
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
        <strong>Clinical Architecture Invariant:</strong> Patient ≠ Episode of Care ≠ Appointment ≠ Clinical Visit ≠ Clinical Note.
        The clinical note is medico-legal documentation recording evaluation and treatment. Finalizing a note permanently locks its content.
      </div>

      {/* Form Draft Preservation & Restoration Banner */}
      <DraftBanner
        isRestored={isRestored}
        restoredAt={restoredAt}
        isDirty={isDirty}
        onDiscard={discardDraft}
        entityName="clinical note"
      />

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

      {/* Duplicate Note Warning */}
      {existingNoteWarning && (
        <div
          style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            color: '#92400e',
            padding: '0.875rem 1rem',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
          }}
        >
          <strong>Warning:</strong> {existingNoteWarning}
        </div>
      )}

      {/* Visit Selection Section */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem', color: '#0f172a' }}>
          1. Select Encounter
        </h2>

        {isLoadingVisits ? (
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading available visits...</p>
        ) : (
          <div>
            <label
              htmlFor="visit-select"
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}
            >
              Clinical Visit *
            </label>
            <select
              id="visit-select"
              value={selectedVisitId}
              onChange={(e) => setSelectedVisitId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                backgroundColor: '#ffffff',
                marginBottom: '1rem',
              }}
            >
              <option value="">-- Choose a Clinical Visit --</option>
              {visits.map((v) => {
                const patientName = v.patient
                  ? `${v.patient.first_name} ${v.patient.last_name}`
                  : 'Patient';
                return (
                  <option key={v.id} value={v.id}>
                    {v.visit_identifier} — {patientName} ({v.status})
                  </option>
                );
              })}
            </select>

            {selectedVisit && (
              <div
                style={{
                  backgroundColor: '#f1f5f9',
                  borderRadius: '6px',
                  padding: '0.875rem 1rem',
                  fontSize: '0.8125rem',
                  color: '#334155',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Patient</span>
                  <strong>
                    {selectedVisit.patient
                      ? `${selectedVisit.patient.first_name} ${selectedVisit.patient.last_name} (${selectedVisit.patient.patient_identifier})`
                      : '—'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Episode of Care</span>
                  <strong>{selectedVisit.episode ? selectedVisit.episode.title : 'Standalone Encounter'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Visit Status</span>
                  <strong style={{ textTransform: 'capitalize' }}>{selectedVisit.status}</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SOAP Documentation Form */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: 0, marginBottom: '1.25rem', color: '#0f172a' }}>
          2. SOAP Documentation
        </h2>

        {/* Subjective */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="subjective-field"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0369a1', marginBottom: '0.25rem' }}
          >
            Subjective (S)
          </label>
          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
            Chief complaint, patient symptom report, pain scale (0–10), mechanism, functional limitations, aggravating/easing factors.
          </span>
          <textarea
            id="subjective-field"
            rows={4}
            value={subjective}
            onChange={(e) => setSubjective(e.target.value)}
            placeholder="e.g. Patient reports sharp lower back pain (6/10) with prolonged sitting. Aggravated by bending forward..."
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Objective */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="objective-field"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0369a1', marginBottom: '0.25rem' }}
          >
            Objective (O)
          </label>
          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
            Physical examination: posture, active/passive ROM, strength/MMT, special tests, palpation, and manual/exercise interventions performed during the session.
          </span>
          <textarea
            id="objective-field"
            rows={5}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="e.g. Lumbar flexion limited to 40 deg with central low back pain. SLR negative bilaterally. Core activation exercises performed (3x10)..."
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Assessment */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="assessment-field"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0369a1', marginBottom: '0.25rem' }}
          >
            Assessment (A)
          </label>
          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
            Clinical impression, diagnostic reasoning, response to treatment during session, progress toward functional goals, prognosis.
          </span>
          <textarea
            id="assessment-field"
            rows={4}
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
            placeholder="e.g. Mechanical lumbar spine dysfunction with core deconditioning. Favorable response to mobilization with immediate pain reduction to 3/10..."
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Plan */}
        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="plan-field"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0369a1', marginBottom: '0.25rem' }}
          >
            Plan (P)
          </label>
          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
            Next session focus, frequency (e.g. 2x/week for 3 weeks), home exercises and ergonomic precautions instructed, referral/follow-up instructions.
          </span>
          <textarea
            id="plan-field"
            rows={4}
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="e.g. Continue lumbar stabilization program 2x weekly. Prescribed pelvic tilts and gentle bird-dog at home. Follow-up in 4 days..."
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Optional Structured Assessment Extension Panel */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
              Structured Clinical Assessments (Optional Specialty Extension)
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
              SOAP documentation remains the primary medico-legal record. Pluggable structured assessments can be attached to this encounter without disrupting the core note.
            </p>
          </div>
          {selectedVisit && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.25rem 0.625rem',
                borderRadius: '9999px',
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
              }}
            >
              Optional Extension
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', marginBottom: '0.25rem' }}>
              Comprehensive Neurological Examination V1
            </div>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#64748b' }}>
              10 structured clinical domains: Alertness, Tone (MAS), Reflexes, Clonus, Sensation, Coordination, Motor Control, Balance (BBS/TUG), Gait, and Transfers.
            </p>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#7c3aed', backgroundColor: '#f3e8ff', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              Neurology Module V1
            </span>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', marginBottom: '0.25rem' }}>
              Paediatric Gross Motor & Postural Screen
            </div>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#64748b' }}>
              Postural control, developmental milestones, movement symmetry, and GMFCS classification.
            </p>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#059669', backgroundColor: '#ecfdf5', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              Paediatric Foundation
            </span>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', marginBottom: '0.25rem' }}>
              Standardized Clinical Outcome Measures
            </div>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#64748b' }}>
              NPRS, VAS, LEFS, QuickDASH, ODI, NDI, TUG, PSFS, BBS psychometric scales.
            </p>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#0284c7', backgroundColor: '#f0f9ff', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              Evidence-Based
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
        <Link
          to="/app/clinical-notes"
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
          disabled={isSubmitting || !selectedVisitId || !!existingNoteWarning}
          onClick={() => handleSubmit(false)}
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '6px',
            border: '1px solid #0284c7',
            backgroundColor: '#ffffff',
            color: '#0284c7',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: isSubmitting || !selectedVisitId || !!existingNoteWarning ? 'not-allowed' : 'pointer',
            opacity: isSubmitting || !selectedVisitId || !!existingNoteWarning ? 0.6 : 1,
          }}
        >
          Save as Draft
        </button>
        <button
          type="button"
          disabled={isSubmitting || !selectedVisitId || !!existingNoteWarning}
          onClick={() => setShowFinalizeModal(true)}
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#16a34a',
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: isSubmitting || !selectedVisitId || !!existingNoteWarning ? 'not-allowed' : 'pointer',
            opacity: isSubmitting || !selectedVisitId || !!existingNoteWarning ? 0.6 : 1,
          }}
        >
          Finalize Note
        </button>
      </div>

      {/* Finalize Confirmation Modal */}
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
              Finalize Clinical Documentation?
            </h3>
            <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Finalizing this clinical note marks it as complete and <strong>medico-legally locks</strong> the record.
              Once finalized, the core SOAP content cannot be edited or deleted. Any subsequent modifications will require an official addendum.
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
