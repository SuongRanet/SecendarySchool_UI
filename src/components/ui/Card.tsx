import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export const Card = ({ padded = false, className, children, ...props }: CardProps) => (
  <div
    className={cn(
      'rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm',
      padded && 'p-5',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export const CardHeader = ({ title, description, action, className }: CardHeaderProps) => (
  <div
    className={cn(
      'flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4',
      className,
    )}
  >
    <div className="min-w-0">
      <h2 className="truncate text-base font-semibold text-[var(--text)]">{title}</h2>
      {description ? (
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">{description}</p>
      ) : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

export const CardBody = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3.5',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
