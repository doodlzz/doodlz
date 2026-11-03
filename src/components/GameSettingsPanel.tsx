import { useEffect, useState, type ReactNode } from 'react';
import { BookText, Clock, EyeOff, Lightbulb, Minus, Palette, Plus, Repeat, Settings, Users, Users2, User, Zap } from 'lucide-react';
import { MAX_CUSTOM_WORDS, SETTING_LIMITS, type RoomSettings, type SpeedCap } from '../../shared/types';
import { useT } from '../i18n';

const DRAW_TIMES = [30, 45, 60, 80, 100, 120, 150, 180];
const SPEEDS: SpeedCap[] = [0, 30, 40];

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-indigo-50/70 px-3 py-2.5">
      <div className="flex items-center gap-2 font-bold text-indigo-900">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function Stepper({ value, min, max, onChange, disabled }: { value: number; min: number; max: number; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={disabled || value <= min} onClick={() => onChange(value - 1)} className="btn btn-ghost size-8 rounded-xl p-0" aria-label="−">
        <Minus className="size-4" />
      </button>
      <span className="w-7 text-center font-display text-xl font-bold text-indigo-950">{value}</span>
      <button type="button" disabled={disabled || value >= max} onClick={() => onChange(value + 1)} className="btn btn-ghost size-8 rounded-xl p-0" aria-label="+">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-slate-300'} ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${on ? 'left-7' : 'left-1'}`} />
    </button>
  );
}

const parseWords = (s: string) =>
  s
    .split(/[,\n]/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, MAX_CUSTOM_WORDS);

interface Props {
  settings: RoomSettings;
  editable: boolean;
  isPublic: boolean;
  minPlayers: number;
  onChange: (s: Partial<RoomSettings>) => void;
}

export default function GameSettingsPanel({ settings, editable, isPublic, minPlayers, onChange }: Props) {
  const t = useT();
  const [wordsText, setWordsText] = useState(settings.customWords.join(', '));

  // Keep the text box in sync when someone else (the server) changes the list.
  useEffect(() => {
    if (parseWords(wordsText).join('|') !== settings.customWords.join('|')) setWordsText(settings.customWords.join(', '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.customWords]);

  return (
    <div className="panel p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-1">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-indigo-900">
          <Settings className="size-5 text-sky-500" /> {t('gs.title')}
        </h2>
        {!editable && <span className="text-xs font-bold text-indigo-300">{t('gs.hostOnly')}</span>}
      </div>

      <div className="flex flex-col gap-2">
        {/* mode */}
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['classic', <User key="c" className="size-5" />, t('gs.classic'), t('gs.classicDesc')],
              ['duo', <Users2 key="d" className="size-5" />, t('gs.duo'), t('gs.duoDesc')],
            ] as const
          ).map(([mode, icon, name, desc]) => (
            <button
              key={mode}
              type="button"
              disabled={!editable}
              onClick={() => onChange({ mode })}
              className={`flex flex-col items-start gap-0.5 rounded-2xl border-4 p-3 text-left transition ${
                settings.mode === mode ? 'border-indigo-400 bg-indigo-100' : 'border-transparent bg-indigo-50/70 enabled:hover:bg-indigo-100'
              } ${editable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span className="flex items-center gap-1.5 font-display text-lg font-semibold text-indigo-950">
                {icon} {name}
              </span>
              <span className="text-xs leading-snug font-bold text-indigo-400">{desc}</span>
            </button>
          ))}
        </div>

        <Row icon={<Repeat className="size-4 text-pink-500" />} label={t('gs.rounds')}>
          <Stepper value={settings.rounds} min={SETTING_LIMITS.rounds[0]} max={SETTING_LIMITS.rounds[1]} disabled={!editable} onChange={(rounds) => onChange({ rounds })} />
        </Row>
        <Row icon={<Users className="size-4 text-emerald-500" />} label={t('gs.maxPlayers')}>
          <Stepper
            value={settings.maxPlayers}
            min={Math.max(SETTING_LIMITS.maxPlayers[0], minPlayers)}
            max={SETTING_LIMITS.maxPlayers[1]}
            disabled={!editable}
            onChange={(maxPlayers) => onChange({ maxPlayers })}
          />
        </Row>
        <div className="rounded-2xl bg-indigo-50/70 px-3 py-2.5">
          <div className="mb-2 flex items-center gap-2 font-bold text-indigo-900">
            <Clock className="size-4 text-amber-500" /> {t('gs.drawTime')}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {DRAW_TIMES.map((s) => (
              <button key={s} type="button" disabled={!editable} onClick={() => onChange({ drawTime: s })} className={`chip ${settings.drawTime === s ? 'chip-on' : ''}`}>
                {s}s
              </button>
            ))}
          </div>
        </div>

        {/* modifiers */}
        <span className="label mt-2">{t('gs.modifiers')}</span>
        <Row icon={<Zap className="size-4 text-amber-500" />} label={t('gs.speed')}>
          <div className="flex gap-1.5">
            {SPEEDS.map((s) => (
              <button key={s} type="button" disabled={!editable} onClick={() => onChange({ speed: s })} className={`chip ${settings.speed === s ? 'chip-on' : ''}`}>
                {s === 0 ? t('gs.speedOff') : `${s}s`}
              </button>
            ))}
          </div>
        </Row>
        <Row icon={<Lightbulb className="size-4 text-yellow-500" />} label={t('gs.hints')}>
          <Toggle on={settings.hints} disabled={!editable} label={t('gs.hints')} onChange={(hints) => onChange({ hints })} />
        </Row>
        <Row icon={<Palette className="size-4 text-violet-500" />} label={t('gs.singleColor')}>
          <Toggle on={settings.singleColor} disabled={!editable} label={t('gs.singleColor')} onChange={(singleColor) => onChange({ singleColor })} />
        </Row>
        <Row icon={<EyeOff className="size-4 text-slate-500" />} label={t('gs.blindfold')}>
          <Toggle on={settings.blindfold} disabled={!editable} label={t('gs.blindfold')} onChange={(blindfold) => onChange({ blindfold })} />
        </Row>

        {!isPublic && (
          <>
            <span className="label mt-2 flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5">
                <BookText className="size-4" /> {t('gs.customWords')}
              </span>
              <span className="normal-case">{t('gs.customCount', { n: settings.customWords.length })}</span>
            </span>
            <textarea
              className="input min-h-20 resize-y py-2 text-sm"
              value={wordsText}
              readOnly={!editable}
              placeholder={t('gs.customPlaceholder')}
              onChange={(e) => setWordsText(e.target.value)}
              onBlur={() => editable && onChange({ customWords: parseWords(wordsText) })}
            />
            <Row icon={<BookText className="size-4 text-pink-500" />} label={t('gs.customOnly')}>
              <Toggle on={settings.customOnly} disabled={!editable} label={t('gs.customOnly')} onChange={(customOnly) => onChange({ customOnly })} />
            </Row>
          </>
        )}
      </div>
    </div>
  );
}
