import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Ban,
  Receipt,
  User,
  Activity,
  CreditCard,
} from 'lucide-react';
import { packageService } from '../../services/packageService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type {
  PackageEntitlementWithRelations,
  PackageStatus,
} from '../../types/models';

export const PackageEntitlementDetailPage: React.FC = () => {
  const { entitlementId } = useParams<{ entitlementId: string }>();
  const { activePractice } = usePractice();
  const { isOwner, isManager } = useRole();
  const canAdminister = isOwner || isManager;

  const [entitlement, setEntitlement] = useState<PackageEntitlementWithRelations | null>(null);
  const [consumptions, setConsumptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [isSubmittingExtend, setIsSubmittingExtend] = useState(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const [isActivating, setIsActivating] = useState(false);

  const loadData = async () => {
    if (!activePractice || !entitlementId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [entData, histData] = await Promise.all([
        packageService.getPackageEntitlementById(entitlementId, activePractice.id),
        packageService.getConsumptionHistory(entitlementId, activePractice.id),
      ]);
      setEntitlement(entData);
      setConsumptions(histData);

      // Pre-fill extension date (e.g. +30 days from current expiration or now)
      const baseDate = entData.expires_at ? new Date(entData.expires_at) : new Date();
      baseDate.setDate(baseDate.getDate() + 30);
      setNewExpiresAt(baseDate.toISOString().slice(0, 16));
    } catch (err: any) {
      setError(err.message || 'Failed to load entitlement details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activePractice, entitlementId]);

  const handleActivate = async () => {
    if (!activePractice || !entitlementId) return;
    setIsActivating(true);
    setError(null);
    setActionSuccess(null);
    try {
      await packageService.activatePackage(entitlementId, activePractice.id);
      setActionSuccess('Package entitlement verified and activated successfully.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to activate package.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice || !entitlementId) return;
    if (!extendReason || extendReason.trim().length < 5) {
      setError('Extension reason must be at least 5 characters.');
      return;
    }

    setIsSubmittingExtend(true);
    setError(null);
    setActionSuccess(null);
    try {
      await packageService.extendPackageValidity(
        {
          entitlement_id: entitlementId,
          new_expires_at: new Date(newExpiresAt).toISOString(),
          reason: extendReason.trim(),
        },
        activePractice.id
      );

      setActionSuccess('Package validity extended successfully.');
      setIsExtendModalOpen(false);
      setExtendReason('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to extend package validity.');
    } finally {
      setIsSubmittingExtend(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice || !entitlementId) return;
    if (!cancelReason || cancelReason.trim().length < 5) {
      setError('Cancellation reason must be at least 5 characters.');
      return;
    }

    setIsSubmittingCancel(true);
    setError(null);
    setActionSuccess(null);
    try {
      await packageService.cancelPackage(
        {
          entitlement_id: entitlementId,
          reason: cancelReason.trim(),
        },
        activePractice.id
      );

      setActionSuccess('Package cancelled. Unused sessions have been forfeited.');
      setIsCancelModalOpen(false);
      setCancelReason('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel package.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const formatStatusBadge = (status: PackageStatus) => {
    switch (status) {
      case 'active':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.6rem', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#166534', fontSize: '0.8125rem', fontWeight: 600 }}>
            <CheckCircle2 size={14} /> Active
          </span>
        );
      case 'pending_payment':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.6rem', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', fontSize: '0.8125rem', fontWeight: 600 }}>
            <Clock size={14} /> Pending Payment
          </span>
        );
      case 'completed':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.6rem', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#334155', fontSize: '0.8125rem', fontWeight: 600 }}>
            Completed
          </span>
        );
      case 'expired':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.6rem', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '0.8125rem', fontWeight: 600 }}>
            <AlertTriangle size={14} /> Expired
          </span>
        );
      case 'suspended':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.6rem', borderRadius: '4px', backgroundColor: '#fed7aa', color: '#9a3412', fontSize: '0.8125rem', fontWeight: 600 }}>
            <AlertTriangle size={14} /> Suspended
          </span>
        );
      case 'cancelled':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.6rem', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '0.8125rem', fontWeight: 600 }}>
            <XCircle size={14} /> Cancelled
          </span>
        );
      case 'void':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.6rem', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.8125rem', fontWeight: 600 }}>
            <Ban size={14} /> Void
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number, curr = 'NGN') => {
    return `${curr} ${Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (isLoading) {
    return (
      <div className="page-container" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Loading entitlement details...
      </div>
    );
  }

  if (error && !entitlement) {
    return (
      <div className="page-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
        <Link to="/app/package-entitlements" style={{ color: '#0284c7', textDecoration: 'none' }}>
          &larr; Back to Package Entitlements
        </Link>
      </div>
    );
  }

  if (!entitlement) return null;

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Navigation */}
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/app/package-entitlements" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#0284c7', textDecoration: 'none', fontSize: '0.875rem' }}>
          <ArrowLeft size={16} /> Back to Package Entitlements
        </Link>
      </div>

      {actionSuccess && (
        <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Header Banner */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{entitlement.package_number}</h1>
            {formatStatusBadge(entitlement.status)}
          </div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#334155', margin: '0 0 0.5rem 0' }}>
            {entitlement.definition?.name || 'Treatment Package'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            Modality:{' '}
            <strong style={{ color: '#0284c7' }}>
              {entitlement.definition?.service?.name || 'General Physiotherapy'}
            </strong>
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {entitlement.status === 'pending_payment' && (
            <>
              {entitlement.invoice && (
                <Link
                  to={`/app/invoices/${entitlement.invoice.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: '#16a34a',
                    color: '#fff',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                  }}
                >
                  <CreditCard size={16} /> Pay Invoice ({entitlement.invoice.invoice_number})
                </Link>
              )}
              <button
                onClick={handleActivate}
                disabled={isActivating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: isActivating ? 'not-allowed' : 'pointer',
                }}
              >
                <CheckCircle2 size={16} />
                {isActivating ? 'Verifying...' : 'Verify & Activate'}
              </button>
            </>
          )}

          {canAdminister && (entitlement.status === 'active' || entitlement.status === 'expired') && (
            <button
              onClick={() => setIsExtendModalOpen(true)}
              style={{
                backgroundColor: '#fff',
                color: '#0284c7',
                border: '1px solid #bae6fd',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Extend Validity
            </button>
          )}

          {canAdminister && (entitlement.status === 'active' || entitlement.status === 'suspended') && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              style={{
                backgroundColor: '#fff',
                color: '#ef4444',
                border: '1px solid #fecaca',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Cancel Package
            </button>
          )}
        </div>
      </div>

      {/* Quota & Balances Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>REMAINING SESSIONS</span>
          <strong style={{ fontSize: '2rem', color: entitlement.remaining_sessions && entitlement.remaining_sessions > 0 ? '#166534' : '#64748b' }}>
            {entitlement.remaining_sessions}
          </strong>
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
            Authoritative derived balance
          </span>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>CONSUMED SESSIONS</span>
          <strong style={{ fontSize: '2rem', color: '#0f172a' }}>{entitlement.consumed_sessions}</strong>
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
            Out of {entitlement.total_sessions} total purchased
          </span>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>EXPIRATION DATE</span>
          <strong style={{ fontSize: '1.125rem', color: '#0f172a', display: 'block', marginTop: '0.5rem' }}>
            {formatDate(entitlement.expires_at)}
          </strong>
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
            Validity: {entitlement.validity_days} days from activation
          </span>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>LINKED DEBTOR INVOICE</span>
          {entitlement.invoice ? (
            <div style={{ marginTop: '0.5rem' }}>
              <Link to={`/app/invoices/${entitlement.invoice.id}`} style={{ fontWeight: 600, color: '#0284c7', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Receipt size={16} /> {entitlement.invoice.invoice_number}
              </Link>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                Status: <strong>{entitlement.invoice.status}</strong> &bull; Total: {formatCurrency(entitlement.invoice.grand_total)}
              </div>
            </div>
          ) : (
            '—'
          )}
        </div>
      </div>

      {/* Patient & Provenance Card */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={18} color="#0284c7" /> Patient Provenance
        </h3>
        {entitlement.patient && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <strong style={{ fontSize: '1.125rem', color: '#0f172a' }}>
                {entitlement.patient.first_name} {entitlement.patient.last_name}
              </strong>
              <span style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b' }}>
                Identifier: {entitlement.patient.patient_identifier} &bull; Gender: {entitlement.patient.gender || '—'}
              </span>
            </div>
            <Link
              to={`/app/patients/${entitlement.patient.id}`}
              style={{
                fontSize: '0.875rem',
                color: '#0284c7',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              View Patient EMR &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* Consumption History Ledger */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="#0284c7" /> Append-Only Consumption Ledger
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
              Immutable record of treatment encounters consuming package quota.
            </p>
          </div>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
            {consumptions.length} Record{consumptions.length === 1 ? '' : 's'}
          </span>
        </div>

        {consumptions.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
            No sessions consumed yet. Completed clinical visits for this patient and modality will decrement this package.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                <th style={{ padding: '0.75rem 1rem' }}>#</th>
                <th style={{ padding: '0.75rem 1rem' }}>Consumed At</th>
                <th style={{ padding: '0.75rem 1rem' }}>Clinical Visit</th>
                <th style={{ padding: '0.75rem 1rem' }}>Notes / Context</th>
              </tr>
            </thead>
            <tbody>
              {consumptions.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>{formatDate(item.consumed_at)}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {item.visit ? (
                      <Link to={`/app/visits/${item.clinical_visit_id}`} style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>
                        {item.visit.visit_identifier}
                      </Link>
                    ) : (
                      item.clinical_visit_id
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                    {item.notes || 'Routine encounter checkout'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cancellation Notice if Cancelled */}
      {entitlement.status === 'cancelled' && (
        <div style={{ backgroundColor: '#fee2e2', borderRadius: '8px', border: '1px solid #fca5a5', padding: '1rem', color: '#991b1b', marginBottom: '1.5rem' }}>
          <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Package Cancelled Administratively</strong>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            Reason: {entitlement.cancellation_reason || 'Administrative termination'}. Unused sessions have been forfeited.
          </p>
        </div>
      )}

      {/* Modals: Extend Validity */}
      {isExtendModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 1rem 0' }}>Extend Package Validity</h3>
            <form onSubmit={handleExtend}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  New Expiration Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Justification Reason * (minimum 5 characters)
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Clinical treatment pause approved by clinician due to travel..."
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsExtendModalOpen(false)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExtend}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', backgroundColor: '#0284c7', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  {isSubmittingExtend ? 'Saving...' : 'Confirm Extension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals: Cancel Package */}
      {isCancelModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#991b1b', margin: '0 0 0.5rem 0' }}>Cancel Package Entitlement</h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
              Warning: Cancelling will immediately void all remaining sessions. No monetary cash refunds or credit notes are issued in V1.
            </p>

            <form onSubmit={handleCancel}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Mandatory Cancellation Reason * (minimum 5 characters)
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Patient relocating out of state..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCancel}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', backgroundColor: '#ef4444', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
