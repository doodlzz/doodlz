import { AVATAR_PARTS_FREE, type Avatar } from '../../shared/types';

export const AVATAR_COLORS = [
  '#f87171', '#fb923c', '#facc15', '#a3e635', '#4ade80', '#2dd4bf',
  '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fda4af', '#a8a29e',
];
const rand = (n: number) => Math.floor(Math.random() * n);

/** Random face using the first `parts` eyes/mouths/extras (guests get fewer than signed-in players). */
export function randomAvatar(parts: number = AVATAR_PARTS_FREE): Avatar {
  return { color: AVATAR_COLORS[rand(AVATAR_COLORS.length)], eyes: rand(parts), mouth: rand(parts), accessory: rand(parts) };
}

/** Face only, limited to the parts this player can use (members' extras fall back to the first option). */
export function limitAvatar(a: Avatar, parts: number): Avatar {
  const ok = (n: number) => (n >= 0 && n < parts ? n : 0);
  return { color: a.color, eyes: ok(a.eyes), mouth: ok(a.mouth), accessory: ok(a.accessory) };
}

/** Shrink a picture from the computer to a small square (center-cropped) data URL for uploading. */
export async function imageToAvatarData(file: File, size = 160): Promise<string> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') throw new Error('not an image');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    const webp = canvas.toDataURL('image/webp', 0.85);
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.88);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const PROFILE_KEY = 'doodlz:profile';

export function loadProfile(): { name: string; avatar: Avatar } {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p.name === 'string' && p.avatar) return p;
    }
  } catch {
    // storage unavailable — fall through to defaults
  }
  return { name: '', avatar: randomAvatar() };
}

export function saveProfile(name: string, avatar: Avatar): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, avatar }));
  } catch {
    // ignore
  }
}
