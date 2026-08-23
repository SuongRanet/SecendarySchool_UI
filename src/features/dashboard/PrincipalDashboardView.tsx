import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, CalendarCheck, GraduationCap, UserSquare2 } from 'lucide-react';
import { dashboardService } from '@/services/admin.service';
import { useApiResource } from '@/hooks/useApiResource';
import { useLanguageStore } from '@/stores/language.store';
import { formatNumber, formatPercent } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';
import { DataTable } from '@/components/tables/DataTable';
import type { Column } from '@/components/tables/DataTable';
import { CHART_COLORS, DonutChart, SimpleBarChart, SimpleLineChart } from './charts';

interface WorkloadRow {
  teacherId: number;
  teacherName: string;
  classCount: number;
  periodCount: number;
}

export const PrincipalDashboardView = () => {
  const { t } = useTranslation(['dashboard', 'common', 'performance', 'teachers']);
  const language = useLanguageStore((state) => state.language);

  const fetcher = useCallback(() => dashboardService.principal(), []);
  const { data, isLoading, error, refresh } = useApiResource(fetcher);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? undefined} onRetry={refresh} />;
  }

  const performanceSlices = [
    {
      name: t('performance:performanceLevel.EXCELLENT'),
      value: data.performance.excellent,
      color: CHART_COLORS.success,
    },
    {
      name: t('performance:performanceLevel.GOOD'),
      value: data.performance.good,
      color: CHART_COLORS.primary,
    },
    {
      name: t('performance:performanceLevel.FAIR'),
      value: data.performance.fair,
      color: CHART_COLORS.warning,
    },
    {
      name: t('performance:performanceLevel.NEEDS_IMPROVEMENT'),
      value: data.performance.needsImprovement,
      color: CHART_COLORS.danger,
    },
  ];

  const workloadColumns: Column<WorkloadRow>[] = [
    {
      key: 'teacherName',
      header: t('teachers:title'),
      render: (row) => <span className="font-medium">{row.teacherName}</span>,
    },
    {
      key: 'classCount',
      header: t('teachers:fields.classes'),
      align: 'center',
      render: (row) => formatNumber(row.classCount, language),
    },
    {
      key: 'periodCount',
      header: t('dashboard:principal.teacherOverview'),
      align: 'center',
      render: (row) => formatNumber(row.periodCount, language),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('dashboard:principal.title')}
        description={`${t('dashboard:subtitle')} · ${data.academicYear.name}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('dashboard:principal.totalEnrollment')}
          value={formatNumber(data.counts.activeEnrollments, language)}
          icon={<GraduationCap className="size-5" />}
          tone="primary"
        />
        <StatCard
          label={t('dashboard:principal.attendanceRate')}
          value={formatPercent(data.attendanceToday.attendanceRate, language)}
          icon={<CalendarCheck className="size-5" />}
          tone={data.attendanceToday.attendanceRate >= 90 ? 'success' : 'warning'}
        />
        <StatCard
          label={t('dashboard:principal.academicPerformance')}
          value={
            data.performance.average === null
              ? '—'
              : formatPercent(data.performance.average, language)
          }
          icon={<BarChart3 className="size-5" />}
          tone="accent"
        />
        <StatCard
          label={t('dashboard:admin.totalTeachers')}
          value={formatNumber(data.counts.totalTeachers, language)}
          icon={<UserSquare2 className="size-5" />}
          tone="info"
        />
      </div>

      <Card>
        <CardHeader title={t('dashboard:admin.attendanceOverview')} />
        <CardBody>
          {data.attendanceTrend.length === 0 ? (
            <EmptyState
              title={t('dashboard:empty.noData')}
              message={t('dashboard:empty.noDataHint')}
            />
          ) : (
            <SimpleLineChart
              data={data.attendanceTrend as unknown as Record<string, unknown>[]}
              xKey="date"
              lines={[
                {
                  key: 'present',
                  name: t('dashboard:stats.present'),
                  color: CHART_COLORS.success,
                },
                { key: 'absent', name: t('dashboard:stats.absent'), color: CHART_COLORS.danger },
                { key: 'late', name: t('dashboard:stats.late'), color: CHART_COLORS.warning },
              ]}
            />
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title={t('dashboard:principal.academicPerformance')} />
          <CardBody>
            <DonutChart data={performanceSlices} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={t('dashboard:principal.classPerformance')} />
          <CardBody>
            {data.classAverages.length === 0 ? (
              <EmptyState
                title={t('dashboard:empty.noData')}
                message={t('dashboard:empty.noDataHint')}
              />
            ) : (
              <SimpleBarChart
                data={data.classAverages as unknown as Record<string, unknown>[]}
                xKey="className"
                bars={[
                  {
                    key: 'average',
                    name: t('common:labels.average'),
                    color: CHART_COLORS.violet,
                  },
                ]}
              />
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title={t('dashboard:principal.teacherOverview')} />
        <CardBody className="p-0">
          <DataTable<WorkloadRow>
            columns={workloadColumns}
            rows={data.teacherWorkload}
            rowKey={(row) => row.teacherId}
            className="rounded-none border-0"
            emptyTitle={t('dashboard:empty.noData')}
          />
        </CardBody>
      </Card>
    </div>
  );
};
