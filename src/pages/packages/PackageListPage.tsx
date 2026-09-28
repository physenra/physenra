import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Package,
  Search,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Ticket,
} from 'lucide-react';
import { packageService } from '../../services/packageService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type { PackageDefinitionWithRelations } from '../../types/models';

export const PackageListPage: React.FC = () => {
  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant, isReceptionist } = useRole();
  const canManagePackages = isOwner || isManager;
  const canPurchasePackages = isOwner || isManager || isAccountant || isReceptionist;

  const [searchParams, setSearchParams] = useSearchParams();
  const [packages, setPackages] = useState<PackageDefinitionWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusFilter = searchParams.get('status') || 'all';
  const searchQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(searchQuery);

  const loadPackages = async () => {
    if (!activePractice) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await packageService.getPackageDefinitions(activePractice.id, {
        isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : 'all',
        searchQuery: searchQuery || undefined,
      });
      setPackages(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load package definitions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
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

  const formatCurrency = (amount: number, curr = 'NGN') => {
    return `${curr} ${Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header & Quick Links */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={28} color="#0284c7" />
            Treatment Packages
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
            Pre-purchased multi-session clinical treatment bundles & tariff definitions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            to="/app/package-entitlements"
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
            <Ticket size={16} />
            Patient Entitlements
          </Link>

          {canPurchasePackages && (
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
              Purchase for Patient
            </Link>
          )}

          {canManagePackages && (
            <Link
              to="/app/packages/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#0284c7',
                color: '#fff',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              <Plus size={16} />
              New Package Definition
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

      {/* Filters & Search */}
      <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by package name, code, or service..."
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
          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#fff' }}
          >
            <option value="all">All Packages</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Package Catalog Grid */}
      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Loading treatment packages...
        </div>
      ) : packages.length === 0 ? (
        <div style={{ backgroundColor: '#fff', padding: '3rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
          <Package size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>No Packages Defined</h3>
          <p style={{ fontSize: '0.875rem', margin: 0, marginBottom: '1.5rem' }}>
            Define reusable treatment packages for your practice to bundle multi-session clinical care.
          </p>
          {canManagePackages && (
            <Link
              to="/app/packages/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#0284c7',
                color: '#fff',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              <Plus size={16} />
              Create First Package
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              style={{
                backgroundColor: '#fff',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                    {pkg.code}
                  </span>
                  {pkg.is_active ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                      <CheckCircle2 size={12} /> Active
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                      <XCircle size={12} /> Inactive
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                  {pkg.name}
                </h3>

                {pkg.service && (
                  <p style={{ fontSize: '0.8125rem', color: '#0284c7', margin: '0 0 0.5rem 0', fontWeight: 500 }}>
                    Modality: {pkg.service.name}
                  </p>
                )}

                {pkg.description && (
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 1rem 0', lineHeight: 1.4 }}>
                    {pkg.description}
                  </p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Quota:</span>
                    <strong style={{ color: '#0f172a' }}>{pkg.total_sessions} Sessions</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> Validity:
                    </span>
                    <strong style={{ color: '#0f172a' }}>{pkg.validity_days} Days</strong>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Package Price</span>
                    <strong style={{ fontSize: '1.125rem', color: '#0f172a' }}>
                      {formatCurrency(pkg.package_price, pkg.currency)}
                    </strong>
                  </div>

                  {canPurchasePackages && pkg.is_active && (
                    <Link
                      to={`/app/packages/purchase?definitionId=${pkg.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        backgroundColor: '#0284c7',
                        color: '#fff',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <ShoppingCart size={14} /> Sell Package
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
