import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { classService } from '@/services/academic.service';
import { scheduleService } from '@/services/operations.service';
import { teacherService } from '@/services/people.service';
import type { ClassStudent, Schedule, Teacher, TeacherAssignment } from '@/types/entities';
import { useApiResource } from '@/hooks/useApiResource';
import { useLanguageStore } from '@/stores/language.store';
import { calculateAge, formatDate } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { ErrorState, LoadingState } from '@/components/feedback/States';
import { WeeklyTimetable } from '@/components/schedule/WeeklyTimetable';

/** Resolves the signed-in teacher's own profile from the token. */
const useMyTeacherProfile = () => {
  const fetcher = useCallback(() => teacherService.me(), []);
  return useApiResource<Teacher>(fetcher);
};

export const TeacherSchedulePage = () => {
  const { t } = useTranslation(['teachers', 'operations']);
  const profile = useMyTeacherProfile();

  const scheduleFetcher = useCallback(() => teacherService.mySchedule(), []);

  const schedule = useApiResource<Schedule[]>(scheduleFetcher);

  if (profile.isLoading) {
    return <LoadingState />;
  }

  if (profile.error || !profile.data) {
    return <ErrorState message={profile.error ?? undefined} onRetry={profile.refresh} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('teachers:tabs.schedule')}
        description={t('operations:schedules.subtitle')}
      />

      {schedule.isLoading ? (
        <LoadingState />
      ) : schedule.error ? (
        <ErrorState message={schedule.error} onRetry={schedule.refresh} />
      ) : (
        <WeeklyTimetable periods={schedule.data ?? []} showTeacher={false} showClass />
      )}
    </div>
  );
};

