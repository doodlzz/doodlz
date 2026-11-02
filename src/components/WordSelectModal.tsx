import { Star } from 'lucide-react';
import type { Difficulty } from '../../shared/types';
import type { WordChoiceState } from '../hooks/useGame';
import { useCountdown } from '../hooks/useCountdown';

const STYLE: Record<Difficulty, { card: string; badge: string; stars: number }> = {
  easy: { card: 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100 shadow-[0_5px_0_#6ee7b7]', badge: 'bg-emerald-500', stars: 1 },
  medium: { card: 'bg-amber-50 border-amber-300 hover:bg-amber-100 shadow-[0_5px_0_#fcd34d]', badge: 'bg-amber-500', stars: 2 },
  hard: { card: 'bg-rose-50 border-rose-300 hover:bg-rose-100 shadow-[0_5px_0_#fda4af]', badge: 'bg-rose-500', stars: 3 },
};

interface Props {
  choices: WordChoiceState;
  onSelect: (index: number) => void;
}

export default function WordSelectModal({ choices, onSelect }: Props) {
  const left = useCountdown(choices.endsAt);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-indigo-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal aria-labelledby="choose-title">
      <div className="panel w-full max-w-2xl animate-pop p-6 text-center">
        <h2 id="choose-title" className="font-display text-3xl font-bold text-indigo-950">
          Choose a word to draw!
        </h2>
        <p className="mt-1 font-bold text-indigo-400">
          Harder words are worth more points · auto-pick in <span className="text-pink-500">{left}s</span>
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {choices.choices.map((c, i) => {
            const s = STYLE[c.difficulty];
            return (
              <button
                key={c.word}
                type="button"
                onClick={() => onSelect(i)}
                className={`flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-4 p-5 transition active:translate-y-1 active:shadow-none ${s.card}`}
              >
                <span className={`rounded-full px-3 py-1 text-xs font-extrabold tracking-wider text-white uppercase ${s.badge}`}>{c.difficulty}</span>
                <span className="font-display text-2xl font-bold break-words text-indigo-950 capitalize">{c.word}</span>
                <span className="flex gap-0.5">
                  {Array.from({ length: 3 }, (_, k) => (
                    <Star key={k} className={`size-5 ${k < s.stars ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`} />
                  ))}
                </span>
                <span className="font-display text-lg font-semibold text-indigo-700">×{c.multiplier} points</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 h-3 overflow-hidden rounded-full bg-indigo-100">
          <div className="h-full rounded-full bg-pink-500 transition-[width] duration-200 ease-linear" style={{ width: `${(left / 15) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
