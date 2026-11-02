import type { Avatar } from '../../shared/types';

export const AVATAR_COLORS = [
  '#f87171', '#fb923c', '#facc15', '#a3e635', '#4ade80', '#2dd4bf',
  '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fda4af', '#a8a29e',
];
export const AVATAR_PARTS = 6;
export const EYE_NAMES = ['Dots', 'Googly', 'Happy', 'Sleepy', 'Wink', 'Grumpy'];
export const MOUTH_NAMES = ['Smile', 'Grin', 'Wow', 'Meh', 'Silly', 'Kitty'];
export const ACCESSORY_NAMES = ['None', 'Party hat', 'Crown', 'Bow', 'Glasses', 'Antenna'];

const rand = (n: number) => Math.floor(Math.random() * n);

export function randomAvatar(): Avatar {
  return { color: AVATAR_COLORS[rand(AVATAR_COLORS.length)], eyes: rand(AVATAR_PARTS), mouth: rand(AVATAR_PARTS), accessory: rand(AVATAR_PARTS) };
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
