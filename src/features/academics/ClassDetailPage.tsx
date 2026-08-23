import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, CalendarDays, Plus, Trash2, Users } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { classService } from '@/services/academic.service';
import { scheduleService } from '@/services/operations.service';
import type { ClassStudent, ClassSubject, SchoolClass, Schedule } from '@/types/entities';
import { useAcademicOptions } from '@/hooks/useAcademicOptions';
import { useApiResource } from '@/hooks/useApiResource';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { useLanguageStore } from '@/stores/language.store';
import { calculateAge, formatDate, formatTimeRange } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { RowActions } from '@/components/tables/RowActions';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';
import { WEEKDAYS } from '@/types/domain';

type TabKey = 'students' | 'subjects' | 'schedule';

export const ClassDetailPage = () => {
  const { t } = useTranslation(['academics', 'common', 'students', 'operations']);
  const params = useParams();
  const classId = Number(params.id);
  const language = useLanguageStore((state) => state.language);
  const { has } = usePermission();
  const canManage = has(PERMISSIONS.CLASSES_MANAGE);
  const { run } = useMutation();

  const options = useAcademicOptions({ years: false, gradeLevels: false, subjects: true, teachers: true });

  const [tab, setTab] = useState<TabKey>('students');
  const [isSubjectModalOpen, setSubjectModalOpen] = useState(false);
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<ClassSubject | null>(null);

  const classFetcher = useCallback(() => classService.getById(classId), [classId]);
  const classResource = useApiResource<SchoolClass>(classFetcher, [classId]);

  const studentsFetcher = useCallback(() => classService.listStudents(classId), [classId]);
  const studentsResource = useApiResource<ClassStudent[]>(studentsFetcher, [classId]);

  const subjectsFetcher = useCallback(() => classService.listSubjects(classId), [classId]);
  const subjectsResource = useApiResource<ClassSubject[]>(subjectsFetcher, [classId]);

  const scheduleFetcher = useCallback(
    () => scheduleService.list({ classId, isActive: true }),
    [classId],
  );
  const scheduleResource = useApiResource<Schedule[]>(scheduleFetcher, [classId]);

  if (classResource.isLoading) {
    return <LoadingState />;
  }

  if (classResource.error || !classResource.data) {
    return (
      <ErrorState
        variant={classResource.errorStatus === 403 ? 'forbidden' : 'error'}
        message={classResource.error ?? undefined}
        onRetry={classResource.refresh}
      />
    );
  }

  const schoolClass = classResource.data;
  const isClosed = schoolClass.academicYearStatus === 'CLOSED';

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
        <Link
          to={ROUTES.studentDetail(student.studentId)}
          className="flex items-center gap-3 hover:text-[var(--primary)]"
        >
          <Avatar name={student.fullName} src={student.profilePhoto} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium">{student.fullName}</p>
            <p className="truncate text-xs text-[var(--text-subtle)]">{student.studentCode}</p>
          </div>
        </Link>
      ),
    },
    {
      key: 'gender',
      header: t('common:labels.gender'),
      hideOnMobile: true,
      render: (student) =>
        student.gender ? t(`common:gender.${student.gender}`) : '—',
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

  const subjectColumns: Column<ClassSubject>[] = [
    {
      key: 'subject',
      header: t('academics:subjects.title'),
      render: (classSubject) => (
        <div>
          <p className="font-medium text-[var(--text)]">{classSubject.subjectNameEn}</p>
          {classSubject.subjectNameKh ? (
            <p className="font-khmer text-xs text-[var(--text-muted)]">
              {classSubject.subjectNameKh}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'teacher',
      header: t('academics:subjects.teacher'),
      render: (classSubject) =>
        classSubject.teacherName ?? (
          <span className="text-[var(--text-subtle)]">{t('academics:subjects.noTeacher')}</span>
        ),
    },
    {
      key: 'assessments',
      header: t('academics:classes.subjects'),
      align: 'center',
      hideOnMobile: true,
      render: (classSubject) => classSubject.assessmentCount,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (classSubject) => (
        <RowActions
          label={classSubject.subjectNameEn}
          items={
            canManage && !isClosed
              ? [
                  {
                    key: 'remove',
                    label: t('common:actions.delete'),
                    icon: <Trash2 className="size-4" />,
                    tone: 'danger',
                    disabled: classSubject.assessmentCount > 0,
                    onSelect: () => setConfirmRemove(classSubject),
                  },
                ]
              : []
          }
        />
      ),
    },
  ];

  const scheduleByDay = WEEKDAYS.map((day) => ({
    day,
    periods: (scheduleResource.data ?? []).filter((period) => period.dayOfWeek === day),
  })).filter((entry) => entry.periods.length > 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={schoolClass.name}
        description={`${schoolClass.gradeLevelName} · ${schoolClass.academicYearName}`}
        breadcrumbs={[
          { label: t('academics:classes.title'), to: ROUTES.classes },
          { label: schoolClass.name },
        ]}
        actions={
          <Link to={`${ROUTES.attendance}?classId=${schoolClass.id}`}>
            <Button variant="secondary">{t('attendance:takeAttendance', { ns: 'attendance' })}</Button>
          </Link>
        }
      />

      {isClosed ? (
        <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-3 text-sm text-[var(--warning)]">
          {t('academics:academicYears.closedNotice')}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('academics:classes.enrolled')}
          value={`${schoolClass.enrolledCount} / ${schoolClass.capacity}`}
          icon={<Users className="size-5" />}
          tone={schoolClass.availableSeats === 0 ? 'warning' : 'primary'}
          hint={t('academics:classes.seatsLeft', { count: schoolClass.availableSeats })}
        />
        <StatCard
          label={t('academics:subjects.title')}
          value={schoolClass.subjectCount}
          icon={<BookOpen className="size-5" />}
          tone="accent"
        />
        <StatCard
          label={t('academics:classes.homeroomTeacher')}
          value={schoolClass.homeroomTeacherName ?? '—'}
          icon={<Users className="size-5" />}
          tone="info"
        />
        <StatCard
          label={t('academics:classes.room')}
          value={schoolClass.roomName ?? '—'}
          icon={<CalendarDays className="size-5" />}
          tone="neutral"
        />
      </div>

      <Tabs
        value={tab}
        onChange={(key) => setTab(key as TabKey)}
        ariaLabel={schoolClass.name}
        items={[
          { key: 'students', label: t('academics:classes.students') },
          { key: 'subjects', label: t('academics:classes.subjects') },
          { key: 'schedule', label: t('academics:classes.schedule') },
        ]}
      />

      {tab === 'students' ? (
        <DataTable<ClassStudent>
          columns={studentColumns}
          rows={studentsResource.data ?? []}
          rowKey={(student) => student.enrollmentId}
          isLoading={studentsResource.isLoading}
          error={studentsResource.error}
          onRetry={studentsResource.refresh}
          emptyTitle={t('academics:classes.empty.title')}
          emptyMessage={t('academics:classes.empty.message')}
        />
      ) : null}

      {tab === 'subjects' ? (
        <div className="flex flex-col gap-3">
          {canManage && !isClosed ? (
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setSubjectId('');
                  setTeacherId('');
                  setSubjectModalOpen(true);
                }}
                leftIcon={<Plus className="size-4" />}
              >
                {t('academics:subjects.create')}
              </Button>
            </div>
          ) : null}

          <DataTable<ClassSubject>
            columns={subjectColumns}
            rows={subjectsResource.data ?? []}
            rowKey={(classSubject) => classSubject.id}
            isLoading={subjectsResource.isLoading}
            error={subjectsResource.error}
            onRetry={subjectsResource.refresh}
            emptyTitle={t('academics:subjects.empty.title')}
            emptyMessage={t('academics:subjects.empty.message')}
          />
        </div>
      ) : null}

      {tab === 'schedule' ? (
        <Card>
          <CardHeader title={t('academics:classes.schedule')} />
          <CardBody className="p-0">
            {scheduleResource.isLoading ? (
              <LoadingState compact />
            ) : scheduleByDay.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="size-6" />}
                title={t('operations:schedules.empty.title')}
                message={t('operations:schedules.empty.message')}
              />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {scheduleByDay.map((entry) => (
                  <div key={entry.day} className="px-5 py-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
                      {t(`common:weekdays.${entry.day}`)}
                    </p>

                    <ul className="flex flex-col gap-2">
                      {entry.periods.map((period) => (
                        <li
                          key={period.id}
                          className="flex items-center gap-3 rounded-lg bg-[var(--surface-muted)] px-3 py-2"
                        >
                          <span className="w-28 shrink-0 text-xs font-medium tabular-nums text-[var(--text-muted)]">
                            {formatTimeRange(period.startTime, period.endTime)}
                          </span>

                          <span className="min-w-0 flex-1 truncate text-sm text-[var(--text)]">
                            {period.subjectName}
                          </span>

                          <span className="hidden shrink-0 text-xs text-[var(--text-subtle)] sm:block">
                            {period.teacherName ?? '—'}
                            {period.roomName ? ` · ${period.roomName}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      ) : null}

      <Modal
        open={isSubjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        title={t('academics:subjects.create')}
        closeLabel={t('common:actions.close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSubjectModalOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              disabled={!subjectId}
              onClick={async () => {
                const ok = await run(
                  () =>
                    classService.assignSubject(classId, {
                      subjectId: Number(subjectId),
                      teacherId: teacherId ? Number(teacherId) : null,
                    }),
                  t('common:toast.saved'),
                );

                if (ok) {
                  setSubjectModalOpen(false);
                  subjectsResource.refresh();
                  classResource.refresh();
                }
              }}
            >
              {t('common:actions.save')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label={t('academics:subjects.title')} required>
            {({ id }) => (
              <Select
                id={id}
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
                placeholder={t('common:actions.select')}
                options={options.subjects.map((subject) => ({
                  value: subject.id,
                  label: subject.nameEn,
                }))}
              />
            )}
          </FormField>

          <FormField
            label={t('academics:subjects.teacher')}
            optionalLabel={t('common:labels.optional')}
          >
            {({ id }) => (
              <Select
                id={id}
                value={teacherId}
                onChange={(event) => setTeacherId(event.target.value)}
                placeholder={t('academics:subjects.noTeacher')}
                options={options.teachers.map((teacher) => ({
                  value: teacher.id,
                  label: teacher.fullName,
                }))}
              />
            )}
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmRemove !== null}
        icon="delete"
        title={t('common:confirm.deleteTitle')}
        message={t('common:confirm.deleteMessage')}
        onCancel={() => setConfirmRemove(null)}
        onConfirm={async () => {
          if (confirmRemove) {
            const ok = await run(
              () => classService.removeSubject(classId, confirmRemove.id),
              t('common:toast.deleted'),
            );

            if (ok) {
              subjectsResource.refresh();
              classResource.refresh();
            }
          }

          setConfirmRemove(null);
        }}
      />
    </div>
  );
};
