import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  BookOpen,
  CalendarClock,
  CheckCheck,
  ClipboardCheck,
  FileCheck2,
  Megaphone,
  Star,
  UserX,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { notificationService } from '@/services/engagement.service';
import { useLanguageStore } from '@/stores/language.store';
import { useNotificationStore } from '@/stores/notification.store';
import { formatRelativeTime } from '@/utils/format';
import type { AppNotification } from '@/types/entities';
import type { NotificationType } from '@/types/domain';
import { cn } from '@/utils/cn';

/**
 * The bell that makes notifications visible.
 *
 * Everything behind this already existed — the tables, the dispatch, the API —
 * but nothing in the interface read any of it, so a teacher was never told that
 * homework had been handed in and a pupil was never told it had been marked.
 * The records were being written and never delivered.
 */

/** How often the unread count refreshes while the app is open. */
const POLL_MS = 60_000;

/** How many notifications the panel shows at once. */
const PAGE_SIZE = 12;

const ICONS: Record<NotificationType, LucideIcon> = {
  ANNOUNCEMENT: Megaphone,
  ATTENDANCE_ALERT: UserX,
  NEW_ASSIGNMENT: BookOpen,
  HOMEWORK_SUBMITTED: ClipboardCheck,
  HOMEWORK_GRADED: FileCheck2,
  NEW_GRADE: Star,
  UPCOMING_EXAM: CalendarClock,
  PAYMENT_REMINDER: Bell,
  SYSTEM: Bell,
};

const TONES: Record<NotificationType, string> = {
  ANNOUNCEMENT: 'text-[var(--info)]',
  ATTENDANCE_ALERT: 'text-[var(--warning)]',
  NEW_ASSIGNMENT: 'text-[var(--primary-500)]',
  HOMEWORK_SUBMITTED: 'text-[var(--success)]',
  HOMEWORK_GRADED: 'text-[var(--success)]',
  NEW_GRADE: 'text-[var(--accent)]',
  UPCOMING_EXAM: 'text-[var(--warning)]',
  PAYMENT_REMINDER: 'text-[var(--text-muted)]',
  SYSTEM: 'text-[var(--text-muted)]',
};

export const NotificationBell = () => {
  const { t } = useTranslation(['navigation', 'common']);
  const navigate = useNavigate();
  const language = useLanguageStore((state) => state.language);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * The counts live in the store rather than here, because the sidebar badges
   * read the same figures. This component owns the polling; everything else
   * subscribes.
   */
  const unread = useNotificationStore((state) => state.count);
  const refreshCounts = useNotificationStore((state) => state.refresh);
  const markedOne = useNotificationStore((state) => state.markedOne);
  const clearCounts = useNotificationStore((state) => state.clear);

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);

    try {
      const result = await notificationService.list({ page: 1, limit: PAGE_SIZE });
      setItems(result.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // The count is polled so a teacher sitting on one page still sees work
  // arriving, rather than only after a navigation.
  useEffect(() => {
    void refreshCounts();
    const timer = window.setInterval(() => void refreshCounts(), POLL_MS);

    return () => window.clearInterval(timer);
  }, [refreshCounts]);

  useEffect(() => {
    if (open) {
      void loadItems();
    }
  }, [open, loadItems]);

  // Close on an outside click or Escape, the same way the user menu does.
  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const openNotification = async (notification: AppNotification) => {
    setOpen(false);

    if (!notification.isRead) {
      // Marked locally first so the row does not stay bold while the request
      // is in flight, then confirmed against the server.
      setItems((current) =>
        current.map((row) =>
          row.recipientId === notification.recipientId ? { ...row, isRead: true } : row,
        ),
      );
      markedOne(notification.type);

      try {
        await notificationService.markRead(notification.recipientId);
      } catch {
        void refreshCounts();
      }
    }

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const markAllRead = async () => {
    setItems((current) => current.map((row) => ({ ...row, isRead: true })));
    clearCounts();

    try {
      await notificationService.markAllRead();
    } catch {
      void refreshCounts();
      void loadItems();
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          unread > 0
            ? t('navigation:notifications.unreadLabel', { count: unread })
            : t('navigation:notifications.label')
        }
        className="relative rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-semibold leading-4 text-white"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t('navigation:notifications.label')}
          className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--text)]">
              {t('navigation:notifications.label')}
            </h2>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[var(--primary-500)] transition-colors hover:bg-[var(--surface-hover)]"
              >
                <CheckCheck className="size-3.5" />
                {t('navigation:notifications.markAllRead')}
              </button>
            ) : null}
          </div>

          <div className="max-h-[24rem] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                {t('common:states.loading')}
              </p>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto size-6 text-[var(--text-subtle)]" />
                <p className="mt-2 text-sm font-medium text-[var(--text)]">
                  {t('navigation:notifications.emptyTitle')}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {t('navigation:notifications.emptyHint')}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {items.map((notification) => {
                  const Icon = ICONS[notification.type] ?? Bell;

                  return (
                    <li key={notification.recipientId}>
                      <button
                        type="button"
                        onClick={() => void openNotification(notification)}
                        className={cn(
                          'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-hover)]',
                          !notification.isRead && 'bg-[var(--surface-hover)]/60',
                        )}
                      >
                        <Icon
                          className={cn(
                            'mt-0.5 size-4 shrink-0',
                            TONES[notification.type] ?? 'text-[var(--text-muted)]',
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'block truncate text-sm text-[var(--text)]',
                              !notification.isRead && 'font-semibold',
                            )}
                          >
                            {notification.title}
                          </span>
                          {notification.body ? (
                            <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
                              {notification.body}
                            </span>
                          ) : null}
                          <span className="mt-1 block text-[11px] text-[var(--text-subtle)]">
                            {formatRelativeTime(notification.createdAt, language)}
                          </span>
                        </span>
                        {!notification.isRead ? (
                          <span
                            aria-hidden="true"
                            className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--primary-500)]"
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
