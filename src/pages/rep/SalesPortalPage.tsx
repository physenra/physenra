// ==============================================================================
// PHYSENRA SAAS — INDEPENDENT SALES REPRESENTATIVE PORTAL
// File: src/pages/rep/SalesPortalPage.tsx
// Routes: /sales-portal, /sales-portal/referrals, /sales-portal/commissions, /sales-portal/profile
//
// Governs:
// 1. Free-access commercial partner workspace (zero clinic subscriptions/billing)
// 2. Dashboard KPIs sourced strictly from authoritative database records
// 3. Unique referral link generation + Copy / WhatsApp / Email / Native Share
// 4. Scoped referrals tracker (non-clinical practice attribution only)
// 5. Commission & adjustment ledger with explicit settlement-disabled banner
// 6. Self-service profile, email change verification, and password update
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  salesRepPortalService,
  buildReferralShareUrls,
  SalesPortalContext,
  MaskedBankingProfile,
  RepReferralItem,
  RepCommissionItem,
} from '../../services/salesRepPortalService';
import { formatNaira } from '../../utils/currency';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  Award,
  UserCog,
  Copy,
  Check,
  Share2,
  MessageCircle,
  Mail,
  ShieldCheck,
  Clock,
  Sparkles,
  Building2,
  Receipt,
  LogOut,
  AlertCircle,
  Info,
  Lock,
  RefreshCw,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

type PortalTab = 'dashboard' | 'referrals' | 'commissions' | 'profile';

function resolveTabFromPath(pathname: string): PortalTab {
  if (pathname.endsWith('/referrals')) return 'referrals';
  if (pathname.endsWith('/commissions')) return 'commissions';
  if (pathname.endsWith('/profile')) return 'profile';
  return 'dashboard';
}

