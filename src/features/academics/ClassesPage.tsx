import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Archive, Eye, Pencil, Plus } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { classService } from '@/services/academic.service';
import type { SchoolClass } from '@/types/entities';
import { ApiError } from '@/types/api';
import { useAcademicOptions } from '@/hooks/useAcademicOptions';
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
import { Select } from '@/components/ui/Select';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { FilterBar } from '@/components/tables/FilterBar';
import { Pagination } from '@/components/tables/Pagination';
import { RowActions } from '@/components/tables/RowActions';

const buildSchema = (t: (key: string) => string) =>
  z.object({
    academicYearId: z.coerce.number().int().positive(t('validation:selectOption')),
    gradeLevelId: z.coerce.number().int().positive(t('validation:selectOption')),
    code: z.string().trim().min(1, t('validation:required')).max(40),
    name: z.string().trim().min(1, t('validation:required')).max(100),
    homeroomTeacherId: z.string().optional(),
    roomId: z.string().optional(),
    capacity: z.coerce.number().int().positive().max(200),
    isActive: z.boolean().optional(),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export const ClassesPage = () => {
  const { t } = useTranslation(['academics', 'common', 'validation']);
  const navigate = useNavigate();
  const { has } = usePermission();
  const canManage = has(PERMISSIONS.CLASSES_MANAGE);
  const { run } = useMutation();

  const options = useAcademicOptions({ years: true, gradeLevels: true, rooms: true, teachers: true });

  const [isFormOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<SchoolClass | null>(null);

  const fetcher = useCallback(
    (query: {
      page: number;
      limit: number;
      search: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      filters: Record<string, string>;
    }) =>
      classService.list({
        page: query.page,
        limit: query.limit,
        search: query.search || undefined,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        academicYearId: query.filters.academicYearId
          ? Number(query.filters.academicYearId)
          : undefined,
        gradeLevelId: query.filters.gradeLevelId ? Number(query.filters.gradeLevelId) : undefined,
      }),
    [],
  );

  const list = useListQuery<SchoolClass>({
    fetcher,
    filterKeys: ['academicYearId', 'gradeLevelId'],
    defaultSortBy: 'grade_level',
    defaultSortOrder: 'asc',
  });

  // Default the year filter to the active academic year.
  useEffect(() => {
    if (options.activeYear && !list.query.filters.academicYearId) {
      list.setFilter('academicYearId', String(options.activeYear.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.activeYear]);

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: {
      academicYearId: 0,
      gradeLevelId: 0,
      code: '',
      name: '',
      homeroomTeacherId: '',
      roomId: '',
      capacity: 40,
      isActive: true,
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      academicYearId: options.activeYear?.id ?? 0,
      gradeLevelId: options.gradeLevels[0]?.id ?? 0,
      code: '',
      name: '',
      homeroomTeacherId: '',
      roomId: '',
      capacity: 40,
      isActive: true,
    });
    setFormOpen(true);
  };

  const openEdit = (schoolClass: SchoolClass) => {
    setEditing(schoolClass);
    form.reset({
      academicYearId: schoolClass.academicYearId,
      gradeLevelId: schoolClass.gradeLevelId,
      code: schoolClass.code,
      name: schoolClass.name,
      homeroomTeacherId: schoolClass.homeroomTeacherId
        ? String(schoolClass.homeroomTeacherId)
        : '',
      roomId: schoolClass.roomId ? String(schoolClass.roomId) : '',
      capacity: schoolClass.capacity,
      isActive: schoolClass.isActive,
    });
    setFormOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      gradeLevelId: values.gradeLevelId,
      code: values.code,
      name: values.name,
      homeroomTeacherId: values.homeroomTeacherId ? Number(values.homeroomTeacherId) : null,
      roomId: values.roomId ? Number(values.roomId) : null,
      capacity: values.capacity,
      isActive: values.isActive,
    };

    try {
      if (editing) {
        await classService.update(editing.id, payload);
      } else {
        await classService.create({ ...payload, academicYearId: values.academicYearId });
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

  const columns: Column<SchoolClass>[] = [
    {
      key: 'name',
      header: t('academics:classes.name'),
      sortable: true,
      render: (schoolClass) => (
        <div>
          <p className="font-medium text-[var(--text)]">{schoolClass.name}</p>
          <p className="text-xs text-[var(--text-subtle)]">{schoolClass.gradeLevelName}</p>
        </div>
      ),
    },
    {
      key: 'homeroom',
      header: t('academics:classes.homeroomTeacher'),
      hideOnMobile: true,
      render: (schoolClass) =>
        schoolClass.homeroomTeacherName ?? (
          <span className="text-[var(--text-subtle)]">—</span>
        ),
    },
    {
      key: 'room',
      header: t('academics:classes.room'),
      hideOnMobile: true,
      render: (schoolClass) => schoolClass.roomName ?? '—',
    },
    {
      key: 'enrolled',
      header: t('academics:classes.enrolled'),
      align: 'center',
      render: (schoolClass) => (
        <div className="flex flex-col items-center gap-1">
          <span className="tabular-nums text-[var(--text)]">
            {schoolClass.enrolledCount} / {schoolClass.capacity}
          </span>
          {schoolClass.availableSeats === 0 ? (
            <Badge tone="warning" size="sm">
              {t('academics:classes.full')}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'subjects',
      header: t('academics:subjects.title'),
      align: 'center',
      hideOnMobile: true,
      render: (schoolClass) => schoolClass.subjectCount,
    },
    {
      key: 'year',
      header: t('academics:classes.academicYear'),
      hideOnMobile: true,
      render: (schoolClass) => (
        <span className="text-[var(--text-muted)]">{schoolClass.academicYearName}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (schoolClass) => (
        <RowActions
          label={schoolClass.name}
          items={[
            {
              key: 'view',
              label: t('common:actions.viewDetails'),
              icon: <Eye className="size-4" />,
              onSelect: () => navigate(ROUTES.classDetail(schoolClass.id)),
            },
            ...(canManage && schoolClass.academicYearStatus !== 'CLOSED'
              ? [
                  {
                    key: 'edit',
                    label: t('common:actions.edit'),
                    icon: <Pencil className="size-4" />,
                    onSelect: () => openEdit(schoolClass),
                  },
                  {
                    key: 'archive',
                    label: t('common:actions.archive'),
                    icon: <Archive className="size-4" />,
                    tone: 'danger' as const,
                    separatorBefore: true,
                    disabled: schoolClass.enrolledCount > 0,
                    onSelect: () => setConfirmArchive(schoolClass),
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
        title={t('academics:classes.title')}
        description={t('academics:classes.subtitle')}
        actions={
          canManage ? (
            <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
              {t('academics:classes.create')}
            </Button>
          ) : null
        }
      />

      <FilterBar
        search={list.query.search}
        onSearchChange={list.setSearch}
        searchPlaceholder={t('academics:classes.title')}
        isFiltered={list.isFiltered}
        onClearFilters={list.clearFilters}
        filters={
          <>
            <Select
              className="w-44"
              value={list.query.filters.academicYearId ?? ''}
              onChange={(event) => list.setFilter('academicYearId', event.target.value)}
              placeholder={t('academics:classes.academicYear')}
              options={options.academicYears.map((year) => ({
                value: year.id,
                label: year.name,
              }))}
            />

            <Select
              className="w-40"
              value={list.query.filters.gradeLevelId ?? ''}
              onChange={(event) => list.setFilter('gradeLevelId', event.target.value)}
              placeholder={t('academics:classes.gradeLevel')}
              options={options.gradeLevels.map((gradeLevel) => ({
                value: gradeLevel.id,
                label: gradeLevel.nameEn,
              }))}
            />
          </>
        }
      />

      <DataTable<SchoolClass>
        columns={columns}
        rows={list.rows}
        rowKey={(schoolClass) => schoolClass.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={list.refresh}
        isFiltered={list.isFiltered}
        sort={{ sortBy: list.query.sortBy, sortOrder: list.query.sortOrder }}
        onSortChange={list.setSort}
        onRowClick={(schoolClass) => navigate(ROUTES.classDetail(schoolClass.id))}
        emptyTitle={t('academics:classes.empty.title')}
        emptyMessage={t('academics:classes.empty.message')}
        emptyAction={
          canManage ? (
            <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
              {t('academics:classes.create')}
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
        title={editing ? t('academics:classes.edit') : t('academics:classes.create')}
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
              label={t('academics:classes.academicYear')}
              error={form.formState.errors.academicYearId?.message}
              required
            >
              {({ id }) => (
                <Select
                  id={id}
                  disabled={Boolean(editing)}
                  options={options.academicYears.map((year) => ({
                    value: year.id,
                    label: year.name,
                  }))}
                  {...form.register('academicYearId')}
                />
              )}
            </FormField>

            <FormField
              label={t('academics:classes.gradeLevel')}
              error={form.formState.errors.gradeLevelId?.message}
              required
            >
              {({ id }) => (
                <Select
                  id={id}
                  options={options.gradeLevels.map((gradeLevel) => ({
                    value: gradeLevel.id,
                    label: gradeLevel.nameEn,
                  }))}
                  {...form.register('gradeLevelId')}
                />
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label={t('common:labels.code')}
              error={form.formState.errors.code?.message}
              required
            >
              {({ id }) => <Input id={id} autoFocus placeholder="4A" {...form.register('code')} />}
            </FormField>

            <FormField
              label={t('academics:classes.name')}
              error={form.formState.errors.name?.message}
              required
            >
              {({ id }) => (
                <Input
                  id={id}
                  placeholder={t('academics:classes.namePlaceholder')}
                  {...form.register('name')}
                />
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label={t('academics:classes.homeroomTeacher')}
              optionalLabel={t('common:labels.optional')}
            >
              {({ id }) => (
                <Select
                  id={id}
                  placeholder={t('academics:subjects.noTeacher')}
                  options={options.teachers.map((teacher) => ({
                    value: teacher.id,
                    label: teacher.fullName,
                  }))}
                  {...form.register('homeroomTeacherId')}
                />
              )}
            </FormField>

            <FormField
              label={t('academics:classes.room')}
              optionalLabel={t('common:labels.optional')}
            >
              {({ id }) => (
                <Select
                  id={id}
                  placeholder={t('academics:rooms.title')}
                  options={options.rooms.map((room) => ({ value: room.id, label: room.name }))}
                  {...form.register('roomId')}
                />
              )}
            </FormField>
          </div>

          <FormField
            label={t('academics:classes.capacity')}
            error={form.formState.errors.capacity?.message}
            required
          >
            {({ id }) => <Input id={id} type="number" min={1} {...form.register('capacity')} />}
          </FormField>

          <Checkbox
            id="classActive"
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
              () => classService.archive(confirmArchive.id),
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
