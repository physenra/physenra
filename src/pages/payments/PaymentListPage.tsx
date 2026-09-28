import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  Search,
  Plus,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Ban,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type { PaymentWithRelations, PaymentStatus, PaymentMethod } from '../../types/models';

export const PaymentListPage: React.FC = () => {
  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant, isReceptionist } = useRole();
  const canRecordPayment = isOwner || isManager || isAccountant || isReceptionist;

  const [searchParams, setSearchParams] = useSearchParams();
  const [payments, setPayments] = useState<PaymentWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusFilter = (searchParams.get('status') as PaymentStatus | 'all') || 'all';
  const methodFilter = (searchParams.get('method') as PaymentMethod | 'all') || 'all';
  const searchQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(searchQuery);

  const loadPayments = async () => {
    if (!activePractice) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await paymentService.getPayments(activePractice.id, {
        status: statusFilter,
        paymentMethod: methodFilter,
        searchQuery: searchQuery || undefined,
      });
      setPayments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load payments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [activePractice, statusFilter, methodFilter, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('q', searchInput.trim());
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };

  const handleStatusFilter = (status: PaymentStatus | 'all') => {
    const newParams = new URLSearchParams(searchParams);
    if (status === 'all') {
      newParams.delete('status');
    } else {
      newParams.set('status', status);
    }
    setSearchParams(newParams);
  };

  const handleMethodFilter = (method: PaymentMethod | 'all') => {
    const newParams = new URLSearchParams(searchParams);
    if (method === 'all') {
      newParams.delete('method');
    } else {
      newParams.set('method', method);
    }
    setSearchParams(newParams);
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="badge badge-success flex items-center gap-1">
            <CheckCircle2 size={12} /> Confirmed
          </span>
        );
      case 'voided':
        return (
          <span className="badge badge-danger flex items-center gap-1">
            <Ban size={12} /> Voided
          </span>
        );
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const getMethodBadge = (method: PaymentMethod) => {
    const labels: Record<PaymentMethod, string> = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      pos: 'POS Terminal',
      card: 'Card',
      other: 'Other',
    };
    return (
      <span className="badge badge-outline text-xs uppercase font-medium">
        {labels[method] || method}
      </span>
    );
  };

  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CreditCard size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
              <p className="text-sm text-gray-500">
                Track financial inflows, record settled payments, and manage immutable patient receipts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/app/receipts"
            className="btn btn-secondary flex items-center gap-2"
          >
            <FileText size={16} />
            <span>Receipts Ledger</span>
          </Link>
          {canRecordPayment && (
            <Link
              to="/app/payments/new"
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Record Payment</span>
            </Link>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger mb-6 flex items-start gap-3">
          <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
          <div>
            <div className="font-semibold">Error Loading Payments</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => handleStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Payments
            </button>
            <button
              onClick={() => handleStatusFilter('confirmed')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'confirmed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Confirmed
            </button>
            <button
              onClick={() => handleStatusFilter('voided')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'voided'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Voided
            </button>
          </div>

          {/* Method Filter & Search Form */}
          <div className="flex items-center gap-3">
            <select
              value={methodFilter}
              onChange={(e) => handleMethodFilter(e.target.value as PaymentMethod | 'all')}
              className="input input-sm w-36"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="pos">POS</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>

            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative flex-1 md:w-64">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search payment #, patient..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="input input-sm pl-9 w-full"
                />
              </div>
              <button type="submit" className="btn btn-secondary btn-sm">
                Search
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p>Loading payments ledger...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CreditCard size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              No Payments Found
            </h3>
            <p className="text-sm max-w-sm mx-auto mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'No payments match the selected filters.'
                : 'No payments have been recorded yet. Click below to record patient settlements.'}
            </p>
            {canRecordPayment && (
              <Link to="/app/payments/new" className="btn btn-primary btn-sm">
                Record First Payment
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Payment #</th>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                  <th>Allocated Invoices</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const patientName = p.patient
                    ? `${p.patient.first_name} ${p.patient.last_name}`
                    : 'Unknown Patient';
                  const allocationCount = p.allocations?.length || 0;

                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td>
                        <Link
                          to={`/app/payments/${p.id}`}
                          className="font-mono font-semibold text-emerald-600 hover:text-emerald-800"
                        >
                          {p.payment_number}
                        </Link>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Calendar size={14} className="text-gray-400" />
                          <span>{p.payment_date}</span>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="font-medium text-gray-900">
                            {patientName}
                          </div>
                          {p.patient?.patient_identifier && (
                            <div className="text-xs font-mono text-gray-500">
                              {p.patient.patient_identifier}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{getMethodBadge(p.payment_method)}</td>
                      <td>
                        <span className="text-sm text-gray-600 font-mono">
                          {p.reference_number || '—'}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(p.amount, p.currency)}
                        </span>
                      </td>
                      <td>{getStatusBadge(p.status)}</td>
                      <td>
                        <div className="text-sm text-gray-600">
                          {allocationCount === 1 ? (
                            <span className="font-mono text-xs">
                              {p.allocations?.[0]?.invoice?.invoice_number || '1 invoice'}
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                              {allocationCount} invoices settled
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.receipt && (
                            <Link
                              to={`/app/receipts/${p.receipt.id}`}
                              className="btn btn-ghost btn-sm text-emerald-600 hover:text-emerald-700"
                              title="View Official Receipt"
                            >
                              <FileText size={16} />
                            </Link>
                          )}
                          <Link
                            to={`/app/payments/${p.id}`}
                            className="btn btn-ghost btn-sm text-gray-600 hover:text-gray-900"
                            title="View Details"
                          >
                            <ArrowRight size={16} />
                          </Link>
                        </div>
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
export default PaymentListPage;
