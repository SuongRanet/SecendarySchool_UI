import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, CalendarDays, ClipboardCheck, NotebookPen, Users } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { dashboardService } from '@/services/admin.service';
import { useApiResource } from '@/hooks/useApiResource';
import { useAuthStore } from '@/stores/auth.store';
import { useLanguageStore } from '@/stores/language.store';
import { formatDate, formatNumber, formatTimeRange } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';

const greetingKey = (): 'morning' | 'afternoon' | 'evening' => {
  const hour = new Date().getHours();
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
};

export const TeacherDashboardPage = () => {
  const { t } = useTranslation(['dashboard', 'common', 'attendance', 'performance', 'academics']);
  const language = useLanguageStore((state) => state.language);
  const user = useAuthStore((state) => state.user);

  const fetcher = useCallback(() => dashboardService.teacher(), []);
  const { data, isLoading, error, refresh } = useApiResource(fetcher);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? undefined} onRetry={refresh} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t(`dashboard:greeting.${greetingKey()}`, {
          name: user?.fullName ?? user?.username ?? '',
        })}
        description={`${t('dashboard:teacher.title')} · ${data.academicYear.name}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t('dashboard:teacher.myClasses')}
          value={formatNumber(data.counts.classCount, language)}
          icon={<Users className="size-5" />}
          tone="primary"
          to={ROUTES.teacher.classes}
        />
        <StatCard
          label={t('dashboard:admin.totalStudents')}
          value={formatNumber(data.counts.studentCount, language)}
          icon={<BookOpen className="size-5" />}
          tone="accent"
        />
        <StatCard
          label={t('dashboard:teacher.pendingAttendance')}
          value={formatNumber(data.pendingAttendance.length, language)}
          icon={<ClipboardCheck className="size-5" />}
          tone={data.pendingAttendance.length > 0 ? 'warning' : 'success'}
          to={ROUTES.teacher.attendance}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t('dashboard:teacher.todaySchedule')}
            action={
              <Link
                to={ROUTES.teacher.schedule}
                className="text-sm text-[var(--primary)] hover:underline"
              >
                {t('common:actions.viewAll')}
              </Link>
            }
          />
          <CardBody className="p-0">
            {data.todaySchedule.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="size-6" />}
                title={t('dashboard:teacher.noClassesToday')}
              />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {data.todaySchedule.map((period) => (
                  <li key={period.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-24 shrink-0 text-xs font-medium tabular-nums text-[var(--text-muted)]">
                      {formatTimeRange(period.startTime, period.endTime)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text)]">
                        {period.subjectName}
                      </p>
                      <p className="truncate text-xs text-[var(--text-subtle)]">
                        {period.className}
                        {period.roomName ? ` · ${period.roomName}` : ''}
                      </p>
                    </div>

                    <Link to={`${ROUTES.teacher.attendance}?classId=${period.classId}`}>
                      <Button variant="ghost" size="sm">
                        {t('dashboard:teacher.takeAttendance')}
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('attendance:pending.title')} />
          <CardBody className="p-0">
            {data.pendingAttendance.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck className="size-6" />}
                title={t('attendance:pending.allDone')}
              />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {data.pendingAttendance.map((item) => (
                  <li key={item.classId} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text)]">
                        {item.className}
                      </p>
                      <p className="text-xs text-[var(--text-subtle)]">
                        {formatNumber(item.studentCount, language)}{' '}
                        {t('dashboard:admin.totalStudents').toLowerCase()}
                      </p>
                    </div>

                    <Link to={`${ROUTES.teacher.attendance}?classId=${item.classId}`}>
                      <Button size="sm">{t('attendance:pending.take')}</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t('dashboard:teacher.pendingGradeEntry')}
            action={
              <Link
                to={ROUTES.teacher.assessments}
                className="text-sm text-[var(--primary)] hover:underline"
              >
                {t('common:actions.viewAll')}
              </Link>
            }
          />
          <CardBody className="p-0">
            {data.pendingGrading.length === 0 ? (
              <EmptyState
                icon={<NotebookPen className="size-6" />}
                title={t('dashboard:empty.noData')}
              />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {data.pendingGrading.map((assessment) => (
                  <li
                    key={assessment.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text)]">
                        {assessment.title}
                      </p>
                      <p className="truncate text-xs text-[var(--text-subtle)]">
                        {assessment.className} · {assessment.subjectName}
                      </p>
                    </div>

                    <Badge tone="warning" size="sm">
                      {assessment.gradedCount}/{assessment.studentCount}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('dashboard:admin.upcomingExams')} />
          <CardBody className="p-0">
            {data.upcomingExams.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="size-6" />}
                title={t('performance:exams.noUpcoming')}
              />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {data.upcomingExams.map((exam) => (
                  <li key={exam.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text)]">{exam.title}</p>
                      <p className="truncate text-xs text-[var(--text-subtle)]">
                        {exam.className} · {exam.subjectName}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[var(--text-muted)]">
                      {formatDate(exam.examDate, language)}
                    </span>
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
