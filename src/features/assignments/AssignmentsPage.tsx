import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Archive, ClipboardCheck, Pencil, Plus, Save, Send } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { classService } from '@/services/academic.service';
import { assignmentService } from '@/services/engagement.service';
import { ApiError } from '@/types/api';
import { ASSIGNMENT_FILTER_STATUSES } from '@/types/domain';
import type { AssignmentStatus } from '@/types/domain';
import type { UploadedFile } from '@/services/file.service';
import { fileNameFromUrl } from '@/services/file.service';
import type { Assignment, ClassSubject, Submission } from '@/types/entities';
import { useAcademicOptions, useClassOptions } from '@/hooks/useAcademicOptions';
import { useListQuery } from '@/hooks/useListQuery';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { useLanguageStore } from '@/stores/language.store';
import { toast } from '@/stores/toast.store';
import { formatDate, formatDateTime, todayIso } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { AttachmentPicker } from '@/components/ui/AttachmentPicker';
import { AttachmentView } from '@/components/ui/AttachmentView';
import { Modal } from '@/components/ui/Modal';
import { Select, Textarea } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { FilterBar } from '@/components/tables/FilterBar';
import { Pagination } from '@/components/tables/Pagination';
import { RowActions } from '@/components/tables/RowActions';
import { LoadingState } from '@/components/feedback/States';

