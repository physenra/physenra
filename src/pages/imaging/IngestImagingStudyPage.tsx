import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  AlertTriangle,
  User,
  Save,
} from 'lucide-react';
import { imagingService } from '../../services/imagingService';
import { patientService } from '../../services/patientService';
import { usePractice } from '../../hooks/usePractice';
import type { Patient, ImagingOrderWithRelations } from '../../types/models';
import type {
  ImagingModality,
  ImagingAnatomicalRegion,
  ImagingLaterality,
} from '../../types/database';

export const IngestImagingStudyPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId') || '';
  const initialOrderId = searchParams.get('orderId') || '';

  const { activePractice } = usePractice();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [orders, setOrders] = useState<ImagingOrderWithRelations[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId);

  const [modality, setModality] = useState<ImagingModality>('xray');
  const [anatomicalRegion, setAnatomicalRegion] = useState<ImagingAnatomicalRegion>('lumbar_spine');
  const [laterality, setLaterality] = useState<ImagingLaterality>('not_applicable');
  const [performingFacility, setPerformingFacility] = useState('');
  const [bodyPartExamined, setBodyPartExamined] = useState('');
  const [studyInstanceUid, setStudyInstanceUid] = useState('');
  const [accessionNumber, setAccessionNumber] = useState('');
  const [externalViewerUrl, setExternalViewerUrl] = useState('');
  const [seriesCount, setSeriesCount] = useState<number>(1);
  const [instanceCount, setInstanceCount] = useState<number>(1);
  const [studyDate, setStudyDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, ordersRes] = await Promise.all([
          patientService.getPatients({ limit: 100 }),
          activePractice ? imagingService.getOrders(activePractice.id) : Promise.resolve([]),
        ]);
        setPatients(patientsRes.patients);
        setOrders(ordersRes);

        if (!selectedPatientId && patientsRes.patients.length > 0) {
          setSelectedPatientId(patientsRes.patients[0].id);
        }

        // If an orderId was supplied, inherit modality & anatomical_region from it
        if (initialOrderId && ordersRes.length > 0) {
          const linkedOrder = ordersRes.find((o) => o.id === initialOrderId);
          if (linkedOrder) {
            setModality(linkedOrder.modality);
            setAnatomicalRegion(linkedOrder.anatomical_region);
            setLaterality(linkedOrder.laterality || 'not_applicable');
            if (linkedOrder.patient_id) {
              setSelectedPatientId(linkedOrder.patient_id);
            }
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load initial data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [activePractice, initialOrderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice) return;
    if (!selectedPatientId) {
      setError('Please select a patient.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await imagingService.ingestStudy(
        {
          patient_id: selectedPatientId,
          order_id: selectedOrderId || null,
          study_date: studyDate,
          modality,
          anatomical_region: anatomicalRegion,
          laterality,
          performing_facility: performingFacility.trim() || null,
          body_part_examined: bodyPartExamined.trim() || null,
          study_instance_uid: studyInstanceUid.trim() || null,
          accession_number: accessionNumber.trim() || null,
          series_count: seriesCount,
          instance_count: instanceCount,
          external_viewer_url: externalViewerUrl.trim() || null,
        },
        activePractice.id
      );

      navigate(`/app/imaging/studies/${res.study_id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to ingest imaging study.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          to="/app/imaging/studies"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft size={16} />
          Back to Studies
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2 flex items-center gap-2">
          <Activity className="h-7 w-7 text-indigo-600" />
          Ingest Imaging Study
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Catalog external DICOM study metadata, radiologist scans, or CD/HL7 import records.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        {/* Patient Selection & Order Linkage */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <User size={16} className="text-indigo-600" />
              Patient *
            </label>
            {isLoading ? (
              <div className="text-sm text-gray-400 py-2">Loading patients...</div>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Linked Requisition (Optional)
            </label>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="">No linked requisition (Direct Ingestion)</option>
              {orders
                .filter((o) => !selectedPatientId || o.patient_id === selectedPatientId)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.order_number} — {o.modality.toUpperCase()} ({o.anatomical_region.replace('_', ' ')})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Modality, Anatomical Region & Laterality */}
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
              <option value="not_applicable">Not Applicable</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="bilateral">Bilateral</option>
            </select>
          </div>
        </div>

        {/* Performing Facility & Body Part */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Performing Imaging Facility
            </label>
            <input
              type="text"
              placeholder="e.g. Apex Diagnostic Radiology Center"
              value={performingFacility}
              onChange={(e) => setPerformingFacility(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Body Part Examined
            </label>
            <input
              type="text"
              placeholder="e.g. Lumbar Spine L1-S1"
              value={bodyPartExamined}
              onChange={(e) => setBodyPartExamined(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* DICOM Study Instance UID & Accession Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DICOM Study Instance UID (External Reference)
            </label>
            <input
              type="text"
              placeholder="1.2.840.10008.x.x..."
              value={studyInstanceUid}
              onChange={(e) => setStudyInstanceUid(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Accession Number
            </label>
            <input
              type="text"
              placeholder="e.g. ACC-2026-98124"
              value={accessionNumber}
              onChange={(e) => setAccessionNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-xs"
            />
          </div>
        </div>

        {/* Series Count, Instance Count & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Series Count
            </label>
            <input
              type="number"
              min={1}
              value={seriesCount}
              onChange={(e) => setSeriesCount(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instance / Slice Count
            </label>
            <input
              type="number"
              min={1}
              value={instanceCount}
              onChange={(e) => setInstanceCount(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Study Exam Date *
            </label>
            <input
              type="date"
              value={studyDate}
              onChange={(e) => setStudyDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              required
            />
          </div>
        </div>

        {/* External PACS Viewer URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            External PACS / Cloud Viewer URL (Optional)
          </label>
          <input
            type="url"
            placeholder="https://pacs.imagingcenter.example/viewer?studyUID=..."
            value={externalViewerUrl}
            onChange={(e) => setExternalViewerUrl(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <Link
            to="/app/imaging/studies"
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
            {isSubmitting ? 'Ingesting Study...' : 'Ingest Study'}
          </button>
        </div>
      </form>
    </div>
  );
};
