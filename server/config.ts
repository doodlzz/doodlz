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
  /** Supabase project URL and service-role key. When both are set, accounts are saved there instead of in DATA_DIR. */
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ?? '',
  /** Resend (email). Without an API key nothing is sent and every account counts as verified. MAIL_FROM must be on a domain verified in Resend. */
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  resendApiUrl: process.env.RESEND_API_URL ?? 'https://api.resend.com/emails',
  mailFrom: process.env.MAIL_FROM ?? 'Doodlz <noreply@doodlz.io>',
  reconnectGraceMs: Number(process.env.RECONNECT_GRACE_MS ?? 60_000),
  chooseMs: 15_000,
  speedChooseMs: 8_000,
  turnEndMs: 6_000,
  publicAutoStartMs: 15_000,
  publicRestartMs: 12_000,
  categoryPickMs: 25_000, // public rooms: time the first player gets to pick a category
  /** Ranked games need this many different signed-in players (also on different devices and IPs). */
  rankedMinPlayers: Number(process.env.RANKED_MIN_PLAYERS ?? 4),
  /** Testing only: set to 0 to let ranked players share an IP address. */
  rankedUniqueIp: process.env.RANKED_UNIQUE_IP !== '0',
  /** Stripe keys for selling point packs. The shop stays off until both are set. */
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  /**
   * Paddle (preferred over Stripe when set). The shop stays off until the API key and webhook secret are set.
   * PADDLE_ENV is "sandbox" or "production"; PADDLE_PRICES maps packs to Paddle price ids, e.g. "p50=pri_x,p100=pri_y".
   */
  paddleApiKey: process.env.PADDLE_API_KEY ?? '',
  paddleWebhookSecret: process.env.PADDLE_WEBHOOK_SECRET ?? '',
  paddleClientToken: process.env.PADDLE_CLIENT_TOKEN ?? '',
  paddleEnv: process.env.PADDLE_ENV === 'production' ? ('production' as const) : ('sandbox' as const),
  paddlePrices: Object.fromEntries(
    (process.env.PADDLE_PRICES ?? '')
      .split(',')
      .map((kv) => kv.split('=').map((x) => x.trim()))
      .filter(([k, v]) => k && v),
  ) as Record<string, string>,
  /** Site address for Stripe's return links, e.g. https://doodlz.io (defaults to the request's own address). */
  publicUrl: process.env.PUBLIC_URL?.replace(/\/$/, '') ?? '',
  /** A correct guess only counts toward quests once the drawing has been going this long… */
  questGuessMinMs: 3_000,
  /** …and has at least this many drawing ops (so a word told outside the game doesn't count). */
  questMinOps: 15,
};
