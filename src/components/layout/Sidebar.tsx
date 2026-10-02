import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, ShieldCheck, Users, FolderKanban, Calendar, Activity, FileText, TrendingUp, Dumbbell, Target, ClipboardCheck, FileCheck, Tag, Coins, Receipt, CreditCard, Package, Ticket, Wallet, Repeat, Layers, Boxes, Film } from 'lucide-react';
import { usePractice } from '../../hooks/usePractice';
import { useRole } from '../../hooks/useRole';

export const Sidebar: React.FC = () => {
  const { activePractice } = usePractice();
  const { isOwner, isManager, isPlatformAdmin } = useRole();

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

          {isPlatformAdmin && (
            <NavLink
              to="/platform"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              <ShieldCheck size={18} />
              <span>Platform Admin Console</span>
            </NavLink>
          )}

          <NavLink
            to="/app/patients"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Users size={18} />
            <span>Patients</span>
          </NavLink>

          <NavLink
            to="/app/episodes"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <FolderKanban size={18} />
            <span>Episodes</span>
          </NavLink>

          <NavLink
            to="/app/appointments"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Calendar size={18} />
            <span>Appointments</span>
          </NavLink>

          <NavLink
            to="/app/visits"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Activity size={18} />
            <span>Clinical Visits</span>
          </NavLink>

          <NavLink
            to="/app/clinical-notes"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <FileText size={18} />
            <span>Clinical Notes</span>
          </NavLink>

          <NavLink
            to="/app/imaging"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Film size={18} />
            <span>Medical Imaging</span>
          </NavLink>

          <NavLink
            to="/app/outcome-measures"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <TrendingUp size={18} />
            <span>Outcome Measures</span>
          </NavLink>

          <NavLink
            to="/app/hep"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Dumbbell size={18} />
            <span>Home Exercises</span>
          </NavLink>

          <NavLink
            to="/app/treatment-plans"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Target size={18} />
            <span>Treatment Plans</span>
          </NavLink>

          <NavLink
            to="/app/progress-reviews"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <ClipboardCheck size={18} />
            <span>Progress Reviews</span>
          </NavLink>

          <NavLink
            to="/app/discharge-summaries"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <FileCheck size={18} />
            <span>Discharge Summaries</span>
          </NavLink>

          <NavLink
            to="/app/services"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Tag size={18} />
            <span>Services</span>
          </NavLink>

          <NavLink
            to="/app/fee-schedules"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Coins size={18} />
            <span>Fee Schedules</span>
          </NavLink>

          <NavLink
            to="/app/invoices"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Receipt size={18} />
            <span>Invoices</span>
          </NavLink>

          <NavLink
            to="/app/payments"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <CreditCard size={18} />
            <span>Payments</span>
          </NavLink>

          <NavLink
            to="/app/receipts"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <FileText size={18} />
            <span>Receipts</span>
          </NavLink>

          <NavLink
            to="/app/packages"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Package size={18} />
            <span>Packages</span>
          </NavLink>

          <NavLink
            to="/app/package-entitlements"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Ticket size={18} />
            <span>Entitlements</span>
          </NavLink>

          <NavLink
            to="/app/wallets"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Wallet size={18} />
            <span>Patient Wallets</span>
          </NavLink>

          <NavLink
            to="/app/memberships"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Repeat size={18} />
            <span>Memberships</span>
          </NavLink>

          <NavLink
            to="/app/membership-plans"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Layers size={18} />
            <span>Membership Plans</span>
          </NavLink>

          <NavLink
            to="/app/inventory"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Boxes size={18} />
            <span>Inventory</span>
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
