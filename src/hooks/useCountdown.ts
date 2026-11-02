import { useEffect, useState } from 'react';

/** Seconds left until a local timestamp, updated a few times per second. */
export function useCountdown(endsAt: number | null): number {
  const calc = () => (endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    if (endsAt === null) return;
    const id = setInterval(() => setLeft(calc()), 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);
  return left;
}
