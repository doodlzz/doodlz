/** Lowercase, strip accents and punctuation, collapse whitespace and hyphens. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/[\s-]+/g, ' ')
    .trim();
}

/** Normalized form without spaces, so "ice cream" == "icecream". */
export const compact = (s: string) => normalize(s).replace(/ /g, '');

/**
 * Edit distance where a typo, a missing or extra letter, or two swapped letters ("wtaer") each count as 1.
 * Stops counting past `max` (returns max + 1).
 */
export function levenshtein(a: string, b: string, max = 4): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2] + 1);
      row.push(d);
    }
    prev2 = prev;
    prev = row;
  }
  return prev[b.length];
}

/** How many typos still count as "close" for a word of this length. */
export const closeThreshold = (len: number) => (len >= 13 ? 4 : len >= 9 ? 3 : len >= 6 ? 2 : len >= 4 ? 1 : 0);

const near = (a: string, b: string) => b.length >= 4 && levenshtein(a, b) <= closeThreshold(b.length);

/** A start of the word, typed most of the way: "watermel" for "watermelon" (typos allowed). */
const partlyTyped = (guess: string, target: string) =>
  guess.length >= 4 &&
  guess.length < target.length &&
  guess.length >= Math.ceil(target.length * 0.6) &&
  levenshtein(guess, target.slice(0, guess.length)) <= closeThreshold(guess.length);

/**
 * Should a wrong guess get the yellow "you're close" note? True when the guess (or one word of it)
 * is a few typos off the word, is the word typed most of the way, or names one word of a longer answer.
 */
export function isCloseGuess(text: string, word: string): boolean {
  const guess = compact(text);
  const target = compact(word);
  if (guess.length < 3 || target.length < 4) return false;
  if (near(guess, target) || partlyTyped(guess, target)) return true;

  const guessWords = normalize(text).split(' ').filter((w) => w.length >= 4);
  if (guessWords.some((w) => near(w, target) || partlyTyped(w, target))) return true;

  // Multi-word answers: getting one of the words ("eiffel" for "eiffel tower") is close too.
  const targetWords = normalize(word).split(' ').filter((w) => w.length >= 4);
  return targetWords.length > 1 && [guess, ...guessWords].some((g) => targetWords.some((t) => near(g, t)));
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Replace any occurrence of the given secret words in a public message with asterisks. */
export function maskWords(text: string, words: string[]): string {
  let out = text;
  for (const w of words) {
    if (!w) continue;
    const pattern = w.split(/[\s-]+/).map(escapeRegex).join('[\\s-]*');
    out = out.replace(new RegExp(pattern, 'giu'), (m) => '*'.repeat(m.length));
  }
  return out;
}

export const isLetter = (ch: string) => /[\p{L}\p{N}]/u.test(ch);
export const letterCount = (word: string) => [...word].filter(isLetter).length;
