import React from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePractice } from '../../hooks/usePractice';
import { BrandLogo } from '../ui/BrandLogo';
import {
  LayoutDashboard,
  Building2,
  Package,
  Receipt,
  Users,
  ShieldCheck,
  Settings,
  ArrowLeft,
  LogOut,
} from 'lucide-react';

export const PlatformLayout: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { memberships } = usePractice();
  const navigate = useNavigate();

  const hasPractice = Boolean(memberships && memberships.length > 0);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { to: '/platform/dashboard', label: 'Executive KPIs', icon: LayoutDashboard },
    { to: '/platform/practices', label: 'Practice Directory', icon: Building2 },
    { to: '/platform/plans', label: 'SaaS Plans Catalog', icon: Package },
    { to: '/platform/billing', label: 'Billing & Invoices', icon: Receipt },
    { to: '/platform/sales', label: 'Sales & Referrals', icon: Users },
    { to: '/platform/audit', label: 'Security & Audit Log', icon: ShieldCheck },
    { to: '/platform/settings', label: 'Platform Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BrandLogo theme="dark" size="sm" to="/platform/dashboard" />
              </div>
              <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded inline-block border border-emerald-500/20">
                Platform Console
              </div>
            </div>
          </div>

          {/* Privacy Firewall Notice */}
          <div className="mx-3 my-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400 shadow-sm">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-400 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Clinical Privacy Firewall Active</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Platform admin view. Zero access to patient medical records or PHI.
            </p>
          </div>

          {/* Nav links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon size={18} className="w-4.5 h-4.5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User footer & return link */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          {hasPractice ? (
            <Link
              to="/app/dashboard"
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-200 text-xs font-semibold border border-emerald-800/60 transition-colors"
              title="Return to Clinical Practice Dashboard"
            >
              <ArrowLeft size={14} className="w-3.5 h-3.5" />
              <span>Return to Clinical Workspace</span>
            </Link>
          ) : (
            <Link
              to="/no-practice"
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium border border-slate-700 transition-colors"
              title="No clinical practice associated with this account"
            >
              <ArrowLeft size={14} className="w-3.5 h-3.5" />
              <span>Return to Clinical Workspace</span>
            </Link>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                {profile?.first_name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="text-xs truncate max-w-[130px]">
                <p className="font-semibold text-slate-200 truncate">
                  {profile?.display_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Platform Admin'}
                </p>
                <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="truncate">Administrator</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-h-screen bg-slate-950 flex flex-col">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur px-6 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Platform Operations</span>
            <span>/</span>
            <span className="text-emerald-400 font-medium">Executive Console</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Zero PHI Access Enforced</span>
            </div>
            <div className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              Administrator
            </div>
          </div>
        </header>

        <div className="p-6 md:p-8 flex-1">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
