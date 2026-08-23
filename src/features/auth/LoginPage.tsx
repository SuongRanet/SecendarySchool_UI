import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { AlertCircle, LogIn } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/types/api';
import type { AuthProfile } from '@/types/domain';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input, PasswordInput } from '@/components/ui/Input';
import { buildLoginSchema } from './auth.schemas';
import type { LoginFormValues } from './auth.schemas';

/** Where a user lands right after signing in, based on their primary role. */
export const landingRouteFor = (user: AuthProfile): string => {
  if (user.roles.some((role) => ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'ACCOUNTANT'].includes(role))) {
    return ROUTES.dashboard;
  }

  if (user.roles.some((role) => ['TEACHER', 'HOMEROOM_TEACHER'].includes(role))) {
    return ROUTES.teacher.dashboard;
  }

  if (user.roles.includes('PARENT')) {
    return ROUTES.parent.dashboard;
  }

  // Grades 7-9 sign in daily and belong in their own portal, not the
  // administrator dashboard they have no permission to read.
  if (user.roles.includes('STUDENT')) {
    return ROUTES.student.dashboard;
  }

  return ROUTES.dashboard;
};

export const LoginPage = () => {
  const { t } = useTranslation(['auth', 'validation', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(buildLoginSchema(t)),
    defaultValues: { identifier: '', password: '' },
  });

  useEffect(() => clearError, [clearError]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const user = await login(values.identifier, values.password);
      const redirectTo = (location.state as { from?: string } | null)?.from;

      navigate(redirectTo ?? landingRouteFor(user), { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError && caught.isValidationError) {
        for (const fieldError of caught.fieldErrors) {
          if (fieldError.field === 'identifier' || fieldError.field === 'password') {
            setFieldError(fieldError.field, { message: fieldError.message });
          }
        }
      }
    }
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
          {t('auth:login.title')}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">{t('auth:login.subtitle')}</p>
      </header>

      {error ? (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField label={t('auth:login.identifier')} error={errors.identifier?.message} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              autoComplete="username"
              autoFocus
              placeholder={t('auth:login.identifierPlaceholder')}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register('identifier')}
            />
          )}
        </FormField>

        <FormField label={t('auth:login.password')} error={errors.password?.message} required>
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              autoComplete="current-password"
              placeholder={t('auth:login.passwordPlaceholder')}
              showLabel={t('auth:login.showPassword')}
              hideLabel={t('auth:login.hidePassword')}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register('password')}
            />
          )}
        </FormField>

        <div className="flex justify-end">
          <Link
            to={ROUTES.forgotPassword}
            className="text-sm text-[var(--primary)] transition-colors hover:underline"
          >
            {t('auth:login.forgotPassword')}
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          loadingText={t('auth:login.submitting')}
          leftIcon={<LogIn className="size-4" />}
        >
          {t('auth:login.submit')}
        </Button>
      </form>
    </div>
  );
};
