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
  const { user, loading: authLoading } = useAuth();
  const { memberships, loading: practiceLoading } = usePractice();
  const location = useLocation();

  if (authLoading) {
    return <LoadingScreen message="Verifying security credentials..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
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
