// ==============================================================================
// PHYSENRA SAAS — SALES REPRESENTATIVE PORTAL SERVICE
// File: src/services/salesRepPortalService.ts
//
// Governs:
// 1. Scoped self-service data access for authenticated sales representatives
// 2. Pre-masked banking view RPC invocation (zero raw NUBAN exposure)
// 3. Referral tracking and commission maturation inspection
// ==============================================================================

import { supabase as rawSupabase } from '../lib/supabase';

const db: any = rawSupabase;

export interface RepProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  state_region: string;
  status: 'active' | 'suspended' | 'terminated' | 'completed';
  commission_rate_bps: number;
  pilot_start_date: string;
  pilot_end_date: string;
  referral_code: string | null;
}

export interface MaskedBankingProfile {
  bank_name: string;
  bank_code: string;
  masked_account_number: string;
  account_name: string;
  is_verified: boolean;
}

export const salesRepPortalService = {
  /**
   * Fetches the authenticated representative's profile.
   */
  async getMyProfile(): Promise<RepProfile | null> {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return null;

    const { data: rep, error } = await db
      .from('sales_representatives')
      .select(`
        *,
        codes:sales_referral_codes(code, is_active)
      `)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !rep) return null;

    const activeCode = rep.codes?.find((c: any) => c.is_active)?.code || rep.codes?.[0]?.code || null;

    return {
      ...rep,
      referral_code: activeCode,
    };
  },

  /**
   * Invokes authoritative database RPC returning pre-masked banking strings.
   * Zero raw banking credentials transmitted over this route.
   */
  async getMyBanking(): Promise<MaskedBankingProfile | null> {
    const { data, error } = await db.rpc('get_my_banking_profile');
    if (error) throw new Error(`Failed to load banking profile: ${error.message}`);
    return data?.[0] || null;
  },

  /**
   * Fetches practices referred by this representative.
   */
  async getMyReferrals() {
    const { data, error } = await db
      .from('sales_referrals')
      .select(`
        id,
        status,
        attributed_at,
        qualified_at,
        practice:practices(name, slug)
      `)
      .order('attributed_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch referrals: ${error.message}`);
    return data || [];
  },

  /**
   * Fetches commissions earned by this representative.
   */
  async getMyCommissions() {
    const { data, error } = await db
      .from('sales_commissions')
      .select(`
        id,
        gross_amount_cents,
        net_eligible_cents,
        commission_rate_bps,
        original_commission_cents,
        current_status,
        holding_expires_at,
        is_payout_frozen,
        created_at,
        referral:sales_referrals(practice:practices(name, slug))
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch commissions: ${error.message}`);
    return data || [];
  },

  /**
   * Fetches payouts disbursed to this representative.
   */
  async getMyPayouts() {
    const { data, error } = await db
      .from('sales_commission_payouts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch payouts: ${error.message}`);
    return data || [];
  },
};
