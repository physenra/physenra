import React, { useEffect, useState } from 'react';
import { saasSubscriptionService } from '../../services/saasSubscriptionService';
import type { SaasInvoice, SaasPayment } from '../../types/models';
import {
  Receipt,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Radio,
  AlertCircle,
  XCircle,
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
  const [webhooks, setWebhooks] = useState<WebhookTelemetryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'webhooks'>('invoices');
  const [error, setError] = useState<string | null>(null);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [invData, pmtData, whData] = await Promise.all([
        saasSubscriptionService.getAllInvoices(),
        saasSubscriptionService.getAllPayments(),
        saasSubscriptionService.getWebhookTelemetry().catch(() => []),
      ]);
      setInvoices(invData);
      setPayments(pmtData);
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
      </div>
    </div>
  );
};
