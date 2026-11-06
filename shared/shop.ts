// Point packs for sale. Prices are in US cents; bigger packs cost less per point.

export interface PointPack {
  id: PackId;
  points: number;
  cents: number;
}

export const POINT_PACKS = [
  { id: 'p50', points: 50, cents: 99 },
  { id: 'p100', points: 100, cents: 179 },
  { id: 'p200', points: 200, cents: 329 },
  { id: 'p400', points: 400, cents: 599 },
  { id: 'p1000', points: 1000, cents: 1299 },
] as const;

export type PackId = (typeof POINT_PACKS)[number]['id'];
export const SHOP_CURRENCY = 'usd';

export const findPack = (id: unknown): PointPack | undefined => POINT_PACKS.find((p) => p.id === id);

/** How much cheaper per point than the smallest pack, as a whole percent. */
export function savingsPercent(pack: PointPack): number {
  const base = POINT_PACKS[0].cents / POINT_PACKS[0].points;
  return Math.round((1 - pack.cents / pack.points / base) * 100);
}

/** What the shop endpoint returns. */
export interface ShopInfo {
  enabled: boolean;
  currency: string;
  packs: PointPack[];
}
