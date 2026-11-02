// Identity helpers kept in browser storage. Every access is wrapped: storage can be unavailable.

const DEVICE_KEY = 'doodlz:device';
const SESSION_KEY = 'doodlz:session';

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join('-');
}

let memoryDevice: string | null = null;

/** One id per browser (shared across tabs) so the server can stop one person filling a room with tabs. */
export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return (memoryDevice ??= randomId());
  }
}

export interface StoredSession {
  token: string;
  code: string;
}

/** Per-tab reconnection token (sessionStorage survives a refresh but not a new tab). */
export function loadSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(s: StoredSession | null): void {
  try {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
