import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DailyProgress, RewardSummary } from '../../shared/quests';
import type { Avatar } from '../../shared/types';
import AuthModal, { type AuthMode } from './AuthModal';
import { readGuest, readToken, writeGuest, writeToken } from './storage';

export interface Account {
  id: string;
  username: string;
  tag: string;
  email: string;
  /** Saved face; `avatar.image` is their uploaded picture, if any. */
  avatar?: Avatar;
  /** Account points from ranked games and quests. */
  points: number;
  /** Today's game points and quest progress (from ranked games). */
  daily: DailyProgress;
}

export interface AccountChanges {
  username?: string;
  email?: string;
  newPassword?: string;
  currentPassword?: string;
  avatar?: Avatar;
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
  /** Upload a picture (data URL) or remove it with null. Returns an error key, or null on success. */
  setImage: (dataUrl: string | null) => Promise<string | null>;
  /** Sign out right away (the sign-out button asks first via open('logout')). */
  logout: () => void;
  /** Run `action` now if signed in or already chose guest; otherwise ask first, then run it. */
  requireAccount: (action: (account: Account | null) => void) => void;
  /** A ranked game paid out: update the shown points and quests. */
  applyReward: (r: RewardSummary) => void;
  /** Re-read the account from the server (e.g. after buying points). */
  refresh: () => Promise<Account | null>;
}

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [mode, setMode] = useState<AuthMode | null>(null);
  const pending = useRef<((account: Account | null) => void) | null>(null);

  const refresh = useCallback(async (): Promise<Account | null> => {
    const token = readToken();
    if (!token) return null;
    try {
      const r = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 401) writeToken(null);
      const data = r.ok ? ((await r.json()) as { account?: Account }) : null;
      if (data?.account) setAccount(data.account);
      return data?.account ?? null;
    } catch {
      return null;
    }
  }, []);

  // Restore a saved sign-in.
  useEffect(() => {
    refresh();
  }, [refresh]);

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
      setImage: async (dataUrl) => {
        const res = await api('avatar', { image: dataUrl }, readToken());
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
      refresh,
      applyReward: (r) => {
        if (r.total !== undefined && r.daily) setAccount((a) => a && { ...a, points: r.total!, daily: r.daily! });
      },
    }),
    [account, signedIn, refresh],
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
