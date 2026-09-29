import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/types';
import { Spinner } from '@/components/ui/States';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Role[];
}

function getDefaultRouteForRole(role: Role): string {
  if (role === 'SUPER_ADMIN') return '/admin/control-center';
  if (role === 'ADMIN') return '/admin';
  if (role === 'BUSINESS_USER') return '/business';
  if (role === 'RIDER') return '/rider';
  return '/dashboard';
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, refreshUser } = useAuth();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(false);
  const [attemptedRefresh, setAttemptedRefresh] = useState(false);

  useEffect(() => {
    if (!user || !allowedRoles || user.role === 'SUPER_ADMIN' || allowedRoles.includes(user.role) || attemptedRefresh) {
      return;
    }

    setAttemptedRefresh(true);
    setIsVerifying(true);
    refreshUser().finally(() => {
      setIsVerifying(false);
    });
  }, [allowedRoles, attemptedRefresh, refreshUser, user]);

  if (isLoading || isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  // Super Admin has absolute authority and access over all platform routes
  if (user.role === 'SUPER_ADMIN') {
    return <>{children}</>;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallbackPath = getDefaultRouteForRole(user.role);
    if (fallbackPath !== location.pathname) {
      return <Navigate to={fallbackPath} replace />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
