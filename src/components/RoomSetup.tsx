import { useState } from 'react';
import { ArrowLeft, Clock, Dices, Lightbulb, Repeat, Shapes, SlidersHorizontal, Sparkles, Users } from 'lucide-react';
import { CATEGORIES, DEFAULT_SETTINGS, SETTING_LIMITS, type Category, type RoomSettings } from '../../shared/types';
import { useT } from '../i18n';
import { CategoryTile } from './CategoryPicker';
import { DRAW_TIMES, ModePicker, Row, Stepper, Toggle } from './GameSettingsPanel';

type SetupChoices = Pick<RoomSettings, 'mode' | 'maxPlayers' | 'rounds' | 'drawTime' | 'hints'>;
const STORE_KEY = 'doodlz:roomSetup';

/** The last choices made here, so a host who always plays the same way doesn't have to set it up again. */
function loadChoices(): SetupChoices {
  const base: SetupChoices = { mode: DEFAULT_SETTINGS.mode, maxPlayers: DEFAULT_SETTINGS.maxPlayers, rounds: DEFAULT_SETTINGS.rounds, drawTime: DEFAULT_SETTINGS.drawTime, hints: DEFAULT_SETTINGS.hints };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') };
  } catch {
    return base;
  }
}

function Step({ n, icon, title, extra }: { n: number; icon: React.ReactNode; title: string; extra?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2.5 font-display text-xl font-semibold text-indigo-900">
        <span className="grid size-8 -rotate-6 place-items-center rounded-xl bg-pink-500 font-display text-lg font-bold text-white shadow-[0_3px_0_#9d174d]">{n}</span>
        {icon}
        {title}
      </h3>
      {extra}
    </div>
  );
}

interface Props {
  onCreate: (settings: Partial<RoomSettings>) => void;
  onClose: () => void;
}

/** Full-screen "set up your room" step before a private room opens: the main settings and the category, side by side. */
export default function RoomSetup({ onCreate, onClose }: Props) {
  const t = useT();
  const [choices, setChoices] = useState(loadChoices);
  const [category, setCategory] = useState<Category | null>(null);
  const set = (c: Partial<SetupChoices>) => setChoices((prev) => ({ ...prev, ...c }));

  const create = () => {
    if (!category) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(choices));
    } catch {
      // storage unavailable: just don't remember
    }
    onCreate({ ...choices, categories: [category] });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-indigo-950/50 backdrop-blur-sm dark:bg-black/60" role="dialog" aria-modal aria-labelledby="setup-title">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col px-4 py-6 sm:py-8">
        <div className="mb-6 flex items-center gap-3">
          <button type="button" className="btn btn-ghost size-12 shrink-0 p-0" onClick={onClose} aria-label={t('pick.back')} title={t('pick.back')}>
            <ArrowLeft className="size-6" />
          </button>
          <h2 id="setup-title" className="flex-1 text-center font-display text-3xl font-bold text-white drop-shadow-[0_3px_0_rgba(30,27,75,0.6)] sm:text-4xl">
            {t('setup.title')} <Sparkles className="inline size-7 -translate-y-1 text-amber-300" />
          </h2>
          <span className="size-12 shrink-0" />
        </div>

        <div className="grid animate-pop items-start gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          {/* 1. how the game plays */}
          <section className="panel crayon-edge p-5">
            <Step n={1} icon={<SlidersHorizontal className="size-5 text-sky-500" />} title={t('setup.game')} />
            <div className="flex flex-col gap-2">
              <ModePicker mode={choices.mode} disabled={false} onChange={(mode) => set({ mode })} />
              <Row icon={<Users className="size-4 text-emerald-500" />} label={t('gs.maxPlayers')}>
                <Stepper value={choices.maxPlayers} min={SETTING_LIMITS.maxPlayers[0]} max={SETTING_LIMITS.maxPlayers[1]} disabled={false} onChange={(maxPlayers) => set({ maxPlayers })} />
              </Row>
              <Row icon={<Repeat className="size-4 text-pink-500" />} label={t('gs.rounds')}>
                <Stepper value={choices.rounds} min={SETTING_LIMITS.rounds[0]} max={SETTING_LIMITS.rounds[1]} disabled={false} onChange={(rounds) => set({ rounds })} />
              </Row>
              <div className="rounded-2xl bg-indigo-50/70 px-3 py-2.5">
                <div className="mb-2 flex items-center gap-2 font-bold text-indigo-900">
                  <Clock className="size-4 text-amber-500" /> {t('gs.drawTime')}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {DRAW_TIMES.map((s) => (
                    <button key={s} type="button" onClick={() => set({ drawTime: s })} className={`chip ${choices.drawTime === s ? 'chip-on' : ''}`}>
                      {s}s
                    </button>
                  ))}
                </div>
              </div>
              <Row icon={<Lightbulb className="size-4 text-yellow-500" />} label={t('gs.hints')}>
                <Toggle on={choices.hints} disabled={false} label={t('gs.hints')} onChange={(hints) => set({ hints })} />
              </Row>
              <p className="mt-1 text-center text-xs font-bold text-indigo-400">{t('setup.more')}</p>
            </div>
          </section>

          {/* 2. where the words come from */}
          <section className="panel crayon-edge flex flex-col p-5">
            <Step
              n={2}
              icon={<Shapes className="size-5 text-pink-500" />}
              title={t('setup.category')}
              extra={
                <button type="button" className="btn btn-ghost py-2 text-sm" onClick={() => setCategory(CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)])}>
                  <Dices className="size-4" /> {t('pick.random')}
                </button>
              }
            />
            <p className="-mt-2 mb-4 text-sm font-bold text-indigo-400">{t('pick.subtitle')}</p>
            {/* Scrolls inside the panel on wide screens so both panels and the button fit on one screen. */}
            <div className="no-scrollbar -m-3 grid grid-cols-2 gap-4 p-3 sm:grid-cols-3 lg:max-h-[29rem] lg:overflow-y-auto xl:grid-cols-4">
              {CATEGORIES.map((c) => (
                <CategoryTile key={c} category={c} selected={c === category} onPanel onClick={() => setCategory(c)} />
              ))}
            </div>
          </section>
        </div>

        {/* Sticks to the bottom once it can be pressed; a faded, disabled button floating over the tiles looks broken. */}
        <div className={`${category ? 'sticky' : ''} bottom-0 mt-6 flex justify-center pb-2`}>
          <button type="button" className="btn btn-green btn-play crayon-edge crayon-grain min-w-64 py-4 text-xl" disabled={!category} onClick={create}>
            {category ? t('setup.create') : t('setup.pickFirst')}
          </button>
        </div>
      </div>
    </div>
  );
}
