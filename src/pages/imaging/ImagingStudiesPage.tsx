import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Search,
  Plus,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { imagingService } from '../../services/imagingService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type {
  ImagingStudyWithRelations,
  ImagingReviewStatus,
  ImagingModality,
} from '../../types/models';

export const ImagingStudiesPage: React.FC = () => {
  const { activePractice } = usePractice();
  const { isStaff } = useRole();

  const [studies, setStudies] = useState<ImagingStudyWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>('all');
  const [modalityFilter, setModalityFilter] = useState<string>('all');

  const loadStudies = async () => {
    if (!activePractice) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await imagingService.getStudies(activePractice.id, {
        reviewStatus: reviewStatusFilter === 'all' ? undefined : (reviewStatusFilter as ImagingReviewStatus),
        modality: modalityFilter === 'all' ? undefined : (modalityFilter as ImagingModality),
        searchQuery: searchQuery || undefined,
      });
      setStudies(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load imaging studies.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudies();
  }, [activePractice, reviewStatusFilter, modalityFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-7 w-7 text-indigo-600" />
            Diagnostic Imaging Studies
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Directory of ingested radiological studies, DICOM references, and diagnostic reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isStaff && (
            <Link
              to="/app/imaging/studies/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition"
            >
              <Plus size={16} />
              Ingest Study
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search study #, patient, facility, body part..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Review Status Filter */}
          <div>
            <select
              value={reviewStatusFilter}
              onChange={(e) => setReviewStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="all">All Review States</option>
              <option value="unreviewed">Unreviewed</option>
              <option value="under_review">Under Review</option>
              <option value="reviewed">Reviewed</option>
              <option value="amended">Amended</option>
            </select>
          </div>

          {/* Modality Filter */}
          <div>
            <select
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="all">All Modalities</option>
              <option value="xray">X-Ray (CR/DX)</option>
              <option value="mri">MRI (MR)</option>
              <option value="ct">CT</option>
              <option value="ultrasound">Ultrasound (US)</option>
              <option value="dexa">DEXA</option>
              <option value="fluoroscopy">Fluoroscopy</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Studies Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading studies...</div>
        ) : studies.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-900">No imaging studies found</p>
            <p className="text-xs text-gray-500 mt-1">
              Ingest an external study or CD/DICOM series to begin tracking.
            </p>
            {isStaff && (
              <div className="mt-4">
                <Link
                  to="/app/imaging/studies/new"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
                >
                  <Plus size={16} />
                  Ingest Study
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="px-4 py-3">Study Number</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Modality & Region</th>
                  <th className="px-4 py-3">Facility</th>
                  <th className="px-4 py-3">Review Status</th>
                  <th className="px-4 py-3">Reports</th>
                  <th className="px-4 py-3">Exam Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {studies.map((study) => {
                  const hasReport = (study.reports?.length ?? 0) > 0;
                  const hasCritical = (study.reports?.some((r) => r.critical_findings_identified) ?? false) || study.red_flag_alert;

                  return (
                    <tr key={study.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                        <Link
                          to={`/app/imaging/studies/${study.id}`}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          {study.study_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {study.patient?.first_name} {study.patient?.last_name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {study.patient?.patient_identifier}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 uppercase mr-2">
                          {study.modality}
                        </span>
                        <span className="text-xs text-gray-600 capitalize">
                          {study.anatomical_region.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">
                        {study.performing_facility || 'External Center'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                              study.review_status === 'reviewed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : study.review_status === 'under_review'
                                ? 'bg-blue-100 text-blue-700'
                                : study.review_status === 'amended'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {study.review_status}
                          </span>
                          {hasCritical && (
                            <span className="text-xs text-red-600 font-bold" title="Critical finding">
                              !
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {hasReport ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 size={13} /> {study.reports?.length} Report(s)
                          </span>
                        ) : (
                          <span className="text-gray-400 flex items-center gap-1">
                            <FileText size={13} /> None
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                        {new Date(study.study_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                        <Link
                          to={`/app/imaging/studies/${study.id}`}
                          className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          View <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
