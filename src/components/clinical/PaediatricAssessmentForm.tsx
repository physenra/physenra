import React, { useState, useEffect } from 'react';
import {
  clinicalAssessmentService,
  PAEDS_EXAMINATION_DEFINITION_CODE,
  formatPaediatricAge,
} from '../../services/clinicalAssessmentService';
import type {
  ClinicalAssessmentDefinition,
  ClinicalAssessmentInstance,
} from '../../types/models';

export interface PaediatricAssessmentFormProps {
  patientId: string;
  patientDob?: string | null;
  patientName?: string;
  visitId: string;
  episodeId?: string | null;
  assessorId: string;
  initialAssessmentId?: string;
  initialData?: Record<string, any>;
  initialStatus?: 'draft' | 'finalized' | 'amended';
  onSuccess?: (assessment: ClinicalAssessmentInstance) => void;
  onCancel?: () => void;
}

export const MILESTONE_STATE_OPTIONS = [
  'Achieved',
  'Emerging',
  'Not Yet Achieved',
  'Not Assessed',
  'Unable to Determine',
];

export const CAREGIVER_PRESENT_OPTIONS = [
  'Mother',
  'Father',
  'Both Parents',
  'Grandparent',
  'Foster Carer',
  'Legal Guardian',
  'Other Family Member / Carer',
  'Unaccompanied (Adolescent)',
  'NT',
];

export const REFERRAL_REASON_OPTIONS = [
  'Gross Motor Development Concerns',
  'Postural Alignment / Torticollis / Plagiocephaly',
  'Gait Abnormality / In-toeing / Toe-Walking',
  'Neuromotor Impairment / Cerebral Palsy Assessment',
  'Developmental Coordination Difficulty',
  'Musculoskeletal Injury / Pain',
  'Post-Surgical / Orthopaedic Rehabilitation',
  'Other Paediatric Concern',
  'NT',
];

export const TONE_STATE_OPTIONS = [
  'Typical / Normal Tone',
  'Hypotonia / Low Tone Dominant',
  'Hypertonia / Increased Tone Dominant',
  'Fluctuating / Dystonic Tone',
  'Mixed Tone Presentation',
  'NT',
];

export const GMFCS_OPTIONS = [
  'Not Applicable / Typical Development',
  'GMFCS Level I',
  'GMFCS Level II',
  'GMFCS Level III',
  'GMFCS Level IV',
  'GMFCS Level V',
  'NT',
];

export const PROTECTIVE_REACTIONS_OPTIONS = [
  'Present Anterior, Lateral & Posterior',
  'Anterior Present; Lateral/Posterior Delayed',
  'Delayed / Inconsistent Bilaterally',
  'Absent Protective Extension',
  'NT',
];

