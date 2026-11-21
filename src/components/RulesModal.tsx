import { useEffect } from 'react';
import { Check, EyeOff, Palette, PencilLine, Target, Timer, Users, X } from 'lucide-react';
import type { ClientRoomState } from '../../shared/types';
import { useT } from '../i18n';
import { CATEGORY_LOOK } from '../lib/categories';

/** A little crayon cat: the "do" example. */
function CatDoodle() {
  return (
    <svg viewBox="0 0 100 80" className="h-16 w-20" fill="none" stroke="#1e1b4b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M28 30 L24 10 L38 22 Q50 18 62 22 L76 10 L72 30 Q80 42 72 56 Q50 70 28 56 Q20 42 28 30 Z" fill="#fde68a" />
      <circle cx="40" cy="40" r="3.5" fill="#1e1b4b" />
      <circle cx="60" cy="40" r="3.5" fill="#1e1b4b" />
      <path d="M47 48 L50 51 L53 48" />
      <path d="M30 47 L14 45 M30 52 L15 55 M70 47 L86 45 M70 52 L85 55" strokeWidth="3" />
    </svg>
  );
}

/** One side of the "do / don't" comparison. */
function Example({ good, label, children }: { good: boolean; label: string; children: React.ReactNode }) {
  return (
    <div className={`relative flex flex-1 flex-col items-center gap-1 rounded-2xl border-4 border-dashed px-2 pt-3 pb-2 ${good ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}>
      <span className={`absolute -top-3 -right-3 grid size-8 place-items-center rounded-full text-white shadow-[0_3px_0_rgba(0,0,0,0.2)] ${good ? 'bg-emerald-500' : 'bg-rose-500'}`}>
        {good ? <Check className="size-5" strokeWidth={3.5} /> : <X className="size-5" strokeWidth={3.5} />}
      </span>
      <div className="grid h-16 place-items-center">{children}</div>
      <span className={`text-sm font-extrabold ${good ? 'text-emerald-700' : 'text-rose-700 dark:text-rose-300'}`}>{label}</span>
    </div>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-extrabold text-indigo-700 shadow-[inset_0_-2px_0_rgba(0,0,0,0.06)]">
      {icon}
      {children}
    </span>
  );
}

/** Shown when you join a room: what kind of game it is, and how to play fair (draw, don't write). */
export default function RulesModal({ state, onClose }: { state: ClientRoomState; onClose: () => void }) {
  const t = useT();
  const s = state.settings;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const cat = s.categories[0];
  const category = s.customOnly
    ? { emoji: '✏️', text: t('rules.custom') }
    : state.categoryPending
      ? { emoji: '⏳', text: t('rules.picking') }
      : cat
        ? { emoji: CATEGORY_LOOK[cat].emoji, text: t(`cat.${cat}`) }
        : { emoji: '🎲', text: t('rules.mixed') };
  const goal = s.targetScore > 0 ? t('rules.firstTo', { n: s.targetScore }) : t('rules.rounds', { n: s.rounds });

  return (
    <div className="fixed inset-0 z-[72] flex overflow-y-auto bg-indigo-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal aria-labelledby="rules-title" onClick={onClose}>
      <div className="panel crayon-edge m-auto w-full max-w-md animate-modal p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <h2 id="rules-title" className="font-display text-3xl font-bold text-indigo-950">
          {t('rules.title')} <span aria-hidden>✏️</span>
        </h2>

        {/* The room at a glance, as stickers. */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip icon={<span aria-hidden>{category.emoji}</span>}>{category.text}</Chip>
          <Chip icon={<Target className="size-4 text-pink-500" />}>{goal}</Chip>
          <Chip icon={<Users className="size-4 text-sky-500" />}>{s.mode === 'duo' ? t('gs.duo') : t('gs.classic')}</Chip>
          {s.speed > 0 && <Chip icon={<Timer className="size-4 text-amber-500" />}>{`${s.speed}s`}</Chip>}
          {s.singleColor && <Chip icon={<Palette className="size-4 text-violet-500" />}>{t('gs.singleColor')}</Chip>}
          {s.blindfold && <Chip icon={<EyeOff className="size-4 text-rose-500" />}>{t('gs.blindfold')}</Chip>}
        </div>

        {/* The big rule, shown rather than told. */}
        <p className="mt-5 font-display text-xl font-semibold text-indigo-950">{t('rules.main')}</p>
        <div className="mt-4 flex gap-4">
          <Example good label={t('rules.pictures')}>
            <CatDoodle />
          </Example>
          <Example good={false} label={t('rules.words')}>
            <span className="relative font-display text-2xl font-bold tracking-wider text-rose-400">
              ABC 123 #
              <span className="absolute inset-x-[-6px] top-1/2 h-1 -rotate-6 rounded-full bg-rose-500" aria-hidden />
            </span>
          </Example>
        </div>

        <ul className="mt-5 space-y-2 text-sm font-bold text-indigo-600">
          <li className="flex gap-2">
            <span aria-hidden>🤫</span> {t('rules.noSpoil')}
          </li>
          <li className="flex gap-2">
            <span aria-hidden>💛</span> {t('rules.beKind')}
          </li>
        </ul>

        <button type="button" className="btn btn-pink btn-play crayon-edge crayon-grain mt-5 w-full py-3 text-xl" onClick={onClose} autoFocus>
          <PencilLine className="size-6" /> {t('rules.ok')}
        </button>
      </div>
    </div>
  );
}
