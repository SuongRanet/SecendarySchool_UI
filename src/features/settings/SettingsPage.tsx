import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { gradeService } from '@/services/performance.service';
import { ASSESSMENT_TYPES, PERFORMANCE_LEVELS } from '@/types/domain';
import type { AssessmentType, PerformanceLevel } from '@/types/domain';
import type { GradingScheme } from '@/types/entities';
import { useAcademicOptions } from '@/hooks/useAcademicOptions';
import { useApiResource } from '@/hooks/useApiResource';
import { useMutation } from '@/hooks/useMutation';
import { usePermission } from '@/hooks/usePermission';
import { LANGUAGES, useLanguageStore } from '@/stores/language.store';
import { useThemeStore } from '@/stores/theme.store';
import type { ThemeMode } from '@/stores/theme.store';
import { toast } from '@/stores/toast.store';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { ErrorState, LoadingState } from '@/components/feedback/States';

const APP_VERSION = '1.0.0';
const API_URL = import.meta.env.VITE_API_URL ?? '';

interface ComponentRow {
  assessmentType: AssessmentType;
  weightPercent: number;
}

interface ScaleRow {
  letterGrade: string;
  minScore: number;
  maxScore: number;
  gpaPoint: number | null;
  performance: PerformanceLevel;
}

type TabKey = 'grading' | 'appearance' | 'about';

