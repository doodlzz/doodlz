// Point shop: Stripe Checkout takes the payment (we never see card details), then Stripe calls our
// webhook and only then are the points added. The browser is never trusted to say a payment happened.
import { createHmac, timingSafeEqual } from 'node:crypto';
import express, { type Request, type Router } from 'express';
import { findPack, POINT_PACKS, SHOP_CURRENCY, type ShopInfo } from '../../shared/shop.js';
import type { AccountStore } from '../auth/accounts.js';
import { config } from '../config.js';

const bearer = (req: Request) => req.get('authorization')?.replace(/^Bearer\s+/i, '') || undefined;
const enabled = () => Boolean(config.stripeSecretKey && config.stripeWebhookSecret);
const SIGNATURE_TOLERANCE_S = 300;

/** Check the Stripe-Signature header: HMAC-SHA256 of "timestamp.body" with the webhook secret. */
export function verifyStripeSignature(body: Buffer, header: string | undefined, secret: string, now = Date.now()): boolean {
  if (!header || !secret) return false;
  const parts = header.split(',').map((kv) => kv.split('='));
  const t = parts.find(([k]) => k === 't')?.[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !sigs.length || Math.abs(now / 1000 - Number(t)) > SIGNATURE_TOLERANCE_S) return false;
  const expected = createHmac('sha256', secret).update(`${t}.`).update(body).digest();
  return sigs.some((s) => {
    const got = Buffer.from(s, 'hex');
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

export function shopRoutes(accounts: AccountStore): Router {
  const router = express.Router();

  // Stripe needs the exact raw body to check the signature, so this route reads it before any JSON parsing.
  router.post('/webhook', express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
    if (!verifyStripeSignature(req.body, req.get('stripe-signature'), config.stripeWebhookSecret)) return res.status(400).end();
    let event: { type?: string; data?: { object?: Record<string, any> } };
    try {
      event = JSON.parse(req.body.toString('utf8'));
    } catch {
      return res.status(400).end();
    }
    const s = event.data?.object;
    const paidEvent = event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded';
    if (paidEvent && s && s.payment_status === 'paid') {
      const pack = findPack(s.metadata?.pack);
      const accountId = typeof s.metadata?.accountId === 'string' ? s.metadata.accountId : null;
      // Only credit what was actually paid for this pack.
      if (pack && accountId && s.amount_total === pack.cents && s.currency === SHOP_CURRENCY) {
        const balance = accounts.creditPurchase(accountId, { id: String(s.id), pack: pack.id, points: pack.points, cents: pack.cents, at: Date.now() });
        if (balance !== null) console.log(`shop: +${pack.points} points for ${accountId} (balance ${balance})`);
      } else {
        console.warn('shop: paid session did not match a pack', s.id);
      }
    }
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

  router.get('/', (_req, res) => {
    const info: ShopInfo = { enabled: enabled(), currency: SHOP_CURRENCY, packs: [...POINT_PACKS] };
    res.json(info);
  });

  router.post('/checkout', async (req, res) => {
    if (!enabled()) return res.status(503).json({ error: 'shop.off' });
    const accountId = accounts.accountId(bearer(req));
    if (!accountId) return res.status(401).json({ error: 'auth.err.session' });
    const pack = findPack(req.body?.pack);
    if (!pack) return res.status(400).json({ error: 'shop.error' });

    const base = config.publicUrl || `${req.protocol}://${req.get('host')}`;
    const form = new URLSearchParams({
      mode: 'payment',
      success_url: `${base}/?points=success`,
      cancel_url: `${base}/?points=cancel`,
      client_reference_id: accountId,
      'metadata[accountId]': accountId,
      'metadata[pack]': pack.id,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': SHOP_CURRENCY,
      'line_items[0][price_data][unit_amount]': String(pack.cents),
      'line_items[0][price_data][product_data][name]': `${pack.points} doodlz points`,
    });
    try {
      const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.stripeSecretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
      });
      const data = (await r.json()) as { url?: string; error?: { message?: string } };
      if (!r.ok || !data.url) {
        console.error('shop: Stripe checkout failed:', data.error?.message ?? r.status);
        return res.status(502).json({ error: 'shop.error' });
      }
      res.json({ url: data.url });
    } catch (err) {
      console.error('shop: Stripe request failed:', err);
      res.status(502).json({ error: 'shop.error' });
    }
  });

  return router;
}
