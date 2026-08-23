import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Archive, Eye, Pencil, Plus } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { teacherService } from '@/services/people.service';
import { STAFF_STATUSES } from '@/types/domain';
import type { StaffStatus } from '@/types/domain';
import type { Teacher } from '@/types/entities';
import { useAcademicOptions } from '@/hooks/useAcademicOptions';
import { useListQuery } from '@/hooks/useListQuery';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { FilterBar } from '@/components/tables/FilterBar';
import { Pagination } from '@/components/tables/Pagination';
import { RowActions } from '@/components/tables/RowActions';
import { TeacherFormModal } from './TeacherFormModal';

export const TeachersPage = () => {
  const { t } = useTranslation(['teachers', 'common', 'academics']);
  const navigate = useNavigate();
  const { has } = usePermission();
  const { run } = useMutation();

  const canCreate = has(PERMISSIONS.TEACHERS_CREATE);
  const canUpdate = has(PERMISSIONS.TEACHERS_UPDATE);
  const canArchive = has(PERMISSIONS.TEACHERS_ARCHIVE);

  const options = useAcademicOptions({ years: false, gradeLevels: false, subjects: true });
  const [isFormOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Teacher | null>(null);

  const fetcher = useCallback(
    (query: {
      page: number;
      limit: number;
      search: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      filters: Record<string, string>;
    }) =>
      teacherService.list({
        page: query.page,
        limit: query.limit,
        search: query.search || undefined,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        status: (query.filters.status as StaffStatus) || undefined,
        subjectId: query.filters.subjectId ? Number(query.filters.subjectId) : undefined,
      }),
    [],
  );

  const list = useListQuery<Teacher>({
    fetcher,
    filterKeys: ['status', 'subjectId'],
    defaultSortBy: 'first_name_en',
    defaultSortOrder: 'asc',
  });

  const columns: Column<Teacher>[] = [
    {
      key: 'first_name_en',
      header: t('common:labels.name'),
      sortable: true,
      render: (teacher) => (
        <div className="flex items-center gap-3">
          <Avatar name={teacher.fullName} src={teacher.profilePhoto} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--text)]">{teacher.fullName}</p>
            <p className="truncate text-xs text-[var(--text-subtle)]">{teacher.teacherCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: t('teachers:fields.phoneNumber'),
      hideOnMobile: true,
      render: (teacher) => (
        <div className="text-sm">
          <p className="text-[var(--text)]">{teacher.phoneNumber ?? '—'}</p>
          <p className="text-xs text-[var(--text-subtle)]">{teacher.email ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'specialization',
      header: t('teachers:fields.specialization'),
      hideOnMobile: true,
      render: (teacher) => teacher.specialization ?? '—',
    },
    {
      key: 'classes',
      header: t('teachers:fields.classes'),
      align: 'center',
      render: (teacher) => (
        <div className="flex flex-col items-center gap-1">
          <span className="tabular-nums">{teacher.classCount}</span>
          {teacher.homeroomClassIds.length > 0 ? (
            <Badge tone="primary" size="sm">
              {t('teachers:assignments.homeroom')}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'account',
      header: t('teachers:fields.account'),
      hideOnMobile: true,
      render: (teacher) =>
        teacher.username ? (
          <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-xs">
            {teacher.username}
          </code>
        ) : (
          <span className="text-xs text-[var(--text-subtle)]">{t('teachers:account.none')}</span>
        ),
    },
    {
      key: 'status',
      header: t('common:labels.status'),
      sortable: true,
      render: (teacher) => <StatusBadge kind="staff" status={teacher.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (teacher) => (
        <RowActions
          label={teacher.fullName}
          items={[
            {
              key: 'view',
              label: t('common:actions.viewDetails'),
              icon: <Eye className="size-4" />,
              onSelect: () => navigate(ROUTES.teacherDetail(teacher.id)),
            },
            ...(canUpdate
              ? [
                  {
                    key: 'edit',
                    label: t('common:actions.edit'),
                    icon: <Pencil className="size-4" />,
                    onSelect: () => {
                      setEditing(teacher);
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
                    onSelect: () => setConfirmArchive(teacher),
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
        title={t('teachers:title')}
        description={t('teachers:subtitle')}
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              leftIcon={<Plus className="size-4" />}
            >
              {t('teachers:create')}
            </Button>
          ) : null
        }
      />

      <FilterBar
        search={list.query.search}
        onSearchChange={list.setSearch}
        searchPlaceholder={t('teachers:placeholders.search')}
        isFiltered={list.isFiltered}
        onClearFilters={list.clearFilters}
        filters={
          <>
            <Select
              className="w-40"
              value={list.query.filters.status ?? ''}
              onChange={(event) => list.setFilter('status', event.target.value)}
              placeholder={t('teachers:filters.status')}
              options={STAFF_STATUSES.map((status) => ({
                value: status,
                label: t(`teachers:status.${status}`),
              }))}
            />

            <Select
              className="w-44"
              value={list.query.filters.subjectId ?? ''}
              onChange={(event) => list.setFilter('subjectId', event.target.value)}
              placeholder={t('teachers:filters.subject')}
              options={options.subjects.map((subject) => ({
                value: subject.id,
                label: subject.nameEn,
              }))}
            />
          </>
        }
      />

      <DataTable<Teacher>
        columns={columns}
        rows={list.rows}
        rowKey={(teacher) => teacher.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={list.refresh}
        isFiltered={list.isFiltered}
        sort={{ sortBy: list.query.sortBy, sortOrder: list.query.sortOrder }}
        onSortChange={list.setSort}
        onRowClick={(teacher) => navigate(ROUTES.teacherDetail(teacher.id))}
        emptyTitle={t('teachers:empty.title')}
        emptyMessage={t('teachers:empty.message')}
        emptyAction={
          canCreate ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              leftIcon={<Plus className="size-4" />}
            >
              {t('teachers:create')}
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

      <TeacherFormModal
        open={isFormOpen}
        teacher={editing}
        onClose={() => setFormOpen(false)}
        onSaved={list.refresh}
      />

      <ConfirmDialog
        open={confirmArchive !== null}
        icon="archive"
        title={t('teachers:dialogs.archiveTitle')}
        message={t('teachers:dialogs.archiveMessage', { name: confirmArchive?.fullName ?? '' })}
        confirmLabel={t('common:actions.archive')}
        onCancel={() => setConfirmArchive(null)}
        onConfirm={async () => {
          if (confirmArchive) {
            const ok = await run(
              () => teacherService.archive(confirmArchive.id),
              t('teachers:toast.archived'),
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
