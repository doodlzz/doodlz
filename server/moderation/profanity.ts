// A small multilingual profanity filter. It's a deterrent, not a perfect shield:
// it matches word *starts* (so "shitty" is caught but "grape" isn't) after undoing common leetspeak.

const PREFIXES = [
  // en
  'fuck', 'fuk', 'shit', 'bitch', 'cunt', 'whore', 'slut', 'bastard', 'asshole', 'dickhead', 'motherf', 'nigg', 'fagg', 'retard', 'pussy',
  'twat', 'wank', 'jackass', 'dumbass',
  // es / pt
  'puta', 'puto', 'mierda', 'joder', 'cabron', 'pendej', 'gilipoll', 'caralh', 'porra', 'merda', 'foder', 'fdp', 'viado', 'buceta',
  // fr
  'putain', 'salope', 'connard', 'connasse', 'encul', 'merde', 'batard',
  // de
  'scheis', 'scheiß', 'fotze', 'hurensohn', 'wichser', 'arschloch', 'schlampe',
  // ru
  'бля', 'сука', 'суки', 'хуй', 'хуе', 'хуё', 'пизд', 'ебат', 'ебан', 'еблан', 'мудак', 'пидор',
];
const EXACT = new Set(['ass', 'dick', 'fag', 'tit', 'tits', 'cum', 'hoe', 'cock', 'coño', 'cona']);
// Chinese has no spaces between words, so these are matched anywhere.
const SUBSTRINGS = ['操你', '傻逼', '傻b', '他妈', '妈的', '贱人', '婊子', '去死'];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };

function clean(token: string): string {
  return token
    .toLowerCase()
    .replace(/[013457@$!]/g, (c) => LEET[c])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function isBad(token: string): boolean {
  const t = clean(token);
  const squashed = t.replace(/(.)\1+/g, '$1'); // "fuuuck" -> "fuck"
  for (const form of [t, squashed]) {
    if (EXACT.has(form)) return true;
    if (PREFIXES.some((p) => form.startsWith(p))) return true;
  }
  return false;
}

/** Returns the text with offensive words starred out, and whether anything was caught. */
export function censor(text: string): { text: string; flagged: boolean } {
  let flagged = false;
  let out = text.replace(/[\p{L}\p{N}@$!]+/gu, (tok) => {
    if (!isBad(tok)) return tok;
    flagged = true;
    return '*'.repeat([...tok].length);
  });
  for (const s of SUBSTRINGS) {
    if (out.includes(s)) {
      flagged = true;
      out = out.split(s).join('*'.repeat([...s].length));
    }
  }
  return { text: out, flagged };
}

export const isProfane = (text: string) => censor(text).flagged;
