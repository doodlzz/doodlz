import { useEffect, useRef, useState } from 'react';
import { Check, Crown, Flag, MoreVertical, Pencil, Trophy, UserX, WifiOff } from 'lucide-react';
import type { ClientRoomState, PlayerPublic, ReportReason } from '../../shared/types';
import type { GameApi } from '../hooks/useGame';
import { useT } from '../i18n';
import Avatar from './Avatar';
import TaggedName from './TaggedName';
import ScoringHelp from './ScoringHelp';

const RANK_STYLES = ['bg-amber-400 text-amber-950', 'bg-slate-300 text-slate-800', 'bg-orange-300 text-orange-950'];
const REASONS: ReportReason[] = ['drawing', 'chat', 'name', 'other'];

/** Report / kick menu for one player. */
export function PlayerMenu({ player, state, game, align = 'right' }: { player: PlayerPublic; state: ClientRoomState; game: GameApi; align?: 'left' | 'right' }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reported = state.reported.includes(player.id);
  const canKick = state.hostId === state.you && !state.isPublic;

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="grid size-7 cursor-pointer place-items-center rounded-full text-indigo-300 hover:bg-indigo-100 hover:text-indigo-700"
        aria-label={t('report.menu')}
        title={t('report.menu')}
      >
        <MoreVertical className="size-4" />
      </button>
      {open && (
        <div className={`panel absolute top-8 z-40 w-56 animate-pop overflow-hidden p-1.5 ${align === 'right' ? 'right-0' : 'left-0'}`}>
          <p className="truncate px-2.5 py-1.5 text-xs font-extrabold tracking-wider text-indigo-300 uppercase">{t('report.title', { name: player.name })}</p>
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              disabled={reported}
              onClick={() => {
                game.report(player.id, r);
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-bold text-indigo-900 hover:bg-indigo-50 disabled:cursor-default disabled:opacity-50"
            >
              <Flag className="size-4 text-rose-500" />
              {reported ? t('report.reported') : t(`report.${r}`)}
            </button>
          ))}
          {canKick && (
            <button
              type="button"
              onClick={() => {
                game.kick(player.id);
                setOpen(false);
              }}
              className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-xl border-t-2 border-indigo-50 px-2.5 py-2 text-left text-sm font-bold text-rose-600 hover:bg-rose-50"
            >
              <UserX className="size-4" />
              {t('report.kick')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  state: ClientRoomState;
  game: GameApi;
  className?: string;
}

export default function Leaderboard({ state, game, className = '' }: Props) {
  const t = useT();
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
        <span className="flex-1">{t('lb.players')}</span>
        {state.settings.targetScore > 0 && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-extrabold text-emerald-700">{t('lb.goal', { n: state.settings.targetScore })}</span>
        )}
        <ScoringHelp targetScore={state.settings.targetScore} />
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {ranked.map((p) => {
          const isDrawer = state.drawerIds.includes(p.id) && state.phase !== 'lobby';
          const delta = deltas[p.id];
          return (
            <li
              key={p.id}
              className={`relative flex items-center gap-2 border-b-2 border-indigo-50 px-2.5 py-2 transition-colors ${
                p.hasGuessed ? 'bg-emerald-100' : isDrawer ? 'bg-amber-50' : ''
              } ${p.connected ? '' : 'opacity-50'}`}
            >
              <span className={`grid size-7 shrink-0 place-items-center rounded-full font-display text-sm font-bold ${RANK_STYLES[p.rank - 1] ?? 'bg-indigo-100 text-indigo-700'}`}>
                {p.rank}
              </span>
              <Avatar avatar={p.avatar} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 font-bold text-indigo-950">
                  <TaggedName name={p.name} className="truncate" />
                  {p.id === state.hostId && <Crown className="size-3.5 shrink-0 text-amber-500" aria-label={t('lb.host')} />}
                </div>
                <div className="flex flex-wrap items-center gap-x-1.5 text-sm font-bold text-indigo-400">
                  {t('lb.pts', { n: p.score })}
                  {p.id === state.you && <span className="text-xs font-extrabold text-pink-500">{t('lb.you')}</span>}
                  {delta ? <span className="animate-pop text-emerald-600">+{delta}</span> : null}
                  {!p.connected && (
                    <span className="flex items-center gap-0.5 text-xs text-rose-500">
                      <WifiOff className="size-3" /> {t('lb.offline')}
                    </span>
                  )}
                </div>
                {state.settings.targetScore > 0 && (
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-indigo-100" title={`${p.score} / ${state.settings.targetScore}`}>
                    <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${Math.min(100, (p.score / state.settings.targetScore) * 100)}%` }} />
                  </div>
                )}
              </div>
              {isDrawer && (
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-400 text-amber-950" title={t('lb.drawing')}>
                  <Pencil className="size-3.5" />
                </span>
              )}
              {p.hasGuessed && (
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-500 text-white" title={t('lb.guessed')}>
                  <Check className="size-4" strokeWidth={3} />
                </span>
              )}
              {p.id !== state.you && <PlayerMenu player={p} state={state} game={game} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
