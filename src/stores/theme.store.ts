import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  /** The palette actually rendered right now, after resolving `system`. */
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  syncWithSystem: () => void;
}

const prefersDark = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

const resolveMode = (mode: ThemeMode): 'light' | 'dark' =>
  mode === 'system' ? (prefersDark() ? 'dark' : 'light') : mode;

const applyToDocument = (resolved: 'light' | 'dark'): void => {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      resolved: 'light',

      setMode: (mode) => {
        const resolved = resolveMode(mode);
        applyToDocument(resolved);
        set({ mode, resolved });
      },

      toggle: () => {
        const next = get().resolved === 'dark' ? 'light' : 'dark';
        get().setMode(next);
      },

      /** Re-evaluates the palette when the OS preference changes in `system` mode. */
      syncWithSystem: () => {
        if (get().mode !== 'system') {
          return;
        }

        const resolved = resolveMode('system');
        applyToDocument(resolved);
        set({ resolved });
      },
    }),
    {
      name: 'sms.theme',
      partialize: (state) => ({ mode: state.mode }) as ThemeState,
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }

        const resolved = resolveMode(state.mode);
        applyToDocument(resolved);
        state.resolved = resolved;
      },
    },
  ),
);

/** Starts listening for OS theme changes. Returns the unsubscribe function. */
export const initThemeListener = (): (() => void) => {
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = () => useThemeStore.getState().syncWithSystem();

  query.addEventListener('change', listener);

  return () => query.removeEventListener('change', listener);
};
