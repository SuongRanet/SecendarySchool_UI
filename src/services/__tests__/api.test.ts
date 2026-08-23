import { describe, expect, it } from 'vitest';
import { ApiError } from '@/types/api';
import { cleanParams, http } from '../api';
import { AUTH_EXPIRED_EVENT, emitAuthExpired, tokenStorage } from '../token-storage';

describe('cleanParams', () => {
  it('drops undefined, null and empty string so they never reach the query string', () => {
    expect(
      cleanParams({ search: '', page: 1, classId: undefined, status: null, limit: 20 }),
    ).toEqual({ page: 1, limit: 20 });
  });

  it('keeps a literal zero and a literal false', () => {
    expect(cleanParams({ offset: 0, includeArchived: false })).toEqual({
      offset: 0,
      includeArchived: false,
    });
  });

  it('returns an empty object when nothing is set', () => {
    expect(cleanParams({ search: '', status: undefined })).toEqual({});
  });
});

describe('http client', () => {
  it('is configured against the versioned API base path', () => {
    expect(http.defaults.baseURL).toContain('/api/v1');
  });

  it('attaches the stored access token as a bearer header', async () => {
    tokenStorage.save({ accessToken: 'access-123', refreshToken: 'refresh-456', expiresIn: '15m' });

    const handler = http.interceptors.request as unknown as {
      handlers: { fulfilled: (config: unknown) => Promise<unknown> }[];
    };

    const config = (await handler.handlers[0].fulfilled({ headers: {} })) as {
      headers: Record<string, string>;
    };

    expect(config.headers.Authorization).toBe('Bearer access-123');
  });

  it('sends no authorization header when there is no session', async () => {
    tokenStorage.clear();

    const handler = http.interceptors.request as unknown as {
      handlers: { fulfilled: (config: unknown) => Promise<unknown> }[];
    };

    const config = (await handler.handlers[0].fulfilled({ headers: {} })) as {
      headers: Record<string, string>;
    };

    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe('tokenStorage', () => {
  it('round-trips a token pair', () => {
    tokenStorage.save({ accessToken: 'a', refreshToken: 'r', expiresIn: '15m' });

    expect(tokenStorage.getAccessToken()).toBe('a');
    expect(tokenStorage.getRefreshToken()).toBe('r');
    expect(tokenStorage.hasSession()).toBe(true);
  });

  it('clears both tokens on sign out', () => {
    tokenStorage.save({ accessToken: 'a', refreshToken: 'r', expiresIn: '15m' });
    tokenStorage.clear();

    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
    expect(tokenStorage.hasSession()).toBe(false);
  });

  it('announces an expired session so the application can sign the user out', () => {
    let fired = false;
    const listener = () => {
      fired = true;
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, listener);
    emitAuthExpired();
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);

    expect(fired).toBe(true);
  });
});

describe('ApiError', () => {
  it('recognises a field level validation failure by its code', () => {
    expect(new ApiError('Validation failed', 422, 'VALIDATION_ERROR').isValidationError).toBe(true);
  });

  it('recognises a validation failure that only carries field errors', () => {
    const error = new ApiError('Bad request', 400, 'BAD_REQUEST', [
      { field: 'email', message: 'Invalid email' },
    ]);

    expect(error.isValidationError).toBe(true);
    expect(error.fieldErrors).toHaveLength(1);
  });

  it('does not treat an ordinary failure as a validation error', () => {
    expect(new ApiError('Not found', 404, 'STUDENT_NOT_FOUND').isValidationError).toBe(false);
  });

  it('recognises a network failure', () => {
    expect(new ApiError('Offline', 0, 'NETWORK_ERROR').isNetworkError).toBe(true);
  });
});
