import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Lock,
  FileEdit,
  Ban,
  AlertCircle,
  Plus,
  Trash2,
  Send,
  Printer,
  FolderKanban,
  Activity,
  Coins,
  Wallet,
} from 'lucide-react';
import { ClinicalDocumentPrintHeader } from '../../components/clinical/ClinicalDocumentPrintHeader';
import { ClinicalDocumentPrintFooter } from '../../components/clinical/ClinicalDocumentPrintFooter';
import { billingService } from '../../services/billingService';
import { serviceCatalogService } from '../../services/serviceCatalogService';
import { walletService } from '../../services/walletService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type {
  InvoiceWithRelations,
  Service,
  PatientWalletWithBalance,
} from '../../types/models';

export const InvoiceDetailPage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant, isReceptionist } = useRole();
  const canIssueOrVoid = isOwner || isManager || isAccountant || isReceptionist;
  const canVoid = isOwner || isManager || isAccountant;

  const [invoice, setInvoice] = useState<InvoiceWithRelations | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Void modal state
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  // Add line state (for draft invoices)
  const [showAddLineModal, setShowAddLineModal] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [lineDesc, setLineDesc] = useState('');
  const [lineQty, setLineQty] = useState(1);
  const [lineUnitPrice, setLineUnitPrice] = useState(0);
  const [lineDiscount, setLineDiscount] = useState(0);
  const [lineIsTaxable, setLineIsTaxable] = useState(false);
  const [lineTaxRate, setLineTaxRate] = useState(0);

  // Wallet settlement state
  const [patientWallet, setPatientWallet] = useState<PatientWalletWithBalance | null>(null);
  const [showWalletSettleModal, setShowWalletSettleModal] = useState(false);
  const [walletSettleAmount, setWalletSettleAmount] = useState<number | ''>('');
  const [walletSettleNotes, setWalletSettleNotes] = useState('');

  const loadInvoice = async () => {
    if (!activePractice || !invoiceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await billingService.getInvoiceById(invoiceId, activePractice.id);
      if (!data) {
        setError('Invoice not found.');
      } else {
        setInvoice(data);
        if (data.patient_id) {
          walletService
            .getWalletByPatientId(data.patient_id, activePractice.id)
            .then(setPatientWallet)
            .catch(() => setPatientWallet(null));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [activePractice, invoiceId]);

  // Load catalog services when in draft
  useEffect(() => {
    if (activePractice && invoice?.status === 'draft') {
      serviceCatalogService
        .getServices(activePractice.id, { isActive: true })
        .then(setServices)
        .catch(console.error);
    }
  }, [activePractice, invoice?.status]);

  const handleIssueInvoice = async () => {
    if (!activePractice || !invoice) return;
    if (!confirm(`Are you sure you want to issue invoice ${invoice.invoice_number}? This will permanently freeze all items, rates, and financial totals.`)) {
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const updated = await billingService.issueInvoice(invoice.id, activePractice.id);
      setInvoice(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to issue invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoidInvoice = async () => {
    if (!activePractice || !invoice) return;
    if (!voidReason.trim()) {
      setError('Please provide a mandatory void rationale.');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const updated = await billingService.voidInvoice(invoice.id, voidReason.trim(), activePractice.id);
      setInvoice(updated);
      setShowVoidModal(false);
      setVoidReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to void invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!activePractice || !invoice) return;
    if (!confirm(`Are you sure you want to delete draft invoice ${invoice.invoice_number}? This cannot be undone.`)) {
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      await billingService.deleteDraftInvoice(invoice.id, activePractice.id);
      navigate('/app/invoices');
    } catch (err: any) {
      setError(err.message || 'Failed to delete draft invoice.');
      setActionLoading(false);
    }
  };

  const handleServiceSelectInModal = async (srvId: string) => {
    setSelectedServiceId(srvId);
    if (!activePractice || !srvId) return;
    try {
      const resolved = await billingService.resolveServicePrice(
        srvId,
        invoice?.fee_schedule_id || null,
        activePractice.id
      );
      setLineDesc(resolved.description || '');
      setLineUnitPrice(resolved.unitPrice);
      setLineIsTaxable(resolved.isTaxable);
      setLineTaxRate(resolved.taxRatePercent);
    } catch (err) {
      console.error('Error resolving service price:', err);
    }
  };

  const handleAddLineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice || !invoice) return;

    if (!selectedServiceId) {
      setError('Please select a service from your catalog.');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      await billingService.addInvoiceLine(
        invoice.id,
        {
          service_id: selectedServiceId,
          description: lineDesc || null,
          quantity: lineQty,
          discount_amount: lineDiscount,
        },
        activePractice.id
      );

      setShowAddLineModal(false);
      setSelectedServiceId('');
      setLineDesc('');
      setLineQty(1);
      setLineUnitPrice(0);
      setLineDiscount(0);
      setLineIsTaxable(false);
      setLineTaxRate(0);

      // Refresh invoice
      await loadInvoice();
    } catch (err: any) {
      setError(err.message || 'Failed to add charge line.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveLine = async (lineId: string) => {
    if (!activePractice || !invoice) return;
    if (!confirm('Are you sure you want to remove this line item?')) return;

    setActionLoading(true);
    setError(null);
    try {
      await billingService.removeInvoiceLine(lineId, activePractice.id);
      await loadInvoice();
    } catch (err: any) {
      setError(err.message || 'Failed to remove line.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWalletSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice || !invoice || !patientWallet) return;
    if (!walletSettleAmount || Number(walletSettleAmount) <= 0) {
      setError('Please enter a valid settlement amount.');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      await walletService.settleInvoiceFromWallet(
        {
          wallet_id: patientWallet.id,
          invoice_id: invoice.id,
          amount: Number(walletSettleAmount),
          notes: walletSettleNotes.trim() || null,
        },
        activePractice.id
      );

      setShowWalletSettleModal(false);
      setWalletSettleAmount('');
      setWalletSettleNotes('');
      await loadInvoice();
    } catch (err: any) {
      setError(err.message || 'Wallet settlement failed.');
    } finally {
      setActionLoading(false);
    }
  };


  const formatCurrency = (amount: number, curr: string = 'NGN') => {
    return `${curr} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (isLoading) {
    return (
      <div className="page-container max-w-5xl mx-auto p-12 text-center text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
        Loading invoice details...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="page-container max-w-5xl mx-auto p-12 text-center">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
        <p className="text-gray-500 mb-6">The requested invoice could not be located in this practice.</p>
        <Link to="/app/invoices" className="btn btn-primary">
          Back to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Link to="/app/invoices" className="btn btn-ghost btn-sm inline-flex items-center gap-1">
          <ArrowLeft size={16} />
          <span>Back to Invoices</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
          >
            <Printer size={16} />
            <span>Print Invoice</span>
          </button>

          {invoice.status === 'draft' && canIssueOrVoid && (
            <>
              <button
                onClick={handleDeleteDraft}
                disabled={actionLoading}
                className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
              >
                Delete Draft
              </button>
              <button
                onClick={handleIssueInvoice}
                disabled={actionLoading || !invoice.lines || invoice.lines.length === 0 || invoice.grand_total <= 0}
                className="btn btn-primary btn-sm flex items-center gap-1.5"
              >
                <Send size={16} />
                <span>Issue Invoice</span>
              </button>
            </>
          )}

          {invoice.status === 'issued' && canVoid && (
            <button
              onClick={() => setShowVoidModal(true)}
              disabled={actionLoading}
              className="btn btn-danger btn-sm flex items-center gap-1.5"
            >
              <Ban size={16} />
              <span>Void Invoice</span>
            </button>
          )}

          {(invoice.status === 'issued' || invoice.status === 'partially_paid') &&
            canIssueOrVoid &&
            Number(invoice.balance_due) > 0 &&
            patientWallet &&
            patientWallet.status === 'active' &&
            patientWallet.balance > 0 && (
              <button
                onClick={() => {
                  setWalletSettleAmount(Math.min(Number(invoice.balance_due), Number(patientWallet.balance)));
                  setShowWalletSettleModal(true);
                }}
                disabled={actionLoading}
                className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              >
                <Wallet size={16} />
                <span>Pay with Wallet ({formatCurrency(Number(patientWallet.balance), patientWallet.currency)})</span>
              </button>
            )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-6 flex items-center gap-2 print:hidden">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Status Warning Banners */}
      {invoice.status === 'draft' && (
        <div className="p-4 mb-6 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2 print:hidden">
          <FileEdit size={18} className="text-amber-600 flex-shrink-0" />
          <span>
            <strong>Draft Invoice:</strong> Itemized lines and details may be modified. Issue the invoice to establish an official, locked accounts receivable record.
          </span>
        </div>
      )}

      {invoice.status === 'issued' && (
        <div className="p-4 mb-6 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm flex items-center gap-2 print:hidden">
          <Lock size={18} className="text-blue-600 flex-shrink-0" />
          <span>
            <strong>Issued Invoice:</strong> This invoice is officially finalized and locked against direct edits. Historical tariffs and totals are immutably preserved.
          </span>
        </div>
      )}

      {invoice.status === 'void' && (
        <div className="p-4 mb-6 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm print:hidden">
          <div className="flex items-center gap-2 font-semibold">
            <Ban size={18} className="text-red-600 flex-shrink-0" />
            <span>Voided Invoice</span>
          </div>
          <div className="mt-1 text-xs">
            <strong>Void Reason:</strong> {invoice.void_reason || 'No reason provided'}
            {invoice.voided_at && ` (Voided at: ${new Date(invoice.voided_at).toLocaleString()})`}
          </div>
        </div>
      )}

      {/* Main Invoice Card (Print-friendly) */}
      <div className="card p-8 shadow-sm">
        {/* Official Active Tenant Practice Branded Invoice Header */}
        <ClinicalDocumentPrintHeader
          documentTitle="Official Physiotherapy Invoice"
          documentReference={invoice.invoice_number}
          documentStatus={invoice.status}
          issueDate={invoice.issue_date}
          reviewDate={invoice.due_date ? `Due: ${invoice.due_date}` : null}
          patientName={
            invoice.patient
              ? `${invoice.patient.first_name} ${invoice.patient.last_name}`
              : null
          }
          patientIdentifier={invoice.patient?.patient_identifier}
          hideMetadataGrid={true}
          className="p-0 border-0 shadow-none mb-6 pb-6 border-b border-gray-200"
        />

          

        {/* Debtor & Clinical Provenance Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 mb-6 border-b text-sm">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 uppercase tracking-wide text-xs text-gray-400">
              Billed To (Debtor / Patient)
            </h4>
            {invoice.patient ? (
              <div className="space-y-1">
                <div className="text-base font-bold text-gray-900">
                  {invoice.patient.first_name} {invoice.patient.last_name}
                </div>
                <div className="text-gray-600">Patient ID: {invoice.patient.patient_identifier}</div>
                {invoice.patient.phone && <div className="text-gray-600">Phone: {invoice.patient.phone}</div>}
                {invoice.patient.email && <div className="text-gray-600">Email: {invoice.patient.email}</div>}
              </div>
            ) : (
              <div className="text-gray-400">No debtor assigned</div>
            )}
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2 uppercase tracking-wide text-xs text-gray-400">
              Clinical Provenance
            </h4>
            <div className="space-y-2">
              {invoice.episode && (
                <div className="flex items-center gap-1.5 text-gray-700">
                  <FolderKanban size={14} className="text-gray-400" />
                  <span>Episode:</span>
                  <Link
                    to={`/app/episodes/${invoice.episode.id}`}
                    className="font-medium text-primary-600 hover:underline"
                  >
                    {invoice.episode.episode_identifier} ({invoice.episode.title})
                  </Link>
                </div>
              )}

              {invoice.clinical_visit && (
                <div className="flex items-center gap-1.5 text-gray-700">
                  <Activity size={14} className="text-gray-400" />
                  <span>Clinical Visit:</span>
                  <Link
                    to={`/app/visits/${invoice.clinical_visit.id}`}
                    className="font-medium text-primary-600 hover:underline"
                  >
                    {invoice.clinical_visit.visit_identifier}
                  </Link>
                </div>
              )}

              {invoice.fee_schedule && (
                <div className="flex items-center gap-1.5 text-gray-700">
                  <Coins size={14} className="text-gray-400" />
                  <span>Tariff Schedule:</span>
                  <span className="font-medium text-gray-900">{invoice.fee_schedule.name}</span>
                </div>
              )}

              {!invoice.episode && !invoice.clinical_visit && (
                <div className="text-xs text-gray-500 italic">Direct practice outpatient billing (no linked episode/visit)</div>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Lines Table */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-900 uppercase tracking-wide text-xs text-gray-400">
              Itemized Charges & Tariffs
            </h4>

            {invoice.status === 'draft' && canIssueOrVoid && (
              <button
                onClick={() => setShowAddLineModal(true)}
                className="btn btn-sm btn-ghost inline-flex items-center gap-1 print:hidden"
              >
                <Plus size={14} /> Add Item
              </button>
            )}
          </div>

          <table className="table w-full text-sm">
            <thead>
              <tr className="border-b">
                <th>Service Code</th>
                <th>Item / Modality Description</th>
                <th className="text-center">Qty</th>
                <th className="text-right">Unit Rate</th>
                <th className="text-right">Discount</th>
                <th className="text-right">Tax</th>
                <th className="text-right">Amount</th>
                {invoice.status === 'draft' && <th className="print:hidden"></th>}
              </tr>
            </thead>
            <tbody>
              {(!invoice.lines || invoice.lines.length === 0) ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No charge lines attached to this invoice.
                  </td>
                </tr>
              ) : (
                invoice.lines.map((line) => (
                  <tr key={line.id} className="border-b">
                    <td>
                      <span className="font-mono text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                        {line.service_code_snapshot}
                      </span>
                    </td>
                    <td>
                      <div className="font-medium text-gray-900">{line.service_name_snapshot}</div>
                      {line.description && (
                        <div className="text-xs text-gray-500 mt-0.5">{line.description}</div>
                      )}
                    </td>
                    <td className="text-center font-medium">{line.quantity}</td>
                    <td className="text-right">{formatCurrency(Number(line.unit_price_snapshot), line.currency)}</td>
                    <td className="text-right text-amber-600">
                      {Number(line.discount_amount) > 0 ? `-${formatCurrency(Number(line.discount_amount), line.currency)}` : '—'}
                    </td>
                    <td className="text-right">
                      {line.is_taxable ? (
                        <span>{formatCurrency(Number(line.tax_amount), line.currency)} ({line.tax_rate_percent_snapshot}%)</span>
                      ) : (
                        <span className="text-gray-400">Exempt</span>
                      )}
                    </td>
                    <td className="text-right font-semibold text-gray-900">
                      {formatCurrency(Number(line.line_total), line.currency)}
                    </td>
                    {invoice.status === 'draft' && (
                      <td className="text-right print:hidden">
                        <button
                          onClick={() => handleRemoveLine(line.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove line"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
          <div>
            {invoice.notes && (
              <div className="mb-4">
                <h5 className="font-semibold text-gray-900 text-xs uppercase text-gray-400 mb-1">Notes</h5>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <h5 className="font-semibold text-gray-900 text-xs uppercase text-gray-400 mb-1">Payment Terms</h5>
                <p className="text-xs text-gray-500 whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(Number(invoice.subtotal), invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Discounts Applied:</span>
              <span className="font-medium text-amber-600">
                - {formatCurrency(Number(invoice.discount_total), invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax Total:</span>
              <span className="font-medium text-gray-900">
                + {formatCurrency(Number(invoice.tax_total), invoice.currency)}
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between text-base font-extrabold text-gray-900">
              <span>Grand Total:</span>
              <span className="text-primary-700">
                {formatCurrency(Number(invoice.grand_total), invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between text-gray-600 text-xs pt-1">
              <span>Amount Paid:</span>
              <span>{formatCurrency(Number(invoice.amount_paid), invoice.currency)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-base font-bold">
              <span>Balance Due:</span>
              <span className={Number(invoice.balance_due) > 0 ? 'text-amber-600' : 'text-green-600'}>
                {formatCurrency(Number(invoice.balance_due), invoice.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Audit Meta Footer */}
        <div className="mt-8 pt-4 border-t text-xs text-gray-400 flex flex-wrap justify-between">
          <span>Created: {new Date(invoice.created_at).toLocaleString()}</span>
          {invoice.issued_at && <span>Issued: {new Date(invoice.issued_at).toLocaleString()}</span>}
          {invoice.voided_at && <span>Voided: {new Date(invoice.voided_at).toLocaleString()}</span>}
        </div>

        {/* Official Issuing Practice Legal Settlement Footer */}
        <ClinicalDocumentPrintFooter
          documentReference={invoice.invoice_number}
          customAttribution="Powered by Physenra • Physiotherapy EMR & Accounts Receivable System"
        />
      </div>

      {/* Void Confirmation Modal */}
      {showVoidModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Ban className="text-red-600" size={20} />
              Void Issued Invoice
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Voiding cancels this invoice receivable permanently while preserving the audit trail. Please enter a mandatory reason.
            </p>

            <div className="mb-4">
              <label className="label font-medium">Void Reason *</label>
              <textarea
                rows={3}
                required
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Invoiced under incorrect fee tariff, re-issued as INV-000004..."
                className="input w-full text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowVoidModal(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !voidReason.trim()}
                onClick={handleVoidInvoice}
                className="btn btn-danger"
              >
                {actionLoading ? 'Voiding...' : 'Confirm Void'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Line Modal (for Draft) */}
      {showAddLineModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card max-w-lg w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="text-primary-600" size={20} />
              Add Itemized Service Line
            </h3>

            <form onSubmit={handleAddLineSubmit} className="space-y-4">
              <div>
                <label className="label font-medium">Catalog Service (Optional)</label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => handleServiceSelectInModal(e.target.value)}
                  className="input w-full"
                >
                  <option value="" disabled>-- Select Catalog Service --</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.service_code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label font-medium">Description / Notes</label>
                <input
                  type="text"
                  value={lineDesc}
                  onChange={(e) => setLineDesc(e.target.value)}
                  placeholder="e.g. Additional 15min dry needling therapy..."
                  className="input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label font-medium">Quantity *</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    required
                    value={lineQty}
                    onChange={(e) => setLineQty(parseFloat(e.target.value) || 1)}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="label font-medium">Unit Tariff ({invoice.currency})</label>
                  <div className="p-2.5 bg-gray-50 border rounded text-sm font-mono text-gray-700">
                    {invoice.currency} {lineUnitPrice.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label font-medium">Discount Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={lineDiscount}
                    onChange={(e) => setLineDiscount(parseFloat(e.target.value) || 0)}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="label font-medium">Tax Configuration</label>
                  <div className="p-2.5 bg-gray-50 border rounded text-sm font-mono text-gray-700">
                    {lineIsTaxable ? `${lineTaxRate}%` : 'Tax Exempt (0%)'}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddLineModal(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || lineQty <= 0 || lineUnitPrice < 0}
                  className="btn btn-primary"
                >
                  {actionLoading ? 'Adding...' : 'Add Line Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Settle from Patient Wallet Modal */}
      {showWalletSettleModal && patientWallet && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Wallet className="text-emerald-600" size={20} />
              Settle Invoice with Patient Wallet
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Apply available credit from {patientWallet.wallet_number} to invoice {invoice.invoice_number}.
            </p>

            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 mb-4 text-xs text-emerald-800 space-y-1">
              <div className="flex justify-between">
                <span>Available Wallet Balance:</span>
                <strong className="text-emerald-900">{formatCurrency(Number(patientWallet.balance), patientWallet.currency)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Invoice Outstanding Due:</span>
                <strong className="text-emerald-900">{formatCurrency(Number(invoice.balance_due), invoice.currency)}</strong>
              </div>
            </div>

            <form onSubmit={handleWalletSettleSubmit} className="space-y-4">
              <div>
                <label className="label font-medium">Settlement Amount ({invoice.currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Math.min(Number(invoice.balance_due), Number(patientWallet.balance))}
                  value={walletSettleAmount}
                  onChange={(e) => setWalletSettleAmount(e.target.value ? parseFloat(e.target.value) : '')}
                  required
                  className="input w-full"
                />
              </div>

              <div>
                <label className="label font-medium">Audit Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={walletSettleNotes}
                  onChange={(e) => setWalletSettleNotes(e.target.value)}
                  placeholder="e.g. In-clinic settlement using advance wallet deposit"
                  className="input w-full text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowWalletSettleModal(false)}
                  className="btn btn-ghost"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !walletSettleAmount || Number(walletSettleAmount) <= 0}
                  className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {actionLoading ? 'Settling...' : 'Confirm Wallet Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default InvoiceDetailPage;
