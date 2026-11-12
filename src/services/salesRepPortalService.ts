// ==============================================================================
// PHYSENRA SAAS — SALES REPRESENTATIVE PORTAL SERVICE
// File: src/services/salesRepPortalService.ts
//
// Governs:
// 1. Free-access independent representative portal context & status enforcement
// 2. Scoped self-service RPC calls derived strictly from authenticated auth.uid()
// 3. Authoritative referral URL generation & sharing helpers
// 4. Commission ledger + adjustments inspection with settlement status awareness
// 5. Verified profile updates, email change verification & password management
// ==============================================================================

import { supabase as rawSupabase } from '../lib/supabase';
import { getAuthRedirectUrl } from '../lib/authRedirect';

const db: any = rawSupabase;

export interface RepProfile {
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
  referral_code: string | null;
}

export interface PortalMetrics {
  total_referrals: number;
  pending_referrals: number;
  attributed_registrations: number;
  qualified_conversions: number;
  commission_earned_cents: number;
  pending_commission_cents: number;
  approved_commission_cents: number;
  paid_commission_cents: number;
}

export interface SalesPortalContext {
  is_sales_rep: boolean;
  has_portal_access: boolean;
  free_partner_access?: boolean;
  status?: RepProfile['status'];
  full_name?: string;
  commission_settlement_enabled: boolean;
  profile: RepProfile | null;
  metrics: PortalMetrics;
}

export interface MaskedBankingProfile {
  bank_name: string;
  bank_code: string;
  masked_account_number: string;
  account_name: string;
  is_verified: boolean;
}

export interface RepReferralItem {
  id: string;
  practice_name: string;
  practice_slug: string | null;
  attribution_type: string;
  status: 'attributed' | 'qualified' | 'disqualified' | 'expired';
  disqualification_reason: string | null;
  subscription_status: string | null;
  attributed_at: string;
  qualified_at: string | null;
}

export interface RepCommissionAdjustment {
  id: string;
  adjustment_type: string;
  delta_amount_cents: number;
  reason: string;
  created_at: string;
}

export interface RepCommissionItem {
  id: string;
  practice_name: string;
  practice_slug: string | null;
  gross_amount_cents: number;
  net_eligible_cents: number;
  commission_rate_bps: number;
  original_commission_cents: number;
  current_status: string;
  holding_expires_at: string;
  is_payout_frozen: boolean;
  approved_at: string | null;
  created_at: string;
  adjustments: RepCommissionAdjustment[];
}

const EMPTY_METRICS: PortalMetrics = {
  total_referrals: 0,
  pending_referrals: 0,
  attributed_registrations: 0,
  qualified_conversions: 0,
  commission_earned_cents: 0,
  pending_commission_cents: 0,
  approved_commission_cents: 0,
  paid_commission_cents: 0,
};

function isMissingRpcError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return code === 'PGRST202' || msg.includes('could not find the function') || msg.includes('does not exist');
}

export function buildReferralShareUrls(referralCode: string | null | undefined, customOrigin?: string) {
  const cleanCode = (referralCode || '').trim().toUpperCase();
  if (!cleanCode) {
    return {
      referralLink: '',
      whatsappUrl: '',
      emailUrl: '',
    };
  }

  const origin =
    customOrigin ||
    (typeof window !== 'undefined' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(window.location.origin)
      ? window.location.origin
      : 'https://physenra.com');

  const referralLink = `${origin}/register-practice?ref=${encodeURIComponent(cleanCode)}`;
  const shareText = `Join Physenra EMR & Practice Management for Physiotherapy Clinics in Nigeria using my partner referral link (${cleanCode}): ${referralLink}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent('Register Your Physiotherapy Clinic on Physenra')}&body=${encodeURIComponent(shareText)}`;

  return {
    referralLink,
    whatsappUrl,
    emailUrl,
  };
}

