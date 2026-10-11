import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Receipt,
  ArrowLeft,
  Trash2,
  AlertCircle,
  Calendar,
  Save,
  Send,
  User,
  FolderKanban,
  Activity,
  Coins,
} from 'lucide-react';
import { billingService, calculateLineAmounts } from '../../services/billingService';
import { patientService } from '../../services/patientService';
import { serviceCatalogService } from '../../services/serviceCatalogService';
import { usePractice } from '../../hooks/usePractice';
import { supabase } from '../../lib/supabase';
import { useFormDraft } from '../../hooks/useFormDraft';
import { DraftBanner } from '../../components/ui/DraftBanner';
import type {
  Patient,
  Service,
  FeeSchedule,
} from '../../types/models';

interface LineItemDraft {
  id: string; // local temp key
  service_id: string;
  service_code_snapshot: string;
  service_name_snapshot: string;
  description: string;
  quantity: number;
  unit_price_snapshot: number;
  currency: string;
  is_taxable: boolean;
  tax_rate_percent_snapshot: number;
  discount_amount: number;
}

interface InvoiceDraftData {
  selectedPatientId: string;
  selectedEpisodeId: string;
  selectedVisitId: string;
  selectedScheduleId: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  notes: string;
  terms: string;
  lines: LineItemDraft[];
}

