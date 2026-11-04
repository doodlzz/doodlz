import { CATEGORIES, SCORING, type Category, type Difficulty, type RoomSettings, type WordChoice } from '../../shared/types.js';
import { COMPOUNDS, WORDS } from './words.js';
import { letterCount } from './text.js';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Custom words have no difficulty label, so we infer one from length. */
const difficultyOf = (word: string): Difficulty => {
  const n = letterCount(word);
  return n <= 5 ? 'easy' : n <= 8 ? 'medium' : 'hard';
};

const choice = (word: string, difficulty: Difficulty, category: WordChoice['category'], parts?: [string, string]): WordChoice => ({
  word,
  difficulty,
  points: SCORING.word[difficulty],
  category,
  ...(parts ? { parts } : {}),
});

/** Pick an unused item, falling back to any item once everything has been used. */
function fresh<T>(pool: T[], used: Set<string>, key: (t: T) => string): T | undefined {
  const unused = pool.filter((t) => !used.has(key(t)));
  return unused.length ? pick(unused) : pool.length ? pick(pool) : undefined;
}

function duoChoices(settings: RoomSettings, used: Set<string>): WordChoice[] {
  // Custom words with a space or hyphen can be split between the two drawers too.
  const customPairs = settings.customWords
    .map((w) => w.split(/[\s-]+/))
    .filter((p) => p.length === 2)
    .map((p) => [p[0], p[1]] as [string, string]);
  const pool = settings.customOnly && customPairs.length >= 3 ? customPairs : [...COMPOUNDS, ...customPairs];
  const out: WordChoice[] = [];
  const taken = new Set(used);
  for (let i = 0; i < 3; i++) {
    const pair = fresh(pool, taken, (p) => p.join(''));
    if (!pair) break;
    const word = pair.join('');
    taken.add(word);
    out.push(choice(word, difficultyOf(word), 'compound', pair));
  }
  return out.sort((a, b) => DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty));
}

/** Three word choices (easy / medium / hard where possible) for the lead drawer. */
export function pickChoices(settings: RoomSettings, used: Set<string>): WordChoice[] {
  if (settings.mode === 'duo') return duoChoices(settings, used);

  const custom = settings.customWords;
  if (settings.customOnly && custom.length >= 3) {
    const taken = new Set(used);
    const out: WordChoice[] = [];
    for (let i = 0; i < 3; i++) {
      const w = fresh(custom, taken, (x) => x)!;
      taken.add(w);
      out.push(choice(w, difficultyOf(w), 'custom'));
    }
    return out.sort((a, b) => DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty));
  }

  const cats: Category[] = settings.categories.length ? settings.categories : [...CATEGORIES];
  const taken = new Set(used);
  return DIFFICULTIES.map((difficulty) => {
    // Mix custom words in (about 1 in 3 picks) when the host added some.
    const customForLevel = custom.filter((w) => difficultyOf(w) === difficulty);
    if (customForLevel.length && Math.random() < 0.34) {
      const w = fresh(customForLevel, taken, (x) => x)!;
      taken.add(w);
      return choice(w, difficulty, 'custom');
    }
    const pool = cats.flatMap((c) => WORDS[c][difficulty].map((word) => ({ word, c })));
    const item = fresh(pool, taken, (x) => x.word)!;
    taken.add(item.word);
    return choice(item.word, difficulty, item.c);
  });
}
