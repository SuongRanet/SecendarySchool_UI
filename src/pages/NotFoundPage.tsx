import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { Button } from '@/components/ui/Button';

export const NotFoundPage = () => {
  const { t } = useTranslation(['common', 'navigation']);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-subtle)]">
        <Compass className="size-7" aria-hidden="true" />
      </span>

      <div>
        <p className="text-4xl font-semibold text-[var(--text)]">404</p>
        <h1 className="mt-2 text-lg font-medium text-[var(--text)]">
          {t('common:states.notFoundTitle')}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t('common:states.notFoundHint')}</p>
      </div>

      <Link to={ROUTES.dashboard}>
        <Button variant="secondary">{t('navigation:items.dashboard')}</Button>
      </Link>
    </div>
  );
};
