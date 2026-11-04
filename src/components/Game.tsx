import { AlarmClock, DoorOpen, Lightbulb, Pencil, WifiOff, Zap } from 'lucide-react';
import type { ClientRoomState } from '../../shared/types';
import type { GameApi } from '../hooks/useGame';
import { useCountdown } from '../hooks/useCountdown';
import { useT } from '../i18n';
import Avatar from './Avatar';
import Canvas from './canvas/Canvas';
import Chat from './Chat';
import Leaderboard from './Leaderboard';
import Logo from './Logo';
import { CodeEyeButton, maskCode, useCodeVisibility } from './RoomCode';
import SettingsButton from './SettingsModal';
import WordSelectModal from './WordSelectModal';
import TaggedName from './TaggedName';

function Timer({ secondsLeft, total }: { secondsLeft: number; total: number }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const frac = total > 0 ? Math.min(1, secondsLeft / total) : 0;
  const urgent = secondsLeft <= 10 && secondsLeft > 0;
  return (
    <div className={`relative grid size-16 shrink-0 place-items-center ${urgent ? 'animate-pulse' : ''}`} aria-label={`${secondsLeft}s`}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="var(--color-indigo-50)" stroke="var(--color-indigo-100)" strokeWidth="6" />
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

function WordDisplay({ state, game }: { state: ClientRoomState; game: GameApi }) {
  const t = useT();
  const isDrawer = state.drawerIds.includes(state.you);
  const lead = state.players.find((p) => p.id === state.drawerIds[0]);

  if (state.phase === 'choosing') {
    return (
      <p className="font-display text-lg font-semibold text-indigo-500">
        {state.drawerIds[0] === state.you ? t('game.pickWord') : t('game.choosing', { name: lead?.name ?? '?' })}
      </p>
    );
  }
  if (!state.hint) return null;

  const known = !!state.word;
  const words = state.hint.join('').split(' ');
  const lengths = words.map((w) => w.length).join(', ');
  const label = state.myPart ? t('game.drawYourPart') : isDrawer ? t('game.drawThis') : known ? t('game.youGotIt') : t('game.guessThis');

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center">
        <span className="text-[11px] font-extrabold tracking-widest text-indigo-300 uppercase">
          {label} · {lengths}
        </span>
        {state.myPart ? (
          <span className="font-display text-2xl font-bold tracking-wide text-indigo-950 uppercase">
            {state.myPart} <span className="text-base text-indigo-300 normal-case">({state.word})</span>
          </span>
        ) : (
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
        )}
      </div>
      {state.phase === 'drawing' && !isDrawer && !known && (
        <button
          type="button"
          onClick={game.requestHint}
          disabled={state.hintsLeft <= 0}
          className="btn btn-yellow shrink-0 flex-col gap-0 px-2.5 py-1 text-sm leading-tight"
          title={t('game.hintCost')}
        >
          <span className="flex items-center gap-1">
            <Lightbulb className="size-4" /> {t('game.hint')} ({state.hintsLeft})
          </span>
          <span className="text-[10px] font-extrabold opacity-70">{t('game.hintCost')}</span>
        </button>
      )}
    </div>
  );
}

function ChoosingOverlay({ state }: { state: ClientRoomState }) {
  const t = useT();
  const lead = state.players.find((p) => p.id === state.drawerIds[0]);
  if (!lead || state.drawerIds[0] === state.you) return null;
  return (
    <div className="absolute inset-0 grid place-items-center bg-indigo-950/50 backdrop-blur-[2px]">
      <div className="flex animate-pop flex-col items-center gap-2 rounded-3xl bg-surface px-8 py-6 text-center shadow-xl">
        <Avatar avatar={lead.avatar} size={80} className="animate-float" />
        <p className="font-display text-2xl font-bold text-indigo-950">
          <TaggedName name={lead.name} />
        </p>
        <p className="flex items-center gap-1 font-bold text-indigo-400">
          {t('game.isChoosing')}
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

/** End-of-turn results, shown under the canvas so the finished drawing stays fully visible. */
function TurnSummary({ state }: { state: ClientRoomState }) {
  const t = useT();
  const turn = state.lastTurn;
  if (!turn) return null;
  const reasons = { all_guessed: t('game.everyoneGuessed'), time_up: t('game.timeUp'), drawer_left: t('game.drawerLeft') };
  const rows = [...state.players].sort((a, b) => (turn.deltas[b.id] ?? 0) - (turn.deltas[a.id] ?? 0));
  return (
    <div className="panel animate-pop p-4" role="status">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {turn.word ? (
          <p className="font-display text-xl font-semibold text-indigo-950">
            {t('game.wordWas')} <span className="text-2xl font-bold text-pink-500 capitalize">{turn.word}</span>
          </p>
        ) : (
          <span />
        )}
        <p className="font-display text-base font-semibold text-indigo-400">{reasons[turn.reason]}</p>
      </div>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {rows.map((p) => {
          const d = turn.deltas[p.id] ?? 0;
          return (
            <li key={p.id} className="flex items-center gap-1.5 rounded-full bg-indigo-50 py-1 pr-3 pl-1">
              <Avatar avatar={p.avatar} size={26} />
              <TaggedName name={p.name} className="max-w-32 truncate text-sm font-bold text-indigo-950" />
              {state.drawerIds.includes(p.id) && <Pencil className="size-3.5 text-amber-500" />}
              <span className={`font-display font-bold ${d > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>+{d}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Game({ game }: { game: GameApi }) {
  const t = useT();
  const state = game.state!;
  const isDrawer = state.drawerIds.includes(state.you);
  const isLead = state.drawerIds[0] === state.you;
  const me = state.players.find((p) => p.id === state.you);
  const partner = state.drawerIds.length > 1 ? state.players.find((p) => p.id === state.drawerIds.find((id) => id !== state.you)) : undefined;
  const secondsLeft = useCountdown(state.phaseEndsAt === null ? null : game.toLocalTime(state.phaseEndsAt));
  const chooseSeconds = state.settings.speed ? 8 : 15;
  const { hidden: codeHidden } = useCodeVisibility();

  const timerTotal = state.phase === 'drawing' ? state.turnSeconds : state.phase === 'choosing' ? chooseSeconds : 6;
  const overlay = state.phase === 'choosing' ? <ChoosingOverlay state={state} /> : null;
  const blindfolded = isDrawer && state.settings.blindfold && state.phase === 'drawing';

  const placeholder =
    state.phase !== 'drawing' ? t('chat.phAll') : isDrawer ? t('chat.phDrawer') : me?.hasGuessed ? t('chat.phGuessed') : t('chat.phGuess');

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-3 px-3 py-3 sm:px-4">
      {!game.connected && (
        <div className="fixed top-3 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-amber-400 px-4 py-2 font-bold text-amber-950 shadow-lg" role="status">
          <WifiOff className="size-5" /> {t('game.reconnectBanner')}
        </div>
      )}
      <header className="panel flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 sm:flex-nowrap sm:px-4">
        <Timer secondsLeft={secondsLeft} total={timerTotal} />
        <div className="hidden flex-col leading-tight sm:flex">
          <span className="flex items-center gap-1 text-xs font-extrabold tracking-wider text-indigo-300 uppercase">
            <AlarmClock className="size-3.5" /> {t('game.round')}
            {state.settings.speed > 0 && <Zap className="size-3.5 text-amber-500" />}
          </span>
          <span className="font-display text-xl font-bold text-indigo-950">
            {Math.min(state.round, state.settings.rounds)} <span className="text-indigo-300">/ {state.settings.rounds}</span>
          </span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-extrabold tracking-wider text-indigo-300 uppercase">{t('game.code')}</span>
          <span className="flex items-center gap-1">
            <span className="font-display text-xl font-bold tracking-widest text-indigo-950">{maskCode(state.code, codeHidden)}</span>
            <CodeEyeButton className="size-7 text-indigo-300 hover:bg-indigo-50 hover:text-indigo-700" />
          </span>
        </div>
        <div className="order-last flex min-w-0 basis-full flex-col items-center justify-center px-2 pb-1 text-center sm:order-none sm:flex-1 sm:basis-auto sm:pb-0">
          <WordDisplay state={state} game={game} />
          {partner && isDrawer && state.phase === 'drawing' && <span className="text-xs font-bold text-pink-500">{t('game.duoPartner', { name: partner.name })}</span>}
        </div>
        <div className="hidden xl:block">
          <Logo size="sm" />
        </div>
        <span className="flex-1 sm:hidden" />
        <SettingsButton />
        <button className="btn btn-ghost px-3 py-2 text-sm" onClick={game.leaveRoom} title={t('game.leave')}>
          <DoorOpen className="size-5" />
          <span className="hidden sm:inline">{t('game.leave')}</span>
        </button>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[250px_minmax(0,1fr)_300px]">
        <div className="sm:col-span-2 lg:order-2 lg:col-span-1">
          <Canvas
            isDrawer={isDrawer && state.phase !== 'turn_end'}
            canDraw={isDrawer && state.phase === 'drawing'}
            blindfolded={blindfolded}
            lockedColor={state.drawColor}
            background={state.background}
            onBackground={game.setBackground}
            overlay={overlay}
          />
          {state.phase === 'turn_end' && (
            <div className="mt-3">
              <TurnSummary state={state} />
            </div>
          )}
        </div>
        <Leaderboard state={state} game={game} className="order-3 max-h-72 sm:order-none sm:h-[320px] sm:max-h-none lg:order-1 lg:h-auto lg:max-h-[calc(100vh-110px)]" />
        <Chat
          messages={game.messages}
          onSend={game.sendGuess}
          placeholder={placeholder}
          title={state.phase === 'drawing' && !isDrawer && !me?.hasGuessed ? t('chat.guessTitle') : t('chat.title')}
          className="order-2 h-80 sm:order-none sm:h-[320px] lg:order-3 lg:h-[calc(100vh-110px)]"
        />
      </main>

      {isLead && state.phase === 'choosing' && game.wordChoices && (
        <WordSelectModal
          choices={game.wordChoices}
          totalSeconds={chooseSeconds}
          rerollsLeft={state.rerollsLeft}
          partnerName={partner?.name ?? null}
          onSelect={game.selectWord}
          onReroll={game.reroll}
        />
      )}
    </div>
  );
}
