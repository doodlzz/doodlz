import express, { type Request, type Router } from 'express';
import type { AccountStore } from './accounts.js';

const bearer = (req: Request) => req.get('authorization')?.replace(/^Bearer\s+/i, '') || undefined;

/** Very small per-IP limiter so passwords can't be brute-forced. */
function limiter(max: number, windowMs: number) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (ip: string): boolean => {
    const now = Date.now();
    const h = hits.get(ip);
    if (!h || now > h.reset) {
      hits.set(ip, { n: 1, reset: now + windowMs });
      if (hits.size > 10_000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
      return true;
    }
    return ++h.n <= max;
  };
}

export function authRoutes(accounts: AccountStore): Router {
  const router = express.Router();
  router.use(express.json({ limit: '10kb' }));
  const allow = limiter(20, 10 * 60 * 1000);

  router.post('/register', async (req, res) => {
    if (!allow(req.ip ?? '')) return res.status(429).json({ error: 'auth.err.tooMany' });
    const result = await accounts.register(req.body?.username, req.body?.email, req.body?.password);
    res.status('error' in result ? 400 : 200).json(result);
  });

  router.post('/login', async (req, res) => {
    if (!allow(req.ip ?? '')) return res.status(429).json({ error: 'auth.err.tooMany' });
    const result = await accounts.login(req.body?.login, req.body?.password);
    res.status('error' in result ? 401 : 200).json(result);
  });

  router.get('/me', (req, res) => {
    const account = accounts.fromToken(bearer(req));
    if (!account) return res.status(401).json({ error: 'auth.err.session' });
    res.json({ account });
  });

  router.post('/account', async (req, res) => {
    if (!allow(req.ip ?? '')) return res.status(429).json({ error: 'auth.err.tooMany' });
    const b = req.body ?? {};
    const result = await accounts.update(bearer(req), { username: b.username, email: b.email, newPassword: b.newPassword, currentPassword: b.currentPassword });
    res.status('error' in result ? (result.error === 'auth.err.session' ? 401 : 400) : 200).json(result);
  });

  router.post('/logout', (req, res) => {
    accounts.logout(bearer(req));
    res.json({ ok: true });
  });

  return router;
}
