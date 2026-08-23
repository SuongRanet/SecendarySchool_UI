import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Archive, Pencil, Plus } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { roomService } from '@/services/academic.service';
import type { Room } from '@/types/entities';
import { ApiError } from '@/types/api';
import { useListQuery } from '@/hooks/useListQuery';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { FilterBar } from '@/components/tables/FilterBar';
import { Pagination } from '@/components/tables/Pagination';
import { RowActions } from '@/components/tables/RowActions';

const buildSchema = (t: (key: string) => string) =>
  z.object({
    code: z.string().trim().min(1, t('validation:required')).max(30),
    name: z.string().trim().min(1, t('validation:required')).max(100),
    building: z.string().trim().max(100).optional(),
    floor: z.string().trim().max(30).optional(),
    capacity: z.union([z.coerce.number().int().positive().max(1000), z.literal('')]).optional(),
    isActive: z.boolean().optional(),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export const RoomsPage = () => {
  const { t } = useTranslation(['academics', 'common', 'validation']);
  const { has } = usePermission();
  const canManage = has(PERMISSIONS.ROOMS_MANAGE);
  const { run } = useMutation();

  const [editing, setEditing] = useState<Room | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<Room | null>(null);

  const fetcher = useCallback(
    (query: { page: number; limit: number; search: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }) =>
      roomService.list({
        page: query.page,
        limit: query.limit,
        search: query.search || undefined,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
    [],
  );

  const list = useListQuery<Room>({ fetcher, defaultSortBy: 'code', defaultSortOrder: 'asc' });

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: { code: '', name: '', building: '', floor: '', capacity: '', isActive: true },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ code: '', name: '', building: '', floor: '', capacity: '', isActive: true });
    setFormOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditing(room);
    form.reset({
      code: room.code,
      name: room.name,
      building: room.building ?? '',
      floor: room.floor ?? '',
      capacity: room.capacity ?? '',
      isActive: room.isActive,
    });
    setFormOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      code: values.code,
      name: values.name,
      building: values.building || null,
      floor: values.floor || null,
      capacity: values.capacity === '' || values.capacity === undefined ? null : Number(values.capacity),
      isActive: values.isActive,
    };

    try {
      if (editing) {
        await roomService.update(editing.id, payload);
      } else {
        await roomService.create(payload);
      }

      setFormOpen(false);
      list.refresh();
    } catch (caught) {
      if (caught instanceof ApiError && caught.isValidationError) {
        for (const fieldError of caught.fieldErrors) {
          form.setError(fieldError.field as keyof FormValues, { message: fieldError.message });
        }
        return;
      }

      throw caught;
    }
  });

  const columns: Column<Room>[] = [
    {
      key: 'code',
      header: t('common:labels.code'),
      sortable: true,
      render: (room) => (
        <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-xs">{room.code}</code>
      ),
    },
    {
      key: 'name',
      header: t('common:labels.name'),
      sortable: true,
      render: (room) => <span className="font-medium text-[var(--text)]">{room.name}</span>,
    },
    {
      key: 'building',
      header: t('academics:rooms.building'),
      sortable: true,
      hideOnMobile: true,
      render: (room) => room.building ?? '—',
    },
    {
      key: 'floor',
      header: t('academics:rooms.floor'),
      hideOnMobile: true,
      render: (room) => room.floor ?? '—',
    },
    {
      key: 'capacity',
      header: t('academics:rooms.capacity'),
      sortable: true,
      align: 'center',
      render: (room) => room.capacity ?? '—',
    },
    {
      key: 'status',
      header: t('common:labels.status'),
      render: (room) => (
        <Badge tone={room.isActive ? 'success' : 'neutral'} dot>
          {room.isActive ? t('common:labels.yes') : t('common:labels.no')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (room) => (
        <RowActions
          label={room.name}
          items={
            canManage
              ? [
                  {
                    key: 'edit',
                    label: t('common:actions.edit'),
                    icon: <Pencil className="size-4" />,
                    onSelect: () => openEdit(room),
                  },
                  {
                    key: 'archive',
                    label: t('common:actions.archive'),
                    icon: <Archive className="size-4" />,
                    tone: 'danger',
                    separatorBefore: true,
                    disabled: room.scheduleCount > 0,
                    onSelect: () => setConfirmArchive(room),
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
        title={t('academics:rooms.title')}
        description={t('academics:rooms.subtitle')}
        actions={
          canManage ? (
            <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
              {t('academics:rooms.create')}
            </Button>
          ) : null
        }
      />

      <FilterBar
        search={list.query.search}
        onSearchChange={list.setSearch}
        searchPlaceholder={t('academics:rooms.title')}
        isFiltered={list.isFiltered}
        onClearFilters={list.clearFilters}
      />

      <DataTable<Room>
        columns={columns}
        rows={list.rows}
        rowKey={(room) => room.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={list.refresh}
        isFiltered={list.isFiltered}
        sort={{ sortBy: list.query.sortBy, sortOrder: list.query.sortOrder }}
        onSortChange={list.setSort}
        emptyTitle={t('academics:rooms.empty.title')}
        emptyMessage={t('academics:rooms.empty.message')}
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
        title={editing ? t('academics:rooms.edit') : t('academics:rooms.create')}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label={t('common:labels.code')}
              error={form.formState.errors.code?.message}
              required
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  autoFocus
                  placeholder="R101"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register('code')}
                />
              )}
            </FormField>

            <FormField
              label={t('common:labels.name')}
              error={form.formState.errors.name?.message}
              required
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  placeholder="Room 101"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register('name')}
                />
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              label={t('academics:rooms.building')}
              optionalLabel={t('common:labels.optional')}
            >
              {({ id }) => <Input id={id} {...form.register('building')} />}
            </FormField>

            <FormField
              label={t('academics:rooms.floor')}
              optionalLabel={t('common:labels.optional')}
            >
              {({ id }) => <Input id={id} {...form.register('floor')} />}
            </FormField>

            <FormField
              label={t('academics:rooms.capacity')}
              error={form.formState.errors.capacity?.message}
              optionalLabel={t('common:labels.optional')}
            >
              {({ id }) => <Input id={id} type="number" min={1} {...form.register('capacity')} />}
            </FormField>
          </div>

          <Checkbox
            id="roomActive"
            label={t('academics:gradeLevels.active')}
            {...form.register('isActive')}
          />
        </form>
      </Modal>

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
              () => roomService.archive(confirmArchive.id),
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
