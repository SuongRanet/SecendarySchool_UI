import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToastStore } from '@/stores/toast.store';
import type { ToastTone } from '@/stores/toast.store';
import { cn } from '@/utils/cn';

const ICONS: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TONES: Record<ToastTone, string> = {
  success: 'border-l-[var(--success)] text-[var(--success)]',
  error: 'border-l-[var(--danger)] text-[var(--danger)]',
  warning: 'border-l-[var(--warning)] text-[var(--warning)]',
  info: 'border-l-[var(--info)] text-[var(--info)]',
};

/** Renders queued toasts in a live region so screen readers announce them. */
export const Toaster = () => {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) {
    return null;
  }

  return createPortal(
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((item) => {
        const Icon = ICONS[item.tone];

        return (
          <div
            key={item.id}
            role="alert"
            className={cn(
              'animate-slide-in-right pointer-events-auto flex items-start gap-3 rounded-lg border border-l-4 border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-lg',
              TONES[item.tone],
            )}
          >
            <Icon className="mt-0.5 size-4.5 shrink-0" aria-hidden="true" />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text)]">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">{item.description}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss notification"
              className="-mr-1 -mt-1 rounded p-1 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
};
