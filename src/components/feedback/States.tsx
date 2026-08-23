import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Inbox, RefreshCw, SearchX, ShieldAlert } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export interface LoadingStateProps {
  message?: string;
  className?: string;
  compact?: boolean;
}

/** The loading state every data page shows while its first request is in flight. */
export const LoadingState = ({ message, className, compact = false }: LoadingStateProps) => {
  const { t } = useTranslation('common');

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]',
        compact ? 'py-8' : 'py-16',
        className,
      )}
    >
      <Spinner size={compact ? 'md' : 'lg'} className="text-[var(--primary)]" />
      <p className="text-sm">{message ?? t('states.loading')}</p>
    </div>
  );
};

export interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
  variant?: 'empty' | 'no-results';
  className?: string;
}

/** Shown when a request succeeded but returned nothing. */
export const EmptyState = ({
  title,
  message,
  icon,
  action,
  variant = 'empty',
  className,
}: EmptyStateProps) => {
  const { t } = useTranslation('common');
  const fallbackIcon =
    variant === 'no-results' ? <SearchX className="size-6" /> : <Inbox className="size-6" />;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-14 text-center',
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-subtle)]">
        {icon ?? fallbackIcon}
      </span>

      <div className="max-w-sm">
        <p className="text-sm font-medium text-[var(--text)]">
          {title ?? t(variant === 'no-results' ? 'states.noResults' : 'states.empty')}
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {message ?? (variant === 'no-results' ? t('states.noResultsHint') : '')}
        </p>
      </div>

      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
};

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: 'error' | 'forbidden';
  className?: string;
}

/** Shown when a request failed. Always offers a way to try again. */
export const ErrorState = ({
  title,
  message,
  onRetry,
  retryLabel,
  variant = 'error',
  className,
}: ErrorStateProps) => {
  const { t } = useTranslation('common');
  const isForbidden = variant === 'forbidden';

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-14 text-center',
        className,
      )}
    >
      <span
        className={cn(
          'flex size-12 items-center justify-center rounded-full',
          isForbidden
            ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
            : 'bg-[var(--danger-soft)] text-[var(--danger)]',
        )}
      >
        {isForbidden ? <ShieldAlert className="size-6" /> : <AlertTriangle className="size-6" />}
      </span>

      <div className="max-w-sm">
        <p className="text-sm font-medium text-[var(--text)]">
          {title ?? t(isForbidden ? 'states.forbiddenTitle' : 'states.errorTitle')}
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {message ?? t(isForbidden ? 'states.forbiddenHint' : 'states.errorHint')}
        </p>
      </div>

      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} leftIcon={<RefreshCw className="size-4" />}>
          {retryLabel ?? t('actions.retry')}
        </Button>
      ) : null}
    </div>
  );
};

export interface SkeletonProps {
  className?: string;
}

/** A shimmering placeholder used while a small region loads. */
export const Skeleton = ({ className }: SkeletonProps) => (
  <span
    aria-hidden="true"
    className={cn(
      'relative block overflow-hidden rounded-md bg-[var(--surface-muted)]',
      'after:absolute after:inset-0 after:-translate-x-full after:bg-gradient-to-r',
      'after:from-transparent after:via-black/5 after:to-transparent after:content-[""]',
      'after:animate-[shimmer_1.6s_infinite] dark:after:via-white/5',
      className,
    )}
  />
);
