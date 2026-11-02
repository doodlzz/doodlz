import { useEffect, useRef } from 'react';
import type { GameApi } from '../hooks/useGame';
import { playSfx } from './sfx';

/** Plays sound effects in response to game events (new chat lines, phase changes, timer). */
export function useGameSounds(game: GameApi) {
  const { state, messages, toLocalTime } = game;
  const lastMsg = useRef<string | null>(null);
  const lastPhase = useRef<string | null>(null);

  useEffect(() => {
    const m = messages[messages.length - 1];
    if (!m || m.id === lastMsg.current) return;
    const first = lastMsg.current === null;
    lastMsg.current = m.id;
    if (first) return;
    if (m.kind === 'correct') playSfx(m.playerId === state?.you ? 'myCorrect' : 'correct');
    else if (m.kind === 'close') playSfx('close');
    else if (m.kind === 'join') playSfx('join');
    else if (m.kind === 'warning') playSfx('warning');
    else if (m.kind === 'guess' || m.kind === 'private') playSfx('pop');
  }, [messages, state?.you]);

  useEffect(() => {
    const phase = state?.phase ?? null;
    if (phase === lastPhase.current) return;
    const prev = lastPhase.current;
    lastPhase.current = phase;
    if (prev === null) return;
    if (phase === 'drawing') playSfx('turnStart');
    else if (phase === 'turn_end') playSfx('turnEnd');
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
