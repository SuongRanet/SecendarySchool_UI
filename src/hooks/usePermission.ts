import { useAuthStore } from '@/stores/auth.store';
import type { RoleCode } from '@/types/domain';

/**
 * Reads the permissions of the signed-in user.
 *
 * These checks only decide what the interface shows. Every protected operation is
 * authorized again on the backend, so hiding a control here is a usability
 * decision and never a security boundary.
 */
export const usePermission = () => {
  const user = useAuthStore((state) => state.user);

  const has = (...permissions: string[]): boolean =>
    user ? permissions.some((permission) => user.permissions.includes(permission)) : false;

  const hasAll = (...permissions: string[]): boolean =>
    user ? permissions.every((permission) => user.permissions.includes(permission)) : false;

  const hasRole = (...roles: RoleCode[]): boolean =>
    user ? roles.some((role) => user.roles.includes(role)) : false;

  const isElevated = (): boolean => hasRole('SUPER_ADMIN', 'ADMIN', 'PRINCIPAL');

  return { user, has, hasAll, hasRole, isElevated };
};
