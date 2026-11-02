import type { Ack, JoinResult } from '../../shared/types.js';
import type { Room } from '../rooms/Room.js';
import { sanitizeProfile, sanitizeSettings } from '../util/sanitize.js';
import { withRoom, type HandlerContext } from './context.js';

/** Rooms: create / join / matchmake / resume / leave, settings and game start. */
export function registerLobbyHandlers(ctx: HandlerContext): void {
  const { socket, manager, safe } = ctx;

  const leaveCurrent = () => {
    const cur = ctx.current();
    if (cur) cur.room.removePlayer(cur.playerId);
    socket.data.roomCode = socket.data.playerId = undefined;
  };

  /** Put this socket into `room` as a new player and answer the client. */
  const enter = (room: Room, rawProfile: unknown, ack: Ack<JoinResult>) => {
    const profile = sanitizeProfile(rawProfile);
    const error = room.joinError(profile, ctx.ip);
    if (error) return ack({ ok: false, error });
    leaveCurrent();
    socket.join(room.code);
    const player = room.addPlayer(socket.id, profile, ctx.ip);
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
