import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { clinicalNoteService } from '../../services/clinicalNoteService';
import { outcomeMeasureService } from '../../services/outcomeMeasureService';
import { hepService } from '../../services/hepService';
import type {
  ClinicalNoteWithRelations,
  ClinicalNoteStatus,
  ClinicalNoteType,
  OutcomeMeasureAssessmentWithRelations,
  HomeExerciseProgramWithRelations,
} from '../../types/models';

export const ClinicalNoteDetailPage: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();

  const [note, setNote] = useState<ClinicalNoteWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit State (for Draft notes)
  const [isEditing, setIsEditing] = useState(false);
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Finalize Modal State
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  // Addendum Modal State
  const [showAddendumModal, setShowAddendumModal] = useState(false);
  const [amendmentReason, setAmendmentReason] = useState('');
  const [addendumSubjective, setAddendumSubjective] = useState('');
  const [addendumObjective, setAddendumObjective] = useState('');
  const [addendumAssessment, setAddendumAssessment] = useState('');
  const [addendumPlan, setAddendumPlan] = useState('');
  const [isSubmittingAddendum, setIsSubmittingAddendum] = useState(false);
  const [outcomeAssessments, setOutcomeAssessments] = useState<OutcomeMeasureAssessmentWithRelations[]>([]);
  const [homeExercisePrograms, setHomeExercisePrograms] = useState<HomeExerciseProgramWithRelations[]>([]);

  const loadNote = async () => {
    if (!noteId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await clinicalNoteService.getClinicalNoteById(noteId);
      if (!data) {
        setError('Clinical note not found.');
      } else {
        setNote(data);
        setSubjective(data.subjective || '');
        setObjective(data.objective || '');
        setAssessment(data.assessment || '');
        setPlan(data.plan || '');

        if (data.clinical_visit_id) {
          try {
            const oas = await outcomeMeasureService.getAssessmentsForVisit(data.clinical_visit_id);
            setOutcomeAssessments(oas);
          } catch (oaErr) {
            console.warn('Could not load outcome assessments for note visit:', oaErr);
          }

          try {
            const progs = await hepService.getProgramsForVisit(data.clinical_visit_id);
            setHomeExercisePrograms(progs);
          } catch (hepErr) {
            console.warn('Could not load exercise programs for note visit:', hepErr);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load clinical note.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNote();
  }, [noteId]);

  const handleSaveDraft = async () => {
    if (!note) return;
    setIsSaving(true);
    setError(null);
    try {
      await clinicalNoteService.updateDraftNote(note.id, {
        subjective,
        objective,
        assessment,
        plan,
      });
      setIsEditing(false);
      await loadNote();
    } catch (err: any) {
      setError(err.message || 'Failed to update draft note.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalizeNote = async () => {
    if (!note) return;
    setIsSaving(true);
    setError(null);
    try {
      // First save any unsaved edits if in editing mode
      if (isEditing) {
        await clinicalNoteService.updateDraftNote(note.id, {
          subjective,
          objective,
          assessment,
          plan,
        });
      }
      await clinicalNoteService.finalizeNote(note.id);
      setIsEditing(false);
      setShowFinalizeModal(false);
      await loadNote();
    } catch (err: any) {
      setError(err.message || 'Failed to finalize clinical note.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAddendum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note) return;
    if (!amendmentReason.trim()) {
      setError('An amendment reason is strictly required.');
      return;
    }

    setIsSubmittingAddendum(true);
    setError(null);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id;
      if (!currentUserId) {
        throw new Error('Authenticated clinician session required.');
      }

      await clinicalNoteService.createAddendum({
        parent_note_id: note.id,
        author_id: currentUserId,
        amendment_reason: amendmentReason.trim(),
        subjective: addendumSubjective.trim(),
        objective: addendumObjective.trim(),
        assessment: addendumAssessment.trim(),
        plan: addendumPlan.trim(),
      });

      setShowAddendumModal(false);
      setAmendmentReason('');
      setAddendumSubjective('');
      setAddendumObjective('');
      setAddendumAssessment('');
      setAddendumPlan('');
      await loadNote();
    } catch (err: any) {
      setError(err.message || 'Failed to append addendum.');
    } finally {
      setIsSubmittingAddendum(false);
    }
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return ts;
    }
  };

  const getStatusBadgeStyle = (status: ClinicalNoteStatus) => {
    switch (status) {
      case 'draft':
        return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
      case 'finalized':
        return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
      case 'amended':
        return { backgroundColor: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff' };
      default:
        return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    }
  };

  const getTypeBadgeStyle = (type: ClinicalNoteType) => {
    switch (type) {
      case 'soap':
        return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
      case 'addendum':
        return { backgroundColor: '#fae8ff', color: '#86198f', border: '1px solid #f5d0fe' };
      default:
        return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Loading clinical note details...
      </div>
    );
  }

  if (error && !note) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <Link to="/app/clinical-notes" style={{ color: '#0284c7', textDecoration: 'none' }}>
          ← Back to Clinical Notes
        </Link>
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!note) return null;

  const authorName = note.author
    ? `${note.author.first_name || ''} ${note.author.last_name || ''}`.trim() || note.author.display_name
    : 'Physiotherapist';

  const finalizerName = note.finalizer
    ? `${note.finalizer.first_name || ''} ${note.finalizer.last_name || ''}`.trim() || note.finalizer.display_name
    : null;

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Top Navigation */}
      {/* Top Navigation with Smart Context Return */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {note.clinical_visit_id ? (
          <Link
            to={`/app/visits/${note.clinical_visit_id}`}
            style={{ color: '#0284c7', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}
          >
            ← Back to Encounter ({note.clinical_visit?.visit_identifier || 'Visit'})
          </Link>
        ) : (
          <Link
            to="/app/clinical-notes"
            style={{ color: '#0284c7', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}
          >
            ← Back to Clinical Notes
          </Link>
        )}
        {note.patient_id && (
          <Link
            to={`/app/patients/${note.patient_id}`}
            style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}
          >
            Patient Profile
          </Link>
        )}
        {note.episode_id && (
          <Link
            to={`/app/episodes/${note.episode_id}`}
            style={{ color: '#0d9488', textDecoration: 'none', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}
          >
            Episode Hub
          </Link>
        )}
      </div>

      {/* Header Profile Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              {note.note_identifier}
            </h1>
            <span
              style={{
                padding: '0.25rem 0.625rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                ...getTypeBadgeStyle(note.note_type),
              }}
            >
              {note.note_type}
            </span>
            <span
              style={{
                padding: '0.25rem 0.625rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'capitalize',
                ...getStatusBadgeStyle(note.status),
              }}
            >
              {note.status}
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            Authored by <strong>{authorName}</strong> • Recorded {formatTimestamp(note.created_at)}
            {note.finalized_at && (
              <span> • Finalized {formatTimestamp(note.finalized_at)} by {finalizerName || 'Clinician'}</span>
            )}
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {note.status === 'draft' ? (
            <>
              {isEditing ? (
                <>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      setIsEditing(false);
                      setSubjective(note.subjective || '');
                      setObjective(note.objective || '');
                      setAssessment(note.assessment || '');
                      setPlan(note.plan || '');
                    }}
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
                    Cancel Edit
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveDraft}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      border: '1px solid #0284c7',
                      backgroundColor: '#ffffff',
                      color: '#0284c7',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSaving ? 'Saving...' : 'Save Draft'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Edit Draft
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowFinalizeModal(true)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Finalize Note
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddendumModal(true)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #9333ea',
                backgroundColor: '#f3e8ff',
                color: '#6b21a8',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Append Addendum
            </button>
          )}
        </div>
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
        This record constitutes formal clinical documentation. Finalized notes cannot be overwritten.
      </div>

      {/* Immutability / Medico-legal Notice Banner */}
      {note.status !== 'draft' && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: '#166534',
            fontSize: '0.875rem',
          }}
        >
          <strong>Medico-Legal Protection Active:</strong> This note was finalized on{' '}
          {formatTimestamp(note.finalized_at)}. Its contents are permanent and immutable. Any additional clinical findings or corrections are recorded as formal addenda below.
        </div>
      )}

      {/* Error message */}
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

      {/* Relational Context Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Patient */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Patient</span>
          <div style={{ marginTop: '0.25rem' }}>
            {note.patient ? (
              <Link to={`/app/patients/${note.patient.id}`} style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
                {note.patient.first_name} {note.patient.last_name}
              </Link>
            ) : (
              <span>—</span>
            )}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{note.patient?.patient_identifier}</span>
        </div>

        {/* Visit */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Clinical Visit</span>
          <div style={{ marginTop: '0.25rem' }}>
            {note.clinical_visit ? (
              <Link to={`/app/clinical-visits/${note.clinical_visit.id}`} style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
                {note.clinical_visit.visit_identifier}
              </Link>
            ) : (
              <span>—</span>
            )}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize' }}>
            Status: {note.clinical_visit?.status || '—'}
          </span>
        </div>

        {/* Episode */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Episode of Care</span>
          <div style={{ marginTop: '0.25rem' }}>
            {note.episode ? (
              <Link to={`/app/episodes/${note.episode.id}`} style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
                {note.episode.title}
              </Link>
            ) : (
              <span style={{ color: '#64748b' }}>Standalone Encounter</span>
            )}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{note.episode?.episode_identifier}</span>
        </div>

        {/* Parent Note (if Addendum) */}
        {note.parent_note && (
          <div style={{ backgroundColor: '#fdf4ff', border: '1px solid #f5d0fe', borderRadius: '8px', padding: '1rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#a21caf', textTransform: 'uppercase', fontWeight: 600 }}>Parent Note</span>
            <div style={{ marginTop: '0.25rem' }}>
              <Link to={`/app/clinical-notes/${note.parent_note.id}`} style={{ color: '#86198f', fontWeight: 600, textDecoration: 'none' }}>
                {note.parent_note.note_identifier}
              </Link>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#a21caf' }}>Reason: {note.amendment_reason || '—'}</span>
          </div>
        )}
      </div>

      {/* If this is an addendum, show the amendment reason banner */}
      {note.note_type === 'addendum' && note.amendment_reason && (
        <div
          style={{
            backgroundColor: '#faf5ff',
            border: '1px solid #e9d5ff',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <strong style={{ color: '#6b21a8', display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            Reason for Amendment:
          </strong>
          <p style={{ margin: 0, color: '#3b0764', fontSize: '0.875rem' }}>{note.amendment_reason}</p>
        </div>
      )}

      {/* Structured SOAP Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
        {/* Subjective */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            <span style={{ backgroundColor: '#0284c7', color: '#fff', width: '24px', height: '24px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
              S
            </span>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
              Subjective
            </h2>
          </div>
          {isEditing ? (
            <textarea
              rows={4}
              value={subjective}
              onChange={(e) => setSubjective(e.target.value)}
              placeholder="Patient symptoms, pain score, aggravating/easing factors..."
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          ) : (
            <div style={{ color: '#334155', fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {note.subjective ? note.subjective : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No subjective notes recorded.</span>}
            </div>
          )}
        </div>

        {/* Objective */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            <span style={{ backgroundColor: '#0284c7', color: '#fff', width: '24px', height: '24px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
              O
            </span>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
              Objective
            </h2>
          </div>
          {isEditing ? (
            <textarea
              rows={5}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Physical examination, ROM, strength, special tests, exercises performed..."
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          ) : (
            <div style={{ color: '#334155', fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {note.objective ? note.objective : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No objective examination recorded.</span>}
            </div>
          )}
        </div>

        {/* Assessment */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            <span style={{ backgroundColor: '#0284c7', color: '#fff', width: '24px', height: '24px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
              A
            </span>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
              Assessment
            </h2>
          </div>
          {isEditing ? (
            <textarea
              rows={4}
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              placeholder="Clinical impression, progress, response to treatment..."
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          ) : (
            <div style={{ color: '#334155', fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {note.assessment ? note.assessment : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No clinical assessment recorded.</span>}
            </div>
          )}
        </div>

        {/* Plan */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            <span style={{ backgroundColor: '#0284c7', color: '#fff', width: '24px', height: '24px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
              P
            </span>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
              Plan
            </h2>
          </div>
          {isEditing ? (
            <textarea
              rows={4}
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              placeholder="Frequency, home exercises, precautions, next visit focus..."
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          ) : (
            <div style={{ color: '#334155', fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {note.plan ? note.plan : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No plan recorded.</span>}
            </div>
          )}
        </div>
      </div>

      {/* Child Addenda Section */}
      {note.addenda && note.addenda.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Addenda & Amendments ({note.addenda.length})
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {note.addenda.map((addendum) => {
              const addendumAuthorName = addendum.author
                ? `${addendum.author.first_name || ''} ${addendum.author.last_name || ''}`.trim() || addendum.author.display_name
                : 'Physiotherapist';

              return (
                <div
                  key={addendum.id}
                  style={{
                    backgroundColor: '#faf5ff',
                    border: '1px solid #e9d5ff',
                    borderRadius: '8px',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #f3e8ff', paddingBottom: '0.5rem' }}>
                    <div>
                      <Link to={`/app/clinical-notes/${addendum.id}`} style={{ color: '#7e22ce', fontWeight: 700, textDecoration: 'none' }}>
                        {addendum.note_identifier} (Addendum)
                      </Link>
                      <span style={{ fontSize: '0.75rem', color: '#6b21a8', marginLeft: '0.75rem' }}>
                        By {addendumAuthorName} • {formatTimestamp(addendum.created_at)}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginBottom: '0.75rem', backgroundColor: '#f3e8ff', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                    <strong style={{ fontSize: '0.75rem', color: '#581c87', display: 'block' }}>Reason for Amendment:</strong>
                    <span style={{ fontSize: '0.8125rem', color: '#3b0764' }}>{addendum.amendment_reason}</span>
                  </div>
                  {addendum.subjective && (
                    <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                      <strong style={{ color: '#6b21a8' }}>Subjective Addendum: </strong>
                      <span style={{ whiteSpace: 'pre-wrap' }}>{addendum.subjective}</span>
                    </div>
                  )}
                  {addendum.objective && (
                    <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                      <strong style={{ color: '#6b21a8' }}>Objective Addendum: </strong>
                      <span style={{ whiteSpace: 'pre-wrap' }}>{addendum.objective}</span>
                    </div>
                  )}
                  {addendum.assessment && (
                    <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                      <strong style={{ color: '#6b21a8' }}>Assessment Addendum: </strong>
                      <span style={{ whiteSpace: 'pre-wrap' }}>{addendum.assessment}</span>
                    </div>
                  )}
                  {addendum.plan && (
                    <div style={{ fontSize: '0.875rem' }}>
                      <strong style={{ color: '#6b21a8' }}>Plan Addendum: </strong>
                      <span style={{ whiteSpace: 'pre-wrap' }}>{addendum.plan}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Linked Outcome Measures Reference Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
              Standardized Clinical Outcome Measures
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: outcomeAssessments.length > 0 ? '#dcfce7' : '#f1f5f9',
                color: outcomeAssessments.length > 0 ? '#166534' : '#475569',
              }}
            >
              {outcomeAssessments.length} Available
            </span>
          </div>

          {note.clinical_visit_id && (
            <Link
              to={`/app/outcome-measures/new?visitId=${note.clinical_visit_id}&patientId=${note.patient_id}&episodeId=${note.episode_id || ''}`}
              style={{
                backgroundColor: '#059669',
                color: '#ffffff',
                padding: '0.4rem 0.875rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.8125rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              + Administer Outcome Measure
            </Link>
          )}
        </div>

        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
          <em>Domain Firewall Note:</em> Standardized outcome scores are tracked in the independent Outcome Measures domain. They provide objective evidence for this clinical note without violating clinical document separation.
        </div>

        {outcomeAssessments.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {outcomeAssessments.map((oa) => (
              <div
                key={oa.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Link
                      to={`/app/outcome-measures/${oa.id}`}
                      style={{ color: '#059669', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}
                    >
                      {oa.assessment_identifier}
                    </Link>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }}>
                      {oa.definition?.name || 'Outcome Measure'} ({oa.definition?.code})
                    </span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                      }}
                    >
                      {oa.assessment_type}
                    </span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        textTransform: 'capitalize',
                        backgroundColor: oa.status === 'draft' ? '#fef3c7' : '#dcfce7',
                        color: oa.status === 'draft' ? '#92400e' : '#166534',
                      }}
                    >
                      {oa.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Assessed: {new Date(oa.performed_at).toLocaleDateString()}
                    {oa.score_interpretation && ` • ${oa.score_interpretation}`}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    {oa.status === 'amended' && oa.amended_numeric_score !== null
                      ? oa.amended_numeric_score
                      : oa.numeric_score !== null
                      ? oa.numeric_score
                      : '—'}
                    {oa.definition?.max_score !== null && oa.definition?.max_score !== undefined && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>
                        /{oa.definition.max_score}
                      </span>
                    )}
                  </div>
                  {oa.score_category && (
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#475569' }}>
                      {oa.score_category}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8125rem', fontStyle: 'italic' }}>
            No standardized outcome measures administered during this encounter.
          </p>
        )}
      </div>

      {/* Home Exercise Programs (HEP) Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
              Home Exercise Programs (HEP)
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: homeExercisePrograms.length > 0 ? '#e0f2fe' : '#f1f5f9',
                color: homeExercisePrograms.length > 0 ? '#0369a1' : '#475569',
              }}
            >
              {homeExercisePrograms.length} Prescribed
            </span>
          </div>

          {note.clinical_visit_id && (
            <Link
              to={`/app/hep/new?visitId=${note.clinical_visit_id}&patientId=${note.patient_id}&episodeId=${note.episode_id || ''}`}
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                padding: '0.4rem 0.875rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.8125rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              + Prescribe Exercise Program
            </Link>
          )}
        </div>

        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
          <em>Domain Firewall Note:</em> Exercise prescriptions are recorded in the independent Home Exercise Program domain. They link to this clinical visit for provenance without violating domain separation.
        </div>

        {homeExercisePrograms.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {homeExercisePrograms.map((prog) => (
              <div
                key={prog.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Link
                      to={`/app/hep/${prog.id}`}
                      style={{ color: '#0284c7', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}
                    >
                      {prog.program_identifier}
                    </Link>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                      {prog.title}
                    </span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        textTransform: 'capitalize',
                        backgroundColor:
                          prog.status === 'active'
                            ? '#dcfce7'
                            : prog.status === 'draft'
                            ? '#fef3c7'
                            : prog.status === 'paused'
                            ? '#ffedd5'
                            : '#f1f5f9',
                        color:
                          prog.status === 'active'
                            ? '#166534'
                            : prog.status === 'draft'
                            ? '#92400e'
                            : prog.status === 'paused'
                            ? '#9a3412'
                            : '#475569',
                      }}
                    >
                      {prog.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Start Date: {new Date(prog.start_date).toLocaleDateString()}
                    {prog.review_date && ` • Review Due: ${new Date(prog.review_date).toLocaleDateString()}`}
                  </div>
                </div>

                <div>
                  <Link
                    to={`/app/hep/${prog.id}`}
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: '#0284c7',
                      textDecoration: 'none',
                    }}
                  >
                    View Prescription →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8125rem', fontStyle: 'italic' }}>
            No home exercise program prescribed during this clinical visit encounter.
          </p>
        )}
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
              Finalizing this note marks it as completed and <strong>medico-legally locks</strong> the documentation.
              Once finalized, the core SOAP sections cannot be modified or deleted. Any further changes require an addendum.
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
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleFinalizeNote}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {isSaving ? 'Finalizing...' : 'Confirm & Finalize'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Addendum Modal */}
      {showAddendumModal && (
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
              maxWidth: '650px',
              width: '100%',
              padding: '1.5rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.125rem', fontWeight: 600 }}>
              Append Addendum to {note.note_identifier}
            </h3>
            <p style={{ color: '#475569', fontSize: '0.8125rem', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              Addenda append clarification or additional clinical observations to finalized notes without altering the original record.
            </p>

            <form onSubmit={handleCreateAddendum}>
              {/* Amendment Reason */}
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="amendment-reason"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}
                >
                  Reason for Amendment *
                </label>
                <input
                  id="amendment-reason"
                  type="text"
                  required
                  value={amendmentReason}
                  onChange={(e) => setAmendmentReason(e.target.value)}
                  placeholder="e.g. Additional test results reviewed; clarify home exercise instructions"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Subjective Addendum */}
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="addendum-subjective"
                  style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#0369a1', marginBottom: '0.25rem' }}
                >
                  Subjective Addendum (Optional)
                </label>
                <textarea
                  id="addendum-subjective"
                  rows={2}
                  value={addendumSubjective}
                  onChange={(e) => setAddendumSubjective(e.target.value)}
                  placeholder="Additional patient statements or symptom updates..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8125rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {/* Objective Addendum */}
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="addendum-objective"
                  style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#0369a1', marginBottom: '0.25rem' }}
                >
                  Objective Addendum (Optional)
                </label>
                <textarea
                  id="addendum-objective"
                  rows={2}
                  value={addendumObjective}
                  onChange={(e) => setAddendumObjective(e.target.value)}
                  placeholder="Additional objective findings or measurements..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8125rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {/* Assessment Addendum */}
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="addendum-assessment"
                  style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#0369a1', marginBottom: '0.25rem' }}
                >
                  Assessment Addendum (Optional)
                </label>
                <textarea
                  id="addendum-assessment"
                  rows={2}
                  value={addendumAssessment}
                  onChange={(e) => setAddendumAssessment(e.target.value)}
                  placeholder="Updated clinical impression..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8125rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {/* Plan Addendum */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  htmlFor="addendum-plan"
                  style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#0369a1', marginBottom: '0.25rem' }}
                >
                  Plan Addendum (Optional)
                </label>
                <textarea
                  id="addendum-plan"
                  rows={2}
                  value={addendumPlan}
                  onChange={(e) => setAddendumPlan(e.target.value)}
                  placeholder="Adjustments to rehabilitation plan..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8125rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddendumModal(false)}
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAddendum || !amendmentReason.trim()}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#7e22ce',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: isSubmittingAddendum || !amendmentReason.trim() ? 'not-allowed' : 'pointer',
                    opacity: isSubmittingAddendum || !amendmentReason.trim() ? 0.6 : 1,
                  }}
                >
                  {isSubmittingAddendum ? 'Appending...' : 'Save & Append Addendum'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
