// Friends over the game's socket connection: who is online and where, requests, private messages and
// room invites. Only signed-in players take part; a connection says which account it is with `friends_hello`.
import { randomUUID } from 'node:crypto';
import {
  FRIEND_LIMITS,
  threadKey,
  type DirectMessage,
  type FriendError,
  type FriendInfo,
  type FriendsState,
  type FriendStatus,
} from '../../shared/friends.js';
import type { AccountStore } from '../auth/accounts.js';
import type { GameSocket } from '../handlers/context.js';
import { censor } from '../moderation/profanity.js';
import type { RoomManager } from '../rooms/RoomManager.js';

/** At most `max` actions per `windowMs` for one account. */
function limiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string) => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) return false;
    recent.push(now);
    hits.set(key, recent);
    return true;
  };
}

export class FriendsService {
  /** Connected sockets per signed-in account (one per tab). */
  private sockets = new Map<string, Set<GameSocket>>();
  private threads = new Map<string, DirectMessage[]>();
  private canRequest = limiter(10, 60_000);
  private canMessage = limiter(10, 10_000);
  private canInvite = limiter(6, 60_000);

  constructor(
    private accounts: AccountStore,
    private manager: RoomManager,
  ) {
    accounts.onDeleted = (id) => {
      for (const key of [...this.threads.keys()]) {
        if (key.split(':').includes(id)) {
          this.threads.delete(key);
          this.accounts.saveThread(key, []);
        }
      }
      for (const s of this.sockets.get(id) ?? []) s.data.accountId = undefined;
      this.sockets.delete(id);
    };
  }

  async init() {
    const saved = await this.accounts.loadThreads();
    for (const [key, msgs] of Object.entries(saved)) if (Array.isArray(msgs) && msgs.length) this.threads.set(key, msgs as DirectMessage[]);
  }

  // ---------------- presence ----------------

  /** Where an account is right now, from its open connections. */
  private presence(id: string): { status: FriendStatus; roomCode?: string } {
    const socks = this.sockets.get(id);
    if (!socks?.size) return { status: 'offline' };
    for (const s of socks) {
      const room = s.data.roomCode ? this.manager.rooms.get(s.data.roomCode) : undefined;
      if (room) return { status: room.phase === 'lobby' ? 'lobby' : 'playing', roomCode: room.code };
    }
    return { status: 'online' };
  }

  private unread(meId: string, friendId: string, since: number): number {
    return (this.threads.get(threadKey(meId, friendId)) ?? []).filter((m) => m.from === friendId && m.ts > since).length;
  }

