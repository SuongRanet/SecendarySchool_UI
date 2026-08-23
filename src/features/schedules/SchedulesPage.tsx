import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { PERMISSIONS } from '@/constants/permissions';
import { classService } from '@/services/academic.service';
import { scheduleService } from '@/services/operations.service';
import type { SchedulePayload } from '@/services/operations.service';
import { ApiError } from '@/types/api';
import { WEEKDAYS } from '@/types/domain';
import type { Weekday } from '@/types/domain';
import type { ClassSubject, Schedule, ScheduleConflict } from '@/types/entities';
import { useAcademicOptions, useClassOptions } from '@/hooks/useAcademicOptions';
import { useApiResource } from '@/hooks/useApiResource';
import { usePermission } from '@/hooks/usePermission';
import { toast } from '@/stores/toast.store';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { ErrorState, LoadingState } from '@/components/feedback/States';
import { WeeklyTimetable } from '@/components/schedule/WeeklyTimetable';

type ViewKey = 'class' | 'teacher' | 'room';

interface PeriodForm {
  id: number | null;
  classId: string;
  subjectId: string;
  teacherId: string;
  roomId: string;
  dayOfWeek: Weekday;
  periodNumber: string;
  startTime: string;
  endTime: string;
}

const emptyForm: PeriodForm = {
  id: null,
  classId: '',
  subjectId: '',
  teacherId: '',
  roomId: '',
  dayOfWeek: 'MONDAY',
  periodNumber: '',
  startTime: '08:00',
  endTime: '09:00',
};

