import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingScreen } from '../ui/LoadingScreen';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface PlatformAdminGuardProps {
  children: React.ReactNode;
}

export const PlatformAdminGuard: React.FC<PlatformAdminGuardProps> = ({ children }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen message="Verifying platform administrator authority..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile?.is_platform_admin) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-xl p-8 border border-red-500/30 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-100 mb-2">Restricted Access</h1>
          <p className="text-slate-400 text-sm mb-6">
            This area is restricted strictly to verified Physenra Platform Administrators. Your account does not hold platform administration privileges.
          </p>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Practice Workspace
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
