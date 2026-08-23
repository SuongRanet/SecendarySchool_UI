import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, FileBadge, Send } from 'lucide-react';
import { dashboardService } from '@/services/admin.service';
import { assignmentService } from '@/services/engagement.service';
import { attendanceService } from '@/services/operations.service';
import { gradeService } from '@/services/performance.service';
import { nationalExamService } from '@/services/national-exam.service';
import { scheduleService } from '@/services/operations.service';
import type {
  Assignment,
  AttendanceRecord,
  Grade,
  NationalExamRegistration,
  Schedule,
  StudentAttendanceSummary,
  StudentDashboard,
} from '@/types/entities';
import { useApiResource } from '@/hooks/useApiResource';
import { useMutation } from '@/hooks/useMutation';
import { useAuthStore } from '@/stores/auth.store';
import { useLanguageStore } from '@/stores/language.store';
import { formatDate, formatPercent } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';
import { WeeklyTimetable } from '@/components/schedule/WeeklyTimetable';

/**
 * The student portal, for Grades 7-9.
 *
 * Every page reads the student from the signed-in profile rather than from a
 * route parameter, and the backend resolves the student from the token again,
 * so a student cannot reach another student's record by editing the URL.
 */
const useMyStudentId = (): number | null =>
  useAuthStore((state) => state.user?.studentId ?? null);

/** Shown when a login without a linked student profile reaches the portal. */
const NoStudentProfile = () => {
  const { t } = useTranslation(['studentPortal']);

  return <ErrorState variant="forbidden" message={t('studentPortal:noProfile')} />;
};

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

export const StudentSchedulePage = () => {
  const { t } = useTranslation(['studentPortal', 'operations']);
  const studentId = useMyStudentId();

  const fetcher = useCallback(
    () => (studentId ? scheduleService.list({ studentId, isActive: true }) : Promise.resolve([])),
    [studentId],
  );

  const schedule = useApiResource<Schedule[]>(fetcher, [studentId], {
    enabled: Boolean(studentId),
  });

  if (!studentId) {
    return <NoStudentProfile />;
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('studentPortal:schedule.title')}
        description={t('studentPortal:schedule.subtitle')}
      />

      {schedule.isLoading ? (
        <LoadingState />
      ) : schedule.error ? (
        <ErrorState message={schedule.error} onRetry={schedule.refresh} />
      ) : (
        <WeeklyTimetable periods={schedule.data ?? []} showTeacher showClass={false} />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Homework — the one place a student writes to the system
// ---------------------------------------------------------------------------

export const StudentHomeworkPage = () => {
  const { t } = useTranslation(['studentPortal', 'engagement', 'common']);
  const language = useLanguageStore((state) => state.language);
  const studentId = useMyStudentId();
  const { run, isRunning } = useMutation();

  const [submitting, setSubmitting] = useState<Assignment | null>(null);
  const [answer, setAnswer] = useState('');

  const fetcher = useCallback(
    () =>
      studentId
        ? assignmentService.list({ studentId, limit: 50 }).then((result) => result.items)
        : Promise.resolve([]),
    [studentId],
  );

  const assignments = useApiResource<Assignment[]>(fetcher, [studentId], {
    enabled: Boolean(studentId),
  });

  if (!studentId) {
    return <NoStudentProfile />;
  }

  const closeModal = () => {
    setSubmitting(null);
    setAnswer('');
  };

  const handleSubmit = async () => {
    if (!submitting) {
      return;
    }

    const ok = await run(
      () => assignmentService.submit(submitting.id, { content: answer }),
      t('studentPortal:homework.submitted'),
    );

    if (ok) {
      closeModal();
      assignments.refresh();
    }
  };

  const columns: Column<Assignment>[] = [
    {
      key: 'title',
      header: t('engagement:assignments.fields.title'),
      render: (assignment) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-[var(--text)]">{assignment.title}</p>
          <p className="truncate text-xs text-[var(--text-subtle)]">{assignment.subjectName}</p>
        </div>
      ),
    },
    {
      key: 'due',
      header: t('engagement:assignments.fields.dueDate'),
      render: (assignment) => formatDate(assignment.dueDate, language),
    },
    {
      key: 'status',
      header: t('common:labels.status'),
      render: (assignment) =>
        assignment.mySubmission ? (
          <StatusBadge kind="submission" status={assignment.mySubmission.status} />
        ) : (
          <Badge tone="warning" size="sm">
            {t('studentPortal:homework.notSubmitted')}
          </Badge>
        ),
    },
    {
      key: 'score',
      header: t('engagement:assignments.fields.score'),
      align: 'center',
      hideOnMobile: true,
      render: (assignment) =>
        assignment.mySubmission?.score != null
          ? `${assignment.mySubmission.score} / ${assignment.maxScore ?? 100}`
          : '—',
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (assignment) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setSubmitting(assignment);
            setAnswer('');
          }}
        >
          <Send className="size-4" aria-hidden="true" />
          {t('studentPortal:homework.submit')}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('studentPortal:homework.title')}
        description={t('studentPortal:homework.subtitle')}
      />

      <DataTable<Assignment>
        columns={columns}
        rows={assignments.data ?? []}
        rowKey={(assignment) => assignment.id}
        isLoading={assignments.isLoading}
        error={assignments.error}
        onRetry={assignments.refresh}
        emptyTitle={t('studentPortal:homework.empty')}
      />

      <Modal
        open={Boolean(submitting)}
        onClose={closeModal}
        title={submitting?.title ?? ''}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleSubmit} isLoading={isRunning} disabled={answer.trim() === ''}>
              {t('studentPortal:homework.submit')}
            </Button>
          </>
        }
      >
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--text)]">
            {t('studentPortal:homework.answer')}
          </span>
          <textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            rows={8}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
            placeholder={t('studentPortal:homework.answerPlaceholder')}
          />
        </label>
      </Modal>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Grades
