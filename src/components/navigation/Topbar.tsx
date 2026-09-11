import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export interface TopbarProps {
  onOpenSidebar: () => void;
}

export const Topbar = ({ onOpenSidebar }: TopbarProps) => {
  const { t } = useTranslation('navigation');

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 backdrop-blur">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label={t('actions.openMenu')}
        className="-ml-1 rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)] lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
        <NotificationBell />
        <div className="mx-1 h-6 w-px bg-[var(--border)]" aria-hidden="true" />
        <UserMenu />
      </div>
    </header>
  );
};
