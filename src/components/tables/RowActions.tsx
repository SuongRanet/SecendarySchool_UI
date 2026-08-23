import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';
import type { DropdownItem } from '@/components/ui/Dropdown';

export interface RowActionsProps {
  items: DropdownItem[];
  label?: string;
}

/** The `⋯` menu at the end of a table row. Renders nothing when empty. */
export const RowActions = ({ items, label }: RowActionsProps) => {
  const { t } = useTranslation('common');

  if (items.length === 0) {
    return null;
  }

  return (
    <Dropdown
      menuLabel={label ?? t('labels.actions')}
      items={items}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggle();
          }}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t('labels.actions')}
          className="rounded-md p-1.5 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
        >
          <MoreHorizontal className="size-4" />
        </button>
      )}
    />
  );
};
