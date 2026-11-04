// Player accounts: username + email + password, stored in a JSON file on disk.
// Passwords are hashed with scrypt; sign-ins get a random session token.
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { isProfane } from '../moderation/profanity.js';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

interface Account {
  id: string;
  username: string;
  email: string;
  passHash: string; // "salt:hash", both hex
  createdAt: number;
}

interface Store {
  accounts: Account[];
  sessions: Record<string, { accountId: string; createdAt: number }>;
}

export interface PublicAccount {
  id: string;
  username: string;
  email: string;
}

export type AuthError =
  | 'auth.err.username'
  | 'auth.err.usernameTaken'
  | 'auth.err.email'
  | 'auth.err.emailTaken'
  | 'auth.err.password'
  | 'auth.err.badLogin'
  | 'auth.err.wrongPassword'
  | 'auth.err.session';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 90; // 90 days
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export class AccountStore {
  private store: Store;

  constructor(private file: string) {
    this.store = { accounts: [], sessions: {} };
    try {
      if (existsSync(file)) this.store = { ...this.store, ...JSON.parse(readFileSync(file, 'utf8')) };
    } catch (err) {
      console.error('Could not read accounts file, starting empty:', err);
    }
  }

  private save() {
    mkdirSync(path.dirname(this.file), { recursive: true });
    // Write to a temp file first so a crash mid-write can't corrupt the store.
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.store));
    renameSync(tmp, this.file);
  }

  private toPublic(a: Account): PublicAccount {
    return { id: a.id, username: a.username, email: a.email };
  }

  private newSession(accountId: string): string {
    const token = randomBytes(32).toString('hex');
    this.store.sessions[token] = { accountId, createdAt: Date.now() };
    return token;
  }

  private checkUsername(username: string, exceptId?: string): AuthError | null {
    if (!USERNAME_RE.test(username) || isProfane(username)) return 'auth.err.username';
    const lower = username.toLowerCase();
    if (this.store.accounts.some((a) => a.id !== exceptId && a.username.toLowerCase() === lower)) return 'auth.err.usernameTaken';
    return null;
  }

  private checkEmail(email: string, exceptId?: string): AuthError | null {
    if (email.length > 254 || !EMAIL_RE.test(email)) return 'auth.err.email';
    if (this.store.accounts.some((a) => a.id !== exceptId && a.email === email)) return 'auth.err.emailTaken';
    return null;
  }

  private static validPassword = (pw: string) => pw.length >= 6 && pw.length <= 128;

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const hash = await scrypt(password, salt, 64);
    return `${salt.toString('hex')}:${hash.toString('hex')}`;
  }

  async register(rawUsername: unknown, rawEmail: unknown, rawPassword: unknown): Promise<{ token: string; account: PublicAccount } | { error: AuthError }> {
    const username = String(rawUsername ?? '').trim();
    const email = String(rawEmail ?? '').trim().toLowerCase();
    const password = String(rawPassword ?? '');
    const bad = this.checkUsername(username) ?? this.checkEmail(email) ?? (AccountStore.validPassword(password) ? null : 'auth.err.password');
    if (bad) return { error: bad };

    const account: Account = { id: randomBytes(12).toString('hex'), username, email, passHash: await this.hashPassword(password), createdAt: Date.now() };
    this.store.accounts.push(account);
    const token = this.newSession(account.id);
    this.save();
    return { token, account: this.toPublic(account) };
  }

  /** `login` can be the username or the email. */
  async login(rawLogin: unknown, rawPassword: unknown): Promise<{ token: string; account: PublicAccount } | { error: AuthError }> {
    const login = String(rawLogin ?? '').trim().toLowerCase();
    const password = String(rawPassword ?? '');
    const account = this.store.accounts.find((a) => a.email === login || a.username.toLowerCase() === login);
    if (!account || !(await this.checkPassword(account, password))) return { error: 'auth.err.badLogin' };
    const token = this.newSession(account.id);
    this.pruneSessions();
    this.save();
    return { token, account: this.toPublic(account) };
  }

  private async checkPassword(account: Account, password: string): Promise<boolean> {
    const [saltHex, hashHex] = account.passHash.split(':');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
    return timingSafeEqual(expected, actual);
  }

  private accountFor(token: string | undefined): Account | null {
    if (!token) return null;
    const s = this.store.sessions[token];
    if (!s || Date.now() - s.createdAt > SESSION_TTL_MS) return null;
    return this.store.accounts.find((a) => a.id === s.accountId) ?? null;
  }

  fromToken(token: string | undefined): PublicAccount | null {
    const account = this.accountFor(token);
    return account ? this.toPublic(account) : null;
  }

  /** Change username, email and/or password. Email and password changes need the current password. */
  async update(
    token: string | undefined,
    changes: { username?: unknown; email?: unknown; newPassword?: unknown; currentPassword?: unknown },
  ): Promise<{ account: PublicAccount } | { error: AuthError }> {
    const account = this.accountFor(token);
    if (!account) return { error: 'auth.err.session' };
    const username = changes.username === undefined ? undefined : String(changes.username).trim();
    const email = changes.email === undefined ? undefined : String(changes.email).trim().toLowerCase();
    const newPassword = changes.newPassword === undefined ? undefined : String(changes.newPassword);

    if (username !== undefined && username !== account.username) {
      const bad = this.checkUsername(username, account.id);
      if (bad) return { error: bad };
    }
    const emailChanged = email !== undefined && email !== account.email;
    if (emailChanged) {
      const bad = this.checkEmail(email, account.id);
      if (bad) return { error: bad };
    }
    if (newPassword !== undefined && !AccountStore.validPassword(newPassword)) return { error: 'auth.err.password' };
    if ((emailChanged || newPassword !== undefined) && !(await this.checkPassword(account, String(changes.currentPassword ?? '')))) {
      return { error: 'auth.err.wrongPassword' };
    }

    if (username !== undefined) account.username = username;
    if (emailChanged) account.email = email;
    if (newPassword !== undefined) {
      account.passHash = await this.hashPassword(newPassword);
      // Sign out every other device after a password change.
      for (const [t, s] of Object.entries(this.store.sessions)) if (s.accountId === account.id && t !== token) delete this.store.sessions[t];
    }
    this.save();
    return { account: this.toPublic(account) };
  }

  logout(token: string | undefined) {
    if (token && this.store.sessions[token]) {
      delete this.store.sessions[token];
      this.save();
    }
  }

  private pruneSessions() {
    const now = Date.now();
    for (const [token, s] of Object.entries(this.store.sessions)) if (now - s.createdAt > SESSION_TTL_MS) delete this.store.sessions[token];
  }
}
