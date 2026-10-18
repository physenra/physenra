import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePractice } from '../../hooks/usePractice';
import { getActivePracticeHeader } from '../../lib/supabase';
import { LoadingScreen } from '../ui/LoadingScreen';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePractice?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requirePractice = true,
}) => {
  const { user, profile, loading: authLoading } = useAuth();
  const {
    memberships,
    activeMembership,
    loading: practiceLoading,
    error: practiceError,
    refreshPractices,
  } = usePractice();
  const location = useLocation();
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  // Fallback timeout to prevent permanent spinner if network hangs
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (practiceLoading && memberships.length === 0) {
      timer = setTimeout(() => {
        setLoadTimedOut(true);
      }, 8000);
    } else {
      setLoadTimedOut(false);
    }
    return () => clearTimeout(timer);
  }, [practiceLoading, memberships.length]);

  if (authLoading) {
    return <LoadingScreen message="Verifying security credentials..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Narrow exemption: IF authenticated user is Platform Admin
  // AND requested route is an authorized Platform route,
  // THEN allow Platform Administration access without requiring a clinical practice context
  const isPlatformRoute = location.pathname.startsWith('/platform');
  const isPlatformAdmin = Boolean(profile?.is_platform_admin);

  if (isPlatformAdmin && isPlatformRoute) {
    return <>{children}</>;
  }

  // Handle recoverable practice context resolution errors
  if (practiceError && memberships.length === 0 && !getActivePracticeHeader()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
        <div className="mb-6 flex justify-center">
          <img
            src="/branding/physenra-logo-dark.png"
            alt="Physenra"
            className="h-10 w-auto max-w-[200px] object-contain"
          />
        </div>
        <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-xl font-bold mb-2">Practice Connection Issue</h2>
        <p className="text-sm text-slate-400 max-w-md text-center mb-6">
          {practiceError || 'Unable to establish secure active practice session.'}
        </p>
        <button
          onClick={() => {
            setLoadTimedOut(false);
            refreshPractices();
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
        >
          <RefreshCw size={16} />
          Retry Connection
        </button>
      </div>
    );
  }

  // If practice context resolution has timed out on cold load
  if (loadTimedOut && practiceLoading && memberships.length === 0 && !getActivePracticeHeader()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
        <div className="mb-6 flex justify-center">
          <img
            src="/branding/physenra-logo-dark.png"
            alt="Physenra"
            className="h-10 w-auto max-w-[200px] object-contain"
          />
        </div>
        <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center mb-4">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-xl font-bold mb-2">Connecting to Practice…</h2>
        <p className="text-sm text-slate-400 max-w-md text-center mb-6">
          Connecting to your active practice session is taking longer than expected.
        </p>
        <button
          onClick={() => {
            setLoadTimedOut(false);
            refreshPractices();
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
        >
          <RefreshCw size={16} />
          Reload Practice Context
        </button>
      </div>
    );
  }

  // Only display blocking full-screen loader if context is completely unknown
  // If we already have resolved memberships or a stored practice header, DO NOT unmount children!
  const hasExistingPractice = memberships.length > 0 || Boolean(activeMembership) || Boolean(getActivePracticeHeader());
  if (practiceLoading && !hasExistingPractice) {
    return <LoadingScreen message="Resolving practice context..." />;
  }

  // If the route strictly requires a practice context and user has 0 active memberships
  if (requirePractice && memberships.length === 0) {
    return <Navigate to="/no-practice" replace />;
  }

  return <>{children}</>;
};
