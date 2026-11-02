import type { Server } from 'socket.io';
import {
  DEFAULT_SETTINGS,
  DIFFICULTY_MULTIPLIER,
  SETTING_LIMITS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  type Avatar,
  type ChatKind,
  type ChatMessage,
  type ClientRoomState,
  type ClientToServerEvents,
  type Difficulty,
  type DrawOp,
  type Phase,
  type RoomSettings,
  type ServerToClientEvents,
  type TurnSummary,
  type WordChoice,
} from '../shared/types.js';
import { WORDS } from './words.js';

export type IO = Server<ClientToServerEvents, ServerToClientEvents>;

const CHOOSE_TIME_MS = 15_000;
const TURN_END_MS = 6_000;
const TICK_MS = 250;
const MAX_HISTORY = 30_000;
const MAX_OPS_PER_PACKET = 400;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const AVATAR_PART_COUNT = 6;

interface Player {
  id: string;
  name: string;
  avatar: Avatar;
  score: number;
  hasGuessed: boolean;
}

let msgCounter = 0;
const msgId = () => `${Date.now().toString(36)}-${(msgCounter++).toString(36)}`;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Replace any occurrence of the secret word in a public message with asterisks. */
function maskWord(text: string, word: string): string {
  const pattern = word.split(/\s+/).map(escapeRegex).join('[\\s-]*');
  return text.replace(new RegExp(pattern, 'gi'), (m) => '*'.repeat(m.length));
}

const isLetter = (ch: string) => /[\p{L}\p{N}]/u.test(ch);

export function sanitizeName(raw: unknown): string {
  const name = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, 20) : '';
  return name || `Doodler${Math.floor(Math.random() * 900 + 100)}`;
}

export function sanitizeAvatar(raw: unknown): Avatar {
  const a = (raw ?? {}) as Partial<Avatar>;
  const part = (n: unknown) => (Number.isInteger(n) ? clamp(n as number, 0, AVATAR_PART_COUNT - 1) : 0);
  return {
    color: typeof a.color === 'string' && HEX_COLOR.test(a.color) ? a.color : '#f472b6',
    eyes: part(a.eyes),
    mouth: part(a.mouth),
    accessory: part(a.accessory),
  };
}

export function sanitizeSettings(raw: unknown, base: RoomSettings = DEFAULT_SETTINGS): RoomSettings {
  const s = (raw ?? {}) as Partial<RoomSettings>;
  const num = (v: unknown, fallback: number, [min, max]: readonly [number, number]) =>
    typeof v === 'number' && Number.isFinite(v) ? clamp(Math.round(v), min, max) : fallback;
  return {
    rounds: num(s.rounds, base.rounds, SETTING_LIMITS.rounds),
    drawTime: num(s.drawTime, base.drawTime, SETTING_LIMITS.drawTime),
    maxPlayers: num(s.maxPlayers, base.maxPlayers, SETTING_LIMITS.maxPlayers),
    hints: typeof s.hints === 'boolean' ? s.hints : base.hints,
  };
}

function sanitizeOp(op: unknown): DrawOp | null {
  if (!op || typeof op !== 'object') return null;
  const o = op as Record<string, unknown>;
  const fin = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, -50, max + 50) : null);
  if (typeof o.color !== 'string' || !HEX_COLOR.test(o.color)) return null;
  if (o.kind === 'line') {
    const x0 = fin(o.x0, CANVAS_WIDTH), y0 = fin(o.y0, CANVAS_HEIGHT);
    const x1 = fin(o.x1, CANVAS_WIDTH), y1 = fin(o.y1, CANVAS_HEIGHT);
    const size = fin(o.size, 80);
    if (x0 === null || y0 === null || x1 === null || y1 === null || size === null) return null;
    return { kind: 'line', x0, y0, x1, y1, color: o.color, size: clamp(size, 1, 80) };
  }
  if (o.kind === 'fill') {
    const x = fin(o.x, CANVAS_WIDTH), y = fin(o.y, CANVAS_HEIGHT);
    if (x === null || y === null) return null;
    return { kind: 'fill', x, y, color: o.color };
  }
  return null;
}

export class Room {
  readonly players = new Map<string, Player>();
  hostId = '';
  settings: RoomSettings;
  phase: Phase = 'lobby';
  round = 0;
  history: DrawOp[] = [];

