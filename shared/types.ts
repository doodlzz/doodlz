// Types shared by the client (src/) and the game server (server/).

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Avatar {
  color: string;
  eyes: number;
  mouth: number;
  accessory: number;
}

export interface RoomSettings {
  rounds: number;
  drawTime: number; // seconds
  maxPlayers: number;
  hints: boolean;
}

export type Phase = 'lobby' | 'choosing' | 'drawing' | 'turn_end' | 'game_over';

export interface PlayerPublic {
  id: string;
  name: string;
  avatar: Avatar;
  score: number;
  hasGuessed: boolean;
}

export interface WordChoice {
  word: string;
  difficulty: Difficulty;
  multiplier: number;
}

export interface TurnSummary {
  word: string;
  reason: 'all_guessed' | 'time_up' | 'drawer_left';
  deltas: Record<string, number>; // playerId -> points earned this turn
}

/** Room state as seen by one specific player (the word is hidden from guessers). */
export interface ClientRoomState {
  code: string;
  you: string;
  hostId: string;
  phase: Phase;
  settings: RoomSettings;
  players: PlayerPublic[];
  round: number;
  drawerId: string | null;
  /** One entry per character: a letter if revealed, '_' if hidden, or the literal space/hyphen. */
  hint: string[] | null;
  /** The real word: only sent to the drawer, players who guessed it, and everyone once the turn ends. */
  word: string | null;
  difficulty: Difficulty | null;
  phaseEndsAt: number | null; // server timestamp (ms)
  serverNow: number;
  lastTurn: TurnSummary | null;
}

// Drawing ops are in logical canvas pixels (CANVAS_WIDTH x CANVAS_HEIGHT).
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export type DrawOp =
  | { kind: 'line'; x0: number; y0: number; x1: number; y1: number; color: string; size: number }
  | { kind: 'fill'; x: number; y: number; color: string };

export type ChatKind = 'guess' | 'system' | 'correct' | 'close' | 'private' | 'join' | 'leave';

export interface ChatMessage {
  id: string;
  kind: ChatKind;
  text: string;
  name?: string;
  playerId?: string;
  ts: number;
}

export type Ack<T = object> = (res: ({ ok: true } & T) | { ok: false; error: string }) => void;

export interface ClientToServerEvents {
  create_room: (p: { name: string; avatar: Avatar; settings?: Partial<RoomSettings> }, ack: Ack<{ code: string }>) => void;
  join_room: (p: { code: string; name: string; avatar: Avatar }, ack: Ack<{ code: string }>) => void;
  leave_room: () => void;
  update_settings: (s: Partial<RoomSettings>) => void;
  start_game: (ack?: Ack) => void;
  select_word: (index: number) => void;
  draw_stroke: (ops: DrawOp[]) => void;
  clear_canvas: () => void;
  request_canvas: () => void;
  submit_guess: (text: string) => void;
  back_to_lobby: () => void;
}

export interface ServerToClientEvents {
  room_state: (s: ClientRoomState) => void;
  word_choices: (p: { choices: WordChoice[]; endsAt: number; serverNow: number }) => void;
  draw_stroke: (ops: DrawOp[]) => void;
  clear_canvas: () => void;
  canvas_history: (ops: DrawOp[]) => void;
  chat_message: (m: ChatMessage) => void;
}

export const DEFAULT_SETTINGS: RoomSettings = { rounds: 3, drawTime: 80, maxPlayers: 8, hints: true };

export const SETTING_LIMITS = {
  rounds: [1, 10],
  drawTime: [30, 180],
  maxPlayers: [2, 12],
} as const;

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = { easy: 1, medium: 1.5, hard: 2 };
