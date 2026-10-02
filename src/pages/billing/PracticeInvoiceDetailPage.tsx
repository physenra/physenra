// ==============================================================================
// PHYSENRA — PRACTICE SAAS INVOICE DETAIL VIEW
// File: src/pages/billing/PracticeInvoiceDetailPage.tsx
// Route: /app/billing/invoices/:invoiceId
//
// Governs:
// 1. Authoritative invoice itemization, line items, and totals display
// 2. Direct Paystack checkout trigger for open invoices (Owner only)
// 3. Read-only review for accountants and managers
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Receipt,
  ArrowLeft,
  CreditCard,
  Clock,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import { saasSubscriptionService } from '../../services/saasSubscriptionService';
import { formatNaira } from '../../utils/currency';
import type { SaasInvoice, SaasInvoiceLine } from '../../types/models';

export const PracticeInvoiceDetailPage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { activePractice } = usePractice();
  const { isOwner, isClinician, isReceptionist } = useRole();

  const [invoice, setInvoice] = useState<SaasInvoice | null>(null);
  const [lines, setLines] = useState<SaasInvoiceLine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isReadOnly = !isOwner;

  const loadInvoiceData = useCallback(async () => {
    if (!invoiceId || !activePractice?.id) return;

    try {
      setLoading(true);
      setErrorMessage(null);

      const allInvoices = await saasSubscriptionService.getPracticeInvoices(activePractice.id);
      const targetInvoice = allInvoices.find((i) => i.id === invoiceId);

      if (!targetInvoice) {
        setErrorMessage('Invoice not found or does not belong to the active practice.');
        setLoading(false);
        return;
      }

      const lineItems = await saasSubscriptionService.getInvoiceLines(targetInvoice.id);

      setInvoice(targetInvoice);
      setLines(lineItems);
    } catch (err: any) {
      console.error('Failed to load invoice:', err);
      setErrorMessage(err.message || 'Unable to retrieve invoice details.');
    } finally {
      setLoading(false);
    }
  }, [invoiceId, activePractice?.id]);

  useEffect(() => {
    loadInvoiceData();
  }, [loadInvoiceData]);

  if (isClinician || isReceptionist) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-rose-200 rounded-xl shadow-sm text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-600 mb-6">
          SaaS billing invoices are only accessible to practice owners, accountants, and managers.
        </p>
        <Link
          to="/app/dashboard"
          className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const handlePayNow = async () => {
    if (!invoice || !activePractice?.id || isReadOnly) return;

    try {
      setActionLoading(true);
      setErrorMessage(null);

      const checkoutInit = await saasSubscriptionService.initializePaystackCheckout(
        activePractice.id,
        invoice.id
      );

      if (checkoutInit.authorization_url) {
        window.location.href = checkoutInit.authorization_url;
      } else {
        throw new Error('Payment gateway did not provide a valid authorization URL.');
      }
    } catch (err: any) {
      console.error('Payment checkout initiation failed:', err);
      setErrorMessage(err.message || 'Payment initiation failed.');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Clock className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
        <p>Retrieving invoice details...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Invoice Not Found</h2>
        <p className="text-slate-500 text-sm mt-1 mb-6">
          {errorMessage || 'The requested invoice could not be located.'}
        </p>
        <Link
          to="/app/billing"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm"
        >
          <ArrowLeft size={16} />
          <span>Back to Billing</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back navigation */}
      <Link
        to="/app/billing"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition"
      >
        <ArrowLeft size={14} />
        <span>Back to Billing Overview</span>
      </Link>

      {/* Invoice Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Invoice Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Receipt className="w-6 h-6 text-teal-600" />
              <h1 className="text-2xl font-bold font-mono text-slate-900">{invoice.invoice_number}</h1>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Building2 size={13} />
              <span>{activePractice?.name}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                invoice.status === 'paid'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : invoice.status === 'open'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              Status: {invoice.status.toUpperCase()}
            </span>

            {invoice.status === 'open' && !isReadOnly && (
              <button
                onClick={handlePayNow}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition shadow-sm"
              >
                <CreditCard size={15} />
                <span>{actionLoading ? 'Initializing...' : 'Pay with Paystack'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Invoice Meta Grid */}
        <div className="p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 border-b border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block mb-1">Invoice Date</span>
            <span className="font-semibold text-slate-800">
              {new Date(invoice.created_at).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Due Date</span>
            <span className="font-semibold text-slate-800">
              {new Date(invoice.due_date).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Currency</span>
            <span className="font-semibold text-slate-800">{invoice.currency}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Paid At</span>
            <span className="font-semibold text-slate-800">
              {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString() : 'Unpaid'}
            </span>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="p-6 md:p-8">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Invoice Line Items
          </h3>
          <table className="w-full text-left text-sm text-slate-600 mb-6">
            <thead className="border-b border-slate-200 text-xs text-slate-400 uppercase">
              <tr>
                <th className="py-2 px-0 font-semibold">Description</th>
                <th className="py-2 px-4 font-semibold text-center">Quantity</th>
                <th className="py-2 px-4 font-semibold text-right">Unit Price</th>
                <th className="py-2 px-0 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 px-0 font-medium text-slate-900">{item.description}</td>
                  <td className="py-3 px-4 text-center">{item.quantity}</td>
                  <td className="py-3 px-4 text-right">{formatNaira(item.unit_price_cents)}</td>
                  <td className="py-3 px-0 font-semibold text-right text-slate-900">
                    {formatNaira(item.amount_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Summary */}
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">{formatNaira(invoice.subtotal_cents)}</span>
              </div>
              {invoice.discount_cents > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-{formatNaira(invoice.discount_cents)}</span>
                </div>
              )}
              {invoice.tax_cents > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Tax:</span>
                  <span>{formatNaira(invoice.tax_cents)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Due:</span>
                <span>{formatNaira(invoice.total_cents)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