export const TeacherClassesPage = () => {
  const { t } = useTranslation(['teachers', 'academics', 'common']);
  const profile = useMyTeacherProfile();

  const assignmentsFetcher = useCallback(() => teacherService.myAssignments(), []);

  const assignments = useApiResource<TeacherAssignment[]>(assignmentsFetcher);

  if (profile.isLoading) {
    return <LoadingState />;
  }

  if (profile.error || !profile.data) {
    return <ErrorState message={profile.error ?? undefined} onRetry={profile.refresh} />;
  }

  // One card per class, listing the subjects taught there.
  const byClass = new Map<number, TeacherAssignment[]>();

  for (const assignment of assignments.data ?? []) {
    byClass.set(assignment.classId, [...(byClass.get(assignment.classId) ?? []), assignment]);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('teachers:assignments.title')}
        description={t('academics:classes.subtitle')}
      />

      {assignments.isLoading ? (
        <LoadingState />
      ) : assignments.error ? (
        <ErrorState message={assignments.error} onRetry={assignments.refresh} />
      ) : byClass.size === 0 ? (
        <Card>
          <CardBody>
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              {t('teachers:assignments.empty')}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...byClass.entries()].map(([classId, items]) => {
            const first = items[0];

            return (
              <Link key={classId} to={ROUTES.teacher.classDetail(classId)}>
                <Card className="h-full transition-colors hover:border-[var(--border-strong)]">
                  <CardBody className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[var(--text)]">{first.className}</p>
                        <p className="text-xs text-[var(--text-subtle)]">
                          {first.gradeLevelName} · {first.academicYearName}
                        </p>
                      </div>

                      {items.some((item) => item.isHomeroom) ? (
                        <Badge tone="primary" size="sm">
                          {t('teachers:assignments.homeroom')}
                        </Badge>
                      ) : null}
                    </div>

                    {/*
                      * A homeroom class the teacher takes no subject in still
                      * belongs here — they run its register and write its
                      * report card comments — but it has no subject to badge.
                      */}
                    <div className="flex flex-wrap gap-1.5">
                      {items.filter((item) => item.subjectName !== null).length > 0 ? (
                        items
                          .filter((item) => item.subjectName !== null)
                          .map((item) => (
                            <Badge key={item.classSubjectId ?? item.classId} tone="neutral" size="sm">
                              {item.subjectName}
                            </Badge>
                          ))
                      ) : (
                        <span className="text-xs text-[var(--text-subtle)]">
                          {t('teachers:assignments.homeroomOnly')}
                        </span>
                      )}
                    </div>

                    <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                      <Users className="size-3.5" aria-hidden="true" />
                      {first.studentCount} {t('academics:classes.students').toLowerCase()}
                    </p>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * The teacher's own view of a class they teach. Deliberately read-only and kept
 * inside the teacher workspace: it never routes into the administrator pages,
 * which offer class management the teacher is not authorised to perform.
 */
export const TeacherClassDetailPage = () => {
  const { t } = useTranslation(['teachers', 'academics', 'students', 'common', 'attendance']);
  const params = useParams();
  const classId = Number(params.id);
  const language = useLanguageStore((state) => state.language);

  const assignmentsFetcher = useCallback(() => teacherService.myAssignments(), []);
  const assignments = useApiResource<TeacherAssignment[]>(assignmentsFetcher);

  const studentsFetcher = useCallback(() => classService.listStudents(classId), [classId]);
  const students = useApiResource<ClassStudent[]>(studentsFetcher, [classId]);

  const scheduleFetcher = useCallback(
    () => scheduleService.list({ classId, isActive: true }),
    [classId],
  );
  const schedule = useApiResource<Schedule[]>(scheduleFetcher, [classId]);

  const mine = (assignments.data ?? []).filter((item) => item.classId === classId);
  const first = mine[0];

  if (assignments.isLoading) {
    return <LoadingState />;
  }

  if (assignments.error) {
    return <ErrorState message={assignments.error} onRetry={assignments.refresh} />;
  }

  // A class the teacher is not assigned to is simply not theirs to open.
  if (!first) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title={t('teachers:assignments.title')} />
        <ErrorState variant="forbidden" message={t('teachers:myClass.noSubjects')} />
      </div>
    );
  }

  const studentColumns: Column<ClassStudent>[] = [
    {
      key: 'roll',
      header: t('students:fields.rollNumber'),
      align: 'center',
      width: '80px',
      render: (student) => student.rollNumber ?? '—',
    },
    {
      key: 'name',
      header: t('common:labels.name'),
      render: (student) => (
        <div className="flex items-center gap-3">
          <Avatar name={student.fullName} src={student.profilePhoto} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium">{student.fullName}</p>
            <p className="truncate text-xs text-[var(--text-subtle)]">{student.studentCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'gender',
      header: t('common:labels.gender'),
      hideOnMobile: true,
      render: (student) => (student.gender ? t(`common:gender.${student.gender}`) : '—'),
    },
    {
      key: 'age',
      header: t('students:fields.age'),
      align: 'center',
      hideOnMobile: true,
      render: (student) => calculateAge(student.dateOfBirth) ?? '—',
    },
    {
      key: 'enrolled',
      header: t('students:fields.enrolledDate'),
      hideOnMobile: true,
      render: (student) => formatDate(student.enrolledDate, language),
    },
    {
      key: 'status',
      header: t('common:labels.status'),
      render: (student) => <StatusBadge kind="student" status={student.studentStatus} />,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={first.className}
        description={`${first.gradeLevelName} · ${first.academicYearName}`}
        breadcrumbs={[
          { label: t('teachers:myClass.backToClasses'), to: ROUTES.teacher.classes },
          { label: first.className },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to={`${ROUTES.teacher.attendance}?classId=${classId}`}>
              <Button variant="primary">{t('teachers:myClass.takeAttendance')}</Button>
            </Link>
            <Link to={`${ROUTES.teacher.grades}?classId=${classId}`}>
              <Button variant="secondary">{t('teachers:myClass.enterGrades')}</Button>
            </Link>
            <Link to={`${ROUTES.teacher.assignments}?classId=${classId}`}>
              <Button variant="secondary">{t('teachers:myClass.assignments')}</Button>
            </Link>
          </div>
        }
      />

      {first.isHomeroom ? (
        <div className="rounded-lg border border-[var(--primary)]/30 bg-[var(--primary-soft)] p-3 text-sm text-[var(--primary)]">
          {t('teachers:myClass.homeroomNotice')}
        </div>
      ) : null}

      <Card>
        <CardHeader title={t('teachers:myClass.mySubjects')} />
        <CardBody>
          <div className="flex flex-wrap gap-1.5">
            {mine.map((item) => (
              <Badge key={item.classSubjectId} tone="neutral" size="sm">
                {item.subjectName}
              </Badge>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('teachers:myClass.students')} />
        <CardBody>
          <DataTable<ClassStudent>
            columns={studentColumns}
            rows={students.data ?? []}
            rowKey={(student) => student.enrollmentId}
            isLoading={students.isLoading}
            error={students.error ?? undefined}
            onRetry={students.refresh}
            emptyTitle={t('teachers:myClass.noStudents')}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('teachers:myClass.schedule')} />
        <CardBody>
          {schedule.isLoading ? (
            <LoadingState />
          ) : schedule.error ? (
            <ErrorState message={schedule.error} onRetry={schedule.refresh} />
          ) : (
            <WeeklyTimetable periods={schedule.data ?? []} showTeacher showClass={false} />
          )}
        </CardBody>
      </Card>
    </div>
  );
};
