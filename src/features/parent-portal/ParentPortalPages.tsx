import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, ClipboardList, GraduationCap, Heart, ScrollText } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { attendanceService, scheduleService } from '@/services/operations.service';
import { gradeService, reportCardService } from '@/services/performance.service';
import { assignmentService, behaviorService } from '@/services/engagement.service';
import { studentService } from '@/services/people.service';
import type {
  Assignment,
  AttendanceRecord,
  Behavior,
  Grade,
  ParentChild,
  ReportCardSummary,
  Schedule,
  StudentAttendanceSummary,
  StudentEnrollmentHistory,
} from '@/types/entities';
import { useAcademicOptions } from '@/hooks/useAcademicOptions';
import { useApiResource } from '@/hooks/useApiResource';
import { useLanguageStore } from '@/stores/language.store';
import { calculateAge, formatDate, formatPercent, formatScore } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { EmptyState, LoadingState } from '@/components/feedback/States';
import { WeeklyTimetable } from '@/components/schedule/WeeklyTimetable';
import { ChildScope } from './ChildSelector';

// ---------------------------------------------------------------------------
// My children
// ---------------------------------------------------------------------------

export const ParentChildrenPage = () => {
  const { t } = useTranslation(['dashboard', 'students', 'common']);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('dashboard:parent.title')} />

      <ChildScope>
        {(child) => <ChildProfileCard child={child} />}
      </ChildScope>
    </div>
  );
};

const ChildProfileCard = ({ child }: { child: ParentChild }) => {
  const { t } = useTranslation(['students', 'common']);

  const historyFetcher = useCallback(
    () => studentService.enrollmentHistory(child.studentId),
    [child.studentId],
  );
  const history = useApiResource<StudentEnrollmentHistory[]>(historyFetcher, [child.studentId]);

  const columns: Column<StudentEnrollmentHistory>[] = [
    {
      key: 'year',
      header: t('students:fields.academicYear'),
      render: (entry) => entry.academicYearName,
    },
    {
      key: 'class',
      header: t('students:fields.currentClass'),
      render: (entry) => entry.className,
    },
    {
      key: 'grade',
      header: t('students:fields.gradeLevel'),
      hideOnMobile: true,
      render: (entry) => entry.gradeLevelName,
    },
    {
      key: 'status',
      header: t('common:labels.status'),
      render: (entry) => <StatusBadge kind="enrollment" status={entry.status} />,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardBody className="flex flex-wrap items-center gap-4">
          <Avatar name={child.fullName} src={child.profilePhoto} size="xl" />

          <dl className="grid flex-1 grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            {[
              [t('students:fields.studentCode'), child.studentCode],
              [t('students:fields.currentClass'), child.currentClassName ?? t('students:notEnrolled')],
              [t('students:fields.gradeLevel'), child.currentGradeLevelName ?? '—'],
              [t('students:fields.age'), calculateAge(child.dateOfBirth) ?? '—'],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-[var(--text-muted)]">{label}</dt>
                <dd className="mt-0.5 font-medium text-[var(--text)]">{value}</dd>
              </div>
            ))}
          </dl>

          <StatusBadge kind="student" status={child.status} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t('students:enrollments.title')}
          description={t('students:enrollments.hint')}
        />
        <CardBody className="p-0">
          <DataTable<StudentEnrollmentHistory>
            columns={columns}
            rows={history.data ?? []}
            rowKey={(entry) => entry.id}
            isLoading={history.isLoading}
            error={history.error}
            onRetry={history.refresh}
            className="rounded-none border-0"
            emptyTitle={t('students:enrollments.empty')}
          />
        </CardBody>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

export const ParentSchedulePage = () => {
  const { t } = useTranslation(['operations', 'dashboard']);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('operations:schedules.views.student')} />

      <ChildScope>{(child) => <ChildSchedule studentId={child.studentId} />}</ChildScope>
    </div>
  );
};

