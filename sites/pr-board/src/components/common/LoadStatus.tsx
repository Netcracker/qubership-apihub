import { useEffect, useState } from 'react';
import { MINUTE_MS } from '../../board/format.ts';
import { describeFinished, describeProgress, formatElapsed } from '../../board/progress.ts';
import type { LoadState } from '../../board/progress.ts';

// The clock shows tenths of a second for the first minute and whole seconds after it, so it ticks only as often as it
// changes.
const TENTHS_TICK_MS = 100;
const SECONDS_TICK_MS = 1000;

// The spinner, what the load is doing, and a running clock. It sits in the empty table, or in a corner over a table
// that already has rows, so they stay where they are. Screen readers hear it from LoadAnnouncer, which stays mounted.
export function LoadStatus({ load, floating = false }: { load: LoadState; floating?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  const pastMinute = now - load.startedAt >= MINUTE_MS;
  useEffect(() => {
    if (load.finished) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), pastMinute ? SECONDS_TICK_MS : TENTHS_TICK_MS);
    return () => window.clearInterval(timer);
  }, [load.finished, pastMinute]);
  const cls = 'load-status' + (floating ? ' floating' : '') + (load.finished ? ' finished' : '');
  if (load.finished) {
    const { prs, repos, at } = load.finished;
    return (
      <div className={cls}>
        <span className="done-mark" aria-hidden="true">✓</span>
        <strong>{describeFinished(prs, repos)}</strong>
        <span className="elapsed">in {formatElapsed(at - load.startedAt)}</span>
      </div>
    );
  }
  const { headline, lines } = describeProgress(load.repos);
  return (
    <div className={cls}>
      <span className="spinner" aria-hidden="true"></span>
      <div className="load-text">
        <div className="load-head">
          <strong className="load-headline">{headline}</strong>
          <span className="elapsed">{formatElapsed(Math.max(0, now - load.startedAt))}</span>
        </div>
        {lines.length ? <ul className="load-lines">{lines.map((line) => <li key={line.repo}>{line.text}</li>)}</ul> : null}
      </div>
    </div>
  );
}
