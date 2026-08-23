import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { CalendarRange, CheckCircle2, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { academicYearService } from '@/services/academic.service';
import type { AcademicYearPayload } from '@/services/academic.service';
import { ApiError } from '@/types/api';
import type { AcademicYear } from '@/types/entities';
import { usePermission } from '@/hooks/usePermission';
import { useListQuery } from '@/hooks/useListQuery';
import { useLanguageStore } from '@/stores/language.store';
import { toast } from '@/stores/toast.store';
import { formatDate, formatNumber } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Dropdown } from '@/components/ui/Dropdown';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { FilterBar } from '@/components/tables/FilterBar';
import { Pagination } from '@/components/tables/Pagination';
import { MoreHorizontal } from 'lucide-react';

const buildSchema = (t: (key: string, options?: Record<string, unknown>) => string) =>
  z
    .object({
      name: z.string().trim().min(1, t('validation:required')).max(50),
      startDate: z.string().trim().min(1, t('validation:required')),
      endDate: z.string().trim().min(1, t('validation:required')),
      setActive: z.boolean().optional(),
    })
    .refine((value) => new Date(value.endDate) > new Date(value.startDate), {
      path: ['endDate'],
      message: t('validation:endAfterStart'),
    });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export const AcademicYearsPage = () => {
  const { t } = useTranslation(['academics', 'common', 'validation']);
  const language = useLanguageStore((state) => state.language);
  const { has } = usePermission();
  const canManage = has(PERMISSIONS.ACADEMIC_YEARS_MANAGE);
  const canClose = has(PERMISSIONS.ACADEMIC_YEARS_CLOSE);

  const [editing, setEditing] = useState<AcademicYear | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [confirmActivate, setConfirmActivate] = useState<AcademicYear | null>(null);
  const [confirmClose, setConfirmClose] = useState<AcademicYear | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AcademicYear | null>(null);

  const fetcher = useCallback(
    (query: { page: number; limit: number; search: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }) =>
      academicYearService.list({
        page: query.page,
        limit: query.limit,
        search: query.search || undefined,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
    [],
  );

  const list = useListQuery<AcademicYear>({
    fetcher,
    defaultSortBy: 'start_date',
    defaultSortOrder: 'desc',
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: { name: '', startDate: '', endDate: '', setActive: false },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: '', startDate: '', endDate: '', setActive: false });
    setFormOpen(true);
  };

  const openEdit = (year: AcademicYear) => {
    setEditing(year);
    form.reset({
      name: year.name,
      startDate: year.startDate,
      endDate: year.endDate,
      setActive: year.isActive,
    });
    setFormOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (editing) {
        await academicYearService.update(editing.id, {
          name: values.name,
          startDate: values.startDate,
          endDate: values.endDate,
        });
        toast.success(t('common:toast.updated'));
      } else {
        await academicYearService.create(values as AcademicYearPayload);
        toast.success(t('common:toast.created'));
      }

      setFormOpen(false);
      list.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.isValidationError) {
        for (const fieldError of error.fieldErrors) {
          form.setError(fieldError.field as keyof FormValues, { message: fieldError.message });
        }
        return;
      }

      toast.error(error instanceof ApiError ? error.message : t('common:toast.failed'));
    }
  });

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      await action();
      toast.success(successMessage);
      list.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('common:toast.failed'));
    }
  };

  const columns: Column<AcademicYear>[] = [
    {
      key: 'name',
      header: t('academics:academicYears.name'),
      sortable: true,
      render: (year) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--text)]">{year.name}</span>
          {year.isActive ? (
            <CheckCircle2 className="size-4 text-[var(--success)]" aria-hidden="true" />
          ) : null}
        </div>
      ),
    },
    {
      key: 'start_date',
      header: t('academics:academicYears.startDate'),
      sortable: true,
      hideOnMobile: true,
      render: (year) => formatDate(year.startDate, language),
    },
    {
      key: 'end_date',
      header: t('academics:academicYears.endDate'),
      sortable: true,
      hideOnMobile: true,
      render: (year) => formatDate(year.endDate, language),
    },
    {
      key: 'classes',
      header: t('academics:classes.title'),
      align: 'center',
      hideOnMobile: true,
      render: (year) => formatNumber(year.classCount, language),
    },
    {
      key: 'enrollments',
      header: t('academics:classes.enrolled'),
      align: 'center',
      hideOnMobile: true,
      render: (year) => formatNumber(year.enrollmentCount, language),
    },
    {
      key: 'status',
      header: t('common:labels.status'),
      sortable: true,
      render: (year) => <StatusBadge kind="academicYear" status={year.status} />,
    },
    {
      key: 'actions',
      header: t('common:labels.actions'),
      align: 'right',
      width: '64px',
      render: (year) => {
        if (!canManage && !canClose) {
          return null;
        }

        return (
          <Dropdown
            menuLabel={year.name}
            trigger={({ toggle }) => (
              <button
                type="button"
                onClick={toggle}
                aria-label={t('common:labels.actions')}
                className="rounded-md p-1.5 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              >
                <MoreHorizontal className="size-4" />
              </button>
            )}
            items={[
              ...(canManage && year.status !== 'CLOSED'
                ? [
                    {
                      key: 'edit',
                      label: t('common:actions.edit'),
                      icon: <Pencil className="size-4" />,
                      onSelect: () => openEdit(year),
                    },
                  ]
                : []),
              ...(canManage && !year.isActive && year.status !== 'CLOSED'
                ? [
                    {
                      key: 'activate',
                      label: t('academics:academicYears.setActive'),
                      icon: <CheckCircle2 className="size-4" />,
                      onSelect: () => setConfirmActivate(year),
                    },
                  ]
                : []),
              ...(canClose && year.status !== 'CLOSED'
                ? [
                    {
                      key: 'close',
                      label: t('academics:academicYears.close'),
                      icon: <Lock className="size-4" />,
                      onSelect: () => setConfirmClose(year),
                    },
                  ]
                : []),
              ...(canManage && year.classCount === 0 && year.enrollmentCount === 0
                ? [
                    {
                      key: 'delete',
                      label: t('common:actions.delete'),
                      icon: <Trash2 className="size-4" />,
                      tone: 'danger' as const,
                      separatorBefore: true,
                      onSelect: () => setConfirmDelete(year),
                    },
                  ]
                : []),
            ]}
          />
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('academics:academicYears.title')}
        description={t('academics:academicYears.subtitle')}
        actions={
          canManage ? (
            <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
              {t('academics:academicYears.create')}
            </Button>
          ) : null
        }
      />

      <FilterBar
        search={list.query.search}
        onSearchChange={list.setSearch}
        searchPlaceholder={t('academics:academicYears.name')}
        isFiltered={list.isFiltered}
        onClearFilters={list.clearFilters}
      />

      <DataTable<AcademicYear>
        columns={columns}
        rows={list.rows}
        rowKey={(year) => year.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={list.refresh}
        isFiltered={list.isFiltered}
        sort={{ sortBy: list.query.sortBy, sortOrder: list.query.sortOrder }}
        onSortChange={list.setSort}
        emptyTitle={t('academics:academicYears.empty.title')}
        emptyMessage={t('academics:academicYears.empty.message')}
        emptyAction={
          canManage ? (
            <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
              {t('academics:academicYears.create')}
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

      <Modal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        title={
          editing ? t('academics:academicYears.edit') : t('academics:academicYears.create')
        }
        closeLabel={t('common:actions.close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={onSubmit} isLoading={form.formState.isSubmitting}>
              {t('common:actions.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormField
            label={t('academics:academicYears.name')}
            error={form.formState.errors.name?.message}
            required
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                autoFocus
                placeholder={t('academics:academicYears.namePlaceholder')}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...form.register('name')}
              />
            )}
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label={t('academics:academicYears.startDate')}
              error={form.formState.errors.startDate?.message}
              required
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="date"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register('startDate')}
                />
              )}
            </FormField>

            <FormField
              label={t('academics:academicYears.endDate')}
              error={form.formState.errors.endDate?.message}
              required
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="date"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register('endDate')}
                />
              )}
            </FormField>
          </div>

          {!editing ? (
            <Checkbox
              id="setActive"
              label={t('academics:academicYears.setActive')}
              {...form.register('setActive')}
            />
          ) : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmActivate !== null}
        tone="info"
        icon="info"
        title={t('academics:academicYears.dialogs.setActiveTitle', {
          name: confirmActivate?.name ?? '',
        })}
        message={t('academics:academicYears.dialogs.setActiveMessage')}
        confirmLabel={t('academics:academicYears.setActive')}
        onCancel={() => setConfirmActivate(null)}
        onConfirm={async () => {
          if (confirmActivate) {
            await runAction(
              () => academicYearService.setActive(confirmActivate.id),
              t('common:toast.updated'),
            );
          }
          setConfirmActivate(null);
        }}
      />

      <ConfirmDialog
        open={confirmClose !== null}
        tone="warning"
        icon="warning"
        title={t('academics:academicYears.dialogs.closeTitle', { name: confirmClose?.name ?? '' })}
        message={t('academics:academicYears.dialogs.closeMessage')}
        confirmLabel={t('academics:academicYears.close')}
        onCancel={() => setConfirmClose(null)}
        onConfirm={async () => {
          if (confirmClose) {
            await runAction(
              () => academicYearService.close(confirmClose.id),
              t('common:toast.updated'),
            );
          }
          setConfirmClose(null);
        }}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        tone="danger"
        icon="delete"
        title={t('common:confirm.deleteTitle')}
        message={t('common:confirm.deleteMessage')}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) {
            await runAction(
              () => academicYearService.remove(confirmDelete.id),
              t('common:toast.deleted'),
            );
          }
          setConfirmDelete(null);
        }}
      />

      <p className="flex items-center gap-2 text-xs text-[var(--text-subtle)]">
        <CalendarRange className="size-3.5" aria-hidden="true" />
        {t('academics:academicYears.subtitle')}
      </p>
    </div>
  );
};
