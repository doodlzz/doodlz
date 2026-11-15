// Cosmetics bought with points. Frames and name effects are seen by everyone in a game;
// picture unlocks let a player upload or draw their own avatar picture.

export const FRAMES = ['ice', 'gold', 'fire', 'galaxy', 'angel', 'devil', 'bunny', 'cyber', 'pirate', 'frog', 'astronaut', 'wizard', 'ninja', 'mushroom', 'painter', 'shark', 'samurai', 'axolotl', 'king', 'dragon', 'cactus', 'knight', 'fox', 'viking', 'pharaoh'] as const;
export type FrameId = (typeof FRAMES)[number];

export const NAME_FX = ['neon', 'gold', 'rainbow', 'fire', 'glitch', 'ice', 'toxic', 'electric'] as const;
export type NameFxId = (typeof NAME_FX)[number];

export type Rarity = 'rare' | 'epic' | 'legendary' | 'exotic';
/** Lowest to highest: the shop lists items in this order. */
export const RARITY_ORDER: Rarity[] = ['rare', 'epic', 'legendary', 'exotic'];
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
  { id: 'pic-draw', slot: 'picture', value: 'draw', price: 1000, rarity: 'exotic' },
  { id: 'pic-upload', slot: 'picture', value: 'upload', price: 1000, rarity: 'exotic' },

  // Frames, rare to legendary.
  { id: 'frame-ice', slot: 'frame', value: 'ice', price: 200, rarity: 'rare' },
  { id: 'frame-gold', slot: 'frame', value: 'gold', price: 200, rarity: 'rare' },
  { id: 'frame-cyber', slot: 'frame', value: 'cyber', price: 200, rarity: 'rare' },
  { id: 'frame-astronaut', slot: 'frame', value: 'astronaut', price: 200, rarity: 'rare' },

  { id: 'frame-bunny', slot: 'frame', value: 'bunny', price: 350, rarity: 'epic' },
  { id: 'frame-pirate', slot: 'frame', value: 'pirate', price: 350, rarity: 'epic' },
  { id: 'frame-frog', slot: 'frame', value: 'frog', price: 350, rarity: 'epic' },
  { id: 'frame-ninja', slot: 'frame', value: 'ninja', price: 350, rarity: 'epic' },
  { id: 'frame-mushroom', slot: 'frame', value: 'mushroom', price: 350, rarity: 'epic' },
  { id: 'frame-painter', slot: 'frame', value: 'painter', price: 350, rarity: 'epic' },
  { id: 'frame-shark', slot: 'frame', value: 'shark', price: 350, rarity: 'epic' },
  { id: 'frame-cactus', slot: 'frame', value: 'cactus', price: 350, rarity: 'epic' },
  { id: 'frame-fox', slot: 'frame', value: 'fox', price: 350, rarity: 'epic' },
  { id: 'frame-viking', slot: 'frame', value: 'viking', price: 350, rarity: 'epic' },

  { id: 'frame-fire', slot: 'frame', value: 'fire', price: 500, rarity: 'legendary' },
  { id: 'frame-galaxy', slot: 'frame', value: 'galaxy', price: 500, rarity: 'legendary' },
  { id: 'frame-angel', slot: 'frame', value: 'angel', price: 500, rarity: 'legendary' },
  { id: 'frame-devil', slot: 'frame', value: 'devil', price: 500, rarity: 'legendary' },
  { id: 'frame-wizard', slot: 'frame', value: 'wizard', price: 500, rarity: 'legendary' },
  { id: 'frame-samurai', slot: 'frame', value: 'samurai', price: 500, rarity: 'legendary' },
  { id: 'frame-axolotl', slot: 'frame', value: 'axolotl', price: 500, rarity: 'legendary' },
  { id: 'frame-king', slot: 'frame', value: 'king', price: 500, rarity: 'legendary' },
  { id: 'frame-dragon', slot: 'frame', value: 'dragon', price: 500, rarity: 'legendary' },
  { id: 'frame-knight', slot: 'frame', value: 'knight', price: 500, rarity: 'legendary' },
  { id: 'frame-pharaoh', slot: 'frame', value: 'pharaoh', price: 500, rarity: 'legendary' },

  // Name effects, rare to legendary.
  { id: 'name-neon', slot: 'nameFx', value: 'neon', price: 150, rarity: 'rare' },

  { id: 'name-gold', slot: 'nameFx', value: 'gold', price: 250, rarity: 'epic' },
  { id: 'name-rainbow', slot: 'nameFx', value: 'rainbow', price: 300, rarity: 'epic' },
  { id: 'name-ice', slot: 'nameFx', value: 'ice', price: 250, rarity: 'epic' },
  { id: 'name-toxic', slot: 'nameFx', value: 'toxic', price: 300, rarity: 'epic' },

  { id: 'name-fire', slot: 'nameFx', value: 'fire', price: 400, rarity: 'legendary' },
  { id: 'name-glitch', slot: 'nameFx', value: 'glitch', price: 400, rarity: 'legendary' },
  { id: 'name-electric', slot: 'nameFx', value: 'electric', price: 400, rarity: 'legendary' },
];

export const findCosmetic = (id: unknown): Cosmetic | undefined => COSMETICS.find((c) => c.id === id);

/** What a signed-in player has equipped (shown to everyone). */
export interface Equipped {
  frame?: FrameId;
  nameFx?: NameFxId;
}

export const isFrame = (v: unknown): v is FrameId => FRAMES.includes(v as FrameId);
export const isNameFx = (v: unknown): v is NameFxId => NAME_FX.includes(v as NameFxId);
