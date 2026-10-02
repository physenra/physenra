import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePractice } from '../../hooks/usePractice';
import { Building2, LogOut, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';

export const NoPracticePage: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { refreshPractices } = usePractice();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshPractices();
    } catch (err) {
      console.error('Failed to refresh memberships:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const displayName = profile?.display_name ||
    (profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : null);

  return (
    <div className="fullscreen-center-page">
      <div className="no-practice-card">
        <div className="no-practice-icon-wrapper">
          <Building2 size={40} className="no-practice-icon" />
        </div>

        <h1 className="no-practice-title">No Practice Association Found</h1>
        
        <p className="no-practice-description">
          Your account is verified, but you are not currently associated with any active physiotherapy practice in Physenra.
        </p>

        <div className="user-info-box">
          <div className="info-row">
            <span className="label">Account Email:</span>
            <span className="value font-medium">{user?.email}</span>
          </div>
          {displayName && (
            <div className="info-row">
              <span className="label">Name:</span>
              <span className="value font-medium">{displayName}</span>
            </div>
          )}
        </div>

        <div className="notice-box">
          <AlertCircle size={18} className="notice-icon" />
          <p className="notice-text">
            If you were recently invited or added by a practice manager, ask them to verify that your invitation was accepted, or click the button below to re-check your permissions.
          </p>
        </div>

        <div className="action-buttons-group">
          {Boolean(profile?.is_platform_admin) && (
            <Link
              to="/platform"
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', background: '#059669' }}
            >
              <ShieldCheck size={16} />
              <span>Open Platform Admin Console</span>
            </Link>
          )}

          <Link
            to="/register-practice"
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
          >
            <Building2 size={16} />
            <span>Register a Practice</span>
          </Link>

          <button
            onClick={handleRefresh}
            className="btn-secondary"
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Checking Memberships...' : 'Re-check Access'}</span>
          </button>

          <button
            onClick={() => signOut()}
            className="btn-secondary"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
