import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GraduationCap } from 'lucide-react';
import { LanguageSwitcher } from '@/components/navigation/LanguageSwitcher';
import { ThemeToggle } from '@/components/navigation/ThemeToggle';

const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'Primary School';

/**
 * The unauthenticated shell: a calm split layout with the brand panel on the
 * left and the form on the right, collapsing to a single column on mobile.
 */
export const AuthLayout = () => {
  const { t } = useTranslation('common');

  return (
    <div className="flex min-h-full bg-[var(--background)]">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[var(--primary)] p-10 text-[var(--primary-contrast)] lg:flex">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -left-16 size-96 rounded-full bg-black/10 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <GraduationCap className="size-6" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold">{APP_NAME}</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight">{t('appFullName')}</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/80">{t('tagline')}</p>
        </div>

        <p className="relative text-xs text-white/60">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-end gap-1 p-4">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-12">
          <div className="animate-fade-in-up w-full max-w-sm">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-contrast)]">
                <GraduationCap className="size-5" aria-hidden="true" />
              </span>
              <span className="text-base font-semibold text-[var(--text)]">{APP_NAME}</span>
            </div>

            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};
