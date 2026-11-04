import { describeFinished, formatElapsed } from '../../board/progress.ts';
import type { LoadState } from '../../board/progress.ts';

// One live region for the whole page, mounted before any load, so a screen reader hears when a load starts and how it
// ended (DATA-27). The page-by-page steps stay off it: they change too often to be read out.
export function LoadAnnouncer({ load }: { load: LoadState | null }) {
  const text = !load ? '' : load.finished
    ? describeFinished(load.finished.prs, load.finished.repos) + ' in ' + formatElapsed(load.finished.at - load.startedAt)
    : 'Loading pull requests from GitHub';
  return <div className="sr-only load-announcer" role="status">{text}</div>;
}
