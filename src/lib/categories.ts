import type { Category } from '../../shared/types';

/** How each category looks on its tile. Names and keywords live in the locale files (cat.* / catk.*). */
export const CATEGORY_LOOK: Record<Category, { emoji: string; color: string; shadow: string }> = {
  games: { emoji: '🎮', color: '#8b5cf6', shadow: '#5b21b6' },
  heroes: { emoji: '🦸', color: '#ef4444', shadow: '#991b1b' },
  cartoons: { emoji: '📺', color: '#f59e0b', shadow: '#b45309' },
  snacks: { emoji: '🍔', color: '#f97316', shadow: '#c2410c' },
  wildlife: { emoji: '🦁', color: '#16a34a', shadow: '#166534' },
  landscapes: { emoji: '🌋', color: '#0ea5e9', shadow: '#0369a1' },
  verbs: { emoji: '🏃', color: '#ec4899', shadow: '#9d174d' },
  emotions: { emoji: '💭', color: '#a855f7', shadow: '#6b21a8' },
  landmarks: { emoji: '🗼', color: '#14b8a6', shadow: '#0f766e' },
  history: { emoji: '🏛️', color: '#a16207', shadow: '#713f12' },
  household: { emoji: '🛋️', color: '#64748b', shadow: '#334155' },
  brainrot: { emoji: '💀', color: '#84cc16', shadow: '#4d7c0f' },
  jobs: { emoji: '👩‍🚒', color: '#3b82f6', shadow: '#1d4ed8' },
  flags: { emoji: '🌍', color: '#06b6d4', shadow: '#0e7490' },
  movies: { emoji: '🎬', color: '#e11d48', shadow: '#9f1239' },
};
