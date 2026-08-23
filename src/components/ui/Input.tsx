import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/cn';

export const inputBaseClasses = cn(
  'w-full rounded-lg border bg-[var(--surface)] px-3 text-sm text-[var(--text)] transition-colors',
  'border-[var(--border)] placeholder:text-[var(--text-subtle)]',
  'focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/25',
  'disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:opacity-60',
  'aria-[invalid=true]:border-[var(--danger)] aria-[invalid=true]:focus:ring-[var(--danger)]/25',
);

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'h-8 text-sm',
  md: 'h-10',
  lg: 'h-11 text-base',
} as const;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ leftIcon, rightSlot, inputSize = 'md', className, ...props }, ref) => (
    <div className="relative">
      {leftIcon ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
        >
          {leftIcon}
        </span>
      ) : null}

      <input
        ref={ref}
        className={cn(
          inputBaseClasses,
          SIZES[inputSize],
          leftIcon && 'pl-9',
          rightSlot && 'pr-10',
          className,
        )}
        {...props}
      />

      {rightSlot ? (
        <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>
      ) : null}
    </div>
  ),
);

Input.displayName = 'Input';

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightSlot'> {
  showLabel?: string;
  hideLabel?: string;
}

/** A password field with a reveal toggle. */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showLabel = 'Show password', hideLabel = 'Hide password', ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        rightSlot={
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? hideLabel : showLabel}
            className="rounded-md p-1.5 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
        {...props}
      />
    );
  },
);

PasswordInput.displayName = 'PasswordInput';