// ---------------------------------------------------------------------------

export const StudentGradesPage = () => {
  const { t } = useTranslation(['studentPortal', 'performance', 'common']);
  const studentId = useMyStudentId();

  const fetcher = useCallback(
    () => (studentId ? gradeService.forStudent(studentId) : Promise.resolve([])),
    [studentId],
  );

  const grades = useApiResource<Grade[]>(fetcher, [studentId], { enabled: Boolean(studentId) });

  if (!studentId) {
    return <NoStudentProfile />;
  }

  const columns: Column<Grade>[] = [
    {
      key: 'subject',
      header: t('performance:grades.fields.subject'),
      render: (grade) => grade.subjectName ?? '—',
    },
    {
      key: 'term',
      header: t('performance:grades.fields.term'),
      hideOnMobile: true,
      render: (grade) => grade.termName ?? '—',
    },
    {
      key: 'percentage',
      header: t('performance:grades.fields.percentage'),
      align: 'center',
      render: (grade) => (grade.percentage != null ? `${grade.percentage}%` : '—'),
    },
    {
      key: 'letter',
      header: t('performance:grades.fields.letter'),
      align: 'center',
      render: (grade) => grade.letterGrade ?? '—',
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('studentPortal:grades.title')}
        description={t('studentPortal:grades.subtitle')}
      />

      <DataTable<Grade>
        columns={columns}
        rows={grades.data ?? []}
        rowKey={(grade) => grade.id}
        isLoading={grades.isLoading}
        error={grades.error}
        onRetry={grades.refresh}
        emptyTitle={t('studentPortal:grades.empty')}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export const StudentAttendancePage = () => {
  const { t } = useTranslation(['studentPortal', 'attendance', 'dashboard', 'common']);
  const language = useLanguageStore((state) => state.language);
  const studentId = useMyStudentId();

  const summaryFetcher = useCallback(
    () =>
      studentId
        ? attendanceService.studentSummary(studentId)
        : Promise.resolve(null as unknown as StudentAttendanceSummary),
    [studentId],
  );

  const summary = useApiResource<StudentAttendanceSummary>(summaryFetcher, [studentId], {
    enabled: Boolean(studentId),
  });

  const listFetcher = useCallback(
    () =>
      studentId
        ? attendanceService.list({ studentId, limit: 50 }).then((result) => result.items)
        : Promise.resolve([]),
    [studentId],
  );

  const records = useApiResource<AttendanceRecord[]>(listFetcher, [studentId], {
    enabled: Boolean(studentId),
  });

  if (!studentId) {
    return <NoStudentProfile />;
  }

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'date',
      header: t('attendance:fields.date'),
      render: (record) => formatDate(record.attendanceDate, language),
    },
    {
      key: 'status',
      header: t('common:labels.status'),
      render: (record) => <StatusBadge kind="attendance" status={record.status} />,
    },
    {
      key: 'reason',
      header: t('attendance:fields.reason'),
      hideOnMobile: true,
      render: (record) => record.reasonName ?? '—',
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('studentPortal:attendance.title')}
        description={t('studentPortal:attendance.subtitle')}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          ['present', summary.data?.present, 'success'],
          ['absent', summary.data?.absent, 'danger'],
          ['late', summary.data?.late, 'warning'],
          ['excused', summary.data?.excused, 'info'],
        ].map(([key, value, tone]) => (
          <StatCard
            key={String(key)}
            label={t(`dashboard:stats.${key}`)}
            value={value ?? 0}
            tone={tone as 'success'}
            isLoading={summary.isLoading}
          />
        ))}

        <StatCard
          label={t('attendance:summary.rate')}
          value={summary.data ? formatPercent(summary.data.attendanceRate, language) : '—'}
          icon={<CalendarCheck className="size-5" />}
          tone="primary"
          isLoading={summary.isLoading}
        />
      </div>

      <DataTable<AttendanceRecord>
        columns={columns}
        rows={records.data ?? []}
        rowKey={(record) => record.id}
        isLoading={records.isLoading}
        error={records.error}
        onRetry={records.refresh}
        emptyTitle={t('attendance:history.empty')}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// National examination — Grade 9 only
