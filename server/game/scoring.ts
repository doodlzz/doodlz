import { SCORING, type Difficulty } from '../../shared/types.js';

/**
 * Points for a correct guess:
 *   round(word × speed × 0.85^hints) + place bonus, never below 10
 * - word: 30 / 40 / 50 for an easy / medium / hard word
 * - speed: 1.0 if guessed instantly, falling evenly to 0.5 in the last second (timeLeft is 0..1)
 * - hints: how many hints the drawer had given before this guess (each keeps 85% of the value)
 * - place bonus: +15 for 1st, +10 for 2nd, +5 for 3rd
 */
/** 1.0 for an instant guess, falling evenly to minSpeed (0.5) in the last second. timeLeft is 0..1. */
export function speedFactor(timeLeft: number): number {
  const t = Math.min(1, Math.max(0, timeLeft));
  return SCORING.minSpeed + (1 - SCORING.minSpeed) * t;
}

export function guessPoints(opts: { difficulty: Difficulty; order: number; timeLeft: number; hintsGiven: number }): number {
  const speed = speedFactor(opts.timeLeft);
  const value = SCORING.word[opts.difficulty] * speed * SCORING.hintFactor ** opts.hintsGiven;
  return Math.max(SCORING.minGuess, Math.round(value) + (SCORING.placeBonus[opts.order] ?? 0));
}

/**
 * Points for each drawer when the turn ends, the same rule for every room size:
 *   round(drawerWord × guessed / guessers × average speed of those guesses) − 8 per hint given, never below 0
 * - drawerWord: 40 / 50 / 60 for an easy / medium / hard word
 * - guessed / guessers: the share of players who got it
 * - average speed: the same 1.0 → 0.5 speed factor guessers get, averaged over the correct guesses
 * Tying the drawer to the guessers' speed (and having no "everyone guessed" bonus, which is automatic
 * with only one guesser) means a quick guesser out-earns the drawer on that turn in a 2-player room,
 * while a clear drawing that gets fast guesses still pays well in any room.
 * Nobody guessed: 0.
 */
export function drawerPoints(opts: { difficulty: Difficulty; guessers: number; hintsGiven: number; guessTimesLeft: number[] }): number {
  const guessed = opts.guessTimesLeft.length;
  if (guessed <= 0) return 0;
  const guessers = Math.max(guessed, opts.guessers);
  const avgSpeed = opts.guessTimesLeft.reduce((sum, t) => sum + speedFactor(t), 0) / guessed;
  const value = Math.round((SCORING.drawer[opts.difficulty] * guessed * avgSpeed) / guessers);
  return Math.max(0, value - SCORING.drawerHintCost * opts.hintsGiven);
}
