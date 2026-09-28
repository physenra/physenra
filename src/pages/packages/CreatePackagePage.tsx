import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, ArrowLeft, AlertCircle, Save } from 'lucide-react';
import { packageService } from '../../services/packageService';
import { serviceCatalogService } from '../../services/serviceCatalogService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type { Service } from '../../types/models';

export const CreatePackagePage: React.FC = () => {
  const navigate = useNavigate();
  const { activePractice } = usePractice();
  const { isOwner, isManager } = useRole();
  const canManagePackages = isOwner || isManager;

  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [totalSessions, setTotalSessions] = useState<number>(10);
  const [validityDays, setValidityDays] = useState<number>(90);
  const [packagePrice, setPackagePrice] = useState<string>('50000.00');
  const currency = 'NGN';
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadServices = async () => {
      if (!activePractice) return;
      setIsLoadingServices(true);
      try {
        const data = await serviceCatalogService.getServices(activePractice.id, { isActive: true });
        setServices(data);
        if (data.length > 0 && !serviceId) {
          setServiceId(data[0].id);
        }
      } catch (err: any) {
        setError('Failed to load clinical services.');
      } finally {
        setIsLoadingServices(false);
      }
    };

    loadServices();
  }, [activePractice]);

  if (!canManagePackages) {
    return (
      <div className="page-container" style={{ padding: '2rem', maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
        <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Access Restricted</h2>
        <p style={{ color: '#64748b' }}>Only practice owners and managers are authorized to create package offerings.</p>
        <Link to="/app/packages" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>
          &larr; Back to Packages
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice) return;

    if (!code.trim()) {
      setError('Package code is required.');
      return;
    }
    if (!name.trim()) {
      setError('Package name is required.');
      return;
    }
    if (!serviceId) {
      setError('A linked clinical service modality is required.');
      return;
    }
    if (totalSessions <= 0) {
      setError('Total sessions must be greater than 0.');
      return;
    }
    if (validityDays <= 0) {
      setError('Validity period must be greater than 0 days.');
      return;
    }

    const priceNum = parseFloat(packagePrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Package price must be greater than 0.00.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await packageService.createPackageDefinition(
        {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
          service_id: serviceId,
          total_sessions: totalSessions,
          validity_days: validityDays,
          package_price: priceNum,
          currency,
          is_active: isActive,
        },
        activePractice.id
      );

      navigate('/app/packages');
    } catch (err: any) {
      setError(err.message || 'Failed to create package definition.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/app/packages" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#0284c7', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
          <ArrowLeft size={16} /> Back to Treatment Packages
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.5rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={26} color="#0284c7" />
          Create Package Definition
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
          Define a reusable treatment package offering for multi-session physiotherapy care.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Package Code *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. PKG-MSK-10"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', textTransform: 'uppercase' }}
            />
            <small style={{ color: '#64748b', fontSize: '0.75rem' }}>Unique catalog identifier</small>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Package Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 10-Session Musculoskeletal Rehab Bundle"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
            Clinical Modality / Service *
          </label>
          {isLoadingServices ? (
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading services...</div>
          ) : (
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#fff' }}
            >
              {services.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.service_code} — {svc.name} ({svc.category})
                </option>
              ))}
            </select>
          )}
          <small style={{ color: '#64748b', fontSize: '0.75rem' }}>Sessions consumed under this package must match this clinical discipline.</small>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Clinical scope, bundle terms, and intended patient population..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Total Sessions *
            </label>
            <input
              type="number"
              min={1}
              required
              value={totalSessions}
              onChange={(e) => setTotalSessions(parseInt(e.target.value, 10) || 1)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
            <small style={{ color: '#64748b', fontSize: '0.75rem' }}>Discrete clinical encounter quota</small>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Validity Window (Days) *
            </label>
            <input
              type="number"
              min={1}
              required
              value={validityDays}
              onChange={(e) => setValidityDays(parseInt(e.target.value, 10) || 1)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
            <small style={{ color: '#64748b', fontSize: '0.75rem' }}>Expires N days after payment activation</small>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Authoritative Package Price *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={packagePrice}
              onChange={(e) => setPackagePrice(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
            <small style={{ color: '#64748b', fontSize: '0.75rem' }}>Authoritative tariff charged on debtor invoice</small>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Currency
            </label>
            <input
              type="text"
              readOnly
              value={currency}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#f8fafc', color: '#64748b' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            id="isActiveToggle"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            style={{ width: '1rem', height: '1rem' }}
          />
          <label htmlFor="isActiveToggle" style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500, cursor: 'pointer' }}>
            Active (available for purchase by administrative staff)
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
          <Link
            to="/app/packages"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              color: '#475569',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            <Save size={16} />
            {isSubmitting ? 'Saving...' : 'Create Package'}
          </button>
        </div>
      </form>
    </div>
  );
};
