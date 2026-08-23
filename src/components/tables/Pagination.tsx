import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { PaginationMeta } from '@/types/api';
import { cn } from '@/utils/cn';
import { Select } from '@/components/ui/Select';

export interface PaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  limitOptions?: number[];
  className?: string;
}

/** Builds a compact page list such as `1 … 4 5 6 … 12`. */
const buildPageList = (page: number, totalPages: number): (number | 'gap')[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: (number | 'gap')[] = [1];

  if (page > 3) {
    pages.push('gap');
  }

  for (let candidate = Math.max(2, page - 1); candidate <= Math.min(totalPages - 1, page + 1); candidate += 1) {
    pages.push(candidate);
  }

  if (page < totalPages - 2) {
    pages.push('gap');
  }

  pages.push(totalPages);

  return pages;
};

export const Pagination = ({
  pagination,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 20, 50, 100],
  className,
}: PaginationProps) => {
  const { t } = useTranslation('common');
  const { page, limit, total, totalPages } = pagination;

  if (total === 0) {
    return null;
  }

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const pages = buildPageList(page, totalPages);

  const navButton =
    'inline-flex size-8 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-40';

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
        className,
      )}
    >
      <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
        <span>{t('pagination.showing', { from, to, total })}</span>

        {onLimitChange ? (
          <label className="hidden items-center gap-2 sm:flex">
            <span className="text-xs">{t('pagination.rowsPerPage')}</span>
            <Select
              selectSize="sm"
              value={limit}
              onChange={(event) => onLimitChange(Number(event.target.value))}
              options={limitOptions.map((option) => ({ value: option, label: String(option) }))}
              className="w-20"
            />
          </label>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className={navButton}
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          aria-label={t('pagination.firstPage')}
        >
          <ChevronsLeft className="size-4" />
        </button>

        <button
          type="button"
          className={navButton}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label={t('pagination.previousPage')}
        >
          <ChevronLeft className="size-4" />
        </button>

        <ul className="mx-1 hidden items-center gap-1 sm:flex">
          {pages.map((item, index) =>
            item === 'gap' ? (
              <li
                key={`gap-${index}`}
                aria-hidden="true"
                className="px-1 text-sm text-[var(--text-subtle)]"
              >
                …
              </li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => onPageChange(item)}
                  aria-current={item === page ? 'page' : undefined}
                  className={cn(
                    'inline-flex size-8 items-center justify-center rounded-md border text-sm transition-colors',
                    item === page
                      ? 'border-[var(--primary)] bg-[var(--primary)] font-medium text-[var(--primary-contrast)]'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]',
                  )}
                >
                  {item}
                </button>
              </li>
            ),
          )}
        </ul>

        <span className="mx-2 text-sm text-[var(--text-muted)] sm:hidden">
          {t('pagination.page', { page, totalPages })}
        </span>

        <button
          type="button"
          className={navButton}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label={t('pagination.nextPage')}
        >
          <ChevronRight className="size-4" />
        </button>

        <button
          type="button"
          className={navButton}
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          aria-label={t('pagination.lastPage')}
        >
          <ChevronsRight className="size-4" />
        </button>
      </div>
    </nav>
  );
};