export const SettingsPage = () => {
  const { t } = useTranslation(['system', 'common', 'performance']);
  const { has } = usePermission();
  const canManage = has(PERMISSIONS.SETTINGS_MANAGE, PERMISSIONS.GRADES_UPDATE_ANY);
  const { run, isRunning } = useMutation();

  const themeMode = useThemeStore((state) => state.mode);
  const setThemeMode = useThemeStore((state) => state.setMode);
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  const options = useAcademicOptions({ years: true, gradeLevels: false });
  const [tab, setTab] = useState<TabKey>('grading');
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [scales, setScales] = useState<ScaleRow[]>([]);

  const fetcher = useCallback(() => gradeService.schemes(), []);
  const schemes = useApiResource<GradingScheme[]>(fetcher);

  const defaultScheme = schemes.data?.find((scheme) => scheme.isDefault) ?? schemes.data?.[0];

  useEffect(() => {
    if (defaultScheme) {
      setComponents(defaultScheme.components);
      setScales(
        defaultScheme.scales.map((scale) => ({
          letterGrade: scale.letterGrade,
          minScore: scale.minScore,
          maxScore: scale.maxScore,
          gpaPoint: scale.gpaPoint,
          performance: scale.performance,
        })),
      );
    }
  }, [defaultScheme]);

  const totalWeight = components.reduce((sum, component) => sum + Number(component.weightPercent), 0);

  const saveScheme = async () => {
    if (!defaultScheme) {
      return;
    }

    if (Math.abs(totalWeight - 100) > 0.01) {
      toast.error(t('performance:gradingScheme.weightMustBe100'));
      return;
    }

    const ok = await run(
      () =>
        gradeService.updateScheme(defaultScheme.id, {
          components,
          scales: scales.map((scale) => ({ ...scale, remarkEn: null })),
        }),
      t('performance:gradingScheme.saved'),
    );

    if (ok) {
      schemes.refresh();
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('system:settings.title')}
        description={t('system:settings.subtitle')}
        actions={
          canManage && tab === 'grading' ? (
            <Button onClick={saveScheme} isLoading={isRunning} leftIcon={<Save className="size-4" />}>
              {t('performance:gradingScheme.save')}
            </Button>
          ) : null
        }
      />

      <Tabs
        value={tab}
        onChange={(key) => setTab(key as TabKey)}
        items={[
          { key: 'grading', label: t('system:settings.sections.grading') },
          { key: 'appearance', label: t('system:settings.sections.appearance') },
          { key: 'about', label: t('system:settings.sections.about') },
        ]}
      />

      {tab === 'grading' ? (
        schemes.isLoading ? (
          <LoadingState />
        ) : schemes.error || !defaultScheme ? (
          <ErrorState message={schemes.error ?? undefined} onRetry={schemes.refresh} />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title={t('performance:gradingScheme.components')}
                description={t('performance:gradingScheme.weightTotal', { total: totalWeight })}
              />
              <CardBody className="flex flex-col gap-3">
                {ASSESSMENT_TYPES.map((type) => {
                  const component = components.find((item) => item.assessmentType === type);

                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="min-w-0 flex-1 truncate text-sm text-[var(--text)]">
                        {t(`performance:assessments.type.${type}`)}
                      </span>

                      <Input
                        inputSize="sm"
                        type="number"
                        min={0}
                        max={100}
                        className="w-24 text-center"
                        disabled={!canManage}
                        value={component ? String(component.weightPercent) : ''}
                        aria-label={t('performance:assessments.fields.weight')}
                        onChange={(event) => {
                          const value = event.target.value;

                          setComponents((current) => {
                            const without = current.filter((item) => item.assessmentType !== type);

                            if (value === '' || Number(value) <= 0) {
                              return without;
                            }

                            return [
                              ...without,
                              { assessmentType: type, weightPercent: Number(value) },
                            ];
                          });
                        }}
                      />

                      <span className="w-4 text-xs text-[var(--text-subtle)]">%</span>
                    </div>
                  );
                })}

                {Math.abs(totalWeight - 100) > 0.01 ? (
                  <p className="rounded-lg bg-[var(--warning-soft)] p-2.5 text-xs text-[var(--warning)]">
                    {t('performance:gradingScheme.weightMustBe100')}
                  </p>
                ) : null}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={t('performance:gradingScheme.scales')} />
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-[var(--surface-muted)]">
                        {[
                          t('performance:gradingScheme.letterGrade'),
                          t('performance:gradingScheme.range'),
                          t('performance:gradingScheme.gpaPoint'),
                          t('performance:gradingScheme.performance'),
                        ].map((header) => (
                          <th
                            key={header}
                            className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {scales.map((scale, index) => (
                        <tr key={scale.letterGrade} className="border-t border-[var(--border)]">
                          <td className="px-3 py-2 font-medium">{scale.letterGrade}</td>

                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <Input
                                inputSize="sm"
                                type="number"
                                className="w-16 text-center"
                                disabled={!canManage}
                                value={String(scale.minScore)}
                                aria-label="min"
                                onChange={(event) =>
                                  setScales((current) =>
                                    current.map((item, position) =>
                                      position === index
                                        ? { ...item, minScore: Number(event.target.value) }
                                        : item,
                                    ),
                                  )
                                }
                              />
                              <span className="text-xs text-[var(--text-subtle)]">–</span>
                              <Input
                                inputSize="sm"
                                type="number"
                                className="w-16 text-center"
                                disabled={!canManage}
                                value={String(scale.maxScore)}
                                aria-label="max"
                                onChange={(event) =>
                                  setScales((current) =>
                                    current.map((item, position) =>
                                      position === index
                                        ? { ...item, maxScore: Number(event.target.value) }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            </div>
                          </td>

                          <td className="px-3 py-2">
                            <Input
                              inputSize="sm"
                              type="number"
                              step="0.5"
                              className="w-16 text-center"
                              disabled={!canManage}
                              value={scale.gpaPoint === null ? '' : String(scale.gpaPoint)}
                              aria-label="gpa"
                              onChange={(event) =>
                                setScales((current) =>
                                  current.map((item, position) =>
                                    position === index
                                      ? {
                                          ...item,
                                          gpaPoint:
                                            event.target.value === ''
                                              ? null
                                              : Number(event.target.value),
                                        }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </td>

                          <td className="px-3 py-2">
                            <Select
                              selectSize="sm"
                              disabled={!canManage}
                              value={scale.performance}
                              options={PERFORMANCE_LEVELS.map((level) => ({
                                value: level,
                                label: t(`performance:performanceLevel.${level}`),
                              }))}
                              onChange={(event) =>
                                setScales((current) =>
                                  current.map((item, position) =>
                                    position === index
                                      ? {
                                          ...item,
                                          performance: event.target.value as PerformanceLevel,
                                        }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          </div>
        )
      ) : null}

      {tab === 'appearance' ? (
        <Card>
          <CardHeader title={t('system:settings.sections.appearance')} />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label={t('system:settings.appearance.theme')}
              hint={t('system:settings.appearance.themeHint')}
            >
              {({ id }) => (
                <Select
                  id={id}
                  value={themeMode}
                  onChange={(event) => setThemeMode(event.target.value as ThemeMode)}
                  options={(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => ({
                    value: mode,
                    label: t(`common:theme.${mode}`),
                  }))}
                />
              )}
            </FormField>

            <FormField
              label={t('system:settings.appearance.language')}
              hint={t('system:settings.appearance.languageHint')}
            >
              {({ id }) => (
                <Select
                  id={id}
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as 'en' | 'kh')}
                  options={LANGUAGES.map((item) => ({
                    value: item.code,
                    label: item.nativeLabel,
                  }))}
                />
              )}
            </FormField>
          </CardBody>
        </Card>
      ) : null}

      {tab === 'about' ? (
        <Card>
          <CardHeader title={t('system:settings.sections.about')} />
          <CardBody>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[var(--text-muted)]">{t('system:settings.about.version')}</dt>
                <dd className="mt-0.5 font-medium text-[var(--text)]">{APP_VERSION}</dd>
              </div>

              <div>
                <dt className="text-[var(--text-muted)]">{t('system:settings.about.apiUrl')}</dt>
                <dd className="mt-0.5 truncate font-medium text-[var(--text)]">{API_URL}</dd>
              </div>

              <div>
                <dt className="text-[var(--text-muted)]">
                  {t('system:settings.about.activeYear')}
                </dt>
                <dd className="mt-0.5 font-medium text-[var(--text)]">
                  {options.activeYear?.name ?? '—'}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
};