export const SalesPortalPage: React.FC = () => {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<PortalTab>(() => resolveTabFromPath(location.pathname));
  const [context, setContext] = useState<SalesPortalContext | null>(null);
  const [banking, setBanking] = useState<MaskedBankingProfile | null>(null);
  const [referrals, setReferrals] = useState<RepReferralItem[]>([]);
  const [commissions, setCommissions] = useState<RepCommissionItem[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Profile form state
  const [profileFullName, setProfileFullName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileRegion, setProfileRegion] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setActiveTab(resolveTabFromPath(location.pathname));
  }, [location.pathname]);

  const loadPortalData = useCallback(async () => {
    try {
      setLoadError(null);
      const [ctx, bank, refs, comms, pays] = await Promise.all([
        salesRepPortalService.getMyPortalContext(),
        salesRepPortalService.getMyBanking(),
        salesRepPortalService.getMyReferrals(),
        salesRepPortalService.getMyCommissions(),
        salesRepPortalService.getMyPayouts(),
      ]);

      setContext(ctx);
      setBanking(bank);
      setReferrals(refs);
      setCommissions(comms);
      setPayouts(pays);

      if (ctx.profile) {
        setProfileFullName(ctx.profile.full_name || '');
        setProfilePhone(ctx.profile.phone_number || '');
        setProfileRegion(ctx.profile.state_region || '');
        setNewEmail(ctx.profile.email || '');
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load sales partner portal data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPortalData();
  }, [loadPortalData]);

  const switchTab = (tab: PortalTab) => {
    setActiveTab(tab);
    const targetPath = tab === 'dashboard' ? '/sales-portal' : `/sales-portal/${tab}`;
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  const profile = context?.profile || null;
  const settlementEnabled = Boolean(context?.commission_settlement_enabled);
  const referralCode = profile?.referral_code || '';
  const { referralLink, whatsappUrl, emailUrl } = buildReferralShareUrls(referralCode);

  const handleCopyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked in non-HTTPS contexts
    }
  };

  const handleNativeShare = async () => {
    if (!referralLink || typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;
    try {
      await navigator.share({
        title: 'Register Your Physiotherapy Clinic on Physenra',
        text: `Use my partner referral code ${referralCode} to register your clinic on Physenra.`,
        url: referralLink,
      });
    } catch {
      // User dismissed share dialog
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);
    try {
      setProfileSaving(true);
      await salesRepPortalService.updateMyProfile({
        fullName: profileFullName,
        phoneNumber: profilePhone,
        stateRegion: profileRegion,
      });
      await loadPortalData();
      setProfileFeedback({ type: 'success', text: 'Contact profile details updated.' });
    } catch (err: any) {
      setProfileFeedback({ type: 'error', text: err?.message || 'Failed to update profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailFeedback(null);
    if (newEmail.trim().toLowerCase() === (profile?.email || '').toLowerCase()) {
      setEmailFeedback({ type: 'error', text: 'Please enter a different email address.' });
      return;
    }
    try {
      setEmailSaving(true);
      const res = await salesRepPortalService.requestEmailChange(newEmail);
      setEmailFeedback({
        type: 'success',
        text: `Verification links have been sent. Please confirm the change to ${res.pendingEmail}.`,
      });
    } catch (err: any) {
      setEmailFeedback({ type: 'error', text: err?.message || 'Failed to request email change.' });
    } finally {
      setEmailSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);
    if (newPassword.length < 8) {
      setPasswordFeedback({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    try {
      setPasswordSaving(true);
      await salesRepPortalService.updateMyPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFeedback({ type: 'success', text: 'Your password has been updated securely.' });
    } catch (err: any) {
      setPasswordFeedback({ type: 'error', text: err?.message || 'Failed to update password.' });
    } finally {
      setPasswordSaving(false);
    }
  };

  // Authoritative metrics derived strictly from database records (never estimated)
  const metrics = context?.metrics;
  const totalReferralsCount = metrics?.total_referrals ?? referrals.length;
  const pendingReferralsCount =
    metrics?.pending_referrals ?? referrals.filter((r) => r.status === 'attributed').length;
  const attributedRegistrationsCount =
    metrics?.attributed_registrations ??
    referrals.filter((r) => r.status === 'attributed' || r.status === 'qualified').length;
  const qualifiedConversionsCount =
    metrics?.qualified_conversions ?? referrals.filter((r) => r.status === 'qualified').length;

  const commissionEarnedCents =
    metrics?.commission_earned_cents ??
    commissions.reduce(
      (sum, c) =>
        !['cancelled', 'reversed'].includes(c.current_status)
          ? sum + Number(c.original_commission_cents || 0)
          : sum,
      0
    );
  const pendingCommissionCents =
    metrics?.pending_commission_cents ??
    commissions.reduce(
      (sum, c) =>
        ['pending', 'held_suspended', 'disputed'].includes(c.current_status)
          ? sum + Number(c.original_commission_cents || 0)
          : sum,
      0
    );
  const approvedCommissionCents =
    metrics?.approved_commission_cents ??
    commissions.reduce(
      (sum, c) =>
        ['approved', 'in_payout'].includes(c.current_status)
          ? sum + Number(c.original_commission_cents || 0)
          : sum,
      0
    );
  const paidCommissionCents =
    metrics?.paid_commission_cents ??
    commissions.reduce(
      (sum, c) => (c.current_status === 'paid' ? sum + Number(c.original_commission_cents || 0) : sum),
      0
    );

  const commissionRatePct = profile ? `${(profile.commission_rate_bps / 100).toFixed(0)}%` : '20%';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
          <span>Loading your Sales Partner Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-500/20">
      {/* Independent Partner Portal Header (Never displays Platform Console or Clinical nav) */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandLogo theme="dark" size="md" to="/sales-portal" showSubtitle={false} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
              Free Partner Portal
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                setRefreshing(true);
                loadPortalData();
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh data"
              aria-label="Refresh portal data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

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

        {/* Dedicated Responsive Navigation */}
        <nav
          aria-label="Sales Partner Navigation"
          className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto border-t border-slate-800/70"
        >
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'referrals', label: `My Referrals (${totalReferralsCount})`, icon: Users },
            { id: 'commissions', label: 'My Commissions', icon: Award },
            { id: 'profile', label: 'My Profile', icon: UserCog },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => switchTab(item.id as PortalTab)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
                  active
                    ? 'border-teal-400 text-teal-300 bg-slate-950/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {loadError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2.5" role="alert">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* Prominent Banner when Commission Settlement is Disabled */}
        {!settlementEnabled && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200 space-y-0.5 leading-relaxed">
              <div className="font-bold text-amber-300">Commission settlement is not yet activated.</div>
              <p className="text-amber-200/80">
                Your referral link and practice attribution tracking remain active. Unpaid referrals do not generate payable commissions until platform settlement is enabled.
              </p>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB A: DASHBOARD                                                 */}
        {/* ================================================================ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Identity & Free Access Summary Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-950/60 via-slate-900 to-slate-900 border border-teal-500/30 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">
                    {profile?.full_name || 'Sales Representative'}
                  </h1>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      profile?.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {profile?.status || 'active'}
                  </span>
                  <span className="text-[10px] font-semibold text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full">
                    Free Partner Account
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  {profile?.state_region} • Authorized Partner Program Window: {profile?.pilot_start_date} to {profile?.pilot_end_date}.
                </p>
              </div>

              {referralCode && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-left md:text-right shrink-0">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Authoritative Referral Code
                  </div>
                  <div className="font-mono text-xl font-extrabold text-teal-400 tracking-wider mt-0.5">
                    {referralCode}
                  </div>
                </div>
              )}
            </div>

            {/* Section B: My Referral Link Card */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>My Referral Link</span>
                </span>
                <span className="text-[11px] text-teal-400">30-day first-touch attribution</span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 truncate select-all">
                  {referralLink || 'No active referral code assigned'}
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={!referralLink}
                  className={`inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-teal-600 hover:bg-teal-500 text-white shadow-sm disabled:opacity-50'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Link Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              {referralLink && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Share via WhatsApp</span>
                  </a>
                  <a
                    href={emailUrl}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Share via Email</span>
                  </a>
                  {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>
                  )}
                </div>
              )}

              <p className="text-[11px] text-slate-400 leading-relaxed">
                This link automatically tracks practices registering from your invitation under your authoritative code (<span className="font-mono text-slate-300">{referralCode || 'N/A'}</span>).
              </p>
            </div>

            {/* Referral Pipeline KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Total Referrals</span>
                  <Building2 className="w-4 h-4 text-teal-400" />
                </div>
                <div className="text-2xl font-bold text-white">{totalReferralsCount}</div>
                <p className="text-[11px] text-slate-500 mt-1">All tracked clinics</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Pending Referrals</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-300">{pendingReferralsCount}</div>
                <p className="text-[11px] text-slate-500 mt-1">Awaiting paid conversion</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Attributed Registrations</span>
                  <Sparkles className="w-4 h-4 text-teal-400" />
                </div>
                <div className="text-2xl font-bold text-teal-300">{attributedRegistrationsCount}</div>
                <p className="text-[11px] text-slate-500 mt-1">Verified clinic signups</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Qualified Conversions</span>
                  <Award className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400">{qualifiedConversionsCount}</div>
                <p className="text-[11px] text-slate-500 mt-1">Qualifying paid subscriptions</p>
              </div>
            </div>

            {/* Authoritative Commission KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400 mb-2">Commission Earned</div>
                <div className="text-2xl font-bold text-white">{formatNaira(commissionEarnedCents)}</div>
                <p className="text-[11px] text-slate-500 mt-1">Authoritative ledger total</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400 mb-2">Pending Commission</div>
                <div className="text-2xl font-bold text-amber-300">{formatNaira(pendingCommissionCents)}</div>
                <p className="text-[11px] text-slate-500 mt-1">In holding / verification</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400 mb-2">Approved Commission</div>
                <div className="text-2xl font-bold text-teal-300">{formatNaira(approvedCommissionCents)}</div>
                <p className="text-[11px] text-slate-500 mt-1">Cleared for payout</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400 mb-2">Paid Commission</div>
                <div className="text-2xl font-bold text-emerald-400">{formatNaira(paidCommissionCents)}</div>
                <p className="text-[11px] text-slate-500 mt-1">Disbursed via Paystack / NIP</p>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB C: MY REFERRALS                                              */}
        {/* ================================================================ */}
        {activeTab === 'referrals' && (
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-white">My Referred Practices</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Non-clinical attribution tracker showing registration and subscription qualification progress. Patient and clinical data are strictly isolated.
                </p>
              </div>
              <span className="text-[11px] text-slate-400">Showing {referrals.length} records</span>
            </div>

            {referrals.length === 0 ? (
              <div className="p-10 text-center rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <Building2 className="w-7 h-7 text-slate-600 mx-auto" />
                <div className="text-xs font-semibold text-slate-300">No referred practices recorded yet</div>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Share your invitation link from the Dashboard to start tracking clinic registrations.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="p-3.5">Practice Name</th>
                      <th className="p-3.5">Registration Date</th>
                      <th className="p-3.5">Attribution</th>
                      <th className="p-3.5">Conversion Status</th>
                      <th className="p-3.5 text-right">Qualification Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {referrals.map((ref) => (
                      <tr key={ref.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5">
                          <div className="font-semibold text-white">{ref.practice_name}</div>
                          {ref.practice_slug && (
                            <div className="text-[11px] text-slate-500 font-mono">{ref.practice_slug}</div>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-300">
                          {new Date(ref.attributed_at).toLocaleDateString()}
                        </td>
                        <td className="p-3.5">
                          <span className="text-[11px] font-mono text-teal-300">{ref.attribution_type}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] uppercase font-semibold text-slate-300">
                            {ref.subscription_status || 'registered'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              ref.status === 'qualified'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : ref.status === 'attributed'
                                ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                                : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {ref.status}
                          </span>
                          {ref.qualified_at && (
                            <div className="text-[10px] text-slate-500 mt-1">
                              Qualified {new Date(ref.qualified_at).toLocaleDateString()}
                            </div>
                          )}
                          {ref.disqualification_reason && (
                            <div className="text-[10px] text-rose-400 mt-1">{ref.disqualification_reason}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB D: MY COMMISSIONS                                            */}
        {/* ================================================================ */}
        {activeTab === 'commissions' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400">Commission Rate</div>
                <div className="text-xl font-bold text-teal-300 mt-1">{commissionRatePct}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400">Total Earned</div>
                <div className="text-xl font-bold text-white mt-1">{formatNaira(commissionEarnedCents)}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400">Pending Commission</div>
                <div className="text-xl font-bold text-amber-300 mt-1">{formatNaira(pendingCommissionCents)}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400">Approved Commission</div>
                <div className="text-xl font-bold text-teal-300 mt-1">{formatNaira(approvedCommissionCents)}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400">Paid Commission</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">{formatNaira(paidCommissionCents)}</div>
              </div>
            </div>

            {/* Commission Ledger */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-teal-400" />
                  <span>Authoritative Commission Ledger</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {settlementEnabled ? '14-day maturation cycle' : 'Settlement disabled'}
                </span>
              </div>

              {!settlementEnabled && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                  <span className="font-bold text-amber-300">Commission settlement is not yet activated.</span>{' '}
                  No estimated or synthetic earnings are displayed; only confirmed ledger records will appear here once settlement goes live.
                </div>
              )}

              {commissions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800">
                  No authoritative commission entries recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700">
                      <tr>
                        <th className="p-3.5">Referred Practice</th>
                        <th className="p-3.5">Net Eligible Basis</th>
                        <th className="p-3.5">Rate</th>
                        <th className="p-3.5">Amount</th>
                        <th className="p-3.5">Adjustments &amp; Notes</th>
                        <th className="p-3.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {commissions.map((comm) => (
                        <tr key={comm.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5">
                            <div className="font-semibold text-white">{comm.practice_name}</div>
                            <div className="text-[10px] text-slate-500">
                              {new Date(comm.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-400">{formatNaira(comm.net_eligible_cents)}</td>
                          <td className="p-3.5">{(comm.commission_rate_bps / 100).toFixed(0)}%</td>
                          <td className="p-3.5 font-bold text-teal-300">
                            {formatNaira(comm.original_commission_cents)}
                          </td>
                          <td className="p-3.5 text-[11px]">
                            {comm.adjustments && comm.adjustments.length > 0 ? (
                              <div className="space-y-1">
                                {comm.adjustments.map((adj) => (
                                  <div key={adj.id} className="text-amber-300">
                                    {adj.adjustment_type}: {formatNaira(adj.delta_amount_cents)} — {adj.reason}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500">None</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold uppercase text-slate-200">
                              {comm.current_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payout History & Pre-Masked Bank Account */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Disbursement Account (Masked)</span>
                </span>
                {banking ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Bank Name</span>
                      <span className="font-semibold text-white">{banking.bank_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Account Number</span>
                      <span className="font-mono font-bold text-teal-300">{banking.masked_account_number}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Beneficiary</span>
                      <span className="font-semibold text-white">{banking.account_name}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400">
                    No disbursement bank account registered on file yet. Contact Platform Operations when ready for payout setup.
                  </div>
                )}
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-teal-400" />
                  <span>Payout History ({payouts.length})</span>
                </span>
                {payouts.length === 0 ? (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400">
                    No commission payouts disbursed yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {payouts.map((p) => (
                      <div key={p.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-mono font-semibold text-white">{p.payout_number}</div>
                          <div className="text-[11px] text-slate-500">{p.bank_name} • {p.masked_account_number}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-400">{formatNaira(p.total_amount_cents)}</div>
                          <div className="text-[10px] uppercase text-slate-400">{p.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB E: MY PROFILE                                                */}
        {/* ================================================================ */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editable Profile Details */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-white">Partner Contact Profile</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Update your name, phone number, or operating state/region.
                </p>
              </div>

              {profileFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    profileFeedback.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-200'
                  }`}
                >
                  {profileFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{profileFeedback.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                <div>
                  <label htmlFor="rep-full-name" className="block text-slate-400 mb-1">Full Name</label>
                  <input
                    id="rep-full-name"
                    type="text"
                    required
                    minLength={2}
                    value={profileFullName}
                    onChange={(e) => setProfileFullName(e.target.value)}
                    disabled={profileSaving}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label htmlFor="rep-phone" className="block text-slate-400 mb-1">Phone Number</label>
                  <input
                    id="rep-phone"
                    type="text"
                    required
                    minLength={7}
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    disabled={profileSaving}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label htmlFor="rep-region" className="block text-slate-400 mb-1">State / Region</label>
                  <input
                    id="rep-region"
                    type="text"
                    required
                    minLength={2}
                    value={profileRegion}
                    onChange={(e) => setProfileRegion(e.target.value)}
                    disabled={profileSaving}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold disabled:opacity-50"
                >
                  {profileSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Contact Details</span>
                </button>
              </form>

              {/* Protected Read-Only Governance Fields */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  <span>Protected Governance Attributes (Admin Managed)</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Account Status</span>
                    <span className="font-semibold text-emerald-400 uppercase">{profile?.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Authoritative Referral Code</span>
                    <span className="font-mono font-bold text-teal-300">{referralCode || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Commission Rate</span>
                    <span className="font-semibold text-white">{commissionRatePct}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Verification / Program Dates</span>
                    <span className="text-slate-300">{profile?.pilot_start_date} – {profile?.pilot_end_date}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Email Change & Password Management */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-white">Email Address (Verified Update)</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Changing your sign-in email requires confirmation via verification email.
                  </p>
                </div>

                {emailFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                      emailFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-200'
                    }`}
                  >
                    <span>{emailFeedback.text}</span>
                  </div>
                )}

                <form onSubmit={handleRequestEmailChange} className="space-y-3 text-xs">
                  <div>
                    <label htmlFor="rep-email-input" className="block text-slate-400 mb-1">Sign-In Email</label>
                    <input
                      id="rep-email-input"
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      disabled={emailSaving}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={emailSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold disabled:opacity-50"
                  >
                    {emailSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Request Verified Email Update</span>
                  </button>
                </form>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-white">Update Password</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Establish a new private password for your Sales Representative Portal account.
                  </p>
                </div>

                {passwordFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                      passwordFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-200'
                    }`}
                  >
                    <span>{passwordFeedback.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
                  <div>
                    <label htmlFor="rep-new-password" className="block text-slate-400 mb-1">New Password (min 8 characters)</label>
                    <input
                      id="rep-new-password"
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={passwordSaving}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="rep-confirm-password" className="block text-slate-400 mb-1">Confirm New Password</label>
                    <input
                      id="rep-confirm-password"
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={passwordSaving}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold disabled:opacity-50"
                  >
                    {passwordSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Update Password</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
