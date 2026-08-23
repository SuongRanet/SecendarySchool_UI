import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Printer, Save, Send } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { reportCardService } from '@/services/performance.service';
import type { ReportCard } from '@/types/entities';
import { useApiResource } from '@/hooks/useApiResource';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { useLanguageStore } from '@/stores/language.store';
import { formatDate, formatPercent, formatScore } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Textarea } from '@/components/ui/Select';
import { ErrorState, LoadingState } from '@/components/feedback/States';

const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'Primary School';

export const ReportCardDetailPage = () => {
  const { t } = useTranslation(['performance', 'common', 'students']);
  const params = useParams();
  const reportCardId = Number(params.id);
  const language = useLanguageStore((state) => state.language);
  const { has } = usePermission();
  const { run, isRunning } = useMutation();

  const canEdit = has(PERMISSIONS.REPORT_CARDS_GENERATE);
  const canPublish = has(PERMISSIONS.REPORT_CARDS_PUBLISH);

  const [teacherComment, setTeacherComment] = useState('');
  const [homeroomComment, setHomeroomComment] = useState('');
  const [principalComment, setPrincipalComment] = useState('');

  const fetcher = useCallback(() => reportCardService.getById(reportCardId), [reportCardId]);
  const reportCard = useApiResource<ReportCard>(fetcher, [reportCardId]);

  useEffect(() => {
    if (reportCard.data) {
      setTeacherComment(reportCard.data.teacherComment ?? '');
      setHomeroomComment(reportCard.data.homeroomComment ?? '');
      setPrincipalComment(reportCard.data.principalComment ?? '');
    }
  }, [reportCard.data]);

  if (reportCard.isLoading) {
    return <LoadingState />;
  }

  if (reportCard.error || !reportCard.data) {
    return (
      <ErrorState
        variant={reportCard.errorStatus === 403 ? 'forbidden' : 'error'}
        message={reportCard.error ?? undefined}
        onRetry={reportCard.refresh}
      />
    );
  }

  const card = reportCard.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="no-print">
        <PageHeader
          title={t('performance:reportCards.title')}
          description={`${card.studentName} · ${card.className} · ${
            card.termName ?? card.academicYearName
          }`}
          breadcrumbs={[
            { label: t('performance:reportCards.title'), to: ROUTES.reportCards },
            { label: card.studentName },
          ]}
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => window.print()}
                leftIcon={<Printer className="size-4" />}
              >
                {t('performance:reportCards.print')}
              </Button>

              {canEdit ? (
                <Button
                  variant="secondary"
                  isLoading={isRunning}
                  onClick={async () => {
                    const ok = await run(
                      () =>
                        reportCardService.update(card.id, {
                          teacherComment: teacherComment || null,
                          homeroomComment: homeroomComment || null,
                          principalComment: principalComment || null,
                        }),
                      t('performance:reportCards.toast.updated'),
                    );

                    if (ok) {
                      reportCard.refresh();
                    }
                  }}
                  leftIcon={<Save className="size-4" />}
                >
                  {t('common:actions.save')}
                </Button>
              ) : null}

              {canPublish && card.status !== 'PUBLISHED' ? (
                <Button
                  onClick={async () => {
                    const ok = await run(
                      () => reportCardService.setStatus(card.id, 'PUBLISHED'),
                      t('performance:reportCards.toast.published'),
                    );

                    if (ok) {
                      reportCard.refresh();
                    }
                  }}
                  leftIcon={<Send className="size-4" />}
                >
                  {t('performance:reportCards.publishClass')}
                </Button>
              ) : null}
            </>
          }
        />
      </div>

      {/* The printable document. */}
      <Card className="print:border-0 print:shadow-none">
        <CardBody className="flex flex-col gap-6">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <h1 className="text-xl font-semibold text-[var(--text)]">{APP_NAME}</h1>
              <p className="text-sm text-[var(--text-muted)]">
                {t('performance:reportCards.title')} · {card.academicYearName}
                {card.termName ? ` · ${card.termName}` : ''}
              </p>
            </div>

            <div className="no-print">
              <StatusBadge kind="reportCard" status={card.status} />
            </div>
          </header>

          <section className="flex flex-wrap items-center gap-4">
            <Avatar name={card.studentName} src={card.studentPhoto} size="lg" />

            <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              {[
                [t('students:fields.firstNameEn'), card.studentName],
                [t('students:fields.studentCode'), card.studentCode],
                [t('students:fields.currentClass'), card.className],
                [t('students:fields.gradeLevel'), card.gradeLevelName],
                [t('students:fields.dateOfBirth'), formatDate(card.dateOfBirth, language)],
                [
                  t('academics:classes.homeroomTeacher', { ns: 'academics' }),
                  card.homeroomTeacherName ?? '—',
                ],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
                  <dd className="font-medium text-[var(--text)]">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Subject results */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-[var(--text)]">
              {t('performance:reportCards.fields.subject')}
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--surface-muted)]">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {t('performance:reportCards.fields.subject')}
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {t('performance:reportCards.fields.score')}
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {t('performance:grades.fields.percentage')}
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {t('performance:reportCards.fields.grade')}
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {t('performance:grades.fields.rank')}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {card.subjects.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-sm text-[var(--text-subtle)]"
                      >
                        {t('performance:grades.empty.title')}
                      </td>
                    </tr>
                  ) : (
                    card.subjects.map((subject) => (
                      <tr key={subject.subjectId} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2">
                          <p className="font-medium text-[var(--text)]">{subject.subjectName}</p>
                          {subject.subjectNameKh ? (
                            <p className="font-khmer text-xs text-[var(--text-muted)]">
                              {subject.subjectNameKh}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {formatScore(subject.score, subject.maxScore)}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {subject.percentage === null
                            ? '—'
                            : formatPercent(subject.percentage, language)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {subject.letterGrade ? (
                            <Badge tone="primary" size="sm">
                              {subject.letterGrade}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {subject.rankInClass ?? '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Summary and attendance */}
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              [
                t('performance:reportCards.fields.average'),
                card.averageScore === null ? '—' : formatPercent(card.averageScore, language),
              ],
              [t('performance:reportCards.fields.gpa'), card.gpa ?? '—'],
              [
                t('performance:reportCards.fields.rank'),
                card.rankInClass ? `${card.rankInClass} / ${card.classSize ?? '—'}` : '—',
              ],
              [
                t('performance:reportCards.fields.attendance'),
                card.attendance.percent === null
                  ? '—'
                  : formatPercent(card.attendance.percent, language, 0),
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-lg border border-[var(--border)] p-3 text-center"
              >
                <p className="text-xs text-[var(--text-muted)]">{label}</p>
                <p className="mt-1 text-lg font-semibold text-[var(--text)]">{value}</p>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            {[
              [t('dashboard:stats.present', { ns: 'dashboard' }), card.attendance.present],
              [t('dashboard:stats.absent', { ns: 'dashboard' }), card.attendance.absent],
              [t('dashboard:stats.late', { ns: 'dashboard' }), card.attendance.late],
              [t('dashboard:stats.excused', { ns: 'dashboard' }), card.attendance.excused],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded bg-[var(--surface-muted)] px-2 py-1.5">
                <span className="text-[var(--text-muted)]">{label}: </span>
                <span className="font-semibold text-[var(--text)]">{value}</span>
              </div>
            ))}
          </section>

          {/* Comments */}
          <section className="flex flex-col gap-4">
            {[
              {
                key: 'teacher',
                label: t('performance:reportCards.fields.teacherComment'),
                value: teacherComment,
                setValue: setTeacherComment,
              },
              {
                key: 'homeroom',
                label: t('performance:reportCards.fields.homeroomComment'),
                value: homeroomComment,
                setValue: setHomeroomComment,
              },
              {
                key: 'principal',
                label: t('performance:reportCards.fields.principalComment'),
                value: principalComment,
                setValue: setPrincipalComment,
              },
            ].map((comment) => (
              <div key={comment.key}>
                <p className="mb-1 text-sm font-medium text-[var(--text)]">{comment.label}</p>

                {canEdit ? (
                  <Textarea
                    className="no-print"
                    rows={2}
                    value={comment.value}
                    onChange={(event) => comment.setValue(event.target.value)}
                  />
                ) : null}

                <p
                  className={
                    canEdit
                      ? 'hidden min-h-10 rounded border border-[var(--border)] p-2 text-sm print:block'
                      : 'min-h-10 rounded border border-[var(--border)] p-2 text-sm text-[var(--text)]'
                  }
                >
                  {comment.value || '—'}
                </p>
              </div>
            ))}
          </section>

          <footer className="border-t border-[var(--border)] pt-4 text-xs text-[var(--text-subtle)]">
            {card.publishedAt
              ? `${t('performance:reportCardStatus.PUBLISHED')} · ${formatDate(
                  card.publishedAt,
                  language,
                )}`
              : card.generatedAt
                ? formatDate(card.generatedAt, language)
                : ''}
          </footer>
        </CardBody>
      </Card>
    </div>
  );
};
