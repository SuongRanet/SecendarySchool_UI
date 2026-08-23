import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { Skeleton } from '@/components/feedback/States';

export type StatTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'neutral';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: StatTone;
  hint?: ReactNode;
  to?: string;
  isLoading?: boolean;
  className?: string;
}

const TONES: Record<StatTone, string> = {
  primary: 'bg-[var(--primary-soft)] text-[var(--primary)]',
  success: 'bg-[var(--success-soft)] text-[var(--success)]',
  warning: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
  info: 'bg-[var(--info-soft)] text-[var(--info)]',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent)]',
  neutral: 'bg-[var(--surface-muted)] text-[var(--text-muted)]',
};

/** A single headline number on a dashboard. */
export const StatCard = ({
  label,
  value,
  icon,
  tone = 'primary',
  hint,
  to,
  isLoading = false,
  className,
}: StatCardProps) => {
  const content = (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition-colors',
        to && 'hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]',
        className,
      )}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', TONES[tone])}
        >
          {icon}
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[var(--text-muted)]">{label}</p>

        {isLoading ? (
          <Skeleton className="mt-1.5 h-7 w-20" />
        ) : (
          <p className="mt-0.5 truncate text-2xl font-semibold tracking-tight text-[var(--text)]">
            {value}
          </p>
        )}

        {hint ? <div className="mt-1 text-xs text-[var(--text-subtle)]">{hint}</div> : null}
      </div>
    </div>
  );

  return to ? (
    <Link to={to} className="block focus-visible:outline-none">
      {content}
    </Link>
  ) : (
    content
  );
};
