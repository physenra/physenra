import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Ticket,
  Search,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Ban,
  ArrowRight,
  Receipt,
  ShoppingCart,
} from 'lucide-react';
import { packageService } from '../../services/packageService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type { PackageEntitlementWithRelations, PackageStatus } from '../../types/models';

export const PackageEntitlementListPage: React.FC = () => {
  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant, isReceptionist } = useRole();
  const canPurchase = isOwner || isManager || isAccountant || isReceptionist;

  const [searchParams, setSearchParams] = useSearchParams();
  const [entitlements, setEntitlements] = useState<PackageEntitlementWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusFilter = (searchParams.get('status') as PackageStatus | 'all') || 'all';
  const searchQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(searchQuery);

  const loadEntitlements = async () => {
    if (!activePractice) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await packageService.getPackageEntitlements(activePractice.id, {
        status: statusFilter,
        searchQuery: searchQuery || undefined,
      });
      setEntitlements(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load package entitlements.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntitlements();
  }, [activePractice, statusFilter, searchQuery]);

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

  const formatStatusBadge = (status: PackageStatus) => {
    switch (status) {
      case 'active':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#166534', fontSize: '0.75rem', fontWeight: 600 }}>
            <CheckCircle2 size={12} /> Active
          </span>
        );
      case 'pending_payment':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', fontSize: '0.75rem', fontWeight: 600 }}>
            <Clock size={12} /> Pending Payment
          </span>
        );
      case 'completed':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#334155', fontSize: '0.75rem', fontWeight: 600 }}>
            Completed
          </span>
        );
      case 'expired':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '0.75rem', fontWeight: 600 }}>
            <AlertTriangle size={12} /> Expired
          </span>
        );
      case 'suspended':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#fed7aa', color: '#9a3412', fontSize: '0.75rem', fontWeight: 600 }}>
            <AlertTriangle size={12} /> Suspended
          </span>
        );
      case 'cancelled':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '0.75rem', fontWeight: 600 }}>
            <XCircle size={12} /> Cancelled
          </span>
        );
      case 'void':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
            <Ban size={12} /> Void
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { dateStyle: 'medium' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Ticket size={28} color="#0284c7" />
            Patient Package Entitlements
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
            Authoritative session quotas and append-only clinical consumption tracking.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            to="/app/packages"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.875rem',
              textDecoration: 'none',
              border: '1px solid #cbd5e1',
            }}
          >
            Package Catalog
          </Link>

          {canPurchase && (
            <Link
              to="/app/packages/purchase"
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
              <ShoppingCart size={16} />
              Purchase Package
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by package number, invoice number, or patient..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>
          <button
            type="submit"
            style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
          >
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Lifecycle Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#fff' }}
          >
            <option value="all">All States</option>
            <option value="active">Active</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
            <option value="void">Void</option>
          </select>
        </div>
      </div>

      {/* Entitlements Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Loading package entitlements...
          </div>
        ) : entitlements.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <Ticket size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>No Entitlements Found</h3>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>
              No patient packages match the selected criteria.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Package Number</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Patient</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Treatment Bundle</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Lifecycle Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Session Quota</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Expires On</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Invoice</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entitlements.map((ent) => (
                  <tr key={ent.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                      <Link to={`/app/package-entitlements/${ent.id}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                        {ent.package_number}
                      </Link>
                    </td>

                    <td style={{ padding: '0.75rem 1rem' }}>
                      {ent.patient ? (
                        <Link to={`/app/patients/${ent.patient.id}`} style={{ color: '#0f172a', textDecoration: 'none', fontWeight: 500 }}>
                          {ent.patient.first_name} {ent.patient.last_name}
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                            {ent.patient.patient_identifier}
                          </span>
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontWeight: 500, color: '#0f172a' }}>{ent.definition?.name || 'Package'}</span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                        {ent.definition?.service?.name || ent.definition?.code}
                      </span>
                    </td>

                    <td style={{ padding: '0.75rem 1rem' }}>
                      {formatStatusBadge(ent.status)}
                    </td>

                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: ent.remaining_sessions && ent.remaining_sessions > 0 ? '#166534' : '#64748b' }}>
                          {ent.remaining_sessions} Left
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          ({ent.consumed_sessions} of {ent.total_sessions} used)
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                      {formatDate(ent.expires_at)}
                    </td>

                    <td style={{ padding: '0.75rem 1rem' }}>
                      {ent.invoice ? (
                        <Link to={`/app/invoices/${ent.invoice.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#0284c7', textDecoration: 'none', fontWeight: 500 }}>
                          <Receipt size={14} />
                          {ent.invoice.invoice_number}
                          <span style={{ fontSize: '0.75rem', color: ent.invoice.status === 'paid' ? '#16a34a' : '#d97706' }}>
                            ({ent.invoice.status})
                          </span>
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <Link
                        to={`/app/package-entitlements/${ent.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          color: '#0284c7',
                          textDecoration: 'none',
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                        }}
                      >
                        Details <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
