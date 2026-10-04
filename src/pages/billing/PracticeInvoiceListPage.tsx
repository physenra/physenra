// ==============================================================================
// PHYSENRA — PRACTICE SAAS INVOICES & PAYMENT HISTORY LIST VIEW
// File: src/pages/billing/PracticeInvoiceListPage.tsx
// Route: /app/billing/invoices
//
// Governs:
// 1. Authoritative invoice history listing, search, and status filtering
// 2. Direct Paystack checkout trigger for open eligible invoices (Owner only)
// 3. Read-only review for accountants and practice managers
// 4. Role-based access boundaries (Clinicians & Receptionists restricted)
// 5. Strict multi-tenant isolation via activePractice context
// ==============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt,
  Search,
  ArrowLeft,
  CreditCard,
  Clock,
  AlertCircle,
  Filter,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import { saasSubscriptionService } from '../../services/saasSubscriptionService';
import { formatNaira } from '../../utils/currency';
import type { SaasInvoice } from '../../types/models';

function formatDate(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '—';
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString();
  } catch {
    return '—';
  }
}

type InvoiceFilterStatus = 'all' | 'open' | 'paid' | 'uncollectible' | 'void';

export const PracticeInvoiceListPage: React.FC = () => {
  const { activePractice } = usePractice();
  const { isOwner, isAccountant, isManager, isClinician, isReceptionist } = useRole();

  const [invoices, setInvoices] = useState<SaasInvoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<InvoiceFilterStatus>('all');

  const isAuthorizedViewer = isOwner || isAccountant || isManager;
  const isReadOnly = !isOwner;

  const loadInvoices = useCallback(async () => {
    if (!activePractice?.id) return;

    try {
      setLoading(true);
      setErrorMessage(null);

      const data = await saasSubscriptionService.getPracticeInvoices(activePractice.id);
      setInvoices(data);
    } catch (err: any) {
      console.error('Failed to load practice invoices:', err);
      setErrorMessage(err.message || 'Unable to retrieve subscription invoice history.');
    } finally {
      setLoading(false);
    }
  }, [activePractice?.id]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // ----------------------------------------------------------------------------
  // Memoized Filters & Counts (MUST BE TOP-LEVEL BEFORE CONDITIONAL RETURNS)
  // ----------------------------------------------------------------------------
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Status filter
      if (statusFilter !== 'all' && inv.status !== statusFilter) {
        return false;
      }
      // Search filter (by invoice number)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        return inv.invoice_number.toLowerCase().includes(query);
      }
      return true;
    });
  }, [invoices, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: invoices.length,
      open: invoices.filter((i) => i.status === 'open').length,
      paid: invoices.filter((i) => i.status === 'paid').length,
      uncollectible: invoices.filter((i) => i.status === 'uncollectible').length,
      void: invoices.filter((i) => i.status === 'void').length,
    };
  }, [invoices]);

  // ----------------------------------------------------------------------------
  // Pay Now Handler (Owner Only)
  // ----------------------------------------------------------------------------
  const handlePayInvoice = async (invoiceId: string) => {
    if (!activePractice?.id || isReadOnly) return;

    try {
      setActionLoading(invoiceId);
      setErrorMessage(null);

      const checkoutInit = await saasSubscriptionService.initializePaystackCheckout(
        activePractice.id,
        invoiceId
      );

      if (checkoutInit.authorization_url) {
        window.location.href = checkoutInit.authorization_url;
      } else {
        throw new Error('Payment gateway did not provide a valid authorization URL.');
      }
    } catch (err: any) {
      console.error('Checkout initiation failed:', err);
      setErrorMessage(err.message || 'Payment initiation failed.');
      setActionLoading(null);
    }
  };

  // ----------------------------------------------------------------------------
  // Access Control Boundary (Safe: all hooks have executed unconditionally)
  // ----------------------------------------------------------------------------
  if (isClinician || isReceptionist) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-rose-200 rounded-xl shadow-sm text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-600 mb-6 text-sm">
          Subscription billing invoices and receipts are only accessible to practice owners, accountants, and commercial administrators.
        </p>
        <Link
          to="/app/dashboard"
          className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm font-semibold"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (!isAuthorizedViewer) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-rose-200 rounded-xl shadow-sm text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-600 mb-6 text-sm">
          Subscription billing invoices and receipts are only accessible to practice owners, accountants, and commercial administrators.
        </p>
        <Link
          to="/app/dashboard"
          className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm font-semibold"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header & Navigation */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/app/billing"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition"
          >
            <ArrowLeft size={14} />
            <span>Back to Billing Overview</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
              <Receipt size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SaaS Invoices</h1>
              <p className="text-xs text-slate-500">
                Authoritative subscription invoices, payment receipts, and billing history for {activePractice?.name}.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadInvoices}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Status filter tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'all'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'open'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Open ({counts.open})
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'paid'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Paid ({counts.paid})
          </button>
          <button
            onClick={() => setStatusFilter('uncollectible')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'uncollectible'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Uncollectible ({counts.uncollectible})
          </button>
          <button
            onClick={() => setStatusFilter('void')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'void'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Void ({counts.void})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Invoices List Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
            <p className="text-xs">Loading billing invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-16 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">No invoices yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Invoices will appear here when subscription billing activity occurs for your practice.
            </p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <Filter className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-700">No matching invoices</h3>
            <p className="text-xs text-slate-400 mt-1">
              No invoices match the selected filter or search term.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Issue Date</th>
                  <th className="py-3 px-4 font-semibold">Due Date</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Currency</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Payment Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900">
                      <Link
                        to={`/app/billing/invoices/${inv.id}`}
                        className="text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-1"
                      >
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {formatDate(inv.created_at)}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 text-xs">
                      {formatNaira(inv.total_cents)}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-600">
                      {inv.currency}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : inv.status === 'open'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : inv.status === 'uncollectible'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium">
                      {inv.status === 'paid' ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          <span>Paid</span>
                        </span>
                      ) : inv.status === 'open' ? (
                        <span className="text-amber-700 flex items-center gap-1">
                          <Clock size={13} />
                          <span>Payment Due</span>
                        </span>
                      ) : inv.status === 'void' ? (
                        <span className="text-slate-500">Voided</span>
                      ) : (
                        <span className="text-rose-600">Uncollectible</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.status === 'open' && !isReadOnly && (
                          <button
                            onClick={() => handlePayInvoice(inv.id)}
                            disabled={actionLoading === inv.id}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition shadow-sm"
                          >
                            <CreditCard size={13} />
                            <span>{actionLoading === inv.id ? 'Processing...' : 'Pay Now'}</span>
                          </button>
                        )}
                        <Link
                          to={`/app/billing/invoices/${inv.id}`}
                          className="px-3 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg transition"
                        >
                          View
                        </Link>
                      </div>
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
