import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  CreditCard,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Receipt,
  User,
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { billingService } from '../../services/billingService';
import { patientService } from '../../services/patientService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type {
  Patient,
  InvoiceWithRelations,
  PaymentMethod,
  RecordPaymentAllocationItem,
} from '../../types/models';

export const CreatePaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get('patientId') || '';
  const preselectedInvoiceId = searchParams.get('invoiceId') || '';

  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant, isReceptionist } = useRole();
  const canRecordPayment = isOwner || isManager || isAccountant || isReceptionist;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(preselectedPatientId);
  const [patientInvoices, setPatientInvoices] = useState<InvoiceWithRelations[]>([]);
  
  // Payment Form States
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load patients on mount
  useEffect(() => {
    if (!activePractice) return;
    const fetchPatients = async () => {
      setIsLoadingPatients(true);
      try {
        const res = await patientService.getPatients({ limit: 100 });
        setPatients(res.patients);
      } catch (err: any) {
        console.error('Failed to load patients:', err);
      } finally {
        setIsLoadingPatients(false);
      }
    };
    fetchPatients();
  }, [activePractice]);

  // Load open invoices when patient changes
  useEffect(() => {
    if (!activePractice || !selectedPatientId) {
      setPatientInvoices([]);
      setAllocations({});
      return;
    }

    const fetchInvoices = async () => {
      setIsLoadingInvoices(true);
      setError(null);
      try {
        const data = await billingService.getInvoices(activePractice.id, {
          patientId: selectedPatientId,
          status: 'all',
        });
        // Filter only open invoices (issued or partially_paid)
        const open = data.filter(
          (inv) => (inv.status === 'issued' || inv.status === 'partially_paid') && inv.balance_due > 0
        );
        setPatientInvoices(open);

        // Pre-allocate if an invoiceId was passed in query params
        if (preselectedInvoiceId) {
          const target = open.find((inv) => inv.id === preselectedInvoiceId);
          if (target) {
            setAllocations({ [target.id]: target.balance_due });
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load invoices for patient.');
      } finally {
        setIsLoadingInvoices(false);
      }
    };

    fetchInvoices();
  }, [activePractice, selectedPatientId]);

  const handleAllocationChange = (invoiceId: string, value: string) => {
    const num = parseFloat(value);
    const invoice = patientInvoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    if (isNaN(num) || num <= 0) {
      const next = { ...allocations };
      delete next[invoiceId];
      setAllocations(next);
    } else {
      const capped = Math.min(num, invoice.balance_due);
      setAllocations((prev) => ({
        ...prev,
        [invoiceId]: Math.round(capped * 100) / 100,
      }));
    }
  };

  const handlePayFullBalance = (invoice: InvoiceWithRelations) => {
    setAllocations((prev) => ({
      ...prev,
      [invoice.id]: invoice.balance_due,
    }));
  };

  const handleClearAllocation = (invoiceId: string) => {
    setAllocations((prev) => {
      const next = { ...prev };
      delete next[invoiceId];
      return next;
    });
  };

  const totalPaymentAmount = Object.values(allocations).reduce(
    (sum, val) => sum + (val || 0),
    0
  );
  const roundedTotal = Math.round(totalPaymentAmount * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice) return;
    if (!canRecordPayment) {
      setError('Insufficient privileges: Only administrative and billing roles may record payments.');
      return;
    }

    if (!selectedPatientId) {
      setError('Please select a patient.');
      return;
    }

    if (roundedTotal <= 0) {
      setError('Total payment amount must be greater than 0. Please allocate funds to at least one open invoice.');
      return;
    }

    const allocationItems: RecordPaymentAllocationItem[] = Object.entries(allocations)
      .filter(([_, amt]) => amt > 0)
      .map(([invId, amt]) => ({
        invoice_id: invId,
        amount: amt,
      }));

    if (allocationItems.length === 0) {
      setError('Please allocate payment to at least one invoice.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await paymentService.recordPayment({
        patient_id: selectedPatientId,
        payment_date: paymentDate,
        amount: roundedTotal,
        currency: 'NGN',
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        allocations: allocationItems,
      }, activePractice.id);

      if (result.receipt_id) {
        navigate(`/app/receipts/${result.receipt_id}`);
      } else {
        navigate(`/app/payments/${result.payment_id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record payment and allocations.');
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (!canRecordPayment) {
    return (
      <div className="page-container">
        <div className="alert alert-danger max-w-lg mx-auto my-12">
          <AlertCircle size={20} className="flex-shrink-0" />
          <div>
            <h3 className="font-bold">Access Restricted</h3>
            <p className="text-sm">
              Physiotherapists have view-only financial access. Only practice owners, managers, accountants, and receptionists can record payments.
            </p>
            <div className="mt-4">
              <Link to="/app/payments" className="btn btn-secondary btn-sm">
                Return to Payments
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container max-w-4xl mx-auto">
      {/* Back button and title */}
      <div className="mb-6">
        <Link
          to="/app/payments"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2"
        >
          <ArrowLeft size={16} />
          <span>Back to Payments</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Record Payment & Settle Invoices</h1>
        <p className="text-sm text-gray-500">
          Capture verified patient settlement, allocate funds to open invoices, and issue an official receipt.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger mb-6 flex items-start gap-3">
          <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
          <div>
            <div className="font-semibold">Payment Submission Error</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Patient Selection */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User size={18} className="text-emerald-600" />
            <span>1. Patient & Debtor</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Patient *
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                disabled={isLoadingPatients || isSubmitting}
                className="select w-full"
                required
              >
                <option value="">-- Choose Patient --</option>
                {patients.map((pat) => (
                  <option key={pat.id} value={pat.id}>
                    {pat.first_name} {pat.last_name} ({pat.patient_identifier})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="input w-full"
                required
              />
            </div>
          </div>
        </div>

        {/* Step 2: Tender Details */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-emerald-600" />
            <span>2. Tender Method & Reference</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="select w-full"
                required
              >
                <option value="cash">Cash (In-person)</option>
                <option value="bank_transfer">Direct Bank Transfer</option>
                <option value="pos">POS Terminal Card Swipe</option>
                <option value="card">Direct Debit/Credit Card</option>
                <option value="other">Other / Cheque / Voucher</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                External Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Bank session ID, POS slip code"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="input w-full font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                External reference numbers assist in end-of-day reconciliation.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="Optional memo or payment remarks"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input w-full"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Open Invoices & Allocation */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Receipt size={18} className="text-emerald-600" />
            <span>3. Allocate Payment to Open Invoices</span>
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            In V1, all payments must be fully allocated to outstanding invoices. Unallocated credits or overpayments are rejected.
          </p>

          {!selectedPatientId ? (
            <div className="p-8 text-center text-gray-500 border border-dashed border-gray-200 rounded-lg">
              Please select a patient above to view their outstanding invoices.
            </div>
          ) : isLoadingInvoices ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto mb-2" />
              <span>Loading patient invoices...</span>
            </div>
          ) : patientInvoices.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-lg">
              <CheckCircle2 size={32} className="mx-auto text-emerald-600 mb-2" />
              <h3 className="font-semibold text-gray-900">No Open Invoices</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                This patient has no issued or partially paid invoices with an outstanding balance.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Issue Date</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Paid So Far</th>
                    <th className="text-right">Balance Due</th>
                    <th className="text-right w-44">Allocate Amount</th>
                    <th className="text-center w-28">Quick Action</th>
                  </tr>
                </thead>
                <tbody>
                  {patientInvoices.map((inv) => {
                    const currentAlloc = allocations[inv.id] || 0;
                    return (
                      <tr key={inv.id} className={currentAlloc > 0 ? 'bg-emerald-50/40' : ''}>
                        <td>
                          <span className="font-mono font-semibold text-gray-900">
                            {inv.invoice_number}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm text-gray-600">{inv.issue_date}</span>
                        </td>
                        <td className="text-right font-medium">
                          {formatCurrency(inv.grand_total, inv.currency)}
                        </td>
                        <td className="text-right text-sm text-gray-600">
                          {formatCurrency(inv.amount_paid, inv.currency)}
                        </td>
                        <td className="text-right font-bold text-gray-900">
                          {formatCurrency(inv.balance_due, inv.currency)}
                        </td>
                        <td className="text-right">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max={inv.balance_due}
                              step="0.01"
                              placeholder="0.00"
                              value={allocations[inv.id] !== undefined ? allocations[inv.id] : ''}
                              onChange={(e) => handleAllocationChange(inv.id, e.target.value)}
                              className="input input-sm text-right font-mono font-semibold w-full"
                            />
                          </div>
                        </td>
                        <td className="text-center">
                          {currentAlloc === inv.balance_due ? (
                            <button
                              type="button"
                              onClick={() => handleClearAllocation(inv.id)}
                              className="text-xs text-red-600 hover:text-red-800 font-medium"
                            >
                              Clear
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePayFullBalance(inv)}
                              className="text-xs bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-2 py-1 rounded font-medium"
                            >
                              Pay Full
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Allocation Summary Card */}
          {patientInvoices.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4 border border-gray-200">
              <div className="text-sm text-gray-600">
                <span>Invoices Allocated: </span>
                <span className="font-semibold text-gray-900">
                  {Object.values(allocations).filter((v) => v > 0).length} of {patientInvoices.length}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-base text-gray-700 font-medium">
                  Total Settlement Amount:
                </span>
                <span className="text-2xl font-bold font-mono text-emerald-700">
                  {formatCurrency(roundedTotal)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/app/payments" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || roundedTotal <= 0}
            className="btn btn-primary flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Processing Settlement...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Confirm Payment & Issue Receipt</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
export default CreatePaymentPage;
