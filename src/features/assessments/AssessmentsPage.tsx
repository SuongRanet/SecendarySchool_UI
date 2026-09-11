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
import { assessmentService } from '@/services/performance.service';
import { ApiError } from '@/types/api';
import { ASSESSMENT_TYPES, CREATABLE_ASSESSMENT_TYPES } from '@/types/domain';
import type { AssessmentType } from '@/types/domain';
import type { Assessment, ClassSubject } from '@/types/entities';
import { useAcademicOptions, useClassOptions } from '@/hooks/useAcademicOptions';
import { useListQuery } from '@/hooks/useListQuery';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { useLanguageStore } from '@/stores/language.store';
import { formatDate, formatScore } from '@/utils/format';
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
    classId: z.string().min(1, t('validation:selectOption')),
    subjectId: z.string().min(1, t('validation:selectOption')),
    title: z.string().trim().min(1, t('validation:required')).max(200),
    description: z.string().trim().max(1000).optional(),
    type: z.enum(ASSESSMENT_TYPES),
    maxScore: z.coerce.number().positive(t('validation:positiveNumber')).max(1000),
    weightPercent: z.union([z.coerce.number().positive().max(100), z.literal('')]).optional(),
    assessmentDate: z.string().optional(),
    isPublished: z.boolean().optional(),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export const AssessmentsPage = () => {
  const { t } = useTranslation(['performance', 'common', 'academics', 'validation']);
  const navigate = useNavigate();
  const language = useLanguageStore((state) => state.language);
  const { has } = usePermission();
  const { run } = useMutation();

  const canManage = has(PERMISSIONS.ASSESSMENTS_MANAGE);
  const options = useAcademicOptions({ years: true, gradeLevels: false });
  const { classes } = useClassOptions(options.activeYear?.id);

  const [isFormOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Assessment | null>(null);

  /**
   * What the type picker offers: the three the school assesses on, plus the
   * type of the assessment being edited when that is something older.
   */
  const typeOptions =
    editing && !CREATABLE_ASSESSMENT_TYPES.some((type) => type === editing.type)
      ? [...CREATABLE_ASSESSMENT_TYPES, editing.type]
      : [...CREATABLE_ASSESSMENT_TYPES];
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [confirmArchive, setConfirmArchive] = useState<Assessment | null>(null);

  const fetcher = useCallback(
    (query: {
      page: number;
      limit: number;
      search: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      filters: Record<string, string>;
    }) =>
      assessmentService.list({
        page: query.page,
        limit: query.limit,
        search: query.search || undefined,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        classId: query.filters.classId ? Number(query.filters.classId) : undefined,
        type: (query.filters.type as AssessmentType) || undefined,
      }),
    [],
  );

  const list = useListQuery<Assessment>({
    fetcher,
    filterKeys: ['classId', 'type'],
    defaultSortBy: 'assessment_date',
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: { type: 'QUIZ', maxScore: 100, isPublished: false },
  });

  const watchedClassId = form.watch('classId');

  useEffect(() => {
    if (!watchedClassId) {
      setClassSubjects([]);
      return;
    }

    classService
      .listSubjects(Number(watchedClassId), { mine: true })
      .then(setClassSubjects)
      .catch(() => setClassSubjects([]));
  }, [watchedClassId]);

  const openCreate = () => {
    setEditing(null);
    form.reset({
      classId: list.query.filters.classId ?? '',
      subjectId: '',
      title: '',
      description: '',
      type: 'QUIZ',
      maxScore: 100,
      weightPercent: '',
      assessmentDate: new Date().toISOString().slice(0, 10),
      isPublished: false,
    });
    setFormOpen(true);
  };

  const openEdit = (assessment: Assessment) => {
    setEditing(assessment);
    form.reset({
      classId: String(assessment.classId),
      subjectId: String(assessment.subjectId),
      title: assessment.title,
      description: assessment.description ?? '',
      type: assessment.type,
      maxScore: assessment.maxScore,
      weightPercent: assessment.weightPercent ?? '',
      assessmentDate: assessment.assessmentDate ?? '',
      isPublished: assessment.isPublished,
    });
    setFormOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      title: values.title,
      description: values.description || null,
      type: values.type,
      maxScore: values.maxScore,
      weightPercent:
        values.weightPercent === '' || values.weightPercent === undefined
          ? null
          : Number(values.weightPercent),
      assessmentDate: values.assessmentDate || null,
      isPublished: values.isPublished,
    };

    try {
      if (editing) {
        await assessmentService.update(editing.id, payload);
      } else {
        await assessmentService.create({
          ...payload,
          classId: Number(values.classId),
          subjectId: Number(values.subjectId),
        });
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

  const columns: Column<Assessment>[] = [
    {
      key: 'title',
      header: t('performance:assessments.fields.title'),
      sortable: true,
      render: (assessment) => (
        <div>
          <p className="font-medium text-[var(--text)]">{assessment.title}</p>
          <p className="text-xs text-[var(--text-subtle)]">
            {assessment.className} · {assessment.subjectName}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: t('performance:assessments.fields.type'),
      sortable: true,
      render: (assessment) => (
        <Badge tone="primary" size="sm">
          {t(`performance:assessments.type.${assessment.type}`)}
        </Badge>
      ),
    },
    {
      key: 'assessment_date',
      header: t('performance:assessments.fields.date'),
      sortable: true,
      hideOnMobile: true,
      render: (assessment) => formatDate(assessment.assessmentDate, language),
    },
    {
      key: 'graded',
      header: t('performance:assessments.fields.graded'),
      align: 'center',
      render: (assessment) => (
        <Badge
          tone={
            assessment.gradedCount === 0
              ? 'neutral'
              : assessment.gradedCount >= assessment.studentCount
                ? 'success'
                : 'warning'
          }
          size="sm"
        >
          {assessment.gradedCount}/{assessment.studentCount}
        </Badge>
      ),
    },
    {
      key: 'average',
      header: t('performance:assessments.fields.average'),
      align: 'center',
      hideOnMobile: true,
      render: (assessment) => formatScore(assessment.averageScore, assessment.maxScore),
    },
    {
      key: 'published',
      header: t('performance:assessments.fields.published'),
      render: (assessment) => (
        <Badge tone={assessment.isPublished ? 'success' : 'neutral'} dot>
          {assessment.isPublished ? t('common:labels.yes') : t('common:labels.no')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (assessment) => (
        <RowActions
          label={assessment.title}
          items={[
            {
              key: 'view',
              label: t('performance:assessments.results.title'),
              icon: <Eye className="size-4" />,
              onSelect: () => navigate(ROUTES.assessmentDetail(assessment.id)),
            },
            ...(canManage
              ? [
                  {
                    key: 'edit',
                    label: t('common:actions.edit'),
                    icon: <Pencil className="size-4" />,
                    onSelect: () => openEdit(assessment),
                  },
                  {
                    key: 'publish',
                    label: assessment.isPublished
                      ? t('performance:assessments.unpublish')
                      : t('performance:assessments.publish'),
                    onSelect: async () => {
                      const ok = await run(
                        () =>
                          assessmentService.setPublished(assessment.id, !assessment.isPublished),
                        assessment.isPublished
                          ? t('performance:assessments.toast.unpublished')
                          : t('performance:assessments.toast.published'),
                      );

                      if (ok) {
                        list.refresh();
                      }
                    },
                  },
                  {
                    key: 'archive',
                    label: t('common:actions.archive'),
                    icon: <Archive className="size-4" />,
                    tone: 'danger' as const,
                    separatorBefore: true,
                    onSelect: () => setConfirmArchive(assessment),
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
        title={t('performance:assessments.title')}
        description={t('performance:assessments.subtitle')}
        actions={
          canManage ? (
            <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
              {t('performance:assessments.create')}
            </Button>
          ) : null
        }
      />

      <FilterBar
        search={list.query.search}
        onSearchChange={list.setSearch}
        searchPlaceholder={t('performance:assessments.fields.title')}
        isFiltered={list.isFiltered}
        onClearFilters={list.clearFilters}
        filters={
          <>
            <Select
              className="w-40"
              value={list.query.filters.classId ?? ''}
              onChange={(event) => list.setFilter('classId', event.target.value)}
              placeholder={t('performance:assessments.fields.class')}
              options={classes.map((schoolClass) => ({
                value: schoolClass.id,
                label: schoolClass.name,
              }))}
            />

            <Select
              className="w-40"
              value={list.query.filters.type ?? ''}
              onChange={(event) => list.setFilter('type', event.target.value)}
              placeholder={t('performance:assessments.fields.type')}
              options={ASSESSMENT_TYPES.map((type) => ({
                value: type,
                label: t(`performance:assessments.type.${type}`),
              }))}
            />
          </>
        }
      />

      <DataTable<Assessment>
        columns={columns}
        rows={list.rows}
        rowKey={(assessment) => assessment.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={list.refresh}
        isFiltered={list.isFiltered}
        sort={{ sortBy: list.query.sortBy, sortOrder: list.query.sortOrder }}
        onSortChange={list.setSort}
        onRowClick={(assessment) => navigate(ROUTES.assessmentDetail(assessment.id))}
        emptyTitle={t('performance:assessments.empty.title')}
        emptyMessage={t('performance:assessments.empty.message')}
        emptyAction={
          canManage ? (
            <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
              {t('performance:assessments.create')}
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
        size="lg"
        title={
          editing ? t('performance:assessments.edit') : t('performance:assessments.create')
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label={t('performance:assessments.fields.class')}
              error={form.formState.errors.classId?.message}
              required
            >
              {({ id }) => (
                <Select
                  id={id}
                  disabled={Boolean(editing)}
                  placeholder={t('common:actions.select')}
                  options={classes.map((schoolClass) => ({
                    value: schoolClass.id,
                    label: schoolClass.name,
                  }))}
                  {...form.register('classId')}
                />
              )}
            </FormField>

            <FormField
              label={t('performance:assessments.fields.subject')}
              error={form.formState.errors.subjectId?.message}
              required
            >
              {({ id }) => (
                <Select
                  id={id}
                  disabled={Boolean(editing)}
                  placeholder={t('common:actions.select')}
                  options={classSubjects.map((classSubject) => ({
                    value: classSubject.subjectId,
                    label: classSubject.subjectNameEn,
                  }))}
                  {...form.register('subjectId')}
                />
              )}
            </FormField>
          </div>

          <FormField
            label={t('performance:assessments.fields.title')}
            error={form.formState.errors.title?.message}
            required
          >
            {({ id }) => <Input id={id} autoFocus {...form.register('title')} />}
          </FormField>

          <FormField
            label={t('performance:assessments.fields.description')}
            optionalLabel={t('common:labels.optional')}
          >
            {({ id }) => <Textarea id={id} rows={2} {...form.register('description')} />}
          </FormField>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FormField label={t('performance:assessments.fields.type')} required>
              {({ id }) => (
                <Select
                  id={id}
                  /*
                   * The three the school assesses on, plus whatever the
                   * assessment being edited already is.
                   *
                   * Without that second part, opening one of the existing
                   * homework assessments would show an empty type and silently
                   * reclassify it on save.
                   */
                  options={typeOptions.map((type) => ({
                    value: type,
                    label: t(`performance:assessments.type.${type}`),
                  }))}
                  {...form.register('type')}
                />
              )}
            </FormField>

            <FormField
              label={t('performance:assessments.fields.maxScore')}
              error={form.formState.errors.maxScore?.message}
              required
            >
              {({ id }) => <Input id={id} type="number" min={1} {...form.register('maxScore')} />}
            </FormField>

            <FormField label={t('performance:assessments.fields.weight')}>
              {({ id }) => (
                <Input id={id} type="number" min={0} max={100} {...form.register('weightPercent')} />
              )}
            </FormField>

            <FormField label={t('performance:assessments.fields.date')}>
              {({ id }) => <Input id={id} type="date" {...form.register('assessmentDate')} />}
            </FormField>
          </div>

          <Checkbox
            id="assessmentPublished"
            label={t('performance:assessments.publish')}
            description={t('performance:assessments.publishedHint')}
            {...form.register('isPublished')}
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
              () => assessmentService.archive(confirmArchive.id),
              t('performance:assessments.toast.archived'),
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
