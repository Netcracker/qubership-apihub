import { formatAgo } from '../../board/format.ts';
import { usePopover } from '../../hooks/usePopover.ts';
import type { Report } from '../../types.ts';

const UPDATE_POPOVER_PX = 280;

// Where the data comes from and how old it is, behind a small status dot: green for live data, gray for the snapshot.
export function UpdateInfo({ report, live, now, refreshMinutes }: { report: Report; live: boolean; now: number; refreshMinutes: number }) {
  const { open, position, ref, toggle } = usePopover(UPDATE_POPOVER_PX);
  const summary = (live ? 'Live data' : 'Snapshot') + ', ' + formatAgo(report.generatedAt, now);
  return (
    <div className="update-info" ref={ref}>
      <button type="button" className={'btn ghost source-button' + (live ? ' live' : '')}
        title={summary} aria-expanded={open} onClick={toggle}>
        <span className="source-dot" aria-hidden="true"></span>
        <span className="source-age">{live ? 'live, ' : 'updated '}{formatAgo(report.generatedAt, now)}</span>
      </button>
      {open ? (
        <div className="popover" role="dialog" aria-label="Data source" style={position}>
          <strong className="popover-title">{live ? 'Live data' : 'Snapshot'}</strong>
          <p className="muted">
            {live ? 'Loaded from GitHub with your token ' : 'Published with the page '}
            {formatAgo(report.generatedAt, now)}, at {new Date(report.generatedAt).toLocaleString()}.
          </p>
          <p className="muted">
            {!live ? 'Refresh loads live data from GitHub.'
              : refreshMinutes ? 'It loads again every ' + refreshMinutes + ' minutes while this tab is visible.'
                : 'It loads again only on Refresh; automatic loads are off in Settings.'}
          </p>
          {report.runUrl ? <a className="popover-footer" href={report.runUrl} target="_blank" rel="noopener">Workflow run</a> : null}
        </div>
      ) : null}
    </div>
  );
}
