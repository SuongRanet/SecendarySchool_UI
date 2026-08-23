import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Archive, Megaphone, Pencil, Pin, Plus, Send, Trash2 } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { announcementService } from '@/services/engagement.service';
import { ApiError } from '@/types/api';
import { ANNOUNCEMENT_AUDIENCES, ANNOUNCEMENT_STATUSES } from '@/types/domain';
import type { AnnouncementAudience, AnnouncementStatus } from '@/types/domain';
import type { Announcement } from '@/types/entities';
import { useAcademicOptions, useClassOptions } from '@/hooks/useAcademicOptions';
import { useListQuery } from '@/hooks/useListQuery';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { useLanguageStore } from '@/stores/language.store';
import { toast } from '@/stores/toast.store';
import { formatDateTime } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select, Textarea } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FilterBar } from '@/components/tables/FilterBar';
import { Pagination } from '@/components/tables/Pagination';
import { RowActions } from '@/components/tables/RowActions';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';

const buildSchema = (t: (key: string) => string) =>
  z.object({
    title: z.string().trim().min(1, t('validation:required')).max(200),
    body: z.string().trim().min(1, t('validation:required')).max(20000),
    audience: z.enum(ANNOUNCEMENT_AUDIENCES),
    gradeLevelId: z.string().optional(),
    classId: z.string().optional(),
    isPinned: z.boolean().optional(),
    publishNow: z.boolean().optional(),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export const AnnouncementsPage = () => {
  const { t } = useTranslation(['communication', 'common', 'validation', 'academics']);
  const language = useLanguageStore((state) => state.language);
  const { has } = usePermission();
  const { run } = useMutation();

  const canManage = has(PERMISSIONS.ANNOUNCEMENTS_MANAGE);
  const canPublish = has(PERMISSIONS.ANNOUNCEMENTS_PUBLISH);

  const options = useAcademicOptions({ years: true, gradeLevels: true });
  const { classes } = useClassOptions(options.activeYear?.id);

  const [isFormOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Announcement | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Announcement | null>(null);

  const fetcher = useCallback(
    (query: { page: number; limit: number; search: string; filters: Record<string, string> }) =>
      canManage
        ? announcementService.list({
            page: query.page,
            limit: query.limit,
            search: query.search || undefined,
            status: (query.filters.status as AnnouncementStatus) || undefined,
            audience: (query.filters.audience as AnnouncementAudience) || undefined,
          })
        : announcementService.feed({ page: query.page, limit: query.limit }),
    [canManage],
  );

  const list = useListQuery<Announcement>({ fetcher, filterKeys: ['status', 'audience'] });

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: { audience: 'ALL', isPinned: false, publishNow: true },
  });

  const audience = form.watch('audience');

  const openCreate = () => {
    setEditing(null);
    form.reset({
      title: '',
      body: '',
      audience: 'ALL',
      gradeLevelId: '',
      classId: '',
      isPinned: false,
      publishNow: true,
    });
    setFormOpen(true);
  };

  const openEdit = (announcement: Announcement) => {
    setEditing(announcement);
    form.reset({
      title: announcement.title,
      body: announcement.body,
      audience: announcement.audience,
      gradeLevelId: announcement.gradeLevelId ? String(announcement.gradeLevelId) : '',
      classId: announcement.classId ? String(announcement.classId) : '',
      isPinned: announcement.isPinned,
      publishNow: announcement.status === 'PUBLISHED',
    });
    setFormOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      title: values.title,
      body: values.body,
      audience: values.audience,
      gradeLevelId: values.audience === 'GRADE' && values.gradeLevelId ? Number(values.gradeLevelId) : null,
      classId: values.audience === 'CLASS' && values.classId ? Number(values.classId) : null,
      isPinned: values.isPinned,
    };

    try {
      if (editing) {
        await announcementService.update(editing.id, payload);
        toast.success(t('communication:announcements.toast.updated'));
      } else {
        await announcementService.create({ ...payload, publishNow: values.publishNow });
        toast.success(
          values.publishNow
            ? t('communication:announcements.toast.published')
            : t('communication:announcements.toast.created'),
        );
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

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('communication:announcements.title')}
        description={t('communication:announcements.subtitle')}
        actions={
          canManage ? (
            <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
              {t('communication:announcements.create')}
            </Button>
          ) : null
        }
      />

      {canManage ? (
        <FilterBar
          search={list.query.search}
          onSearchChange={list.setSearch}
          searchPlaceholder={t('communication:announcements.fields.title')}
          isFiltered={list.isFiltered}
          onClearFilters={list.clearFilters}
          filters={
            <>
              <Select
                className="w-40"
                value={list.query.filters.status ?? ''}
                onChange={(event) => list.setFilter('status', event.target.value)}
                placeholder={t('common:labels.status')}
                options={ANNOUNCEMENT_STATUSES.map((status) => ({
                  value: status,
                  label: t(`communication:announcementStatus.${status}`),
                }))}
              />

              <Select
                className="w-44"
                value={list.query.filters.audience ?? ''}
                onChange={(event) => list.setFilter('audience', event.target.value)}
                placeholder={t('communication:announcements.fields.audience')}
                options={ANNOUNCEMENT_AUDIENCES.map((item) => ({
                  value: item,
                  label: t(`communication:announcements.audience.${item}`),
                }))}
              />
            </>
          }
        />
      ) : null}

      {list.isLoading ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.refresh} />
      ) : list.rows.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Megaphone className="size-6" />}
              title={
                canManage
                  ? t('communication:announcements.empty.title')
                  : t('communication:announcements.feedEmpty')
              }
              message={canManage ? t('communication:announcements.empty.message') : undefined}
              action={
                canManage ? (
                  <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
                    {t('communication:announcements.create')}
                  </Button>
                ) : null
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {list.rows.map((announcement) => (
            <Card key={announcement.id}>
              <CardBody className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {announcement.isPinned ? (
                        <Pin className="size-4 text-[var(--warning)]" aria-hidden="true" />
                      ) : null}

                      <h2 className="text-base font-semibold text-[var(--text)]">
                        {announcement.title}
                      </h2>

                      <Badge tone="primary" size="sm">
                        {t(`communication:announcements.audience.${announcement.audience}`)}
                        {announcement.className ? `: ${announcement.className}` : ''}
                        {announcement.gradeLevelName ? `: ${announcement.gradeLevelName}` : ''}
                      </Badge>

                      {canManage ? (
                        <StatusBadge kind="announcement" status={announcement.status} size="sm" />
                      ) : null}
                    </div>

                    <p className="mt-1 text-xs text-[var(--text-subtle)]">
                      {announcement.publishedAt
                        ? formatDateTime(announcement.publishedAt, language)
                        : formatDateTime(announcement.createdAt, language)}
                      {announcement.createdByName ? ` · ${announcement.createdByName}` : ''}
                    </p>
                  </div>

                  {canManage ? (
                    <RowActions
                      label={announcement.title}
                      items={[
                        {
                          key: 'edit',
                          label: t('common:actions.edit'),
                          icon: <Pencil className="size-4" />,
                          onSelect: () => openEdit(announcement),
                        },
                        ...(canPublish && announcement.status !== 'PUBLISHED'
                          ? [
                              {
                                key: 'publish',
                                label: t('communication:announcements.actions.publish'),
                                icon: <Send className="size-4" />,
                                onSelect: async () => {
                                  const ok = await run(
                                    () => announcementService.publish(announcement.id),
                                    t('communication:announcements.toast.published'),
                                  );

                                  if (ok) {
                                    list.refresh();
                                  }
                                },
                              },
                            ]
                          : []),
                        ...(announcement.status === 'PUBLISHED'
                          ? [
                              {
                                key: 'archive',
                                label: t('communication:announcements.actions.archive'),
                                icon: <Archive className="size-4" />,
                                separatorBefore: true,
                                onSelect: () => setConfirmArchive(announcement),
                              },
                            ]
                          : [
                              {
                                key: 'delete',
                                label: t('communication:announcements.actions.delete'),
                                icon: <Trash2 className="size-4" />,
                                tone: 'danger' as const,
                                separatorBefore: true,
                                onSelect: () => setConfirmDelete(announcement),
                              },
                            ]),
                      ]}
                    />
                  ) : null}
                </div>

                <p className="whitespace-pre-line text-sm text-[var(--text-muted)]">
                  {announcement.body}
                </p>
              </CardBody>
            </Card>
          ))}

          <Card>
            <Pagination
              pagination={list.pagination}
              onPageChange={list.setPage}
              onLimitChange={list.setLimit}
            />
          </Card>
        </div>
      )}

      <Modal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        size="lg"
        title={
          editing
            ? t('communication:announcements.edit')
            : t('communication:announcements.create')
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
            label={t('communication:announcements.fields.title')}
            error={form.formState.errors.title?.message}
            required
          >
            {({ id }) => <Input id={id} autoFocus {...form.register('title')} />}
          </FormField>

          <FormField
            label={t('communication:announcements.fields.body')}
            error={form.formState.errors.body?.message}
            required
          >
            {({ id }) => <Textarea id={id} rows={6} {...form.register('body')} />}
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('communication:announcements.fields.audience')} required>
              {({ id }) => (
                <Select
                  id={id}
                  options={ANNOUNCEMENT_AUDIENCES.map((item) => ({
                    value: item,
                    label: t(`communication:announcements.audience.${item}`),
                  }))}
                  {...form.register('audience')}
                />
              )}
            </FormField>

            {audience === 'GRADE' ? (
              <FormField label={t('communication:announcements.fields.gradeLevel')} required>
                {({ id }) => (
                  <Select
                    id={id}
                    placeholder={t('common:actions.select')}
                    options={options.gradeLevels.map((gradeLevel) => ({
                      value: gradeLevel.id,
                      label: gradeLevel.nameEn,
                    }))}
                    {...form.register('gradeLevelId')}
                  />
                )}
              </FormField>
            ) : null}

            {audience === 'CLASS' ? (
              <FormField label={t('communication:announcements.fields.class')} required>
                {({ id }) => (
                  <Select
                    id={id}
                    placeholder={t('common:actions.select')}
                    options={classes.map((schoolClass) => ({
                      value: schoolClass.id,
                      label: schoolClass.name,
                    }))}
                    {...form.register('classId')}
                  />
                )}
              </FormField>
            ) : null}
          </div>

          <Checkbox
            id="announcementPinned"
            label={t('communication:announcements.fields.pinned')}
            {...form.register('isPinned')}
          />

          {!editing && canPublish ? (
            <Checkbox
              id="announcementPublishNow"
              label={t('communication:announcements.actions.publish')}
              {...form.register('publishNow')}
            />
          ) : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmArchive !== null}
        icon="archive"
        title={t('communication:announcements.dialogs.archiveTitle')}
        message={t('communication:announcements.dialogs.archiveMessage')}
        confirmLabel={t('common:actions.archive')}
        onCancel={() => setConfirmArchive(null)}
        onConfirm={async () => {
          if (confirmArchive) {
            const ok = await run(
              () => announcementService.archive(confirmArchive.id),
              t('communication:announcements.toast.archived'),
            );

            if (ok) {
              list.refresh();
            }
          }

          setConfirmArchive(null);
        }}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        icon="delete"
        title={t('communication:announcements.dialogs.deleteTitle')}
        message={t('communication:announcements.dialogs.deleteMessage')}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) {
            const ok = await run(
              () => announcementService.remove(confirmDelete.id),
              t('communication:announcements.toast.deleted'),
            );

            if (ok) {
              list.refresh();
            }
          }

          setConfirmDelete(null);
        }}
      />
    </div>
  );
};
