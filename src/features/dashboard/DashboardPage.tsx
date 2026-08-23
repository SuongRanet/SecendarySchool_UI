import { Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/auth.store';
import { AdminDashboardView } from './AdminDashboardView';
import { PrincipalDashboardView } from './PrincipalDashboardView';

/**
 * `/dashboard` picks the right overview for the signed-in role. Teachers,
 * parents and students have their own workspaces and are redirected there.
 */
export const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to={ROUTES.login} replace />;
  }

  if (user.roles.some((role) => ['SUPER_ADMIN', 'ADMIN'].includes(role))) {
    return <AdminDashboardView />;
  }

  if (user.roles.includes('PRINCIPAL')) {
    return <PrincipalDashboardView />;
  }

  if (user.roles.some((role) => ['TEACHER', 'HOMEROOM_TEACHER'].includes(role))) {
    return <Navigate to={ROUTES.teacher.dashboard} replace />;
  }

  if (user.roles.includes('PARENT')) {
    return <Navigate to={ROUTES.parent.dashboard} replace />;
  }

  return <AdminDashboardView />;
};
