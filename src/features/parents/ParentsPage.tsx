import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Archive, Eye, Pencil, Plus } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { parentService } from '@/services/people.service';
import type { Parent } from '@/types/entities';
import { useListQuery } from '@/hooks/useListQuery';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Select } from '@/components/ui/Select';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { FilterBar } from '@/components/tables/FilterBar';
import { Pagination } from '@/components/tables/Pagination';
import { RowActions } from '@/components/tables/RowActions';
import { ParentFormModal } from './ParentFormModal';

export const ParentsPage = () => {
  const { t } = useTranslation(['students', 'common', 'users']);
  const navigate = useNavigate();
  const { has } = usePermission();
  const { run } = useMutation();

  const canCreate = has(PERMISSIONS.PARENTS_CREATE);
  const canUpdate = has(PERMISSIONS.PARENTS_UPDATE);
  const canArchive = has(PERMISSIONS.PARENTS_ARCHIVE);

  const [isFormOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Parent | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Parent | null>(null);

  const fetcher = useCallback(
    (query: {
      page: number;
      limit: number;
      search: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      filters: Record<string, string>;
    }) =>
      parentService.list({
        page: query.page,
        limit: query.limit,
        search: query.search || undefined,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        hasAccount: query.filters.hasAccount ? query.filters.hasAccount === 'true' : undefined,
      }),
    [],
  );

  const list = useListQuery<Parent>({
    fetcher,
    filterKeys: ['hasAccount'],
    defaultSortBy: 'first_name_en',
    defaultSortOrder: 'asc',
  });

  const columns: Column<Parent>[] = [
    {
      key: 'first_name_en',
      header: t('common:labels.name'),
      sortable: true,
      render: (parent) => (
        <div className="flex items-center gap-3">
          <Avatar name={parent.fullName} src={parent.profilePhoto} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--text)]">{parent.fullName}</p>
            <p className="truncate text-xs text-[var(--text-subtle)]">{parent.parentCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: t('common:labels.phone'),
      render: (parent) => (
        <div className="text-sm">
          <p className="text-[var(--text)]">{parent.phoneNumber ?? '—'}</p>
          {parent.email ? (
            <p className="text-xs text-[var(--text-subtle)]">{parent.email}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'occupation',
      header: t('students:guardians.relationship'),
      hideOnMobile: true,
      render: (parent) => parent.occupation ?? '—',
    },
    {
      key: 'children',
      header: t('students:title'),
      align: 'center',
      render: (parent) => (
        <Badge tone={parent.childrenCount > 0 ? 'primary' : 'neutral'} size="sm">
          {parent.childrenCount}
        </Badge>
      ),
    },
    {
      key: 'account',
      header: t('users:fields.username'),
      hideOnMobile: true,
      render: (parent) =>
        parent.username ? (
          <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-xs">
            {parent.username}
          </code>
        ) : (
          <span className="text-xs text-[var(--text-subtle)]">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (parent) => (
        <RowActions
          label={parent.fullName}
          items={[
            {
              key: 'view',
              label: t('common:actions.viewDetails'),
              icon: <Eye className="size-4" />,
              onSelect: () => navigate(ROUTES.parentDetail(parent.id)),
            },
            ...(canUpdate
              ? [
                  {
                    key: 'edit',
                    label: t('common:actions.edit'),
                    icon: <Pencil className="size-4" />,
                    onSelect: () => {
                      setEditing(parent);
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
                    onSelect: () => setConfirmArchive(parent),
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
        title={t('students:fields.guardians')}
        description={t('students:sections.guardianLinks')}
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              leftIcon={<Plus className="size-4" />}
            >
              {t('common:actions.create')}
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
          <Select
            className="w-44"
            value={list.query.filters.hasAccount ?? ''}
            onChange={(event) => list.setFilter('hasAccount', event.target.value)}
            placeholder={t('users:fields.account')}
            options={[
              { value: 'true', label: t('common:labels.yes') },
              { value: 'false', label: t('common:labels.no') },
            ]}
          />
        }
      />

      <DataTable<Parent>
        columns={columns}
        rows={list.rows}
        rowKey={(parent) => parent.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={list.refresh}
        isFiltered={list.isFiltered}
        sort={{ sortBy: list.query.sortBy, sortOrder: list.query.sortOrder }}
        onSortChange={list.setSort}
        onRowClick={(parent) => navigate(ROUTES.parentDetail(parent.id))}
        emptyTitle={t('students:guardians.empty')}
        footer={
          <Pagination
            pagination={list.pagination}
            onPageChange={list.setPage}
            onLimitChange={list.setLimit}
          />
        }
      />

      <ParentFormModal
        open={isFormOpen}
        parent={editing}
        onClose={() => setFormOpen(false)}
        onSaved={list.refresh}
      />

      <ConfirmDialog
        open={confirmArchive !== null}
        icon="archive"
        title={t('common:confirm.archiveTitle')}
        message={t('common:confirm.archiveMessage')}
        confirmLabel={t('common:actions.archive')}
        onCancel={() => setConfirmArchive(null)}
        onConfirm={async () => {
          if (confirmArchive) {
            const ok = await run(
              () => parentService.archive(confirmArchive.id),
              t('common:toast.archived'),
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
