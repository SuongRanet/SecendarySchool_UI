import { api } from './api';
import type { AuthProfile, AuthResult } from '@/types/domain';

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const authService = {
  login: (payload: LoginPayload): Promise<AuthResult> =>
    api.post<AuthResult>('/auth/login', payload, { skipAuthRefresh: true } as never),

  logout: (refreshToken?: string): Promise<null> =>
    api.post<null>('/auth/logout', { refreshToken }),

  me: (): Promise<AuthProfile> => api.get<AuthProfile>('/auth/me'),

  /**
   * Starts a reset. The reply is the same whether or not the address is
   * registered; `code` comes back only outside production, so the flow can be
   * finished without a mail server.
   */
  forgotPassword: (email: string): Promise<{ sentTo: string; code?: string }> =>
    api.post<{ sentTo: string; code?: string }>('/auth/forgot-password', { email }),

  verifyResetCode: (email: string, code: string): Promise<{ verified: true }> =>
    api.post<{ verified: true }>('/auth/verify-reset-code', { email, code }),

  resetPassword: (payload: ResetPasswordPayload): Promise<null> =>
    api.post<null>('/auth/reset-password', payload),

  changePassword: (payload: ChangePasswordPayload): Promise<null> =>
    api.post<null>('/auth/change-password', payload),

  verifyEmail: (token: string): Promise<null> => api.post<null>('/auth/verify-email', { token }),

  resendVerification: (email: string): Promise<{ token?: string }> =>
    api.post<{ token?: string }>('/auth/resend-verification', { email }),
};
