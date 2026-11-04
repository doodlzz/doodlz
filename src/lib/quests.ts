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

// Guesses and drawings made during a game wait here and only count once that game reaches the end screen.
// Kept per tab in sessionStorage so a refresh mid-game doesn't lose them.
const PENDING_KEY = 'doodlz:questsPending';

interface Pending {
  code: string;
  events: Partial<Record<QuestEvent, number>>;
}

function readPending(): Pending | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    return null;
  }
}

function writePending(p: Pending | null): void {
  try {
    if (p) sessionStorage.setItem(PENDING_KEY, JSON.stringify(p));
    else sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}

/** Remember an event from the game in room `code`; it counts only if that game finishes. */
export function holdQuestEvent(code: string, event: QuestEvent): void {
  const p = readPending();
  const cur = p?.code === code ? p : { code, events: {} };
  cur.events[event] = (cur.events[event] ?? 0) + 1;
  writePending(cur);
}

/** The game in room `code` finished: count everything held for it. */
export function commitHeldQuestEvents(code: string): void {
  const p = readPending();
  writePending(null);
  if (p?.code !== code) return;
  for (const [event, n] of Object.entries(p.events) as [QuestEvent, number][]) for (let i = 0; i < n; i++) recordQuestEvent(event);
}

/** Left early or a new game started: drop anything held. */
export function dropHeldQuestEvents(): void {
  writePending(null);
}

export function msUntilReset(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}
