import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AckResult,
  Avatar,
  BackgroundId,
  Category,
  ChatMessage,
  ClientRoomState,
  JoinResult,
  Lang,
  MsgParams,
  Profile,
  ReportReason,
  RoomSettings,
  WordChoice,
} from '../../shared/types';
import { readToken } from '../auth/storage';
import { deviceId, guestTag, loadSession, saveSession } from '../lib/session';
import { socket } from '../socket';

const MAX_MESSAGES = 200;

export interface WordChoiceState {
  choices: WordChoice[];
  endsAt: number; // local clock
}

export interface Toast {
  key: string;
  params?: MsgParams;
}

export function useGame(lang: Lang) {
  const [connected, setConnected] = useState(socket.connected);
  const [state, setState] = useState<ClientRoomState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [wordChoices, setWordChoices] = useState<WordChoiceState | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [online, setOnline] = useState<number | null>(null);
  /** True while we hold a session token and are trying to get back into the room. */
  const [resuming, setResuming] = useState(() => loadSession() !== null);
  const clockOffset = useRef(0); // serverTime - localTime
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inRoom = useRef(false);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const resetRoom = useCallback(() => {
    inRoom.current = false;
    // Drop "?room=CODE" for the room we just lost, or the home screen would only offer to rejoin it.
    const lost = loadSession()?.code;
    if (lost && new URLSearchParams(location.search).get('room')?.toUpperCase() === lost) history.replaceState(null, '', '/');
    saveSession(null);
    setState(null);
    setMessages([]);
    setWordChoices(null);
  }, []);

  useEffect(() => {
    const tryResume = () => {
      const s = loadSession();
      if (!s) {
        setResuming(false);
        return;
      }
      setResuming(true);
      socket.emit('resume_session', { token: s.token }, (res) => {
        setResuming(false);
        if (res.ok) return;
        if (inRoom.current) showToast({ key: res.error });
        resetRoom();
      });
    };

    const onConnect = () => {
      setConnected(true);
      tryResume();
    };
    const onDisconnect = () => setConnected(false);
    const onState = (s: ClientRoomState) => {
      clockOffset.current = s.serverNow - Date.now();
      inRoom.current = true;
      setState(s);
      if (s.phase !== 'choosing' || s.drawerIds[0] !== s.you) setWordChoices(null);
    };
    const onChat = (m: ChatMessage) => setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 1)), m]);
    const onChoices = (p: { choices: WordChoice[]; endsAt: number; serverNow: number }) =>
      setWordChoices({ choices: p.choices, endsAt: p.endsAt - (p.serverNow - Date.now()) });
    const onKicked = (p: { reason: string }) => {
      resetRoom();
      showToast({ key: p.reason });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room_state', onState);
    socket.on('chat_message', onChat);
    socket.on('word_choices', onChoices);
    socket.on('kicked', onKicked);
    socket.on('online_count', setOnline);
    if (socket.connected) tryResume();
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_state', onState);
      socket.off('chat_message', onChat);
      socket.off('word_choices', onChoices);
      socket.off('kicked', onKicked);
      socket.off('online_count', setOnline);
    };
  }, [showToast, resetRoom]);

  /** Convert a server timestamp to the local clock. */
  const toLocalTime = useCallback((serverTs: number) => serverTs - clockOffset.current, []);

  const profile = useCallback(
    (name: string, avatar: Avatar): Profile => ({ name, avatar, deviceId: deviceId(), lang, authToken: readToken() ?? undefined, guestTag: guestTag() }),
    [lang],
  );

  /** Shared handling for create / join / quick play answers. */
  const entered = useCallback(
    (resolve: (ok: boolean) => void) => (res: AckResult<JoinResult>) => {
      if (res.ok) {
        saveSession({ token: res.token, code: res.code });
        inRoom.current = true;
      } else {
        showToast({ key: res.error, params: res.params });
      }
      resolve(res.ok);
    },
    [showToast],
  );

  const createRoom = useCallback(
    (name: string, avatar: Avatar, settings?: Partial<RoomSettings>) =>
      new Promise<boolean>((resolve) => {
        setMessages([]);
        socket.emit('create_room', { profile: profile(name, avatar), settings }, entered(resolve));
      }),
    [profile, entered],
  );

  const joinRoom = useCallback(
    (code: string, name: string, avatar: Avatar) =>
      new Promise<boolean>((resolve) => {
        setMessages([]);
        socket.emit('join_room', { code, profile: profile(name, avatar) }, entered(resolve));
      }),
    [profile, entered],
  );

  const quickPlay = useCallback(
    (name: string, avatar: Avatar) =>
      new Promise<boolean>((resolve) => {
        setMessages([]);
        socket.emit('quick_play', { profile: profile(name, avatar) }, entered(resolve));
      }),
    [profile, entered],
  );

  const leaveRoom = useCallback(() => {
    socket.emit('leave_room');
    history.replaceState(null, '', '/');
    resetRoom();
  }, [resetRoom]);

  const startGame = useCallback(() => {
    socket.emit('start_game', (res) => {
      if (!res.ok) showToast({ key: res.error, params: res.params });
    });
  }, [showToast]);

  return {
    connected,
    online,
    resuming,
    state,
    messages,
    wordChoices,
    toast,
    toLocalTime,
    createRoom,
    joinRoom,
    quickPlay,
    leaveRoom,
    startGame,
    updateSettings: (s: Partial<RoomSettings>) => socket.emit('update_settings', s),
    chooseCategory: (c: Category) => socket.emit('choose_category', c),
    selectWord: (index: number) => socket.emit('select_word', index),
    reroll: () => socket.emit('reroll_words'),
    sendGuess: (text: string) => socket.emit('submit_guess', text),
    requestHint: () => socket.emit('request_hint'),
    setBackground: (bg: BackgroundId) => socket.emit('set_background', bg),
    report: (targetId: string, reason: ReportReason) => socket.emit('report_player', { targetId, reason }),
    kick: (targetId: string) => socket.emit('kick_player', targetId),
    backToLobby: () => socket.emit('back_to_lobby'),
  };
}

export type GameApi = ReturnType<typeof useGame>;
