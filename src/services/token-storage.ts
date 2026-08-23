import type { AuthTokens } from '@/types/domain';

const ACCESS_TOKEN_KEY = 'sms.accessToken';
const REFRESH_TOKEN_KEY = 'sms.refreshToken';

/**
 * Token persistence kept separate from the auth store so the Axios interceptors
 * can read and rotate tokens without importing the store — which would create a
 * cycle between the API client and the state it feeds.
 */
export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  save(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  hasSession(): boolean {
    return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
  },
};

/** Broadcast when the session can no longer be refreshed. */
export const AUTH_EXPIRED_EVENT = 'sms:auth-expired';

export const emitAuthExpired = (): void => {
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
};
