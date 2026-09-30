import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  Search,
  Plus,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { imagingService } from '../../services/imagingService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type {
  ImagingOrderWithRelations,
  ImagingOrderStatus,
  ImagingUrgency,
  ImagingModality,
} from '../../types/models';

export const ImagingOrdersPage: React.FC = () => {
  const { activePractice } = usePractice();
  const { isClinician, isOwner, isManager } = useRole();
  const canRequisition = isClinician || isOwner || isManager;

  const [orders, setOrders] = useState<ImagingOrderWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [modalityFilter, setModalityFilter] = useState<string>('all');

  const loadOrders = async () => {
    if (!activePractice) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await imagingService.getOrders(activePractice.id, {
        status: statusFilter === 'all' ? undefined : (statusFilter as ImagingOrderStatus),
        urgency: urgencyFilter === 'all' ? undefined : (urgencyFilter as ImagingUrgency),
        modality: modalityFilter === 'all' ? undefined : (modalityFilter as ImagingModality),
        searchQuery: searchQuery || undefined,
      });
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load imaging orders.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [activePractice, statusFilter, urgencyFilter, modalityFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-indigo-600" />
            Imaging Requisitions & Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Requisitions created for diagnostic imaging studies, external scan coordination, and tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canRequisition && (
            <Link
              to="/app/imaging/orders/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition"
            >
              <Plus size={16} />
              New Imaging Order
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search order #, patient, indication..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="placed">Placed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Urgency Filter */}
          <div>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="all">All Urgencies</option>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="red_flag_emergency">Red Flag Emergency</option>
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
              <option value="dexa">DEXA / Bone Density</option>
              <option value="fluoroscopy">Fluoroscopy</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading requisitions...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-900">No imaging requisitions found</p>
            <p className="text-xs text-gray-500 mt-1">
              Create a requisition to request diagnostic imaging for a patient.
            </p>
            {canRequisition && (
              <div className="mt-4">
                <Link
                  to="/app/imaging/orders/new"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
                >
                  <Plus size={16} />
                  New Imaging Order
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Modality & Region</th>
                  <th className="px-4 py-3">Indication</th>
                  <th className="px-4 py-3">Urgency</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Order Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                      <Link
                        to={`/app/imaging/orders/${order.id}`}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {order.patient?.first_name} {order.patient?.last_name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {order.patient?.patient_identifier}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 uppercase mr-2">
                        {order.modality}
                      </span>
                      <span className="text-xs text-gray-600 capitalize">
                        {order.anatomical_region.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-gray-700">
                      {order.clinical_indication}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          order.urgency === 'red_flag_emergency'
                            ? 'bg-red-100 text-red-700'
                            : order.urgency === 'urgent'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {order.urgency.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
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
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                      {new Date(order.order_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                      <Link
                        to={`/app/imaging/orders/${order.id}`}
                        className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        View <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
