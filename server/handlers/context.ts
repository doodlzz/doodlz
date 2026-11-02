import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/types.js';
import { config } from '../config.js';
import type { Room } from '../rooms/Room.js';
import type { RoomManager } from '../rooms/RoomManager.js';

export interface SocketData {
  roomCode?: string;
  playerId?: string;
}

export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

/** Everything a handler module needs, created once per connection. */
export interface HandlerContext {
  socket: GameSocket;
  manager: RoomManager;
  ip: string;
  /** The room and player id this socket is bound to, if any. */
  current(): { room: Room; playerId: string } | null;
  /** Wrap a handler so bad client input can never crash the server. */
  safe<A extends unknown[]>(fn: (...args: A) => void): (...args: A) => void;
}

export function clientIp(socket: GameSocket): string {
  if (config.trustProxy) {
    const fwd = socket.handshake.headers['x-forwarded-for'];
    const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return socket.handshake.address ?? '';
}

export function createContext(socket: GameSocket, manager: RoomManager): HandlerContext {
  return {
    socket,
    manager,
    ip: clientIp(socket),
    current() {
      const { roomCode, playerId } = socket.data;
      const room = roomCode ? manager.rooms.get(roomCode) : undefined;
      return room && playerId && room.players.has(playerId) ? { room, playerId } : null;
    },
    safe(fn) {
      return (...args) => {
        try {
          fn(...args);
        } catch (err) {
          console.error(`[socket ${socket.id}]`, err);
        }
      };
    },
  };
}

/** Run `fn` with the bound room and player, if this socket is in a room. */
export const withRoom =
  <A extends unknown[]>(ctx: HandlerContext, fn: (room: Room, playerId: string, ...args: A) => void) =>
  (...args: A) => {
    const cur = ctx.current();
    if (cur) fn(cur.room, cur.playerId, ...args);
  };
