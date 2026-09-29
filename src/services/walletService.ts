// ==============================================================================
// PHYSENRA PATIENT WALLETS FOUNDATION V1 SERVICE LAYER
// File: src/services/walletService.ts
//
// Governs:
// 1. Authoritative Patient Wallet retrieval & lifecycle tracking
// 2. Strict append-only ledger retrieval with derived balance computation
// 3. Deposit to Wallet RPC invocation (deposit_to_wallet)
// 4. Overpayment Conversion RPC invocation (convert_overpayment_to_wallet)
// 5. Unified Invoice Settlement RPC invocation (settle_invoice_from_wallet)
// 6. Manual Balance Adjustment RPC invocation (adjust_wallet_balance)
// 7. Wallet Status Update RPC invocation (update_wallet_status)
// 8. Explicit PostgREST constraint hint disambiguation
// 9. Absolute domain firewall: Zero memberships, credit notes, gateways, refunds
// ==============================================================================

import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  PatientWalletWithBalance,
  PatientWalletLedgerEntryWithRelations,
  DepositToWalletPayload,
  ConvertOverpaymentPayload,
  SettleInvoiceFromWalletPayload,
  AdjustWalletBalancePayload,
  UpdateWalletStatusPayload,
  WalletFilters,
  WalletLedgerFilters,
} from '../types/models';

