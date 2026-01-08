import { Navigate } from 'react-router-dom';
import { authService } from '@/services/auth.service';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const user = authService.getCurrentUser();
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role_name)) {
      const roleRoutes: Record<string, string> = {
        admin: '/admin',
        receptionist: '/receptionist',
        doctor: '/doctor',
        client: '/client',
      };
      return <Navigate to={roleRoutes[user.role_name] || '/dashboard'} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
