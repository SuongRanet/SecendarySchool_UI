import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  BellRing,
  CalendarCheck,
  CheckCheck,
  ClipboardList,
  GraduationCap,
  Megaphone,
} from 'lucide-react';
import { notificationService } from '@/services/engagement.service';
import type { NotificationType } from '@/types/domain';
import type { AppNotification } from '@/types/entities';
import { useListQuery } from '@/hooks/useListQuery';
import { useMutation } from '@/hooks/useMutation';
import { useLanguageStore } from '@/stores/language.store';
import { formatRelativeTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';
import { Pagination } from '@/components/tables/Pagination';

const ICONS: Record<NotificationType, typeof BellRing> = {
  ANNOUNCEMENT: Megaphone,
  ATTENDANCE_ALERT: CalendarCheck,
  NEW_ASSIGNMENT: ClipboardList,
  NEW_GRADE: GraduationCap,
  UPCOMING_EXAM: CalendarCheck,
  PAYMENT_REMINDER: BellRing,
  SYSTEM: BellRing,
};

export const NotificationsPage = () => {
  const { t } = useTranslation(['communication', 'common']);
  const language = useLanguageStore((state) => state.language);
  const { run } = useMutation();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const fetcher = useCallback(
    (query: { page: number; limit: number }) =>
      notificationService.list({
        page: query.page,
        limit: query.limit,
        isRead: unreadOnly ? false : undefined,
      }),
    [unreadOnly],
  );

  const list = useListQuery<AppNotification>({ fetcher, syncToUrl: false });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('communication:notifications.title')}
        description={t('communication:notifications.subtitle')}
        actions={
          <Button
            variant="secondary"
            onClick={async () => {
              const ok = await run(
                () => notificationService.markAllRead(),
                t('communication:notifications.toast.allRead'),
              );

              if (ok) {
                list.refresh();
              }
            }}
            leftIcon={<CheckCheck className="size-4" />}
          >
            {t('communication:notifications.markAllRead')}
          </Button>
        }
      />

      <Checkbox
        id="unreadOnly"
        label={t('communication:notifications.unreadOnly')}
        checked={unreadOnly}
        onChange={(event) => setUnreadOnly(event.target.checked)}
      />

      {list.isLoading ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.refresh} />
      ) : list.rows.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<BellRing className="size-6" />}
              title={t('communication:notifications.empty.title')}
              message={t('communication:notifications.empty.message')}
            />
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-[var(--border)]">
              {list.rows.map((notification) => {
                const Icon = ICONS[notification.type] ?? BellRing;

                const body = (
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg',
                        notification.isRead
                          ? 'bg-[var(--surface-muted)] text-[var(--text-subtle)]'
                          : 'bg-[var(--primary-soft)] text-[var(--primary)]',
                      )}
                    >
                      <Icon className="size-4.5" aria-hidden="true" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'truncate text-sm',
                          notification.isRead
                            ? 'text-[var(--text-muted)]'
                            : 'font-medium text-[var(--text)]',
                        )}
                      >
                        {notification.title}
                      </p>

                      {notification.body ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">
                          {notification.body}
                        </p>
                      ) : null}

                      <p className="mt-1 text-xs text-[var(--text-subtle)]">
                        {t(`communication:notifications.type.${notification.type}`)} ·{' '}
                        {formatRelativeTime(notification.createdAt, language)}
                      </p>
                    </div>
                  </div>
                );

                return (
                  <li
                    key={notification.recipientId}
                    className={cn(
                      'flex items-start gap-2 px-4 py-3',
                      notification.isRead ? '' : 'bg-[var(--primary-soft)]/30',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      {notification.actionUrl ? (
                        <Link
                          to={notification.actionUrl}
                          onClick={() => {
                            if (!notification.isRead) {
                              void notificationService
                                .markRead(notification.recipientId)
                                .then(() => list.refresh());
                            }
                          }}
                        >
                          {body}
                        </Link>
                      ) : (
                        body
                      )}
                    </div>

                    <div className="flex shrink-0 gap-1">
                      {!notification.isRead ? (
                        <button
                          type="button"
                          aria-label={t('communication:notifications.markRead')}
                          onClick={async () => {
                            await notificationService.markRead(notification.recipientId);
                            list.refresh();
                          }}
                          className="rounded-md p-1.5 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                        >
                          <CheckCheck className="size-4" />
                        </button>
                      ) : null}

                      <button
                        type="button"
                        aria-label={t('communication:notifications.archive')}
                        onClick={async () => {
                          await notificationService.archive(notification.recipientId);
                          list.refresh();
                        }}
                        className="rounded-md p-1.5 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                      >
                        <Archive className="size-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <Pagination
              pagination={list.pagination}
              onPageChange={list.setPage}
              onLimitChange={list.setLimit}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
};