const buildSchema = (t: (key: string) => string) =>
  z
    .object({
      classId: z.string().min(1, t('validation:selectOption')),
      subjectId: z.string().min(1, t('validation:selectOption')),
      title: z.string().trim().min(1, t('validation:required')).max(200),
      description: z.string().trim().max(2000).optional(),
      instructions: z.string().trim().max(5000).optional(),
      assignedDate: z.string().min(1, t('validation:required')),
      dueDate: z.string().min(1, t('validation:required')),
      maxScore: z.union([z.coerce.number().positive().max(1000), z.literal('')]).optional(),
      publishNow: z.boolean().optional(),
    })
    .refine((value) => new Date(value.dueDate) >= new Date(value.assignedDate), {
      path: ['dueDate'],
      message: t('validation:dueAfterAssigned'),
    });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export const AssignmentsPage = () => {
  const { t } = useTranslation(['communication', 'common', 'performance', 'validation']);
  const language = useLanguageStore((state) => state.language);
  const { has } = usePermission();
  const { run } = useMutation();

  const canManage = has(PERMISSIONS.ASSIGNMENTS_MANAGE);
  const canGrade = has(PERMISSIONS.ASSIGNMENTS_GRADE);

  const options = useAcademicOptions({ years: true, gradeLevels: false });
  const { classes } = useClassOptions(options.activeYear?.id);

  const [isFormOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [confirmArchive, setConfirmArchive] = useState<Assignment | null>(null);
  /** The worksheet a teacher attaches to the brief, uploaded before the form is saved. */
  const [attachment, setAttachment] = useState<UploadedFile | null>(null);

  const [submissionsFor, setSubmissionsFor] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoadingSubmissions, setLoadingSubmissions] = useState(false);
  const [isSavingSubmissions, setSavingSubmissions] = useState(false);

  const fetcher = useCallback(
    (query: { page: number; limit: number; search: string; filters: Record<string, string> }) =>
      assignmentService.list({
        page: query.page,
        limit: query.limit,
        search: query.search || undefined,
        classId: query.filters.classId ? Number(query.filters.classId) : undefined,
        status: (query.filters.status as AssignmentStatus) || undefined,
      }),
    [],
  );

  const list = useListQuery<Assignment>({ fetcher, filterKeys: ['classId', 'status'] });

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: { publishNow: true },
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
      instructions: '',
      assignedDate: todayIso(),
      dueDate: todayIso(),
      maxScore: '',
      publishNow: true,
    });
    setAttachment(null);
    setFormOpen(true);
  };

  const openEdit = (assignment: Assignment) => {
    setEditing(assignment);
    form.reset({
      classId: String(assignment.classId),
      subjectId: String(assignment.subjectId),
      title: assignment.title,
      description: assignment.description ?? '',
      instructions: assignment.instructions ?? '',
      assignedDate: assignment.assignedDate,
      dueDate: assignment.dueDate,
      maxScore: assignment.maxScore ?? '',
      publishNow: assignment.status === 'PUBLISHED',
    });
    setAttachment(
      assignment.attachmentUrl
        ? {
            url: assignment.attachmentUrl,
            fileName: fileNameFromUrl(assignment.attachmentUrl),
            mimeType: '',
            sizeBytes: 0,
          }
        : null,
    );
    setFormOpen(true);
  };

  const openSubmissions = async (assignment: Assignment) => {
    setSubmissionsFor(assignment);
    setLoadingSubmissions(true);

    try {
      setSubmissions(await assignmentService.listSubmissions(assignment.id));
    } catch {
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      title: values.title,
      description: values.description || null,
      instructions: values.instructions || null,
      assignedDate: values.assignedDate,
      dueDate: values.dueDate,
      maxScore:
        values.maxScore === '' || values.maxScore === undefined ? null : Number(values.maxScore),
      attachmentUrl: attachment?.url ?? null,
    };

    try {
      if (editing) {
        await assignmentService.update(editing.id, payload);
        toast.success(t('communication:assignments.toast.updated'));
      } else {
        await assignmentService.create({
          ...payload,
          classId: Number(values.classId),
          subjectId: Number(values.subjectId),
          publishNow: values.publishNow,
        });
        toast.success(t('communication:assignments.toast.created'));
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

  const saveSubmissions = async () => {
    if (!submissionsFor) {
      return;
    }

    setSavingSubmissions(true);

    try {
      await assignmentService.gradeSubmissions(
        submissionsFor.id,
        submissions.map((submission) => ({
          studentId: submission.studentId,
          score: submission.score,
          feedback: submission.feedback,
        })),
      );

      toast.success(t('communication:assignments.toast.graded'));
      setSubmissionsFor(null);
      list.refresh();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : t('common:toast.failed'));
    } finally {
      setSavingSubmissions(false);
    }
  };

  const dueLabel = (assignment: Assignment): string => {
    if (assignment.isOverdue) {
      return t('communication:assignments.overdue');
    }

    const days = Math.ceil(
      (new Date(assignment.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    if (days <= 0) {
      return t('communication:assignments.dueToday');
    }

    return t('communication:assignments.dueIn', { count: days });
  };

  const columns: Column<Assignment>[] = [
    {
      key: 'title',
      header: t('communication:assignments.fields.title'),
      render: (assignment) => (
        <div>
          <p className="font-medium text-[var(--text)]">{assignment.title}</p>
          <p className="text-xs text-[var(--text-subtle)]">
            {assignment.className} · {assignment.subjectName}
          </p>
        </div>
      ),
    },
    {
      key: 'due',
      header: t('communication:assignments.fields.dueDate'),
      render: (assignment) => (
        <div>
          <p className="text-sm text-[var(--text)]">{formatDate(assignment.dueDate, language)}</p>
          <p
            className={
              assignment.isOverdue
                ? 'text-xs text-[var(--danger)]'
                : 'text-xs text-[var(--text-subtle)]'
            }
          >
            {dueLabel(assignment)}
          </p>
        </div>
      ),
    },
    {
      key: 'submissions',
      header: t('communication:assignments.fields.submissions'),
      align: 'center',
      render: (assignment) => (
        <Badge tone={assignment.submissionCount > 0 ? 'info' : 'neutral'} size="sm">
          {assignment.submissionCount}/{assignment.studentCount}
        </Badge>
      ),
    },
    {
      key: 'graded',
      header: t('communication:assignments.fields.graded'),
      align: 'center',
      hideOnMobile: true,
      render: (assignment) => `${assignment.gradedCount}/${assignment.studentCount}`,
    },
    {
      key: 'status',
      header: t('common:labels.status'),
      render: (assignment) => <StatusBadge kind="assignment" status={assignment.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (assignment) => (
        <RowActions
          label={assignment.title}
          items={[
            {
              key: 'submissions',
              label: t('communication:assignments.actions.grade'),
              icon: <ClipboardCheck className="size-4" />,
              onSelect: () => void openSubmissions(assignment),
            },
            ...(canManage
              ? [
                  {
                    key: 'edit',
                    label: t('common:actions.edit'),
                    icon: <Pencil className="size-4" />,
                    onSelect: () => openEdit(assignment),
                  },
                  ...(assignment.status === 'DRAFT'
                    ? [
                        {
                          key: 'publish',
                          label: t('communication:assignments.actions.publish'),
                          icon: <Send className="size-4" />,
                          onSelect: async () => {
                            const ok = await run(
                              () => assignmentService.publish(assignment.id),
                              t('communication:assignments.toast.published'),
                            );

                            if (ok) {
                              list.refresh();
                            }
                          },
                        },
                      ]
                    : []),
                  ...(assignment.status === 'PUBLISHED'
                    ? [
                        {
                          key: 'close',
                          label: t('communication:assignments.actions.close'),
                          onSelect: async () => {
                            const ok = await run(
                              () => assignmentService.close(assignment.id),
                              t('communication:assignments.toast.closed'),
                            );

                            if (ok) {
                              list.refresh();
                            }
                          },
                        },
                      ]
                    : []),
                  {
                    key: 'archive',
                    label: t('common:actions.archive'),
                    icon: <Archive className="size-4" />,
                    tone: 'danger' as const,
                    separatorBefore: true,
                    onSelect: () => setConfirmArchive(assignment),
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
        title={t('communication:assignments.title')}
        description={t('communication:assignments.subtitle')}
        actions={
          canManage ? (
            <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
              {t('communication:assignments.create')}
            </Button>
          ) : null
        }
      />

      <FilterBar
        search={list.query.search}
        onSearchChange={list.setSearch}
        searchPlaceholder={t('communication:assignments.fields.title')}
        isFiltered={list.isFiltered}
        onClearFilters={list.clearFilters}
        filters={
          <>
            <Select
              className="w-40"
              value={list.query.filters.classId ?? ''}
              onChange={(event) => list.setFilter('classId', event.target.value)}
              placeholder={t('communication:assignments.fields.class')}
              options={classes.map((schoolClass) => ({
                value: schoolClass.id,
                label: schoolClass.name,
              }))}
            />

            <Select
              className="w-40"
              value={list.query.filters.status ?? ''}
              onChange={(event) => list.setFilter('status', event.target.value)}
              placeholder={t('common:labels.status')}
              options={ASSIGNMENT_FILTER_STATUSES.map((status) => ({
                value: status,
                label: t(`communication:assignmentStatus.${status}`),
              }))}
            />
          </>
        }
      />

      <DataTable<Assignment>
        columns={columns}
        rows={list.rows}
        rowKey={(assignment) => assignment.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={list.refresh}
        isFiltered={list.isFiltered}
        emptyTitle={t('communication:assignments.empty.title')}
        emptyMessage={t('communication:assignments.empty.message')}
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
          editing ? t('communication:assignments.edit') : t('communication:assignments.create')
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
              label={t('communication:assignments.fields.class')}
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
              label={t('communication:assignments.fields.subject')}
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
            label={t('communication:assignments.fields.title')}
            error={form.formState.errors.title?.message}
            required
          >
            {({ id }) => <Input id={id} autoFocus {...form.register('title')} />}
          </FormField>

          <FormField label={t('communication:assignments.fields.description')}>
            {({ id }) => <Textarea id={id} rows={2} {...form.register('description')} />}
          </FormField>

          <FormField label={t('communication:assignments.fields.instructions')}>
            {({ id }) => <Textarea id={id} rows={3} {...form.register('instructions')} />}
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label={t('communication:assignments.fields.assignedDate')} required>
              {({ id }) => <Input id={id} type="date" {...form.register('assignedDate')} />}
            </FormField>

            <FormField
              label={t('communication:assignments.fields.dueDate')}
              error={form.formState.errors.dueDate?.message}
              required
            >
              {({ id }) => <Input id={id} type="date" {...form.register('dueDate')} />}
            </FormField>

            <FormField label={t('communication:assignments.fields.maxScore')}>
              {({ id }) => <Input id={id} type="number" min={1} {...form.register('maxScore')} />}
            </FormField>
          </div>

          {/* A worksheet or a photograph of the exercise, for the class to work from. */}
          <FormField label={t('communication:assignments.fields.attachment')}>
            {() => <AttachmentPicker value={attachment} onChange={setAttachment} />}
          </FormField>

          {!editing ? (
            <Checkbox
              id="assignmentPublishNow"
              label={t('communication:assignments.actions.publish')}
              {...form.register('publishNow')}
            />
          ) : null}
        </form>
      </Modal>

      {/* Submissions */}
      <Modal
        open={submissionsFor !== null}
        onClose={() => setSubmissionsFor(null)}
        size="lg"
        title={submissionsFor?.title ?? ''}
        description={t('communication:assignments.submissions.title')}
        closeLabel={t('common:actions.close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSubmissionsFor(null)}>
              {t('common:actions.cancel')}
            </Button>
            {canGrade ? (
              <Button
                onClick={saveSubmissions}
                isLoading={isSavingSubmissions}
                leftIcon={<Save className="size-4" />}
              >
                {t('communication:assignments.submissions.save')}
              </Button>
            ) : null}
          </>
        }
      >
        {isLoadingSubmissions ? (
          <LoadingState compact />
        ) : (
          <ul className="flex flex-col gap-3">
            {submissions.map((submission) => (
              <li
                key={submission.studentId}
                className="flex flex-col gap-3 rounded-lg border border-[var(--border)] p-3"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text)]">
                      {submission.studentName}
                    </p>
                    <p className="text-xs text-[var(--text-subtle)]">{submission.studentCode}</p>
                  </div>

                  <StatusBadge kind="submission" status={submission.status} size="sm" />
                </div>

                {/*
                  * The work itself. Marking a submission without being able to
                  * read it is not marking, so the answer and any photograph the
                  * pupil handed in sit above the score box rather than behind a
                  * second click.
                  */}
                {submission.content || submission.attachmentUrl ? (
                  <div className="flex flex-col gap-2 rounded-lg bg-[var(--surface-muted)] p-3">
                    {submission.content ? (
                      <p className="whitespace-pre-wrap text-sm text-[var(--text)]">
                        {submission.content}
                      </p>
                    ) : null}

                    {submission.attachmentUrl ? (
                      <AttachmentView url={submission.attachmentUrl} />
                    ) : null}

                    {submission.submittedAt ? (
                      <p className="text-xs text-[var(--text-subtle)]">
                        {t('communication:assignments.submissions.submittedOn', {
                          date: formatDateTime(submission.submittedAt, language),
                        })}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs italic text-[var(--text-subtle)]">
                    {t('communication:assignments.submissions.nothingHandedIn')}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  {submissionsFor?.maxScore ? (
                    <Input
                      inputSize="sm"
                      type="number"
                      min={0}
                      max={submissionsFor.maxScore}
                      className="w-20 text-center"
                      disabled={!canGrade}
                      value={submission.score === null ? '' : String(submission.score)}
                      aria-label={t('communication:assignments.submissions.score')}
                      onChange={(event) =>
                        setSubmissions((current) =>
                          current.map((item) =>
                            item.studentId === submission.studentId
                              ? {
                                  ...item,
                                  score:
                                    event.target.value === '' ? null : Number(event.target.value),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  ) : null}

                  <Input
                    inputSize="sm"
                    className="w-full sm:w-56"
                    disabled={!canGrade}
                    value={submission.feedback ?? ''}
                    placeholder={t('communication:assignments.submissions.feedback')}
                    onChange={(event) =>
                      setSubmissions((current) =>
                        current.map((item) =>
                          item.studentId === submission.studentId
                            ? { ...item, feedback: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
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
              () => assignmentService.archive(confirmArchive.id),
              t('communication:assignments.toast.archived'),
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
