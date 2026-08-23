import { create } from 'zustand';
import { ApiError } from '@/types/api';
import type { AuthProfile, RoleCode } from '@/types/domain';
import { authService } from '@/services/auth.service';
import { tokenStorage } from '@/services/token-storage';

interface AuthState {
  user: AuthProfile | null;
  /** True until the stored session has been validated against the API. */
  isInitializing: boolean;
  isAuthenticated: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<AuthProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;

  hasRole: (...roles: RoleCode[]) => boolean;
  hasPermission: (...permissions: string[]) => boolean;
  hasEveryPermission: (...permissions: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isInitializing: true,
  isAuthenticated: false,
  error: null,

  /**
   * Restores a session from the stored tokens. The profile is always re-fetched
   * rather than cached, so a role or status change on the server takes effect on
   * the next page load.
   */
  initialize: async () => {
    if (!tokenStorage.hasSession()) {
      set({ user: null, isAuthenticated: false, isInitializing: false });
      return;
    }

    try {
      const user = await authService.me();
      set({ user, isAuthenticated: true, isInitializing: false, error: null });
    } catch {
      tokenStorage.clear();
      set({ user: null, isAuthenticated: false, isInitializing: false });
    }
  },

  login: async (identifier, password) => {
    set({ error: null });

    try {
      const result = await authService.login({ identifier, password });
      tokenStorage.save(result.tokens);
      set({ user: result.user, isAuthenticated: true, isInitializing: false });
      return result.user;
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Unable to sign in. Please try again.';
      set({ error: message, user: null, isAuthenticated: false });
      throw error;
    }
  },

  logout: async () => {
    const refreshToken = tokenStorage.getRefreshToken() ?? undefined;

    try {
      await authService.logout(refreshToken);
    } catch {
      // Signing out locally must succeed even when the API call does not.
    }

    tokenStorage.clear();
    set({ user: null, isAuthenticated: false, error: null });
  },

  refreshProfile: async () => {
    if (!tokenStorage.hasSession()) {
      return;
    }

    const user = await authService.me();
    set({ user, isAuthenticated: true });
  },

  clearError: () => set({ error: null }),

  hasRole: (...roles) => {
    const user = get().user;
    return user ? roles.some((role) => user.roles.includes(role)) : false;
  },

  hasPermission: (...permissions) => {
    const user = get().user;
    return user ? permissions.some((permission) => user.permissions.includes(permission)) : false;
  },

  hasEveryPermission: (...permissions) => {
    const user = get().user;
    return user ? permissions.every((permission) => user.permissions.includes(permission)) : false;
  },
}));

/** Clears the store when the API reports the session can no longer be refreshed. */
export const handleSessionExpired = (): void => {
  tokenStorage.clear();
  useAuthStore.setState({ user: null, isAuthenticated: false, isInitializing: false });
};