const ChildSchedule = ({ studentId }: { studentId: number }) => {
  const fetcher = useCallback(
    () => scheduleService.list({ studentId, isActive: true }),
    [studentId],
  );
  const schedule = useApiResource<Schedule[]>(fetcher, [studentId]);

  if (schedule.isLoading) {
    return <LoadingState />;
  }

  return <WeeklyTimetable periods={schedule.data ?? []} showTeacher />;
};

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export const ParentAttendancePage = () => {
  const { t } = useTranslation(['attendance']);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('attendance:title')} description={t('attendance:summary.title')} />

      <ChildScope>{(child) => <ChildAttendance studentId={child.studentId} />}</ChildScope>
    </div>
  );
};

const ChildAttendance = ({ studentId }: { studentId: number }) => {
  const { t } = useTranslation(['attendance', 'dashboard', 'common']);
  const language = useLanguageStore((state) => state.language);

  const summaryFetcher = useCallback(
    () => attendanceService.studentSummary(studentId),
    [studentId],
  );
  const summary = useApiResource<StudentAttendanceSummary>(summaryFetcher, [studentId]);

  const listFetcher = useCallback(
    () => attendanceService.list({ studentId, limit: 50 }).then((result) => result.items),
    [studentId],
  );
  const records = useApiResource<AttendanceRecord[]>(listFetcher, [studentId]);

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
    {
      key: 'note',
      header: t('attendance:fields.note'),
      hideOnMobile: true,
      render: (record) => record.note ?? '—',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
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
// Grades
// ---------------------------------------------------------------------------

export const ParentGradesPage = () => {
  const { t } = useTranslation(['performance']);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('performance:grades.title')}
        description={t('performance:grades.subtitle')}
      />

      <ChildScope>{(child) => <ChildGrades studentId={child.studentId} />}</ChildScope>
    </div>
  );
};

const ChildGrades = ({ studentId }: { studentId: number }) => {
  const { t } = useTranslation(['performance', 'common']);
  const language = useLanguageStore((state) => state.language);

  const fetcher = useCallback(() => gradeService.forStudent(studentId), [studentId]);
  const grades = useApiResource<Grade[]>(fetcher, [studentId]);

  const columns: Column<Grade>[] = [
    {
      key: 'subject',
      header: t('performance:grades.fields.subject'),
      render: (grade) => <span className="font-medium">{grade.subjectName}</span>,
    },
    {
      key: 'term',
      header: t('performance:assessments.fields.term'),
      hideOnMobile: true,
      render: (grade) => grade.termName ?? grade.academicYearName,
    },
    {
      key: 'score',
      header: t('performance:grades.fields.score'),
      align: 'center',
      render: (grade) => formatScore(grade.score, grade.maxScore),
    },
    {
      key: 'letter',
      header: t('performance:grades.fields.letterGrade'),
      align: 'center',
      render: (grade) =>
        grade.letterGrade ? (
          <Badge tone="primary" size="sm">
            {grade.letterGrade}
          </Badge>
        ) : (
          '—'
        ),
    },
    {
      key: 'performance',
      header: t('performance:grades.fields.performance'),
      hideOnMobile: true,
      render: (grade) => <StatusBadge kind="performance" status={grade.performance} />,
    },
    {
      key: 'comment',
      header: t('performance:grades.fields.comment'),
      hideOnMobile: true,
      render: (grade) => grade.teacherComment ?? '—',
    },
  ];

  const average =
    (grades.data ?? []).filter((grade) => grade.percentage !== null).length > 0
      ? (grades.data ?? [])
          .filter((grade) => grade.percentage !== null)
          .reduce((sum, grade) => sum + Number(grade.percentage), 0) /
        (grades.data ?? []).filter((grade) => grade.percentage !== null).length
      : null;

  return (
    <div className="flex flex-col gap-4">
      <StatCard
        label={t('performance:reportCards.fields.average')}
        value={average === null ? '—' : formatPercent(average, language)}
        icon={<GraduationCap className="size-5" />}
        tone="primary"
        isLoading={grades.isLoading}
        className="sm:max-w-xs"
      />

      <DataTable<Grade>
        columns={columns}
        rows={grades.data ?? []}
        rowKey={(grade) => grade.id}
        isLoading={grades.isLoading}
        error={grades.error}
        onRetry={grades.refresh}
        emptyTitle={t('performance:grades.empty.title')}
        emptyMessage={t('performance:grades.empty.message')}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Homework
// ---------------------------------------------------------------------------

export const ParentHomeworkPage = () => {
  const { t } = useTranslation(['communication']);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('communication:assignments.title')}
        description={t('communication:assignments.subtitle')}
      />

      <ChildScope>{(child) => <ChildHomework studentId={child.studentId} />}</ChildScope>
    </div>
  );
};

