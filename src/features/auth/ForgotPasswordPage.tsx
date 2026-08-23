import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MailCheck, Send } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/types/api';
import { toast } from '@/stores/toast.store';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { buildForgotPasswordSchema } from './auth.schemas';
import type { ForgotPasswordFormValues } from './auth.schemas';

export const ForgotPasswordPage = () => {
  const { t } = useTranslation(['auth', 'validation', 'common']);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(buildForgotPasswordSchema(t)),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await authService.forgotPassword(values.email);
      setSentTo(values.email);
      setDevToken(result.token ?? null);
    } catch (caught) {
      toast.error(
        caught instanceof ApiError ? caught.message : t('common:toast.failed'),
      );
    }
  });

  if (sentTo) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>

        <h1 className="text-xl font-semibold text-[var(--text)]">
          {t('auth:forgotPassword.sentTitle')}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {t('auth:forgotPassword.sentMessage', { email: sentTo })}
        </p>

        {devToken ? (
          <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-left">
            <p className="text-xs text-[var(--text-subtle)]">
              {t('auth:forgotPassword.devTokenNotice')}
            </p>
            <code className="mt-2 block break-all rounded bg-[var(--surface)] p-2 text-xs text-[var(--text)]">
              {devToken}
            </code>
            <Link
              to={`${ROUTES.resetPassword}?token=${devToken}`}
              className="mt-2 inline-block text-sm text-[var(--primary)] hover:underline"
            >
              {t('auth:resetPassword.title')}
            </Link>
          </div>
        ) : null}

        <Link
          to={ROUTES.login}
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-[var(--primary)] hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('auth:forgotPassword.backToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
          {t('auth:forgotPassword.title')}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
          {t('auth:forgotPassword.subtitle')}
        </p>
      </header>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField label={t('common:labels.email')} error={errors.email?.message} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="name@school.local"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register('email')}
            />
          )}
        </FormField>

        <Button
          type="submit"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          leftIcon={<Send className="size-4" />}
        >
          {t('auth:forgotPassword.submit')}
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
