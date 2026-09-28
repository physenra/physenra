import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Ban,
  AlertCircle,
  ShieldAlert,
  Printer,
  Receipt as ReceiptIcon,
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type { PaymentWithRelations, PaymentMethod } from '../../types/models';

export const PaymentDetailPage: React.FC = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant } = useRole();
  const canVoidPayment = isOwner || isManager || isAccountant;

  const [payment, setPayment] = useState<PaymentWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Void modal state
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const loadPayment = async () => {
    if (!activePractice || !paymentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await paymentService.getPaymentById(paymentId, activePractice.id);
      setPayment(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load payment details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayment();
  }, [activePractice, paymentId]);

  const handleVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice || !payment) return;
    if (!voidReason || voidReason.trim().length < 5) {
      setVoidError('Please provide a valid void reason of at least 5 characters.');
      return;
    }

    setIsVoiding(true);
    setVoidError(null);
    try {
      await paymentService.voidPayment({
        payment_id: payment.id,
        void_reason: voidReason.trim(),
      }, activePractice.id);
      setIsVoidModalOpen(false);
      await loadPayment();
    } catch (err: any) {
      setVoidError(err.message || 'Failed to void payment.');
    } finally {
      setIsVoiding(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getMethodLabel = (method: PaymentMethod) => {
    const labels: Record<PaymentMethod, string> = {
      cash: 'Cash (In-person)',
      bank_transfer: 'Direct Bank Transfer',
      pos: 'POS Terminal Card Swipe',
      card: 'Direct Debit/Credit Card',
      other: 'Other / Cheque / Voucher',
    };
    return labels[method] || method;
  };

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="page-container">
        <div className="alert alert-danger mb-6 flex items-start gap-3">
          <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
          <div>
            <div className="font-semibold">Error Loading Payment</div>
            <div className="text-sm">{error || 'Payment not found.'}</div>
          </div>
        </div>
        <Link to="/app/payments" className="btn btn-secondary">
          Return to Payments
        </Link>
      </div>
    );
  }

  const patientName = payment.patient
    ? `${payment.patient.first_name} ${payment.patient.last_name}`
    : 'Unknown Patient';

  return (
    <div className="page-container max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            to="/app/payments"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2"
          >
            <ArrowLeft size={16} />
            <span>Back to Payments</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-gray-900">
              {payment.payment_number}
            </h1>
            {payment.status === 'confirmed' ? (
              <span className="badge badge-success flex items-center gap-1">
                <CheckCircle2 size={12} /> Confirmed
              </span>
            ) : (
              <span className="badge badge-danger flex items-center gap-1">
                <Ban size={12} /> Voided
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {payment.receipt && (
            <Link
              to={`/app/receipts/${payment.receipt.id}`}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Printer size={16} />
              <span>Official Receipt</span>
            </Link>
          )}

          {payment.status === 'confirmed' && canVoidPayment && (
            <button
              onClick={() => setIsVoidModalOpen(true)}
              className="btn btn-danger flex items-center gap-2"
            >
              <Ban size={16} />
              <span>Void Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* Void Notice if applicable */}
      {payment.status === 'voided' && (
        <div className="alert alert-danger mb-6 p-4 rounded-lg flex items-start gap-3">
          <ShieldAlert className="flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-red-900">Payment Has Been Voided</h3>
            <p className="text-sm text-red-700 mt-1">
              <strong>Reason:</strong> {payment.void_reason || 'No reason specified'}
            </p>
            <p className="text-xs text-red-600 mt-1">
              Voided on {payment.voided_at ? new Date(payment.voided_at).toLocaleString() : '—'} by{' '}
              {payment.voider?.display_name || 'Staff'}
            </p>
          </div>
        </div>
      )}

      {/* Main Grid Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Card 1: Payment Settlement */}
        <div className="card p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Financial Settlement
          </div>
          <div className="text-3xl font-bold font-mono text-gray-900 mb-2">
            {formatCurrency(payment.amount, payment.currency)}
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Method:</span>
              <span className="font-medium text-gray-800">
                {getMethodLabel(payment.payment_method)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Reference:</span>
              <span className="font-mono text-gray-800">
                {payment.reference_number || 'None'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date:</span>
              <span className="font-medium text-gray-800">
                {payment.payment_date}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Patient / Debtor */}
        <div className="card p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Debtor Information
          </div>
          <div className="text-lg font-bold text-gray-900 mb-1">
            {patientName}
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            {payment.patient?.patient_identifier && (
              <div className="font-mono text-xs text-emerald-700">
                {payment.patient.patient_identifier}
              </div>
            )}
            {payment.patient?.phone && (
              <div>Phone: {payment.patient.phone}</div>
            )}
            {payment.patient?.email && (
              <div>Email: {payment.patient.email}</div>
            )}
          </div>
          {payment.patient && (
            <div className="mt-3">
              <Link
                to={`/app/patients/${payment.patient.id}`}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
              >
                View Patient Profile &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Card 3: Governance & Audit */}
        <div className="card p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Governance & Audit
          </div>
          <div className="space-y-2 text-xs text-gray-600">
            <div>
              <span className="text-gray-400 block">Recorded By:</span>
              <span className="font-medium text-gray-800">
                {payment.recorder?.display_name || 'System / Staff'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block">Confirmed At:</span>
              <span className="font-medium text-gray-800">
                {new Date(payment.confirmed_at).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block">Idempotency Key:</span>
              <span className="font-mono text-[11px] text-gray-500 break-all">
                {payment.idempotency_key}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Allocated Invoices Table */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ReceiptIcon size={20} className="text-emerald-600" />
          <span>Settled Invoice Allocations</span>
        </h2>

        {(!payment.allocations || payment.allocations.length === 0) ? (
          <div className="p-8 text-center text-gray-500">
            No allocations recorded for this payment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th className="text-right">Invoice Grand Total</th>
                  <th className="text-right">Allocated From This Payment</th>
                  <th className="text-right">Current Invoice Balance</th>
                  <th>Current Invoice Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {payment.allocations.map((alloc) => (
                  <tr key={alloc.id}>
                    <td>
                      <span className="font-mono font-semibold text-emerald-700">
                        {alloc.invoice?.invoice_number || 'Invoice'}
                      </span>
                    </td>
                    <td className="text-right">
                      {alloc.invoice
                        ? formatCurrency(alloc.invoice.grand_total, alloc.invoice.currency)
                        : '—'}
                    </td>
                    <td className="text-right font-bold text-gray-900">
                      {formatCurrency(alloc.amount, payment.currency)}
                    </td>
                    <td className="text-right font-mono">
                      {alloc.invoice
                        ? formatCurrency(alloc.invoice.balance_due, alloc.invoice.currency)
                        : '—'}
                    </td>
                    <td>
                      <span className="badge badge-outline text-xs">
                        {alloc.invoice?.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="text-right">
                      {alloc.invoice && (
                        <Link
                          to={`/app/invoices/${alloc.invoice.id}`}
                          className="btn btn-ghost btn-sm text-xs"
                        >
                          View Invoice
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Void Modal */}
      {isVoidModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <ShieldAlert size={28} />
              <h3 className="text-lg font-bold text-gray-900">Void Payment Confirmation</h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Voiding this payment will <strong>atomically reverse all allocations</strong> on linked invoices, restoring their outstanding balance due, voiding the associated receipt, and writing permanent audit records.
            </p>

            {voidError && (
              <div className="alert alert-danger mb-4 text-xs">
                {voidError}
              </div>
            )}

            <form onSubmit={handleVoid}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Voiding *
                </label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Bank transfer bounced, payment entered on incorrect patient"
                  rows={3}
                  className="textarea w-full text-sm"
                  required
                />
                <span className="text-xs text-gray-400">
                  Minimum 5 characters required for audit trail.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsVoidModalOpen(false)}
                  disabled={isVoiding}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVoiding || voidReason.trim().length < 5}
                  className="btn btn-danger flex items-center gap-2"
                >
                  {isVoiding ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Reversing...</span>
                    </>
                  ) : (
                    <span>Confirm Void Payment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default PaymentDetailPage;
