import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface TabItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
  ariaLabel?: string;
}

/** Horizontal tab bar; scrolls sideways instead of wrapping on narrow screens. */
export const Tabs = ({ items, value, onChange, className, ariaLabel }: TabsProps) => (
  <div
    role="tablist"
    aria-label={ariaLabel}
    className={cn(
      'flex gap-1 overflow-x-auto border-b border-[var(--border)]',
      className,
    )}
  >
    {items.map((item) => {
      const isActive = item.key === value;

      return (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={isActive}
          disabled={item.disabled}
          onClick={() => onChange(item.key)}
          className={cn(
            'inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors',
            'disabled:pointer-events-none disabled:opacity-50',
            isActive
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]',
          )}
        >
          {item.icon}
          {item.label}
          {item.badge}
        </button>
      );
    })}
  </div>
);
