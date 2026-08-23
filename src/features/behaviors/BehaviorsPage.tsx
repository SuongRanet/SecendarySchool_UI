import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Archive, Pencil, Plus } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { behaviorService } from '@/services/engagement.service';
import { studentService } from '@/services/people.service';
import { ApiError } from '@/types/api';
import { BEHAVIOR_TYPES } from '@/types/domain';
import type { BehaviorType } from '@/types/domain';
import type { Behavior, Student } from '@/types/entities';
import { useAcademicOptions, useClassOptions } from '@/hooks/useAcademicOptions';
import { useListQuery } from '@/hooks/useListQuery';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { useLanguageStore } from '@/stores/language.store';
import { toast } from '@/stores/toast.store';
import { formatDate, todayIso } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select, Textarea } from '@/components/ui/Select';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { FilterBar } from '@/components/tables/FilterBar';
import { Pagination } from '@/components/tables/Pagination';
import { RowActions } from '@/components/tables/RowActions';

const POSITIVE_TYPES: BehaviorType[] = [
  'ACHIEVEMENT',
  'POSITIVE',
  'PARTICIPATION',
  'TEAMWORK',
  'RESPONSIBILITY',
  'COMMUNICATION',
];

const toneFor = (type: BehaviorType) =>
  type === 'WARNING' ? 'warning' : type === 'DISCIPLINARY' ? 'danger' : 'success';

