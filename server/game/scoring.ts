import { SCORING, type Difficulty } from '../../shared/types.js';

/**
 * Points for a correct guess — simple enough to explain in one line each:
 * the word is worth 30 / 40 / 50 (easy / medium / hard), the first guesser gets +10 and the second +5,
 * and each hint used costs 10 (never below 10 in total).
 */
export function guessPoints(opts: { difficulty: Difficulty; order: number; hintsUsed: number }): number {
  const bonus = opts.order === 0 ? SCORING.firstBonus : opts.order === 1 ? SCORING.secondBonus : 0;
  return Math.max(SCORING.minGuess, SCORING.word[opts.difficulty] + bonus - SCORING.hintCost * opts.hintsUsed);
}

/** Points for each drawer at the end of a turn: 10 for every player who guessed, up to 50. */
export function drawerPoints(correctGuesses: number): number {
  return Math.min(SCORING.drawerMax, SCORING.drawerPerGuess * correctGuesses);
}
