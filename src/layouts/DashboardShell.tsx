import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { NavSection } from '@/app/navigation';
import { filterNavigation } from '@/app/navigation';
import { usePermission } from '@/hooks/usePermission';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Topbar } from '@/components/navigation/Topbar';

export interface DashboardShellProps {
  navigation: NavSection[];
}

/**
 * The application chrome shared by the administrator, teacher and parent
 * layouts. Each layout supplies its own navigation, which is then filtered down
 * to the items the signed-in user is allowed to see.
 */
export const DashboardShell = ({ navigation }: DashboardShellProps) => {
  const { t } = useTranslation('navigation');
  const { has } = usePermission();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const sections = filterNavigation(navigation, has);

  return (
    <div className="flex h-full bg-[var(--background)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--primary)] focus:px-4 focus:py-2 focus:text-[var(--primary-contrast)]"
      >
        {t('actions.skipToContent')}
      </a>

      <Sidebar sections={sections} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-width: 90rem p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
