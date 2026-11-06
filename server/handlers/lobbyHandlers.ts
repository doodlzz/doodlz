import { randomTag } from '../../shared/tag.js';
import { AVATAR_PARTS_FREE, type Ack, type JoinResult, type Profile } from '../../shared/types.js';
import type { Room } from '../rooms/Room.js';
import { sanitizeAvatar, sanitizeProfile, sanitizeSettings } from '../util/sanitize.js';
import { withRoom, type HandlerContext } from './context.js';

/** Rooms: create / join / matchmake / resume / leave, settings and game start. */
export function registerLobbyHandlers(ctx: HandlerContext): void {
  const { socket, manager, accounts, safe } = ctx;

  const leaveCurrent = () => {
    const cur = ctx.current();
    if (cur) cur.room.removePlayer(cur.playerId);
    socket.data.roomCode = socket.data.playerId = undefined;
  };

  /**
   * Give the player their "name#1234" and allowed look. Signed-in players get their account's name, tag,
   * all avatar parts and their uploaded picture; guests only the free parts.
   * Guests keep their own tag unless a registered account or someone in the room already has that name#tag.
   */
  const withTag = (room: Room, profile: Profile): Profile => {
    const id = accounts.identity(profile.authToken);
    if (id) return { ...profile, name: `${id.username}#${id.tag}`, avatar: { ...profile.avatar, ...(id.image ? { image: id.image } : {}) } };
    profile = { ...profile, avatar: sanitizeAvatar(profile.avatar, AVATAR_PARTS_FREE) };
    const inRoom = new Set([...room.players.values()].map((p) => p.name.toLowerCase()));
    const clashes = (tag: string) => accounts.isRegistered(profile.name, tag) || inRoom.has(`${profile.name}#${tag}`.toLowerCase());
    let tag = profile.guestTag ?? randomTag();
    for (let i = 0; clashes(tag) && i < 50; i++) tag = randomTag();
    return { ...profile, name: `${profile.name}#${tag}` };
  };

  /** Put this socket into `room` as a new player and answer the client. */
  const enter = (room: Room, rawProfile: unknown, ack: Ack<JoinResult>) => {
    const profile = withTag(room, sanitizeProfile(rawProfile));
    const error = room.joinError(profile, ctx.ip);
    if (error) return ack({ ok: false, error });
    leaveCurrent();
    socket.join(room.code);
    const player = room.addPlayer(socket.id, profile, ctx.ip, accounts.accountId(profile.authToken));
    socket.data.roomCode = room.code;
    socket.data.playerId = player.id;
    manager.register(room, player);
    ack({ ok: true, code: room.code, token: player.token, playerId: player.id });
  };

  socket.on(
    'create_room',
    safe((p, ack) => {
      if (typeof ack !== 'function') return;
      enter(manager.create(sanitizeSettings(p?.settings), false), p?.profile, ack);
    }),
  );

  socket.on(
    'join_room',
    safe((p, ack) => {
      if (typeof ack !== 'function') return;
      const code = String(p?.code ?? '').trim().toUpperCase();
      const room = manager.get(code);
      if (!room) return ack({ ok: false, error: 'err.roomNotFound', params: { code } });
      enter(room, p?.profile, ack);
    }),
  );

  socket.on(
    'quick_play',
    safe((p, ack) => {
      if (typeof ack !== 'function') return;
      enter(manager.findOrCreatePublic(sanitizeProfile(p?.profile), ctx.ip), p?.profile, ack);
    }),
  );

  socket.on(
    'list_lobbies',
    safe((ack) => {
      if (typeof ack === 'function') ack(manager.listPublic());
    }),
  );

  socket.on(
    'resume_session',
    safe((p, ack) => {
      if (typeof ack !== 'function') return;
      const found = manager.resolve(p?.token);
      if (!found) return ack({ ok: false, error: 'err.sessionExpired' });
      const { room, player } = found;

      // If an older socket still holds this slot (e.g. the drop hasn't been noticed yet), take it over.
      const old = player.socketId && player.socketId !== socket.id ? socket.nsp.sockets.get(player.socketId) : undefined;
      if (old) {
        old.leave(room.code);
        old.data.roomCode = old.data.playerId = undefined;
      }
      socket.join(room.code);
      socket.data.roomCode = room.code;
      socket.data.playerId = player.id;
      room.reconnect(player.id, socket.id);
      ack({ ok: true, code: room.code, token: player.token, playerId: player.id });
    }),
  );

  socket.on('leave_room', safe(leaveCurrent));
  socket.on('update_settings', safe(withRoom(ctx, (room, id, s) => room.updateSettings(id, s))));
  socket.on('choose_category', safe(withRoom(ctx, (room, id, c) => room.chooseCategory(id, c))));
  socket.on(
    'start_game',
    safe((ack) => {
      const cur = ctx.current();
      const error = cur ? cur.room.startGame(cur.playerId) : 'err.notInRoom';
      if (typeof ack === 'function') ack(error ? { ok: false, error } : { ok: true });
    }),
  );
  socket.on('back_to_lobby', safe(withRoom(ctx, (room, id) => room.backToLobby(id))));

  socket.on(
    'disconnect',
    safe(() => {
      const cur = ctx.current();
      if (cur) cur.room.markDisconnected(cur.playerId);
    }),
  );
}