export const CreateInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const { activePractice } = usePractice();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [feeSchedules, setFeeSchedules] = useState<FeeSchedule[]>([]);
  const [episodes, setEpisodes] = useState<Array<{ id: string; episode_identifier: string; title: string }>>([]);
  const [visits, setVisits] = useState<Array<{ id: string; visit_identifier: string; actual_start: string | null }>>([]);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Platform-wide draft preservation
  const {
    data: draftData,
    updateField,
    isDirty,
    isRestored,
    restoredAt,
    discardDraft,
    markSaved,
  } = useFormDraft<InvoiceDraftData>({
    formId: 'create_invoice_record',
    initialData: {
      selectedPatientId: '',
      selectedEpisodeId: '',
      selectedVisitId: '',
      selectedScheduleId: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      currency: 'NGN',
      notes: '',
      terms: 'Payment due within 30 days. Transfer or card accepted upon settlement.',
      lines: [],
    },
  });

  const selectedPatientId = draftData.selectedPatientId;
  const setSelectedPatientId = (v: string) => updateField('selectedPatientId', v);
  const selectedEpisodeId = draftData.selectedEpisodeId;
  const setSelectedEpisodeId = (v: string) => updateField('selectedEpisodeId', v);
  const selectedVisitId = draftData.selectedVisitId;
  const setSelectedVisitId = (v: string) => updateField('selectedVisitId', v);
  const selectedScheduleId = draftData.selectedScheduleId;
  const setSelectedScheduleId = (v: string) => updateField('selectedScheduleId', v);
  const issueDate = draftData.issueDate;
  const setIssueDate = (v: string) => updateField('issueDate', v);
  const dueDate = draftData.dueDate;
  const setDueDate = (v: string) => updateField('dueDate', v);
  const currency = draftData.currency;
  const setCurrency = (v: string) => updateField('currency', v);
  const notes = draftData.notes;
  const setNotes = (v: string) => updateField('notes', v);
  const terms = draftData.terms;
  const setTerms = (v: string) => updateField('terms', v);

  const lines = draftData.lines;
  const setLines = (newLinesOrFn: LineItemDraft[] | ((prev: LineItemDraft[]) => LineItemDraft[])) => {
    if (typeof newLinesOrFn === 'function') {
      const updated = newLinesOrFn(lines);
      updateField('lines', updated);
    } else {
      updateField('lines', newLinesOrFn);
    }
  };

  // Load initial patients, services, fee schedules
  useEffect(() => {
    const fetchPrerequisites = async () => {
      if (!activePractice) return;
      setIsLoadingData(true);
      setError(null);
      try {
        const [patientsRes, servicesRes, schedulesRes] = await Promise.all([
          patientService.getPatients({ limit: 100, status: 'active' }),
          serviceCatalogService.getServices(activePractice.id, { isActive: true }),
          serviceCatalogService.getFeeSchedules(activePractice.id, { status: 'active' }),
        ]);

        setPatients(patientsRes.patients);
        setServices(servicesRes);
        setFeeSchedules(schedulesRes);

        // Find default fee schedule
        const defaultSched = schedulesRes.find((s) => s.is_default) || schedulesRes[0];
        if (defaultSched) {
          setSelectedScheduleId(defaultSched.id);
          if (defaultSched.currency) {
            setCurrency(defaultSched.currency);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load initial billing form data.');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchPrerequisites();
  }, [activePractice]);

  // When patient changes, load episodes and visits
  useEffect(() => {
    const fetchPatientProvenance = async () => {
      if (!activePractice || !selectedPatientId) {
        setEpisodes([]);
        setVisits([]);
        setSelectedEpisodeId('');
        setSelectedVisitId('');
        return;
      }

      try {
        const [epRes, visRes] = await Promise.all([
          supabase
            .from('episodes_of_care')
            .select('id, episode_identifier, title')
            .eq('practice_id', activePractice.id)
            .eq('patient_id', selectedPatientId)
            .order('created_at', { ascending: false }),
          supabase
            .from('clinical_visits')
            .select('id, visit_identifier, actual_start')
            .eq('practice_id', activePractice.id)
            .eq('patient_id', selectedPatientId)
            .order('created_at', { ascending: false }),
        ]);

        setEpisodes((epRes.data || []) as any);
        setVisits((visRes.data || []) as any);
      } catch (err) {
        console.error('Error fetching patient provenance:', err);
      }
    };

    fetchPatientProvenance();
  }, [activePractice, selectedPatientId]);

  // Line item handlers
  const handleAddLine = async (serviceId: string) => {
    if (!activePractice || !serviceId) return;

    try {
      const resolved = await billingService.resolveServicePrice(
        serviceId,
        selectedScheduleId || null,
        activePractice.id
      );

      const newLine: LineItemDraft = {
        id: Math.random().toString(36).substring(2, 9),
        service_id: serviceId,
        service_code_snapshot: resolved.serviceCode,
        service_name_snapshot: resolved.serviceName,
        description: resolved.description || '',
        quantity: 1,
        unit_price_snapshot: resolved.unitPrice,
        currency: resolved.currency || currency,
        is_taxable: resolved.isTaxable,
        tax_rate_percent_snapshot: resolved.taxRatePercent,
        discount_amount: 0,
      };

      setLines([...lines, newLine]);
      setError(null);
    } catch (err: any) {
      console.error('Error resolving service price:', err);
      setError(err.message || 'Selected service has no active fee schedule tariff.');
    }
  };

  const handleUpdateLine = (lineId: string, fields: Partial<LineItemDraft>) => {
    setLines(lines.map((l) => (l.id === lineId ? { ...l, ...fields } : l)));
  };

  const handleRemoveLine = (lineId: string) => {
    setLines(lines.filter((l) => l.id !== lineId));
  };

  // Compute live totals
  const subtotal = lines.reduce((acc, l) => {
    const amounts = calculateLineAmounts(l.quantity, l.unit_price_snapshot, l.discount_amount, l.is_taxable ? l.tax_rate_percent_snapshot : 0);
    return acc + amounts.subtotal;
  }, 0);

  const discountTotal = lines.reduce((acc, l) => {
    const amounts = calculateLineAmounts(l.quantity, l.unit_price_snapshot, l.discount_amount, l.is_taxable ? l.tax_rate_percent_snapshot : 0);
    return acc + amounts.discountAmount;
  }, 0);

  const taxTotal = lines.reduce((acc, l) => {
    const amounts = calculateLineAmounts(l.quantity, l.unit_price_snapshot, l.discount_amount, l.is_taxable ? l.tax_rate_percent_snapshot : 0);
    return acc + amounts.taxAmount;
  }, 0);

  const grandTotal = Math.round((subtotal - discountTotal + taxTotal) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent, issueImmediately = false) => {
    e.preventDefault();
    if (!activePractice) return;
    if (!selectedPatientId) {
      setError('Please select a patient.');
      return;
    }
    if (issueImmediately && lines.length === 0) {
      setError('Cannot issue an invoice without at least one charge line item.');
      return;
    }
    if (issueImmediately && grandTotal <= 0) {
      setError('Cannot issue an invoice with zero grand total.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create draft invoice with authoritative line items
      const created = await billingService.createDraftInvoice(
        {
          patient_id: selectedPatientId,
          episode_id: selectedEpisodeId || null,
          clinical_visit_id: selectedVisitId || null,
          fee_schedule_id: selectedScheduleId || null,
          issue_date: issueDate,
          due_date: dueDate || null,
          currency,
          notes,
          terms,
          lines: lines.map((l) => ({
            service_id: l.service_id,
            quantity: l.quantity,
            discount_amount: l.discount_amount,
            description: l.description || null,
          })),
        },
        activePractice.id
      );

      // 2. Issue immediately if requested
      if (issueImmediately) {
        await billingService.issueInvoice(created.id, activePractice.id);
      }

      markSaved();
      navigate(`/app/invoices/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/app/invoices" className="btn btn-ghost btn-sm inline-flex items-center gap-1 mb-2">
          <ArrowLeft size={16} />
          <span>Back to Invoices</span>
        </Link>
        <h1 className="page-title flex items-center gap-2">
          <Receipt className="text-primary-600" size={28} />
          Create Practice Invoice
        </h1>
        <p className="page-subtitle">
          Construct an itemized demand for payment with snapshot pricing
        </p>
      </div>

      {/* Form Draft Preservation & Restoration Banner */}
      <DraftBanner
        isRestored={isRestored}
        restoredAt={restoredAt}
        isDirty={isDirty}
        onDiscard={discardDraft}
        entityName="invoice"
      />

      {error && (
        <div className="alert alert-danger mb-6 flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {isLoadingData ? (
        <div className="card p-12 text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
          Loading billing setup...
        </div>
      ) : (
        <form onSubmit={(e) => handleSubmit(e, false)}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Column 1 & 2: Debtor & Provenance Details */}
            <div className="md:col-span-2 space-y-6">
              <div className="card p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User size={18} className="text-primary-600" />
                  Patient & Debtor Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="label font-medium">Select Patient *</label>
                    <select
                      value={selectedPatientId}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                      required
                      className="input w-full"
                    >
                      <option value="">-- Choose Patient --</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.first_name} {p.last_name} ({p.patient_identifier})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label font-medium flex items-center gap-1">
                      <FolderKanban size={14} className="text-gray-400" />
                      Episode of Care (Optional)
                    </label>
                    <select
                      value={selectedEpisodeId}
                      onChange={(e) => setSelectedEpisodeId(e.target.value)}
                      disabled={!selectedPatientId}
                      className="input w-full"
                    >
                      <option value="">-- None / General Practice Charge --</option>
                      {episodes.map((ep) => (
                        <option key={ep.id} value={ep.id}>
                          {ep.episode_identifier}: {ep.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label font-medium flex items-center gap-1">
                      <Activity size={14} className="text-gray-400" />
                      Clinical Visit (Optional)
                    </label>
                    <select
                      value={selectedVisitId}
                      onChange={(e) => setSelectedVisitId(e.target.value)}
                      disabled={!selectedPatientId}
                      className="input w-full"
                    >
                      <option value="">-- None / Standalone Charge --</option>
                      {visits.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.visit_identifier} {v.actual_start ? `(${v.actual_start.split('T')[0]})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Invoicing Dates & Catalog Schedule */}
              <div className="card p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar size={18} className="text-primary-600" />
                  Billing Parameters
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label font-medium">Issue Date *</label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      required
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="label font-medium">Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      min={issueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="label font-medium flex items-center gap-1">
                      <Coins size={14} className="text-gray-400" />
                      Fee Schedule
                    </label>
                    <select
                      value={selectedScheduleId}
                      onChange={(e) => setSelectedScheduleId(e.target.value)}
                      className="input w-full"
                    >
                      <option value="">-- Practice Standard Default --</option>
                      {feeSchedules.map((fs) => (
                        <option key={fs.id} value={fs.id}>
                          {fs.name} ({fs.currency}) {fs.is_default ? '★' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Summary Card */}
            <div>
              <div className="card p-6 sticky top-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Financial Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-medium text-gray-900">
                      {currency} {subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Discounts:</span>
                    <span className="font-medium text-amber-600">
                      - {currency} {discountTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax:</span>
                    <span className="font-medium text-gray-900">
                      + {currency} {taxTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-base font-bold text-gray-900">
                    <span>Grand Total:</span>
                    <span className="text-primary-700">
                      {currency} {grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedPatientId}
                    className="btn btn-secondary w-full flex items-center justify-center gap-2"
                  >
                    <Save size={16} />
                    <span>{isSubmitting ? 'Saving...' : 'Save as Draft'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting || !selectedPatientId || lines.length === 0 || grandTotal <= 0}
                    onClick={(e) => handleSubmit(e, true)}
                    className="btn btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    <span>Issue Invoice Immediately</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Charge Lines */}
          <div className="card p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Itemized Billable Services & Supplies</h3>
                <p className="text-xs text-gray-500">
                  Select services from your catalog to snapshot current tariffs into this invoice
                </p>
              </div>

              <div className="flex gap-2">
                <div className="relative">
                  <select
                    className="btn btn-sm btn-primary cursor-pointer"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddLine(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>+ Add Catalog Service</option>
                    {services.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.service_code} - {srv.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {lines.length === 0 ? (
              <div className="p-8 border-2 border-dashed rounded-lg text-center text-gray-500">
                <Receipt size={32} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium">No service lines added yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click "+ Add Catalog Service" above to add billable consultation, rehabilitation, or supplies.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full text-sm">
                  <thead>
                    <tr>
                      <th style={{ width: '32%' }}>Service / Description</th>
                      <th style={{ width: '12%' }}>Qty</th>
                      <th style={{ width: '15%' }}>Unit Tariff</th>
                      <th style={{ width: '13%' }}>Discount</th>
                      <th style={{ width: '12%' }}>Tax</th>
                      <th className="text-right" style={{ width: '14%' }}>Total</th>
                      <th style={{ width: '5%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => {
                      const amounts = calculateLineAmounts(
                        l.quantity,
                        l.unit_price_snapshot,
                        l.discount_amount,
                        l.is_taxable ? l.tax_rate_percent_snapshot : 0
                      );

                      return (
                        <tr key={l.id}>
                          <td>
                            <div className="space-y-1">
                              <div>
                                <span className="font-medium text-gray-900">{l.service_name_snapshot}</span>
                                <span className="ml-2 text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{l.service_code_snapshot}</span>
                              </div>
                              <input
                                type="text"
                                placeholder="Optional line note / description..."
                                value={l.description}
                                onChange={(e) => handleUpdateLine(l.id, { description: e.target.value })}
                                className="input input-xs w-full text-gray-600"
                              />
                            </div>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0.5"
                              step="0.5"
                              value={l.quantity}
                              onChange={(e) => handleUpdateLine(l.id, { quantity: parseFloat(e.target.value) || 1 })}
                              className="input input-sm w-full text-center"
                            />
                          </td>
                          <td className="font-mono text-gray-700">
                            {currency} {l.unit_price_snapshot.toFixed(2)}
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max={amounts.subtotal}
                              step="0.01"
                              value={l.discount_amount}
                              onChange={(e) => handleUpdateLine(l.id, { discount_amount: Math.min(amounts.subtotal, Math.max(0, parseFloat(e.target.value) || 0)) })}
                              className="input input-sm w-full text-right"
                            />
                          </td>
                          <td>
                            <div className="text-xs">
                              {l.is_taxable ? (
                                <span className="text-amber-700 font-medium">{l.tax_rate_percent_snapshot}% ({currency} {amounts.taxAmount.toFixed(2)})</span>
                              ) : (
                                <span className="text-gray-400">Exempt (0%)</span>
                              )}
                            </div>
                          </td>
                          <td className="text-right font-semibold text-gray-900 font-mono">
                            {currency} {amounts.lineTotal.toFixed(2)}
                          </td>
                          <td className="text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(l.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes and Terms */}
          <div className="card p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label font-medium">Invoice Notes (Visible to Patient)</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Thank you for choosing Physenra for your physiotherapy care..."
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="label font-medium">Payment Terms</label>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="input w-full text-sm"
              />
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
export default CreateInvoicePage;
