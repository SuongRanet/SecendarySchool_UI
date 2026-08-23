import { useTranslation } from 'react-i18next';
import { Check, Languages } from 'lucide-react';
import { LANGUAGES, useLanguageStore } from '@/stores/language.store';
import { Dropdown } from '@/components/ui/Dropdown';
import { cn } from '@/utils/cn';

export const LanguageSwitcher = ({ className }: { className?: string }) => {
  const { t } = useTranslation('common');
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  return (
    <Dropdown
      className={className}
      menuLabel={t('labels.language')}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t('labels.language')}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[var(--text-muted)] transition-colors',
            'hover:bg-[var(--surface-hover)] hover:text-[var(--text)]',
            open && 'bg-[var(--surface-hover)] text-[var(--text)]',
          )}
        >
          <Languages className="size-4.5" />
          <span className="text-xs font-medium uppercase">{language}</span>
        </button>
      )}
      items={LANGUAGES.map((option) => ({
        key: option.code,
        label: (
          <span className={cn('flex items-center gap-2', option.code === 'kh' && 'font-khmer')}>
            {option.nativeLabel}
          </span>
        ),
        icon:
          option.code === language ? (
            <Check className="size-4 text-[var(--primary)]" />
          ) : (
            <span className="size-4" />
          ),
        onSelect: () => setLanguage(option.code),
      }))}
    />
  );
};
