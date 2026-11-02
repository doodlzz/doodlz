import { DIFFICULTY_MULTIPLIER, HINT_PENALTY, type Difficulty } from '../../shared/types.js';

const BASE = 300;
const round5 = (n: number) => Math.max(0, Math.round(n / 5) * 5);

/**
 * Points for a correct guess.
 * - Time curve: 100% with the full timer left, sloping down to a 35% floor, so late guesses still count.
 * - Order: the first guesser gets full points, each later guesser 10% less (min 70%).
 * - Each hint used costs 25% (min 25%).
 * The ceiling is 300 × difficulty multiplier (600 for a hard word), which keeps scores from inflating.
 */
export function guessPoints(opts: { timeRatio: number; difficulty: Difficulty; order: number; hintsUsed: number }): number {
  const ratio = Math.min(1, Math.max(0, opts.timeRatio));
  const curve = 0.35 + 0.65 * ratio;
  const orderFactor = Math.max(0.7, 1 - 0.1 * opts.order);
  const hintFactor = Math.max(0.25, 1 - HINT_PENALTY * opts.hintsUsed);
  return round5(BASE * DIFFICULTY_MULTIPLIER[opts.difficulty] * curve * orderFactor * hintFactor);
}

/**
 * Points for each drawer at the end of a turn: 75% of the average guesser score, scaled by the share of
 * players who got it. It doesn't grow with lobby size, so big rooms don't hand out runaway drawer scores.
 * Duo drawers share the work, so each gets 60% of that.
 */
export function drawerPoints(opts: { guessScores: number[]; guessers: number; drawers: number }): number {
  if (!opts.guessScores.length || opts.guessers <= 0) return 0;
  const avg = opts.guessScores.reduce((a, b) => a + b, 0) / opts.guessScores.length;
  const share = opts.guessScores.length / opts.guessers;
  return round5(avg * share * 0.75 * (opts.drawers > 1 ? 0.6 : 1));
}
