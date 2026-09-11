import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, KeyRound, LogOut, UserCircle2 } from 'lucide-react';
import { ROUTES, profileRouteFor } from '@/constants/routes';
import { useAuthStore } from '@/stores/auth.store';
import { Avatar } from '@/components/ui/Avatar';
import { Dropdown } from '@/components/ui/Dropdown';
import { ChangePasswordModal } from '@/features/auth/ChangePasswordModal';
import { cn } from '@/utils/cn';

export const UserMenu = () => {
  const { t } = useTranslation(['navigation', 'users']);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  if (!user) {
    return null;
  }

  const displayName = user.fullName ?? user.username;
  const primaryRole = user.roles[0];

  const handleSignOut = async () => {
    await logout();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <>
      <Dropdown
        menuLabel={displayName}
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            className={cn(
              'flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors',
              'hover:bg-[var(--surface-hover)]',
              open && 'bg-[var(--surface-hover)]',
            )}
          >
            <Avatar name={displayName} size="sm" />

            <span className="hidden min-w-0 flex-col items-start sm:flex">
              <span className="max-w-40 truncate text-sm font-medium text-[var(--text)]">
                {displayName}
              </span>
              {primaryRole ? (
                <span className="max-w-40 truncate text-xs text-[var(--text-subtle)]">
                  {t(`users:roles.${primaryRole}`)}
                </span>
              ) : null}
            </span>

            <ChevronDown className="size-4 text-[var(--text-subtle)]" aria-hidden="true" />
          </button>
        )}
        items={[
          {
            key: 'profile',
            label: t('navigation:userMenu.profile'),
            icon: <UserCircle2 className="size-4" />,
            onSelect: () => navigate(profileRouteFor(user?.roles ?? [])),
          },
          {
            key: 'password',
            label: t('navigation:userMenu.changePassword'),
            icon: <KeyRound className="size-4" />,
            onSelect: () => setPasswordModalOpen(true),
          },
          {
            key: 'signout',
            label: t('navigation:userMenu.signOut'),
            icon: <LogOut className="size-4" />,
            tone: 'danger',
            separatorBefore: true,
            onSelect: () => void handleSignOut(),
          },
        ]}
      />

      <ChangePasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </>
  );
};
