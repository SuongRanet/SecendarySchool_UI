import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, Save, Users } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { assessmentService } from '@/services/performance.service';
import { ApiError } from '@/types/api';
import type { Assessment, AssessmentResult, AssessmentStatistics } from '@/types/entities';
import { useApiResource } from '@/hooks/useApiResource';
import { usePermission } from '@/hooks/usePermission';
import { useLanguageStore } from '@/stores/language.store';
import { toast } from '@/stores/toast.store';
import { formatDate, formatPercent, formatScore } from '@/utils/format';
import { cn } from '@/utils/cn';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { StatCard } from '@/components/ui/StatCard';
import { ErrorState, LoadingState } from '@/components/feedback/States';

interface ScoreEntry {
  score: string;
  isAbsent: boolean;
  feedback: string;
}

export const AssessmentDetailPage = () => {
  const { t } = useTranslation(['performance', 'common']);
  const params = useParams();
  const assessmentId = Number(params.id);
  const language = useLanguageStore((state) => state.language);
  const { has } = usePermission();
  const canGrade = has(PERMISSIONS.ASSESSMENTS_GRADE);

  const [entries, setEntries] = useState<Record<number, ScoreEntry>>({});
  const [isSaving, setSaving] = useState(false);

  const assessmentFetcher = useCallback(
    () => assessmentService.getById(assessmentId),
    [assessmentId],
  );
  const assessment = useApiResource<Assessment>(assessmentFetcher, [assessmentId]);

  const resultsFetcher = useCallback(
    () => assessmentService.listResults(assessmentId),
    [assessmentId],
  );
  const results = useApiResource<AssessmentResult[]>(resultsFetcher, [assessmentId]);

  const statsFetcher = useCallback(
    () => assessmentService.statistics(assessmentId),
    [assessmentId],
  );
  const statistics = useApiResource<AssessmentStatistics>(statsFetcher, [assessmentId]);

  useEffect(() => {
    if (!results.data) {
      return;
    }

    const seeded: Record<number, ScoreEntry> = {};

    for (const result of results.data) {
      seeded[result.studentId] = {
        score: result.score === null ? '' : String(result.score),
        isAbsent: result.isAbsent,
        feedback: result.feedback ?? '',
      };
    }

    setEntries(seeded);
  }, [results.data]);

  if (assessment.isLoading) {
    return <LoadingState />;
  }

  if (assessment.error || !assessment.data) {
    return (
      <ErrorState
        variant={assessment.errorStatus === 403 ? 'forbidden' : 'error'}
        message={assessment.error ?? undefined}
        onRetry={assessment.refresh}
      />
    );
  }

  const record = assessment.data;
  const maxScore = record.maxScore;

  const save = async () => {
    setSaving(true);

    const payload = Object.entries(entries).map(([studentId, entry]) => ({
      studentId: Number(studentId),
      score: entry.isAbsent || entry.score === '' ? null : Number(entry.score),
      isAbsent: entry.isAbsent,
      feedback: entry.feedback || null,
    }));

    try {
      await assessmentService.saveResults(assessmentId, payload);
      toast.success(t('performance:assessments.toast.resultsSaved'));
      results.refresh();
      statistics.refresh();
      assessment.refresh();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : t('common:toast.failed'));
    } finally {
      setSaving(false);
    }
  };

  const gradedCount = Object.values(entries).filter(
    (entry) => entry.isAbsent || entry.score !== '',
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={record.title}
        description={`${record.className} · ${record.subjectName} · ${t(
          `performance:assessments.type.${record.type}`,
        )}`}
        breadcrumbs={[
          { label: t('performance:assessments.title'), to: ROUTES.assessments },
          { label: record.title },
        ]}
        actions={
          canGrade ? (
            <Button onClick={save} isLoading={isSaving} leftIcon={<Save className="size-4" />}>
              {t('performance:assessments.results.save')}
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('performance:assessments.results.progress', {
            graded: gradedCount,
            total: record.studentCount,
          })}
          value={`${gradedCount}/${record.studentCount}`}
          icon={<Users className="size-5" />}
          tone={gradedCount >= record.studentCount ? 'success' : 'warning'}
        />
        <StatCard
          label={t('performance:assessments.statistics.average')}
          value={
            statistics.data?.averagePercent === null || statistics.data === null
              ? '—'
              : formatPercent(statistics.data.averagePercent, language)
          }
          icon={<BarChart3 className="size-5" />}
          tone="primary"
          isLoading={statistics.isLoading}
        />
        <StatCard
          label={t('performance:assessments.statistics.highest')}
          value={formatScore(statistics.data?.highestScore ?? null, maxScore)}
          tone="success"
          isLoading={statistics.isLoading}
        />
        <StatCard
          label={t('performance:assessments.statistics.lowest')}
          value={formatScore(statistics.data?.lowestScore ?? null, maxScore)}
          tone="danger"
          isLoading={statistics.isLoading}
        />
      </div>

      <Card>
        <CardHeader
          title={t('performance:assessments.results.title')}
          description={`${t('performance:assessments.fields.maxScore')}: ${maxScore}${
            record.assessmentDate ? ` · ${formatDate(record.assessmentDate, language)}` : ''
          }`}
          action={
            record.isPublished ? (
              <Badge tone="success" size="sm">
                {t('performance:assessments.fields.published')}
              </Badge>
            ) : null
          }
        />

        <CardBody className="p-0">
          {results.isLoading ? (
            <LoadingState compact />
          ) : results.error ? (
            <ErrorState message={results.error} onRetry={results.refresh} />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {(results.data ?? []).map((result) => {
                const entry = entries[result.studentId];
                const scoreValue = entry?.score ?? '';
                const invalid =
                  scoreValue !== '' && (Number(scoreValue) < 0 || Number(scoreValue) > maxScore);

                return (
                  <li
                    key={result.studentId}
                    className="flex flex-wrap items-center gap-3 px-4 py-3"
                  >
                    <span className="w-8 shrink-0 text-center text-xs tabular-nums text-[var(--text-subtle)]">
                      {result.rollNumber ?? '—'}
                    </span>

                    <Avatar name={result.studentName} src={result.profilePhoto} size="sm" />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text)]">
                        {result.studentName}
                      </p>
                      <p className="truncate text-xs text-[var(--text-subtle)]">
                        {result.studentCode}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        inputSize="sm"
                        type="number"
                        min={0}
                        max={maxScore}
                        step="0.5"
                        className={cn('w-24 text-center', invalid && 'border-[var(--danger)]')}
                        disabled={!canGrade || entry?.isAbsent}
                        value={scoreValue}
                        aria-invalid={invalid}
                        aria-label={t('performance:assessments.results.score')}
                        onChange={(event) =>
                          setEntries((current) => ({
                            ...current,
                            [result.studentId]: {
                              ...current[result.studentId],
                              score: event.target.value,
                            },
                          }))
                        }
                      />

                      <span className="text-xs text-[var(--text-subtle)]">
                        / {maxScore}
                      </span>
                    </div>

                    <Checkbox
                      id={`absent-${result.studentId}`}
                      label={t('performance:assessments.results.absent')}
                      disabled={!canGrade}
                      checked={entry?.isAbsent ?? false}
                      onChange={(event) =>
                        setEntries((current) => ({
                          ...current,
                          [result.studentId]: {
                            ...current[result.studentId],
                            isAbsent: event.target.checked,
                            score: event.target.checked ? '' : current[result.studentId].score,
                          },
                        }))
                      }
                    />

                    <Input
                      inputSize="sm"
                      className="w-full sm:w-56"
                      disabled={!canGrade}
                      value={entry?.feedback ?? ''}
                      placeholder={t('performance:assessments.results.feedback')}
                      onChange={(event) =>
                        setEntries((current) => ({
                          ...current,
                          [result.studentId]: {
                            ...current[result.studentId],
                            feedback: event.target.value,
                          },
                        }))
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
