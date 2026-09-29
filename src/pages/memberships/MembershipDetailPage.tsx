import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  XCircle,
  Activity,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { membershipService } from '../../services/membershipService';
import { clinicalVisitService } from '../../services/clinicalVisitService';
import { walletService } from '../../services/walletService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type {
  PatientMembershipWithRelations,
  MembershipBillingCycleWithRelations,
  PatientMembershipStatus,
  ClinicalVisit,
  PatientWalletWithBalance,
} from '../../types/models';

export const MembershipDetailPage: React.FC = () => {
  const { membershipId } = useParams<{ membershipId: string }>();
  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant, isReceptionist, isClinician } = useRole();
  const canManage = isOwner || isManager || isReceptionist;
  const canRecordUsage = isOwner || isManager || isReceptionist || isClinician;
  const canSettle = isOwner || isManager || isAccountant || isReceptionist;

  const [membership, setMembership] = useState<PatientMembershipWithRelations | null>(null);
  const [cycles, setCycles] = useState<MembershipBillingCycleWithRelations[]>([]);
  const [patientWallet, setPatientWallet] = useState<PatientWalletWithBalance | null>(null);
  const [recentVisits, setRecentVisits] = useState<ClinicalVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [selectedVisitId, setSelectedVisitId] = useState('');
  const [usageNotes, setUsageNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    if (!activePractice || !membershipId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [mbrData, cyclesData] = await Promise.all([
        membershipService.getMembershipById(membershipId, activePractice.id),
        membershipService.getMembershipCycles(membershipId, activePractice.id),
      ]);

      if (!mbrData) {
        setError('Membership agreement not found.');
        return;
      }

      setMembership(mbrData);
      setCycles(cyclesData);

      // Load patient wallet & visits if available
      if (mbrData.patient_id) {
        try {
          const wallet = await walletService.getWalletByPatientId(mbrData.patient_id, activePractice.id);
          setPatientWallet(wallet);
        } catch (wErr) {
          // Wallet might not exist yet or non-critical
        }

        try {
          const visitsData = await clinicalVisitService.getClinicalVisits({
            patientId: mbrData.patient_id,
            status: 'completed',
          });
          setRecentVisits(visitsData.visits);
          if (visitsData.visits.length > 0) {
            setSelectedVisitId(visitsData.visits[0].id);
          }
        } catch (vErr) {
          // Non-critical
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load membership details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activePractice, membershipId]);

  const handlePauseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membershipId || !activePractice) return;
    if (!actionReason.trim() || actionReason.trim().length < 5) {
      setModalError('A valid pause justification of at least 5 characters is required.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      await membershipService.pauseMembership(
        { membership_id: membershipId, reason: actionReason.trim() },
        activePractice.id
      );
      setShowPauseModal(false);
      setActionReason('');
      setSuccessMessage('Membership paused successfully.');
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to pause membership.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResume = async () => {
    if (!membershipId || !activePractice) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await membershipService.resumeMembership(
        { membership_id: membershipId },
        activePractice.id
      );
      setSuccessMessage('Membership resumed successfully.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to resume membership.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membershipId || !activePractice) return;
    if (!actionReason.trim() || actionReason.trim().length < 5) {
      setModalError('A valid cancellation reason of at least 5 characters is required.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      await membershipService.cancelMembership(
        { membership_id: membershipId, reason: actionReason.trim() },
        activePractice.id
      );
      setShowCancelModal(false);
      setActionReason('');
      setSuccessMessage('Membership agreement cancelled.');
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to cancel membership.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUsageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membership || !activePractice) return;
    const activeCycle = cycles.find((c) => c.status === 'active');
    if (!activeCycle) {
      setModalError('No active billing cycle available to deduct sessions.');
      return;
    }

    if (!selectedVisitId) {
      setModalError('Please select a completed clinical visit encounter.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      await membershipService.recordVisitUsage(
        {
          cycle_id: activeCycle.id,
          clinical_visit_id: selectedVisitId,
          notes: usageNotes.trim() || undefined,
        },
        activePractice.id
      );
      setShowUsageModal(false);
      setUsageNotes('');
      setSuccessMessage('Clinical session successfully recorded against active membership cycle.');
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to record session usage.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWalletSettleSubmit = async (cycle: MembershipBillingCycleWithRelations) => {
    if (!activePractice || !patientWallet || !cycle.invoice) return;
    const amountToSettle = Number(cycle.invoice.balance_due);
    if (patientWallet.balance < amountToSettle) {
      setError(`Insufficient wallet funds (Balance: ₦${patientWallet.balance.toLocaleString()}, Due: ₦${amountToSettle.toLocaleString()}).`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await walletService.settleInvoiceFromWallet(
        {
          wallet_id: patientWallet.id,
          invoice_id: cycle.invoice.id,
          amount: amountToSettle,
          notes: `Settlement for Membership Cycle #${cycle.cycle_number}`,
        },
        activePractice.id
      );
      setSuccessMessage(`Invoice settled from wallet! Cycle #${cycle.cycle_number} entitlement is now active.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Wallet settlement failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number, curr = 'NGN') => {
    return `${curr} ${Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusBadge = (status: PatientMembershipStatus) => {
    switch (status) {
      case 'active':
        return { label: 'Active', bg: '#ecfdf5', color: '#047857', icon: CheckCircle2 };
      case 'pending_payment':
        return { label: 'Pending Payment', bg: '#fef3c7', color: '#b45309', icon: Clock };
      case 'paused':
        return { label: 'Paused', bg: '#f1f5f9', color: '#475569', icon: PauseCircle };
      case 'suspended':
        return { label: 'Suspended', bg: '#fee2e2', color: '#b91c1c', icon: AlertCircle };
      case 'cancelled':
        return { label: 'Cancelled', bg: '#f1f5f9', color: '#64748b', icon: XCircle };
      case 'completed':
        return { label: 'Completed', bg: '#eff6ff', color: '#1d4ed8', icon: CheckCircle2 };
      default:
        return { label: status, bg: '#f1f5f9', color: '#64748b', icon: Clock };
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Loading membership agreement...
      </div>
    );
  }

  if (error || !membership) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={20} />
          {error || 'Membership not found.'}
        </div>
        <div style={{ marginTop: '1rem' }}>
          <Link to="/app/memberships" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>
            <ArrowLeft size={16} /> Back to Memberships
          </Link>
        </div>
      </div>
    );
  }

  const badge = getStatusBadge(membership.status);
  const StatusIcon = badge.icon;
  const activeCycle = cycles.find((c) => c.status === 'active');
  const allUsageEntries = cycles.flatMap((c) => c.usage_entries || []);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumb & Navigation */}
      <div style={{ marginBottom: '1rem' }}>
        <Link
          to="/app/memberships"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}
        >
          <ArrowLeft size={14} /> Back to Patient Memberships
        </Link>
      </div>

      {/* Header Profile Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#0f172a', fontFamily: 'monospace' }}>
              {membership.membership_number}
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.625rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: badge.bg,
                color: badge.color,
              }}
            >
              <StatusIcon size={12} />
              {badge.label}
            </span>
          </div>

          <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            {membership.plan?.name}
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: '#64748b' }}>
            <div>
              <span style={{ color: '#94a3b8' }}>Patient: </span>
              <Link to={`/app/patients/${membership.patient_id}`} style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
                {membership.patient ? `${membership.patient.first_name} ${membership.patient.last_name}` : 'Patient'}
              </Link>{' '}
              ({membership.patient?.patient_identifier})
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Billing Anchor: </span>
              <strong style={{ color: '#334155' }}>Day {membership.billing_anchor_day}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Cadence: </span>
              <strong style={{ color: '#334155', textTransform: 'capitalize' }}>{membership.plan?.billing_frequency}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Commenced: </span>
              <strong style={{ color: '#334155' }}>{membership.start_date}</strong>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        {canManage && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {canRecordUsage && activeCycle && (
              <button
                onClick={() => {
                  setModalError(null);
                  setShowUsageModal(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#0284c7',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <Activity size={16} />
                Deduct Visit Session
              </button>
            )}

            {membership.status === 'active' && (
              <button
                onClick={() => {
                  setModalError(null);
                  setShowPauseModal(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                <PauseCircle size={16} />
                Pause
              </button>
            )}

            {membership.status === 'paused' && (
              <button
                onClick={handleResume}
                disabled={isSubmitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#10b981',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <PlayCircle size={16} />
                Resume Agreement
              </button>
            )}

            {!['cancelled', 'completed'].includes(membership.status) && (
              <button
                onClick={() => {
                  setModalError(null);
                  setShowCancelModal(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#b91c1c',
                  cursor: 'pointer',
                }}
              >
                <XCircle size={16} />
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '6px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <CheckCircle2 size={16} />
          {successMessage}
        </div>
      )}

      {/* Active Cycle Entitlement Banner */}
      <div style={{ marginBottom: '1.5rem' }}>
        {activeCycle ? (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <ShieldCheck size={18} color="#16a34a" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#166534' }}>
                  Active Billing Cycle #{activeCycle.cycle_number} Entitlement
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#15803d' }}>
                Period: <strong>{activeCycle.cycle_start_date}</strong> through <strong>{activeCycle.cycle_end_date}</strong>. Sessions expire at cycle conclusion (Zero rollover invariant).
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#166534' }}>
                {activeCycle.remaining_quota} / {activeCycle.session_quota}{' '}
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>sessions left</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
                {activeCycle.used_quota} sessions consumed
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Clock size={18} color="#d97706" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#92400e' }}>
                  No Active Cycle Entitlement
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#b45309' }}>
                {membership.status === 'pending_payment'
                  ? 'Entitlement will activate automatically as soon as Cycle #1 invoice is settled in full.'
                  : 'Membership is currently not active or waiting for renewal settlement.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Billing Cycles & Consumption Ledger */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {/* Billing Cycles History */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="#0284c7" />
              Billing Cycles & Authoritative Invoices
            </h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>CYCLE #</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>PERIOD</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>BILLING DATE</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>TARIFF</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>INVOICE</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>QUOTA / USAGE</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((cyc) => {
                  const isPaid = cyc.invoice?.status === 'paid';
                  const balanceDue = Number(cyc.invoice?.balance_due || 0);
                  const canSettleWallet = canSettle && !isPaid && balanceDue > 0 && patientWallet && patientWallet.balance >= balanceDue;

                  return (
                    <tr key={cyc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                        Cycle #{cyc.cycle_number}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                        {cyc.cycle_start_date} to {cyc.cycle_end_date}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                        {cyc.billing_date}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                        {formatCurrency(Number(cyc.cycle_price), cyc.currency)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {cyc.invoice ? (
                          <div>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0284c7' }}>
                              {cyc.invoice.invoice_number}
                            </span>
                            <div style={{ fontSize: '0.75rem', color: isPaid ? '#16a34a' : '#b45309' }}>
                              {isPaid ? 'Fully Paid' : `Due: ${formatCurrency(balanceDue)}`}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>None</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ fontWeight: 700, color: '#0284c7' }}>
                          {cyc.remaining_quota} left
                        </span>{' '}
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                          ({cyc.used_quota} used / {cyc.session_quota} total)
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '12px',
                            backgroundColor:
                              cyc.status === 'active'
                                ? '#ecfdf5'
                                : cyc.status === 'invoiced'
                                ? '#fef3c7'
                                : '#f1f5f9',
                            color:
                              cyc.status === 'active'
                                ? '#047857'
                                : cyc.status === 'invoiced'
                                ? '#b45309'
                                : '#64748b',
                          }}
                        >
                          {cyc.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        {canSettleWallet && (
                          <button
                            onClick={() => handleWalletSettleSubmit(cyc)}
                            disabled={isSubmitting}
                            title="Settle balance from patient wallet"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#0f172a',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <Wallet size={12} />
                            Pay with Wallet
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Append-Only Clinical Usage Ledger */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="#0284c7" />
              Append-Only Membership Usage Ledger
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
              Immutable audit log of clinical encounters decremented against active subscription cycles.
            </p>
          </div>

          {allUsageEntries.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              Zero sessions consumed yet. Usage will be recorded upon clinical visit execution.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>RECORDED AT</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>CLINICAL ENCOUNTER</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>SERVICE MODALITY</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>SESSIONS CONSUMED</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>NOTES</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsageEntries.map((entry) => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0284c7' }}>
                          {entry.visit?.visit_identifier || entry.clinical_visit_id}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                        {entry.service?.name || 'Physiotherapy Treatment'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                        {Number(entry.sessions_consumed).toFixed(1)} session
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8125rem' }}>
                        {entry.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Record Visit Usage Modal */}
      {showUsageModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '1rem',
          }}
        >
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', maxWidth: '500px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
              Deduct Membership Session
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '0 0 1rem 0' }}>
              Record 1.0 session deduction against active Cycle #{activeCycle?.cycle_number} for an executed clinical encounter.
            </p>

            {modalError && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleUsageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Select Completed Clinical Visit *
                </label>
                {recentVisits.length === 0 ? (
                  <div style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '6px', fontSize: '0.8125rem', color: '#64748b' }}>
                    No completed visits found for this patient. Care documentation must be recorded first.
                  </div>
                ) : (
                  <select
                    value={selectedVisitId}
                    onChange={(e) => setSelectedVisitId(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  >
                    {recentVisits.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.visit_identifier} ({v.actual_start ? new Date(v.actual_start).toLocaleDateString() : 'Visit'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Clinical Encounter Notes / Reason
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Session 2 of chronic lumbar maintenance"
                  value={usageNotes}
                  onChange={(e) => setUsageNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowUsageModal(false)}
                  disabled={isSubmitting}
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || recentVisits.length === 0}
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Recording...' : 'Deduct 1 Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {showPauseModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', maxWidth: '480px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
              Pause Membership Agreement
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '0 0 1rem 0' }}>
              Temporarily halts session usage and future renewal cycle generation.
            </p>

            {modalError && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handlePauseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Pause Justification (min 5 chars) *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Patient travelling abroad for 4 weeks"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPauseModal(false)}
                  disabled={isSubmitting}
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#475569', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Pausing...' : 'Confirm Pause'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', maxWidth: '480px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#991b1b' }}>
              Cancel Membership Agreement
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '0 0 1rem 0' }}>
              Permanently terminates future renewal cycles. Current cycle quota remains valid until cycle expiration (Zero mid-cycle proration invariant).
            </p>

            {modalError && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleCancelSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Cancellation Reason (min 5 chars) *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Relocated to another state / treatment goals concluded"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={isSubmitting}
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Keep Agreement
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#b91c1c', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default MembershipDetailPage;
