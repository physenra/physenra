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
  Copy,
  Check,
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
  SaasBankTransferRequest,
} from '../../types/models';

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

export const PracticeInvoiceDetailPage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { activePractice } = usePractice();
  const { isOwner, isAccountant, isManager, isClinician, isReceptionist } = useRole();

  const [invoice, setInvoice] = useState<SaasInvoice | null>(null);
  const [lines, setLines] = useState<SaasInvoiceLine[]>([]);
  const [payment, setPayment] = useState<SaasPayment | null>(null);
  const [subscription, setSubscription] = useState<(PracticeSubscription & { plan?: SaasPlan }) | null>(null);
  const [bankTransferRequest, setBankTransferRequest] = useState<SaasBankTransferRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'invoice' | 'receipt'>('invoice');

  // Reference submission state
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);
  const [customerRefInput, setCustomerRefInput] = useState<string>('');
  const [customerBankInput, setCustomerBankInput] = useState<string>('');
  const [transferDateInput, setTransferDateInput] = useState<string>('');
  const [transferNotesInput, setTransferNotesInput] = useState<string>('');
  const [submittingReference, setSubmittingReference] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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

      // Load lines, payment, subscription, and bank transfer request concurrently
      const [lineItems, paymentData, subData, btrList] = await Promise.all([
        saasSubscriptionService.getInvoiceLines(targetInvoice.id),
        saasSubscriptionService.getInvoicePayment(targetInvoice.id, activePractice.id),
        saasSubscriptionService.getPracticeSubscription(activePractice.id),
        saasSubscriptionService.getPracticeBankTransferRequests(activePractice.id).catch(() => []),
      ]);

      const foundBtr = btrList.find((r) => r.invoice_id === targetInvoice.id) || null;

      setInvoice(targetInvoice);
      setLines(lineItems);
      setPayment(paymentData);
      setSubscription(subData);
      setBankTransferRequest(foundBtr);

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

  const handleCopyAccount = (accountNumber: string) => {
    try {
      navigator.clipboard.writeText(accountNumber);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleSubmitReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankTransferRequest || !customerRefInput.trim()) {
      setErrorMessage('Please provide your bank transfer reference or transaction narration.');
      return;
    }

    try {
      setSubmittingReference(true);
      const combinedNotes = [
        customerBankInput.trim() ? `Remitter Bank: ${customerBankInput.trim()}` : '',
        transferNotesInput.trim(),
      ]
        .filter(Boolean)
        .join(' | ');

      const updated = await saasSubscriptionService.submitBankTransferReference(
        bankTransferRequest.id,
        customerRefInput.trim(),
        transferDateInput ? new Date(transferDateInput).toISOString() : undefined,
        combinedNotes || undefined
      );

      setBankTransferRequest(updated);
      setActionSuccess('Transfer reference submitted for Platform Admin review. Entitlements will activate once confirmed.');
      setCustomerRefInput('');
      setCustomerBankInput('');
      setTransferDateInput('');
      setTransferNotesInput('');
      await loadInvoiceData();
    } catch (err: any) {
      console.error('Failed to submit reference:', err);
      setErrorMessage(err.message || 'Failed to submit reference.');
    } finally {
      setSubmittingReference(false);
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
    ? formatDate(invoice.paid_at)
    : payment?.settled_at
    ? formatDate(payment.settled_at)
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

      {/* Success alert */}
      {actionSuccess && (
        <div className="print:hidden mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Bank Transfer Instructions / Status Banner (Open / Under Review / Pending Transfer) */}
      {bankTransferRequest && (
        <div className="print:hidden mb-6 p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Manual Bank Transfer: {bankTransferRequest.request_number}
              </h3>
            </div>
            <div>
              {bankTransferRequest.status === 'pending_transfer' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  Transfer Pending
                </span>
              )}
              {bankTransferRequest.status === 'submitted_for_review' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                  Under Admin Review
                </span>
              )}
              {bankTransferRequest.status === 'confirmed' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Confirmed & Settled
                </span>
              )}
              {bankTransferRequest.status === 'rejected' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                  Review Rejected
                </span>
              )}
            </div>
          </div>

          {bankTransferRequest.status === 'pending_transfer' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="text-slate-600">
                  Please transfer the exact invoice amount of{' '}
                  <strong className="text-slate-900">{formatNaira(bankTransferRequest.amount_cents)}</strong> to
                  the following receiving account:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Bank:</span>
                    <span className="font-bold text-slate-800">{bankTransferRequest.bank_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Account Number:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-teal-800">{bankTransferRequest.account_number}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyAccount(bankTransferRequest.account_number)}
                        className="text-slate-400 hover:text-slate-600"
                        title="Copy account number"
                      >
                        {copiedAccount ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Account Name:</span>
                    <span className="font-semibold text-slate-800">{bankTransferRequest.account_name}</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  <strong>Narration / Remark:</strong> Use reference{' '}
                  <span className="font-mono font-bold text-slate-800">{bankTransferRequest.request_number}</span>
                </div>
              </div>

              {!isReadOnly && (
                <form onSubmit={handleSubmitReference} className="space-y-3 pt-1">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Submit Transfer Reference
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Bank Transaction Reference / Narration <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={customerRefInput}
                        onChange={(e) => setCustomerRefInput(e.target.value)}
                        placeholder="e.g. TRF-12345678 or narration"
                        className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Your Bank (Optional)</label>
                      <input
                        type="text"
                        value={customerBankInput}
                        onChange={(e) => setCustomerBankInput(e.target.value)}
                        placeholder="e.g. Zenith Bank"
                        className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Additional Notes (Optional)</label>
                    <input
                      type="text"
                      value={transferNotesInput}
                      onChange={(e) => setTransferNotesInput(e.target.value)}
                      placeholder="Account holder name, date of transfer, etc."
                      className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={submittingReference || !customerRefInput.trim()}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition disabled:opacity-50 shadow-sm"
                    >
                      {submittingReference ? 'Submitting Reference...' : 'Submit Reference for Admin Review'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {bankTransferRequest.status === 'submitted_for_review' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
              <p className="font-semibold">Transfer Reference Submitted for Verification</p>
              <p>
                Reference: <strong className="font-mono">{bankTransferRequest.customer_reference}</strong>
                {bankTransferRequest.submitted_at && (
                  <span> (submitted {formatDate(bankTransferRequest.submitted_at)})</span>
                )}.
                A Platform Admin will review the receiving bank statement and settle this invoice.
              </p>
            </div>
          )}

          {bankTransferRequest.status === 'rejected' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
              <p className="font-semibold">Payment Verification Rejected</p>
              <p>
                Reason: <strong>{bankTransferRequest.rejection_reason || 'Payment could not be verified.'}</strong>
              </p>
            </div>
          )}
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
                Physenra Platform Technologies
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
                {formatDate(invoice.created_at)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Due Date</span>
              <span className="font-semibold text-slate-800">
                {formatDate(invoice.due_date)}
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
                    {formatDate(invoice.created_at)} – {formatDate(invoice.due_date)}
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
                    <span className="font-semibold text-slate-800">
                      {payment?.gateway_provider === 'manual_bank_transfer' || payment?.payment_method === 'bank_transfer'
                        ? 'Manual Bank Transfer (Admin Verified)'
                        : 'Paystack'}
                    </span>
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
                Physenra Platform Technologies
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
                  {payment?.gateway_provider === 'manual_bank_transfer' || payment?.payment_method === 'bank_transfer'
                    ? 'Manual Bank Transfer (Admin Confirmed)'
                    : 'Paystack Online Settlement'}
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
                  Period: {formatDate(invoice.created_at)} – {formatDate(invoice.due_date)}
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
