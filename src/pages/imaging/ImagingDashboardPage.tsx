import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Plus,
  AlertTriangle,
  ClipboardList,
  Eye,
  CheckCircle2,
  Clock,
  Layers,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { imagingService } from '../../services/imagingService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type {
  ImagingOrderWithRelations,
  ImagingStudyWithRelations,
} from '../../types/models';

export const ImagingDashboardPage: React.FC = () => {
  const { activePractice } = usePractice();
  const { isClinician, isOwner, isManager, isStaff } = useRole();
  const canRequisition = isClinician || isOwner || isManager;

  const [orders, setOrders] = useState<ImagingOrderWithRelations[]>([]);
  const [studies, setStudies] = useState<ImagingStudyWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    if (!activePractice) return;
    setIsLoading(true);
    setError(null);
    try {
      const [ordersData, studiesData] = await Promise.all([
        imagingService.getOrders(activePractice.id),
        imagingService.getStudies(activePractice.id),
      ]);
      setOrders(ordersData);
      setStudies(studiesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load imaging dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [activePractice]);

  // Derived metrics
  const activeOrdersCount = orders.filter(
    (o) => o.status === 'draft' || o.status === 'placed'
  ).length;
  const unreviewedStudiesCount = studies.filter(
    (s) => s.review_status === 'unreviewed'
  ).length;
  const criticalFindingsCount = studies.reduce((count, study) => {
    const hasCritical = (study.reports?.some((r) => r.critical_findings_identified) ?? false) || study.red_flag_alert;
    return hasCritical ? count + 1 : count;
  }, 0);

  const recentOrders = orders.slice(0, 5);
  const recentStudies = studies.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="h-7 w-7 text-indigo-600" />
            Medical Imaging & DICOM
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Diagnostic imaging requisitions, external study references, and radiology reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/app/imaging/orders"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <ClipboardList size={16} />
            All Orders
          </Link>
          <Link
            to="/app/imaging/studies"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <Activity size={16} />
            All Studies
          </Link>
          {isStaff && (
            <Link
              to="/app/imaging/studies/new"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
            >
              <Plus size={16} />
              Ingest Study
            </Link>
          )}
          {canRequisition && (
            <Link
              to="/app/imaging/orders/new"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition"
            >
              <Plus size={16} />
              New Order
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Active Orders</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Clock size={20} />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{activeOrdersCount}</p>
          <p className="text-xs text-gray-400 mt-1">Requisitions pending completion</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Total Studies</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Layers size={20} />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{studies.length}</p>
          <p className="text-xs text-gray-400 mt-1">Ingested diagnostic imaging series</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Pending Review</span>
            <span className={`p-2 rounded-lg ${unreviewedStudiesCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-600'}`}>
              <Eye size={20} />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{unreviewedStudiesCount}</p>
          <p className="text-xs text-gray-400 mt-1">Studies awaiting clinician sign-off</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Critical Findings</span>
            <span className={`p-2 rounded-lg ${criticalFindingsCount > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'}`}>
              <AlertTriangle size={20} />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{criticalFindingsCount}</p>
          <p className="text-xs text-gray-400 mt-1">High-priority radiology alerts</p>
        </div>
      </div>

      {/* Two Column Layout: Recent Orders & Recent Studies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-gray-900">Recent Requisitions</h2>
            </div>
            <Link
              to="/app/imaging/orders"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading orders...</div>
          ) : recentOrders.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No imaging orders recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/app/imaging/orders/${order.id}`}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {order.order_number}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          order.urgency === 'red_flag_emergency'
                            ? 'bg-red-100 text-red-700'
                            : order.urgency === 'urgent'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {order.urgency.toUpperCase()}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          order.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : order.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {order.patient?.first_name} {order.patient?.last_name} ({order.patient?.patient_identifier})
                    </p>
                    <p className="text-xs text-gray-400">
                      {order.modality.toUpperCase()} • {order.anatomical_region.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">
                      {new Date(order.order_date).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Studies */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-gray-900">Recent Studies</h2>
            </div>
            <Link
              to="/app/imaging/studies"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading studies...</div>
          ) : recentStudies.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No imaging studies ingested yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentStudies.map((study) => {
                const hasReport = (study.reports?.length ?? 0) > 0;
                const hasCritical = (study.reports?.some((r) => r.critical_findings_identified) ?? false) || study.red_flag_alert;

                return (
                  <Link
                    key={study.id}
                    to={`/app/imaging/studies/${study.id}`}
                    className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {study.study_number}
                        </span>
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          {study.modality.toUpperCase()}
                        </span>
                        {hasCritical && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <AlertTriangle size={10} /> Critical
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            study.review_status === 'reviewed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {study.review_status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {study.patient?.first_name} {study.patient?.last_name} •{' '}
                        {study.body_part_examined || study.anatomical_region.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {study.performing_facility || 'External Facility'} • {study.series_count} series, {study.instance_count} images
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-400">
                        {new Date(study.study_date).toLocaleDateString()}
                      </span>
                      {hasReport ? (
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Report Attached
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <FileText size={12} /> No Report
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
