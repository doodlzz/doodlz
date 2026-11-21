import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useT } from '../i18n';
import { GoogleG } from './AccountSettings';

// "Sign in with Google": our own button, drawn the same every time (Google's iframe button re-renders after
// opening: new font, then "Continue as …"). Clicking opens Google's sign-in popup, which gives an access
// token the server checks with Google. Hidden when the server has no client id.

interface TokenClient {
  requestAccessToken(o?: { prompt?: string }): void;
}
interface GoogleOAuth2 {
  initTokenClient(o: {
    client_id: string;
    scope: string;
    callback: (r: { access_token?: string; error?: string }) => void;
    error_callback?: (e: { type?: string }) => void;
  }): TokenClient;
}
declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOAuth2 } };
  }
}

let clientIdPromise: Promise<string | null> | null = null;
/** The client id once known (undefined while still asking), so dialogs can lay out right on their first frame. */
let knownClientId: string | null | undefined;
/** The server's Google client id, fetched once. */
function googleClientId(): Promise<string | null> {
  clientIdPromise ??= fetch('/api/auth/config')
    .then((r) => (r.ok ? r.json() : null))
    .then((c: { googleClientId?: string | null } | null) => c?.googleClientId ?? null)
    .catch(() => null)
    .then((id) => (knownClientId = id));
  return clientIdPromise;
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('Google sign-in failed to load'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

// Ask the server and fetch Google's script when the app loads, so the popup can open on the first click
// (browsers only allow popups straight from a click, not after waiting for a download).
if (typeof window !== 'undefined') {
  void googleClientId().then((id) => {
    if (id) setTimeout(() => void loadScript().catch(() => {}), 1500);
  });
}

/** One token client for the page; the latest button's handler gets the result. */
let tokenClient: TokenClient | null = null;
let onToken: ((accessToken: string) => void) | null = null;
let onDone: (() => void) | null = null;

function getTokenClient(clientId: string): TokenClient | null {
  const oauth2 = window.google?.accounts.oauth2;
  if (!oauth2) return null;
  tokenClient ??= oauth2.initTokenClient({
    client_id: clientId,
    scope: 'openid email profile',
    callback: (r) => {
      onDone?.();
      if (r.access_token) onToken?.(r.access_token);
    },
    error_callback: () => onDone?.(), // popup closed or blocked
  });
  return tokenClient;
}

type Variant = 'signin_with' | 'signup_with' | 'continue_with';
const LABEL: Record<Variant, string> = { signin_with: 'auth.google.signin', signup_with: 'auth.google.signup', continue_with: 'auth.google.continue' };

export default function GoogleButton({ text, onSignIn, className = '' }: { text: Variant; onSignIn: (accessToken: string) => void; className?: string }) {
  const t = useT();
  const [waiting, setWaiting] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void loadScript().catch(() => {}); // in case the early preload hasn't happened yet
    return () => {
      mounted.current = false;
    };
  }, []);

  const click = async () => {
    const id = knownClientId ?? (await googleClientId());
    if (!id) return;
    let client = getTokenClient(id);
    if (!client) {
      // Script still downloading (very early click): load it; the next click opens the popup.
      setWaiting(true);
      await loadScript().catch(() => {});
      if (mounted.current) setWaiting(false);
      return;
    }
    onToken = onSignIn;
    onDone = () => mounted.current && setWaiting(false);
    setWaiting(true);
    client.requestAccessToken({ prompt: '' });
  };

  // Google's look for a light button: white, grey outline, dark text, the "G" on the left.
  return (
    <button
      type="button"
      onClick={() => void click()}
      disabled={waiting}
      className={`flex h-11 w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-[#747775] bg-white px-4 font-sans text-[15px] font-semibold text-[#1f1f1f] transition hover:bg-[#f2f6fc] active:bg-[#e8eef7] disabled:cursor-wait disabled:opacity-80 ${className}`}
    >
      {waiting ? <Loader2 className="size-5 animate-spin text-[#1f1f1f]" /> : <GoogleG className="size-5" />}
      {t(LABEL[text])}
    </button>
  );
}

/** Whether Google sign-in is set up on the server (so screens can hide the "or" divider too). */
export function useGoogleEnabled(): boolean {
  const [on, setOn] = useState(() => !!knownClientId);
  useEffect(() => {
    googleClientId().then((id) => setOn(!!id));
  }, []);
  return on;
}
