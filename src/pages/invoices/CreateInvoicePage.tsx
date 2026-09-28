import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Receipt,
  ArrowLeft,
  Plus,
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

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>('');
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');
  const [currency, setCurrency] = useState<string>('NGN');
  const [notes, setNotes] = useState<string>('');
  const [terms, setTerms] = useState<string>('Payment due within 30 days. Transfer or card accepted upon settlement.');

  // Lines State
  const [lines, setLines] = useState<LineItemDraft[]>([]);

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
  const handleAddLine = async (serviceId?: string) => {
    if (!activePractice) return;

    let srvCode = 'CUSTOM';
    let srvName = 'Custom Service';
    let desc = '';
    let unitPrice = 0;
    let isTaxable = false;
    let taxRate = 0;

    if (serviceId) {
      const resolved = await billingService.resolveServicePrice(
        serviceId,
        selectedScheduleId || null,
        activePractice.id
      );
      srvCode = resolved.serviceCode;
      srvName = resolved.serviceName;
      desc = resolved.description || '';
      unitPrice = resolved.unitPrice;
      isTaxable = resolved.isTaxable;
      taxRate = resolved.taxRatePercent;
    }

    const newLine: LineItemDraft = {
      id: Math.random().toString(36).substring(2, 9),
      service_id: serviceId || '',
      service_code_snapshot: srvCode,
      service_name_snapshot: srvName,
      description: desc,
      quantity: 1,
      unit_price_snapshot: unitPrice,
      currency,
      is_taxable: isTaxable,
      tax_rate_percent_snapshot: taxRate,
      discount_amount: 0,
    };

    setLines([...lines, newLine]);
  };

  const handleServiceSelect = async (lineId: string, srvId: string) => {
    if (!activePractice || !srvId) return;
    try {
      const resolved = await billingService.resolveServicePrice(
        srvId,
        selectedScheduleId || null,
        activePractice.id
      );
      setLines(
        lines.map((l) => {
          if (l.id !== lineId) return l;
          return {
            ...l,
            service_id: srvId,
            service_code_snapshot: resolved.serviceCode,
            service_name_snapshot: resolved.serviceName,
            description: resolved.description || '',
            unit_price_snapshot: resolved.unitPrice,
            is_taxable: resolved.isTaxable,
            tax_rate_percent_snapshot: resolved.taxRatePercent,
          };
        })
      );
    } catch (err) {
      console.error('Error resolving service price:', err);
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
      // 1. Create draft invoice with lines
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
            service_id: l.service_id || null,
            service_code_snapshot: l.service_code_snapshot,
            service_name_snapshot: l.service_name_snapshot,
            description: l.description,
            quantity: l.quantity,
            unit_price_snapshot: l.unit_price_snapshot,
            currency: l.currency,
            is_taxable: l.is_taxable,
            tax_rate_percent_snapshot: l.is_taxable ? l.tax_rate_percent_snapshot : 0,
            discount_amount: l.discount_amount,
          })),
        },
        activePractice.id
      );

      // 2. Issue immediately if requested
      if (issueImmediately) {
        await billingService.issueInvoice(created.id, activePractice.id);
      }

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
                <button
                  type="button"
                  onClick={() => handleAddLine()}
                  className="btn btn-sm btn-ghost flex items-center gap-1"
                >
                  <Plus size={14} /> Custom Line
                </button>
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
                      <th style={{ width: '30%' }}>Service / Description</th>
                      <th style={{ width: '12%' }}>Qty</th>
                      <th style={{ width: '15%' }}>Unit Price</th>
                      <th style={{ width: '12%' }}>Discount</th>
                      <th style={{ width: '12%' }}>Tax %</th>
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
                              <select
                                value={l.service_id}
                                onChange={(e) => handleServiceSelect(l.id, e.target.value)}
                                className="input input-sm w-full font-medium"
                              >
                                <option value="">-- Custom Manual Service --</option>
                                {services.map((srv) => (
                                  <option key={srv.id} value={srv.id}>
                                    {srv.service_code} - {srv.name}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Service note / description..."
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
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={l.unit_price_snapshot}
                              onChange={(e) => handleUpdateLine(l.id, { unit_price_snapshot: parseFloat(e.target.value) || 0 })}
                              className="input input-sm w-full text-right"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={l.discount_amount}
                              onChange={(e) => handleUpdateLine(l.id, { discount_amount: parseFloat(e.target.value) || 0 })}
                              className="input input-sm w-full text-right"
                            />
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={l.is_taxable}
                                onChange={(e) => handleUpdateLine(l.id, { is_taxable: e.target.checked })}
                                className="checkbox checkbox-sm"
                                title="Taxable"
                              />
                              {l.is_taxable ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  value={l.tax_rate_percent_snapshot}
                                  onChange={(e) => handleUpdateLine(l.id, { tax_rate_percent_snapshot: parseFloat(e.target.value) || 0 })}
                                  className="input input-sm w-16 text-right"
                                />
                              ) : (
                                <span className="text-xs text-gray-400">0%</span>
                              )}
                            </div>
                          </td>
                          <td className="text-right font-semibold text-gray-900">
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
