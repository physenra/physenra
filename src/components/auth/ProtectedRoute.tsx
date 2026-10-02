import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePractice } from '../../hooks/usePractice';
import { LoadingScreen } from '../ui/LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePractice?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requirePractice = true,
}) => {
  const { user, profile, loading: authLoading } = useAuth();
  const { memberships, loading: practiceLoading } = usePractice();
  const location = useLocation();

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

  if (practiceLoading) {
    return <LoadingScreen message="Resolving practice context..." />;
  }

  // If the route strictly requires a practice context and user has 0 active memberships
  if (requirePractice && memberships.length === 0) {
    return <Navigate to="/no-practice" replace />;
  }

  return <>{children}</>;
};
