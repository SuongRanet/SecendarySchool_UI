import axios from 'axios';
import type { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from '@/types/api';
import type { ApiErrorBody, ApiSuccess, PaginatedData } from '@/types/api';
import type { AuthTokens } from '@/types/domain';
import { emitAuthExpired, tokenStorage } from './token-storage';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
  skipAuthRefresh?: boolean;
}

export const http: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ---------------------------------------------------------------------------
// Access token refresh
//
// While a refresh is in flight every other 401 waits on the same promise, so a
// page that fires six requests at once triggers exactly one refresh.
// ---------------------------------------------------------------------------
let refreshPromise: Promise<AuthTokens> | null = null;

const performRefresh = async (): Promise<AuthTokens> => {
  const refreshToken = tokenStorage.getRefreshToken();

  if (!refreshToken) {
    throw new ApiError('Session expired', 401, 'SESSION_EXPIRED');
  }

  const response = await axios.post<ApiSuccess<{ tokens: AuthTokens }>>(
    `${API_URL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );

  const tokens = response.data.data.tokens;
  tokenStorage.save(tokens);

  return tokens;
};

const refreshAccessToken = async (): Promise<AuthTokens> => {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

const normalizeError = (error: AxiosError<ApiErrorBody>): ApiError => {
  if (error.response) {
    const body = error.response.data;

    return new ApiError(
      body?.message ?? 'The request could not be completed',
      error.response.status,
      body?.error?.code ?? 'REQUEST_FAILED',
      body?.errors ?? [],
      body?.error?.details,
    );
  }

  if (error.code === 'ECONNABORTED') {
    return new ApiError('The request timed out. Please try again.', 0, 'TIMEOUT');
  }

  return new ApiError(
    'Unable to reach the server. Check your connection and try again.',
    0,
    'NETWORK_ERROR',
  );
};

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;

    const canRetry =
      status === 401 &&
      config &&
      !config._retried &&
      !config.skipAuthRefresh &&
      code !== 'INVALID_CREDENTIALS' &&
      !config.url?.includes('/auth/login') &&
      !config.url?.includes('/auth/refresh');

    if (canRetry) {
      config._retried = true;

      try {
        const tokens = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return await http.request(config);
      } catch {
        tokenStorage.clear();
        emitAuthExpired();
        return Promise.reject(
          new ApiError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED'),
        );
      }
    }

    if (status === 401 && !config?.url?.includes('/auth/')) {
      tokenStorage.clear();
      emitAuthExpired();
    }

    return Promise.reject(normalizeError(error));
  },
);

/** Unwraps `{ success, message, data }` and returns `data`. */
export const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const response = await http.request<ApiSuccess<T>>(config);
  return response.data.data;
};

/** Unwraps a paginated response into `{ items, pagination }`. */
export const requestPaginated = async <T>(
  config: AxiosRequestConfig,
): Promise<PaginatedData<T>> => {
  const response = await http.request<ApiSuccess<T[]>>(config);

  return {
    items: response.data.data,
    pagination:
      response.data.pagination ?? {
        page: 1,
        limit: response.data.data.length,
        total: response.data.data.length,
        totalPages: 1,
      },
  };
};

export const api = {
  get: <T>(url: string, params?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    request<T>({ ...config, method: 'GET', url, params }),

  getPaginated: <T>(
    url: string,
    params?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<PaginatedData<T>> =>
    requestPaginated<T>({ ...config, method: 'GET', url, params }),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    request<T>({ ...config, method: 'POST', url, data }),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    request<T>({ ...config, method: 'PUT', url, data }),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    request<T>({ ...config, method: 'PATCH', url, data }),

  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    request<T>({ ...config, method: 'DELETE', url }),
};

/** Removes empty strings, `null` and `undefined` from a query object. */
export const cleanParams = <T extends object>(params: T): Partial<T> => {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    result[key] = value;
  }

  return result as Partial<T>;
};
