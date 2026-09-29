import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Search,
  Plus,
  AlertCircle,
  CheckCircle2,
  Repeat,
  DollarSign,
  Calendar,
  Edit2,
  Archive,
} from 'lucide-react';
import { membershipService } from '../../services/membershipService';
import { serviceCatalogService } from '../../services/serviceCatalogService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type {
  MembershipPlanWithService,
  Service,
  MembershipFrequency,
  CreateMembershipPlanPayload,
} from '../../types/models';

export const MembershipPlanListPage: React.FC = () => {
  const { activePractice } = usePractice();
  const { isOwner, isManager } = useRole();
  const canManagePlans = isOwner || isManager;

  const [plans, setPlans] = useState<MembershipPlanWithService[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [planCode, setPlanCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [billingFrequency, setBillingFrequency] = useState<MembershipFrequency>('monthly');
  const [cyclePrice, setCyclePrice] = useState<number | ''>('');
  const [cycleSessionQuota, setCycleSessionQuota] = useState<number | ''>(4);

  const loadData = async () => {
    if (!activePractice) return;
    setIsLoading(true);
    setError(null);
    try {
      const [plansData, servicesData] = await Promise.all([
        membershipService.getPlans(activePractice.id, {
          status: statusFilter === 'all' ? undefined : (statusFilter as any),
          billingFrequency: frequencyFilter === 'all' ? undefined : (frequencyFilter as any),
          searchQuery: searchQuery || undefined,
        }),
        serviceCatalogService.getServices(activePractice.id, { isActive: true }),
      ]);
      setPlans(plansData);
      setServices(servicesData);
      if (servicesData.length > 0 && !serviceId) {
        setServiceId(servicesData[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load membership plans.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activePractice, statusFilter, frequencyFilter, searchQuery]);

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingPlanId(null);
    setPlanCode('');
    setName('');
    setDescription('');
    setBillingFrequency('monthly');
    setCyclePrice('');
    setCycleSessionQuota(4);
    if (services.length > 0) setServiceId(services[0].id);
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (plan: MembershipPlanWithService) => {
    setIsEditing(true);
    setEditingPlanId(plan.id);
    setPlanCode(plan.plan_code);
    setName(plan.name);
    setDescription(plan.description || '');
    setServiceId(plan.included_service_id);
    setBillingFrequency(plan.billing_frequency);
    setCyclePrice(Number(plan.cycle_price));
    setCycleSessionQuota(plan.cycle_session_quota);
    setModalError(null);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice) return;
    setModalError(null);

    if (!name.trim()) {
      setModalError('Plan name is required.');
      return;
    }

    if (!isEditing && !planCode.trim()) {
      setModalError('Plan code is required.');
      return;
    }

    if (!serviceId) {
      setModalError('Included clinical service is required.');
      return;
    }

    if (!cyclePrice || Number(cyclePrice) <= 0) {
      setModalError('A valid cycle price greater than 0 is required.');
      return;
    }

    if (!cycleSessionQuota || Number(cycleSessionQuota) <= 0) {
      setModalError('Session quota must be at least 1 session.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editingPlanId) {
        await membershipService.updatePlan(
          editingPlanId,
          {
            name: name.trim(),
            description: description.trim() || undefined,
            cycle_price: Number(cyclePrice),
            cycle_session_quota: Number(cycleSessionQuota),
          },
          activePractice.id
        );
      } else {
        const payload: CreateMembershipPlanPayload = {
          plan_code: planCode.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
          included_service_id: serviceId,
          billing_frequency: billingFrequency,
          cycle_price: Number(cyclePrice),
          cycle_session_quota: Number(cycleSessionQuota),
          currency: 'NGN',
          status: 'active',
        };
        await membershipService.createPlan(payload, activePractice.id);
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save membership plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleArchive = async (plan: MembershipPlanWithService) => {
    if (!activePractice) return;
    const newStatus = plan.status === 'active' ? 'archived' : 'active';
    try {
      await membershipService.updatePlan(plan.id, { status: newStatus }, activePractice.id);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update plan status.');
    }
  };

  const formatCurrency = (amount: number, curr = 'NGN') => {
    return `${curr} ${Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const activeCount = plans.filter((p) => p.status === 'active').length;
  const monthlyCount = plans.filter((p) => p.billing_frequency === 'monthly').length;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={28} color="#0284c7" />
            Membership Plans Catalog
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
            Define recurring patient care agreements, billing cadence, cycle tariff, and service quotas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            to="/app/memberships"
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
            <Repeat size={16} />
            Patient Enrollments
          </Link>

          {canManagePlans && (
            <button
              onClick={handleOpenCreateModal}
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
              Create Plan
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <Layers size={16} />
            TOTAL PLANS
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{plans.length}</div>
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <CheckCircle2 size={16} />
            ACTIVE CATALOG PLANS
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{activeCount}</div>
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6366f1', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <Calendar size={16} />
            MONTHLY CADENCE
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{monthlyCount}</div>
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <DollarSign size={16} />
            BILLING ENGINE
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Anniversary Invoiced Demand</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 250px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search plans by code, name, or service..."
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
          value={frequencyFilter}
          onChange={(e) => setFrequencyFilter(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#ffffff' }}
        >
          <option value="all">All Frequencies</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annually">Annually</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#ffffff' }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Plans List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Loading membership plans catalog...
        </div>
      ) : plans.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <Layers size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#334155', margin: '0 0 0.25rem 0' }}>No membership plans found</h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            {searchQuery || frequencyFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'Create your first recurring membership plan to get started.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: '#f1f5f9',
                      color: '#0f172a',
                    }}
                  >
                    {plan.plan_code}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '12px',
                      backgroundColor: plan.status === 'active' ? '#ecfdf5' : '#f1f5f9',
                      color: plan.status === 'active' ? '#047857' : '#64748b',
                    }}
                  >
                    {plan.status.toUpperCase()}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.375rem 0' }}>
                  {plan.name}
                </h3>
                {plan.description && (
                  <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                    {plan.description}
                  </p>
                )}

                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                    <span style={{ color: '#64748b' }}>Clinical Service:</span>
                    <span style={{ fontWeight: 600, color: '#334155' }}>
                      {plan.service ? `${plan.service.name}` : 'General Modality'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                    <span style={{ color: '#64748b' }}>Session Quota:</span>
                    <span style={{ fontWeight: 700, color: '#0284c7' }}>
                      {plan.cycle_session_quota} sessions / cycle
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: '#64748b' }}>Cadence:</span>
                    <span style={{ fontWeight: 600, color: '#334155', textTransform: 'capitalize' }}>
                      {plan.billing_frequency}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Cycle Tariff</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                      {formatCurrency(Number(plan.cycle_price), plan.currency)}
                    </span>
                  </div>

                  {canManagePlans && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleOpenEditModal(plan)}
                        title="Edit Plan"
                        style={{
                          padding: '0.375rem',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          color: '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleArchive(plan)}
                        title={plan.status === 'active' ? 'Archive Plan' : 'Activate Plan'}
                        style={{
                          padding: '0.375rem',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          color: plan.status === 'active' ? '#ef4444' : '#10b981',
                          cursor: 'pointer',
                        }}
                      >
                        <Archive size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      {showModal && (
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
              maxWidth: '520px',
              width: '100%',
              padding: '1.5rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
              {isEditing ? 'Edit Membership Plan' : 'Create New Membership Plan'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '0 0 1.25rem 0' }}>
              Define the recurring subscription terms, tariff pricing, and included service encounter quota.
            </p>

            {modalError && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Plan Code *
                  </label>
                  <input
                    type="text"
                    disabled={isEditing}
                    placeholder="e.g. MBR-SPINE-M"
                    value={planCode}
                    onChange={(e) => setPlanCode(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      backgroundColor: isEditing ? '#f1f5f9' : '#ffffff',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chronic Spine Care Maintenance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Outline the clinical scope, indications, and patient eligibility..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Included Service Modality *
                </label>
                <select
                  disabled={isEditing}
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: isEditing ? '#f1f5f9' : '#ffffff' }}
                >
                  {services.map((svc) => (
                    <option key={svc.id} value={svc.id}>
                      {svc.service_code} - {svc.name} ({svc.category})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Cadence *
                  </label>
                  <select
                    disabled={isEditing}
                    value={billingFrequency}
                    onChange={(e) => setBillingFrequency(e.target.value as MembershipFrequency)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: isEditing ? '#f1f5f9' : '#ffffff' }}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Cycle Price (₦) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="100"
                    placeholder="45000"
                    value={cyclePrice}
                    onChange={(e) => setCyclePrice(e.target.value ? parseFloat(e.target.value) : '')}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Session Quota *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="4"
                    value={cycleSessionQuota}
                    onChange={(e) => setCycleSessionQuota(e.target.value ? parseInt(e.target.value, 10) : '')}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  {isSubmitting ? 'Saving...' : isEditing ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default MembershipPlanListPage;
