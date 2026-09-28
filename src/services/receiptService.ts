// ==============================================================================
// PHYSENRA PAYMENTS & RECEIPTS FOUNDATION V1 SERVICE LAYER
// File: src/services/receiptService.ts
//
// Governs:
// 1. Immutable proof-of-payment receipts retrieval (REC-000001)
// 2. Receipt querying with full patient and payment relations
// 3. Reprint presentation metadata
// 4. PostgREST constraint disambiguation (explicit hints)
// ==============================================================================

import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  ReceiptWithRelations,
  ReceiptFilters,
} from '../types/models';

export const receiptService = {
  // ----------------------------------------------------------------------------
  // QUERY METHODS (DISAMBIGUATED POSTGREST HINTS)
  // ----------------------------------------------------------------------------

  /**
   * Retrieves all receipts for the active practice with optional filtering.
   */
  async getReceipts(
    practiceId?: string,
    filters?: ReceiptFilters
  ): Promise<ReceiptWithRelations[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    let query = supabase
      .from('receipts')
      .select(`
        *,
        patient:patients!fk_receipts_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        payment:payments!fk_receipts_payment_practice (
          id,
          payment_number,
          payment_date,
          amount,
          currency,
          payment_method,
          reference_number,
          status,
          allocations:payment_allocations!fk_allocations_payment_practice (
            id,
            amount,
            invoice:invoices!fk_allocations_invoice_practice (
              id,
              invoice_number,
              grand_total,
              balance_due,
              status
            )
          )
        ),
        issuer:profiles!receipts_issued_by_fkey (
          id,
          display_name,
          first_name,
          last_name
        ),
        voider:profiles!receipts_voided_by_fkey (
          id,
          display_name,
          first_name,
          last_name
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

    if (filters?.startDate) {
      query = query.gte('issue_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('issue_date', filters.endDate);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    let results = (data || []) as unknown as ReceiptWithRelations[];

    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      results = results.filter((r) => {
        const numMatch = r.receipt_number.toLowerCase().includes(q);
        const pmtMatch = r.payment?.payment_number?.toLowerCase().includes(q) || false;
        const refMatch = r.reference_number?.toLowerCase().includes(q) || false;
        const patientName = `${r.patient?.first_name || ''} ${r.patient?.last_name || ''}`.toLowerCase();
        const patCode = r.patient?.patient_identifier?.toLowerCase() || '';
        return numMatch || pmtMatch || refMatch || patientName.includes(q) || patCode.includes(q);
      });
    }

    return results;
  },

  /**
   * Retrieves a single receipt by ID with all relations.
   */
  async getReceiptById(
    receiptId: string,
    practiceId?: string
  ): Promise<ReceiptWithRelations> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('receipts')
      .select(`
        *,
        patient:patients!fk_receipts_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        payment:payments!fk_receipts_payment_practice (
          id,
          payment_number,
          payment_date,
          amount,
          currency,
          payment_method,
          reference_number,
          status,
          allocations:payment_allocations!fk_allocations_payment_practice (
            id,
            amount,
            invoice:invoices!fk_allocations_invoice_practice (
              id,
              invoice_number,
              grand_total,
              balance_due,
              status
            )
          )
        ),
        issuer:profiles!receipts_issued_by_fkey (
          id,
          display_name,
          first_name,
          last_name
        ),
        voider:profiles!receipts_voided_by_fkey (
          id,
          display_name,
          first_name,
          last_name
        )
      `)
      .eq('id', receiptId)
      .eq('practice_id', activePracticeId)
      .single();

    if (error) {
      throw error;
    }

    return data as unknown as ReceiptWithRelations;
  },

  /**
   * Retrieves a receipt for a specific payment ID.
   */
  async getReceiptByPaymentId(
    paymentId: string,
    practiceId?: string
  ): Promise<ReceiptWithRelations | null> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('receipts')
      .select(`
        *,
        patient:patients!fk_receipts_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        payment:payments!fk_receipts_payment_practice (
          id,
          payment_number,
          payment_date,
          amount,
          currency,
          payment_method,
          reference_number,
          status,
          allocations:payment_allocations!fk_allocations_payment_practice (
            id,
            amount,
            invoice:invoices!fk_allocations_invoice_practice (
              id,
              invoice_number,
              grand_total,
              balance_due,
              status
            )
          )
        ),
        issuer:profiles!receipts_issued_by_fkey (
          id,
          display_name,
          first_name,
          last_name
        ),
        voider:profiles!receipts_voided_by_fkey (
          id,
          display_name,
          first_name,
          last_name
        )
      `)
      .eq('payment_id', paymentId)
      .eq('practice_id', activePracticeId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as unknown as ReceiptWithRelations | null;
  },
};
