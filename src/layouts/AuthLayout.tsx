import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GraduationCap } from 'lucide-react';
import { LanguageSwitcher } from '@/components/navigation/LanguageSwitcher';
import { ThemeToggle } from '@/components/navigation/ThemeToggle';

const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'Hun Sen Turi';

/**
 * Served from `public/`, not imported, so that replacing the photograph is a
 * matter of dropping a file in — and so a missing file is a runtime 404 the
 * layout can fall back from, rather than a build error.
 */
const SCHOOL_PHOTO = '/school-gate.jpg';

/**
 * The unauthenticated shell.
 *
 * The brand panel carries a photograph of the school gate. It is loaded through
 * an `<img>` rather than a CSS background so a missing or slow file degrades
 * gracefully: the panel keeps its gradient, the text stays readable, and nothing
 * shifts. A double overlay — a wash and a bottom-up gradient — keeps the white
 * text legible over a bright midday sky.
 */
export const AuthLayout = () => {
  const { t } = useTranslation('common');
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    <div className="flex min-h-full bg-[var(--background)]">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[var(--primary)] p-10 text-white lg:flex">
        {photoFailed ? null : (
          <img
            src={SCHOOL_PHOTO}
            alt=""
            aria-hidden="true"
            onLoad={() => setPhotoLoaded(true)}
            onError={() => setPhotoFailed(true)}
            className={`absolute inset-0 size-full scale-105 object-cover transition-opacity duration-700 ${
              photoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Keeps the text readable whatever the photograph is doing behind it. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/85 via-[var(--primary)]/55 to-slate-950/80"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950/85 to-transparent"
        />

        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <GraduationCap className="size-6" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight drop-shadow-sm">{APP_NAME}</span>
        </div>

        <div className="relative max-w-md">
          <span className="inline-flex items-center rounded-full bg-white/12 px-3 py-1 text-xs font-medium tracking-wide text-white/90 ring-1 ring-white/20 backdrop-blur">
            {t('grades')}
          </span>

          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight drop-shadow-sm">
            {t('appFullName')}
          </h1>

          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/85">{t('tagline')}</p>
        </div>

        <p className="relative text-xs text-white/60">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex w-full flex-col lg:w-1/2">
        {/* On a phone the photo becomes a slim header instead of a side panel. */}
        {photoFailed ? null : (
          <div className="relative h-40 overflow-hidden lg:hidden">
            <img
              src={SCHOOL_PHOTO}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 size-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/50 to-[var(--primary)]/35"
            />
          </div>
        )}

        <div className="absolute right-0 top-0 flex items-center justify-end gap-1 p-4">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-12 pt-6">
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
