import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AUTH_EXPIRED_EVENT } from '@/services/token-storage';
import { handleSessionExpired, useAuthStore } from '@/stores/auth.store';
import { useLanguageStore } from '@/stores/language.store';
import { initThemeListener } from '@/stores/theme.store';
import { toast } from '@/stores/toast.store';
import { Toaster } from '@/components/feedback/Toaster';
import i18n from '@/i18n';

export interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Application-wide wiring: routing, session restore, theme and language
 * synchronisation, and the toast outlet.
 */
export const AppProviders = ({ children }: AppProvidersProps) => {
  const initialize = useAuthStore((state) => state.initialize);
  const language = useLanguageStore((state) => state.language);

  // Restore the session from the stored tokens on first paint.
  useEffect(() => {
    void initialize();
  }, [initialize]);

  // Follow the OS palette while the theme is set to "system".
  useEffect(() => initThemeListener(), []);

  // Keep i18next and the document language in step with the store.
  useEffect(() => {
    void i18n.changeLanguage(language);
    document.documentElement.lang = language === 'kh' ? 'km' : 'en';
  }, [language]);

  // A refresh failure anywhere in the app clears the session exactly once.
  useEffect(() => {
    const handler = () => {
      handleSessionExpired();
      toast.warning(
        i18n.t('auth:session.expiredTitle'),
        i18n.t('auth:session.expiredMessage'),
      );
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handler);

    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler);
  }, []);

  return (
    <BrowserRouter>
      {children}
      <Toaster />
    </BrowserRouter>
  );
};
