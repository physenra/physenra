// ==============================================================================
// PHYSENRA PAYMENTS & RECEIPTS FOUNDATION V1 SERVICE LAYER
// File: src/services/paymentService.ts
//
// Governs:
// 1. Authoritative standalone payments recording & multi-invoice allocation
// 2. Atomic settlement RPC invocation (record_payment_and_allocate)
// 3. Authoritative payment voiding & invoice balance restoration (void_payment)
// 4. Strict idempotency key propagation
// 5. PostgREST constraint disambiguation (explicit hints)
// 6. Absolute domain firewall: Zero packages, wallets, insurance, gateways
// ==============================================================================

import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  PaymentWithRelations,
  PaymentFilters,
  RecordPaymentPayload,
  VoidPaymentPayload,
} from '../types/models';

export const paymentService = {
  // ----------------------------------------------------------------------------
  // QUERY METHODS (DISAMBIGUATED POSTGREST HINTS)
  // ----------------------------------------------------------------------------

  /**
   * Retrieves all payments for the active practice with optional filtering.
   */
  async getPayments(
    practiceId?: string,
    filters?: PaymentFilters
  ): Promise<PaymentWithRelations[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    let query = supabase
      .from('payments')
      .select(`
        *,
        patient:patients!fk_payments_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        allocations:payment_allocations!fk_allocations_payment_practice (
          id,
          payment_id,
          invoice_id,
          patient_id,
          amount,
          allocated_at,
          invoice:invoices!fk_allocations_invoice_practice (
            id,
            invoice_number,
            grand_total,
            balance_due,
            status,
            currency
          )
        ),
        receipt:receipts!fk_receipts_payment_practice (
          id,
          receipt_number,
          issue_date,
          amount,
          currency,
          payment_method,
          reference_number,
          status,
          issued_at
        ),
        recorder:profiles!payments_recorded_by_fkey (
          id,
          display_name,
          first_name,
          last_name
        ),
        voider:profiles!payments_voided_by_fkey (
          id,
          display_name,
          first_name,
          last_name
        )
      `)
      .eq('practice_id', activePracticeId)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.patientId) {
      query = query.eq('patient_id', filters.patientId);
    }

    if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
      query = query.eq('payment_method', filters.paymentMethod);
    }

    if (filters?.startDate) {
      query = query.gte('payment_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('payment_date', filters.endDate);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    let results = (data || []) as unknown as PaymentWithRelations[];

    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      results = results.filter((p) => {
        const numMatch = p.payment_number.toLowerCase().includes(q);
        const refMatch = p.reference_number?.toLowerCase().includes(q) || false;
        const patientName = `${p.patient?.first_name || ''} ${p.patient?.last_name || ''}`.toLowerCase();
        const patCode = p.patient?.patient_identifier?.toLowerCase() || '';
        return numMatch || refMatch || patientName.includes(q) || patCode.includes(q);
      });
    }

    return results;
  },

  /**
   * Retrieves a single payment by ID with all relations and allocations.
   */
  async getPaymentById(
    paymentId: string,
    practiceId?: string
  ): Promise<PaymentWithRelations> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        patient:patients!fk_payments_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          phone,
          email
        ),
        allocations:payment_allocations!fk_allocations_payment_practice (
          id,
          payment_id,
          invoice_id,
          patient_id,
          amount,
          allocated_at,
          invoice:invoices!fk_allocations_invoice_practice (
            id,
            invoice_number,
            grand_total,
            balance_due,
            status,
            currency
          )
        ),
        receipt:receipts!fk_receipts_payment_practice (
          id,
          receipt_number,
          issue_date,
          amount,
          currency,
          payment_method,
          reference_number,
          status,
          issued_at
        ),
        recorder:profiles!payments_recorded_by_fkey (
          id,
          display_name,
          first_name,
          last_name
        ),
        voider:profiles!payments_voided_by_fkey (
          id,
          display_name,
          first_name,
          last_name
        )
      `)
      .eq('id', paymentId)
      .eq('practice_id', activePracticeId)
      .single();

    if (error) {
      throw error;
    }

    return data as unknown as PaymentWithRelations;
  },

  // ----------------------------------------------------------------------------
  // MUTATION METHODS (ATOMIC RPC INVOCATION)
  // ----------------------------------------------------------------------------

  /**
   * Records a confirmed payment and atomically allocates it to target invoices.
   * Also issues a sequential receipt (REC-000001) in the same transaction.
   */
  async recordPayment(
    payload: RecordPaymentPayload,
    practiceId?: string
  ): Promise<{
    idempotent: boolean;
    payment_id: string;
    payment_number: string;
    status: string;
    amount: number;
    currency: string;
    receipt_id: string;
    receipt_number: string;
    allocations: Array<{ invoice_id: string; amount: number }>;
  }> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    if (!payload.patient_id) {
      throw new Error('Validation failure: Patient is required for payment.');
    }

    if (!payload.amount || payload.amount <= 0) {
      throw new Error('Validation failure: Payment amount must be strictly greater than 0.');
    }

    if (!payload.allocations || payload.allocations.length === 0) {
      throw new Error('Validation failure: Payment must be allocated to at least one invoice.');
    }

    // Verify allocation sum equals payment amount
    const totalAllocated = payload.allocations.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );
    const roundedTotalAllocated = Math.round(totalAllocated * 100) / 100;
    const roundedPaymentAmount = Math.round(Number(payload.amount) * 100) / 100;

    if (roundedTotalAllocated !== roundedPaymentAmount) {
      throw new Error(
        `Validation failure: Sum of allocations (${roundedTotalAllocated}) must equal payment amount (${roundedPaymentAmount}). Unallocated funds are rejected in V1.`
      );
    }

    // Generate idempotency key if not provided
    const idempotencyKey = payload.idempotency_key || crypto.randomUUID();

    const { data, error } = await supabase.rpc('record_payment_and_allocate', {
      p_practice_id: activePracticeId,
      p_patient_id: payload.patient_id,
      p_payment_date: payload.payment_date || new Date().toISOString().split('T')[0],
      p_amount: roundedPaymentAmount,
      p_currency: payload.currency || 'NGN',
      p_payment_method: payload.payment_method,
      p_reference_number: payload.reference_number || null,
      p_idempotency_key: idempotencyKey,
      p_notes: payload.notes || null,
      p_allocations: payload.allocations as any,
    });

    if (error) {
      throw error;
    }

    return data as unknown as {
      idempotent: boolean;
      payment_id: string;
      payment_number: string;
      status: string;
      amount: number;
      currency: string;
      receipt_id: string;
      receipt_number: string;
      allocations: Array<{ invoice_id: string; amount: number }>;
    };
  },

  /**
   * Voids a confirmed payment, reversing its allocations on invoices, restoring
   * invoice balances, voiding the linked receipt, and writing audit logs.
   */
  async voidPayment(
    payload: VoidPaymentPayload,
    practiceId?: string
  ): Promise<{
    success: boolean;
    payment_id: string;
    status: string;
    void_reason: string;
  }> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    if (!payload.payment_id) {
      throw new Error('Validation failure: payment_id is required.');
    }

    if (!payload.void_reason || payload.void_reason.trim().length < 5) {
      throw new Error('Validation failure: Voiding a payment requires a non-empty void_reason of at least 5 characters.');
    }

    const { data, error } = await supabase.rpc('void_payment', {
      p_practice_id: activePracticeId,
      p_payment_id: payload.payment_id,
      p_void_reason: payload.void_reason.trim(),
    });

    if (error) {
      throw error;
    }

    return data as unknown as {
      success: boolean;
      payment_id: string;
      status: string;
      void_reason: string;
    };
  },
};
