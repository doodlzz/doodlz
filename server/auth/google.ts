// "Sign in with Google": the browser gets an ID token from Google's button; we ask Google whether it is genuine
// and was issued for our client id, then trust its email and stable account id ("sub").
import { config } from '../config.js';

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
}

/** Null when the token is fake, expired, for another app, or the email isn't verified by Google. */
export async function verifyGoogleToken(credential: unknown): Promise<GoogleProfile | null> {
  if (!config.googleClientId || typeof credential !== 'string' || credential.length > 4096) return null;
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!res.ok) return null;
    const t = (await res.json()) as Record<string, string | undefined>;
    const issuerOk = t.iss === 'accounts.google.com' || t.iss === 'https://accounts.google.com';
    const fresh = Number(t.exp ?? 0) * 1000 > Date.now();
    if (t.aud !== config.googleClientId || !issuerOk || !fresh || t.email_verified !== 'true' || !t.sub || !t.email) return null;
    return { sub: t.sub, email: t.email.toLowerCase(), name: t.given_name || t.name || '' };
  } catch (err) {
    console.error('Google sign-in check failed:', err);
    return null;
  }
}

/**
 * The same check for an access token from Google's sign-in popup (used by our own styled button): Google must
 * confirm it was issued to our client id for a verified email; the first name comes from Google's userinfo.
 */
export async function verifyGoogleAccessToken(accessToken: unknown): Promise<GoogleProfile | null> {
  if (!config.googleClientId || typeof accessToken !== 'string' || accessToken.length > 4096) return null;
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
    if (!res.ok) return null;
    const t = (await res.json()) as Record<string, string | undefined>;
    const ours = t.aud === config.googleClientId || t.azp === config.googleClientId;
    if (!ours || Number(t.expires_in ?? 0) <= 0 || t.email_verified !== 'true' || !t.sub || !t.email) return null;
    let name = '';
    const info = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (info.ok) {
      const u = (await info.json()) as Record<string, string | undefined>;
      if (u.sub === t.sub) name = u.given_name || u.name || '';
    }
    return { sub: t.sub, email: t.email.toLowerCase(), name };
  } catch (err) {
    console.error('Google sign-in check failed:', err);
    return null;
  }
}
