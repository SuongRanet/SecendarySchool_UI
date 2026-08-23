import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

type VerifyState = 'verifying' | 'success' | 'failed';

export const VerifyPage = () => {
  const { t } = useTranslation(['auth', 'common']);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'failed');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setMessage(t('auth:verify.missingToken'));
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        await authService.verifyEmail(token);

        if (!cancelled) {
          setState('success');
        }
      } catch (caught) {
        if (!cancelled) {
          setState('failed');
          setMessage(caught instanceof ApiError ? caught.message : t('common:toast.failed'));
        }
      }
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token, t]);

  if (state === 'verifying') {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Spinner size="lg" className="text-[var(--primary)]" />
        <p className="text-sm text-[var(--text-muted)]">{t('auth:verify.verifying')}</p>
      </div>
    );
  }

  const isSuccess = state === 'success';

  return (
    <div className="text-center">
      <span
        className={
          isSuccess
            ? 'mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]'
            : 'mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]'
        }
      >
        {isSuccess ? (
          <CheckCircle2 className="size-6" aria-hidden="true" />
        ) : (
          <AlertCircle className="size-6" aria-hidden="true" />
        )}
      </span>

      <h1 className="text-xl font-semibold text-[var(--text)]">
        {t(isSuccess ? 'auth:verify.successTitle' : 'auth:verify.failedTitle')}
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        {isSuccess ? t('auth:verify.successMessage') : message}
      </p>

      <Link to={ROUTES.login} className="mt-6 inline-block">
        <Button size="lg" variant={isSuccess ? 'primary' : 'secondary'}>
          {t('auth:login.submit')}
        </Button>
      </Link>
    </div>
  );
};
