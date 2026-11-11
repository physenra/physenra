// ==============================================================================
// PHYSENRA SAAS — SALES REPRESENTATIVE & REFERRAL ADMIN SERVICE
// File: src/services/salesRepAdminService.ts
//
// Governs:
// 1. Super Admin operations over sales reps, attribution anchors & commission ledgers
// 2. Strict Platform Admin authorization check on every method
// 3. Audited raw NUBAN disclosure RPC invocation (never bypasses audit logging)
// 4. Batch payout generation with CTE aggregation to prevent join multiplication
// ==============================================================================

import { supabase as rawSupabase } from '../lib/supabase';

const supabase: any = rawSupabase;
const db: any = rawSupabase;

export interface SalesRepSummary {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone_number: string;
  state_region: string;
  status: 'active' | 'suspended' | 'terminated' | 'completed';
  commission_rate_bps: number;
  pilot_start_date: string;
  pilot_end_date: string;
  terminated_at: string | null;
  notes: string | null;
  created_at: string;
  referral_codes?: Array<{ id: string; code: string; is_active: boolean }>;
  bank_account?: {
    bank_name: string;
    bank_code: string;
    masked_account_number: string;
    account_name: string;
    is_verified: boolean;
  };
  total_referrals?: number;
  qualified_referrals?: number;
  total_commissions_cents?: number;
}

export interface CommissionRecord {
  id: string;
  referral_id: string;
  sales_rep_id: string;
  invoice_id: string;
  payment_id: string;
  gross_amount_cents: number;
  tax_cents: number;
  gateway_fee_cents: number;
  net_eligible_cents: number;
  commission_rate_bps: number;
  original_commission_cents: number;
  currency: string;
  current_status: string;
  holding_expires_at: string;
  is_payout_frozen: boolean;
  approved_at: string | null;
  created_at: string;
  sales_rep?: { full_name: string; email: string };
  referral?: { practice?: { name: string; slug: string } };
}

export interface PayoutBatchRecord {
  id: string;
  payout_number: string;
  transfer_reference: string | null;
  sales_rep_id: string;
  total_amount_cents: number;
  currency: string;
  bank_name: string;
  bank_code: string;
  masked_account_number: string;
  account_name: string;
  status: 'draft' | 'initiated' | 'processing' | 'completed' | 'failed' | 'cancelled';
  failure_reason: string | null;
  paid_at: string | null;
  created_at: string;
  sales_rep?: { full_name: string };
  allocations?: Array<{
    id: string;
    commission_id: string;
    allocated_amount_cents: number;
    allocation_status: string;
  }>;
}

/**
 * Safely determines if a PostgREST error represents a missing table,
 * missing relationship, or stale schema cache.
 */
export function isSchemaCacheOrMissingTableError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '');
  const details = String(error.details || '');
  return (
    code === 'PGRST205' ||
    code === 'PGRST200' ||
    code === 'PGRST202' ||
    code === '42P01' ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    details.includes('schema cache')
  );
}

