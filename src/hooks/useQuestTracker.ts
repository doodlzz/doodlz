import { useEffect, useRef } from 'react';
import { recordQuestEvent } from '../lib/quests';
import type { GameApi } from './useGame';

/** Watches game events and counts them toward today's quests. */
export function useQuestTracker(game: GameApi) {
  const { state, messages } = game;
  const lastPhase = useRef<string | null>(null);
  const lastMsg = useRef<string | null>(null);

  useEffect(() => {
    if (!state) {
      lastPhase.current = null;
      return;
    }
    const prev = lastPhase.current;
    lastPhase.current = state.phase;
    if (prev === null || prev === state.phase) return;

    if (state.phase === 'drawing' && state.drawerIds.includes(state.you)) recordQuestEvent('drew');
    if (state.phase === 'game_over' && state.round > 0) {
      recordQuestEvent('gameFinished');
      if (state.settings.mode === 'duo') recordQuestEvent('duoFinished');
      if (state.settings.speed > 0) recordQuestEvent('speedFinished');
      if (state.isPublic) recordQuestEvent('publicFinished');
    }
  }, [state]);

  useEffect(() => {
    const m = messages[messages.length - 1];
    if (!m || m.id === lastMsg.current) return;
    lastMsg.current = m.id;
    if (m.kind === 'correct' && m.playerId === state?.you) recordQuestEvent('guessed');
  }, [messages, state?.you]);
}
