import { useContext } from 'react';
import { PrNameContext, ReviewViewContext } from '../../context.ts';
import { displayLogin, formatAgo, plural } from '../../board/format.ts';
import { DECISION_BY_REVIEW, REVIEW, REVIEW_SECTIONS } from '../../board/states.ts';
import { usePopover } from '../../hooks/usePopover.ts';
import type { DerivedPullRequest, RequestedReviewer, Reviewer } from '../../types.ts';
import { Avatar } from '../common/Avatar.tsx';
import { Octicon } from '../common/Octicon.tsx';
import { ReviewersList } from './ReviewersList.tsx';

const REVIEW_POPOVER_PX = 320;

const MY_REVIEW_TITLE = {
  requested: 'Your review is requested',
  again: 'Your review is requested again: you reviewed this PR before',
};

export function ReviewCell({ pr, now }: { pr: DerivedPullRequest; now: number }) {
  return useContext(ReviewViewContext).list ? <ReviewersList pr={pr} /> : <ReviewCode pr={pr} now={now} />;
}

// The Review code with its reviewers popover (TABLE-8).
function ReviewCode({ pr, now }: { pr: DerivedPullRequest; now: number }) {
  const prName = useContext(PrNameContext);
  const { open, position, ref, toggle } = usePopover(REVIEW_POPOVER_PX);
  const state = REVIEW[pr.review];
  const waiting = pr.requestedReviewers;
  const approvers = pr.reviewers.filter((r) => r.state === 'APPROVED').map(displayLogin);
  const decided = pr.reviewers.filter((r) => r.state === DECISION_BY_REVIEW[pr.review]).length;
  const accessibleName = state.label + (decided > 1 ? ' by ' + decided + ' reviewers' : '')
    + (waiting.length ? ', ' + plural(waiting.length, 'pending reviewer') : '') + ' on ' + prName + '. Show reviewers';
  // The decision first, as TABLE-12 asks, then who approved: changes requested by one reviewer and approved by another
  // still reads as changes requested.
  const tooltip = [
    pr.review === 'approved' ? 'Approved by ' + approvers.join(', ') : state.label,
    pr.review !== 'approved' && approvers.length ? 'Approved by ' + approvers.join(', ') : '',
    waiting.length ? 'Waiting for ' + waiting.map((r) => (r.team ? '@' + r.login : displayLogin(r))).join(', ') : '',
  ].filter(Boolean).join('. ');
  // The index keeps keys unique for two deleted accounts (ghost) or a team and a user with the same name.
  const reviewer = (r: Reviewer | RequestedReviewer, index: number) => {
    const team = 'team' in r && r.team;
    const at = 'at' in r ? r.at : null;
    return (
      <li key={index + ':' + r.login}>
        <Avatar actor={r} small />
        <span className="who">{team ? '@' + r.login : displayLogin(r)}</span>
        {team ? <span className="chip">team</span> : null}
        {at ? <span className="when" title={new Date(at).toUTCString()}>{formatAgo(at, now)}</span> : null}
      </li>
    );
  };
  return (
    <div className="review-wrap" ref={ref}>
      <button type="button" className={'pill short ' + state.tone + ' as-button'} aria-expanded={open}
        aria-label={accessibleName} title={tooltip} onClick={toggle}>
        {state.short}{decided > 1 ? <sup>{decided}</sup> : null}
      </button>
      {waiting.length ? <span className="pending" aria-hidden="true" title={'Waiting for ' + plural(waiting.length, 'reviewer')}>◷{waiting.length}</span> : null}
      {pr.myReview ? (
        <span className={'mine ' + pr.myReview} role="img" aria-label={MY_REVIEW_TITLE[pr.myReview]} title={MY_REVIEW_TITLE[pr.myReview]}>
          <Octicon name={pr.myReview === 'again' ? 'sync' : 'dot'} />
        </span>
      ) : null}
      {open ? (
        <div className="popover review-popover" role="dialog" aria-label={'Reviewers of ' + prName} style={position}>
          {REVIEW_SECTIONS.map(({ state: s, title }) => {
            const list = pr.reviewers.filter((r) => r.state === s);
            return list.length ? <section key={s}><strong className="popover-title">{title}</strong><ul className="people">{list.map(reviewer)}</ul></section> : null;
          })}
          {waiting.length ? <section><strong className="popover-title">Waiting for review from</strong><ul className="people">{waiting.map(reviewer)}</ul></section> : null}
          {!pr.reviewers.length && !waiting.length ? <p className="muted">No reviews yet, and nobody is requested as a reviewer.</p> : null}
          <a className="popover-footer" href={pr.url} target="_blank" rel="noopener">Open the PR on GitHub</a>
        </div>
      ) : null}
    </div>
  );
}
