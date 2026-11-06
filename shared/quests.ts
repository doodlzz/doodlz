// Account points and daily quests, shared by the server (which awards them) and the client (which shows them).

export type QuestId = 'play3' | 'guess5' | 'draw3' | 'duo' | 'speed' | 'random';
export type QuestEvent = 'gameFinished' | 'duoFinished' | 'speedFinished' | 'publicFinished' | 'guessed' | 'drew';

export interface QuestDef {
  id: QuestId;
  target: number;
  event: QuestEvent;
  emoji: string;
}

export const QUESTS: Record<QuestId, QuestDef> = {
  play3: { id: 'play3', target: 3, event: 'gameFinished', emoji: '🎮' },
  guess5: { id: 'guess5', target: 5, event: 'guessed', emoji: '💡' },
  draw3: { id: 'draw3', target: 3, event: 'drew', emoji: '✏️' },
  duo: { id: 'duo', target: 1, event: 'duoFinished', emoji: '👯' },
  speed: { id: 'speed', target: 1, event: 'speedFinished', emoji: '⚡' },
  random: { id: 'random', target: 1, event: 'publicFinished', emoji: '🌍' },
};

const ROTATING: QuestId[] = ['guess5', 'draw3', 'duo', 'speed', 'random'];

/** Account points for a ranked game, and the daily limits. */
export const POINTS = {
  place: [10, 6, 4], // 1st, 2nd, 3rd
  finished: 2, // everyone else who finished
  dailyGameCap: 30, // most points per day from games
  quest: 5, // each finished daily quest (on top of the game cap)
  rankedMinPlayers: 4, // different signed-in players needed for a game to count
} as const;

/** Quest days run on UTC so the server and every player agree on when they reset. */
export function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function msUntilReset(now = new Date()): number {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

/** Same three quests for everyone on a given day, picked from a hash of the date. */
export function questsFor(day: string): QuestDef[] {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const a = ROTATING[h % ROTATING.length];
  const rest = ROTATING.filter((q) => q !== a);
  const b = rest[Math.floor(h / ROTATING.length) % rest.length];
  return [QUESTS.play3, QUESTS[a], QUESTS[b]];
}

/** A signed-in player's progress for one day. */
export interface DailyProgress {
  day: string;
  gamePoints: number; // earned from games today (up to POINTS.dailyGameCap)
  progress: Partial<Record<QuestId, number>>;
}

export const emptyDaily = (day = utcDay()): DailyProgress => ({ day, gamePoints: 0, progress: {} });

export type UnrankedReason = 'guest' | 'private' | 'unfinished' | 'fewPlayers' | 'noScore';

/** Sent to each player when a game ends: what it earned them. */
export interface RewardSummary {
  ranked: boolean;
  reason?: UnrankedReason;
  place: number;
  /** Points from this game after the daily cap. */
  gamePoints: number;
  /** True when the daily cap cut this game's points. */
  capped: boolean;
  questPoints: number;
  questsDone: QuestId[];
  /** Account total and today's progress after this game (signed-in players only). */
  total?: number;
  daily?: DailyProgress;
}
