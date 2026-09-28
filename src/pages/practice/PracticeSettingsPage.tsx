import React from 'react';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';
import { Building2, Shield, Calendar, Globe, Clock, CheckCircle } from 'lucide-react';

export const PracticeSettingsPage: React.FC = () => {
  const { activePractice, activeMembership } = usePractice();
  const { isOwner, isManager } = useRole();

  if (!activePractice) {
    return (
      <div className="empty-state-card">
        <p>No active practice context loaded.</p>
      </div>
    );
  }

  const formattedCreatedDate = activePractice.created_at
    ? new Date(activePractice.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';

  return (
    <div className="practice-settings-page">
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Practice Details</h1>
          <p className="page-subtitle">
            Configuration and administrative profile for {activePractice.name}
          </p>
        </div>
      </div>

      <div className="settings-sections">
        {/* Practice Identity Section */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Building2 size={20} className="text-teal-600" />
            <div>
              <h3 className="settings-card-title">Practice Profile</h3>
              <p className="settings-card-subtitle">General practice organization parameters</p>
            </div>
          </div>

          <div className="settings-card-body">
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Practice Name</span>
                <span className="detail-value font-semibold">{activePractice.name}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Practice Slug</span>
                <span className="detail-value font-mono">{activePractice.slug}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Practice ID (UUID)</span>
                <span className="detail-value font-mono text-sm">{activePractice.id}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Operational Status</span>
                <span className="status-badge-pill">
                  <CheckCircle size={14} />
                  <span className="capitalize">{activePractice.status}</span>
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Jurisdiction / Country</span>
                <div className="flex-value">
                  <Globe size={16} />
                  <span>{activePractice.country}</span>
                </div>
              </div>

              <div className="detail-item">
                <span className="detail-label">Local Timezone</span>
                <div className="flex-value">
                  <Clock size={16} />
                  <span>{activePractice.timezone}</span>
                </div>
              </div>

              <div className="detail-item">
                <span className="detail-label">Registered On</span>
                <div className="flex-value">
                  <Calendar size={16} />
                  <span>{formattedCreatedDate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Access & Role Capabilities Section */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Shield size={20} className="text-emerald-600" />
            <div>
              <h3 className="settings-card-title">Practice Role &amp; Permissions</h3>
              <p className="settings-card-subtitle">Your authorization level within this tenant</p>
            </div>
          </div>

          <div className="settings-card-body">
            <div className="role-summary-banner">
              <div>
                <span className="role-summary-label">Current Role:</span>
                <span className="role-summary-value capitalize font-bold text-teal-700">
                  {activeMembership?.role}
                </span>
              </div>
              <span className="role-summary-tag">
                {isOwner
                  ? 'Full Practice Authority'
                  : isManager
                  ? 'Administrative & Operations'
                  : 'Clinical & Operational Access'}
              </span>
            </div>

            <div className="permissions-matrix">
              <div className="permission-row">
                <span className="permission-name">View Practice Records</span>
                <span className="permission-badge badge-allowed">Allowed</span>
              </div>

              <div className="permission-row">
                <span className="permission-name">Manage Practice Settings</span>
                <span className={`permission-badge ${isOwner || isManager ? 'badge-allowed' : 'badge-denied'}`}>
                  {isOwner || isManager ? 'Allowed' : 'Restricted (Owner/Manager Only)'}
                </span>
              </div>

              <div className="permission-row">
                <span className="permission-name">Manage Memberships &amp; Roles</span>
                <span className={`permission-badge ${isOwner || isManager ? 'badge-allowed' : 'badge-denied'}`}>
                  {isOwner || isManager ? 'Allowed' : 'Restricted (Owner/Manager Only)'}
                </span>
              </div>

              <div className="permission-row">
                <span className="permission-name">Transfer Practice Ownership</span>
                <span className={`permission-badge ${isOwner ? 'badge-allowed' : 'badge-denied'}`}>
                  {isOwner ? 'Allowed (Owner Only)' : 'Restricted (Owner Only)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
