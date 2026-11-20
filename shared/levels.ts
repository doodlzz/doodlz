// Account levels from XP, shared by the server (which gives XP) and the client (which shows levels).
//
// XP comes from ranked public games (the same points as the shop balance, but with no daily cap) and, a
// little, from other finished games (private rooms, or public ones without enough signed-in players).
// Bought points never give XP.

export const MAX_LEVEL = 100;

/** Bonus shop points for each level gained. */
export const LEVEL_UP_POINTS = 10;

/** XP for other finished games: 1 per turn really played, a few per game and a few per day. */
export const CASUAL_XP = {
  perGame: 5,
  perDay: 15,
  /** Different signed-in accounts (on different devices) the game needs. */
  minPlayers: 2,
} as const;

/** Total XP needed to reach `level` (level 1 needs 0). Grows a little faster each level. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(12 * Math.pow(Math.min(level, MAX_LEVEL) - 1, 1.85));
}

export interface LevelInfo {
  level: number;
  /** XP earned since this level started, and XP this level takes in all (0 at the max level). */
  into: number;
  span: number;
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  const start = xpForLevel(level);
  const span = level < MAX_LEVEL ? xpForLevel(level + 1) - start : 0;
  return { level, into: Math.max(0, xp - start), span };
}

/** Levels where the level badge gets a new look. */
export const BADGE_TIERS = [
  { level: 10, id: 'bronze' },
  { level: 25, id: 'silver' },
  { level: 50, id: 'gold' },
  { level: 75, id: 'diamond' },
  { level: 100, id: 'rainbow' },
] as const;

export const levelOf = (xp: number): number => levelInfo(xp).level;
