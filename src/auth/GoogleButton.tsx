import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../settings/SettingsContext';

// Google's "Sign in with Google" button (Google Identity Services). Hidden when the server has no client id.

interface GoogleId {
  initialize(o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: 'popup'; auto_select?: boolean }): void;
  renderButton(el: HTMLElement, o: Record<string, unknown>): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let clientIdPromise: Promise<string | null> | null = null;
/** The server's Google client id, fetched once. */
function googleClientId(): Promise<string | null> {
  clientIdPromise ??= fetch('/api/auth/config')
    .then((r) => (r.ok ? r.json() : null))
    .then((c: { googleClientId?: string | null } | null) => c?.googleClientId ?? null)
    .catch(() => null);
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

/** Latest callback, so the button (rendered once) always calls the current handler. */
let onCredential: ((credential: string) => void) | null = null;
let initializedFor: string | null = null;

export default function GoogleButton({ text, onSignIn, className = '' }: { text: 'signin_with' | 'signup_with' | 'continue_with'; onSignIn: (credential: string) => void; className?: string }) {
  const { settings } = useSettings();
  const el = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  onCredential = onSignIn;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = await googleClientId();
      if (!id) return setReady(false);
      try {
        await loadScript();
      } catch {
        return setReady(false);
      }
      const g = window.google?.accounts.id;
      if (cancelled || !g || !el.current) return;
      if (initializedFor !== id) {
        g.initialize({ client_id: id, callback: (r) => onCredential?.(r.credential), ux_mode: 'popup', auto_select: false });
        initializedFor = id;
      }
      el.current.innerHTML = '';
      // Google's dark button in dark mode, the outlined white one in light mode.
      const dark = document.documentElement.classList.contains('dark');
      g.renderButton(el.current, { type: 'standard', theme: dark ? 'filled_black' : 'outline', size: 'large', shape: 'pill', text, locale: settings.lang, width: Math.min(el.current.offsetWidth || 320, 400) });
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [text, settings.lang, settings.theme]);

  if (ready === false) return null;
  // color-scheme: light stops the browser painting a white box behind Google's frame when the site is dark.
  return <div ref={el} style={{ colorScheme: 'light' }} className={`flex min-h-11 justify-center ${className}`} />;
}

/** Whether Google sign-in is set up on the server (so screens can hide the "or" divider too). */
export function useGoogleEnabled(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    googleClientId().then((id) => setOn(!!id));
  }, []);
  return on;
}
