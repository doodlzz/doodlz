import { AlarmClock, DoorOpen, Pencil } from 'lucide-react';
import type { ClientRoomState } from '../../shared/types';
import type { GameApi } from '../hooks/useGame';
import { useCountdown } from '../hooks/useCountdown';
import Avatar from './Avatar';
import Canvas from './Canvas';
import Chat from './Chat';
import Leaderboard from './Leaderboard';
import Logo from './Logo';
import WordSelectModal from './WordSelectModal';

function Timer({ secondsLeft, total }: { secondsLeft: number; total: number }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const frac = total > 0 ? Math.min(1, secondsLeft / total) : 0;
  const urgent = secondsLeft <= 10 && secondsLeft > 0;
  return (
    <div className={`relative grid size-16 shrink-0 place-items-center ${urgent ? 'animate-pulse' : ''}`} aria-label={`${secondsLeft} seconds left`}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="#eef2ff" stroke="#e0e7ff" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={urgent ? '#f43f5e' : '#6366f1'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          className="transition-[stroke-dashoffset] duration-300 ease-linear"
        />
      </svg>
      <span className={`relative font-display text-xl font-bold ${urgent ? 'text-rose-500' : 'text-indigo-950'}`}>{secondsLeft}</span>
    </div>
  );
}

function WordDisplay({ state }: { state: ClientRoomState }) {
  const isDrawer = state.drawerId === state.you;
  const drawer = state.players.find((p) => p.id === state.drawerId);

  if (state.phase === 'choosing') {
    return <p className="font-display text-lg font-semibold text-indigo-500">{isDrawer ? 'Pick a word!' : `${drawer?.name ?? 'Someone'} is choosing a word…`}</p>;
  }
  if (!state.hint) return null;

  const known = !!state.word;
  const words = state.hint.join('').split(' ');
  const lengths = words.map((w) => w.length).join(', ');

  return (
    <div className="flex flex-col items-center">
      <span className="text-[11px] font-extrabold tracking-widest text-indigo-300 uppercase">
        {isDrawer ? 'Draw this' : known ? 'You got it!' : 'Guess this'} · {lengths}
      </span>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 sm:gap-x-4">
        {words.map((w, wi) => (
          <div key={wi} className="flex gap-0.5 sm:gap-1">
            {[...w].map((ch, i) => (
              <span
                key={i}
                className={`grid w-4 place-items-center border-b-4 font-display text-xl leading-tight font-bold uppercase sm:w-6 sm:text-2xl ${
                  known ? (isDrawer ? 'border-indigo-200 text-indigo-950' : 'border-emerald-300 text-emerald-600') : 'border-indigo-950 text-indigo-950'
                }`}
              >
                {ch === '_' ? ' ' : ch}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChoosingOverlay({ state }: { state: ClientRoomState }) {
  const drawer = state.players.find((p) => p.id === state.drawerId);
  if (!drawer || state.drawerId === state.you) return null;
  return (
    <div className="absolute inset-0 grid place-items-center bg-indigo-950/50 backdrop-blur-[2px]">
      <div className="flex animate-pop flex-col items-center gap-2 rounded-3xl bg-white px-8 py-6 text-center shadow-xl">
        <Avatar avatar={drawer.avatar} size={80} className="animate-float" />
        <p className="font-display text-2xl font-bold text-indigo-950">{drawer.name}</p>
        <p className="flex items-center gap-1 font-bold text-indigo-400">
          is choosing a word
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
        </p>
      </div>
    </div>
  );
}

const REASONS = { all_guessed: 'Everyone guessed it! 🎉', time_up: "Time's up! ⏰", drawer_left: 'The drawer left 🚪' };

function TurnEndOverlay({ state }: { state: ClientRoomState }) {
  const turn = state.lastTurn;
  if (!turn) return null;
  const rows = [...state.players].sort((a, b) => (turn.deltas[b.id] ?? 0) - (turn.deltas[a.id] ?? 0));
  return (
    <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-indigo-950/60 p-3 backdrop-blur-[2px]">
      <div className="w-full max-w-sm animate-pop rounded-3xl bg-white p-5 text-center shadow-xl">
        <p className="font-display text-lg font-semibold text-indigo-400">{REASONS[turn.reason]}</p>
        {turn.word && (
          <p className="mt-1 font-display text-xl font-semibold text-indigo-950">
            The word was <span className="text-2xl font-bold text-pink-500 capitalize">{turn.word}</span>
          </p>
        )}
        <ul className="mt-4 flex max-h-56 flex-col gap-1.5 overflow-y-auto text-left">
          {rows.map((p) => {
            const d = turn.deltas[p.id] ?? 0;
            return (
              <li key={p.id} className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-1.5">
                <Avatar avatar={p.avatar} size={28} />
                <span className="flex-1 truncate font-bold text-indigo-950">{p.name}</span>
                {p.id === state.drawerId && <Pencil className="size-4 text-amber-500" />}
                <span className={`font-display text-lg font-bold ${d > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>+{d}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default function Game({ game }: { game: GameApi }) {
  const state = game.state!;
  const isDrawer = state.drawerId === state.you;
  const me = state.players.find((p) => p.id === state.you);
  const secondsLeft = useCountdown(state.phaseEndsAt === null ? null : game.toLocalTime(state.phaseEndsAt));

  const timerTotal = state.phase === 'drawing' ? state.settings.drawTime : state.phase === 'choosing' ? 15 : 6;
  const overlay =
    state.phase === 'choosing' ? <ChoosingOverlay state={state} /> : state.phase === 'turn_end' ? <TurnEndOverlay state={state} /> : null;

  const placeholder =
    state.phase !== 'drawing'
      ? 'Chat with everyone…'
      : isDrawer
        ? 'Chat with players who guessed…'
        : me?.hasGuessed
          ? 'Only players who guessed will see this…'
          : 'Type your guess here…';

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-3 px-3 py-3 sm:px-4">
      <header className="panel flex items-center gap-3 px-3 py-2 sm:px-4">
        <Timer secondsLeft={secondsLeft} total={timerTotal} />
        <div className="hidden flex-col leading-tight sm:flex">
          <span className="flex items-center gap-1 text-xs font-extrabold tracking-wider text-indigo-300 uppercase">
            <AlarmClock className="size-3.5" /> Round
          </span>
          <span className="font-display text-xl font-bold text-indigo-950">
            {Math.min(state.round, state.settings.rounds)} <span className="text-indigo-300">/ {state.settings.rounds}</span>
          </span>
        </div>
        <div className="flex min-w-0 flex-1 justify-center px-2 text-center">
          <WordDisplay state={state} />
        </div>
        <div className="hidden lg:block">
          <Logo size="sm" />
        </div>
        <button className="btn btn-ghost px-3 py-2 text-sm" onClick={game.leaveRoom} title="Leave game">
          <DoorOpen className="size-5" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
        <div className="sm:col-span-2 lg:order-2 lg:col-span-1">
          <Canvas isDrawer={isDrawer} canDraw={isDrawer && state.phase === 'drawing'} overlay={overlay} />
        </div>
        <Leaderboard state={state} className="order-3 max-h-72 sm:order-none sm:h-[320px] sm:max-h-none lg:order-1 lg:h-auto lg:max-h-[calc(100vh-110px)]" />
        <Chat
          messages={game.messages}
          onSend={game.sendGuess}
          placeholder={placeholder}
          title={state.phase === 'drawing' && !isDrawer && !me?.hasGuessed ? 'Guess the word' : 'Chat'}
          className="order-2 h-80 sm:order-none sm:h-[320px] lg:order-3 lg:h-[calc(100vh-110px)]"
        />
      </main>

      {isDrawer && state.phase === 'choosing' && game.wordChoices && <WordSelectModal choices={game.wordChoices} onSelect={game.selectWord} />}
    </div>
  );
}
