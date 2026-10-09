import React, { useEffect, useState } from 'react';
import { saasSubscriptionService } from '../../services/saasSubscriptionService';
import type { SaasInvoice, SaasPayment, SaasBankTransferRequestWithRelations } from '../../types/models';
import {
  Receipt,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Radio,
  AlertCircle,
  XCircle,
  Building2,
  ShieldAlert,
  Check,
  X,
} from 'lucide-react';

interface WebhookTelemetryItem {
  id: string;
  gateway: string;
  external_event_id: string;
  event_type: string;
  signature_verified: boolean;
  processed: boolean;
  error_message: string | null;
  received_at: string;
  processed_at: string | null;
}

export const PlatformBillingPage: React.FC = () => {
  const [invoices, setInvoices] = useState<SaasInvoice[]>([]);
  const [payments, setPayments] = useState<SaasPayment[]>([]);
  const [transfers, setTransfers] = useState<SaasBankTransferRequestWithRelations[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookTelemetryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'transfers' | 'webhooks'>('invoices');
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states for manual bank transfer confirmation & rejection
  const [transferToConfirm, setTransferToConfirm] = useState<SaasBankTransferRequestWithRelations | null>(null);
  const [confirming, setConfirming] = useState<boolean>(false);
  const [transferToReject, setTransferToReject] = useState<SaasBankTransferRequestWithRelations | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejecting, setRejecting] = useState<boolean>(false);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [invData, pmtData, trData, whData] = await Promise.all([
        saasSubscriptionService.getAllInvoices(),
        saasSubscriptionService.getAllPayments(),
        saasSubscriptionService.getAllBankTransferRequests().catch(() => []),
        saasSubscriptionService.getWebhookTelemetry().catch(() => []),
      ]);
      setInvoices(invData);
      setPayments(pmtData);
      setTransfers(trData);
      setWebhooks(whData);
    } catch (err: unknown) {
      console.error('Failed to load billing records:', err);
      setError(err instanceof Error ? err.message : 'Error fetching billing records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const handleConfirmTransfer = async () => {
    if (!transferToConfirm?.id) return;
    try {
      setConfirming(true);
      setError(null);
      setActionSuccess(null);

      await saasSubscriptionService.confirmBankTransferPayment(transferToConfirm.id);
      setActionSuccess(
        `Payment confirmed for ${transferToConfirm.request_number}. Invoice ${transferToConfirm.invoice?.invoice_number || ''} marked paid and subscription activated.`
      );
      setTransferToConfirm(null);
      await fetchBillingData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to confirm bank transfer payment');
    } finally {
      setConfirming(false);
    }
  };

  const handleRejectTransfer = async () => {
    if (!transferToReject?.id) return;
    try {
      setRejecting(true);
      setError(null);
      setActionSuccess(null);

      if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
        throw new Error('A rejection reason of at least 5 characters is mandatory.');
      }

      await saasSubscriptionService.rejectBankTransferPayment(transferToReject.id, rejectionReason.trim());
      setActionSuccess(`Payment request ${transferToReject.request_number} rejected.`);
      setTransferToReject(null);
      setRejectionReason('');
      await fetchBillingData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject bank transfer payment');
    } finally {
      setRejecting(false);
    }
  };

  const formatNaira = (cents: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const totalCollectedCents = payments.reduce((acc, p) => (p.status === 'successful' ? acc + p.amount_cents : acc), 0);
  const totalInvoicedCents = invoices.reduce((acc, i) => acc + i.total_cents, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-400" />
            Billing, Invoices & Settlement
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Global SaaS commercial ledger, invoice lifecycle, Paystack settlement, and webhook telemetry.
          </p>
        </div>
        <button
          onClick={fetchBillingData}
          className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 flex items-center gap-2 self-start transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Settled Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{formatNaira(totalCollectedCents)}</div>
            <p className="text-xs text-slate-500 mt-1">{payments.filter((p) => p.status === 'successful').length} successful payments</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Invoiced Amount</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{formatNaira(totalInvoicedCents)}</div>
            <p className="text-xs text-slate-500 mt-1">{invoices.length} invoices generated</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payment Collection Rate</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {totalInvoicedCents > 0
                ? `${Math.round((totalCollectedCents / totalInvoicedCents) * 100)}%`
                : '100%'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Paid vs outstanding invoice ratio</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'invoices'
              ? 'bg-slate-800 text-emerald-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Platform Invoices ({invoices.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'payments'
              ? 'bg-slate-800 text-emerald-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Settlement Payments ({payments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'transfers'
              ? 'bg-slate-800 text-teal-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Bank Transfer Queue ({transfers.length})</span>
          {transfers.filter((t) => t.status === 'submitted_for_review').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-900">
              {transfers.filter((t) => t.status === 'submitted_for_review').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'webhooks'
              ? 'bg-slate-800 text-emerald-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Webhook Telemetry ({webhooks.length})</span>
        </button>
      </div>

      {/* Table Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {activeTab === 'invoices' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Practice ID</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Paid At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Loading invoices...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Zero SaaS invoices issued.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-mono font-medium text-white">{inv.invoice_number}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{inv.practice_id.slice(0, 8)}...</td>
                      <td className="px-6 py-4 font-semibold text-emerald-400">
                        {formatNaira(inv.total_cents)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300">
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(inv.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Payment #</th>
                  <th className="px-6 py-4">Gateway Reference</th>
                  <th className="px-6 py-4">Method / Gateway</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Settled At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Loading payments...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Zero gateway payments recorded.
                    </td>
                  </tr>
                ) : (
                  payments.map((pmt) => (
                    <tr key={pmt.id} className="hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-mono font-medium text-white">{pmt.payment_number}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">{pmt.gateway_reference}</td>
                      <td className="px-6 py-4 capitalize text-slate-300">
                        {pmt.payment_method} ({pmt.gateway_provider})
                      </td>
                      <td className="px-6 py-4 font-semibold text-emerald-400">
                        {formatNaira(pmt.amount_cents)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {pmt.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {pmt.settled_at ? new Date(pmt.settled_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'webhooks' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Gateway</th>
                  <th className="px-6 py-4">Event ID / Type</th>
                  <th className="px-6 py-4">Signature</th>
                  <th className="px-6 py-4">Processing State</th>
                  <th className="px-6 py-4">Received At</th>
                  <th className="px-6 py-4">Processed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Loading webhook telemetry...
                    </td>
                  </tr>
                ) : webhooks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Zero gateway webhook events logged.
                    </td>
                  </tr>
                ) : (
                  webhooks.map((wh) => (
                    <tr key={wh.id} className="hover:bg-slate-800/40">
                      <td className="px-6 py-4">
                        <span className="uppercase text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                          {wh.gateway}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs text-white">{wh.external_event_id}</div>
                        <div className="text-xs text-cyan-400 mt-0.5">{wh.event_type}</div>
                      </td>
                      <td className="px-6 py-4">
                        {wh.signature_verified ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {wh.processed ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Processed
                          </span>
                        ) : wh.error_message ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20" title={wh.error_message}>
                            <XCircle className="w-3.5 h-3.5" />
                            Failed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(wh.received_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {wh.processed_at ? new Date(wh.processed_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'transfers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Request #</th>
                  <th className="px-6 py-4">Practice & Plan</th>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Customer Ref & Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      Loading bank transfer requests...
                    </td>
                  </tr>
                ) : transfers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      Zero bank transfer requests submitted.
                    </td>
                  </tr>
                ) : (
                  transfers.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-white text-xs">
                        {req.request_number}
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {new Date(req.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white text-sm">{req.practice?.name || 'Practice'}</div>
                        <div className="text-xs text-teal-400 mt-0.5">{req.plan?.name || 'Subscription Plan'}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-300">
                        {req.invoice?.invoice_number || 'PHY-INV-...'}
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        {formatNaira(req.amount_cents)}
                      </td>
                      <td className="px-6 py-4">
                        {req.customer_reference ? (
                          <div>
                            <div className="font-mono text-xs text-emerald-400 font-semibold">
                              {req.customer_reference}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Claimed: {req.customer_transferred_at ? new Date(req.customer_transferred_at).toLocaleDateString() : '—'}
                            </div>
                            {req.customer_notes && (
                              <div className="text-[11px] text-slate-500 italic mt-0.5 max-w-xs truncate" title={req.customer_notes}>
                                Note: {req.customer_notes}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Not submitted yet</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {req.status === 'confirmed' ? (
                          <span className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Confirmed & Settled
                          </span>
                        ) : req.status === 'submitted_for_review' ? (
                          <span className="px-2.5 py-1 rounded text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            Review Required
                          </span>
                        ) : req.status === 'pending_transfer' ? (
                          <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Awaiting Transfer
                          </span>
                        ) : req.status === 'rejected' ? (
                          <div>
                            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Rejected
                            </span>
                            {req.rejection_reason && (
                              <div className="text-[11px] text-rose-400 mt-1 max-w-xs" title={req.rejection_reason}>
                                {req.rejection_reason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 text-slate-400">
                            Cancelled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {(req.status === 'submitted_for_review' || req.status === 'pending_transfer') ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setTransferToConfirm(req)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Confirm</span>
                            </button>
                            <button
                              onClick={() => {
                                setTransferToReject(req);
                                setRejectionReason('');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : req.status === 'confirmed' ? (
                          <span className="text-xs text-slate-500">Settled</span>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Confirm Bank Transfer */}
      {transferToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Confirm Bank Transfer Payment
              </h3>
              <button
                onClick={() => setTransferToConfirm(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700/60 text-xs text-slate-300 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Request Number:</span>
                <span className="font-mono font-bold text-white">{transferToConfirm.request_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Practice:</span>
                <span className="font-bold text-white">{transferToConfirm.practice?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice:</span>
                <span className="font-mono text-white">{transferToConfirm.invoice?.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Expected Amount:</span>
                <span className="font-bold text-emerald-400">{formatNaira(transferToConfirm.amount_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer Reference:</span>
                <span className="font-mono font-bold text-cyan-400">{transferToConfirm.customer_reference || 'N/A'}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                Mandatory Admin Verification Check:
              </p>
              <p className="text-slate-300">
                You must independently check Physenra's bank portal or statement to confirm that exactly{' '}
                <strong>{formatNaira(transferToConfirm.amount_cents)}</strong> has credited with the reference above.
                Confirming will mark the invoice paid and immediately activate the subscription.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTransferToConfirm(null)}
                disabled={confirming}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={confirming}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {confirming ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Confirming & Settling...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Activate Subscription</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reject Bank Transfer */}
      {transferToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2 text-rose-400">
                <XCircle className="w-5 h-5 text-rose-400" />
                Reject Bank Transfer Payment
              </h3>
              <button
                onClick={() => setTransferToReject(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-lg text-xs text-slate-300">
              <p>
                Rejecting request <strong>{transferToReject.request_number}</strong> for{' '}
                <strong>{transferToReject.practice?.name}</strong>.
              </p>
              <p className="text-slate-400 mt-1">
                The invoice will remain open so the practice owner can correct the transfer details or pay via Paystack.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mandatory Rejection Reason:
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Funds not reflected in Physenra corporate account statement after 48 hours."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTransferToReject(null)}
                disabled={rejecting}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectTransfer}
                disabled={rejecting || rejectionReason.trim().length < 5}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <span>Reject Payment</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