  stateFor(id: string): FriendsState {
    const lists = this.accounts.friendLists(id);
    const card = (x: string) => this.accounts.publicCard(x);
    const friends: FriendInfo[] = lists.friends.flatMap((f) => {
      const c = card(f);
      return c ? [{ ...c, ...this.presence(f), unread: this.unread(id, f, lists.read[f] ?? 0) }] : [];
    });
    const order: Record<FriendStatus, number> = { playing: 0, lobby: 0, online: 1, offline: 2 };
    friends.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));
    return {
      friends,
      incoming: lists.incoming.flatMap((x) => card(x) ?? []),
      outgoing: lists.outgoing.flatMap((x) => card(x) ?? []),
    };
  }

  /** Send fresh friends lists to every open tab of these accounts. */
  private push(...ids: string[]) {
    for (const id of new Set(ids)) {
      const socks = this.sockets.get(id);
      if (!socks?.size) continue;
      const state = this.stateFor(id);
      for (const s of socks) s.emit('friends_state', state);
    }
  }

  /** Tell an account's friends that it came online, went offline or moved rooms. */
  private pushToFriends(id: string) {
    this.push(...this.accounts.friendLists(id).friends);
  }

  /** A socket joined or left a room: friends see the new status. */
  roomChanged(socket: GameSocket) {
    if (socket.data.accountId) this.pushToFriends(socket.data.accountId);
  }

  // ---------------- socket handlers ----------------

  register(socket: GameSocket, safe: <A extends unknown[]>(fn: (...args: A) => void) => (...args: A) => void) {
    const me = () => socket.data.accountId ?? null;
    const fail = (ack: unknown, error: FriendError) => typeof ack === 'function' && ack({ ok: false, error });

    const detach = () => {
      const id = me();
      if (!id) return;
      const socks = this.sockets.get(id);
      socks?.delete(socket);
      if (!socks?.size) {
        this.sockets.delete(id);
        this.pushToFriends(id);
      }
      socket.data.accountId = undefined;
    };

    socket.on(
      'friends_hello',
      safe(({ token } = { token: null }, ack?: (s: FriendsState | null) => void) => {
        const id = this.accounts.accountId(token);
        if (id !== me()) {
          detach();
          if (id) {
            socket.data.accountId = id;
            const wasOnline = this.sockets.has(id);
            this.sockets.set(id, (this.sockets.get(id) ?? new Set()).add(socket));
            if (!wasOnline) this.pushToFriends(id);
          }
        }
        if (typeof ack === 'function') ack(id ? this.stateFor(id) : null);
      }),
    );
    socket.on('disconnect', detach);

    socket.on(
      'friends_refresh',
      safe((ack) => {
        const id = me();
        if (typeof ack === 'function') ack(id ? this.stateFor(id) : null);
      }),
    );

    socket.on(
      'friend_request',
      safe((p, ack) => {
        const id = me();
        if (!id) return fail(ack, 'friends.err.signIn');
        if (!this.canRequest(id)) return fail(ack, 'friends.err.tooFast');
        let target: string | null = null;
        if (typeof p?.nameTag === 'string') target = this.accounts.findByNameTag(p.nameTag.slice(0, 40));
        else if (typeof p?.playerId === 'string') {
          // Someone in the same room: look up their account on the server, never trusting the client.
          const room = socket.data.roomCode ? this.manager.rooms.get(socket.data.roomCode) : undefined;
          target = room?.players.get(p.playerId)?.accountId ?? null;
        }
        if (!target) return fail(ack, 'friends.err.notFound');
        const res = this.accounts.requestFriend(id, target);
        if ('error' in res) return fail(ack, res.error);
        this.push(id, target);
        if (typeof ack === 'function') ack({ ok: true, accepted: res.accepted });
      }),
    );

    socket.on(
      'friend_respond',
      safe((p, ack) => {
        const id = me();
        if (!id) return fail(ack, 'friends.err.signIn');
        if (typeof p?.id !== 'string' || !this.accounts.respondFriend(id, p.id, p.accept === true)) return fail(ack, 'friends.err.notFound');
        this.push(id, p.id);
        if (typeof ack === 'function') ack({ ok: true });
      }),
    );

    socket.on(
      'friend_cancel',
      safe((other, ack) => {
        const id = me();
        if (!id || typeof other !== 'string') return fail(ack, 'friends.err.signIn');
        this.accounts.cancelFriendRequest(id, other);
        this.push(id, other);
        if (typeof ack === 'function') ack({ ok: true });
      }),
    );

    socket.on(
      'friend_remove',
      safe((other, ack) => {
        const id = me();
        if (!id || typeof other !== 'string') return fail(ack, 'friends.err.signIn');
        this.accounts.removeFriend(id, other);
        this.push(id, other);
        if (typeof ack === 'function') ack({ ok: true });
      }),
    );

    // ---------------- private messages ----------------

    socket.on(
      'dm_history',
      safe((friendId, ack) => {
        const id = me();
        if (typeof ack !== 'function') return;
        if (!id || typeof friendId !== 'string' || !this.accounts.areFriends(id, friendId)) return ack([]);
        ack(this.threads.get(threadKey(id, friendId)) ?? []);
      }),
    );

    socket.on(
      'dm_send',
      safe((p, ack) => {
        const id = me();
        if (!id) return fail(ack, 'friends.err.signIn');
        const to = typeof p?.to === 'string' ? p.to : '';
        if (!this.accounts.areFriends(id, to)) return fail(ack, 'friends.err.notFriends');
        const raw = typeof p?.text === 'string' ? p.text.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, FRIEND_LIMITS.messageLength) : '';
        if (!raw) return fail(ack, 'friends.err.empty');
        if (!this.canMessage(id)) return fail(ack, 'friends.err.tooFast');
        const message: DirectMessage = { id: randomUUID(), from: id, to, text: censor(raw).text, ts: Date.now() };
        const key = threadKey(id, to);
        const thread = [...(this.threads.get(key) ?? []), message].slice(-FRIEND_LIMITS.history);
        this.threads.set(key, thread);
        this.accounts.saveThread(key, thread);
        this.accounts.markRead(id, to, message.ts);
        for (const s of [...(this.sockets.get(to) ?? []), ...(this.sockets.get(id) ?? [])]) if (s !== socket) s.emit('dm_message', message);
        this.push(to);
        if (typeof ack === 'function') ack({ ok: true, message });
      }),
    );

    socket.on(
      'dm_read',
      safe((friendId) => {
        const id = me();
        if (!id || typeof friendId !== 'string') return;
        const last = (this.threads.get(threadKey(id, friendId)) ?? []).at(-1);
        if (last) this.accounts.markRead(id, friendId, last.ts);
        this.push(id);
      }),
    );

    // ---------------- invites ----------------

    socket.on(
      'friend_invite',
      safe((friendId, ack) => {
        const id = me();
        if (!id) return fail(ack, 'friends.err.signIn');
        if (typeof friendId !== 'string' || !this.accounts.areFriends(id, friendId)) return fail(ack, 'friends.err.notFriends');
        const room = socket.data.roomCode ? this.manager.rooms.get(socket.data.roomCode) : undefined;
        if (!room) return fail(ack, 'friends.err.notInRoom');
        const targets = this.sockets.get(friendId);
        if (!targets?.size) return fail(ack, 'friends.err.offline');
        if (!this.canInvite(id)) return fail(ack, 'friends.err.tooFast');
        const card = this.accounts.publicCard(id);
        if (!card) return fail(ack, 'friends.err.notFound');
        for (const s of targets) s.emit('friend_invite', { fromId: id, name: card.name, avatar: card.avatar, code: room.code });
        if (typeof ack === 'function') ack({ ok: true });
      }),
    );
  }
}
