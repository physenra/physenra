import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Wallet,
  Search,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Filter,
} from 'lucide-react';
import { walletService } from '../../services/walletService';
import { patientService } from '../../services/patientService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type { PatientWalletWithBalance, Patient, PaymentMethod, WalletStatus } from '../../types/models';

export const WalletListPage: React.FC = () => {
  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant, isReceptionist } = useRole();
  const canTransact = isOwner || isManager || isAccountant || isReceptionist;

  const [searchParams, setSearchParams] = useSearchParams();
  const [wallets, setWallets] = useState<PatientWalletWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const statusFilter = (searchParams.get('status') as WalletStatus | 'all') || 'all';
  const searchQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Deposit modal state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [depositAmount, setDepositAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadWallets = async () => {
    if (!activePractice) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await walletService.getWallets(activePractice.id, {
        status: statusFilter,
        searchQuery: searchQuery || undefined,
      });
      setWallets(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load patient wallets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWallets();
  }, [activePractice, statusFilter, searchQuery]);

  // Load patients for deposit modal
  useEffect(() => {
    if (activePractice && showDepositModal && patients.length === 0) {
      patientService
        .getPatients({ limit: 100 })
        .then((res) => setPatients(res.patients))
        .catch(console.error);
    }
  }, [activePractice, showDepositModal, patients.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('q', searchInput.trim());
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };

  const handleStatusChange = (status: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (status !== 'all') {
      newParams.set('status', status);
    } else {
      newParams.delete('status');
    }
    setSearchParams(newParams);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice) return;
    if (!selectedPatientId) {
      setFormError('Please select a patient.');
      return;
    }
    if (!depositAmount || Number(depositAmount) <= 0) {
      setFormError('Please enter a positive deposit amount.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await walletService.depositToWallet(
        {
          patient_id: selectedPatientId,
          amount: Number(depositAmount),
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim() || null,
          notes: notes.trim() || null,
        },
        activePractice.id
      );

      setShowDepositModal(false);
      setSelectedPatientId('');
      setDepositAmount('');
      setReferenceNumber('');
      setNotes('');
      await loadWallets();
    } catch (err: any) {
      setFormError(err.message || 'Failed to complete wallet deposit.');
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

  // Metrics
  const totalHeldBalance = wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);
  const activeCount = wallets.filter((w) => w.status === 'active').length;
  const suspendedCount = wallets.filter((w) => w.status === 'suspended').length;

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header & Quick Links */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wallet size={28} color="#0284c7" />
            Patient Wallets
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
            Pre-funded patient credit balances, advance deposits, overpayment conversion & invoice settlements.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {canTransact && (
            <button
              onClick={() => setShowDepositModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              Receive Advance Deposit
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
            <span>Total Credit Held</span>
            <DollarSign size={16} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: '0.5rem' }}>
            {formatCurrency(totalHeldBalance)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Across {wallets.length} patient accounts
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
            <span>Active Wallets</span>
            <CheckCircle2 size={16} color="#16a34a" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a', marginTop: '0.5rem' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Ready for billing settlement
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
            <span>Suspended / Inactive</span>
            <AlertCircle size={16} color="#eab308" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#475569', marginTop: '0.5rem' }}>
            {suspendedCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Administrative hold or review
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by wallet # (e.g. WLT-000001), patient name, or ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Filter size={16} color="#64748b" />
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Status:</span>
          {(['all', 'active', 'suspended', 'closed'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => handleStatusChange(status)}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
                border: statusFilter === status ? '1px solid #0284c7' : '1px solid #e2e8f0',
                backgroundColor: statusFilter === status ? '#e0f2fe' : '#ffffff',
                color: statusFilter === status ? '#0284c7' : '#64748b',
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Wallet Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <Clock size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }} />
            <p>Loading patient wallets...</p>
          </div>
        ) : wallets.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Wallet size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
              No Patient Wallets Found
            </h3>
            <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto 1.5rem', fontSize: '0.875rem' }}>
              {searchQuery || statusFilter !== 'all'
                ? 'No patient wallets match your active search or filter criteria.'
                : 'Patient wallets are automatically provisioned when receiving advance deposits or settling clinical invoices.'}
            </p>
            {canTransact && (
              <button
                onClick={() => setShowDepositModal(true)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Receive First Advance Deposit
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Wallet #</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Patient Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Patient ID</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Available Credit</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Created At</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((wallet) => (
                  <tr key={wallet.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                      <Link
                        to={`/app/wallets/${wallet.id}`}
                        style={{ color: '#0284c7', textDecoration: 'none', fontFamily: 'monospace' }}
                      >
                        {wallet.wallet_number}
                      </Link>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#0f172a' }}>
                      {wallet.patient ? (
                        <Link
                          to={`/app/patients/${wallet.patient.id}`}
                          style={{ color: '#0f172a', textDecoration: 'none' }}
                        >
                          {wallet.patient.first_name} {wallet.patient.last_name}
                        </Link>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Unknown Patient</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontFamily: 'monospace' }}>
                      {wallet.patient?.patient_identifier || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700 }}>
                      <span
                        style={{
                          color: wallet.balance > 0 ? '#16a34a' : '#64748b',
                          backgroundColor: wallet.balance > 0 ? '#f0fdf4' : '#f8fafc',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          display: 'inline-block',
                        }}
                      >
                        {formatCurrency(wallet.balance, wallet.currency)}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
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
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                      {new Date(wallet.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <Link
                        to={`/app/wallets/${wallet.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.375rem 0.75rem',
                          backgroundColor: '#f8fafc',
                          color: '#334155',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        Ledger & Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Advance Deposit Modal */}
      {showDepositModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} color="#0284c7" />
                Receive Advance Deposit
              </h3>
              <button
                type="button"
                onClick={() => setShowDepositModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Crediting a patient wallet creates an authoritative receipt and confirmed payment record in the ledger.
            </p>

            {formError && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleDepositSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Select Patient *
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="">-- Choose a patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.patient_identifier})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Deposit Amount (NGN) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value ? parseFloat(e.target.value) : '')}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="pos">POS / Terminal</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Reference Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bank transfer session ID / POS ref"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Deposit Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Advance prepayment for rehabilitation series"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  disabled={isSubmitting}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmitting ? 'Processing Deposit...' : 'Confirm Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
