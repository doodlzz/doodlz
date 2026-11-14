import express from 'express';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../shared/types.js';
import { AccountStore } from './auth/accounts.js';
import { FilePersistence, SupabasePersistence } from './auth/persistence.js';
import { authRoutes } from './auth/routes.js';
import { config } from './config.js';
import { createContext, type SocketData } from './handlers/context.js';
import { registerCanvasHandlers, registerGameHandlers, registerModerationHandlers } from './handlers/gameHandlers.js';
import { registerLobbyHandlers } from './handlers/lobbyHandlers.js';
import { gameOverRewards } from './progress/rewards.js';
import { RoomManager } from './rooms/RoomManager.js';
import { shopRoutes } from './shop/routes.js';

const app = express();
if (config.trustProxy) app.set('trust proxy', true);
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
  cors: { origin: true },
  maxHttpBufferSize: 1e6,
});
const useSupabase = Boolean(config.supabaseUrl && config.supabaseServiceKey);
if (!useSupabase && process.env.NODE_ENV === 'production') {
  console.warn('SUPABASE_URL / SUPABASE_SERVICE_KEY are not set: accounts are saved to local disk, which is erased on every deploy on most hosts.');
}
const accounts = new AccountStore(useSupabase ? new SupabasePersistence(config.supabaseUrl, config.supabaseServiceKey) : new FilePersistence(path.join(config.dataDir, 'accounts.json')));
// Load saved accounts before accepting any connection.
await accounts.init();
console.log(`accounts: ${useSupabase ? 'Supabase' : 'local file'}`);
const manager = new RoomManager(io, (room, complete) => gameOverRewards(io, accounts, room, complete));
app.use('/api/auth', authRoutes(accounts));
app.use('/api/shop', shopRoutes(accounts));

app.get('/api/health', (_req, res) => res.json({ ok: true, accountStorage: useSupabase ? 'supabase' : 'local-file', online: io.engine.clientsCount, ...manager.stats() }));

// In production, serve the built client from ./dist.
const distDir = path.resolve(process.cwd(), 'dist');
if (existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/socket.io') || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Everyone sees how many people are online; updates are batched to at most one per second.
let onlineTimer: NodeJS.Timeout | null = null;
const broadcastOnline = () => {
  if (onlineTimer) return;
  onlineTimer = setTimeout(() => {
    onlineTimer = null;
    io.emit('online_count', io.engine.clientsCount);
  }, 1000);
};

io.on('connection', (socket) => {
  socket.emit('online_count', io.engine.clientsCount);
  broadcastOnline();
  socket.on('disconnect', broadcastOnline);
  const ctx = createContext(socket, manager, accounts);
  registerLobbyHandlers(ctx);
  registerGameHandlers(ctx);
  registerCanvasHandlers(ctx);
  registerModerationHandlers(ctx);
});

// Render stops the old server with SIGTERM on each deploy: write pending changes first.
for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.on(sig, () => {
    accounts.flush().finally(() => process.exit(0));
  });
}

httpServer.listen(config.port, () => {
  console.log(`🎨 doodlz server listening on http://localhost:${config.port}`);
});