const buildSchema = (t: (key: string) => string) =>
  z.object({
    studentId: z.string().min(1, t('validation:selectOption')),
    classId: z.string().optional(),
    type: z.enum(BEHAVIOR_TYPES),
    title: z.string().trim().min(1, t('validation:required')).max(200),
    description: z.string().trim().max(2000).optional(),
    occurredOn: z.string().min(1, t('validation:required')),
    points: z.coerce.number().int().min(-100).max(100),
    actionTaken: z.string().trim().max(1000).optional(),
    visibleToParent: z.boolean().optional(),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export const BehaviorsPage = () => {
  const { t } = useTranslation(['communication', 'common', 'students', 'validation']);
  const language = useLanguageStore((state) => state.language);
  const { has } = usePermission();
  const canManage = has(PERMISSIONS.BEHAVIORS_MANAGE);
  const { run } = useMutation();

  const options = useAcademicOptions({ years: true, gradeLevels: false });
  const { classes } = useClassOptions(options.activeYear?.id);

  const [isFormOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Behavior | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<Student[]>([]);
  const [confirmArchive, setConfirmArchive] = useState<Behavior | null>(null);

  const fetcher = useCallback(
    (query: { page: number; limit: number; search: string; filters: Record<string, string> }) =>
      behaviorService.list({
        page: query.page,
        limit: query.limit,
        search: query.search || undefined,
        classId: query.filters.classId ? Number(query.filters.classId) : undefined,
        type: (query.filters.type as BehaviorType) || undefined,
      }),
    [],
  );

  const list = useListQuery<Behavior>({ fetcher, filterKeys: ['classId', 'type'] });

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: { type: 'ACHIEVEMENT', points: 1, visibleToParent: true },
  });

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

  const openCreate = () => {
    setEditing(null);
    setStudentSearch('');
    setStudentResults([]);
    form.reset({
      studentId: '',
      classId: list.query.filters.classId ?? '',
      type: 'ACHIEVEMENT',
      title: '',
      description: '',
      occurredOn: todayIso(),
      points: 1,
      actionTaken: '',
      visibleToParent: true,
    });
    setFormOpen(true);
  };

  const openEdit = (behavior: Behavior) => {
    setEditing(behavior);
    form.reset({
      studentId: String(behavior.studentId),
      classId: behavior.classId ? String(behavior.classId) : '',
      type: behavior.type,
      title: behavior.title,
      description: behavior.description ?? '',
      occurredOn: behavior.occurredOn,
      points: behavior.points,
      actionTaken: behavior.actionTaken ?? '',
      visibleToParent: behavior.visibleToParent,
    });
    setFormOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      classId: values.classId ? Number(values.classId) : null,
      type: values.type,
      title: values.title,
      description: values.description || null,
      occurredOn: values.occurredOn,
      points: values.points,
      actionTaken: values.actionTaken || null,
      visibleToParent: values.visibleToParent,
    };

    try {
      if (editing) {
        await behaviorService.update(editing.id, payload);
        toast.success(t('communication:behaviors.toast.updated'));
      } else {
        await behaviorService.create({ ...payload, studentId: Number(values.studentId) });
        toast.success(t('communication:behaviors.toast.created'));
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

      toast.error(caught instanceof ApiError ? caught.message : t('common:toast.failed'));
    }
  });

  const columns: Column<Behavior>[] = [
    {
      key: 'date',
      header: t('common:labels.date'),
      render: (behavior) => formatDate(behavior.occurredOn, language),
    },
    {
      key: 'student',
      header: t('communication:behaviors.fields.student'),
      render: (behavior) => (
        <Link
          to={ROUTES.studentDetail(behavior.studentId)}
          className="hover:text-[var(--primary)]"
        >
          <p className="font-medium">{behavior.studentName}</p>
          <p className="text-xs text-[var(--text-subtle)]">
            {behavior.studentCode}
            {behavior.className ? ` · ${behavior.className}` : ''}
          </p>
        </Link>
      ),
    },
    {
      key: 'type',
      header: t('communication:behaviors.fields.type'),
      render: (behavior) => (
        <Badge tone={toneFor(behavior.type)} size="sm">
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
      key: 'points',
      header: t('communication:behaviors.fields.points'),
      align: 'center',
      hideOnMobile: true,
      render: (behavior) => (
        <span
          className={
            behavior.points > 0
              ? 'font-medium text-[var(--success)]'
              : behavior.points < 0
                ? 'font-medium text-[var(--danger)]'
                : 'text-[var(--text-muted)]'
          }
        >
          {behavior.points > 0 ? `+${behavior.points}` : behavior.points}
        </span>
      ),
    },
    {
      key: 'visible',
      header: t('communication:behaviors.fields.visibleToParent'),
      align: 'center',
      hideOnMobile: true,
      render: (behavior) => (
        <Badge tone={behavior.visibleToParent ? 'info' : 'neutral'} size="sm">
          {behavior.visibleToParent ? t('common:labels.yes') : t('common:labels.no')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (behavior) => (
        <RowActions
          label={behavior.title}
          items={
            canManage
              ? [
                  {
                    key: 'edit',
                    label: t('common:actions.edit'),
                    icon: <Pencil className="size-4" />,
                    onSelect: () => openEdit(behavior),
                  },
                  {
                    key: 'archive',
                    label: t('common:actions.archive'),
                    icon: <Archive className="size-4" />,
                    tone: 'danger',
                    separatorBefore: true,
                    onSelect: () => setConfirmArchive(behavior),
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
        title={t('communication:behaviors.title')}
        description={t('communication:behaviors.subtitle')}
        actions={
          canManage ? (
            <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
              {t('communication:behaviors.create')}
            </Button>
          ) : null
        }
      />

      <FilterBar
        search={list.query.search}
        onSearchChange={list.setSearch}
        searchPlaceholder={t('communication:behaviors.fields.title')}
        isFiltered={list.isFiltered}
        onClearFilters={list.clearFilters}
        filters={
          <>
            <Select
              className="w-40"
              value={list.query.filters.classId ?? ''}
              onChange={(event) => list.setFilter('classId', event.target.value)}
              placeholder={t('students:filters.class')}
              options={classes.map((schoolClass) => ({
                value: schoolClass.id,
                label: schoolClass.name,
              }))}
            />

            <Select
              className="w-44"
              value={list.query.filters.type ?? ''}
              onChange={(event) => list.setFilter('type', event.target.value)}
              placeholder={t('communication:behaviors.fields.type')}
              options={BEHAVIOR_TYPES.map((type) => ({
                value: type,
                label: t(`communication:behaviors.type.${type}`),
              }))}
            />
          </>
        }
      />

      <DataTable<Behavior>
        columns={columns}
        rows={list.rows}
        rowKey={(behavior) => behavior.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={list.refresh}
        isFiltered={list.isFiltered}
        emptyTitle={t('communication:behaviors.empty.title')}
        emptyMessage={t('communication:behaviors.empty.message')}
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
        size="lg"
        title={editing ? t('communication:behaviors.edit') : t('communication:behaviors.create')}
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
          {!editing ? (
            <>
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

              <FormField
                label={t('communication:behaviors.fields.student')}
                error={form.formState.errors.studentId?.message}
                required
              >
                {({ id }) => (
                  <Select
                    id={id}
                    placeholder={t('common:actions.select')}
                    options={studentResults.map((student) => ({
                      value: student.id,
                      label: `${student.fullName} · ${student.studentCode}`,
                    }))}
                    {...form.register('studentId')}
                  />
                )}
              </FormField>
            </>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label={t('communication:behaviors.fields.type')} required>
              {({ id }) => (
                <Select
                  id={id}
                  options={BEHAVIOR_TYPES.map((type) => ({
                    value: type,
                    label: t(`communication:behaviors.type.${type}`),
                  }))}
                  {...form.register('type', {
                    onChange: (event) => {
                      const type = event.target.value as BehaviorType;
                      form.setValue('points', POSITIVE_TYPES.includes(type) ? 1 : -1);
                    },
                  })}
                />
              )}
            </FormField>

            <FormField label={t('communication:behaviors.fields.occurredOn')} required>
              {({ id }) => <Input id={id} type="date" {...form.register('occurredOn')} />}
            </FormField>

            <FormField label={t('communication:behaviors.fields.points')}>
              {({ id }) => <Input id={id} type="number" {...form.register('points')} />}
            </FormField>
          </div>

          <FormField
            label={t('communication:behaviors.fields.title')}
            error={form.formState.errors.title?.message}
            required
          >
            {({ id }) => <Input id={id} {...form.register('title')} />}
          </FormField>

          <FormField label={t('communication:behaviors.fields.description')}>
            {({ id }) => <Textarea id={id} rows={3} {...form.register('description')} />}
          </FormField>

          <FormField label={t('communication:behaviors.fields.actionTaken')}>
            {({ id }) => <Textarea id={id} rows={2} {...form.register('actionTaken')} />}
          </FormField>

          <Checkbox
            id="behaviorVisible"
            label={t('communication:behaviors.fields.visibleToParent')}
            {...form.register('visibleToParent')}
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
              () => behaviorService.archive(confirmArchive.id),
              t('communication:behaviors.toast.archived'),
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
