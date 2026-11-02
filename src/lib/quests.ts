// Daily quests, tracked in this browser. Three quests a day; "play 3 games" is always one of them.
import { readJson, writeJson } from './storage';

export type QuestId = 'play3' | 'guess5' | 'draw3' | 'duo' | 'speed' | 'random';
export type QuestEvent = 'gameFinished' | 'duoFinished' | 'speedFinished' | 'publicFinished' | 'guessed' | 'drew';

export interface QuestDef {
  id: QuestId;
  target: number;
  event: QuestEvent;
  emoji: string;
}

export const QUESTS: Record<QuestId, QuestDef> = {
  play3: { id: 'play3', target: 3, event: 'gameFinished', emoji: '🎮' },
  guess5: { id: 'guess5', target: 5, event: 'guessed', emoji: '💡' },
  draw3: { id: 'draw3', target: 3, event: 'drew', emoji: '✏️' },
  duo: { id: 'duo', target: 1, event: 'duoFinished', emoji: '👯' },
  speed: { id: 'speed', target: 1, event: 'speedFinished', emoji: '⚡' },
  random: { id: 'random', target: 1, event: 'publicFinished', emoji: '🌍' },
};

const ROTATING: QuestId[] = ['guess5', 'draw3', 'duo', 'speed', 'random'];
const KEY = 'doodlz:quests';

interface Stored {
  day: string;
  progress: Partial<Record<QuestId, number>>;
}

export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Same three quests for everyone on a given day, picked from a hash of the date. */
export function questsFor(day: string): QuestDef[] {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const a = ROTATING[h % ROTATING.length];
  const rest = ROTATING.filter((q) => q !== a);
  const b = rest[Math.floor(h / ROTATING.length) % rest.length];
  return [QUESTS.play3, QUESTS[a], QUESTS[b]];
}

export function loadProgress(): Stored {
  const s = readJson<Stored>(KEY, { day: today(), progress: {} });
  return s.day === today() ? s : { day: today(), progress: {} };
}

/** Count an event toward today's quests. */
export function recordQuestEvent(event: QuestEvent): void {
  const s = loadProgress();
  for (const q of questsFor(s.day)) {
    if (q.event === event) s.progress[q.id] = Math.min(q.target, (s.progress[q.id] ?? 0) + 1);
  }
  writeJson(KEY, s);
  window.dispatchEvent(new Event('doodlz:quests'));
}

export function msUntilReset(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}
