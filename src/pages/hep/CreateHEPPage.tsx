import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Dumbbell, Plus, Trash2, ArrowLeft, CheckCircle2, AlertCircle, Info, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { hepService, CreateProgramItemInput } from '../../services/hepService';
import { patientService } from '../../services/patientService';
import { episodeService } from '../../services/episodeService';
import { clinicalVisitService } from '../../services/clinicalVisitService';
import { appointmentService } from '../../services/appointmentService';
import { ExerciseVisualCard } from '../../components/hep/ExerciseVisualCard';
import { useFormDraft } from '../../hooks/useFormDraft';
import { DraftBanner } from '../../components/ui/DraftBanner';
import type {
  Exercise,
  Patient,
  EpisodeOfCare,
  ClinicalVisitWithRelations,
  ExerciseLaterality,
  ExerciseCategory,
  ExerciseBodyRegion,
} from '../../types/models';

interface PrescribedItemState extends CreateProgramItemInput {
  tempId: string;
  exercise_name: string;
  exercise_category: ExerciseCategory;
  exercise_body_region: ExerciseBodyRegion;
}

interface HEPDraftData {
  selectedPatientId: string;
  selectedEpisodeId: string;
  selectedVisitId: string;
  selectedClinicianId: string;
  title: string;
  generalInstructions: string;
  startDate: string;
  reviewDate: string;
  prescribedItems: PrescribedItemState[];
}

