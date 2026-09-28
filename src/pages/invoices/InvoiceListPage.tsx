import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Receipt,
  Search,
  Plus,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Lock,
  FileEdit,
  ArrowRight,
  Ban,
  Clock,
} from 'lucide-react';
import { billingService } from '../../services/billingService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type { InvoiceWithRelations, InvoiceStatus } from '../../types/models';

export const InvoiceListPage: React.FC = () => {
  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant, isReceptionist } = useRole();
  const canCreateInvoice = isOwner || isManager || isAccountant || isReceptionist;

  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusFilter = (searchParams.get('status') as InvoiceStatus | 'all') || 'all';
  const searchQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(searchQuery);

  const loadInvoices = async () => {
    if (!activePractice) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await billingService.getInvoices(activePractice.id, {
        status: statusFilter,
        searchQuery: searchQuery || undefined,
      });
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
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

  const handleStatusFilter = (status: InvoiceStatus | 'all') => {
    const newParams = new URLSearchParams(searchParams);
    if (status === 'all') {
      newParams.delete('status');
    } else {
      newParams.set('status', status);
    }
    setSearchParams(newParams);
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'issued':
        return (
          <span className="badge badge-primary flex items-center gap-1">
            <Lock size={12} /> Issued
          </span>
        );
      case 'draft':
        return (
          <span className="badge badge-warning flex items-center gap-1">
            <FileEdit size={12} /> Draft
          </span>
        );
      case 'paid':
        return (
          <span className="badge badge-success flex items-center gap-1">
            <CheckCircle2 size={12} /> Paid
          </span>
        );
      case 'partially_paid':
        return (
          <span className="badge badge-info flex items-center gap-1">
            <Clock size={12} /> Partial
          </span>
        );
      case 'void':
        return (
          <span className="badge badge-danger flex items-center gap-1">
            <Ban size={12} /> Void
          </span>
        );
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return `${currency} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Summaries
  const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.status !== 'void' ? Number(inv.grand_total) : 0), 0);
  const totalOutstanding = invoices.reduce((acc, inv) => acc + (inv.status === 'issued' || inv.status === 'partially_paid' ? Number(inv.balance_due) : 0), 0);

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Receipt className="text-primary-600" size={28} />
            Invoices & Billing
          </h1>
          <p className="page-subtitle">
            Manage practice invoices, itemized fee tariffs, and accounts receivable
          </p>
        </div>

        {canCreateInvoice && (
          <Link to="/app/invoices/new" className="btn btn-primary flex items-center gap-2">
            <Plus size={18} />
            <span>Create Invoice</span>
          </Link>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-sm font-medium text-gray-500">Total Invoices</div>
          <div className="text-2xl font-bold mt-1 text-gray-900">{invoices.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm font-medium text-gray-500">Draft Invoices</div>
          <div className="text-2xl font-bold mt-1 text-amber-600">
            {invoices.filter((i) => i.status === 'draft').length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm font-medium text-gray-500">Active Receivable</div>
          <div className="text-2xl font-bold mt-1 text-primary-600">
            {formatCurrency(totalOutstanding)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm font-medium text-gray-500">Total Invoiced</div>
          <div className="text-2xl font-bold mt-1 text-gray-900">
            {formatCurrency(totalInvoiced)}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-80">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search invoice # or notes..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
          </form>

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1">
            {(['all', 'draft', 'issued', 'partially_paid', 'paid', 'void'] as const).map((st) => (
              <button
                key={st}
                onClick={() => handleStatusFilter(st)}
                className={`btn btn-sm ${
                  statusFilter === st ? 'btn-primary' : 'btn-ghost'
                }`}
              >
                {st.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="alert alert-danger mb-6 flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Invoice Table */}
      {isLoading ? (
        <div className="card p-12 text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
          Loading invoices...
        </div>
      ) : invoices.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          <Receipt size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No invoices found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search query or filter parameters.'
              : 'Create your first invoice to bill patient services or supplies.'}
          </p>
          {canCreateInvoice && (
            <Link to="/app/invoices/new" className="btn btn-primary inline-flex items-center gap-2">
              <Plus size={18} />
              <span>Create Invoice</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Patient</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th className="text-right">Grand Total</th>
                <th className="text-right">Balance Due</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td>
                    <Link
                      to={`/app/invoices/${inv.id}`}
                      className="font-medium text-primary-600 hover:text-primary-800 flex items-center gap-1"
                    >
                      <Receipt size={14} />
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td>
                    {inv.patient ? (
                      <div>
                        <div className="font-medium text-gray-900">
                          {inv.patient.first_name} {inv.patient.last_name}
                        </div>
                        <div className="text-xs text-gray-500">{inv.patient.patient_identifier}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td>
                    <div className="text-sm text-gray-700 flex items-center gap-1">
                      <Calendar size={14} className="text-gray-400" />
                      {inv.issue_date}
                    </div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-700">
                      {inv.due_date || <span className="text-gray-400">Immediate</span>}
                    </div>
                  </td>
                  <td>{getStatusBadge(inv.status)}</td>
                  <td className="text-right font-semibold text-gray-900">
                    {formatCurrency(Number(inv.grand_total), inv.currency)}
                  </td>
                  <td className="text-right font-medium">
                    {Number(inv.balance_due) > 0 ? (
                      <span className="text-amber-600">
                        {formatCurrency(Number(inv.balance_due), inv.currency)}
                      </span>
                    ) : (
                      <span className="text-green-600">
                        {formatCurrency(0, inv.currency)}
                      </span>
                    )}
                  </td>
                  <td className="text-right">
                    <Link
                      to={`/app/invoices/${inv.id}`}
                      className="btn btn-sm btn-ghost inline-flex items-center gap-1"
                    >
                      <span>View</span>
                      <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default InvoiceListPage;
