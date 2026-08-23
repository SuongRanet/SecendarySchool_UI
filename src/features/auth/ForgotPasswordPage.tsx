import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, KeyRound, MailCheck, Send, ShieldCheck } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/types/api';
import { toast } from '@/stores/toast.store';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { PasswordRules } from './PasswordRules';
import { buildForgotPasswordSchema, buildResetPasswordSchema } from './auth.schemas';
import type { ForgotPasswordFormValues, ResetPasswordFormValues } from './auth.schemas';

/**
 * Resetting a forgotten password, in three steps on one page.
 *
 * Keeping the whole journey here rather than across routes means the address
 * and the code stay in memory and never travel in the URL, and a person cannot
 * land halfway through with no context.
 */
type Step = 'email' | 'code' | 'password';

const RESEND_SECONDS = 60;

export const ForgotPasswordPage = () => {
  const { t } = useTranslation(['auth', 'validation', 'common']);
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>(undefined);
  const [isChecking, setChecking] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  /** Only ever populated outside production, where no mail server is configured. */
  const [devCode, setDevCode] = useState<string | null>(null);

  const codeInputRef = useRef<HTMLInputElement | null>(null);

  const emailForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(buildForgotPasswordSchema(t)),
    defaultValues: { email: '' },
  });

  const passwordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(buildResetPasswordSchema(t)),
    defaultValues: { password: '', confirmPassword: '' },
  });

  // Countdown for the resend link, so the code cannot be requested in a loop.
  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);

    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (step === 'code') {
      codeInputRef.current?.focus();
    }
  }, [step]);

  const requestCode = async (address: string) => {
    const result = await authService.forgotPassword(address);

    setEmail(address);
    setSentTo(result.sentTo);
    setDevCode(result.code ?? null);
    setSecondsLeft(RESEND_SECONDS);
    setStep('code');
  };

  const onSubmitEmail = emailForm.handleSubmit(async (values) => {
    try {
      await requestCode(values.email);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : t('common:toast.failed'));
    }
  });

  const onSubmitCode = async (event: React.FormEvent) => {
    event.preventDefault();

    if (code.trim().length < 4) {
      setCodeError(t('auth:resetPassword.codeRequired'));
      return;
    }

    setChecking(true);
    setCodeError(undefined);

    try {
      await authService.verifyResetCode(email, code.trim());
      setStep('password');
    } catch (caught) {
      setCodeError(caught instanceof ApiError ? caught.message : t('common:toast.failed'));
    } finally {
      setChecking(false);
    }
  };

  const onSubmitPassword = passwordForm.handleSubmit(async (values) => {
    try {
      await authService.resetPassword({
        email,
        code: code.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
      });

      toast.success(t('auth:resetPassword.success'));
      navigate(ROUTES.login, { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'INVALID_RESET_CODE') {
        // The code expired while the new password was being typed.
        setCodeError(caught.message);
        setStep('code');
        return;
      }

      toast.error(caught instanceof ApiError ? caught.message : t('common:toast.failed'));
    }
  });

  const resend = async () => {
    try {
      await requestCode(email);
      toast.success(t('auth:forgotPassword.resent'));
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : t('common:toast.failed'));
    }
  };

  const stepIndex = step === 'email' ? 0 : step === 'code' ? 1 : 2;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
          {step === 'password'
            ? t('auth:resetPassword.title')
            : t('auth:forgotPassword.title')}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
          {step === 'email'
            ? t('auth:forgotPassword.subtitle')
            : step === 'code'
              ? t('auth:forgotPassword.sentMessage', { email: sentTo })
              : t('auth:resetPassword.subtitle')}
        </p>

        {/* Three steps, so it is clear how much is left. */}
        <ol className="mt-5 flex items-center gap-2" aria-label={t('auth:forgotPassword.title')}>
          {[0, 1, 2].map((index) => (
            <li
              key={index}
              aria-current={index === stepIndex ? 'step' : undefined}
              className={`h-1 flex-1 rounded-full transition-colors ${
                index <= stepIndex ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
              }`}
            />
          ))}
        </ol>
      </header>

      {step === 'email' ? (
        <form onSubmit={onSubmitEmail} noValidate className="flex flex-col gap-4">
          <FormField
            label={t('common:labels.email')}
            error={emailForm.formState.errors.email?.message}
            required
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="name@gmail.com"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...emailForm.register('email')}
              />
            )}
          </FormField>

          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={emailForm.formState.isSubmitting}
            leftIcon={<Send className="size-4" />}
          >
            {t('auth:forgotPassword.submit')}
          </Button>
        </form>
      ) : null}

      {step === 'code' ? (
        <form onSubmit={onSubmitCode} noValidate className="flex flex-col gap-4">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
            <MailCheck className="size-6" aria-hidden="true" />
          </span>

          <FormField label={t('auth:resetPassword.code')} error={codeError} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                ref={codeInputRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                placeholder="123456"
                value={code}
                // Digits only: people paste codes with stray spaces.
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, ''));
                  setCodeError(undefined);
                }}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className="text-center text-2xl tracking-[0.5em]"
              />
            )}
          </FormField>

          {devCode ? (
            <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-3">
              <p className="text-xs text-[var(--warning)]">
                {t('auth:forgotPassword.devCodeNotice')}
              </p>
              <button
                type="button"
                onClick={() => setCode(devCode)}
                className="mt-1 font-mono text-lg font-semibold tracking-widest text-[var(--text)] hover:underline"
              >
                {devCode}
              </button>
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={isChecking}
            leftIcon={<ShieldCheck className="size-4" />}
          >
            {t('auth:resetPassword.verify')}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setStep('email')}
              className="text-[var(--text-muted)] hover:underline"
            >
              {t('auth:forgotPassword.changeEmail')}
            </button>

            <button
              type="button"
              onClick={resend}
              disabled={secondsLeft > 0}
              className="text-[var(--primary)] hover:underline disabled:cursor-not-allowed disabled:text-[var(--text-subtle)] disabled:no-underline"
            >
              {secondsLeft > 0
                ? t('auth:forgotPassword.resendIn', { seconds: secondsLeft })
                : t('auth:forgotPassword.resend')}
            </button>
          </div>
        </form>
      ) : null}

      {step === 'password' ? (
        <form onSubmit={onSubmitPassword} noValidate className="flex flex-col gap-4">
          <FormField
            label={t('auth:resetPassword.newPassword')}
            error={passwordForm.formState.errors.password?.message}
            required
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                autoFocus
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...passwordForm.register('password')}
              />
            )}
          </FormField>

          <PasswordRules password={passwordForm.watch('password')} />

          <FormField
            label={t('auth:resetPassword.confirmPassword')}
            error={passwordForm.formState.errors.confirmPassword?.message}
            required
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...passwordForm.register('confirmPassword')}
              />
            )}
          </FormField>

          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={passwordForm.formState.isSubmitting}
            leftIcon={<KeyRound className="size-4" />}
          >
            {t('auth:resetPassword.submit')}
          </Button>
        </form>
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
};
