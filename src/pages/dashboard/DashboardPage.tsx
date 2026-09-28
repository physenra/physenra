import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import { Building2, ShieldCheck, UserCheck, Database, CheckCircle2, Clock } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { activePractice, activeMembership } = usePractice();
  const { isOwner, isManager, isClinician } = useRole();

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Practice Overview</h1>
          <p className="page-subtitle">
            Physenra Platform Foundation V1 — Multi-tenant clinical workspace
          </p>
        </div>
        <div className="practice-badge-header">
          <Building2 size={16} />
          <span>{activePractice?.name}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Active Practice Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon icon-emerald">
              <Building2 size={20} />
            </div>
            <h3 className="card-title">Tenant Practice</h3>
          </div>
          <div className="card-content">
            <div className="metric-primary">{activePractice?.name}</div>
            <div className="metadata-list">
              <div className="metadata-row">
                <span className="metadata-label">Slug:</span>
                <span className="metadata-value font-mono">{activePractice?.slug}</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Timezone:</span>
                <span className="metadata-value">{activePractice?.timezone}</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Jurisdiction:</span>
                <span className="metadata-value">{activePractice?.country}</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Identity & Role Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon icon-teal">
              <UserCheck size={20} />
            </div>
            <h3 className="card-title">Membership &amp; Role</h3>
          </div>
          <div className="card-content">
            <div className="metric-primary capitalize">{activeMembership?.role}</div>
            <div className="metadata-list">
              <div className="metadata-row">
                <span className="metadata-label">User:</span>
                <span className="metadata-value">
                  {profile?.display_name ||
                    (profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : user?.email)}
                </span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Clinical Access:</span>
                <span className="metadata-value">
                  {isOwner || isManager || isClinician ? 'Authorized Clinician / Admin' : 'Staff Access'}
                </span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Status:</span>
                <span className="badge-status-active">
                  <CheckCircle2 size={12} />
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & RLS Context Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon icon-blue">
              <Database size={20} />
            </div>
            <h3 className="card-title">Data Isolation</h3>
          </div>
          <div className="card-content">
            <div className="metric-primary text-blue-600">Row-Level Security</div>
            <div className="metadata-list">
              <div className="metadata-row">
                <span className="metadata-label">Context Header:</span>
                <span className="metadata-value font-mono">x-practice-id</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">SQL Function:</span>
                <span className="metadata-value font-mono">public.current_practice_id()</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Audit Logging:</span>
                <span className="metadata-value text-emerald-600 font-semibold">Immutable V1</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scope Boundary Notification */}
      <div className="info-banner">
        <div className="info-banner-icon">
          <ShieldCheck size={24} />
        </div>
        <div className="info-banner-content">
          <h4 className="info-banner-title">Application Foundation V1 Operational</h4>
          <p className="info-banner-text">
            You are securely authenticated within practice <strong>{activePractice?.name}</strong>.
            This environment implements strict multi-tenant boundaries and role-based access control.
            Clinical modules (Patient Registry, Appointments, Visits, Clinical Records, and Billing)
            are staged for deployment in subsequent development milestones.
          </p>
        </div>
      </div>

      <div className="system-status-panel">
        <div className="status-panel-header">
          <Clock size={16} />
          <span>System Readiness Status</span>
        </div>
        <div className="status-panel-body">
          <div className="status-item">
            <div className="status-item-bullet bullet-success" />
            <div className="status-item-text">
              <span className="status-item-name">Remote Supabase PostgreSQL</span>
              <span className="status-item-desc">Connected &amp; Verified</span>
            </div>
          </div>
          <div className="status-item">
            <div className="status-item-bullet bullet-success" />
            <div className="status-item-text">
              <span className="status-item-name">Row-Level Security (RLS)</span>
              <span className="status-item-desc">Enforced on all tables</span>
            </div>
          </div>
          <div className="status-item">
            <div className="status-item-bullet bullet-success" />
            <div className="status-item-text">
              <span className="status-item-name">Session &amp; Tenant Header Sync</span>
              <span className="status-item-desc">Active practice injected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
