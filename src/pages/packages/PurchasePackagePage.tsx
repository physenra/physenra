import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ShoppingCart,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Receipt,
  Ticket,
} from 'lucide-react';
import { packageService } from '../../services/packageService';
import { patientService } from '../../services/patientService';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import type { PackageDefinitionWithRelations, Patient } from '../../types/models';

export const PurchasePackagePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedDefinitionId = searchParams.get('definitionId') || '';
  const preselectedPatientId = searchParams.get('patientId') || '';

  const { activePractice } = usePractice();
  const { isOwner, isManager, isAccountant, isReceptionist } = useRole();
  const canPurchase = isOwner || isManager || isAccountant || isReceptionist;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [definitions, setDefinitions] = useState<PackageDefinitionWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedPatientId, setSelectedPatientId] = useState(preselectedPatientId);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState(preselectedDefinitionId);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<{
    package_id: string;
    package_number: string;
    invoice_id: string;
    invoice_number: string;
    package_price: number;
    currency: string;
    total_sessions: number;
    validity_days: number;
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!activePractice) return;
      setIsLoading(true);
      setError(null);
      try {
        const [patientsRes, defsData] = await Promise.all([
          patientService.getPatients({ limit: 100 }),
          packageService.getPackageDefinitions(activePractice.id, { isActive: true }),
        ]);
        const patientsData = patientsRes.patients;
        setPatients(patientsData);
        setDefinitions(defsData);

        if (!selectedDefinitionId && defsData.length > 0) {
          setSelectedDefinitionId(defsData[0].id);
        }
        if (!selectedPatientId && patientsData.length > 0) {
          setSelectedPatientId(patientsData[0].id);
        }
      } catch (err: any) {
        setError('Failed to load required catalog or patient data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [activePractice]);

  if (!canPurchase) {
    return (
      <div className="page-container" style={{ padding: '2rem', maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
        <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Access Restricted</h2>
        <p style={{ color: '#64748b' }}>Physiotherapists have clinical view-only billing access. Contact front desk or management to purchase a package.</p>
        <Link to="/app/packages" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>
          &larr; Back to Packages
        </Link>
      </div>
    );
  }

  const selectedDefinition = definitions.find((d) => d.id === selectedDefinitionId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePractice || !selectedPatientId || !selectedDefinitionId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await packageService.purchasePackage(
        {
          patient_id: selectedPatientId,
          package_definition_id: selectedDefinitionId,
          notes: notes.trim() || undefined,
        },
        activePractice.id
      );

      setPurchaseResult({
        package_id: res.package_id,
        package_number: res.package_number,
        invoice_id: res.invoice_id,
        invoice_number: res.invoice_number,
        package_price: res.package_price,
        currency: res.currency,
        total_sessions: res.total_sessions,
        validity_days: res.validity_days,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to complete package purchase.');
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

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/app/packages" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#0284c7', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
          <ArrowLeft size={16} /> Back to Packages
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.5rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShoppingCart size={26} color="#16a34a" />
          Purchase Treatment Package
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
          Issue a debtor invoice and pending session entitlement for a patient.
        </p>
      </div>

      {purchaseResult ? (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #bbf7d0', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <CheckCircle2 size={54} color="#16a34a" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534', margin: '0 0 0.5rem 0' }}>
            Package Purchased Successfully
          </h2>
          <p style={{ color: '#475569', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
            Authoritative debtor invoice issued. Entitlement is in <strong>pending_payment</strong> status until invoice is paid in full.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: '#f0fdf4', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'left' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#65a30d', display: 'block', fontWeight: 600 }}>PACKAGE ENTITLEMENT</span>
              <strong style={{ fontSize: '1.25rem', color: '#166534' }}>{purchaseResult.package_number}</strong>
              <div style={{ fontSize: '0.8125rem', color: '#334155', marginTop: '0.25rem' }}>
                Quota: {purchaseResult.total_sessions} Sessions ({purchaseResult.validity_days} Days Validity)
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#65a30d', display: 'block', fontWeight: 600 }}>LINKED INVOICE</span>
              <strong style={{ fontSize: '1.25rem', color: '#166534' }}>{purchaseResult.invoice_number}</strong>
              <div style={{ fontSize: '0.8125rem', color: '#334155', marginTop: '0.25rem' }}>
                Total: {formatCurrency(purchaseResult.package_price, purchaseResult.currency)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              to={`/app/invoices/${purchaseResult.invoice_id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#16a34a',
                color: '#fff',
                padding: '0.625rem 1.25rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              <Receipt size={16} />
              Collect Payment on Invoice
            </Link>

            <Link
              to={`/app/package-entitlements/${purchaseResult.package_id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                padding: '0.625rem 1.25rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
                border: '1px solid #cbd5e1',
              }}
            >
              <Ticket size={16} />
              View Package Entitlement
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {error && (
            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Patient Selection */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Select Patient *
            </label>
            {isLoading ? (
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading patients...</div>
            ) : (
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                required
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#fff' }}
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.patient_identifier} — {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
            )}
            <small style={{ color: '#64748b', fontSize: '0.75rem' }}>Package entitlement will be strictly bound to this patient.</small>
          </div>

          {/* Package Offering Selection */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Select Treatment Package *
            </label>
            {isLoading ? (
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading packages...</div>
            ) : definitions.length === 0 ? (
              <div style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                No active package definitions found. Create a package definition first.
              </div>
            ) : (
              <select
                value={selectedDefinitionId}
                onChange={(e) => setSelectedDefinitionId(e.target.value)}
                required
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#fff' }}
              >
                {definitions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.name} ({d.total_sessions} Sessions @ {d.currency} {d.package_price})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Frozen Terms Summary Box */}
          {selectedDefinition && (
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>
                FROZEN COMMERCIAL & OPERATIONAL TERMS
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Authoritative Price</span>
                  <strong style={{ fontSize: '1.125rem', color: '#0f172a' }}>
                    {formatCurrency(selectedDefinition.package_price, selectedDefinition.currency)}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Session Quota</span>
                  <strong style={{ fontSize: '1.125rem', color: '#0f172a' }}>
                    {selectedDefinition.total_sessions} Sessions
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Validity Window</span>
                  <strong style={{ fontSize: '1.125rem', color: '#0f172a' }}>
                    {selectedDefinition.validity_days} Days
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Clinical Service</span>
                  <strong style={{ fontSize: '0.9375rem', color: '#0284c7' }}>
                    {selectedDefinition.service?.name || 'Assigned Discipline'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
              Purchase Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Prescribed by clinician following initial assessment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
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
              disabled={isSubmitting || !selectedPatientId || !selectedDefinitionId}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#16a34a',
                color: '#fff',
                border: 'none',
                padding: '0.5rem 1.25rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              <ShoppingCart size={16} />
              {isSubmitting ? 'Processing Purchase...' : 'Confirm Purchase & Issue Invoice'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
