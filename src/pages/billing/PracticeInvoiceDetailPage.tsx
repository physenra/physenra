// ==============================================================================
// PHYSENRA — PRACTICE SAAS INVOICE & RECEIPT DETAIL VIEW
// File: src/pages/billing/PracticeInvoiceDetailPage.tsx
// Route: /app/billing/invoices/:invoiceId
//
// Governs:
// 1. Authoritative invoice itemization, line items, and totals display
// 2. Official payment receipt generation and view for paid invoices
// 3. Browser-native printing (window.print() with @media print stylesheet)
// 4. Direct Paystack checkout trigger for open invoices (Owner only)
// 5. Read-only review for accountants and practice managers
// 6. Strict multi-tenant isolation via activePractice context
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  Clock,
  AlertCircle,
  Building2,
  Printer,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Mail,
  Phone,
} from 'lucide-react';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import { saasSubscriptionService } from '../../services/saasSubscriptionService';
import { formatNaira } from '../../utils/currency';
import { BrandLogo } from '../../components/ui/BrandLogo';
import type {
  SaasInvoice,
  SaasInvoiceLine,
  SaasPayment,
  PracticeSubscription,
  SaasPlan,
} from '../../types/models';

export const PracticeInvoiceDetailPage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { activePractice } = usePractice();
  const { isOwner, isAccountant, isManager, isClinician, isReceptionist } = useRole();

  const [invoice, setInvoice] = useState<SaasInvoice | null>(null);
  const [lines, setLines] = useState<SaasInvoiceLine[]>([]);
  const [payment, setPayment] = useState<SaasPayment | null>(null);
  const [subscription, setSubscription] = useState<(PracticeSubscription & { plan?: SaasPlan }) | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'invoice' | 'receipt'>('invoice');

  const isAuthorizedViewer = isOwner || isAccountant || isManager;
  const isReadOnly = !isOwner;

  const loadInvoiceData = useCallback(async () => {
    if (!invoiceId || !activePractice?.id) return;

    try {
      setLoading(true);
      setErrorMessage(null);

      // Load invoices scoped strictly to the authenticated practice (Tenant Isolation)
      const allInvoices = await saasSubscriptionService.getPracticeInvoices(activePractice.id);
      const targetInvoice = allInvoices.find((i) => i.id === invoiceId);

      if (!targetInvoice || targetInvoice.practice_id !== activePractice.id) {
        setErrorMessage('Invoice not found or does not belong to the active practice.');
        setLoading(false);
        return;
      }

      // Load lines, payment, and subscription concurrently
      const [lineItems, paymentData, subData] = await Promise.all([
        saasSubscriptionService.getInvoiceLines(targetInvoice.id),
        saasSubscriptionService.getInvoicePayment(targetInvoice.id, activePractice.id),
        saasSubscriptionService.getPracticeSubscription(activePractice.id),
      ]);

      setInvoice(targetInvoice);
      setLines(lineItems);
      setPayment(paymentData);
      setSubscription(subData);

      // Default to invoice view
      setViewMode('invoice');
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

  // ----------------------------------------------------------------------------
  // Access Control Boundary
  // ----------------------------------------------------------------------------
  if (isClinician || isReceptionist) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-rose-200 rounded-xl shadow-sm text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-600 mb-6 text-sm">
          SaaS billing invoices and receipts are only accessible to practice owners, accountants, and commercial administrators.
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
          SaaS billing invoices and receipts are only accessible to practice owners, accountants, and commercial administrators.
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

  // ----------------------------------------------------------------------------
  // Pay Now Handler (Owner Only, Open Invoices Only)
  // ----------------------------------------------------------------------------
  const handlePayNow = async () => {
    if (!invoice || !activePractice?.id || isReadOnly || invoice.status !== 'open') return;

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

  // ----------------------------------------------------------------------------
  // Print Triggers (Native Browser window.print())
  // ----------------------------------------------------------------------------
  const handlePrintInvoice = () => {
    setViewMode('invoice');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePrintReceipt = () => {
    setViewMode('receipt');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400">
        <Clock className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
        <p className="text-sm">Retrieving invoice details...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Invoice Not Found</h2>
        <p className="text-slate-500 text-sm mt-1 mb-6">
          {errorMessage || 'The requested invoice could not be located or does not belong to your practice.'}
        </p>
        <Link
          to="/app/billing/invoices"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          <span>Back to Invoices</span>
        </Link>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';
  const planName = subscription?.plan?.name || 'Physenra Subscription';
  const billingIntervalLabel = subscription?.billing_interval
    ? subscription.billing_interval.charAt(0).toUpperCase() + subscription.billing_interval.slice(1)
    : 'Monthly';

  const paymentReference = payment?.gateway_reference || payment?.payment_number || 'N/A';
  const paymentSettledDate = invoice.paid_at
    ? new Date(invoice.paid_at).toLocaleDateString()
    : payment?.settled_at
    ? new Date(payment.settled_at).toLocaleDateString()
    : 'N/A';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top Action & Navigation Bar — Hidden during printing */}
      <div className="print:hidden mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/app/billing/invoices"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft size={14} />
            <span>Back to Invoices</span>
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            to="/app/billing"
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            Billing Overview
          </Link>
        </div>

        {/* View mode toggle & Print actions */}
        <div className="flex flex-wrap items-center gap-2">
          {isPaid && (
            <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600">
              <button
                onClick={() => setViewMode('invoice')}
                className={`px-3 py-1 rounded-md transition ${
                  viewMode === 'invoice' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'hover:text-slate-900'
                }`}
              >
                Invoice View
              </button>
              <button
                onClick={() => setViewMode('receipt')}
                className={`px-3 py-1 rounded-md transition ${
                  viewMode === 'receipt' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'hover:text-slate-900'
                }`}
              >
                Receipt View
              </button>
            </div>
          )}

          {/* Print Invoice Button */}
          <button
            onClick={handlePrintInvoice}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Printer size={14} />
            <span>Print Invoice</span>
          </button>

          {/* Print Receipt Button (Paid Only) */}
          {isPaid && (
            <button
              onClick={handlePrintReceipt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <FileText size={14} />
              <span>Print Receipt</span>
            </button>
          )}

          {/* Pay Now Button (Open Invoice Only, Owner Only) */}
          {invoice.status === 'open' && !isReadOnly && (
            <button
              onClick={handlePayNow}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition shadow-sm"
            >
              <CreditCard size={14} />
              <span>{actionLoading ? 'Initializing Checkout...' : 'Pay with Paystack'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="print:hidden mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* INVOICE VIEW                                                         */}
      {/* ==================================================================== */}
      {viewMode === 'invoice' && (
        <div className="printable-document bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header Banner */}
          <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-start md:justify-between gap-6 bg-slate-50">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <BrandLogo size="md" to="/app/billing" />
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Physenra Healthcare Technologies Limited
              </p>
              <p className="text-xs text-slate-400">
                Lagos, Nigeria • billing@physenra.com
              </p>
            </div>

            <div className="text-left md:text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-1">
                Commercial Invoice
              </span>
              <h1 className="text-2xl font-bold font-mono text-slate-900 tracking-tight mb-2">
                {invoice.invoice_number}
              </h1>
              <div className="inline-block">
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                    invoice.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : invoice.status === 'open'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : invoice.status === 'uncollectible'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  Status: {invoice.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 border-b border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Issue Date</span>
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
              <span className="text-slate-400 block mb-1">Payment Status</span>
              <span
                className={`font-semibold ${
                  invoice.status === 'paid'
                    ? 'text-emerald-700'
                    : invoice.status === 'open'
                    ? 'text-amber-700'
                    : 'text-slate-700'
                }`}
              >
                {invoice.status === 'paid' ? 'Paid / Settled' : invoice.status === 'open' ? 'Payment Due' : invoice.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Bill To & Billing Period Section */}
          <div className="p-6 md:p-8 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white text-xs">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Billed To
              </h3>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Building2 size={15} className="text-teal-600" />
                  <span>{activePractice?.name}</span>
                </div>
                <p className="text-slate-600">Practice ID: {activePractice?.id}</p>
                {activePractice?.email && (
                  <p className="text-slate-500 flex items-center gap-1">
                    <Mail size={12} />
                    <span>{activePractice.email}</span>
                  </p>
                )}
                {activePractice?.phone && (
                  <p className="text-slate-500 flex items-center gap-1">
                    <Phone size={12} />
                    <span>{activePractice.phone}</span>
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Subscription Details
              </h3>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan:</span>
                  <span className="font-semibold text-slate-800">{planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Interval:</span>
                  <span className="font-semibold text-slate-800">{billingIntervalLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Billing Period:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(invoice.created_at).toLocaleDateString()} – {new Date(invoice.due_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="p-6 md:p-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Itemized Line Items
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 mb-6">
                <thead className="border-b border-slate-200 uppercase text-slate-400 font-semibold bg-slate-50">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 px-3 text-center text-slate-400 italic">
                        {planName} ({billingIntervalLabel} Subscription)
                      </td>
                    </tr>
                  ) : (
                    lines.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 px-3 font-medium text-slate-900">{item.description}</td>
                        <td className="py-3 px-3 text-center text-slate-700">{item.quantity}</td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {formatNaira(item.unit_price_cents)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-right text-slate-900">
                          {formatNaira(item.amount_cents)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Authoritative Financial Totals */}
            <div className="flex justify-end pt-4 border-t border-slate-100 totals-section">
              <div className="w-full sm:w-72 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">
                    {formatNaira(invoice.subtotal_cents)}
                  </span>
                </div>
                {invoice.discount_cents > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount:</span>
                    <span>-{formatNaira(invoice.discount_cents)}</span>
                  </div>
                )}
                {invoice.tax_cents > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Tax (VAT):</span>
                    <span>{formatNaira(invoice.tax_cents)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Due:</span>
                  <span>{formatNaira(invoice.total_cents)}</span>
                </div>
              </div>
            </div>

            {/* Payment Details Section (Paid Invoices Only) */}
            {isPaid && (
              <div className="mt-8 p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 payment-section">
                <div className="flex items-center gap-2 mb-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Payment Settlement Details</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Gateway:</span>
                    <span className="font-semibold text-slate-800">Paystack</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Payment Reference:</span>
                    <span className="font-mono text-slate-800 text-[11px] truncate block" title={paymentReference}>
                      {paymentReference}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Settlement Date:</span>
                    <span className="font-semibold text-slate-800">{paymentSettledDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Amount Settled:</span>
                    <span className="font-bold text-emerald-700">
                      {formatNaira(payment?.amount_cents || invoice.total_cents)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* RECEIPT VIEW (Paid Invoices)                                         */}
      {/* ==================================================================== */}
      {viewMode === 'receipt' && isPaid && (
        <div className="printable-document receipt-card bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12">
          {/* Receipt Top Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-8 border-b border-slate-200">
            <div>
              <BrandLogo size="md" to="/app/billing" />
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Physenra Healthcare Technologies Limited
              </p>
              <p className="text-xs text-slate-400">
                Official SaaS Subscription Payment Receipt
              </p>
            </div>
            <div className="text-left md:text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold uppercase mb-2">
                <CheckCircle2 size={13} />
                <span>PAID IN FULL</span>
              </span>
              <p className="text-xs text-slate-500 font-mono">
                Receipt Ref: {paymentReference}
              </p>
              <p className="text-xs text-slate-400">
                Invoice Ref: {invoice.invoice_number}
              </p>
            </div>
          </div>

          {/* Receipt Details Grid */}
          <div className="py-8 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
            <div className="space-y-3">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">
                  Received From
                </span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                  {activePractice?.name}
                </span>
                <span className="text-slate-500 block">
                  Practice ID: {activePractice?.id}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">
                  Payment Method
                </span>
                <span className="text-slate-800 font-semibold block mt-0.5">
                  Paystack Online Settlement
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">
                  Payment Date
                </span>
                <span className="text-slate-800 font-semibold block mt-0.5">
                  {paymentSettledDate}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">
                  Subscription Covered
                </span>
                <span className="text-slate-800 font-semibold block mt-0.5">
                  {planName} ({billingIntervalLabel})
                </span>
                <span className="text-slate-500 block">
                  Period: {new Date(invoice.created_at).toLocaleDateString()} – {new Date(invoice.due_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Receipt Settlement Summary Box */}
          <div className="py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">
                This receipt confirms full settlement of the referenced commercial invoice.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <ShieldCheck size={13} className="text-teal-600" />
                <span>Digitally verified via authoritative platform records.</span>
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-right min-w-[200px]">
              <span className="text-xs text-slate-500 block">Amount Paid</span>
              <span className="text-2xl font-bold text-slate-900 block font-mono">
                {formatNaira(payment?.amount_cents || invoice.total_cents)}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold block">
                {invoice.currency} • Zero Outstanding Balance
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
