import { useEffect, useRef } from 'react';
import type { GameApi } from '../hooks/useGame';
import { playSfx } from './sfx';

/** Plays sound effects in response to game events (joins and leaves, turns, guesses, timer). */
export function useGameSounds(game: GameApi) {
  const { state, messages, toLocalTime } = game;
  const lastMsg = useRef<string | null>(null);
  const lastPhase = useRef<string | null>(null);
  const lastCode = useRef<string | null>(null);
  const lastTurn = useRef<string | null>(null);

  useEffect(() => {
    const m = messages[messages.length - 1];
    if (!m || m.id === lastMsg.current) return;
    const first = lastMsg.current === null;
    lastMsg.current = m.id;
    if (first) return;
    if (m.kind === 'correct') playSfx(m.playerId === state?.you ? 'myCorrect' : 'correct');
    else if (m.kind === 'close') playSfx('close');
    else if (m.kind === 'join' && m.playerId !== state?.you) playSfx('join');
    else if (m.kind === 'leave') playSfx('leave');
    else if (m.kind === 'warning') playSfx('warning');
    else if (m.kind === 'guess' || m.kind === 'private') playSfx('pop');
  }, [messages, state?.you]);

  // You joined a room (not when coming back to the same one after a refresh or reconnect).
  useEffect(() => {
    const code = state?.code ?? null;
    if (code && code !== lastCode.current) playSfx('youJoined');
    lastCode.current = code;
  }, [state?.code]);

  // A new turn: a fanfare when it's yours to draw, a short chime when it's someone else's.
  useEffect(() => {
    const turn = state && state.phase === 'choosing' ? `${state.round}:${state.drawerIds.join(',')}` : null;
    if (!turn || turn === lastTurn.current) return;
    const first = lastTurn.current === null && lastPhase.current === null;
    lastTurn.current = turn;
    if (first) return;
    playSfx(state!.drawerIds.includes(state!.you) ? 'myTurn' : 'turnStart');
  }, [state?.phase, state?.round, state?.drawerIds.join(','), state?.you]);

  useEffect(() => {
    const phase = state?.phase ?? null;
    if (phase === lastPhase.current) return;
    const prev = lastPhase.current;
    lastPhase.current = phase;
    if (prev === null) return;
    if (phase === 'turn_end') playSfx('turnEnd');
    else if (phase === 'game_over') playSfx('win');
  }, [state?.phase]);

  // Countdown ticks for the last 5 seconds of a drawing turn.
  useEffect(() => {
    if (state?.phase !== 'drawing' || !state.phaseEndsAt) return;
    const end = toLocalTime(state.phaseEndsAt);
    let lastSecond = -1;
    const id = setInterval(() => {
      const left = Math.ceil((end - Date.now()) / 1000);
      if (left <= 5 && left > 0 && left !== lastSecond) {
        lastSecond = left;
        playSfx('tick');
      }
    }, 200);
    return () => clearInterval(id);
  }, [state?.phase, state?.phaseEndsAt, toLocalTime]);
}