export const PaediatricAssessmentForm: React.FC<PaediatricAssessmentFormProps> = ({
  patientId,
  patientDob,
  patientName,
  visitId,
  episodeId,
  assessorId,
  initialAssessmentId,
  initialData = {},
  initialStatus = 'draft',
  onSuccess,
  onCancel,
}) => {
  const [definition, setDefinition] = useState<ClinicalAssessmentDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('context');
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  // Derived patient age (authoritative from patientDob, never duplicate-stored in payload)
  const derivedAgeDisplay = formatPaediatricAge(patientDob);

  // Structured form state
  const [formData, setFormData] = useState<Record<string, any>>({
    // 1. Clinical Context
    referral_reason: initialData.referral_reason || 'Gross Motor Development Concerns',
    caregiver_present: initialData.caregiver_present || 'Mother',
    birth_perinatal_history: initialData.birth_perinatal_history || '',
    developmental_medical_history: initialData.developmental_medical_history || '',

    // 2. Developmental Milestones
    milestone_head_control: initialData.milestone_head_control || 'Achieved',
    milestone_rolling: initialData.milestone_rolling || 'Achieved',
    milestone_sitting: initialData.milestone_sitting || 'Achieved',
    milestone_crawling: initialData.milestone_crawling || 'Achieved',
    milestone_standing: initialData.milestone_standing || 'Achieved',
    milestone_walking: initialData.milestone_walking || 'Achieved',
    milestone_running: initialData.milestone_running || 'Achieved',
    milestone_stair_mobility: initialData.milestone_stair_mobility || 'Achieved',
    milestone_notes: initialData.milestone_notes || '',

    // 3. Gross Motor Development
    prone_head_control: initialData.prone_head_control || 'Age Appropriate / Mature',
    sitting_posture: initialData.sitting_posture || 'Independent Upright (Stable)',
    floor_mobility: initialData.floor_mobility || 'Reciprocal Crawling (Hands & Knees)',
    gross_motor_symmetry: initialData.gross_motor_symmetry || 'Symmetric Both Sides',
    gmfcs_classification: initialData.gmfcs_classification || 'Not Applicable / Typical Development',
    gross_motor_notes: initialData.gross_motor_notes || '',

    // 4. Fine Motor Observation
    reaching_targeting: initialData.reaching_targeting || 'Accurate Direct Reach',
    grasp_release: initialData.grasp_release || 'Mature Pincer / Radial Grasp with Voluntary Release',
    bilateral_hand_use: initialData.bilateral_hand_use || 'Brings Hands to Midline & Bimanual Transfer',
    fine_motor_notes: initialData.fine_motor_notes || '',

    // 5. Tone & Movement Quality
    general_muscle_tone: initialData.general_muscle_tone || 'Typical / Normal Tone',
    movement_fluidity: initialData.movement_fluidity || 'Fluid & Varied Movement Patterns',
    involuntary_movements: initialData.involuntary_movements || 'None Observed',
    tone_notes: initialData.tone_notes || '',

    // 6. Posture & Musculoskeletal Alignment
    head_alignment: initialData.head_alignment || 'Midline & Symmetrical',
    spinal_alignment: initialData.spinal_alignment || 'Neutral & Flexible Alignment',
    lower_limb_alignment: initialData.lower_limb_alignment || 'Within Typical Range',
    posture_notes: initialData.posture_notes || '',

    // 7. Balance & Coordination
    static_balance: initialData.static_balance || 'Stable in Age-Appropriate Postures',
    protective_reactions: initialData.protective_reactions || 'Present Anterior, Lateral & Posterior',
    coordination_quality: initialData.coordination_quality || 'Smooth & Well Coordinated',
    balance_notes: initialData.balance_notes || '',

    // 8. Functional Mobility
    floor_to_stand: initialData.floor_to_stand || 'Independent without External Support',
    walking_mobility: initialData.walking_mobility || 'Independent Community Ambulator',
    assistive_device: initialData.assistive_device || 'None / Independent',
    stair_mobility: initialData.stair_mobility || 'Reciprocal Feet Up & Down Independently',
    functional_mobility_notes: initialData.functional_mobility_notes || '',

    // 9. Play & Participation
    play_engagement: initialData.play_engagement || 'Active Exploration & Varied Play',
    caregiver_concerns_goals: initialData.caregiver_concerns_goals || '',

    // 10. Summary
    clinical_summary: initialData.clinical_summary || '',
  });

  const [clinicalNotes, setClinicalNotes] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        let def = await clinicalAssessmentService.getDefinitionByCode(PAEDS_EXAMINATION_DEFINITION_CODE, 1);
        if (!def) {
          const defs = await clinicalAssessmentService.getDefinitions('paediatric');
          def = defs.find((d) => d.code === PAEDS_EXAMINATION_DEFINITION_CODE) || defs[0] || null;
        }
        setDefinition(def);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize paediatric examination form.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [visitId]);

  const updateField = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (finalize: boolean) => {
    if (!definition) {
      setError('Cannot save assessment: Missing paediatric definition.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Summary findings synthesis
      const summaryText = `Age: ${derivedAgeDisplay} | Referral: ${formData.referral_reason} | Tone: ${formData.general_muscle_tone} | Ambulation: ${formData.walking_mobility}`;

      let result: ClinicalAssessmentInstance;

      if (initialAssessmentId) {
        if (initialStatus === 'draft') {
          result = await clinicalAssessmentService.updateDraftAssessment(initialAssessmentId, {
            structured_data: formData,
            summary_findings: summaryText,
            clinical_notes: clinicalNotes || null,
          });

          if (finalize) {
            result = await clinicalAssessmentService.finalizeAssessment(initialAssessmentId, assessorId);
          }
        } else {
          throw new Error('Finalized assessments require an official amendment.');
        }
      } else {
        result = await clinicalAssessmentService.createAssessment({
          patient_id: patientId,
          episode_id: episodeId || null,
          clinical_visit_id: visitId,
          definition_id: definition.id,
          assessor_id: assessorId,
          status: finalize ? 'finalized' : 'draft',
          structured_data: formData,
          summary_findings: summaryText,
          clinical_notes: clinicalNotes || null,
        });
      }

      setShowFinalizeModal(false);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save paediatric assessment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        Loading paediatric examination module...
      </div>
    );
  }

  const sections = [
    { id: 'context', label: '1. Context & History' },
    { id: 'milestones', label: '2. Milestones' },
    { id: 'gross_motor', label: '3. Gross Motor' },
    { id: 'fine_motor', label: '4. Fine Motor' },
    { id: 'tone', label: '5. Tone & Quality' },
    { id: 'posture', label: '6. Posture & Spine' },
    { id: 'balance', label: '7. Balance & Reactions' },
    { id: 'mobility', label: '8. Functional Mobility' },
    { id: 'play', label: '9. Play & Caregiver Goals' },
    { id: 'summary', label: '10. Summary & Notes' },
  ];

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      {/* Header Banner */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: '#ecfdf5',
          borderBottom: '1px solid #d1fae5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#059669',
                backgroundColor: '#d1fae5',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                textTransform: 'uppercase',
              }}
            >
              Paediatric Module V1
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#064e3b', margin: 0 }}>
              Structured Paediatric Physiotherapy Examination
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#047857' }}>
            {patientName ? <strong>{patientName} &bull; </strong> : null}
            Derived Age: <strong>{derivedAgeDisplay}</strong>
            {patientDob ? ` (Authoritative DOB: ${patientDob})` : ' (No DOB on file)'}
            {' '}&bull; Observational clinical documentation only. Zero automated developmental diagnosis.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              style={{
                padding: '0.5rem 1rem',
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
          )}
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSubmitting}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #059669',
              backgroundColor: '#ffffff',
              color: '#059669',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => setShowFinalizeModal(true)}
            disabled={isSubmitting}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#059669',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            Finalize Examination
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div style={{ margin: '1rem 1.5rem 0', padding: '0.75rem 1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Navigation tabs for Tablet/Desktop */}
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          padding: '0.5rem 1rem 0',
          gap: '0.25rem',
        }}
      >
        {sections.map((sec) => {
          const isActive = activeTab === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveTab(sec.id)}
              style={{
                padding: '0.5rem 0.875rem',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#059669' : '#64748b',
                backgroundColor: isActive ? '#ffffff' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? '#e2e8f0' : 'transparent',
                borderBottomColor: isActive ? '#ffffff' : 'transparent',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                marginBottom: '-1px',
              }}
            >
              {sec.label}
            </button>
          );
        })}
      </div>

      {/* Form Content Body */}
      <div style={{ padding: '1.5rem' }}>
        {/* Section 1: Clinical Context & Caregiver */}
        {activeTab === 'context' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              1. Developmental & Clinical Context
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Primary reason for physiotherapy referral, perinatal background, and accompanying caregiver during encounter.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Primary Reason for Physiotherapy / Referral Context *
                </label>
                <select
                  value={formData.referral_reason}
                  onChange={(e) => updateField('referral_reason', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                >
                  {REFERRAL_REASON_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Caregiver Accompanying Child During Encounter *
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {CAREGIVER_PRESENT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateField('caregiver_present', opt)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        border: '1px solid',
                        borderColor: formData.caregiver_present === opt ? '#059669' : '#cbd5e1',
                        backgroundColor: formData.caregiver_present === opt ? '#ecfdf5' : '#ffffff',
                        color: formData.caregiver_present === opt ? '#065f46' : '#334155',
                        fontWeight: formData.caregiver_present === opt ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' }}>
                  Accompanying caregiver records clinical attendance context and does not alter permanent legal guardian / consent records.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Perinatal & Birth History (If Clinically Relevant)
                </label>
                <textarea
                  rows={3}
                  value={formData.birth_perinatal_history}
                  onChange={(e) => updateField('birth_perinatal_history', e.target.value)}
                  placeholder="e.g. Born at 34 weeks gestation (preterm), birth weight 2.1kg, 2 weeks SCBU stay for respiratory support, no intraventricular haemorrhage..."
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Relevant Medical & Developmental History
                </label>
                <textarea
                  rows={3}
                  value={formData.developmental_medical_history}
                  onChange={(e) => updateField('developmental_medical_history', e.target.value)}
                  placeholder="e.g. Congenital muscular torticollis diagnosed at 2 months, ongoing paediatrician follow-up, hearing screen passed, no seizure history..."
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Developmental Milestones */}
        {activeTab === 'milestones' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              2. Developmental Milestones
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Clinical observation of milestone attainment. Controlled states: Achieved, Emerging, Not Yet Achieved, Not Assessed, Unable to Determine. Zero automated developmental diagnosis.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {[
                { id: 'milestone_head_control', label: 'Head Control (Prone/sitting)' },
                { id: 'milestone_rolling', label: 'Rolling (Prone & Supine)' },
                { id: 'milestone_sitting', label: 'Independent Sitting' },
                { id: 'milestone_crawling', label: 'Crawling (Hands & Knees)' },
                { id: 'milestone_standing', label: 'Independent Standing' },
                { id: 'milestone_walking', label: 'Independent Walking' },
                { id: 'milestone_running', label: 'Running (Flight Phase)' },
                { id: 'milestone_stair_mobility', label: 'Stair Mobility' },
              ].map((m) => (
                <div key={m.id} style={{ backgroundColor: '#f8fafc', padding: '0.875rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.375rem' }}>
                    {m.label} *
                  </div>
                  <select
                    value={formData[m.id]}
                    onChange={(e) => updateField(m.id, e.target.value)}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8125rem' }}
                  >
                    {MILESTONE_STATE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              ))}

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Developmental Milestones Clinical Observations
                </label>
                <textarea
                  rows={2}
                  value={formData.milestone_notes}
                  onChange={(e) => updateField('milestone_notes', e.target.value)}
                  placeholder="e.g. Achieved sitting at 7 months; currently emerging pulling to stand using coffee table with symmetrical lower extremity weight bearing..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Gross Motor */}
        {activeTab === 'gross_motor' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              3. Gross Motor Development & Postural Control
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Antigravity head and trunk alignment, floor mobility, bilateral symmetry, and observational GMFCS level.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Prone: Head Lift & Forearm Support *
                </label>
                <select
                  value={formData.prone_head_control}
                  onChange={(e) => updateField('prone_head_control', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Age Appropriate / Mature">Age Appropriate / Mature</option>
                  <option value="Emerging (45 deg lift)">Emerging (45 deg lift)</option>
                  <option value="Transient / Inconsistent">Transient / Inconsistent</option>
                  <option value="Unable / Marked Lag">Unable / Marked Lag</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Sitting Posture & Trunk Alignment *
                </label>
                <select
                  value={formData.sitting_posture}
                  onChange={(e) => updateField('sitting_posture', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Independent Upright (Stable)">Independent Upright (Stable)</option>
                  <option value="Propped / Ring Sitting with Hands">Propped / Ring Sitting with Hands</option>
                  <option value="Kyphotic / Requires Pelvic Support">Kyphotic / Requires Pelvic Support</option>
                  <option value="Unable without Full External Support">Unable without Full External Support</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Floor Mobility & Transitional Movement *
                </label>
                <select
                  value={formData.floor_mobility}
                  onChange={(e) => updateField('floor_mobility', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Reciprocal Crawling (Hands & Knees)">Reciprocal Crawling (Hands & Knees)</option>
                  <option value="Commando / Belly Crawling">Commando / Belly Crawling</option>
                  <option value="Bottom Shuffling">Bottom Shuffling</option>
                  <option value="Rolls for Mobility">Rolls for Mobility</option>
                  <option value="Stationary / Unable">Stationary / Unable</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Bilateral Gross Motor Symmetry *
                </label>
                <select
                  value={formData.gross_motor_symmetry}
                  onChange={(e) => updateField('gross_motor_symmetry', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Symmetric Both Sides">Symmetric Both Sides</option>
                  <option value="Mild Asymmetry Observed">Mild Asymmetry Observed</option>
                  <option value="Marked Hemilateral Asymmetry">Marked Hemilateral Asymmetry</option>
                  <option value="Fluctuating Asymmetry">Fluctuating Asymmetry</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  GMFCS Classification (If Clinically Applicable) *
                </label>
                <select
                  value={formData.gmfcs_classification}
                  onChange={(e) => updateField('gmfcs_classification', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {GMFCS_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Gross Motor Observations
                </label>
                <textarea
                  rows={2}
                  value={formData.gross_motor_notes}
                  onChange={(e) => updateField('gross_motor_notes', e.target.value)}
                  placeholder="e.g. Transitions easily from prone to quadruped; sits with widened base of support..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Fine Motor */}
        {activeTab === 'fine_motor' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              4. Fine Motor & Upper Limb Observation
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Limited observational screening of reaching, grasp, and bilateral hand use during functional play.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Reaching & Upper Limb Targeting *
                </label>
                <select
                  value={formData.reaching_targeting}
                  onChange={(e) => updateField('reaching_targeting', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Accurate Direct Reach">Accurate Direct Reach</option>
                  <option value="Undershoots / Tremor Observed">Undershoots / Tremor Observed</option>
                  <option value="Asymmetric Reaching (Unilateral Preference)">Asymmetric Reaching (Unilateral Preference)</option>
                  <option value="Unable to Initiate Reach">Unable to Initiate Reach</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Grasp & Voluntary Release *
                </label>
                <select
                  value={formData.grasp_release}
                  onChange={(e) => updateField('grasp_release', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Mature Pincer / Radial Grasp with Voluntary Release">Mature Pincer / Radial Grasp with Voluntary Release</option>
                  <option value="Palmar / Primitive Grasp with Inconsistent Release">Palmar / Primitive Grasp with Inconsistent Release</option>
                  <option value="Weak Grasp / Fisting Present">Weak Grasp / Fisting Present</option>
                  <option value="No Voluntary Grasp Observed">No Voluntary Grasp Observed</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Bilateral Hand Use & Midline Play
                </label>
                <select
                  value={formData.bilateral_hand_use}
                  onChange={(e) => updateField('bilateral_hand_use', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Brings Hands to Midline & Bimanual Transfer">Brings Hands to Midline & Bimanual Transfer</option>
                  <option value="One Hand Dominates / Neglects Other">One Hand Dominates / Neglects Other</option>
                  <option value="Unable to Cross Midline">Unable to Cross Midline</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Fine Motor Functional Observations
                </label>
                <textarea
                  rows={2}
                  value={formData.fine_motor_notes}
                  onChange={(e) => updateField('fine_motor_notes', e.target.value)}
                  placeholder="e.g. Uses bilateral hands to manipulate rattles; transfers object hand to hand without dropped grasp..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Tone & Movement */}
        {activeTab === 'tone' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              5. Muscle Tone & Movement Quality
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              General resting muscle tone, movement fluidity, and involuntary movement screening. (Formal MAS spasticity screen remains available via Neurology V1).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  General Resting Muscle Tone *
                </label>
                <select
                  value={formData.general_muscle_tone}
                  onChange={(e) => updateField('general_muscle_tone', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {TONE_STATE_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Movement Fluidity & Variability *
                </label>
                <select
                  value={formData.movement_fluidity}
                  onChange={(e) => updateField('movement_fluidity', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Fluid & Varied Movement Patterns">Fluid & Varied Movement Patterns</option>
                  <option value="Stereotyped / Monotonous Patterns">Stereotyped / Monotonous Patterns</option>
                  <option value="Jerky / Tremulous Movements">Jerky / Tremulous Movements</option>
                  <option value="Paucity of Spontaneous Movement">Paucity of Spontaneous Movement</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Involuntary Movements Observed
                </label>
                <select
                  value={formData.involuntary_movements}
                  onChange={(e) => updateField('involuntary_movements', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="None Observed">None Observed</option>
                  <option value="Dystonic Posturing">Dystonic Posturing</option>
                  <option value="Choreoathetosis Observed">Choreoathetosis Observed</option>
                  <option value="Tremor Present">Tremor Present</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Tone Distribution & Qualitative Movement Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.tone_notes}
                  onChange={(e) => updateField('tone_notes', e.target.value)}
                  placeholder="e.g. Mild axial hypotonia with typical extremity tone; no clonus observed..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 6: Posture & Alignment */}
        {activeTab === 'posture' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              6. Posture & Musculoskeletal Alignment
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Head alignment, spinal posture, and lower extremity alignment observations.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Head Alignment & Cervical Posture *
                </label>
                <select
                  value={formData.head_alignment}
                  onChange={(e) => updateField('head_alignment', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Midline & Symmetrical">Midline & Symmetrical</option>
                  <option value="Persistent Tilt to Right">Persistent Tilt to Right</option>
                  <option value="Persistent Tilt to Left">Persistent Tilt to Left</option>
                  <option value="Persistent Rotation Preference">Persistent Rotation Preference</option>
                  <option value="Extensor Posturing / Head Lag">Extensor Posturing / Head Lag</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Spine & Trunk Alignment *
                </label>
                <select
                  value={formData.spinal_alignment}
                  onChange={(e) => updateField('spinal_alignment', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Neutral & Flexible Alignment">Neutral & Flexible Alignment</option>
                  <option value="Postural Kyphosis Observed">Postural Kyphosis Observed</option>
                  <option value="Scoliotic Asymmetry Observed">Scoliotic Asymmetry Observed</option>
                  <option value="Hyperextension Posturing">Hyperextension Posturing</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Lower Limb Alignment Observations
                </label>
                <select
                  value={formData.lower_limb_alignment}
                  onChange={(e) => updateField('lower_limb_alignment', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Within Typical Range">Within Typical Range</option>
                  <option value="Excessive Genu Valgum / Varum">Excessive Genu Valgum / Varum</option>
                  <option value="In-toeing / Internal Rotation">In-toeing / Internal Rotation</option>
                  <option value="Out-toeing / External Rotation">Out-toeing / External Rotation</option>
                  <option value="Excessive Calcaneal Pronation / Flatfoot">Excessive Calcaneal Pronation / Flatfoot</option>
                  <option value="Equinus / Toe Contact">Equinus / Toe Contact</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Postural Alignment Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.posture_notes}
                  onChange={(e) => updateField('posture_notes', e.target.value)}
                  placeholder="e.g. Mild right plagiocephaly noted; active cervical rotation to right reaches 80 deg, left reaches 60 deg..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 7: Balance & Reactions */}
        {activeTab === 'balance' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              7. Balance & Protective Reactions
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Observational screening of static balance, protective extension, and equilibrium reactions.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Static Postural Balance *
                </label>
                <select
                  value={formData.static_balance}
                  onChange={(e) => updateField('static_balance', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Stable in Age-Appropriate Postures">Stable in Age-Appropriate Postures</option>
                  <option value="Mild Instability / Wide Base Required">Mild Instability / Wide Base Required</option>
                  <option value="Requires Constant Physical Support">Requires Constant Physical Support</option>
                  <option value="Unable to Maintain Stance / Sitting">Unable to Maintain Stance / Sitting</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Protective Reactions (Arms Extension) *
                </label>
                <select
                  value={formData.protective_reactions}
                  onChange={(e) => updateField('protective_reactions', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {PROTECTIVE_REACTIONS_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Motor Coordination & Cadence
                </label>
                <select
                  value={formData.coordination_quality}
                  onChange={(e) => updateField('coordination_quality', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Smooth & Well Coordinated">Smooth & Well Coordinated</option>
                  <option value="Mild Clumsiness / Tripping Observed">Mild Clumsiness / Tripping Observed</option>
                  <option value="Marked Dyscoordination / Ataxia">Marked Dyscoordination / Ataxia</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Balance & Reactions Observations
                </label>
                <textarea
                  rows={2}
                  value={formData.balance_notes}
                  onChange={(e) => updateField('balance_notes', e.target.value)}
                  placeholder="e.g. Lateral protective extension present bilaterally; posterior reactions emerging on perturbation..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 8: Functional Mobility */}
        {activeTab === 'mobility' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              8. Functional Mobility & Locomotion
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Everyday functional transitions, ambulation, stairs, and assistive mobility equipment.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Floor-to-Stand Transition *
                </label>
                <select
                  value={formData.floor_to_stand}
                  onChange={(e) => updateField('floor_to_stand', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Independent without External Support">Independent without External Support</option>
                  <option value="Independent with Quadruped / Half-Kneeling">Independent with Quadruped / Half-Kneeling</option>
                  <option value="Uses Furniture / External Hand Support">Uses Furniture / External Hand Support</option>
                  <option value="Requires Physical Assistance from Carer">Requires Physical Assistance from Carer</option>
                  <option value="Unable">Unable</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Walking & Ambulation Status *
                </label>
                <select
                  value={formData.walking_mobility}
                  onChange={(e) => updateField('walking_mobility', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Independent Community Ambulator">Independent Community Ambulator</option>
                  <option value="Independent Indoor Ambulator">Independent Indoor Ambulator</option>
                  <option value="Walks with Handheld Assist">Walks with Handheld Assist</option>
                  <option value="Walks with Assistive Device">Walks with Assistive Device</option>
                  <option value="Non-Ambulatory">Non-Ambulatory</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Assistive Device / Mobility Equipment *
                </label>
                <select
                  value={formData.assistive_device}
                  onChange={(e) => updateField('assistive_device', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="None / Independent">None / Independent</option>
                  <option value="Posterior / Anterior Walker">Posterior / Anterior Walker</option>
                  <option value="Crutches / Canes">Crutches / Canes</option>
                  <option value="Stroller / Adaptive Pushchair">Stroller / Adaptive Pushchair</option>
                  <option value="Manual Wheelchair">Manual Wheelchair</option>
                  <option value="Powered Wheelchair">Powered Wheelchair</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Stair Mobility
                </label>
                <select
                  value={formData.stair_mobility}
                  onChange={(e) => updateField('stair_mobility', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Reciprocal Feet Up & Down Independently">Reciprocal Feet Up & Down Independently</option>
                  <option value="Mark-Time (2 Feet per Step) with Handrail">Mark-Time (2 Feet per Step) with Handrail</option>
                  <option value="Creeps / Crawls on Stairs">Creeps / Crawls on Stairs</option>
                  <option value="Requires 1-to-1 Physical Assistance">Requires 1-to-1 Physical Assistance</option>
                  <option value="Unable / Non-Ambulatory on Stairs">Unable / Non-Ambulatory on Stairs</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Functional Locomotion & Endurance Observations
                </label>
                <textarea
                  rows={2}
                  value={formData.functional_mobility_notes}
                  onChange={(e) => updateField('functional_mobility_notes', e.target.value)}
                  placeholder="e.g. Walks independently with wide base; frequent trips over thresholds; stair navigation with rail..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 9: Play & Caregiver Goals */}
        {activeTab === 'play' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              9. Play & Caregiver Goals
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Child play engagement and caregiver-reported family functional priorities.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Play Engagement & Environmental Exploration *
                </label>
                <select
                  value={formData.play_engagement}
                  onChange={(e) => updateField('play_engagement', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                >
                  <option value="Active Exploration & Varied Play">Active Exploration & Varied Play</option>
                  <option value="Requires Encouragement / Facilitation">Requires Encouragement / Facilitation</option>
                  <option value="Sedentary / Reluctant to Explore">Sedentary / Reluctant to Explore</option>
                  <option value="Severely Limited by Physical Access">Severely Limited by Physical Access</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Caregiver-Reported Concerns & Family Functional Goals
                </label>
                <textarea
                  rows={4}
                  value={formData.caregiver_concerns_goals}
                  onChange={(e) => updateField('caregiver_concerns_goals', e.target.value)}
                  placeholder="e.g. Parents report concern regarding child tripping frequently when playing outside; priority goal is independent stair climbing at nursery school..."
                  style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 10: Summary & Notes */}
        {activeTab === 'summary' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              10. Clinical Examination Summary & Notes
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Clinician synthesis of paediatric examination findings and functional goals. Pure observational documentation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Paediatric Examination Findings & Functional Impact
                </label>
                <textarea
                  rows={4}
                  value={formData.clinical_summary}
                  onChange={(e) => updateField('clinical_summary', e.target.value)}
                  placeholder="Synthesize developmental observations, motor abilities, functional impact, and physiotherapy recommendations..."
                  style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Additional Clinician Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Additional context or practitioner documentation..."
                  style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div
        style={{
          padding: '1rem 1.5rem',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
          * Indicates required observational field in structured paediatric screen.
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              style={{
                padding: '0.5rem 1rem',
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
          )}
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSubmitting}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              border: '1px solid #059669',
              backgroundColor: '#ffffff',
              color: '#059669',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => setShowFinalizeModal(true)}
            disabled={isSubmitting}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#059669',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            Finalize Examination
          </button>
        </div>
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
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.125rem', fontWeight: 600 }}>
              Finalize Paediatric Examination?
            </h3>
            <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Finalizing this paediatric examination locks its structured data. Once finalized, observations cannot be silently altered or deleted. Corrections will require an official amendment with an explicit reason.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setShowFinalizeModal(false)}
                disabled={isSubmitting}
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
                onClick={() => handleSave(true)}
                disabled={isSubmitting}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#059669',
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
