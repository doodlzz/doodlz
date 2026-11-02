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

export function levenshtein(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
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

/** How many typos still count as "close" for a word of this length. */
export const closeThreshold = (len: number) => (len >= 7 ? 2 : len >= 4 ? 1 : 0);

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
