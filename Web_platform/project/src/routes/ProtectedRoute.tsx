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

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, refreshUser } = useAuth();
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState<string | null>(null);
  const roleKey = `${location.pathname}:${allowedRoles?.join(',') ?? ''}`;

  useEffect(() => {
    if (!user || !allowedRoles || allowedRoles.includes(user.role) || refreshKey === roleKey) {
      return;
    }

    setRefreshKey(roleKey);
    void refreshUser();
  }, [allowedRoles, refreshKey, refreshUser, roleKey, user]);

  if (isLoading) {
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

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (refreshKey === roleKey) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <Spinner size="lg" />
        </div>
      );
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