export const CreateHEPPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialPatientId = searchParams.get('patientId') || '';
  const initialEpisodeId = searchParams.get('episodeId') || '';
  const initialVisitId = searchParams.get('visitId') || '';

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
  } = useFormDraft<HEPDraftData>({
    formId: `create_hep_${initialPatientId || 'default'}`,
    initialData: {
      selectedPatientId: initialPatientId,
      selectedEpisodeId: initialEpisodeId,
      selectedVisitId: initialVisitId,
      selectedClinicianId: '',
      title: '',
      generalInstructions: '',
      startDate: new Date().toISOString().split('T')[0],
      reviewDate: '',
      prescribedItems: [],
    },
  });

  // Reference Data
  const [patients, setPatients] = useState<Patient[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeOfCare[]>([]);
  const [visits, setVisits] = useState<ClinicalVisitWithRelations[]>([]);
  const [clinicians, setClinicians] = useState<Array<{ id: string; name: string }>>([]);
  const [exercisesCatalogue, setExercisesCatalogue] = useState<Exercise[]>([]);

  // Selected Entities & Program Details (bound to draftData)
  const selectedPatientId = draftData.selectedPatientId;
  const setSelectedPatientId = (val: string) => updateField('selectedPatientId', val);
  const selectedEpisodeId = draftData.selectedEpisodeId;
  const setSelectedEpisodeId = (val: string) => updateField('selectedEpisodeId', val);
  const selectedVisitId = draftData.selectedVisitId;
  const setSelectedVisitId = (val: string) => updateField('selectedVisitId', val);
  const selectedClinicianId = draftData.selectedClinicianId;
  const setSelectedClinicianId = (val: string) => updateField('selectedClinicianId', val);

  const title = draftData.title;
  const setTitle = (val: string) => updateField('title', val);
  const generalInstructions = draftData.generalInstructions;
  const setGeneralInstructions = (val: string) => updateField('generalInstructions', val);
  const startDate = draftData.startDate;
  const setStartDate = (val: string) => updateField('startDate', val);
  const reviewDate = draftData.reviewDate;
  const setReviewDate = (val: string) => updateField('reviewDate', val);

  const prescribedItems = draftData.prescribedItems;
  const setPrescribedItems = (items: PrescribedItemState[]) => updateField('prescribedItems', items);

  // Exercise Picker Modal
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState<string>('all');
  const [exerciseRegionFilter, setExerciseRegionFilter] = useState<string>('all');

  // Confirmation & Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [patientsRes, clinicianList, exercisesList] = await Promise.all([
          patientService.getPatients({ limit: 100 }),
          appointmentService.getClinicians(),
          hepService.getExercises({ activeOnly: true }),
        ]);

        setPatients(patientsRes.patients);
        setExercisesCatalogue(exercisesList);

        const clinicianOptions = clinicianList.map((c) => ({
          id: c.userId,
          name: c.name,
        }));
        setClinicians(clinicianOptions);

        // Try to default to current user if in list
        const { data: authData } = await supabase.auth.getUser();
        const currentUserId = authData.user?.id;
        if (currentUserId && clinicianOptions.some((c) => c.id === currentUserId)) {
          setSelectedClinicianId(currentUserId);
        } else if (clinicianOptions.length > 0) {
          setSelectedClinicianId(clinicianOptions[0].id);
        }

        // If initial patient is provided, load their episodes and visits
        if (initialPatientId) {
          const [epRes, visitRes] = await Promise.all([
            episodeService.getEpisodes({ patientId: initialPatientId, limit: 50 }),
            clinicalVisitService.getClinicalVisits({ patientId: initialPatientId, limit: 50 }),
          ]);
          setEpisodes(epRes.episodes);
          setVisits(visitRes.visits);

          if (initialEpisodeId && epRes.episodes.some((e) => e.id === initialEpisodeId)) {
            setSelectedEpisodeId(initialEpisodeId);
          } else if (epRes.episodes.length > 0) {
            setSelectedEpisodeId(epRes.episodes[0].id);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize exercise prescription form.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [initialPatientId, initialEpisodeId]);

  // When draft is restored, if it contains selectedPatientId, fetch their episodes & visits
  useEffect(() => {
    if (selectedPatientId && episodes.length === 0) {
      Promise.all([
        episodeService.getEpisodes({ patientId: selectedPatientId, limit: 50 }),
        clinicalVisitService.getClinicalVisits({ patientId: selectedPatientId, limit: 50 }),
      ])
        .then(([epRes, visitRes]) => {
          setEpisodes(epRes.episodes);
          setVisits(visitRes.visits);
        })
        .catch(() => {});
    }
  }, [selectedPatientId, episodes.length]);

  // Handle patient selection change
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

      if (epRes.episodes.length > 0) {
        setSelectedEpisodeId(epRes.episodes[0].id);
      }
    } catch (err) {
      console.warn('Failed to load episodes for patient:', err);
    }
  };

  // Add an exercise from catalogue to the prescription list
  const handleAddExercise = (exercise: Exercise) => {
    const newItem: PrescribedItemState = {
      tempId: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      exercise_category: exercise.category,
      exercise_body_region: exercise.body_region,
      order_index: prescribedItems.length + 1,
      laterality: exercise.default_laterality || 'na',
      sets: 3,
      repetitions: 10,
      hold_seconds: null,
      duration_minutes: null,
      rest_seconds: 60,
      frequency: 'Once daily',
      intensity_load: 'Bodyweight',
      instructions: exercise.instructions || '',
      precautions: exercise.precautions || '',
      notes: null,
    };

    setPrescribedItems([...prescribedItems, newItem]);
    setShowExerciseModal(false);
  };

  // Update a single item field
  const handleItemFieldChange = (index: number, field: keyof PrescribedItemState, value: any) => {
    const updated = [...prescribedItems];
    updated[index] = { ...updated[index], [field]: value };
    setPrescribedItems(updated);
  };

  // Remove an item
  const handleRemoveItem = (index: number) => {
    const updated = prescribedItems.filter((_, i) => i !== index);
    // Reindex order_index
    const reindexed = updated.map((item, idx) => ({ ...item, order_index: idx + 1 }));
    setPrescribedItems(reindexed);
  };

  // Form submission (draft or active)
  const handleSubmit = async (activateImmediately: boolean) => {
    setError(null);

    if (!selectedPatientId) {
      setError('Please select a patient.');
      return;
    }

    if (!selectedEpisodeId) {
      setError('Please select an Episode of Care. An exercise program must be grounded within a clinical episode.');
      return;
    }

    if (!selectedClinicianId) {
      setError('Please select the prescribing clinician.');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a descriptive title for this exercise program.');
      return;
    }

    if (activateImmediately && prescribedItems.length === 0) {
      setError('An active exercise program must contain at least one prescribed exercise item.');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsPayload: CreateProgramItemInput[] = prescribedItems.map((item, idx) => ({
        exercise_id: item.exercise_id,
        exercise_name: item.exercise_name,
        order_index: idx + 1,
        sets: item.sets ? Number(item.sets) : null,
        repetitions: item.repetitions ? Number(item.repetitions) : null,
        hold_seconds: item.hold_seconds ? Number(item.hold_seconds) : null,
        duration_minutes: item.duration_minutes ? Number(item.duration_minutes) : null,
        rest_seconds: item.rest_seconds ? Number(item.rest_seconds) : null,
        frequency: item.frequency?.trim() || null,
        intensity_load: item.intensity_load?.trim() || null,
        laterality: item.laterality || 'na',
        instructions: item.instructions?.trim() || null,
        precautions: item.precautions?.trim() || null,
        notes: item.notes?.trim() || null,
      }));

      // Create the program in draft status first
      const created = await hepService.createProgram({
        patient_id: selectedPatientId,
        episode_id: selectedEpisodeId,
        clinical_visit_id: selectedVisitId || null,
        prescribing_clinician_id: selectedClinicianId,
        title: title.trim(),
        instructions: generalInstructions.trim() || null,
        start_date: startDate,
        review_date: reviewDate || null,
        status: 'draft',
        items: itemsPayload,
      });

      // If user chose to activate immediately, transition status to active
      if (activateImmediately) {
        await hepService.activateProgram(created.id);
      }

      markSaved();
      navigate(`/app/hep/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save Home Exercise Program.');
      setIsSubmitting(false);
      setShowActivateConfirm(false);
    }
  };

  // Filter catalogue exercises in modal
  const filteredExercises = exercisesCatalogue.filter((ex) => {
    const term = exerciseSearchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      ex.name.toLowerCase().includes(term) ||
      (ex.description && ex.description.toLowerCase().includes(term)) ||
      (ex.equipment && ex.equipment.toLowerCase().includes(term)) ||
      (ex.instructions && ex.instructions.toLowerCase().includes(term)) ||
      (ex.precautions && ex.precautions.toLowerCase().includes(term));

    const matchesCategory = exerciseCategoryFilter === 'all' || ex.category === exerciseCategoryFilter;
    const matchesRegion = exerciseRegionFilter === 'all' || ex.body_region === exerciseRegionFilter;

    return matchesSearch && matchesCategory && matchesRegion;
  });

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Loading exercise prescription environment...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Back button and Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          to="/app/hep"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: '#64748b',
            textDecoration: 'none',
            fontSize: '0.875rem',
            marginBottom: '0.75rem',
          }}
        >
          <ArrowLeft size={16} />
          Back to Exercise Programs
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
          Prescribe Home Exercise Program
        </h1>
        <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
          Formulate an individualized rehabilitation regimen with precise dosage, frequency, and safety precautions.
        </p>
      </div>

      {/* Draft Restoration & Status Banner */}
      <DraftBanner
        isRestored={isRestored}
        restoredAt={restoredAt}
        isDirty={isDirty}
        saveStatus={saveStatus}
        onDiscard={discardDraft}
        entityName="exercise program"
      />

      {/* Domain Invariant Banner */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '0.875rem 1rem',
          marginBottom: '1.5rem',
          fontSize: '0.8125rem',
          color: '#1e40af',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.625rem',
        }}
      >
        <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Prescription Lifecycle:</strong> Saving as <em>Draft</em> allows ongoing modification of dosage parameters.
          Once <em>Activated</em>, the prescription is locked and treated as an immutable clinical order. Hard deletion is permanently prohibited.
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Clinical Context & Provenance */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
          1. Clinical Context & Patient Association
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {/* Patient Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Patient <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => handlePatientChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="">-- Select Patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.patient_identifier} — {p.first_name} {p.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Episode of Care Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Episode of Care <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={selectedEpisodeId}
              onChange={(e) => setSelectedEpisodeId(e.target.value)}
              disabled={!selectedPatientId || episodes.length === 0}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                backgroundColor: !selectedPatientId ? '#f8fafc' : '#ffffff',
              }}
            >
              <option value="">-- Select Episode --</option>
              {episodes.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.episode_identifier} — {ep.title} ({ep.status})
                </option>
              ))}
            </select>
            {selectedPatientId && episodes.length === 0 && (
              <span style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem', display: 'block' }}>
                This patient has no active episodes. An episode is required to prescribe an exercise program.
              </span>
            )}
          </div>

          {/* Clinical Visit (Optional Provenance) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Associated Clinical Visit <span style={{ color: '#64748b', fontWeight: 400 }}>(Optional Encounter Link)</span>
            </label>
            <select
              value={selectedVisitId}
              onChange={(e) => setSelectedVisitId(e.target.value)}
              disabled={!selectedPatientId}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                backgroundColor: !selectedPatientId ? '#f8fafc' : '#ffffff',
              }}
            >
              <option value="">-- No Direct Visit Link (Stand-alone prescription) --</option>
              {visits.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.visit_identifier} — {v.actual_start ? new Date(v.actual_start).toLocaleDateString() : 'Encounter'} ({v.status})
                </option>
              ))}
            </select>
          </div>

          {/* Prescribing Clinician */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Prescribing Clinician <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={selectedClinicianId}
              onChange={(e) => setSelectedClinicianId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="">-- Select Clinician --</option>
              {clinicians.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Program Header & Instructions */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
          2. Program Overview & Schedule
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Program Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Lumbar Stabilization & Gluteal Strengthening Routine"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Start Date <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Review Date <span style={{ color: '#64748b', fontWeight: 400 }}>(Optional Progress Check)</span>
            </label>
            <input
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
            General Patient Instructions & Precautions
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Perform exercises on a comfortable floor mat. If pain exceeds 4/10 or becomes sharp, cease immediately and notify the clinic."
            value={generalInstructions}
            onChange={(e) => setGeneralInstructions(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* Section 3: Prescribed Exercise Items */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
              3. Prescribed Exercise Items ({prescribedItems.length})
            </h2>
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              Configure individual dosage parameters: sets, reps, holds, frequency, and specific cues.
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowExerciseModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            + Add Exercise from Catalogue
          </button>
        </div>

        {prescribedItems.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '2.5rem 1rem',
              border: '2px dashed #cbd5e1',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
            }}
          >
            <Dumbbell size={32} style={{ color: '#94a3b8', marginBottom: '0.5rem' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', margin: '0 0 0.25rem 0' }}>
              No Exercises Prescribed Yet
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 1rem 0' }}>
              Click the button below to browse evidence-based exercises and tailor dosages.
            </p>
            <button
              type="button"
              onClick={() => setShowExerciseModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              Browse Exercise Catalogue
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {prescribedItems.map((item, index) => (
              <div
                key={item.tempId}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: '#fbfcfd',
                }}
              >
                {/* Item Header */}
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
                    <span
                      style={{
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {index + 1}
                    </span>
                    <strong style={{ fontSize: '0.9375rem', color: '#0f172a' }}>{item.exercise_name}</strong>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        textTransform: 'capitalize',
                      }}
                    >
                      {item.exercise_category.replace('_', ' ')}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        textTransform: 'capitalize',
                      }}
                    >
                      {item.exercise_body_region.replace('_', ' ')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>

                {/* Exercise Visual & Dosage Controls */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <ExerciseVisualCard
                    exerciseId={item.exercise_id}
                    exerciseName={item.exercise_name}
                    bodyRegion={item.exercise_body_region}
                    category={item.exercise_category}
                    size="sm"
                    showApprovalBadge={true}
                    style={{ flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    {/* Dosage Input Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '0.75rem',
                        marginBottom: '0.75rem',
                      }}
                    >
                  {/* Laterality */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Laterality
                    </label>
                    <select
                      value={item.laterality}
                      onChange={(e) => handleItemFieldChange(index, 'laterality', e.target.value as ExerciseLaterality)}
                      style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8125rem' }}
                    >
                      <option value="na">N/A</option>
                      <option value="bilateral">Bilateral</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                      <option value="unilateral">Unilateral</option>
                    </select>
                  </div>

                  {/* Sets */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Sets
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 3"
                      value={item.sets || ''}
                      onChange={(e) => handleItemFieldChange(index, 'sets', e.target.value ? parseInt(e.target.value, 10) : null)}
                      style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8125rem' }}
                    />
                  </div>

                  {/* Reps */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Reps
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 10"
                      value={item.repetitions || ''}
                      onChange={(e) => handleItemFieldChange(index, 'repetitions', e.target.value ? parseInt(e.target.value, 10) : null)}
                      style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8125rem' }}
                    />
                  </div>

                  {/* Hold Seconds */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Hold (sec)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 5"
                      value={item.hold_seconds || ''}
                      onChange={(e) => handleItemFieldChange(index, 'hold_seconds', e.target.value ? parseInt(e.target.value, 10) : null)}
                      style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8125rem' }}
                    />
                  </div>

                  {/* Frequency */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Frequency
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2x daily"
                      value={item.frequency || ''}
                      onChange={(e) => handleItemFieldChange(index, 'frequency', e.target.value)}
                      style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8125rem' }}
                    />
                  </div>

                  {/* Intensity / Load */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Resistance / Load
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bodyweight, Band"
                      value={item.intensity_load || ''}
                      onChange={(e) => handleItemFieldChange(index, 'intensity_load', e.target.value)}
                      style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8125rem' }}
                    />
                  </div>
                </div>

                {/* Specific Instructions & Technique Cues */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Patient Cues & Instructions
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Squeeze shoulder blades together, don't hike shoulders"
                      value={item.instructions || ''}
                      onChange={(e) => handleItemFieldChange(index, 'instructions', e.target.value)}
                      style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8125rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Specific Precautions
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Stop if numbness or pins-and-needles occurs"
                      value={item.precautions || ''}
                      onChange={(e) => handleItemFieldChange(index, 'precautions', e.target.value)}
                      style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8125rem' }}
                    />
                  </div>
                </div>
                </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '1rem',
          padding: '1.25rem 0',
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (isDirty) {
              if (window.confirm('You have unsaved changes in your exercise program draft. Your work is safely preserved. Return to exercise programs list?')) {
                navigate('/app/hep');
              }
            } else {
              navigate('/app/hep');
            }
          }}
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#475569',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit(false)}
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#1e293b',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Saving...' : 'Save as Draft'}
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setShowActivateConfirm(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          <CheckCircle2 size={16} />
          {isSubmitting ? 'Activating...' : 'Finalize & Activate Program'}
        </button>
      </div>

      {/* Modal: Exercise Catalogue Picker */}
      {showExerciseModal && (
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
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>
                  Exercise Catalogue
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                  Select an exercise to add to the prescription.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExerciseModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Filters */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search exercises..."
                  value={exerciseSearchTerm}
                  onChange={(e) => setExerciseSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.75rem 0.4rem 2rem',
                    fontSize: '0.8125rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <select
                value={exerciseCategoryFilter}
                onChange={(e) => setExerciseCategoryFilter(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8125rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="all">All Categories</option>
                <option value="strengthening">Strengthening</option>
                <option value="stretching">Stretching</option>
                <option value="mobility">Mobility</option>
                <option value="balance">Balance</option>
                <option value="aerobic">Aerobic</option>
                <option value="neuromuscular">Neuromuscular</option>
                <option value="functional">Functional</option>
                <option value="other">Other</option>
              </select>

              <select
                value={exerciseRegionFilter}
                onChange={(e) => setExerciseRegionFilter(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8125rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="all">All Anatomical Regions</option>
                <option value="cervical">Cervical Spine</option>
                <option value="thoracic">Thoracic Spine</option>
                <option value="lumbar">Lumbar Spine / Core</option>
                <option value="shoulder">Shoulder</option>
                <option value="elbow">Elbow</option>
                <option value="wrist_hand">Wrist / Hand</option>
                <option value="hip">Hip</option>
                <option value="knee">Knee</option>
                <option value="ankle_foot">Ankle / Foot</option>
                <option value="full_body">Full Body</option>
                <option value="other">Other / Pelvic</option>
              </select>
            </div>

            {/* Modal Exercise List */}
            <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredExercises.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.875rem' }}>
                  No exercises match your filter criteria.
                </div>
              ) : (
                filteredExercises.map((ex) => (
                  <div
                    key={ex.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.875rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      transition: 'border-color 0.15s ease',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <ExerciseVisualCard
                      exerciseId={ex.id}
                      exerciseName={ex.name}
                      bodyRegion={ex.body_region}
                      category={ex.category}
                      size="sm"
                      showApprovalBadge={true}
                      style={{ flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.9375rem', color: '#0f172a' }}>{ex.name}</strong>
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            textTransform: 'capitalize',
                          }}
                        >
                          {ex.category.replace('_', ' ')}
                        </span>
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            textTransform: 'capitalize',
                          }}
                        >
                          {ex.body_region.replace('_', ' ')}
                        </span>
                        {ex.equipment && (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 500,
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                            }}
                          >
                            Equip: {ex.equipment}
                          </span>
                        )}
                        {!ex.is_system && (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              backgroundColor: '#ecfdf5',
                              color: '#047857',
                            }}
                          >
                            Practice Custom
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8125rem', color: '#475569', lineHeight: 1.4 }}>
                        {ex.description || 'Evidence-based exercise routine.'}
                      </p>
                      {ex.precautions && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#b45309', fontStyle: 'italic' }}>
                          Caution: {ex.precautions}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddExercise(ex)}
                      style={{
                        padding: '0.45rem 0.875rem',
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      + Prescribe
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                backgroundColor: '#f8fafc',
              }}
            >
              <button
                type="button"
                onClick={() => setShowExerciseModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Finalize & Activate */}
      {showActivateConfirm && (
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
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>
                  Finalize & Activate Prescription?
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                  Locking clinical exercise prescription
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Activating this program marks it as an active clinical order.
              <strong> Prescribed exercise items and dosages will become permanently immutable.</strong>
              Are you sure you want to proceed?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowActivateConfirm(false)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(true)}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? 'Activating...' : 'Yes, Activate Prescription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
