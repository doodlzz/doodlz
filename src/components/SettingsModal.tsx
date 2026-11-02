import { useEffect, useState } from 'react';
import { Languages, Monitor, Moon, Music, Settings, Sun, Volume2, X } from 'lucide-react';
import { LANGUAGES } from '../../shared/types';
import { playSfx } from '../audio/sfx';
import { LANGUAGE_NAMES, useT } from '../i18n';
import { useSettings, type ThemePref } from '../settings/SettingsContext';

function Slider({ label, icon, value, onChange }: { label: string; icon: React.ReactNode; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl bg-indigo-50/70 px-3 py-2.5 font-bold text-indigo-900">
      {icon}
      <span className="w-32 shrink-0">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full cursor-pointer accent-pink-500"
      />
      <span className="w-9 text-right text-sm text-indigo-400">{Math.round(value * 100)}</span>
    </label>
  );
}

/** Gear button that opens the audio / visual / language settings. */
export default function SettingsButton({ className = '' }: { className?: string }) {
  const t = useT();
  const { settings, update } = useSettings();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const themes: { id: ThemePref; icon: React.ReactNode; label: string }[] = [
    { id: 'light', icon: <Sun className="size-4" />, label: t('set.light') },
    { id: 'dark', icon: <Moon className="size-4" />, label: t('set.dark') },
    { id: 'system', icon: <Monitor className="size-4" />, label: t('set.system') },
  ];

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`btn btn-ghost px-3 py-2 text-sm ${className}`} title={t('set.open')} aria-label={t('set.open')}>
        <Settings className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-indigo-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal aria-labelledby="settings-title" onClick={() => setOpen(false)}>
          <div className="panel w-full max-w-md animate-pop p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 id="settings-title" className="flex items-center gap-2 font-display text-2xl font-bold text-indigo-950">
                <Settings className="size-6 text-sky-500" /> {t('set.title')}
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost size-10 p-0" aria-label={t('set.close')}>
                <X className="size-5" />
              </button>
            </div>

            <span className="label flex items-center gap-1.5">
              <Languages className="size-4" /> {t('set.language')}
            </span>
            <div className="mb-4 grid grid-cols-4 gap-1.5">
              {LANGUAGES.map((l) => (
                <button key={l} type="button" onClick={() => update({ lang: l })} className={`chip px-2 ${settings.lang === l ? 'chip-on' : 'bg-indigo-50'}`}>
                  {LANGUAGE_NAMES[l]}
                </button>
              ))}
            </div>

            <span className="label">{t('set.theme')}</span>
            <div className="mb-4 grid grid-cols-3 gap-1.5">
              {themes.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => update({ theme: th.id })}
                  className={`chip flex items-center justify-center gap-1.5 py-2 ${settings.theme === th.id ? 'chip-on' : 'bg-indigo-50'}`}
                >
                  {th.icon} {th.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <Slider
                label={t('set.sound')}
                icon={<Volume2 className="size-5 text-pink-500" />}
                value={settings.sfx}
                onChange={(v) => {
                  update({ sfx: v });
                  playSfx('pop');
                }}
              />
              <Slider label={t('set.music')} icon={<Music className="size-5 text-violet-500" />} value={settings.music} onChange={(v) => update({ music: v })} />
              <p className="px-1 text-xs font-bold text-indigo-300">{t('set.musicNote')}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