export const SchedulesPage = () => {
  const { t } = useTranslation(['operations', 'common', 'academics']);
  const { has } = usePermission();
  const canManage = has(PERMISSIONS.SCHEDULES_MANAGE);

  const [searchParams, setSearchParams] = useSearchParams();
  const options = useAcademicOptions({ years: true, gradeLevels: false, rooms: true, teachers: true });

  const [view, setView] = useState<ViewKey>('class');
  const [targetId, setTargetId] = useState('');
  const { classes } = useClassOptions(options.activeYear?.id);

  const [isFormOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<PeriodForm>(emptyForm);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [isSaving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Schedule | null>(null);

  // Deep links such as `?classId=12` open the timetable of that class directly.
  useEffect(() => {
    const classId = searchParams.get('classId');

    if (classId) {
      setView('class');
      setTargetId(classId);
    }
  }, [searchParams]);

  const query = useMemo(() => {
    if (!targetId) {
      return null;
    }

    if (view === 'class') {
      return { classId: Number(targetId) };
    }

    if (view === 'teacher') {
      return { teacherId: Number(targetId) };
    }

    return { roomId: Number(targetId) };
  }, [view, targetId]);

  const fetcher = useCallback(
    () => (query ? scheduleService.list({ ...query, isActive: true }) : Promise.resolve([])),
    [query],
  );

  const schedule = useApiResource<Schedule[]>(fetcher, [JSON.stringify(query)], {
    enabled: query !== null,
  });

  const loadClassSubjects = async (classId: string) => {
    if (!classId) {
      setClassSubjects([]);
      return;
    }

    try {
      setClassSubjects(await classService.listSubjects(Number(classId)));
    } catch {
      setClassSubjects([]);
    }
  };

  const openCreate = () => {
    const classId = view === 'class' && targetId ? targetId : '';
    setForm({ ...emptyForm, classId });
    setConflicts([]);
    void loadClassSubjects(classId);
    setFormOpen(true);
  };

  const openEdit = (period: Schedule) => {
    setForm({
      id: period.id,
      classId: String(period.classId),
      subjectId: String(period.subjectId),
      teacherId: period.teacherId ? String(period.teacherId) : '',
      roomId: period.roomId ? String(period.roomId) : '',
      dayOfWeek: period.dayOfWeek,
      periodNumber: period.periodNumber ? String(period.periodNumber) : '',
      startTime: period.startTime.slice(0, 5),
      endTime: period.endTime.slice(0, 5),
    });
    setConflicts([]);
    void loadClassSubjects(String(period.classId));
    setFormOpen(true);
  };

  /** Asks the API whether the slot is free before the teacher commits to it. */
  const checkConflicts = async (next: PeriodForm) => {
    if (!next.classId || !next.startTime || !next.endTime) {
      setConflicts([]);
      return;
    }

    try {
      const result = await scheduleService.checkConflicts({
        classId: Number(next.classId),
        dayOfWeek: next.dayOfWeek,
        startTime: next.startTime,
        endTime: next.endTime,
        teacherId: next.teacherId ? Number(next.teacherId) : null,
        roomId: next.roomId ? Number(next.roomId) : null,
        excludeScheduleId: next.id ?? undefined,
      });

      setConflicts(result.conflicts);
    } catch {
      setConflicts([]);
    }
  };

  const updateForm = (patch: Partial<PeriodForm>) => {
    const next = { ...form, ...patch };
    setForm(next);

    if (patch.classId !== undefined) {
      void loadClassSubjects(next.classId);
    }

    void checkConflicts(next);
  };

  const save = async (ignoreWarnings = false) => {
    setSaving(true);

    const payload: SchedulePayload = {
      classId: Number(form.classId),
      subjectId: Number(form.subjectId),
      teacherId: form.teacherId ? Number(form.teacherId) : null,
      roomId: form.roomId ? Number(form.roomId) : null,
      dayOfWeek: form.dayOfWeek,
      periodNumber: form.periodNumber ? Number(form.periodNumber) : null,
      startTime: form.startTime,
      endTime: form.endTime,
      ignoreWarnings,
    };

    try {
      if (form.id) {
        await scheduleService.update(form.id, payload);
        toast.success(t('operations:schedules.toast.updated'));
      } else {
        await scheduleService.create(payload);
        toast.success(t('operations:schedules.toast.created'));
      }

      setFormOpen(false);
      schedule.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        const details = caught.details as { conflicts?: ScheduleConflict[] } | undefined;

        if (details?.conflicts) {
          setConflicts(details.conflicts);
        }

        toast.error(caught.message);
      } else {
        toast.error(t('common:toast.failed'));
      }
    } finally {
      setSaving(false);
    }
  };

  const blockingConflicts = conflicts.filter((conflict) => conflict.kind !== 'ROOM');
  const roomConflicts = conflicts.filter((conflict) => conflict.kind === 'ROOM');

  const targetOptions =
    view === 'class'
      ? classes.map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.name }))
      : view === 'teacher'
        ? options.teachers.map((teacher) => ({ value: teacher.id, label: teacher.fullName }))
        : options.rooms.map((room) => ({ value: room.id, label: room.name }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('operations:schedules.title')}
        description={t('operations:schedules.subtitle')}
        actions={
          canManage ? (
            <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
              {t('operations:schedules.create')}
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          className="border-b-0"
          value={view}
          onChange={(key) => {
            setView(key as ViewKey);
            setTargetId('');
            setSearchParams({}, { replace: true });
          }}
          items={[
            { key: 'class', label: t('operations:schedules.views.class') },
            { key: 'teacher', label: t('operations:schedules.views.teacher') },
            { key: 'room', label: t('operations:schedules.views.room') },
          ]}
        />

        <Select
          className="w-56"
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
          placeholder={t('common:actions.select')}
          options={targetOptions}
        />
      </div>

      {!targetId ? (
        <Card>
          <CardBody>
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              {t('operations:schedules.noSelection')}
            </p>
          </CardBody>
        </Card>
      ) : schedule.isLoading ? (
        <LoadingState />
      ) : schedule.error ? (
        <ErrorState message={schedule.error} onRetry={schedule.refresh} />
      ) : (
        <WeeklyTimetable
          periods={schedule.data ?? []}
          showClass={view !== 'class'}
          showTeacher={view !== 'teacher'}
          onSelect={canManage ? openEdit : undefined}
        />
      )}

      <Modal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        size="lg"
        title={form.id ? t('operations:schedules.edit') : t('operations:schedules.create')}
        closeLabel={t('common:actions.close')}
        footer={
          <>
            {form.id ? (
              <Button
                variant="ghost"
                className="mr-auto text-[var(--danger)]"
                onClick={() => {
                  const period = (schedule.data ?? []).find((item) => item.id === form.id);

                  if (period) {
                    setConfirmDelete(period);
                  }
                }}
                leftIcon={<Trash2 className="size-4" />}
              >
                {t('common:actions.delete')}
              </Button>
            ) : null}

            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              {t('common:actions.cancel')}
            </Button>

            {roomConflicts.length > 0 && blockingConflicts.length === 0 ? (
              <Button variant="danger" onClick={() => void save(true)} isLoading={isSaving}>
                {t('operations:schedules.conflicts.saveAnyway')}
              </Button>
            ) : (
              <Button
                onClick={() => void save(false)}
                isLoading={isSaving}
                disabled={blockingConflicts.length > 0 || !form.classId || !form.subjectId}
              >
                {t('common:actions.save')}
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('operations:schedules.fields.class')} required>
              {({ id }) => (
                <Select
                  id={id}
                  value={form.classId}
                  onChange={(event) => updateForm({ classId: event.target.value, subjectId: '' })}
                  placeholder={t('common:actions.select')}
                  options={classes.map((schoolClass) => ({
                    value: schoolClass.id,
                    label: schoolClass.name,
                  }))}
                />
              )}
            </FormField>

            <FormField label={t('operations:schedules.fields.subject')} required>
              {({ id }) => (
                <Select
                  id={id}
                  value={form.subjectId}
                  onChange={(event) => {
                    const selected = classSubjects.find(
                      (item) => String(item.subjectId) === event.target.value,
                    );

                    updateForm({
                      subjectId: event.target.value,
                      teacherId: selected?.teacherId ? String(selected.teacherId) : form.teacherId,
                    });
                  }}
                  placeholder={t('common:actions.select')}
                  options={classSubjects.map((classSubject) => ({
                    value: classSubject.subjectId,
                    label: classSubject.subjectNameEn,
                  }))}
                />
              )}
            </FormField>

            <FormField label={t('operations:schedules.fields.teacher')}>
              {({ id }) => (
                <Select
                  id={id}
                  value={form.teacherId}
                  onChange={(event) => updateForm({ teacherId: event.target.value })}
                  placeholder={t('academics:subjects.noTeacher')}
                  options={options.teachers.map((teacher) => ({
                    value: teacher.id,
                    label: teacher.fullName,
                  }))}
                />
              )}
            </FormField>

            <FormField label={t('operations:schedules.fields.room')}>
              {({ id }) => (
                <Select
                  id={id}
                  value={form.roomId}
                  onChange={(event) => updateForm({ roomId: event.target.value })}
                  placeholder={t('academics:rooms.title')}
                  options={options.rooms.map((room) => ({ value: room.id, label: room.name }))}
                />
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FormField label={t('operations:schedules.fields.day')} required>
              {({ id }) => (
                <Select
                  id={id}
                  value={form.dayOfWeek}
                  onChange={(event) => updateForm({ dayOfWeek: event.target.value as Weekday })}
                  options={WEEKDAYS.map((day) => ({
                    value: day,
                    label: t(`common:weekdays.${day}`),
                  }))}
                />
              )}
            </FormField>

            <FormField label={t('operations:schedules.fields.period')}>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  value={form.periodNumber}
                  onChange={(event) => updateForm({ periodNumber: event.target.value })}
                />
              )}
            </FormField>

            <FormField label={t('operations:schedules.fields.startTime')} required>
              {({ id }) => (
                <Input
                  id={id}
                  type="time"
                  value={form.startTime}
                  onChange={(event) => updateForm({ startTime: event.target.value })}
                />
              )}
            </FormField>

            <FormField label={t('operations:schedules.fields.endTime')} required>
              {({ id }) => (
                <Input
                  id={id}
                  type="time"
                  value={form.endTime}
                  onChange={(event) => updateForm({ endTime: event.target.value })}
                />
              )}
            </FormField>
          </div>

          {/* Conflict feedback, evaluated by the server as the form changes. */}
          {conflicts.length === 0 && form.classId ? (
            <p className="rounded-lg bg-[var(--success-soft)] p-3 text-sm text-[var(--success)]">
              {t('operations:schedules.conflicts.none')}
            </p>
          ) : null}

          {conflicts.length > 0 ? (
            <div
              className={
                blockingConflicts.length > 0
                  ? 'rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-3'
                  : 'rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-3'
              }
            >
              <p
                className={
                  blockingConflicts.length > 0
                    ? 'flex items-center gap-2 text-sm font-medium text-[var(--danger)]'
                    : 'flex items-center gap-2 text-sm font-medium text-[var(--warning)]'
                }
              >
                <AlertTriangle className="size-4" aria-hidden="true" />
                {t('operations:schedules.conflicts.title')}
              </p>

              <ul className="mt-2 flex flex-col gap-1 text-xs">
                {conflicts.map((conflict) => (
                  <li key={`${conflict.kind}-${conflict.scheduleId}`}>
                    <span className="font-medium">
                      {t(`operations:schedules.conflicts.${conflict.kind.toLowerCase()}`)}:
                    </span>{' '}
                    {conflict.message}
                  </li>
                ))}
              </ul>

              <p className="mt-2 text-xs">
                {blockingConflicts.length > 0
                  ? t('operations:schedules.conflicts.blocked')
                  : t('operations:schedules.conflicts.warningRoom')}
              </p>
            </div>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        icon="delete"
        title={t('operations:schedules.dialogs.deleteTitle')}
        message={t('operations:schedules.dialogs.deleteMessage', {
          subject: confirmDelete?.subjectName ?? '',
          day: confirmDelete ? t(`common:weekdays.${confirmDelete.dayOfWeek}`) : '',
          time: confirmDelete?.startTime ?? '',
        })}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) {
            try {
              await scheduleService.remove(confirmDelete.id);
              toast.success(t('operations:schedules.toast.deleted'));
              setFormOpen(false);
              schedule.refresh();
            } catch (caught) {
              toast.error(caught instanceof ApiError ? caught.message : t('common:toast.failed'));
            }
          }

          setConfirmDelete(null);
        }}
      />
    </div>
  );
};
