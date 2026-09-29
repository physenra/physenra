import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Repeat,
  Search,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  PauseCircle,
  XCircle,
  Layers,
  ArrowRight,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { membershipService } from '../../services/membershipService';
import { patientService } from '../../services/patientService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type {
  PatientMembershipWithRelations,
  MembershipPlanWithService,
  Patient,
  PatientMembershipStatus,
} from '../../types/models';

export const MembershipListPage: React.FC = () => {
  const navigate = useNavigate();
  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant, isReceptionist } = useRole();
  const canEnroll = isOwner || isManager || isAccountant || isReceptionist;

  const [memberships, setMemberships] = useState<PatientMembershipWithRelations[]>([]);
  const [plans, setPlans] = useState<MembershipPlanWithService[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Enroll Modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoRenew, setAutoRenew] = useState(true);
  const [enrollNotes, setEnrollNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Batch renewal loading
  const [isGeneratingRenewals, setIsGeneratingRenewals] = useState(false);

  const loadData = async () => {
    if (!activePractice) return;
    setIsLoading(true);
    setError(null);
    try {
      const [membershipsData, plansData] = await Promise.all([
        membershipService.getMemberships(activePractice.id, {
          status: statusFilter === 'all' ? undefined : (statusFilter as PatientMembershipStatus),
          searchQuery: searchQuery || undefined,
        }),
        membershipService.getPlans(activePractice.id, { status: 'active' }),
      ]);
      setMemberships(membershipsData);
      setPlans(plansData);
      if (plansData.length > 0 && !selectedPlanId) {
        setSelectedPlanId(plansData[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load memberships.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activePractice, statusFilter, searchQuery]);

  // Load patients for modal
  const handleOpenEnrollModal = async () => {
    if (!activePractice) return;
    setModalError(null);
    setShowEnrollModal(true);
    try {
      const patientsResult = await patientService.getPatients({ limit: 100 });
      setPatients(patientsResult.patients);
      if (patientsResult.patients.length > 0 && !selectedPatientId) {
        setSelectedPatientId(patientsResult.patients[0].id);
      }
    } catch (err: any) {
      setModalError('Failed to load patients list.');
    }
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice) return;
    setModalError(null);

    if (!selectedPatientId) {
      setModalError('Please select a patient to enroll.');
      return;
    }

    if (!selectedPlanId) {
      setModalError('Please select a membership plan.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await membershipService.enrollPatient(
        {
          patient_id: selectedPatientId,
          plan_id: selectedPlanId,
          start_date: startDate,
          auto_renew: autoRenew,
          notes: enrollNotes.trim() || undefined,
        },
        activePractice.id
      );

      setShowEnrollModal(false);
      setSuccessMessage(`Successfully enrolled! Membership number: ${res.membership_number}. Initial invoice generated.`);
      await loadData();
      navigate(`/app/memberships/${res.membership_id}`);
    } catch (err: any) {
      setModalError(err.message || 'Enrollment failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateRenewals = async () => {
    if (!activePractice) return;
    setIsGeneratingRenewals(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await membershipService.generateRenewalCycles(activePractice.id);
      setSuccessMessage(`Batch renewal check completed. ${res.cycles_generated} new billing cycle(s) generated.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to generate renewal cycles.');
    } finally {
      setIsGeneratingRenewals(false);
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

  // Metrics
  const activeCount = memberships.filter((m) => m.status === 'active').length;
  const pendingCount = memberships.filter((m) => m.status === 'pending_payment').length;
  const pastDueCount = memberships.filter((m) => m.status === 'suspended').length;

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Repeat size={28} color="#0284c7" />
            Patient Memberships
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
            Manage recurring care agreements, anniversary billing anchors, cycle invoices & clinical quota entitlement.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            to="/app/membership-plans"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#334155',
              textDecoration: 'none',
            }}
          >
            <Layers size={16} />
            Plans Catalog
          </Link>

          {canEnroll && (
            <>
              <button
                onClick={handleGenerateRenewals}
                disabled={isGeneratingRenewals}
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
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={16} className={isGeneratingRenewals ? 'animate-spin' : ''} />
                {isGeneratingRenewals ? 'Processing...' : 'Run Renewals'}
              </button>

              <button
                onClick={handleOpenEnrollModal}
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
                <Plus size={16} />
                Enroll Patient
              </button>
            </>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <UserCheck size={16} />
            TOTAL ENROLLED
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{memberships.length}</div>
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <CheckCircle2 size={16} />
            ACTIVE AGREEMENTS
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{activeCount}</div>
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <Clock size={16} />
            PENDING PAYMENT
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{pendingCount}</div>
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <AlertCircle size={16} />
            SUSPENDED / PAST DUE
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{pastDueCount}</div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '6px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <CheckCircle2 size={16} />
          {successMessage}
        </div>
      )}

      {error && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 250px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by membership number, patient name, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2.25rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff',
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#ffffff' }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="paused">Paused</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Memberships Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Loading patient memberships...
        </div>
      ) : memberships.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <Repeat size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#334155', margin: '0 0 0.25rem 0' }}>No patient memberships found</h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search criteria.'
              : 'Enroll your first patient into a recurring membership.'}
          </p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>MEMBERSHIP #</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>PATIENT</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>PLAN / CADENCE</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>ANCHOR DAY</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>ACTIVE QUOTA</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((mbr) => {
                  const badge = getStatusBadge(mbr.status);
                  const Icon = badge.icon;
                  const activeCycle = mbr.active_cycle;

                  return (
                    <tr
                      key={mbr.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                        <Link to={`/app/memberships/${mbr.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {mbr.membership_number}
                        </Link>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {mbr.patient ? `${mbr.patient.first_name} ${mbr.patient.last_name}` : 'Unknown Patient'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {mbr.patient?.patient_identifier}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>
                          {mbr.plan?.name || 'Assigned Plan'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize' }}>
                          {mbr.plan?.billing_frequency} • {formatCurrency(Number(mbr.plan?.cycle_price || 0))}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                        Day {mbr.billing_anchor_day} of month
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: badge.bg,
                            color: badge.color,
                          }}
                        >
                          <Icon size={12} />
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {activeCycle ? (
                          <div>
                            <div style={{ fontWeight: 700, color: activeCycle.remaining_quota > 0 ? '#0284c7' : '#ef4444' }}>
                              {activeCycle.remaining_quota} / {activeCycle.session_quota} sessions
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              Cycle #{activeCycle.cycle_number} ({activeCycle.cycle_start_date} to {activeCycle.cycle_end_date})
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No active cycle</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <Link
                          to={`/app/memberships/${mbr.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            color: '#0f172a',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          Manage
                          <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enroll Patient Modal */}
      {showEnrollModal && (
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
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '540px',
              width: '100%',
              padding: '1.5rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
              Enroll Patient in Membership
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '0 0 1.25rem 0' }}>
              Establish an ongoing care agreement with periodic cycle entitlement and authoritative billing demand.
            </p>

            {modalError && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleEnrollSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Select Patient *
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.patient_identifier})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Select Membership Plan *
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                >
                  {plans.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.plan_code} - {pl.name} ({pl.billing_frequency} • {formatCurrency(Number(pl.cycle_price))})
                    </option>
                  ))}
                </select>
              </div>

              {selectedPlan && (
                <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '0.8125rem' }}>
                  <div style={{ fontWeight: 600, color: '#166534', marginBottom: '0.25rem' }}>Plan Terms Snapshot</div>
                  <div style={{ color: '#15803d' }}>
                    Included Service: {selectedPlan.service?.name || 'General Physiotherapy'}
                  </div>
                  <div style={{ color: '#15803d' }}>
                    Quota: {selectedPlan.cycle_session_quota} sessions per {selectedPlan.billing_frequency} cycle
                  </div>
                  <div style={{ color: '#15803d', fontWeight: 700 }}>
                    Fee: {formatCurrency(Number(selectedPlan.cycle_price))} (Invoice created upon enrollment)
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Agreement Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={autoRenew}
                      onChange={(e) => setAutoRenew(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    Enable Auto-Renewal
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                    Generates renewal cycles automatically on billing anchor day
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Enrollment Notes / Referral
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Recommended by Dr. Adeleke for lumbar maintenance conditioning"
                  value={enrollNotes}
                  onChange={(e) => setEnrollNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
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
                  {isSubmitting ? 'Enrolling...' : 'Confirm Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default MembershipListPage;
