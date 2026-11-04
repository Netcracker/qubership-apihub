import { useCallback, useEffect, useState } from 'react';
import { MINUTE_MS } from '../board/format.ts';

// The time the board shows ages against. It moves every minute (QUAL-10), and tick() moves it at once, such as when
// new data arrives.
export function useClock(): { now: number; tick: () => void } {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), MINUTE_MS);
    return () => window.clearInterval(timer);
  }, []);
  const tick = useCallback(() => setNow(Date.now()), []);
  return { now, tick };
}
