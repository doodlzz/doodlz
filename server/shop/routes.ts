// Point shop: Paddle takes the payment (we never see card details), and points are added
// only once the payment provider confirms it, by webhook or by our own lookup. The browser is never
// trusted to say a payment happened.
import { createHmac, timingSafeEqual } from 'node:crypto';
import express, { type Request, type Router } from 'express';
import { findPack, POINT_PACKS, SHOP_CURRENCY, type ShopInfo } from '../../shared/shop.js';
import type { AccountStore } from '../auth/accounts.js';
import { config } from '../config.js';

const bearer = (req: Request) => req.get('authorization')?.replace(/^Bearer\s+/i, '') || undefined;
const paddleOn = () => Boolean(config.paddleApiKey && config.paddleWebhookSecret && config.paddleClientToken);
const paddleApi = () => (config.paddleEnv === 'production' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com');
const SIGNATURE_TOLERANCE_S = 300;

/** Check the Paddle-Signature header ("ts=...;h1=..."): HMAC-SHA256 of "ts:body" with the endpoint secret. */
export function verifyPaddleSignature(body: Buffer, header: string | undefined, secret: string, now = Date.now()): boolean {
  if (!header || !secret) return false;
  const parts = header.split(';').map((kv) => kv.split('='));
  const ts = parts.find(([k]) => k === 'ts')?.[1];
  const sigs = parts.filter(([k]) => k === 'h1').map(([, v]) => v);
  if (!ts || !sigs.length || Math.abs(now / 1000 - Number(ts)) > SIGNATURE_TOLERANCE_S) return false;
  const expected = createHmac('sha256', secret).update(`${ts}:`).update(body).digest();
  return sigs.some((s) => {
    const got = Buffer.from(s, 'hex');
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

/** Credit a paid Paddle transaction (from the webhook or a lookup). Safe to call more than once. */
function creditPaddle(accounts: AccountStore, tx: Record<string, any>): void {
  const pack = findPack(tx.custom_data?.pack);
  const accountId = typeof tx.custom_data?.accountId === 'string' ? tx.custom_data.accountId : null;
  const items: any[] = Array.isArray(tx.items) ? tx.items : [];
  // Buyers may pay in their own currency, so check the price id (set by us) rather than the amount.
  const priceOk = pack && items.length === 1 && items[0]?.price?.id === config.paddlePrices[pack.id] && items[0]?.quantity === 1;
  if (!pack || !accountId || !priceOk) return void console.warn('shop: paid transaction did not match a pack', tx.id);
  const balance = accounts.creditPurchase(accountId, { id: String(tx.id), pack: pack.id, points: pack.points, cents: pack.cents, at: Date.now() }, tx.customer_id);
  if (balance !== null) console.log(`shop: +${pack.points} points for ${accountId} (balance ${balance})`);
}

// Webhooks are only accepted from Paddle's own servers. The list comes from Paddle's /ips endpoint (for the
// current environment) and is fetched again every hour, never hard-coded. The signature check stays the
// real protection; this just turns away everyone else. If the list can't be fetched we refuse deliveries
// (Paddle retries them) — buyers still get their points through /confirm.
const IPS_TTL_MS = 60 * 60 * 1000;
let paddleIps: { env: string; at: number; ips: Set<string> } | null = null;
let paddleIpsLoading: Promise<void> | null = null;

async function loadPaddleIps(): Promise<void> {
  const r = await fetch(`${paddleApi()}/ips`);
  const data = (await r.json()) as { data?: { ipv4_cidrs?: unknown } };
  const cidrs = Array.isArray(data.data?.ipv4_cidrs) ? data.data.ipv4_cidrs : [];
  // Paddle lists single addresses as /32 CIDRs; anything wider is ignored rather than guessed at.
  const ips = cidrs.filter((c): c is string => typeof c === 'string' && c.endsWith('/32')).map((c) => c.slice(0, -3));
  if (!r.ok || !ips.length) throw new Error(`no IPs (status ${r.status})`);
  paddleIps = { env: config.paddleEnv, at: Date.now(), ips: new Set(ips) };
}

export async function isPaddleIp(ip: string | undefined): Promise<boolean> {
  const fresh = paddleIps && paddleIps.env === config.paddleEnv && Date.now() - paddleIps.at < IPS_TTL_MS;
  if (!fresh) {
    paddleIpsLoading ??= loadPaddleIps()
      .catch((err) => console.error('shop: could not fetch Paddle IPs:', err))
      .finally(() => (paddleIpsLoading = null));
    await paddleIpsLoading;
  }
  const addr = (ip ?? '').replace(/^::ffff:/, '');
  return Boolean(paddleIps?.ips.has(addr));
}

export function shopRoutes(accounts: AccountStore): Router {
  const router = express.Router();
  // A live token with PADDLE_ENV left on sandbox (or the other way round) makes every checkout fail.
  const tokenEnv = config.paddleClientToken.startsWith('live_') ? 'production' : config.paddleClientToken.startsWith('test_') ? 'sandbox' : null;
  if (tokenEnv && tokenEnv !== config.paddleEnv) console.warn(`shop: PADDLE_CLIENT_TOKEN is a ${tokenEnv} token but PADDLE_ENV is ${config.paddleEnv}`);

  // Paddle: points are credited only when Paddle says the transaction is paid (or completed).
  router.post('/paddle-webhook', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
    if (!(await isPaddleIp(req.ip))) {
      console.warn('shop: webhook refused from', req.ip);
      return res.status(403).end();
    }
    if (!verifyPaddleSignature(req.body, req.get('paddle-signature'), config.paddleWebhookSecret)) return res.status(400).end();
    let event: { event_type?: string; data?: Record<string, any> };
    try {
      event = JSON.parse(req.body.toString('utf8'));
    } catch {
      return res.status(400).end();
    }
    if ((event.event_type === 'transaction.paid' || event.event_type === 'transaction.completed') && event.data) creditPaddle(accounts, event.data);
    res.json({ received: true });
  });

  router.use(express.json({ limit: '2kb' }));

  // Spend points on a cosmetic: { item }.
  router.post('/item', (req, res) => {
    const result = accounts.buy(bearer(req), req.body?.item);
    res.status('error' in result ? (result.error === 'auth.err.session' ? 401 : 400) : 200).json(result);
  });

  // Put on or take off a frame or name effect: { slot, item } (item null = none).
  router.post('/equip', (req, res) => {
    const result = accounts.equip(bearer(req), req.body?.slot, req.body?.item ?? null);
    res.status('error' in result ? (result.error === 'auth.err.session' ? 401 : 400) : 200).json(result);
  });

  // Back from Paddle's checkout: ask Paddle itself about the transaction and credit it if it's paid.
  // The browser only says which transaction to look at; Paddle's answer decides. This also covers a
  // webhook that is late or can't reach us (local development). Crediting twice is impossible.
  router.post('/confirm', async (req, res) => {
    if (!paddleOn()) return res.status(503).json({ error: 'shop.off' });
    const accountId = accounts.accountId(bearer(req));
    if (!accountId) return res.status(401).json({ error: 'auth.err.session' });
    const id = String(req.body?.transactionId ?? '');
    if (!/^txn_[a-z0-9]{10,40}$/.test(id)) return res.status(400).json({ error: 'shop.error' });
    try {
      const r = await fetch(`${paddleApi()}/transactions/${id}`, { headers: { Authorization: `Bearer ${config.paddleApiKey}` } });
      const data = (await r.json()) as { data?: Record<string, any> };
      const tx = data.data;
      if (!r.ok || !tx || tx.custom_data?.accountId !== accountId) return res.status(404).json({ error: 'shop.error' });
      if (tx.status !== 'paid' && tx.status !== 'completed') return res.json({ status: 'pending' });
      creditPaddle(accounts, tx);
      res.json({ status: 'paid' });
    } catch (err) {
      console.error('shop: Paddle lookup failed:', err);
      res.status(502).json({ error: 'shop.error' });
    }
  });

  router.get('/', (_req, res) => {
    const info: ShopInfo = {
      enabled: paddleOn(),
      currency: SHOP_CURRENCY,
      packs: [...POINT_PACKS],
      ...(paddleOn() ? { paddle: { token: config.paddleClientToken, env: config.paddleEnv } } : {}),
    };
    res.json(info);
  });

  router.post('/checkout', async (req, res) => {
    if (!paddleOn()) return res.status(503).json({ error: 'shop.off' });
    const accountId = accounts.accountId(bearer(req));
    if (!accountId) return res.status(401).json({ error: 'auth.err.session' });
    // Real money only goes through for accounts with a confirmed email.
    if (!accounts.verifiedToken(bearer(req))) return res.status(403).json({ error: 'auth.err.unverified' });
    const pack = findPack(req.body?.pack);
    if (!pack) return res.status(400).json({ error: 'shop.error' });

    const priceId = config.paddlePrices[pack.id];
    if (!priceId) {
      console.error('shop: no Paddle price configured for', pack.id);
      return res.status(503).json({ error: 'shop.error' });
    }
    try {
      const r = await fetch(`${paddleApi()}/transactions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.paddleApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ price_id: priceId, quantity: 1 }], custom_data: { accountId, pack: pack.id } }),
      });
      const data = (await r.json()) as { data?: { id?: string }; error?: { detail?: string } };
      if (!r.ok || !data.data?.id) {
        console.error('shop: Paddle transaction failed:', data.error?.detail ?? r.status);
        return res.status(502).json({ error: 'shop.error' });
      }
      return res.json({ transactionId: data.data.id });
    } catch (err) {
      console.error('shop: Paddle request failed:', err);
      return res.status(502).json({ error: 'shop.error' });
    }
  });

  return router;
}
