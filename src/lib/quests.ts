// Daily quests for guests, tracked in this browser. Signed-in players' quests are tracked by the server
// (ranked games only) and come with their account. Three quests a day; "play 3 games" is always one of them.
import { questsFor, utcDay, type QuestEvent, type QuestId } from '../../shared/quests';
import { readJson, writeJson } from './storage';

export { msUntilReset, questsFor, QUESTS } from '../../shared/quests';
export type { QuestDef, QuestEvent, QuestId } from '../../shared/quests';

const KEY = 'doodlz:quests';

interface Stored {
  day: string;
  progress: Partial<Record<QuestId, number>>;
}

const today = () => utcDay();

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
