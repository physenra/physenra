// ==============================================================================
// PHYSENRA BILLING & INVOICING FOUNDATION V1 SERVICE LAYER
// File: src/services/billingService.ts
//
// Governs:
// 1. Standalone Invoices with optional composite clinical provenance
// 2. Itemized Invoice Lines with immutable service and authoritative fee schedule snapshots
// 3. Sequential practice-scoped invoice numbering (INV-000001)
// 4. Strict state machine transitions (draft -> issued -> void)
// 5. PostgREST constraint disambiguation (explicit hints)
// 6. Audit logging integration via public.log_audit_event
// 7. Deterministic fixed-point financial calculation integrity
// 8. Absolute boundary firewall: Zero payments, packages, wallets, insurance
// ==============================================================================

import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  Invoice,
  InvoiceInsert,
  InvoiceUpdate,
  InvoiceLine,
  InvoiceLineInsert,
  InvoiceLineUpdate,
  InvoiceWithRelations,
  InvoiceFilters,
  InvoiceStatus,
  Service,
  FeeScheduleItem,
} from '../types/models';

/**
 * Valid allowed state transitions for Billing & Invoicing V1.
 * Transitions to 'partially_paid' and 'paid' are unlocked by Payments V1 allocations.
 */
export const ALLOWED_INVOICE_TRANSITIONS: Record<
  InvoiceStatus,
  InvoiceStatus[]
> = {
  draft: ['issued'],
  issued: ['partially_paid', 'paid', 'void'],
  partially_paid: ['issued', 'paid', 'void'],
  paid: ['partially_paid', 'issued', 'void'],
  void: [], // Terminal, immutable state
};

/**
 * Deterministic helper to calculate line financial amounts with round-half-up to 2 decimal places.
 */
export function calculateLineAmounts(
  quantity: number,
  unitPrice: number,
  discountAmount: number = 0,
  taxRatePercent: number = 0
) {
  const safeQty = Math.max(0.01, quantity);
  const safeUnitPrice = Math.max(0, unitPrice);
  const subtotalBeforeDiscount = Math.round(safeQty * safeUnitPrice * 100) / 100;
  const safeDiscount = Math.min(Math.max(0, discountAmount), subtotalBeforeDiscount);
  const taxableAmount = Math.max(0, subtotalBeforeDiscount - safeDiscount);
  const safeTaxRate = Math.min(100, Math.max(0, taxRatePercent));
  const taxAmount = Math.round(taxableAmount * (safeTaxRate / 100) * 100) / 100;
  const lineTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  return {
    subtotal: subtotalBeforeDiscount,
    discountAmount: safeDiscount,
    taxableAmount,
    taxAmount,
    lineTotal,
  };
}

