import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AuthModal, { type AuthMode } from './AuthModal';

export interface Account {
  id: string;
  username: string;
  email: string;
}

export interface AccountChanges {
  username?: string;
  email?: string;
  newPassword?: string;
  currentPassword?: string;
}

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
function readToken(): string | null {
  try {
    return store('local')?.getItem(TOKEN_KEY) ?? store('session')?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}
function writeToken(token: string | null, remember = true) {
  try {
    store('local')?.removeItem(TOKEN_KEY);
    store('session')?.removeItem(TOKEN_KEY);
    if (token) store(remember ? 'local' : 'session')?.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}
function readGuest(): boolean {
  try {
    return store('local')?.getItem(GUEST_KEY) === '1';
  } catch {
    return false;
  }
}
function writeGuest(on: boolean) {
  try {
    if (on) store('local')?.setItem(GUEST_KEY, '1');
    else store('local')?.removeItem(GUEST_KEY);
  } catch {
    // ignore
  }
}

type ApiResult = { token?: string; account?: Account; error?: string };

async function api(path: string, body: unknown, token?: string | null): Promise<ApiResult> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`/api/auth/${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    return await res.json();
  } catch {
    return { error: 'auth.err.network' };
  }
}

interface Ctx {
  account: Account | null;
  /** Show a dialog: register, sign in, account settings or the sign-out confirmation. */
  open: (mode: AuthMode) => void;
  register: (username: string, email: string, password: string, remember: boolean) => Promise<string | null>;
  login: (login: string, password: string, remember: boolean) => Promise<string | null>;
  /** Returns an error key, or null on success. */
  updateAccount: (changes: AccountChanges) => Promise<string | null>;
  /** Sign out right away (the sign-out button asks first via open('logout')). */
  logout: () => void;
  /** Run `action` now if signed in or already chose guest; otherwise ask first, then run it. */
  requireAccount: (action: (account: Account | null) => void) => void;
}

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [mode, setMode] = useState<AuthMode | null>(null);
  const pending = useRef<((account: Account | null) => void) | null>(null);

  // Restore a saved sign-in.
  useEffect(() => {
    const token = readToken();
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : r.status === 401 ? (writeToken(null), null) : null))
      .then((data) => data?.account && setAccount(data.account))
      .catch(() => {});
  }, []);

  const finish = useCallback((acc: Account | null) => {
    setMode(null);
    const next = pending.current;
    pending.current = null;
    next?.(acc);
  }, []);

  const signedIn = useCallback(
    (res: ApiResult, remember: boolean) => {
      if (!res.token || !res.account) return res.error ?? 'auth.err.network';
      writeToken(res.token, remember);
      setAccount(res.account);
      finish(res.account);
      return null;
    },
    [finish],
  );

  const value = useMemo<Ctx>(
    () => ({
      account,
      open: (m) => {
        pending.current = null;
        setMode(m);
      },
      register: async (username, email, password, remember) => signedIn(await api('register', { username, email, password }), remember),
      login: async (login, password, remember) => signedIn(await api('login', { login, password }), remember),
      updateAccount: async (changes) => {
        const res = await api('account', changes, readToken());
        if (!res.account) return res.error ?? 'auth.err.network';
        setAccount(res.account);
        return null;
      },
      logout: () => {
        const token = readToken();
        if (token) fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        writeToken(null);
        writeGuest(false);
        setAccount(null);
        setMode(null);
      },
      requireAccount: (action) => {
        if (account || readGuest()) return action(account);
        pending.current = action;
        setMode('gate');
      },
    }),
    [account, signedIn],
  );

  return (
    <AuthCtx.Provider value={value}>
      {children}
      {mode && (
        <AuthModal
          mode={mode}
          setMode={setMode}
          onClose={() => {
            pending.current = null;
            setMode(null);
          }}
          onGuest={() => {
            writeGuest(true);
            finish(null);
          }}
        />
      )}
    </AuthCtx.Provider>
  );
}

export function useAuth(): Ctx {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
