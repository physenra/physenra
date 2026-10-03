import React, { useState, useEffect } from 'react';
import {
  clinicalAssessmentService,
  NEURO_EXAMINATION_DEFINITION_CODE,
} from '../../services/clinicalAssessmentService';
import type {
  ClinicalAssessmentDefinition,
  ClinicalAssessmentInstance,
} from '../../types/models';

export interface NeurologyAssessmentFormProps {
  patientId: string;
  visitId: string;
  episodeId?: string | null;
  assessorId: string;
  initialAssessmentId?: string;
  initialData?: Record<string, any>;
  initialStatus?: 'draft' | 'finalized' | 'amended';
  onSuccess?: (assessment: ClinicalAssessmentInstance) => void;
  onCancel?: () => void;
}

export const MAS_OPTIONS = ['0', '1', '1+', '2', '3', '4', 'NT'];
export const REFLEX_OPTIONS = ['0', '1+', '2+', '3+', '4+', 'NT'];
export const CLONUS_OPTIONS = ['Absent', 'Unsustained (<5 beats)', 'Sustained (>=5 beats)', 'NT'];

export const ALERTNESS_OPTIONS = [
  'Alert & Fully Participative',
  'Alert & Requires Frequent Prompting',
  'Lethargic / Fluctuating Alertness',
  'Minimally Responsive / Obtunded',
  'NT',
];

export const SENSATION_MODALITY_OPTIONS = [
  'Intact Bilaterally',
  'Impaired Left',
  'Impaired Right',
  'Impaired Bilateral / Absent',
  'NT',
];

export const PROPRIOCEPTION_OPTIONS = [
  'Intact / Accurate Joint Position',
  'Impaired Distal / Intact Proximal',
  'Markedly Impaired / Absent',
  'NT',
];

export const COORDINATION_UPPER_OPTIONS = [
  'Smooth & Accurate',
  'Mild Dysmetria / Intention Tremor',
  'Marked Dysmetria / Decomposition',
  'Unable to Perform / Severe Ataxia',
  'NT',
];

export const MOTOR_CONTROL_OPTIONS = [
  'Isolated Selective Movement',
  'Synergistic Movement Dominant',
  'Minimal / Trace Voluntary Activation',
  'Flaccid / No Movement',
  'NT',
];

export const GAIT_ASSISTANCE_OPTIONS = [
  'Independent (Community)',
  'Independent (Indoor Only)',
  'Supervision / Standby Assist',
  'Contact Guard / Minimal Assist',
  'Moderate / Maximum Assist',
  'Non-Ambulatory / Wheelchair',
  'NT',
];

export const ASSISTIVE_DEVICE_OPTIONS = [
  'None / Independent',
  'Single Point Cane',
  'Quad Cane',
  'Axillary / Elbow Crutches',
  'Rollator / Wheeled Walker',
  'Standard Walker',
  'Manual Wheelchair',
  'Power Wheelchair',
  'NT',
];

export const BED_MOBILITY_OPTIONS = [
  'Independent (Rolling & Bridging)',
  'Minimal Assist / Uses Bedrail',
  'Moderate to Maximum Assist',
  'Dependent',
  'NT',
];

export const SIT_TO_STAND_OPTIONS = [
  'Independent without Arms',
  'Independent with Arms',
  'Requires 1-Person Physical Assist',
  'Requires 2-Person / Mechanical Lift',
  'NT',
];

export const TRANSFERS_OPTIONS = [
  'Independent (Bed to Chair)',
  'Supervision / Setup',
  'Assisted (Pivot / Sliding Board)',
  'Dependent / Mechanical Lift',
  'NT',
];

