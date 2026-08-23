import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Archive, Pencil, Plus } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { gradeLevelService } from '@/services/academic.service';
import type { GradeLevel } from '@/types/entities';
import { ApiError } from '@/types/api';
import { useApiResource } from '@/hooks/useApiResource';
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
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { RowActions } from '@/components/tables/RowActions';

const buildSchema = (t: (key: string) => string) =>
  z.object({
    code: z.string().trim().min(1, t('validation:required')).max(20),
    nameEn: z.string().trim().min(1, t('validation:required')).max(100),
    nameKh: z.string().trim().max(100).optional(),
    levelOrder: z.coerce.number().int().positive(t('validation:positiveNumber')).max(20),
    isActive: z.boolean().optional(),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export const GradeLevelsPage = () => {
  const { t } = useTranslation(['academics', 'common', 'validation']);
  const language = useLanguageStore((state) => state.language);
  const { has } = usePermission();
  const canManage = has(PERMISSIONS.GRADE_LEVELS_MANAGE);
  const { run } = useMutation();

  const [editing, setEditing] = useState<GradeLevel | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<GradeLevel | null>(null);

  const fetcher = useCallback(() => gradeLevelService.list(), []);
  const { data, isLoading, error, refresh } = useApiResource(fetcher);

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: { code: '', nameEn: '', nameKh: '', levelOrder: 1, isActive: true },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      code: '',
      nameEn: '',
      nameKh: '',
      levelOrder: (data?.length ?? 0) + 1,
      isActive: true,
    });
    setFormOpen(true);
  };

  const openEdit = (gradeLevel: GradeLevel) => {
    setEditing(gradeLevel);
    form.reset({
      code: gradeLevel.code,
      nameEn: gradeLevel.nameEn,
      nameKh: gradeLevel.nameKh ?? '',
      levelOrder: gradeLevel.levelOrder,
      isActive: gradeLevel.isActive,
    });
    setFormOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = { ...values, nameKh: values.nameKh || null };

    try {
      if (editing) {
        await gradeLevelService.update(editing.id, payload);
      } else {
        await gradeLevelService.create(payload);
      }

      setFormOpen(false);
      refresh();
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

  const columns: Column<GradeLevel>[] = [
    {
      key: 'order',
      header: t('academics:gradeLevels.order'),
      align: 'center',
      width: '80px',
      render: (gradeLevel) => (
        <span className="tabular-nums text-[var(--text-muted)]">{gradeLevel.levelOrder}</span>
      ),
    },
    {
      key: 'name',
      header: t('academics:gradeLevels.nameEn'),
      render: (gradeLevel) => (
        <div>
          <p className="font-medium text-[var(--text)]">{gradeLevel.nameEn}</p>
          {gradeLevel.nameKh ? (
            <p className="font-khmer text-xs text-[var(--text-muted)]">{gradeLevel.nameKh}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'code',
      header: t('common:labels.code'),
      hideOnMobile: true,
      render: (gradeLevel) => (
        <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-xs">
          {gradeLevel.code}
        </code>
      ),
    },
    {
      key: 'classes',
      header: t('academics:classes.title'),
      align: 'center',
      hideOnMobile: true,
      render: (gradeLevel) => formatNumber(gradeLevel.classCount, language),
    },
    {
      key: 'students',
      header: t('academics:classes.students'),
      align: 'center',
      hideOnMobile: true,
      render: (gradeLevel) => formatNumber(gradeLevel.studentCount, language),
    },
    {
      key: 'active',
      header: t('common:labels.status'),
      render: (gradeLevel) => (
        <Badge tone={gradeLevel.isActive ? 'success' : 'neutral'} dot>
          {gradeLevel.isActive ? t('academics:gradeLevels.active') : t('common:labels.no')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (gradeLevel) => (
        <RowActions
          label={gradeLevel.nameEn}
          items={
            canManage
              ? [
                  {
                    key: 'edit',
                    label: t('common:actions.edit'),
                    icon: <Pencil className="size-4" />,
                    onSelect: () => openEdit(gradeLevel),
                  },
                  {
                    key: 'archive',
                    label: t('common:actions.archive'),
                    icon: <Archive className="size-4" />,
                    tone: 'danger',
                    separatorBefore: true,
                    disabled: gradeLevel.classCount > 0,
                    onSelect: () => setConfirmArchive(gradeLevel),
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
        title={t('academics:gradeLevels.title')}
        description={t('academics:gradeLevels.subtitle')}
        actions={
          canManage ? (
            <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
              {t('academics:gradeLevels.create')}
            </Button>
          ) : null
        }
      />

      <DataTable<GradeLevel>
        columns={columns}
        rows={data ?? []}
        rowKey={(gradeLevel) => gradeLevel.id}
        isLoading={isLoading}
        error={error}
        onRetry={refresh}
        emptyTitle={t('academics:gradeLevels.empty.title')}
        emptyMessage={t('academics:gradeLevels.empty.message')}
        emptyAction={
          canManage ? (
            <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
              {t('academics:gradeLevels.create')}
            </Button>
          ) : null
        }
      />

      <Modal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('academics:gradeLevels.edit') : t('academics:gradeLevels.create')}
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
                  placeholder="G1"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register('code')}
                />
              )}
            </FormField>

            <FormField
              label={t('academics:gradeLevels.order')}
              error={form.formState.errors.levelOrder?.message}
              required
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register('levelOrder')}
                />
              )}
            </FormField>
          </div>

          <FormField
            label={t('academics:gradeLevels.nameEn')}
            error={form.formState.errors.nameEn?.message}
            required
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                placeholder="Grade 1"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...form.register('nameEn')}
              />
            )}
          </FormField>

          <FormField
            label={t('academics:gradeLevels.nameKh')}
            error={form.formState.errors.nameKh?.message}
            optionalLabel={t('common:labels.optional')}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                className="font-khmer"
                placeholder="ថ្នាក់ទី១"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...form.register('nameKh')}
              />
            )}
          </FormField>

          <Checkbox
            id="gradeLevelActive"
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
              () => gradeLevelService.archive(confirmArchive.id),
              t('common:toast.archived'),
            );

            if (ok) {
              refresh();
            }
          }

          setConfirmArchive(null);
        }}
      />
    </div>
  );
};
