import { useEffect, useRef } from 'react';

// Runs `run` once `interval` has passed since `lastAttempt`, the end of the last load, while the tab is visible
// (DATA-24). A hidden tab pauses
// the countdown; a tab that comes back after the interval runs at once. The caller turns it off while a load runs and
// turns it on again after, which schedules the next one.
export function useAutoRefresh(enabled: boolean, lastAttempt: number, interval: number, run: () => void) {
  const runRef = useRef(run);
  useEffect(() => { runRef.current = run; });
  useEffect(() => {
    if (!enabled) return undefined;
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      if (document.visibilityState !== 'visible') return;
      timer = window.setTimeout(() => runRef.current(), Math.max(0, lastAttempt + interval - Date.now()));
    };
    schedule();
    document.addEventListener('visibilitychange', schedule);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', schedule);
    };
  }, [enabled, lastAttempt, interval]);
}
