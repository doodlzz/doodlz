// Friends: requests, online status, joining and inviting, and private messages between friends.
// Shared by the server (which owns all of it) and the client (which shows it).
import type { Avatar } from './types.js';

export const FRIEND_LIMITS = {
  friends: 200,
  /** Pending requests one account can have sent or received. */
  pending: 50,
  messageLength: 300,
  /** Messages kept per conversation. */
  history: 100,
} as const;

/** offline; online (on the site, not in a room); lobby (in a room's lobby); playing (in a running game). */
export type FriendStatus = 'offline' | 'online' | 'lobby' | 'playing';

export interface FriendInfo {
  id: string;
  /** "name#1234" */
  name: string;
  avatar: Avatar;
  status: FriendStatus;
  /** The room they're in, so friends can join it. */
  roomCode?: string;
  /** Messages from them you haven't read. */
  unread: number;
}

/** Someone who sent you a request, or whom you sent one to. */
export interface FriendRequestInfo {
  id: string;
  name: string;
  avatar: Avatar;
}

export interface FriendsState {
  friends: FriendInfo[];
  incoming: FriendRequestInfo[];
  outgoing: FriendRequestInfo[];
}

export interface DirectMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  ts: number;
}

/** A friend asked you to join their room. */
export interface FriendInvite {
  fromId: string;
  name: string;
  avatar: Avatar;
  code: string;
}

export type FriendError =
  | 'friends.err.signIn'
  | 'friends.err.notFound'
  | 'friends.err.self'
  | 'friends.err.already'
  | 'friends.err.pending'
  | 'friends.err.limit'
  | 'friends.err.notFriends'
  | 'friends.err.tooFast'
  | 'friends.err.empty'
  | 'friends.err.notInRoom'
  | 'friends.err.offline';

export type FriendAck<T = object> = (res: ({ ok: true } & T) | { ok: false; error: FriendError }) => void;

/** The same key for both people in a conversation. */
export const threadKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);
