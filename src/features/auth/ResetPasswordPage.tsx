import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { PasswordInput } from '@/components/ui/Input';
import { buildResetPasswordSchema } from './auth.schemas';
import type { ResetPasswordFormValues } from './auth.schemas';
import { PasswordRules } from './PasswordRules';

export const ResetPasswordPage = () => {
  const { t } = useTranslation(['auth', 'validation', 'common']);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(buildResetPasswordSchema(t)),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const password = watch('password');

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      await authService.resetPassword({
        token,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      setDone(true);
    } catch (caught) {
      setSubmitError(caught instanceof ApiError ? caught.message : t('common:toast.failed'));
    }
  });

  if (!token) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]">
          <AlertCircle className="size-6" aria-hidden="true" />
        </span>

        <h1 className="text-xl font-semibold text-[var(--text)]">
          {t('auth:resetPassword.title')}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {t('auth:resetPassword.missingToken')}
        </p>

        <Link
          to={ROUTES.forgotPassword}
          className="mt-6 inline-block text-sm text-[var(--primary)] hover:underline"
        >
          {t('auth:forgotPassword.submit')}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </span>

        <h1 className="text-xl font-semibold text-[var(--text)]">
          {t('auth:resetPassword.successTitle')}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {t('auth:resetPassword.successMessage')}
        </p>

        <Link to={ROUTES.login} className="mt-6 inline-block">
          <Button size="lg">{t('auth:login.submit')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
          {t('auth:resetPassword.title')}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
          {t('auth:resetPassword.subtitle')}
        </p>
      </header>

      {submitError ? (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{submitError}</span>
        </div>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField
          label={t('auth:resetPassword.newPassword')}
          error={errors.password?.message}
          required
        >
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              autoComplete="new-password"
              autoFocus
              showLabel={t('auth:login.showPassword')}
              hideLabel={t('auth:login.hidePassword')}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register('password')}
            />
          )}
        </FormField>

        <PasswordRules password={password ?? ''} />

        <FormField
          label={t('auth:resetPassword.confirmPassword')}
          error={errors.confirmPassword?.message}
          required
        >
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              autoComplete="new-password"
              showLabel={t('auth:login.showPassword')}
              hideLabel={t('auth:login.hidePassword')}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register('confirmPassword')}
            />
          )}
        </FormField>

        <Button
          type="submit"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          leftIcon={<KeyRound className="size-4" />}
        >
          {t('auth:resetPassword.submit')}
        </Button>

        <Link
          to={ROUTES.login}
          className="inline-flex items-center justify-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--primary)]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('auth:forgotPassword.backToLogin')}
        </Link>
      </form>
    </div>
  );
};
