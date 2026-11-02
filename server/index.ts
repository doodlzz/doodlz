import express from 'express';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../shared/types.js';
import { Room, sanitizeSettings } from './game.js';

const PORT = Number(process.env.SERVER_PORT ?? process.env.PORT ?? 3001);
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface SocketData {
  roomCode?: string;
}

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
  cors: { origin: true },
  maxHttpBufferSize: 1e6,
});

const rooms = new Map<string, Room>();

function newRoomCode(): string {
  for (;;) {
    const code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    if (!rooms.has(code)) return code;
  }
}

app.get('/api/health', (_req, res) => {
  let players = 0;
  for (const r of rooms.values()) players += r.players.size;
  res.json({ ok: true, rooms: rooms.size, players });
});

// In production, serve the built client from ./dist.
const distDir = path.resolve(process.cwd(), 'dist');
if (existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/socket.io') || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

io.on('connection', (socket) => {
  const currentRoom = () => (socket.data.roomCode ? rooms.get(socket.data.roomCode) : undefined);

  /** Wrap a handler so bad client input can never crash the server. */
  const safe =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) => {
      try {
        fn(...args);
      } catch (err) {
        console.error(`[socket ${socket.id}]`, err);
      }
    };

  const leaveCurrentRoom = () => {
    const room = currentRoom();
    if (!room) return;
    socket.leave(room.code);
    socket.data.roomCode = undefined;
    if (room.removePlayer(socket.id)) {
      room.destroy();
      rooms.delete(room.code);
      console.log(`room ${room.code} closed (${rooms.size} open)`);
    }
  };

  socket.on(
    'create_room',
    safe((payload, ack) => {
      if (typeof ack !== 'function') return;
      leaveCurrentRoom();
      const code = newRoomCode();
      const room = new Room(io, code, sanitizeSettings(payload?.settings));
      rooms.set(code, room);
      socket.join(code);
      socket.data.roomCode = code;
      room.addPlayer(socket.id, payload?.name, payload?.avatar);
      console.log(`room ${code} created (${rooms.size} open)`);
      ack({ ok: true, code });
    }),
  );

  socket.on(
    'join_room',
    safe((payload, ack) => {
      if (typeof ack !== 'function') return;
      const code = String(payload?.code ?? '').trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) return ack({ ok: false, error: `Room "${code}" doesn't exist` });
      if (room.players.has(socket.id)) return ack({ ok: true, code });
      if (room.isFull) return ack({ ok: false, error: 'That room is full' });
      leaveCurrentRoom();
      socket.join(code);
      socket.data.roomCode = code;
      room.addPlayer(socket.id, payload?.name, payload?.avatar);
      ack({ ok: true, code });
    }),
  );

  socket.on('leave_room', safe(leaveCurrentRoom));
  socket.on('update_settings', safe((s) => currentRoom()?.updateSettings(socket.id, s)));
  socket.on(
    'start_game',
    safe((ack) => {
      const room = currentRoom();
      const error = room ? room.startGame(socket.id) : 'You are not in a room';
      if (typeof ack === 'function') ack(error ? { ok: false, error } : { ok: true });
    }),
  );
  socket.on('select_word', safe((index) => currentRoom()?.selectWord(socket.id, index)));
  socket.on('draw_stroke', safe((ops) => currentRoom()?.draw(socket.id, ops)));
  socket.on('clear_canvas', safe(() => currentRoom()?.clearCanvas(socket.id)));
  socket.on('request_canvas', safe(() => socket.emit('canvas_history', currentRoom()?.canvasFor() ?? [])));
  socket.on('submit_guess', safe((text) => currentRoom()?.guess(socket.id, text)));
  socket.on('back_to_lobby', safe(() => currentRoom()?.backToLobby(socket.id)));
  socket.on('disconnect', safe(leaveCurrentRoom));
});

httpServer.listen(PORT, () => {
  console.log(`🎨 doodlz.gg server listening on http://localhost:${PORT}`);
});
