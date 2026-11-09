// ==============================================================================
// PHYSENRA SAAS — SALES REPRESENTATIVE PORTAL DASHBOARD
// File: src/pages/rep/RepDashboardPage.tsx
// Route: /rep/dashboard
//
// Governs:
// 1. Representative self-service performance dashboard
// 2. Authoritative referral link copy & attribution instructions
// 3. Pre-masked banking credential confirmation
// 4. Transparent 14-day maturation & payout status tracking
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  salesRepPortalService,
  RepProfile,
  MaskedBankingProfile,
} from '../../services/salesRepPortalService';
import { formatNaira } from '../../utils/currency';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { useAuth } from '../../hooks/useAuth';
import {
  Copy,
  Check,
  TrendingUp,
  Award,
  ShieldCheck,
  Clock,
  Sparkles,
  Building2,
  Receipt,
  LogOut,
  AlertCircle,
} from 'lucide-react';

export const RepDashboardPage: React.FC = () => {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<RepProfile | null>(null);
  const [banking, setBanking] = useState<MaskedBankingProfile | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      salesRepPortalService.getMyProfile(),
      salesRepPortalService.getMyBanking(),
      salesRepPortalService.getMyReferrals(),
      salesRepPortalService.getMyCommissions(),
      salesRepPortalService.getMyPayouts(),
    ])
      .then(([prof, bank, refs, comms, pays]) => {
        if (isMounted) {
          setProfile(prof);
          setBanking(bank);
          setReferrals(refs);
          setCommissions(comms);
          setPayouts(pays);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to load rep portal data:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const referralCode = profile?.referral_code || '';
  const referralLink = referralCode
    ? `https://physenra.com/register-practice?ref=${referralCode}`
    : '';

  const handleCopyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // KPI calculations
  const totalEarnedCents = commissions.reduce(
    (sum, c) => (c.current_status !== 'cancelled' ? sum + Number(c.original_commission_cents || 0) : sum),
    0
  );
  const totalPaidCents = payouts.reduce(
    (sum, p) => (p.status === 'completed' ? sum + Number(p.total_amount_cents || 0) : sum),
    0
  );
  const pendingCents = commissions.reduce(
    (sum, c) =>
      ['pending', 'approved', 'in_payout', 'held_suspended'].includes(c.current_status)
        ? sum + Number(c.original_commission_cents || 0)
        : sum,
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="w-4 h-4 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
          <span>Loading representative portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-teal-500/20">
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo theme="dark" size="md" to="/rep/dashboard" showSubtitle={false} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
              Partner Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white">{profile?.full_name}</div>
              <div className="text-[10px] text-slate-400">{profile?.email}</div>
            </div>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Welcome & Status Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-950/60 via-slate-900 to-slate-900 border border-teal-500/30 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Welcome back, {profile?.full_name || 'Representative'}
              </h1>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  profile?.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {profile?.status || 'Pilot Rep'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              Earn a 20% commission on the first qualifying subscription payment from physiotherapy practices you onboard.
              Pilot period active through {profile?.pilot_end_date}.
            </p>
          </div>

          {/* Referral Code Quick Display */}
          {referralCode && (
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center sm:text-right">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Your Referral Code</div>
              <div className="font-mono text-xl font-extrabold text-teal-400 tracking-wider mt-0.5">
                {referralCode}
              </div>
            </div>
          )}
        </div>

        {/* Unique Referral Link Card */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Your Unique Practice Invitation Link</span>
            </span>
            <span className="text-[11px] text-teal-400">30-day first-touch tracking</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 truncate select-all">
              {referralLink || 'Generating unique link...'}
            </div>
            <button
              onClick={handleCopyLink}
              disabled={!referralLink}
              className={`inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-teal-600 hover:bg-teal-500 text-white shadow-sm'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Invitation Link</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Share this link with clinics, practice directors, and consultants across Nigeria. When they register and complete their initial subscription, commission attribution automatically credits to your account.
          </p>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Practices Referred</span>
              <Building2 className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl font-bold text-white">{referrals.length}</div>
            <p className="text-[11px] text-slate-500 mt-1">Attributed practices</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Converted Subscriptions</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {referrals.filter((r) => r.status === 'qualified').length}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Qualified first payments</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Total Earned</span>
              <TrendingUp className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl font-bold text-white">{formatNaira(totalEarnedCents)}</div>
            <p className="text-[11px] text-slate-500 mt-1">Net basis commission</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Paid Out Balance</span>
              <Receipt className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">{formatNaira(totalPaidCents)}</div>
            <p className="text-[11px] text-slate-500 mt-1">{formatNaira(pendingCents)} in holding/payout</p>
          </div>
        </div>

        {/* Banking Information (Pre-Masked) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Registered Banking Information</span>
            </span>
            {banking?.is_verified && (
              <span className="text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                Verified
              </span>
            )}
          </div>

          {banking ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[11px]">Bank Name</span>
                <span className="font-semibold text-white">{banking.bank_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">NUBAN Account</span>
                <span className="font-mono font-bold text-teal-300">{banking.masked_account_number}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Account Beneficiary</span>
                <span className="font-semibold text-white">{banking.account_name}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>No bank account registered yet. Please contact Platform Operations to register disbursement credentials.</span>
            </div>
          )}

          <p className="text-[11px] text-slate-500">
            For security and NDPR compliance, account numbers are masked. Direct disbursements are processed through Paystack/NIP.
          </p>
        </div>

        {/* Commission Maturation Ledger */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-teal-400" />
              <span>Earned Commissions Ledger</span>
            </span>
            <span className="text-[11px] text-slate-400">14-day maturation cycle</span>
          </div>

          {commissions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No commissions recorded yet. Share your invitation link to begin earning on your referrals!
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="p-3.5">Referred Practice</th>
                    <th className="p-3.5">Net Basis</th>
                    <th className="p-3.5">Commission (20%)</th>
                    <th className="p-3.5">Maturation / Payout</th>
                    <th className="p-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {commissions.map((comm) => {
                    const isMatured = new Date(comm.holding_expires_at) <= new Date();

                    return (
                      <tr key={comm.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5">
                          <div className="font-semibold text-white">
                            {comm.referral?.practice?.name || 'Referred Clinic'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {comm.referral?.practice?.slug}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-400">{formatNaira(comm.net_eligible_cents)}</td>
                        <td className="p-3.5 font-bold text-teal-300 text-sm">
                          {formatNaira(comm.original_commission_cents)}
                        </td>
                        <td className="p-3.5 text-[11px] text-slate-400">
                          {comm.current_status === 'paid' ? (
                            <span className="text-emerald-400 font-semibold">Disbursed</span>
                          ) : isMatured ? (
                            <span className="text-teal-400 font-semibold">Matured — In Payout Queue</span>
                          ) : (
                            <div className="flex items-center gap-1 text-amber-400">
                              <Clock className="w-3 h-3" />
                              <span>Matures {new Date(comm.holding_expires_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              comm.current_status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : comm.current_status === 'approved'
                                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                                : comm.current_status === 'pending'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {comm.current_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
