import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Archive, ClipboardList, Pencil, Plus, Save } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { classService } from '@/services/academic.service';
import { examService } from '@/services/performance.service';
import { ApiError } from '@/types/api';
import { EXAM_TYPES } from '@/types/domain';
import type { ExamType } from '@/types/domain';
import type { ClassSubject, Exam, ExamResult } from '@/types/entities';
import { useAcademicOptions, useClassOptions } from '@/hooks/useAcademicOptions';
import { useListQuery } from '@/hooks/useListQuery';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { useLanguageStore } from '@/stores/language.store';
import { toast } from '@/stores/toast.store';
import { formatDate, formatScore, formatTime } from '@/utils/format';
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
import { LoadingState } from '@/components/feedback/States';

const buildSchema = (t: (key: string) => string) =>
  z.object({
    classId: z.string().min(1, t('validation:selectOption')),
    subjectId: z.string().min(1, t('validation:selectOption')),
    roomId: z.string().optional(),
    title: z.string().trim().min(1, t('validation:required')).max(200),
    type: z.enum(EXAM_TYPES),
    examDate: z.string().min(1, t('validation:required')),
    startTime: z.string().optional(),
    durationMinutes: z.union([z.coerce.number().int().positive().max(600), z.literal('')]).optional(),
    maxScore: z.coerce.number().positive().max(1000),
    instructions: z.string().trim().max(2000).optional(),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export const ExamsPage = () => {
  const { t } = useTranslation(['performance', 'common', 'academics', 'validation']);
  const language = useLanguageStore((state) => state.language);
  const { has } = usePermission();
  const canManage = has(PERMISSIONS.EXAMS_MANAGE);
  const { run } = useMutation();

  const options = useAcademicOptions({ years: true, gradeLevels: false, rooms: true });
  const { classes } = useClassOptions(options.activeYear?.id);

  const [isFormOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [confirmArchive, setConfirmArchive] = useState<Exam | null>(null);

  const [resultsExam, setResultsExam] = useState<Exam | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [isLoadingResults, setLoadingResults] = useState(false);
  const [isSavingResults, setSavingResults] = useState(false);

  const fetcher = useCallback(
    (query: {
      page: number;
      limit: number;
      search: string;
      filters: Record<string, string>;
    }) =>
      examService.list({
        page: query.page,
        limit: query.limit,
        search: query.search || undefined,
        classId: query.filters.classId ? Number(query.filters.classId) : undefined,
        type: (query.filters.type as ExamType) || undefined,
        upcomingOnly: query.filters.upcomingOnly === 'true' ? true : undefined,
      }),
    [],
  );

  const list = useListQuery<Exam>({ fetcher, filterKeys: ['classId', 'type', 'upcomingOnly'] });

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: { type: 'MIDTERM', maxScore: 100 },
  });

  const watchedClassId = form.watch('classId');

  useEffect(() => {
    if (!watchedClassId) {
      setClassSubjects([]);
      return;
    }

    classService
      .listSubjects(Number(watchedClassId))
      .then(setClassSubjects)
      .catch(() => setClassSubjects([]));
  }, [watchedClassId]);

  const openCreate = () => {
    setEditing(null);
    form.reset({
      classId: list.query.filters.classId ?? '',
      subjectId: '',
      roomId: '',
      title: '',
      type: 'MIDTERM',
      examDate: new Date().toISOString().slice(0, 10),
      startTime: '08:00',
      durationMinutes: 60,
      maxScore: 100,
      instructions: '',
    });
    setFormOpen(true);
  };

  const openEdit = (exam: Exam) => {
    setEditing(exam);
    form.reset({
      classId: String(exam.classId),
      subjectId: String(exam.subjectId),
      roomId: exam.roomId ? String(exam.roomId) : '',
      title: exam.title,
      type: exam.type,
      examDate: exam.examDate,
      startTime: exam.startTime?.slice(0, 5) ?? '',
      durationMinutes: exam.durationMinutes ?? '',
      maxScore: exam.maxScore,
      instructions: exam.instructions ?? '',
    });
    setFormOpen(true);
  };

  const openResults = async (exam: Exam) => {
    setResultsExam(exam);
    setLoadingResults(true);

    try {
      setResults(await examService.listResults(exam.id));
    } catch {
      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      roomId: values.roomId ? Number(values.roomId) : null,
      title: values.title,
      type: values.type,
      examDate: values.examDate,
      startTime: values.startTime || null,
      durationMinutes:
        values.durationMinutes === '' || values.durationMinutes === undefined
          ? null
          : Number(values.durationMinutes),
      maxScore: values.maxScore,
      instructions: values.instructions || null,
    };

    try {
      if (editing) {
        await examService.update(editing.id, payload);
        toast.success(t('performance:exams.toast.updated'));
      } else {
        await examService.create({
          ...payload,
          classId: Number(values.classId),
          subjectId: Number(values.subjectId),
        });
        toast.success(t('performance:exams.toast.created'));
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

  const saveResults = async () => {
    if (!resultsExam) {
      return;
    }

    setSavingResults(true);

    try {
      await examService.saveResults(
        resultsExam.id,
        results.map((result) => ({
          studentId: result.studentId,
          score: result.isAbsent ? null : result.score,
          isAbsent: result.isAbsent,
          remark: result.remark,
        })),
      );

      toast.success(t('performance:exams.toast.resultsSaved'));
      setResultsExam(null);
      list.refresh();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : t('common:toast.failed'));
    } finally {
      setSavingResults(false);
    }
  };

  const columns: Column<Exam>[] = [
    {
      key: 'title',
      header: t('performance:exams.fields.title'),
      render: (exam) => (
        <div>
          <p className="font-medium text-[var(--text)]">{exam.title}</p>
          <p className="text-xs text-[var(--text-subtle)]">
            {exam.className} · {exam.subjectName}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: t('performance:exams.fields.type'),
      render: (exam) => (
        <Badge tone="primary" size="sm">
          {t(`performance:exams.type.${exam.type}`)}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: t('performance:exams.fields.date'),
      render: (exam) => (
        <div className="text-sm">
          <p className="text-[var(--text)]">{formatDate(exam.examDate, language)}</p>
          {exam.startTime ? (
            <p className="text-xs text-[var(--text-subtle)]">
              {formatTime(exam.startTime)}
              {exam.durationMinutes ? ` · ${exam.durationMinutes}′` : ''}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'room',
      header: t('performance:exams.fields.room'),
      hideOnMobile: true,
      render: (exam) => exam.roomName ?? '—',
    },
    {
      key: 'graded',
      header: t('performance:assessments.fields.graded'),
      align: 'center',
      render: (exam) => (
        <Badge
          tone={
            exam.gradedCount === 0
              ? 'neutral'
              : exam.gradedCount >= exam.studentCount
                ? 'success'
                : 'warning'
          }
          size="sm"
        >
          {exam.gradedCount}/{exam.studentCount}
        </Badge>
      ),
    },
    {
      key: 'average',
      header: t('performance:assessments.fields.average'),
      align: 'center',
      hideOnMobile: true,
      render: (exam) => formatScore(exam.averageScore, exam.maxScore),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (exam) => (
        <RowActions
          label={exam.title}
          items={[
            {
              key: 'results',
              label: t('performance:assessments.results.title'),
              icon: <ClipboardList className="size-4" />,
              onSelect: () => void openResults(exam),
            },
            ...(canManage
              ? [
                  {
                    key: 'edit',
                    label: t('common:actions.edit'),
                    icon: <Pencil className="size-4" />,
                    onSelect: () => openEdit(exam),
                  },
                  {
                    key: 'archive',
                    label: t('common:actions.archive'),
                    icon: <Archive className="size-4" />,
                    tone: 'danger' as const,
                    separatorBefore: true,
                    onSelect: () => setConfirmArchive(exam),
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
        title={t('performance:exams.title')}
        description={t('performance:exams.subtitle')}
        actions={
          canManage ? (
            <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
              {t('performance:exams.create')}
            </Button>
          ) : null
        }
      />

      <FilterBar
        search={list.query.search}
        onSearchChange={list.setSearch}
        searchPlaceholder={t('performance:exams.fields.title')}
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
              className="w-44"
              value={list.query.filters.type ?? ''}
              onChange={(event) => list.setFilter('type', event.target.value)}
              placeholder={t('performance:exams.fields.type')}
              options={EXAM_TYPES.map((type) => ({
                value: type,
                label: t(`performance:exams.type.${type}`),
              }))}
            />

            <Checkbox
              id="upcomingOnly"
              label={t('performance:exams.upcoming')}
              checked={list.query.filters.upcomingOnly === 'true'}
              onChange={(event) =>
                list.setFilter('upcomingOnly', event.target.checked ? 'true' : '')
              }
            />
          </>
        }
      />

      <DataTable<Exam>
        columns={columns}
        rows={list.rows}
        rowKey={(exam) => exam.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={list.refresh}
        isFiltered={list.isFiltered}
        emptyTitle={t('performance:exams.empty.title')}
        emptyMessage={t('performance:exams.empty.message')}
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
        title={editing ? t('performance:exams.edit') : t('performance:exams.create')}
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
            label={t('performance:exams.fields.title')}
            error={form.formState.errors.title?.message}
            required
          >
            {({ id }) => <Input id={id} autoFocus {...form.register('title')} />}
          </FormField>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FormField label={t('performance:exams.fields.type')} required>
              {({ id }) => (
                <Select
                  id={id}
                  options={EXAM_TYPES.map((type) => ({
                    value: type,
                    label: t(`performance:exams.type.${type}`),
                  }))}
                  {...form.register('type')}
                />
              )}
            </FormField>

            <FormField
              label={t('performance:exams.fields.date')}
              error={form.formState.errors.examDate?.message}
              required
            >
              {({ id }) => <Input id={id} type="date" {...form.register('examDate')} />}
            </FormField>

            <FormField label={t('performance:exams.fields.startTime')}>
              {({ id }) => <Input id={id} type="time" {...form.register('startTime')} />}
            </FormField>

            <FormField label={t('performance:exams.fields.duration')}>
              {({ id }) => (
                <Input id={id} type="number" min={1} {...form.register('durationMinutes')} />
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('performance:exams.fields.room')}>
              {({ id }) => (
                <Select
                  id={id}
                  placeholder={t('academics:rooms.title')}
                  options={options.rooms.map((room) => ({ value: room.id, label: room.name }))}
                  {...form.register('roomId')}
                />
              )}
            </FormField>

            <FormField
              label={t('performance:exams.fields.maxScore')}
              error={form.formState.errors.maxScore?.message}
              required
            >
              {({ id }) => <Input id={id} type="number" min={1} {...form.register('maxScore')} />}
            </FormField>
          </div>

          <FormField
            label={t('performance:exams.fields.instructions')}
            optionalLabel={t('common:labels.optional')}
          >
            {({ id }) => <Textarea id={id} rows={3} {...form.register('instructions')} />}
          </FormField>
        </form>
      </Modal>

      {/* Exam results */}
      <Modal
        open={resultsExam !== null}
        onClose={() => setResultsExam(null)}
        size="lg"
        title={resultsExam?.title ?? ''}
        description={`${t('performance:exams.fields.maxScore')}: ${resultsExam?.maxScore ?? ''}`}
        closeLabel={t('common:actions.close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResultsExam(null)}>
              {t('common:actions.cancel')}
            </Button>
            {canManage ? (
              <Button
                onClick={saveResults}
                isLoading={isSavingResults}
                leftIcon={<Save className="size-4" />}
              >
                {t('performance:assessments.results.save')}
              </Button>
            ) : null}
          </>
        }
      >
        {isLoadingResults ? (
          <LoadingState compact />
        ) : (
          <ul className="flex flex-col gap-2">
            {results.map((result, index) => (
              <li key={result.studentId} className="flex items-center gap-3">
                <span className="w-8 shrink-0 text-center text-xs tabular-nums text-[var(--text-subtle)]">
                  {result.rollNumber ?? index + 1}
                </span>

                <span className="min-w-0 flex-1 truncate text-sm text-[var(--text)]">
                  {result.studentName}
                </span>

                <Input
                  inputSize="sm"
                  type="number"
                  min={0}
                  max={resultsExam?.maxScore}
                  className="w-24 text-center"
                  disabled={!canManage || result.isAbsent}
                  value={result.score === null ? '' : String(result.score)}
                  aria-label={t('performance:assessments.results.score')}
                  onChange={(event) =>
                    setResults((current) =>
                      current.map((item) =>
                        item.studentId === result.studentId
                          ? {
                              ...item,
                              score: event.target.value === '' ? null : Number(event.target.value),
                            }
                          : item,
                      ),
                    )
                  }
                />

                <Checkbox
                  id={`exam-absent-${result.studentId}`}
                  label={t('performance:assessments.results.absent')}
                  disabled={!canManage}
                  checked={result.isAbsent}
                  onChange={(event) =>
                    setResults((current) =>
                      current.map((item) =>
                        item.studentId === result.studentId
                          ? {
                              ...item,
                              isAbsent: event.target.checked,
                              score: event.target.checked ? null : item.score,
                            }
                          : item,
                      ),
                    )
                  }
                />
              </li>
            ))}
          </ul>
        )}
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
              () => examService.archive(confirmArchive.id),
              t('performance:exams.toast.archived'),
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
