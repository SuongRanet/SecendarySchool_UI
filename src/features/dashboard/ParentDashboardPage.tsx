import { useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, CalendarCheck, ClipboardList, Megaphone } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { dashboardService } from '@/services/admin.service';
import { useApiResource } from '@/hooks/useApiResource';
import { useAuthStore } from '@/stores/auth.store';
import { useLanguageStore } from '@/stores/language.store';
import { useSelectedChildStore } from '@/stores/child.store';
import { formatDate, formatNumber, formatPercent } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';
import { cn } from '@/utils/cn';

const greetingKey = (): 'morning' | 'afternoon' | 'evening' => {
  const hour = new Date().getHours();
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
};

export const ParentDashboardPage = () => {
  const { t } = useTranslation(['dashboard', 'common', 'students', 'communication']);
  const language = useLanguageStore((state) => state.language);
  const user = useAuthStore((state) => state.user);
  const selectedChildId = useSelectedChildStore((state) => state.studentId);
  const setSelectedChild = useSelectedChildStore((state) => state.setStudentId);

  const fetcher = useCallback(() => dashboardService.parent(), []);
  const { data, isLoading, error, refresh } = useApiResource(fetcher);

  // Default to the first child so the portal always has a subject.
  useEffect(() => {
    if (!data || data.children.length === 0) {
      return;
    }

    const stillLinked = data.children.some((child) => child.studentId === selectedChildId);

    if (!stillLinked) {
      setSelectedChild(data.children[0].studentId);
    }
  }, [data, selectedChildId, setSelectedChild]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? undefined} onRetry={refresh} />;
  }

  if (data.children.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('dashboard:parent.title')} />
        <EmptyState title={t('dashboard:parent.noChildren')} />
      </div>
    );
  }

  const selected =
    data.children.find((child) => child.studentId === selectedChildId) ?? data.children[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t(`dashboard:greeting.${greetingKey()}`, {
          name: user?.fullName ?? user?.username ?? '',
        })}
        description={`${t('dashboard:subtitle')} · ${data.academicYear.name}`}
      />

      {/* Child switcher — a guardian never has to sign out to change child. */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {data.children.map((child) => {
          const isSelected = child.studentId === selected.studentId;

          return (
            <button
              key={child.studentId}
              type="button"
              onClick={() => setSelectedChild(child.studentId)}
              aria-pressed={isSelected}
              className={cn(
                'flex min-w-56 shrink-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                isSelected
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]',
              )}
            >
              <Avatar name={child.fullName} src={child.profilePhoto} size="md" />

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--text)]">{child.fullName}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {child.currentClassName ?? t('students:notEnrolled')}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('dashboard:parent.attendanceSummary')}
          value={
            selected.summary.attendancePercent === null
              ? '—'
              : formatPercent(selected.summary.attendancePercent, language)
          }
          icon={<CalendarCheck className="size-5" />}
          tone={
            (selected.summary.attendancePercent ?? 100) >= 90
              ? 'success'
              : (selected.summary.attendancePercent ?? 0) >= 75
                ? 'warning'
                : 'danger'
          }
          to={ROUTES.parent.attendance}
        />
        <StatCard
          label={t('dashboard:parent.latestGrades')}
          value={
            selected.summary.averageScore === null
              ? '—'
              : formatPercent(selected.summary.averageScore, language)
          }
          icon={<BarChart3 className="size-5" />}
          tone="primary"
          to={ROUTES.parent.grades}
        />
        <StatCard
          label={t('dashboard:parent.homework')}
          value={formatNumber(selected.summary.pendingAssignments, language)}
          icon={<ClipboardList className="size-5" />}
          tone={selected.summary.pendingAssignments > 0 ? 'warning' : 'success'}
          to={ROUTES.parent.homework}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('students:fields.currentClass')} />
          <CardBody>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[var(--text-muted)]">{t('students:fields.studentCode')}</dt>
                <dd className="mt-0.5 font-medium text-[var(--text)]">{selected.studentCode}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">{t('students:fields.currentClass')}</dt>
                <dd className="mt-0.5 font-medium text-[var(--text)]">
                  {selected.currentClassName ?? t('students:notEnrolled')}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">{t('students:fields.gradeLevel')}</dt>
                <dd className="mt-0.5 font-medium text-[var(--text)]">
                  {selected.currentGradeLevelName ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">{t('students:guardians.relationship')}</dt>
                <dd className="mt-0.5">
                  <Badge tone="neutral" size="sm">
                    {t(`students:relationship.${selected.relationship}`)}
                  </Badge>
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t('dashboard:parent.announcements')}
            action={
              <Link
                to={ROUTES.parent.announcements}
                className="text-sm text-[var(--primary)] hover:underline"
              >
                {t('common:actions.viewAll')}
              </Link>
            }
          />
          <CardBody className="p-0">
            {data.announcements.length === 0 ? (
              <EmptyState
                icon={<Megaphone className="size-6" />}
                title={t('communication:announcements.feedEmpty')}
              />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {data.announcements.map((announcement) => (
                  <li key={announcement.id} className="px-5 py-3">
                    <p className="truncate text-sm font-medium text-[var(--text)]">
                      {announcement.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-subtle)]">
                      {formatDate(announcement.publishedAt, language)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
