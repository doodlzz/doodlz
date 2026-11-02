import { Dices, Star } from 'lucide-react';
import type { Difficulty } from '../../shared/types';
import type { WordChoiceState } from '../hooks/useGame';
import { useCountdown } from '../hooks/useCountdown';
import { useT } from '../i18n';

const STYLE: Record<Difficulty, { card: string; badge: string; stars: number }> = {
  easy: { card: 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100 shadow-[0_5px_0_#6ee7b7]', badge: 'bg-emerald-500', stars: 1 },
  medium: { card: 'bg-amber-50 border-amber-300 hover:bg-amber-100 shadow-[0_5px_0_#fcd34d]', badge: 'bg-amber-500', stars: 2 },
  hard: { card: 'bg-rose-50 border-rose-300 hover:bg-rose-100 shadow-[0_5px_0_#fda4af]', badge: 'bg-rose-500', stars: 3 },
};

interface Props {
  choices: WordChoiceState;
  totalSeconds: number;
  rerollsLeft: number;
  partnerName: string | null; // duo mode
  onSelect: (index: number) => void;
  onReroll: () => void;
}

export default function WordSelectModal({ choices, totalSeconds, rerollsLeft, partnerName, onSelect, onReroll }: Props) {
  const t = useT();
  const left = useCountdown(choices.endsAt);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-indigo-950/60 p-4 backdrop-blur-sm dark:bg-black/70" role="dialog" aria-modal aria-labelledby="choose-title">
      <div className="panel max-h-[95vh] w-full max-w-2xl animate-pop overflow-y-auto p-6 text-center">
        <h2 id="choose-title" className="font-display text-3xl font-bold text-indigo-950">
          {t('words.title')}
        </h2>
        <p className="mt-1 font-bold text-indigo-400">{t('words.subtitle', { s: left })}</p>
        {partnerName && <p className="mt-1 font-bold text-pink-500">{t('words.duoNote', { name: partnerName })}</p>}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {choices.choices.map((c, i) => {
            const s = STYLE[c.difficulty];
            return (
              <button
                key={c.word}
                type="button"
                onClick={() => onSelect(i)}
                className={`flex cursor-pointer flex-col items-center gap-2.5 rounded-3xl border-4 p-5 transition active:translate-y-1 active:shadow-none ${s.card}`}
              >
                <span className={`rounded-full px-3 py-1 text-xs font-extrabold tracking-wider text-white uppercase ${s.badge}`}>{t(`diff.${c.difficulty}`)}</span>
                <span className="font-display text-2xl font-bold break-words text-indigo-950 capitalize">
                  {c.parts ? (
                    <>
                      {c.parts[0]}
                      <span className="text-pink-500">·</span>
                      {c.parts[1]}
                    </>
                  ) : (
                    c.word
                  )}
                </span>
                {c.category !== 'compound' && c.category !== 'custom' && (
                  <span className="text-xs font-extrabold tracking-wider text-indigo-400 uppercase">{t(`cat.${c.category}`)}</span>
                )}
                <span className="flex gap-0.5">
                  {Array.from({ length: 3 }, (_, k) => (
                    <Star key={k} className={`size-5 ${k < s.stars ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`} />
                  ))}
                </span>
                <span className="font-display text-lg font-semibold text-indigo-700">{t('words.points', { n: c.multiplier })}</span>
              </button>
            );
          })}
        </div>

        <button type="button" onClick={onReroll} disabled={rerollsLeft <= 0} className="btn btn-violet mt-5 text-base">
          <Dices className="size-5" />
          {rerollsLeft > 0 ? t('words.reroll') : t('words.rerollUsed')}
        </button>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-indigo-100">
          <div className="h-full rounded-full bg-pink-500 transition-[width] duration-200 ease-linear" style={{ width: `${Math.min(100, (left / totalSeconds) * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
