import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/types/api';
import { useAuthStore } from '@/stores/auth.store';
import { buildProfile, renderWithProviders, signOut } from '@/test/render';
import { LoginPage, landingRouteFor } from '../LoginPage';

const originalLogin = useAuthStore.getState().login;

const mockLogin = (implementation: typeof originalLogin) => {
  useAuthStore.setState({ login: implementation });
};

describe('LoginPage', () => {
  afterEach(() => {
    useAuthStore.setState({ login: originalLogin });
    signOut();
  });

  it('renders the sign-in form', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows a validation message for each empty field instead of calling the API', async () => {
    const login = vi.fn();
    mockLogin(login as unknown as typeof originalLogin);

    renderWithProviders(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(2);
    });

    expect(login).not.toHaveBeenCalled();
  });

  it('submits the trimmed credentials', async () => {
    const login = vi.fn().mockResolvedValue(buildProfile());
    mockLogin(login as unknown as typeof originalLogin);

    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/username or email/i), '  sokha  ');
    await userEvent.type(screen.getByLabelText(/^password/i), 'Str0ngPass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('sokha', 'Str0ngPass');
    });
  });

  it('reveals and hides the password', async () => {
    renderWithProviders(<LoginPage />);

    const field = screen.getByLabelText(/^password/i);
    expect(field).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(field).toHaveAttribute('type', 'text');

    await userEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(field).toHaveAttribute('type', 'password');
  });

  it('shows the store error when the credentials are rejected', async () => {
    const login = vi.fn().mockImplementation(async () => {
      useAuthStore.setState({ error: 'Invalid username or password' });
      throw new ApiError('Invalid username or password', 401, 'INVALID_CREDENTIALS');
    });
    mockLogin(login as unknown as typeof originalLogin);

    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/username or email/i), 'sokha');
    await userEvent.type(screen.getByLabelText(/^password/i), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
  });

  it('maps a field level validation error onto the right input', async () => {
    const login = vi.fn().mockRejectedValue(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
        { field: 'identifier', message: 'This account is not recognised' },
      ]),
    );
    mockLogin(login as unknown as typeof originalLogin);

    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/username or email/i), 'ghost');
    await userEvent.type(screen.getByLabelText(/^password/i), 'Str0ngPass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('This account is not recognised')).toBeInTheDocument();
  });

  it('offers a link to the forgotten password page', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('link', { name: /forgot your password/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });
});

describe('landingRouteFor', () => {
  it.each([
    ['SUPER_ADMIN', '/dashboard'],
    ['ADMIN', '/dashboard'],
    ['PRINCIPAL', '/dashboard'],
  ] as const)('sends %s to the administrative dashboard', (role, expected) => {
    expect(landingRouteFor(buildProfile({ roles: [role] }))).toBe(expected);
  });

  it.each(['TEACHER', 'HOMEROOM_TEACHER'] as const)('sends %s to the teacher workspace', (role) => {
    expect(landingRouteFor(buildProfile({ roles: [role] }))).toBe('/teacher/dashboard');
  });

  it('sends a parent to the parent portal', () => {
    expect(landingRouteFor(buildProfile({ roles: ['PARENT'] }))).toBe('/parent/dashboard');
  });

  it('prefers the administrative dashboard for a user who is both an admin and a teacher', () => {
    expect(landingRouteFor(buildProfile({ roles: ['TEACHER', 'ADMIN'] }))).toBe('/dashboard');
  });
});

describe('landingRouteFor — student portal', () => {
  it('sends a student to their own portal, not the administrator dashboard', () => {
    expect(landingRouteFor(buildProfile({ roles: ['STUDENT'] }))).toBe('/student/dashboard');
  });

  it('still prefers the staff dashboard for someone who is both staff and a student', () => {
    expect(landingRouteFor(buildProfile({ roles: ['TEACHER', 'STUDENT'] }))).toBe(
      '/teacher/dashboard',
    );
  });
});
