import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';
import { WEEKDAYS } from '@/types/domain';
import type { Weekday } from '@/types/domain';
import type { Schedule } from '@/types/entities';
import { formatTimeRange } from '@/utils/format';
import { cn } from '@/utils/cn';
import { EmptyState } from '@/components/feedback/States';

export interface WeeklyTimetableProps {
  periods: Schedule[];
  /** Renders the teacher instead of the class, for a class-scoped timetable. */
  showTeacher?: boolean;
  showClass?: boolean;
  onSelect?: (period: Schedule) => void;
  emptyMessage?: string;
}

const WEEKDAY_ORDER: Weekday[] = [...WEEKDAYS];

/**
 * The weekly grid. On mobile it collapses into a day-by-day list, which is what
 * a teacher actually needs when checking the next period on a phone.
 */
export const WeeklyTimetable = ({
  periods,
  showTeacher = true,
  showClass = false,
  onSelect,
  emptyMessage,
}: WeeklyTimetableProps) => {
  const { t } = useTranslation(['operations', 'common']);
  const today = WEEKDAY_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  const byDay = WEEKDAY_ORDER.map((day) => ({
    day,
    periods: periods
      .filter((period) => period.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));

  const activeDays = byDay.filter((entry) => entry.periods.length > 0);

  if (periods.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="size-6" />}
        title={t('operations:schedules.empty.title')}
        message={emptyMessage ?? t('operations:schedules.empty.message')}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {(activeDays.length > 0 ? activeDays : byDay).map((entry) => (
        <section
          key={entry.day}
          className={cn(
            'rounded-xl border bg-[var(--surface)] p-3',
            entry.day === today
              ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]/20'
              : 'border-[var(--border)]',
          )}
        >
          <header className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text)]">
              {t(`common:weekdays.${entry.day}`)}
            </h3>

            {entry.day === today ? (
              <span className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--primary)]">
                {t('operations:schedules.today')}
              </span>
            ) : null}
          </header>

          {entry.periods.length === 0 ? (
            <p className="py-3 text-center text-xs text-[var(--text-subtle)]">
              {t('operations:schedules.emptyDay')}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {entry.periods.map((period) => {
                const body = (
                  <>
                    <span className="block text-xs font-medium tabular-nums text-[var(--text-muted)]">
                      {formatTimeRange(period.startTime, period.endTime)}
                      {period.periodNumber ? ` · ${period.periodNumber}` : ''}
                    </span>

                    <span className="mt-0.5 block truncate text-sm font-medium text-[var(--text)]">
                      {period.subjectName}
                    </span>

                    <span className="mt-0.5 block truncate text-xs text-[var(--text-subtle)]">
                      {showClass ? period.className : null}
                      {showClass && showTeacher && period.teacherName ? ' · ' : null}
                      {showTeacher ? period.teacherName ?? '' : null}
                      {period.roomName ? ` · ${period.roomName}` : ''}
                    </span>
                  </>
                );

                return (
                  <li key={period.id}>
                    {onSelect ? (
                      <button
                        type="button"
                        onClick={() => onSelect(period)}
                        className="w-full rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-left transition-colors hover:bg-[var(--surface-hover)]"
                      >
                        {body}
                      </button>
                    ) : (
                      <div className="rounded-lg bg-[var(--surface-muted)] px-3 py-2">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
};
