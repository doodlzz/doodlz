import { useEffect, useState } from 'react';
import { ChevronDown, DoorOpen, Loader2, RefreshCw, Server, Trophy, Users } from 'lucide-react';
import { CATEGORIES, type Category, type LobbyInfo } from '../../shared/types';
import type { GameApi } from '../hooks/useGame';
import { useT } from '../i18n';
import { CATEGORY_LOOK } from '../lib/categories';
import TaggedName from './TaggedName';

const REFRESH_OPEN_MS = 4000;
const REFRESH_CLOSED_MS = 15000; // just keeps the "N open" count roughly right

interface Props {
  game: GameApi;
  disabled: boolean;
  onJoin: (code: string) => void;
}

/** "Existing lobbies" dropdown on the home screen: open public rooms, filterable by category. */
export default function LobbyBrowser({ game, disabled, onJoin }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [lobbies, setLobbies] = useState<LobbyInfo[] | null>(null);
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const { listLobbies, connected } = game;

  const refresh = async () => {
    setLoading(true);
    setLobbies(await listLobbies());
    setLoading(false);
  };

  // Keep the list fresh, more often while the dropdown is open.
  useEffect(() => {
    if (!connected) return;
    let alive = true;
    const load = () => listLobbies().then((l) => alive && setLobbies(l));
    load();
    const id = setInterval(load, open ? REFRESH_OPEN_MS : REFRESH_CLOSED_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [open, connected, listLobbies]);

  const shown = (lobbies ?? []).filter((l) => filter === 'all' || l.category === filter);
  // Only offer filters for categories that have a lobby (plus the one already selected).
  const used = new Set((lobbies ?? []).map((l) => l.category));
  const filters = CATEGORIES.filter((c) => used.has(c) || c === filter);

  const status = (l: LobbyInfo) => {
    if (l.phase === 'lobby') return t('browse.waiting');
    if (l.phase === 'game_over') return t('browse.gameOver');
    return l.targetScore > 0 ? t('browse.roundTarget', { round: l.round, n: l.targetScore }) : t('browse.round', { round: l.round, total: l.rounds });
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2 rounded-2xl border-4 border-indigo-100 bg-indigo-50/60 px-4 py-3 text-left font-display text-lg font-semibold text-indigo-900 transition hover:border-indigo-200"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Server className="size-5 text-violet-500" />
        <span className="flex-1">{t('browse.title')}</span>
        {lobbies && <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-sm text-indigo-700">{t('browse.count', { n: lobbies.length })}</span>}
        <ChevronDown className={`size-5 text-indigo-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 animate-pop rounded-2xl border-4 border-indigo-100 p-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1" role="group" aria-label={t('browse.filter')}>
              <button type="button" className={`chip shrink-0 ${filter === 'all' ? 'chip-on' : 'bg-indigo-50'}`} onClick={() => setFilter('all')}>
                {t('browse.all')}
              </button>
              {filters.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip flex shrink-0 items-center gap-1 ${filter === c ? 'chip-on' : 'bg-indigo-50'}`}
                  onClick={() => setFilter(c)}
                  title={t(`cat.${c}`)}
                >
                  <span aria-hidden>{CATEGORY_LOOK[c].emoji}</span>
                  {t(`cat.${c}`)}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl text-indigo-400 transition hover:bg-indigo-50 hover:text-indigo-600"
              onClick={refresh}
              aria-label={t('browse.refresh')}
              title={t('browse.refresh')}
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {lobbies === null ? (
            <div className="flex items-center justify-center gap-2 py-6 font-bold text-indigo-400">
              <Loader2 className="size-5 animate-spin" /> {t('browse.loading')}
            </div>
          ) : shown.length === 0 ? (
            <p className="py-6 text-center text-sm font-bold text-indigo-400">{lobbies.length === 0 ? t('browse.empty') : t('browse.emptyFilter')}</p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
              {shown.map((l) => {
                const look = l.category ? CATEGORY_LOOK[l.category] : null;
                const full = l.players >= l.maxPlayers;
                return (
                  <li key={l.code} className="flex items-center gap-2 rounded-2xl bg-indigo-50/70 p-2 sm:gap-3 sm:p-2.5">
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-xl text-xl sm:size-12 sm:text-2xl"
                      style={{ backgroundColor: look?.color ?? '#a5b4fc', boxShadow: `0 3px 0 ${look?.shadow ?? '#6366f1'}` }}
                      title={l.category ? t(`cat.${l.category}`) : t('browse.picking')}
                      aria-hidden
                    >
                      {look?.emoji ?? '❔'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold text-indigo-950">{l.category ? t(`cat.${l.category}`) : t('browse.picking')}</div>
                      <div className="truncate text-xs font-bold text-indigo-500">
                        {t('browse.by')} <TaggedName name={l.creator} className="font-extrabold text-indigo-950" />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-extrabold">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 whitespace-nowrap text-violet-600 dark:bg-white/10">
                          <Trophy className="size-3" /> {status(l)}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 dark:bg-white/10 ${full ? 'text-rose-500' : 'text-emerald-600'}`}>
                          <Users className="size-3" /> {l.players}/{l.maxPlayers}
                        </span>
                      </div>
                    </div>
                    <button type="button" className="btn btn-green shrink-0 px-3 py-2 text-base sm:px-4" disabled={disabled || full} onClick={() => onJoin(l.code)}>
                      <DoorOpen className="hidden size-4 sm:block" /> {full ? t('browse.full') : t('home.join')}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
