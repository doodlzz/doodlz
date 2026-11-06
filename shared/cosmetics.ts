// Cosmetics bought with points. Frames and name effects are seen by everyone in a game;
// picture unlocks let a player upload or draw their own avatar picture.

export const FRAMES = ['neon', 'ice', 'gold', 'rainbow', 'fire', 'galaxy'] as const;
export type FrameId = (typeof FRAMES)[number];

export const NAME_FX = ['neon', 'gold', 'rainbow', 'fire', 'glitch'] as const;
export type NameFxId = (typeof NAME_FX)[number];

export type Rarity = 'rare' | 'epic' | 'legendary';
export type CosmeticSlot = 'picture' | 'frame' | 'nameFx';

export interface Cosmetic {
  id: string;
  slot: CosmeticSlot;
  /** The frame or name effect it applies (pictures: which unlock). */
  value: string;
  price: number;
  rarity: Rarity;
}

export const COSMETICS: Cosmetic[] = [
  { id: 'pic-draw', slot: 'picture', value: 'draw', price: 150, rarity: 'rare' },
  { id: 'pic-upload', slot: 'picture', value: 'upload', price: 200, rarity: 'epic' },

  { id: 'frame-neon', slot: 'frame', value: 'neon', price: 200, rarity: 'rare' },
  { id: 'frame-ice', slot: 'frame', value: 'ice', price: 200, rarity: 'rare' },
  { id: 'frame-gold', slot: 'frame', value: 'gold', price: 300, rarity: 'epic' },
  { id: 'frame-rainbow', slot: 'frame', value: 'rainbow', price: 350, rarity: 'epic' },
  { id: 'frame-fire', slot: 'frame', value: 'fire', price: 500, rarity: 'legendary' },
  { id: 'frame-galaxy', slot: 'frame', value: 'galaxy', price: 500, rarity: 'legendary' },

  { id: 'name-neon', slot: 'nameFx', value: 'neon', price: 150, rarity: 'rare' },
  { id: 'name-gold', slot: 'nameFx', value: 'gold', price: 250, rarity: 'epic' },
  { id: 'name-rainbow', slot: 'nameFx', value: 'rainbow', price: 300, rarity: 'epic' },
  { id: 'name-fire', slot: 'nameFx', value: 'fire', price: 400, rarity: 'legendary' },
  { id: 'name-glitch', slot: 'nameFx', value: 'glitch', price: 400, rarity: 'legendary' },
];

export const findCosmetic = (id: unknown): Cosmetic | undefined => COSMETICS.find((c) => c.id === id);

/** What a signed-in player has equipped (shown to everyone). */
export interface Equipped {
  frame?: FrameId;
  nameFx?: NameFxId;
}

export const isFrame = (v: unknown): v is FrameId => FRAMES.includes(v as FrameId);
export const isNameFx = (v: unknown): v is NameFxId => NAME_FX.includes(v as NameFxId);
