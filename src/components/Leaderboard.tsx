import { Check, Crown, Pencil, Trophy } from 'lucide-react';
import type { ClientRoomState } from '../../shared/types';
import Avatar from './Avatar';

interface Props {
  state: ClientRoomState;
  className?: string;
}

const RANK_STYLES = ['bg-amber-400 text-amber-950', 'bg-slate-300 text-slate-800', 'bg-orange-300 text-orange-950'];

export default function Leaderboard({ state, className = '' }: Props) {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const deltas = state.lastTurn?.deltas ?? {};

  // Tied scores share a rank.
  let rank = 0;
  let prevScore = Number.NaN;
  const ranked = sorted.map((p, i) => {
    if (p.score !== prevScore) rank = i + 1;
    prevScore = p.score;
    return { ...p, rank };
  });

  return (
    <div className={`panel flex min-h-0 flex-col overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 border-b-4 border-indigo-50 px-4 py-2.5 font-display text-lg font-semibold text-indigo-900">
        <Trophy className="size-5 text-amber-500" />
        Players
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {ranked.map((p) => {
          const isDrawer = p.id === state.drawerId && state.phase !== 'lobby';
          const delta = deltas[p.id];
          return (
            <li
              key={p.id}
              className={`relative flex items-center gap-2.5 border-b-2 border-indigo-50 px-3 py-2 transition-colors ${
                p.hasGuessed ? 'bg-emerald-100' : isDrawer ? 'bg-amber-50' : ''
              }`}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full font-display text-sm font-bold ${
                  RANK_STYLES[p.rank - 1] ?? 'bg-indigo-100 text-indigo-700'
                }`}
              >
                {p.rank}
              </span>
              <Avatar avatar={p.avatar} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 truncate font-bold text-indigo-950">
                  <span className="truncate">{p.name}</span>
                  {p.id === state.you && <span className="shrink-0 text-xs font-extrabold text-pink-500">(you)</span>}
                  {p.id === state.hostId && <Crown className="size-3.5 shrink-0 text-amber-500" aria-label="Host" />}
                </div>
                <div className="text-sm font-bold text-indigo-400">
                  {p.score} pts
                  {delta ? <span className="ml-1.5 animate-pop text-emerald-600">+{delta}</span> : null}
                </div>
              </div>
              {isDrawer && (
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-400 text-amber-950" title="Drawing">
                  <Pencil className="size-4" />
                </span>
              )}
              {p.hasGuessed && (
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-white" title="Guessed it!">
                  <Check className="size-5" strokeWidth={3} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