// ---------------------------------------------------------------------------

export const StudentNationalExamPage = () => {
  const { t } = useTranslation(['studentPortal', 'nationalExam', 'common']);
  const language = useLanguageStore((state) => state.language);

  const fetcher = useCallback(() => nationalExamService.mine(), []);
  const registrations = useApiResource<NationalExamRegistration[]>(fetcher);

  if (registrations.isLoading) {
    return <LoadingState />;
  }

  if (registrations.error) {
    return <ErrorState message={registrations.error} onRetry={registrations.refresh} />;
  }

  const rows = registrations.data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('nationalExam:title')}
        description={t('studentPortal:nationalExam.subtitle')}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileBadge className="size-6" />}
          title={t('studentPortal:nationalExam.notRegistered')}
          message={t('studentPortal:nationalExam.notRegisteredHint')}
        />
      ) : (
        rows.map((registration) => (
          <Card key={registration.id}>
            <CardHeader
              title={registration.sessionName ?? t('nationalExam:title')}
              description={registration.academicYearName ?? undefined}
              action={
                <StatusBadge kind="nationalExam" status={registration.status} />
              }
            />

            <CardBody className="flex flex-col gap-4">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [t('nationalExam:fields.seatNumber'), registration.seatNumber ?? '—'],
                  [t('nationalExam:fields.centre'), registration.centreName ?? '—'],
                  [
                    t('nationalExam:fields.sitting'),
                    registration.startsOn
                      ? `${formatDate(registration.startsOn, language)} → ${formatDate(
                          registration.endsOn ?? registration.startsOn,
                          language,
                        )}`
                      : '—',
                  ],
                  [t('nationalExam:fields.class'), registration.className ?? '—'],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-xs text-[var(--text-subtle)]">{label}</dt>
                    <dd className="font-medium text-[var(--text)]">{value}</dd>
                  </div>
                ))}
              </dl>

              {registration.result ? (
                <div
                  className={`rounded-lg border p-4 ${
                    registration.result.isPass
                      ? 'border-[var(--success)]/30 bg-[var(--success-soft)]'
                      : 'border-[var(--danger)]/30 bg-[var(--danger-soft)]'
                  }`}
                >
                  <p className="text-xs uppercase tracking-wide text-[var(--text-subtle)]">
                    {t('nationalExam:fields.result')}
                  </p>
                  <p className="mt-1 flex items-baseline gap-3">
                    <span className="text-3xl font-semibold text-[var(--text)]">
                      {registration.result.resultGrade}
                    </span>
                    <span
                      className={
                        registration.result.isPass
                          ? 'font-medium text-[var(--success)]'
                          : 'font-medium text-[var(--danger)]'
                      }
                    >
                      {registration.result.isPass
                        ? t('nationalExam:result.pass')
                        : t('nationalExam:result.fail')}
                    </span>
                    {registration.result.totalScore != null ? (
                      <span className="text-sm text-[var(--text-muted)]">
                        {registration.result.totalScore}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-2 text-xs text-[var(--text-subtle)]">
                    {t('nationalExam:fields.publishedOn')}:{' '}
                    {formatDate(registration.result.publishedOn, language)}
                  </p>
                </div>
              ) : (
                <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-muted)]">
                  {t('studentPortal:nationalExam.awaitingResult')}
                </p>
              )}
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Dashboard — the first thing a student sees each morning
// ---------------------------------------------------------------------------

