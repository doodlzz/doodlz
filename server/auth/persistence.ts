// Where account data lives. The AccountStore keeps everything in memory and calls `save` after every
// change; a Persistence writes it somewhere durable.
//  - SupabasePersistence: Postgres tables over Supabase's REST API. Used when SUPABASE_URL and
//    SUPABASE_SERVICE_KEY are set (production: Render's own disk is wiped on every deploy).
//  - FilePersistence: JSON file + avatar files in DATA_DIR. Used for local development.
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export interface StoredAccount {
  id: string;
}
export interface StoredSessions {
  [token: string]: { accountId: string; createdAt: number };
}
export interface StoreData<A extends StoredAccount> {
  accounts: A[];
  sessions: StoredSessions;
}
export interface ImageData {
  ext: string;
  bytes: Buffer;
}

export interface Persistence {
  load<A extends StoredAccount>(): Promise<StoreData<A>>;
  /** Called after every change. Must not throw; it may write later. */
  save(store: StoreData<StoredAccount>): void;
  saveImage(accountId: string, ext: string, bytes: Buffer): Promise<void>;
  loadImage(accountId: string, ext: string): Promise<ImageData | null>;
  deleteImage(accountId: string, ext: string): Promise<void>;
  /** Wait until everything saved so far is written (used on shutdown). */
  flush(): Promise<void>;
}

// ---------------- local files ----------------

export class FilePersistence implements Persistence {
  constructor(private file: string) {}

  async load<A extends StoredAccount>(): Promise<StoreData<A>> {
    const empty: StoreData<A> = { accounts: [], sessions: {} };
    try {
      if (existsSync(this.file)) return { ...empty, ...JSON.parse(readFileSync(this.file, 'utf8')) };
    } catch (err) {
      console.error('Could not read accounts file, starting empty:', err);
    }
    return empty;
  }

  save(store: StoreData<StoredAccount>) {
    mkdirSync(path.dirname(this.file), { recursive: true });
    // Write to a temp file first so a crash mid-write can't corrupt the store.
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(store));
    renameSync(tmp, this.file);
  }

  private imageFile(id: string, ext: string) {
    return path.join(path.dirname(this.file), 'avatars', `${id}.${ext}`);
  }
  async saveImage(id: string, ext: string, bytes: Buffer) {
    const file = this.imageFile(id, ext);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
  }
  async loadImage(id: string, ext: string) {
    const file = this.imageFile(id, ext);
    return existsSync(file) ? { ext, bytes: readFileSync(file) } : null;
  }
  async deleteImage(id: string, ext: string) {
    rmSync(this.imageFile(id, ext), { force: true });
  }
  async flush() {}
}

// ---------------- Supabase ----------------

const PAGE = 1000; // PostgREST returns at most this many rows per request
const DEBOUNCE_MS = 250;

export class SupabasePersistence implements Persistence {
  private base: string;
  /** What is already in the database, as JSON, so only changes are sent. */
  private knownAccounts = new Map<string, string>();
  private knownSessions = new Map<string, string>();
  private latest: StoreData<StoredAccount> | null = null;
  private timer: NodeJS.Timeout | null = null;
  private chain: Promise<void> = Promise.resolve();

  constructor(
    url: string,
    private key: string,
  ) {
    this.base = `${url.replace(/\/$/, '')}/rest/v1`;
  }

  private async rest(pathAndQuery: string, init: RequestInit & { prefer?: string } = {}): Promise<Response> {
    const { prefer, ...rest } = init;
    const res = await fetch(`${this.base}/${pathAndQuery}`, {
      ...rest,
      headers: {
        apikey: this.key,
        // Legacy service_role keys are JWTs and go in Authorization too; new sb_secret_ keys go in `apikey` only.
        ...(this.key.startsWith('eyJ') ? { Authorization: `Bearer ${this.key}` } : {}),
        'Content-Type': 'application/json',
        ...(prefer ? { Prefer: prefer } : {}),
        ...(rest.headers as Record<string, string> | undefined),
      },
    });
    if (!res.ok) throw new Error(`Supabase ${init.method ?? 'GET'} ${pathAndQuery.split('?')[0]} failed: ${res.status} ${await res.text()}`);
    return res;
  }

  private async fetchAll<T>(table: string, select: string): Promise<T[]> {
    const rows: T[] = [];
    for (let from = 0; ; from += PAGE) {
      const res = await this.rest(`${table}?select=${select}&order=${table === 'sessions' ? 'token' : 'id'}`, { headers: { Range: `${from}-${from + PAGE - 1}` } });
      const page = (await res.json()) as T[];
      rows.push(...page);
      if (page.length < PAGE) return rows;
    }
  }

