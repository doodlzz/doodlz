import { useEffect, useRef } from 'react';
import { commitHeldQuestEvents, dropHeldQuestEvents, holdQuestEvent, recordQuestEvent } from '../lib/quests';
import type { GameApi } from './useGame';

/**
 * Watches game events for today's and this week's quests. Nothing counts until the game reaches the end screen:
 * guesses and drawings are held during the game and dropped if the player leaves before it ends.
 */
export function useQuestTracker(game: GameApi) {
  const { state, messages, toLocalTime } = game;
  const lastPhase = useRef<string | null>(null);
  const lastMsg = useRef<string | null>(null);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    if (!state) {
      // Left the room (or never joined): a game that didn't finish doesn't count.
      if (lastPhase.current !== null) dropHeldQuestEvents();
      lastPhase.current = null;
      return;
    }
    const prev = lastPhase.current;
    lastPhase.current = state.phase;
    if (prev === null || prev === state.phase) return; // first state after joining or a refresh: nothing new happened

    // A fresh game starts from the lobby or the end screen: start holding from zero.
    if ((prev === 'lobby' || prev === 'game_over') && state.phase !== 'lobby' && state.phase !== 'game_over') dropHeldQuestEvents();

    if (state.phase === 'drawing' && state.drawerIds.includes(state.you)) holdQuestEvent(state.code, 'drew');
    // Drew a word that every guesser got.
    if (prev === 'drawing' && state.phase === 'turn_end' && state.drawerIds.includes(state.you) && state.lastTurn?.reason === 'all_guessed') {
      holdQuestEvent(state.code, 'fullHouse');
    }
    if (state.phase === 'game_over' && state.round > 0) {
      commitHeldQuestEvents(state.code);
      recordQuestEvent('gameFinished');
      if (state.settings.mode === 'duo') recordQuestEvent('duoFinished');
      if (state.settings.speed > 0) recordQuestEvent('speedFinished');
      if (state.isPublic) recordQuestEvent('publicFinished');
      if (state.settings.singleColor) recordQuestEvent('singleColorFinished');
      if (state.settings.blindfold) recordQuestEvent('blindfoldFinished');
      const me = state.players.find((p) => p.id === state.you);
      if (me) {
        const place = 1 + state.players.filter((p) => p.score > me.score).length;
        if (place === 1) recordQuestEvent('won');
        if (place <= 3) recordQuestEvent('podium');
      }
    }
  }, [state]);

  useEffect(() => {
    const m = messages[messages.length - 1];
    if (!m || m.id === lastMsg.current) return;
    lastMsg.current = m.id;
    if (toLocalTime(m.ts) < mountedAt.current) return; // chat history replayed after a refresh
    if (m.kind === 'correct' && state && m.playerId === state.you) {
      holdQuestEvent(state.code, 'guessed');
      if (m.key === 'chat.correctFirst') holdQuestEvent(state.code, 'firstGuess');
      if (state.hintsUsed === 0) holdQuestEvent(state.code, 'cleanGuess');
    }
  }, [messages, state?.you, state?.code, toLocalTime]);
}