/** Weekday name as the schedule stores it, for picking out today's periods. */
const WEEKDAY_KEYS = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

export const StudentDashboardPage = () => {
  const { t } = useTranslation(['studentPortal', 'dashboard', 'attendance', 'common']);
  const language = useLanguageStore((state) => state.language);

  const fetcher = useCallback(() => dashboardService.student(), []);
  const dashboard = useApiResource<StudentDashboard>(fetcher);

  if (dashboard.isLoading) {
    return <LoadingState />;
  }

  if (dashboard.error || !dashboard.data) {
    return <ErrorState message={dashboard.error ?? undefined} onRetry={dashboard.refresh} />;
  }

  const data = dashboard.data;
  const today = WEEKDAY_KEYS[new Date().getDay()];
  const todaysPeriods = (data.schedule ?? []).filter((period) => period.dayOfWeek === today);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('studentPortal:dashboard.title')}
        description={data.academicYear?.name}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={t('attendance:summary.rate')}
          value={
            data.attendance ? formatPercent(data.attendance.attendanceRate, language) : '—'
          }
          icon={<CalendarCheck className="size-5" />}
          tone="primary"
        />
        <StatCard label={t('dashboard:stats.present')} value={data.attendance?.present ?? 0} tone="success" />
        <StatCard label={t('dashboard:stats.absent')} value={data.attendance?.absent ?? 0} tone="danger" />
        <StatCard label={t('dashboard:stats.late')} value={data.attendance?.late ?? 0} tone="warning" />
      </div>

      <Card>
        <CardHeader title={t('studentPortal:dashboard.today')} />
        <CardBody>
          {todaysPeriods.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">
              {t('studentPortal:dashboard.noClassToday')}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--border)]">
              {todaysPeriods.map((period) => (
                <li key={period.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--text)]">{period.subjectName}</p>
                    <p className="truncate text-xs text-[var(--text-subtle)]">
                      {period.teacherName ?? '—'}
                      {period.roomName ? ` · ${period.roomName}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-[var(--text-muted)]">
                    {period.startTime?.slice(0, 5)} – {period.endTime?.slice(0, 5)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('studentPortal:dashboard.latestGrades')} />
        <CardBody>
          {(data.grades ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">
              {t('studentPortal:dashboard.noGrades')}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--border)]">
              {data.grades.slice(0, 8).map((grade) => (
                <li key={grade.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate text-[var(--text)]">{grade.subjectName ?? '—'}</span>
                  <span className="shrink-0 font-medium tabular-nums text-[var(--text)]">
                    {grade.percentage != null ? `${grade.percentage}%` : '—'}
                    {grade.letterGrade ? (
                      <Badge tone="neutral" size="sm" className="ml-2">
                        {grade.letterGrade}
                      </Badge>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
