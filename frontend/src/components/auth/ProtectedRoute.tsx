import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSuperuser?: boolean;
}

export default function ProtectedRoute({ children, requireSuperuser = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { isPlatformAdmin } = useTenant();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to onboarding if user has no enterprise (skip for platform admins)
  if (!isPlatformAdmin && user && !user.enterprise_id && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (requireSuperuser && !user?.is_superuser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
