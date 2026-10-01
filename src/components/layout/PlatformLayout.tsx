import React from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  Building2,
  Package,
  Receipt,
  ShieldCheck,
  Settings,
  ArrowLeft,
  LogOut,
  Shield,
} from 'lucide-react';

export const PlatformLayout: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { to: '/platform/dashboard', label: 'Executive KPIs', icon: LayoutDashboard },
    { to: '/platform/practices', label: 'Practice Directory', icon: Building2 },
    { to: '/platform/plans', label: 'SaaS Plans Catalog', icon: Package },
    { to: '/platform/billing', label: 'Billing & Invoices', icon: Receipt },
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
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="font-bold text-lg tracking-tight text-white">Physenra</span>
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded inline-block border border-emerald-500/20">
                Platform Console
              </div>
            </div>
          </div>

          {/* Privacy Firewall Notice */}
          <div className="mx-3 my-3 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400">
            <span className="font-medium text-emerald-400 block mb-0.5">Clinical Privacy Firewall Active</span>
            Platform admin view. Zero access to patient medical records or PHI.
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
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User footer & return link */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <Link
            to="/app"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Switch to Practice Workspace
          </Link>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs truncate max-w-[140px]">
              <p className="font-semibold text-slate-200 truncate">
                {profile?.display_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Platform Admin'}
              </p>
              <p className="text-slate-500 truncate text-[11px]">{profile ? 'Verified Admin' : 'admin@physenra.com'}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-h-screen bg-slate-950 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
