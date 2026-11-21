import { useEffect, useState } from 'react';

/**
 * False on the first render, true once that render is on screen. Dialogs use it to show their frame straight
 * away and add long lists a frame later, so opening them doesn't stall on building everything at once.
 */
export function useAfterFirstPaint(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);
  return ready;
}
