import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, CalendarDays, KeyRound, Pencil, Users } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { teacherService } from '@/services/people.service';
import type { Schedule, Teacher, TeacherAssignment } from '@/types/entities';
import { useAcademicOptions } from '@/hooks/useAcademicOptions';
import { useApiResource } from '@/hooks/useApiResource';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { useLanguageStore } from '@/stores/language.store';
import { formatDate } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { ErrorState, LoadingState } from '@/components/feedback/States';
import { WeeklyTimetable } from '@/components/schedule/WeeklyTimetable';
import { TeacherFormModal } from './TeacherFormModal';

type TabKey = 'profile' | 'assignments' | 'schedule';

export const TeacherDetailPage = () => {
  const { t } = useTranslation(['teachers', 'common', 'academics', 'operations']);
  const params = useParams();
  const teacherId = Number(params.id);
  const language = useLanguageStore((state) => state.language);
  const { has } = usePermission();
  const { run } = useMutation();

  const canUpdate = has(PERMISSIONS.TEACHERS_UPDATE);
  const canAssign = has(PERMISSIONS.TEACHERS_ASSIGN);

  const options = useAcademicOptions({ years: false, gradeLevels: false, subjects: true });
  const [tab, setTab] = useState<TabKey>('profile');
  const [isEditOpen, setEditOpen] = useState(false);
  const [isSubjectsOpen, setSubjectsOpen] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

  const teacherFetcher = useCallback(() => teacherService.getById(teacherId), [teacherId]);
  const teacher = useApiResource<Teacher>(teacherFetcher, [teacherId]);

  const assignmentsFetcher = useCallback(() => teacherService.assignments(teacherId), [teacherId]);
  const assignments = useApiResource<TeacherAssignment[]>(assignmentsFetcher, [teacherId]);

  const scheduleFetcher = useCallback(() => teacherService.schedule(teacherId), [teacherId]);
  const schedule = useApiResource<Schedule[]>(scheduleFetcher, [teacherId]);

  useEffect(() => {
    if (teacher.data) {
      setSelectedSubjects(teacher.data.subjectIds);
    }
  }, [teacher.data]);

  if (teacher.isLoading) {
    return <LoadingState />;
  }

  if (teacher.error || !teacher.data) {
    return (
      <ErrorState
        variant={teacher.errorStatus === 403 ? 'forbidden' : 'error'}
        message={teacher.error ?? undefined}
        onRetry={teacher.refresh}
      />
    );
  }

  const record = teacher.data;

  const assignmentColumns: Column<TeacherAssignment>[] = [
    {
      key: 'class',
      header: t('academics:classes.title'),
      render: (assignment) => (
        <Link
          to={ROUTES.classDetail(assignment.classId)}
          className="font-medium hover:text-[var(--primary)]"
        >
          {assignment.className}
        </Link>
      ),
    },
    {
      key: 'subject',
      header: t('academics:subjects.title'),
      render: (assignment) =>
        assignment.subjectName ?? (
          <span className="text-[var(--text-subtle)]">
            {t('teachers:assignments.homeroomOnly')}
          </span>
        ),
    },
    {
      key: 'grade',
      header: t('academics:classes.gradeLevel'),
      hideOnMobile: true,
      render: (assignment) => assignment.gradeLevelName,
    },
    {
      key: 'year',
      header: t('academics:classes.academicYear'),
      hideOnMobile: true,
      render: (assignment) => assignment.academicYearName,
    },
    {
      key: 'students',
      header: t('teachers:fields.students'),
      align: 'center',
      render: (assignment) => assignment.studentCount,
    },
    {
      key: 'homeroom',
      header: '',
      render: (assignment) =>
        assignment.isHomeroom ? (
          <Badge tone="primary" size="sm">
            {t('teachers:assignments.homeroom')}
          </Badge>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={record.fullName}
        description={`${record.teacherCode} · ${record.specialization ?? ''}`}
        breadcrumbs={[
          { label: t('teachers:title'), to: ROUTES.teachers },
          { label: record.fullName },
        ]}
        actions={
          <>
            {canAssign ? (
              <Button
                variant="secondary"
                onClick={() => setSubjectsOpen(true)}
                leftIcon={<BookOpen className="size-4" />}
              >
                {t('teachers:assignments.assignSubjects')}
              </Button>
            ) : null}

            {canUpdate ? (
              <Button onClick={() => setEditOpen(true)} leftIcon={<Pencil className="size-4" />}>
                {t('common:actions.edit')}
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('teachers:fields.classes')}
          value={record.classCount}
          icon={<Users className="size-5" />}
          tone="primary"
        />
        <StatCard
          label={t('teachers:fields.students')}
          value={record.studentCount}
          icon={<Users className="size-5" />}
          tone="accent"
        />
        <StatCard
          label={t('teachers:fields.subjects')}
          value={record.subjectIds.length}
          icon={<BookOpen className="size-5" />}
          tone="info"
        />
        <StatCard
          label={t('teachers:fields.account')}
          value={record.username ?? t('teachers:account.none')}
          icon={<KeyRound className="size-5" />}
          tone="neutral"
        />
      </div>

      <Tabs
        value={tab}
        onChange={(key) => setTab(key as TabKey)}
        ariaLabel={record.fullName}
        items={[
          { key: 'profile', label: t('teachers:tabs.profile') },
          { key: 'assignments', label: t('teachers:tabs.assignments') },
          { key: 'schedule', label: t('teachers:tabs.schedule') },
        ]}
      />

      {tab === 'profile' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardBody className="flex flex-col items-center gap-3 text-center">
              <Avatar name={record.fullName} src={record.profilePhoto} size="xl" />
              <div>
                <p className="text-lg font-semibold text-[var(--text)]">{record.fullName}</p>
                <p className="text-sm text-[var(--text-muted)]">{record.teacherCode}</p>
              </div>
              <StatusBadge kind="staff" status={record.status} />
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader title={t('teachers:sections.personal')} />
            <CardBody>
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                {[
                  [
                    t('teachers:fields.gender'),
                    record.gender ? t(`common:gender.${record.gender}`) : '—',
                  ],
                  [t('teachers:fields.dateOfBirth'), formatDate(record.dateOfBirth, language)],
                  [t('teachers:fields.phoneNumber'), record.phoneNumber ?? '—'],
                  [t('teachers:fields.email'), record.email ?? '—'],
                  [t('teachers:fields.nationalId'), record.nationalId ?? '—'],
                  [t('teachers:fields.address'), record.address ?? '—'],
                  [t('teachers:fields.qualification'), record.qualification ?? '—'],
                  [t('teachers:fields.specialization'), record.specialization ?? '—'],
                  [t('teachers:fields.hireDate'), formatDate(record.hireDate, language)],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-[var(--text-muted)]">{label}</dt>
                    <dd className="mt-0.5 font-medium text-[var(--text)]">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4">
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  {t('teachers:fields.subjects')}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {record.subjectIds.length === 0 ? (
                    <span className="text-sm text-[var(--text-subtle)]">—</span>
                  ) : (
                    record.subjectIds.map((subjectId) => {
                      const subject = options.subjects.find((item) => item.id === subjectId);

                      return (
                        <Badge key={subjectId} tone="primary" size="sm">
                          {subject?.nameEn ?? subjectId}
                        </Badge>
                      );
                    })
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === 'assignments' ? (
        <DataTable<TeacherAssignment>
          columns={assignmentColumns}
          rows={assignments.data ?? []}
          rowKey={(assignment) => assignment.classSubjectId ?? `homeroom-${assignment.classId}`}
          isLoading={assignments.isLoading}
          error={assignments.error}
          onRetry={assignments.refresh}
          emptyTitle={t('teachers:assignments.empty')}
        />
      ) : null}

      {tab === 'schedule' ? (
        <Card>
          <CardHeader
            title={t('teachers:tabs.schedule')}
            action={<CalendarDays className="size-4 text-[var(--text-subtle)]" aria-hidden="true" />}
          />
          <CardBody>
            {schedule.isLoading ? (
              <LoadingState compact />
            ) : (
              <WeeklyTimetable periods={schedule.data ?? []} showTeacher={false} showClass />
            )}
          </CardBody>
        </Card>
      ) : null}

      <TeacherFormModal
        open={isEditOpen}
        teacher={record}
        onClose={() => setEditOpen(false)}
        onSaved={teacher.refresh}
      />

      <Modal
        open={isSubjectsOpen}
        onClose={() => setSubjectsOpen(false)}
        title={t('teachers:assignments.assignSubjects')}
        closeLabel={t('common:actions.close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSubjectsOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={async () => {
                const ok = await run(
                  () => teacherService.assignSubjects(teacherId, selectedSubjects),
                  t('teachers:toast.subjectsAssigned'),
                );

                if (ok) {
                  setSubjectsOpen(false);
                  teacher.refresh();
                }
              }}
            >
              {t('common:actions.save')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {options.subjects.map((subject) => (
            <Checkbox
              key={subject.id}
              id={`teacher-subject-${subject.id}`}
              label={subject.nameEn}
              checked={selectedSubjects.includes(subject.id)}
              onChange={() =>
                setSelectedSubjects((current) =>
                  current.includes(subject.id)
                    ? current.filter((id) => id !== subject.id)
                    : [...current, subject.id],
                )
              }
            />
          ))}
        </div>
      </Modal>
    </div>
  );
};
