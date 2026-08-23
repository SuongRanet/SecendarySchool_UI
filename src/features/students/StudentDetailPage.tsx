import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, GraduationCap, Heart, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { parentService, studentService } from '@/services/people.service';
import { attendanceService } from '@/services/operations.service';
import { gradeService } from '@/services/performance.service';
import { behaviorService } from '@/services/engagement.service';
import { GUARDIAN_RELATIONSHIPS } from '@/types/domain';
import type {
  Behavior,
  Grade,
  Parent,
  Student,
  StudentAttendanceSummary,
  StudentEnrollmentHistory,
  StudentParent,
} from '@/types/entities';
import { useApiResource } from '@/hooks/useApiResource';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { useLanguageStore } from '@/stores/language.store';
import { calculateAge, formatDate, formatPercent, formatScore } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
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
import { ErrorState, LoadingState } from '@/components/feedback/States';
import { StudentFormModal } from './StudentFormModal';

type TabKey = 'profile' | 'guardians' | 'enrollments' | 'grades' | 'behavior';

export const StudentDetailPage = () => {
  const { t } = useTranslation(['students', 'common', 'performance', 'communication', 'attendance']);
  const params = useParams();
  const studentId = Number(params.id);
  const language = useLanguageStore((state) => state.language);
  const { has } = usePermission();
  const { run } = useMutation();

  const canUpdate = has(PERMISSIONS.STUDENTS_UPDATE);
  const canLinkParents = has(PERMISSIONS.PARENTS_LINK_STUDENTS);

  const [tab, setTab] = useState<TabKey>('profile');
  const [isEditOpen, setEditOpen] = useState(false);
  const [isLinkOpen, setLinkOpen] = useState(false);
  const [parentOptions, setParentOptions] = useState<Parent[]>([]);
  const [linkParentId, setLinkParentId] = useState('');
  const [linkRelationship, setLinkRelationship] = useState('MOTHER');
  const [linkPrimary, setLinkPrimary] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState<StudentParent | null>(null);

  const studentFetcher = useCallback(() => studentService.getById(studentId), [studentId]);
  const student = useApiResource<Student>(studentFetcher, [studentId]);

  const guardiansFetcher = useCallback(() => studentService.listParents(studentId), [studentId]);
  const guardians = useApiResource<StudentParent[]>(guardiansFetcher, [studentId]);

  const historyFetcher = useCallback(
    () => studentService.enrollmentHistory(studentId),
    [studentId],
  );
  const history = useApiResource<StudentEnrollmentHistory[]>(historyFetcher, [studentId]);

  const attendanceFetcher = useCallback(
    () => attendanceService.studentSummary(studentId),
    [studentId],
  );
  const attendance = useApiResource<StudentAttendanceSummary>(attendanceFetcher, [studentId]);

  const gradesFetcher = useCallback(() => gradeService.forStudent(studentId), [studentId]);
  const grades = useApiResource<Grade[]>(gradesFetcher, [studentId]);

  const behaviorFetcher = useCallback(
    () => behaviorService.list({ studentId, limit: 50 }).then((result) => result.items),
    [studentId],
  );
  const behaviors = useApiResource<Behavior[]>(behaviorFetcher, [studentId]);

  const openLinkModal = async () => {
    setLinkParentId('');
    setLinkRelationship('MOTHER');
    setLinkPrimary(false);
    setLinkOpen(true);

    try {
      setParentOptions(await parentService.options());
    } catch {
      setParentOptions([]);
    }
  };

  if (student.isLoading) {
    return <LoadingState />;
  }

  if (student.error || !student.data) {
    return (
      <ErrorState
        variant={student.errorStatus === 403 ? 'forbidden' : 'error'}
        message={student.error ?? undefined}
        onRetry={student.refresh}
      />
    );
  }

  const record = student.data;

  const guardianColumns: Column<StudentParent>[] = [
    {
      key: 'name',
      header: t('common:labels.name'),
      render: (guardian) => (
        <Link
          to={ROUTES.parentDetail(guardian.parentId)}
          className="flex items-center gap-3 hover:text-[var(--primary)]"
        >
          <Avatar name={guardian.fullName} src={guardian.profilePhoto} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium">{guardian.fullName}</p>
            <p className="truncate text-xs text-[var(--text-subtle)]">{guardian.parentCode}</p>
          </div>
        </Link>
      ),
    },
    {
      key: 'relationship',
      header: t('students:guardians.relationship'),
      render: (guardian) => (
        <Badge tone="primary" size="sm">
          {t(`students:relationship.${guardian.relationship}`)}
        </Badge>
      ),
    },
    {
      key: 'phone',
      header: t('students:fields.phoneNumber'),
      hideOnMobile: true,
      render: (guardian) => guardian.phoneNumber ?? '—',
    },
    {
      key: 'contacts',
      header: '',
      hideOnMobile: true,
      render: (guardian) => (
        <div className="flex flex-wrap gap-1">
          {guardian.isPrimaryContact ? (
            <Badge tone="success" size="sm">
              {t('students:guardians.primaryContact')}
            </Badge>
          ) : null}
          {guardian.isEmergencyContact ? (
            <Badge tone="warning" size="sm">
              {t('students:guardians.emergencyContact')}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (guardian) => (
        <RowActions
          label={guardian.fullName}
          items={
            canLinkParents
              ? [
                  {
                    key: 'unlink',
                    label: t('students:guardians.remove'),
                    icon: <Trash2 className="size-4" />,
                    tone: 'danger',
                    onSelect: () => setConfirmUnlink(guardian),
                  },
                ]
              : []
          }
        />
      ),
    },
  ];

  const historyColumns: Column<StudentEnrollmentHistory>[] = [
    {
      key: 'year',
      header: t('students:fields.academicYear'),
      render: (entry) => <span className="font-medium text-[var(--text)]">{entry.academicYearName}</span>,
    },
    {
      key: 'class',
      header: t('students:fields.currentClass'),
      render: (entry) => (
        <Link to={ROUTES.classDetail(entry.classId)} className="hover:text-[var(--primary)]">
          {entry.className}
        </Link>
      ),
    },
    {
      key: 'grade',
      header: t('students:fields.gradeLevel'),
      hideOnMobile: true,
      render: (entry) => entry.gradeLevelName,
    },
    {
      key: 'teacher',
      header: t('academics:classes.homeroomTeacher', { ns: 'academics' }),
      hideOnMobile: true,
      render: (entry) => entry.homeroomTeacherName ?? '—',
    },
    {
      key: 'period',
      header: t('students:fields.enrolledDate'),
      hideOnMobile: true,
      render: (entry) => (
        <span className="text-xs text-[var(--text-muted)]">
          {formatDate(entry.enrolledDate, language)}
          {entry.endDate ? ` – ${formatDate(entry.endDate, language)}` : ''}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common:labels.status'),
      render: (entry) => <StatusBadge kind="enrollment" status={entry.status} />,
    },
  ];

  const gradeColumns: Column<Grade>[] = [
    {
      key: 'subject',
      header: t('performance:grades.fields.subject'),
      render: (grade) => <span className="font-medium text-[var(--text)]">{grade.subjectName}</span>,
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
      key: 'rank',
      header: t('performance:grades.fields.rank'),
      align: 'center',
      hideOnMobile: true,
      render: (grade) => grade.rankInClass ?? '—',
    },
  ];

  const behaviorColumns: Column<Behavior>[] = [
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
            <p className="truncate text-xs text-[var(--text-muted)]">{behavior.description}</p>
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
    <div className="flex flex-col gap-5">
      <PageHeader
        title={record.fullName}
        description={`${record.studentCode} · ${
          record.currentEnrollment?.className ?? t('students:notEnrolled')
        }`}
        breadcrumbs={[
          { label: t('students:title'), to: ROUTES.students },
          { label: record.fullName },
        ]}
        actions={
          canUpdate ? (
            <Button
              variant="secondary"
              onClick={() => setEditOpen(true)}
              leftIcon={<Pencil className="size-4" />}
            >
              {t('common:actions.edit')}
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('students:fields.currentClass')}
          value={record.currentEnrollment?.className ?? '—'}
          icon={<GraduationCap className="size-5" />}
          tone="primary"
          hint={record.currentEnrollment?.academicYearName}
        />
        <StatCard
          label={t('attendance:summary.rate')}
          value={
            attendance.data ? formatPercent(attendance.data.attendanceRate, language) : '—'
          }
          icon={<CalendarCheck className="size-5" />}
          tone={(attendance.data?.attendanceRate ?? 100) >= 90 ? 'success' : 'warning'}
          isLoading={attendance.isLoading}
        />
        <StatCard
          label={t('students:fields.guardians')}
          value={record.parentCount}
          icon={<Users className="size-5" />}
          tone="accent"
        />
        <StatCard
          label={t('communication:behaviors.title')}
          value={behaviors.data?.length ?? 0}
          icon={<Heart className="size-5" />}
          tone="info"
          isLoading={behaviors.isLoading}
        />
      </div>

      <Tabs
        value={tab}
        onChange={(key) => setTab(key as TabKey)}
        ariaLabel={record.fullName}
        items={[
          { key: 'profile', label: t('students:tabs.profile') },
          { key: 'guardians', label: t('students:tabs.guardians') },
          { key: 'enrollments', label: t('students:tabs.enrollments') },
          { key: 'grades', label: t('students:tabs.grades') },
          { key: 'behavior', label: t('students:tabs.behavior') },
        ]}
      />

      {tab === 'profile' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardBody className="flex flex-col items-center gap-3 text-center">
              <Avatar name={record.fullName} src={record.profilePhoto} size="xl" />
              <div>
                <p className="text-lg font-semibold text-[var(--text)]">{record.fullName}</p>
                {record.fullNameKh ? (
                  <p className="font-khmer text-sm text-[var(--text-muted)]">{record.fullNameKh}</p>
                ) : null}
              </div>
              <StatusBadge kind="student" status={record.status} />
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader title={t('students:sections.personal')} />
            <CardBody>
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                {[
                  [t('students:fields.studentCode'), record.studentCode],
                  [
                    t('students:fields.gender'),
                    record.gender ? t(`common:gender.${record.gender}`) : '—',
                  ],
                  [t('students:fields.dateOfBirth'), formatDate(record.dateOfBirth, language)],
                  [t('students:fields.age'), calculateAge(record.dateOfBirth) ?? '—'],
                  [t('students:fields.placeOfBirth'), record.placeOfBirth ?? '—'],
                  [t('students:fields.nationalId'), record.nationalId ?? '—'],
                  [t('students:fields.phoneNumber'), record.phoneNumber ?? '—'],
                  [t('students:fields.email'), record.email ?? '—'],
                  [t('students:fields.province'), record.province ?? '—'],
                  [t('students:fields.currentAddress'), record.currentAddress ?? '—'],
                  [t('students:fields.enrolledDate'), formatDate(record.enrolledDate, language)],
                  [t('students:fields.account'), record.username ?? '—'],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-[var(--text-muted)]">{label}</dt>
                    <dd className="mt-0.5 font-medium text-[var(--text)]">{value}</dd>
                  </div>
                ))}
              </dl>

              {record.notes ? (
                <div className="mt-4 rounded-lg bg-[var(--surface-muted)] p-3">
                  <p className="text-xs font-medium text-[var(--text-muted)]">
                    {t('students:fields.notes')}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text)]">{record.notes}</p>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === 'guardians' ? (
        <div className="flex flex-col gap-3">
          {canLinkParents ? (
            <div className="flex justify-end">
              <Button onClick={openLinkModal} leftIcon={<Plus className="size-4" />}>
                {t('students:guardians.add')}
              </Button>
            </div>
          ) : null}

          <DataTable<StudentParent>
            columns={guardianColumns}
            rows={guardians.data ?? []}
            rowKey={(guardian) => guardian.linkId}
            isLoading={guardians.isLoading}
            error={guardians.error}
            onRetry={guardians.refresh}
            emptyTitle={t('students:guardians.empty')}
          />
        </div>
      ) : null}

      {tab === 'enrollments' ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--text-muted)]">{t('students:enrollments.hint')}</p>

          <DataTable<StudentEnrollmentHistory>
            columns={historyColumns}
            rows={history.data ?? []}
            rowKey={(entry) => entry.id}
            isLoading={history.isLoading}
            error={history.error}
            onRetry={history.refresh}
            emptyTitle={t('students:enrollments.empty')}
          />
        </div>
      ) : null}

      {tab === 'grades' ? (
        <DataTable<Grade>
          columns={gradeColumns}
          rows={grades.data ?? []}
          rowKey={(grade) => grade.id}
          isLoading={grades.isLoading}
          error={grades.error}
          onRetry={grades.refresh}
          emptyTitle={t('performance:grades.empty.title')}
          emptyMessage={t('performance:grades.empty.message')}
        />
      ) : null}

      {tab === 'behavior' ? (
        <DataTable<Behavior>
          columns={behaviorColumns}
          rows={behaviors.data ?? []}
          rowKey={(behavior) => behavior.id}
          isLoading={behaviors.isLoading}
          error={behaviors.error}
          onRetry={behaviors.refresh}
          emptyTitle={t('communication:behaviors.empty.title')}
          emptyMessage={t('communication:behaviors.empty.message')}
        />
      ) : null}

      <StudentFormModal
        open={isEditOpen}
        student={record}
        onClose={() => setEditOpen(false)}
        onSaved={student.refresh}
      />

      <Modal
        open={isLinkOpen}
        onClose={() => setLinkOpen(false)}
        title={t('students:guardians.add')}
        closeLabel={t('common:actions.close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLinkOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              disabled={!linkParentId}
              onClick={async () => {
                const ok = await run(
                  () =>
                    studentService.linkParent(studentId, {
                      parentId: Number(linkParentId),
                      relationship: linkRelationship as never,
                      isPrimaryContact: linkPrimary,
                    }),
                  t('students:toast.guardianLinked'),
                );

                if (ok) {
                  setLinkOpen(false);
                  guardians.refresh();
                  student.refresh();
                }
              }}
            >
              {t('common:actions.save')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label={t('students:guardians.selectParent')} required>
            {({ id }) => (
              <Select
                id={id}
                value={linkParentId}
                onChange={(event) => setLinkParentId(event.target.value)}
                placeholder={t('common:actions.select')}
                options={parentOptions.map((parent) => ({
                  value: parent.id,
                  label: `${parent.fullName}${parent.phoneNumber ? ` · ${parent.phoneNumber}` : ''}`,
                }))}
              />
            )}
          </FormField>

          <FormField label={t('students:guardians.relationship')}>
            {({ id }) => (
              <Select
                id={id}
                value={linkRelationship}
                onChange={(event) => setLinkRelationship(event.target.value)}
                options={GUARDIAN_RELATIONSHIPS.map((relationship) => ({
                  value: relationship,
                  label: t(`students:relationship.${relationship}`),
                }))}
              />
            )}
          </FormField>

          <Checkbox
            id="linkPrimary"
            label={t('students:guardians.primaryContact')}
            checked={linkPrimary}
            onChange={(event) => setLinkPrimary(event.target.checked)}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmUnlink !== null}
        icon="delete"
        title={t('students:guardians.removeTitle')}
        message={t('students:guardians.removeMessage', { name: confirmUnlink?.fullName ?? '' })}
        onCancel={() => setConfirmUnlink(null)}
        onConfirm={async () => {
          if (confirmUnlink) {
            const ok = await run(
              () => studentService.unlinkParent(studentId, confirmUnlink.parentId),
              t('students:toast.guardianRemoved'),
            );

            if (ok) {
              guardians.refresh();
              student.refresh();
            }
          }

          setConfirmUnlink(null);
        }}
      />
    </div>
  );
};
