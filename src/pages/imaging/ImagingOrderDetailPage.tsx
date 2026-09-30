import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ClipboardList,
  ArrowLeft,
  AlertTriangle,
  User,
  Activity,
  XCircle,
  Plus,
  ArrowRight,
  Send,
} from 'lucide-react';
import { imagingService } from '../../services/imagingService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type { ImagingOrderWithRelations } from '../../types/models';

export const ImagingOrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { activePractice } = usePractice();
  const { isStaff } = useRole();

  const [order, setOrder] = useState<ImagingOrderWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadOrder = async () => {
    if (!orderId || !activePractice) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await imagingService.getOrderById(orderId, activePractice.id);
      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load order.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderId, activePractice]);

  const handlePlaceOrder = async () => {
    if (!orderId) return;
    setIsUpdatingStatus(true);
    setError(null);
    try {
      await imagingService.placeOrder(orderId);
      await loadOrder();
    } catch (err: any) {
      setError(err.message || 'Failed to place order.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderId || !cancelReason.trim()) return;
    setIsUpdatingStatus(true);
    setError(null);
    try {
      await imagingService.cancelOrder(orderId, cancelReason.trim());
      setShowCancelModal(false);
      await loadOrder();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-sm text-gray-400">Loading order details...</div>;
  }

  if (!order) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Imaging requisition not found.</p>
        <Link to="/app/imaging/orders" className="text-indigo-600 font-medium text-sm mt-2 inline-block">
          Return to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/app/imaging/orders"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition mb-2"
          >
            <ArrowLeft size={16} />
            Back to Orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase ${
                order.urgency === 'red_flag_emergency'
                  ? 'bg-red-100 text-red-700'
                  : order.urgency === 'urgent'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {order.urgency.replace(/_/g, ' ')}
            </span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                order.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-700'
                  : order.status === 'cancelled'
                  ? 'bg-rose-100 text-rose-700'
                  : order.status === 'placed'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {order.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Ordered on {new Date(order.order_date).toLocaleDateString()} by{' '}
            {order.ordering_clinician?.full_name || 'Treating Clinician'}
          </p>
        </div>

        {/* Action Buttons for Lifecycle */}
        <div className="flex flex-wrap items-center gap-2">
          {order.status === 'draft' && (
            <button
              onClick={handlePlaceOrder}
              disabled={isUpdatingStatus}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
            >
              <Send size={14} /> Place Requisition
            </button>
          )}
          {(order.status === 'draft' || order.status === 'placed') && (
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={isUpdatingStatus}
              className="px-3 py-1.5 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-indigo-600" />
              Requisition Details
            </h2>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block text-xs font-medium">Modality</span>
                <span className="font-semibold text-gray-900 uppercase">{order.modality}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs font-medium">Anatomical Region</span>
                <span className="font-semibold text-gray-900 capitalize">
                  {order.anatomical_region.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs font-medium">Laterality</span>
                <span className="font-semibold text-gray-900 capitalize">{order.laterality || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs font-medium">Referred Facility</span>
                <span className="font-semibold text-gray-900">{order.referred_facility_name || 'Open facility referral'}</span>
              </div>
            </div>

            {order.provisional_diagnosis && (
              <div className="pt-2">
                <span className="text-gray-500 block text-xs font-medium mb-1">
                  Provisional Diagnosis
                </span>
                <p className="text-sm text-gray-800 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  {order.provisional_diagnosis}
                </p>
              </div>
            )}

            <div className="pt-2">
              <span className="text-gray-500 block text-xs font-medium mb-1">
                Clinical Indication & Suspected Pathology
              </span>
              <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">
                {order.clinical_indication}
              </p>
            </div>

            {order.cancellation_reason && (
              <div className="pt-2">
                <span className="text-rose-600 block text-xs font-medium mb-1">
                  Cancellation Reason
                </span>
                <p className="text-sm text-rose-800 bg-rose-50 p-3 rounded-lg border border-rose-100">
                  {order.cancellation_reason}
                </p>
              </div>
            )}
          </div>

          {/* Linked Studies Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-600" />
                Linked Imaging Studies ({(order.studies?.length ?? 0)})
              </h2>
              {isStaff && (
                <Link
                  to={`/app/imaging/studies/new?orderId=${order.id}&patientId=${order.patient_id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  <Plus size={14} /> Ingest Study
                </Link>
              )}
            </div>

            {!order.studies || order.studies.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                No studies linked to this requisition yet. Ingest an external study or DICOM series when results return.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {order.studies.map((study) => (
                  <Link
                    key={study.id}
                    to={`/app/imaging/studies/${study.id}`}
                    className="p-3 flex items-center justify-between hover:bg-gray-50 rounded-lg transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900">{study.study_number}</span>
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
                          {study.modality.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">
                          {study.review_status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {study.body_part_examined || study.anatomical_region.replace('_', ' ')} •{' '}
                        {study.performing_facility || 'External Facility'}
                      </p>
                    </div>
                    <ArrowRight size={16} className="text-gray-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Patient Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
              <User className="h-4 w-4 text-indigo-600" />
              Patient Information
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-xs text-gray-400 block">Name</span>
                <span className="font-semibold text-gray-900">
                  {order.patient?.first_name} {order.patient?.last_name}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Patient Identifier</span>
                <span className="text-gray-700">{order.patient?.patient_identifier}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Date of Birth</span>
                <span className="text-gray-700">
                  {order.patient?.date_of_birth || 'Not recorded'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Phone</span>
                <span className="text-gray-700">{order.patient?.phone || 'Not recorded'}</span>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <Link
                  to={`/app/patients/${order.patient_id}`}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  View patient chart <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <XCircle className="text-rose-600" size={20} />
              Cancel Imaging Order
            </h3>
            <p className="text-sm text-gray-600">
              Please provide a clinical or administrative reason for cancelling this requisition.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Patient improved, alternative scan performed, patient declined..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={!cancelReason.trim() || isUpdatingStatus}
                onClick={handleCancelOrder}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
