import { useMemo } from 'react';
import { DoorOpen, Home, Medal, RotateCcw, Trophy } from 'lucide-react';
import type { PlayerPublic } from '../../shared/types';
import type { GameApi } from '../hooks/useGame';
import Avatar from './Avatar';
import Logo from './Logo';

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

function PodiumSpot({ player, spot, you }: { player?: PlayerPublic; spot: (typeof PODIUM)[number]; you: string }) {
  return (
    <div className="flex w-24 flex-col items-center sm:w-36">
      {player ? (
        <div className="mb-2 flex animate-pop flex-col items-center" style={{ animationDelay: `${(3 - spot.place) * 0.25}s` }}>
          {spot.place === 1 ? <Trophy className="mb-1 size-8 fill-amber-300 text-amber-500" /> : <Medal className={`mb-1 size-6 ${spot.medal}`} />}
          <Avatar avatar={player.avatar} size={spot.place === 1 ? 88 : 68} className={spot.place === 1 ? 'animate-float' : ''} />
          <span className="mt-1 max-w-full truncate font-display text-base font-bold text-white drop-shadow sm:text-lg">
            {player.name}
            {player.id === you && ' (you)'}
          </span>
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-sm font-extrabold text-indigo-900">{player.score} pts</span>
        </div>
      ) : (
        <div className="mb-2 h-10" />
      )}
      <div className={`grid w-full place-items-center rounded-t-2xl ${spot.height} ${spot.color} shadow-[inset_0_-6px_0_rgba(0,0,0,0.12)]`}>
        <span className={`font-display text-5xl font-bold ${spot.text}`}>{spot.place}</span>
      </div>
    </div>
  );
}

export default function GameOver({ game }: { game: GameApi }) {
  const state = game.state!;
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const isHost = state.hostId === state.you;
  const rest = sorted.slice(3);

  return (
    <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center px-4 py-8">
      <Confetti />
      <Logo size="sm" />
      <h2 className="mt-4 font-display text-4xl font-bold text-white drop-shadow-[0_3px_0_rgba(30,27,75,0.5)] sm:text-5xl">Game over!</h2>
      <p className="mt-1 font-display text-lg font-medium text-white/85">
        {sorted[0] ? `${sorted[0].name} takes the crown 👑` : 'Thanks for playing!'}
      </p>

      <div className="mt-8 flex items-end justify-center gap-2 sm:gap-4">
        {PODIUM.map((spot) => (
          <PodiumSpot key={spot.place} spot={spot} player={sorted[spot.place - 1]} you={state.you} />
        ))}
      </div>

      <div className="panel w-full max-w-md rounded-t-none p-4">
        {rest.length > 0 && (
          <ul className="mb-4 flex flex-col gap-1.5">
            {rest.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-indigo-50 px-3 py-2">
                <span className="w-6 text-center font-display font-bold text-indigo-400">{i + 4}</span>
                <Avatar avatar={p.avatar} size={32} />
                <span className="flex-1 truncate font-bold text-indigo-950">
                  {p.name}
                  {p.id === state.you && ' (you)'}
                </span>
                <span className="font-bold text-indigo-500">{p.score} pts</span>
              </li>
            ))}
          </ul>
        )}

        {isHost ? (
          <div className="flex flex-col gap-2">
            <button className="btn btn-green w-full py-4 text-xl" onClick={game.startGame} disabled={state.players.length < 2}>
              <RotateCcw className="size-6" /> Play again
            </button>
            {state.players.length < 2 && <p className="text-center text-sm font-bold text-indigo-400">Need at least 2 players for a rematch</p>}
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-blue text-base" onClick={game.backToLobby}>
                <Home className="size-5" /> Lobby
              </button>
              <button className="btn btn-ghost text-base" onClick={game.leaveRoom}>
                <DoorOpen className="size-5" /> Leave
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button className="btn btn-green w-full py-4 text-xl" disabled>
              <RotateCcw className="size-6" /> Waiting for host…
            </button>
            <button className="btn btn-ghost text-base" onClick={game.leaveRoom}>
              <DoorOpen className="size-5" /> Leave room
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
