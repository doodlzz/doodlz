import { Fragment, useMemo, type ReactNode } from 'react';
import { DoorOpen, Home, Medal, RotateCcw, Trophy } from 'lucide-react';
import type { Award, AwardId, PlayerPublic } from '../../shared/types';
import type { GameApi } from '../hooks/useGame';
import { useCountdown } from '../hooks/useCountdown';
import Avatar from './Avatar';
import Logo from './Logo';
import RewardCard from './RewardCard';
import { AdSlot } from './Promo';
import { useT, type TFn } from '../i18n';
import TaggedName from './TaggedName';

const CONFETTI_COLORS = ['#f87171', '#facc15', '#4ade80', '#38bdf8', '#c084fc', '#fb923c', '#f472b6'];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 3.5,
        duration: 2.8 + Math.random() * 2.5,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w: 6 + Math.random() * 6,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden motion-reduce:hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute -top-4 animate-fall rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.w * 1.6,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

const PODIUM = [
  { place: 2, height: 'h-28 sm:h-36', color: 'bg-slate-300', text: 'text-slate-700', medal: 'text-slate-400' },
  { place: 1, height: 'h-40 sm:h-52', color: 'bg-amber-400', text: 'text-amber-900', medal: 'text-amber-500' },
  { place: 3, height: 'h-20 sm:h-28', color: 'bg-orange-300', text: 'text-orange-900', medal: 'text-orange-500' },
];

/** Place for each player: tied scores share a place (two 1sts, then 3rd). */
function placeOf(players: PlayerPublic[], p: PlayerPublic): number {
  return 1 + players.filter((o) => o.score > p.score).length;
}

/** Puts React nodes into a translated sentence at its {name} slot. */
function withName(template: string, name: ReactNode): ReactNode {
  const [before, after = ''] = template.split('{name}');
  return (
    <>
      {before}
      {name}
      {after}
    </>
  );
}