const ChildHomework = ({ studentId }: { studentId: number }) => {
  const { t } = useTranslation(['communication', 'common']);
  const language = useLanguageStore((state) => state.language);

  const fetcher = useCallback(
    () => assignmentService.list({ studentId, limit: 50 }).then((result) => result.items),
    [studentId],
  );
  const assignments = useApiResource<Assignment[]>(fetcher, [studentId]);

  if (assignments.isLoading) {
    return <LoadingState />;
  }

  if (!assignments.data || assignments.data.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="size-6" />}
        title={t('communication:assignments.studentEmpty')}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {assignments.data.map((assignment) => (
        <Card key={assignment.id}>
          <CardBody className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-[var(--text)]">{assignment.title}</p>
              <p className="mt-0.5 text-xs text-[var(--text-subtle)]">
                {assignment.subjectName} · {assignment.className}
              </p>
              {assignment.description ? (
                <p className="mt-1.5 text-sm text-[var(--text-muted)]">{assignment.description}</p>
              ) : null}
              {assignment.mySubmission?.feedback ? (
                <p className="mt-2 rounded bg-[var(--surface-muted)] p-2 text-xs text-[var(--text-muted)]">
                  {assignment.mySubmission.feedback}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span
                className={
                  assignment.isOverdue
                    ? 'text-xs font-medium text-[var(--danger)]'
                    : 'text-xs text-[var(--text-muted)]'
                }
              >
                {formatDate(assignment.dueDate, language)}
              </span>

              {assignment.mySubmission ? (
                <StatusBadge kind="submission" status={assignment.mySubmission.status} size="sm" />
              ) : null}

              {assignment.mySubmission?.score !== null &&
              assignment.mySubmission?.score !== undefined ? (
                <Badge tone="primary" size="sm">
                  {formatScore(assignment.mySubmission.score, assignment.maxScore)}
                </Badge>
              ) : null}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Behavior
// ---------------------------------------------------------------------------

export const ParentBehaviorPage = () => {
  const { t } = useTranslation(['communication']);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('communication:behaviors.title')}
        description={t('communication:behaviors.subtitle')}
      />

      <ChildScope>{(child) => <ChildBehavior studentId={child.studentId} />}</ChildScope>
    </div>
  );
};

const ChildBehavior = ({ studentId }: { studentId: number }) => {
  const { t } = useTranslation(['communication', 'common']);
  const language = useLanguageStore((state) => state.language);

  const fetcher = useCallback(
    () =>
      behaviorService
        .list({ studentId, visibleToParentOnly: true, limit: 50 })
        .then((result) => result.items),
    [studentId],
  );
  const behaviors = useApiResource<Behavior[]>(fetcher, [studentId]);

  const columns: Column<Behavior>[] = [
    {
      key: 'date',
      header: t('common:labels.date'),
      render: (behavior) => formatDate(behavior.occurredOn, language),
    },
    {
      key: 'type',
      header: t('communication:behaviors.fields.type'),
      render: (behavior) => (
        <Badge
          tone={
            behavior.type === 'WARNING'
              ? 'warning'
              : behavior.type === 'DISCIPLINARY'
                ? 'danger'
                : 'success'
          }
          size="sm"
        >
          {t(`communication:behaviors.type.${behavior.type}`)}
        </Badge>
      ),
    },
    {
      key: 'title',
      header: t('communication:behaviors.fields.title'),
      render: (behavior) => (
        <div>
          <p className="font-medium text-[var(--text)]">{behavior.title}</p>
          {behavior.description ? (
            <p className="text-xs text-[var(--text-muted)]">{behavior.description}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'teacher',
      header: t('communication:behaviors.fields.recordedBy'),
      hideOnMobile: true,
      render: (behavior) => behavior.teacherName ?? '—',
    },
  ];

  return (
    <DataTable<Behavior>
      columns={columns}
      rows={behaviors.data ?? []}
      rowKey={(behavior) => behavior.id}
      isLoading={behaviors.isLoading}
      error={behaviors.error}
      onRetry={behaviors.refresh}
      emptyTitle={t('communication:behaviors.empty.title')}
    />
  );
};

// ---------------------------------------------------------------------------
// Report cards
// ---------------------------------------------------------------------------

export const ParentReportCardsPage = () => {
  const { t } = useTranslation(['performance']);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('performance:reportCards.title')}
        description={t('performance:reportCards.subtitle')}
      />

      <ChildScope>{(child) => <ChildReportCards studentId={child.studentId} />}</ChildScope>
    </div>
  );
};

const ChildReportCards = ({ studentId }: { studentId: number }) => {
  const { t } = useTranslation(['performance', 'common']);
  const language = useLanguageStore((state) => state.language);
  const options = useAcademicOptions({ years: true, gradeLevels: false });

  const fetcher = useCallback(
    () =>
      reportCardService
        .list({ studentId, status: 'PUBLISHED', limit: 20 })
        .then((result) => result.items),
    [studentId],
  );
  const reportCards = useApiResource<ReportCardSummary[]>(fetcher, [studentId]);

  if (reportCards.isLoading) {
    return <LoadingState />;
  }

  if (!reportCards.data || reportCards.data.length === 0) {
    return (
      <EmptyState
        icon={<ScrollText className="size-6" />}
        title={t('performance:reportCards.notAvailable')}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {reportCards.data.map((card) => (
        <Link key={card.id} to={ROUTES.reportCardDetail(card.id)}>
          <Card className="h-full transition-colors hover:border-[var(--border-strong)]">
            <CardBody className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-[var(--text)]">
                    {card.termName ?? card.academicYearName}
                  </p>
                  <p className="text-xs text-[var(--text-subtle)]">{card.className}</p>
                </div>

                {card.letterGrade ? (
                  <Badge tone="primary">{card.letterGrade}</Badge>
                ) : null}
              </div>

              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-[var(--text-muted)]">
                    {t('performance:reportCards.fields.average')}
                  </dt>
                  <dd className="font-medium text-[var(--text)]">
                    {card.averageScore === null
                      ? '—'
                      : formatPercent(card.averageScore, language)}
                  </dd>
                </div>

                <div>
                  <dt className="text-[var(--text-muted)]">
                    {t('performance:reportCards.fields.attendance')}
                  </dt>
                  <dd className="font-medium text-[var(--text)]">
                    {card.attendance.percent === null
                      ? '—'
                      : formatPercent(card.attendance.percent, language, 0)}
                  </dd>
                </div>
              </dl>

              <p className="text-xs text-[var(--text-subtle)]">
                {card.publishedAt ? formatDate(card.publishedAt, language) : ''}
                {options.activeYear ? '' : ''}
              </p>
            </CardBody>
          </Card>
        </Link>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Behaviour helper icon re-export so the module has a single import surface.
// ---------------------------------------------------------------------------
export const ParentPortalIcons = { Heart };