export const walletService = {
  // ----------------------------------------------------------------------------
  // 1. WALLET RETRIEVAL & QUERYING
  // ----------------------------------------------------------------------------

  /**
   * Retrieves patient wallets for the active practice with optional filtering and derived balance.
   */
  async getWallets(
    practiceId?: string,
    filters?: WalletFilters
  ): Promise<PatientWalletWithBalance[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    let query = supabase
      .from('patient_wallets')
      .select(`
        *,
        patient:patients!fk_wallets_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          email,
          phone
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

    const { data: wallets, error: walletsError } = await query;
    if (walletsError) {
      throw walletsError;
    }

    if (!wallets || wallets.length === 0) {
      return [];
    }

    // Fetch all ledger amounts for the practice to compute authoritative derived balance
    const walletIds = wallets.map((w) => w.id);
    const { data: ledgerRows, error: ledgerError } = await supabase
      .from('patient_wallet_ledger')
      .select('wallet_id, amount')
      .eq('practice_id', activePracticeId)
      .in('wallet_id', walletIds);

    if (ledgerError) {
      throw ledgerError;
    }

    // Sum balances per wallet
    const balanceMap = new Map<string, number>();
    for (const row of ledgerRows || []) {
      const current = balanceMap.get(row.wallet_id) || 0;
      balanceMap.set(row.wallet_id, Number((current + Number(row.amount || 0)).toFixed(2)));
    }

    let results: PatientWalletWithBalance[] = wallets.map((w) => ({
      ...w,
      balance: balanceMap.get(w.id) ?? 0,
    })) as unknown as PatientWalletWithBalance[];

    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      results = results.filter((w) => {
        const walletNumberMatch = w.wallet_number.toLowerCase().includes(q);
        const patientNameMatch = w.patient
          ? `${w.patient.first_name} ${w.patient.last_name}`.toLowerCase().includes(q)
          : false;
        const patientIdMatch = w.patient
          ? w.patient.patient_identifier.toLowerCase().includes(q)
          : false;
        return walletNumberMatch || patientNameMatch || patientIdMatch;
      });
    }

    return results;
  },

  /**
   * Retrieves a single patient wallet by ID with full derived balance and ledger history.
   */
  async getWalletById(
    walletId: string,
    practiceId?: string
  ): Promise<PatientWalletWithBalance> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data: wallet, error: walletError } = await supabase
      .from('patient_wallets')
      .select(`
        *,
        patient:patients!fk_wallets_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('id', walletId)
      .eq('practice_id', activePracticeId)
      .single();

    if (walletError) {
      throw walletError;
    }

    // Fetch full ledger history with explicit PostgREST constraint hints
    const { data: ledger, error: ledgerError } = await supabase
      .from('patient_wallet_ledger')
      .select(`
        *,
        payment:payments!fk_ledger_payment_practice (
          id,
          payment_number,
          payment_method,
          status,
          amount,
          payment_date
        ),
        invoice:invoices!fk_ledger_invoice_practice (
          id,
          invoice_number,
          status,
          grand_total,
          balance_due
        ),
        creator:profiles!fk_ledger_created_by (
          id,
          display_name,
          first_name,
          last_name
        )
      `)
      .eq('wallet_id', walletId)
      .eq('practice_id', activePracticeId)
      .order('created_at', { ascending: false });

    if (ledgerError) {
      throw ledgerError;
    }

    // Compute derived balance
    const totalBalance = (ledger || []).reduce(
      (sum, entry) => Number((sum + Number(entry.amount || 0)).toFixed(2)),
      0
    );

    return {
      ...wallet,
      balance: totalBalance,
      ledger_entries: ledger as unknown as PatientWalletLedgerEntryWithRelations[],
    } as unknown as PatientWalletWithBalance;
  },

  /**
   * Retrieves a wallet for a patient, or returns null if not yet provisioned.
   */
  async getWalletByPatientId(
    patientId: string,
    practiceId?: string
  ): Promise<PatientWalletWithBalance | null> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('patient_wallets')
      .select('id')
      .eq('patient_id', patientId)
      .eq('practice_id', activePracticeId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return this.getWalletById(data.id, activePracticeId);
  },

  /**
   * Provisions or retrieves an existing wallet for a patient via atomic RPC.
   */
  async getOrCreatePatientWallet(
    patientId: string,
    practiceId?: string,
    currency: string = 'NGN'
  ): Promise<PatientWalletWithBalance> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('get_or_create_patient_wallet', {
      p_practice_id: activePracticeId,
      p_patient_id: patientId,
      p_currency: currency,
    });

    if (error) {
      throw error;
    }

    const walletResult = data as { wallet_id: string };
    return this.getWalletById(walletResult.wallet_id, activePracticeId);
  },

  // ----------------------------------------------------------------------------
  // 2. ATOMIC RPC TRANSACTIONS
  // ----------------------------------------------------------------------------

  /**
   * Deposits funds into a patient wallet.
   * Creates a confirmed payment record, an issued receipt voucher, and an append-only ledger row.
   */
  async depositToWallet(
    payload: DepositToWalletPayload,
    practiceId?: string
  ): Promise<any> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('deposit_to_wallet', {
      p_practice_id: activePracticeId,
      p_patient_id: payload.patient_id,
      p_amount: payload.amount,
      p_payment_method: payload.payment_method,
      p_reference_number: payload.reference_number || null,
      p_idempotency_key: payload.idempotency_key || null,
      p_notes: payload.notes || null,
    });

    if (error) {
      throw error;
    }

    return data;
  },

  /**
   * Converts an unallocated overpayment surplus on an existing payment into wallet credit.
   */
  async convertOverpaymentToWallet(
    payload: ConvertOverpaymentPayload,
    practiceId?: string
  ): Promise<any> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('convert_overpayment_to_wallet', {
      p_practice_id: activePracticeId,
      p_payment_id: payload.payment_id,
      p_amount: payload.amount,
      p_idempotency_key: payload.idempotency_key || null,
      p_notes: payload.notes || null,
    });

    if (error) {
      throw error;
    }

    return data;
  },

  /**
   * Settles an invoice balance due using credit from the patient's wallet.
   * Atomically locks both wallet and invoice, creates an authoritative payment and receipt,
   * appends a negative invoice_settlement ledger entry, and updates invoice amounts.
   */
  async settleInvoiceFromWallet(
    payload: SettleInvoiceFromWalletPayload,
    practiceId?: string
  ): Promise<any> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('settle_invoice_from_wallet', {
      p_practice_id: activePracticeId,
      p_wallet_id: payload.wallet_id,
      p_invoice_id: payload.invoice_id,
      p_amount: payload.amount,
      p_idempotency_key: payload.idempotency_key || null,
      p_notes: payload.notes || null,
    });

    if (error) {
      throw error;
    }

    return data;
  },

  /**
   * Adjusts a wallet balance manually (e.g., promotional credit, goodwill credit, administrative debit).
   * Holds row lock, strictly enforces balance >= 0, and records immutable audit trail.
   */
  async adjustWalletBalance(
    payload: AdjustWalletBalancePayload,
    practiceId?: string
  ): Promise<any> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('adjust_wallet_balance', {
      p_practice_id: activePracticeId,
      p_wallet_id: payload.wallet_id,
      p_amount: payload.amount,
      p_reason: payload.reason,
      p_idempotency_key: payload.idempotency_key || null,
    });

    if (error) {
      throw error;
    }

    return data;
  },

  /**
   * Updates wallet lifecycle status (e.g. suspend or close).
   */
  async updateWalletStatus(
    payload: UpdateWalletStatusPayload,
    practiceId?: string
  ): Promise<any> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('update_wallet_status', {
      p_practice_id: activePracticeId,
      p_wallet_id: payload.wallet_id,
      p_status: payload.status,
      p_reason: payload.reason,
    });

    if (error) {
      throw error;
    }

    return data;
  },

  /**
   * Retrieves ledger transactions for a wallet or practice with optional entry type filtering.
   */
  async getWalletLedger(
    walletId: string,
    practiceId?: string,
    filters?: WalletLedgerFilters
  ): Promise<PatientWalletLedgerEntryWithRelations[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    let query = supabase
      .from('patient_wallet_ledger')
      .select(`
        *,
        payment:payments!fk_ledger_payment_practice (
          id,
          payment_number,
          payment_method,
          status,
          amount,
          payment_date
        ),
        invoice:invoices!fk_ledger_invoice_practice (
          id,
          invoice_number,
          status,
          grand_total,
          balance_due
        ),
        creator:profiles!fk_ledger_created_by (
          id,
          display_name,
          first_name,
          last_name
        )
      `)
      .eq('wallet_id', walletId)
      .eq('practice_id', activePracticeId)
      .order('created_at', { ascending: false });

    if (filters?.entryType && filters.entryType !== 'all') {
      query = query.eq('entry_type', filters.entryType);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return (data || []) as unknown as PatientWalletLedgerEntryWithRelations[];
  },
};
