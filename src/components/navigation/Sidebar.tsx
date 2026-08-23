import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GraduationCap, X } from 'lucide-react';
import type { NavSection } from '@/app/navigation';
import { cn } from '@/utils/cn';

export interface SidebarProps {
  sections: NavSection[];
  /** Mobile drawer state; on `lg` and up the sidebar is always visible. */
  open: boolean;
  onClose: () => void;
}

const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'Hun Sen Turi';

export const Sidebar = ({ sections, open, onClose }: SidebarProps) => {
  const { t } = useTranslation(['navigation', 'common']);

  const navContent = (
    <nav aria-label={t('navigation:sections.overview')} className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {sections.map((section) => (
        <div key={section.key}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
            {t(`navigation:${section.labelKey}`)}
          </p>

          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;

              return (
                <li key={item.key}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
                          : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]',
                      )
                    }
                  >
                    <Icon className="size-4.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{t(`navigation:${item.labelKey}`)}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)]">
          <GraduationCap className="size-5" aria-hidden="true" />
        </span>
        <span className="truncate text-sm font-semibold text-[var(--text)]">{APP_NAME}</span>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label={t('navigation:actions.closeMenu')}
        className="rounded-md p-1.5 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)] lg:hidden"
      >
        <X className="size-4" />
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <div
          aria-hidden="true"
          onClick={onClose}
          className={cn(
            'absolute inset-0 bg-black/50 transition-opacity',
            open ? 'opacity-100' : 'opacity-0',
          )}
        />

        <aside
          className={cn(
            'absolute inset-y-0 left-0 flex w-72 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-transform duration-200',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {brand}
          {navContent}
        </aside>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
        {brand}
        {navContent}
      </aside>
    </>
  );
};
