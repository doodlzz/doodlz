import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { Lang, MsgParams } from '../../shared/types';
import { useSettings } from '../settings/SettingsContext';
import { en, type Dict, type TKey } from './locales/en';

export type { TKey };

// English is built in (it's the fallback for any missing text); other languages are separate downloads,
// fetched only when someone uses them, so most players don't download all seven.
const DICTS: Partial<Record<Lang, Partial<Dict>>> = { en };
const LOADERS: Record<Exclude<Lang, 'en'>, () => Promise<Partial<Dict>>> = {
  es: () => import('./locales/es').then((m) => m.es),
  pt: () => import('./locales/pt').then((m) => m.pt),
  fr: () => import('./locales/fr').then((m) => m.fr),
  de: () => import('./locales/de').then((m) => m.de),
  ru: () => import('./locales/ru').then((m) => m.ru),
  zh: () => import('./locales/zh').then((m) => m.zh),
};

let version = 0;
const listeners = new Set<() => void>();
const pending = new Map<Lang, Promise<void>>();

/** Download a language (once). The app waits for the saved language before its first render. */
export function loadLanguage(lang: Lang): Promise<void> {
  if (DICTS[lang]) return Promise.resolve();
  let p = pending.get(lang);
  if (!p) {
    p = LOADERS[lang as Exclude<Lang, 'en'>]()
      .then((dict) => {
        DICTS[lang] = dict;
        version++;
        listeners.forEach((l) => l());
      })
      .catch(() => {
        pending.delete(lang); // offline: stay on English, try again next time
      });
    pending.set(lang, p);
  }
  return p;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const LANGUAGE_NAMES: Record<Lang, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  ru: 'Русский',
  zh: '中文',
};

export function translate(lang: Lang, key: string, params?: MsgParams): string {
  const dict = DICTS[lang] ?? en;
  const template = (dict as Record<string, string>)[key] ?? (en as Record<string, string>)[key] ?? key;
  return params ? template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : template;
}

export type TFn = (key: TKey | (string & {}), params?: MsgParams) => string;

/** Translation function for the player's chosen language. */
export function useT(): TFn {
  const { settings } = useSettings();
  const loaded = useSyncExternalStore(subscribe, () => version);
  useEffect(() => {
    void loadLanguage(settings.lang);
  }, [settings.lang]);
  return useCallback<TFn>((key, params) => translate(settings.lang, key, params), [settings.lang, loaded]);
}
