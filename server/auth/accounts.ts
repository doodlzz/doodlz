// Player accounts: username + email + password, stored in a JSON file on disk.
// Passwords are hashed with scrypt; sign-ins get a random session token.
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { randomTag, TAG_RE } from '../../shared/tag.js';
import { AVATAR_PARTS_MEMBER, type Avatar } from '../../shared/types.js';
import { isProfane } from '../moderation/profanity.js';
import { sanitizeAvatar } from '../util/sanitize.js';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

interface Account {
  id: string;
  username: string;
  tag: string; // 4 digits; username + tag is unique
  email: string;
  passHash: string; // "salt:hash", both hex
  createdAt: number;
  avatar?: Avatar; // saved face (no image)
  image?: { ext: ImageExt; version: number }; // uploaded picture, stored as a file
}

type ImageExt = 'png' | 'jpg' | 'webp';
const IMAGE_TYPES: Record<ImageExt, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
const MAX_IMAGE_BYTES = 200 * 1024;

interface Store {
  accounts: Account[];
  sessions: Record<string, { accountId: string; createdAt: number }>;
}

export interface PublicAccount {
  id: string;
  username: string;
  tag: string;
  email: string;
  /** Saved face; `image` is set when they uploaded a picture. */
  avatar?: Avatar;
}

