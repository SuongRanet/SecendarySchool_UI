import { useTranslation } from 'react-i18next';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/stores/theme.store';
import type { ThemeMode } from '@/stores/theme.store';
import { Dropdown } from '@/components/ui/Dropdown';
import { cn } from '@/utils/cn';

const ICONS: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export const ThemeToggle = ({ className }: { className?: string }) => {
  const { t } = useTranslation('common');
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const Icon = ICONS[mode];

  return (
    <Dropdown
      className={className}
      menuLabel={t('labels.theme')}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t('labels.theme')}
          className={cn(
            'inline-flex size-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors',
            'hover:bg-[var(--surface-hover)] hover:text-[var(--text)]',
            open && 'bg-[var(--surface-hover)] text-[var(--text)]',
          )}
        >
          <Icon className="size-4.5" />
        </button>
      )}
      items={(['light', 'dark', 'system'] as ThemeMode[]).map((option) => {
        const OptionIcon = ICONS[option];

        return {
          key: option,
          label: t(`theme.${option}`),
          icon: (
            <OptionIcon
              className={cn('size-4', option === mode && 'text-[var(--primary)]')}
            />
          ),
          onSelect: () => setMode(option),
        };
      })}
    />
  );
};
