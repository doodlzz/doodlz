import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DirectMessage, FriendError, FriendInvite, FriendsState } from '../../shared/friends';
import { useAuth } from '../auth/AuthContext';
import { readToken } from '../auth/storage';
import { socket } from '../socket';

interface Ctx {
  /** Null for guests (and until the server answers). */
  state: FriendsState | null;
  /** Friend requests you received plus unread messages: the number on the Friends button. */
  badge: number;
  panelOpen: boolean;
  /** Open the friends window, optionally straight into a chat. */
  openPanel: (chatWith?: string) => void;
  closePanel: () => void;
  chatWith: string | null;
  setChatWith: (id: string | null) => void;
  messages: Record<string, DirectMessage[]>;
  loadMessages: (friendId: string) => void;
  sendMessage: (to: string, text: string) => Promise<FriendError | null>;
  request: (p: { nameTag?: string; playerId?: string }) => Promise<{ error: FriendError } | { accepted: boolean }>;
  respond: (id: string, accept: boolean) => void;
  cancel: (id: string) => void;
  remove: (id: string) => void;
  invite: (friendId: string) => Promise<FriendError | null>;
  /** The latest room invite from a friend, until it's answered or dismissed. */
  pendingInvite: FriendInvite | null;
  dismissInvite: () => void;
  /** Join a friend's room (set by the app shell, which owns the game). */
  joinRoom: (code: string) => void;
  /** The room you're in, if any. */
  myRoomCode: string | null;
}

const FriendsCtx = createContext<Ctx | null>(null);

export function useFriends(): Ctx {
  const ctx = useContext(FriendsCtx);
  if (!ctx) throw new Error('useFriends outside FriendsProvider');
  return ctx;
}

export function FriendsProvider({ children, onJoin, myRoomCode }: { children: ReactNode; onJoin: (code: string) => void; myRoomCode: string | null }) {
  const { account } = useAuth();
  const [state, setState] = useState<FriendsState | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [chatWith, setChatWith] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, DirectMessage[]>>({});
  const [pendingInvite, setPendingInvite] = useState<FriendInvite | null>(null);
  const chatRef = useRef<string | null>(null);
  chatRef.current = panelOpen ? chatWith : null;
  const accountId = account?.id ?? null;

  // Tell the server who this connection is (again after every reconnect and sign-in / sign-out).
  useEffect(() => {
    const hello = () => socket.emit('friends_hello', { token: accountId ? readToken() : null }, (s) => setState(s));
    if (socket.connected) hello();
    socket.on('connect', hello);
    if (!accountId) {
      setState(null);
      setMessages({});
      setPanelOpen(false);
    }
    return () => {
      socket.off('connect', hello);
    };
  }, [accountId]);

  // Live updates, plus a slow refresh so "in a game / in the lobby" stays current.
  useEffect(() => {
    if (!accountId) return;
    const onDm = (m: DirectMessage) => {
      const other = m.from === accountId ? m.to : m.from;
      setMessages((all) => (all[other] ? { ...all, [other]: [...all[other], m].slice(-100) } : all));
      if (chatRef.current === other) socket.emit('dm_read', other);
    };
    socket.on('friends_state', setState);
    socket.on('dm_message', onDm);
    socket.on('friend_invite', setPendingInvite);
    const id = setInterval(() => socket.emit('friends_refresh', (s) => s && setState(s)), 20_000);
    return () => {
      socket.off('friends_state', setState);
      socket.off('dm_message', onDm);
      socket.off('friend_invite', setPendingInvite);
      clearInterval(id);
    };
  }, [accountId]);

  const loadMessages = useCallback((friendId: string) => {
    socket.emit('dm_history', friendId, (list) => setMessages((all) => ({ ...all, [friendId]: list })));
    socket.emit('dm_read', friendId);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      badge: state ? state.incoming.length + state.friends.reduce((n, f) => n + f.unread, 0) : 0,
      panelOpen,
      openPanel: (id) => {
        setChatWith(id ?? null);
        setPanelOpen(true);
      },
      closePanel: () => setPanelOpen(false),
      chatWith,
      setChatWith,
      messages,
      loadMessages,
      sendMessage: (to, text) =>
        new Promise((resolve) =>
          socket.emit('dm_send', { to, text }, (res) => {
            if (!res.ok) return resolve(res.error);
            const m = res.message;
            setMessages((all) => ({ ...all, [to]: [...(all[to] ?? []), m].slice(-100) }));
            resolve(null);
          }),
        ),
      request: (p) => new Promise((resolve) => socket.emit('friend_request', p, (res) => resolve(res.ok ? { accepted: res.accepted } : { error: res.error }))),
      respond: (id, accept) => socket.emit('friend_respond', { id, accept }),
      cancel: (id) => socket.emit('friend_cancel', id),
      remove: (id) => socket.emit('friend_remove', id),
      invite: (friendId) => new Promise((resolve) => socket.emit('friend_invite', friendId, (res) => resolve(res.ok ? null : res.error))),
      pendingInvite,
      dismissInvite: () => setPendingInvite(null),
      joinRoom: (code) => {
        setPanelOpen(false);
        setPendingInvite(null);
        onJoin(code);
      },
      myRoomCode,
    }),
    [state, panelOpen, chatWith, messages, loadMessages, pendingInvite, onJoin, myRoomCode],
  );

  return <FriendsCtx.Provider value={value}>{children}</FriendsCtx.Provider>;
}