export const billingService = {
  // ----------------------------------------------------------------------------
  // INVOICE QUERY METHODS (DISAMBIGUATED POSTGREST HINTS)
  // ----------------------------------------------------------------------------

  /**
   * Retrieves all invoices for the practice matching optional filters.
   */
  async getInvoices(
    practiceId?: string,
    filters?: InvoiceFilters
  ): Promise<InvoiceWithRelations[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    let query = supabase
      .from('invoices')
      .select(`
        *,
        patient:patients!fk_invoices_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_invoices_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        clinical_visit:clinical_visits!fk_invoices_visit_patient_practice (
          id,
          visit_identifier,
          status,
          actual_start,
          actual_end
        ),
        fee_schedule:fee_schedules!fk_invoices_schedule_practice (
          id,
          schedule_identifier,
          name,
          currency
        ),
        lines:invoice_lines!fk_invoice_lines_invoice_practice (
          *,
          service:services!fk_invoice_lines_service_practice (
            id,
            service_code,
            name,
            category,
            standard_duration_minutes
          )
        )
      `)
      .eq('practice_id', activePracticeId)
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.patientId) {
      query = query.eq('patient_id', filters.patientId);
    }

    if (filters?.episodeId) {
      query = query.eq('episode_id', filters.episodeId);
    }

    if (filters?.clinicalVisitId) {
      query = query.eq('clinical_visit_id', filters.clinicalVisitId);
    }

    if (filters?.startDate) {
      query = query.gte('issue_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('issue_date', filters.endDate);
    }

    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const term = `%${filters.searchQuery.trim()}%`;
      query = query.or(`invoice_number.ilike.${term},notes.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[billingService.getInvoices] Error fetching invoices:', error);
      throw error;
    }

    return (data || []) as unknown as InvoiceWithRelations[];
  },

  /**
   * Retrieves a single invoice by ID with all relations disambiguated.
   */
  async getInvoiceById(
    invoiceId: string,
    practiceId?: string
  ): Promise<InvoiceWithRelations | null> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        patient:patients!fk_invoices_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        episode:episodes_of_care!fk_invoices_episode_patient_practice (
          id,
          episode_identifier,
          title,
          status
        ),
        clinical_visit:clinical_visits!fk_invoices_visit_patient_practice (
          id,
          visit_identifier,
          status,
          actual_start,
          actual_end
        ),
        fee_schedule:fee_schedules!fk_invoices_schedule_practice (
          id,
          schedule_identifier,
          name,
          currency
        ),
        lines:invoice_lines!fk_invoice_lines_invoice_practice (
          *,
          service:services!fk_invoice_lines_service_practice (
            id,
            service_code,
            name,
            category,
            standard_duration_minutes
          )
        )
      `)
      .eq('practice_id', activePracticeId)
      .eq('id', invoiceId)
      .maybeSingle();

    if (error) {
      console.error('[billingService.getInvoiceById] Error fetching invoice:', error);
      throw error;
    }

    return (data || null) as unknown as InvoiceWithRelations | null;
  },

  /**
   * Generates the next atomic sequential invoice number for a practice (INV-000001).
   */
  async generateNextInvoiceNumber(practiceId?: string): Promise<string> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('generate_next_invoice_number', {
      p_practice_id: activePracticeId,
    });

    if (error) {
      console.error('[billingService.generateNextInvoiceNumber] Error generating number:', error);
      throw error;
    }

    return data as string;
  },

  // ----------------------------------------------------------------------------
  // INVOICE LIFECYCLE & MUTATION METHODS
  // ----------------------------------------------------------------------------

  /**
   * Creates a new draft invoice with authoritatively priced lines.
   */
  async createDraftInvoice(
    payload: {
      patient_id: string;
      episode_id?: string | null;
      clinical_visit_id?: string | null;
      fee_schedule_id?: string | null;
      issue_date?: string;
      due_date?: string | null;
      currency?: string;
      notes?: string | null;
      terms?: string | null;
      lines?: Array<{
        service_id: string;
        quantity: number;
        discount_amount?: number;
        description?: string | null;
      }>;
    },
    practiceId?: string
  ): Promise<InvoiceWithRelations> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    if (!payload.patient_id) {
      throw new Error('Validation error: patient_id is required to create an invoice.');
    }

    // 1. Generate sequential invoice number
    const invoiceNumber = await this.generateNextInvoiceNumber(activePracticeId);

    // 2. Prepare header insert
    const invoiceCurrency = payload.currency || 'NGN';
    const insertPayload: InvoiceInsert = {
      practice_id: activePracticeId,
      invoice_number: invoiceNumber,
      patient_id: payload.patient_id,
      episode_id: payload.episode_id || null,
      clinical_visit_id: payload.clinical_visit_id || null,
      fee_schedule_id: payload.fee_schedule_id || null,
      issue_date: payload.issue_date || new Date().toISOString().split('T')[0],
      due_date: payload.due_date || null,
      status: 'draft',
      currency: invoiceCurrency,
      subtotal: 0,
      discount_total: 0,
      tax_total: 0,
      grand_total: 0,
      amount_paid: 0,
      balance_due: 0,
      notes: payload.notes || null,
      terms: payload.terms || null,
    };

    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert(insertPayload)
      .select()
      .single();

    if (invoiceError) {
      console.error('[billingService.createDraftInvoice] Error inserting invoice:', invoiceError);
      throw invoiceError;
    }

    const createdInvoice = invoiceData as Invoice;

    // 3. Insert lines with authoritative pricing
    if (payload.lines && payload.lines.length > 0) {
      const lineInserts: InvoiceLineInsert[] = [];

      for (const line of payload.lines) {
        if (!line.service_id) {
          throw new Error('Validation failure: service_id is mandatory for invoice lines.');
        }

        const pricing = await this.resolveServicePrice(
          line.service_id,
          payload.fee_schedule_id || null,
          activePracticeId
        );

        const amounts = calculateLineAmounts(
          line.quantity,
          pricing.unitPrice,
          line.discount_amount || 0,
          pricing.taxRatePercent
        );

        lineInserts.push({
          practice_id: activePracticeId,
          invoice_id: createdInvoice.id,
          service_id: line.service_id,
          service_code_snapshot: pricing.serviceCode,
          service_name_snapshot: pricing.serviceName,
          description: line.description || pricing.description || null,
          quantity: line.quantity,
          unit_price_snapshot: pricing.unitPrice,
          currency: pricing.currency || invoiceCurrency,
          is_taxable: pricing.isTaxable,
          tax_rate_percent_snapshot: pricing.taxRatePercent,
          discount_amount: amounts.discountAmount,
          tax_amount: amounts.taxAmount,
          line_total: amounts.lineTotal,
        });
      }

      const { error: linesError } = await supabase
        .from('invoice_lines')
        .insert(lineInserts);

      if (linesError) {
        console.error('[billingService.createDraftInvoice] Error inserting lines:', linesError);
        // Clean up draft header on error
        await supabase.from('invoices').delete().eq('id', createdInvoice.id);
        throw linesError;
      }
    }

    // 4. Log audit event
    await supabase.rpc('log_audit_event', {
      p_action: 'invoice.created',
      p_entity_type: 'invoice',
      p_entity_id: createdInvoice.id,
      p_metadata: {
        invoice_number: invoiceNumber,
        patient_id: payload.patient_id,
        episode_id: payload.episode_id || null,
        clinical_visit_id: payload.clinical_visit_id || null,
        status: 'draft',
      },
      p_source: 'web',
    });

    const fullInvoice = await this.getInvoiceById(createdInvoice.id, activePracticeId);
    if (!fullInvoice) {
      throw new Error('Failed to retrieve newly created invoice.');
    }
    return fullInvoice;
  },

  /**
   * Updates an existing draft invoice header.
   */
  async updateDraftInvoice(
    invoiceId: string,
    payload: {
      patient_id?: string;
      episode_id?: string | null;
      clinical_visit_id?: string | null;
      fee_schedule_id?: string | null;
      due_date?: string | null;
      notes?: string | null;
      terms?: string | null;
    },
    practiceId?: string
  ): Promise<InvoiceWithRelations> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const current = await this.getInvoiceById(invoiceId, activePracticeId);
    if (!current) {
      throw new Error('Invoice not found.');
    }
    if (current.status !== 'draft') {
      throw new Error(`Cannot update non-draft invoice. Current status: ${current.status}.`);
    }

    const updatePayload: InvoiceUpdate = {
      ...(payload.patient_id ? { patient_id: payload.patient_id } : {}),
      ...(payload.episode_id !== undefined ? { episode_id: payload.episode_id } : {}),
      ...(payload.clinical_visit_id !== undefined ? { clinical_visit_id: payload.clinical_visit_id } : {}),
      ...(payload.fee_schedule_id !== undefined ? { fee_schedule_id: payload.fee_schedule_id } : {}),
      ...(payload.due_date !== undefined ? { due_date: payload.due_date } : {}),
      ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
      ...(payload.terms !== undefined ? { terms: payload.terms } : {}),
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('invoices')
      .update(updatePayload)
      .eq('practice_id', activePracticeId)
      .eq('id', invoiceId)
      .eq('status', 'draft');

    if (updateError) {
      console.error('[billingService.updateDraftInvoice] Error updating invoice:', updateError);
      throw updateError;
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'invoice.updated',
      p_entity_type: 'invoice',
      p_entity_id: invoiceId,
      p_metadata: {
        updated_fields: Object.keys(updatePayload),
      },
      p_source: 'web',
    });

    const updated = await this.getInvoiceById(invoiceId, activePracticeId);
    return updated!;
  },

  /**
   * Adds an authoritatively priced itemized charge line to a draft invoice.
   */
  async addInvoiceLine(
    invoiceId: string,
    payload: {
      service_id: string;
      quantity: number;
      discount_amount?: number;
      description?: string | null;
    },
    practiceId?: string
  ): Promise<InvoiceLine> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const invoice = await this.getInvoiceById(invoiceId, activePracticeId);
    if (!invoice) {
      throw new Error('Invoice not found.');
    }
    if (invoice.status !== 'draft') {
      throw new Error(`Cannot add line to non-draft invoice. Current status: ${invoice.status}.`);
    }

    if (!payload.service_id) {
      throw new Error('Validation failure: service_id is mandatory for invoice lines.');
    }

    // Authoritative pricing from fee schedule
    const pricing = await this.resolveServicePrice(
      payload.service_id,
      invoice.fee_schedule_id,
      activePracticeId
    );

    const amounts = calculateLineAmounts(
      payload.quantity,
      pricing.unitPrice,
      payload.discount_amount || 0,
      pricing.taxRatePercent
    );

    const lineInsert: InvoiceLineInsert = {
      practice_id: activePracticeId,
      invoice_id: invoiceId,
      service_id: payload.service_id,
      service_code_snapshot: pricing.serviceCode,
      service_name_snapshot: pricing.serviceName,
      description: payload.description || pricing.description || null,
      quantity: payload.quantity,
      unit_price_snapshot: pricing.unitPrice,
      currency: pricing.currency || invoice.currency,
      is_taxable: pricing.isTaxable,
      tax_rate_percent_snapshot: pricing.taxRatePercent,
      discount_amount: amounts.discountAmount,
      tax_amount: amounts.taxAmount,
      line_total: amounts.lineTotal,
    };

    const { data, error } = await supabase
      .from('invoice_lines')
      .insert(lineInsert)
      .select()
      .single();

    if (error) {
      console.error('[billingService.addInvoiceLine] Error inserting line:', error);
      throw error;
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'invoice.line_added',
      p_entity_type: 'invoice',
      p_entity_id: invoiceId,
      p_metadata: {
        line_id: data.id,
        service_code: pricing.serviceCode,
        quantity: payload.quantity,
        line_total: amounts.lineTotal,
      },
      p_source: 'web',
    });

    return data as InvoiceLine;
  },

  /**
   * Updates quantity, discount, or description of a charge line on a draft invoice.
   * Unit price and tax rate are authoritative and immutable.
   */
  async updateInvoiceLine(
    lineId: string,
    payload: {
      quantity?: number;
      discount_amount?: number;
      description?: string | null;
    },
    practiceId?: string
  ): Promise<InvoiceLine> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data: existingLine, error: fetchError } = await supabase
      .from('invoice_lines')
      .select('*')
      .eq('practice_id', activePracticeId)
      .eq('id', lineId)
      .single();

    if (fetchError || !existingLine) {
      throw new Error('Invoice line not found.');
    }

    const currentLine = existingLine as InvoiceLine;
    const qty = payload.quantity !== undefined ? payload.quantity : currentLine.quantity;
    const disc = payload.discount_amount !== undefined ? payload.discount_amount : currentLine.discount_amount;

    const amounts = calculateLineAmounts(
      qty,
      currentLine.unit_price_snapshot,
      disc,
      currentLine.is_taxable ? currentLine.tax_rate_percent_snapshot : 0
    );

    const lineUpdate: InvoiceLineUpdate = {
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      quantity: qty,
      discount_amount: amounts.discountAmount,
      tax_amount: amounts.taxAmount,
      line_total: amounts.lineTotal,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedLine, error: updateError } = await supabase
      .from('invoice_lines')
      .update(lineUpdate)
      .eq('practice_id', activePracticeId)
      .eq('id', lineId)
      .select()
      .single();

    if (updateError) {
      console.error('[billingService.updateInvoiceLine] Error updating line:', updateError);
      throw updateError;
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'invoice.line_updated',
      p_entity_type: 'invoice',
      p_entity_id: currentLine.invoice_id,
      p_metadata: {
        line_id: lineId,
        quantity: qty,
        line_total: amounts.lineTotal,
      },
      p_source: 'web',
    });

    return updatedLine as InvoiceLine;
  },

  /**
   * Removes an itemized charge line from a draft invoice.
   */
  async removeInvoiceLine(lineId: string, practiceId?: string): Promise<void> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data: existingLine, error: fetchError } = await supabase
      .from('invoice_lines')
      .select('invoice_id, service_code_snapshot')
      .eq('practice_id', activePracticeId)
      .eq('id', lineId)
      .single();

    if (fetchError || !existingLine) {
      throw new Error('Invoice line not found.');
    }

    const { error: deleteError } = await supabase
      .from('invoice_lines')
      .delete()
      .eq('practice_id', activePracticeId)
      .eq('id', lineId);

    if (deleteError) {
      console.error('[billingService.removeInvoiceLine] Error removing line:', deleteError);
      throw deleteError;
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'invoice.line_removed',
      p_entity_type: 'invoice',
      p_entity_id: existingLine.invoice_id,
      p_metadata: {
        line_id: lineId,
        service_code: existingLine.service_code_snapshot,
      },
      p_source: 'web',
    });
  },

  /**
   * Officially issues a draft invoice, permanently locking lines and financial totals.
   */
  async issueInvoice(invoiceId: string, practiceId?: string): Promise<InvoiceWithRelations> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const invoice = await this.getInvoiceById(invoiceId, activePracticeId);
    if (!invoice) {
      throw new Error('Invoice not found.');
    }

    if (invoice.status !== 'draft') {
      throw new Error(`Cannot issue invoice: Invoice is already in status '${invoice.status}'.`);
    }

    if (!invoice.lines || invoice.lines.length === 0) {
      throw new Error('Validation failure: Cannot issue invoice without itemized charge lines.');
    }

    if (invoice.grand_total <= 0) {
      throw new Error('Validation failure: Cannot issue invoice with zero or negative grand total.');
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'issued',
        issued_at: now,
        updated_at: now,
      })
      .eq('practice_id', activePracticeId)
      .eq('id', invoiceId)
      .eq('status', 'draft');

    if (error) {
      console.error('[billingService.issueInvoice] Error issuing invoice:', error);
      throw error;
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'invoice.issued',
      p_entity_type: 'invoice',
      p_entity_id: invoiceId,
      p_metadata: {
        invoice_number: invoice.invoice_number,
        grand_total: invoice.grand_total,
        balance_due: invoice.balance_due,
        issued_at: now,
      },
      p_source: 'web',
    });

    const issuedInvoice = await this.getInvoiceById(invoiceId, activePracticeId);
    return issuedInvoice!;
  },

  /**
   * Officially voids an issued invoice with mandatory recorded reason.
   */
  async voidInvoice(
    invoiceId: string,
    voidReason: string,
    practiceId?: string
  ): Promise<InvoiceWithRelations> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    if (!voidReason || voidReason.trim().length < 5) {
      throw new Error('Validation failure: A valid void reason of at least 5 characters is required.');
    }

    const invoice = await this.getInvoiceById(invoiceId, activePracticeId);
    if (!invoice) {
      throw new Error('Invoice not found.');
    }

    if (invoice.status !== 'issued') {
      throw new Error(`Cannot void invoice: Only 'issued' invoices may be voided. Current status is '${invoice.status}'.`);
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'void',
        voided_at: now,
        void_reason: voidReason.trim(),
        balance_due: 0,
        updated_at: now,
      })
      .eq('practice_id', activePracticeId)
      .eq('id', invoiceId)
      .eq('status', 'issued');

    if (error) {
      console.error('[billingService.voidInvoice] Error voiding invoice:', error);
      throw error;
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'invoice.voided',
      p_entity_type: 'invoice',
      p_entity_id: invoiceId,
      p_metadata: {
        invoice_number: invoice.invoice_number,
        void_reason: voidReason.trim(),
        voided_at: now,
      },
      p_source: 'web',
    });

    const voidedInvoice = await this.getInvoiceById(invoiceId, activePracticeId);
    return voidedInvoice!;
  },

  /**
   * Deletes a draft invoice and its charge lines.
   */
  async deleteDraftInvoice(invoiceId: string, practiceId?: string): Promise<void> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const invoice = await this.getInvoiceById(invoiceId, activePracticeId);
    if (!invoice) {
      throw new Error('Invoice not found.');
    }

    if (invoice.status !== 'draft') {
      throw new Error(`Cannot delete invoice in status '${invoice.status}'. Only draft invoices may be removed.`);
    }

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('practice_id', activePracticeId)
      .eq('id', invoiceId);

    if (error) {
      console.error('[billingService.deleteDraftInvoice] Error deleting draft invoice:', error);
      throw error;
    }

    await supabase.rpc('log_audit_event', {
      p_action: 'invoice.deleted',
      p_entity_type: 'invoice',
      p_entity_id: invoiceId,
      p_metadata: {
        invoice_number: invoice.invoice_number,
        patient_id: invoice.patient_id,
      },
      p_source: 'web',
    });
  },

  // ----------------------------------------------------------------------------
  // PRICE & CATALOG RESOLUTION HELPER
  // ----------------------------------------------------------------------------

  /**
   * Resolves the authoritative unit price and tax configuration for a service
   * based on an optional fee schedule or active default fee schedule.
   * Throws an error if no active tariff is defined in the applicable schedule.
   */
  async resolveServicePrice(
    serviceId: string,
    feeScheduleId?: string | null,
    practiceId?: string
  ): Promise<{
    unitPrice: number;
    currency: string;
    isTaxable: boolean;
    taxRatePercent: number;
    feeScheduleId: string;
    serviceCode: string;
    serviceName: string;
    description: string | null;
  }> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    // 1. Fetch service
    const { data: serviceData, error: srvError } = await supabase
      .from('services')
      .select('*')
      .eq('practice_id', activePracticeId)
      .eq('id', serviceId)
      .single();

    if (srvError || !serviceData) {
      throw new Error('Service not found in practice catalog.');
    }

    const service = serviceData as Service;

    // 2. Resolve fee schedule: explicit or default active
    let targetScheduleId = feeScheduleId;
    if (!targetScheduleId) {
      const { data: defaultSchedule } = await supabase
        .from('fee_schedules')
        .select('id')
        .eq('practice_id', activePracticeId)
        .eq('status', 'active')
        .eq('is_default', true)
        .maybeSingle();

      if (defaultSchedule) {
        targetScheduleId = defaultSchedule.id;
      }
    }

    if (!targetScheduleId) {
      throw new Error(
        'No active fee schedule configured for this practice. Invoicing requires an active fee schedule.'
      );
    }

    // 3. Look up fee schedule item in target schedule
    const { data: itemData, error: itemError } = await supabase
      .from('fee_schedule_items')
      .select('*')
      .eq('practice_id', activePracticeId)
      .eq('fee_schedule_id', targetScheduleId)
      .eq('service_id', serviceId)
      .maybeSingle();

    if (itemError) {
      console.error('[billingService.resolveServicePrice] Error fetching tariff:', itemError);
      throw itemError;
    }

    if (!itemData) {
      throw new Error(
        `Service '${service.name}' (${service.service_code}) does not have an active tariff defined in the applicable fee schedule.`
      );
    }

    const item = itemData as FeeScheduleItem;
    return {
      unitPrice: Number(item.unit_price),
      currency: item.currency || 'NGN',
      isTaxable: item.is_taxable,
      taxRatePercent: item.is_taxable ? Number(item.tax_rate_percent) : 0,
      feeScheduleId: targetScheduleId,
      serviceCode: service.service_code,
      serviceName: service.name,
      description: service.description,
    };
  },
};
