import { useCallback } from 'react';
import type { Lang, MsgParams } from '../../shared/types';
import { useSettings } from '../settings/SettingsContext';
import { de } from './locales/de';
import { en, type Dict, type TKey } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { pt } from './locales/pt';
import { ru } from './locales/ru';
import { zh } from './locales/zh';

export type { TKey };

const DICTS: Record<Lang, Partial<Dict>> = { en, es, pt, fr, de, ru, zh };

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
  return useCallback<TFn>((key, params) => translate(settings.lang, key, params), [settings.lang]);
}
