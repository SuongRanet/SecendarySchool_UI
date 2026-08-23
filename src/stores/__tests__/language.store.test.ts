import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { LANGUAGES, useLanguageStore } from '../language.store';

describe('language store', () => {
  beforeEach(async () => {
    useLanguageStore.setState({ language: 'en' });
    await i18n.changeLanguage('en');
  });

  it('offers English and Khmer', () => {
    expect(LANGUAGES.map((language) => language.code)).toEqual(['en', 'kh']);
  });

  it('switches i18next to Khmer', async () => {
    useLanguageStore.getState().setLanguage('kh');

    expect(useLanguageStore.getState().language).toBe('kh');
    await Promise.resolve();
    expect(i18n.language).toBe('kh');
  });

  it('sets the document language so screen readers announce the right locale', () => {
    useLanguageStore.getState().setLanguage('kh');
    expect(document.documentElement.lang).toBe('km');

    useLanguageStore.getState().setLanguage('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('persists the choice so it survives a reload', () => {
    useLanguageStore.getState().setLanguage('kh');

    expect(localStorage.getItem('sms.language')).toContain('kh');
  });

  it('translates the same key differently in each language', async () => {
    const english = i18n.t('auth:login.submit');

    await i18n.changeLanguage('kh');
    const khmer = i18n.t('auth:login.submit');

    expect(english).toBeTruthy();
    expect(khmer).toBeTruthy();
    expect(khmer).not.toBe(english);
  });

  it('has a Khmer translation for every English key in the auth namespace', async () => {
    const flatten = (value: unknown, prefix = ''): string[] =>
      typeof value === 'object' && value !== null
        ? Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
            flatten(child, prefix ? `${prefix}.${key}` : key),
          )
        : [prefix];

    const englishKeys = flatten(i18n.getResourceBundle('en', 'auth')).sort();
    const khmerKeys = flatten(i18n.getResourceBundle('kh', 'auth')).sort();

    expect(khmerKeys).toEqual(englishKeys);
  });
});
