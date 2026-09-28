import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Search,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Ban,
  Printer,
  CreditCard,
} from 'lucide-react';
import { receiptService } from '../../services/receiptService';
import { usePractice } from '../../hooks/usePractice';
import type { ReceiptWithRelations, ReceiptStatus } from '../../types/models';

export const ReceiptListPage: React.FC = () => {
  const { activePractice } = usePractice();

  const [searchParams, setSearchParams] = useSearchParams();
  const [receipts, setReceipts] = useState<ReceiptWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusFilter = (searchParams.get('status') as ReceiptStatus | 'all') || 'all';
  const searchQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(searchQuery);

  const loadReceipts = async () => {
    if (!activePractice) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await receiptService.getReceipts(activePractice.id, {
        status: statusFilter,
        searchQuery: searchQuery || undefined,
      });
      setReceipts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load receipts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, [activePractice, statusFilter, searchQuery]);

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

  const handleStatusFilter = (status: ReceiptStatus | 'all') => {
    const newParams = new URLSearchParams(searchParams);
    if (status === 'all') {
      newParams.delete('status');
    } else {
      newParams.set('status', status);
    }
    setSearchParams(newParams);
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Official Receipts</h1>
              <p className="text-sm text-gray-500">
                View, audit, and reprint immutable patient payment receipts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/app/payments"
            className="btn btn-secondary flex items-center gap-2"
          >
            <CreditCard size={16} />
            <span>Payments Ledger</span>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger mb-6 flex items-start gap-3">
          <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
          <div>
            <div className="font-semibold">Error Loading Receipts</div>
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
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Receipts
            </button>
            <button
              onClick={() => handleStatusFilter('issued')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'issued'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Issued
            </button>
            <button
              onClick={() => handleStatusFilter('voided')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'voided'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Voided
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search receipt #, patient..."
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

      {/* Receipts Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p>Loading receipts archive...</p>
          </div>
        ) : receipts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              No Receipts Found
            </h3>
            <p className="text-sm max-w-sm mx-auto mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'No receipts match the selected filters.'
                : 'Receipts are automatically issued when payments are confirmed.'}
            </p>
            <Link to="/app/payments/new" className="btn btn-primary btn-sm">
              Record a Payment
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Issue Date</th>
                  <th>Patient</th>
                  <th>Settled Payment</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                  <th>Issued By</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => {
                  const patientName = r.patient
                    ? `${r.patient.first_name} ${r.patient.last_name}`
                    : 'Unknown Patient';

                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td>
                        <Link
                          to={`/app/receipts/${r.id}`}
                          className="font-mono font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
                        >
                          <FileText size={14} />
                          <span>{r.receipt_number}</span>
                        </Link>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Calendar size={14} className="text-gray-400" />
                          <span>{r.issue_date}</span>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="font-medium text-gray-900">{patientName}</div>
                          {r.patient?.patient_identifier && (
                            <div className="text-xs font-mono text-gray-500">
                              {r.patient.patient_identifier}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {r.payment ? (
                          <Link
                            to={`/app/payments/${r.payment_id}`}
                            className="font-mono text-xs text-emerald-700 hover:underline"
                          >
                            {r.payment.payment_number}
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="text-right">
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(r.amount, r.currency)}
                        </span>
                      </td>
                      <td>
                        {r.status === 'issued' ? (
                          <span className="badge badge-success flex items-center gap-1">
                            <CheckCircle2 size={12} /> Issued
                          </span>
                        ) : (
                          <span className="badge badge-danger flex items-center gap-1">
                            <Ban size={12} /> Voided
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="text-xs text-gray-600">
                          {r.issuer?.display_name || 'Staff'}
                        </span>
                      </td>
                      <td className="text-right">
                        <Link
                          to={`/app/receipts/${r.id}`}
                          className="btn btn-ghost btn-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 justify-end"
                        >
                          <Printer size={14} />
                          <span>View & Print</span>
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
export default ReceiptListPage;
