import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Archive, Eye, Pencil, Plus } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { studentService } from '@/services/people.service';
import { GENDERS, STUDENT_STATUSES } from '@/types/domain';
import type { Gender, StudentStatus } from '@/types/domain';
import type { Student } from '@/types/entities';
import { useAcademicOptions, useClassOptions } from '@/hooks/useAcademicOptions';
import { useListQuery } from '@/hooks/useListQuery';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { calculateAge } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { FilterBar } from '@/components/tables/FilterBar';
import { Pagination } from '@/components/tables/Pagination';
import { RowActions } from '@/components/tables/RowActions';
import { StudentFormModal } from './StudentFormModal';

export const StudentsPage = () => {
  const { t } = useTranslation(['students', 'common', 'academics']);
  const navigate = useNavigate();
  const { has } = usePermission();
  const { run } = useMutation();

  const canCreate = has(PERMISSIONS.STUDENTS_CREATE);
  const canUpdate = has(PERMISSIONS.STUDENTS_UPDATE);
  const canArchive = has(PERMISSIONS.STUDENTS_ARCHIVE);

  const options = useAcademicOptions({ years: true, gradeLevels: true });
  const [isFormOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Student | null>(null);

  const fetcher = useCallback(
    (query: {
      page: number;
      limit: number;
      search: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      filters: Record<string, string>;
    }) =>
      studentService.list({
        page: query.page,
        limit: query.limit,
        search: query.search || undefined,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        status: (query.filters.status as StudentStatus) || undefined,
        gender: (query.filters.gender as Gender) || undefined,
        gradeLevelId: query.filters.gradeLevelId ? Number(query.filters.gradeLevelId) : undefined,
        classId: query.filters.classId ? Number(query.filters.classId) : undefined,
      }),
    [],
  );

  const list = useListQuery<Student>({
    fetcher,
    filterKeys: ['status', 'gender', 'gradeLevelId', 'classId'],
    defaultSortBy: 'first_name_en',
    defaultSortOrder: 'asc',
  });

  const { classes } = useClassOptions(options.activeYear?.id);

  const columns: Column<Student>[] = [
    {
      key: 'first_name_en',
      header: t('common:labels.name'),
      sortable: true,
      render: (student) => (
        <div className="flex items-center gap-3">
          <Avatar name={student.fullName} src={student.profilePhoto} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--text)]">{student.fullName}</p>
            {student.fullNameKh ? (
              <p className="truncate font-khmer text-xs text-[var(--text-muted)]">
                {student.fullNameKh}
              </p>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: 'student_code',
      header: t('students:fields.studentCode'),
      sortable: true,
      hideOnMobile: true,
      render: (student) => (
        <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-xs">
          {student.studentCode}
        </code>
      ),
    },
    {
      key: 'class',
      header: t('students:fields.currentClass'),
      render: (student) =>
        student.currentEnrollment ? (
          <div>
            <p className="text-sm text-[var(--text)]">{student.currentEnrollment.className}</p>
            <p className="text-xs text-[var(--text-subtle)]">
              {student.currentEnrollment.gradeLevelName}
            </p>
          </div>
        ) : (
          <span className="text-[var(--text-subtle)]">{t('students:notEnrolled')}</span>
        ),
    },
    {
      key: 'date_of_birth',
      header: t('students:fields.age'),
      sortable: true,
      align: 'center',
      hideOnMobile: true,
      render: (student) => calculateAge(student.dateOfBirth) ?? '—',
    },
    {
      key: 'gender',
      header: t('common:labels.gender'),
      hideOnMobile: true,
      render: (student) => (student.gender ? t(`common:gender.${student.gender}`) : '—'),
    },
    {
      key: 'status',
      header: t('common:labels.status'),
      sortable: true,
      render: (student) => <StatusBadge kind="student" status={student.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (student) => (
        <RowActions
          label={student.fullName}
          items={[
            {
              key: 'view',
              label: t('common:actions.viewDetails'),
              icon: <Eye className="size-4" />,
              onSelect: () => navigate(ROUTES.studentDetail(student.id)),
            },
            ...(canUpdate
              ? [
                  {
                    key: 'edit',
                    label: t('common:actions.edit'),
                    icon: <Pencil className="size-4" />,
                    onSelect: () => {
                      setEditing(student);
                      setFormOpen(true);
                    },
                  },
                ]
              : []),
            ...(canArchive
              ? [
                  {
                    key: 'archive',
                    label: t('common:actions.archive'),
                    icon: <Archive className="size-4" />,
                    tone: 'danger' as const,
                    separatorBefore: true,
                    onSelect: () => setConfirmArchive(student),
                  },
                ]
              : []),
          ]}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('students:title')}
        description={t('students:subtitle')}
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              leftIcon={<Plus className="size-4" />}
            >
              {t('students:create')}
            </Button>
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
              className="w-36"
              value={list.query.filters.gradeLevelId ?? ''}
              onChange={(event) => list.setFilter('gradeLevelId', event.target.value)}
              placeholder={t('students:filters.grade')}
              options={options.gradeLevels.map((gradeLevel) => ({
                value: gradeLevel.id,
                label: gradeLevel.nameEn,
              }))}
            />

            <Select
              className="w-36"
              value={list.query.filters.classId ?? ''}
              onChange={(event) => list.setFilter('classId', event.target.value)}
              placeholder={t('students:filters.class')}
              options={classes.map((schoolClass) => ({
                value: schoolClass.id,
                label: schoolClass.name,
              }))}
            />

            <Select
              className="w-36"
              value={list.query.filters.status ?? ''}
              onChange={(event) => list.setFilter('status', event.target.value)}
              placeholder={t('students:filters.status')}
              options={STUDENT_STATUSES.map((status) => ({
                value: status,
                label: t(`students:status.${status}`),
              }))}
            />

            <Select
              className="w-32"
              value={list.query.filters.gender ?? ''}
              onChange={(event) => list.setFilter('gender', event.target.value)}
              placeholder={t('students:filters.gender')}
              options={GENDERS.map((gender) => ({
                value: gender,
                label: t(`common:gender.${gender}`),
              }))}
            />
          </>
        }
      />

      <DataTable<Student>
        columns={columns}
        rows={list.rows}
        rowKey={(student) => student.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={list.refresh}
        isFiltered={list.isFiltered}
        sort={{ sortBy: list.query.sortBy, sortOrder: list.query.sortOrder }}
        onSortChange={list.setSort}
        onRowClick={(student) => navigate(ROUTES.studentDetail(student.id))}
        emptyTitle={t('students:empty.title')}
        emptyMessage={t('students:empty.message')}
        emptyAction={
          canCreate ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              leftIcon={<Plus className="size-4" />}
            >
              {t('students:create')}
            </Button>
          ) : null
        }
        footer={
          <Pagination
            pagination={list.pagination}
            onPageChange={list.setPage}
            onLimitChange={list.setLimit}
          />
        }
      />

      <StudentFormModal
        open={isFormOpen}
        student={editing}
        onClose={() => setFormOpen(false)}
        onSaved={list.refresh}
      />

      <ConfirmDialog
        open={confirmArchive !== null}
        icon="archive"
        title={t('students:dialogs.archiveTitle')}
        message={t('students:dialogs.archiveMessage', { name: confirmArchive?.fullName ?? '' })}
        confirmLabel={t('common:actions.archive')}
        onCancel={() => setConfirmArchive(null)}
        onConfirm={async () => {
          if (confirmArchive) {
            const ok = await run(
              () => studentService.archive(confirmArchive.id),
              t('students:toast.archived'),
            );

            if (ok) {
              list.refresh();
            }
          }

          setConfirmArchive(null);
        }}
      />
    </div>
  );
};