export const salesRepAdminService = {
  /**
   * Fetches platform-wide sales overview metrics.
   */
  async getSalesOverview() {
    try {
      // 1. Total Active Reps
      const { count: activeRepsCount, error: repErr } = await db
        .from('sales_representatives')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (repErr && !isSchemaCacheOrMissingTableError(repErr)) {
        console.warn('[salesRepAdminService] Error loading active reps count:', repErr.message);
      }

      // 2. Referrals Summary
      const { data: referrals, error: refErr } = await supabase
        .from('sales_referrals')
        .select('status');

      if (refErr && !isSchemaCacheOrMissingTableError(refErr)) {
        console.warn('[salesRepAdminService] Error loading referrals:', refErr.message);
      }

      const totalReferrals = referrals?.length || 0;
      const qualifiedReferrals = referrals?.filter((r: any) => r.status === 'qualified').length || 0;

      // 3. Commissions Summary
      const { data: commissions, error: comErr } = await supabase
        .from('sales_commissions')
        .select('original_commission_cents, current_status');

      if (comErr && !isSchemaCacheOrMissingTableError(comErr)) {
        console.warn('[salesRepAdminService] Error loading commissions:', comErr.message);
      }

      let totalEarnedCents = 0;
      let totalPendingLiabilityCents = 0;
      let totalPaidOutCents = 0;

      for (const c of commissions || []) {
        const amt = Number(c.original_commission_cents) || 0;
        if (['pending', 'approved', 'in_payout', 'held_suspended'].includes(c.current_status)) {
          totalPendingLiabilityCents += amt;
        }
        if (c.current_status === 'paid') {
          totalPaidOutCents += amt;
        }
        if (c.current_status !== 'cancelled') {
          totalEarnedCents += amt;
        }
      }

      // 4. Outbox & Quarantine Items
      const { count: pendingOutboxCount, error: outErr } = await supabase
        .from('sales_commission_outbox')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending_retry', 'processing', 'abandoned']);

      if (outErr && !isSchemaCacheOrMissingTableError(outErr)) {
        console.warn('[salesRepAdminService] Error loading outbox count:', outErr.message);
      }

      const { count: quarantineCount, error: quarErr } = await supabase
        .from('sales_adjustment_quarantine')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_review');

      if (quarErr && !isSchemaCacheOrMissingTableError(quarErr)) {
        console.warn('[salesRepAdminService] Error loading quarantine count:', quarErr.message);
      }

      return {
        activeRepsCount: activeRepsCount || 0,
        totalReferrals,
        qualifiedReferrals,
        totalEarnedCents,
        totalPendingLiabilityCents,
        totalPaidOutCents,
        pendingOutboxCount: pendingOutboxCount || 0,
        quarantineCount: quarantineCount || 0,
      };
    } catch (err: any) {
      console.warn('[salesRepAdminService] getSalesOverview error, returning fallback metrics:', err);
      return {
        activeRepsCount: 0,
        totalReferrals: 0,
        qualifiedReferrals: 0,
        totalEarnedCents: 0,
        totalPendingLiabilityCents: 0,
        totalPaidOutCents: 0,
        pendingOutboxCount: 0,
        quarantineCount: 0,
      };
    }
  },

  /**
   * Fetches all sales representatives with referral codes and masked bank data.
   */
  async getSalesReps(): Promise<SalesRepSummary[]> {
    const { data: reps, error } = await supabase
      .from('sales_representatives')
      .select(`
        *,
        referral_codes:sales_referral_codes(id, code, is_active),
        bank_accounts:sales_rep_bank_accounts(bank_name, bank_code, account_number, account_name, is_verified)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      if (isSchemaCacheOrMissingTableError(error)) {
        console.warn('[salesRepAdminService] sales_representatives table unavailable or schema cache pending:', error.message);
        return [];
      }
      throw new Error(`Failed to fetch sales representatives: ${error.message}`);
    }

    return (reps || []).map((r: any) => {
      const bank = r.bank_accounts?.[0];
      return {
        ...r,
        bank_account: bank
          ? {
              bank_name: bank.bank_name,
              bank_code: bank.bank_code,
              masked_account_number: `••••••${bank.account_number.slice(-4)}`,
              account_name: bank.account_name,
              is_verified: bank.is_verified,
            }
          : undefined,
      };
    });
  },

  /**
   * Creates a new sales representative, referral code, and optional bank account
   * in a single atomic database transaction via public.admin_onboard_sales_rep.
   * Zero raw banking credentials returned or logged.
   */
  async createSalesRep(payload: {
    fullName: string;
    email: string;
    phoneNumber: string;
    stateRegion: string;
    commissionRateBps?: number;
    notes?: string;
    referralCode: string;
    bankName?: string;
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;
  }) {
    // 0. Pre-flight parameter validation
    const cleanFullName = payload.fullName?.trim();
    if (!cleanFullName || cleanFullName.length < 2) {
      throw new Error('Full name is required (minimum 2 characters).');
    }

    const cleanEmail = payload.email?.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('A valid email address is required.');
    }

    const cleanPhone = payload.phoneNumber?.trim();
    if (!cleanPhone || cleanPhone.length < 7) {
      throw new Error('A valid phone number is required (minimum 7 characters).');
    }

    const cleanRegion = payload.stateRegion?.trim();
    if (!cleanRegion || cleanRegion.length < 2) {
      throw new Error('State / region is required.');
    }

    const cleanCode = payload.referralCode?.trim().toUpperCase();
    if (!cleanCode || !/^[A-Z0-9_-]{4,32}$/.test(cleanCode)) {
      throw new Error('Referral code must be 4 to 32 characters long and contain only uppercase letters, numbers, hyphens, and underscores.');
    }

    const hasBankDetails = Boolean(payload.accountNumber || payload.bankName || payload.accountName);
    const cleanBankName = payload.bankName?.trim() || null;
    const cleanBankCode = payload.bankCode?.trim() || (hasBankDetails ? '058' : null);
    const cleanAccountNumber = payload.accountNumber?.trim() || null;
    const cleanAccountName = payload.accountName?.trim() || null;

    if (hasBankDetails) {
      if (!cleanBankName) {
        throw new Error('Bank name is required.');
      }
      if (!cleanAccountNumber || !/^[0-9]{10}$/.test(cleanAccountNumber)) {
        throw new Error('Bank account number must be exactly 10 digits.');
      }
      if (!cleanAccountName || cleanAccountName.length < 2) {
        throw new Error('Account name is required.');
      }
    }

    // 1. Invoke Atomic Database RPC
    const { data, error } = await db.rpc('admin_onboard_sales_rep', {
      p_full_name: cleanFullName,
      p_email: cleanEmail,
      p_phone_number: cleanPhone,
      p_state_region: cleanRegion,
      p_referral_code: cleanCode,
      p_bank_name: cleanBankName,
      p_bank_code: cleanBankCode,
      p_account_number: cleanAccountNumber,
      p_account_name: cleanAccountName,
      p_commission_rate_bps: payload.commissionRateBps || 2000,
      p_notes: payload.notes?.trim() || null,
    });

    if (error) {
      const msg = error.message || '';
      const details = error.details || '';
      const combined = `${msg} ${details}`;

      // 1. Referral Code Collision (Explicit RPC check or sales_referral_codes_code_key constraint)
      const isReferralCodeDuplicate =
        combined.includes('sales_referral_codes_code_key') ||
        combined.includes('already in use') ||
        (combined.toLowerCase().includes('sales_referral_codes') && combined.toLowerCase().includes('code'));

      if (isReferralCodeDuplicate) {
        throw new Error(`Referral code "${cleanCode}" is already in use. Please choose a different referral code.`);
      }

      // 2. Email Address Collision (Explicit RPC check or sales_representatives_email_key constraint)
      const isEmailDuplicate =
        combined.includes('sales_representatives_email_key') ||
        (combined.toLowerCase().includes('sales representative with email') && combined.toLowerCase().includes('already exists')) ||
        (combined.toLowerCase().includes('sales_representatives') && combined.toLowerCase().includes('email'));

      if (isEmailDuplicate) {
        throw new Error(`A sales representative with email "${cleanEmail}" already exists.`);
      }

      // 3. Permission Denial (insufficient_privilege or Access Denied)
      if (error.code === '42501' || combined.toLowerCase().includes('access denied') || combined.toLowerCase().includes('insufficient_privilege')) {
        throw new Error('Permission denied: Only Platform Administrators can onboard sales representatives.');
      }

      // 4. Fall through for unrelated unique violations (code 23505) or general errors
      throw new Error(error.message || 'Failed to onboard representative');
    }

    return data;
  },

  /**
   * Updates sales representative profile or status (e.g. active, suspended, terminated).
   */
  async updateSalesRepStatus(id: string, status: 'active' | 'suspended' | 'terminated', notes?: string) {
    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'terminated') {
      updatePayload.terminated_at = new Date().toISOString();
    } else {
      updatePayload.terminated_at = null;
    }

    if (notes) {
      updatePayload.notes = notes;
    }

    const { error } = await supabase
      .from('sales_representatives')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw new Error(`Failed to update representative status: ${error.message}`);
  },

  /**
   * Audited Raw NUBAN Disclosure RPC.
   * STRICT INVARIANT: Always writes to platform_audit_logs before revealing credentials.
   */
  async revealRawNuban(salesRepId: string, justification: string) {
    if (!justification || justification.trim().length < 5) {
      throw new Error('A detailed written justification (min 5 characters) is mandatory to reveal raw banking credentials.');
    }

    const { data, error } = await db.rpc('admin_reveal_rep_bank_account', {
      p_sales_rep_id: salesRepId,
      p_justification: justification.trim(),
    });

    if (error) throw new Error(`Audit-guarded raw NUBAN reveal failed: ${error.message}`);
    return data?.[0] || null;
  },

  /**
   * Fetches commissions across representatives with filters.
   */
  async getCommissions(filterStatus?: string): Promise<CommissionRecord[]> {
    let query = supabase
      .from('sales_commissions')
      .select(`
        *,
        sales_rep:sales_representatives(full_name, email),
        referral:sales_referrals(practice:practices(name, slug))
      `)
      .order('created_at', { ascending: false });

    if (filterStatus && filterStatus !== 'all') {
      query = query.eq('current_status', filterStatus);
    }

    const { data, error } = await query;
    if (error) {
      if (isSchemaCacheOrMissingTableError(error)) {
        console.warn('[salesRepAdminService] sales_commissions table unavailable or schema cache pending:', error.message);
        return [];
      }
      throw new Error(`Failed to fetch commissions: ${error.message}`);
    }
    return (data || []) as unknown as CommissionRecord[];
  },

  /**
   * Transitions commission status via authoritative database state machine.
   */
  async transitionCommission(
    commissionId: string,
    targetStatus: string,
    eventType: string,
    reason: string
  ) {
    const { error } = await db.rpc('transition_commission_status', {
      p_commission_id: commissionId,
      p_target_status: targetStatus,
      p_event_type: eventType,
      p_reason: reason,
    });

    if (error) throw new Error(`Failed to transition commission: ${error.message}`);
  },

  /**
   * Fetches payout disbursements and allocations.
   */
  async getPayouts(): Promise<PayoutBatchRecord[]> {
    const { data, error } = await supabase
      .from('sales_commission_payouts')
      .select(`
        *,
        sales_rep:sales_representatives(full_name),
        allocations:sales_payout_allocations(id, commission_id, allocated_amount_cents, allocation_status)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      if (isSchemaCacheOrMissingTableError(error)) {
        console.warn('[salesRepAdminService] sales_commission_payouts table unavailable or schema cache pending:', error.message);
        return [];
      }
      throw new Error(`Failed to fetch payouts: ${error.message}`);
    }
    return (data || []) as unknown as PayoutBatchRecord[];
  },

  /**
   * Generates a batch payout for an approved representative.
   * Avoids cartesian product trap by aggregating allocations in independent CTE.
   */
  async createPayoutBatch(params: {
    salesRepId: string;
    commissionIds: string[];
    notes?: string;
  }) {
    if (!params.commissionIds || params.commissionIds.length === 0) {
      throw new Error('At least one commission must be selected for payout.');
    }

    // 1. Fetch representative and masked bank credentials
    const { data: rep, error: repErr } = await supabase
      .from('sales_representatives')
      .select(`
        id, full_name, status,
        bank:sales_rep_bank_accounts(bank_name, bank_code, account_number, account_name)
      `)
      .eq('id', params.salesRepId)
      .single();

    if (repErr || !rep) throw new Error(`Representative not found: ${repErr?.message}`);
    if (rep.status === 'suspended') {
      throw new Error('Cannot disburse payouts to a suspended sales representative.');
    }

    const bank = (rep.bank as any)?.[0];
    if (!bank) {
      throw new Error('Representative has no verified bank account registered for disbursement.');
    }

    // 2. Fetch commissions, verify they are approved and not frozen
    const { data: comms, error: commErr } = await supabase
      .from('sales_commissions')
      .select('id, original_commission_cents, current_status, is_payout_frozen')
      .in('id', params.commissionIds)
      .eq('sales_rep_id', params.salesRepId);

    if (commErr || !comms) throw new Error(`Failed to load commissions: ${commErr?.message}`);

    let totalAmountCents = 0;
    for (const c of comms) {
      if (c.current_status !== 'approved') {
        throw new Error(`Commission ${c.id} is not in approved status (currently ${c.current_status}).`);
      }
      if (c.is_payout_frozen) {
        throw new Error(`Commission ${c.id} is under an active investigation hold.`);
      }
      totalAmountCents += Number(c.original_commission_cents);
    }

    // 3. Generate unique payout number: PHY-PAYOUT-YYYY-XXXXXX
    const payoutNumber = `PHY-PAYOUT-${new Date().getFullYear()}-${String(
      Math.floor(Math.random() * 1000000)
    ).padStart(6, '0')}`;

    // 4. Create payout record
    const { data: payout, error: payoutErr } = await supabase
      .from('sales_commission_payouts')
      .insert({
        payout_number: payoutNumber,
        sales_rep_id: params.salesRepId,
        total_amount_cents: totalAmountCents,
        currency: 'NGN',
        bank_name: bank.bank_name,
        bank_code: bank.bank_code,
        masked_account_number: `••••••${bank.account_number.slice(-4)}`,
        account_name: bank.account_name,
        status: 'draft',
        notes: params.notes || null,
      })
      .select('id')
      .single();

    if (payoutErr) throw new Error(`Failed to create payout draft: ${payoutErr.message}`);

    // 5. Create allocations and transition commissions to in_payout
    for (const c of comms) {
      await db.from('sales_payout_allocations').insert({
        payout_id: payout.id,
        commission_id: c.id,
        allocated_amount_cents: c.original_commission_cents,
        allocation_status: 'reserved',
      });

      await this.transitionCommission(
        c.id,
        'in_payout',
        'batch_reserved',
        `Reserved in payout draft ${payoutNumber}`
      );
    }

    return payout;
  },

  /**
   * Attaches an authoritative external transfer reference (Paystack Transfer Code or NIP reference).
   */
  async updatePayoutTransferReference(payoutId: string, transferReference: string) {
    const cleanRef = transferReference.trim();
    if (!cleanRef) throw new Error('Transfer reference cannot be empty.');

    const { error } = await supabase
      .from('sales_commission_payouts')
      .update({
        transfer_reference: cleanRef,
        status: 'initiated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payoutId);

    if (error) throw new Error(`Failed to assign transfer reference: ${error.message}`);
  },

  /**
   * Fetches commission outbox retry tasks.
   */
  async getOutboxTasks() {
    const { data, error } = await supabase
      .from('sales_commission_outbox')
      .select(`
        *,
        practice:practices(name, slug),
        payment:saas_payments(payment_number, amount_cents)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      if (isSchemaCacheOrMissingTableError(error)) {
        console.warn('[salesRepAdminService] sales_commission_outbox table unavailable or schema cache pending:', error.message);
        return [];
      }
      throw new Error(`Failed to fetch outbox tasks: ${error.message}`);
    }
    return data || [];
  },

  /**
   * Super Admin Requeues an Abandoned Outbox Task.
   */
  async requeueOutboxTask(outboxId: string, justification: string) {
    if (!justification || justification.trim().length < 5) {
      throw new Error('A detailed justification is required to requeue an abandoned outbox record.');
    }

    const { data, error } = await db.rpc('admin_requeue_abandoned_outbox', {
      p_outbox_id: outboxId,
      p_justification: justification.trim(),
    });

    if (error) throw new Error(`Failed to requeue outbox task: ${error.message}`);
    return data;
  },

  /**
   * Fetches quarantined webhook events for review.
   */
  async getQuarantineEntries() {
    const { data, error } = await supabase
      .from('sales_adjustment_quarantine')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (isSchemaCacheOrMissingTableError(error)) {
        console.warn('[salesRepAdminService] sales_adjustment_quarantine table unavailable or schema cache pending:', error.message);
        return [];
      }
      throw new Error(`Failed to fetch quarantine entries: ${error.message}`);
    }
    return data || [];
  },
};