export const salesRepPortalService = {
  /**
   * Binds an authenticated verified email user to a matching unlinked representative record,
   * or syncs verified email updates cleanly.
   */
  async claimVerifiedAccount(): Promise<{ claimed: boolean; status?: string; reason?: string }> {
    const { data, error } = await db.rpc('claim_verified_sales_rep_account');
    if (error) {
      if (isMissingRpcError(error)) {
        return { claimed: false, reason: 'rpc_pending' };
      }
      throw new Error(error.message || 'Failed to activate representative account');
    }
    return data || { claimed: false };
  },

  /**
   * Fetches complete portal authorization context, free partner access status,
   * commission settlement activation state, profile, and authoritative metrics.
   */
  async getMyPortalContext(): Promise<SalesPortalContext> {
    const { data: { user } } = await db.auth.getUser();
    if (!user) {
      return {
        is_sales_rep: false,
        has_portal_access: false,
        commission_settlement_enabled: false,
        profile: null,
        metrics: { ...EMPTY_METRICS },
      };
    }

    const { data: rpcData, error: rpcErr } = await db.rpc('get_my_sales_portal_context');
    if (!rpcErr && rpcData) {
      return {
        is_sales_rep: Boolean(rpcData.is_sales_rep),
        has_portal_access: Boolean(rpcData.has_portal_access),
        free_partner_access: Boolean(rpcData.free_partner_access),
        status: rpcData.status || rpcData.profile?.status,
        full_name: rpcData.full_name || rpcData.profile?.full_name,
        commission_settlement_enabled: Boolean(rpcData.commission_settlement_enabled),
        profile: rpcData.profile || null,
        metrics: {
          ...EMPTY_METRICS,
          ...(rpcData.metrics || {}),
        },
      };
    }

    if (rpcErr && !isMissingRpcError(rpcErr)) {
      throw new Error(`Failed to resolve portal authorization: ${rpcErr.message}`);
    }

    // Legacy fallback when only Migration 40 + 42 are present on target database
    const { data: rep, error: repErr } = await db
      .from('sales_representatives')
      .select(`
        *,
        codes:sales_referral_codes(code, is_active)
      `)
      .eq('user_id', user.id)
      .maybeSingle();

    if (repErr || !rep) {
      return {
        is_sales_rep: false,
        has_portal_access: false,
        commission_settlement_enabled: false,
        profile: null,
        metrics: { ...EMPTY_METRICS },
      };
    }

    if (rep.status !== 'active') {
      return {
        is_sales_rep: true,
        has_portal_access: false,
        status: rep.status,
        full_name: rep.full_name,
        commission_settlement_enabled: false,
        profile: null,
        metrics: { ...EMPTY_METRICS },
      };
    }

    const activeCode = rep.codes?.find((c: any) => c.is_active)?.code || rep.codes?.[0]?.code || null;

    return {
      is_sales_rep: true,
      has_portal_access: true,
      free_partner_access: true,
      status: rep.status,
      full_name: rep.full_name,
      commission_settlement_enabled: false,
      profile: {
        ...rep,
        referral_code: activeCode,
      },
      metrics: { ...EMPTY_METRICS },
    };
  },

  /**
   * Fetches the authenticated active representative's profile.
   */
  async getMyProfile(): Promise<RepProfile | null> {
    const context = await this.getMyPortalContext();
    return context.has_portal_access ? context.profile : null;
  },

  /**
   * Invokes authoritative database RPC returning pre-masked banking strings.
   */
  async getMyBanking(): Promise<MaskedBankingProfile | null> {
    const { data, error } = await db.rpc('get_my_banking_profile');
    if (error) {
      if (isMissingRpcError(error)) return null;
      throw new Error(`Failed to load banking profile: ${error.message}`);
    }
    return data?.[0] || null;
  },

  /**
   * Fetches practices referred by this active representative (zero clinical PHI).
   */
  async getMyReferrals(): Promise<RepReferralItem[]> {
    const { data, error } = await db.rpc('get_my_rep_referrals');
    if (!error && Array.isArray(data)) {
      return data as RepReferralItem[];
    }

    if (error && !isMissingRpcError(error)) {
      throw new Error(`Failed to fetch referrals: ${error.message}`);
    }

    const { data: rows, error: tableErr } = await db
      .from('sales_referrals')
      .select('id, attribution_type, status, disqualification_reason, attributed_at, qualified_at')
      .order('attributed_at', { ascending: false });

    if (tableErr) throw new Error(`Failed to fetch referrals: ${tableErr.message}`);
    return (rows || []).map((r: any) => ({
      id: r.id,
      practice_name: 'Referred Physiotherapy Practice',
      practice_slug: null,
      attribution_type: r.attribution_type || 'code_link',
      status: r.status,
      disqualification_reason: r.disqualification_reason || null,
      subscription_status: r.status === 'qualified' ? 'active' : 'trialing',
      attributed_at: r.attributed_at,
      qualified_at: r.qualified_at,
    }));
  },

  /**
   * Fetches commissions and adjustment ledger records earned by this active representative.
   */
  async getMyCommissions(): Promise<RepCommissionItem[]> {
    const { data, error } = await db.rpc('get_my_rep_commissions');
    if (!error && Array.isArray(data)) {
      return (data as any[]).map((row) => ({
        ...row,
        adjustments: Array.isArray(row.adjustments) ? row.adjustments : [],
      }));
    }

    if (error && !isMissingRpcError(error)) {
      throw new Error(`Failed to fetch commissions: ${error.message}`);
    }

    const { data: rows, error: tableErr } = await db
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
        approved_at,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (tableErr) throw new Error(`Failed to fetch commissions: ${tableErr.message}`);
    return (rows || []).map((c: any) => ({
      ...c,
      practice_name: 'Referred Practice',
      practice_slug: null,
      adjustments: [],
    }));
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

  /**
   * Updates strictly permitted contact fields (full_name, phone_number, state_region)
   * through authoritative SECURITY DEFINER RPC. Cannot alter status, rate, or referral code.
   */
  async updateMyProfile(payload: { fullName: string; phoneNumber: string; stateRegion: string }) {
    const fullName = payload.fullName.trim();
    const phoneNumber = payload.phoneNumber.trim();
    const stateRegion = payload.stateRegion.trim();

    if (fullName.length < 2) {
      throw new Error('Full name must be at least 2 characters.');
    }
    if (phoneNumber.length < 7) {
      throw new Error('Phone number must be at least 7 characters.');
    }
    if (stateRegion.length < 2) {
      throw new Error('State or region must be at least 2 characters.');
    }

    const { data, error } = await db.rpc('update_my_rep_profile', {
      p_full_name: fullName,
      p_phone_number: phoneNumber,
      p_state_region: stateRegion,
    });

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
    return data;
  },

  /**
   * Requests a verified email address change via Supabase Auth email confirmation.
   */
  async requestEmailChange(newEmail: string) {
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    const emailRedirectTo = getAuthRedirectUrl('/sales-portal/profile');
    const { error } = await db.auth.updateUser({ email: cleanEmail }, { emailRedirectTo });
    if (error) {
      throw new Error(error.message || 'Failed to initiate email verification');
    }
    return {
      verificationSent: true,
      pendingEmail: cleanEmail,
    };
  },

  /**
   * Updates the representative's own authentication password via Supabase Auth.
   */
  async updateMyPassword(newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const { error } = await db.auth.updateUser({ password: newPassword });
    if (error) {
      throw new Error(error.message || 'Failed to update password');
    }
    return { updated: true };
  },
};
