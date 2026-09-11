import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  CalendarClock,
  GraduationCap,
  Megaphone,
  Users,
  UserSquare2,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { dashboardService } from '@/services/admin.service';
import { attendanceService } from '@/services/operations.service';
import { useApiResource } from '@/hooks/useApiResource';
import { useAuthStore } from '@/stores/auth.store';
import { useLanguageStore } from '@/stores/language.store';
import { formatDate, formatNumber, formatPercent } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';
import { Input } from '@/components/ui/Input';
import { CHART_COLORS, DonutChart, SimpleBarChart } from './charts';

const todayIso = (): string => {
  // The browser's own day, not UTC: a school in Cambodia is a day ahead of UTC
  // for most of its morning, and `toISOString` would offer yesterday as "today".
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);

  return local.toISOString().slice(0, 10);
};

const greetingKey = (): 'morning' | 'afternoon' | 'evening' => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'morning';
  }

  return hour < 18 ? 'afternoon' : 'evening';
};

export const AdminDashboardView = () => {
  const { t } = useTranslation(['dashboard', 'common', 'students', 'performance', 'navigation']);
  const language = useLanguageStore((state) => state.language);
  const user = useAuthStore((state) => state.user);

  const fetcher = useCallback(() => dashboardService.admin(), []);
  const { data, isLoading, error, refresh } = useApiResource(fetcher);

  /**
   * The attendance panel is loaded on its own, keyed to the day being viewed.
   *
   * Refetching the whole dashboard for a date change would drop the page back
   * to a spinner every time the arrow keys nudged the date, so only this panel
   * reloads and the rest of the overview stays put.
   */
  const [day, setDay] = useState(todayIso);
  const today = useMemo(todayIso, []);

  const attendanceFetcher = useCallback(() => attendanceService.day(day), [day]);
  const dayAttendance = useApiResource(attendanceFetcher, [day]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? undefined} onRetry={refresh} />;
  }

  // Until the first response for a newly chosen day arrives, the previous day's
  // figures stay on screen rather than blanking the card.
  const attendance = dayAttendance.data ?? data.attendanceToday;
  const isToday = attendance.date === today;
  const nothingRecorded = attendance.totalRecords === 0;

  const attendanceSlices = [
    { name: t('dashboard:stats.present'), value: attendance.present, color: CHART_COLORS.success },
    { name: t('dashboard:stats.late'), value: attendance.late, color: CHART_COLORS.warning },
    { name: t('dashboard:stats.absent'), value: attendance.absent, color: CHART_COLORS.danger },
    { name: t('dashboard:stats.excused'), value: attendance.excused, color: CHART_COLORS.info },
    { name: t('dashboard:stats.leave'), value: attendance.leave, color: CHART_COLORS.accent },
    {
      name: t('dashboard:stats.notRecorded'),
      value: attendance.notRecorded,
      color: CHART_COLORS.slate,
    },
  ];

  const statusSlices = data.studentStatus.map((item) => ({
    name: t(`students:status.${item.status}`, { defaultValue: item.status }),
    value: item.count,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t(`dashboard:greeting.${greetingKey()}`, {
          name: user?.fullName ?? user?.username ?? '',
        })}
        description={`${t('dashboard:subtitle')} · ${data.academicYear.name}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('dashboard:admin.totalStudents')}
          value={formatNumber(data.counts.totalStudents, language)}
          icon={<GraduationCap className="size-5" />}
          tone="primary"
          to={ROUTES.students}
          hint={t('dashboard:admin.enrollmentSummary')}
        />
        <StatCard
          label={t('dashboard:admin.totalTeachers')}
          value={formatNumber(data.counts.totalTeachers, language)}
          icon={<UserSquare2 className="size-5" />}
          tone="accent"
          to={ROUTES.teachers}
        />
        <StatCard
          label={t('dashboard:admin.totalClasses')}
          value={formatNumber(data.counts.totalClasses, language)}
          icon={<Users className="size-5" />}
          tone="info"
          to={ROUTES.classes}
        />
        <StatCard
          // The date lives in the hint rather than the label: a card label wide
          // enough for "Attendance on 02 September 2026" does not exist, and it
          // truncated to an ellipsis on every day but today.
          label={
            isToday
              ? t('dashboard:admin.attendanceToday')
              : t('dashboard:admin.attendanceRate')
          }
          value={formatPercent(attendance.attendanceRate, language)}
          icon={<CalendarClock className="size-5" />}
          tone={attendance.attendanceRate >= 90 ? 'success' : 'warning'}
          to={ROUTES.attendance}
          hint={[
            isToday ? null : formatDate(attendance.date, language),
            `${formatNumber(attendance.present + attendance.late, language)} / ${formatNumber(
              attendance.expected,
              language,
            )}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t('dashboard:admin.enrollmentByGrade')} />
          <CardBody>
            {data.enrollmentByGrade.length === 0 ? (
              <EmptyState
                title={t('dashboard:empty.noData')}
                message={t('dashboard:empty.noDataHint')}
              />
            ) : (
              <SimpleBarChart
                data={data.enrollmentByGrade as unknown as Record<string, unknown>[]}
                xKey="gradeLevelName"
                bars={[
                  {
                    key: 'count',
                    name: t('dashboard:admin.totalStudents'),
                    color: CHART_COLORS.primary,
                  },
                ]}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t('dashboard:admin.attendanceOverview')}
            action={
              <Input
                type="date"
                aria-label={t('dashboard:admin.attendanceDate')}
                value={day}
                max={today}
                onChange={(event) => setDay(event.target.value || today)}
                className="w-[10.5rem]"
              />
            }
          />
          <CardBody>
            {nothingRecorded ? (
              <EmptyState
                title={t('dashboard:admin.noRegister')}
                message={
                  isToday
                    ? t('dashboard:admin.noRegisterTodayHint')
                    : t('dashboard:admin.noRegisterHint')
                }
              />
            ) : (
              <DonutChart
                data={attendanceSlices}
                centerValue={formatPercent(attendance.attendanceRate, language, 0)}
                centerLabel={
                  isToday
                    ? t('dashboard:admin.attendanceToday')
                    : formatDate(attendance.date, language)
                }
              />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title={t('dashboard:admin.studentStatus')} />
          <CardBody>
            <DonutChart data={statusSlices} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={t('dashboard:admin.classDistribution')} />
          <CardBody>
            {data.classDistribution.length === 0 ? (
              <EmptyState
                title={t('dashboard:empty.noData')}
                message={t('dashboard:empty.noDataHint')}
              />
            ) : (
              <SimpleBarChart
                data={data.classDistribution as unknown as Record<string, unknown>[]}
                xKey="className"
                bars={[
                  {
                    key: 'count',
                    name: t('dashboard:admin.totalStudents'),
                    color: CHART_COLORS.accent,
                  },
                ]}
              />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t('dashboard:admin.recentAnnouncements')}
            action={
              <Link
                to={ROUTES.announcements}
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
                title={t('dashboard:empty.noData')}
              />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {data.announcements.map((announcement) => (
                  <li key={announcement.id} className="px-5 py-3">
                    <Link
                      to={ROUTES.announcements}
                      className="flex items-start justify-between gap-3 hover:text-[var(--primary)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--text)]">
                          {announcement.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--text-subtle)]">
                          {formatDate(announcement.publishedAt, language)}
                        </p>
                      </div>
                      {announcement.isPinned ? (
                        <Badge tone="warning" size="sm">
                          ★
                        </Badge>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t('dashboard:admin.upcomingExams')}
            action={
              <Link to={ROUTES.exams} className="text-sm text-[var(--primary)] hover:underline">
                {t('common:actions.viewAll')}
              </Link>
            }
          />
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
                      <p className="mt-0.5 text-xs text-[var(--text-subtle)]">
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
