// ==============================================================================
// PHYSENRA SAAS — SALES REPRESENTATIVE ACCESS GUARD
// File: src/components/auth/SalesRepGuard.tsx
//
// Governs:
// 1. Mandatory authentication check
// 2. Authoritative sales representative role check (via sales_representatives)
// 3. Complete clinical firewall: reps have zero access to clinical PHI or practice data
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { salesRepPortalService, RepProfile } from '../../services/salesRepPortalService';
import { LoadingScreen } from '../ui/LoadingScreen';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

interface SalesRepGuardProps {
  children: React.ReactNode;
}

export const SalesRepGuard: React.FC<SalesRepGuardProps> = ({ children }) => {
  const { user, loading: authLoading, signOut } = useAuth();
  const location = useLocation();
  const [rep, setRep] = useState<RepProfile | null>(null);
  const [verifying, setVerifying] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    if (user) {
      salesRepPortalService
        .getMyProfile()
        .then((profile) => {
          if (isMounted) {
            setRep(profile);
            setVerifying(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setRep(null);
            setVerifying(false);
          }
        });
    } else if (!authLoading) {
      setVerifying(false);
    }
    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  if (authLoading || verifying) {
    return <LoadingScreen message="Verifying sales representative authorization..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!rep) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 border border-amber-500/30 text-center shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <ShieldAlert className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-100 mb-2">Representative Portal</h1>
          <p className="text-slate-400 text-xs mb-6 leading-relaxed">
            Your account ({user.email}) is not registered as an active sales representative in the Physenra Pilot.
            If you were recently invited, please ensure you signed in with your assigned onboarding email.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              to="/app"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Go to Clinical Workspace
            </Link>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
