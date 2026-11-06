import { randomUUID } from 'node:crypto';
import type { Server } from 'socket.io';
import {
  CATEGORIES,
  MAX_TARGET_ROUNDS,
  MAX_WARNINGS,
  SCORING,
  SINGLE_COLORS,
  type Avatar,
  type BackgroundId,
  type Category,
  type ChatKind,
  type ChatMessage,
  type ClientRoomState,
  type ClientToServerEvents,
  type Difficulty,
  type DrawOp,
  type Lang,
  type LobbyInfo,
  type MsgParams,
  type Phase,
  type Profile,
  type ReportReason,
  type RoomSettings,
  type ServerToClientEvents,
  type TurnSummary,
  type WordChoice,
} from '../../shared/types.js';
import { config } from '../config.js';
import { drawerPoints, guessPoints } from '../game/scoring.js';
import { compact, isCloseGuess, isLetter, letterCount, maskWords } from '../game/text.js';
import { pickChoices } from '../game/wordPicker.js';
import { censor } from '../moderation/profanity.js';
import { isBackground, sanitizeOp, sanitizeSettings } from '../util/sanitize.js';

export type IO = Server<ClientToServerEvents, ServerToClientEvents>;

const TICK_MS = 250;
const MAX_HISTORY = 30_000;
const MAX_OPS_PER_PACKET = 400;
const CHAT_BURST = 5; // messages allowed per window
const CHAT_WINDOW_MS = 4_000;

export interface Player {
  id: string;
  token: string;
  socketId: string | null;
  name: string;
  avatar: Avatar;
  deviceId: string;
  ip: string;
  lang: Lang;
  score: number;
  hasGuessed: boolean;
  connected: boolean;
  graceTimer: NodeJS.Timeout | null;
  hintIdx: Set<number>; // letters revealed to this player via the hint button
  hintsUsed: number;
  warnings: number;
  /** Signed-in players' account id (set by the server from their session, never by the client). */
  accountId: string | null;
  /** This game: correct guesses made after real drawing, and turns they actually drew. */
  gameGuesses: number;
  gameDrawings: number;
  chatTimes: number[];
}

interface StoredOp {
  op: DrawOp;
  by: string;
}

export interface RoomHooks {
  /** A player left for good (left, kicked, or reconnect grace expired). */
  onPlayerRemoved(room: Room, player: Player): void;
  onEmpty(room: Room): void;
  /** A game reached the end screen. `complete` is false when it stopped early (players left). */
  onGameOver?(room: Room, complete: boolean): void;
}

