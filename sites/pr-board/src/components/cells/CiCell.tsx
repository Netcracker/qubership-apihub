import { useContext } from 'react';
import { CHECKS_READ, CONCLUSION_LABELS, groupChecks } from '../../board/checks.ts';
import { plural } from '../../board/format.ts';
import { CI } from '../../board/states.ts';
import { usePopover } from '../../hooks/usePopover.ts';
import type { DerivedPullRequest } from '../../types.ts';
import { PrNameContext } from '../../context.ts';
import { Pill } from '../common/Pill.tsx';

const CHECKS_POPOVER_PX = 400;

export function CiCell({ pr }: { pr: DerivedPullRequest }) {
  const prName = useContext(PrNameContext);
  // The popover closes when CI stops failing, so it never comes back by itself when CI fails again.
  const { open, position, ref, toggle } = usePopover(CHECKS_POPOVER_PX, pr.ci === 'failing');
  const state = CI[pr.ci];
  if (pr.ci !== 'failing') return <Pill state={state} />;
  const checks = pr.checks;
  const failed = checks ? groupChecks(checks.failed) : [];
  const summary = failed.length ? plural(failed.length, 'failed check') : 'Failed checks';
  const tooltip = failed.length ? summary + ': ' + failed.map((c) => c.name).join(', ') : state.hint;
  return (
    <div className="ci-wrap" ref={ref}>
      <button type="button" className={'pill short ' + state.tone + ' as-button'} aria-expanded={open}
        aria-label={summary + ' on ' + prName} title={tooltip} onClick={toggle}>
        {state.short}{failed.length > 1 ? <sup>{failed.length}</sup> : null}
      </button>
      {open ? (
        <div className="popover checks-popover" role="dialog" aria-label={summary + ' on ' + prName} style={position}>
          <strong className="popover-title">{summary}{checks ? ' of ' + checks.total : ''}</strong>
          {!checks ? <p className="muted">Check details were not collected for this PR.</p> : null}
          {checks && !failed.length ? <p className="muted">GitHub reports CI as failing, but no failed check is among the {checks.total > CHECKS_READ ? 'first ' + CHECKS_READ : checks.total} checks read.</p> : null}
          {failed.length ? (
            <ul className="check-list">
              {failed.map((c, i) => (
                <li key={i}>
                  <div className="check-name">
                    {c.url ? <a href={c.url} target="_blank" rel="noopener">{c.name}</a> : c.name}
                    {c.count > 1 ? <> <span className="check-count" title={'Reported ' + c.count + ' times'}>×{c.count}</span></> : null}
                  </div>
                  <div className="check-meta">
                    {c.workflow ? <span>{c.workflow}</span> : null}
                    {c.summary ? <span className="chip" title="Fails when any other required check fails">summary job</span> : null}
                    {c.conclusion !== 'failure' ? <span className="chip">{CONCLUSION_LABELS[c.conclusion] || c.conclusion}</span> : null}
                    {c.description ? <span>{c.description}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {checks && !checks.complete && failed.length
            ? <p className="muted">Only the first {CHECKS_READ} of {checks.total} checks were read; others may have failed too.</p> : null}
          <a className="popover-footer" href={pr.url + '/checks'} target="_blank" rel="noopener">All checks on GitHub</a>
        </div>
      ) : null}
    </div>
  );
}
