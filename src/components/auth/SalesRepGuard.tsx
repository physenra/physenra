// ==============================================================================
// PHYSENRA SAAS — SALES REPRESENTATIVE PORTAL GUARD (FREE PARTNER ACCESS)
// File: src/components/auth/SalesRepGuard.tsx
//
// Governs:
// 1. Mandatory authentication check & redirect to /sales-portal/login
// 2. Free partner access via sales_representatives (never requires clinic subscription)
// 3. Immediate portal revocation if representative status is suspended or terminated
// 4. Complete clinical & executive firewall: zero clinic PHI or Platform Admin leakage
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { salesRepPortalService, SalesPortalContext } from '../../services/salesRepPortalService';
import { LoadingScreen } from '../ui/LoadingScreen';
import { ShieldAlert, ArrowLeft, LogOut, Ban } from 'lucide-react';

interface SalesRepGuardProps {
  children: React.ReactNode;
}

export const SalesRepGuard: React.FC<SalesRepGuardProps> = ({ children }) => {
  const { user, loading: authLoading, pendingAuthFlow, signOut } = useAuth();
  const location = useLocation();
  const [context, setContext] = useState<SalesPortalContext | null>(null);
  const [verifying, setVerifying] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    if (user) {
      salesRepPortalService
        .claimVerifiedAccount()
        .catch(() => null)
        .then(() => salesRepPortalService.getMyPortalContext())
        .then((ctx) => {
          if (isMounted) {
            setContext(ctx);
            setVerifying(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setContext(null);
            setVerifying(false);
          }
        });
    } else if (!authLoading) {
      setContext(null);
      setVerifying(false);
    }
    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  if (authLoading || verifying) {
    return <LoadingScreen message="Verifying sales partner authorization..." />;
  }

  if (pendingAuthFlow === 'invite') {
    return <Navigate to="/sales-portal/accept-invite" replace />;
  }

  if (!user) {
    return <Navigate to="/sales-portal/login" state={{ from: location }} replace />;
  }

  // Suspended / Terminated / Completed representative access revoked
  if (context?.is_sales_rep && !context.has_portal_access) {
    const statusLabel = context.status ? context.status.toUpperCase() : 'INACTIVE';
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 rounded-2xl p-8 border border-rose-500/30 text-center shadow-2xl space-y-4">
          <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
            <Ban className="w-8 h-8 text-rose-400" />
          </div>
          <div className="space-y-1.5">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
              Account {statusLabel}
            </span>
            <h1 className="text-xl font-bold text-slate-100">Sales Portal Access Revoked</h1>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            Your Physenra Sales Representative account ({user.email}) is currently <span className="text-rose-300 font-semibold">{context.status || 'inactive'}</span> and cannot access partner referral tools or commission views.
            If you independently operate a clinical physiotherapy practice, your clinic subscription remains unaffected.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              to="/app"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to Clinical Practice App</span>
            </Link>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 font-medium text-xs border border-rose-500/30 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Non-representative user
  if (!context?.has_portal_access) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 rounded-2xl p-8 border border-amber-500/30 text-center shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <ShieldAlert className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-100 mb-2">Sales Representative Portal</h1>
          <p className="text-slate-400 text-xs mb-6 leading-relaxed">
            Your account ({user.email}) is not registered as an active sales representative in the Physenra Partner Program.
            If you were recently invited, please check your email for your secure setup link.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              to="/app"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to Clinical Workspace</span>
            </Link>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
