import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, ShieldCheck } from 'lucide-react';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';

export const Sidebar: React.FC = () => {
  const { activePractice } = usePractice();
  const { isOwner, isManager } = useRole();

  return (
    <aside className="app-sidebar">
      <div className="sidebar-section">
        <span className="sidebar-label">PRACTICE PLATFORM</span>
        <nav className="sidebar-nav">
          <NavLink
            to="/app/dashboard"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/app/practice"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Building2 size={18} />
            <span>Practice Details</span>
          </NavLink>
        </nav>
      </div>

      <div className="sidebar-footer">
        {activePractice && (
          <div className="practice-context-card">
            <div className="practice-status-indicator">
              <span className={`status-dot dot-${activePractice.status}`} />
              <span className="status-label">Status: {activePractice.status}</span>
            </div>
            {(isOwner || isManager) && (
              <div className="admin-capability-badge">
                <ShieldCheck size={14} />
                <span>Practice Administration</span>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
