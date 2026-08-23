/**
 * Formatting helpers. Dates arrive from the API as `YYYY-MM-DD` strings or ISO
 * timestamps and are formatted with the user's active locale.
 */

const localeOf = (language: string): string => (language === 'kh' ? 'km-KH' : 'en-GB');

const toDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  // A plain `YYYY-MM-DD` is parsed as local time so the day never shifts.
  const plainDate = /^\d{4}-\d{2}-\d{2}$/.exec(value);

  if (plainDate) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDate = (
  value: string | Date | null | undefined,
  language = 'en',
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' },
): string => {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(localeOf(language), options).format(date) : '—';
};

export const formatDateTime = (value: string | Date | null | undefined, language = 'en'): string =>
  formatDate(value, language, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatLongDate = (value: string | Date | null | undefined, language = 'en'): string =>
  formatDate(value, language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** `08:00:00` and `08:00` both render as `08:00`. */
export const formatTime = (value: string | null | undefined): string => {
  if (!value) {
    return '—';
  }

  const [hours, minutes] = value.split(':');
  return `${hours.padStart(2, '0')}:${(minutes ?? '00').padStart(2, '0')}`;
};

export const formatTimeRange = (start?: string | null, end?: string | null): string =>
  `${formatTime(start)} – ${formatTime(end)}`;

export const formatNumber = (value: number | null | undefined, language = 'en'): string =>
  value === null || value === undefined
    ? '—'
    : new Intl.NumberFormat(localeOf(language)).format(value);

export const formatPercent = (
  value: number | null | undefined,
  language = 'en',
  fractionDigits = 1,
): string =>
  value === null || value === undefined
    ? '—'
    : `${new Intl.NumberFormat(localeOf(language), {
        minimumFractionDigits: 0,
        maximumFractionDigits: fractionDigits,
      }).format(value)}%`;

export const formatScore = (
  score: number | null | undefined,
  maxScore?: number | null,
): string => {
  if (score === null || score === undefined) {
    return '—';
  }

  const rounded = Number.isInteger(score) ? String(score) : score.toFixed(2);

  return maxScore ? `${rounded} / ${maxScore}` : rounded;
};

/** `Sokha Chan` from its parts, falling back to the Khmer name when present. */
export const buildFullName = (
  firstName?: string | null,
  lastName?: string | null,
  fallback = '—',
): string => {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || fallback;
};

/** Age in whole years, used on student and teacher profiles. */
export const calculateAge = (dateOfBirth: string | null | undefined): number | null => {
  const birth = toDate(dateOfBirth);

  if (!birth) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
};

/** `2026-08-22` for an `<input type="date">` value. */
export const toDateInputValue = (value: string | Date | null | undefined): string => {
  const date = toDate(value);

  if (!date) {
    return '';
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
};

export const todayIso = (): string => toDateInputValue(new Date());

/** Relative wording such as `3 days ago`, used on notification lists. */
export const formatRelativeTime = (value: string | Date | null | undefined, language = 'en'): string => {
  const date = toDate(value);

  if (!date) {
    return '—';
  }

  const formatter = new Intl.RelativeTimeFormat(localeOf(language), { numeric: 'auto' });
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];

  for (const [unit, secondsInUnit] of units) {
    if (Math.abs(seconds) >= secondsInUnit) {
      return formatter.format(Math.round(seconds / secondsInUnit), unit);
    }
  }

  return formatter.format(seconds, 'second');
};
