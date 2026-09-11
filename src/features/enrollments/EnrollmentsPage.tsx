import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRightLeft, LogOut, Plus, Users } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { enrollmentService, studentService } from '@/services/people.service';
import { ENROLLMENT_STATUSES } from '@/types/domain';
import type { EnrollmentStatus } from '@/types/domain';
import type { Enrollment, Student } from '@/types/entities';
import { useAcademicOptions, useClassOptions } from '@/hooks/useAcademicOptions';
import { useListQuery } from '@/hooks/useListQuery';
import { useMutation } from '@/hooks/useMutation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { usePermission } from '@/hooks/usePermission';
import { useLanguageStore } from '@/stores/language.store';
import { formatDate, todayIso } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select, Textarea } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { FilterBar } from '@/components/tables/FilterBar';
import { Pagination } from '@/components/tables/Pagination';
import { RowActions } from '@/components/tables/RowActions';
import { PromoteCohortModal } from './PromoteCohortModal';

export const EnrollmentsPage = () => {
  const { t } = useTranslation(['operations', 'common', 'students', 'academics']);
  const language = useLanguageStore((state) => state.language);
  const { has } = usePermission();
  const canManage = has(PERMISSIONS.ENROLLMENTS_MANAGE);
  const { run } = useMutation();

  const options = useAcademicOptions({ years: true, gradeLevels: true });
  const [yearFilter, setYearFilter] = useState<number | undefined>(undefined);
  const { classes } = useClassOptions(yearFilter);

  const [isEnrollOpen, setEnrollOpen] = useState(false);
  const [isPromoteOpen, setPromoteOpen] = useState(false);
  const [confirmGraduate, setConfirmGraduate] = useState(false);
  const [transferTarget, setTransferTarget] = useState<Enrollment | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<Enrollment | null>(null);

  // Enroll form state
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<Student[]>([]);
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollClassId, setEnrollClassId] = useState('');
  const [enrollRoll, setEnrollRoll] = useState('');

  // Transfer / withdraw state
  const [transferClassId, setTransferClassId] = useState('');
  const [transferDate, setTransferDate] = useState(todayIso());
  const [withdrawStatus, setWithdrawStatus] = useState<'WITHDRAWN' | 'TRANSFERRED' | 'COMPLETED'>(
    'WITHDRAWN',
  );
  const [withdrawDate, setWithdrawDate] = useState(todayIso());
  const [withdrawRemarks, setWithdrawRemarks] = useState('');

  const fetcher = useCallback(
    (query: {
      page: number;
      limit: number;
      search: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      filters: Record<string, string>;
    }) =>
      enrollmentService.list({
        page: query.page,
        limit: query.limit,
        search: query.search || undefined,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        academicYearId: query.filters.academicYearId
          ? Number(query.filters.academicYearId)
          : undefined,
        classId: query.filters.classId ? Number(query.filters.classId) : undefined,
        status: (query.filters.status as EnrollmentStatus) || undefined,
      }),
    [],
  );

  const list = useListQuery<Enrollment>({
    fetcher,
    filterKeys: ['academicYearId', 'classId', 'status'],
    defaultSortBy: 'enrolled_date',
  });

  useEffect(() => {
    if (options.activeYear && !list.query.filters.academicYearId) {
      list.setFilter('academicYearId', String(options.activeYear.id));
      setYearFilter(options.activeYear.id);
    } else if (list.query.filters.academicYearId) {
      setYearFilter(Number(list.query.filters.academicYearId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.activeYear, list.query.filters.academicYearId]);

  const searchStudents = async (term: string) => {
    setStudentSearch(term);

    if (term.trim().length < 2) {
      setStudentResults([]);
      return;
    }

    try {
      const result = await studentService.list({ search: term, limit: 20 });
      setStudentResults(result.items);
    } catch {
      setStudentResults([]);
    }
  };

  const columns: Column<Enrollment>[] = [
    {
      key: 'student_name',
      header: t('operations:enrollments.fields.student'),
      sortable: true,
      render: (enrollment) => (
        <Link
          to={ROUTES.studentDetail(enrollment.studentId)}
          className="flex items-center gap-3 hover:text-[var(--primary)]"
        >
          <Avatar name={enrollment.studentName} src={enrollment.studentPhoto} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium">{enrollment.studentName}</p>
            <p className="truncate text-xs text-[var(--text-subtle)]">{enrollment.studentCode}</p>
          </div>
        </Link>
      ),
    },
    {
      key: 'class_name',
      header: t('operations:enrollments.fields.class'),
      sortable: true,
      render: (enrollment) => (
        <Link to={ROUTES.classDetail(enrollment.classId)} className="hover:text-[var(--primary)]">
          <p className="font-medium">{enrollment.className}</p>
          <p className="text-xs text-[var(--text-subtle)]">{enrollment.gradeLevelName}</p>
        </Link>
      ),
    },
    {
      key: 'year',
      header: t('operations:enrollments.fields.academicYear'),
      hideOnMobile: true,
      render: (enrollment) => enrollment.academicYearName,
    },
    {
      key: 'roll',
      header: t('operations:enrollments.fields.rollNumber'),
      align: 'center',
      hideOnMobile: true,
      render: (enrollment) => enrollment.rollNumber ?? '—',
    },
    {
      key: 'enrolled_date',
      header: t('operations:enrollments.fields.enrolledDate'),
      sortable: true,
      hideOnMobile: true,
      render: (enrollment) => (
        <span className="text-xs text-[var(--text-muted)]">
          {formatDate(enrollment.enrolledDate, language)}
          {enrollment.endDate ? ` – ${formatDate(enrollment.endDate, language)}` : ''}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common:labels.status'),
      sortable: true,
      render: (enrollment) => <StatusBadge kind="enrollment" status={enrollment.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (enrollment) => (
        <RowActions
          label={enrollment.studentName}
          items={
            canManage && enrollment.status === 'ACTIVE'
              ? [
                  {
                    key: 'transfer',
                    label: t('operations:enrollments.actions.transfer'),
                    icon: <ArrowRightLeft className="size-4" />,
                    onSelect: () => {
                      setTransferTarget(enrollment);
                      setTransferClassId('');
                      setTransferDate(todayIso());
                    },
                  },
                  {
                    key: 'withdraw',
                    label: t('operations:enrollments.actions.withdraw'),
                    icon: <LogOut className="size-4" />,
                    tone: 'danger',
                    separatorBefore: true,
                    onSelect: () => {
                      setWithdrawTarget(enrollment);
                      setWithdrawStatus('WITHDRAWN');
                      setWithdrawDate(todayIso());
                      setWithdrawRemarks('');
                    },
                  },
                ]
              : []
          }
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('operations:enrollments.title')}
        description={t('operations:enrollments.subtitle')}
        actions={
          canManage ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setPromoteOpen(true)}
                leftIcon={<Users className="size-4" />}
              >
                {t('operations:enrollments.actions.promote')}
              </Button>

              {/* <Button
                variant="secondary"
                onClick={() => setConfirmGraduate(true)}
                leftIcon={<GraduationCap className="size-4" />}
              > */}
                {/* {t('operations:enrollments.actions.graduate')}
              </Button> */}

              <Button
                onClick={() => {
                  setEnrollStudentId('');
                  setEnrollClassId('');
                  setEnrollRoll('');
                  setStudentSearch('');
                  setStudentResults([]);
                  setEnrollOpen(true);
                }}
                leftIcon={<Plus className="size-4" />}
              >
                {t('operations:enrollments.create')}
              </Button>
            </>
          ) : null
        }
      />

      <FilterBar
        search={list.query.search}
        onSearchChange={list.setSearch}
        searchPlaceholder={t('students:placeholders.search')}
        isFiltered={list.isFiltered}
        onClearFilters={list.clearFilters}
        filters={
          <>
            <Select
              className="w-40"
              value={list.query.filters.academicYearId ?? ''}
              onChange={(event) => list.setFilter('academicYearId', event.target.value)}
              placeholder={t('operations:enrollments.fields.academicYear')}
              options={options.academicYears.map((year) => ({ value: year.id, label: year.name }))}
            />

            <Select
              className="w-36"
              value={list.query.filters.classId ?? ''}
              onChange={(event) => list.setFilter('classId', event.target.value)}
              placeholder={t('operations:enrollments.fields.class')}
              options={classes.map((schoolClass) => ({
                value: schoolClass.id,
                label: schoolClass.name,
              }))}
            />

            <Select
              className="w-36"
              value={list.query.filters.status ?? ''}
              onChange={(event) => list.setFilter('status', event.target.value)}
              placeholder={t('common:labels.status')}
              options={ENROLLMENT_STATUSES.map((status) => ({
                value: status,
                label: t(`students:enrollmentStatus.${status}`),
              }))}
            />
          </>
        }
      />

      <DataTable<Enrollment>
        columns={columns}
        rows={list.rows}
        rowKey={(enrollment) => enrollment.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={list.refresh}
        isFiltered={list.isFiltered}
        sort={{ sortBy: list.query.sortBy, sortOrder: list.query.sortOrder }}
        onSortChange={list.setSort}
        emptyTitle={t('operations:enrollments.empty.title')}
        emptyMessage={t('operations:enrollments.empty.message')}
        footer={
          <Pagination
            pagination={list.pagination}
            onPageChange={list.setPage}
            onLimitChange={list.setLimit}
          />
        }
      />

      {/* Enroll a student */}
      <Modal
        open={isEnrollOpen}
        onClose={() => setEnrollOpen(false)}
        title={t('operations:enrollments.create')}
        closeLabel={t('common:actions.close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEnrollOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              disabled={!enrollStudentId || !enrollClassId}
              onClick={async () => {
                const ok = await run(
                  () =>
                    enrollmentService.create({
                      studentId: Number(enrollStudentId),
                      academicYearId: yearFilter ?? options.activeYear?.id ?? 0,
                      classId: Number(enrollClassId),
                      rollNumber: enrollRoll || null,
                    }),
                  t('operations:enrollments.toast.created'),
                );

                if (ok) {
                  setEnrollOpen(false);
                  list.refresh();
                }
              }}
            >
              {t('common:actions.save')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label={t('students:placeholders.search')}>
            {({ id }) => (
              <Input
                id={id}
                autoFocus
                value={studentSearch}
                onChange={(event) => void searchStudents(event.target.value)}
              />
            )}
          </FormField>

          <FormField label={t('operations:enrollments.fields.student')} required>
            {({ id }) => (
              <Select
                id={id}
                value={enrollStudentId}
                onChange={(event) => setEnrollStudentId(event.target.value)}
                placeholder={t('common:actions.select')}
                options={studentResults.map((student) => ({
                  value: student.id,
                  label: `${student.fullName} · ${student.studentCode}`,
                }))}
              />
            )}
          </FormField>

          <FormField label={t('operations:enrollments.fields.class')} required>
            {({ id }) => (
              <Select
                id={id}
                value={enrollClassId}
                onChange={(event) => setEnrollClassId(event.target.value)}
                placeholder={t('common:actions.select')}
                options={classes.map((schoolClass) => ({
                  value: schoolClass.id,
                  label: `${schoolClass.name} · ${t('operations:enrollments.capacity', {
                    enrolled: schoolClass.enrolledCount,
                    capacity: schoolClass.capacity,
                  })}`,
                  disabled: schoolClass.availableSeats === 0,
                }))}
              />
            )}
          </FormField>

          <FormField
            label={t('operations:enrollments.fields.rollNumber')}
            optionalLabel={t('common:labels.optional')}
          >
            {({ id }) => (
              <Input id={id} value={enrollRoll} onChange={(event) => setEnrollRoll(event.target.value)} />
            )}
          </FormField>
        </div>
      </Modal>

      {/* Transfer */}
      <Modal
        open={transferTarget !== null}
        onClose={() => setTransferTarget(null)}
        title={t('operations:enrollments.transferDialog.title', {
          name: transferTarget?.studentName ?? '',
        })}
        closeLabel={t('common:actions.close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTransferTarget(null)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              disabled={!transferClassId}
              onClick={async () => {
                if (!transferTarget) {
                  return;
                }

                const ok = await run(
                  () =>
                    enrollmentService.transfer(transferTarget.id, {
                      classId: Number(transferClassId),
                      effectiveDate: transferDate,
                    }),
                  t('operations:enrollments.toast.transferred'),
                );

                if (ok) {
                  setTransferTarget(null);
                  list.refresh();
                }
              }}
            >
              {t('operations:enrollments.actions.transfer')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            {t('operations:enrollments.transferDialog.message')}
          </p>

          <FormField label={t('operations:enrollments.transferDialog.newClass')} required>
            {({ id }) => (
              <Select
                id={id}
                value={transferClassId}
                onChange={(event) => setTransferClassId(event.target.value)}
                placeholder={t('common:actions.select')}
                options={classes
                  .filter((schoolClass) => schoolClass.id !== transferTarget?.classId)
                  .map((schoolClass) => ({
                    value: schoolClass.id,
                    label: `${schoolClass.name} · ${schoolClass.enrolledCount}/${schoolClass.capacity}`,
                    disabled: schoolClass.availableSeats === 0,
                  }))}
              />
            )}
          </FormField>

          <FormField label={t('operations:enrollments.transferDialog.effectiveDate')}>
            {({ id }) => (
              <Input
                id={id}
                type="date"
                value={transferDate}
                onChange={(event) => setTransferDate(event.target.value)}
              />
            )}
          </FormField>
        </div>
      </Modal>

      {/* Withdraw */}
      <Modal
        open={withdrawTarget !== null}
        onClose={() => setWithdrawTarget(null)}
        title={t('operations:enrollments.withdrawDialog.title', {
          name: withdrawTarget?.studentName ?? '',
        })}
        closeLabel={t('common:actions.close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setWithdrawTarget(null)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!withdrawTarget) {
                  return;
                }

                const ok = await run(
                  () =>
                    enrollmentService.withdraw(withdrawTarget.id, {
                      status: withdrawStatus,
                      endDate: withdrawDate,
                      remarks: withdrawRemarks || null,
                    }),
                  t('operations:enrollments.toast.withdrawn'),
                );

                if (ok) {
                  setWithdrawTarget(null);
                  list.refresh();
                }
              }}
            >
              {t('operations:enrollments.actions.withdraw')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            {t('operations:enrollments.withdrawDialog.message')}
          </p>

          <FormField label={t('common:labels.status')}>
            {({ id }) => (
              <Select
                id={id}
                value={withdrawStatus}
                onChange={(event) =>
                  setWithdrawStatus(event.target.value as 'WITHDRAWN' | 'TRANSFERRED' | 'COMPLETED')
                }
                options={(['WITHDRAWN', 'TRANSFERRED', 'COMPLETED'] as const).map((status) => ({
                  value: status,
                  label: t(`students:enrollmentStatus.${status}`),
                }))}
              />
            )}
          </FormField>

          <FormField label={t('operations:enrollments.withdrawDialog.endDate')}>
            {({ id }) => (
              <Input
                id={id}
                type="date"
                value={withdrawDate}
                onChange={(event) => setWithdrawDate(event.target.value)}
              />
            )}
          </FormField>

          <FormField label={t('operations:enrollments.withdrawDialog.reason')}>
            {({ id }) => (
              <Textarea
                id={id}
                rows={2}
                value={withdrawRemarks}
                onChange={(event) => setWithdrawRemarks(event.target.value)}
              />
            )}
          </FormField>
        </div>
      </Modal>

      <PromoteCohortModal
        open={isPromoteOpen}
        onClose={() => setPromoteOpen(false)}
        onDone={list.refresh}
        academicYears={options.academicYears}
      />

      {/*
        * Graduating is irreversible in practice — it closes every leaver's
        * enrolment and marks them as gone — so it asks first and names the year.
        */}
      <ConfirmDialog
        open={confirmGraduate}
        icon="warning"
        title={t('operations:enrollments.graduate.title')}
        message={t('operations:enrollments.graduate.message', {
          year: options.activeYear?.name ?? '',
        })}
        confirmLabel={t('operations:enrollments.actions.graduate')}
        onCancel={() => setConfirmGraduate(false)}
        onConfirm={async () => {
          setConfirmGraduate(false);
          const year = options.activeYear;

          if (!year) {
            return;
          }

          const result = await run(
            () => enrollmentService.graduate({ academicYearId: year.id }),
            t('operations:enrollments.graduate.done'),
          );

          if (result) {
            list.refresh();
          }
        }}
      />
    </div>
  );
};
