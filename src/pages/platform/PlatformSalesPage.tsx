// ==============================================================================
// PHYSENRA SAAS — SUPER ADMIN SALES & REFERRAL MANAGEMENT CONSOLE
// File: src/pages/platform/PlatformSalesPage.tsx
// Route: /platform/sales
//
// Governs:
// 1. Executive KPIs (Active reps, referral conversions, pending liability, payouts)
// 2. Sales Representative Directory & Onboarding Modal
// 3. Audited Raw NUBAN Disclosure Modal (Mandatory Justification)
// 4. Commission Ledger & 14-Day Hold Approval Queue
// 5. Batch Payout Disbursement & External Transfer Code Assignment
// 6. Outbox Queue Inspector & Abandoned Record Requeue Tool
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  salesRepAdminService,
  SalesRepSummary,
  CommissionRecord,
  PayoutBatchRecord,
} from '../../services/salesRepAdminService';
import { formatNaira } from '../../utils/currency';
import {
  Users,
  Award,
  TrendingUp,
  Receipt,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Eye,
  Sparkles,
  Loader2,
} from 'lucide-react';

const POPULAR_NIGERIAN_BANKS = [
  { name: 'Guaranty Trust Bank (GTBank)', code: '058' },
  { name: 'Access Bank', code: '044' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'United Bank for Africa (UBA)', code: '033' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First City Monument Bank (FCMB)', code: '214' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'OPay', code: '999992' },
  { name: 'PalmPay', code: '999991' },
];

export const PlatformSalesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'reps' | 'commissions' | 'payouts' | 'queue'>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data states
  const [overview, setOverview] = useState<any>(null);
  const [reps, setReps] = useState<SalesRepSummary[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutBatchRecord[]>([]);
  const [outboxTasks, setOutboxTasks] = useState<any[]>([]);
  const [quarantine, setQuarantine] = useState<any[]>([]);

  // Modals & Forms
  const [showOnboardModal, setShowOnboardModal] = useState<boolean>(false);
  const [onboardSubmitting, setOnboardSubmitting] = useState<boolean>(false);
  const [onboardModalError, setOnboardModalError] = useState<string | null>(null);
  const [onboardForm, setOnboardForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    stateRegion: '',
    referralCode: '',
    bankName: '',
    bankCode: '058',
    accountNumber: '',
    accountName: '',
  });

  const [revealModal, setRevealModal] = useState<{ repId: string; repName: string } | null>(null);
  const [revealJustification, setRevealJustification] = useState<string>('');
  const [revealedBank, setRevealedBank] = useState<any | null>(null);
  const [revealing, setRevealing] = useState<boolean>(false);

  const [requeueModal, setRequeueModal] = useState<{ outboxId: string } | null>(null);
  const [requeueJustification, setRequeueJustification] = useState<string>('');

  const [selectedCommsForPayout, setSelectedCommsForPayout] = useState<string[]>([]);
  const [payoutRepId, setPayoutRepId] = useState<string>('');
  const [transferRefInput, setTransferRefInput] = useState<{ payoutId: string; ref: string } | null>(null);

  const loadAllData = async () => {
    try {
      setError(null);
      const results = await Promise.allSettled([
        salesRepAdminService.getSalesOverview(),
        salesRepAdminService.getSalesReps(),
        salesRepAdminService.getCommissions(),
        salesRepAdminService.getPayouts(),
        salesRepAdminService.getOutboxTasks(),
        salesRepAdminService.getQuarantineEntries(),
      ]);

      const [ovRes, rListRes, cListRes, pListRes, oListRes, qListRes] = results;

      if (ovRes.status === 'fulfilled') setOverview(ovRes.value);
      if (rListRes.status === 'fulfilled') setReps(rListRes.value);
      if (cListRes.status === 'fulfilled') setCommissions(cListRes.value);
      if (pListRes.status === 'fulfilled') setPayouts(pListRes.value);
      if (oListRes.status === 'fulfilled') setOutboxTasks(oListRes.value);
      if (qListRes.status === 'fulfilled') setQuarantine(qListRes.value);

      const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
      if (rejected) {
        console.warn('[PlatformSalesPage] Partial data loading issue:', rejected.reason);
        setError(rejected.reason?.message || 'Failed to load some sales management data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load sales management data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  const handleCreateRep = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardModalError(null);

    if (onboardSubmitting) return; // Prevent duplicate submissions

    const fullName = onboardForm.fullName.trim();
    const email = onboardForm.email.trim().toLowerCase();
    const phoneNumber = onboardForm.phoneNumber.trim();
    const stateRegion = onboardForm.stateRegion.trim();
    const referralCode = onboardForm.referralCode.trim().toUpperCase();
    const bankName = onboardForm.bankName.trim();
    const bankCode = (onboardForm.bankCode || '058').trim();
    const accountNumber = onboardForm.accountNumber.trim();
    const accountName = onboardForm.accountName.trim();

    // Client-side synchronous pre-flight validation
    if (fullName.length < 2) {
      setOnboardModalError('Please enter the representative\'s full name (at least 2 characters).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setOnboardModalError('Please enter a valid email address.');
      return;
    }
    if (phoneNumber.length < 7) {
      setOnboardModalError('Please enter a valid phone number (at least 7 characters).');
      return;
    }
    if (stateRegion.length < 2) {
      setOnboardModalError('Please enter a valid state or region.');
      return;
    }
    if (!/^[A-Z0-9_-]{4,32}$/.test(referralCode)) {
      setOnboardModalError('Referral code must be 4 to 32 characters long and contain only uppercase letters, numbers, hyphens, and underscores (e.g. LAGOS-REP-01).');
      return;
    }
    const hasBankDetails = Boolean(bankName || accountNumber || accountName);
    if (hasBankDetails) {
      if (!bankName) {
        setOnboardModalError('Please select or specify the bank name.');
        return;
      }
      if (!/^[0-9]{10}$/.test(accountNumber)) {
        setOnboardModalError('Account number must be exactly 10 digits.');
        return;
      }
      if (accountName.length < 2) {
        setOnboardModalError('Please enter the account name.');
        return;
      }
    }

    try {
      setOnboardSubmitting(true);
      await salesRepAdminService.createSalesRep({
        fullName,
        email,
        phoneNumber,
        stateRegion,
        referralCode,
        bankName: hasBankDetails ? bankName : undefined,
        bankCode: hasBankDetails ? bankCode : undefined,
        accountNumber: hasBankDetails ? accountNumber : undefined,
        accountName: hasBankDetails ? accountName : undefined,
      });

      setSuccessMsg(`Sales Representative ${fullName} onboarded successfully!`);
      setShowOnboardModal(false);
      setOnboardModalError(null);
      setOnboardForm({
        fullName: '',
        email: '',
        phoneNumber: '',
        stateRegion: '',
        referralCode: '',
        bankName: '',
        bankCode: '058',
        accountNumber: '',
        accountName: '',
      });
      await loadAllData();
    } catch (err: any) {
      setOnboardModalError(err.message || 'Failed to onboard representative');
    } finally {
      setOnboardSubmitting(false);
    }
  };

  const handleRevealBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revealModal) return;
    try {
      setRevealing(true);
      const bank = await salesRepAdminService.revealRawNuban(revealModal.repId, revealJustification);
      setRevealedBank(bank);
      setSuccessMsg('Raw bank account revealed. Action has been recorded in the security audit ledger.');
    } catch (err: any) {
      setError(err.message || 'Failed to reveal bank details');
    } finally {
      setRevealing(false);
    }
  };

  const handleApproveCommission = async (commId: string) => {
    try {
      setLoading(true);
      await salesRepAdminService.transitionCommission(
        commId,
        'approved',
        'manual_adjustment',
        'Platform Admin approved commission after 14-day holding period'
      );
      setSuccessMsg('Commission marked as approved for payout.');
      await loadAllData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve commission');
    } finally {
      setLoading(false);
    }
  };

  const handleRequeueOutbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requeueModal) return;
    try {
      setLoading(true);
      await salesRepAdminService.requeueOutboxTask(requeueModal.outboxId, requeueJustification);
      setSuccessMsg('Abandoned outbox record has been requeued for execution.');
      setRequeueModal(null);
      setRequeueJustification('');
      await loadAllData();
    } catch (err: any) {
      setError(err.message || 'Failed to requeue outbox task');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayoutDraft = async () => {
    if (!payoutRepId || selectedCommsForPayout.length === 0) {
      setError('Please select a representative and at least one commission.');
      return;
    }

    try {
      setLoading(true);
      const payout: any = await salesRepAdminService.createPayoutBatch({
        salesRepId: payoutRepId,
        commissionIds: selectedCommsForPayout,
      });
      setSuccessMsg(`Payout draft ${payout.payout_number} created with ${selectedCommsForPayout.length} commissions.`);
      setSelectedCommsForPayout([]);
      setPayoutRepId('');
      setActiveTab('payouts');
      await loadAllData();
    } catch (err: any) {
      setError(err.message || 'Failed to generate payout draft');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTransferRef = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferRefInput) return;
    try {
      setLoading(true);
      await salesRepAdminService.updatePayoutTransferReference(
        transferRefInput.payoutId,
        transferRefInput.ref
      );
      setSuccessMsg('External Paystack transfer reference attached.');
      setTransferRefInput(null);
      await loadAllData();
    } catch (err: any) {
      setError(err.message || 'Failed to attach transfer reference');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Sales Representatives &amp; Referrals</h1>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded border border-emerald-500/20">
              Pilot Mode: 90 Days
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative commission ledger, partner attributions, batch disbursements &amp; audit controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setOnboardModalError(null);
              setShowOnboardModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Onboard Representative</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-white font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800">
        {[
          { id: 'overview', label: 'Executive Overview', icon: TrendingUp },
          { id: 'reps', label: `Representatives (${reps.length})`, icon: Users },
          { id: 'commissions', label: `Commissions (${commissions.length})`, icon: Award },
          { id: 'payouts', label: `Payout Batches (${payouts.length})`, icon: Receipt },
          { id: 'queue', label: `Queue & Recovery (${outboxTasks.length})`, icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition -mb-px ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Active Representatives</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white">{overview.activeRepsCount}</div>
              <p className="text-[11px] text-slate-500 mt-1">Authorized for 90-day pilot</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Practices Attributed</span>
                <Sparkles className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-bold text-white">{overview.totalReferrals}</div>
              <p className="text-[11px] text-teal-400 mt-1">{overview.qualifiedReferrals} converted to paid subscribers</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Pending Commission Liability</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-300">
                {formatNaira(overview.totalPendingLiabilityCents)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Pending 14-day holding or approved</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Total Disbursed Payouts</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {formatNaira(overview.totalPaidOutCents)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Settled via Paystack / NIP</p>
            </div>
          </div>

          {/* Quick Action Matrix */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white">Pilot Operating Safeguards</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                <span className="font-semibold text-emerald-400">20% Net Eligible Basis</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Calculated strictly on Gross Amount minus VAT/WHT minus Paystack gateway fees. First subscription payment only.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                <span className="font-semibold text-teal-400">₦25,000 Annual Plan Cap</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Annual subscriptions capped at ₦25,000 (2,500,000 kobo) max per representative per converted practice.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                <span className="font-semibold text-amber-400">14-Day Maturation Period</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  All commissions held for 14 calendar days against refunds or disputes before administrative disbursement.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REPRESENTATIVES */}
      {activeTab === 'reps' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-4">Representative</th>
                  <th className="p-4">Referral Code</th>
                  <th className="p-4">State / Region</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Banking Credentials</th>
                  <th className="p-4">Pilot Dates</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {reps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                      No representatives registered yet. Click &quot;Onboard Representative&quot; above to register.
                    </td>
                  </tr>
                ) : (
                  reps.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4">
                        <div className="font-semibold text-white">{rep.full_name}</div>
                        <div className="text-[11px] text-slate-400">{rep.email}</div>
                        <div className="text-[11px] text-slate-500">{rep.phone_number}</div>
                      </td>
                      <td className="p-4">
                        {rep.referral_codes && rep.referral_codes.length > 0 ? (
                          <span className="font-mono bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-teal-300 font-bold">
                            {rep.referral_codes[0].code}
                          </span>
                        ) : (
                          <span className="text-slate-500">None</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-300">{rep.state_region}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            rep.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : rep.status === 'suspended'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {rep.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {rep.bank_account ? (
                          <div className="space-y-0.5">
                            <div className="font-mono text-slate-200">{rep.bank_account.masked_account_number}</div>
                            <div className="text-[11px] text-slate-400">{rep.bank_account.bank_name}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500">No account</span>
                        )}
                      </td>
                      <td className="p-4 text-[11px] text-slate-400">
                        <div>Start: {rep.pilot_start_date}</div>
                        <div>End: {rep.pilot_end_date}</div>
                      </td>
                      <td className="p-4 text-right">
                        {rep.bank_account && (
                          <button
                            onClick={() => {
                              setRevealModal({ repId: rep.id, repName: rep.full_name });
                              setRevealedBank(null);
                              setRevealJustification('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 border border-slate-700"
                          >
                            <Eye className="w-3 h-3 text-slate-400" />
                            <span>Reveal NUBAN</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: COMMISSIONS & APPROVALS */}
      {activeTab === 'commissions' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-4">Select</th>
                  <th className="p-4">Representative</th>
                  <th className="p-4">Referred Practice</th>
                  <th className="p-4">Financial Breakdown</th>
                  <th className="p-4">Commission (20%)</th>
                  <th className="p-4">Status &amp; Hold</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                      No commission records found.
                    </td>
                  </tr>
                ) : (
                  commissions.map((c) => {
                  const isHoldExpired = new Date(c.holding_expires_at) <= new Date();
                  const canSelectForPayout = c.current_status === 'approved' && !c.is_payout_frozen;

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4">
                        {canSelectForPayout && (
                          <input
                            type="checkbox"
                            checked={selectedCommsForPayout.includes(c.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCommsForPayout([...selectedCommsForPayout, c.id]);
                                setPayoutRepId(c.sales_rep_id);
                              } else {
                                setSelectedCommsForPayout(selectedCommsForPayout.filter((id) => id !== c.id));
                              }
                            }}
                            className="rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
                          />
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-white">{c.sales_rep?.full_name || 'Rep'}</div>
                        <div className="text-[11px] text-slate-400">{c.sales_rep?.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-200">
                          {c.referral?.practice?.name || 'Referred Practice'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {c.referral?.practice?.slug}
                        </div>
                      </td>
                      <td className="p-4 text-[11px] space-y-0.5">
                        <div>Gross: {formatNaira(c.gross_amount_cents)}</div>
                        <div className="text-slate-400">
                          Net Basis: {formatNaira(c.net_eligible_cents)} (Fee: {formatNaira(c.gateway_fee_cents)})
                        </div>
                      </td>
                      <td className="p-4 font-bold text-emerald-400 text-sm">
                        {formatNaira(c.original_commission_cents)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              c.current_status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : c.current_status === 'approved'
                                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                                : c.current_status === 'pending'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {c.current_status}
                          </span>
                          {c.is_payout_frozen && (
                            <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-1.5 py-0.5 rounded">
                              Frozen
                            </span>
                          )}
                        </div>
                        {c.current_status === 'pending' && (
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>
                              {isHoldExpired ? 'Matured (14d passed)' : `Holds until ${new Date(c.holding_expires_at).toLocaleDateString()}`}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {c.current_status === 'pending' && isHoldExpired && (
                          <button
                            onClick={() => handleApproveCommission(c.id)}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px]"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>

          {selectedCommsForPayout.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-between">
              <span className="text-xs text-slate-200">
                {selectedCommsForPayout.length} commission(s) selected for payout batch.
              </span>
              <button
                onClick={handleCreatePayoutDraft}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-sm"
              >
                Generate Payout Draft
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PAYOUT BATCHES */}
      {activeTab === 'payouts' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-4">Payout Number</th>
                  <th className="p-4">Representative</th>
                  <th className="p-4">Disbursement Target</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Transfer Reference</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                      No payout records found.
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-mono font-bold text-white">{p.payout_number}</td>
                      <td className="p-4 font-semibold text-slate-200">{p.sales_rep?.full_name}</td>
                      <td className="p-4 text-[11px]">
                        <div>{p.account_name}</div>
                        <div className="font-mono text-slate-400">{p.masked_account_number} ({p.bank_name})</div>
                      </td>
                      <td className="p-4 font-bold text-emerald-400">{formatNaira(p.total_amount_cents)}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            p.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : p.status === 'initiated'
                              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                              : p.status === 'draft'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-300">
                        {p.transfer_reference || <span className="text-slate-500 italic">Unassigned</span>}
                      </td>
                      <td className="p-4 text-right">
                        {p.status === 'draft' && (
                          <button
                            onClick={() => setTransferRefInput({ payoutId: p.id, ref: '' })}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 border border-slate-700"
                          >
                            Attach Transfer Code
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: QUEUE & RECOVERY */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-white">Durable Commission Outbox Worker</h3>
              <p className="text-[11px] text-slate-400">
                Tasks waiting for retry with lease protection and exponential backoff.
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  setLoading(true);
                  const res = await fetch('/api/process-commission-outbox', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ batch_size: 10 }),
                  });
                  const json = await res.json();
                  setSuccessMsg(`Outbox worker run completed: ${JSON.stringify(json.summary || {})}`);
                  await loadAllData();
                } catch (err: any) {
                  setError(err.message || 'Worker execution failed');
                } finally {
                  setLoading(false);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-xs font-semibold text-white"
            >
              Run Outbox Sweep Now
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-4">Practice</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Retries</th>
                  <th className="p-4">Last Error</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {outboxTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                      No pending outbox retry tasks.
                    </td>
                  </tr>
                ) : (
                  outboxTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-semibold text-white">{task.practice?.name || task.practice_id}</td>
                    <td className="p-4 font-mono text-[11px] text-slate-300">
                      {task.payment?.payment_number || task.payment_id}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          task.status === 'resolved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : task.status === 'abandoned'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">
                      {task.retry_count} / {task.max_retries}
                    </td>
                    <td className="p-4 text-[11px] text-slate-400 max-w-xs truncate">
                      {task.last_error || 'None'}
                    </td>
                    <td className="p-4 text-right">
                      {['abandoned', 'error'].includes(task.status) && (
                        <button
                          onClick={() => setRequeueModal({ outboxId: task.id })}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-amber-300 border border-slate-700"
                        >
                          Requeue
                        </button>
                      )}
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>

          {quarantine && quarantine.length > 0 && (
            <div className="space-y-3 pt-4">
              <h3 className="text-xs font-semibold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Quarantined Webhook Adjustments ({quarantine.length})</span>
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-rose-900/40 bg-slate-900">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="p-3">Event Type</th>
                      <th className="p-3">Source Ref</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {quarantine.map((q: any) => (
                      <tr key={q.id}>
                        <td className="p-3 font-mono text-white">{q.event_type}</td>
                        <td className="p-3 font-mono text-slate-400">{q.source_reference || 'N/A'}</td>
                        <td className="p-3 text-slate-300">{q.reason}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            {q.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ONBOARD REPRESENTATIVE */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">Onboard Sales Representative</h2>
              <button
                type="button"
                onClick={() => {
                  if (!onboardSubmitting) {
                    setShowOnboardModal(false);
                    setOnboardModalError(null);
                  }
                }}
                disabled={onboardSubmitting}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition disabled:opacity-50"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* In-Modal Alert Message */}
            {onboardModalError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{onboardModalError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOnboardModalError(null)}
                  className="text-slate-400 hover:text-white ml-2 font-bold"
                  aria-label="Dismiss error"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleCreateRep} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={onboardForm.fullName}
                  onChange={(e) => setOnboardForm({ ...onboardForm, fullName: e.target.value })}
                  placeholder="e.g. Babatunde Adeleke"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  disabled={onboardSubmitting}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={onboardForm.email}
                    onChange={(e) => setOnboardForm({ ...onboardForm, email: e.target.value })}
                    placeholder="rep@physenra.com"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    disabled={onboardSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={onboardForm.phoneNumber}
                    onChange={(e) => setOnboardForm({ ...onboardForm, phoneNumber: e.target.value })}
                    placeholder="08031234567"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    disabled={onboardSubmitting}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">State / Region</label>
                  <input
                    type="text"
                    required
                    value={onboardForm.stateRegion}
                    onChange={(e) => setOnboardForm({ ...onboardForm, stateRegion: e.target.value })}
                    placeholder="Lagos State"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    disabled={onboardSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Referral Code</label>
                  <input
                    type="text"
                    required
                    maxLength={32}
                    value={onboardForm.referralCode}
                    onChange={(e) =>
                      setOnboardForm({
                        ...onboardForm,
                        referralCode: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
                      })
                    }
                    placeholder="e.g. LAGOS-REP-01"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono uppercase"
                    disabled={onboardSubmitting}
                  />
                  {onboardForm.referralCode && onboardForm.referralCode.length < 4 && (
                    <span className="text-[10px] text-amber-400 mt-0.5 block">Minimum 4 characters ({onboardForm.referralCode.length}/4)</span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Bank Account Credentials (NUBAN)</span>
                  <span className="text-[10px] text-slate-500">Optional — may be added later</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Bank Name</label>
                    <input
                      type="text"
                      list="nigerian-banks"
                      value={onboardForm.bankName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const match = POPULAR_NIGERIAN_BANKS.find(
                          (b) => b.name.toLowerCase() === val.toLowerCase() || b.name.toLowerCase().startsWith(val.toLowerCase())
                        );
                        setOnboardForm({
                          ...onboardForm,
                          bankName: val,
                          bankCode: match ? match.code : onboardForm.bankCode || '058',
                        });
                      }}
                      placeholder="e.g. Guaranty Trust Bank"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      disabled={onboardSubmitting}
                    />
                    <datalist id="nigerian-banks">
                      {POPULAR_NIGERIAN_BANKS.map((b) => (
                        <option key={b.code} value={b.name} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Account Number (10 Digits)</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={onboardForm.accountNumber}
                      onChange={(e) =>
                        setOnboardForm({ ...onboardForm, accountNumber: e.target.value.replace(/[^0-9]/g, '') })
                      }
                      placeholder="0123456789"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                      disabled={onboardSubmitting}
                    />
                    {onboardForm.accountNumber && onboardForm.accountNumber.length !== 10 && (
                      <span className="text-[10px] text-amber-400 mt-0.5 block">Must be exactly 10 digits ({onboardForm.accountNumber.length}/10)</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Account Name</label>
                  <input
                    type="text"
                    value={onboardForm.accountName}
                    onChange={(e) => setOnboardForm({ ...onboardForm, accountName: e.target.value })}
                    placeholder="Babatunde Adeleke"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    disabled={onboardSubmitting}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (!onboardSubmitting) {
                      setShowOnboardModal(false);
                      setOnboardModalError(null);
                    }
                  }}
                  disabled={onboardSubmitting}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboardSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold transition"
                >
                  {onboardSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Onboarding...</span>
                    </>
                  ) : (
                    <span>Confirm Onboarding</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AUDITED RAW NUBAN REVEAL */}
      {revealModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-rose-400">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h2 className="text-sm font-bold text-white">Audited Banking Disclosure</h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Unmasking raw banking credentials for <strong className="text-white">{revealModal.repName}</strong> is
              strictly audited in <code className="text-emerald-400">platform_audit_logs</code>.
            </p>

            {revealedBank ? (
              <div className="p-4 rounded-xl bg-slate-800/80 border border-emerald-500/40 space-y-2 text-xs">
                <div className="text-slate-400">Bank: <strong className="text-white">{revealedBank.bank_name}</strong></div>
                <div className="text-slate-400">
                  NUBAN: <strong className="font-mono text-emerald-400 text-base">{revealedBank.account_number}</strong>
                </div>
                <div className="text-slate-400">Account Name: <strong className="text-white">{revealedBank.account_name}</strong></div>
                <button
                  onClick={() => setRevealModal(null)}
                  className="w-full mt-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleRevealBank} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">
                    Mandatory Written Justification (Min. 5 characters)
                  </label>
                  <textarea
                    required
                    minLength={5}
                    rows={3}
                    value={revealJustification}
                    onChange={(e) => setRevealJustification(e.target.value)}
                    placeholder="e.g. Verified manual disbursement reconciliation for pilot week 1 batch"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRevealModal(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={revealing || revealJustification.trim().length < 5}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold disabled:opacity-50"
                  >
                    {revealing ? 'Recording Audit...' : 'Audit & Reveal NUBAN'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN TRANSFER CODE */}
      {transferRefInput && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-white">Attach Transfer Reference</h2>
            <form onSubmit={handleAssignTransferRef} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Paystack Transfer Code or NIP Ref</label>
                <input
                  type="text"
                  required
                  value={transferRefInput.ref}
                  onChange={(e) => setTransferRefInput({ ...transferRefInput, ref: e.target.value })}
                  placeholder="TRF_xxxxxxxxxxxx"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTransferRefInput(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !transferRefInput.ref.trim()}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-50"
                >
                  Save Reference
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REQUEUE ABANDONED OUTBOX */}
      {requeueModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-white">Requeue Abandoned Outbox Task</h2>
            <form onSubmit={handleRequeueOutbox} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Admin Justification</label>
                <textarea
                  required
                  minLength={5}
                  rows={3}
                  value={requeueJustification}
                  onChange={(e) => setRequeueJustification(e.target.value)}
                  placeholder="e.g. Corrected upstream customer invoice tax record"
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRequeueModal(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || requeueJustification.trim().length < 5}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold disabled:opacity-50"
                >
                  Confirm Requeue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
