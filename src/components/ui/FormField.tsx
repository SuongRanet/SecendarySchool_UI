import { useId } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface FormFieldProps {
  label?: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  optionalLabel?: string;
  className?: string;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

/**
 * Wraps a control with its label, hint and error message and wires up the
 * `id` / `aria-describedby` / `aria-invalid` relationships that screen readers
 * rely on.
 */
export const FormField = ({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  optionalLabel,
  className,
  children,
}: FormFieldProps) => {
  const generatedId = useId();
  const id = htmlFor ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-[var(--text)]">
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-1 text-[var(--danger)]">
              *
            </span>
          ) : optionalLabel ? (
            <span className="ml-1.5 text-xs font-normal text-[var(--text-subtle)]">
              ({optionalLabel})
            </span>
          ) : null}
        </label>
      ) : null}

      {children({ id, describedBy, invalid: Boolean(error) })}

      {error ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-sm text-[var(--danger)]">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-[var(--text-subtle)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
};
