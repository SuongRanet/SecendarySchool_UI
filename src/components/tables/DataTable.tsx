import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';

export interface Column<T> {
  /** Stable key; also the sort column sent to the API when `sortable` is set. */
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  /** Hidden below the `md` breakpoint so narrow screens stay readable. */
  hideOnMobile?: boolean;
  className?: string;
}

export interface SortState {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  sort?: SortState;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  /** Renders the "no results" variant when filters are active. */
  isFiltered?: boolean;
  footer?: ReactNode;
  className?: string;
}

const ALIGN = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const;

/**
 * The shared data table. It owns the loading, empty, no-results and error states
 * so every list page in the application behaves the same way.
 */
export const DataTable = <T,>({
  columns,
  rows,
  rowKey,
  isLoading = false,
  error = null,
  onRetry,
  sort,
  onSortChange,
  onRowClick,
  emptyTitle,
  emptyMessage,
  emptyAction,
  isFiltered = false,
  footer,
  className,
}: DataTableProps<T>) => {
  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !onSortChange) {
      return;
    }

    const isCurrent = sort?.sortBy === column.key;
    const nextOrder: 'asc' | 'desc' = isCurrent && sort?.sortOrder === 'asc' ? 'desc' : 'asc';

    onSortChange(column.key, nextOrder);
  };

  const renderBody = () => {
    if (error) {
      return (
        <tr>
          <td colSpan={columns.length}>
            <ErrorState message={error} onRetry={onRetry} />
          </td>
        </tr>
      );
    }

    if (isLoading) {
      return (
        <tr>
          <td colSpan={columns.length}>
            <LoadingState />
          </td>
        </tr>
      );
    }

    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan={columns.length}>
            <EmptyState
              variant={isFiltered ? 'no-results' : 'empty'}
              title={isFiltered ? undefined : emptyTitle}
              message={isFiltered ? undefined : emptyMessage}
              action={isFiltered ? undefined : emptyAction}
            />
          </td>
        </tr>
      );
    }

    return rows.map((row) => (
      <tr
        key={rowKey(row)}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
        className={cn(
          'border-t border-[var(--border)] transition-colors',
          onRowClick && 'cursor-pointer hover:bg-[var(--surface-hover)]',
        )}
      >
        {columns.map((column) => (
          <td
            key={column.key}
            className={cn(
              'px-4 py-3 text-sm text-[var(--text)] align-middle',
              ALIGN[column.align ?? 'left'],
              column.hideOnMobile && 'hidden md:table-cell',
              column.className,
            )}
          >
            {column.render(row)}
          </td>
        ))}
      </tr>
    ));
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--surface-muted)]">
              {columns.map((column) => {
                const isSorted = sort?.sortBy === column.key;

                return (
                  <th
                    key={column.key}
                    scope="col"
                    style={column.width ? { width: column.width } : undefined}
                    aria-sort={
                      isSorted ? (sort?.sortOrder === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cn(
                      'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]',
                      ALIGN[column.align ?? 'left'],
                      column.hideOnMobile && 'hidden md:table-cell',
                    )}
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded transition-colors hover:text-[var(--text)]',
                          isSorted && 'text-[var(--text)]',
                        )}
                      >
                        {column.header}
                        {isSorted ? (
                          sort?.sortOrder === 'asc' ? (
                            <ArrowUp className="size-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="size-3.5" aria-hidden="true" />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>{renderBody()}</tbody>
        </table>
      </div>

      {footer ? <div className="border-t border-[var(--border)]">{footer}</div> : null}
    </div>
  );
};
