import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/auth.store';
import type { RoleCode } from '@/types/domain';
import { ErrorState, LoadingState } from '@/components/feedback/States';

/**
 * Blocks a route until a session is confirmed. Route guards are a navigation aid:
 * the backend authorizes every request again on its own.
 */
export const RequireAuth = () => {
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (isInitializing) {
    return <LoadingState className="min-h-screen" />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location.pathname + location.search }} replace />;
  }

  return <Outlet />;
};

/** Sends an already signed-in user away from the login and recovery pages. */
export const RequireGuest = () => {
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isInitializing) {
    return <LoadingState className="min-h-screen" />;
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Outlet />;
};

export interface RequirePermissionProps {
  /** The user needs at least one of these permissions. */
  permissions?: string[];
  /** The user needs at least one of these roles. */
  roles?: RoleCode[];
}

export const RequirePermission = ({ permissions, roles }: RequirePermissionProps) => {
  const { t } = useTranslation('common');
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to={ROUTES.login} replace />;
  }

  const permitted =
    (!permissions || permissions.some((permission) => user.permissions.includes(permission))) &&
    (!roles || roles.some((role) => user.roles.includes(role)));

  if (!permitted) {
    return (
      <ErrorState
        variant="forbidden"
        title={t('states.forbiddenTitle')}
        message={t('states.forbiddenHint')}
      />
    );
  }

  return <Outlet />;
};