function PodiumSpot({
  player,
  spot,
  place,
  tied,
  you,
  t,
}: {
  player?: PlayerPublic;
  spot: (typeof PODIUM)[number];
  place: number;
  tied: boolean;
  you: string;
  t: TFn;
}) {
  return (
    <div className="flex w-24 flex-col items-center sm:w-36">
      {player ? (
        <div className="mb-2 flex animate-pop flex-col items-center" style={{ animationDelay: `${(3 - spot.place) * 0.25}s` }}>
          {tied && <span className="mb-1 rounded-full bg-pink-500 px-2 py-0.5 text-xs font-extrabold text-white uppercase">{t('over.tieChip')}</span>}
          {place === 1 ? <Trophy className="mb-1 size-8 fill-amber-300 text-amber-500" /> : <Medal className={`mb-1 size-6 ${spot.medal}`} />}
          <Avatar avatar={player.avatar} size={spot.place === 1 ? 88 : 68} className={spot.place === 1 ? 'animate-float' : ''} />
          <span className="mt-1 max-w-full truncate font-display text-base font-bold text-white drop-shadow sm:text-lg">
            <TaggedName name={player.name} fx={player.avatar.nameFx} level={player.avatar.level} />
            {player.id === you && ` ${t('lb.you')}`}
          </span>
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-sm font-extrabold text-[#1e1b4b]">{player.score}</span>
        </div>
      ) : (
        <div className="mb-2 h-10" />
      )}
      <div className={`grid w-full place-items-center rounded-t-2xl ${spot.height} ${spot.color} shadow-[inset_0_-6px_0_rgba(0,0,0,0.12)]`}>
        <span className={`font-display text-5xl font-bold ${spot.text}`}>{player ? place : spot.place}</span>
      </div>
    </div>
  );
}

const AWARDS: Record<AwardId, { emoji: string; tint: string }> = {
  fastest: { emoji: '⚡', tint: 'bg-sky-100 dark:bg-sky-400/15' },
  artist: { emoji: '🎨', tint: 'bg-pink-100 dark:bg-pink-400/15' },
  firstGuesser: { emoji: '🥇', tint: 'bg-amber-100 dark:bg-amber-400/15' },
  noHints: { emoji: '🧠', tint: 'bg-violet-100 dark:bg-violet-400/15' },
  soClose: { emoji: '😅', tint: 'bg-emerald-100 dark:bg-emerald-400/15' },
};

function Awards({ awards, players, you, t }: { awards: Award[]; players: PlayerPublic[]; you: string; t: TFn }) {
  const shown = awards.flatMap((a) => {
    const p = players.find((x) => x.id === a.playerId);
    return p ? [{ ...a, player: p }] : [];
  });
  if (!shown.length) return null;
  return (
    <section className="mb-4">
      <h3 className="mb-2 font-display text-lg font-semibold text-indigo-950">{t('over.awards')}</h3>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {shown.map((a, i) => (
          <li
            key={a.id}
            className={`flex animate-pop items-center gap-3 rounded-2xl px-3 py-2 ${AWARDS[a.id].tint} ${a.playerId === you ? 'ring-2 ring-pink-300' : ''}`}
            style={{ animationDelay: `${0.8 + i * 0.15}s` }}
          >
            <span className="text-2xl" aria-hidden>
              {AWARDS[a.id].emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold tracking-wide text-indigo-500 uppercase">{t(`award.${a.id}`)}</div>
              <div className="flex items-center gap-1.5 truncate text-sm font-bold text-indigo-950">
                <Avatar avatar={a.player.avatar} size={20} />
                <TaggedName name={a.player.name} fx={a.player.avatar.nameFx} className="truncate" />
              </div>
              <div className="text-xs font-bold text-indigo-400">{t(`award.${a.id}.detail`, { n: a.value })}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function GameOver({ game }: { game: GameApi }) {
  const t = useT();
  const state = game.state!;
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const isHost = state.hostId === state.you;
  const rest = sorted.slice(3);
  const connected = state.players.filter((p) => p.connected).length;
  const places = sorted.map((p) => placeOf(sorted, p));
  const tied = (i: number) => places.filter((pl) => pl === places[i]).length > 1;
  const winners = sorted.filter((_, i) => places[i] === 1);
  const backIn = useCountdown(state.isPublic && state.phaseEndsAt ? game.toLocalTime(state.phaseEndsAt) : null);
  const winnerNames = winners.map((w, i) => (
    <Fragment key={w.id}>
      {i > 0 && ' & '}
      <TaggedName name={w.name} />
    </Fragment>
  ));

  return (
    <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center px-4 py-8">
      <Confetti />
      <Logo size="sm" />
      <h2 className="mt-4 font-display text-4xl font-bold text-white drop-shadow-[0_3px_0_rgba(30,27,75,0.5)] sm:text-5xl">{t('over.title')}</h2>
      <p className="mt-1 font-display text-lg font-medium text-white/85">{winners.length === 0 || winners[0].score <= 0 ? t('over.thanks') : withName(t(winners.length > 1 ? 'over.tie' : 'over.crown'), winnerNames)}</p>

      <div className="mt-8 flex items-end justify-center gap-2 sm:gap-4">
        {PODIUM.map((spot) => (
          <PodiumSpot
            key={spot.place}
            spot={spot}
            player={sorted[spot.place - 1]}
            place={places[spot.place - 1] ?? spot.place}
            tied={sorted[spot.place - 1] !== undefined && tied(spot.place - 1)}
            you={state.you}
            t={t}
          />
        ))}
      </div>

      <div className="panel w-full max-w-md rounded-t-none p-4">
        {game.reward && <RewardCard reward={game.reward} />}
        <Awards awards={state.awards} players={state.players} you={state.you} t={t} />
        {rest.length > 0 && (
          <ul className="mb-4 flex flex-col gap-1.5">
            {rest.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-indigo-50 px-3 py-2">
                <span className="w-6 text-center font-display font-bold text-indigo-400">{places[i + 3]}</span>
                <Avatar avatar={p.avatar} size={32} />
                <span className="flex-1 truncate font-bold text-indigo-950">
                  <TaggedName name={p.name} fx={p.avatar.nameFx} level={p.avatar.level} />
                  {p.id === state.you && ` ${t('lb.you')}`}
                </span>
                <span className="font-bold text-indigo-500">{t('lb.pts', { n: p.score })}</span>
              </li>
            ))}
          </ul>
        )}

        {state.isPublic ? (
          <div className="flex flex-col gap-2">
            <div className="rounded-2xl bg-indigo-50 py-4 text-center font-display text-lg font-semibold text-indigo-500" role="status">
              {backIn > 0 ? t('over.backIn', { s: backIn }) : t('over.nextGame')}
            </div>
            <button className="btn btn-ghost text-base" onClick={game.leaveRoom}>
              <DoorOpen className="size-5" /> {t('over.leaveRoom')}
            </button>
          </div>
        ) : isHost ? (
          <div className="flex flex-col gap-2">
            <button className="btn btn-green w-full py-4 text-xl" onClick={game.startGame} disabled={connected < 2}>
              <RotateCcw className="size-6" /> {t('over.playAgain')}
            </button>
            {connected < 2 && <p className="text-center text-sm font-bold text-indigo-400">{t('over.needTwo')}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-blue text-base" onClick={game.backToLobby}>
                <Home className="size-5" /> {t('over.lobby')}
              </button>
              <button className="btn btn-ghost text-base" onClick={game.leaveRoom}>
                <DoorOpen className="size-5" /> {t('over.leave')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button className="btn btn-green w-full py-4 text-xl" disabled>
              <RotateCcw className="size-6" /> {t('over.waitingHost')}
            </button>
            <button className="btn btn-ghost text-base" onClick={game.leaveRoom}>
              <DoorOpen className="size-5" /> {t('over.leaveRoom')}
            </button>
          </div>
        )}
      </div>
      <AdSlot placement="gameover" className="mt-6 w-full max-w-md" />
      {/* Wide screens: tall ads in the empty space either side of the podium. */}
      <AdSlot placement="gameoverLeft" className="fixed top-1/2 left-4 z-10 w-[min(300px,calc((100vw_-_48rem)/2_-_2rem))] -translate-y-1/2" />
      <AdSlot placement="gameoverSide" className="fixed top-1/2 right-4 z-10 w-[min(300px,calc((100vw_-_48rem)/2_-_2rem))] -translate-y-1/2" />
    </div>
  );
}
