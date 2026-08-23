import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/Input';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Milliseconds to wait before propagating a change; keeps the API quiet while typing. */
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
}

/**
 * A debounced search box. Search is always executed server side, so the debounce
 * keeps a list page from firing a request on every keystroke.
 */
export const SearchInput = ({
  value,
  onChange,
  placeholder,
  debounceMs = 350,
  className,
  autoFocus = false,
}: SearchInputProps) => {
  const { t } = useTranslation('common');
  const [draft, setDraft] = useState(value);

  // Keep the visible text in sync when the value is reset from outside.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === value) {
      return;
    }

    const timer = window.setTimeout(() => onChange(draft), debounceMs);

    return () => window.clearTimeout(timer);
  }, [draft, debounceMs, onChange, value]);

  return (
    <Input
      // Deliberately a text input, not `type="search"`: the browser adds its own
      // clear button to a search field, which sat next to the one below and gave
      // the box two X buttons.
      type="text"
      value={draft}
      autoFocus={autoFocus}
      onChange={(event) => setDraft(event.target.value)}
      placeholder={placeholder ?? t('actions.search')}
      aria-label={placeholder ?? t('actions.search')}
      leftIcon={<Search className="size-4" />}
      className={cn('sm:w-72', className)}
      rightSlot={
        draft ? (
          <button
            type="button"
            onClick={() => {
              setDraft('');
              onChange('');
            }}
            aria-label={t('actions.clear')}
            className="rounded-md p-1.5 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            <X className="size-3.5" />
          </button>
        ) : undefined
      }
    />
  );
};
