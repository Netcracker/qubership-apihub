import { useContext } from 'react';
import { displayLogin } from '../../board/format.ts';
import { reviewerEntries } from '../../board/reviewers.ts';
import type { ReviewerEntry, ReviewerStatus } from '../../board/reviewers.ts';
import { PrNameContext, ReviewViewContext } from '../../context.ts';
import { usePopover } from '../../hooks/usePopover.ts';
import type { DerivedPullRequest } from '../../types.ts';
import { Avatar } from '../common/Avatar.tsx';
import { Octicon } from '../common/Octicon.tsx';
import type { OcticonName } from '../common/Octicon.tsx';

const STATUS: Record<ReviewerStatus, { icon: OcticonName; label: string }> = {
  pending: { icon: 'dot', label: 'awaiting review' },
  again: { icon: 'sync', label: 'asked to review again' },
  changes: { icon: 'fileDiff', label: 'requested changes' },
  approved: { icon: 'check', label: 'approved' },
  commented: { icon: 'comment', label: 'left review comments' },
  dismissed: { icon: 'x', label: 'review dismissed' },
};

// A long list shows this many lines and puts the rest behind a "+N more" button.
const VISIBLE_REVIEWERS = 4;
const REVIEWERS_POPOVER_PX = 260;

// The Review column as GitHub's Reviewers list (TABLE-30). The viewer's own line stands out when their review is due.
export function ReviewersList({ pr }: { pr: DerivedPullRequest }) {
  const { viewer, order } = useContext(ReviewViewContext);
  const prName = useContext(PrNameContext);
  const entries = reviewerEntries(pr, viewer, order);
  const { open, position, ref, toggle } = usePopover(REVIEWERS_POPOVER_PX, entries.length > VISIBLE_REVIEWERS);
  if (!entries.length) return <div className="reviewers-wrap"><span className="dash">No reviewers</span></div>;
  const cut = entries.length > VISIBLE_REVIEWERS ? VISIBLE_REVIEWERS - 1 : entries.length;
  const line = ({ actor, team, status, mine }: ReviewerEntry, index: number) => {
    const name = team ? '@' + actor.login : displayLogin(actor);
    const due = mine && (status === 'pending' || status === 'again');
    const label = STATUS[status].label;
    // The index keeps keys unique for a team and a person with the same name.
    return (
      <li key={index + ':' + actor.login} className={'reviewer ' + status + (due ? ' due' : '')}
        title={due ? 'Your review is requested' : undefined}>
        <Avatar actor={actor} small />
        <span className={'who' + (mine ? ' me' : '')}>{name}{mine ? <span className="sr-only"> (you)</span> : null}</span>
        <span className="state" role="img" aria-label={label} title={name + ': ' + label}><Octicon name={STATUS[status].icon} /></span>
      </li>
    );
  };
  return (
    <div className="reviewers-wrap" ref={ref}>
      <ul className="reviewers" aria-label={'Reviewers of ' + prName}>{entries.slice(0, cut).map(line)}</ul>
      {cut < entries.length ? (
        <button type="button" className="more" aria-expanded={open} onClick={toggle}>
          +{entries.length - cut} more<span className="sr-only">{': all ' + entries.length + ' reviewers of ' + prName}</span>
        </button>
      ) : null}
      {open ? (
        <div className="popover reviewers-popover" role="dialog" aria-label={'All reviewers of ' + prName} style={position}>
          <ul className="reviewers">{entries.map(line)}</ul>
          <a className="popover-footer" href={pr.url} target="_blank" rel="noopener">Open the PR on GitHub</a>
        </div>
      ) : null}
    </div>
  );
}
