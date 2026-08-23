import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/i18n';

export type Language = 'en' | 'kh';

export const LANGUAGES: { code: Language; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'kh', label: 'Khmer', nativeLabel: 'ភាសាខ្មែរ' },
];

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

const applyToDocument = (language: Language): void => {
  document.documentElement.lang = language === 'kh' ? 'km' : 'en';
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: (import.meta.env.VITE_DEFAULT_LANGUAGE as Language) ?? 'en',

      setLanguage: (language) => {
        void i18n.changeLanguage(language);
        applyToDocument(language);
        set({ language });
      },
    }),
    {
      name: 'sms.language',
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }

        void i18n.changeLanguage(state.language);
        applyToDocument(state.language);
      },
    },
  ),
);
