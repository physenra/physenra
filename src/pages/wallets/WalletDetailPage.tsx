import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Sliders,
  DollarSign,
  FileText,
  CreditCard,
  User,
} from 'lucide-react';
import { walletService } from '../../services/walletService';
import { billingService } from '../../services/billingService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type {
  PatientWalletWithBalance,
  PaymentMethod,
  WalletStatus,
  Invoice,
} from '../../types/models';

export const WalletDetailPage: React.FC = () => {
  const { walletId } = useParams<{ walletId: string }>();
  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant, isReceptionist } = useRole();
  const canTransact = isOwner || isManager || isAccountant || isReceptionist;
  const canAdjust = isOwner || isManager || isAccountant;

  const [wallet, setWallet] = useState<PatientWalletWithBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [depositNotes, setDepositNotes] = useState('');

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState('');

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<WalletStatus>('suspended');
  const [statusReason, setStatusReason] = useState('');

  const [showSettleModal, setShowSettleModal] = useState(false);
  const [openInvoices, setOpenInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [settleNotes, setSettleNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadWallet = async () => {
    if (!activePractice || !walletId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await walletService.getWalletById(walletId, activePractice.id);
      setWallet(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load wallet details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, [activePractice, walletId]);

  // Load unpaid invoices for this patient when settle modal opens
  useEffect(() => {
    if (activePractice && wallet && showSettleModal) {
      billingService
        .getInvoices(activePractice.id, {
          patientId: wallet.patient_id,
          status: 'issued',
        })
        .then((invs) => {
          const unpaid = invs.filter((inv) => Number(inv.balance_due) > 0);
          setOpenInvoices(unpaid);
          if (unpaid.length > 0) {
            setSelectedInvoiceId(unpaid[0].id);
            setSettleAmount(Math.min(Number(unpaid[0].balance_due), Number(wallet.balance)));
          }
        })
        .catch(console.error);
    }
  }, [activePractice, wallet, showSettleModal]);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice || !wallet) return;
    if (!depositAmount || Number(depositAmount) <= 0) {
      setModalError('Please enter a positive deposit amount.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      await walletService.depositToWallet(
        {
          patient_id: wallet.patient_id,
          amount: Number(depositAmount),
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim() || null,
          notes: depositNotes.trim() || null,
        },
        activePractice.id
      );

      setShowDepositModal(false);
      setDepositAmount('');
      setReferenceNumber('');
      setDepositNotes('');
      await loadWallet();
    } catch (err: any) {
      setModalError(err.message || 'Deposit failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice || !wallet) return;
    if (!adjustAmount || Number(adjustAmount) === 0) {
      setModalError('Adjustment amount cannot be zero.');
      return;
    }
    if (!adjustReason.trim()) {
      setModalError('Please provide a mandatory audit rationale for this balance adjustment.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      await walletService.adjustWalletBalance(
        {
          wallet_id: wallet.id,
          amount: Number(adjustAmount),
          reason: adjustReason.trim(),
        },
        activePractice.id
      );

      setShowAdjustModal(false);
      setAdjustAmount('');
      setAdjustReason('');
      await loadWallet();
    } catch (err: any) {
      setModalError(err.message || 'Balance adjustment failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice || !wallet) return;
    if (!statusReason.trim()) {
      setModalError('Please provide a reason for changing wallet status.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      await walletService.updateWalletStatus(
        {
          wallet_id: wallet.id,
          status: newStatus,
          reason: statusReason.trim(),
        },
        activePractice.id
      );

      setShowStatusModal(false);
      setStatusReason('');
      await loadWallet();
    } catch (err: any) {
      setModalError(err.message || 'Failed to update wallet status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice || !wallet) return;
    if (!selectedInvoiceId) {
      setModalError('Please select an invoice to settle.');
      return;
    }
    if (!settleAmount || Number(settleAmount) <= 0) {
      setModalError('Please enter a valid settlement amount.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      await walletService.settleInvoiceFromWallet(
        {
          wallet_id: wallet.id,
          invoice_id: selectedInvoiceId,
          amount: Number(settleAmount),
          notes: settleNotes.trim() || null,
        },
        activePractice.id
      );

      setShowSettleModal(false);
      setSelectedInvoiceId('');
      setSettleAmount('');
      setSettleNotes('');
      await loadWallet();
    } catch (err: any) {
      setModalError(err.message || 'Invoice settlement failed.');
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

  const getEntryBadge = (entryType: string) => {
    switch (entryType) {
      case 'deposit':
        return { label: 'Advance Deposit', bg: '#dcfce7', color: '#15803d' };
      case 'overpayment_conversion':
        return { label: 'Overpayment Credit', bg: '#e0f2fe', color: '#0369a1' };
      case 'invoice_settlement':
        return { label: 'Invoice Settlement', bg: '#fef3c7', color: '#b45309' };
      case 'manual_adjustment':
        return { label: 'Manual Adjustment', bg: '#f3e8ff', color: '#7e22ce' };
      case 'void_reversal':
        return { label: 'Void Reversal', bg: '#fee2e2', color: '#b91c1c' };
      default:
        return { label: entryType, bg: '#f1f5f9', color: '#475569' };
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <Clock size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }} />
        <p>Loading patient wallet details...</p>
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <Link
          to="/app/wallets"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#0284c7', textDecoration: 'none', marginBottom: '1rem', fontSize: '0.875rem' }}
        >
          <ArrowLeft size={16} /> Back to Wallets
        </Link>
        <div style={{ padding: '1.5rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} /> Error Loading Wallet
          </h3>
          <p style={{ margin: 0 }}>{error || 'Patient wallet record could not be found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back Navigation */}
      <div style={{ marginBottom: '1rem' }}>
        <Link
          to="/app/wallets"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#0284c7', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}
        >
          <ArrowLeft size={16} /> Back to Patient Wallets
        </Link>
      </div>

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>
              {wallet.wallet_number}
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.625rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor:
                  wallet.status === 'active'
                    ? '#dcfce7'
                    : wallet.status === 'suspended'
                    ? '#fef3c7'
                    : '#f1f5f9',
                color:
                  wallet.status === 'active'
                    ? '#15803d'
                    : wallet.status === 'suspended'
                    ? '#b45309'
                    : '#475569',
                textTransform: 'capitalize',
              }}
            >
              {wallet.status === 'active' && <CheckCircle2 size={12} />}
              {wallet.status === 'suspended' && <AlertCircle size={12} />}
              {wallet.status === 'closed' && <XCircle size={12} />}
              {wallet.status}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
            Provisioned on {new Date(wallet.created_at).toLocaleDateString()} &bull; Currency: {wallet.currency}
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {canTransact && wallet.status === 'active' && (
            <>
              <button
                type="button"
                onClick={() => setShowDepositModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Plus size={16} />
                Receive Deposit
              </button>

              <button
                type="button"
                onClick={() => setShowSettleModal(true)}
                disabled={wallet.balance <= 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: wallet.balance > 0 ? '#0f172a' : '#cbd5e1',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: wallet.balance > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                <CreditCard size={16} />
                Settle Invoice
              </button>
            </>
          )}

          {canAdjust && (
            <button
              type="button"
              onClick={() => setShowAdjustModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
              }}
            >
              <Sliders size={16} />
              Manual Adjustment
            </button>
          )}

          {canAdjust && (
            <button
              type="button"
              onClick={() => {
                setNewStatus(wallet.status === 'active' ? 'suspended' : 'active');
                setShowStatusModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#ffffff',
                color: '#64748b',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
              }}
            >
              Status: {wallet.status}
            </button>
          )}
        </div>
      </div>

      {/* Profile & Balance Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Available Balance Card */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Derived Available Balance
              </span>
              <DollarSign size={18} color="#0284c7" />
            </div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: wallet.balance > 0 ? '#15803d' : '#0f172a' }}>
              {formatCurrency(wallet.balance, wallet.currency)}
            </div>
          </div>
          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '0.75rem', color: '#64748b' }}>
            <strong>Append-Only Accounting Invariant:</strong> Balance is mathematically derived from all {wallet.ledger_entries?.length || 0} ledger transactions with zero mutable balance column.
          </div>
        </div>

        {/* Patient Profile Card */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Account Holder Profile
            </span>
            <User size={18} color="#64748b" />
          </div>
          {wallet.patient ? (
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#0f172a' }}>
                <Link to={`/app/patients/${wallet.patient.id}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                  {wallet.patient.first_name} {wallet.patient.last_name}
                </Link>
              </h3>
              <div style={{ fontSize: '0.875rem', color: '#64748b', fontFamily: 'monospace', marginBottom: '0.75rem' }}>
                Patient ID: {wallet.patient.patient_identifier}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {wallet.patient.phone && <div>Phone: {wallet.patient.phone}</div>}
                {wallet.patient.email && <div>Email: {wallet.patient.email}</div>}
              </div>
              <div style={{ marginTop: '1rem' }}>
                <Link
                  to={`/app/patients/${wallet.patient.id}`}
                  style={{ fontSize: '0.875rem', color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}
                >
                  View Complete Patient Record &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Patient details unavailable</div>
          )}
        </div>
      </div>

      {/* Ledger History Section */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Immutable Wallet Ledger
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              Complete append-only audit trail of deposits, settlements, and administrative adjustments.
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
            {wallet.ledger_entries?.length || 0} Transactions
          </span>
        </div>

        {(!wallet.ledger_entries || wallet.ledger_entries.length === 0) ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <FileText size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ margin: 0 }}>No transactions have been recorded in this wallet ledger yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Date & Time</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Reference</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Notes & Audit Trail</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {wallet.ledger_entries.map((entry) => {
                  const badge = getEntryBadge(entry.entry_type);
                  const isPositive = Number(entry.amount) > 0;
                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569', whiteSpace: 'nowrap' }}>
                        {new Date(entry.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {entry.payment && (
                          <Link to={`/app/payments/${entry.payment.id}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                            {entry.payment.payment_number}
                          </Link>
                        )}
                        {entry.invoice && (
                          <Link to={`/app/invoices/${entry.invoice.id}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                            {entry.invoice.invoice_number}
                          </Link>
                        )}
                        {!entry.payment && !entry.invoice && (
                          <span style={{ color: '#94a3b8' }}>Direct Ledger</span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '0.75rem 1rem',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: isPositive ? '#16a34a' : '#b91c1c',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isPositive ? '+' : ''}
                        {formatCurrency(Number(entry.amount), wallet.currency)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#334155', maxWidth: '300px' }}>
                        {entry.notes || '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                        {entry.creator?.display_name ||
                          `${entry.creator?.first_name || ''} ${entry.creator?.last_name || ''}`.trim() ||
                          'System / Staff'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', maxWidth: '480px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Receive Advance Deposit</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Credit funds into {wallet.patient?.first_name} {wallet.patient?.last_name}'s wallet ({wallet.wallet_number}).
            </p>
            {modalError && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {modalError}
              </div>
            )}
            <form onSubmit={handleDepositSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Deposit Amount ({wallet.currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value ? parseFloat(e.target.value) : '')}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#ffffff' }}
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="pos">POS / Terminal</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Bank slip or transaction ID"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Advance deposit for post-operative care"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowDepositModal(false)} disabled={isSubmitting} style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '0.5rem 1rem', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>{isSubmitting ? 'Processing...' : 'Confirm Deposit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Invoice Modal */}
      {showSettleModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', maxWidth: '500px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Settle Invoice from Wallet</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Available Credit: <strong>{formatCurrency(wallet.balance, wallet.currency)}</strong>
            </p>
            {modalError && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {modalError}
              </div>
            )}
            {openInvoices.length === 0 ? (
              <div>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No open invoices found with an outstanding balance for this patient.</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setShowSettleModal(false)} style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Close</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSettleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Select Outstanding Invoice *</label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => {
                      setSelectedInvoiceId(e.target.value);
                      const inv = openInvoices.find((i) => i.id === e.target.value);
                      if (inv) {
                        setSettleAmount(Math.min(Number(inv.balance_due), Number(wallet.balance)));
                      }
                    }}
                    required
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#ffffff' }}
                  >
                    {openInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} — Due: {formatCurrency(Number(inv.balance_due), inv.currency)} (Total: {formatCurrency(Number(inv.grand_total), inv.currency)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Settlement Amount ({wallet.currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={wallet.balance}
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value ? parseFloat(e.target.value) : '')}
                    required
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Cannot exceed available credit of {formatCurrency(wallet.balance, wallet.currency)}</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Notes (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Wallet settlement against consultation session"
                    value={settleNotes}
                    onChange={(e) => setSettleNotes(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setShowSettleModal(false)} disabled={isSubmitting} style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" disabled={isSubmitting} style={{ padding: '0.5rem 1rem', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>{isSubmitting ? 'Processing...' : 'Settle Invoice'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Manual Adjustment Modal */}
      {showAdjustModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', maxWidth: '480px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Manual Balance Adjustment</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Positive values credit the wallet; negative values debit the wallet. Balance cannot go below zero.
            </p>
            {modalError && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {modalError}
              </div>
            )}
            <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Adjustment Amount ({wallet.currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5000 or -2000"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value ? parseFloat(e.target.value) : '')}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Audit Reason *</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Promotional clinical credit authorized by clinic manager"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAdjustModal(false)} disabled={isSubmitting} style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '0.5rem 1rem', backgroundColor: '#7e22ce', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>{isSubmitting ? 'Applying...' : 'Apply Adjustment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', maxWidth: '480px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Update Wallet Status</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Change the operational status for wallet {wallet.wallet_number}.
            </p>
            {modalError && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {modalError}
              </div>
            )}
            <form onSubmit={handleStatusSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>New Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as WalletStatus)}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#ffffff' }}
                >
                  <option value="active">Active (Normal transactions enabled)</option>
                  <option value="suspended">Suspended (Deposits & settlements held)</option>
                  <option value="closed">Closed (Permanently retired account)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>Status Change Reason *</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Account temporary hold pending reconciliation"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowStatusModal(false)} disabled={isSubmitting} style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '0.5rem 1rem', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>{isSubmitting ? 'Updating...' : 'Update Status'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
