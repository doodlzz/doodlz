import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LANGUAGES, type Lang } from '../../shared/types';
import { setMusicVolume, startMusic, stopMusic } from '../audio/music';
import { setSfxVolume } from '../audio/sfx';
import { readJson, writeJson } from '../lib/storage';

export type ThemePref = 'light' | 'dark' | 'system';

export interface Settings {
  lang: Lang;
  theme: ThemePref;
  sfx: number; // 0..1
  music: number; // 0..1, 0 = off
}

const KEY = 'doodlz:settings';

function detectLang(): Lang {
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2).toLowerCase() : 'en';
  return LANGUAGES.includes(nav as Lang) ? (nav as Lang) : 'en';
}

const defaults = (): Settings => ({ lang: detectLang(), theme: 'system', sfx: 0.6, music: 0 });

interface Ctx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  dark: boolean;
}

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => readJson(KEY, defaults()));
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const dark = settings.theme === 'dark' || (settings.theme === 'system' && systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.lang = settings.lang;
  }, [dark, settings.lang]);

  useEffect(() => setSfxVolume(settings.sfx), [settings.sfx]);

  // Browsers only allow audio after a user gesture, so music starts on the first click.
  useEffect(() => {
    setMusicVolume(settings.music);
    if (settings.music <= 0) {
      stopMusic();
      return;
    }
    const start = () => startMusic();
    start();
    window.addEventListener('pointerdown', start, { once: true });
    return () => window.removeEventListener('pointerdown', start);
  }, [settings.music]);

  const value = useMemo<Ctx>(
    () => ({
      settings,
      dark,
      update: (patch) =>
        setSettings((prev) => {
          const next = { ...prev, ...patch };
          writeJson(KEY, next);
          return next;
        }),
    }),
    [settings, dark],
  );

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
