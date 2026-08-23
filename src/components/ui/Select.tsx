import { forwardRef } from 'react';
import type { SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { inputBaseClasses } from './Input';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
  selectSize?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'h-8 text-sm',
  md: 'h-10',
  lg: 'h-11 text-base',
} as const;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, placeholder, selectSize = 'md', className, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(inputBaseClasses, SIZES[selectSize], 'appearance-none pr-9', className)}
        {...props}
      >
        {placeholder ? (
          <option value="">{placeholder}</option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-subtle)]"
      />
    </div>
  ),
);

Select.displayName = 'Select';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(inputBaseClasses, 'min-h-20 resize-y py-2 leading-relaxed', className)}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';
