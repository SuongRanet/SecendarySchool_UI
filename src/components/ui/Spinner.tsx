import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const SIZES: Record<NonNullable<SpinnerProps['size']>, string> = {
  xs: 'size-3',
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
};

export const Spinner = ({ size = 'md', className, label }: SpinnerProps) => (
  <Loader2
    aria-hidden={label ? undefined : true}
    aria-label={label}
    role={label ? 'status' : undefined}
    className={cn('animate-spin', SIZES[size], className)}
  />
);