let msgCounter = 0;
const msgId = () => `${Date.now().toString(36)}-${(msgCounter++).toString(36)}`;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export class Room {
  readonly players = new Map<string, Player>();
  hostId = '';
  /** name#tag of the first player in; shown in the lobby browser. */
  creator = '';
  settings: RoomSettings;
  phase: Phase = 'lobby';
  round = 0;

  private history: StoredOp[] = [];
  private drawerIds: string[] = [];
  private drawQueue: string[] = [];
  private choices: WordChoice[] = [];
  private word: string | null = null;
  private parts: [string, string] | null = null;
  private difficulty: Difficulty | null = null;
  private turnMs = 0;
  private phaseEndsAt: number | null = null;
  private revealed = new Set<number>();
  private revealAt: number[] = [];
  private deltas: Record<string, number> = {};
  private guessScores: number[] = [];
  private lastTurn: TurnSummary | null = null;
  private background: BackgroundId = 'white';
  private drawColor: string | null = null;
  private rerollsLeft = 0;
  private usedWords = new Set<string>();
  private autoStartAt: number | null = null;
  private drawingStartedAt = 0;
  private categoryPending = false;
  private categoryPickEndsAt: number | null = null;
  private categoryTimer: NodeJS.Timeout | null = null;
  private reports = new Map<string, Set<string>>(); // targetId -> reporter ids
  private bannedDevices = new Set<string>();
  private bannedIps = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private ticker: NodeJS.Timeout | null = null;
  private autoTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly io: IO,
    readonly code: string,
    settings: RoomSettings,
    readonly isPublic: boolean,
    private readonly hooks: RoomHooks,
  ) {
    this.settings = settings;
    // Matchmade rooms get their category from the first player; pick one at random if they take too long.
    if (isPublic && settings.categories.length === 0) {
      this.categoryPending = true;
      this.categoryPickEndsAt = Date.now() + config.categoryPickMs;
      this.categoryTimer = setTimeout(() => {
        this.categoryTimer = null;
        this.setCategory(CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]);
      }, config.categoryPickMs);
    }
  }

  /** What the lobby browser shows about this room. */
  summary(): LobbyInfo {
    const cats = this.settings.categories;
    return {
      code: this.code,
      creator: this.creator,
      category: this.categoryPending || cats.length !== 1 ? null : cats[0],
      phase: this.phase,
      round: this.round,
      rounds: this.settings.rounds,
      targetScore: this.settings.targetScore,
      players: this.players.size,
      maxPlayers: this.settings.maxPlayers,
    };
  }

  get connectedCount(): number {
    return this.connectedPlayers.length;
  }

  // ================= players =================

  private get connectedPlayers() {
    return [...this.players.values()].filter((p) => p.connected);
  }

  /** Returns an i18n error key if this profile may not join, else null. */
  joinError(profile: Profile, ip: string): string | null {
    if (this.bannedDevices.has(profile.deviceId) || (ip && this.bannedIps.has(ip))) return 'err.banned';
    if (this.players.size >= this.settings.maxPlayers) return 'err.roomFull';
    const others = [...this.players.values()];
    if (!config.allowSameDevice && others.some((p) => p.deviceId === profile.deviceId)) return 'err.sameDevice';
    if (ip && others.filter((p) => p.ip === ip).length >= config.maxPerIp) return 'err.tooManyFromIp';
    return null;
  }

  addPlayer(socketId: string, profile: Profile, ip: string, accountId: string | null = null): Player {
    // Names already carry a #tag; the rare exact clash (same account twice) gets a suffix.
    let name = profile.name;
    const taken = new Set([...this.players.values()].map((p) => p.name.toLowerCase()));
    for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${profile.name} (${n})`;

    const player: Player = {
      id: randomUUID(),
      token: randomUUID(),
      socketId,
      name,
      avatar: profile.avatar,
      deviceId: profile.deviceId,
      ip,
      lang: profile.lang,
      score: 0,
      hasGuessed: false,
      connected: true,
      graceTimer: null,
      hintIdx: new Set(),
      hintsUsed: 0,
      warnings: 0,
      chatTimes: [],
      accountId,
      gameGuesses: 0,
      gameDrawings: 0,
    };
    this.players.set(player.id, player);
    if (!this.hostId) this.hostId = player.id;
    if (!this.creator) this.creator = name;
    this.chat('join', 'chat.joined', { name });
    this.checkAutoStart();
    this.broadcastState();
    return player;
  }

  /** The socket dropped: keep the slot (and score) for a grace period so the player can reconnect. */
  markDisconnected(playerId: string): void {
    const p = this.players.get(playerId);
    if (!p || !p.connected) return;
    p.connected = false;
    p.socketId = null;
    this.chat('leave', 'chat.disconnected', { name: p.name });
    p.graceTimer = setTimeout(() => this.removePlayer(playerId), config.reconnectGraceMs);

    if (this.hostId === playerId) this.transferHost();
    this.afterPlayerLost(playerId);
  }

  reconnect(playerId: string, socketId: string): Player | null {
    const p = this.players.get(playerId);
    if (!p) return null;
    if (p.graceTimer) clearTimeout(p.graceTimer);
    p.graceTimer = null;
    const wasConnected = p.connected;
    p.connected = true;
    p.socketId = socketId;
    if (!wasConnected) this.chat('join', 'chat.reconnected', { name: p.name });
    if (!this.connectedPlayers.some((x) => x.id === this.hostId)) this.hostId = p.id;

    this.io.to(socketId).emit('canvas_history', this.canvas());
    if (this.phase === 'choosing' && this.drawerIds[0] === p.id) this.sendChoices();
    this.checkAutoStart();
    this.broadcastState();
    return p;
  }

  /** Leave for good. */
  removePlayer(playerId: string): void {
    const p = this.players.get(playerId);
    if (!p) return;
    if (p.graceTimer) clearTimeout(p.graceTimer);
    const wasConnected = p.connected;
    this.players.delete(playerId);
    this.drawQueue = this.drawQueue.filter((id) => id !== playerId);
    this.reports.delete(playerId);
    for (const set of this.reports.values()) set.delete(playerId);
    this.hooks.onPlayerRemoved(this, p);

    if (this.players.size === 0) {
      this.destroy();
      this.hooks.onEmpty(this);
      return;
    }
    if (wasConnected) this.chat('leave', 'chat.left', { name: p.name });
    if (this.hostId === playerId) this.transferHost();
    this.afterPlayerLost(playerId);
  }

  private transferHost(): void {
    const next = this.connectedPlayers.find((p) => p.id !== this.hostId) ?? [...this.players.values()].find((p) => p.id !== this.hostId);
    if (!next) return;
    this.hostId = next.id;
    this.chat('system', 'chat.newHost', { name: next.name });
  }

  /** Shared follow-up when someone disconnects or leaves. */
  private afterPlayerLost(playerId: string): void {
    // Players in their reconnect grace period still count, so a brief drop doesn't end the game.
    const inGame = this.phase === 'choosing' || this.phase === 'drawing' || this.phase === 'turn_end';
    if (inGame && this.players.size < 2) {
      this.chat('system', 'chat.notEnoughPlayers');
      this.endGame(false);
      return;
    }
    if (this.drawerIds.includes(playerId) && (this.phase === 'choosing' || this.phase === 'drawing')) {
      const stillDrawing = this.drawerIds.some((id) => this.players.get(id)?.connected);
      if (!stillDrawing || (this.phase === 'choosing' && this.drawerIds[0] === playerId)) {
        this.endTurn('drawer_left');
        return;
      }
    }
    if (this.phase === 'drawing' && this.everyoneGuessed()) {
      this.endTurn('all_guessed');
      return;
    }
    this.checkAutoStart();
    this.broadcastState();
  }

  // ================= lobby =================

  updateSettings(by: string, raw: unknown): void {
    if (by !== this.hostId || this.phase !== 'lobby') return;
    // The category only changes through chooseCategory.
    this.settings = { ...sanitizeSettings(raw, this.settings), categories: this.settings.categories };
    this.settings.maxPlayers = Math.max(this.settings.maxPlayers, this.players.size);
    // Public rooms are joined by strangers, so they never use host-written word lists.
    if (this.isPublic) {
      this.settings.customWords = [];
      this.settings.customOnly = false;
    }
    this.broadcastState();
  }

  /** Private rooms: the host can switch category in the lobby. Public rooms: picked once, then locked. */
  chooseCategory(by: string, raw: unknown): void {
    if (by !== this.hostId || this.phase !== 'lobby') return;
    if (this.isPublic && !this.categoryPending) return;
    if (!CATEGORIES.includes(raw as Category)) return;
    this.setCategory(raw as Category);
  }

  private setCategory(c: Category): void {
    this.settings = { ...this.settings, categories: [c] };
    if (this.categoryTimer) clearTimeout(this.categoryTimer);
    this.categoryTimer = null;
    this.categoryPending = false;
    this.categoryPickEndsAt = null;
    this.checkAutoStart();
    this.broadcastState();
  }

  /** Returns an i18n error key, or null on success. `by` is null for automatic starts. */
  startGame(by: string | null): string | null {
    if (by !== null && by !== this.hostId) return 'err.notHost';
    if (this.phase !== 'lobby' && this.phase !== 'game_over') return 'err.alreadyRunning';
    if (this.categoryPending) return 'err.pickCategory';
    const connected = this.connectedPlayers.length;
    if (connected < 2) return 'err.needTwo';
    if (this.settings.mode === 'duo' && connected < 3) return 'err.needThreeDuo';

    this.clearTimers();
    this.autoStartAt = null;
    for (const p of this.players.values()) {
      p.score = 0;
      p.hasGuessed = false;
      p.gameGuesses = 0;
      p.gameDrawings = 0;
    }
    this.round = 0;
    this.drawQueue = [];
    this.lastTurn = null;
    this.usedWords.clear();
    this.nextTurn();
    return null;
  }

  backToLobby(by: string | null): void {
    if ((by !== null && by !== this.hostId) || this.phase !== 'game_over') return;
    this.clearTimers();
    this.phase = 'lobby';
    this.round = 0;
    this.drawerIds = [];
    this.word = null;
    this.parts = null;
    this.lastTurn = null;
    this.phaseEndsAt = null;
    this.history = [];
    this.background = 'white';
    for (const p of this.players.values()) {
      p.score = 0;
      p.hasGuessed = false;
    }
    this.io.to(this.code).emit('clear_canvas');
    this.chat('system', 'chat.backToLobby');
    this.checkAutoStart();
    this.broadcastState();
  }

  /** Public rooms start on their own a few seconds after two players are in. */
  private checkAutoStart(): void {
    if (!this.isPublic || this.phase !== 'lobby') return;
    const enough = this.connectedPlayers.length >= 2 && !this.categoryPending;
    if (enough && this.autoStartAt === null) {
      this.autoStartAt = Date.now() + config.publicAutoStartMs;
      this.autoTimer = setTimeout(() => {
        this.autoTimer = null;
        this.autoStartAt = null;
        if (this.startGame(null)) this.broadcastState();
      }, config.publicAutoStartMs);
    } else if (!enough && this.autoStartAt !== null) {
      if (this.autoTimer) clearTimeout(this.autoTimer);
      this.autoTimer = null;
      this.autoStartAt = null;
    }
  }

  // ================= turn flow =================

  private nextTurn(): void {
    this.clearTimers();
    const connectedIds = () => this.connectedPlayers.map((p) => p.id);
    if (this.players.size < 2 || connectedIds().length === 0) return this.endGame(false);

    // "First to X points": the game ends after the turn in which someone gets there.
    const target = this.settings.targetScore;
    if (target > 0 && [...this.players.values()].some((p) => p.score >= target)) return this.endGame();

    if (this.drawQueue.length === 0) {
      this.round++;
      if (this.round > (target > 0 ? MAX_TARGET_ROUNDS : this.settings.rounds)) return this.endGame();
      this.drawQueue = connectedIds();
      if (target > 0) this.chat('system', 'chat.roundTarget', { round: this.round, target });
      else this.chat('system', 'chat.round', { round: this.round, total: this.settings.rounds });
    }

    const wanted = this.settings.mode === 'duo' && connectedIds().length >= 3 ? 2 : 1;
    const drawers: string[] = [];
    while (drawers.length < wanted && this.drawQueue.length) {
      const id = this.drawQueue.shift()!;
      if (this.players.get(id)?.connected) drawers.push(id);
    }
    if (drawers.length === 0) return this.nextTurn(); // everyone left in the queue disconnected
    while (drawers.length < wanted) {
      // Odd one out in duo mode: pair them with someone who already drew this round.
      const options = connectedIds().filter((id) => !drawers.includes(id));
      if (!options.length) break;
      drawers.push(pick(options));
    }

    this.drawerIds = drawers;
    for (const p of this.players.values()) {
      p.hasGuessed = false;
      p.hintIdx.clear();
      p.hintsUsed = 0;
    }
    this.word = null;
    this.parts = null;
    this.difficulty = null;
    this.revealed.clear();
    this.deltas = {};
    this.guessScores = [];
    this.history = [];
    this.background = 'white';
    this.drawColor = this.settings.singleColor ? pick(SINGLE_COLORS) : null;
    this.rerollsLeft = 1;
    this.io.to(this.code).emit('clear_canvas');

    this.choices = pickChoices(this.settings, this.usedWords);
    this.phase = 'choosing';
    const chooseMs = this.settings.speed ? config.speedChooseMs : config.chooseMs;
    this.phaseEndsAt = Date.now() + chooseMs;
    this.sendChoices();
    this.chat('system', 'chat.choosing', { name: this.players.get(drawers[0])!.name });
    this.timer = setTimeout(() => this.selectWord(drawers[0], Math.floor(Math.random() * this.choices.length)), chooseMs);
    this.broadcastState();
  }

  private sendChoices(): void {
    const lead = this.players.get(this.drawerIds[0]);
    if (lead?.socketId && this.phaseEndsAt) {
      this.io.to(lead.socketId).emit('word_choices', { choices: this.choices, endsAt: this.phaseEndsAt, serverNow: Date.now() });
    }
  }

  reroll(by: string): void {
    if (this.phase !== 'choosing' || by !== this.drawerIds[0] || this.rerollsLeft <= 0) return;
    this.rerollsLeft--;
    this.choices = pickChoices(this.settings, new Set([...this.usedWords, ...this.choices.map((c) => c.word)]));
    this.sendChoices();
    this.broadcastState();
  }

  selectWord(by: string, index: unknown): void {
    if (this.phase !== 'choosing' || by !== this.drawerIds[0]) return;
    const choice = typeof index === 'number' ? this.choices[index] : undefined;
    if (!choice) return;
    this.clearTimers();

    this.word = choice.word;
    this.parts = this.drawerIds.length === 2 && choice.parts ? choice.parts : null;
    this.difficulty = choice.difficulty;
    this.usedWords.add(choice.word);
    this.phase = 'drawing';
    const now = Date.now();
    this.drawingStartedAt = now;
    this.turnMs = this.turnSeconds() * 1000;
    this.phaseEndsAt = now + this.turnMs;

    // Spread automatic letter reveals between 40% and 85% of the turn.
    const letters = letterCount(this.word);
    const reveals = this.settings.hints && letters > 2 ? Math.max(1, Math.floor(letters * 0.35)) : 0;
    this.revealAt = Array.from({ length: reveals }, (_, i) => now + this.turnMs * (reveals === 1 ? 0.6 : 0.4 + (0.45 * i) / (reveals - 1)));

    const names = this.drawerIds.map((id) => this.players.get(id)?.name ?? '?').join(' & ');
    this.chat('system', 'chat.drawing', { name: names });
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.broadcastState();
  }

  private turnSeconds(): number {
    return this.settings.speed ? Math.min(this.settings.drawTime, this.settings.speed) : this.settings.drawTime;
  }

  private tick(): void {
    if (this.phase !== 'drawing' || !this.word || this.phaseEndsAt === null) return;
    const now = Date.now();
    if (now >= this.phaseEndsAt) return this.endTurn('time_up');

    let changed = false;
    while (this.revealAt.length && now >= this.revealAt[0]) {
      this.revealAt.shift();
      const hidden = this.hiddenIndices(this.revealed);
      if (hidden.length > 1) {
        this.revealed.add(pick(hidden));
        changed = true;
      }
    }
    if (changed) this.broadcastState();
  }

  private hiddenIndices(known: Set<number>): number[] {
    if (!this.word) return [];
    return [...this.word].flatMap((ch, i) => (isLetter(ch) && !known.has(i) ? [i] : []));
  }

  private endTurn(reason: TurnSummary['reason']): void {
    if (this.phase !== 'choosing' && this.phase !== 'drawing') return;
    this.clearTimers();

    // Quests: a turn counts as "drew" only if that drawer really drew something.
    if (this.phase === 'drawing') {
      for (const id of this.drawerIds) {
        const p = this.players.get(id);
        if (p && this.history.filter((h) => h.by === id).length >= config.questMinOps) p.gameDrawings++;
      }
    }

    // Drawers are paid at the end of the turn: 10 for every player who guessed, up to 50.
    const correct = this.guessScores.length;
    const pts = drawerPoints(correct);
    for (const id of this.drawerIds) {
      const d = this.players.get(id);
      if (d && pts > 0) {
        d.score += pts;
        this.deltas[id] = (this.deltas[id] ?? 0) + pts;
        this.chat('system', 'chat.drawerPoints', { name: d.name, points: pts, n: correct });
      }
    }

    if (this.word) this.chat('system', 'chat.wordWas', { word: this.word });
    else if (reason === 'drawer_left') this.chat('system', 'chat.drawerLeft');
    if (reason === 'time_up' && !this.guessScores.length) this.chat('system', 'chat.nobodyGuessed');

    this.lastTurn = { word: this.word ?? '', reason, deltas: { ...this.deltas } };
    this.phase = 'turn_end';
    this.phaseEndsAt = Date.now() + config.turnEndMs;
    this.timer = setTimeout(() => this.nextTurn(), config.turnEndMs);
    this.broadcastState();
  }

  private endGame(complete = true): void {
    this.clearTimers();
    this.phase = 'game_over';
    this.drawerIds = [];
    this.word = null;
    this.parts = null;
    this.phaseEndsAt = null;
    this.drawQueue = [];
    const winner = [...this.players.values()].sort((a, b) => b.score - a.score)[0];
    if (winner) this.chat('system', 'chat.winner', { name: winner.name, points: winner.score });
    if (this.isPublic) this.timer = setTimeout(() => this.backToLobby(null), config.publicRestartMs);
    this.broadcastState();
    this.hooks.onGameOver?.(this, complete && this.round > 0);
  }

  private everyoneGuessed(): boolean {
    const guessers = this.connectedPlayers.filter((p) => !this.drawerIds.includes(p.id));
    return guessers.length > 0 && guessers.every((p) => p.hasGuessed);
  }

  // ================= drawing =================

  private canDraw(by: string) {
    return this.phase === 'drawing' && this.drawerIds.includes(by);
  }

  draw(by: string, rawOps: unknown): void {
    if (!this.canDraw(by) || !Array.isArray(rawOps)) return;
    const ops = rawOps
      .slice(0, MAX_OPS_PER_PACKET)
      .map(sanitizeOp)
      .filter((o): o is DrawOp => {
        if (!o) return false;
        // Single-color mode: only the assigned color (the eraser and clear are always allowed).
        if (this.drawColor && o.kind !== 'clear' && !(o.kind === 'line' && o.erase) && o.color !== this.drawColor) return false;
        return true;
      });
    if (!ops.length) return;
    if (this.history.length + ops.length <= MAX_HISTORY) for (const op of ops) this.history.push({ op, by });
    const sender = this.players.get(by)?.socketId;
    (sender ? this.io.to(this.code).except(sender) : this.io.to(this.code)).emit('draw_stroke', ops);
  }

  /** Remove this drawer's most recent stroke and send everyone the redrawn canvas. */
  undo(by: string): void {
    if (!this.canDraw(by)) return;
    let i = this.history.length - 1;
    while (i >= 0 && this.history[i].by !== by) i--;
    if (i < 0) return;
    const sid = this.history[i].op.sid;
    this.history = this.history.filter((h) => !(h.by === by && h.op.sid === sid));
    this.io.to(this.code).emit('canvas_history', this.canvas());
  }

  setBackground(by: string, bg: unknown): void {
    if (!this.canDraw(by) || !isBackground(bg)) return;
    this.background = bg;
    this.broadcastState();
  }

  canvas(): DrawOp[] {
    return this.phase === 'drawing' || this.phase === 'turn_end' ? this.history.map((h) => h.op) : [];
  }

  // ================= guessing & chat =================

  private rateLimited(p: Player): boolean {
    const now = Date.now();
    p.chatTimes = p.chatTimes.filter((t) => now - t < CHAT_WINDOW_MS);
    if (p.chatTimes.length >= CHAT_BURST) return true;
    p.chatTimes.push(now);
    return false;
  }

  guess(by: string, raw: unknown): void {
    const player = this.players.get(by);
    if (!player || typeof raw !== 'string') return;
    let text = raw.replace(/[\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
    if (!text) return;
    if (this.rateLimited(player)) return this.privateMsg(player, 'warning', 'chat.slowDown');

    const checked = censor(text);
    if (checked.flagged) {
      text = checked.text;
      if (this.warn(player)) return; // kicked
    }

    if (this.phase !== 'drawing' || !this.word) {
      this.chatText('guess', text, player);
      return;
    }

    // Drawers and players who already guessed talk in a private channel so they can't leak the word.
    if (this.drawerIds.includes(by) || player.hasGuessed) {
      const msg = this.message('private', { text, player });
      for (const p of this.players.values()) {
        if ((this.drawerIds.includes(p.id) || p.hasGuessed) && p.socketId) this.io.to(p.socketId).emit('chat_message', msg);
      }
      return;
    }

    const guess = compact(text);
    const target = compact(this.word);
    if (!checked.flagged && guess === target) return this.correctGuess(player);

    const secrets = [this.word, ...(this.parts ?? [])];
    this.chatText('guess', maskWords(text, secrets), player);

    if (this.parts?.some((part) => compact(part) === guess)) {
      this.privateMsg(player, 'close', 'chat.partCorrect', { text });
    } else if (isCloseGuess(text, this.word)) {
      this.privateMsg(player, 'close', 'chat.close', { text });
    }
  }

  private correctGuess(player: Player): void {
    const order = this.guessScores.length;
    const points = guessPoints({ difficulty: this.difficulty ?? 'easy', order, hintsUsed: player.hintsUsed });
    player.score += points;
    player.hasGuessed = true;
    // Only guesses made after some real drawing count toward quests.
    if (Date.now() - this.drawingStartedAt >= config.questGuessMinMs && this.history.length >= config.questMinOps) player.gameGuesses++;
    this.guessScores.push(points);
    this.deltas[player.id] = (this.deltas[player.id] ?? 0) + points;

    const key = order === 0 ? 'chat.correctFirst' : order === 1 ? 'chat.correctSecond' : 'chat.correct';
    this.chat('correct', key, { name: player.name, points }, player);
    if (this.everyoneGuessed()) this.endTurn('all_guessed');
    else this.broadcastState();
  }

  /** Guesser hint button: reveal one more letter to this player only, at a point penalty. */
  requestHint(by: string): void {
    const p = this.players.get(by);
    if (!p || this.phase !== 'drawing' || !this.word || this.drawerIds.includes(by) || p.hasGuessed) return;
    if (p.hintsUsed >= this.maxHints()) return;
    const hidden = this.hiddenIndices(new Set([...this.revealed, ...p.hintIdx]));
    if (hidden.length <= 1) return;
    p.hintIdx.add(pick(hidden));
    p.hintsUsed++;
    this.privateMsg(p, 'system', 'chat.hintUsed', { penalty: p.hintsUsed * SCORING.hintCost });
    this.sendState(p);
  }

  private maxHints(): number {
    return this.word ? Math.max(1, Math.min(3, Math.floor(letterCount(this.word) / 3))) : 0;
  }

  // ================= moderation =================

  /** Issue an automatic warning; returns true if the player was kicked. */
  private warn(p: Player): boolean {
    p.warnings++;
    if (p.warnings >= MAX_WARNINGS) {
      this.kick(p, 'kick.profanity');
      return true;
    }
    this.privateMsg(p, 'warning', 'chat.warning', { count: p.warnings, max: MAX_WARNINGS });
    return false;
  }

  report(by: string, targetId: unknown, reason: ReportReason): void {
    const target = typeof targetId === 'string' ? this.players.get(targetId) : undefined;
    const reporter = this.players.get(by);
    if (!target || !reporter || target.id === by) return;
    const set = this.reports.get(target.id) ?? new Set<string>();
    if (set.has(by)) return;
    set.add(by);
    this.reports.set(target.id, set);
    console.log(`[report] room ${this.code}: ${reporter.name} reported ${target.name} (${reason})`);
    this.privateMsg(reporter, 'system', 'chat.reported', { name: target.name });

    // Kick when enough of the other players agree (at least 2, or half the room).
    const threshold = Math.max(2, Math.ceil((this.connectedPlayers.length - 1) / 2));
    if (set.size >= threshold) this.kick(target, 'kick.reported');
    else this.sendState(reporter);
  }

  hostKick(by: string, targetId: unknown): void {
    const target = typeof targetId === 'string' ? this.players.get(targetId) : undefined;
    if (by !== this.hostId || !target || target.id === by || this.isPublic) return;
    this.kick(target, 'kick.host');
  }

  private kick(p: Player, reasonKey: string): void {
    this.bannedDevices.add(p.deviceId);
    if (p.ip) this.bannedIps.add(p.ip);
    if (p.socketId) this.io.to(p.socketId).emit('kicked', { reason: reasonKey });
    this.chat('leave', 'chat.kicked', { name: p.name });
    p.connected = false; // suppress the "left" message
    this.removePlayer(p.id);
  }

  // ================= messaging =================

  private message(kind: ChatKind, opts: { key?: string; params?: MsgParams; text?: string; player?: Player }): ChatMessage {
    return { id: msgId(), kind, key: opts.key, params: opts.params, text: opts.text, name: opts.player?.name, playerId: opts.player?.id, ts: Date.now() };
  }

  private chat(kind: ChatKind, key: string, params?: MsgParams, player?: Player): void {
    this.io.to(this.code).emit('chat_message', this.message(kind, { key, params, player }));
  }

  private chatText(kind: ChatKind, text: string, player: Player): void {
    this.io.to(this.code).emit('chat_message', this.message(kind, { text, player }));
  }

  private privateMsg(p: Player, kind: ChatKind, key: string, params?: MsgParams): void {
    if (p.socketId) this.io.to(p.socketId).emit('chat_message', this.message(kind, { key, params }));
  }

  stateFor(p: Player): ClientRoomState {
    const ended = this.phase === 'turn_end';
    const isDrawer = this.drawerIds.includes(p.id);
    const knows = ended || isDrawer || p.hasGuessed;
    const word = this.phase === 'drawing' || ended ? this.word : null;
    const reported = [...this.reports.entries()].filter(([, s]) => s.has(p.id)).map(([id]) => id);
    const partIdx = this.drawerIds.indexOf(p.id);

    return {
      code: this.code,
      you: p.id,
      hostId: this.hostId,
      isPublic: this.isPublic,
      phase: this.phase,
      settings: this.settings,
      players: [...this.players.values()].map(({ id, name, avatar, score, hasGuessed, connected }) => ({ id, name, avatar, score, hasGuessed, connected })),
      round: this.round,
      drawerIds: this.drawerIds,
      hint: word ? [...word].map((ch, i) => (!isLetter(ch) || knows || this.revealed.has(i) || p.hintIdx.has(i) ? ch : '_')) : null,
      word: word && knows ? word : null,
      myPart: this.parts && partIdx >= 0 && this.phase === 'drawing' ? this.parts[partIdx] : null,
      difficulty: word ? this.difficulty : null,
      turnSeconds: this.phase === 'drawing' ? this.turnMs / 1000 : this.turnSeconds(),
      phaseEndsAt: this.phaseEndsAt,
      serverNow: Date.now(),
      lastTurn: ended ? this.lastTurn : null,
      background: this.background,
      drawColor: this.drawColor,
      rerollsLeft: this.drawerIds[0] === p.id ? this.rerollsLeft : 0,
      hintsLeft: this.phase === 'drawing' && !knows ? Math.max(0, this.maxHints() - p.hintsUsed) : 0,
      hintsUsed: p.hintsUsed,
      autoStartAt: this.autoStartAt,
      categoryPending: this.categoryPending,
      categoryPickEndsAt: this.categoryPickEndsAt,
      reported,
    };
  }

  private sendState(p: Player): void {
    if (p.socketId) this.io.to(p.socketId).emit('room_state', this.stateFor(p));
  }

  broadcastState(): void {
    for (const p of this.players.values()) this.sendState(p);
  }

  private clearTimers(): void {
    if (this.timer) clearTimeout(this.timer);
    if (this.ticker) clearInterval(this.ticker);
    this.timer = this.ticker = null;
  }

  destroy(): void {
    this.clearTimers();
    if (this.autoTimer) clearTimeout(this.autoTimer);
    if (this.categoryTimer) clearTimeout(this.categoryTimer);
    for (const p of this.players.values()) if (p.graceTimer) clearTimeout(p.graceTimer);
  }
}