export const NeurologyAssessmentForm: React.FC<NeurologyAssessmentFormProps> = ({
  patientId,
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
  const [activeTab, setActiveTab] = useState<string>('general');
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  // Authoritative outcome measure references (BBS, TUG)
  const [availableOutcomes, setAvailableOutcomes] = useState<any[]>([]);

  // Structured form state
  const [formData, setFormData] = useState<Record<string, any>>({
    // 1. General Observation
    alertness_participation: initialData.alertness_participation || 'Alert & Fully Participative',
    communication_cognition: initialData.communication_cognition || '',
    general_presentation: initialData.general_presentation || '',
    precautions_observations: initialData.precautions_observations || '',

    // 2. Upper Tone (MAS)
    biceps_tone_left: initialData.biceps_tone_left || '0',
    biceps_tone_right: initialData.biceps_tone_right || '0',
    wrist_flexors_left: initialData.wrist_flexors_left || '0',
    wrist_flexors_right: initialData.wrist_flexors_right || '0',

    // 3. Lower Tone (MAS)
    quadriceps_tone_left: initialData.quadriceps_tone_left || '0',
    quadriceps_tone_right: initialData.quadriceps_tone_right || '0',
    gastrocnemius_tone_left: initialData.gastrocnemius_tone_left || '0',
    gastrocnemius_tone_right: initialData.gastrocnemius_tone_right || '0',

    // 4. Reflexes
    biceps_reflex_left: initialData.biceps_reflex_left || '2+',
    biceps_reflex_right: initialData.biceps_reflex_right || '2+',
    patellar_reflex_left: initialData.patellar_reflex_left || '2+',
    patellar_reflex_right: initialData.patellar_reflex_right || '2+',

    // 5. Clonus
    ankle_clonus_left: initialData.ankle_clonus_left || 'Absent',
    ankle_clonus_right: initialData.ankle_clonus_right || 'Absent',

    // 6. Sensation
    light_touch: initialData.light_touch || 'Intact Bilaterally',
    pin_prick_pain: initialData.pin_prick_pain || 'Intact Bilaterally',
    proprioception: initialData.proprioception || 'Intact / Accurate Joint Position',
    sensation_symmetry: initialData.sensation_symmetry || 'Symmetrical Both Sides',
    sensory_regions_notes: initialData.sensory_regions_notes || '',

    // 7. Coordination
    coordination_upper_limb: initialData.coordination_upper_limb || 'Smooth & Accurate',
    coordination_lower_limb: initialData.coordination_lower_limb || 'Smooth & Accurate',
    rapid_alternating_movements: initialData.rapid_alternating_movements || 'Intact / Equal Cadence',
    coordination_notes: initialData.coordination_notes || '',

    // 8. Motor Control
    selective_motor_control: initialData.selective_motor_control || 'Isolated Selective Movement',
    movement_synergies_observed: initialData.movement_synergies_observed || 'None / Pure Selective Control',
    motor_control_notes: initialData.motor_control_notes || '',

    // 9. Balance
    balance_sitting: initialData.balance_sitting || 'Independent & Stable',
    balance_standing: initialData.balance_standing || 'Independent (>30s without support)',
    balance_bbs_reference_id: initialData.balance_bbs_reference_id || '',
    balance_tug_reference_id: initialData.balance_tug_reference_id || '',
    balance_notes: initialData.balance_notes || '',

    // 10. Gait / Mobility
    gait_assistance_level: initialData.gait_assistance_level || 'Independent (Community)',
    gait_pattern: initialData.gait_pattern || 'Typical / Unremarkable',
    assistive_device: initialData.assistive_device || 'None / Independent',
    stair_mobility: initialData.stair_mobility || 'Independent without Handrail',
    gait_notes: initialData.gait_notes || '',

    // 11. Functional Mobility
    bed_mobility: initialData.bed_mobility || 'Independent (Rolling & Bridging)',
    sit_to_stand: initialData.sit_to_stand || 'Independent without Arms',
    transfers: initialData.transfers || 'Independent (Bed to Chair)',
    wheelchair_mobility: initialData.wheelchair_mobility || 'Not Applicable (Ambulatory)',
    functional_mobility_notes: initialData.functional_mobility_notes || '',

    // 12. Summary
    clinical_summary: initialData.clinical_summary || '',
  });

  const [clinicalNotes, setClinicalNotes] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        // 1. Fetch NEURO_EXAMINATION_V1 definition (fallback to code lookup)
        let def = await clinicalAssessmentService.getDefinitionByCode(NEURO_EXAMINATION_DEFINITION_CODE, 1);
        if (!def) {
          // If not yet committed or different, try list
          const defs = await clinicalAssessmentService.getDefinitions('neurological');
          def = defs.find((d) => d.code === NEURO_EXAMINATION_DEFINITION_CODE) || defs[0] || null;
        }
        setDefinition(def);

        // 2. Fetch authoritative outcome measures for visit
        const outcomes = await clinicalAssessmentService.getBalanceOutcomeMeasuresForVisit(visitId);
        setAvailableOutcomes(outcomes);

        // If BBS or TUG exists for visit, auto-link their IDs if not already set
        const bbs = outcomes.find((o) => o.definition?.code === 'BBS');
        const tug = outcomes.find((o) => o.definition?.code === 'TUG');
        setFormData((prev) => ({
          ...prev,
          balance_bbs_reference_id: prev.balance_bbs_reference_id || (bbs ? bbs.id : ''),
          balance_tug_reference_id: prev.balance_tug_reference_id || (tug ? tug.id : ''),
        }));
      } catch (err: any) {
        setError(err.message || 'Failed to initialize neurological examination form.');
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
      setError('Cannot save assessment: Missing neurological definition.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Generate summary findings for quick visual review
      const summaryText = `Alert: ${formData.alertness_participation} | MAS Biceps: ${formData.biceps_tone_left}/${formData.biceps_tone_right} | Motor: ${formData.selective_motor_control} | Gait: ${formData.gait_assistance_level}`;

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
      setError(err.message || 'Failed to save neurological assessment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        Loading neurological examination module...
      </div>
    );
  }

  const sections = [
    { id: 'general', label: '1. General Obs' },
    { id: 'tone', label: '2. Tone (MAS)' },
    { id: 'reflexes', label: '3. Reflexes & Clonus' },
    { id: 'sensation', label: '4. Sensation' },
    { id: 'coordination', label: '5. Coordination' },
    { id: 'motor', label: '6. Motor Control' },
    { id: 'balance', label: '7. Balance (BBS/TUG)' },
    { id: 'gait', label: '8. Gait & Locomotion' },
    { id: 'functional', label: '9. Functional Mobility' },
    { id: 'summary', label: '10. Summary & Notes' },
  ];

  const bbsOutcome = availableOutcomes.find((o) => o.definition?.code === 'BBS');
  const tugOutcome = availableOutcomes.find((o) => o.definition?.code === 'TUG');

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      {/* Header Banner */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: '#faf5ff',
          borderBottom: '1px solid #f3e8ff',
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
                color: '#7c3aed',
                backgroundColor: '#ede9fe',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                textTransform: 'uppercase',
              }}
            >
              Neurological Module V1
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Structured Neurological Examination
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#6b21a8' }}>
            Evidence-based clinical documentation. Observational findings only — zero automated diagnostic inference.
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
              border: '1px solid #7c3aed',
              backgroundColor: '#ffffff',
              color: '#7c3aed',
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
              backgroundColor: '#7c3aed',
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

      {/* Navigation tabs for Tablet/Desktop ease of access */}
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
                color: isActive ? '#7c3aed' : '#64748b',
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
        {/* Section 1: General Observation */}
        {activeTab === 'general' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              1. General Neurological Observation
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Record patient responsiveness and engagement during encounter. Observational clinical documentation only.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Level of Alertness & Participation *
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {ALERTNESS_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateField('alertness_participation', opt)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        border: '1px solid',
                        borderColor: formData.alertness_participation === opt ? '#7c3aed' : '#cbd5e1',
                        backgroundColor: formData.alertness_participation === opt ? '#f3e8ff' : '#ffffff',
                        color: formData.alertness_participation === opt ? '#6d28d9' : '#334155',
                        fontWeight: formData.alertness_participation === opt ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Communication & Cognitive Observations (Optional)
                </label>
                <select
                  value={formData.communication_cognition}
                  onChange={(e) => updateField('communication_cognition', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                >
                  <option value="">-- Select Observation --</option>
                  <option value="Intact / Communicates Needs Clearly">Intact / Communicates Needs Clearly</option>
                  <option value="Expressive / Receptive Communication Difficulty">Expressive / Receptive Communication Difficulty</option>
                  <option value="Cognitive / Processing Impairment Observed">Cognitive / Processing Impairment Observed</option>
                  <option value="Dysarthria Present">Dysarthria Present</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  General Presentation & Posture (Optional)
                </label>
                <select
                  value={formData.general_presentation}
                  onChange={(e) => updateField('general_presentation', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                >
                  <option value="">-- Select Presentation --</option>
                  <option value="Sitting Upright Independently">Sitting Upright Independently</option>
                  <option value="Supported in Wheelchair">Supported in Wheelchair</option>
                  <option value="Bed-Bound (Supine / Side-Lying)">Bed-Bound (Supine / Side-Lying)</option>
                  <option value="Hemiparetic Posturing Observed">Hemiparetic Posturing Observed</option>
                  <option value="Other Postural Presentation">Other Postural Presentation</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Clinical Precautions & Risk Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.precautions_observations}
                  onChange={(e) => updateField('precautions_observations', e.target.value)}
                  placeholder="e.g. Fall risk, seizure protocol, autonomic dysreflexia risk, hemiplegic shoulder handling precautions..."
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Tone (Modified Ashworth Scale) */}
        {activeTab === 'tone' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              2. Muscle Tone / Spasticity (Modified Ashworth Scale)
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Controlled MAS values: 0, 1, 1+, 2, 3, 4, NT. Bilateral comparison across upper and lower extremities.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {/* Upper Extremity */}
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
                  Upper Extremity Tone
                </h4>

                {/* Biceps */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Biceps Tone (Left / Right) *
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Left:</span>
                      <select
                        value={formData.biceps_tone_left}
                        onChange={(e) => updateField('biceps_tone_left', e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      >
                        {MAS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Right:</span>
                      <select
                        value={formData.biceps_tone_right}
                        onChange={(e) => updateField('biceps_tone_right', e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      >
                        {MAS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Wrist Flexors */}
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Wrist Flexors (Left / Right) *
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Left:</span>
                      <select
                        value={formData.wrist_flexors_left}
                        onChange={(e) => updateField('wrist_flexors_left', e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      >
                        {MAS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Right:</span>
                      <select
                        value={formData.wrist_flexors_right}
                        onChange={(e) => updateField('wrist_flexors_right', e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      >
                        {MAS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lower Extremity */}
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
                  Lower Extremity Tone
                </h4>

                {/* Quadriceps */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Quadriceps (Left / Right) *
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Left:</span>
                      <select
                        value={formData.quadriceps_tone_left}
                        onChange={(e) => updateField('quadriceps_tone_left', e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      >
                        {MAS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Right:</span>
                      <select
                        value={formData.quadriceps_tone_right}
                        onChange={(e) => updateField('quadriceps_tone_right', e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      >
                        {MAS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Gastrocnemius */}
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Gastrocnemius / Soleus (Left / Right) *
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Left:</span>
                      <select
                        value={formData.gastrocnemius_tone_left}
                        onChange={(e) => updateField('gastrocnemius_tone_left', e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      >
                        {MAS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Right:</span>
                      <select
                        value={formData.gastrocnemius_tone_right}
                        onChange={(e) => updateField('gastrocnemius_tone_right', e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      >
                        {MAS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Reflexes & Clonus */}
        {activeTab === 'reflexes' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              3. Deep Tendon Reflexes & Clonus
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Graded reflexes (0 to 4+, NT) and ankle clonus (Absent, Unsustained, Sustained, NT).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {/* Biceps Reflex */}
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b', marginBottom: '0.5rem' }}>
                  Biceps Reflex *
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Left:</span>
                    <select
                      value={formData.biceps_reflex_left}
                      onChange={(e) => updateField('biceps_reflex_left', e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    >
                      {REFLEX_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Right:</span>
                    <select
                      value={formData.biceps_reflex_right}
                      onChange={(e) => updateField('biceps_reflex_right', e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    >
                      {REFLEX_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Patellar Reflex */}
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b', marginBottom: '0.5rem' }}>
                  Patellar Reflex *
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Left:</span>
                    <select
                      value={formData.patellar_reflex_left}
                      onChange={(e) => updateField('patellar_reflex_left', e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    >
                      {REFLEX_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Right:</span>
                    <select
                      value={formData.patellar_reflex_right}
                      onChange={(e) => updateField('patellar_reflex_right', e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    >
                      {REFLEX_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Ankle Clonus */}
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b', marginBottom: '0.5rem' }}>
                  Ankle Clonus *
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Left:</span>
                    <select
                      value={formData.ankle_clonus_left}
                      onChange={(e) => updateField('ankle_clonus_left', e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    >
                      {CLONUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Right:</span>
                    <select
                      value={formData.ankle_clonus_right}
                      onChange={(e) => updateField('ankle_clonus_right', e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    >
                      {CLONUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Sensation */}
        {activeTab === 'sensation' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              4. Sensory Examination
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Structured documentation of exteroceptive and proprioceptive integrity.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Light Touch Sensation *
                </label>
                <select
                  value={formData.light_touch}
                  onChange={(e) => updateField('light_touch', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {SENSATION_MODALITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Pin-Prick / Pain Sensation (Optional)
                </label>
                <select
                  value={formData.pin_prick_pain}
                  onChange={(e) => updateField('pin_prick_pain', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {SENSATION_MODALITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Proprioception / Joint Position Sense *
                </label>
                <select
                  value={formData.proprioception}
                  onChange={(e) => updateField('proprioception', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {PROPRIOCEPTION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Sensory Symmetry Observation (Optional)
                </label>
                <select
                  value={formData.sensation_symmetry}
                  onChange={(e) => updateField('sensation_symmetry', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Symmetrical Both Sides">Symmetrical Both Sides</option>
                  <option value="Asymmetrical (Left Impaired)">Asymmetrical (Left Impaired)</option>
                  <option value="Asymmetrical (Right Impaired)">Asymmetrical (Right Impaired)</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Sensory Distribution & Region Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.sensory_regions_notes}
                  onChange={(e) => updateField('sensory_regions_notes', e.target.value)}
                  placeholder="e.g. Distal stocking-glove sensory loss, left hemisensory loss sparing face..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Coordination */}
        {activeTab === 'coordination' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              5. Coordination & Movement Accuracy
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Observation of movement accuracy, dysmetria, and rapid alternating cadence.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Upper Limb Coordination (Finger-to-Nose) *
                </label>
                <select
                  value={formData.coordination_upper_limb}
                  onChange={(e) => updateField('coordination_upper_limb', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {COORDINATION_UPPER_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Lower Limb Coordination (Heel-to-Shin)
                </label>
                <select
                  value={formData.coordination_lower_limb}
                  onChange={(e) => updateField('coordination_lower_limb', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Smooth & Accurate">Smooth & Accurate</option>
                  <option value="Mild Ataxia / Overshoot">Mild Ataxia / Overshoot</option>
                  <option value="Marked Dysmetria / Off-Track">Marked Dysmetria / Off-Track</option>
                  <option value="Unable to Perform">Unable to Perform</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Rapid Alternating Movements (Dysdiadochokinesia)
                </label>
                <select
                  value={formData.rapid_alternating_movements}
                  onChange={(e) => updateField('rapid_alternating_movements', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Intact / Equal Cadence">Intact / Equal Cadence</option>
                  <option value="Dysdiadochokinesia Present">Dysdiadochokinesia Present</option>
                  <option value="Severely Impaired">Severely Impaired</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Coordination Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.coordination_notes}
                  onChange={(e) => updateField('coordination_notes', e.target.value)}
                  placeholder="e.g. Terminal intention tremor observed on right finger-to-nose..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 6: Motor Control */}
        {activeTab === 'motor' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              6. Voluntary Motor Control & Movement Synergies
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Observational documentation of selective isolated control vs synergistic mass patterns.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Selective Motor Control Pattern *
                </label>
                <select
                  value={formData.selective_motor_control}
                  onChange={(e) => updateField('selective_motor_control', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {MOTOR_CONTROL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Movement Synergies Observed (Optional)
                </label>
                <select
                  value={formData.movement_synergies_observed}
                  onChange={(e) => updateField('movement_synergies_observed', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="None / Pure Selective Control">None / Pure Selective Control</option>
                  <option value="Flexor Synergy Dominant">Flexor Synergy Dominant</option>
                  <option value="Extensor Synergy Dominant">Extensor Synergy Dominant</option>
                  <option value="Mixed Synergies">Mixed Synergies</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Voluntary Activation & Functional Motor Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.motor_control_notes}
                  onChange={(e) => updateField('motor_control_notes', e.target.value)}
                  placeholder="e.g. Patient can initiate isolated shoulder flexion to 60 deg, then upper extremity flexor synergy initiates..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 7: Balance (BBS / TUG Integration) */}
        {activeTab === 'balance' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              7. Balance & Authoritative Outcome Measures
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Functional sitting/standing balance and references to authoritative Berg Balance Scale (BBS) and Timed Up and Go (TUG) records.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Sitting Balance Stability *
                </label>
                <select
                  value={formData.balance_sitting}
                  onChange={(e) => updateField('balance_sitting', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Independent & Stable">Independent & Stable</option>
                  <option value="Requires Supervision / Arm Support">Requires Supervision / Arm Support</option>
                  <option value="Unstable / Requires External Trunk Support">Unstable / Requires External Trunk Support</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Static Standing Balance *
                </label>
                <select
                  value={formData.balance_standing}
                  onChange={(e) => updateField('balance_standing', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Independent (>30s without support)">Independent (&gt;30s without support)</option>
                  <option value="Able with Narrow/Wide Stance Support">Able with Narrow/Wide Stance Support</option>
                  <option value="Requires Handheld / Physical Assistance">Requires Handheld / Physical Assistance</option>
                  <option value="Unable to Stand">Unable to Stand</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>
            </div>

            {/* Authoritative Outcome Measure Integration Banner */}
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', backgroundColor: '#dcfce7', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                  Authoritative Outcome Measures
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#14532d' }}>
                  Linked Psychometric Outcome Scales (Non-Duplicating)
                </span>
              </div>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#166534' }}>
                BBS and TUG psychometric scales are stored in the authoritative Outcome Measure module. The neurological examination references them directly without score duplication.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {/* BBS Card */}
                <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '4px', border: '1px solid #86efac' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>Berg Balance Scale (BBS)</div>
                  {bbsOutcome ? (
                    <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '0.25rem' }}>
                      <strong>Score: {bbsOutcome.numeric_score}/56</strong> &bull; {bbsOutcome.score_interpretation || bbsOutcome.score_category || 'Recorded'}
                      <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Ref: {bbsOutcome.assessment_identifier}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      No BBS recorded for this encounter.
                    </div>
                  )}
                </div>

                {/* TUG Card */}
                <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '4px', border: '1px solid #86efac' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>Timed Up and Go (TUG)</div>
                  {tugOutcome ? (
                    <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '0.25rem' }}>
                      <strong>Time: {tugOutcome.numeric_score}s</strong> &bull; {tugOutcome.score_interpretation || tugOutcome.score_category || 'Recorded'}
                      <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Ref: {tugOutcome.assessment_identifier}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      No TUG recorded for this encounter.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                Balance Observations & Postural Reactions
              </label>
              <textarea
                rows={2}
                value={formData.balance_notes}
                onChange={(e) => updateField('balance_notes', e.target.value)}
                placeholder="e.g. Reactive stepping delayed posteriorly, right protective extension impaired..."
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>
        )}

        {/* Section 8: Gait / Mobility */}
        {activeTab === 'gait' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              8. Gait & Locomotion
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Functional mobility, assistance levels, devices, and gait pattern observations.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Gait Assistance Level *
                </label>
                <select
                  value={formData.gait_assistance_level}
                  onChange={(e) => updateField('gait_assistance_level', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {GAIT_ASSISTANCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Assistive Device Used *
                </label>
                <select
                  value={formData.assistive_device}
                  onChange={(e) => updateField('assistive_device', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {ASSISTIVE_DEVICE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Gait Pattern Observation
                </label>
                <select
                  value={formData.gait_pattern}
                  onChange={(e) => updateField('gait_pattern', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Typical / Unremarkable">Typical / Unremarkable</option>
                  <option value="Hemiparetic / Circumducting">Hemiparetic / Circumducting</option>
                  <option value="Ataxic / Wide-Based">Ataxic / Wide-Based</option>
                  <option value="Scissoring / Spastic">Scissoring / Spastic</option>
                  <option value="Trendelenburg Gait">Trendelenburg Gait</option>
                  <option value="Shuffling / Short Step Cadence">Shuffling / Short Step Cadence</option>
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
                  <option value="Independent without Handrail">Independent without Handrail</option>
                  <option value="Independent with Handrail">Independent with Handrail</option>
                  <option value="Requires Physical Assistance">Requires Physical Assistance</option>
                  <option value="Unable / Non-Ambulatory on Stairs">Unable / Non-Ambulatory on Stairs</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Gait Cadence & Distance Observations
                </label>
                <textarea
                  rows={2}
                  value={formData.gait_notes}
                  onChange={(e) => updateField('gait_notes', e.target.value)}
                  placeholder="e.g. Ambulated 35m with quad cane under contact guard before fatigue onset..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 9: Functional Mobility */}
        {activeTab === 'functional' && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              9. Functional Mobility & Transfers
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Observational assessment of bed mobility, sit-to-stand, and everyday functional transfers.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Bed Mobility (Rolling / Bridging) *
                </label>
                <select
                  value={formData.bed_mobility}
                  onChange={(e) => updateField('bed_mobility', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {BED_MOBILITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Sit-to-Stand Transfer *
                </label>
                <select
                  value={formData.sit_to_stand}
                  onChange={(e) => updateField('sit_to_stand', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {SIT_TO_STAND_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Transfers (Bed to Chair / Commode) *
                </label>
                <select
                  value={formData.transfers}
                  onChange={(e) => updateField('transfers', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {TRANSFERS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Wheelchair Mobility (If Applicable)
                </label>
                <select
                  value={formData.wheelchair_mobility}
                  onChange={(e) => updateField('wheelchair_mobility', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Not Applicable (Ambulatory)">Not Applicable (Ambulatory)</option>
                  <option value="Independent Manual Propulsion">Independent Manual Propulsion</option>
                  <option value="Independent Power Mobility">Independent Power Mobility</option>
                  <option value="Requires Assistance to Propel">Requires Assistance to Propel</option>
                  <option value="Dependent">Dependent</option>
                  <option value="NT">NT (Not Assessed)</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Functional Mobility Observations
                </label>
                <textarea
                  rows={2}
                  value={formData.functional_mobility_notes}
                  onChange={(e) => updateField('functional_mobility_notes', e.target.value)}
                  placeholder="e.g. Transfers safely toward unaffected side; requires physical cueing toward paretic side..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
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
              Clinician synthesis of findings, movement quality, and functional limitations. Observational clinical documentation only.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Neurological Examination Findings & Functional Impact
                </label>
                <textarea
                  rows={4}
                  value={formData.clinical_summary}
                  onChange={(e) => updateField('clinical_summary', e.target.value)}
                  placeholder="Summarize key clinical observations, spasticity distributions, functional limitations, and rehabilitation priorities..."
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
          * Indicates required observational field in structured neurological screen.
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
              border: '1px solid #7c3aed',
              backgroundColor: '#ffffff',
              color: '#7c3aed',
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
              backgroundColor: '#7c3aed',
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
              Finalize Neurological Examination?
            </h3>
            <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Finalizing this neurological examination locks its structured data. Once finalized, findings cannot be silently edited or deleted. Future corrections will require an official amendment with an explicit reason.
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
                  backgroundColor: '#7c3aed',
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