export type AuthError =
  | 'auth.err.username'
  | 'auth.err.usernameTaken'
  | 'auth.err.email'
  | 'auth.err.emailTaken'
  | 'auth.err.password'
  | 'auth.err.badLogin'
  | 'auth.err.wrongPassword'
  | 'auth.err.needTag'
  | 'auth.err.image'
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
    // Accounts made before tags existed get one now.
    let changed = false;
    for (const a of this.store.accounts) {
      if (!a.tag || !TAG_RE.test(a.tag)) {
        a.tag = this.freeTag(a.username, a.id) ?? randomTag();
        changed = true;
      }
    }
    if (changed) this.save();
  }

  private sameName(username: string, exceptId?: string): Account[] {
    const lower = username.toLowerCase();
    return this.store.accounts.filter((a) => a.id !== exceptId && a.username.toLowerCase() === lower);
  }

  /** A random tag no other account with this username uses, or null if all 9999 are gone. */
  private freeTag(username: string, exceptId?: string, prefer?: string): string | null {
    const used = new Set(this.sameName(username, exceptId).map((a) => a.tag));
    if (prefer && !used.has(prefer)) return prefer;
    if (used.size >= 9999) return null;
    for (;;) {
      const t = randomTag();
      if (!used.has(t)) return t;
    }
  }

  /** Is "username#tag" owned by a registered account? (Guests can't take it.) */
  isRegistered(username: string, tag: string): boolean {
    return this.sameName(username).some((a) => a.tag === tag);
  }

  /** Signed-in player's name, tag and picture URL for a session token. */
  identity(token: unknown): { username: string; tag: string; image?: string } | null {
    const a = typeof token === 'string' ? this.accountFor(token) : null;
    return a ? { username: a.username, tag: a.tag, image: this.imageUrl(a) } : null;
  }

  private imageUrl(a: Account): string | undefined {
    return a.image ? `/api/auth/avatar/${a.id}?v=${a.image.version}` : undefined;
  }

  private avatarOf(a: Account): Avatar | undefined {
    const image = this.imageUrl(a);
    if (!a.avatar && !image) return undefined;
    return { ...(a.avatar ?? { color: '#f472b6', eyes: 0, mouth: 0, accessory: 0 }), ...(image ? { image } : {}) };
  }

  private imagePath(a: Account): string | null {
    return a.image ? path.join(path.dirname(this.file), 'avatars', `${a.id}.${a.image.ext}`) : null;
  }

  /** Save an uploaded picture (a data: URL of a PNG, JPEG or WebP), or remove it with null. */
  setImage(token: string | undefined, dataUrl: unknown): { account: PublicAccount } | { error: AuthError } {
    const account = this.accountFor(token);
    if (!account) return { error: 'auth.err.session' };
    const old = this.imagePath(account);
    if (dataUrl === null) {
      if (old) rmSync(old, { force: true });
      account.image = undefined;
      this.save();
      return { account: this.toPublic(account) };
    }
    const m = typeof dataUrl === 'string' ? /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl) : null;
    if (!m) return { error: 'auth.err.image' };
    const bytes = Buffer.from(m[2], 'base64');
    const ext: ImageExt = m[1] === 'jpeg' ? 'jpg' : (m[1] as ImageExt);
    // Check the file really is that kind of image, not something else with an image label.
    const magic =
      ext === 'png'
        ? bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
        : ext === 'jpg'
          ? bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
          : bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP';
    if (!magic || bytes.length > MAX_IMAGE_BYTES) return { error: 'auth.err.image' };

    if (old) rmSync(old, { force: true });
    // A fresh version each upload, so browsers never show a cached older picture.
    account.image = { ext, version: Date.now() };
    const file = this.imagePath(account)!;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
    this.save();
    return { account: this.toPublic(account) };
  }

  /** File and content type of an account's picture, for serving it. */
  imageFile(id: string): { file: string; type: string } | null {
    const a = this.store.accounts.find((x) => x.id === id);
    const file = a ? this.imagePath(a) : null;
    return a?.image && file && existsSync(file) ? { file: path.resolve(file), type: IMAGE_TYPES[a.image.ext] } : null;
  }

  private save() {
    mkdirSync(path.dirname(this.file), { recursive: true });
    // Write to a temp file first so a crash mid-write can't corrupt the store.
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.store));
    renameSync(tmp, this.file);
  }

  private toPublic(a: Account): PublicAccount {
    return { id: a.id, username: a.username, tag: a.tag, email: a.email, avatar: this.avatarOf(a) };
  }

  private newSession(accountId: string): string {
    const token = randomBytes(32).toString('hex');
    this.store.sessions[token] = { accountId, createdAt: Date.now() };
    return token;
  }

  private checkUsername(username: string): AuthError | null {
    if (!USERNAME_RE.test(username) || isProfane(username)) return 'auth.err.username';
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
    const tag = this.freeTag(username);
    if (!tag) return { error: 'auth.err.usernameTaken' };

    const account: Account = { id: randomBytes(12).toString('hex'), username, tag, email, passHash: await this.hashPassword(password), createdAt: Date.now() };
    this.store.accounts.push(account);
    const token = this.newSession(account.id);
    this.save();
    return { token, account: this.toPublic(account) };
  }

  /** `login` can be the email, "name#1234", or just the name when only one account has it. */
  async login(rawLogin: unknown, rawPassword: unknown): Promise<{ token: string; account: PublicAccount } | { error: AuthError }> {
    const login = String(rawLogin ?? '').trim().toLowerCase();
    const password = String(rawPassword ?? '');
    let account: Account | undefined;
    const tagged = /^(.+)#(\d{4})$/.exec(login);
    if (login.includes('@')) account = this.store.accounts.find((a) => a.email === login);
    else if (tagged) account = this.sameName(tagged[1]).find((a) => a.tag === tagged[2]);
    else {
      const matches = this.sameName(login);
      if (matches.length > 1) return { error: 'auth.err.needTag' };
      account = matches[0];
    }
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
    changes: { username?: unknown; email?: unknown; newPassword?: unknown; currentPassword?: unknown; avatar?: unknown },
  ): Promise<{ account: PublicAccount } | { error: AuthError }> {
    const account = this.accountFor(token);
    if (!account) return { error: 'auth.err.session' };
    const username = changes.username === undefined ? undefined : String(changes.username).trim();
    const email = changes.email === undefined ? undefined : String(changes.email).trim().toLowerCase();
    const newPassword = changes.newPassword === undefined ? undefined : String(changes.newPassword);

    let newTag = account.tag;
    if (username !== undefined && username !== account.username) {
      const bad = this.checkUsername(username);
      if (bad) return { error: bad };
      // Keep the current tag if nobody with the new name has it; otherwise pick a new one.
      const tag = this.freeTag(username, account.id, account.tag);
      if (!tag) return { error: 'auth.err.usernameTaken' };
      newTag = tag;
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

    if (changes.avatar !== undefined) account.avatar = sanitizeAvatar(changes.avatar, AVATAR_PARTS_MEMBER);
    if (username !== undefined) {
      account.username = username;
      account.tag = newTag;
    }
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
