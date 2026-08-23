import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { classService } from '@/services/academic.service';
import { enrollmentService } from '@/services/people.service';
import type { AcademicYear, SchoolClass } from '@/types/entities';
import { useMutation } from '@/hooks/useMutation';
import { toast } from '@/stores/toast.store';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';

export interface PromoteCohortModalProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  academicYears: AcademicYear[];
}

interface Mapping {
  fromClassId: string;
  toClassId: string;
}

/**
 * Promotes a whole cohort into the next academic year. The mapping is explicit —
 * each source class is pointed at its destination class — because the school
 * decides how classes are recomposed, not the system.
 */
export const PromoteCohortModal = ({
  open,
  onClose,
  onDone,
  academicYears,
}: PromoteCohortModalProps) => {
  const { t } = useTranslation(['operations', 'common']);
  const { run, isRunning } = useMutation();

  const [fromYearId, setFromYearId] = useState('');
  const [toYearId, setToYearId] = useState('');
  const [fromClasses, setFromClasses] = useState<SchoolClass[]>([]);
  const [toClasses, setToClasses] = useState<SchoolClass[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([{ fromClassId: '', toClassId: '' }]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const active = academicYears.find((year) => year.isActive);
    const next = academicYears
      .filter((year) => year.status !== 'CLOSED' && year.id !== active?.id)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

    setFromYearId(active ? String(active.id) : '');
    setToYearId(next ? String(next.id) : '');
    setMappings([{ fromClassId: '', toClassId: '' }]);
  }, [open, academicYears]);

  useEffect(() => {
    if (!fromYearId) {
      setFromClasses([]);
      return;
    }

    classService
      .options({ academicYearId: Number(fromYearId) })
      .then(setFromClasses)
      .catch(() => setFromClasses([]));
  }, [fromYearId]);

  useEffect(() => {
    if (!toYearId) {
      setToClasses([]);
      return;
    }

    classService
      .options({ academicYearId: Number(toYearId) })
      .then(setToClasses)
      .catch(() => setToClasses([]));
  }, [toYearId]);

  const updateMapping = (index: number, patch: Partial<Mapping>) => {
    setMappings((current) =>
      current.map((mapping, position) => (position === index ? { ...mapping, ...patch } : mapping)),
    );
  };

  const submit = async () => {
    const classMapping = mappings
      .filter((mapping) => mapping.fromClassId && mapping.toClassId)
      .map((mapping) => ({
        fromClassId: Number(mapping.fromClassId),
        toClassId: Number(mapping.toClassId),
      }));

    if (classMapping.length === 0) {
      toast.error(t('validation:selectAtLeastOne', { ns: 'validation' }));
      return;
    }

    let result: { promoted: number; skipped: number } | null = null;

    const ok = await run(async () => {
      result = await enrollmentService.promote({
        fromAcademicYearId: Number(fromYearId),
        toAcademicYearId: Number(toYearId),
        classMapping,
      });
    });

    if (ok && result) {
      toast.success(
        t('operations:enrollments.promote.result', {
          promoted: (result as { promoted: number }).promoted,
          skipped: (result as { skipped: number }).skipped,
        }),
      );
      onDone();
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t('operations:enrollments.promote.title')}
      description={t('operations:enrollments.promote.subtitle')}
      closeLabel={t('common:actions.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isRunning}>
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={submit} isLoading={isRunning} disabled={!fromYearId || !toYearId}>
            {t('operations:enrollments.promote.run')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('operations:enrollments.promote.fromYear')} required>
            {({ id }) => (
              <Select
                id={id}
                value={fromYearId}
                onChange={(event) => setFromYearId(event.target.value)}
                placeholder={t('common:actions.select')}
                options={academicYears.map((year) => ({ value: year.id, label: year.name }))}
              />
            )}
          </FormField>

          <FormField label={t('operations:enrollments.promote.toYear')} required>
            {({ id }) => (
              <Select
                id={id}
                value={toYearId}
                onChange={(event) => setToYearId(event.target.value)}
                placeholder={t('common:actions.select')}
                options={academicYears
                  .filter((year) => year.status !== 'CLOSED' && String(year.id) !== fromYearId)
                  .map((year) => ({ value: year.id, label: year.name }))}
              />
            )}
          </FormField>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-[var(--text)]">
            {t('operations:enrollments.promote.mapping')}
          </p>

          {mappings.map((mapping, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1">
                <Select
                  value={mapping.fromClassId}
                  onChange={(event) => updateMapping(index, { fromClassId: event.target.value })}
                  placeholder={t('operations:enrollments.promote.fromClass')}
                  options={fromClasses.map((schoolClass) => ({
                    value: schoolClass.id,
                    label: `${schoolClass.name} (${schoolClass.enrolledCount})`,
                  }))}
                />
              </div>

              <ArrowRight
                className="mb-2.5 size-4 shrink-0 text-[var(--text-subtle)]"
                aria-hidden="true"
              />

              <div className="flex-1">
                <Select
                  value={mapping.toClassId}
                  onChange={(event) => updateMapping(index, { toClassId: event.target.value })}
                  placeholder={t('operations:enrollments.promote.toClass')}
                  options={toClasses.map((schoolClass) => ({
                    value: schoolClass.id,
                    label: `${schoolClass.name} (${schoolClass.availableSeats})`,
                  }))}
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  setMappings((current) => current.filter((_, position) => position !== index))
                }
                disabled={mappings.length === 1}
                aria-label={t('common:actions.delete')}
                className="mb-1 rounded-md p-2 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--danger)] disabled:pointer-events-none disabled:opacity-40"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}

          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setMappings((current) => [...current, { fromClassId: '', toClassId: '' }])}
            leftIcon={<Plus className="size-4" />}
          >
            {t('operations:enrollments.promote.addMapping')}
          </Button>
        </div>

        <p className="rounded-lg bg-[var(--info-soft)] p-3 text-xs text-[var(--info)]">
          {t('operations:enrollments.promote.hint')}
        </p>
      </div>
    </Modal>
  );
};
