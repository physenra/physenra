import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ClipboardList,
  ArrowLeft,
  AlertTriangle,
  User,
  Save,
} from 'lucide-react';
import { imagingService } from '../../services/imagingService';
import { patientService } from '../../services/patientService';
import { usePractice } from '../../hooks/usePractice';
import type { Patient } from '../../types/models';
import type {
  ImagingModality,
  ImagingAnatomicalRegion,
  ImagingUrgency,
  ImagingLaterality,
} from '../../types/database';

export const CreateImagingOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const { activePractice } = usePractice();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [modality, setModality] = useState<ImagingModality>('xray');
  const [anatomicalRegion, setAnatomicalRegion] = useState<ImagingAnatomicalRegion>('lumbar_spine');
  const [laterality, setLaterality] = useState<ImagingLaterality>('not_applicable');
  const [urgency, setUrgency] = useState<ImagingUrgency>('routine');
  const [clinicalIndication, setClinicalIndication] = useState('');
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState('');
  const [referredFacilityName, setReferredFacilityName] = useState('');
  const [contraindicationsScreened, setContraindicationsScreened] = useState(true);

  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await patientService.getPatients({ limit: 100 });
        setPatients(res.patients);
        if (res.patients.length > 0) {
          setSelectedPatientId(res.patients[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load patients.');
      } finally {
        setIsLoadingPatients(false);
      }
    };
    fetchPatients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice) return;
    if (!selectedPatientId) {
      setError('Please select a patient.');
      return;
    }
    if (!clinicalIndication.trim()) {
      setError('Clinical indication is mandatory for imaging requisitions.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await imagingService.createOrder(
        {
          patient_id: selectedPatientId,
          modality,
          anatomical_region: anatomicalRegion,
          laterality,
          clinical_indication: clinicalIndication.trim(),
          provisional_diagnosis: provisionalDiagnosis.trim() || null,
          urgency,
          referred_facility_name: referredFacilityName.trim() || null,
          contraindications_screened: contraindicationsScreened,
        },
        activePractice.id
      );

      navigate(`/app/imaging/orders/${res.order_id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create imaging order.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb */}
      <div>
        <Link
          to="/app/imaging/orders"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft size={16} />
          Back to Requisitions
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2 flex items-center gap-2">
          <ClipboardList className="h-7 w-7 text-indigo-600" />
          New Imaging Requisition
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Issue a clinical requisition for diagnostic radiography, MRI, CT, ultrasound, or other studies.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        {/* Patient Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
            <User size={16} className="text-indigo-600" />
            Patient *
          </label>
          {isLoadingPatients ? (
            <div className="text-sm text-gray-400 py-2">Loading patient list...</div>
          ) : (
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
              required
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.last_name}, {p.first_name} ({p.patient_identifier})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Modality & Anatomical Region */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modality *
            </label>
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value as ImagingModality)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
              required
            >
              <option value="xray">X-Ray (CR / DX)</option>
              <option value="mri">MRI (Magnetic Resonance)</option>
              <option value="ct">CT (Computed Tomography)</option>
              <option value="ultrasound">Ultrasound (US / Sonography)</option>
              <option value="dexa">DEXA (Bone Densitometry)</option>
              <option value="fluoroscopy">Fluoroscopy</option>
              <option value="other">Other Modality</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anatomical Region *
            </label>
            <select
              value={anatomicalRegion}
              onChange={(e) => setAnatomicalRegion(e.target.value as ImagingAnatomicalRegion)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
              required
            >
              <option value="cervical_spine">Cervical Spine</option>
              <option value="thoracic_spine">Thoracic Spine</option>
              <option value="lumbar_spine">Lumbar Spine</option>
              <option value="sacrum_pelvis">Sacrum / Pelvis</option>
              <option value="shoulder">Shoulder</option>
              <option value="elbow">Elbow</option>
              <option value="wrist_hand">Wrist & Hand</option>
              <option value="hip">Hip</option>
              <option value="knee">Knee</option>
              <option value="ankle_foot">Ankle & Foot</option>
              <option value="chest_ribs">Chest & Ribs</option>
              <option value="head_neck">Head & Neck</option>
              <option value="abdomen">Abdomen</option>
              <option value="multi_region">Multi-region</option>
              <option value="other">Other Region</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Laterality *
            </label>
            <select
              value={laterality}
              onChange={(e) => setLaterality(e.target.value as ImagingLaterality)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="not_applicable">Not Applicable (Midline/Spine)</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="bilateral">Bilateral</option>
            </select>
          </div>
        </div>

        {/* Urgency & Preferred Facility */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Urgency Level *
            </label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as ImagingUrgency)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="routine">Routine (Standard outpatient scheduling)</option>
              <option value="urgent">Urgent (Within 24-48 hours)</option>
              <option value="red_flag_emergency">Red Flag Emergency (Immediate ED referral)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referred / Preferred Imaging Facility
            </label>
            <input
              type="text"
              placeholder="e.g. Metro Radiology Center"
              value={referredFacilityName}
              onChange={(e) => setReferredFacilityName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Provisional Diagnosis */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Provisional Clinical Diagnosis (ICD-10 or Clinical Working Diagnosis)
          </label>
          <input
            type="text"
            placeholder="e.g. M54.5 Low back pain with radiculopathy; rule out disc herniation"
            value={provisionalDiagnosis}
            onChange={(e) => setProvisionalDiagnosis(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Clinical Indication */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Clinical Indication & Suspected Pathology *
          </label>
          <textarea
            rows={3}
            placeholder="Describe clinical rationale, symptom history, suspected pathology..."
            value={clinicalIndication}
            onChange={(e) => setClinicalIndication(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            required
          />
        </div>

        {/* Contraindications Screening */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="contraindications"
            checked={contraindicationsScreened}
            onChange={(e) => setContraindicationsScreened(e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="contraindications" className="text-sm font-medium text-gray-700 cursor-pointer">
            Patient screened for modality-specific contraindications (e.g. MRI pacemakers, pregnancy)
          </label>
        </div>

        {/* Submit Buttons */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <Link
            to="/app/imaging/orders"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition"
          >
            <Save size={16} />
            {isSubmitting ? 'Issuing Requisition...' : 'Create Requisition'}
          </button>
        </div>
      </form>
    </div>
  );
};
