import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Printer,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Ban,
  Building2,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { receiptService } from '../../services/receiptService';
import { usePractice } from '../../hooks/usePractice';
import type { ReceiptWithRelations, PaymentMethod } from '../../types/models';

export const ReceiptDetailPage: React.FC = () => {
  const { receiptId } = useParams<{ receiptId: string }>();
  const { activePractice } = usePractice();

  const [receipt, setReceipt] = useState<ReceiptWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReceipt = async () => {
    if (!activePractice || !receiptId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await receiptService.getReceiptById(receiptId, activePractice.id);
      setReceipt(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load receipt details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReceipt();
  }, [activePractice, receiptId]);

  const handlePrint = () => {
    window.print();
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
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500">Loading official receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="page-container">
        <div className="alert alert-danger mb-6 flex items-start gap-3">
          <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
          <div>
            <div className="font-semibold">Error Loading Receipt</div>
            <div className="text-sm">{error || 'Receipt not found.'}</div>
          </div>
        </div>
        <Link to="/app/receipts" className="btn btn-secondary">
          Return to Receipts
        </Link>
      </div>
    );
  }

  const patientName = receipt.patient
    ? `${receipt.patient.first_name} ${receipt.patient.last_name}`
    : 'Unknown Patient';

  return (
    <div className="page-container max-w-4xl mx-auto">
      {/* Top Action Bar - Hidden during printing */}
      <div className="print:hidden mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            to="/app/receipts"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2"
          >
            <ArrowLeft size={16} />
            <span>Back to Receipts</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-gray-900">
              {receipt.receipt_number}
            </h1>
            {receipt.status === 'issued' ? (
              <span className="badge badge-success flex items-center gap-1">
                <CheckCircle2 size={12} /> Issued & Immutable
              </span>
            ) : (
              <span className="badge badge-danger flex items-center gap-1">
                <Ban size={12} /> Voided
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {receipt.payment_id && (
            <Link
              to={`/app/payments/${receipt.payment_id}`}
              className="btn btn-secondary flex items-center gap-2"
            >
              <CreditCard size={16} />
              <span>View Payment</span>
            </Link>
          )}

          <button
            onClick={handlePrint}
            className="btn btn-primary flex items-center gap-2"
          >
            <Printer size={16} />
            <span>Print Official Receipt</span>
          </button>
        </div>
      </div>

      {/* Printable Receipt Paper Container */}
      <div className="card p-8 md:p-12 print:shadow-none print:border-none print:p-0 bg-white">
        {/* Void Watermark if applicable */}
        {receipt.status === 'voided' && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg text-red-800 flex items-start gap-3">
            <Ban className="flex-shrink-0 mt-0.5" size={24} />
            <div>
              <h3 className="font-bold uppercase tracking-wider text-sm">
                THIS RECEIPT IS VOIDED
              </h3>
              <p className="text-sm mt-0.5">
                The underlying payment transaction has been reversed. This document no longer constitutes valid proof of settlement.
              </p>
              {receipt.void_reason && (
                <p className="text-xs text-red-600 mt-1">
                  <strong>Void Reason:</strong> {receipt.void_reason}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Practice Header & Branding */}
        <div className="border-b border-gray-200 pb-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xl mb-1">
                <Building2 size={24} />
                <span>{activePractice?.name || 'Physenra Physiotherapy Practice'}</span>
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                Physiotherapy EMR & Rehabilitation Platform
              </p>
              {activePractice?.email && (
                <div className="text-xs text-gray-500 mt-1">
                  Email: {activePractice.email}
                </div>
              )}
            </div>

            <div className="text-left md:text-right">
              <div className="inline-block bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-1">
                Official Settlement Receipt
              </div>
              <div className="font-mono text-xl font-bold text-gray-900">
                {receipt.receipt_number}
              </div>
              <div className="text-xs text-gray-500">
                Date: {receipt.issue_date}
              </div>
            </div>
          </div>
        </div>

        {/* Debtor & Payment Metadata */}
        <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Received From
            </div>
            <div className="font-bold text-base text-gray-900 mb-1">
              {patientName}
            </div>
            {receipt.patient?.patient_identifier && (
              <div className="font-mono text-xs text-emerald-700 mb-1">
                Patient ID: {receipt.patient.patient_identifier}
              </div>
            )}
            {receipt.patient?.phone && (
              <div className="text-gray-600">Phone: {receipt.patient.phone}</div>
            )}
            {receipt.patient?.email && (
              <div className="text-gray-600">Email: {receipt.patient.email}</div>
            )}
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Payment Reference
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Number:</span>
                <span className="font-mono font-medium text-gray-800">
                  {receipt.payment?.payment_number || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Method:</span>
                <span className="font-medium text-gray-800">
                  {getMethodLabel(receipt.payment_method)}
                </span>
              </div>
              {receipt.reference_number && (
                <div className="flex justify-between">
                  <span className="text-gray-500">External Reference:</span>
                  <span className="font-mono text-gray-800">
                    {receipt.reference_number}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Issued Timestamp:</span>
                <span className="text-gray-800 text-xs">
                  {new Date(receipt.issued_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Invoice Allocations Table */}
        <div className="mb-8">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Settled Accounts Receivable Allocations
          </div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200 text-gray-600">
                <th className="py-2.5 text-left font-semibold">Settled Invoice #</th>
                <th className="py-2.5 text-right font-semibold">Invoice Total</th>
                <th className="py-2.5 text-right font-semibold">Remaining Balance Due</th>
                <th className="py-2.5 text-right font-semibold">Amount Applied</th>
              </tr>
            </thead>
            <tbody>
              {receipt.payment?.allocations && receipt.payment.allocations.length > 0 ? (
                receipt.payment.allocations.map((alloc) => (
                  <tr key={alloc.id} className="border-b border-gray-100">
                    <td className="py-3 font-mono font-medium text-gray-800">
                      {alloc.invoice?.invoice_number || 'Invoice'}
                    </td>
                    <td className="py-3 text-right text-gray-600 font-mono">
                      {alloc.invoice
                        ? formatCurrency(alloc.invoice.grand_total, receipt.currency)
                        : '—'}
                    </td>
                    <td className="py-3 text-right text-gray-600 font-mono">
                      {alloc.invoice
                        ? formatCurrency(alloc.invoice.balance_due, receipt.currency)
                        : '—'}
                    </td>
                    <td className="py-3 text-right font-bold font-mono text-gray-900">
                      {formatCurrency(alloc.amount, receipt.currency)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-gray-100">
                  <td colSpan={3} className="py-3 font-medium text-gray-800">
                    Direct Patient Account Settlement
                  </td>
                  <td className="py-3 text-right font-bold font-mono text-gray-900">
                    {formatCurrency(receipt.amount, receipt.currency)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300">
                <td colSpan={3} className="pt-4 text-right font-bold text-gray-900 text-base">
                  Total Paid & Acknowledged:
                </td>
                <td className="pt-4 text-right font-mono font-bold text-emerald-700 text-xl">
                  {formatCurrency(receipt.amount, receipt.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Verification & Legal Footer */}
        <div className="border-t border-gray-200 pt-6 mt-12 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600" />
            <div>
              <div className="font-semibold text-gray-700">Official Electronic Receipt</div>
              <div>Generated by Physenra Practice Management Platform</div>
            </div>
          </div>

          <div className="text-center md:text-right">
            <div>Authorized Clinic Signature / Stamp</div>
            <div className="text-[11px] font-mono text-gray-400 mt-1">
              Issued by: {receipt.issuer?.display_name || 'Authorized Staff'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ReceiptDetailPage;
