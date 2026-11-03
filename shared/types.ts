// Types and constants shared by the client (src/) and the game server (server/).

// ---------------- enums & constants ----------------

export type Difficulty = 'easy' | 'medium' | 'hard';

export const CATEGORIES = [
  'games',
  'heroes',
  'cartoons',
  'snacks',
  'wildlife',
  'landscapes',
  'verbs',
  'emotions',
  'landmarks',
  'history',
  'household',
  'brainrot',
  'jobs',
  'flags',
  'movies',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const BACKGROUNDS = ['white', 'paper', 'grid', 'dots', 'chalk', 'sky', 'midnight'] as const;
export type BackgroundId = (typeof BACKGROUNDS)[number];

export const LANGUAGES = ['en', 'es', 'pt', 'fr', 'de', 'ru', 'zh'] as const;
export type Lang = (typeof LANGUAGES)[number];

export type GameMode = 'classic' | 'duo';
export type SpeedCap = 0 | 30 | 40;
export type ReportReason = 'drawing' | 'chat' | 'name' | 'other';

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = { easy: 1, medium: 1.5, hard: 2 };
export const MAX_WARNINGS = 3;
export const HINT_PENALTY = 0.25; // each hint removes 25% of the points for a correct guess
export const MAX_CUSTOM_WORDS = 300;

/** Colors handed out in "Single Color Only" mode. */
export const SINGLE_COLORS = ['#ef4444', '#f97316', '#16a34a', '#3b82f6', '#8b5cf6', '#ec4899', '#0f172a', '#92400e'];

// Drawing ops are in logical canvas pixels (CANVAS_WIDTH x CANVAS_HEIGHT).
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// ---------------- players & rooms ----------------

export interface Avatar {
  color: string;
  eyes: number;
  mouth: number;
  accessory: number;
}

/** What a client sends when it creates, joins or matchmakes. */
export interface Profile {
  name: string;
  avatar: Avatar;
  deviceId: string; // one per browser (shared by its tabs)
  lang: Lang;
}

export interface RoomSettings {
  rounds: number;
  drawTime: number; // seconds
  maxPlayers: number;
  hints: boolean; // automatic letter reveals over time
  mode: GameMode;
  speed: SpeedCap; // 0 = off, otherwise caps the draw time
  singleColor: boolean;
  blindfold: boolean;
  categories: Category[]; // empty = all categories
  customWords: string[];
  customOnly: boolean;
}

export const DEFAULT_SETTINGS: RoomSettings = {
  rounds: 3,
  drawTime: 80,
  maxPlayers: 8,
  hints: true,
  mode: 'classic',
  speed: 0,
  singleColor: false,
  blindfold: false,
  categories: [],
  customWords: [],
  customOnly: false,
};

export const SETTING_LIMITS = {
  rounds: [1, 10],
  drawTime: [30, 180],
  maxPlayers: [2, 12],
} as const;

export type Phase = 'lobby' | 'choosing' | 'drawing' | 'turn_end' | 'game_over';

export interface PlayerPublic {
  id: string;
  name: string;
  avatar: Avatar;
  score: number;
  hasGuessed: boolean;
  connected: boolean;
}

export interface WordChoice {
  word: string;
  difficulty: Difficulty;
  multiplier: number;
  category: Category | 'custom' | 'compound';
  parts?: [string, string]; // duo mode: who draws which half
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
  isPublic: boolean;
  phase: Phase;
  settings: RoomSettings;
  players: PlayerPublic[];
  round: number;
  drawerIds: string[];
  /** One entry per character: a letter if revealed, '_' if hidden, or the literal space/hyphen. */
  hint: string[] | null;
  /** The real word: only for drawers, players who guessed it, and everyone once the turn ends. */
  word: string | null;
  /** Duo mode: the half of the word this drawer is responsible for. */
  myPart: string | null;
  difficulty: Difficulty | null;
  turnSeconds: number; // effective draw time this turn
  phaseEndsAt: number | null; // server timestamp (ms)
  serverNow: number;
  lastTurn: TurnSummary | null;
  background: BackgroundId;
  drawColor: string | null; // set in single-color mode
  rerollsLeft: number; // for the lead drawer
  hintsLeft: number; // for this guesser
  hintsUsed: number;
  autoStartAt: number | null; // public rooms start themselves
  /** Public rooms: the first player still has to pick the category. */
  categoryPending: boolean;
  categoryPickEndsAt: number | null; // a random category is picked when this runs out
  reported: string[]; // players this client has already reported
}

// ---------------- drawing ----------------

export type ShapeKind = 'line' | 'rect' | 'ellipse';

/** Every op carries a stroke id (sid) so a whole stroke can be undone at once. */
export type DrawOp =
  | { kind: 'line'; sid: number; x0: number; y0: number; x1: number; y1: number; color: string; size: number; erase?: boolean }
  | { kind: 'shape'; sid: number; shape: ShapeKind; x0: number; y0: number; x1: number; y1: number; color: string; size: number; filled: boolean }
  | { kind: 'fill'; sid: number; x: number; y: number; color: string }
  | { kind: 'clear'; sid: number };

// ---------------- chat ----------------

export type ChatKind = 'guess' | 'system' | 'correct' | 'close' | 'private' | 'join' | 'leave' | 'warning';
export type MsgParams = Record<string, string | number>;

/** System messages carry an i18n key so each client shows them in its own language. */
export interface ChatMessage {
  id: string;
  kind: ChatKind;
  key?: string;
  params?: MsgParams;
  text?: string;
  name?: string;
  playerId?: string;
  ts: number;
}

// ---------------- events ----------------

export type AckResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; params?: MsgParams };
export type Ack<T = object> = (res: AckResult<T>) => void;

export interface JoinResult {
  code: string;
  token: string; // reconnection token
  playerId: string;
}

export interface ClientToServerEvents {
  create_room: (p: { profile: Profile; settings?: Partial<RoomSettings> }, ack: Ack<JoinResult>) => void;
  join_room: (p: { code: string; profile: Profile }, ack: Ack<JoinResult>) => void;
  quick_play: (p: { profile: Profile }, ack: Ack<JoinResult>) => void;
  resume_session: (p: { token: string }, ack: Ack<JoinResult>) => void;
  leave_room: () => void;
  update_settings: (s: Partial<RoomSettings>) => void;
  choose_category: (c: Category) => void;
  start_game: (ack?: Ack) => void;
  back_to_lobby: () => void;
  select_word: (index: number) => void;
  reroll_words: () => void;
  draw_stroke: (ops: DrawOp[]) => void;
  undo: () => void;
  set_background: (bg: BackgroundId) => void;
  request_canvas: () => void;
  submit_guess: (text: string) => void;
  request_hint: () => void;
  report_player: (p: { targetId: string; reason: ReportReason }) => void;
  kick_player: (targetId: string) => void;
}

export interface ServerToClientEvents {
  room_state: (s: ClientRoomState) => void;
  word_choices: (p: { choices: WordChoice[]; endsAt: number; serverNow: number }) => void;
  draw_stroke: (ops: DrawOp[]) => void;
  clear_canvas: () => void;
  canvas_history: (ops: DrawOp[]) => void;
  chat_message: (m: ChatMessage) => void;
  kicked: (p: { reason: string }) => void;
  online_count: (n: number) => void;
}
