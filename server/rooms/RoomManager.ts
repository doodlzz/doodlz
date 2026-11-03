import { DEFAULT_SETTINGS, type Profile, type RoomSettings } from '../../shared/types.js';
import { Room, type IO, type Player } from './Room.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface Session {
  code: string;
  playerId: string;
}

/** Owns every room, the reconnection-token index, and public matchmaking. */
export class RoomManager {
  readonly rooms = new Map<string, Room>();
  private readonly sessions = new Map<string, Session>(); // token -> where the player lives

  constructor(private readonly io: IO) {}

  private newCode(): string {
    for (;;) {
      const code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
      if (!this.rooms.has(code)) return code;
    }
  }

  create(settings: RoomSettings, isPublic: boolean): Room {
    const code = this.newCode();
    const room = new Room(this.io, code, settings, isPublic, {
      onPlayerRemoved: (r, p) => this.forget(r, p),
      onEmpty: (r) => {
        this.rooms.delete(r.code);
        console.log(`room ${r.code} closed (${this.rooms.size} open)`);
      },
    });
    this.rooms.set(code, room);
    console.log(`${isPublic ? 'public' : 'private'} room ${code} created (${this.rooms.size} open)`);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.trim().toUpperCase());
  }

  /**
   * Matchmaking: the busiest public room this player may join, or a new one.
   * Matches in progress count (newcomers join as guessers and draw from the next round),
   * and so do rooms on their game-over screen, which restart on their own. Private rooms never do.
   */
  findOrCreatePublic(profile: Profile, ip: string): Room {
    const candidates = [...this.rooms.values()]
      .filter((r) => r.isPublic && r.joinError(profile, ip) === null)
      .sort((a, b) => b.players.size - a.players.size);
    return candidates[0] ?? this.create({ ...DEFAULT_SETTINGS }, true);
  }

  register(room: Room, player: Player): void {
    this.sessions.set(player.token, { code: room.code, playerId: player.id });
  }

  resolve(token: unknown): { room: Room; player: Player } | null {
    if (typeof token !== 'string') return null;
    const s = this.sessions.get(token);
    const room = s && this.rooms.get(s.code);
    const player = room?.players.get(s!.playerId);
    return room && player ? { room, player } : null;
  }

  /** Called when a player leaves a room for good: drop their token and unbind their socket. */
  private forget(room: Room, p: Player): void {
    this.sessions.delete(p.token);
    const socket = p.socketId ? this.io.sockets.sockets.get(p.socketId) : undefined;
    if (socket && socket.data.playerId === p.id) {
      socket.leave(room.code);
      socket.data.roomCode = undefined;
      socket.data.playerId = undefined;
    }
  }

  stats() {
    let players = 0;
    for (const r of this.rooms.values()) players += r.players.size;
    return { rooms: this.rooms.size, players };
  }
}
