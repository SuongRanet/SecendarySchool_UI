import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCheck, Info, Save } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { attendanceService } from '@/services/operations.service';
import type { AttendanceEntry } from '@/services/operations.service';
import { ApiError } from '@/types/api';
import { ATTENDANCE_STATUSES } from '@/types/domain';
import type { AttendanceStatus } from '@/types/domain';
import type { AttendanceReason, AttendanceSheet } from '@/types/entities';
import { useAcademicOptions, useClassOptions } from '@/hooks/useAcademicOptions';
import { useApiResource } from '@/hooks/useApiResource';
import { usePermission } from '@/hooks/usePermission';
import { toast } from '@/stores/toast.store';
import { todayIso } from '@/utils/format';
import { cn } from '@/utils/cn';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';

interface SheetEntry {
  status: AttendanceStatus;
  reasonId: string;
  note: string;
}

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-[var(--success)] text-white border-[var(--success)]',
  ABSENT: 'bg-[var(--danger)] text-white border-[var(--danger)]',
  LATE: 'bg-[var(--warning)] text-white border-[var(--warning)]',
  EXCUSED: 'bg-[var(--info)] text-white border-[var(--info)]',
  LEAVE: 'bg-[var(--accent)] text-white border-[var(--accent)]',
};

export const AttendancePage = () => {
  const { t } = useTranslation(['attendance', 'common', 'academics']);
  const { has } = usePermission();
  const canRecord = has(PERMISSIONS.ATTENDANCE_RECORD);

  const [searchParams, setSearchParams] = useSearchParams();
  const options = useAcademicOptions({ years: true, gradeLevels: false });
  const { classes } = useClassOptions(options.activeYear?.id);

  const [classId, setClassId] = useState(searchParams.get('classId') ?? '');
  const [date, setDate] = useState(searchParams.get('date') ?? todayIso());
  const [reasons, setReasons] = useState<AttendanceReason[]>([]);
  const [entries, setEntries] = useState<Record<number, SheetEntry>>({});
  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    attendanceService
      .reasons()
      .then(setReasons)
      .catch(() => setReasons([]));
  }, []);

  // Keep the selection in the URL so a teacher can bookmark or share the sheet.
  useEffect(() => {
    const params: Record<string, string> = {};

    if (classId) {
      params.classId = classId;
    }

    if (date) {
      params.date = date;
    }

    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, date]);

  const fetcher = useCallback(
    () =>
      classId
        ? attendanceService.sheet(Number(classId), date)
        : Promise.resolve(null as unknown as AttendanceSheet),
    [classId, date],
  );

  const sheet = useApiResource<AttendanceSheet>(fetcher, [classId, date], {
    enabled: Boolean(classId),
  });

  // Seed the editable state from whatever is already recorded.
  useEffect(() => {
    if (!sheet.data) {
      setEntries({});
      return;
    }

    const seeded: Record<number, SheetEntry> = {};

    for (const student of sheet.data.students) {
      seeded[student.studentId] = {
        status: student.attendance?.status ?? 'PRESENT',
        reasonId: student.attendance?.reasonId ? String(student.attendance.reasonId) : '',
        note: student.attendance?.note ?? '',
      };
    }

    setEntries(seeded);
  }, [sheet.data]);

  const setStatus = (studentId: number, status: AttendanceStatus) => {
    setEntries((current) => ({
      ...current,
      [studentId]: { ...current[studentId], status },
    }));
  };

  const markAllPresent = () => {
    setEntries((current) => {
      const next: Record<number, SheetEntry> = {};

      for (const [studentId, entry] of Object.entries(current)) {
        next[Number(studentId)] = { ...entry, status: 'PRESENT', reasonId: '', note: '' };
      }

      return next;
    });
  };

  const save = async () => {
    if (!sheet.data) {
      return;
    }

    setSaving(true);

    const payload: AttendanceEntry[] = sheet.data.students.map((student) => {
      const entry = entries[student.studentId];

      return {
        studentId: student.studentId,
        status: entry?.status ?? 'PRESENT',
        reasonId: entry?.reasonId ? Number(entry.reasonId) : null,
        note: entry?.note || null,
      };
    });

    try {
      await attendanceService.record({
        classId: Number(classId),
        attendanceDate: date,
        entries: payload,
      });

      toast.success(t('attendance:toast.recorded'));
      sheet.refresh();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : t('common:toast.failed'));
    } finally {
      setSaving(false);
    }
  };

  const isFuture = new Date(date) > new Date(todayIso());
  const counts = ATTENDANCE_STATUSES.reduce<Record<string, number>>((accumulator, status) => {
    accumulator[status] = Object.values(entries).filter((entry) => entry.status === status).length;
    return accumulator;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('attendance:title')}
        description={t('attendance:subtitle')}
        actions={
          canRecord && sheet.data && !isFuture ? (
            <>
              <Button
                variant="secondary"
                onClick={markAllPresent}
                leftIcon={<CheckCheck className="size-4" />}
              >
                {t('attendance:sheet.markAll')}
              </Button>

              <Button onClick={save} isLoading={isSaving} leftIcon={<Save className="size-4" />}>
                {t('attendance:sheet.save')}
              </Button>
            </>
          ) : null
        }
      />

      <Card>
        <CardBody className="flex flex-wrap items-end gap-4">
          <FormField label={t('attendance:fields.class')} className="w-full sm:w-64">
            {({ id }) => (
              <Select
                id={id}
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                placeholder={t('attendance:sheet.selectClass')}
                options={classes.map((schoolClass) => ({
                  value: schoolClass.id,
                  label: `${schoolClass.name} · ${schoolClass.enrolledCount}`,
                }))}
              />
            )}
          </FormField>

          <FormField label={t('attendance:fields.date')} className="w-full sm:w-48">
            {({ id }) => (
              <Input
                id={id}
                type="date"
                max={todayIso()}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            )}
          </FormField>

          {sheet.data ? (
            <div className="flex flex-wrap gap-2">
              {ATTENDANCE_STATUSES.map((status) => (
                <span
                  key={status}
                  className="rounded-lg bg-[var(--surface-muted)] px-2.5 py-1.5 text-xs text-[var(--text-muted)]"
                >
                  {t(`attendance:status.${status}`)}:{' '}
                  <span className="font-semibold text-[var(--text)]">{counts[status] ?? 0}</span>
                </span>
              ))}
            </div>
          ) : null}
        </CardBody>
      </Card>

      {isFuture ? (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-3 text-sm text-[var(--warning)]">
          <Info className="size-4 shrink-0" aria-hidden="true" />
          {t('attendance:sheet.futureDate')}
        </div>
      ) : null}

      {!classId ? (
        <Card>
          <CardBody>
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              {t('attendance:sheet.selectClass')}
            </p>
          </CardBody>
        </Card>
      ) : sheet.isLoading ? (
        <LoadingState />
      ) : sheet.error ? (
        <ErrorState message={sheet.error} onRetry={sheet.refresh} />
      ) : !sheet.data || sheet.data.students.length === 0 ? (
        <EmptyState title={t('attendance:sheet.noStudents')} />
      ) : (
        <Card>
          <CardHeader
            title={sheet.data.className}
            description={
              sheet.data.isRecorded
                ? t('attendance:sheet.alreadyRecorded')
                : t('attendance:sheet.notRecorded')
            }
          />

          <CardBody className="p-0">
            <ul className="divide-y divide-[var(--border)]">
              {sheet.data.students.map((student) => {
                const entry = entries[student.studentId];
                const needsReason =
                  entry?.status === 'ABSENT' ||
                  entry?.status === 'EXCUSED' ||
                  entry?.status === 'LEAVE' ||
                  entry?.status === 'LATE';

                return (
                  <li key={student.studentId} className="flex flex-col gap-3 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="w-8 shrink-0 text-center text-xs tabular-nums text-[var(--text-subtle)]">
                        {student.rollNumber ?? '—'}
                      </span>

                      <Avatar name={student.fullName} src={student.profilePhoto} size="sm" />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text)]">
                          {student.fullName}
                        </p>
                        <p className="truncate text-xs text-[var(--text-subtle)]">
                          {student.studentCode}
                        </p>
                      </div>

                      {/* Status picker — large touch targets for phone use. */}
                      <div className="flex flex-wrap gap-1.5">
                        {ATTENDANCE_STATUSES.map((status) => {
                          const isSelected = entry?.status === status;

                          return (
                            <button
                              key={status}
                              type="button"
                              disabled={!canRecord || isFuture}
                              onClick={() => setStatus(student.studentId, status)}
                              aria-pressed={isSelected}
                              title={t(`attendance:status.${status}`)}
                              className={cn(
                                'min-w-11 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors',
                                'disabled:pointer-events-none disabled:opacity-50',
                                isSelected
                                  ? STATUS_STYLES[status]
                                  : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]',
                              )}
                            >
                              {t(`attendance:shortStatus.${status}`)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {needsReason ? (
                      <div className="ml-11 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Select
                          selectSize="sm"
                          value={entry?.reasonId ?? ''}
                          disabled={!canRecord || isFuture}
                          onChange={(event) =>
                            setEntries((current) => ({
                              ...current,
                              [student.studentId]: {
                                ...current[student.studentId],
                                reasonId: event.target.value,
                              },
                            }))
                          }
                          placeholder={t('attendance:sheet.reasonPlaceholder')}
                          options={reasons
                            .filter(
                              (reason) => !reason.appliesTo || reason.appliesTo === entry?.status,
                            )
                            .map((reason) => ({ value: reason.id, label: reason.nameEn }))}
                        />

                        <Input
                          inputSize="sm"
                          value={entry?.note ?? ''}
                          disabled={!canRecord || isFuture}
                          onChange={(event) =>
                            setEntries((current) => ({
                              ...current,
                              [student.studentId]: {
                                ...current[student.studentId],
                                note: event.target.value,
                              },
                            }))
                          }
                          placeholder={t('attendance:sheet.notePlaceholder')}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
