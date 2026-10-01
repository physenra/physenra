import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePractice } from '../../hooks/usePractice';
import { PracticeSelector } from '../ui/PracticeSelector';
import { LogOut, User } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { activeMembership } = usePractice();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const displayName =
    profile?.display_name ||
    (profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : user?.email) ||
    'User';

  return (
    <header className="header-bar">
      <div className="header-left">
        <div className="brand-badge">
          <img
            src="/branding/physenra-logo.png"
            alt="Physenra"
            className="brand-logo-img"
          />
        </div>
        <div className="header-divider" />
        <PracticeSelector />
      </div>

      <div className="header-right">
        <div className="user-profile-summary">
          <div className="user-avatar-circle">
            <User size={16} />
          </div>
          <div className="user-details">
            <span className="user-name">{displayName}</span>
            {activeMembership && (
              <span className="user-role-badge">{activeMembership.role}</span>
            )}
          </div>
        </div>

        <button 
          onClick={handleSignOut} 
          className="btn-signout"
          title="Sign out of Physenra"
          aria-label="Sign out"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};
