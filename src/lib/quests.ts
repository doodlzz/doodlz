// Daily and weekly quests for guests, tracked in this browser. Signed-in players' quests are tracked by the
// server (ranked games only) and come with their account. Three quests a day ("play 3 games" is always one)
// and two a week.
import { questsFor, utcDay, utcWeek, weeklyQuestsFor, type QuestDef, type QuestEvent, type QuestId } from '../../shared/quests';
import { readJson, writeJson } from './storage';

export { msUntilReset, msUntilWeeklyReset, questsFor, weeklyQuestsFor, QUESTS } from '../../shared/quests';
export type { QuestDef, QuestEvent, QuestId } from '../../shared/quests';

const KEY = 'doodlz:quests';
const WEEK_KEY = 'doodlz:weeklyQuests';

type Progress = Partial<Record<QuestId, number>>;

interface Stored {
  day: string;
  progress: Progress;
}

interface StoredWeek {
  week: string;
  progress: Progress;
}

export function loadProgress(): Stored {
  const day = utcDay();
  const s = readJson<Stored>(KEY, { day, progress: {} });
  return s.day === day ? s : { day, progress: {} };
}

export function loadWeeklyProgress(): StoredWeek {
  const week = utcWeek();
  const s = readJson<StoredWeek>(WEEK_KEY, { week, progress: {} });
  return s.week === week ? s : { week, progress: {} };
}

function bump(quests: QuestDef[], progress: Progress, event: QuestEvent): void {
  for (const q of quests) {
    const id = q.id as QuestId;
    if (q.event === event) progress[id] = Math.min(q.target, (progress[id] ?? 0) + 1);
  }
}

/** Count an event toward today's and this week's quests. */
export function recordQuestEvent(event: QuestEvent): void {
  const d = loadProgress();
  bump(questsFor(d.day), d.progress, event);
  writeJson(KEY, d);
  const w = loadWeeklyProgress();
  bump(weeklyQuestsFor(w.week), w.progress, event);
  writeJson(WEEK_KEY, w);
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
