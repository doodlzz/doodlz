import { useCallback, useEffect, useRef, useState } from 'react';
import type { Avatar, ChatMessage, ClientRoomState, RoomSettings, WordChoice } from '../../shared/types';
import { socket } from '../socket';

const MAX_MESSAGES = 200;

export interface WordChoiceState {
  choices: WordChoice[];
  endsAt: number; // local clock
}

export function useGame() {
  const [connected, setConnected] = useState(socket.connected);
  const [state, setState] = useState<ClientRoomState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [wordChoices, setWordChoices] = useState<WordChoiceState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // serverTime - localTime, so countdowns stay right even if clocks disagree.
  const clockOffset = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => {
      setConnected(false);
      setState((prev) => {
        if (prev) showToast('Lost connection to the server');
        return null;
      });
      setMessages([]);
      setWordChoices(null);
    };
    const onState = (s: ClientRoomState) => {
      clockOffset.current = s.serverNow - Date.now();
      setState(s);
      if (s.phase !== 'choosing' || s.drawerId !== s.you) setWordChoices(null);
    };
    const onChat = (m: ChatMessage) => setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 1)), m]);
    const onChoices = (p: { choices: WordChoice[]; endsAt: number; serverNow: number }) =>
      setWordChoices({ choices: p.choices, endsAt: p.endsAt - (p.serverNow - Date.now()) });

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room_state', onState);
    socket.on('chat_message', onChat);
    socket.on('word_choices', onChoices);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_state', onState);
      socket.off('chat_message', onChat);
      socket.off('word_choices', onChoices);
    };
  }, [showToast]);

  /** Convert a server timestamp to the local clock. */
  const toLocalTime = useCallback((serverTs: number) => serverTs - clockOffset.current, []);

  const createRoom = useCallback(
    (name: string, avatar: Avatar, settings?: Partial<RoomSettings>) =>
      new Promise<boolean>((resolve) => {
        setMessages([]);
        socket.emit('create_room', { name, avatar, settings }, (res) => {
          if (!res.ok) showToast(res.error);
          resolve(res.ok);
        });
      }),
    [showToast],
  );

  const joinRoom = useCallback(
    (code: string, name: string, avatar: Avatar) =>
      new Promise<boolean>((resolve) => {
        setMessages([]);
        socket.emit('join_room', { code, name, avatar }, (res) => {
          if (!res.ok) showToast(res.error);
          resolve(res.ok);
        });
      }),
    [showToast],
  );

  const leaveRoom = useCallback(() => {
    socket.emit('leave_room');
    history.replaceState(null, '', '/');
    setState(null);
    setMessages([]);
    setWordChoices(null);
  }, []);

  const startGame = useCallback(() => {
    socket.emit('start_game', (res) => {
      if (!res.ok) showToast(res.error);
    });
  }, [showToast]);

  return {
    connected,
    state,
    messages,
    wordChoices,
    toast,
    toLocalTime,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    updateSettings: (s: Partial<RoomSettings>) => socket.emit('update_settings', s),
    selectWord: (index: number) => socket.emit('select_word', index),
    sendGuess: (text: string) => socket.emit('submit_guess', text),
    backToLobby: () => socket.emit('back_to_lobby'),
  };
}

export type GameApi = ReturnType<typeof useGame>;
