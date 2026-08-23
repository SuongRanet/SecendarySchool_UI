import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator, History, Save } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { classService } from '@/services/academic.service';
import { gradeService } from '@/services/performance.service';
import { ApiError } from '@/types/api';
import type { CalculatedGrade, ClassSubject, Grade, GradeHistoryEntry } from '@/types/entities';
import { useAcademicOptions, useClassOptions } from '@/hooks/useAcademicOptions';
import { useApiResource } from '@/hooks/useApiResource';
import { usePermission } from '@/hooks/usePermission';
import { useLanguageStore } from '@/stores/language.store';
import { toast } from '@/stores/toast.store';
import { formatDateTime, formatPercent } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { EmptyState, LoadingState } from '@/components/feedback/States';

export const GradesPage = () => {
  const { t } = useTranslation(['performance', 'common', 'academics']);
  const language = useLanguageStore((state) => state.language);
  const { has } = usePermission();
  const canEnter = has(PERMISSIONS.GRADES_ENTER);

  const options = useAcademicOptions({ years: true, gradeLevels: false });
  const { classes } = useClassOptions(options.activeYear?.id);

  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);

  const [preview, setPreview] = useState<CalculatedGrade[] | null>(null);
  const [isCalculating, setCalculating] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [markFinal, setMarkFinal] = useState(false);
  const [historyFor, setHistoryFor] = useState<Grade | null>(null);
  const [history, setHistory] = useState<GradeHistoryEntry[]>([]);

  useEffect(() => {
    if (!classId) {
      setClassSubjects([]);
      setSubjectId('');
      return;
    }

    classService
      .listSubjects(Number(classId))
      .then(setClassSubjects)
      .catch(() => setClassSubjects([]));
  }, [classId]);

  const fetcher = useCallback(
    () =>
      classId && subjectId
        ? gradeService
            .list({ classId: Number(classId), subjectId: Number(subjectId), limit: 100 })
            .then((result) => result.items)
        : Promise.resolve([]),
    [classId, subjectId],
  );

  const grades = useApiResource<Grade[]>(fetcher, [classId, subjectId], {
    enabled: Boolean(classId && subjectId),
  });

  const calculate = async () => {
    setCalculating(true);

    try {
      const result = await gradeService.calculate({
        classId: Number(classId),
        subjectId: Number(subjectId),
      });

      setPreview(result);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : t('common:toast.failed'));
    } finally {
      setCalculating(false);
    }
  };

  const generate = async () => {
    setSaving(true);

    try {
      await gradeService.generate({
        classId: Number(classId),
        subjectId: Number(subjectId),
        isFinal: markFinal,
      });

      toast.success(t('performance:grades.toast.generated'));
      setPreview(null);
      grades.refresh();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : t('common:toast.failed'));
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (grade: Grade) => {
    setHistoryFor(grade);

    try {
      setHistory(await gradeService.history(grade.id));
    } catch {
      setHistory([]);
    }
  };

  const columns: Column<Grade>[] = [
    {
      key: 'student',
      header: t('performance:grades.fields.student'),
      render: (grade) => (
        <div>
          <p className="font-medium text-[var(--text)]">{grade.studentName}</p>
          <p className="text-xs text-[var(--text-subtle)]">{grade.studentCode}</p>
        </div>
      ),
    },
    {
      key: 'score',
      header: t('performance:grades.fields.score'),
      align: 'center',
      render: (grade) =>
        grade.percentage === null ? (
          <span className="text-[var(--text-subtle)]">{t('performance:grades.notCalculated')}</span>
        ) : (
          formatPercent(grade.percentage, language)
        ),
    },
    {
      key: 'letter',
      header: t('performance:grades.fields.letterGrade'),
      align: 'center',
      render: (grade) =>
        grade.letterGrade ? (
          <Badge tone="primary" size="sm">
            {grade.letterGrade}
          </Badge>
        ) : (
          '—'
        ),
    },
    {
      key: 'performance',
      header: t('performance:grades.fields.performance'),
      hideOnMobile: true,
      render: (grade) => <StatusBadge kind="performance" status={grade.performance} />,
    },
    {
      key: 'rank',
      header: t('performance:grades.fields.rank'),
      align: 'center',
      hideOnMobile: true,
      render: (grade) => grade.rankInClass ?? '—',
    },
    {
      key: 'final',
      header: t('performance:grades.fields.final'),
      align: 'center',
      hideOnMobile: true,
      render: (grade) => (
        <Badge tone={grade.isFinal ? 'success' : 'neutral'} size="sm">
          {grade.isFinal ? t('common:labels.yes') : t('common:labels.no')}
        </Badge>
      ),
    },
    {
      key: 'history',
      header: '',
      align: 'right',
      width: '64px',
      render: (grade) => (
        <button
          type="button"
          onClick={() => void openHistory(grade)}
          aria-label={t('performance:grades.history')}
          className="rounded-md p-1.5 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
        >
          <History className="size-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('performance:grades.title')}
        description={t('performance:grades.subtitle')}
        actions={
          canEnter && classId && subjectId ? (
            <>
              <Button
                variant="secondary"
                onClick={calculate}
                isLoading={isCalculating}
                leftIcon={<Calculator className="size-4" />}
              >
                {t('performance:grades.calculate')}
              </Button>

              <Button
                onClick={generate}
                isLoading={isSaving}
                leftIcon={<Save className="size-4" />}
              >
                {t('performance:grades.generate')}
              </Button>
            </>
          ) : null
        }
      />

      <Card>
        <CardBody className="flex flex-wrap items-end gap-4">
          <FormField label={t('performance:assessments.fields.class')} className="w-full sm:w-56">
            {({ id }) => (
              <Select
                id={id}
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                placeholder={t('common:actions.select')}
                options={classes.map((schoolClass) => ({
                  value: schoolClass.id,
                  label: schoolClass.name,
                }))}
              />
            )}
          </FormField>

          <FormField label={t('performance:assessments.fields.subject')} className="w-full sm:w-56">
            {({ id }) => (
              <Select
                id={id}
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
                placeholder={t('common:actions.select')}
                options={classSubjects.map((classSubject) => ({
                  value: classSubject.subjectId,
                  label: classSubject.subjectNameEn,
                }))}
              />
            )}
          </FormField>

          {canEnter ? (
            <Checkbox
              id="markFinal"
              label={t('performance:grades.markFinal')}
              checked={markFinal}
              onChange={(event) => setMarkFinal(event.target.checked)}
            />
          ) : null}
        </CardBody>
      </Card>

      {preview ? (
        <Card>
          <CardHeader
            title={t('performance:grades.preview')}
            description={t('performance:grades.previewHint')}
            action={
              <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>
                {t('common:actions.close')}
              </Button>
            }
          />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--surface-muted)]">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {t('performance:grades.fields.student')}
                    </th>
                    {(preview[0]?.componentBreakdown ?? []).map((component) => (
                      <th
                        key={component.assessmentType}
                        className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                      >
                        {t(`performance:assessments.type.${component.assessmentType}`)}
                        <span className="ml-1 font-normal">({component.weightPercent}%)</span>
                      </th>
                    ))}
                    <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {t('performance:grades.fields.percentage')}
                    </th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {t('performance:grades.fields.letterGrade')}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {preview.map((entry) => (
                    <tr key={entry.studentId} className="border-t border-[var(--border)]">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-[var(--text)]">{entry.studentName}</p>
                        <p className="text-xs text-[var(--text-subtle)]">{entry.studentCode}</p>
                      </td>

                      {entry.componentBreakdown.map((component) => (
                        <td
                          key={component.assessmentType}
                          className="px-3 py-2.5 text-center tabular-nums text-[var(--text-muted)]"
                        >
                          {component.percent === null
                            ? '—'
                            : formatPercent(component.percent, language, 0)}
                        </td>
                      ))}

                      <td className="px-4 py-2.5 text-center font-medium tabular-nums text-[var(--text)]">
                        {entry.percentage === null
                          ? '—'
                          : formatPercent(entry.percentage, language)}
                      </td>

                      <td className="px-4 py-2.5 text-center">
                        {entry.letterGrade ? (
                          <Badge tone="primary" size="sm">
                            {entry.letterGrade}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {!classId || !subjectId ? (
        <Card>
          <CardBody>
            <EmptyState
              title={t('performance:grades.empty.title')}
              message={t('performance:grades.empty.message')}
            />
          </CardBody>
        </Card>
      ) : grades.isLoading ? (
        <LoadingState />
      ) : (
        <DataTable<Grade>
          columns={columns}
          rows={grades.data ?? []}
          rowKey={(grade) => grade.id}
          error={grades.error}
          onRetry={grades.refresh}
          emptyTitle={t('performance:grades.empty.title')}
          emptyMessage={t('performance:grades.empty.message')}
        />
      )}

      <Modal
        open={historyFor !== null}
        onClose={() => setHistoryFor(null)}
        title={t('performance:grades.history')}
        description={historyFor?.studentName}
        closeLabel={t('common:actions.close')}
        footer={
          <Button variant="secondary" onClick={() => setHistoryFor(null)}>
            {t('common:actions.close')}
          </Button>
        }
      >
        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">
            {t('performance:grades.historyEmpty')}
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-[var(--border)] p-3 text-sm"
              >
                <p className="font-medium text-[var(--text)]">
                  {t('performance:grades.changedFrom', {
                    from: entry.oldScore ?? '—',
                    to: entry.newScore ?? '—',
                  })}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {entry.reason ?? '—'} · {entry.changedByName ?? '—'} ·{' '}
                  {formatDateTime(entry.createdAt, language)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Modal>
    </div>
  );
};
