import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, FileCheck2, Send } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { reportCardService } from '@/services/performance.service';
import { REPORT_CARD_FILTER_STATUSES } from '@/types/domain';
import type { ReportCardSummary } from '@/types/entities';
import { useAcademicOptions, useClassOptions } from '@/hooks/useAcademicOptions';
import { useListQuery } from '@/hooks/useListQuery';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { useLanguageStore } from '@/stores/language.store';
import { toast } from '@/stores/toast.store';
import { formatPercent } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { FilterBar } from '@/components/tables/FilterBar';
import { Pagination } from '@/components/tables/Pagination';
import { RowActions } from '@/components/tables/RowActions';

export const ReportCardsPage = () => {
  const { t } = useTranslation(['performance', 'common', 'academics']);
  const navigate = useNavigate();
  const reportCardRoutes = ROUTES.reportCardsFor(useLocation().pathname);
  const language = useLanguageStore((state) => state.language);
  const { has } = usePermission();
  const { run } = useMutation();

  const canGenerate = has(PERMISSIONS.REPORT_CARDS_GENERATE);
  const canPublish = has(PERMISSIONS.REPORT_CARDS_PUBLISH);

  const options = useAcademicOptions({ years: true, gradeLevels: false });
  const { classes } = useClassOptions(options.activeYear?.id);

  const [isGenerateOpen, setGenerateOpen] = useState(false);
  const [generateClassId, setGenerateClassId] = useState('');
  const [publishNow, setPublishNow] = useState(false);
  const [confirmPublishClass, setConfirmPublishClass] = useState<string | null>(null);

  const fetcher = useCallback(
    (query: { page: number; limit: number; filters: Record<string, string> }) =>
      reportCardService.list({
        page: query.page,
        limit: query.limit,
        classId: query.filters.classId ? Number(query.filters.classId) : undefined,
        status: query.filters.status || undefined,
      }),
    [],
  );

  const list = useListQuery<ReportCardSummary>({ fetcher, filterKeys: ['classId', 'status'] });

  const columns: Column<ReportCardSummary>[] = [
    {
      key: 'student',
      header: t('performance:grades.fields.student'),
      render: (card) => (
        <div>
          <p className="font-medium text-[var(--text)]">{card.studentName}</p>
          <p className="text-xs text-[var(--text-subtle)]">
            {card.studentCode} · {card.className}
          </p>
        </div>
      ),
    },
    {
      key: 'average',
      header: t('performance:reportCards.fields.average'),
      align: 'center',
      render: (card) =>
        card.averageScore === null ? '—' : formatPercent(card.averageScore, language),
    },
    {
      key: 'grade',
      header: t('performance:reportCards.fields.grade'),
      align: 'center',
      render: (card) =>
        card.letterGrade ? (
          <Badge tone="primary" size="sm">
            {card.letterGrade}
          </Badge>
        ) : (
          '—'
        ),
    },
    {
      key: 'rank',
      header: t('performance:reportCards.fields.rank'),
      align: 'center',
      hideOnMobile: true,
      render: (card) =>
        card.rankInClass ? `${card.rankInClass} / ${card.classSize ?? '—'}` : '—',
    },
    {
      key: 'attendance',
      header: t('performance:reportCards.fields.attendance'),
      align: 'center',
      hideOnMobile: true,
      render: (card) =>
        card.attendance.percent === null
          ? '—'
          : formatPercent(card.attendance.percent, language, 0),
    },
    {
      key: 'status',
      header: t('common:labels.status'),
      render: (card) => <StatusBadge kind="reportCard" status={card.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '64px',
      render: (card) => (
        <RowActions
          label={card.studentName}
          items={[
            {
              key: 'view',
              label: t('common:actions.viewDetails'),
              icon: <Eye className="size-4" />,
              onSelect: () => navigate(reportCardRoutes.detail(card.id)),
            },
            ...(canPublish && card.status !== 'PUBLISHED'
              ? [
                  {
                    key: 'publish',
                    label: t('performance:reportCards.publishClass'),
                    icon: <Send className="size-4" />,
                    onSelect: async () => {
                      const ok = await run(
                        () => reportCardService.setStatus(card.id, 'PUBLISHED'),
                        t('performance:reportCards.toast.published'),
                      );

                      if (ok) {
                        list.refresh();
                      }
                    },
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
        title={t('performance:reportCards.title')}
        description={t('performance:reportCards.subtitle')}
        actions={
          <>
            {canPublish && list.query.filters.classId ? (
              <Button
                variant="secondary"
                onClick={() => setConfirmPublishClass(list.query.filters.classId ?? null)}
                leftIcon={<Send className="size-4" />}
              >
                {t('performance:reportCards.publishClass')}
              </Button>
            ) : null}

            {canGenerate ? (
              <Button
                onClick={() => {
                  setGenerateClassId(list.query.filters.classId ?? '');
                  setPublishNow(false);
                  setGenerateOpen(true);
                }}
                leftIcon={<FileCheck2 className="size-4" />}
              >
                {t('performance:reportCards.generate')}
              </Button>
            ) : null}
          </>
        }
      />

      <FilterBar
        isFiltered={list.isFiltered}
        onClearFilters={list.clearFilters}
        filters={
          <>
            <Select
              className="w-44"
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
              value={list.query.filters.status ?? ''}
              onChange={(event) => list.setFilter('status', event.target.value)}
              placeholder={t('common:labels.status')}
              options={REPORT_CARD_FILTER_STATUSES.map((status) => ({
                value: status,
                label: t(`performance:reportCardStatus.${status}`),
              }))}
            />
          </>
        }
      />

      <DataTable<ReportCardSummary>
        columns={columns}
        rows={list.rows}
        rowKey={(card) => card.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={list.refresh}
        isFiltered={list.isFiltered}
        onRowClick={(card) => navigate(reportCardRoutes.detail(card.id))}
        emptyTitle={t('performance:reportCards.empty.title')}
        emptyMessage={t('performance:reportCards.empty.message')}
        footer={
          <Pagination
            pagination={list.pagination}
            onPageChange={list.setPage}
            onLimitChange={list.setLimit}
          />
        }
      />

      <Modal
        open={isGenerateOpen}
        onClose={() => setGenerateOpen(false)}
        title={t('performance:reportCards.generateDialog.title')}
        description={t('performance:reportCards.generateDialog.message')}
        closeLabel={t('common:actions.close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setGenerateOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              disabled={!generateClassId}
              onClick={async () => {
                let count = 0;

                const ok = await run(async () => {
                  const generated = await reportCardService.generate({
                    classId: Number(generateClassId),
                    publish: publishNow,
                  });

                  count = generated.length;
                });

                if (ok) {
                  toast.success(t('performance:reportCards.toast.generated', { count }));
                  setGenerateOpen(false);
                  list.setFilter('classId', generateClassId);
                  list.refresh();
                }
              }}
            >
              {t('performance:reportCards.generate')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label={t('performance:assessments.fields.class')} required>
            {({ id }) => (
              <Select
                id={id}
                value={generateClassId}
                onChange={(event) => setGenerateClassId(event.target.value)}
                placeholder={t('common:actions.select')}
                options={classes.map((schoolClass) => ({
                  value: schoolClass.id,
                  label: `${schoolClass.name} · ${schoolClass.enrolledCount}`,
                }))}
              />
            )}
          </FormField>

          {canPublish ? (
            <Checkbox
              id="publishNow"
              label={t('performance:reportCards.generateDialog.publishNow')}
              checked={publishNow}
              onChange={(event) => setPublishNow(event.target.checked)}
            />
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmPublishClass !== null}
        tone="info"
        icon="info"
        title={t('performance:reportCards.publishDialog.title')}
        message={t('performance:reportCards.publishDialog.message', {
          className:
            classes.find((schoolClass) => String(schoolClass.id) === confirmPublishClass)?.name ??
            '',
        })}
        confirmLabel={t('performance:reportCards.publishClass')}
        onCancel={() => setConfirmPublishClass(null)}
        onConfirm={async () => {
          if (confirmPublishClass) {
            let published = 0;

            const ok = await run(async () => {
              const result = await reportCardService.publishClass(Number(confirmPublishClass));
              published = result.published;
            });

            if (ok) {
              toast.success(
                t('performance:reportCards.toast.classPublished', { count: published }),
              );
              list.refresh();
            }
          }

          setConfirmPublishClass(null);
        }}
      />
    </div>
  );
};
