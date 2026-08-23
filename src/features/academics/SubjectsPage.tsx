import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Archive, Pencil, Plus } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { gradeLevelService, subjectService } from '@/services/academic.service';
import type { GradeLevel, Subject } from '@/types/entities';
import { ApiError } from '@/types/api';
import { useListQuery } from '@/hooks/useListQuery';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { useLanguageStore } from '@/stores/language.store';
import { formatNumber } from '@/utils/format';
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

const buildSchema = (t: (key: string) => string) =>
  z.object({
    code: z.string().trim().min(1, t('validation:required')).max(30),
    nameEn: z.string().trim().min(1, t('validation:required')).max(120),
    nameKh: z.string().trim().max(120).optional(),
    description: z.string().trim().max(500).optional(),
    isActive: z.boolean().optional(),
    gradeLevelIds: z.array(z.number()).optional(),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export const SubjectsPage = () => {
  const { t } = useTranslation(['academics', 'common', 'validation']);
  const language = useLanguageStore((state) => state.language);
  const { has } = usePermission();
  const canManage = has(PERMISSIONS.SUBJECTS_MANAGE);
  const { run } = useMutation();

  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<Subject | null>(null);
  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);

  useEffect(() => {
    gradeLevelService
      .list({ isActive: true })
      .then(setGradeLevels)
      .catch(() => setGradeLevels([]));
  }, []);

  const fetcher = useCallback(
    (query: {
      page: number;
      limit: number;
      search: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      filters: Record<string, string>;
    }) =>
      subjectService.list({
        page: query.page,
        limit: query.limit,
        search: query.search || undefined,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        gradeLevelId: query.filters.gradeLevelId ? Number(query.filters.gradeLevelId) : undefined,
        isActive: query.filters.isActive ? query.filters.isActive === 'true' : undefined,
      }),
    [],
  );

  const list = useListQuery<Subject>({
    fetcher,
    filterKeys: ['gradeLevelId', 'isActive'],
    defaultSortBy: 'name_en',
    defaultSortOrder: 'asc',
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: { code: '', nameEn: '', nameKh: '', description: '', isActive: true },
  });

  const openCreate = () => {
    setEditing(null);
    setSelectedGrades(gradeLevels.map((gradeLevel) => gradeLevel.id));
    form.reset({ code: '', nameEn: '', nameKh: '', description: '', isActive: true });
    setFormOpen(true);
  };

  const openEdit = (subject: Subject) => {
    setEditing(subject);
    setSelectedGrades(subject.gradeLevelIds);
    form.reset({
      code: subject.code,
      nameEn: subject.nameEn,
      nameKh: subject.nameKh ?? '',
      description: subject.description ?? '',
      isActive: subject.isActive,
    });
    setFormOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      code: values.code,
      nameEn: values.nameEn,
      nameKh: values.nameKh || null,
      description: values.description || null,
      isActive: values.isActive,
      gradeLevelIds: selectedGrades,
    };

    try {
      if (editing) {
        await subjectService.update(editing.id, payload);
      } else {
        await subjectService.create(payload);
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

  const toggleGrade = (gradeLevelId: number) => {
    setSelectedGrades((current) =>
      current.includes(gradeLevelId)
        ? current.filter((id) => id !== gradeLevelId)
        : [...current, gradeLevelId],
    );
  };

  const columns: Column<Subject>[] = [
    {
      key: 'name_en',
      header: t('academics:subjects.nameEn'),
      sortable: true,
      render: (subject) => (
        <div>
          <p className="font-medium text-[var(--text)]">{subject.nameEn}</p>
          {subject.nameKh ? (
            <p className="font-khmer text-xs text-[var(--text-muted)]">{subject.nameKh}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'code',
      header: t('common:labels.code'),
      sortable: true,
      hideOnMobile: true,
      render: (subject) => (
        <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-xs">
          {subject.code}
        </code>
      ),
    },
    {
      key: 'grades',
      header: t('academics:gradeLevels.title'),
      hideOnMobile: true,
      render: (subject) => (
        <span className="text-[var(--text-muted)]">
          {subject.gradeLevelIds.length === 0
            ? '—'
            : subject.gradeLevelIds.length === gradeLevels.length
              ? t('common:labels.all')
              : subject.gradeLevelIds
                  .map((id) => gradeLevels.find((gradeLevel) => gradeLevel.id === id)?.code ?? id)
                  .join(', ')}
        </span>
      ),
    },
    {
      key: 'classes',
      header: t('academics:classes.title'),
      align: 'center',
      hideOnMobile: true,
      render: (subject) => formatNumber(subject.classCount, language),
    },
    {
      key: 'is_active',
      header: t('common:labels.status'),
      sortable: true,
      render: (subject) => (
        <Badge tone={subject.isActive ? 'success' : 'neutral'} dot>
          {subject.isActive ? t('academics:subjects.active') : t('common:labels.no')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (subject) => (
        <RowActions
          label={subject.nameEn}
          items={
            canManage
              ? [
                  {
                    key: 'edit',
                    label: t('common:actions.edit'),
                    icon: <Pencil className="size-4" />,
                    onSelect: () => openEdit(subject),
                  },
                  {
                    key: 'archive',
                    label: t('common:actions.archive'),
                    icon: <Archive className="size-4" />,
                    tone: 'danger',
                    separatorBefore: true,
                    onSelect: () => setConfirmArchive(subject),
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
        title={t('academics:subjects.title')}
        description={t('academics:subjects.subtitle')}
        actions={
          canManage ? (
            <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
              {t('academics:subjects.create')}
            </Button>
          ) : null
        }
      />

      <FilterBar
        search={list.query.search}
        onSearchChange={list.setSearch}
        searchPlaceholder={t('academics:subjects.title')}
        isFiltered={list.isFiltered}
        onClearFilters={list.clearFilters}
        filters={
          <Select
            selectSize="md"
            className="w-44"
            value={list.query.filters.gradeLevelId ?? ''}
            onChange={(event) => list.setFilter('gradeLevelId', event.target.value)}
            placeholder={t('academics:gradeLevels.title')}
            options={gradeLevels.map((gradeLevel) => ({
              value: gradeLevel.id,
              label: gradeLevel.nameEn,
            }))}
          />
        }
      />

      <DataTable<Subject>
        columns={columns}
        rows={list.rows}
        rowKey={(subject) => subject.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={list.refresh}
        isFiltered={list.isFiltered}
        sort={{ sortBy: list.query.sortBy, sortOrder: list.query.sortOrder }}
        onSortChange={list.setSort}
        emptyTitle={t('academics:subjects.empty.title')}
        emptyMessage={t('academics:subjects.empty.message')}
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
        title={editing ? t('academics:subjects.edit') : t('academics:subjects.create')}
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
                  placeholder="MATH"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register('code')}
                />
              )}
            </FormField>

            <FormField
              label={t('academics:subjects.nameEn')}
              error={form.formState.errors.nameEn?.message}
              required
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  placeholder="Mathematics"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register('nameEn')}
                />
              )}
            </FormField>
          </div>

          <FormField
            label={t('academics:subjects.nameKh')}
            optionalLabel={t('common:labels.optional')}
          >
            {({ id }) => (
              <Input id={id} className="font-khmer" placeholder="គណិតវិទ្យា" {...form.register('nameKh')} />
            )}
          </FormField>

          <FormField
            label={t('common:labels.description')}
            optionalLabel={t('common:labels.optional')}
          >
            {({ id }) => <Textarea id={id} rows={3} {...form.register('description')} />}
          </FormField>

          <fieldset className="rounded-lg border border-[var(--border)] p-3">
            <legend className="px-1 text-sm font-medium text-[var(--text)]">
              {t('academics:gradeLevels.title')}
            </legend>

            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {gradeLevels.map((gradeLevel) => (
                <Checkbox
                  key={gradeLevel.id}
                  id={`grade-${gradeLevel.id}`}
                  label={gradeLevel.nameEn}
                  checked={selectedGrades.includes(gradeLevel.id)}
                  onChange={() => toggleGrade(gradeLevel.id)}
                />
              ))}
            </div>
          </fieldset>

          <Checkbox
            id="subjectActive"
            label={t('academics:subjects.active')}
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
              () => subjectService.archive(confirmArchive.id),
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
