/**
 * Test render helper.
 *
 * Almost every component in the application expects a router and the i18n
 * provider above it, so the suites render through `renderWithProviders` rather
 * than wiring those up one test at a time.
 */
import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/i18n';
import type { AuthProfile, RoleCode } from '@/types/domain';
import { useAuthStore } from '@/stores/auth.store';

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial history entries for the memory router. */
  route?: string;
  routes?: string[];
}

export const renderWithProviders = (
  ui: ReactElement,
  { route = '/', routes, ...options }: RenderWithProvidersOptions = {},
): RenderResult => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={routes ?? [route]}>{children}</MemoryRouter>
    </I18nextProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

/** A signed-in profile for tests, with only the permissions the test needs. */
export const buildProfile = (overrides: Partial<AuthProfile> = {}): AuthProfile =>
  ({
    id: 1,
    username: 'sokha',
    email: 'sokha@example.com',
    status: 'ACTIVE',
    roles: ['ADMIN'] as RoleCode[],
    permissions: [],
    fullName: 'Sokha Chan',
    profileType: null,
    teacherId: null,
    studentId: null,
    parentId: null,
    lastLoginAt: null,
    ...overrides,
  }) as AuthProfile;

/** Puts a user into the auth store as if they had just signed in. */
export const signIn = (profile: AuthProfile = buildProfile()): AuthProfile => {
  useAuthStore.setState({
    user: profile,
    isAuthenticated: true,
    isInitializing: false,
    error: null,
  });

  return profile;
};

/** Clears the auth store between tests. */
export const signOut = (): void => {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isInitializing: false,
    error: null,
  });
};
