import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';
import { auditService } from '@/services/admin.service';
import type { AuditLogEntry } from '@/types/entities';
import { useListQuery } from '@/hooks/useListQuery';
import { useLanguageStore } from '@/stores/language.store';
import { formatDateTime } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { FilterBar } from '@/components/tables/FilterBar';
import { Pagination } from '@/components/tables/Pagination';

const ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'ARCHIVE',
  'RESTORE',
  'LOGIN',
  'LOGOUT',
  'PASSWORD_RESET',
  'PUBLISH',
  'ASSIGN',
  'UNASSIGN',
] as const;

const ACTION_TONES: Record<string, 'success' | 'primary' | 'danger' | 'warning' | 'neutral' | 'info'> =
  {
    CREATE: 'success',
    UPDATE: 'primary',
    DELETE: 'danger',
    ARCHIVE: 'warning',
    RESTORE: 'info',
    LOGIN: 'neutral',
    LOGOUT: 'neutral',
    PASSWORD_RESET: 'warning',
    PUBLISH: 'success',
    ASSIGN: 'info',
    UNASSIGN: 'warning',
  };

export const AuditLogsPage = () => {
  const { t } = useTranslation(['system', 'common']);
  const language = useLanguageStore((state) => state.language);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  const fetcher = useCallback(
    (query: { page: number; limit: number; search: string; filters: Record<string, string> }) =>
      auditService.list({
        page: query.page,
        limit: query.limit,
        search: query.search || undefined,
        action: query.filters.action || undefined,
        entityType: query.filters.entityType || undefined,
        dateFrom: query.filters.dateFrom || undefined,
        dateTo: query.filters.dateTo || undefined,
      }),
    [],
  );

  const list = useListQuery<AuditLogEntry>({
    fetcher,
    filterKeys: ['action', 'entityType', 'dateFrom', 'dateTo'],
    defaultSortBy: 'created_at',
  });

  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'created_at',
      header: t('system:auditLogs.fields.when'),
      sortable: true,
      render: (entry) => (
        <span className="text-xs tabular-nums text-[var(--text-muted)]">
          {formatDateTime(entry.createdAt, language)}
        </span>
      ),
    },
    {
      key: 'user',
      header: t('system:auditLogs.fields.user'),
      render: (entry) => entry.username ?? <span className="text-[var(--text-subtle)]">—</span>,
    },
    {
      key: 'action',
      header: t('system:auditLogs.fields.action'),
      sortable: true,
      render: (entry) => (
        <Badge tone={ACTION_TONES[entry.action] ?? 'neutral'} size="sm">
          {t(`system:auditLogs.action.${entry.action}`, { defaultValue: entry.action })}
        </Badge>
      ),
    },
    {
      key: 'entity_type',
      header: t('system:auditLogs.fields.entity'),
      sortable: true,
      hideOnMobile: true,
      render: (entry) => (
        <span className="text-xs text-[var(--text-muted)]">
          {entry.entityType.replace(/_/g, ' ')}
          {entry.entityId ? ` #${entry.entityId}` : ''}
        </span>
      ),
    },
    {
      key: 'description',
      header: t('system:auditLogs.fields.description'),
      render: (entry) => (
        <span className="text-sm text-[var(--text)]">{entry.description ?? '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (entry) =>
        entry.oldValue || entry.newValue ? (
          <button
            type="button"
            onClick={() => setSelected(entry)}
            aria-label={t('system:auditLogs.viewChanges')}
            className="rounded-md p-1.5 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            <Eye className="size-4" />
          </button>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('system:auditLogs.title')}
        description={t('system:auditLogs.subtitle')}
      />

      <FilterBar
        search={list.query.search}
        onSearchChange={list.setSearch}
        searchPlaceholder={t('system:auditLogs.fields.description')}
        isFiltered={list.isFiltered}
        onClearFilters={list.clearFilters}
        filters={
          <>
            <Select
              className="w-40"
              value={list.query.filters.action ?? ''}
              onChange={(event) => list.setFilter('action', event.target.value)}
              placeholder={t('system:auditLogs.filters.action')}
              options={ACTIONS.map((action) => ({
                value: action,
                label: t(`system:auditLogs.action.${action}`),
              }))}
            />

            <Input
              className="w-40"
              type="date"
              value={list.query.filters.dateFrom ?? ''}
              onChange={(event) => list.setFilter('dateFrom', event.target.value)}
              aria-label={t('system:auditLogs.filters.dateFrom')}
            />

            <Input
              className="w-40"
              type="date"
              value={list.query.filters.dateTo ?? ''}
              onChange={(event) => list.setFilter('dateTo', event.target.value)}
              aria-label={t('system:auditLogs.filters.dateTo')}
            />
          </>
        }
      />

      <DataTable<AuditLogEntry>
        columns={columns}
        rows={list.rows}
        rowKey={(entry) => entry.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={list.refresh}
        isFiltered={list.isFiltered}
        sort={{ sortBy: list.query.sortBy, sortOrder: list.query.sortOrder }}
        onSortChange={list.setSort}
        emptyTitle={t('system:auditLogs.empty.title')}
        emptyMessage={t('system:auditLogs.empty.message')}
        footer={
          <Pagination
            pagination={list.pagination}
            onPageChange={list.setPage}
            onLimitChange={list.setLimit}
          />
        }
      />

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        size="lg"
        title={t('system:auditLogs.fields.changes')}
        description={selected?.description ?? undefined}
        closeLabel={t('common:actions.close')}
        footer={
          <Button variant="secondary" onClick={() => setSelected(null)}>
            {t('common:actions.close')}
          </Button>
        }
      >
        {!selected?.oldValue && !selected?.newValue ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">
            {t('system:auditLogs.noChanges')}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {t('system:auditLogs.before')}
              </p>
              <pre className="overflow-x-auto rounded-lg bg-[var(--surface-muted)] p-3 text-xs text-[var(--text)]">
                {JSON.stringify(selected?.oldValue ?? {}, null, 2)}
              </pre>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {t('system:auditLogs.after')}
              </p>
              <pre className="overflow-x-auto rounded-lg bg-[var(--surface-muted)] p-3 text-xs text-[var(--text)]">
                {JSON.stringify(selected?.newValue ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
