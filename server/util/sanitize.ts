import { TAG_RE } from '../../shared/tag.js';
import {
  AVATAR_PARTS_MEMBER,
  BACKGROUNDS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CATEGORIES,
  DEFAULT_SETTINGS,
  LANGUAGES,
  MAX_CUSTOM_WORDS,
  SETTING_LIMITS,
  type Avatar,
  type BackgroundId,
  type Category,
  type DrawOp,
  type Lang,
  type Profile,
  type RoomSettings,
} from '../../shared/types.js';
import { isProfane } from '../moderation/profanity.js';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function sanitizeName(raw: unknown): string {
  const name = typeof raw === 'string' ? raw.replace(/[\u0000-\u001f#]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20) : '';
  if (!name || isProfane(name)) return `Doodler${Math.floor(Math.random() * 900 + 100)}`;
  return name;
}

/** Clean an avatar from a client. `parts` is how many eyes/mouths/extras this player may use. Never keeps `image`. */
export function sanitizeAvatar(raw: unknown, parts: number = AVATAR_PARTS_MEMBER): Avatar {
  const a = (raw ?? {}) as Partial<Avatar>;
  const part = (n: unknown) => (Number.isInteger(n) && (n as number) >= 0 && (n as number) < parts ? (n as number) : 0);
  return {
    color: typeof a.color === 'string' && HEX_COLOR.test(a.color) ? a.color : '#f472b6',
    eyes: part(a.eyes),
    mouth: part(a.mouth),
    accessory: part(a.accessory),
  };
}

export function sanitizeProfile(raw: unknown): Profile {
  const p = (raw ?? {}) as Partial<Profile>;
  const deviceId = typeof p.deviceId === 'string' && /^[\w-]{8,64}$/.test(p.deviceId) ? p.deviceId : `anon-${Math.random().toString(36).slice(2)}`;
  return {
    name: sanitizeName(p.name),
    avatar: sanitizeAvatar(p.avatar),
    deviceId,
    lang: LANGUAGES.includes(p.lang as Lang) ? (p.lang as Lang) : 'en',
    authToken: typeof p.authToken === 'string' ? p.authToken.slice(0, 128) : undefined,
    guestTag: typeof p.guestTag === 'string' && TAG_RE.test(p.guestTag) ? p.guestTag : undefined,
  };
}

function sanitizeWords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of raw) {
    if (typeof w !== 'string') continue;
    const word = w.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 30);
    if (word.length < 2 || !/\p{L}/u.test(word) || isProfane(word) || seen.has(word)) continue;
    seen.add(word);
    out.push(word);
    if (out.length >= MAX_CUSTOM_WORDS) break;
  }
  return out;
}

export function sanitizeSettings(raw: unknown, base: RoomSettings = DEFAULT_SETTINGS): RoomSettings {
  const s = (raw ?? {}) as Partial<RoomSettings>;
  const num = (v: unknown, fallback: number, [min, max]: readonly [number, number]) =>
    typeof v === 'number' && Number.isFinite(v) ? clamp(Math.round(v), min, max) : fallback;
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  return {
    rounds: num(s.rounds, base.rounds, SETTING_LIMITS.rounds),
    drawTime: num(s.drawTime, base.drawTime, SETTING_LIMITS.drawTime),
    maxPlayers: num(s.maxPlayers, base.maxPlayers, SETTING_LIMITS.maxPlayers),
    hints: bool(s.hints, base.hints),
    mode: s.mode === 'classic' || s.mode === 'duo' ? s.mode : base.mode,
    speed: s.speed === 0 || s.speed === 30 || s.speed === 40 ? s.speed : base.speed,
    singleColor: bool(s.singleColor, base.singleColor),
    blindfold: bool(s.blindfold, base.blindfold),
    categories: Array.isArray(s.categories)
      ? [...new Set(s.categories.filter((c): c is Category => CATEGORIES.includes(c as Category)))]
      : base.categories,
    customWords: s.customWords !== undefined ? sanitizeWords(s.customWords) : base.customWords,
    customOnly: bool(s.customOnly, base.customOnly),
  };
}

export const isBackground = (v: unknown): v is BackgroundId => BACKGROUNDS.includes(v as BackgroundId);

export function sanitizeOp(op: unknown): DrawOp | null {
  if (!op || typeof op !== 'object') return null;
  const o = op as Record<string, unknown>;
  const sid = typeof o.sid === 'number' && Number.isInteger(o.sid) ? o.sid : null;
  if (sid === null) return null;
  if (o.kind === 'clear') return { kind: 'clear', sid };

  const fin = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, -50, max + 50) : null);
  if (typeof o.color !== 'string' || !HEX_COLOR.test(o.color)) return null;
  const color = o.color.toLowerCase();

  if (o.kind === 'fill') {
    const x = fin(o.x, CANVAS_WIDTH), y = fin(o.y, CANVAS_HEIGHT);
    return x === null || y === null ? null : { kind: 'fill', sid, x, y, color };
  }

  const x0 = fin(o.x0, CANVAS_WIDTH), y0 = fin(o.y0, CANVAS_HEIGHT);
  const x1 = fin(o.x1, CANVAS_WIDTH), y1 = fin(o.y1, CANVAS_HEIGHT);
  const size = fin(o.size, 80);
  if (x0 === null || y0 === null || x1 === null || y1 === null || size === null) return null;

  if (o.kind === 'line') {
    return { kind: 'line', sid, x0, y0, x1, y1, color, size: clamp(size, 1, 80), ...(o.erase === true ? { erase: true } : {}) };
  }
  if (o.kind === 'shape' && (o.shape === 'line' || o.shape === 'rect' || o.shape === 'ellipse')) {
    return { kind: 'shape', sid, shape: o.shape, x0, y0, x1, y1, color, size: clamp(size, 1, 80), filled: o.filled === true };
  }
  return null;
}
