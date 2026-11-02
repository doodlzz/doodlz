import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../shared/types';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Same origin: in dev Vite proxies /socket.io to the game server; in production the server serves the app.
export const socket: GameSocket = io({ autoConnect: true });
