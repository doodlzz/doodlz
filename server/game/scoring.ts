import { SCORING, type Difficulty } from '../../shared/types.js';

/**
 * Points for a correct guess:
 *   round(word × speed × 0.85^hints) + place bonus, never below 10
 * - word: 30 / 40 / 50 for an easy / medium / hard word
 * - speed: 1.0 if guessed instantly, falling evenly to 0.5 in the last second (timeLeft is 0..1)
 * - hints: how many hints the drawer had given before this guess (each keeps 85% of the value)
 * - place bonus: +15 for 1st, +10 for 2nd, +5 for 3rd
 */
export function guessPoints(opts: { difficulty: Difficulty; order: number; timeLeft: number; hintsGiven: number }): number {
  const t = Math.min(1, Math.max(0, opts.timeLeft));
  const speed = SCORING.minSpeed + (1 - SCORING.minSpeed) * t;
  const value = SCORING.word[opts.difficulty] * speed * SCORING.hintFactor ** opts.hintsGiven;
  return Math.max(SCORING.minGuess, Math.round(value) + (SCORING.placeBonus[opts.order] ?? 0));
}

/**
 * Points for each drawer when the turn ends:
 *   round(drawerWord × guessed / guessers) + 10 if everyone guessed − 8 per hint given, never below 0
 * - drawerWord: 40 / 50 / 60 for an easy / medium / hard word
 * - guessed / guessers: the share of players who got it, so any room size pays the same for the same share
 * Nobody guessed: 0.
 */
export function drawerPoints(opts: { difficulty: Difficulty; guessed: number; guessers: number; hintsGiven: number }): number {
  if (opts.guessed <= 0) return 0;
  const guessers = Math.max(opts.guessed, opts.guessers);
  const share = Math.round((SCORING.drawer[opts.difficulty] * opts.guessed) / guessers);
  const all = opts.guessed >= guessers ? SCORING.allGuessedBonus : 0;
  return Math.max(0, share + all - SCORING.drawerHintCost * opts.hintsGiven);
}