  async load<A extends StoredAccount>(): Promise<StoreData<A>> {
    const accounts = (await this.fetchAll<{ id: string; data: A }>('accounts', 'id,data')).map((r) => r.data);
    const sessionRows = await this.fetchAll<{ token: string; account_id: string; created_at: number }>('sessions', 'token,account_id,created_at');
    const sessions: StoredSessions = {};
    for (const s of sessionRows) sessions[s.token] = { accountId: s.account_id, createdAt: Number(s.created_at) };
    this.knownAccounts = new Map(accounts.map((a) => [a.id, JSON.stringify(a)]));
    this.knownSessions = new Map(Object.entries(sessions).map(([t, s]) => [t, JSON.stringify(s)]));
    return { accounts, sessions };
  }

  save(store: StoreData<StoredAccount>) {
    this.latest = store;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.chain = this.chain.then(() => this.sync()).catch((err) => console.error('Saving to Supabase failed (will retry on the next change):', err));
    }, DEBOUNCE_MS);
  }

  /** Send only what changed since the last successful sync. */
  private async sync() {
    const store = this.latest;
    if (!store) return;
    const accountJson = new Map(store.accounts.map((a) => [a.id, JSON.stringify(a)]));
    const sessionJson = new Map(Object.entries(store.sessions).map(([t, s]) => [t, JSON.stringify(s)]));

    const changedAccounts = store.accounts.filter((a) => this.knownAccounts.get(a.id) !== accountJson.get(a.id));
    const goneAccounts = [...this.knownAccounts.keys()].filter((id) => !accountJson.has(id));
    const changedSessions = Object.entries(store.sessions).filter(([t]) => this.knownSessions.get(t) !== sessionJson.get(t));
    const goneSessions = [...this.knownSessions.keys()].filter((t) => !sessionJson.has(t));

    // Accounts first, so a session never points at an account that isn't saved yet.
    for (let i = 0; i < changedAccounts.length; i += 200) {
      const batch = changedAccounts.slice(i, i + 200);
      await this.rest('accounts?on_conflict=id', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=minimal',
        body: JSON.stringify(batch.map((a) => ({ id: a.id, data: a, updated_at: new Date().toISOString() }))),
      });
      for (const a of batch) this.knownAccounts.set(a.id, accountJson.get(a.id)!);
    }
    for (let i = 0; i < changedSessions.length; i += 200) {
      const batch = changedSessions.slice(i, i + 200);
      await this.rest('sessions?on_conflict=token', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=minimal',
        body: JSON.stringify(batch.map(([token, s]) => ({ token, account_id: s.accountId, created_at: s.createdAt }))),
      });
      for (const [t] of batch) this.knownSessions.set(t, sessionJson.get(t)!);
    }
    await this.removeKeys('sessions', 'token', goneSessions, this.knownSessions);
    await this.removeKeys('accounts', 'id', goneAccounts, this.knownAccounts);
  }

  private async removeKeys(table: string, column: string, keys: string[], known: Map<string, string>) {
    for (let i = 0; i < keys.length; i += 50) {
      const batch = keys.slice(i, i + 50);
      const list = batch.map((k) => `"${k.replace(/"/g, '')}"`).join(',');
      await this.rest(`${table}?${column}=in.(${list})`, { method: 'DELETE', prefer: 'return=minimal' });
      for (const k of batch) known.delete(k);
    }
  }

  async saveImage(id: string, ext: string, bytes: Buffer) {
    await this.rest('account_images?on_conflict=account_id', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify({ account_id: id, ext, data: bytes.toString('base64') }),
    });
  }

  async loadImage(id: string, _ext: string) {
    const res = await this.rest(`account_images?account_id=eq.${encodeURIComponent(id)}&select=ext,data&limit=1`);
    const rows = (await res.json()) as { ext: string; data: string }[];
    return rows[0] ? { ext: rows[0].ext, bytes: Buffer.from(rows[0].data, 'base64') } : null;
  }

  async deleteImage(id: string, _ext: string) {
    await this.rest(`account_images?account_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', prefer: 'return=minimal' });
  }

  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.chain = this.chain.then(() => this.sync()).catch((err) => console.error('Saving to Supabase failed:', err));
    }
    await this.chain;
  }
}