  private drawerId: string | null = null;
  private drawQueue: string[] = [];
  private choices: WordChoice[] = [];
  private word: string | null = null;
  private difficulty: Difficulty | null = null;
  private phaseEndsAt: number | null = null;
  private revealed = new Set<number>();
  private revealAt: number[] = [];
  private deltas: Record<string, number> = {};
  private lastTurn: TurnSummary | null = null;
  private timer: NodeJS.Timeout | null = null;
  private ticker: NodeJS.Timeout | null = null;

  constructor(
    private readonly io: IO,
    readonly code: string,
    settings: RoomSettings,
  ) {
    this.settings = settings;
  }

  // ---------- players ----------

  addPlayer(id: string, rawName: unknown, rawAvatar: unknown): void {
    let name = sanitizeName(rawName);
    const taken = new Set([...this.players.values()].map((p) => p.name.toLowerCase()));
    for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${sanitizeName(rawName).slice(0, 17)} ${n}`;

    this.players.set(id, { id, name, avatar: sanitizeAvatar(rawAvatar), score: 0, hasGuessed: false });
    if (!this.hostId) this.hostId = id;
    this.chat('join', `${name} joined the room`);
    this.broadcastState();
  }

  /** Returns true when the room is now empty and should be destroyed. */
  removePlayer(id: string): boolean {
    const player = this.players.get(id);
    if (!player) return this.players.size === 0;
    this.players.delete(id);
    this.drawQueue = this.drawQueue.filter((p) => p !== id);
    if (this.players.size === 0) return true;

    this.chat('leave', `${player.name} left the room`);
    if (this.hostId === id) {
      const next = this.players.values().next().value!;
      this.hostId = next.id;
      this.chat('system', `${next.name} is now the host`);
    }

    const inGame = this.phase === 'choosing' || this.phase === 'drawing' || this.phase === 'turn_end';
    if (inGame && this.players.size < 2) {
      this.chat('system', 'Not enough players left — game over!');
      this.endGame();
    } else if (this.drawerId === id && (this.phase === 'choosing' || this.phase === 'drawing')) {
      this.endTurn('drawer_left');
    } else if (this.phase === 'drawing' && this.everyoneGuessed()) {
      this.endTurn('all_guessed');
    } else {
      this.broadcastState();
    }
    return false;
  }

  get isFull() {
    return this.players.size >= this.settings.maxPlayers;
  }

  // ---------- lobby ----------

  updateSettings(by: string, raw: unknown): void {
    if (by !== this.hostId || this.phase !== 'lobby') return;
    this.settings = sanitizeSettings(raw, this.settings);
    this.settings.maxPlayers = Math.max(this.settings.maxPlayers, this.players.size);
    this.broadcastState();
  }

  startGame(by: string): string | null {
    if (by !== this.hostId) return 'Only the host can start the game';
    if (this.phase !== 'lobby' && this.phase !== 'game_over') return 'Game already running';
    if (this.players.size < 2) return 'You need at least 2 players to start';

    for (const p of this.players.values()) {
      p.score = 0;
      p.hasGuessed = false;
    }
    this.round = 0;
    this.drawQueue = [];
    this.lastTurn = null;
    this.nextTurn();
    return null;
  }

  backToLobby(by: string): void {
    if (by !== this.hostId || this.phase !== 'game_over') return;
    this.clearTimers();
    this.phase = 'lobby';
    this.round = 0;
    this.drawerId = null;
    this.word = null;
    this.lastTurn = null;
    this.phaseEndsAt = null;
    this.history = [];
    for (const p of this.players.values()) {
      p.score = 0;
      p.hasGuessed = false;
    }
    this.io.to(this.code).emit('clear_canvas');
    this.chat('system', 'Back in the lobby — the host can start a new game');
    this.broadcastState();
  }

  // ---------- turn flow ----------

  private nextTurn(): void {
    this.clearTimers();
    if (this.drawQueue.length === 0) {
      this.round++;
      if (this.round > this.settings.rounds) return this.endGame();
      this.drawQueue = [...this.players.keys()];
      this.chat('system', `Round ${this.round} of ${this.settings.rounds}`);
    }

    this.drawerId = this.drawQueue.shift()!;
    const drawer = this.players.get(this.drawerId)!;
    for (const p of this.players.values()) p.hasGuessed = false;
    this.word = null;
    this.difficulty = null;
    this.revealed.clear();
    this.deltas = {};
    this.history = [];
    this.io.to(this.code).emit('clear_canvas');

    this.choices = (['easy', 'medium', 'hard'] as const).map((difficulty) => ({
      word: pick(WORDS[difficulty]),
      difficulty,
      multiplier: DIFFICULTY_MULTIPLIER[difficulty],
    }));
    this.phase = 'choosing';
    this.phaseEndsAt = Date.now() + CHOOSE_TIME_MS;
    this.io.to(drawer.id).emit('word_choices', { choices: this.choices, endsAt: this.phaseEndsAt, serverNow: Date.now() });
    this.chat('system', `${drawer.name} is choosing a word`);
    this.timer = setTimeout(() => this.selectWord(drawer.id, Math.floor(Math.random() * this.choices.length)), CHOOSE_TIME_MS);
    this.broadcastState();
  }

  selectWord(by: string, index: unknown): void {
    if (this.phase !== 'choosing' || by !== this.drawerId) return;
    const choice = typeof index === 'number' ? this.choices[index] : undefined;
    if (!choice) return;
    this.clearTimers();

    this.word = choice.word;
    this.difficulty = choice.difficulty;
    this.phase = 'drawing';
    const now = Date.now();
    const duration = this.settings.drawTime * 1000;
    this.phaseEndsAt = now + duration;

    // Spread letter reveals between 40% and 85% of the turn.
    const letters = [...this.word].filter(isLetter).length;
    const reveals = this.settings.hints && letters > 2 ? Math.max(1, Math.floor(letters * 0.4)) : 0;
    this.revealAt = Array.from({ length: reveals }, (_, i) =>
      now + duration * (reveals === 1 ? 0.6 : 0.4 + (0.45 * i) / (reveals - 1)),
    );

    this.chat('system', `${this.players.get(by)!.name} is drawing now!`);
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.broadcastState();
  }

  private tick(): void {
    if (this.phase !== 'drawing' || !this.word || this.phaseEndsAt === null) return;
    const now = Date.now();
    if (now >= this.phaseEndsAt) return this.endTurn('time_up');

    let changed = false;
    while (this.revealAt.length && now >= this.revealAt[0]) {
      this.revealAt.shift();
      const hidden = [...this.word].map((ch, i) => (isLetter(ch) && !this.revealed.has(i) ? i : -1)).filter((i) => i >= 0);
      if (hidden.length > 1) {
        this.revealed.add(pick(hidden));
        changed = true;
      }
    }
    if (changed) this.broadcastState();
  }

  private endTurn(reason: TurnSummary['reason']): void {
    if (this.phase !== 'choosing' && this.phase !== 'drawing') return;
    this.clearTimers();
    const drawer = this.drawerId ? this.players.get(this.drawerId) : undefined;

    if (this.word) {
      this.chat('system', `The word was "${this.word}"`);
    } else if (reason === 'drawer_left') {
      this.chat('system', 'The drawer left — skipping this turn');
    }
    if (reason === 'time_up' && drawer && !Object.keys(this.deltas).length) {
      this.chat('system', 'Nobody guessed it this time!');
    }

    this.lastTurn = { word: this.word ?? '', reason, deltas: { ...this.deltas } };
    this.phase = 'turn_end';
    this.phaseEndsAt = Date.now() + TURN_END_MS;
    this.timer = setTimeout(() => this.nextTurn(), TURN_END_MS);
    this.broadcastState();
  }

  private endGame(): void {
    this.clearTimers();
    this.phase = 'game_over';
    this.drawerId = null;
    this.word = null;
    this.phaseEndsAt = null;
    this.drawQueue = [];
    const winner = [...this.players.values()].sort((a, b) => b.score - a.score)[0];
    if (winner) this.chat('system', `🏆 ${winner.name} wins with ${winner.score} points!`);
    this.broadcastState();
  }

  private everyoneGuessed(): boolean {
    const guessers = [...this.players.values()].filter((p) => p.id !== this.drawerId);
    return guessers.length > 0 && guessers.every((p) => p.hasGuessed);
  }

  // ---------- drawing ----------

  draw(by: string, rawOps: unknown): void {
    if (this.phase !== 'drawing' || by !== this.drawerId || !Array.isArray(rawOps)) return;
    const ops = rawOps.slice(0, MAX_OPS_PER_PACKET).map(sanitizeOp).filter((o): o is DrawOp => o !== null);
    if (!ops.length) return;
    if (this.history.length + ops.length <= MAX_HISTORY) this.history.push(...ops);
    this.io.to(this.code).except(by).emit('draw_stroke', ops);
  }

  clearCanvas(by: string): void {
    if (this.phase !== 'drawing' || by !== this.drawerId) return;
    this.history = [];
    this.io.to(this.code).emit('clear_canvas');
  }

  canvasFor(): DrawOp[] {
    return this.phase === 'drawing' || this.phase === 'turn_end' ? this.history : [];
  }

  // ---------- guessing & chat ----------

  guess(by: string, raw: unknown): void {
    const player = this.players.get(by);
    if (!player || typeof raw !== 'string') return;
    const text = raw.replace(/\s+/g, ' ').trim().slice(0, 100);
    if (!text) return;

    if (this.phase !== 'drawing' || !this.word) {
      this.chat('guess', text, player);
      return;
    }

    // Drawer and players who already guessed talk in a private channel so they can't leak the word.
    if (by === this.drawerId || player.hasGuessed) {
      const msg = this.message('private', text, player);
      for (const p of this.players.values()) {
        if (p.id === this.drawerId || p.hasGuessed) this.io.to(p.id).emit('chat_message', msg);
      }
      return;
    }

    const guess = normalize(text);
    const target = normalize(this.word);
    if (guess.replace(/ /g, '') === target.replace(/ /g, '')) {
      this.correctGuess(player);
      return;
    }

    this.chat('guess', maskWord(text, this.word), player);
    if (target.length >= 4 && levenshtein(guess, target) === 1) {
      this.io.to(by).emit('chat_message', this.message('close', `"${text}" is very close!`));
    }
  }

  private correctGuess(player: Player): void {
    const now = Date.now();
    const total = this.settings.drawTime * 1000;
    const ratio = clamp(((this.phaseEndsAt ?? now) - now) / total, 0, 1);
    const mult = DIFFICULTY_MULTIPLIER[this.difficulty ?? 'easy'];
    const round5 = (n: number) => Math.round(n / 5) * 5;

    // Guesser: 100–500 base points scaled by how much time was left, times the word's multiplier.
    const points = round5((100 + 400 * ratio) * mult);
    player.score += points;
    player.hasGuessed = true;
    this.deltas[player.id] = (this.deltas[player.id] ?? 0) + points;

    // Drawer: a smaller reward for every player who gets it.
    const drawer = this.drawerId ? this.players.get(this.drawerId) : undefined;
    if (drawer) {
      const bonus = round5((40 + 80 * ratio) * mult);
      drawer.score += bonus;
      this.deltas[drawer.id] = (this.deltas[drawer.id] ?? 0) + bonus;
    }

    this.chat('correct', `${player.name} guessed the word! (+${points})`, player);
    if (this.everyoneGuessed()) this.endTurn('all_guessed');
    else this.broadcastState();
  }

  // ---------- messaging ----------

  private message(kind: ChatKind, text: string, player?: Player): ChatMessage {
    return { id: msgId(), kind, text, name: player?.name, playerId: player?.id, ts: Date.now() };
  }

  private chat(kind: ChatKind, text: string, player?: Player): void {
    this.io.to(this.code).emit('chat_message', this.message(kind, text, player));
  }

  stateFor(id: string): ClientRoomState {
    const player = this.players.get(id);
    const ended = this.phase === 'turn_end';
    const knows = ended || id === this.drawerId || !!player?.hasGuessed;
    const word = this.phase === 'drawing' || ended ? this.word : null;

    return {
      code: this.code,
      you: id,
      hostId: this.hostId,
      phase: this.phase,
      settings: this.settings,
      players: [...this.players.values()].map(({ id, name, avatar, score, hasGuessed }) => ({ id, name, avatar, score, hasGuessed })),
      round: this.round,
      drawerId: this.drawerId,
      hint: word ? [...word].map((ch, i) => (!isLetter(ch) || knows || this.revealed.has(i) ? ch : '_')) : null,
      word: word && knows ? word : null,
      difficulty: word ? this.difficulty : null,
      phaseEndsAt: this.phaseEndsAt,
      serverNow: Date.now(),
      lastTurn: ended ? this.lastTurn : null,
    };
  }

  broadcastState(): void {
    for (const id of this.players.keys()) this.io.to(id).emit('room_state', this.stateFor(id));
  }

  private clearTimers(): void {
    if (this.timer) clearTimeout(this.timer);
    if (this.ticker) clearInterval(this.ticker);
    this.timer = this.ticker = null;
  }

  destroy(): void {
    this.clearTimers();
  }
}
