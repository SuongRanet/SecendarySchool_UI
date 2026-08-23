import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  closeLabel?: string;
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[min(80rem,95vw)]',
} as const;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A modal dialog rendered in a portal. Focus is trapped while it is open and
 * returned to the trigger when it closes, and the page behind it cannot scroll.
 */
export const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeLabel = 'Close',
}: ModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  /**
   * Opening and closing: remember where focus was, lock the page behind the
   * dialog, move focus inside, and put it back on the way out.
   *
   * This deliberately depends on `open` alone. It used to depend on the key
   * handler too, whose identity changes whenever the caller passes an inline
   * `onClose` — which nearly every page does. Each keystroke in a dialog field
   * re-rendered the page, gave the effect a new dependency, and ran the cleanup
   * and the setup again: focus was restored to the element behind the dialog and
   * then dropped onto the first focusable thing inside it, the close button. The
   * user was thrown out of the field they were typing in, one character in.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = window.setTimeout(() => {
      const focusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (focusable ?? dialogRef.current)?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open]);

  // The key handler is registered separately, so a new handler identity swaps
  // the listener without disturbing focus.
  useEffect(() => {
    if (!open) {
      return;
    }

    document.addEventListener('keydown', handleKeyDown, true);

    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, handleKeyDown]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        aria-hidden="true"
        onClick={closeOnBackdrop ? onClose : undefined}
        className="animate-fade-in absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={cn(
          'animate-scale-in relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-[var(--surface)] shadow-2xl sm:rounded-xl',
          SIZES[size],
        )}
      >
        {title ? (
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
              {description ? (
                <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="-mr-1 rounded-md p-1.5 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};
