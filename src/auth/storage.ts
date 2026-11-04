// Where the sign-in token and the guest choice are kept in the browser.

const TOKEN_KEY = 'doodlz:authToken';
const GUEST_KEY = 'doodlz:guest';

// "Remember me" keeps the sign-in in localStorage; otherwise it lives in sessionStorage and ends when the browser closes.
function store(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}
export function readToken(): string | null {
  try {
    return store('local')?.getItem(TOKEN_KEY) ?? store('session')?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}
export function writeToken(token: string | null, remember = true) {
  try {
    store('local')?.removeItem(TOKEN_KEY);
    store('session')?.removeItem(TOKEN_KEY);
    if (token) store(remember ? 'local' : 'session')?.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}
export function readGuest(): boolean {
  try {
    return store('local')?.getItem(GUEST_KEY) === '1';
  } catch {
    return false;
  }
}
export function writeGuest(on: boolean) {
  try {
    if (on) store('local')?.setItem(GUEST_KEY, '1');
    else store('local')?.removeItem(GUEST_KEY);
  } catch {
    // ignore
  }
}
