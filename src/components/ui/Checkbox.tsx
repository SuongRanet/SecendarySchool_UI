import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  description?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className, id, ...props }, ref) => (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-2.5',
        props.disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={cn(
          'mt-0.5 size-4 shrink-0 cursor-pointer rounded border-[var(--border-strong)]',
          'accent-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]',
          'disabled:cursor-not-allowed',
        )}
        {...props}
      />

      {label || description ? (
        <span className="flex flex-col gap-0.5">
          {label ? <span className="text-sm text-[var(--text)]">{label}</span> : null}
          {description ? (
            <span className="text-xs text-[var(--text-subtle)]">{description}</span>
          ) : null}
        </span>
      ) : null}
    </label>
  ),
);

Checkbox.displayName = 'Checkbox';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

/** A styled checkbox that reads as an on/off toggle. */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, className, id, checked, ...props }, ref) => (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-center gap-3',
        props.disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <span className="relative inline-flex">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          className="peer sr-only"
          {...props}
        />
        <span
          aria-hidden="true"
          className={cn(
            'block h-6 w-11 rounded-full bg-[var(--border-strong)] transition-colors',
            'peer-checked:bg-[var(--primary)]',
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ring)]',
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform',
            'peer-checked:translate-x-5',
          )}
        />
      </span>

      {label ? <span className="text-sm text-[var(--text)]">{label}</span> : null}
    </label>
  ),
);

Switch.displayName = 'Switch';
