import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useThemeStore } from '../theme.store';

const setSystemPrefersDark = (dark: boolean): void => {
  window.matchMedia = ((query: string) => ({
    matches: dark && query.includes('dark'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
};

describe('theme store', () => {
  beforeEach(() => {
    setSystemPrefersDark(false);
    useThemeStore.setState({ mode: 'system', resolved: 'light' });
    document.documentElement.classList.remove('dark');
  });

  it('adds the dark class to the document when dark mode is chosen', () => {
    useThemeStore.getState().setMode('dark');

    expect(useThemeStore.getState().resolved).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('removes the dark class again when light mode is chosen', () => {
    useThemeStore.getState().setMode('dark');
    useThemeStore.getState().setMode('light');

    expect(useThemeStore.getState().resolved).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('toggles between the two palettes', () => {
    useThemeStore.getState().setMode('light');
    useThemeStore.getState().toggle();

    expect(useThemeStore.getState().mode).toBe('dark');

    useThemeStore.getState().toggle();

    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('follows the operating system when the mode is "system"', () => {
    setSystemPrefersDark(true);
    useThemeStore.getState().setMode('system');

    expect(useThemeStore.getState().resolved).toBe('dark');
  });

  it('re-resolves when the operating system preference changes in "system" mode', () => {
    useThemeStore.getState().setMode('system');
    expect(useThemeStore.getState().resolved).toBe('light');

    setSystemPrefersDark(true);
    useThemeStore.getState().syncWithSystem();

    expect(useThemeStore.getState().resolved).toBe('dark');
  });

  it('ignores an operating system change once the user has picked a palette', () => {
    useThemeStore.getState().setMode('light');

    setSystemPrefersDark(true);
    useThemeStore.getState().syncWithSystem();

    expect(useThemeStore.getState().resolved).toBe('light');
  });

  it('persists the chosen mode so it survives a reload', () => {
    useThemeStore.getState().setMode('dark');

    expect(localStorage.getItem('sms.theme')).toContain('dark');
  });
});
