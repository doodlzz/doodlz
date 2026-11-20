// Account points and daily / weekly quests, shared by the server (which awards them) and the client (which shows them).

export type QuestEvent =
  | 'gameFinished'
  | 'duoFinished'
  | 'speedFinished'
  | 'publicFinished'
  | 'singleColorFinished'
  | 'blindfoldFinished'
  | 'won' // finished 1st
  | 'podium' // finished in the top 3
  | 'guessed'
  | 'firstGuess' // first to guess the word
  | 'cleanGuess' // guessed without using a hint
  | 'drew'
  | 'fullHouse'; // drew a word every guesser got

export type QuestPeriod = 'daily' | 'weekly';

export interface QuestDef {
  id: string;
  period: QuestPeriod;
  target: number;
  event: QuestEvent;
  emoji: string;
  /** Account points for finishing it. */
  points: number;
}

const daily = (id: string, target: number, event: QuestEvent, emoji: string): QuestDef => ({ id, period: 'daily', target, event, emoji, points: 5 });
const weekly = (id: string, target: number, event: QuestEvent, emoji: string): QuestDef => ({ id, period: 'weekly', target, event, emoji, points: 15 });

export const QUESTS = {
  // Daily: "play 3 games" every day, plus two from the rotation.
  play3: daily('play3', 3, 'gameFinished', '🎮'),
  guess5: daily('guess5', 5, 'guessed', '💡'),
  guess10: daily('guess10', 10, 'guessed', '🎯'),
  draw3: daily('draw3', 3, 'drew', '✏️'),
  draw5: daily('draw5', 5, 'drew', '🖌️'),
  duo: daily('duo', 1, 'duoFinished', '👯'),
  speed: daily('speed', 1, 'speedFinished', '⚡'),
  random: daily('random', 1, 'publicFinished', '🌍'),
  oneColor: daily('oneColor', 1, 'singleColorFinished', '🎨'),
  blind: daily('blind', 1, 'blindfoldFinished', '🙈'),
  podium: daily('podium', 1, 'podium', '🏆'),
  win: daily('win', 1, 'won', '👑'),
  noHints: daily('noHints', 3, 'cleanGuess', '🧠'),
  first2: daily('first2', 2, 'firstGuess', '🥇'),
  fullHouse: daily('fullHouse', 1, 'fullHouse', '🌟'),
  // Weekly: two a week, meant to take several sessions.
  wPlay: weekly('wPlay', 25, 'gameFinished', '🗓️'),
  wWin: weekly('wWin', 5, 'won', '👑'),
  wPodium: weekly('wPodium', 12, 'podium', '🏆'),
  wGuess: weekly('wGuess', 60, 'guessed', '🎯'),
  wDraw: weekly('wDraw', 30, 'drew', '🖌️'),
  wFirst: weekly('wFirst', 15, 'firstGuess', '🥇'),
  wFullHouse: weekly('wFullHouse', 8, 'fullHouse', '🌟'),
} satisfies Record<string, QuestDef>;

export type QuestId = keyof typeof QUESTS;

const DAILY_ROTATION: QuestId[] = ['guess5', 'guess10', 'draw3', 'draw5', 'duo', 'speed', 'random', 'oneColor', 'blind', 'podium', 'win', 'noHints', 'first2', 'fullHouse'];
const WEEKLY_ROTATION: QuestId[] = ['wPlay', 'wWin', 'wPodium', 'wGuess', 'wDraw', 'wFirst', 'wFullHouse'];

/** Account points for a ranked game, and the daily limits. */
export const POINTS = {
  place: [10, 6, 4], // 1st, 2nd, 3rd
  finished: 2, // everyone else who finished
  dailyGameCap: 30, // most points per day from games
  rankedMinPlayers: 4, // different signed-in players needed for a game to count
} as const;

/** Quest days and weeks run on UTC so the server and every player agree on when they reset. */
export function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** The Monday (UTC) that starts this quest week, as YYYY-MM-DD. */
export function utcWeek(d = new Date()): string {
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return utcDay(monday);
}

export function msUntilReset(now = new Date()): number {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export function msUntilWeeklyReset(now = new Date()): number {
  const next = new Date(utcWeek(now) + 'T00:00:00Z');
  next.setUTCDate(next.getUTCDate() + 7);
  return next.getTime() - now.getTime();
}

function hash(key: string): number {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Two different quests from a rotation, picked from a hash so everyone gets the same ones. */
function pickTwo(pool: QuestId[], key: string): [QuestId, QuestId] {
  const h = hash(key);
  const a = pool[h % pool.length];
  const rest = pool.filter((q) => q !== a);
  return [a, rest[Math.floor(h / pool.length) % rest.length]];
}

/** Same three daily quests for everyone on a given day: "play 3 games" plus two from the rotation. */
export function questsFor(day: string): QuestDef[] {
  return [QUESTS.play3, ...pickTwo(DAILY_ROTATION, day).map((id) => QUESTS[id])];
}

/** Same two weekly quests for everyone in a given week (`week` is its Monday). */
export function weeklyQuestsFor(week: string): QuestDef[] {
  return pickTwo(WEEKLY_ROTATION, 'week:' + week).map((id) => QUESTS[id]);
}

/** A signed-in player's progress for one day. */
export interface DailyProgress {
  day: string;
  gamePoints: number; // earned from games today (up to POINTS.dailyGameCap)
  casualXp?: number; // XP from private / unranked games today (up to CASUAL_XP.perDay)
  progress: Partial<Record<QuestId, number>>;
}

export const emptyDaily = (day = utcDay()): DailyProgress => ({ day, gamePoints: 0, progress: {} });

/** A signed-in player's progress for one week (`week` is its Monday). */
export interface WeeklyProgress {
  week: string;
  progress: Partial<Record<QuestId, number>>;
}

export const emptyWeekly = (week = utcWeek()): WeeklyProgress => ({ week, progress: {} });

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
  weekly?: WeeklyProgress;
  /** XP this game gave, the account's XP after it, and bonus points from levelling up. */
  xpGained?: number;
  xp?: number;
  levelPoints?: number;
}
