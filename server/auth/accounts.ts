// Player accounts: username + email + password, stored in a JSON file on disk.
// Passwords are hashed with scrypt; sign-ins get a random session token.
import { createHash, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { randomTag, TAG_RE } from '../../shared/tag.js';
import { findCosmetic, isFrame, isNameFx, type Equipped } from '../../shared/cosmetics.js';
import { FRIEND_LIMITS, type FriendError, type FriendRequestInfo } from '../../shared/friends.js';
import { CASUAL_XP, LEVEL_UP_POINTS, levelOf } from '../../shared/levels.js';
import { emptyDaily, emptyWeekly, POINTS, questsFor, utcDay, utcWeek, weeklyQuestsFor, type DailyProgress, type QuestDef, type QuestEvent, type QuestId, type WeeklyProgress } from '../../shared/quests.js';
import { AVATAR_PARTS_MEMBER, type Avatar } from '../../shared/types.js';
import { mailEnabled, sendMail, verificationEmail } from '../mail/mailer.js';
import { isProfane } from '../moderation/profanity.js';
import { sanitizeAvatar } from '../util/sanitize.js';
import type { Persistence } from './persistence.js';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

interface Account {
  id: string;
  username: string;
  tag: string; // 4 digits; username + tag is unique
  email: string;
  passHash: string; // "salt:hash", both hex
  createdAt: number;
  emailVerified?: boolean; // set once they enter the code we emailed (only enforced when email sending is configured)
  verify?: { hash: string; expires: number; attempts: number; sentAt: number }; // the pending code, hashed
  consentAt?: number; // when they accepted the Terms and Privacy Policy and confirmed they are 13 or older
  avatar?: Avatar; // saved face (no image)
  image?: { ext: ImageExt; version: number }; // uploaded picture, stored as a file
  points?: number; // point balance: earned from ranked games and quests, plus bought
  boughtPoints?: number; // lifetime points bought (so earned points can be told apart later)
  purchases?: Purchase[];
  earnedPoints?: number; // lifetime points earned from games and quests (for leaderboards)
  xp?: number; // level XP; accounts from before levels start at their earnedPoints
  owned?: string[]; // cosmetic ids bought with points
  equipped?: Equipped;
  friends?: string[]; // account ids
  friendIn?: string[]; // requests received
  friendOut?: string[]; // requests sent
  dmRead?: Record<string, number>; // friend id -> time their messages were last read
  daily?: DailyProgress; // today's game points and quest progress
  weekly?: WeeklyProgress; // this week's quest progress
}

interface Purchase {
  id: string; // Stripe Checkout session id; each one is credited once
  pack: string;
  points: number;
  cents: number;
  at: number;
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
  /** False until they confirm the code emailed to them. Always true when email sending isn't configured. */
  emailVerified: boolean;
  /** Saved face; `image` is set when they uploaded a picture. */
  avatar?: Avatar;
  points: number;
  xp: number;
  daily: DailyProgress;
  weekly: WeeklyProgress;
  owned: string[];
  equipped: Equipped;
}

export type ShopError = 'shop.notFound' | 'shop.owned' | 'shop.notEnough' | 'shop.notOwned' | 'shop.needUnlock';

/** What one ranked game earned a player, before the daily limits. */
export interface GameEarnings {
  points: number;
  events: Partial<Record<QuestEvent, number>>;
}

export type AuthError =
  | 'auth.err.username'
  | 'auth.err.usernameTaken'
  | 'auth.err.email'
  | 'auth.err.consent'
  | 'auth.err.emailTaken'
  | 'auth.err.password'
  | 'auth.err.badLogin'
  | 'auth.err.wrongPassword'
  | 'auth.err.needTag'
  | 'auth.err.image'
  | 'auth.err.code'
  | 'auth.err.codeExpired'
  | 'auth.err.wait'
  | 'auth.err.mailFailed'
  | 'auth.err.unverified'
  | 'auth.err.session';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 90; // 90 days
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export class AccountStore {
  private store: Store;

  constructor(private persistence: Persistence) {
    this.store = { accounts: [], sessions: {} };
  }

  /** Load saved accounts. Call once at startup, before serving requests. */
  async init() {
    this.store = { ...this.store, ...(await this.persistence.load<Account>()) };
    // Accounts made before tags existed get one now.
    let changed = false;
    for (const a of this.store.accounts) {
      // Pictures became a paid unlock; anyone who already uploaded one keeps it.
      if (a.image && !a.owned?.includes('pic-upload')) {
        a.owned = [...(a.owned ?? []), 'pic-upload'];
        changed = true;
      }
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

  /** Signed-in player's name, tag, picture URL and equipped cosmetics for a session token. */
  identity(token: unknown): { username: string; tag: string; image?: string; equipped: Equipped; level: number } | null {
    const a = typeof token === 'string' ? this.accountFor(token) : null;
    return a ? { username: a.username, tag: a.tag, image: this.imageUrl(a), equipped: { ...a.equipped }, level: levelOf(this.xpOf(a)) } : null;
  }

  private owns = (a: Account, id: string) => a.owned?.includes(id) ?? false;

  /** Spend points on a cosmetic. Frames and name effects are equipped right away. */
  buy(token: string | undefined, itemId: unknown): { account: PublicAccount } | { error: AuthError | ShopError } {
    const a = this.accountFor(token);
    if (!a) return { error: 'auth.err.session' };
    const item = findCosmetic(itemId);
    if (!item) return { error: 'shop.notFound' };
    if (this.owns(a, item.id)) return { error: 'shop.owned' };
    if ((a.points ?? 0) < item.price) return { error: 'shop.notEnough' };
    a.points = (a.points ?? 0) - item.price;
    a.owned = [...(a.owned ?? []), item.id];
    if (item.slot === 'frame' || item.slot === 'nameFx') a.equipped = { ...a.equipped, [item.slot]: item.value };
    this.save();
    return { account: this.toPublic(a) };
  }

  /** Put on (or take off, with null) an owned frame or name effect. */
  equip(token: string | undefined, slot: unknown, itemId: unknown): { account: PublicAccount } | { error: AuthError | ShopError } {
    const a = this.accountFor(token);
    if (!a) return { error: 'auth.err.session' };
    if (slot !== 'frame' && slot !== 'nameFx') return { error: 'shop.notFound' };
    if (itemId === null) {
      const next = { ...a.equipped };
      delete next[slot];
      a.equipped = next;
    } else {
      const item = findCosmetic(itemId);
      if (!item || item.slot !== slot) return { error: 'shop.notFound' };
      if (!this.owns(a, item.id)) return { error: 'shop.notOwned' };
      if ((slot === 'frame' && !isFrame(item.value)) || (slot === 'nameFx' && !isNameFx(item.value))) return { error: 'shop.notFound' };
      a.equipped = { ...a.equipped, [slot]: item.value };
    }
    this.save();
    return { account: this.toPublic(a) };
  }

  private imageUrl(a: Account): string | undefined {
    return a.image ? `/api/auth/avatar/${a.id}?v=${a.image.version}` : undefined;
  }

  private avatarOf(a: Account): Avatar | undefined {
    const image = this.imageUrl(a);
    if (!a.avatar && !image) return undefined;
    return { ...(a.avatar ?? { color: '#f472b6', eyes: 0, mouth: 0, accessory: 0 }), ...(image ? { image } : {}) };
  }

  /** Save an uploaded picture (a data: URL of a PNG, JPEG or WebP), or remove it with null. */
  async setImage(token: string | undefined, dataUrl: unknown): Promise<{ account: PublicAccount } | { error: AuthError | ShopError }> {
    const account = this.accountFor(token);
    if (!account) return { error: 'auth.err.session' };
    // Setting a picture needs one of the picture unlocks (removing it never does).
    if (dataUrl !== null && !this.owns(account, 'pic-upload') && !this.owns(account, 'pic-draw')) return { error: 'shop.needUnlock' };
    const old = account.image;
    if (dataUrl === null) {
      if (old) await this.persistence.deleteImage(account.id, old.ext);
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

    // Write the picture first; only then point the account at it.
    await this.persistence.saveImage(account.id, ext, bytes);
    if (old && old.ext !== ext) await this.persistence.deleteImage(account.id, old.ext);
    // A fresh version each upload, so browsers never show a cached older picture.
    account.image = { ext, version: Date.now() };
    this.save();
    return { account: this.toPublic(account) };
  }

  /** An account's picture and its content type, for serving it. */
  async imageData(id: string): Promise<{ bytes: Buffer; type: string } | null> {
    const a = this.store.accounts.find((x) => x.id === id);
    if (!a?.image) return null;
    const found = await this.persistence.loadImage(a.id, a.image.ext);
    return found ? { bytes: found.bytes, type: IMAGE_TYPES[a.image.ext] } : null;
  }

  /** Wait for everything to be written (on shutdown). */
  flush() {
    return this.persistence.flush();
  }

  private save() {
    this.persistence.save(this.store);
  }

  private toPublic(a: Account): PublicAccount {
    return {
      id: a.id,
      username: a.username,
      tag: a.tag,
      email: a.email,
      emailVerified: this.isVerified(a),
      avatar: this.avatarOf(a),
      points: a.points ?? 0,
      xp: this.xpOf(a),
      daily: this.dailyOf(a),
      weekly: this.weeklyOf(a),
      owned: a.owned ?? [],
      equipped: a.equipped ?? {},
    };
  }

  private isVerified(a: Account) {
    return !mailEnabled() || a.emailVerified === true;
  }

  /** True when this sign-in belongs to an account whose email is confirmed (or confirmation isn't required). */
  verifiedToken(token: string | undefined): boolean {
    const a = this.accountFor(token);
    return a ? this.isVerified(a) : false;
  }

  private static codeHash(accountId: string, code: string) {
    return createHash('sha256').update(`${accountId}:${code}`).digest('hex');
  }

  /** Make a fresh 6-digit code and email it. Returns false if the email could not be sent. */
  private async sendCode(a: Account): Promise<boolean> {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    a.verify = { hash: AccountStore.codeHash(a.id, code), expires: Date.now() + 15 * 60_000, attempts: 0, sentAt: Date.now() };
    this.save();
    const mail = verificationEmail(a.username, code);
    return sendMail(a.email, mail.subject, mail.html, mail.text);
  }

  /** Email a new code (at most one a minute). */
  async resendCode(token: string | undefined): Promise<{ ok: true } | { error: AuthError }> {
    const a = this.accountFor(token);
    if (!a) return { error: 'auth.err.session' };
    if (this.isVerified(a)) return { ok: true };
    if (a.verify && Date.now() - a.verify.sentAt < 60_000) return { error: 'auth.err.wait' };
    return (await this.sendCode(a)) ? { ok: true } : { error: 'auth.err.mailFailed' };
  }

  /** Check the code from the email. Five wrong tries burn the code. */
  verifyEmail(token: string | undefined, rawCode: unknown): { account: PublicAccount } | { error: AuthError } {
    const a = this.accountFor(token);
    if (!a) return { error: 'auth.err.session' };
    if (this.isVerified(a)) return { account: this.toPublic(a) };
    const code = String(rawCode ?? '').replace(/\s/g, '');
    const v = a.verify;
    if (!v || Date.now() > v.expires || v.attempts >= 5) return { error: 'auth.err.codeExpired' };
    v.attempts++;
    const ok = /^\d{6}$/.test(code) && timingSafeEqual(Buffer.from(v.hash), Buffer.from(AccountStore.codeHash(a.id, code)));
    if (!ok) {
      this.save();
      return { error: 'auth.err.code' };
    }
    a.emailVerified = true;
    delete a.verify;
    this.save();
    return { account: this.toPublic(a) };
  }

  /** Today's progress (a fresh one once the UTC day changes). */
  private dailyOf(a: Account): DailyProgress {
    return a.daily?.day === utcDay() ? a.daily : emptyDaily();
  }

  // ---------------- friends ----------------

  /** Set by the friends service: forget a deleted account's conversations. */
  onDeleted?: (accountId: string) => void;

  private byId(id: string): Account | undefined {
    return this.store.accounts.find((x) => x.id === id);
  }

  /** How other players see this account: name#tag, look and level. */
  publicCard(id: string): FriendRequestInfo | null {
    const a = this.byId(id);
    if (!a) return null;
    const avatar = { ...(this.avatarOf(a) ?? { color: '#f472b6', eyes: 0, mouth: 0, accessory: 0 }), ...a.equipped, level: levelOf(this.xpOf(a)) };
    return { id: a.id, name: `${a.username}#${a.tag}`, avatar };
  }

  /** Account id for "name#1234" (case-insensitive), or null. */
  findByNameTag(nameTag: string): string | null {
    const m = /^(.+)#(\d{4})$/.exec(nameTag.trim());
    if (!m) return null;
    return this.sameName(m[1]).find((a) => a.tag === m[2])?.id ?? null;
  }

  friendLists(id: string): { friends: string[]; incoming: string[]; outgoing: string[]; read: Record<string, number> } {
    const a = this.byId(id);
    return { friends: a?.friends ?? [], incoming: a?.friendIn ?? [], outgoing: a?.friendOut ?? [], read: a?.dmRead ?? {} };
  }

  areFriends(a: string, b: string): boolean {
    return this.byId(a)?.friends?.includes(b) ?? false;
  }

  /** Send a request, or accept theirs if they already asked. */
  requestFriend(fromId: string, toId: string): { accepted: boolean } | { error: FriendError } {
    const from = this.byId(fromId);
    const to = this.byId(toId);
    if (!from || !to) return { error: 'friends.err.notFound' };
    if (fromId === toId) return { error: 'friends.err.self' };
    if (from.friends?.includes(toId)) return { error: 'friends.err.already' };
    if (from.friendIn?.includes(toId)) {
      this.respondFriend(fromId, toId, true);
      return { accepted: true };
    }
    if (from.friendOut?.includes(toId)) return { error: 'friends.err.pending' };
    if ((from.friends?.length ?? 0) >= FRIEND_LIMITS.friends || (to.friends?.length ?? 0) >= FRIEND_LIMITS.friends) return { error: 'friends.err.limit' };
    if ((from.friendOut?.length ?? 0) >= FRIEND_LIMITS.pending || (to.friendIn?.length ?? 0) >= FRIEND_LIMITS.pending) return { error: 'friends.err.limit' };
    from.friendOut = [...(from.friendOut ?? []), toId];
    to.friendIn = [...(to.friendIn ?? []), fromId];
    this.save();
    return { accepted: false };
  }

  /** Accept or decline a request `otherId` sent to `meId`. */
  respondFriend(meId: string, otherId: string, accept: boolean): boolean {
    const me = this.byId(meId);
    const other = this.byId(otherId);
    if (!me || !me.friendIn?.includes(otherId)) return false;
    me.friendIn = me.friendIn.filter((x) => x !== otherId);
    if (other) other.friendOut = (other.friendOut ?? []).filter((x) => x !== meId);
    if (accept && other) {
      me.friends = [...new Set([...(me.friends ?? []), otherId])];
      other.friends = [...new Set([...(other.friends ?? []), meId])];
    }
    this.save();
    return true;
  }

  cancelFriendRequest(meId: string, otherId: string): void {
    const me = this.byId(meId);
    const other = this.byId(otherId);
    if (me) me.friendOut = (me.friendOut ?? []).filter((x) => x !== otherId);
    if (other) other.friendIn = (other.friendIn ?? []).filter((x) => x !== meId);
    this.save();
  }

  removeFriend(meId: string, otherId: string): void {
    const me = this.byId(meId);
    const other = this.byId(otherId);
    if (me) me.friends = (me.friends ?? []).filter((x) => x !== otherId);
    if (other) other.friends = (other.friends ?? []).filter((x) => x !== meId);
    this.save();
  }

  markRead(meId: string, friendId: string, ts: number): void {
    const me = this.byId(meId);
    if (!me || (me.dmRead?.[friendId] ?? 0) >= ts) return;
    me.dmRead = { ...me.dmRead, [friendId]: ts };
    this.save();
  }

  loadThreads() {
    return this.persistence.loadThreads();
  }

  saveThread(key: string, messages: unknown[]) {
    this.persistence.saveThread(key, messages);
  }

  private xpOf(a: Account): number {
    return a.xp ?? a.earnedPoints ?? 0;
  }

  /** Add XP; each level gained pays LEVEL_UP_POINTS shop points. Returns those bonus points. */
  private addXp(a: Account, xp: number): number {
    const before = levelOf(this.xpOf(a));
    a.xp = this.xpOf(a) + xp;
    const bonus = (levelOf(a.xp) - before) * LEVEL_UP_POINTS;
    a.points = (a.points ?? 0) + bonus;
    return bonus;
  }

  /**
   * XP for a finished game that doesn't earn points (private rooms, or public ones without enough signed-in
   * players): one per turn really played, capped per game and per day. Never gives shop points (except level-ups).
   */
  awardCasualXp(accountId: string, turns: number) {
    const a = this.store.accounts.find((x) => x.id === accountId);
    if (!a) return null;
    const daily = this.dailyOf(a);
    const xpGained = Math.max(0, Math.min(turns, CASUAL_XP.perGame, CASUAL_XP.perDay - (daily.casualXp ?? 0)));
    daily.casualXp = (daily.casualXp ?? 0) + xpGained;
    a.daily = daily;
    const levelPoints = this.addXp(a, xpGained);
    this.save();
    return { xpGained, xp: this.xpOf(a), levelPoints, total: a.points ?? 0, daily, weekly: this.weeklyOf(a) };
  }

  /** This week's progress (a fresh one each Monday, UTC). */
  private weeklyOf(a: Account): WeeklyProgress {
    return a.weekly?.week === utcWeek() ? a.weekly : emptyWeekly();
  }

  /**
   * Add bought points once per paid Stripe session. Returns the new balance,
   * or null if the account is gone or this session was already credited.
   */
  creditPurchase(accountId: string, p: Purchase): number | null {
    const a = this.store.accounts.find((x) => x.id === accountId);
    if (!a || a.purchases?.some((x) => x.id === p.id)) return null;
    a.purchases = [...(a.purchases ?? []), p];
    a.boughtPoints = (a.boughtPoints ?? 0) + p.points;
    a.points = (a.points ?? 0) + p.points;
    this.save();
    return a.points;
  }

  /** Account id for a session token (used to tag players in rooms). */
  accountId(token: unknown): string | null {
    return typeof token === 'string' ? (this.accountFor(token)?.id ?? null) : null;
  }

  /**
   * Add a ranked game's earnings: game points up to the daily cap, then daily and weekly quest progress
   * (each quest pays its points once, when it's finished).
   */
  award(accountId: string, earned: GameEarnings) {
    const a = this.store.accounts.find((x) => x.id === accountId);
    if (!a) return null;
    const daily = this.dailyOf(a);
    const gamePoints = Math.max(0, Math.min(earned.points, POINTS.dailyGameCap - daily.gamePoints));
    daily.gamePoints += gamePoints;

    const weekly = this.weeklyOf(a);
    const questsDone: QuestId[] = [];
    let questPoints = 0;
    const advance = (quests: QuestDef[], progress: Partial<Record<QuestId, number>>) => {
      for (const q of quests) {
        const id = q.id as QuestId;
        const n = earned.events[q.event] ?? 0;
        const before = progress[id] ?? 0;
        if (!n || before >= q.target) continue;
        progress[id] = Math.min(q.target, before + n);
        if (progress[id]! >= q.target) {
          questsDone.push(id);
          questPoints += q.points;
        }
      }
    };
    advance(questsFor(daily.day), daily.progress);
    advance(weeklyQuestsFor(weekly.week), weekly.progress);
    a.points = (a.points ?? 0) + gamePoints + questPoints;
    a.earnedPoints = (a.earnedPoints ?? 0) + gamePoints + questPoints;
    a.daily = daily;
    a.weekly = weekly;
    // XP has no daily cap: the full place points count, plus quests.
    const xpGained = earned.points + questPoints;
    const levelPoints = this.addXp(a, xpGained);
    this.save();
    return { gamePoints, capped: gamePoints < earned.points, questPoints, questsDone, total: a.points, daily, weekly, xpGained, xp: this.xpOf(a), levelPoints };
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

  async register(rawUsername: unknown, rawEmail: unknown, rawPassword: unknown, consent: unknown): Promise<{ token: string; account: PublicAccount } | { error: AuthError }> {
    // Terms, Privacy Policy and "I am 13 or older" must be accepted, and that is checked here, not just in the form.
    if (consent !== true) return { error: 'auth.err.consent' };
    const username = String(rawUsername ?? '').trim();
    const email = String(rawEmail ?? '').trim().toLowerCase();
    const password = String(rawPassword ?? '');
    const bad = this.checkUsername(username) ?? this.checkEmail(email) ?? (AccountStore.validPassword(password) ? null : 'auth.err.password');
    if (bad) return { error: bad };
    const tag = this.freeTag(username);
    if (!tag) return { error: 'auth.err.usernameTaken' };

    const account: Account = { id: randomBytes(12).toString('hex'), username, tag, email, passHash: await this.hashPassword(password), createdAt: Date.now(), consentAt: Date.now() };
    this.store.accounts.push(account);
    const token = this.newSession(account.id);
    this.save();
    if (mailEnabled()) await this.sendCode(account); // if it fails they can ask for another from the verify screen
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
    if (emailChanged) {
      account.email = email;
      account.emailVerified = false;
    }
    if (newPassword !== undefined) {
      account.passHash = await this.hashPassword(newPassword);
      // Sign out every other device after a password change.
      for (const [t, s] of Object.entries(this.store.sessions)) if (s.accountId === account.id && t !== token) delete this.store.sessions[t];
    }
    this.save();
    if (emailChanged && mailEnabled()) await this.sendCode(account);
    return { account: this.toPublic(account) };
  }

  /** Permanently delete the account after checking the password: profile, picture, purchases record and all sign-ins. */
  async deleteAccount(token: string | undefined, password: unknown): Promise<{ ok: true } | { error: AuthError }> {
    const account = this.accountFor(token);
    if (!account) return { error: 'auth.err.session' };
    if (!(await this.checkPassword(account, String(password ?? '')))) return { error: 'auth.err.wrongPassword' };
    if (account.image) await this.persistence.deleteImage(account.id, account.image.ext);
    for (const [t, s] of Object.entries(this.store.sessions)) if (s.accountId === account.id) delete this.store.sessions[t];
    this.store.accounts = this.store.accounts.filter((a) => a.id !== account.id);
    // Drop them from everyone's friends and requests; their messages go too.
    for (const a of this.store.accounts) {
      if (a.friends?.includes(account.id)) a.friends = a.friends.filter((x) => x !== account.id);
      if (a.friendIn?.includes(account.id)) a.friendIn = a.friendIn.filter((x) => x !== account.id);
      if (a.friendOut?.includes(account.id)) a.friendOut = a.friendOut.filter((x) => x !== account.id);
      if (a.dmRead?.[account.id]) delete a.dmRead[account.id];
    }
    this.onDeleted?.(account.id);
    this.save();
    return { ok: true };
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
