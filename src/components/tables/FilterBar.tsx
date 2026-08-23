import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FilterX } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { SearchInput } from './SearchInput';

export interface FilterBarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Select controls and other filters rendered next to the search box. */
  filters?: ReactNode;
  /** Buttons rendered at the far right (usually the primary action). */
  actions?: ReactNode;
  isFiltered?: boolean;
  onClearFilters?: () => void;
  className?: string;
}

/** The control strip above a data table: search, filters and the page action. */
export const FilterBar = ({
  search,
  onSearchChange,
  searchPlaceholder,
  filters,
  actions,
  isFiltered = false,
  onClearFilters,
  className,
}: FilterBarProps) => {
  const { t } = useTranslation('common');

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {onSearchChange ? (
        <SearchInput
          value={search ?? ''}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
        />
      ) : null}

      {filters}

      {isFiltered && onClearFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          leftIcon={<FilterX className="size-4" />}
        >
          {t('actions.clearFilters')}
        </Button>
      ) : null}

      {actions ? <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
};
