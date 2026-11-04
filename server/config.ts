// Runtime configuration, read once from environment variables.
export const config = {
  port: Number(process.env.SERVER_PORT ?? process.env.PORT ?? 3001),
  /** Dev only: let several tabs of one browser join the same room. */
  allowSameDevice: process.env.ALLOW_SAME_DEVICE === '1',
  /** Max players from one IP address in a single room (households/schools share IPs). */
  maxPerIp: Number(process.env.MAX_PLAYERS_PER_IP ?? 4),
  /** Trust X-Forwarded-For (true behind Render's proxy). */
  trustProxy: process.env.TRUST_PROXY !== '0',
  /** Folder where player accounts are saved. Must be on a persistent disk in production. */
  dataDir: process.env.DATA_DIR ?? 'data',
  reconnectGraceMs: Number(process.env.RECONNECT_GRACE_MS ?? 60_000),
  chooseMs: 15_000,
  speedChooseMs: 8_000,
  turnEndMs: 6_000,
  publicAutoStartMs: 15_000,
  publicRestartMs: 12_000,
  categoryPickMs: 25_000, // public rooms: time the first player gets to pick a category
};
